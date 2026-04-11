import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Plus, Search, X, ShoppingCart,
    Trash2, Package, User, Printer,
    Eye, Calendar, CreditCard, ChevronDown, ChevronUp, Clock, DollarSign, Tag, Layers, AlertTriangle, RefreshCcw
} from 'lucide-react';
import { canView, canCreate, canEdit, canDelete } from '../utils/permissions';
import { useDialog } from '../context/DialogContext';

const Sales = ({ currentUser }) => {
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
    const [selectedSaleDetailId, setSelectedSaleDetailId] = useState(null);
    const [saleDetailReturns, setSaleDetailReturns] = useState([]);
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
    const [price, setPrice] = useState('');
    const [returnChange, setReturnChange] = useState(true);
    const [productSearch, setProductSearch] = useState('');
    const [isProductListVisible, setIsProductListVisible] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [hoveredProduct, setHoveredProduct] = useState(null);
    const [companyInfo, setCompanyInfo] = useState(null);

    const { showAlert, showConfirm, showError } = useDialog();

    // Printing State
    const [printReceiptData, setPrintReceiptData] = useState(null);

    // Refs for keyboard navigation
    const customerRef = useRef(null);
    const productRef = useRef(null);
    const priceRef = useRef(null);
    const qtyRef = useRef(null);
    const addBtnRef = useRef(null);
    const productListRef = useRef(null);

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

                const fetchedCompany = await window.electronAPI.getCompany(currentUser.company_id);
                setCompanyInfo(fetchedCompany);

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

    // Cart Logic
    const addToCart = () => {
        if (!selectedProduct) return;
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return;

        if (product.stockQty < qty) {
            showAlert(`Insufficient Stock! Available: ${product.stockQty}`);
            return;
        }

        const currentPrice = parseFloat(price) || 0;
        const existingItem = cart.find(item => item.productId === product.id && item.price === currentPrice);
        if (existingItem) {
            setCart(cart.map(item => (item.productId === product.id && item.price === currentPrice) ? {
                ...item,
                quantity: item.quantity + parseInt(qty),
                total: (item.quantity + parseInt(qty)) * currentPrice,
                sku: product.sku
            } : item));
        } else {
            setCart([...cart, {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                price: currentPrice,
                quantity: parseInt(qty),
                total: parseInt(qty) * currentPrice
            }]);
        }
        setQty(1);
        setPrice('');
        setSelectedProduct('');
        setProductSearch('');

        // After adding, focus back to product search for next item
        setTimeout(() => {
            productRef.current?.focus();
        }, 50);
    };



    const handleProductSelect = (product) => {
        setSelectedProduct(product.id);
        setProductSearch(product.name);
        setPrice(product.sellPrice || '');
        setIsProductListVisible(false);
        setTimeout(() => {
            priceRef.current?.focus();
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

    // invoiceTotal = The actual total of the current sale items/costs
    const invoiceTotal = subTotal + (Number(shippingCost) || 0) + taxValue - discountValue;

    // grandTotal = For UI display of the invoice itself
    const grandTotal = invoiceTotal;

    // netBalance = Customer's final balance (Previous + This Sale - Paid)
    const netBalance = (Number(previousBalance) || 0) + invoiceTotal - (Number(amountPaid) || 0);

    // Change should only be offered if the payment exceeds BOTH the invoice and ANY previous debt
    const totalDue = invoiceTotal + (previousBalance > 0 ? previousBalance : 0);
    const changeAmount = Math.max(0, (Number(amountPaid) || 0) - totalDue);
    const effectivePaidAmount = returnChange && (Number(amountPaid) || 0) > totalDue ? totalDue : (Number(amountPaid) || 0);
    const paymentStatus = (Number(amountPaid) || 0) >= invoiceTotal ? 'PAID' : (Number(amountPaid) || 0) > 0 ? 'PARTIAL' : 'DUE';

    const handleEdit = (sale) => {
        resetForm();
        setEditingId(sale.id);
        const cid = sale.customerId || sale.customer_id || '';
        setSelectedCustomer(cid);

        // Reconstruct Cart
        const items = sale.items || [];
        const loadedCart = items.map(item => ({
            productId: item.productId || item.product_id || item.product?.id,
            name: item.product?.name || item.name || 'Unknown Item',
            sku: item.product?.sku || item.sku,
            price: item.price || item.unitPrice || item.unit_price || 0,
            quantity: item.quantity || 0,
            total: item.total || item.total_price || ((item.price || item.unitPrice || item.unit_price || 0) * (item.quantity || 0))
        }));
        setCart(loadedCart);

        setDiscount(sale.discount ?? 0);
        setDiscountType('FLAT');
        setTax(sale.tax ?? sale.tax_amount ?? 0);
        setTaxType('FLAT');
        setShippingCost(sale.shippingCost ?? sale.shipping_cost ?? 0);
        setAmountPaid(sale.paidAmount ?? sale.amountPaid ?? sale.amount_paid ?? 0);
        setPaymentMethod(sale.paymentMethod || sale.payment_method || 'CASH');
        setNotes(sale.notes || '');

        const cust = customers.find(c =>
            String(c.id) === String(cid) ||
            (c.global_id && String(c.global_id) === String(cid))
        );

        if (!cust || !cid) {
            setPreviousBalance(0);
        } else {
            const currentCustBalance = cust?.current_balance || cust?.balance || 0;
            const saleDue = (sale.total_amount || sale.totalAmount || sale.grandTotal || 0) - (sale.paid_amount || sale.paidAmount || sale.amountPaid || 0);
            // We want to show what the balance was BEFORE this sale edit session
            setPreviousBalance(currentCustBalance - saleDue);
        }

        setIsModalOpen(true);
    };

    const handleShowDetail = (sale) => {
        setSelectedSaleDetail(sale);
        setSelectedSaleDetailId(sale.id);
        setSaleDetailReturns([]);
        setIsDetailModalOpen(true);
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
        }, 500); // Increased delay to ensure React renders the print section
    };

    const handleSaveSale = async () => {
        if (cart.length === 0) return showAlert("Please add items to cart!");

        // Credit Limit Check
        const cust = customers.find(c => c.id === selectedCustomer);
        if (cust && cust.creditLimit > 0 && netBalance > cust.creditLimit) {
            showConfirm(`Credit Limit Exceeded! \nLimit: PKR ${cust?.creditLimit?.toLocaleString() || 0} \nNew Balance: PKR ${netBalance?.toLocaleString() || 0} \nDo you still want to proceed?`, async () => {
                await executeSaveSale();
            }, 'Credit Limit Warning');
            return;
        }

        await executeSaveSale();
    };

    const executeSaveSale = async () => {
        setSaving(true);
        const cust = customers.find(c => c.id === selectedCustomer);
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
                totalAmount: grandTotal,
                grandTotal: grandTotal,
                shippingCost: parseFloat(shippingCost || 0),
                paidAmount: parseFloat(effectivePaidAmount || 0),
                amountPaid: parseFloat(effectivePaidAmount || 0),
                amount_paid: parseFloat(effectivePaidAmount || 0),
                actual_received: parseFloat(amountPaid || 0),
                paymentMethod,
                paymentStatus,
                notes,
                items: cart,
                customerName: cust?.name || 'Walk-in Customer',
                date: new Date(),
                prevBalance: Number(previousBalance) || 0,
                returnChange: returnChange
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
                showError("Error: " + result.message);
            }
        } catch (error) {
            console.error("Sale Error:", error);
            showError("An unexpected error occurred.");
        } finally {
            setSaving(false);
        }
    };

    const filteredSales = useMemo(() => {
        return sales
            .filter(s =>
                s.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.customer?.name || 'Walk-in Customer').toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }, [sales, searchTerm]);

    // Always show LIVE sale data in the detail modal (auto-syncs when sales state updates after a return)
    const liveSaleDetail = useMemo(() => {
        if (!selectedSaleDetailId) return selectedSaleDetail;
        return sales.find(s => s.id === selectedSaleDetailId || String(s.global_id) === String(selectedSaleDetailId)) || selectedSaleDetail;
    }, [sales, selectedSaleDetailId, selectedSaleDetail]);

    // Re-fetch linked returns whenever the detail modal opens or the sales data refreshes
    useEffect(() => {
        if (!isDetailModalOpen || !liveSaleDetail || !currentUser?.company_id) return;
        window.electronAPI.getSaleReturns(currentUser.company_id)
            .then(allReturns => {
                const arr = Array.isArray(allReturns) ? allReturns : [];
                const sId = liveSaleDetail.global_id || String(liveSaleDetail.id);
                const linked = arr.filter(r =>
                    String(r.saleId) === sId ||
                    String(r.sale_id) === sId ||
                    String(r.saleId) === String(liveSaleDetail.id) ||
                    String(r.sale_id) === String(liveSaleDetail.id)
                );
                setSaleDetailReturns(linked);
            })
            .catch(() => setSaleDetailReturns([]));
    }, [isDetailModalOpen, liveSaleDetail, sales, currentUser?.company_id]);

    const handleDeleteSale = async (id) => {
        showConfirm("Are you sure you want to delete this sale? This will restore stock and reverse any customer balance changes.", async () => {
            try {
                const result = await window.electronAPI.deleteSale(id);
                if (result.success) {
                    fetchData();
                } else {
                    showError("Error: " + result.message);
                }
            } catch (error) {
                console.error("Delete Error:", error);
                showError("An unexpected error occurred.");
            }
        });
    };

    return (
        <div className="relative animate-in fade-in duration-500">



            {/* Sales Table Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/20 dark:bg-slate-800/20">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/5 transition-all font-semibold text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                            placeholder="Search sale here..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canCreate('sales') && (
                        <button
                            onClick={() => { resetForm(); setIsModalOpen(true); }}
                            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all active:scale-95 shadow-sm text-sm"
                        >
                            <Plus size={18} />
                            <span>Add sale</span>
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white tracking-tight">Invoice</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white tracking-tight">Customer</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white tracking-tight">Items</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white tracking-tight">Total</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white tracking-tight">Paid</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white tracking-tight">Status</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white tracking-tight text-right">Actions</th>
                        </tr>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredSales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group border-b border-slate-100 dark:border-slate-800 last:border-0 text-black dark:text-slate-100 font-semibold">
                                    <td className="px-6 py-4 text-sm font-semibold">
                                        <div className="text-black dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase">{sale.invoiceNo}</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">{sale.date ? new Date(sale.date).toLocaleString() : 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-200">
                                        {sale.customer?.name || 'Walk-in Customer'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold">
                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-sm font-semibold text-slate-600 dark:text-slate-400 tracking-tight">
                                            {sale.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0} items
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-200">PKR {(sale.totalAmount || sale.grandTotal)?.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm font-semibold">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-tight">{sale.paymentMethod || 'Cash'}</span>
                                            <span className="text-sm font-bold text-black dark:text-slate-200">PKR {(sale.paidAmount || sale.amountPaid || 0).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold">
                                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-sm font-semibold tracking-tight border capitalize ${(['PAID', 'RECEIVED', 'SUCCESS'].includes(sale.paymentStatus)) ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50' :
                                            sale.paymentStatus === 'PARTIAL' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50' :
                                                'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${(['PAID', 'RECEIVED', 'SUCCESS'].includes(sale.paymentStatus)) ? 'bg-emerald-500' :
                                                sale.paymentStatus === 'PARTIAL' ? 'bg-amber-500' :
                                                    'bg-rose-500'
                                                }`}></span>
                                            <span className="sentence-case">{sale.paymentStatus?.toLowerCase() || 'paid'}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {canView('sales') && (
                                                <button
                                                    onClick={() => handleShowDetail(sale)}
                                                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                                                    title="View detail"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            )}
                                            {canView('sales') && (
                                                <button
                                                    onClick={() => handlePrint(sale)}
                                                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                                                    title="Print receipt"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                            )}
                                            {canEdit('sales') && (
                                                <button
                                                    onClick={() => handleEdit(sale)}
                                                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                                                    title="Edit sale"
                                                >
                                                    <div className="w-4 h-4">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                                    </div>
                                                </button>
                                            )}
                                            {canDelete('sales') && (
                                                <button
                                                    onClick={() => handleDeleteSale(sale.id)}
                                                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
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
                                        <ShoppingCart size={48} className="mx-auto text-slate-100 dark:text-slate-800 mb-4" />
                                        <p className="text-slate-400 dark:text-slate-600 font-bold text-xs tracking-tight">No sales recorded yet</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isDetailModalOpen && liveSaleDetail && (
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-[100] bg-white dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                    {/* Header */}
                    <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Eye size={22} />
                            </div>
                            <div>
                                <h2 className="text-sm md:text-xl font-semibold text-black dark:text-slate-100 tracking-tight">Sale Detail: {liveSaleDetail.invoiceNo}</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight border ${(['PAID', 'RECEIVED', 'SUCCESS'].includes(liveSaleDetail.paymentStatus)) ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50' : liveSaleDetail.paymentStatus === 'PARTIAL' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${(['PAID', 'RECEIVED', 'SUCCESS'].includes(liveSaleDetail.paymentStatus)) ? 'bg-emerald-500' : liveSaleDetail.paymentStatus === 'PARTIAL' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                {liveSaleDetail.paymentStatus || 'DUE'}
                            </span>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="p-3 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100 dark:hover:border-rose-900"
                            >
                                <span className="text-sm font-semibold hidden md:block text-slate-400 dark:text-slate-500 tracking-tight">Close</span>
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-800/20 p-4 md:p-8">
                        <div className="max-w-7xl mx-auto space-y-8">
                            {/* Sale Overview Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-1">Date & time</p>
                                        <h3 className="text-sm font-medium text-black dark:text-slate-100">{new Date(liveSaleDetail.date).toLocaleString()}</h3>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-1">Customer</p>
                                        <h3 className="text-sm font-medium text-black dark:text-slate-100">{liveSaleDetail.customer?.name || 'Walk-in Customer'}</h3>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                        <CreditCard size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-1">Payment method</p>
                                        <h3 className="text-sm font-medium text-black dark:text-slate-100">{liveSaleDetail.paymentMethod || 'CASH'}</h3>
                                    </div>
                                </div>
                                <div className={`p-6 rounded-2xl border shadow-sm flex items-center gap-4 ${(['PAID', 'RECEIVED', 'SUCCESS'].includes(liveSaleDetail.paymentStatus)) ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/50' : liveSaleDetail.paymentStatus === 'PARTIAL' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/50' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50'}`}>
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${(['PAID', 'RECEIVED', 'SUCCESS'].includes(liveSaleDetail.paymentStatus)) ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600' : liveSaleDetail.paymentStatus === 'PARTIAL' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600'}`}>
                                        <DollarSign size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-1">Status (Live)</p>
                                        <h3 className={`text-sm font-bold tracking-tight ${(['PAID', 'RECEIVED', 'SUCCESS'].includes(liveSaleDetail.paymentStatus)) ? 'text-emerald-600 dark:text-emerald-400' : liveSaleDetail.paymentStatus === 'PARTIAL' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{liveSaleDetail.paymentStatus || 'DUE'}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Totals Section */}
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight">Financial summary</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Subtotal</p>
                                        <p className="text-lg font-semibold text-black dark:text-slate-100">PKR {liveSaleDetail.subTotal?.toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Discount</p>
                                        <p className="text-lg font-semibold text-rose-500">-PKR {liveSaleDetail.discount?.toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Grand total</p>
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">PKR {(liveSaleDetail.totalAmount || liveSaleDetail.grandTotal)?.toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Amount paid</p>
                                        <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">PKR {(liveSaleDetail.paidAmount || liveSaleDetail.amountPaid || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                {liveSaleDetail.notes && (
                                    <div className="px-8 pb-8 pt-2">
                                        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                            <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-2">Notes</p>
                                            <p className="text-sm font-medium text-black dark:text-slate-300 italic">"{liveSaleDetail.notes}"</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Returns Section */}
                            {saleDetailReturns.length > 0 && (
                                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-100 dark:border-rose-900/30 shadow-sm overflow-hidden">
                                    <div className="p-6 bg-rose-50/50 dark:bg-rose-900/10 border-b border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                                                <RefreshCcw size={20} />
                                            </div>
                                            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 tracking-tight">Sale Returns Linked</h3>
                                        </div>
                                        <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-lg text-xs font-bold tracking-tight uppercase">
                                            {saleDetailReturns.length} Returns
                                        </span>
                                    </div>
                                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {saleDetailReturns.map((ret, idx) => (
                                            <div key={idx} className="p-6 flex items-center justify-between group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-black dark:text-slate-100 tracking-tight">{ret.invoiceNo || ret.invoice_no}</p>
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                                                        <Calendar size={12} />
                                                        {new Date(ret.date || ret.createdAt).toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Return</p>
                                                    <p className="text-base font-bold text-rose-500 tracking-tight">PKR {(ret.totalAmount || ret.total_amount || 0).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-6 bg-rose-50/30 dark:bg-rose-900/20 flex items-center justify-between border-t border-rose-100 dark:border-rose-900/30">
                                        <span className="text-sm font-bold text-rose-600">Total Returned Amount</span>
                                        <span className="text-xl font-bold text-rose-600 tracking-tight">
                                            PKR {saleDetailReturns.reduce((sum, r) => sum + (r.totalAmount || r.total_amount || 0), 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Item Details Heading */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                                <h3 className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Items details ({liveSaleDetail.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0})</h3>
                                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                            </div>

                            {/* Items Grid with Detailed Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
                                {liveSaleDetail.items?.map((item, idx) => {
                                    const displayProduct = item.product || item;
                                    return (
                                        <div key={idx} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl p-6 relative group overflow-hidden transition-all hover:scale-[1.02]">
                                            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50 dark:border-slate-800">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                    <Package size={24} />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="font-semibold text-base text-black dark:text-slate-100 tracking-tight truncate">{displayProduct.name || item.name}</div>
                                                    <div className="text-sm text-black dark:text-slate-500 font-semibold tracking-tight">SKU: {displayProduct.sku || item.sku || 'N/A'}</div>
                                                </div>
                                                <div className="ml-auto text-right">
                                                    <span className="text-sm font-semibold text-black dark:text-slate-500 block tracking-tight">Qty</span>
                                                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{item.quantity}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {/* Attributes Grid */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-1">Color</p>
                                                        <p className="text-sm font-medium text-black dark:text-slate-200">{displayProduct.color || '-'}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-1">Size</p>
                                                        <p className="text-sm font-medium text-black dark:text-slate-200">{displayProduct.size || '-'}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-1">Grade</p>
                                                        <p className="text-sm font-medium text-black dark:text-slate-200">{displayProduct.grade || '-'}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-1">Category</p>
                                                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 truncate tracking-tight">{displayProduct.category?.name || 'Local'}</p>
                                                    </div>
                                                </div>

                                                {/* Pricing & Total */}
                                                <div className="space-y-2 p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                                                    <div className="flex justify-between items-center py-1">
                                                        <span className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Unit price</span>
                                                        <span className="text-sm font-medium text-black dark:text-slate-200">PKR {Number(item.price || item.unitPrice || item.unit_price || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="h-px bg-slate-200/50 dark:bg-slate-700/50"></div>
                                                    <div className="flex justify-between items-center py-2">
                                                        <span className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Item total</span>
                                                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-tight">PKR {Number(item.total || 0).toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                {/* Brand Footer */}
                                                <div className="flex justify-center pt-2">
                                                    <span className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Brand: <span className="text-black dark:text-slate-200 font-medium">{displayProduct.brand?.name || 'General'}</span></span>
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

            {isModalOpen && (
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-white dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                    {/* Full-Page Terminal Header */}
                    <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <ShoppingCart size={22} />
                            </div>
                            <div>
                                <h2 className="text-sm md:text-xl font-bold text-black dark:text-slate-100 tracking-tight">{editingId ? 'Edit sale' : 'Add sale'}</h2>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="p-3 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100 dark:hover:border-rose-900"
                        >
                            <span className="text-sm font-semibold hidden md:block text-slate-400 dark:text-slate-500 tracking-tight">Close</span>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-slate-50/30 dark:bg-slate-800/20">

                        {/* Left: Product Selection */}
                        <div className="flex-1 p-4 md:p-6 min-h-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col relative z-20">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-6">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-semibold text-black dark:text-slate-300 tracking-tight ml-1">Customer</label>
                                    <div className="relative">
                                        <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                        <select
                                            ref={customerRef}
                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-semibold text-sm outline-none appearance-none cursor-pointer text-black dark:text-slate-100"
                                            value={selectedCustomer}
                                            onChange={(e) => {
                                                const cid = e.target.value;
                                                setSelectedCustomer(cid);
                                                const cust = customers.find(c => String(c.id) === String(cid));
                                                let balance = cust?.current_balance || cust?.balance || 0;

                                                // If editing same customer, subtract this sale's impact
                                                if (editingId) {
                                                    const s = sales.find(sale => sale.id === editingId || sale.global_id === editingId);
                                                    if (s && String(s.customer_id) === String(cid)) {
                                                        const due = (s.total_amount || s.totalAmount || s.grandTotal || 0) - (s.paid_amount || s.paidAmount || s.amountPaid || 0);
                                                        balance -= due;
                                                    }
                                                }
                                                setPreviousBalance(balance);
                                            }}
                                            onKeyDown={(e) => handleKeyDown(e, productRef)}
                                            onFocus={(e) => {
                                                try { e.target.showPicker(); } catch (err) { }
                                            }}
                                        >
                                            <option value="">Walk-in Customer</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name} {c.balance > 0 ? `(Owes: ${c?.balance?.toLocaleString() || 0})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5 md:col-span-4">
                                    <label className="text-sm font-semibold text-black dark:text-slate-300 tracking-tight ml-1">Search product</label>
                                    <div className="relative">
                                        <Package size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                        <input
                                            ref={productRef}
                                            type="text"
                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100"
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
                                                        handleKeyDown(e, priceRef);
                                                    }
                                                } else if (e.key === 'Escape') {
                                                    setIsProductListVisible(false);
                                                }
                                            }}
                                        />
                                        {isProductListVisible && filteredProducts.length > 0 && (
                                            <div
                                                ref={productListRef}
                                                className="absolute z-[110] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar"
                                            >
                                                {filteredProducts.map((p, index) => (
                                                    <div
                                                        key={p.id}
                                                        className={`px-4 py-3 cursor-pointer flex justify-between items-center border-b border-slate-50 dark:border-slate-800 last:border-0 transition-all ${highlightedIndex === index ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                                        onMouseDown={(e) => { e.preventDefault(); handleProductSelect(p); }}
                                                        onMouseEnter={() => {
                                                            setHoveredProduct(p);
                                                            setHighlightedIndex(index);
                                                        }}
                                                        onMouseLeave={() => setHoveredProduct(null)}
                                                    >
                                                        <div>
                                                            <div className="font-semibold text-sm text-black dark:text-slate-100">{p.name}</div>
                                                            <div className="text-xs text-black dark:text-slate-400 font-semibold tracking-tight">SKU: {p.sku || 'N/A'} - Stock: {p.stockQty}</div>
                                                        </div>
                                                        <div className="font-semibold text-black dark:text-slate-200 text-sm">PKR {p.sellPrice}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {isProductListVisible && hoveredProduct && (
                                            <div className="absolute left-full ml-4 top-0 z-[1000] w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-5 border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-50 dark:border-slate-800">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                        <Package size={20} />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <div className="font-semibold text-sm text-black dark:text-slate-100 tracking-tight truncate">{hoveredProduct.name}</div>
                                                        <div className="text-sm text-black dark:text-slate-500 font-semibold tracking-tight">SKU: {hoveredProduct.sku || 'N/A'}</div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                            <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-0.5">Color</p>
                                                            <p className="text-sm font-medium text-black dark:text-slate-200">{hoveredProduct.color || '-'}</p>
                                                        </div>
                                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                            <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-0.5">Size</p>
                                                            <p className="text-sm font-medium text-black dark:text-slate-200">{hoveredProduct.size || '-'}</p>
                                                        </div>
                                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                            <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-0.5">Grade</p>
                                                            <p className="text-sm font-medium text-black dark:text-slate-200">{hoveredProduct.grade || '-'}</p>
                                                        </div>
                                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                            <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-0.5">Status</p>
                                                            <p className={`text-sm font-medium ${hoveredProduct.stockQty <= (hoveredProduct.alertQty || 5) ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                {hoveredProduct.stockQty <= 0 ? 'Out of Stock' : hoveredProduct.stockQty <= (hoveredProduct.alertQty || 5) ? 'Low Stock' : 'In Stock'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-800">
                                                            <span className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Sale price</span>
                                                            <span className="text-sm font-medium text-black dark:text-slate-100">PKR {hoveredProduct.sellPrice?.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-slate-800">
                                                            <span className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Stock avail</span>
                                                            <span className="text-sm font-medium text-black dark:text-slate-200">{hoveredProduct.stockQty} {hoveredProduct.unit}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-semibold text-black dark:text-slate-300 tracking-tight ml-1">Sell price</label>
                                    <input
                                        ref={priceRef}
                                        type="number"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-semibold text-sm outline-none text-center text-black dark:text-slate-100"
                                        value={price || ''}
                                        placeholder="0.00"
                                        onChange={(e) => setPrice(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                qtyRef.current?.focus();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-semibold text-black dark:text-slate-300 tracking-tight ml-1">Qty</label>
                                    <input
                                        ref={qtyRef}
                                        type="number"
                                        min="1"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-semibold text-sm outline-none text-center text-black dark:text-slate-100"
                                        value={qty || ''}
                                        placeholder="0"
                                        onChange={(e) => setQty(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addToCart();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <button
                                        ref={addBtnRef}
                                        onClick={addToCart}
                                        className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all active:scale-95 text-xs disabled:opacity-50 shadow-sm whitespace-nowrap"
                                    >
                                        Add to cart
                                    </button>
                                </div>
                            </div>

                            {/* Modern Cart Table */}
                            <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0 transition-colors duration-300">
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left min-w-[600px]">
                                        <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-sm font-semibold text-black dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                                            <tr>
                                                <th className="px-6 py-4">Name</th>
                                                <th className="px-6 py-4 text-center">Sell price</th>
                                                <th className="px-6 py-4 text-center">Qty</th>
                                                <th className="px-6 py-4 text-right">Total</th>
                                                <th className="px-6 py-4 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {cart.map((item, idx) => (
                                                <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-black dark:text-slate-100 text-sm">{item.name}</div>
                                                        <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">SKU: {item.sku || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <input
                                                            type="number"
                                                            className="w-24 px-2 py-1 mx-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold text-sm text-black dark:text-slate-200 outline-none focus:border-blue-500 transition-all"
                                                            value={item.price || 0}
                                                            onChange={(e) => {
                                                                const newPrice = parseFloat(e.target.value) || 0;
                                                                setCart(cart.map((c, i) => i === idx ? { ...c, price: newPrice, total: newPrice * c.quantity } : c));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <input
                                                            type="number"
                                                            className="w-16 px-2 py-1 mx-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold text-sm text-black dark:text-slate-200 outline-none focus:border-blue-500 transition-all"
                                                            value={item.quantity ?? 1}
                                                            onChange={(e) => {
                                                                const newQty = parseInt(e.target.value) || 0;
                                                                setCart(cart.map((c, i) => i === idx ? { ...c, quantity: newQty, total: c.price * newQty } : c));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-black dark:text-slate-200 text-sm">PKR {(item.total || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => removeFromCart(item.productId)}
                                                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {cart.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-12 md:py-20 text-center">
                                                        <div className="w-12 md:w-16 h-12 md:h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200 dark:border-slate-700">
                                                            <ShoppingCart size={24} className="text-slate-300 dark:text-slate-600" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Cart is empty</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Right: Summary & Checkout */}
                        <div className="w-full lg:w-[400px] p-4 md:p-6 flex flex-col bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 shrink-0 overflow-y-auto custom-scrollbar transition-colors duration-300 relative z-10">
                            <div className="space-y-4">
                                <div className="space-y-3 px-1">
                                    <div className="flex justify-between items-center text-sm font-semibold text-black dark:text-slate-400 tracking-tight">
                                        <span>Subtotal</span>
                                        <span className="text-black dark:text-slate-100 font-semibold">PKR {subTotal?.toLocaleString() || 0}</span>
                                    </div>

                                    {/* Tax & Discount Row */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Tax</label>
                                            <div className="flex items-center gap-1">
                                                <select
                                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-1 text-sm font-semibold outline-none text-black dark:text-slate-100"
                                                    value={taxType}
                                                    onChange={(e) => setTaxType(e.target.value)}
                                                >
                                                    <option value="FLAT">Amt</option>
                                                    <option value="PERCENT">%</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-right font-semibold text-black dark:text-slate-200 focus:border-blue-500 dark:focus:border-blue-600 outline-none transition-all text-sm"
                                                    value={tax ?? ''}
                                                    placeholder="0"
                                                    onChange={(e) => setTax(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Discount</label>
                                            <div className="flex items-center gap-1">
                                                <select
                                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-1 text-sm font-semibold outline-none text-black dark:text-slate-100"
                                                    value={discountType}
                                                    onChange={(e) => setDiscountType(e.target.value)}
                                                >
                                                    <option value="FLAT">Amt</option>
                                                    <option value="PERCENT">%</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-right font-semibold text-black dark:text-slate-200 focus:border-blue-500 dark:focus:border-blue-600 outline-none transition-all text-sm"
                                                    value={discount ?? ''}
                                                    placeholder="0"
                                                    onChange={(e) => setDiscount(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-sm font-semibold text-black dark:text-slate-400 tracking-tight">
                                        <span>Shipping Cost</span>
                                        <div className="relative w-24">
                                            <input
                                                type="number"
                                                className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-right font-semibold text-black dark:text-slate-200 focus:border-emerald-500 dark:focus:border-emerald-600 outline-none transition-all text-sm"
                                                value={shippingCost ?? ''}
                                                placeholder="0"
                                                onChange={(e) => setShippingCost(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-sm font-semibold text-black dark:text-slate-400 tracking-tight">
                                        <span>Previous Balance ({previousBalance >= 0 ? 'Owes You' : 'Credit'})</span>
                                        <div className="relative w-32 text-right px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
                                            <span className={`text-sm font-semibold ${previousBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                PKR {Math.abs(Number(previousBalance || 0)).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-2 lg:my-4"></div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-black dark:text-slate-500 block">Grand Total</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">PKR</span>
                                                <span className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tighter">
                                                    {grandTotal?.toLocaleString() || 0}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-800 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Payment method</label>
                                                <select
                                                    value={paymentMethod}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm font-semibold focus:outline-none cursor-pointer text-black dark:text-slate-200"
                                                >
                                                    <option value="CASH">Cash</option>
                                                    <option value="CARD">Card</option>
                                                    <option value="TRANSFER">Bank / Easypaisa</option>
                                                </select>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Received</label>
                                                <input
                                                    type="number"
                                                    className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-right font-semibold text-sm text-black dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600"
                                                    value={amountPaid ?? ''}
                                                    placeholder="0"
                                                    onChange={(e) => setAmountPaid(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <div className="flex flex-col">
                                                    <label className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Change return</label>
                                                    {changeAmount > 0 && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <button
                                                                onClick={() => setReturnChange(true)}
                                                                className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${returnChange ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                                                            >
                                                                Return
                                                            </button>
                                                            <button
                                                                onClick={() => setReturnChange(false)}
                                                                className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${!returnChange ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                                                            >
                                                                Keep as bal
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`text-sm font-semibold ${returnChange ? 'text-black dark:text-slate-400' : 'text-slate-300 dark:text-slate-700 line-through'}`}>PKR {(changeAmount || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                                                <label className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Net balance</label>
                                                <span className={`text-sm font-semibold px-2 py-0.5 rounded ${netBalance < 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-200'}`}>
                                                    {netBalance < 0 ? `Credit: PKR ${Math.abs(netBalance || 0).toLocaleString()}` : `PKR ${(netBalance || 0).toLocaleString()}`}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight ml-1">Notes</label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium outline-none focus:border-emerald-500 dark:focus:border-emerald-600 text-black dark:text-slate-200 transition-all resize-none h-16 lg:h-20"
                                                placeholder="Details..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 space-y-3">
                                <button
                                    onClick={handleSaveSale}
                                    disabled={cart.length === 0}
                                    className="w-full py-3 md:py-4 bg-emerald-600 text-white rounded-xl font-semibold text-base md:text-lg hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Saving...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <ShoppingCart size={20} />
                                            <span>Save now</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Thermal Receipt Print Section */}
            <div className="print-container">
                <style>{`
                    .print-container { display: none; }
                    @media print {
                        @page { 
                            size: A4 portrait; 
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            visibility: hidden !important;
                        }
                        .print-container, .print-container * {
                            visibility: visible !important;
                        }
                        .print-container {
                            display: block !important;
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 210mm !important;
                            min-height: 297mm !important;
                            padding: 15mm 10mm !important;
                            background: #fff !important;
                            z-index: 9999999 !important;
                        }
                        .inv-wrap { width: 100%; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; background: #fff; }
                        .inv-header { text-align: center; padding-bottom: 12px; border-bottom: 2px solid #000; margin-bottom: 14px; }
                        .inv-company-name { font-size: 20px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 1px; margin-bottom: 4px; }
                        .inv-company-sub { font-size: 11px; color: #000; line-height: 1.6; }
                        .inv-title-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                        .inv-title { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #000; }
                        .inv-status { font-size: 10px; font-weight: 700; border: 1px solid #000; padding: 2px 10px; text-transform: uppercase; }
                        .inv-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #000; }
                        .inv-meta-item { display: flex; flex-direction: column; }
                        .inv-meta-item.right { text-align: right; }
                        .inv-meta-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 2px; }
                        .inv-meta-value { font-size: 12px; font-weight: 600; color: #000; }
                        .inv-table { width: 100%; border-collapse: collapse; }
                        .inv-table thead tr { border-top: 1px solid #000; border-bottom: 1px solid #000; }
                        .inv-table thead th { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 7px 4px; color: #000; text-align: left; }
                        .inv-table thead th.r { text-align: right; }
                        .inv-table thead th.c { text-align: center; }
                        .inv-table tbody tr { border-bottom: 1px solid #e0e0e0; }
                        .inv-table tbody td { padding: 8px 4px; font-size: 11px; color: #000; vertical-align: top; }
                        .inv-table tbody td.r { text-align: right; }
                        .inv-table tbody td.c { text-align: center; }
                        .inv-item-name { font-weight: 600; color: #000; }
                        .inv-item-sku { font-size: 9px; color: #555; margin-top: 2px; }
                        .inv-totals-wrap { display: flex; justify-content: flex-end; margin-top: 14px; padding-top: 8px; border-top: 1px solid #000; }
                        .inv-totals { width: 260px; }
                        .inv-total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; color: #000; border-bottom: 1px solid #ebebeb; }
                        .inv-total-row:last-child { border-bottom: none; }
                        .inv-total-grand { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; font-weight: 700; color: #000; border-top: 2px solid #000; border-bottom: 2px solid #000; margin-top: 4px; }
                        .inv-total-label { font-weight: 600; }
                        .inv-notes { margin-top: 20px; padding: 8px 10px; border: 1px solid #ccc; font-size: 11px; color: #000; }
                        .inv-notes-label { font-weight: 700; font-size: 10px; text-transform: uppercase; margin-bottom: 3px; }
                        .inv-footer { margin-top: 30px; text-align: center; padding-top: 12px; border-top: 1px solid #ccc; font-size: 11px; color: #000; }
                        .inv-footer-tagline { font-weight: 600; margin-bottom: 12px; }
                        .inv-biznex { font-size: 9px; color: #999; letter-spacing: 1px; text-transform: uppercase; }
                    }
                `}</style>

                {printReceiptData && (
                    <div className="inv-wrap">
                        {(() => {
                            const items = printReceiptData.items || [];
                            const subTotalVal = printReceiptData.subTotal ?? printReceiptData.sub_total ?? printReceiptData.subtotal ?? items.reduce((sum, item) => sum + (Number(item.total ?? item.total_price ?? item.totalPrice ?? ( (item.price ?? item.unitPrice ?? item.unit_price ?? 0) * (item.quantity ?? 0) )) || 0), 0);
                            const discountVal = Number(printReceiptData.discount ?? printReceiptData.discount_amount ?? 0) || 0;
                            const taxVal = Number(printReceiptData.tax ?? printReceiptData.tax_amount ?? 0) || 0;
                            const shippingVal = Number(printReceiptData.shippingCost ?? printReceiptData.shipping_cost ?? 0) || 0;
                            const totalVal = Number(printReceiptData.totalAmount ?? printReceiptData.total_amount ?? printReceiptData.grandTotal ?? 0) || 0;
                            
                            // Robust fallbacks for paid amount
                            const paidVal = Number(printReceiptData.actual_received ?? printReceiptData.amount_paid ?? printReceiptData.paid_amount ?? printReceiptData.paidAmount ?? printReceiptData.amountPaid ?? 0) || 0;
                            const appliedVal = Number(printReceiptData.paidAmount ?? printReceiptData.paid_amount ?? printReceiptData.amountPaid ?? printReceiptData.amount_paid ?? 0) || 0;
                            
                            const balanceVal = Math.max(0, totalVal - appliedVal);
                            const changeVal = Math.max(0, paidVal - totalVal);

                            return (
                                <>
                                    <div className="inv-header">
                                        <div className="inv-company-name">{companyInfo?.name || 'Company Name'}</div>
                                        <div className="inv-company-sub">
                                            {companyInfo?.address && <span>{companyInfo.address}</span>}
                                            {companyInfo?.phone && <span> &nbsp;|&nbsp; Tel: {companyInfo.phone}</span>}
                                            {companyInfo?.email && <span> &nbsp;|&nbsp; {companyInfo.email}</span>}
                                        </div>
                                    </div>

                                    <div className="inv-title-bar">
                                        <div className="inv-title">Sales Invoice</div>
                                        <div className="inv-status">{printReceiptData.paymentStatus || 'DUE'}</div>
                                    </div>

                                    <div className="inv-meta">
                                        <div className="inv-meta-item">
                                            <span className="inv-meta-label">Invoice No.</span>
                                            <span className="inv-meta-value">{printReceiptData.invoiceNo}</span>
                                        </div>
                                        <div className="inv-meta-item right">
                                            <span className="inv-meta-label">Date &amp; Time</span>
                                            <span className="inv-meta-value">
                                                {new Date(printReceiptData.date || new Date()).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="inv-meta-item">
                                            <span className="inv-meta-label">Customer</span>
                                            <span className="inv-meta-value">{printReceiptData.customerName || 'Walk-in Customer'}</span>
                                        </div>
                                        <div className="inv-meta-item right">
                                            <span className="inv-meta-label">Payment Method</span>
                                            <span className="inv-meta-value">{printReceiptData.paymentMethod || 'Cash'}</span>
                                        </div>
                                    </div>

                                    <table className="inv-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '15%' }}>SKU</th>
                                                <th style={{ width: '35%' }}>Item Description</th>
                                                <th className="c" style={{ width: '10%' }}>Qty</th>
                                                <th className="r" style={{ width: '20%' }}>Unit Price</th>
                                                <th className="r" style={{ width: '20%' }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>{item.product?.sku || item.sku || '-'}</td>
                                                    <td>
                                                        <div className="inv-item-name">{item.product?.name || item.name || 'Unknown Item'}</div>
                                                    </td>
                                                    <td className="c">{item.quantity}</td>
                                                    <td className="r">PKR {Number(item.price ?? item.unitPrice ?? item.unit_price ?? 0).toLocaleString()}</td>
                                                    <td className="r">PKR {Number(item.total ?? item.total_price ?? item.totalPrice ?? ( (item.price ?? item.unitPrice ?? item.unit_price ?? 0) * (item.quantity ?? 0) )).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <div className="inv-totals-wrap">
                                        <div className="inv-totals">
                                            <div className="inv-total-row">
                                                <span className="inv-total-label">Subtotal</span>
                                                <span>PKR {Number(subTotalVal).toLocaleString()}</span>
                                            </div>
                                            {discountVal > 0 && (
                                                <div className="inv-total-row">
                                                    <span className="inv-total-label">Discount</span>
                                                    <span>- PKR {Number(discountVal).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {taxVal > 0 && (
                                                <div className="inv-total-row">
                                                    <span className="inv-total-label">Tax</span>
                                                    <span>PKR {Number(taxVal).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {shippingVal > 0 && (
                                                <div className="inv-total-row">
                                                    <span className="inv-total-label">Shipping</span>
                                                    <span>PKR {Number(shippingVal).toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="inv-total-grand">
                                                <span>GRAND TOTAL</span>
                                                <span>PKR {Number(totalVal).toLocaleString()}</span>
                                            </div>
                                            <div className="inv-total-row" style={{ paddingTop: '6px' }}>
                                                <span className="inv-total-label">Amount Paid</span>
                                                <span>PKR {Number(paidVal).toLocaleString()}</span>
                                            </div>
                                            {changeVal > 0 && (
                                                <div className="inv-total-row">
                                                    <span className="inv-total-label">
                                                        {printReceiptData.returnChange ? 'Change Return' : 'Added to Balance'}
                                                    </span>
                                                    <span>PKR {Number(changeVal).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {balanceVal > 0 && (
                                                <div className="inv-total-row" style={{ fontWeight: '700' }}>
                                                    <span>Balance Due</span>
                                                    <span>PKR {Number(balanceVal).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {printReceiptData.notes && (
                                        <div className="inv-notes">
                                            <div className="inv-notes-label">Notes</div>
                                            <div>{printReceiptData.notes}</div>
                                        </div>
                                    )}

                                    <div className="inv-footer">
                                        <div className="inv-biznex">Powered by bizNex</div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sales;
