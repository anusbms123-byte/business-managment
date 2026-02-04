import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Search, Edit, Trash2, X, Package,
    ShoppingCart, AlertTriangle, Check, Layers,
    Tag, DollarSign, Box, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { canCreate, canEdit, canDelete } from '../utils/permissions';


// Premium Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, onClick, isActive }) => {
    const colors = {
        orange: 'bg-white border-l-4 border-l-blue-500',
        emerald: 'bg-white border-l-4 border-l-emerald-500',
        red: 'bg-white border-l-4 border-l-rose-500',
        blue: 'bg-white border-l-4 border-l-indigo-500',
        gray: 'bg-white border-l-4 border-l-slate-400'
    };

    return (
        <div
            onClick={onClick}
            className={`relative overflow-hidden ${colors[color]} p-5 rounded-xl border transition-all duration-200 hover:shadow-md group cursor-pointer ${isActive ? 'ring-2 ring-blue-500 shadow-md transform scale-[1.02]' : 'border-slate-200 shadow-sm'}`}>
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

const Products = ({ currentUser }) => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showOptional, setShowOptional] = useState(false);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [filterUnit, setFilterUnit] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [filterStockStatus, setFilterStockStatus] = useState(''); // 'instock', 'lowstock', 'outofstock'

    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        id: null, name: '', sku: '', description: '', unit: 'pcs',
        cost_price: '', sell_price: '', stock_qty: '', alert_qty: '',
        weight: '', expiry_date: '', category_name: '', brand_name: '',
        color: '', size: '', grade: '', condition: ''
    });

    const tableScrollRef = React.useRef(null);

    // Keyboard navigation for scrolling table
    useEffect(() => {
        const handleTableScroll = (e) => {
            if (!tableScrollRef.current) return;

            // Don't scroll if user is typing in an input
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

            if (e.key === 'ArrowRight') {
                tableScrollRef.current.scrollBy({ left: 100, behavior: 'smooth' });
            } else if (e.key === 'ArrowLeft') {
                tableScrollRef.current.scrollBy({ left: -100, behavior: 'smooth' });
            }
        };

        window.addEventListener('keydown', handleTableScroll);
        return () => window.removeEventListener('keydown', handleTableScroll);
    }, []);

    useEffect(() => { fetchData(); }, [currentUser]);

    const fetchData = async () => {
        if (currentUser?.company_id) {
            setLoading(true);
            try {
                const fetchedProducts = await window.electronAPI.getProducts(currentUser.company_id);
                const fetchedCategories = await window.electronAPI.getCategories(currentUser.company_id);
                const fetchedBrands = await window.electronAPI.getBrands(currentUser.company_id);

                setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);
                setCategories(Array.isArray(fetchedCategories) ? fetchedCategories : []);
                setBrands(Array.isArray(fetchedBrands) ? fetchedBrands : []);
            } catch (err) {
                console.error('Error in fetchData:', err);
                setProducts([]);
                setCategories([]);
                setBrands([]);
            }
            setLoading(false);
        }
    };

    const stats = useMemo(() => ({
        total: products.length,
        inStock: products.filter(p => p.stockQty > (p.alertQty || 5)).length,
        lowStock: products.filter(p => p.stockQty > 0 && p.stockQty <= (p.alertQty || 5)).length,
        outOfStock: products.filter(p => p.stockQty <= 0).length,
        expired: products.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date()).length,
        totalValue: products.reduce((acc, p) => acc + (p.stockQty * p.sell_price), 0)
    }), [products]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Handle Category Interaction
            let categoryId = null;
            if (formData.category_name) {
                const existingCat = categories.find(c => c.name.toLowerCase() === formData.category_name.toLowerCase());
                if (existingCat) {
                    categoryId = existingCat.id;
                } else {
                    const newCat = await window.electronAPI.createCategory({ name: formData.category_name, companyId: currentUser.company_id });
                    if (newCat.success) {
                        // Refresh categories list and lookup the new ID to be safe
                        const currentCats = await window.electronAPI.getCategories(currentUser.company_id);
                        if (Array.isArray(currentCats)) {
                            setCategories(currentCats);
                            const created = currentCats.find(c => c.name.toLowerCase() === formData.category_name.toLowerCase());
                            if (created) categoryId = created.id;
                        }
                    } else {
                        alert("Failed to create category: " + newCat.message);
                        setSaving(false);
                        return;
                    }
                }
            }

            // Handle Brand Interaction
            let brandId = null;
            if (formData.brand_name) {
                const existingBrand = brands.find(b => b.name.toLowerCase() === formData.brand_name.toLowerCase());
                if (existingBrand) {
                    brandId = existingBrand.id;
                } else {
                    const newBrand = await window.electronAPI.createBrand({ name: formData.brand_name, companyId: currentUser.company_id });
                    if (newBrand.success) {
                        // Refresh brands list and lookup
                        const currentBrands = await window.electronAPI.getBrands(currentUser.company_id);
                        if (Array.isArray(currentBrands)) {
                            setBrands(currentBrands);
                            const created = currentBrands.find(b => b.name.toLowerCase() === formData.brand_name.toLowerCase());
                            if (created) brandId = created.id;
                        }
                    } else {
                        alert("Failed to create brand: " + newBrand.message);
                        setSaving(false);
                        return;
                    }
                }
            }

            const payload = {
                ...formData,
                category_id: categoryId,
                brand_id: brandId,
                companyId: currentUser.company_id
            };

            // Remove temporary name fields from payload
            delete payload.category_name;
            delete payload.brand_name;

            let result = formData.id
                ? await window.electronAPI.updateProduct(payload)
                : await window.electronAPI.createProduct(payload);

            if (result.success) {
                setIsModalOpen(false);
                resetForm();
                fetchData();
            } else {
                alert("Error: " + result.message);
            }
        } catch (error) {
            console.error("Submission Error:", error);
            alert("An unexpected error occurred.");
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({
            id: null, name: '', sku: '', description: '', unit: 'pcs',
            cost_price: '', sell_price: '', stock_qty: '', alert_qty: '',
            weight: '', expiry_date: '', category_name: '', brand_name: '',
            color: '', size: '', grade: '', condition: ''
        });
        setShowOptional(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            const result = await window.electronAPI.deleteProduct(id);
            if (result.success) fetchData();
            else alert("Error: " + result.message);
        }
    };

    const openEdit = (product) => {
        setFormData({
            id: product.id,
            name: product.name,
            sku: product.sku,
            description: product.description || '',
            unit: product.unit || 'pcs',
            cost_price: product.costPrice,
            sell_price: product.sellPrice,
            stock_qty: product.stockQty,
            alert_qty: product.alertQty,
            weight: product.weight || '',
            expiry_date: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : '',
            category_name: product.category?.name || '',
            brand_name: product.brand?.name || '',
            color: product.color || '',
            size: product.size || '',
            grade: product.grade || '',
            condition: product.condition || ''
        });
        setShowOptional(product.color || product.size || product.grade || product.condition || product.description ? true : false);
        setIsModalOpen(true);
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesUnit = filterUnit ? p.unit === filterUnit : true;
        const matchesCategory = filterCategory ? p.category?.id === filterCategory : true;
        const matchesBrand = filterBrand ? p.brand?.id === filterBrand : true;

        let matchesStock = true;
        if (filterStockStatus === 'instock') matchesStock = p.stockQty > (p.alertQty || 5);
        if (filterStockStatus === 'lowstock') matchesStock = p.stockQty > 0 && p.stockQty <= (p.alertQty || 5);
        if (filterStockStatus === 'outofstock') matchesStock = p.stockQty <= 0;
        if (filterStockStatus === 'expired') matchesStock = p.expiryDate && new Date(p.expiryDate) < new Date();

        return matchesSearch && matchesUnit && matchesCategory && matchesBrand && matchesStock;
    });

    return (
        <div className="relative animate-in fade-in duration-500">
            {/* Table Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/20">

                    {/* Filters Row */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        {/* Category Filter */}
                        <select
                            className="bg-white border border-slate-200 text-slate-600 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none font-bold"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        {/* Brand Filter */}
                        <select
                            className="bg-white border border-slate-200 text-slate-600 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none font-bold"
                            value={filterBrand}
                            onChange={(e) => setFilterBrand(e.target.value)}
                        >
                            <option value="">All Brands</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>

                        {/* Unit Filter */}
                        <select
                            className="bg-white border border-slate-200 text-slate-600 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none font-bold"
                            value={filterUnit}
                            onChange={(e) => setFilterUnit(e.target.value)}
                        >
                            <option value="">All Units</option>
                            <option value="pcs">Pieces (pcs)</option>
                            <option value="kg">Kilogram (kg)</option>
                            <option value="gram">Gram (g)</option>
                            <option value="ltr">Liter (ltr)</option>
                            <option value="mtr">Meter (m)</option>
                            <option value="box">Box</option>
                            <option value="pkt">Packet</option>
                        </select>

                        {/* Stock Filter */}
                        <select
                            className="bg-white border border-slate-200 text-black text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none font-bold"
                            value={filterStockStatus}
                            onChange={(e) => setFilterStockStatus(e.target.value)}
                        >
                            <option value="">All Stock Status</option>
                            <option value="instock">In Stock</option>
                            <option value="lowstock">Low Stock</option>
                            <option value="outofstock">Out of Stock</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            />

                            {/* Autocomplete Dropdown */}
                            {showSuggestions && searchTerm.length > 0 && (
                                <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="max-h-64 overflow-y-auto scrollbar-hide">
                                        {products
                                            .filter(p =>
                                                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
                                            )
                                            .slice(0, 8)
                                            .map(product => (
                                                <div
                                                    key={product.id}
                                                    onClick={() => {
                                                        setSearchTerm(product.name);
                                                        setShowSuggestions(false);
                                                    }}
                                                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between group border-b border-slate-50 last:border-0 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-[10px] group-hover:bg-blue-50 group-hover:text-blue-600 transition-all border border-slate-100">
                                                            {product.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-black group-hover:text-black transition-colors uppercase truncate max-w-[150px]">{product.name}</p>
                                                            <p className="text-[9px] text-black font-bold uppercase tracking-widest mt-0.5">{product.sku || 'No SKU'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-black">PKR {product.sellPrice?.toLocaleString()}</p>
                                                        <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">Stock: {product.stockQty}</p>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                        {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                            <div className="p-8 text-center">
                                                <Package size={24} className="mx-auto text-slate-200 mb-2" />
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No matching products</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-slate-50 px-4 py-2 border-t border-slate-100">
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Showing top results</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {canCreate('inventory') && (
                            <button
                                onClick={() => {
                                    resetForm();
                                    setIsModalOpen(true);
                                }}
                                className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-sm uppercase tracking-widest"
                            >
                                <Plus size={18} />
                                <span>Add Product</span>
                            </button>
                        )}
                    </div>
                </div>



                <div ref={tableScrollRef} className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left min-w-max border-separate border-spacing-0">
                        <thead className="bg-slate-50/80 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 sticky left-0 bg-slate-50/100 z-10 border-b border-slate-100">Product Info</th>
                                <th className="px-6 py-4 border-b border-slate-100 text-center">Stock</th>
                                <th className="px-6 py-4 border-b border-slate-100 text-center">Sell (PKR)</th>
                                <th className="px-6 py-4 border-b border-slate-100 text-center">Cost (PKR)</th>
                                <th className="px-6 py-4 border-b border-slate-100">SKU</th>
                                <th className="px-6 py-4 border-b border-slate-100">Brand</th>
                                <th className="px-6 py-4 border-b border-slate-100 text-center">Expiry</th>
                                <th className="px-6 py-4 border-b border-slate-100">Unit</th>
                                <th className="px-6 py-4 border-b border-slate-100">Weight</th>
                                <th className="px-6 py-4 border-b border-slate-100">Alert</th>
                                <th className="px-6 py-4 border-b border-slate-100">Attributes</th>
                                <th className="px-6 py-4 border-b border-slate-100">Status</th>
                                <th className="px-6 py-4 border-b border-slate-100">Category</th>
                                <th className="px-6 py-4 border-b border-slate-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="transition-all border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                                    <td className="px-6 py-4 sticky left-0 bg-white z-10 border-b border-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                        <div>
                                            <div className="font-bold text-black text-sm uppercase tracking-tight truncate max-w-[150px]">{product.name}</div>
                                            <div className="text-[10px] text-black font-bold uppercase tracking-widest">ID:#{product.id}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-black border-b border-slate-50 text-center">{product.stockQty}</td>
                                    <td className="px-6 py-4 text-center font-bold text-xs text-black border-b border-slate-50">{product.sellPrice?.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center font-bold text-xs text-black border-b border-slate-50">{product.costPrice?.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-black border-b border-slate-50">{product.sku || '-'}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-black uppercase tracking-tight border-b border-slate-50">{product.brand?.name || '-'}</td>
                                    <td className="px-6 py-4 text-center text-[10px] text-black font-bold uppercase border-b border-slate-50">
                                        {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-black uppercase border-b border-slate-50">{product.unit || 'pcs'}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-black border-b border-slate-50">{product.weight ? `${product.weight}kg` : '-'}</td>
                                    <td className="px-6 py-4 text-[10px] text-black font-bold border-b border-slate-50">Min:{product.alertQty || 5}</td>
                                    <td className="px-6 py-4 border-b border-slate-50">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] text-black font-bold uppercase whitespace-nowrap">
                                                {[product.color, product.size, product.grade, product.condition].filter(Boolean).join(' • ') || '-'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 border-b border-slate-50">
                                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${product.stockQty > product.alertQty ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            product.stockQty > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                            <span className={`w-1 h-1 rounded-full ${product.stockQty > product.alertQty ? 'bg-emerald-500' :
                                                product.stockQty > 0 ? 'bg-amber-500' : 'bg-rose-500'
                                                }`}></span>
                                            <span>
                                                {product.stockQty > product.alertQty ? 'In Stock' :
                                                    product.stockQty > 0 ? 'Low Stock' : 'Out of Stock'}
                                            </span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 border-b border-slate-50">
                                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-tight border border-blue-100">
                                            {product.category?.name || 'Uncategorized'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right border-b border-slate-50">
                                        <div className="flex items-center justify-end gap-1.5 transition-all">
                                            {canEdit('inventory') && (
                                                <button onClick={() => openEdit(product)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all shadow-sm border border-blue-100">
                                                    <Edit size={14} />
                                                </button>
                                            )}
                                            {canDelete('inventory') && (
                                                <button onClick={() => handleDelete(product.id)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all shadow-sm border border-rose-100">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <Package size={40} className="mx-auto text-slate-100 mb-3" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No products found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Full-Screen Product Layer */}
            {
                isModalOpen && (
                    <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-white animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all font-sans">
                        {/* Fixed Header */}
                        <div className="px-4 md:px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
                            <div className="min-w-0">
                                <h2 className="text-xl md:text-2xl font-bold text-slate-800 uppercase tracking-tight truncate">{formData.id ? 'Edit Product' : 'Add New Product'}</h2>
                                <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 truncate">Manage inventory details and product specs.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100"
                            >
                                <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">Close Page</span>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Content Area with Fixed Height */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="max-w-7xl mx-auto w-full p-4 md:p-8 pb-24">
                                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                                    {/* Basic Info & SKU & Classification */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <Tag size={12} className="text-black" /> Product Name *
                                            </label>
                                            <input required type="text" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. iPhone 15 Pro" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <Layers size={12} className="text-black" /> SKU Number
                                            </label>
                                            <input type="text" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} placeholder="e.g. PHN-APL-15" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <Box size={12} className="text-black" /> Category
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none"
                                                value={formData.category_name}
                                                onChange={e => setFormData({ ...formData, category_name: e.target.value })}
                                                placeholder="Enter category"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <Tag size={12} className="text-black" /> Brand
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none"
                                                value={formData.brand_name}
                                                onChange={e => setFormData({ ...formData, brand_name: e.target.value })}
                                                placeholder="Enter brand"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <Package size={12} className="text-black" /> Unit
                                            </label>
                                            <select className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none appearance-none cursor-pointer" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                                                <option value="pcs">Pieces (pcs)</option>
                                                <option value="kg">Kilogram (kg)</option>
                                                <option value="gram">Gram (g)</option>
                                                <option value="ltr">Liter (ltr)</option>
                                                <option value="mtr">Meter (m)</option>
                                                <option value="box">Box</option>
                                                <option value="pkt">Packet</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <Box size={12} className="text-black" /> Weight (kg)
                                            </label>
                                            <input type="number" step="0.01" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none" value={formData.weight || ''} onChange={e => setFormData({ ...formData, weight: e.target.value })} placeholder="0.00" />
                                        </div>
                                    </div>

                                    {/* Pricing & Stock */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <DollarSign size={12} className="text-black" /> Cost Price
                                            </label>
                                            <input type="number" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition-all font-bold text-sm outline-none" value={formData.cost_price || ''} onChange={e => setFormData({ ...formData, cost_price: e.target.value })} placeholder="0" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <DollarSign size={12} className="text-black" /> Sell Price *
                                            </label>
                                            <input required type="number" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition-all font-bold text-sm outline-none" value={formData.sell_price || ''} onChange={e => setFormData({ ...formData, sell_price: e.target.value })} placeholder="0" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <Box size={12} className="text-black" /> Initial Stock *
                                            </label>
                                            <input required type="number" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition-all font-bold text-sm outline-none" value={formData.stock_qty || ''} onChange={e => setFormData({ ...formData, stock_qty: e.target.value })} placeholder="0" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <AlertTriangle size={12} className="text-black" /> Low Stock Alert
                                            </label>
                                            <input type="number" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition-all font-bold text-sm outline-none" value={formData.alert_qty || ''} onChange={e => setFormData({ ...formData, alert_qty: e.target.value })} placeholder="5" />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <Clock size={12} className="text-black" /> Expiry Date
                                            </label>
                                            <input type="date" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition-all font-bold text-sm outline-none" value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} />
                                        </div>
                                    </div>



                                    {/* Optional Fields Toggle */}
                                    <div className="pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowOptional(!showOptional)}
                                            className="flex items-center gap-2 text-[11px] font-bold text-black uppercase tracking-widest hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-100"
                                        >
                                            {showOptional ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            {showOptional ? 'Hide' : 'Show'} Optional Specifications
                                        </button>
                                    </div>

                                    {showOptional && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 animate-in slide-in-from-top-2 duration-200">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Color/Variation</label>
                                                <input type="text" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition-all font-bold text-sm outline-none" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} placeholder="e.g. Sierra Blue" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Size/Dimensions</label>
                                                <input type="text" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition-all font-bold text-sm outline-none" value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })} placeholder="e.g. 6.7 inch" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Product Grade</label>
                                                <input type="text" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition-all font-bold text-sm outline-none" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} placeholder="e.g. Grade A+" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Condition</label>
                                                <input type="text" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition-all font-bold text-sm outline-none" value={formData.condition} onChange={e => setFormData({ ...formData, condition: e.target.value })} placeholder="e.g. New" />
                                            </div>

                                            <div className="space-y-2 md:col-span-3">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                                    Description
                                                </label>
                                                <textarea className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none min-h-[100px]" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Additional product details..." />
                                            </div>
                                        </div>
                                    )}



                                    <div className="pt-6 sticky bottom-0 bg-white pb-8">
                                        <button type="submit" disabled={saving} className="w-full py-4 bg-blue-950 text-white font-bold rounded-xl hover:bg-slate-900 transition-all shadow-xl shadow-blue-950/20 active:scale-[0.98] flex items-center justify-center gap-3 text-sm uppercase tracking-widest disabled:opacity-70">
                                            {saving ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>Saving Product Details...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Check size={22} />
                                                    <span>{formData.id ? 'Update Product Information' : 'Complete Product Registration'}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default Products;
