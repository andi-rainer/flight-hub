import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AircraftDetailsTab } from '../components/aircraft-details-tab'
import { AircraftDocumentsTab } from '../components/aircraft-documents-tab'
import { AircraftFlightLogsTab } from '../components/aircraft-flight-logs-tab'
import type { Plane, Document as AircraftDocument, User } from '@/lib/database.types'

interface AircraftWithDocuments extends Plane {
  documents: AircraftDocument[]
}

async function getAircraft(id: string): Promise<AircraftWithDocuments | null> {
  const supabase = await createClient()

  const { data: aircraft, error } = await supabase
    .from('planes')
    .select(`
      *,
      documents (*)
    `)
    .eq('id', id)
    .single()

  if (error || !aircraft) {
    return null
  }

  return aircraft as AircraftWithDocuments
}

async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

function getDocumentExpiryStatus(expiryDate: string | null) {
  if (!expiryDate) return 'none'

  const now = new Date()
  const expiry = new Date(expiryDate)
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry < 5) return 'critical'
  if (daysUntilExpiry < 45) return 'warning'
  return 'ok'
}

export default async function AircraftDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { page?: string }
}) {
  const [aircraft, currentUser] = await Promise.all([
    getAircraft(params.id),
    getCurrentUser(),
  ])

  const page = parseInt(searchParams.page || '1', 10)

  if (!aircraft) {
    notFound()
  }

  const isBoardMember = currentUser?.role?.includes('board') ?? false

  // Check for expired blocking documents
  const expiredBlockingDocs = aircraft.documents.filter(
    (doc) => doc.blocks_aircraft && getDocumentExpiryStatus(doc.expiry_date) === 'expired'
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/aircrafts">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Aircrafts
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{aircraft.tail_number}</h1>
              <Badge variant={aircraft.active ? 'default' : 'secondary'}>
                {aircraft.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground">{aircraft.type}</p>
          </div>
        </div>
      </div>

      {/* Warning for expired blocking documents */}
      {expiredBlockingDocs.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Aircraft Grounded:</strong> This aircraft has {expiredBlockingDocs.length} expired
            document{expiredBlockingDocs.length > 1 ? 's' : ''} that block operations:{' '}
            {expiredBlockingDocs.map((doc) => doc.name).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            {aircraft.documents.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {aircraft.documents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="flightlogs">Flight Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <AircraftDetailsTab aircraft={aircraft} isBoardMember={isBoardMember} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <AircraftDocumentsTab
            aircraft={aircraft}
            documents={aircraft.documents}
            isBoardMember={isBoardMember}
          />
        </TabsContent>

        <TabsContent value="flightlogs" className="space-y-4">
          <AircraftFlightLogsTab aircraftId={aircraft.id} page={page} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
