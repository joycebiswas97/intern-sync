# InternSync API Integration Guide

This document outlines the backend API endpoints, authentication flows, and data structures to help you wire up the frontend client for InternSync. 

> [!IMPORTANT]
> **Base URL:** Ensure your API client points to the backend server (default: `http://localhost:5000`).
> **Credentials:** Make sure your `axios` or `fetch` client is configured with `withCredentials: true` to handle HTTP-only cookies for refresh tokens.

---

## 1. Authentication Flow
The app uses short-lived JWT access tokens (15m) and long-lived refresh tokens (7d, stored in an `httpOnly` cookie).

- **Register:** `POST /api/auth/register`
  - Body: `{ email, password, role: "STUDENT" | "EMPLOYER", fullName? (if student), companyName? (if employer) }`
- **Verify Email:** `POST /api/auth/verify-email`
  - Body: `{ token }`
- **Login:** `POST /api/auth/login`
  - Body: `{ email, password }`
  - Returns: `{ accessToken, user: { _id, email, role, isEmailVerified } }`
- **Refresh Token:** `POST /api/auth/refresh`
  - *No body required (uses cookie).* Returns a new `{ accessToken }`. Call this silently when an API request fails with `401`.
- **Logout:** `POST /api/auth/logout`
- **Forgot Password:** `POST /api/auth/forgot-password` (Body: `{ email }`)
- **Reset Password:** `POST /api/auth/reset-password` (Body: `{ token, newPassword }`)
- **Get Me (Current User):** `GET /api/auth/me`
  - Header: `Authorization: Bearer <accessToken>`
  - Returns: `{ user, profile }`

> [!TIP]
> Include `Authorization: Bearer <accessToken>` in the headers of **all** protected requests listed below.

---

## 2. Students
Endpoints for managing student profiles and tracking applications.

- **Get Own Profile:** `GET /api/students/me/profile`
- **Update Profile:** `PUT /api/students/me/profile`
  - Body: `{ fullName, headline, bio, phone, college, degree, graduationYear, skills: [], location, etc... }`
- **Upload Resume:** `POST /api/students/me/resume`
  - Body: `FormData` with a file field named `resume`
  - Returns: `{ resumeUrl }`
- **Get Public Profile:** `GET /api/students/:id/profile` (Limited fields unless employer reviewing applicant)
- **Get Saved Listings:** `GET /api/students/me/saved-listings`
- **Get My Applications:** `GET /api/students/me/applications`

---

## 3. Employers
Endpoints for company profiles and verification.

- **Get Own Profile:** `GET /api/employers/me/profile`
- **Update Profile:** `PUT /api/employers/me/profile`
  - Body: `{ companyName, companyWebsite, industry, companySize, aboutCompany }`
- **Upload Logo:** `POST /api/employers/me/logo`
  - Body: `FormData` with an image field named `logo`
- **Check Verification:** `GET /api/employers/me/verification-status`
  - Returns: `{ verificationStatus: "PENDING" | "APPROVED" | "REJECTED", rejectionReason }`

> [!WARNING]
> Employers cannot create `ACTIVE` listings if their `verificationStatus` is not `"APPROVED"`.

---

## 4. Listings (Jobs & Internships)
Endpoints for the core marketplace.

- **Create Listing (Employer):** `POST /api/listings`
  - Body: `{ title, type: "INTERNSHIP"|"JOB", description, skillsRequired: [], workMode: "REMOTE"|"ONSITE"|"HYBRID", stipendOrSalaryMin, stipendOrSalaryMax, openings, applicationDeadline }`
- **Get Own Listings (Employer):** `GET /api/listings/mine`
- **Search/Feed (Public):** `GET /api/listings?search=&type=&workMode=&location=&page=1&limit=20`
- **Get Listing Details:** `GET /api/listings/:id`
- **Get Listing Applications (Employer):** `GET /api/listings/:id/applications`
- **Update Listing:** `PUT /api/listings/:id`
- **Delete Listing:** `DELETE /api/listings/:id`
- **Close Listing Manually:** `PATCH /api/listings/:id/close`
- **Save/Bookmark Listing (Student):** `POST /api/listings/:id/save`
- **Remove Bookmark (Student):** `DELETE /api/listings/:id/save`

---

## 5. Applications
Endpoints for applying and managing statuses.

- **Apply (Student):** `POST /api/applications`
  - Body: `{ listingId, coverLetter? }`
- **Withdraw (Student):** `POST /api/applications/:id/withdraw`
- **Update Status (Employer):** `PATCH /api/applications/:id/status`
  - Body: `{ status: "SHORTLISTED" | "INTERVIEW" | "OFFERED" | "REJECTED" }`
- **Get Application Details:** `GET /api/applications/:id`

---

## 6. Admin & Moderation
*Note: These require `role === "ADMIN"`.*

- **Get Pending Employers:** `GET /api/admin/employers?status=PENDING`
- **Verify Employer:** `PATCH /api/admin/employers/:id/verify`
  - Body: `{ status: "APPROVED" | "REJECTED", rejectionReason? }`
- **Get Pending Listings:** `GET /api/admin/listings?status=PENDING_REVIEW`
- **Review Listing:** `PATCH /api/admin/listings/:id/review`
  - Body: `{ status: "ACTIVE" | "REJECTED", rejectionReason? }`
- **Manage Users:** `GET /api/admin/users`
- **Ban/Unban User:** `PATCH /api/admin/users/:id/ban`
- **Get Dashboard Analytics:** `GET /api/admin/analytics`

---

## 7. Notifications & Reporting

**Notifications (In-app Bell)**
- **Get My Notifications:** `GET /api/notifications`
- **Mark Single as Read:** `PATCH /api/notifications/:id/read`
- **Mark All as Read:** `PATCH /api/notifications/mark-all-read`

**Content Moderation / Reporting**
- **Submit Report:** `POST /api/reports`
  - Body: `{ listingId? (or reportedUserId?), reason, details? }`
