'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function SidebarWrapper() {
  const pathname = usePathname()

  // If on login page, DO NOT render the sidebar
  if (pathname === '/login') {
    return null
  }

  return <Sidebar />
}