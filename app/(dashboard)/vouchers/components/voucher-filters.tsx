'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X, Search } from 'lucide-react'
import { useTransition } from 'react'

export function VoucherFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasActiveFilters = searchParams.toString().length > 0

  return (
    <div className="space-y-4">
      <div className="grid gap-2 grid-cols-[200px_180px_1fr_160px_160px]">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={searchParams.get('status') || undefined}
            onValueChange={(value) => updateFilters('status', value === 'all' ? '' : value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="redeemed">Redeemed</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="searchCode">Voucher Code</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="searchCode"
              placeholder="Search by code..."
              className="pl-8"
              defaultValue={searchParams.get('searchCode') || ''}
              onChange={(e) => {
                const value = e.target.value
                const timeoutId = setTimeout(() => {
                  updateFilters('searchCode', value)
                }, 500)
                return () => clearTimeout(timeoutId)
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="searchEmail">Customer Email</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="searchEmail"
              placeholder="Search by email..."
              className="pl-8"
              defaultValue={searchParams.get('searchEmail') || ''}
              onChange={(e) => {
                const value = e.target.value
                const timeoutId = setTimeout(() => {
                  updateFilters('searchEmail', value)
                }, 500)
                return () => clearTimeout(timeoutId)
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateFrom">Date From</Label>
          <Input
            id="dateFrom"
            type="date"
            defaultValue={searchParams.get('dateFrom') || ''}
            onChange={(e) => updateFilters('dateFrom', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo">Date To</Label>
          <Input
            id="dateTo"
            type="date"
            defaultValue={searchParams.get('dateTo') || ''}
            onChange={(e) => updateFilters('dateTo', e.target.value)}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            disabled={isPending}
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  )
}
