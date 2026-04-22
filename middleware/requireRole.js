function normalizeRoleName(user) {
  if (!user) return "";

  const directCandidates = [user.role_name, user.roleName, user.role];
  for (const c of directCandidates) {
    if (typeof c === "string" && c.trim()) return c.trim().toLowerCase();
  }

  if (user.role && typeof user.role === "object") {
    if (typeof user.role.name === "string" && user.role.name.trim()) {
      return user.role.name.trim().toLowerCase();
    }
  }

  if (user.role_id != null) {
    const id = Number(user.role_id);
    if (id === 1) return "admin";
    if (id === 2) return "client";
  }

  return "";
}

function isAdmin(user) {
  return normalizeRoleName(user) === "admin";
}

function requireRole(allowedRoles) {
  const allowed = new Set((allowedRoles || []).map((r) => String(r).toLowerCase()));
  return function roleGuard(req, res, next) {
    if (!req.session || !req.session.token) {
      return res.redirect("/login?redirect=" + encodeURIComponent(req.originalUrl || "/"));
    }

    const role = normalizeRoleName(req.session.user);
    if (allowed.has(role)) return next();

    req.session.flash = {
      type: "warning",
      message: "Accès refusé : autorisation insuffisante pour cette page."
    };
    return res.redirect("/");
  };
}

module.exports = { requireRole, isAdmin, normalizeRoleName };
