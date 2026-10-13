'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="flex items-center justify-center gap-2 w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition shadow-md"
    >
      <Printer size={16} /> Print Report
    </button>
  )
}