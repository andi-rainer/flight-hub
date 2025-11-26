'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Download } from 'lucide-react'
import type { Plane, Document as AircraftDocument } from '@/lib/database.types'
import { DocumentUploadDialog } from './document-upload-dialog'
import { DocumentRow } from './document-row'
import { useTranslations } from 'next-intl'

interface AircraftDocumentsTabProps {
  aircraft: Plane
  documents: AircraftDocument[]
  isBoardMember: boolean
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

export function AircraftDocumentsTab({ aircraft, documents, isBoardMember }: AircraftDocumentsTabProps) {
  const t = useTranslations('aircrafts')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('aircraftDocuments')}</CardTitle>
              <CardDescription>{t('manageDocumentsForAircraft')}</CardDescription>
            </div>
            {isBoardMember && <DocumentUploadDialog aircraftId={aircraft.id} />}
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('noDocumentsUploadedYet')}</p>
              {isBoardMember && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('clickUploadButton')}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('name')}</TableHead>
                      <TableHead>{t('tags')}</TableHead>
                      <TableHead>{t('uploadDate')}</TableHead>
                      <TableHead>{t('expiryDate')}</TableHead>
                      <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((document) => (
                      <DocumentRow
                        key={document.id}
                        document={document}
                        aircraftId={aircraft.id}
                        isBoardMember={isBoardMember}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {documents.map((document) => {
                  const expiryStatus = getDocumentExpiryStatus(document.expiry_date)
                  return (
                    <Card key={document.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{document.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {t('uploaded')}: {new Date(document.uploaded_at).toLocaleDateString()}
                            </CardDescription>
                          </div>
                          {document.blocks_aircraft && (
                            <Badge variant="destructive" className="text-xs">
                              {t('blocksAircraft')}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(document.tags ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(document.tags ?? []).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {document.expiry_date && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t('expires')}:</p>
                            <p
                              className={`text-sm font-medium ${
                                expiryStatus === 'expired' || expiryStatus === 'critical'
                                  ? 'text-destructive'
                                  : expiryStatus === 'warning'
                                  ? 'text-orange-600'
                                  : ''
                              }`}
                            >
                              {new Date(document.expiry_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge variant={document.approved ? 'default' : 'secondary'}>
                            {document.approved ? t('approved') : t('pending')}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild className="flex-1">
                            <a href={document.file_url} download target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3 mr-1" />
                              {t('download')}
                            </a>
                          </Button>
                          {isBoardMember && (
                            <DocumentRow
                              document={document}
                              aircraftId={aircraft.id}
                              isBoardMember={isBoardMember}
                              mobileView
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
