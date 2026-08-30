"use strict";

/**
 * Migration: create-student-profiles
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates the "StudentProfiles" table.
 *
 * DEPENDENCY ORDER
 *   This migration MUST run AFTER 20260829211509-create-users.js because
 *   the FK constraint (userId → Users.id) requires the "Users" table to
 *   exist first. sequelize-cli runs migrations in filename timestamp order,
 *   so the timestamp on this file (later than the Users migration) guarantees
 *   correct ordering automatically.
 *
 * Run:   npm run db:migrate
 * Undo:  npm run db:migrate:undo
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("StudentProfiles", {

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
         * UUID FK → Users.id
         *
         * type: Sequelize.UUID
         *   MUST match the type of Users.id exactly. Postgres cannot create a
         *   FK between columns of different types.
         *
         * allowNull: false
         *   A profile row without an owner User is meaningless and forbidden.
         *
         * unique: true
         *   ──────────────────────────────────────────────────────────────────
         *   This is the column that enforces the 1-to-1 cardinality.
         *
         *   WITHOUT unique: A second StudentProfile could be inserted with the
         *   same userId (1-to-many). Sequelize's hasOne would silently return
         *   only the first row found — a subtle data integrity bug with no
         *   runtime error.
         *
         *   WITH unique: Postgres raises error code 23505 on the second INSERT,
         *   which Sequelize surfaces as SequelizeUniqueConstraintError. One
         *   user, one profile — guaranteed at the database level regardless of
         *   what the application layer does.
         *   ──────────────────────────────────────────────────────────────────
         *
         * references
         *   Declares the FK relationship to Postgres. Without this block
         *   Sequelize would create the column but Postgres would treat userId as
         *   a plain UUID column with no referential integrity — inserting a
         *   non-existent userId would succeed silently.
         *
         *   references.model: "Users"  → the Postgres table name (pluralised)
         *   references.key:   "id"     → the PK column on Users
         *
         * onUpdate: "CASCADE"
         *   If a User's primary key is ever changed (rare with UUIDs but
         *   possible), cascade the new value down to StudentProfiles.userId
         *   automatically. Avoids dangling FK values.
         *
         * onDelete: "CASCADE"
         *   When a User row is deleted, automatically delete their
         *   StudentProfile too. A profile without a user is orphan data.
         *   Alternative: "RESTRICT" would prevent User deletion while a
         *   profile exists (forces explicit cleanup first). CASCADE is simpler
         *   for the admin "delete user" flow (PRD §5.7).
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

      // ── Required Profile Fields ──────────────────────────────────────────────
      fullName: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      // ── Optional Profile Fields ──────────────────────────────────────────────
      headline: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      bio: {
        /**
         * TEXT — unbounded in Postgres, unlike VARCHAR(255).
         * Use TEXT for any field where you genuinely don't know the upper
         * bound of user input (bios, descriptions, cover letters).
         */
        type: Sequelize.TEXT,
        allowNull: true,
      },

      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      college: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      degree: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      graduationYear: {
        /** INTEGER — stored as a plain 4-digit year number. */
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      // ── Skills Array ─────────────────────────────────────────────────────────
      skills: {
        /**
         * Sequelize.ARRAY(Sequelize.STRING) → Postgres `TEXT[]`
         *
         * Postgres-native array column. Allows overlap queries:
         *   WHERE skills && ARRAY['React','Node.js']
         * used by the listing search filter (PRD §5.5).
         *
         * defaultValue is set in the model (Sequelize level). At the SQL DDL
         * level, Postgres stores the default as a literal array expression.
         * We do not set it here because Sequelize handles it via the model
         * definition on INSERT; omitting it in the migration is safe.
         *
         * NOT NULL with a default of [] is enforced by the model layer.
         * The migration column itself is nullable here only because
         * Sequelize/pg translates the ARRAY default at INSERT time.
         */
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true, // model defaultValue: [] prevents nulls at app layer
      },

      // ── File / URL Fields ────────────────────────────────────────────────────
      resumeUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      profilePicUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      portfolioUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      linkedinUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      // ── Location ─────────────────────────────────────────────────────────────
      location: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      // ── Timestamps ───────────────────────────────────────────────────────────
      // Required explicitly in every migration; Sequelize does NOT auto-add
      // them in createTable (only in sequelize.sync()).
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
    // Adds a named, Postgres-visible index for the 1-to-1 unique constraint.
    // The column-level unique:true above creates the constraint inline;
    // this addIndex gives it a stable, human-readable name so future
    // migrations can reference it by name in removeIndex().
    await queryInterface.addIndex("StudentProfiles", {
      fields: ["userId"],
      unique: true,
      name: "student_profiles_user_id_unique",
    });
  },

  async down(queryInterface /*, Sequelize */) {
    /**
     * Drop the table and index in the correct order.
     *
     * dropTable("StudentProfiles") automatically removes:
     *   - All indexes on the table (including student_profiles_user_id_unique)
     *   - The FK constraint on userId (it's a table-scoped constraint)
     *   - All column constraints
     *
     * No orphaned types to clean up here — unlike the Users migration there
     * are no ENUM columns in StudentProfiles.
     *
     * The Users table is NOT affected; Postgres FK constraints are
     * directional — dropping the child (StudentProfiles) does not touch
     * the parent (Users).
     */
    await queryInterface.dropTable("StudentProfiles");
  },
};
