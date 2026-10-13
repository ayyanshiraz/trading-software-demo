'use client'

import { useEffect } from 'react'
import { logoutUser } from '@/actions/actions'

export default function LogoutPage() {
  useEffect(() => {
    logoutUser()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <h1 className="text-2xl font-black uppercase text-slate-400 animate-pulse tracking-widest">
            Securely Logging Out...
        </h1>
    </div>
  )
}