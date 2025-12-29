
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Product, StockLog } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, TrendingDown, TrendingUp, RefreshCcw, AlertCircle } from 'lucide-react';

const StockPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [adjustment, setAdjustment] = useState<number>(0);
  const [reason, setReason] = useState('Restock');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const all = await db.products.toArray();
    setProducts(all);
  };

  const handleUpdateStock = async () => {
    if (selectedProduct === null || adjustment === 0) return;
    
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const newLevel = product.stockLevel + adjustment;
    await db.products.update(selectedProduct, { stockLevel: newLevel });
    
    await db.stockLogs.add({
      productId: selectedProduct,
      productName: product.name,
      change: adjustment,
      date: new Date(),
      reason
    });

    setAdjustment(0);
    loadData();
    alert('Stock updated successfully!');
  };

  const chartData = products.map(p => ({
    name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
    fullName: p.name,
    stock: p.stockLevel
  }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Update Stock Form */}
        <div className="lg:col-span-1 bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 mb-2">
            <RefreshCcw className="h-6 w-6 text-blue-400" />
            <h3 className="text-xl font-bold">Manual Adjustment</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select Product</label>
              <select 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setSelectedProduct(Number(e.target.value))}
                value={selectedProduct || ''}
              >
                <option value="">-- Choose Product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Cur: {p.stockLevel})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Adjustment</label>
                <input 
                  type="number"
                  placeholder="+10 or -5"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold"
                  value={adjustment || ''}
                  onChange={(e) => setAdjustment(Number(e.target.value))}
                />
              </div>
              <div className="flex items-end">
                <div className={`p-4 rounded-xl w-full text-center font-black ${adjustment >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {adjustment > 0 ? <TrendingUp className="inline h-4 w-4 mr-1" /> : <TrendingDown className="inline h-4 w-4 mr-1" />}
                  {adjustment}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Reason</label>
              <input 
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <button 
              onClick={handleUpdateStock}
              disabled={!selectedProduct || adjustment === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95"
            >
              Apply Stock Change
            </button>
          </div>
        </div>

        {/* Visualization Chart */}
        <div className="lg:col-span-2 bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <Package className="h-6 w-6 text-indigo-400" />
              <h3 className="text-xl font-bold">Inventory Levels</h3>
            </div>
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                <Tooltip 
                  cursor={{ fill: '#334155' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                />
                <Bar dataKey="stock" fill="#818cf8" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.stock < 10 ? '#ef4444' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex items-center space-x-2 text-red-400 text-xs font-bold">
            <AlertCircle className="h-4 w-4" />
            <span>Red bars indicate critical stock levels (below 10 units).</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockPage;
