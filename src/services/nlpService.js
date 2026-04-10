// src/services/nlpService.js
const { NlpManager } = require('node-nlp');

class NlpService {
  constructor() {
    this.manager = new NlpManager({ languages: ['en'], forceNER: true, nlu: { log: false } });
    this.trained = false;
    this.trainingData = [
      // greeting
      { intent: 'greeting',       utterances: ['hi', 'hello', 'hey', 'hiya', 'howdy', 'good morning', 'good evening', 'good afternoon', 'yo', 'sup', 'start', '/start', 'help me order'] },
      // show_menu
      { intent: 'show_menu',      utterances: ['menu', 'show menu', 'what do you have', 'what can I order', 'what food do you have', 'show me the food', "what's available", 'I am hungry', "I'm hungry", 'food options', 'see the menu', 'view menu', 'what do you serve', 'what are you serving', 'show food', 'list items', 'list menu', 'what do you sell'] },
      // add_item
      { intent: 'add_item',       utterances: ['I want pizza', 'give me biryani', 'I would like pasta', 'get me a burger', 'I want to order chicken', 'can I have the pizza', 'add pizza to cart', 'order biryani', 'one biryani please', '2 burgers', 'I will have the pasta', 'add lassi', 'get me ice cream', 'I want coke', 'add a brownie', 'one lassi'] },
      // view_cart
      { intent: 'view_cart',      utterances: ['my cart', 'view cart', 'show cart', "what's in my cart", 'my basket', 'my bag', 'cart', 'basket', 'show my order', 'what have I ordered', 'review cart', 'check cart'] },
      // checkout
      { intent: 'checkout',       utterances: ['checkout', 'check out', 'place order', 'buy now', 'pay', "I'm done ordering", 'done ordering', 'proceed to pay', 'proceed to checkout', 'place my order', 'finalize order', 'submit order'] },
      // confirm_order
      { intent: 'confirm_order',  utterances: ['confirm', 'yes', 'yes please', 'confirm order', 'go ahead', 'proceed', 'ok', 'okay', 'sure', 'yeah', 'yep', 'correct', 'that is right', 'sounds good', 'looks good', 'approve'] },
      // cancel
      { intent: 'cancel',         utterances: ['cancel', 'no', 'nope', 'stop', 'abort', 'clear cart', 'remove all', 'empty cart', 'never mind', 'forget it', 'cancel order', 'I changed my mind', "don't want it", 'quit', 'exit'] },
      // track_order
      { intent: 'track_order',    utterances: ['where is my order', 'track my order', 'order status', 'where is my food', 'how long', 'when will it arrive', 'is my order on the way', 'delivery status', 'check status', 'track', 'wheres my food'] },
      // order_history
      { intent: 'order_history',  utterances: ['my orders', 'past orders', 'order history', 'previous orders', 'what have I ordered before', 'show my orders', 'recent orders', 'my past orders'] },
      // item_price
      { intent: 'item_price',     utterances: ['how much is pizza', 'price of biryani', 'cost of pasta', 'how much does the burger cost', 'what does biryani cost', 'price list', 'how expensive is', 'what is the price'] },
      // add_more
      { intent: 'add_more',       utterances: ['add more', 'more items', 'continue shopping', 'back to menu', 'more food', 'back', 'more', 'continue', 'add another item', 'shop more'] },
      // help
      { intent: 'help',           utterances: ['help', 'how does this work', 'how to order', 'what can you do', 'instructions', 'guide me', 'commands', 'how to use'] },
    ];
    this.initDocs();
  }

  initDocs() {
    for (const { intent, utterances } of this.trainingData) {
      for (const utt of utterances) {
        this.manager.addDocument('en', utt, intent);
      }
    }
  }

  async train(menuItems = []) {
    if (menuItems.length > 0) {
      for (const item of menuItems) {
        const variants = [item.name.toLowerCase()];
        item.name.split(' ').forEach(word => {
          if (word.length > 3) variants.push(word.toLowerCase());
        });
        this.manager.addNamedEntityText('menu_item', item.id, ['en'], variants);
      }
    }

    await this.manager.train();
    this.trained = true;
    console.log(`🧠 NLP trained: ${this.trainingData.length} intents, ${menuItems.length} menu entities`);
  }

  async classifyMessage(text) {
    if (!this.trained) return { intent: 'unknown', score: 0 };

    const result = await this.manager.process('en', text.toLowerCase().trim());
    const intent = result.intent || 'unknown';
    const score = result.score || 0;

    const menuEntity = result.entities?.find(e => e.entity === 'menu_item');
    const menuItemId = menuEntity?.option || null;

    const numEntity = result.entities?.find(e => e.entity === 'number');
    const quantity = numEntity ? parseInt(numEntity.resolution?.value || '1') : 1;

    return { intent, score, menuItemId, quantity, entities: result.entities || [] };
  }
}

module.exports = new NlpService();
