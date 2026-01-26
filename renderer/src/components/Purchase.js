import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2, ShoppingCart, Calendar,
    User, DollarSign, X, Check, MoreHorizontal, ArrowUpRight,
    Package, Truck, Receipt, Trash, Info
} from 'lucide-react';
import { canCreate, canEdit, canDelete } from '../utils/permissions';


// Premium Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
    const colors = {
        orange: 'bg-white border-l-4 border-l-blue-500',
        emerald: 'bg-white border-l-4 border-l-emerald-500',
        red: 'bg-white border-l-4 border-l-rose-500',
        blue: 'bg-white border-l-4 border-l-blue-950',
        purple: 'bg-white border-l-4 border-l-indigo-500',
        gray: 'bg-white border-l-4 border-l-slate-400'
    };

    return (
        <div className={`relative overflow-hidden ${colors[color] || colors.orange} p-5 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md group`}>
            <div className="relative flex items-center justify-between">
                <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
                    <h3 className="text-xl font-bold text-slate-800">{value}</h3>
                </div>
                <div className="p-2.5 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <Icon size={20} />
                </div>
            </div>
        </div>
    );
};

const Purchase = ({ currentUser }) => {
    const [purchases, setPurchases] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form State
    const [vendorId, setVendorId] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [cart, setCart] = useState([]);
    const [paidAmount, setPaidAmount] = useState(0);
    const [shippingCost, setShippingCost] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paymentStatus, setPaymentStatus] = useState('RECEIVED');
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const [pData, vData, prData] = await Promise.all([
                    window.electronAPI.getPurchases(currentUser?.company_id),
                    window.electronAPI.getVendors(currentUser?.company_id),
                    window.electronAPI.getProducts(currentUser?.company_id)
                ]);

                setPurchases(Array.isArray(pData) ? pData : []);
                setVendors(Array.isArray(vData) ? vData : []);
                setProducts(Array.isArray(prData) ? prData : []);

                if (pData?.success === false) console.error("Purchase Error:", pData.message);
                if (vData?.success === false) console.error("Vendor Error:", vData.message);
                if (prData?.success === false) console.error("Product Error:", prData.message);
            }
        } catch (err) {
            console.error('Error loading purchase data:', err);
            setPurchases([]);
            setVendors([]);
            setProducts([]);
        }
        setLoading(false);
    };

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1, unitCost: product.cost_price || 0 }]);
        }
    };

    const updateCartItem = (id, field, value) => {
        setCart(cart.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const calculateSubtotal = () => cart.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
    const subtotal = calculateSubtotal();
    const grandTotal = subtotal + parseFloat(shippingCost || 0);
    const balanceDue = grandTotal - parseFloat(paidAmount || 0);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!vendorId) return window.alert('Please select a vendor');
        if (cart.length === 0) return window.alert('Cart is empty');

        setSaving(true);
        try {
            const data = {
                companyId: currentUser?.company_id,
                vendorId,
                invoiceNo,
                totalAmount: grandTotal,
                paidAmount: parseFloat(paidAmount) || 0,
                shippingCost: parseFloat(shippingCost) || 0,
                paymentMethod,
                paymentStatus,
                dueDate: dueDate || null,
                notes,
                items: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    total: item.quantity * item.unitCost
                }))
            };

            const result = await window.electronAPI.addPurchase(data);
            if (result?.success === false) {
                window.alert(result.message);
            } else {
                setShowModal(false);
                resetForm();
                loadData();
            }
        } catch (err) {
            window.alert('Error saving purchase: ' + err.message);
        }
        setSaving(false);
    };

    const resetForm = () => {
        setVendorId('');
        setInvoiceNo('');
        setCart([]);
        setPaidAmount(0);
        setShippingCost(0);
        setDueDate('');
        setNotes('');
        setPaymentStatus('RECEIVED');
    };

    const filtered = purchases.filter(p =>
        p.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
        p.vendor?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const totalStats = purchases.reduce((acc, p) => {
        acc.total += p.totalAmount;
        acc.paid += p.paidAmount;
        acc.pending += (p.totalAmount - p.paidAmount);
        return acc;
    }, { total: 0, paid: 0, pending: 0 });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Buying & Stock-In</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your buy orders, stock arrivals, and supplier payments.</p>
                </div>
                {canCreate('purchase') && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all active:scale-95 shadow-sm shadow-blue-200 group"
                    >
                        <Plus size={18} />
                        <span>New Purchase Order</span>
                    </button>
                )}
            </div>



            {/* Main Content Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
                            placeholder="Search by Invoice # or Vendor..."
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procurement #</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supplier</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date/Time</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Amount</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paid / Method</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-3 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                                            <p className="text-slate-400 font-bold text-sm">Synchronizing purchases...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-20 text-center">
                                        <div className="max-w-xs mx-auto space-y-3">
                                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-300">
                                                <Receipt size={32} />
                                            </div>
                                            <p className="text-gray-400 font-bold">No procurement records found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group border-b border-slate-50 last:border-0">
                                    <td className="px-6 py-4 font-bold text-sm text-slate-800 uppercase tracking-tight">{p.invoiceNo || `PO-${p.id.slice(-6).toUpperCase()}`}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-xs border border-slate-100">
                                                {p.vendor?.name?.charAt(0).toUpperCase() || 'V'}
                                            </div>
                                            <span className="font-bold text-xs text-slate-600">{p.vendor?.name || 'Unknown Vendor'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                        {new Date(p.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-sm text-slate-800">PKR {p.totalAmount.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-800">PKR {p.paidAmount?.toLocaleString()}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{p.paymentMethod || 'CASH'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${p.paidAmount >= p.totalAmount ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                            p.paidAmount > 0 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                'bg-blue-50 text-blue-600 border border-blue-100'
                                            }`}>
                                            <span className={`w-1 h-1 rounded-full ${p.paidAmount >= p.totalAmount ? 'bg-emerald-500' : p.paidAmount > 0 ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                                            {p.paidAmount >= p.totalAmount ? 'Fully Paid' : p.paidAmount > 0 ? 'Partial' : 'Ordered'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                            <Info size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Redesigned Purchase Modal (POS Style) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                        {/* Modal Header */}
                        <div className="px-8 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Procurement Order</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Incoming stock registration</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><X size={20} /></button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left Side: Product Selection */}
                            <div className="w-1/2 p-6 border-r border-slate-100 flex flex-col gap-6 overflow-hidden">
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none"
                                        placeholder="Scan barcode or type product name..."
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 gap-3">
                                    {products.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            className="p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-left relative overflow-hidden active:scale-95 disabled:opacity-50"
                                        >
                                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-8 h-8 bg-blue-950 text-white rounded-lg flex items-center justify-center shadow-lg"><Plus size={16} /></div>
                                            </div>
                                            <p className="font-bold text-slate-800 truncate pr-6 text-sm">{product.name}</p>
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                    Stock: {product.stockQty}
                                                </span>
                                                <span className="text-xs font-bold text-slate-500">PKR {product.costPrice?.toLocaleString() || '0'}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Right Side: Cart & Details */}
                            <div className="w-1/2 p-6 bg-slate-50/50 flex flex-col overflow-hidden">
                                {/* Vendor & Invoice Info */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Supplier</label>
                                        <select
                                            value={vendorId}
                                            onChange={(e) => setVendorId(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:border-blue-500 transition-all outline-none text-xs appearance-none"
                                        >
                                            <option value="">Choose Supplier...</option>
                                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Supplier Invoice #</label>
                                        <input
                                            type="text"
                                            value={invoiceNo}
                                            onChange={(e) => setInvoiceNo(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:border-blue-500 transition-all outline-none text-xs"
                                            placeholder="INV-2024-001"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Due Date</label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:border-blue-500 transition-all outline-none text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Order Status</label>
                                        <select
                                            value={paymentStatus}
                                            onChange={(e) => setPaymentStatus(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:border-blue-500 transition-all outline-none text-xs appearance-none"
                                        >
                                            <option value="ORDERED">ORDERED</option>
                                            <option value="RECEIVED">RECEIVED</option>
                                            <option value="PARTIAL">PARTIAL</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Cart Items */}
                                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                                    {cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                            <Package size={42} className="opacity-20" />
                                            <p className="font-bold text-[10px] uppercase tracking-widest">Procurement list is empty</p>
                                        </div>
                                    ) : cart.map((item) => (
                                        <div key={item.id} className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Cost:</span>
                                                        <input
                                                            type="number"
                                                            value={item.unitCost}
                                                            onChange={(e) => updateCartItem(item.id, 'unitCost', parseFloat(e.target.value))}
                                                            className="w-16 px-2 py-0.5 bg-slate-50 rounded text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/10 outline-none border border-slate-100"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Qty:</span>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateCartItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                            className="w-14 px-2 py-0.5 bg-slate-50 rounded text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/10 outline-none border border-slate-100"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-bold text-slate-800 text-sm">PKR {(item.quantity * item.unitCost).toLocaleString()}</p>
                                                <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-rose-500 mt-1 transition-colors"><Trash size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Summary */}
                                <div className="mt-6 p-6 bg-white rounded-xl shadow-lg border border-slate-200 space-y-4">
                                    <div className="space-y-2 pb-2 border-b border-slate-50">
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-tight">
                                            <span>Subtotal</span>
                                            <span>PKR {subtotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-tight">
                                            <span>Shipping</span>
                                            <input
                                                type="number"
                                                value={shippingCost}
                                                onChange={(e) => setShippingCost(e.target.value)}
                                                className="w-20 px-2 py-0.5 bg-slate-50 rounded text-right font-bold text-slate-800 outline-none border border-slate-100 disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Grand Total</span>
                                        <span className="text-2xl font-bold text-slate-800 tracking-tighter">PKR {grandTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Payment Made</label>
                                            <input
                                                type="number"
                                                value={paidAmount}
                                                onChange={(e) => setPaidAmount(e.target.value)}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-lg text-slate-800 focus:border-blue-500 transition-all outline-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Balance Due</label>
                                            <div className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-lg font-bold text-lg text-rose-600">
                                                {balanceDue.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 text-right">Method</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-xs appearance-none focus:border-blue-500 outline-none"
                                        >
                                            <option value="CASH">CASH</option>
                                            <option value="BANK_TRANSFER">BANK TRANSFER</option>
                                            <option value="CHEQUE">CHEQUE</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Order Notes</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows="2"
                                            className="w-full p-3 bg-white border border-slate-200 rounded-lg font-medium text-xs focus:border-blue-500 transition-all outline-none resize-none"
                                            placeholder="Additional comments..."
                                        />
                                    </div>

                                    {canCreate('purchase') && (
                                        <button
                                            onClick={handleSave}
                                            className="w-full py-4 bg-blue-950 text-white rounded-xl font-bold text-lg shadow-md shadow-blue-100 hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {saving ? 'Processing...' : 'Complete Procurement'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Purchase;
