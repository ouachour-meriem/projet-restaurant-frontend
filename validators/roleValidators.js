const { body } = require("express-validator");

const createRoleValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("name est obligatoire")
    .isLength({ min: 2, max: 100 })
    .withMessage("name doit contenir entre 2 et 100 caractères"),
  body("description")
    .optional({ nullable: true })
    .trim()
    .isString()
    .withMessage("description doit être une chaîne de caractères")
    .isLength({ max: 65535 })
    .withMessage("description est trop longue"),
  body("image_url")
    .optional({ nullable: true })
    .trim()
    .isString()
    .withMessage("image_url doit être une chaîne de caractères")
    .isLength({ max: 512 })
    .withMessage("image_url est trop longue")
];

module.exports = { createRoleValidation };

