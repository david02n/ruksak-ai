import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

async function applyMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected to database');

    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'onboarding_completed_at'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ Column onboarding_completed_at already exists, skipping migration');
      return;
    }

    // Read migration file
    const migrationSQL = readFileSync(
      join(__dirname, '../drizzle/0001_add_onboarding_completed_at.sql'),
      'utf-8'
    );

    console.log('Applying migration: Add onboarding_completed_at column...');
    await client.query(migrationSQL);
    console.log('✓ Migration applied successfully!');

    // Verify the column was added
    const verifyResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'onboarding_completed_at'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✓ Verified: Column exists in database');
    } else {
      throw new Error('Column was not created');
    }

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

applyMigration();
