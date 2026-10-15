'use client'

import { useState } from 'react'
import { createStaffUser, deleteStaffUser } from '@/actions/actions'
import { Trash2, UserPlus } from 'lucide-react'

export default function UserManager({ staff, branches }: { staff: any[], branches: any[] }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [branchId, setBranchId] = useState(branches.find((b: any) => b.type === 'Branch')?.id || '')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        const res = await createStaffUser(username, password, branchId)
        if (res?.error) alert(res.error)
        else {
            setUsername('')
            setPassword('')
            alert('Staff account created successfully')
        }
        setIsSubmitting(false)
    }

    const handleDelete = async (id: string) => {
        if (confirm('Delete this user?')) {
            await deleteStaffUser(id)
        }
    }

    return (
        <div className="w-full space-y-8">
            <form onSubmit={handleAdd} className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200">
                <h2 className="text-xl font-black uppercase text-slate-900 mb-6 flex items-center gap-2"><UserPlus size={24}/> Add Branch Staff</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Staff Username</label>
                        <input type="text" required value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. gujrat_user" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 lowercase" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Password</label>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Assign Branch</label>
                        <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600">
                            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition disabled:opacity-50">
                    {isSubmitting ? 'Creating...' : 'Create Staff Account'}
                </button>
            </form>

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200">
                <h2 className="text-xl font-black uppercase text-slate-900 mb-6">Active Staff Accounts</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200">
                            <tr>
                                <th className="p-4">Username</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Assigned Branch</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-bold text-slate-700 divide-y divide-slate-100">
                            {staff.map((s: any) => (
                                <tr key={s.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 text-slate-900">{s.email}</td>
                                    <td className="p-4"><span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{s.role}</span></td>
                                    <td className="p-4 text-emerald-700 uppercase text-xs">{s.assignedBranch?.name || '---'}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleDelete(s.id)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                            {staff.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No staff accounts created yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}