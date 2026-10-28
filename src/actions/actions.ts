'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const prisma = new PrismaClient()

async function getAuth() {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) redirect('/login')
  return { 
    tenantId: user.parentId || user.id, 
    role: user.role,                    
    branchId: user.branchId             
  }
}

function revalidateAll() {
  revalidatePath('/') 
  revalidatePath('/invoices')
  revalidatePath('/invoice/hold')
  revalidatePath('/ledger')
  revalidatePath('/products')
  revalidatePath('/customers')
  revalidatePath('/receivables')
  revalidatePath('/transfers') 
  revalidatePath('/users')
  revalidatePath('/notifications')
}

export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.delete('session') 
  redirect('/login')
}

async function getNextInvoiceId(tx: any) {
    const allInvoices = await tx.invoice.findMany({ select: { id: true } });
    let maxSeq = 0;
    for (const inv of allInvoices) {
        if (/^\d+$/.test(inv.id)) {
            const num = parseInt(inv.id, 10);
            if (num > maxSeq) maxSeq = num;
        }
    }
    return String(maxSeq + 1).padStart(5, '0');
}

export async function getBranches() {
    const auth = await getAuth();
    const userId = auth.tenantId;
    let branches = await prisma.branch.findMany({ where: { userId }, orderBy: { type: 'desc' } });
    
    if (branches.length === 0) {
        await prisma.branch.create({ data: { name: 'Jhelum Head Office', type: 'HeadOffice', userId } });
        await prisma.branch.create({ data: { name: 'Gujrat Branch', type: 'Branch', userId } });
        branches = await prisma.branch.findMany({ where: { userId }, orderBy: { type: 'desc' } });
    }
    return branches;
}

export async function createStaffUser(username: string, password: string, branchId: string) {
    const auth = await getAuth();
    if (auth.role !== 'ADMIN') return { error: 'Only Admin can create users' }

    const existing = await prisma.user.findUnique({ where: { email: username.toLowerCase() } })
    if (existing) return { error: 'Username already exists' }

    await prisma.user.create({
        data: {
            id: `STAFF-${Math.floor(Math.random() * 100000)}`,
            email: username.toLowerCase(),
            password: password, 
            name: username,
            role: 'STAFF',
            parentId: auth.tenantId,
            branchId: branchId
        }
    })
    
    await prisma.notification.create({
        data: {
            title: 'New Staff Added',
            message: `Account created for ${username}.`,
            type: 'SYSTEM',
            userId: auth.tenantId
        }
    })
    
    revalidateAll()
    return { success: true }
}

export async function getStaffUsers() {
    const auth = await getAuth();
    return await prisma.user.findMany({
        where: { parentId: auth.tenantId, role: 'STAFF' },
        include: { assignedBranch: true },
        orderBy: { name: 'asc' }
    })
}

export async function deleteStaffUser(id: string) {
    const auth = await getAuth();
    if (auth.role !== 'ADMIN') return { error: 'Only Admin can delete users' }
    await prisma.user.deleteMany({ where: { id, parentId: auth.tenantId } })
    revalidateAll()
}

export async function saveProduct(formData: FormData) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const originalId = formData.get('originalId') as string 
  let id = formData.get('id') as string
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const unit = formData.get('unit') as string || 'Pcs' 
  const cost = Number(formData.get('cost')) || 0
  const price = Number(formData.get('price')) || 0 
  const stockQty = Number(formData.get('stock')) || 0 
  const warehouseQty = Number(formData.get('warehouseStock')) || 0 

  if (!id || id.trim() === '') id = `HW-${Math.floor(Math.random() * 100000)}`

  if (originalId && originalId !== id) {
      const existing = await prisma.product.findUnique({ where: { id: originalId } })
      if (existing?.userId !== userId) return { error: "Unauthorized" }
      try { await prisma.product.update({ where: { id: originalId }, data: { id, name, category, unit, cost, price } }) } 
      catch (e) { return { error: "Cannot change Product ID." } }
  } else {
      const existing = await prisma.product.findUnique({ where: { id } })
      if (existing) { 
          if (existing.userId !== userId) return { error: "This Product ID is already in use." }
          else await prisma.product.update({ where: { id }, data: { name, category, unit, cost, price } }) 
      } else { 
          const branches = await getBranches();
          const hq = branches.find((b: any) => b.type === 'HeadOffice') || branches[0];
          const wh = branches.find((b: any) => b.type !== 'HeadOffice') || branches[1];
          
          const branchStockEntries: any[] = [{ branchId: hq.id, quantity: stockQty }];
          if (wh && wh.id !== hq.id) {
              branchStockEntries.push({ branchId: wh.id, quantity: warehouseQty });
          }

          await prisma.product.create({ 
              data: { 
                  id, name, category, unit, cost, price, stock: stockQty + warehouseQty, 
                  user: { connect: { id: userId } },
                  branchStocks: { create: branchStockEntries }
              } 
          }) 
      }
  }
  revalidateAll(); return { success: true }
}

