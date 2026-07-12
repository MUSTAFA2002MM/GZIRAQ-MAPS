const pool = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
  };
}

async function getSetting(key, fallback = null) {
  const result = await pool.query(
    `SELECT value FROM system_settings WHERE key = $1`,
    [key]
  );

  if (result.rowCount === 0) {
    return fallback;
  }

  return result.rows[0].value;
}

async function registerUser({ name, email, password }) {
  const publicRegistration = await getSetting("public_registration", "false");

  if (publicRegistration !== "true") {
    const error = new Error(
      "التسجيل العام مغلق. يتم إنشاء الحسابات بواسطة المسؤول فقط"
    );
    error.statusCode = 403;
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

  const result = await pool.query(
    `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, 'employee', FALSE)
      RETURNING id, name, email, role, is_active, created_at
    `,
    [name, email, passwordHash]
  );

  const user = result.rows[0];

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: toPublicUser(user),
  };
}

async function loginUser({ email, password }) {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        password_hash,
        role,
        is_active,
        created_at
      FROM users
      WHERE email = $1
    `,
    [email]
  );

  if (result.rowCount === 0) {
    const error = new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    error.statusCode = 401;
    throw error;
  }

  const user = result.rows[0];

  const passwordMatches = await comparePassword(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    const error = new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    error.statusCode = 401;
    throw error;
  }

  if (!user.is_active) {
    const error = new Error("الحساب غير مفعّل. تواصل مع المسؤول");
    error.statusCode = 403;
    throw error;
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: toPublicUser(user),
  };
}

async function getUserById(userId) {
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
      WHERE id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return toPublicUser(result.rows[0]);
}

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  toPublicUser,
  getSetting,
};
