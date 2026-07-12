const pool = require("../config/db");
const { hashPassword } = require("../utils/password");
const { toPublicUser } = require("./authService");

async function listUsers({ role } = {}) {
  const values = [];
  let whereClause = "";

  if (role) {
    values.push(role);
    whereClause = `WHERE role = $1`;
  }

  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        role,
        is_active,
        created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
    `,
    values
  );

  return result.rows.map(toPublicUser);
}

async function createStaffUser({
  name,
  email,
  password,
  role,
  canEditPlaces = false,
  canUploadImages = false,
}) {
  if (role === "admin") {
    const error = new Error("لا يمكن إنشاء أكثر من حساب مسؤول واحد");
    error.statusCode = 403;
    throw error;
  }

  if (!["employee", "delivery"].includes(role)) {
    const error = new Error("الدور غير صالح");
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );

  if (existingUser.rowCount > 0) {
    const error = new Error("البريد الإلكتروني مستخدم مسبقًا");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await hashPassword(password);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        INSERT INTO users (
          name,
          email,
          password_hash,
          role,
          is_active
        )
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING id, name, email, role, is_active, created_at
      `,
      [name, email, passwordHash, role]
    );

    const user = result.rows[0];

    if (role === "employee") {
      await client.query(
        `
          INSERT INTO employee_permissions (
            user_id,
            can_edit_places,
            can_upload_images
          )
          VALUES ($1, $2, $3)
        `,
        [user.id, Boolean(canEditPlaces), Boolean(canUploadImages)]
      );
    }

    await client.query("COMMIT");
    return toPublicUser(user);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function setUserActive(userId, isActive) {
  const target = await pool.query(
    `SELECT id, role FROM users WHERE id = $1`,
    [userId]
  );

  if (target.rowCount === 0) {
    return null;
  }

  if (target.rows[0].role === "admin") {
    const error = new Error("لا يمكن تعطيل حساب المسؤول");
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    `
      UPDATE users
      SET is_active = $2
      WHERE id = $1
      RETURNING id, name, email, role, is_active, created_at
    `,
    [userId, Boolean(isActive)]
  );

  return toPublicUser(result.rows[0]);
}

async function deleteUser(userId) {
  const target = await pool.query(
    `SELECT id, role FROM users WHERE id = $1`,
    [userId]
  );

  if (target.rowCount === 0) {
    return false;
  }

  if (target.rows[0].role === "admin") {
    const error = new Error("لا يمكن حذف حساب المسؤول");
    error.statusCode = 403;
    throw error;
  }

  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  return true;
}

async function getEmployeePermissions(userId) {
  const result = await pool.query(
    `
      SELECT
        can_edit_places,
        can_upload_images
      FROM employee_permissions
      WHERE user_id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    return {
      can_edit_places: false,
      can_upload_images: false,
    };
  }

  return result.rows[0];
}

async function updateEmployeePermissions(
  userId,
  { canEditPlaces, canUploadImages }
) {
  const user = await pool.query(
    `SELECT id, role FROM users WHERE id = $1`,
    [userId]
  );

  if (user.rowCount === 0) {
    return null;
  }

  if (user.rows[0].role !== "employee") {
    const error = new Error("الصلاحيات متاحة لموظفين فقط");
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `
      INSERT INTO employee_permissions (
        user_id,
        can_edit_places,
        can_upload_images,
        updated_at
      )
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        can_edit_places = EXCLUDED.can_edit_places,
        can_upload_images = EXCLUDED.can_upload_images,
        updated_at = NOW()
      RETURNING can_edit_places, can_upload_images
    `,
    [userId, Boolean(canEditPlaces), Boolean(canUploadImages)]
  );

  return result.rows[0];
}

module.exports = {
  listUsers,
  createStaffUser,
  setUserActive,
  deleteUser,
  getEmployeePermissions,
  updateEmployeePermissions,
};
