const { Pool } = require("pg");
const env = require("./env");

const pool = env.databaseUrl
  ? new Pool({
      connectionString: env.databaseUrl,
    })
  : null;

module.exports = pool;
