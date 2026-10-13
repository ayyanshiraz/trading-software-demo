import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import { verifySession } from '@/lib/session'
import InvoiceList from '@/components/InvoiceList'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<any> | any }) {
  const session = await verifySession()
  const params = await searchParams || {}
  const search = params.search?.toLowerCase() || ''

  const customers = await prisma.customer.findMany({ where: { userId: session.userId } })
  
  // FETCH ACTIVE INVOICES (AND EXCLUDE VOUCHERS!)
  const activeInvoices = await prisma.invoice.findMany({
    where: { 
        userId: session.userId, 
        isHold: false,
        // THIS LINE HIDES VOUCHERS (Invoices with 0 total)
        NOT: { totalAmount: 0, items: { none: {} } }
    }, 
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' }
  })

  const categories = await prisma.customerCategory.findMany({ where: { userId: session.userId } })

  const customerBalances = customers.reduce((acc: any, c: any) => {
      let bal = Number(c.openingBalance || 0);
      activeInvoices.filter((i: any) => i.customerId === c.id).forEach((inv: any) => {
          if (inv.isReturn) bal -= Number(inv.totalAmount);
          else bal += (Number(inv.totalAmount) - Number(inv.paidAmount || 0))
      })
      acc[c.id] = bal;
      return acc;
  }, {})

  const invoicesWithBalances = activeInvoices.map((inv: any) => ({
      ...inv,
      customerCurrentBalance: customerBalances[inv.customerId] || 0
  }))

  const filtered = invoicesWithBalances.filter(inv => 
      inv.id.toLowerCase().includes(search) || 
      inv.customer.name.toLowerCase().includes(search) ||
      (inv.customer.phone && inv.customer.phone.includes(search))
  )

  return (
    <div className="min-h-screen bg-slate-50 lg:ml-64 p-4 pt-20 lg:p-8">
       <InvoiceList invoices={filtered} categories={categories} />
    </div>
  )
}