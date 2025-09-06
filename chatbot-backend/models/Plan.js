const mongoose = require("mongoose");

const PlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  duration_days: { type: Number, required: true },
  max_users: { 
    type: Number, 
    required: true, 
    validate: {
      validator: function(value) {
        return this.is_unlimited || value > 0;  // Allow unlimited plans or positive user limits
      },
      message: 'max_users must be a positive number or 0 for unlimited plan'
    }
  },
  is_unlimited: { type: Boolean, default: false }, // Flag for unlimited plans
  price: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Plan", PlanSchema);
