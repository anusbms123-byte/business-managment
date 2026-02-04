import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2, Building2, Phone,
    Mail, MapPin, Truck, X, Check, Home, User, Loader2
} from 'lucide-react';
import { canCreate, canEdit, canDelete } from '../utils/permissions';

const Suppliers = ({ currentUser }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        company_name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        gst_no: '',
        openingBalance: ''
    });

    useEffect(() => { loadSuppliers(); }, [currentUser]);

    const loadSuppliers = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.getVendors(currentUser?.company_id);
                setSuppliers(Array.isArray(data) ? data : []);
                if (data?.success === false) console.error("Supplier Error:", data.message);
            }
        } catch (err) {
            console.error('Error loading suppliers:', err);
            setSuppliers([]);
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = {
                ...formData,
                companyId: currentUser?.company_id,
                balance: Number(formData.openingBalance) || 0,
                opening_balance: formData.id ? undefined : (Number(formData.openingBalance) || 0)
            };
            let result;
            if (formData.id) {
                result = await window.electronAPI.updateVendor(data);
            } else {
                result = await window.electronAPI.createVendor(data);
            }

            if (result?.success === false) {
                window.alert(result.message);
            } else {
                setShowModal(false);
                loadSuppliers();
            }
        } catch (err) {
            window.alert('Error saving supplier: ' + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this supplier?')) return;
        try {
            const result = await window.electronAPI.deleteVendor(id);
            if (result?.success === false) {
                window.alert(result.message);
            } else {
                loadSuppliers();
            }
        } catch (err) {
            window.alert('Error deleting supplier: ' + err.message);
        }
    };

    const openModal = (supplier = null) => {
        setFormData(supplier ? {
            id: supplier.id,
            name: supplier.name,
            company_name: supplier.companyName || '',
            contact_person: supplier.contactPerson || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
            city: supplier.city || '',
            gst_no: supplier.gstNo || '',
            openingBalance: supplier.balance || ''
        } : {
            id: null,
            name: '',
            company_name: '',
            contact_person: '',
            phone: '',
            email: '',
            address: '',
            city: '',
            gst_no: '',
            openingBalance: ''
        });
        setShowModal(true);
    };

    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.includes(search)
    );

    return (
        <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700">



            {/* Main Content Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
                            placeholder="Find suppliers..."
                        />
                    </div>
                    {canCreate('suppliers') && (
                        <button
                            onClick={() => openModal()}
                            className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-sm uppercase tracking-widest"
                        >
                            <Plus size={18} />
                            <span>Add New Supplier</span>
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest border-b border-slate-100">Vendor / Company</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest border-b border-slate-100">Contact Person</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest border-b border-slate-100">Contact Info</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest border-b border-slate-100">Location</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest border-b border-slate-100">Outstandings</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-3 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Fetching suppliers...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-20 text-center">
                                        <div className="max-w-xs mx-auto space-y-3">
                                            <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center mx-auto text-slate-300">
                                                <Truck size={32} />
                                            </div>
                                            <p className="text-slate-400 font-bold">No suppliers found matching your search.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors group border-b border-slate-50 last:border-0">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-bold text-black group-hover:text-black transition-colors text-sm uppercase tracking-tight">{supplier.name}</p>
                                            <p className="text-[10px] font-bold text-black uppercase tracking-widest mt-0.5">{supplier.companyName || 'Individual'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-bold text-black">{supplier.contactPerson || 'N/A'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-black font-bold">
                                                <Phone size={12} className="text-black" />
                                                {supplier.phone || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-black font-bold uppercase tracking-tight">
                                                GST: {supplier.gstNo || 'N/A'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col max-w-[180px]">
                                            <div className="flex items-center gap-1.5 font-bold text-black text-xs">
                                                <MapPin size={12} className="text-blue-500" /> {supplier.city || 'No City'}
                                            </div>
                                            <p className="text-[10px] text-black font-bold truncate mt-1">{supplier.address || 'No address'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-bold border ${(supplier.balance || 0) > 0
                                                ? 'bg-rose-50 text-rose-600 border-rose-100'
                                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>
                                                PKR {(supplier.balance || 0).toLocaleString()}
                                            </div>
                                            <p className="text-[9px] text-black font-bold uppercase tracking-tight mt-1">Open: {supplier.openingBalance || 0}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 transition-opacity">
                                            {canEdit('suppliers') && (
                                                <button
                                                    onClick={() => openModal(supplier)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {canDelete('suppliers') && (
                                                <button
                                                    onClick={() => handleDelete(supplier.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Redesigned Modal */}
            {showModal && (
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-white animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* Full-Page Header */}
                        <div className="px-4 md:px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
                            <div className="min-w-0">
                                <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight truncate">{formData.id ? 'Edit Supplier Profile' : 'Register New Supplier'}</h3>
                                <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 truncate">Maintain vendor relationships and accounts.</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100"
                            >
                                <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">Close Page</span>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="max-w-7xl mx-auto w-full p-4 md:p-8 pb-24">
                            <form onSubmit={handleSave} className="space-y-8 md:space-y-12">

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                    <div className="space-y-4 md:space-y-6">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                                            Company Details
                                        </h4>
                                        <div className="space-y-2 text-left">
                                            <label className="text-xs font-bold text-slate-600 ml-1">Supplier Name / Business Name *</label>
                                            <div className="relative">
                                                <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-sm font-bold"
                                                    placeholder="e.g. ABC Enterprises"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2 text-left">
                                                <label className="text-xs font-bold text-slate-600 ml-1">Phone Number</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input
                                                        type="text"
                                                        value={formData.phone}
                                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold"
                                                        placeholder="03xx-xxxxxxx"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-left">
                                                <label className="text-xs font-bold text-slate-600 ml-1">Contact Person</label>
                                                <div className="relative">
                                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input
                                                        type="text"
                                                        value={formData.contact_person}
                                                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold"
                                                        placeholder="Name"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-left">
                                            <label className="text-xs font-bold text-slate-600 ml-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold"
                                                    placeholder="vendor@company.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-left">
                                            <label className="text-xs font-bold text-slate-600 ml-1">GST / Tax Number</label>
                                            <input
                                                type="text"
                                                value={formData.gst_no}
                                                onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold"
                                                placeholder="Tax ID"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 md:space-y-6">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                                            Location & Accounts
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2 text-left">
                                                <label className="text-xs font-bold text-slate-600 ml-1">City</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input
                                                        type="text"
                                                        value={formData.city}
                                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold"
                                                        placeholder="City"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-left">
                                                <label className="text-xs font-bold text-slate-600 ml-1">{formData.id ? 'Current Balance' : 'Opening Balance'}</label>
                                                <input
                                                    type="number"
                                                    value={formData.openingBalance || ''}
                                                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-bold"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-left">
                                            <label className="text-xs font-bold text-slate-600 ml-1">Business Address</label>
                                            <textarea
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                rows="3"
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all font-bold text-sm outline-none resize-none"
                                                placeholder="Full office/warehouse address..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 sticky bottom-0 bg-white pb-8">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full py-4 bg-blue-950 text-white font-bold rounded-xl hover:bg-slate-900 transition-all shadow-xl shadow-blue-950/20 active:scale-[0.98] flex items-center justify-center gap-3 text-sm uppercase tracking-widest disabled:opacity-70"
                                    >
                                        {saving ? <Loader2 size={20} className="animate-spin" /> : <Check size={22} />}
                                        {formData.id ? 'Update Supplier Information' : 'Complete Registration Process'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

            )}
        </div>
    );
};

export default Suppliers;
