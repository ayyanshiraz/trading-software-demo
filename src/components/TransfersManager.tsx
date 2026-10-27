'use client'

import { useState } from 'react'
import { Search, Download, Hammer, Wrench, Package, Warehouse, ArrowRightLeft } from 'lucide-react'
import { createStockTransfer, acceptStockTransfer } from '@/actions/actions'

export default function TransfersManager({ branches, transfers, products }: { branches: any[], transfers: any[], products: any[] }) {
    const [search, setSearch] = useState('')
    const [selectedProduct, setSelectedProduct] = useState('')
    const [moveQty, setMoveQty] = useState('')
    const [direction, setDirection] = useState<'WH_TO_STORE' | 'STORE_TO_WH'>('WH_TO_STORE')
    const [isMoving, setIsMoving] = useState(false)

    // Store (HeadOffice) aur Warehouse (Second Branch) ko identify karna
    const storeBranch = branches.find((b: any) => b.type === 'HeadOffice') || branches[0]
    const warehouseBranch = branches.find((b: any) => b.id !== storeBranch?.id) || branches[1]

    // Store ka current stock
    const getStoreStock = (p: any) => {
        if (p.branchStocks && Array.isArray(p.branchStocks)) {
            const bStock = p.branchStocks.find((bs: any) => bs.branchId === storeBranch?.id)
            if (bStock) return bStock.quantity
        }
        return p.stock || 0
    }

    // Warehouse ka current stock
    const getWarehouseStock = (p: any) => {
        if (p.branchStocks && Array.isArray(p.branchStocks) && warehouseBranch) {
            const bStock = p.branchStocks.find((bs: any) => bs.branchId === warehouseBranch?.id)
            if (bStock) return bStock.quantity
        }
        return 0
    }

    const filteredProducts = products.filter(p => {
        const q = search.toLowerCase()
        return (p.name || '').toLowerCase().includes(q) || 
               (p.id || '').toLowerCase().includes(q) || 
               (p.category || '').toLowerCase().includes(q)
    })

    // Quick Stock Shift between Warehouse & Store
    const handleQuickShift = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedProduct || !moveQty || Number(moveQty) <= 0) return alert('Select an item and valid quantity.')
        if (!storeBranch || !warehouseBranch) return alert('Warehouse branch configuration missing.')

        setIsMoving(true)
        try {
            const fromId = direction === 'WH_TO_STORE' ? warehouseBranch.id : storeBranch.id
            const toId = direction === 'WH_TO_STORE' ? storeBranch.id : warehouseBranch.id

            await createStockTransfer(fromId, toId, [{ productId: selectedProduct, quantity: Number(moveQty) }])
            alert('Stock transfer initiated! Please click Confirm Shift in the yellow bar below.')
            setSelectedProduct('')
            setMoveQty('')
        } catch (err) {
            alert('Error shifting stock.')
        } finally {
            setIsMoving(false)
        }
    }

    // EXPORT CSV FUNCTION WITH STORE & WAREHOUSE STOCK
    const handleExportCSV = () => {
        if (filteredProducts.length === 0) return alert('No hardware inventory available to export.')

        const headers = ['Item Code', 'Hardware Name', 'Category', 'Store Stock', 'Warehouse Stock', 'Total Stock', 'Unit', 'Purchasing (Cost)', 'Selling Price']
        const csvRows = [headers.join(',')]

        filteredProducts.forEach((p: any) => {
            const sQty = getStoreStock(p)
            const wQty = getWarehouseStock(p)
            const row = [
                `="${p.id}"`,
                `="${p.name}"`,
                `="${p.category || 'Building Material'}"`,
                sQty,
                wQty,
                sQty + wQty,
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
        a.download = `Hardware_Store_And_Warehouse_Inventory_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    const pendingTransfers = (transfers || []).filter((t: any) => t.status === 'Pending')

    return (
        <div className="w-full space-y-8 relative">
            
            {/* QUICK STOCK SHIFT BAR (WAREHOUSE <-> STORE) */}
            {warehouseBranch && (
                <form onSubmit={handleQuickShift} className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
                    <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2 mb-4">
                        <ArrowRightLeft size={18} className="text-blue-600" /> Shift Stock Between Store &amp; Warehouse
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <select 
                            value={direction} 
                            onChange={e => setDirection(e.target.value as any)}
                            className="p-3 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-800 text-xs uppercase outline-none focus:border-blue-600"
                        >
                            <option value="WH_TO_STORE">Warehouse ➔ Main Store</option>
                            <option value="STORE_TO_WH">Main Store ➔ Warehouse</option>
                        </select>

                        <select 
                            value={selectedProduct} 
                            onChange={e => setSelectedProduct(e.target.value)}
                            className="p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs uppercase outline-none focus:border-blue-600 md:col-span-2"
                        >
                            <option value="">Select Hardware Item...</option>
                            {products.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (Store: {getStoreStock(p)} | Warehouse: {getWarehouseStock(p)})
                                </option>
                            ))}
                        </select>

                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                placeholder="Qty" 
                                value={moveQty} 
                                onChange={e => setMoveQty(e.target.value)}
                                className="w-24 p-3 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 text-sm outline-none focus:border-blue-600"
                            />
                            <button 
                                type="submit" 
                                disabled={isMoving}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl px-4 transition disabled:opacity-50"
                            >
                                {isMoving ? '...' : 'Shift'}
                            </button>
                        </div>
                    </div>

                    {pendingTransfers.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                            <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Pending Stock Shifts (Click Confirm to Update Stock)</p>
                            {pendingTransfers.map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs font-bold">
                                    <span>
                                        {t.items.map((i: any) => `${i.product?.name} (Qty: ${i.quantity})`).join(', ')}
                                    </span>
                                    <button 
                                        type="button"
                                        onClick={() => acceptStockTransfer(t.id)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase px-3 py-1.5 rounded-lg"
                                    >
                                        Confirm Shift
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </form>
            )}

            {/* MAIN INVENTORY TABLE */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 border-b-2 border-slate-100 pb-6">
                    <div>
                        <h2 className="text-2xl font-black uppercase text-slate-900 flex items-center gap-3">
                            <Wrench size={24} className="text-slate-700" /> Store &amp; Warehouse Inventory
                        </h2>
                        <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Hardware &amp; Building Materials (Shop Stock + Warehouse Godown)</p>
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
                                <th className="p-4 text-center">Store Stock</th>
                                <th className="p-4 text-center">Warehouse Stock</th>
                                <th className="p-4 text-center">Total Stock</th>
                                <th className="p-4 text-right">Purchasing (Cost)</th>
                                <th className="p-4 text-right">Selling Price</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-bold text-slate-700 divide-y divide-slate-100">
                            {filteredProducts.map((p: any) => {
                                const storeQty = getStoreStock(p)
                                const whQty = getWarehouseStock(p)
                                const totalQty = storeQty + whQty
                                const isLowStock = storeQty < 10

                                return (
                                    <tr key={p.id} className="hover:bg-slate-50 transition">
                                        <td className="p-4 font-mono text-xs uppercase">{p.id}</td>
                                        
                                        <td className="p-4 text-slate-900 font-black uppercase flex items-center gap-2">
                                            <Hammer size={14} className="text-slate-400" /> {p.name}
                                        </td>
                                        
                                        <td className="p-4 uppercase text-xs text-blue-700">{p.category || 'Hardware'}</td>
                                        
                                        {/* STORE STOCK */}
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Package size={14} className={isLowStock ? "text-red-500" : "text-emerald-500"} />
                                                <span className={`text-sm font-black ${isLowStock ? 'text-red-600' : 'text-emerald-700'}`}>
                                                    {storeQty.toLocaleString()}
                                                </span>
                                            </div>
                                            {isLowStock && <div className="text-[9px] text-red-500 uppercase font-black mt-0.5 tracking-widest">Low Shop Stock</div>}
                                        </td>

                                        {/* WAREHOUSE STOCK */}
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Warehouse size={14} className="text-blue-500" />
                                                <span className="text-sm font-black text-blue-700">
                                                    {whQty.toLocaleString()}
                                                </span>
                                            </div>
                                        </td>

                                        {/* TOTAL STOCK */}
                                        <td className="p-4 text-center">
                                            <span className="text-sm font-black text-slate-900">{totalQty.toLocaleString()}</span>
                                            <span className="ml-1 text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold uppercase">
                                                {p.unit || 'Pcs'}
                                            </span>
                                        </td>
                                        
                                        <td className="p-4 text-right text-red-600">PKR {p.cost?.toLocaleString()}</td>
                                        
                                        <td className="p-4 text-right text-emerald-600 font-black">PKR {p.price?.toLocaleString()}</td>
                                    </tr>
                                )
                            })}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
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