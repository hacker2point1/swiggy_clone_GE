const mongoose = require("mongoose");
const Cart = require("../../models/cart/cart.model");
const Food = require("../../models/food/food.model");

class CartController {
  // Recalculate cart total
  calculateTotal(cart) {
    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  // Add food to cart
  addToCart = async (req, res) => {
    try {
      const { foodId, quantity = 1 } = req.body;

      if (!mongoose.isValidObjectId(foodId)) {
        return res.status(400).json({
          status: false,
          message: "Invalid food ID",
        });
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          status: false,
          message: "Quantity must be a positive integer",
        });
      }

      const food = await Food.findById(foodId).populate("restaurant");

      if (!food || !food.isAvailable) {
        return res.status(404).json({
          status: false,
          message: "Food is not available",
        });
      }

      if (
        !food.restaurant ||
        !food.restaurant.isActive ||
        !food.restaurant.isOpen
      ) {
        return res.status(400).json({
          status: false,
          message: "Restaurant is currently unavailable",
        });
      }

      let cart = await Cart.findOne({ user: req.user.id });

      if (!cart) {
        cart = new Cart({
          user: req.user.id,
          restaurant: food.restaurant._id,
          items: [],
        });
      }

      // Replace cart if food belongs to another restaurant
      if (
        cart.restaurant &&
        cart.restaurant.toString() !== food.restaurant._id.toString()
      ) {
        cart.items = [];
        cart.restaurant = food.restaurant._id;
      }

      const existingItem = cart.items.find(
        (item) => item.food.toString() === foodId
      );

      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.price = food.price;
      } else {
        cart.items.push({
          food: food._id,
          quantity,
          price: food.price,
        });
      }

      this.calculateTotal(cart);
      await cart.save();

      const updatedCart = await Cart.findById(cart._id).populate(
        "items.food",
        "name image price foodType"
      );

      return res.status(200).json({
        status: true,
        message: "Food added to cart successfully",
        data: updatedCart,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  };

  // Get logged-in user's cart
  getCart = async (req, res) => {
    try {
      const cart = await Cart.findOne({ user: req.user.id })
        .populate("items.food", "name image price foodType isAvailable")
        .populate("restaurant", "name image");

      return res.status(200).json({
        status: true,
        message: cart ? "Cart fetched successfully" : "Cart is empty",
        data: cart,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  };

  // Update food quantity
  updateQuantity = async (req, res) => {
    try {
      const { foodId } = req.params;
      const { quantity } = req.body;

      if (!mongoose.isValidObjectId(foodId)) {
        return res.status(400).json({
          status: false,
          message: "Invalid food ID",
        });
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          status: false,
          message: "Quantity must be a positive integer",
        });
      }

      const cart = await Cart.findOne({ user: req.user.id });

      if (!cart) {
        return res.status(404).json({
          status: false,
          message: "Cart not found",
        });
      }

      const item = cart.items.find(
        (item) => item.food.toString() === foodId
      );

      if (!item) {
        return res.status(404).json({
          status: false,
          message: "Food not found in cart",
        });
      }

      item.quantity = quantity;

      this.calculateTotal(cart);
      await cart.save();

      const updatedCart = await Cart.findById(cart._id).populate(
        "items.food",
        "name image price foodType"
      );

      return res.status(200).json({
        status: true,
        message: "Cart quantity updated successfully",
        data: updatedCart,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  };

  // Remove food from cart
  removeItem = async (req, res) => {
    try {
      const { foodId } = req.params;

      if (!mongoose.isValidObjectId(foodId)) {
        return res.status(400).json({
          status: false,
          message: "Invalid food ID",
        });
      }

      const cart = await Cart.findOne({ user: req.user.id });

      if (!cart) {
        return res.status(404).json({
          status: false,
          message: "Cart not found",
        });
      }

      const initialLength = cart.items.length;

      cart.items = cart.items.filter(
        (item) => item.food.toString() !== foodId
      );

      if (cart.items.length === initialLength) {
        return res.status(404).json({
          status: false,
          message: "Food not found in cart",
        });
      }

      if (cart.items.length === 0) {
        cart.restaurant = null;
      }

      this.calculateTotal(cart);
      await cart.save();

      return res.status(200).json({
        status: true,
        message: "Food removed from cart successfully",
        data: cart,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  };

  // Clear entire cart
  clearCart = async (req, res) => {
    try {
      const cart = await Cart.findOne({ user: req.user.id });

      if (!cart) {
        return res.status(404).json({
          status: false,
          message: "Cart not found",
        });
      }

      cart.items = [];
      cart.restaurant = null;
      cart.totalPrice = 0;

      await cart.save();

      return res.status(200).json({
        status: true,
        message: "Cart cleared successfully",
        data: cart,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  };
}

module.exports = new CartController();