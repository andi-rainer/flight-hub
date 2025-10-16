'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import type { Plane } from '@/lib/database.types'

interface BillingSectionProps {
  aircrafts: Plane[]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BillingSection({ aircrafts }: BillingSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aircraft Hourly Rates</CardTitle>
        <CardDescription>
          Set hourly flight rates for each aircraft
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Database Schema Update Required</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              To enable aircraft hourly rate management, the database schema needs to be updated.
            </p>
            <p className="text-sm font-mono bg-muted p-2 rounded mt-2">
              ALTER TABLE planes ADD COLUMN hourly_rate DECIMAL(10,2) DEFAULT 150.00;
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Once this migration is applied, you will be able to set custom hourly rates for each
              aircraft. The flightlog charging feature will use these rates to calculate costs.
            </p>
          </AlertDescription>
        </Alert>

        {/* Placeholder UI for when schema is updated */}
        <div className="mt-4 rounded-md border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          <p>Aircraft hourly rate configuration will appear here once the schema is updated.</p>
          <p className="mt-1">Current default rate: CHF 150.00/hour</p>
        </div>

        {/* TODO: Uncomment when schema is updated
        <div className="rounded-md border mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tail Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Hourly Rate (CHF)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aircrafts.map((aircraft) => (
                <TableRow key={aircraft.id}>
                  <TableCell className="font-medium">{aircraft.tail_number}</TableCell>
                  <TableCell>{aircraft.type}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={aircraft.hourly_rate || 150}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm">Save</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        */}
      </CardContent>
    </Card>
  )
}
