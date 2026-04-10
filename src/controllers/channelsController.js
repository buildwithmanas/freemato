const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const axios = require('axios');
const cfg = require('../config');
const { setBaileysSocket } = require('../services/messagingService');
const orderFlowService = require('../services/orderFlowService');
const riderFlowService = require('../services/riderFlowService');

let baileysSock = null;
let waQRBase64  = null;
let waStatus    = 'disconnected';
let waPhone     = null;

function _updateStatus(s) { waStatus = s; setBaileysSocket(baileysSock, waStatus); }

exports.initBaileysSocket = async () => {
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = await import('@whiskeysockets/baileys');
  const P = (await import('pino')).default;
  const logger = P({ level: 'silent' });
  const authPath = path.join(__dirname, '..', '..', 'wa_auth');
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  baileysSock = makeWASocket({ version, auth: state, logger, printQRInTerminal: false });
  setBaileysSocket(baileysSock, waStatus);
  baileysSock.ev.on('creds.update', saveCreds);

  baileysSock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      _updateStatus('qr_pending');
      waQRBase64 = await QRCode.toDataURL(qr);
      console.log('📱 WhatsApp QR ready — scan from Restaurant Dashboard > Settings');
    }
    if (connection === 'open') {
      _updateStatus('connected');
      waQRBase64 = null;
      waPhone = baileysSock.user?.id?.split(':')[0] || 'Unknown';
      console.log(`✅ Baileys WhatsApp connected: +${waPhone}`);
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const retry = code !== DisconnectReason.loggedOut;
      _updateStatus(retry ? 'disconnected' : 'logged_out');
      console.log(`⚠️ Baileys disconnected (code ${code}). Reconnecting: ${retry}`);
      if (retry) setTimeout(exports.initBaileysSocket, 3000);
    }
  });

  baileysSock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const from = msg.key.remoteJid || '';
      if (!from || from.includes('@g.us')) continue;

      const inner = msg.message || {};
      if (Object.keys(inner).length === 0) continue;

      const text = inner.conversation
        || inner.extendedTextMessage?.text
        || inner.ephemeralMessage?.message?.conversation
        || '';
      const btnReply  = inner.buttonsResponseMessage?.selectedButtonId;
      const listReply = inner.listResponseMessage?.singleSelectReply?.selectedRowId;
      const selectedId = btnReply || listReply;

      if (selectedId)  await orderFlowService.handleIncomingMessage(from, 'baileys', 'interactive', selectedId);
      else if (text)   await orderFlowService.handleIncomingMessage(from, 'baileys', 'text', text);
    }
  });
};

exports.getWaQr = (req, res) => {
  if (waStatus === 'connected') return res.json({ status: 'connected', phone: waPhone });
  if (waQRBase64) return res.json({ status: 'qr_pending', qr: waQRBase64 });
  res.json({ status: waStatus });
};

exports.connectWa = async (req, res) => {
  if (waStatus === 'connected') return res.json({ success: true, message: 'Already connected' });
  try { await exports.initBaileysSocket(); res.json({ success: true, message: 'Connecting...' }); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.disconnectWa = async (req, res) => {
  try {
    if (baileysSock) { await baileysSock.logout(); baileysSock = null; }
    waQRBase64 = null; waPhone = null; _updateStatus('disconnected');
    const p = path.join(__dirname, '..', '..', 'wa_auth');
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.verifyWaWebhook = (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === cfg.VERIFY_TOKEN) {
    console.log('✅ WhatsApp Webhook verified');
    res.status(200).send(challenge);
  } else { res.sendStatus(403); }
};

exports.handleWaWebhook = async (req, res) => {
  try {
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      body.entry.forEach(entry => {
        entry.changes.forEach(change => {
          if (change.field === 'messages') {
            const msg = change.value.messages?.[0];
            if (msg) {
              const from = msg.from;
              if (msg.type === 'text')        orderFlowService.handleIncomingMessage(from, 'whatsapp', 'text', msg.text.body);
              else if (msg.type === 'interactive') {
                const id = msg.interactive.list_reply?.id || msg.interactive.button_reply?.id;
                orderFlowService.handleIncomingMessage(from, 'whatsapp', 'interactive', id);
              } else if (msg.type === 'location') {
                orderFlowService.handleIncomingMessage(from, 'whatsapp', 'location', msg.location);
              }
            }
          }
        });
      });
    }
    res.sendStatus(200);
  } catch (e) { console.error('WhatsApp Webhook error:', e); res.sendStatus(500); }
};

exports.handleTelegramWebhook = async (req, res) => {
  try {
    const update = req.body;
    if (update.message) {
      const msg  = update.message;
      const from = msg.chat.id.toString();
      if (msg.text)     await orderFlowService.handleIncomingMessage(from, 'telegram', 'text', msg.text);
      else if (msg.location) await orderFlowService.handleIncomingMessage(from, 'telegram', 'location', { latitude: msg.location.latitude, longitude: msg.location.longitude });
    } else if (update.callback_query) {
      const from = update.callback_query.message.chat.id.toString();
      await orderFlowService.handleIncomingMessage(from, 'telegram', 'interactive', update.callback_query.data);
      try { await axios.post(`${cfg.TELEGRAM_API_URL}/answerCallbackQuery`, { callback_query_id: update.callback_query.id }); } catch (_) {}
    }
    res.sendStatus(200);
  } catch (e) { console.error('Telegram Webhook error:', e); res.sendStatus(500); }
};

exports.handleTelegramRiderWebhook = async (req, res) => {
  try {
    const update = req.body;
    if (update.message && update.message.text) {
      const msg  = update.message;
      const from = msg.chat.id.toString();
      await riderFlowService.handleIncomingMessage(from, msg.text);
    }
    res.sendStatus(200);
  } catch (e) { console.error('Telegram Rider Webhook error:', e); res.sendStatus(500); }
};
