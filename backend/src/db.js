/**
 * db.js — pool de conexiones a PostgreSQL.
 * Importar { pool } en cada route y usar pool.query(sql, params).
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en el pool:', err.message);
});

module.exports = { pool };
