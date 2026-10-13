'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardFilter({ initialFrom, initialTo }: { initialFrom: string, initialTo: string }) {
    const router = useRouter()
    const [from, setFrom] = useState(initialFrom)
    const [to, setTo] = useState(initialTo)
    
    const formatDDMMYYYY = (dateStr: string) => {
        if (!dateStr) return 'DD/MM/YYYY';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        router.push(`/?from=${from}&to=${to}`)
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
            
            <style>{`
                .safari-date-killer::-webkit-datetime-edit { color: transparent !important; }
                .safari-date-killer::-webkit-datetime-edit-fields-wrapper { color: transparent !important; }
                .safari-date-killer::-webkit-datetime-edit-text { color: transparent !important; }
            `}</style>
            
            <div className="relative w-36 h-10 shrink-0 group">
                <div className={`absolute inset-0 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-xs font-bold pointer-events-none tracking-widest z-10 group-hover:border-blue-500 transition-colors ${!from ? 'text-slate-400' : 'text-slate-900'}`}>
                    {formatDDMMYYYY(from)}
                </div>
                <input 
                    type="date" name="from" value={from} onChange={(e) => setFrom(e.target.value)}
                    className="safari-date-killer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 text-transparent bg-transparent" 
                    style={{ color: 'transparent' }} 
                />
            </div>
            
            <span className="text-slate-400 font-bold shrink-0">-</span>
            
            <div className="relative w-36 h-10 shrink-0 group">
                <div className={`absolute inset-0 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-xs font-bold pointer-events-none tracking-widest z-10 group-hover:border-blue-500 transition-colors ${!to ? 'text-slate-400' : 'text-slate-900'}`}>
                    {formatDDMMYYYY(to)}
                </div>
                <input 
                    type="date" name="to" value={to} onChange={(e) => setTo(e.target.value)}
                    className="safari-date-killer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 text-transparent bg-transparent" 
                    style={{ color: 'transparent' }} 
                />
            </div>

            <button type="submit" className="bg-slate-900 text-white px-5 h-10 rounded-lg hover:bg-black transition text-xs font-black uppercase tracking-widest shrink-0 relative z-30">
                Filter
            </button>
        </form>
    )
}