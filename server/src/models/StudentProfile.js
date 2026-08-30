"use strict";

/**
 * src/models/StudentProfile.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-to-one extension of the User row for STUDENT-role accounts.
 *
 * WHY A SEPARATE TABLE?
 *   Keeping profile data out of Users avoids a wide, nullable-heavy Users
 *   table. Only students have a StudentProfile; employers have an
 *   EmployerProfile. The separation also makes it easy to JOIN only what a
 *   given request actually needs (e.g., the auth /me endpoint returns User
 *   columns; the profile page adds a JOIN to StudentProfile).
 *
 * THE 1-to-1 RELATIONSHIP
 *   User  ──hasOne──▶  StudentProfile   (FK lives on StudentProfile.userId)
 *   StudentProfile  ──belongsTo──▶  User
 *
 *   Sequelize places the FK on the "belongs-to" / child side — StudentProfile
 *   here. This means StudentProfile.userId is the column that references
 *   Users.id, not the other way around.
 *
 * ASSOCIATION ALIASES (must match User.js exactly)
 *   User.hasOne(StudentProfile, { as: "studentProfile" })   → User.getStudentProfile()
 *   StudentProfile.belongsTo(User, { as: "user" })          → StudentProfile.getUser()
 * ─────────────────────────────────────────────────────────────────────────────
 */

