const express = require("express");
const {
  createPayment,
  validateCreatePayment
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/", validateCreatePayment, createPayment);

module.exports = router;
