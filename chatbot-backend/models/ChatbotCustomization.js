const mongoose = require('mongoose');

const customizationSchema = new mongoose.Schema({
  chatbotId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Chatbot', // Reference to the chatbot collection
    required: true,
    unique: true
  },
  fontFamily: {
    type: String,
    default: 'Arial, sans-serif' // default font family
  },
  headerBackground: {
    type: String,
    default: 'linear-gradient(135deg, #a855f7, #ec4899)' // default gradient
  },
  headerSubtitle: {
    type: String,
    default: 'Welcome to our Chatbot!' // default subtitle text
  },
  buttonColor: {
    type: String,
    default: 'linear-gradient(135deg, #ff7e5f, #feb47b)' // default gradient button color
  },
  welcomeMessage: {
    type: String,
    default: 'Hi, how can I assist you today?' // default welcome message
  },
  startingSuggestions: [{
    title: {
      type: String,
      default: 'Need Help?' // default title for button
    },
    icon: {
      type: String,
      default: 'help' // default icon (icon name or URL)
    },
    iconBg: {
      type: String,
      default: 'linear-gradient(135deg, #667eea, #764ba2)' // default icon background
    }
  }],
  chatWindowBg: {
    type: String,
    default: 'solid #ffffff' // default background color for chat window
  }
}, {
  timestamps: true
});

const ChatbotCustomization = mongoose.model('ChatbotCustomization', customizationSchema);

module.exports = ChatbotCustomization;
