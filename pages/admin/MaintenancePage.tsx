
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Trash2, AlertTriangle } from 'lucide-react';

const MaintenancePage: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [maintenanceKey, setMaintenanceKey] = useState('');
  const [activeTable, setActiveTable] = useState<any[]>([]);
  const [currentTableName, setCurrentTableName] = useState<'products' | 'customers' | 'sales' | 'stockLogs'>('products');

  const tableList = ['products', 'customers', 'sales', 'stockLogs'];

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (maintenanceKey === 'AV999') {
      setIsUnlocked(true);
    } else {
      alert('Maintenance Key Denied.');
    }
  };

  const loadTableData = async (tableName: any) => {
    const data = await (db as any)[tableName].toArray();
    setActiveTable(data);
    setCurrentTableName(tableName);
  };

  const clearTable = async (tableName: any) => {
    if (window.confirm(`CRITICAL: Purge entire ${tableName} collection?`)) {
      await (db as any)[tableName].clear();
      loadTableData(tableName);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      loadTableData('products');
    }
  }, [isUnlocked]);

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-20 p-10 bg-slate-800 rounded-[2.5rem] border border-slate-700 text-center shadow-2xl">
        <div className="p-4 bg-yellow-500/10 rounded-3xl inline-block mb-6">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
        </div>
        <h2 className="text-2xl font-black text-white">System Lock</h2>
        <p className="text-slate-400 text-sm mt-2 mb-8 px-4 font-medium leading-relaxed">Accessing raw database tables requires high-level clearance. Enter AV999 to proceed.</p>
        <form onSubmit={handleUnlock} className="space-y-4">
          <input
            type="password"
            value={maintenanceKey}
            onChange={(e) => setMaintenanceKey(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-yellow-500 text-white text-center font-black tracking-widest"
            placeholder="••••••••"
          />
          <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-yellow-900/20 uppercase tracking-widest text-sm">
            Unlock Database
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {tableList.map((t) => (
            <button
              key={t}
              onClick={() => loadTableData(t)}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border shadow-sm ${
                currentTableName === t ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => clearTable(currentTableName)}
          className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all shadow-lg uppercase tracking-widest"
        >
          <Trash2 className="h-4 w-4" />
          <span>Purge {currentTableName}</span>
        </button>
      </div>

      <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-700">
              <tr>
                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Reference ID</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Serialized Dataset (JSON)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {activeTable.length > 0 ? (
                activeTable.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-750 transition-colors">
                    <td className="px-8 py-6 font-black text-blue-400 font-mono tracking-tighter">#${item.id || 'SYS-UID'}</td>
                    <td className="px-8 py-6">
                      <pre className="text-[11px] bg-slate-950 p-6 rounded-2xl text-emerald-400 overflow-x-auto whitespace-pre-wrap max-w-4xl font-mono leading-relaxed border border-slate-900/50 shadow-inner">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-8 py-16 text-center text-slate-500 italic font-medium">Collection is currently empty.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
