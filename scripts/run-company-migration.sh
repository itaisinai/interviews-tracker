#!/bin/bash

# Company Entity Migration Orchestrator
# This script runs the complete migration process in the correct order

set -e  # Exit on error

echo "🚀 Starting Company Entity Migration"
echo "===================================="
echo ""

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
  echo "❌ Error: Must be run from project root"
  exit 1
fi

# Step 1: Backup warning
echo "⚠️  IMPORTANT: Make sure you have a database backup before proceeding!"
echo ""
read -p "Do you have a backup? (yes/no): " BACKUP_CONFIRM

if [ "$BACKUP_CONFIRM" != "yes" ]; then
  echo "❌ Migration cancelled. Please create a backup first."
  exit 1
fi

echo ""
echo "📝 Step 1: Running initial SQL migration..."
echo "   This creates the Company table and adds nullable companyId fields"
npx prisma migrate deploy

echo ""
echo "📊 Step 2: Running data migration script..."
echo "   This migrates data from opportunities to companies"
npx tsx scripts/migrate-to-company-entity.ts

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Data migration failed!"
  echo "   Database is in an intermediate state."
  echo "   You may need to restore from backup and fix the migration script."
  exit 1
fi

echo ""
echo "🧹 Step 3: Running cleanup migration..."
echo "   This makes companyId required and drops old fields"
npx prisma migrate deploy

echo ""
echo "🔄 Step 4: Generating Prisma client..."
npx prisma generate

echo ""
echo "✅ Step 5: Verifying migration..."
echo "   Checking that the schema matches the database"
npx prisma validate

echo ""
echo "✨ Migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Test the API endpoints"
echo "2. Update frontend code to use new Company structure"
echo "3. Deploy to staging for integration testing"
