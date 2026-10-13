'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Trash2 } from 'lucide-react'
import { createInvoice, updateInvoice, getCustomerBalance } from '@/actions/actions'

const getPKTDateString = (dateObj?: Date | string) => {
    const targetDate = dateObj ? new Date(dateObj) : new Date();
    const pkt = new Date(targetDate.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    return `${pkt.getFullYear()}-${String(pkt.getMonth() + 1).padStart(2, '0')}-${String(pkt.getDate()).padStart(2, '0')}`;
};

const formatDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
}

export default function InvoiceForm({ customers, products, initialData }: { customers: any[], products: any[], initialData?: any }) {
  const router = useRouter()
  
  const [custSearch, setCustSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [showCustDropdown, setShowCustDropdown] = useState(false)
  const [prevBalance, setPrevBalance] = useState(0)

  const [invoiceDate, setInvoiceDate] = useState(initialData?.createdAt ? getPKTDateString(initialData.createdAt) : getPKTDateString())

  const [rows, setRows] = useState([{ id: Date.now().toString(), productId: '', search: '', price: '', quantity: 1, total: 0, unit: '' }])
  const [activeRowDrop, setActiveRowDrop] = useState<number | null>(null)
  
  const [discountAmount, setDiscountAmount] = useState<number | ''>('')
  const [paidAmount, setPaidAmount] = useState<number | ''>('')

  const [custHoverIndex, setCustHoverIndex] = useState(0)
  const [prodHoverIndex, setProdHoverIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(custSearch.toLowerCase()) || 
      c.id.toLowerCase().includes(custSearch.toLowerCase())
  )
  
  const filteredProducts = (index: number) => products.filter(p => p.name.toLowerCase().includes(rows[index]?.search.toLowerCase()) || p.id.toLowerCase().includes(rows[index]?.search.toLowerCase()))

  const subTotal = rows.reduce((sum, row) => sum + row.total, 0)
  const numericDiscount = Number(discountAmount) || 0
  const currentTotal = subTotal - numericDiscount 
  const numericPaid = Number(paidAmount) || 0
  const grandTotal = currentTotal + prevBalance
  const remainingBalance = initialData?.isReturn ? (prevBalance - currentTotal) : (grandTotal - numericPaid)

  const handleSave = async () => {
    if (!selectedCustomer) return alert('Please select a customer.')
    const validRows = rows.filter(r => r.productId && Number(r.price) > 0 && Number(r.quantity) > 0)
    if (validRows.length === 0) return alert('Please add at least one valid product.')

    setIsSubmitting(true)

    const todayStr = getPKTDateString();
    const finalTimestamp = invoiceDate === todayStr ? new Date().toISOString() : new Date(`${invoiceDate}T12:00:00+05:00`).toISOString(); 

    const data = { 
        customerId: selectedCustomer.id, 
        invoiceDate: finalTimestamp, 
        totalAmount: currentTotal, 
        discountAmount: numericDiscount, 
        paidAmount: numericPaid, 
        isReturn: false,
        isHold: false, 
        items: validRows.map(r => ({ productId: r.productId, quantity: Number(r.quantity), price: Number(r.price) })) 
    }
    
    try {
        const result = initialData ? await updateInvoice(initialData.id, data) : await createInvoice(data)
        if (result?.id) { 
            if (!initialData) {
                setSelectedCustomer(null); 
                setCustSearch(''); 
                setPrevBalance(0); 
                setDiscountAmount(''); 
                setPaidAmount('');
                setRows([{ id: Date.now().toString(), productId: '', search: '', price: '', quantity: 1, total: 0, unit: '' }]);
                alert('Invoice saved successfully!');
            } else { 
                router.push('/invoices') 
            }
        }
    } catch (error) { 
        alert("Error saving invoice. Please try again.") 
    } finally { 
        setIsSubmitting(false) 
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCustomer, rows, discountAmount, paidAmount, prevBalance, currentTotal]);

  useEffect(() => {
    if (initialData) {
        setSelectedCustomer(initialData.customer); setCustSearch(initialData.customer.name); setPaidAmount(initialData.paidAmount || 0); setDiscountAmount(initialData.discountAmount || 0);
        setRows(initialData.items.map((item: any, idx: number) => ({ id: `edit-${idx}`, productId: item.productId, search: `${item.productId} - ${item.product.name}`, price: item.price.toString(), quantity: item.quantity, total: item.price * item.quantity, unit: item.product?.unit || 'Bags' })))
        getCustomerBalance(initialData.customer.id).then(bal => {
            let invoiceImpact = initialData.isReturn ? -(initialData.totalAmount) : (initialData.totalAmount - (initialData.paidAmount || 0))
            if(initialData.isHold) invoiceImpact = 0; setPrevBalance(bal - invoiceImpact)
        })
    }
  }, [initialData])

  const handleCustKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCustHoverIndex(prev => Math.min(prev + 1, filteredCustomers.length - 1)) } 
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCustHoverIndex(prev => Math.max(prev - 1, 0)) } 
    else if (e.key === 'Enter') { e.preventDefault(); if (showCustDropdown && filteredCustomers.length > 0) handleSelectCustomer(filteredCustomers[custHoverIndex]) }
  }

  const handleProdKeyDown = (e: React.KeyboardEvent, index: number) => {
    const list = filteredProducts(index)
    if (e.key === 'ArrowDown') { e.preventDefault(); setProdHoverIndex(prev => Math.min(prev + 1, list.length - 1)) } 
    else if (e.key === 'ArrowUp') { e.preventDefault(); setProdHoverIndex(prev => Math.max(prev - 1, 0)) } 
    else if (e.key === 'Enter') { e.preventDefault(); if (activeRowDrop === index && list.length > 0) handleSelectProduct(index, list[prodHoverIndex]) }
  }

  const handleInputEnter = (e: React.KeyboardEvent, nextFieldId: string) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(nextFieldId)?.focus() } }
  const handlePriceEnter = (e: React.KeyboardEvent, index: number) => { if (e.key === 'Enter') { e.preventDefault(); addRow(); setTimeout(() => document.getElementById(`search-${index + 1}`)?.focus(), 50) } }

  const handleSelectCustomer = async (cust: any) => {
    setSelectedCustomer(cust); setCustSearch(cust.name); setShowCustDropdown(false); const balance = await getCustomerBalance(cust.id); setPrevBalance(balance); document.getElementById('search-0')?.focus()
  }

  const handleSelectProduct = (index: number, prod: any) => {
    const newRows = [...rows]; 
    newRows[index].productId = prod.id; 
    newRows[index].search = `${prod.id} - ${prod.name}`; 
    newRows[index].price = prod.price ? prod.price.toString() : ''; 
    newRows[index].unit = prod.unit || 'Bags'; 
    newRows[index].total = (Number(newRows[index].price) || 0) * (Number(newRows[index].quantity) || 0); 
    setRows(newRows); 
    setActiveRowDrop(null); 
    document.getElementById(`qty-${index}`)?.focus()
  }

  const updateRowDetails = (index: number, field: string, value: string | number) => {
    const newRows = [...rows] as any; newRows[index][field] = value; newRows[index].total = (Number(newRows[index].price) || 0) * (Number(newRows[index].quantity) || 0); setRows(newRows)
  }

  const addRow = () => setRows([...rows, { id: Date.now().toString(), productId: '', search: '', price: '', quantity: 1, total: 0, unit: '' }])
  const removeRow = (index: number) => { if (rows.length > 1) setRows(rows.filter((_, i) => i !== index)) }

  return (
    <div className="bg-white p-4 md:p-8 rounded-2xl shadow-xl border border-slate-200 relative w-full">
      
      <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
          @font-face { font-family: 'Jameel Noori Nastaleeq'; src: local('Jameel Noori Nastaleeq'), local('Jameel Noori Nastaleeq Regular'); }
          
          .urdu-font { font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif !important; line-height: 2 !important; }

          .safari-date-killer::-webkit-datetime-edit { color: transparent !important; }
          .safari-date-killer::-webkit-datetime-edit-fields-wrapper { color: transparent !important; }
          .safari-date-killer::-webkit-datetime-edit-text { color: transparent !important; }
          input[type="date"]::-webkit-calendar-picker-indicator {
              position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;
          }
      `}</style>

      {(showCustDropdown || activeRowDrop !== null) && <div className="fixed inset-0 z-30" onClick={() => { setShowCustDropdown(false); setActiveRowDrop(null); }} />}

      <div className="flex flex-col lg:flex-row gap-4 mb-8 relative z-40 w-full">
        
        <div className="relative w-full lg:w-1/2">
            <label className="text-xs font-black uppercase text-slate-800 mb-2 block">Search Customer</label>
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={custSearch} placeholder="Type name or ID..." dir="ltr" className="urdu-font text-left w-full pl-10 p-3 bg-white border-2 border-slate-300 rounded-xl font-black text-slate-900 outline-none focus:border-blue-600 transition" onChange={(e) => { setCustSearch(e.target.value); setShowCustDropdown(true); setSelectedCustomer(null); setPrevBalance(0); setCustHoverIndex(0) }} onFocus={(e) => { setShowCustDropdown(true); e.target.select() }} onKeyDown={handleCustKeyDown} />
            </div>
            {showCustDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-200 shadow-2xl rounded-xl max-h-60 overflow-y-auto z-50 p-2">
                    {filteredCustomers.map((c, idx) => (
                        <div key={c.id} onClick={() => handleSelectCustomer(c)} onMouseEnter={() => setCustHoverIndex(idx)} className={`p-3 rounded-lg cursor-pointer text-slate-900 flex justify-between items-center ${custHoverIndex === idx ? 'bg-blue-100' : 'hover:bg-blue-50'}`}>
                            <p className="font-black uppercase urdu-font text-left" dir="ltr">{c.name}</p><p className="text-xs text-slate-500 font-bold">{c.phone} | ID: {c.id}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="flex flex-col md:flex-row w-full lg:w-1/2 gap-4">
            <div className="w-full md:w-1/2">
                <label className="text-xs font-black uppercase text-slate-800 mb-2 block">Invoice Date</label>
                
                <div className="relative w-full h-[52px] group">
                    <div className="absolute inset-0 bg-white border-2 border-slate-300 rounded-xl flex items-center px-3 font-black text-slate-900 group-hover:border-blue-600 transition-colors z-10 pointer-events-none">
                        {formatDDMMYYYY(invoiceDate)}
                    </div>
                    <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="safari-date-killer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 text-transparent bg-transparent" style={{ color: 'transparent' }} />
                </div>

            </div>
            <div className="w-full md:w-1/2 bg-slate-50 p-3 rounded-xl flex flex-col justify-center items-center md:items-end border-2 border-slate-200 mt-4 md:mt-0">
                <span className="text-[10px] font-black uppercase text-slate-500 mb-1">Previous Balance</span>
                <span className={`text-2xl font-black leading-none ${prevBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>PKR {prevBalance.toLocaleString()}</span>
            </div>
        </div>

      </div>

      <div className="space-y-4 relative z-30 w-full">
        <div className="hidden md:grid grid-cols-12 gap-4 px-2 text-[10px] font-black uppercase text-slate-500 w-full">
          <div className="col-span-1 text-center">Sr.</div>
          <div className="col-span-5">Search Product</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-2 text-right">Total</div>
        </div>

        {rows.map((row, i) => (
          <div key={row.id} className="w-full flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center bg-slate-50 p-4 md:p-3 rounded-xl border-2 border-slate-200 relative">
            
            <div className="hidden md:block col-span-1 text-center font-black text-slate-400 text-sm">{i + 1}</div>
            
            <div className="w-full md:col-span-5 relative">
              <label className="md:hidden text-[10px] font-black uppercase text-slate-500 mb-1 block">Product</label>
              
              <div className="relative w-full">
                  <input id={`search-${i}`} type="text" placeholder="Search..." value={row.search} dir="ltr" className="urdu-font text-left w-full p-3 md:p-2 pr-16 bg-white border border-slate-300 rounded-lg font-black text-slate-900 outline-none focus:border-blue-500 uppercase transition-all" onChange={(e) => { updateRowDetails(i, 'search', e.target.value); updateRowDetails(i, 'productId', ''); setActiveRowDrop(i); setProdHoverIndex(0) }} onFocus={(e) => { setActiveRowDrop(i); e.target.select() }} onKeyDown={(e) => handleProdKeyDown(e, i)} />
                  {row.unit && row.productId && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-slate-100 text-slate-500 font-black uppercase px-2 py-1 rounded border border-slate-200 pointer-events-none font-sans">
                          {row.unit}
                      </span>
                  )}
              </div>

              {activeRowDrop === i && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border-2 border-slate-300 shadow-2xl rounded-lg max-h-48 overflow-y-auto z-[9999] p-1">
                      {filteredProducts(i).map((p, idx) => (
                          <div key={p.id} onClick={() => handleSelectProduct(i, p)} onMouseEnter={() => setProdHoverIndex(idx)} className={`p-3 md:p-2 cursor-pointer rounded text-slate-900 flex justify-between items-center ${prodHoverIndex === idx ? 'bg-blue-100' : 'hover:bg-slate-100'}`}>
                              <p className="font-black text-sm uppercase urdu-font text-left" dir="ltr">{p.id} - {p.name}</p>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 rounded uppercase font-sans">{p.unit || 'Bags'}</span>
                          </div>
                      ))}
                  </div>
              )}
            </div>
            
            <div className="flex gap-4 w-full md:contents">
                <div className="flex-1 md:col-span-2">
                  <label className="md:hidden text-[10px] font-black uppercase text-slate-500 mb-1 block">Qty</label>
                  <input id={`qty-${i}`} type="number" step="any" className="w-full p-3 md:p-2 bg-white border border-slate-300 rounded-lg text-center font-black text-slate-900 outline-none focus:border-blue-500" value={row.quantity} onChange={(e) => updateRowDetails(i, 'quantity', e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={(e) => handleInputEnter(e, `price-${i}`)} />
                </div>
                <div className="flex-1 md:col-span-2">
                    <label className="md:hidden text-[10px] font-black uppercase text-slate-500 mb-1 block">Price</label>
                    <input id={`price-${i}`} type="number" step="any" placeholder="0" className="w-full p-3 md:p-2 bg-white border border-slate-300 rounded-lg text-right font-black text-slate-900 outline-none focus:border-blue-500" value={row.price} onChange={(e) => updateRowDetails(i, 'price', e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={(e) => handlePriceEnter(e, i)} />
                </div>
            </div>
            
            <div className="w-full md:col-span-2 flex justify-between md:justify-end items-center gap-3 text-right font-black text-lg pt-3 md:pt-0 mt-2 md:mt-0 border-t border-slate-200 md:border-0 text-slate-900">
                <span className="md:hidden text-sm uppercase text-slate-500">Row Total:</span>
                <div className="flex items-center gap-3 w-full justify-end">
                    <span>{row.total.toLocaleString()}</span>
                    {rows.length > 1 && (
                        <button type="button" onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 p-2 rounded bg-red-50 transition" title="Delete Row"><Trash2 size={16} /></button>
                    )}
                </div>
            </div>
          </div>
        ))}
      </div>
      
      <button type="button" onClick={addRow} className="mt-4 w-full md:w-auto px-4 py-3 md:py-2 bg-slate-900 text-white rounded-lg font-black text-xs uppercase hover:bg-black transition">+ Add Row</button>

      <div className="mt-10 border-t-2 border-slate-200 pt-8 space-y-4 md:max-w-md md:ml-auto w-full">
        <div className="flex justify-between text-slate-600 font-bold">
            <span>Subtotal:</span> 
            <span className="text-slate-900">{subTotal.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center bg-orange-50 p-2 md:p-3 rounded-xl border border-orange-200">
            <span className="font-black text-orange-900 uppercase text-xs md:text-sm pl-2">Discount:</span>
            <input type="number" step="any" placeholder="0" className="w-32 md:w-40 p-2 bg-white border-2 border-orange-300 rounded-lg text-right font-black text-slate-900 outline-none focus:border-orange-600 placeholder:text-orange-300" 
                value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value === '' ? '' : Number(e.target.value))} onFocus={(e) => e.target.select()}
            />
        </div>

        <div className="flex justify-between text-slate-900 font-black text-lg border-b-2 border-slate-100 pb-4">
            <span>Net Invoice Total:</span> 
            <span>{currentTotal.toLocaleString()}</span>
        </div>

        <div className="flex justify-between text-slate-600 font-bold pt-2">
            <span>Previous Balance:</span> 
            <span className="text-slate-900">{prevBalance.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center bg-blue-50 p-2 md:p-3 rounded-xl border border-blue-200">
            <span className="font-black text-blue-900 uppercase text-xs md:text-sm pl-2">Paid Amount:</span>
            <input type="number" step="any" placeholder="0" className="w-32 md:w-40 p-2 bg-white border-2 border-blue-300 rounded-lg text-right font-black text-slate-900 outline-none focus:border-blue-600 placeholder:text-blue-300" 
                value={paidAmount} onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))} onFocus={(e) => e.target.select()}
            />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-t-2 border-slate-900 pt-4 mt-2 gap-2">
            <span className="text-sm font-black uppercase text-slate-600">Remaining Balance:</span> 
            <span className="text-3xl md:text-4xl font-black text-slate-900 leading-none">PKR {remainingBalance.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mt-10 pb-10 w-full">
          <button onClick={() => handleSave()} type="button" disabled={isSubmitting} style={{ backgroundColor: '#2563eb', color: 'white' }} className="w-full py-5 rounded-xl font-black text-sm md:text-lg uppercase tracking-widest shadow-xl hover:opacity-90 transition active:scale-95 flex flex-col items-center justify-center disabled:opacity-50">
            <span>{isSubmitting ? 'Saving...' : (initialData ? 'Update Invoice' : 'Generate Invoice')}</span>
            <span className="text-[10px] opacity-75 mt-1 font-bold">Shortcut: CTRL + S</span>
          </button>
      </div>
    </div>
  )
}