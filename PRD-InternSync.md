# Product Requirements Document (PRD)
## InternSync — Student Internship & Job Platform

**Version:** 1.0
**Purpose of this document:** This PRD is written to be consumed directly by developers and AI coding agents (e.g. Claude Code, Cursor, Copilot) to scaffold and build the product. Every feature includes user stories, functional requirements, data shape, and API contracts so an agent can implement it with minimal ambiguity.

---

## 1. Product Overview

**InternSync** is a three-sided marketplace connecting:
- **Students** — who discover, apply to, and track internships/jobs.
- **Employers** — who post internships/jobs, manage applicants, and hire.
- **Admins** — who moderate content, manage users, and oversee platform health.

### 1.1 Goals
- Let employers post verified internship/job listings and manage a hiring pipeline.
- Let students build a profile/resume, discover relevant listings, apply, and track application status.
- Give admins tools to approve/reject listings, manage users, handle reports, and view platform analytics.

### 1.2 Non-Goals (v1)
- Payments/stipend escrow, in-app video interviews, mobile native apps (web-responsive only), certifications/courses marketplace.

---

## 2. Tech Stack

| Layer | Recommendation | Notes |
|---|---|---|
| Frontend | React (Vite) + JavaScript, Tailwind CSS | Component-driven, fast dev loop. Use `.jsx`, not `.tsx` |
| State/Data fetching | React Query (TanStack Query) + Zustand/Context | Server cache + light client state |
| Backend | Node.js + Express + JavaScript | REST API |
| Database | PostgreSQL | Relational DB |
| ORM | Sequelize | Model definitions, migrations, associations |
| Auth | JWT (access + refresh tokens), bcrypt for passwords | Role-based access control (RBAC) |
| Validation | Joi or express-validator | Validate request bodies at the route layer |
| File storage | Cloudinary / AWS S3 | Resumes, company logos, profile pictures |
| Email | Nodemailer + SMTP, or Resend/SendGrid | Verification, notifications |
| Search | PostgreSQL full-text search (`tsvector`) in v1 → Elasticsearch/Meilisearch in v2 | |
| Hosting | Frontend: Vercel/Netlify; Backend: Render/Railway; DB: Supabase/Neon/RDS | |
| Testing | Jest + Supertest (backend), Vitest + React Testing Library (frontend) | |

**Monorepo structure suggestion:**
```
/internsync
  /client                 (React frontend - Vite, plain JS)
    /src
      /pages
      /components
      /hooks
      /api                (axios/fetch wrapper functions per resource)
      /store              (Zustand stores / context)
  /server                 (Node/Express backend - plain JS)
    /src
      /models             (Sequelize models)
      /migrations         (Sequelize migrations)
      /routes
      /controllers
      /middleware          (auth, role-check, error handler, upload)
      /services            (email, file upload, notifications)
      /utils
      /config              (db.js, sequelize instance)
      app.js
      server.js
  /.env.example
  /README.md
```

**Package notes:**
- Everything is plain JavaScript (`"type": "module"` in `package.json` for ES modules, or CommonJS `require` — pick one convention and stay consistent across the whole repo).
- No `tsconfig.json`, no `.ts`/`.tsx` files, no TypeScript compiler step. Use `PropTypes` (optional, `prop-types` package) on the frontend if you want lightweight prop validation without TypeScript.

---

## 3. User Roles & Permissions Matrix

| Capability | Student | Employer | Admin |
|---|---|---|---|
| Register/login | ✅ | ✅ | Seeded/invited only |
| Create/edit own profile | ✅ | ✅ (company profile) | ✅ |
| Post internship/job listing | ❌ | ✅ (after verification) | ✅ (any) |
| Edit/delete own listing | ❌ | ✅ (own only) | ✅ (any) |
| Apply to listing | ✅ | ❌ | ❌ |
| View applicants for a listing | ❌ | ✅ (own listings only) | ✅ (all) |
| Change application status | ❌ | ✅ (own listings) | ✅ |
| Approve/reject employer accounts | ❌ | ❌ | ✅ |
| Approve/reject listings | ❌ | ❌ | ✅ |
| Ban/suspend users | ❌ | ❌ | ✅ |
| View platform analytics | ❌ | Own listings' stats only | ✅ (global) |
| Report a listing/user | ✅ | ✅ | — |
| Resolve reports | ❌ | ❌ | ✅ |

