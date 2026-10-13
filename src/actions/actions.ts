'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const prisma = new PrismaClient()

async function getUser() {
  const session = await verifySession()
  return session.userId
}

function revalidateAll() {
  revalidatePath('/') 
  revalidatePath('/invoices')
  revalidatePath('/invoice/hold')
  revalidatePath('/ledger')
  revalidatePath('/products')
  revalidatePath('/customers')
  revalidatePath('/receivables')
}

export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.delete('session') 
  redirect('/login')
}

// Global ID Generator
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

// ==========================================
// 1. PRODUCT ACTIONS
// ==========================================
export async function saveProduct(formData: FormData) {
  const userId = await getUser()
  const originalId = formData.get('originalId') as string 
  let id = formData.get('id') as string
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const unit = formData.get('unit') as string || 'Bags' 
  const cost = Number(formData.get('cost')) || 0
  const price = Number(formData.get('price')) || 0 

  if (!id || id.trim() === '') id = `PROD-${Math.floor(Math.random() * 100000)}`

  if (originalId && originalId !== id) {
      const existing = await prisma.product.findUnique({ where: { id: originalId } })
      if (existing?.userId !== userId) return { error: "Unauthorized" }
      try { await prisma.product.update({ where: { id: originalId }, data: { id, name, category, unit, cost, price } }) } 
      catch (e) { return { error: "Cannot change Product ID because it is currently linked to past invoices." } }
  } else {
      const existing = await prisma.product.findUnique({ where: { id } })
      if (existing) { 
          if (existing.userId !== userId) return { error: "This Product ID is already in use by the system. Please type a different ID." }
          else await prisma.product.update({ where: { id }, data: { name, category, unit, cost, price } }) 
      } else { 
          await prisma.product.create({ data: { id, name, category, unit, cost, price, stock: 1000, user: { connect: { id: userId } } } }) 
      }
  }
  revalidateAll(); return { success: true }
}

export async function deleteProduct(id: string) {
  const userId = await getUser()
  const existing = await prisma.product.findUnique({ where: { id } })
  if (existing?.userId === userId) { 
      try { 
          await prisma.invoiceItem.deleteMany({ where: { productId: id } })
          await prisma.product.delete({ where: { id } }) 
          revalidateAll(); 
          return { success: true } 
      } 
      catch(error) { return { error: "Failed to force delete product." } }
  }
  return { error: "Unauthorized" }
}

export async function bulkUpdateProductPrices(updates: { id: string, cost: number, price: number }[]) {
  const userId = await getUser()
  const myProducts = await prisma.product.findMany({ where: { userId } })
  const myProductIds = myProducts.map((p: any) => p.id)
  const validUpdates = updates.filter(u => myProductIds.includes(u.id))
  await prisma.$transaction( validUpdates.map((update: any) => prisma.product.update({ where: { id: update.id }, data: { cost: Number(update.cost) || 0, price: Number(update.price) || 0 } })) )
  revalidateAll() 
}

// ==========================================
// 2. CATEGORY & CUSTOMER ACTIONS
// ==========================================
export async function addProductCategory(formData: FormData) {
  const userId = await getUser()
  const originalId = formData.get('originalId') as string
  const name = formData.get('name') as string
  let id = formData.get('id') as string
  if (!id || id.trim() === '') id = `PCAT-${Math.floor(Math.random() * 100000)}`

  if (originalId && originalId !== id) {
      await prisma.productCategory.update({ where: { id: originalId }, data: { id, name } })
  } else {
      const existing = await prisma.productCategory.findUnique({ where: { id }})
      if (existing) {
          if (existing.userId !== userId) return { error: "This Category ID is already in use." }
          else await prisma.productCategory.update({ where: { id }, data: { name } }) 
      } else await prisma.productCategory.create({ data: { id, name, userId } }) 
  }
  revalidateAll(); return { success: true }
}

export async function deleteProductCategory(id: string) {
  const userId = await getUser()
  const existing = await prisma.productCategory.findUnique({ where: { id }})
  if (existing?.userId === userId) await prisma.productCategory.delete({ where: { id } }) 
  revalidateAll()
}

