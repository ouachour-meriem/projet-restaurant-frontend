const Category = require("../models/category");

const { body, query, param, validationResult } = require("express-validator");

const validateCreateCategory = [
  body("name")
    .exists({ checkFalsy: true })
    .withMessage("name est obligatoire")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("name invalide"),
  body("description")
    .optional({ checkFalsy: true })
    .isString()
    .trim(),
  body("image_url").optional({ nullable: true }).isString().trim().isLength({ max: 512 })
];

const createCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Erreur de validation",
        errors: errors.array()
      });
    }

    const { name, description, image_url } = req.body;
    const category = await Category.create({
      name,
      description: description || null,
      image_url: image_url || null
    });

    return res.status(201).json({
      message: "Categorie creee avec succes",
      data: category
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la creation de la categorie",
      error: error.message
    });
  }
};

const validateListCategories = [
  query("page").optional().isInt({ min: 1 }).withMessage("page invalide").toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit doit etre entre 1 et 100")
    .toInt()
];

const getCategories = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Erreur de validation",
        errors: errors.array()
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const { rows, count } = await Category.findAndCountAll({
      limit,
      offset,
      order: [["id", "DESC"]]
    });

    return res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 0
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la recuperation des categories",
      error: error.message
    });
  }
};

const validateCategoryId = [
  param("id").isInt({ min: 1 }).withMessage("id invalide").toInt()
];

const getCategoryById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Erreur de validation",
        errors: errors.array()
      });
    }

    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Categorie introuvable" });
    }

    return res.json({ data: category });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la recuperation de la categorie",
      error: error.message
    });
  }
};

module.exports = {
  createCategory,
  validateCreateCategory,
  getCategories,
  validateListCategories,
  getCategoryById,
  validateCategoryId
};
