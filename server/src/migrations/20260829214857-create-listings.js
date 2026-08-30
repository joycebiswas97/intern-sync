"use strict";

/**
 * Migration: create-listings
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates the "Listings" table with:
 *   - Three ENUM columns (type, workMode, status)
 *   - Three Postgres TEXT[] array columns
 *   - FK to EmployerProfiles.id
 *   - Compound B-tree index on (status, type, workMode)
 *   - GIN index on to_tsvector('english', title || ' ' || description)
 *
 * DEPENDENCY ORDER
 *   Must run AFTER:
 *     20260829211509-create-users.js
 *     20260829214101-create-employer-profiles.js  (FK target: EmployerProfiles.id)
 *   Must run BEFORE:
 *     (any migration that creates Applications or Reports, which FK to Listings.id)
 *
 * IMPORTANT — THREE ENUM TYPES ARE CREATED
 *   Postgres auto-names them:
 *     "enum_Listings_type"
 *     "enum_Listings_workMode"
 *     "enum_Listings_status"
 *   The `down` function must drop all three explicitly.
 *
 * Run:   npm run db:migrate
 * Undo:  npm run db:migrate:undo
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    // ── 1. Create the table ──────────────────────────────────────────────────
    await queryInterface.createTable("Listings", {

      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── Foreign Key → EmployerProfiles ──────────────────────────────────────
      employerId: {
        /**
         * References EmployerProfile.id (not Users.id).
         * Listings are company-scoped, not person-scoped.
         *
         * onDelete: "CASCADE"
         *   If the EmployerProfile is deleted (which itself cascades from a
         *   User delete), all their listings are removed automatically.
         *   Alternative: "RESTRICT" forces manual listing cleanup before
         *   profile deletion. CASCADE is simpler for the admin delete-user
         *   flow and avoids orphaned listings.
         *
         * onUpdate: "CASCADE"
         *   Propagates any PK change on EmployerProfiles.id downward.
         */
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "EmployerProfiles",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      // ── Core Required Fields ─────────────────────────────────────────────────
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      // ── ENUM 1: type ─────────────────────────────────────────────────────────
      type: {
        /**
         * Sequelize DDL:
         *   CREATE TYPE "enum_Listings_type" AS ENUM ('INTERNSHIP', 'JOB');
         * Must be dropped in `down` to avoid "already exists" on re-migration.
         */
        type: Sequelize.ENUM("INTERNSHIP", "JOB"),
        allowNull: false,
      },

      description: {
        /** TEXT — feeds the GIN tsvector index for full-text search. */
        type: Sequelize.TEXT,
        allowNull: false,
      },

      // ── TEXT[] Array Columns ─────────────────────────────────────────────────
      responsibilities: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true, // defaultValue: [] handled at model/app layer
      },

      skillsRequired: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },

      // ── ENUM 2: workMode ─────────────────────────────────────────────────────
      workMode: {
        /**
         * CREATE TYPE "enum_Listings_workMode" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID');
         */
        type: Sequelize.ENUM("REMOTE", "ONSITE", "HYBRID"),
        allowNull: false,
      },

      location: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      // ── Compensation ─────────────────────────────────────────────────────────
      stipendOrSalaryMin: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      stipendOrSalaryMax: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "INR",
      },

      durationMonths: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      openings: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      applicationDeadline: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      perks: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },

      // ── ENUM 3: status ───────────────────────────────────────────────────────
      status: {
        /**
         * CREATE TYPE "enum_Listings_status"
         *   AS ENUM ('DRAFT','PENDING_REVIEW','ACTIVE','REJECTED','CLOSED','EXPIRED');
         *
         * Column-level DEFAULT set here (in addition to model defaultValue)
         * so direct SQL INSERTs that bypass Sequelize also get PENDING_REVIEW.
         * Defence-in-depth — the business rule lives in the DB, not only in JS.
         */
        type: Sequelize.ENUM(
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
        type: Sequelize.STRING,
        allowNull: true,
      },

      // ── Timestamps ───────────────────────────────────────────────────────────
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // ── 2. Compound B-tree index on (status, type, workMode) ────────────────────
    //
    // INDEXING CHOICE EXPLAINED
    // ─────────────────────────────────────────────────────────────────────────
    // This index accelerates the most common student browse query:
    //   SELECT * FROM "Listings"
    //   WHERE status = 'ACTIVE'
    //   AND type = 'INTERNSHIP'
    //   AND workMode = 'REMOTE'
    //   ORDER BY "createdAt" DESC
    //   LIMIT 20 OFFSET 0;
    //
    // WHY A COMPOUND INDEX INSTEAD OF THREE SEPARATE INDEXES?
    //   Postgres can use one compound index to satisfy all three WHERE
    //   conditions in a single index scan. Three separate indexes would
    //   require Postgres to either pick one and re-filter the rest in memory,
    //   or perform a Bitmap AND of all three — slower than one covering scan.
    //
    // COLUMN ORDER: status → type → workMode
    //   The query planner uses the index from left to right, stopping when it
    //   hits a column that isn't in the WHERE clause. The order chosen here
    //   matches the expected selectivity:
    //     status   — always present in every query (highest selectivity;
    //                "ACTIVE" is a small fraction of all rows once many
    //                CLOSED/EXPIRED/DRAFT listings accumulate)
    //     type     — frequently filtered (INTERNSHIP vs JOB)
    //     workMode — often co-filtered with the above two
    //
    //   This means the index also serves queries that filter only on status,
    //   or on status+type, without a workMode clause (leftmost prefix rule).
    //
    // NOT using a UNIQUE index — a listing can have the same
    // (status, type, workMode) tuple as many other listings.
    // ─────────────────────────────────────────────────────────────────────────
    await queryInterface.addIndex("Listings", {
      fields: ["status", "type", "workMode"],
      name: "listings_status_type_workmode_idx",
    });

    // ── 3. Index on employerId ───────────────────────────────────────────────────
    // Supports GET /api/listings/mine (employer's own listings):
    //   WHERE "employerId" = ?
    // FK columns are not automatically indexed in Postgres; adding one here
    // avoids a full table scan on what will be a frequent query.
    await queryInterface.addIndex("Listings", {
      fields: ["employerId"],
      name: "listings_employer_id_idx",
    });

    // ── 4. GIN index for full-text search ───────────────────────────────────────
    //
    // INDEXING CHOICE EXPLAINED
    // ─────────────────────────────────────────────────────────────────────────
    // PRD §5.5: "Full-text search on title and description using a Postgres
    //   tsvector GIN index in v1."
    //
    // PRD §2 comment (verbatim from the Listing model):
    //   CREATE INDEX listing_search_idx ON "Listings"
    //   USING GIN (to_tsvector('english', title || ' ' || description));
    //
    // WHY GIN, NOT B-TREE?
    //   B-tree indexes work on exact values and ranges. They cannot accelerate
    //   substring or natural-language searches.
    //   GIN (Generalized Inverted Index) is purpose-built for composite values
    //   like arrays and tsvectors. It builds a posting list mapping each lexeme
    //   (stemmed word) to the rows containing it, enabling:
    //     WHERE to_tsvector('english', title || ' ' || description)
    //           @@ to_tsquery('english', 'react & typescript')
    //   in O(log N + K) time instead of a full table scan.
    //
    // WHY A FUNCTIONAL/EXPRESSION INDEX?
    //   Rather than storing a tsvector column and keeping it up to date with
    //   triggers, we build the index on the expression
    //   to_tsvector('english', title || ' ' || description).
    //   Postgres recomputes the expression on every INSERT/UPDATE and updates
    //   the index automatically. This avoids an extra column and a trigger.
    //
    // WHY 'english'?
    //   The language parameter controls stemming and stop-word removal.
    //   'english' stems "internship" → "internship", "running" → "run",
    //   and removes common words like "a", "the", "in". This means a search
    //   for "runs" matches rows containing "running". The PRD targets an
    //   English-language platform so 'english' is the correct dictionary.
    //
    // WHY CONCATENATE title AND description WITH ' ' (space)?
    //   to_tsvector processes a single text argument. Concatenating both
    //   fields means a single GIN index covers searches that match words
    //   in either the title or the description — exactly what PRD §5.5
    //   requires. The space separator prevents word-boundary bleeding
    //   (e.g. "React" at end of title + "developer" at start of description
    //   becoming "Reactdeveloper").
    //
    // WHY NOT A STORED tsvector COLUMN?
    //   A generated/stored column approach (ALTER TABLE ... ADD COLUMN
    //   search_vector TSVECTOR GENERATED ALWAYS AS ...) requires Postgres 12+
    //   and the GIN index would then be on the column. Both approaches are
    //   equivalent in query performance. The expression index is simpler
    //   (no extra column) and is the pattern the PRD explicitly specifies.
    //
    // CANNOT BE DECLARED IN Sequelize indexes[] ARRAY
    //   Sequelize's model-level indexes[] only supports standard B-tree
    //   index definitions. USING GIN with a to_tsvector() expression requires
    //   raw DDL — hence this raw queryInterface.sequelize.query() call.
    // ─────────────────────────────────────────────────────────────────────────
    await queryInterface.sequelize.query(`
      CREATE INDEX "listings_search_gin_idx"
        ON "Listings"
        USING GIN (
          to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
        );
    `);
    // Note: coalesce() guards against NULL values in either column during
    // index computation, even though both are NOT NULL in the schema —
    // it's defensive programming in case a direct SQL INSERT omits them.
  },

  async down(queryInterface /*, Sequelize */) {
    // ── Drop the table ────────────────────────────────────────────────────────
    // Automatically removes:
    //   - All B-tree indexes (compound, employerId)
    //   - The FK constraint on employerId
    //   - The GIN index (it is table-scoped and dropped with the table)
    await queryInterface.dropTable("Listings");

    // ── Drop the three orphaned ENUM types ────────────────────────────────────
    // Postgres retains named ENUM types after the table is dropped.
    // All three must be cleaned up so re-running `up` doesn't fail.
    // Drop in reverse dependency order (no actual dependency between sibling
    // types, but reverse order is a good convention for down migrations).
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Listings_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Listings_workMode";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Listings_type";'
    );
  },
};
