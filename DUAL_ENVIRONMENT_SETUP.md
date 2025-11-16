# Dual Environment Setup Guide

FlightHub uses a three-tier environment setup for safe development and deployment:

```
┌──────────────────────────────────────────────────────────┐
│                    LOCAL DEVELOPMENT                     │
├──────────────────────────────────────────────────────────┤
│  Docker Supabase (isolated)                              │
│  Next.js Dev Server                                      │
│  → For daily development and testing                     │
└──────────────────────────────────────────────────────────┘
                          ↓
                 git push origin main
                          ↓
┌──────────────────────────────────────────────────────────┐
│               STAGING (Automatic Deployment)              │
├──────────────────────────────────────────────────────────┤
│  Cloud Supabase (staging project)                        │
│  Vercel (staging project)                                │
│  → Auto-deploys on every push to main                    │
│  → For team testing and preview                          │
└──────────────────────────────────────────────────────────┘
                          ↓
              Manual deployment trigger
                          ↓
┌──────────────────────────────────────────────────────────┐
│              PRODUCTION (Manual Deployment)               │
├──────────────────────────────────────────────────────────┤
│  Cloud Supabase (production project)                     │
│  Vercel (production project)                             │
│  → Manual deployment only (requires confirmation)        │
│  → Live application for real users                       │
└──────────────────────────────────────────────────────────┘
```

## Overview

| Environment | Database | Deployment | Trigger | Purpose |
|------------|----------|------------|---------|---------|
| **Local** | Docker Supabase | Manual (`npm run supabase:start`) | Developer | Development & Testing |
| **Staging** | Cloud Supabase (staging) | Automatic (GitHub Actions) | Push to `main` | Team Testing & Preview |
| **Production** | Cloud Supabase (production) | Manual (GitHub Actions) | Manual trigger | Live Application |

## Prerequisites

Before starting, you need:
- 2 Supabase projects (staging + production)
- 2 Vercel projects (staging + production)
- GitHub repository with Actions enabled

## Step 1: Create Staging Supabase Project

```bash
# 1. Go to https://supabase.com/dashboard
# 2. Click "New Project"
# 3. Fill in details:
#    - Name: flight-hub-staging
#    - Database Password: (generate strong password)
#    - Region: (same as production for consistency)
# 4. Wait for project to be ready
# 5. Note down:
#    - Project Reference (e.g., abc123xyz)
#    - Database Password
#    - API URL
#    - Anon Key
#    - Service Role Key
```

## Step 2: Create Production Supabase Project

```bash
# You likely already have this:
# Project Reference: pememmvfgvsukpqxxwbm
# Keep existing credentials

# If you need a new production project:
# 1. Go to https://supabase.com/dashboard
# 2. Click "New Project"
# 3. Fill in details:
#    - Name: flight-hub-production
#    - Database Password: (generate strong password)
#    - Region: (same as staging)
# 4. Wait for project to be ready
# 5. Note down all credentials
```

## Step 3: Create Staging Vercel Project

```bash
# Option 1: Via Vercel Dashboard
# 1. Go to https://vercel.com
# 2. Click "Add New..." → "Project"
# 3. Import your GitHub repository
# 4. Configure:
#    - Project Name: flight-hub-staging
#    - Framework Preset: Next.js
#    - Root Directory: ./
#    - Build Command: (auto-detected)
#    - Environment Variables: (add staging Supabase credentials)
# 5. Click "Deploy"

# Option 2: Via Vercel CLI
vercel --name flight-hub-staging

# After creation, add environment variables:
# Vercel Dashboard → Project Settings → Environment Variables
```

### Staging Environment Variables (Vercel)

Add these in Vercel dashboard for **staging project**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[staging-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-role-key]
DATABASE_URL=postgresql://postgres:[password]@db.[staging-ref].supabase.co:5432/postgres
NEXT_PUBLIC_APP_URL=https://flight-hub-staging.vercel.app
NEXT_PUBLIC_APP_NAME=FlightHub (Staging)
```

## Step 4: Create/Configure Production Vercel Project

```bash
# You likely already have this
# If not, follow same steps as staging but use:
# - Project Name: flight-hub-production
# - Production Supabase credentials
```

### Production Environment Variables (Vercel)

Add these in Vercel dashboard for **production project**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://pememmvfgvsukpqxxwbm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[production-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[production-service-role-key]
DATABASE_URL=[production-database-url]
NEXT_PUBLIC_APP_URL=https://flight-hub.vercel.app
NEXT_PUBLIC_APP_NAME=FlightHub
```

