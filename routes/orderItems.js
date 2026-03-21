const express = require("express");
const {
  addItemToOrder,
  validateAddItemToOrder
} = require("../controllers/orderItemController");

const router = express.Router();

router.post("/", validateAddItemToOrder, addItemToOrder);

module.exports = router;
