const express = require("express");
const router = express.Router();
const Query = require("../models/Query"); // ✅ consistent model usage
const mongoose = require("mongoose");

// POST /api/enquiry/submit
router.post("/submit", async (req, res) => {
  try {
    const { chatbotId, name, email, phone, message } = req.body;

    if (!chatbotId || !name || !email || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newQuery = new Query({
      chatbotId,
      email,
      question: message,
      name,
      phone,
    });

    await newQuery.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving enquiry:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/enquiry?chatbotId=xxx OR /api/enquiry?userId=yyy
router.get("/", async (req, res) => {
  try {
    const { chatbotId, userId } = req.query;

    let chatbotIds = [];

    // Case 1: chatbotId explicitly provided
    if (chatbotId) {
      if (!mongoose.Types.ObjectId.isValid(chatbotId)) {
        return res.status(400).json({ error: "Invalid chatbotId" });
      }
      chatbotIds = [new mongoose.Types.ObjectId(chatbotId)];
    }

    // Case 2: Resolve via userId -> chatbot(s)
    if (!chatbotIds.length && userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const Chatbot = require("../models/Chatbot");

      // ✅ FIX: link via company_id
      const bots = await Chatbot.find({ company_id: userId })
        .select("_id")
        .lean();

      if (!bots || bots.length === 0) {
        // friendlier: just return empty array, not error
        return res.json([]);
      }

      chatbotIds = bots.map((b) => b._id);
    }

    if (!chatbotIds.length) {
      return res
        .status(400)
        .json({ error: "Invalid or missing chatbotId / userId" });
    }

    // Fetch all queries for one or many chatbotIds
    const queries = await Query.find({ chatbotId: { $in: chatbotIds } })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(queries);
  } catch (err) {
    console.error("Error fetching enquiries:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /api/enquiry/:id/read
router.put("/:id/read", async (req, res) => {
  try {
    const updated = await Query.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Query not found" });
    }

    res.json({ success: true, updated });
  } catch (err) {
    console.error("Error updating query:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