Authorization must be enforced **server-side** on every endpoint (never trust the client role claim without verifying the JWT + DB role via middleware).

---

## 4. Data Model (Sequelize Models)

```javascript
// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM("STUDENT", "EMPLOYER", "ADMIN"), allowNull: false },
    isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    isBanned: { type: DataTypes.BOOLEAN, defaultValue: false },
  });

  User.associate = (models) => {
    User.hasOne(models.StudentProfile, { foreignKey: "userId" });
    User.hasOne(models.EmployerProfile, { foreignKey: "userId" });
    User.hasMany(models.Application, { foreignKey: "studentId" });
    User.hasMany(models.Report, { foreignKey: "reporterId" });
    User.hasMany(models.Notification, { foreignKey: "userId" });
  };

  return User;
};
```

```javascript
// models/StudentProfile.js
module.exports = (sequelize, DataTypes) => {
  const StudentProfile = sequelize.define("StudentProfile", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    headline: DataTypes.STRING,
    bio: DataTypes.TEXT,
    phone: DataTypes.STRING,
    college: DataTypes.STRING,
    degree: DataTypes.STRING,
    graduationYear: DataTypes.INTEGER,
    skills: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
    resumeUrl: DataTypes.STRING,
    profilePicUrl: DataTypes.STRING,
    portfolioUrl: DataTypes.STRING,
    linkedinUrl: DataTypes.STRING,
    location: DataTypes.STRING,
  });

  StudentProfile.associate = (models) => {
    StudentProfile.belongsTo(models.User, { foreignKey: "userId" });
  };

  return StudentProfile;
};
```

```javascript
// models/EmployerProfile.js
module.exports = (sequelize, DataTypes) => {
  const EmployerProfile = sequelize.define("EmployerProfile", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },
    companyName: { type: DataTypes.STRING, allowNull: false },
    companyLogoUrl: DataTypes.STRING,
    companyWebsite: DataTypes.STRING,
    industry: DataTypes.STRING,
    companySize: DataTypes.STRING,
    aboutCompany: DataTypes.TEXT,
    verificationStatus: {
      type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
      defaultValue: "PENDING",
    },
    rejectionReason: DataTypes.STRING,
  });

  EmployerProfile.associate = (models) => {
    EmployerProfile.belongsTo(models.User, { foreignKey: "userId" });
    EmployerProfile.hasMany(models.Listing, { foreignKey: "employerId" });
  };

  return EmployerProfile;
};
```

```javascript
// models/Listing.js
module.exports = (sequelize, DataTypes) => {
  const Listing = sequelize.define(
    "Listing",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      employerId: { type: DataTypes.UUID, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      type: { type: DataTypes.ENUM("INTERNSHIP", "JOB"), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      responsibilities: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
      skillsRequired: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
      workMode: { type: DataTypes.ENUM("REMOTE", "ONSITE", "HYBRID"), allowNull: false },
      location: DataTypes.STRING,
      stipendOrSalaryMin: DataTypes.INTEGER,
      stipendOrSalaryMax: DataTypes.INTEGER,
      currency: { type: DataTypes.STRING, defaultValue: "INR" },
      durationMonths: DataTypes.INTEGER,
      openings: { type: DataTypes.INTEGER, defaultValue: 1 },
      applicationDeadline: DataTypes.DATE,
      perks: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
      status: {
        type: DataTypes.ENUM("DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "CLOSED", "EXPIRED"),
        defaultValue: "PENDING_REVIEW",
      },
      rejectionReason: DataTypes.STRING,
    },
    {
      indexes: [
        { fields: ["status", "type", "workMode"] },
        // Full-text search index — add via migration:
        // CREATE INDEX listing_search_idx ON "Listings" USING GIN (to_tsvector('english', title || ' ' || description));
      ],
    }
  );

  Listing.associate = (models) => {
    Listing.belongsTo(models.EmployerProfile, { foreignKey: "employerId" });
    Listing.hasMany(models.Application, { foreignKey: "listingId" });
    Listing.hasMany(models.Report, { foreignKey: "listingId" });
  };

  return Listing;
};
```

