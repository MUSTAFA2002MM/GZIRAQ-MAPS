const express = require("express");
const authController = require("../controllers/authController");
const requireDatabase = require("../middlewares/requireDatabase");
const { authenticateToken } = require("../middlewares/auth");

const router = express.Router();

router.post("/register", requireDatabase, authController.register);
router.post("/login", requireDatabase, authController.login);
router.get(
  "/me",
  requireDatabase,
  authenticateToken,
  authController.me
);

module.exports = router;
