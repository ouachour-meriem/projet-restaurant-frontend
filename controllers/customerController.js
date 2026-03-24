const { Op } = require("sequelize");
const Customer = require("../models/customer");

const { body, query, param, validationResult } = require("express-validator");

const validateCreateCustomer = [
  body("first_name")
    .exists({ checkFalsy: true })
    .withMessage("first_name est obligatoire")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("first_name invalide"),
  body("last_name")
    .exists({ checkFalsy: true })
    .withMessage("last_name est obligatoire")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("last_name invalide"),
  body("phone").optional({ nullable: true }).isString().trim(),
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("email invalide")
    .normalizeEmail()
];

const createCustomer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Erreur de validation",
        errors: errors.array()
      });
    }

    const { first_name, last_name, phone, email } = req.body;
    const customer = await Customer.create({
      first_name,
      last_name,
      phone: phone || null,
      email: email || null
    });

    return res.status(201).json({
      message: "Client cree avec succes",
      data: customer
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la creation du client",
      error: error.message
    });
  }
};

const validateListCustomers = [
  query("page").optional().isInt({ min: 1 }).withMessage("page invalide").toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit doit etre entre 1 et 100")
    .toInt(),
  query("search").optional().isString().trim()
];

const getCustomers = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Erreur de validation",
        errors: errors.array()
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.search) {
      const s = `%${req.query.search}%`;
      where[Op.or] = [
        { first_name: { [Op.like]: s } },
        { last_name: { [Op.like]: s } },
        { email: { [Op.like]: s } }
      ];
    }

    const { rows, count } = await Customer.findAndCountAll({
      where,
      limit,
      offset,
      order: [["id", "DESC"]]
    });

    return res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 0
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la recuperation des clients",
      error: error.message
    });
  }
};

const validateCustomerId = [
  param("id").isInt({ min: 1 }).withMessage("id invalide").toInt()
];

const getCustomerById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Erreur de validation",
        errors: errors.array()
      });
    }

    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Client introuvable" });
    }

    return res.json({ data: customer });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la recuperation du client",
      error: error.message
    });
  }
};

module.exports = {
  createCustomer,
  validateCreateCustomer,
  getCustomers,
  validateListCustomers,
  getCustomerById,
  validateCustomerId
};
