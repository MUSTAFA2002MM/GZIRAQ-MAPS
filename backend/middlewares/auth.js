const { verifyToken } = require("../utils/jwt");
const pool = require("../config/db");

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "يجب تسجيل الدخول",
    });
  }

  const token = authorization.substring(7);

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "رمز تسجيل الدخول غير صالح أو منتهي",
    });
  }
}

function requireRoles(...roles) {
  return async function roleGuard(req, res, next) {
    try {
      const result = await pool.query(
        `
          SELECT id, name, email, role, is_active
          FROM users
          WHERE id = $1
        `,
        [req.user.id]
      );

      if (result.rowCount === 0) {
        return res.status(401).json({
          success: false,
          message: "المستخدم غير موجود",
        });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: "الحساب غير مفعّل",
        });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "ليس لديك صلاحية لتنفيذ هذا الإجراء",
        });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  authenticateToken,
  requireRoles,
};
