"use strict";

/**
 * src/models/Notification.js
 * ─────────────────────────────────────────────────────────────────────────────
 * In-app bell notification delivered to a specific user.
 *
 * Notifications are created by the server (not the user) in response to
 * platform events:
 *   APPLICATION_STATUS_CHANGED  — student's application moved by employer
 *   LISTING_APPROVED            — employer's listing cleared by admin
 *   LISTING_REJECTED            — employer's listing rejected by admin
 *   EMPLOYER_VERIFIED           — employer account approved by admin
 *   NEW_APPLICATION             — employer gets notified of a new applicant
 *   (etc. — full list in PRD §5.9)
 *
 * ASSOCIATIONS
 *   User ──hasMany──▶ Notification  (FK: Notification.userId)  [User.js as="notifications"]
 *   Notification ──belongsTo──▶ User (as "user", fk: userId)
 *
 * NO EMAIL LINK HERE
 *   The notification service (src/services/notificationService.js) handles
 *   both in-app notifications (writing this table) and email dispatch
 *   (via nodemailer). They share the same trigger points but are separate
 *   side effects — this model stores only the in-app record.
 * ─────────────────────────────────────────────────────────────────────────────
 */

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification", // → table name "Notifications"
    {
      // ── Primary Key ────────────────────────────────────────────────────────

      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── Recipient ──────────────────────────────────────────────────────────

      userId: {
        /**
         * The user this notification is delivered to.
         * allowNull: false — a notification without a recipient is meaningless.
         *
         * onDelete: CASCADE (migration) — when a user is deleted, remove all
         * their notifications. Unlike applications or reports, notifications
         * have no audit value once the recipient account is gone.
         */
        type: DataTypes.UUID,
        allowNull: false,
      },

      // ── Notification Content ───────────────────────────────────────────────

      type: {
        /**
         * Machine-readable event type, e.g.:
         *   "APPLICATION_STATUS_CHANGED", "LISTING_APPROVED",
         *   "EMPLOYER_VERIFIED", "NEW_APPLICATION"
         *
         * Stored as STRING (not ENUM) so new event types can be added
         * without a schema migration. The frontend switches on this value
         * to render the appropriate icon and deep-link (e.g. type
         * APPLICATION_STATUS_CHANGED → link to /applications/:id).
         *
         * allowNull: false — the type drives the frontend rendering logic;
         * a notification without a type cannot be displayed meaningfully.
         */
        type: DataTypes.STRING,
        allowNull: false,
      },

      title: {
        /**
         * Short human-readable headline shown in the bell dropdown,
         * e.g. "Your application was shortlisted!".
         * allowNull: false — every notification must have a display title.
         */
        type: DataTypes.STRING,
        allowNull: false,
      },

      body: {
        /**
         * Optional longer description shown when the notification is expanded
         * or on the notifications page, e.g. "InnovateTech has moved your
         * application for 'Frontend Intern' to Shortlisted. Log in to view."
         * TEXT — no length cap. Nullable.
         */
        type: DataTypes.TEXT,
        allowNull: true,
      },

      isRead: {
        /**
         * false = unread (shows in the bell badge count).
         * true  = read  (dismissed from the badge).
         *
         * Set to true when the user:
         *   - Clicks the notification in the bell dropdown
         *   - Calls POST /api/notifications/:id/read
         *   - Calls POST /api/notifications/read-all (bulk)
         * (PRD §5.9)
         *
         * NOT deleted on read — the notification page shows a history of
         * all past notifications (read and unread).
         */
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      indexes: [
        /**
         * Most common query: unread notifications for a user.
         *   WHERE userId = ? AND isRead = false
         * Compound index covers both conditions; also serves
         *   WHERE userId = ?   (leftmost prefix — full notification history)
         */
        {
          fields: ["userId", "isRead"],
          name: "notifications_user_id_is_read_idx",
        },
      ],
    }
  );

  // ── Associations ─────────────────────────────────────────────────────────────

  Notification.associate = (models) => {
    /**
     * belongsTo → User (the notification recipient)
     *
     * as: "user" — the standard accessor name for the owning user.
     *   Notification.findAll({ include: [{ model: User, as: "user" }] })
     *
     * The complement on the User side:
     *   User.hasMany(Notification, { as: "notifications", fk: "userId" })
     *
     * Typically notifications are fetched without the user JOIN
     * (the API already knows which user is authenticated), but the
     * association is declared for completeness and admin queries.
     */
    Notification.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return Notification;
};
