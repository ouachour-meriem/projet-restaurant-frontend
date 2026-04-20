require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");

const requireAuth = require("./middleware/requireAuth");
const authRoutes = require("./routes/auth");
const customersRoutes = require("./routes/customers");
const ordersRoutes = require("./routes/orders");
const usersRoutes = require("./routes/users");
const rolesRoutes = require("./routes/roles");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_session_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  })
);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.locals.apiUrl = process.env.API_URL || "http://localhost:3002";

app.use((req, res, next) => {
  res.locals.currentPath = req.path || "";
  res.locals.isLoggedIn = !!(req.session && req.session.token);
  res.locals.currentUser = req.session && req.session.user ? req.session.user : null;
  if (req.session && req.session.flash) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
  }
  next();
});

app.get("/", (req, res) => {
  res.render("index", { title: "Accueil", apiUrl: app.locals.apiUrl });
});

app.use("/", authRoutes);

app.use("/customers", requireAuth, customersRoutes);
app.use("/orders", requireAuth, ordersRoutes);
app.use("/users", requireAuth, usersRoutes);
app.use("/roles", requireAuth, rolesRoutes);

app.listen(PORT, () => {
  console.log(`Frontend EJS : http://localhost:${PORT}`);
  console.log(`API backend (référence) : ${app.locals.apiUrl}`);
});
