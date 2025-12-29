
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Customer } from '../../types';
import { Plus, Search, Edit3, Trash2, Save, X, UserPlus } from 'lucide-react';

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Omit<Customer, 'id'>>({
    code: '',
    name: '',
    address: '',
    mobile: ''
  });

  const loadCustomers = async () => {
    const all = await db.customers.toArray();
    setCustomers(all);
  };

  useEffect(() => { loadCustomers(); }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.mobile) return alert('Name and Mobile are required');
    
    // Generate unique code if not provided
    const code = formData.code || `${formData.name}-${formData.address}-${formData.mobile}`.replace(/\s+/g, '').toLowerCase();
    const dataToSave = { ...formData, code };

    if (editingId) {
      await db.customers.update(editingId, dataToSave);
      setEditingId(null);
    } else {
      await db.customers.add(dataToSave);
      setIsAdding(false);
    }
    setFormData({ code: '', name: '', address: '', mobile: '' });
    loadCustomers();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this customer record?')) {
      await db.customers.delete(id);
      loadCustomers();
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.mobile.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or mobile..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-xl font-bold transition-all"
        >
          <UserPlus className="h-5 w-5" />
          <span>New Customer</span>
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-slate-800 p-6 rounded-2xl border border-blue-500/30 shadow-2xl space-y-4">
          <h3 className="text-xl font-bold">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Customer Name"
              className="bg-slate-900 border border-slate-700 p-2 rounded-lg"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Mobile Number"
              className="bg-slate-900 border border-slate-700 p-2 rounded-lg"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            />
            <input
              type="text"
              placeholder="Address / Area"
              className="bg-slate-900 border border-slate-700 p-2 rounded-lg"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>Save Record</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-400">Name</th>
              <th className="px-6 py-4 font-semibold text-slate-400">Mobile</th>
              <th className="px-6 py-4 font-semibold text-slate-400">Address</th>
              <th className="px-6 py-4 font-semibold text-slate-400">Code</th>
              <th className="px-6 py-4 font-semibold text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filtered.map(cust => (
              <tr key={cust.id} className="hover:bg-slate-750 transition-colors">
                <td className="px-6 py-4 font-medium">{cust.name}</td>
                <td className="px-6 py-4 text-slate-300">{cust.mobile}</td>
                <td className="px-6 py-4 text-slate-400 text-sm">{cust.address}</td>
                <td className="px-6 py-4 font-mono text-xs text-blue-500">{cust.code}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditingId(cust.id!);
                        setFormData({
                          name: cust.name,
                          mobile: cust.mobile,
                          address: cust.address,
                          code: cust.code
                        });
                      }}
                      className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(cust.id!)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomersPage;