export async function deleteProduct(id: string) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const existing = await prisma.product.findUnique({ where: { id } })
  if (existing?.userId === userId) { 
      try { 
          await prisma.invoiceItem.deleteMany({ where: { productId: id } })
          await prisma.product.delete({ where: { id } }) 
          revalidateAll(); 
          return { success: true } 
      } 
      catch(error) { return { error: "Failed to delete product." } }
  }
  return { error: "Unauthorized" }
}

export async function bulkUpdateProductPrices(updates: { id: string, cost: number, price: number }[]) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const myProducts = await prisma.product.findMany({ where: { userId } })
  const myProductIds = myProducts.map((p: any) => p.id)
  const validUpdates = updates.filter(u => myProductIds.includes(u.id))
  await prisma.$transaction( validUpdates.map((update: any) => prisma.product.update({ where: { id: update.id }, data: { cost: Number(update.cost) || 0, price: Number(update.price) || 0 } })) )
  revalidateAll() 
}

export async function addProductCategory(formData: FormData) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const originalId = formData.get('originalId') as string
  const name = formData.get('name') as string
  let id = formData.get('id') as string
  if (!id || id.trim() === '') id = `PCAT-${Math.floor(Math.random() * 100000)}`

  if (originalId && originalId !== id) {
      await prisma.productCategory.update({ where: { id: originalId }, data: { id, name } })
  } else {
      const existing = await prisma.productCategory.findUnique({ where: { id }})
      if (existing) {
          if (existing.userId !== userId) return { error: "ID in use." }
          else await prisma.productCategory.update({ where: { id }, data: { name } }) 
      } else await prisma.productCategory.create({ data: { id, name, userId } }) 
  }
  revalidateAll(); return { success: true }
}

export async function deleteProductCategory(id: string) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const existing = await prisma.productCategory.findUnique({ where: { id }})
  if (existing?.userId === userId) await prisma.productCategory.delete({ where: { id } }) 
  revalidateAll()
}

export async function saveCustomer(formData: FormData) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const originalId = formData.get('originalId') as string 
  let id = formData.get('id') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const address = formData.get('address') as string
  const category = formData.get('category') as string
  const openingBalance = Number(formData.get('openingBalance')) || 0 

  if (!id || id.trim() === '') id = `CUST-${Math.floor(Math.random() * 100000)}`

  if (originalId && originalId !== id) {
      const existing = await prisma.customer.findUnique({ where: { id: originalId } })
      if (existing?.userId !== userId) return { error: "Unauthorized" }
      try { await prisma.customer.update({ where: { id: originalId }, data: { id, name, phone, address, category, openingBalance } }) } 
      catch (e) { return { error: "Cannot change Customer ID." } }
  } else {
      const existing = await prisma.customer.findUnique({ where: { id } })
      if (existing) { 
          if (existing.userId !== userId) return { error: "ID in use." }
          else await prisma.customer.update({ where: { id }, data: { name, phone, address, category, openingBalance } }) 
      } else await prisma.customer.create({ data: { id, name, phone, address, category, openingBalance, user: { connect: { id: userId } } } }) 
  }
  revalidateAll(); return { success: true }
}

export async function deleteCustomer(id: string) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const existing = await prisma.customer.findUnique({ where: { id } })
  
  if (existing?.userId === userId) { 
      try { 
          const customerInvoices = await prisma.invoice.findMany({ where: { customerId: id } })
          const invoiceIds = customerInvoices.map((i: any) => i.id)

          if (invoiceIds.length > 0) {
              await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } })
          }
          await prisma.invoice.deleteMany({ where: { customerId: id } })
          await prisma.customer.delete({ where: { id } }); 
          
          revalidateAll(); 
          return { success: true } 
      } 
      catch (error) { return { error: "Failed to delete customer." } } 
  }
  return { error: "Unauthorized" }
}

