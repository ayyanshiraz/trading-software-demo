import { PrismaClient } from '@prisma/client'
import ProductManager from '@/components/ProductManager'
import { verifySession } from '@/lib/session'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  // 1. SECURE: Get the currently logged-in user's session
  const session = await verifySession()
  const userId = session.userId

  // 2. Fetch ONLY this user's Products
  const products = await prisma.product.findMany({ 
      where: { userId }, // STRICT DATA LOCK
      orderBy: { name: 'asc' } 
  })
  
  // 3. Fetch ONLY this user's Categories
  const categories = await prisma.productCategory.findMany({ 
      where: { userId }, // STRICT DATA LOCK
      orderBy: { name: 'asc' } 
  })

  return (
    <div className="min-h-screen bg-slate-50 lg:ml-64 p-4 pt-20 lg:p-8">
      <div className="max-w-5xl mx-auto mb-20">
        <h1 className="text-3xl font-black mb-2 text-slate-900 uppercase tracking-tight">Products Database</h1>
        <p className="text-slate-500 font-bold text-sm mb-8">Manage your isolated inventory, costs, and selling prices.</p>
        
        {/* Pass isolated data to the interactive Manager */}
        <ProductManager products={products} categories={categories} />
      </div>
    </div>
  )
}