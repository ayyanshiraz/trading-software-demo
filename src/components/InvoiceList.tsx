'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Printer, Trash2, Edit, Search, Zap, Save, MessageCircle, XCircle, Send, PlayCircle, Eye } from 'lucide-react'
import { deleteInvoice, bulkUpdatePayments, bulkMakeActive, getWhatsAppLedgerHistory } from '@/actions/actions'

export default function InvoiceList({ invoices, categories, isHoldView = false }: { invoices: any[], categories: any[], isHoldView?: boolean }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [recoveryMode, setRecoveryMode] = useState(false)
  
  const [draftPayments, setDraftPayments] = useState<Record<string, number>>({})
  const [draftDiscounts, setDraftDiscounts] = useState<Record<string, number>>({})

  const [waQueue, setWaQueue] = useState<any[]>([])
  const [waIndex, setWaIndex] = useState(0)

  const formatDDMMYYYY = (dateStr: string) => {
      if (!dateStr) return 'DD/MM/YYYY';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
  }

  const setPreset = (days: number) => {
    const end = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    const start = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    start.setDate(end.getDate() - days);

    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

    setFromDate(startStr);
    setToDate(endStr);
  }

  const filteredInvoices = invoices.filter(inv => {
    let match = true
    if (search) {
      const q = search.toLowerCase()
      match = match && (
          inv.id.toLowerCase().includes(q) || 
          inv.customer.name.toLowerCase().includes(q) || 
          inv.customer.id.toLowerCase().includes(q) || 
          (inv.customer.phone && inv.customer.phone.includes(q))
      )
    }
    if (category) match = match && (inv.customer.category === category)
    if (fromDate) match = match && (new Date(inv.createdAt) >= new Date(fromDate))
    if (toDate) match = match && (new Date(inv.createdAt) <= new Date(toDate + 'T23:59:59'))
    return match
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const handleSelectAll = (e: any) => {
    if (e.target.checked) setSelectedIds(filteredInvoices.map(i => i.id))
    else setSelectedIds([])
  }

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id))
    else setSelectedIds([...selectedIds, id])
  }

  const handleIndividualWhatsApp = async (inv: any) => {
    if (!inv.customer.phone || inv.customer.phone.trim() === '') {
        alert(`Customer ${inv.customer.name} does not have a valid phone number saved.`);
        return;
    }

    const waWindow = window.open('about:blank', '_blank');
    
    if (!waWindow) {
        alert("Your browser blocked the popup! Please allow popups for this site in your address bar.");
        return;
    }

    waWindow.document.write("<h2 style='font-family: sans-serif; padding: 20px; color: #334155;'>Loading Ledger Math... Please wait.</h2>");

    let phone = inv.customer.phone.replace(/\D/g, ''); 
    if (phone.startsWith('0')) { phone = '92' + phone.substring(1); } 
    else if (phone.length === 10 && !phone.startsWith('92')) { phone = '92' + phone; }

    try {
        const allCustInvoices = await getWhatsAppLedgerHistory(inv.customerId);
        const sortedInvs = allCustInvoices.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        let runningBal = Number(inv.customer.openingBalance || 0);
        let previous = runningBal;
        let closing = runningBal;

        for (const i of sortedInvs) {
            let impact = 0;
            if (i.isReturn) {
                impact = -Number(i.totalAmount);
            } else if (Number(i.totalAmount) === 0) {
                impact = -(Number(i.paidAmount || 0) + Number(i.discountAmount || 0));
            } else {
                impact = Number(i.totalAmount) - Number(i.paidAmount || 0);
            }

            if (i.id === inv.id) {
                previous = runningBal;
                closing = runningBal + impact;
                break;
            }
            runningBal += impact;
        }

        const invoiceTotal = Number(inv.totalAmount);
        const paid = Number(inv.paidAmount || 0);

        const displayId = /^\d+$/.test(inv.id) ? inv.id : inv.id.slice(-6).toUpperCase();

        let itemsText = inv.items.length > 0 
            ? inv.items.map((item: any) => `- ${item.quantity}x ${item.product?.name || 'Item'} @ ${item.price} = ${(item.quantity * item.price).toLocaleString()}`).join('\n')
            : "No items";

        const docType = inv.isReturn ? '*RETURN INVOICE*' : (isHoldView ? '*QUOTATION*' : '*SALES INVOICE*');

        const text = `*TRADING SOFTWARE*\n` +
                     `${docType} #: ${displayId}\n` +
                     `Date: ${new Date(inv.createdAt).toLocaleDateString('en-GB')}\n` +
                     `------------------------\n` +
                     `*Items:*\n${itemsText}\n` +
                     `------------------------\n` +
                     `Net Total: PKR ${invoiceTotal.toLocaleString()}\n` +
                     `Paid: PKR ${paid.toLocaleString()}\n` +
                     `------------------------\n` +
                     `Previous Balance: PKR ${previous.toLocaleString()}\n` +
                     `*Closing Balance: PKR ${closing.toLocaleString()}*`;

        const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
        waWindow.location.href = url;

    } catch (error) {
        waWindow.close();
        alert("An error occurred while calculating the ledger math.");
    }
  }
  
  const handleBulkWhatsApp = () => {
    const selected = filteredInvoices.filter(i => selectedIds.includes(i.id));
    const validInvoices = selected.filter(i => i.customer.phone && i.customer.phone.trim() !== '');
    if (validInvoices.length === 0) return alert("None of the selected customers have phone numbers saved.");
    if (validInvoices.length < selected.length) alert(`${selected.length - validInvoices.length} invoices were skipped because they lack phone numbers.`);
    setWaQueue(validInvoices); setWaIndex(0); setSelectedIds([]); 
  }

  const sendNextInQueue = () => {
    handleIndividualWhatsApp(waQueue[waIndex]);
    if (waIndex + 1 < waQueue.length) setWaIndex(waIndex + 1);
    else setWaQueue([]); 
  }

  const handleBulkPrint = () => {
    if (selectedIds.length === 0) return;
    const idsString = selectedIds.join(',');
    window.open(`/print/bulk?ids=${idsString}`, '_blank');
  }

  const handleBulkActive = async () => { if(confirm(`Convert ${selectedIds.length} quotations to active invoices?`)) { await bulkMakeActive(selectedIds); setSelectedIds([]) } }
  
  const handleSaveRecovery = async () => {
    const updates = filteredInvoices.filter(i => !i.isReturn).map(inv => ({
        id: inv.id,
        paidAmount: draftPayments[inv.id] !== undefined ? draftPayments[inv.id] : (inv.paidAmount || 0),
        discountAmount: draftDiscounts[inv.id] !== undefined ? draftDiscounts[inv.id] : (inv.discountAmount || 0)
    }))

    if (updates.length > 0) { 
        await bulkUpdatePayments(updates); 
        alert('All records updated successfully!');
    }
    setRecoveryMode(false); 
    setDraftPayments({});
    setDraftDiscounts({});
  }

  return (
    <div className="bg-white p-4 md:p-8 rounded-2xl shadow-xl border border-slate-200">
      
      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
          
          @font-face {
              font-family: 'Jameel Noori Nastaleeq';
              src: local('Jameel Noori Nastaleeq'), local('JameelNooriNastaleeq'), local('Jameel Noori Nastaleeq Regular');
          }

          .urdu-font { 
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif !important; 
              line-height: 2 !important;
          }

          .safari-date-killer::-webkit-datetime-edit { color: transparent !important; }
          .safari-date-killer::-webkit-datetime-edit-fields-wrapper { color: transparent !important; }
          .safari-date-killer::-webkit-datetime-edit-text { color: transparent !important; }
          input[type="date"]::-webkit-calendar-picker-indicator {
              position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;
          }
      `}</style>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase">{isHoldView ? 'Quotations (Hold)' : 'All Invoices'} <span className="text-sm text-slate-400 bg-slate-100 px-3 py-1 rounded-full ml-2">{filteredInvoices.length} Found</span></h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto bg-slate-50 p-2 rounded-xl border border-slate-200">
          
          <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden shrink-0">
              <button onClick={() => setPreset(0)} className="px-3 py-2.5 hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest transition border-r border-slate-200">Daily</button>
              <button onClick={() => setPreset(7)} className="px-3 py-2.5 hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest transition border-r border-slate-200">Weekly</button>
              <button onClick={() => setPreset(30)} className="px-3 py-2.5 hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest transition">Monthly</button>
          </div>

          <div className="relative flex-1 md:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search name or ID..." value={search} onChange={e => setSearch(e.target.value)} dir="ltr" className="urdu-font text-left w-full md:w-48 pl-8 p-2.5 text-xs font-bold text-slate-900 outline-none bg-white rounded-lg border border-slate-200 focus:border-blue-500" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} dir="ltr" className="urdu-font text-left p-2.5 text-xs font-bold text-slate-900 outline-none bg-white rounded-lg border border-slate-200 flex-1 md:flex-none">
              <option value="">All Categories</option>
              {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          
          <div className="relative w-32 h-[36px] shrink-0 group">
              <div className={`absolute inset-0 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold pointer-events-none tracking-widest z-10 group-hover:border-blue-500 transition-colors ${!fromDate ? 'text-slate-400' : 'text-slate-900'}`}>
                  {formatDDMMYYYY(fromDate)}
              </div>
              <input type="date" value={fromDate || ''} onChange={(e) => setFromDate(e.target.value)} className="safari-date-killer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0" />
          </div>

          <span className="text-slate-400 font-bold">-</span>

          <div className="relative w-32 h-[36px] shrink-0 group">
              <div className={`absolute inset-0 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold pointer-events-none tracking-widest z-10 group-hover:border-blue-500 transition-colors ${!toDate ? 'text-slate-400' : 'text-slate-900'}`}>
                  {formatDDMMYYYY(toDate)}
              </div>
              <input type="date" value={toDate || ''} onChange={(e) => setToDate(e.target.value)} className="safari-date-killer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0" />
          </div>

          <button onClick={() => { setSearch(''); setCategory(''); setFromDate(''); setToDate(''); setSelectedIds([]) }} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition text-xs font-bold uppercase">Clear</button>
        </div>
      </div>

      {waQueue.length > 0 && (
          <div className="bg-green-100 border-2 border-green-500 text-green-900 p-4 rounded-xl mb-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg animate-fade-in">
              <div>
                  <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                      <MessageCircle size={18} /> WhatsApp Sending Queue ({waIndex + 1} of {waQueue.length})
                  </h3>
                  <p className="text-xs font-bold mt-1">Ready to send to: <span className="uppercase font-black text-green-700 bg-white px-2 py-0.5 rounded urdu-font">{waQueue[waIndex].customer.name}</span></p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={sendNextInQueue} className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-black uppercase tracking-widest hover:bg-green-700 transition shadow"><Send size={16} /> Send & Next</button>
                  <button onClick={() => setWaQueue([])} className="flex items-center justify-center gap-2 bg-white text-green-700 px-4 py-3 rounded-lg font-black uppercase hover:bg-green-50 transition border border-green-300"><XCircle size={16} /> Cancel</button>
              </div>
          </div>
      )}

      <div className="flex justify-between items-center mb-4 min-h-[48px]">
          <div className="flex gap-3">
              {!selectedIds.length && waQueue.length === 0 && !isHoldView && (
                <button onClick={() => { setRecoveryMode(!recoveryMode); setDraftPayments({}); setDraftDiscounts({}); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition ${recoveryMode ? 'bg-slate-900 text-white shadow-lg' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}>
                    <Zap size={14} /> {recoveryMode ? 'Cancel Recovery' : 'Payment Recovery Mode'}
                </button>
              )}

              {recoveryMode && !selectedIds.length && (
                  <button onClick={handleSaveRecovery} style={{ backgroundColor: '#059669', color: 'white' }} className="flex items-center gap-2 px-6 py-2 rounded-xl font-black uppercase tracking-widest text-xs hover:opacity-80 transition shadow-lg animate-fade-in">
                      <Save size={14} /> Save Entries
                  </button>
              )}
          </div>

          {selectedIds.length > 0 && !recoveryMode && (
              <div className="bg-blue-600 text-white p-2 md:p-3 rounded-xl flex justify-between items-center w-full animate-fade-in shadow-lg">
                  <span className="font-black text-xs md:text-sm uppercase tracking-widest pl-2">{selectedIds.length} Selected</span>
                  <div className="flex gap-3">
                      <button onClick={handleBulkWhatsApp} className="flex items-center gap-2 bg-green-500 text-white border border-green-400 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-black uppercase hover:bg-green-600 transition"><MessageCircle size={14}/> WhatsApp</button>
                      <button onClick={handleBulkPrint} className="flex items-center gap-2 bg-indigo-500 text-white border border-indigo-400 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-black uppercase hover:bg-indigo-600 transition"><Printer size={14}/> Bulk Print</button>
                      {isHoldView && (
                          <button onClick={handleBulkActive} className="flex items-center gap-2 bg-white text-orange-600 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-black uppercase hover:bg-orange-50 transition"><PlayCircle size={14}/> Make Active</button>
                      )}
                  </div>
              </div>
          )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left border-collapse">
          <thead className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-200">
            <tr>
              <th className="p-4 w-10 text-center"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0} disabled={recoveryMode || waQueue.length > 0} className="w-4 h-4 cursor-pointer accent-blue-600 disabled:opacity-50"/></th>
              <th className="p-4">Invoice #</th>
              <th className="p-4">Date & Time</th>
              <th className="p-4">Customer</th>
              <th className="p-4 text-center">Category</th>
              <th className="p-4 text-right">Net Total</th>
              <th className={`p-4 text-right ${recoveryMode ? 'text-orange-700 bg-orange-100 border-b-4 border-orange-400' : ''}`}>{recoveryMode ? 'EDIT DISCOUNT' : 'Discount'}</th>
              <th className={`p-4 text-right ${recoveryMode ? 'text-emerald-700 bg-emerald-100 border-b-4 border-emerald-400' : ''}`}>{recoveryMode ? 'ENTER PAID' : 'Paid'}</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm font-bold text-slate-700 divide-y divide-slate-100">
            {filteredInvoices.map((inv, index) => (
              <tr key={inv.id} className={`transition ${inv.isReturn ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}>
                <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => handleSelect(inv.id)} disabled={recoveryMode || waQueue.length > 0} className="w-4 h-4 cursor-pointer accent-blue-600 disabled:opacity-50"/></td>
                <td className="p-4 font-mono text-xs">
                    {/^\d+$/.test(inv.id) ? inv.id : inv.id.slice(-6).toUpperCase()} 
                    {inv.isReturn && <span className="ml-2 bg-red-200 text-red-800 px-2 py-0.5 rounded text-[9px]">RETURN</span>}
                    {isHoldView && <span className="ml-2 bg-orange-200 text-orange-800 px-2 py-0.5 rounded font-black text-[9px]">QUOTATION</span>}
                </td>
                <td className="p-4 text-xs text-slate-500">{new Date(inv.createdAt).toLocaleDateString('en-GB', {timeZone: 'Asia/Karachi'})} <br/>{new Date(inv.createdAt).toLocaleTimeString('en-US', {timeZone: 'Asia/Karachi'})}</td>
                <td className="p-4 uppercase text-slate-900">
                    <div className="font-black urdu-font text-left" dir="ltr">{inv.customer.name}</div>
                    <div className="text-[9px] text-slate-400 font-mono lowercase mt-0.5 font-sans">ID: {inv.customer.id}</div>
                </td>
                <td className="p-4 text-xs text-center urdu-font" dir="ltr">{inv.customer.category || '---'}</td>
                <td className={`p-4 text-right font-black ${inv.isReturn ? 'text-red-600' : 'text-blue-700'}`}>PKR {inv.totalAmount.toLocaleString()}</td>
                
                <td className={`p-4 text-right ${recoveryMode && !inv.isReturn ? 'bg-orange-50' : ''}`}>
                    {recoveryMode && !inv.isReturn ? (
                        <input 
                            id={`discount-input-${index}`}
                            type="number"
                            className="w-20 p-2 text-right border-2 border-orange-300 rounded-lg font-black text-slate-900 outline-none focus:border-orange-600 bg-white shadow-sm"
                            value={draftDiscounts[inv.id] !== undefined ? draftDiscounts[inv.id] : (inv.discountAmount || 0)}
                            onChange={(e) => setDraftDiscounts({...draftDiscounts, [inv.id]: Number(e.target.value)})}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    document.getElementById(`payment-input-${index}`)?.focus(); 
                                }
                            }}
                        />
                    ) : (
                        <span className="text-orange-500 font-black">{inv.discountAmount > 0 ? `PKR ${inv.discountAmount.toLocaleString()}` : '---'}</span>
                    )}
                </td>
                
                <td className={`p-4 text-right ${recoveryMode && !inv.isReturn ? 'bg-emerald-50' : ''}`}>
                    {recoveryMode && !inv.isReturn ? (
                        <input 
                            id={`payment-input-${index}`}
                            type="number"
                            className="w-24 p-2 text-right border-2 border-emerald-300 rounded-lg font-black text-slate-900 outline-none focus:border-emerald-600 bg-white shadow-sm"
                            value={draftPayments[inv.id] !== undefined ? draftPayments[inv.id] : (inv.paidAmount || 0)}
                            onChange={(e) => setDraftPayments({...draftPayments, [inv.id]: Number(e.target.value)})}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const nextField = document.getElementById(`discount-input-${index + 1}`);
                                    if (nextField) nextField.focus(); 
                                    else handleSaveRecovery(); 
                                }
                            }}
                        />
                    ) : (
                        <span className="text-emerald-600 font-black">{inv.isReturn || isHoldView ? '---' : `PKR ${(inv.paidAmount || 0).toLocaleString()}`}</span>
                    )}
                </td>

                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleIndividualWhatsApp(inv)} className="p-2 bg-green-50 text-green-600 rounded hover:bg-green-100 transition" title="Send WhatsApp"><MessageCircle size={16} /></button>
                    <Link href={`/print/${inv.id}`} target="_blank" className="p-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition" title="View Invoice"><Eye size={16} /></Link>
                    <Link href={`/print/${inv.id}`} target="_blank" className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition" title="Print Invoice"><Printer size={16} /></Link>
                    <Link href={`/invoice/edit/${inv.id}`} className="p-2 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 transition" title="Edit Invoice"><Edit size={16} /></Link>
                    
                    <form 
                        action={deleteInvoice.bind(null, inv.id)} 
                        onSubmit={(e) => {
                            if (!confirm('Are you sure you wish to permanently delete this invoice?')) {
                                e.preventDefault();
                            }
                        }}
                    >
                        <button type="submit" className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition" title="Delete Invoice"><Trash2 size={16} /></button>
                    </form>

                  </div>
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && <tr><td colSpan={9} className="py-12 text-center text-slate-400">No records found matching filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}