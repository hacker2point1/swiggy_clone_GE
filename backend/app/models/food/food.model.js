const mongoose = require('mongoose')

const foodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
    },

    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    image: {
      type: String,
    },

    foodType: {
      type: String,
      enum: ["veg", "non-veg"],
      required: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    preparationTime: {
      type: Number,
      default: 20,
    },
  },
  { timestamps: true }
);

foodSchema.index({ name: "text" });
foodSchema.index({ restaurant: 1, category: 1, isAvailable: 1 });

module.exports =
  mongoose.models.Food || mongoose.model("Food", foodSchema, "foods");