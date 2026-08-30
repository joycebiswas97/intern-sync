"use strict";

/**
 * src/config/db.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates and exports a single shared Sequelize instance for the whole app.
 *
 * CONNECTION PRIORITY
 *   1. DB_URL (a full Postgres connection string) — preferred when present.
 *      Most cloud hosts (Heroku, Railway, Render, Supabase, Neon) inject a
 *      single DATABASE_URL-style variable. We read it as DB_URL so the name
 *      is explicit and doesn't clash with framework-injected DATABASE_URL.
 *   2. Individual DB_* variables (DB_HOST, DB_PORT, DB_NAME, DB_USER,
 *      DB_PASSWORD) — used when DB_URL is absent (typical for local dev).
 *
 * SSL is controlled independently via DB_SSL=true and applies to both paths.
 *
 * Why a single instance?
 *   Sequelize manages a connection pool internally. Creating multiple instances
 *   would spin up multiple pools and waste Postgres connections — a scarce
 *   resource on hosted databases (Supabase free tier = 60 connections).
 *
 * Import this file wherever you need raw Sequelize access (transactions,
 * raw queries). For model-level access, use src/models/index.js instead,
 * which exports db.sequelize (this same instance) alongside all models.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Sequelize } = require("sequelize");

// ─── Read connection details from environment ─────────────────────────────────
const {
  // ── Option A: single connection string (preferred) ───────────────────────
  // Full Postgres URL in the format:
  //   postgres://USER:PASSWORD@HOST:PORT/DATABASE
  //   postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
  // When set, DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD are ignored.
  // Cloud providers typically call this DATABASE_URL; we use DB_URL so it
  // can coexist without being overwritten by the provider's injected var.
  DB_URL,

  // ── Option B: individual variables (fallback) ────────────────────────────
  DB_NAME,     // Postgres database name,  e.g. "internsync_dev"
  DB_USER,     // Postgres role/user,       e.g. "postgres"
  DB_PASSWORD, // Password for that role
  DB_HOST = "localhost", // Hostname or IP of the Postgres server
  DB_PORT = "5432",      // Postgres default port

  // ── SSL — applies to BOTH options above ──────────────────────────────────
  DB_SSL = "false",      // Set to "true" in .env to enable TLS (cloud DBs)
  NODE_ENV = "development",
} = process.env;

// ─── dialectOptions: TLS/SSL ──────────────────────────────────────────────────
//
// WHY DB_SSL instead of NODE_ENV === "production"?
// ─────────────────────────────────────────────────
// Tying SSL to NODE_ENV creates hidden assumptions:
//   • A staging server can run NODE_ENV=production but use a local DB → SSL
//     would be forced on when it shouldn't be.
//   • A developer can point their local app at a cloud DB for testing → SSL
//     is required but NODE_ENV=development so it would be skipped.
//
// Using an explicit DB_SSL=true flag makes the intent visible in .env and
// decouples transport-layer security from application environment.
// Set DB_SSL=true in any .env (local, staging, production) where the
// Postgres server requires TLS.
//
// HOW IT WORKS
// ─────────────
// dialectOptions is an object passed straight through to the underlying
// node-postgres (pg) driver. Sequelize does not interpret its contents —
// it just forwards it verbatim when opening each connection in the pool.
// That means every key/value here is a `pg` Client config option, not a
// Sequelize option. See: https://node-postgres.com/apis/client

const sslEnabled = DB_SSL === "true" || DB_SSL === "1";

const dialectOptions = sslEnabled
  ? {
      ssl: {
        /**
         * require: true
         *   Tells node-postgres to upgrade the TCP connection to TLS
         *   before sending any credentials or data.
         *   All managed cloud Postgres providers (Supabase, Neon, Railway,
         *   Render, AWS RDS with ssl=require) reject plaintext connections
         *   at the network level — without this you get:
         *     "SSL SYSCALL error: EOF detected"
         *   or a silent connection reset.
         */
        require: true,

        /**
         * rejectUnauthorized: false
         *   Controls whether node-postgres validates the server's TLS
         *   certificate against a trusted Certificate Authority (CA).
         *
         *   false (our default for cloud DBs):
         *     Skips CA validation. The connection is still encrypted —
         *     data in transit is protected — but we don't verify the
         *     server is who it claims to be (MITM is theoretically
         *     possible on a compromised network).
         *     Necessary for Supabase, Neon, and Railway because they use
         *     internal CAs that Node's built-in cert store doesn't trust.
         *
         *   true (maximum security, e.g. AWS RDS in regulated environments):
         *     Node verifies the cert chain. You must also supply the CA
         *     bundle via the `ca` property below, otherwise the connection
         *     throws "DEPTH_ZERO_SELF_SIGNED_CERT".
         *     Uncomment and configure if your infra requires it:
         *
         *     rejectUnauthorized: true,
         *     ca: require("fs").readFileSync(
         *       require("path").resolve(__dirname, "../../certs/rds-ca.pem")
         *     ).toString(),
         */
        rejectUnauthorized: false,
      },
    }
  : {}; // DB_SSL != "true" → no ssl key at all; pg connects in plaintext

