const express = require("express");
const opsController = require("../controllers/opsController");

const router = express.Router();

router.get("/ops", opsController.getOps);
router.put("/ops", opsController.putOps);
router.post("/ops/admin-login", opsController.adminLogin);
router.put("/ops/admin-password", opsController.changeAdminPassword);

module.exports = router;
