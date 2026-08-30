"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true, // allow cookies (refresh token)
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many requests, please slow down." },
});
app.use("/api", globalLimiter);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", environment: process.env.NODE_ENV });
});

app.use("/api/auth",          require("./routes/authRoutes"));
// app.use("/api/students",      require("./routes/studentRoutes"));
// app.use("/api/employers",     require("./routes/employerRoutes"));
// app.use("/api/listings",      require("./routes/listingRoutes"));
// app.use("/api/applications",  require("./routes/applicationRoutes"));
// app.use("/api/notifications", require("./routes/notificationRoutes"));
// app.use("/api/reports",       require("./routes/reportRoutes"));
// app.use("/api/admin",         require("./routes/adminRoutes"));

app.use((_req, res) => {
  res.status(404).json({ status: "error", message: "Route not found." });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isServerError = statusCode >= 500;

  if (isServerError || !err.isAuthError) {
    console.error(`[ERROR] ${err.stack || err.message}`);
  }

  const message =
    process.env.NODE_ENV === "production" && isServerError
      ? "Internal server error."
      : err.message || "Something went wrong.";

  res.status(statusCode).json({ status: "error", message });
});

module.exports = app;
