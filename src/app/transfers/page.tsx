import { PrismaClient } from '@prisma/client'
import { verifySession } from '@/lib/session'
import TransfersManager from '@/components/TransfersManager'
import { getBranches, getStockTransfers } from '@/actions/actions'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export default async function StockTransfersPage() {
  const session = await verifySession()
  const userId = session.userId

  // Fetch the branches, transfer history, and isolated products
  const branches = await getBranches()
  const transfers = await getStockTransfers()
  const products = await prisma.product.findMany({ 
      where: { userId }, 
      orderBy: { name: 'asc' } 
  })

  return (
    <div className="min-h-screen bg-slate-50 lg:ml-64 p-4 pt-20 lg:p-8">
      <div className="max-w-6xl mx-auto mb-20">
        <h1 className="text-3xl font-black mb-2 text-slate-900 uppercase tracking-tight">Warehouse Transfers</h1>
        <p className="text-slate-500 font-bold text-sm mb-8">Move stock between Head Office (Jhelum) and Branch (Gujrat). Receiver must accept the transfer to update inventory.</p>
        
        <TransfersManager branches={branches} transfers={transfers} products={products} />
      </div>
    </div>
  )
}