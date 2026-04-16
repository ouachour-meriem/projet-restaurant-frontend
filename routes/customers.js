const express = require("express");
const { apiClient, formatApiError } = require("../lib/api");

const router = express.Router();

function sessionUserId(req) {
  const u = req.session && req.session.user;
  return u && u.id != null ? u.id : null;
}

async function fetchUsersForSelect(req) {
  const client = apiClient(req);
  const r = await client.get("/users", { params: { page: 1, limit: 200 } });
  if (r.status === 401 || r.status === 403 || r.status === 404) return [];
  if (r.status !== 200 || !r.data) return [];
  const d = r.data;
  const tryArrays = [d.data, d.users, d.rows, d.results, d.items, Array.isArray(d) ? d : null];
  for (const arr of tryArrays) {
    if (Array.isArray(arr)) return arr;
  }
  if (d.data && Array.isArray(d.data.rows)) return d.data.rows;
  return [];
}

router.get("/", async (req, res) => {
  try {
    const client = apiClient(req);
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const search = req.query.search || "";
    const r = await client.get("/customers", {
      params: { page, limit, search: search || undefined }
    });
    if (r.status === 401) {
      req.session.destroy(() => res.redirect("/login"));
      return;
    }
    if (r.status !== 200) {
      req.session.flash = { type: "danger", message: formatApiError(r.data) };
      return res.render("customers/index", {
        title: "Clients",
        customers: [],
        pagination: null,
        search,
        query: req.query
      });
    }
    return res.render("customers/index", {
      title: "Clients",
      customers: r.data.data || [],
      pagination: r.data.pagination,
      search,
      query: req.query
    });
  } catch (err) {
    req.session.flash = { type: "danger", message: err.message || "Erreur réseau" };
    return res.redirect("/");
  }
});

router.get("/new", async (req, res) => {
  let users = [];
  try {
    users = await fetchUsersForSelect(req);
  } catch {
    users = [];
  }
  return res.render("customers/create", {
    title: "Nouveau client",
    users,
    body: {},
    fieldErrors: {},
    sessionUserId: sessionUserId(req)
  });
});

router.post("/", async (req, res) => {
  const { first_name, last_name, phone, email, address, status } = req.body;
  const user_id = sessionUserId(req);
  const fieldErrors = {};

  if (!first_name || !String(first_name).trim()) {
    fieldErrors.first_name = "Le prénom est obligatoire.";
  }
  if (!last_name || !String(last_name).trim()) {
    fieldErrors.last_name = "Le nom est obligatoire.";
  }
  if (!user_id) {
    fieldErrors.user_id = "L’utilisateur est obligatoire.";
  }

  if (Object.keys(fieldErrors).length) {
    let users = [];
    try {
      users = await fetchUsersForSelect(req);
    } catch {
      users = [];
    }
    return res.status(422).render("customers/create", {
      title: "Nouveau client",
      users,
      body: req.body,
      fieldErrors,
      sessionUserId: sessionUserId(req)
    });
  }

  const client = apiClient(req);
  const r = await client.post("/customers", {
    user_id: parseInt(user_id, 10),
    first_name: String(first_name).trim(),
    last_name: String(last_name).trim(),
    phone: phone ? String(phone).trim() : undefined,
    email: email ? String(email).trim() : undefined,
    address: address ? String(address).trim() : undefined,
    status: status ? String(status).trim() : undefined
  });

  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 201) {
    req.session.flash = { type: "success", message: "Client créé avec succès." };
    return res.redirect("/customers");
  }

  let users = [];
  try {
    users = await fetchUsersForSelect(req);
  } catch {
    users = [];
  }
  const apiErrs = r.data && r.data.errors;
  if (Array.isArray(apiErrs)) {
    for (const e of apiErrs) {
      const p = e.path || e.param;
      if (p && typeof p === "string") fieldErrors[p] = e.msg || e.message;
    }
  }
  return res.status(r.status >= 400 ? r.status : 400).render("customers/create", {
    title: "Nouveau client",
    users,
    body: req.body,
    fieldErrors,
    error: formatApiError(r.data),
    sessionUserId: sessionUserId(req)
  });
});

