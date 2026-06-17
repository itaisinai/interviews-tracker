#!/usr/bin/env node
/**
 * Migration helper script for add_owner_email_to_core_tables migration.
 *
 * This script runs the Prisma migration and sets the required PostgreSQL
 * session variable for backfilling existing data with the owner email.
 *
 * Usage:
 *   node scripts/migrate-with-owner-email.mjs
 *
 * The script reads ALLOWED_EMAIL from .env and uses it to backfill data.
 */

import { execSync } from 'child_process';
import 'dotenv/config';

const allowedEmail = process.env.ALLOWED_EMAIL?.trim();

if (!allowedEmail) {
  console.error('❌ Error: ALLOWED_EMAIL environment variable is not set');
  console.error('');
  console.error('This migration requires ALLOWED_EMAIL to backfill existing data.');
  console.error('Please set it in your .env file:');
  console.error('');
  console.error('  ALLOWED_EMAIL=itai.sinai@gmail.com');
  console.error('');
  process.exit(1);
}

console.log('🔧 Running migration with owner email backfill...');
console.log(`📧 Owner email: ${allowedEmail}`);
console.log('');

try {
  // Set the PostgreSQL session variable and run migration
  const command = `PGOPTIONS="-c app.allowed_email=${allowedEmail}" npx prisma migrate deploy`;

  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL
    }
  });

  console.log('');
  console.log('✅ Migration completed successfully!');
  console.log(`All existing data has been assigned to: ${allowedEmail}`);
} catch (error) {
  console.error('');
  console.error('❌ Migration failed');
  console.error('');
  console.error('If the migration partially completed, you may need to:');
  console.error('1. Check the database state');
  console.error('2. Manually rollback if needed');
  console.error('3. Fix the issue and re-run');
  process.exit(1);
}
