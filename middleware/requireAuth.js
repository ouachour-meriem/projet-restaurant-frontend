function requireAuth(req, res, next) {
  if (!req.session || !req.session.token) {
    return res.redirect("/login?redirect=" + encodeURIComponent(req.originalUrl || "/"));
  }
  next();
}

module.exports = requireAuth;
