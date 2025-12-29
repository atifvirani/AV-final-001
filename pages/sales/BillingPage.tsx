
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Customer, Product, SaleItem, Sale } from '../../types';
import { Search, Plus, UserPlus, ShoppingCart, Trash2, Printer, X, Delete } from 'lucide-react';

const BillingPage: React.FC<{ salesmanId: string; onComplete: () => void }> = ({ salesmanId, onComplete }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [showPrint, setShowPrint] = useState<Sale | null>(null);
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', address: '', mobile: '' });
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [prodSearch, setProdSearch] = useState('');

  // Num-Pad State
  const [showNumPad, setShowNumPad] = useState(false);
  const [numpadValue, setNumpadValue] = useState('');
  const [pendingSelection, setPendingSelection] = useState<{product: Product, type: '1kg' | '0.5kg'} | null>(null);

  useEffect(() => {
    db.customers.toArray().then(setCustomers);
    db.products.where('isDeleted').equals(0).toArray().then(setProducts);
  }, []);

  const openNumPad = (product: Product, type: '1kg' | '0.5kg') => {
    setPendingSelection({ product, type });
    setNumpadValue('');
    setShowNumPad(true);
  };

  const handleNumPadPress = (val: string) => {
    if (numpadValue.length < 4) {
      setNumpadValue(prev => prev + val);
    }
  };

  const confirmQuantity = () => {
    if (!pendingSelection || !numpadValue) return;
    const qty = parseInt(numpadValue);
    if (qty <= 0) return;

    const { product, type } = pendingSelection;
    const price = type === '1kg' ? product.price1kg : product.price05kg;

    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product.id && i.type === type);
      if (idx > -1) {
        const nc = [...prev];
        nc[idx].quantity += qty;
        nc[idx].total = nc[idx].quantity * price;
        return nc;
      }
      return [...prev, { 
        productId: product.id!, 
        productName: product.name, 
        type, 
        quantity: qty, 
        price, 
        total: qty * price 
      }];
    });

    setShowNumPad(false);
    setShowProductSearch(false);
    setPendingSelection(null);
  };

  const getBaseInvoice = (id: string) => {
    const charCode = id.toUpperCase().charCodeAt(0);
    return (charCode - 64) * 10000;
  };

  const finalizeSale = async () => {
    if (!selectedCustomer || !cart.length) return;
    
    try {
      const last = await db.sales.where('salesmanId').equals(salesmanId).last();
      const baseRange = getBaseInvoice(salesmanId);
      const invoiceNumber = last ? (parseInt(last.invoiceNumber) + 1).toString() : (baseRange + 1).toString();
      const syncId = `${salesmanId}_${invoiceNumber}_${Date.now()}`;
      
      const sale: Sale = {
        invoiceNumber,
        customerCode: selectedCustomer.code,
        customerName: selectedCustomer.name,
        salesmanId,
        date: new Date(),
        items: cart,
        totalAmount: cart.reduce((a, b) => a + b.total, 0),
        synced: false,
        syncId
      };

      await (db as any).transaction('rw', [db.sales, db.products, db.stockLogs], async () => {
        await db.sales.add(sale);
        
        for (const item of cart) {
          const p = await db.products.get(item.productId);
          if (p) {
            await db.products.update(item.productId, { stockLevel: p.stockLevel - item.quantity });
            await db.stockLogs.add({
              productId: item.productId,
              productName: item.productName,
              change: -item.quantity,
              date: new Date(),
              reason: `Sale #${invoiceNumber}`
            });
          }
        }
      });

      setShowPrint(sale);
    } catch (err) {
      alert("Error saving sale: " + err);
    }
  };

  return (
    <div className="bg-white min-h-[85vh] rounded-3xl p-6 shadow-xl flex flex-col space-y-6 relative overflow-hidden text-gray-900">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #thermal-receipt, #thermal-receipt * { visibility: visible; }
          #thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 5mm;
            font-family: 'Courier New', monospace;
            color: black;
          }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800">New Bill</h2>
        <button onClick={onComplete} className="p-2 bg-slate-100 rounded-full"><X className="h-5 w-5"/></button>
      </div>

      <div className="space-y-2">
        {selectedCustomer ? (
          <div className="bg-blue-600 text-white p-4 rounded-2xl flex justify-between items-center shadow-lg">
            <div>
              <p className="font-bold">{selectedCustomer.name}</p>
              <p className="text-xs opacity-80">{selectedCustomer.mobile}</p>
            </div>
            <button onClick={() => setSelectedCustomer(null)} className="p-1 bg-white/20 rounded hover:bg-white/40"><X className="h-4 w-4"/></button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Customer..." 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              value={custSearch}
              onChange={e => setCustSearch(e.target.value)}
            />
            {custSearch && (
              <div className="absolute top-full w-full bg-white border border-slate-100 shadow-2xl rounded-2xl mt-2 z-50 p-2 space-y-1">
                {customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.mobile.includes(custSearch)).map(c => (
                  <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustSearch(''); }} className="w-full text-left p-3 hover:bg-blue-50 rounded-xl transition-colors">
                    <p className="font-bold text-sm">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.mobile}</p>
                  </button>
                ))}
                <button onClick={() => setIsRegistering(true)} className="w-full text-center p-3 text-blue-600 font-bold text-sm border-t border-slate-50 hover:bg-slate-50 rounded-b-xl">+ Add New Record</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
        {cart.map((item, idx) => (
          <div key={idx} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
            <div>
              <p className="font-bold text-slate-800">{item.productName}</p>
              <p className="text-xs text-slate-500">{item.type} | {item.quantity} x ₹{item.price}</p>
            </div>
            <div className="flex items-center space-x-4">
              <p className="font-black text-blue-600 text-lg">₹{item.total}</p>
              <button onClick={() => setCart(c => c.filter((_, i) => i !== idx))} className="p-2 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="h-4 w-4"/></button>
            </div>
          </div>
        ))}
        {cart.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 italic py-12">
            <ShoppingCart className="h-16 w-16 mb-4 opacity-10"/>
            <p>Your cart is empty</p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 space-y-4">
        <button onClick={() => setShowProductSearch(true)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all">+ Select Products</button>
        <div className="flex justify-between items-end px-2">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Payable</p>
          <p className="text-4xl font-black text-slate-900">₹{cart.reduce((a, b) => a + b.total, 0)}</p>
        </div>
        <button onClick={finalizeSale} disabled={!selectedCustomer || !cart.length} className="w-full py-5 bg-blue-600 disabled:bg-slate-200 text-white rounded-2xl font-black shadow-xl shadow-blue-200 disabled:shadow-none transition-all active:scale-95">FINALIZE & PRINT INVOICE</button>
      </div>

      {showProductSearch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] p-4 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl text-slate-800">Choose Product</h3>
              <button onClick={() => setShowProductSearch(false)}><X className="h-6 w-6 text-slate-400"/></button>
            </div>
            <input type="text" placeholder="Filter by name..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-4 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase())).map(p => (
                <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="font-bold text-slate-800 mb-3">{p.name}</p>
                  <div className="flex gap-2">
                    <button onClick={() => openNumPad(p, '1kg')} className="flex-1 py-3 bg-white rounded-xl text-xs font-bold border border-slate-200 shadow-sm active:bg-blue-50">1kg @ ₹{p.price1kg}</button>
                    <button onClick={() => openNumPad(p, '0.5kg')} className="flex-1 py-3 bg-white rounded-xl text-xs font-bold border border-slate-200 shadow-sm active:bg-blue-50">0.5kg @ ₹{p.price05kg}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showNumPad && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[300] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl text-center">
            <h3 className="text-xl font-black text-slate-800">Enter Quantity</h3>
            <p className="text-slate-500 font-medium">Selected: {pendingSelection?.product.name} ({pendingSelection?.type})</p>
            
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
               <span className="text-5xl font-black text-blue-600">{numpadValue || '0'}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['1','2','3','4','5','6','7','8','9','0'].map(num => (
                <button 
                  key={num} 
                  onClick={() => handleNumPadPress(num)} 
                  className={`py-4 rounded-2xl font-black text-xl border transition-all active:scale-90 ${num === '0' ? 'col-span-2' : ''} bg-white text-slate-700 hover:bg-slate-50 border-slate-100 shadow-sm`}
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => setNumpadValue(prev => prev.slice(0, -1))} 
                className="py-4 bg-red-50 text-red-500 rounded-2xl font-black text-xl border border-red-100 flex items-center justify-center active:scale-90"
              >
                <Delete className="h-6 w-6" />
              </button>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setShowNumPad(false)} className="flex-1 py-4 font-bold text-slate-400">Cancel</button>
              <button onClick={confirmQuantity} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl active:scale-95">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showPrint && (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col items-center p-8 overflow-y-auto">
          <div id="thermal-receipt" className="p-4 bg-white text-black text-center w-[80mm] mx-auto border border-slate-100 shadow-lg mb-8">
            <h1 className="text-2xl font-black mb-1">AV STORE</h1>
            <p className="text-[10px] mb-4">Quality & Trust Since Day 1</p>
            <div className="text-left text-xs space-y-1 mb-4 border-t border-b border-slate-100 py-2">
              <div className="flex justify-between"><span>Inv No:</span> <b>#{showPrint.invoiceNumber}</b></div>
              <div className="flex justify-between"><span>Date:</span> <span>{new Date(showPrint.date).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Customer:</span> <span>{showPrint.customerName}</span></div>
            </div>
            <div className="text-left text-xs space-y-2 mb-4">
              {showPrint.items.map((it, i) => (
                <div key={i} className="flex justify-between items-start">
                  <span className="flex-1">{it.productName} ({it.type}) x{it.quantity}</span>
                  <span className="ml-2">₹{it.total}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-black border-dashed my-2 pt-2 flex justify-between">
              <span className="font-black text-sm uppercase">Grand Total</span>
              <span className="font-black text-lg">₹{showPrint.totalAmount}</span>
            </div>
            <p className="text-[9px] mt-6 text-slate-500 italic">No return without this receipt. Thank you!</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs no-print">
            <button onClick={() => window.print()} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl">PRINT PHYSICAL COPY</button>
            <button onClick={() => { setShowPrint(null); setCart([]); onComplete(); }} className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold">CLOSE BILL</button>
          </div>
        </div>
      )}

      {isRegistering && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-4 shadow-2xl">
            <h3 className="font-black text-2xl text-slate-800">Customer Registration</h3>
            <p className="text-slate-400 text-sm">Add a new buyer to the local database.</p>
            <div className="space-y-4 pt-2">
              <input type="text" placeholder="Full Name" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-gray-900" onChange={e => setNewCust({...newCust, name: e.target.value})} />
              <input type="text" placeholder="Mobile Number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-gray-900" onChange={e => setNewCust({...newCust, mobile: e.target.value})} />
              <input type="text" placeholder="Detailed Address" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-gray-900" onChange={e => setNewCust({...newCust, address: e.target.value})} />
            </div>
            <div className="flex gap-2 pt-6">
              <button onClick={() => setIsRegistering(false)} className="flex-1 py-4 font-bold text-slate-400">Cancel</button>
              <button onClick={async () => {
                if(!newCust.name || !newCust.mobile) return alert("Fill required fields");
                const code = `${newCust.name}_${newCust.mobile}`.toLowerCase().replace(/\s/g, '_');
                const id = await db.customers.add({...newCust, code});
                setSelectedCustomer(await db.customers.get(id) || null);
                setIsRegistering(false);
              }} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">Save Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
