const express = require("express");
const {
  createCategory,
  validateCreateCategory,
  getCategories,
  validateListCategories,
  getCategoryById,
  validateCategoryId
} = require("../controllers/categoryController");

const router = express.Router();

router.get("/", validateListCategories, getCategories);
router.get("/:id", validateCategoryId, getCategoryById);
router.post("/", validateCreateCategory, createCategory);

module.exports = router;
