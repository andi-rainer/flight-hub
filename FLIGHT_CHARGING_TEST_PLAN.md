# Flight Charging & Reversal Test Plan

This document outlines comprehensive test scenarios for the flight charging system, which is one of the most critical features of the application.

## Test Coverage Areas

### 1. Simple Flight Charging

#### 1.1 Charge Flight to User (`chargeFlightToUser`)
- ✅ Successfully charge an uncharged flight to a user
- ✅ Create negative transaction (debit) in user's account
- ✅ Mark flight as charged and locked
- ✅ Set charged_by and charged_at timestamps
- ❌ Reject if flight already charged
- ❌ Reject if flight needs board review
- ❌ Reject if user is not board member
- ❌ Reject if flight not found

#### 1.2 Charge Flight to Cost Center (`chargeFlightToCostCenter`)
- ✅ Successfully charge an uncharged flight to active cost center
- ✅ Create negative transaction (cost) in cost center
- ✅ Mark flight as charged and locked
- ❌ Reject if cost center is inactive
- ❌ Reject if cost center not found
- ❌ Reject if flight already charged
- ❌ Reject if user is not board member

### 2. Split Charge System

#### 2.1 Basic Split Charges (`splitChargeFlight`)
- ✅ 50/50 split between user and cost center
- ✅ 50/25/25 split (user + 2 cost centers)
- ✅ 100% to single cost center (edge case)
- ✅ Multiple users split (3-way pilot split)
- ✅ Complex splits with 4-5 targets

#### 2.2 Percentage Validation
- ❌ Reject if percentages sum to < 100%
- ❌ Reject if percentages sum to > 100%
- ❌ Accept if percentages sum to exactly 100%
- ✅ Handle floating point precision (99.99% vs 100%)

#### 2.3 Airport Fee Allocation
- ✅ Split equally: Fees distributed by percentage
  - Example: 50/50 split, €300 flight + €100 fees = €200 each (€150 + €50)
- ✅ Assign to specific target: All fees to one target
  - Example: 50/50 split, €300 flight + €50 fees assigned to target 2 = User €150, CC €200
- ✅ No fees: Only split flight amount
- ✅ Verify correct amounts in all scenarios

#### 2.4 Transaction Creation
- ✅ Create separate transaction for each split target
- ✅ Link all transactions to same flightlog_id
- ✅ Set correct user_id or cost_center_id for each target
- ✅ Negative amounts for all transactions (debits/costs)
- ✅ Descriptive descriptions for each split

### 3. Flight Charge Reversals

#### 3.1 Simple Reversals
- ✅ Reverse single user charge
- ✅ Reverse single cost center charge
- ✅ Create reversal transaction with opposite amount
- ✅ Mark original as reversed (set reversed_at, reversed_by, reversal_transaction_id)
- ✅ Unlock flight (charged=false, locked=false)
- ✅ Clear charged_by and charged_at

#### 3.2 Split Charge Reversals (CRITICAL)
- ✅ Clicking ANY transaction reverses ALL related transactions
- ✅ Find all user transactions with same flightlog_id
- ✅ Find all cost center transactions with same flightlog_id
- ✅ Create reversals for ALL found transactions
- ✅ Mark ALL original transactions as reversed
- ✅ Atomic operation (all or nothing)
- ✅ Same reversed_at timestamp for all reversals

#### 3.3 Reversal from Different Entry Points
- ✅ Reverse via user account tab (reverseFlightCharge)
- ✅ Reverse via cost center tab (reverseCostCenterFlightCharge)
- ✅ Both methods reverse ALL transactions regardless of entry point

#### 3.4 Re-charging After Reversal
- ✅ Flight marked as uncharged after reversal
- ✅ Can charge again with same allocation
- ✅ Can charge again with different allocation
- ✅ Can charge again with different amounts
- ❌ No double-charging if reversal incomplete

#### 3.5 Reversal Edge Cases
- ❌ Reject if transaction already reversed
- ❌ Reject if trying to reverse a reversal transaction
- ❌ Handle if some transactions already reversed (partial reversal scenario)
- ✅ Successfully handle flight with no unreversed transactions (already reversed)
- ❌ Reject non-flight transactions from flight reversal functions

### 4. Authorization & Security

#### 4.1 Board-Only Operations
- ❌ Non-board member cannot charge flights
- ❌ Non-board member cannot reverse charges
- ✅ Board member can perform all operations
- ✅ Check authorization before ANY database operations

#### 4.2 Data Validation
- ❌ Negative amounts not allowed (enforced as positive, converted to negative internally)
- ❌ Zero amounts not allowed
- ❌ Invalid cost center IDs rejected
- ❌ Invalid user IDs rejected
- ❌ Invalid flight IDs rejected

### 5. Integration Scenarios

#### 5.1 Full Workflow: Charge → Reverse → Re-charge
1. Create flight log entry
2. Charge with split (50% pilot, 50% cost center)
3. Verify both transactions created
4. Reverse from user account tab
5. Verify all transactions reversed
6. Verify flight uncharged
7. Re-charge with different split (30/70)
8. Verify new transactions created
9. Verify correct amounts

#### 5.2 Full Workflow: Multiple Flights, Batch Operations
1. Create 3 flights
2. Charge flight 1: Simple user charge
3. Charge flight 2: Split charge (3-way)
4. Charge flight 3: Cost center only
5. Reverse flight 2 (split charge)
6. Verify only flight 2 reversed
7. Verify flights 1 and 3 unaffected

