const express = require("express");
const { apiClient, formatApiError } = require("../lib/api");

const router = express.Router();

function extractOrderItemsList(resp) {
  if (!resp || resp.status !== 200 || !resp.data) return [];
  const d = resp.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.data)) return d.data;
  const tryArrays = [
    d.orderItems,
    d.order_items,
    d.items,
    d.rows,
    d.results,
    Array.isArray(d.payload) ? d.payload : null
  ];
  for (const a of tryArrays) {
    if (Array.isArray(a)) return a;
  }
  if (d.data && typeof d.data === "object" && !Array.isArray(d.data)) {
    const inner = d.data;
    if (Array.isArray(inner.rows)) return inner.rows;
    if (Array.isArray(inner.orderItems)) return inner.orderItems;
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

async function fetchProductsForSelect(req) {
  const client = apiClient(req);
  const r = await client.get("/products", { params: { page: 1, limit: 100 } });
  if (r.status === 401) {
    return { products: [], loadWarning: null, unauthorized: true };
  }
  if (r.status !== 200 || !r.data) {
    return {
      products: [],
      loadWarning: formatApiError(r.data, r.status),
      unauthorized: false
    };
  }
  const d = r.data;
  const tryArrays = [d.data, d.products, d.rows, Array.isArray(d) ? d : null];
  for (const arr of tryArrays) {
    if (Array.isArray(arr)) return { products: arr, loadWarning: null, unauthorized: false };
  }
  if (d.data && Array.isArray(d.data.rows)) {
    return { products: d.data.rows, loadWarning: null, unauthorized: false };
  }
  return { products: [], loadWarning: null, unauthorized: false };
}

function parseUnitPrice(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return NaN;
  return parseFloat(String(raw).replace(",", ".").replace(/^\s*\$\s*/, ""));
}

function parseQuantity(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === "") return NaN;
  return parseInt(String(raw).trim(), 10);
}

function validateOrderItemBody(body) {
  const fieldErrors = {};
  const { order_id, product_id, quantity, price } = body;

  if (!order_id || String(order_id).trim() === "") {
    fieldErrors.order_id = "La commande est obligatoire.";
  }
  if (!product_id || String(product_id).trim() === "") {
    fieldErrors.product_id = "Le produit est obligatoire.";
  }

  if (quantity === undefined || quantity === null || String(quantity).trim() === "") {
    fieldErrors.quantity = "La quantité est obligatoire.";
  } else {
    const q = parseQuantity(quantity);
    if (!Number.isFinite(q) || q < 1) {
      fieldErrors.quantity = "La quantité doit être un entier strictement supérieur à 0.";
    }
  }

  if (price === undefined || price === null || String(price).trim() === "") {
    fieldErrors.price = "Le prix unitaire est obligatoire.";
  } else {
    const p = parseUnitPrice(price);
    if (!Number.isFinite(p) || p <= 0) {
      fieldErrors.price = "Indiquez un prix numérique valide strictement supérieur à 0.";
    }
  }

  return fieldErrors;
}

