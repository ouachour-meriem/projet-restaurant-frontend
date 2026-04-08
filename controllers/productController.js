const Product = require("../models/product");
const Category = require("../models/category");

const { body, query, param, validationResult } = require("express-validator");

const validateCreateProduct = [
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
  body("price")
    .exists()
    .withMessage("price est obligatoire")
    .bail()
    .isNumeric()
    .withMessage("price doit etre numerique")
    .bail()
    .toFloat(),
  body("stock")
    .exists()
    .withMessage("stock est obligatoire")
    .bail()
    .isInt({ allow_leading_zeroes: false })
    .withMessage("stock doit etre un entier")
    .bail()
    .custom((value) => Number(value) >= 0)
    .withMessage("stock doit etre >= 0")
    .toInt(),
  body("category_id")
    .exists({ checkFalsy: true })
    .withMessage("category_id est obligatoire")
    .bail()
    .isInt()
    .withMessage("category_id doit etre un entier")
    .bail()
    .custom((value) => Number(value) > 0)
    .withMessage("category_id doit etre > 0")
    .toInt(),
  body("image_url").optional({ nullable: true }).isString().trim().isLength({ max: 512 })
];

const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Erreur de validation",
        errors: errors.array()
      });
    }

    const { name, description, price, stock, category_id, image_url } = req.body;

    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ message: "Categorie introuvable" });
    }

    const product = await Product.create({
      name,
      description: description || null,
      price,
      stock,
      category_id,
      image_url: image_url || null
    });

    return res.status(201).json({
      message: "Produit cree avec succes",
      data: product
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la creation du produit",
      error: error.message
    });
  }
};

const validateListProducts = [
  query("page").optional().isInt({ min: 1 }).withMessage("page invalide").toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit doit etre entre 1 et 100")
    .toInt(),
  query("category_id").optional().isInt({ min: 1 }).withMessage("category_id invalide").toInt()
];

const getProducts = async (req, res) => {
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

    const where = {};
    if (req.query.category_id != null && req.query.category_id !== "") {
      where.category_id = req.query.category_id;
    }

    const { rows, count } = await Product.findAndCountAll({
      where,
      limit,
      offset,
      order: [["id", "DESC"]],
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "description", "image_url"]
        }
      ]
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
      message: "Erreur lors de la recuperation des produits",
      error: error.message
    });
  }
};

const validateProductId = [
  param("id").isInt({ min: 1 }).withMessage("id invalide").toInt()
];

const getProductById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Erreur de validation",
        errors: errors.array()
      });
    }

    const product = await Product.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "description", "image_url"]
        }
      ]
    });

    if (!product) {
      return res.status(404).json({ message: "Produit introuvable" });
    }

    return res.json({ data: product });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la recuperation du produit",
      error: error.message
    });
  }
};

module.exports = {
  createProduct,
  validateCreateProduct,
  getProducts,
  validateListProducts,
  getProductById,
  validateProductId
};
