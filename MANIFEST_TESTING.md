# Manifest System Testing Documentation

## Overview

The manifest system has comprehensive unit test coverage focusing on business logic validation. Tests are located in `__tests__/actions/manifest-system.test.ts` and cover all critical functionality.

## Test Coverage Summary

**Total Tests:** 58 passing tests
**Test File:** `__tests__/actions/manifest-system.test.ts`
**Focus:** Business logic validation without heavy database mocking

## Test Categories

### 1. Slot Allocation (4 tests)

Tests the core slot calculation logic that determines which slots are occupied on a flight.

- ✅ Sport jumpers (1 slot each)
- ✅ Tandem pairs (2 consecutive slots)
- ✅ Mixed jumpers (combination of sport and tandem)
- ✅ Available slots calculation

**Key Logic Tested:**
```typescript
const occupiedSlots = new Set<number>()
jumpers.forEach((j) => {
  for (let i = 0; i < j.slots_occupied; i++) {
    occupiedSlots.add(j.slot_number + i)
  }
})
const availableSlots = maxJumpers - occupiedSlots.size
```

### 2. Slot Conflict Detection (7 tests)

Tests the database trigger logic that prevents overlapping slot assignments.

- ✅ Detect conflict when sport jumper takes occupied slot
- ✅ Detect conflict when tandem overlaps with sport jumper
- ✅ Detect conflict when tandem overlaps with another tandem
- ✅ No conflict for adjacent non-overlapping slots
- ✅ No conflict for completely separate slots
- ✅ Detect multiple conflicts
- ✅ Edge case: tandem pair at end of capacity

**Key Logic Tested:**
```typescript
// Check if new slot range overlaps with existing jumper
const newStart = newSlot
const newEnd = newSlot + newSlotsOccupied - 1
const existingStart = jumper.slot_number
const existingEnd = jumper.slot_number + jumper.slots_occupied - 1

const hasConflict = newStart <= existingEnd && newEnd >= existingStart
```

### 3. Flight Status Progression (7 tests)

Tests the state machine for flight status transitions.

**Status Flow:**
```
planned → ready → boarding → in_air → completed
                                    ↘ (terminal)
cancelled (terminal)
```

- ✅ Planned → Ready
- ✅ Ready → Boarding
- ✅ Boarding → In Air
- ✅ In Air → Completed
- ✅ No progression from Completed
- ✅ No progression from Cancelled
- ✅ Full progression chain validation

### 4. Flight Postponement (5 tests)

Tests time manipulation logic for postponing flights.

- ✅ Postpone by 30 minutes
- ✅ Postpone by 1 hour
- ✅ Postpone across hour boundary (9:45 + 30min = 10:15)
- ✅ Postpone to afternoon
- ✅ Move earlier (negative shift)

