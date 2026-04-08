const Role = require("../models/role");

const createRole = async (req, res) => {
  try {
    const { name, description, image_url } = req.body;

    const existing = await Role.findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({
        message: "Ce rôle existe déjà"
      });
    }

    const role = await Role.create({
      name,
      description: description || null,
      image_url: image_url || null
    });
    return res.status(201).json({ message: "Rôle créé avec succès", data: role });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la création du rôle",
      error: error.message
    });
  }
};

const getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ["id", "name", "description", "image_url"],
      order: [["id", "ASC"]]
    });

    return res.json({ data: roles });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la récupération des rôles",
      error: error.message
    });
  }
};

module.exports = { createRole, getRoles };

