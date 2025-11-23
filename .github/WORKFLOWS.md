# GitHub Actions Workflows

This document describes the automated workflows configured for the FlightHub project.

## Workflows Overview

### 1. Comprehensive CI (`ci.yml`)

**Trigger:** Every push to any branch + Pull requests to main/develop
**Purpose:** Complete automated testing and code quality checks
**Duration:** ~3-5 minutes

**What it does (All in one job):**
- ✅ **Linting** - Runs ESLint on entire codebase
- ✅ **Type Check** - Verifies TypeScript compilation
- ✅ **Tests** - Runs all unit tests with coverage
  - flight charging tests
  - manifest system tests
  - other tests (API routes, components, etc.)
- ✅ **Build** - Verifies Next.js production build with Turbopack
- ✅ **Coverage Upload** - Sends coverage to Codecov (optional)
- ✅ **Comprehensive Summary** - Detailed status report with pass/fail for each check

**Status Badge:**
```markdown
![CI](https://github.com/andi-rainer/flight-hub/actions/workflows/ci.yml/badge.svg)
```

**Summary Output Example:**
```
## CI Results 🚀

✅ Linting - Passed
✅ Type Check - Passed
✅ Tests - All tests passed
✅ Build - Next.js build successful

### Test Coverage
- Flight Charging: 21 tests
- Manifest System: 58 tests
- API Routes & Components: 53+ tests

🎉 All CI checks passed!
```

---

### 2. Deploy to Staging (`deploy-staging.yml`)

**Trigger:** Push to `main` branch
**Purpose:** Deploy to staging environment with migrations
**Duration:** ~2-3 minutes

**What it does:**
- ✅ Runs database migrations on staging Supabase
- ✅ Deploys to Vercel staging environment
- ✅ Provides deployment URL

**Required Secrets:**
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD_STAGING`
- `SUPABASE_PROJECT_ID_STAGING`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_STAGING`

---

### 3. Deploy to Production (`deploy-production.yml`)

**Trigger:** Manual (workflow_dispatch)
**Purpose:** Deploy to production environment
**Duration:** ~3-4 minutes

**What it does:**
- ✅ Runs database migrations on production Supabase
- ✅ Deploys to Vercel production environment
- ✅ Creates production-ready build

**Required Secrets:**
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD_PRODUCTION`
- `SUPABASE_PROJECT_ID_PRODUCTION`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_PRODUCTION`

---

## Workflow Execution Flow

```
┌─────────────────────────────────────────────────────────┐
│  Developer pushes code to any branch                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      └─► Comprehensive CI (ci.yml)
                          │
                          ├─► 1. Lint (~30s)
                          ├─► 2. Type Check (~30s)
                          ├─► 3. Tests with Coverage (~1.5 min)
                          │   └─► All tests (flight charging,
                          │       manifest, API routes, components)
                          ├─► 4. Build Check (~1 min)
                          └─► 5. Generate Summary Report
                              └─► ✅ All checks passed or
                                  ❌ Show failures

┌─────────────────────────────────────────────────────────┐
│  Code merged to main branch                             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      └─► Deploy to Staging (deploy-staging.yml)
                          ├─► Run DB migrations
                          └─► Deploy to Vercel staging

┌─────────────────────────────────────────────────────────┐
│  Manual production deployment                           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      └─► Deploy to Production (deploy-production.yml)
                          ├─► Run DB migrations
                          └─► Deploy to Vercel production
```

---

## Environment Variables

### CI/CD Workflows
The following environment variables are used in CI workflows:

```yaml
# Build placeholders (CI only)
NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-key
```

### Deployment Workflows
Deployment workflows use GitHub Secrets for sensitive data:
- Never commit real credentials to the repository
- Configure secrets in GitHub repository settings
- Use separate credentials for staging and production

---

## Adding Status Badges to README

Add these badges to your README.md:

```markdown
[![Tests](https://github.com/andi-rainer/flight-hub/actions/workflows/test.yml/badge.svg)](https://github.com/andi-rainer/flight-hub/actions/workflows/test.yml)
[![CI](https://github.com/andi-rainer/flight-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/andi-rainer/flight-hub/actions/workflows/ci.yml)
[![Deploy Staging](https://github.com/andi-rainer/flight-hub/actions/workflows/deploy-staging.yml/badge.svg)](https://github.com/andi-rainer/flight-hub/actions/workflows/deploy-staging.yml)
```

---

## Troubleshooting

### Tests Failing in CI but Passing Locally

**Common Causes:**
1. Missing environment variables
2. Different Node.js versions
3. Timing issues in tests
4. Missing dependencies

**Solutions:**
- Run `npm ci` instead of `npm install`
- Check Node.js version matches (18.x)
- Use `--maxWorkers=2` for parallel execution
- Review failed test logs in GitHub Actions

### Build Failures

**Common Causes:**
1. TypeScript errors
2. Missing dependencies
3. Environment variable issues

**Solutions:**
- Run `npm run build` locally first
- Check `npx tsc --noEmit` for type errors
- Ensure all dependencies are in `package.json`

### Deployment Failures

**Common Causes:**
1. Invalid Supabase credentials
2. Migration conflicts
3. Vercel deployment issues

**Solutions:**
- Verify GitHub Secrets are set correctly
- Check Supabase migration history
- Review Vercel deployment logs

---

## Best Practices

1. **Run tests locally before pushing:**
   ```bash
   npm test
   npm run build
   ```

2. **Keep workflows fast:**
   - Use `npm ci` instead of `npm install`
   - Enable caching for Node.js
   - Use parallel workers for tests

3. **Monitor workflow runs:**
   - Check GitHub Actions tab regularly
   - Fix failing workflows promptly
   - Review test coverage reports

4. **Update workflows:**
   - Keep actions versions up to date
   - Test workflow changes in feature branches
   - Document any workflow modifications

---

## Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployments](https://vercel.com/docs)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Project Testing Guide](../MANIFEST_TESTING.md)

---

**Last Updated:** November 23, 2025
**Workflows:** 3 active workflows (CI, Deploy Staging, Deploy Production)
**Test Coverage:** 132 tests in unified CI workflow
