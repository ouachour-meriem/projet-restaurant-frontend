const Order = require("../models/order");
const Payment = require("../models/payment");

const createPayment = async (req, res) => {
  try {
    const { order_id, amount, payment_method, payment_date, status } = req.body;

    if (!order_id || !amount || !payment_method || !status) {
      return res.status(400).json({
        message: "order_id, amount, payment_method et status sont obligatoires"
      });
    }

    const order = await Order.findByPk(order_id);
    if (!order) return res.status(404).json({ message: "Commande introuvable" });

    const payment = await Payment.create({
      order_id,
      amount,
      payment_method,
      payment_date: payment_date || new Date(),
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

module.exports = { createPayment };
