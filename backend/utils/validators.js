function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function parseAccuracy(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const accuracy = Number(value);

  if (!Number.isFinite(accuracy)) {
    return undefined;
  }

  return accuracy;
}

const ALLOWED_ROLES = ["admin", "employee", "delivery"];

function isValidRole(role) {
  return ALLOWED_ROLES.includes(role);
}

module.exports = {
  isValidEmail,
  isValidCoordinate,
  parseAccuracy,
  isValidRole,
  ALLOWED_ROLES,
};
