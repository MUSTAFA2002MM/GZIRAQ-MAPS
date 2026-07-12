const express = require("express");
const opsController = require("../controllers/opsController");

const router = express.Router();

router.get("/ops", opsController.getOps);
router.put("/ops", opsController.putOps);

module.exports = router;
