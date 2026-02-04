import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Plus, Search, X, ShoppingCart,
    Trash2, Package, User, Printer
} from 'lucide-react';
import { canCreate, canDelete } from '../utils/permissions';

const Sales = ({ currentUser }) => {
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [editingId, setEditingId] = useState(null);
    // New Sale Cart State
    const [cart, setCart] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [discount, setDiscount] = useState('');
    const [discountType, setDiscountType] = useState('FLAT'); // 'FLAT' or 'PERCENT'
    const [tax, setTax] = useState('');
    const [taxType, setTaxType] = useState('PERCENT'); // 'FLAT' or 'PERCENT'
    const [shippingCost, setShippingCost] = useState('');
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [notes, setNotes] = useState('');
    const [previousBalance, setPreviousBalance] = useState(0);
    const [returnChange, setReturnChange] = useState(true);
    const [productSearch, setProductSearch] = useState('');
    const [isProductListVisible, setIsProductListVisible] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    // Printing State
    const [printReceiptData, setPrintReceiptData] = useState(null);

    // Refs for keyboard navigation
    const customerRef = useRef(null);
    const productRef = useRef(null);
    const qtyRef = useRef(null);
    const addBtnRef = useRef(null);

    const fetchData = useCallback(async () => {
        if (currentUser?.company_id) {
            setLoading(true);
            try {
                const fetchedSales = await window.electronAPI.getSales(currentUser.company_id);
                const fetchedProducts = await window.electronAPI.getProducts(currentUser.company_id);
                const fetchedCustomers = await window.electronAPI.getCustomers(currentUser.company_id);

                setSales(Array.isArray(fetchedSales) ? fetchedSales : []);
                setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);
                setCustomers(Array.isArray(fetchedCustomers) ? fetchedCustomers : []);

                if (fetchedSales?.success === false) console.error("Sales Error:", fetchedSales.message);
                if (fetchedProducts?.success === false) console.error("Product Error:", fetchedProducts.message);
                if (fetchedCustomers?.success === false) console.error("Customer Error:", fetchedCustomers.message);

            } catch (err) {
                console.error('Error in fetchData:', err);
                setSales([]);
                setProducts([]);
                setCustomers([]);
            }
            setLoading(false);
        }
    }, [currentUser?.company_id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-focus customer field when modal opens
    useEffect(() => {
        if (isModalOpen) {
            setTimeout(() => {
                customerRef.current?.focus();
            }, 100);
        }
    }, [isModalOpen]);

    // Cart Logic
    const addToCart = () => {
        if (!selectedProduct) return;
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return;

        if (product.stockQty < qty) {
            alert(`Insufficient Stock! Available: ${product.stockQty}`);
            return;
        }

        const existingItem = cart.find(item => item.productId === product.id);
        if (existingItem) {
            setCart(cart.map(item => item.productId === product.id ? {
                ...item,
                quantity: item.quantity + parseInt(qty),
                total: (item.quantity + parseInt(qty)) * product.sellPrice
            } : item));
        } else {
            setCart([...cart, {
                productId: product.id,
                name: product.name,
                price: product.sellPrice,
                quantity: parseInt(qty),
                total: parseInt(qty) * product.sellPrice
            }]);
        }
        setQty(1);
        setSelectedProduct('');
        setProductSearch('');

        // After adding, focus back to product search for next item
        setTimeout(() => {
            productRef.current?.focus();
        }, 50);
    };

    const filteredProducts = useMemo(() => {
        if (!productSearch) return products;
        return products.filter(p =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.sku?.toLowerCase().includes(productSearch.toLowerCase())
        );
    }, [products, productSearch]);

    const handleProductSelect = (product) => {
        setSelectedProduct(product.id);
        setProductSearch(product.name);
        setIsProductListVisible(false);
        setTimeout(() => {
            qtyRef.current?.focus();
        }, 50);
    };

    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            // For selects, we allow the default browser behavior (closing the list)
            // but jump focus after a tiny delay to satisfy the "1 enter" rule.
            setTimeout(() => {
                nextRef.current?.focus();
            }, 50);
        }
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    const subTotal = cart.reduce((sum, item) => sum + item.total, 0);

    const discountValue = discountType === 'PERCENT' ? (subTotal * (Number(discount) || 0)) / 100 : (Number(discount) || 0);
    const taxValue = taxType === 'PERCENT' ? (subTotal * (Number(tax) || 0)) / 100 : (Number(tax) || 0);

    const grandTotal = subTotal + (Number(shippingCost) || 0) + taxValue - discountValue + (Number(previousBalance) || 0);
    const netBalance = returnChange ? Math.max(0, grandTotal - (Number(amountPaid) || 0)) : grandTotal - (Number(amountPaid) || 0);
    const changeAmount = Math.max(0, (Number(amountPaid) || 0) - grandTotal);
    const effectivePaidAmount = returnChange && (Number(amountPaid) || 0) > grandTotal ? grandTotal : (Number(amountPaid) || 0);
    const paymentStatus = effectivePaidAmount >= grandTotal ? 'PAID' : (effectivePaidAmount > 0 ? 'PARTIAL' : 'DUE');

    const handleEdit = (sale) => {
        setEditingId(sale.id);
        setSelectedCustomer(sale.customerId || '');

        // Reconstruct Cart
        const loadedCart = (sale.items || []).map(item => ({
            productId: item.productId || item.product?.id,
            name: item.product?.name || item.name || 'Unknown Item',
            sku: item.product?.sku,
            price: item.price || item.unitPrice,
            quantity: item.quantity,
            total: (item.price || item.unitPrice) * item.quantity
        }));
        setCart(loadedCart);

        setDiscount(sale.discount || 0);
        setDiscountType('FLAT');
        setTax(sale.tax || 0);
        setTaxType('FLAT');
        setShippingCost(sale.shippingCost || 0);
        setAmountPaid(sale.paidAmount || 0);
        setPaymentMethod(sale.paymentMethod || 'CASH');
        setNotes(sale.notes || '');

        const cust = customers.find(c => c.id === sale.customerId);
        setPreviousBalance(cust?.balance || 0);

        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setCart([]);
        setDiscount('');
        setDiscountType('FLAT');
        setTax('');
        setTaxType('PERCENT');
        setShippingCost('');
        setAmountPaid('');
        setPaymentMethod('CASH');
        setNotes('');
        setSelectedCustomer('');
        setPreviousBalance(0);
        setReturnChange(true);
        setProductSearch('');
    };



    // Print Handler
    const handlePrint = (saleData) => {
        setPrintReceiptData(saleData);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const handleSaveSale = async () => {
        if (cart.length === 0) return alert("Please add items to cart!");

        // Credit Limit Check
        const cust = customers.find(c => c.id === selectedCustomer);
        if (cust && cust.creditLimit > 0 && netBalance > cust.creditLimit) {
            const proceed = window.confirm(`Credit Limit Exceeded! \nLimit: PKR ${cust.creditLimit.toLocaleString()} \nNew Balance: PKR ${netBalance.toLocaleString()} \nDo you still want to proceed?`);
            if (!proceed) return;
        }

        setSaving(true);

        try {
            const saleData = {
                id: editingId,
                companyId: currentUser.company_id,
                customerId: selectedCustomer || null,
                userId: currentUser.id,
                invoiceNo: editingId ? (sales.find(s => s.id === editingId)?.invoiceNo) : `INV-${Date.now().toString().slice(-6)}`,
                subTotal,
                discount: discountValue,
                tax: taxValue,
                totalAmount: grandTotal - (Number(previousBalance) || 0),
                grandTotal: grandTotal - (Number(previousBalance) || 0),
                shippingCost: parseFloat(shippingCost),
                paidAmount: parseFloat(effectivePaidAmount),
                amountPaid: parseFloat(effectivePaidAmount),
                amount_paid: parseFloat(effectivePaidAmount),
                actual_received: parseFloat(amountPaid),
                paymentMethod,
                paymentStatus,
                notes,
                items: cart,
                customerName: cust?.name || 'Walk-in Customer',
                date: new Date(),
                prevBalance: Number(previousBalance) || 0
            };

            const result = editingId
                ? await window.electronAPI.updateSale(saleData)
                : await window.electronAPI.addSale(saleData);

            if (result.success) {
                handlePrint(saleData);
                setIsModalOpen(false);
                resetForm();
                fetchData();
            } else {
                alert("Error: " + result.message);
            }
        } catch (error) {
            console.error("Sale Error:", error);
            alert("An unexpected error occurred.");
        } finally {
            setSaving(false);
        }
    };

    const filteredSales = sales.filter(s =>
        s.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.customer?.name || 'Walk-in Customer').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDeleteSale = async (id) => {
        if (!window.confirm("Are you sure you want to delete this sale? This will restore stock and reverse any customer balance changes.")) return;
        try {
            const result = await window.electronAPI.deleteSale(id);
            if (result.success) {
                fetchData();
            } else {
                alert("Error: " + result.message);
            }
        } catch (error) {
            console.error("Delete Error:", error);
            alert("An unexpected error occurred.");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">


            {/* Sales Table Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/20">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                            placeholder="Find invoice..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canCreate('sales') && (
                        <button
                            onClick={() => { resetForm(); setIsModalOpen(true); }}
                            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all active:scale-95 shadow-sm shadow-blue-200"
                        >
                            <Plus size={18} />
                            <span>Create New Sale</span>
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Invoice Details</th>
                                <th className="px-6 py-4">Customer info</th>
                                <th className="px-6 py-4">Items</th>
                                <th className="px-6 py-4">Grand Total</th>
                                <th className="px-6 py-4">Method / Paid</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredSales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-slate-50/50 transition-all group border-b border-slate-50 last:border-0">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors uppercase">{sale.invoiceNo}</div>
                                        <div className="text-[10px] text-slate-400 font-bold mt-1">{new Date(sale.date).toLocaleString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-800">
                                        {sale.customer?.name || 'Walk-in Customer'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase">
                                            {sale.items?.length || 0} Items
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-sm text-slate-800">PKR {(sale.totalAmount || sale.grandTotal)?.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{sale.paymentMethod || 'CASH'}</span>
                                            <span className="text-xs font-bold text-slate-800">PKR {(sale.paidAmount || sale.amountPaid || 0).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${sale.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            sale.paymentStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${sale.paymentStatus === 'PAID' ? 'bg-emerald-500' :
                                                sale.paymentStatus === 'PARTIAL' ? 'bg-amber-500' :
                                                    'bg-rose-500'
                                                }`}></span>
                                            <span>{sale.paymentStatus || 'PAID'}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handlePrint(sale)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Print Receipt"
                                            >
                                                <Printer size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(sale)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Edit Sale"
                                            >
                                                <div className="w-4 h-4">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                                </div>
                                            </button>
                                            {canDelete('sales') && (
                                                <button
                                                    onClick={() => handleDeleteSale(sale.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredSales.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center">
                                        <ShoppingCart size={48} className="mx-auto text-gray-100 mb-4" />
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No sales recorded yet</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Professional POS Modal */}
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
                                    <h2 className="text-sm md:text-lg font-bold text-slate-800 tracking-tight">Terminal POS</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Operator: {currentUser?.fullname || 'Counter 1'}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-slate-50/30">
                            {/* Left: Product Selection */}
                            <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 border-b lg:border-b-0 lg:border-r border-slate-200">
                                <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end mb-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Customer</label>
                                        <div className="relative">
                                            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <select
                                                ref={customerRef}
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-sm outline-none appearance-none cursor-pointer"
                                                value={selectedCustomer}
                                                onChange={(e) => {
                                                    const cid = e.target.value;
                                                    setSelectedCustomer(cid);
                                                    const cust = customers.find(c => c.id === cid);
                                                    setPreviousBalance(cust?.balance || 0);
                                                }}
                                                onKeyDown={(e) => handleKeyDown(e, productRef)}
                                                onFocus={(e) => {
                                                    try { e.target.showPicker(); } catch (err) { }
                                                }}
                                            >
                                                <option value="">Walk-in Customer</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Search Product</label>
                                        <div className="relative">
                                            <Package size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                ref={productRef}
                                                type="text"
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-sm outline-none"
                                                placeholder="Type to search product..."
                                                value={productSearch}
                                                onChange={(e) => {
                                                    setProductSearch(e.target.value);
                                                    setIsProductListVisible(true);
                                                    setHighlightedIndex(0);
                                                }}
                                                onFocus={() => setIsProductListVisible(true)}
                                                onBlur={() => {
                                                    // Delay blur to allow clicking on the list
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
                                                        } else {
                                                            handleKeyDown(e, qtyRef);
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
                                                            onClick={() => handleProductSelect(p)}
                                                        >
                                                            <div>
                                                                <div className="font-bold text-sm text-slate-800">{p.name}</div>
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">SKU: {p.sku || 'N/A'} - Stock: {p.stockQty}</div>
                                                            </div>
                                                            <div className="font-bold text-blue-600 text-sm">PKR {p.sellPrice}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
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
                                                    e.preventDefault();
                                                    addBtnRef.current?.focus();
                                                }
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <button
                                            ref={addBtnRef}
                                            onClick={addToCart}
                                            className="w-full py-2 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 shadow-sm shadow-blue-100 transition-all active:scale-95 text-sm disabled:opacity-50"
                                        >
                                            ADD TO CART
                                        </button>
                                    </div>
                                </div>

                                {/* Modern Cart Table */}
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                                    <table className="w-full text-left min-w-[600px]">
                                        <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-4">Product</th>
                                                <th className="px-6 py-4 text-center">Unit Price</th>
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
                                                    <td className="px-6 py-4 text-center font-bold text-slate-600 text-xs">PKR {item.price.toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="w-16 mx-auto px-2 py-1 bg-slate-100 rounded text-center font-bold text-xs text-slate-700 border border-slate-200">
                                                            {item.quantity}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-slate-800 text-sm">PKR {item.total.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => removeFromCart(item.productId)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg lg:opacity-0 group-hover:opacity-100 transition-all">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {cart.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-12 md:py-20 text-center">
                                                        <div className="w-12 md:w-16 h-12 md:h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                                                            <ShoppingCart size={24} className="text-slate-300" />
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cart is empty</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Right: Summary & Checkout */}
                            <div className="w-full lg:w-[400px] p-4 md:p-6 flex flex-col bg-white border-t lg:border-t-0 lg:border-l border-slate-200 shrink-0 overflow-y-auto">
                                <div className="space-y-4">
                                    <div className="space-y-3 px-1">
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
                                            <span>Subtotal</span>
                                            <span className="text-slate-800">PKR {subTotal.toLocaleString()}</span>
                                        </div>

                                        {/* Tax & Discount Row */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Tax</label>
                                                <div className="flex items-center gap-1">
                                                    <select
                                                        className="bg-white border border-slate-200 rounded px-1 py-1 text-[10px] outline-none"
                                                        value={taxType}
                                                        onChange={(e) => setTaxType(e.target.value)}
                                                    >
                                                        <option value="FLAT">Amt</option>
                                                        <option value="PERCENT">%</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-right font-bold text-slate-700 focus:border-blue-500 outline-none transition-all text-xs"
                                                        value={tax || ''}
                                                        placeholder="0"
                                                        onChange={(e) => setTax(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Discount</label>
                                                <div className="flex items-center gap-1">
                                                    <select
                                                        className="bg-white border border-slate-200 rounded px-1 py-1 text-[10px] outline-none"
                                                        value={discountType}
                                                        onChange={(e) => setDiscountType(e.target.value)}
                                                    >
                                                        <option value="FLAT">Amt</option>
                                                        <option value="PERCENT">%</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-right font-bold text-slate-700 focus:border-blue-500 outline-none transition-all text-xs"
                                                        value={discount || ''}
                                                        placeholder="0"
                                                        onChange={(e) => setDiscount(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
                                            <span>Shipping Cost</span>
                                            <div className="relative w-24">
                                                <input
                                                    type="number"
                                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-right font-bold text-slate-700 focus:border-blue-500 outline-none transition-all text-sm"
                                                    value={shippingCost || ''}
                                                    placeholder="0"
                                                    onChange={(e) => setShippingCost(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
                                            <span>Previous Balance</span>
                                            <div className="relative w-24 text-right px-2 py-1 bg-slate-100 rounded-md">
                                                <span className="text-sm font-bold text-slate-700">{Number(previousBalance).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-200 my-2 lg:my-4"></div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block">Grand Total</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xs font-bold text-slate-400 uppercase">PKR</span>
                                                    <span className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tighter">
                                                        {grandTotal.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Payment Method</label>
                                                    <select
                                                        value={paymentMethod}
                                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold uppercase focus:outline-none cursor-pointer"
                                                    >
                                                        <option value="CASH">CASH</option>
                                                        <option value="CARD">CARD</option>
                                                        <option value="TRANSFER">BANK / EASYPAISA</option>
                                                    </select>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cash Received</label>
                                                    <input
                                                        type="number"
                                                        className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-right font-bold text-sm text-slate-800 outline-none focus:border-blue-500"
                                                        value={amountPaid || ''}
                                                        placeholder="0"
                                                        onChange={(e) => setAmountPaid(e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                    <div className="flex flex-col">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Change Return</label>
                                                        {changeAmount > 0 && (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <button
                                                                    onClick={() => setReturnChange(true)}
                                                                    className={`px-2 py-0.5 rounded text-[8px] font-bold transition-all ${returnChange ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                                                                >
                                                                    RETURN
                                                                </button>
                                                                <button
                                                                    onClick={() => setReturnChange(false)}
                                                                    className={`px-2 py-0.5 rounded text-[8px] font-bold transition-all ${!returnChange ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                                                                >
                                                                    KEEP AS BAL
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={`text-xs font-bold ${returnChange ? 'text-slate-600' : 'text-slate-300 line-through'}`}>PKR {changeAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Net Balance</label>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${netBalance < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-800'}`}>
                                                        {netBalance < 0 ? `Credit: PKR ${Math.abs(netBalance).toLocaleString()}` : `PKR ${netBalance.toLocaleString()}`}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Order Notes</label>
                                                <textarea
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 transition-all resize-none h-16 lg:h-20"
                                                    placeholder="Delivery instructions..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 space-y-3">
                                    <button
                                        onClick={handleSaveSale}
                                        disabled={cart.length === 0}
                                        className="w-full py-3 md:py-4 bg-blue-950 text-white rounded-xl font-bold text-base md:text-lg hover:bg-slate-900 shadow-md shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Processing...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <ShoppingCart size={20} />
                                                <span>CHECKOUT</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Hidden Thermal Receipt Print Section */}
            <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999] print:p-0">
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        #receipt-print-section, #receipt-print-section * { visibility: visible; }
                        #receipt-print-section {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%; /* Adapts to page size (80mm/58mm) */
                            max-width: 80mm; /* Constraint for larger pages */
                            font-family: 'Courier New', Courier, monospace;
                            font-size: 11px;
                            color: #000;
                            padding: 0;
                            margin: 0;
                        }
                        .print-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                        .print-divider { border-bottom: 1px dashed #000; margin: 5px 0; }
                        .print-header { text-align: center; margin-bottom: 10px; }
                        .print-bold { font-weight: bold; }
                        .print-center { text-align: center; }
                    }
                `}</style>

                {printReceiptData && (
                    <div id="receipt-print-section">
                        {/* Header */}
                        <div className="print-header">
                            <div className="print-bold" style={{ fontSize: '14px' }}>BMS STORE</div>
                            <div>Gulshan-e-Iqbal, Karachi</div>
                            <div>Phone: 0312-3456789</div>
                        </div>

                        {/* Invoice Info */}
                        <div className="print-divider"></div>
                        <div className="print-row">
                            <span>Inv #: {printReceiptData.invoiceNo}</span>
                            <span>{new Date(printReceiptData.date || new Date()).toLocaleDateString()}</span>
                        </div>
                        <div className="print-row">
                            <span>Cust: {printReceiptData.customerName || ((printReceiptData.customer?.name) ? printReceiptData.customer.name : 'Walk-in')}</span>
                            <span>{new Date(printReceiptData.date || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sales;
