# FlightHub - Complete Codebase Documentation

**Project**: Flight Club Management System (Austrian Aviation Club)
**Stack**: Next.js 15 + Supabase + shadcn/ui + Tailwind CSS
**Status**: Production Ready
**Last Updated**: November 23, 2025

---

## 1. PROJECT OVERVIEW

FlightHub is a production-grade web application for managing aircraft reservations, flight logs, member administration, and financial tracking for aviation and skydiving clubs. The application is built for an Austrian club and uses EUR currency and German language as defaults.

### Key Characteristics
- **Multi-Purpose**: Supports both general aviation and skydiving operations
- **Hybrid RBAC System**: Combines role-based (board/member) with function-based permissions
- **Comprehensive Document Management**: Tracks documents with expiry dates and approval workflows
- **Financial Tracking**: Integrated accounting system for billing and transactions
- **Real-time Features**: Supabase Realtime for notifications and document updates

---

## 2. TECH STACK & ARCHITECTURE

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4 + PostCSS
- **UI Library**: shadcn/ui (Radix UI primitives)
- **Internationalization**: next-intl (German/English)
- **Dark Mode**: next-themes
- **Icons**: lucide-react
- **Forms**: react-hook-form + Zod validation
- **Calendar**: react-big-calendar (for reservations)
- **Toast Notifications**: sonner

### Backend
- **API**: Next.js App Router API routes (REST)
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (email/password + OAuth ready)
- **Session Management**: Cookie-based with Supabase SSR
- **Storage**: Supabase Storage (for documents, aircraft docs, flight logs)

### Database Design
- **Tables**: 16 core tables (users, planes, flightlog, documents, accounts, endorsements, manifest tables, etc.)
- **Views**: 4 materialized views (active_reservations, flightlog_with_times, user_balances, functions_with_stats)
- **Functions**: 6 PostgreSQL helper functions (including get_user_endorsement_alerts, check_slot_conflict)
- **Security**: Row Level Security (RLS) on all tables
- **Indexes**: 50+ strategic indexes for performance

### Testing
- **Framework**: Jest 29.x
- **Testing Library**: @testing-library/react + @testing-library/user-event
- **Environment**: jsdom
- **Coverage**: Targets app/ and lib/ directories

### Development Tools
- **Build Tool**: Turbopack (experimental in Next.js 15)
- **Linting**: ESLint 9 (with Next.js config)
- **Task Running**: npm scripts
- **Version Control**: Git + GitHub

---

## 3. PROJECT STRUCTURE

```
flight-hub/
├── app/                                  # Next.js App Router
│   ├── (dashboard)/                      # Protected routes with sidebar layout
│   │   ├── layout.tsx                    # Dashboard layout with sidebar/header
│   │   ├── dashboard/                    # Main dashboard page
│   │   ├── aircrafts/                    # Aircraft management
│   │   │   ├── page.tsx                  # Aircraft list
│   │   │   ├── [id]/page.tsx             # Aircraft detail with tabs
│   │   │   └── components/               # Aircraft-related components
│   │   ├── reservations/                 # Flight reservations (calendar-based)
│   │   ├── flightlog/                    # Flight logging interface
│   │   ├── manifest/                     # Skydive manifest system
│   │   │   ├── page.tsx                  # Operation days list
│   │   │   ├── [id]/page.tsx             # Operation day detail
│   │   │   └── components/               # Manifest-related components
│   │   ├── members/                      # Member management (board only)
│   │   ├── documents/                    # Club documents library
│   │   ├── billing/                      # Billing/cost center management
│   │   ├── accounting/                   # Accounting transactions (board)
│   │   ├── settings/                     # Settings (board only)
│   │   └── permissions/                  # Function/permission management
│   ├── auth/                             # Authentication pages
│   │   ├── callback/route.ts             # OAuth callback handler
│   │   └── auth-code-error/page.tsx      # Auth error page
│   ├── api/                              # API routes (18 route handlers)
│   │   ├── documents/                    # Document management API
│   │   ├── users/                        # User search, balance, tracking
│   │   ├── functions/route.ts            # System functions API
│   │   └── registration/tandem/          # Tandem skydive registration
│   ├── login/page.tsx                    # Login page
│   ├── forgot-password/page.tsx          # Password reset flow
│   ├── reset-password/page.tsx           # Password reset confirm
│   ├── account-inactive/page.tsx         # Inactive account page
│   ├── layout.tsx                        # Root layout (theme, i18n provider)
│   ├── page.tsx                          # Root redirect page
│   └── globals.css                       # Global Tailwind styles
│
├── components/                           # Reusable React components (33 files)
│   ├── layout/                           # Layout components
│   │   ├── sidebar.tsx                   # Desktop/mobile navigation sidebar
│   │   ├── header.tsx                    # Top header with mobile menu
│   │   ├── user-menu.tsx                 # User dropdown menu
│   │   └── mode-toggle.tsx               # Dark mode toggle button
│   ├── ui/                               # shadcn/ui base components
│   │   └── [button, card, input, etc.]   # Primitive UI components
│   ├── providers/                        # Context providers
│   │   └── theme-provider.tsx            # Theme context
│   ├── person-selector.tsx               # Smart person selector (pilots, instructors, etc.)
│   └── language-switcher.tsx             # Language toggle (DE/EN)
│
├── lib/                                  # Utility and server-side code
│   ├── supabase/                         # Supabase clients
│   │   ├── server.ts                     # Server-side Supabase client + helpers
│   │   └── client.ts                     # Client-side Supabase client
│   ├── permissions/                      # RBAC permission system
│   │   └── index.ts                      # Permission matrix, checking functions
│   ├── constants/                        # Application constants
│   │   └── system-functions.ts           # System function definitions + helpers
│   ├── actions/                          # Server actions (14 files)
│   │   ├── auth.ts                       # Authentication actions
│   │   ├── members.ts                    # Member management actions
│   │   ├── functions.ts                  # Function management
│   │   ├── billing.ts                    # Billing operations
│   │   ├── accounting.ts                 # Accounting transactions
│   │   ├── aircraft-components.ts        # Aircraft maintenance components
│   │   ├── manifest.ts                   # Skydive manifest actions
│   │   └── [others]                      # Additional domain actions
│   ├── hooks/                            # React hooks
│   │   └── use-user.ts                   # useUser hook for auth state
│   ├── utils/                            # Utility functions
│   │   ├── user.ts                       # User profile utilities
│   │   ├── format.ts                     # Number/currency formatting
│   │   └── [other utilities]
│   ├── database.types.ts                 # Generated Supabase types (3491 lines)
│   ├── format.ts                         # Format utilities
│   └── utils.ts                          # General utilities (cn, etc.)
│
├── supabase/                             # Database and migrations
│   ├── migrations/                       # Database migrations (10+ files)
│   │   ├── 20250202100000_schema.sql     # Core schema
│   │   └── [others]
│   ├── SCHEMA_DOCUMENTATION.md           # Comprehensive schema docs
│   ├── README.md                         # Supabase setup guide
│   └── QUICK_REFERENCE.md                # Quick SQL queries
│
├── hooks/                                # Legacy hooks directory
├── __tests__/                            # Test files and test utilities
├── .vscode/                              # VS Code settings
├── .idea/                                # IntelliJ settings
├── coverage/                             # Jest coverage reports
├── .next/                                # Next.js build output
│
├── middleware.ts                         # Auth + locale middleware
├── i18n.ts                               # i18n configuration
├── next.config.ts                        # Next.js configuration
├── tsconfig.json                         # TypeScript configuration
├── tailwind.config.ts                    # Tailwind CSS config
├── jest.config.ts                        # Jest test configuration
├── jest.setup.ts                         # Jest setup file
├── eslint.config.mjs                     # ESLint configuration
├── components.json                       # shadcn/ui configuration
├── package.json                          # Dependencies and scripts
│
├── CLAUDE.md                             # This documentation
├── README.md                             # Project overview
├── AUTH_SETUP.md                         # Authentication setup guide
├── SCHEMA_SUMMARY.md                     # Database schema summary
├── PROJECT_STATUS.md                     # Feature implementation status
└── [other documentation files]
```

