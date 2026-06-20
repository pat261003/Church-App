import { readFileSync } from 'fs';
import { join } from 'path';
import pool from './index';

async function migrate() {
  const sql = readFileSync(
    join(__dirname, '../../../database/migration.sql'),
    'utf8'
  );
  try {
    await pool.query(sql);
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
