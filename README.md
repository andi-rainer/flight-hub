# FlightHub ✈️

**Production-ready web application for managing aircraft reservations, flight logs, member administration, and financial tracking for aviation and skydiving clubs.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](https://flighthub-staging.vercel.app)

> 📖 **Comprehensive Documentation**: See [CLAUDE.md](./CLAUDE.md) for complete codebase documentation (1300+ lines)

## ✨ Features

### Core Functionality
- ✅ **Authentication** - Secure login with Supabase Auth (24-hour invite tokens)
- ✅ **Dashboard** - Real-time overview of reservations, balance, flights, and alerts
- ✅ **Aircraft Management** - Track aircraft, documents, maintenance, and components
- ✅ **Member Management** - User administration, document approval, function assignment
- ✅ **Reservations** - Calendar-based booking with conflict detection
- ✅ **Flight Logs** - Comprehensive logging with approval workflow and locking
- ✅ **Documents** - Club library with categories, search, and expiry tracking
- ✅ **Endorsements** - Aviation ratings (SEP, MEP, IR) with separate IR expiry tracking
- ✅ **Billing & Accounting** - Split charges, cost centers, atomic reversals
- ✅ **Settings** - Functions, membership types, fees, board contact information
- ✅ **Permissions** - Granular RBAC (role-based + function-based)

### Recent Additions (November 2025)
- 🆕 **Endorsement System** - Centralized endorsements with IR (Instrument Rating) support
- 🆕 **Board Contact Settings** - Configurable contact info for multi-club deployment
- 🆕 **Split Charge Reversal** - Atomic reversal of all flight transactions
- 🆕 **24-Hour Invitations** - Fixed invite token expiry

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop (for local Supabase)
- Supabase CLI: `brew install supabase/tap/supabase`

### Local Development

```bash
# Clone repository
git clone https://github.com/your-org/flight-hub.git
cd flight-hub

# Install dependencies
npm install

# Start Supabase locally
npm run supabase:start

# Run migrations
npm run supabase:reset

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5.x |
| **Styling** | Tailwind CSS 4 + PostCSS |
| **UI Components** | shadcn/ui (Radix primitives) |
| **Database** | PostgreSQL (via Supabase) |
| **Auth** | Supabase Auth |
| **Storage** | Supabase Storage |
| **State** | Server Components + Server Actions |
| **Forms** | react-hook-form + Zod |
| **i18n** | next-intl (German/English) |
| **Testing** | Jest + React Testing Library |
| **Deployment** | Vercel |

## 📁 Project Structure

```
flight-hub/
├── app/                      # Next.js App Router
│   ├── (dashboard)/          # Protected routes with sidebar
│   │   ├── aircrafts/        # Aircraft management
│   │   ├── members/          # Member administration
│   │   ├── reservations/     # Flight booking calendar
│   │   ├── flightlog/        # Flight logging
│   │   ├── billing/          # Cost centers & rates
│   │   ├── accounting/       # Transactions
│   │   ├── documents/        # Club documents
│   │   └── settings/         # System configuration
│   ├── api/                  # API routes (18 handlers)
│   └── auth/                 # Authentication pages
├── components/               # Reusable React components
│   ├── ui/                   # shadcn/ui components
│   └── layout/               # Layout components
├── lib/                      # Server-side utilities
│   ├── actions/              # Server actions (13+ files)
│   ├── permissions/          # RBAC system
│   └── supabase/             # Supabase clients
├── supabase/                 # Database
│   ├── migrations/           # Schema migrations (10+ files)
│   └── SCHEMA_DOCUMENTATION.md
└── __tests__/                # Jest tests
```

## 🗄️ Database

**11 Core Tables:**
- `users` - User profiles with roles
- `functions_master` - System & custom functions
- `user_functions` - User-function assignments
- `planes` - Aircraft fleet
- `reservations` - Flight bookings
- `flightlog` - Flight records
- `documents` - Universal document management
- `endorsements` - Aviation ratings (NEW)
- `document_endorsement_privileges` - Endorsements with IR tracking (NEW)
- `accounts` - Financial transactions
- `board_contact_settings` - Contact information (NEW)

**4 Materialized Views:**
- `active_reservations` - Filtered future reservations
- `flightlog_with_times` - Calculated flight times
- `user_balances` - Account balances
- `functions_with_stats` - Functions with user counts

## 🔐 Security

- ✅ **Row Level Security (RLS)** on all tables
- ✅ **Hybrid RBAC** - Role-based + function-based permissions
- ✅ **Server-side validation** for all mutations
- ✅ **Session management** via HTTP-only cookies
- ✅ **Audit trails** for sensitive operations
- ✅ **Permission matrix** - 30+ granular permissions

## 🧪 Testing

```bash
npm test                 # Run tests
npm run test:coverage    # Coverage report
npm run test:watch       # Watch mode
```

**Test Coverage:**
- Unit tests for server actions
- API route tests
- Business logic tests (flight charging/reversal)
- Component tests

## 🌍 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[CLAUDE.md](./CLAUDE.md)** | Complete codebase documentation (1300+ lines) |
| **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** | Feature implementation status |
| **[AUTH_SETUP.md](./AUTH_SETUP.md)** | Authentication setup guide |
| **[LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)** | Local development guide |
| **[supabase/SCHEMA_DOCUMENTATION.md](./supabase/SCHEMA_DOCUMENTATION.md)** | Database schema docs |
| **[supabase/QUICK_REFERENCE.md](./supabase/QUICK_REFERENCE.md)** | Common SQL queries |

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Dev server (Turbopack)
npm run dev:stable       # Dev server (stable)
npm run build            # Production build
npm run start            # Production server

# Database
npm run supabase:start   # Start local Supabase
npm run supabase:stop    # Stop Supabase
npm run supabase:reset   # Reset DB (migrations + seed)
npm run supabase:push    # Push migrations to remote

# Code Quality
npm run lint             # ESLint
npm test                 # Jest tests
```

## 🚢 Deployment

### Vercel
1. Connect GitHub repo to Vercel
2. Configure environment variables
3. Deploy automatically on push to main

### Supabase
1. Create project at [supabase.com](https://supabase.com)
2. Run: `npm run supabase:push`
3. Configure Auth settings:
   - **Site URL**: Your production URL
   - **Redirect URLs**: Add your domain

## 📝 Recent Updates

### November 17, 2025
- ✅ Endorsement system redesign with IR tracking
- ✅ Board contact settings for multi-club support
- ✅ Fixed 24-hour invitation token expiry
- ✅ Document definition filter bug fixes
- ✅ TypeScript type improvements
- ✅ Dialog overflow fixes

### November 13, 2025
- ✅ Split charge reversal fix (atomic)
- ✅ 21 automated business logic tests
- ✅ Granular RBAC system
- ✅ Membership system

## 🤝 Contributing

This is a private project for an Austrian aviation club.

## 📄 License

Proprietary - All Rights Reserved

## 📞 Support

- 📖 Documentation: `CLAUDE.md`
- 🗄️ Database Schema: `supabase/SCHEMA_DOCUMENTATION.md`
- 💬 Board Contact: Settings → Board Contact (if configured)

---

**Built with ❤️ for the Austrian Aviation Community**

*Stack: Next.js 15 • TypeScript • Supabase • Tailwind CSS • shadcn/ui*
