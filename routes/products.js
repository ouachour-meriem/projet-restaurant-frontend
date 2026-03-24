const express = require("express");
const {
  createProduct,
  validateCreateProduct,
  getProducts,
  validateListProducts,
  getProductById,
  validateProductId
} = require("../controllers/productController");

const router = express.Router();

router.get("/", validateListProducts, getProducts);
router.get("/:id", validateProductId, getProductById);
router.post("/", validateCreateProduct, createProduct);

module.exports = router;
