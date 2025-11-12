# FlightHub Supabase Schema

This directory contains the complete database schema, migrations, and documentation for the FlightHub aviation club management application.

## Project Information

- **Project Reference**: `bfzynfnowzkvhvleocny`
- **Database**: PostgreSQL (via Supabase)
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

### 1. Link Your Project (First Time Setup)

```bash
supabase link --project-ref bfzynfnowzkvhvleocny
```

### 2. Push Migrations to Remote Database

```bash
supabase db push
```

### 3. Verify Schema

```bash
supabase db diff --linked --schema public
```

Should return: "No schema changes found" (if migrations applied successfully)

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

### 1. Create First User

Sign up through your application. The trigger will automatically create an entry in `public.users`.

### 2. Promote to Board Member

```sql
UPDATE public.users
SET role = array_append(role, 'board')
WHERE email = 'admin@example.com';
```

### 3. Configure Storage (Optional)

Create storage buckets for:
- `documents` - For aircraft/user documents
- `flight-logs` - For mass & balance PDFs

Set appropriate storage policies based on document RLS.

### 4. Configure Auth Providers

In Supabase Dashboard > Authentication > Providers:
- Enable Email provider
- Configure OAuth providers (Google, GitHub, etc.) as needed
- Set redirect URLs

### 5. Add Sample Data (Development Only)

The sample data migration includes:
- 9 club functions
- 4 sample aircraft

Additional test data requires authenticated users.

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

### Applying Migrations

```bash
# Push to remote database
supabase db push

# Apply to local development database
supabase db reset
```

### Rolling Back

Supabase doesn't support automatic rollbacks. To revert:
1. Create a new migration that reverses the changes
2. Apply the new migration

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

## Version History

### v2.0.0 (November 2025)
- Granular RBAC system with function-based permissions
- user_functions junction table for many-to-many relationships
- function_categories for organizing functions
- Billing and accounting system (cost_centers, enhanced accounts)
- Maintenance tracking system for aircraft
- Membership types and management
- Airport fees system
- Storage bucket setup automation
- Realtime subscriptions configuration
- 19+ migration files with comprehensive features

### v1.0.0 (February 2025)
- Initial schema with core 8 tables
- Complete RLS policies for all tables
- Helper functions and views
- Sample data for testing
- Comprehensive documentation
