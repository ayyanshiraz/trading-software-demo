import { PrismaClient } from '@prisma/client'
import CustomerManager from '@/components/CustomerManager'
import { verifySession } from '@/lib/session'

const prisma = new PrismaClient()

// Force fresh data on every load
export const dynamic = 'force-dynamic'

export default async function CustomerPage() {
  // 1. SECURE: Get the currently logged-in user's session
  const session = await verifySession()
  const userId = session.userId

  // 2. Fetch ONLY this user's customers
  const customers = await prisma.customer.findMany({
    where: { userId }, // STRICT DATA LOCK
    orderBy: {
      name: 'asc'
    }
  })

  // 3. Fetch ONLY this user's customer-specific categories
  const categories = await prisma.customerCategory.findMany({
    where: { userId }, // STRICT DATA LOCK
    orderBy: {
      name: 'asc'
    }
  })

  // 4. Render the Manager Component
  return (
    <div className="min-h-screen bg-slate-50 lg:ml-64 p-4 pt-20 lg:p-8">
      <div className="max-w-5xl mx-auto mb-20">
        <h1 className="text-3xl font-black mb-2 text-slate-900 uppercase tracking-tight">Customers Database</h1>
        <p className="text-slate-500 font-bold text-sm mb-8">Manage your isolated customer directory and opening balances.</p>
        
        {/* Pass isolated data to the interactive Form */}
        <CustomerManager customers={customers} categories={categories} />
      </div>
    </div>
  )
}