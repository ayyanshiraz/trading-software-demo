'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

export default function CustomerHistorySearch({ customers, currentFrom, currentTo }: { customers: any[], currentFrom?: string, currentTo?: string }) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    // AMENDMENT: Strictly filters by Name and ID only. Removed phone and address search.
    const filtered = customers.filter(c =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.id || '').toLowerCase().includes(search.toLowerCase())
    )

    const handleSelect = (id: string) => {
        setIsOpen(false)
        setSearch('')
        let url = `/ledger?view=customer_history&customerId=${id}`
        if (currentFrom) url += `&from=${currentFrom}`
        if (currentTo) url += `&to=${currentTo}`
        router.push(url)
    }

    return (
        <div className="relative w-full">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Search Customer Account</label>
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Type name or ID..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full pl-12 p-4 bg-white border-2 border-blue-200 rounded-xl font-black uppercase tracking-wide text-slate-900 outline-none focus:border-blue-600 transition shadow-sm placeholder:font-normal placeholder:normal-case"
                />
                {search && (
                    <button onClick={() => { setSearch(''); setIsOpen(false); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition">
                        <X size={18} />
                    </button>
                )}
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-200 shadow-2xl rounded-xl max-h-72 overflow-y-auto z-50 p-2">
                        {filtered.map(c => (
                            <div key={c.id} onClick={() => handleSelect(c.id)} className="p-3 cursor-pointer rounded-lg hover:bg-blue-50 border-b border-slate-100 last:border-0 transition flex flex-col md:flex-row md:items-center justify-between gap-1">
                                <div>
                                    <p className="font-black text-slate-900 uppercase tracking-tight">{c.name} <span className="text-[10px] text-slate-400 font-mono ml-2 lowercase bg-slate-100 px-1 py-0.5 rounded">#{c.id}</span></p>
                                    <p className="text-[11px] text-slate-500 font-bold mt-0.5 uppercase tracking-widest">{c.phone || 'No Phone'} | {c.address || 'No Address'}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-[10px] font-black uppercase ${c.openingBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>System Bal: PKR {c.openingBalance?.toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && <div className="p-6 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">No matching accounts found.</div>}
                    </div>
                </>
            )}
        </div>
    )
}