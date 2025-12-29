
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Customer, Product, SaleItem, Sale } from '../../types';
import { Search, ShoppingCart, Trash2, X, Delete } from 'lucide-react';

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
            // Update physical stock
            await db.products.update(item.productId, { stockLevel: p.stockLevel - item.quantity });
            // Traceable Audit Log
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
    <div className="bg-white min-h-[85vh] rounded-3xl p-6 shadow-xl flex flex-col space-y-6 relative overflow-hidden text-gray-900 transition-colors duration-300">
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
            border: 1px solid #eee;
          }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Terminal Billing</h2>
        <button onClick={onComplete} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X className="h-5 w-5 text-slate-600"/></button>
      </div>

      {/* Customer Sector */}
      <div className="space-y-2">
        {selectedCustomer ? (
          <div className="bg-blue-600 text-white p-5 rounded-2xl flex justify-between items-center shadow-lg border border-blue-500/50">
            <div>
              <p className="font-bold text-lg">{selectedCustomer.name}</p>
              <p className="text-xs opacity-90 tracking-wide">{selectedCustomer.mobile} • {selectedCustomer.address}</p>
            </div>
            <button onClick={() => setSelectedCustomer(null)} className="p-2 bg-white/20 rounded-xl hover:bg-white/40"><X className="h-5 w-5"/></button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Customer or Code..." 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-medium"
              value={custSearch}
              onChange={e => setCustSearch(e.target.value)}
            />
            {custSearch && (
              <div className="absolute top-full w-full bg-white border border-slate-200 shadow-2xl rounded-2xl mt-2 z-50 p-2 space-y-1">
                {customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.mobile.includes(custSearch)).slice(0, 5).map(c => (
                  <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustSearch(''); }} className="w-full text-left p-4 hover:bg-blue-50 rounded-xl transition-colors border-b last:border-0 border-slate-50">
                    <p className="font-bold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.mobile}</p>
                  </button>
                ))}
                <button onClick={() => setIsRegistering(true)} className="w-full text-center p-4 text-blue-600 font-black text-sm hover:bg-slate-50 rounded-xl">+ REGISTER NEW CUSTOMER</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart Items Area */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[250px] pr-1">
        {cart.map((item, idx) => (
          <div key={idx} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm">
            <div className="flex-1">
              <p className="font-bold text-slate-800">{item.productName}</p>
              <p className="text-xs text-slate-500 font-semibold">{item.type} Pack | ${item.quantity} units @ ₹${item.price}</p>
            </div>
            <div className="flex items-center space-x-4">
              <p className="font-black text-blue-600 text-xl tracking-tighter">₹${item.total}</p>
              <button onClick={() => setCart(c => c.filter((_, i) => i !== idx))} className="p-2 bg-white hover:bg-red-50 rounded-xl text-red-500 border border-slate-100 transition-all shadow-sm"><Trash2 className="h-5 w-5"/></button>
            </div>
          </div>
        ))}
        {cart.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 italic py-16">
            <ShoppingCart className="h-20 w-20 mb-4 opacity-5"/>
            <p className="text-slate-400 font-medium">Cart is currently empty</p>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="pt-6 border-t border-slate-100 space-y-4">
        <button onClick={() => setShowProductSearch(true)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all active:scale-95">+ ADD PRODUCTS</button>
        <div className="flex justify-between items-end px-2">
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Total Bill Amount</p>
          <p className="text-5xl font-black text-slate-900 tracking-tighter">₹${cart.reduce((a, b) => a + b.total, 0)}</p>
        </div>
        <button onClick={finalizeSale} disabled={!selectedCustomer || !cart.length} className="w-full py-6 bg-blue-600 disabled:bg-slate-200 text-white rounded-3xl font-black text-xl shadow-2xl shadow-blue-200 disabled:shadow-none transition-all active:scale-95 uppercase">GENERATE & PRINT RECEIPT</button>
      </div>

      {/* Product Selection Modal */}
      {showProductSearch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] p-4 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 max-h-[85vh] flex flex-col shadow-2xl ring-1 ring-black/5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-2xl text-slate-800">Choose Products</h3>
              <button onClick={() => setShowProductSearch(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="h-6 w-6 text-slate-400"/></button>
            </div>
            <input type="text" placeholder="Type product name..." className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-bold" value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scroll-smooth">
              {products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase())).map(p => (
                <div key={p.id} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-sm">
                  <p className="font-black text-slate-800 mb-4 text-lg">{p.name}</p>
                  <div className="flex gap-3">
                    <button onClick={() => openNumPad(p, '1kg')} className="flex-1 py-4 bg-white rounded-2xl text-xs font-black border border-slate-200 shadow-sm active:bg-blue-600 active:text-white transition-all">1KG @ ₹${p.price1kg}</button>
                    <button onClick={() => openNumPad(p, '0.5kg')} className="flex-1 py-4 bg-white rounded-2xl text-xs font-black border border-slate-200 shadow-sm active:bg-blue-600 active:text-white transition-all">0.5KG @ ₹${p.price05kg}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Numeric Keypad Modal */}
      {showNumPad && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[300] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 space-y-8 shadow-2xl text-center border border-white/20">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Quantity</h3>
              <p className="text-slate-400 font-bold text-sm tracking-wide">{pendingSelection?.product.name} ({pendingSelection?.type})</p>
            </div>
            
            <div className="bg-slate-100 p-8 rounded-[2rem] border border-slate-200 ring-4 ring-slate-50">
               <span className="text-6xl font-black text-blue-600 tracking-tighter">{numpadValue || '0'}</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {['1','2','3','4','5','6','7','8','9','0'].map(num => (
                <button 
                  key={num} 
                  onClick={() => handleNumPadPress(num)} 
                  className={`py-5 rounded-2xl font-black text-2xl border transition-all active:scale-90 ${num === '0' ? 'col-span-2' : ''} bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-sm`}
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => setNumpadValue(prev => prev.slice(0, -1))} 
                className="py-5 bg-red-50 text-red-500 rounded-2xl font-black text-2xl border border-red-100 flex items-center justify-center active:scale-90 shadow-sm"
              >
                <Delete className="h-7 w-7" />
              </button>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={() => setShowNumPad(false)} className="flex-1 py-5 font-black text-slate-400 uppercase tracking-widest text-xs">Cancel</button>
              <button onClick={confirmQuantity} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 active:scale-95 transition-all">CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Thermal Print View */}
      {showPrint && (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col items-center p-12 overflow-y-auto">
          <div id="thermal-receipt" className="p-8 bg-white text-black text-center w-[80mm] mx-auto border border-slate-200 shadow-2xl mb-10 rounded-xl">
            <h1 className="text-3xl font-black mb-1 uppercase tracking-tighter">AV STORE</h1>
            <p className="text-[11px] mb-6 font-bold uppercase tracking-widest text-gray-600">Premium Quality ERP Output</p>
            <div className="text-left text-[12px] space-y-2 mb-6 border-t border-b border-black border-dashed py-4 font-mono">
              <div className="flex justify-between"><span>INVOICE:</span> <b>#${showPrint.invoiceNumber}</b></div>
              <div className="flex justify-between"><span>DATE:</span> <span>${new Date(showPrint.date).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>SALESMAN:</span> <span>${showPrint.salesmanId}</span></div>
              <div className="flex justify-between"><span>CUSTOMER:</span> <b>${showPrint.customerName}</b></div>
            </div>
            <div className="text-left text-[12px] space-y-3 mb-6 font-mono">
              {showPrint.items.map((it, i) => (
                <div key={i} className="flex justify-between items-start border-b border-gray-100 pb-1 last:border-0">
                  <span className="flex-1 font-bold">${it.productName} (${it.type}) x${it.quantity}</span>
                  <span className="ml-4 font-black">₹${it.total}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-black border-dashed pt-4 flex justify-between items-end mb-6">
              <span className="font-black text-sm uppercase tracking-widest">GRAND TOTAL</span>
              <span className="font-black text-2xl tracking-tighter">₹${showPrint.totalAmount}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-[10px] text-gray-700 font-bold italic">Thank you for your purchase!</p>
              <p className="text-[9px] text-gray-500 mt-1">Visit again for more amazing products.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 w-full max-w-xs no-print">
            <button onClick={() => window.print()} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-2xl">PRINT PHYSICAL SLIP</button>
            <button onClick={() => { setShowPrint(null); setCart([]); onComplete(); }} className="w-full bg-slate-100 text-slate-600 py-5 rounded-2xl font-black">CLOSE TERMINAL</button>
          </div>
        </div>
      )}

      {/* Customer Registration Modal */}
      {isRegistering && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 space-y-6 shadow-2xl border border-white/20">
            <div className="space-y-1">
              <h3 className="font-black text-3xl text-slate-800 tracking-tight">Register</h3>
              <p className="text-slate-400 font-bold text-sm">Add buyer to the system.</p>
            </div>
            <div className="space-y-4 pt-2">
              <input type="text" placeholder="Full Customer Name" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-gray-900 font-bold" onChange={e => setNewCust({...newCust, name: e.target.value})} />
              <input type="text" placeholder="Mobile Contact" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-gray-900 font-bold" onChange={e => setNewCust({...newCust, mobile: e.target.value})} />
              <input type="text" placeholder="Detailed Address" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-gray-900 font-bold" onChange={e => setNewCust({...newCust, address: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-6">
              <button onClick={() => setIsRegistering(false)} className="flex-1 py-5 font-black text-slate-400 uppercase tracking-widest text-xs">Cancel</button>
              <button onClick={async () => {
                if(!newCust.name || !newCust.mobile) return alert("All fields are mandatory");
                const code = `${newCust.name}_${newCust.mobile}`.toLowerCase().replace(/\s/g, '_');
                const id = await db.customers.add({...newCust, code});
                setSelectedCustomer(await db.customers.get(id) || null);
                setIsRegistering(false);
              }} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 transition-all active:scale-95">SAVE RECORD</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
