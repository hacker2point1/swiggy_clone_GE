const express = require("express");
const orderController = require("../../controller/order/order.controller");
const Auth = require("../../middleware/auth");
const authorize = require("../../middleware/authorize");

const router = express.Router();
// Owner routes first
router.get(
  "/owner/orders",
  Auth,
  authorize("owner"),
  orderController.getRestaurantOrders
);

router.patch(
  "/owner/:id/status",
  Auth,
  authorize("owner"),
  orderController.updateOrderStatus
);

// Customer routes
router.post("/place", Auth, authorize("user"), orderController.placeOrder);
router.get("/my-orders", Auth, authorize("user"), orderController.getMyOrders);
router.patch("/:id/cancel", Auth, authorize("user"), orderController.cancelOrder);
router.get("/:id", Auth, authorize("user"), orderController.getOrderById);

module.exports = router;