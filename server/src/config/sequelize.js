// sequelize-cli reads this file to know how to connect per environment.
// Run migrations with:  npx sequelize-cli db:migrate
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const {
  DB_URL,
  DB_USER,
  DB_PASSWORD,
  DB_HOST = "127.0.0.1",
  DB_PORT = "5432",
  DB_NAME,
  DB_NAME_TEST,
  DB_SSL = "false",
} = process.env;

const sslEnabled = DB_SSL === "true" || DB_SSL === "1";

// dialectOptions used by every environment that needs SSL.
// Mirrors the logic in src/config/db.js — must stay in sync.
const sslDialectOptions = sslEnabled
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : {};

// When DB_URL is present, the CLI accepts it via the `url` key.
// Individual credential keys (username, password, etc.) are still required
// by sequelize-cli as fallback parsing for some commands, so we attempt to
// parse them out of the URL. If DB_URL is absent they come from individual vars.
let parsedUrl = {};
if (DB_URL) {
  try {
    const u = new URL(DB_URL);
    parsedUrl = {
      username: u.username || DB_USER,
      password: u.password || DB_PASSWORD,
      database: u.pathname.replace(/^\//, "") || DB_NAME,
      host: u.hostname || DB_HOST,
      port: parseInt(u.port, 10) || parseInt(DB_PORT, 10),
    };
  } catch {
    // Malformed DB_URL — fall through to individual vars below.
  }
}

// Base config shared across all environments.
// When DB_URL is set, the `url` key takes precedence in the CLI.
const base = DB_URL
  ? { url: DB_URL, ...parsedUrl }
  : {
      username: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      host: DB_HOST,
      port: parseInt(DB_PORT, 10),
    };

module.exports = {
  development: {
    ...base,
    dialect: "postgres",
    dialectOptions: sslDialectOptions,
  },

  test: {
    // Override database name for test env; everything else from base.
    ...base,
    database: DB_NAME_TEST || `${DB_NAME}_test`,
    dialect: "postgres",
    dialectOptions: sslDialectOptions,
  },

  production: {
    ...base,
    dialect: "postgres",
    // Production always uses SSL dialectOptions regardless of DB_SSL,
    // as a safety net — cloud DBs require it.
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  },
};
