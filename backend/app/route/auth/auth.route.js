
const express = require("express");
const authController = require("../../controller/auth/auth.controller");
const Auth = require("../../middleware/auth");


const router = express.Router();

router.post("/register", authController.register);
router.post("/verify-otp", authController.verifyOtp);
router.post("/login", authController.login);
router.post("/refresh-token", authController.refreshToken);

router.post("/logout", Auth, authController.logout);

router.get("/profile", Auth, authController.getProfile);
router.put("/profile", Auth, authController.updateProfile);

module.exports = router;
