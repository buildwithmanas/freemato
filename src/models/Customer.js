const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  platformId: { type: String, unique: true, required: true },
  platform: { type: String, required: true },
  name: String,
  phone: String,
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Customer', CustomerSchema);
