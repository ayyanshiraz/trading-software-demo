'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, Package, FileText, LogOut, Tags, Receipt, BookOpen, Menu, X } from 'lucide-react'
import { logoutUser } from '@/actions/actions'
import { useEffect, useState } from 'react'

// Added ': any[]' to completely silence TypeScript's strict object checking
const navGroups: any[] = [
  {
    title: 'MAIN',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Sale Invoice', href: '/invoice/new', icon: Receipt },
      { name: 'All Invoices', href: '/invoices', icon: FileText },
    ]
  },
  {
    title: 'INVENTORY',
    items: [
      { name: 'Add Product', href: '/products', icon: Package },
      { name: 'Categories', href: '/category/product', icon: Tags },
    ]
  },
  {
    title: 'CUSTOMERS',
    items: [
      { name: 'Add Customer', href: '/customers', icon: Users },
      { name: 'Categories', href: '/category/customer', icon: Tags },
    ]
  },
  {
    title: 'FINANCE',
    items: [
      { name: 'Ledger', href: '/ledger', icon: BookOpen },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const [username, setUsername] = useState('Admin')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/user');
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data.username === 'string' && data.username.trim() !== '') {
                setUsername(data.username.charAt(0).toUpperCase() + data.username.slice(1).toLowerCase());
            }
        }
      } catch (err) {}
    };
    fetchUser();
  }, []);

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="fixed top-0 left-0 h-14 w-full bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:hidden z-[100] shadow-xl">
        <h1 className="text-white font-black text-lg uppercase tracking-tighter">Trading Software</h1>
        <button onClick={() => setIsOpen(!isOpen)} className="text-white p-1.5 hover:bg-slate-800 rounded-lg transition">
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* MOBILE OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[90] md:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`w-60 bg-slate-900 text-slate-300 h-[100dvh] fixed top-0 left-0 flex flex-col border-r border-slate-800 shadow-2xl z-[100] transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* COMPACT HEADER */}
        <div className="p-5 pt-6 pb-4 border-b border-slate-800 hidden md:block shrink-0">
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-1">Trading<br/>Software</h1>
          <p className="text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase mt-1">Management System</p>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent mt-14 md:mt-0">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <h2 className="px-3 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                {group.title}
              </h2>
              <div className="space-y-0.5">
                  {group.items.map((item: any) => {
                    const isActive = pathname === item.href || (pathname.startsWith('/invoice/edit') && item.href === '/invoices')
                    const Icon = item.icon
                    return (
                      <Link key={item.name} href={item.href} onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative
                          ${isActive 
                            ? 'bg-slate-800 text-white font-black shadow-md' 
                            : `font-bold text-slate-400 hover:bg-slate-800/50 hover:text-white ${item.color || ''}`
                          }`}
                      >
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />}
                        <Icon size={16} className={`${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'} ${!isActive && item.color ? item.color : ''}`} />
                        <span className="text-xs tracking-wide uppercase">{item.name}</span>
                      </Link>
                    )
                  })}
              </div>
            </div>
          ))}
        </nav>

        {/* FOOTER */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 shrink-0 mt-auto">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                {username.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-white leading-tight">{username}</span>
                <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest leading-tight">Active</span>
              </div>
            </div>
            <form action={logoutUser}>
              <button className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors" title="Secure Logout">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
        
      </aside>
    </>
  )
}