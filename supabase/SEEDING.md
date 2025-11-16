# Database Seeding Guide

## Overview

FlightHub uses **different seeding strategies** for different environments:

| Environment | Seeding Strategy | Admin User |
|------------|------------------|------------|
| **Local** | Automatic via `seed.sql` | ✅ Auto-created |
| **Staging** | Manual (Supabase Dashboard) | ⚠️ Create manually |
| **Production** | Manual (Supabase Dashboard) | ⚠️ Create manually |

## Local Development Seeding

### Automatic Seeding

The `seed.sql` file runs automatically when you reset the local database:

```bash
npm run supabase:reset
```

This creates:
- ✅ Admin user in `auth.users`
- ✅ Admin profile in `public.users` with `board` role

**Default Credentials:**
- **Email**: `admin@test.local`
- **Password**: `password123`
- **Role**: `board`

### Manual Seeding (If Needed)

If you need to run the seed file manually:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < supabase/seed.sql
```

## Staging & Production Setup

### ⚠️ DO NOT Use seed.sql in Cloud Environments

The `seed.sql` file is **ONLY for local development**. Never run it on staging or production.

**Why?**
- Contains hardcoded credentials
- Security risk if committed credentials are used
- Same password across all environments

### Creating Admin User in Cloud

#### Option 1: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**:
   - Staging: `https://supabase.com/dashboard/project/[staging-ref]`
   - Production: `https://supabase.com/dashboard/project/pememmvfgvsukpqxxwbm`

2. **Navigate to Authentication → Users**

3. **Click "Add user"**:
   - Email: Your real email address
   - Password: Generate strong password (use password manager)
   - Auto Confirm Email: **YES**
   - Click **Create user**

4. **Promote to Board Member**:
   - Go to **Table Editor** → **users** table
   - Find your user (search by email)
   - Edit the **role** column
   - Change to: `["board"]`
   - Click **Save**

5. **Save Credentials Securely**:
   - Store in password manager
   - Share with team leads securely
   - Use different passwords for staging and production

#### Option 2: Via SQL Editor (Advanced)

1. **Go to SQL Editor** in Supabase Dashboard

2. **Run this query** (replace email):

```sql
-- Step 1: Create user in auth (do this via Dashboard → Authentication instead)
-- Dashboard is safer and handles all auth internals correctly

-- Step 2: Promote user to board after they sign up
UPDATE public.users
SET role = array_append(role, 'board')
WHERE email = 'your-email@example.com'
AND NOT ('board' = ANY(role));

-- Verify
SELECT id, email, name, surname, role
FROM public.users
WHERE email = 'your-email@example.com';
```

**Note**: Creating users directly in `auth.users` via SQL is complex and error-prone. Use the Dashboard instead.

## Security Best Practices

### ✅ DO:
- Use strong, unique passwords for staging and production
- Store credentials in a password manager
- Create separate admin accounts per environment
- Use your real email for production admin
- Rotate passwords periodically

### ❌ DON'T:
- Use `seed.sql` on staging or production
- Commit real credentials to git
- Use the same password across environments
- Share admin credentials via unencrypted channels
- Use test emails (like `admin@test.local`) in production

## Seed File Structure

### What's in seed.sql

```sql
-- Creates admin@test.local user if doesn't exist
-- Password: password123
-- Role: board
-- Safe for local development only
```

### Configuration

Seeding is configured in `supabase/config.toml`:

```toml
[db.seed]
enabled = true
sql_paths = ["./seed.sql"]
```

This means:
- ✅ Seed runs on `supabase db reset`
- ✅ Seed runs on initial `supabase start` (if fresh database)
- ❌ Seed does NOT run on cloud deployments via GitHub Actions

## Troubleshooting

### Admin user not created locally

```bash
# Reset database (this runs seed.sql)
npm run supabase:reset

# Verify user exists
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c \
  "SELECT email, role FROM public.users WHERE email = 'admin@test.local';"
```

### "User already exists" error

The seed script is idempotent - it checks if user exists before creating. This is normal and not an error.

### Can't login with seeded credentials

1. Check you're using local Supabase (not cloud):
   ```bash
   cat .env.local | grep SUPABASE_URL
   # Should show: http://127.0.0.1:54321
   ```

2. Verify user exists:
   ```bash
   npm run supabase:status
   ```

3. Check Studio → Authentication → Users for `admin@test.local`

### Need to reset admin password locally

```sql
-- Connect to local database
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

-- Update password
UPDATE auth.users
SET encrypted_password = crypt('newpassword', gen_salt('bf'))
WHERE email = 'admin@test.local';
```

## Alternative: First User Auto-Promotion

If you prefer not to use seeded users, you can implement "first user becomes admin" logic:

### In your signup flow:

```typescript
// After user signs up
const { data: userCount } = await supabase
  .from('users')
  .select('id', { count: 'exact', head: true })

if (userCount === 1) {
  // First user - make them admin
  await supabase
    .from('users')
    .update({ role: ['board'] })
    .eq('id', userId)
}
```

**Pros:**
- No hardcoded credentials
- Works in all environments

**Cons:**
- Race condition risk (two users sign up simultaneously)
- More complex to implement
- Need to ensure first user is actually you

## Recommended Workflow

### For Local Development
1. Run `npm run supabase:start`
2. Seed runs automatically, creates `admin@test.local`
3. Login with `admin@test.local` / `password123`
4. Start developing

### For Staging/Production
1. Deploy database via GitHub Actions
2. Go to Supabase Dashboard
3. Create admin user manually with strong password
4. Promote to board via SQL or Table Editor
5. Save credentials securely
6. Share with team securely

## Summary

✅ **Local**: Automatic seeding with test credentials
⚠️ **Staging/Production**: Manual user creation with secure credentials

This approach balances convenience (local) with security (cloud).

## Related Documentation

- [QUICK_START_LOCAL.md](../QUICK_START_LOCAL.md) - Local development setup
- [DUAL_ENVIRONMENT_SETUP.md](../DUAL_ENVIRONMENT_SETUP.md) - Cloud environment setup
- [.github/DUAL_ENVIRONMENT_CHECKLIST.md](../.github/DUAL_ENVIRONMENT_CHECKLIST.md) - Setup checklist
