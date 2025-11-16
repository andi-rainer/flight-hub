# Local Development with Supabase

This guide explains how to run FlightHub locally with a local Supabase instance while keeping the cloud instance for production deployment on Vercel.

## Prerequisites

- Docker Desktop installed and running
- Supabase CLI installed (`brew install supabase/tap/supabase` on macOS)
- Node.js 18+ installed

## Setup Overview

- **Local Development**: Uses local Supabase instance (clean database for testing)
- **Production (Vercel)**: Uses cloud Supabase instance (deployed via GitHub Actions)

## Step 1: Start Local Supabase

All migrations are already in `supabase/migrations/`, so no cloud connection is needed.

```bash
# Start all Supabase services locally
supabase start

# This will:
# - Download Docker images (first time only, ~2GB)
# - Start PostgreSQL, PostgREST, GoTrue (auth), Realtime, Storage, etc.
# - Apply all migrations from supabase/migrations/
# - Take 2-5 minutes on first run
```

**After starting, you'll see output like:**

```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   S3 Access Key: 625729a08b95bf1b7ff351a663f3a23c
   S3 Secret Key: 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
       S3 Region: local
```

**Save these values - you'll need them for `.env.local`**

## Step 3: Configure Environment Variables

### For Local Development

Update `.env.local` to use local Supabase:

```bash
# .env.local (for local development)

# Local Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start output>

# Server-side only
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start output>

# Database direct connection (for migrations)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=FlightHub
```

### For Production (Vercel)

In your Vercel project settings, keep the existing environment variables:

```bash
# Production Supabase Configuration (Vercel)
NEXT_PUBLIC_SUPABASE_URL=https://pememmvfgvsukpqxxwbm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your cloud anon key>
SUPABASE_SERVICE_ROLE_KEY=<your cloud service role key>
DATABASE_URL=<your cloud database URL>
NEXT_PUBLIC_APP_URL=<your vercel domain>
NEXT_PUBLIC_APP_NAME=FlightHub
```

## Step 4: Backup Cloud Keys (Recommended)

Create `.env.cloud` to easily switch back:

```bash
# .env.cloud (backup of cloud configuration)

NEXT_PUBLIC_SUPABASE_URL=https://pememmvfgvsukpqxxwbm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbWVtbXZmZ3ZzdWtwcXh4d2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTQzMDQsImV4cCI6MjA3NzY5MDMwNH0.bM6Ve1rM_arCBPrVb4DQb-ZtrgsSbCYijV5dxpuBCcU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbWVtbXZmZ3ZzdWtwcXh4d2JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjExNDMwNCwiZXhwIjoyMDc3NjkwMzA0fQ.CBaVPXAWi4Pq1FjBRBEnjvHWjpX4PixtEvQf4D2Z7F0
DATABASE_URL=postgresql://postgres:byBbi6-hojgys-xywqeg@db.pememmvfgvsukpqxxwbm.supabase.co:5432/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=FlightHub
```

Add to `.gitignore`:

```bash
echo ".env.cloud" >> .gitignore
```

## Step 5: Start Development Server

```bash
# Clear Next.js cache for clean start
rm -rf .next

# Start Next.js dev server
npm run dev
```

Your app will now connect to the local Supabase instance at `http://localhost:3000`

## Step 6: Access Local Services

### Supabase Studio (Database UI)
- URL: http://127.0.0.1:54323
- View tables, run SQL queries, manage auth users
- No login required for local instance

### Inbucket (Email Testing)
- URL: http://127.0.0.1:54324
- Catches all emails sent by your app
- View invitation emails, password reset emails, etc.

### Database Direct Access
```bash
# Connect with psql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Or use Supabase CLI
supabase db diff
```

## Managing Local Development

### Stop Supabase

```bash
supabase stop
```

### Reset Database (Fresh Start)

```bash
# Stop services
supabase stop

# Reset and restart
supabase db reset

# This will:
# 1. Drop all data
# 2. Re-apply all migrations from scratch
# 3. Give you a clean database
```

