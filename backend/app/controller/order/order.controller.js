const mongoose = require("mongoose");
const Order = require("../../models/order/order.model");
const Cart = require("../../models/cart/cart.model");
const Food = require("../../models/food/food.model");
const Restaurant = require("../../models/restaurent/restaurant.model");

class OrderController {
  // Place order
  placeOrder = async (req, res) => {
    const session = await mongoose.startSession();

    try {
      const { deliveryAddress, paymentMethod = "cod" } = req.body;

      if (
        !deliveryAddress?.street ||
        !deliveryAddress?.city ||
        !deliveryAddress?.state ||
        !deliveryAddress?.pincode ||
        !deliveryAddress?.phone
      ) {
        return res.status(400).json({
          status: false,
          message: "Complete delivery address is required",
        });
      }

      if (!["cod", "online"].includes(paymentMethod)) {
        return res.status(400).json({
          status: false,
          message: "Invalid payment method",
        });
      }

      let createdOrder;

      await session.withTransaction(async () => {
        const cart = await Cart.findOne({ user: req.user.id }).session(
          session
        );

        if (!cart || cart.items.length === 0) {
          throw new Error("Your cart is empty");
        }

        const restaurant = await Restaurant.findById(
          cart.restaurant
        ).session(session);

        if (
          !restaurant ||
          !restaurant.isActive ||
          !restaurant.isOpen
        ) {
          throw new Error("Restaurant is currently unavailable");
        }

        const foodIds = cart.items.map((item) => item.food);

        const foods = await Food.find({
          _id: { $in: foodIds },
        }).session(session);

        const foodMap = new Map(
          foods.map((food) => [food._id.toString(), food])
        );

        let subtotal = 0;

        const orderItems = cart.items.map((item) => {
          const food = foodMap.get(item.food.toString());

          if (
            !food ||
            !food.isAvailable ||
            food.restaurant.toString() !== restaurant._id.toString()
          ) {
            throw new Error(
              "One or more food items are unavailable"
            );
          }

          const itemSubtotal = food.price * item.quantity;
          subtotal += itemSubtotal;

          return {
            food: food._id,
            name: food.name,
            quantity: item.quantity,
            price: food.price,
            subtotal: itemSubtotal,
          };
        });

        const deliveryFee = 0;
        const totalAmount = subtotal + deliveryFee;

        const orderNumber = `ORD-${Date.now()}-${Math.floor(
          1000 + Math.random() * 9000
        )}`;

        const [order] = await Order.create(
          [
            {
              orderNumber,
              user: req.user.id,
              restaurant: restaurant._id,
              items: orderItems,
              subtotal,
              deliveryFee,
              totalAmount,
              deliveryAddress,
              paymentMethod,
              paymentStatus: "pending",
              orderStatus: "pending",
            },
          ],
          { session }
        );

        cart.items = [];
        cart.restaurant = null;
        cart.totalPrice = 0;

        await cart.save({ session });

        createdOrder = order;
      });

      return res.status(201).json({
        status: true,
        message: "Order placed successfully",
        data: createdOrder,
      });
    } catch (error) {
      return res.status(400).json({
        status: false,
        message: error.message,
      });
    } finally {
      await session.endSession();
    }
  };

  // Get logged-in user's orders
  getMyOrders = async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(
        50,
        Math.max(1, Number(req.query.limit) || 10)
      );

      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        Order.find({ user: req.user.id })
          .populate("restaurant", "name image")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),

        Order.countDocuments({ user: req.user.id }),
      ]);

      return res.status(200).json({
        status: true,
        message: "Orders fetched successfully",
        data: orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  };

  // Get order details
  getOrderById = async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          status: false,
          message: "Invalid order ID",
        });
      }

      const order = await Order.findOne({
        _id: id,
        user: req.user.id,
      }).populate("restaurant", "name image phone address");

      if (!order) {
        return res.status(404).json({
          status: false,
          message: "Order not found",
        });
      }

      return res.status(200).json({
        status: true,
        message: "Order details fetched successfully",
        data: order,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  };

  // Cancel order by user
  cancelOrder = async (req, res) => {
    try {
      const { id } = req.params;
      const { cancellationReason } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          status: false,
          message: "Invalid order ID",
        });
      }

      const order = await Order.findOne({
        _id: id,
        user: req.user.id,
      });

      if (!order) {
        return res.status(404).json({
          status: false,
          message: "Order not found",
        });
      }

      if (order.orderStatus !== "pending") {
        return res.status(400).json({
          status: false,
          message: "Only pending orders can be cancelled",
        });
      }

      order.orderStatus = "cancelled";
      order.cancelledBy = req.user.id;
      order.cancellationReason =
        cancellationReason || "Cancelled by customer";

      await order.save();

      return res.status(200).json({
        status: true,
        message: "Order cancelled successfully",
        data: order,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  };

  // Get orders belonging to owner's restaurants
  getRestaurantOrders = async (req, res) => {
    try {
      const { status, page = 1, limit = 10 } = req.query;

      const currentPage = Math.max(1, Number(page) || 1);
      const currentLimit = Math.min(
        50,
        Math.max(1, Number(limit) || 10)
      );

      const restaurants = await Restaurant.find({
        owner: req.user.id,
      }).select("_id");

      const restaurantIds = restaurants.map((item) => item._id);

      const filter = {
        restaurant: { $in: restaurantIds },
      };

      const allowedStatuses = [
        "pending",
        "accepted",
        "rejected",
        "preparing",
        "out-for-delivery",
        "delivered",
        "cancelled",
      ];

      if (status) {
        if (!allowedStatuses.includes(status)) {
          return res.status(400).json({
            status: false,
            message: "Invalid order status",
          });
        }

        filter.orderStatus = status;
      }

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate("user", "name email phone")
          .populate("restaurant", "name")
          .sort({ createdAt: -1 })
          .skip((currentPage - 1) * currentLimit)
          .limit(currentLimit),

        Order.countDocuments(filter),
      ]);

      return res.status(200).json({
        status: true,
        message: "Restaurant orders fetched successfully",
        data: orders,
        pagination: {
          total,
          page: currentPage,
          limit: currentLimit,
          totalPages: Math.ceil(total / currentLimit),
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  };

  // Update order status by restaurant owner
  updateOrderStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { orderStatus } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          status: false,
          message: "Invalid order ID",
        });
      }

      const allowedTransitions = {
        pending: ["accepted", "rejected"],
        accepted: ["preparing"],
        preparing: ["out-for-delivery"],
        "out-for-delivery": ["delivered"],
      };

      const order = await Order.findById(id);

      if (!order) {
        return res.status(404).json({
          status: false,
          message: "Order not found",
        });
      }

      const restaurant = await Restaurant.findOne({
        _id: order.restaurant,
        owner: req.user.id,
      });

      if (!restaurant) {
        return res.status(403).json({
          status: false,
          message: "You are not authorized to update this order",
        });
      }

      const nextStatuses = allowedTransitions[order.orderStatus] || [];

      if (!nextStatuses.includes(orderStatus)) {
        return res.status(400).json({
          status: false,
          message: `Cannot change order status from ${order.orderStatus} to ${orderStatus}`,
        });
      }

      order.orderStatus = orderStatus;

      await order.save();

      return res.status(200).json({
        status: true,
        message: "Order status updated successfully",
        data: order,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
  };
}

module.exports = new OrderController();