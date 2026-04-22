require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");

const requireAuth = require("./middleware/requireAuth");
const { requireRole, isAdmin } = require("./middleware/requireRole");
const { apiClient } = require("./lib/api");
const authRoutes = require("./routes/auth");
const customersRoutes = require("./routes/customers");
const ordersRoutes = require("./routes/orders");
const usersRoutes = require("./routes/users");
const rolesRoutes = require("./routes/roles");
const categoriesRoutes = require("./routes/categories");
const productsRoutes = require("./routes/products");
const paymentsRoutes = require("./routes/payments");
const orderItemsRoutes = require("./routes/orderItems");

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
  res.locals.isAdmin = isAdmin(res.locals.currentUser);
  if (req.session && req.session.flash) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
  }
  next();
});

function extractOrdersList(resp) {
  if (!resp || resp.status !== 200 || !resp.data) return [];
  const d = resp.data;
  const tryArrays = [d.data, d.orders, d.rows, Array.isArray(d) ? d : null];
  for (const a of tryArrays) {
    if (Array.isArray(a)) return a;
  }
  if (d.data && Array.isArray(d.data.rows)) return d.data.rows;
  return [];
}

function extractCustomersList(resp) {
  if (!resp || resp.status !== 200 || !resp.data) return [];
  const d = resp.data;
  if (Array.isArray(d.data)) return d.data;
  return [];
}

function extractProductsList(resp) {
  if (!resp || resp.status !== 200 || !resp.data) return [];
  const d = resp.data;
  const tryArrays = [d.data, d.products, d.rows, Array.isArray(d) ? d : null];
  for (const a of tryArrays) {
    if (Array.isArray(a)) return a;
  }
  if (d.data && Array.isArray(d.data.rows)) return d.data.rows;
  return [];
}

function totalFromListResponse(resp, listLen) {
  if (!resp || resp.status !== 200 || !resp.data) return listLen;
  const d = resp.data;
  if (d.pagination && d.pagination.total != null) return d.pagination.total;
  if (d.total != null) return d.total;
  return listLen;
}

app.get("/", async (req, res) => {
  const base = { title: "Accueil", apiUrl: app.locals.apiUrl };
  if (!req.session || !req.session.token) {
    return res.render("index", base);
  }
  const dashboard = {
    revenue: null,
    customersCount: null,
    ordersCount: null,
    productsCount: null,
    recentOrders: []
  };
  try {
    const client = apiClient(req);
    const [ro, rc, rp] = await Promise.all([
      client.get("/orders", { params: { page: 1, limit: 100 } }),
      client.get("/customers", { params: { page: 1, limit: 100 } }),
      client.get("/products", { params: { page: 1, limit: 100 } })
    ]);
    const orders = extractOrdersList(ro);
    const customers = extractCustomersList(rc);
    const products = extractProductsList(rp);
    let revenue = 0;
    for (const o of orders) {
      const x = Number(o && o.total_amount);
      if (Number.isFinite(x)) revenue += x;
    }
    if (ro.status === 200) dashboard.revenue = revenue;
    if (rc.status === 200) dashboard.customersCount = totalFromListResponse(rc, customers.length);
    if (ro.status === 200) dashboard.ordersCount = totalFromListResponse(ro, orders.length);
    if (rp.status === 200) dashboard.productsCount = totalFromListResponse(rp, products.length);
    dashboard.recentOrders = ro.status === 200 ? orders.slice(0, 5) : [];
  } catch (_e) {
    /* valeurs par défaut ci-dessus */
  }
  return res.render("index", { ...base, dashboard });
});

app.use("/", authRoutes);

app.use("/customers", requireRole(["admin"]), customersRoutes);
app.use("/orders", requireAuth, ordersRoutes);
app.use("/users", requireRole(["admin"]), usersRoutes);
app.use("/roles", requireRole(["admin"]), rolesRoutes);
app.use("/categories", requireAuth, categoriesRoutes);
app.use("/products", requireAuth, productsRoutes);
app.use("/payments", requireRole(["admin"]), paymentsRoutes);
app.use("/order-items", requireRole(["admin"]), orderItemsRoutes);

app.listen(PORT, () => {
  console.log(`Frontend EJS : http://localhost:${PORT}`);
  console.log(`API backend (référence) : ${app.locals.apiUrl}`);
});
