// controllers/userController.js
const Chatbot = require("../models/Chatbot");
const Message = require("../models/Message");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Company = require("../models/Company");
const VerifiedUser = require("../models/VerifiedUser");
const generatePDFBuffer = require("../pdf/generatePDFBuffer");
const json2csv = require("json2csv").parse;

/* --------------------------------- helpers -------------------------------- */

function deriveWindowFromSubscription(sub) {
  if (!sub) return null;

  const hasStart = !!sub.start_date;
  const hasEnd = !!sub.end_date;

  if (hasStart && hasEnd) {
    return { start: new Date(sub.start_date), end: new Date(sub.end_date) };
  }

  if (hasEnd && sub.duration_days) {
    const end = new Date(sub.end_date);
    const start = new Date(end);
    start.setDate(end.getDate() - (sub.duration_days - 1));
    return { start, end };
  }

  return null;
}

// Build a Mongo match for a date window on a given date field
function makeDateFilter(window, field = "timestamp") {
  if (!window) return {};
  return { [field]: { $gte: window.start, $lte: window.end } };
}

// Count unique verified users (by email lowercased OR phone if no email)
// Optional window on verified_at
async function countUniqueVerifiedUsers(chatbotId, window = null) {
  const match = {
    chatbot_id: chatbotId,
    ...(window ? { verified_at: { $gte: window.start, $lte: window.end } } : {}),
  };

  const agg = await VerifiedUser.aggregate([
    { $match: match },
    {
      $addFields: {
        email_lc: {
          $cond: [
            { $and: [{ $ifNull: ["$email", false] }, { $ne: ["$email", ""] }] },
            { $toLower: "$email" },
            null,
          ],
        },
      },
    },
    {
      $project: {
        key: {
          $cond: [
            { $and: [{ $ifNull: ["$email_lc", false] }, { $ne: ["$email_lc", ""] }] },
            { $concat: ["email:", "$email_lc"] },
            {
              $cond: [
                { $and: [{ $ifNull: ["$phone", false] }, { $ne: ["$phone", ""] }] },
                { $concat: ["phone:", "$phone"] },
                null,
              ],
            },
          ],
        },
      },
    },
    { $match: { key: { $ne: null } } },
    { $group: { _id: "$key" } },
    { $count: "count" },
  ]);

  return agg[0]?.count ?? 0;
}

// Get distinct verified emails (lowercased) and phones with optional window
async function getVerifiedEmailsAndPhones(chatbotId, window = null) {
  const baseMatch = {
    chatbot_id: chatbotId,
    ...(window ? { verified_at: { $gte: window.start, $lte: window.end } } : {}),
  };

  const emailsAgg = await VerifiedUser.aggregate([
    { $match: { ...baseMatch, email: { $exists: true, $ne: null, $ne: "" } } },
    { $group: { _id: { $toLower: "$email" } } },
    { $project: { _id: 0, email: "$_id" } },
  ]);

  const emails = emailsAgg.map((e) => e.email);

  const phoneNumbers = await VerifiedUser.distinct("phone", {
    ...baseMatch,
    phone: { $exists: true, $ne: null, $ne: "" },
  });

  return { emails, phoneNumbers };
}

/* ------------------------------- controllers ------------------------------ */

