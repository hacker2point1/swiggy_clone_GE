require("dotenv").config();

const express = require("express");
const ConnectDB = require("./app/config/db");

const cookieParser = require("cookie-parser");
const session = require("express-session");
const connectFlash = require("connect-flash");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");



// Config
const corsOptions = require("./app/config/cors");

// Admin creation
const createAdmin = require("./app/seed/adminSeeder");
const { default: chalk } = require("chalk");

const app = express();

// ==============================
// Middleware
// ==============================

app.use(cors(corsOptions));

app.use(helmet());
app.use(morgan("dev"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(cookieParser());
app.use(connectFlash());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ==============================
// Routes
// ==============================
const authRoute = require("./app/route/auth/auth.route");
app.use("/api/v1/auth", authRoute);

const restaurantRoutes = require("./app/route/restaurent/restaurent.route");

app.use("/api/v1/restaurants", restaurantRoutes);


const categoryRoutes = require("./app/route/category/category.route");

app.use("/api/categories", categoryRoutes);

const foodRoutes = require("./app/route/food/food.route");

app.use("/api/foods", foodRoutes);

const cartRoutes = require("./app/route/cart/cart.route");

app.use("/api/cart", cartRoutes);
const orderRoutes = require("./app/route/order/order.route");

app.use("/api/orders", orderRoutes);

// ==============================
// Server
// ==============================

const PORT = process.env.PORT;

const startServer = async () => {
  try {
    await ConnectDB();
    await createAdmin();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(
      chalk.red.bold("Server failed to start:", error)
    );

    process.exit(1);
  }
};

startServer();