export async function addCustomerCategory(formData: FormData) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const originalId = formData.get('originalId') as string
  const name = formData.get('name') as string
  let id = formData.get('id') as string
  if (!id || id.trim() === '') id = `CCAT-${Math.floor(Math.random() * 100000)}`

  if (originalId && originalId !== id) {
      await prisma.customerCategory.update({ where: { id: originalId }, data: { id, name } })
  } else {
      const existing = await prisma.customerCategory.findUnique({ where: { id }})
      if (existing) { 
          if (existing.userId !== userId) return { error: "ID in use." }
          else await prisma.customerCategory.update({ where: { id }, data: { name } }) 
      } else await prisma.customerCategory.create({ data: { id, name, userId } }) 
  }
  revalidateAll(); return { success: true }
}

export async function deleteCustomerCategory(id: string) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const existing = await prisma.customerCategory.findUnique({ where: { id }})
  if (existing?.userId === userId) await prisma.customerCategory.delete({ where: { id } }) 
  revalidateAll()
}

export async function createInvoice(invoiceData: any) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const dateToSave = invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : new Date()
  
  const branches = await getBranches();
  const branchId = auth.role === 'STAFF' && auth.branchId ? auth.branchId : (invoiceData.branchId || branches.find((b: any) => b.type === 'HeadOffice')?.id || branches[0].id);

  const result = await prisma.$transaction(async (tx: any) => {
    const nextId = await getNextInvoiceId(tx);
    
    const invoice = await tx.invoice.create({
      data: {
        id: nextId,
        customer: { connect: { id: invoiceData.customerId } }, 
        user: { connect: { id: userId } },
        branch: { connect: { id: branchId } },
        totalAmount: Number(invoiceData.totalAmount) || 0, 
        paidAmount: Number(invoiceData.paidAmount) || 0, 
        discountAmount: Number(invoiceData.discountAmount) || 0, 
        isReturn: invoiceData.isReturn || false, 
        isHold: invoiceData.isHold || false, 
        notes: invoiceData.notes || '',
        createdAt: dateToSave,
        items: { create: (invoiceData.items || []).map((item: any) => ({ productId: item.productId, quantity: Number(item.quantity), price: Number(item.price) })) }
      }
    })

    if (!invoiceData.isHold) {
        for (const item of invoiceData.items) {
            const qty = Number(item.quantity);
            const stockChange = invoiceData.isReturn ? qty : -qty;

            await tx.productStock.upsert({
                where: { productId_branchId: { productId: item.productId, branchId: branchId } },
                update: { quantity: { increment: stockChange } },
                create: { productId: item.productId, branchId: branchId, quantity: stockChange }
            });
        }
    }
    
    await tx.notification.create({
        data: {
            title: invoiceData.isReturn ? 'Return Invoice Processed' : 'New Sales Invoice',
            message: `Amount: PKR ${Number(invoiceData.totalAmount)} | Customer ID: ${invoiceData.customerId}`,
            type: invoiceData.isReturn ? 'ALERT' : 'SALE',
            userId: userId
        }
    });

    return invoice;
  })
  revalidateAll(); return result;
}

export async function updateInvoice(invoiceId: string, invoiceData: any) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const existing = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { items: true } })
  if (existing?.userId !== userId) throw new Error("Unauthorized")

  const branches = await getBranches();
  const branchId = existing.branchId || branches[0].id;
  const dateToSave = invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : existing.createdAt

  await prisma.$transaction(async (tx: any) => {
    if (!existing.isHold) {
        for (const item of existing.items) {
            const reverseQty = existing.isReturn ? -item.quantity : item.quantity;
            await tx.productStock.updateMany({
                where: { productId: item.productId, branchId: branchId },
                data: { quantity: { increment: reverseQty } }
            });
        }
    }

    await tx.invoiceItem.deleteMany({ where: { invoiceId } })
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { 
          customer: { connect: { id: invoiceData.customerId } },
          totalAmount: Number(invoiceData.totalAmount) || 0, 
          paidAmount: Number(invoiceData.paidAmount) || 0, 
          discountAmount: Number(invoiceData.discountAmount) || 0, 
          isHold: invoiceData.isHold || false, 
          notes: invoiceData.notes || '',
          createdAt: dateToSave,
          items: { create: (invoiceData.items || []).map((item: any) => ({ productId: item.productId, quantity: Number(item.quantity), price: Number(item.price) })) }
      }
    })

    if (!invoiceData.isHold) {
        for (const item of invoiceData.items) {
            const newQty = invoiceData.isReturn ? Number(item.quantity) : -Number(item.quantity);
            await tx.productStock.upsert({
                where: { productId_branchId: { productId: item.productId, branchId: branchId } },
                update: { quantity: { increment: newQty } },
                create: { productId: item.productId, branchId: branchId, quantity: newQty }
            });
        }
    }
  })
  revalidateAll(); return { id: invoiceId };
}

