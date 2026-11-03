
const express = require("express");

const restaurantController = require("../../controller/restaurent/restaurent.controller");

const Auth = require("../../middleware/auth");
const authorize = require("../../middleware/authorize");

const router = express.Router();

// PUBLIC ROUTES
router.get("/", restaurantController.getAllRestaurants);
router.get("/:id", restaurantController.getRestaurantById);

// OWNER ROUTES
router.post(
  "/",
  Auth,
  authorize("owner"),
  restaurantController.createRestaurant
);

router.get(
  "/owner/my-restaurants",
  Auth,
  authorize("owner"),
  restaurantController.getMyRestaurants
);

router.put(
  "/:id",
  Auth,
  authorize("owner"),
  restaurantController.updateRestaurant
);

router.patch(
  "/:id/status",
  Auth,
  authorize("owner"),
  restaurantController.updateRestaurantStatus
);

module.exports = router;
