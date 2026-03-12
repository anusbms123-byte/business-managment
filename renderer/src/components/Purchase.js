import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Plus, Search, X, ShoppingCart,
    Trash2, Package, User, Receipt, Eye, Calendar, CreditCard,
    Box, Tag, ChevronDown, ChevronUp, AlertTriangle, Layers, DollarSign, Clock, Check
} from 'lucide-react';
import { canCreate, canDelete } from '../utils/permissions';
import { useDialog } from '../context/DialogContext';

const CreatableSelect = ({ label, icon: Icon, value, onChange, options, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value || '');

    useEffect(() => {
        setSearchTerm(value || '');
    }, [value]);

    const filteredOptions = options.filter(opt =>
        (opt.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative space-y-2">
            <label className="text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 ml-1">
                <Icon size={12} className="text-black dark:text-slate-400" /> {label}
            </label>
            <div className="relative">
                <input
                    type="text"
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none text-slate-800 dark:text-slate-100"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        onChange(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                    placeholder={placeholder}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown
                        size={16}
                        className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>

                {isOpen && (searchTerm.length > 0 || filteredOptions.length > 0) && (
                    <div className="absolute z-[130] w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar py-2 animate-in fade-in zoom-in-95 duration-200">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div
                                    key={opt.id}
                                    className="px-5 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 transition-colors flex items-center justify-between"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setSearchTerm(opt.name);
                                        onChange(opt.name);
                                        setIsOpen(false);
                                    }}
                                >
                                    <span>{opt.name}</span>
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Select</span>
                                </div>
                            ))
                        ) : (
                            <div className="px-5 py-3 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10 flex items-center gap-2">
                                <Plus size={14} />
                                <span>Add New: "{searchTerm}"</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const Purchase = ({ currentUser }) => {
    const [purchases, setPurchases] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedPurchaseDetail, setSelectedPurchaseDetail] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailProduct, setDetailProduct] = useState(null);
    const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [quickProductForm, setQuickProductForm] = useState({
        name: '', sku: '', cost_price: '', sell_price: '', unit: 'pcs',
        category_name: '', brand_name: '', stock_qty: '', alert_qty: '5',
        description: '', weight: '', expiry_date: '',
        color: '', size: '', grade: '', condition: ''
    });
    const [showQuickOptional, setShowQuickOptional] = useState(false);

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
    const [productSearch, setProductSearch] = useState('');
    const [isProductListVisible, setIsProductListVisible] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [hoveredProduct, setHoveredProduct] = useState(null);

    const { showAlert, showConfirm, showError } = useDialog();

    // Refs for keyboard navigation
    const vendorRef = useRef(null);
    const productRef = useRef(null);
    const qtyRef = useRef(null);
    const addBtnRef = useRef(null);
    const productListRef = useRef(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const [pData, vData, prData, catData, brandData] = await Promise.all([
                    window.electronAPI.getPurchases(currentUser?.company_id),
                    window.electronAPI.getVendors(currentUser?.company_id),
                    window.electronAPI.getProducts(currentUser?.company_id),
                    window.electronAPI.getCategories(currentUser?.company_id),
                    window.electronAPI.getBrands(currentUser?.company_id)
                ]);

                setPurchases(Array.isArray(pData) ? pData : []);
                setVendors(Array.isArray(vData) ? vData : []);
                setProducts(Array.isArray(prData) ? prData : []);
                setCategories(Array.isArray(catData) ? catData : []);
                setBrands(Array.isArray(brandData) ? brandData : []);
            }
        } catch (err) {
            console.error('Error loading purchase data:', err);
        }
        setLoading(false);
    }, [currentUser?.company_id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Focus vendor select when modal opens
    useEffect(() => {
        if (isModalOpen) {
            setTimeout(() => {
                vendorRef.current?.focus();
            }, 100);
        }
    }, [isModalOpen]);

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

    // Focus vendor select when modal opens

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
        setProductSearch('');

        // Focus back to product for quick entry
        setTimeout(() => {
            productRef.current?.focus();
        }, 50);
    };



    const handleProductSelect = (product) => {
        setSelectedProduct(product.id);
        setProductSearch(product.name);
        setIsProductListVisible(false);
        setTimeout(() => {
            qtyRef.current?.focus();
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
        if (!vendorId) return showAlert('Please select a vendor');
        if (cart.length === 0) return showAlert('Cart is empty');

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
                showError(result.message, 'Save Failed');
            } else {
                setIsModalOpen(false);
                resetForm();
                loadData();
            }
        } catch (err) {
            showError('Error saving purchase: ' + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        showConfirm('Are you sure you want to delete this purchase? This will restore stock and update vendor balance.', async () => {
            try {
                const result = await window.electronAPI.deletePurchase(id);
                if (result?.success === false) {
                    showError(result.message, 'Cannot Delete');
                } else {
                    loadData();
                }
            } catch (err) {
                showError('Error deleting purchase: ' + err.message);
            }
        });
    };

    const handleEdit = (purchase) => {
        setEditingId(purchase.id);
        setVendorId(purchase.vendorId || purchase.vendor_id || '');
        setInvoiceNo(purchase.invoiceNo || purchase.ref_number || '');
        setDueDate(purchase.dueDate || purchase.due_date ? new Date(purchase.dueDate || purchase.due_date).toISOString().split('T')[0] : '');
        setPaymentStatus(purchase.paymentStatus || purchase.payment_status || 'RECEIVED');
        setPaymentMethod(purchase.paymentMethod || purchase.payment_method || 'CASH');

        setDiscount(purchase.discount ?? 0);
        setDiscountType('FLAT');
        setTax(purchase.tax ?? purchase.tax_amount ?? 0);
        setTaxType('FLAT');
        setShippingCost(purchase.shippingCost ?? purchase.shipping_cost ?? 0);
        setPaidAmount(purchase.paidAmount ?? purchase.amount_paid ?? 0);
        setNotes(purchase.notes || '');

        // Reconstruct Cart
        const items = purchase.items || [];
        const loadedCart = items.map(item => ({
            id: item.productId || item.product_id || item.product?.id,
            name: item.product?.name || item.name || 'Unknown Item',
            sku: item.product?.sku || item.sku,
            unitCost: item.unitCost || item.unit_cost || item.costPrice || 0,
            quantity: item.quantity || 0,
            total: item.total || item.total_cost || ((item.unitCost || item.unit_cost || item.costPrice || 0) * (item.quantity || 0))
        }));
        setCart(loadedCart);

        const ven = vendors.find(v => v.id === (purchase.vendorId || purchase.vendor_id));
        setPreviousBalance(ven?.balance || 0);

        setIsModalOpen(true);
    };

    const handleQuickProductSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Handle Category interaction
            let categoryId = null;
            if (quickProductForm.category_name) {
                const existingCat = categories.find(c => c.name.toLowerCase() === quickProductForm.category_name.toLowerCase());
                if (existingCat) categoryId = existingCat.id;
                else {
                    const newCat = await window.electronAPI.createCategory({ name: quickProductForm.category_name, companyId: currentUser.company_id });
                    if (newCat.success) {
                        const currentCats = await window.electronAPI.getCategories(currentUser.company_id);
                        if (Array.isArray(currentCats)) {
                            setCategories(currentCats);
                            categoryId = currentCats.find(c => c.name.toLowerCase() === quickProductForm.category_name.toLowerCase())?.id;
                        }
                    }
                }
            }

            // Handle Brand interaction
            let brandId = null;
            if (quickProductForm.brand_name) {
                const existingBrand = brands.find(b => b.name.toLowerCase() === quickProductForm.brand_name.toLowerCase());
                if (existingBrand) brandId = existingBrand.id;
                else {
                    const newBrand = await window.electronAPI.createBrand({ name: quickProductForm.brand_name, companyId: currentUser.company_id });
                    if (newBrand.success) {
                        const currentBrands = await window.electronAPI.getBrands(currentUser.company_id);
                        if (Array.isArray(currentBrands)) {
                            setBrands(currentBrands);
                            brandId = currentBrands.find(b => b.name.toLowerCase() === quickProductForm.brand_name.toLowerCase())?.id;
                        }
                    }
                }
            }

            const payload = {
                ...quickProductForm,
                category_id: categoryId,
                brand_id: brandId,
                companyId: currentUser.company_id
            };
            delete payload.category_name;
            delete payload.brand_name;

            const result = await window.electronAPI.createProduct(payload);
            if (result.success) {
                // Refresh product list
                const prData = await window.electronAPI.getProducts(currentUser?.company_id);
                const updatedProducts = Array.isArray(prData) ? prData : [];
                setProducts(updatedProducts);

                // Auto select the new product
                const newlyCreated = updatedProducts.find(p => p.id === result.id);
                if (newlyCreated) {
                    handleProductSelect(newlyCreated);
                }

                setIsQuickProductModalOpen(false);
                setQuickProductForm({
                    name: '', sku: '', cost_price: '', sell_price: '', unit: 'pcs',
                    category_name: '', brand_name: '', stock_qty: '', alert_qty: '5',
                    description: '', weight: '', expiry_date: '',
                    color: '', size: '', grade: '', condition: ''
                });
                setShowQuickOptional(false);
            } else {
                showError("Failed to create product: " + result.message);
            }
        } catch (err) {
            showError("Error: " + err.message);
        }
        setSaving(false);
    };

    const handleShowDetail = (purchase) => {
        setSelectedPurchaseDetail(purchase);
        setIsDetailModalOpen(true);
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
        <div className="relative animate-in fade-in duration-500">

            {/* Header / Table Section - Matches Sales.js style */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/20 dark:bg-slate-800/20">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-800 dark:text-slate-100 font-bold"
                            placeholder="Search here..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canCreate('purchase') && (
                        <button
                            onClick={() => { resetForm(); setIsModalOpen(true); }}
                            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-950 dark:bg-blue-600 text-white rounded-lg font-bold hover:bg-slate-900 dark:hover:bg-blue-700 transition-all active:scale-95 shadow-sm shadow-blue-200 dark:shadow-none"
                        >
                            <Plus size={18} />
                            <span>Add Purchase</span>
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Supplier</th>
                                <th className="px-6 py-4">Items</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Paid</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-slate-100 dark:border-slate-800 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filteredPurchases.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all group border-b border-slate-50 dark:border-slate-800 last:border-0">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-sm text-black dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase">{p.invoiceNo || `PO-${p.id.toString().slice(-6)}`}</div>
                                        <div className="text-[10px] text-black dark:text-slate-400 font-bold mt-1">{p.date ? new Date(p.date).toLocaleString() : 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-black dark:text-slate-200">
                                        {p.vendor?.name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-black dark:text-slate-400 uppercase">
                                            {p.items?.length || 0} Items
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-sm text-black dark:text-slate-100">PKR {(p.totalAmount || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-black dark:text-slate-400 uppercase">{p.paymentMethod || 'CASH'}</span>
                                            <span className="text-xs font-bold text-black dark:text-slate-200">PKR {(p.paidAmount || 0).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${p.paidAmount >= p.totalAmount ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50' :
                                            p.paidAmount > 0 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50' :
                                                'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${p.paidAmount >= p.totalAmount ? 'bg-emerald-500' : p.paidAmount > 0 ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                                            <span>{p.paidAmount >= p.totalAmount ? 'Fully Paid' : p.paidAmount > 0 ? 'Partial' : 'Ordered'}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleShowDetail(p)}
                                                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                                title="View Detail"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(p)}
                                                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                                title="Edit Order"
                                            >
                                                <div className="w-4 h-4">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                                </div>
                                            </button>
                                            {canDelete('purchase') && (
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredPurchases.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600">
                                            <ShoppingCart size={24} />
                                        </div>
                                        <p className="text-[10px] font-bold text-black dark:text-slate-500 uppercase tracking-widest">No purchase recorded yet</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-white dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                    {/* Fixed Header */}
                    <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <ShoppingCart size={22} />
                            </div>
                            <div>
                                <h2 className="text-sm md:text-xl font-bold text-black dark:text-slate-100 tracking-tight">{editingId ? 'Edit Purchase' : 'Add Purchase'}</h2>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100"
                        >
                            <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">Close</span>
                            <X size={20} />
                        </button>
                    </div>


                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-slate-50/30 dark:bg-slate-900">
                        {/* LEFT COLUMN: Inputs & Cart - Fixed Layout */}
                        <div className="flex-1 p-4 md:p-6 overflow-hidden min-h-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col">

                            {/* Top Input Row (Vendor | Product | Qty) */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-6 flex-shrink-0">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-widest ml-1">Supplier</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                        <select
                                            ref={vendorRef}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 dark:focus:border-blue-600 transition-all font-bold text-sm outline-none appearance-none cursor-pointer text-slate-800 dark:text-slate-100"
                                            value={vendorId}
                                            onChange={(e) => {
                                                const vid = e.target.value;
                                                setVendorId(vid);
                                                const ven = vendors.find(v => String(v.id) === String(vid));
                                                setPreviousBalance(ven?.balance || 0);
                                            }}
                                            onKeyDown={(e) => handleKeyDown(e, productRef)}
                                        >
                                            <option value="">Select Supplier</option>
                                            {vendors.map(v => (
                                                <option key={v.id} value={v.id}>
                                                    {v.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5 lg:col-span-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-widest ">Product</label>
                                        <button
                                            onClick={() => setIsQuickProductModalOpen(true)}
                                            className="text-[10px] font-bold text-blue-600 uppercase hover:underline"
                                        >
                                            + New Product
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Package size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                        <input
                                            ref={productRef}
                                            type="text"
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 dark:focus:border-blue-600 transition-all font-bold text-sm outline-none text-slate-800 dark:text-slate-100"
                                            placeholder="Type to search product..."
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
                                                    } else {
                                                        handleKeyDown(e, qtyRef);
                                                    }
                                                } else if (e.key === 'Escape') {
                                                    setIsProductListVisible(false);
                                                }
                                            }}
                                        />
                                        {isProductListVisible && filteredProducts.length > 0 && (
                                            <div
                                                ref={productListRef}
                                                className="absolute z-[110] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                                            >
                                                {filteredProducts.map((p, index) => (
                                                    <div
                                                        key={p.id}
                                                        className={`px-4 py-2.5 cursor-pointer flex justify-between items-center border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${highlightedIndex === index ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                                        onMouseDown={(e) => { e.preventDefault(); handleProductSelect(p); }}
                                                        onMouseEnter={() => setHoveredProduct(p)}
                                                        onMouseLeave={() => setHoveredProduct(null)}
                                                    >
                                                        <div>
                                                            <div className="font-bold text-sm text-black dark:text-slate-100">{p.name}</div>
                                                            <div className="text-[10px] text-black dark:text-slate-400 font-bold uppercase tracking-tight">SKU: {p.sku || 'N/A'} - Stock: {p.stockQty}</div>
                                                        </div>
                                                        <div className="font-bold text-black dark:text-slate-200 text-sm">Cost: PKR {(p.costPrice || p.cost_price || 0).toLocaleString()}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Product Hover Detail Card */}
                                        {isProductListVisible && hoveredProduct && (
                                            <div className="absolute left-full ml-4 top-0 z-[120] w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-none p-5 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-left-4 duration-300">
                                                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-50 dark:border-slate-800">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                        <Package size={20} />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <div className="font-bold text-sm text-black dark:text-slate-100 uppercase tracking-tight truncate">{hoveredProduct.name}</div>
                                                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">SKU: {hoveredProduct.sku || 'N/A'}</div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    {/* Attributes Grid */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Color</p>
                                                            <p className="text-xs font-bold text-black dark:text-slate-100">{hoveredProduct.color || '-'}</p>
                                                        </div>
                                                        <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Size</p>
                                                            <p className="text-xs font-bold text-black dark:text-slate-100">{hoveredProduct.size || '-'}</p>
                                                        </div>
                                                        <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Grade</p>
                                                            <p className="text-xs font-bold text-black dark:text-slate-100">{hoveredProduct.grade || '-'}</p>
                                                        </div>
                                                        <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Status</p>
                                                            <p className={`text-xs font-bold ${hoveredProduct.stockQty <= (hoveredProduct.alertQty || 5) ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                {hoveredProduct.stockQty <= 0 ? 'Out of Stock' : hoveredProduct.stockQty <= (hoveredProduct.alertQty || 5) ? 'Low Stock' : 'In Stock'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Pricing & Stock */}
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-800">
                                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Cost Price</span>
                                                            <span className="text-xs font-bold text-black dark:text-slate-100">PKR {hoveredProduct.costPrice?.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-800">
                                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Sale Price</span>
                                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">PKR {hoveredProduct.sellPrice?.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-800">
                                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Stock Avail</span>
                                                            <span className="text-xs font-bold text-black dark:text-slate-100">{hoveredProduct.stockQty} {hoveredProduct.unit}</span>
                                                        </div>
                                                    </div>

                                                    {/* Footer Info */}
                                                    <div className="flex justify-between items-center pt-2 text-[9px] font-bold uppercase tracking-wider">
                                                        <span className="text-slate-400 dark:text-slate-500">Brand: <span className="text-black dark:text-slate-300">{hoveredProduct.brand?.name || 'Local'}</span></span>
                                                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md truncate max-w-[100px]">{hoveredProduct.category?.name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {selectedProduct && !isProductListVisible && (
                                            <button
                                                onClick={() => {
                                                    const p = products.find(prod => prod.id === selectedProduct);
                                                    setDetailProduct(p);
                                                    setShowDetailModal(true);
                                                }}
                                                className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded bg-white/80 dark:bg-slate-800/80 shadow-sm border border-blue-100 dark:border-blue-900/50 z-10"
                                                title="View Detail"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-widest ml-1">Qty</label>
                                        <input
                                            ref={qtyRef}
                                            type="number"
                                            min="1"
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 dark:focus:border-blue-600 transition-all font-bold text-sm outline-none text-center text-slate-800 dark:text-slate-100"
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
                                        className="px-4 py-2 mt-auto bg-blue-950 dark:bg-blue-600 text-white rounded-lg font-bold hover:bg-slate-900 dark:hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Cart Table - Takes remaining height */}
                            <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0">
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left relative">
                                        <thead className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
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
                                                <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-50 dark:border-slate-800 last:border-0">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-black dark:text-slate-100 text-sm">{item.name}</div>
                                                        <div className="text-[10px] text-black dark:text-slate-400 font-bold uppercase tracking-tight">SKU: {item.sku || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-black dark:text-slate-200 text-xs">PKR {(item.unitCost || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="w-16 mx-auto px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-center font-bold text-xs text-black dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                                            {item.quantity}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-black dark:text-slate-100 text-sm">PKR {(item.total || 0).toLocaleString()}</td>
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
                                                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600">
                                                            <ShoppingCart size={24} />
                                                        </div>
                                                        <p className="text-[10px] font-bold text-black dark:text-slate-500 uppercase tracking-widest">Cart is empty</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Summary & Checkout */}
                        <div className="w-full lg:w-[380px] p-4 md:p-6 flex flex-col bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 shrink-0 overflow-y-auto">
                            <div className="space-y-5">

                                {/* Invoice Info */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Supplier Inv #</label>
                                        <input
                                            type="text"
                                            value={invoiceNo}
                                            onChange={(e) => setInvoiceNo(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 transition-all"
                                            placeholder="ex. INV-99"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Due Date</label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 transition-all picker:dark:invert"
                                        />
                                    </div>
                                </div>

                                {/* Financials Summary */}
                                <div className="bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-xl space-y-3 border border-slate-100 dark:border-slate-800 transition-colors">
                                    <div className="flex justify-between items-center text-xs font-bold text-black dark:text-slate-300 uppercase tracking-tight">
                                        <span>Subtotal</span>
                                        <span className="text-slate-800 dark:text-slate-100">PKR {(subtotal || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold text-black dark:text-slate-300 uppercase tracking-tight">
                                        <span>Shipping</span>
                                        <input
                                            type="number"
                                            className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-right font-bold text-black dark:text-slate-100 focus:border-blue-500 outline-none transition-all text-xs"
                                            value={shippingCost ?? ''}
                                            onChange={(e) => setShippingCost(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold text-black dark:text-slate-300 uppercase tracking-tight">
                                        <span>Tax</span>
                                        <div className="flex gap-1">
                                            <input
                                                type="number"
                                                className="w-12 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-right font-bold text-black dark:text-slate-100 focus:border-blue-500 outline-none transition-all text-xs"
                                                value={tax ?? ''}
                                                onChange={(e) => setTax(e.target.value)}
                                                placeholder="0"
                                            />
                                            <select value={taxType} onChange={e => setTaxType(e.target.value)} className="bg-slate-100 dark:bg-slate-700 text-black dark:text-slate-200 rounded text-[10px] font-bold px-1 outline-none">
                                                <option value="PERCENT">%</option>
                                                <option value="FLAT">Flat</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold text-black dark:text-slate-300 uppercase tracking-tight">
                                        <span>Discount</span>
                                        <div className="flex gap-1">
                                            <input
                                                type="number"
                                                className="w-12 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-right font-bold text-black dark:text-slate-100 focus:border-blue-500 outline-none transition-all text-xs"
                                                value={discount ?? ''}
                                                onChange={(e) => setDiscount(e.target.value)}
                                                placeholder="0"
                                            />
                                            <select value={discountType} onChange={e => setDiscountType(e.target.value)} className="bg-slate-100 dark:bg-slate-700 text-black dark:text-slate-200 rounded text-[10px] font-bold px-1 outline-none">
                                                <option value="FLAT">Flat</option>
                                                <option value="PERCENT">%</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold text-black dark:text-slate-300 uppercase tracking-tight">
                                        <span>Previous Balance</span>
                                        <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-black dark:text-slate-200">{(previousBalance || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-[0.2em] block">Grand Total</span>
                                        <span className="text-xl font-bold text-black dark:text-slate-100 tracking-tighter">
                                            PKR {(grandTotal || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Payment */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[9px] font-bold text-black dark:text-slate-400 uppercase tracking-widest">Payment Method</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[10px] font-bold uppercase focus:outline-none cursor-pointer text-black dark:text-slate-100 transition-all"
                                        >
                                            <option value="CASH">CASH</option>
                                            <option value="BANK_TRANSFER">BANK TRANSFER</option>
                                            <option value="CHEQUE">CHEQUE</option>
                                        </select>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label className="text-[9px] font-bold text-black dark:text-slate-400 uppercase tracking-widest">Amount Paid</label>
                                        <input
                                            type="number"
                                            className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-right font-bold text-sm text-black dark:text-slate-100 outline-none focus:border-blue-500 transition-all"
                                            value={paidAmount ?? ''}
                                            onChange={(e) => setPaidAmount(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <label className="text-[9px] font-bold text-black dark:text-slate-400 uppercase tracking-widest">Balance Due</label>
                                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 px-2 py-0.5 bg-rose-50 dark:bg-rose-900/20 rounded">PKR {(balanceDue || 0).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-black dark:text-slate-400 uppercase tracking-widest ml-1">Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-black dark:text-slate-200 outline-none focus:border-blue-500 transition-all resize-none h-16"
                                        placeholder="Details..."
                                    />
                                </div>
                            </div>

                            <div className="mt-auto pt-4">
                                <button
                                    onClick={handleSave}
                                    disabled={cart.length === 0}
                                    className="w-full py-3 bg-blue-950 dark:bg-blue-600 text-white rounded-xl font-bold text-base hover:bg-slate-900 dark:hover:bg-blue-700 shadow-md shadow-blue-100 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <span>Processing...</span>
                                    ) : (
                                        <>
                                            <Receipt size={18} />
                                            <span>Save now</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div >
            )}

            {/* Product Detail Modal */}
            {
                showDetailModal && detailProduct && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 transition-all">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <Package size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-black dark:text-slate-100">{detailProduct.name}</h3>
                                            <p className="text-[10px] text-black dark:text-slate-400 font-bold uppercase tracking-widest">Product Details</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowDetailModal(false)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 transition-all">
                                            <p className="text-[9px] font-bold text-black dark:text-slate-400 uppercase tracking-widest mb-1">Cost Price</p>
                                            <p className="text-sm font-bold text-black dark:text-slate-100">PKR {detailProduct.costPrice?.toLocaleString() || 0}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 transition-all">
                                            <p className="text-[9px] font-bold text-black dark:text-slate-400 uppercase tracking-widest mb-1">Sale Price</p>
                                            <p className="text-sm font-bold text-black dark:text-slate-100">PKR {detailProduct.sellPrice?.toLocaleString() || 0}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 transition-all">
                                            <p className="text-[9px] font-bold text-black dark:text-slate-400 uppercase tracking-widest mb-1">Current Stock</p>
                                            <p className="text-sm font-bold text-black dark:text-slate-100">{detailProduct.stockQty} {detailProduct.unit || 'pcs'}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 transition-all">
                                            <p className="text-[9px] font-bold text-black dark:text-slate-400 uppercase tracking-widest mb-1">SKU / Code</p>
                                            <p className="text-sm font-bold text-black dark:text-slate-100">{detailProduct.code || detailProduct.sku || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[9px] font-bold text-blue-400 dark:text-blue-500 uppercase tracking-widest">Secondary Details</p>
                                            <div className="flex justify-between text-xs py-1 border-b border-blue-100/30 dark:border-blue-900/20">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">Category</span>
                                                <span className="text-slate-700 dark:text-slate-200 font-bold">{detailProduct.category?.name || 'Uncategorized'}</span>
                                            </div>
                                            <div className="flex justify-between text-xs py-1 border-b border-blue-100/30 dark:border-blue-900/20">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">Brand</span>
                                                <span className="text-slate-700 dark:text-slate-200 font-bold">{detailProduct.brand?.name || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between text-xs py-1">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">Alert Threshold</span>
                                                <span className="text-slate-700 dark:text-slate-200 font-bold">{detailProduct.alertThreshold || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="w-full mt-6 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-blue-700 transition-all active:scale-[0.98]"
                                >
                                    CLOSE DETAIL
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Quick Add Product Modal */}
            {isQuickProductModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] transition-all">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <Plus size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-black dark:text-slate-100">Add New</h3>
                                </div>
                            </div>
                            <button onClick={() => setIsQuickProductModalOpen(false)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/20 dark:bg-slate-900/20">
                            <form onSubmit={handleQuickProductSave} className="space-y-6">
                                {/* Core Details */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-4 h-[1px] bg-slate-200 dark:bg-slate-800" /> Primary Information
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <Box size={12} className="text-black dark:text-slate-400" /> Name *
                                            </label>
                                            <input required type="text" className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 dark:focus:border-blue-600 dark:focus:ring-blue-900/20 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={quickProductForm.name} onChange={e => setQuickProductForm({ ...quickProductForm, name: e.target.value })} placeholder="Name" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <Tag size={12} className="text-black dark:text-slate-400" /> SKU-Number
                                            </label>
                                            <input type="text" className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={quickProductForm.sku} onChange={e => setQuickProductForm({ ...quickProductForm, sku: e.target.value })} placeholder="SKU-Number" />
                                        </div>

                                        <CreatableSelect
                                            label="Category"
                                            icon={Layers}
                                            options={categories}
                                            value={quickProductForm.category_name}
                                            onChange={(val) => setQuickProductForm({ ...quickProductForm, category_name: val })}
                                            placeholder="Select or type category"
                                        />
                                        <CreatableSelect
                                            label="Brand"
                                            icon={Tag}
                                            options={brands}
                                            value={quickProductForm.brand_name}
                                            onChange={(val) => setQuickProductForm({ ...quickProductForm, brand_name: val })}
                                            placeholder="Select or type brand"
                                        />

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <Box size={12} className="text-black dark:text-slate-400" /> Unit
                                            </label>
                                            <select className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none cursor-pointer text-black dark:text-slate-100 transition-all" value={quickProductForm.unit} onChange={e => setQuickProductForm({ ...quickProductForm, unit: e.target.value })}>
                                                <option value="pcs">Pieces (pcs)</option>
                                                <option value="kg">Kilogram (kg)</option>
                                                <option value="ltr">Liter (ltr)</option>
                                                <option value="box">Box</option>
                                                <option value="pkt">Packet</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Inventory & Pricing */}
                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-4 h-[1px] bg-slate-200 dark:bg-slate-800" /> Pricing & Stock
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <DollarSign size={12} className="text-black dark:text-slate-400" /> Cost *
                                            </label>
                                            <input required type="number" className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={quickProductForm.cost_price} onChange={e => setQuickProductForm({ ...quickProductForm, cost_price: e.target.value })} placeholder="0" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <DollarSign size={12} className="text-black dark:text-slate-400" /> Sale *
                                            </label>
                                            <input required type="number" className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={quickProductForm.sell_price} onChange={e => setQuickProductForm({ ...quickProductForm, sell_price: e.target.value })} placeholder="0" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <AlertTriangle size={12} className="text-black dark:text-slate-400" /> Alert
                                            </label>
                                            <input type="number" className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={quickProductForm.alert_qty} onChange={e => setQuickProductForm({ ...quickProductForm, alert_qty: e.target.value })} placeholder="5" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <Box size={12} className="text-black dark:text-slate-400" /> Stock *
                                            </label>
                                            <input required type="number" className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={quickProductForm.stock_qty} onChange={e => setQuickProductForm({ ...quickProductForm, stock_qty: e.target.value })} placeholder="0" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <Clock size={12} className="text-black dark:text-slate-400" /> Expiry
                                            </label>
                                            <input type="date" className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-all text-black dark:text-slate-100 picker:dark:invert" value={quickProductForm.expiry_date} onChange={e => setQuickProductForm({ ...quickProductForm, expiry_date: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                {/* Optional Section Toggle */}
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowQuickOptional(!showQuickOptional)}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest transition-all"
                                    >
                                        {showQuickOptional ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        {showQuickOptional ? 'Hide Additional Specs' : 'Add More Attributes (Color, Size...)'}
                                    </button>
                                </div>

                                {showQuickOptional && (
                                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest ml-1">Color</label>
                                                <input type="text" className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={quickProductForm.color} onChange={e => setQuickProductForm({ ...quickProductForm, color: e.target.value })} placeholder="e.g. Natural Titanium" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest ml-1">Size</label>
                                                <input type="text" className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={quickProductForm.size} onChange={e => setQuickProductForm({ ...quickProductForm, size: e.target.value })} placeholder="e.g. 256GB" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest ml-1">Grade / Quality</label>
                                                <input type="text" className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={quickProductForm.grade} onChange={e => setQuickProductForm({ ...quickProductForm, grade: e.target.value })} placeholder="e.g. A+" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest ml-1">Condition</label>
                                                <input type="text" className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={quickProductForm.condition} onChange={e => setQuickProductForm({ ...quickProductForm, condition: e.target.value })} placeholder="e.g. A+, New, Used" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest ml-1">Weight (kg)</label>
                                                <input type="number" step="0.01" className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={quickProductForm.weight} onChange={e => setQuickProductForm({ ...quickProductForm, weight: e.target.value })} placeholder="0.00" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                            <textarea className="w-full px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm outline-none min-h-[100px] resize-none focus:border-blue-500 dark:focus:border-blue-600 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={quickProductForm.description} onChange={e => setQuickProductForm({ ...quickProductForm, description: e.target.value })} placeholder="Technical specifications or notes..." />
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsQuickProductModalOpen(false)}
                                    className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleQuickProductSave}
                                    disabled={saving}
                                    className="px-8 py-3 bg-blue-950 dark:bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-slate-900 dark:hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100 dark:shadow-none flex items-center justify-center gap-2 min-w-[200px]"
                                >
                                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={18} />}
                                    <span>{saving ? 'Saving...' : 'Save now'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isDetailModalOpen && selectedPurchaseDetail && (
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-[100] bg-white dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                    {/* Header */}
                    <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Eye size={22} />
                            </div>
                            <div>
                                <h2 className="text-sm md:text-xl font-bold text-black dark:text-slate-100 tracking-tight uppercase">Purchase Detail: {selectedPurchaseDetail.invoiceNo || `PO-${selectedPurchaseDetail.id.toString().slice(-6)}`}</h2>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsDetailModalOpen(false)}
                            className="p-3 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100 dark:hover:border-rose-900"
                        >
                            <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block text-slate-400 dark:text-slate-500">Close</span>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-800/20 p-4 md:p-8">
                        <div className="max-w-7xl mx-auto space-y-8">
                            {/* Purchase Overview Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Date & Time</p>
                                        <h3 className="text-sm font-bold text-black dark:text-slate-100">{new Date(selectedPurchaseDetail.date).toLocaleString()}</h3>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Supplier</p>
                                        <h3 className="text-sm font-bold text-black dark:text-slate-100">{selectedPurchaseDetail.vendor?.name || 'N/A'}</h3>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                        <CreditCard size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Payment Method</p>
                                        <h3 className="text-sm font-bold text-black dark:text-slate-100">{selectedPurchaseDetail.paymentMethod || 'CASH'}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Totals Section */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-xs font-bold text-black dark:text-slate-400 uppercase tracking-[0.2em]">Financial Summary</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Subtotal</p>
                                        <p className="text-lg font-bold text-black dark:text-slate-100">PKR {selectedPurchaseDetail.subTotal?.toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tax/Charges</p>
                                        <p className="text-lg font-bold text-black dark:text-slate-100">PKR {((selectedPurchaseDetail.tax || 0) + (selectedPurchaseDetail.shippingCost || 0)).toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1 text-center md:text-left">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Total Amount</p>
                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">PKR {selectedPurchaseDetail.totalAmount?.toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Amount Paid</p>
                                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">PKR {(selectedPurchaseDetail.paidAmount || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                {selectedPurchaseDetail.notes && (
                                    <div className="px-8 pb-8 pt-2">
                                        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Notes</p>
                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 italic">"{selectedPurchaseDetail.notes}"</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Item Details Heading */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                                <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Items Details ({selectedPurchaseDetail.items?.length})</h3>
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                            </div>

                            {/* Items Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
                                {selectedPurchaseDetail.items?.map((item, idx) => {
                                    // Find full product info from state to show all details
                                    const fullProduct = products.find(p => p.id === (item.productId || item.product_id || item.product?.id));
                                    const displayProduct = fullProduct || item.product || item;

                                    return (
                                        <div key={idx} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl p-6 relative group overflow-hidden transition-all hover:scale-[1.02]">
                                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50 dark:border-slate-800">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <Package size={24} />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="font-bold text-base text-black dark:text-slate-100 uppercase tracking-tight truncate">{displayProduct.name || item.name}</div>
                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">SKU: {displayProduct.sku || item.sku || 'N/A'}</div>
                                                </div>
                                                <div className="ml-auto text-right">
                                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block uppercase">Qty</span>
                                                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{item.quantity}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {/* Attributes Grid */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Color</p>
                                                        <p className="text-sm font-bold text-black dark:text-slate-200 uppercase">{displayProduct.color || '-'}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Size</p>
                                                        <p className="text-sm font-bold text-black dark:text-slate-200 uppercase">{displayProduct.size || '-'}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Grade</p>
                                                        <p className="text-sm font-bold text-black dark:text-slate-200 uppercase">{displayProduct.grade || '-'}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Category</p>
                                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase truncate">{displayProduct.category?.name || 'Local'}</p>
                                                    </div>
                                                </div>

                                                {/* Pricing & Total */}
                                                <div className="space-y-2 p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                                                    <div className="flex justify-between items-center py-1">
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Unit Price</span>
                                                        <span className="text-xs font-bold text-black dark:text-slate-200">PKR {Number(item.price || item.unitCost || item.unit_cost || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="h-px bg-slate-200/50 dark:bg-slate-700/50"></div>
                                                    <div className="flex justify-between items-center py-2">
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Item Total</span>
                                                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tracking-tight">PKR {Number(item.total || 0).toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                {/* Brand Footer */}
                                                <div className="flex justify-center pt-2">
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">BRAND: <span className="text-black dark:text-slate-200">{displayProduct.brand?.name || 'GENERAL'}</span></span>
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
        </div >
    );
};

export default Purchase;
