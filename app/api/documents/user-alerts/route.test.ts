/**
 * @jest-environment node
 */

import { GET } from './route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createMockSupabaseClient,
  createQueryBuilder,
  mockUser,
  mockProfile,
  mockBoardProfile,
} from '@/__tests__/utils/supabase-mock'

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('/api/documents/user-alerts', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = createMockSupabaseClient()

    // Add default RPC mock for privilege alerts
    const rpcBuilder = {
      single: jest.fn().mockResolvedValue({
        data: {
          total_alerts: 0,
          expired_count: 0,
          expiring_count: 0,
          privilege_alerts: []
        },
        error: null
      })
    }
    mockSupabase.rpc = jest.fn().mockReturnValue(rpcBuilder)

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  const createRequest = (url: string) => {
    return new NextRequest(url)
  }

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('should correctly fetch user function codes from user_functions table', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const userFunctionsBuilder = createQueryBuilder([
        { functions_master: { code: 'PILOT' } },
        { functions_master: { code: 'FLIGHT_INSTRUCTOR' } },
      ])
      const docDefsBuilder = createQueryBuilder([])
      const documentsBuilder = createQueryBuilder([])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder) // users query
        .mockReturnValueOnce(userFunctionsBuilder) // user_functions query
        .mockReturnValueOnce(docDefsBuilder) // document_definitions query
        .mockReturnValueOnce(documentsBuilder) // documents query

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      await GET(request)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_functions')
      expect(userFunctionsBuilder.select).toHaveBeenCalledWith('functions_master(code)')
      expect(userFunctionsBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id)
    })

    it('should correctly identify mandatory documents based on function codes', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const userFunctionsBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ functions_master: { code: 'PILOT' } }],
          error: null,
        }),
      }
      const docDefsBuilder = {
        select: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'doc-type-1',
              name: 'Required Doc 1',
              mandatory: true,
              required_for_functions: ['PILOT'],
            },
            {
              id: 'doc-type-2',
              name: 'Required Doc 2',
              mandatory: true,
              required_for_functions: ['FLIGHT_INSTRUCTOR'], // Different function
            },
            {
              id: 'doc-type-3',
              name: 'Optional Doc',
              mandatory: false,
              required_for_functions: ['PILOT'],
            },
          ],
          error: null,
        }),
      }
      const documentsBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(docDefsBuilder)
        .mockReturnValueOnce(documentsBuilder)

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      const response = await GET(request)
      const data = await response.json()

      // Should only count doc-type-1 as missing (mandatory and required for function-1)
      expect(data.details.missing).toBe(1)
    })

    it('should calculate correct badge count (missing + expiring + expired)', async () => {
      const now = new Date()
      const expired = new Date(now)
      expired.setDate(now.getDate() - 1) // Yesterday

      const expiringSoon = new Date(now)
      expiringSoon.setDate(now.getDate() + 15) // In 15 days

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const userFunctionsBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ functions_master: { code: 'PILOT' } }],
          error: null,
        }),
      }
      const docDefsBuilder = {
        select: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'doc-type-1',
              name: 'Missing Doc',
              mandatory: true,
              required_for_functions: ['PILOT'],
            },
          ],
          error: null,
        }),
      }
      const documentsBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [
            {
              document_definition_id: 'doc-type-2',
              expiry_date: expired.toISOString().split('T')[0],
              approved: true,
            },
            {
              document_definition_id: 'doc-type-3',
              expiry_date: expiringSoon.toISOString().split('T')[0],
              approved: true,
            },
          ],
          error: null,
        }),
      }

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(docDefsBuilder)
        .mockReturnValueOnce(documentsBuilder)

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      const response = await GET(request)
      const data = await response.json()

      expect(data.count).toBe(3) // 1 missing + 1 expiring + 1 expired
      expect(data.details.missing).toBe(1)
      expect(data.details.expiring).toBe(1)
      expect(data.details.expired).toBe(1)
    })

    it('should NOT count unapproved documents for users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const userFunctionsBuilder = createQueryBuilder([])
      const docDefsBuilder = createQueryBuilder([])
      const documentsBuilder = createQueryBuilder([
        {
          document_definition_id: 'doc-type-1',
          expiry_date: null,
          approved: false, // Unapproved
        },
        {
          document_definition_id: 'doc-type-2',
          expiry_date: null,
          approved: false, // Unapproved
        },
      ])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(docDefsBuilder)
        .mockReturnValueOnce(documentsBuilder)

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      const response = await GET(request)
      const data = await response.json()

      // Unapproved documents don't count for any users - they see pending approvals in Members page
      expect(data.count).toBe(0)
    })

    it('should handle edge case: user with no functions', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const userFunctionsBuilder = createQueryBuilder([]) // No functions
      const docDefsBuilder = createQueryBuilder([
        {
          id: 'doc-type-1',
          name: 'Required Doc',
          mandatory: true,
          required_for_functions: ['function-1'],
        },
      ])
      const documentsBuilder = createQueryBuilder([])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(docDefsBuilder)
        .mockReturnValueOnce(documentsBuilder)

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      const response = await GET(request)
      const data = await response.json()

      expect(data.count).toBe(0)
      expect(data.details.missing).toBe(0)
    })

    it('should handle edge case: no documents uploaded', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const userFunctionsBuilder = createQueryBuilder([{ function_id: 'function-1' }])
      const docDefsBuilder = createQueryBuilder([])
      const documentsBuilder = createQueryBuilder([]) // No documents

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(docDefsBuilder)
        .mockReturnValueOnce(documentsBuilder)

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.count).toBe(0)
    })

    it('should handle edge case: all documents valid and approved', async () => {
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 6)

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const userFunctionsBuilder = createQueryBuilder([{ function_id: 'function-1' }])
      const docDefsBuilder = createQueryBuilder([
        {
          id: 'doc-type-1',
          name: 'Required Doc',
          mandatory: true,
          required_for_functions: ['function-1'],
        },
      ])
      const documentsBuilder = createQueryBuilder([
        {
          document_definition_id: 'doc-type-1',
          expiry_date: futureDate.toISOString().split('T')[0],
          approved: true,
        },
      ])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(docDefsBuilder)
        .mockReturnValueOnce(documentsBuilder)

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      const response = await GET(request)
      const data = await response.json()

      expect(data.count).toBe(0)
      expect(data.details.missing).toBe(0)
      expect(data.details.expiring).toBe(0)
      expect(data.details.expired).toBe(0)
    })

    it('should return 500 on internal error', async () => {
      // Suppress expected console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database connection failed'))

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })

      consoleErrorSpy.mockRestore()
    })
  })
})
