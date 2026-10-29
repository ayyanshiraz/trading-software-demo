'use client'

import { useState } from 'react'
import { ArrowRightLeft, Save, FileText, Trash2, Download, Edit, Printer, X, Search, Calendar, Image as ImageIcon, Upload, Eye, MessageCircle } from 'lucide-react'
import { createFundTransfer, deleteFundTransfer, updateFundTransfer } from '@/actions/actions'

export default function FundTransferManager({ customers, history = [] }: { customers: any[], history?: any[] }) {
    const [editingId, setEditingId] = useState('')
    const [fromAccount, setFromAccount] = useState('')
    const [toAccount, setToAccount] = useState('')
    const [amount, setAmount] = useState('')
    const [notes, setNotes] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [receiptImage, setReceiptImage] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [receiptData, setReceiptData] = useState<any>(null)
    const [previewImageModal, setPreviewImageModal] = useState<string | null>(null)

    const [searchTerm, setSearchTerm] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    // Full HD clarity (1600px width at 85% quality) for sharp text in screenshots & slips
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const img = new window.Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const MAX_WIDTH = 1600
                const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1
                canvas.width = img.width * scale
                canvas.height = img.height * scale

                const ctx = canvas.getContext('2d')
                if (ctx) {
                    ctx.fillStyle = '#FFFFFF'
                    ctx.fillRect(0, 0, canvas.width, canvas.height)
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85)
                    setReceiptImage(compressedBase64)
                }
            }
            img.src = event.target?.result as string
        }
        reader.readAsDataURL(file)
    }

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fromAccount || !toAccount || !amount || Number(amount) <= 0) return alert('Please fill all fields.')
        if (fromAccount === toAccount) return alert('Sender and Receiver cannot be the same account.')

        setIsSaving(true)
        try {
            if (editingId) {
                await updateFundTransfer(editingId, fromAccount, toAccount, Number(amount), notes, date, receiptImage)
                alert('Transfer updated successfully!')
            } else {
                await createFundTransfer(fromAccount, toAccount, Number(amount), notes, date, receiptImage)
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
        setReceiptImage(t.image || '')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const cancelEdit = () => {
        setEditingId('')
        setFromAccount('')
        setToAccount('')
        setAmount('')
        setNotes('')
        setReceiptImage('')
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
        
        const rawNotes = senderInv?.notes || invoices[0]?.notes || ''
        let textPart = rawNotes
        let extractedImg = ''

        if (rawNotes.includes('||IMG||')) {
            const splitImg = rawNotes.split('||IMG||')
            textPart = splitImg[0].trim()
            extractedImg = splitImg[1] ? splitImg[1].trim() : ''
        }

        const noteParts = textPart.split('|')
        return {
            id: baseId,
            date: invoices[0]?.createdAt ? new Date(invoices[0].createdAt).toLocaleDateString('en-GB') : '',
            dateForInput: invoices[0]?.createdAt ? new Date(invoices[0].createdAt).toISOString().split('T')[0] : '',
            amount: receiverInv?.paidAmount || 0,
            sender: senderInv?.customer?.name || 'Unknown',
            senderId: senderInv?.customerId || '',
            receiver: receiverInv?.customer?.name || 'Unknown',
            receiverId: receiverInv?.customerId || '',
            notes: noteParts.length > 1 ? noteParts[1].trim() : '',
            image: extractedImg
        }
    })

    const filteredTransfers = groupedTransfers.filter((t: any) => {
        const matchSearch = t.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.sender.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.receiver.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.notes.toLowerCase().includes(searchTerm.toLowerCase())
        let matchDate = true
        if (startDate && endDate) matchDate = t.dateForInput >= startDate && t.dateForInput <= endDate
        else if (startDate) matchDate = t.dateForInput >= startDate
        else if (endDate) matchDate = t.dateForInput <= endDate
        return matchSearch && matchDate
    })

    const handleExportCSV = () => {
        if (filteredTransfers.length === 0) return alert('No transfer history available.')
        const headers = ['JV Number', 'Date', 'From (Sender)', 'To (Receiver)', 'Notes', 'Proof Attached', 'Amount (PKR)']
        const csvRows = [headers.join(',')]
        filteredTransfers.forEach((t: any) => {
            csvRows.push([`="${t.id}"`, `"${t.date}"`, `"${t.sender}"`, `"${t.receiver}"`, `"${t.notes}"`, `"${t.image ? 'Yes' : 'No'}"`, t.amount].join(','))
        })
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `Ledger_Transfers.csv`; a.click()
    }

    const handleWhatsAppShare = (t: any) => {
        const message = `*LEDGER TRANSFER RECEIPT*\n\n*JV Number:* ${t.id}\n*Date:* ${t.date}\n*Transfer From:* ${t.sender}\n*Transfer To:* ${t.receiver}\n*Amount:* PKR ${t.amount.toLocaleString()}\n*Notes:* ${t.notes || 'N/A'}\n*Proof:* ${t.image ? 'Attached in System' : 'None'}\n\n_Powered by Trading Software_`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }

    const printReceipt = () => {
        if (!receiptData) return
        const printWindow = window.open('', '_blank', 'width=850,height=950')
        if (!printWindow) return alert('Please allow popups to print the voucher.')

        const imgHtml = receiptData.image && receiptData.image.startsWith('data:image')
            ? `<div style="margin-top: 20px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
                 <div style="font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; text-align: left;">Attached Receipt Proof</div>
                 <img src="${receiptData.image}" style="max-height: 380px; width: 100%; border-radius: 8px; border: 1px solid #cbd5e1; object-fit: contain;" />
               </div>`
            : ''

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Journal Voucher - ${receiptData.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; color: #0f172a; margin: 0; }
                    .voucher-box { border: 2px solid #1e293b; padding: 30px; max-width: 650px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
                    .header h1 { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
                    .header p { margin: 4px 0 0; font-size: 12px; font-weight: 700; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase; }
                    .meta { display: flex; justify-content: space-between; margin-bottom: 24px; font-weight: bold; }
                    .meta-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
                    .meta-val { font-size: 16px; margin-top: 2px; }
                    .parties { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
                    .party-row + .party-row { border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 12px; }
                    .party-name { font-size: 15px; font-weight: 900; text-transform: uppercase; margin-top: 4px; }
                    .amount-row { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 16px; }
                    .amount-val { font-size: 22px; font-weight: 900; }
                    .notes { margin-bottom: 20px; font-size: 13px; font-style: italic; color: #334155; }
                    .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; border-top: 1px solid #cbd5e1; }
                    .sig-block { width: 160px; text-align: center; }
                    .sig-line { border-bottom: 1px solid #94a3b8; margin-bottom: 6px; height: 20px; }
                    .sig-text { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }
                </style>
            </head>
            <body>
                <div class="voucher-box">
                    <div class="header">
                        <h1>TRADING SOFTWARE</h1>
                        <p>Official Journal Voucher</p>
                    </div>
                    <div class="meta">
                        <div><div class="meta-label">Voucher No</div><div class="meta-val">${receiptData.id}</div></div>
                        <div style="text-align: right;"><div class="meta-label">Date</div><div class="meta-val">${receiptData.date}</div></div>
                    </div>
                    <div class="parties">
                        <div class="party-row">
                            <div class="meta-label">Transfer From (Debited)</div>
                            <div class="party-name">${receiptData.sender}</div>
                        </div>
                        <div class="party-row">
                            <div class="meta-label">Transfer To (Credited)</div>
                            <div class="party-name">${receiptData.receiver}</div>
                        </div>
                    </div>
                    <div class="amount-row">
                        <div class="meta-label">Transfer Amount</div>
                        <div class="amount-val">PKR ${receiptData.amount.toLocaleString()}</div>
                    </div>
                    ${receiptData.notes ? `<div><div class="meta-label">Narration / Notes</div><div class="notes">${receiptData.notes}</div></div>` : ''}
                    ${imgHtml}
                    <div class="signatures">
                        <div class="sig-block"><div class="sig-line"></div><div class="sig-text">Authorized By</div></div>
                        <div class="sig-block"><div class="sig-line"></div><div class="sig-text">Received By</div></div>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 300);
                    };
                </script>
            </body>
            </html>
        `)
        printWindow.document.close()
    }

    const payableAccounts = customers.filter((c: any) => {
        const cat = (c.category?.name || c.category || '').toLowerCase();
        return cat.includes('supplier') || cat.includes('payable');
    });
    const payablesList = payableAccounts.length > 0 ? payableAccounts : customers;

    const receivableAccounts = customers.filter((c: any) => {
        const cat = (c.category?.name || c.category || '').toLowerCase();
        return cat.includes('customer') || cat.includes('receivable');
    });
    const receivablesList = receivableAccounts.length > 0 ? receivableAccounts : customers;

    return (
        <div className="space-y-8 relative">
            {/* LARGE FULL-SCREEN IMAGE PREVIEW MODAL */}
            {previewImageModal && (
                <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 md:p-8" onClick={() => setPreviewImageModal(null)}>
                    <div className="bg-white p-5 md:p-6 rounded-3xl max-w-5xl w-full shadow-2xl relative flex flex-col max-h-[94vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <ImageIcon size={20} className="text-indigo-600" />
                                <span className="text-sm font-black uppercase tracking-widest text-slate-800">Receipt Proof Preview</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <a 
                                    href={previewImageModal} 
                                    download="Receipt_Proof.jpg" 
                                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-black transition flex items-center gap-1.5 shadow-sm"
                                >
                                    <Download size={14} /> Download Image
                                </a>
                                <button onClick={() => setPreviewImageModal(null)} className="p-2 bg-slate-100 rounded-xl text-slate-700 hover:bg-red-50 hover:text-red-600 transition">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-auto flex-1 bg-slate-900/5 rounded-2xl p-4 flex items-center justify-center border border-slate-200">
                            <img src={previewImageModal} alt="Receipt Proof" className="w-full h-auto max-h-[78vh] object-contain rounded-lg shadow-md mx-auto" />
                        </div>
                    </div>
                </div>
            )}

            {/* Official Journal Voucher Modal */}
            {receiptData && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto">
                        <div className="p-8 bg-white text-slate-900 border-2 border-slate-800 m-4 relative">
                            <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
                                <h1 className="text-2xl font-black uppercase tracking-widest">TRADING SOFTWARE</h1>
                                <p className="text-xs font-bold text-slate-500 tracking-widest mt-1 uppercase">Official Journal Voucher</p>
                            </div>
                            <div className="flex justify-between items-center mb-6 font-bold">
                                <div><p className="text-[10px] text-slate-500 uppercase tracking-wider">Voucher No</p><p className="text-base">{receiptData.id}</p></div>
                                <div className="text-right"><p className="text-[10px] text-slate-500 uppercase tracking-wider">Date</p><p className="text-base">{receiptData.date}</p></div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 mb-6">
                                <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-black mb-1">Transfer From (Debited)</p><p className="text-sm font-black uppercase text-slate-800">{receiptData.sender}</p></div>
                                <div className="border-t border-slate-200 pt-3"><p className="text-[10px] text-slate-500 uppercase tracking-wider font-black mb-1">Transfer To (Credited)</p><p className="text-sm font-black uppercase text-slate-800">{receiptData.receiver}</p></div>
                            </div>
                            <div className="flex justify-between items-end border-b-2 border-slate-800 pb-2 mb-4">
                                <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-black">Transfer Amount</p></div>
                                <div><p className="text-xl font-black">PKR {receiptData.amount.toLocaleString()}</p></div>
                            </div>
                            {receiptData.notes && (
                                <div className="mb-4"><p className="text-[10px] text-slate-500 uppercase tracking-wider font-black mb-1">Narration / Notes</p><p className="text-xs font-bold italic text-slate-700">{receiptData.notes}</p></div>
                            )}
                            {receiptData.image && receiptData.image.startsWith('data:image') && (
                                <div className="mb-6 pt-3 border-t border-dashed border-slate-200 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-black mb-2 text-left">Attached Receipt Proof (Click image to enlarge)</p>
                                    <img 
                                        src={receiptData.image} 
                                        alt="Receipt Proof" 
                                        onClick={() => setPreviewImageModal(receiptData.image)}
                                        className="max-h-80 w-full rounded-xl border border-slate-300 object-contain mx-auto shadow-sm cursor-zoom-in hover:opacity-95 transition" 
                                    />
                                </div>
                            )}
                            <div className="flex justify-between mt-10 pt-6 border-t border-slate-300">
                                <div className="text-center w-36"><div className="border-b border-slate-400 mb-2"></div><p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Authorized By</p></div>
                                <div className="text-center w-36"><div className="border-b border-slate-400 mb-2"></div><p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Received By</p></div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-100 flex justify-end gap-3 border-t border-slate-200">
                            <button onClick={() => setReceiptData(null)} className="px-5 py-2.5 rounded-xl text-xs font-black uppercase bg-slate-200 hover:bg-slate-300 text-slate-700 transition">Close</button>
                            <button onClick={printReceipt} className="px-5 py-2.5 rounded-xl text-xs font-black uppercase bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-2 shadow-lg"><Printer size={16} /> Print / Save PDF</button>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleTransfer} className={`bg-white p-6 md:p-8 rounded-3xl shadow-xl border ${editingId ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-200'}`}>
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl"><ArrowRightLeft size={22} /></div>
                        <div><h2 className="text-xl font-black uppercase text-slate-900">{editingId ? 'Edit Transfer Entry' : 'New Transfer Entry'}</h2><p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">{editingId ? `Updating Voucher: ${editingId}` : 'Adjust balances between two parties'}</p></div>
                    </div>
                    {editingId && (
                        <button type="button" onClick={cancelEdit} className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 flex items-center gap-1"><X size={14} /> Cancel Edit</button>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200">
                        <label className="text-[10px] font-black uppercase text-orange-800 mb-2 block">Transfer From (Payable / Sender)</label>
                        <select value={fromAccount} onChange={e => setFromAccount(e.target.value)} required className="w-full p-3 bg-white border border-orange-300 rounded-xl font-bold text-slate-900 outline-none focus:border-orange-600 uppercase text-sm">
                            <option value="">Select Account...</option>
                            {payablesList.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                        </select>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                        <label className="text-[10px] font-black uppercase text-emerald-800 mb-2 block">Transfer To (Receivable / Receiver)</label>
                        <select value={toAccount} onChange={e => setToAccount(e.target.value)} required className="w-full p-3 bg-white border border-emerald-300 rounded-xl font-bold text-slate-900 outline-none focus:border-emerald-600 uppercase text-sm">
                            <option value="">Select Account...</option>
                            {receivablesList.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Transfer Amount (PKR)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required min="1" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-900 outline-none focus:border-blue-600" /></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 uppercase text-sm" /></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Notes / Description</label><input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Mutual Adjustment" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 text-sm" /></div>
                </div>

                <div className="mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl"><ImageIcon size={20} /></div>
                        <div>
                            <p className="text-xs font-black uppercase text-slate-800">Attach Receipt Proof (Optional)</p>
                            <p className="text-[10px] font-bold text-slate-500">Upload bank slip, screenshot or payment receipt</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        {receiptImage && (
                            <div className="flex items-center gap-2 bg-white p-1.5 pr-3 rounded-xl border border-slate-200 shadow-sm">
                                <img 
                                    src={receiptImage} 
                                    alt="Preview" 
                                    onClick={() => setPreviewImageModal(receiptImage)}
                                    className="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-zoom-in" 
                                    title="Click to enlarge"
                                />
                                <span className="text-[10px] font-black uppercase text-emerald-600">Attached</span>
                                <button type="button" onClick={() => setReceiptImage('')} className="text-red-500 hover:text-red-700 ml-1" title="Remove Image">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="receipt-upload" />
                        <label htmlFor="receipt-upload" className="cursor-pointer px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-100 transition shadow-sm flex items-center justify-center gap-2">
                            <Upload size={14} /> {receiptImage ? 'Change' : 'Select Image'}
                        </label>
                    </div>
                </div>

                <button type="submit" disabled={isSaving} className={`w-full py-4 text-white rounded-xl font-black uppercase tracking-widest transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-black'}`}>
                    <Save size={18} /> {isSaving ? 'Processing...' : (editingId ? 'Update Transfer' : 'Confirm Ledger Transfer')}
                </button>
            </form>

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3"><div className="p-3 bg-slate-100 text-slate-700 rounded-2xl"><FileText size={22} /></div><div><h2 className="text-xl font-black uppercase text-slate-900">Transfer History</h2></div></div>
                    <button type="button" onClick={handleExportCSV} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase transition bg-slate-900 text-white hover:bg-black shadow-md border border-slate-800"><Download size={16} /> Export CSV</button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex-1 relative"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input type="text" placeholder="Search by party, JV or notes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 bg-white" /></div>
                    <div className="flex gap-3 items-center">
                        <div className="flex items-center gap-2"><Calendar className="text-slate-400" size={18} /><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 bg-white" /></div>
                        <span className="text-slate-400 font-black text-[10px] uppercase">TO</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 bg-white" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200">
                            <tr><th className="p-4">JV Number</th><th className="p-4">Date</th><th className="p-4">From (Sender)</th><th className="p-4">To (Receiver)</th><th className="p-4 text-center">Proof</th><th className="p-4 text-right">Amount</th><th className="p-4 text-right">Action</th></tr>
                        </thead>
                        <tbody className="text-sm font-bold text-slate-700 divide-y divide-slate-100">
                            {filteredTransfers.map((t: any) => (
                                <tr key={t.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 font-mono text-xs uppercase text-blue-600">{t.id}</td>
                                    <td className="p-4 text-xs">{t.date}</td>
                                    <td className="p-4 text-xs font-black uppercase text-orange-700">{t.sender}</td>
                                    <td className="p-4 text-xs font-black uppercase text-emerald-700">{t.receiver}</td>
                                    <td className="p-4 text-center">
                                        {t.image && t.image.startsWith('data:image') ? (
                                            <button 
                                                type="button" 
                                                onClick={() => setPreviewImageModal(t.image)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[10px] font-black uppercase rounded-lg border border-indigo-200 transition shadow-sm"
                                                title="Click to view full-size proof image"
                                            >
                                                <Eye size={13} /> View Proof
                                            </button>
                                        ) : (
                                            <span className="text-slate-400 text-xs">---</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right font-black">PKR {t.amount.toLocaleString()}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleWhatsAppShare(t)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition inline-flex items-center justify-center" title="Share via WhatsApp"><MessageCircle size={16} /></button>
                                            <button onClick={() => setReceiptData(t)} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition inline-flex items-center justify-center" title="Print Voucher"><Printer size={16} /></button>
                                            <button onClick={() => handleEdit(t)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition inline-flex items-center justify-center" title="Edit Transfer"><Edit size={16} /></button>
                                            <button onClick={() => handleReverse(t.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition inline-flex items-center justify-center" title="Delete Transfer"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransfers.length === 0 && (<tr><td colSpan={7} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No ledger transfers found.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}