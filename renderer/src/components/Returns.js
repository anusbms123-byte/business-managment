import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Plus, Search, X, ShoppingCart,
    Trash2, RefreshCcw, Eye, Calendar, User, Package
} from 'lucide-react';
import { canCreate, canDelete } from '../utils/permissions';
import { useDialog } from '../context/DialogContext';

const Returns = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('sales');
    const [saleReturns, setSaleReturns] = useState([]);
    const [purchaseReturns, setPurchaseReturns] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedReturnDetail, setSelectedReturnDetail] = useState(null);

    // Form State
    const [selectedEntityId, setSelectedEntityId] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [qty, setQty] = useState('');
    const [cart, setCart] = useState([]);
    const [notes, setNotes] = useState('');
    const [tax, setTax] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [isProductListVisible, setIsProductListVisible] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [hoveredProduct, setHoveredProduct] = useState(null);

    // Search Original Sale/Purchase
    const [originalInvoiceNo, setOriginalInvoiceNo] = useState('');
    const [searchingInvoice, setSearchingInvoice] = useState(false);
    const [foundOriginalItems, setFoundOriginalItems] = useState([]);
    const [originalSaleId, setOriginalSaleId] = useState(null);

    const { showAlert, showConfirm, showError } = useDialog();

    const productRef = useRef(null);
    const qtyRef = useRef(null);
    const productListRef = useRef(null);

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
                unitCost: price,
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

    useEffect(() => {
        if (isProductListVisible && productListRef.current) {
            const container = productListRef.current;
            const highlightedItem = container.children[highlightedIndex];
            if (highlightedItem) {
                const containerRect = container.getBoundingClientRect();
                const itemRect = highlightedItem.getBoundingClientRect();
                if (itemRect.bottom > containerRect.bottom) {
                    container.scrollTop += (itemRect.bottom - containerRect.bottom);
                } else if (itemRect.top < containerRect.top) {
                    container.scrollTop -= (containerRect.top - itemRect.top);
                }
            }
        }
    }, [highlightedIndex, isProductListVisible]);

    useEffect(() => {
        if (isProductListVisible && filteredProducts[highlightedIndex]) {
            setHoveredProduct(filteredProducts[highlightedIndex]);
        }
    }, [highlightedIndex, isProductListVisible, filteredProducts]);

    const handleProductSelect = (product) => {
        setSelectedProductId(product.id);
        setProductSearch(product.name);
        setIsProductListVisible(false);
        setTimeout(() => { qtyRef.current?.focus(); }, 50);
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.productId !== id));
    };

    const subTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const taxValue = parseFloat(tax) || 0;
    const totalAmount = subTotal + taxValue;

    const searchOriginalInvoice = async () => {
        if (!originalInvoiceNo) return;
        setSearchingInvoice(true);
        try {
            let res;
            if (activeTab === 'sales') {
                res = await window.electronAPI.getSaleByInvoice(originalInvoiceNo, currentUser.company_id);
                if (res.success) {
                    const sale = res.sale;
                    setOriginalSaleId(sale.global_id || sale.id);
                    setSelectedEntityId(sale.customer_id || '');
                    setFoundOriginalItems(Array.isArray(sale.items) ? sale.items : []);
                    showAlert("Sale found! Select items to return.");
                } else {
                    showError(res.message || "Sale not found");
                    setFoundOriginalItems([]);
                }
            } else {
                res = await window.electronAPI.getPurchaseByInvoice(originalInvoiceNo, currentUser.company_id);
                if (res.success) {
                    const purchase = res.purchase;
                    setOriginalSaleId(purchase.global_id || purchase.id);
                    setSelectedEntityId(purchase.vendor_id || '');
                    setFoundOriginalItems(Array.isArray(purchase.items) ? purchase.items : []);
                    showAlert("Purchase found! Select items to return.");
                } else {
                    showError(res.message || "Purchase not found");
                    setFoundOriginalItems([]);
                }
            }
        } catch (err) {
            console.error("Search error:", err);
            showError("Error searching invoice.");
        } finally {
            setSearchingInvoice(false);
        }
    };

    const addOriginalItemToReturn = (item) => {
        const productId = item.product_id || item.productId;
        const existingInCart = cart.find(c => c.productId === productId);
        const maxQty = item.quantity;

        if (existingInCart) {
            if (existingInCart.quantity >= maxQty) {
                showAlert(`Cannot return more than originally sold (${maxQty})`);
                return;
            }
            setCart(cart.map(c => c.productId === productId
                ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.price }
                : c
            ));
        } else {
            const price = activeTab === 'sales'
                ? (item.price || item.unit_price || 0)
                : (item.unitCost || item.unit_cost || 0);
            setCart([...cart, {
                productId: productId,
                name: item.name,
                sku: item.sku,
                price: price,
                unitCost: price,
                quantity: 1,
                total: price
            }]);
        }
    };

    const handleSave = async () => {
        if (cart.length === 0) return;
        setSaving(true);
        try {
            const data = {
                companyId: currentUser.company_id,
                invoiceNo: invoiceNo || `RET-${Date.now().toString().slice(-6)}`,
                subTotal,
                tax: taxValue,
                totalAmount,
                notes,
                items: cart,
                saleId: originalSaleId,
                sale_id: originalSaleId
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
                showError("Error: " + res.message);
            }
        } catch (error) {
            console.error("Save error:", error);
            showError("An unexpected error occurred.");
        } finally {
            setSaving(false);
        }
    };

    const handleShowDetail = (item) => {
        setSelectedReturnDetail(item);
        setIsDetailModalOpen(true);
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
        setOriginalInvoiceNo('');
        setFoundOriginalItems([]);
        setOriginalSaleId(null);
    };

    const handleDelete = async (id) => {
        showConfirm("Are you sure you want to delete this return record? This will also revert stock and balances.", async () => {
            try {
                let res;
                if (activeTab === 'sales') {
                    res = await window.electronAPI.deleteSaleReturn(id);
                } else {
                    res = await window.electronAPI.deletePurchaseReturn(id);
                }
                if (res.success) {
                    fetchData();
                } else {
                    showError("Error: " + res.message);
                }
            } catch (error) {
                console.error("Delete error:", error);
                showError("An unexpected error occurred.");
            }
        });
    };

    const filteredData = (activeTab === 'sales' ? saleReturns : purchaseReturns).filter(item => {
        const entityName = (activeTab === 'sales' ? item.customer?.name : item.vendor?.name) || '';
        return (
            item.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entityName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <div className="relative animate-in fade-in duration-500">

            {/* ── Main Table ── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search here..."
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-semibold text-black dark:text-slate-100 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setActiveTab('sales')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all tracking-tight ${activeTab === 'sales' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-800' : 'text-black dark:text-slate-300 hover:text-slate-700 dark:hover:text-white'}`}
                            >
                                Sales returns
                            </button>
                            <button
                                onClick={() => setActiveTab('purchases')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all tracking-tight ${activeTab === 'purchases' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-800' : 'text-black dark:text-slate-300 hover:text-slate-700 dark:hover:text-white'}`}
                            >
                                Purchase returns
                            </button>
                        </div>
                        {canCreate('returns') && (
                            <button
                                onClick={() => { resetForm(); setIsModalOpen(true); }}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all active:scale-95 shadow-sm tracking-tight"
                            >
                                <Plus size={16} />
                                <span>Add return</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 transition-colors">
                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">ID</th>
                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">{activeTab === 'sales' ? 'Customer' : 'Supplier'}</th>
                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">Items</th>
                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight text-right">Total</th>
                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">Loading returns...</td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">No return records found</td>
                                </tr>
                            ) : filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-50 dark:border-slate-800 last:border-0">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-sm text-black dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors tracking-tight">{item.invoiceNo}</div>
                                        <div className="text-sm text-black dark:text-slate-400 font-medium mt-1">{item.date ? new Date(item.date).toLocaleString() : 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-black dark:text-slate-300 tracking-tight">
                                            {(activeTab === 'sales' ? item.customer?.name : item.vendor?.name) || `Walk-in ${activeTab === 'sales' ? 'Customer' : 'Supplier'}`}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-sm font-medium text-black dark:text-slate-400">
                                            {item.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0} items
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-sm font-semibold text-black dark:text-slate-100 tracking-tight">PKR {(item.totalAmount || 0).toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleShowDetail(item)}
                                                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                                                title="View Detail"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {canDelete('returns') && (
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
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

            {/* ── Add Return Modal ── */}
            {isModalOpen && (
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-white dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl">

                    {/* Header */}
                    <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <RefreshCcw size={22} />
                            </div>
                            <h2 className="text-sm md:text-xl font-semibold text-black dark:text-slate-100 tracking-tight">
                                {activeTab === 'sales' ? 'Add sale return' : 'Add purchase return'}
                            </h2>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-2 border border-transparent hover:border-rose-100"
                        >
                            <span className="text-sm font-semibold hidden md:block">Close</span>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Invoice Search Strip */}
                    <div className="px-8 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 shrink-0">
                        <div className="flex-1 max-w-md relative">
                            <input
                                type="text"
                                placeholder={`Enter original ${activeTab === 'sales' ? 'sale' : 'purchase'} invoice #...`}
                                className="w-full pl-4 pr-12 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-black dark:text-white"
                                value={originalInvoiceNo}
                                onChange={(e) => setOriginalInvoiceNo(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchOriginalInvoice()}
                            />
                            <button
                                onClick={searchOriginalInvoice}
                                disabled={searchingInvoice || !originalInvoiceNo}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all"
                            >
                                {searchingInvoice
                                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <Search size={16} />
                                }
                            </button>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">
                            Step 1: Find original invoice to pre-fill items
                        </p>
                    </div>

                    {/* Body */}
                    <div className="flex-1 flex overflow-hidden min-h-0">

                        {/* Left: Product picker + cart */}
                        <div className="flex-1 p-6 border-r border-slate-200 dark:border-slate-800 flex flex-col relative z-20 overflow-y-auto">

                            {/* Controls row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 mb-6 items-end relative z-[150]">

                                {/* Customer / Supplier */}
                                <div className="space-y-1.5 lg:col-span-3">
                                    <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">
                                        {activeTab === 'sales' ? 'Customer' : 'Supplier'}
                                    </label>
                                    <select
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-sm outline-none focus:border-emerald-500 transition-all text-black dark:text-slate-100 appearance-none cursor-pointer"
                                        value={selectedEntityId}
                                        onChange={(e) => setSelectedEntityId(e.target.value)}
                                    >
                                        <option value="">Walk-in {activeTab === 'sales' ? 'Customer' : 'Supplier'}</option>
                                        {(activeTab === 'sales' ? customers : vendors).map(e => (
                                            <option key={e.id} value={e.id}>{e.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Product search */}
                                <div className="space-y-1.5 sm:col-span-1 lg:col-span-6">
                                    <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">Product</label>
                                    <div className="relative">
                                        <input
                                            ref={productRef}
                                            type="text"
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-sm outline-none focus:border-emerald-500 transition-all text-black dark:text-slate-100 placeholder:text-slate-400"
                                            placeholder="Search here..."
                                            value={productSearch}
                                            onChange={(e) => {
                                                setProductSearch(e.target.value);
                                                setIsProductListVisible(true);
                                                setHighlightedIndex(0);
                                            }}
                                            onFocus={() => setIsProductListVisible(true)}
                                            onBlur={() => setTimeout(() => setIsProductListVisible(false), 200)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setHighlightedIndex(prev => Math.min(prev + 1, filteredProducts.length - 1));
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setHighlightedIndex(prev => Math.max(prev - 1, 0));
                                                } else if (e.key === 'Enter' && isProductListVisible && filteredProducts[highlightedIndex]) {
                                                    e.preventDefault();
                                                    handleProductSelect(filteredProducts[highlightedIndex]);
                                                } else if (e.key === 'Escape') {
                                                    setIsProductListVisible(false);
                                                }
                                            }}
                                        />

                                        {/* Dropdown list */}
                                        {isProductListVisible && filteredProducts.length > 0 && (
                                            <div ref={productListRef} className="absolute z-[110] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                                {filteredProducts.map((p, index) => (
                                                    <div
                                                        key={p.id}
                                                        className={`px-4 py-2.5 cursor-pointer flex justify-between items-center border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors ${highlightedIndex === index ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}
                                                        onMouseDown={(e) => { e.preventDefault(); handleProductSelect(p); }}
                                                        onMouseEnter={() => { setHoveredProduct(p); setHighlightedIndex(index); }}
                                                        onMouseLeave={() => setHoveredProduct(null)}
                                                    >
                                                        <div>
                                                            <div className="font-semibold text-sm text-black dark:text-slate-200 tracking-tight">{p.name}</div>
                                                            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-tight">
                                                                SKU: {p.sku || 'N/A'} · Stock: {p.stock_quantity ?? p.stockQty ?? 0}
                                                            </div>
                                                        </div>
                                                        <div className="font-semibold text-black dark:text-slate-100 text-sm tracking-tight">
                                                            PKR {((activeTab === 'sales' ? p.sellPrice : p.costPrice) || 0).toLocaleString()}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Hover detail card */}
                                        {isProductListVisible && hoveredProduct && (
                                            <div className="absolute left-full ml-4 top-0 z-[1000] w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                                        <Package size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-black dark:text-slate-100 truncate">{hoveredProduct.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold">SKU: {hoveredProduct.sku || 'N/A'}</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                        <p className="text-[8px] font-bold text-slate-400 mb-1">COLOR</p>
                                                        <p className="text-xs font-bold text-black dark:text-slate-200 uppercase">{hoveredProduct.color || '-'}</p>
                                                    </div>
                                                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                        <p className="text-[8px] font-bold text-slate-400 mb-1">SIZE</p>
                                                        <p className="text-xs font-bold text-black dark:text-slate-200 uppercase">{hoveredProduct.size || '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Qty */}
                                <div className="space-y-1.5 lg:col-span-2">
                                    <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">Qty</label>
                                    <input
                                        ref={qtyRef}
                                        type="number"
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-sm outline-none focus:border-emerald-500 transition-all text-black dark:text-slate-100"
                                        placeholder="0"
                                        value={qty}
                                        onChange={(e) => setQty(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addToCart()}
                                    />
                                </div>

                                {/* Add button */}
                                <div className="lg:col-span-1">
                                    <button
                                        onClick={addToCart}
                                        className="w-full h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Original items picker */}
                            {foundOriginalItems.length > 0 && (
                                <div className="mb-6 p-4 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20">
                                    <h4 className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">
                                        Items from original transaction — click to add to return cart
                                    </h4>
                                    <div className="flex flex-wrap gap-3">
                                        {foundOriginalItems.map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => addOriginalItemToReturn(item)}
                                                className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-emerald-500 transition-all text-left group shadow-sm active:scale-95"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
                                                    <Package size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-black dark:text-slate-100">{item.name}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                                                        Qty: {item.quantity} · PKR {(item.price || item.unit_price || item.unitCost || 0).toLocaleString()}
                                                    </div>
                                                </div>
                                                <Plus size={14} className="ml-2 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cart table */}
                            <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0">
                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-6 py-3 text-sm font-semibold text-black dark:text-slate-500 text-left tracking-tight">Name</th>
                                                <th className="px-6 py-3 text-sm font-semibold text-black dark:text-slate-500 text-center tracking-tight">Price</th>
                                                <th className="px-6 py-3 text-sm font-semibold text-black dark:text-slate-500 text-center tracking-tight">Qty</th>
                                                <th className="px-6 py-3 text-sm font-semibold text-black dark:text-slate-500 text-right tracking-tight">Total</th>
                                                <th className="px-6 py-3 text-sm font-semibold text-black dark:text-slate-500 text-right tracking-tight">Del</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {cart.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-20 text-center">
                                                        <ShoppingCart size={40} className="mx-auto text-slate-200 dark:text-slate-800 mb-3" />
                                                        <p className="text-xs font-bold text-slate-400 tracking-widest">Return cart is empty</p>
                                                    </td>
                                                </tr>
                                            ) : cart.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-semibold text-black dark:text-slate-200 tracking-tight">{item.name}</div>
                                                        <div className="text-[11px] text-slate-400 font-semibold uppercase">SKU: {item.sku || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-sm text-black dark:text-slate-400 font-medium">
                                                        PKR {(item.price || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold text-black dark:text-slate-300">
                                                            {item.quantity}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-semibold text-black dark:text-slate-200 text-sm">
                                                        PKR {(item.total || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => removeFromCart(item.productId)}
                                                            className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Right: Summary panel */}
                        <div className="w-80 p-6 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
                            <div className="space-y-6 flex-1 overflow-y-auto">

                                {/* Invoice # */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight ml-1">Return invoice #</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-sm outline-none focus:border-emerald-500 transition-all text-black dark:text-slate-100"
                                        value={invoiceNo}
                                        onChange={(e) => setInvoiceNo(e.target.value)}
                                        placeholder="e.g. RET-001"
                                    />
                                </div>

                                {/* Totals */}
                                <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-center text-sm font-semibold text-black dark:text-slate-400">
                                        <span>Subtotal</span>
                                        <span className="text-black dark:text-slate-200">PKR {subTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-semibold text-black dark:text-slate-400">
                                        <span>Tax / Handling</span>
                                        <input
                                            type="number"
                                            className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-right font-semibold text-black dark:text-slate-100 focus:border-emerald-500 outline-none text-sm"
                                            value={tax}
                                            onChange={(e) => setTax(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                                        <span className="text-sm font-semibold text-black dark:text-slate-500">Total amount</span>
                                        <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tracking-tighter">
                                            PKR {totalAmount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight ml-1">Notes</label>
                                    <textarea
                                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-emerald-500 transition-all resize-none h-24 text-black dark:text-slate-200 placeholder:text-slate-400"
                                        placeholder="Details..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Save button */}
                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || cart.length === 0}
                                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-semibold text-lg hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 tracking-tight"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>Save return</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Detail Modal ── */}
            {isDetailModalOpen && selectedReturnDetail && (
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-[100] bg-white dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl">

                    {/* Header */}
                    <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Eye size={22} />
                            </div>
                            <h2 className="text-sm md:text-xl font-semibold text-black dark:text-slate-100 tracking-tight">
                                Return detail: {selectedReturnDetail.invoiceNo}
                            </h2>
                        </div>
                        <button
                            onClick={() => setIsDetailModalOpen(false)}
                            className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-2 border border-transparent hover:border-rose-100"
                        >
                            <span className="text-sm font-semibold hidden md:block">Close</span>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-800/20 p-4 md:p-8">
                        <div className="max-w-7xl mx-auto space-y-8">

                            {/* Overview cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-1">Date & Time</p>
                                        <h3 className="text-sm font-bold text-black dark:text-slate-100">
                                            {selectedReturnDetail.date ? new Date(selectedReturnDetail.date).toLocaleString() : 'N/A'}
                                        </h3>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-1">{activeTab === 'sales' ? 'Customer' : 'Supplier'}</p>
                                        <h3 className="text-sm font-bold text-black dark:text-slate-100">
                                            {(activeTab === 'sales' ? selectedReturnDetail.customer?.name : selectedReturnDetail.vendor?.name) || `Walk-in ${activeTab === 'sales' ? 'Customer' : 'Supplier'}`}
                                        </h3>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                        <RefreshCcw size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 mb-1">Return Type</p>
                                        <h3 className="text-sm font-bold text-black dark:text-slate-100 uppercase tracking-tight">{activeTab} RETURN</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Financial summary */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-400">Financial Summary</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400">Subtotal</p>
                                        <p className="text-lg font-bold text-black dark:text-slate-100">
                                            PKR {(selectedReturnDetail.subTotal || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400">Tax / Handling</p>
                                        <p className="text-lg font-bold text-black dark:text-slate-100">
                                            PKR {(selectedReturnDetail.tax || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="col-span-2 space-y-1 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500">Total Refunded</p>
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tighter">
                                            PKR {(selectedReturnDetail.totalAmount || 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Returned items */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-400">Returned Items</h3>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Array.isArray(selectedReturnDetail.items) && selectedReturnDetail.items.map((item, index) => {
                                        const displayProduct = products.find(p => p.id === (item.product_id || item.productId)) || {};
                                        return (
                                            <div key={index} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-bl-full -mr-10 -mt-10 group-hover:scale-110 transition-all" />
                                                <div className="flex items-center gap-4 mb-4 relative z-10">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-lg font-bold">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-black dark:text-slate-100">{item.name}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU: {item.sku || 'N/A'}</p>
                                                    </div>
                                                    <div className="ml-auto text-right">
                                                        <span className="text-xs font-bold text-slate-400 block">Qty</span>
                                                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{item.quantity}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            { label: 'Color', val: displayProduct.color },
                                                            { label: 'Size', val: displayProduct.size },
                                                            { label: 'Grade', val: displayProduct.grade },
                                                            { label: 'Category', val: displayProduct.category?.name },
                                                        ].map(({ label, val }) => (
                                                            <div key={label} className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                                <p className="text-[8px] font-bold text-slate-400 mb-1">{label}</p>
                                                                <p className="text-xs font-bold text-black dark:text-slate-200 uppercase truncate">{val || '-'}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="space-y-2 p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-bold text-slate-400">Unit Price</span>
                                                            <span className="text-xs font-bold text-black dark:text-slate-200">
                                                                PKR {Number(item.price || item.unitCost || item.unit_price || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="h-px bg-slate-200 dark:bg-slate-700" />
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-bold text-slate-400">Item Total</span>
                                                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                                PKR {Number(item.total || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="text-center pt-1">
                                                        <span className="text-[9px] font-bold text-slate-400 tracking-[0.2em]">
                                                            BRAND: <span className="text-black dark:text-slate-200">{displayProduct.brand?.name || 'GENERAL'}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
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
