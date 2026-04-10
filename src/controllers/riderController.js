const { Order } = require('../models');
const { sendMessage } = require('../services/messagingService');
const orderFlowService = require('../services/orderFlowService');

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function deg2rad(deg) { return deg * (Math.PI / 180); }

exports.trackOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({
      status: order.status,
      rider: { name: order.deliveryPerson?.name, phone: order.deliveryPerson?.phone, lastLocation: order.deliveryPerson?.lastLocation },
      destination: { latitude: order.deliveryAddress?.latitude, longitude: order.deliveryAddress?.longitude, address: order.deliveryAddress?.address }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateRiderLocation = async (req, res) => {
  try {
    const { orderId, latitude, longitude } = req.body;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.deliveryPerson.trackingActive = true;
    order.deliveryPerson.lastLocation = { latitude, longitude, timestamp: new Date() };

    if (order.deliveryAddress?.latitude && !order.deliveryPerson.approachingNotified) {
      const dist = getDistanceFromLatLonInKm(latitude, longitude, order.deliveryAddress.latitude, order.deliveryAddress.longitude);
      if (dist < 0.2) {
        order.deliveryPerson.approachingNotified = true;
        await sendMessage(order.customerPhone, order.platform, {
          text: '🛵 *Your order is almost there!* The rider is arriving soon (within 200m).'
        });
      }
    }

    await order.save();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.markDelivered = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = 'delivered';
    order.deliveryPerson.trackingActive = false;
    order.updatedAt = new Date();
    await order.save();
    await orderFlowService.notifyCustomerStatusUpdate(order.orderId, 'delivered', process.env.PORT);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
