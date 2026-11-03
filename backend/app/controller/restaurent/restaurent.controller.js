
const Restaurant = require("../../models/restaurent/restaurant.model");

class RestaurantController {
  // CREATE RESTAURANT
  async createRestaurant(req, res) {
    try {
      const {
        name,
        description,
        image,
        cuisine,
        address,
        phone,
        openingTime,
        closingTime,
      } = req.body;

      if (!name || !address) {
        return res.status(400).json({
          success: false,
          message: "Restaurant name and address are required",
        });
      }

      const restaurant = await Restaurant.create({
        name,
        description,
        image,
        cuisine,
        address,
        phone,
        openingTime,
        closingTime,
        owner: req.user.id,
      });

      return res.status(201).json({
        success: true,
        message: "Restaurant created successfully",
        data: restaurant,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET MY RESTAURANTS
  async getMyRestaurants(req, res) {
    try {
      const restaurants = await Restaurant.find({
        owner: req.user.id,
      });

      return res.status(200).json({
        success: true,
        count: restaurants.length,
        data: restaurants,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET ALL RESTAURANTS
  async getAllRestaurants(req, res) {
    try {
      const { search, city, cuisine } = req.query;

      const filter = {
        isActive: true,
      };

      if (search) {
        filter.name = {
          $regex: search,
          $options: "i",
        };
      }

      if (city) {
        filter["address.city"] = {
          $regex: city,
          $options: "i",
        };
      }

      if (cuisine) {
        filter.cuisine = {
          $regex: cuisine,
          $options: "i",
        };
      }

      const restaurants = await Restaurant.find(filter)
        .populate("owner", "name email")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: restaurants.length,
        data: restaurants,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET RESTAURANT BY ID
  async getRestaurantById(req, res) {
    try {
      const restaurant = await Restaurant.findOne({
        _id: req.params.id,
        isActive: true,
      }).populate("owner", "name email");

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: restaurant,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // UPDATE RESTAURANT
  async updateRestaurant(req, res) {
    try {
      const restaurant = await Restaurant.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found or unauthorized access",
        });
      }

      const allowedFields = [
        "name",
        "description",
        "image",
        "cuisine",
        "address",
        "phone",
        "openingTime",
        "closingTime",
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          restaurant[field] = req.body[field];
        }
      });

      await restaurant.save();

      return res.status(200).json({
        success: true,
        message: "Restaurant updated successfully",
        data: restaurant,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // UPDATE RESTAURANT OPEN/CLOSED STATUS
  async updateRestaurantStatus(req, res) {
    try {
      const { isOpen } = req.body;

      if (typeof isOpen !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isOpen must be a boolean value",
        });
      }

      const restaurant = await Restaurant.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found or unauthorized access",
        });
      }

      restaurant.isOpen = isOpen;

      await restaurant.save();

      return res.status(200).json({
        success: true,
        message: `Restaurant ${isOpen ? "opened" : "closed"} successfully`,
        data: restaurant,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new RestaurantController();
