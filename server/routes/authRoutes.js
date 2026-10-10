const express = require("express");
const router = express.Router();
const { register, login, logout, getMe } = require("../controllers/authController");
const { validateRegister, validateLogin } = require("../middleware/validate");
const { protect } = require("../middleware/auth");

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/logout", logout);
router.get("/me", protect, getMe);

module.exports = router;
