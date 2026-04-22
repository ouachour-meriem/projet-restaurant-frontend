const express = require("express");
const { apiClient, formatApiError } = require("../lib/api");

const router = express.Router();

/**
 * Même idée que les commandes : l’API renvoie souvent { data: [...], pagination }.
 * On accepte aussi d’autres formes (Sequelize, alias, etc.).
 */
function extractPaymentsList(resp) {
  if (!resp || resp.status !== 200 || !resp.data) return [];
  const d = resp.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.data)) return d.data;
  const tryArrays = [
    d.payments,
    d.rows,
    d.results,
    d.items,
    d.list,
    Array.isArray(d.payload) ? d.payload : null
  ];
  for (const a of tryArrays) {
    if (Array.isArray(a)) return a;
  }
  if (d.data && typeof d.data === "object" && !Array.isArray(d.data)) {
    const inner = d.data;
    if (Array.isArray(inner.rows)) return inner.rows;
    if (Array.isArray(inner.payments)) return inner.payments;
    if (Array.isArray(inner.data)) return inner.data;
  }
  return [];
}

async function fetchOrdersForSelect(req) {
  const client = apiClient(req);
  const r = await client.get("/orders", { params: { page: 1, limit: 100 } });
  if (r.status === 401) {
    return { orders: [], loadWarning: null, unauthorized: true };
  }
  if (r.status !== 200 || !r.data) {
    return {
      orders: [],
      loadWarning: formatApiError(r.data, r.status),
      unauthorized: false
    };
  }
  const d = r.data;
  const tryArrays = [d.data, d.orders, d.rows, Array.isArray(d) ? d : null];
  for (const arr of tryArrays) {
    if (Array.isArray(arr)) return { orders: arr, loadWarning: null, unauthorized: false };
  }
  if (d.data && Array.isArray(d.data.rows)) {
    return { orders: d.data.rows, loadWarning: null, unauthorized: false };
  }
  return { orders: [], loadWarning: null, unauthorized: false };
}

function toIso8601(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString();
}

function parseAmount(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return NaN;
  return parseFloat(String(raw).replace(",", ".").replace(/^\s*\$\s*/, ""));
}

