import { PrismaClient } from '@prisma/client'
import InvoiceForm from '@/components/InvoiceForm'
import { verifySession } from '@/lib/session'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

export default async function NewInvoicePage() {
  // 1. SECURE: Get the currently logged-in user's session
  const session = await verifySession()
  const userId = session.userId

  // 2. Fetch ONLY this user's Customers for the dropdown
  const customers = await prisma.customer.findMany({
    where: { userId }, // STRICT DATA LOCK
    orderBy: {
      name: 'asc'
    }
  })

  // 3. Fetch ONLY this user's Products
  const products = await prisma.product.findMany({
    where: { userId }, // STRICT DATA LOCK
    orderBy: {
      name: 'asc'
    }
  })

  return (
    <div className="min-h-screen bg-slate-50 lg:ml-64 p-4 pt-20 lg:p-8">
      <div className="max-w-5xl mx-auto mb-20">
        <h1 className="text-3xl font-black mb-2 text-slate-900 uppercase tracking-tight">New Sales Invoice</h1>
        <p className="text-slate-500 font-bold text-sm mb-8">Create a new sales invoice. (Stock tracking is disabled).</p>
        
        {/* Pass isolated data to the interactive Form */}
        <InvoiceForm customers={customers} products={products} />
      </div>
    </div>
  )
}