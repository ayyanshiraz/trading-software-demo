'use client'

import { useState } from 'react'
import { login } from '@/actions/auth'
import { Eye, EyeOff, Lock, User } from 'lucide-react'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-4 shadow-lg">FT</div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 font-bold text-sm mt-1">Fahad Traders Management System</p>
        </div>

        <form action={login} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Username</label>
            <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" name="username" required placeholder="admin"
                    className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 transition" />
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Password</label>
            <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                
                <input type={showPassword ? "text" : "password"} name="password" required placeholder="••••••••"
                    className="w-full pl-12 pr-12 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 transition" />
                
                {/* THE EYE ICON TOGGLE */}
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
          </div>

          <button type="submit" className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white bg-slate-900 hover:bg-black transition shadow-lg mt-4">
            Sign In to Dashboard
          </button>
        </form>

      </div>
    </div>
  )
}