const StatusCode = require("../utils/statusCode");

const AdminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(StatusCode.UNAUTHORIZED).json({
      status: false,
      message: "Unauthorized",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(StatusCode.FORBIDDEN).json({
      status: false,
      message: "Only Admin can perform this action",
    });
  }

  next();
};

module.exports = AdminAuth;