"use strict";

require("dotenv").config();

const app = require("./app");
const { sequelize } = require("./models");

const PORT = parseInt(process.env.PORT, 10) || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("✅  Database connection established.");

    // Sync models in development only (use migrations in staging/production)
    if (process.env.NODE_ENV === "development") {
      // Use { alter: true } to non-destructively sync schema changes in dev.
      // Switch to migrations (npx sequelize-cli db:migrate) before going to prod.
      await sequelize.sync({ alter: false });
      console.log("✅  Sequelize models synced.");
    }

    app.listen(PORT, () => {
      console.log(`🚀  InternSync API running on http://localhost:${PORT}`);
      console.log(`    Environment : ${process.env.NODE_ENV || "development"}`);
      console.log(`    Health check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error("❌  Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
