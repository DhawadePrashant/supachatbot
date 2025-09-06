const Chatbot = require("../models/Chatbot");
const Company = require("../models/Company");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Message = require("../models/Message");
const VerifiedUser = require("../models/VerifiedUser");
const UserSession = require("../models/UserSession");
const generatePDFBuffer = require("../pdf/generatePDFBuffer");
const defaultSuggestions = require("../constants/defaultSuggestions");
const ClientConfig = require("../models/ClientConfig");
const NotificationSettings = require("../models/NotificationSettings");

// ✅ NEW: import customization model
const ChatbotCustomization = require("../models/ChatbotCustomization");

// 🟢 CREATE chatbot
exports.createChatbot = async (req, res) => {
  try {
    const { companyId, name } = req.body;

    if (!companyId || !name) {
      return res
        .status(400)
        .json({ message: "companyId and name are required." });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const chatbot = await new Chatbot({
      company_id: company._id,
      company_name: company.name,
      company_url: company.url,
      name,
    }).save();

    // Client UI defaults
    await ClientConfig.create({
      chatbot_id: chatbot._id,
      ui_suggestions: defaultSuggestions,
      link_intents: [],
    });

    // 🔔 Seed NotificationSettings (email-only)
    await NotificationSettings.findOneAndUpdate(
      { chatbotId: chatbot._id, companyId: company._id },
      {
        $setOnInsert: {
          email: {
            enabled: true,
            recipients: [company.email], // 👈 from Company model
            subjectTemplate: "New user authenticated",
            bodyTemplate:
              "A new user has signed in.\n\nUser: {{user}}\nProvider: {{provider}}\nIP: {{ip}}\nWhen: {{time}}",
            notifyEveryLogin: false,
          },
        },
      },
      { upsert: true, new: true }
    );

    // ✅ NEW: Seed default styling (uses schema defaults)
    await ChatbotCustomization.findOneAndUpdate(
      { chatbotId: chatbot._id },
      { $setOnInsert: { chatbotId: chatbot._id } },
      { upsert: true, new: true }
    );

    // Assign default subscription
    const DEFAULT_PLAN_ID = "6870e8271b41fee9aa61f01a"; // Replace with actual ObjectId or config value
    const plan = await Plan.findById(DEFAULT_PLAN_ID);
    if (!plan) throw new Error("Default plan not found");

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration_days);

    await Subscription.create({
      chatbot_id: chatbot._id,
      plan_id: plan._id,
      chatbot_name: chatbot.name,
      company_name: company.name,
      plan_name: plan.name,
      start_date: startDate,
      end_date: endDate,
      status: "active",
    });

    res.status(201).json({
      message:
        "Chatbot created with default plan, notification settings, and styling",
      data: chatbot,
    });
  } catch (err) {
    console.error("Create chatbot error:", err.message);
    res.status(500).json({ message: "Server error while creating chatbot" });
  }
};

// ✏️ EDIT chatbot
exports.editChatbot = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    if (!name) return res.status(400).json({ message: "Name is required" });

    const updated = await Chatbot.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Chatbot not found" });

    res.status(200).json({ message: "Chatbot updated", data: updated });
  } catch (err) {
    console.error("Edit chatbot error:", err.message);
    res.status(500).json({ message: "Server error while updating chatbot" });
  }
};

// ❌ DELETE chatbot
exports.deleteChatbot = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Chatbot.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ message: "Chatbot not found" });

    await Message.deleteMany({ chatbot_id: id });
    await VerifiedUser.deleteMany({ chatbot_id: id });
    await Subscription.deleteMany({ chatbot_id: id });
    await NotificationSettings.deleteOne({ chatbotId: id }); // 👈 cleanup

    // ✅ NEW: cleanup styling doc
    await ChatbotCustomization.deleteOne({ chatbotId: id });

    res.status(200).json({ message: "Chatbot deleted" });
  } catch (err) {
    console.error("Delete chatbot error:", err.message);
    res.status(500).json({ message: "Server error while deleting chatbot" });
  }
};

// 📊 Get ALL chatbots with stats
exports.getAllChatbotsWithStats = async (req, res) => {
  try {
    const chatbots = await Chatbot.find();

    const enriched = await Promise.all(
      chatbots.map(async (bot) => {
        const uniqueUsers = await UserSession.countDocuments({
          chatbot_id: bot._id,
        });
        const totalMessages = await Message.countDocuments({
          chatbot_id: bot._id,
        });

        return {
          ...bot.toObject(),
          unique_users: uniqueUsers,
          total_messages: totalMessages,
        };
      })
    );

    res.json({ chatbots: enriched });
  } catch (err) {
    console.error("getAllChatbotsWithStats error:", err);
    res.status(500).json({ message: "Error fetching chatbots" });
  }
};

