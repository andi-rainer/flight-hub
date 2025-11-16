# FlightHub ✈️

A production-grade web application for managing aircraft reservations, flight logs, and club member administration for small aviation and skydiving clubs.

> 🚀 **New to FlightHub?** Start with [GETTING_STARTED.md](./GETTING_STARTED.md) for a complete overview of local development and automated deployments.

## Features

- ✅ **Authentication** - Secure email/password login with Supabase Auth
- ✅ **Dashboard** - Overview of reservations, account balance, flights, and notifications
- ✅ **Aircraft Management** - Track aircraft, documents, and flight logs
- ✅ **Member Management** - User administration with roles and document approval
- ✅ **Documents** - Club document library with categories and search
- ✅ **Settings** - Function management and user profile settings
- ✅ **Billing & Accounting** - Cost centers, transactions, and financial tracking
- ✅ **Permissions** - Granular function-based permission management
- ⏳ **Reservations** - Calendar-based booking system (in progress)
- ✅ **Flight Logs** - Flight logging with split charging and atomic reversals

## Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Backend:** Supabase (Auth, Postgres, Storage)
- **Deployment:** Vercel

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Docker Desktop (for local development)
- Supabase CLI (`brew install supabase/tap/supabase`)
- Git

### Local Development Setup (Recommended)

For development, use a local Supabase instance for a clean, isolated testing environment:

```bash
# Clone the repository
git clone https://github.com/andi-rainer/flight-hub.git
cd flight-hub

# Install dependencies
npm install

# Run automated setup script
./setup-local-supabase.sh
```

This will:
- Start local Supabase (PostgreSQL, Auth, Storage, etc.)
- Apply all migrations from `supabase/migrations/`
- Configure `.env.local` with local credentials
- Provide you with a clean database for testing

**Manual Setup:**

```bash
# Start local Supabase
npm run supabase:start

# Copy local credentials to .env.local
# (see output from supabase start)
```

See **[LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)** for complete documentation.

### Cloud Setup (Production)

For production deployment on Vercel:

```bash
# Setup environment variables
cp .env.example .env.local
```

Edit `.env.local` with your Supabase cloud credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Automated Deployments

Production deployments are handled by GitHub Actions:

```bash
# Push to main triggers automatic deployment
git push origin main

# GitHub Actions will:
# 1. Apply database migrations to production
# 2. Deploy to Vercel
# 3. Post deployment summary
```

See **[GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md)** for configuration details.

### Database Migrations

```bash
# Test migrations locally
npm run supabase:reset

# Deploy to production (via GitHub Actions)
git push origin main
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
- `aircraft-documents` (public) - Aircraft-related documents
- `club-documents` (public) - General club documents
- `user-documents` (private) - User licenses, medical certificates, ID
- `flight-logs` (private) - Flight log records

RLS policies for storage buckets are automatically created by migration `20250202100007_storage_buckets.sql`

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
│   │   ├── billing/          # Billing/cost center management
│   │   ├── accounting/       # Accounting transactions (board)
│   │   ├── permissions/      # Function/permission management
│   │   ├── reservations/     # Reservations (WIP)
│   │   └── flightlog/        # Flight logs (WIP)
│   ├── api/                  # API routes (18 route handlers)
│   │   ├── documents/        # Document management API
│   │   ├── users/            # User search, balance, tracking
│   │   └── functions/        # System functions API
│   ├── login/                # Login page
│   ├── forgot-password/      # Password reset flow
│   └── layout.tsx            # Root layout
├── components/
│   ├── layout/               # Sidebar, header, navigation
│   ├── providers/            # Theme provider
│   └── ui/                   # shadcn/ui components (33 files)
├── lib/
│   ├── supabase/             # Supabase clients
│   ├── actions/              # Server actions (13+ files)
│   ├── permissions/          # RBAC permission system
│   ├── constants/            # System function definitions
│   ├── hooks/                # React hooks
│   └── utils/                # Utility functions
├── supabase/
│   ├── migrations/           # Database migrations (19 files)
│   ├── SCHEMA_DOCUMENTATION.md
│   └── QUICK_REFERENCE.md
├── __tests__/                # Test files and utilities
└── middleware.ts             # Auth + locale middleware
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

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Testing

FlightHub uses a **hybrid testing strategy** for comprehensive coverage:

### Business Logic Tests
- **Framework:** Jest 29.x with @testing-library/react
- **Location:** `__tests__/actions/`
- **Coverage:** 21 passing tests for flight charging system
- **Focus:** Percentage validation, split calculations, transaction conventions, state transitions

### Test Files
- `__tests__/actions/flight-charging-simple.test.ts` - Core business logic (21 tests)
- `__tests__/utils/flight-charging-mocks.ts` - Mock utilities for Supabase

### Documentation
- `TESTING_STRATEGY.md` - Complete testing approach and guide
- `FLIGHT_CHARGING_TEST_PLAN.md` - 70+ manual test scenarios

### Running Tests
```bash
# Run flight charging tests
npm test -- __tests__/actions/flight-charging-simple.test.ts

