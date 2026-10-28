import { verifySession } from '@/lib/session'
import { PrismaClient } from '@prisma/client'
import FundTransferManager from '@/components/FundTransferManager'
import { getFundTransfers } from '@/actions/actions'
import { redirect } from 'next/navigation'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export default async function FundTransfersPage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) redirect('/login')

  const tenantId = user.parentId || user.id
  
  const customers = await prisma.customer.findMany({ 
      where: { userId: tenantId },
      orderBy: { name: 'asc' } 
  })

  // History fetch karna
  const history = await getFundTransfers()

  return (
    <div className="min-h-screen bg-slate-50 lg:ml-64 p-4 pt-20 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6 mb-20">
        <div className="mb-8 pl-2">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Ledger Transfers</h1>
          <p className="text-slate-500 font-bold text-sm mt-2">Transfer funds between accounts (Payables to Receivables).</p>
        </div>
        <FundTransferManager customers={customers} history={history} />
      </div>
    </div>
  )
}