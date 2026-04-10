require('dotenv').config();

const { connectDatabase } = require('./src/config/database');
const { MenuItem, seedMenuIfNeeded } = require('./src/models');
const nlpService = require('./src/services/nlpService');
const cfg = require('./src/config');
const axios = require('axios');
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectDatabase();
  
  await seedMenuIfNeeded();
  const menuItems = await MenuItem.find({}, 'id name');
  
  await nlpService.train(menuItems);

  app.listen(PORT, () => {
    console.log(`\n🚀 Freemato Server Started!\n`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📍 ngrok: ${process.env.NGROK_URL || 'Not configured'}\n`);
    console.log(`🏪 Restaurant Dashboard: /restaurant`);
    console.log(`🛵 Rider App: /rider?order=ORDER_ID`);
    console.log(`📱 WhatsApp Webhook: /webhook`);
    console.log(`📱 Telegram Webhook: /telegram-webhook\n`);

    if (process.env.NGROK_URL && cfg.TELEGRAM_BOT_TOKEN) {
      axios.post(`${cfg.TELEGRAM_API_URL}/setWebhook`, {
        url: `${process.env.NGROK_URL}/telegram-webhook`
      }).then(() => console.log('✅ Telegram Webhook set'))
        .catch(e => console.error('❌ Failed to set Telegram Webhook:', e.message));
    }
    if (process.env.NGROK_URL && cfg.TELEGRAM_RIDER_BOT_TOKEN) {
      axios.post(`${cfg.TELEGRAM_RIDER_API_URL}/setWebhook`, {
        url: `${process.env.NGROK_URL}/telegram-rider-webhook`
      }).then(() => console.log('✅ Telegram Rider Webhook set'))
        .catch(e => console.error('❌ Failed to set Telegram Rider Webhook:', e.message));
    }
  });
}

startServer();
