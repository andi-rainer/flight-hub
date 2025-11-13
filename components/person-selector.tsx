'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Clock, Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { type PersonSelectorContext } from '@/lib/constants/system-functions'
import { useDebounce } from '@/hooks/use-debounce'
import { Label } from '@/components/ui/label'

interface PersonOption {
  id: string
  name: string
  surname: string
  email: string
  functions_display?: string
  function_codes?: string[]
  membership_category?: 'regular' | 'short_term'
  membership_start_date?: string
}

interface PersonSelectorProps {
  context: PersonSelectorContext
  value: string | null
  onChange: (userId: string | null, user?: PersonOption) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  showTodayFilter?: boolean
  className?: string
}

export function PersonSelector({
  context,
  value,
  onChange,
  label,
  placeholder = 'Select person...',
  required = false,
  disabled = false,
  showTodayFilter = false,
  className,
}: PersonSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<PersonOption[]>([])
  const [recent, setRecent] = React.useState<PersonOption[]>([])
  const [selectedUser, setSelectedUser] = React.useState<PersonOption | null>(null)
  const [showTodayOnly, setShowTodayOnly] = React.useState(false)

  const debouncedSearch = useDebounce(search, 300)
  const [initialDataLoaded, setInitialDataLoaded] = React.useState(false)

  // Prefetch initial data on component mount for better UX
  React.useEffect(() => {
    const prefetchInitialData = async () => {
      if (initialDataLoaded) return

      setLoading(true)
      try {
        const params = new URLSearchParams({
          context,
          limit: '20',
        })

        const response = await fetch(`/api/users/search?${params}`)
        if (!response.ok) throw new Error('Failed to fetch users')

        const data = await response.json()
        setResults(data.results || [])
        setRecent(data.recent || [])
        setInitialDataLoaded(true)
      } catch (error) {
        console.error('Error prefetching users:', error)
        setResults([])
        setRecent([])
      } finally {
        setLoading(false)
      }
    }

    // Prefetch on mount
    prefetchInitialData()
  }, [context, initialDataLoaded])

  // Fetch results when search changes (only when user types)
  React.useEffect(() => {
    const fetchResults = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          context,
          limit: '20',
        })

        if (debouncedSearch) {
          params.append('q', debouncedSearch)
        }

        if (showTodayOnly) {
          params.append('dateFilter', 'today')
        }

        const response = await fetch(`/api/users/search?${params}`)
        if (!response.ok) throw new Error('Failed to fetch users')

        const data = await response.json()
        // Filter out any invalid entries without IDs
        setResults((data.results || []).filter((p: PersonOption) => p && p.id))
        setRecent((data.recent || []).filter((p: PersonOption) => p && p.id))
      } catch (error) {
        console.error('Error fetching users:', error)
        setResults([])
        setRecent([])
      } finally {
        setLoading(false)
      }
    }

    // Only fetch when user has typed something or changed filters
    if (debouncedSearch || showTodayOnly) {
      fetchResults()
    }
  }, [debouncedSearch, context, showTodayOnly])

  // Fetch selected user details when value changes
  React.useEffect(() => {
    const fetchSelectedUser = async () => {
      if (!value) {
        setSelectedUser(null)
        return
      }

      // Check if we already have this user in results or recent
      const existingUser =
        results.find((u) => u.id === value) || recent.find((u) => u.id === value)

      if (existingUser) {
        setSelectedUser(existingUser)
        return
      }

      // Fetch user details
      try {
        const params = new URLSearchParams({
          context,
          limit: '1',
        })
        const response = await fetch(`/api/users/search?${params}`)
        if (!response.ok) throw new Error('Failed to fetch user')

        const data = await response.json()
        const user = data.results?.find((u: PersonOption) => u && u.id === value)
        if (user && user.id) {
          setSelectedUser(user)
        }
      } catch (error) {
        console.error('Error fetching selected user:', error)
      }
    }

    fetchSelectedUser()
  }, [value, results, recent, context])

  // Create a lookup map for person ID by their display value
  const personLookup = React.useMemo(() => {
    const map = new Map<string, PersonOption>()

    // Add recent people (with validation)
    recent.forEach((person) => {
      if (!person || !person.id) return
      const key = `${person.id}||${person.name} ${person.surname} ${person.email}`
      map.set(key, person)
    })

    // Add search results (with validation)
    results.forEach((person) => {
      if (!person || !person.id) return
      const key = `${person.id}||${person.name} ${person.surname} ${person.email}`
      map.set(key, person)
    })

    return map
  }, [results, recent])

  // Filter results to exclude people already in recent
  const filteredResults = React.useMemo(() => {
    const recentIds = new Set(recent.filter(p => p && p.id).map((p) => p.id))
    return results.filter((p) => p && p.id && !recentIds.has(p.id))
  }, [results, recent])

  const handleSelect = React.useCallback(
    (commandValue: string) => {
      // Extract person ID from the command value (format: "id||name surname email")
      const person = personLookup.get(commandValue)

      if (!person) {
        console.error('Person not found for command value:', commandValue)
        return
      }

      if (value === person.id) {
        // Deselect if clicking the same user
        onChange(null)
        setSelectedUser(null)
      } else {
        onChange(person.id, person)
        setSelectedUser(person)

        // Track selection for recent history
        fetch('/api/users/track-selection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedUserId: person.id,
            context,
          }),
        }).catch((error) => console.error('Error tracking selection:', error))
      }

      setOpen(false)
      setSearch('')
    },
    [value, onChange, personLookup, context]
  )

  const displayValue = selectedUser
    ? `${selectedUser.name} ${selectedUser.surname}`
    : placeholder

  return (
    <div className={cn('grid gap-2', className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-required={required}
            disabled={disabled}
            className={cn(
              'w-full justify-between',
              !selectedUser && 'text-muted-foreground'
            )}
          >
            <span className="truncate">{displayValue}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name or email..."
              value={search}
              onValueChange={setSearch}
            />
            {showTodayFilter && (
              <div className="flex items-center gap-2 border-b px-3 py-2">
                <input
                  type="checkbox"
                  id="today-filter"
                  checked={showTodayOnly}
                  onChange={(e) => setShowTodayOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="today-filter" className="text-sm cursor-pointer">
                  Show only today&apos;s sign-ups
                </label>
              </div>
            )}
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  {recent.length > 0 && !debouncedSearch && (
                    <>
                      <CommandGroup heading="Recent">
                        {recent.filter(p => p && p.id).map((person) => {
                          const commandValue = `${person.id}||${person.name} ${person.surname} ${person.email}`
                          return (
                            <CommandItem
                              key={`recent-${person.id}`}
                              value={commandValue}
                              onSelect={handleSelect}
                            >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                value === person.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">
                                  {person.name} {person.surname}
                                </span>
                                {person.membership_category === 'short_term' && (
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    Guest
                                  </Badge>
                                )}
                              </div>
                              {person.functions_display && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {person.functions_display}
                                </span>
                              )}
                            </div>
                            <Clock className="ml-2 h-3 w-3 text-muted-foreground shrink-0" />
                          </CommandItem>
                          )
                        })}
                      </CommandGroup>
                      <CommandSeparator />
                    </>
                  )}

                  {filteredResults.length > 0 ? (
                    <CommandGroup heading={debouncedSearch ? 'Search Results' : 'All'}>
                      {filteredResults.filter(p => p && p.id).map((person) => {
                        const commandValue = `${person.id}||${person.name} ${person.surname} ${person.email}`
                        return (
                          <CommandItem
                            key={`result-${person.id}`}
                            value={commandValue}
                            onSelect={handleSelect}
                          >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              value === person.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {person.name} {person.surname}
                              </span>
                              {person.membership_category === 'short_term' && (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  Guest
                                </Badge>
                              )}
                            </div>
                            {person.functions_display && (
                              <span className="text-xs text-muted-foreground truncate">
                                {person.functions_display}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  ) : (
                    <CommandEmpty>
                      {debouncedSearch
                        ? 'No results found.'
                        : 'Start typing to search for a person...'}
                    </CommandEmpty>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {required && !value && (
        <p className="text-xs text-muted-foreground">This field is required</p>
      )}
    </div>
  )
}
