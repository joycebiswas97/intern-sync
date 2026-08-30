"use strict";

/**
 * src/models/User.js
 * ─────────────────────────────────────────────────────────────────────────────
 * The User model is the authentication root of every actor in InternSync.
 * Every Student, Employer, and Admin has exactly one row here.
 * Role-specific data lives in separate profile tables (StudentProfile,
 * EmployerProfile) linked back via userId foreign keys.
 *
 * Follows the models/index.js factory pattern:
 *   module.exports = (sequelize, DataTypes) => { ... return Model; }
 * The auto-loader in index.js calls this with the shared Sequelize instance
 * and DataTypes, registers the returned model by its name ("User"), then
 * calls .associate() after all models are loaded.
 * ─────────────────────────────────────────────────────────────────────────────
 */

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User", // → table name "Users" (Sequelize pluralises by default)
    {
      // ── Primary Key ──────────────────────────────────────────────────────────

      id: {
        /**
         * DataTypes.UUID  → Postgres `UUID` column type.
         * defaultValue: DataTypes.UUIDV4 → Sequelize generates a v4 UUID in
         *   JavaScript before the INSERT, so you know the ID before the DB
         *   round-trip completes. This is safe to expose in URLs (no sequential
         *   enumeration attack, unlike SERIAL integers).
         */
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── Authentication ───────────────────────────────────────────────────────

      email: {
        /**
         * DataTypes.STRING → VARCHAR(255).
         * allowNull: false  → NOT NULL constraint in Postgres.
         * unique: true      → UNIQUE constraint; a concurrent race that bypasses
         *   JS-level checks is caught by Postgres and surfaces as
         *   SequelizeUniqueConstraintError (PRD §5.1 edge case → 409 Conflict).
         * validate.isEmail  → Sequelize validator runs in JS before any SQL,
         *   providing an early rejection with a descriptive ValidationError.
         */
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },

      passwordHash: {
        /**
         * Stores the bcrypt output (≈60 chars, always fits in VARCHAR(255)).
         * The auth service hashes with bcrypt at salt rounds 12 (PRD §6)
         * before assigning this field. Plain-text passwords are NEVER stored.
         */
        type: DataTypes.STRING,
        allowNull: false,
      },

      // ── Role (ENUM) ──────────────────────────────────────────────────────────

      role: {
        /**
         * DataTypes.ENUM(...values) → Postgres creates a named custom type:
         *   CREATE TYPE "enum_Users_role" AS ENUM ('STUDENT', 'EMPLOYER', 'ADMIN');
         * and uses it for the column definition.
         *
         * DB-level enforcement: inserting any value outside the three strings
         * raises a Postgres error before JS can process a response. There is
         * no way for an application bug to store an invalid role.
         *
         * ADMIN is in the enum but is NEVER exposed in the registration
         * endpoint — it must be seeded or invited (PRD §3, §5.1).
         *
         * Adding a new value later requires ALTER TYPE, which is a separate
         * migration. Acceptable for v1 (three roles are exhaustive per PRD).
         */
        type: DataTypes.ENUM("STUDENT", "EMPLOYER", "ADMIN"),
        allowNull: false,
      },

      // ── Account Status ───────────────────────────────────────────────────────

      isEmailVerified: {
        /**
         * Starts as false on registration. Set to true only after the user
         * clicks the link in their verification email.
         * The login response always returns this flag so the frontend can
         * block actions that require verification (e.g., applying to listings)
         * per PRD §5.1 edge cases.
         */
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      isBanned: {
        /**
         * Admins toggle this via PATCH /api/admin/users/:id/ban (PRD §5.7).
         * The auth middleware checks it on every authenticated request and
         * returns 403 Forbidden when true, per PRD §5.1 edge cases.
         */
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      // ── Email-Verification Token ─────────────────────────────────────────────
      // Required to implement POST /api/auth/verify-email (PRD §5.1).

      emailVerificationToken: {
        /**
         * A random token (crypto.randomBytes hex string or signed JWT) emailed
         * to the user on registration. On POST /api/auth/verify-email the
         * controller looks up the user WHERE this token matches AND
         * emailVerificationExpires > NOW(). On success:
         *   isEmailVerified = true, token = null, expires = null  (single-use).
         */
        type: DataTypes.STRING,
        allowNull: true,
      },

      emailVerificationExpires: {
        /**
         * DataTypes.DATE → TIMESTAMPTZ (timestamp with time zone) in Postgres.
         * Set to Date.now() + 24h on registration (PRD §5.1 "expires in 24h").
         * Nulled out alongside the token after successful verification.
         */
        type: DataTypes.DATE,
        allowNull: true,
      },

      // ── Password-Reset Token ─────────────────────────────────────────────────
      // Required to implement POST /api/auth/forgot-password and
      //                          POST /api/auth/reset-password (PRD §5.1).

      passwordResetToken: {
        /**
         * Same single-use pattern as the email-verification token.
         * Generated on POST /api/auth/forgot-password, emailed, then consumed
         * on POST /api/auth/reset-password where the controller:
         *   1. Finds user WHERE token matches AND passwordResetExpires > NOW()
         *   2. Hashes the new password and saves it
         *   3. Nulls both token fields (invalidates the reset link)
         */
        type: DataTypes.STRING,
        allowNull: true,
      },

      passwordResetExpires: {
        /**
         * Typical reset window is 1 hour. Using DATE (TIMESTAMPTZ) so the
         * query can use standard SQL comparison: WHERE "passwordResetExpires" > NOW().
         */
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      // ── Table-level options ──────────────────────────────────────────────────

      /**
       * indexes[]
       *   Adds an explicitly named UNIQUE index on email at the table level.
       *   This is in addition to the column-level unique:true above.
       *
       *   WHY BOTH?
       *   - unique:true on the column: makes Sequelize populate
       *     SequelizeUniqueConstraintError.fields with ["email"] so the
       *     controller knows which field caused the 409, without having to
       *     parse the raw Postgres error message.
       *   - Named indexes[] entry: gives the index a human-readable name
       *     ("users_email_unique") in Postgres's pg_indexes catalogue instead
       *     of Sequelize's auto-generated "users_email_key". Easier to
       *     reference in future migrations with removeIndex("Users",
       *     { name: "users_email_unique" }).
       */
      indexes: [
        {
          unique: true,
          fields: ["email"],
          name: "users_email_unique",
        },
      ],

      /**
       * timestamps: true (inherited from db.js sharedOptions.define)
       *   Sequelize auto-manages createdAt and updatedAt on every write.
       *   Both columns must appear in the migration (see below).
       *
       * underscored: false (inherited)
       *   Column names stay camelCase in Postgres (passwordHash, createdAt)
       *   matching the PRD model definitions.
       */
    }
  );

  // ── Associations ─────────────────────────────────────────────────────────────
  // Called by models/index.js after ALL models have been registered,
  // so it is safe to reference models that appear later alphabetically.

  User.associate = (models) => {
    /**
     * hasOne → StudentProfile
     *   A STUDENT user has exactly one profile row.
     *   foreignKey "userId" lives on StudentProfile (the "many" side of a
     *   1-to-1 — in Sequelize hasOne, the FK is placed on the target model).
     *
     * Guard: models.StudentProfile may not exist yet during incremental
     *   development. The check is removed naturally once all models are added.
     */
    if (models.StudentProfile) {
      User.hasOne(models.StudentProfile, {
        foreignKey: "userId",
        as: "studentProfile",
      });
    }

    /**
     * hasOne → EmployerProfile
     *   Same pattern. An EMPLOYER user has exactly one company profile.
     */
    if (models.EmployerProfile) {
      User.hasOne(models.EmployerProfile, {
        foreignKey: "userId",
        as: "employerProfile",
      });
    }

    /**
     * hasMany → Application (via studentId)
     *   A student user can submit many applications over their lifetime.
     *   The FK name is studentId (not userId) because the Application model
     *   needs to distinguish "the listing's employer" from "the applicant".
     */
    if (models.Application) {
      User.hasMany(models.Application, {
        foreignKey: "studentId",
        as: "applications",
      });
    }

    /**
     * hasMany → Report (via reporterId)
     *   Any authenticated user (student or employer) can file reports.
     *   FK name is reporterId to match the PRD Report model definition.
     */
    if (models.Report) {
      User.hasMany(models.Report, {
        foreignKey: "reporterId",
        as: "reports",
      });
    }

    /**
     * hasMany → Notification
     *   In-app bell notifications delivered to any role.
     */
    if (models.Notification) {
      User.hasMany(models.Notification, {
        foreignKey: "userId",
        as: "notifications",
      });
    }

    /**
     * hasMany → SavedListing (bookmarks)
     *   Only STUDENT users bookmark listings in practice, but the FK sits
     *   on SavedListing.studentId which references Users.id, so the
     *   association is defined here for Sequelize include() to work.
     */
    if (models.SavedListing) {
      User.hasMany(models.SavedListing, {
        foreignKey: "studentId",
        as: "savedListings",
      });
    }
  };

  return User;
};
