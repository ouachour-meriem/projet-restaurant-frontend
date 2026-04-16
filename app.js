require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const axios = require("axios");

const { getApiUrl } = require("./lib/api");
const requireAuth = require("./middleware/requireAuth");
const customersRoutes = require("./routes/customers");
const ordersRoutes = require("./routes/orders");

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

app.get("/login", (req, res) => {
  const redirect = req.query.redirect || "/customers";
  res.render("login", {
    title: "Connexion",
    error: null,
    email: "",
    redirect
  });
});

app.post("/login", async (req, res) => {
  const apiUrl = getApiUrl();
  try {
    const r = await axios.post(`${apiUrl}/auth/login`, {
      email: req.body.email,
      password: req.body.password
    });
    req.session.token = r.data.token;
    req.session.user = r.data.user;
    let red = req.body.redirect || "/customers";
    if (typeof red !== "string" || !red.startsWith("/")) {
      red = "/customers";
    }
    return res.redirect(red);
  } catch (e) {
    const msg =
      e.response && e.response.data && e.response.data.message
        ? e.response.data.message
        : "Connexion impossible.";
    return res.render("login", {
      title: "Connexion",
      error: msg,
      email: req.body.email || "",
      redirect: req.body.redirect || "/customers"
    });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

app.use("/customers", requireAuth, customersRoutes);
app.use("/orders", requireAuth, ordersRoutes);

app.listen(PORT, () => {
  console.log(`Frontend EJS : http://localhost:${PORT}`);
  console.log(`API backend (référence) : ${app.locals.apiUrl}`);
});
