import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import { Printer, Trash2, Search, ArrowLeftRight, FileText, Edit } from 'lucide-react'
import { deleteInvoice } from '@/actions/actions'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export default async function AllInvoicesPage({ searchParams }: { searchParams: Promise<{ from?: string, to?: string, query?: string }> }) {
  const params = await searchParams
  const from = params.from ? new Date(params.from) : undefined
  const to = params.to ? new Date(params.to) : undefined
  const query = params.query || ""

  const whereCondition: any = {}

  if (from && to) {
    const endOfDay = new Date(to)
    endOfDay.setHours(23, 59, 59, 999)
    whereCondition.createdAt = { gte: from, lte: endOfDay }
  } else if (from) {
    whereCondition.createdAt = { gte: from }
  } else if (to) {
    const endOfDay = new Date(to)
    endOfDay.setHours(23, 59, 59, 999)
    whereCondition.createdAt = { lte: endOfDay }
  }

  if (query) {
    whereCondition.OR = [
        { id: { contains: query, mode: 'insensitive' } },
        { customer: { name: { contains: query, mode: 'insensitive' } } },
        { customer: { phone: { contains: query, mode: 'insensitive' } } },
        { customer: { address: { contains: query, mode: 'insensitive' } } }
    ]
  }

  const invoices = await prisma.invoice.findMany({
    where: whereCondition,
    orderBy: { createdAt: 'desc' },
    include: { customer: true }
  })

  return (
    <div className="min-h-screen bg-slate-50 p-4 pt-24 md:p-8 md:ml-64">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-black text-slate-900 uppercase">All Invoices</h1>
           <p className="text-slate-500 font-bold text-sm">Found {invoices.length} records</p>
        </div>
        
        <form className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            <div className="relative border-r border-slate-200 pr-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input type="text" name="query" defaultValue={query} placeholder="Search Name, ID, Phone..." className="pl-8 p-2 text-sm font-bold text-slate-900 outline-none w-56 placeholder:text-slate-400" />
            </div>
            <input type="date" name="from" defaultValue={params.from} className="text-xs font-bold uppercase text-slate-900 outline-none cursor-pointer" />
            <span className="text-slate-300 font-bold">-</span>
            <input type="date" name="to" defaultValue={params.to} className="text-xs font-bold uppercase text-slate-900 outline-none cursor-pointer" />
            <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-black transition text-xs font-bold uppercase ml-2">Filter</button>
            <Link href="/invoices" className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-300 transition text-xs font-bold uppercase">Clear</Link>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-widest border-b border-slate-200">
            <tr>
              <th className="p-4">Invoice #</th>
              <th className="p-4">Date & Time</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Phone / Address</th>
              <th className="p-4 text-right">Total</th>
              <th className="p-4 text-right">Paid</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-mono text-slate-500">{inv.id.slice(-6).toUpperCase()}</td>
                <td className="p-4">
                    <span className="text-slate-900">{new Date(inv.createdAt).toLocaleDateString()}</span><br/>
                    <span className="text-xs text-slate-400">{new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </td>
                <td className="p-4 uppercase text-slate-900">{inv.customer.name}</td>
                <td className="p-4 text-xs text-slate-500">{inv.customer.phone || 'N/A'} <br/> {inv.customer.address}</td>
                <td className={`p-4 text-right font-black ${inv.isReturn ? 'text-red-600' : 'text-slate-900'}`}>
                    PKR {inv.totalAmount.toLocaleString()}
                </td>
                <td className="p-4 text-right font-black text-emerald-600">
                    PKR {(inv.paidAmount || 0).toLocaleString()}
                </td>
                <td className="p-4 flex justify-center gap-2">
                  <Link href={`/print/${inv.id}`} target="_blank">
                    <button className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-200 transition" title="Print"><Printer size={16}/></button>
                  </Link>
                  
                  {/* FIX: Edit button is now available for ALL invoices, including Returns */}
                  <Link href={`/invoice/edit/${inv.id}`}>
                    <button className="p-2 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 border border-amber-200 transition" title="Edit"><Edit size={16}/></button>
                  </Link>
                  
                  <form action={deleteInvoice.bind(null, inv.id)}>
                    <button className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 border border-red-200 transition" title="Delete"><Trash2 size={16}/></button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}