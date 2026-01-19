import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2, User, Phone,
    MapPin, Mail, CreditCard, TrendingUp, Users,
    DollarSign, X, Check, Loader2, MoreVertical
} from 'lucide-react';

// Reusable Components matching the design system
// Premium Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
    const colors = {
        orange: 'bg-white border-l-4 border-l-blue-500',
        emerald: 'bg-white border-l-4 border-l-emerald-500',
        red: 'bg-white border-l-4 border-l-red-500',
        blue: 'bg-white border-l-4 border-l-blue-600',
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

const Modal = ({ title, children, onClose, size = 'md' }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
        <div className={`bg-white rounded-xl shadow-xl w-full ${size === 'lg' ? 'max-w-4xl' : 'max-w-xl'} overflow-hidden border border-slate-200`}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 max-h-[85vh] overflow-y-auto">{children}</div>
        </div>
    </div>
);

const Customers = ({ currentUser }) => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        customerType: 'retail',
        cnic: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        gst_no: '',
        creditLimit: 0,
        openingBalance: 0
    });

    useEffect(() => { loadCustomers(); }, [currentUser]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.getCustomers(currentUser?.company_id);
                setCustomers(data || []);
            }
        } catch (err) {
            console.error('Error loading customers:', err);
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = { ...formData, companyId: currentUser?.company_id };
            let result;
            if (formData.id) {
                result = await window.electronAPI.updateCustomer(data);
            } else {
                result = await window.electronAPI.createCustomer(data);
            }

            if (result?.success === false) {
                window.alert(result.message);
            } else {
                setShowModal(false);
                loadCustomers();
            }
        } catch (err) {
            window.alert('Error saving customer: ' + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this customer?')) return;
        try {
            const result = await window.electronAPI.deleteCustomer(id);
            if (result?.success === false) {
                window.alert(result.message);
            } else {
                loadCustomers();
            }
        } catch (err) {
            window.alert('Error deleting customer: ' + err.message);
        }
    };

    const openModal = (customer = null) => {
        setFormData(customer ? {
            id: customer.id,
            name: customer.name,
            customerType: customer.customerType || 'retail',
            cnic: customer.cnic || '',
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            city: customer.city || '',
            gst_no: customer.gstNo || '',
            creditLimit: customer.creditLimit || 0,
            openingBalance: customer.openingBalance || 0
        } : {
            id: null,
            name: '',
            customerType: 'retail',
            cnic: '',
            phone: '',
            email: '',
            address: '',
            city: '',
            gst_no: '',
            creditLimit: 0,
            openingBalance: 0
        });
        setShowModal(true);
    };

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    const totalBalance = customers.reduce((acc, c) => acc + (c.balance || 0), 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Customer Management</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage your clients, track balances and credit limits.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-sm shadow-blue-200"
                >
                    <Plus size={18} />
                    <span>Add New Customer</span>
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Customers" value={customers.length} icon={Users} color="orange" />
                <StatCard title="Total Receivables" value={`PKR ${totalBalance.toLocaleString()}`} icon={DollarSign} color="emerald" />
                <StatCard title="Active Credit" value={`PKR ${(totalBalance * 0.8).toLocaleString()}`} icon={CreditCard} color="blue" />
                <StatCard title="New This Month" value="12" icon={TrendingUp} color="purple" />
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                            placeholder="Search customers..."
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={loadCustomers} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-slate-200 bg-white">
                            <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Customer</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Type / CNIC</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Contact Info</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Location</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Balance</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="5" className="px-8 py-20 text-center text-gray-400 font-medium">Loading customers...</td></tr>
                            ) : filtered.length > 0 ? (
                                filtered.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group border-b border-slate-50 last:border-0">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-none">{customer.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">ID: {customer.id.slice(-6).toUpperCase()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center text-slate-600 text-xs font-medium gap-1.5">
                                                    <Phone size={12} className="text-slate-400" /> {customer.phone || 'N/A'}
                                                </div>
                                                <div className="flex items-center text-slate-400 text-[11px] font-medium gap-1.5">
                                                    <Mail size={12} /> {customer.email || 'No email provided'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="flex items-center text-slate-600 text-xs gap-1.5">
                                                <MapPin size={14} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{customer.address || 'No address set'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-0.5">
                                                <p className={`text-sm font-bold ${customer.balance > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                    PKR {(customer.balance || 0).toLocaleString()}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Limit: {customer.creditLimit || 0}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end space-x-1">
                                                <button
                                                    onClick={() => openModal(customer)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(customer.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-8 py-32 text-center">
                                        <div className="max-w-xs mx-auto">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <User size={32} className="text-gray-200" />
                                            </div>
                                            <h3 className="text-gray-900 font-bold text-lg mb-1">No Customers Found</h3>
                                            <p className="text-gray-400 text-sm">Add your first customer to start tracking sales and balances.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for Add/Edit */}
            {showModal && (
                <Modal title={formData.id ? 'Update Customer Details' : 'Register New Customer'} onClose={() => setShowModal(false)} size="lg">
                    <form onSubmit={handleSave} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                    Basic Information
                                </h4>
                                <div className="space-y-2 text-left">
                                    <label className="text-xs font-bold text-slate-600 ml-1">Full Name *</label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-sm"
                                            placeholder="e.g. Ali Khan"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-xs font-bold text-slate-600 ml-1">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-sm"
                                            placeholder="03xx-xxxxxxx"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 text-left">
                                        <label className="text-xs font-bold text-slate-600 ml-1">Customer Type</label>
                                        <select
                                            value={formData.customerType}
                                            onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-sm font-bold appearance-none cursor-pointer"
                                        >
                                            <option value="retail">Retail</option>
                                            <option value="wholesale">Wholesale</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-xs font-bold text-slate-600 ml-1">CNIC / ID Number</label>
                                        <input
                                            type="text"
                                            value={formData.cnic}
                                            onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-sm"
                                            placeholder="42101-xxxxxxx-x"
                                        />
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
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-sm"
                                            placeholder="customer@email.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-xs font-bold text-slate-600 ml-1">GST Number</label>
                                    <div className="relative">
                                        <TrendingUp className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={formData.gst_no}
                                            onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-sm"
                                            placeholder="GST Registration No"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                    Additional Details
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 text-left">
                                        <label className="text-xs font-bold text-slate-600 ml-1">Credit Limit (PKR)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="number"
                                                value={formData.creditLimit}
                                                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <label className="text-xs font-bold text-slate-600 ml-1">Opening Balance</label>
                                        <div className="relative">
                                            <TrendingUp className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="number"
                                                value={formData.openingBalance}
                                                onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-sm"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-xs font-bold text-slate-600 ml-1">City</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-sm"
                                            placeholder="e.g. Karachi"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-xs font-bold text-slate-600 ml-1">Shipping/Billing Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-3 text-slate-400" size={16} />
                                        <textarea
                                            rows="3"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all text-sm"
                                            placeholder="Store address, city, etc."
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700 transition-all rounded-lg hover:bg-slate-100 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 text-sm shadow-sm shadow-blue-200"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {formData.id ? 'Update Customer' : 'Add Customer'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default Customers;
