
import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Customer, Product, SaleItem, Sale } from '../../types';
import { Search, Plus, UserPlus, ShoppingCart, Trash2, Printer, X } from 'lucide-react';

const BillingPage: React.FC<{ salesmanId: string; onComplete: () => void }> = ({ salesmanId, onComplete }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [showPrint, setShowPrint] = useState<Sale | null>(null);
  
  // Modals
  const [isRegistering, setIsRegistering] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', address: '', mobile: '' });
  const [showProductSearch, setShowProductSearch] = useState(false);
  
  // Search
  const [custSearch, setCustSearch] = useState('');
  const [prodSearch, setProdSearch] = useState('');

  useEffect(() => {
    db.customers.toArray().then(setCustomers);
    db.products.where('isDeleted').equals(0).toArray().then(setProducts);
  }, []);

  const addToCart = (product: Product, type: '1kg' | '0.5kg') => {
    const price = type === '1kg' ? product.price1kg : product.price05kg;
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product.id && i.type === type);
      if (idx > -1) {
        const nc = [...prev];
        nc[idx].quantity += 1;
        nc[idx].total = nc[idx].quantity * price;
        return nc;
      }
      return [...prev, { productId: product.id!, productName: product.name, type, quantity: 1, price, total: price }];
    });
    setShowProductSearch(false);
  };

  const finalizeSale = async () => {
    if (!selectedCustomer || !cart.length) return;
    
    try {
      const last = await db.sales.where('salesmanId').equals(salesmanId).last();
      const invoiceNumber = last ? (parseInt(last.invoiceNumber) + 1).toString() : "1001";
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

      await db.sales.add(sale);
      
      // Stock adjustment
      for (const item of cart) {
        const p = await db.products.get(item.productId);
        if (p) await db.products.update(item.productId, { stockLevel: p.stockLevel - item.quantity });
      }

      setShowPrint(sale);
    } catch (err) {
      alert("Error saving sale: " + err);
    }
  };

  return (
    <div className="bg-white min-h-[85vh] rounded-3xl p-6 shadow-xl flex flex-col space-y-6 relative overflow-hidden">
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

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800">New Bill</h2>
        <button onClick={onComplete} className="p-2 bg-slate-100 rounded-full"><X className="h-5 w-5"/></button>
      </div>

      {/* Customer */}
      <div className="space-y-2">
        {selectedCustomer ? (
          <div className="bg-blue-600 text-white p-4 rounded-2xl flex justify-between items-center">
            <div>
              <p className="font-bold">{selectedCustomer.name}</p>
              <p className="text-xs opacity-80">{selectedCustomer.mobile}</p>
            </div>
            <button onClick={() => setSelectedCustomer(null)} className="p-1 bg-white/20 rounded"><X className="h-4 w-4"/></button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Customer..." 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
              value={custSearch}
              onChange={e => setCustSearch(e.target.value)}
            />
            {custSearch && (
              <div className="absolute top-full w-full bg-white border border-slate-100 shadow-xl rounded-2xl mt-2 z-50 p-2 space-y-1">
                {customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.mobile.includes(custSearch)).map(c => (
                  <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustSearch(''); }} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl">
                    <p className="font-bold text-sm">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.mobile}</p>
                  </button>
                ))}
                <button onClick={() => setIsRegistering(true)} className="w-full text-center p-3 text-blue-600 font-bold text-sm">+ Add New</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
        {cart.map((item, idx) => (
          <div key={idx} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-800">{item.productName}</p>
              <p className="text-xs text-slate-500">{item.type} | {item.quantity} x ₹{item.price}</p>
            </div>
            <div className="flex items-center space-x-4">
              <p className="font-black text-blue-600">₹{item.total}</p>
              <button onClick={() => setCart(c => c.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-red-400"/></button>
            </div>
          </div>
        ))}
        {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300 italic text-sm"><ShoppingCart className="h-10 w-10 mb-2 opacity-20"/>Cart is empty</div>}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-slate-100 space-y-4">
        <button onClick={() => setShowProductSearch(true)} className="w-full py-3 bg-slate-800 text-white rounded-2xl font-bold">+ Add Products</button>
        <div className="flex justify-between items-end">
          <p className="text-slate-400 text-xs font-bold">TOTAL AMOUNT</p>
          <p className="text-3xl font-black">₹{cart.reduce((a, b) => a + b.total, 0)}</p>
        </div>
        <button onClick={finalizeSale} disabled={!selectedCustomer || !cart.length} className="w-full py-4 bg-blue-600 disabled:bg-slate-200 text-white rounded-2xl font-black shadow-lg">FINALIZE & PRINT</button>
      </div>

      {/* Modals & Print View */}
      {showProductSearch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] p-4 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 max-h-[80vh] flex flex-col">
            <input type="text" placeholder="Search..." className="w-full p-4 bg-slate-50 rounded-2xl mb-4" value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
            <div className="flex-1 overflow-y-auto space-y-3">
              {products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase())).map(p => (
                <div key={p.id} className="p-4 bg-slate-50 rounded-2xl">
                  <p className="font-bold mb-3">{p.name}</p>
                  <div className="flex gap-2">
                    <button onClick={() => addToCart(p, '1kg')} className="flex-1 py-2 bg-white rounded-xl text-xs font-bold border border-slate-100">1kg ₹{p.price1kg}</button>
                    <button onClick={() => addToCart(p, '0.5kg')} className="flex-1 py-2 bg-white rounded-xl text-xs font-bold border border-slate-100">0.5kg ₹{p.price05kg}</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowProductSearch(false)} className="mt-4 py-3 text-slate-500 font-bold">Close</button>
          </div>
        </div>
      )}

      {showPrint && (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col items-center p-8">
          <div id="thermal-receipt" className="border p-4 bg-white text-black text-center w-[80mm]">
            <h1 className="text-xl font-bold">AV STORE</h1>
            <p className="text-xs">Invoice: #{showPrint.invoiceNumber}</p>
            <p className="text-xs">Date: {new Date(showPrint.date).toLocaleString()}</p>
            <hr className="my-2 border-black border-dashed"/>
            <div className="text-left text-xs space-y-1">
              {showPrint.items.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span>{it.productName} ({it.type}) x{it.quantity}</span>
                  <span>{it.total}</span>
                </div>
              ))}
            </div>
            <hr className="my-2 border-black border-dashed"/>
            <p className="text-lg font-bold">TOTAL: ₹{showPrint.totalAmount}</p>
            <p className="text-[10px] mt-4">Thank you for shopping!</p>
          </div>
          <div className="mt-8 flex space-x-4 no-print">
            <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">Print Receipt</button>
            <button onClick={() => { setShowPrint(null); setCart([]); onComplete(); }} className="bg-slate-100 px-8 py-3 rounded-xl font-bold">Done</button>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {isRegistering && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4">
            <h3 className="font-black text-xl">New Customer</h3>
            <input type="text" placeholder="Name" className="w-full p-3 bg-slate-50 rounded-xl" onChange={e => setNewCust({...newCust, name: e.target.value})} />
            <input type="text" placeholder="Mobile" className="w-full p-3 bg-slate-50 rounded-xl" onChange={e => setNewCust({...newCust, mobile: e.target.value})} />
            <input type="text" placeholder="Address" className="w-full p-3 bg-slate-50 rounded-xl" onChange={e => setNewCust({...newCust, address: e.target.value})} />
            <div className="flex gap-2 pt-4">
              <button onClick={() => setIsRegistering(false)} className="flex-1 py-3 font-bold">Cancel</button>
              <button onClick={async () => {
                const code = `${newCust.name}_${newCust.mobile}`;
                const id = await db.customers.add({...newCust, code});
                setSelectedCustomer(await db.customers.get(id) || null);
                setIsRegistering(false);
              }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
