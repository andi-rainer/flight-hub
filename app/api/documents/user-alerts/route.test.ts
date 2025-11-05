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

    it('should correctly fetch user function IDs from user_functions table', async () => {
      const userFunctionIds = ['function-1', 'function-2']

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const userFunctionsBuilder = createQueryBuilder([
        { function_id: 'function-1' },
        { function_id: 'function-2' },
      ])
      const docTypesBuilder = createQueryBuilder([])
      const documentsBuilder = createQueryBuilder([])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder) // users query
        .mockReturnValueOnce(userFunctionsBuilder) // user_functions query
        .mockReturnValueOnce(docTypesBuilder) // document_types query
        .mockReturnValueOnce(documentsBuilder) // documents query

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      await GET(request)

      expect(mockSupabase.from).toHaveBeenCalledWith('user_functions')
      expect(userFunctionsBuilder.select).toHaveBeenCalledWith('function_id')
      expect(userFunctionsBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id)
    })

    it('should correctly identify mandatory documents based on function IDs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const userFunctionsBuilder = createQueryBuilder([
        { function_id: 'function-1' },
      ])
      const docTypesBuilder = createQueryBuilder([
        {
          id: 'doc-type-1',
          name: 'Required Doc 1',
          mandatory: true,
          required_for_functions: ['function-1'],
        },
        {
          id: 'doc-type-2',
          name: 'Required Doc 2',
          mandatory: true,
          required_for_functions: ['function-2'], // Different function
        },
        {
          id: 'doc-type-3',
          name: 'Optional Doc',
          mandatory: false,
          required_for_functions: ['function-1'],
        },
      ])
      const documentsBuilder = createQueryBuilder([])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(docTypesBuilder)
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
      const userFunctionsBuilder = createQueryBuilder([{ function_id: 'function-1' }])
      const docTypesBuilder = createQueryBuilder([
        {
          id: 'doc-type-1',
          name: 'Missing Doc',
          mandatory: true,
          required_for_functions: ['function-1'],
        },
      ])
      const documentsBuilder = createQueryBuilder([
        {
          document_type_id: 'doc-type-2',
          expiry_date: expired.toISOString().split('T')[0],
          approved: true,
        },
        {
          document_type_id: 'doc-type-3',
          expiry_date: expiringSoon.toISOString().split('T')[0],
          approved: true,
        },
      ])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(docTypesBuilder)
        .mockReturnValueOnce(documentsBuilder)

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      const response = await GET(request)
      const data = await response.json()

      expect(data.count).toBe(3) // 1 missing + 1 expiring + 1 expired
      expect(data.details.missing).toBe(1)
      expect(data.details.expiring).toBe(1)
      expect(data.details.expired).toBe(1)
    })

    it('should NOT count unapproved documents for regular users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const userFunctionsBuilder = createQueryBuilder([])
      const docTypesBuilder = createQueryBuilder([])
      const documentsBuilder = createQueryBuilder([
        {
          document_type_id: 'doc-type-1',
          expiry_date: null,
          approved: false, // Unapproved
        },
        {
          document_type_id: 'doc-type-2',
          expiry_date: null,
          approved: false, // Unapproved
        },
      ])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(docTypesBuilder)
        .mockReturnValueOnce(documentsBuilder)

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      const response = await GET(request)
      const data = await response.json()

      expect(data.details.unapproved).toBe(0)
      expect(data.count).toBe(0) // Regular users don't see unapproved count
    })

    it('should count unapproved documents for board members', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { ...mockUser, id: 'board-member-id' } },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockBoardProfile)
      const userFunctionsBuilder = createQueryBuilder([])
      const docTypesBuilder = createQueryBuilder([])
      const documentsBuilder = createQueryBuilder([
        {
          document_type_id: 'doc-type-1',
          expiry_date: null,
          approved: false, // Unapproved
        },
        {
          document_type_id: 'doc-type-2',
          expiry_date: null,
          approved: false, // Unapproved
        },
      ])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(docTypesBuilder)
        .mockReturnValueOnce(documentsBuilder)

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      const response = await GET(request)
      const data = await response.json()

      expect(data.details.unapproved).toBe(2)
      expect(data.count).toBe(2) // Board members see unapproved documents
    })

    it('should handle edge case: user with no functions', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const userFunctionsBuilder = createQueryBuilder([]) // No functions
      const docTypesBuilder = createQueryBuilder([
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
        .mockReturnValueOnce(docTypesBuilder)
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
      const docTypesBuilder = createQueryBuilder([])
      const documentsBuilder = createQueryBuilder([]) // No documents

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(docTypesBuilder)
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
      const docTypesBuilder = createQueryBuilder([
        {
          id: 'doc-type-1',
          name: 'Required Doc',
          mandatory: true,
          required_for_functions: ['function-1'],
        },
      ])
      const documentsBuilder = createQueryBuilder([
        {
          document_type_id: 'doc-type-1',
          expiry_date: futureDate.toISOString().split('T')[0],
          approved: true,
        },
      ])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(docTypesBuilder)
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
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database connection failed'))

      const request = createRequest('http://localhost:3000/api/documents/user-alerts')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })
  })
})