---

## 4. DATABASE SCHEMA & ARCHITECTURE

### Core Tables (16 tables with RLS)

#### users
- User profiles extending Supabase auth.users
- Fields: id (UUID), email, name, surname, role (TEXT[]), functions (legacy), phone, tandem_jump_completed, tandem_jump_date, etc.
- Tandem jump tracking: Tracks if user has completed a tandem jump and when
- Trigger auto-creates entry on auth signup
- RLS: Users see all profiles, can edit own, board can edit any

#### functions_master
- Club functions/roles (Pilot, Flight Instructor, Tandem Master, Treasurer, etc.)
- Hybrid approach: System functions (hardcoded) + Custom functions (board-defined)
- Fields: id, code (UNIQUE), name, name_de, category_id, is_system, active, yearly_fee
- Validation: System function codes cannot be changed/deleted

#### user_functions (Junction Table)
- Many-to-many relationship between users and functions
- Fields: user_id, function_id, assigned_at, assigned_by, valid_from, valid_until
- Enables granular permission checking per function
- Unique constraint on (user_id, function_id)

#### function_categories
- Organizes functions: Aviation, Skydiving, Operations, Administration, Custom
- Used for UI grouping and logical organization
- Fields: id, code (UNIQUE), name_en, name_de, sort_order

#### planes
- Aircraft fleet with specifications
- Fields: id, tail_number, type, registration, manufacturer, year_built, total_hours, max_jumpers, is_skydive_aircraft, etc.
- Skydive support: max_jumpers field for skydive operations, is_skydive_aircraft flag
- Constraint: Non-skydive aircraft cannot have max_jumpers set
- Status tracking: active, maintenance_status
- RLS: All can read, board can edit

#### reservations
- Flight bookings with conflict prevention logic
- Fields: id, plane_id, user_id, start_time, end_time, status, remarks, priority
- Status enum: active, standby, cancelled
- Validation: end_time > start_time

#### flightlog
- Flight records with time calculations
- Fields: id, plane_id, pilot_id, copilot_id, block_on, block_off, takeoff, landing, etc.
- Locking mechanism: locked flag prevents modifications, charge flag for billing
- Time calculations via triggers
- RLS: Pilot can create/edit own, board can lock/charge

#### documents
- Unified document management for club docs, aircraft docs, user docs
- Fields: id, name, category, file_url, uploaded_by, plane_id, user_id, blocks_aircraft
- Status: approved flag, expiry_date for tracking renewal
- Check constraint: Exactly one of (plane_id, user_id) or neither (club docs)
- Blocks aircraft feature: Approved docs with blocks_aircraft=true prevent reservations

#### accounts
- Financial transaction ledger
- Fields: id, user_id, amount (positive/negative), description, flightlog_id, created_by
- Reversal tracking: reversal_transaction_id, reverses_transaction_id
- RLS: Users see own, board can see all and create

#### notifications
- User notifications system
- Fields: id, user_id, type, title, message, link, document_id, read, created_at
- Used for document approvals, expiry warnings, flight approvals

#### manifest_settings
- Global configuration for skydive manifest system
- Fields: id, payment_types (JSONB array), default_altitude_feet
- Single-row table (enforced by CHECK constraint)
- RLS: All can read, board can update

#### skydive_operation_days
- Daily skydiving operations
- Fields: id, operation_date, plane_id, pilot_id, notes, status (planned/active/completed/cancelled)
- Links aircraft and pilot for the day
- RLS: All can read, manifest coordinators can create/edit

#### skydive_flights
- Individual loads/flights within an operation day
- Fields: id, operation_day_id, flight_number, scheduled_time, altitude_feet, status
- Status progression: planned → ready → boarding → in_air → completed/cancelled
- Triggers: Auto-assign flight_number sequentially
- RLS: All can read, manifest coordinators can create/edit

#### skydive_flight_jumpers
- Jumpers assigned to specific flights
- Fields: id, flight_id, jumper_type (sport/tandem), slot_number, slots_occupied (1 or 2)
- Sport jumper fields: sport_jumper_id (references users)
- Tandem pair fields: tandem_master_id, passenger_id, payment_type, payment_received
- Slot conflict checking via trigger (check_slot_conflict function)
- Constraints: Enforce correct fields based on jumper_type
- RLS: All can read, manifest coordinators can manage

#### skydive_passengers
- Tandem passenger information
- Fields: id, name, surname, email, phone, weight_kg, notes
- Separate table for non-member passengers
- RLS: All can read, manifest coordinators can create/edit

### Helper Views (Materialized/Dynamic)

#### users_with_functions
- Users joined with their function_codes array
- Used for permission checks in RBAC system
- Aggregates user_functions relationships

#### flightlog_with_times
- Flight logs with calculated block_time_hours and flight_time_hours
- Used for reporting and billing
- Joins planes and users for denormalization

#### user_balances
- Aggregated account balance per user
- SUM of amounts from accounts table
- Cached or calculated on-demand

#### active_reservations
- Reservations filtered to active/standby, future dates
- Pre-filtered for dashboard performance
- Joined with plane and user details

### Helper Functions (PostgreSQL)

