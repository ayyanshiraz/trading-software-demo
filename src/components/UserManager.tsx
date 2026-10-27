'use client'

import { useState } from 'react'
import { Trash2, UserPlus, Shield, Store } from 'lucide-react'
import { createStaffUser, deleteStaffUser } from '@/actions/actions'

export default function UserManager({ staff = [], branches = [] }: { staff: any[], branches: any[] }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    
    // HeadOffice ya pehli branch ko default select rakhne ka logic taake backend error na de
    const defaultBranchId = branches[0]?.id || ''
    const [branchId, setBranchId] = useState(defaultBranchId)
    
    const [isSaving, setIsSaving] = useState(false)

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username || !password) return alert('Please fill in all fields.')
        
        setIsSaving(true)
        try {
            const res = await createStaffUser(username, password, branchId || defaultBranchId)
            if (res?.error) {
                alert(res.error)
            } else {
                setUsername('')
                setPassword('')
                alert('Staff account created successfully.')
            }
        } catch (err) {
            alert('Error creating staff account.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this staff account?')) {
            await deleteStaffUser(id)
        }
    }

    return (
        <div className="w-full space-y-8">
            <form onSubmit={handleCreateStaff} className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl">
                        <UserPlus size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase text-slate-900">Add Staff Account</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Create new credentials for store counter operations</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Staff Username</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            placeholder="e.g. counter_staff" 
                            required 
                            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 text-sm" 
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Password</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            placeholder="Enter secure password" 
                            required 
                            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 text-sm" 
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Store Location / Inventory Source</label>
                    
                    {/* BACKEND LOGIC KE LIYE HIDDEN SELECT TAG */}
                    <div className="hidden">
                        <select value={branchId} onChange={e => setBranchId(e.target.value)}>
                            {branches.map((b: any) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* UI KE LIYE CLEAN SINGLE-STORE LABEL */}
                    <div className="w-full p-3.5 bg-slate-100 border border-slate-300 rounded-xl font-black text-slate-800 text-sm uppercase flex items-center gap-2">
                        <Store size={16} className="text-slate-600" /> Main Inventory Store
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={isSaving} 
                    className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase tracking-widest transition shadow-lg disabled:opacity-50 text-xs"
                >
                    {isSaving ? 'Creating Account...' : 'Create Staff Account'}
                </button>
            </form>

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="p-3 bg-slate-100 text-slate-800 rounded-2xl">
                        <Shield size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase text-slate-900">Active Staff Accounts</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Manage existing team members and permissions</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200">
                            <tr>
                                <th className="p-4">Username</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Store Location</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-bold text-slate-700 divide-y divide-slate-100">
                            {staff.map((s: any) => (
                                <tr key={s.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 text-slate-900 font-black uppercase">{s.name || s.email}</td>
                                    <td className="p-4">
                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-black uppercase">
                                            {s.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs font-black uppercase text-emerald-700">
                                        Main Inventory Store
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => handleDelete(s.id)} 
                                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition inline-flex items-center justify-center shadow-sm"
                                            title="Delete Account"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {staff.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                        No active staff accounts found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}