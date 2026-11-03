const getTokenMaxAge = require("../token/getTokenMaxAge.js");

const isProduction = process.env.NODE_ENV === "production";

const createCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  maxAge,
});

const accessCookieOptions = createCookieOptions(
  getTokenMaxAge(process.env.ACCESS_TOKEN_EXPIRES_IN),
);

const refreshCookieOptions = createCookieOptions(
  getTokenMaxAge(process.env.REFRESH_TOKEN_EXPIRES_IN),
);

module.exports = {
  accessCookieOptions,
  refreshCookieOptions,
};