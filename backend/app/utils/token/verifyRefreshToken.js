const jwt = require("jsonwebtoken");

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};

module.exports = verifyRefreshToken;