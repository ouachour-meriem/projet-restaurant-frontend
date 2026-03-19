const express = require("express");
const { createRole, getRoles } = require("../controllers/roleController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { createRoleValidation } = require("../validators/roleValidators");

const router = express.Router();

router.get("/", getRoles);
router.post("/", authMiddleware, createRoleValidation, validateRequest, createRole);

module.exports = router;

