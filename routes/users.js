const express = require("express");
const { apiClient, formatApiError } = require("../lib/api");

const router = express.Router();

async function fetchRoles(req) {
  const client = apiClient(req);
  const r = await client.get("/roles");
  if (r.status === 401) return { status: 401, roles: [] };
  if (r.status !== 200 || !r.data) return { status: r.status, roles: [] };
  const arr = Array.isArray(r.data.data) ? r.data.data : [];
  return { status: r.status, roles: arr };
}

router.get("/", async (req, res) => {
  try {
    const client = apiClient(req);
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const r = await client.get("/users", { params: { page, limit } });
    if (r.status === 401) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    if (r.status !== 200) {
      req.session.flash = { type: "danger", message: formatApiError(r.data) };
      return res.render("users/index", {
        title: "Utilisateurs",
        users: [],
        pagination: null,
        query: req.query
      });
    }
    const total = r.data.total != null ? r.data.total : (r.data.data || []).length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    return res.render("users/index", {
      title: "Utilisateurs",
      users: r.data.data || [],
      pagination: { page: r.data.page || page, limit: r.data.limit || limit, total, totalPages },
      query: req.query
    });
  } catch (err) {
    req.session.flash = { type: "danger", message: err.message || "Erreur réseau" };
    return res.redirect("/");
  }
});

router.get("/new", async (req, res) => {
  const { status, roles } = await fetchRoles(req);
  if (status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  return res.render("users/create", {
    title: "Nouvel utilisateur",
    roles,
    body: {},
    fieldErrors: {}
  });
});

router.post("/", async (req, res) => {
  const { name, email, password, role_id } = req.body;
  const fieldErrors = {};

  if (!name || !String(name).trim()) {
    fieldErrors.name = "Le nom est obligatoire.";
  }
  if (!email || !String(email).trim()) {
    fieldErrors.email = "L’e-mail est obligatoire.";
  }
  if (!password || !String(password).trim()) {
    fieldErrors.password = "Le mot de passe est obligatoire.";
  }
  if (!role_id || !String(role_id).trim()) {
    fieldErrors.role_id = "Le rôle est obligatoire.";
  }

  const { roles } = await fetchRoles(req);
  if (Object.keys(fieldErrors).length) {
    return res.status(422).render("users/create", {
      title: "Nouvel utilisateur",
      roles,
      body: req.body,
      fieldErrors
    });
  }

  const client = apiClient(req);
  const r = await client.post("/users", {
    name: String(name).trim(),
    email: String(email).trim(),
    password: String(password),
    role_id: parseInt(role_id, 10)
  });

  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 201) {
    req.session.flash = { type: "success", message: "Utilisateur créé avec succès." };
    return res.redirect("/users");
  }

  const apiErrs = r.data && r.data.errors;
  if (Array.isArray(apiErrs)) {
    for (const e of apiErrs) {
      const p = e.path || e.param;
      if (p && typeof p === "string") fieldErrors[p] = e.msg || e.message;
    }
  }
  return res.status(r.status >= 400 ? r.status : 400).render("users/create", {
    title: "Nouvel utilisateur",
    roles,
    body: req.body,
    fieldErrors,
    error: formatApiError(r.data)
  });
});

router.get("/:id/edit", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/users");
  }
  const client = apiClient(req);
  const r = await client.get(`/users/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 404) {
    req.session.flash = { type: "danger", message: "Utilisateur introuvable." };
    return res.redirect("/users");
  }
  if (r.status !== 200) {
    req.session.flash = { type: "danger", message: formatApiError(r.data) };
    return res.redirect("/users");
  }
  const { roles } = await fetchRoles(req);
  const user = r.data.data;
  return res.render("users/edit", {
    title: "Modifier l’utilisateur",
    user,
    roles,
    body: {},
    fieldErrors: {}
  });
});

router.post("/:id/update", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/users");
  }

  const { name, email, password, role_id } = req.body;
  const fieldErrors = {};

  if (!name || !String(name).trim()) {
    fieldErrors.name = "Le nom est obligatoire.";
  }
  if (!email || !String(email).trim()) {
    fieldErrors.email = "L’e-mail est obligatoire.";
  }
  if (!role_id || !String(role_id).trim()) {
    fieldErrors.role_id = "Le rôle est obligatoire.";
  }

  const client = apiClient(req);

  const reloadEdit = async (statusCode, apiErrPayload) => {
    const r0 = await client.get(`/users/${id}`);
    const user = r0.data && r0.data.data;
    const { roles } = await fetchRoles(req);
    return res.status(statusCode).render("users/edit", {
      title: "Modifier l’utilisateur",
      user,
      roles,
      body: { ...req.body, id },
      fieldErrors,
      error: apiErrPayload ? formatApiError(apiErrPayload) : undefined
    });
  };

  const { roles } = await fetchRoles(req);
  if (Object.keys(fieldErrors).length) {
    const r0 = await client.get(`/users/${id}`);
    const user = r0.data && r0.data.data;
    return res.status(422).render("users/edit", {
      title: "Modifier l’utilisateur",
      user,
      roles,
      body: req.body,
      fieldErrors
    });
  }

  const payload = {
    name: String(name).trim(),
    email: String(email).trim(),
    role_id: parseInt(role_id, 10)
  };
  if (password && String(password).trim()) {
    payload.password = String(password).trim();
  }

  const r = await client.put(`/users/${id}`, payload);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 200) {
    req.session.flash = { type: "success", message: "Utilisateur mis à jour." };
    return res.redirect("/users");
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
    return res.redirect("/users");
  }
  const client = apiClient(req);
  const r = await client.delete(`/users/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 204 || r.status === 200) {
    req.session.flash = { type: "success", message: "Utilisateur supprimé." };
    return res.redirect("/users");
  }
  req.session.flash = { type: "danger", message: formatApiError(r.data) };
  return res.redirect("/users");
});

module.exports = router;
