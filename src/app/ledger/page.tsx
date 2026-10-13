import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import { TrendingUp, DollarSign, ArrowLeftRight, Search, FileText, CornerDownLeft, HandCoins, Users, Tags, Package, ListTree, UsersRound, Boxes } from 'lucide-react'
import { getLedgerReportData } from '@/actions/actions'
import PrintButton from '@/components/PrintButton'
import CustomerHistorySearch from '@/components/CustomerHistorySearch'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

const formatPKTDate = (dateObj: Date | string) => {
    if (!dateObj) return '---';
    return new Date(dateObj).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ from?: string, to?: string, view?: string, search?: string, category?: string, customerId?: string }> }) {
  const params = await searchParams
  
  const from = params.from ? new Date(`${params.from}T00:00:00+05:00`) : undefined
  const to = params.to ? new Date(`${params.to}T23:59:59.999+05:00`) : undefined
  
  const view = params.view || 'customers' 
  const searchQuery = params.search?.toLowerCase() || ''
  const catQuery = params.category || ''
  const histCustomerId = params.customerId || ''

  const data = await getLedgerReportData(from, to)

  const pktNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  const today = `${pktNow.getFullYear()}-${String(pktNow.getMonth() + 1).padStart(2, '0')}-${String(pktNow.getDate()).padStart(2, '0')}`;
  
  const curr = new Date(pktNow);
  const firstDayOfWeek = new Date(curr.setDate(curr.getDate() - curr.getDay())).toISOString().split('T')[0];
  const firstDayOfMonth = new Date(pktNow.getFullYear(), pktNow.getMonth(), 1).toISOString().split('T')[0];

  const naturalSort = (a: any, b: any) => {
      const valA = String(a?.id || a?.category || a?.name || '');
      const valB = String(b?.id || b?.category || b?.name || '');
      return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
  };

  // AMENDMENT: Check if current view is Product-based or Customer-based for the dropdown
  const isProductView = view === 'products' || view === 'product_categories' || view === 'inventory_list';
  const isCustomerView = view === 'customers' || view === 'customer_list' || view === 'categories';

  let displayAllCustomers = data.allCustomers || []
  if (catQuery && isCustomerView) displayAllCustomers = displayAllCustomers.filter((c: any) => (c.category || '') === catQuery)
  if (searchQuery) displayAllCustomers = displayAllCustomers.filter((c: any) => (c.name || '').toLowerCase().includes(searchQuery) || String(c.id || '').toLowerCase().includes(searchQuery))
  displayAllCustomers.sort(naturalSort)

  let displayCustomers = data.customerLedgers || []
  if (catQuery && isCustomerView) displayCustomers = displayCustomers.filter((c: any) => (c.category || '') === catQuery)
  if (searchQuery) displayCustomers = displayCustomers.filter((c: any) => (c.name || '').toLowerCase().includes(searchQuery) || String(c.id || '').toLowerCase().includes(searchQuery))
  displayCustomers.sort(naturalSort)

  let displayCategories = data.categoryLedgers || []
  if (catQuery && isCustomerView) displayCategories = displayCategories.filter((c: any) => (c.category || '') === catQuery)
  if (searchQuery) displayCategories = displayCategories.filter((c: any) => (c.category || '').toLowerCase().includes(searchQuery))
  displayCategories.sort(naturalSort)

  let displayProducts = data.productSales || []
  if (catQuery && isProductView) displayProducts = displayProducts.filter((p: any) => (p.category || '') === catQuery)
  if (searchQuery) displayProducts = displayProducts.filter((p: any) => (p.name || '').toLowerCase().includes(searchQuery) || (p.category || '').toLowerCase().includes(searchQuery))
  displayProducts.sort(naturalSort)

  let displayProductCategories = data.productCategoryLedgers || []
  if (catQuery && isProductView) displayProductCategories = displayProductCategories.filter((c: any) => (c.category || '') === catQuery)
  if (searchQuery) displayProductCategories = displayProductCategories.filter((c: any) => (c.category || '').toLowerCase().includes(searchQuery))
  displayProductCategories.sort(naturalSort)

  // AMENDMENT: Inventory List mapped perfectly
  let displayInventory = data.allProducts || []
  if (catQuery && isProductView) displayInventory = displayInventory.filter((p: any) => (p.category || '') === catQuery)
  if (searchQuery) displayInventory = displayInventory.filter((p: any) => (p.name || '').toLowerCase().includes(searchQuery) || String(p.id || '').toLowerCase().includes(searchQuery))
  displayInventory.sort(naturalSort)

  let historyCustomer = null;
  let historyRows: any[] = [];
  let periodOpeningBal = 0;
  let periodDebit = 0;
  let periodCredit = 0;
  
  if (view === 'customer_history' && histCustomerId) {
      historyCustomer = data.allCustomers.find((c:any) => String(c.id) === String(histCustomerId));
      if (historyCustomer) {
          const cInvoices = await prisma.invoice.findMany({
              where: { customerId: historyCustomer.id, isHold: false },
              orderBy: { createdAt: 'asc' }
          });
          
          let runningBal = Number(historyCustomer.openingBalance || 0);
          periodOpeningBal = runningBal;
          
          cInvoices.forEach(inv => {
              let debit = 0; let credit = 0; let desc = '';
              if (inv.isReturn) { credit = inv.totalAmount; desc = 'Return / Credit Note'; } 
              else if (inv.totalAmount === 0 && (inv.paidAmount > 0 || inv.discountAmount > 0)) { 
                  credit = inv.paidAmount + (inv.discountAmount || 0); 
                  desc = `Cash Received (Voucher) ${inv.discountAmount > 0 ? ` + Disc` : ''}`; 
              } 
              else { debit = inv.totalAmount; credit = inv.paidAmount; desc = `Sale Invoice`; }

              const invDate = new Date(new Date(inv.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));

              if (from && invDate < from) {
                  periodOpeningBal = periodOpeningBal + debit - credit;
                  runningBal = periodOpeningBal;
              } 
              else if (to && invDate > to) { } 
              else {
                  periodDebit += debit;
                  periodCredit += credit;
                  runningBal = runningBal + debit - credit;
                  historyRows.push({ id: inv.id, date: inv.createdAt, desc, debit, credit, runningBal, notes: (inv as any).notes || '' })
              }
          })
      }
  }

  const navItems = [
      { id: 'customers', label: 'Customer Ledger', icon: Users },
      { id: 'customer_history', label: 'Customer History', icon: FileText },
      { id: 'categories', label: 'Customer Categories', icon: Tags },
      { id: 'products', label: 'Product Sales', icon: Package },
      { id: 'product_categories', label: 'Product Categories', icon: ListTree },
      { id: 'inventory_list', label: 'T. Product List', icon: Boxes },
      { id: 'customer_list', label: 'T. Customer List', icon: UsersRound },
  ]

  return (
    <div className="min-h-screen bg-slate-50 lg:ml-64 p-4 pt-20 lg:p-8 print:m-0 print:p-0 print:bg-white print:overflow-visible">
      <div className="max-w-[1400px] mx-auto print:max-w-full">
        
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

          .urdu-text, [dir="auto"], [dir="rtl"] { 
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', sans-serif !important; 
              line-height: 2.2 !important;
          }

          @media print {
              @page { size: A4 portrait; margin: 8mm; }
              body { background-color: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body * { visibility: hidden; }
              
              #print-area, #print-area * { visibility: visible; }
              #print-area { 
                  position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0 !important; 
                  border: none !important; box-shadow: none !important; overflow: visible !important;
              }
              
              .no-print { display: none !important; }
              
              table { width: 100% !important; border-collapse: collapse; table-layout: auto !important; min-width: 0 !important; }
              th, td { border: 1px solid #000 !important; padding: 4px 6px !important; color: #000 !important; font-size: 11px !important; word-wrap: break-word !important; white-space: normal !important; }
              th { background-color: #e5e7eb !important; font-size: 12px !important; }
              .overflow-x-auto { overflow: visible !important; }
              .min-w-[800px], .min-w-[700px] { min-width: 0 !important; width: 100% !important; }
          }
        `}</style>

        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-6 gap-4 no-print">
          <div><h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Ledger Reports</h1><p className="text-slate-500 font-bold text-sm">Financial Summaries & Analytics</p></div>
          <form className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-200 w-full xl:w-auto">
              <input type="hidden" name="view" value={view} />
              <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full lg:w-auto">
                  <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 shadow-inner w-full sm:w-auto justify-between">
                      <Link href={`/ledger?view=${view}&from=${today}&to=${today}`} className="px-3 py-1.5 text-[10px] font-black uppercase rounded hover:bg-white hover:shadow-sm transition text-slate-600">Daily</Link>
                      <Link href={`/ledger?view=${view}&from=${firstDayOfWeek}&to=${today}`} className="px-3 py-1.5 text-[10px] font-black uppercase rounded hover:bg-white hover:shadow-sm transition text-slate-600 border-l border-r border-slate-200">Weekly</Link>
                      <Link href={`/ledger?view=${view}&from=${firstDayOfMonth}&to=${today}`} className="px-3 py-1.5 text-[10px] font-black uppercase rounded hover:bg-white hover:shadow-sm transition text-slate-600">Monthly</Link>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input type="date" name="from" defaultValue={params.from} className="text-sm font-bold uppercase text-slate-900 outline-none cursor-pointer bg-slate-50 p-2 rounded border border-slate-200 w-full sm:w-auto" />
                      <span className="text-slate-400 font-bold">-</span>
                      <input type="date" name="to" defaultValue={params.to} className="text-sm font-bold uppercase text-slate-900 outline-none cursor-pointer bg-slate-50 p-2 rounded border border-slate-200 w-full sm:w-auto" />
                  </div>
              </div>
              <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-40">
                      <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" name="search" defaultValue={searchQuery} placeholder="Search..." className="urdu-font pl-7 p-2 w-full text-sm font-bold text-slate-900 outline-none bg-slate-50 rounded border border-slate-200" dir="ltr" />
                  </div>
                  
                  {/* AMENDMENT: Dropdown automatically switches to Product Categories when in Product views */}
                  {(isProductView || isCustomerView) && (
                      <select name="category" defaultValue={catQuery} className="urdu-font p-2 flex-1 sm:w-32 text-sm font-bold text-slate-900 outline-none bg-slate-50 rounded border border-slate-200" dir="ltr">
                          <option value="">All Cats</option>
                          {isProductView 
                              ? data.productCategoryLedgers?.map((c: any) => <option key={c.category} value={c.category}>{c.category}</option>)
                              : data.categoryLedgers?.map((c: any) => <option key={c.category} value={c.category}>{c.category}</option>)
                          }
                      </select>
                  )}
                  <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      <button type="submit" className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-black transition text-sm font-bold uppercase tracking-widest">Filter</button>
                      <Link href={`/ledger?view=${view}`} className="flex-1 text-center bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition text-sm font-bold uppercase tracking-widest">Clear</Link>
                  </div>
              </div>
          </form>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 print-container">
            <div className="w-full lg:w-64 shrink-0 no-print">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sticky top-24">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-3 mb-3">Report Menus</h3>
                    <div className="flex flex-col gap-1">
                        {navItems.map((item) => {
                            const Icon = item.icon; const isActive = view === item.id;
                            return (
                                <Link key={item.id} href={`/ledger?from=${params.from || ''}&to=${params.to || ''}&view=${item.id}`} className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all ${isActive ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}><Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />{item.label}</Link>
                            )
                        })}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 px-2"><PrintButton /></div>
                </div>
            </div>

            <div id="print-area" className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm print:shadow-none print:border-none print:rounded-none min-h-[600px] overflow-hidden print:overflow-visible relative">
                <div className="p-6 md:p-8 print:p-0">
                    <div className="text-center mb-6 border-b-2 border-slate-800 pb-6">
                        <h1 className="text-3xl font-black uppercase text-black tracking-widest font-serif mb-1">Trading Software</h1>
                        <h2 className="text-lg font-bold text-slate-800 mb-1 urdu-font" dir="auto">
                            {/* AMENDMENT: Dynamic Print Header Titles reflecting Category Filter */}
                            {view === 'customers' ? (catQuery ? `${catQuery} Ledger Summary` : 'Customer Ledger Summary') : 
                             view === 'customer_history' ? (historyCustomer ? `Account Statement: ${historyCustomer.id} - ${historyCustomer.name}` : 'Customer Account History') : 
                             view === 'categories' ? (catQuery ? `${catQuery} Detailed Ledger` : 'Category Ledger Summary') : 
                             view === 'product_categories' ? (catQuery ? `${catQuery} Product Categories` : 'Product Category Summary') : 
                             view === 'inventory_list' ? (catQuery ? `${catQuery} Product List` : 'Active Product List') : 
                             view === 'customer_list' ? 'Active Customer List' : 
                             (catQuery ? `${catQuery} Sales Summary` : 'Product Sales Summary')}
                        </h2>
                        <p className="text-sm font-bold text-slate-500 uppercase">Period: {from ? formatPKTDate(from) : 'Beginning of Time'} - {to ? formatPKTDate(to) : 'Present'}</p>
                    </div>

                    <div className="w-full overflow-x-auto print:overflow-visible relative print-container">
                        
                        {/* =========================================
                            CUSTOMER HISTORY
                        ========================================== */}
                        {view === 'customer_history' && (
                            <div className="space-y-6">
                                <div className="no-print relative z-50 mb-8 max-w-xl mx-auto">
                                    <CustomerHistorySearch customers={displayAllCustomers} currentFrom={params.from} currentTo={params.to} />
                                </div>
                                {histCustomerId && historyCustomer ? (
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 print:border-none print:p-0">
                                            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm print:shadow-none print:border-black"><p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1 print:text-black">Period Opening</p><p className="text-xl font-black text-slate-900 leading-none print:text-black">PKR {(periodOpeningBal || 0).toLocaleString()}</p></div>
                                            <div className="p-3 bg-white rounded-lg border border-blue-200 shadow-sm print:shadow-none print:border-black"><p className="text-xs font-black uppercase text-blue-500 tracking-widest mb-1 print:text-black">Period Debit (+)</p><p className="text-xl font-black text-blue-700 leading-none print:text-black">{(periodDebit || 0).toLocaleString()}</p></div>
                                            <div className="p-3 bg-white rounded-lg border border-emerald-200 shadow-sm print:shadow-none print:border-black"><p className="text-xs font-black uppercase text-emerald-500 tracking-widest mb-1 print:text-black">Period Credit (-)</p><p className="text-xl font-black text-emerald-600 leading-none print:text-black">{(periodCredit || 0).toLocaleString()}</p></div>
                                            <div className="p-3 bg-slate-900 rounded-lg shadow-sm text-white flex flex-col justify-center print:text-black print:bg-white print:border print:border-black print:shadow-none"><p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1 print:text-black">Closing Balance</p><p className="text-2xl font-black leading-none">PKR {((periodOpeningBal || 0) + (periodDebit || 0) - (periodCredit || 0)).toLocaleString()}</p></div>
                                        </div>
                                        <table className="w-full min-w-[800px] print:min-w-0 text-left border-collapse border border-slate-300 relative z-0">
                                            <thead className="bg-slate-100 text-slate-800 text-xs font-black uppercase tracking-widest border-b-2 border-slate-300">
                                                <tr><th className="p-3 print:p-2 border border-slate-300">Date</th><th className="p-3 print:p-2 border border-slate-300">Description</th><th className="p-3 print:p-2 border border-slate-300 text-right">Debit (+)</th><th className="p-3 print:p-2 border border-slate-300 text-right">Credit (-)</th><th className="p-3 print:p-2 border border-slate-300 text-right font-black text-blue-900 print:text-black">Running Bal</th></tr>
                                            </thead>
                                            <tbody className="text-sm print:text-[11px] font-bold text-slate-700 print:text-black">
                                                <tr className="bg-slate-100 border-b-2 border-slate-300 print:bg-gray-200"><td className="p-3 print:p-2 border border-slate-300 text-slate-400 print:text-black">---</td><td className="p-3 print:p-2 border border-slate-300 uppercase text-slate-900 font-black tracking-widest print:text-black">Opening Balance {from ? '(Period Start)' : ''}</td><td className="p-3 print:p-2 border border-slate-300 text-right text-slate-400 print:text-black">---</td><td className="p-3 print:p-2 border border-slate-300 text-right text-slate-400 print:text-black">---</td><td className="p-3 print:p-2 border border-slate-300 text-right font-black text-lg print:text-sm text-slate-900 print:text-black">{(periodOpeningBal || 0).toLocaleString()}</td></tr>
                                                {historyRows.map((r: any) => (
                                                    <tr key={r.id} className="hover:bg-slate-50 transition">
                                                        <td className="p-3 print:p-2 border border-slate-300 whitespace-nowrap">{formatPKTDate(r.date)}</td>
                                                        <td className="p-3 print:p-2 border border-slate-300 uppercase flex flex-col gap-1 print:whitespace-normal urdu-font" dir="auto">
                                                            <div className="flex items-center gap-1 font-sans">
                                                                {r.desc.includes('Sale') && <FileText size={14} className="text-blue-500 no-print" />}
                                                                {r.desc.includes('Return') && <CornerDownLeft size={14} className="text-red-500 no-print" />}
                                                                {r.desc.includes('Cash') && <HandCoins size={14} className="text-emerald-500 no-print" />}
                                                                <Link href={`/print/${r.id}`} className="hover:text-blue-600 transition print:text-black" target="_blank">{r.desc}</Link>
                                                            </div>
                                                            {r.notes && <div className="text-xs print:text-[10px] text-slate-600 print:text-black italic urdu-font" dir="auto">{r.notes}</div>}
                                                        </td>
                                                        <td className="p-3 print:p-2 border border-slate-300 text-right text-blue-700 print:text-black">{(r.debit || 0) > 0 ? (r.debit || 0).toLocaleString() : '-'}</td>
                                                        <td className="p-3 print:p-2 border border-slate-300 text-right text-emerald-600 print:text-black">{(r.credit || 0) > 0 ? (r.credit || 0).toLocaleString() : '-'}</td>
                                                        <td className="p-3 print:p-2 border border-slate-300 text-right font-black text-slate-900 text-base print:text-xs print:text-black">{(r.runningBal || 0).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                {historyRows.length === 0 && (<tr><td colSpan={5} className="p-10 print:p-6 text-center text-slate-400 font-bold uppercase tracking-widest text-lg">No transactions recorded in this period.</td></tr>)}
                                            </tbody>
                                        </table>
                                    </>
                                ) : (<div className="text-center py-10 opacity-30 no-print"><Search size={64} className="mx-auto mb-4" /><p className="font-black uppercase tracking-widest text-2xl">Awaiting Selection</p></div>)}
                            </div>
                        )}

                        {/* =========================================
                            CUSTOMER LEDGER (ALL)
                        ========================================== */}
                        {view === 'customers' && (
                            <table className="w-full min-w-[800px] print:min-w-0 text-left border-collapse border border-slate-300">
                            <thead className="bg-slate-100 text-slate-800 text-xs font-black uppercase tracking-widest border-b-2 border-slate-300">
                                <tr><th className="p-3 print:p-2 border border-slate-300 w-12 print:w-auto text-center">Sr.</th><th className="p-3 print:p-2 border border-slate-300">Customer Details</th><th className="p-3 print:p-2 border border-slate-300 text-right whitespace-nowrap print:whitespace-normal">Opening Bal</th><th className="p-3 print:p-2 border border-slate-300 text-right whitespace-nowrap print:whitespace-normal">Invoiced</th><th className="p-3 print:p-2 border border-slate-300 text-right whitespace-nowrap print:whitespace-normal text-red-600 print:text-black">Returns</th><th className="p-3 print:p-2 border border-slate-300 text-right whitespace-nowrap print:whitespace-normal">Paid Amount</th><th className="p-3 print:p-2 border border-slate-300 text-right whitespace-nowrap print:whitespace-normal">Closing Bal</th></tr>
                            </thead>
                            <tbody className="text-sm print:text-[11px] font-bold text-slate-700 print:text-black">
                                {displayCustomers.map((c: any, index: number) => {
                                    const cPhone = displayAllCustomers.find((x:any) => x.id === c.id)?.phone || '---';
                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50 transition">
                                            <td className="p-3 print:p-2 border border-slate-300 text-center text-slate-400 print:text-black">{index + 1}</td>
                                            <td className="p-3 print:p-2 border border-slate-300 uppercase whitespace-nowrap print:whitespace-normal text-slate-900 print:text-black">
                                                <div className="font-black text-base urdu-font text-left" dir="ltr">{c.id} - {c.name}</div>
                                                <div className="text-xs print:text-[10px] text-slate-500 tracking-widest mt-0.5 font-sans">{cPhone}</div>
                                            </td>
                                            <td className="p-3 print:p-2 border border-slate-300 text-right print:text-black">{(c.openingBalance || 0).toLocaleString()}</td>
                                            <td className="p-3 print:p-2 border border-slate-300 text-right text-blue-700 print:text-black">{(c.invoicedAmount || 0).toLocaleString()}</td>
                                            <td className="p-3 print:p-2 border border-slate-300 text-right text-red-600 print:text-black">{((c.returnedAmount || c.returnAmount) || 0).toLocaleString()}</td>
                                            <td className="p-3 print:p-2 border border-slate-300 text-right text-emerald-700 print:text-black">{(c.paidAmount || 0).toLocaleString()}</td>
                                            <td className="p-3 print:p-2 border border-slate-300 text-right font-black text-slate-900 print:text-black">{(c.closingBalance || 0).toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-slate-100 border-t-2 border-slate-400 font-black text-slate-900 text-sm print:text-xs print:text-black print:bg-gray-200"><td colSpan={2} className="p-3 print:p-2 border border-slate-300 text-right uppercase">Filtered Total:</td><td className="p-3 print:p-2 border border-slate-300 text-right print:text-black">{displayCustomers.reduce((s: number, c: any) => s + (c.openingBalance || 0), 0).toLocaleString()}</td><td className="p-3 print:p-2 border border-slate-300 text-right text-blue-700 print:text-black">{displayCustomers.reduce((s: number, c: any) => s + (c.invoicedAmount || 0), 0).toLocaleString()}</td><td className="p-3 print:p-2 border border-slate-300 text-right text-red-600 print:text-black">{displayCustomers.reduce((s: number, c: any) => s + ((c.returnedAmount || c.returnAmount) || 0), 0).toLocaleString()}</td><td className="p-3 print:p-2 border border-slate-300 text-right text-emerald-600 print:text-black">{displayCustomers.reduce((s: number, c: any) => s + (c.paidAmount || 0), 0).toLocaleString()}</td><td className="p-3 print:p-2 border border-slate-300 text-right text-base print:text-xs print:text-black">{displayCustomers.reduce((s: number, c: any) => s + (c.closingBalance || 0), 0).toLocaleString()}</td></tr>
                            </tbody>
                            </table>
                        )}

                        {/* =========================================
                            CUSTOMER CATEGORIES
                        ========================================== */}
                        {view === 'categories' && (
                            <table className="w-full text-left border-collapse border border-slate-300">
                            <thead className="bg-slate-100 text-slate-800 text-xs font-black uppercase tracking-widest border-b-2 border-slate-300">
                                <tr>
                                  <th className="p-3 print:p-2 border border-slate-300">Customer Category & Details</th>
                                  <th className="p-3 print:p-2 border border-slate-300 text-right whitespace-nowrap print:whitespace-normal">Opening Bal</th>
                                  <th className="p-3 print:p-2 border border-slate-300 text-right whitespace-nowrap print:whitespace-normal">Invoiced</th>
                                  <th className="p-3 print:p-2 border border-slate-300 text-right whitespace-nowrap print:whitespace-normal">Paid Amount</th>
                                  <th className="p-3 print:p-2 border border-slate-300 text-right whitespace-nowrap print:whitespace-normal">Closing Bal</th>
                                </tr>
                            </thead>
                            {displayCategories.map((cat: any) => (
                                <tbody key={cat.category} className="text-sm print:text-[11px] font-bold text-slate-700 print:text-black border-b-4 border-slate-400 print:border-black">
                                    <tr className="bg-slate-200 text-slate-900 transition print:bg-gray-200"><td className="p-3 print:p-2 border border-slate-300 uppercase whitespace-nowrap print:whitespace-normal tracking-widest text-base print:text-sm font-black text-blue-900 border-l-4 border-l-blue-600 print:text-black print:border-l-0 urdu-font" dir="ltr">{cat.category} (Total)</td><td className="p-3 print:p-2 border border-slate-300 text-right print:text-black">{(cat.openingBalance || 0).toLocaleString()}</td><td className="p-3 print:p-2 border border-slate-300 text-right text-blue-800 print:text-black">{(cat.invoicedAmount || 0).toLocaleString()}</td><td className="p-3 print:p-2 border border-slate-300 text-right text-emerald-700 print:text-black">{(cat.paidAmount || 0).toLocaleString()}</td><td className="p-3 print:p-2 border border-slate-300 text-right font-black text-xl print:text-sm print:text-black">{(cat.closingBalance || 0).toLocaleString()}</td></tr>
                                    {displayCustomers.filter((c: any) => c.category === cat.category).map((c: any) => {
                                        const cPhone = displayAllCustomers.find((x:any) => x.id === c.id)?.phone || '---';
                                        return (
                                            <tr key={c.id} className="hover:bg-slate-50 transition bg-white">
                                                <td className="p-3 print:p-2 border border-slate-300 uppercase whitespace-nowrap print:whitespace-normal text-slate-600 pl-6 border-l-4 border-l-transparent print:pl-2 print:text-black">
                                                    <div className="flex flex-col ml-2">
                                                        <span className="text-slate-900 print:text-black font-black urdu-font text-left" dir="ltr">↳ {c.id} - {c.name}</span>
                                                        <span className="text-xs print:text-[10px] text-slate-500 tracking-widest ml-4 font-sans">{cPhone}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 print:p-2 border border-slate-300 text-right print:text-black">{(c.openingBalance || 0).toLocaleString()}</td>
                                                <td className="p-3 print:p-2 border border-slate-300 text-right text-blue-600 print:text-black">{(c.invoicedAmount || 0).toLocaleString()}</td>
                                                <td className="p-3 print:p-2 border border-slate-300 text-right text-emerald-600 print:text-black">{(c.paidAmount || 0).toLocaleString()}</td>
                                                <td className="p-3 print:p-2 border border-slate-300 text-right font-black print:text-black">{(c.closingBalance || 0).toLocaleString()}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            ))}
                            <tfoot className="bg-slate-900 text-white font-black text-sm print:bg-white print:text-black print:text-xs">
                                <tr>
                                    <td className="p-3 print:p-2 border border-slate-700 text-right uppercase tracking-widest print:border-black">Grand Market Total:</td>
                                    <td className="p-3 print:p-2 border border-slate-700 text-right print:border-black">{displayCategories.reduce((s: number, c: any) => s + (c.openingBalance || 0), 0).toLocaleString()}</td>
                                    <td className="p-3 print:p-2 border border-slate-700 text-right text-blue-300 print:text-black print:border-black">{displayCategories.reduce((s: number, c: any) => s + (c.invoicedAmount || 0), 0).toLocaleString()}</td>
                                    <td className="p-3 print:p-2 border border-slate-700 text-right text-emerald-400 print:text-black print:border-black">{displayCategories.reduce((s: number, c: any) => s + (c.paidAmount || 0), 0).toLocaleString()}</td>
                                    <td className="p-3 print:p-2 border border-slate-700 text-right text-base print:text-xs print:text-black print:border-black">{displayCategories.reduce((s: number, c: any) => s + (c.closingBalance || 0), 0).toLocaleString()}</td>
                                </tr>
                            </tfoot>
                            </table>
                        )}

                        {/* =========================================
                            PRODUCT SALES
                        ========================================== */}
                        {view === 'products' && (
                            <table className="w-full text-left border-collapse border border-slate-300">
                            <thead className="bg-slate-100 text-slate-800 text-xs font-black uppercase tracking-widest border-b-2 border-slate-300">
                                <tr><th className="p-3 print:p-2 border border-slate-300 w-12 print:w-auto text-center">Sr.</th><th className="p-3 print:p-2 border border-slate-300 whitespace-nowrap print:whitespace-normal">Product Name</th><th className="p-3 print:p-2 border border-slate-300 whitespace-nowrap print:whitespace-normal">Category</th><th className="p-3 print:p-2 border border-slate-300 text-center whitespace-nowrap print:whitespace-normal">Qty Sold</th><th className="p-3 print:p-2 border border-slate-300 text-right whitespace-nowrap print:whitespace-normal">Gross Revenue</th><th className="p-3 print:p-2 border border-slate-300 text-right whitespace-nowrap print:whitespace-normal">Generated Profit</th></tr>
                            </thead>
                            <tbody className="text-sm print:text-[11px] font-bold text-slate-700 print:text-black">
                                {displayProducts.map((p: any, index: number) => (
                                    <tr key={index} className="hover:bg-slate-50 transition">
                                        <td className="p-3 print:p-2 border border-slate-300 text-center text-slate-400 print:text-black">{index + 1}</td>
                                        <td className="p-3 print:p-2 border border-slate-300 uppercase whitespace-nowrap print:whitespace-normal text-slate-900 print:text-black urdu-font text-left" dir="ltr">{p.id} - {p.name}</td>
                                        <td className="p-3 print:p-2 border border-slate-300 whitespace-nowrap print:whitespace-normal print:text-black urdu-font text-left" dir="ltr">{p.category}</td>
                                        <td className="p-3 print:p-2 border border-slate-300 text-center font-black text-slate-900 print:text-black">{(p.qty || 0).toLocaleString()} <span className="text-[10px] print:text-[9px] text-slate-500 font-bold uppercase ml-1 print:text-black">{p.unit || 'Bags'}</span></td>
                                        <td className="p-3 print:p-2 border border-slate-300 text-right text-blue-700 print:text-black">{(p.revenue || 0).toLocaleString()}</td>
                                        <td className="p-3 print:p-2 border border-slate-300 text-right text-emerald-600 font-black print:text-black">{((p.revenue || 0) - (p.cost || 0)).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        )}

                        {/* =========================================
                            PRODUCT CATEGORIES
                        ========================================== */}
                        {view === 'product_categories' && (
                            <table className="w-full text-left border-collapse border border-slate-300">
                            <thead className="bg-slate-100 text-slate-800 text-xs font-black uppercase tracking-widest border-b-2 border-slate-300">
                                <tr><th className="p-3 print:p-2 border border-slate-300">Product Category & Details</th><th className="p-3 print:p-2 border border-slate-300 text-center whitespace-nowrap print:whitespace-normal">Qty Sold</th><th className="p-3 print:p-2 border border-slate-300 text-right whitespace-nowrap print:whitespace-normal">Revenue</th><th className="p-3 print:p-2 border border-slate-300 text-right whitespace-nowrap print:whitespace-normal">Cost</th><th className="p-3 print:p-2 border border-slate-300 text-right font-black whitespace-nowrap print:whitespace-normal">Profit</th></tr>
                            </thead>
                            {displayProductCategories?.map((cat: any) => (
                                <tbody key={cat.category} className="text-sm print:text-[11px] font-bold text-slate-700 print:text-black border-b-4 border-slate-400 print:border-black">
                                    <tr className="bg-slate-200 text-slate-900 transition print:bg-gray-200"><td className="p-3 print:p-2 border border-slate-300 uppercase whitespace-nowrap print:whitespace-normal tracking-widest text-base print:text-sm font-black text-blue-900 border-l-4 border-l-blue-600 print:text-black print:border-l-0 urdu-font text-left" dir="ltr">{cat.category} (Total)</td><td className="p-3 print:p-2 border border-slate-300 text-center text-blue-900 font-black print:text-black">{(cat.totalQty || 0).toLocaleString()}</td><td className="p-3 print:p-2 border border-slate-300 text-right text-blue-900 font-black print:text-black">{(cat.totalRevenue || 0).toLocaleString()}</td><td className="p-3 print:p-2 border border-slate-300 text-right text-orange-700 font-black print:text-black">{(cat.totalCost || 0).toLocaleString()}</td><td className="p-3 print:p-2 border border-slate-300 text-right font-black text-emerald-700 text-xl print:text-sm print:text-black">{(cat.totalProfit || 0).toLocaleString()}</td></tr>
                                    {cat.products.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition bg-white">
                                            <td className="p-3 print:p-2 border border-slate-300 uppercase whitespace-nowrap print:whitespace-normal text-slate-600 pl-6 border-l-4 border-l-transparent print:pl-2 print:text-black urdu-font text-left" dir="ltr">↳ <span className="ml-2 text-slate-900 print:text-black">{p.id} - {p.name}</span></td>
                                            <td className="p-3 print:p-2 border border-slate-300 text-center text-slate-700 font-bold print:text-black">{(p.qty || 0).toLocaleString()} <span className="text-[10px] print:text-[9px] text-slate-400 font-black uppercase ml-1 print:text-black">{p.unit || 'Bags'}</span></td>
                                            <td className="p-3 print:p-2 border border-slate-300 text-right text-blue-600 print:text-black">{(p.revenue || 0).toLocaleString()}</td>
                                            <td className="p-3 print:p-2 border border-slate-300 text-right text-orange-500 print:text-black">{(p.cost || 0).toLocaleString()}</td>
                                            <td className="p-3 print:p-2 border border-slate-300 text-right font-black text-emerald-600 print:text-black">{(p.profit || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            ))}
                            <tfoot className="bg-slate-900 text-white font-black text-sm print:text-xs print:bg-white print:text-black">
                                <tr>
                                    <td className="p-3 print:p-2 border border-slate-700 text-right uppercase tracking-widest print:border-black">Grand Market Total:</td>
                                    <td className="p-3 print:p-2 border border-slate-700 text-center print:border-black">{(displayProductCategories?.reduce((s:number,c:any)=>s+(c.totalQty||0),0) || 0).toLocaleString()}</td>
                                    <td className="p-3 print:p-2 border border-slate-700 text-right text-blue-300 print:text-black print:border-black">{(displayProductCategories?.reduce((s:number,c:any)=>s+(c.totalRevenue||0),0) || 0).toLocaleString()}</td>
                                    <td className="p-3 print:p-2 border border-slate-700 text-right text-orange-400 print:text-black print:border-black">{(displayProductCategories?.reduce((s:number,c:any)=>s+(c.totalCost||0),0) || 0).toLocaleString()}</td>
                                    <td className="p-3 print:p-2 border border-slate-700 text-right text-emerald-400 text-base print:text-xs print:text-black print:border-black">{(displayProductCategories?.reduce((s:number,c:any)=>s+(c.totalProfit||0),0) || 0).toLocaleString()}</td>
                                </tr>
                            </tfoot>
                            </table>
                        )}

                        {/* =========================================
                            INVENTORY LIST
                        ========================================== */}
                        {view === 'inventory_list' && (
                            <table className="w-full text-left border-collapse border border-slate-300">
                            <thead className="bg-slate-100 text-slate-800 text-xs font-black uppercase tracking-widest border-b-2 border-slate-300">
                                <tr><th className="p-3 print:p-2 border border-slate-300 w-12 print:w-auto text-center">Sr.</th><th className="p-3 print:p-2 border border-slate-300">Product Name</th><th className="p-3 print:p-2 border border-slate-300">Category</th><th className="p-3 print:p-2 border border-slate-300 text-right">Cost Price</th><th className="p-3 print:p-2 border border-slate-300 text-right">Selling Price</th></tr>
                            </thead>
                            <tbody className="text-sm print:text-[11px] font-bold text-slate-700 print:text-black">
                                {displayInventory.map((p: any, index: number) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition">
                                        <td className="p-3 print:p-2 border border-slate-300 text-center text-slate-400 print:text-black">{index + 1}</td>
                                        <td className="p-3 print:p-2 border border-slate-300 uppercase text-slate-900 print:text-black urdu-font text-left" dir="ltr">{p.id} - {p.name} <span className="text-[10px] print:text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded ml-2 print:bg-white print:text-black print:border print:border-slate-300 font-sans">{p.unit || 'Bags'}</span></td>
                                        <td className="p-3 print:p-2 border border-slate-300 print:text-black urdu-font text-left" dir="ltr">{p.category}</td>
                                        <td className="p-3 print:p-2 border border-slate-300 text-right text-red-600 print:text-black">PKR {(p.cost || 0).toLocaleString()}</td>
                                        <td className="p-3 print:p-2 border border-slate-300 text-right text-emerald-600 font-black print:text-black">PKR {(p.price || 0).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        )}

                        {/* =========================================
                            CUSTOMER LIST
                        ========================================== */}
                        {view === 'customer_list' && (
                            <table className="w-full text-left border-collapse border border-slate-300">
                            <thead className="bg-slate-100 text-slate-800 text-xs font-black uppercase tracking-widest border-b-2 border-slate-300">
                                <tr><th className="p-3 print:p-2 border border-slate-300 w-12 print:w-auto text-center">Sr.</th><th className="p-3 print:p-2 border border-slate-300">Customer ID & Name</th><th className="p-3 print:p-2 border border-slate-300">Phone</th><th className="p-3 print:p-2 border border-slate-300">Address</th></tr>
                            </thead>
                            <tbody className="text-sm print:text-[11px] font-bold text-slate-700 print:text-black">
                                {displayAllCustomers.map((c: any, index: number) => (
                                <tr key={c.id} className="hover:bg-slate-50 transition">
                                    <td className="p-3 print:p-2 border border-slate-300 text-center text-slate-400 print:text-black">{index + 1}</td>
                                    <td className="p-3 print:p-2 border border-slate-300 uppercase text-slate-900 font-black print:text-black urdu-font text-left" dir="ltr">{c.id} - {c.name}</td>
                                    <td className="p-3 print:p-2 border border-slate-300 text-blue-700 print:text-black font-sans">{c.phone || '---'}</td>
                                    <td className="p-3 print:p-2 border border-slate-300 italic text-slate-500 print:text-black urdu-font text-left" dir="ltr">{c.address || 'N/A'}</td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        )}

                    </div>
                    <div className="mt-8 text-xs font-bold text-slate-400 text-center uppercase tracking-widest no-print border-t border-slate-100 pt-4">
                        End of Report. Click "Print Report" on the left menu to export PDF.
                    </div>
                </div>
            </div>
            
        </div>
      </div>
    </div>
  )
}