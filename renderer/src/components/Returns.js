import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Plus, Search, MoreHorizontal, X, ShoppingCart,
    Trash2, DollarSign, RotateCcw, Calendar,
    User, Package, ChevronRight, Check, Printer,
    Building2, RefreshCcw, ArrowLeftRight, CreditCard
} from 'lucide-react';
import { canCreate, canDelete } from '../utils/permissions';

const StatCard = ({ title, value, icon: Icon, color }) => {
    const colors = {
        orange: 'bg-white border-l-4 border-l-orange-500',
        emerald: 'bg-white border-l-4 border-l-emerald-500',
        blue: 'bg-white border-l-4 border-l-blue-950',
        purple: 'bg-white border-l-4 border-l-indigo-500',
        red: 'bg-white border-l-4 border-l- rose-500',
        gray: 'bg-white border-l-4 border-l-slate-400'
    };

    return (
        <div className={`relative overflow-hidden ${colors[color]} p-5 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md group`}>
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

const Returns = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('sales'); // 'sales' or 'purchases'
    const [saleReturns, setSaleReturns] = useState([]);
    const [purchaseReturns, setPurchaseReturns] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [selectedEntityId, setSelectedEntityId] = useState(''); // customerId or vendorId
    const [selectedProductId, setSelectedProductId] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [qty, setQty] = useState('');
    const [cart, setCart] = useState([]);
    const [notes, setNotes] = useState('');
    const [tax, setTax] = useState('');

    const productRef = useRef(null);
    const qtyRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, [currentUser, activeTab]);

    const fetchData = async () => {
        if (!currentUser?.company_id) return;
        setLoading(true);
        try {
            const companyId = currentUser.company_id;
            if (activeTab === 'sales') {
                const sr = await window.electronAPI.getSaleReturns(companyId);
                const cust = await window.electronAPI.getCustomers(companyId);
                setSaleReturns(Array.isArray(sr) ? sr : []);
                setCustomers(Array.isArray(cust) ? cust : []);
            } else {
                const pr = await window.electronAPI.getPurchaseReturns(companyId);
                const vend = await window.electronAPI.getVendors(companyId);
                setPurchaseReturns(Array.isArray(pr) ? pr : []);
                setVendors(Array.isArray(vend) ? vend : []);
            }
            const prod = await window.electronAPI.getProducts(companyId);
            setProducts(Array.isArray(prod) ? prod : []);
        } catch (error) {
            console.error("Error fetching returns data:", error);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = () => {
        if (!selectedProductId || !qty || parseInt(qty) <= 0) return;
        const product = products.find(p => p.id === selectedProductId);
        if (!product) return;

        const price = activeTab === 'sales' ? product.sellPrice : product.costPrice;
        const existingItem = cart.find(item => item.productId === selectedProductId);

        if (existingItem) {
            setCart(cart.map(item => item.productId === selectedProductId
                ? { ...item, quantity: item.quantity + parseInt(qty), total: (item.quantity + parseInt(qty)) * price }
                : item
            ));
        } else {
            setCart([...cart, {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                price: price,
                unitCost: price, // For purchase matching
                quantity: parseInt(qty),
                total: parseInt(qty) * price
            }]);
        }

        setSelectedProductId('');
        setQty('');
        productRef.current?.focus();
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.productId !== id));
    };

    const subTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const taxValue = parseFloat(tax) || 0;
    const totalAmount = subTotal + taxValue;

    const handleSave = async () => {
        if (!selectedEntityId || cart.length === 0) return;
        setSaving(true);
        try {
            const data = {
                companyId: currentUser.company_id,
                invoiceNo: invoiceNo || `RET-${Date.now().toString().slice(-6)}`,
                subTotal,
                tax: taxValue,
                totalAmount,
                notes,
                items: cart
            };

            let res;
            if (activeTab === 'sales') {
                data.customerId = selectedEntityId;
                res = await window.electronAPI.handleSaleReturn(data);
            } else {
                data.vendorId = selectedEntityId;
                res = await window.electronAPI.handlePurchaseReturn(data);
            }

            if (res.success) {
                setIsModalOpen(false);
                resetForm();
                fetchData();
            } else {
                alert("Error: " + res.message);
            }
        } catch (error) {
            console.error("Save error:", error);
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setSelectedEntityId('');
        setCart([]);
        setInvoiceNo('');
        setNotes('');
        setTax('');
        setSelectedProductId('');
        setQty('');
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this return record? This will also revert stock and balances.")) return;
        try {
            let res;
            if (activeTab === 'sales') {
                res = await window.electronAPI.deleteSaleReturn(id);
            } else {
                res = await window.electronAPI.deletePurchaseReturn(id);
            }
            if (res.success) fetchData();
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const filteredData = (activeTab === 'sales' ? saleReturns : purchaseReturns).filter(item => {
        const entityName = activeTab === 'sales' ? item.customer?.name : item.vendor?.name;
        return (
            item.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entityName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const stats = useMemo(() => {
        const data = activeTab === 'sales' ? saleReturns : purchaseReturns;
        return {
            count: data.length,
            total: data.reduce((sum, item) => sum + item.totalAmount, 0)
        };
    }, [saleReturns, purchaseReturns, activeTab]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Return Management</h1>
                    <p className="text-slate-500 text-sm font-medium">Handle {activeTab} returns and inventory adjustments</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setActiveTab('sales')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'sales' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Sale Returns
                        </button>
                        <button
                            onClick={() => setActiveTab('purchases')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'purchases' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Purchase Returns
                        </button>
                    </div>
                    {canCreate('returns') && (
                        <button
                            onClick={() => { resetForm(); setIsModalOpen(true); }}
                            className="flex items-center gap-2 bg-blue-950 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-900 transition-all shadow-lg shadow-blue-900/10 active:scale-95"
                        >
                            <Plus size={18} />
                            <span>Add New Return</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title={`Total ${activeTab} Returns`} value={stats.count} icon={activeTab === 'sales' ? RefreshCcw : RotateCcw} color="blue" />
                <StatCard title="Value of Returns" value={`PKR ${stats.total.toLocaleString()}`} icon={DollarSign} color="emerald" />
                <StatCard title="Active Adjustments" value="Dynamic" icon={ArrowLeftRight} color="purple" />
                <StatCard title="Total Credits" value="---" icon={CreditCard} color="orange" />
            </div>

            {/* Filters & Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={`Search by invoice or ${activeTab === 'sales' ? 'customer' : 'supplier'}...`}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice #</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeTab === 'sales' ? 'Customer' : 'Supplier'}</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Amount</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">Loading returns...</td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">No return records found</td>
                                </tr>
                            ) : filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                        {new Date(item.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-slate-800">{item.invoiceNo}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                {(activeTab === 'sales' ? item.customer?.name : item.vendor?.name)?.charAt(0)}
                                            </div>
                                            <div className="text-sm font-bold text-slate-700">{activeTab === 'sales' ? item.customer?.name : item.vendor?.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {item.items?.length || 0} product(s)
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-sm font-bold text-slate-900">PKR {item.totalAmount.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {canDelete('returns') && (
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Return Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col border border-slate-200">
                        {/* Modal Header */}
                        <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                    <RefreshCcw size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Create {activeTab === 'sales' ? 'Customer' : 'Supplier'} Return</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Operator: {currentUser?.fullname}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-50/30">
                            {/* Left: Product Selection & Cart */}
                            <div className="flex-1 p-6 overflow-y-auto border-r border-slate-200">
                                <div className="grid grid-cols-4 gap-4 mb-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{activeTab === 'sales' ? 'Customer' : 'Supplier'}</label>
                                        <select
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-blue-500 transition-all"
                                            value={selectedEntityId}
                                            onChange={(e) => setSelectedEntityId(e.target.value)}
                                        >
                                            <option value="">Select {activeTab === 'sales' ? 'Customer' : 'Supplier'}...</option>
                                            {(activeTab === 'sales' ? customers : vendors).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5 col-span-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Product</label>
                                        <select
                                            ref={productRef}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-blue-500 transition-all"
                                            value={selectedProductId}
                                            onChange={(e) => setSelectedProductId(e.target.value)}
                                        >
                                            <option value="">Select Item...</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} - (Stock: {p.stockQty})</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Qty</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-blue-500 transition-all"
                                                value={qty}
                                                onChange={(e) => setQty(e.target.value)}
                                                placeholder="0"
                                                onKeyDown={(e) => e.key === 'Enter' && addToCart()}
                                            />
                                        </div>
                                        <button
                                            onClick={addToCart}
                                            className="p-2.5 bg-blue-950 text-white rounded-lg hover:bg-slate-900 transition-all shrink-0 shadow-md active:scale-95"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Cart Table */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Product</th>
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Price</th>
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Qty</th>
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total</th>
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {cart.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-bold text-slate-800">{item.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">SKU: {item.sku || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-600 text-xs">PKR {item.price.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-700">{item.quantity}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-slate-800 text-sm">PKR {item.total.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => removeFromCart(item.productId)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-all">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {cart.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-20 text-center">
                                                        <ShoppingCart size={40} className="mx-auto text-slate-100 mb-3" />
                                                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Return cart is empty</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Right: Summary */}
                            <div className="w-[350px] p-6 bg-white border-l border-slate-200 flex flex-col shrink-0">
                                <div className="space-y-6 flex-1 overflow-y-auto">
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Return Invoice #</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-blue-500 transition-all text-slate-800"
                                                value={invoiceNo}
                                                onChange={(e) => setInvoiceNo(e.target.value)}
                                                placeholder="ex. RET-889"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
                                            <span>Subtotal</span>
                                            <span className="text-slate-800 font-bold font-mono">PKR {subTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
                                            <span>Handling / Tax</span>
                                            <input
                                                type="number"
                                                className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-right font-bold text-slate-700 focus:border-blue-500 outline-none transition-all text-xs"
                                                value={tax}
                                                onChange={(e) => setTax(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="pt-4 border-t border-slate-200 flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Credit Amount</span>
                                            <span className="text-2xl font-black text-blue-950 tracking-tighter">
                                                PKR {totalAmount.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notes / Reason</label>
                                        <textarea
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 transition-all resize-none h-24"
                                            placeholder="Reason for return..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || cart.length === 0 || !selectedEntityId}
                                        className="w-full py-4 bg-blue-950 text-white rounded-2xl font-bold text-base hover:bg-slate-900 shadow-xl shadow-blue-900/10 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                    >
                                        {saving ? <span>Processing...</span> : <span>Complete Return</span>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Returns;
