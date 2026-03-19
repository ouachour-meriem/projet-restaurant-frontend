const express = require("express");
const { createUser, getUsers } = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { createUserValidation, getUsersValidation } = require("../validators/userValidators");

const router = express.Router();

router.post("/", createUserValidation, validateRequest, createUser);
router.get("/", authMiddleware, getUsersValidation, validateRequest, getUsers);

module.exports = router;

