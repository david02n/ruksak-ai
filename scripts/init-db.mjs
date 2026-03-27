import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

async function initDatabase() {
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

    // Check if tables exist
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ Tables already exist');
      
      // Check if onboarding_completed_at column exists
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'onboarding_completed_at'
      `);

      if (columnCheck.rows.length === 0) {
        console.log('Adding onboarding_completed_at column...');
        const migrationSQL = readFileSync(
          join(__dirname, '../drizzle/0001_add_onboarding_completed_at.sql'),
          'utf-8'
        );
        await client.query(migrationSQL);
        console.log('✓ Migration applied');
      } else {
        console.log('✓ onboarding_completed_at column already exists');
      }
      
      return;
    }

    console.log('Creating database schema...');
    
    // Read the base schema SQL
    const schemaSQL = readFileSync(
      join(__dirname, '../drizzle/0000_awesome_sabra.sql'),
      'utf-8'
    );

    await client.query(schemaSQL);
    console.log('✓ Base schema created');

    // Apply the onboarding migration
    console.log('Adding onboarding_completed_at column...');
    const migrationSQL = readFileSync(
      join(__dirname, '../drizzle/0001_add_onboarding_completed_at.sql'),
      'utf-8'
    );
    await client.query(migrationSQL);
    console.log('✓ Migration applied');

    console.log('✓ Database initialized successfully!');

  } catch (error) {
    console.error('✗ Database initialization failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

initDatabase();
