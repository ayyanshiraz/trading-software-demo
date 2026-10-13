'use client'

import { useState } from 'react'
import { Search, Zap, Save, Trash2, Edit } from 'lucide-react'
import { saveCustomer, deleteCustomer } from '@/actions/actions'

export default function CustomerManager({ customers = [], categories = [] }: { customers: any[], categories: any[] }) {
  const [search, setSearch] = useState('')
  const [quickEditMode, setQuickEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingOriginalId, setEditingOriginalId] = useState('')

  const [draftPhones, setDraftPhones] = useState<Record<string, string>>({})
  const [draftBalances, setDraftBalances] = useState<Record<string, number>>({})

  // RESTORED: newId state for manual Primary Key assignment
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newBalance, setNewBalance] = useState('')

  const filteredCustomers = customers.filter(c => {
      const q = search.toLowerCase()
      return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.id || '').toLowerCase().includes(q)
  })

  const handleEditClick = (c: any) => {
      setEditingOriginalId(c.id)
      setNewId(c.id) // Loads the ID into the box for editing
      setNewName(c.name)
      setNewCat(c.category || '')
      setNewPhone(c.phone || '')
      setNewAddress(c.address || '')
      setNewBalance(c.openingBalance?.toString() || '0')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      document.getElementById('new-c-name')?.focus()
  }

  const handleCancelEdit = () => {
      setEditingOriginalId('')
      setNewId(''); setNewName(''); setNewCat(''); setNewPhone(''); setNewAddress(''); setNewBalance('');
  }

  const handleAddCustomer = async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSaving(true)
      try {
          const formData = new FormData()
          if (editingOriginalId) {
              formData.append('originalId', editingOriginalId)
          }
          // Passes the manually typed ID to the database
          if (newId) formData.append('id', newId) 
          
          formData.append('name', newName)
          formData.append('category', newCat)
          formData.append('phone', newPhone)
          formData.append('address', newAddress)
          formData.append('openingBalance', newBalance || '0')
          
          await saveCustomer(formData)
          
          handleCancelEdit()
          alert(editingOriginalId ? 'Customer updated successfully!' : 'Customer added successfully!')
      } catch (err) {
          alert('Error saving customer.')
      } finally {
          setIsSaving(false)
      }
  }

  const handleSaveQuickEdits = async () => {
      setIsSaving(true)
      try {
          for (const c of filteredCustomers) {
              const updatedPhone = draftPhones[c.id] !== undefined ? draftPhones[c.id] : c.phone
              const updatedBal = draftBalances[c.id] !== undefined ? draftBalances[c.id] : c.openingBalance
              
              if (updatedPhone !== c.phone || updatedBal !== c.openingBalance) {
                  const formData = new FormData()
                  formData.append('originalId', c.id) 
                  formData.append('id', c.id)
                  formData.append('name', c.name)
                  formData.append('category', c.category || '')
                  formData.append('phone', updatedPhone || '')
                  formData.append('address', c.address || '')
                  formData.append('openingBalance', updatedBal.toString())
                  
                  await saveCustomer(formData)
              }
          }
          alert('Customer records updated successfully!')
          setQuickEditMode(false)
          setDraftPhones({})
          setDraftBalances({})
      } catch (err) {
          alert('Error saving updates.')
      } finally {
          setIsSaving(false)
      }
  }

  const handleDelete = async (id: string) => {
      if(confirm('Are you sure you want to delete this customer? This may affect ledger histories.')) {
          await deleteCustomer(id)
      }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>, nextFieldId: string) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (nextFieldId === 'submit') document.getElementById('cust-submit-btn')?.click();
        else document.getElementById(nextFieldId)?.focus();
    }
  }

  return (
    <div className="w-full space-y-8 relative">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
          @font-face { font-family: 'Jameel Noori Nastaleeq'; src: local('Jameel Noori Nastaleeq'), local('Jameel Noori Nastaleeq Regular'); }
          .urdu-font { font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', sans-serif !important; line-height: 2 !important; }
        `}</style>

        <form onSubmit={handleAddCustomer} className={`bg-white p-6 md:p-8 rounded-3xl shadow-xl border ${editingOriginalId ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-200'}`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase text-slate-900">{editingOriginalId ? 'Edit Customer' : 'Add New Customer'}</h2>
                {editingOriginalId && <button type="button" onClick={handleCancelEdit} className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800">Cancel Edit</button>}
            </div>
            
            {/* ROW 1: Customer ID and Customer Name */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Customer ID (Optional)</label>
                    <input id="new-c-id" type="text" value={newId} onChange={e => setNewId(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'new-c-name')} placeholder="E.G. 100" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 uppercase" />
                </div>
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Customer Name</label>
                    <input id="new-c-name" type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'new-c-cat')} required dir="ltr" placeholder="E.G. ALI TRADERS" className="urdu-font text-left w-full p-3 bg-white border-2 border-slate-300 rounded-xl font-black text-slate-900 outline-none focus:border-blue-600 transition uppercase" />
                </div>
            </div>

            {/* ROW 2: Category, Phone, and Opening Balance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Category</label>
                    <select id="new-c-cat" value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'new-c-phone')} className="urdu-font text-left w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 uppercase">
                        <option value="">No Category</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Phone Number</label>
                    <input id="new-c-phone" type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'new-c-bal')} placeholder="03XXXXXXXXX" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-red-500 mb-2 block">Opening Balance (PKR)</label>
                    <input id="new-c-bal" type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'new-c-addr')} placeholder="0" className="w-full p-3 bg-red-50 border border-red-300 rounded-xl font-black text-slate-900 outline-none focus:border-red-600" />
                </div>
            </div>

            {/* ROW 3: Address */}
            <div className="mb-6">
                <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Address</label>
                <textarea id="new-c-addr" value={newAddress} onChange={e => setNewAddress(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'submit')} dir="ltr" rows={2} className="urdu-font text-left w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600 resize-none uppercase" />
            </div>

            <button id="cust-submit-btn" type="submit" disabled={isSaving} className={`w-full py-4 text-white rounded-xl font-black uppercase tracking-widest transition disabled:opacity-50 ${editingOriginalId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-black'}`}>
                {isSaving ? 'Saving...' : (editingOriginalId ? 'Update Customer' : 'Save Customer')}
            </button>
        </form>

        {/* ... Rest of the CustomerManager Table Data ... */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-72">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search name, phone or ID..." value={search} onChange={e => setSearch(e.target.value)} dir="ltr" className="urdu-font text-left w-full pl-10 p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-blue-600" />
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    {!quickEditMode ? (
                        <button type="button" onClick={() => setQuickEditMode(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                            <Zap size={16} /> Quick Edit Data
                        </button>
                    ) : (
                        <>
                            <button type="button" onClick={() => { setQuickEditMode(false); setDraftPhones({}); setDraftBalances({}); }} className="px-6 py-3 rounded-xl text-xs font-black uppercase bg-slate-200 text-slate-700 hover:bg-slate-300">Cancel</button>
                            <button type="button" onClick={handleSaveQuickEdits} disabled={isSaving} className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase bg-blue-600 text-white hover:bg-blue-700 shadow-lg">
                                <Save size={16} /> {isSaving ? 'Saving...' : 'Save Edits'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b-2 border-slate-200">
                        <tr>
                            <th className="p-4">ID</th><th className="p-4">Name</th><th className="p-4">Category</th>
                            <th className={`p-4 ${quickEditMode ? 'bg-blue-100 text-blue-800 border-b-4 border-blue-400' : ''}`}>Phone</th>
                            <th className={`p-4 text-right ${quickEditMode ? 'bg-red-100 text-red-800 border-b-4 border-red-400' : ''}`}>Opening Balance</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-bold text-slate-700 divide-y divide-slate-100">
                        {filteredCustomers.map((c, index) => (
                            <tr key={c.id} className="hover:bg-slate-50 transition">
                                <td className="p-4 font-mono text-xs uppercase">{c.id.slice(-6)}</td>
                                <td className="p-4 urdu-font text-slate-900 font-black text-base" dir="ltr">{c.name}</td>
                                <td className="p-4 urdu-font" dir="ltr">{c.category || '---'}</td>
                                
                                <td className={`p-4 ${quickEditMode ? 'bg-blue-50' : ''}`}>
                                    {quickEditMode ? (
                                        <input type="text" id={`phone-${index}`} className="w-32 p-2 border-2 border-blue-300 rounded-lg font-bold text-slate-900 outline-none focus:border-blue-600"
                                            value={draftPhones[c.id] !== undefined ? draftPhones[c.id] : c.phone}
                                            onChange={e => setDraftPhones({...draftPhones, [c.id]: e.target.value})}
                                            onFocus={e => e.target.select()}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`bal-${index}`)?.focus(); } }}
                                        />
                                    ) : <span>{c.phone || '---'}</span>}
                                </td>

                                <td className={`p-4 text-right ${quickEditMode ? 'bg-red-50' : ''}`}>
                                    {quickEditMode ? (
                                        <input type="number" id={`bal-${index}`} className="w-28 p-2 text-right border-2 border-red-300 rounded-lg font-black text-slate-900 outline-none focus:border-red-600"
                                            value={draftBalances[c.id] !== undefined ? draftBalances[c.id] : c.openingBalance}
                                            onChange={e => setDraftBalances({...draftBalances, [c.id]: Number(e.target.value)})}
                                            onFocus={e => e.target.select()}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`phone-${index + 1}`)?.focus(); } }}
                                        />
                                    ) : <span className="text-red-600 font-black">{c.openingBalance.toLocaleString()}</span>}
                                </td>

                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEditClick(c)} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(c.id)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  )
}