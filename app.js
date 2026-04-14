require("dotenv").config();
const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.locals.apiUrl = process.env.API_URL || "http://localhost:3002";

app.get("/", (req, res) => {
  res.render("index", { title: "Accueil" });
});

app.get("/login", (req, res) => {
  res.render("login", { title: "Connexion" });
});

app.listen(PORT, () => {
  console.log(`Frontend EJS : http://localhost:${PORT}`);
  console.log(`API backend (référence) : ${app.locals.apiUrl}`);
});
