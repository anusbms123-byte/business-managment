import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Search, X, ShoppingCart,
    Trash2, Package, User, Receipt
} from 'lucide-react';
import { canCreate, canDelete } from '../utils/permissions';

const Purchase = ({ currentUser }) => {
    const [purchases, setPurchases] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form State for Interaction (Left Panel)
    const [vendorId, setVendorId] = useState('');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [cart, setCart] = useState([]);

    // Right Panel Details
    const [invoiceNo, setInvoiceNo] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [shippingCost, setShippingCost] = useState('');
    const [discount, setDiscount] = useState('');
    const [discountType, setDiscountType] = useState('FLAT');
    const [tax, setTax] = useState('');
    const [taxType, setTaxType] = useState('PERCENT'); // Default tax to percent
    const [paidAmount, setPaidAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paymentStatus, setPaymentStatus] = useState('RECEIVED');
    const [notes, setNotes] = useState('');
    const [previousBalance, setPreviousBalance] = useState(0);

    // Refs for keyboard navigation
    const vendorRef = useRef(null);
    const productRef = useRef(null);
    const qtyRef = useRef(null);
    const addBtnRef = useRef(null);

    useEffect(() => {
        loadData();
    }, [currentUser]);

    // Focus vendor select when modal opens
    useEffect(() => {
        if (isModalOpen) {
            setTimeout(() => {
                vendorRef.current?.focus();
            }, 100);
        }
    }, [isModalOpen]);

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
            }
        } catch (err) {
            console.error('Error loading purchase data:', err);
        }
        setLoading(false);
    };

    // --- Cart Logic ---

    const addToCart = () => {
        if (!selectedProduct) return;
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return;

        const existingItem = cart.find(item => item.id === product.id);

        // Backend expects costPrice. Use product cost or 0 default.
        const unitCost = product.costPrice || product.cost_price || 0;

        if (existingItem) {
            setCart(cart.map(item => item.id === product.id ? {
                ...item,
                quantity: item.quantity + parseInt(qty),
                total: (item.quantity + parseInt(qty)) * item.unitCost
            } : item));
        } else {
            setCart([...cart, {
                id: product.id, // Use 'id' to match Purchase logic (Sales uses productId, but Purchase used id in previous code, keeping 'id' for consistency with existing handleSave)
                name: product.name,
                sku: product.sku,
                unitCost: unitCost,
                quantity: parseInt(qty),
                total: parseInt(qty) * unitCost
            }]);
        }
        setQty(1);
        setSelectedProduct('');

        // Focus back to product for quick entry
        setTimeout(() => {
            productRef.current?.focus();
        }, 50);
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            setTimeout(() => {
                nextRef.current?.focus();
            }, 50);
        }
    };

    // --- Totals Calculation ---
    const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);
    const discountValue = discountType === 'PERCENT' ? (subtotal * (Number(discount) || 0)) / 100 : (Number(discount) || 0);
    const taxValue = taxType === 'PERCENT' ? (subtotal * (Number(tax) || 0)) / 100 : (Number(tax) || 0);

    const grandTotal = subtotal + parseFloat(shippingCost || 0) + taxValue - discountValue + parseFloat(previousBalance || 0);
    const balanceDue = Math.max(0, grandTotal - parseFloat(paidAmount || 0));

    const handleSave = async () => {
        if (!vendorId) return window.alert('Please select a vendor');
        if (cart.length === 0) return window.alert('Cart is empty');

        setSaving(true);
        try {
            const data = {
                id: editingId,
                companyId: currentUser?.company_id,
                vendorId,
                invoiceNo,
                totalAmount: subtotal + parseFloat(shippingCost || 0) + taxValue - discountValue, // Bill Amount (Excluding Prev Balance)
                paidAmount: parseFloat(paidAmount) || 0,
                shippingCost: parseFloat(shippingCost) || 0,
                discount: discountValue,
                tax: taxValue,
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

            const result = editingId
                ? await window.electronAPI.updatePurchase(data)
                : await window.electronAPI.addPurchase(data);
            if (result?.success === false) {
                window.alert(result.message);
            } else {
                setIsModalOpen(false);
                resetForm();
                loadData();
            }
        } catch (err) {
            window.alert('Error saving purchase: ' + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this purchase? This will restore stock and update vendor balance.')) return;
        try {
            const result = await window.electronAPI.deletePurchase(id);
            if (result?.success === false) {
                window.alert(result.message);
            } else {
                loadData();
            }
        } catch (err) {
            window.alert('Error deleting purchase: ' + err.message);
        }
    };

    const handleEdit = (purchase) => {
        setEditingId(purchase.id);
        setVendorId(purchase.vendorId);
        setInvoiceNo(purchase.invoiceNo || '');
        setDueDate(purchase.dueDate ? new Date(purchase.dueDate).toISOString().split('T')[0] : '');
        setPaymentStatus(purchase.paymentStatus || 'RECEIVED');
        setPaymentMethod(purchase.paymentMethod || 'CASH');
        setPaidAmount(purchase.paidAmount || 0);
        setShippingCost(purchase.shippingCost || 0);
        setDiscount(purchase.discount || 0);
        setDiscountType('FLAT');
        setTax(purchase.tax || 0);
        setTaxType('FLAT'); // Loaded as flat value
        setNotes(purchase.notes || '');

        // Reconstruct Cart
        // Note: Backend response might have items nested or different key names
        const loadedCart = (purchase.items || []).map(item => ({
            id: item.productId || item.id, // Assuming productId is what we need for cart logic (which uses item.id as prodId)
            name: item.product?.name || item.name || 'Unknown',
            sku: item.product?.sku,
            unitCost: item.unitCost || item.costPrice || 0,
            quantity: item.quantity,
            total: (item.unitCost || 0) * item.quantity
        }));
        setCart(loadedCart);

        const ven = vendors.find(v => v.id === purchase.vendorId);
        setPreviousBalance(ven?.balance || 0);

        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setVendorId('');
        setInvoiceNo('');
        setCart([]);
        setPaidAmount('');
        setShippingCost('');
        setDiscount('');
        setDiscountType('FLAT');
        setTax('');
        setTaxType('PERCENT');
        setDueDate('');
        setNotes('');
        setPaymentStatus('RECEIVED');
        setPreviousBalance(0);
    };

    const filteredPurchases = purchases.filter(p =>
        p.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Table Section - Matches Sales.js style */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/20">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                            placeholder="Find procurement..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canCreate('purchase') && (
                        <button
                            onClick={() => { resetForm(); setIsModalOpen(true); }}
                            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all active:scale-95 shadow-sm shadow-blue-200"
                        >
                            <Plus size={18} />
                            <span>New Order</span>
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Procurement #</th>
                                <th className="px-6 py-4">Supplier</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Total Amount</th>
                                <th className="px-6 py-4">Paid / Method</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filteredPurchases.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-all group border-b border-slate-50 last:border-0">
                                    <td className="px-6 py-4 font-bold text-sm text-slate-800 uppercase">{p.invoiceNo || `PO-${p.id.slice(-6)}`}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                <User size={14} />
                                            </div>
                                            <span className="font-bold text-xs text-slate-600">{p.vendor?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[11px] font-bold text-slate-500">
                                        {new Date(p.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-sm text-slate-800">PKR {p.totalAmount.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{p.paymentMethod || 'CASH'}</span>
                                            <span className="text-xs font-bold text-slate-800">PKR {(p.paidAmount || 0).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${p.paidAmount >= p.totalAmount ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            p.paidAmount > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                'bg-blue-50 text-blue-600 border-blue-100'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${p.paidAmount >= p.totalAmount ? 'bg-emerald-500' : p.paidAmount > 0 ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                                            {p.paidAmount >= p.totalAmount ? 'Fully Paid' : p.paidAmount > 0 ? 'Partial' : 'Ordered'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(p)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Edit Order"
                                            >
                                                <div className="w-4 h-4">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                                </div>
                                            </button>
                                            {canDelete('purchase') && (
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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

            {/* POS-Style Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95%] lg:max-w-7xl h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
                        {/* Header */}
                        <div className="px-4 md:px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                    <ShoppingCart size={20} />
                                </div>
                                <div>
                                    <h2 className="text-sm md:text-lg font-bold text-slate-800 tracking-tight">Procurement Terminal</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Operator: {currentUser?.fullname || 'Admin'}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-slate-50/30">
                            {/* LEFT COLUMN: Inputs & Cart */}
                            <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 border-b lg:border-b-0 lg:border-r border-slate-200">

                                {/* Top Input Row (Vendor | Product | Qty) */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Supplier</label>
                                        <div className="relative">
                                            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <select
                                                ref={vendorRef}
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-sm outline-none appearance-none cursor-pointer"
                                                value={vendorId}
                                                onChange={(e) => {
                                                    const vid = e.target.value;
                                                    setVendorId(vid);
                                                    const ven = vendors.find(v => v.id === vid);
                                                    setPreviousBalance(ven?.balance || 0);
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, productRef)}
                                            >
                                                <option value="">Select Supplier</option>
                                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 lg:col-span-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Product</label>
                                        <div className="relative">
                                            <Package size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <select
                                                ref={productRef}
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-sm outline-none appearance-none cursor-pointer"
                                                value={selectedProduct}
                                                onChange={(e) => setSelectedProduct(e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, qtyRef)}
                                            >
                                                <option value="">Select Item...</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} - (Stock: {p.stockQty}) - Cost: {p.costPrice || 0}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <div className="space-y-1.5 flex-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Qty</label>
                                            <input
                                                ref={qtyRef}
                                                type="number"
                                                min="1"
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-sm outline-none text-center"
                                                value={qty || ''}
                                                placeholder="0"
                                                onChange={(e) => setQty(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        addToCart();
                                                    }
                                                }}
                                            />
                                        </div>
                                        <button
                                            ref={addBtnRef}
                                            onClick={addToCart}
                                            className="px-4 py-2 mt-auto bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm active:scale-95"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Cart Table */}
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4">Product</th>
                                                <th className="px-6 py-4 text-center">Cost</th>
                                                <th className="px-6 py-4 text-center">Qty</th>
                                                <th className="px-6 py-4 text-right">Total</th>
                                                <th className="px-6 py-4 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {cart.map((item, idx) => (
                                                <tr key={idx} className="group hover:bg-slate-50/50 transition-all">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">SKU: {item.sku || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-600 text-xs">PKR {item.unitCost.toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="w-16 mx-auto px-2 py-1 bg-slate-100 rounded text-center font-bold text-xs text-slate-700 border border-slate-200">
                                                            {item.quantity}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-slate-800 text-sm">PKR {item.total.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg lg:opacity-0 group-hover:opacity-100 transition-all">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {cart.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-20 text-center">
                                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200 text-slate-300">
                                                            <ShoppingCart size={24} />
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cart is empty</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Summary & Checkout */}
                            <div className="w-full lg:w-[380px] p-4 md:p-6 flex flex-col bg-white border-t lg:border-t-0 lg:border-l border-slate-200 shrink-0 overflow-y-auto">
                                <div className="space-y-5">

                                    {/* Invoice Info */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Supplier Inv #</label>
                                            <input
                                                type="text"
                                                value={invoiceNo}
                                                onChange={(e) => setInvoiceNo(e.target.value)}
                                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                                                placeholder="ex. INV-99"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Due Date</label>
                                            <input
                                                type="date"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Financials Summary */}
                                    <div className="bg-slate-50/50 p-4 rounded-xl space-y-3 border border-slate-100">
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
                                            <span>Subtotal</span>
                                            <span className="text-slate-800">PKR {subtotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
                                            <span>Shipping</span>
                                            <input
                                                type="number"
                                                className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-right font-bold text-slate-700 focus:border-blue-500 outline-none transition-all text-xs"
                                                value={shippingCost || ''}
                                                onChange={(e) => setShippingCost(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
                                            <span>Tax</span>
                                            <div className="flex gap-1">
                                                <input
                                                    type="number"
                                                    className="w-12 px-2 py-1 bg-white border border-slate-200 rounded text-right font-bold text-slate-700 focus:border-blue-500 outline-none transition-all text-xs"
                                                    value={tax || ''}
                                                    onChange={(e) => setTax(e.target.value)}
                                                    placeholder="0"
                                                />
                                                <select value={taxType} onChange={e => setTaxType(e.target.value)} className="bg-slate-100 rounded text-[10px] font-bold px-1 outline-none">
                                                    <option value="PERCENT">%</option>
                                                    <option value="FLAT">Flat</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
                                            <span>Discount</span>
                                            <div className="flex gap-1">
                                                <input
                                                    type="number"
                                                    className="w-12 px-2 py-1 bg-white border border-slate-200 rounded text-right font-bold text-slate-700 focus:border-blue-500 outline-none transition-all text-xs"
                                                    value={discount || ''}
                                                    onChange={(e) => setDiscount(e.target.value)}
                                                    placeholder="0"
                                                />
                                                <select value={discountType} onChange={e => setDiscountType(e.target.value)} className="bg-slate-100 rounded text-[10px] font-bold px-1 outline-none">
                                                    <option value="FLAT">Flat</option>
                                                    <option value="PERCENT">%</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
                                            <span>Previous Balance</span>
                                            <span className="px-2 py-1 bg-slate-200 rounded text-slate-700">{previousBalance.toLocaleString()}</span>
                                        </div>
                                        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block">Grand Total</span>
                                            <span className="text-xl font-bold text-slate-800 tracking-tighter">
                                                PKR {grandTotal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Payment */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Payment Method</label>
                                            <select
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold uppercase focus:outline-none cursor-pointer"
                                            >
                                                <option value="CASH">CASH</option>
                                                <option value="BANK_TRANSFER">BANK TRANSFER</option>
                                                <option value="CHEQUE">CHEQUE</option>
                                            </select>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Amount Paid</label>
                                            <input
                                                type="number"
                                                className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-right font-bold text-sm text-slate-800 outline-none focus:border-blue-500"
                                                value={paidAmount || ''}
                                                onChange={(e) => setPaidAmount(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Balance Due</label>
                                            <span className="text-xs font-bold text-rose-600 px-2 py-0.5 bg-rose-50 rounded">PKR {balanceDue.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notes</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 transition-all resize-none h-16"
                                            placeholder="Details..."
                                        />
                                    </div>
                                </div>

                                <div className="mt-auto pt-4">
                                    <button
                                        onClick={handleSave}
                                        disabled={cart.length === 0}
                                        className="w-full py-3 bg-blue-950 text-white rounded-xl font-bold text-base hover:bg-slate-900 shadow-md shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <span>Processing...</span>
                                        ) : (
                                            <>
                                                <Receipt size={18} />
                                                <span>Save Order</span>
                                            </>
                                        )}
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

export default Purchase;
