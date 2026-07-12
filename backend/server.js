const result = await pool.query(
      `
        SELECT id, name, email, password_hash
        FROM users
        WHERE email = $1
      `,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: "البريد أو كلمة المرور غير صحيحة",
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
        message: "البريد أو كلمة المرور غير صحيحة",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تسجيل الدخول",
    });
  }
});

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
        req.body.accuracy === undefined
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

      const result = await pool.query(
        `
          INSERT INTO locations
            (user_id, latitude, longitude, accuracy, updated_at)
          VALUES
            ($1, $2, $3, $4, NOW())
          ON CONFLICT (user_id)
          DO UPDATE SET
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            accuracy = EXCLUDED.accuracy,
            updated_at = NOW()
          RETURNING *
        `,
        [req.user.id, latitude, longitude, accuracy]
      );

      res.json({
        success: true,
        location: result.rows[0],
      });
    } catch (error) {
      console.error("Location error:", error);

      res.status(500).json({
        success: false,
        message: "تعذر حفظ الموقع",
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
        JOIN users u ON u.id = l.user_id
        ORDER BY l.updated_at DESC
      `);

      res.json({
        success: true,
        locations: result.rows,
      });
    } catch (error) {
      console.error("Locations error:", error);

      res.status(500).json({
        success: false,
        message: "تعذر جلب المواقع",
      });
    }
  }
);

// معالجة الأخطاء غير المتوقعة
app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    success: false,
    message: "حدث خطأ غير متوقع",
  });
});

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