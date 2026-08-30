"use strict";

/**
 * Migration: create-employer-profiles
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates the "EmployerProfiles" table.
 *
 * DEPENDENCY ORDER
 *   Must run AFTER:
 *     20260829211509-create-users.js          (Users table — FK target)
 *   Must run BEFORE:
 *     (any future migration that creates the Listings table, which FKs
 *      to EmployerProfiles.id via employerId)
 *
 * ENUM TYPE
 *   verificationStatus uses a Postgres named ENUM type:
 *     "enum_EmployerProfiles_verificationStatus"
 *   The `down` function MUST drop it explicitly — Postgres does NOT
 *   cascade-drop custom types when the owning table is dropped.
 *
 * Run:   npm run db:migrate
 * Undo:  npm run db:migrate:undo
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("EmployerProfiles", {

      // ── Primary Key ──────────────────────────────────────────────────────────
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── Foreign Key ─────────────────────────────────────────────────────────
      userId: {
        /**
         * UUID → Users.id
         *
         * unique: true
         *   Enforces 1-to-1 at the DB level. One User can own at most one
         *   EmployerProfile. Without this, hasOne becomes silently unreliable.
         *
         * references + onDelete: "CASCADE"
         *   Deleting a User automatically removes their EmployerProfile.
         *   Referential integrity is enforced by Postgres, not the app layer.
         *
         * onUpdate: "CASCADE"
         *   Propagates any PK change on Users.id to EmployerProfiles.userId.
         *   UUIDs rarely change but this is defensive good practice.
         */
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      // ── Company Identity ─────────────────────────────────────────────────────
      companyName: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      companyLogoUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      companyWebsite: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      industry: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      companySize: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      aboutCompany: {
        /** TEXT — no 255-char limit. Company descriptions can be lengthy. */
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // ── Verification Status ENUM ─────────────────────────────────────────────
      verificationStatus: {
        /**
         * Sequelize emits two DDL statements for this column:
         *   1. CREATE TYPE "enum_EmployerProfiles_verificationStatus"
         *         AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
         *   2. Uses that named type for the column definition.
         *
         * WHY DEFAULT TO "PENDING"?
         *   Every new employer starts in PENDING. Admins must explicitly
         *   approve before the employer can post listings. This prevents
         *   unvetted employers from reaching students immediately on
         *   registration. Full rationale in EmployerProfile.js model comments.
         *
         * The column-level DEFAULT is set here in the migration (in addition
         * to defaultValue in the model) so that any direct SQL INSERT that
         * bypasses Sequelize also receives the correct default — defence in
         * depth against application bugs or manual DB operations.
         */
        type: Sequelize.ENUM("PENDING", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "PENDING",
      },

      // ── Rejection Reason ─────────────────────────────────────────────────────
      rejectionReason: {
        /**
         * Populated only when verificationStatus = "REJECTED".
         * Shown to the employer so they know what to fix before resubmitting.
         * NULL in PENDING and APPROVED states.
         */
        type: Sequelize.STRING,
        allowNull: true,
      },

      // ── Sequelize Timestamps ─────────────────────────────────────────────────
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // ── Named UNIQUE index on userId ───────────────────────────────────────────
    // Human-readable name for pg_indexes. Required for stable removeIndex()
    // calls in any future migration that needs to touch this constraint.
    await queryInterface.addIndex("EmployerProfiles", {
      fields: ["userId"],
      unique: true,
      name: "employer_profiles_user_id_unique",
    });

    // ── Index on verificationStatus ────────────────────────────────────────────
    // The admin moderation queue (PRD §5.7) queries:
    //   GET /api/admin/employers?status=PENDING
    // which translates to WHERE "verificationStatus" = 'PENDING'.
    // An index on this low-cardinality column is useful because the query
    // returns a small subset of rows from a potentially large table.
    await queryInterface.addIndex("EmployerProfiles", {
      fields: ["verificationStatus"],
      name: "employer_profiles_verification_status_idx",
    });
  },

  async down(queryInterface /*, Sequelize */) {
    // ── Drop the table ────────────────────────────────────────────────────────
    // Automatically removes all indexes and the inline FK constraint.
    await queryInterface.dropTable("EmployerProfiles");

    // ── Drop the orphaned ENUM type ────────────────────────────────────────────
    // Postgres retains the named type even after the table is gone.
    // Without this, re-running db:migrate (up) fails with:
    //   ERROR: type "enum_EmployerProfiles_verificationStatus" already exists
    // IF EXISTS makes this idempotent (safe to run multiple times).
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_EmployerProfiles_verificationStatus";'
    );
  },
};
