# First User Setup

The trigger automatically creates a user profile when you sign up. You just need to promote your user to board member.

## Step 1: Find your user ID
Run this in Supabase SQL Editor:
```sql
SELECT id, email, name, role FROM public.users;
```

## Step 2: Add board role to your user
Replace `YOUR_USER_ID` with the id from step 1:
```sql
UPDATE public.users
SET role = ARRAY['board']
WHERE id = 'YOUR_USER_ID';
```

Or if you want both member and board:
```sql
UPDATE public.users
SET role = ARRAY['member', 'board']
WHERE id = 'YOUR_USER_ID';
```

## Step 3: Update your profile (optional)
```sql
UPDATE public.users
SET
  name = 'Your First Name',
  surname = 'Your Last Name',
  license_number = 'LICENSE123'
WHERE id = 'YOUR_USER_ID';
```

That's it! Refresh your app and you should have board access.
