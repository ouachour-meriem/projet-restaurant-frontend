const User = require("../models/user");
const Role = require("../models/role");
const bcrypt = require("bcryptjs");
const { createCustomerProfileIfClient } = require("../lib/customerProfile");

const createUser = async (req, res) => {
  try {
    const { name, email, password, role_id } = req.body;

    const role = await Role.findByPk(role_id);
    if (!role) return res.status(404).json({ message: "Rôle introuvable" });

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({
        message: "Un utilisateur avec cet email existe déjà"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role_id,
      avatar_url: req.body.avatar_url || null
    });

    await createCustomerProfileIfClient(user, role, req.body, name);

    return res.status(201).json({
      message: "Utilisateur créé avec succès",
      data: { id: user.id, name: user.name, email: user.email, role_id: user.role_id }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la création de l'utilisateur",
      error: error.message
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "10", 10), 1);
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      limit,
      offset,
      order: [["id", "ASC"]],
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name", "description"]
        }
      ],
      attributes: ["id", "name", "email", "role_id", "avatar_url"]
    });

    return res.json({
      page,
      limit,
      total: count,
      data: rows
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la récupération des utilisateurs",
      error: error.message
    });
  }
};

module.exports = { createUser, getUsers };

