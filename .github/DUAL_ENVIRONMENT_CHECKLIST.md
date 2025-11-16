# Dual Environment Setup Checklist

Complete this checklist to set up staging and production environments.

## Part 1: Create Supabase Projects

### Staging Supabase Project

- [ ] Go to https://supabase.com/dashboard
- [ ] Click "New Project"
- [ ] Enter project details:
  - [ ] Name: `flight-hub-staging`
  - [ ] Database Password: Generate and save securely
  - [ ] Region: Choose same as production
- [ ] Wait for project initialization (2-3 minutes)
- [ ] Save the following from project settings:
  - [ ] Project Reference (Settings → General)
  - [ ] Database Password (what you entered)
  - [ ] API URL (Settings → API)
  - [ ] Anon Key (Settings → API)
  - [ ] Service Role Key (Settings → API)

### Production Supabase Project

Creating new production project:
- [ ] Go to https://supabase.com/dashboard
- [ ] Click "New Project"
- [ ] Enter project details:
  - [ ] Name: `flight-hub-production`
  - [ ] Database Password: Generate and save securely
  - [ ] Region: Choose same as staging
- [ ] Wait for project initialization
- [ ] Save all credentials (same as staging list above)

## Part 2: Create Vercel Projects

### Staging Vercel Project

- [ ] Go to https://vercel.com/new
- [ ] Import your GitHub repository
- [ ] Configure project:
  - [ ] Project Name: `flight-hub-staging`
  - [ ] Framework Preset: Next.js (auto-detected)
  - [ ] Root Directory: `./`
  - [ ] Build Command: Auto-detected
  - [ ] Output Directory: Auto-detected
