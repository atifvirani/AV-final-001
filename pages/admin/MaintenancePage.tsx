
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Trash2, AlertTriangle, Lock } from 'lucide-react';

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
      <div className="max-w-md mx-auto mt-20 p-12 bg-slate-800 rounded-[3rem] border border-slate-700 text-center shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] transition-all animate-in zoom-in-95">
        <div className="p-6 bg-yellow-500/10 rounded-full inline-block mb-8 relative">
          <Lock className="h-14 w-14 text-yellow-500 mx-auto" />
          <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full -z-10 animate-pulse"></div>
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">System Lock</h2>
        <p className="text-slate-400 text-sm mt-3 mb-10 px-6 font-bold leading-relaxed uppercase tracking-widest text-[10px]">Raw database access requires high-level clearance. Enter AV999.</p>
        <form onSubmit={handleUnlock} className="space-y-6">
          <input
            type="password"
            value={maintenanceKey}
            onChange={(e) => setMaintenanceKey(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-3xl px-8 py-5 outline-none focus:ring-2 focus:ring-yellow-500 text-white text-center font-black tracking-[0.5em] text-xl shadow-inner"
            placeholder="••••"
          />
          <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-black py-5 rounded-3xl transition-all shadow-xl shadow-yellow-900/30 uppercase tracking-[0.2em] text-xs active:scale-95">
            Authorize Access
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
              className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border shadow-sm ${
                currentTableName === t ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20 shadow-lg' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => clearTable(currentTableName)}
          className="flex items-center space-x-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-[10px] font-black transition-all shadow-xl shadow-red-900/20 uppercase tracking-[0.2em] active:scale-95"
        >
          <Trash2 className="h-4 w-4" />
          <span>Purge Collection</span>
        </button>
      </div>

      <div className="bg-slate-800 rounded-[2.5rem] border border-slate-700 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-700">
              <tr>
                <th className="px-10 py-6 font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Identifier</th>
                <th className="px-10 py-6 font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Data Content (Serialized)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {activeTable.length > 0 ? (
                activeTable.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-750 transition-colors">
                    <td className="px-10 py-8 font-black text-blue-400 font-mono tracking-tighter text-lg align-top">#${item.id || 'N/A'}</td>
                    <td className="px-10 py-8">
                      <pre className="text-[11px] bg-slate-950 p-8 rounded-3xl text-emerald-400 overflow-x-auto whitespace-pre-wrap max-w-5xl font-mono leading-relaxed border border-slate-900 shadow-inner">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-10 py-24 text-center text-slate-500 italic font-bold uppercase tracking-widest">No entries found in this collection.</td>
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
