const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'flood_rescue_db',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: { max: 20, min: 5, idleTimeoutMillis: 30000 }
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(dbConfig);
    console.log('✅ SQL Server connected:', process.env.DB_NAME);
  }
  return pool;
}

async function query(queryStr, inputs = {}) {
  const p = await getPool();
  const req = p.request();
  Object.entries(inputs).forEach(([key, value]) => {
    if (value === null || value === undefined) req.input(key, sql.NVarChar, null);
    else if (typeof value === 'number') {
      Number.isInteger(value) ? req.input(key, sql.Int, value) : req.input(key, sql.Float, value);
    }
    else if (typeof value === 'boolean') req.input(key, sql.Bit, value);
    else if (value instanceof Date) req.input(key, sql.DateTime2, value);
    else req.input(key, sql.NVarChar(sql.MAX), String(value));
  });
  return req.query(queryStr);
}

module.exports = { sql, getPool, query, dbConfig };
