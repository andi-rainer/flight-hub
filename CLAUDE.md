# FlightHub - Codebase Documentation

**Project**: Flight Club Management System (Austrian Aviation Club)
**Stack**: Next.js 15 + Supabase + shadcn/ui + Tailwind CSS
**Last Updated**: December 4, 2025

---

## 1. PROJECT OVERVIEW

Production-grade web application for managing aircraft reservations, flight logs, member administration, and financial tracking for aviation and skydiving clubs. Built for Austrian club (EUR currency, German/English languages).

### Key Characteristics
- **Multi-Purpose**: Aviation and skydiving operations
- **Hybrid RBAC**: Role-based (board/member) + function-based permissions
- **Document Management**: Expiry tracking, approval workflows, aircraft blocking
- **Financial System**: Billing, split charging, atomic reversals
- **Real-time**: Supabase Realtime for notifications and updates

---

## 2. TECH STACK

### Frontend
Next.js 15 (App Router) • TypeScript 5.x • Tailwind CSS 4 • shadcn/ui (Radix) • next-intl (i18n) • next-themes • react-hook-form + Zod • react-big-calendar • sonner (toasts)

### Backend
Next.js API routes • PostgreSQL (Supabase) • Supabase Auth (email/password + OAuth ready) • Cookie-based SSR sessions • Supabase Storage

### Database
16 core tables with RLS • Materialized views • PostgreSQL functions/triggers • Strategic indexes (40+)

### Testing & Tools
Jest 29.x • @testing-library/react • Turbopack • ESLint 9 • GitHub Actions

---

## 3. PROJECT STRUCTURE

```
flight-hub/
├── app/
│   ├── (dashboard)/              # Protected routes with sidebar
│   │   ├── dashboard/            # Main dashboard
│   │   ├── aircrafts/            # Aircraft management (list, detail, docs)
│   │   ├── reservations/         # Calendar-based booking
│   │   ├── flightlog/            # Flight logging
│   │   ├── manifest/             # Skydive manifest system
│   │   ├── members/              # Member management (board only)
│   │   ├── documents/            # Club document library
│   │   ├── billing/              # Cost centers, billing rates
│   │   ├── accounting/           # Transactions, user accounts
│   │   ├── store-management/     # Tandem store CMS (board only)
│   │   ├── settings/             # Functions, rates, config
│   │   └── permissions/          # Permission management
│   ├── auth/                     # Auth pages (callback, error)
│   ├── api/                      # 18 API routes
│   ├── login/, forgot-password/, reset-password/, account-inactive/
│   ├── layout.tsx, page.tsx, globals.css
│
├── components/
│   ├── layout/                   # Sidebar, header, user-menu, mode-toggle
│   ├── ui/                       # shadcn/ui primitives
│   ├── providers/                # Theme provider
│   ├── person-selector.tsx, language-switcher.tsx
│
├── lib/
│   ├── supabase/                 # server.ts, client.ts
│   ├── permissions/              # RBAC permission matrix
│   ├── constants/                # system-functions.ts
│   ├── actions/                  # 14 server action files
│   ├── hooks/                    # use-user.ts
│   ├── utils/                    # Utility functions
│   ├── database.types.ts         # Generated Supabase types (3491 lines)
│
├── supabase/
│   ├── migrations/               # 10+ migration files
│   ├── SCHEMA_DOCUMENTATION.md, README.md, QUICK_REFERENCE.md
│
├── __tests__/                    # Test files (132 tests passing)
├── middleware.ts, i18n.ts        # Auth + locale middleware
├── next.config.ts, tsconfig.json, tailwind.config.ts
├── jest.config.ts, eslint.config.mjs
├── CLAUDE.md, README.md, AUTH_SETUP.md, PROJECT_STATUS.md
```

---

## 4. DATABASE SCHEMA

### Core Tables (16 with RLS)

**users** - User profiles extending auth.users (id, email, name, surname, role[], functions, phone, tandem_jump_completed, tandem_jump_date). Auto-created on signup. RLS: All see all, edit own, board edits any.

**functions_master** - System + custom functions (id, code UNIQUE, name, name_de, category_id, is_system, active, yearly_fee). System functions (Pilot, Flight Instructor, Tandem Master, etc.) cannot be deleted. Board can create custom functions.

**user_functions** - Many-to-many junction (user_id, function_id, assigned_at, assigned_by, valid_from, valid_until). Unique constraint on (user_id, function_id).

