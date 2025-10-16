# FlightHub Quick Start Guide

## Setup in 5 Minutes

### Step 1: Configure Environment

Copy the example env file and add your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` and update these values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://bfzynfnowzkvhvleocny.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Get your keys from: https://supabase.com/dashboard/project/bfzynfnowzkvhvleocny/settings/api

### Step 2: Install and Run

```bash
npm install
npm run dev
```

Visit http://localhost:3000

### Step 3: Create Your First User

Since this is a new system, you'll need to create the first user via Supabase Dashboard:

#### Option A: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/bfzynfnowzkvhvleocny/auth/users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. Click "Create user"
5. Go to SQL Editor: https://supabase.com/dashboard/project/bfzynfnowzkvhvleocny/sql/new
6. Run this SQL to create the user profile:

```sql
-- Replace with the user ID from Auth Users table
INSERT INTO public.users (id, email, name, surname, role, functions)
VALUES (
  '<user-id-from-auth-table>',
  'your@email.com',
  'Your',
  'Name',
  ARRAY['member', 'board'],  -- Give yourself board access
  ARRAY[]::text[]
);
```

#### Option B: Via SQL (All-in-One)

1. Go to SQL Editor: https://supabase.com/dashboard/project/bfzynfnowzkvhvleocny/sql/new
2. Run this SQL:

```sql
-- Create auth user and profile in one go
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create auth user (generates UUID automatically)
  INSERT INTO auth.users (
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'admin@flighthub.com',
    crypt('YourPassword123', gen_salt('bf')),  -- Change this password!
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Admin", "surname": "User"}',
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  )
  RETURNING id INTO new_user_id;

  -- Create public profile
  INSERT INTO public.users (id, email, name, surname, role, functions)
  VALUES (
    new_user_id,
    'admin@flighthub.com',
    'Admin',
    'User',
    ARRAY['member', 'board'],
    ARRAY[]::text[]
  );
END $$;
```

**Important:** Change `YourPassword123` to your desired password!

### Step 4: Login

1. Go to http://localhost:3000/login
2. Enter your email and password
3. You should be redirected to the dashboard!

## What's Included

After setup, you have access to:

- **Dashboard** - Overview of your club activity
- **Aircrafts** - Manage your fleet (placeholder)
- **Reservations** - Book aircraft (placeholder)
- **Flight Log** - Log your flights (placeholder)
- **Members** - Manage club members (Board only, placeholder)
- **Documents** - Club documents (placeholder)
- **Settings** - User preferences (placeholder)

## Verify Everything Works

### Test Checklist

- [ ] Can login with credentials
- [ ] Redirected to dashboard after login
- [ ] User menu shows your name in top right
- [ ] Avatar shows your initials
- [ ] Sidebar navigation works
- [ ] Can toggle dark mode
- [ ] Mobile menu works (resize browser)
- [ ] Can see "Members" link (board role)
- [ ] Can logout successfully

## Common Issues

### "Invalid login credentials"
- Double-check email and password
- Ensure user was created in Supabase Auth
- Check that email_confirmed_at is set

### "User not found" after login
- Verify profile exists in public.users table
- Run: `SELECT * FROM public.users WHERE email = 'your@email.com'`
- If missing, create profile using SQL above

### Environment variable errors
- Restart dev server: `Ctrl+C` then `npm run dev`
- Verify `.env.local` exists (not `.env.example`)
- Check no extra spaces in env values

### Build errors
- Run: `npm run build` to check for issues
- All TypeScript types are defined
- All imports are correct

## Next Steps

Now that authentication works, you can:

1. **Add more users** via Supabase Dashboard
2. **Start building features** in the placeholder pages
3. **Customize the dashboard** with real statistics
4. **Add aircraft data** to the planes table
5. **Test reservations** workflow

## Development Tips

### File Structure
- Server Components: `/app/(dashboard)/*/page.tsx`
- Client Components: `/components/**/*.tsx`
- Server Actions: `/lib/actions/*.ts`
- Utilities: `/lib/utils/*.ts`

### Working with Supabase

**Server Components:**
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

**Client Components:**
```typescript
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

### Adding New Pages

1. Create file in `/app/(dashboard)/newpage/page.tsx`
2. Add route to sidebar in `/components/layout/sidebar.tsx`
3. Add to middleware if protection needed

### Getting Current User

**Server Component:**
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
  }
}
```

**Client Component:**
```typescript
import { useUser } from '@/lib/hooks/use-user'

export default function MyComponent() {
  const { user, isLoading, isBoardMember } = useUser()

  if (isLoading) return <div>Loading...</div>
  if (!user) return <div>Not authenticated</div>

  return <div>Welcome {user.name}!</div>
}
```

## Resources

- **Supabase Dashboard:** https://supabase.com/dashboard/project/bfzynfnowzkvhvleocny
- **Auth Setup Guide:** See `AUTH_SETUP.md`
- **Database Schema:** See `SCHEMA_SUMMARY.md`
- **Next.js Docs:** https://nextjs.org/docs
- **shadcn/ui:** https://ui.shadcn.com

## Need Help?

Check these in order:
1. Browser console for errors (F12)
2. Terminal for server errors
3. Supabase Auth logs in dashboard
4. `.env.local` file is correct
5. Database RLS policies are set

Happy coding! 🚀
