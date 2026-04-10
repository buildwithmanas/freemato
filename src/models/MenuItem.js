const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  category: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const MenuItem = mongoose.model('MenuItem', MenuItemSchema);

async function seedMenuIfNeeded() {
  const count = await MenuItem.countDocuments();
  if (count > 0) return;

  const defaultMenu = {
    'Main Course': [
      { id: 'pizza_margherita', name: '🍕 Margherita Pizza', price: 250, description: 'Classic tomato & mozzarella' },
      { id: 'pizza_pepperoni',  name: '🍕 Pepperoni Pizza',  price: 300, description: 'Spicy pepperoni slices' },
      { id: 'pasta_alfredo',    name: '🍝 Pasta Alfredo',    price: 200, description: 'Creamy white sauce pasta' },
      { id: 'burger_classic',   name: '🍔 Classic Burger',   price: 150, description: 'Beef patty with cheese' },
      { id: 'biryani_chicken',  name: '🍛 Chicken Biryani',  price: 280, description: 'Aromatic rice with chicken' }
    ],
    'Beverages': [
      { id: 'coke',         name: '🥤 Coca Cola',          price: 50,  description: 'Chilled soft drink' },
      { id: 'juice_orange', name: '🧃 Fresh Orange Juice', price: 80,  description: 'Freshly squeezed' },
      { id: 'lassi',        name: '🥛 Lassi',              price: 60,  description: 'Sweet yogurt drink' }
    ],
    'Desserts': [
      { id: 'ice_cream',   name: '🍦 Ice Cream',           price: 100, description: 'Vanilla/Chocolate/Strawberry' },
      { id: 'brownie',     name: '🍰 Chocolate Brownie',   price: 120, description: 'Warm with ice cream' },
      { id: 'gulab_jamun', name: '🍮 Gulab Jamun',         price: 80,  description: '2 pieces' }
    ]
  };

  const items = [];
  for (const category in defaultMenu) {
    for (const item of defaultMenu[category]) {
      items.push({ ...item, category });
    }
  }

  await MenuItem.insertMany(items);
  console.log('✅ Default menu seeded to database');
}

module.exports = { MenuItem, seedMenuIfNeeded };