```sql
is_board_member(user_uuid) RETURNS BOOLEAN
  - Check if user has 'board' role
  - SECURITY DEFINER to access roles

calculate_block_time(block_on TIMESTAMPTZ, block_off TIMESTAMPTZ) RETURNS NUMERIC
  - Calculate flight block time in hours

calculate_flight_time(takeoff TIMESTAMPTZ, landing TIMESTAMPTZ) RETURNS NUMERIC
  - Calculate actual flight time in hours

can_reserve_aircraft(plane_id UUID) RETURNS BOOLEAN
  - Check if aircraft has expired blocking documents

check_slot_conflict() RETURNS TRIGGER
  - Validates jumper slot assignments don't overlap
  - Accounts for multi-slot jumpers (tandem pairs = 2 slots)
  - Raises exception if conflict detected
  - Used as BEFORE INSERT OR UPDATE trigger on skydive_flight_jumpers

get_available_pilots(operation_date DATE) RETURNS TABLE
  - Returns users with pilot or skydive_pilot functions
  - Filters by function validity period and user active status
```

### Row Level Security (RLS)

Every table has RLS enabled with policies:
- **Board Members**: Generally can read/write all data (with some restrictions)
- **Regular Members**: Can read most data, write only own records
- **Financial Data**: Restricted to board members only
- **Locked Records**: Cannot be modified (except lock/charge flags)

Examples:
- `documents`: Unapproved docs only visible to uploader + board
- `flightlog`: Locked entries cannot be modified
- `accounts`: Users only see own transactions

### Indexes (40+ strategic indexes)

- Single column indexes on frequently filtered fields (user_id, plane_id, etc.)
- Composite indexes for common queries (user_id + created_at)
- Partial indexes on active records
- GIN indexes for array fields (functions_master)

---

## 5. AUTHENTICATION & AUTHORIZATION

### Authentication System

#### Setup
1. **Supabase Auth**: Email/password authentication
2. **Session Management**: Cookie-based with Supabase SSR
3. **Middleware**: Route protection in `middleware.ts`
4. **OAuth Ready**: Infrastructure for Google, GitHub, etc.

#### Flow
1. User visits `/login` (redirected if authenticated)
2. Enters email/password
3. Supabase validates and returns session
4. Session stored in cookies
5. Middleware refreshes session on each request
6. Protected routes check session

#### Server-Side Functions
```typescript
createClient() - Server Supabase client with SSR cookies
createAdminClient() - Admin client for inviting users (server-only)
getUser() - Get current auth user
getUserProfile() - Get user with function codes for RBAC
getSession() - Get current session
```

### Authorization (RBAC System)

#### Two-Tier System

**1. Role-Based** (Legacy)
- `member`: Default role for all users
- `board`: Board members with elevated privileges

**2. Function-Based** (New Granular RBAC)
- System Functions (hardcoded in code and DB)
  - Aviation: Pilot, Flight Instructor, Chief Pilot
  - Skydiving: Tandem Master, Skydive Instructor, Sport Jumper, Skydive Pilot
  - Operations: Manifest Coordinator
  - Administration: Treasurer, Chairman, Secretary
- Custom Functions: Board can create club-specific functions
- Users can have multiple functions with validity periods

#### Permission Matrix
Located in `lib/permissions/index.ts`:

```typescript
'flight.log.create': [PILOT, FLIGHT_INSTRUCTOR]
'flight.log.approve': [CHIEF_PILOT, 'board']
'members.view.all': ['board', SECRETARY]
'billing.view.all': ['board', TREASURER]
'documents.approve': ['board']
```

#### Permission Checking

**Runtime Functions**:
```typescript
hasPermission(user, 'flight.log.create') - Check single permission
hasAnyPermission(user, [...]) - Check if user has any permission
hasAllPermissions(user, [...]) - Check if user has all permissions
canEditFlightLog(user, flightLog) - Special check for flightlog editing
```

**Server Actions**:
```typescript
requirePermission(supabase, 'permission.name') - Guard server action
requireBoardMember(supabase) - Legacy guard for board-only actions
getCurrentUserWithFunctions(supabase) - Load user with functions
```

#### Component-Level Usage
```typescript
if (hasPermission(user, 'aircraft.edit')) {
  // Show edit button
}

const permissionChecker = createPermissionChecker(user)
if (permissionChecker.can('flight.log.lock')) { ... }
```

---

## 6. KEY FEATURES & IMPLEMENTATION

### 1. Dashboard
- **Stats Cards**: Upcoming reservations count, account balance, monthly costs, unread notifications
- **Upcoming Reservations**: Next 7 days filtered by aircraft
- **Account History**: Recent 10 transactions with amount/description
- **Recent Flights**: Last 10 flights with block time and charged status
- **Notifications**: Unread notifications with mark-as-read
- **Real-time**: Subscription updates for document changes and notifications

### 2. Aircraft Management
- **List View**: Search, active/inactive filter, responsive table
- **Detail Tabs**:
  - **Details**: View/edit specifications (board only)
  - **Documents**: Upload, approve, rename, delete with expiry tracking
  - **Flight Logs**: Historical flights for aircraft
  - **Maintenance**: Track maintenance records and schedules
  - **Components**: Track major components (engines, etc.)
- **Document Expiry**: Color warnings (red <30 days, yellow <60 days)
- **Storage Integration**: Supabase Storage buckets
- **Blocking Documents**: Documents can block aircraft reservations

### 3. Member Management (Board Only)
- **Member List**: All users with roles, functions, email
- **Invite Users**: Via Supabase Auth (sends invitation email)
- **Edit Member**: Update name, surname, functions, roles, contact info
- **Functions Assignment**: Assign functions with validity periods
- **Document Approval**: View/approve user documents (licenses, medical, ID)
- **Document Expiry**: Track expiry dates for compliance

### 4. Documents
- **Club Documents**: General documents (not aircraft or user specific)
- **Upload**: Category, tags, metadata (board only)
- **Categories**: Regulations, Procedures, Forms, General, Custom
- **Search/Filter**: By category, tags, name
- **Actions**: Download, rename, delete (board only)
- **Storage**: Supabase Storage integration
- **Responsive**: Table and card views

### 5. Settings (Board Only)
- **Function Management**: Create, edit, delete custom functions
- **System Functions**: View/toggle active system functions
- **Yearly Fees**: Set function fees for billing
- **Membership Types**: Manage membership categories
- **User Profile**: Edit own profile (all users)
- **Password Change**: Change password via Supabase Auth
- **Billing Rates**: Airport fees, operation type rates
- **Tandem Registration**: Configure tandem skydive registration fields

### 6. Billing & Accounting (Board Only)
- **Cost Centers**: Manage cost centers for allocation
- **Transactions**: View/create transactions by user or cost center
- **User Accounts**: View individual account balances and history
- **Reversals**: Reverse transactions with tracking
- **Flight Charging**: Semi-automatic charging from flightlog
- **Reports**: User account summaries, transaction history
- **Operation Type Cost Splitting**: Configure default cost splits for operation types (see OPERATION_TYPE_COST_SPLITTING.md)