```javascript
// models/Application.js
module.exports = (sequelize, DataTypes) => {
  const Application = sequelize.define(
    "Application",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      listingId: { type: DataTypes.UUID, allowNull: false },
      studentId: { type: DataTypes.UUID, allowNull: false },
      coverLetter: DataTypes.TEXT,
      resumeUrlSnapshot: DataTypes.STRING,
      status: {
        type: DataTypes.ENUM("APPLIED", "SHORTLISTED", "INTERVIEW", "OFFERED", "REJECTED", "WITHDRAWN"),
        defaultValue: "APPLIED",
      },
      statusHistory: { type: DataTypes.JSONB, defaultValue: [] },
      appliedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      indexes: [{ unique: true, fields: ["listingId", "studentId"] }],
    }
  );

  Application.associate = (models) => {
    Application.belongsTo(models.Listing, { foreignKey: "listingId" });
    Application.belongsTo(models.User, { foreignKey: "studentId" });
  };

  return Application;
};
```

```javascript
// models/Report.js
module.exports = (sequelize, DataTypes) => {
  const Report = sequelize.define("Report", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    reporterId: { type: DataTypes.UUID, allowNull: false },
    listingId: DataTypes.UUID,
    reportedUserId: DataTypes.UUID,
    reason: { type: DataTypes.STRING, allowNull: false },
    details: DataTypes.TEXT,
    status: { type: DataTypes.ENUM("OPEN", "RESOLVED", "DISMISSED"), defaultValue: "OPEN" },
    resolutionNote: DataTypes.STRING,
    resolvedAt: DataTypes.DATE,
  });

  Report.associate = (models) => {
    Report.belongsTo(models.User, { as: "reporter", foreignKey: "reporterId" });
    Report.belongsTo(models.Listing, { foreignKey: "listingId" });
  };

  return Report;
};
```

```javascript
// models/Notification.js
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define("Notification", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false }, // e.g. APPLICATION_STATUS_CHANGED, LISTING_APPROVED
    title: { type: DataTypes.STRING, allowNull: false },
    body: DataTypes.TEXT,
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  });

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: "userId" });
  };

  return Notification;
};
```

```javascript
// models/SavedListing.js  (bookmarks)
module.exports = (sequelize, DataTypes) => {
  const SavedListing = sequelize.define(
    "SavedListing",
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      studentId: { type: DataTypes.UUID, allowNull: false },
      listingId: { type: DataTypes.UUID, allowNull: false },
    },
    {
      indexes: [{ unique: true, fields: ["studentId", "listingId"] }],
    }
  );

  SavedListing.associate = (models) => {
    SavedListing.belongsTo(models.User, { foreignKey: "studentId" });
    SavedListing.belongsTo(models.Listing, { foreignKey: "listingId" });
  };

  return SavedListing;
};
```

---

## 5. Feature Specifications

Each feature below includes: **User Story**, **Functional Requirements**, **API Endpoints**, and **Edge Cases** — enough detail for an AI agent to implement end-to-end.

### 5.1 Authentication & Onboarding

**User Story:** As a user, I can register as a Student or Employer, verify my email, log in, and reset my password.

**Functional Requirements:**
- Registration requires: email, password (min 8 chars, 1 number, 1 special char), role selection (STUDENT or EMPLOYER only — ADMIN is never self-registered).
- On registration, send a verification email with a signed token (expires in 24h) — use `jsonwebtoken` or a random token stored on the user record with an expiry column.
- Login issues a short-lived JWT access token (15 min) + long-lived refresh token (7 days, httpOnly cookie).
- Password reset flow: request reset link → emailed token → set new password.
- Employer accounts additionally require `companyName` at signup and start with `verificationStatus = PENDING`. Employers with PENDING status can log in and complete their profile but **cannot post listings** until APPROVED by admin.

**API Endpoints:**
```
POST /api/auth/register            { email, password, role, fullName|companyName }
POST /api/auth/verify-email        { token }
POST /api/auth/login               { email, password } -> { accessToken, user }  (refresh token as httpOnly cookie)
POST /api/auth/refresh             (uses cookie) -> { accessToken }
POST /api/auth/logout
POST /api/auth/forgot-password     { email }
POST /api/auth/reset-password      { token, newPassword }
GET  /api/auth/me                  -> current user + profile
```

