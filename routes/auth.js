const express = require("express");
const axios = require("axios");
const { getApiUrl } = require("../lib/api");

const router = express.Router();

function renderLogin(req, res, opts = {}) {
  const redirect = opts.redirect || req.query.redirect || "/";
  res.render("auth/login", {
    title: "Connexion",
    error: opts.error != null ? opts.error : null,
    fieldErrors: opts.fieldErrors || {},
    email: opts.email != null ? opts.email : "",
    redirect: typeof redirect === "string" && redirect.startsWith("/") ? redirect : "/"
  });
}

router.get("/login", (req, res) => {
  if (req.session && req.session.token) {
    const red = req.query.redirect;
    if (typeof red === "string" && red.startsWith("/")) {
      return res.redirect(red);
    }
    return res.redirect("/");
  }
  return renderLogin(req, res, { email: "" });
});

router.post("/login", async (req, res) => {
  const email = (req.body.email || "").trim();
  const password = req.body.password != null ? String(req.body.password) : "";
  const redirectRaw = req.body.redirect || "/";
  const redirect =
    typeof redirectRaw === "string" && redirectRaw.startsWith("/") ? redirectRaw : "/";

  const fieldErrors = {};
  if (!email) {
    fieldErrors.email = "L’e-mail est obligatoire.";
  }
  if (!password) {
    fieldErrors.password = "Le mot de passe est obligatoire.";
  }
  if (Object.keys(fieldErrors).length) {
    return res.status(422).render("auth/login", {
      title: "Connexion",
      error: null,
      fieldErrors,
      email,
      redirect
    });
  }

  const apiUrl = getApiUrl();
  try {
    const r = await axios.post(`${apiUrl}/auth/login`, { email, password });
    if (!r.data || !r.data.token) {
      return res.status(422).render("auth/login", {
        title: "Connexion",
        error: "Réponse API inattendue (token manquant).",
        fieldErrors: {},
        email,
        redirect
      });
    }

    req.session.token = r.data.token;
    req.session.user = r.data.user;

    const remember = req.body.remember === "on" || req.body.remember === "1";
    req.session.cookie.maxAge = remember
      ? 30 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    return res.redirect(redirect);
  } catch (e) {
    const msg =
      e.response && e.response.data && e.response.data.message
        ? e.response.data.message
        : "Connexion impossible. Vérifiez l’API et vos identifiants.";
    return res.status(422).render("auth/login", {
      title: "Connexion",
      error: msg,
      fieldErrors: {},
      email,
      redirect
    });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
