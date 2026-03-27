import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

async function applyMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read migration file
    const migrationSQL = readFileSync(
      join(__dirname, '../drizzle/0001_add_onboarding_completed_at.sql'),
      'utf-8'
    );

    console.log('Applying migration...');
    await client.query(migrationSQL);
    console.log('Migration applied successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
