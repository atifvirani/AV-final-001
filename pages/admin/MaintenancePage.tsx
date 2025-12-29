
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';

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
      alert('Invalid Maintenance Key');
    }
  };

  const loadTableData = async (tableName: any) => {
    const data = await (db as any)[tableName].toArray();
    setActiveTable(data);
    setCurrentTableName(tableName);
  };

  const clearTable = async (tableName: any) => {
    if (window.confirm(`Are you SURE you want to clear the entire ${tableName} table? This cannot be undone.`)) {
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
      <div className="max-w-md mx-auto mt-20 p-8 bg-slate-800 rounded-2xl border border-slate-700 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Maintenance Lock</h2>
        <p className="text-slate-400 text-sm mt-2 mb-6">Enter the master key to access raw database collections.</p>
        <form onSubmit={handleUnlock} className="space-y-4">
          <input
            type="password"
            value={maintenanceKey}
            onChange={(e) => setMaintenanceKey(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Maintenance Key"
          />
          <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-xl transition-all">
            Access Database
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          {tableList.map((t) => (
            <button
              key={t}
              onClick={() => loadTableData(t)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                currentTableName === t ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => clearTable(currentTableName)}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-all"
        >
          <Trash2 className="h-4 w-4" />
          <span>Purge {currentTableName}</span>
        </button>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-400">ID</th>
              <th className="px-6 py-4 font-semibold text-slate-400">Raw Content (JSON)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {activeTable.length > 0 ? (
              activeTable.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-750 transition-colors">
                  <td className="px-6 py-4 font-mono text-blue-400">{item.id || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <pre className="text-[10px] bg-slate-950 p-2 rounded-lg text-green-400 overflow-x-auto whitespace-pre-wrap max-w-2xl">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-slate-500 italic">No records found in this collection.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaintenancePage;
