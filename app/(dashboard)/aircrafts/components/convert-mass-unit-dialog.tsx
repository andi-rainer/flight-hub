'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { convertAircraftMassUnit } from '@/lib/actions/weight-balance'
import { toast } from 'sonner'

interface ConvertMassUnitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planeId: string
  currentUnit: 'kg' | 'lbs'
  targetUnit: 'kg' | 'lbs'
  hasMaxMass: boolean
  hasEmptyWeight: boolean
  cgLimitsCount: number
  stationsCount: number
  onSuccess: () => void
}

export function ConvertMassUnitDialog({
  open,
  onOpenChange,
  planeId,
  currentUnit,
  targetUnit,
  hasMaxMass,
  hasEmptyWeight,
  cgLimitsCount,
  stationsCount,
  onSuccess,
}: ConvertMassUnitDialogProps) {
  const [isConverting, setIsConverting] = useState(false)

  const handleConvert = async () => {
    setIsConverting(true)

    try {
      const result = await convertAircraftMassUnit(planeId, targetUnit)

      if (result.success) {
        toast.success(`Successfully converted all masses to ${targetUnit}`)
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to convert mass units')
      }
    } catch (error) {
      console.error('Error converting mass units:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsConverting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const getUnitLabel = (unit: 'kg' | 'lbs') => {
    return unit === 'kg' ? 'Kilograms (kg)' : 'Pounds (lbs)'
  }

  const conversionFactor = targetUnit === 'lbs' ? 2.20462262 : 0.45359237

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Convert Mass Unit System</DialogTitle>
          <DialogDescription>
            This will convert all aircraft masses from {getUnitLabel(currentUnit)} to {getUnitLabel(targetUnit)}.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="border-orange-600 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-800" />
          <AlertDescription className="text-orange-700">
            <strong>Warning:</strong> This action will automatically convert and update all mass values for this aircraft.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div>
            <h4 className="font-medium mb-2">The following masses will be converted:</h4>
            <ul className="space-y-2 text-sm">
              {hasMaxMass && (
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>Max. T/O Mass (MTOM)</span>
                </li>
              )}
              {hasEmptyWeight && (
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>Empty Weight</span>
                </li>
              )}
              {cgLimitsCount > 0 && (
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>All CG Limit weights ({cgLimitsCount} {cgLimitsCount === 1 ? 'point' : 'points'})</span>
                </li>
              )}
              {stationsCount > 0 && (
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>All Station weights ({stationsCount} {stationsCount === 1 ? 'station' : 'stations'})</span>
                </li>
              )}
            </ul>
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Conversion Factor:</p>
            <p className="text-muted-foreground">
              1 {currentUnit} = {conversionFactor.toFixed(5)} {targetUnit}
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            All values will be rounded to 2 decimal places after conversion.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isConverting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConvert}
            disabled={isConverting}
          >
            {isConverting ? 'Converting...' : 'Convert & Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
