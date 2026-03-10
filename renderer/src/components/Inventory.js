import React, { useState, useEffect } from 'react';
import {
    Package, Grid, BarChart2, AlertTriangle, Printer,
    Plus, Search, Edit, Trash2, Image, X,
    Check, TrendingUp, FolderKanban, Clock
} from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import Products from './Products';

// Premium Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, onClick, isActive }) => {
    const colors = {
        orange: 'bg-white dark:bg-slate-900 border-l-4 border-l-blue-500 dark:border-l-blue-600',
        emerald: 'bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500 dark:border-l-emerald-600',
        red: 'bg-white dark:bg-slate-900 border-l-4 border-l-rose-500 dark:border-l-rose-600',
        gray: 'bg-white dark:bg-slate-900 border-l-4 border-l-slate-400 dark:border-l-slate-500',
        purple: 'bg-white dark:bg-slate-900 border-l-4 border-l-indigo-500 dark:border-l-indigo-600',
        blue: 'bg-white dark:bg-slate-900 border-l-4 border-l-blue-500 dark:border-l-blue-600'
    };

    return (
        <div
            onClick={onClick}
            className={`relative overflow-hidden ${colors[color]} p-5 rounded-xl border transition-all duration-200 hover:shadow-md group cursor-pointer ${isActive ? 'ring-2 ring-blue-500 dark:ring-blue-600 shadow-md transform scale-[1.02]' : 'border-slate-200 dark:border-slate-800 shadow-sm'}`}
        >
            <div className="relative flex items-center justify-between">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</h3>
                </div>
                <div className={`p-2.5 rounded-lg transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                    <Icon size={20} />
                </div>
            </div>
        </div>
    );
};

const tabs = [
    { id: 'products', label: 'Products', icon: Package, color: 'orange' },
    { id: 'stock', label: 'Stock', icon: BarChart2, color: 'emerald' },
    { id: 'barcode', label: 'Barcodes', icon: Printer, color: 'blue' },
];

const Inventory = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('products');

    return (
        <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700">



            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px] flex flex-col transition-colors duration-300">
                {/* Modern Tab Bar */}
                <div className="flex items-center px-6 bg-slate-50/20 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center space-x-2.5 px-6 py-4 text-xs font-bold transition-all whitespace-nowrap group ${activeTab === tab.id
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <div className={`p-1.5 rounded-lg transition-all duration-300 ${activeTab === tab.id
                                ? `bg-blue-950 dark:bg-blue-600 text-white shadow-sm shadow-blue-100 dark:shadow-none`
                                : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-slate-50 dark:group-hover:bg-slate-700 border border-slate-100 dark:border-slate-700'
                                }`}>
                                <tab.icon size={16} />
                            </div>
                            <span className="uppercase tracking-widest">{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-950 dark:bg-blue-400 rounded-t-full"></div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-8 flex-1">
                    {activeTab === 'products' && <Products currentUser={currentUser} />}
                    {activeTab === 'stock' && <StockTracking currentUser={currentUser} />}
                    {activeTab === 'barcode' && <BarcodePrinting currentUser={currentUser} />}
                </div>
            </div>
        </div>
    );
};



const StockTracking = ({ currentUser }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all'); // all, in_stock, low_stock, out_of_stock, alerts, expiring_soon, expired

    useEffect(() => {
        const fetchStock = async () => {
            if (currentUser?.company_id) {
                try {
                    const fetched = await window.electronAPI.getProducts(currentUser.company_id);
                    setProducts(Array.isArray(fetched) ? fetched : []);
                } catch (err) {
                    console.error('Error fetching stock:', err);
                    setProducts([]);
                }
                setLoading(false);
            }
        };
        fetchStock();
    }, [currentUser]);

    const stats = {
        total: products.length,
        inStock: products.filter(p => p.stockQty > (p.alertQty || 5)).length,
        outOfStock: products.filter(p => p.stockQty <= 0).length,
        alerts: products.filter(p => p.stockQty <= (p.alertQty || 5)).length,
        // Expiring Soon: Not expired yet, but expires within 30 days
        expiringSoon: products.filter(p => {
            if (!p.expiryDate) return false;
            const today = new Date();
            const exp = new Date(p.expiryDate);
            const diffTime = exp - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 30;
        }).length,
        // Expired: Date is in the past
        expired: products.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date()).length
    };

    const getFilteredProducts = () => {
        switch (filterType) {
            case 'in_stock': return products.filter(p => p.stockQty > (p.alertQty || 5));
            case 'out_of_stock': return products.filter(p => p.stockQty <= 0);
            case 'alerts': return products.filter(p => p.stockQty <= (p.alertQty || 5));
            case 'expiring_soon': return products.filter(p => {
                if (!p.expiryDate) return false;
                const today = new Date();
                const exp = new Date(p.expiryDate);
                const diffTime = exp - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 30;
            });
            case 'expired': return products.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date());
            default: return products;
        }
    };

    const filtered = getFilteredProducts();

    return (
        <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <StatCard
                    title="Total Items"
                    value={stats.total}
                    icon={Package}
                    color="gray"
                    isActive={filterType === 'all'}
                    onClick={() => setFilterType('all')}
                />
                <StatCard
                    title="In Stock"
                    value={stats.inStock}
                    icon={Check}
                    color="emerald"
                    isActive={filterType === 'in_stock'}
                    onClick={() => setFilterType('in_stock')}
                />
                <StatCard
                    title="Alerts"
                    value={stats.alerts}
                    icon={AlertTriangle}
                    color="red"
                    isActive={filterType === 'alerts'}
                    onClick={() => setFilterType('alerts')}
                />
                <StatCard
                    title="Out of Stock"
                    value={stats.outOfStock}
                    icon={X}
                    color="gray"
                    isActive={filterType === 'out_of_stock'}
                    onClick={() => setFilterType('out_of_stock')}
                />
                <StatCard
                    title="Expiring Soon"
                    value={stats.expiringSoon}
                    icon={Clock}
                    color="orange"
                    isActive={filterType === 'expiring_soon'}
                    onClick={() => setFilterType('expiring_soon')}
                />
                <StatCard
                    title="Expired"
                    value={stats.expired}
                    icon={Trash2}
                    color="red"
                    isActive={filterType === 'expired'}
                    onClick={() => setFilterType('expired')}
                />
            </div>


            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4 text-center">Stock</th>
                            <th className="px-6 py-4 text-center">Alert</th>
                            <th className="px-6 py-4 text-center">Expiry</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.length > 0 ? filtered.map((p) => {
                            const isExpired = p.expiryDate && new Date(p.expiryDate) < new Date();
                            const isExpiringSoon = !isExpired && p.expiryDate && (() => {
                                const today = new Date();
                                const exp = new Date(p.expiryDate);
                                const diffTime = exp - today;
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                return diffDays <= 30;
                            })();

                            return (
                                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-50 dark:border-slate-800 last:border-0">
                                    <td className="px-6 py-4 font-bold text-sm text-black dark:text-slate-100">{p.name}</td>
                                    <td className={`px-6 py-4 text-center font-bold text-sm ${p.stockQty <= 0 ? 'text-rose-600 bg-rose-50/30 dark:bg-rose-900/10' : 'text-black dark:text-slate-100'}`}>{p.stockQty}</td>
                                    <td className="px-6 py-4 text-center font-bold text-black dark:text-slate-100 text-xs">{p.alertQty || 5}</td>
                                    <td className={`px-6 py-4 text-center font-bold text-xs ${isExpired ? 'text-rose-600 dark:text-rose-400' : isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-black dark:text-slate-100'}`}>
                                        {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${p.stockQty <= 0 ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50' :
                                                p.stockQty <= (p.alertQty || 5) ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/50' :
                                                    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
                                                }`}>
                                                {p.stockQty <= 0 ? 'Out of Stock' : p.stockQty <= (p.alertQty || 5) ? 'Low Stock' : 'In Stock'}
                                            </span>
                                            {isExpired && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800">
                                                    Expired
                                                </span>
                                            )}
                                            {isExpiringSoon && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                                    Expiring
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-20 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                                    No records found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const BarcodePrinting = ({ currentUser }) => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [numLabels, setNumLabels] = useState('');
    const [loading, setLoading] = useState(true);

    const { showAlert } = useDialog();

    useEffect(() => {
        const fetchProducts = async () => {
            if (currentUser?.company_id) {
                try {
                    const data = await window.electronAPI.getProducts(currentUser.company_id);
                    const list = Array.isArray(data) ? data : [];
                    setProducts(list);
                    if (list.length > 0) setSelectedProduct(list[0]);
                } catch (err) {
                    console.error("Error fetching products for barcodes:", err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchProducts();
    }, [currentUser]);

    const handlePrint = () => {
        if (!selectedProduct) return showAlert("Please select a product");
        if (!numLabels || parseInt(numLabels) <= 0) return showAlert("Please enter a valid number of labels");
        window.print();
    };

    return (
        <div className="animate-in fade-in duration-500 max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Print Configuration */}
                <div className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
                    <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Select Product</label>
                        <div className="relative">
                            <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                            <select
                                value={selectedProduct?.id || ''}
                                onChange={(e) => setSelectedProduct(products.find(p => p.id == e.target.value))}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 transition-all font-bold text-sm appearance-none outline-none text-slate-700 dark:text-slate-200"
                            >
                                {loading ? <option>Loading...</option> :
                                    products.length === 0 ? <option>No products found</option> :
                                        products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                                        ))
                                }
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Labels</label>
                        <div className="relative">
                            <Printer className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                            <input
                                type="number"
                                value={numLabels || ''}
                                onChange={(e) => setNumLabels(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 transition-all font-bold text-sm outline-none text-slate-700 dark:text-slate-200"
                                placeholder="0"
                                min="1"
                            />
                        </div>
                    </div>



                    <button
                        onClick={handlePrint}
                        disabled={!selectedProduct || products.length === 0}
                        className="w-full py-3.5 bg-blue-950 dark:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 dark:shadow-none hover:bg-slate-900 dark:hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-widest disabled:opacity-50"
                    >
                        <Printer size={18} />
                        <span>Print now</span>
                    </button>
                </div>

                {/* Preview Section */}
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group transition-colors duration-300">
                    <div className="absolute top-4 left-4">
                        <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em]">Preview</span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xl mb-6 transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl dark:shadow-none">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 tracking-[0.2em] uppercase">{selectedProduct?.sku || 'SKU-NONE'}</div>
                        <div className="h-14 w-48 bg-gradient-to-r from-slate-900 via-white to-slate-900 dark:from-slate-100 dark:via-slate-800 dark:to-slate-100 bg-[length:4px_100%] rounded-sm"></div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-3 uppercase tracking-tight">{selectedProduct?.name || 'Item Name'}</div>
                        <div className="text-[10px] font-bold text-black dark:text-white mt-1">PKR {selectedProduct?.sellPrice?.toLocaleString() || '0'}</div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                        <p className="text-[10px] font-bold uppercase tracking-widest italic">Live Preview</p>
                    </div>
                </div>
            </div>

            {/* Hidden Print Section - Optimized for Barcode Label printers */}
            <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999]">
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        #print-section, #print-section * { visibility: visible; }
                        #print-section { position: absolute; left: 0; top: 0; width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 10px; }
                        .print-label { 
                            border: 1px dashed #ccc; 
                            padding: 10px; 
                            text-align: center; 
                            display: flex; 
                            flex-direction: column; 
                            items-center; 
                            justify-content: center;
                            page-break-inside: avoid;
                            height: 100px;
                        }
                    }
                `}</style>
                <div id="print-section">
                    {Array.from({ length: parseInt(numLabels) || 0 }).map((_, i) => (
                        <div key={i} className="print-label">
                            <div style={{ fontSize: '8px', fontWeight: 'bold' }}>{selectedProduct?.sku}</div>
                            <div style={{ height: '30px', width: '100%', background: 'linear-gradient(to right, #000, #fff, #000)', backgroundSize: '2px 100%' }}></div>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedProduct?.name}</div>
                            <div style={{ fontSize: '9px', fontWeight: 'bold' }}>PKR {selectedProduct?.sellPrice}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Inventory;
