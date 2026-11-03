const jwt = require("jsonwebtoken");

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

module.exports = verifyAccessToken;