#### 5.3 Real-World Scenario: Maintenance Flight
1. Operation type configured: 50% pilot, 50% maintenance cost center
2. Pilot flies maintenance flight
3. Board charges using operation type default splits
4. Verify correct split applied
5. Error discovered in flight log
6. Board reverses charges
7. Pilot corrects flight log
8. Board re-charges with corrected values
9. Verify final balances correct

### 6. Performance & Reliability

#### 6.1 Concurrent Operations
- ⚠️ Handle concurrent charge attempts (pessimistic locking)
- ⚠️ Handle concurrent reversals (idempotent)
- ⚠️ Transaction isolation to prevent race conditions

#### 6.2 Error Handling
- ✅ Rollback if any transaction fails
- ✅ Clear error messages for all failure scenarios
- ✅ Logging for debugging
- ✅ Graceful handling of database errors

## Manual Testing Checklist

Use this checklist when manually testing the system:

### Setup
- [ ] Have at least 2 active cost centers
- [ ] Have at least 2 board members
- [ ] Have at least 2 regular members (pilots)
- [ ] Have operation types configured with splits
- [ ] Have at least 2 aircraft available

### Test Scenarios

#### Scenario 1: Simple Charge & Reverse
- [ ] Log a flight as pilot
- [ ] As board member, charge flight to pilot (100%)
- [ ] Verify transaction appears in pilot's account (negative)
- [ ] Verify flight marked as charged
- [ ] Click "Reverse Charge" button
- [ ] Verify reversal transaction created (positive amount)
- [ ] Verify original marked as reversed
- [ ] Verify flight now uncharged
- [ ] Charge again to verify it works

#### Scenario 2: Split Charge (2-way)
- [ ] Log a flight
- [ ] Charge with 60% pilot, 40% cost center A
- [ ] Verify pilot has €X transaction (60% of total)
- [ ] Verify cost center A has €Y transaction (40% of total)
- [ ] Verify both transactions link to same flight
- [ ] Click "Reverse Charge" on pilot transaction
- [ ] Verify BOTH transactions reversed (pilot + cost center)
- [ ] Verify flight uncharged

#### Scenario 3: Split Charge (3-way)
- [ ] Log a flight with €300 cost + €60 airport fees
- [ ] Charge: 50% pilot, 25% CC-A, 25% CC-B
- [ ] Split fees equally
- [ ] Verify pilot: €180 (€150 + €30)
- [ ] Verify CC-A: €90 (€75 + €15)
- [ ] Verify CC-B: €90 (€75 + €15)
- [ ] Reverse from CC-A transaction
- [ ] Verify ALL 3 transactions reversed
- [ ] Re-charge with 100% to pilot
- [ ] Verify only 1 new transaction created

#### Scenario 4: Operation Type Default Splits
- [ ] Configure operation type "Maintenance" with 50/50 split
- [ ] Log maintenance flight
- [ ] Charge using defaults
- [ ] Verify correct split applied automatically
- [ ] Test reversal works correctly

#### Scenario 5: Airport Fees Assignment
- [ ] Charge flight with fees assigned to specific target
- [ ] Verify only that target includes fees
- [ ] Verify other targets only have flight cost portion

#### Scenario 6: Edge Cases
- [ ] Try to charge already charged flight (should fail)
- [ ] Try to reverse already reversed transaction (should fail)
- [ ] Try to charge as non-board member (should fail)
- [ ] Try to reverse non-flight transaction (should fail with helpful error)
- [ ] Try split with percentages summing to 95% (should fail)
- [ ] Try split with percentages summing to 105% (should fail)

## Automated Test Execution

```bash
# Run all flight charging tests
npm test -- __tests__/actions/flight-charging.test.ts

# Run with coverage
npm test -- __tests__/actions/flight-charging.test.ts --coverage

# Run in watch mode during development
npm test -- __tests__/actions/flight-charging.test.ts --watch
```

## Test Data Setup

For consistent testing, use these test data fixtures:

```typescript
// Test Users
const BOARD_MEMBER = { id: 'board-1', role: ['board'], name: 'Board', surname: 'Member' }
const PILOT = { id: 'pilot-1', role: ['member'], name: 'Test', surname: 'Pilot' }

// Test Cost Centers
const CC_MAINTENANCE = { id: 'cc-maint', name: 'Maintenance', active: true }
const CC_OPERATIONS = { id: 'cc-ops', name: 'Operations', active: true }
const CC_INACTIVE = { id: 'cc-inactive', name: 'Inactive', active: false }

// Test Flight
const TEST_FLIGHT = {
  id: 'flight-123',
  plane_id: 'plane-1',
  pilot_id: 'pilot-1',
  block_off: '2025-01-15T10:00:00Z',
  block_on: '2025-01-15T11:30:00Z',
  charged: false,
  locked: false,
  needs_board_review: false
}

// Test Amounts
const FLIGHT_COST = 300.00 // €300 for 1.5 hour flight
const AIRPORT_FEES = 50.00 // €50 landing fees
```

## Known Issues & Limitations

1. **Database Transaction Isolation**: Currently not using PostgreSQL transactions for atomic operations across multiple inserts/updates. Should implement proper transaction wrapping.

2. **Concurrent Reversal Protection**: No locking mechanism to prevent multiple board members from reversing the same flight simultaneously.

3. **Partial Reversal Recovery**: If reversal fails mid-way, there's no automatic rollback. Should implement transaction wrapping.

## Success Criteria

A test run is considered successful when:
- ✅ All unit tests pass
- ✅ All manual test scenarios complete successfully
- ✅ No data inconsistencies in database after operations
- ✅ All reversals are complete (no partial reversals)
- ✅ Flight can be re-charged after reversal
- ✅ User and cost center balances are correct
- ✅ Audit trail is complete (all transactions linked properly)