## Step 5: Get Vercel Project IDs

```bash
# For staging project
cd /path/to/flight-hub
vercel link
# Select: flight-hub-staging
# Note the orgId and projectId from .vercel/project.json

# For production project
vercel link
# Select: flight-hub-production
# Note the orgId and projectId from .vercel/project.json

# View the IDs
cat .vercel/project.json
```

## Step 6: Get Supabase Access Tokens

```bash
# You need one access token (works for both projects)
# 1. Go to https://app.supabase.com/account/tokens
# 2. Click "Generate new token"
# 3. Name: "GitHub Actions"
# 4. Copy the token

# Optionally create separate tokens for staging/production:
# - GitHub Actions (Staging)
# - GitHub Actions (Production)
```

## Step 7: Add GitHub Secrets

Go to: `https://github.com/[username]/flight-hub/settings/secrets/actions`

Click "New repository secret" for each:

### Staging Secrets

- `SUPABASE_ACCESS_TOKEN_STAGING` = (access token for staging)
- `SUPABASE_DB_PASSWORD_STAGING` = (staging database password)
- `SUPABASE_PROJECT_ID_STAGING` = (staging project reference)
- `VERCEL_PROJECT_ID_STAGING` = (staging vercel project ID)

### Production Secrets

- `SUPABASE_ACCESS_TOKEN_PRODUCTION` = (access token for production)
- `SUPABASE_DB_PASSWORD_PRODUCTION` = (production database password)
- `SUPABASE_PROJECT_ID_PRODUCTION` = (production project reference)
- `VERCEL_PROJECT_ID_PRODUCTION` = (production vercel project ID)

### Shared Secrets

- `VERCEL_TOKEN` = (Vercel API token - works for both projects)
- `VERCEL_ORG_ID` = (Vercel organization ID - same for both)

## Step 8: Initialize Staging Database

```bash
# Link to staging project locally
supabase link --project-ref [staging-project-ref]

# Push all migrations to staging
supabase db push

# Verify in Supabase Dashboard → Database → Migrations
```

## Step 9: Initialize Production Database (If New)

```bash
# Link to production project
supabase link --project-ref pememmvfgvsukpqxxwbm

# Push all migrations to production
supabase db push

# Verify in Supabase Dashboard → Database → Migrations
```

## Workflow Behavior

### Local Development

```bash
npm run supabase:start  # Start local Supabase
npm run dev             # Start Next.js dev server
```

- Completely isolated
- Clean database you can reset anytime
- No impact on staging or production

### Staging Deployment (Automatic)

**Trigger:** Push to `main` branch

```bash
git add .
git commit -m "feat: new feature"
git push origin main

# GitHub Actions automatically:
# 1. Runs database migrations on staging Supabase
# 2. Deploys to staging Vercel
# 3. Posts deployment summary
```

**What happens:**
- Workflow: `.github/workflows/deploy-staging.yml`
- Database: Staging Supabase gets new migrations
- Deployment: Staging Vercel gets new code
- Team can test at: `https://flight-hub-staging.vercel.app`

### Production Deployment (Manual)

**Trigger:** Manual workflow dispatch

```bash
# 1. Go to GitHub → Actions tab
# 2. Select "Deploy to Production"
# 3. Click "Run workflow"
# 4. Type "deploy" in confirmation field
# 5. Click "Run workflow"

# GitHub Actions will:
# 1. Run tests (fails if tests fail)
# 2. Run linter (fails if linting fails)
# 3. Run database migrations on production Supabase
# 4. Deploy to production Vercel
# 5. Post deployment summary
```

**Safety features:**
- Requires typing "deploy" to confirm
- Runs tests before deployment
- Runs linter before deployment
- Shows who triggered deployment in summary

## Complete Deployment Flow

### 1. Develop Locally

```bash
# Start local environment
npm run supabase:start
npm run dev

# Make changes, test locally
# Reset database to test migrations
npm run supabase:reset
```

### 2. Deploy to Staging

```bash
# Commit and push to main
git add .
git commit -m "feat: add new dashboard widget"
git push origin main

# Wait for staging deployment
# Check GitHub Actions for status
# Test at: https://flight-hub-staging.vercel.app
```

### 3. Team Testing

- Share staging URL with team
- Test all features
- Verify migrations worked
- Check for bugs

