import React, { useState, useEffect } from 'react';
import { Building2, Users, Shield, ClipboardList, Plus, Search, Edit2, Trash2, X, Eye, EyeOff, Check, ChevronDown, Info, Mail, Phone, MapPin, Megaphone, Send, Share2 } from 'lucide-react';
import { canCreate, canEdit, canDelete } from '../utils/permissions';
import { useDialog } from '../context/DialogContext';


const tabs = [
    { id: 'profile', label: 'Company profile', icon: Building2, color: 'emerald' },
    { id: 'users', label: 'Users', icon: Users, color: 'emerald' },
    { id: 'roles', label: 'Roles & permissions', icon: Shield, color: 'emerald' },
    { id: 'requests', label: 'Requests', icon: ClipboardList, color: 'emerald' },
    { id: 'helpline', label: 'Complains', icon: Phone, color: 'emerald' },
    { id: 'broadcast', label: 'Broadcast', icon: Megaphone, color: 'emerald' },
];

const MODULES = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'sales', label: 'Sales' },
    { key: 'purchase', label: 'Purchase' },
    { key: 'returns', label: 'Returns' },
    { key: 'products', label: 'Products' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'customers', label: 'Customers' },
    { key: 'suppliers', label: 'Suppliers' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'reports', label: 'Reports' },
    { key: 'hrm', label: 'HRM' },

    { key: 'users', label: 'Users' },
    { key: 'roles', label: 'Roles' },
    { key: 'settings', label: 'Settings' },
    { key: 'backup', label: 'Backup' },
];

