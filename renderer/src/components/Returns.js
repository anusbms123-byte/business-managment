import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Plus, Search, X, ShoppingCart,
    Trash2, RefreshCcw, Eye, Calendar, User, Package
} from 'lucide-react';
import { canCreate, canDelete } from '../utils/permissions';
import { useDialog } from '../context/DialogContext';

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
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedReturnDetail, setSelectedReturnDetail] = useState(null);

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
    const [hoveredProduct, setHoveredProduct] = useState(null);

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

    // Scroll highlighted product into view
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

    // Update hovered product when highlightedIndex changes from keyboard
    useEffect(() => {
        if (isProductListVisible && filteredProducts[highlightedIndex]) {
            setHoveredProduct(filteredProducts[highlightedIndex]);
        }
    }, [highlightedIndex, isProductListVisible, filteredProducts]);

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
        if (cart.length === 0) return alert('Return cart is empty');
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
        const entityName = (activeTab === 'sales' ? item.customer?.name : item.vendor?.name) || `Walk-in ${activeTab === 'sales' ? 'Customer' : 'Supplier'}`;
        return (
            item.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entityName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <div className="relative animate-in fade-in duration-500">



            {/* Filters & Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search here..."
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-semibold text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
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
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">Loading returns...</td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">No return records found</td>
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
                                            {item.items?.length || 0} items
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

            {isModalOpen && (
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-white dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                    {/* Full-Page Modal Header */}
                    <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <RefreshCcw size={22} />
                            </div>
                            <div>
                                <h2 className="text-sm md:text-xl font-semibold text-black dark:text-slate-100 tracking-tight">{activeTab === 'sales' ? 'Add sale return' : 'Add purchase return'}</h2>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="p-3 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
                        >
                            <span className="text-sm font-semibold tracking-tight hidden md:block">Close</span>
                            <X size={20} />
                        </button>
                    </div>


                    <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-50/30 dark:bg-slate-900">
                        {/* Left: Product Selection & Cart */}
                        <div className="flex-1 p-6 border-r border-slate-200 dark:border-slate-800 flex flex-col relative z-20 overflow-visible">
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">{activeTab === 'sales' ? 'Customer' : 'Supplier'}</label>
                                    <select
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-sm outline-none focus:border-emerald-500 transition-all text-black dark:text-slate-100 appearance-none cursor-pointer"
                                        value={selectedEntityId}
                                        onChange={(e) => setSelectedEntityId(e.target.value)}
                                    >
                                        <option value="">Walk-in {activeTab === 'sales' ? 'Customer' : 'Supplier'}</option>
                                        {(activeTab === 'sales' ? customers : vendors).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5 col-span-2">
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
                                            onBlur={() => {
                                                setTimeout(() => setIsProductListVisible(false), 200);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setHighlightedIndex(prev => {
                                                        const next = Math.min(prev + 1, filteredProducts.length - 1);
                                                        setHoveredProduct(filteredProducts[next]);
                                                        return next;
                                                    });
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setHighlightedIndex(prev => {
                                                        const next = Math.max(prev - 1, 0);
                                                        setHoveredProduct(filteredProducts[next]);
                                                        return next;
                                                    });
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
                                            <div ref={productListRef} className="absolute z-[110] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                                {filteredProducts.map((p, index) => (
                                                    <div
                                                        key={p.id}
                                                        className={`px-4 py-2.5 cursor-pointer flex justify-between items-center border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors ${highlightedIndex === index ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}
                                                        onMouseDown={(e) => { e.preventDefault(); handleProductSelect(p); }}
                                                        onMouseEnter={() => {
                                                            setHoveredProduct(p);
                                                            setHighlightedIndex(index);
                                                        }}
                                                        onMouseLeave={() => setHoveredProduct(null)}
                                                    >
                                                        <div>
                                                            <div className="font-semibold text-sm text-black dark:text-slate-200 tracking-tight">{p.name}</div>
                                                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-tight">SKU: {p.sku || 'N/A'} - Stock: {p.stockQty}</div>
                                                        </div>
                                                        <div className="font-semibold text-black dark:text-slate-100 text-sm tracking-tight">{activeTab === 'sales' ? 'Price' : 'Cost'}: PKR {((activeTab === 'sales' ? p.sellPrice : p.costPrice) || 0).toLocaleString()}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Product Hover Detail Card */}
                                        {isProductListVisible && hoveredProduct && (
                                            <div className="absolute left-full ml-4 top-0 z-[1000] w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-5 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-left-4 duration-300">
                                                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-50 dark:border-slate-800">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                        <Package size={20} />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <div className="font-bold text-sm text-black dark:text-slate-100 tracking-tight truncate">{hoveredProduct.name}</div>
                                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">SKU: {hoveredProduct.sku || 'N/A'}</div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="p-2.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                                            <p className="text-[8px] font-bold text-black dark:text-slate-500 mb-1">Color</p>
                                                            <p className="text-xs font-bold text-black dark:text-slate-200 uppercase">{hoveredProduct.color || '-'}</p>
                                                        </div>
                                                        <div className="p-2.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                                            <p className="text-[8px] font-bold text-black dark:text-slate-500 mb-1">Size</p>
                                                            <p className="text-xs font-bold text-black dark:text-slate-200 uppercase">{hoveredProduct.size || '-'}</p>
                                                        </div>
                                                        <div className="p-2.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Grade</p>
                                                            <p className="text-xs font-bold text-black dark:text-slate-200 uppercase">{hoveredProduct.grade || '-'}</p>
                                                        </div>
                                                        <div className="p-2.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Status</p>
                                                            <p className={`text-xs font-bold ${hoveredProduct.stockQty <= (hoveredProduct.alertQty || 5) ? 'text-rose-500' : 'text-emerald-500'} uppercase tracking-tight`}>
                                                                {hoveredProduct.stockQty <= 0 ? 'Out of Stock' : hoveredProduct.stockQty <= (hoveredProduct.alertQty || 5) ? 'Low Stock' : 'In Stock'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2.5 p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                                            <span className="text-slate-400 dark:text-slate-500 uppercase">Cost Price</span>
                                                            <span className="text-black dark:text-slate-200 font-mono font-medium tracking-tight">PKR {Number(hoveredProduct.costPrice || 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                                            <span className="text-slate-400 dark:text-slate-500 uppercase">Sale Price</span>
                                                            <span className="text-blue-600 dark:text-blue-400 font-mono font-medium tracking-tight">PKR {Number(hoveredProduct.sellPrice || 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className="h-px bg-slate-200 dark:bg-slate-800"></div>
                                                        <div className="flex justify-between items-center pt-1 text-[10px] font-bold">
                                                            <span className="text-slate-400 dark:text-slate-500 uppercase">Stock Avail</span>
                                                            <span className="text-black dark:text-slate-100 text-xs">{hoveredProduct.stockQty} {hoveredProduct.unit || 'kg'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">BRAND: <span className="text-black dark:text-slate-200 uppercase">{hoveredProduct.brand?.name || 'Excel'}</span></span>
                                                        <span className="px-2 py-0.5 bg-blue-100/50 dark:bg-blue-900/30 rounded text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">{hoveredProduct.category?.name || 'Oil'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight ml-1">Qty</label>
                                        <input
                                            ref={qtyRef}
                                            type="number"
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-sm outline-none focus:border-emerald-500 transition-all text-black dark:text-slate-100 placeholder:text-slate-400"
                                            value={qty}
                                            onChange={(e) => setQty(e.target.value)}
                                            placeholder="0"
                                            onKeyDown={(e) => e.key === 'Enter' && addToCart()}
                                        />
                                    </div>
                                    <button
                                        onClick={addToCart}
                                        className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-all shrink-0 active:scale-95 flex items-center justify-center whitespace-nowrap shadow-sm tracking-tight"
                                    >
                                        <Plus size={20} />
                                        <span className="ml-1">Add now</span>
                                    </button>
                                </div>
                            </div>

                            {/* Cart Table */}
                            <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0">
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-3 text-sm font-semibold text-black dark:text-slate-500 text-left tracking-tight">Name</th>
                                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 text-center tracking-tight">Price</th>
                                            <th className="px-6 py-3 text-sm font-semibold text-black dark:text-slate-500 text-center tracking-tight">Qty</th>
                                            <th className="px-6 py-3 text-sm font-semibold text-black dark:text-slate-500 text-right tracking-tight">Total</th>
                                            <th className="px-6 py-3 text-sm font-semibold text-black dark:text-slate-500 text-right tracking-tight">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {cart.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-black dark:text-slate-200 tracking-tight">{item.name}</div>
                                                    <div className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-tight">SKU: {item.sku || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-medium text-black dark:text-slate-400 text-sm tracking-tight">PKR {(item.price || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold text-black dark:text-slate-300 tracking-tight">{item.quantity}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold text-black dark:text-slate-200 text-sm tracking-tight">PKR {(item.total || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => removeFromCart(item.productId)} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {cart.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-20 text-center">
                                                    <ShoppingCart size={40} className="mx-auto text-slate-100 dark:text-slate-800 mb-3 opacity-50" />
                                                    <p className="text-xs font-bold text-black dark:text-slate-600 tracking-widest">Return cart is empty</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                        {/* Right: Summary */}
                        <div className="w-[350px] p-6 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 relative z-10 transition-all">
                            <div className="space-y-6 flex-1 overflow-y-auto">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight ml-1">Return invoice #</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-sm outline-none focus:border-emerald-500 transition-all text-black dark:text-slate-100"
                                            value={invoiceNo}
                                            onChange={(e) => setInvoiceNo(e.target.value)}
                                            placeholder="ex. RET-889"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-center text-sm font-semibold text-black dark:text-slate-400 tracking-tight">
                                        <span>Subtotal</span>
                                        <span className="text-black dark:text-slate-200 font-semibold">PKR {(subTotal || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-semibold text-black dark:text-slate-400 tracking-tight">
                                        <span>Handling / tax</span>
                                        <input
                                            type="number"
                                            className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-right font-semibold text-black dark:text-slate-100 focus:border-emerald-500 outline-none transition-all text-sm"
                                            value={tax}
                                            onChange={(e) => setTax(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                                        <span className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight ml-1">Total amount</span>
                                        <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tracking-tighter">
                                            PKR {(totalAmount || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

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

                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || cart.length === 0}
                                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-semibold text-lg hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 tracking-tight"
                                >
                                    {saving ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Saving...</span>
                                        </div>
                                    ) : (
                                        <span>Save now</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isDetailModalOpen && selectedReturnDetail && (
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-[100] bg-white dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                    {/* Header */}
                    <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Eye size={22} />
                            </div>
                            <div>
                                <h2 className="text-sm md:text-xl font-semibold text-black dark:text-slate-100 tracking-tight">Return detail: {selectedReturnDetail.invoiceNo}</h2>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsDetailModalOpen(false)}
                            className="p-3 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100 dark:hover:border-rose-900"
                        >
                            <span className="text-sm font-semibold hidden md:block text-slate-400 dark:text-slate-500 tracking-tight">Close</span>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-800/20 p-4 md:p-8">
                        <div className="max-w-7xl mx-auto space-y-8">
                            {/* Return Overview Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-black dark:text-slate-500 mb-1">Date & Time</p>
                                        <h3 className="text-sm font-bold text-black dark:text-slate-100">{new Date(selectedReturnDetail.date).toLocaleString()}</h3>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-black dark:text-slate-500 mb-1">{activeTab === 'sales' ? 'Customer' : 'Supplier'}</p>
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
                                        <p className="text-[10px] font-bold text-black dark:text-slate-500 mb-1">Return Type</p>
                                        <h3 className="text-sm font-bold text-black dark:text-slate-100 uppercase tracking-tight">{activeTab} RETURN</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Totals Section */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-xs font-bold text-black dark:text-slate-400">Financial Summary</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-black dark:text-slate-500">Subtotal</p>
                                        <p className="text-lg font-bold text-black dark:text-slate-100">PKR {selectedReturnDetail.subTotal?.toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-black dark:text-slate-500">Tax / Handling</p>
                                        <p className="text-lg font-bold text-black dark:text-slate-100">PKR {selectedReturnDetail.tax?.toLocaleString() || '0'}</p>
                                    </div>
                                    <div className="space-y-1 text-center md:text-left">
                                        <p className="text-[10px] font-bold text-black dark:text-slate-500">Total Return Amount</p>
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">PKR {selectedReturnDetail.totalAmount?.toLocaleString()}</p>
                                    </div>
                                </div>
                                {selectedReturnDetail.notes && (
                                    <div className="px-8 pb-8 pt-2">
                                        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                            <p className="text-[9px] font-bold text-black dark:text-slate-500 mb-2">Internal Notes</p>
                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 italic">"{selectedReturnDetail.notes}"</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Item Details Heading */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                                <h3 className="text-[11px] font-bold text-black dark:text-slate-500">Items Details ({selectedReturnDetail.items?.length})</h3>
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                            </div>

                            {/* Items Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
                                {selectedReturnDetail.items?.map((item, idx) => {
                                    // Find full product info from state to show all details
                                    const fullProduct = products.find(p => p.id === (item.productId || item.product_id || item.product?.id));
                                    const displayProduct = fullProduct || item.product || item;

                                    return (
                                        <div key={idx} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl p-6 relative group overflow-hidden transition-all hover:scale-[1.02]">
                                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50 dark:border-slate-800">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                    <Package size={24} />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="font-bold text-base text-black dark:text-slate-100 uppercase tracking-tight truncate">{displayProduct.name || item.name}</div>
                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">SKU: {displayProduct.sku || item.sku || 'N/A'}</div>
                                                </div>
                                                <div className="ml-auto text-right">
                                                    <span className="text-xs font-bold text-black dark:text-slate-500 block">Qty</span>
                                                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{item.quantity}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {/* Attributes Grid */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-[8px] font-bold text-black dark:text-slate-500 mb-1">Color</p>
                                                        <p className="text-sm font-bold text-black dark:text-slate-200 uppercase">{displayProduct.color || '-'}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-[8px] font-bold text-black dark:text-slate-500 mb-1">Size</p>
                                                        <p className="text-sm font-bold text-black dark:text-slate-200 uppercase">{displayProduct.size || '-'}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-[8px] font-bold text-black dark:text-slate-500 mb-1">Grade</p>
                                                        <p className="text-sm font-bold text-black dark:text-slate-200 uppercase">{displayProduct.grade || '-'}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-[8px] font-bold text-black dark:text-slate-500 mb-1">Category</p>
                                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase truncate">{displayProduct.category?.name || 'Local'}</p>
                                                    </div>
                                                </div>

                                                {/* Pricing & Total */}
                                                <div className="space-y-2 p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                                                    <div className="flex justify-between items-center py-1">
                                                        <span className="text-[10px] font-bold text-black dark:text-slate-500">Unit Price</span>
                                                        <span className="text-xs font-bold text-black dark:text-slate-200">PKR {Number(item.price || item.unitCost || item.unit_price || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="h-px bg-slate-200/50 dark:bg-slate-700/50"></div>
                                                    <div className="flex justify-between items-center py-2">
                                                        <span className="text-[10px] font-bold text-black dark:text-slate-500">Item Total</span>
                                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">PKR {Number(item.total || 0).toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                {/* Brand Footer */}
                                                <div className="flex justify-center pt-2">
                                                    <span className="text-[9px] font-bold text-black dark:text-slate-500 tracking-[0.2em]">BRAND: <span className="text-black dark:text-slate-200">{displayProduct.brand?.name || 'GENERAL'}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Returns;