module.exports = (sequelize, DataTypes) => {
  const StudentProfile = sequelize.define(
    "StudentProfile", // → table name "StudentProfiles"
    {
      // ── Primary Key ────────────────────────────────────────────────────────

      id: {
        /**
         * UUID primary key — same reasoning as User.id.
         * Safe to expose in profile URLs without sequential enumeration risk.
         */
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      // ── Foreign Key & 1-to-1 Enforcement ──────────────────────────────────

      userId: {
        /**
         * DataTypes.UUID — must match the type of Users.id exactly.
         *   Postgres enforces referential integrity at the FK constraint level;
         *   a type mismatch prevents the FK from being created.
         *
         * allowNull: false
         *   A StudentProfile row can never exist without an owning User.
         *   The NOT NULL constraint is the first line of defence; the FK
         *   constraint (added in the migration via references:) is the second.
         *
         * unique: true  ← THIS IS THE KEY CONSTRAINT FOR 1-to-1
         *   ─────────────────────────────────────────────────────────────────
         *   Without unique:true on userId, the schema would allow multiple
         *   StudentProfile rows to point to the same User, turning the
         *   relationship into a 1-to-many (User hasMany StudentProfiles).
         *   The UNIQUE constraint on userId ensures Postgres rejects any
         *   INSERT or UPDATE that would create a second profile for a user
         *   who already has one.
         *
         *   Sequence of events when a duplicate is attempted:
         *     1. App layer calls StudentProfile.create({ userId: existingId })
         *     2. Postgres finds userId already exists in the UNIQUE index
         *     3. Throws a unique violation (pg error code 23505)
         *     4. Sequelize surfaces it as SequelizeUniqueConstraintError
         *     5. Controller catches it → 409 Conflict
         *   ─────────────────────────────────────────────────────────────────
         */
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },

      // ── Required Profile Fields ────────────────────────────────────────────

      fullName: {
        /**
         * The only non-nullable profile field beyond userId.
         * Captured at registration ("fullName" in the POST /api/auth/register
         * body for STUDENT role per PRD §5.1) and stored here, not on Users.
         */
        type: DataTypes.STRING,
        allowNull: false,
      },

      // ── Optional Profile Fields ────────────────────────────────────────────
      // All nullable — students fill them in progressively via the profile
      // completion percentage (PRD §5.2). Short-form fields use STRING
      // (VARCHAR 255); long-form narrative uses TEXT (unbounded in Postgres).

      headline: {
        /**
         * One-line professional summary, e.g. "Final-year CS student @ IIT Delhi".
         * Shown on the applicant card in the employer dashboard.
         */
        type: DataTypes.STRING,
        allowNull: true,
      },

      bio: {
        /**
         * DataTypes.TEXT → Postgres `TEXT` column (no length limit).
         * Used for the longer "About Me" section. TEXT avoids VARCHAR
         * truncation if a student writes more than 255 characters.
         */
        type: DataTypes.TEXT,
        allowNull: true,
      },

      phone: {
        /**
         * Stored as STRING, not INTEGER — phone numbers can have leading zeros,
         * country codes with "+", and formatting characters like "-" or " ".
         * Validation (format check) happens at the Joi/route layer, not here.
         */
        type: DataTypes.STRING,
        allowNull: true,
      },

      college: {
        /** Name of the student's institution. Free-form text in v1. */
        type: DataTypes.STRING,
        allowNull: true,
      },

      degree: {
        /** e.g. "B.Tech Computer Science", "MBA Marketing". */
        type: DataTypes.STRING,
        allowNull: true,
      },

      graduationYear: {
        /**
         * DataTypes.INTEGER → Postgres `INTEGER`.
         * Stored as a 4-digit year (e.g. 2025). Allows filtering listings
         * by graduation cohort. Validated at the route layer (must be
         * between current year and current year + 6).
         */
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // ── Skills Array ───────────────────────────────────────────────────────

      skills: {
        /**
         * DataTypes.ARRAY(DataTypes.STRING) → Postgres `TEXT[]` column.
         *
         * WHY NOT A JOIN TABLE?
         *   A separate StudentSkills table would be normalised but adds query
         *   complexity for what is effectively a flat list on a single profile.
         *   The ARRAY type lets us do set-intersection queries in SQL:
         *     WHERE skills && ARRAY['React','Node.js']   (overlaps operator)
         *   which is used for the listing search filter (PRD §5.5).
         *   ARRAY is Postgres-specific — acceptable since our stack is
         *   Postgres-only (PRD §2).
         *
         * defaultValue: []
         *   An empty array (not NULL) means "no skills listed yet". This
         *   simplifies application code — no null checks before .length or
         *   spread operations.
         */
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        allowNull: false,
      },

      // ── File / URL Fields ──────────────────────────────────────────────────
      // All store URLs returned by Cloudinary / S3 after upload.
      // The actual file lives in the storage provider; we store only the URL.

      resumeUrl: {
        /**
         * URL to the uploaded PDF/DOC resume in Cloudinary or S3.
         * Required before a student can apply to a listing (PRD §5.2, §5.4).
         * Set by POST /api/students/me/resume (multipart upload via multer).
         */
        type: DataTypes.STRING,
        allowNull: true,
      },

      profilePicUrl: {
        /** URL to the student's avatar / headshot. */
        type: DataTypes.STRING,
        allowNull: true,
      },

      portfolioUrl: {
        /** External link to GitHub, Behance, personal site, etc. */
        type: DataTypes.STRING,
        allowNull: true,
      },

      linkedinUrl: {
        /** LinkedIn profile URL for employer cross-reference. */
        type: DataTypes.STRING,
        allowNull: true,
      },

      // ── Location ──────────────────────────────────────────────────────────

      location: {
        /**
         * Free-form text: "Mumbai", "Bengaluru, Karnataka", "Remote".
         * Used as a display field and loose filter in listing search (PRD §5.5).
         * No structured city/state/country split in v1.
         */
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      // ── Table-level options ──────────────────────────────────────────────────

      indexes: [
        /**
         * Named UNIQUE index on userId — mirrors the column-level unique:true.
         *
         * WHY NAME IT?
         *   A named index is findable in pg_indexes and can be dropped by name
         *   in future migrations:
         *     removeIndex("StudentProfiles", { name: "student_profiles_user_id_unique" })
         *   Without a name, Sequelize auto-generates "student_profiles_user_id_key"
         *   — functional but opaque.
         */
        {
          unique: true,
          fields: ["userId"],
          name: "student_profiles_user_id_unique",
        },
      ],
    }
  );

  // ── Association ──────────────────────────────────────────────────────────────

  StudentProfile.associate = (models) => {
    /**
     * belongsTo → User
     *
     * WHAT belongsTo DOES
     *   Tells Sequelize that StudentProfile holds the FK (userId) and that
     *   it points to Users.id. This is the "child" / "many" side of the pair.
     *
     *   Sequelize adds instance methods:
     *     profile.getUser()    → SELECT * FROM "Users" WHERE id = profile.userId
     *     profile.setUser(u)   → UPDATE "StudentProfiles" SET userId = u.id …
     *     profile.createUser() → rarely used (creates a new User for this profile)
     *
     * foreignKey: "userId"
     *   Must match the column name declared above AND the foreignKey passed
     *   to User.hasOne() in User.js. If they diverge Sequelize generates a
     *   second FK column (e.g. "UserId") and the table has duplicate FKs.
     *
     * as: "user"
     *   The alias used in eager-loading:
     *     StudentProfile.findOne({ include: [{ model: User, as: "user" }] })
     *   Must be unique among this model's associations. The complementary alias
     *   on the User side is "studentProfile" (see User.js).
     *
     * onDelete behaviour
     *   Not set here — managed in the migration via the references block.
     *   We use CASCADE so deleting a User automatically removes their profile.
     */
    StudentProfile.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return StudentProfile;
};