**function_categories** - Organizes functions: Aviation, Skydiving, Operations, Administration, Custom.

**planes** - Aircraft fleet (id, tail_number, type, registration, manufacturer, total_hours, max_jumpers, is_skydive_aircraft, active, maintenance_status). Constraint: Non-skydive aircraft cannot have max_jumpers set.

**reservations** - Flight bookings (id, plane_id, user_id, start_time, end_time, status[active/standby/cancelled], remarks, priority). Validation: end_time > start_time.

**flightlog** - Flight records (id, plane_id, pilot_id, copilot_id, block_on, block_off, takeoff, landing, locked, charged, charged_by, charged_at). Time calculations via triggers. RLS: Pilot creates/edits own, board locks/charges.

**documents** - Unified docs (id, name, category, file_url, uploaded_by, plane_id, user_id, blocks_aircraft, approved, expiry_date). Check constraint: Exactly one of (plane_id, user_id) or neither. Blocking docs prevent reservations.

**accounts** - Financial ledger (id, user_id, amount, description, flightlog_id, created_by, reversed_at, reversed_by, reversal_transaction_id, reverses_transaction_id). RLS: Users see own, board sees all.

**notifications** - User notifications (id, user_id, type, title, message, link, document_id, read, created_at). For approvals, expiry warnings, flight reviews.

**manifest_settings** - Skydive config (id, payment_types JSONB, default_altitude_feet). Single-row table. RLS: All read, board update.

**skydive_operation_days** - Daily ops (id, operation_date, plane_id, pilot_id, notes, status[planned/active/completed/cancelled]). RLS: All read, manifest coordinators edit.

**skydive_flights** - Loads (id, operation_day_id, flight_number, scheduled_time, altitude_feet, status[planned/ready/boarding/in_air/completed/cancelled]). Auto-assign flight_number via trigger.

**skydive_flight_jumpers** - Jumper assignments (id, flight_id, jumper_type[sport/tandem], slot_number, slots_occupied[1 or 2], sport_jumper_id, tandem_master_id, passenger_id, payment_type, payment_received). Slot conflict checking via trigger. Constraints enforce correct fields by jumper_type.

**skydive_passengers** - Tandem passengers (id, name, surname, email, phone, weight_kg, notes). Separate table for non-members.

### Helper Views

**users_with_functions** - Users with function_codes array (for RBAC)
**flightlog_with_times** - Flights with calculated block_time_hours and flight_time_hours
**user_balances** - Aggregated account balance per user
**active_reservations** - Pre-filtered for dashboard performance

### PostgreSQL Functions

```sql
is_board_member(user_uuid) - Check board role
calculate_block_time(block_on, block_off) - Flight block time
calculate_flight_time(takeoff, landing) - Flight time
can_reserve_aircraft(plane_id) - Check blocking docs
check_slot_conflict() - Trigger for jumper slot validation
get_available_pilots(operation_date) - Pilots with valid functions
```

### RLS Policies

- **Board**: Read/write most data (some restrictions)
- **Members**: Read most, write only own
- **Financial**: Board only
- **Locked Records**: Cannot be modified
- **Documents**: Unapproved only visible to uploader + board

---

## 5. AUTHENTICATION & AUTHORIZATION

### Authentication

**Setup**: Supabase Auth (email/password) • Cookie-based SSR sessions • Middleware route protection • OAuth infrastructure ready

**Server Functions**:
```typescript
createClient() - Server Supabase client with SSR
createAdminClient() - Admin client for invitations
getUser() - Current auth user
getUserProfile() - User with function codes for RBAC
getSession() - Current session
```

### Authorization (Two-Tier RBAC)

**1. Role-Based (Legacy)**
- `member`: Default for all users
- `board`: Elevated privileges

**2. Function-Based (Granular RBAC)**
- **System Functions**: Pilot, Flight Instructor, Chief Pilot, Tandem Master, Skydive Instructor, Sport Jumper, Skydive Pilot, Manifest Coordinator, Treasurer, Chairman, Secretary
- **Custom Functions**: Board can create club-specific
- **Validity Periods**: Functions have valid_from/valid_until dates

**Permission Matrix** (`lib/permissions/index.ts`):
```typescript
'flight.log.create': [PILOT, FLIGHT_INSTRUCTOR]
'flight.log.approve': [CHIEF_PILOT, 'board']
'members.view.all': ['board', SECRETARY]
'billing.view.all': ['board', TREASURER]
'documents.approve': ['board']
// 30+ granular permissions
```

