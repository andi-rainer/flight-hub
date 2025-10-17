'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getActiveAircraftForFlightlog } from './actions'
import { Loader2, Plane as PlaneIcon, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export function FlightlogList() {
  const [aircraft, setAircraft] = useState<Array<{ id: string; tail_number: string; type: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAircraft()
  }, [])

  const loadAircraft = async () => {
    setIsLoading(true)

    const result = await getActiveAircraftForFlightlog()

    if (result.error) {
      toast.error('Failed to load aircraft')
      console.error(result.error)
    } else {
      setAircraft(result.data || [])
    }

    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {aircraft.map((plane) => (
          <Link key={plane.id} href={`/flightlog/${plane.id}`}>
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PlaneIcon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">{plane.tail_number}</CardTitle>
                </div>
                <CardDescription>{plane.type}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">View flight log</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {aircraft.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          No active aircraft found
        </div>
      )}
    </div>
  )
}
