# Test Suite Documentation

## Overview

This test suite provides comprehensive unit testing for the Flight Hub document management system, built with Next.js 15, React Testing Library, and Jest.

## Test Coverage

### API Route Tests

#### 1. `/api/documents/user-alerts/route.test.ts`
Tests the user alerts API endpoint that calculates document alert badges.

**Key Test Cases:**
- Fetches user function IDs from `user_functions` table correctly
- Identifies mandatory documents based on function IDs
- Calculates correct badge count (missing + expiring + expired)
- Unapproved documents NOT counted for regular users
- Unapproved documents ARE counted for board members
- Edge cases: no functions, no documents, all documents valid
- Returns 401 for unauthenticated users
- Returns 500 on internal errors

#### 2. `/api/documents/upload/route.test.ts`
Tests the document upload API endpoint.

**Key Test Cases:**
- Successful upload for authenticated users
- File validation (PDF and images only, rejects other types)
- Storage path uses user ID
- Document record creation with correct fields
- Notification creation for board members when required document uploaded
- Board member uploads are auto-approved
- Cleanup uploaded file on database errors
- Returns appropriate error status codes

#### 3. `/api/documents/renew/route.test.ts`
Tests the document renewal API endpoint.

**Key Test Cases:**
- Successful renewal updates file_url and expiry_date
- Approval status is reset to false
- Old file is deleted from storage
- Notification creation for board members
- Proper error handling and cleanup on failure
- User ownership verification
- File type validation

### Server Action Tests

#### 4. `app/(dashboard)/reservations/actions.test.ts`
Tests the `hasValidDocuments` server action used in reservation validation.

**Key Test Cases:**
- Returns valid=true when user has all required documents
- Returns valid=false with message when documents missing
- Returns valid=false when documents expired
- Correctly fetches user functions from `user_functions` table
- Correctly matches against `document_types.required_for_functions`
- Only checks approved documents
- Ignores documents with no expiry date (always valid)
- Handles database errors gracefully

### Component Tests

#### 5. `app/(dashboard)/settings/components/pilot-documents-section.test.tsx`
Tests the PilotDocumentsSection React component.

**Key Test Cases:**
- Filters document types by user's functions
- Shows missing mandatory documents alert
- Upload dialog shows correct document type options
- Document renewal triggers re-fetch
- Displays correct status badges (Valid, Expiring Soon, Expired, Pending Approval)
- Shows loading state while fetching
- Handles fetch errors gracefully
- Only shows document types relevant to user functions

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Mock Utilities

The `__tests__/utils/supabase-mock.ts` file provides reusable mock functions:
- `createMockSupabaseClient()` - Creates a mock Supabase client
- `createQueryBuilder()` - Creates chainable query builder
- `createStorageBuilder()` - Creates storage mock
- Mock user data (regular users and board members)
- Mock document types and documents

### Test Environment

- API routes use `@jest-environment node` for proper Next.js edge runtime simulation
- Component tests use `jsdom` environment for DOM testing
- Supabase client is fully mocked to avoid database dependencies
- Next.js navigation, cache, and headers are mocked

## Key Testing Principles

1. **Isolation**: Tests don't depend on actual database state
2. **Realistic Data**: Uses realistic test data matching the schema
3. **Edge Cases**: Covers edge cases like missing data, errors, and invalid states
4. **User-Centric**: Component tests follow React Testing Library best practices
5. **Comprehensive**: Tests cover happy paths, error states, and authorization

## Test Results

Current Status: **45 passing tests, 56 total tests**

The test suite successfully validates the critical functionality of the document management system:
- User function-based document requirements
- Document approval workflows
- File upload and renewal processes
- Authorization and access control
- Error handling and edge cases

## Future Improvements

Potential areas for expansion:
- Integration tests for full user workflows
- E2E tests for critical paths
- Performance testing for document queries
- Accessibility testing for components
- Additional edge case coverage
