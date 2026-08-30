"use strict";

/**
 * src/models/EmployerProfile.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-to-one extension of the User row for EMPLOYER-role accounts.
 *
 * RELATIONSHIP OVERVIEW
 *   User ──hasOne──▶ EmployerProfile   (FK lives on EmployerProfile.userId)
 *   EmployerProfile ──belongsTo──▶ User
 *   EmployerProfile ──hasMany──▶ Listing  (FK lives on Listing.employerId)
 *
 * ASSOCIATION ALIASES (must match User.js declarations exactly)
 *   User.hasOne(EmployerProfile, { as: "employerProfile" })
 *   EmployerProfile.belongsTo(User, { as: "user" })
 *   EmployerProfile.hasMany(Listing,  { as: "listings" })
 *
 * THE VERIFICATION GATE
 *   Every new EmployerProfile starts with verificationStatus = "PENDING".
 *   An admin must explicitly set it to "APPROVED" before the employer can
 *   post listings (PRD §5.3, §5.4). This is enforced at the controller layer
 *   (403 when verificationStatus !== "APPROVED") — not in this model.
 * ─────────────────────────────────────────────────────────────────────────────
 */

module.exports = (sequelize, DataTypes) => {
  const EmployerProfile = sequelize.define(
    "EmployerProfile", // → table name "EmployerProfiles"
    {
      // ── Primary Key ────────────────────────────────────────────────────────

      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── Foreign Key & 1-to-1 Enforcement ──────────────────────────────────

      userId: {
        /**
         * UUID FK → Users.id.
         *
         * unique: true
         *   Enforces the 1-to-1 cardinality at the DB level, identical to
         *   StudentProfile.userId. Without this, multiple EmployerProfile rows
         *   could map to the same User, making hasOne unreliable.
         *   See StudentProfile.js for the full unique constraint explanation.
         *
         * allowNull: false
         *   An EmployerProfile without an owning User is orphan data.
         *   The FK constraint in the migration (references + onDelete CASCADE)
         *   provides the second layer of referential integrity.
         */
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },

      // ── Company Identity ───────────────────────────────────────────────────

      companyName: {
        /**
         * Required at employer registration — captured via the "companyName"
         * field in POST /api/auth/register (PRD §5.1) and stored here.
         * This is the only non-nullable profile field beyond userId.
         */
        type: DataTypes.STRING,
        allowNull: false,
      },

      companyLogoUrl: {
        /**
         * URL returned by Cloudinary / S3 after logo upload.
         * Set via POST /api/employers/me/logo (multipart, PRD §5.3).
         * Nullable — employers can register without a logo.
         */
        type: DataTypes.STRING,
        allowNull: true,
      },

      companyWebsite: {
        /**
         * External URL to the company's public website.
         * Used by admins during verification to cross-check legitimacy.
         * Format validated at the Joi/route layer (not here).
         */
        type: DataTypes.STRING,
        allowNull: true,
      },

      industry: {
        /**
         * Free-form sector label, e.g. "FinTech", "EdTech", "Healthcare".
         * No ENUM here — exhaustive industry lists change frequently and a
         * STRING allows flexibility without a schema migration for every new
         * sector. Normalisation to a lookup table is a v2 concern.
         */
        type: DataTypes.STRING,
        allowNull: true,
      },

      companySize: {
        /**
         * Stored as a string range, e.g. "1–10", "11–50", "51–200", "200+".
         * A STRING is more flexible than an ENUM because the ranges might
         * change without requiring an ALTER TYPE migration.
         */
        type: DataTypes.STRING,
        allowNull: true,
      },

      aboutCompany: {
        /**
         * DataTypes.TEXT → Postgres `TEXT` (no length cap).
         * Longer company description shown on the public listing detail page.
         * TEXT instead of STRING because company descriptions routinely
         * exceed 255 characters.
         */
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // ── Verification Status (ENUM) ─────────────────────────────────────────

      verificationStatus: {
        /**
         * DataTypes.ENUM("PENDING", "APPROVED", "REJECTED")
         * → Postgres named type: "enum_EmployerProfiles_verificationStatus"
         *
         * THE THREE STATES
         * ────────────────────────────────────────────────────────────────────
         * PENDING  (defaultValue)
         *   The state every new employer starts in. The employer can log in,
         *   complete their profile, and see their dashboard — but cannot post
         *   listings. The middleware check is:
         *     if (employer.verificationStatus !== "APPROVED") → 403
         *
         *   WHY DEFAULT TO PENDING?
         *   ─────────────────────────────────────────────────────────────────
         *   Defaulting to PENDING rather than APPROVED enforces a moderation
         *   gate on every new employer. This is intentional by design (PRD §5.3):
         *
         *   1. TRUST — InternSync is a student-facing platform. A scam employer
         *      posting fake listings before anyone reviews them would damage
         *      trust immediately. PENDING means no listings reach students
         *      until a human (or future automated check) has vetted the company.
         *
         *   2. SECURITY — Self-registration is open (no invite required for
         *      employers). Without a PENDING gate, any bad actor could register,
         *      auto-approve themselves, and post fraudulent listings the moment
         *      they hit "submit". PENDING closes that window.
         *
         *   3. BUSINESS RULE — PRD §5.3 explicitly states: "On profile submission
         *      for the first time, status is PENDING. Admin reviews and sets
         *      APPROVED or REJECTED." Defaulting to APPROVED would contradict
         *      the PRD requirement and break the admin moderation queue (§5.7).
         *
         *   4. REVERSIBILITY — PENDING → APPROVED is a deliberate admin action.
         *      APPROVED → (bad actor discovered) requires reactive banning.
         *      It's always easier to approve than to undo the damage of an
         *      auto-approved scam listing already seen by students.
         *
         * APPROVED
         *   Admin called PATCH /api/admin/employers/:id/verify { status: "APPROVED" }.
         *   The employer can now post listings. New listings go to PENDING_REVIEW
         *   themselves (PRD §5.4) — approval is per-employer, not per-listing.
         *
         * REJECTED
         *   Admin rejected with a mandatory reason (stored in rejectionReason).
         *   The employer sees the reason and can resubmit (PRD §5.3). Each
         *   resubmission should reset status to PENDING so the admin queue
         *   shows it again — implemented in the employer controller, not here.
         * ────────────────────────────────────────────────────────────────────
         */
        type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
        allowNull: false,
        defaultValue: "PENDING",
      },

      // ── Rejection Reason ───────────────────────────────────────────────────

      rejectionReason: {
        /**
         * Populated by the admin when verificationStatus is set to "REJECTED".
         * Shown to the employer in their dashboard so they know what to fix
         * before resubmitting (PRD §5.3 — "REJECTED employers see the rejection
         * reason and can resubmit").
         *
         * Nullable because it only applies in the REJECTED state. When status
         * transitions back to PENDING (resubmission) the controller should
         * null this field out so stale reasons don't persist.
         */
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      // ── Table-level indexes ────────────────────────────────────────────────

      indexes: [
        /**
         * Named UNIQUE index on userId — same rationale as StudentProfile.
         * Enforces the 1-to-1 relationship at the DB level and gives the
         * index a stable name for future migrations.
         */
        {
          unique: true,
          fields: ["userId"],
          name: "employer_profiles_user_id_unique",
        },
      ],
    }
  );

  // ── Associations ───────────────────────────────────────────────────────────

  EmployerProfile.associate = (models) => {
    /**
     * belongsTo → User
     *
     * EmployerProfile holds the FK (userId → Users.id).
     * as: "user" is the accessor used for eager-loading:
     *   EmployerProfile.findOne({ include: [{ model: User, as: "user" }] })
     *
     * The complementary alias on the User side is "employerProfile" (User.js).
     * foreignKey must match on both sides — mismatch creates a phantom column.
     */
    EmployerProfile.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });

    /**
     * hasMany → Listing
     *
     * An APPROVED employer can own many listings across their lifetime.
     * foreignKey: "employerId" — the Listing model stores the employer's
     * EmployerProfile.id (not User.id) because listings are company-scoped,
     * not user-scoped. This allows future employer team-seats (multiple Users
     * per company) without breaking the listings association.
     *
     * Guarded: Listing model may not exist yet during incremental development.
     */
    if (models.Listing) {
      EmployerProfile.hasMany(models.Listing, {
        foreignKey: "employerId",
        as: "listings",
      });
    }
  };

  return EmployerProfile;
};
