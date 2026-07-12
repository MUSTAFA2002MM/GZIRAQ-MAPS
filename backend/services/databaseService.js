const pool = require("../config/db");
const env = require("../config/env");
const { hashPassword } = require("../utils/password");

const IRAQ_GOVERNORATES = [
  "بغداد",
  "البصرة",
  "نينوى",
  "أربيل",
  "النجف",
  "كربلاء",
  "الأنبار",
  "ديالى",
  "بابل",
  "واسط",
  "ميسان",
  "ذي قار",
  "المثنى",
  "القادسية",
  "صلاح الدين",
  "كركوك",
  "دهوك",
  "السليمانية",
];

const DEFAULT_CATEGORIES = [
  { name: "مطاعم", icon: "restaurant" },
  { name: "مقاهي", icon: "cafe" },
  { name: "فنادق", icon: "hotel" },
  { name: "مستشفيات", icon: "hospital" },
  { name: "صيدليات", icon: "pharmacy" },
  { name: "مدارس", icon: "school" },
  { name: "جامعات", icon: "university" },
  { name: "محطات وقود", icon: "fuel" },
  { name: "أسواق", icon: "market" },
  { name: "مساجد", icon: "mosque" },
  { name: "حدائق", icon: "park" },
  { name: "أخرى", icon: "other" },
];

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
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'employee',
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_role_check'
      ) THEN
        ALTER TABLE users
          ADD CONSTRAINT users_role_check
          CHECK (role IN ('admin', 'employee', 'delivery'));
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_one_admin_idx
    ON users (role)
    WHERE role = 'admin'
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      icon VARCHAR(50) NOT NULL DEFAULT 'other',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS governorates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS places (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE places
      ADD COLUMN IF NOT EXISTS category_id INTEGER
        REFERENCES categories(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS governorate_id INTEGER
        REFERENCES governorates(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS phone VARCHAR(40),
      ADD COLUMN IF NOT EXISTS website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS image TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'places'
          AND column_name = 'user_id'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'places'
          AND column_name = 'created_by'
      ) THEN
        ALTER TABLE places RENAME COLUMN user_id TO created_by;
      END IF;
    END $$;
  `);

  await pool.query(`
    ALTER TABLE places
      ADD COLUMN IF NOT EXISTS created_by INTEGER
        REFERENCES users(id) ON DELETE CASCADE
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_permissions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
      can_edit_places BOOLEAN NOT NULL DEFAULT FALSE,
      can_upload_images BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await seedGovernorates();
  await seedCategories();
  await seedDefaultSettings();
  await seedAdminAccount();

  console.log("Database tables are ready");
}

async function seedGovernorates() {
  for (const name of IRAQ_GOVERNORATES) {
    await pool.query(
      `
        INSERT INTO governorates (name)
        VALUES ($1)
        ON CONFLICT (name) DO NOTHING
      `,
      [name]
    );
  }
}

async function seedCategories() {
  for (const category of DEFAULT_CATEGORIES) {
    await pool.query(
      `
        INSERT INTO categories (name, icon)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `,
      [category.name, category.icon]
    );
  }
}

async function seedDefaultSettings() {
  const defaults = [
    ["app_name", "GZIRAQ MAPS"],
    ["public_registration", "false"],
    ["default_map_lat", "33.3152"],
    ["default_map_lng", "44.3661"],
    ["default_map_zoom", "12"],
  ];

  for (const [key, value] of defaults) {
    await pool.query(
      `
        INSERT INTO system_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO NOTHING
      `,
      [key, value]
    );
  }
}

async function seedAdminAccount() {
  const existingAdmin = await pool.query(
    `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
  );

  if (existingAdmin.rowCount > 0) {
    return;
  }

  if (!env.adminEmail || !env.adminPassword) {
    console.warn(
      "No admin account found. Set ADMIN_EMAIL and ADMIN_PASSWORD to seed the only admin."
    );
    return;
  }

  if (env.adminPassword.length < 6) {
    console.warn(
      "ADMIN_PASSWORD must be at least 6 characters. Admin was not seeded."
    );
    return;
  }

  const passwordHash = await hashPassword(env.adminPassword);

  const existingUser = await pool.query(
    `SELECT id, role FROM users WHERE email = $1`,
    [env.adminEmail]
  );

  if (existingUser.rowCount > 0) {
    await pool.query(
      `
        UPDATE users
        SET
          role = 'admin',
          is_active = TRUE,
          name = COALESCE(NULLIF($1, ''), name),
          password_hash = $2
        WHERE email = $3
      `,
      [env.adminName, passwordHash, env.adminEmail]
    );

    console.log("Existing user promoted to the single admin account");
    return;
  }

  await pool.query(
    `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        is_active
      )
      VALUES ($1, $2, $3, 'admin', TRUE)
    `,
    [env.adminName, env.adminEmail, passwordHash]
  );

  console.log("Admin account seeded successfully");
}

module.exports = initializeDatabase;