**Key Logic Tested:**
```typescript
const calculateNewTime = (originalTime: string, minutesShift: number): string => {
  const [hours, minutes] = originalTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + minutesShift
  const newHours = Math.floor(totalMinutes / 60)
  const newMinutes = totalMinutes % 60
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`
}
```

### 5. Jumper Removal Validation (6 tests)

Tests business rules for when jumpers can be removed from flights.

- ✅ Allow removal from planned flight
- ✅ Allow removal from ready flight
- ✅ Allow removal from boarding flight
- ✅ Allow removal from in_air flight
- ✅ Prevent removal from completed flight
- ✅ Prevent removal from cancelled flight

**Business Rule:** Jumpers cannot be removed from completed or cancelled flights.

### 6. Slot Number Assignment (7 tests)

Tests the algorithm for finding available slots.

- ✅ Find first available slot for sport jumper
- ✅ Find first available after occupied slots
- ✅ Find 2 consecutive slots for tandem
- ✅ Find 2 consecutive slots between occupied ones
- ✅ Return null when no slot available
- ✅ Return null when no 2 consecutive slots for tandem
- ✅ Edge case: tandem at end of capacity

**Key Logic Tested:**
```typescript
const findFirstAvailableSlot = (
  maxJumpers: number,
  slotsNeeded: number,
  occupiedSlots: Set<number>
): number | null => {
  for (let slot = 1; slot <= maxJumpers - slotsNeeded + 1; slot++) {
    let available = true
    for (let i = 0; i < slotsNeeded; i++) {
      if (occupiedSlots.has(slot + i)) {
        available = false
        break
      }
    }
    if (available) return slot
  }
  return null
}
```

### 7. Flight Capacity Validation (4 tests)

Tests validation logic for adding jumpers based on available capacity.

- ✅ Validate space for sport jumper
- ✅ Validate space for tandem pair
- ✅ Reject sport jumper when at capacity
- ✅ Reject tandem when only 1 slot available

### 8. Flight Cancellation Validation (6 tests)

Tests business rules for when flights can be cancelled.

- ✅ Allow cancelling planned flight
- ✅ Allow cancelling ready flight
- ✅ Allow cancelling boarding flight
- ✅ Allow cancelling in_air flight
- ✅ Prevent cancelling completed flight
- ✅ Prevent cancelling already cancelled flight

### 9. Flight Deletion vs Cancellation (2 tests)

Tests business logic for delete vs cancel operation.

- ✅ Delete flight when no jumpers assigned
- ✅ Cancel (not delete) when jumpers assigned

**Business Rule:** Flights with jumpers should be cancelled (preserving history), not deleted.

### 10. Operation Day Status Validation (4 tests)

Tests business rules for editing operation days.

- ✅ Allow editing planned operation day
- ✅ Allow editing active operation day
- ✅ Allow editing cancelled operation day
- ✅ Prevent editing completed operation day

### 11. Payment Type Validation (2 tests)

Tests payment type enumeration validation.

- ✅ Accept valid payment types (cash, card, bank_transfer, voucher)
- ✅ Reject invalid payment types

### 12. Slot Display Format (4 tests)

Tests UI display formatting for slot numbers.

- ✅ Format single slot: "3"
- ✅ Format tandem range: "3-4"
- ✅ Format start slots: "1-2"
- ✅ Format end slots: "9-10"

## Running the Tests

```bash
# Run all manifest tests
npm test -- __tests__/actions/manifest-system.test.ts

# Run all tests with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch __tests__/actions/manifest-system.test.ts
```

## Test Philosophy

These tests follow the same philosophy as the flight charging tests:

1. **Focus on Business Logic:** Test pure functions and calculations
2. **No Heavy Mocking:** Avoid complex database mocking
3. **Clear Test Names:** Each test clearly states what it validates
4. **Edge Cases:** Include boundary conditions and edge cases
5. **Maintainability:** Easy to understand and update

## Integration Testing

For full integration testing with real database operations and RLS policies, see the manual testing workflows in `/app/(dashboard)/manifest/`.

## Test Coverage Areas

| Feature | Unit Tests | Integration | Notes |
|---------|-----------|-------------|-------|
| Slot Allocation | ✅ Complete | Manual | Core logic fully tested |
| Slot Conflicts | ✅ Complete | Database | Trigger tested via business logic |
| Status Progression | ✅ Complete | Manual | State machine validated |
| Flight Postponement | ✅ Complete | Manual | Time calculations tested |
| Jumper Management | ✅ Complete | Manual | Business rules validated |
| Capacity Validation | ✅ Complete | Manual | Edge cases covered |
| Operation Days | ✅ Complete | Manual | Status transitions tested |
| Payment Types | ✅ Complete | Manual | Validation logic tested |

## Future Test Enhancements

1. **Database Integration Tests:** Test actual Supabase operations with test database
2. **RLS Policy Tests:** Validate row-level security policies
3. **Concurrent Operations:** Test race conditions in slot assignments
4. **E2E Tests:** Full user workflows with Playwright
5. **Performance Tests:** Load testing with many jumpers/flights

## Related Documentation

- Main Codebase Docs: `CLAUDE.md`
- Database Schema: `supabase/SCHEMA_DOCUMENTATION.md`
- Project Status: `PROJECT_STATUS.md`
- Flight Charging Tests: `__tests__/actions/flight-charging-simple.test.ts`

---

**Last Updated:** November 23, 2025
**Test Status:** ✅ All 58 tests passing
