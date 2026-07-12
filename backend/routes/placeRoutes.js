const express = require("express");
const placeController = require("../controllers/placeController");
const requireDatabase = require("../middlewares/requireDatabase");
const {
  authenticateToken,
  requireRoles,
} = require("../middlewares/auth");

const router = express.Router();

// Public map browsing
router.get(
  "/public/places",
  requireDatabase,
  placeController.getPublicPlaces
);

router.get(
  "/public/places/:id",
  requireDatabase,
  placeController.getPlaceById
);

router.post(
  "/places",
  requireDatabase,
  authenticateToken,
  requireRoles("admin"),
  placeController.createPlace
);

router.get(
  "/places",
  requireDatabase,
  authenticateToken,
  requireRoles("admin", "employee", "delivery"),
  placeController.getPlaces
);

router.get(
  "/places/:id",
  requireDatabase,
  authenticateToken,
  requireRoles("admin", "employee", "delivery"),
  placeController.getPlaceById
);

router.put(
  "/places/:id",
  requireDatabase,
  authenticateToken,
  requireRoles("admin", "employee"),
  placeController.updatePlace
);

router.get(
  "/my-places",
  requireDatabase,
  authenticateToken,
  requireRoles("admin", "employee"),
  placeController.getMyPlaces
);

router.delete(
  "/places/:id",
  requireDatabase,
  authenticateToken,
  requireRoles("admin"),
  placeController.deletePlace
);

module.exports = router;
