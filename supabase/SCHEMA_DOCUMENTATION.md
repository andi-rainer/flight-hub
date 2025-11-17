# FlightHub Database Schema Documentation

## Overview
Complete Supabase database schema for FlightHub aviation club management application.

**Project Reference:** <TO BE DEFINED>
**Last Updated:** November 17, 2025

## Database Statistics
- **Tables:** 16 core tables with RLS
- **Views:** 5 views (4 materialized, 1 regular)
- **Functions:** 5 PostgreSQL helper functions
- **Indexes:** 45+ strategic indexes for performance

## Schema Design Principles

1. **Security First**: All tables have RLS enabled with comprehensive policies
2. **Data Integrity**: Foreign keys, check constraints, and triggers ensure data consistency
3. **Performance**: Strategic indexes on frequently queried fields
4. **Auditability**: Created/updated timestamps on all relevant tables
5. **Flexibility**: JSONB fields for complex data, arrays for multi-value attributes
6. **Hybrid RBAC**: Combines role-based (board/member) with function-based permissions

## Database Tables

### 1. users
Extends `auth.users` with aviation club specific profile information.

**Key Fields:**
- `id` (UUID, FK to auth.users) - Primary key
- `email` (TEXT, UNIQUE) - User email
- `name`, `surname` (TEXT) - User name
- `role` (TEXT[]) - User roles: 'member', 'board'
- `license_number` (TEXT) - Pilot license number
- `functions` (TEXT[]) - **DEPRECATED** - Use user_functions junction table instead
- `emergency_contact_name`, `emergency_contact_phone` (TEXT) - Emergency contact info
- `phone` (TEXT) - User phone number
- `preferred_language` (TEXT) - User's language preference ('en' or 'de')

**RLS Policies:**
- All authenticated users can read all user profiles
- Users can update their own profile
- Board members can update any profile and create users

**Indexes:**
- `idx_users_email` - Email lookup
- `idx_users_role` - GIN index for role array queries

**Note:** Users are automatically created via trigger when auth.users entries are inserted.

---

### 2. functions_master
Master list of club functions/roles with associated yearly fees. Supports both system functions (hardcoded) and custom functions (board-defined).

**Key Fields:**
- `id` (UUID) - Primary key
- `code` (TEXT, UNIQUE) - Unique function code (e.g., 'PILOT', 'FLIGHT_INSTRUCTOR')
- `name` (TEXT) - English name
- `name_de` (TEXT) - German name
- `category_id` (UUID, FK to function_categories) - Function category
- `is_system` (BOOLEAN) - TRUE for system functions (cannot be deleted)
- `active` (BOOLEAN) - Whether function is active/available
- `yearly_fee` (NUMERIC) - Annual fee for this function
- `description` (TEXT) - Function description

**RLS Policies:**
- All authenticated users can read
- Only board members can insert/update/delete

**System Functions:**
- Aviation: PILOT, FLIGHT_INSTRUCTOR, CHIEF_PILOT
- Skydiving: TANDEM_MASTER, SKYDIVE_INSTRUCTOR, SPORT_JUMPER
- Operations: MANIFEST_COORDINATOR
- Administration: TREASURER, CHAIRMAN, SECRETARY

**Indexes:**
- `idx_functions_master_code` - UNIQUE index on code
- `idx_functions_master_category` - Category lookup
- `idx_functions_master_active` - Filter active functions

---

### 3. function_categories
Organizes functions into logical categories.

**Key Fields:**
- `id` (UUID) - Primary key
- `code` (TEXT, UNIQUE) - Category code (e.g., 'AVIATION', 'SKYDIVING')
- `name_en` (TEXT) - English category name
- `name_de` (TEXT) - German category name
- `sort_order` (INT) - Display order

**RLS Policies:**
- All authenticated users can read
- Only board members can create/modify categories

**Default Categories:**
- AVIATION - Aviation-related functions
- SKYDIVING - Skydiving-related functions
- OPERATIONS - Operational functions
- ADMINISTRATION - Administrative functions
- CUSTOM - Custom club-specific functions

---

### 4. user_functions
Junction table for many-to-many relationship between users and functions.

