const { body, query } = require("express-validator");

const createUserValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("name est obligatoire")
    .isLength({ min: 2, max: 150 })
    .withMessage("name doit contenir entre 2 et 150 caractères"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("email est obligatoire")
    .isEmail()
    .withMessage("email invalide")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("password est obligatoire")
    .isLength({ min: 6 })
    .withMessage("password doit contenir au moins 6 caractères"),
  body("role_id")
    .notEmpty()
    .withMessage("role_id est obligatoire")
    .isInt({ min: 1 })
    .withMessage("role_id doit être un entier positif")
];

const getUsersValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page doit être un entier >= 1"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit doit être un entier entre 1 et 100")
];

module.exports = { createUserValidation, getUsersValidation };

