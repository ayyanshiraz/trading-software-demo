import { PrismaClient } from '@prisma/client'
import CategoryManager from '@/components/CategoryManager'
import { addProductCategory, deleteProductCategory } from '@/actions/actions'
import { verifySession } from '@/lib/session'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export default async function ProductCategoryPage() {
  const session = await verifySession()
  
  // STRICT DATA LOCK
  const categories = await prisma.productCategory.findMany({ 
      where: { userId: session.userId },
      orderBy: { name: 'asc' } 
  })

  return (
    <div className="min-h-screen bg-slate-50 lg:ml-64 p-4 pt-20 lg:p-8">
      <div className="max-w-5xl mx-auto mb-20">
        <h1 className="text-3xl font-black mb-2 text-slate-900 uppercase tracking-tight">Product Categories</h1>
        <p className="text-slate-500 font-bold text-sm mb-8">Manage your isolated product classification tags.</p>
        
        <CategoryManager 
          title="Product Category" 
          categories={categories} 
          saveAction={addProductCategory}
          deleteAction={deleteProductCategory} 
        />
      </div>
    </div>
  )
}