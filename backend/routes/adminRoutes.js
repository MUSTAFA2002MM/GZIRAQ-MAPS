const express = require("express");
const adminController = require("../controllers/adminController");
const requireDatabase = require("../middlewares/requireDatabase");
const {
  authenticateToken,
  requireRoles,
} = require("../middlewares/auth");

const router = express.Router();

const adminOnly = [
  requireDatabase,
  authenticateToken,
  requireRoles("admin"),
];

router.get("/admin/users", ...adminOnly, adminController.listUsers);
router.post("/admin/users", ...adminOnly, adminController.createUser);
router.patch(
  "/admin/users/:id/active",
  ...adminOnly,
  adminController.setUserActive
);
router.delete(
  "/admin/users/:id",
  ...adminOnly,
  adminController.deleteUser
);
router.patch(
  "/admin/users/:id/permissions",
  ...adminOnly,
  adminController.updatePermissions
);

router.get("/admin/stats", ...adminOnly, adminController.getStats);
router.get(
  "/admin/settings",
  ...adminOnly,
  adminController.getSettings
);
router.put(
  "/admin/settings",
  ...adminOnly,
  adminController.updateSettings
);

router.get(
  "/admin/categories",
  ...adminOnly,
  adminController.listCategories
);
router.post(
  "/admin/categories",
  ...adminOnly,
  adminController.createCategory
);
router.put(
  "/admin/categories/:id",
  ...adminOnly,
  adminController.updateCategory
);
router.delete(
  "/admin/categories/:id",
  ...adminOnly,
  adminController.deleteCategory
);

router.get(
  "/admin/governorates",
  ...adminOnly,
  adminController.listGovernorates
);
router.post(
  "/admin/governorates",
  ...adminOnly,
  adminController.createGovernorate
);
router.put(
  "/admin/governorates/:id",
  ...adminOnly,
  adminController.updateGovernorate
);
router.delete(
  "/admin/governorates/:id",
  ...adminOnly,
  adminController.deleteGovernorate
);

// Public read endpoints for map filters
router.get(
  "/categories",
  requireDatabase,
  adminController.listCategories
);
router.get(
  "/governorates",
  requireDatabase,
  adminController.listGovernorates
);

module.exports = router;
