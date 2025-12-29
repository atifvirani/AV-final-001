
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Sale, Product } from '../types';
import { PlusCircle, FileText, Send, LayoutDashboard, LogOut, CheckCircle, Clock, History, Download, RefreshCcw, Sun, Moon } from 'lucide-react';
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
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('av_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('av_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

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
    
    for (const sale of pendingSales) {
      await db.sales.update(sale.id!, { synced: true });
    }
    loadSales();
    alert('Export successful! Share this file with the Manager.');
  };

  const handleMasterImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = JSON.parse(event.target?.result as string);
        if (content.version === '2.0-AV') {
          if (window.confirm('This will refresh your local Products and Customers from the Manager backup. Continue?')) {
            await (db as any).transaction('rw', [db.products, db.customers], async () => {
              await db.products.clear();
              await db.customers.clear();
              await db.products.bulkPut(content.products || []);
              await db.customers.bulkPut(content.customers || []);
            });
            alert('Data updated successfully!');
          }
        } else {
          alert('Invalid Master Clone file.');
        }
      } catch (err) {
        alert('Failed to parse file: ' + err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-200'} border p-4 rounded-2xl shadow-sm transition-colors duration-300`}>
                <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} text-xs font-bold uppercase tracking-wider mb-1`}>Today's Total</div>
                <div className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>₹{stats.total.toLocaleString()}</div>
              </div>
              <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-green-50 border-green-200'} border p-4 rounded-2xl shadow-sm transition-colors duration-300`}>
                <div className={`${theme === 'dark' ? 'text-green-400' : 'text-green-600'} text-xs font-bold uppercase tracking-wider mb-1`}>Bills Issued</div>
                <div className={`text-2xl font-black ${theme === 'dark' ? 'text-green-900' : 'text-green-900'}`}>{stats.count}</div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 ${stats.pending > 0 ? (theme === 'dark' ? 'bg-orange-900/20 border-orange-500/50' : 'bg-orange-50 border-orange-200') : (theme === 'dark' ? 'bg-green-900/20 border-green-500/50' : 'bg-green-50 border-green-200')}`}>
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stats.pending > 0 ? 'bg-orange-500' : 'bg-green-500'} text-white`}>
                  {stats.pending > 0 ? <Clock className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
                </div>
                <div>
                  <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.pending > 0 ? `${stats.pending} Bills Pending Export` : 'All Bills Synced'}</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Last sync: Just now</div>
                </div>
              </div>
              {stats.pending > 0 && (
                <button onClick={handleExportSync} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md">
                  Export Now
                </button>
              )}
            </div>

            <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border rounded-2xl overflow-hidden shadow-sm transition-colors duration-300`}>
              <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-gray-100'} font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>Recent Transactions</div>
              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {sales.map((sale) => (
                  <div key={sale.id} className={`p-4 flex justify-between items-center ${theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}>
                    <div>
                      <div className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{sale.customerName}</div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>#{sale.invoiceNumber} • {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>Transaction History</h3>
            <div className={`p-12 text-center ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'} italic`}>Complete local archive available below.</div>
            <div className="space-y-3">
              {sales.map(sale => (
                <div key={sale.id} className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white shadow-sm'} p-4 rounded-2xl flex justify-between items-center`}>
                   <div>
                      <p className="font-bold">{sale.customerName}</p>
                      <p className="text-xs opacity-60">#{sale.invoiceNumber} • {new Date(sale.date).toLocaleDateString()}</p>
                   </div>
                   <p className="font-black text-blue-600">₹{sale.totalAmount}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'update':
        return (
          <div className="space-y-6">
            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>Refresh Local Data</h3>
            <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border p-8 rounded-3xl text-center shadow-xl`}>
               <RefreshCcw className="h-16 w-16 text-blue-500 mx-auto mb-6" />
               <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-8`}>Select the <b>AV_MASTER_CLONE</b> file sent by your Manager to update your local product list and customer records.</p>
               <input type="file" id="master-sync" className="hidden" onChange={handleMasterImport} accept=".json" />
               <label htmlFor="master-sync" className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black cursor-pointer shadow-lg hover:bg-blue-700 transition-all inline-block">
                  Import Master Clone
               </label>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'} flex flex-col transition-colors duration-300`}>
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
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleTheme}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-xl transition-all">
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 max-w-2xl mx-auto w-full">
        {renderContent()}
      </main>

      {/* Persistent Navigation */}
      <nav className={`fixed bottom-0 inset-x-0 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'} border-t px-6 py-4 flex justify-between items-center z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-3xl transition-colors duration-300`}>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <LayoutDashboard className="h-6 w-6" />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'history' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <History className="h-6 w-6" />
          <span className="text-[10px] font-bold">Archive</span>
        </button>
        
        <button
          onClick={() => setActiveTab('billing')}
          className="bg-blue-600 text-white p-4 rounded-full -mt-12 shadow-xl shadow-blue-200 ring-8 ring-gray-50 hover:bg-blue-700 transition-all active:scale-95"
        >
          <PlusCircle className="h-8 w-8" />
        </button>

        <button
          onClick={() => setActiveTab('update')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'update' ? 'text-blue-600' : 'text-gray-400'}`}
        >
          <RefreshCcw className="h-6 w-6" />
          <span className="text-[10px] font-bold">Sync Data</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className="opacity-0 w-6 h-6" // Spacer for layout balance
          disabled
        />
      </nav>

      <AuthorFootnote />
    </div>
  );
};

export default SalesmanDashboard;
