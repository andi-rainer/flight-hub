'use client'

import { MobileSidebar } from './sidebar'
import { UserMenu } from './user-menu'
import { ModeToggle } from './mode-toggle'

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <MobileSidebar />

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