#### Transaction Reversal System

**IMPORTANT**: The application has TWO different reversal systems:

**1. Flight Charge Reversals** (for flights)
- **Functions**: `reverseFlightCharge()` (accounts.ts), `reverseCostCenterFlightCharge()` (cost-centers.ts)
- **Purpose**: Reverse ALL transactions for a flight atomically
- **Behavior**: When reversing a split-charged flight (e.g., 50% pilot, 25% Cost Center A, 25% Cost Center B), clicking "Reverse Charge" on ANY transaction will:
  - Create reversals for ALL 3 transactions
  - Mark ALL 3 as reversed
  - Unlock and uncharge the flight
- **UI**: "Reverse Charge" button (orange) on flight-related transactions
- **Why**: Prevents partial reversals that would cause accounting inconsistencies

**2. Manual Transaction Reversals** (for non-flight transactions)
- **Functions**: `reverseUserTransaction()`, `reverseCostCenterTransaction()` (accounting.ts)
- **Purpose**: Reverse single manual adjustments (deposits, corrections, etc.)
- **Behavior**: Only reverses the clicked transaction
- **UI**: "Undo" button on manual transactions
- **Protection**: Will reject flight-related transactions with error message

**Key Files**:
- `/lib/actions/accounts.ts` - User account operations + flight charge reversals
- `/lib/actions/cost-centers.ts` - Cost center operations + flight charge reversals
- `/lib/actions/accounting.ts` - Manual transaction operations (non-flight only)
- `/app/(dashboard)/accounting/components/reverse-charge-dialog.tsx` - Flight reversal UI
- `/app/(dashboard)/accounting/components/undo-transaction-dialog.tsx` - Manual reversal UI

### 7. Flight Log
- **Entry**: Create flight log entries
- **Aircraft Selection**: Select aircraft and view flight history
- **Charging & Locking**: Board creates account charge from flight with possible split allocation - This locks an entry
- **Calculations**: Auto-calculate block time and flight time
- **Crew**: Track pilot, other crew-members
- **Reversal**: Atomic reversal of split charges
- **Permissions**: RBAC-based access control (flight.log.create, flight.log.approve, flight.log.lock)

### 8. Reservations
- **Calendar View**: react-big-calendar showing all reservations
- **Conflict Detection**: Prevent overlapping same-aircraft bookings
- **Standby List**: Intentional overlaps for waiting list
- **Time Slots**: Duration-based booking with drag-to-resize
- **Aircraft Filter**: Filter by available aircraft
- **Real-time Updates**: Live reservation updates via Supabase Realtime
- **Permissions**: RBAC-based access control (reservations.create, reservations.edit)

### 9. Permissions Management
- **Function Viewing**: Board can view all functions (system and custom)
- **Assignment**: UI for assigning functions to users
- **Validity Periods**: Set valid_from/valid_until dates
- **Permission Matrix**: Display which functions have which permissions

### 10. Skydive Manifest System
- **Operation Days**: Create and manage daily skydiving operations
  - Select skydive-configured aircraft
  - Assign pilot for the day
  - Track operation status (planned/active/completed/cancelled)
- **Flight Management**: Organize loads throughout the day
  - Sequential flight numbers (Load 1, 2, 3...)
  - Scheduled departure times
  - Configurable jump altitudes
  - Flight status progression: planned → ready → boarding → in_air → completed
- **Sport Jumpers**: Add licensed skydivers (1 slot each)
  - Select from users with sport_jumper function
  - Assign specific slot numbers
  - Optional notes per jumper
- **Tandem Pairs**: Add tandem jumps (2 slots per pair)
  - Tandem master selection (users with tandem_master function)
  - Passenger information (name, contact, weight)
  - Payment tracking (payment type and received status)
  - Occupies consecutive slots (e.g., slots 3-4)
- **Slot Management**: Visual slot grid and conflict prevention
  - Real-time slot availability display
  - Color-coded slots (blue=sport, purple=tandem, gray=empty)
  - Database-level conflict checking prevents overlaps
  - Automatic slot calculation for tandem pairs
- **View Modes**: Dual viewing options
  - **Board View**: Card grid with slot visualization
  - **List View**: Collapsible table with detailed jumper info
- **Flight Actions**: Complete flight lifecycle management
  - Edit flight details (time, altitude)
  - Postpone flights (shift to later time)
  - Cancel or delete flights
  - Complete flights (marks as done)
  - Reactivate cancelled flights
- **Jumper Actions**: Dynamic roster management
  - Add jumpers mid-operation
  - Remove jumpers with status validation
  - View payment status for tandem pairs
- **Settings**: Configurable manifest parameters
  - Payment types (cash, card, bank transfer, voucher)
  - Default jump altitudes
  - Board-only configuration access
- **Permissions**: RBAC-based access control
  - manifest_coordinator: Full manifest management
  - skydive_pilot: View-only access
  - Board members: Full access
- **User Tracking**: Mark users who complete tandem jumps
  - Automatically tracked when passenger on completed flight
  - Stored in users table for membership tracking
- **Database**: Comprehensive data model
  - manifest_settings: Global configuration
  - skydive_operation_days: Daily operations
  - skydive_flights: Individual loads
  - skydive_flight_jumpers: Jumper assignments
  - skydive_passengers: Tandem passenger details

---

## 7. FLIGHT CHARGING & REVERSAL SYSTEM

### Overview

The flight charging system is one of the most critical features of FlightHub, enabling board members to charge flight costs to users and cost centers with sophisticated split charging capabilities.

### Key Concepts

#### 1. Simple Charging
- **Charge to User**: Entire flight cost charged to a single user
- **Charge to Cost Center**: Entire flight cost charged to a cost center
- **Lock**: Flights will be locked when charging
- **Transaction Creation**: Creates negative amount (debit) in user's account or cost center

#### 2. Split Charging
- **Percentage-Based**: Distribute costs across multiple targets by percentage
- **Multiple Targets**: Support for 2-5 targets (users and/or cost centers)
- **Airport Fees**: Can be split equally or assigned to specific target
- **Validation**: Percentages must sum to exactly 100%
- **Atomic Operation**: All transactions created together

**Example Split Charge:**
```typescript
Flight: €300 cost + €60 airport fees
Split: 50% Pilot, 25% Cost Center A, 25% Cost Center B
Fees: Split equally

Result:
- Pilot: -€180 (€150 + €30 fees)
- Cost Center A: -€90 (€75 + €15 fees)
- Cost Center B: -€90 (€75 + €15 fees)
All transactions linked by flightlog_id
```

#### 3. Operation Type Default Splits
- Pre-configured splits per operation type (Training, Maintenance, etc.)
- Auto-populate split percentages when charging
- Can be overridden
- Stored in operation_types table

#### 4. Transaction Reversal System

