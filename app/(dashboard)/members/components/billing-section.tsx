'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Plane } from '@/lib/database.types'
import {Table, TableBody, TableCell, TableHeader, TableRow} from "@/components/ui/table";
import {ReactNode} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";

interface BillingSectionProps {
  aircrafts: Plane[]
}

function TableHead(props: { children: ReactNode }) {
  return null;
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
        <div className="rounded-md border mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tail Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Hourly Rate (CHF)</TableHead>
                <div className="text-right">
                  <TableHead>Actions</TableHead>
                </div>
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
                      defaultValue={aircraft.default_rate}
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
      </CardContent>
    </Card>
  )
}
