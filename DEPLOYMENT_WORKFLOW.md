# Deployment Workflow

## Overview

FlightHub uses a three-tier deployment strategy with separate environments:

```
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  Local Development  │     │   Staging (Test)     │     │  Production (Live)   │
├─────────────────────┤     ├──────────────────────┤     ├──────────────────────┤
│ Local Supabase      │     │ Cloud Supabase       │     │ Cloud Supabase       │
│ (Docker)            │     │ (Staging DB)         │     │ (Production DB)      │
│                     │     │                      │     │                      │
│ localhost:3000      │     │ Vercel Staging       │     │ Vercel Production    │
│ (Next.js dev)       │     │ (Next.js production) │     │ (Next.js production) │
└─────────────────────┘     └──────────────────────┘     └──────────────────────┘
         ↑                            ↑                             ↑
         │                            │                             │
    You work here              Push to main                Manual trigger
    (isolated testing)       (auto-deploy)                (requires "deploy")
```

## Environments

### 1. Local Development

**Purpose:** Isolated environment for developing and testing features

**Setup:**
```bash
# One-time setup
./setup-local-supabase.sh

# Daily workflow
npm run supabase:start    # Start local Supabase
npm run dev               # Start Next.js dev server
```

**Features:**
- Fresh, clean database every time you reset
- All migrations applied from `supabase/migrations/`
- No risk of breaking staging or production data
- Email testing via Inbucket (http://127.0.0.1:54324)
- Database UI via Studio (http://127.0.0.1:54323)

### 2. Staging Environment

**Purpose:** Pre-production testing environment that mirrors production

**Deployment:** Automatic on push to `main` branch

**When it deploys:**
```bash
git push origin main    # ← Automatically deploys to staging
```

**What happens:**
1. GitHub Actions triggers
2. Migrations applied to staging Supabase
3. Deployed to Vercel staging environment
4. Posts deployment summary to GitHub

**Use cases:**
- Test features in production-like environment
- Validate migrations before production
- QA testing and user acceptance testing
- Share preview with stakeholders

### 3. Production Environment

**Purpose:** Live application used by real users

**Deployment:** Manual trigger only (requires confirmation)

**How to deploy:**
1. Go to GitHub Actions tab
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Type `deploy` in the confirmation field
5. Click "Run workflow" button

**Safety features:**
- Requires typing "deploy" to confirm
- Runs tests before deploying (fails if tests fail)
- Runs linter before deploying (fails if lint errors)
- Applies migrations before code deployment
- Only deploys if all checks pass

## Complete Development Cycle

### 1. Start Feature

```bash
# Create feature branch
git checkout -b feature/new-dashboard

# Start local Supabase
npm run supabase:start

# Start dev server
npm run dev
```

### 2. Database Changes (If Needed)

```bash
# Create migration
supabase migration new add_dashboard_widgets

# Edit: supabase/migrations/YYYYMMDDHHMMSS_add_dashboard_widgets.sql
# Add your SQL

# Test migration locally
npm run supabase:reset    # Applies all migrations fresh
npm run dev               # Test your app
```

### 3. Develop Feature

```bash
# Make code changes
# Test locally at http://localhost:3000
# Check email flows at http://127.0.0.1:54324
# Inspect database at http://127.0.0.1:54323
```

### 4. Test Thoroughly

```bash
# Reset database multiple times to ensure migrations work
npm run supabase:reset
# Test app flows

npm run supabase:reset
# Test app flows again

# Run tests
npm run test

# Run linter
npm run lint
```

### 5. Deploy to Staging

```bash
# Commit your changes
git add .
git commit -m "feat: add new dashboard feature"

# Push to main (triggers staging deployment)
git push origin main

# GitHub Actions will automatically:
# 1. Apply migrations to staging Supabase
# 2. Deploy to Vercel staging
# 3. Post deployment summary

# Monitor deployment at:
# https://github.com/[user]/flight-hub/actions
```

### 6. Test on Staging

```bash
# Visit staging URL (from GitHub Actions summary)
# Test all features thoroughly
# Verify migrations worked correctly
# Get stakeholder approval if needed
```

### 7. Deploy to Production

**Only after staging is verified and tested!**

1. Go to GitHub → Actions tab
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Type `deploy` in confirmation
5. Click "Run workflow"

GitHub Actions will:
1. Run all tests (fails if any test fails)
2. Run linter (fails if lint errors)
3. Apply migrations to production Supabase
4. Deploy to Vercel production
5. Post deployment summary

## Workflow Diagrams

### Development to Staging
```
┌────────────┐
│ Edit Code  │
└─────┬──────┘
      │
      ▼
┌────────────────┐
│ Test Locally   │ ← Local Supabase (Docker)
│ localhost:3000 │ ← Next.js dev server
└────────┬───────┘
         │
         ▼
┌─────────────────┐
│ git push origin │
│      main       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  GitHub Actions         │
│  (Deploy to Staging)    │
├─────────────────────────┤
│ 1. Checkout code        │
│ 2. Install deps         │
│ 3. Run migrations    ───┼──→ Staging Supabase
│ 4. Deploy to Vercel  ───┼──→ Vercel Staging
└─────────────────────────┘
```

### Staging to Production
```
┌─────────────────────────┐
│  Test on Staging        │
│  Verify everything works│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Manual Trigger         │
│  (Type "deploy")        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  GitHub Actions         │
│  (Deploy to Production) │
├─────────────────────────┤
│ 1. Run tests         ✓  │
│ 2. Run linter        ✓  │
│ 3. Run migrations    ───┼──→ Production Supabase
│ 4. Deploy to Vercel  ───┼──→ Vercel Production
└─────────────────────────┘
```

## Migration Best Practices

### ✅ Safe Migrations

```sql
-- Add column with default
ALTER TABLE users
ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;

-- Add column as nullable first
ALTER TABLE planes
ADD COLUMN maintenance_notes TEXT;

-- Create index concurrently (doesn't lock table)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

### ❌ Dangerous Migrations

```sql
-- Dropping column (loses data)
ALTER TABLE users DROP COLUMN old_field;  -- ⚠️ Data loss!

-- Renaming column (breaks old code)
ALTER TABLE users RENAME COLUMN name TO full_name;  -- ⚠️ Deploy must be atomic

-- Adding NOT NULL without default (fails if data exists)
ALTER TABLE users ADD COLUMN required_field TEXT NOT NULL;  -- ⚠️ Fails!
```

### Safe Pattern for Breaking Changes

```sql
-- Migration 1: Add new column
ALTER TABLE users ADD COLUMN full_name TEXT;
UPDATE users SET full_name = name || ' ' || surname;

-- Deploy code that writes to both name and full_name
-- (Backward compatible)

-- Migration 2 (later): Make required
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

-- Deploy code that only uses full_name

-- Migration 3 (later): Drop old columns
ALTER TABLE users DROP COLUMN name;
ALTER TABLE users DROP COLUMN surname;
```

## Environment Variables

### Local (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-key>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### Staging (Vercel Staging Project)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<staging-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-key>
DATABASE_URL=<staging-database-url>
```

### Production (Vercel Production Project)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<production-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-key>
DATABASE_URL=<production-database-url>
```

**Important:** Environment variables are configured in Vercel dashboard, NOT in GitHub.

## GitHub Secrets Required

### For Staging Deployment
- `SUPABASE_ACCESS_TOKEN_STAGING` - Supabase access token for staging
- `SUPABASE_DB_PASSWORD_STAGING` - Staging database password
- `SUPABASE_PROJECT_ID_STAGING` - Staging project ID
- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID_STAGING` - Vercel staging project ID

### For Production Deployment
- `SUPABASE_ACCESS_TOKEN_PRODUCTION` - Supabase access token for production
- `SUPABASE_DB_PASSWORD_PRODUCTION` - Production database password
- `SUPABASE_PROJECT_ID_PRODUCTION` - Production project ID
- `VERCEL_TOKEN` - Vercel API token (same as staging)
- `VERCEL_ORG_ID` - Vercel organization ID (same as staging)
- `VERCEL_PROJECT_ID_PRODUCTION` - Vercel production project ID

## Monitoring

### GitHub Actions
- View runs: `https://github.com/[user]/flight-hub/actions`
- See migration logs, deployment status, errors
- Check deployment summaries

### Vercel
- View deployments: Vercel dashboard
- See build logs, runtime logs
- Monitor both staging and production projects

### Supabase
- View migrations: Supabase dashboard → Database → Migrations
- See applied migrations, timestamps
- Monitor separately for staging and production

## Rollback Strategy

### If Staging Deployment Fails

GitHub Actions will cancel deployment if migration fails.

```bash
# Fix the migration locally
npm run supabase:reset  # Test the fix

# Commit fix
git add supabase/migrations/
git commit -m "fix: correct migration syntax"
git push origin main    # Re-trigger staging deployment
```

### If Staging Works But Has Bugs

```bash
# Option 1: Quick fix forward
git add .
git commit -m "fix: correct bug"
git push origin main    # Deploy fix to staging

# Option 2: Revert commit
git revert HEAD
git push origin main    # Revert staging to previous version
```

### If Production Deployment Fails

1. GitHub Actions will stop if tests fail
2. GitHub Actions will stop if migrations fail
3. Fix the issue and manually trigger deployment again

### If Production Has Bugs After Deployment

```bash
# Option 1: Quick hotfix
git add .
git commit -m "hotfix: critical bug"
git push origin main              # Deploy to staging first
# Test on staging
# Then manually deploy to production

# Option 2: Rollback migration (if database issue)
supabase migration new rollback_broken_feature
# Edit migration to undo changes
git push origin main              # Deploy to staging
# Test on staging
# Then manually deploy to production
```

## Tips & Best Practices

### 1. Always Test Migrations Locally First
```bash
npm run supabase:reset  # Multiple times!
npm run dev             # Verify app works
```

### 2. Use Staging as Production Mirror
- Test every feature on staging before production
- Verify migrations work correctly
- Check for any environment-specific issues

### 3. Use Transactions in Migrations
```sql
BEGIN;
-- Your migration
COMMIT;
```

### 4. Make Migrations Reversible When Possible
```sql
-- Instead of DROP
-- Use: ALTER TABLE ... SET COLUMN ... DROP NOT NULL
-- Or: Comment out with -- for now
```

### 5. Monitor Deployments
- Watch GitHub Actions for staging deploys
- Test staging thoroughly before production
- Check Vercel logs after production deployment
- Test production immediately after deployment

### 6. Keep Environments Separate
- Never use production credentials locally
- `.env.local` = local only
- Staging and production secrets in GitHub
- Environment variables in Vercel dashboard

### 7. Production Deployment Checklist
- [ ] Feature tested locally
- [ ] Tests passing (`npm run test`)
- [ ] Linting passing (`npm run lint`)
- [ ] Deployed to staging
- [ ] Tested on staging environment
- [ ] Stakeholder approval (if needed)
- [ ] Ready for production deployment

## Common Scenarios

### Adding a New Feature
1. Develop locally → Test
2. Push to `main` → Auto-deploy to staging
3. Test on staging
4. Manual deploy to production

### Hotfix Critical Bug
1. Fix locally → Test
2. Push to `main` → Auto-deploy to staging
3. Quick test on staging
4. Immediate manual deploy to production

### Database Schema Change
1. Create migration locally → Test with reset
2. Push to `main` → Staging gets migration
3. Thoroughly test staging
4. Deploy to production (migration runs first)

### Rollback Production
1. Identify issue
2. Create rollback migration or code fix
3. Test locally
4. Push to `main` → Staging
5. Test on staging
6. Deploy to production

## Summary

| Environment | Database | Purpose | Deployment | Migration |
|------------|----------|---------|------------|-----------|
| **Local** | Docker Supabase | Development & Testing | Manual (`npm run supabase:start`) | Auto (on reset) |
| **Staging** | Cloud Supabase (Staging) | Pre-production Testing | Automatic (push to `main`) | Auto (GitHub Actions) |
| **Production** | Cloud Supabase (Production) | Live Application | Manual (requires "deploy") | Auto (GitHub Actions) |

## Deployment Flow

**Development → Staging → Production**

1. **Develop** locally with isolated database
2. **Test** migrations with `supabase:reset`
3. **Push** to `main` branch
4. **Staging** deploys automatically
5. **Test** on staging environment
6. **Production** deploy manually after staging verification
7. **Monitor** deployment in GitHub Actions tab

**Key Principle:** Never skip staging. Always test on staging before deploying to production.
