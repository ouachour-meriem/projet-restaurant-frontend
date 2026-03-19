const express = require("express");
const { login } = require("../controllers/authController");
const validateRequest = require("../middleware/validateRequest");
const { loginValidation } = require("../validators/authValidators");

const router = express.Router();

router.post("/login", loginValidation, validateRequest, login);

module.exports = router;

