import { PrismaClient } from '@prisma/client'
import { verifySession } from '@/lib/session'
import { TrendingUp, DollarSign, Package, ArrowLeftRight, Users, Percent, PlusCircle, BookOpen } from 'lucide-react'
import { getDashboardStats } from '@/actions/actions'
import Link from 'next/link'
import DashboardFilter from '@/components/DashboardFilter'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<any> | any }) {
  const session = await verifySession()
  const params = await searchParams || {}

  const pktNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  const todayStr = `${pktNow.getFullYear()}-${String(pktNow.getMonth()+1).padStart(2,'0')}-${String(pktNow.getDate()).padStart(2,'0')}`;

  const rawFrom = params.from || params.startDate;
  const rawTo = params.to || params.endDate;

  let fromStr = todayStr;
  let toStr = todayStr;

  // 🔴 ROBUST DATE PARSER: Prevents the DD/MM/YYYY vs YYYY-MM-DD browser crash
  if (rawFrom) {
      const parts = rawFrom.includes('/') ? rawFrom.split('/') : rawFrom.split('-');
      fromStr = parts[0].length === 4 ? rawFrom : `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  if (rawTo) {
      const parts = rawTo.includes('/') ? rawTo.split('/') : rawTo.split('-');
      toStr = parts[0].length === 4 ? rawTo : `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  const from = new Date(`${fromStr}T00:00:00+05:00`);
  const to = new Date(`${toStr}T23:59:59.999+05:00`);

  const stats = await getDashboardStats(from, to)

  return (
    <div className="min-h-screen bg-slate-50 lg:ml-64 p-4 pt-20 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER & DATE FILTER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Command Center</h1>
            <p className="text-slate-500 font-bold text-sm">Business overview for selected period.</p>
          </div>
          
          <DashboardFilter initialFrom={rawFrom || todayStr} initialTo={rawTo || todayStr} />
        </div>

        {/* QUICK ACTION SHORTCUTS */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Link href="/invoice/new" className="flex-1 bg-blue-600 text-white p-4 md:p-5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg hover:shadow-blue-600/30 active:scale-95">
                <PlusCircle size={22} /> Create Sales Invoice
            </Link>
            <Link href="/ledger" className="flex-1 bg-slate-900 text-white p-4 md:p-5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest hover:bg-black transition shadow-lg hover:shadow-slate-900/30 active:scale-95">
                <BookOpen size={22} /> Open General Ledger
            </Link>
        </div>

        {/* 6-METRIC DASHBOARD GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center border-l-4 border-l-blue-500 hover:shadow-md transition">
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Revenue</p>
                  <h2 className="text-xl font-black text-slate-900">PKR {stats.netRevenue.toLocaleString()}</h2>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign size={22} />
              </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center border-l-4 border-l-emerald-500 hover:shadow-md transition">
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Profit</p>
                  <h2 className="text-xl font-black text-slate-900">PKR {stats.profit.toLocaleString()}</h2>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp size={22} />
              </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center border-l-4 border-l-indigo-500 hover:shadow-md transition">
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Profit Margin</p>
                  <h2 className="text-xl font-black text-slate-900">{stats.margin}%</h2>
              </div>
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Percent size={22} />
              </div>
          </div>

          {/* 🔴 UPDATED: Highly Detailed Receivables Card */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center border-l-4 border-l-orange-500 hover:shadow-md transition">
              <div className="flex justify-between items-center w-full">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1" title="Debt generated strictly in this period">Period Receivables</p>
                      <h2 className="text-xl font-black text-slate-900">PKR {stats.periodReceivable.toLocaleString()}</h2>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <ArrowLeftRight size={22} />
                  </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center w-full">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged Vouchers</span>
                  <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">{stats.voucherCount || 0}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center w-full">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest" title="Total all-time market balance">True Market Bal</span>
                  <span className="text-xs font-black text-slate-600">PKR {stats.totalReceivable.toLocaleString()}</span>
              </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center border-l-4 border-l-purple-500 hover:shadow-md transition">
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sales Invoices</p>
                  <h2 className="text-xl font-black text-slate-900">{stats.salesCount}</h2>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Package size={22} />
              </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center border-l-4 border-l-slate-800 hover:shadow-md transition">
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Customers</p>
                  <h2 className="text-xl font-black text-slate-900">{stats.customerCount}</h2>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Users size={22} />
              </div>
          </div>

        </div>

      </div>
    </div>
  )
}