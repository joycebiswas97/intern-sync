"use strict";

/**
 * src/middleware/auth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Exports two composable Express middleware functions:
 *
 *   requireAuth          — verifies the JWT access token, loads the User row
 *                          from the DB, and attaches it as req.user.
 *   requireRole(...roles) — factory that returns a middleware checking
 *                           req.user.role against an allowed list.
 *
 * TYPICAL ROUTE USAGE
 *   router.post(
 *     "/listings",
 *     requireAuth,                        // 1. who are you?
 *     requireRole("EMPLOYER", "ADMIN"),   // 2. are you allowed?
 *     listingController.create            // 3. do the work
 *   );
 *
 * EXECUTION ORDER
 *   Request → requireAuth → requireRole → controller
 *   A failure in any middleware calls next(err) and short-circuits the chain.
 *
 * WHY SERVER-SIDE ENFORCEMENT? (PRD §3)
 *   See the section below after the exports.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const jwt = require("jsonwebtoken");
const { User } = require("../models");

// ─── Constants ─────────────────────────────────────────────────────────────────

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

if (!ACCESS_SECRET) {
  // Crash at startup, not silently at runtime during the first request.
  // A missing secret means every token verification would fail — better to
  // surface this immediately rather than let the server start in a broken state.
  throw new Error(
    "JWT_ACCESS_SECRET is not set. Add it to your .env file and restart."
  );
}

// ─── Helper: create a consistent error object for auth failures ─────────────────

/**
 * Builds a standardised error for authentication and authorization failures.
 * Setting err.status lets the global error handler in app.js set the HTTP
 * status code without duplicating the res.status().json() logic here.
 *
 * @param {string} message - Human-readable error message
 * @param {number} status  - HTTP status code (401 or 403)
 */
