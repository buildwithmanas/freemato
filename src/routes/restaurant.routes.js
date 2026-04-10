const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');

// Setup & Settings
router.get('/api/setup/status', restaurantController.getSetupStatus);
router.get('/api/settings/config', restaurantController.getSettingsConfig);
router.post('/api/setup', restaurantController.setupSystem);
router.get('/api/config', restaurantController.getConfig);

// Menu CRUD
router.get('/api/restaurant/menu', restaurantController.getMenu);
router.post('/api/restaurant/menu', restaurantController.addMenuItem);
router.put('/api/restaurant/menu/:id', restaurantController.updateMenuItem);
router.delete('/api/restaurant/menu/:id', restaurantController.deleteMenuItem);

// CRM / Riders
router.get('/api/restaurant/crm/customers', restaurantController.getCustomers);
router.get('/api/restaurant/riders', restaurantController.getRiders);
router.post('/api/restaurant/riders', restaurantController.addRider);
router.delete('/api/restaurant/riders/:id', restaurantController.deleteRider);

// Orders
router.get('/api/restaurant/orders', restaurantController.getOrders);
router.get('/api/restaurant/orders/:orderId', restaurantController.getOrderById);
router.post('/api/restaurant/orders/:orderId/status', restaurantController.updateOrderStatus);

// Stats
router.get('/api/restaurant/stats', restaurantController.getStats);

// Danger Zone
router.delete('/api/settings/clear-customers', restaurantController.clearCustomers);
router.delete('/api/settings/clear-riders', restaurantController.clearRiders);
router.delete('/api/settings/clear-orders', restaurantController.clearOrders);
router.delete('/api/settings/reset-all', restaurantController.resetAll);

module.exports = router;
