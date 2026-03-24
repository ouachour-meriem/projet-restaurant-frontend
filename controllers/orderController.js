const Order = require("../models/order");
const Customer = require("../models/customer");

const { body, query, param, validationResult } = require("express-validator");

const validateCreateOrder = [
  body("customer_id")
    .exists({ checkFalsy: true })
    .withMessage("customer_id est obligatoire")
    .bail()
    .isInt()
    .withMessage("customer_id doit etre un entier")
    .bail()
    .custom((value) => Number(value) > 0)
    .withMessage("customer_id doit etre > 0")
    .toInt(),
  body("status")
    .exists({ checkFalsy: true })
    .withMessage("status est obligatoire")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("status invalide"),
  body("total_amount")
    .exists({ checkFalsy: true })
    .withMessage("total_amount est obligatoire")
    .bail()
    .isNumeric()
    .withMessage("total_amount doit etre numerique")
    .bail()
    .toFloat(),
  body("order_date")
    .exists({ checkFalsy: true })
    .withMessage("order_date est obligatoire")
    .bail()
    .isISO8601()
    .withMessage("order_date doit etre une date ISO8601 valide")
];

const createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Erreur de validation",
        errors: errors.array()
      });
    }

    const { customer_id, status, total_amount, order_date } = req.body;

    const customer = await Customer.findByPk(customer_id);
    if (!customer) {
      return res.status(404).json({ message: "Client introuvable" });
    }

    const order = await Order.create({
      customer_id,
      status,
      total_amount,
      order_date: new Date(order_date)
    });

    return res.status(201).json({
      message: "Commande creee avec succes",
      data: order
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la creation de la commande",
      error: error.message
    });
  }
};

const validateListOrders = [
  query("page").optional().isInt({ min: 1 }).withMessage("page invalide").toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit doit etre entre 1 et 100")
    .toInt(),
  query("customer_id").optional().isInt({ min: 1 }).withMessage("customer_id invalide").toInt(),
  query("status").optional().isString().trim()
];

const getOrders = async (req, res) => {
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
    if (req.query.customer_id != null && req.query.customer_id !== "") {
      where.customer_id = req.query.customer_id;
    }
    if (req.query.status != null && req.query.status !== "") {
      where.status = req.query.status;
    }

    const { rows, count } = await Order.findAndCountAll({
      where,
      limit,
      offset,
      order: [["id", "DESC"]],
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "first_name", "last_name", "email", "phone"]
        }
      ]
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
      message: "Erreur lors de la recuperation des commandes",
      error: error.message
    });
  }
};

const validateOrderId = [
  param("id").isInt({ min: 1 }).withMessage("id invalide").toInt()
];

const getOrderById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Erreur de validation",
        errors: errors.array()
      });
    }

    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "first_name", "last_name", "email", "phone"]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: "Commande introuvable" });
    }

    return res.json({ data: order });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la recuperation de la commande",
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  validateCreateOrder,
  getOrders,
  validateListOrders,
  getOrderById,
  validateOrderId
};
