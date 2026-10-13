'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export default function LedgerFilter({ initialFrom, initialTo, initialQuery = '', initialCat = '', categories = [] }: any) {
    const router = useRouter()
    const [from, setFrom] = useState(initialFrom || '')
    const [to, setTo] = useState(initialTo || '')
    const [query, setQuery] = useState(initialQuery || '')
    const [category, setCategory] = useState(initialCat || '')

    const formatDDMMYYYY = (dateStr: string) => {
        if (!dateStr) return 'DD/MM/YYYY';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }

    const handleSearch = () => {
        let url = `/ledger?q=${encodeURIComponent(query)}&cat=${encodeURIComponent(category)}`
        if (from) url += `&from=${from}`
        if (to) url += `&to=${to}`
        router.push(url)
    }

    const handleClear = () => {
        setQuery('')
        setCategory('')
        setFrom('')
        setTo('')
        router.push('/ledger')
    }

    const setPreset = (days: number) => {
        const end = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
        const start = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
        start.setDate(end.getDate() - days);

        const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

        setFrom(startStr); setTo(endStr);
        let url = `/ledger?q=${encodeURIComponent(query)}&cat=${encodeURIComponent(category)}&from=${startStr}&to=${endStr}`
        router.push(url);
    }

    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            
            {/* CRITICAL FIX: Stretches the invisible calendar icon to cover the whole input for easy clicking */}
            <style>{`
                input[type="date"]::-webkit-calendar-picker-indicator {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                }
            `}</style>
            
            <div className="flex flex-col gap-4">
                
                {/* TOP ROW: Presets & Dates */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shrink-0">
                        <button type="button" onClick={() => setPreset(0)} className="px-4 py-2.5 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest transition border-r border-slate-200">Daily</button>
                        <button type="button" onClick={() => setPreset(7)} className="px-4 py-2.5 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest transition border-r border-slate-200">Weekly</button>
                        <button type="button" onClick={() => setPreset(30)} className="px-4 py-2.5 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest transition">Monthly</button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative w-36 h-[42px] shrink-0 group">
                            {/* SOLID MASK (z-10): Hides the native text completely */}
                            <div className={`absolute inset-0 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-xs font-bold pointer-events-none tracking-widest z-10 group-hover:border-blue-500 transition-colors ${!from ? 'text-slate-400' : 'text-slate-900'}`}>
                                {formatDDMMYYYY(from)}
                            </div>
                            {/* NATIVE INPUT (z-0): Trapped behind the mask, but icon catches clicks */}
                            <input type="date" value={from || ''} onChange={(e) => setFrom(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0" />
                        </div>

                        <span className="text-slate-300 font-bold">-</span>

                        <div className="relative w-36 h-[42px] shrink-0 group">
                            <div className={`absolute inset-0 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-xs font-bold pointer-events-none tracking-widest z-10 group-hover:border-blue-500 transition-colors ${!to ? 'text-slate-400' : 'text-slate-900'}`}>
                                {formatDDMMYYYY(to)}
                            </div>
                            <input type="date" value={to || ''} onChange={(e) => setTo(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0" />
                        </div>
                    </div>
                </div>

                {/* BOTTOM ROW: Search & Categories */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or ID..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition" />
                    </div>
                    
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:border-blue-500 transition cursor-pointer min-w-[150px]">
                        <option value="">All Cats</option>
                        {categories && categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>

                    <div className="flex gap-2">
                        <button onClick={handleSearch} className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-black transition shadow-lg shrink-0">Filter</button>
                        <button onClick={handleClear} className="bg-slate-100 text-slate-600 px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition shrink-0">Clear</button>
                    </div>
                </div>
            </div>
        </div>
    )
}