require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");
require("./models/associations");
const orderItemsRoutes = require("./routes/orderItems");
const paymentsRoutes = require("./routes/payments");
const usersRoutes = require("./routes/users");
const rolesRoutes = require("./routes/roles");
const authRoutes = require("./routes/auth");
const categoriesRoutes = require("./routes/categories");
const productsRoutes = require("./routes/products");
const customersRoutes = require("./routes/customers");
const ordersRoutes = require("./routes/orders");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true
  })
);
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
app.use("/categories", categoriesRoutes);
app.use("/products", productsRoutes);
app.use("/customers", customersRoutes);
app.use("/orders", ordersRoutes);

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
      const detail =
        error?.message ||
        error?.parent?.message ||
        error?.original?.message ||
        String(error);
      console.error(
        `Echec connexion DB (tentative ${attempt}/${maxAttempts}) :`,
        detail
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error("Impossible de se connecter a la DB apres plusieurs tentatives.");
  process.exit(1);
}

startServer();
