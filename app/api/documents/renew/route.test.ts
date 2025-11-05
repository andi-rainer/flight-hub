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
  mockDocumentType,
  mockDocument,
} from '@/__tests__/utils/supabase-mock'

// Mock the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('/api/documents/renew', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  const createFormData = (overrides: any = {}) => {
    const formData = new FormData()
    const file = new File(['new content'], 'renewed.pdf', { type: 'application/pdf' })
    formData.append('file', overrides.file || file)
    formData.append('documentId', overrides.documentId || 'doc-1')
    formData.append('userId', overrides.userId || 'test-user-id')
    if (overrides.expiryDate) {
      formData.append('expiryDate', overrides.expiryDate)
    }
    return formData
  }

  const createRequest = (formData: FormData) => {
    return new NextRequest('http://localhost:3000/api/documents/renew', {
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

      const formData = new FormData()
      formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }))
      // Missing documentId and userId

      const request = createRequest(formData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })

    it('should validate file type', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const formData = createFormData({ file: invalidFile })

      const request = createRequest(formData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid file type. Only PDF and images are allowed.')
    })

    it('should return 404 if document not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const existingDocBuilder = createQueryBuilder(null, { message: 'Not found' })
      mockSupabase.from.mockReturnValueOnce(existingDocBuilder)

      const formData = createFormData()
      const request = createRequest(formData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Document not found')
    })

    it('should return 403 if user does not own the document', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const existingDocBuilder = createQueryBuilder({
        ...mockDocument,
        user_id: 'different-user-id', // Different owner
      })
      mockSupabase.from.mockReturnValueOnce(existingDocBuilder)

      const formData = createFormData()
      const request = createRequest(formData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized')
    })

    it('should successfully update file_url and expiry_date', async () => {
      const newExpiryDate = '2026-12-31'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const existingDocBuilder = createQueryBuilder(mockDocument)
      const docTypeBuilder = createQueryBuilder(mockDocumentType)
      const storageBuilder = createStorageBuilder(null, null)
      const updateBuilder = createQueryBuilder({
        ...mockDocument,
        file_url: 'documents/test-user-id/pilot-license-999999.pdf',
        expiry_date: newExpiryDate,
      })
      const userBuilder = createQueryBuilder({ name: 'Test', surname: 'User' })
      const userFunctionsBuilder = createQueryBuilder([{ function_id: 'function-id-1' }])
      const boardMembersBuilder = createQueryBuilder([{ id: 'board-1' }])

      mockSupabase.from
        .mockReturnValueOnce(existingDocBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(updateBuilder)
        .mockReturnValueOnce(userBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(boardMembersBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)
      mockSupabase.rpc.mockResolvedValue({ data: 'notification-id', error: null })

      const formData = createFormData({ expiryDate: newExpiryDate })
      const request = createRequest(formData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(updateBuilder.update).toHaveBeenCalled()
      const updateData = updateBuilder.update.mock.calls[0][0]
      expect(updateData.expiry_date).toBe(newExpiryDate)
      expect(updateData.file_url).toMatch(/^documents\//)
    })

    it('should reset approval status to false', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const existingDocBuilder = createQueryBuilder({
        ...mockDocument,
        approved: true, // Was approved
      })
      const docTypeBuilder = createQueryBuilder(mockDocumentType)
      const storageBuilder = createStorageBuilder(null, null)
      const updateBuilder = createQueryBuilder({
        ...mockDocument,
        approved: false,
        approved_by: null,
        approved_at: null,
      })
      const userBuilder = createQueryBuilder({ name: 'Test', surname: 'User' })
      const userFunctionsBuilder = createQueryBuilder([{ function_id: 'function-id-1' }])
      const boardMembersBuilder = createQueryBuilder([{ id: 'board-1' }])

      mockSupabase.from
        .mockReturnValueOnce(existingDocBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(updateBuilder)
        .mockReturnValueOnce(userBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(boardMembersBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)
      mockSupabase.rpc.mockResolvedValue({ data: 'notification-id', error: null })

      const formData = createFormData()
      const request = createRequest(formData)
      await POST(request)

      expect(updateBuilder.update).toHaveBeenCalled()
      const updateData = updateBuilder.update.mock.calls[0][0]
      expect(updateData.approved).toBe(false)
      expect(updateData.approved_by).toBeNull()
      expect(updateData.approved_at).toBeNull()
    })

    it('should delete old file from storage', async () => {
      const oldFileUrl = 'documents/test-user-id/pilot-license-old.pdf'
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const existingDocBuilder = createQueryBuilder({
        ...mockDocument,
        file_url: oldFileUrl,
      })
      const docTypeBuilder = createQueryBuilder(mockDocumentType)
      const storageBuilder = createStorageBuilder(null, null)
      const updateBuilder = createQueryBuilder(mockDocument)
      const userBuilder = createQueryBuilder({ name: 'Test', surname: 'User' })
      const userFunctionsBuilder = createQueryBuilder([{ function_id: 'function-id-1' }])
      const boardMembersBuilder = createQueryBuilder([{ id: 'board-1' }])

      mockSupabase.from
        .mockReturnValueOnce(existingDocBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(updateBuilder)
        .mockReturnValueOnce(userBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(boardMembersBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)
      mockSupabase.rpc.mockResolvedValue({ data: 'notification-id', error: null })

      const formData = createFormData()
      const request = createRequest(formData)
      await POST(request)

      expect(storageBuilder.remove).toHaveBeenCalled()
      const removeCall = storageBuilder.remove.mock.calls[0][0]
      expect(removeCall).toEqual(['test-user-id/pilot-license-old.pdf'])
    })

    it('should create notification for board members', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const existingDocBuilder = createQueryBuilder(mockDocument)
      const docTypeBuilder = createQueryBuilder({
        ...mockDocumentType,
        mandatory: true,
      })
      const storageBuilder = createStorageBuilder(null, null)
      const updateBuilder = createQueryBuilder(mockDocument)
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
        .mockReturnValueOnce(existingDocBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(updateBuilder)
        .mockReturnValueOnce(userBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)
        .mockReturnValueOnce(boardMembersBuilder)

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null })
      mockSupabase.storage.from.mockReturnValue(storageBuilder)

      const formData = createFormData()
      const request = createRequest(formData)
      await POST(request)

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2) // Once per board member
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
        p_user_id: 'board-1',
        p_type: 'document_uploaded',
        p_title: 'Document Renewed',
      }))
    })

    it('should cleanup uploaded file on update failure', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const existingDocBuilder = createQueryBuilder(mockDocument)
      const docTypeBuilder = createQueryBuilder(mockDocumentType)
      const storageBuilder = createStorageBuilder(null, null)
      const updateBuilder = createQueryBuilder(null, { message: 'Update failed' })

      mockSupabase.from
        .mockReturnValueOnce(existingDocBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(updateBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)

      const formData = createFormData()
      const request = createRequest(formData)
      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(storageBuilder.remove).toHaveBeenCalled() // New file should be cleaned up
    })

    it('should cleanup uploaded file if update returns no data', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const existingDocBuilder = createQueryBuilder(mockDocument)
      const docTypeBuilder = createQueryBuilder(mockDocumentType)
      const storageBuilder = createStorageBuilder(null, null)
      const updateBuilder = createQueryBuilder(null, null) // No data returned

      mockSupabase.from
        .mockReturnValueOnce(existingDocBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(updateBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)

      const formData = createFormData()
      const request = createRequest(formData)
      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(storageBuilder.remove).toHaveBeenCalled()
    })

    it('should handle internal errors gracefully', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Internal error'))

      const formData = createFormData()
      const request = createRequest(formData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal server error' })
    })

    it('should NOT create notifications when document is not required', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const existingDocBuilder = createQueryBuilder(mockDocument)
      const docTypeBuilder = createQueryBuilder({
        ...mockDocumentType,
        mandatory: false,
        required_for_functions: [],
      })
      const storageBuilder = createStorageBuilder(null, null)
      const updateBuilder = createQueryBuilder(mockDocument)
      const userBuilder = createQueryBuilder({ name: 'Test', surname: 'User' })
      const userFunctionsBuilder = createQueryBuilder([{ function_id: 'function-1' }])

      mockSupabase.from
        .mockReturnValueOnce(existingDocBuilder)
        .mockReturnValueOnce(docTypeBuilder)
        .mockReturnValueOnce(updateBuilder)
        .mockReturnValueOnce(userBuilder)
        .mockReturnValueOnce(userFunctionsBuilder)

      mockSupabase.storage.from.mockReturnValue(storageBuilder)

      const formData = createFormData()
      const request = createRequest(formData)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })
  })
})
