const mongoose = require("mongoose");

// Defining Schema
const otpModel = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: "15m" },
});

// Model
module.exports = mongoose.models.Otp || mongoose.model("Otp", otpModel);
