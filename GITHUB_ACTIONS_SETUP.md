# GitHub Actions Setup Guide

This guide explains how to set up automated deployments with database migrations using GitHub Actions.

## Overview

Two workflows are configured:

1. **Production Deployment** (`.github/workflows/deploy-production.yml`)
   - Triggers on push to `main` branch
   - Applies database migrations to production Supabase
   - Deploys to Vercel production

2. **Preview Deployment** (`.github/workflows/deploy-preview.yml`)
   - Triggers on pull requests to `main`
   - Runs tests and linter
   - Deploys preview to Vercel (no migration changes)

## Required GitHub Secrets

You need to add these secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

### 1. Supabase Secrets

#### `SUPABASE_ACCESS_TOKEN`
- **What:** Supabase API access token for CLI
- **Where to get:**
  1. Go to https://app.supabase.com/account/tokens
  2. Click "Generate new token"
  3. Give it a name (e.g., "GitHub Actions")
  4. Copy the token

#### `SUPABASE_DB_PASSWORD`
- **What:** Your production database password
- **Value:** `byBbi6-hojgys-xywqeg`
- **Where:** From your Supabase project settings

#### `SUPABASE_PROJECT_ID`
- **What:** Your Supabase project reference
- **Value:** `pememmvfgvsukpqxxwbm`
- **Where:** From your Supabase project URL or settings

### 2. Vercel Secrets

#### `VERCEL_TOKEN`
- **What:** Vercel API token for deployments
- **Where to get:**
  1. Go to https://vercel.com/account/tokens
  2. Click "Create Token"
  3. Give it a name (e.g., "GitHub Actions")
  4. Select scope: Full Account or specific team
  5. Copy the token

#### `VERCEL_ORG_ID`
- **What:** Your Vercel organization/team ID
- **Where to get:**
  ```bash
  # Install Vercel CLI if you haven't
  npm i -g vercel

  # Login
  vercel login

  # Link project (from project directory)
  vercel link

  # This creates .vercel/project.json with orgId and projectId
  cat .vercel/project.json
  ```

  Or manually:
  1. Go to your Vercel project settings
  2. URL format: `https://vercel.com/[org-id]/[project-name]`
  3. The `[org-id]` part is your ORG_ID

#### `VERCEL_PROJECT_ID`
- **What:** Your specific Vercel project ID
- **Where to get:** Same as above - from `.vercel/project.json` or project settings URL

## Step-by-Step Setup

### 1. Create Supabase Access Token

```bash
# Go to Supabase dashboard
open https://app.supabase.com/account/tokens

# Create token and copy it
```

### 2. Get Vercel Credentials

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link your project
cd /path/to/flight-hub
vercel link

# Get IDs
cat .vercel/project.json
```

Output will look like:
```json
{
  "orgId": "team_abc123...",
  "projectId": "prj_xyz789..."
}
```

### 3. Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:

```
Name: SUPABASE_ACCESS_TOKEN
Value: sbp_xxxxxxxxxxxxx...

Name: SUPABASE_DB_PASSWORD
Value: byBbi6-hojgys-xywqeg

Name: SUPABASE_PROJECT_ID
Value: pememmvfgvsukpqxxwbm

Name: VERCEL_TOKEN
Value: xxxxxxxxxxxxx...

Name: VERCEL_ORG_ID
Value: team_xxxxxxxxxxxxx

Name: VERCEL_PROJECT_ID
Value: prj_xxxxxxxxxxxxx
```

### 4. Test the Workflow

```bash
# Make a small change
echo "# Test deployment" >> README.md

# Commit and push to main
git add .
git commit -m "test: trigger deployment workflow"
git push origin main

