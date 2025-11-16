# Quick Start: Local Supabase Development

## One-Command Setup

```bash
./setup-local-supabase.sh
```

Then:

```bash
npm run dev
```

## Manual Steps

```bash
# 1. Start local Supabase
npm run supabase:start

# 2. Update .env.local with credentials from output
# Look for "anon key" and "service_role key"

# 3. Start dev server
npm run dev
```

## Important URLs

- **App**: http://localhost:3000
- **Studio** (Database UI): http://127.0.0.1:54323
- **Inbucket** (Email testing): http://127.0.0.1:54324

## Helpful Commands

```bash
npm run supabase:start     # Start local Supabase
npm run supabase:stop      # Stop Supabase
npm run supabase:reset     # Fresh database (apply all migrations)
npm run supabase:studio    # Open Studio in browser
npm run supabase:status    # Check running services
npm run supabase:logs      # View service logs
```

## Creating Test User

### Via Studio (Easiest)

1. Open http://127.0.0.1:54323
2. Go to **Authentication** → **Users**
3. Click **Add user**
4. Enter email and password
5. Click **Create user**
6. Go to **Table Editor** → **users**
7. Find your user and edit `role` column to `["board"]`

### Via SQL

Open Studio → SQL Editor and run:

```sql
-- Insert test board member
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
)
VALUES (
  'admin@test.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"name": "Admin", "surname": "User"}'::jsonb
);

-- Update users table
INSERT INTO public.users (id, email, name, surname, role)
SELECT
  id,
  email,
  raw_user_meta_data->>'name',
  raw_user_meta_data->>'surname',
  ARRAY['board']::text[]
FROM auth.users
WHERE email = 'admin@test.com';
```

Login with:
- Email: `admin@test.com`
- Password: `password123`

## Switching Between Local and Cloud

### Use Local

```bash
# Make sure local Supabase is running
npm run supabase:status

# Update .env.local with local URLs
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

### Use Cloud

```bash
# Restore cloud config
cp .env.cloud .env.local

# Restart dev server
npm run dev
```

## Troubleshooting

### Docker not running

Start Docker Desktop first, then run `npm run supabase:start`

### Port already in use

```bash
# Stop Supabase
npm run supabase:stop

# Kill any lingering processes
docker ps
docker kill <container-id>

# Restart
npm run supabase:start
```

### Migration errors

```bash
# Reset database (clears all data)
npm run supabase:reset
```

### Can't log in

- Check Inbucket (http://127.0.0.1:54324) for confirmation emails
- Local Supabase auto-confirms emails, but check Studio to verify user exists
- Make sure user has `board` role in `users` table

## Best Practices

✅ **DO:**
- Develop and test locally first
- Run `npm run supabase:reset` regularly to ensure migrations work
- Use Inbucket to test email flows
- Commit migrations to git

❌ **DON'T:**
- Push untested migrations to cloud
- Commit `.env.local` or `.env.cloud`
- Edit migration files after they're applied to cloud
- Run local and cloud instances simultaneously (confusing)

## Need More Help?

See **[LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)** for complete documentation.
