const pool = require("../config/db");

function requireDatabase(req, res, next) {
  if (!pool) {
    return res.status(503).json({
      success: false,
      message: "قاعدة البيانات غير متصلة",
    });
  }

  next();
}

module.exports = requireDatabase;