**Key Fields:**
- `id` (UUID) - Primary key
- `user_id` (UUID, FK to users) - User reference
- `function_id` (UUID, FK to functions_master) - Function reference
- `assigned_at` (TIMESTAMPTZ) - When function was assigned
- `assigned_by` (UUID, FK to users) - Who assigned the function
- `valid_from` (DATE) - Function validity start date
- `valid_until` (DATE, nullable) - Function validity end date

**RLS Policies:**
- All authenticated users can read
- Only board members can assign/unassign functions

**Indexes:**
- `idx_user_functions_user_id` - User lookup
- `idx_user_functions_function_id` - Function lookup
- `idx_user_functions_unique` - UNIQUE constraint on (user_id, function_id)

**Check Constraints:**
- `valid_until` must be after `valid_from` if provided

---

### 5. planes
Aircraft fleet information and specifications.

**Key Fields:**
- `id` (UUID) - Primary key
- `tail_number` (TEXT, UNIQUE) - Aircraft registration
- `type` (TEXT) - Aircraft model
- `empty_weight`, `max_fuel`, `max_mass` (NUMERIC) - Weight specs
- `fuel_consumption` (NUMERIC) - Fuel burn rate
- `color` (TEXT) - Aircraft color scheme
- `nav_equipment`, `xdpr_equipment`, `emer_equipment` - Equipment lists
- `cg_limits` (JSONB) - Center of gravity envelope
- `active` (BOOLEAN) - Whether aircraft is available for use

**RLS Policies:**
- All authenticated users can read all planes
- Only board members can create/update/delete planes

**Indexes:**
- `idx_planes_tail_number` - Fast tail number lookup
- `idx_planes_active` - Filter active aircraft

**Check Constraints:**
- All weight/fuel values must be positive
- Tail number and type must be non-empty

---

### 6. reservations
Flight reservations/bookings for aircraft.

**Key Fields:**
- `id` (UUID) - Primary key
- `plane_id` (UUID, FK) - Reference to planes
- `user_id` (UUID, FK) - Reference to users
- `start_time`, `end_time` (TIMESTAMPTZ) - Reservation period
- `status` (ENUM) - 'active', 'standby', 'cancelled'
- `priority` (BOOLEAN) - Priority reservation flag
- `remarks` (TEXT) - Additional notes

**RLS Policies:**
- All authenticated users can read all reservations
- Users can create reservations for themselves
- Users can update/delete their own active reservations
- Board members can manage all reservations

**Indexes:**
- `idx_reservations_plane_id` - Aircraft lookup
- `idx_reservations_user_id` - User lookup
- `idx_reservations_start_time`, `idx_reservations_end_time` - Time queries
- `idx_reservations_time_range` - Composite index for range queries
- `idx_reservations_status` - Status filtering

**Check Constraints:**
- `end_time` must be after `start_time`
- Reservations must be created before or at `start_time`

**View:** `active_reservations` - Shows current/future active reservations with plane and user details

---

### 7. flightlog
Flight log entries tracking actual flights.

**Key Fields:**
- `id` (UUID) - Primary key
- `plane_id` (UUID, FK) - Reference to planes
- `pilot_id` (UUID, FK) - Reference to pilot user
- `copilot_id` (UUID, FK, nullable) - Reference to copilot user
- `block_on`, `block_off` (TIMESTAMPTZ) - Block times
- `takeoff_time`, `landing_time` (TIMESTAMPTZ) - Flight times
- `fuel`, `oil` (NUMERIC) - Fuel and oil quantities
- `m_and_b_pdf_url` (TEXT) - Mass and balance document URL
- `locked` (BOOLEAN) - Prevents modification when TRUE
- `charged` (BOOLEAN) - Indicates if flight has been charged

**RLS Policies:**
- All authenticated users can read all entries
- Users can create entries as pilot
- Users can update their own unlocked entries
- Board members can lock/charge entries and delete any entry

**Indexes:**
- `idx_flightlog_plane_id` - Aircraft lookup
- `idx_flightlog_pilot_id`, `idx_flightlog_copilot_id` - Crew lookup
- `idx_flightlog_block_on` - Time-based queries
- `idx_flightlog_locked`, `idx_flightlog_charged` - Status filtering

**Check Constraints:**
- Block off > block on
- Landing > takeoff
- Takeoff >= block on, landing <= block off
- Fuel and oil must be non-negative
- Pilot and copilot must be different
- Cannot charge without locking first

