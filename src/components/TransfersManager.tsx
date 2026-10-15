'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle, Clock, Send, XCircle, Download } from 'lucide-react'
import { createStockTransfer, acceptStockTransfer, rejectStockTransfer } from '@/actions/actions'

export default function TransfersManager({ branches, transfers, products }: { branches: any[], transfers: any[], products: any[] }) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [fromBranchId, setFromBranchId] = useState(branches.find((b: any) => b.type === 'HeadOffice')?.id || branches[0]?.id || '')
    const [toBranchId, setToBranchId] = useState(branches.find((b: any) => b.type === 'Branch')?.id || branches[1]?.id || '')
    
    const [rows, setRows] = useState([{ id: Date.now().toString(), productId: '', quantity: '' }])

    // NAYA LOGIC: Export CSV Function for Transfers
   const handleExportCSV = () => {
        if (transfers.length === 0) return alert('No transfer records available to export.')

        const headers = ['Date', 'Time', 'From Warehouse', 'To Destination', 'Status', 'Items Transferred']
        const csvRows = [headers.join(',')]

        transfers.forEach((t: any) => {
            const date = new Date(t.transferDate).toLocaleDateString('en-GB')
            const time = new Date(t.transferDate).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})
            const itemsStr = t.items.map((i: any) => `${i.quantity}x ${i.product.name}`).join(' | ')
            
            const row = [
                `="${date}"`,
                `="${time}"`,
                `="${t.fromBranch.name}"`,
                `="${t.toBranch.name}"`,
                `="${t.status}"`,
                `="${itemsStr}"`
            ]
            csvRows.push(row.join(','))
        })

        const csvContent = csvRows.join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Stock_Transfers_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    const handleCreateTransfer = async (e: React.FormEvent) => {
        e.preventDefault()
        if (fromBranchId === toBranchId) return alert('Source and Destination branches cannot be the same.')
        
        const validRows = rows.filter(r => r.productId && Number(r.quantity) > 0)
        if (validRows.length === 0) return alert('Please add at least one valid product and quantity to transfer.')

        setIsSubmitting(true)
        try {
            await createStockTransfer(fromBranchId, toBranchId, validRows.map(r => ({ productId: r.productId, quantity: Number(r.quantity) })))
            alert('Transfer initiated successfully! Waiting for destination branch to accept.')
            setRows([{ id: Date.now().toString(), productId: '', quantity: '' }])
        } catch (error) {
            alert('Failed to initiate transfer.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleAccept = async (id: string) => {
        if (confirm('Accepting this will update the inventory. Proceed?')) {
            await acceptStockTransfer(id)
        }
    }

    const handleReject = async (id: string) => {
        if (confirm('Are you sure you want to reject this transfer?')) {
            await rejectStockTransfer(id)
        }
    }

    const updateRow = (index: number, field: string, value: string) => {
        const newRows = [...rows];
        (newRows[index] as any)[field] = value;
        setRows(newRows)
    }

    const addRow = () => setRows([...rows, { id: Date.now().toString(), productId: '', quantity: '' }])
    const removeRow = (index: number) => { if (rows.length > 1) setRows(rows.filter((_, i) => i !== index)) }

    return (
        <div className="w-full space-y-8 relative">
            {/* INITIATE TRANSFER FORM */}
            <form onSubmit={handleCreateTransfer} className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200">
                <h2 className="text-xl font-black uppercase text-slate-900 mb-6">Initiate Stock Transfer</h2>
                
                <div className="flex flex-col md:flex-row items-center gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="w-full">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">From Warehouse / Branch</label>
                        <select value={fromBranchId} onChange={e => setFromBranchId(e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600">
                            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <ArrowRight size={32} className="text-slate-300 hidden md:block mt-6" />
                    <div className="w-full">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">To Destination Branch</label>
                        <select value={toBranchId} onChange={e => setToBranchId(e.target.value)} className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600">
                            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    {rows.map((row, i) => (
                        <div key={row.id} className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 w-full">
                                <select value={row.productId} onChange={(e) => updateRow(i, 'productId', e.target.value)} required className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 uppercase text-sm">
                                    <option value="">Select Item to Transfer...</option>
                                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="w-full md:w-32">
                                <input type="number" step="any" required placeholder="Qty" value={row.quantity} onChange={(e) => updateRow(i, 'quantity', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-center outline-none focus:border-blue-600" />
                            </div>
                            {rows.length > 1 && (
                                <button type="button" onClick={() => removeRow(i)} className="text-red-500 hover:text-red-700 p-2 font-bold text-xs uppercase">Remove</button>
                            )}
                        </div>
                    ))}
                </div>
                
                <div className="flex gap-4">
                    <button type="button" onClick={addRow} className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase hover:bg-slate-300 transition">+ Add Item</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition flex items-center justify-center gap-2 disabled:opacity-50"><Send size={16} /> {isSubmitting ? 'Sending...' : 'Send Transfer Request'}</button>
                </div>
            </form>

            {/* TRANSFER HISTORY TABLE */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black uppercase text-slate-900">Transfer History & Acceptance</h2>
                    <button type="button" onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition bg-slate-900 text-white hover:bg-black shadow-md border border-slate-800">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Route</th>
                                <th className="p-4">Items Transferred</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-bold text-slate-700 divide-y divide-slate-100">
                            {transfers.map((t: any) => (
                                <tr key={t.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 text-xs whitespace-nowrap">
                                        <span className="text-slate-900 block">{new Date(t.transferDate).toLocaleDateString('en-GB')}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(t.transferDate).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                                    </td>
                                    <td className="p-4 uppercase text-xs">
                                        <div className="text-slate-500 text-[9px] font-black tracking-widest">From</div>
                                        <div className="text-blue-700 mb-1">{t.fromBranch.name}</div>
                                        <div className="text-slate-500 text-[9px] font-black tracking-widest">To</div>
                                        <div className="text-emerald-700">{t.toBranch.name}</div>
                                    </td>
                                    <td className="p-4">
                                        <ul className="list-disc pl-4 space-y-1">
                                            {t.items.map((item: any) => (
                                                <li key={item.id} className="text-xs uppercase"><span className="font-black">{item.quantity}x</span> {item.product.name}</li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td className="p-4 text-center">
                                        {t.status === 'Pending' && <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"><Clock size={12}/> Pending</span>}
                                        {t.status === 'Accepted' && <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"><CheckCircle size={12}/> Accepted</span>}
                                        {t.status === 'Rejected' && <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"><XCircle size={12}/> Rejected</span>}
                                    </td>
                                    <td className="p-4 text-right">
                                        {t.status === 'Pending' ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleReject(t.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-[10px] font-black uppercase tracking-widest transition">Reject</button>
                                                <button onClick={() => handleAccept(t.id)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest shadow-lg transition">Accept</button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Recorded on {t.acceptDate ? new Date(t.acceptDate).toLocaleDateString() : '---'}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {transfers.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No stock transfers found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}