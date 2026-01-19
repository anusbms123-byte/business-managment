import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Search, MoreHorizontal, X, ShoppingCart,
    Trash2, DollarSign, TrendingUp, Calendar,
    User, Package, ChevronRight, Check, Printer
} from 'lucide-react';

// Premium Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
    const colors = {
        orange: 'bg-white border-l-4 border-l-blue-500',
        emerald: 'bg-white border-l-4 border-l-emerald-500',
        blue: 'bg-white border-l-4 border-l-blue-600',
        purple: 'bg-white border-l-4 border-l-indigo-500',
        red: 'bg-white border-l-4 border-l-rose-500',
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

const Sales = ({ currentUser }) => {
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // New Sale Cart State
    const [cart, setCart] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(1);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [discount, setDiscount] = useState(0);
    const [shippingCost, setShippingCost] = useState(0);
    const [amountPaid, setAmountPaid] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [notes, setNotes] = useState('');

    useEffect(() => { fetchData(); }, [currentUser]);

    const fetchData = async () => {
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
    };

    const stats = useMemo(() => {
        const today = new Date().toLocaleDateString();
        const todaySales = sales.filter(s => new Date(s.date).toLocaleDateString() === today);
        return {
            todayCount: todaySales.length,
            todayRevenue: todaySales.reduce((acc, s) => acc + s.grandTotal, 0),
            totalRevenue: sales.reduce((acc, s) => acc + s.grandTotal, 0),
            avgTicket: sales.length ? (sales.reduce((acc, s) => acc + s.grandTotal, 0) / sales.length).toFixed(0) : 0
        };
    }, [sales]);

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
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    const subTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const tax = 0; // Can be expanded later
    const grandTotal = subTotal + parseFloat(shippingCost || 0) - parseFloat(discount || 0);
    const changeAmount = Math.max(0, parseFloat(amountPaid || 0) - grandTotal);
    const paymentStatus = parseFloat(amountPaid || 0) >= grandTotal ? 'PAID' : (parseFloat(amountPaid || 0) > 0 ? 'PARTIAL' : 'DUE');

    const handleSaveSale = async () => {
        if (cart.length === 0) return alert("Please add items to cart!");

        const saleData = {
            companyId: currentUser.company_id,
            customerId: selectedCustomer || null,
            userId: currentUser.id,
            invoiceNo: `INV-${Date.now().toString().slice(-6)}`,
            subTotal,
            discount: parseFloat(discount),
            tax: 0,
            grandTotal,
            shippingCost: parseFloat(shippingCost),
            amountPaid: parseFloat(amountPaid),
            paymentMethod,
            paymentStatus,
            notes,
            items: cart
        };

        const result = await window.electronAPI.addSale(saleData);
        if (result.success) {
            setIsModalOpen(false);
            setCart([]);
            setDiscount(0);
            setShippingCost(0);
            setAmountPaid(0);
            setPaymentMethod('CASH');
            setNotes('');
            setSelectedCustomer('');
            fetchData();
        } else {
            alert("Error: " + result.message);
        }
    };

    const filteredSales = sales.filter(s =>
        s.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Today's Revenue" value={`PKR ${stats.todayRevenue.toLocaleString()}`} icon={DollarSign} color="orange" />
                <StatCard title="Today's Orders" value={stats.todayCount} icon={ShoppingCart} color="emerald" />
                <StatCard title="Total Revenue" value={`PKR ${stats.totalRevenue.toLocaleString()}`} icon={TrendingUp} color="blue" />
                <StatCard title="Avg. Order Value" value={`PKR ${stats.avgTicket.toLocaleString()}`} icon={Calendar} color="purple" />
            </div>

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
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-sm shadow-blue-200"
                    >
                        <Plus size={18} />
                        <span>Create New Sale</span>
                    </button>
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
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                <User size={14} />
                                            </div>
                                            <span className="font-bold text-xs text-slate-600">{sale.customer?.name || 'Walk-in Customer'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase">
                                            {sale.items?.length || 0} Items
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-sm text-slate-800">PKR {sale.grandTotal?.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{sale.paymentMethod || 'CASH'}</span>
                                            <span className="text-xs font-bold text-slate-800">PKR {sale.amountPaid?.toLocaleString()}</span>
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
                                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                            <MoreHorizontal size={16} />
                                        </button>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200">
                        {/* Header */}
                        <div className="px-8 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                                    <ShoppingCart size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Terminal POS</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Operator: {currentUser?.fullname || 'Counter 1'}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Left: Product Selection */}
                            <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-hide border-r border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Search Product</label>
                                        <div className="relative">
                                            <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <select
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-sm outline-none appearance-none cursor-pointer"
                                                value={selectedProduct}
                                                onChange={(e) => setSelectedProduct(e.target.value)}
                                            >
                                                <option value="">Choose item...</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id} disabled={p.stockQty <= 0}>
                                                        {p.name} - (Stock: {p.stockQty}) - PKR {p.sellPrice}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-sm outline-none text-center"
                                                value={qty}
                                                onChange={(e) => setQty(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={addToCart}
                                                className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm shadow-blue-100 transition-all active:scale-95 text-sm"
                                            >
                                                ADD TO CART
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Modern Cart Table */}
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                                    <table className="w-full text-left">
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
                                                        <button onClick={() => removeFromCart(item.productId)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {cart.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-20 text-center">
                                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
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
                            <div className="w-[360px] p-6 flex flex-col space-y-6 bg-slate-50 border-l border-slate-200">
                                <div className="space-y-4">
                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
                                        <div className="flex items-center gap-2 mb-1 px-0.5">
                                            <User size={14} className="text-blue-500" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Details</span>
                                        </div>
                                        <select
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-500 transition-all outline-none font-bold text-xs appearance-none"
                                            value={selectedCustomer}
                                            onChange={(e) => setSelectedCustomer(e.target.value)}
                                        >
                                            <option value="">Walk-in Customer</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-3 px-1">
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
                                            <span>Subtotal</span>
                                            <span className="text-slate-800">PKR {subTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight text-right">
                                            <span>Shipping</span>
                                            <div className="relative w-24">
                                                <input
                                                    type="number"
                                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-right font-bold text-slate-800 focus:border-blue-500 outline-none transition-all text-sm"
                                                    value={shippingCost}
                                                    onChange={(e) => setShippingCost(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
                                            <span>Discount</span>
                                            <div className="relative w-24 text-right">
                                                <input
                                                    type="number"
                                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-right font-bold text-blue-600 focus:border-blue-500 outline-none transition-all text-sm"
                                                    value={discount}
                                                    onChange={(e) => setDiscount(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="h-px bg-slate-200 my-4"></div>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block">Grand Total</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xs font-bold text-slate-400 uppercase">PKR</span>
                                                    <span className="text-3xl font-bold text-slate-800 tracking-tighter">
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
                                                        className="bg-slate-50 border-none text-[10px] font-bold uppercase focus:ring-0 cursor-pointer"
                                                    >
                                                        <option value="CASH">CASH</option>
                                                        <option value="CARD">CARD</option>
                                                        <option value="TRANSFER">BANK / EASYPAISA</option>
                                                    </select>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Received</label>
                                                    <input
                                                        type="number"
                                                        className="w-24 px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-right font-bold text-sm outline-none"
                                                        value={amountPaid}
                                                        onChange={(e) => setAmountPaid(e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Change</label>
                                                    <span className="text-xs font-bold text-blue-600">PKR {changeAmount.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Order Notes</label>
                                                <textarea
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 transition-all resize-none h-16"
                                                    placeholder="Delivery instructions, customer requests..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto space-y-3">
                                    <button
                                        onClick={handleSaveSale}
                                        disabled={cart.length === 0}
                                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 shadow-md shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCart size={20} />
                                        CHECKOUT
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

export default Sales;