**CRITICAL**: FlightHub has TWO different reversal systems:

**A. Flight Charge Reversals**
- **Functions**: `reverseFlightCharge()` (accounts.ts), `reverseCostCenterFlightCharge()` (cost-centers.ts)
- **Purpose**: Reverse ALL transactions for a flight atomically
- **UI**: Orange "Reverse Charge" button on flight-related transactions
- **Behavior**:
  - Finds ALL user transactions with same `flightlog_id`
  - Finds ALL cost center transactions with same `flightlog_id`
  - Creates reversal transaction for each (opposite amount)
  - Marks ALL original transactions as reversed
  - Unlocks flight (charged=false, locked=false)
  - Allows re-charging with different allocation

**B. Manual Transaction Reversals** (for non-flight transactions)
- **Functions**: `reverseUserTransaction()`, `reverseCostCenterTransaction()` (accounting.ts)
- **Purpose**: Reverse single manual adjustments (deposits, corrections)
- **UI**: "Undo" button on manual transactions
- **Protection**: Rejects flight-related transactions with helpful error message

**Reversal Flow Example:**
```typescript
// Initial split charge (3 transactions created)
Flight charged: 50% User, 30% CC-A, 20% CC-B

// User clicks "Reverse Charge" on ANY transaction
// System finds ALL 3 transactions and reverses them:
1. User transaction: -€150 → Reversal: +€150
2. CC-A transaction: -€90 → Reversal: +€90
3. CC-B transaction: -€60 → Reversal: +€60

// Flight now uncharged, can be re-charged with different split
```

### Implementation Files

#### Server Actions
- `lib/actions/accounts.ts`:
  - `chargeFlightToUser()` - Simple user charge
  - `splitChargeFlight()` - Split charge across targets
  - `reverseFlightCharge()` - Atomic reversal of ALL flight transactions

- `lib/actions/cost-centers.ts`:
  - `chargeFlightToCostCenter()` - Simple cost center charge
  - `reverseCostCenterFlightCharge()` - Atomic reversal from cost center entry point

- `lib/actions/accounting.ts`:
  - `reverseUserTransaction()` - Manual transaction reversal (non-flight)
  - `reverseCostCenterTransaction()` - Manual cost center reversal (non-flight)

#### UI Components
- `app/(dashboard)/accounting/components/reverse-charge-dialog.tsx` - Flight reversal UI
- `app/(dashboard)/accounting/components/charge-flight-dialog.tsx` - Charge flight UI

### Database Schema

#### Key Tables
- **flightlog**: Flight records with `charged`, `locked`, `charged_by`, `charged_at` fields
- **accounts**: User transactions with `flightlog_id` linking
- **cost_center_transactions**: Cost center transactions with `flightlog_id` linking
- **operation_types**: Default split configurations

#### Transaction Fields
- `amount`: Negative for debits/costs, positive for credits/reversals
- `flightlog_id`: Links all transactions for same flight
- `reversed_at`: Timestamp when transaction was reversed
- `reversed_by`: User who performed reversal
- `reversal_transaction_id`: ID of the reversal transaction
- `reverses_transaction_id`: For reversal transactions, points to original

### Testing

#### Automated Tests
- **File**: `__tests__/actions/flight-charging-simple.test.ts`
- **Coverage**:
  - Split percentage validation
  - Split amount calculation
  - Transaction amount convention
  - Flight status transitions
  - Reversal completeness
  - Error scenarios

#### Manual Test Plan
- **File**: `FLIGHT_CHARGING_TEST_PLAN.md`
- **Scenarios**:
  - Simple charges and reversals
  - 2-way, 3-way, 4+ way split charges
  - Airport fee allocation (split vs assign)
  - Re-charging after reversal
  - Edge cases and error handling
  - Authorization and validation

### Best Practices

1. **Always Lock Before Charging**: Prevents flight log modifications
2. **Validate Percentages**: Must sum to exactly 100%
3. **Use Correct Reversal Function**: Flight reversals vs manual reversals
4. **Test Split Charges**: Verify ALL transactions created and reversed together
5. **Check flightlog_id**: All split transactions must share same flightlog_id

### Future Improvements

1. **Transaction Wrapping**: PostgreSQL transactions for atomic operations
2. **Concurrent Reversal Protection**: Locking mechanism to prevent simultaneous reversals
3. **Audit Trail Enhancement**: More detailed logging of charge/reversal operations
4. **Automatic Integration Tests**: Tests with real test database

---

## 8. API ROUTES

Located in `app/api/`:

### Document Management
- `POST /api/documents/upload` - Upload document (auth required)
- `GET /api/documents/user` - Get user's documents
- `GET /api/documents/types` - Get document types
- `POST /api/documents/approve` - Approve document (board only)
- `GET /api/documents/pending-approvals` - Count pending approvals
- `GET /api/documents/user-alerts` - User expiry alerts
- `POST /api/documents/renew` - Renew document expiry (board only)
- `POST /api/documents/signed-url` - Get signed storage URL (board only)
- `POST /api/documents/update-expiry` - Update document expiry date

### User Management
- `GET /api/users/search` - Search users by name/email (for selectors)
- `GET /api/users/[userId]` - Get user profile
- `GET /api/users/[userId]/balance` - Get user account balance
- `POST /api/users/track-selection` - Track recent person selections

### Functions
- `GET /api/functions` - Get all functions (board only)

### Registration
- `GET /api/registration/tandem/fields` - Get tandem registration form fields
- `POST /api/registration/tandem` - Submit tandem registration
- `POST /api/registration/tandem/auth` - Authenticate tandem guest

### Settings
- `POST /api/settings/tandem-registration` - Update tandem registration config

---

## 9. SERVER ACTIONS

Located in `lib/actions/`:

### Document & Approval
- `uploadDocument()` - Upload user document
- `approveDocument()` - Board approves document
- `deleteDocument()` - Delete document
- `renewDocument()` - Renew expiry date

### Members
- `updateMember()` - Edit member profile
- `inviteUser()` - Invite user via email
- `assignFunction()` - Assign function to user
- `unassignFunction()` - Remove function from user

### Billing/Accounting
- `createTransaction()` - Create account transaction
- `reverseTransaction()` - Reverse transaction
- `chargeFlight()` - Charge flight to user
- `updateBillingRate()` - Update function yearly fee

### Manifest
- `createOperationDay()` - Create skydiving operation day
- `updateOperationDay()` - Update operation day details
- `deleteOperationDay()` - Delete operation day
- `createFlight()` - Add flight/load to operation day
- `updateFlight()` - Update flight details
- `deleteFlight()` - Delete or cancel flight
- `addSportJumper()` - Add sport jumper to flight
- `addTandemPair()` - Add tandem pair to flight
- `removeJumper()` - Remove jumper from flight
- `updateManifestSettings()` - Update manifest configuration

