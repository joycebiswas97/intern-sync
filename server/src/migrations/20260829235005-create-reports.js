"use strict";

/**
 * Migration: create-reports
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates the "Reports" table.
 *
 * DEPENDENCY ORDER
 *   Must run AFTER:
 *     20260829211509-create-users.js    (FK: reporterId → Users.id)
 *     20260829214857-create-listings.js (FK: listingId  → Listings.id)
 *
 * ENUM CREATED: "enum_Reports_status"  — must be dropped in `down`.
 *
 * FK SEMANTICS
 *   reporterId  → SET NULL on user delete (preserve report for audit)
 *   listingId   → SET NULL on listing delete (preserve report for audit)
 *   reportedUserId → SET NULL on user delete (preserve report for audit)
 *   All three targets nullable in the migration to accommodate SET NULL.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Reports", {

      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── FK: reporter ──────────────────────────────────────────────────────────
      reporterId: {
        /**
         * allowNull: true in the migration so ON DELETE SET NULL works.
         * The model/app layer enforces non-null on creation.
         * If the reporter's account is deleted, preserve the report for admin.
         */
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      // ── FK: target listing (nullable — one of listingId/reportedUserId is set) ─
      listingId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "Listings", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      // ── FK: target user (nullable — no formal Sequelize association) ──────────
      reportedUserId: {
        /**
         * No references block here intentionally.
         * A formal FK to Users would prevent deleting a user who has been
         * reported (SET NULL would require allowNull and a FK constraint that
         * Sequelize cannot manage correctly without a named association).
         * For v1, the controller validates reportedUserId existence before
         * insert; the referential integrity is application-layer only.
         * This is an accepted trade-off for the polymorphic pattern.
         */
        type: Sequelize.UUID,
        allowNull: true,
      },

      // ── Content ───────────────────────────────────────────────────────────────
      reason: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      details: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // ── ENUM: resolution status ────────────────────────────────────────────────
      status: {
        type: Sequelize.ENUM("OPEN", "RESOLVED", "DISMISSED"),
        allowNull: false,
        defaultValue: "OPEN",
      },

      resolutionNote: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // Admin moderation queue: WHERE status = 'OPEN'
    await queryInterface.addIndex("Reports", {
      fields: ["status"],
      name: "reports_status_idx",
    });

    // Filter reports by reporter: WHERE reporterId = ?
    await queryInterface.addIndex("Reports", {
      fields: ["reporterId"],
      name: "reports_reporter_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Reports");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Reports_status";'
    );
  },
};
