const pool = require("../config/db");

async function root(req, res) {
  res.json({
    success: true,
    message: "GZIRAQ MAPS API is running",
  });
}

async function health(req, res) {
  let database = "not configured";

  if (pool) {
    try {
      await pool.query("SELECT 1");
      database = "connected";
    } catch (error) {
      console.error("Database health error:", error);
      database = "error";
    }
  }

  res.json({
    status: "ok",
    database,
    time: new Date().toISOString(),
  });
}

module.exports = {
  root,
  health,
};
