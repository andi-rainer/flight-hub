# FlightHub Dashboard

Complete dashboard implementation for the FlightHub aviation club management application.

## Overview

The dashboard provides a comprehensive overview of user activity including reservations, account balance, flight logs, and notifications. Built with Next.js 15 App Router, TypeScript, Supabase, and shadcn/ui components.

## Features

### 1. Quick Stats Cards
- **Active Reservations**: Count of active reservations in the next 7 days
- **Account Balance**: Current account balance with color coding (green for positive, red for negative)
- **Monthly Flight Cost**: Estimated costs for the current month's flights
- **Notifications**: Count of unread notifications

### 2. Quick Actions
Three primary action buttons:
- **New Reservation**: Links to /reservations
- **Log Flight**: Links to /flightlog
- **Upload Document**: Links to /documents

### 3. Upcoming Reservations Section
- Shows all reservations for the next 7 days
- Grouped display with aircraft information
- Displays: Aircraft tail number, type, pilot name, date/time range
- Status badges with color coding:
  - Active: Green
  - Standby: Orange
  - Cancelled: Gray
- Responsive layout (stacks on mobile, rows on desktop)

### 4. Account Transactions
- Displays recent account transactions (last 10)
- Table format with date, description, and amount
- Color coding: positive amounts (green), negative amounts (red)
- Shows current balance summary
- "Add Funds" button (links to /settings)

### 5. Recent Flights
- Shows user's recent flight log entries (last 10)
- Includes flights where user is pilot or copilot
- Displays: Date, aircraft, flight time in hours, charged status
- Monthly cost summary for current month
- Visual indicators for charged/uncharged flights

### 6. Notifications Area
- Displays unread notifications (max 5 most recent)
- Different icons for notification types:
  - `reservation_active`: CheckCircle icon
  - `document_expiring`: AlertCircle icon
  - `general`: Info icon
- Timestamp showing relative time (e.g., "2 hours ago")
- "Mark as read" button for each notification
- Only shown when there are unread notifications

## Technical Implementation

### Files Structure

```
/app/(dashboard)/dashboard/
├── page.tsx                      # Main dashboard page (Server Component)
├── actions.ts                    # Server Actions for mutations
├── mark-notification-read.tsx    # Client Component for notification interaction
├── loading.tsx                   # Loading state UI
├── error.tsx                     # Error boundary UI
└── README.md                     # This file
```

### Server Components
- Main page is a Server Component for optimal data fetching
- Uses Supabase server client for database queries
- Implements proper TypeScript types
- Suspense boundary for streaming and loading states

### Data Fetching

All data is fetched server-side using Supabase:

```typescript
// Upcoming reservations (next 7 days)
- Query: reservations table with joins to planes and users
- Filters: start_time within 7 days, status in ['active', 'standby']
- Limit: 10 records

// Account balance
- Query: Sum all amounts from accounts table for current user
- Recent transactions: Last 10 transactions

// Recent flights
- Query: flightlog table where user is pilot or copilot
- Calculates block time from timestamps
- Limit: 10 records

// Monthly flight costs
- Query: Flights for current month where charged = true
- Calculates estimated cost based on flight hours
- Rate: $150/hour (configurable)

// Unread notifications
- Query: notifications where read = false
- Limit: 5 most recent
```

### Client Components

Only one client component is used for interactivity:

**MarkNotificationRead** (`mark-notification-read.tsx`)
- Handles "mark as read" button clicks
- Calls Server Action to update database
- Provides optimistic UI feedback
- Automatically removes from view after marking

### Server Actions

**markNotificationAsRead** (`actions.ts`)
- Updates notification's read status to true
- Validates user authentication
- Ensures users can only modify their own notifications
- Revalidates dashboard path to show updated data

### Loading States

- Comprehensive loading skeleton in `loading.tsx`
- Matches dashboard layout structure
- Provides visual feedback during data fetching
- Uses Suspense for streaming

### Error Handling

- Custom error boundary in `error.tsx`
- User-friendly error messages
- "Try Again" and "Reload Page" buttons
- Logs errors for debugging
- Shows error digest ID when available

## Styling & Responsiveness

- Mobile-first responsive design
- Grid layout that adapts to screen size:
  - Mobile: Single column
  - Tablet: 2 columns
  - Desktop: 4 columns for stats, 2 columns for main content
- Uses shadcn/ui components for consistency
- Tailwind CSS for styling
- Dark mode support through theme system

## Date Formatting

Uses `date-fns` library for consistent date formatting:
- Full dates: "MMM d, yyyy" (e.g., "Oct 16, 2025")
- Times: "HH:mm" (24-hour format)
- Relative times: "2 hours ago", "3 days ago"
- Month names: "October 2025"

## Performance Optimizations

1. **Server Components by default**: Minimizes client-side JavaScript
2. **Streaming with Suspense**: Shows UI incrementally as data loads
3. **Efficient queries**: Uses Supabase select with specific fields
4. **Query limits**: Caps results to prevent over-fetching
5. **Single data fetch function**: Consolidates all queries for efficiency

## Security

- Uses Supabase RLS (Row Level Security)
- Server-side authentication checks
- User can only access their own data
- Notifications can only be marked read by owner
- All queries filter by authenticated user ID

## Future Enhancements

Potential improvements:
1. Add pagination for transactions and flights
2. Implement real-time updates using Supabase Realtime
3. Add filters for date ranges
4. Add charts/graphs for flight statistics
5. Make hourly rate configurable per aircraft
6. Add export functionality for transactions
7. Implement notification preferences
8. Add keyboard shortcuts for quick actions

## Dependencies

- Next.js 15 (App Router)
- React 18
- TypeScript
- Supabase (@supabase/ssr)
- shadcn/ui components
- Tailwind CSS
- date-fns
- lucide-react (icons)

## Usage

The dashboard is automatically displayed when users navigate to `/dashboard` after authentication. The layout includes the dashboard in the authenticated section, requiring users to be logged in.

All data automatically refreshes on page navigation and can be manually refreshed using the browser's refresh functionality.
