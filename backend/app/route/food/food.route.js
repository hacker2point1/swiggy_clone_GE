
const express = require("express");

const foodController = require("../../controller/food/food.controller");
const Auth = require("../../middleware/auth");
const authorize = require("../../middleware/authorize");

const router = express.Router();

// PUBLIC ROUTES
router.get("/", foodController.getAllFood);
router.get("/:id", foodController.getFoodById);

// OWNER ROUTES
router.post(
  "/",
  Auth,
  authorize("owner"),
  foodController.addFood
);

router.put(
  "/:id",
  Auth,
  authorize("owner"),
  foodController.updateFood
);

router.delete(
  "/:id",
  Auth,
  authorize("owner"),
  foodController.deleteFood
);

router.patch(
  "/:id/availability",
  Auth,
  authorize("owner"),
  foodController.updateFoodAvailability
);

module.exports = router;
