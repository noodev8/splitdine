/*
=======================================================================================================================================
Migration Runner
=======================================================================================================================================
Purpose: Run SQL migration files against the database
Usage: node run-migration.js migrations/003_add_users.sql
=======================================================================================================================================
*/

const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Please provide migration file path');
  console.log('Usage: node run-migration.js migrations/003_add_users.sql');
  process.exit(1);
}

const migrationPath = path.join(__dirname, migrationFile);

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, 'utf8');

pool.query(sql)
  .then(() => {
    console.log('✓ Migration completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  });