**Triggers:**
- Prevents modification of locked entries (except lock/charge flags)
- Auto-updates `updated_at` timestamp

**View:** `flightlog_with_times` - Includes calculated block time and flight time in hours

**Helper Functions:**
- `calculate_block_time(block_on, block_off)` - Returns block time in hours
- `calculate_flight_time(takeoff_time, landing_time)` - Returns flight time in hours

---

### 8. documents
Document management for users, aircraft, and general club documents.

**Key Fields:**
- `id` (UUID) - Primary key
- `plane_id` (UUID, FK, nullable) - Aircraft document
- `user_id` (UUID, FK, nullable) - User document
- `category` (TEXT) - General category for non-specific docs
- `name` (TEXT) - Document name
- `file_url` (TEXT) - Storage URL
- `tags` (TEXT[]) - Document tags
- `uploaded_by` (UUID, FK) - User who uploaded
- `uploaded_at` (TIMESTAMPTZ) - Upload timestamp
- `expiry_date` (DATE, nullable) - Document expiration
- `approved` (BOOLEAN) - Board approval status
- `blocks_aircraft` (BOOLEAN) - Prevents aircraft reservation when expired

**RLS Policies:**
- Approved documents visible to all authenticated users
- Users can see their own documents (approved or not)
- Board members can see all documents
- Users can upload documents for themselves
- Board members can approve and manage all documents
- Users can delete their own unapproved documents
- Board can delete any document

**Indexes:**
- `idx_documents_plane_id`, `idx_documents_user_id`, `idx_documents_category` - Entity lookup
- `idx_documents_expiry_date` - Expiration queries (partial index)
- `idx_documents_approved` - Approval status
- `idx_documents_blocks_aircraft` - Critical documents (partial index)
- `idx_documents_tags` - GIN index for tag queries

**Check Constraints:**
- Document must belong to exactly one entity (plane, user, or category)
- `blocks_aircraft` can only be TRUE for plane documents

**Helper Function:**
- `can_reserve_aircraft(plane_id)` - Returns FALSE if any approved blocking document is expired

---

### 9. endorsements
Aviation endorsements/ratings (SEP, MEP, IR, FI, etc.) with IR (Instrument Rating) support.

**Key Fields:**
- `id` (UUID) - Primary key
- `code` (TEXT, UNIQUE) - Endorsement code (e.g., 'SEP', 'MEP', 'IR')
- `name` (TEXT) - English name
- `name_de` (TEXT) - German name
- `supports_ir` (BOOLEAN) - Whether this endorsement can have separate IR expiry
- `is_system` (BOOLEAN) - TRUE for predefined endorsements (cannot be deleted)
- `active` (BOOLEAN) - Whether endorsement is active/available
- `description` (TEXT) - Endorsement description

**RLS Policies:**
- All authenticated users can read
- Only board members can create/modify endorsements

**Predefined Endorsements:**
- SEP (Single-Engine Piston) - supports_ir: TRUE
- MEP (Multi-Engine Piston) - supports_ir: TRUE
- SET (Single-Engine Turbine) - supports_ir: TRUE
- TMG (Touring Motor Glider) - supports_ir: FALSE
- IR (Instrument Rating) - supports_ir: FALSE
- FI (Flight Instructor) - supports_ir: FALSE
- And more (CRI, IRI, TRI, SFI, FE, TRE, CRE, IRE, NIGHT, AEROBATIC, AFF_I, TANDEM_I, COACH, VIDEOGRAPHER)

**Indexes:**
- `idx_endorsements_code` - UNIQUE index on code
- `idx_endorsements_active` - Filter active endorsements

---

### 10. document_type_endorsements
Links document types to required endorsements.

**Key Fields:**
- `id` (UUID) - Primary key
- `document_type_id` (UUID, FK to document_types) - Document type reference
- `endorsement_id` (UUID, FK to endorsements) - Endorsement reference

**RLS Policies:**
- All authenticated users can read
- Only board members can create/modify mappings

**Purpose:** Determines which endorsements are required for which document types.

---

### 11. document_endorsement_privileges
Tracks which endorsements users have on their documents, with separate IR expiry tracking.

