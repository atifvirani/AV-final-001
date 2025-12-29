
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Sale } from '../../types';
import { Search, Calendar, User, FileText, ChevronDown } from 'lucide-react';

const SalesHistoryPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSalesman, setSelectedSalesman] = useState<string>('ALL');

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    const all = await db.sales.toArray();
    setSales(all.sort((a, b) => b.date.getTime() - a.date.getTime()));
  };

  const filtered = sales.filter(s => {
    const matchesSearch = s.invoiceNumber.includes(searchTerm) || 
                          s.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSalesman = selectedSalesman === 'ALL' || s.salesmanId === selectedSalesman;
    return matchesSearch && matchesSalesman;
  });

  const salesmenIds = Array.from(new Set(sales.map(s => s.salesmanId)));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search invoice or customer..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label className="text-sm font-bold text-slate-400 shrink-0 uppercase tracking-widest text-[10px]">Filter:</label>
          <select 
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 w-full text-white text-sm"
            value={selectedSalesman}
            onChange={(e) => setSelectedSalesman(e.target.value)}
          >
            <option value="ALL">All Terminals</option>
            {salesmenIds.map(id => (
              <option key={id} value={id}>Salesman {id}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Invoice</th>
                <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Date & Time</th>
                <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Customer</th>
                <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Salesman</th>
                <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Status</th>
                <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filtered.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-6 py-5 font-black text-blue-400 font-mono tracking-tighter text-lg">#{sale.invoiceNumber}</td>
                  <td className="px-6 py-5 text-xs">
                    <div className="text-slate-200 font-bold">{new Date(sale.date).toLocaleDateString()}</div>
                    <div className="text-slate-500 font-mono">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-black text-slate-200">{sale.customerName}</div>
                    <div className="text-[10px] text-slate-500 font-mono tracking-tighter">{sale.customerCode}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 bg-slate-900 rounded-lg text-xs font-black border border-slate-700 text-blue-300">
                      ID: {sale.salesmanId}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className={`text-[9px] font-black uppercase tracking-widest flex items-center space-x-2 ${sale.synced ? 'text-green-500' : 'text-orange-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${sale.synced ? 'bg-green-500' : 'bg-orange-500 shadow-glow'}`}></span>
                      <span>{sale.synced ? 'Synced' : 'Pending'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-blue-400 text-2xl tracking-tighter">
                    ₹{sale.totalAmount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic font-medium">No sales data recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesHistoryPage;
