"use strict";

/**
 * Migration: create-notifications
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates the "Notifications" table.
 *
 * DEPENDENCY ORDER
 *   Must run AFTER:
 *     20260829211509-create-users.js  (FK: userId → Users.id)
 *
 * NO ENUM TYPES CREATED — status is a STRING column, not ENUM.
 * No orphaned types to clean up in `down`.
 *
 * FK SEMANTICS
 *   userId → CASCADE on delete
 *   Notifications have no audit value after the recipient is gone.
 *   Cascade-delete keeps the table clean automatically on account deletion.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Notifications", {

      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── FK: recipient ─────────────────────────────────────────────────────────
      userId: {
        /**
         * onDelete: CASCADE — when a user is deleted, remove all their
         * notifications. No audit value in orphaned notification rows.
         */
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      // ── Event type (STRING, not ENUM) ─────────────────────────────────────────
      type: {
        /**
         * STRING instead of ENUM so new notification types can be introduced
         * without an ALTER TYPE migration. Allowed values are validated
         * in the notification service, not enforced in the DB schema.
         * Examples: "APPLICATION_STATUS_CHANGED", "LISTING_APPROVED",
         *           "EMPLOYER_VERIFIED", "NEW_APPLICATION"
         */
        type: Sequelize.STRING,
        allowNull: false,
      },

      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      body: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      isRead: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // Compound index: unread notifications for a user (bell badge query).
    // Also serves: all notifications for a user (leftmost prefix on userId).
    await queryInterface.addIndex("Notifications", {
      fields: ["userId", "isRead"],
      name: "notifications_user_id_is_read_idx",
    });
  },

  async down(queryInterface) {
    // No ENUM types to clean up — just drop the table.
    await queryInterface.dropTable("Notifications");
  },
};
