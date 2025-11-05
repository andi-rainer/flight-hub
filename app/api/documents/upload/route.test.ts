/**
 * @jest-environment node
 */

import { POST } from './route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createMockSupabaseClient,
  createQueryBuilder,
  createStorageBuilder,
  mockUser,
  mockProfile,
  mockBoardProfile,
  mockDocumentType,
  mockDocument,
} from '@/__tests__/utils/supabase-mock'

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('/api/documents/upload', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  const createFormData = (overrides: any = {}) => {
    const formData = new FormData()
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    formData.append('file', overrides.file || file)
    formData.append('documentTypeId', overrides.documentTypeId || 'doc-type-1')
    formData.append('userId', overrides.userId || 'test-user-id')
    if (overrides.expiryDate) {
      formData.append('expiryDate', overrides.expiryDate)
    }
    return formData
  }

  const createRequest = (formData: FormData) => {
    return new NextRequest('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      body: formData,
    })
  }

  describe('POST', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const formData = createFormData()
      const request = createRequest(formData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('should return 400 if required fields are missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      mockSupabase.from.mockReturnValueOnce(profileBuilder)

      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }))
      // Missing documentTypeId and userId

      const request = createRequest(formData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })

    it('should validate file type and reject non-PDF/image files', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      mockSupabase.from.mockReturnValueOnce(profileBuilder)

      const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const formData = createFormData({ file: invalidFile })

      const request = createRequest(formData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid file type. Only PDF and images are allowed.')
    })

    it('should accept valid PDF files', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const docTypeBuilder = createQueryBuilder(mockDocumentType)
      const storageBuilder = createStorageBuilder(null, null)
      const insertBuilder = createQueryBuilder(mockDocument)
      const userBuilder = createQueryBuilder({ name: 'Test', surname: 'User' })
      const userFunctionsBuilder = createQueryBuilder([{ function_id: 'function-1' }])
      const boardMembersBuilder = createQueryBuilder([])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(insertBuilder)
        .mockReturnValueOnce(userBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(boardMembersBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)

      const pdfFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      const formData = createFormData({ file: pdfFile })

      const request = createRequest(formData)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should accept valid image files (JPEG, PNG, WebP)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const docTypeBuilder = createQueryBuilder(mockDocumentType)
      const storageBuilder = createStorageBuilder(null, null)
      const insertBuilder = createQueryBuilder(mockDocument)
      const userBuilder = createQueryBuilder({ name: 'Test', surname: 'User' })
      const userFunctionsBuilder = createQueryBuilder([{ function_id: 'function-1' }])
      const boardMembersBuilder = createQueryBuilder([])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(insertBuilder)
        .mockReturnValueOnce(userBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(boardMembersBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)

      const imageFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' })
      const formData = createFormData({ file: imageFile })

      const request = createRequest(formData)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should use userId in storage path', async () => {
      const userId = 'test-user-123'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const docTypeBuilder = createQueryBuilder(mockDocumentType)
      const storageBuilder = createStorageBuilder(null, null)
      const insertBuilder = createQueryBuilder(mockDocument)
      const userBuilder = createQueryBuilder({ name: 'Test', surname: 'User' })
      const userFunctionsBuilder = createQueryBuilder([{ function_id: 'function-1' }])
      const boardMembersBuilder = createQueryBuilder([])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(insertBuilder)
        .mockReturnValueOnce(userBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(boardMembersBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)

      const formData = createFormData({ userId })
      const request = createRequest(formData)
      await POST(request)

      expect(storageBuilder.upload).toHaveBeenCalled()
      const uploadCall = storageBuilder.upload.mock.calls[0]
      expect(uploadCall[0]).toMatch(new RegExp(`^${userId}/`))
    })

    it('should create document record with correct fields', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const docTypeBuilder = createQueryBuilder(mockDocumentType)
      const storageBuilder = createStorageBuilder(null, null)
      const insertBuilder = createQueryBuilder(mockDocument)
      const userBuilder = createQueryBuilder({ name: 'Test', surname: 'User' })
      const userFunctionsBuilder = createQueryBuilder([{ function_id: 'function-1' }])
      const boardMembersBuilder = createQueryBuilder([])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(insertBuilder)
        .mockReturnValueOnce(userBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(boardMembersBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)

      const formData = createFormData()
      const request = createRequest(formData)
      await POST(request)

      expect(insertBuilder.insert).toHaveBeenCalled()
      const insertData = insertBuilder.insert.mock.calls[0][0]
      expect(insertData).toMatchObject({
        name: mockDocumentType.name,
        category: null, // Must be NULL for user documents
        uploaded_by: mockUser.id,
        user_id: 'test-user-id',
        plane_id: null,
        blocks_aircraft: false,
        document_type_id: 'doc-type-1',
      })
    })

    it('should create notification for board members when required document uploaded by regular user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile) // Regular user
      const docTypeBuilder = createQueryBuilder({
        ...mockDocumentType,
        mandatory: true,
      })
      const storageBuilder = createStorageBuilder(null, null)
      const insertBuilder = createQueryBuilder(mockDocument)
      const userBuilder = createQueryBuilder({ name: 'Test', surname: 'User' })
      const userFunctionsBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ function_id: 'function-id-1' }],
          error: null,
        }),
      }
      const boardMembersBuilder = {
        select: jest.fn().mockReturnThis(),
        overlaps: jest.fn().mockResolvedValue({
          data: [
            { id: 'board-1' },
            { id: 'board-2' },
          ],
          error: null,
        }),
      }
      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(insertBuilder)
        .mockReturnValueOnce(userBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(boardMembersBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)

      // Mock RPC for notification creation
      mockSupabase.rpc.mockResolvedValue({ data: 'notification-id-1', error: null })

      const formData = createFormData()
      const request = createRequest(formData)
      await POST(request)

      // Should call create_notification RPC twice (once for each board member)
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
        p_user_id: 'board-1',
        p_type: 'document_uploaded',
        p_title: 'New Document Uploaded',
        p_document_id: mockDocument.id,
      }))
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
        p_user_id: 'board-2',
        p_type: 'document_uploaded',
        p_title: 'New Document Uploaded',
        p_document_id: mockDocument.id,
      }))
    })

    it('should auto-approve documents uploaded by board members', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { ...mockUser, id: 'board-member-id' } },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockBoardProfile)
      const docTypeBuilder = createQueryBuilder(mockDocumentType)
      const storageBuilder = createStorageBuilder(null, null)
      const insertBuilder = createQueryBuilder({
        ...mockDocument,
        approved: true,
        approved_by: 'board-member-id',
      })

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(insertBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)

      const formData = createFormData({ userId: 'board-member-id' })
      const request = createRequest(formData)
      await POST(request)

      expect(insertBuilder.insert).toHaveBeenCalled()
      const insertData = insertBuilder.insert.mock.calls[0][0]
      expect(insertData.approved).toBe(true)
      expect(insertData.approved_by).toBe('board-member-id')
      expect(insertData.approved_at).toBeTruthy()
    })

    it('should cleanup uploaded file on database error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const docTypeBuilder = createQueryBuilder(mockDocumentType)
      const storageBuilder = createStorageBuilder(null, null)
      const insertBuilder = createQueryBuilder(null, { message: 'Database error' })

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(insertBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)

      const formData = createFormData()
      const request = createRequest(formData)
      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(storageBuilder.remove).toHaveBeenCalled() // File should be cleaned up
    })

    it('should return 500 on upload error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const docTypeBuilder = createQueryBuilder(mockDocumentType)
      const storageBuilder = createStorageBuilder(null, { message: 'Upload failed' })

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(docTypeBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)

      const formData = createFormData()
      const request = createRequest(formData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Upload failed')
    })

    it('should NOT create notifications when document is not required', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileBuilder = createQueryBuilder(mockProfile)
      const docTypeBuilder = createQueryBuilder({
        ...mockDocumentType,
        mandatory: false, // Not mandatory
        required_for_functions: [], // Not required for any function
      })
      const storageBuilder = createStorageBuilder(null, null)
      const insertBuilder = createQueryBuilder(mockDocument)
      const userBuilder = createQueryBuilder({ name: 'Test', surname: 'User' })
      const userFunctionsBuilder = createQueryBuilder([{ function_id: 'function-1' }])

      mockSupabase.from
        .mockReturnValueOnce(profileBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(insertBuilder)
        .mockReturnValueOnce(userBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)

      const formData = createFormData()
      const request = createRequest(formData)
      const response = await POST(request)

      expect(response.status).toBe(200)
      // Should only call from 5 times (not 6 for board members query)
      expect(mockSupabase.from).toHaveBeenCalledTimes(5)
    })
  })
})
