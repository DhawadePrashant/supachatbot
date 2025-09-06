const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  chatbot_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chatbot",
    required: true,
    index: true,
  },
  session_id: {
    type: String,
    required: true,
    index: true,
  },
  email: {
    type: String,
    default: null,
    trim: true,
  },
  phone: {
    type: String,
    default: null,
    trim: true,
  },
  sender: {
    type: String,
    enum: ["user", "bot"],
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  token_count: {
    type: Number,
    default: 0,
  },
});

// ✅ Remove the pre-validate email/phone requirement entirely.
// Validation about when to require auth is handled in the controller
// using free_messages + auth_method logic.

module.exports = mongoose.model("Message", messageSchema);