**Key Fields:**
- `id` (UUID) - Primary key
- `document_id` (UUID, FK to documents) - Document reference
- `endorsement_id` (UUID, FK to endorsements) - Endorsement reference
- `endorsement_expiry` (DATE) - Main endorsement expiry date
- `ir_expiry` (DATE, nullable) - Separate IR expiry date (if endorsement supports_ir)

**RLS Policies:**
- Follows document visibility rules
- Only board members can create/modify endorsement privileges

**RPC Function:** `get_user_endorsement_alerts(user_uuid)` - Returns expiring endorsements with IR tracking

**Indexes:**
- `idx_document_endorsement_privileges_document` - Document lookup
- `idx_document_endorsement_privileges_endorsement` - Endorsement lookup
- `idx_document_endorsement_privileges_expiry` - Expiry date queries

---

### 12. membership_types
Different membership categories (Short-term, Regular, etc.).

**Key Fields:**
- `id` (UUID) - Primary key
- `code` (TEXT, UNIQUE) - Membership type code
- `name` (TEXT) - English name
- `name_de` (TEXT) - German name
- `description` (TEXT) - Description
- `monthly_fee` (NUMERIC) - Monthly membership fee
- `active` (BOOLEAN) - Whether type is available for new memberships

**RLS Policies:**
- All authenticated users can read
- Only board members can create/modify membership types

**Sample Types:**
- SHORT_TERM - Short-term membership
- REGULAR - Regular membership
- STUDENT - Student membership
- FAMILY - Family membership

---

### 13. user_memberships
Tracks user membership periods and status.

**Key Fields:**
- `id` (UUID) - Primary key
- `user_id` (UUID, FK to users) - User reference
- `membership_type_id` (UUID, FK to membership_types) - Membership type reference
- `start_date` (DATE) - Membership start date
- `end_date` (DATE) - Membership end date
- `status` (TEXT) - 'active', 'expired', 'cancelled'
- `auto_renew` (BOOLEAN) - Automatic renewal flag
- `payment_status` (TEXT) - Payment tracking

**RLS Policies:**
- Users can read their own memberships
- Board members can read/modify all memberships

**Indexes:**
- `idx_user_memberships_user_id` - User lookup
- `idx_user_memberships_status` - Status filtering
- `idx_user_memberships_end_date` - Expiry queries

**Check Constraints:**
- `end_date` must be after `start_date`

---

### 14. board_contact_settings
Configurable contact information for the club (singleton table).

**Key Fields:**
- `id` (UUID) - Primary key
- `contact_email` (TEXT, nullable) - Contact email address
- `contact_phone` (TEXT, nullable) - Contact phone number
- `contact_name` (TEXT, nullable) - Contact person name/title
- `office_hours` (TEXT, nullable) - Office hours information
- `updated_at` (TIMESTAMPTZ) - Last update timestamp
- `updated_by` (UUID, FK to users) - Who last updated

**RLS Policies:**
- All users can read (public visibility)
- Only board members can update

**Purpose:** Displayed on account-inactive page for members with expired memberships to contact the board.

**Singleton Pattern:** Only one row should exist in this table.

---

### 15. accounts
Financial account transactions for members.

**Key Fields:**
- `id` (UUID) - Primary key
- `user_id` (UUID, FK) - User account
- `amount` (NUMERIC) - Transaction amount (negative = charge, positive = payment)
- `description` (TEXT) - Transaction description
- `created_by` (UUID, FK) - User who created transaction
- `created_at` (TIMESTAMPTZ) - Transaction timestamp

**RLS Policies:**
- Users can read their own transactions
- Board members can read all transactions
- Only board members can create/modify transactions

**Indexes:**
- `idx_accounts_user_id` - User lookup
- `idx_accounts_created_by` - Creator lookup
- `idx_accounts_created_at` - Time-based queries

**View:** `user_balances` - Aggregated balance per user with transaction count

---

### 16. notifications
User notification system.

**Key Fields:**
- `id` (UUID) - Primary key
- `user_id` (UUID, FK) - Recipient user
- `type` (TEXT) - Notification type
- `message` (TEXT) - Notification content
- `read` (BOOLEAN) - Read status
- `created_at` (TIMESTAMPTZ) - Creation timestamp

**RLS Policies:**
- Users can read their own notifications
- Users can mark their own notifications as read
- Board members can create notifications for any user
- Users can delete their own notifications

