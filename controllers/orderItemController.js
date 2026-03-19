const Order = require("../models/order");
const Product = require("../models/product");
const OrderItem = require("../models/orderItem");

const addItemToOrder = async (req, res) => {
  try {
    const { quantity, price, order_id, product_id } = req.body;

    if (!quantity || !price || !order_id || !product_id) {
      return res.status(400).json({
        message: "quantity, price, order_id et product_id sont obligatoires"
      });
    }

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

module.exports = { addItemToOrder };
