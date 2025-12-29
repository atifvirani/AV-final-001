
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Customer, Product, SaleItem, Sale } from '../../types';
import { Search, ShoppingCart, Trash2, X, Delete, Info, Printer, Percent } from 'lucide-react';

const BillingPage: React.FC<{ salesmanId: string; onComplete: () => void }> = ({ salesmanId, onComplete }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [showPrint, setShowPrint] = useState<Sale | null>(null);
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', address: '', mobile: '' });
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [prodSearch, setProdSearch] = useState('');

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

  const subtotal = cart.reduce((a, b) => a + b.total, 0);
  const grandTotal = Math.max(0, subtotal - discount);

  const finalizeSale = async () => {
    if (!selectedCustomer || !cart.length) return;
    
    try {
      const last = await db.sales.where('salesmanId').equals(salesmanId).last();
      const baseRange = getBaseInvoice(salesmanId);
      
      // Safety: find max invoice number even if reset occurs
      const allUserSales = await db.sales.where('salesmanId').equals(salesmanId).toArray();
      const maxInv = allUserSales.reduce((max, s) => Math.max(max, parseInt(s.invoiceNumber)), baseRange);
      const invoiceNumber = (maxInv + 1).toString();
      
      const syncId = `${salesmanId}_${invoiceNumber}_${Date.now()}`;
      
      const sale: Sale = {
        invoiceNumber,
        customerCode: selectedCustomer.code,
        customerName: selectedCustomer.name,
        salesmanId,
        date: new Date(),
        items: cart,
        discount: discount,
        totalAmount: grandTotal,
        synced: false,
        syncId
      };

      await (db as any).transaction('rw', [db.sales, db.products, db.stockLogs], async () => {
        await db.sales.add(sale);
        for (const item of cart) {
          const p = await db.products.get(item.productId);
          if (p) {
            // STOCK MATH FIX: 0.5kg packets deduct half a unit of stock weight (if stock is in KG)
            const weightToSubtract = item.type === '1kg' ? item.quantity : item.quantity * 0.5;
            await db.products.update(item.productId, { stockLevel: p.stockLevel - weightToSubtract });
            await db.stockLogs.add({
              productId: item.productId,
              productName: item.productName,
              change: -weightToSubtract,
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
    <div className="bg-white min-h-[85vh] rounded-[2.5rem] p-8 shadow-2xl flex flex-col space-y-6 relative overflow-hidden text-gray-900 transition-all duration-300">
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
          .receipt-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid black;
            margin: 10px 0;
          }
          .receipt-table th, .receipt-table td {
            border: 1px solid black;
            padding: 4px;
            text-align: left;
            font-size: 11px;
          }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>

      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Terminal Billing</h2>
        <button onClick={onComplete} className="p-3 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"><X className="h-6 w-6 text-slate-600"/></button>
      </div>

      <div className="space-y-2">
        {selectedCustomer ? (
          <div className="bg-blue-600 text-white p-6 rounded-3xl flex justify-between items-center shadow-xl border border-blue-400">
            <div>
              <p className="font-black text-xl">{selectedCustomer.name}</p>
              <p className="text-[10px] opacity-90 tracking-[0.2em] font-bold uppercase mt-1">{selectedCustomer.mobile} • {selectedCustomer.address}</p>
            </div>
            <button onClick={() => setSelectedCustomer(null)} className="p-2.5 bg-white/20 rounded-2xl hover:bg-white/40"><X className="h-6 w-6"/></button>
          </div>
        ) : (
          <div className="relative group">
            <Search className="absolute left-5 top-5 h-6 w-6 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search Customer or Code..." 
              className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-blue-500 text-gray-800 font-black tracking-tight transition-all"
              value={custSearch}
              onChange={e => setCustSearch(e.target.value)}
            />
            {custSearch && (
              <div className="absolute top-full w-full bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-3xl mt-4 z-50 p-3 space-y-2 animate-in slide-in-from-top-2">
                {customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.mobile.includes(custSearch)).slice(0, 5).map(c => (
                  <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustSearch(''); }} className="w-full text-left p-5 hover:bg-blue-50 rounded-2xl transition-all border-b last:border-0 border-slate-50">
                    <p className="font-black text-slate-800 text-lg">{c.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.mobile}</p>
                  </button>
                ))}
                <button onClick={() => setIsRegistering(true)} className="w-full text-center p-5 text-blue-600 font-black text-xs uppercase tracking-widest hover:bg-blue-50 rounded-2xl transition-all">+ REGISTER NEW CUSTOMER</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 min-h-[250px] pr-2 scroll-smooth">
        {cart.map((item, idx) => (
          <div key={idx} className="bg-slate-50 p-6 rounded-[2rem] flex justify-between items-center border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex-1">
              <p className="font-black text-xl text-slate-800">{item.productName}</p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.1em] mt-1">{item.type} Pack | {item.quantity} units @ ₹{item.price}</p>
            </div>
            <div className="flex items-center space-x-6">
              <p className="font-black text-blue-600 text-3xl tracking-tighter">₹{item.total}</p>
              <button onClick={() => setCart(c => c.filter((_, i) => i !== idx))} className="p-3 bg-white hover:bg-red-50 rounded-2xl text-red-500 border border-slate-100 transition-all shadow-sm active:scale-90"><Trash2 className="h-6 w-6"/></button>
            </div>
          </div>
        ))}
        {cart.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 italic py-20 animate-in fade-in duration-700">
            <ShoppingCart className="h-24 w-24 mb-6 opacity-5"/>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Checkout queue is empty</p>
          </div>
        )}
      </div>

      <div className="pt-8 border-t-2 border-slate-50 space-y-6">
        <button onClick={() => setShowProductSearch(true)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-black transition-all active:scale-95 uppercase tracking-widest">+ ADD TO ORDER</button>
        
        {/* DISCOUNT FIELD */}
        <div className="relative">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-4">Adjustment Discount (₹)</label>
          <div className="relative">
            <div className="absolute left-5 top-4 text-blue-500">
               <Percent className="h-5 w-5" />
            </div>
            <input 
              type="number"
              placeholder="0"
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 text-slate-800 font-black"
              value={discount || ''}
              onChange={e => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>
        </div>

        <div className="flex justify-between items-end px-4">
          <div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Order Value</p>
             <div className="h-1.5 w-12 bg-blue-600 rounded-full"></div>
          </div>
          <div className="text-right">
             {discount > 0 && <p className="text-sm text-slate-400 line-through">₹{subtotal}</p>}
             <p className="text-6xl font-black text-slate-900 tracking-tighter transition-all">₹{grandTotal}</p>
          </div>
        </div>
        <button onClick={finalizeSale} disabled={!selectedCustomer || !cart.length} className="w-full py-7 bg-blue-600 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-blue-400 disabled:shadow-none transition-all active:scale-[0.98] uppercase tracking-[0.1em]">GENERATE BILL</button>
      </div>

      {showProductSearch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] p-6 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 max-h-[85vh] flex flex-col shadow-[0_50px_100px_rgba(0,0,0,0.3)] ring-1 ring-black/5 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-3xl text-slate-800 tracking-tight">Catalog</h3>
              <button onClick={() => setShowProductSearch(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X className="h-7 w-7 text-slate-400"/></button>
            </div>
            <input type="text" placeholder="Filter items..." className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] mb-8 outline-none focus:border-blue-500 text-gray-800 font-black text-lg transition-all" value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scroll-smooth">
              {products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase())).map(p => (
                <div key={p.id} className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:bg-slate-100/50">
                  <p className="font-black text-slate-800 mb-6 text-xl tracking-tight">{p.name}</p>
                  <div className="flex gap-4">
                    <button onClick={() => openNumPad(p, '1kg')} className="flex-1 py-5 bg-white rounded-2xl text-[10px] font-black border border-slate-200 shadow-sm active:bg-blue-600 active:text-white uppercase tracking-widest transition-all">1KG @ ₹{p.price1kg}</button>
                    <button onClick={() => openNumPad(p, '0.5kg')} className="flex-1 py-5 bg-white rounded-2xl text-[10px] font-black border border-slate-200 shadow-sm active:bg-blue-600 active:text-white uppercase tracking-widest transition-all">0.5KG @ ₹{p.price05kg}</button>
                  </div>
                </div>
              ))}
              {products.length === 0 && <p className="text-center text-slate-400 italic py-10 font-bold uppercase text-xs tracking-widest">No matching products</p>}
            </div>
          </div>
        </div>
      )}

      {showNumPad && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl z-[300] flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 space-y-10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] text-center border border-white/20 animate-in zoom-in-95">
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Quantity</h3>
              <p className="text-blue-500 font-black text-[10px] uppercase tracking-[0.3em]">{pendingSelection?.product.name} ({pendingSelection?.type})</p>
            </div>
            
            <div className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-slate-100 ring-[10px] ring-slate-50 shadow-inner">
               <span className="text-8xl font-black text-slate-900 tracking-tighter transition-all">{numpadValue || '0'}</span>
            </div>

            <div className="grid grid-cols-3 gap-5">
              {['1','2','3','4','5','6','7','8','9','0'].map(num => (
                <button 
                  key={num} 
                  onClick={() => handleNumPadPress(num)} 
                  className={`py-6 rounded-3xl font-black text-3xl border transition-all active:scale-90 ${num === '0' ? 'col-span-2' : ''} bg-white text-slate-800 hover:bg-slate-50 border-slate-100 shadow-sm ring-1 ring-black/5`}
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => setNumpadValue(prev => prev.slice(0, -1))} 
                className="py-6 bg-red-50 text-red-500 rounded-3xl font-black text-3xl border border-red-100 flex items-center justify-center active:scale-90 shadow-sm"
              >
                <Delete className="h-9 w-9" />
              </button>
            </div>

            <div className="flex gap-5 pt-4">
              <button onClick={() => setShowNumPad(false)} className="flex-1 py-6 font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Cancel</button>
              <button onClick={confirmQuantity} className="flex-1 py-6 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-2xl shadow-blue-200 active:scale-95 transition-all uppercase tracking-widest">Apply</button>
            </div>
          </div>
        </div>
      )}

      {showPrint && (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col items-center p-12 overflow-y-auto animate-in fade-in duration-500">
          <div id="thermal-receipt" className="p-10 bg-white text-black text-center w-[80mm] mx-auto border border-slate-200 shadow-2xl mb-12 rounded-2xl">
            <h1 className="text-4xl font-black mb-1 uppercase tracking-tighter">AV STORE</h1>
            <p className="text-[11px] mb-8 font-black uppercase tracking-[0.3em] text-gray-500">Official Terminal Receipt</p>
            <div className="text-left text-[12px] space-y-3 mb-6 border-t-2 border-b-2 border-black border-dashed py-6 font-mono font-bold leading-relaxed">
              <div className="flex justify-between uppercase tracking-widest text-[10px]"><span>Invoice No:</span> <b>#{showPrint.invoiceNumber}</b></div>
              <div className="flex justify-between uppercase tracking-widest text-[10px]"><span>Timestamp:</span> <span>{new Date(showPrint.date).toLocaleString()}</span></div>
              <div className="flex justify-between uppercase tracking-widest text-[10px]"><span>Customer:</span> <b>{showPrint.customerName}</b></div>
            </div>
            
            {/* GRIDDED RECEIPT TABLE */}
            <table className="receipt-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {showPrint.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.productName} ({it.type})</td>
                    <td>{it.quantity}</td>
                    <td>₹{it.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t-2 border-black border-dashed pt-4 flex flex-col items-end mb-8 space-y-1">
              <div className="flex justify-between w-full text-xs font-bold font-mono">
                <span>Subtotal:</span>
                <span>₹{showPrint.items.reduce((a, b) => a + b.total, 0)}</span>
              </div>
              {showPrint.discount > 0 && (
                <div className="flex justify-between w-full text-xs font-bold font-mono">
                  <span>Discount:</span>
                  <span>-₹{showPrint.discount}</span>
                </div>
              )}
              <div className="flex justify-between w-full pt-2 border-t border-black font-black font-mono">
                <span className="text-sm uppercase tracking-widest">Grand Total:</span>
                <span className="text-2xl tracking-tighter">₹{showPrint.totalAmount}</span>
              </div>
            </div>
            <div className="bg-gray-100 p-6 rounded-2xl">
              <p className="text-[11px] text-gray-900 font-black italic uppercase tracking-widest text-center">Premium ERP Export</p>
              <p className="text-[9px] text-gray-500 mt-2 font-bold leading-relaxed text-center">Please retain this digital slip for all service queries. Thank you!</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 w-full max-w-xs no-print pb-20">
            <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-[2rem] flex items-start space-x-4 mb-2 shadow-sm">
              <Info className="h-6 w-6 text-blue-600 shrink-0 mt-1" />
              <p className="text-[10px] text-blue-800 font-black uppercase tracking-[0.15em] leading-relaxed">To save digital file: Select 'Save as PDF' as the Destination in the print window.</p>
            </div>
            <button onClick={() => window.print()} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-blue-200 transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center space-x-3">
              <Printer className="h-6 w-6" />
              <span>Print Physical Slip</span>
            </button>
            <button onClick={() => { setShowPrint(null); setCart([]); setDiscount(0); onComplete(); }} className="w-full bg-slate-100 text-slate-500 py-6 rounded-3xl font-black uppercase tracking-widest text-xs transition-all hover:bg-slate-200">Close Terminal</button>
          </div>
        </div>
      )}

      {isRegistering && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 space-y-8 shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/20 animate-in zoom-in-95">
            <div className="space-y-2">
              <h3 className="font-black text-4xl text-slate-800 tracking-tighter">Identity</h3>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">New Buyer Registry</p>
            </div>
            <div className="space-y-5 pt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Legal Name</label>
                <input type="text" placeholder="Name" className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-gray-900 font-black text-lg transition-all focus:border-blue-500 outline-none" onChange={e => setNewCust({...newCust, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mobile Contact</label>
                <input type="text" placeholder="+91" className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-gray-900 font-black text-lg transition-all focus:border-blue-500 outline-none" onChange={e => setNewCust({...newCust, mobile: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Location/Address</label>
                <input type="text" placeholder="Street/Area" className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-gray-900 font-black text-lg transition-all focus:border-blue-500 outline-none" onChange={e => setNewCust({...newCust, address: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4 pt-8">
              <button onClick={() => setIsRegistering(false)} className="flex-1 py-6 font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">Cancel</button>
              <button onClick={async () => {
                if(!newCust.name || !newCust.mobile) return alert("All profile fields are mandatory");
                const code = `${newCust.name}_${newCust.mobile}`.toLowerCase().replace(/\s/g, '_');
                const id = await db.customers.add({...newCust, code});
                setSelectedCustomer(await db.customers.get(id) || null);
                setIsRegistering(false);
              }} className="flex-1 py-6 bg-blue-600 text-white rounded-3xl font-black shadow-2xl shadow-blue-100 transition-all active:scale-95 uppercase tracking-widest">Save profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
