require("dotenv").config();
const express = require("express");
const sequelize = require("./config/database");
const Order = require("./models/order");
const Product = require("./models/product");
const OrderItem = require("./models/orderItem");
const Payment = require("./models/payment");
const orderItemsRoutes = require("./routes/orderItems");
const paymentsRoutes = require("./routes/payments");

const app = express();
const PORT = process.env.PORT || 3001;

Order.hasMany(OrderItem, { foreignKey: "order_id", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "order_id", as: "order" });
Product.hasMany(OrderItem, { foreignKey: "product_id", as: "orderItems" });
OrderItem.belongsTo(Product, { foreignKey: "product_id", as: "product" });
Order.hasMany(Payment, { foreignKey: "order_id", as: "payments" });
Payment.belongsTo(Order, { foreignKey: "order_id", as: "order" });

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API restaurant operationnelle",
    status: "ok"
  });
});

app.use("/order-items", orderItemsRoutes);
app.use("/payments", paymentsRoutes);

app.get("/health/db", async (req, res) => {
  try {
    await sequelize.authenticate();
    return res.json({ status: "ok", database: "connected" });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      database: "disconnected",
      message: error.message
    });
  }
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Connexion MySQL reussie");
    app.listen(PORT, () => {
      console.log(`Serveur demarre sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Echec connexion DB au demarrage:", error.message);
    process.exit(1);
  }
}

startServer();
