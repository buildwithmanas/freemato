const axios = require('axios');
const cfg = require('../config');

// baileys socket is injected to avoid circular deps
let _baileysSock = null;
let _waStatus = 'disconnected';

function setBaileysSocket(sock, status) {
  _baileysSock = sock;
  _waStatus = status;
}

async function sendMessage(to, platform, options) {
  if (platform === 'whatsapp') {
    await _sendViaWhatsAppAPI(to, options);
  } else if (platform === 'telegram') {
    await _sendViaTelegram(to, options);
  } else if (platform === 'baileys') {
    await _sendViaBaileys(to, options);
  }
}

async function _sendViaWhatsAppAPI(to, options) {
  let payload = { messaging_product: 'whatsapp', to, type: 'text', text: { body: '' } };

  if (options.list) {
    payload.type = 'interactive';
    payload.interactive = {
      type: 'list',
      header: { type: 'text', text: options.list.title },
      body: { text: options.text },
      footer: { text: options.list.footer || 'Fresh food delivered to your doorstep' },
      action: { button: options.list.buttonText, sections: options.list.sections }
    };
  } else if (options.buttons) {
    payload.type = 'interactive';
    payload.interactive = {
      type: 'button',
      body: { text: options.text },
      action: {
        buttons: options.buttons.map(b => ({ type: 'reply', reply: { id: b.id, title: b.title } }))
      }
    };
  } else if (options.locationRequest) {
    payload.type = 'interactive';
    payload.interactive = {
      type: 'location_request_message',
      body: { text: options.locationRequest },
      action: { name: 'send_location' }
    };
  } else if (options.location) {
    payload.type = 'location';
    payload.location = {
      latitude: options.location.latitude, longitude: options.location.longitude,
      name: options.location.name || 'Delivery', address: options.location.address || 'Location'
    };
  } else {
    payload.text.body = options.text;
  }

  try {
    await axios.post(cfg.WHATSAPP_API_URL, payload, {
      headers: { 'Authorization': `Bearer ${cfg.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('WhatsApp API Error:', e.response?.data || e.message);
  }
}

async function sendTelegramMessage(data, endpoint = '/sendMessage') {
  if (!cfg.TELEGRAM_API_URL) return;
  try {
    await axios.post(`${cfg.TELEGRAM_API_URL}${endpoint}`, data);
  } catch (e) {
    console.error('Telegram API Error:', e.response?.data || e.message);
  }
}

async function sendTelegramRiderMessage(data, endpoint = '/sendMessage') {
  if (!cfg.TELEGRAM_RIDER_API_URL) return;
  try {
    await axios.post(`${cfg.TELEGRAM_RIDER_API_URL}${endpoint}`, data);
  } catch (e) {
    console.error('Telegram Rider API Error:', e.response?.data || e.message);
  }
}

async function _sendViaTelegram(to, options) {
  let payload = { chat_id: to, text: options.text || options.locationRequest };

  if (options.location) {
    await sendTelegramMessage({ chat_id: to, latitude: options.location.latitude, longitude: options.location.longitude }, '/sendLocation');
    if (options.location.name || options.location.address)
      await sendTelegramMessage({ chat_id: to, text: `📍 ${options.location.name || 'Delivery'}\n${options.location.address || ''}` });
    return;
  }

  if (options.list) {
    payload.text = `*${options.list.title}*\n\n${options.text}`;
    payload.parse_mode = 'Markdown';
    const inline_keyboard = [];
    options.list.sections.forEach(sec => {
      sec.rows.forEach(row => {
        const btnId = row.id.length > 64 ? row.id.substring(0, 64) : row.id;
        inline_keyboard.push([{ text: `${row.title} - ${row.description}`, callback_data: btnId }]);
      });
    });
    payload.reply_markup = { inline_keyboard };
  } else if (options.buttons) {
    payload.parse_mode = 'Markdown';
    const inline_keyboard = options.buttons.map(b => ([{ text: b.title, callback_data: b.id }]));
    payload.reply_markup = { inline_keyboard };
  } else if (options.locationRequest) {
    payload.reply_markup = {
      keyboard: [[{ text: '📍 Share Location', request_location: true }]],
      resize_keyboard: true, one_time_keyboard: true
    };
  }

  await sendTelegramMessage(payload);
}

async function _sendViaBaileys(to, options) {
  if (!_baileysSock || _waStatus !== 'connected') return;
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

  try {
    if (options.locationRequest) {
      await _baileysSock.sendMessage(jid, {
        text: `📍 ${options.locationRequest}\n\nPlease share your location by tapping the 📎 attachment icon > Location.`
      });
    } else if (options.list || options.buttons) {
      const btns = (options.buttons || []).slice(0, 3)
        .map(b => ({ buttonId: b.id, buttonText: { displayText: b.title }, type: 1 }));
      if (btns.length > 0) {
        await _baileysSock.sendMessage(jid, { text: options.text || options.list?.title || '', buttons: btns, headerType: 1 });
      } else if (options.list) {
        let msg = `*${options.list.title}*\n\n${options.text}\n\n`;
        let n = 1;
        options.list.sections.forEach(sec => {
          msg += `*${sec.title}*\n`;
          sec.rows.forEach(row => { msg += `${n++}. ${row.title}\n`; });
          msg += '\n';
        });
        msg += '_Reply with the item number to order_\n\n'
          + '🛒 *Cart controls:* type _cart_, _checkout_, _confirm_, _cancel_, _more_';
        await _baileysSock.sendMessage(jid, { text: msg });
      }
    } else {
      await _baileysSock.sendMessage(jid, { text: options.text || '' });
    }
  } catch (e) {
    console.error('Baileys send error:', e.message);
    if (e.message?.includes('Connection Closed') || e.message?.includes('Stream Errored')) {
      setTimeout(async () => {
        if (_waStatus === 'connected' && _baileysSock) {
          try { await _baileysSock.sendMessage(jid, { text: options.text || '(retry)' }); } catch (_) {}
        }
      }, 5000);
    }
  }
}

module.exports = { sendMessage, sendTelegramMessage, sendTelegramRiderMessage, setBaileysSocket };
