const express = require('express');
const router = express.Router();
const channelsController = require('../controllers/channelsController');

// Baileys REST endpoints
router.get('/api/whatsapp/qr', channelsController.getWaQr);
router.post('/api/whatsapp/connect', channelsController.connectWa);
router.post('/api/whatsapp/disconnect', channelsController.disconnectWa);

// WhatsApp Business API Webhook
router.get('/webhook', channelsController.verifyWaWebhook);
router.post('/webhook', channelsController.handleWaWebhook);

// Telegram Webhooks
router.post('/telegram-webhook', channelsController.handleTelegramWebhook);
router.post('/telegram-rider-webhook', channelsController.handleTelegramRiderWebhook);

module.exports = router;
