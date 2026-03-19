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

module.exports = { loginValidation };

