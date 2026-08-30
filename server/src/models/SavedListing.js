"use strict";

/**
 * src/models/SavedListing.js  (bookmarks)
 * ─────────────────────────────────────────────────────────────────────────────
 * A pure join/pivot table representing a student's bookmark on a listing.
 * Contains no payload beyond the two foreign keys and timestamps.
 *
 * CARDINALITY
 *   A student can bookmark many listings.
 *   A listing can be bookmarked by many students.
 *   This is a Many-to-Many relationship, implemented here as an explicit
 *   Sequelize model (rather than a Sequelize.belongsToMany through-table)
 *   so we can:
 *     - Add payload columns in the future (e.g. a personal note, a tag)
 *     - Use standard findAll() queries with include[] rather than
 *       the more complex belongsToMany eager-loading API
 *
 * ASSOCIATIONS
 *   User    ──hasMany──▶ SavedListing (FK: SavedListing.studentId)  [User.js as="savedListings"]
 *   Listing ──hasMany──▶ SavedListing (FK: SavedListing.listingId)  [Listing.js as="savedBy"]
 *   SavedListing ──belongsTo──▶ User    (as "student", fk: studentId)
 *   SavedListing ──belongsTo──▶ Listing (as "listing", fk: listingId)
 *
 * UNIQUENESS
 *   A student cannot bookmark the same listing twice.
 *   Enforced by a UNIQUE compound index on (studentId, listingId) —
 *   same TOCTOU-prevention rationale as Application.(listingId, studentId).
 * ─────────────────────────────────────────────────────────────────────────────
 */

module.exports = (sequelize, DataTypes) => {
  const SavedListing = sequelize.define(
    "SavedListing", // → table name "SavedListings"
    {
      // ── Primary Key ────────────────────────────────────────────────────────

      id: {
        /**
         * UUID PK even for a join table. An explicit PK makes it easy to:
         *   - Reference a specific bookmark in DELETE /api/saved-listings/:id
         *   - Avoid composite PK awkwardness in Sequelize's API
         */
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── Foreign Keys ───────────────────────────────────────────────────────

      studentId: {
        /**
         * References Users.id — the student who bookmarked.
         * allowNull: false — a bookmark must have an owner.
         *
         * onDelete: CASCADE (migration) — if the student deletes their account,
         * remove all their bookmarks. Bookmarks have no value without the owner.
         */
        type: DataTypes.UUID,
        allowNull: false,
      },

      listingId: {
        /**
         * References Listings.id — the listing being bookmarked.
         * allowNull: false — a bookmark must reference a real listing.
         *
         * onDelete: CASCADE (migration) — if the listing is deleted/expired
         * and removed, cascading the bookmark deletion is cleaner than leaving
         * orphaned bookmarks pointing at non-existent listings.
         */
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      indexes: [
        /**
         * UNIQUE COMPOUND index on (studentId, listingId)
         *
         * WHY UNIQUE?
         *   Prevents a student from bookmarking the same listing twice,
         *   even under concurrent requests (same TOCTOU race-condition
         *   argument as Application.(listingId, studentId) — see Application.js).
         *   A duplicate bookmark request raises SequelizeUniqueConstraintError
         *   which the controller silently swallows (idempotent: "already saved"
         *   is not an error from the user's perspective — the API returns 200).
         *
         * COLUMN ORDER: studentId first
         *   The most frequent access pattern is "fetch all bookmarks for
         *   this student" (GET /api/saved-listings/mine → WHERE studentId = ?).
         *   Putting studentId first makes the leftmost-prefix of this index
         *   serve that query as an index scan, no additional index needed.
         */
        {
          unique: true,
          fields: ["studentId", "listingId"],
          name: "saved_listings_student_listing_unique",
        },
      ],
    }
  );

  // ── Associations ─────────────────────────────────────────────────────────────

  SavedListing.associate = (models) => {
    /**
     * belongsTo → User (the bookmarking student)
     *
     * as: "student" — consistent naming with Application.belongsTo(User).
     * Complement: User.hasMany(SavedListing, { as: "savedListings", fk: "studentId" })
     */
    SavedListing.belongsTo(models.User, {
      foreignKey: "studentId",
      as: "student",
    });

    /**
     * belongsTo → Listing (the bookmarked listing)
     *
     * as: "listing" — standard accessor name.
     * Complement: Listing.hasMany(SavedListing, { as: "savedBy", fk: "listingId" })
     *
     * Eager-load example (student's saved listings with listing details):
     *   SavedListing.findAll({
     *     where: { studentId },
     *     include: [{ model: Listing, as: "listing", where: { status: "ACTIVE" } }]
     *   })
     */
    SavedListing.belongsTo(models.Listing, {
      foreignKey: "listingId",
      as: "listing",
    });
  };

  return SavedListing;
};
