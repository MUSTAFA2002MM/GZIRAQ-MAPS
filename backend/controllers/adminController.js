const userService = require("../services/userService");
const adminService = require("../services/adminService");

async function listUsers(req, res) {
  try {
    const role = String(req.query.role || "").trim() || undefined;
    const users = await userService.listUsers({ role });

    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("List users error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر جلب المستخدمين",
    });
  }
}

async function createUser(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    const role = String(req.body.role || "").trim();

    if (!name || !email || password.length < 6 || !role) {
      return res.status(400).json({
        success: false,
        message:
          "أدخل الاسم والبريد وكلمة مرور من 6 أحرف على الأقل والدور",
      });
    }

    const user = await userService.createStaffUser({
      name,
      email,
      password,
      role,
      canEditPlaces: req.body.can_edit_places,
      canUploadImages: req.body.can_upload_images,
    });

    return res.status(201).json({
      success: true,
      message: "تم إنشاء الحساب بنجاح",
      user,
    });
  } catch (error) {
    console.error("Create user error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "تعذر إنشاء الحساب",
    });
  }
}

async function setUserActive(req, res) {
  try {
    const userId = Number(req.params.id);
    const isActive = Boolean(req.body.is_active);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "رقم المستخدم غير صحيح",
      });
    }

    const user = await userService.setUserActive(userId, isActive);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    return res.json({
      success: true,
      message: isActive ? "تم تفعيل الحساب" : "تم تعطيل الحساب",
      user,
    });
  } catch (error) {
    console.error("Set user active error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "تعذر تحديث حالة الحساب",
    });
  }
}

async function deleteUser(req, res) {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "رقم المستخدم غير صحيح",
      });
    }

    const deleted = await userService.deleteUser(userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    return res.json({
      success: true,
      message: "تم حذف المستخدم",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "تعذر حذف المستخدم",
    });
  }
}

async function updatePermissions(req, res) {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "رقم المستخدم غير صحيح",
      });
    }

    const permissions = await userService.updateEmployeePermissions(
      userId,
      {
        canEditPlaces: req.body.can_edit_places,
        canUploadImages: req.body.can_upload_images,
      }
    );

    if (!permissions) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    return res.json({
      success: true,
      message: "تم تحديث الصلاحيات",
      permissions,
    });
  } catch (error) {
    console.error("Update permissions error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "تعذر تحديث الصلاحيات",
    });
  }
}

async function getStats(req, res) {
  try {
    const stats = await adminService.getDashboardStats();

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Get stats error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر جلب الإحصائيات",
    });
  }
}

async function getSettings(req, res) {
  try {
    const settings = await adminService.getAllSettings();

    return res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Get settings error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر جلب الإعدادات",
    });
  }
}

async function updateSettings(req, res) {
  try {
    const settings = await adminService.updateSettings(req.body || {});

    return res.json({
      success: true,
      message: "تم تحديث الإعدادات",
      settings,
    });
  } catch (error) {
    console.error("Update settings error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر تحديث الإعدادات",
    });
  }
}

async function listCategories(req, res) {
  try {
    const categories = await adminService.listCategories();

    return res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("List categories error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر جلب التصنيفات",
    });
  }
}

async function createCategory(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const icon = String(req.body.icon || "other").trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "أدخل اسم التصنيف",
      });
    }

    const category = await adminService.createCategory({ name, icon });

    return res.status(201).json({
      success: true,
      message: "تم إضافة التصنيف",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "التصنيف موجود مسبقًا",
      });
    }

    return res.status(500).json({
      success: false,
      message: "تعذر إضافة التصنيف",
    });
  }
}

async function updateCategory(req, res) {
  try {
    const categoryId = Number(req.params.id);
    const name =
      req.body.name !== undefined
        ? String(req.body.name).trim()
        : undefined;
    const icon =
      req.body.icon !== undefined
        ? String(req.body.icon).trim()
        : undefined;

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        success: false,
        message: "رقم التصنيف غير صحيح",
      });
    }

    const category = await adminService.updateCategory(categoryId, {
      name,
      icon,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "التصنيف غير موجود",
      });
    }

    return res.json({
      success: true,
      message: "تم تحديث التصنيف",
      category,
    });
  } catch (error) {
    console.error("Update category error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر تحديث التصنيف",
    });
  }
}

async function deleteCategory(req, res) {
  try {
    const categoryId = Number(req.params.id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        success: false,
        message: "رقم التصنيف غير صحيح",
      });
    }

    const deleted = await adminService.deleteCategory(categoryId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "التصنيف غير موجود",
      });
    }

    return res.json({
      success: true,
      message: "تم حذف التصنيف",
    });
  } catch (error) {
    console.error("Delete category error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر حذف التصنيف",
    });
  }
}

async function listGovernorates(req, res) {
  try {
    const governorates = await adminService.listGovernorates();

    return res.json({
      success: true,
      governorates,
    });
  } catch (error) {
    console.error("List governorates error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر جلب المحافظات",
    });
  }
}

async function createGovernorate(req, res) {
  try {
    const name = String(req.body.name || "").trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "أدخل اسم المحافظة",
      });
    }

    const governorate = await adminService.createGovernorate({ name });

    return res.status(201).json({
      success: true,
      message: "تم إضافة المحافظة",
      governorate,
    });
  } catch (error) {
    console.error("Create governorate error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "المحافظة موجودة مسبقًا",
      });
    }

    return res.status(500).json({
      success: false,
      message: "تعذر إضافة المحافظة",
    });
  }
}

async function updateGovernorate(req, res) {
  try {
    const governorateId = Number(req.params.id);
    const name =
      req.body.name !== undefined
        ? String(req.body.name).trim()
        : undefined;

    if (!Number.isInteger(governorateId) || governorateId <= 0) {
      return res.status(400).json({
        success: false,
        message: "رقم المحافظة غير صحيح",
      });
    }

    const governorate = await adminService.updateGovernorate(
      governorateId,
      { name }
    );

    if (!governorate) {
      return res.status(404).json({
        success: false,
        message: "المحافظة غير موجودة",
      });
    }

    return res.json({
      success: true,
      message: "تم تحديث المحافظة",
      governorate,
    });
  } catch (error) {
    console.error("Update governorate error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر تحديث المحافظة",
    });
  }
}

async function deleteGovernorate(req, res) {
  try {
    const governorateId = Number(req.params.id);

    if (!Number.isInteger(governorateId) || governorateId <= 0) {
      return res.status(400).json({
        success: false,
        message: "رقم المحافظة غير صحيح",
      });
    }

    const deleted = await adminService.deleteGovernorate(governorateId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "المحافظة غير موجودة",
      });
    }

    return res.json({
      success: true,
      message: "تم حذف المحافظة",
    });
  } catch (error) {
    console.error("Delete governorate error:", error);

    return res.status(500).json({
      success: false,
      message: "تعذر حذف المحافظة",
    });
  }
}

module.exports = {
  listUsers,
  createUser,
  setUserActive,
  deleteUser,
  updatePermissions,
  getStats,
  getSettings,
  updateSettings,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listGovernorates,
  createGovernorate,
  updateGovernorate,
  deleteGovernorate,
};
