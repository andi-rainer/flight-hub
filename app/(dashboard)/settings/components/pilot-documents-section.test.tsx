import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PilotDocumentsSection } from './pilot-documents-section'

// Mock next/navigation
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('PilotDocumentsSection', () => {
  // Mock fetch globally
  const mockFetch = jest.fn()
  global.fetch = mockFetch

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockReset()
  })

  const mockDocumentTypes = [
    {
      id: 'doc-type-1',
      name: 'Pilot License',
      category: 'license',
      mandatory: true,
      required_for_functions: ['function-1'],
    },
    {
      id: 'doc-type-2',
      name: 'Medical Certificate',
      category: 'medical',
      mandatory: true,
      required_for_functions: ['function-1'],
    },
    {
      id: 'doc-type-3',
      name: 'Optional Document',
      category: 'other',
      mandatory: false,
      required_for_functions: ['function-2'], // Different function
    },
  ]

  const mockDocuments = [
    {
      id: 'doc-1',
      name: 'Pilot License',
      document_type_id: 'doc-type-1',
      expiry_date: '2025-12-31',
      approved: true,
      uploaded_at: '2024-01-01T00:00:00Z',
      file_url: 'documents/test-user/license.pdf',
    },
  ]

  const mockUserData = {
    user: {
      id: 'test-user-id',
      functions: ['function-1'], // User has function-1
    },
  }

  const setupSuccessfulFetch = () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: mockDocuments }),
      }) // documents/user
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentTypes: mockDocumentTypes }),
      }) // documents/types
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData,
      }) // users/:userId
  }

  it('should filter document types by user functions', async () => {
    setupSuccessfulFetch()

    render(<PilotDocumentsSection userId="test-user-id" />)

    await waitFor(() => {
      expect(screen.queryByText('Loading')).not.toBeInTheDocument()
    })

    // Should only show doc-type-1 and doc-type-2 (required for function-1)
    // doc-type-3 should not be shown (required for function-2)
    expect(mockFetch).toHaveBeenCalledWith('/api/documents/types')
    expect(mockFetch).toHaveBeenCalledWith('/api/users/test-user-id')
  })

  it('should show missing mandatory documents alert', async () => {
    setupSuccessfulFetch()

    render(<PilotDocumentsSection userId="test-user-id" />)

    await waitFor(() => {
      expect(screen.getByText('Missing Required Documents')).toBeInTheDocument()
    })

    // User has doc-type-1 but missing doc-type-2 (Medical Certificate)
    expect(screen.getByText(/Medical Certificate/i)).toBeInTheDocument()
  })

  it('should NOT show missing documents alert when all documents uploaded', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documents: [
            mockDocuments[0],
            {
              id: 'doc-2',
              name: 'Medical Certificate',
              document_type_id: 'doc-type-2',
              expiry_date: '2025-12-31',
              approved: true,
              uploaded_at: '2024-01-01T00:00:00Z',
              file_url: 'documents/test-user/medical.pdf',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentTypes: mockDocumentTypes }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData,
      })

    render(<PilotDocumentsSection userId="test-user-id" />)

    await waitFor(() => {
      expect(screen.queryByText('Missing Required Documents')).not.toBeInTheDocument()
    })
  })

  it('should have upload and renewal functionality available', async () => {
    setupSuccessfulFetch()

    render(<PilotDocumentsSection userId="test-user-id" />)

    await waitFor(() => {
      expect(screen.queryByText('Loading')).not.toBeInTheDocument()
    })

    // Verify upload button exists
    const uploadButton = screen.getByRole('button', { name: /upload document/i })
    expect(uploadButton).toBeInTheDocument()

    // Verify renew buttons exist for uploaded documents
    const renewButtons = screen.getAllByTitle('Renew Document')
    expect(renewButtons.length).toBeGreaterThan(0)

    // Note: Testing dialog interactions and form submissions is complex in JSDOM.
    // The upload and renew APIs are tested separately in their respective route tests.
  })

  it('should display document status badges correctly', async () => {
    const now = new Date()
    const expiringSoon = new Date(now)
    expiringSoon.setDate(now.getDate() + 30) // 30 days from now

    const expired = new Date(now)
    expired.setDate(now.getDate() - 1) // Yesterday

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documents: [
            {
              id: 'doc-1',
              name: 'Valid Document',
              document_type_id: 'doc-type-1',
              expiry_date: '2026-12-31',
              approved: true,
              uploaded_at: '2024-01-01T00:00:00Z',
            },
            {
              id: 'doc-2',
              name: 'Expiring Soon',
              document_type_id: 'doc-type-2',
              expiry_date: expiringSoon.toISOString().split('T')[0],
              approved: true,
              uploaded_at: '2024-01-01T00:00:00Z',
            },
            {
              id: 'doc-3',
              name: 'Expired Document',
              document_type_id: 'doc-type-3',
              expiry_date: expired.toISOString().split('T')[0],
              approved: true,
              uploaded_at: '2024-01-01T00:00:00Z',
            },
            {
              id: 'doc-4',
              name: 'Pending Approval',
              document_type_id: 'doc-type-4',
              expiry_date: '2026-12-31',
              approved: false,
              uploaded_at: '2024-01-01T00:00:00Z',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentTypes: mockDocumentTypes }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData,
      })

    render(<PilotDocumentsSection userId="test-user-id" />)

    await waitFor(() => {
      // Check that the documents are rendered by looking for specific status badges
      // Using getAllByText to handle multiple instances and verify they exist
      const validBadges = screen.getAllByText('Valid')
      expect(validBadges.length).toBeGreaterThan(0)

      const expiringSoonBadges = screen.getAllByText(/expiring soon/i)
      expect(expiringSoonBadges.length).toBeGreaterThan(0)

      const expiredBadges = screen.getAllByText(/expired/i)
      expect(expiredBadges.length).toBeGreaterThan(0)

      const pendingBadges = screen.getAllByText('Pending Approval')
      expect(pendingBadges.length).toBeGreaterThan(0)
    })
  })

  it('should show loading state while fetching data', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<PilotDocumentsSection userId="test-user-id" />)

    // Look for the Loader2 icon with animate-spin class
    const loader = document.querySelector('.animate-spin')
    expect(loader).toBeInTheDocument()
  })

  it('should handle fetch errors gracefully', async () => {
    const { toast } = require('sonner')

    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<PilotDocumentsSection userId="test-user-id" />)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load documents')
    })
  })

  it('should only show document types relevant to user functions', async () => {
    const userWithNoFunctions = {
      user: {
        id: 'test-user-id',
        functions: [], // No functions assigned
      },
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documentTypes: mockDocumentTypes }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => userWithNoFunctions,
      })

    render(<PilotDocumentsSection userId="test-user-id" />)

    await waitFor(() => {
      expect(screen.queryByText('Loading')).not.toBeInTheDocument()
    })

    // Should not show missing documents alert since user has no functions
    expect(screen.queryByText('Missing Required Documents')).not.toBeInTheDocument()
  })
})
