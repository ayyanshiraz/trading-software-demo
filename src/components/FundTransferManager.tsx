'use client'

import { useState } from 'react'
import { ArrowRightLeft, Save, FileText, Trash2, Download, Edit, Printer, X } from 'lucide-react'
import { createFundTransfer, deleteFundTransfer, updateFundTransfer } from '@/actions/actions'

export default function FundTransferManager({ customers, history = [] }: { customers: any[], history?: any[] }) {
    const [editingId, setEditingId] = useState('')
    const [fromAccount, setFromAccount] = useState('')
    const [toAccount, setToAccount] = useState('')
    const [amount, setAmount] = useState('')
    const [notes, setNotes] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [isSaving, setIsSaving] = useState(false)
    
    // Receipt Modal State
    const [receiptData, setReceiptData] = useState<any>(null)

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fromAccount || !toAccount || !amount || Number(amount) <= 0) return alert('Please fill all fields.')
        if (fromAccount === toAccount) return alert('Sender and Receiver cannot be the same account.')

        setIsSaving(true)
        try {
            if (editingId) {
                await updateFundTransfer(editingId, fromAccount, toAccount, Number(amount), notes, date)
                alert('Transfer updated successfully!')
            } else {
                await createFundTransfer(fromAccount, toAccount, Number(amount), notes, date)
                alert('Funds transferred successfully!')
            }
            cancelEdit()
        } catch (error) {
            alert('Error saving transfer.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleEdit = (t: any) => {
        setEditingId(t.id)
        setFromAccount(t.senderId)
        setToAccount(t.receiverId)
        setAmount(t.amount.toString())
        setNotes(t.notes)
        setDate(t.dateForInput)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const cancelEdit = () => {
        setEditingId('')
        setFromAccount('')
        setToAccount('')
        setAmount('')
        setNotes('')
        setDate(new Date().toISOString().split('T')[0])
    }

    const handleReverse = async (baseId: string) => {
        if (confirm(`Are you sure you want to delete transfer ${baseId}? Both accounts will be reverted to their previous balance.`)) {
            await deleteFundTransfer(baseId)
            if (editingId === baseId) cancelEdit()
        }
    }

    const groupedHistory = history.reduce((acc, curr) => {
        const baseId = curr.id.replace('-A', '').replace('-B', '')
        if (!acc[baseId]) acc[baseId] = []
        acc[baseId].push(curr)
        return acc
    }, {} as Record<string, any[]>)

    const groupedTransfers = Object.entries(groupedHistory).map(([baseId, invoices]: any) => {
        const senderInv = invoices.find((i: any) => i.paidAmount < 0)
        const receiverInv = invoices.find((i: any) => i.paidAmount > 0)
        const noteParts = (invoices[0]?.notes || '').split('|')
        return {
            id: baseId,
            date: invoices[0]?.createdAt ? new Date(invoices[0].createdAt).toLocaleDateString('en-GB') : '',
            dateForInput: invoices[0]?.createdAt ? new Date(invoices[0].createdAt).toISOString().split('T')[0] : '',
            amount: receiverInv?.paidAmount || 0,
            sender: senderInv?.customer?.name || 'Unknown',
            senderId: senderInv?.customerId || '',
            receiver: receiverInv?.customer?.name || 'Unknown',
            receiverId: receiverInv?.customerId || '',
            notes: noteParts.length > 1 ? noteParts[1].trim() : ''
        }
    })

    const handleExportCSV = () => {
        if (groupedTransfers.length === 0) return alert('No transfer history available.')
        const headers = ['JV Number', 'Date', 'From (Sender)', 'To (Receiver)', 'Notes', 'Amount (PKR)']
        const csvRows = [headers.join(',')]
        groupedTransfers.forEach((t: any) => {
            csvRows.push([`="${t.id}"`, `"${t.date}"`, `"${t.sender}"`, `"${t.receiver}"`, `"${t.notes}"`, t.amount].join(','))
        })
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `Ledger_Transfers.csv`; a.click()
    }

    const printReceipt = () => {
        window.print()
    }

    return (
        <div className="space-y-8 relative">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #print-voucher, #print-voucher * { visibility: visible; }
                    #print-voucher { position: absolute; left: 0; top: 0; width: 100%; z-index: 9999; background: white; padding: 20px; }
                    .no-print { display: none !important; }
                }
            `}</style>

            {/* PRINTABLE RECEIPT MODAL */}
            {receiptData && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 no-print">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div id="print-voucher" className="p-8 bg-white text-slate-900 border-2 border-slate-800 m-4 relative">
                            <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
                                <h1 className="text-3xl font-black uppercase tracking-widest">TRADING SOFTWARE</h1>
                                <p className="text-sm font-bold text-slate-500 tracking-widest mt-1 uppercase">Official Journal Voucher</p>
                            </div>
                            
                            <div className="flex justify-between items-center mb-8 font-bold">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Voucher No</p>
                                    <p className="text-lg">{receiptData.id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Date</p>
                                    <p className="text-lg">{receiptData.date}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 mb-8">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-black mb-1">Transfer From (Debited)</p>
                                    <p className="text-base font-black uppercase text-slate-800">{receiptData.sender}</p>
                                </div>
                                <div className="border-t border-slate-200 pt-4">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-black mb-1">Transfer To (Credited)</p>
                                    <p className="text-base font-black uppercase text-slate-800">{receiptData.receiver}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-end border-b-2 border-slate-800 pb-2 mb-4">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-black">Transfer Amount</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-black">PKR {receiptData.amount.toLocaleString()}</p>
                                </div>
                            </div>

                            {receiptData.notes && (
                                <div className="mb-12">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-black mb-1">Narration / Notes</p>
                                    <p className="text-sm font-bold italic text-slate-700">{receiptData.notes}</p>
                                </div>
                            )}

                            <div className="flex justify-between mt-16 pt-8 border-t border-slate-300">
                                <div className="text-center w-40">
                                    <div className="border-b border-slate-400 mb-2"></div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Authorized By</p>
                                </div>
                                <div className="text-center w-40">
                                    <div className="border-b border-slate-400 mb-2"></div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Received By</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-100 flex justify-end gap-3 border-t border-slate-200">
                            <button onClick={() => setReceiptData(null)} className="px-5 py-2.5 rounded-xl text-xs font-black uppercase bg-slate-200 hover:bg-slate-300 text-slate-700 transition">Cancel</button>
                            <button onClick={printReceipt} className="px-5 py-2.5 rounded-xl text-xs font-black uppercase bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-2 shadow-lg">
                                <Printer size={16} /> Print / Save PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleTransfer} className={`bg-white p-6 md:p-8 rounded-3xl shadow-xl border ${editingId ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-200'}`}>
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
                            <ArrowRightLeft size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase text-slate-900">{editingId ? 'Edit Transfer Entry' : 'New Transfer Entry'}</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">{editingId ? `Updating Voucher: ${editingId}` : 'Adjust balances between two parties'}</p>
                        </div>
                    </div>
                    {editingId && (
                        <button type="button" onClick={cancelEdit} className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 flex items-center gap-1">
                            <X size={14} /> Cancel Edit
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200">
                        <label className="text-[10px] font-black uppercase text-orange-800 mb-2 block">Transfer From (Payable / Sender)</label>
                        <select value={fromAccount} onChange={e => setFromAccount(e.target.value)} required className="w-full p-3 bg-white border border-orange-300 rounded-xl font-bold text-slate-900 outline-none focus:border-orange-600 uppercase text-sm">
                            <option value="">Select Account...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                        </select>
                    </div>

                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                        <label className="text-[10px] font-black uppercase text-emerald-800 mb-2 block">Transfer To (Receivable / Receiver)</label>
                        <select value={toAccount} onChange={e => setToAccount(e.target.value)} required className="w-full p-3 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 outline-none focus:border-emerald-600 uppercase text-sm">
                            <option value="">Select Account...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Transfer Amount (PKR)</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required min="1" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 outline-none focus:border-blue-600" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 uppercase text-sm" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Notes / Description</label>
                        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Mutual Adjustment" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 text-sm" />
                    </div>
                </div>

                <button type="submit" disabled={isSaving} className={`w-full py-4 text-white rounded-xl font-black uppercase tracking-widest transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-black'}`}>
                    <Save size={18} /> {isSaving ? 'Processing...' : (editingId ? 'Update Transfer' : 'Confirm Ledger Transfer')}
                </button>
            </form>

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
                            <FileText size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase text-slate-900">Transfer History</h2>
                        </div>
                    </div>
                    <button type="button" onClick={handleExportCSV} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase transition bg-slate-900 text-white hover:bg-black shadow-md border border-slate-800">
                        <Download size={16} /> Export CSV
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200">
                            <tr>
                                <th className="p-4">JV Number</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">From (Sender)</th>
                                <th className="p-4">To (Receiver)</th>
                                <th className="p-4 text-right">Amount</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-bold text-slate-700 divide-y divide-slate-100">
                            {groupedTransfers.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 font-mono text-xs uppercase text-blue-600">{t.id}</td>
                                    <td className="p-4 text-xs">{t.date}</td>
                                    <td className="p-4 text-xs font-black uppercase text-orange-700">{t.sender}</td>
                                    <td className="p-4 text-xs font-black uppercase text-emerald-700">{t.receiver}</td>
                                    <td className="p-4 text-right font-black">PKR {t.amount.toLocaleString()}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setReceiptData(t)} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition inline-flex items-center justify-center" title="Print/PDF Voucher">
                                                <Printer size={16} />
                                            </button>
                                            <button onClick={() => handleEdit(t)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition inline-flex items-center justify-center" title="Edit Transfer">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleReverse(t.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition inline-flex items-center justify-center" title="Delete Transfer">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {groupedTransfers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                        No ledger transfers found.
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