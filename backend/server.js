const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const env = require("./config/env");
const initializeDatabase = require("./services/databaseService");
const healthController = require("./controllers/healthController");
const authRoutes = require("./routes/authRoutes");
const locationRoutes = require("./routes/locationRoutes");
const placeRoutes = require("./routes/placeRoutes");
const adminRoutes = require("./routes/adminRoutes");
const {
  notFoundHandler,
  errorHandler,
} = require("./middlewares/errorHandler");

const app = express();

const frontendDist = path.join(__dirname, "../frontend/dist");
const hasFrontendBuild = fs.existsSync(path.join(frontendDist, "index.html"));

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", healthController.health);

app.use("/api", authRoutes);
app.use("/api", locationRoutes);
app.use("/api", placeRoutes);
app.use("/api", adminRoutes);

if (hasFrontendBuild) {
  app.use(express.static(frontendDist));

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  app.get("/", healthController.root);
  app.use(notFoundHandler);
}

app.use(errorHandler);

async function startServer() {
  if (!env.jwtSecret) {
    console.error("JWT_SECRET is missing");
    process.exit(1);
  }

  try {
    await initializeDatabase();

    app.listen(env.port, "0.0.0.0", () => {
      console.log(`Server running on port ${env.port}`);
      if (hasFrontendBuild) {
        console.log(`Frontend is served from ${frontendDist}`);
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