export async function saveCustomer(formData: FormData) {
  const userId = await getUser()
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
      catch (e) { return { error: "Cannot change Customer ID because it is currently linked to past invoices." } }
  } else {
      const existing = await prisma.customer.findUnique({ where: { id } })
      if (existing) { 
          if (existing.userId !== userId) return { error: "This Customer ID is already in use. Please type a different ID." }
          else await prisma.customer.update({ where: { id }, data: { name, phone, address, category, openingBalance } }) 
      } else await prisma.customer.create({ data: { id, name, phone, address, category, openingBalance, user: { connect: { id: userId } } } }) 
  }
  revalidateAll(); return { success: true }
}

export async function deleteCustomer(id: string) {
  const userId = await getUser()
  const existing = await prisma.customer.findUnique({ where: { id } })
  
  if (existing?.userId === userId) { 
      try { 
          const customerInvoices = await prisma.invoice.findMany({ where: { customerId: id } })
          const invoiceIds = customerInvoices.map(i => i.id)

          if (invoiceIds.length > 0) {
              await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } })
          }
          await prisma.invoice.deleteMany({ where: { customerId: id } })
          await prisma.customer.delete({ where: { id } }); 
          
          revalidateAll(); 
          return { success: true } 
      } 
      catch (error) { return { error: "Failed to force delete customer." } } 
  }
  return { error: "Unauthorized" }
}

export async function addCustomerCategory(formData: FormData) {
  const userId = await getUser()
  const originalId = formData.get('originalId') as string
  const name = formData.get('name') as string
  let id = formData.get('id') as string
  if (!id || id.trim() === '') id = `CCAT-${Math.floor(Math.random() * 100000)}`

  if (originalId && originalId !== id) {
      await prisma.customerCategory.update({ where: { id: originalId }, data: { id, name } })
  } else {
      const existing = await prisma.customerCategory.findUnique({ where: { id }})
      if (existing) { 
          if (existing.userId !== userId) return { error: "This Category ID is already in use." }
          else await prisma.customerCategory.update({ where: { id }, data: { name } }) 
      } else await prisma.customerCategory.create({ data: { id, name, userId } }) 
  }
  revalidateAll(); return { success: true }
}

export async function deleteCustomerCategory(id: string) {
  const userId = await getUser()
  const existing = await prisma.customerCategory.findUnique({ where: { id }})
  if (existing?.userId === userId) await prisma.customerCategory.delete({ where: { id } }) 
  revalidateAll()
}

// ==========================================
// 3. INVOICE & RETURN LOGIC
// ==========================================
export async function createInvoice(invoiceData: any) {
  const userId = await getUser()
  const dateToSave = invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : new Date()
  
  const result = await prisma.$transaction(async (tx: any) => {
    const nextId = await getNextInvoiceId(tx);
    return await tx.invoice.create({
      data: {
        id: nextId,
        customer: { connect: { id: invoiceData.customerId } }, 
        user: { connect: { id: userId } },
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
  })
  revalidateAll(); return result;
}

export async function updateInvoice(invoiceId: string, invoiceData: any) {
  const userId = await getUser()
  const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } })
  if (existing?.userId !== userId) throw new Error("Unauthorized")

  const dateToSave = invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : existing.createdAt

  await prisma.$transaction(async (tx: any) => {
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
  })
  revalidateAll(); return { id: invoiceId };
}

export async function deleteInvoice(id: string) {
  const userId = await getUser()
  const existing = await prisma.invoice.findUnique({ where: { id } })
  if (existing?.userId === userId) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
      await prisma.invoice.delete({ where: { id } })
  }
  revalidateAll()
}

export async function bulkMakeActive(invoiceIds: string[]) {
  const userId = await getUser(); const myInvoices = await prisma.invoice.findMany({ where: { userId } }); const validIds = myInvoices.filter((i: any) => invoiceIds.includes(i.id)).map((i: any) => i.id);
  await prisma.$transaction( validIds.map(id => prisma.invoice.update({ where: { id }, data: { isHold: false } })) ); revalidateAll();
}

export async function bulkUpdatePayments(updates: { id: string, paidAmount: number, discountAmount: number }[]) {
  const userId = await getUser(); const myInvoices = await prisma.invoice.findMany({ where: { userId } }); const validUpdates = updates.filter(u => myInvoices.some((i: any) => i.id === u.id));
  await prisma.$transaction( validUpdates.map(u => prisma.invoice.update({ where: { id: u.id }, data: { paidAmount: Number(u.paidAmount) || 0, discountAmount: Number(u.discountAmount) || 0, isHold: false } })) ); revalidateAll();
}