**Edge Cases:**
- Duplicate email → 409 Conflict (Sequelize throws `SequelizeUniqueConstraintError` on the unique index — catch and translate it).
- Unverified email attempting login → allow login but flag `isEmailVerified: false` in response so frontend can nag/restrict actions (e.g., block applying until verified).
- Banned user login → 403 with reason.

---

### 5.2 Student Profile & Resume

**User Story:** As a student, I want to build a profile with my education, skills, and resume so employers can evaluate me.

**Functional Requirements:**
- Editable fields: fullName, headline, bio, phone, college, degree, graduationYear, skills[], resumeUrl, profilePicUrl, portfolioUrl, linkedinUrl, location.
- Resume upload: accept PDF/DOC/DOCX, max 5MB, uploaded via `multer` middleware then pushed to Cloudinary/S3, URL saved to `resumeUrl`.
- Profile completion percentage calculated client- or server-side (e.g., 8 key fields = 12.5% each) and shown to encourage completion.
- Students cannot apply to a listing until resume is uploaded (configurable — see 5.4).

**API Endpoints:**
```
GET   /api/students/me/profile
PUT   /api/students/me/profile        { ...editable fields }
POST  /api/students/me/resume         multipart/form-data (file) -> { resumeUrl }
GET   /api/students/:id/profile       (public/employer view — limited fields, only visible to employers of listings they applied to)
```

**Edge Cases:**
- Reject unsupported file types with 415.
- Only expose full profile to an employer if the student has applied to that employer's listing (privacy) — check via an `Application` lookup in the controller.

---

### 5.3 Employer Company Profile & Verification

**User Story:** As an employer, I want to set up my company profile and get verified so I can post listings.

**Functional Requirements:**
- Editable fields: companyName, companyLogoUrl, companyWebsite, industry, companySize, aboutCompany.
- On profile submission for the first time, status is PENDING. Admin reviews and sets APPROVED or REJECTED (with reason).
- Employer sees a banner showing verification status; REJECTED employers see the rejection reason and can resubmit.

**API Endpoints:**
```
GET   /api/employers/me/profile
PUT   /api/employers/me/profile
POST  /api/employers/me/logo           multipart/form-data
GET   /api/employers/me/verification-status
```

**Edge Cases:**
- Prevent listing creation if `verificationStatus !== "APPROVED"` → 403 with message "Complete verification to post listings."

---

### 5.4 Listing Creation & Management (Employer)

**User Story:** As an employer, I want to create, edit, and manage internship/job listings.

**Functional Requirements:**
- Required fields: title, type (INTERNSHIP/JOB), description, skillsRequired[], workMode, stipendOrSalaryMin/Max, openings, applicationDeadline.
- New listings default to `PENDING_REVIEW`. They become `ACTIVE` only after admin approval (see 5.6). This can be toggled off via a feature flag for MVP speed (`AUTO_APPROVE_LISTINGS=true` in `.env`) if the team wants to skip moderation initially.
- Employers can save a listing as `DRAFT` before submitting for review.
- Employers can close (`CLOSED`) a listing manually, or it auto-expires (`EXPIRED`) via a scheduled job (e.g., `node-cron`) when `applicationDeadline` passes.
- Employers can edit only their own listings; edits to an ACTIVE listing that change core fields (title, stipend, description) re-route it to PENDING_REVIEW (configurable).

**API Endpoints:**
```
POST   /api/listings                 { ...fields, status: DRAFT|PENDING_REVIEW }
GET    /api/listings/mine            -> employer's own listings (all statuses)
GET    /api/listings/:id             -> single listing detail (public if ACTIVE, else owner/admin only)
PUT    /api/listings/:id             -> edit (owner only)
DELETE /api/listings/:id             -> soft delete / CLOSED (owner only)
POST   /api/listings/:id/close       -> owner sets status to CLOSED
```

**Edge Cases:**
- Editing a listing with existing applications should not delete application history (applications reference the listing by foreign key with `ON DELETE RESTRICT` or `SET NULL` — avoid cascading deletes).
- Deadline in the past on creation → validation error.

---

### 5.5 Listing Discovery & Search (Student)

**User Story:** As a student, I want to search and filter listings so I can find relevant opportunities.

