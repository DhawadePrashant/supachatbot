const mongoose = require("mongoose");

const ChatbotSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  name: { type: String },
  company_name: { type: String, required: true },
  company_url: { type: String, required: true},
  token_limit: { type: Number, default: 10000000 },
  used_tokens: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  persona: {
    name: { type: String, default: 'AI Assistant' },
    description: { type: String, default: 'A helpful AI assistant' },
    avatar: { type: String },
    customInstructions: { type: String }
  }
});

module.exports = mongoose.model("Chatbot", ChatbotSchema);
