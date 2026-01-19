import React, { useState, useEffect } from 'react';
import {
    Package, Grid, BarChart2, AlertTriangle, Printer,
    Plus, Search, Edit, Trash2, Image, X,
    Check, TrendingUp, FolderKanban
} from 'lucide-react';
import Products from './Products';

// Premium Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
    const colors = {
        orange: 'bg-white border-l-4 border-l-blue-500',
        emerald: 'bg-white border-l-4 border-l-emerald-500',
        red: 'bg-white border-l-4 border-l-rose-500',
        gray: 'bg-white border-l-4 border-l-slate-400',
        purple: 'bg-white border-l-4 border-l-indigo-500'
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

const tabs = [
    { id: 'products', label: 'Products', icon: Package, color: 'orange' },
    { id: 'categories', label: 'Setup', icon: Grid, color: 'purple' },
    { id: 'stock', label: 'Tracking', icon: BarChart2, color: 'emerald' },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, color: 'red' },
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
                                ? `bg-blue-600 text-white shadow-sm shadow-blue-100`
                                : 'bg-white text-slate-400 group-hover:bg-slate-50 border border-slate-100'
                                }`}>
                                <tab.icon size={16} />
                            </div>
                            <span className="uppercase tracking-widest">{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-8 flex-1">
                    {activeTab === 'products' && <Products currentUser={currentUser} />}
                    {activeTab === 'categories' && <CategoriesBrands currentUser={currentUser} />}
                    {activeTab === 'stock' && <StockTracking currentUser={currentUser} />}
                    {activeTab === 'alerts' && <LowStockAlerts currentUser={currentUser} />}
                    {activeTab === 'barcode' && <BarcodePrinting currentUser={currentUser} />}
                </div>
            </div>
        </div>
    );
};

const CategoriesBrands = ({ currentUser }) => {
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [modalConfig, setModalConfig] = useState(null);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, [currentUser]);

    const fetchData = async () => {
        if (currentUser?.company_id) {
            setLoading(true);
            try {
                const fetchedCategories = await window.electronAPI.getCategories(currentUser.company_id);
                const fetchedBrands = await window.electronAPI.getBrands(currentUser.company_id);

                setCategories(Array.isArray(fetchedCategories) ? fetchedCategories : []);
                setBrands(Array.isArray(fetchedBrands) ? fetchedBrands : []);

                if (fetchedCategories?.success === false) console.error("Category Error:", fetchedCategories.message);
                if (fetchedBrands?.success === false) console.error("Brand Error:", fetchedBrands.message);
            } catch (err) {
                console.error('Error fetching categories/brands:', err);
                setCategories([]);
                setBrands([]);
            }
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const { type, item } = modalConfig;
        const payload = { id: item?.id, name, companyId: currentUser.company_id };

        let result;
        if (type === 'category') {
            result = item ? await window.electronAPI.updateCategory(payload)
                : await window.electronAPI.createCategory(payload);
        } else {
            result = item ? await window.electronAPI.updateBrand(payload)
                : await window.electronAPI.createBrand(payload);
        }

        if (result.success) {
            setModalConfig(null);
            setName('');
            fetchData();
        } else {
            alert("Error: " + result.message);
        }
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
        let result = type === 'category'
            ? await window.electronAPI.deleteCategory(id)
            : await window.electronAPI.deleteBrand(id);
        if (result.success) fetchData();
        else alert("Error: " + result.message);
    };

    const openModal = (type, item = null) => {
        setModalConfig({ type, item });
        setName(item ? item.name : '');
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
            {/* Categories & Brands Cards */}
            {[
                { title: 'Product Categories', data: categories, type: 'category', icon: Grid, color: 'blue' },
                { title: 'Product Brands', data: brands, type: 'brand', icon: FolderKanban, color: 'indigo' }
            ].map((section) => (
                <div key={section.type} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg bg-slate-100 text-slate-500`}>
                                <section.icon size={18} />
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">{section.title}</h3>
                        </div>
                        <button
                            onClick={() => openModal(section.type)}
                            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                        {loading ? (
                            <div className="py-20 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">Loading...</div>
                        ) : section.data.length > 0 ? (
                            <div className="grid grid-cols-1 gap-1">
                                {section.data.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:text-blue-500 transition-colors">
                                                {item.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-xs text-slate-600 group-hover:text-slate-900">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openModal(section.type, item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={14} /></button>
                                            <button onClick={() => handleDelete(section.type, item.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <section.icon size={32} className="mx-auto text-slate-100 mb-3" />
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No {section.type}s found</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Premium Modal */}
            {modalConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 text-left border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                                {modalConfig.item ? 'Edit' : 'Add'} {modalConfig.type === 'category' ? 'Category' : 'Brand'}
                            </h3>
                            <button onClick={() => setModalConfig(null)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="space-y-1.5 text-left">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Name *</label>
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={`e.g. ${modalConfig.type === 'category' ? 'Smartphones' : 'Apple'}`}
                                />
                            </div>
                            <button type="submit" className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
                                <Check size={18} />
                                {modalConfig.item ? 'Save Changes' : 'Create Entry'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const StockTracking = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Total Products" value="156" icon={Package} color="gray" />
            <StatCard title="In Stock" value="142" icon={Check} color="emerald" />
            <StatCard title="Low Stock" value="8" icon={AlertTriangle} color="red" />
            <StatCard title="Out of Stock" value="6" icon={X} color="gray" />
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-lg shadow-sm shadow-blue-100">
                    <TrendingUp size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 text-lg uppercase tracking-tight">Stock Adjustment</h4>
                    <p className="text-slate-500 text-sm">Manually correct stock for damages, losses or returns.</p>
                </div>
            </div>
            <button className="px-6 py-2.5 bg-white text-blue-600 border border-blue-200 font-bold rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all active:scale-95 shadow-sm text-sm uppercase tracking-widest">
                New Adjustment
            </button>
        </div>
    </div>
);

const LowStockAlerts = ({ currentUser }) => {
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLowStock = async () => {
            if (currentUser?.company_id) {
                try {
                    const products = await window.electronAPI.getProducts(currentUser.company_id);
                    if (Array.isArray(products)) {
                        setLowStockProducts(products.filter(p => p.stockQty <= (p.alertQty || 5)));
                    } else {
                        setLowStockProducts([]);
                        if (products?.success === false) console.error("Low Stock Error:", products.message);
                    }
                } catch (err) {
                    console.error('Error fetching low stock:', err);
                    setLowStockProducts([]);
                }
                setLoading(false);
            }
        };
        fetchLowStock();
    }, [currentUser]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-rose-50/50 rounded-xl p-6 border border-rose-100 flex items-center gap-6">
                <div className="p-3 bg-rose-500 text-white rounded-lg shadow-sm shadow-rose-100 animate-pulse">
                    <AlertTriangle size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 text-lg uppercase tracking-tight">Critical Inventory Alerts</h4>
                    <p className="text-slate-500 text-sm">There are {lowStockProducts.length} items that require immediate attention.</p>
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
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {lowStockProducts.map((p) => (
                            <tr key={p.id} className="hover:bg-rose-50/20 transition-all border-b border-slate-50 last:border-0">
                                <td className="px-6 py-4 font-bold text-sm text-slate-800">{p.name}</td>
                                <td className="px-6 py-4 text-center font-bold text-rose-600 bg-rose-50/30 text-sm">{p.stockQty}</td>
                                <td className="px-6 py-4 text-center font-bold text-slate-400 text-xs">{p.alertQty || 5}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[10px] font-bold uppercase tracking-wider border border-rose-100">
                                        {p.stockQty <= 0 ? 'Out of Stock' : 'Low Stock'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-blue-600 hover:underline cursor-pointer text-xs uppercase tracking-tight">Restock now</td>
                            </tr>
                        ))}
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
                <button className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg shadow-sm shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
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
