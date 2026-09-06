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
| Database | MongoDB | Document DB — flexible schema fits listings/profiles well |
| ODM | Mongoose | Schema validation, middleware hooks, population (joins) |
| Auth | JWT (access + refresh tokens), bcrypt for passwords | Role-based access control (RBAC) |
| Validation | Joi or express-validator | Validate request bodies at the route layer |
| File storage | Cloudinary / AWS S3 | Resumes, company logos, profile pictures |
| Email | Nodemailer + SMTP, or Resend/SendGrid | Verification, notifications |
| Search | MongoDB text indexes (v1) → Atlas Search/Meilisearch (v2) | Start simple |
| Hosting | Frontend: Vercel/Netlify; Backend: Render/Railway; DB: MongoDB Atlas | |
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
      /models             (Mongoose schemas)
      /routes
      /controllers
      /middleware          (auth, role-check, error handler, upload)
      /services            (email, file upload, notifications)
      /utils
      /config
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

## 4. Data Model (Mongoose Schemas)

```javascript
// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["STUDENT", "EMPLOYER", "ADMIN"], required: true },
    isEmailVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
```

```javascript
// models/StudentProfile.js
const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    fullName: { type: String, required: true },
    headline: String,
    bio: String,
    phone: String,
    college: String,
    degree: String,
    graduationYear: Number,
    skills: [String],
    resumeUrl: String,
    profilePicUrl: String,
    portfolioUrl: String,
    linkedinUrl: String,
    location: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentProfile", studentProfileSchema);
```

```javascript
// models/EmployerProfile.js
const mongoose = require("mongoose");

const employerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    companyName: { type: String, required: true },
    companyLogoUrl: String,
    companyWebsite: String,
    industry: String,
    companySize: String,
    aboutCompany: String,
    verificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    rejectionReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmployerProfile", employerProfileSchema);
```

```javascript
// models/Listing.js
const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    employer: { type: mongoose.Schema.Types.ObjectId, ref: "EmployerProfile", required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ["INTERNSHIP", "JOB"], required: true },
    description: { type: String, required: true },
    responsibilities: [String],
    skillsRequired: [String],
    workMode: { type: String, enum: ["REMOTE", "ONSITE", "HYBRID"], required: true },
    location: String,
    stipendOrSalaryMin: Number,
    stipendOrSalaryMax: Number,
    currency: { type: String, default: "INR" },
    durationMonths: Number,
    openings: { type: Number, default: 1 },
    applicationDeadline: Date,
    perks: [String],
    status: {
      type: String,
      enum: ["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "CLOSED", "EXPIRED"],
      default: "PENDING_REVIEW",
    },
    rejectionReason: String,
  },
  { timestamps: true }
);

// Text index for search; compound index for common filters
listingSchema.index({ title: "text", description: "text" });
listingSchema.index({ status: 1, type: 1, workMode: 1 });

module.exports = mongoose.model("Listing", listingSchema);
```

```javascript
// models/Application.js
const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    coverLetter: String,
    resumeUrlSnapshot: String, // resume used at time of application
    status: {
      type: String,
      enum: ["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFERED", "REJECTED", "WITHDRAWN"],
      default: "APPLIED",
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One application per student per listing
applicationSchema.index({ listing: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Application", applicationSchema);
```

```javascript
// models/Report.js
const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reason: { type: String, required: true },
    details: String,
    status: { type: String, enum: ["OPEN", "RESOLVED", "DISMISSED"], default: "OPEN" },
    resolutionNote: String,
    resolvedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
```

```javascript
// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true }, // e.g. APPLICATION_STATUS_CHANGED, LISTING_APPROVED
    title: { type: String, required: true },
    body: String,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
```

```javascript
// models/SavedListing.js  (bookmarks)
const mongoose = require("mongoose");

const savedListingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  },
  { timestamps: true }
);

savedListingSchema.index({ student: 1, listing: 1 }, { unique: true });

module.exports = mongoose.model("SavedListing", savedListingSchema);
```

---

## 5. Feature Specifications

Each feature below includes: **User Story**, **Functional Requirements**, **API Endpoints**, and **Edge Cases** — enough detail for an AI agent to implement end-to-end.

### 5.1 Authentication & Onboarding

**User Story:** As a user, I can register as a Student or Employer, verify my email, log in, and reset my password.

**Functional Requirements:**
- Registration requires: email, password (min 8 chars, 1 number, 1 special char), role selection (STUDENT or EMPLOYER only — ADMIN is never self-registered).
- On registration, send a verification email with a signed token (expires in 24h) — use `jsonwebtoken` or a random token stored on the user doc with an expiry field.
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
- Duplicate email → 409 Conflict (Mongoose will throw a duplicate key error on the unique index — catch and translate it).
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
- Editing a listing with existing applications should not delete application history (applications reference the listing by ObjectId, so this is safe by default — just don't cascade-delete).
- Deadline in the past on creation → validation error.

---

### 5.5 Listing Discovery & Search (Student)

**User Story:** As a student, I want to search and filter listings so I can find relevant opportunities.

**Functional Requirements:**
- Public listing feed shows only `ACTIVE` listings, sorted by `createdAt desc` by default.
- Filters: type (internship/job), workMode, location, skills (multi-select), stipend range, duration.
- Full-text search on `title` and `description` using MongoDB's `$text` index (defined in the schema above) in v1.
- Pagination: page-based (`page`, `limit`), default page size 20, using `.skip()`/`.limit()` in Mongoose.
- "Save/bookmark listing" for later (`SavedListing` collection).

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
- Each status change appends to `statusHistory` array and triggers a notification + email to the student.
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
- Duplicate apply → 409 "You have already applied to this listing." (catch the Mongoose duplicate-key error, code `11000`.)
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

**Functional Requirements (v1 — keep simple, use MongoDB aggregation pipelines):**
- Total students, employers, active listings, applications this week/month.
- Applications-by-status breakdown (pie/bar) — `Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])`.
- New signups over time (line chart, last 30 days) — group by day using `$dateToString` in an aggregation.
- Top 5 most-applied-to listings — group applications by `listing`, sort by count desc, limit 5, then populate listing details.

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

- **Security:** bcrypt (salt rounds 12) for passwords; JWT signed with a strong secret from env vars (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`); input validation on every route with Joi/express-validator; rate limiting on auth & search endpoints (`express-rate-limit`); CORS locked to the known frontend origin (`cors` package with explicit `origin`); sanitize all user-generated text to prevent XSS/NoSQL injection (`express-mongo-sanitize`, `helmet`); file upload type/size validation via `multer` file filters.
- **Performance:** Paginate all list endpoints; add MongoDB indexes on fields used in filters (`status`, `type`, `workMode`, foreign-key-style ObjectId fields); use `.lean()` on read-heavy Mongoose queries to skip hydration overhead; cache the public listing feed briefly (e.g., 30s) if traffic grows.
- **Reliability:** Use Mongoose sessions/transactions for multi-document writes that must be atomic (e.g., status change + notification create) — requires a MongoDB replica set (Atlas gives you this by default).
- **Accessibility:** Semantic HTML, keyboard navigability, sufficient color contrast on the frontend.
- **Responsiveness:** Mobile-first layouts for the student-facing browse/apply flows especially.
- **Observability:** Structured logging (`morgan` for HTTP logs + a logger like `winston`, include request id/user id/route); basic error tracking (Sentry) recommended.

---

## 7. Suggested Build Phases (for a 2-person team)

**Phase 1 — Foundations (Week 1)**
- Repo setup (`/client` + `/server`), Mongoose models/connection, auth (register/login/JWT/roles), base layout & routing per role.

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