**Indexes:**
- `idx_notifications_user_id` - User lookup
- `idx_notifications_read` - Read status
- `idx_notifications_created_at` - Time-based queries (DESC)
- `idx_notifications_user_unread` - Composite index for unread notifications per user

---

## Views

### active_reservations
Materialized view showing current and future active reservations with plane and user details.

**Fields:** All reservation fields plus tail_number, plane_type, plane_color, user details, duration_hours

**Refresh:** Automatically refreshed via triggers on reservations table changes

### flightlog_with_times
Materialized view showing all flightlog entries with calculated times and denormalized plane/pilot information.

**Fields:** All flightlog fields plus block_time_hours, flight_time_hours, tail_number, plane_type, pilot/copilot names

**Refresh:** Automatically refreshed via triggers on flightlog table changes

### user_balances
Materialized view with aggregated account balances per user.

**Fields:** user_id, email, name, surname, balance, transaction_count

**Refresh:** Automatically refreshed via triggers on accounts table changes

### functions_with_stats
Materialized view showing functions with user assignment counts.

**Fields:** All function_master fields plus user_count (number of users with this function)

**Refresh:** Automatically refreshed via triggers on user_functions table changes

### users_with_functions
View (not materialized) showing users joined with their function codes array.

**Fields:** All user fields plus function_codes (TEXT[] of assigned function codes)

**Purpose:** Used for RBAC permission checks

---

## Helper Functions

### is_board_member(user_uuid UUID)
Returns TRUE if the user has 'board' in their role array.
- Used extensively in RLS policies
- Security definer function

### calculate_block_time(block_on, block_off)
Returns block time in hours as NUMERIC.
- Used in flightlog_with_times view
- Immutable function for performance

### calculate_flight_time(takeoff_time, landing_time)
Returns flight time in hours as NUMERIC.
- Used in flightlog_with_times view
- Immutable function for performance

### can_reserve_aircraft(plane_id UUID)
Returns FALSE if aircraft has approved blocking documents that are expired.
- Should be checked before allowing reservations
- Security definer function

### get_user_endorsement_alerts(user_uuid UUID)
Returns endorsements expiring within 30/60/90 days with IR tracking.
- Returns table: endorsement_code, endorsement_name, expiry_date, ir_expiry_date, days_until_expiry, days_until_ir_expiry, severity
- Used for dashboard alerts
- Security definer function
- Replaces deprecated `get_user_privilege_alerts`

---

## Triggers

### Auto-update updated_at
Applied to: users, planes, reservations, flightlog
- Automatically sets `updated_at` to NOW() on UPDATE

### Prevent locked flightlog modification
Applied to: flightlog
- Blocks updates to locked entries (except lock and charged fields)
- Raises exception if attempt is made

### Auto-create user on auth signup
Applied to: auth.users (AFTER INSERT)
- Automatically creates public.users entry when auth.users is created
- Extracts name/surname from raw_user_meta_data
- Sets default role to ['member']

---

## Security Considerations

### Row Level Security (RLS)
All tables have RLS enabled with comprehensive policies.

**General Pattern:**
- Members can read most data
- Members can create/modify their own data
- Board members have elevated privileges
- Financial data is restricted to board members

### Important Security Notes

1. **Board Member Check**: The `is_board_member()` function is used in policies to check permissions. This is efficient and secure.

2. **Locked Flightlog Entries**: Once locked, pilots cannot modify critical fields. Only board members can lock/unlock.

3. **Document Approval**: Unapproved documents are only visible to uploader and board members.

4. **Financial Restrictions**: Only board members can create account transactions.

5. **Auth Integration**: User creation is tightly integrated with Supabase Auth via trigger.

---

## Performance Optimization

### Indexes
Strategic indexes have been created for:
- Foreign key relationships (plane_id, user_id, etc.)
- Frequently queried fields (start_time, expiry_date, status)
- Composite indexes for common query patterns
- GIN indexes for array fields (role, functions, tags, nav_equipment)
- Partial indexes for filtered queries (unread notifications, active planes)

### Query Optimization Tips

1. **Use Views**: Views like `flightlog_with_times` pre-calculate derived values.

2. **Batch Operations**: When querying reservations, use time range filters:
   ```sql
   WHERE start_time >= NOW() AND end_time <= NOW() + INTERVAL '7 days'
   ```

