# FlightHub Database Quick Reference

## Connection Info
- **Project**: bfzynfnowzkvhvleocny
- **Region**: Your configured region
- **Database**: PostgreSQL 15+ via Supabase

## Tables at a Glance

| Table | Primary Use | Key Fields | RLS |
|-------|-------------|------------|-----|
| **users** | User profiles | email, role[], functions[] | ✅ All read, own update |
| **functions_master** | Club roles | name, yearly_rate | ✅ All read, board write |
| **planes** | Aircraft fleet | tail_number, type, active | ✅ All read, board write |
| **reservations** | Bookings | plane_id, start/end_time, status | ✅ All read, own write |
| **flightlog** | Flight records | times, fuel, locked, charged | ✅ All read, pilot write |
| **documents** | Files/docs | entity FK, expiry, approved | ✅ Approved read, board approve |
| **accounts** | Transactions | user_id, amount, description | ✅ Own read, board write |
| **notifications** | Alerts | user_id, message, read | ✅ Own read/update |

## Views

| View | Purpose |
|------|---------|
| **active_reservations** | Current/future reservations with details |
| **flightlog_with_times** | Flights with calculated block/flight hours |
| **user_balances** | Aggregated account balances |

## Key Functions

```sql
-- Check if user is board member
SELECT is_board_member('USER_UUID');

-- Calculate times in hours
SELECT calculate_block_time(block_on, block_off);
SELECT calculate_flight_time(takeoff_time, landing_time);

-- Check if aircraft can be reserved
SELECT can_reserve_aircraft('PLANE_UUID');
```

## Common Operations

### User Management
```sql
-- Promote to board
UPDATE users SET role = array_append(role, 'board')
WHERE email = 'user@example.com';

-- Assign function
UPDATE users SET functions = array_append(functions, 'President')
WHERE email = 'user@example.com';
```

### Reservations
```sql
-- Create reservation
INSERT INTO reservations (plane_id, user_id, start_time, end_time)
VALUES ('PLANE_UUID', 'USER_UUID', '2025-01-20 10:00', '2025-01-20 13:00');

-- Check conflicts
SELECT * FROM reservations
WHERE plane_id = 'PLANE_UUID' AND status = 'active'
AND start_time < 'END' AND end_time > 'START';
```

### Flightlog
```sql
-- Create entry
INSERT INTO flightlog (plane_id, pilot_id, block_on, block_off,
                       takeoff_time, landing_time, fuel)
VALUES ('PLANE_UUID', 'PILOT_UUID', '2025-01-20 10:00', '2025-01-20 12:00',
        '2025-01-20 10:05', '2025-01-20 11:55', 25.5);

-- Lock entry (board only)
UPDATE flightlog SET locked = true WHERE id = 'LOG_UUID';
```

### Documents
```sql
-- Upload document
INSERT INTO documents (plane_id, name, file_url, uploaded_by)
VALUES ('PLANE_UUID', 'Insurance', 'url', 'USER_UUID');

-- Approve (board only)
UPDATE documents SET approved = true WHERE id = 'DOC_UUID';
```

### Accounts
```sql
-- Create transaction (board only)
INSERT INTO accounts (user_id, amount, description, created_by)
VALUES ('USER_UUID', -150.00, 'Flight charge', 'BOARD_UUID');

-- Get balance
SELECT * FROM user_balances WHERE user_id = 'USER_UUID';
```

## TypeScript Usage

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Example queries
const { data: planes } = await supabase
  .from('planes')
  .select('*')
  .eq('active', true)

const { data: reservations } = await supabase
  .from('active_reservations')
  .select('*')
  .eq('user_id', userId)
  .gte('start_time', new Date().toISOString())
```

## RLS Roles

| Role | Can Read | Can Write | Special Access |
|------|----------|-----------|----------------|
| **member** | Most tables | Own records | Cannot see unapproved docs |
| **board** | Everything | Everything | Can lock flightlogs, approve docs |

## Indexes

All foreign keys are indexed. Additional indexes on:
- Time fields (start_time, end_time, block_on, expiry_date)
- Status fields (active, locked, charged, read, status)
- Array fields (GIN indexes on role, functions, tags)

## Constraints

- Reservation: end_time > start_time
- Flightlog: Times must be sequential (block_on < takeoff < landing < block_off)
- Flightlog: Pilot ≠ copilot
- Flightlog: Cannot charge without locking
- Documents: Must belong to exactly one entity (plane, user, or category)

## First-Time Setup

1. Sign up first user via Auth
2. Promote to board: `UPDATE users SET role = array_append(role, 'board') WHERE email = 'you@email.com'`
3. Create storage buckets: `documents`, `flight-logs`
4. Configure storage policies
5. Start building!

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Permission denied | Check RLS policies, verify auth.uid() |
| Cannot modify locked flightlog | Expected behavior, board can unlock if needed |
| Type errors | Regenerate types from latest schema |
| No rows returned | Check RLS WITH CHECK policy |

## File Locations

- Migrations: `/supabase/migrations/`
- Full docs: `/supabase/SCHEMA_DOCUMENTATION.md`
- Helper queries: `/supabase/helper_queries.sql`
- Types: `/lib/database.types.ts`
- Summary: `/SCHEMA_SUMMARY.md`

---

**Quick Help**: See `helper_queries.sql` for 50+ example queries
