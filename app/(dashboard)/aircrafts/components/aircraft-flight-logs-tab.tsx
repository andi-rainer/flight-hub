import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { FileText, Lock, Download } from 'lucide-react'
import type { FlightlogWithTimes } from '@/lib/database.types'
import { FlightLogsPagination } from './flight-logs-pagination'
import { getTranslations } from 'next-intl/server'

const LOGS_PER_PAGE = 20

async function getFlightLogs(
  aircraftId: string,
  page: number = 1
): Promise<{ logs: FlightlogWithTimes[]; totalCount: number }> {
  const supabase = await createClient()

  // Get total count
  const { count } = await supabase
    .from('flightlog_with_times')
    .select('*', { count: 'exact', head: true })
    .eq('plane_id', aircraftId)

  // Get paginated logs
  const { data: logs, error } = await supabase
    .from('flightlog_with_times')
    .select('*')
    .eq('plane_id', aircraftId)
    .order('block_on', { ascending: false })
    .range((page - 1) * LOGS_PER_PAGE, page * LOGS_PER_PAGE - 1)

  if (error) {
    console.error('Error fetching flight logs:', error)
    return { logs: [], totalCount: 0 }
  }

  return {
    logs: logs as FlightlogWithTimes[],
    totalCount: count || 0,
  }
}

function formatDuration(hours: number | null): string {
  if (!hours) return 'N/A'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m}m`
}

interface AircraftFlightLogsTabProps {
  aircraftId: string
  page?: number
}

export async function AircraftFlightLogsTab({ aircraftId, page = 1 }: AircraftFlightLogsTabProps) {
  const t = await getTranslations()

  const { logs, totalCount } = await getFlightLogs(aircraftId, page)
  const totalPages = Math.ceil(totalCount / LOGS_PER_PAGE)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('aircrafts.flightLogs')}</CardTitle>
          <CardDescription>
            {t('aircrafts.flightLogsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No flight logs found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>Pilot</TableHead>
                      <TableHead>Copilot</TableHead>
                      <TableHead>{t('flightLog.blockTime')}</TableHead>
                      <TableHead>{t('flightLog.flightTime')}</TableHead>
                      <TableHead>Fuel (L)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>M&B</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {new Date(log.block_on).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {log.pilot_name} {log.pilot_surname}
                        </TableCell>
                        <TableCell>
                          {log.copilot_name && log.copilot_surname
                            ? `${log.copilot_name} ${log.copilot_surname}`
                            : '-'}
                        </TableCell>
                        <TableCell>{formatDuration(log.block_time_hours)}</TableCell>
                        <TableCell>{formatDuration(log.flight_time_hours)}</TableCell>
                        <TableCell>{log.fuel || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {log.locked && (
                              <Badge variant="secondary">
                                <Lock className="h-3 w-3 mr-1" />
                                {t('flightLog.locked')}
                              </Badge>
                            )}
                            {log.charged && <Badge variant="default">{t('flightLog.charged')}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.m_and_b_pdf_url ? (
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={log.m_and_b_pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {logs.map((log) => (
                  <Card key={log.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {new Date(log.block_on).toLocaleDateString()}
                      </CardTitle>
                      <CardDescription>
                        Pilot: {log.pilot_name} {log.pilot_surname}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {log.copilot_name && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Copilot:</span>{' '}
                          {log.copilot_name} {log.copilot_surname}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Block:</span>{' '}
                          {formatDuration(log.block_time_hours)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Flight:</span>{' '}
                          {formatDuration(log.flight_time_hours)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fuel:</span> {log.fuel || '-'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.locked && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Gesperrt
                          </Badge>
                        )}
                        {log.charged && (
                          <Badge variant="default" className="text-xs">
                            Charged
                          </Badge>
                        )}
                        {log.m_and_b_pdf_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={log.m_and_b_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              M&B
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <FlightLogsPagination
                    currentPage={page}
                    totalPages={totalPages}
                    aircraftId={aircraftId}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
