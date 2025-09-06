const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const Chatbot = require("../models/Chatbot");

// ✅ GET active subscription for chatbot
exports.getSubscription = async (req, res) => {
  try {
    const chatbotId = req.params.id;

    const subscription = await Subscription.findOne({
      chatbot_id: chatbotId,
      status: "active",
    })
      .sort({ created_at: -1 })
      .populate("plan_id");

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    // ✅ Calculate days remaining
    const today = new Date();
    const end = new Date(subscription.end_date);
    const remaining = Math.max(
      0,
      Math.ceil((end - today) / (1000 * 60 * 60 * 24))
    );

    // ✅ Clamp values
    const duration = subscription.plan_id.duration_days;
    const clampedRemaining = Math.min(remaining, duration);

    res.json({
      name: subscription.plan_name,
      duration_days: duration,
      days_remaining: clampedRemaining,
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      status: subscription.status,
      max_users: subscription.plan_id.max_users,
      price: subscription.plan_id.price,
    });
  } catch (err) {
    console.error("Failed to fetch subscription:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 🔁 RENEW chatbot subscription
exports.renewSubscription = async (req, res) => {
  try {
    const { id } = req.params; // chatbot_id
    const { plan_id } = req.body;

    if (!plan_id) {
      return res.status(400).json({ message: "plan_id is required" });
    }

    const plan = await Plan.findById(plan_id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // Expire existing active subscriptions
    await Subscription.updateMany(
      { chatbot_id: id, status: "active" },
      { $set: { status: "expired" } }
    );

    // Get chatbot info for metadata
    const chatbot = await Chatbot.findById(id);
    if (!chatbot)
      return res.status(404).json({ message: "Chatbot not found" });

    // Create new subscription
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + plan.duration_days);

    const newSub = await Subscription.create({
      chatbot_id: id,
      plan_id: plan._id,
      plan_name: plan.name,
      chatbot_name: chatbot.name,
      company_name: chatbot.company_name,
      start_date: start,
      end_date: end,
      status: "active",
    });

    res.json({
      success: true,
      message: "Plan renewed successfully",
      subscription: newSub,
    });
  } catch (err) {
    console.error("renewSubscription error:", err.message);
    res.status(500).json({ message: "Server error during renewal" });
  }
};
