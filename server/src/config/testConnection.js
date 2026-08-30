"use strict";

/**
 * src/config/testConnection.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone script to verify the Sequelize ↔ Postgres connection.
 * Run it with:   npm run db:connect
 *
 * This script intentionally does NOT import src/models/index.js because
 * that would try to load every model file, which may fail if models have
 * dependencies not yet set up (e.g. a model referencing an association
 * that hasn't been written yet). We only want to prove the TCP connection
 * and credentials work — nothing more.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Load .env before anything else so process.env has DB_* values.
require("dotenv").config();

const sequelize = require("./db");

async function testConnection() {
  console.log("\n🔍  Testing database connection …");
  const { DB_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_SSL, NODE_ENV } = process.env;
  const sslEnabled = DB_SSL === "true" || DB_SSL === "1";

  if (DB_URL) {
    // Mask the password in the URL before printing (e.g. postgres://user:***@host/db)
    const masked = DB_URL.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
    console.log(`    Mode     : URL  (DB_URL)`);
    console.log(`    URL      : ${masked}`);
  } else {
    console.log(`    Mode     : Parts (DB_HOST / DB_NAME / DB_USER / DB_PASSWORD)`);
    console.log(`    Host     : ${DB_HOST || "localhost"}`);
    console.log(`    Port     : ${DB_PORT || 5432}`);
    console.log(`    Database : ${DB_NAME}`);
    console.log(`    User     : ${DB_USER}`);
  }
  console.log(`    SSL      : ${sslEnabled ? "✅ enabled" : "❌ disabled (plaintext)"}`);
  console.log(`    Env      : ${NODE_ENV || "development"}\n`);

  try {
    /**
     * sequelize.authenticate()
     *   Runs a trivial query ("SELECT 1+1 AS result") against the DB.
     *   If the query succeeds, the TCP connection, credentials, and
     *   SSL config are all correct. It resolves with undefined on success
     *   and rejects with an Error on failure.
     *
     *   Common failure reasons:
     *   - ECONNREFUSED  → Postgres isn't running / wrong host or port
     *   - 28P01         → Wrong password (pg error code for auth failure)
     *   - 3D000         → Database doesn't exist yet (run createdb first)
     *   - DEPTH_ZERO_SELF_SIGNED_CERT → SSL cert rejected; set
     *     rejectUnauthorized: false in dialectOptions (already done for prod)
     */
    await sequelize.authenticate();

    console.log("✅  Connection established successfully.");
    console.log("    Sequelize can reach Postgres and credentials are valid.\n");

    // Optional: print the Postgres server version to confirm the dialect version.
    const [results] = await sequelize.query("SELECT version();");
    console.log(`    Server   : ${results[0].version}\n`);
  } catch (err) {
    console.error("❌  Unable to connect to the database.\n");

    // Translate the most common pg error codes into plain English.
    const dbName = process.env.DB_URL
      ? new URL(process.env.DB_URL).pathname.replace("/", "")
      : process.env.DB_NAME;

    const hint = {
      ECONNREFUSED:
        "Postgres is not running or the host/port is wrong. Check DB_HOST / DB_PORT (or DB_URL) in .env.",
      "28P01":
        "Authentication failed — wrong password. Check DB_PASSWORD (or the password in DB_URL).",
      "3D000":
        `Database "${dbName}" does not exist. Run: createdb ${dbName}`,
      "28000":
        "Role does not exist — check DB_USER (or the username in DB_URL).",
      DEPTH_ZERO_SELF_SIGNED_CERT:
        "SSL certificate rejected. Set DB_SSL=true and ensure rejectUnauthorized: false in dialectOptions.",
    }[err.parent?.code || err.code] || null;

    console.error(`    Error    : ${err.message}`);
    if (hint) console.error(`    💡 Hint  : ${hint}`);
    console.error();

    process.exit(1); // non-zero exit so CI pipelines catch the failure
  } finally {
    // Always close the pool so the script terminates cleanly.
    // Without this, Node keeps the event loop alive waiting for open sockets.
    await sequelize.close();
  }
}

testConnection();
