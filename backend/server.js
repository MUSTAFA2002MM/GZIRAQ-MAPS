const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

app.use(cors());
app.use(express.json());

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
    })
  : null;

// إنشاء جداول قاعدة البيانات
async function initializeDatabase() {
  if (!pool) {
    console.warn(
      "DATABASE_URL is not available. Database features are disabled."
    );
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      accuracy DOUBLE PRECISION,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log("Database tables are ready");
}

// التأكد من وجود قاعدة البيانات
function requireDatabase(req, res, next) {
  if (!pool) {
    return res.status(503).json({
      success: false,
      message: "قاعدة البيانات غير متصلة",
    });
  }

  next();
}

// التحقق من رمز تسجيل الدخول
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
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "رمز تسجيل الدخول غير صالح أو منتهي",
    });
  }
}

// الصفحة الرئيسية للخادم
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "GZIRAQ MAPS API is running",
  });
});

// فحص حالة الخادم وقاعدة البيانات
app.get("/api/health", async (req, res) => {
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
});

// إنشاء حساب جديد
app.post("/api/register", requireDatabase, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "أدخل الاسم والبريد الإلكتروني وكلمة مرور من 6 أحرف على الأقل",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: "البريد الإلكتروني مستخدم مسبقًا",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
        INSERT INTO users (name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, created_at
      `,
      [name, email, passwordHash]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    return res.status(201).json({
      success: true,
      message: "تم إنشاء الحساب بنجاح",
      token,
      user,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء الحساب",
    });
  }
});

// تسجيل الدخول
app.post("/api/login", requireDatabase, async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "أدخل البريد الإلكتروني وكلمة المرور",
      });
    }

    const result = await pool.query(
      `
        SELECT id, name, email, password_hash, created_at
        FROM users
        WHERE email = $1
      `,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      });
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    return res.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تسجيل الدخول",
    });
  }
});

// جلب معلومات المستخدم الحالي
app.get(
  "/api/me",
  requireDatabase,
  authenticateToken,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
          SELECT id, name, email, created_at
          FROM users
          WHERE id = $1
        `,
        [req.user.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "المستخدم غير موجود",
        });
      }

      return res.json({
        success: true,
        user: result.rows[0],
      });
    } catch (error) {
      console.error("User profile error:", error);

      return res.status(500).json({
        success: false,
        message: "تعذر جلب بيانات المستخدم",
      });
    }
  }
);

// حفظ أو تحديث موقع المستخدم
app.post(
  "/api/location",
  requireDatabase,
  authenticateToken,
  async (req, res) => {
    try {
      const latitude = Number(req.body.latitude);
      const longitude = Number(req.body.longitude);

      const accuracy =
        req.body.accuracy === undefined ||
        req.body.accuracy === null
          ? null
          : Number(req.body.accuracy);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return res.status(400).json({
          success: false,
          message: "إحداثيات الموقع غير صحيحة",
        });
      }

      if (accuracy !== null && !Number.isFinite(accuracy)) {
        return res.status(400).json({
          success: false,
          message: "دقة الموقع غير صحيحة",
        });
      }

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
        [req.user.id, latitude, longitude, accuracy]
      );

      return res.json({
        success: true,
        message: "تم حفظ الموقع",
        location: result.rows[0],
      });
    } catch (error) {
      console.error("Save location error:", error);

      return res.status(500).json({
        success: false,
        message: "تعذر حفظ الموقع",
      });
    }
  }
);

// جلب موقع المستخدم الحالي
app.get(
  "/api/location",
  requireDatabase,
  authenticateToken,
  async (req, res) => {
    try {
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
        [req.user.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "لم يتم حفظ موقع حتى الآن",
        });
      }

      return res.json({
        success: true,
        location: result.rows[0],
      });
    } catch (error) {
      console.error("Get location error:", error);

      return res.status(500).json({
        success: false,
        message: "تعذر جلب الموقع",
      });
    }
  }
);

// جلب مواقع جميع المستخدمين
app.get(
  "/api/locations",
  requireDatabase,
  authenticateToken,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          u.id AS user_id,
          u.name,
          l.latitude,
          l.longitude,
          l.accuracy,
          l.updated_at
        FROM locations l
        INNER JOIN users u
          ON u.id = l.user_id
        ORDER BY l.updated_at DESC
      `);

      return res.json({
        success: true,
        locations: result.rows,
      });
    } catch (error) {
      console.error("Get locations error:", error);

      return res.status(500).json({
        success: false,
        message: "تعذر جلب مواقع المستخدمين",
      });
    }
  }
);

// مسار غير موجود
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "المسار غير موجود",
  });
});

// معالجة الأخطاء العامة
app.use((error, req, res, next) => {
  console.error("Unexpected error:", error);

  res.status(500).json({
    success: false,
    message: "حدث خطأ غير متوقع",
  });
});

// تشغيل الخادم
async function startServer() {
  if (!JWT_SECRET) {
    console.error("JWT_SECRET is missing");
    process.exit(1);
  }

  try {
    await initializeDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();