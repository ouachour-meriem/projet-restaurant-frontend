const express = require("express");
const { apiClient, formatApiError } = require("../lib/api");

const router = express.Router();

async function fetchCustomersForSelect(req) {
  const client = apiClient(req);
  const r = await client.get("/customers", { params: { page: 1, limit: 100 } });
  if (r.status !== 200 || !r.data) return [];

  const d = r.data;
  const tryArrays = [d.data, d.rows, d.results, d.items, d.customers, Array.isArray(d) ? d : null];
  for (const arr of tryArrays) {
    if (Array.isArray(arr)) return arr;
  }
  if (d.data && Array.isArray(d.data.rows)) return d.data.rows;
  return [];
}

function toIso8601(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString();
}

router.get("/", async (req, res) => {
  try {
    const client = apiClient(req);
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const customer_name = req.query.customer_name ? String(req.query.customer_name).trim() : "";
    const status = req.query.status;
    const params = { page, limit };
    if (status) params.status = status;

    const r = await client.get("/orders", { params });
    if (r.status === 401) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    if (r.status !== 200) {
      req.session.flash = { type: "danger", message: formatApiError(r.data) };
      return res.render("orders/index", {
        title: "Commandes",
        orders: [],
        pagination: null,
        query: req.query
      });
    }
    let orders = r.data.data || [];
    if (customer_name) {
      const needle = customer_name.toLowerCase();
      orders = orders.filter((o) => {
        const first = o && o.customer && o.customer.first_name ? String(o.customer.first_name) : "";
        const last = o && o.customer && o.customer.last_name ? String(o.customer.last_name) : "";
        const full = `${first} ${last}`.trim().toLowerCase();
        return full.includes(needle);
      });
    }
    return res.render("orders/index", {
      title: "Commandes",
      orders,
      pagination: r.data.pagination,
      query: req.query
    });
  } catch (err) {
    req.session.flash = { type: "danger", message: err.message || "Erreur réseau" };
    return res.redirect("/");
  }
});

router.get("/new", async (req, res) => {
  let customers = [];
  let loadWarning = null;
  try {
    customers = await fetchCustomersForSelect(req);
    if (!customers.length) {
      // Fallback: build customer list from orders endpoint includes
      const client = apiClient(req);
      const ro = await client.get("/orders", { params: { page: 1, limit: 100 } });
      if (ro.status === 200 && ro.data) {
        const orders = Array.isArray(ro.data.data) ? ro.data.data : [];
        const byId = new Map();
        for (const o of orders) {
          if (o && o.customer && o.customer.id != null) {
            byId.set(o.customer.id, {
              id: o.customer.id,
              first_name: o.customer.first_name || "",
              last_name: o.customer.last_name || ""
            });
          }
        }
        customers = Array.from(byId.values());
      }
    }
  } catch {
    loadWarning = "Impossible de charger les clients depuis l’API.";
  }
  return res.render("orders/create", {
    title: "Nouvelle commande",
    customers,
    body: {},
    fieldErrors: {},
    loadWarning
  });
});

router.post("/", async (req, res) => {
  const { customer_id, status, total_amount, order_date } = req.body;
  const fieldErrors = {};

  if (!customer_id || String(customer_id).trim() === "") {
    fieldErrors.customer_id = "Le client est obligatoire.";
  }
  if (!status || !String(status).trim()) {
    fieldErrors.status = "Le statut est obligatoire.";
  }
  if (!order_date || !String(order_date).trim()) {
    fieldErrors.order_date = "La date de commande est obligatoire.";
  }
  if (total_amount === undefined || total_amount === null || String(total_amount).trim() === "") {
    fieldErrors.total_amount = "Le montant total est obligatoire.";
  }

  if (Object.keys(fieldErrors).length) {
    let customers = [];
    let loadWarning = null;
    try {
      customers = await fetchCustomersForSelect(req);
    } catch {
      loadWarning = "Impossible de charger les clients depuis l’API.";
    }
    return res.status(422).render("orders/create", {
      title: "Nouvelle commande",
      customers,
      body: req.body,
      fieldErrors,
      loadWarning
    });
  }

  const client = apiClient(req);
  const r = await client.post("/orders", {
    customer_id: parseInt(customer_id, 10),
    status: String(status).trim(),
    total_amount: parseFloat(String(total_amount).replace(",", ".")),
    order_date: toIso8601(order_date)
  });

  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 201) {
    req.session.flash = { type: "success", message: "Commande créée avec succès." };
    return res.redirect("/orders");
  }

  let customers = [];
  let loadWarning = null;
  try {
    customers = await fetchCustomersForSelect(req);
  } catch {
    loadWarning = "Impossible de charger les clients depuis l’API.";
  }
  const fe = { ...fieldErrors };
  const apiErrs = r.data && r.data.errors;
  if (Array.isArray(apiErrs)) {
    for (const e of apiErrs) {
      const p = e.path || e.param;
      if (p && typeof p === "string") fe[p] = e.msg || e.message;
    }
  }
  return res.status(r.status >= 400 ? r.status : 400).render("orders/create", {
    title: "Nouvelle commande",
    customers,
    body: req.body,
    fieldErrors: fe,
    error: formatApiError(r.data),
    loadWarning
  });
});