export async function deleteInvoice(id: string) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const existing = await prisma.invoice.findUnique({ where: { id }, include: { items: true } })
  if (!existing || existing.userId !== userId) return;

  const branches = await getBranches();
  const branchId = existing.branchId || branches[0].id;

  await prisma.$transaction(async (tx: any) => {
      if (!existing.isHold) {
          for (const item of existing.items) {
              const reverseQty = existing.isReturn ? -item.quantity : item.quantity;
              await tx.productStock.updateMany({
                  where: { productId: item.productId, branchId: branchId },
                  data: { quantity: { increment: reverseQty } }
              });
          }
      }
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } })
      await tx.invoice.delete({ where: { id } })
  });
  revalidateAll()
}

export async function bulkMakeActive(invoiceIds: string[]) {
  const auth = await getAuth();
  const userId = auth.tenantId; 
  const myInvoices = await prisma.invoice.findMany({ where: { userId }, include: { items: true } }); 
  const validInvs = myInvoices.filter((i: any) => invoiceIds.includes(i.id));
  
  const branches = await getBranches();
  
  await prisma.$transaction(async (tx: any) => {
      for (const inv of validInvs) {
          await tx.invoice.update({ where: { id: inv.id }, data: { isHold: false } });
          const branchId = inv.branchId || branches[0].id;
          
          for (const item of inv.items) {
              const stockChange = inv.isReturn ? item.quantity : -item.quantity;
              await tx.productStock.upsert({
                  where: { productId_branchId: { productId: item.productId, branchId: branchId } },
                  update: { quantity: { increment: stockChange } },
                  create: { productId: item.productId, branchId: branchId, quantity: stockChange }
              });
          }
      }
  });
  revalidateAll();
}

export async function bulkUpdatePayments(updates: { id: string, paidAmount: number, discountAmount: number }[]) {
  const auth = await getAuth();
  const userId = auth.tenantId; const myInvoices = await prisma.invoice.findMany({ where: { userId } }); const validUpdates = updates.filter(u => myInvoices.some((i: any) => i.id === u.id));
  await prisma.$transaction( validUpdates.map((u: any) => prisma.invoice.update({ where: { id: u.id }, data: { paidAmount: Number(u.paidAmount) || 0, discountAmount: Number(u.discountAmount) || 0, isHold: false } })) ); revalidateAll();
}

export async function processSmartReturn(originalInvoiceId: string, returnItems: any[], totalReturnAmount: number, customerId: string, returnDate?: string) {
  const auth = await getAuth();
  const userId = auth.tenantId; 
  const dateToSave = returnDate ? new Date(returnDate) : new Date();
  const branches = await getBranches();
  const branchId = auth.role === 'STAFF' && auth.branchId ? auth.branchId : (branches.find((b: any) => b.type === 'HeadOffice')?.id || branches[0].id);

  await prisma.$transaction(async (tx: any) => {
      const nextId = await getNextInvoiceId(tx);
      await tx.invoice.create({ 
          data: { 
              id: nextId,
              customer: { connect: { id: customerId } },
              user: { connect: { id: userId } },
              branch: { connect: { id: branchId } },
              isReturn: true, totalAmount: Number(totalReturnAmount) || 0, paidAmount: 0, discountAmount: 0, createdAt: dateToSave, 
              items: { create: returnItems.map((item: any) => ({ productId: item.productId, quantity: Number(item.quantity), price: Number(item.price) })) } 
          } 
      });

      for (const item of returnItems) {
          await tx.productStock.upsert({
              where: { productId_branchId: { productId: item.productId, branchId: branchId } },
              update: { quantity: { increment: Number(item.quantity) } },
              create: { productId: item.productId, branchId: branchId, quantity: Number(item.quantity) }
          });
      }
  })
  revalidateAll()
}

