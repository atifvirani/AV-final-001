
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Sale, Product, Customer } from '../types';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Users, 
  Package, 
  LogOut, 
  RefreshCcw, 
  Download, 
  Sun, 
  Moon, 
  CheckCircle, 
  Clock, 
  Info,
  ArrowRight,
  ShieldCheck,
  FileText,
  Printer
} from 'lucide-react';
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
    
    // DASHBOARD FILTER: Sum only TODAY'S sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysSales = userSales.filter(s => {
      const saleDate = new Date(s.date);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === today.getTime();
    });

    const total = todaysSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const pending = userSales.filter(s => !s.synced).length;
    
    setStats({ total, count: todaysSales.length, pending });
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
    if (pendingSales.length === 0) return alert('No pending sales to export.');

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
    alert('Export Successful! Share the generated file with the Admin.');
  };

  const handleMasterImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = JSON.parse(event.target?.result as string);
        if (content.version === '2.0-AV') {
          if (window.confirm('Update local catalog and clients from Master Data?')) {
            await (db as any).transaction('rw', [db.products, db.customers], async () => {
              await db.products.clear();
              await db.products.bulkPut(content.products || []);
              await db.customers.bulkPut(content.customers || []);
            });
            alert('System Data Synchronized.');
            loadSales();
          }
        } else {
          alert('Invalid file format. Please use a valid Master Clone.');
        }
      } catch (err) {
        alert('Sync failed: ' + err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', label: 'Billing', icon: PlusCircle },
    { id: 'history', label: 'Invoices', icon: History },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products', icon: Package },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Row: Summary Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700 shadow-blue-900/10' : 'bg-white border-slate-200 shadow-slate-200/50'} border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group transition-all`}>
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                  <CheckCircle className="h-20 w-20 text-blue-500" />
                </div>
                <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} text-xs font-black uppercase tracking-[0.2em] mb-2`}>Today's Revenue</div>
                <div className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tighter`}>₹{stats.total.toLocaleString()}</div>
                <div className="mt-4 flex items-center space-x-2">
                   <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${stats.pending === 0 ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                     {stats.pending === 0 ? 'Synced' : `${stats.pending} Pending Sync`}
                   </div>
                </div>
              </div>

              <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700 shadow-indigo-900/10' : 'bg-white border-slate-200 shadow-slate-200/50'} border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group transition-all`}>
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                  <FileText className="h-20 w-20 text-indigo-500" />
                </div>
                <div className={`${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} text-xs font-black uppercase tracking-[0.2em] mb-2`}>Today's Invoices</div>
                <div className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tighter`}>{stats.count}</div>
                <p className="text-xs text-slate-500 mt-4 font-bold uppercase tracking-widest">Active Shift Terminal</p>
              </div>
            </div>

            {/* Middle Zone: Satellite Data Hub */}
            <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'} border p-10 rounded-[3rem] shadow-inner`}>
              <div className="flex items-center space-x-3 mb-8">
                <RefreshCcw className="h-6 w-6 text-blue-500 animate-spin-slow" />
                <h3 className={`text-xl font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Satellite Data Hub</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Import Box */}
                <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border p-8 rounded-[2rem] shadow-xl group hover:border-blue-500/50 transition-all`}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-4 bg-blue-500/10 rounded-2xl">
                      <RefreshCcw className="h-8 w-8 text-blue-500" />
                    </div>
                    <ArrowRight className="h-6 w-6 text-slate-700 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                  </div>
                  <h4 className="font-black text-lg mb-2">Import Hub</h4>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-6 leading-relaxed">Update Inventory & Customers from Manager Clone</p>
                  <input type="file" id="master-sync" className="hidden" onChange={handleMasterImport} accept=".json" />
                  <label htmlFor="master-sync" className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] cursor-pointer shadow-lg active:scale-95 transition-all">
                    Update Data
                  </label>
                </div>

                {/* Export Box */}
                <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border p-8 rounded-[2rem] shadow-xl group hover:border-orange-500/50 transition-all`}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-4 bg-orange-500/10 rounded-2xl">
                      <Download className="h-8 w-8 text-orange-500" />
                    </div>
                    <ArrowRight className="h-6 w-6 text-slate-700 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                  </div>
                  <h4 className="font-black text-lg mb-2">Export Hub</h4>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-6 leading-relaxed">Generate Sync File for Manager Daily Submission</p>
                  <button onClick={handleExportSync} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">
                    Export Sales
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom: Sync Status Bar */}
            <div className={`flex items-center justify-between p-6 rounded-3xl border ${stats.pending > 0 ? 'bg-orange-500/5 border-orange-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
               <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${stats.pending > 0 ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${stats.pending > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                    {stats.pending > 0 ? 'UNSYNCED DATA DETECTED' : 'SYSTEM FULLY SYNCHRONIZED'}
                  </span>
               </div>
               <ShieldCheck className={`h-5 w-5 ${stats.pending > 0 ? 'text-orange-300' : 'text-green-300'}`} />
            </div>
          </div>
        );
      case 'billing':
        return <BillingPage salesmanId={salesmanId} onComplete={() => setActiveTab('dashboard')} />;
      case 'history':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-2xl font-black mb-6">Invoice Archive</h3>
            <div className="space-y-3">
              {sales.map(sale => (
                <button 
                  key={sale.id} 
                  onClick={() => setReprintSale(sale)}
                  className={`w-full text-left ${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' : 'bg-white border-slate-200 hover:bg-slate-50'} border p-6 rounded-3xl flex justify-between items-center transition-all active:scale-[0.98] shadow-sm`}
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
                     <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${sale.synced ? 'text-green-500' : 'text-orange-500'}`}>
                       {sale.synced ? 'Reported' : 'Pending'}
                     </p>
                   </div>
                </button>
              ))}
              {sales.length === 0 && <p className="text-center text-slate-500 italic py-20 font-bold uppercase text-[10px] tracking-widest">No local records found</p>}
            </div>
          </div>
        );
      case 'customers':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black">Client Directory</h3>
                <button onClick={() => setActiveTab('billing')} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                  Register Client
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customers.map(c => (
                  <div key={c.id} className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border p-6 rounded-3xl shadow-sm`}>
                      <p className="font-black text-lg">{c.name}</p>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                        <span className="font-bold">{c.mobile}</span>
                        <span>•</span>
                        <span className="opacity-80 italic">{c.address}</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-700/10">
                        <p className="text-[10px] font-mono text-blue-500 font-bold uppercase tracking-tighter">Registry ID: {c.code}</p>
                      </div>
                  </div>
                ))}
                {customers.length === 0 && <p className="col-span-full text-center text-slate-500 italic py-12">No registered customers.</p>}
             </div>
          </div>
        );
      case 'products':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
             <h3 className="text-2xl font-black mb-6">Live Catalog</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(p => (
                  <div key={p.id} className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border p-6 rounded-3xl flex flex-col justify-between shadow-sm`}>
                    <div>
                      <p className="font-black text-xl text-blue-500 mb-2">{p.name}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          <span>1KG Pack</span>
                          <span className="text-slate-900 dark:text-white">₹{p.price1kg}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          <span>0.5KG Pack</span>
                          <span className="text-slate-900 dark:text-white">₹{p.price05kg}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-700/10 flex justify-between items-end">
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Available Volume</span>
                      <p className="text-2xl font-black text-slate-800 dark:text-white leading-none">{p.stockLevel}</p>
                    </div>
                  </div>
                ))}
                {products.length === 0 && <p className="col-span-full text-center text-slate-500 italic py-12">Catalog is empty.</p>}
             </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-gray-50 text-gray-900'} flex transition-colors duration-300`}>
      {/* PERSISTENT SIDEBAR - Professional Terminal Look */}
      <aside className={`fixed inset-y-0 left-0 w-24 md:w-28 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-2xl shadow-slate-200'} border-r z-50 flex flex-col items-center py-10 transition-colors`}>
        {/* LOGO */}
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-blue-500/20 mb-12">
          AV
        </div>

        {/* NAV ITEMS */}
        <nav className="flex-1 w-full space-y-4 px-3">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex flex-col items-center justify-center p-4 rounded-2xl transition-all group ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' 
                  : 'text-slate-500 hover:bg-slate-500/5'
              }`}
            >
              <item.icon className={`h-6 w-6 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              <span className="text-[8px] font-black uppercase tracking-widest mt-2 hidden md:block">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* BOTTOM CONTROLS */}
        <div className="mt-auto space-y-4 px-3 w-full">
          <button 
            onClick={toggleTheme}
            className={`w-full flex items-center justify-center p-4 rounded-2xl transition-all ${theme === 'dark' ? 'text-yellow-400 bg-yellow-400/5 hover:bg-yellow-400/10' : 'text-slate-400 bg-slate-100 hover:bg-slate-200'}`}
          >
            {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </button>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center p-4 rounded-2xl text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 ml-24 md:ml-28 p-8 md:p-12 relative overflow-y-auto min-h-screen">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-xs font-black uppercase tracking-[0.4em] text-blue-500">Sales Operational Terminal</span>
              <div className="h-1 w-12 bg-blue-500 rounded-full" />
            </div>
            <h2 className="text-4xl font-black capitalize tracking-tight">{activeTab.replace('-', ' ')}</h2>
          </div>
          <div className={`p-4 rounded-3xl border flex items-center space-x-4 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-800">
               <span className="text-blue-500 font-black text-xs">{salesmanId}</span>
            </div>
            <div className="hidden sm:block">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Status: Online</p>
               <p className="text-xs font-bold leading-none">Shift Active</p>
            </div>
          </div>
        </header>

        <div className="max-w-6xl">
          {renderContent()}
        </div>

        <AuthorFootnote />
      </main>

      {/* REPRINT MODAL (SALESMAN ARCHIVE RE-TRIGGER) */}
      {reprintSale && (
        <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[300] flex flex-col items-center p-12 overflow-y-auto animate-in zoom-in-95 duration-300">
          <div id="thermal-receipt" className="p-8 bg-white text-black text-center w-[80mm] mx-auto border border-slate-200 shadow-2xl mb-10 rounded-xl">
             <h1 className="text-3xl font-black mb-1 uppercase tracking-tighter">AV STORE</h1>
             <p className="text-[11px] mb-6 font-bold uppercase tracking-widest text-gray-600 font-sans text-center">Professional ERP Output</p>
             <div className="text-left text-[12px] space-y-2 mb-6 border-t border-b border-black border-dashed py-4 font-mono font-bold">
                <div className="flex justify-between"><span>INV NO:</span> <b>#{reprintSale.invoiceNumber}</b></div>
                <div className="flex justify-between"><span>DATE:</span> <span>{new Date(reprintSale.date).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>TERMINAL:</span> <span>{reprintSale.salesmanId}</span></div>
                <div className="flex justify-between"><span>CLIENT:</span> <b>{reprintSale.customerName}</b></div>
             </div>
             
             {/* GRIDDED REPRINT TABLE */}
             <table className="receipt-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginBottom: '10px' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontSize: '11px' }}>Item</th>
                    <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontSize: '11px' }}>Qty</th>
                    <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontSize: '11px' }}>Total</th>
                  </tr>
                </thead>
                {/* Fixed invalid CSS property fontMono with fontFamily */}
                <tbody style={{ fontFamily: 'monospace' }}>
                  {reprintSale.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid black', padding: '4px', fontSize: '11px' }}>{it.productName} ({it.type})</td>
                      <td style={{ border: '1px solid black', padding: '4px', fontSize: '11px' }}>{it.quantity}</td>
                      <td style={{ border: '1px solid black', padding: '4px', fontSize: '11px' }}>₹{it.total}</td>
                    </tr>
                  ))}
                </tbody>
             </table>

             <div className="border-t border-black border-dashed pt-4 flex flex-col items-end mb-6 space-y-1">
                {reprintSale.discount > 0 && (
                  <div className="flex justify-between w-full text-[10px] font-bold font-mono">
                    <span>Discount:</span>
                    <span>-₹{reprintSale.discount}</span>
                  </div>
                )}
                <div className="flex justify-between w-full pt-1">
                  <span className="font-black text-sm uppercase tracking-widest">GRAND TOTAL</span>
                  <span className="font-black text-2xl tracking-tighter">₹{reprintSale.totalAmount}</span>
                </div>
             </div>
             <p className="text-[9px] text-gray-500 italic font-bold">Thank you for your business. (Archive Copy)</p>
          </div>
          <div className="flex flex-col gap-4 w-full max-w-xs no-print">
             <div className="p-5 bg-blue-50 border border-blue-200 rounded-3xl flex items-start space-x-4 mb-2">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-1" />
                <p className="text-[10px] text-blue-800 font-bold uppercase tracking-widest leading-relaxed">To download: Select 'Save as PDF' as the Destination in the print dialog.</p>
             </div>
             <button onClick={() => window.print()} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-2xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center space-x-3">
               <Printer className="h-6 w-6" />
               <span>Re-Print Receipt</span>
             </button>
             <button onClick={() => setReprintSale(null)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all">Close Archive</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesmanDashboard;
