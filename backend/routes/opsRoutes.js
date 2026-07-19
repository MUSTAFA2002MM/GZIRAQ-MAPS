const express = require("express");
const opsController = require("../controllers/opsController");

const router = express.Router();

router.get("/ops", opsController.getOps);
router.put("/ops", opsController.putOps);
router.get("/ops/agent-locations", opsController.listAgentLocations);
router.post("/ops/agent-location", opsController.updateAgentLocation);
router.get("/ops/notifications", opsController.listNotifications);
router.post("/ops/notifications/read", opsController.markNotificationsRead);
router.post("/ops/admin-login", opsController.adminLogin);
router.put("/ops/admin-password", opsController.changeAdminPassword);

module.exports = router;
