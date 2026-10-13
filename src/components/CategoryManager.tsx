'use client'

import { useState } from 'react'

export default function CategoryManager({ title, categories = [], saveAction, deleteAction }: { 
  title: string, 
  categories: any[], 
  saveAction: (data: FormData) => Promise<any>, 
  deleteAction: (id: string) => Promise<any> 
}) {
  const [formData, setFormData] = useState({ id: '', name: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [originalId, setOriginalId] = useState('')

  const handleEdit = (cat: any) => {
    setFormData({ id: cat.id, name: cat.name })
    setOriginalId(cat.id)
    setIsEditing(true)
  }

  const handleDelete = async (id: string) => {
    if(confirm('Are you sure you want to delete this category?')) {
        const res = await deleteAction(id)
        if (res?.error) alert(res.error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="p-6 md:p-8 bg-white rounded-3xl shadow-xl border border-slate-200 mb-10">
        <h1 className="text-2xl font-black mb-6 text-slate-900 uppercase tracking-tight">
          {isEditing ? `Edit ${title}` : `Add New ${title}`}
        </h1>
        
        <form action={async (data) => { 
            const res = await saveAction(data); 
            if (res?.error) {
                alert(res.error)
            } else {
                setFormData({id:'', name:''}); 
                setIsEditing(false); 
                setOriginalId('');
            }
        }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <input type="hidden" name="originalId" value={originalId} />

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Category ID (Optional)</label>
            {/* FIX: Removed readOnly so you can change the ID freely */}
            <input type="text" name="id" value={formData.id} onChange={(e) => setFormData({...formData, id: e.target.value})}
              placeholder="e.g. CAT-001"
              className="w-full rounded-xl border-2 bg-slate-50 border-slate-200 p-4 font-bold text-slate-900 outline-none focus:border-blue-600 uppercase"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Category Name</label>
            <input type="text" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Wholesale"
              className="w-full rounded-xl border-2 bg-slate-50 border-slate-200 p-4 font-bold text-slate-900 outline-none focus:border-blue-600 uppercase" />
          </div>

          <div className="md:col-span-2 mt-4 flex gap-4">
              <button type="submit" className="flex-1 py-4 px-4 rounded-xl shadow-lg font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-black transition">
                {isEditing ? 'Update Category' : 'Save Category'}
              </button>
              {isEditing && (
                  <button type="button" onClick={() => { setIsEditing(false); setFormData({id:'', name:''}); setOriginalId(''); }} className="px-8 rounded-xl font-black uppercase tracking-widest text-slate-600 bg-slate-200 hover:bg-slate-300 transition">Cancel</button>
              )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200">
            <tr><th className="p-4">ID</th><th className="p-4">Category Name</th><th className="p-4 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
            {categories && categories.length > 0 ? categories.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-mono text-xs text-slate-400 uppercase">{c.id}</td>
                <td className="p-4 uppercase text-slate-900">{c.name}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleEdit(c)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded mr-2 hover:bg-blue-100 uppercase text-[10px] font-black tracking-widest transition">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 uppercase text-[10px] font-black tracking-widest transition">Delete</button>
                </td>
              </tr>
            )) : <tr><td colSpan={3} className="p-8 text-center text-slate-400">No categories found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}