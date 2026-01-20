import React, { useState, useEffect } from 'react';
import {
    Package, Grid, BarChart2, AlertTriangle, Printer,
    Plus, Search, Edit, Trash2, Image, X,
    Check, TrendingUp, FolderKanban
} from 'lucide-react';
import Products from './Products';

// Premium Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, onClick, isActive }) => {
    const colors = {
        orange: 'bg-white border-l-4 border-l-blue-500',
        emerald: 'bg-white border-l-4 border-l-emerald-500',
        red: 'bg-white border-l-4 border-l-rose-500',
        gray: 'bg-white border-l-4 border-l-slate-400',
        purple: 'bg-white border-l-4 border-l-indigo-500',
        blue: 'bg-white border-l-4 border-l-blue-500'
    };

    return (
        <div
            onClick={onClick}
            className={`relative overflow-hidden ${colors[color]} p-5 rounded-xl border transition-all duration-200 hover:shadow-md group cursor-pointer ${isActive ? 'ring-2 ring-blue-500 shadow-md transform scale-[1.02]' : 'border-slate-200 shadow-sm'}`}
        >
            <div className="relative flex items-center justify-between">
                <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
                    <h3 className="text-xl font-bold text-slate-800">{value}</h3>
                </div>
                <div className={`p-2.5 rounded-lg transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                    <Icon size={20} />
                </div>
            </div>
        </div>
    );
};

const tabs = [
    { id: 'products', label: 'Products', icon: Package, color: 'orange' },
    { id: 'stock', label: 'Tracking', icon: BarChart2, color: 'emerald' },
    { id: 'barcode', label: 'Barcodes', icon: Printer, color: 'blue' },
];

const Inventory = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('products');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Inventory Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Track products, categories, stock levels and generate labels.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                {/* Modern Tab Bar */}
                <div className="flex items-center px-6 bg-slate-50/20 border-b border-slate-100 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center space-x-2.5 px-6 py-4 text-xs font-bold transition-all whitespace-nowrap group ${activeTab === tab.id
                                ? 'text-blue-600'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <div className={`p-1.5 rounded-lg transition-all duration-300 ${activeTab === tab.id
                                ? `bg-blue-950 text-white shadow-sm shadow-blue-100`
                                : 'bg-white text-slate-400 group-hover:bg-slate-50 border border-slate-100'
                                }`}>
                                <tab.icon size={16} />
                            </div>
                            <span className="uppercase tracking-widest">{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-950 rounded-t-full"></div>
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
    const [filterType, setFilterType] = useState('all'); // all, in_stock, low_stock, out_of_stock, alerts

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
        lowStock: products.filter(p => p.stockQty > 0 && p.stockQty <= (p.alertQty || 5)).length,
        outOfStock: products.filter(p => p.stockQty <= 0).length,
        alerts: products.filter(p => p.stockQty <= (p.alertQty || 5)).length // "Alerts" as critical stock (Low + Out)
    };

    const getFilteredProducts = () => {
        switch (filterType) {
            case 'in_stock': return products.filter(p => p.stockQty > (p.alertQty || 5));
            case 'low_stock': return products.filter(p => p.stockQty > 0 && p.stockQty <= (p.alertQty || 5));
            case 'out_of_stock': return products.filter(p => p.stockQty <= 0);
            case 'alerts': return products.filter(p => p.stockQty <= (p.alertQty || 5));
            default: return products;
        }
    };

    const filtered = getFilteredProducts();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <StatCard
                    title="Total Products"
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
                    title="Low Stock"
                    value={stats.lowStock}
                    icon={TrendingUp}
                    color="orange"
                    isActive={filterType === 'low_stock'}
                    onClick={() => setFilterType('low_stock')}
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
                    title="Alerts"
                    value={stats.alerts}
                    icon={AlertTriangle}
                    color="red"
                    isActive={filterType === 'alerts'}
                    onClick={() => setFilterType('alerts')}
                />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 text-white rounded-lg shadow-sm shadow-blue-100">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-lg uppercase tracking-tight">Stock Overview</h4>
                        <p className="text-slate-500 text-sm">Viewing {filterType === 'all' ? 'All Products' : filterType.replace(/_/g, ' ')}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Product Name</th>
                            <th className="px-6 py-4 text-center">Current Stock</th>
                            <th className="px-6 py-4 text-center">Alert Level</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.length > 0 ? filtered.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0">
                                <td className="px-6 py-4 font-bold text-sm text-slate-800">{p.name}</td>
                                <td className={`px-6 py-4 text-center font-bold text-sm ${p.stockQty <= 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-700'}`}>{p.stockQty}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-400 text-xs">{p.alertQty || 5}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${p.stockQty <= 0 ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                        p.stockQty <= (p.alertQty || 5) ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        }`}>
                                        {p.stockQty <= 0 ? 'Out of Stock' : p.stockQty <= (p.alertQty || 5) ? 'Low Stock' : 'In Stock'}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4" className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                    No products found for this filter
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const BarcodePrinting = () => (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Product</label>
                    <div className="relative">
                        <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all font-bold text-sm appearance-none outline-none">
                            <option>Product A - SKU001</option>
                            <option>Product B - SKU002</option>
                            <option>Product C - SKU003</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Number of Labels</label>
                    <div className="relative">
                        <Printer className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="number" className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all font-bold text-sm outline-none" defaultValue="10" />
                    </div>
                </div>
                <button className="w-full py-2.5 bg-blue-950 text-white font-bold rounded-lg shadow-sm shadow-blue-100 hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
                    <Printer size={18} />
                    <span>Print Labels</span>
                </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm mb-4 transform hover:scale-105 transition-transform">
                    <div className="text-[10px] font-bold text-slate-400 mb-1 tracking-widest uppercase">SKU001</div>
                    <div className="h-12 w-40 bg-gradient-to-r from-slate-900 via-white to-slate-900 bg-[length:4px_100%] rounded-sm"></div>
                    <div className="text-xs font-bold text-slate-800 mt-2 uppercase tracking-tight">Product A Name</div>
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">Label Preview</p>
            </div>
        </div>
    </div>
);

export default Inventory;
