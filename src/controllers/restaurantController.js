const { Order, Customer, Rider, MenuItem, seedMenuIfNeeded } = require('../models');
const orderFlowService = require('../services/orderFlowService');
const cfg = require('../config');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

exports.getSetupStatus = (req, res) => {
  res.json({ needsSetup: !cfg.RESTAURANT_NAME || !cfg.TELEGRAM_BOT_TOKEN || !process.env.NGROK_URL });
};

exports.getSettingsConfig = (req, res) => {
  res.json({
    restaurantName:      cfg.RESTAURANT_NAME,
    restaurantLocation:  cfg.RESTAURANT_LOCATION,
    whatsappToken:       cfg.maskToken(cfg.WHATSAPP_TOKEN),
    phoneNumberId:       cfg.maskToken(cfg.PHONE_NUMBER_ID),
    telegramBotToken:    cfg.maskToken(cfg.TELEGRAM_BOT_TOKEN),
    telegramRiderBotToken: cfg.maskToken(cfg.TELEGRAM_RIDER_BOT_TOKEN),
    ngrokUrl: process.env.NGROK_URL || ''
  });
};

exports.setupSystem = async (req, res) => {
  const updates = cfg.applyConfigUpdate(req.body);
  try {
    if (req.body.seedDefaultMenu) {
      await seedMenuIfNeeded();
    }
    if (cfg.TELEGRAM_API_URL && process.env.NGROK_URL)
      await axios.post(`${cfg.TELEGRAM_API_URL}/setWebhook`, { url: `${process.env.NGROK_URL}/telegram-webhook` });
    if (cfg.TELEGRAM_RIDER_API_URL && process.env.NGROK_URL)
      await axios.post(`${cfg.TELEGRAM_RIDER_API_URL}/setWebhook`, { url: `${process.env.NGROK_URL}/telegram-rider-webhook` });
  } catch (e) { console.error('Failed setup routines:', e.message); }
  res.json({ success: true });
};

exports.getConfig = (req, res) => {
  res.json({ ngrokUrl: process.env.NGROK_URL || `http://localhost:3000` });
};

exports.getMenu = async (req, res) => {
  try { res.json(await MenuItem.find().sort({ category: 1, name: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.addMenuItem = async (req, res) => {
  try { const item = new MenuItem(req.body); await item.save(); res.json(item); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateMenuItem = async (req, res) => {
  try { res.json(await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteMenuItem = async (req, res) => {
  try { await MenuItem.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getCustomers = async (req, res) => {
  try { res.json(await Customer.find().sort({ joinedAt: -1 }).lean()); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getRiders = async (req, res) => {
  try { res.json(await Rider.find().sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.addRider = async (req, res) => {
  try { const { name, phone, telegramChatId } = req.body; const r = new Rider({ name, phone, telegramChatId }); await r.save(); res.json(r); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.deleteRider = async (req, res) => {
  try { await Rider.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getOrders = async (req, res) => {
  try {
    const query = req.query.status ? { status: req.query.status } : {};
    res.json(await Order.find(query).sort({ createdAt: -1 }).limit(50));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, riderId } = req.body;
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = status;
    order.updatedAt = new Date();

    if (status === 'out_for_delivery' && riderId) {
      const rider = await Rider.findById(riderId);
      if (rider) {
        order.deliveryPerson = { name: rider.name, phone: rider.phone, trackingActive: false };
        if (cfg.TELEGRAM_RIDER_API_URL) {
          const trackUrl = `${process.env.NGROK_URL || 'http://localhost:3000'}/rider?order=${order.orderId}`;
          axios.post(`${cfg.TELEGRAM_RIDER_API_URL}/sendMessage`, {
            chat_id: rider.telegramChatId,
            text: `🛵 New Delivery Assigned!\n\nOrder ID: ${order.orderId}\nCustomer: ${order.customerPhone}\nDeliver to: ${order.deliveryAddress?.address || 'N/A'}\n\nStart Tracking: ${trackUrl}`
          }).catch(console.error);
        }
      }
    }

    await order.save();
    await orderFlowService.notifyCustomerStatusUpdate(order.orderId, status, process.env.PORT);
    res.json({ success: true, order });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getStats = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    res.json({
      todayOrders:    await Order.countDocuments({ createdAt: { $gte: today } }),
      pendingOrders:  await Order.countDocuments({ status: 'pending' }),
      activeOrders:   await Order.countDocuments({ status: { $in: ['confirmed', 'cooking', 'out_for_delivery'] } }),
      todayRevenue: (await Order.aggregate([
        { $match: { createdAt: { $gte: today }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]))[0]?.total || 0
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.clearCustomers = async (req, res) => {
  try { await Customer.deleteMany({}); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.clearRiders = async (req, res) => {
  try { await Rider.deleteMany({}); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.clearOrders = async (req, res) => {
  try { await Order.deleteMany({}); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.resetAll = async (req, res) => {
  try {
    const p = path.join(__dirname, '..', '..', 'wa_auth');
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    
    await Customer.deleteMany({});
    await Rider.deleteMany({});
    await Order.deleteMany({});
    
    cfg.resetEverything();
    
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
