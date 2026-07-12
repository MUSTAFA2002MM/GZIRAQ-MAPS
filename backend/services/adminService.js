const pool = require("../config/db");

async function listCategories() {
  const result = await pool.query(`
    SELECT id, name, icon, created_at
    FROM categories
    ORDER BY name ASC
  `);

  return result.rows;
}

async function createCategory({ name, icon }) {
  const result = await pool.query(
    `
      INSERT INTO categories (name, icon)
      VALUES ($1, $2)
      RETURNING id, name, icon, created_at
    `,
    [name, icon || "other"]
  );

  return result.rows[0];
}

async function updateCategory(categoryId, { name, icon }) {
  const result = await pool.query(
    `
      UPDATE categories
      SET
        name = COALESCE($2, name),
        icon = COALESCE($3, icon)
      WHERE id = $1
      RETURNING id, name, icon, created_at
    `,
    [categoryId, name, icon]
  );

  return result.rows[0] || null;
}

async function deleteCategory(categoryId) {
  const result = await pool.query(
    `
      DELETE FROM categories
      WHERE id = $1
      RETURNING id
    `,
    [categoryId]
  );

  return result.rowCount > 0;
}

async function listGovernorates() {
  const result = await pool.query(`
    SELECT id, name, created_at
    FROM governorates
    ORDER BY name ASC
  `);

  return result.rows;
}

async function createGovernorate({ name }) {
  const result = await pool.query(
    `
      INSERT INTO governorates (name)
      VALUES ($1)
      RETURNING id, name, created_at
    `,
    [name]
  );

  return result.rows[0];
}

async function updateGovernorate(governorateId, { name }) {
  const result = await pool.query(
    `
      UPDATE governorates
      SET name = COALESCE($2, name)
      WHERE id = $1
      RETURNING id, name, created_at
    `,
    [governorateId, name]
  );

  return result.rows[0] || null;
}

async function deleteGovernorate(governorateId) {
  const result = await pool.query(
    `
      DELETE FROM governorates
      WHERE id = $1
      RETURNING id
    `,
    [governorateId]
  );

  return result.rowCount > 0;
}

async function getAllSettings() {
  const result = await pool.query(`
    SELECT key, value, updated_at
    FROM system_settings
    ORDER BY key ASC
  `);

  return result.rows;
}

async function updateSettings(settings) {
  const entries = Object.entries(settings || {});

  for (const [key, value] of entries) {
    await pool.query(
      `
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key)
        DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW()
      `,
      [key, String(value)]
    );
  }

  return getAllSettings();
}

async function getDashboardStats() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (SELECT COUNT(*)::int FROM users WHERE role = 'employee') AS employees,
      (SELECT COUNT(*)::int FROM users WHERE role = 'delivery') AS delivery_accounts,
      (SELECT COUNT(*)::int FROM users WHERE is_active = TRUE) AS active_users,
      (SELECT COUNT(*)::int FROM places) AS places,
      (SELECT COUNT(*)::int FROM categories) AS categories,
      (SELECT COUNT(*)::int FROM governorates) AS governorates
  `);

  return result.rows[0];
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listGovernorates,
  createGovernorate,
  updateGovernorate,
  deleteGovernorate,
  getAllSettings,
  updateSettings,
  getDashboardStats,
};