function authError(message, status) {
  const err = new Error(message);
  err.status = status;
  err.isAuthError = true; // tag so the global handler can suppress stack traces
  return err;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE 1: requireAuth
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * requireAuth
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies the JWT access token sent in the Authorization header and attaches
 * the full User row to req.user.
 *
 * EXPECTED HEADER FORMAT
 *   Authorization: Bearer <access_token>
 *
 * The client (React SPA) stores the access token in memory (not localStorage)
 * and injects it on every API call via an Axios request interceptor. The
 * refresh token is stored in an httpOnly cookie and is handled separately by
 * POST /api/auth/refresh (never passes through this middleware).
 *
 * STEPS
 *   1. Extract the Bearer token from the Authorization header.
 *   2. Verify the token signature and expiry using JWT_ACCESS_SECRET.
 *   3. Load the User row from the database (to catch banned/deleted users
 *      whose token has not yet expired).
 *   4. Check isBanned.
 *   5. Attach req.user = User instance and call next().
 *
 * STEP 3 — WHY HIT THE DATABASE ON EVERY REQUEST?
 *   JWT is stateless by design — the server cannot revoke a token before its
 *   expiry without a server-side store. By loading the User row on every
 *   request we ensure:
 *     - A banned user (isBanned = true) is rejected even if their token is
 *       still valid (token expires in 15 min; a ban takes effect immediately).
 *     - A deleted user is rejected (User.findByPk returns null).
 *     - Role changes take effect immediately (if an admin downgrades a user
 *       from EMPLOYER → STUDENT, the next request picks up the new role).
 *   The trade-off is one DB SELECT per authenticated request. This is
 *   acceptable for v1 and is mitigated by Sequelize's connection pool.
 *   A v2 optimisation could cache the user row in Redis with a short TTL.
 *
 * ERROR RESPONSES
 *   401 Unauthorized — missing/malformed/expired token or user not found
 *   403 Forbidden    — account is banned
 *
 * @type {import('express').RequestHandler}
 */
async function requireAuth(req, res, next) {
  try {
    // ── Step 1: Extract the token ──────────────────────────────────────────────
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No header or wrong format — not authenticated at all.
      return next(
        authError(
          "Authorization header missing or malformed. Expected: Bearer <token>",
          401
        )
      );
    }

    const token = authHeader.slice(7); // strip "Bearer "

    // ── Step 2: Verify the token ───────────────────────────────────────────────
    let payload;
    try {
      payload = jwt.verify(token, ACCESS_SECRET);
      // payload shape (set by the auth controller on login/register):
      //   { id: "<userId>", role: "<role>", iat: <number>, exp: <number> }
    } catch (jwtErr) {
      // jwt.verify throws specific error types we can inspect:
      //   JsonWebTokenError  — malformed token, wrong signature
      //   TokenExpiredError  — valid token but exp < now
      //   NotBeforeError     — nbf claim in future (unlikely, but handle anyway)
      const isExpired = jwtErr.name === "TokenExpiredError";
      return next(
        authError(
          isExpired
            ? "Access token has expired. Use POST /api/auth/refresh to obtain a new one."
            : "Invalid access token.",
          401
        )
      );
    }

    // ── Step 3: Load the User from the database ────────────────────────────────
    // We use the `id` from the payload, not `role` — the DB is the source of
    // truth. If the role was changed after the token was issued, we get the
    // current role, not the stale one baked into the token.
    const user = await User.findByPk(payload.id, {
      // Load only the columns needed for auth checks — skip heavy fields like
      // bio, resumeUrl, etc. The controller can re-fetch the full row if needed.
      attributes: ["id", "email", "role", "isEmailVerified", "isBanned"],
    });

    if (!user) {
      // Token was valid (correct signature, not expired) but the user row is
      // gone — account was deleted after the token was issued.
      return next(authError("User account not found.", 401));
    }

    // ── Step 4: Check ban status ───────────────────────────────────────────────
    if (user.isBanned) {
      // 403 Forbidden (not 401): we know who you are, but you're not allowed.
      return next(
        authError(
          "Your account has been suspended. Contact support@internsync.dev if you believe this is a mistake.",
          403
        )
      );
    }

    // ── Step 5: Attach user to request and continue ────────────────────────────
    // req.user is the Sequelize User instance. Downstream middleware and
    // controllers can read:
    //   req.user.id              — for ownership checks ("is this your listing?")
    //   req.user.role            — for role-based access (also enforced by requireRole)
    //   req.user.isEmailVerified — for feature gates ("must verify email to apply")
    req.user = user;
    next();
  } catch (err) {
    // Unexpected errors (DB connection failure, etc.) — pass to global handler.
    next(err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE 2: requireRole(...roles)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * requireRole(...roles)
 * ─────────────────────────────────────────────────────────────────────────────
 * Factory function that returns an Express middleware checking whether the
 * authenticated user's role is in the allowed list.
 *
 * MUST be used AFTER requireAuth (it reads req.user set by requireAuth).
 * If req.user is absent, the middleware throws a programming error — a missing
 * requireAuth in the chain is a bug, not a user error.
 *
 * USAGE PATTERNS
 *   // Single role:
 *   router.get("/admin/users", requireAuth, requireRole("ADMIN"), handler);
 *
 *   // Multiple roles (any one is sufficient):
 *   router.post("/listings", requireAuth, requireRole("EMPLOYER", "ADMIN"), handler);
 *
 *   // Variadic OR spread:
 *   const allowedRoles = ["EMPLOYER", "ADMIN"];
 *   router.patch("/listings/:id", requireAuth, requireRole(...allowedRoles), handler);
 *
 * WHY A FACTORY AND NOT A SINGLE MIDDLEWARE?
 *   Different endpoints allow different role sets. A factory lets us declare
 *   the allowed roles inline at the route definition — the most readable and
 *   maintainable approach. The alternative (a single middleware that reads
 *   roles from req.routeRoles) requires extra router setup and is harder to
 *   understand at a glance.
 *
 * ERROR RESPONSES
 *   403 Forbidden — authenticated but wrong role
 *
 * @param {...string} roles - Allowed role values from the User.role ENUM
 *                           ("STUDENT" | "EMPLOYER" | "ADMIN")
 * @returns {import('express').RequestHandler}
 */
function requireRole(...roles) {
  // Validate at route-definition time (when the server starts), not per-request.
  // If a developer passes an invalid role string, catch it immediately.
  const VALID_ROLES = new Set(["STUDENT", "EMPLOYER", "ADMIN"]);
  const invalid = roles.filter((r) => !VALID_ROLES.has(r));
  if (invalid.length > 0) {
    throw new Error(
      `requireRole() received invalid role(s): ${invalid.join(", ")}. ` +
        `Must be one of: STUDENT, EMPLOYER, ADMIN.`
    );
  }

  if (roles.length === 0) {
    throw new Error(
      "requireRole() requires at least one role argument. " +
        "For public routes, simply omit requireAuth and requireRole."
    );
  }

  const allowedSet = new Set(roles); // O(1) lookup per request

  /**
   * The actual Express middleware returned by the factory.
   *
   * @type {import('express').RequestHandler}
   */
  return function checkRole(req, _res, next) {
    // Programming guard — requireAuth must precede requireRole in the chain.
    if (!req.user) {
      return next(
        new Error(
          "requireRole() used without requireAuth in the middleware chain. " +
            "Add requireAuth before requireRole on this route."
        )
      );
    }

    if (!allowedSet.has(req.user.role)) {
      // We know who the user is (401 is wrong here) — they just don't have
      // permission. 403 Forbidden is semantically correct.
      return next(
        authError(
          `Access denied. This endpoint requires one of the following roles: ${roles.join(", ")}. ` +
            `Your role is: ${req.user.role}.`,
          403
        )
      );
    }

    // Role is allowed — continue to next middleware or controller.
    next();
  };
}

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = { requireAuth, requireRole };

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY ROLE-CHECKING MUST HAPPEN SERVER-SIDE (PRD §3, verbatim)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PRD §3 states:
 *   "Authorization must be enforced server-side on every endpoint
 *    (never trust the client role claim without verifying the JWT + DB role
 *    via middleware)."
 *
 * There are three classes of client-side "enforcement" and why each fails:
 *
 * ── 1. UI gating ("hide the button") ────────────────────────────────────────
 *   The React frontend can hide "Post a Listing" for STUDENT users.
 *   This is a UX improvement, not security. The React bundle is public —
 *   any user can open DevTools, modify the client state, or call the API
 *   directly with curl/Postman. Hiding the button does not prevent the request.
 *
 * ── 2. Trusting the role claim inside the JWT ────────────────────────────────
 *   The JWT payload includes { role: "EMPLOYER" }. An attacker could:
 *     a) Decode a leaked token (JWT is base64 — not encrypted, only signed).
 *     b) Forge a token with role: "ADMIN" if they know or guess the secret.
 *   Even without forgery: if an admin demotes a user from EMPLOYER → STUDENT,
 *   the stale token still contains role: "EMPLOYER" until it expires (15 min).
 *   Trusting the token's role claim means a demoted user retains their old
 *   privileges for up to 15 minutes — a window for abuse.
 *
 *   requireAuth solves this by loading the User row on every request and
 *   reading role from the DB row, ignoring the token's role claim entirely.
 *
 * ── 3. Client-side role storage (localStorage, Redux) ───────────────────────
 *   Any data the client stores can be tampered with via DevTools console:
 *     localStorage.setItem("role", "ADMIN");
 *   A backend that reads role from query params or request body faces the
 *   same problem. Server-side middleware with a DB lookup is the only
 *   authoritative source.
 *
 * THE CORRECT MODEL (defence in depth)
 *   Layer 1 — UI: hide/show controls based on the user's role (UX, not security)
 *   Layer 2 — requireAuth: verify the token signature and expiry, load the DB row
 *   Layer 3 — requireRole: check the DB-sourced role against the allowed list
 *   Layer 4 — controller: check ownership ("does this listing belong to req.user?")
 *
 *   An attacker must defeat all four layers. Layers 2–4 are server-side and
 *   cannot be bypassed from the client.
 *
 * HOW THE TWO MIDDLEWARES COMPOSE (end-to-end example)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   // Route definition:
 *   router.post(
 *     "/listings",
 *     requireAuth,                      // ← layer 2
 *     requireRole("EMPLOYER", "ADMIN"), // ← layer 3
 *     listingController.create          // ← layer 4 (ownership check inside)
 *   );
 *
 *   Scenario A — unauthenticated request (no Authorization header):
 *     requireAuth → returns 401 immediately → chain stops
 *
 *   Scenario B — valid token, role = STUDENT:
 *     requireAuth → passes (token valid, user not banned) → req.user set
 *     requireRole → req.user.role "STUDENT" ∉ {"EMPLOYER","ADMIN"} → 403
 *
 *   Scenario C — valid token, role = EMPLOYER, not yet verified by admin:
 *     requireAuth → passes → req.user set
 *     requireRole → passes (EMPLOYER is in the allowed list)
 *     controller  → checks employer.verificationStatus !== "APPROVED" → 403
 *                   (this is layer 4 — requireRole cannot know about the
 *                    verificationStatus business rule)
 *
 *   Scenario D — valid token, role = EMPLOYER, verified:
 *     requireAuth → passes
 *     requireRole → passes
 *     controller  → creates the listing, returns 201
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
