import React, { useState, useEffect, useMemo } from 'react';
import {
    Package, Grid, BarChart2, AlertTriangle, Printer,
    Plus, Search, Edit, Trash2, Image, X,
    Check, TrendingUp, FolderKanban, Clock
} from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import Products from './Products';

// Premium Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, onClick, isActive }) => {
    const borderColors = {
        orange: 'border-orange-500',
        emerald: 'border-emerald-500',
        red: 'border-rose-500',
        gray: 'border-slate-400',
        purple: 'border-indigo-500',
        blue: 'border-blue-500'
    };

    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-slate-900 rounded-[24px] p-5 border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all hover:shadow-xl hover:-translate-y-1 duration-300 cursor-pointer ${isActive ? `ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10` : ''}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1 space-y-1 text-left">
                    <p className="text-sm text-black dark:text-slate-400 font-semibold tracking-tight">{title}</p>
                    <p className="text-xl font-bold text-black dark:text-slate-100 tracking-tight">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${borderColors[color] || 'border-emerald-500'}`}>
                    <Icon size={18} className={color === 'gray' ? 'text-slate-500' : color === 'red' ? 'text-rose-500' : color === 'orange' ? 'text-orange-500' : 'text-emerald-500'} />
                </div>
            </div>
        </div>
    );
};

const tabs = [
    { id: 'products', label: 'Products', icon: Package, color: 'orange' },
    { id: 'stock', label: 'Stock Tracking', icon: BarChart2, color: 'emerald' },
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
                            className={`relative flex items-center space-x-2.5 px-6 py-4 text-sm font-semibold transition-all whitespace-nowrap group ${activeTab === tab.id
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <div className={`p-1.5 rounded-lg transition-all duration-300 ${activeTab === tab.id
                                ? `bg-emerald-500 text-white`
                                : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-slate-50 dark:group-hover:bg-slate-700 border border-slate-100 dark:border-slate-700 font-bold'
                                }`}>
                                <tab.icon size={16} />
                            </div>
                            <span className="tracking-tight">{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full"></div>
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
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Detailed Filter States
    const [filterUnit, setFilterUnit] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [filterColor, setFilterColor] = useState('');
    const [filterSize, setFilterSize] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [filterStockStatus, setFilterStockStatus] = useState('all'); // all, in_stock, low_stock, out_of_stock, expiring_soon, expired

    useEffect(() => {
        const fetchAllData = async () => {
            if (currentUser?.company_id) {
                setLoading(true);
                try {
                    const [fetchedProducts, fetchedCategories, fetchedBrands] = await Promise.all([
                        window.electronAPI.getProducts(currentUser.company_id),
                        window.electronAPI.getCategories(currentUser.company_id),
                        window.electronAPI.getBrands(currentUser.company_id)
                    ]);

                    setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);
                    setCategories(Array.isArray(fetchedCategories) ? fetchedCategories : []);
                    setBrands(Array.isArray(fetchedBrands) ? fetchedBrands : []);
                } catch (err) {
                    console.error('Error fetching inventory data:', err);
                    setProducts([]);
                    setCategories([]);
                    setBrands([]);
                }
                setLoading(false);
            }
        };
        fetchAllData();
    }, [currentUser]);

    const stats = useMemo(() => ({
        total: products.length,
        inStock: products.filter(p => p.stockQty > (p.alertQty || 5)).length,
        outOfStock: products.filter(p => p.stockQty <= 0).length,
        alerts: products.filter(p => p.stockQty > 0 && p.stockQty <= (p.alertQty || 5)).length,
        expiringSoon: products.filter(p => {
            if (!p.expiryDate) return false;
            const today = new Date();
            const exp = new Date(p.expiryDate);
            const diffTime = exp - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 30;
        }).length,
        expired: products.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date()).length,
        uniqueColors: [...new Set(products.map(p => p.color).filter(Boolean))],
        uniqueSizes: [...new Set(products.map(p => p.size).filter(Boolean))],
        uniqueGrades: [...new Set(products.map(p => p.grade).filter(Boolean))]
    }), [products]);

    const filtered = useMemo(() => {
        return products.filter(p => {
            // Search logic
            const lowerSearch = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm ||
                p.name.toLowerCase().includes(lowerSearch) ||
                p.sku?.toLowerCase().includes(lowerSearch) ||
                p.brand?.name?.toLowerCase().includes(lowerSearch) ||
                p.color?.toLowerCase().includes(lowerSearch) ||
                p.size?.toLowerCase().includes(lowerSearch) ||
                p.unit?.toLowerCase().includes(lowerSearch) ||
                p.grade?.toLowerCase().includes(lowerSearch);

            // Detailed filter logic
            const matchesUnit = !filterUnit || p.unit === filterUnit;
            const matchesCategory = !filterCategory || p.category?.id == filterCategory;
            const matchesBrand = !filterBrand || p.brand?.id == filterBrand;
            const matchesColor = !filterColor || p.color === filterColor;
            const matchesSize = !filterSize || p.size === filterSize;
            const matchesGrade = !filterGrade || p.grade === filterGrade;

            // Stock status filter logic
            let matchesStock = true;
            if (filterStockStatus === 'in_stock') matchesStock = p.stockQty > (p.alertQty || 5);
            else if (filterStockStatus === 'low_stock') matchesStock = p.stockQty > 0 && p.stockQty <= (p.alertQty || 5);
            else if (filterStockStatus === 'alerts') matchesStock = p.stockQty <= (p.alertQty || 5);
            else if (filterStockStatus === 'out_of_stock') matchesStock = p.stockQty <= 0;
            else if (filterStockStatus === 'expiring_soon') {
                if (!p.expiryDate) matchesStock = false;
                else {
                    const today = new Date();
                    const exp = new Date(p.expiryDate);
                    const diffTime = exp - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    matchesStock = diffDays >= 0 && diffDays <= 30;
                }
            }
            else if (filterStockStatus === 'expired') matchesStock = p.expiryDate && new Date(p.expiryDate) < new Date();

            return matchesSearch && matchesUnit && matchesCategory && matchesBrand && matchesColor && matchesSize && matchesGrade && matchesStock;
        }).sort((a, b) => (b.id || 0) - (a.id || 0));
    }, [products, searchTerm, filterUnit, filterCategory, filterBrand, filterColor, filterSize, filterGrade, filterStockStatus]);

    return (
        <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <StatCard
                    title="Total items"
                    value={stats.total}
                    icon={Package}
                    color="gray"
                    isActive={filterStockStatus === 'all'}
                    onClick={() => setFilterStockStatus('all')}
                />
                <StatCard
                    title="In Stock"
                    value={stats.inStock}
                    icon={Check}
                    color="emerald"
                    isActive={filterStockStatus === 'in_stock'}
                    onClick={() => setFilterStockStatus('in_stock')}
                />
                <StatCard
                    title="Stock alerts"
                    value={stats.alerts}
                    icon={AlertTriangle}
                    color="red"
                    isActive={filterStockStatus === 'alerts'}
                    onClick={() => setFilterStockStatus('alerts')}
                />
                <StatCard
                    title="Expiry alerts"
                    value={stats.expiringSoon}
                    icon={Clock}
                    color="orange"
                    isActive={filterStockStatus === 'expiring_soon'}
                    onClick={() => setFilterStockStatus('expiring_soon')}
                />
                <StatCard
                    title="Out of stock"
                    value={stats.outOfStock}
                    icon={X}
                    color="gray"
                    isActive={filterStockStatus === 'out_of_stock'}
                    onClick={() => setFilterStockStatus('out_of_stock')}
                />
                <StatCard
                    title="Expired"
                    value={stats.expired}
                    icon={Trash2}
                    color="red"
                    isActive={filterStockStatus === 'expired'}
                    onClick={() => setFilterStockStatus('expired')}
                />
            </div>

            {/* Comprehensive Filters Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
                {/* Category Filter */}
                <select
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-bold"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                >
                    <option value="">Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                {/* Brand Filter */}
                <select
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-semibold"
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                >
                    <option value="">Brands</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>

                {/* Unit Filter */}
                <select
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-semibold"
                    value={filterUnit}
                    onChange={(e) => setFilterUnit(e.target.value)}
                >
                    <option value="">Units</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="gram">Gram (g)</option>
                    <option value="ltr">Liter (ltr)</option>
                    <option value="mtr">Meter (m)</option>
                    <option value="box">Box</option>
                    <option value="pkt">Packet</option>
                </select>

                {/* Color Filter */}
                <select
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-semibold"
                    value={filterColor}
                    onChange={(e) => setFilterColor(e.target.value)}
                >
                    <option value="">Colors</option>
                    {stats.uniqueColors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Size Filter */}
                <select
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-semibold"
                    value={filterSize}
                    onChange={(e) => setFilterSize(e.target.value)}
                >
                    <option value="">Sizes</option>
                    {stats.uniqueSizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {/* Grade Filter */}
                <select
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-semibold"
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                >
                    <option value="">Grades</option>
                    {stats.uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>

                {/* Stock Filter */}
                <select
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-semibold"
                    value={filterStockStatus}
                    onChange={(e) => setFilterStockStatus(e.target.value)}
                >
                    <option value="all">Status</option>
                    <option value="in_stock">In stock</option>
                    <option value="low_stock">Low stock</option>
                    <option value="out_of_stock">Out of stock</option>
                    <option value="expiring_soon">Expiring soon</option>
                    <option value="expired">Expired</option>
                </select>

                {/* Reset Filters Button */}
                <button
                    onClick={() => {
                        setSearchTerm('');
                        setFilterCategory('');
                        setFilterBrand('');
                        setFilterUnit('');
                        setFilterColor('');
                        setFilterSize('');
                        setFilterGrade('');
                        setFilterStockStatus('all');
                    }}
                    className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-sm rounded-lg p-2.5 transition-all font-bold group"
                    title="Clear All Filters"
                >
                    <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                    <span className="lg:hidden xl:inline">Reset</span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-80 mb-6">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/5 transition-all font-semibold text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="Search stock items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>


            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300 font-sans">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left min-w-max border-separate border-spacing-0">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-black dark:text-white font-bold text-sm tracking-tight border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800">Sku</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800">Name</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800">Brand</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800">Category</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Color</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Size</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Grade</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Stock</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Alert</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Expiry</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                                        <td className="px-14 py-4 text-sm font-bold text-black dark:text-slate-100">{p.sku || '-'}</td>
                                        <td className="px-14 py-4 text-sm font-bold text-black dark:text-slate-100 truncate max-w-[200px]">{p.name}</td>
                                        <td className="px-14 py-4 text-sm font-bold text-black dark:text-slate-100">{p.brand?.name || '-'}</td>
                                        <td className="px-14 py-4 text-sm font-bold text-black dark:text-slate-100">
                                            <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded text-xs font-bold border border-emerald-100 dark:border-emerald-900">
                                                {p.category?.name || 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="px-14 py-4 text-center text-sm font-bold text-black dark:text-slate-100">{p.color || '-'}</td>
                                        <td className="px-14 py-4 text-center text-sm font-bold text-black dark:text-slate-100">{p.size || '-'}</td>
                                        <td className="px-14 py-4 text-center text-sm font-bold text-black dark:text-slate-100">{p.grade || '-'}</td>
                                        <td className={`px-14 py-4 text-center text-sm font-bold ${p.stockQty <= 0 ? 'text-rose-600 bg-rose-50/30 dark:bg-rose-900/10' : 'text-black dark:text-slate-100'}`}>{p.stockQty}</td>
                                        <td className="px-14 py-4 text-center text-sm font-bold text-black dark:text-slate-100">{p.alertQty || 5}</td>
                                        <td className={`px-14 py-4 text-center text-sm font-bold ${isExpired ? 'text-rose-600 dark:text-rose-400' : isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-black dark:text-slate-100'}`}>
                                            {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-14 py-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${p.stockQty <= 0 ? 'bg-rose-50/50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50' :
                                                    p.stockQty <= (p.alertQty || 5) ? 'bg-amber-50/50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50' :
                                                        'bg-emerald-50/50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50'
                                                    }`}>
                                                    {p.stockQty <= 0 ? 'Out of Stock' : p.stockQty <= (p.alertQty || 5) ? 'Low Stock' : 'In Stock'}
                                                </span>
                                                {isExpired && (
                                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-50/50 text-rose-600 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50">
                                                        Expired
                                                    </span>
                                                )}
                                                {isExpiringSoon && (
                                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50/50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50">
                                                        Expiring
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="11" className="px-6 py-20 text-center">
                                        <Package size={40} className="mx-auto text-slate-100 dark:text-slate-800 mb-3" />
                                        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No records found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
                        <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">Select product</label>
                        <div className="relative">
                            <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                            <select
                                value={selectedProduct?.id || ''}
                                onChange={(e) => setSelectedProduct(products.find(p => p.id == e.target.value))}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-750 focus:border-emerald-500 transition-all font-semibold text-sm appearance-none outline-none text-black dark:text-slate-200"
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
                        <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">Number of labels</label>
                        <div className="relative">
                            <Printer className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                             <input
                                 type="number"
                                 value={numLabels || ''}
                                 onChange={(e) => setNumLabels(e.target.value)}
                                 className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-750 focus:border-emerald-500 transition-all font-semibold text-sm outline-none text-black dark:text-slate-200"
                                 placeholder="0"
                                 min="1"
                             />
                        </div>
                    </div>



                    <button
                        onClick={handlePrint}
                        disabled={!selectedProduct || products.length === 0}
                        className="w-full py-3.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm tracking-tight disabled:opacity-50"
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
                        <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1 tracking-[0.2em] uppercase">{selectedProduct?.sku || 'sku-none'}</div>
                        <div className="h-14 w-48 bg-gradient-to-r from-slate-900 via-white to-slate-900 dark:from-slate-100 dark:via-slate-800 dark:to-slate-100 bg-[length:4px_100%] rounded-sm"></div>
                        <div className="text-base font-bold text-black dark:text-slate-100 mt-3 uppercase tracking-tight">{selectedProduct?.name || 'Item name'}</div>
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">PKR {selectedProduct?.sellPrice?.toLocaleString() || '0'}</div>
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