export async function processSmartReturn(originalInvoiceId: string, returnItems: any[], totalReturnAmount: number, customerId: string, returnDate?: string) {
  const userId = await getUser(); 
  const dateToSave = returnDate ? new Date(returnDate) : new Date();
  await prisma.$transaction(async (tx: any) => {
      const nextId = await getNextInvoiceId(tx);
      await tx.invoice.create({ 
          data: { 
              id: nextId,
              customer: { connect: { id: customerId } },
              user: { connect: { id: userId } },
              isReturn: true, totalAmount: Number(totalReturnAmount) || 0, paidAmount: 0, discountAmount: 0, createdAt: dateToSave, 
              items: { create: returnItems.map((item: any) => ({ productId: item.productId, quantity: Number(item.quantity), price: Number(item.price) })) } 
          } 
      });
  })
  revalidateAll()
}

export async function getCustomerBalance(customerId: string) {
  const userId = await getUser();
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
  const userId = await getUser();
  return await prisma.invoice.findMany({ where: { customerId, userId, isReturn: false, isHold: false }, include: { items: { include: { product: true } }, customer: true }, orderBy: { createdAt: 'desc' } })
}

// ==========================================
// 4. REPORTING LOGIC
// ==========================================
export async function searchInvoices(query: string) {
  const userId = await getUser();
  if (!query) return []
  return await prisma.invoice.findMany({ where: { userId, OR: [ { id: { contains: query, mode: 'insensitive' } }, { customer: { name: { contains: query, mode: 'insensitive' } } }, { customer: { phone: { contains: query, mode: 'insensitive' } } } ] }, include: { customer: true, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' }, take: 20 })
}

export async function getDashboardStats(from?: Date, to?: Date) {
  const userId = await getUser();
  
  // 1. EXACT PERIOD MATH: Filters Revenue, Profit, Vouchers, and Period Receivables
  const dateFilter = (from && to) ? { createdAt: { gte: from, lte: to } } : {}
  const invoicesInPeriod = await prisma.invoice.findMany({ where: { userId, ...dateFilter }, include: { items: { include: { product: true } } } })
  
  let revenue = 0; let returns = 0; let costOfGoods = 0; let salesCount = 0; let holdCount = 0;
  let voucherCount = 0; 
  let periodReceivable = 0; // Net new debt generated strictly in this timeframe
  
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
  
  // 2. ALL TIME MATH: Calculates the true running market balance
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
      customerCount: customers.length, 
      totalReceivable: trueMarketReceivable, // All-Time Balance
      periodReceivable,                      // Strictly Date Filtered Balance
      voucherCount 
  }
}

export async function getLedgerReportData(from?: Date, to?: Date) {
    const userId = await getUser();
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
               if (!productSales[pId]) productSales[pId] = { id: pId, name: item.product?.name || 'Unknown', category: item.product?.category || 'Uncategorized', unit: item.product?.unit || 'Bags', qty: 0, revenue: 0, cost: 0 }
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
  Object.values(productCategoryMap).forEach(c => c.products.sort((a:any, b:any) => b.revenue - a.revenue));

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

// ==========================================
// 5. RECEIVABLES & VOUCHERS
// ==========================================
export async function createVouchers(vouchers: { customerId: string, amount: number, discount?: number, notes?: string }[], voucherDate?: string) {
  const userId = await getUser()
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
  const userId = await getUser()
  const dataToUpdate: any = { paidAmount: Number(amount), discountAmount: Number(discount || 0), notes: notes || '' }
  if (voucherDate) dataToUpdate.createdAt = new Date(voucherDate)
  await prisma.invoice.updateMany({ where: { id, userId, totalAmount: 0 }, data: dataToUpdate })
  revalidateAll()
}
export async function getWhatsAppLedgerHistory(customerId: string) {
    const userId = await getUser();
    // 🔴 FETCHES ALL ACTIVE INVOICES (Sales, Returns, and Vouchers)
    return await prisma.invoice.findMany({ 
        where: { customerId, userId, isHold: false }, 
        orderBy: { createdAt: 'asc' } 
    });
}