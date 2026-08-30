"use strict";

/**
 * Migration: create-saved-listings
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates the "SavedListings" bookmark join table.
 *
 * DEPENDENCY ORDER
 *   Must run AFTER:
 *     20260829211509-create-users.js    (FK: studentId → Users.id)
 *     20260829214857-create-listings.js (FK: listingId → Listings.id)
 *
 * NO ENUM TYPES CREATED — no cleanup needed in `down` beyond dropTable.
 *
 * FK SEMANTICS
 *   studentId → CASCADE on delete
 *     Student account deleted → remove all their bookmarks. Bookmarks have
 *     no value without the owning student.
 *   listingId → CASCADE on delete
 *     Listing deleted/removed → remove all bookmarks pointing to it.
 *     Avoids orphaned bookmarks for non-existent listings.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("SavedListings", {

      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── FK: bookmarking student ───────────────────────────────────────────────
      studentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      // ── FK: bookmarked listing ────────────────────────────────────────────────
      listingId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "Listings", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    // ── UNIQUE compound index on (studentId, listingId) ──────────────────────────
    //
    // Prevents a student from bookmarking the same listing twice.
    // Same TOCTOU-prevention rationale as Application.(listingId, studentId).
    // A duplicate bookmark raises SequelizeUniqueConstraintError, which the
    // controller handles idempotently (returns 200 "already saved" — not 409).
    //
    // COLUMN ORDER: studentId first
    //   Serves the most common query pattern as a leftmost-prefix index:
    //     WHERE studentId = ?   → GET /api/saved-listings/mine
    //   The reverse order would require a separate index on studentId for this.
    await queryInterface.addIndex("SavedListings", {
      fields: ["studentId", "listingId"],
      unique: true,
      name: "saved_listings_student_listing_unique",
    });

    // Index on listingId: "how many students have bookmarked this listing?"
    // Supports analytics queries and the listing-detail page bookmark count.
    // The compound index above cannot serve WHERE listingId = ? efficiently
    // (listingId is second — not a leftmost prefix of that index).
    await queryInterface.addIndex("SavedListings", {
      fields: ["listingId"],
      name: "saved_listings_listing_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("SavedListings");
    // No ENUM types to clean up.
  },
};
