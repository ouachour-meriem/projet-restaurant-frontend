const axios = require("axios");

function getApiUrl() {
  const raw = process.env.API_URL || "http://localhost:3002";
  return String(raw).trim().replace(/\/+$/, "");
}

function authHeaders(req) {
  const token = req.session && req.session.token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * @param {import('express').Request} req
 * @param {string} path - path starting with /
 */
function apiClient(req) {
  const baseURL = getApiUrl();
  return axios.create({
    baseURL,
    headers: {
      ...authHeaders(req),
      "Content-Type": "application/json"
    },
    validateStatus: () => true
  });
}

/**
 * @param {unknown} data - corps JSON axios ou texte brut
 * @param {number} [statusCode] - code HTTP de la réponse
 */
function formatApiError(data, statusCode) {
  const code = typeof statusCode === "number" ? statusCode : undefined;

  if (data == null || data === "") {
    if (code === 404) {
      return "L’API a répondu 404 : route absente ou URL incorrecte (vérifie API_URL dans .env).";
    }
    if (code === 401 || code === 403) {
      return "Accès refusé par l’API (session expirée ou droits insuffisants).";
    }
    if (code === 502 || code === 503) {
      return "L’API est temporairement indisponible. Réessaie plus tard.";
    }
    return "Réponse vide de l’API. Démarre le backend et vérifie que API_URL pointe vers le bon port.";
  }

  if (typeof data === "string") {
    const t = data.trim();
    if (!t) return formatApiError(null, code);
    const lower = t.toLowerCase();
    if (t.startsWith("<") || lower.includes("<!doctype")) {
      return "L’API a renvoyé du HTML au lieu de JSON (souvent une erreur 404 côté serveur). Vérifie API_URL.";
    }
    return t.length > 220 ? `${t.slice(0, 220)}…` : t;
  }

  if (Array.isArray(data.errors) && data.errors.length) {
    return data.errors.map((e) => e.msg || e.message || String(e)).join(" · ");
  }

  let msg =
    typeof data.message === "string" && data.message.trim()
      ? data.message.trim()
      : typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : null;

  if (!msg) {
    return code === 404
      ? "Ressource introuvable (404)."
      : "Réponse API sans message exploitable. Consulte les logs du backend.";
  }

  if (typeof data.error === "string" && data.error.trim() && msg !== data.error.trim()) {
    msg = `${msg} — ${data.error.trim()}`;
  }
  return msg;
}

module.exports = { getApiUrl, authHeaders, apiClient, formatApiError };
