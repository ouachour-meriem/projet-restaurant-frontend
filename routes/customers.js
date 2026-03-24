const express = require("express");
const {
  createCustomer,
  validateCreateCustomer,
  getCustomers,
  validateListCustomers,
  getCustomerById,
  validateCustomerId
} = require("../controllers/customerController");

const router = express.Router();

router.get("/", validateListCustomers, getCustomers);
router.get("/:id", validateCustomerId, getCustomerById);
router.post("/", validateCreateCustomer, createCustomer);

module.exports = router;
