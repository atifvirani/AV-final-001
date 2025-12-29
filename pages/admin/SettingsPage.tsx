
import React, { useState, useEffect } from 'react';
import { db, getDatabaseSize } from '../../db';
import { Download, ShieldCheck, Database, HardDrive } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [storageUsed, setStorageUsed] = useState('0 KB');

  useEffect(() => {
    const updateSize = async () => {
      const bytes = await getDatabaseSize();
      if (bytes > 1024 * 1024) setStorageUsed((bytes / (1024 * 1024)).toFixed(2) + ' MB');
      else setStorageUsed((bytes / 1024).toFixed(2) + ' KB');
    };
    updateSize();
  }, []);

  const exportMasterBackup = async () => {
    try {
      const data = {
        products: await db.products.toArray(),
        customers: await db.customers.toArray(),
        sales: await db.sales.toArray(),
        stockLogs: await db.stockLogs.toArray(),
        timestamp: new Date().toISOString(),
        version: '2.0-AV'
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AV_MASTER_CLONE_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } catch (err) {
      alert("Backup failed: " + err);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <HardDrive className="h-6 w-6 text-blue-400" />
            <h3 className="text-xl font-bold">Storage Monitor</h3>
          </div>
          <p className="text-slate-400 text-sm mb-4">Local storage usage of IndexedDB.</p>
          <div className="text-3xl font-black text-white">{storageUsed}</div>
        </div>

        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-6 w-6 text-green-400" />
            <h3 className="text-xl font-bold">Master Clone</h3>
          </div>
          <p className="text-slate-400 text-sm mb-4">Download all tables for full system restoration.</p>
          <button onClick={exportMasterBackup} className="bg-blue-600 px-6 py-2.5 rounded-xl font-bold flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Generate Backup</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