router.get("/", async (req, res) => {
  try {
    const client = apiClient(req);
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const r = await client.get("/order-items", { params: { page, limit } });
    if (r.status === 401) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    if (r.status !== 200) {
      return res.render("order-items/index", {
        title: "Order Items",
        items: [],
        pagination: null,
        stats: { totalItems: 0, preparing: 0, uniqueProducts: 0 },
        query: req.query,
        flash: { type: "danger", message: formatApiError(r.data, r.status) }
      });
    }
    const items = extractOrderItemsList(r);
    const pagination = (r.data && r.data.pagination) || null;
    const totalListed =
      pagination && pagination.total != null ? Number(pagination.total) : items.length;

    const productIds = new Set();
    let preparing = 0;
    for (const it of items) {
      if (it && it.product_id != null) productIds.add(it.product_id);
      const st = String(it && it.status).toLowerCase();
      if (st.includes("prepar") || st === "pending" || st === "processing") preparing += 1;
    }

    return res.render("order-items/index", {
      title: "Order Items",
      items,
      pagination,
      stats: {
        totalItems: Number.isFinite(totalListed) ? totalListed : items.length,
        preparing,
        uniqueProducts: productIds.size
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
  let products = [];
  let loadWarning = null;
  try {
    const o = await fetchOrdersForSelect(req);
    if (o.unauthorized) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    orders = o.orders;
    const p = await fetchProductsForSelect(req);
    if (p.unauthorized) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    products = p.products;
    const w = [o.loadWarning, p.loadWarning].filter(Boolean).join(" ");
    if (w) loadWarning = w;
  } catch {
    loadWarning = "Impossible de charger les données depuis l’API.";
  }
  return res.render("order-items/create", {
    title: "New order item",
    orders,
    products,
    body: {},
    fieldErrors: {},
    loadWarning
  });
});

router.post("/", async (req, res) => {
  const fieldErrors = validateOrderItemBody(req.body);

  const reloadCreate = async (statusCode, extra) => {
    let orders = [];
    let products = [];
    let loadWarning = null;
    try {
      const o = await fetchOrdersForSelect(req);
      if (o.unauthorized) {
        req.session.destroy(() => res.redirect("/login"));
        return;
      }
      orders = o.orders;
      const p = await fetchProductsForSelect(req);
      if (p.unauthorized) {
        req.session.destroy(() => res.redirect("/login"));
        return;
      }
      products = p.products;
      const w = [o.loadWarning, p.loadWarning].filter(Boolean).join(" ");
      if (w) loadWarning = w;
    } catch {
      loadWarning = "Impossible de charger les données depuis l’API.";
    }
    return res.status(statusCode).render("order-items/create", {
      title: "New order item",
      orders,
      products,
      body: req.body,
      fieldErrors: extra && extra.fieldErrors ? extra.fieldErrors : fieldErrors,
      error: extra && extra.error,
      loadWarning
    });
  };

  if (Object.keys(fieldErrors).length) {
    return reloadCreate(422, { fieldErrors });
  }

  const { order_id, product_id, quantity, price } = req.body;
  const client = apiClient(req);
  const payload = {
    order_id: parseInt(order_id, 10),
    product_id: parseInt(product_id, 10),
    quantity: parseQuantity(quantity),
    price: parseUnitPrice(price)
  };

  const r = await client.post("/order-items", payload);

  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 201) {
    req.session.flash = { type: "success", message: "Ligne de commande créée avec succès." };
    return res.redirect("/order-items");
  }

  const fe = { ...fieldErrors };
  const apiErrs = r.data && r.data.errors;
  if (Array.isArray(apiErrs)) {
    for (const e of apiErrs) {
      const p = e.path || e.param;
      if (p && typeof p === "string") fe[p] = e.msg || e.message;
    }
  }
  return reloadCreate(r.status >= 400 ? r.status : 400, {
    fieldErrors: fe,
    error: formatApiError(r.data, r.status)
  });
});

router.get("/:id/edit", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/order-items");
  }
  const client = apiClient(req);
  const r = await client.get(`/order-items/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 404) {
    req.session.flash = { type: "danger", message: "Ligne introuvable." };
    return res.redirect("/order-items");
  }
  if (r.status !== 200) {
    req.session.flash = { type: "danger", message: formatApiError(r.data, r.status) };
    return res.redirect("/order-items");
  }
  const item = r.data.data || r.data.item || r.data.orderItem || r.data;

  let orders = [];
  let products = [];
  let loadWarning = null;
  try {
    const o = await fetchOrdersForSelect(req);
    if (o.unauthorized) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    orders = o.orders;
    const p = await fetchProductsForSelect(req);
    if (p.unauthorized) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    products = p.products;
    const w = [o.loadWarning, p.loadWarning].filter(Boolean).join(" ");
    if (w) loadWarning = w;
  } catch {
    orders = [];
    products = [];
  }

  return res.render("order-items/edit", {
    title: "Edit order item",
    item,
    orders,
    products,
    body: {},
    fieldErrors: {},
    loadWarning
  });
});

router.post("/:id/update", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/order-items");
  }

  const fieldErrors = validateOrderItemBody(req.body);
  const client = apiClient(req);

  const reloadEdit = async (statusCode, apiErrPayload, apiStatus, feOverride) => {
    const r0 = await client.get(`/order-items/${id}`);
    const item = r0.data && (r0.data.data || r0.data.item || r0.data.orderItem || r0.data);
    let orders = [];
    let products = [];
    let loadWarning = null;
    try {
      const o = await fetchOrdersForSelect(req);
      if (o.unauthorized) {
        req.session.destroy(() => res.redirect("/login"));
        return;
      }
      orders = o.orders;
      const p = await fetchProductsForSelect(req);
      if (p.unauthorized) {
        req.session.destroy(() => res.redirect("/login"));
        return;
      }
      products = p.products;
      const w = [o.loadWarning, p.loadWarning].filter(Boolean).join(" ");
      if (w) loadWarning = w;
    } catch {
      orders = [];
      products = [];
    }
    return res.status(statusCode).render("order-items/edit", {
      title: "Edit order item",
      item,
      orders,
      products,
      body: { ...req.body, id },
      fieldErrors: feOverride || fieldErrors,
      error: apiErrPayload ? formatApiError(apiErrPayload, apiStatus) : undefined,
      loadWarning
    });
  };

  if (Object.keys(fieldErrors).length) {
    return reloadEdit(422, null, undefined, fieldErrors);
  }

  const { order_id, product_id, quantity, price } = req.body;
  const payload = {
    order_id: parseInt(order_id, 10),
    product_id: parseInt(product_id, 10),
    quantity: parseQuantity(quantity),
    price: parseUnitPrice(price)
  };

  const r = await client.put(`/order-items/${id}`, payload);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 200 || r.status === 204) {
    req.session.flash = { type: "success", message: "Ligne mise à jour." };
    return res.redirect("/order-items");
  }
  if (r.status === 404) {
    req.session.flash = {
      type: "warning",
      message:
        "L’API ne propose peut‑être pas encore PUT /order-items/:id. Demandez au groupe backend d’ajouter cette route."
    };
    return res.redirect("/order-items");
  }

  const fe = { ...fieldErrors };
  const apiErrs = r.data && r.data.errors;
  if (Array.isArray(apiErrs)) {
    for (const e of apiErrs) {
      const p = e.path || e.param;
      if (p && typeof p === "string") fe[p] = e.msg || e.message;
    }
  }
  return reloadEdit(r.status >= 400 ? r.status : 400, r.data, r.status, fe);
});

router.post("/:id/delete", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/order-items");
  }
  const client = apiClient(req);
  const r = await client.delete(`/order-items/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 200 || r.status === 204) {
    req.session.flash = { type: "success", message: "Ligne supprimée." };
    return res.redirect("/order-items");
  }
  if (r.status === 404) {
    req.session.flash = {
      type: "warning",
      message:
        "L’API ne propose peut‑être pas encore DELETE /order-items/:id. Demandez au groupe backend d’ajouter cette route."
    };
    return res.redirect("/order-items");
  }
  req.session.flash = { type: "danger", message: formatApiError(r.data, r.status) };
  return res.redirect("/order-items");
});

module.exports = router;
