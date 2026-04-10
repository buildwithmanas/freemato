const fs = require('fs');
const path = require('path');

let WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
let PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
let RESTAURANT_NAME = process.env.RESTAURANT_NAME || '';
let RESTAURANT_LOCATION = process.env.RESTAURANT_LOCATION || '';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'your_verify_token_123';
let WHATSAPP_API_URL = PHONE_NUMBER_ID
  ? `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages` : '';
let TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let TELEGRAM_API_URL = TELEGRAM_BOT_TOKEN
  ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}` : '';
let TELEGRAM_RIDER_BOT_TOKEN = process.env.TELEGRAM_RIDER_BOT_TOKEN;
let TELEGRAM_RIDER_API_URL = TELEGRAM_RIDER_BOT_TOKEN
  ? `https://api.telegram.org/bot${TELEGRAM_RIDER_BOT_TOKEN}` : '';

function maskToken(token) {
  if (!token) return '';
  if (token.length <= 4) return '••••' + token;
  return '••••••••••••' + token.substring(token.length - 4);
}

function updateEnvFile(newConfig) {
  const envPath = path.join(__dirname, '..', '..', '.env');
  let envFile = '';
  try { envFile = fs.readFileSync(envPath, 'utf8'); } catch (e) {}
  for (const key in newConfig) {
    if (!newConfig[key]) continue;
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envFile)) {
      envFile = envFile.replace(regex, `${key}=${newConfig[key]}`);
    } else {
      envFile += `\n${key}=${newConfig[key]}`;
    }
  }
  fs.writeFileSync(envPath, envFile.trim() + '\n');
}

function applyConfigUpdate({ restaurantName, restaurantLocation, whatsappToken, phoneNumberId, telegramBotToken, telegramRiderBotToken, ngrokUrl }) {
  const updates = {};
  if (restaurantName) {
    updates.RESTAURANT_NAME = restaurantName; RESTAURANT_NAME = restaurantName;
  }
  if (restaurantLocation) {
    updates.RESTAURANT_LOCATION = restaurantLocation; RESTAURANT_LOCATION = restaurantLocation;
  }
  if (whatsappToken && !whatsappToken.startsWith('••••')) {
    updates.WHATSAPP_TOKEN = whatsappToken; WHATSAPP_TOKEN = whatsappToken;
  }
  if (phoneNumberId && !phoneNumberId.startsWith('••••')) {
    updates.PHONE_NUMBER_ID = phoneNumberId; PHONE_NUMBER_ID = phoneNumberId;
    WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
  }
  if (telegramBotToken && !telegramBotToken.startsWith('••••')) {
    updates.TELEGRAM_BOT_TOKEN = telegramBotToken; TELEGRAM_BOT_TOKEN = telegramBotToken;
    TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
  }
  if (telegramRiderBotToken && !telegramRiderBotToken.startsWith('••••')) {
    updates.TELEGRAM_RIDER_BOT_TOKEN = telegramRiderBotToken; TELEGRAM_RIDER_BOT_TOKEN = telegramRiderBotToken;
    TELEGRAM_RIDER_API_URL = `https://api.telegram.org/bot${TELEGRAM_RIDER_BOT_TOKEN}`;
  }
  if (ngrokUrl) { updates.NGROK_URL = ngrokUrl.replace(/\/$/, ''); process.env.NGROK_URL = updates.NGROK_URL; }
  Object.assign(process.env, updates);
  updateEnvFile(updates);
  return updates;
}

function resetEverything() {
  const updates = { RESTAURANT_NAME: '', RESTAURANT_LOCATION: '', NGROK_URL: '', WHATSAPP_TOKEN: '', PHONE_NUMBER_ID: '', TELEGRAM_BOT_TOKEN: '', TELEGRAM_RIDER_BOT_TOKEN: '' };
  Object.assign(process.env, updates);
  RESTAURANT_NAME = ''; RESTAURANT_LOCATION = '';
  WHATSAPP_TOKEN = ''; PHONE_NUMBER_ID = ''; WHATSAPP_API_URL = '';
  TELEGRAM_BOT_TOKEN = ''; TELEGRAM_API_URL = '';
  TELEGRAM_RIDER_BOT_TOKEN = ''; TELEGRAM_RIDER_API_URL = '';
  
  const envPath = path.join(__dirname, '..', '..', '.env');
  fs.writeFileSync(envPath, 'PORT=3000\nMONGODB_URI=mongodb://localhost:27017/fooddelivery\n');
}

module.exports = {
  get RESTAURANT_NAME() { return RESTAURANT_NAME; },
  get RESTAURANT_LOCATION() { return RESTAURANT_LOCATION; },
  get WHATSAPP_TOKEN() { return WHATSAPP_TOKEN; },
  get PHONE_NUMBER_ID() { return PHONE_NUMBER_ID; },
  get VERIFY_TOKEN() { return VERIFY_TOKEN; },
  get WHATSAPP_API_URL() { return WHATSAPP_API_URL; },
  get TELEGRAM_BOT_TOKEN() { return TELEGRAM_BOT_TOKEN; },
  get TELEGRAM_API_URL() { return TELEGRAM_API_URL; },
  get TELEGRAM_RIDER_BOT_TOKEN() { return TELEGRAM_RIDER_BOT_TOKEN; },
  get TELEGRAM_RIDER_API_URL() { return TELEGRAM_RIDER_API_URL; },
  maskToken,
  updateEnvFile,
  applyConfigUpdate,
  resetEverything
};
