const Order = require("../models/order");
const Product = require("../models/product");
const OrderItem = require("../models/orderItem");

const { body, validationResult } = require("express-validator");

const validateAddItemToOrder = [
  body("quantity")
    .exists({ checkFalsy: true })
    .withMessage("quantity est obligatoire")
    .bail()
    .isInt({ allow_leading_zeroes: false })
    .withMessage("quantity doit etre un entier")
    .bail()
    .custom((value) => Number(value) > 0)
    .withMessage("quantity doit etre > 0")
    .toInt(),

  body("price")
    .exists({ checkFalsy: true })
    .withMessage("price est obligatoire")
    .bail()
    .isNumeric()
    .withMessage("price doit etre numerique")
    .bail()
    .toFloat(),

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

  body("product_id")
    .exists({ checkFalsy: true })
    .withMessage("product_id est obligatoire")
    .bail()
    .isInt()
    .withMessage("product_id doit etre un entier")
    .bail()
    .custom((value) => Number(value) > 0)
    .withMessage("product_id doit etre > 0")
    .toInt()
];

const addItemToOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Erreur de validation",
        errors: errors.array()
      });
    }

    const { quantity, price, order_id, product_id } = req.body;

    const order = await Order.findByPk(order_id);
    if (!order) return res.status(404).json({ message: "Commande introuvable" });

    const product = await Product.findByPk(product_id);
    if (!product) return res.status(404).json({ message: "Produit introuvable" });

    const item = await OrderItem.create({ quantity, price, order_id, product_id });
    return res.status(201).json({ message: "Article ajoute a la commande", data: item });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de l'ajout de l'article",
      error: error.message
    });
  }
};

module.exports = { addItemToOrder, validateAddItemToOrder };
