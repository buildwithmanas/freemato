const express = require('express');
const router = express.Router();
const riderController = require('../controllers/riderController');

router.get('/api/track/:orderId', riderController.trackOrder);
router.post('/api/rider/location', riderController.updateRiderLocation);
router.post('/api/rider/delivered/:orderId', riderController.markDelivered);

module.exports = router;
