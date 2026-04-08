const { body } = require("express-validator");

const loginValidation = [
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
];

const registerValidation = [
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
    .optional()
    .isInt({ min: 1 })
    .withMessage("role_id doit être un entier positif"),
  body("avatar_url").optional({ nullable: true }).isString().isLength({ max: 512 }),
  body("first_name").optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body("last_name").optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body("phone").optional({ nullable: true }).isString().trim(),
  body("customer_image_url").optional({ nullable: true }).isString().isLength({ max: 512 })
];

module.exports = { loginValidation, registerValidation };