// Get user's chatbot info
exports.getUserCompany = async (req, res) => {
  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    const company = await Company.findById(chatbot.company_id);

    res.json({
      name: chatbot.company_name,
      email: company?.email || "",
      url: chatbot.company_url,
      chatbot_id: chatbot._id,
    });
  } catch (err) {
    console.error("getUserCompany error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user's current plan
exports.getUserPlan = async (req, res) => {
  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    const subscription = await Subscription.findOne({ chatbot_id: chatbot._id })
      .sort({ end_date: -1 })
      .populate("plan_id");

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const now = new Date();
    const expiry = new Date(subscription.end_date);
    const remaining = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
    const duration_days = Math.ceil(
      (subscription.end_date - subscription.start_date) / (1000 * 60 * 60 * 24)
    );

    res.json({
      name: subscription.plan_id.name,
      tokens: subscription.plan_id.tokens,
      duration_days,
      max_users: subscription.plan_id.max_users,
      activation_date: subscription.start_date,
      expiry_date: subscription.end_date,
      days_remaining: remaining,
    });
  } catch (err) {
    console.error("getUserPlan error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get usage stats (messages total + unique verified users + used tokens)
// NOTE: applies subscription window for fairness if available
exports.getUserUsage = async (req, res) => {
  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    const subscription = await Subscription.findOne({ chatbot_id: chatbot._id }).sort({
      end_date: -1,
    });
    const window = deriveWindowFromSubscription(subscription);

    // Totals within window if present, otherwise all-time
    const msgMatch = {
      chatbot_id: chatbot._id,
      ...(window ? makeDateFilter(window, "timestamp") : {}),
    };

    const [total_messages, tokensAgg, unique_users] = await Promise.all([
      Message.countDocuments(msgMatch),
      Message.aggregate([
        { $match: msgMatch },
        { $group: { _id: null, sum: { $sum: { $ifNull: ["$token_count", 0] } } } },
      ]),
      countUniqueVerifiedUsers(chatbot._id, window),
    ]);

    const used_tokens = tokensAgg[0]?.sum ?? 0;

    res.json({ total_messages, unique_users, used_tokens });
  } catch (err) {
    console.error("getUserUsage error:", err);
    res.status(500).json({ message: "Failed to compute usage" });
  }
};

// Get paginated messages (with optional email/phone filters)
// This remains Message-based because it's for transcripts
exports.getUserMessages = async (req, res) => {
  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const emailFilter = req.query.email;
    const phoneFilter = req.query.phone;

    const query = { chatbot_id: chatbot._id };
    if (emailFilter) query.email = emailFilter;
    if (phoneFilter) query.phone = phoneFilter;

    const [messages, total] = await Promise.all([
      Message.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
      Message.countDocuments(query),
    ]);

    res.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("getUserMessages error:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// Get all sessions grouped with their messages (be careful for large datasets)
exports.getUserSessions = async (req, res) => {
  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    const sessionIds = await Message.distinct("session_id", { chatbot_id: chatbot._id });

    const sessions = await Promise.all(
      sessionIds.map(async (sessionId) => {
        const messages = await Message.find({
          chatbot_id: chatbot._id,
          session_id: sessionId,
        }).sort({ timestamp: 1 });

        return { session_id: sessionId, messages };
      })
    );

    res.json({ sessions });
  } catch (err) {
    console.error("getUserSessions error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Return verified (not raw) emails and phones for filters/exports
exports.getUniqueEmailsAndPhones = async (req, res) => {
  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    const subscription = await Subscription.findOne({ chatbot_id: chatbot._id }).sort({
      end_date: -1,
    });
    const window = deriveWindowFromSubscription(subscription);

    const { emails, phoneNumbers } = await getVerifiedEmailsAndPhones(
      chatbot._id,
      window
    );

    res.json({ emails, phoneNumbers });
  } catch (err) {
    console.error("getUniqueEmailsAndPhones error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch unique verified emails and phone numbers" });
  }
};

// Download overall usage report (uses VerifiedUser for unique users)
exports.downloadUserReport = async (req, res) => {
  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    const company = await Company.findById(chatbot.company_id);

    const subscription = await Subscription.findOne({ chatbot_id: chatbot._id })
      .sort({ end_date: -1 })
      .populate("plan_id");

    const window = deriveWindowFromSubscription(subscription);

    // Use window for fairness
    const msgMatch = {
      chatbot_id: chatbot._id,
      ...(window ? makeDateFilter(window, "timestamp") : {}),
    };

    const [total_messages, unique_users, recentMessages] = await Promise.all([
      Message.countDocuments(msgMatch),
      countUniqueVerifiedUsers(chatbot._id, window),
      Message.find(msgMatch).sort({ timestamp: -1 }).limit(100),
    ]);

    const now = new Date();
    const expiry = new Date(subscription.end_date);
    const daysRemaining = Math.max(
      0,
      Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
    );
    const duration_days = Math.ceil(
      (subscription.end_date - subscription.start_date) / (1000 * 60 * 60 * 24)
    );

    const data = {
      title: "Chatbot Usage Report",
      generatedOn: new Date().toLocaleString(),
      company: {
        name: chatbot.company_name,
        email: company?.email || "",
        domain: chatbot.company_url,
      },
      plan: {
        name: subscription.plan_id.name,
        duration_days,
        days_remaining: daysRemaining,
        max_users: subscription.plan_id.max_users,
      },
      usage: {
        total_messages,
        unique_users,
      },
      messages: recentMessages,
    };

    const pdfBuffer = await generatePDFBuffer(data);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="chatbot_report.pdf"`,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("downloadUserReport error:", err);
    res.status(500).json({ message: "Failed to generate report" });
  }
};

// Download a user's chat by email (transcripts come from Message)
exports.downloadUserChatByEmail = async (req, res) => {
  const { email } = req.params;

  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    const company = await Company.findById(chatbot.company_id);
    const messages = await Message.find({
      chatbot_id: chatbot._id,
      email,
    }).sort({ timestamp: 1 });

    if (!messages.length) {
      return res.status(404).json({ message: "No chat history found for this email." });
    }

    const pdfData = {
      title: `Chat History for ${email}`,
      generatedOn: new Date().toLocaleString(),
      company: {
        name: chatbot.company_name,
        email: company?.email || "",
        domain: chatbot.company_url,
      },
      user_email: email,
      messages,
    };

    const pdfBuffer = await generatePDFBuffer(pdfData, "chatHistoryTemplate.ejs");

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="chat_${email.replace(/[@.]/g, "_")}.pdf"`,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("downloadUserChatByEmail error:", err);
    res.status(500).json({ message: "Failed to generate chat PDF" });
  }
};

// Download verified emails + phones as CSV (from VerifiedUser)
exports.downloadEmailsAndPhoneNumbersCSV = async (req, res) => {
  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    const subscription = await Subscription.findOne({ chatbot_id: chatbot._id }).sort({
      end_date: -1,
    });
    const window = deriveWindowFromSubscription(subscription);

    const { emails, phoneNumbers } = await getVerifiedEmailsAndPhones(
      chatbot._id,
      window
    );

    const combinedData = [
      ...emails.map((email) => ({ type: "email", contact: email })),
      ...phoneNumbers.map((phone) => ({ type: "phone", contact: phone })),
    ];

    const csv = json2csv(combinedData);

    res.header("Content-Type", "text/csv");
    res.attachment("emails_and_phone_numbers.csv");
    res.send(csv);
  } catch (err) {
    console.error("downloadEmailsAndPhoneNumbersCSV error:", err);
    res
      .status(500)
      .json({ message: "Failed to generate CSV for emails and phone numbers" });
  }
};

// controllers/userController.js

exports.downloadUserChatByPhone = async (req, res) => {
  const { phone } = req.params;

  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    const company = await Company.findById(chatbot.company_id);

    // If you store phones normalized (e.g., E.164), match exactly.
    // Otherwise consider normalizing here before querying.
    const messages = await Message.find({
      chatbot_id: chatbot._id,
      phone,
    }).sort({ timestamp: 1 });

    if (!messages.length) {
      return res
        .status(404)
        .json({ message: "No chat history found for this phone number." });
    }

    const pdfData = {
      title: `Chat History for ${phone}`,
      generatedOn: new Date().toLocaleString(),
      company: {
        name: chatbot.company_name,
        email: company?.email || "",
        domain: chatbot.company_url,
      },
      user_phone: phone,
      messages,
    };

    const pdfBuffer = await generatePDFBuffer(pdfData, "chatHistoryTemplate.ejs");

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="chat_${phone.replace(/[^\d+]/g, "_")}.pdf"`,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("Failed to generate phone chat PDF:", err);
    res.status(500).json({ message: "Failed to generate chat PDF" });
  }
};

