const getTokenMaxAge = (expiresIn) => {
  if (!expiresIn) return 60 * 1000;

  const match = expiresIn.match(/^(\d+)([smhd])$/i);

  if (!match) return 60 * 1000;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
};
module.exports = getTokenMaxAge