3. **Avoid N+1**: Use PostgREST embedding to fetch related data:
   ```javascript
   supabase.from('reservations')
     .select('*, planes(*), users(*)')
   ```

4. **Use Partial Indexes**: Queries on `active` planes or `unread` notifications automatically use partial indexes.

---

## Common Queries

### Get user's upcoming reservations
```sql
SELECT * FROM active_reservations
WHERE user_id = 'USER_UUID'
ORDER BY start_time;
```

### Get aircraft availability for date range
```sql
SELECT p.*,
  NOT EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.plane_id = p.id
    AND r.status = 'active'
    AND r.start_time < 'END_TIME'
    AND r.end_time > 'START_TIME'
  ) AS available,
  can_reserve_aircraft(p.id) AS documents_valid
FROM planes p
WHERE p.active = true;
```

### Get user's flight hours this year
```sql
SELECT
  SUM(calculate_flight_time(takeoff_time, landing_time)) AS total_hours
FROM flightlog
WHERE pilot_id = 'USER_UUID'
AND EXTRACT(YEAR FROM block_on) = EXTRACT(YEAR FROM NOW());
```

### Get user account balance
```sql
SELECT * FROM user_balances
WHERE user_id = 'USER_UUID';
```

### Get expired documents blocking aircraft
```sql
SELECT d.*, p.tail_number
FROM documents d
JOIN planes p ON d.plane_id = p.id
WHERE d.blocks_aircraft = true
AND d.approved = true
AND d.expiry_date < CURRENT_DATE;
```

---

## Recommendations

### Immediate Next Steps

1. **Configure Auth Providers**: Set up email/OAuth providers in Supabase Dashboard
2. **Set Up Storage Buckets**: Create buckets for documents and M&B PDFs with appropriate policies
3. **Create Initial Board User**: Sign up first user and manually promote to board
4. **Test RLS Policies**: Verify policies work correctly with test users

### Future Enhancements

1. **Conflict Detection**: Add function to check reservation conflicts before insert
2. **Automatic Charging**: Trigger to auto-create account entry when flightlog is locked
3. **Document Expiration Notifications**: Scheduled function to notify about expiring documents
4. **Flight Statistics**: Materialized views for aggregated statistics
5. **Audit Logging**: Track changes to critical tables
6. **Reservation Waiting List**: Logic to automatically promote standby to active
7. **Maintenance Tracking**: Additional table for aircraft maintenance logs

### Performance Monitoring

Monitor these potential bottlenecks:
- Complex RLS policies on reservations (time range checks)
- Document expiry checks in `can_reserve_aircraft()`
- Account balance calculations for users with many transactions

Consider:
- Caching account balances if transaction volume is high
- Indexes on additional fields if specific query patterns emerge
- Connection pooling configuration based on concurrent user load

---

## Migration History

### 20250116000000_initial_schema.sql
- Created all tables with RLS
- Created indexes
- Created functions and views
- Created triggers
- Defined all RLS policies

### 20250116000001_sample_data.sql
- Inserted sample functions_master data
- Inserted sample aircraft data
- Provided query templates for test data

---

## Support and Maintenance

### Regular Maintenance Tasks

1. **Monitor Expired Documents**: Weekly check for expired aircraft documents
2. **Review Unlocked Flightlogs**: Ensure recent flights are locked and charged
3. **Archive Old Data**: Consider partitioning or archiving old flightlog/reservation data
4. **Index Analysis**: Periodically run EXPLAIN ANALYZE on common queries
5. **Backup Verification**: Ensure Supabase automatic backups are functioning

### Troubleshooting

**Users can't see their own reservations**
- Check RLS policies are enabled
- Verify user is authenticated (check auth.uid())
- Ensure user_id matches auth.uid()

**Cannot modify flightlog entry**
- Check if entry is locked
- Verify user is pilot or board member
- Review flightlog RLS policies

**Aircraft not available for reservation**
- Check `can_reserve_aircraft()` function
- Review blocking documents with expired dates
- Verify aircraft `active` status

**Board members can't access admin functions**
- Verify 'board' is in user's role array
- Check `is_board_member()` function returns true
- Review specific table RLS policies

---

## Contact

For schema questions or issues, refer to:
- Supabase Documentation: https://supabase.com/docs
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Project Repository: [Add your repo URL]
