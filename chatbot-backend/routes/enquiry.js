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

// GET /api/enquiry?chatbotId=xxx
router.get("/", async (req, res) => {
  try {
    const { chatbotId } = req.query;

    // ✅ Check for presence and valid ObjectId format
    if (!chatbotId || !mongoose.Types.ObjectId.isValid(chatbotId)) {
      return res.status(400).json({ error: "Invalid or missing chatbotId" });
    }

    const queries = await Query.find({ chatbotId }).sort({ createdAt: -1 });
    res.json(queries);
  } catch (err) {
    console.error("Error fetching enquiries:", err);
    res.status(500).json({ error: "Internal Server Error" });
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
