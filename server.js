require("dotenv").config();
const express = require("express");
const sequelize = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API restaurant operationnelle",
    status: "ok"
  });
});

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
