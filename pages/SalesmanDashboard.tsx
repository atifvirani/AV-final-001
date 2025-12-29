
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Sale, Product } from '../types';
// Fix: Added missing History icon import from lucide-react
import { PlusCircle, FileText, Send, LayoutDashboard, LogOut, CheckCircle, Clock, History } from 'lucide-react';
import BillingPage from './sales/BillingPage';
import AuthorFootnote from '../components/AuthorFootnote';

interface SalesmanDashboardProps {
  salesmanId: string;
  onLogout: () => void;
}

const SalesmanDashboard: React.FC<SalesmanDashboardProps> = ({ salesmanId, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState({ total: 0, count: 0, pending: 0 });

  useEffect(() => {
    loadSales();
  }, [salesmanId, activeTab]);

  const loadSales = async () => {
    const userSales = await db.sales
      .where('salesmanId')
      .equals(salesmanId)
      .toArray();
    
    const sorted = userSales.sort((a, b) => b.date.getTime() - a.date.getTime());
    setSales(sorted);

    const total = userSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const pending = userSales.filter(s => !s.synced).length;
    setStats({ total, count: userSales.length, pending });
  };

  const handleExportSync = async () => {
    const pendingSales = sales.filter(s => !s.synced);
    if (pendingSales.length === 0) return alert('Nothing to export!');

    const payload = {
      salesmanId,
      sales: pendingSales,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SYNC_${salesmanId}_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    link.click();
    
    // Mark as synced locally
    for (const sale of pendingSales) {
      await db.sales.update(sale.id!, { synced: true });
    }
    loadSales();
    alert('Export successful! Share this file with the Manager.');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl shadow-sm">
                <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">Today's Total</div>
                <div className="text-2xl font-black text-blue-900">₹{stats.total.toLocaleString()}</div>
              </div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-2xl shadow-sm">
                <div className="text-green-600 text-xs font-bold uppercase tracking-wider mb-1">Bills Issued</div>
                <div className="text-2xl font-black text-green-900">{stats.count}</div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between ${stats.pending > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.pending > 0 ? 'bg-orange-500' : 'bg-green-500'} text-white`}>
                  {stats.pending > 0 ? <Clock className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{stats.pending > 0 ? `${stats.pending} Bills Pending Export` : 'All Bills Synced'}</div>
                  <div className="text-xs text-gray-500">Last sync: Just now</div>
                </div>
              </div>
              {stats.pending > 0 && (
                <button onClick={handleExportSync} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md">
                  Export Now
                </button>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 font-bold text-gray-700">Recent Transactions</div>
              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {sales.map((sale) => (
                  <div key={sale.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <div className="font-bold text-gray-900">{sale.customerName}</div>
                      <div className="text-xs text-gray-500">#{sale.invoiceNumber} • {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">₹{sale.totalAmount}</div>
                      <div className={`text-[10px] font-bold uppercase ${sale.synced ? 'text-green-500' : 'text-orange-500'}`}>
                        {sale.synced ? 'Synced' : 'Pending'}
                      </div>
                    </div>
                  </div>
                ))}
                {sales.length === 0 && (
                  <div className="p-8 text-center text-gray-400 italic">No sales recorded today.</div>
                )}
              </div>
            </div>
          </div>
        );
      case 'billing':
        return <BillingPage salesmanId={salesmanId} onComplete={() => setActiveTab('dashboard')} />;
      case 'history':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-blue-900">Transaction History</h3>
            {/* Extended history list could go here */}
            <div className="p-12 text-center text-gray-400">View complete history enabled.</div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 pt-6 pb-6 sticky top-0 z-20 shadow-lg rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Sales Terminal</h1>
              <p className="text-xs text-blue-100 font-medium opacity-80 uppercase tracking-widest">ID: {salesmanId}</p>
            </div>
          </div>
          <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 max-w-2xl mx-auto w-full">
        {renderContent()}
      </main>

      {/* Persistent Call-to-Action / Navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-3xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <LayoutDashboard className="h-6 w-6" />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        
        <button
          onClick={() => setActiveTab('billing')}
          className="bg-blue-600 text-white p-4 rounded-full -mt-12 shadow-xl shadow-blue-200 ring-8 ring-gray-50 hover:bg-blue-700 transition-all active:scale-95"
        >
          <PlusCircle className="h-8 w-8" />
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'history' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          {/* History icon component imported from lucide-react */}
          <History className="h-6 w-6" />
          <span className="text-[10px] font-bold">Archive</span>
        </button>
      </nav>

      <div className="mt-4 opacity-50 text-center">
        <AuthorFootnote />
      </div>
    </div>
  );
};

export default SalesmanDashboard;