**Runtime Functions**:
```typescript
hasPermission(user, 'permission') - Check single
hasAnyPermission(user, [...]) - Check any
hasAllPermissions(user, [...]) - Check all
canEditFlightLog(user, flightLog) - Special check
```

**Server Action Guards**:
```typescript
requirePermission(supabase, 'permission.name')
requireBoardMember(supabase)
getCurrentUserWithFunctions(supabase)
```

---

## 6. KEY FEATURES

### 1. Dashboard
Stats cards (reservations, balance, costs, notifications) • Upcoming reservations (7 days) • Account history (10 recent) • Recent flights • Real-time subscriptions

### 2. Aircraft Management
List with search/filter • Detail tabs (specs, documents, flight logs, maintenance, components) • Document expiry warnings (red <30d, yellow <60d) • Blocking documents prevent reservations

### 3. Member Management (Board Only)
Member list with roles/functions • Invite via email • Edit profile, assign functions with validity periods • Document approval (licenses, medical, ID)

### 4. Documents
Club documents (not aircraft/user specific) • Categories (Regulations, Procedures, Forms, General, Custom) • Upload, search, filter • Board-only actions

### 5. Settings (Board Only)
Function management (create, edit, delete custom) • Toggle system functions • Yearly fees • Membership types • Billing rates • Tandem registration config

### 6. Billing & Accounting (Board Only)

**Core Features**: Cost centers • User account balances • Transaction creation • Flight charging with split allocation • Operation type default splits

**CRITICAL: Two Reversal Systems**

**A. Flight Charge Reversals** (atomic for all flight transactions)
- Functions: `reverseFlightCharge()` (accounts.ts), `reverseCostCenterFlightCharge()` (cost-centers.ts)
- Purpose: Reverse ALL transactions for a flight atomically
- UI: Orange "Reverse Charge" button
- Behavior: When reversing split-charged flight (e.g., 50% User, 25% CC-A, 25% CC-B), clicking "Reverse Charge" on ANY transaction:
  - Creates reversals for ALL 3 transactions
  - Marks ALL as reversed
  - Unlocks flight (charged=false, locked=false)
  - Allows re-charging with different allocation
- Why: Prevents partial reversals causing accounting inconsistencies

**B. Manual Transaction Reversals** (single transaction only)
- Functions: `reverseUserTransaction()`, `reverseCostCenterTransaction()` (accounting.ts)
- Purpose: Reverse manual adjustments (deposits, corrections)
- UI: "Undo" button
- Protection: Rejects flight-related transactions

**Split Charging**:
- Percentage-based distribution across 2-5 targets (users and/or cost centers)
- Airport fees can be split equally or assigned to specific target
- Validation: Percentages must sum to 100%
- All transactions linked by `flightlog_id`

Example:
```
Flight: €300 + €60 fees, Split: 50% Pilot, 25% CC-A, 25% CC-B, Fees: Split
Result: Pilot -€180 (€150+€30), CC-A -€90 (€75+€15), CC-B -€90 (€75+€15)
```

**Key Files**:
- `/lib/actions/accounts.ts` - User operations + flight reversals
- `/lib/actions/cost-centers.ts` - Cost center ops + flight reversals
- `/lib/actions/accounting.ts` - Manual reversals (non-flight only)
- `/app/(dashboard)/accounting/components/reverse-charge-dialog.tsx`
- `/app/(dashboard)/accounting/components/undo-transaction-dialog.tsx`

### 7. Flight Log
Create entries • Aircraft selection • Charging & locking (splits supported) • Auto-calculate times • Track crew • Atomic reversal • RBAC permissions

### 8. Reservations
react-big-calendar view • Conflict detection • Standby list • Duration-based booking • Aircraft filter • Real-time updates • RBAC permissions

### 9. Permissions Management
View all functions (system/custom) • Assign to users • Set validity periods • Display permission matrix

### 10. Skydive Manifest System
- **Operation Days**: Daily ops with aircraft/pilot assignment
- **Flights**: Sequential loads (Load 1, 2, 3...) with status progression (planned → ready → boarding → in_air → completed)
- **Sport Jumpers**: 1 slot each, select from sport_jumper function users
- **Tandem Pairs**: 2 slots per pair (tandem_master + passenger), payment tracking
- **Slot Management**: Visual grid, color-coded (blue=sport, purple=tandem, gray=empty), conflict prevention via trigger
- **View Modes**: Board view (card grid) + List view (collapsible table)
- **Flight Actions**: Edit, postpone, cancel, delete, complete, reactivate
- **Settings**: Configurable payment types, default altitudes
- **Permissions**: manifest_coordinator (full), skydive_pilot (view), board (full)
- **User Tracking**: tandem_jump_completed automatically marked for passengers on completed flights

