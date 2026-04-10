const Customer = require('./Customer');
const Order = require('./Order');
const Rider = require('./Rider');
const { MenuItem, seedMenuIfNeeded } = require('./MenuItem');

module.exports = {
  Customer,
  Order,
  Rider,
  MenuItem,
  seedMenuIfNeeded
};
