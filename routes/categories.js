/**
 * Routes Express — catégories (proxy API /categories).
 */

const express = require("express");
const { apiClient, formatApiError } = require("../lib/api");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const client = apiClient(req);
    const r = await client.get("/categories");
    if (r.status === 401) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    if (r.status !== 200) {
      req.session.flash = { type: "danger", message: formatApiError(r.data) };
      return res.render("categories/index", { title: "Catégories", categories: [] });
    }
    const d = r.data;
    const tryArrays = [d.data, d.categories, d.rows, Array.isArray(d) ? d : null];
    let arr = [];
    for (const a of tryArrays) {
      if (Array.isArray(a)) {
        arr = a;
        break;
      }
    }
    if (!arr.length && d.data && Array.isArray(d.data.rows)) arr = d.data.rows;
    return res.render("categories/index", { title: "Catégories", categories: arr });
  } catch (err) {
    req.session.flash = { type: "danger", message: err.message || "Erreur réseau" };
    return res.redirect("/");
  }
});

router.get("/new", (req, res) => {
  return res.render("categories/create", {
    title: "Nouvelle catégorie",
    body: {},
    fieldErrors: {}
  });
});

router.post("/", async (req, res) => {
  const { name, description, image_url } = req.body;
  const fieldErrors = {};

  if (!name || !String(name).trim()) {
    fieldErrors.name = "Le nom est obligatoire.";
  }

  if (Object.keys(fieldErrors).length) {
    return res.status(422).render("categories/create", {
      title: "Nouvelle catégorie",
      body: req.body,
      fieldErrors
    });
  }

  const client = apiClient(req);
  const r = await client.post("/categories", {
    name: String(name).trim(),
    description: description && String(description).trim() ? String(description).trim() : null,
    image_url: image_url && String(image_url).trim() ? String(image_url).trim() : null
  });

  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 201) {
    req.session.flash = { type: "success", message: "Catégorie créée avec succès." };
    return res.redirect("/categories");
  }

  const apiErrs = r.data && r.data.errors;
  if (Array.isArray(apiErrs)) {
    for (const e of apiErrs) {
      const p = e.path || e.param;
      if (p && typeof p === "string") fieldErrors[p] = e.msg || e.message;
    }
  }
  return res.status(r.status >= 400 ? r.status : 400).render("categories/create", {
    title: "Nouvelle catégorie",
    body: req.body,
    fieldErrors,
    error: formatApiError(r.data)
  });
});

router.get("/:id/edit", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/categories");
  }
  const client = apiClient(req);
  const r = await client.get(`/categories/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 404) {
    req.session.flash = { type: "danger", message: "Catégorie introuvable." };
    return res.redirect("/categories");
  }
  if (r.status !== 200) {
    req.session.flash = { type: "danger", message: formatApiError(r.data) };
    return res.redirect("/categories");
  }
  const category = r.data.data;
  return res.render("categories/edit", {
    title: "Modifier la catégorie",
    category,
    body: {},
    fieldErrors: {}
  });
});

router.post("/:id/update", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/categories");
  }

  const { name, description, image_url } = req.body;
  const fieldErrors = {};
  if (!name || !String(name).trim()) {
    fieldErrors.name = "Le nom est obligatoire.";
  }

  const client = apiClient(req);

  const reloadEdit = async (statusCode, apiErrPayload) => {
    const r0 = await client.get(`/categories/${id}`);
    const category = r0.data && r0.data.data;
    return res.status(statusCode).render("categories/edit", {
      title: "Modifier la catégorie",
      category,
      body: { ...req.body, id },
      fieldErrors,
      error: apiErrPayload ? formatApiError(apiErrPayload) : undefined
    });
  };

  if (Object.keys(fieldErrors).length) {
    const r0 = await client.get(`/categories/${id}`);
    const category = r0.data && r0.data.data;
    return res.status(422).render("categories/edit", {
      title: "Modifier la catégorie",
      category,
      body: req.body,
      fieldErrors
    });
  }

  const r = await client.put(`/categories/${id}`, {
    name: String(name).trim(),
    description: description && String(description).trim() ? String(description).trim() : null,
    image_url: image_url && String(image_url).trim() ? String(image_url).trim() : null
  });

  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 200 || r.status === 204) {
    req.session.flash = { type: "success", message: "Catégorie mise à jour." };
    return res.redirect("/categories");
  }

  const apiErrs = r.data && r.data.errors;
  if (Array.isArray(apiErrs)) {
    for (const e of apiErrs) {
      const p = e.path || e.param;
      if (p && typeof p === "string") fieldErrors[p] = e.msg || e.message;
    }
  }
  return reloadEdit(r.status >= 400 ? r.status : 400, r.data);
});

router.post("/:id/delete", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/categories");
  }
  const client = apiClient(req);
  const r = await client.delete(`/categories/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 204 || r.status === 200) {
    req.session.flash = { type: "success", message: "Catégorie supprimée." };
    return res.redirect("/categories");
  }
  req.session.flash = { type: "danger", message: formatApiError(r.data) };
  return res.redirect("/categories");
});

module.exports = router;