// 💬 Get chatbot message history
exports.getMessageHistory = async (req, res) => {
  const { id } = req.params;

  try {
    const messages = await Message.find({ chatbot_id: id }).sort({
      timestamp: -1,
    });
    res.status(200).json({ messages });
  } catch (err) {
    console.error("Fetch messages error:", err.message);
    res.status(500).json({ message: "Error fetching message history" });
  }
};

// 🔁 Update token limit
exports.updateTokenLimit = async (req, res) => {
  const { id } = req.params;
  const { token_limit } = req.body;

  try {
    const chatbot = await Chatbot.findByIdAndUpdate(
      id,
      { token_limit },
      { new: true }
    );
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    res.json({ message: "Token limit updated", data: chatbot });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📦 Fetch all chatbots with message & user stats (utility for dashboard)
exports.fetchChatbotsWithStats = async () => {
  const chatbots = await Chatbot.find().populate("company_id");

  const enriched = await Promise.all(
    chatbots.map(async (bot) => {
      const messages = await Message.find({ chatbot_id: bot._id }).select(
        "session_id"
      );
      const recentMessages = await Message.find({ chatbot_id: bot._id })
        .sort({ timestamp: -1 })
        .limit(100)
        .select("sender content");

      const uniqueUsers = await UserSession.countDocuments({
        chatbot_id: bot._id,
      });
      const totalMessages = messages.length;

      return {
        ...bot.toObject(),
        unique_users: uniqueUsers,
        total_messages: totalMessages,
        company_email: bot.company_id?.email || null,
        company_name: bot.company_id?.name || null,
        message_history: recentMessages,
      };
    })
  );

  return enriched;
};

exports.downloadChatbotReport = async (req, res) => {
  try {
    const { chatbotId } = req.params;

    const chatbot = await Chatbot.findById(chatbotId);
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    const company = await Company.findById(chatbot.company_id);

    const subscription = await Subscription.findOne({
      chatbot_id: chatbot._id,
    }).populate("plan_id");

    const allMessages = await Message.find({ chatbot_id: chatbot._id });
    const recentMessages = await Message.find({ chatbot_id: chatbot._id })
      .sort({ timestamp: -1 })
      .limit(100);

    const uniqueUsers = new Set(allMessages.map((m) => m.session_id)).size;

    const now = new Date();
    const expiry = new Date(subscription.end_date);
    const daysRemaining = Math.max(
      0,
      Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
    );

    const data = {
      title: `Chatbot Report – ${chatbot.name}`,
      generatedOn: now.toLocaleString(),
      company: {
        name: chatbot.company_name,
        email: company?.email || "",
        domain: chatbot.company_url,
      },
      plan: {
        name: subscription.plan_id.name,
        duration_days: subscription.plan_id.duration_days,
        days_remaining: daysRemaining,
        max_users: subscription.plan_id.max_users,
        price: subscription.plan_id.price || 0,
        end_date: subscription.end_date,
      },
      usage: {
        total_messages: allMessages.length,
        unique_users: uniqueUsers,
      },
      messages: recentMessages,
    };

    const pdfBuffer = await generatePDFBuffer(data);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${chatbotId}-report.pdf"`,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("Admin PDF download error:", err);
    res.status(500).json({ message: "Failed to generate report" });
  }
};

// GET /chatbot/:id/persona
exports.getPersona = async (req, res) => {
  try {
    const chatbot = await Chatbot.findById(req.params.id).select("persona_text name");
    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    res.json({ persona: chatbot.persona_text || "" }); // 👈 map to `persona` for frontend
  } catch (err) {
    console.error("getPersona error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /chatbot/:id/persona
exports.updatePersona = async (req, res) => {
  try {
    const { persona } = req.body; // frontend still sends `persona`
    if (typeof persona !== "string") {
      return res.status(400).json({ message: "Persona must be a string" });
    }

    const chatbot = await Chatbot.findByIdAndUpdate(
      req.params.id,
      { persona_text: persona }, // 👈 store in schema field
      { new: true }
    ).select("persona_text name");

    if (!chatbot) return res.status(404).json({ message: "Chatbot not found" });

    res.json({ message: "Persona updated", persona: chatbot.persona_text });
  } catch (err) {
    console.error("updatePersona error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
