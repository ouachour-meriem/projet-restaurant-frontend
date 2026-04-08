const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Role = require("../models/role");
const Customer = require("../models/customer");
const { createCustomerProfileIfClient } = require("../lib/customerProfile");

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let roleId = req.body.role_id;

    if (roleId === undefined || roleId === null || roleId === "") {
      const parsed = parseInt(process.env.DEFAULT_REGISTER_ROLE_ID || "1", 10);
      roleId = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    } else {
      roleId = parseInt(roleId, 10);
    }

    const role = await Role.findByPk(roleId);
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
      role_id: roleId,
      avatar_url: req.body.avatar_url || null
    });

    await createCustomerProfileIfClient(user, role, req.body, name);

    return res.status(201).json({
      message: "Inscription réussie",
      data: { id: user.id, name: user.name, email: user.email, role_id: user.role_id }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de l'inscription",
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name"]
        }
      ]
    });

    if (!user) return res.status(401).json({ message: "Email ou mot de passe invalide" });

    const hashMatch = await bcrypt.compare(password, user.password).catch(() => false);
    if (!hashMatch) {
      return res.status(401).json({ message: "Email ou mot de passe invalide" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role_id: user.role_id
      },
      process.env.JWT_SECRET || "dev_secret_change_me",
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la connexion",
      error: error.message
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "role_id", "avatar_url"],
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name", "description"]
        },
        {
          model: Customer,
          as: "customerProfile",
          required: false,
          attributes: ["id", "first_name", "last_name", "phone", "email", "image_url"]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    return res.json({ data: user });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la récupération du profil",
      error: error.message
    });
  }
};

module.exports = { register, login, getMe };

