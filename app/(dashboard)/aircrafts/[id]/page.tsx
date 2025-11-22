import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@/navigation'
import { AircraftDetailsTab } from '../components/aircraft-details-tab'
import { AircraftDocumentsTab } from '../components/aircraft-documents-tab'
import { AircraftFlightLogsTab } from '../components/aircraft-flight-logs-tab'
import { AircraftBillingTab } from '../components/aircraft-billing-tab'
import { AircraftMaintenanceTab } from '../components/aircraft-maintenance-tab'
import { AircraftComponentsTab } from '../components/aircraft-components-tab'
import { AircraftWeightBalanceTab } from '../components/aircraft-weight-balance-tab'
import { getAircraftWithMaintenance, getMaintenanceHistory } from '../maintenance-actions'
import type { Plane, Document as AircraftDocument, User, OperationType, CostCenter } from '@/lib/database.types'

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

async function getOperationTypesForAircraft(aircraftId: string): Promise<OperationType[]> {
  const supabase = await createClient()

  const { data: operationTypes, error } = await supabase
    .from('operation_types')
    .select('*')
    .eq('plane_id', aircraftId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching operation types:', error)
    return []
  }

  return operationTypes || []
}

async function getCostCenters(): Promise<CostCenter[]> {
  const supabase = await createClient()

  const { data: costCenters, error } = await supabase
    .from('cost_centers')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching cost centers:', error)
    return []
  }

  return costCenters || []
}

async function getCgLimits(aircraftId: string) {
  const supabase = await createClient()

  const { data: cgLimits, error } = await supabase
    .from('aircraft_cg_limits')
    .select('*')
    .eq('plane_id', aircraftId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching CG limits:', error)
    return []
  }

  return cgLimits || []
}

async function getStations(aircraftId: string) {
  const supabase = await createClient()

  const { data: stations, error } = await supabase
    .from('aircraft_stations')
    .select('*')
    .eq('plane_id', aircraftId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching stations:', error)
    return []
  }

  return stations || []
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

function getMaintenanceStatusBadge(status?: string, hoursRemaining?: number | null, t?: (key: string) => string) {
  if (!status || status === 'not_scheduled') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        {t?.('mxNotSet') || 'MX Not Set'}
      </Badge>
    )
  }

  switch (status) {
    case 'ok':
      return (
        <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3" />
          {t?.('mxOk') || 'MX OK'} ({hoursRemaining?.toFixed(0)}h)
        </Badge>
      )
    case 'warning':
      return (
        <Badge variant="default" className="gap-1 bg-yellow-600 hover:bg-yellow-700">
          <AlertTriangle className="h-3 w-3" />
          {t?.('mxDueSoon') || 'MX Due Soon'} ({hoursRemaining?.toFixed(0)}h)
        </Badge>
      )
    case 'critical':
      return (
        <Badge variant="default" className="gap-1 bg-orange-600 hover:bg-orange-700">
          <AlertTriangle className="h-3 w-3" />
          {t?.('mxCritical') || 'MX Critical'} ({hoursRemaining?.toFixed(0)}h)
        </Badge>
      )
    case 'overdue':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {t?.('mxOverdue') || 'MX Overdue'}
        </Badge>
      )
    default:
      return <Badge variant="secondary">{t?.('unknown') || 'Unknown'}</Badge>
  }
}

