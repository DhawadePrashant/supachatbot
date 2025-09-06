// routes/subscription.js
const express = require("express");
const router = express.Router();
const Subscription = require("../models/Subscription");
const Message = require("../models/Message");
const VerifiedUser = require("../models/VerifiedUser");

router.get("/", async (req, res) => {
  try {
    console.log("🔍 Starting subscription fetch...");
    
    const subscriptions = await Subscription.find()
      .populate(
        "chatbot_id",
        "name company_name company_url token_limit used_tokens"
      )
      .populate("plan_id", "name duration_days price max_users")
      .lean();

    console.log(`✅ Found ${subscriptions.length} subscriptions`);
    
    // Filter out subscriptions with missing references
    const validSubscriptions = subscriptions.filter(sub => 
      sub.chatbot_id && sub.plan_id
    );
    
    if (validSubscriptions.length !== subscriptions.length) {
      console.warn(`⚠️ Filtered out ${subscriptions.length - validSubscriptions.length} subscriptions with missing references`);
    }
    
    if (validSubscriptions.length === 0) {
      console.log("📭 No valid subscriptions found, returning empty array");
      return res.json({ subscriptions: [] });
    }
    
    const chatbotIds = validSubscriptions.map((sub) => sub.chatbot_id._id);
    console.log(`🤖 Processing ${chatbotIds.length} chatbot IDs`);

    // Get total messages
    console.log("📊 Aggregating message stats...");
    const messageStats = await Message.aggregate([
      { $match: { chatbot_id: { $in: chatbotIds } } },
      {
        $group: {
          _id: "$chatbot_id",
          total_messages: { $sum: 1 },
        },
      },
    ]);
    console.log(`✅ Message stats completed: ${messageStats.length} results`);

    // Get unique verified users per chatbot
    console.log("👥 Aggregating verified user stats...");
    const verifiedStats = await VerifiedUser.aggregate([
      { $match: { chatbot_id: { $in: chatbotIds } } },
      {
        $group: {
          _id: "$chatbot_id",
          unique_users: {
            $addToSet: {
              $cond: [
                { $ifNull: ["$email", false] },
                "$email",
                "$phone",
              ],
            },
          },
        },
      },
      {
        $project: {
          unique_users: { $size: "$unique_users" },
        },
      },
    ]);
    console.log(`✅ Verified user stats completed: ${verifiedStats.length} results`);

    // Maps for quick lookup
    const messagesMap = Object.fromEntries(
      messageStats.map((m) => [m._id.toString(), m.total_messages])
    );

    const verifiedMap = Object.fromEntries(
      verifiedStats.map((v) => [v._id.toString(), v.unique_users])
    );

    // Merge into subscriptions
    const enrichedSubs = validSubscriptions.map((sub) => {
      const id = sub.chatbot_id._id.toString();
      return {
        ...sub,
        chatbot_id: {
          ...sub.chatbot_id,
          total_messages: messagesMap[id] || 0,
          unique_users: verifiedMap[id] || 0,
        },
      };
    });

    res.json({ subscriptions: enrichedSubs });
  } catch (err) {
    console.error("Error fetching subscriptions:", err);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

module.exports = router;