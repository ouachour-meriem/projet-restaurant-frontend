const Customer = require("./customer");
const Order = require("./order");
const Category = require("./category");
const Product = require("./product");
const OrderItem = require("./orderItem");
const Payment = require("./payment");
const Role = require("./role");
const User = require("./user");
const CustomerFavorite = require("./customerFavorite");

Customer.hasMany(Order, { foreignKey: "customer_id", as: "orders" });
Order.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });

Order.hasMany(OrderItem, { foreignKey: "order_id", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "order_id", as: "order" });

Category.hasMany(Product, { foreignKey: "category_id", as: "products" });
Product.belongsTo(Category, { foreignKey: "category_id", as: "category" });

Product.hasMany(OrderItem, { foreignKey: "product_id", as: "orderItems" });
OrderItem.belongsTo(Product, { foreignKey: "product_id", as: "product" });

Order.hasMany(Payment, { foreignKey: "order_id", as: "payments" });
Payment.belongsTo(Order, { foreignKey: "order_id", as: "order" });

Role.hasMany(User, { foreignKey: "role_id", as: "users" });
User.belongsTo(Role, { foreignKey: "role_id", as: "role" });

User.hasOne(Customer, { foreignKey: "user_id", as: "customerProfile" });
Customer.belongsTo(User, { foreignKey: "user_id", as: "user" });

User.belongsToMany(Product, {
  through: CustomerFavorite,
  foreignKey: "user_id",
  otherKey: "product_id",
  as: "favoriteProducts"
});

Product.belongsToMany(User, {
  through: CustomerFavorite,
  foreignKey: "product_id",
  otherKey: "user_id",
  as: "favoritedByUsers"
});

module.exports = {
  Customer,
  Order,
  Category,
  Product,
  OrderItem,
  Payment,
  Role,
  User,
  CustomerFavorite
};
