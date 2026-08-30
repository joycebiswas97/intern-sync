"use strict";

/**
 * src/models/Listing.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Represents a single internship or job posting created by an employer.
 *
 * RELATIONSHIPS
 *   EmployerProfile ──hasMany──▶ Listing  (FK: Listing.employerId)
 *   Listing ──hasMany──▶ Application      (FK: Application.listingId)
 *   Listing ──hasMany──▶ Report           (FK: Report.listingId)
 *   SavedListing ──belongsTo──▶ Listing   (FK: SavedListing.listingId)
 *
 * THREE ENUM COLUMNS
 *   type              → INTERNSHIP | JOB
 *   workMode          → REMOTE | ONSITE | HYBRID
 *   status            → DRAFT | PENDING_REVIEW | ACTIVE | REJECTED | CLOSED | EXPIRED
 *
 * THREE ARRAY COLUMNS (Postgres TEXT[])
 *   responsibilities, skillsRequired, perks
 *
 * TWO INDEX STRATEGIES (explained in detail below)
 *   1. Compound B-tree on (status, type, workMode) — filter queries
 *   2. GIN on tsvector(title || description) — full-text search
 * ─────────────────────────────────────────────────────────────────────────────
 */

module.exports = (sequelize, DataTypes) => {
  const Listing = sequelize.define(
    "Listing", // → table name "Listings"
    {
      // ── Primary Key ────────────────────────────────────────────────────────

      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── Foreign Key ────────────────────────────────────────────────────────

      employerId: {
        /**
         * References EmployerProfile.id, NOT Users.id.
         *
         * WHY EmployerProfile.id AND NOT User.id?
         *   Listings are company-scoped, not person-scoped. Using the
         *   EmployerProfile's PK means the association survives if a company
         *   adds team-seat logins (multiple User rows per company) in a future
         *   version — no schema migration required. The Listing always belongs
         *   to the company, regardless of which recruiter created it.
         */
        type: DataTypes.UUID,
        allowNull: false,
      },

      // ── Core Required Fields ───────────────────────────────────────────────

      title: {
        /**
         * The listing headline, e.g. "Frontend Engineering Intern".
         * allowNull: false — a listing cannot exist without a title.
         * Indexed indirectly via the GIN tsvector (full-text search).
         */
        type: DataTypes.STRING,
        allowNull: false,
      },

      // ── ENUM 1: Listing Type ───────────────────────────────────────────────

      type: {
        /**
         * DataTypes.ENUM("INTERNSHIP", "JOB")
         * → Postgres type: "enum_Listings_type"
         *
         * Drives the primary split in student browse UI ("Internships" vs
         * "Jobs" tabs) and is the first column in the compound filter index.
         * Two values only — an ENUM is appropriate (small, stable set).
         *
         * NAMING COLLISION NOTE: "type" is a reserved word in some SQL
         * dialects but is valid in Postgres. Sequelize quotes column names
         * in generated SQL so there is no conflict.
         */
        type: DataTypes.ENUM("INTERNSHIP", "JOB"),
        allowNull: false,
      },

      description: {
        /**
         * Full job/internship description. TEXT — no length cap.
         * This field (concatenated with title) feeds the GIN tsvector index
         * for full-text search (PRD §5.5).
         */
        type: DataTypes.TEXT,
        allowNull: false,
      },

      // ── ARRAY Fields ────────────────────────────────────────────────────────

      responsibilities: {
        /**
         * DataTypes.ARRAY(DataTypes.STRING) → Postgres TEXT[].
         * Bullet-point list of what the intern/employee will do.
         * Stored as an array so the frontend can render an <ul> directly
         * without parsing a delimited string.
         * defaultValue: [] — empty array, never NULL.
         */
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        allowNull: false,
      },

      skillsRequired: {
        /**
         * TEXT[] of required skills, e.g. ["React", "Node.js", "PostgreSQL"].
         * Used in student search (skills overlap filter via Postgres && operator):
         *   WHERE "skillsRequired" && ARRAY['React','Node.js']
         * and for matching recommended listings to a student's skills profile.
         */
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        allowNull: false,
      },

      // ── ENUM 2: Work Mode ──────────────────────────────────────────────────

      workMode: {
        /**
         * DataTypes.ENUM("REMOTE", "ONSITE", "HYBRID")
         * → Postgres type: "enum_Listings_workMode"
         *
         * One of the most-used filters on the student browse page (PRD §5.5).
         * Third column in the compound filter index.
         * Three stable values → ENUM is the right tool.
         */
        type: DataTypes.ENUM("REMOTE", "ONSITE", "HYBRID"),
        allowNull: false,
      },

      location: {
        /**
         * Physical city/region, e.g. "Bengaluru", "Mumbai (Andheri)".
         * NULL is valid for fully REMOTE listings where location is irrelevant.
         * Free-form STRING — no lookup table in v1.
         */
        type: DataTypes.STRING,
        allowNull: true,
      },

      // ── Compensation ───────────────────────────────────────────────────────

      stipendOrSalaryMin: {
        /**
         * INTEGER: lowest end of the compensation range (in `currency` units).
         * Using a range (min/max) rather than a single value lets employers
         * publish a band without committing to a precise number. Students can
         * filter by minStipend ≤ stipendOrSalaryMax (PRD §5.5).
         */
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      stipendOrSalaryMax: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      currency: {
        /**
         * ISO 4217 currency code. Default "INR" reflects the target market
         * (India-focused platform per PRD). STRING allows overriding per
         * listing for remote international roles (USD, EUR, etc.).
         */
        type: DataTypes.STRING,
        defaultValue: "INR",
        allowNull: false,
      },

      durationMonths: {
        /**
         * Internship duration in months, e.g. 2, 3, 6.
         * NULL for full-time JOB listings (permanent roles have no fixed term).
         */
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      openings: {
        /**
         * Number of positions available. Defaults to 1.
         * Not decremented automatically when applications are accepted —
         * the employer manages this manually via the dashboard in v1.
         */
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false,
      },

      applicationDeadline: {
        /**
         * DATE (TIMESTAMPTZ). Students cannot apply after this date.
         * A scheduled job (node-cron) checks this daily and flips
         * ACTIVE listings to EXPIRED when the deadline passes (PRD §5.4).
         * Validated at the route layer (must be in the future on create).
         */
        type: DataTypes.DATE,
        allowNull: true,
      },

      perks: {
        /**
         * TEXT[]: extra benefits beyond salary, e.g.
         * ["Certificate", "Letter of Recommendation", "PPO opportunity"].
         * Displayed as chips/badges on the listing card. Same array rationale
         * as responsibilities and skillsRequired.
         */
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        allowNull: false,
      },

      // ── ENUM 3: Listing Status ─────────────────────────────────────────────

      status: {
        /**
         * DataTypes.ENUM("DRAFT","PENDING_REVIEW","ACTIVE","REJECTED","CLOSED","EXPIRED")
         * → Postgres type: "enum_Listings_status"
         *
         * THE SIX STATES AND THEIR TRANSITIONS
         * ─────────────────────────────────────────────────────────────────────
         *
         * DRAFT
         *   Employer saved the listing without submitting for review.
         *   Not visible to students. Employer can continue editing.
         *   Transition: employer submits → PENDING_REVIEW.
         *
         * PENDING_REVIEW  (defaultValue)
         *   The state a listing enters when first submitted.
         *   Visible only to the employer (own dashboard) and admin queue.
         *   Students cannot see it.
         *
         *   WHY DEFAULT TO PENDING_REVIEW?
         *   ───────────────────────────────
         *   Same trust/security rationale as EmployerProfile.verificationStatus:
         *   content moderation before student exposure prevents scam or
         *   inappropriate listings from reaching the platform. The feature flag
         *   AUTO_APPROVE_LISTINGS=true in .env (PRD §5.4) skips this step for
         *   MVP speed if the team decides moderation overhead is too high early.
         *   Transition: admin approves → ACTIVE; admin rejects → REJECTED.
         *
         * ACTIVE
         *   Publicly visible. Students can apply. Searchable.
         *   Transition: deadline passes → EXPIRED (cron); employer closes → CLOSED;
         *   admin/employer force-close → CLOSED.
         *
         * REJECTED
         *   Admin rejected with a reason (stored in rejectionReason).
         *   Employer can edit and resubmit → back to PENDING_REVIEW.
         *   Not visible to students.
         *
         * CLOSED
         *   Employer manually closed the listing (positions filled, or no
         *   longer hiring). No new applications accepted. Historical data retained.
         *   PRD §5.4: employer calls POST /api/listings/:id/close.
         *
         * EXPIRED
         *   Set automatically by the cron job when applicationDeadline < NOW()
         *   and status was ACTIVE. Treated like CLOSED for student visibility
         *   but distinguished so analytics can track deadline-expiry separately.
         *
         * SIX VALUES IN THE ENUM — why not fewer?
         *   DRAFT and PENDING_REVIEW are distinct because a draft is a
         *   work-in-progress the employer hasn't submitted yet; PENDING_REVIEW
         *   is formally submitted and awaiting admin action.
         *   CLOSED and EXPIRED are distinct for analytics (PRD §5.8 top-listings
         *   and application trends can filter by exact close reason).
         * ─────────────────────────────────────────────────────────────────────
         */
        type: DataTypes.ENUM(
          "DRAFT",
          "PENDING_REVIEW",
          "ACTIVE",
          "REJECTED",
          "CLOSED",
          "EXPIRED"
        ),
        allowNull: false,
        defaultValue: "PENDING_REVIEW",
      },

      rejectionReason: {
        /**
         * Admin-provided reason when status = "REJECTED".
         * Shown to the employer so they can fix and resubmit.
         * NULL in all other states.
         */
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      // ── Table-level indexes ──────────────────────────────────────────────────
      //
      // Full explanation of both index strategies is in the migration file and
      // in the "Indexing Choices" section of the implementation plan.

      indexes: [
        /**
         * INDEX 1: Compound B-tree on (status, type, workMode)
         *
         * Supports the primary student browse query:
         *   WHERE status = 'ACTIVE' AND type = 'INTERNSHIP' AND workMode = 'REMOTE'
         *
         * Column order matters for a compound B-tree:
         *   status   — always filtered (students only see ACTIVE; admins filter by status)
         *   type     — second most-selective filter (INTERNSHIP vs JOB split)
         *   workMode — third filter, often combined with the above two
         *
         * Postgres can use this index for:
         *   WHERE status = ?                          (leftmost prefix)
         *   WHERE status = ? AND type = ?             (two-column prefix)
         *   WHERE status = ? AND type = ? AND workMode = ?  (full index)
         * but NOT for:
         *   WHERE type = ? AND workMode = ?           (skips status, leftmost)
         *
         * Named so it's identifiable in pg_indexes and removable by name.
         */
        {
          fields: ["status", "type", "workMode"],
          name: "listings_status_type_workmode_idx",
        },
      ],
      // NOTE: The GIN tsvector index for full-text search CANNOT be declared
      // in Sequelize's indexes[] array — Sequelize does not support USING GIN
      // with a computed expression (to_tsvector(...)).
      // It is added in the migration via a raw queryInterface.sequelize.query().
      // See the migration file for the exact DDL.
    }
  );

  // ── Associations ─────────────────────────────────────────────────────────────

  Listing.associate = (models) => {
    /**
     * belongsTo → EmployerProfile
     *
     * Listing.employerId → EmployerProfile.id.
     * as: "employer" — used for eager-loading:
     *   Listing.findAll({ include: [{ model: EmployerProfile, as: "employer" }] })
     * The complementary side: EmployerProfile.hasMany(Listing, { as: "listings" }).
     */
    Listing.belongsTo(models.EmployerProfile, {
      foreignKey: "employerId",
      as: "employer",
    });

    /**
     * hasMany → Application
     * A listing can receive many applications from different students.
     * Guarded until Application model is written.
     */
    if (models.Application) {
      Listing.hasMany(models.Application, {
        foreignKey: "listingId",
        as: "applications",
      });
    }

    /**
     * hasMany → Report
     * Students/employers can report a listing for policy violations (PRD §5.10).
     * Guarded until Report model is written.
     */
    if (models.Report) {
      Listing.hasMany(models.Report, {
        foreignKey: "listingId",
        as: "reports",
      });
    }

    /**
     * hasMany → SavedListing (bookmarks)
     * Students can bookmark/save listings (PRD §5.5).
     * Guarded until SavedListing model is written.
     */
    if (models.SavedListing) {
      Listing.hasMany(models.SavedListing, {
        foreignKey: "listingId",
        as: "savedBy",
      });
    }
  };

  return Listing;
};
