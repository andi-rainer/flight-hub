# FlightHub ✈️

A production-grade web application for managing aircraft reservations, flight logs, and club member administration for small aviation and skydiving clubs.

## Features

- ✅ **Authentication** - Secure email/password login with Supabase Auth
- ✅ **Dashboard** - Overview of reservations, account balance, flights, and notifications
- ✅ **Aircraft Management** - Track aircraft, documents, and flight logs
- ✅ **Member Management** - User administration with roles and document approval
- ✅ **Documents** - Club document library with categories and search
- ✅ **Settings** - Function management and user profile settings
- ⏳ **Reservations** - Calendar-based booking system (coming soon)
- ⏳ **Flight Logs** - Flight logging with treasurer charging (coming soon)

## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Backend:** Supabase (Auth, Postgres, Storage)
- **Deployment:** Vercel

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account and project
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/andi-rainer/flight-hub.git
cd flight-hub

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Database Setup

The database migrations are already in `/supabase/migrations/`. To apply them:

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Create First User

1. Run the development server:
```bash
npm run dev
```

2. Navigate to http://localhost:3000

3. Sign up with your email/password

4. Promote your user to board member in Supabase SQL Editor:
```sql
-- Find your user ID
SELECT id, email FROM public.users;

-- Add board role
UPDATE public.users
SET role = ARRAY['board']
WHERE id = 'your-user-id';
```

See `FIRST_USER_SETUP.md` for detailed instructions.

### Create Storage Buckets

Create these buckets in your Supabase Dashboard (Storage section):
- `aircraft-documents` (public)
- `club-documents` (public)
- `user-documents` (private)
- `flight-logs` (private)

## Project Structure

```
flight-hub/
├── app/
│   ├── (dashboard)/          # Protected routes with sidebar
│   │   ├── dashboard/        # Main dashboard
│   │   ├── aircrafts/        # Aircraft management
│   │   ├── members/          # Member management (board only)
│   │   ├── documents/        # Club documents
│   │   ├── settings/         # Settings (board only)
│   │   ├── reservations/     # Reservations (WIP)
│   │   └── flightlog/        # Flight logs (WIP)
│   ├── login/                # Login page
│   └── layout.tsx            # Root layout
├── components/
│   ├── layout/               # Sidebar, header, navigation
│   ├── providers/            # Theme provider
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── supabase/             # Supabase clients
│   ├── actions/              # Server actions
│   ├── hooks/                # React hooks
│   └── utils/                # Utility functions
├── supabase/
│   ├── migrations/           # Database migrations
│   └── SCHEMA_DOCUMENTATION.md
└── middleware.ts             # Route protection
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## User Roles

- **Member:** Can view data, create reservations, log flights, upload personal documents
- **Board:** Full access to all features including member management, document approval, settings

## Key Features Detail

### Dashboard
- Quick stats for reservations, balance, costs, notifications
- Upcoming reservations by aircraft
- Account transactions history
- Recent flight logs

### Aircraft Management
- List all aircraft with search and filters
- Aircraft details with specifications
- Document management with expiry tracking
- Flight logs history per aircraft

### Member Management (Board Only)
- Invite new members via email
- Assign roles and functions
- Approve user documents (licenses, medical, ID)
- Track document expiry dates

### Documents
- Upload and categorize club documents
- Search and filter by category
- Download documents
- Board can upload, rename, delete

### Settings (Board Only)
- Manage club functions (Pilot, Skydiver, Student, etc.)
- Set yearly billing rates per function
- User profile settings for all users

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Environment Variables

Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Documentation

- **Project Status:** `PROJECT_STATUS.md` - Current implementation status
- **Schema:** `supabase/SCHEMA_DOCUMENTATION.md` - Complete database schema
- **Quick Start:** `QUICK_START.md` - 5-minute setup guide
- **Auth Setup:** `AUTH_SETUP.md` - Authentication documentation
- **First User:** `FIRST_USER_SETUP.md` - Fix for user creation

## Contributing

This is a private project for a specific aviation club. For feature requests or bug reports, please create an issue.

## License

Private - All rights reserved

## Support

For questions or issues, contact the development team or create an issue in the GitHub repository.

---

Built with ❤️ using Next.js, Supabase, and shadcn/ui

**Project Status:** 78% Complete (7/9 major features implemented)
**Last Updated:** October 2025
