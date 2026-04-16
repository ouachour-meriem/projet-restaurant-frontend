const axios = require("axios");

function getApiUrl() {
  return process.env.API_URL || "http://localhost:3002";
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

function formatApiError(data) {
  if (!data) return "Erreur API";
  if (Array.isArray(data.errors) && data.errors.length) {
    return data.errors.map((e) => e.msg || e.message || String(e)).join(" · ");
  }
  let msg = typeof data.message === "string" ? data.message : "Erreur API";
  if (typeof data.error === "string" && data.error.trim()) {
    msg = `${msg} — ${data.error}`;
  }
  return msg;
}

module.exports = { getApiUrl, authHeaders, apiClient, formatApiError };
