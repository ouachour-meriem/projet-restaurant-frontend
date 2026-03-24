const Order = require("../models/order");
const Payment = require("../models/payment");

const { body, validationResult } = require("express-validator");

const validateCreatePayment = [
  body("order_id")
    .exists({ checkFalsy: true })
    .withMessage("order_id est obligatoire")
    .bail()
    .isInt()
    .withMessage("order_id doit etre un entier")
    .bail()
    .custom((value) => Number(value) > 0)
    .withMessage("order_id doit etre > 0")
    .toInt(),

  body("amount")
    .exists({ checkFalsy: true })
    .withMessage("amount est obligatoire")
    .bail()
    .isNumeric()
    .withMessage("amount doit etre numerique")
    .bail()
    .toFloat(),

  body("payment_method")
    .exists({ checkFalsy: true })
    .withMessage("payment_method est obligatoire")
    .bail()
    .isString()
    .withMessage("payment_method doit etre une chaine"),

  body("payment_date")
    .exists({ checkFalsy: true })
    .withMessage("payment_date est obligatoire")
    .bail()
    .isISO8601()
    .withMessage("payment_date doit etre une date valide (ISO8601)"),

  body("status")
    .exists({ checkFalsy: true })
    .withMessage("status est obligatoire")
    .bail()
    .isString()
    .withMessage("status doit etre une chaine")
];

const createPayment = async (req, res) => {
  try {
    const { order_id, amount, payment_method, payment_date, status } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Erreur de validation",
        errors: errors.array()
      });
    }

    const order = await Order.findByPk(order_id);
    if (!order) return res.status(404).json({ message: "Commande introuvable" });

    const payment = await Payment.create({
      order_id,
      amount,
      payment_method,
      payment_date: new Date(payment_date),
      status
    });

    return res.status(201).json({ message: "Paiement cree avec succes", data: payment });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la creation du paiement",
      error: error.message
    });
  }
};

module.exports = { createPayment, validateCreatePayment };
