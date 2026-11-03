const mongoose = require('mongoose')

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    image: {
      type: String,
    },

    cuisine: [{
      type: String,
    }],

    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: undefined,
        },
      },
    },

    phone: {
      type: String,
    },

    openingTime: {
      type: String,
    },

    closingTime: {
      type: String,
    },

    isOpen: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    rating: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

restaurantSchema.index({ "address.coordinates": "2dsphere" });

module.exports =
  mongoose.models.Restaurant ||
  mongoose.model("Restaurant", restaurantSchema, "restaurents");