export default async function AircraftDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const { page: pageParam } = await searchParams

  const t = await getTranslations('aircrafts')
  const tCommon = await getTranslations('common')

  const [aircraft, currentUser, operationTypes, costCenters, aircraftWithMaintenance, maintenanceHistory, cgLimits, stations] = await Promise.all([
    getAircraft(id),
    getCurrentUser(),
    getOperationTypesForAircraft(id),
    getCostCenters(),
    getAircraftWithMaintenance(id),
    getMaintenanceHistory(id),
    getCgLimits(id),
    getStations(id),
  ])

  const page = parseInt(pageParam || '1', 10)

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
            {t('backToAircrafts')}
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">{aircraft.tail_number}</h1>
              <Badge variant={aircraft.active ? 'default' : 'secondary'}>
                {aircraft.active ? tCommon('active') : tCommon('inactive')}
              </Badge>
              {aircraftWithMaintenance?.data && (
                getMaintenanceStatusBadge(
                  aircraftWithMaintenance.data.maintenance_status,
                  aircraftWithMaintenance.data.hours_until_maintenance,
                  t
                )
              )}
            </div>
            <p className="text-muted-foreground">{aircraft.type}</p>
            {aircraftWithMaintenance?.data?.total_flight_hours && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('totalHours')}: {aircraftWithMaintenance.data.total_flight_hours.toFixed(1)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Warning for maintenance overdue */}
      {aircraftWithMaintenance?.data?.maintenance_status === 'overdue' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('maintenanceOverdue')}:</strong>{' '}
            {t('maintenanceOverdueMessage', {
              hours: Math.abs(aircraftWithMaintenance.data.hours_until_maintenance || 0).toFixed(1)
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* Warning for maintenance critical */}
      {aircraftWithMaintenance?.data?.maintenance_status === 'critical' && (
        <Alert variant="destructive" className="border-orange-600 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-800" />
          <AlertDescription className="text-orange-700">
            <strong>{t('maintenanceCritical')}:</strong>{' '}
            {t('maintenanceCriticalMessage', {
              hours: aircraftWithMaintenance.data.hours_until_maintenance?.toFixed(1)
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* Warning for expired blocking documents */}
      {expiredBlockingDocs.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('aircraftGrounded')}:</strong>{' '}
            {t('aircraftGroundedMessage', {
              count: expiredBlockingDocs.length,
              plural: expiredBlockingDocs.length > 1 ? 's' : '',
              documents: expiredBlockingDocs.map((doc) => doc.name).join(', ')
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">{t('details')}</TabsTrigger>
          <TabsTrigger value="documents">
            {t('documents')}
            {aircraft.documents.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {aircraft.documents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            {t('maintenance')}
            {aircraftWithMaintenance?.data?.maintenance_status && aircraftWithMaintenance.data.maintenance_status !== 'ok' && aircraftWithMaintenance.data.maintenance_status !== 'not_scheduled' && (
              <Badge
                variant={aircraftWithMaintenance.data.maintenance_status === 'overdue' ? 'destructive' : 'secondary'}
                className="ml-2"
              >
                !
              </Badge>
            )}
          </TabsTrigger>
          {isBoardMember && <TabsTrigger value="components">{t('components')}</TabsTrigger>}
          {isBoardMember && <TabsTrigger value="weight-balance">{t('weightBalance')}</TabsTrigger>}
          <TabsTrigger value="flightlogs">{t('flightLogs')}</TabsTrigger>
          {isBoardMember && <TabsTrigger value="billing">{t('billing')}</TabsTrigger>}
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

        <TabsContent value="maintenance" className="space-y-4">
          {aircraftWithMaintenance?.data && maintenanceHistory?.data ? (
            <AircraftMaintenanceTab
              aircraft={aircraftWithMaintenance.data}
              maintenanceHistory={maintenanceHistory.data}
              isBoardMember={isBoardMember}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('unableToLoadMaintenanceData')}</p>
            </div>
          )}
        </TabsContent>

        {isBoardMember && (
          <TabsContent value="components" className="space-y-4">
            {aircraftWithMaintenance?.data ? (
              <AircraftComponentsTab
                aircraftId={aircraft.id}
                aircraftTailNumber={aircraft.tail_number}
                aircraftCurrentHours={aircraftWithMaintenance.data.total_flight_hours}
                isBoardMember={isBoardMember}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t('unableToLoadAircraftData')}</p>
              </div>
            )}
          </TabsContent>
        )}

        {isBoardMember && (
          <TabsContent value="weight-balance" className="space-y-4">
            <AircraftWeightBalanceTab
              aircraft={aircraft}
              cgLimits={cgLimits}
              stations={stations}
              canEdit={isBoardMember}
            />
          </TabsContent>
        )}

        <TabsContent value="flightlogs" className="space-y-4">
          <AircraftFlightLogsTab aircraftId={aircraft.id} page={page} />
        </TabsContent>

        {isBoardMember && (
          <TabsContent value="billing" className="space-y-4">
            <AircraftBillingTab aircraft={aircraft} operationTypes={operationTypes} costCenters={costCenters} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
