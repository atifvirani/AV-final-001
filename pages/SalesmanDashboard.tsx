
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Sale, Product, Customer } from '../types';
import { PlusCircle, FileText, LayoutDashboard, LogOut, CheckCircle, Clock, History, RefreshCcw, Sun, Moon, Package, Users, Info, Printer } from 'lucide-react';
import BillingPage from './sales/BillingPage';
import AuthorFootnote from '../components/AuthorFootnote';

interface SalesmanDashboardProps {
  salesmanId: string;
  onLogout: () => void;
}

const SalesmanDashboard: React.FC<SalesmanDashboardProps> = ({ salesmanId, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState({ total: 0, count: 0, pending: 0 });
  const [reprintSale, setReprintSale] = useState<Sale | null>(null);
  
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('av_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('av_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    loadSales();
    if (activeTab === 'products') loadProducts();
    if (activeTab === 'customers') loadCustomers();
  }, [salesmanId, activeTab]);

  const loadSales = async () => {
    const userSales = await db.sales.where('salesmanId').equals(salesmanId).toArray();
    const sorted = userSales.sort((a, b) => b.date.getTime() - a.date.getTime());
    setSales(sorted);
    const total = userSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const pending = userSales.filter(s => !s.synced).length;
    setStats({ total, count: userSales.length, pending });
  };

  const loadProducts = async () => {
    const p = await db.products.where('isDeleted').equals(0).toArray();
    setProducts(p);
  };

  const loadCustomers = async () => {
    const c = await db.customers.toArray();
    setCustomers(c);
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
    
    // Explicitly update synced status in IndexedDB
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
          if (window.confirm('Refresh local Products and Customers from Manager backup? All local customer changes will be merged.')) {
            await (db as any).transaction('rw', [db.products, db.customers], async () => {
              // We don't clear customers to preserve newly registered ones, we bulkPut for updates
              await db.products.clear();
              await db.products.bulkPut(content.products || []);
              await db.customers.bulkPut(content.customers || []);
            });
            alert('Data updated successfully!');
            loadSales();
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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-2 gap-4">
              <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-200'} border p-6 rounded-3xl shadow-sm transition-colors duration-300`}>
                <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} text-xs font-black uppercase tracking-widest mb-1`}>Total Sales</div>
                <div className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>₹{stats.total.toLocaleString()}</div>
              </div>
              <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-green-50 border-green-200'} border p-6 rounded-3xl shadow-sm transition-colors duration-300`}>
                <div className={`${theme === 'dark' ? 'text-green-400' : 'text-green-600'} text-xs font-black uppercase tracking-widest mb-1`}>Bills Issued</div>
                <div className={`text-3xl font-black ${theme === 'dark' ? 'text-green-900' : 'text-green-900'}`}>{stats.count}</div>
              </div>
            </div>

            <div className={`p-6 rounded-3xl border flex items-center justify-between transition-all duration-300 ${stats.pending > 0 ? (theme === 'dark' ? 'bg-orange-900/20 border-orange-500/50' : 'bg-orange-50 border-orange-200') : (theme === 'dark' ? 'bg-green-900/20 border-green-500/50' : 'bg-green-50 border-green-200')}`}>
              <div className="flex items-center space-x-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${stats.pending > 0 ? 'bg-orange-500 shadow-orange-500/30 shadow-lg' : 'bg-green-500 shadow-green-500/30 shadow-lg'} text-white`}>
                  {stats.pending > 0 ? <Clock className="h-7 w-7" /> : <CheckCircle className="h-7 w-7" />}
                </div>
                <div>
                  <div className={`text-lg font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.pending > 0 ? `${stats.pending} Bills Pending Export` : 'System Synchronized'}</div>
                  <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{stats.pending > 0 ? 'Manager needs your report' : 'Ready for duty'}</div>
                </div>
              </div>
              {stats.pending > 0 && (
                <button onClick={handleExportSync} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl font-black transition-all shadow-xl shadow-orange-900/20 uppercase tracking-widest text-xs">
                  Export
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setActiveTab('products')} className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-200 hover:bg-gray-50'} border p-8 rounded-[2.5rem] flex flex-col items-center space-y-3 transition-all active:scale-95 shadow-sm`}>
                <Package className="h-10 w-10 text-blue-500" />
                <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Inventory</span>
              </button>
              <button onClick={() => setActiveTab('customers')} className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-200 hover:bg-gray-50'} border p-8 rounded-[2.5rem] flex flex-col items-center space-y-3 transition-all active:scale-95 shadow-sm`}>
                <Users className="h-10 w-10 text-indigo-500" />
                <span className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Clientele</span>
              </button>
            </div>
          </div>
        );
      case 'products':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black">Stock Catalog</h3>
                <button onClick={() => setActiveTab('dashboard')} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-blue-500 font-bold text-xs uppercase tracking-widest">Back</button>
             </div>
             <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border p-6 rounded-3xl flex justify-between items-center shadow-sm`}>
                    <div>
                      <p className="font-black text-xl text-blue-500">{p.name}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">1KG: ₹{p.price1kg}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">0.5KG: ₹{p.price05kg}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 font-black text-2xl">{p.stockLevel}</p>
                      <p className="text-[9px] uppercase font-black text-slate-500 tracking-[0.1em]">Remaining</p>
                    </div>
                  </div>
                ))}
                {products.length === 0 && <p className="text-center text-slate-500 italic py-12">No products loaded.</p>}
             </div>
          </div>
        );
      case 'customers':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black">Client Records</h3>
                <button onClick={() => setActiveTab('dashboard')} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-blue-500 font-bold text-xs uppercase tracking-widest">Back</button>
             </div>
             <div className="space-y-3">
                {customers.map(c => (
                  <div key={c.id} className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border p-6 rounded-3xl shadow-sm`}>
                      <p className="font-black text-xl">{c.name}</p>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                        <span className="font-bold">{c.mobile}</span>
                        <span>•</span>
                        <span className="opacity-80 italic">{c.address}</span>
                      </div>
                      <p className="text-[10px] mt-3 font-mono text-blue-500/60 uppercase tracking-tighter">Code: {c.code}</p>
                  </div>
                ))}
                {customers.length === 0 && <p className="text-center text-slate-500 italic py-12">Customer directory empty.</p>}
             </div>
          </div>
        );
      case 'billing':
        return <BillingPage salesmanId={salesmanId} onComplete={() => setActiveTab('dashboard')} />;
      case 'history':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-blue-900'} mb-6`}>Transaction Archive</h3>
            <div className="space-y-3">
              {sales.map(sale => (
                <button 
                  key={sale.id} 
                  onClick={() => setReprintSale(sale)}
                  className={`w-full text-left ${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' : 'bg-white border-gray-100 hover:bg-gray-50 shadow-sm'} border p-6 rounded-3xl flex justify-between items-center active:scale-[0.98] transition-all`}
                >
                   <div>
                      <p className="font-black text-lg">{sale.customerName}</p>
                      <div className="flex items-center space-x-2 text-xs opacity-60 mt-1">
                        <span className="font-mono">#{sale.invoiceNumber}</span>
                        <span>•</span>
                        <span>{new Date(sale.date).toLocaleDateString()}</span>
                      </div>
                   </div>
                   <div className="text-right">
                     <p className="font-black text-blue-600 text-xl tracking-tighter">₹{sale.totalAmount}</p>
                     <Printer className="h-4 w-4 text-slate-400 mt-1 ml-auto" />
                   </div>
                </button>
              ))}
              {sales.length === 0 && <p className="text-center text-slate-500 italic py-20">No local transaction history found.</p>}
            </div>
          </div>
        );
      case 'update':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h3 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-blue-900'} mb-6`}>Satellite Data Hub</h3>
            <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border p-12 rounded-[3rem] text-center shadow-2xl space-y-10`}>
               <div className="relative">
                  <div className="p-4 bg-blue-500/10 rounded-3xl inline-block mb-4">
                    <RefreshCcw className="h-10 w-10 text-blue-500" />
                  </div>
                  <h4 className="font-black text-blue-500 uppercase tracking-[0.2em] text-[10px] mb-4">Manager Data Refresh</h4>
                  <input type="file" id="master-sync" className="hidden" onChange={handleMasterImport} accept=".json" />
                  <label htmlFor="master-sync" className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black cursor-pointer shadow-xl hover:bg-blue-700 transition-all inline-block w-full uppercase tracking-widest text-sm active:scale-95">
                     Update Inventory/Customers
                  </label>
                  <p className="text-[10px] text-slate-500 mt-3 italic">Use AV_MASTER_CLONE file</p>
               </div>
               <div className="border-t border-slate-700/20 pt-10">
                  <div className="p-4 bg-orange-500/10 rounded-3xl inline-block mb-4">
                    <RefreshCcw className="h-10 w-10 text-orange-500" />
                  </div>
                  <h4 className="font-black text-orange-500 uppercase tracking-[0.2em] text-[10px] mb-4">Daily Sales Submission</h4>
                  <button onClick={handleExportSync} className="bg-orange-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-xl hover:bg-orange-700 transition-all inline-block w-full uppercase tracking-widest text-sm active:scale-95">
                     Export My Daily Sales
                  </button>
                  <p className="text-[10px] text-slate-500 mt-3 italic">Generates report for Manager</p>
               </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'} flex flex-col transition-colors duration-300`}>
      <header className="bg-blue-600 text-white p-6 sticky top-0 z-20 shadow-lg rounded-b-[2rem]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md border border-white/10">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Terminal {salesmanId}</h1>
              <p className="text-[10px] text-blue-100 font-black opacity-80 uppercase tracking-[0.3em]">Operational</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={toggleTheme} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/5">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button onClick={onLogout} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/5">
              <LogOut className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 pb-36 max-w-2xl mx-auto w-full">
        {renderContent()}
      </main>

      <nav className={`fixed bottom-0 inset-x-0 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]'} border-t px-8 py-5 flex justify-between items-center z-30 rounded-t-[3rem] transition-colors duration-300`}>
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
          <LayoutDashboard className="h-6 w-6" /><span className="text-[9px] font-black uppercase tracking-widest">Home</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`}>
          <History className="h-6 w-6" /><span className="text-[9px] font-black uppercase tracking-widest">Archive</span>
        </button>
        
        <div className="relative -mt-16">
          <button onClick={() => setActiveTab('billing')} className="bg-blue-600 text-white p-5 rounded-full shadow-2xl shadow-blue-400 ring-[10px] ring-gray-50 dark:ring-slate-900 hover:bg-blue-700 transition-all active:scale-95"><PlusCircle className="h-10 w-10" /></button>
          {stats.pending > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-full border-2 border-white dark:border-slate-900">{stats.pending}</span>}
        </div>

        <button onClick={() => setActiveTab('update')} className={`flex flex-col items-center space-y-1 transition-all ${activeTab === 'update' ? 'text-blue-600' : 'text-slate-400'}`}>
          <RefreshCcw className="h-6 w-6" /><span className="text-[9px] font-black uppercase tracking-widest">Hub</span>
        </button>
        <button onClick={() => setActiveTab('history')} className="opacity-0 w-6 h-6" disabled />
      </nav>

      <AuthorFootnote />

      {reprintSale && (
        <div className="fixed inset-0 bg-white z-[300] flex flex-col items-center p-12 overflow-y-auto animate-in zoom-in-95 duration-300">
          <div id="thermal-receipt" className="p-8 bg-white text-black text-center w-[80mm] mx-auto border border-slate-200 shadow-2xl mb-10 rounded-xl">
             <h1 className="text-3xl font-black mb-1 uppercase tracking-tighter">AV STORE</h1>
             <p className="text-[11px] mb-6 font-bold uppercase tracking-widest text-gray-600">DUPLICATE RECEIPT</p>
             <div className="text-left text-[12px] space-y-2 mb-6 border-t border-b border-black border-dashed py-4 font-mono">
                <div className="flex justify-between"><span>INV:</span> <b>#{reprintSale.invoiceNumber}</b></div>
                <div className="flex justify-between"><span>DATE:</span> <span>{new Date(reprintSale.date).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>CUST:</span> <b>{reprintSale.customerName}</b></div>
             </div>
             <div className="text-left text-[12px] space-y-3 mb-6 font-mono">
               {reprintSale.items.map((it, i) => (
                 <div key={i} className="flex justify-between items-start border-b border-gray-100 pb-1 last:border-0">
                    <span className="flex-1 font-bold">{it.productName} ({it.type}) x{it.quantity}</span>
                    <span className="ml-4 font-black">₹{it.total}</span>
                 </div>
               ))}
             </div>
             <div className="border-t border-black border-dashed pt-4 flex justify-between items-end mb-6">
                <span className="font-black text-sm uppercase tracking-widest">GRAND TOTAL</span>
                <span className="font-black text-2xl tracking-tighter">₹{reprintSale.totalAmount}</span>
             </div>
          </div>
          <div className="flex flex-col gap-4 w-full max-w-xs no-print">
             <div className="p-5 bg-blue-50 border border-blue-200 rounded-3xl flex items-start space-x-4 mb-2">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-1" />
                <p className="text-[10px] text-blue-800 font-bold uppercase tracking-widest leading-relaxed">To download: Select 'Save as PDF' as the Destination in the print dialog.</p>
             </div>
             <button onClick={() => window.print()} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-2xl shadow-blue-200 transition-all active:scale-95">PRINT PHYSICAL SLIP</button>
             <button onClick={() => setReprintSale(null)} className="w-full bg-slate-100 text-slate-600 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all">Close Archive</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesmanDashboard;
