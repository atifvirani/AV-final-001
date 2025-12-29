
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Product } from '../../types';
import { Plus, Search, Edit3, Trash2, Save, X, ImageIcon } from 'lucide-react';

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
    image: '',
    isDeleted: false
  });

  const loadProducts = async () => {
    // Only fetch non-deleted products for UI
    const all = await db.products.where('isDeleted').equals(0).toArray();
    setProducts(all);
  };

  useEffect(() => { loadProducts(); }, []);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/webp', 0.6)); // WebP < 100kb
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      setFormData(prev => ({ ...prev, image: compressed }));
    }
  };

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
      setFormData({ name: '', price1kg: 0, price05kg: 0, stockLevel: 0, image: '', isDeleted: false });
      loadProducts();
    } catch (err) {
      alert("Failed to save product: " + err);
    }
  };

  const handleSoftDelete = async (id: number) => {
    if (window.confirm('Mark this product as deleted? Historical invoices will remain accurate.')) {
      await db.products.update(id, { isDeleted: true });
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
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-xl font-bold flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>New Product</span>
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-slate-800 p-6 rounded-2xl border border-blue-500/30 shadow-2xl space-y-4">
          <h3 className="text-xl font-bold">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-bold text-slate-400">Product Image</label>
              <div className="relative h-24 bg-slate-900 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-700 overflow-hidden">
                {formData.image ? (
                  <img src={formData.image} className="h-full w-full object-cover" alt="Preview" />
                ) : (
                  <ImageIcon className="text-slate-600" />
                )}
                <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
              </div>
            </div>
            <input type="text" placeholder="Name" className="bg-slate-900 border border-slate-700 p-2 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <input type="number" placeholder="1kg Price" className="bg-slate-900 border border-slate-700 p-2 rounded-lg" value={formData.price1kg || ''} onChange={e => setFormData({...formData, price1kg: +e.target.value})} />
            <input type="number" placeholder="0.5kg Price" className="bg-slate-900 border border-slate-700 p-2 rounded-lg" value={formData.price05kg || ''} onChange={e => setFormData({...formData, price05kg: +e.target.value})} />
            <input type="number" placeholder="Stock" className="bg-slate-900 border border-slate-700 p-2 rounded-lg" value={formData.stockLevel || ''} onChange={e => setFormData({...formData, stockLevel: +e.target.value})} disabled={!!editingId} />
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-6 py-2 bg-slate-700 rounded-lg">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 rounded-lg font-bold">Save</button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-400">IMG</th>
                <th className="px-6 py-4 font-semibold text-slate-400">Name</th>
                <th className="px-6 py-4 font-semibold text-slate-400">1kg</th>
                <th className="px-6 py-4 font-semibold text-slate-400">0.5kg</th>
                <th className="px-6 py-4 font-semibold text-slate-400">Stock</th>
                <th className="px-6 py-4 font-semibold text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filtered.map(product => (
                <tr key={product.id} className="hover:bg-slate-750">
                  <td className="px-6 py-2">
                    {product.image ? <img src={product.image} className="h-10 w-10 rounded bg-slate-900" alt="" /> : <div className="h-10 w-10 bg-slate-900 rounded" />}
                  </td>
                  <td className="px-6 py-4 font-medium">{product.name}</td>
                  <td className="px-6 py-4">₹{product.price1kg}</td>
                  <td className="px-6 py-4">₹{product.price05kg}</td>
                  <td className="px-6 py-4">{product.stockLevel}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => { setEditingId(product.id!); setFormData({...product}); }} className="p-2 hover:bg-slate-700 rounded-lg"><Edit3 className="h-4 w-4" /></button>
                      <button onClick={() => handleSoftDelete(product.id!)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
