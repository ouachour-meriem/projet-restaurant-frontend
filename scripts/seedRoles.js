/**
 * Insère les rôles de base (admin, client) s'ils n'existent pas encore.
 * Usage : node scripts/seedRoles.js
 */
require("dotenv").config();
const sequelize = require("../config/database");
const Role = require("../models/role");

async function main() {
  await sequelize.authenticate();

  const [, adminCreated] = await Role.findOrCreate({
    where: { name: "admin" },
    defaults: { description: "Administrateur" }
  });

  const [, clientCreated] = await Role.findOrCreate({
    where: { name: "client" },
    defaults: { description: "Client standard" }
  });

  const roles = await Role.findAll({ order: [["id", "ASC"]] });
  console.log(
    "Rôles en base :",
    roles.map((r) => ({ id: r.id, name: r.name })),
    adminCreated || clientCreated ? "(nouvelles lignes ajoutées)" : "(déjà présents)"
  );

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
