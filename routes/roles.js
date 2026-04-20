const express = require("express");
const { apiClient, formatApiError } = require("../lib/api");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const client = apiClient(req);
    const r = await client.get("/roles");
    if (r.status === 401) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    if (r.status !== 200) {
      req.session.flash = { type: "danger", message: formatApiError(r.data) };
      return res.render("roles/index", { title: "Rôles", roles: [] });
    }
    const roles = Array.isArray(r.data.data) ? r.data.data : [];
    return res.render("roles/index", { title: "Rôles", roles });
  } catch (err) {
    req.session.flash = { type: "danger", message: err.message || "Erreur réseau" };
    return res.redirect("/");
  }
});

router.get("/new", (req, res) => {
  return res.render("roles/create", {
    title: "Nouveau rôle",
    body: {},
    fieldErrors: {}
  });
});

router.post("/", async (req, res) => {
  const { name, description, image_url } = req.body;
  const fieldErrors = {};

  if (!name || !String(name).trim()) {
    fieldErrors.name = "Le nom du rôle est obligatoire.";
  }

  if (Object.keys(fieldErrors).length) {
    return res.status(422).render("roles/create", {
      title: "Nouveau rôle",
      body: req.body,
      fieldErrors
    });
  }

  const client = apiClient(req);
  const r = await client.post("/roles", {
    name: String(name).trim(),
    description: description && String(description).trim() ? String(description).trim() : null,
    image_url: image_url && String(image_url).trim() ? String(image_url).trim() : null
  });

  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 201) {
    req.session.flash = { type: "success", message: "Rôle créé avec succès." };
    return res.redirect("/roles");
  }

  const apiErrs = r.data && r.data.errors;
  if (Array.isArray(apiErrs)) {
    for (const e of apiErrs) {
      const p = e.path || e.param;
      if (p && typeof p === "string") fieldErrors[p] = e.msg || e.message;
    }
  }
  return res.status(r.status >= 400 ? r.status : 400).render("roles/create", {
    title: "Nouveau rôle",
    body: req.body,
    fieldErrors,
    error: formatApiError(r.data)
  });
});

router.get("/:id/edit", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/roles");
  }
  const client = apiClient(req);
  const r = await client.get(`/roles/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 404) {
    req.session.flash = { type: "danger", message: "Rôle introuvable." };
    return res.redirect("/roles");
  }
  if (r.status !== 200) {
    req.session.flash = { type: "danger", message: formatApiError(r.data) };
    return res.redirect("/roles");
  }
  const role = r.data.data;
  return res.render("roles/edit", {
    title: "Modifier le rôle",
    role,
    body: {},
    fieldErrors: {}
  });
});

router.post("/:id/update", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/roles");
  }

  const { name, description, image_url } = req.body;
  const fieldErrors = {};
  if (!name || !String(name).trim()) {
    fieldErrors.name = "Le nom du rôle est obligatoire.";
  }

  const client = apiClient(req);

  const reloadEdit = async (statusCode, apiErrPayload) => {
    const r0 = await client.get(`/roles/${id}`);
    const role = r0.data && r0.data.data;
    return res.status(statusCode).render("roles/edit", {
      title: "Modifier le rôle",
      role,
      body: { ...req.body, id },
      fieldErrors,
      error: apiErrPayload ? formatApiError(apiErrPayload) : undefined
    });
  };

  if (Object.keys(fieldErrors).length) {
    const r0 = await client.get(`/roles/${id}`);
    const role = r0.data && r0.data.data;
    return res.status(422).render("roles/edit", {
      title: "Modifier le rôle",
      role,
      body: req.body,
      fieldErrors
    });
  }

  const r = await client.put(`/roles/${id}`, {
    name: String(name).trim(),
    description: description && String(description).trim() ? String(description).trim() : null,
    image_url: image_url && String(image_url).trim() ? String(image_url).trim() : null
  });

  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 200) {
    req.session.flash = { type: "success", message: "Rôle mis à jour." };
    return res.redirect("/roles");
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
    return res.redirect("/roles");
  }
  const client = apiClient(req);
  const r = await client.delete(`/roles/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 204 || r.status === 200) {
    req.session.flash = { type: "success", message: "Rôle supprimé." };
    return res.redirect("/roles");
  }
  req.session.flash = { type: "danger", message: formatApiError(r.data) };
  return res.redirect("/roles");
});

module.exports = router;
