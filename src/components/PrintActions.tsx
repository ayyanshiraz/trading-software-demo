'use client'

import { Printer, Share2 } from 'lucide-react'

export default function PrintActions({ id, phone, amount, customer }: { id: string, phone: string, amount: number, customer: string }) {
  
  // WhatsApp Logic
  const handleWhatsApp = () => {
    const cleanPhone = phone.replace(/\D/g, '').replace(/^0/, '92')
    
    if (!cleanPhone) return alert('No phone number found for this customer.')

    const message = `*Trading Software Invoice*\n\nInvoice: ${id}\nCustomer: ${customer}\nTotal: ${amount.toLocaleString()}\n\nPlease click to view details.`
    const link = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    
    window.open(link, '_blank')
  }

  return (
    <div className="flex gap-4 mb-8 no-print print:hidden">
      <button 
        onClick={() => window.print()} 
        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-black transition"
      >
        <Printer size={18} /> Print Invoice
      </button>

      <button 
        onClick={handleWhatsApp}
        className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-green-700 transition"
      >
        <Share2 size={18} /> Share on WhatsApp
      </button>
    </div>
  )
}