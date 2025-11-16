# FlightHub Supabase Schema

This directory contains the complete database schema, migrations, and documentation for the FlightHub aviation club management application.

## Project Information

### Environment Setup

FlightHub uses a **three-tier environment system**:

| Environment | Database | Purpose | Migrations |
|------------|----------|---------|------------|
| **Local** | Docker Supabase | Development & Testing | Applied via `supabase start` |
| **Staging** | Cloud Supabase (staging project) | Team Testing & Preview | Applied via GitHub Actions (auto) |
| **Production** | Cloud Supabase (`pememmvfgvsukpqxxwbm`) | Live Application | Applied via GitHub Actions (manual) |

- **Database**: PostgreSQL 17 (via Supabase)
- **Schema Version**: 2.0.0
- **Last Updated**: November 2025

## Directory Structure

```
supabase/
├── migrations/
│   ├── 20250202100000_initial_schema.sql              # Core schema with tables, RLS
│   ├── 20250202100001_document_system.sql             # Document management
│   ├── 20250202100002_billing_system.sql              # Billing & accounting
│   ├── 20250202100003_airport_fees.sql                # Airport fee system
│   ├── 20250202100004_maintenance_system.sql          # Aircraft maintenance
│   ├── 20250202100005_membership_system.sql           # Membership types
│   ├── 20250202100006_rbac_system.sql                 # Granular RBAC with functions
│   ├── 20250202100007_storage_buckets.sql             # Storage bucket setup
│   ├── 20250202100008_realtime.sql                    # Realtime subscriptions
│   ├── 20250202100009_sample_data.sql                 # Sample data
│   └── [10+ additional migrations]                    # Bug fixes, enhancements
├── SCHEMA_DOCUMENTATION.md                             # Complete schema docs
├── QUICK_REFERENCE.md                                  # Common SQL queries
└── README.md                                           # This file
```

## Quick Start

### Local Development

```bash
# Start local Supabase (applies all migrations automatically)
npm run supabase:start

# Or using Supabase CLI directly
supabase start

# Migrations are automatically applied from supabase/migrations/
# No need to link to cloud for local development
```

### Staging & Production Setup

**Note:** Migrations are applied automatically via GitHub Actions. Manual migration push is not recommended.

#### Initial Setup Only (One-Time)

```bash
# For staging project (replace with your staging project ref)
supabase link --project-ref [staging-project-ref]
supabase db push

# For production project
supabase link --project-ref pememmvfgvsukpqxxwbm
supabase db push
```

#### After Initial Setup

Migrations are applied automatically:
- **Staging**: On every push to `main` branch (via `.github/workflows/deploy-staging.yml`)
- **Production**: On manual workflow trigger (via `.github/workflows/deploy-production.yml`)

**See**: [DUAL_ENVIRONMENT_SETUP.md](../DUAL_ENVIRONMENT_SETUP.md) for complete deployment workflow.

## Schema Overview

### Core Tables (11 tables)

1. **users** - User profiles extending auth.users
2. **functions_master** - Club functions/roles with fees (System + Custom)
3. **user_functions** - Junction table for user-function assignments
4. **function_categories** - Function categorization (Aviation, Skydiving, etc.)
5. **planes** - Aircraft fleet
6. **reservations** - Flight bookings
7. **flightlog** - Actual flight records
8. **documents** - Unified document management
9. **accounts** - Financial transaction ledger
10. **notifications** - User notifications
11. **cost_centers** - Billing cost centers

### Views

- **users_with_functions** - Users joined with their function_codes array
- **active_reservations** - Current/future active reservations
- **flightlog_with_times** - Flightlog with calculated times
- **user_balances** - Aggregated account balances
- **aircraft_maintenance_status** - Aircraft maintenance tracking
- **component_status** - Aircraft component status tracking

### Helper Functions

