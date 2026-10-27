import { PrismaClient } from '@prisma/client'
import { verifySession } from '@/lib/session'
import TransfersManager from '@/components/TransfersManager'
import { redirect } from 'next/navigation'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export default async function TransfersPage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) redirect('/login')

  const tenantId = user.parentId || user.id

  const branches = await prisma.branch.findMany({
      where: { userId: tenantId },
      orderBy: { type: 'desc' }
  })

  const transfers = await prisma.stockTransfer.findMany({
      where: { userId: tenantId },
      include: {
          fromBranch: true,
          toBranch: true,
          items: { include: { product: true } }
      },
      orderBy: { transferDate: 'desc' }
  })

  const products = await prisma.product.findMany({
      where: { userId: tenantId },
      include: { branchStocks: true }
  })

  return (
    <div className="min-h-screen bg-slate-50 lg:ml-64 p-4 pt-20 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* NAYI HEADINGS JAHAN SE JHELUM AUR GUJRAT HATA DIYA GAYA HAI */}
        <div className="mb-8 pl-2">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Main Inventory</h1>
          <p className="text-slate-500 font-bold text-sm mt-2">Monitor your central hardware and building materials stock.</p>
        </div>

        <TransfersManager branches={branches} transfers={transfers} products={products} />
        
      </div>
    </div>
  )
}