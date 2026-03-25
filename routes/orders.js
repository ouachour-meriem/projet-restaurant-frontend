const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createOrder,
  validateCreateOrder,
  getOrders,
  validateListOrders,
  getOrderById,
  validateOrderId
} = require("../controllers/orderController");

const router = express.Router();

router.get("/", authMiddleware, validateListOrders, getOrders);
router.get("/:id", authMiddleware, validateOrderId, getOrderById);
router.post("/", authMiddleware, validateCreateOrder, createOrder);

module.exports = router;
