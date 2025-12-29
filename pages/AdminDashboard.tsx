
import React, { useState } from 'react';
import { LayoutDashboard, Package, Users, History, Database, Settings, LogOut, TrendingUp, RefreshCcw } from 'lucide-react';
import ProductsPage from './admin/ProductsPage';
import CustomersPage from './admin/CustomersPage';
import SalesHistoryPage from './admin/SalesHistoryPage';
import StockPage from './admin/StockPage';
import MaintenancePage from './admin/MaintenancePage';
import SettingsPage from './admin/SettingsPage';
import ImportPage from './admin/ImportPage';
import MasterTab from './admin/MasterTab';
import AuthorFootnote from '../components/AuthorFootnote';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'master', label: 'Master Stats', icon: TrendingUp },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'sales', label: 'Sales History', icon: History },
    { id: 'stock', label: 'Inventory', icon: Database },
    { id: 'import', label: 'Sync/Import', icon: RefreshCcw },
    { id: 'maintenance', label: 'Maintenance', icon: Settings },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Quick Actions</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => setActiveTab('products')} className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold transition-all">Add Product</button>
                <button onClick={() => setActiveTab('stock')} className="p-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-bold transition-all">Update Stock</button>
              </div>
            </div>
            {/* Additional Overview Stats widgets would go here */}
          </div>
        );
      case 'master': return <MasterTab />;
      case 'products': return <ProductsPage />;
      case 'customers': return <CustomersPage />;
      case 'sales': return <SalesHistoryPage />;
      case 'stock': return <StockPage />;
      case 'import': return <ImportPage />;
      case 'maintenance': return <MaintenancePage />;
      case 'settings': return <SettingsPage />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black">AV</div>
            <span className="font-bold tracking-tight text-lg">Admin Pro</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 overflow-y-auto bg-slate-900 p-4 md:p-8 relative">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-slate-400 mt-1">Unified Management System</p>
          </div>
          <div className="flex items-center space-x-3 bg-slate-800 p-2 rounded-xl border border-slate-700">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center border-2 border-green-500 shadow-glow">
              <span className="text-xs font-bold text-green-400">ON</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold">System Status</div>
              <div className="text-[10px] text-green-400 uppercase tracking-widest">Active</div>
            </div>
          </div>
        </header>

        {renderContent()}

        <footer className="mt-12">
          <AuthorFootnote />
        </footer>
      </main>
    </div>
  );
};

export default AdminDashboard;