export async function getCustomerBalance(customerId: string) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer || customer.userId !== userId) return 0;

  const invoices = await prisma.invoice.findMany({ where: { customerId, userId, isHold: false } })
  
  const invoiceBalance = invoices.reduce((acc: number, inv: any) => { 
      if (inv.isReturn) return acc - inv.totalAmount;
      if (inv.totalAmount === 0) return acc - (inv.paidAmount || 0) - (inv.discountAmount || 0);
      return acc + inv.totalAmount - (inv.paidAmount || 0);
  }, 0)
  return Number(customer.openingBalance || 0) + invoiceBalance 
}

export async function getCustomerInvoices(customerId: string) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  return await prisma.invoice.findMany({ where: { customerId, userId, isReturn: false, isHold: false }, include: { items: { include: { product: true } }, customer: true }, orderBy: { createdAt: 'desc' } })
}

export async function searchInvoices(query: string) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  if (!query) return []
  return await prisma.invoice.findMany({ where: { userId, OR: [ { id: { contains: query, mode: 'insensitive' } }, { customer: { name: { contains: query, mode: 'insensitive' } } }, { customer: { phone: { contains: query, mode: 'insensitive' } } } ] }, include: { customer: true, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' }, take: 20 })
}

export async function getDashboardStats(from?: Date, to?: Date) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const dateFilter = (from && to) ? { createdAt: { gte: from, lte: to } } : {}
  const invoicesInPeriod = await prisma.invoice.findMany({ where: { userId, ...dateFilter }, include: { items: { include: { product: true } } } })
  
  let revenue = 0; let returns = 0; let costOfGoods = 0; let salesCount = 0; let holdCount = 0;
  let voucherCount = 0; let periodReceivable = 0; 
  
  invoicesInPeriod.forEach((inv: any) => {
    if (inv.isHold) { holdCount++; return; } 
    if (inv.isReturn) {
        returns += Number(inv.totalAmount);
        periodReceivable -= Number(inv.totalAmount);
    } else if (inv.totalAmount === 0) {
        voucherCount++; 
        periodReceivable -= (Number(inv.paidAmount || 0) + Number(inv.discountAmount || 0));
    } else { 
        revenue += Number(inv.totalAmount); 
        salesCount++; 
        inv.items.forEach((item: any) => costOfGoods += (Number(item.product?.cost || 0) * Number(item.quantity)));
        periodReceivable += (Number(inv.totalAmount) - Number(inv.paidAmount || 0));
    }
  })
  
  const customers = await prisma.customer.findMany({ where: { userId } }); 
  const allInvoices = await prisma.invoice.findMany({ where: { userId, isHold: false } }) 
  
  let trueMarketReceivable = customers.reduce((sum: number, c: any) => sum + Number(c.openingBalance || 0), 0)

  allInvoices.forEach((inv: any) => { 
      if (inv.isReturn) trueMarketReceivable -= Number(inv.totalAmount);
      else if (inv.totalAmount === 0) trueMarketReceivable -= (Number(inv.paidAmount || 0) + Number(inv.discountAmount || 0));
      else trueMarketReceivable += (Number(inv.totalAmount) - Number(inv.paidAmount || 0));
  })
  
  return { 
      revenue, returns, netRevenue: revenue - returns, profit: (revenue - returns) - costOfGoods, 
      salesCount, holdCount, margin: revenue > 0 ? (((revenue - returns - costOfGoods) / (revenue - returns)) * 100).toFixed(1) : 0, 
      customerCount: customers.length, totalReceivable: trueMarketReceivable, periodReceivable, voucherCount 
  }
}

export async function getLedgerReportData(from?: Date, to?: Date) {
    const auth = await getAuth();
    const userId = auth.tenantId;
    const start = from ? new Date(from) : new Date(0)
    const end = to ? new Date(to) : new Date()
    end.setHours(23, 59, 59, 999)
  
    let periodRevenue = 0; let periodCost = 0;
    const productSales: Record<string, any> = {}

    const customers = await prisma.customer.findMany({ where: { userId }, orderBy: { id: 'asc' } })
    const allInvoicesRaw = await prisma.invoice.findMany({ where: { userId }, include: { items: { include: { product: true } } } })
  
    const activeInvoices = allInvoicesRaw.filter((i: any) => !i.isHold)
    const holdInvoices = allInvoicesRaw.filter((i: any) => i.isHold)

    const customerLedgers = customers.map((cust: any) => {
      let openingBalance = Number(cust.openingBalance || 0); let invoicedAmount = 0; let paidAmount = 0; let returnAmount = 0;
      activeInvoices.filter((inv: any) => inv.customerId === cust.id).forEach((inv: any) => {
        const invDate = new Date(inv.createdAt)
        const voucherCredit = inv.totalAmount === 0 ? (Number(inv.paidAmount || 0) + Number(inv.discountAmount || 0)) : 0;

        if (invDate < start) { 
            if (inv.isReturn) openingBalance -= Number(inv.totalAmount); 
            else if (inv.totalAmount === 0) openingBalance -= voucherCredit;
            else openingBalance += (Number(inv.totalAmount) - Number(inv.paidAmount || 0)) 
        } 
        else if (invDate <= end) { 
            if (inv.isReturn) returnAmount += Number(inv.totalAmount); 
            else if (inv.totalAmount === 0) paidAmount += voucherCredit;
            else { invoicedAmount += Number(inv.totalAmount); paidAmount += Number(inv.paidAmount || 0) } 
        }
      })
      return { id: cust.id, name: cust.name, category: cust.category || 'Uncategorized', openingBalance, invoicedAmount, returnAmount, paidAmount, closingBalance: openingBalance + invoicedAmount - returnAmount - paidAmount }
    })

    const categoryMap: Record<string, any> = {}
    customerLedgers.forEach((c: any) => {
        const cat = c.category || 'Uncategorized';
        if (!categoryMap[cat]) categoryMap[cat] = { category: cat, customers: [], openingBalance: 0, invoicedAmount: 0, returnAmount: 0, paidAmount: 0, closingBalance: 0 }
        categoryMap[cat].customers.push(c); 
        categoryMap[cat].openingBalance += c.openingBalance; categoryMap[cat].invoicedAmount += c.invoicedAmount; 
        categoryMap[cat].returnAmount += c.returnAmount; categoryMap[cat].paidAmount += c.paidAmount; categoryMap[cat].closingBalance += c.closingBalance
    })
  
    activeInvoices.forEach((inv: any) => {
       const invDate = new Date(inv.createdAt)
       if (invDate >= start && invDate <= end && !inv.isReturn && inv.totalAmount > 0) {
           periodRevenue += Number(inv.totalAmount)
           inv.items.forEach((item: any) => {
               const pId = item.productId; const pCost = Number(item.product?.cost || 0); periodCost += (pCost * Number(item.quantity))
               if (!productSales[pId]) productSales[pId] = { id: pId, name: item.product?.name || 'Unknown', category: item.product?.category || 'Uncategorized', unit: item.product?.unit || 'Pcs', qty: 0, revenue: 0, cost: 0 }
               productSales[pId].qty += Number(item.quantity); productSales[pId].revenue += (Number(item.price) * Number(item.quantity)); productSales[pId].cost += (pCost * Number(item.quantity))
           })
       }
    })

  const productCategoryMap: Record<string, any> = {}
  Object.values(productSales).forEach((p: any) => {
      const cat = p.category || 'Uncategorized';
      if (!productCategoryMap[cat]) productCategoryMap[cat] = { category: cat, products: [], totalQty: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 };
      const profit = p.revenue - p.cost;
      productCategoryMap[cat].products.push({...p, profit});
      productCategoryMap[cat].totalQty += p.qty; 
      productCategoryMap[cat].totalRevenue += p.revenue; 
      productCategoryMap[cat].totalCost += p.cost; 
      productCategoryMap[cat].totalProfit += profit;
  });
  Object.values(productCategoryMap).forEach((c: any) => c.products.sort((a:any, b:any) => b.revenue - a.revenue));

    return {
        customerLedgers, 
        categoryLedgers: Object.values(categoryMap).sort((a:any, b:any) => a.category.localeCompare(b.category)),
        productSales: Object.values(productSales).sort((a:any, b:any) => b.revenue - a.revenue),
        allProducts: await prisma.product.findMany({ where: { userId }, orderBy: { id: 'asc' } }),
        allCustomers: customers,
        productCategoryLedgers: Object.values(productCategoryMap).sort((a:any, b:any) => a.category.localeCompare(b.category)),
        holdInvoices,
        stats: { revenue: periodRevenue, profit: periodRevenue - periodCost, margin: periodRevenue > 0 ? (((periodRevenue - periodCost) / periodRevenue) * 100).toFixed(1) : 0, receivables: customerLedgers.reduce((sum: number, c: any) => sum + c.closingBalance, 0) }
    }
}

export async function createVouchers(vouchers: { customerId: string, amount: number, discount?: number, notes?: string }[], voucherDate?: string) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const dateToSave = voucherDate ? new Date(voucherDate) : new Date()

  await prisma.$transaction(async (tx: any) => {
      const baseIdNum = parseInt(await getNextInvoiceId(tx), 10);
      for (let i = 0; i < vouchers.length; i++) {
          const v = vouchers[i];
          await tx.invoice.create({
              data: { 
                  id: String(baseIdNum + i).padStart(5, '0'),
                  customer: { connect: { id: v.customerId } }, 
                  user: { connect: { id: userId } },
                  totalAmount: 0, 
                  paidAmount: Number(v.amount), 
                  discountAmount: Number(v.discount || 0), 
                  isReturn: false, 
                  isHold: false, 
                  notes: v.notes || '',
                  createdAt: dateToSave, 
                  items: { create: [] } 
              }
          })
      }
  })
  revalidateAll()
}