# Watch the workflow
# Go to: https://github.com/[username]/[repo]/actions
```

## Workflow Behavior

### On Push to Main

1. **Checkout code** from main branch
2. **Install dependencies** (`npm ci`)
3. **Run database migrations** on production Supabase
   - Links to production project
   - Runs `supabase db push`
   - Applies all new migrations from `supabase/migrations/`
4. **Deploy to Vercel** production
   - Builds Next.js app
   - Deploys to production domain
5. **Post summary** to GitHub Actions

### On Pull Request

1. **Checkout code** from PR branch
2. **Install dependencies**
3. **Run linter** (optional, doesn't fail build)
4. **Run tests** (optional, doesn't fail build)
5. **Deploy preview to Vercel**
   - Creates unique preview URL
   - Comments URL on PR
   - Uses production Supabase (read-only)

## Migration Safety

### Migrations are Applied BEFORE Deployment

The workflow ensures:
1. Migrations run first
2. If migrations fail, deployment is cancelled
3. If deployment fails, migrations are already applied (can't rollback)

### Best Practices

✅ **DO:**
- Test migrations locally first (`npm run supabase:reset`)
- Create reversible migrations when possible
- Use transactions in migrations
- Review migration diffs before pushing

❌ **DON'T:**
- Push breaking migrations without coordination
- Edit migration files after they're merged
- Skip local testing

### Rollback Strategy

If a migration breaks production:

```sql
-- Create a rollback migration
-- File: supabase/migrations/YYYYMMDDHHMMSS_rollback_feature.sql

-- Example: Rollback added column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;

-- Commit and push to trigger deployment
git add .
git commit -m "fix: rollback broken migration"
git push origin main
```

## Manual Deployment Trigger

You can manually trigger production deployment:

1. Go to **Actions** tab
2. Select **Deploy to Production**
3. Click **Run workflow**
4. Select branch (usually `main`)
5. Click **Run workflow**

## Monitoring Deployments

### GitHub Actions

View workflow runs:
- Go to: `https://github.com/[user]/flight-hub/actions`
- Click on a workflow run to see logs
- Each step shows output (migrations, deployment, etc.)

### Vercel Dashboard

View deployments:
- Go to: `https://vercel.com/[org]/flight-hub/deployments`
- See build logs, runtime logs, etc.

### Supabase Logs

View database changes:
- Go to: `https://supabase.com/dashboard/project/pememmvfgvsukpqxxwbm`
- Database → Migrations to see applied migrations

## Environment Variables

### GitHub Actions Already Has

These are set in the workflow files, no secrets needed:
- `NODE_ENV=production` (Vercel handles this)
- Build commands from `package.json`

### Vercel Dashboard Already Has

These should already be configured in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`

**Verify in Vercel:**
- Project Settings → Environment Variables
- Should have production values for cloud Supabase

## Troubleshooting

### "supabase: command not found"

The workflow installs Supabase CLI automatically. If it fails:
- Check `.github/workflows/deploy-production.yml`
- Ensure `supabase/setup-cli@v1` action is present

### "Failed to link project"

Check these secrets are correct:
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ACCESS_TOKEN`

### "Migration failed"

1. Check workflow logs for specific error
2. Test migration locally: `npm run supabase:reset`
3. Fix migration file
4. Push fix to trigger re-deployment

### "Vercel deployment failed"

Check these secrets:
- `VERCEL_TOKEN` (not expired)
- `VERCEL_ORG_ID` (correct format: `team_...`)
- `VERCEL_PROJECT_ID` (correct format: `prj_...`)

### Preview deployment has no database

Preview deployments use production Supabase (read-only operations only). This is intentional to avoid needing a separate staging database.

If you need a staging environment:
1. Create a separate Supabase project
2. Add staging secrets to GitHub
3. Create separate workflow for staging branch

## Advanced: Staging Environment (Optional)

If you want a staging environment:

1. **Create staging Supabase project**
2. **Add staging secrets** to GitHub:
   - `SUPABASE_PROJECT_ID_STAGING`
   - `SUPABASE_DB_PASSWORD_STAGING`
3. **Create staging workflow** (`.github/workflows/deploy-staging.yml`)
4. **Configure Vercel** staging environment
5. **Add staging branch** to git (e.g., `develop`)

## Summary

### Local Development
```bash
npm run supabase:start  # Local Supabase
npm run dev             # Local Next.js
```

### Production Deployment
```bash
git push origin main    # Triggers GitHub Actions
# → Applies migrations to production Supabase
# → Deploys to Vercel production
```

### Preview Deployment
```bash
# Create pull request
# → Triggers preview deployment
# → Creates unique preview URL
# → No migration changes
```

## Next Steps

1. ✅ Add all required secrets to GitHub
2. ✅ Verify Vercel environment variables
3. ✅ Test workflow with a small change
4. ✅ Monitor first deployment in Actions tab
5. ✅ Set up Slack/Discord notifications (optional)

---

**Need help?** Check the workflow logs in GitHub Actions for detailed error messages.
