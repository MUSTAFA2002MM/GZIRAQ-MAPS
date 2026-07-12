const placeService = require("../services/placeService");
const userService = require("../services/userService");
const { isValidCoordinate } = require("../utils/validators");

function parseOptionalId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

async function createPlace(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const description = String(req.body.description || "").trim();
    const phone = String(req.body.phone || "").trim();
    const website = String(req.body.website || "").trim();
    const image = String(req.body.image || "").trim();
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const categoryId = parseOptionalId(req.body.category_id);
    const governorateId = parseOptionalId(req.body.governorate_id);

    if (!name || !isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: "أدخل اسم المكان وإحداثيات صحيحة",
      });
    }

    if (categoryId === undefined || governorateId === undefined) {
      return res.status(400).json({
        success: false,
        message: "التصنيف أو المحافظة غير صالحين",
      });
    }

    const place = await placeService.createPlace({
      createdBy: req.user.id,
      name,
      description,
      categoryId,
      governorateId,
      phone,
      website,
      image,
      latitude,
      longitude,
    });

    return res.status(201).json({
      success: true,
      message: "تم حفظ المكان بنجاح",
      place,
    });
  } catch (error) {
    console.error("Create place error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر حفظ المكان",
    });
  }
}

async function updatePlace(req, res) {
  try {
    const placeId = Number(req.params.id);

    if (!Number.isInteger(placeId) || placeId <= 0) {
      return res.status(400).json({
        success: false,
        message: "رقم المكان غير صحيح",
      });
    }

    const role = req.currentUser.role;

    if (role === "employee") {
      const permissions = await userService.getEmployeePermissions(
        req.user.id
      );

      if (!permissions.can_edit_places) {
        return res.status(403).json({
          success: false,
          message: "غير مسموح لك بتعديل الأماكن",
        });
      }
    } else if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "ليس لديك صلاحية لتعديل الأماكن",
      });
    }

    const existing = await placeService.getPlaceById(placeId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "المكان غير موجود",
      });
    }

    const updates = {
      name:
        req.body.name !== undefined
          ? String(req.body.name).trim()
          : undefined,
      description:
        req.body.description !== undefined
          ? String(req.body.description).trim()
          : undefined,
      phone:
        req.body.phone !== undefined
          ? String(req.body.phone).trim()
          : undefined,
      website:
        req.body.website !== undefined
          ? String(req.body.website).trim()
          : undefined,
      image:
        req.body.image !== undefined
          ? String(req.body.image).trim()
          : undefined,
      categoryId:
        req.body.category_id !== undefined
          ? parseOptionalId(req.body.category_id)
          : undefined,
      governorateId:
        req.body.governorate_id !== undefined
          ? parseOptionalId(req.body.governorate_id)
          : undefined,
    };

    if (req.body.latitude !== undefined || req.body.longitude !== undefined) {
      const latitude = Number(req.body.latitude);
      const longitude = Number(req.body.longitude);

      if (!isValidCoordinate(latitude, longitude)) {
        return res.status(400).json({
          success: false,
          message: "إحداثيات الموقع غير صحيحة",
        });
      }

      updates.latitude = latitude;
      updates.longitude = longitude;
    }

    if (
      updates.categoryId === undefined &&
      req.body.category_id !== undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "التصنيف غير صالح",
      });
    }

    if (
      updates.governorateId === undefined &&
      req.body.governorate_id !== undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "المحافظة غير صالحة",
      });
    }

    if (role === "employee" && req.body.image !== undefined) {
      const permissions = await userService.getEmployeePermissions(
        req.user.id
      );

      if (!permissions.can_upload_images) {
        return res.status(403).json({
          success: false,
          message: "غير مسموح لك برفع صور الأماكن",
        });
      }
    }

    const place = await placeService.updatePlace(placeId, updates);

    return res.json({
      success: true,
      message: "تم تحديث المكان بنجاح",
      place,
    });
  } catch (error) {
    console.error("Update place error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر تحديث المكان",
    });
  }
}

async function getPlaces(req, res) {
  try {
    const categoryId = parseOptionalId(req.query.category_id);
    const governorateId = parseOptionalId(req.query.governorate_id);
    const search = String(req.query.search || "").trim();

    if (categoryId === undefined || governorateId === undefined) {
      return res.status(400).json({
        success: false,
        message: "معاملات التصفية غير صحيحة",
      });
    }

    const places = await placeService.listPlaces({
      search: search || undefined,
      categoryId,
      governorateId,
    });

    return res.json({
      success: true,
      places,
    });
  } catch (error) {
    console.error("Get places error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر جلب الأماكن",
    });
  }
}

async function getPublicPlaces(req, res) {
  return getPlaces(req, res);
}

async function getPlaceById(req, res) {
  try {
    const placeId = Number(req.params.id);

    if (!Number.isInteger(placeId) || placeId <= 0) {
      return res.status(400).json({
        success: false,
        message: "رقم المكان غير صحيح",
      });
    }

    const place = await placeService.getPlaceById(placeId);

    if (!place) {
      return res.status(404).json({
        success: false,
        message: "المكان غير موجود",
      });
    }

    return res.json({
      success: true,
      place,
    });
  } catch (error) {
    console.error("Get place error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر جلب المكان",
    });
  }
}

async function getMyPlaces(req, res) {
  try {
    const places = await placeService.listPlacesByUser(req.user.id);

    return res.json({
      success: true,
      places,
    });
  } catch (error) {
    console.error("Get my places error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر جلب أماكنك",
    });
  }
}

async function deletePlace(req, res) {
  try {
    const placeId = Number(req.params.id);

    if (!Number.isInteger(placeId) || placeId <= 0) {
      return res.status(400).json({
        success: false,
        message: "رقم المكان غير صحيح",
      });
    }

    const role = req.currentUser?.role;

    if (role === "admin") {
      const deleted = await placeService.deletePlace(placeId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "المكان غير موجود",
        });
      }

      return res.json({
        success: true,
        message: "تم حذف المكان",
      });
    }

    // Backward compatibility for owners until roles fully migrate
    const deleted = await placeService.deletePlaceOwnedBy(
      placeId,
      req.user.id
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "المكان غير موجود أو لا تملك صلاحية حذفه",
      });
    }

    return res.json({
      success: true,
      message: "تم حذف المكان",
    });
  } catch (error) {
    console.error("Delete place error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر حذف المكان",
    });
  }
}

module.exports = {
  createPlace,
  updatePlace,
  getPlaces,
  getPublicPlaces,
  getPlaceById,
  getMyPlaces,
  deletePlace,
};
