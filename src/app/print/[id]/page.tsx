import { PrismaClient } from '@prisma/client'
import PrintPageButton from '@/components/PrintPageButton'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

function getUserDisplayDetails(user: any) {
    const userStr = JSON.stringify(user || {}).toLowerCase();
    if (userStr.includes('admin3') || userStr.includes('subhani') || userStr.includes('mahmood subhani')) return { name: 'MAHMOOD SUBHANI', phone: '0300-4216125' };
    if (userStr.includes('admin2') || userStr.includes('abdullah') || userStr.includes('abdullah mahmood')) return { name: 'ABDULLAH MAHMOOD', phone: '0306-4216125' };
    return { name: 'ADMIN', phone: '0321-4030049' };
}

function formatProductDisplay(fullName: string = '') {
    const match = fullName.match(/^(.*?)\s*\[(.*)\]$/);
    if (!match) return { title: fullName, specs: [] };
    const title = match[1].trim();
    const specs = match[2].split('|').map(s => s.trim()).filter(Boolean);
    return { title, specs };
}

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const { id } = resolvedParams

  const { verifySession } = await import('@/lib/session')
  const session = await verifySession()

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.userId },
    include: { customer: true, user: true, items: { include: { product: true } } }
  })

  if (!invoice) return <div className="p-10 text-center font-bold">Invoice not found or unauthorized.</div>

  const prevInvoices = await prisma.invoice.findMany({
      where: { customerId: invoice.customerId, userId: session.userId, isHold: false, createdAt: { lt: invoice.createdAt } }
  })

  let prevBalance = invoice.customer.openingBalance || 0;
  prevInvoices.forEach((inv: any) => {
      if (inv.isReturn) {
          prevBalance -= inv.totalAmount;
      } else if (inv.totalAmount === 0) {
          prevBalance -= ((inv.paidAmount || 0) + (inv.discountAmount || 0));
      } else {
          prevBalance += (inv.totalAmount - (inv.paidAmount || 0));
      }
  })

  const subtotal = invoice.items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0);
  const netTotal = invoice.totalAmount;
  const payment = invoice.paidAmount || 0;
  
  const currentImpact = invoice.isReturn ? -netTotal : netTotal;
  const totalPayable = prevBalance + currentImpact;
  const closingBalance = totalPayable - payment;

  const MIN_ROWS = 3; 
  const emptyRowsCount = Math.max(0, MIN_ROWS - invoice.items.length);
  const emptyRows = Array.from({ length: emptyRowsCount });

  const repDetails = getUserDisplayDetails(invoice.user);
  const displayDate = new Date(invoice.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi', day: '2-digit', month: '2-digit', year: 'numeric' });
  const displayId = /^\d+$/.test(invoice.id) ? invoice.id : invoice.id.slice(-6).toUpperCase();

  return (
    <div className="bg-slate-200 min-h-screen py-10 block print:bg-white print:p-0 print:m-0">
        <style>{`
          @media print {
              @page { size: 148mm 210mm; margin: 5mm !important; }
              body, html { margin: 0 !important; padding: 0 !important; background: white !important; display: block !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print, aside, nav, header, [class*="fixed"] { display: none !important; }
              
              .invoice-page { 
                  width: 148mm !important; 
                  margin: 0 auto !important; 
                  padding: 4mm !important; 
                  box-sizing: border-box !important;
                  border: none !important; 
                  box-shadow: none !important;
                  display: block !important;
                  page-break-inside: avoid !important;
              }
          }
        `}</style>

        <div className="no-print bg-white w-full max-w-[148mm] p-4 flex justify-between items-center shadow mb-6 rounded-xl border border-slate-200 mx-auto">
            <h1 className="font-black text-sm text-slate-800 uppercase tracking-wide">Print Preview</h1>
            <PrintPageButton title="Print A5 Receipt" />
        </div>

        <div className="w-full block print:w-full print:max-w-none print:m-0 print:p-0">
            <div className="invoice-page bg-white w-[148mm] mx-auto p-[6mm] shadow-2xl text-slate-900 font-sans block rounded-sm print:rounded-none">
                
                {/* HEADER */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-lg tracking-tighter shrink-0">
                            TS
                        </div>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">Hijab Ul Eman</h1>
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 mt-1">Abayas, Islamic Wear &amp; Accessories</p>
                            <p className="text-[10px] font-bold text-slate-800 mt-0.5">Rep: {repDetails.name} ({repDetails.phone})</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="inline-block bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded">
                            {invoice.isReturn ? 'Return Credit Note' : 'Sales Invoice'}
                        </span>
                        <p className="text-sm font-black text-slate-900 mt-1">INV #{displayId}</p>
                        <p className="text-[10px] font-bold text-slate-600">Date: {displayDate}</p>
                    </div>
                </div>

                {/* BILL TO CARD */}
                <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5 mb-3 flex justify-between items-start">
                    <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Billed To Customer</span>
                        <h2 className="text-sm font-black uppercase text-slate-900 leading-tight mt-0.5">
                            {invoice.customer?.name || 'Unknown Customer'}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-700 mt-0.5">
                            Tel: {invoice.customer?.phone || 'N/A'}
                            <span className="ml-2 text-[9px] font-mono bg-white border border-slate-300 px-1.5 py-0.2 rounded text-slate-600">
                                ID: {invoice.customer?.id}
                            </span>
                        </p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">
                            {invoice.customer?.address || 'No Address Provided'}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Category</span>
                        <span className="text-[10px] font-black uppercase text-slate-800 bg-white border border-slate-300 px-2 py-0.5 rounded inline-block mt-0.5">
                            {invoice.customer?.category || 'General'}
                        </span>
                    </div>
                </div>

                {/* ITEMS TABLE */}
                <table className="w-full border-collapse border border-slate-900 mb-3">
                    <thead>
                        <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider">
                            <th className="py-1.5 px-1.5 text-center border border-slate-900 w-7">#</th>
                            <th className="py-1.5 px-2 text-left border border-slate-900">Item Description &amp; Specifications</th>
                            <th className="py-1.5 px-1.5 text-center border border-slate-900 w-11">Qty</th>
                            <th className="py-1.5 px-1.5 text-center border border-slate-900 w-12">Unit</th>
                            <th className="py-1.5 px-2 text-right border border-slate-900 w-16">Rate</th>
                            <th className="py-1.5 px-2 text-right border border-slate-900 w-20">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-900 text-[11px] font-bold">
                        {invoice.items.map((item: any, i: number) => {
                            const parsed = formatProductDisplay(item.product?.name || 'Item');
                            return (
                                <tr key={i} className="border-b border-slate-300">
                                    <td className="py-1.5 px-1.5 text-center align-top border-x border-slate-300 text-[10px] font-black text-slate-500">
                                        {i + 1}
                                    </td>
                                    <td className="py-1.5 px-2 text-left align-top border-x border-slate-300">
                                        <div className="font-black text-[11px] uppercase text-slate-900 leading-tight">
                                            {parsed.title}
                                        </div>
                                        {parsed.specs.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {parsed.specs.map((spec, sIdx) => (
                                                    <span key={sIdx} className="text-[8px] font-bold uppercase bg-slate-100 border border-slate-300 text-slate-700 px-1.5 py-0.2 rounded">
                                                        {spec}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-1.5 px-1.5 text-center align-top border-x border-slate-300 font-black text-[11px]">
                                        {item.quantity}
                                    </td>
                                    <td className="py-1.5 px-1.5 text-center align-top border-x border-slate-300 text-[9px] uppercase text-slate-600 font-black">
                                        {item.product?.unit || 'Pcs'}
                                    </td>
                                    <td className="py-1.5 px-2 text-right align-top border-x border-slate-300 text-[11px]">
                                        {(item.price).toLocaleString()}
                                    </td>
                                    <td className="py-1.5 px-2 text-right align-top border-x border-slate-300 font-black text-[11px]">
                                        {(item.quantity * item.price).toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}
                        {emptyRows.map((_, i) => (
                            <tr key={`empty-${i}`} className="border-b border-slate-200">
                                <td className="py-2 border-x border-slate-300 text-transparent">-</td>
                                <td className="border-x border-slate-300"></td>
                                <td className="border-x border-slate-300"></td>
                                <td className="border-x border-slate-300"></td>
                                <td className="border-x border-slate-300"></td>
                                <td className="border-x border-slate-300"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* FOOTER & SUMMARY */}
                <div className="flex justify-between items-end gap-4 mt-2">
                    <div className="flex-1 text-[9px] text-slate-500 space-y-1 pr-2">
                        <p className="font-black uppercase text-slate-700 tracking-wide">Terms &amp; Contact</p>
                        <p className="font-semibold leading-snug">
                            Please verify all garments, sizes, colors, and quantities upon delivery. For billing inquiries, contact sales representative:
                        </p>
                        <p className="font-black text-slate-900 text-[10px] pt-0.5">
                            {repDetails.name} — {repDetails.phone}
                        </p>
                    </div>

                    <div className="w-[215px] shrink-0 border-2 border-slate-900 rounded-lg overflow-hidden text-[10px]">
                        <div className="flex justify-between px-2.5 py-1 border-b border-slate-200 bg-white">
                            <span className="font-bold text-slate-600 uppercase">Subtotal</span>
                            <span className="font-black text-slate-900">PKR {subtotal.toLocaleString()}</span>
                        </div>

                        {invoice.discountAmount > 0 && (
                            <div className="flex justify-between px-2.5 py-1 border-b border-slate-200 bg-white">
                                <span className="font-bold text-slate-600 uppercase">Discount</span>
                                <span className="font-black text-red-600">- PKR {invoice.discountAmount.toLocaleString()}</span>
                            </div>
                        )}

                        <div className="flex justify-between px-2.5 py-1 border-b border-slate-300 bg-slate-50">
                            <span className="font-black text-slate-800 uppercase">Net Invoice</span>
                            <span className="font-black text-slate-900">PKR {netTotal.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between px-2.5 py-1 border-b border-slate-200 bg-white">
                            <span className="font-bold text-slate-600 uppercase">Previous Bal</span>
                            <span className="font-black text-slate-900">PKR {prevBalance.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between px-2.5 py-1 border-b border-slate-200 bg-white">
                            <span className="font-bold text-slate-600 uppercase">Total Payable</span>
                            <span className="font-black text-slate-900">PKR {totalPayable.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between px-2.5 py-1 border-b border-slate-300 bg-white">
                            <span className="font-bold text-slate-600 uppercase">Paid Amount</span>
                            <span className="font-black text-emerald-700">PKR {payment.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between px-2.5 py-1.5 bg-slate-900 text-white text-[11px]">
                            <span className="font-black uppercase tracking-wider">Closing Bal</span>
                            <span className="font-black">PKR {closingBalance.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  )
}