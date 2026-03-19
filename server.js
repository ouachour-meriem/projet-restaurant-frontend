require("dotenv").config();
const express = require("express");
const sequelize = require("./config/database");
const Order = require("./models/order");
const Product = require("./models/product");
const OrderItem = require("./models/orderItem");
const Payment = require("./models/payment");
const Role = require("./models/role");
const User = require("./models/user");
const orderItemsRoutes = require("./routes/orderItems");
const paymentsRoutes = require("./routes/payments");
const usersRoutes = require("./routes/users");
const rolesRoutes = require("./routes/roles");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3001;

Order.hasMany(OrderItem, { foreignKey: "order_id", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "order_id", as: "order" });
Product.hasMany(OrderItem, { foreignKey: "product_id", as: "orderItems" });
OrderItem.belongsTo(Product, { foreignKey: "product_id", as: "product" });
Order.hasMany(Payment, { foreignKey: "order_id", as: "payments" });
Payment.belongsTo(Order, { foreignKey: "order_id", as: "order" });
Role.hasMany(User, { foreignKey: "role_id", as: "users" });
User.belongsTo(Role, { foreignKey: "role_id", as: "role" });

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API restaurant operationnelle",
    status: "ok"
  });
});

app.use("/order-items", orderItemsRoutes);
app.use("/payments", paymentsRoutes);
app.use("/users", usersRoutes);
app.use("/roles", rolesRoutes);
app.use("/auth", authRoutes);

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
  const maxAttempts = 10;
  const delayMs = 1500;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await sequelize.authenticate();
      console.log("Connexion MySQL reussie");

      const server = app.listen(PORT, () => {
        console.log(`Serveur demarre sur http://localhost:${PORT}`);
      });

      server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.error(
            `Le port ${PORT} est deja utilise : un autre serveur tourne deja (autre terminal, autre fenetre Cursor, etc.).`
          );
          console.error(
            "Arretez-le avec Ctrl+C, ou tuez le process (PowerShell) :"
          );
          console.error(
            `  Get-NetTCPConnection -LocalPort ${PORT} | Select-Object OwningProcess`
          );
          console.error(`  Stop-Process -Id <PID> -Force`);
          console.error("Ou changez PORT dans votre fichier .env.");
          process.exit(1);
        }
        throw err;
      });

      return;
    } catch (error) {
      console.error(
        `Echec connexion DB (tentative ${attempt}/${maxAttempts}) :`,
        error.message
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error("Impossible de se connecter a la DB apres plusieurs tentatives.");
  process.exit(1);
}

startServer();