const Company = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [currentUser, setCurrentUser] = useState(null);
    const [counts, setCounts] = useState({ requests: 0, helpline: 0 });

    useEffect(() => {
        const savedUser = sessionStorage.getItem('user');
        if (savedUser) setCurrentUser(JSON.parse(savedUser));
    }, []);

    const isSuperAdmin = currentUser?.role?.toLowerCase() === 'super_admin' || currentUser?.role === 'Super Admin';

    const fetchCounts = async () => {
        if (!isSuperAdmin) return;
        try {
            const [reqData, helpData] = await Promise.all([
                window.electronAPI.getCompanyRequests({ status: 'PENDING' }),
                window.electronAPI.getSupportRequests({ status: 'PENDING' })
            ]);
            setCounts({
                requests: Array.isArray(reqData) ? reqData.length : 0,
                helpline: Array.isArray(helpData) ? helpData.length : 0
            });
        } catch (err) {
            console.error("Error fetching notification counts:", err);
        }
    };

    useEffect(() => {
        if (currentUser) fetchCounts();
    }, [currentUser, isSuperAdmin]);

    return (
        <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700">



            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                {/* Modern Tab Bar */}
                <div className="flex items-center px-4 bg-slate-50/20 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => {
                        // FOR SUPER ADMIN: Show Profile (Companies), Users, Roles, Requests, Helpline, and Broadcast
                        if (isSuperAdmin && !['profile', 'users', 'roles', 'requests', 'helpline', 'broadcast'].includes(tab.id)) return null;

                        // FOR REGULAR USERS: Filter baseline
                        if (!isSuperAdmin && (['helpline', 'requests', 'broadcast'].includes(tab.id))) return null;

                        let label = tab.label;
                        if (isSuperAdmin) {
                            if (tab.id === 'profile') label = 'All Companies';
                            if (tab.id === 'helpline') label = 'Complains';
                            if (tab.id === 'broadcast') label = 'Broadcast';
                            if (tab.id === 'requests') label = 'Requests';
                        }

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center space-x-3 px-6 py-4 text-sm font-semibold transition-all whitespace-nowrap group ${activeTab === tab.id
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                            >
                                <tab.icon size={16} />
                                <span className="text-black dark:text-white">{label}</span>
                                {tab.id === 'requests' && isSuperAdmin && counts.requests > 0 && (
                                    <span className="ml-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                )}
                                {tab.id === 'helpline' && isSuperAdmin && counts.helpline > 0 && (
                                    <span className="ml-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                )}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-t-full"></div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="p-8 flex-1">
                    {activeTab === 'profile' && <CompanyProfile currentUser={currentUser} isSuperAdmin={isSuperAdmin} />}
                    {activeTab === 'users' && <UserManagement currentUser={currentUser} isSuperAdmin={isSuperAdmin} />}
                    {activeTab === 'roles' && <RolesPermissions currentUser={currentUser} isSuperAdmin={isSuperAdmin} />}
                    {activeTab === 'requests' && isSuperAdmin && <CompanyRequests currentUser={currentUser} onAction={fetchCounts} />}
                    {activeTab === 'helpline' && isSuperAdmin && <ComplainRequests onAction={fetchCounts} />}
                    {activeTab === 'broadcast' && isSuperAdmin && <SystemBroadcast />}
                </div>
            </div>
        </div>
    );
};

// ============ COMPANY PROFILE ============
const CompanyProfile = ({ currentUser, isSuperAdmin }) => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [companyUsers, setCompanyUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [formData, setFormData] = useState({
        name: '', address: '', phone: '', email: '', office_phone: '', city: '', referral_code: ''
    });

    const [companySearch, setCompanySearch] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [companyReferralFilter, setCompanyReferralFilter] = useState('all');

    const { showAlert, showConfirm, showSuccess, showError } = useDialog();

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setCompanySearch(searchTerm);
        }, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const isSilentReload = companies.length > 0;
        loadData(isSilentReload);
    }, [currentUser, isSuperAdmin, companySearch, companyReferralFilter]);

    const loadData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            if (window.electronAPI) {
                if (isSuperAdmin) {
                    const data = await window.electronAPI.getCompanies({
                        search: companySearch,
                        referralType: companyReferralFilter
                    });
                    setCompanies(Array.isArray(data) ? data : []);
                    console.log("🔍 [DEBUG] Companies state set to:", Array.isArray(data) ? data : []);
                    if (data?.success === false) console.error("Companies Error:", data.message);
                } else if (currentUser?.company_id) {
                    const data = await window.electronAPI.getCompany(currentUser.company_id);
                    if (data && data.success !== false) {
                        setFormData({
                            ...data,
                            tax_no: data.taxNumber,
                            currency_symbol: data.currency,
                            office_phone: data.officePhone || data.office_phone,
                            referral_code: data.referralCode || data.referral_code,
                            private_phone: data.privatePhone,
                            secondary_address: data.secondaryAddress,
                            zip_code: data.zipCode,
                            is_active: data.isActive
                        });
                    }
                    else if (data?.success === false) console.error("Company Error:", data.message);
                }
            }
        } catch (err) {
            console.error('Error loading company data:', err);
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (window.electronAPI) {
                const result = formData.id
                    ? await window.electronAPI.updateCompany(formData)
                    : await window.electronAPI.createCompany(formData);
                if (result?.success === false) {
                    showError(result.message);
                } else {
                    setShowModal(false);
                    loadData();
                }
            }
        } catch (err) {
            showError('Error: ' + err.message);
        }
        setSaving(false);
    };

    const openModal = (comp = null) => {
        if (comp) {
            setFormData({
                ...comp,
                office_phone: comp.officePhone || comp.office_phone,
                referral_code: comp.referralCode || comp.referral_code,
                is_active: (comp.isActive === 1 || comp.isActive === true || comp.is_active === 1 || comp.is_active === true)
            });
        } else {
            setFormData({
                name: '', address: '', phone: '', email: '',
                office_phone: '', city: '', referral_code: '', is_active: true
            });
        }
        setShowModal(true);
    };

    const openDetailModal = async (company) => {
        setSelectedCompany(company);
        setShowDetailModal(true);
        setLoadingUsers(true);
        try {
            if (window.electronAPI) {
                const users = await window.electronAPI.getUsers(company.id);
                setCompanyUsers(Array.isArray(users) ? users : []);
                if (users?.success === false) console.error("Users Error:", users.message);
            }
        } catch (err) {
            console.error('Error loading detail users:', err);
            setCompanyUsers([]);
        }
        setLoadingUsers(false);
    };

    const handleDeleteCompany = async (e, id) => {
        e.stopPropagation();
        showConfirm('Are you sure you want to PERMANENTLY delete this company and all its data?', async () => {
            try {
                if (window.electronAPI) {
                    const result = await window.electronAPI.deleteCompany(id);
                    if (result?.success === false) {
                        showError(result.message);
                    } else {
                        loadData();
                    }
                }
            } catch (err) {
                showError('Error: ' + err.message);
            }
        });
    };

    if (loading) return <LoadingSpinner />;

    if (isSuperAdmin) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search companies..."
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/5 dark:focus:ring-emerald-500/10 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all text-black dark:text-slate-100 placeholder:text-slate-400"
                        />
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-[14px] border border-slate-200 dark:border-slate-700">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'with', label: 'Referral' },
                                { id: 'without', label: 'Direct' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setCompanyReferralFilter(f.id)}
                                    className={`px-5 py-2 text-[11px] font-bold rounded-[10px] transition-all duration-200 ${companyReferralFilter === f.id
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {canCreate('settings') && (
                            <Button onClick={() => openModal()} icon={Plus}>Add company</Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {console.log("🎨 [RENDER] Rendering companies, length:", companies.length, "Data:", companies)}
                    {companies.map((c) => (
                        <div
                            key={c.id}
                            onClick={() => openDetailModal(c)}
                            className="group relative bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="hidden">
                                    {c.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex gap-1 shadow-sm border border-slate-100 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden transition-opacity">
                                    {canDelete('settings') && (
                                        <button
                                            onClick={(e) => handleDeleteCompany(e, c.id)}
                                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    {canEdit('settings') && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openModal(c); }}
                                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all border-l border-slate-100 dark:border-slate-800"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-black dark:text-slate-100 text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate tracking-tight">{c.name}</h3>
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center text-xs font-bold text-slate-400 dark:text-slate-500 gap-2">
                                        <Building2 size={14} />
                                        <span className="truncate">{c.email || 'No email attached'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${c.isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800'}`}>
                                            {c.isActive ? 'Active' : 'Inactive'}
                                        </div>

                                    </div>
                                    {c.referralCode && (
                                        <div className="flex items-center text-[10px] font-bold text-emerald-500 dark:text-emerald-400 gap-2 mt-1">
                                            <Share2 size={14} />
                                            <span>Referral: {c.referralCompanyName || c.referralCode}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {companies.length === 0 && (
                        <div className="col-span-full">
                            <EmptyState message="No companies found" icon={Building2} />
                        </div>
                    )}
                </div>

                {
                    showModal && (
                        <Modal title={formData.id ? 'Modify Identity' : 'Register New Business'} onClose={() => setShowModal(false)} size="lg">
                            <form onSubmit={handleSave} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h4 className="text-xs font-semibold text-black dark:text-slate-400 flex items-center gap-2 tracking-tight">
                                            <div className="w-1 h-3.5 bg-emerald-600 rounded-full"></div>
                                            Core information
                                        </h4>
                                        <FormInput label="Company Name" required value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="Enter company name" icon={Building2} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormInput label="Email Address" type="email" required value={formData.email} onChange={v => setFormData({ ...formData, email: v })} placeholder="info@company.com" icon={Mail} />
                                            <FormInput label="Referral Code" value={formData.referral_code} onChange={v => setFormData({ ...formData, referral_code: v })} placeholder="Referral Code (Optional)" icon={Users} />
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-bold text-black dark:text-slate-400 flex items-center gap-2 uppercase tracking-tight">
                                            <div className="w-1 h-3.5 bg-emerald-600 rounded-full"></div>
                                            Communications
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormInput label="Contact No" required value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} placeholder="Enter contact no" icon={Phone} />
                                            <FormInput label="Landline No" value={formData.office_phone} onChange={v => setFormData({ ...formData, office_phone: v })} placeholder="Landline No (Optional)" icon={Phone} />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 mt-4">
                                            <div>
                                                <p className="text-sm font-semibold text-black dark:text-slate-100">Organization status</p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{formData.is_active ? 'Account is live' : 'Account is deactivated'}</p>
                                            </div>
                                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, is_active: 1 })}
                                                    className={`px-4 py-1.5 rounded-md text-[10px] font-semibold transition-all ${formData.is_active ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                                >
                                                    Active
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, is_active: 0 })}
                                                    className={`px-4 py-1.5 rounded-md text-[10px] font-semibold transition-all ${!formData.is_active ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                                >
                                                    Deactivated
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-full space-y-6">
                                        <h4 className="text-[10px] font-bold text-black dark:text-slate-400 flex items-center gap-2 uppercase tracking-tight">
                                            <div className="w-1 h-3.5 bg-emerald-600 rounded-full"></div>
                                            Address details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormTextarea label="Company Address" required value={formData.address} onChange={v => setFormData({ ...formData, address: v })} placeholder="Enter company address" />
                                            <FormInput label="City" required value={formData.city} onChange={v => setFormData({ ...formData, city: v })} placeholder="Enter city name" icon={MapPin} />
                                        </div>
                                    </div>
                                </div>
                                <ModalFooter onCancel={() => setShowModal(false)} saving={saving} label={formData.id ? 'Save changes' : 'Add company'} />
                            </form>
                        </Modal>
                    )
                }

                {
                    showDetailModal && selectedCompany && (
                        <Modal title="Company Details" onClose={() => setShowDetailModal(false)} size="lg">
                            <div className="space-y-8">
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-start gap-6">
                                        <div className="w-20 h-20 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                                            {selectedCompany.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-xl font-bold text-black dark:text-slate-100 mb-2 tracking-tight">{selectedCompany.name}</h2>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                                                <div>
                                                    <span className="text-black dark:text-slate-200 font-semibold block mb-1 tracking-tight text-sm">Email address</span>
                                                    <p className="text-slate-700 dark:text-slate-300 font-semibold">{selectedCompany.email || '—'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-black dark:text-slate-200 font-semibold block mb-1 tracking-tight text-sm">Contact no</span>
                                                    <p className="text-slate-700 dark:text-slate-300 font-semibold">{selectedCompany.phone || '—'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-black dark:text-slate-200 font-semibold block mb-1 tracking-tight text-sm">Office line</span>
                                                    <p className="text-slate-700 dark:text-slate-300 font-semibold">{selectedCompany.officePhone || '—'}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-black dark:text-slate-200 font-semibold block mb-1 tracking-tight text-sm">Address</span>
                                                    <p className="text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                                                        {selectedCompany.address}<br />
                                                        {selectedCompany.city}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-black dark:text-slate-500 flex items-center gap-2 tracking-tight">
                                            <Users size={16} />
                                            Onboarded users
                                        </h3>
                                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-semibold border border-emerald-100 dark:border-emerald-800 tracking-tight">
                                            {companyUsers.length} MEMBERS
                                        </span>
                                    </div>

                                    {loadingUsers ? <LoadingSpinner /> : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                            {companyUsers.length === 0 ? (
                                                <EmptyState message="No users assigned to this tenant" />
                                            ) : companyUsers.map((user) => (
                                                <div key={user.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group">
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <p className="font-semibold text-black dark:text-slate-200 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors tracking-tight">{user.fullname}</p>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">@{user.username}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-[9px] font-semibold border border-emerald-100 dark:border-emerald-800 tracking-tight">
                                                            {user.role}
                                                        </span>
                                                        <StatusBadge active={user.is_active} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Modal>
                    )
                }
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} className="w-full animate-in fade-in duration-500">
            <div className="w-full p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="relative shrink-0">
                        <div className="relative w-32 h-32 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-5xl shadow-sm">
                            {formData.name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormInput label="Company Name" required value={formData.name} onChange={v => setFormData({ ...formData, name: v })} icon={Building2} placeholder="Enter company name" />
                            <FormInput label="Email Address" type="email" required value={formData.email} onChange={v => setFormData({ ...formData, email: v })} icon={Mail} placeholder="Enter email" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormInput label="Contact No" required value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} icon={Phone} placeholder="Enter contact no" />
                            <FormInput label="Landline No" value={formData.office_phone} onChange={v => setFormData({ ...formData, office_phone: v })} icon={Phone} placeholder="Enter landline" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormTextarea label="Physical Address" required value={formData.address} onChange={v => setFormData({ ...formData, address: v })} />
                            <FormInput label="City" required value={formData.city} onChange={v => setFormData({ ...formData, city: v })} icon={MapPin} />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    {canEdit('settings') && (
                        <Button type="submit">
                            {saving ? 'Updating...' : 'Update company'}
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
};


// ============ USER MANAGEMENT ============
const UserManagement = ({ currentUser, isSuperAdmin }) => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({});

    const { showConfirm, showError } = useDialog();

    useEffect(() => { loadData(); }, [currentUser, isSuperAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const companyId = isSuperAdmin ? null : (currentUser?.company_id || currentUser?.companyId);
                const [usersData, rolesData] = await Promise.all([
                    window.electronAPI.getUsers(companyId),
                    window.electronAPI.getRoles(companyId)
                ]);
                const filteredUsers = (Array.isArray(usersData) ? usersData : []).filter(u => {
                    // Never show Super Admin users in the list
                    const roleName = (u.role || '').toLowerCase().replace(/[\s_]/g, '');
                    if (roleName === 'superadmin') return false;

                    // If Super Admin viewing globally (no companyId filter) - show all users
                    if (isSuperAdmin && !companyId) return true;

                    // If a specific companyId filter is active, apply it
                    if (companyId) {
                        const uCid = String(u.company_id || u.companyId || '');
                        const filterCid = String(companyId);
                        return uCid === filterCid;
                    }

                    return true;
                });
                setUsers(filteredUsers);
                setRoles(Array.isArray(rolesData) ? rolesData : []);
                // Always fetch companies for dropdown
                const comps = await window.electronAPI.getCompanies() || [];
                setCompanies(Array.isArray(comps) ? comps : []);
            }
        } catch (err) {
            showError('Error: ' + err.message);
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Find role ID if not already set (fallback)
            let finalRoleId = formData.role_id;
            if (!finalRoleId && formData.role) {
                const selectedRole = roles.find(r => r.name === formData.role || r.name.toLowerCase().replace(/\s+/g, '_') === formData.role);
                if (selectedRole) finalRoleId = selectedRole.global_id || selectedRole.id;
            }

            const data = {
                ...formData,
                company_id: isSuperAdmin ? formData.company_id : (currentUser?.company_id || currentUser?.companyId),
                role_id: finalRoleId
            };

            const result = formData.id
                ? await window.electronAPI.updateUser(data)
                : await window.electronAPI.createUser(data);
            if (result?.success === false) {
                showError(result.message);
            } else {
                setShowModal(false);
                loadData();
            }
        } catch (err) {
            showError('Error: ' + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        showConfirm('Are you sure you want to deactivate this user?', async () => {
            await window.electronAPI.deleteUser(id);
            loadData();
        });
    };

    const openModal = async (user = null) => {
        if (user) {
            let currentRoles = roles;
            const companyId = user.company_id || user.companyId;

            // IF SUPER ADMIN: Fetch roles for this user's company so they exist in dropdown list
            if (isSuperAdmin && companyId) {
                try {
                    // Optimized backend returns both system and company roles in one call
                    const companySpecificRoles = await window.electronAPI.getRoles(companyId);
                    if (Array.isArray(companySpecificRoles)) {
                        setRoles(companySpecificRoles);
                        currentRoles = companySpecificRoles;
                    }
                } catch (e) { console.error("Error fetching roles for company:", e); }
            }

            const roleId = user.role_id || user.roleId;

            // Normalize to match (global_id || id) logic used in dropdown
            let matchedRole = currentRoles.find(r =>
                (r.id && roleId && r.id == roleId) ||
                (r.global_id && roleId && r.global_id == roleId)
            );

            // FALLBACK: If ID doesn't match, try matching by name
            if (!matchedRole && user.role) {
                const targetName = user.role.toLowerCase().trim();
                matchedRole = currentRoles.find(r => (r.name || '').toLowerCase().trim() === targetName);
            }

            const finalRoleId = matchedRole ? (matchedRole.global_id || matchedRole.id) : roleId;

            const matchedComp = companies.find(c => c.id == companyId || c.global_id == companyId);
            const finalCompId = matchedComp ? (matchedComp.global_id || matchedComp.id) : companyId;

            setFormData({
                ...user,
                company_id: finalCompId,
                role_id: finalRoleId,
                password: user.raw_password || (user.password && !user.password.startsWith('$2b$') ? user.password : '')
            });
        } else {
            const defaultRole = roles.find(r => r.name?.toLowerCase() === 'admin' && !(r.company_id || r.companyId));
            setFormData({
                company_id: '',
                username: '',
                password: '',
                role: defaultRole?.name || 'admin',
                role_id: defaultRole?.global_id || defaultRole?.id || '',
                fullname: '',
                is_active: 1
            });
        }
        setShowPassword(false);
        setShowModal(true);
    };

    const filtered = users.filter(u =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.fullname?.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total: users.length,
        active: users.filter(u => u.is_active).length,
        admins: users.filter(u => u.role?.toLowerCase().includes('admin')).length
    };

    const handleCompanyChange = async (cid) => {
        setFormData(prev => ({ ...prev, company_id: cid, role_id: '', role: '' }));

        if (isSuperAdmin && cid) {
            try {
                // Fetch both system and company-specific roles via optimized backend
                const data = await window.electronAPI.getRoles(cid);
                if (Array.isArray(data)) {
                    setRoles(data);
                }
            } catch (err) {
                console.error("Error updating roles for selected company:", err);
            }
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total users" value={stats.total} icon={Users} color="blue" />
                <StatCard title="Active users" value={stats.active} icon={Check} color="emerald" />
                <StatCard title="Admins" value={stats.admins} icon={Shield} color="purple" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={16} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search users..."
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/5 dark:focus:ring-emerald-500/10 focus:border-emerald-500 dark:focus:border-emerald-600 transition-all text-black dark:text-slate-100 placeholder:text-slate-400"
                    />
                </div>
                {canCreate('users') && (
                    <Button onClick={() => openModal()} icon={Plus}>Add user</Button>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/80 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight">User name</th>
                                {isSuperAdmin && <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight">Company</th>}
                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight">Role</th>
                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight text-center">Status</th>
                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filtered.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-4">
                                            <div>
                                                <p className="font-semibold text-black dark:text-slate-200 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors tracking-tight">{user.fullname}</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold tracking-tight">@{user.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    {isSuperAdmin && (
                                        <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400 text-sm tracking-tight">
                                            {user.company_name || 'System Principal'}
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-xs font-semibold border border-emerald-100 dark:border-emerald-800 tracking-tight">
                                            {user.role?.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusBadge active={user.is_active} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-1 transition-opacity">
                                            {canEdit('users') && (
                                                <button onClick={() => openModal(user)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all">
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {canDelete('users') && (
                                                <button onClick={() => handleDelete(user.id)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all">
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

            {showModal && (
                <Modal title={formData.id ? 'Update user' : 'Add new user'} onClose={() => setShowModal(false)} size="md">
                    <form onSubmit={handleSave} className="space-y-6">
                        {isSuperAdmin && (
                            <FormSelect
                                label="Select Company"
                                required
                                value={formData.company_id}
                                onChange={handleCompanyChange}
                                options={companies.map(c => ({ value: c.global_id || c.id, label: c.name }))}
                                placeholder="Select company"
                                icon={Building2}
                            />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="Full Name" required value={formData.fullname} onChange={v => setFormData({ ...formData, fullname: v })} placeholder="Enter full name" icon={Users} />
                            <FormInput label="User Name" required value={formData.username} onChange={v => setFormData({ ...formData, username: v })} placeholder="Enter user name" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                required={!formData.id}
                                value={formData.password}
                                onChange={v => setFormData({ ...formData, password: v })}
                                suffix={
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                }
                            />
                            <FormSelect
                                label="User Role"
                                required
                                value={formData.role_id || formData.roleId || ''}
                                onChange={v => {
                                    const roleObj = roles.find(r => (r.global_id || r.id) == v);
                                    setFormData({ ...formData, role_id: v, role: roleObj ? roleObj.name : '' });
                                }}
                                options={(() => {
                                    const filtered = roles.filter(r => {
                                        const roleName = (r.name || '').toLowerCase();
                                        const isNotSuper = !['super admin', 'superadmin', 'super_admin'].includes(roleName);

                                        if (isSuperAdmin) {
                                            const roleCid = r.company_id || r.companyId;
                                            const hasNoCompany = !roleCid;
                                            // 1. Show all global templates
                                            if (hasNoCompany) return isNotSuper;

                                            // 2. Show roles that belong to the SELECTED company (e.g. Chase Value)
                                            const targetCid = formData.company_id;
                                            if (targetCid && (roleCid == targetCid)) return isNotSuper;

                                            // Safety: if the role is in current roles but doesn't have a CID (rare but possible during fetch)
                                            if (!hasNoCompany && targetCid) return isNotSuper;

                                            return false;
                                        }

                                        // For regular admins: show roles for their company ONLY (hiding global templates)
                                        // unless the role is already assigned to the user we are editing.
                                        const roleCid = r.company_id || r.companyId;
                                        const targetCid = formData.company_id || currentUser?.company_id || currentUser?.companyId;
                                        const isCurrent = formData.id && (r.global_id === formData.role_id || String(r.id) === String(formData.role_id));
                                        
                                        return isNotSuper && (roleCid == targetCid || isCurrent);
                                    }).map(r => ({ value: r.global_id || r.id, label: r.name }));

                                    // USER REQUEST: If the current role being viewed is "Admin" (from system), 
                                    // and it's not in the list yet, we ensure it stays visible so they can see/keep it.
                                    if (!isSuperAdmin && formData.id && (formData.role?.toLowerCase() === 'admin' || formData.role?.toLowerCase() === 'superadmin')) {
                                        if (!filtered.find(o => o.label.toLowerCase() === formData.role.toLowerCase())) {
                                            filtered.push({ value: formData.role_id || formData.roleId, label: formData.role });
                                        }
                                    }
                                    return filtered;
                                })()}
                                icon={Shield}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div>
                                <p className="text-sm font-bold text-black dark:text-slate-200">Account Status</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Enable or disable this user</p>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_active: 1 })}
                                    className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${formData.is_active === 1 ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                >
                                    Active
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_active: 0 })}
                                    className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${formData.is_active === 0 ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                >
                                    Disabled
                                </button>
                            </div>
                        </div>
                        <ModalFooter onCancel={() => setShowModal(false)} saving={saving} />
                    </form>
                </Modal>
            )}
        </div>
    );
};

// ============ ROLES & PERMISSIONS ============
const RolesPermissions = ({ currentUser, isSuperAdmin }) => {
    const [roles, setRoles] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState('system');
    const [formData, setFormData] = useState({ name: '', description: '', permissions: [] });

    const { showConfirm, showError } = useDialog();

    useEffect(() => { loadRoles(); }, [currentUser, isSuperAdmin, selectedCompany]);

    const loadRoles = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                // Super Admin: load all companies first
                if (isSuperAdmin) {
                    const comps = await window.electronAPI.getCompanies() || [];
                    setCompanies(Array.isArray(comps) ? comps : []);
                }

                // Determine target company for filtering
                // 'system' means global templates (null), 'all' means everything (null handled by server fallback usually), or specific ID
                const targetCid = isSuperAdmin
                    ? (selectedCompany === 'system' || selectedCompany === 'all' ? null : selectedCompany)
                    : (currentUser?.company_id || currentUser?.companyId);

                const data = await window.electronAPI.getRoles(targetCid);

                const rolesWithPerms = await Promise.all((Array.isArray(data) ? data : []).map(async (role) => {
                    const perms = await window.electronAPI.getPermissions(role.global_id || role.id) || [];
                    return { ...role, permissions: Array.isArray(perms) ? perms : [] };
                }));
                setRoles(rolesWithPerms);
            }
        } catch (err) {
            console.error("Load Roles Error:", err);
            showError('Error: ' + err.message);
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // For Super Admin, use manually selected company from modal form
            let targetCompanyId = formData.target_company_id || currentUser?.company_id || currentUser?.companyId;

            // If it's a global template, ensure it's null
            if (targetCompanyId === 'system' || !targetCompanyId) {
                targetCompanyId = null;
            }

            const data = {
                ...formData,
                company_id: targetCompanyId
            };

            const result = formData.id
                ? await window.electronAPI.updateRole(data)
                : await window.electronAPI.createRole(data);

            if (result && result.success) {
                setShowModal(false);
                setTimeout(async () => { await loadRoles(); }, 500);
            } else {
                showError('Error: ' + (result?.message || 'Operation failed'));
            }
        } catch (err) {
            console.error("Save Role Error:", err);
            showError('System Error: ' + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        showConfirm('Delete this role definition?', async () => {
            await window.electronAPI.deleteRole(id);
            loadRoles();
        });
    };

    const openModal = (role = null) => {
        const toInt = (v) => (v === 1 || v === true || v === '1') ? 1 : 0;

        let initialPerms = [];
        if (role) {
            initialPerms = MODULES.map(m => {
                const existing = (role.permissions || []).find(p => p.module === m.key);
                if (existing) {
                    return {
                        module: m.key,
                        global_id: existing.global_id || existing.id || null,
                        can_view: toInt(existing.can_view ?? existing.canView),
                        can_create: toInt(existing.can_create ?? existing.canCreate),
                        can_edit: toInt(existing.can_edit ?? existing.canEdit),
                        can_delete: toInt(existing.can_delete ?? existing.canDelete),
                    };
                }
                return { module: m.key, can_view: 0, can_create: 0, can_edit: 0, can_delete: 0 };
            });
            setFormData({
                ...role,
                permissions: initialPerms,
                target_company_id: role.company_id || role.companyId || ''
            });
        } else {
            initialPerms = MODULES.map(m => ({ module: m.key, can_view: 1, can_create: 0, can_edit: 0, can_delete: 0 }));
            setFormData({
                name: '',
                description: '',
                permissions: initialPerms,
                target_company_id: (isSuperAdmin && selectedCompany !== 'system' && selectedCompany !== 'all') ? selectedCompany : ''
            });
        }
        setShowModal(true);
    };

    const updatePerm = (mod, field, val) => setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.map(p => {
            if (p.module !== mod) return p;

            // Logic: if unchecking view, uncheck EVERYTHING else for this module
            if (field === 'can_view' && !val) {
                return { ...p, can_view: 0, can_create: 0, can_edit: 0, can_delete: 0 };
            }

            // Logic: if checking any action, automatically check VIEW if it was off
            // Use loose == 0 to handle integer 0, boolean false, or string '0'
            if (field !== 'can_view' && val && p.can_view == 0) {
                return { ...p, can_view: 1, [field]: 1 };
            }

            return { ...p, [field]: val ? 1 : 0 };
        })
    }));

    // Use loose == 1 to safely handle int 1, bool true, or string '1'
    const getPerm = (mod, field) => formData.permissions.find(p => p.module === mod)?.[field] == 1;

    if (loading) return <LoadingSpinner />;

    // Filter roles: exclude Super Admin, and filter by selectedCompany for Super Admin
    const rawFilteredRoles = roles.filter(r => {
        const roleName = (r.name || '').toLowerCase();
        if (roleName === 'super admin' || roleName === 'superadmin' || roleName === 'super_admin') return false;

        const isSystem = (r.is_system === 1 || r.isSystem === true || !(r.company_id || r.companyId));

        if (isSuperAdmin) {
            // Super Admin View: Filter by the dropdown (System roles, specific company, or all)
            if (selectedCompany === 'system') return isSystem;
            if (selectedCompany !== 'all') {
                const targetCid = r.company_id || r.companyId;
                return targetCid == selectedCompany;
            }
            return true;
        }

        // REGULAR ADMIN: Hide all global/system templates from the card list.
        // They only see roles that belong to their specific company.
        return !isSystem;
    });

    // De-duplicate by name, prioritizing Global roles (without company_id)
    const roleMap = new Map();
    rawFilteredRoles.forEach(r => {
        const key = (r.name || '').toLowerCase().trim();
        const existing = roleMap.get(key);

        // If no entry exists, or if the new role is a 'Global' one while the existing is 'Local'
        if (!existing || (!(r.company_id || r.companyId) && (existing.company_id || existing.companyId))) {
            roleMap.set(key, r);
        }
    });
    const filteredRoles = Array.from(roleMap.values());


    // Group roles: system roles first, then by company
    const systemRoles = filteredRoles.filter(r => (r.is_system === 1 || r.isSystem === true) && !(r.company_id || r.companyId));
    const companyRoles = filteredRoles.filter(r => !((r.is_system === 1 || r.isSystem === true) && !(r.company_id || r.companyId)));

    // Get company name helper
    const getCompanyName = (cid) => {
        const comp = companies.find(c => c.id === cid || c.global_id === cid);
        return comp?.name || 'Unknown Company';
    };

    // For non-super-admin, just show all filtered roles in a flat grid
    const renderRoleCard = (role) => (
        <div key={role.id || role.global_id} className="group relative bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    <Shield size={24} />
                </div>
                <div className="flex gap-1 shadow-sm border border-slate-100 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden transition-opacity">
                    {(canEdit('roles') && (isSuperAdmin || !(role.is_system || role.isSystem))) && (
                        <button onClick={() => openModal(role)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
                            <Edit2 size={16} />
                        </button>
                    )}
                    {/* Allow deletion if user has permission OR is Super Admin (but protect core Admin/Manager from accidental deletion) */}
                    {((canDelete('roles') || isSuperAdmin) && (isSuperAdmin || !(role.is_system || role.isSystem))) && !(['admin', 'manager'].includes((role.name || '').toLowerCase()) && (role.is_system || role.isSystem)) && (
                        <button onClick={() => handleDelete(role.global_id || role.id)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors border-l border-slate-100 dark:border-slate-800">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
            <h3 className="font-semibold text-black dark:text-slate-100 text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors tracking-tight">{role.name}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-2 line-clamp-2 min-h-[2.5rem] leading-relaxed tracking-tight">{role.description || 'No description provided'}</p>
            {isSuperAdmin && (role.company_id || role.companyId) && (
                <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-semibold mt-1 tracking-tight">
                    <Building2 size={10} className="inline mr-1" />{getCompanyName(role.company_id || role.companyId)}
                </p>
            )}
            <div className="mt-6 flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border tracking-tight ${(role.is_system || role.isSystem) ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                    {(role.is_system || role.isSystem) ? 'Access' : 'Custom config'}
                </span>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 tracking-tight">
                    <Check size={14} className="text-emerald-500 dark:text-emerald-400" />
                    {role.permissions?.filter(p => p.can_view === 1 || p.canView === true || p.canView === 1).length || 0} modules
                </span>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Roles & permissions</h2>
                </div>
                <div className="flex items-center gap-3">
                    {/* Company Filter for Super Admin */}

                    {canCreate('settings') && (
                        <Button onClick={() => openModal()} icon={Plus}>Add role</Button>
                    )}
                </div>
            </div>


            {/* Unified Grid for Roles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRoles.map(renderRoleCard)}
            </div>

            {filteredRoles.length === 0 && (
                <EmptyState message="No roles found for selected filter" icon={Shield} />
            )}

            {showModal && (
                <Modal title={formData.id ? 'Update' + '\u00A0'.repeat(3) + 'Role' : 'Add New Role'} onClose={() => setShowModal(false)} size="lg">
                    <form onSubmit={handleSave} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormInput label="Role Name" required value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="e.g. Manager" />
                            <FormInput label="Description" value={formData.description} onChange={v => setFormData({ ...formData, description: v })} placeholder="Enter role description" />
                        </div>



                        <div>
                            <h4 className="text-sm font-semibold text-black dark:text-slate-300 flex items-center gap-2 mb-4 tracking-tight">
                                <div className="w-1 h-3.5 bg-emerald-600 rounded-full"></div>
                                Permissions
                            </h4>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50/80 dark:bg-slate-800/50">
                                            <tr>
                                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight">Module</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight text-center text-xs">View</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight text-center text-xs">Create</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight text-center text-xs">Edit</th>
                                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight text-center text-xs">Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {MODULES.map((mod) => (
                                                <tr key={mod.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 group transition-colors">
                                                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200 text-sm tracking-tight">{mod.label}</td>
                                                    {['can_view', 'can_create', 'can_edit', 'can_delete'].map(f => (
                                                        <td key={f} className="px-6 py-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={getPerm(mod.key, f)}
                                                                onChange={e => updatePerm(mod.key, f, e.target.checked)}
                                                                disabled={f !== 'can_view' && !getPerm(mod.key, 'can_view')}
                                                                className={`w-4 h-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer ${f !== 'can_view' && !getPerm(mod.key, 'can_view') ? 'opacity-20 cursor-not-allowed' : ''}`}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <ModalFooter onCancel={() => setShowModal(false)} saving={saving} label="Save Role" />
                    </form>
                </Modal>
            )}
        </div>
    );
};

// ============ AUDIT LOG ============
const AuditLog = ({ currentUser }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadLogs(); }, [currentUser]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.getAuditLogs({ companyId: currentUser?.company_id, limit: 100 });
                setLogs(data || []);
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">System audit trail</h2>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/80 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight">Timestamp</th>
                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight">Principal</th>
                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight text-center">Method</th>
                                <th className="px-6 py-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight">Security details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12">
                                        <EmptyState message="No audit records documented in history" icon={Shield} />
                                    </td>
                                </tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                                <ClipboardList size={14} />
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-tight">
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm tracking-tight">{log.fullname || log.username}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-xs font-semibold border border-slate-100 dark:border-slate-800 tracking-tight">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold max-w-xs truncate group-hover:whitespace-normal group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-all tracking-tight">
                                            {log.details || 'No trace description available'}
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ============ COMPANY REQUESTS ============
const CompanyRequests = ({ currentUser, onAction }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejecting, setRejecting] = useState(null); // { id, notes }
    const [isRejecting, setIsRejecting] = useState(false);
    const [referralFilter, setReferralFilter] = useState('all'); // all, with, without

    useEffect(() => { loadRequests(); }, [referralFilter]);

    const { showAlert, showConfirm } = useDialog();
    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.getCompanyRequests({
                status: 'PENDING',
                referralType: referralFilter
            });
            setRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load requests:', err);
            setRequests([]); // Ensure it remains an array to prevent crash
        }
        setLoading(false);
    };

    const handleApprove = async (id) => {
        showConfirm('Approve this company request? This will create a new organization and activate the user.', async () => {
            try {
                const res = await window.electronAPI.approveCompanyRequest(id);
                if (res.success) {
                    loadRequests();
                    if (onAction) onAction();
                } else {
                    showAlert(res.message, 'Approval Failed');
                }
            } catch (err) {
                console.error(err);
            }
        });
    };

    const confirmReject = async () => {
        if (!rejecting.notes?.trim()) return showAlert('Please provide a reason for rejection.', 'Input Required');
        setIsRejecting(true);
        try {
            const res = await window.electronAPI.rejectCompanyRequest(rejecting.id, rejecting.notes);
            if (res.success) {
                setRejecting(null);
                loadRequests();
                if (onAction) onAction();
            } else {
                showAlert(res.message, 'Rejection Failed');
            }
        } catch (err) {
            console.error(err);
        }
        setIsRejecting(false);
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Rejection Modal */}
            {rejecting && (
                <Modal title="Reject Request" onClose={() => setRejecting(null)}>
                    <div className="space-y-6">
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 rounded-lg">
                            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold leading-relaxed italic tracking-tight">
                                "Rejecting this request will disable the user account for this company."
                            </p>
                        </div>
                        <FormTextarea
                            label="Reason"
                            placeholder="Enter rejection reason..."
                            value={rejecting.notes}
                            onChange={(val) => setRejecting({ ...rejecting, notes: val })}
                        />
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                            <button
                                onClick={() => setRejecting(null)}
                                className="px-6 py-2 text-slate-400 dark:text-slate-500 font-semibold hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-xs uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={isRejecting}
                                className="px-6 py-2 bg-rose-600 text-white rounded-lg font-semibold text-xs uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-sm shadow-rose-100 disabled:opacity-50"
                            >
                                {isRejecting ? 'Rejecting...' : 'Reject request'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    {[
                        { id: 'all', label: 'All requests' },
                        { id: 'with', label: 'Referral only' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setReferralFilter(f.id)}
                            className={`px-5 py-2 text-[11px] font-bold rounded-lg transition-all duration-200 ${referralFilter === f.id
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[11px] font-bold border border-emerald-100 dark:border-emerald-800">
                    {requests.length} pending
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.length === 0 ? (
                    <div className="col-span-full">
                        <EmptyState message="No pending requests found" icon={ClipboardList} />
                    </div>
                ) : requests.map((req) => (
                    <div key={req.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 rounded-lg flex items-center justify-center border border-amber-100 dark:border-amber-800">
                                <Building2 size={24} />
                            </div>
                            <div className="flex items-center gap-2">
                                {req.referralCode && (
                                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-xs font-semibold border border-emerald-100 dark:border-emerald-800 flex items-center gap-1 tracking-tight">
                                        <Users size={10} /> {req.referralCode}
                                    </span>
                                )}
                                <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-xs font-semibold border border-amber-100 dark:border-amber-800 tracking-tight">Pending</span>
                            </div>
                        </div>

                        <h3 className="font-bold text-black dark:text-slate-100 text-lg mb-1">{req.companyName}</h3>
                        <div className="space-y-2 mb-6">
                            <p className="text-sm text-black dark:text-slate-400 font-semibold flex items-center gap-2">
                                <Mail size={12} /> {req.companyEmail || 'No Email'}
                            </p>
                            <p className="text-sm text-black dark:text-slate-400 font-semibold flex items-center gap-2">
                                <Phone size={12} /> {req.companyPhone || 'No Phone'}
                            </p>
                            <p className="text-sm text-black dark:text-slate-400 flex items-center gap-2 border-t border-slate-50 dark:border-slate-800 pt-2 mt-2">
                                <Users size={12} /> Requested by: <span className="font-semibold text-black dark:text-slate-100">@{req.user?.username}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleApprove(req.id)}
                                className="py-2 bg-emerald-600 dark:bg-emerald-600 text-white rounded-lg font-semibold text-xs hover:bg-emerald-700 dark:hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-100 dark:shadow-none tracking-tight"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => setRejecting({ id: req.id, notes: '' })}
                                className="py-2 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded-lg font-semibold text-xs hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors tracking-tight"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============ SHARED COMPONENTS ============
const StatCard = ({ title, value, icon: Icon, color }) => {
    const colors = {
        orange: 'bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500',
        emerald: 'bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500',
        red: 'bg-white dark:bg-slate-900 border-l-4 border-l-rose-500',
        blue: 'bg-white dark:bg-slate-900 border-l-4 border-l-emerald-600',
        purple: 'bg-white dark:bg-slate-900 border-l-4 border-l-indigo-500',
        gray: 'bg-white dark:bg-slate-900 border-l-4 border-l-slate-400 dark:border-l-slate-600'
    };

    return (
        <div className={`relative overflow-hidden ${colors[color]} p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-200 hover:shadow-md group`}>
            <div className="relative flex items-center justify-between">
                <div>
                    <p className="text-black dark:text-slate-400 text-sm font-semibold mb-1 tracking-tight">{title}</p>
                    <h3 className="text-xl font-bold text-black dark:text-slate-100 tracking-tight">{value}</h3>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    <Icon size={20} />
                </div>
            </div>
        </div>
    );
};

const Button = ({ children, label, onClick, icon: Icon, type = 'button', disabled, className = '' }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center justify-center space-x-2 px-6 py-2.5 bg-emerald-600 dark:bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-100 dark:shadow-none active:scale-95 text-xs disabled:opacity-50 tracking-tight ${className}`}
    >
        {Icon && <Icon size={16} />}
        <span className="whitespace-nowrap">{children || label}</span>
    </button>
);

const StatusBadge = ({ active }) => (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border tracking-tight ${active ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800'}`}>
        <span className={`w-1 h-1 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
        {active ? 'Active' : 'Deactivated'}
    </span>
);

const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-slate-100 dark:border-slate-800 border-t-emerald-600 dark:border-t-emerald-500 rounded-full animate-spin"></div>
    </div>
);

const EmptyState = ({ message, icon: Icon = Info }) => (
    <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <Icon size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold tracking-tight">{message}</p>
    </div>
);

const FormInput = ({ label, type = 'text', value, onChange, required, placeholder, icon: Icon, suffix }) => (
    <div className="space-y-1.5 text-left">
        <label className="text-sm font-semibold text-black dark:text-slate-200 ml-1 tracking-tight">{label} {required && '*'}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />}
            <input
                type={type}
                required={required}
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full ${Icon ? 'pl-10' : 'px-4'} ${suffix ? 'pr-10' : 'pr-4'} py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 dark:focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/5 dark:focus:ring-emerald-500/10 outline-none transition-all font-semibold text-sm text-black dark:text-slate-100 tracking-tight`}
            />
            {suffix && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    {suffix}
                </div>
            )}
        </div>
    </div>
);

const FormTextarea = ({ label, value, onChange, rows = 3, placeholder, icon: Icon }) => (
    <div className="space-y-1.5 text-left">
        <label className="text-sm font-semibold text-black dark:text-slate-200 ml-1 tracking-tight">{label}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" size={16} />}
            <textarea
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                rows={rows}
                placeholder={placeholder}
                className={`w-full ${Icon ? 'pl-10' : 'px-4'} pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 dark:focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/5 dark:focus:ring-emerald-500/10 outline-none transition-all font-semibold text-sm text-black dark:text-slate-100 resize-none tracking-tight`}
            />
        </div>
    </div>
);

const FormSelect = ({ label, value, onChange, options, required, placeholder, icon: Icon }) => (
    <div className="space-y-1.5 text-left">
        <label className="text-sm font-semibold text-black dark:text-slate-200 ml-1 tracking-tight">{label} {required && '*'}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />}
            <select
                required={required}
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                className={`w-full ${Icon ? 'pl-10' : 'px-4'} pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 dark:focus:border-emerald-600 transition-all font-semibold text-sm text-black dark:text-slate-100 outline-none appearance-none tracking-tight`}
            >
                <option value="">{placeholder || 'Select...'}</option>
                {options.map(opt => <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800">{opt.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
        </div>
    </div>
);

const Modal = ({ title, children, onClose, size = 'md' }) => (
    <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-white dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
        {/* Full-Page Header */}
        <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Building2 size={22} />
                </div>
                <div>
                    <h3 className="text-sm md:text-xl font-bold text-black dark:text-slate-100 tracking-tight">{title}</h3>
                </div>
            </div>
            <button
                onClick={onClose}
                className="p-3 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
            >
                <span className="text-[10px] font-semibold hidden md:block tracking-tight">Close</span>
                <X size={20} />
            </button>
        </div>
        <div className="flex-1 p-8 overflow-y-auto scrollbar-hide bg-slate-50/30 dark:bg-slate-900/30">
            <div className={`mx-auto w-full ${size === 'lg' ? 'max-w-7xl' : 'max-w-4xl'}`}>
                {children}
            </div>
        </div>
    </div>
);


const ModalFooter = ({ onCancel, saving, label = 'Save Changes' }) => (
    <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800 mt-6">
        <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-slate-400 dark:text-slate-500 font-semibold hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-xs tracking-tight"
        >
            Discard
        </button>
        <Button
            type="submit"
            disabled={saving}
            label={saving ? 'Processing...' : label}
        />
    </div>
);

const ComplainRequests = ({ onAction }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.getSupportRequests({ status: 'PENDING' });
            setRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const updateStatus = async (id, status) => {
        try {
            await window.electronAPI.updateSupportStatus(id, status);
            loadData();
            if (onAction) onAction();
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-lg font-bold text-black dark:text-slate-200 tracking-tight">Complains</h3>
                </div>
                <button onClick={loadData} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold text-xs rounded-lg transition-colors border border-slate-100 dark:border-slate-800 tracking-tight">Refresh feed</button>
            </div>

            {requests.length === 0 ? (
                <EmptyState icon={Info} title="No tickets found" description="All support requests will appear here." />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                <th className="p-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight">User details</th>
                                <th className="p-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight">WhatsApp / Email</th>
                                <th className="p-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight">Description</th>
                                <th className="p-4 text-sm font-semibold text-black dark:text-slate-300 tracking-tight">Status</th>
                                <th className="p-4 text-sm font-semibold text-black dark:text-slate-300 text-right tracking-tight">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map(req => (
                                <tr key={req.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="p-4">
                                        <p className="font-semibold text-black dark:text-slate-200 text-sm tracking-tight">{req.fullName}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1 tracking-tight">{new Date(req.createdAt).toLocaleDateString()}</p>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                                <Phone size={12} />
                                                <span className="text-xs font-bold">{req.whatsapp}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                                <Mail size={12} />
                                                <span className="text-xs font-bold">{req.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 max-w-xs">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2 italic">{req.description}</p>
                                    </td>
                                    <td className="p-4">
                                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-tight capitalize
                                            ${req.status === 'PENDING' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800'}
                                        `}>
                                            {req.status?.toLowerCase()}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {req.status === 'PENDING' ? (
                                                <button onClick={() => updateStatus(req.id, 'RESOLVED')} className="p-2 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg" title="Mark as Resolved"><Check size={16} /></button>
                                            ) : (
                                                <button onClick={() => updateStatus(req.id, 'PENDING')} className="p-2 text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg" title="Re-open"><X size={16} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const SystemBroadcast = () => {
    const [message, setMessage] = useState('');
    const [type, setType] = useState('general');
    const [sending, setSending] = useState(false);
    const [recentMessages, setRecentMessages] = useState([]);

    const { showSuccess, showError } = useDialog();

    useEffect(() => { loadMessages(); }, []);

    const loadMessages = async () => {
        try {
            const data = await window.electronAPI.getAdminMessages({ limit: 5 });
            if (Array.isArray(data)) setRecentMessages(data);
        } catch (err) { console.error("Error loading messages:", err); }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        setSending(true);
        try {
            const res = await window.electronAPI.sendAdminMessage({ content: message, type });
            if (res.success) {
                setMessage('');
                loadMessages();
                showSuccess('Message broadcasted successfully!');
            } else {
                showError('Failed: ' + res.message);
            }
        } catch (err) {
            showError('Error: ' + err.message);
        }
        setSending(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-black dark:text-slate-100 mb-6 flex items-center gap-2 tracking-tight">
                    <Send className="text-emerald-600 dark:text-emerald-400" size={20} />
                    Create new broadcast
                </h3>
                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label className="text-sm font-semibold text-black dark:text-slate-200 ml-1 tracking-tight">Message content</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all min-h-[120px] text-black dark:text-slate-100 tracking-tight"
                            placeholder="Type a message for all system users..."
                            required
                        />
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
                        <div className="w-full md:w-48">
                            <label className="text-sm font-semibold text-black dark:text-slate-200 ml-1 tracking-tight">Alert type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all text-black dark:text-slate-100"
                            >
                                <option value="general" className="dark:bg-slate-900">📢 General</option>
                                <option value="alert" className="dark:bg-slate-900">⚠️ Urgent Alert</option>
                                <option value="update" className="dark:bg-slate-900">🚀 System Update</option>
                            </select>
                        </div>
                        <button
                            disabled={sending}
                            className="px-8 py-2.5 bg-emerald-600 dark:bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 dark:hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                            <Send size={18} />
                            {sending ? 'Broadcasting...' : 'Broadcast Now'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
                <h3 className="text-sm font-semibold text-black dark:text-slate-500 mb-4 tracking-tight">Recent broadcasts</h3>
                <div className="space-y-3">
                    {recentMessages.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">No recent messages found.</p>
                    ) : recentMessages.map((m) => (
                        <div key={m.id} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm flex items-start justify-between group">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${m.type === 'alert' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 border-rose-100 dark:border-rose-900/30' :
                                        m.type === 'update' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' :
                                            'bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
                                        }`}>
                                        {m.type}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{new Date(m.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-black dark:text-slate-200 font-bold">{m.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Company;
