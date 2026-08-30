"use strict";

/**
 * Migration: create-applications
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates the "Applications" table.
 *
 * DEPENDENCY ORDER
 *   Must run AFTER:
 *     20260829211509-create-users.js      (FK target: Users.id via studentId)
 *     20260829214857-create-listings.js   (FK target: Listings.id via listingId)
 *
 * ENUM TYPE CREATED
 *   "enum_Applications_status"
 *   Must be dropped explicitly in `down` — Postgres does not cascade-drop it.
 *
 * FK SEMANTICS (different per column — read carefully)
 *   listingId → ON DELETE RESTRICT
 *     Prevent deleting a listing that has applications.
 *     PRD §5.4: application history must be preserved even if the listing
 *     is closed. Employers must archive/close, not delete, active listings.
 *   studentId → ON DELETE SET NULL
 *     If a student's account is deleted (GDPR request, admin action),
 *     preserve the application for the employer's records (they may have
 *     already interviewed or offered the candidate). The studentId becomes
 *     NULL, rendering the applicant anonymous. Requires the column to
 *     allow NULL in the migration (see note on the column below).
 *
 * Run:   npm run db:migrate
 * Undo:  npm run db:migrate:undo
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Applications", {

      // ── Primary Key ──────────────────────────────────────────────────────────
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── FK → Listings (RESTRICT delete) ─────────────────────────────────────
      listingId: {
        /**
         * onDelete: "RESTRICT"
         *   Postgres raises an error if someone attempts to DELETE a Listing
         *   row that has one or more Application rows referencing it.
         *   This enforces the PRD §5.4 requirement that application history
         *   must not be silently destroyed. The employer must CLOSE the
         *   listing and an admin must handle any deletion explicitly.
         *
         *   Error surfaced: SequelizeForeignKeyConstraintError (pg code 23503)
         *   Controller catches it → 409 Conflict with a descriptive message.
         */
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "Listings", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      // ── FK → Users/student (SET NULL on delete) ──────────────────────────────
      studentId: {
        /**
         * allowNull: true in the migration (note: model has allowNull: false)
         *
         * WHY NULLABLE HERE WHEN THE MODEL SAYS allowNull: false?
         *   The model's allowNull: false prevents the application layer from
         *   creating a new Application without a studentId — correct.
         *   But onDelete: "SET NULL" means Postgres will set this column to
         *   NULL if the referenced User row is deleted. For Postgres to be
         *   able to do that, the column must physically allow NULL in the DB.
         *   If the column is NOT NULL and onDelete is SET NULL, Postgres raises
         *   a constraint violation when trying to delete the user.
         *
         *   In practice: new applications always have a studentId (enforced
         *   by the app layer); only user-deletion sets it to NULL (enforced
         *   by the DB). Both rules coexist correctly.
         *
         * onDelete: "SET NULL"
         *   Student account deleted → studentId → NULL.
         *   The Application row survives for the employer's records.
         *   The employer sees "Applicant (account deleted)" in the UI.
         */
        type: Sequelize.UUID,
        allowNull: true, // must be true for ON DELETE SET NULL to work
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      // ── Content ──────────────────────────────────────────────────────────────
      coverLetter: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      resumeUrlSnapshot: {
        /**
         * Point-in-time snapshot of the student's resume URL at application
         * time. Avoids stale resume reads if the student uploads a new resume.
         * See Application.js model comments for the full snapshot rationale.
         */
        type: Sequelize.STRING,
        allowNull: true,
      },

      // ── Status ENUM ──────────────────────────────────────────────────────────
      status: {
        /**
         * Creates Postgres type: "enum_Applications_status"
         *   AS ENUM ('APPLIED','SHORTLISTED','INTERVIEW','OFFERED','REJECTED','WITHDRAWN')
         *
         * Column-level DEFAULT set here so direct SQL INSERTs also get APPLIED.
         * Defence-in-depth: business rule enforced in the DB, not only in JS.
         */
        type: Sequelize.ENUM(
          "APPLIED",
          "SHORTLISTED",
          "INTERVIEW",
          "OFFERED",
          "REJECTED",
          "WITHDRAWN"
        ),
        allowNull: false,
        defaultValue: "APPLIED",
      },

      // ── Status History JSONB ──────────────────────────────────────────────────
      statusHistory: {
        /**
         * Postgres JSONB column.
         *
         * Stores an ordered array of status-transition events appended by the
         * controller on every status change:
         *   [
         *     { from: "APPLIED", to: "SHORTLISTED",
         *       changedBy: "<userId>", changedAt: "<ISO timestamp>", note?: "..." },
         *     ...
         *   ]
         *
         * JSONB vs JSON:
         *   JSONB is stored as parsed binary (not raw text). It supports GIN
         *   indexes and the @> containment operator for future queries like
         *   "find all applications where any history entry was SHORTLISTED by
         *   admin X". JSON does not support these operators.
         *
         * See Application.js for the full JSONB design rationale.
         */
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },

      // ── Application Timestamp ─────────────────────────────────────────────────
      appliedAt: {
        /**
         * Business timestamp for when the student submitted the application.
         * Separate from createdAt (DB transaction time) for semantic clarity
         * in the employer's UI ("Applied on: ...").
         */
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },

      // ── Sequelize Timestamps ──────────────────────────────────────────────────
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // ── UNIQUE compound index on (listingId, studentId) ──────────────────────────
    //
    // WHAT IT ENFORCES
    //   Each (listingId, studentId) pair may appear at most once in the table.
    //   One student cannot submit two applications for the same listing.
    //
    // WHAT HAPPENS WHEN A STUDENT APPLIES TWICE
    //   Scenario: student double-clicks "Apply" → two POST /api/applications
    //   requests fire concurrently with identical { listingId, studentId }.
    //
    //   1. Request A arrives at the controller. JS-level pre-flight:
    //        const existing = await Application.findOne({ where: { listingId, studentId } });
    //        if (existing) return res.status(409)...
    //      No existing row found (request B hasn't inserted yet). Proceeds.
    //
    //   2. Request B arrives simultaneously. Same pre-flight — no row yet. Proceeds.
    //
    //   3. Request A executes INSERT INTO "Applications" (...).
    //      Postgres acquires index slot for (listingId, studentId).
    //      INSERT succeeds. Row created.
    //
    //   4. Request B executes INSERT INTO "Applications" (...).
    //      Postgres tries to acquire the same index slot — LOCKED.
    //      Sees the pair already exists.
    //      Raises: ERROR 23505 duplicate key value violates unique constraint
    //              "applications_listing_student_unique"
    //      Sequelize converts this to: SequelizeUniqueConstraintError
    //        .errors[0].path === "applications_listing_student_unique"
    //
    //   5. The error handler in the controller:
    //        if (err instanceof UniqueConstraintError)
    //          return res.status(409).json({
    //            message: "You have already applied to this listing."
    //          });
    //
    //   Without this index, step 4 would succeed and the student would have
    //   two Application rows for the same listing — a data integrity bug that
    //   the JS pre-flight cannot reliably prevent under concurrent load.
    //
    // BONUS: QUERY ACCELERATION
    //   Beyond uniqueness, this index serves as a covering index for the most
    //   common pre-flight check:
    //     WHERE listingId = ? AND studentId = ?   → index-only scan, no heap read
    //   and for the employer's applicant list:
    //     WHERE listingId = ?                     → leftmost prefix
    // ─────────────────────────────────────────────────────────────────────────
    await queryInterface.addIndex("Applications", {
      fields: ["listingId", "studentId"],
      unique: true,
      name: "applications_listing_student_unique",
    });

    // ── Index on studentId (for student's own applications query) ────────────────
    //
    // GET /api/applications/mine → WHERE studentId = ?
    // The compound index above does NOT serve this query efficiently via the
    // leftmost prefix rule (studentId is second, not first). A dedicated single-
    // column index on studentId covers "all applications by this student" with
    // an index scan instead of a full table scan.
    await queryInterface.addIndex("Applications", {
      fields: ["studentId"],
      name: "applications_student_id_idx",
    });

    // ── Index on status ──────────────────────────────────────────────────────────
    //
    // Employer dashboard filters: WHERE listingId = ? AND status = 'SHORTLISTED'
    // The compound index covers the listingId part; this additional index on
    // status supports admin queries like:
    //   GET /api/admin/applications?status=OFFERED   (analytics — PRD §5.8)
    // Status is low-cardinality (6 values) but the table can grow large,
    // making even a partial index worth having.
    await queryInterface.addIndex("Applications", {
      fields: ["status"],
      name: "applications_status_idx",
    });
  },

  async down(queryInterface /*, Sequelize */) {
    // Drop the table — removes all indexes and FK constraints automatically.
    await queryInterface.dropTable("Applications");

    // Drop the orphaned ENUM type.
    // Without this, re-running the migration fails with "type already exists".
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Applications_status";'
    );
  },
};
