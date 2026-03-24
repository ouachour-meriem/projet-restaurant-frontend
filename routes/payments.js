const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createPayment,
  validateCreatePayment
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/", authMiddleware, validateCreatePayment, createPayment);

module.exports = router;
