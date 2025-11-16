# GitHub Actions Setup Checklist

Complete these steps to enable automated deployments.

## Prerequisites

- [x] Docker Desktop installed and running
- [x] Supabase CLI installed (`brew install supabase/tap/supabase`)
- [x] Vercel CLI installed (`npm i -g vercel`)

## 1. Get Supabase Credentials

### Access Token
- [ ] Go to https://app.supabase.com/account/tokens
- [ ] Click "Generate new token"
- [ ] Name: "GitHub Actions"
- [ ] Copy and save the token

### Project Credentials (Already Known)
- [ ] Project ID: `pememmvfgvsukpqxxwbm`
- [ ] Database Password: `byBbi6-hojgys-xywqeg`

## 2. Get Vercel Credentials

```bash
# Login to Vercel
vercel login

# Link project
cd /path/to/flight-hub
vercel link

# Get credentials
cat .vercel/project.json
```

- [ ] Copy `orgId` (format: `team_xxxxx`)
- [ ] Copy `projectId` (format: `prj_xxxxx`)

### Token
- [ ] Go to https://vercel.com/account/tokens
- [ ] Click "Create Token"
- [ ] Name: "GitHub Actions"
- [ ] Copy and save the token

## 3. Add GitHub Secrets

Go to: `https://github.com/[username]/flight-hub/settings/secrets/actions`

Click "New repository secret" for each:

- [ ] `SUPABASE_ACCESS_TOKEN` = (token from step 1)
- [ ] `SUPABASE_DB_PASSWORD` = `byBbi6-hojgys-xywqeg`
- [ ] `SUPABASE_PROJECT_ID` = `pememmvfgvsukpqxxwbm`
- [ ] `VERCEL_TOKEN` = (token from step 2)
- [ ] `VERCEL_ORG_ID` = (orgId from step 2)
- [ ] `VERCEL_PROJECT_ID` = (projectId from step 2)

## 4. Verify Vercel Environment Variables

Go to: Vercel Project → Settings → Environment Variables

Ensure these exist for **Production**:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://pememmvfgvsukpqxxwbm.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your cloud anon key)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (your cloud service role key)
- [ ] `DATABASE_URL` = (your cloud database URL)
- [ ] `NEXT_PUBLIC_APP_URL` = (your Vercel domain)
- [ ] `NEXT_PUBLIC_APP_NAME` = `FlightHub`

## 5. Test Deployment

```bash
# Make a test commit
echo "# Test" >> README.md
git add README.md
git commit -m "test: trigger GitHub Actions"
git push origin main
```

- [ ] Go to GitHub Actions tab
- [ ] Watch "Deploy to Production" workflow
- [ ] Check all steps pass:
  - [ ] Checkout code
  - [ ] Install dependencies
  - [ ] Run database migrations
  - [ ] Deploy to Vercel
- [ ] Visit Vercel deployment URL
- [ ] Verify app works correctly

## 6. Test Pull Request Workflow

```bash
# Create feature branch
git checkout -b test/preview-deployment
echo "# Test PR" >> README.md
git add README.md
git commit -m "test: preview deployment"
git push origin test/preview-deployment
```

- [ ] Create Pull Request on GitHub
- [ ] Watch "Deploy Preview" workflow
- [ ] Check preview URL is posted in PR comments
- [ ] Visit preview URL and test

## 7. Cleanup

```bash
# Delete test branch
git checkout main
git branch -D test/preview-deployment
git push origin --delete test/preview-deployment

# Remove test commit from main
git revert HEAD
git push origin main
```

## Troubleshooting

### Migration Failed
- Check migration syntax locally: `npm run supabase:reset`
- Review error in GitHub Actions logs
- Fix and push again

### Vercel Deployment Failed
- Check Vercel token hasn't expired
- Verify org and project IDs are correct
- Check Vercel dashboard for detailed logs

### Secrets Not Working
- Ensure secret names are EXACTLY as shown (case-sensitive)
- No spaces in secret values
- Verify secrets in: Settings → Secrets and variables → Actions

## Success Criteria

✅ All checkboxes above are complete
✅ GitHub Actions workflow runs successfully
✅ Migrations applied to production Supabase
✅ Vercel deployment succeeds
✅ Production app is accessible and working

## Next Steps

You're all set! From now on:

1. Develop locally with `npm run supabase:start` and `npm run dev`
2. Test migrations with `npm run supabase:reset`
3. Push to `main` → automatic deployment
4. Monitor in GitHub Actions tab

See [DEPLOYMENT_WORKFLOW.md](../DEPLOYMENT_WORKFLOW.md) for complete workflow documentation.
