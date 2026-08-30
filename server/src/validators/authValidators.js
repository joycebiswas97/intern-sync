"use strict";

/**
 * src/validators/authValidators.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Joi schemas for every /api/auth endpoint.
 * Only the register schema is used right now; others are stubs ready to fill
 * in when each endpoint is implemented.
 *
 * WHY JOI INSTEAD OF INLINE VALIDATION IN THE CONTROLLER?
 *   Separating schema definitions from controller logic keeps each file
 *   focused. The controller should only orchestrate DB calls and build
 *   responses — input sanitisation is a distinct responsibility.
 *   It also makes the schema reusable (e.g. tests can import and exercise
 *   the schema directly without spinning up an Express server).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Joi = require("joi");

// ─── Reusable field definitions ─────────────────────────────────────────────
// Defining common field rules once avoids duplication across schemas
// (login and register both need an email rule, for example).

const emailField = Joi.string()
  .email({ tlds: { allow: false } }) // allow: false skips TLD DNS validation
  .lowercase()                        // normalise to lowercase before the DB insert
  .max(255)
  .required()
  .messages({
    "string.email": "Please provide a valid email address.",
    "any.required": "Email is required.",
  });

const passwordField = Joi.string()
  .min(8)
  .max(128) // prevent bcrypt DoS (bcrypt truncates at 72 bytes; 128 is a safe cap)
  .pattern(/[0-9]/, "number")         // must contain at least one digit
  .pattern(/[^a-zA-Z0-9]/, "special") // must contain at least one special char
  .required()
  .messages({
    "string.min":      "Password must be at least 8 characters long.",
    "string.max":      "Password must not exceed 128 characters.",
    "string.pattern.name": "Password must contain at least one {#name} character.",
    "any.required":    "Password is required.",
  });

// ─── Register schema ─────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { email, password, role, fullName? (STUDENT), companyName? (EMPLOYER) }
 *
 * Conditional fields:
 *   - STUDENT registration requires fullName.
 *   - EMPLOYER registration requires companyName.
 *   Joi's .when() applies the conditional requirement based on the role field.
 *
 * stripUnknown: true (set in validate() options below — see controller)
 *   Any unexpected keys (e.g. "isAdmin": true from a crafty client) are
 *   silently removed before the data reaches the controller. Without this,
 *   those fields would pass through and potentially be spread into a DB call.
 */
const registerSchema = Joi.object({
  email: emailField,

  password: passwordField,

  role: Joi.string()
    .valid("STUDENT", "EMPLOYER")
    // ADMIN is intentionally excluded — self-registration as ADMIN is forbidden.
    // PRD §5.1: "ADMIN is never self-registered."
    .required()
    .messages({
      "any.only":    "Role must be either STUDENT or EMPLOYER.",
      "any.required":"Role is required.",
    }),

  // fullName: required when role === "STUDENT", forbidden otherwise.
  fullName: Joi.string()
    .min(2)
    .max(100)
    .when("role", {
      is:   "STUDENT",
      then: Joi.required().messages({
        "any.required": "fullName is required for student registration.",
      }),
      otherwise: Joi.forbidden().messages({
        "any.unknown": "fullName is only accepted for STUDENT role.",
      }),
    }),

  // companyName: required when role === "EMPLOYER", forbidden otherwise.
  companyName: Joi.string()
    .min(2)
    .max(255)
    .when("role", {
      is:   "EMPLOYER",
      then: Joi.required().messages({
        "any.required": "companyName is required for employer registration.",
      }),
      otherwise: Joi.forbidden().messages({
        "any.unknown": "companyName is only accepted for EMPLOYER role.",
      }),
    }),
});

// ─── Validate helper ─────────────────────────────────────────────────────────

/**
 * Validates a request body against a Joi schema.
 * Returns { value, error } — identical to schema.validate() but with
 * consistent options applied (abortEarly, stripUnknown).
 *
 * @param {object} schema - A Joi schema object
 * @param {object} body   - The raw request body
 * @returns {{ value: object, error: import('joi').ValidationError | undefined }}
 */
function validate(schema, body) {
  return schema.validate(body, {
    abortEarly: false,   // collect ALL validation errors, not just the first
    stripUnknown: true,  // silently drop any keys not defined in the schema
    convert: true,       // e.g. coerce email to lowercase (see emailField above)
  });
}

module.exports = {
  registerSchema,
  validate,
};
