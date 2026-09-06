# InternSync

**InternSync** is a three-sided marketplace platform connecting:
- **Students** — who discover, apply to, and track internships/jobs.
- **Employers** — who post internships/jobs, manage applicants, and hire.
- **Admins** — who moderate content, manage users, and oversee platform health.

## 🚀 Tech Stack

- **Backend:** Node.js, Express.js (Plain JavaScript)
- **Database:** MongoDB (with Mongoose ODM)
- **Authentication:** JWT (Access + Refresh tokens), bcrypt
- **Validation:** Joi
- **Security:** Helmet, CORS, Express Mongo Sanitize, Rate Limiting (express-rate-limit)
- **File Storage (Planned):** Cloudinary / AWS S3 via Multer
- **Email (Planned):** Nodemailer / SMTP

## ✨ Features (Backend Progress)

- **Authentication System:** Secure registration and login flows with RBAC (Role-Based Access Control) for Students, Employers, and Admins. Includes email verification and password reset workflows.
- **Secure Sessions:** JWT tokens with HTTP-only cookies to handle secure refresh tokens natively.
- **Core Data Models:** Pre-configured Mongoose schemas for `User`, `StudentProfile`, `EmployerProfile`, `Listing`, `Application`, `Report`, `Notification`, and `SavedListing`.

## 📂 Project Structure

```text
/internsync
  ├── client/          # Frontend application (React - Planned)
  ├── server/          # Node/Express backend
  │   ├── src/
  │   │   ├── config/      # Database & external service configurations
  │   │   ├── controllers/ # Route handlers & business logic
  │   │   ├── middleware/  # Custom middlewares (e.g. Auth/RBAC)
  │   │   ├── models/      # Mongoose schemas
  │   │   ├── routes/      # Express route definitions
  │   │   ├── services/    # External integrations
  │   │   ├── app.js       # Express application configuration
  │   │   └── server.js    # Entry point & DB connection
  │   ├── .env.example
  │   └── package.json
  └── README.md
```

## 🛠️ Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (Local or Atlas URI)

### Installation

1. Navigate to the backend server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by creating a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```
   *Make sure to provide valid values for your `MONGODB_URI`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`.*

4. Start the development server:
   ```bash
   node src/server.js
   ```

## 📚 API Endpoints

### Auth (`/api/auth`)
- `POST /register`: Register a new Student or Employer account.
- `POST /verify-email`: Verify a user account using an emailed token.
- `POST /login`: Authenticate and receive an Access token (and an HTTP-only Refresh cookie).
- `POST /refresh`: Obtain a new Access token using a valid Refresh cookie.
- `POST /logout`: Terminate the session by clearing the Refresh cookie.
- `POST /forgot-password`: Request a password reset link.
- `POST /reset-password`: Reset the user's password using the provided token.
- `GET /me`: Fetch the currently authenticated user data alongside their specific profile data.

