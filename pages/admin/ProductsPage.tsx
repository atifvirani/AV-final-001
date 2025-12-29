
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Product } from '../../types';
import { Plus, Search, Edit3, Trash2, X } from 'lucide-react';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    price1kg: 0,
    price05kg: 0,
    stockLevel: 0,
    isDeleted: 0
  });

  const loadProducts = async () => {
    const all = await db.products.where('isDeleted').equals(0).toArray();
    setProducts(all);
  };

  useEffect(() => { loadProducts(); }, []);

  const handleSave = async () => {
    if (!formData.name) return alert('Name is required');
    try {
      if (editingId) {
        await db.products.update(editingId, formData);
        setEditingId(null);
      } else {
        await db.products.add(formData);
        setIsAdding(false);
      }
      setFormData({ name: '', price1kg: 0, price05kg: 0, stockLevel: 0, isDeleted: 0 });
      loadProducts();
    } catch (err) {
      alert("Failed to save product: " + err);
    }
  };

  const handleSoftDelete = async (id: number) => {
    if (window.confirm('Delete this product? Historical data remains safe.')) {
      await db.products.update(id, { isDeleted: 1 });
      loadProducts();
    }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl outline-none text-white focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-xl font-bold flex items-center space-x-2 text-white"
        >
          <Plus className="h-5 w-5" />
          <span>New Product</span>
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-slate-800 p-6 rounded-2xl border border-blue-500/30 shadow-2xl space-y-4">
          <h3 className="text-xl font-bold text-white">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-400">Product Name</label>
              <input type="text" placeholder="Name" className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:ring-1 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-400">Price per 1KG</label>
              <input type="number" placeholder="1kg Price" className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:ring-1 focus:ring-blue-500" value={formData.price1kg || ''} onChange={e => setFormData({...formData, price1kg: +e.target.value})} />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-400">Price per 0.5KG</label>
              <input type="number" placeholder="0.5kg Price" className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:ring-1 focus:ring-blue-500" value={formData.price05kg || ''} onChange={e => setFormData({...formData, price05kg: +e.target.value})} />
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-xs font-bold text-slate-400">Initial Stock</label>
              <input type="number" placeholder="Stock" className="bg-slate-900 border border-slate-700 p-3 rounded-lg text-white outline-none focus:ring-1 focus:ring-blue-500" value={formData.stockLevel || ''} onChange={e => setFormData({...formData, stockLevel: +e.target.value})} disabled={!!editingId} />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-6 py-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition-all">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 rounded-lg font-bold text-white hover:bg-blue-500 transition-all">Save Product</button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-400">Product Name</th>
                <th className="px-6 py-4 font-semibold text-slate-400">1KG Rate</th>
                <th className="px-6 py-4 font-semibold text-slate-400">0.5KG Rate</th>
                <th className="px-6 py-4 font-semibold text-slate-400">Available Stock</th>
                <th className="px-6 py-4 font-semibold text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filtered.map(product => (
                <tr key={product.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{product.name}</td>
                  <td className="px-6 py-4 text-slate-200">₹{product.price1kg}</td>
                  <td className="px-6 py-4 text-slate-200">₹{product.price05kg}</td>
                  <td className="px-6 py-4 font-bold text-blue-400">{product.stockLevel}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => { setEditingId(product.id!); setFormData({...product}); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => handleSoftDelete(product.id!)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No products found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
