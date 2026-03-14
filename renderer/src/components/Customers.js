import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2, User, Phone,
    MapPin, Mail, TrendingUp,
    DollarSign, X, Check, Loader2, Users
} from 'lucide-react';
import { canCreate, canEdit, canDelete } from '../utils/permissions';
import { useDialog } from '../context/DialogContext';


// Reusable Components matching the design system
// Premium Stat Card Component
// StatCard can be kept if needed elsewhere, but let's remove if unused in this file or mark it.
// Removed StatCard as it was reported as unused

// Modal component was unused as reported, but there's a modal logic below. 
// Wait, actually there IS a modal logic at line 289 but it's not using this Modal component.
// Removing unused Modal component.

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
        creditLimit: '',
        openingBalance: ''
    });

    const { showAlert, showConfirm, showError } = useDialog();

    const loadCustomers = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.getCustomers(currentUser?.company_id);
                setCustomers(Array.isArray(data) ? data : []);
                if (data?.success === false) console.error("Customer Error:", data.message);
            }
        } catch (err) {
            console.error('Error loading customers:', err);
            setCustomers([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadCustomers();
    }, [currentUser]); // currentUser is enough here, or we can add loadCustomers if we wrap it in useCallback.

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = {
                ...formData,
                companyId: currentUser?.company_id,
                balance: Number(formData.openingBalance) || 0, // Send current balance value from form
                opening_balance: formData.id ? undefined : (Number(formData.openingBalance) || 0) // Only set opening_balance on creation
            };
            let result;
            if (formData.id) {
                result = await window.electronAPI.updateCustomer(data);
            } else {
                result = await window.electronAPI.createCustomer(data);
            }

            if (result?.success === false) {
                showError(result.message, 'Save Failed');
            } else {
                setShowModal(false);
                loadCustomers();
            }
        } catch (err) {
            showError('Error saving customer: ' + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        showConfirm('Are you sure you want to delete this customer?', async () => {
            try {
                const result = await window.electronAPI.deleteCustomer(id);
                if (result?.success === false) {
                    showError(result.message, 'Cannot Delete');
                } else {
                    loadCustomers();
                }
            } catch (err) {
                showError('Error deleting customer: ' + err.message);
            }
        });
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
            creditLimit: customer.creditLimit || '',
            // Use current balance as the editable field for clearer "Current Debt" management
            openingBalance: customer.balance || ''
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
            creditLimit: '',
            openingBalance: ''
        });
        setShowModal(true);
    };

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    // totalBalance removed as it was unused

    return (
        <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700">





            {/* Main Content Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-bold"
                            placeholder="Search here..."
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={loadCustomers} className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        {canCreate('customers') && (
                            <button
                                onClick={() => openModal()}
                                className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all active:scale-95 text-sm"
                            >
                                <Plus size={18} />
                                <span>Add Customer</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 transition-colors">
                                <th className="px-6 py-4 text-[11px] font-bold text-black dark:text-white border-b border-slate-200 dark:border-slate-800">Name</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-black dark:text-white border-b border-slate-200 dark:border-slate-800">Contact</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-black dark:text-white border-b border-slate-200 dark:border-slate-800">Address</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-black dark:text-white border-b border-slate-200 dark:border-slate-800">Balance</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan="5" className="px-8 py-20 text-center text-gray-400 dark:text-slate-500 font-medium">Loading customers...</td></tr>
                            ) : filtered.length > 0 ? (
                                filtered.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group border-b border-slate-100 dark:border-slate-800 last:border-0">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-bold text-black dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-none">{customer.name}</p>
                                                <p className="text-[10px] text-black dark:text-slate-400 font-bold mt-1">ID: {String(customer.id).slice(-6).toUpperCase()}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center text-black dark:text-slate-300 text-xs font-bold gap-1.5">
                                                    <Phone size={12} className="text-black dark:text-slate-400" /> {customer.phone || 'N/A'}
                                                </div>
                                                <div className="flex items-center text-black dark:text-slate-400 text-[11px] font-bold gap-1.5">
                                                    <Mail size={12} /> {customer.email || 'No email provided'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="flex items-center text-black dark:text-slate-300 text-xs font-bold gap-1.5">
                                                <MapPin size={14} className="text-black dark:text-slate-400 shrink-0" />
                                                <span className="truncate">{customer.address || 'No address set'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-0.5">
                                                <p className={`text-sm font-bold ${customer.balance > 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    PKR {(customer.balance || 0).toLocaleString()}
                                                </p>
                                                <p className="text-[9px] text-black dark:text-slate-400 font-bold">Limit: {customer.creditLimit || 0}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end space-x-1">
                                                {canEdit('customers') && (
                                                    <button
                                                        onClick={() => openModal(customer)}
                                                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                {canDelete('customers') && (
                                                    <button
                                                        onClick={() => handleDelete(customer.id)}
                                                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-8 py-32 text-center">
                                        <div className="max-w-xs mx-auto">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
                                                <User size={32} className="text-gray-200 dark:text-slate-600" />
                                            </div>
                                            <h3 className="text-gray-900 dark:text-slate-100 font-bold text-lg mb-1">No Customers Found</h3>
                                            <p className="text-gray-400 dark:text-slate-500 text-sm">Add your first customer to start tracking sales and balances.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-white dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* Full-Page Header */}
                        <div className="px-4 md:px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <Users size={22} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xl md:text-2xl font-bold text-black dark:text-slate-100 tracking-tight truncate">{formData.id ? 'Edit Customer' : 'Add Customer'}</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-3 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50"
                            >
                                <span className="text-[10px] font-bold hidden md:block">Close</span>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="max-w-7xl mx-auto w-full p-4 md:p-8 pb-24">
                            <form onSubmit={handleSave} className="space-y-8 md:space-y-12">

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                    <div className="space-y-4 md:space-y-6 text-left">
                                        <h4 className="text-[10px] font-bold text-black dark:text-slate-500 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
                                            Primary Info
                                        </h4>
                                        <div className="space-y-2 text-left">
                                            <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">Name *</label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all text-sm text-slate-800 dark:text-slate-100 font-bold"
                                                    placeholder="Enter Customer Name"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-left">
                                            <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">Phone</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                    placeholder="0312345678"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2 text-left">
                                                <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">Type</label>
                                                <select
                                                    value={formData.customerType}
                                                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all text-sm font-bold appearance-none cursor-pointer text-slate-800 dark:text-slate-100"
                                                >
                                                    <option value="retail">Retail</option>
                                                    <option value="wholesale">Wholesale</option>
                                                    <option value="others">Others</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2 text-left">
                                                <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">CNIC</label>
                                                <input
                                                    type="text"
                                                    value={formData.cnic}
                                                    onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                    placeholder="42101-1234567-8"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-left">
                                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-1">Email</label>
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                    placeholder="customer@email.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-left">
                                            <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">GST</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={formData.gst_no}
                                                    onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })}
                                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                    placeholder="GST Registration No"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 md:space-y-6 text-left">
                                        <h4 className="text-[10px] font-bold text-black dark:text-slate-500 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
                                            Other Info
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2 text-left">
                                                <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">Limit</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={formData.creditLimit || ''}
                                                        onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-left">
                                                <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">Balance</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={formData.openingBalance || ''}
                                                        onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-left">
                                            <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">City</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={formData.city}
                                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                    placeholder="Karachi"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-left">
                                            <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">Address</label>
                                            <div className="relative">
                                                <textarea
                                                    rows="3"
                                                    value={formData.address}
                                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all text-sm resize-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                    placeholder="Store address, building, etc."
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 sticky bottom-0 bg-white dark:bg-slate-900 pb-8 transition-colors">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-sm tracking-widest disabled:opacity-70"
                                    >
                                        {saving ? 'Saving...' : 'Save now'}
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

export default Customers;
