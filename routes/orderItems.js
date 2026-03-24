const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  addItemToOrder,
  validateAddItemToOrder
} = require("../controllers/orderItemController");

const router = express.Router();

router.post("/", authMiddleware, validateAddItemToOrder, addItemToOrder);

module.exports = router;
