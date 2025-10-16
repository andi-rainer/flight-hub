# FlightHub Authentication System Setup Guide

This guide covers the complete authentication system implementation for FlightHub.

## Overview

The authentication system includes:
- Email/password authentication using Supabase Auth
- Protected routes with middleware
- User profile management
- Role-based access control (Member/Board)
- Dark mode support
- Responsive sidebar navigation
- User menu with avatar

## File Structure

```
/Users/andreas/Documents/Coding/Projects/SFC/flight-hub/
├── app/
│   ├── (dashboard)/                    # Protected dashboard routes
│   │   ├── layout.tsx                  # Dashboard layout with sidebar
│   │   ├── dashboard/page.tsx          # Main dashboard
│   │   ├── aircrafts/page.tsx          # Aircraft management
│   │   ├── reservations/page.tsx       # Reservations calendar
│   │   ├── flightlog/page.tsx          # Flight log
│   │   ├── members/page.tsx            # Member management (Board only)
│   │   ├── documents/page.tsx          # Document management
│   │   └── settings/page.tsx           # User settings
│   ├── auth/
│   │   ├── callback/route.ts           # OAuth callback handler
│   │   └── auth-code-error/page.tsx    # Error page for failed auth
│   ├── login/page.tsx                  # Login page
│   └── layout.tsx                      # Root layout with ThemeProvider
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx                 # Desktop & mobile sidebar navigation
│   │   ├── header.tsx                  # Top header with mobile menu
│   │   ├── user-menu.tsx               # User dropdown menu
│   │   └── mode-toggle.tsx             # Dark mode toggle
│   ├── providers/
│   │   └── theme-provider.tsx          # Theme provider component
│   └── ui/                             # shadcn/ui components
├── lib/
│   ├── actions/
│   │   └── auth.ts                     # Server actions for auth
│   ├── hooks/
│   │   └── use-user.ts                 # Hook to get current user
│   ├── supabase/
│   │   ├── client.ts                   # Supabase client for Client Components
│   │   └── server.ts                   # Supabase client for Server Components
│   ├── utils/
│   │   └── user.ts                     # User utility functions
│   └── database.types.ts               # TypeScript types from Supabase
└── middleware.ts                       # Route protection middleware
```

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://bfzynfnowzkvhvleocny.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=FlightHub
```

**Get your Supabase keys:**
1. Go to https://supabase.com/dashboard/project/bfzynfnowzkvhvleocny/settings/api
2. Copy the Project URL to `NEXT_PUBLIC_SUPABASE_URL`
3. Copy the anon/public key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy the service_role key to `SUPABASE_SERVICE_ROLE_KEY`

### 2. Install Dependencies

All dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 3. Database Setup

The database schema is already deployed. Ensure your Supabase database has:
- Users table with RLS policies
- Auth configured for email/password
- Proper role configurations

### 4. Run the Development Server

```bash
npm run dev
```

Visit http://localhost:3000 - you should be redirected to the login page.

## Authentication Flow

### Login Process

1. User visits `/login`
2. Enters email and password
3. Supabase validates credentials
4. On success, session is created
5. User is redirected to `/dashboard`
6. Middleware validates session on each request

### Protected Routes

The middleware protects these routes:
- `/dashboard` - Main dashboard
- `/aircrafts` - Aircraft management
- `/reservations` - Reservation calendar
- `/flightlog` - Flight logs
- `/members` - Member management (Board only)
- `/documents` - Document library
- `/settings` - User settings

Unauthenticated users are redirected to `/login`.

### Logout Process

1. User clicks "Log out" in user menu
2. Client calls Supabase sign out
3. Session is cleared
4. User is redirected to `/login`

## User Roles

Users can have the following roles (stored in `users.role` array):

- **member** - Standard club member
- **board** - Board member with administrative privileges

### Role-Based Navigation

The sidebar automatically shows/hides menu items based on user role:
- "Members" link only visible to board members
- Check role with `useUser().isBoardMember`

## Components

### Server Components (Default)

These components fetch data server-side:
- `/app/(dashboard)/*/page.tsx` - All dashboard pages
- `/app/(dashboard)/layout.tsx` - Dashboard layout

### Client Components ('use client')

These components require client-side interactivity:
- `components/layout/sidebar.tsx` - Navigation state
- `components/layout/user-menu.tsx` - Dropdown menu
- `components/layout/header.tsx` - Mobile menu
- `app/login/page.tsx` - Form handling

## Hooks and Utilities

### useUser Hook

```typescript
const { user, authUser, isLoading, error, isBoardMember } = useUser()
```

- `user` - User profile from public.users table
- `authUser` - Auth user from Supabase Auth
- `isLoading` - Loading state
- `error` - Any errors
- `isBoardMember` - Boolean helper

### User Utilities

```typescript
import { isBoardMember, getUserInitials, getUserFullName } from '@/lib/utils/user'

isBoardMember(user) // Check if board member
getUserInitials(user) // Get initials for avatar
getUserFullName(user) // Get full name
```

## Supabase Client Usage

### In Server Components

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data } = await supabase.from('users').select('*')
```

### In Client Components

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data } = await supabase.from('users').select('*')
```

### Server Actions

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'

export async function myAction() {
  const supabase = await createClient()
  // ... perform action
}
```

## Dark Mode

Dark mode is implemented using `next-themes`:

- Toggle via user menu (top right)
- Persists across sessions
- Supports system preference
- Uses Tailwind's `dark:` classes

## Responsive Design

The layout is fully responsive:

- **Desktop (md+)**: Persistent sidebar + header
- **Mobile**: Collapsible sheet sidebar via hamburger menu
- Breakpoint: 768px (Tailwind's `md` breakpoint)

## Security Features

1. **Row Level Security (RLS)** - Enforced at database level
2. **Middleware Protection** - Guards all protected routes
3. **Session Refresh** - Automatic token refresh
4. **Server-Side Validation** - Auth checks on server
5. **Cookie-Based Sessions** - Secure session management

## Testing the Auth System

### Manual Testing Checklist

1. **Login Flow**
   - [ ] Can access login page at `/login`
   - [ ] Form validation works (empty fields)
   - [ ] Incorrect credentials show error
   - [ ] Correct credentials redirect to dashboard
   - [ ] Remember me / session persists

2. **Protected Routes**
   - [ ] Unauthenticated access redirects to login
   - [ ] Authenticated access works
   - [ ] Role-based access (Members page)

3. **Navigation**
   - [ ] Sidebar links work
   - [ ] Active state highlights current page
   - [ ] Mobile menu opens/closes
   - [ ] Board-only items hidden for members

4. **User Menu**
   - [ ] Shows correct user name and email
   - [ ] Avatar shows correct initials
   - [ ] Dropdown menu works
   - [ ] Logout redirects to login

5. **Dark Mode**
   - [ ] Toggle switches themes
   - [ ] Preference persists
   - [ ] System theme detection works

## Troubleshooting

### "Invalid API Key" Error

- Check `.env.local` has correct Supabase keys
- Ensure keys don't have extra spaces
- Restart dev server after changing env vars

### Redirect Loop

- Clear browser cookies for localhost:3000
- Check middleware.ts is not conflicting
- Verify user exists in public.users table

### "User not found" After Login

- Ensure user profile exists in public.users table
- Check database trigger creates profile on signup
- Verify RLS policies allow user to read their profile

### Middleware Not Working

- Check file is named `middleware.ts` (not .js)
- Verify it's in the root directory
- Check config.matcher includes your routes

## Next Steps

After authentication is working:

1. Implement aircraft management pages
2. Build reservation calendar
3. Create flight log entry forms
4. Add member management for board users
5. Implement document upload/viewing
6. Add user settings pages
7. Create dashboard statistics

## Additional Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [next-themes Docs](https://github.com/pacocoursey/next-themes)

## Support

For issues or questions:
1. Check the Supabase dashboard for auth logs
2. Review browser console for errors
3. Check server logs in terminal
4. Verify environment variables are set
