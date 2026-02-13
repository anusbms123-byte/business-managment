import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Plus, Search, X, ShoppingCart,
    Trash2, RefreshCcw
} from 'lucide-react';
import { canCreate, canDelete } from '../utils/permissions';

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
    const [productSearch, setProductSearch] = useState('');
    const [isProductListVisible, setIsProductListVisible] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const productRef = useRef(null);
    const qtyRef = useRef(null);

    const fetchData = useCallback(async () => {
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
    }, [currentUser?.company_id, activeTab]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
        setProductSearch('');
        setQty('');
        productRef.current?.focus();
    };

    const filteredProducts = useMemo(() => {
        if (!productSearch) return products;
        return products.filter(p =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.sku?.toLowerCase().includes(productSearch.toLowerCase())
        );
    }, [products, productSearch]);

    const handleProductSelect = (product) => {
        setSelectedProductId(product.id);
        setProductSearch(product.name);
        setIsProductListVisible(false);
        setTimeout(() => {
            qtyRef.current?.focus();
        }, 50);
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
        setProductSearch('');
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

    return (
        <div className="relative animate-in fade-in duration-500">



            {/* Filters & Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setActiveTab('sales')}
                                className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all ${activeTab === 'sales' ? 'bg-white text-blue-600 shadow-sm' : 'text-black hover:text-slate-700'}`}
                            >
                                Sale Returns
                            </button>
                            <button
                                onClick={() => setActiveTab('purchases')}
                                className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all ${activeTab === 'purchases' ? 'bg-white text-blue-600 shadow-sm' : 'text-black hover:text-slate-700'}`}
                            >
                                Purchase Returns
                            </button>
                        </div>
                        {canCreate('returns') && (
                            <button
                                onClick={() => { resetForm(); setIsModalOpen(true); }}
                                className="flex items-center gap-2 bg-blue-950 text-white px-5 py-2 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-blue-900/10 active:scale-95"
                            >
                                <Plus size={16} />
                                <span>Add New Return</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest">Invoice #</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest">{activeTab === 'sales' ? 'Customer' : 'Supplier'}</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest">Items</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest text-right">Total Amount</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest text-right">Action</th>
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
                                        <div className="text-sm font-bold text-slate-700">{activeTab === 'sales' ? item.customer?.name : item.vendor?.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {item.items?.length || 0} product(s)
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-sm font-medium text-slate-900">PKR {item.totalAmount.toLocaleString()}</span>
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

            {isModalOpen && (
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-white animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                    {/* Full-Page Modal Header */}
                    <div className="px-4 md:px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <RefreshCcw size={22} />
                            </div>
                            <div>
                                <h2 className="text-sm md:text-xl font-bold text-black tracking-tight">Return Processing</h2>
                                <p className="text-[10px] text-black font-bold uppercase tracking-widest mt-0.5">Operator: {currentUser?.fullname || 'Admin'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100"
                        >
                            <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">Close Terminal</span>
                            <X size={20} />
                        </button>
                    </div>


                    <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-50/30">
                        {/* Left: Product Selection & Cart */}
                        <div className="flex-1 p-6 overflow-y-auto border-r border-slate-200">
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">{activeTab === 'sales' ? 'Customer' : 'Supplier'}</label>
                                    <select
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-blue-500 transition-all text-black"
                                        value={selectedEntityId}
                                        onChange={(e) => setSelectedEntityId(e.target.value)}
                                    >
                                        <option value="">Select {activeTab === 'sales' ? 'Customer' : 'Supplier'}...</option>
                                        {(activeTab === 'sales' ? customers : vendors).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Product</label>
                                    <div className="relative">
                                        <input
                                            ref={productRef}
                                            type="text"
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-sm outline-none focus:border-blue-500 transition-all text-black"
                                            placeholder="Search product..."
                                            value={productSearch}
                                            onChange={(e) => {
                                                setProductSearch(e.target.value);
                                                setIsProductListVisible(true);
                                                setHighlightedIndex(0);
                                            }}
                                            onFocus={() => setIsProductListVisible(true)}
                                            onBlur={() => {
                                                setTimeout(() => setIsProductListVisible(false), 200);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setHighlightedIndex(prev => Math.min(prev + 1, filteredProducts.length - 1));
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setHighlightedIndex(prev => Math.max(prev - 1, 0));
                                                } else if (e.key === 'Enter') {
                                                    if (isProductListVisible && filteredProducts[highlightedIndex]) {
                                                        e.preventDefault();
                                                        handleProductSelect(filteredProducts[highlightedIndex]);
                                                    }
                                                } else if (e.key === 'Escape') {
                                                    setIsProductListVisible(false);
                                                }
                                            }}
                                        />
                                        {isProductListVisible && filteredProducts.length > 0 && (
                                            <div className="absolute z-[110] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                                {filteredProducts.map((p, index) => (
                                                    <div
                                                        key={p.id}
                                                        className={`px-4 py-2.5 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0 hover:bg-blue-50 transition-colors ${highlightedIndex === index ? 'bg-blue-50' : ''}`}
                                                        onMouseDown={(e) => { e.preventDefault(); handleProductSelect(p); }}
                                                    >
                                                        <div>
                                                            <div className="font-bold text-sm text-slate-800">{p.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">SKU: {p.sku || 'N/A'} - Stock: {p.stockQty}</div>
                                                        </div>
                                                        <div className="font-bold text-blue-600 text-sm">PKR {(activeTab === 'sales' ? p.sellPrice : p.costPrice).toLocaleString()}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Qty</label>
                                        <input
                                            ref={qtyRef}
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
                                                <td className="px-6 py-4 text-center font-medium text-slate-600 text-xs">PKR {item.price.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-700">{item.quantity}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-800 text-sm">PKR {item.total.toLocaleString()}</td>
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
                                        <span className="text-slate-800 font-medium font-mono">PKR {subTotal.toLocaleString()}</span>
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
                                        <span className="text-2xl font-medium text-blue-950 tracking-tighter">
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
            )}

        </div>
    );
};

export default Returns;
