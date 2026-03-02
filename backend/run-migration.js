// One-time migration script - run with: node run-migration.js
require('dotenv').config();
const { query } = require('./src/config/database');

async function migrate() {
  console.log('Running migration: add geo columns...');

  try {
    // Check if column already exists
    const check = await query(`
      SELECT COUNT(*) as cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'rescue_requests' AND COLUMN_NAME = 'geo_province_name'
    `);

    if (check.recordset[0].cnt > 0) {
      console.log('Columns already exist, skipping.');
      process.exit(0);
    }

    await query(`ALTER TABLE rescue_requests ADD geo_province_name NVARCHAR(255) NULL`);
    console.log('Added geo_province_name');

    await query(`ALTER TABLE rescue_requests ADD geo_district_name NVARCHAR(255) NULL`);
    console.log('Added geo_district_name');

    // Also add citizen_name, citizen_phone if missing (older installs might not have them)
    const checkCitizen = await query(`
      SELECT COUNT(*) as cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'rescue_requests' AND COLUMN_NAME = 'citizen_name'
    `);
    if (checkCitizen.recordset[0].cnt === 0) {
      await query(`ALTER TABLE rescue_requests ADD citizen_name NVARCHAR(255) NULL`);
      await query(`ALTER TABLE rescue_requests ADD citizen_phone NVARCHAR(50) NULL`);
      console.log('Added citizen_name, citizen_phone');
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