export async function updateVoucher(id: string, amount: number, voucherDate?: string, discount?: number, notes?: string) {
  const auth = await getAuth();
  const userId = auth.tenantId;
  const dataToUpdate: any = { paidAmount: Number(amount), discountAmount: Number(discount || 0), notes: notes || '' }
  if (voucherDate) dataToUpdate.createdAt = new Date(voucherDate)
  await prisma.invoice.updateMany({ where: { id, userId, totalAmount: 0 }, data: dataToUpdate })
  revalidateAll()
}

export async function getWhatsAppLedgerHistory(customerId: string) {
    const auth = await getAuth();
    const userId = auth.tenantId;
    return await prisma.invoice.findMany({ 
        where: { customerId, userId, isHold: false }, 
        orderBy: { createdAt: 'asc' } 
    });
}

export async function createStockTransfer(fromBranchId: string, toBranchId: string, items: { productId: string, quantity: number }[]) {
    const auth = await getAuth();
    const userId = auth.tenantId;
    const finalFromBranchId = auth.role === 'STAFF' && auth.branchId ? auth.branchId : fromBranchId;
    
    await prisma.stockTransfer.create({
        data: {
            fromBranchId: finalFromBranchId,
            toBranchId,
            userId,
            status: "Pending",
            items: {
                create: items.map((i: any) => ({ productId: i.productId, quantity: Number(i.quantity) }))
            }
        }
    });

    await prisma.notification.create({
        data: {
            title: 'Stock Transfer Initiated',
            message: `Items are pending acceptance.`,
            type: 'TRANSFER',
            userId: userId
        }
    });
    
    revalidateAll();
    return { success: true };
}

