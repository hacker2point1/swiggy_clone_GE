const bcrypt = require("bcryptjs");
const User = require("../models/user/user.model");

const seedAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || "admin@gmail.com").trim().toLowerCase();
  const adminExists = await User.findOne({ email });

  if (adminExists) {
    if (adminExists.role !== "admin") {
      throw new Error(`The configured admin email ${email} is already in use`);
    }

    if (!adminExists.isEmailVerified) {
      adminExists.isEmailVerified = true;
      await adminExists.save();
    }

    console.log("Admin already exists");
    return;
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("Set ADMIN_PASSWORD before creating the seeded admin");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await User.create({
    name: process.env.ADMIN_NAME || "Super Admin",
    email,
    password: hashedPassword,
    role: "admin",
    isEmailVerified: true,
    isActive: true,
    isBlocked: false,
  });

  console.log("Admin created successfully");
};

module.exports = seedAdmin;