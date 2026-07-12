const pool = require("../config/db");

const PLACE_SELECT = `
  SELECT
    p.id,
    p.created_by,
    p.created_by AS user_id,
    p.name,
    p.description,
    p.category_id,
    p.governorate_id,
    p.phone,
    p.website,
    p.image,
    p.latitude,
    p.longitude,
    p.created_at,
    p.updated_at,
    u.name AS owner_name,
    c.name AS category_name,
    c.icon AS category_icon,
    g.name AS governorate_name
  FROM places p
  INNER JOIN users u
    ON u.id = p.created_by
  LEFT JOIN categories c
    ON c.id = p.category_id
  LEFT JOIN governorates g
    ON g.id = p.governorate_id
`;

async function createPlace({
  createdBy,
  name,
  description,
  categoryId,
  governorateId,
  phone,
  website,
  image,
  latitude,
  longitude,
}) {
  const result = await pool.query(
    `
      INSERT INTO places (
        created_by,
        name,
        description,
        category_id,
        governorate_id,
        phone,
        website,
        image,
        latitude,
        longitude,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING id
    `,
    [
      createdBy,
      name,
      description || null,
      categoryId || null,
      governorateId || null,
      phone || null,
      website || null,
      image || null,
      latitude,
      longitude,
    ]
  );

  return getPlaceById(result.rows[0].id);
}

async function updatePlace(placeId, updates) {
  const result = await pool.query(
    `
      UPDATE places
      SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        category_id = COALESCE($4, category_id),
        governorate_id = COALESCE($5, governorate_id),
        phone = COALESCE($6, phone),
        website = COALESCE($7, website),
        image = COALESCE($8, image),
        latitude = COALESCE($9, latitude),
        longitude = COALESCE($10, longitude),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [
      placeId,
      updates.name,
      updates.description,
      updates.categoryId,
      updates.governorateId,
      updates.phone,
      updates.website,
      updates.image,
      updates.latitude,
      updates.longitude,
    ]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return getPlaceById(placeId);
}

async function getPlaceById(placeId) {
  const result = await pool.query(
    `
      ${PLACE_SELECT}
      WHERE p.id = $1
    `,
    [placeId]
  );

  return result.rows[0] || null;
}

async function listPlaces({
  search,
  categoryId,
  governorateId,
} = {}) {
  const conditions = [];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(
      `(p.name ILIKE $${values.length} OR p.description ILIKE $${values.length})`
    );
  }

  if (categoryId) {
    values.push(categoryId);
    conditions.push(`p.category_id = $${values.length}`);
  }

  if (governorateId) {
    values.push(governorateId);
    conditions.push(`p.governorate_id = $${values.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query(
    `
      ${PLACE_SELECT}
      ${whereClause}
      ORDER BY p.created_at DESC
    `,
    values
  );

  return result.rows;
}

async function listPlacesByUser(userId) {
  const result = await pool.query(
    `
      ${PLACE_SELECT}
      WHERE p.created_by = $1
      ORDER BY p.created_at DESC
    `,
    [userId]
  );

  return result.rows;
}

async function deletePlace(placeId) {
  const result = await pool.query(
    `
      DELETE FROM places
      WHERE id = $1
      RETURNING id
    `,
    [placeId]
  );

  return result.rowCount > 0;
}

async function deletePlaceOwnedBy(placeId, userId) {
  const result = await pool.query(
    `
      DELETE FROM places
      WHERE id = $1
        AND created_by = $2
      RETURNING id
    `,
    [placeId, userId]
  );

  return result.rowCount > 0;
}

module.exports = {
  createPlace,
  updatePlace,
  getPlaceById,
  listPlaces,
  listPlacesByUser,
  deletePlace,
  deletePlaceOwnedBy,
};