export async function acceptStockTransfer(transferId: string) {
    const auth = await getAuth();
    const userId = auth.tenantId;
    const transfer = await prisma.stockTransfer.findUnique({ 
        where: { id: transferId }, 
        include: { items: true } 
    });

    if (!transfer || transfer.userId !== userId || transfer.status !== 'Pending') {
        return { error: "Transfer invalid hai." };
    }

    await prisma.$transaction(async (tx: any) => {
        await tx.stockTransfer.update({ 
            where: { id: transferId }, 
            data: { status: 'Accepted', acceptDate: new Date() } 
        });

        for (const item of transfer.items) {
            await tx.productStock.updateMany({
                where: { productId: item.productId, branchId: transfer.fromBranchId },
                data: { quantity: { decrement: item.quantity } }
            });

            await tx.productStock.upsert({
                where: { productId_branchId: { productId: item.productId, branchId: transfer.toBranchId } },
                update: { quantity: { increment: item.quantity } },
                create: { productId: item.productId, branchId: transfer.toBranchId, quantity: item.quantity }
            });
        }
        
        await tx.notification.create({
            data: {
                title: 'Stock Transfer Accepted',
                message: `Inventory updated successfully.`,
                type: 'SYSTEM',
                userId: userId
            }
        });
    });

    revalidateAll();
    return { success: true };
}

export async function rejectStockTransfer(transferId: string) {
    const auth = await getAuth();
    const userId = auth.tenantId;
    await prisma.stockTransfer.updateMany({
        where: { id: transferId, userId, status: 'Pending' },
        data: { status: 'Rejected' }
    });
    revalidateAll();
}

export async function getStockTransfers() {
    const auth = await getAuth();
    const userId = auth.tenantId;
    return await prisma.stockTransfer.findMany({
        where: { userId },
        include: { 
            fromBranch: true, 
            toBranch: true, 
            items: { include: { product: true } } 
        },
        orderBy: { transferDate: 'desc' }
    });
}