### Other
- `updateUserPreferences()` - Save user settings
- `updateMembershipStatus()` - Activate/deactivate membership

---

## 10. COMPONENTS & UI

### Layout Components
- **Sidebar** (`components/layout/sidebar.tsx`): Desktop & mobile navigation with real-time document badges
- **Header** (`components/layout/header.tsx`): Top bar with mobile menu toggle
- **User Menu** (`components/layout/user-menu.tsx`): Profile dropdown with settings/logout
- **Mode Toggle** (`components/layout/mode-toggle.tsx`): Dark/light mode switch

### Custom Components
- **PersonSelector** (`components/person-selector.tsx`): Smart selector for filtering users by required functions
- **LanguageSwitcher** (`components/language-switcher.tsx`): Switch between German/English

### Modal/Dialog Components
- Upload Document Dialog
- Edit Member Dialog
- Invite User Dialog
- Create Function Dialog
- Create Cost Center Dialog
- Charge Flight Dialog
- Add Transaction Dialog

### Hooks
- `useUser()`: Get current authenticated user and profile
- `useTranslations()`: Access i18n strings (next-intl)
- `usePathname()`: Get current route
- `useRouter()`: Navigate programmatically

---

## 11. INTERNATIONALIZATION (i18n)

### Setup
- **Library**: next-intl (wrapper around Intl APIs)
- **Default**: English
- **Fallback**: Browser language detection, then English

### Configuration Files
- `i18n.ts`: Configure next-intl with message loading
- `middleware.ts`: Detect and set locale from cookie/header/database
- `messages/de.json`: German
- `messages/en.json`: English

### Usage
```typescript
const t = useTranslations('namespace')
t('key') // Returns translated string
<Trans i18nKey="key" /> // For translations with HTML
```

### Default Language Behavior
1. Check user's `preferred_language` in database
2. Check browser Accept-Language header
3. Check NEXT_LOCALE cookie
4. Default to English

---

## 12. TESTING

### Test Setup
- **Framework**: Jest 29.x
- **Environment**: jsdom for DOM APIs
- **Libraries**: @testing-library/react, @testing-library/user-event
- **Config**: `jest.config.ts` with TypeScript support

### Test Structure
- **Location**: Colocated with source (`*.test.ts` / `*.spec.ts`) or `__tests__/`
- **Utilities**: Mock helpers in `__tests__/utils/`
- **Coverage**: Targets app/ and lib/ directories

### Existing Tests

#### Flight Charging System
- **File**: `__tests__/actions/flight-charging-simple.test.ts`
- **Test Coverage**:
  - Split Percentage Validation
  - Split Amount Calculation
  - Transaction Amount Convention
  - Flight Status Transitions
  - Reversal Completeness
  - Error Scenarios
- **Focus**: Business logic validation without complex database mocking

#### Manifest System (NEW)
- **File**: `__tests__/actions/manifest-system.test.ts`
- **Test Count**: 58 passing tests
- **Test Coverage**:
  - Slot Allocation (sport jumpers, tandem pairs, mixed)
  - Slot Conflict Detection (overlaps, edge cases)
  - Flight Status Progression (state machine validation)
  - Flight Postponement (time calculations)
  - Jumper Removal Validation (status-based rules)
  - Slot Number Assignment (finding available slots)
  - Flight Capacity Validation (availability checks)
  - Flight Cancellation Validation (business rules)
  - Flight Deletion vs Cancellation logic
  - Operation Day Status Validation
  - Payment Type Validation
  - Slot Display Formatting
- **Documentation**: `MANIFEST_TESTING.md`
- **Focus**: Business logic validation for manifest operations

#### Other Test Files
- `app/api/documents/upload/route.test.ts` - Document upload API
- `app/api/documents/user-alerts/route.test.ts` - User alerts API
- `app/api/documents/renew/route.test.ts` - Document renewal API
- `app/(dashboard)/reservations/actions.test.ts` - Reservation actions
- `__tests__/actions/flight-charging-simple.test.ts` - Business logic tests
- `__tests__/utils/flight-charging-mocks.ts` - Mock utilities for testing

### Mock Utilities
- `__tests__/utils/flight-charging-mocks.ts`: Mock utilities for flight charging tests
- `createMockSupabaseClient()`: Mock Supabase client
- `createQueryBuilder()`: Mock Supabase query interface
- `createStorageBuilder()`: Mock storage operations
- Pre-made mocks: `mockUser`, `mockProfile`, `mockDocument`, etc.

### Testing Strategy

FlightHub uses a **hybrid testing approach** combining:

1. **Unit Tests for Business Logic**
   - No complex database mocking
   - Focus on calculations, validations, and state transitions
   - Easy to maintain and extend

2. **Manual Testing for Integration**
   - Database transactions and RLS policies
   - UI workflows and user interactions
   - Concurrent operations
   - Real-world scenarios with actual data


### Running Tests

```bash
# Run all tests
npm test

# Run flight charging tests
npm test -- __tests__/actions/flight-charging-simple.test.ts

# Run manifest system tests
npm test -- __tests__/actions/manifest-system.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Testing Patterns
```typescript
// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Setup test
beforeEach(() => {
  mockSupabase = createMockSupabaseClient()
  ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
})

// Create test request
const formData = new FormData()
formData.append('file', file)
const request = new NextRequest(url, { method: 'POST', body: formData })

// Call route handler
const response = await POST(request)
```

---

## 13. DEVELOPMENT PATTERNS

### Code Organization
1. **App Routes** (`app/**/*.tsx`): Page components and layouts
2. **API Routes** (`app/api/**/*.ts`): REST endpoints
3. **Server Actions** (`lib/actions/**/*.ts`): Async server functions
4. **Components** (`components/**/*.tsx`): Reusable UI components
5. **Utilities** (`lib/**/*.ts`): Shared logic and helpers

### Component Patterns
- **Server Components** (default): Data fetching, layouts
- **Client Components** ('use client'): Interactivity, hooks
- **Layout Components**: Nested layouts with dynamic content
- **Page Components**: Route-specific layouts

### Server Actions Pattern
```typescript
'use server'

// Permission check
const { user, error } = await requirePermission(supabase, 'permission.name')
if (!user) return { error }

// Database operation
const { data, error } = await supabase.from('table').insert(data)

// Revalidate cache
revalidatePath('/route')

return { success: true, data }
```

### Database Query Pattern
```typescript
const supabase = await createClient()

// Get data with RLS applied
const { data, error } = await supabase
  .from('table')
  .select('field1, field2, relation(*)')
  .eq('filter', value)
  .order('created_at', { ascending: false })

// Create with validation
const { data, error } = await supabase
  .from('table')
  .insert({ ...payload })
  .select()
  .single()
```

### Form Validation Pattern
```typescript
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
})

