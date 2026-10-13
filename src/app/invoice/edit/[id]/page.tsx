import { PrismaClient } from '@prisma/client'
import InvoiceForm from '@/components/InvoiceForm'
import { verifySession } from '@/lib/session'
import { redirect } from 'next/navigation'

const prisma = new PrismaClient()

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  const { id } = await params

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, items: { include: { product: true } } }
  })

  // FIX: Removed the invoice.isReturn check so we can edit returns!
  if (!invoice || invoice.userId !== session.userId) {
      redirect('/invoices')
  }

  const customers = await prisma.customer.findMany({ where: { userId: session.userId } })
  const products = await prisma.product.findMany({ where: { userId: session.userId } })

  return (
    <div className="min-h-screen bg-slate-50 p-4 pt-24 md:p-8 md:ml-64">
      <div className="mb-8">
        <h1 className={`text-3xl font-black uppercase ${invoice.isReturn ? 'text-red-600' : 'text-amber-600'}`}>
            {invoice.isReturn ? 'Edit Return Record' : 'Edit Sales Invoice'}
        </h1>
        <p className="text-slate-500 font-bold text-sm">Modifying Record: {invoice.id.slice(-6).toUpperCase()}</p>
      </div>
      <InvoiceForm customers={customers} products={products} initialData={invoice} />
    </div>
  )
}