// ==========================================
// NOTIFICATIONS LOGIC
// ==========================================
export async function getNotifications() {
    const auth = await getAuth();
    return await prisma.notification.findMany({
        where: { userId: auth.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
}

export async function markNotificationsAsRead() {
    const auth = await getAuth();
    await prisma.notification.updateMany({
        where: { userId: auth.tenantId, isRead: false },
        data: { isRead: true }
    });
    revalidateAll();
}
// ==========================================
// FUND TRANSFERS (JOURNAL ENTRIES)
// ==========================================
export async function createFundTransfer(fromCustomerId: string, toCustomerId: string, amount: number, notes: string, transferDate?: string) {
    const auth = await getAuth();
    const userId = auth.tenantId;
    const dateToSave = transferDate ? new Date(transferDate) : new Date();

    await prisma.$transaction(async (tx: any) => {
        // Professional JV (Journal Voucher) Number Generation
        const jvInvoices = await tx.invoice.findMany({
            where: { id: { startsWith: 'JV-' }, userId },
            select: { id: true }
        });
        let maxJv = 0;
        for (const inv of jvInvoices) {
            const numPart = parseInt(inv.id.replace('JV-', '').replace('-A', '').replace('-B', ''), 10);
            if (!isNaN(numPart) && numPart > maxJv) maxJv = numPart;
        }
        const nextJvNum = String(maxJv + 1).padStart(5, '0');
        
        // 1. From Account (Sender - Balance badhega / Debit) - Part A
        await tx.invoice.create({
            data: {
                id: `JV-${nextJvNum}-A`,
                customer: { connect: { id: fromCustomerId } },
                user: { connect: { id: userId } },
                totalAmount: 0,
                paidAmount: -Number(amount), 
                discountAmount: 0,
                isReturn: false, isHold: false,
                notes: `TO: ${toCustomerId} | ${notes}`,
                createdAt: dateToSave,
                items: { create: [] }
            }
        });

        // 2. To Account (Receiver - Balance kam hoga / Credit) - Part B
        await tx.invoice.create({
            data: {
                id: `JV-${nextJvNum}-B`,
                customer: { connect: { id: toCustomerId } },
                user: { connect: { id: userId } },
                totalAmount: 0,
                paidAmount: Number(amount), 
                discountAmount: 0,
                isReturn: false, isHold: false,
                notes: `FROM: ${fromCustomerId} | ${notes}`,
                createdAt: dateToSave,
                items: { create: [] }
            }
        });
    });
    revalidateAll();
    return { success: true };
}

export async function getFundTransfers() {
    const auth = await getAuth();
    return await prisma.invoice.findMany({
        where: { userId: auth.tenantId, id: { startsWith: 'JV-' } },
        include: { customer: true },
        orderBy: { createdAt: 'desc' }
    });
}

export async function deleteFundTransfer(jvBaseId: string) {
    const auth = await getAuth();
    await prisma.invoice.deleteMany({
        where: { userId: auth.tenantId, id: { startsWith: jvBaseId } }
    });
    revalidateAll();
}
export async function updateFundTransfer(jvBaseId: string, fromCustomerId: string, toCustomerId: string, amount: number, notes: string, transferDate?: string) {
    const auth = await getAuth();
    const userId = auth.tenantId;
    const dateToSave = transferDate ? new Date(transferDate) : new Date();

    await prisma.$transaction(async (tx: any) => {
        // Purani entries delete karein
        await tx.invoice.deleteMany({ 
            where: { userId, id: { in: [`${jvBaseId}-A`, `${jvBaseId}-B`] } } 
        });

        // Nayi updated entries banayein usi JV ID ke sath
        await tx.invoice.create({
            data: {
                id: `${jvBaseId}-A`,
                customer: { connect: { id: fromCustomerId } },
                user: { connect: { id: userId } },
                totalAmount: 0, paidAmount: -Number(amount), discountAmount: 0,
                isReturn: false, isHold: false,
                notes: `TO: ${toCustomerId} | ${notes}`,
                createdAt: dateToSave, items: { create: [] }
            }
        });

        await tx.invoice.create({
            data: {
                id: `${jvBaseId}-B`,
                customer: { connect: { id: toCustomerId } },
                user: { connect: { id: userId } },
                totalAmount: 0, paidAmount: Number(amount), discountAmount: 0,
                isReturn: false, isHold: false,
                notes: `FROM: ${fromCustomerId} | ${notes}`,
                createdAt: dateToSave, items: { create: [] }
            }
        });
    });
    revalidateAll();
    return { success: true };
}