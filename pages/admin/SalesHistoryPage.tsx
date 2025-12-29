
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search invoice or customer..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label className="text-sm font-bold text-slate-400 shrink-0">Filter Salesman:</label>
          <select 
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 w-full"
            value={selectedSalesman}
            onChange={(e) => setSelectedSalesman(e.target.value)}
          >
            <option value="ALL">All Salesmen</option>
            {salesmenIds.map(id => (
              <option key={id} value={id}>Salesman {id}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-900/50 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-400">Invoice</th>
              <th className="px-6 py-4 font-semibold text-slate-400">Date & Time</th>
              <th className="px-6 py-4 font-semibold text-slate-400">Customer</th>
              <th className="px-6 py-4 font-semibold text-slate-400">Salesman</th>
              <th className="px-6 py-4 font-semibold text-slate-400">Items</th>
              <th className="px-6 py-4 font-semibold text-slate-400 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filtered.map(sale => (
              <tr key={sale.id} className="hover:bg-slate-750 transition-colors">
                <td className="px-6 py-4 font-bold text-blue-400">#{sale.invoiceNumber}</td>
                <td className="px-6 py-4 text-xs">
                  <div className="text-slate-200">{new Date(sale.date).toLocaleDateString()}</div>
                  <div className="text-slate-500">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-200">{sale.customerName}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{sale.customerCode}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-900 rounded-lg text-xs font-bold border border-slate-700">
                    ID: {sale.salesmanId}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-400 text-xs">{sale.items.length} items</span>
                </td>
                <td className="px-6 py-4 text-right font-black text-blue-500">
                  ₹{sale.totalAmount.toLocaleString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No sales history found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesHistoryPage;
