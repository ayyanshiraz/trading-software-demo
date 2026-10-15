import { verifySession } from '@/lib/session'
import { PrismaClient } from '@prisma/client'
import UserManager from '@/components/UserManager'
import { getBranches, getStaffUsers } from '@/actions/actions'
import { redirect } from 'next/navigation'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  
  if (user?.role !== 'ADMIN') {
      redirect('/')
  }

  const branches = await getBranches()
  const staff = await getStaffUsers()

  return (
    <div className="min-h-screen bg-slate-50 lg:ml-64 p-4 pt-20 lg:p-8">
      <div className="max-w-4xl mx-auto mb-20">
        <h1 className="text-3xl font-black mb-2 text-slate-900 uppercase tracking-tight">Staff Management</h1>
        <p className="text-slate-500 font-bold text-sm mb-8">Create accounts for your branch staff. Their sales will automatically deduct from their assigned branch.</p>
        
        <UserManager staff={staff} branches={branches} />
      </div>
    </div>
  )
}