const result = schema.safeParse(formData)
if (!result.success) return { error: result.error.flatten() }
```

---

## 14. RECENT DEVELOPMENTS (November 2025)

### Latest: Skydive Manifest System (Nov 23, 2025)

**Complete Load Management for Skydiving Operations**
- **New Feature**: Full manifest system for managing skydiving operations
- **Tables**: 5 new tables (manifest_settings, operation_days, flights, jumpers, passengers)
- **System Functions**: Added manifest_coordinator and skydive_pilot functions
- **Database Functions**: check_slot_conflict() trigger for slot validation
- **User Tracking**: tandem_jump_completed and tandem_jump_date fields on users table
- **Aircraft Support**: max_jumpers and is_skydive_aircraft fields on planes table
- **Features**:
  - Operation day management with aircraft and pilot assignment
  - Flight status progression (planned → ready → boarding → in_air → completed)
  - Sport jumper management (1 slot each)
  - Tandem pair management (2 slots, payment tracking)
  - Visual slot grid with conflict checking
  - Board and list view modes
  - Flight lifecycle actions (edit, postpone, cancel, complete, reactivate)
  - Configurable payment types and altitudes
  - RBAC permissions for manifest coordinators and pilots
- **UI**: Complete CRUD interface with dual view modes
- **Migrations**: Consolidated into 3 migrations (users tracking, manifest system, planes config)
- **Location**: `/app/(dashboard)/manifest/`, `/lib/actions/manifest.ts`

### Endorsement System Redesign & Board Contact Settings (Nov 17, 2025)

**1. Endorsement System Redesign**
- **Replaced**: `document_privileges` table → new `endorsements` system
- **New Tables**:
  - `endorsements` - Central endorsements (SEP, MEP, IR, FI, etc.) with `supports_ir` flag
  - `document_type_endorsements` - Links endorsements to document types
  - `document_endorsement_privileges` - Tracks endorsements on documents with IR expiry
- **Features**:
  - Separate IR (Instrument Rating) expiry tracking
  - Predefined endorsements (cannot be deleted, only deactivated)
  - Custom endorsements (board can create club-specific ones)
  - Board can configure which endorsements support IR
- **RPC Function**: `get_user_endorsement_alerts` with IR tracking
- **Migration**: `20250203000005_endorsement_system_redesign.sql`

**2. Board Contact Settings**
- **New Feature**: Configurable contact information for multi-club support
- **Table**: `board_contact_settings` (email, phone, contact name, office hours)
- **UI**: New "Board Contact" tab in Settings (board members only)
- **Display**: Dynamic contact info on account-inactive page
- **RLS**: Public read, board-only write
- **Migration**: `20250203000007_board_contact_settings.sql`

**3. Invitation Flow Fix**
- **Issue**: Invite tokens expired after 5 minutes
- **Fix**: Use single `inviteUserByEmail` call (not `createUser` + `inviteUserByEmail`)
- **Result**: Proper 24-hour token expiry
- **Explicit redirectTo**: Uses `NEXT_PUBLIC_APP_URL` environment variable

**4. Critical Bug Fixes**
- **Document Definition Filter**: Fixed function code vs UUID mismatch in upload dropdown
- **User API**: Returns function codes instead of IDs for RBAC compatibility
- **Sidebar Subscriptions**: Fixed real-time subscription (`document_privileges` → `document_endorsements`)
- **Dialog Overflow**: Implemented 3-section layout (header, scrollable content, footer)
- **TypeScript Types**: Added missing exports (MembershipType, UserMembership, Document, FunctionWithStats)

### Split Charge Reversal Fix (November 2025)
- **Critical Bug Fix**: Fixed split-charged flight reversals
- **Problem**: When reversing a split-charged flight, only clicked transaction was reversed
- **Solution**: Atomic reversal of ALL transactions with same `flightlog_id`
- **Testing**: Added automated tests

### Granular RBAC System
- Implemented hybrid RBAC combining roles + function-based permissions
- System functions: Pilot, Flight Instructor, Chief Pilot, Tandem Master, etc.
- Permission matrix in `lib/permissions/index.ts` with 30+ granular permissions
- Functions stored in `user_functions` junction table with validity periods
- Sidebar and components respect permission matrix
- Migration: `20250202100006_rbac_system.sql`

### Recent Document Management Updates
- Document upload improvements with RPC notification creation
- Document approval and renewal workflows
- User alerts for expiring documents (30/60/90 days)
- Aircraft documents blocking reservations based on expiry
- Comprehensive document management tests

### Membership System
- Membership types (Short-term, Regular, etc.)
- User membership tracking with start/end dates
- Auto-renewal capability
- Membership payment tracking
- Inactive member handling with account-inactive page

### Other Recent Features
- Password reset/forgot password flow
- Flight log review notifications
- Emergency contact field for users
- Tandem registration form with dynamic fields
- Currency/membership type formatting improvements

---

## 15. CONFIGURATION & ENVIRONMENT

### Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=FlightHub

# Optional
DATABASE_URL=postgresql://postgres:pass@db.project.supabase.co:5432/postgres
```

### Key Configuration Files
- `next.config.ts`: Next.js config with Turbopack and i18n plugin
- `tsconfig.json`: TypeScript compiler options
- `tailwind.config.ts`: Tailwind CSS customization
- `jest.config.ts`: Jest testing configuration
- `components.json`: shadcn/ui configuration
- `eslint.config.mjs`: ESLint rules
- `middleware.ts`: Next.js middleware for auth + locale

---

## 16. PERFORMANCE CONSIDERATIONS

### Database
- Strategic indexes on frequently queried columns
- Materialized views for pre-calculated data
- Partial indexes on active records only
- Composite indexes for common query patterns

### Frontend
- Turbopack for faster builds
- Code splitting and lazy loading
- Image optimization via next/image

### Caching
- Supabase-managed query result caching
- Next.js `revalidatePath()` for cache invalidation
- Client-side React Query pattern ready

---

## 17. SECURITY ARCHITECTURE

### Authentication
- Supabase Auth handles credential security
- Passwords hashed server-side
- Session tokens in secure, HTTP-only cookies
- Token refresh handled by middleware

### Authorization
- Row Level Security (RLS) on all database tables
- RBAC permission matrix enforced server-side
- Server actions check permissions before executing
- Client components disable UI for unauthorized users

### Data Protection
- User-specific queries filtered by auth.uid()
- Financial data restricted to board members only
- Document approval workflow prevents unauthorized access
- Locked flight logs cannot be modified

### API Security
- Route handlers check authentication
- POST/DELETE operations verify permissions
- File uploads validated (type, size)
- Signed URLs prevent direct storage access

### Supabase Security
- RLS policies cached and optimized
- SECURITY DEFINER functions for trusted operations
- Triggers validate business rules at database level
- Audit trail via updated_at timestamps

