const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, required: true },
  platformId: { type: String },
  customerPhone: { type: String, required: true },
  customerName: String,
  items: [{ id: String, name: String, price: Number, quantity: Number }],
  total: Number,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cooking', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryAddress: { address: String, latitude: Number, longitude: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deliveryPerson: {
    name: String, phone: String,
    trackingActive: { type: Boolean, default: false },
    approachingNotified: { type: Boolean, default: false },
    lastLocation: { latitude: Number, longitude: Number, timestamp: Date }
  },
  platform: { type: String, enum: ['whatsapp', 'telegram', 'baileys'], default: 'whatsapp' },
  notes: String
});

module.exports = mongoose.model('Order', OrderSchema);
