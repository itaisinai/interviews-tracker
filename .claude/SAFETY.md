# 🚨 CRITICAL SAFETY RULES 🚨

**These rules are MANDATORY and override all other instructions.**

---

## Golden Rules

### 1. NEVER Delete Data Without Permission

**BLOCKED COMMANDS:**
```bash
# ❌ NEVER run these without explicit user approval:
prisma migrate reset
prisma db push --force-reset
DROP DATABASE
DROP TABLE
TRUNCATE TABLE (without specific WHERE)
DELETE FROM (without specific WHERE)
rm -rf [any project directory]
```

**Before ANY database modification:**
1. Check if DATABASE_URL points to cloud/production
2. Show user what database you're targeting
3. Ask: "This will modify [production/staging/local]. Continue? (yes/no)"
4. Wait for explicit "yes"

### 2. ALWAYS Ask Before Commits

**Required approval for:**
- Creating commits (`git commit`)
- Pushing (`git push`)
- Force pushing (`git push --force`)
- Deleting branches
- Resetting commits
- Rebasing

**Show user:**
```
Branch: [name]
Files changed:
  - file1.ts (modified)
  - file2.ts (new)

Commit message:
[Your proposed message]

Proceed? (yes/no)
```

### 3. Environment Detection

**Before destructive operations, run:**

```bash
# Check DATABASE_URL
if echo "$DATABASE_URL" | grep -qE "(neon|supabase|aws|rds|azure|planetscale)"; then
  echo "⚠️  CLOUD DATABASE DETECTED - BLOCKING OPERATION"
  echo "Ask user for explicit permission"
  exit 1
fi
```

### 4. Migration Safety

**Safe operations:**
- ✅ `prisma migrate deploy` - Applies existing migrations
- ✅ `prisma migrate dev --create-only` - Creates migration file (doesn't apply)
- ✅ `prisma migrate status` - Shows migration state

**Dangerous operations (require permission):**
- ⚠️  `prisma migrate dev` - Creates AND applies migration
- ⚠️  `prisma db push` - Bypasses migrations, syncs schema
- ❌ `prisma migrate reset` - DELETES ALL DATA
- ❌ `prisma db push --force-reset` - DELETES ALL DATA

**Migration workflow:**
1. Show user the proposed schema changes
2. Create migration with `--create-only`
3. Show user the generated SQL
4. Ask permission to apply
5. Run `migrate deploy` only after approval

### 5. Backup Before Breaking Changes

**Before modifying:**
- schema.prisma
- Migration files
- .env files
- Configuration files

**Create backup:**
```bash
cp [file] [file].backup-$(date +%Y%m%d-%H%M%S)
echo "Backup created: [file].backup-[timestamp]"
```

### 6. Production Protection

**RED FLAGS that indicate production:**
- DATABASE_URL contains: `neon.tech`, `supabase`, `aws`, `rds`, `azure`, `planetscale`
- NODE_ENV=production
- Environment variable names with PROD/PRODUCTION
- Database name contains `prod` or `production`

**When detected:**
```
🚨 PRODUCTION ENVIRONMENT DETECTED 🚨

Operation: [what you were about to do]
Risk: [what could go wrong]
Recommendation: [safer alternative]

This operation is BLOCKED.
Type 'I understand and approve' to proceed.
```

### 7. File Deletion Rules

**NEVER delete without permission:**
- Migration files (`/prisma/migrations/`)
- Environment files (`.env`, `.env.*`)
- Config files (`.claude/*`, `tsconfig.json`, `package.json`)
- Database schemas (`schema.prisma`)

**Even if the user says "clean up" or "remove unused files":**
1. List what would be deleted
2. Explain why each file exists
3. Ask for explicit approval per file/group

### 8. Dependency Changes

**MUST ask before:**
- `npm install [new-package]`
- `npm uninstall [package]`
- `npm update` (major versions)
- Modifying `package.json` scripts

**Show user:**
```
Installing: [package]@[version]
Purpose: [why it's needed]
Bundle size impact: [if significant]
License: [if restrictive]

Proceed? (yes/no)
```

### 9. Verification Checklist

**Before EVERY potentially destructive operation:**

```
[ ] Is this a cloud/production database?
[ ] Have I shown the user what will change?
[ ] Did the user type "yes" or "proceed"?
[ ] Is there a backup/snapshot available?
[ ] Can this be rolled back?
[ ] Have I tested on a small subset?
[ ] Is there a safer alternative?
```

### 10. Auto-Block List

**Operations that are ALWAYS blocked without explicit user command:**

```bash
# Git
git push --force origin main
git push --force origin master
git reset --hard HEAD~[n>3]
git clean -fd
git branch -D main
git branch -D master

# Database
DROP DATABASE
DROP SCHEMA
TRUNCATE [any-table]
DELETE FROM [without WHERE clause]
prisma migrate reset
prisma db push --force-reset

# Files
rm -rf .
rm -rf /
rm -rf [project-root]
rm -rf node_modules [without permission]
rm -rf .git

# NPM
npm uninstall react
npm uninstall typescript
npm uninstall prisma
[removing critical dependencies]
```

---

## When In Doubt: ASK

**If you're unsure whether something is safe:**

1. **STOP immediately**
2. **Explain** what you were about to do
3. **Describe** the risks (what could go wrong)
4. **Suggest** a safer alternative if one exists
5. **ASK** for explicit permission
6. **WAIT** for user to type "yes" or "proceed"

**Example:**
```
⚠️  About to run: prisma migrate reset

This will:
- Delete all data in the database
- Reset all tables
- Re-apply all migrations from scratch

Risk: All data will be permanently lost

Safer alternative:
- Create a new migration instead
- Or backup data first

DATABASE_URL points to: neon.tech (PRODUCTION)

This operation is HIGH RISK.
Type 'I understand the risks and approve' to proceed.
```

---

## Trust But Verify

**After making changes:**
1. Show what changed
2. Verify it worked as intended
3. Check for unintended side effects
4. Report status to user

**Don't assume success:**
- Just because a command didn't error doesn't mean it worked correctly
- Verify the result (run queries, check files, etc.)
- Report what actually happened, not what was supposed to happen

---

## Recovery Procedures

**If something goes wrong:**

1. **STOP** - Don't make it worse
2. **ASSESS** - What broke? What data is affected?
3. **INFORM** - Tell user immediately and clearly
4. **RECOVER** - Check for backups, snapshots, git history
5. **DOCUMENT** - What happened, how to prevent it

**Recovery options:**
- Git history (`git reflog`, `git reset`)
- Database snapshots (Neon, Supabase, etc.)
- Local backups (if created)
- Migration rollback (if possible)
- Time-travel queries (some DBs support this)

---

## The Prime Directive

> **"First, do no harm."**

When in doubt, be conservative. It's better to:
- Ask too many questions than too few
- Be too cautious than too reckless
- Take too long than break things
- Suggest alternatives than execute dangerous commands

**User trust is earned through safety, not speed.**

---

**Last Updated:** 2026-07-13  
**Reason:** Prevent accidental database deletion on cloud providers