### View Logs

```bash
# View all service logs
supabase logs

# View specific service
supabase logs -f postgres
supabase logs -f auth
```

### Check Status

```bash
supabase status
```

## Creating Test Data

### Option 1: Via Supabase Studio

1. Go to http://127.0.0.1:54323
2. Navigate to "Authentication" → "Users"
3. Click "Add user" to create test accounts
4. Navigate to tables to add test data

### Option 2: Via SQL

```bash
# Create a seed file
supabase/seed.sql
```

Example seed:

```sql
-- Create test user (also creates auth user)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  now()
);

-- Add to users table (profile)
INSERT INTO users (id, email, name, surname, role)
SELECT id, email, 'Test', 'User', ARRAY['board']
FROM auth.users
WHERE email = 'test@example.com';
```

Then run:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < supabase/seed.sql
```

## Migration Workflow

### Creating New Migrations

```bash
# Create a new migration file
supabase migration new add_feature_name

# Edit the generated file in supabase/migrations/
# Add your SQL changes

# Apply to local database
supabase db reset

# Test your changes locally
```

### Deploying to Production

When you're ready to deploy changes to production:

```bash
# 1. Test locally first
npm run supabase:reset
# Run your app and test thoroughly

# 2. Commit your changes
git add .
git commit -m "feat: your feature description"

# 3. Push to main - GitHub Actions handles the rest
git push origin main

# GitHub Actions will automatically:
# - Apply migrations to production Supabase
# - Deploy to Vercel
# - Post deployment summary
```

See **[GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md)** for automated deployment configuration.

## Switching Between Local and Cloud

### Quick Switch Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:local": "cp .env.local.dev .env.local && npm run dev",
    "dev:cloud": "cp .env.cloud .env.local && npm run dev",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:reset": "supabase db reset",
    "supabase:studio": "supabase studio"
  }
}
```

Then:

```bash
# Use local Supabase
npm run dev:local

# Use cloud Supabase
npm run dev:cloud
```

## Troubleshooting

### Docker Not Running

```bash
# Start Docker Desktop first
# Then retry supabase start
```

### Port Conflicts

If ports 54321-54324 are in use:

```bash
# Edit supabase/config.toml
[api]
port = 55321  # Change to different port

[db]
port = 55322

# Update .env.local accordingly
```

### Migration Errors

```bash
# Check migration status
supabase db diff

# If stuck, reset and retry
supabase db reset
```

### Cannot Connect to Database

```bash
# Check if services are running
supabase status

# Restart if needed
supabase stop
supabase start
```

### Auth Issues

- Local Supabase uses different JWT secrets
- Make sure .env.local has the correct anon key from `supabase start`
- Check Inbucket (http://127.0.0.1:54324) for confirmation emails

## Best Practices

1. **Always develop locally first**
   - Test migrations on local instance
   - Verify features work with clean database
   - Use Inbucket to test email flows

2. **Keep migrations in sync**
   - Run `supabase db reset` regularly to test migrations
   - Never edit migration files after they're pushed to cloud

3. **Use seed data**
   - Create seed scripts for common test scenarios
   - Reset and reseed for reproducible tests

4. **Monitor local storage**
   - Local Supabase stores files in `.supabase/docker/volumes`
   - Can grow large - clean up with `supabase stop --no-backup`

5. **Document cloud credentials**
   - Keep `.env.cloud` backed up securely
   - Don't commit it to git

## Summary

- **Local**: Clean, isolated testing environment
- **Cloud**: Production data, used by Vercel
- **Workflow**: Develop local → Test → Push migrations → Deploy to Vercel
- **Tools**: Studio (UI), Inbucket (emails), psql (direct DB access)

## Next Steps

1. Start local Supabase: `supabase start`
2. Update `.env.local` with local credentials
3. Start dev server: `npm run dev`
4. Open Studio: http://127.0.0.1:54323
5. Create test user and start developing!