---

## 7. API ROUTES

**Documents**: upload, user, types, approve, pending-approvals, user-alerts, renew, signed-url, update-expiry
**Users**: search, [userId], [userId]/balance, track-selection
**Functions**: GET all functions
**Registration**: tandem/fields, tandem (POST), tandem/auth
**Settings**: tandem-registration (POST)

---

## 8. SERVER ACTIONS (`lib/actions/`)

**Documents**: uploadDocument, approveDocument, deleteDocument, renewDocument
**Members**: updateMember, inviteUser, assignFunction, unassignFunction
**Billing/Accounting**: createTransaction, reverseTransaction, chargeFlight, updateBillingRate
**Manifest**: createOperationDay, updateOperationDay, deleteOperationDay, createFlight, updateFlight, deleteFlight, addSportJumper, addTandemPair, removeJumper, updateManifestSettings
**Other**: updateUserPreferences, updateMembershipStatus

---

## 9. i18n

**Library**: next-intl • **Languages**: German (default), English • **Files**: `messages/de.json`, `messages/en.json` • **Config**: `i18n.ts`, `middleware.ts`

**Priority**: user.preferred_language DB → Accept-Language header → NEXT_LOCALE cookie → English

---

## 10. TESTING

### Framework
Jest 29.x • jsdom • @testing-library/react • **132 passing tests**

### Test Coverage
- **Flight Charging** (`__tests__/actions/flight-charging-simple.test.ts`): 21 tests - split validation, amount calculation, reversals, error scenarios
- **Manifest System** (`__tests__/actions/manifest-system.test.ts`): 58 tests - slot allocation, conflict detection, status progression, postponement, capacity validation
- **Other**: API routes, reservation actions, document workflows (53+ tests)

### Strategy
**Unit Tests**: Business logic (calculations, validations, state transitions) without complex mocking
**Manual Tests**: Database transactions, RLS policies, UI workflows, real-world scenarios

### Running Tests
```bash
npm test                                      # All tests
npm test -- __tests__/actions/flight-charging-simple.test.ts
npm test -- __tests__/actions/manifest-system.test.ts
npm test -- --coverage
npm test -- --watch
```

---

## 11. DEVELOPMENT PATTERNS

### Server Actions Pattern
```typescript
'use server'
const { user, error } = await requirePermission(supabase, 'permission.name')
if (!user) return { error }
const { data, error } = await supabase.from('table').insert(data)
revalidatePath('/route')
return { success: true, data }
```

### Database Query Pattern
```typescript
const { data, error } = await supabase
  .from('table')
  .select('field1, field2, relation(*)')
  .eq('filter', value)
  .order('created_at', { ascending: false })
```

### Form Validation Pattern
```typescript
const schema = z.object({ email: z.string().email(), name: z.string().min(2) })
const result = schema.safeParse(formData)
if (!result.success) return { error: result.error.flatten() }
```

---

## 12. RECENT DEVELOPMENTS (Nov-Dec 2025)

### Store CMS & Voucher Customization (Dec 1)
Full CMS for tandem store • 5-tab interface (Home, Voucher Cards, Booking Cards, Vouchers Page, Bookings Page) • Customizable headers, subtitles, footer (EN/DE) • Voucher type features with bullet points • Dynamic feature lists • Migration: `20251127120000_add_voucher_customization.sql`

### Skydive Manifest System (Nov 23)
Complete load management • 5 new tables • manifest_coordinator and skydive_pilot functions • check_slot_conflict() trigger • User tandem jump tracking • Aircraft max_jumpers configuration

### Endorsement System Redesign (Nov 17)
Replaced document_privileges → endorsements system • Separate IR expiry tracking • Predefined + custom endorsements • Board contact settings for multi-club support • Fixed invite token expiry (now 24 hours)

### Split Charge Reversal Fix (Nov)
Fixed atomic reversal of split-charged flights • Added automated tests • System now reverses ALL transactions with same flightlog_id

### Granular RBAC System
Hybrid RBAC (roles + functions) • 30+ permissions in matrix • user_functions junction table with validity periods • Migration: `20250202100006_rbac_system.sql`

---

