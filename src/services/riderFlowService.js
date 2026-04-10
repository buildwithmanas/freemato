const { Rider } = require('../models');
const { sendTelegramRiderMessage } = require('./messagingService');

class RiderFlowService {
  constructor() {
    this.riderSessions = new Map();
  }

  async handleIncomingMessage(chatId, text) {
    console.log(`🛵 Rider Bot Message from ${chatId}: ${text}`);
    try {
      let rider = await Rider.findOne({ telegramChatId: String(chatId) });
      let session = this.riderSessions.get(chatId) || { step: 'none' };

      if (rider) {
        await sendTelegramRiderMessage({
            chat_id: chatId,
            text: `Welcome back, ${rider.name}! You are already registered and your tracking is properly linked. New delivery notifications will appear here.`
        });
        return;
      }

      const lowerText = (text || '').toLowerCase().trim();

      if (session.step === 'none') {
        session.step = 'awaiting_confirmation';
        this.riderSessions.set(chatId, session);
        await sendTelegramRiderMessage({
            chat_id: chatId,
            text: '👋 Welcome to the Freemato Rider Portal!\n\nWould you like to register as a new delivery rider? (Reply "Yes" or "No")'
        });
        return;
      }

      if (session.step === 'awaiting_confirmation') {
        if (lowerText === 'yes' || lowerText === 'y') {
          session.step = 'awaiting_name';
          this.riderSessions.set(chatId, session);
          await sendTelegramRiderMessage({
              chat_id: chatId,
              text: 'Great! What is your full name?'
          });
        } else if (lowerText === 'no' || lowerText === 'n') {
          this.riderSessions.delete(chatId);
          await sendTelegramRiderMessage({
              chat_id: chatId,
              text: 'Okay. If you change your mind, just say "Hi" here anytime.'
          });
        } else {
          await sendTelegramRiderMessage({
              chat_id: chatId,
              text: 'Please reply with "Yes" or "No".'
          });
        }
        return;
      }

      if (session.step === 'awaiting_name') {
        session.tempName = text.trim();
        session.step = 'awaiting_phone';
        this.riderSessions.set(chatId, session);
        await sendTelegramRiderMessage({
            chat_id: chatId,
            text: `Thanks, ${session.tempName}. Finally, what is your phone number?`
        });
        return;
      }

      if (session.step === 'awaiting_phone') {
        const phone = text.trim();
        const newRider = new Rider({
          name: session.tempName,
          phone: phone,
          telegramChatId: String(chatId)
        });
        await newRider.save();
        this.riderSessions.delete(chatId);

        await sendTelegramRiderMessage({
            chat_id: chatId,
            text: `✅ **Registration Complete!**\n\nYou are now officially registered as a Freemato Rider. Your Chat ID is securely bound. Whenever an order is assigned to you, you'll receive the notification and tracking link here.`
        });
        console.log(`✅ New Rider registered dynamically: ${newRider.name}`);
        return;
      }

    } catch (error) {
      console.error('Error handling rider message:', error);
    }
  }
}

module.exports = new RiderFlowService();
