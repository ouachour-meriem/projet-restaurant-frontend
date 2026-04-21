/**
 * Routes Express — produits (proxy API /products).
 * Validations : nom, prix numérique, stock entier, catégorie obligatoires.
 */

const express = require("express");
const { apiClient, formatApiError } = require("../lib/api");

const router = express.Router();

async function fetchCategories(req) {
  const client = apiClient(req);
  const r = await client.get("/categories");
  if (r.status === 401) return { status: 401, categories: [] };
  if (r.status !== 200 || !r.data) return { status: r.status, categories: [] };
  const d = r.data;
  const tryArrays = [d.data, d.categories, d.rows, Array.isArray(d) ? d : null];
  for (const a of tryArrays) {
    if (Array.isArray(a)) return { status: r.status, categories: a };
  }
  if (d.data && Array.isArray(d.data.rows)) return { status: r.status, categories: d.data.rows };
  return { status: r.status, categories: [] };
}

function parsePrice(raw) {
  if (raw === undefined || raw === null) return NaN;
  const s = String(raw).trim().replace(",", ".");
  if (s === "") return NaN;
  return parseFloat(s);
}

function parseStock(raw) {
  if (raw === undefined || raw === null) return NaN;
  const s = String(raw).trim();
  if (s === "" || !/^-?\d+$/.test(s)) return NaN;
  return parseInt(s, 10);
}

function validateProductBody(body) {
  const { name, price, stock, category_id } = body;
  const fieldErrors = {};

  if (!name || !String(name).trim()) {
    fieldErrors.name = "Le nom est obligatoire.";
  }

  if (category_id === undefined || category_id === null || String(category_id).trim() === "") {
    fieldErrors.category_id = "La catégorie est obligatoire.";
  } else {
    const cid = parseInt(String(category_id).trim(), 10);
    if (!Number.isFinite(cid) || cid < 1) {
      fieldErrors.category_id = "La catégorie est obligatoire.";
    }
  }

  const p = parsePrice(price);
  if (!Number.isFinite(p)) {
    fieldErrors.price = "Le prix doit être un nombre valide.";
  }

  const st = parseStock(stock);
  if (!Number.isFinite(st)) {
    fieldErrors.stock = "Le stock doit être un nombre entier.";
  } else if (!Number.isInteger(st)) {
    fieldErrors.stock = "Le stock doit être un nombre entier.";
  }

  return { fieldErrors, priceNum: p, stockInt: st };
}

router.get("/", async (req, res) => {
  try {
    const client = apiClient(req);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const r = await client.get("/products", { params: { page, limit } });
    if (r.status === 401) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    if (r.status !== 200) {
      req.session.flash = { type: "danger", message: formatApiError(r.data) };
      return res.render("products/index", {
        title: "Produits",
        products: [],
        pagination: null,
        query: req.query
      });
    }
    const d = r.data;
    const tryArrays = [d.data, d.products, d.rows, Array.isArray(d) ? d : null];
    let list = [];
    for (const a of tryArrays) {
      if (Array.isArray(a)) {
        list = a;
        break;
      }
    }
    if (!list.length && d.data && Array.isArray(d.data.rows)) list = d.data.rows;
    const total = d.total != null ? d.total : d.pagination && d.pagination.total != null ? d.pagination.total : list.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    return res.render("products/index", {
      title: "Produits",
      products: list,
      pagination: { page: d.page || page, limit: d.limit || limit, total, totalPages },
      query: req.query
    });
  } catch (err) {
    req.session.flash = { type: "danger", message: err.message || "Erreur réseau" };
    return res.redirect("/");
  }
});

router.get("/new", async (req, res) => {
  const { status, categories } = await fetchCategories(req);
  if (status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  return res.render("products/create", {
    title: "Nouveau produit",
    categories,
    body: {},
    fieldErrors: {}
  });
});

router.post("/", async (req, res) => {
  const { name, description, image_url } = req.body;
  const { fieldErrors, priceNum, stockInt } = validateProductBody(req.body);

  const { categories } = await fetchCategories(req);
  if (Object.keys(fieldErrors).length) {
    return res.status(422).render("products/create", {
      title: "Nouveau produit",
      categories,
      body: req.body,
      fieldErrors
    });
  }

  const client = apiClient(req);
  const r = await client.post("/products", {
    name: String(name).trim(),
    description: description && String(description).trim() ? String(description).trim() : null,
    price: priceNum,
    stock: stockInt,
    category_id: parseInt(String(req.body.category_id).trim(), 10),
    image_url: image_url && String(image_url).trim() ? String(image_url).trim() : null
  });

  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 201) {
    req.session.flash = { type: "success", message: "Produit créé avec succès." };
    return res.redirect("/products");
  }

  const fe = { ...fieldErrors };
  const apiErrs = r.data && r.data.errors;
  if (Array.isArray(apiErrs)) {
    for (const e of apiErrs) {
      const p = e.path || e.param;
      if (p && typeof p === "string") fe[p] = e.msg || e.message;
    }
  }
  return res.status(r.status >= 400 ? r.status : 400).render("products/create", {
    title: "Nouveau produit",
    categories,
    body: req.body,
    fieldErrors: fe,
    error: formatApiError(r.data)
  });
});

router.get("/:id/edit", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/products");
  }
  const client = apiClient(req);
  const r = await client.get(`/products/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 404) {
    req.session.flash = { type: "danger", message: "Produit introuvable." };
    return res.redirect("/products");
  }
  if (r.status !== 200) {
    req.session.flash = { type: "danger", message: formatApiError(r.data) };
    return res.redirect("/products");
  }
  const product = r.data.data;
  const { categories } = await fetchCategories(req);
  return res.render("products/edit", {
    title: "Modifier le produit",
    product,
    categories,
    body: {},
    fieldErrors: {}
  });
});

router.post("/:id/update", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/products");
  }

  const { name, description, image_url } = req.body;
  const { fieldErrors, priceNum, stockInt } = validateProductBody(req.body);
  const client = apiClient(req);

  const reloadEdit = async (statusCode, apiErrPayload) => {
    const r0 = await client.get(`/products/${id}`);
    const product = r0.data && r0.data.data;
    const { categories } = await fetchCategories(req);
    return res.status(statusCode).render("products/edit", {
      title: "Modifier le produit",
      product,
      categories,
      body: { ...req.body, id },
      fieldErrors,
      error: apiErrPayload ? formatApiError(apiErrPayload) : undefined
    });
  };

  if (Object.keys(fieldErrors).length) {
    const r0 = await client.get(`/products/${id}`);
    const product = r0.data && r0.data.data;
    const { categories } = await fetchCategories(req);
    return res.status(422).render("products/edit", {
      title: "Modifier le produit",
      product,
      categories,
      body: req.body,
      fieldErrors
    });
  }

  const r = await client.put(`/products/${id}`, {
    name: String(name).trim(),
    description: description && String(description).trim() ? String(description).trim() : null,
    price: priceNum,
    stock: stockInt,
    category_id: parseInt(String(req.body.category_id).trim(), 10),
    image_url: image_url && String(image_url).trim() ? String(image_url).trim() : null
  });

  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 200 || r.status === 204) {
    req.session.flash = { type: "success", message: "Produit mis à jour." };
    return res.redirect("/products");
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
    return res.redirect("/products");
  }
  const client = apiClient(req);
  const r = await client.delete(`/products/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 204 || r.status === 200) {
    req.session.flash = { type: "success", message: "Produit supprimé." };
    return res.redirect("/products");
  }
  req.session.flash = { type: "danger", message: formatApiError(r.data) };
  return res.redirect("/products");
});

module.exports = router;