- `is_board_member(user_uuid)` - Check if user is board member
- `calculate_block_time(block_on, block_off)` - Block time in hours
- `calculate_flight_time(takeoff, landing)` - Flight time in hours
- `can_reserve_aircraft(plane_id)` - Check if aircraft is reservable

## Row Level Security (RLS)

All tables have RLS enabled with comprehensive policies:

- **Members** can read most data and manage their own records
- **Board members** have elevated privileges across all tables
- **Financial data** is restricted to board members
- **Locked flightlog entries** cannot be modified by pilots

## Initial Setup Steps

### Local Development Setup

#### 1. Start Local Supabase

```bash
npm run supabase:start
# Automatically applies all migrations
```

#### 2. Create Test User

Via Supabase Studio (http://127.0.0.1:54323):
1. Go to **Authentication** → **Users** → **Add user**
2. Enter email and password
3. Auto-confirm email: YES

Via SQL:
```sql
-- Create test admin user
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
)
VALUES (
  'admin@test.local',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"name": "Admin", "surname": "User"}'::jsonb
);

-- Update users table with board role
INSERT INTO public.users (id, email, name, surname, role)
SELECT
  id,
  email,
  raw_user_meta_data->>'name',
  raw_user_meta_data->>'surname',
  ARRAY['board']::text[]
FROM auth.users
WHERE email = 'admin@test.local'
ON CONFLICT (id) DO UPDATE
SET role = ARRAY['board']::text[];
```

**See**: [../QUICK_START_LOCAL.md](../QUICK_START_LOCAL.md) for detailed local setup.

### Staging & Production Setup

#### 1. Create Supabase Projects

Create two separate Supabase projects:
- **Staging**: For team testing
- **Production**: For live application (may already exist: `pememmvfgvsukpqxxwbm`)

#### 2. Initialize Databases

```bash
# Link and push migrations to each project
supabase link --project-ref [staging-ref]
supabase db push

supabase link --project-ref pememmvfgvsukpqxxwbm
supabase db push
```

#### 3. Create First User in Each Environment

Sign up through your application or use Supabase Dashboard → Authentication → Users.

#### 4. Promote to Board Member

```sql
UPDATE public.users
SET role = array_append(role, 'board')
WHERE email = 'admin@example.com';
```

#### 5. Configure Storage

Storage buckets are created automatically via migration `20250202100007_storage_buckets.sql`.

Buckets created:
- `documents` - For aircraft/user documents
- `flight-logs` - For mass & balance PDFs
- `user-documents` - For user-uploaded documents

#### 6. Configure Auth Providers

In Supabase Dashboard > Authentication > Providers:
- Enable Email provider
- Configure OAuth providers (optional)
- Set redirect URLs for each environment

**See**: [../.github/DUAL_ENVIRONMENT_CHECKLIST.md](../.github/DUAL_ENVIRONMENT_CHECKLIST.md) for complete setup.

## Common Operations

### Promote User to Board
```sql
UPDATE public.users
SET role = array_append(role, 'board')
WHERE email = 'user@example.com';
```

### Assign Function to User
```sql
-- Using new user_functions junction table
INSERT INTO public.user_functions (user_id, function_id, assigned_by)
SELECT
  (SELECT id FROM public.users WHERE email = 'user@example.com'),
  (SELECT id FROM public.functions_master WHERE code = 'PILOT'),
  auth.uid();

-- Legacy method (deprecated)
UPDATE public.users
SET functions = array_append(functions, 'President')
WHERE email = 'user@example.com';
```

### Lock Flightlog Entry (Board Only)
```sql
UPDATE public.flightlog
SET locked = true
WHERE id = 'FLIGHTLOG_UUID';
```

### Approve Document (Board Only)
```sql
UPDATE public.documents
SET approved = true
WHERE id = 'DOCUMENT_UUID';
```

### Create Account Transaction (Board Only)
```sql
INSERT INTO public.accounts (user_id, amount, description, created_by)
VALUES (
    'USER_UUID',
    -150.00,
    'Flight time charge: 1.5 hours @ $100/hr',
    auth.uid()
);
```

See `helper_queries.sql` for more examples.

## TypeScript Integration

TypeScript types are available at `/lib/database.types.ts`.

### Usage with Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Typed queries
const { data: planes } = await supabase
  .from('planes')
  .select('*')
  .eq('active', true)

// Typed inserts
const { data: reservation } = await supabase
  .from('reservations')
  .insert({
    plane_id: 'uuid',
    user_id: 'uuid',
    start_time: '2025-01-20T10:00:00Z',
    end_time: '2025-01-20T13:00:00Z',
  })
  .select()
  .single()
```

## Migration Management

### Creating New Migrations

```bash
# Create a new migration file
supabase migration new migration_name

# Edit the generated file in supabase/migrations/
```

### Testing Migrations Locally

```bash
# Reset local database (drops all data and re-applies all migrations)
npm run supabase:reset

# Or using Supabase CLI directly
supabase db reset

# Test your app with the fresh migration
npm run dev
```

**Important**: Always test migrations locally with `supabase reset` multiple times before deploying to staging/production.

### Applying Migrations to Cloud

**Automated (Recommended)**:
- **Staging**: Migrations applied automatically when you push to `main` branch
- **Production**: Migrations applied when you manually trigger production deployment

**Manual (Initial Setup Only)**:
```bash
# For initial setup or emergency fixes only
supabase link --project-ref [project-ref]
supabase db push
```

### Deployment Workflow

```
1. Create migration locally
   ↓
2. Test with: npm run supabase:reset (multiple times)
   ↓
3. Commit and push to main
   ↓
4. GitHub Actions applies to staging automatically
   ↓
5. Test in staging environment
   ↓
6. Manually trigger production deployment
   ↓
7. GitHub Actions applies to production
```

**See**: [../DUAL_ENVIRONMENT_SETUP.md](../DUAL_ENVIRONMENT_SETUP.md) for complete workflow.

### Rolling Back

Supabase doesn't support automatic rollbacks. To revert:

1. **Create a rollback migration**:
```bash
supabase migration new rollback_feature_name
```

2. **Add SQL to reverse the changes**:
```sql
-- Example: Rollback added column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

3. **Test locally**:
```bash
npm run supabase:reset
```

4. **Deploy via normal workflow**:
```bash
git add .
git commit -m "fix: rollback broken migration"
git push origin main  # Deploys to staging

# Then manually deploy to production
```

## Performance Considerations

### Indexes Created

All foreign keys and frequently queried fields have indexes (40+ strategic indexes):
- All `*_id` fields (foreign keys)
- Time fields (`start_time`, `end_time`, `block_on`, `expiry_date`, `valid_from`, `valid_until`)
- Status fields (`active`, `locked`, `charged`, `read`, `status`, `approved`, `blocks_aircraft`)
- Array fields use GIN indexes (`role`, `functions`, `tags`, `nav_equipment`, `function_codes`)
- Composite indexes for common query patterns (user_id + created_at)
- Partial indexes on active records (active = true, read = false)

### Query Optimization Tips

1. **Use views** for complex queries with calculations
2. **Use PostgREST embedding** to avoid N+1 queries
3. **Filter early** in WHERE clauses to use indexes
4. **Limit results** for large tables with pagination
5. **Use partial indexes** (unread notifications, active planes)

## Security Best Practices

### RLS Policies
- ✅ All tables have RLS enabled
- ✅ Policies use `auth.uid()` for user context
- ✅ Board check uses security definer function
- ✅ Locked entries are protected from modification

### Authentication
- ✅ User creation integrated with auth.users
- ✅ Email validation via check constraint
- ✅ Role-based access control implemented

### Data Integrity
- ✅ Foreign keys with appropriate ON DELETE actions
- ✅ Check constraints for business rules
- ✅ Triggers for data validation
- ✅ Timestamps for auditability

## Monitoring and Maintenance

### Regular Tasks

1. **Weekly**: Check for expired aircraft documents
2. **Monthly**: Review unlocked flightlog entries
3. **Quarterly**: Analyze query performance
4. **Yearly**: Archive old reservations/notifications

### Monitoring Queries

```sql
-- Expired blocking documents
SELECT p.tail_number, d.name, d.expiry_date
FROM documents d
JOIN planes p ON d.plane_id = p.id
WHERE d.blocks_aircraft AND d.approved AND d.expiry_date < CURRENT_DATE;

-- Unlocked flightlogs older than 48 hours
SELECT * FROM flightlog
WHERE locked = false AND block_on < NOW() - INTERVAL '48 hours';

-- Users with negative balances
SELECT * FROM user_balances WHERE balance < 0;
```

## Troubleshooting

### Common Issues

**"Permission denied" errors**
- Check RLS policies for the table
- Verify user is authenticated (`auth.uid()` returns value)
- Confirm user has appropriate role

**"Cannot modify locked flightlog entry"**
- This is expected behavior for locked entries
- Only board members can unlock entries if needed

**"No rows returned" on insert/update**
- RLS `WITH CHECK` policy may be failing
- Verify you're not violating business rules or constraints

**Type errors with Supabase client**
- Regenerate types from schema if structure changed
- Ensure you're using the correct type from `database.types.ts`

### Getting Help

1. Review `SCHEMA_DOCUMENTATION.md` for detailed table info
2. Check `helper_queries.sql` for query examples
3. Verify RLS policies allow the operation
4. Check Supabase logs in Dashboard > Logs

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgREST API Reference](https://postgrest.org/en/stable/api.html)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Deployment Environments

### Local Development
- **Database**: Docker Supabase (isolated, resettable)
- **Purpose**: Development and testing
- **Migrations**: Applied automatically via `supabase start`
- **URL**: http://127.0.0.1:54321
- **Studio**: http://127.0.0.1:54323

### Staging
- **Database**: Cloud Supabase (staging project)
- **Purpose**: Team testing before production
- **Migrations**: Applied automatically via GitHub Actions on push to `main`
- **Deployment**: Automatic

### Production
- **Database**: Cloud Supabase (`pememmvfgvsukpqxxwbm`)
- **Purpose**: Live application
- **Migrations**: Applied via GitHub Actions on manual trigger
- **Deployment**: Manual (requires confirmation)

## Version History

### v2.0.0 (November 2025)
- **Deployment**: Three-tier environment system (Local → Staging → Production)
- **Automation**: GitHub Actions for staging and production deployments
- **RBAC**: Granular function-based permission system
- **Database**: user_functions junction table, function_categories
- **Billing**: Cost centers, enhanced accounting system
- **Maintenance**: Aircraft maintenance tracking
- **Memberships**: Membership types and management system
- **Airport Fees**: Dynamic airport fee system
- **Storage**: Automated bucket setup via migrations
- **Realtime**: Configured subscriptions for live updates
- **Endorsements**: Document endorsement/rating system with IR tracking
- **Migrations**: 30+ migration files with comprehensive features

### v1.0.0 (February 2025)
- Initial schema with core 8 tables
- Complete RLS policies for all tables
- Helper functions and views
- Sample data for testing
- Comprehensive documentation

## Related Documentation

- [DUAL_ENVIRONMENT_SETUP.md](../DUAL_ENVIRONMENT_SETUP.md) - Complete staging/production setup guide
- [QUICK_START_LOCAL.md](../QUICK_START_LOCAL.md) - Quick local development reference
- [.github/DUAL_ENVIRONMENT_CHECKLIST.md](../.github/DUAL_ENVIRONMENT_CHECKLIST.md) - Setup checklist
- [SCHEMA_DOCUMENTATION.md](./SCHEMA_DOCUMENTATION.md) - Detailed schema documentation
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Common SQL queries
