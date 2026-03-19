const { body } = require("express-validator");

const createRoleValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("name est obligatoire")
    .isLength({ min: 2, max: 100 })
    .withMessage("name doit contenir entre 2 et 100 caractères"),
  body("description")
    .optional()
    .isString()
    .withMessage("description doit être une chaîne de caractères")
];

module.exports = { createRoleValidation };

