const mongoose = require("mongoose");

const connectDB = async () => {
  const connection = await mongoose.connect(process.env.MONGODB_URL);
  console.log("MongoDB connected successfully!");
  return connection;
};

module.exports = connectDB;