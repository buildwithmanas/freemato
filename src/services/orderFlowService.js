const { MenuItem, Order, Customer } = require('../models');
const { sendMessage } = require('./messagingService');
const nlpService = require('./nlpService');

class OrderFlowService {
  constructor() {
    this.userSessions = new Map();
  }

  async sendWelcomeMessage(to, platform) {
    const allItems = await MenuItem.find();
    const menuGrouped = {};
    allItems.forEach(item => {
      if (!menuGrouped[item.category]) menuGrouped[item.category] = [];
      menuGrouped[item.category].push(item);
    });

    let totalRows = 0;
    const sections = [];
    for (const category of Object.keys(menuGrouped)) {
      const rows = [];
      for (const item of menuGrouped[category]) {
        if (totalRows < 10) {
          rows.push({ id: item.id, title: item.name, description: `₹${item.price} - ${item.description || ''}` });
          totalRows++;
        }
      }
      if (rows.length > 0) sections.push({ title: category, rows });
    }

    await sendMessage(to, platform, {
      text: 'Welcome! Browse our delicious menu and place your order.\n\nSelect items to add to cart:',
      list: { title: '🍕 Freemato Menu', buttonText: 'View Menu', sections }
    });
  }

  async addToCart(phone, platform, item) {
    let session = this.userSessions.get(phone) || { cart: [], platform, step: 'none' };
    const existing = session.cart.find(i => i.id === item.id);
    if (existing) { existing.quantity++; } else { session.cart.push({ ...item, quantity: 1 }); }
    this.userSessions.set(phone, session);

    await sendMessage(phone, platform, {
      text: `✅ Added ${item.name} to cart!\n\nWhat would you like to do next?`,
      buttons: [
        { id: 'view_cart', title: '🛒 View Cart' },
        { id: 'continue',  title: '➕ Add More' },
        { id: 'checkout',  title: '✅ Checkout' }
      ]
    });
  }

