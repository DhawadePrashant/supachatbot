const Chatbot = require("../models/Chatbot");
const Message = require("../models/Message");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Company = require("../models/Company");
const generatePDFBuffer = require("../pdf/generatePDFBuffer");
const json2csv = require("json2csv").parse;

// Get user's chatbot info
exports.getUserCompany = async (req, res) => {
  const chatbot = await Chatbot.findOne({ company_id: req.user.id });
  if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

  const company = await Company.findById(chatbot.company_id);

  res.json({
    name: chatbot.company_name,
    email: company?.email || "",
    url: chatbot.company_url,
    chatbot_id: chatbot._id, // ✅ include chatbot ID here
  });
};

// Get user's current plan
exports.getUserPlan = async (req, res) => {
  const chatbot = await Chatbot.findOne({ company_id: req.user.id });
  if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

  const subscription = await Subscription.findOne({
    chatbot_id: chatbot._id,
  })
    .sort({ end_date: -1 }) // get the most recent
    .populate("plan_id");
  if (!subscription)
    return res.status(404).json({ message: "Subscription not found" });

  const now = new Date();
  const expiry = new Date(subscription.end_date);
  const remaining = Math.max(
    0,
    Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
  );

  res.json({
    name: subscription.plan_id.name,
    tokens: subscription.plan_id.tokens,
    duration_days: Math.ceil(
      (subscription.end_date - subscription.start_date) / (1000 * 60 * 60 * 24)
    ),

    max_users: subscription.plan_id.max_users, // ✅ Make sure this is included
    activation_date: subscription.start_date,
    expiry_date: subscription.end_date,
    days_remaining: remaining, // ✅ THIS is what you pass to frontend
  });
};

// Get usage stats
exports.getUserUsage = async (req, res) => {
  const chatbot = await Chatbot.findOne({ company_id: req.user.id });
  if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const messages = await Message.find({ chatbot_id: chatbot._id })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  const totalMessages = messages.length;
  const uniqueUsers = new Set(messages.map((m) => m.session_id)).size;
  const usedTokens = messages.reduce((sum, m) => sum + (m.token_count || 0), 0);

  res.json({
    total_messages: totalMessages,
    unique_users: uniqueUsers,
    used_tokens: usedTokens,
  });
};

// Get recent messages
// Get paginated messages (with optional session_id filter)
// Get recent messages with optional email and phone filters
exports.getUserMessages = async (req, res) => {
  const chatbot = await Chatbot.findOne({ company_id: req.user.id });
  if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const emailFilter = req.query.email;
  const phoneFilter = req.query.phone;

  const query = { chatbot_id: chatbot._id };

  // Apply the filters if provided
  if (emailFilter) query.email = emailFilter;
  if (phoneFilter) query.phone = phoneFilter;

  try {
    // Fetch messages and total count with the applied filters
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
    console.error("Error fetching messages:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// Get all unique session IDs for the user's chatbot
// exports.getUserSessions = async (req, res) => {
//   try {
//     const chatbot = await Chatbot.findOne({ company_id: req.user.id });
//     if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

//     const sessions = await Message.distinct("session_id", {
//       chatbot_id: chatbot._id,
//     });

//     res.json({ sessions });
//   } catch (err) {
//     console.error("Error fetching sessions:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

exports.getUserSessions = async (req, res) => {
  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    // Step 1: Get all session IDs
    const sessionIds = await Message.distinct("session_id", {
      chatbot_id: chatbot._id,
    });

    // Step 2: Get messages grouped by session
    const sessions = await Promise.all(
      sessionIds.map(async (sessionId) => {
        const messages = await Message.find({
          chatbot_id: chatbot._id,
          session_id: sessionId,
        }).sort({ timestamp: 1 }); // oldest to newest

        return {
          session_id: sessionId,
          messages,
        };
      })
    );

    res.json({ sessions });
  } catch (err) {
    console.error("Error fetching sessions:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUniqueEmailsAndPhones = async (req, res) => {
  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    const emails = await Message.distinct("email", {
      chatbot_id: chatbot._id,
      email: { $ne: null }, // Exclude null emails
    });

    const phoneNumbers = await Message.distinct("phone", {
      chatbot_id: chatbot._id,
      phone: { $ne: null }, // Exclude null phone numbers
    });

    res.json({
      emails,
      phoneNumbers,
    });
  } catch (err) {
    console.error("Error fetching unique emails and phone numbers:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch unique emails and phone numbers" });
  }
};

exports.downloadUserReport = async (req, res) => {
  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    const company = await Company.findById(chatbot.company_id);

    const subscription = await Subscription.findOne({
      chatbot_id: chatbot._id,
    })
      .sort({ end_date: -1 }) // get the most recent
      .populate("plan_id");

    const usageMessages = await Message.find({ chatbot_id: chatbot._id });

    const uniqueUsers = new Set(usageMessages.map((m) => m.session_id)).size;

    const recentMessages = await Message.find({ chatbot_id: chatbot._id })
      .sort({ timestamp: -1 })
      .limit(100);

    const now = new Date();
    const expiry = new Date(subscription.end_date);
    const daysRemaining = Math.max(
      0,
      Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
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
        duration_days: Math.ceil(
          (subscription.end_date - subscription.start_date) /
            (1000 * 60 * 60 * 24)
        ),

        days_remaining: daysRemaining,
        max_users: subscription.plan_id.max_users,
      },
      usage: {
        total_messages: usageMessages.length,
        unique_users: uniqueUsers,
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
    console.error("PDF generation failed:", err);
    res.status(500).json({ message: "Failed to generate report" });
  }
};

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
      return res
        .status(404)
        .json({ message: "No chat history found for this email." });
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

    const pdfBuffer = await generatePDFBuffer(
      pdfData,
      "chatHistoryTemplate.ejs"
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="chat_${email.replace(/[@.]/g, "_")}.pdf"`,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("Failed to generate chat PDF:", err);
    res.status(500).json({ message: "Failed to generate chat PDF" });
  }
};

exports.downloadEmailsAndPhoneNumbersCSV = async (req, res) => {
  try {
    const chatbot = await Chatbot.findOne({ company_id: req.user.id });
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    // Fetch emails and phone numbers
    const emails = await Message.distinct("email", {
      chatbot_id: chatbot._id,
      email: { $ne: null }, // Exclude null emails
    });

    const phoneNumbers = await Message.distinct("phone", {
      chatbot_id: chatbot._id,
      phone: { $ne: null }, // Exclude null phone numbers
    });

    // Combine emails and phone numbers into one array
    const combinedData = [
      ...emails.map((email) => ({ type: "email", contact: email })),
      ...phoneNumbers.map((phone) => ({ type: "phone", contact: phone })),
    ];

    // Convert to CSV format
    const csv = json2csv(combinedData);

    // Send the CSV file as a response
    res.header("Content-Type", "text/csv");
    res.attachment("emails_and_phone_numbers.csv");
    res.send(csv); // Send CSV as response
  } catch (err) {
    console.error("Error generating CSV for emails and phone numbers:", err);
    res
      .status(500)
      .json({ message: "Failed to generate CSV for emails and phone numbers" });
  }
};
