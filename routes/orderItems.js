const express = require("express");
const { addItemToOrder } = require("../controllers/orderItemController");

const router = express.Router();

router.post("/", addItemToOrder);

module.exports = router;
