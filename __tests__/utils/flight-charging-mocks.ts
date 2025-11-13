/**
 * Mock utilities for flight charging tests
 *
 * Provides reusable mock builders for Supabase queries
 * used in flight charging and reversal tests.
 */

export interface MockScenario {
  boardUser?: boolean
  flight?: {
    id: string
    charged?: boolean
    locked?: boolean
    needs_board_review?: boolean
  }
  costCenter?: {
    id: string
    name?: string
    active?: boolean
  }
  userTransactions?: Array<{
    id: string
    user_id: string
    amount: number
    description: string
    flightlog_id?: string | null
  }>
  costCenterTransactions?: Array<{
    id: string
    cost_center_id: string
    amount: number
    description: string
    flightlog_id?: string | null
  }>
}

/**
 * Creates a mock Supabase client configured for the given scenario
 */
export function createMockSupabaseClient(scenario: MockScenario) {
  const createChainableBuilder = () => {
    const builder: any = {
      select: jest.fn(() => builder),
      insert: jest.fn(() => builder),
      update: jest.fn(() => builder),
      delete: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      is: jest.fn(() => builder),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    }
    return builder
  }

  const from = jest.fn((table: string) => {
    const builder = createChainableBuilder()

    // Handle users table - for board authorization
    if (table === 'users') {
      builder.single.mockResolvedValue({
        data: scenario.boardUser
          ? { id: 'board-user-id', role: ['board'] }
          : { id: 'regular-user-id', role: ['member'] },
        error: null,
      })
    }

    // Handle flightlog table
    if (table === 'flightlog' && scenario.flight) {
      builder.single.mockResolvedValue({
        data: {
          id: scenario.flight.id,
          charged: scenario.flight.charged ?? false,
          locked: scenario.flight.locked ?? false,
          needs_board_review: scenario.flight.needs_board_review ?? false,
        },
        error: null,
      })
      // Mock update success
      builder.eq.mockReturnValueOnce(
        Promise.resolve({ data: { id: scenario.flight.id }, error: null })
      )
    }

    // Handle cost_centers table
    if (table === 'cost_centers' && scenario.costCenter) {
      builder.single.mockResolvedValue({
        data: {
          id: scenario.costCenter.id,
          name: scenario.costCenter.name ?? 'Test Cost Center',
          active: scenario.costCenter.active ?? true,
        },
        error: null,
      })
    }

    // Handle accounts table
    if (table === 'accounts') {
      // For select queries (finding related transactions)
      if (scenario.userTransactions) {
        const isChain: any = {
          data: scenario.userTransactions,
          error: null,
        }
        builder.is.mockReturnValue(Promise.resolve(isChain))
      }

      // For insert queries (creating transactions/reversals)
      builder.insert.mockReturnValue({
        ...builder,
        select: jest.fn(() => ({
          ...builder,
          single: jest.fn(() =>
            Promise.resolve({
              data: { id: `tx-${Date.now()}` },
              error: null,
            })
          ),
        })),
      })

      // For single transaction fetch
      if (scenario.userTransactions && scenario.userTransactions.length > 0) {
        builder.single.mockResolvedValueOnce({
          data: scenario.userTransactions[0],
          error: null,
        })
      }
    }

    // Handle cost_center_transactions table
    if (table === 'cost_center_transactions') {
      // For select queries (finding related transactions)
      if (scenario.costCenterTransactions) {
        const isChain: any = {
          data: scenario.costCenterTransactions,
          error: null,
        }
        builder.is.mockReturnValue(Promise.resolve(isChain))
      }

      // For insert queries
      builder.insert.mockReturnValue({
        ...builder,
        select: jest.fn(() => ({
          ...builder,
          single: jest.fn(() =>
            Promise.resolve({
              data: { id: `cc-tx-${Date.now()}` },
              error: null,
            })
          ),
        })),
      })

      // For single transaction fetch
      if (
        scenario.costCenterTransactions &&
        scenario.costCenterTransactions.length > 0
      ) {
        builder.single.mockResolvedValueOnce({
          data: {
            ...scenario.costCenterTransactions[0],
            cost_center: { id: scenario.costCenterTransactions[0].cost_center_id, name: 'Test CC' },
            flight: scenario.flight,
          },
          error: null,
        })
      }
    }

    return builder
  })

  const auth = {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'board-user-id' } },
      error: null,
    }),
  }

  return { from, auth }
}
