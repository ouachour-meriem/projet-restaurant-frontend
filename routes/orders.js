const express = require("express");
const {
  createOrder,
  validateCreateOrder,
  getOrders,
  validateListOrders,
  getOrderById,
  validateOrderId
} = require("../controllers/orderController");

const router = express.Router();

router.get("/", validateListOrders, getOrders);
router.get("/:id", validateOrderId, getOrderById);
router.post("/", validateCreateOrder, createOrder);

module.exports = router;
