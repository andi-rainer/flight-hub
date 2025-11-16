# Getting Started with FlightHub

## Quick Overview

FlightHub has a three-tier environment setup for safe development and deployment:

- 🏠 **Local Development** → Local Supabase (Docker) + Next.js
- 🧪 **Staging** → Cloud Supabase (staging) + Vercel (staging) - Auto-deploy on push to `main`
- 🚀 **Production** → Cloud Supabase (production) + Vercel (production) - Manual deployment only

## For Local Development

### One-Command Setup

```bash
./setup-local-supabase.sh
npm run dev
```

That's it! You now have:
- Local Supabase running at http://127.0.0.1:54321
- Database Studio at http://127.0.0.1:54323
- Email testing at http://127.0.0.1:54324
- Your app at http://localhost:3000

**See:** [QUICK_START_LOCAL.md](./QUICK_START_LOCAL.md) for detailed local development guide.

## For Staging & Production Deployment

### First-Time Setup (One-Time)

Follow the checklist in [.github/DUAL_ENVIRONMENT_CHECKLIST.md](./.github/DUAL_ENVIRONMENT_CHECKLIST.md):

1. Create staging and production Supabase projects
2. Create staging and production Vercel projects
3. Get credentials for both environments
4. Add 10 secrets to GitHub
5. Initialize databases
6. Test deployments

**See:** [DUAL_ENVIRONMENT_SETUP.md](./DUAL_ENVIRONMENT_SETUP.md) for complete setup guide.

### Staging Deployment (Automatic - After Setup)

```bash
# Develop locally
npm run dev

# Test migrations
npm run supabase:reset

# Push to main → Staging auto-deploys
git push origin main

# ✨ GitHub Actions automatically:
#    - Applies migrations to staging Supabase
#    - Deploys to staging Vercel
#    - Team can test at staging URL
```

### Production Deployment (Manual - After Staging Testing)

```bash
# After testing in staging:
# 1. Go to GitHub → Actions
# 2. Select "Deploy to Production"
# 3. Click "Run workflow"
# 4. Type "deploy" to confirm
# 5. Click "Run workflow"

# ✨ GitHub Actions will:
#    - Run tests
#    - Run linter
#    - Apply migrations to production Supabase
#    - Deploy to production Vercel
```

**See:** [DUAL_ENVIRONMENT_SETUP.md](./DUAL_ENVIRONMENT_SETUP.md) for complete workflow.

## Key Documents

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[QUICK_START_LOCAL.md](./QUICK_START_LOCAL.md)** | Quick reference for local development | Daily reference |
| **[LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)** | Complete local development guide | First-time setup |
| **[DUAL_ENVIRONMENT_SETUP.md](./DUAL_ENVIRONMENT_SETUP.md)** | Staging + Production setup guide | One-time setup |
| **[.github/DUAL_ENVIRONMENT_CHECKLIST.md](./.github/DUAL_ENVIRONMENT_CHECKLIST.md)** | Step-by-step dual environment setup | First-time setup |
| **[DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md)** | Complete deployment workflow | Understanding the process |

## Common Commands

### Local Development
```bash
npm run supabase:start      # Start local Supabase
npm run supabase:stop       # Stop local Supabase
npm run supabase:reset      # Reset database (test migrations)
npm run supabase:studio     # Open database UI
npm run dev                 # Start Next.js dev server
```

### Testing
```bash
npm run test                # Run tests
npm run test:watch          # Run tests in watch mode
npm run lint                # Run linter
```