---

## 18. DEPLOYMENT & DEVOPS

### Deployment Target
- **Platform**: Vercel
- **Database**: Supabase
- **Storage**: Supabase Storage
- **CI/CD**: GitHub Actions

### GitHub Actions Workflows

#### 1. Comprehensive CI (ci.yml)
- **Trigger**: Every push to any branch + PRs to main/develop
- **Duration**: ~3-5 minutes
- **What it does** (All in one unified job):
  - **Linting** - ESLint on entire codebase
  - **Type Check** - TypeScript compilation verification
  - **Tests** - All 132 unit tests with coverage
    - 21 flight charging tests
    - 58 manifest system tests
    - 53+ other tests
  - **Build** - Next.js production build with Turbopack
  - **Coverage Upload** - Optional Codecov integration
  - **Summary Report** - Detailed pass/fail status for each check
- **Status**: ![CI](https://github.com/andi-rainer/flight-hub/actions/workflows/ci.yml/badge.svg)

#### 2. Deploy to Staging (deploy-staging.yml)
- **Trigger**: Push to main branch
- **Duration**: ~2-3 minutes
- **What it does**:
  - Runs database migrations on staging
  - Deploys to Vercel staging
- **Status**: ![Staging](https://github.com/andi-rainer/flight-hub/actions/workflows/deploy-staging.yml/badge.svg)

#### 3. Deploy to Production (deploy-production.yml)
- **Trigger**: Manual (workflow_dispatch)
- **Duration**: ~3-4 minutes
- **What it does**:
  - Runs database migrations on production
  - Deploys to Vercel production

### Deployment Steps
1. Push code to feature branch → CI runs automatically
   - Linting, type check, tests (132), build verification
2. Fix any CI failures
3. Create PR → CI runs again
4. Merge to main → Staging deployment triggered
   - Migrations applied automatically
   - Deployed to Vercel staging
5. Verify staging environment
6. Manual production deployment when ready
   - Migrations applied to production
   - Deployed to Vercel production

### Required GitHub Secrets
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD_STAGING`
- `SUPABASE_PROJECT_ID_STAGING`
- `SUPABASE_DB_PASSWORD_PRODUCTION`
- `SUPABASE_PROJECT_ID_PRODUCTION`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_STAGING`
- `VERCEL_PROJECT_ID_PRODUCTION`

### Workflow Documentation
See `.github/WORKFLOWS.md` for detailed workflow documentation.

---

## 19. COMMON WORKFLOWS

### Adding a New Feature

1. **Design Database Schema**
   - Create migration file in `supabase/migrations/`
   - Define tables, constraints, RLS policies
   - Generate types with `supabase gen types`

2. **Update Types**
   - Regenerate `lib/database.types.ts` from schema
   - Create domain types if needed

3. **Create Server Logic**
   - Add server action in `lib/actions/[domain].ts`
   - Check permissions with `requirePermission()`
   - Return typed response

4. **Build UI**
   - Create components in `app/(dashboard)/[feature]/`
   - Use shadcn/ui
   - Call server actions on form submit

5. **Test**
   - Write tests for server actions
   - Test RLS policies with different users
   - Test UI interactions

### Adding a Permission

1. Add to `PERMISSIONS` object in `lib/permissions/index.ts`
2. Check with `hasPermission(user, 'new.permission')`
3. Use in server actions with `requirePermission()`
4. Update sidebar/components to respect permission

---

## 20. TROUBLESHOOTING & FAQ

### Common Issues

**"Not authenticated" errors**
- Check session exists: `await supabase.auth.getUser()`
- Verify middleware redirects to login
- Check environment variables are set

**RLS policy errors (403 Forbidden)**
- Verify user is authenticated
- Check table has appropriate RLS policies
- Test policy with psql directly
- Ensure permission matrix is correct

**Document upload fails**
- Check storage buckets exist
- Verify file size < 25MB
- Check MIME types are allowed
- Ensure user has 'board' role for uploads

**Build errors with TypeScript**
- Run `npm run build` to see full error
- Check type definitions match database schema
- Regenerate types if schema changed

**Tests fail with Supabase mock errors**
- Ensure mock client is created in beforeEach()
- Check mock return types match real client
- Update mock utils if API changed

---

## 21. USEFUL RESOURCES

### Internal Documentation

#### Core Documentation
- `CLAUDE.md` - Complete codebase documentation (this file)
- `/supabase/SCHEMA_DOCUMENTATION.md` - Complete database schema docs
- `/supabase/QUICK_REFERENCE.md` - Common SQL queries
- `/AUTH_SETUP.md` - Authentication flow details
- `/PROJECT_STATUS.md` - Feature implementation status
- `SCHEMA_SUMMARY.md` - Database schema summary

#### Feature Documentation
- `OPERATION_TYPE_COST_SPLITTING.md` - Split charging system and atomic reversals
- `MANIFEST_TESTING.md` - Manifest system unit tests (58 tests)
- `README.md` - Project overview and quick start guide

---

## 23. FUTURE ROADMAP

### Planned Features (from PROJECT_STATUS.md)
1. **Advanced Reporting**: Flight hours, revenue, utilization stats
2. **Mobile Optimization**: Offline support, push notifications
3. **Audit Logging**: Track all sensitive operations
4. **Waiting List**: Auto-promotion when conflicts resolve

### Scaling Considerations
- Materialized views if queries slow down (refresh hourly)
- Read replicas for reporting queries
- Partition flightlog by year if data volume grows
- Cache permission checks if becomes bottleneck

---

## 24. TECHNICAL DEBT & KNOWN ISSUES

### Minor Issues
- Legacy `functions` array field in users table (migrated to user_functions)
- Some components still check `role.includes('board')` vs using RBAC
- Test coverage could be expanded (currently basic)

### Potential Improvements
- Add request validation library at API layer
- Implement audit logging for compliance
- Add error boundary components for better UX
- Extract more logic into composable hooks
- Add E2E tests with Playwright

---

## SUMMARY

FlightHub is a well-architected, production-ready aviation club management system with:

- **Robust Security**: Comprehensive RLS, RBAC with granular permissions, secure session handling
- **Data Integrity**: Constraints, triggers, validated document workflows
- **Performance**: Strategic indexes, materialized views, efficient queries
- **User Experience**: Responsive UI, dark mode, multi-language, real-time updates
- **Maintainability**: TypeScript throughout, clear separation of concerns, comprehensive documentation
- **Scalability**: Design supports growth to thousands of members and records

The codebase follows Next.js and Supabase best practices with clear patterns for extending features, adding permissions, and managing user data. All critical paths are secured with either database-level RLS or server-side permission checks.
- Always develop for local environment, local supabase. Do not push migrations via MCP, they are added via supabase migration up and later via github actions to the staging supabase environment.