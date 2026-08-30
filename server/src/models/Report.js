"use strict";

/**
 * src/models/Report.js
 * ─────────────────────────────────────────────────────────────────────────────
 * A content-moderation report filed by any authenticated user against either
 * a Listing or another User (e.g. a fraudulent employer or an abusive student).
 *
 * POLYMORPHIC TARGET (two optional FKs, not a formal Sequelize polymorphic)
 *   A Report targets ONE of:
 *     listingId    — report a job/internship posting
 *     reportedUserId — report a user account
 *   Both columns are nullable; the application layer enforces that exactly one
 *   is populated (validated in the Joi schema at the route level, not here).
 *   This avoids a formal polymorphic association (which Sequelize does not
 *   support natively) while keeping the schema simple for v1.
 *
 * ASSOCIATIONS
 *   User ──hasMany──▶ Report  (FK: Report.reporterId)   [User.js as="reports"]
 *   Listing ──hasMany──▶ Report (FK: Report.listingId)  [Listing.js as="reports"]
 *   Report ──belongsTo──▶ User    (as "reporter",       fk: reporterId)
 *   Report ──belongsTo──▶ Listing (as "listing",        fk: listingId)
 * ─────────────────────────────────────────────────────────────────────────────
 */

module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define(
    "Report", // → table name "Reports"
    {
      // ── Primary Key ────────────────────────────────────────────────────────

      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── Who Filed the Report ───────────────────────────────────────────────

      reporterId: {
        /**
         * References Users.id — the authenticated user who pressed "Report".
         * allowNull: false — anonymous reports are not allowed in v1.
         *
         * onDelete: SET NULL in migration (same rationale as Application.studentId):
         *   if the reporter's account is deleted, preserve the report for the
         *   admin moderation queue. The admin can still see the report content
         *   even without a live reporter account.
         */
        type: DataTypes.UUID,
        allowNull: false,
      },

      // ── What Is Being Reported (polymorphic — one must be set) ─────────────

      listingId: {
        /**
         * Set when reporting a Listing (e.g. "this job posting looks fake").
         * Nullable — only one of listingId / reportedUserId is expected to be
         * non-null per report.
         *
         * onDelete: SET NULL — if the listing is deleted, preserve the report
         * for audit purposes.
         */
        type: DataTypes.UUID,
        allowNull: true,
      },

      reportedUserId: {
        /**
         * Set when reporting a User account (employer, student, or admin).
         * Nullable — mutually exclusive with listingId in practice.
         *
         * No Sequelize-level association declared for this column because
         * Sequelize does not support polymorphic belongsTo cleanly.
         * The controller resolves the target manually by reading which column
         * is set.
         *
         * onDelete: SET NULL — if the reported user is deleted (by themselves or
         * an admin), the report survives as an audit record.
         */
        type: DataTypes.UUID,
        allowNull: true,
      },

      // ── Report Content ─────────────────────────────────────────────────────

      reason: {
        /**
         * Short categorised reason, e.g.:
         *   "FAKE_LISTING", "HARASSMENT", "SPAM", "INAPPROPRIATE_CONTENT"
         * Stored as STRING rather than ENUM so new reason categories can be
         * added without an ALTER TYPE migration. Validated against an allowed
         * list at the Joi/route layer (PRD §5.10).
         */
        type: DataTypes.STRING,
        allowNull: false,
      },

      details: {
        /**
         * Optional free-text elaboration from the reporter.
         * TEXT — no length cap; reporters may provide lengthy context.
         */
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // ── Admin Resolution Status (ENUM) ─────────────────────────────────────

      status: {
        /**
         * DataTypes.ENUM("OPEN", "RESOLVED", "DISMISSED")
         * → Postgres type: "enum_Reports_status"
         *
         * OPEN       (defaultValue) — pending admin review
         * RESOLVED   — admin took action (banned user, removed listing, etc.)
         * DISMISSED  — admin determined the report was invalid / spam
         *
         * Transition: admin calls PATCH /api/admin/reports/:id
         *   { status: "RESOLVED"|"DISMISSED", resolutionNote: "..." }
         */
        type: DataTypes.ENUM("OPEN", "RESOLVED", "DISMISSED"),
        allowNull: false,
        defaultValue: "OPEN",
      },

      resolutionNote: {
        /**
         * Admin-authored note explaining the action taken or why dismissed.
         * Stored for audit trail (PRD §5.10). Nullable until resolved.
         */
        type: DataTypes.STRING,
        allowNull: true,
      },

      resolvedAt: {
        /**
         * Timestamp set by the controller when status transitions out of OPEN.
         * Allows analytics queries like "average time to resolve a report"
         * and "reports resolved in the last 30 days" (PRD §5.8).
         */
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      indexes: [
        // Admin moderation queue: WHERE status = 'OPEN'
        // Low-cardinality column but high query frequency in the admin panel.
        {
          fields: ["status"],
          name: "reports_status_idx",
        },
        // Filter reports by reporter: WHERE reporterId = ?
        {
          fields: ["reporterId"],
          name: "reports_reporter_id_idx",
        },
      ],
    }
  );

  // ── Associations ─────────────────────────────────────────────────────────────

  Report.associate = (models) => {
    /**
     * belongsTo → User (the reporter who filed this report)
     *
     * as: "reporter" distinguishes this from any other User association
     * (e.g. a future "assignedAdmin" column). The complement on the User
     * side is: User.hasMany(Report, { as: "reports", fk: "reporterId" }).
     */
    Report.belongsTo(models.User, {
      foreignKey: "reporterId",
      as: "reporter",
    });

    /**
     * belongsTo → Listing (the listing being reported, if applicable)
     *
     * as: "listing" — nullable FK, only populated for listing reports.
     * The complement on the Listing side:
     *   Listing.hasMany(Report, { as: "reports", fk: "listingId" }).
     */
    if (models.Listing) {
      Report.belongsTo(models.Listing, {
        foreignKey: "listingId",
        as: "listing",
      });
    }

    /**
     * No formal belongsTo for reportedUserId — the controller resolves the
     * target user manually. A future refactor could introduce a polymorphic
     * association helper, but it is out of scope for v1.
     */
  };

  return Report;
};
