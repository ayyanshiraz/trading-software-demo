'use client'

import { useState } from 'react'
import { Search, Download, Hammer, Wrench, Package } from 'lucide-react'

export default function TransfersManager({ branches, transfers, products }: { branches: any[], transfers: any[], products: any[] }) {
    const [search, setSearch] = useState('')

    // Head Office ko identify karne ka logic
    const headOffice = branches.find((b: any) => b.type === 'HeadOffice') || branches[0]

    // Head Office ka current stock nikalne ka safe function
    const getHOStock = (p: any) => {
        if (p.branchStocks && Array.isArray(p.branchStocks)) {
            const bStock = p.branchStocks.find((bs: any) => bs.branchId === headOffice?.id)
            if (bStock) return bStock.quantity
        }
        return p.stock || 0
    }

    const filteredProducts = products.filter(p => {
        const q = search.toLowerCase()
        return (p.name || '').toLowerCase().includes(q) || 
               (p.id || '').toLowerCase().includes(q) || 
               (p.category || '').toLowerCase().includes(q)
    })

    // EXPORT CSV FUNCTION WITH STOCK & PURCHASING
    const handleExportCSV = () => {
        if (filteredProducts.length === 0) return alert('No hardware inventory available to export.')

        const headers = ['Item Code', 'Hardware Name', 'Category', 'Available Stock', 'Unit', 'Purchasing (Cost)', 'Selling Price']
        const csvRows = [headers.join(',')]

        filteredProducts.forEach((p: any) => {
            const stockQty = getHOStock(p)
            const row = [
                `="${p.id}"`,
                `="${p.name}"`,
                `="${p.category || 'Building Material'}"`,
                stockQty,
                `="${p.unit || 'Pcs'}"`,
                p.cost,
                p.price
            ]
            csvRows.push(row.join(','))
        })

        const csvContent = csvRows.join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Head_Office_Hardware_Inventory_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    return (
        <div className="w-full space-y-8 relative">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200">
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 border-b-2 border-slate-100 pb-6">
                    <div>
                        <h2 className="text-2xl font-black uppercase text-slate-900 flex items-center gap-3">
                            <Wrench size={24} className="text-slate-700" /> Head Office Inventory
                        </h2>
                        <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Hardware & Building Materials (Purchasing & Current Stock)</p>
                    </div>
                    
                    <button type="button" onClick={handleExportCSV} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition bg-slate-900 text-white hover:bg-black shadow-md border border-slate-800 shrink-0">
                        <Download size={16} /> Export CSV
                    </button>
                </div>

                <div className="relative w-full lg:w-96 mb-6">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search items, tower bolts..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 text-sm" 
                    />
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200">
                            <tr>
                                <th className="p-4">Item Code</th>
                                <th className="p-4">Hardware / Material Name</th>
                                <th className="p-4">Category</th>
                                <th className="p-4 text-center">Available Stock</th>
                                <th className="p-4 text-right">Purchasing (Cost)</th>
                                <th className="p-4 text-right">Selling Price</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-bold text-slate-700 divide-y divide-slate-100">
                            {filteredProducts.map((p: any) => {
                                const stockQty = getHOStock(p)
                                const isLowStock = stockQty < 10

                                return (
                                    <tr key={p.id} className="hover:bg-slate-50 transition">
                                        <td className="p-4 font-mono text-xs uppercase">{p.id}</td>
                                        
                                        <td className="p-4 text-slate-900 font-black uppercase flex items-center gap-2">
                                            <Hammer size={14} className="text-slate-400" /> {p.name}
                                        </td>
                                        
                                        <td className="p-4 uppercase text-xs text-blue-700">{p.category || 'Hardware'}</td>
                                        
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Package size={14} className={isLowStock ? "text-red-500" : "text-emerald-500"} />
                                                <span className={`text-sm font-black ${isLowStock ? 'text-red-600' : 'text-emerald-700'}`}>
                                                    {stockQty.toLocaleString()}
                                                </span>
                                                <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold uppercase">
                                                    {p.unit || 'Pcs'}
                                                </span>
                                            </div>
                                            {isLowStock && <div className="text-[9px] text-red-500 uppercase font-black mt-1 tracking-widest">Low Stock</div>}
                                        </td>
                                        
                                        <td className="p-4 text-right text-red-600">PKR {p.cost?.toLocaleString()}</td>
                                        
                                        <td className="p-4 text-right text-emerald-600 font-black">PKR {p.price?.toLocaleString()}</td>
                                    </tr>
                                )
                            })}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                        No hardware inventory found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}