const StatusCode = require("../utils/statusCode");

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(StatusCode.UNAUTHORIZED).json({
        status: false,
        message: "Unauthorized. Please login first.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(StatusCode.FORBIDDEN).json({
        status: false,
        message: "You don't have permission to perform this action.",
      });
    }

    next();
  };
};

module.exports = authorize;