"use strict";

/**
 * src/controllers/authController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles /api/auth/* endpoints.
 * Currently implemented: register.
 * Stubs present for the rest of the auth flow (login, verify-email, etc.)
 * to be filled in incrementally.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const bcrypt = require("bcrypt");
const { UniqueConstraintError } = require("sequelize");
const { User, StudentProfile, EmployerProfile } = require("../models");
const { registerSchema, validate } = require("../validators/authValidators");

// Number of bcrypt salt rounds. 12 is the PRD §6 recommendation.
// Cost factor doubles hashing time with every increment:
//   10 rounds ≈  65 ms  (too fast for production — brute-force friendly)
//   12 rounds ≈ 250 ms  (good balance of security and UX)
//   14 rounds ≈   1 s  (noticeably slow for login on cheap hardware)
const BCRYPT_ROUNDS = 12;

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

/**
 * register
 *
 * Creates a new User row and a stub profile (StudentProfile or EmployerProfile)
 * in a single Sequelize transaction so both succeed or both roll back.
 *
 * Request body:
 *   { email, password, role, fullName }   ← STUDENT
 *   { email, password, role, companyName }← EMPLOYER
 *
 * Responses:
 *   201 Created   — registration succeeded
 *   400 Bad Request — Joi validation failed
 *   409 Conflict  — email already registered
 *   500 Internal  — unexpected error (passed to global handler)
 *
 * @type {import('express').RequestHandler}
 */
async function register(req, res, next) {
  // ── Step 1: Validate and sanitise the request body ─────────────────────────
  // Joi validates all fields at once (abortEarly: false) so the client gets a
  // full list of errors in a single response rather than fixing one at a time.
  const { value: body, error: validationError } = validate(
    registerSchema,
    req.body
  );

  if (validationError) {
    // validationError.details is an array of { message, path, type } objects.
    // Map it to a flat list of human-readable strings for the response.
    const messages = validationError.details.map((d) => d.message);
    return res.status(400).json({
      status: "error",
      message: "Validation failed.",
      errors: messages,
    });
  }

  // body is now sanitised:
  //   - email lowercased
  //   - unknown keys stripped
  //   - all fields present and typed correctly
  const { email, password, role, fullName, companyName } = body;

  // ── Step 2: Hash the password ──────────────────────────────────────────────
  // bcrypt.hash() is intentionally slow (cost 12 ≈ 250 ms on modern hardware).
  // This is the defence against brute-force attacks on a leaked database:
  //   - An attacker who dumps the DB gets bcrypt hashes, not passwords.
  //   - At 250 ms per hash, cracking 1 million hashes takes ~70 hours on
  //     a single GPU — impractical without massive resources.
  //
  // We hash BEFORE the DB transaction intentionally:
  //   - If bcrypt fails (OOM, etc.), we haven't opened a transaction yet.
  //   - The transaction is kept as short as possible (minimises lock time).
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // ── Step 3: Create User + Profile in a transaction ─────────────────────────
  // Using a transaction ensures atomicity:
  //   - If User.create succeeds but profile creation fails, the entire
  //     operation rolls back. The client gets a 500 and can retry.
  //   - Without a transaction, a failed profile insert would leave an orphaned
  //     User row (a user with no profile, who can log in but has no identity).
  //
  // sequelize.transaction() with the callback form auto-commits on success
  // and auto-rolls back if the callback throws.
  const sequelize = User.sequelize;

  let newUser;
  try {
    newUser = await sequelize.transaction(async (t) => {
      // ── Step 3a: Create the User row ────────────────────────────────────────
      const user = await User.create(
        {
          email,                // already lowercased by Joi
          passwordHash,         // bcrypt hash, never the plain password
          role,                 // "STUDENT" or "EMPLOYER" (Joi blocked "ADMIN")
          isEmailVerified: false, // must verify email via the token flow (PRD §5.1)
          isBanned: false,
          // emailVerificationToken and emailVerificationExpires will be set
          // by the email verification step (POST /api/auth/verify-email).
          // Left null here since we're not implementing that step yet.
        },
        { transaction: t }
      );
      // If email is already taken, User.create throws UniqueConstraintError here.
      // The transaction callback propagates the throw, triggering auto-rollback.
      // The outer try/catch converts it to a 409 response.

      // ── Step 3b: Create the stub profile ────────────────────────────────────
      // "Stub" means only the required fields — the user fills in the rest
      // via the profile-edit endpoints after registration.

      if (role === "STUDENT") {
        // StudentProfile requires userId and fullName at a minimum.
        await StudentProfile.create(
          {
            userId: user.id,
            fullName,           // captured at registration for STUDENT
          },
          { transaction: t }
        );
      } else {
        // role === "EMPLOYER"
        // EmployerProfile requires userId and companyName.
        // verificationStatus defaults to "PENDING" in the model — no need to set it.
        await EmployerProfile.create(
          {
            userId: user.id,
            companyName,        // captured at registration for EMPLOYER
            // verificationStatus: "PENDING" ← applied by model defaultValue
          },
          { transaction: t }
        );
      }

      return user; // returned from the transaction callback and committed
    });
  } catch (err) {
    // ── Step 4: Handle known errors ────────────────────────────────────────────

    if (err instanceof UniqueConstraintError) {
      // Postgres raised error 23505 on the unique index on Users.email.
      // This happens atomically at the DB level so concurrent duplicate
      // requests are both caught correctly (no race window — see auth.js).
      //
      // We do NOT reveal WHETHER the email exists in the error message,
      // to prevent user enumeration attacks:
      //   BAD:  "This email is already registered."
      //   GOOD: "An account with this email already exists."
      //   EVEN BETTER (v2): return 200 and send a "you already have an account,
      //   click here to log in" email to prevent enumeration entirely.
      return res.status(409).json({
        status: "error",
        message: "An account with this email already exists.",
      });
    }

    // Any other error (DB connection failure, constraint violation we didn't
    // anticipate, etc.) — pass to the global error handler in app.js.
    return next(err);
  }

  // ── Step 5: Return 201 with safe user data ─────────────────────────────────
  // Never return passwordHash, emailVerificationToken, or any internal fields.
  // The response shape is intentionally minimal — the client will call
  // GET /api/auth/me after login to get the full profile.
  return res.status(201).json({
    status: "success",
    message:
      role === "STUDENT"
        ? "Registration successful. Please check your email to verify your account."
        : "Registration successful. Your employer account is pending admin verification.",
    data: {
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        isEmailVerified: newUser.isEmailVerified,
        // verificationStatus only relevant for employers — include it so the
        // frontend can show the "pending verification" banner immediately.
        ...(role === "EMPLOYER" && { verificationStatus: "PENDING" }),
      },
    },
  });
}

// ─── Future endpoint stubs ────────────────────────────────────────────────────
// Kept as named stubs so the route file can import them now without crashing.
// Each returns 501 Not Implemented until it's built out.

function verifyEmail(_req, res) {
  res.status(501).json({ status: "error", message: "Not yet implemented." });
}

function login(_req, res) {
  res.status(501).json({ status: "error", message: "Not yet implemented." });
}

function refresh(_req, res) {
  res.status(501).json({ status: "error", message: "Not yet implemented." });
}

function logout(_req, res) {
  res.status(501).json({ status: "error", message: "Not yet implemented." });
}

function forgotPassword(_req, res) {
  res.status(501).json({ status: "error", message: "Not yet implemented." });
}

function resetPassword(_req, res) {
  res.status(501).json({ status: "error", message: "Not yet implemented." });
}

function me(_req, res) {
  res.status(501).json({ status: "error", message: "Not yet implemented." });
}

module.exports = {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
};
