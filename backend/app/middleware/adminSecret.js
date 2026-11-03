
const crypto = require("crypto");

const adminSecret = (req, res, next) => {
  const providedSecret = req.headers["x-admin-secret"];
  const actualSecret = process.env.ADMIN_SECRET_KEY;

  if (!providedSecret || !actualSecret) {
    return res.status(401).json({
      success: false,
      message: "Admin secret key is required",
    });
  }

  const providedBuffer = Buffer.from(providedSecret);
  const actualBuffer = Buffer.from(actualSecret);

  if (
    providedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, actualBuffer)
  ) {
    return res.status(403).json({
      success: false,
      message: "Invalid admin secret key",
    });
  }

  next();
};

module.exports = adminSecret;