- [ ] Click "Deploy" (first deployment will happen)
- [ ] Go to Project Settings → Environment Variables
- [ ] Add variables for **Production** (Vercel's production environment):
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://[staging-ref].supabase.co`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (staging anon key)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` = (staging service role key)
  - [ ] `DATABASE_URL` = `postgresql://postgres:[pass]@db.[staging-ref].supabase.co:5432/postgres`
  - [ ] `NEXT_PUBLIC_APP_URL` = `https://flight-hub-staging.vercel.app`
  - [ ] `NEXT_PUBLIC_APP_NAME` = `FlightHub (Staging)`
- [ ] Redeploy to apply environment variables

### Production Vercel Project

If you already have a production Vercel project:
- [ ] Verify environment variables are set
- [ ] Note down Project URL

If creating new production project:
- [ ] Go to https://vercel.com/new
- [ ] Import your GitHub repository again
- [ ] Configure project:
  - [ ] Project Name: `flight-hub-production`
  - [ ] Framework Preset: Next.js
  - [ ] Root Directory: `./`
- [ ] Click "Deploy"
- [ ] Add environment variables (production Supabase credentials)
- [ ] Redeploy

## Part 3: Get Vercel Credentials

### Get Project IDs

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login
vercel login

# Link to staging project
cd /path/to/flight-hub
vercel link
# Select: flight-hub-staging
```

- [ ] Open `.vercel/project.json`
- [ ] Copy `orgId` (starts with `team_`)
- [ ] Copy `projectId` (starts with `prj_`)
- [ ] Save as staging project ID

```bash
# Link to production project
vercel link
# Select: flight-hub-production
```

- [ ] Open `.vercel/project.json`
- [ ] Copy `projectId`
- [ ] Save as production project ID
- [ ] Org ID should be the same

### Get Vercel Token

- [ ] Go to https://vercel.com/account/tokens
- [ ] Click "Create Token"
- [ ] Name: `GitHub Actions`
- [ ] Scope: Full Account or specific team
- [ ] Expiration: No expiration (or long period)
- [ ] Copy token immediately (can't view again)

## Part 4: Get Supabase Access Tokens

### Option 1: Single Token (Recommended)

- [ ] Go to https://app.supabase.com/account/tokens
- [ ] Click "Generate new token"
- [ ] Name: `GitHub Actions`
- [ ] Copy token

### Option 2: Separate Tokens

For staging:
- [ ] Go to https://app.supabase.com/account/tokens
- [ ] Click "Generate new token"
- [ ] Name: `GitHub Actions (Staging)`
- [ ] Copy token

For production:
- [ ] Generate another token
- [ ] Name: `GitHub Actions (Production)`
- [ ] Copy token

## Part 5: Add GitHub Secrets

Go to: `https://github.com/[username]/flight-hub/settings/secrets/actions`

### Staging Secrets

- [ ] Click "New repository secret"
- [ ] Name: `SUPABASE_ACCESS_TOKEN_STAGING`
- [ ] Value: (Supabase access token)

- [ ] Create another secret
- [ ] Name: `SUPABASE_DB_PASSWORD_STAGING`
- [ ] Value: (staging database password)

- [ ] Create another secret
- [ ] Name: `SUPABASE_PROJECT_ID_STAGING`
- [ ] Value: (staging project reference)

- [ ] Create another secret
- [ ] Name: `VERCEL_PROJECT_ID_STAGING`
- [ ] Value: (staging Vercel project ID, starts with `prj_`)

### Production Secrets

- [ ] Create secret
- [ ] Name: `SUPABASE_ACCESS_TOKEN_PRODUCTION`
- [ ] Value: (Supabase access token for production)

- [ ] Create secret
- [ ] Name: `SUPABASE_DB_PASSWORD_PRODUCTION`
- [ ] Value: (production database password)

- [ ] Create secret
- [ ] Name: `SUPABASE_PROJECT_ID_PRODUCTION`
- [ ] Value: (production project reference, e.g., `pememmvfgvsukpqxxwbm`)

- [ ] Create secret
- [ ] Name: `VERCEL_PROJECT_ID_PRODUCTION`
- [ ] Value: (production Vercel project ID, starts with `prj_`)

### Shared Secrets

- [ ] Create secret
- [ ] Name: `VERCEL_TOKEN`
- [ ] Value: (Vercel API token from Part 3)

- [ ] Create secret
- [ ] Name: `VERCEL_ORG_ID`
- [ ] Value: (Vercel org ID from Part 3, starts with `team_`)

## Part 6: Initialize Databases

### Staging Database

```bash
# Link to staging project
supabase link --project-ref [staging-project-ref]
# Enter staging database password when prompted

# Push all migrations
supabase db push

# Verify migrations applied
```

- [ ] Migrations pushed successfully
- [ ] Verify in Supabase Dashboard → Database → Migrations

### Production Database

```bash
# Link to production project
supabase link --project-ref pememmvfgvsukpqxxwbm
# Enter production database password when prompted

# Push all migrations
supabase db push

# Verify migrations applied
```

- [ ] Migrations pushed successfully
- [ ] Verify in Supabase Dashboard → Database → Migrations

## Part 7: Test Staging Deployment

```bash
# Make a small test change
echo "# Test staging deployment" >> README.md

# Commit and push
git add README.md
git commit -m "test: staging deployment"
git push origin main
```

- [ ] Go to GitHub → Actions tab
- [ ] Watch "Deploy to Staging" workflow
- [ ] Verify all steps pass:
  - [ ] Checkout code
  - [ ] Install dependencies
  - [ ] Run database migrations
  - [ ] Deploy to Vercel Staging
  - [ ] Deployment Summary posted
- [ ] Check Vercel staging dashboard for deployment
- [ ] Visit staging URL: `https://flight-hub-staging.vercel.app`
- [ ] Verify app loads correctly

## Part 8: Test Production Deployment

- [ ] Go to GitHub → Actions tab
- [ ] Click "Actions" → "Deploy to Production"
- [ ] Click "Run workflow"
- [ ] Select branch: `main`
- [ ] In confirmation field, type: `deploy`
- [ ] Click "Run workflow"
- [ ] Watch workflow run
- [ ] Verify all steps pass:
  - [ ] Tests pass
  - [ ] Linting passes
  - [ ] Migrations applied
  - [ ] Deployed to Vercel Production
- [ ] Visit production URL: `https://flight-hub.vercel.app`
- [ ] Verify app loads correctly

## Part 9: Cleanup Test

```bash
# Revert test commit
git revert HEAD
git push origin main

# This will trigger staging deployment again
# Watch it succeed, then manually deploy to production if desired
```

- [ ] Staging auto-deployed after revert
- [ ] Optionally deployed to production

## Secrets Summary Checklist

Verify all 10 secrets are added to GitHub:

### Staging (4)
- [ ] `SUPABASE_ACCESS_TOKEN_STAGING`
- [ ] `SUPABASE_DB_PASSWORD_STAGING`
- [ ] `SUPABASE_PROJECT_ID_STAGING`
- [ ] `VERCEL_PROJECT_ID_STAGING`

### Production (4)
- [ ] `SUPABASE_ACCESS_TOKEN_PRODUCTION`
- [ ] `SUPABASE_DB_PASSWORD_PRODUCTION`
- [ ] `SUPABASE_PROJECT_ID_PRODUCTION`
- [ ] `VERCEL_PROJECT_ID_PRODUCTION`

### Shared (2)
- [ ] `VERCEL_TOKEN`
- [ ] `VERCEL_ORG_ID`

## Final Verification

- [ ] Local development works (`npm run supabase:start && npm run dev`)
- [ ] Pushing to `main` triggers staging deployment
- [ ] Staging deployment succeeds
- [ ] Staging app is accessible
- [ ] Manual production deployment works
- [ ] Production app is accessible
- [ ] All team members can access staging URL
- [ ] All workflows show in GitHub Actions

## Troubleshooting

If any step fails:

### Staging deployment fails
1. Check GitHub Actions logs for error
2. Verify staging Supabase credentials in GitHub secrets
3. Check staging Vercel project has correct environment variables
4. Retry push to main

### Production deployment fails
1. Ensure you typed "deploy" exactly
2. Check production Supabase credentials in GitHub secrets
3. Verify production Vercel project environment variables
4. Check tests pass locally: `npm run test`

### Migration fails
1. Test migration locally: `npm run supabase:reset`
2. Fix migration syntax
3. Push fix to main (triggers staging)
4. Manually trigger production after staging succeeds

## Next Steps

- [ ] Read [DUAL_ENVIRONMENT_SETUP.md](../DUAL_ENVIRONMENT_SETUP.md) for complete documentation
- [ ] Share staging URL with team
- [ ] Set up monitoring/alerting (optional)
- [ ] Document your deployment process for team
- [ ] Consider setting up Slack/Discord notifications for deployments

## Congratulations! 🎉

You now have a complete dual-environment setup:
- **Local**: Safe development environment
- **Staging**: Automatic deployment for team testing
- **Production**: Manual deployment with safety checks

**Remember:**
- Develop locally
- Push to `main` → Staging auto-deploys
- Test in staging
- Manually deploy to production when ready