### 4. Deploy to Production

```bash
# If staging looks good:
# 1. Go to GitHub Actions
# 2. Select "Deploy to Production"
# 3. Click "Run workflow"
# 4. Type "deploy"
# 5. Click "Run workflow"

# Wait for production deployment
# Verify at: https://flight-hub.vercel.app
```

## GitHub Secrets Summary

You need **10 secrets total**:

### Staging (4 secrets)
```
SUPABASE_ACCESS_TOKEN_STAGING
SUPABASE_DB_PASSWORD_STAGING
SUPABASE_PROJECT_ID_STAGING
VERCEL_PROJECT_ID_STAGING
```

### Production (4 secrets)
```
SUPABASE_ACCESS_TOKEN_PRODUCTION
SUPABASE_DB_PASSWORD_PRODUCTION
SUPABASE_PROJECT_ID_PRODUCTION
VERCEL_PROJECT_ID_PRODUCTION
```

### Shared (2 secrets)
```
VERCEL_TOKEN
VERCEL_ORG_ID
```

## Monitoring Deployments

### Staging Deployments
- **GitHub Actions:** `https://github.com/[user]/flight-hub/actions/workflows/deploy-staging.yml`
- **Vercel Dashboard:** Staging project deployments
- **Supabase Dashboard:** Staging project migrations

### Production Deployments
- **GitHub Actions:** `https://github.com/[user]/flight-hub/actions/workflows/deploy-production.yml`
- **Vercel Dashboard:** Production project deployments
- **Supabase Dashboard:** Production project migrations

## Troubleshooting

### Staging deployment fails

```bash
# Check GitHub Actions logs
# Common issues:
# - Wrong Supabase credentials
# - Migration syntax error
# - Vercel project ID wrong

# Fix and push again
git add .
git commit -m "fix: correct migration"
git push origin main
```

### Production deployment blocked

```bash
# Make sure you typed "deploy" exactly
# Check tests are passing locally:
npm run test
npm run lint

# If tests fail in production but pass locally:
# - Check environment differences
# - Verify production Supabase has correct data
```

### Migration fails in staging/production

```bash
# Test migration locally first
npm run supabase:reset

# If local works but staging/production fails:
# - Check for data conflicts
# - Review migration for DROP statements
# - Consider creating rollback migration
```

## Best Practices

1. **Always test in staging first**
   - Never skip staging and go straight to production
   - Let team test staging for at least a day

2. **Review staging before production**
   - Check Supabase dashboard for migration status
   - Review Vercel logs for errors
   - Test all critical features

3. **Coordinate production deployments**
   - Announce in team chat before deploying
   - Deploy during low-traffic hours
   - Have rollback plan ready

4. **Keep environments in sync**
   - All migrations should go through all environments
   - Same Next.js version across all environments
   - Same dependencies versions

5. **Monitor after deployment**
   - Watch error logs for 10-15 minutes after production deploy
   - Check Supabase dashboard for query performance
   - Verify critical features work

## Rollback Strategy

### If staging has issues

```bash
# Just push a fix
git add .
git commit -m "fix: correct issue"
git push origin main
# Staging will auto-deploy
```

### If production has issues

**Option 1: Quick fix forward**
```bash
# Fix the issue
git add .
git commit -m "fix: critical bug"
git push origin main

# Deploy to staging first to verify
# Then manually deploy to production
```

**Option 2: Revert deployment**
```bash
# Find working commit
git log

# Revert to working commit
git revert [bad-commit-sha]
git push origin main

# Deploy to staging, then production
```

**Option 3: Database rollback migration**
```bash
# Create rollback migration
supabase migration new rollback_broken_feature

# Edit migration to undo changes
# Test locally
npm run supabase:reset

# Push to trigger staging deployment
git add .
git commit -m "fix: rollback broken migration"
git push origin main

# Then deploy to production after testing
```

## Summary

✅ **Local:** Isolated testing, no risk
✅ **Staging:** Automatic deployment on push, team testing
✅ **Production:** Manual deployment, requires confirmation, safe

**Workflow:**
1. Develop locally
2. Push to main → Staging auto-deploys
3. Team tests staging
4. Manually deploy to production when ready

See **[.github/DUAL_ENVIRONMENT_CHECKLIST.md](./.github/DUAL_ENVIRONMENT_CHECKLIST.md)** for step-by-step setup checklist.
