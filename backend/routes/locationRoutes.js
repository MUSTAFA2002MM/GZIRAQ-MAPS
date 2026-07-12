const express = require("express");
const locationController = require("../controllers/locationController");
const requireDatabase = require("../middlewares/requireDatabase");
const {
  authenticateToken,
  requireRoles,
} = require("../middlewares/auth");

const router = express.Router();

router.post(
  "/location",
  requireDatabase,
  authenticateToken,
  requireRoles("admin", "employee", "delivery"),
  locationController.saveLocation
);

router.get(
  "/location",
  requireDatabase,
  authenticateToken,
  requireRoles("admin", "employee", "delivery"),
  locationController.getMyLocation
);

router.get(
  "/locations",
  requireDatabase,
  authenticateToken,
  requireRoles("admin"),
  locationController.getLocations
);

router.get(
  "/delivery-locations",
  requireDatabase,
  authenticateToken,
  requireRoles("admin", "employee"),
  locationController.getDeliveryLocations
);

module.exports = router;