// ─── Shared Sequelize options (same regardless of connection style) ───────────
// Extracted once so both branches below receive identical config.
const sharedOptions = {
  /**
   * dialect
   *   Tells Sequelize which SQL flavour to generate and which underlying
   *   driver to use. "postgres" → uses the `pg` package.
   */
  dialect: "postgres",

  /**
   * dialectOptions
   *   Passed verbatim to the node-postgres driver for every connection
   *   opened in the pool. We use it exclusively for TLS config (see above).
   */
  dialectOptions,

  /**
   * logging / benchmark — see comments below in the instance block.
   */
  logging:
    NODE_ENV === "development"
      ? (sql, timing) =>
          console.log(`\x1b[2m[SQL] ${sql}${timing ? ` (${timing}ms)` : ""}\x1b[0m`)
      : false,
  benchmark: NODE_ENV === "development",

  pool: { max: 10, min: 0, acquire: 30_000, idle: 10_000 },

  define: { timestamps: true, underscored: false, freezeTableName: false },
};

// ─── Sequelize instance ───────────────────────────────────────────────────────
//
// Sequelize supports two constructor signatures:
//
//   new Sequelize(url, options)          ← URL style  (DB_URL present)
//   new Sequelize(db, user, pass, opts)  ← parts style (DB_URL absent)
//
// We pick the right one at runtime based on whether DB_URL is set.
// Both receive the same sharedOptions so SSL, pooling, logging, and model
// defaults are identical regardless of which path is taken.

const sequelize = DB_URL
  ? (() => {
      /**
       * URL constructor: new Sequelize(connectionString, options)
       *
       * Sequelize parses the URL into host/port/user/password/database
       * internally — no need to pass them separately. Any query-string
       * parameters in the URL (e.g. ?schema=public) are also respected.
       *
       * NOTE: If your URL already contains ?sslmode=require, Sequelize
       * passes that to pg, but our explicit dialectOptions.ssl takes
       * precedence as the options object wins over the URL query string.
       * Set DB_SSL=true alongside DB_URL for cloud connections.
       */
      return new Sequelize(DB_URL, {
        ...sharedOptions,
        // host/port/database are parsed from the URL — do not re-specify them.
      });
    })()
  : (() => {
      /**
       * Parts constructor: new Sequelize(database, username, password, options)
       *
       * Used for local development where individual DB_* vars are set.
       * host and port are passed inside options (see sharedOptions extension).
       */
      return new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
        ...sharedOptions,
        // ── Connection ─────────────────────────────────────────────────────

        /**
         * host
         *   The hostname where Postgres is running.
         *   Locally: "localhost" or "127.0.0.1"
         *   Docker Compose: the service name, e.g. "db"
         */
        host: DB_HOST,

        /**
         * port
         *   Postgres default is 5432. Change only if you configured a
         *   non-standard port.
         */
        port: parseInt(DB_PORT, 10),
      });
    })();

// Keep a reference so testConnection.js can log which mode is active.
sequelize._connectionMode = DB_URL ? "url" : "parts";

module.exports = sequelize;
