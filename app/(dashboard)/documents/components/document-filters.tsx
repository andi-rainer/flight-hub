'use client'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

const CATEGORIES = ['All', 'Regulations', 'Procedures', 'Forms', 'General']

export default function DocumentFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [_isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [category, setCategory] = useState(searchParams.get('category') || 'All')

  const updateFilters = (newSearch?: string, newCategory?: string) => {
    const params = new URLSearchParams(searchParams)

    const searchValue = newSearch !== undefined ? newSearch : search
    const categoryValue = newCategory !== undefined ? newCategory : category

    if (searchValue) {
      params.set('search', searchValue)
    } else {
      params.delete('search')
    }

    if (categoryValue && categoryValue !== 'All') {
      params.set('category', categoryValue)
    } else {
      params.delete('category')
    }

    startTransition(() => {
      router.push(`/documents?${params.toString()}`)
    })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            updateFilters(e.target.value, undefined)
          }}
          className="pl-10"
        />
      </div>
      <Select
        value={category}
        onValueChange={(value) => {
          setCategory(value)
          updateFilters(undefined, value)
        }}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