  async sendCart(phone, platform) {
    const session = this.userSessions.get(phone);
    if (!session || session.cart.length === 0) {
      await sendMessage(phone, platform, { text: '🛒 Your cart is empty!\n\nSend "menu" to browse items.' });
      return;
    }

    let cartText = '*🛒 Your Cart*\n\n';
    let total = 0;
    session.cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      cartText += `${item.name}\n  Qty: ${item.quantity} × ₹${item.price} = ₹${itemTotal}\n\n`;
    });
    cartText += `\n*Total: ₹${total}*`;

    await sendMessage(phone, platform, {
      text: cartText,
      buttons: [
        { id: 'checkout', title: '✅ Proceed to Checkout' },
        { id: 'continue', title: '➕ Add More Items' }
      ]
    });
  }

  async initiateCheckout(phone, platform) {
    const session = this.userSessions.get(phone);
    if (!session || session.cart.length === 0) {
      await sendMessage(phone, platform, { text: '❌ Your cart is empty!' });
      return;
    }
    session.step = 'awaiting_location';
    session.platform = platform;
    this.userSessions.set(phone, session);
    await sendMessage(phone, platform, {
      locationRequest: '📍 Please share your delivery location to proceed with the order.'
    });
  }

  async handleLocation(from, platform, location) {
    const session = this.userSessions.get(from);
    if (!session || session.step !== 'awaiting_location') return;

    session.deliveryLocation = {
      latitude: location.latitude, longitude: location.longitude,
      address: location.address || `${location.latitude}, ${location.longitude}`
    };
    session.step = 'confirm_order';
    this.userSessions.set(from, session);

    let summary = '*📋 Order Summary*\n\n';
    let total = 0;
    session.cart.forEach(item => {
      const t = item.price * item.quantity;
      total += t;
      summary += `${item.name} × ${item.quantity} = ₹${t}\n`;
    });
    summary += `\n*Total: ₹${total}*\n\n📍 Delivery to: ${session.deliveryLocation.address}`;

    await sendMessage(from, platform, {
      text: summary,
      buttons: [
        { id: 'confirm_order', title: '✅ Confirm Order' },
        { id: 'cancel',        title: '❌ Cancel' }
      ]
    });
  }

  async confirmCheckout(phone, platform) {
    const session = this.userSessions.get(phone);
    if (!session || !session.cart || session.cart.length === 0) return;

    const orderId = 'ORD' + Date.now();
    const total = session.cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const customer = await Customer.findOne({ platformId: phone });
    const realName = customer ? customer.name : phone;
    const realPhone = customer ? customer.phone : phone;

    const order = new Order({
      orderId, platformId: phone, customerPhone: realPhone, customerName: realName,
      items: session.cart, total, status: 'pending',
      deliveryAddress: session.deliveryLocation, platform
    });
    await order.save();
    this.userSessions.delete(phone);

    if (customer) {
      customer.totalOrders += 1;
      customer.totalSpent += total;
      await customer.save();
    }

    await sendMessage(phone, platform, {
      text: `✅ *Order Placed Successfully!*\n\nOrder ID: ${orderId}\nTotal: ₹${total}\n\n⏳ Waiting for restaurant confirmation...\n\nYou'll receive updates on this chat.`
    });
    console.log(`🔔 New order ${orderId} from ${phone} (${platform})`);
  }

  async sendOrderStatus(phone, platform, orderId) {
    const order = await Order.findOne({
      orderId, $or: [{ platformId: phone }, { customerPhone: phone }]
    });
    if (!order) {
      await sendMessage(phone, platform, { text: '❌ Order not found. Please check the Order ID.' });
      return;
    }

    const statusEmojis = { pending: '⏳', confirmed: '✅', cooking: '👨‍🍳', out_for_delivery: '🛵', delivered: '✨', cancelled: '❌' };
    const statusText  = { pending: 'Waiting for confirmation', confirmed: 'Order confirmed', cooking: 'Being prepared', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' };

    let msg = `📦 *Order Status*\n\nOrder ID: ${orderId}\nStatus: ${statusEmojis[order.status]} ${statusText[order.status]}\nTotal: ₹${order.total}\nOrdered: ${order.createdAt.toLocaleString('en-IN')}`;
    if (order.status === 'out_for_delivery' && order.deliveryPerson?.trackingActive)
      msg += '\n\n📍 Live tracking is active!';
    await sendMessage(phone, platform, { text: msg });
  }

  async sendOrderHistory(phone, platform) {
    const orders = await Order.find({ $or: [{ platformId: phone }, { customerPhone: phone }] })
      .sort({ createdAt: -1 }).limit(5);

    if (orders.length === 0) {
      await sendMessage(phone, platform, { text: '📦 No orders found.\n\nSend "menu" to place your first order!' });
      return;
    }
    let msg = '*📦 Your Recent Orders*\n\n';
    orders.forEach((o, idx) => {
      msg += `${idx + 1}. Order #${o.orderId}\n   Status: ${o.status} | ₹${o.total}\n   ${o.createdAt.toLocaleDateString('en-IN')}\n\n`;
    });
    msg += '\nSend "track ORDER_ID" to track any order.';
    await sendMessage(phone, platform, { text: msg });
  }

  async notifyCustomerStatusUpdate(orderId, newStatus, PORT) {
    const order = await Order.findOne({ orderId });
    if (!order) return;

    const messages = {
      confirmed:        '✅ Your order has been confirmed!\n\nThe restaurant is preparing your food. 👨‍🍳',
      cooking:          '👨‍🍳 Your food is being cooked!\n\nIt will be ready soon.',
      out_for_delivery: `🛵 Your order is out for delivery!\n\nTrack your rider: ${process.env.NGROK_URL || 'http://localhost:' + PORT}/track?order=${orderId}`,
      delivered:        '✨ Order delivered!\n\nEnjoy your meal! 🎉\n\nThank you for ordering with Freemato!',
      cancelled:        '❌ Your order has been cancelled by the restaurant.\n\nWe apologize for the inconvenience.'
    };

    if (messages[newStatus]) {
      const targetId = order.platformId || order.customerPhone;
      await sendMessage(targetId, order.platform, { text: `Order #${orderId}\n\n${messages[newStatus]}` });
    }
  }

  async handleInteractiveResponse(from, platform, selectedId) {
    if (!selectedId) return;
    const selectedItem = await MenuItem.findOne({ id: selectedId }).lean();

    if (selectedItem)              { await this.addToCart(from, platform, selectedItem); }
    else if (selectedId === 'view_cart')     { await this.sendCart(from, platform); }
    else if (selectedId === 'checkout')      { await this.initiateCheckout(from, platform); }
    else if (selectedId === 'confirm_order') { await this.confirmCheckout(from, platform); }
    else if (selectedId === 'cancel') {
      this.userSessions.delete(from);
      await sendMessage(from, platform, { text: '❌ Checkout cancelled. Cart has been emptied.' });
    } else if (selectedId === 'continue')    { await this.sendWelcomeMessage(from, platform); }
    else if (selectedId.startsWith('track_')) {
      await this.sendOrderStatus(from, platform, selectedId.replace('track_', ''));
    }
  }

  async handleIncomingMessage(from, platform, messageType, content) {
    console.log(`📱 Message from ${from} via ${platform}: ${messageType}`);

    try {
      let customer = await Customer.findOne({ platformId: from });
      let session = this.userSessions.get(from);
      if (!session) { session = { cart: [], platform, step: 'none' }; this.userSessions.set(from, session); }

      if (!customer) {
        const isWA = (platform === 'whatsapp' || platform === 'baileys');
        const extractedPhone = isWA && from.includes('@s.whatsapp.net')
          ? from.replace('@s.whatsapp.net', '') : null;

        if (session.step === 'awaiting_name' && messageType === 'text') {
          session.tempName = content.trim();
          if (extractedPhone) {
            customer = new Customer({ platformId: from, platform, name: session.tempName, phone: extractedPhone });
            await customer.save();
            session.step = 'none'; this.userSessions.set(from, session);
            await sendMessage(from, platform, { text: `✅ Welcome to Freemato, ${session.tempName}!` });
            await this.sendWelcomeMessage(from, platform);
          } else {
            session.step = 'awaiting_phone'; this.userSessions.set(from, session);
            await sendMessage(from, platform, { text: `Thanks ${session.tempName}! What is your phone number?` });
          }
          return;
        } else if (session.step === 'awaiting_phone' && messageType === 'text') {
          customer = new Customer({ platformId: from, platform, name: session.tempName, phone: content.trim() });
          await customer.save();
          session.step = 'none'; this.userSessions.set(from, session);
          await sendMessage(from, platform, { text: '✅ Registration complete! Welcome to Freemato.' });
          await this.sendWelcomeMessage(from, platform);
          return;
        } else if (session.step !== 'awaiting_name' && session.step !== 'awaiting_phone') {
          session.step = 'awaiting_name'; this.userSessions.set(from, session);
          await sendMessage(from, platform, { text: '👋 Welcome to Freemato! What is your name?' });
          return;
        }
      } else {
        customer.lastActive = new Date(); await customer.save();
      }

      if (messageType === 'text') {
        const rawText = content.trim();
        const lowerText = rawText.toLowerCase();

        const nlp = await nlpService.classifyMessage(rawText);
        const HIGH_CONFIDENCE = nlp.score > 0.6;
        console.log(`🧠 NLP: intent=${nlp.intent} score=${nlp.score.toFixed(2)} item=${nlp.menuItemId}`);

        if (HIGH_CONFIDENCE) {
          switch (nlp.intent) {
            case 'greeting': case 'show_menu':
              await this.sendWelcomeMessage(from, platform); return;
            case 'add_item':
              if (nlp.menuItemId) {
                const item = await MenuItem.findOne({ id: nlp.menuItemId });
                if (item) { await this.addToCart(from, platform, item.toObject()); return; }
              }
              await this.sendWelcomeMessage(from, platform); return;
            case 'view_cart':    await this.handleInteractiveResponse(from, platform, 'view_cart'); return;
            case 'checkout':     await this.handleInteractiveResponse(from, platform, 'checkout'); return;
            case 'confirm_order':await this.handleInteractiveResponse(from, platform, 'confirm_order'); return;
            case 'cancel':       await this.handleInteractiveResponse(from, platform, 'cancel'); return;
            case 'add_more':     await this.handleInteractiveResponse(from, platform, 'continue'); return;
            case 'order_history':await this.sendOrderHistory(from, platform); return;
            case 'track_order': {
              const matches = rawText.match(/[A-Z0-9]{6,}/i);
              if (matches) { await this.sendOrderStatus(from, platform, matches[0].toUpperCase()); }
              else {
                const last = await Order.findOne({ customerPhone: customer?.phone }).sort({ createdAt: -1 });
                if (last) await this.sendOrderStatus(from, platform, last.orderId);
                else await sendMessage(from, platform, { text: '📦 No recent orders found.' });
              }
              return;
            }
            case 'item_price': {
              if (nlp.menuItemId) {
                const item = await MenuItem.findOne({ id: nlp.menuItemId });
                if (item) { await sendMessage(from, platform, { text: `💰 *${item.name}* costs ₹${item.price}\n${item.description || ''}` }); return; }
              }
              const all = await MenuItem.find();
              let priceList = '*🍽️ Price List:*\n\n';
              all.forEach(i => { priceList += `${i.name} — ₹${i.price}\n`; });
              await sendMessage(from, platform, { text: priceList }); return;
            }
            case 'help':
              await sendMessage(from, platform, {
                text: `🤖 *Freemato Bot — How to order:*\n\n🍽️ *menu* — Browse food\n🛒 *cart* — View cart\n💳 *checkout* — Place order\n✅ *confirm* — Confirm order\n📦 *my orders* — History\n🚚 *track* — Track last order\n❌ *cancel* — Cancel\n\n💡 _Tip: Just type the food name to add to cart!_`
              }); return;
          }
        }

        const cartKeywords = {
          'cart': 'view_cart', 'view cart': 'view_cart', 'basket': 'view_cart',
          'checkout': 'checkout', 'check out': 'checkout', 'buy': 'checkout',
          'confirm': 'confirm_order', 'yes': 'confirm_order',
          'cancel': 'cancel', 'no': 'cancel', 'clear': 'cancel',
          'more': 'continue', 'add more': 'continue', 'back': 'continue', 'continue': 'continue'
        };
        if (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'menu' || lowerText === 'start' || lowerText === '/start') {
          await this.sendWelcomeMessage(from, platform);
        } else if (lowerText === 'my orders' || lowerText === 'orders') {
          await this.sendOrderHistory(from, platform);
        } else if (lowerText.startsWith('track ')) {
          await this.sendOrderStatus(from, platform, lowerText.replace('track ', '').toUpperCase());
        } else if (cartKeywords[lowerText]) {
          await this.handleInteractiveResponse(from, platform, cartKeywords[lowerText]);
        } else {
          const num = parseInt(lowerText);
          const allItems = await MenuItem.find();
          let resolvedId = null;
          if (!isNaN(num) && num >= 1 && num <= allItems.length) {
            resolvedId = allItems[num - 1]?.id;
          } else {
            const match = allItems.find(i =>
              i.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(lowerText.replace(/[^a-z0-9]/g, ''))
              || lowerText.includes(i.name.toLowerCase().split(' ').pop())
            );
            if (match) resolvedId = match.id;
          }
          if (resolvedId) await this.handleInteractiveResponse(from, platform, resolvedId);
          else await this.sendWelcomeMessage(from, platform);
        }

      } else if (messageType === 'interactive') {
        await this.handleInteractiveResponse(from, platform, content);
      } else if (messageType === 'location') {
        await this.handleLocation(from, platform, content);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }
}

module.exports = new OrderFlowService();