## 13. DEPLOYMENT & CI/CD

### Platform
Vercel (app) • Supabase (DB + storage) • GitHub Actions (CI/CD)

### Workflows

**1. Comprehensive CI** (ci.yml) - Every push + PRs
- Linting (ESLint) • Type check • Tests (132) • Build (Next.js) • Coverage upload • ~3-5 min

**2. Deploy Staging** (deploy-staging.yml) - Push to main
- Migrations on staging • Deploy to Vercel staging • ~2-3 min

**3. Deploy Production** (deploy-production.yml) - Manual trigger
- Migrations on production • Deploy to Vercel production • ~3-4 min

### Deployment Flow
Feature branch → CI → PR → CI → Merge to main → Staging auto-deploy → Verify → Manual production deploy

---

## 14. CONFIGURATION

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
DATABASE_URL=postgresql://...
```

### Key Config Files
`next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `jest.config.ts`, `components.json`, `eslint.config.mjs`, `middleware.ts`

---

## 15. SECURITY

### Authentication
Supabase Auth • Hashed passwords • Secure HTTP-only cookies • Token refresh via middleware

### Authorization
RLS on all tables • RBAC permission matrix (server-side) • Server actions check permissions • Client UI respects permissions

### Data Protection
User-specific queries via auth.uid() • Financial data board-only • Document approval workflow • Locked flight logs immutable

### API Security
Route handlers check auth • POST/DELETE verify permissions • File upload validation (type, size) • Signed URLs for storage

---

## 16. COMMON WORKFLOWS

### Adding a New Feature
1. Create migration in `supabase/migrations/` with tables, constraints, RLS
2. Regenerate `lib/database.types.ts` with `supabase gen types`
3. Add server action in `lib/actions/[domain].ts` with `requirePermission()`
4. Build UI in `app/(dashboard)/[feature]/` using shadcn/ui
5. Write tests for server actions and RLS policies

### Adding a Permission
1. Add to `PERMISSIONS` in `lib/permissions/index.ts`
2. Check with `hasPermission(user, 'new.permission')`
3. Guard server actions with `requirePermission()`
4. Update sidebar/components to respect permission

---

## 17. TROUBLESHOOTING

**"Not authenticated" errors**: Check session exists, middleware redirects, env vars set
**RLS policy errors (403)**: Verify auth, check policies, test with psql, check permission matrix
**Document upload fails**: Check buckets exist, file <25MB, MIME types allowed, board role
**Build errors**: Run `npm run build`, check types match schema, regenerate types
**Test failures**: Check mock client setup, verify return types, update mocks

---

## 18. DOCUMENTATION REFERENCES

**Core**: CLAUDE.md (this file) • /supabase/SCHEMA_DOCUMENTATION.md • /supabase/QUICK_REFERENCE.md • AUTH_SETUP.md • PROJECT_STATUS.md • SCHEMA_SUMMARY.md

**Features**: OPERATION_TYPE_COST_SPLITTING.md (split charging + atomic reversals) • MANIFEST_TESTING.md (58 manifest tests) • README.md

---

## 19. TECHNICAL DEBT & FUTURE

### Known Issues
- Legacy `functions` array in users table (migrated to user_functions)
- Some components still check `role.includes('board')` vs RBAC
- Test coverage could be expanded

### Planned
- Advanced reporting (flight hours, revenue, utilization)
- Mobile optimization (offline, push notifications)
- Audit logging for sensitive operations
- Waiting list with auto-promotion

### Scaling
- Materialized views if queries slow
- Read replicas for reporting
- Partition flightlog by year
- Cache permission checks

---

## SUMMARY

FlightHub is a production-ready aviation club management system with:

**Security**: Comprehensive RLS • RBAC with 30+ granular permissions • Secure session handling
**Data Integrity**: DB constraints • Triggers • Validated workflows • Atomic reversals
**Performance**: Strategic indexes • Materialized views • Efficient queries
**User Experience**: Responsive UI • Dark mode • Multi-language • Real-time updates
**Maintainability**: TypeScript throughout • Clear patterns • Comprehensive documentation
**Scalability**: Supports thousands of members and records

The codebase follows Next.js and Supabase best practices with clear patterns for extending features, adding permissions, and managing data. All critical paths secured with database RLS or server-side permission checks.

**IMPORTANT**: Always develop for local environment with local Supabase. Do not push migrations via MCP - add via `supabase migration up`, later deployed to staging via GitHub Actions.
- do not run supabase db reset without asking!