
const express = require("express");

const categoryController = require("../../controller/category/category.controller");
const Auth = require("../../middleware/auth");
const adminSecret = require("../../middleware/adminSecret");
const authorize = require("../../middleware/authorize");

const router = express.Router();

// PUBLIC ROUTES
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);

// ADMIN ROUTES
router.post(
  "/",
  Auth,
  authorize("admin"),
  adminSecret,
  categoryController.createCategory
);

router.put(
  "/:id",
  Auth,
  authorize("admin"),
  adminSecret,
  categoryController.updateCategory
);

router.delete(
  "/:id",
  Auth,
  authorize("admin"),
  adminSecret,
  categoryController.deleteCategory
);

module.exports = router;
