import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Search, Edit, Trash2, X, Package,
    ShoppingCart, AlertTriangle, Check, Layers,
    Tag, DollarSign, Box
} from 'lucide-react';

// Premium Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
    const colors = {
        orange: 'bg-white border-l-4 border-l-blue-500',
        emerald: 'bg-white border-l-4 border-l-emerald-500',
        red: 'bg-white border-l-4 border-l-rose-500',
        blue: 'bg-white border-l-4 border-l-indigo-500',
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

const Products = ({ currentUser }) => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        id: null, name: '', sku: '', description: '', unit: 'pcs',
        cost_price: 0, sell_price: 0, stock_qty: 0, alert_qty: 5,
        weight: '', expiry_date: '', category_id: '', brand_id: ''
    });

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

                if (fetchedProducts?.success === false) console.error("Product Error:", fetchedProducts.message);
                if (fetchedCategories?.success === false) console.error("Category Error:", fetchedCategories.message);
                if (fetchedBrands?.success === false) console.error("Brand Error:", fetchedBrands.message);

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
        lowStock: products.filter(p => p.stockQty > 0 && p.stockQty <= (p.alertQty || 5)).length,
        outOfStock: products.filter(p => p.stockQty <= 0).length,
        totalValue: products.reduce((acc, p) => acc + (p.stockQty * p.sellPrice), 0)
    }), [products]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...formData, companyId: currentUser.company_id };

        let result = formData.id
            ? await window.electronAPI.updateProduct(payload)
            : await window.electronAPI.createProduct(payload);

        if (result.success) {
            setIsModalOpen(false);
            setFormData({
                id: null, name: '', sku: '', description: '', unit: 'pcs',
                cost_price: 0, sell_price: 0, stock_qty: 0, alert_qty: 5,
                weight: '', expiry_date: '', category_id: '', brand_id: ''
            });
            fetchData();
        } else {
            alert("Error: " + result.message);
        }
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
            category_id: product.categoryId || '',
            brand_id: product.brandId || ''
        });
        setIsModalOpen(true);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Total Products" value={stats.total} icon={Package} color="blue" />
                <StatCard title="Total Stock Value" value={`PKR ${stats.totalValue.toLocaleString()}`} icon={DollarSign} color="orange" />
                <StatCard title="Low Stock Items" value={stats.lowStock} icon={AlertTriangle} color="red" />
                <StatCard title="Out of Stock" value={stats.outOfStock} icon={X} color="gray" />
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/20">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setFormData({
                                id: null, name: '', sku: '', description: '', unit: 'pcs',
                                cost_price: 0, sell_price: 0, stock_qty: 0, alert_qty: 5,
                                weight: '', expiry_date: '', category_id: '', brand_id: ''
                            });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100 active:scale-95 text-sm uppercase tracking-widest"
                    >
                        <Plus size={18} />
                        <span>Add Product</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Product Details</th>
                                <th className="px-6 py-4">Inventory</th>
                                <th className="px-6 py-4">Pricing</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-slate-50/50 transition-all group border-b border-slate-50 last:border-0">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold transition-transform group-hover:scale-110">
                                                {product.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors uppercase tracking-tight">{product.name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SKU: {product.sku || 'N/A'} • {product.brand?.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-600">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold">{product.stockQty} Units</span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{product.category?.name || 'General'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-slate-800">PKR {product.sellPrice?.toLocaleString()}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cost: PKR {product.costPrice?.toLocaleString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${product.stockQty > product.alertQty ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            product.stockQty > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                            <span className={`w-1 h-1 rounded-full ${product.stockQty > product.alertQty ? 'bg-emerald-500' :
                                                product.stockQty > 0 ? 'bg-amber-500' : 'bg-rose-500'
                                                }`}></span>
                                            <span>
                                                {product.stockQty > product.alertQty ? 'Instock' :
                                                    product.stockQty > 0 ? 'Low Stock' : 'Out of Stock'}
                                            </span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <button onClick={() => openEdit(product)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(product.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <Package size={40} className="mx-auto text-slate-100 mb-3" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No products found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Premium Product Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 text-left border border-slate-200">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">{formData.id ? 'Edit Product' : 'Add New Product'}</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Manage inventory details and product specs.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        <Tag size={12} className="text-blue-500" /> Product Name *
                                    </label>
                                    <input required type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. iPhone 15 Pro" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        <Layers size={12} className="text-blue-500" /> SKU Number
                                    </label>
                                    <input type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} placeholder="e.g. PHN-APL-15" />
                                </div>
                            </div>

                            {/* Units & Description */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        <Package size={12} className="text-blue-500" /> Unit
                                    </label>
                                    <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none appearance-none cursor-pointer" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                                        <option value="pcs">Pieces (pcs)</option>
                                        <option value="kg">Kilogram (kg)</option>
                                        <option value="gram">Gram (g)</option>
                                        <option value="ltr">Liter (ltr)</option>
                                        <option value="mtr">Meter (m)</option>
                                        <option value="box">Box</option>
                                        <option value="pkt">Packet</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        <Check size={12} className="text-blue-500" /> Expiry Date
                                    </label>
                                    <input type="date" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none" value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                    Description
                                </label>
                                <textarea className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none min-h-[80px]" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Additional product details..." />
                            </div>

                            {/* Classification */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        <Box size={12} className="text-blue-500" /> Category
                                    </label>
                                    <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none appearance-none cursor-pointer" value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })}>
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        <Tag size={12} className="text-blue-500" /> Brand
                                    </label>
                                    <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm outline-none appearance-none cursor-pointer" value={formData.brand_id} onChange={e => setFormData({ ...formData, brand_id: e.target.value })}>
                                        <option value="">Select Brand</option>
                                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Inventory & Pricing */}
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-2 lg:grid-cols-5 gap-4">
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Cost</label>
                                    <input type="number" className="w-full bg-white px-3 py-2 rounded-lg border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 transition-all text-slate-800" value={formData.cost_price} onChange={e => setFormData({ ...formData, cost_price: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Sell</label>
                                    <input required type="number" className="w-full bg-white px-3 py-2 rounded-lg border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 transition-all text-slate-800" value={formData.sell_price} onChange={e => setFormData({ ...formData, sell_price: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Stock</label>
                                    <input required type="number" className="w-full bg-white px-3 py-2 rounded-lg border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 transition-all text-slate-800" value={formData.stock_qty} onChange={e => setFormData({ ...formData, stock_qty: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Min Alert</label>
                                    <input type="number" className="w-full bg-white px-3 py-2 rounded-lg border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 transition-all text-slate-800" value={formData.alert_qty} onChange={e => setFormData({ ...formData, alert_qty: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Weight</label>
                                    <input type="number" step="0.01" className="w-full bg-white px-3 py-2 rounded-lg border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 transition-all text-slate-800" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} placeholder="kg" />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
                                <Check size={20} />
                                {formData.id ? 'Save Product' : 'Complete Setup'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Products;
