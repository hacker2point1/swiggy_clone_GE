const express = require("express");
const cartController = require("../../controller/cart/cart.controller");
const Auth = require("../../middleware/auth");
const authorize = require("../../middleware/authorize");

const router = express.Router();

// All cart routes require user authentication
router.use(Auth, authorize("user"));

router.post("/add", cartController.addToCart);
router.get("/", cartController.getCart);
router.patch("/update/:foodId", cartController.updateQuantity);
router.delete("/remove/:foodId", cartController.removeItem);
router.delete("/clear", cartController.clearCart);

module.exports = router;