router.get("/:id/edit", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/orders");
  }
  const client = apiClient(req);
  const r = await client.get(`/orders/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 404) {
    req.session.flash = { type: "danger", message: "Commande introuvable." };
    return res.redirect("/orders");
  }
  if (r.status !== 200) {
    req.session.flash = { type: "danger", message: formatApiError(r.data) };
    return res.redirect("/orders");
  }
  const order = r.data.data;
  let customers = [];
  try {
    customers = await fetchCustomersForSelect(req);
  } catch {
    customers = [];
  }

  let orderDateLocal = "";
  if (order.order_date) {
    const d = new Date(order.order_date);
    if (!Number.isNaN(d.getTime())) {
      const pad = (n) => String(n).padStart(2, "0");
      orderDateLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }

  return res.render("orders/edit", {
    title: "Modifier la commande",
    order,
    customers,
    orderDateLocal,
    body: {},
    fieldErrors: {}
  });
});

router.post("/:id/update", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/orders");
  }

  const { customer_id, status, total_amount, order_date } = req.body;
  const fieldErrors = {};

  if (!customer_id || String(customer_id).trim() === "") {
    fieldErrors.customer_id = "Le client est obligatoire.";
  }
  if (!status || !String(status).trim()) {
    fieldErrors.status = "Le statut est obligatoire.";
  }
  if (!order_date || !String(order_date).trim()) {
    fieldErrors.order_date = "La date de commande est obligatoire.";
  }
  if (total_amount === undefined || total_amount === null || String(total_amount).trim() === "") {
    fieldErrors.total_amount = "Le montant total est obligatoire.";
  }

  const client = apiClient(req);

  const reloadEdit = async (statusCode, apiErrPayload) => {
    const r0 = await client.get(`/orders/${id}`);
    const order = r0.data && r0.data.data;
    let customers = [];
    try {
      customers = await fetchCustomersForSelect(req);
    } catch {
      customers = [];
    }
    let orderDateLocal = "";
    if (order && order.order_date) {
      const d = new Date(order.order_date);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n) => String(n).padStart(2, "0");
        orderDateLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    return res.status(statusCode).render("orders/edit", {
      title: "Modifier la commande",
      order,
      customers,
      orderDateLocal,
      body: { ...req.body, id },
      fieldErrors,
      error: apiErrPayload ? formatApiError(apiErrPayload) : undefined
    });
  };

  if (Object.keys(fieldErrors).length) {
    return reloadEdit(422, null);
  }

  const payload = {
    customer_id: parseInt(customer_id, 10),
    status: String(status).trim(),
    total_amount: parseFloat(String(total_amount).replace(",", ".")),
    order_date: toIso8601(order_date)
  };

  const r = await client.put(`/orders/${id}`, payload);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 200 || r.status === 204) {
    req.session.flash = { type: "success", message: "Commande mise à jour." };
    return res.redirect("/orders");
  }
  if (r.status === 404) {
    req.session.flash = {
      type: "warning",
      message:
        "L’API ne propose pas encore la mise à jour (PUT /orders/:id). Demandez au groupe backend d’ajouter cette route."
    };
    return res.redirect("/orders");
  }

  const fe = { ...fieldErrors };
  const apiErrs = r.data && r.data.errors;
  if (Array.isArray(apiErrs)) {
    for (const e of apiErrs) {
      const p = e.path || e.param;
      if (p && typeof p === "string") fe[p] = e.msg || e.message;
    }
  }
  return reloadEdit(r.status >= 400 ? r.status : 400, r.data);
});

router.post("/:id/delete", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/orders");
  }
  const client = apiClient(req);
  const r = await client.delete(`/orders/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 200 || r.status === 204) {
    req.session.flash = { type: "success", message: "Commande supprimée." };
    return res.redirect("/orders");
  }
  if (r.status === 404) {
    req.session.flash = {
      type: "warning",
      message:
        "L’API ne propose pas encore la suppression (DELETE /orders/:id). Demandez au groupe backend d’ajouter cette route."
    };
    return res.redirect("/orders");
  }
  req.session.flash = { type: "danger", message: formatApiError(r.data) };
  return res.redirect("/orders");
});

module.exports = router;
