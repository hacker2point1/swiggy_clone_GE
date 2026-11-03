
const mongoose = require("mongoose");

const Food = require("../../models/food/food.model");
const Restaurant = require("../../models/restaurent/restaurant.model");
const Category = require("../../models/category/category.model");

class FoodController {
  // ADD FOOD
  async addFood(req, res) {
    try {
      const {
        name,
        description,
        restaurant,
        category,
        price,
        image,
        foodType,
        preparationTime,
      } = req.body;

      if (!name || !restaurant || !category || price === undefined || !foodType) {
        return res.status(400).json({
          success: false,
          message: "Name, restaurant, category, price and food type are required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(restaurant) ||
          !mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid restaurant or category ID",
        });
      }

      if (!Number.isFinite(Number(price)) || Number(price) < 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid non-negative number",
        });
      }

      if (!["veg", "non-veg"].includes(foodType)) {
        return res.status(400).json({
          success: false,
          message: "Food type must be veg or non-veg",
        });
      }

      // Verify restaurant ownership
      const restaurantData = await Restaurant.findOne({
        _id: restaurant,
        owner: req.user.id,
        isActive: true,
      });

      if (!restaurantData) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found or unauthorized access",
        });
      }

      // Verify category
      const categoryData = await Category.findOne({
        _id: category,
        isActive: true,
      });

      if (!categoryData) {
        return res.status(404).json({
          success: false,
          message: "Category not found or inactive",
        });
      }

      const food = await Food.create({
        name,
        description,
        restaurant,
        category,
        price: Number(price),
        image,
        foodType,
        preparationTime,
      });

      return res.status(201).json({
        success: true,
        message: "Food added successfully",
        data: food,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET ALL FOOD WITH SEARCH AND FILTER
  async getAllFood(req, res) {
    try {
      const {
        search,
        restaurant,
        category,
        foodType,
        minPrice,
        maxPrice,
        page = 1,
        limit = 10,
      } = req.query;

      const currentPage = Math.max(1, Number(page));
      const pageLimit = Math.min(100, Math.max(1, Number(limit)));

      const filter = {
        isAvailable: true,
      };

      if (search) {
        filter.name = {
          $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        };
      }

      if (category) {
        if (!mongoose.Types.ObjectId.isValid(category)) {
          return res.status(400).json({
            success: false,
            message: "Invalid category ID",
          });
        }

        filter.category = category;
      }

      if (foodType) {
        if (!["veg", "non-veg"].includes(foodType)) {
          return res.status(400).json({
            success: false,
            message: "Food type must be veg or non-veg",
          });
        }

        filter.foodType = foodType;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        const priceFilter = {};

        if (minPrice !== undefined) {
          if (!Number.isFinite(Number(minPrice)) || Number(minPrice) < 0) {
            return res.status(400).json({
              success: false,
              message: "Invalid minimum price",
            });
          }

          priceFilter.$gte = Number(minPrice);
        }

        if (maxPrice !== undefined) {
          if (!Number.isFinite(Number(maxPrice)) || Number(maxPrice) < 0) {
            return res.status(400).json({
              success: false,
              message: "Invalid maximum price",
            });
          }

          priceFilter.$lte = Number(maxPrice);
        }

        if (
          priceFilter.$gte !== undefined &&
          priceFilter.$lte !== undefined &&
          priceFilter.$gte > priceFilter.$lte
        ) {
          return res.status(400).json({
            success: false,
            message: "Minimum price cannot exceed maximum price",
          });
        }

        filter.price = priceFilter;
      }

      // Only show food from active restaurants
      const restaurantFilter = {
        isActive: true,
        isOpen: true,
      };

      if (restaurant) {
        if (!mongoose.Types.ObjectId.isValid(restaurant)) {
          return res.status(400).json({
            success: false,
            message: "Invalid restaurant ID",
          });
        }

        restaurantFilter._id = restaurant;
      }

      const activeRestaurants = await Restaurant.find(restaurantFilter)
        .select("_id");

      filter.restaurant = {
        $in: activeRestaurants.map((item) => item._id),
      };

      const [foods, total] = await Promise.all([
        Food.find(filter)
          .populate("restaurant", "name image address")
          .populate("category", "name slug")
          .sort({ createdAt: -1 })
          .skip((currentPage - 1) * pageLimit)
          .limit(pageLimit),

        Food.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        count: foods.length,
        total,
        currentPage,
        totalPages: Math.ceil(total / pageLimit),
        data: foods,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET FOOD BY ID
  async getFoodById(req, res) {
    try {
      const food = await Food.findOne({
        _id: req.params.id,
        isAvailable: true,
      })
        .populate("restaurant", "name image address isOpen isActive")
        .populate("category", "name slug");

      if (
        !food ||
        !food.restaurant ||
        !food.restaurant.isActive ||
        !food.restaurant.isOpen
      ) {
        return res.status(404).json({
          success: false,
          message: "Food not found or unavailable",
        });
      }

      return res.status(200).json({
        success: true,
        data: food,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // UPDATE FOOD
  async updateFood(req, res) {
    try {
      const food = await Food.findById(req.params.id);

      if (!food) {
        return res.status(404).json({
          success: false,
          message: "Food not found",
        });
      }

      // Verify ownership through restaurant
      const restaurant = await Restaurant.findOne({
        _id: food.restaurant,
        owner: req.user.id,
      });

      if (!restaurant) {
        return res.status(403).json({
          success: false,
          message: "You cannot update another owner's food",
        });
      }

      const allowedFields = [
        "name",
        "description",
        "price",
        "image",
        "foodType",
        "preparationTime",
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          food[field] = req.body[field];
        }
      });

      if (
        food.price === undefined ||
        !Number.isFinite(Number(food.price)) ||
        Number(food.price) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid non-negative number",
        });
      }

      if (!["veg", "non-veg"].includes(food.foodType)) {
        return res.status(400).json({
          success: false,
          message: "Food type must be veg or non-veg",
        });
      }

      // Update restaurant if supplied
      if (req.body.restaurant !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(req.body.restaurant)) {
          return res.status(400).json({
            success: false,
            message: "Invalid restaurant ID",
          });
        }

        const newRestaurant = await Restaurant.findOne({
          _id: req.body.restaurant,
          owner: req.user.id,
          isActive: true,
        });

        if (!newRestaurant) {
          return res.status(404).json({
            success: false,
            message: "Restaurant not found or unauthorized access",
          });
        }

        food.restaurant = newRestaurant._id;
      }

      // Update category if supplied
      if (req.body.category !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(req.body.category)) {
          return res.status(400).json({
            success: false,
            message: "Invalid category ID",
          });
        }

        const category = await Category.findOne({
          _id: req.body.category,
          isActive: true,
        });

        if (!category) {
          return res.status(404).json({
            success: false,
            message: "Category not found or inactive",
          });
        }

        food.category = category._id;
      }

      await food.save();

      return res.status(200).json({
        success: true,
        message: "Food updated successfully",
        data: food,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // DELETE FOOD
  async deleteFood(req, res) {
    try {
      const food = await Food.findById(req.params.id);

      if (!food) {
        return res.status(404).json({
          success: false,
          message: "Food not found",
        });
      }

      const restaurant = await Restaurant.findOne({
        _id: food.restaurant,
        owner: req.user.id,
      });

      if (!restaurant) {
        return res.status(403).json({
          success: false,
          message: "You cannot delete another owner's food",
        });
      }

      await Food.findByIdAndDelete(food._id);

      return res.status(200).json({
        success: true,
        message: "Food deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // UPDATE FOOD AVAILABILITY
  async updateFoodAvailability(req, res) {
    try {
      const { isAvailable } = req.body;

      if (typeof isAvailable !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isAvailable must be a boolean value",
        });
      }

      const food = await Food.findById(req.params.id);

      if (!food) {
        return res.status(404).json({
          success: false,
          message: "Food not found",
        });
      }

      const restaurant = await Restaurant.findOne({
        _id: food.restaurant,
        owner: req.user.id,
      });

      if (!restaurant) {
        return res.status(403).json({
          success: false,
          message: "You cannot update another owner's food",
        });
      }

      food.isAvailable = isAvailable;
      await food.save();

      return res.status(200).json({
        success: true,
        message: "Food availability updated successfully",
        data: food,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new FoodController();
