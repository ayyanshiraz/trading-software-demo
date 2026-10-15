import { Bell, CheckCircle, Clock, ShoppingBag, ArrowLeftRight, AlertTriangle } from 'lucide-react'
import { getNotifications, markNotificationsAsRead } from '@/actions/actions'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const notifications = await getNotifications()
  
  const hasUnread = notifications.some((n: any) => !n.isRead)
  if (hasUnread) {
      await markNotificationsAsRead()
  }

  const getIcon = (type: string) => {
      if (type === 'SALE') return <ShoppingBag size={20} className="text-emerald-500" />
      if (type === 'TRANSFER') return <ArrowLeftRight size={20} className="text-blue-500" />
      if (type === 'ALERT') return <AlertTriangle size={20} className="text-red-500" />
      return <CheckCircle size={20} className="text-slate-500" />
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:ml-64 p-4 pt-20 lg:p-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex items-center gap-3 mb-8 border-b-2 border-slate-200 pb-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <Bell size={24} />
            </div>
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Notifications</h1>
                <p className="text-slate-500 font-bold text-sm">Real-time system alerts and business updates.</p>
            </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {notifications.length > 0 ? (
                <div className="divide-y divide-slate-100">
                    {notifications.map((note: any) => (
                        <div key={note.id} className={`p-5 transition flex items-start gap-4 ${note.isRead ? 'bg-white opacity-70' : 'bg-slate-50'}`}>
                            <div className="mt-1">
                                {getIcon(note.type)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{note.title}</h3>
                                    {!note.isRead && <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">New</span>}
                                </div>
                                <p className="text-xs font-bold text-slate-600 mt-1">{note.message}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{new Date(note.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-12 text-center">
                    <Bell size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No new notifications</p>
                </div>
            )}
        </div>

      </div>
    </div>
  )
}