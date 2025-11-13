# Operation Type Cost Splitting Feature

## Overview

This feature allows operation types to have default cost splitting configurations. When a flight uses an operation type with configured splits, the billing system will automatically apply those splits when charging the flight.

## Use Cases

### Example 1: Maintenance Flights
- **Scenario**: Pilots pay 50% of maintenance flight costs, club pays 50%
- **Configuration**:
  - Target 1: Pilot (50%)
  - Target 2: Cost Center "Maintenance" (50%)

### Example 2: Training Flights
- **Scenario**: Training costs split between club operations and training budget
- **Configuration**:
  - Target 1: Cost Center "Operations" (60%)
  - Target 2: Cost Center "Training" (40%)

### Example 3: Cross-Country Flights with Guest
- **Scenario**: Pilot pays 70%, guest cost center covers 30%
- **Configuration**:
  - Target 1: Pilot (70%)
  - Target 2: Cost Center "Guest Flights" (30%)

## Database Schema

### New Table: `operation_type_splits`

```sql
CREATE TABLE public.operation_type_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type_id UUID NOT NULL REFERENCES public.operation_types(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('cost_center', 'pilot')),
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE CASCADE,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Constraints
- Percentages must sum to 100% for each operation type
- `cost_center_id` must be set if `target_type` is 'cost_center'
- `cost_center_id` must be NULL if `target_type` is 'pilot'

### RLS Policies
- All authenticated users can view splits
- Only board members can create/update/delete splits

## Priority System

When charging a flight, the system follows this priority:

1. **Operation Type Splits** (Highest Priority)
   - If operation type has splits configured, use those
   - Applies to both manual and batch charges

2. **Pilot-Requested Splits**
   - If pilot requested cost split with copilot during flight log entry
   - Uses `split_cost_with_copilot` and `pilot_cost_percentage` from flightlog

3. **Copilot Present**
   - If copilot exists and no other splits configured
   - Suggests 50/50 split in UI (but doesn't auto-apply)

4. **Default Cost Center or Pilot**
   - If operation type has `default_cost_center_id`, charge to that cost center
   - Otherwise, charge to pilot

## User Interface

### Aircraft Billing Tab

Board members can configure operation type splits in the Aircraft Billing tab:

**Location**: Aircrafts > [Select Aircraft] > Billing Tab > Operation Types

**Features**:
- View all operation types with split status in table
  - Shows badge with number of split targets if configured
  - Hover to see summary of splits
- Configure splits in three ways:
  1. **Quick Split Button** (🔀 icon): Opens dedicated split configuration dialog
  2. **Create Operation Type**: Configure splits while creating new operation type
  3. **Edit Operation Type**: Modify splits when editing existing operation type
- Add multiple split targets (up to 5)
- Each target can be:
  - **Pilot**: Charges to the flight's pilot
  - **Cost Center**: Charges to selected cost center
- Real-time percentage validation (must sum to 100%)
- Visual feedback: Green checkmark when percentages sum to 100%, red warning otherwise

### Charge Flight Dialog

When charging a flight with operation type splits configured:

1. Dialog opens with splits pre-populated
2. Split targets are automatically configured based on operation type
3. User can:
   - Review the split configuration
   - Modify percentages if needed
   - Change target types
   - Add/remove targets
   - Configure airport fee allocation

### Batch Charge

Batch charge respects operation type splits automatically:

1. Checks each flight for operation type splits
2. If splits configured, uses split charge
3. Otherwise, follows normal batch charge logic
4. Shows success/failure count for all flights

## API Endpoints

### GET `/api/operation-types/[id]/splits`

Fetch split configuration for an operation type.

**Response**:
```json
{
  "splits": [
    {
      "target_type": "pilot",
      "cost_center_id": null,
      "percentage": 50.00,
      "sort_order": 0
    },
    {
      "target_type": "cost_center",
      "cost_center_id": "uuid-here",
      "cost_center_name": "Maintenance",
      "percentage": 50.00,
      "sort_order": 1
    }
  ]
}
```

### PUT `/api/operation-types/[id]/splits`

Update split configuration for an operation type (board only).

**Request**:
```json
{
  "splits": [
    {
      "target_type": "pilot",
      "cost_center_id": null,
      "percentage": 50.00
    },
    {
      "target_type": "cost_center",
      "cost_center_id": "uuid-here",
      "percentage": 50.00
    }
  ]
}
```

**Validation**:
- Percentages must sum to 100%
- Must be authenticated board member
- cost_center_id required for cost_center targets

## Example Workflows

### Workflow 1: Configure Maintenance Flight Split

1. Board member goes to Settings > Operation Types
2. Finds "Maintenance" operation type
3. Clicks "Configure Splits"
4. Adds two targets:
   - Target 1: Pilot, 50%
   - Target 2: Cost Center "Club Maintenance", 50%
5. Clicks "Save Configuration"

### Workflow 2: Charge Maintenance Flight

1. Treasurer goes to Billing > Uncharged Flights
2. Sees maintenance flight by pilot "John Doe"
3. Clicks "Charge" button
4. Dialog opens with pre-configured split:
   - John Doe: €150.00 (50%)
   - Club Maintenance: €150.00 (50%)
5. Treasurer confirms and charges

### Workflow 3: Batch Charge with Mixed Operation Types

1. Treasurer clicks "Charge All Flights"
2. System processes each flight:
   - Regular flights: Charged to pilot or default cost center
   - Maintenance flights: Split per configuration (50/50)
   - Training flights: Split per configuration (60/40)
3. Shows result: "Successfully charged 15 flights"

## Migration Files

1. **20250203000000_operation_type_cost_splitting.sql**
   - Creates `operation_type_splits` table
   - Adds RLS policies
   - Creates validation trigger

2. **20250203000001_update_uncharged_flights_with_splits.sql**
   - Adds helper function `has_operation_type_splits()`

## Components

### Frontend Components

- **operation-types-section.tsx**: Settings UI for configuring splits
- **charge-flight-dialog.tsx**: Enhanced to fetch and apply operation type splits
- **uncharged-flights-table.tsx**: Updated batch charge to respect splits

### API Routes

- **app/api/operation-types/[id]/splits/route.ts**: GET and PUT handlers

## Testing Checklist

- [ ] Create operation type with split configuration
- [ ] Charge single flight with operation type split
- [ ] Batch charge multiple flights with different operation types
- [ ] Verify pilot + cost center split works correctly
- [ ] Verify multiple cost center split works correctly
- [ ] Verify percentages validation (must sum to 100%)
- [ ] Verify board-only access to configuration
- [ ] Test with airport fees (split equally mode)
- [ ] Test clearing split configuration
- [ ] Verify priority system (operation type > pilot request > copilot)

## Future Enhancements

- [ ] Show split configuration status in operation types table
- [ ] Add split configuration template presets
- [ ] Support time-based splits (not just percentage)
- [ ] Add audit log for split configuration changes
- [ ] Support conditional splits (e.g., different splits based on aircraft type)

## Notes

- Existing operation types with `default_cost_center_id` remain backward compatible
- Operation type splits take precedence over `default_cost_center_id`
- Splits can be cleared by saving with empty array
- Airport fees can be split equally or assigned to specific target