**Functional Requirements:**
- Public listing feed shows only `ACTIVE` listings, sorted by `createdAt desc` by default.
- Filters: type (internship/job), workMode, location, skills (multi-select), stipend range, duration.
- Full-text search on `title` and `description` using a Postgres `tsvector` GIN index in v1.
- Pagination: page-based (`page`, `limit`), default page size 20, using Sequelize `limit`/`offset`.
- "Save/bookmark listing" for later (`SavedListing` table).

**API Endpoints:**
```
GET /api/listings?search=&type=&workMode=&location=&skills=&minStipend=&maxStipend=&page=&limit=
GET /api/listings/:id                 -> public detail view
POST /api/listings/:id/save           -> bookmark
DELETE /api/listings/:id/save         -> remove bookmark
GET /api/students/me/saved-listings
```

**Edge Cases:**
- Empty search results → return empty array + suggest removing filters (frontend concern).
- Rate-limit search endpoint to prevent abuse (e.g., 60 req/min per IP, via `express-rate-limit`).

---

### 5.6 Application Flow

**User Story:** As a student, I want to apply to a listing with my resume and an optional cover letter, and track status. As an employer, I want to review, shortlist, and update applicant status.

**Functional Requirements:**
- Student applies: requires verified email + uploaded resume. One application per (student, listing) — enforced by the unique compound index on `Application`.
- On apply, snapshot the resume URL used (`resumeUrlSnapshot`) so later resume edits don't retroactively change what the employer saw.
- Status transitions (employer/admin only): APPLIED → SHORTLISTED → INTERVIEW → OFFERED / REJECTED. Student can WITHDRAW at any point before OFFERED.
- Each status change appends to the `statusHistory` JSONB column and triggers a notification + email to the student.
- Employer applicant dashboard: table of applicants per listing with filters by status, sortable by applied date.

**API Endpoints:**
```
POST   /api/applications                     { listingId, coverLetter? }
GET    /api/students/me/applications         -> student's own applications + status
POST   /api/applications/:id/withdraw         (student only, own application)

GET    /api/listings/:id/applications         (employer/admin) -> paginated applicant list
PATCH  /api/applications/:id/status           { status }  (employer of that listing, or admin)
GET    /api/applications/:id                  (owner student, listing's employer, or admin)
```

**Edge Cases:**
- Applying to a non-ACTIVE or expired listing → 400.
- Duplicate apply → 409 "You have already applied to this listing." (catch the `SequelizeUniqueConstraintError`.)
- Employer trying to update status on a listing they don't own → 403.

---

### 5.7 Admin: Listing & Employer Moderation

**User Story:** As an admin, I want to review pending employer accounts and listings before they go live.

**Functional Requirements:**
- Admin dashboard shows queues: Pending Employers, Pending Listings, Open Reports.
- Approve/reject employer → updates `verificationStatus`; rejection requires a reason, emailed to employer.
- Approve/reject listing → updates `status` to ACTIVE or REJECTED with reason.
- Admin can also directly edit or force-close any listing, and ban/unban any user.

**API Endpoints:**
```
GET   /api/admin/employers?status=PENDING
PATCH /api/admin/employers/:id/verify        { status: APPROVED|REJECTED, reason? }

GET   /api/admin/listings?status=PENDING_REVIEW
PATCH /api/admin/listings/:id/review          { status: ACTIVE|REJECTED, reason? }

GET   /api/admin/users?role=&isBanned=&search=
PATCH /api/admin/users/:id/ban                { isBanned: true|false }

GET   /api/admin/reports?status=OPEN
PATCH /api/admin/reports/:id                  { status: RESOLVED|DISMISSED, resolutionNote? }
```

**Edge Cases:**
- All `/api/admin/*` routes must run through an `isAdmin` middleware that verifies `role === "ADMIN"` from the decoded JWT / DB lookup — reject with 403 otherwise, do not just hide UI.

---

### 5.8 Admin: Analytics Dashboard

**User Story:** As an admin, I want a high-level view of platform health.

**Functional Requirements (v1 — keep simple, use SQL aggregate queries):**
- Total students, employers, active listings, applications this week/month.
- Applications-by-status breakdown (pie/bar) — `SELECT status, COUNT(*) FROM "Applications" GROUP BY status;`.
- New signups over time (line chart, last 30 days) — group by day using `DATE_TRUNC('day', "createdAt")`.
- Top 5 most-applied-to listings — group applications by `listingId`, order by count desc, limit 5, join with `Listings`.

