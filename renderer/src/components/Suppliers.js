import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2, Building2, Phone,
    Mail, MapPin, Truck, DollarSign, X, Check,
    MoreHorizontal, TrendingDown, Clock, Info
} from 'lucide-react';
import { canCreate, canEdit, canDelete } from '../utils/permissions';


// Premium Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
    const colors = {
        orange: 'bg-white border-l-4 border-l-blue-500',
        emerald: 'bg-white border-l-4 border-l-emerald-500',
        red: 'bg-white border-l-4 border-l-rose-500',
        blue: 'bg-white border-l-4 border-l-indigo-500',
        purple: 'bg-white border-l-4 border-l-indigo-500',
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
        openingBalance: 0
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
                // Ensure backend receives these fields
                balance: formData.openingBalance,
                opening_balance: formData.openingBalance
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
            openingBalance: supplier.balance || supplier.openingBalance || 0
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
            openingBalance: 0
        });
        setShowModal(true);
    };

    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.includes(search)
    );

    const totalPayable = suppliers.reduce((acc, s) => acc + (s.balance || 0), 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Vendor List</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your suppliers, track their info, and see what you owe.</p>
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

            {/* Stat Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Total Payables"
                    value={`PKR ${totalPayable.toLocaleString()}`}
                    icon={DollarSign}
                    color="red"
                />
                <StatCard
                    title="Active Suppliers"
                    value={suppliers.length}
                    icon={Truck}
                    color="blue"
                />
                <StatCard
                    title="City Coverage"
                    value={[...new Set(suppliers.map(s => s.city).filter(Boolean))].length}
                    icon={MapPin}
                    color="emerald"
                />
                <StatCard
                    title="Avg. Debt"
                    value={`PKR ${suppliers.length ? Math.round(totalPayable / suppliers.length).toLocaleString() : 0}`}
                    icon={TrendingDown}
                    color="gray"
                />
            </div>



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
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Vendor / Company</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Contact Person</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Contact Info</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Location</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Outstandings</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-3 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Fetching suppliers...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
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
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="relative w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm transition-transform group-hover:scale-110">
                                                    {supplier.name.charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-sm uppercase tracking-tight">{supplier.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{supplier.companyName || 'Individual'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-bold text-slate-600">{supplier.contactPerson || 'N/A'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                                                <Phone size={12} className="text-slate-400" />
                                                {supplier.phone || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                                GST: {supplier.gstNo || 'N/A'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col max-w-[180px]">
                                            <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
                                                <MapPin size={12} className="text-blue-500" /> {supplier.city || 'No City'}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold truncate mt-1">{supplier.address || 'No address'}</p>
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
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1">Open: {supplier.openingBalance || 0}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
                        <div className="flex-1 overflow-y-auto">
                            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{formData.id ? 'Modify Supplier' : 'New Vendor'}</h3>
                                <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><X size={18} /></button>
                            </div>

                            <form onSubmit={handleSave} className="p-8 space-y-5">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Supplier Name</label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm text-slate-800"
                                                    placeholder="e.g. Ali Ahmed"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Company Name</label>
                                            <div className="relative">
                                                <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="text"
                                                    value={formData.company_name}
                                                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm text-slate-800"
                                                    placeholder="Business Name"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Phone Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="text"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all font-bold text-sm text-slate-800 outline-none"
                                                    placeholder="+92 300 1234567"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Contact Person</label>
                                            <div className="relative">
                                                <Check className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="text"
                                                    value={formData.contact_person}
                                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all font-bold text-sm text-slate-800 outline-none"
                                                    placeholder="Manager Name"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all font-bold text-sm text-slate-800 outline-none"
                                                    placeholder="sales@vendor.com"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">GST Number</label>
                                            <input
                                                type="text"
                                                value={formData.gst_no}
                                                onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all font-bold text-sm text-slate-800 outline-none"
                                                placeholder="GST Registration"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">City</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="text"
                                                    value={formData.city}
                                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all font-bold text-sm text-slate-800 outline-none"
                                                    placeholder="Karachi"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Opening Balance</label>
                                            <input
                                                type="number"
                                                value={formData.openingBalance}
                                                onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all font-bold text-sm text-slate-800 outline-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Business Address</label>
                                        <textarea
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            rows="2"
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all font-bold text-sm text-slate-800 outline-none resize-none"
                                            placeholder="Physical address..."
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors text-xs uppercase tracking-widest"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-blue-950 text-white rounded-lg font-bold shadow-sm shadow-blue-100 hover:bg-slate-900 transition-all disabled:opacity-50 text-xs uppercase tracking-widest"
                                    >
                                        {saving ? 'Saving...' : formData.id ? 'Update Vendor' : 'Save Vendor'}
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
