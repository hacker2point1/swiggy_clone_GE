
const Category = require("../../models/category/category.model");

class CategoryController {
  // CREATE CATEGORY
  async createCategory(req, res) {
    try {
      const { name, description, image } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }

      const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

      const existingCategory = await Category.findOne({
        $or: [
          { name: { $regex: `^${name.trim()}$`, $options: "i" } },
          { slug },
        ],
      });

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: "Category already exists",
        });
      }

      const category = await Category.create({
        name: name.trim(),
        slug,
        description,
        image,
        createdBy: req.user.id,
      });

      return res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET ALL ACTIVE CATEGORIES
  async getAllCategories(req, res) {
    try {
      const categories = await Category.find({
        isActive: true,
      }).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: categories.length,
        data: categories,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET CATEGORY BY ID
  async getCategoryById(req, res) {
    try {
      const category = await Category.findOne({
        _id: req.params.id,
        isActive: true,
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // UPDATE CATEGORY
  async updateCategory(req, res) {
    try {
      const { name, description, image } = req.body;

      const category = await Category.findById(req.params.id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      if (name !== undefined) {
        if (!name.trim()) {
          return res.status(400).json({
            success: false,
            message: "Category name cannot be empty",
          });
        }

        const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

        const existingCategory = await Category.findOne({
          _id: { $ne: category._id },
          $or: [
            { name: { $regex: `^${name.trim()}$`, $options: "i" } },
            { slug },
          ],
        });

        if (existingCategory) {
          return res.status(409).json({
            success: false,
            message: "Category name already exists",
          });
        }

        category.name = name.trim();
        category.slug = slug;
      }

      if (description !== undefined) {
        category.description = description;
      }

      if (image !== undefined) {
        category.image = image;
      }

      await category.save();

      return res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: category,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // DELETE CATEGORY (SOFT DELETE)
  async deleteCategory(req, res) {
    try {
      const category = await Category.findById(req.params.id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      category.isActive = false;
      await category.save();

      return res.status(200).json({
        success: true,
        message: "Category deactivated successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new CategoryController();