### Production
```bash
git push origin main        # Deploy to production (via GitHub Actions)
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   LOCAL DEVELOPMENT                     │
├─────────────────────────────────────────────────────────┤
│  Docker Supabase         →  http://127.0.0.1:54321     │
│  Next.js Dev Server      →  http://localhost:3000      │
│  Database Studio         →  http://127.0.0.1:54323     │
│  Email Testing (Inbucket)→  http://127.0.0.1:54324     │
└─────────────────────────────────────────────────────────┘
                          ↓
                    git push origin main
                          ↓
┌─────────────────────────────────────────────────────────┐
│              STAGING (Automatic Deployment)              │
├─────────────────────────────────────────────────────────┤
│  GitHub Actions:                                         │
│  1. Apply migrations to staging Supabase                │
│  2. Deploy to staging Vercel                            │
│                                                          │
│  Cloud Supabase (staging) →  [staging-ref].supabase.co │
│  Vercel (staging)         →  flight-hub-staging.vercel.app │
└─────────────────────────────────────────────────────────┘
                          ↓
                  Manual trigger required
                          ↓
┌─────────────────────────────────────────────────────────┐
│             PRODUCTION (Manual Deployment)               │
├─────────────────────────────────────────────────────────┤
│  GitHub Actions (Manual):                               │
│  1. Run tests & linter                                  │
│  2. Apply migrations to production Supabase             │
│  3. Deploy to production Vercel                         │
│                                                          │
│  Cloud Supabase (prod)    →  pememmvfgvsukpqxxwbm.supabase.co │
│  Vercel (production)      →  flight-hub.vercel.app     │
└─────────────────────────────────────────────────────────┘
```

## What Changed?

### ❌ Old Workflow (Manual)
```bash
# Develop locally with cloud Supabase
npm run dev  # Connected to production DB ⚠️

# Manually push migrations
supabase db push  # From terminal

# Manually deploy
vercel deploy --prod
```

### ✅ New Workflow (Dual Environment)
```bash
# Develop locally with local Supabase
npm run supabase:start
npm run dev  # Isolated local DB ✅

# Test migrations locally
npm run supabase:reset

# Push to main → Staging auto-deploys
git push origin main
# ✨ Staging gets updated automatically

# Test in staging, then manually deploy to production
# GitHub Actions → Deploy to Production → "deploy"
```

## Benefits

1. **Isolated Development**
   - Clean local database for each test
   - No risk of breaking staging or production
   - Test emails without spamming users
   - Fast iteration without cloud dependencies

2. **Staging Environment**
   - Team can test features before production
   - Automatic deployment on every push to main
   - Real cloud environment for integration testing
   - Share staging URL for stakeholder review

3. **Production Safety**
   - Manual deployment with confirmation required
   - Tests and linting run before deployment
   - Migrations tested in staging first
   - Rollback strategy if issues occur

4. **Clear Workflow**
   - Local → Staging → Production progression
   - Audit trail in GitHub Actions
   - Team visibility into deployments
   - Consistent deployment process

## Troubleshooting

### Local Development Issues
See [QUICK_START_LOCAL.md](./QUICK_START_LOCAL.md#troubleshooting)

### GitHub Actions Issues
See [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md#troubleshooting)

### General Issues
See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md#troubleshooting)

## Next Steps

1. **First Time - Local Development?**
   - Start with [QUICK_START_LOCAL.md](./QUICK_START_LOCAL.md)
   - Run `./setup-local-supabase.sh`
   - Create test user and start developing

2. **First Time - Staging & Production Setup?**
   - Read [DUAL_ENVIRONMENT_SETUP.md](./DUAL_ENVIRONMENT_SETUP.md)
   - Follow [.github/DUAL_ENVIRONMENT_CHECKLIST.md](./.github/DUAL_ENVIRONMENT_CHECKLIST.md)
   - Create 2 Supabase projects + 2 Vercel projects
   - Add 10 secrets to GitHub

3. **Understanding the Workflow?**
   - Read [DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md)
   - Understand Local → Staging → Production flow

4. **Need Detailed Local Dev Guide?**
   - See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)

## Quick Summary

```
📝 Development Flow:
1. Develop locally (npm run supabase:start && npm run dev)
2. Test migrations (npm run supabase:reset)
3. Push to main → Staging auto-deploys
4. Team tests in staging
5. Manually deploy to production (GitHub Actions)

🔑 Key Points:
- Local: Isolated, safe, fast iteration
- Staging: Auto-deploy, team testing
- Production: Manual, requires confirmation
```

## Support

- 📖 Documentation in this repository
- 🐛 Issues on GitHub
- 💬 Team communication channel

---

**Ready to start?**
- **Local development**: Run `./setup-local-supabase.sh`
- **Cloud deployment**: Follow [.github/DUAL_ENVIRONMENT_CHECKLIST.md](./.github/DUAL_ENVIRONMENT_CHECKLIST.md)