router.get("/:id/edit", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/customers");
  }
  const client = apiClient(req);
  const r = await client.get(`/customers/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 404) {
    req.session.flash = { type: "danger", message: "Client introuvable." };
    return res.redirect("/customers");
  }
  if (r.status !== 200) {
    req.session.flash = { type: "danger", message: formatApiError(r.data) };
    return res.redirect("/customers");
  }
  const customer = r.data.data;
  let users = [];
  try {
    users = await fetchUsersForSelect(req);
  } catch {
    users = [];
  }
  return res.render("customers/edit", {
    title: "Modifier le client",
    customer,
    users,
    body: {},
    fieldErrors: {},
    sessionUserId: sessionUserId(req)
  });
});

router.post("/:id/update", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    req.session.flash = { type: "danger", message: "Identifiant invalide." };
    return res.redirect("/customers");
  }

  const { first_name, last_name, phone, email, address, status } = req.body;
  const fieldErrors = {};

  if (!first_name || !String(first_name).trim()) {
    fieldErrors.first_name = "Le prénom est obligatoire.";
  }
  if (!last_name || !String(last_name).trim()) {
    fieldErrors.last_name = "Le nom est obligatoire.";
  }
  const client = apiClient(req);
  const reloadEdit = async (statusCode, apiErrPayload) => {
    const r0 = await client.get(`/customers/${id}`);
    const customer = r0.data && r0.data.data;
    let users = [];
    try {
      users = await fetchUsersForSelect(req);
    } catch {
      users = [];
    }
    return res.status(statusCode).render("customers/edit", {
      title: "Modifier le client",
      customer,
      users,
      body: { ...req.body, id },
      fieldErrors,
      error: apiErrPayload ? formatApiError(apiErrPayload) : undefined,
      sessionUserId: sessionUserId(req)
    });
  };

  if (Object.keys(fieldErrors).length) {
    return reloadEdit(422, null);
  }

  const currentCustomerResp = await client.get(`/customers/${id}`);
  const currentCustomer = currentCustomerResp.data && currentCustomerResp.data.data ? currentCustomerResp.data.data : null;
  const user_id = currentCustomer && currentCustomer.user_id ? currentCustomer.user_id : sessionUserId(req);
  if (!user_id) {
    req.session.flash = { type: "danger", message: "Utilisateur introuvable pour la mise à jour." };
    return res.redirect("/customers");
  }

  const payload = {
    user_id: parseInt(user_id, 10),
    first_name: String(first_name).trim(),
    last_name: String(last_name).trim(),
    phone: phone ? String(phone).trim() : null,
    email: email ? String(email).trim() : null,
    address: address ? String(address).trim() : null,
    status: status ? String(status).trim() : null
  };

  const r = await client.put(`/customers/${id}`, payload);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 200 || r.status === 204) {
    req.session.flash = { type: "success", message: "Client mis à jour." };
    return res.redirect("/customers");
  }
  if (r.status === 404) {
    req.session.flash = {
      type: "warning",
      message:
        "L’API ne propose pas encore la mise à jour (PUT /customers/:id). Demandez au groupe backend d’ajouter cette route."
    };
    return res.redirect("/customers");
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
    return res.redirect("/customers");
  }
  const client = apiClient(req);
  const r = await client.delete(`/customers/${id}`);
  if (r.status === 401) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  if (r.status === 200 || r.status === 204) {
    req.session.flash = { type: "success", message: "Client supprimé." };
    return res.redirect("/customers");
  }
  if (r.status === 404) {
    req.session.flash = {
      type: "warning",
      message:
        "L’API ne propose pas encore la suppression (DELETE /customers/:id). Demandez au groupe backend d’ajouter cette route."
    };
    return res.redirect("/customers");
  }
  req.session.flash = { type: "danger", message: formatApiError(r.data) };
  return res.redirect("/customers");
});

module.exports = router;
