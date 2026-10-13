import { PrismaClient } from '@prisma/client'
import CategoryManager from '@/components/CategoryManager'
import { addCustomerCategory, deleteCustomerCategory } from '@/actions/actions'
import { verifySession } from '@/lib/session'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export default async function CustomerCategoryPage() {
  const session = await verifySession()
  
  // STRICT DATA LOCK
  const categories = await prisma.customerCategory.findMany({ 
      where: { userId: session.userId },
      orderBy: { name: 'asc' } 
  })

  return (
    <div className="min-h-screen bg-slate-50 lg:ml-64 p-4 pt-20 lg:p-8">
      <div className="max-w-5xl mx-auto mb-20">
        <h1 className="text-3xl font-black mb-2 text-slate-900 uppercase tracking-tight">Customer Categories</h1>
        <p className="text-slate-500 font-bold text-sm mb-8">Manage your isolated customer group tags.</p>
        
        <CategoryManager 
          title="Customer Category" 
          categories={categories} 
          saveAction={addCustomerCategory}
          deleteAction={deleteCustomerCategory} 
        />
      </div>
    </div>
  )
}