const Customer = require("../models/customer");

/**
 * Crée une fiche client liée à l'utilisateur si le rôle est « client ».
 */
async function createCustomerProfileIfClient(user, role, body, displayName) {
  if (!role || role.name !== "client") {
    return null;
  }

  const name = (displayName || "").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const first_name =
    (body.first_name && String(body.first_name).trim()) ||
    parts[0] ||
    name ||
    "Client";
  const last_name =
    (body.last_name && String(body.last_name).trim()) ||
    (parts.length > 1 ? parts.slice(1).join(" ") : "-");

  const existing = await Customer.findOne({ where: { user_id: user.id } });
  if (existing) {
    return existing;
  }

  return Customer.create({
    user_id: user.id,
    first_name,
    last_name,
    phone: body.phone || null,
    email: body.customer_email || body.email || user.email || null,
    image_url: body.customer_image_url || body.image_url || null
  });
}

module.exports = { createCustomerProfileIfClient };