function paymentDateLocalValue(payment) {
  if (!payment || !payment.payment_date) return "";
  const d = new Date(payment.payment_date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

router.get("/", async (req, res) => {
  try {
    const client = apiClient(req);
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const r = await client.get("/payments", { params: { page, limit } });
    if (r.status === 401) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    if (r.status !== 200) {
      return res.render("payments/index", {
        title: "Payments",
        payments: [],
        pagination: null,
        stats: { totalRevenue: 0, pendingCount: 0, totalTransactions: 0 },
        query: req.query,
        flash: { type: "danger", message: formatApiError(r.data, r.status) }
      });
    }
    const payments = extractPaymentsList(r);
    const pagination = (r.data && r.data.pagination) || null;
    const totalTx =
      pagination && pagination.total != null ? Number(pagination.total) : payments.length;
    let totalRevenue = 0;
    let pendingCount = 0;
    for (const p of payments) {
      const st = String(p && p.status).toLowerCase();
      const amt = Number(p && p.amount);
      if (st.includes("complet") || st === "completed") {
        if (Number.isFinite(amt)) totalRevenue += amt;
      }
      if (st.includes("pend") || st === "pending") pendingCount += 1;
    }
    return res.render("payments/index", {
      title: "Payments",
      payments,
      pagination,
      stats: {
        totalRevenue,
        pendingCount,
        totalTransactions: Number.isFinite(totalTx) ? totalTx : payments.length
      },
      query: req.query
    });
  } catch (err) {
    req.session.flash = { type: "danger", message: err.message || "Erreur réseau" };
    return res.redirect("/");
  }
});

router.get("/new", async (req, res) => {
  let orders = [];
  let loadWarning = null;
  try {
    const o = await fetchOrdersForSelect(req);
    if (o.unauthorized) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    orders = o.orders;
    loadWarning = o.loadWarning;
  } catch {
    loadWarning = "Impossible de charger les commandes depuis l’API.";
  }
  return res.render("payments/create", {
    title: "New payment",
    orders,
    body: {},
    fieldErrors: {},
    loadWarning
  });
});

router.post("/", async (req, res) => {
  const { order_id, amount, payment_method, payment_date, status } = req.body;
  const fieldErrors = {};

  if (!order_id || String(order_id).trim() === "") {
    fieldErrors.order_id = "La commande est obligatoire.";
  }
  if (!payment_method || !String(payment_method).trim()) {
    fieldErrors.payment_method = "Le moyen de paiement est obligatoire.";
  }
  if (!status || !String(status).trim()) {
    fieldErrors.status = "Le statut est obligatoire.";
  }
  if (amount === undefined || amount === null || String(amount).trim() === "") {
    fieldErrors.amount = "Le montant est obligatoire.";
  } else {
    const n = parseAmount(amount);
    if (!Number.isFinite(n) || n <= 0) {
      fieldErrors.amount = "Indiquez un montant valide strictement supérieur à 0.";
    }
  }
  if (!payment_date || !String(payment_date).trim()) {
    fieldErrors.payment_date = "La date et l’heure sont obligatoires.";
  }

  if (Object.keys(fieldErrors).length) {
    let orders = [];
    let loadWarning = null;
    try {
      const o = await fetchOrdersForSelect(req);
      if (o.unauthorized) {
        req.session.destroy(() => res.redirect("/login"));
        return;
      }
      orders = o.orders;
      loadWarning = o.loadWarning;
    } catch {
      loadWarning = "Impossible de charger les commandes depuis l’API.";
    }
    return res.status(422).render("payments/create", {
      title: "New payment",
      orders,
      body: req.body,
      fieldErrors,
      loadWarning
    });
  }

  const client = apiClient(req);
  const r = await client.post("/payments", {
    order_id: parseInt(order_id, 10),
    amount: parseAmount(amount),
    payment_method: String(payment_method).trim(),
    payment_date: toIso8601(payment_date),
    status: String(status).trim()
  });

  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 201) {
    req.session.flash = { type: "success", message: "Paiement créé avec succès." };
    return res.redirect("/payments");
  }

  let orders = [];
  let loadWarning = null;
  try {
    const o = await fetchOrdersForSelect(req);
    if (o.unauthorized) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    orders = o.orders;
    loadWarning = o.loadWarning;
  } catch {
    loadWarning = "Impossible de charger les commandes depuis l’API.";
  }
  const fe = { ...fieldErrors };
  const apiErrs = r.data && r.data.errors;
  if (Array.isArray(apiErrs)) {
    for (const e of apiErrs) {
      const p = e.path || e.param;
      if (p && typeof p === "string") fe[p] = e.msg || e.message;
    }
  }
  return res.status(r.status >= 400 ? r.status : 400).render("payments/create", {
    title: "New payment",
    orders,
    body: req.body,
    fieldErrors: fe,
    error: formatApiError(r.data, r.status),
    loadWarning
  });
});

router.get("/:id/edit", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/payments");
  }
  const client = apiClient(req);
  const r = await client.get(`/payments/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 404) {
    req.session.flash = { type: "danger", message: "Paiement introuvable." };
    return res.redirect("/payments");
  }
  if (r.status !== 200) {
    req.session.flash = { type: "danger", message: formatApiError(r.data, r.status) };
    return res.redirect("/payments");
  }
  const payment = r.data.data || r.data.payment || r.data;
  let orders = [];
  let loadWarning = null;
  try {
    const o = await fetchOrdersForSelect(req);
    if (o.unauthorized) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    orders = o.orders;
    loadWarning = o.loadWarning;
  } catch {
    orders = [];
  }
  const paymentDateLocal = paymentDateLocalValue(payment);

  return res.render("payments/edit", {
    title: "Edit payment",
    payment,
    orders,
    paymentDateLocal,
    body: {},
    fieldErrors: {},
    loadWarning
  });
});

router.post("/:id/update", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/payments");
  }

  const { order_id, amount, payment_method, payment_date, status } = req.body;
  const fieldErrors = {};

  if (!order_id || String(order_id).trim() === "") {
    fieldErrors.order_id = "La commande est obligatoire.";
  }
  if (!payment_method || !String(payment_method).trim()) {
    fieldErrors.payment_method = "Le moyen de paiement est obligatoire.";
  }
  if (!status || !String(status).trim()) {
    fieldErrors.status = "Le statut est obligatoire.";
  }
  if (amount === undefined || amount === null || String(amount).trim() === "") {
    fieldErrors.amount = "Le montant est obligatoire.";
  } else {
    const n = parseAmount(amount);
    if (!Number.isFinite(n) || n <= 0) {
      fieldErrors.amount = "Indiquez un montant valide strictement supérieur à 0.";
    }
  }
  if (!payment_date || !String(payment_date).trim()) {
    fieldErrors.payment_date = "La date et l’heure sont obligatoires.";
  }

  const client = apiClient(req);

  const reloadEdit = async (statusCode, apiErrPayload, apiStatus) => {
    const r0 = await client.get(`/payments/${id}`);
    const payment = r0.data && (r0.data.data || r0.data.payment || r0.data);
    let orders = [];
    let loadWarning = null;
    try {
      const o = await fetchOrdersForSelect(req);
      if (o.unauthorized) {
        req.session.destroy(() => res.redirect("/login"));
        return;
      }
      orders = o.orders;
      loadWarning = o.loadWarning;
    } catch {
      orders = [];
    }
    const paymentDateLocal = paymentDateLocalValue(payment);
    return res.status(statusCode).render("payments/edit", {
      title: "Edit payment",
      payment,
      orders,
      paymentDateLocal,
      body: { ...req.body, id },
      fieldErrors,
      error: apiErrPayload ? formatApiError(apiErrPayload, apiStatus) : undefined,
      loadWarning
    });
  };

  if (Object.keys(fieldErrors).length) {
    return reloadEdit(422, null);
  }

  const payload = {
    order_id: parseInt(order_id, 10),
    amount: parseAmount(amount),
    payment_method: String(payment_method).trim(),
    payment_date: toIso8601(payment_date),
    status: String(status).trim()
  };

  const r = await client.put(`/payments/${id}`, payload);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 200 || r.status === 204) {
    req.session.flash = { type: "success", message: "Paiement mis à jour." };
    return res.redirect("/payments");
  }
  if (r.status === 404) {
    req.session.flash = {
      type: "warning",
      message:
        "L’API ne propose peut‑être pas encore la mise à jour (PUT /payments/:id). Demandez au groupe backend d’ajouter cette route."
    };
    return res.redirect("/payments");
  }

  const fe = { ...fieldErrors };
  const apiErrs = r.data && r.data.errors;
  if (Array.isArray(apiErrs)) {
    for (const e of apiErrs) {
      const p = e.path || e.param;
      if (p && typeof p === "string") fe[p] = e.msg || e.message;
    }
  }
  return reloadEdit(r.status >= 400 ? r.status : 400, r.data, r.status);
});

router.post("/:id/delete", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/payments");
  }
  const client = apiClient(req);
  const r = await client.delete(`/payments/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 200 || r.status === 204) {
    req.session.flash = { type: "success", message: "Paiement supprimé." };
    return res.redirect("/payments");
  }
  if (r.status === 404) {
    req.session.flash = {
      type: "warning",
      message:
        "L’API ne propose peut‑être pas encore la suppression (DELETE /payments/:id). Demandez au groupe backend d’ajouter cette route."
    };
    return res.redirect("/payments");
  }
  req.session.flash = { type: "danger", message: formatApiError(r.data, r.status) };
  return res.redirect("/payments");
});

module.exports = router;
