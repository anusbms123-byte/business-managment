import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Search, Edit, Trash2, X, Package,
    ShoppingCart, AlertTriangle, Check, Layers,
    Tag, DollarSign, Box, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { canCreate, canEdit, canDelete } from '../utils/permissions';
import { useDialog } from '../context/DialogContext';


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
                    <p className="text-2xl font-bold text-black dark:text-slate-100 tracking-tight">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${borderColors[color] || 'border-emerald-500'}`}>
                    <Icon size={18} className={color === 'gray' ? 'text-slate-500' : color === 'red' ? 'text-rose-500' : color === 'orange' ? 'text-orange-500' : 'text-emerald-500'} />
                </div>
            </div>
        </div>
    );
};

// Searchable and Creatable Dropdown Component
const CreatableSelect = ({ label, icon: Icon, value, onChange, onDeleteOption, options, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value || '');

    // Sync search term with external value changes
    useEffect(() => {
        setSearchTerm(value || '');
    }, [value]);

    const filteredOptions = options.filter(opt =>
        (opt.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative space-y-2">
            <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">
                {label}
            </label>
            <div className="relative">
                <input
                    type="text"
                    className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-emerald-500 dark:focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/5 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
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
                    <div className="absolute z-[100] w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar py-2 animate-in fade-in zoom-in-95 duration-200">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div
                                    key={opt.id}
                                    className="px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-sm font-medium text-black dark:text-slate-200 transition-colors flex items-center justify-between group/opt"
                                    onMouseDown={(e) => {
                                        // If clicked target is not the delete button
                                        if (!e.target.closest('.delete-opt-btn')) {
                                            e.preventDefault();
                                            setSearchTerm(opt.name);
                                            onChange(opt.name);
                                            setIsOpen(false);
                                        }
                                    }}
                                >
                                    <span>{opt.name}</span>
                                    <div className="flex items-center gap-2">
                                        {onDeleteOption && (
                                            <button
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onDeleteOption(opt);
                                                }}
                                                className="delete-opt-btn p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/40 rounded-lg transition-all opacity-0 group-hover/opt:opacity-100"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-tight bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Select</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-5 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10 flex items-center gap-2">
                                <Plus size={14} />
                                <span>Add new: "{searchTerm}"</span>
                            </div>
                        )}
                    </div>
                )}
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
    const [filterColor, setFilterColor] = useState('');
    const [filterSize, setFilterSize] = useState('');
    const [filterGrade, setFilterGrade] = useState('');

    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        id: null, name: '', sku: '', description: '', unit: 'pcs',
        cost_price: '', sell_price: '', stock_qty: '', alert_qty: '5',
        weight: '', expiry_date: '', category_name: '', brand_name: '',
        color: '', size: '', grade: '', condition: ''
    });

    const { showAlert, showConfirm, showError } = useDialog();

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
        totalValue: products.reduce((acc, p) => acc + (p.stockQty * p.sell_price), 0),
        uniqueColors: [...new Set(products.map(p => p.color).filter(Boolean))],
        uniqueSizes: [...new Set(products.map(p => p.size).filter(Boolean))],
        uniqueGrades: [...new Set(products.map(p => p.grade).filter(Boolean))]
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
                        showError("Failed to create category: " + newCat.message);
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
                        showError("Failed to create brand: " + newBrand.message);
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
                showError("Error: " + result.message);
            }
        } catch (error) {
            console.error("Submission Error:", error);
            showError("An unexpected error occurred.");
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({
            id: null, name: '', sku: '', description: '', unit: 'pcs',
            cost_price: '', sell_price: '', stock_qty: '', alert_qty: '5',
            weight: '', expiry_date: '', category_name: '', brand_name: '',
            color: '', size: '', grade: '', condition: ''
        });
        setShowOptional(false);
    };

    const handleDeleteCategory = async (id) => {
        showConfirm("Are you sure you want to delete this category?", async () => {
            try {
                const result = await window.electronAPI.deleteCategory(id);
                if (result.success) {
                    const currentCats = await window.electronAPI.getCategories(currentUser.company_id);
                    setCategories(Array.isArray(currentCats) ? currentCats : []);
                    const deletedCat = categories.find(c => c.id === id);
                    if (formData.category_name === deletedCat?.name) {
                        setFormData(prev => ({ ...prev, category_name: '' }));
                    }
                } else {
                    showError("Failed to delete category: " + result.message);
                }
            } catch (err) {
                showError("Error deleting category");
            }
        });
    };

    const handleDeleteBrand = async (id) => {
        showConfirm("Are you sure you want to delete this brand?", async () => {
            try {
                const result = await window.electronAPI.deleteBrand(id);
                if (result.success) {
                    const currentBrands = await window.electronAPI.getBrands(currentUser.company_id);
                    setBrands(Array.isArray(currentBrands) ? currentBrands : []);
                    const deletedBrand = brands.find(b => b.id === id);
                    if (formData.brand_name === deletedBrand?.name) {
                        setFormData(prev => ({ ...prev, brand_name: '' }));
                    }
                } else {
                    showError("Failed to delete brand: " + result.message);
                }
            } catch (err) {
                showError("Error deleting brand");
            }
        });
    };

    const handleDelete = async (id) => {
        showConfirm("Are you sure you want to delete this product?", async () => {
            const result = await window.electronAPI.deleteProduct(id);
            if (result.success) fetchData();
            else showError("Error: " + result.message);
        });
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
        const lowerSearch = searchTerm.toLowerCase();
        const matchesSearch =
            p.name.toLowerCase().includes(lowerSearch) ||
            p.sku?.toLowerCase().includes(lowerSearch) ||
            p.id?.toString().includes(searchTerm) ||
            p.category?.name?.toLowerCase().includes(lowerSearch) ||
            p.brand?.name?.toLowerCase().includes(lowerSearch) ||
            p.color?.toLowerCase().includes(lowerSearch) ||
            p.size?.toLowerCase().includes(lowerSearch) ||
            p.unit?.toLowerCase().includes(lowerSearch) ||
            p.grade?.toLowerCase().includes(lowerSearch);

        const matchesUnit = filterUnit ? p.unit === filterUnit : true;
        const matchesCategory = filterCategory ? p.category?.id == filterCategory : true;
        const matchesBrand = filterBrand ? p.brand?.id == filterBrand : true;
        const matchesColor = filterColor ? p.color === filterColor : true;
        const matchesSize = filterSize ? p.size === filterSize : true;
        const matchesGrade = filterGrade ? p.grade === filterGrade : true;

        let matchesStock = true;
        if (filterStockStatus === 'instock') matchesStock = p.stockQty > (p.alertQty || 5);
        if (filterStockStatus === 'lowstock') matchesStock = p.stockQty > 0 && p.stockQty <= (p.alertQty || 5);
        if (filterStockStatus === 'outofstock') matchesStock = p.stockQty <= 0;
        if (filterStockStatus === 'expired') matchesStock = p.expiryDate && new Date(p.expiryDate) < new Date();

        return (matchesSearch && matchesUnit && matchesCategory && matchesBrand && matchesStock && matchesColor && matchesSize && matchesGrade);
    }).sort((a, b) => (b.id || 0) - (a.id || 0));

    return (
        <div className="relative animate-in fade-in duration-500">
            {/* Table Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/20">

                    {/* Filters Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
                        {/* Category Filter */}
                        <select
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-bold"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="">Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        {/* Brand Filter */}
                        <select
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-semibold transition-all"
                            value={filterBrand}
                            onChange={(e) => setFilterBrand(e.target.value)}
                        >
                            <option value="">Brands</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>

                        {/* Unit Filter */}
                        <select
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-semibold transition-all"
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
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-semibold transition-all"
                            value={filterColor}
                            onChange={(e) => setFilterColor(e.target.value)}
                        >
                            <option value="">Colors</option>
                            {stats.uniqueColors.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        {/* Size Filter */}
                        <select
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-semibold transition-all"
                            value={filterSize}
                            onChange={(e) => setFilterSize(e.target.value)}
                        >
                            <option value="">Sizes</option>
                            {stats.uniqueSizes.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        {/* Grade Filter */}
                        <select
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-semibold transition-all"
                            value={filterGrade}
                            onChange={(e) => setFilterGrade(e.target.value)}
                        >
                            <option value="">Grades</option>
                            {stats.uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>

                        {/* Stock Filter */}
                        <select
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-black dark:text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none font-semibold transition-all"
                            value={filterStockStatus}
                            onChange={(e) => setFilterStockStatus(e.target.value)}
                        >
                            <option value="">Status</option>
                            <option value="instock">In stock</option>
                            <option value="lowstock">Low stock</option>
                            <option value="outofstock">Out of stock</option>
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
                                setFilterStockStatus('');
                            }}
                            className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-sm rounded-lg p-2.5 transition-all font-bold group"
                            title="Clear All Filters"
                        >
                            <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span className="lg:hidden xl:inline">Reset</span>
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/5 transition-all font-semibold text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                placeholder="Search here..."
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
                                <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                        {products
                                            .filter(p => {
                                                const lowerSearch = searchTerm.toLowerCase();
                                                return p.name.toLowerCase().includes(lowerSearch) ||
                                                    p.sku?.toLowerCase().includes(lowerSearch) ||
                                                    p.id?.toString().includes(searchTerm) ||
                                                    p.category?.name?.toLowerCase().includes(lowerSearch) ||
                                                    p.brand?.name?.toLowerCase().includes(lowerSearch) ||
                                                    p.color?.toLowerCase().includes(lowerSearch) ||
                                                    p.size?.toLowerCase().includes(lowerSearch);
                                            })
                                            .slice(0, 8)
                                            .map(product => (
                                                <div
                                                    key={product.id}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setSearchTerm(product.name);
                                                        setShowSuggestions(false);
                                                    }}
                                                    className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-center justify-between group border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 font-semibold text-xs group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all border border-slate-100 dark:border-slate-700">
                                                            {product.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-semibold text-black dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[150px]">{product.name}</p>
                                                            <p className="text-xs text-black dark:text-slate-400 font-semibold tracking-tight mt-0.5">{product.sku || 'No ID'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-semibold text-black dark:text-slate-200">PKR {product.sellPrice?.toLocaleString()}</p>
                                                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">Stock: {product.stockQty}</p>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                        {products.filter(p => {
                                            const lowerSearch = searchTerm.toLowerCase();
                                            return p.name.toLowerCase().includes(lowerSearch) ||
                                                p.sku?.toLowerCase().includes(lowerSearch) ||
                                                p.id?.toString().includes(searchTerm) ||
                                                p.category?.name?.toLowerCase().includes(lowerSearch) ||
                                                p.brand?.name?.toLowerCase().includes(lowerSearch) ||
                                                p.color?.toLowerCase().includes(lowerSearch) ||
                                                p.size?.toLowerCase().includes(lowerSearch);
                                        }).length === 0 && (
                                                <div className="p-8 text-center text-left">
                                                    <Package size={24} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                                                    <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 tracking-tight">No matching products</p>
                                                </div>
                                            )}
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-tight text-center">Top results</p>
                                        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 tracking-tight text-center">Top results</p>
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
                                className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-all active:scale-95 text-sm tracking-tight"
                            >
                                <Plus size={18} />
                                <span>Add product</span>
                            </button>
                        )}
                    </div>
                </div>



                <div ref={tableScrollRef} className="overflow-x-auto scrollbar-hide font-sans">
                    <table className="w-full text-left min-w-max border-separate border-spacing-0">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-black dark:text-white font-bold text-sm tracking-tight border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800">ID</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800">Name</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Cost Price</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Sell Price</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800">Unit</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Stock</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800">Weight</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800">Brand</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Color</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Size</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Grade</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Condition</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-center">Expiry</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800">Alert</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800">Category</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800">Status</th>
                                <th className="px-14 py-4 border-b border-slate-200 dark:border-slate-800 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="transition-all border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50/30 dark:hover:bg-slate-800/30">
                                    <td className="px-14 py-4 text-sm font-bold text-black dark:text-slate-100">{product.sku || '-'}</td>
                                    <td className="px-14 py-4 text-sm font-bold text-black dark:text-slate-100 truncate max-w-[200px]">{product.name}</td>
                                    <td className="px-14 py-4 text-center text-sm font-bold text-black dark:text-slate-100">{product.costPrice?.toLocaleString()}</td>
                                    <td className="px-14 py-4 text-center text-sm font-bold text-black dark:text-slate-100">{product.sellPrice?.toLocaleString()}</td>
                                    <td className="px-14 py-4 text-sm font-bold text-black dark:text-slate-100">{product.unit || 'pcs'}</td>
                                    <td className="px-14 py-4 text-center text-sm font-bold text-black dark:text-slate-100">{product.stockQty}</td>
                                    <td className="px-14 py-4 text-sm font-bold text-black dark:text-slate-100">{product.weight ? `${product.weight}kg` : '-'}</td>
                                    <td className="px-14 py-4 text-sm font-bold text-black dark:text-slate-100">{product.brand?.name || '-'}</td>
                                    <td className="px-14 py-4 text-center text-sm font-bold text-black dark:text-slate-100">{product.color || '-'}</td>
                                    <td className="px-14 py-4 text-center text-sm font-bold text-black dark:text-slate-100">{product.size || '-'}</td>
                                    <td className="px-14 py-4 text-center text-sm font-bold text-black dark:text-slate-100">{product.grade || '-'}</td>
                                    <td className="px-14 py-4 text-center text-sm font-bold text-black dark:text-slate-100">{product.condition || '-'}</td>
                                    <td className="px-14 py-4 text-center text-sm font-bold text-black dark:text-slate-100">
                                        {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-14 py-4 text-sm font-bold text-black dark:text-slate-100">Min:{product.alertQty || 5}</td>
                                    <td className="px-14 py-4">
                                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded text-sm font-bold border border-emerald-100 dark:border-emerald-900">
                                            {product.category?.name || 'Uncategorized'}
                                        </span>
                                    </td>
                                     <td className="px-14 py-4 border-b border-slate-50 dark:border-slate-800">
                                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-sm font-semibold border ${product.stockQty > (product.alertQty || 5) ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50' :
                                            product.stockQty > 0 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50'
                                            }`}>
                                            <span className={`w-1 h-1 rounded-full ${product.stockQty > (product.alertQty || 5) ? 'bg-emerald-500' :
                                                product.stockQty > 0 ? 'bg-amber-500' : 'bg-rose-500'
                                                }`}></span>
                                            <span>
                                                {product.stockQty > (product.alertQty || 5) ? 'In stock' :
                                                    product.stockQty > 0 ? 'Low stock' : 'Out of stock'}
                                            </span>
                                        </span>
                                    </td>
                                    <td className="px-10 py-4 text-right border-b border-slate-50 dark:border-slate-800">
                                        <div className="flex items-center justify-end gap-1.5 transition-all">
                                            {canEdit('inventory') && (
                                                <button onClick={() => openEdit(product)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-all shadow-sm border border-blue-100 dark:border-blue-800">
                                                    <Edit size={14} />
                                                </button>
                                            )}
                                            {canDelete('inventory') && (
                                                <button onClick={() => handleDelete(product.id)} className="p-2 text-rose-600 bg-rose-50 dark:bg-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg transition-all shadow-sm border border-rose-100 dark:border-rose-800">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="17" className="px-6 py-20 text-center">
                                        <Package size={40} className="mx-auto text-slate-100 dark:text-slate-800 mb-3" />
                                        <p className="text-slate-400 dark:text-slate-500 font-semibold text-sm tracking-tight">No records found</p>
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
                    <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-white dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all font-sans">
                        {/* Fixed Header */}
                        <div className="px-4 md:px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-800 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <Package size={22} />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl md:text-2xl font-semibold text-black dark:text-slate-100 tracking-tight">{formData.id ? 'Edit product' : 'Add product'}</h2>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-3 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50"
                            >
                                <span className="text-sm font-semibold tracking-tight hidden md:block">Close</span>
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
                                             <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">
                                                 Name *
                                             </label>
                                             <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Enter Product Name" />
                                         </div>
                                         <div className="space-y-2">
                                             <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">
                                                 ID
                                             </label>
                                             <input type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} placeholder="ID" />
                                         </div>
                                         <CreatableSelect
                                             label="Category"
                                             icon={Box}
                                             value={formData.category_name}
                                             options={categories}
                                             onChange={(val) => setFormData({ ...formData, category_name: val })}
                                             onDeleteOption={(opt) => handleDeleteCategory(opt.id)}
                                             placeholder="Category name"
                                         />
                                         <CreatableSelect
                                             label="Brand"
                                             icon={Tag}
                                             value={formData.brand_name}
                                             options={brands}
                                             onChange={(val) => setFormData({ ...formData, brand_name: val })}
                                             onDeleteOption={(opt) => handleDeleteBrand(opt.id)}
                                             placeholder="Brand name"
                                         />
                                         <div className="space-y-2">
                                             <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">
                                                 Unit
                                             </label>
                                             <select className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all font-semibold text-sm outline-none appearance-none cursor-pointer text-black dark:text-slate-100" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
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
                                             <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">
                                                 Weight (kg)
                                             </label>
                                             <input type="number" step="0.01" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={formData.weight || ''} onChange={e => setFormData({ ...formData, weight: e.target.value })} placeholder="0.00" />
                                         </div>
                                     </div>

                                     {/* Pricing & Stock */}
                                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                         <div className="space-y-2">
                                             <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">
                                                 Cost price
                                             </label>
                                             <input type="number" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-emerald-500 dark:focus:border-emerald-600 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={formData.cost_price || ''} onChange={e => setFormData({ ...formData, cost_price: e.target.value })} placeholder="Cost price" />
                                         </div>
                                         <div className="space-y-2">
                                             <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">
                                                 Sell price *
                                             </label>
                                             <input required type="number" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={formData.sell_price || ''} onChange={e => setFormData({ ...formData, sell_price: e.target.value })} placeholder="Sell price" />
                                         </div>
                                         <div className="space-y-2">
                                             <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">
                                                 Stock *
                                             </label>
                                             <input required type="number" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={formData.stock_qty || ''} onChange={e => setFormData({ ...formData, stock_qty: e.target.value })} placeholder="0" />
                                         </div>
                                         <div className="space-y-2">
                                             <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">
                                                 Alert
                                             </label>
                                             <input type="number" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={formData.alert_qty || ''} onChange={e => setFormData({ ...formData, alert_qty: e.target.value })} placeholder="5" />
                                         </div>
                                         <div className="space-y-2 md:col-span-2">
                                             <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">
                                                 Expiry date
                                             </label>
                                             <input type="date" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100" value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} />
                                         </div>
                                     </div>



                                     {/* Optional Fields Toggle */}
                                     <div className="pt-4">
                                         <button
                                             type="button"
                                             onClick={() => setShowOptional(!showOptional)}
                                             className="flex items-center gap-2 text-sm font-semibold text-black dark:text-slate-300 tracking-tight hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-100 dark:border-slate-700"
                                         >
                                             {showOptional ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                             {showOptional ? 'Hide' : 'Show'} optional specifications
                                         </button>
                                     </div>

                                     {showOptional && (
                                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 animate-in slide-in-from-top-2 duration-200">
                                             <div className="space-y-2">
                                                 <label className="text-sm font-semibold text-black dark:text-slate-300 tracking-tight ml-1">Color/variation</label>
                                                 <input type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} placeholder="e.g. Sierra Blue" />
                                             </div>
                                             <div className="space-y-2">
                                                 <label className="text-sm font-semibold text-black dark:text-slate-300 tracking-tight ml-1">Size/dimensions</label>
                                                 <input type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })} placeholder="e.g. 6.7 inch" />
                                             </div>
                                             <div className="space-y-2">
                                                 <label className="text-sm font-semibold text-black dark:text-slate-300 tracking-tight ml-1">Product grade</label>
                                                 <input type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} placeholder="e.g. Grade A+" />
                                             </div>
                                             <div className="space-y-2">
                                                 <label className="text-sm font-semibold text-black dark:text-slate-300 tracking-tight ml-1">Condition</label>
                                                 <input type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 transition-all font-semibold text-sm outline-none text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={formData.condition} onChange={e => setFormData({ ...formData, condition: e.target.value })} placeholder="e.g. New" />
                                             </div>

                                             <div className="space-y-2 md:col-span-3">
                                                 <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight ml-1">
                                                     Description
                                                 </label>
                                                 <textarea className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-750 focus:border-blue-500 dark:focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all font-semibold text-sm outline-none min-h-[100px] text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Additional product details..." />
                                             </div>
                                         </div>
                                    )}
                                    <div className="pt-6 sticky bottom-0 bg-white dark:bg-slate-900 pb-8 transition-colors duration-300">
                                        <button type="submit" disabled={saving} className="w-full py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-sm tracking-tight disabled:opacity-70">
                                            {saving ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>Saving...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Check size={20} />
                                                    <span>{formData.id ? 'Update now' : 'Save now'}</span>
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
        </div>
    );
};

export default Products;
