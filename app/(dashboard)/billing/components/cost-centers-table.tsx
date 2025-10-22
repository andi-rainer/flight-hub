'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Plus } from 'lucide-react'
import { CreateCostCenterDialog } from './create-cost-center-dialog'
import { EditCostCenterDialog } from './edit-cost-center-dialog'
import type { CostCenter } from '@/lib/database.types'

interface CostCentersTableProps {
  costCenters: CostCenter[]
}

export function CostCentersTable({ costCenters }: CostCentersTableProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const handleEditClick = (costCenter: CostCenter) => {
    setSelectedCostCenter(costCenter)
    setEditDialogOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cost Centers</CardTitle>
              <CardDescription>
                {costCenters.length} {costCenters.length === 1 ? 'cost center' : 'cost centers'} configured
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Cost Center
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {costCenters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No cost centers</p>
              <p className="text-sm">Create cost centers for tracking internal expenses</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costCenters.map((costCenter) => (
                    <TableRow key={costCenter.id}>
                      <TableCell className="font-medium">{costCenter.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {costCenter.description || '-'}
                      </TableCell>
                      <TableCell>
                        {costCenter.active ? (
                          <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(costCenter)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCostCenterDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {selectedCostCenter && (
        <EditCostCenterDialog
          costCenter={selectedCostCenter}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </>
  )
}