# Run all tests
npm test

# Watch mode for development
npm test -- --watch
```

## Authorization System

### Role-Based Access (Legacy)
- **Member:** Default role for all users
- **Board:** Board members with elevated privileges

### Function-Based Permissions (Granular RBAC)
FlightHub implements a hybrid authorization system combining roles with function-based permissions:

**System Functions:**
- **Aviation:** Pilot, Flight Instructor, Chief Pilot
- **Skydiving:** Tandem Master, Skydive Instructor, Sport Jumper
- **Operations:** Manifest Coordinator
- **Administration:** Treasurer, Chairman, Secretary

**Features:**
- Users can have multiple functions with validity periods (valid_from/valid_until)
- Custom functions can be created by board members
- Granular permissions control feature access (30+ permissions)
- Function assignments tracked in `user_functions` junction table

**Permission Examples:**
- `flight.log.create` - Pilot, Flight Instructor
- `flight.log.approve` - Chief Pilot, Board
- `billing.view.all` - Board, Treasurer
- `documents.approve` - Board

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
- Configure membership types and tandem registration

### Billing & Accounting (Board Only)
- Cost centers for expense allocation
- User account management and balance tracking
- Transaction creation and reversal with tracking
- Flight charging from locked flight logs with split charging support
- **Split Charging:** Distribute flight costs across multiple users/cost centers by percentage
- **Atomic Reversals:** Reversing split charges reverses ALL related transactions together
- **Operation Type Defaults:** Pre-configured cost splits per operation type (e.g., maintenance)
- Account balance reports and history

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
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Documentation

### Core Documentation
- **Complete Documentation:** `CLAUDE.md` - Comprehensive codebase documentation
- **Project Status:** `PROJECT_STATUS.md` - Current implementation status
- **Schema:** `supabase/SCHEMA_DOCUMENTATION.md` - Complete database schema
- **Quick Reference:** `supabase/QUICK_REFERENCE.md` - Common SQL queries
- **Auth Setup:** `AUTH_SETUP.md` - Authentication documentation
- **Schema Summary:** `SCHEMA_SUMMARY.md` - Database schema summary

### Testing Documentation
- **Testing Strategy:** `TESTING_STRATEGY.md` - Hybrid testing approach and guide
- **Flight Charging Test Plan:** `FLIGHT_CHARGING_TEST_PLAN.md` - 70+ test scenarios

### Feature Documentation
- **Operation Type Cost Splitting:** `OPERATION_TYPE_COST_SPLITTING.md` - Split charging and reversals

## Contributing

This is a private project for a specific aviation club. For feature requests or bug reports, please create an issue.

## License

Private - All rights reserved

## Support

For questions or issues, contact the development team or create an issue in the GitHub repository.

---

Built with ❤️ using Next.js, Supabase, and shadcn/ui

**Project Status:** ~85% Complete (8.5/9 major features implemented)
**Last Updated:** November 13, 2025

### Recent Updates
- ✅ Fixed split charge reversal bug (atomic reversals for all related transactions)
- ✅ Added comprehensive testing strategy with 21 passing business logic tests
- ✅ Created detailed test plan with 70+ manual test scenarios
- ✅ Enhanced flight charging documentation
