"use strict";

/**
 * src/routes/authRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mounts all /api/auth/* endpoints.
 *
 * Each route applies its own specific rate limiter in addition to the global
 * limiter in app.js. Auth endpoints are high-value targets for brute-force
 * and credential-stuffing attacks and deserve tighter limits.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ─── Auth-specific rate limiter ────────────────────────────────────────────────
// Stricter than the global 100 req/min — auth endpoints are sensitive.
// POST /register: 10 accounts per 15 minutes per IP is generous for legitimate use.
// POST /login:    same window, will be applied on the login stub when implemented.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many auth requests. Please wait 15 minutes and try again.",
  },
});

// ─── Routes ────────────────────────────────────────────────────────────────────

// POST /api/auth/register
// Public — no requireAuth (the user doesn't have a token yet).
// authLimiter prevents automated account creation at scale.
router.post("/register", authLimiter, register);

// POST /api/auth/verify-email  (stub — implemented later)
router.post("/verify-email", authLimiter, verifyEmail);

// POST /api/auth/login  (stub)
router.post("/login", authLimiter, login);

// POST /api/auth/refresh  (stub — uses httpOnly cookie, no requireAuth)
router.post("/refresh", refresh);

// POST /api/auth/logout  (stub — requireAuth so we know whose token to invalidate)
router.post("/logout", requireAuth, logout);

// POST /api/auth/forgot-password  (stub)
router.post("/forgot-password", authLimiter, forgotPassword);

// POST /api/auth/reset-password  (stub)
router.post("/reset-password", authLimiter, resetPassword);

// GET  /api/auth/me  (stub — requires valid token)
router.get("/me", requireAuth, me);

module.exports = router;
