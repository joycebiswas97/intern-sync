"use strict";

/**
 * src/models/Application.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Represents a student's job/internship application for a specific listing.
 *
 * RELATIONSHIPS
 *   Listing ──hasMany──▶ Application  (FK: Application.listingId)
 *   User    ──hasMany──▶ Application  (FK: Application.studentId)
 *   Application ──belongsTo──▶ Listing
 *   Application ──belongsTo──▶ User (as "student")
 *
 * THE UNIQUENESS GUARANTEE
 *   A (listingId, studentId) pair must be globally unique.
 *   One student cannot apply to the same listing twice.
 *   This is enforced by a UNIQUE compound index at the DB level.
 *   See the detailed explanation on the index declaration below.
 *
 * STATUS LIFECYCLE
 *   APPLIED → SHORTLISTED → INTERVIEW → OFFERED
 *                                      → REJECTED  (employer decision)
 *          → WITHDRAWN  (student pulls out, at any point before OFFERED)
 *
 *   Every status change appends an entry to statusHistory (JSONB).
 *   This gives the employer and student a full audit trail without a
 *   separate ApplicationStatusHistory table.
 * ─────────────────────────────────────────────────────────────────────────────
 */

module.exports = (sequelize, DataTypes) => {
  const Application = sequelize.define(
    "Application", // → table name "Applications"
    {
      // ── Primary Key ────────────────────────────────────────────────────────

      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── Foreign Keys ───────────────────────────────────────────────────────

      listingId: {
        /**
         * References Listings.id.
         *
         * allowNull: false — every application must be for a specific listing.
         * No unique:true here individually — uniqueness is enforced by the
         * COMPOUND index on (listingId, studentId) together, not each column
         * separately. A student can apply to many listings; a listing can
         * receive many applications.
         *
         * onDelete behaviour is defined in the migration.
         * PRD §5.4: "Editing a listing with existing applications should not
         * delete application history (ON DELETE RESTRICT or SET NULL — avoid
         * cascading deletes)." We use RESTRICT to prevent listing deletion
         * while applications exist — the employer must CLOSE the listing and
         * the admin must handle the deletion, preserving the record.
         */
        type: DataTypes.UUID,
        allowNull: false,
      },

      studentId: {
        /**
         * References Users.id (the applicant's user record).
         *
         * Named studentId (not userId) to be unambiguous — "who is the
         * student in this application?" vs "whose listing is this?".
         * Matches the foreignKey used in User.hasMany(Application) in User.js.
         *
         * onDelete: SET NULL in the migration — if the student's account is
         * deleted, we preserve the application row for the employer's records
         * (they may have already made hiring decisions). The studentId becomes
         * NULL, indicating an anonymous/deleted applicant.
         * Note: this requires the column to be nullable in the migration
         * (allowNull: true there) even though we treat it as required at the
         * application layer.
         */
        type: DataTypes.UUID,
        allowNull: false,
      },

      // ── Application Content ────────────────────────────────────────────────

      coverLetter: {
        /**
         * Optional free-text motivation letter. TEXT — no length cap.
         * Nullable: PRD §5.4 does not require a cover letter for application.
         * The Joi validation schema at the route layer can enforce it if the
         * employer marks it as required (a v2 feature).
         */
        type: DataTypes.TEXT,
        allowNull: true,
      },

      resumeUrlSnapshot: {
        /**
         * A point-in-time copy of the student's resume URL at the moment
         * of application.
         *
         * WHY SNAPSHOT AND NOT JUST READ StudentProfile.resumeUrl?
         *   Students can upload a new resume after applying. If we read
         *   StudentProfile.resumeUrl at review time, the employer would see
         *   a different document than what the student submitted.
         *   The snapshot freezes the URL so the employer always sees exactly
         *   what was on file when the student hit "Apply" (PRD §5.4:
         *   "snapshot the resume URL used so later resume edits don't
         *   retroactively change what the employer saw").
         *
         * Note: the URL still points to the same file in Cloudinary/S3.
         * If the student deletes or replaces the file in the provider,
         * the snapshot URL would 404. A future v2 improvement is to copy
         * the actual file on apply to guarantee immutability.
         */
        type: DataTypes.STRING,
        allowNull: true,
      },

      // ── Application Status (ENUM) ──────────────────────────────────────────

      status: {
        /**
         * DataTypes.ENUM("APPLIED","SHORTLISTED","INTERVIEW","OFFERED","REJECTED","WITHDRAWN")
         * → Postgres type: "enum_Applications_status"
         *
         * SIX STATES
         * ─────────────────────────────────────────────────────────────────────
         * APPLIED    (defaultValue)
         *   The initial state on submission. Employer sees this in their
         *   applicant queue.
         *
         * SHORTLISTED
         *   Employer moved the candidate to a shortlist for further review.
         *   Triggers a notification + email to the student (PRD §5.4, §5.9).
         *
         * INTERVIEW
         *   Employer has scheduled or invited the student for an interview.
         *   Another notification event.
         *
         * OFFERED
         *   Employer has made a formal offer. Terminal state from the
         *   employer's side — no further transitions except WITHDRAWN by
         *   the student (if they decline the offer).
         *
         * REJECTED
         *   Employer decided not to proceed. Terminal state.
         *   Employer can set this from any state (APPLIED, SHORTLISTED,
         *   INTERVIEW). Triggers a notification to the student.
         *
         * WITHDRAWN
         *   Student pulled their own application. Set via
         *   POST /api/applications/:id/withdraw (PRD §5.4).
         *   Only the owning student can trigger this; only valid before OFFERED.
         *   The employer's pipeline view removes this application from the
         *   active queue but it remains in history.
         *
         * WHO CAN CHANGE WHAT
         *   Employer/Admin: APPLIED → SHORTLISTED → INTERVIEW → OFFERED/REJECTED
         *   Student:        any state → WITHDRAWN  (own application only)
         * ─────────────────────────────────────────────────────────────────────
         */
        type: DataTypes.ENUM(
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

      // ── Status History (JSONB) ─────────────────────────────────────────────

      statusHistory: {
        /**
         * DataTypes.JSONB → Postgres `JSONB` column.
         *
         * WHAT IT STORES
         *   An append-only array of status-change events. Each entry is an
         *   object pushed by the application controller on every status
         *   transition:
         *     {
         *       from:      "APPLIED",
         *       to:        "SHORTLISTED",
         *       changedBy: "<userId of actor>",
         *       changedAt: "2026-08-30T10:00:00.000Z",
         *       note:      "Great portfolio"   // optional
         *     }
         *
         * WHY JSONB AND NOT A SEPARATE STATUS_HISTORY TABLE?
         * ─────────────────────────────────────────────────────────────────────
         * Option A — Separate table (fully normalised):
         *   PROs: queryable per column (filter by changedBy, changedAt range),
         *         easy foreign keys, clean schema.
         *   CONs: every status update requires two writes (UPDATE Applications
         *         + INSERT ApplicationStatusHistories) inside a transaction;
         *         loading an application with its history requires a JOIN or
         *         second query.
         *
         * Option B — JSONB column on Application (our choice, per PRD):
         *   PROs: atomic single-row update (one UPDATE sets both status and
         *         appends to statusHistory via array_append or JS array push);
         *         history always travels with the application row — no JOIN
         *         needed when displaying the timeline on the frontend;
         *         fits the PRD spec exactly (§4 model definition uses JSONB).
         *   CONs: cannot easily query across histories (e.g. "all apps
         *         shortlisted by user X in the last week") — acceptable for
         *         v1 where analytics are aggregate counts (PRD §5.8).
         *
         * JSONB vs JSON in Postgres
         *   JSON stores the raw text; JSONB stores a parsed binary
         *   representation. JSONB is slightly larger on disk but supports
         *   GIN indexing (for full history search if needed in v2), allows
         *   fast containment queries (@> operator), and is the recommended
         *   type for any JSON you intend to query.
         *
         * defaultValue: []
         *   An empty array, not NULL. The controller appends to it on every
         *   status change:
         *     application.statusHistory = [
         *       ...application.statusHistory,
         *       { from, to, changedBy, changedAt }
         *     ];
         *     await application.save();
         * ─────────────────────────────────────────────────────────────────────
         */
        type: DataTypes.JSONB,
        defaultValue: [],
        allowNull: false,
      },

      // ── Timestamps ─────────────────────────────────────────────────────────

      appliedAt: {
        /**
         * Explicit application timestamp, separate from Sequelize's createdAt.
         *
         * WHY A SEPARATE appliedAt WHEN createdAt EXISTS?
         *   createdAt is set by Sequelize to the DB transaction time.
         *   appliedAt is the *business* timestamp — "when did the student
         *   formally submit this application?" In practice they are the same,
         *   but having a named field makes the intent explicit in queries,
         *   API responses, and the employer's applicant table ("Applied on:
         *   Aug 30, 2026") without leaking DB internals via createdAt.
         *   PRD §5.4 model definition includes this field explicitly.
         *
         * defaultValue: DataTypes.NOW → Postgres NOW() at INSERT time.
         */
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      // ── Table-level options ────────────────────────────────────────────────

      indexes: [
        /**
         * UNIQUE COMPOUND INDEX on (listingId, studentId)
         *
         * ─────────────────────────────────────────────────────────────────────
         * WHY DOES THIS INDEX NEED TO BE UNIQUE?
         * ─────────────────────────────────────────────────────────────────────
         *
         * The business rule is: one student can apply to one listing exactly
         * once. "Apply twice" scenarios that must be prevented:
         *
         *   1. User double-clicks the "Apply" button → two requests in flight.
         *   2. A retry on network timeout duplicates the POST /api/applications.
         *   3. A bug in the application layer bypasses the pre-flight check.
         *   4. A direct DB INSERT via a seed script or admin tool.
         *
         * A JS-level check BEFORE the INSERT is not enough:
         *   if (await Application.findOne({ where: { listingId, studentId } }))
         *     throw 409;
         *   await Application.create({ listingId, studentId });
         *
         *   Between the findOne and the create there is a window — a race
         *   condition — where two concurrent requests both pass the check and
         *   both insert. This is a classic TOCTOU (Time Of Check / Time Of Use)
         *   bug that only the DB can solve with a constraint.
         *
         * THE UNIQUE COMPOUND INDEX SOLVES THIS ATOMICALLY
         *   When two concurrent INSERTs race for the same (listingId, studentId)
         *   pair, Postgres serialises them at the index level. The first INSERT
         *   acquires the index slot; the second waits, then sees the slot is
         *   taken and raises:
         *     ERROR 23505: duplicate key value violates unique constraint
         *     "applications_listing_student_unique"
         *   Sequelize surfaces this as SequelizeUniqueConstraintError, which
         *   the application controller catches and converts to 409 Conflict:
         *     { message: "You have already applied to this listing." }
         *   (PRD §5.4 edge case, verbatim.)
         *
         * WHY COMPOUND (listingId + studentId) AND NOT TWO SEPARATE UNIQUES?
         *   - unique on listingId alone → each listing could only ever have ONE
         *     application (obviously wrong).
         *   - unique on studentId alone → a student could only ever apply to
         *     ONE listing total (obviously wrong).
         *   - unique on (listingId, studentId) together → exactly one
         *     application per (student, listing) pair. Both columns must be
         *     non-null for the constraint to fire (Postgres ignores NULL values
         *     in unique indexes, but both FKs are NOT NULL so this is moot).
         *
         * WHAT THE INDEX ALSO DOES (BONUS)
         *   Besides enforcing uniqueness, a compound index on (listingId,
         *   studentId) accelerates several hot queries:
         *     - "Has this student already applied?" pre-flight check
         *       WHERE listingId = ? AND studentId = ?   → index-only scan
         *     - Employer applicant list
         *       WHERE listingId = ?                     → leftmost prefix
         *     - Student's own applications
         *       WHERE studentId = ?  ← NOT served by leftmost prefix here
         *   For the last query (student's own applications), a separate index
         *   on studentId alone is added in the migration.
         * ─────────────────────────────────────────────────────────────────────
         */
        {
          unique: true,
          fields: ["listingId", "studentId"],
          name: "applications_listing_student_unique",
        },
      ],
    }
  );

  // ── Associations ─────────────────────────────────────────────────────────────

  Application.associate = (models) => {
    /**
     * belongsTo → Listing
     *
     * Application.listingId → Listings.id.
     * as: "listing" — eager-load accessor:
     *   Application.findAll({ include: [{ model: Listing, as: "listing" }] })
     * Complement: Listing.hasMany(Application, { as: "applications" })  [Listing.js]
     */
    Application.belongsTo(models.Listing, {
      foreignKey: "listingId",
      as: "listing",
    });

    /**
     * belongsTo → User (the student)
     *
     * Application.studentId → Users.id.
     * as: "student" — distinguishes this from any other User association.
     *   Application.findAll({ include: [{ model: User, as: "student" }] })
     * Complement: User.hasMany(Application, { as: "applications" })  [User.js]
     *
     * Note: the FK column is studentId (not userId) — "whose application is
     * this?" maps to the student role, not a generic user.
     */
    Application.belongsTo(models.User, {
      foreignKey: "studentId",
      as: "student",
    });
  };

  return Application;
};
