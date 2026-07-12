const pool = require("../config/db");

async function upsertUserLocation({
  userId,
  latitude,
  longitude,
  accuracy,
}) {
  const result = await pool.query(
    `
      INSERT INTO locations (
        user_id,
        latitude,
        longitude,
        accuracy,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        accuracy = EXCLUDED.accuracy,
        updated_at = NOW()
      RETURNING
        id,
        user_id,
        latitude,
        longitude,
        accuracy,
        updated_at
    `,
    [userId, latitude, longitude, accuracy]
  );

  return result.rows[0];
}

async function getUserLocation(userId) {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        latitude,
        longitude,
        accuracy,
        updated_at
      FROM locations
      WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

async function getAllLocations() {
  const result = await pool.query(`
    SELECT
      u.id AS user_id,
      u.name,
      u.role,
      l.latitude,
      l.longitude,
      l.accuracy,
      l.updated_at
    FROM locations l
    INNER JOIN users u
      ON u.id = l.user_id
    WHERE u.is_active = TRUE
    ORDER BY l.updated_at DESC
  `);

  return result.rows;
}

async function getDeliveryLocations() {
  const result = await pool.query(`
    SELECT
      u.id AS user_id,
      u.name,
      u.role,
      l.latitude,
      l.longitude,
      l.accuracy,
      l.updated_at
    FROM locations l
    INNER JOIN users u
      ON u.id = l.user_id
    WHERE u.role = 'delivery'
      AND u.is_active = TRUE
    ORDER BY l.updated_at DESC
  `);

  return result.rows;
}

module.exports = {
  upsertUserLocation,
  getUserLocation,
  getAllLocations,
  getDeliveryLocations,
};
