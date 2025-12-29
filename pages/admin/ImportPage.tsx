
import React, { useState } from 'react';
import { db } from '../../db';
import { RefreshCcw, FileUp, CheckCircle, AlertCircle } from 'lucide-react';

const ImportPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<{ type: 'info' | 'error', msg: string }[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLog([]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = JSON.parse(event.target?.result as string);
        
        if (content.version === '2.0-AV') {
          // Master Full Backup Restoration
          if (window.confirm('CRITICAL: Overwrite entire local database with this MASTER BACKUP? All current local data will be LOST.')) {
            await (db as any).transaction('rw', [db.products, db.customers, db.sales, db.stockLogs], async () => {
              await db.products.clear();
              await db.customers.clear();
              await db.sales.clear();
              await db.stockLogs.clear();
              
              await db.products.bulkPut(content.products || []);
              await db.customers.bulkPut(content.customers || []);
              await db.sales.bulkPut(content.sales || []);
              await db.stockLogs.bulkPut(content.stockLogs || []);
            });
            setLog([{ type: 'info', msg: 'System restoration complete. All tables updated.' }]);
          }
        } else if (content.salesmanId && content.sales) {
          // Salesman Sync Import - Deep Merge
          let imported = 0;
          let skipped = 0;
          let stockUpdates = 0;

          await (db as any).transaction('rw', [db.sales, db.products, db.customers, db.stockLogs], async () => {
            for (const sale of content.sales) {
              const uniqueSyncId = sale.syncId || `${content.salesmanId}_${sale.invoiceNumber}_${new Date(sale.date).getTime()}`;
              const exists = await db.sales.where('syncId').equals(uniqueSyncId).first();
              
              if (!exists) {
                const { id, ...sanitized } = sale;
                
                // 1. Add Sale
                await db.sales.add({ ...sanitized, syncId: uniqueSyncId, synced: true });
                imported++;

                // 2. Adjust Stock levels for the master DB
                for (const item of sale.items) {
                  const p = await db.products.get(item.productId);
                  if (p) {
                    await db.products.update(item.productId, { stockLevel: p.stockLevel - item.quantity });
                    await db.stockLogs.add({
                      productId: item.productId,
                      productName: item.productName,
                      change: -item.quantity,
                      date: new Date(sale.date),
                      reason: `Sync Import #${sale.invoiceNumber}`
                    });
                    stockUpdates++;
                  }
                }

                // 3. Ensure Customer Exists
                const custExists = await db.customers.where('code').equals(sale.customerCode).first();
                if (!custExists) {
                  await db.customers.add({
                    code: sale.customerCode,
                    name: sale.customerName,
                    address: 'Imported via Sync',
                    mobile: sale.customerCode.split('_').pop() || '0000'
                  });
                }
              } else {
                skipped++;
              }
            }
          });
          
          setLog([
            { type: 'info', msg: `Import success: ${imported} sales added.` },
            { type: 'info', msg: `Duplicate guard: ${skipped} sales skipped.` },
            { type: 'info', msg: `Inventory: ${stockUpdates} product stock levels adjusted.` }
          ]);
        } else {
          setLog([{ type: 'error', msg: 'Invalid file format. Ensure you are importing a 2.0-AV Backup or a Salesman Sync File.' }]);
        }
      } catch (err) {
        setLog([{ type: 'error', msg: 'Parsing Error: ' + err }]);
      }
      setLoading(false);
      // Reset input
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="bg-slate-800 rounded-[2.5rem] border border-slate-700 p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <RefreshCcw className="h-40 w-40" />
        </div>

        <div className="flex items-center space-x-6 mb-12">
          <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/40">
            <RefreshCcw className={`h-8 w-8 text-white ${loading ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h3 className="text-2xl font-black">Sync Engine 2.0</h3>
            <p className="text-slate-400 text-sm mt-1">Bi-directional data merge with integrity checking.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="group p-10 bg-slate-900 border-2 border-dashed border-slate-700 rounded-3xl flex flex-col items-center justify-center transition-all hover:border-blue-500/50 hover:bg-slate-900/50">
            <FileUp className="h-16 w-16 text-slate-600 mb-6 group-hover:text-blue-500 transition-colors" />
            <input type="file" id="import" className="hidden" onChange={handleFileUpload} accept=".json" />
            <label htmlFor="import" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black cursor-pointer shadow-xl active:scale-95 transition-all">Select System File</label>
            <p className="text-slate-500 text-[10px] mt-4 uppercase tracking-widest">Supports JSON Backup / Sync</p>
          </div>

          <div className="bg-slate-950 p-8 rounded-3xl h-64 overflow-y-auto border border-slate-800 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Real-time Activity Log</p>
              {loading && <div className="h-1 w-12 bg-blue-500 animate-pulse rounded-full"></div>}
            </div>
            <div className="space-y-3">
              {log.length === 0 && <p className="text-slate-600 text-sm italic">Ready to process incoming data...</p>}
              {log.map((l, i) => (
                <div key={i} className={`flex items-start space-x-3 text-sm animate-in fade-in slide-in-from-left-4 duration-300 ${l.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                   <span className="mt-1">{l.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}</span>
                   <p className="flex-1 leading-relaxed">{l.msg}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
           <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-tighter">Dup-Guard</p>
           <p className="text-sm text-slate-300">Skips any transaction previously imported by comparing unique Sync IDs.</p>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
           <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-tighter">Auto-Stock</p>
           <p className="text-sm text-slate-300">Recalculates product levels based on salesman sales volume automatically.</p>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
           <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-tighter">Guest-Detect</p>
           <p className="text-sm text-slate-300">Identifies and saves new customers registered by salesmen on the field.</p>
        </div>
      </div>
    </div>
  );
};

export default ImportPage;
