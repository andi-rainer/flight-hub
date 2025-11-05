/**
 * Utility functions for mocking Supabase client in tests
 */

export type MockSupabaseClient = {
  auth: {
    getUser: jest.Mock
    getSession: jest.Mock
  }
  from: jest.Mock
  storage: {
    from: jest.Mock
  }
  rpc: jest.Mock
}

/**
 * Creates a mock Supabase client with chainable methods
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  const mockSupabaseClient: MockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
    rpc: jest.fn(),
  }

  return mockSupabaseClient
}

/**
 * Creates a chainable query builder for Supabase
 */
export function createQueryBuilder(returnData: any = null, returnError: any = null) {
  const builder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
    maybeSingle: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
  }

  // Make the builder itself awaitable for when no terminal method is called
  Object.assign(builder, Promise.resolve({ data: returnData, error: returnError }))

  return builder
}

/**
 * Creates a chainable storage builder for Supabase Storage
 */
export function createStorageBuilder(returnData: any = null, returnError: any = null) {
  return {
    upload: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
    remove: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
    createSignedUrl: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
  }
}

/**
 * Mock authenticated user
 */
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
}

/**
 * Mock board member user
 */
export const mockBoardMember = {
  id: 'board-member-id',
  email: 'board@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
}

/**
 * Mock user profile
 */
export const mockProfile = {
  id: 'test-user-id',
  name: 'Test',
  surname: 'User',
  email: 'test@example.com',
  role: ['pilot'],
}

/**
 * Mock board member profile
 */
export const mockBoardProfile = {
  id: 'board-member-id',
  name: 'Board',
  surname: 'Member',
  email: 'board@example.com',
  role: ['board', 'pilot'],
}

/**
 * Mock document type
 */
export const mockDocumentType = {
  id: 'doc-type-1',
  name: 'Pilot License',
  category: 'license',
  mandatory: true,
  expires: true,
  expiry_type: 'DURATION',
  default_validity_months: 24,
  required_for_functions: ['function-id-1'],
}

/**
 * Mock document
 */
export const mockDocument = {
  id: 'doc-1',
  name: 'Pilot License',
  category: null,
  tags: ['license'],
  file_url: 'documents/test-user-id/pilot-license-123456.pdf',
  uploaded_by: 'test-user-id',
  user_id: 'test-user-id',
  plane_id: null,
  expiry_date: '2025-12-31',
  approved: true,
  approved_by: 'board-member-id',
  approved_at: '2024-01-01T00:00:00Z',
  blocks_aircraft: false,
  document_type_id: 'doc-type-1',
  uploaded_at: '2024-01-01T00:00:00Z',
}
