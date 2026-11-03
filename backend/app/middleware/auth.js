const jwt = require("jsonwebtoken");

const getTokenFromRequest = (req) => {
  const authorizationHeader = req.headers.authorization;

  if (typeof authorizationHeader === "string") {
    const bearerPrefix = "Bearer ";
    if (authorizationHeader.startsWith(bearerPrefix)) {
      return authorizationHeader.slice(bearerPrefix.length).trim() || null;
    }
  }

  const headerToken = req.headers["x-access-token"];

  if (typeof headerToken === "string") {
    if (headerToken.startsWith("Bearer ")) {
      return headerToken.split(" ")[1];
    }

    return headerToken;
  }

  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

const Auth = (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      status: false,
      message: "Access denied. No token provided",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET
    );

    req.user = decoded;

    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        status: false,
        message: "Access token expired. Please refresh your session.",
      });
    }

    return res.status(401).json({
      status: false,
      message: "Invalid access token",
    });
  }
};

const optionalAuth = (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) return next();

  try {
    req.user = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET
    );
  } catch {
    req.user = null;
  }

  return next();
};

module.exports = Auth;
module.exports.optionalAuth = optionalAuth;