**API Endpoints:**
```
GET /api/admin/analytics/summary
GET /api/admin/analytics/signups?range=30d
GET /api/admin/analytics/applications-by-status
GET /api/admin/analytics/top-listings
```

---

### 5.9 Notifications

**User Story:** As a user, I want to be notified in-app and via email about important events.

**Functional Requirements:**
- Trigger events: employer verified/rejected, listing approved/rejected, application status changed, report resolved.
- In-app: bell icon with unread count; `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`.
- Email: sent async (simple job queue like `bull`/`bullmq` with Redis, or fire-and-forget with retry if you want to skip Redis for MVP) using Nodemailer. Keep templates simple HTML strings or a lightweight templating lib like `handlebars`.

**API Endpoints:**
```
GET   /api/notifications?unreadOnly=
PATCH /api/notifications/:id/read
PATCH /api/notifications/read-all
```

---

### 5.10 Reporting / Trust & Safety

**User Story:** As a student or employer, I want to report a suspicious listing or user.

**Functional Requirements:**
- Report form: reason (dropdown: Spam, Scam/Fraud, Inappropriate content, Fake company, Other) + free-text details.
- Reports go to admin queue (5.7). No user-facing status change until admin acts.

**API Endpoints:**
```
POST /api/reports    { listingId?, reportedUserId?, reason, details? }
```

---

## 6. Non-Functional Requirements

- **Security:** bcrypt (salt rounds 12) for passwords; JWT signed with a strong secret from env vars (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`); input validation on every route with Joi/express-validator; rate limiting on auth & search endpoints (`express-rate-limit`); CORS locked to the known frontend origin (`cors` package with explicit `origin`); sanitize all user-generated text to prevent XSS/SQL injection (`helmet`, and rely on Sequelize's parameterized queries — never build raw SQL by string concatenation); file upload type/size validation via `multer` file filters.
- **Performance:** Paginate all list endpoints; add Postgres indexes on columns used in filters (`status`, `type`, `workMode`, foreign key columns); use Sequelize `raw: true` on read-heavy queries where full model instances aren't needed; cache the public listing feed briefly (e.g., 30s) if traffic grows.
- **Reliability:** Use Sequelize transactions (`sequelize.transaction()`) for multi-row writes that must be atomic (e.g., status change + notification create).
- **Accessibility:** Semantic HTML, keyboard navigability, sufficient color contrast on the frontend.
- **Responsiveness:** Mobile-first layouts for the student-facing browse/apply flows especially.
- **Observability:** Structured logging (`morgan` for HTTP logs + a logger like `winston`, include request id/user id/route); basic error tracking (Sentry) recommended.

---

## 7. Suggested Build Phases (for a 2-person team)

**Phase 1 — Foundations (Week 1)**
- Repo setup (`/client` + `/server`), Sequelize models/migrations/connection, auth (register/login/JWT/roles), base layout & routing per role.

**Phase 2 — Core Employer + Student flows (Week 2–3)**
- Employer profile + verification (admin-side stub), listing CRUD, public listing feed + filters/search, student profile + resume upload.

**Phase 3 — Applications (Week 3–4)**
- Apply flow, applicant dashboard for employers, status transitions, notifications (in-app first, email second).

**Phase 4 — Admin & Trust/Safety (Week 4–5)**
- Admin moderation queues (employers, listings), user ban, reports, analytics summary.

**Phase 5 — Polish (Week 5–6)**
- Responsive QA, empty/error states, rate limiting, email templates, deploy, seed demo data.

---

## 8. Seed Data Recommendation

Write a `server/src/seed.js` script (run with `node src/seed.js`) that creates:
- 1 admin user (`admin@internsync.dev`)
- 3 approved employers with 2–3 ACTIVE listings each
- 1 pending employer with 1 PENDING_REVIEW listing
- 10 students with varying profile completeness, some with applications in different statuses

This gives every dashboard (student/employer/admin) non-empty states to build against immediately.

---

## 9. Open Questions for the Team

1. Do we auto-approve listings for MVP speed, or enforce moderation from day one?
2. Do we need employer team seats (multiple recruiter logins per company) — out of scope for v1?
3. Resume: allow multiple resumes per student, or just one active resume?
4. Do we need in-app messaging between employer and shortlisted students, or is email enough for v1?

---

*End of PRD.*
