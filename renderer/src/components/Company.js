import React, { useState, useEffect } from 'react';
import { Building2, Users, Shield, ClipboardList, Plus, Search, Edit2, Trash2, X, Eye, EyeOff, Check, ChevronDown, Info, Mail, Phone, MapPin, Megaphone, Send } from 'lucide-react';
import { canCreate, canEdit, canDelete } from '../utils/permissions';


const tabs = [
    { id: 'profile', label: 'Business Profile', icon: Building2, color: 'blue' },
    { id: 'users', label: 'Manage Team', icon: Users, color: 'indigo' },
    { id: 'roles', label: 'Staff Access', icon: Shield, color: 'emerald' },
    { id: 'requests', label: 'Organization Requests', icon: ClipboardList, color: 'amber' },
    { id: 'helpline', label: 'Customer Support', icon: Phone, color: 'rose' },
    { id: 'broadcast', label: 'System Broadcast', icon: Megaphone, color: 'purple' },
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
    { key: 'accounting', label: 'Accounting' },
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



            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                {/* Modern Tab Bar */}
                <div className="flex items-center px-4 bg-slate-50/20 border-b border-slate-100 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => {
                        // FOR SUPER ADMIN: Show Profile (Companies), Users, Roles, and Requests
                        if (isSuperAdmin && !['profile', 'users', 'roles', 'requests'].includes(tab.id)) return null;

                        // FOR REGULAR USERS: Filter baseline
                        if (!isSuperAdmin && (['helpline', 'requests', 'broadcast'].includes(tab.id))) return null;

                        const label = (tab.id === 'profile' && isSuperAdmin) ? 'Companies' : tab.label;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center space-x-3 px-6 py-4 text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap group ${activeTab === tab.id
                                    ? 'text-blue-600'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <tab.icon size={16} />
                                <span>{label}</span>
                                {tab.id === 'requests' && isSuperAdmin && counts.requests > 0 && (
                                    <span className="ml-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                )}
                                {tab.id === 'helpline' && isSuperAdmin && counts.helpline > 0 && (
                                    <span className="ml-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                )}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>
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
                    {activeTab === 'helpline' && isSuperAdmin && <SupportRequests onAction={fetchCounts} />}
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
    const [companyReferralFilter, setCompanyReferralFilter] = useState('all');

    useEffect(() => { loadData(); }, [currentUser, isSuperAdmin, companySearch, companyReferralFilter]);

    const loadData = async () => {
        setLoading(true);
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
                            office_phone: data.officePhone,
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
                    window.alert(result.message);
                } else {
                    setShowModal(false);
                    loadData();
                }
            }
        } catch (err) {
            window.alert('Error: ' + err.message);
        }
        setSaving(false);
    };

    const openModal = (comp = null) => {
        if (comp) {
            setFormData({
                ...comp,
                office_phone: comp.officePhone,
                is_active: comp.isActive
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
        if (!window.confirm('Are you sure you want to PERMANENTLY delete this company and all its data?')) return;
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.deleteCompany(id);
                if (result?.success === false) {
                    window.alert(result.message);
                } else {
                    loadData();
                }
            }
        } catch (err) {
            window.alert('Error: ' + err.message);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (isSuperAdmin) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-black tracking-tight">Registered Companies</h2>
                        <p className="text-sm text-black font-bold">Managing {companies.length} business entities</p>
                    </div>

                    <div className="flex flex-1 flex-col md:flex-row items-center gap-4 max-w-2xl justify-end">
                        <div className="relative group w-full md:w-64">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                            <input
                                type="text"
                                value={companySearch}
                                onChange={e => setCompanySearch(e.target.value)}
                                placeholder="Search companies..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'with', label: 'Referral' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setCompanyReferralFilter(f.id)}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${companyReferralFilter === f.id
                                        ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {canCreate('settings') && (
                            <Button onClick={() => openModal()} icon={Plus}>Register</Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {console.log("🎨 [RENDER] Rendering companies, length:", companies.length, "Data:", companies)}
                    {companies.map((c) => (
                        <div
                            key={c.id}
                            onClick={() => openDetailModal(c)}
                            className="group relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="hidden">
                                    {c.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex gap-1 shadow-sm border border-slate-100 rounded-lg bg-white overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                                    {canDelete('settings') && (
                                        <button
                                            onClick={(e) => handleDeleteCompany(e, c.id)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    {canEdit('settings') && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openModal(c); }}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border-l border-slate-100"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors truncate uppercase tracking-tight">{c.name}</h3>
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center text-xs font-bold text-slate-400 gap-2">
                                        <Building2 size={14} />
                                        <span className="truncate">{c.email || 'No email attached'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-widest ${c.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                            {c.isActive ? 'Active' : 'Inactive'}
                                        </div>
                                        <div className="flex items-center text-[10px] font-bold text-slate-400 gap-2 uppercase tracking-widest">
                                            <Users size={14} />
                                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">Active Tenant</span>
                                        </div>
                                    </div>
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
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                                            Core Information
                                        </h4>
                                        <FormInput label="Company Name" required value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="e.g. Acme Corporation" icon={Building2} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormInput label="Official Email" type="email" required value={formData.email} onChange={v => setFormData({ ...formData, email: v })} placeholder="office@company.com" icon={Mail} />
                                            <FormInput label="Referral Code" value={formData.referral_code} onChange={v => setFormData({ ...formData, referral_code: v })} placeholder="Refral (Optional)" icon={Users} />
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                                            Communications
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormInput label="Mmbile Phone" required value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} placeholder="Mobile No" icon={Phone} />
                                            <FormInput label="Office Number" value={formData.office_phone} onChange={v => setFormData({ ...formData, office_phone: v })} placeholder="Landline" icon={Phone} />
                                        </div>
                                        <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl cursor-pointer group hover:bg-blue-50 transition-colors border border-slate-200 mt-4">
                                            <input type="checkbox" checked={formData.is_active === true || formData.is_active === 1} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">Organization Status</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{formData.is_active ? 'Account is live and accessible' : 'Account is locked/disabled'}</p>
                                            </div>
                                        </label>
                                    </div>
                                    <div className="col-span-full space-y-6">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                                            Address Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormTextarea label="Physical Address" required value={formData.address} onChange={v => setFormData({ ...formData, address: v })} placeholder="Main street, Area..." />
                                            <FormInput label="City" required value={formData.city} onChange={v => setFormData({ ...formData, city: v })} placeholder="City Name" icon={MapPin} />
                                        </div>
                                    </div>
                                </div>
                                <ModalFooter onCancel={() => setShowModal(false)} saving={saving} label={formData.id ? 'Save Configuration' : 'Onboard Organization'} />
                            </form>
                        </Modal>
                    )
                }

                {
                    showDetailModal && selectedCompany && (
                        <Modal title="Tenant Overview" onClose={() => setShowDetailModal(false)} size="lg">
                            <div className="space-y-8">
                                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                    <div className="flex items-start gap-6">
                                        <div className="w-20 h-20 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                                            {selectedCompany.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-xl font-bold text-slate-800 mb-2 uppercase tracking-tight">{selectedCompany.name}</h2>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-xs">
                                                <div>
                                                    <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">Email Endpoint</span>
                                                    <p className="text-slate-700 font-bold">{selectedCompany.email || '—'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">Direct Contact</span>
                                                    <p className="text-slate-700 font-bold">{selectedCompany.phone || '—'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">Office Line</span>
                                                    <p className="text-slate-700 font-bold">{selectedCompany.officePhone || '—'}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">HQ Address</span>
                                                    <p className="text-slate-700 font-bold leading-relaxed">
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
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Users size={16} />
                                            Onboarded Users
                                        </h3>
                                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-100">
                                            {companyUsers.length} MEMBERS
                                        </span>
                                    </div>

                                    {loadingUsers ? <LoadingSpinner /> : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                            {companyUsers.length === 0 ? (
                                                <EmptyState message="No users assigned to this tenant" />
                                            ) : companyUsers.map((user) => (
                                                <div key={user.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-100 hover:border-blue-200 transition-all group">
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors uppercase tracking-tight">{user.fullname}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">@{user.username}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold uppercase tracking-tight border border-indigo-100">
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
            </div >
        );
    }

    return (
        <form onSubmit={handleSave} className="max-w-4xl animate-in fade-in duration-500">
            <div className="p-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="relative shrink-0">
                        <div className="relative w-32 h-32 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600 font-black text-5xl shadow-sm">
                            {formData.name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormInput label="Company Name" required value={formData.name} onChange={v => setFormData({ ...formData, name: v })} icon={Building2} />
                            <FormInput label="Official Email" type="email" required value={formData.email} onChange={v => setFormData({ ...formData, email: v })} icon={Mail} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormInput label="Mobile Phone" required value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} icon={Phone} />
                            <FormInput label="Office Number" value={formData.office_phone} onChange={v => setFormData({ ...formData, office_phone: v })} icon={Phone} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormTextarea label="Physical Address" required value={formData.address} onChange={v => setFormData({ ...formData, address: v })} />
                            <FormInput label="City" required value={formData.city} onChange={v => setFormData({ ...formData, city: v })} icon={MapPin} />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                    {canEdit('settings') && (
                        <Button type="submit">
                            {saving ? 'Synchronizing...' : 'Update Corporate Profile'}
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
                const filteredUsers = (usersData || []).filter(u => {
                    const isSuper = u.role?.toLowerCase() === 'super admin' || u.role?.toLowerCase() === 'super_admin';
                    if (isSuper) return false;

                    // If companyId filter is active, ensure we only show those users
                    const uCid = u.company_id || u.companyId;
                    if (companyId && uCid !== companyId) return false;

                    // If Super Admin is viewing, only show company 'Admin' roles
                    if (isSuperAdmin) {
                        return u.role?.toLowerCase() === 'admin';
                    }
                    return true;
                });
                setUsers(filteredUsers);
                setRoles(rolesData || []);
                // Always fetch companies for dropdown
                const comps = await window.electronAPI.getCompanies() || [];
                setCompanies(comps);
            }
        } catch (err) {
            window.alert('Error: ' + err.message);
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
                window.alert(result.message);
            } else {
                setShowModal(false);
                loadData();
            }
        } catch (err) {
            window.alert('Error: ' + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this user?')) return;
        await window.electronAPI.deleteUser(id);
        loadData();
    };

    const openModal = (user = null) => {
        if (user) {
            setFormData({
                ...user,
                role_id: user.role_id || user.roleId,
                password: ''
            });
        } else {
            setFormData({
                company_id: currentUser?.company_id || currentUser?.companyId || '',
                username: '',
                password: '',
                role: 'admin',
                role_id: null,
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

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Members" value={stats.total} icon={Users} color="blue" />
                <StatCard title="Active Accounts" value={stats.active} icon={Check} color="emerald" />
                <StatCard title="System Admins" value={stats.admins} icon={Shield} color="purple" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search personnel directory..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
                    />
                </div>
                {canCreate('users') && (
                    <Button onClick={() => openModal()} icon={Plus}>Onboard New Member</Button>
                )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">User Identity</th>
                                {isSuperAdmin && <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Assign Tenant</th>}
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Access Matrix</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Security Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-4">
                                            <div>
                                                <p className="font-bold text-slate-800 text-xs group-hover:text-blue-600 transition-colors uppercase tracking-tight">{user.fullname}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">@{user.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    {isSuperAdmin && (
                                        <td className="px-6 py-4 font-bold text-slate-600 text-xs uppercase tracking-tight">
                                            {user.company_name || 'System Principal'}
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase tracking-tight border border-indigo-100">
                                            {user.role?.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusBadge active={user.is_active} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {canEdit('users') && (
                                                <button onClick={() => openModal(user)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {canDelete('users') && (
                                                <button onClick={() => handleDelete(user.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
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
                <Modal title={formData.id ? 'Modify System Access' : 'Onboard New Principal'} onClose={() => setShowModal(false)} size="md">
                    <form onSubmit={handleSave} className="space-y-6">
                        {isSuperAdmin && (
                            <FormSelect
                                label="Assign to Organization"
                                required
                                value={formData.company_id}
                                onChange={v => setFormData({ ...formData, company_id: v })}
                                options={companies.map(c => ({ value: c.id, label: c.name }))}
                                placeholder="Select organization"
                                icon={Building2}
                            />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="Personnel Legal Name" required value={formData.fullname} onChange={v => setFormData({ ...formData, fullname: v })} placeholder="John Doe" icon={Users} />
                            <FormInput label="System Username" required value={formData.username} onChange={v => setFormData({ ...formData, username: v })} placeholder="j_doe" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput
                                label={formData.id ? "Security Key (Optional Reset)" : "Initial Access Key"}
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
                                label="Assigned Privileges"
                                required
                                value={formData.role_id || formData.roleId || ''}
                                onChange={v => {
                                    const roleObj = roles.find(r => (r.global_id || r.id) == v);
                                    setFormData({ ...formData, role_id: v, role: roleObj ? roleObj.name : '' });
                                }}
                                options={roles.filter(r => !['super admin', 'super_admin'].includes(r.name.toLowerCase())).map(r => ({ value: r.global_id || r.id, label: r.name }))}
                                icon={Shield}
                            />
                        </div>
                        <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl cursor-pointer group hover:bg-blue-50 transition-colors border border-slate-200">
                            <input type="checkbox" checked={formData.is_active === 1} onChange={e => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <div>
                                <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">Access Enabled</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Allow this individual to authenticate</p>
                            </div>
                        </label>
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
    const [selectedCompany, setSelectedCompany] = useState('all');
    const [formData, setFormData] = useState({ name: '', description: '', permissions: [] });

    useEffect(() => { loadRoles(); }, [currentUser, isSuperAdmin]);

    const loadRoles = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                // Super Admin: load all companies first
                if (isSuperAdmin) {
                    const comps = await window.electronAPI.getCompanies() || [];
                    setCompanies(comps);
                }

                const companyId = isSuperAdmin ? null : (currentUser?.company_id || currentUser?.companyId);
                const data = await window.electronAPI.getRoles(companyId);
                // Ensure roles have unique IDs for React keys
                const rolesWithPerms = await Promise.all((data || []).map(async (role) => {
                    const perms = await window.electronAPI.getPermissions(role.global_id || role.id) || [];
                    return { ...role, permissions: perms };
                }));
                console.log("Renders Roles with Perms:", rolesWithPerms.length);
                setRoles(rolesWithPerms);
            }
        } catch (err) {
            console.error("Load Roles Error:", err);
            window.alert('Error: ' + err.message);
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // For Super Admin creating role, use selectedCompany or formData.company_id
            let targetCompanyId = formData.company_id || currentUser?.company_id || currentUser?.companyId;
            if (isSuperAdmin && formData.target_company_id) {
                targetCompanyId = formData.target_company_id;
            }

            const data = {
                ...formData,
                company_id: targetCompanyId
            };

            console.info("--- SAVING ROLE CONFIGURATION ---");
            console.log("Role Name:", data.name, "Company:", data.company_id);
            console.table(data.permissions.map(p => ({
                Module: p.module,
                V: p.can_view, C: p.can_create, E: p.can_edit, D: p.can_delete
            })));

            const result = formData.id
                ? await window.electronAPI.updateRole(data)
                : await window.electronAPI.createRole(data);

            if (result && result.success) {
                console.info("✓ ROLE SAVED SUCCESSFULLY");
                setShowModal(false);
                setTimeout(async () => { await loadRoles(); }, 500);
            } else {
                window.alert('Error: ' + (result?.message || 'Operation failed'));
            }
        } catch (err) {
            console.error("Save Role Error:", err);
            window.alert('System Error: ' + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this role definition?')) return;
        await window.electronAPI.deleteRole(id);
        loadRoles();
    };

    const openModal = (role = null) => {
        let initialPerms = [];
        if (role) {
            initialPerms = MODULES.map(m => {
                const existing = (role.permissions || []).find(p => p.module === m.key);
                return existing ? { ...existing } : { module: m.key, can_view: 0, can_create: 0, can_edit: 0, can_delete: 0 };
            });
            setFormData({ ...role, permissions: initialPerms });
        } else {
            initialPerms = MODULES.map(m => ({ module: m.key, can_view: 1, can_create: 0, can_edit: 0, can_delete: 0 }));
            setFormData({ name: '', description: '', permissions: initialPerms, target_company_id: isSuperAdmin ? (selectedCompany !== 'all' ? selectedCompany : '') : '' });
        }
        setShowModal(true);
    };

    const updatePerm = (mod, field, val) => setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.map(p => p.module === mod ? { ...p, [field]: val ? 1 : 0 } : p)
    }));

    const getPerm = (mod, field) => formData.permissions.find(p => p.module === mod)?.[field] === 1;

    if (loading) return <LoadingSpinner />;

    // Filter roles: exclude Super Admin, and filter by selectedCompany for Super Admin
    const filteredRoles = roles.filter(r => {
        if (['super admin', 'super_admin'].includes(r.name?.toLowerCase())) return false;
        if (isSuperAdmin && selectedCompany !== 'all') {
            const roleCid = r.company_id || r.companyId;
            if (selectedCompany === 'system') return r.is_system === 1 || r.isSystem === true;
            return roleCid === selectedCompany || (!roleCid && (r.is_system === 1 || r.isSystem === true));
        }
        return true;
    });

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
        <div key={role.id || role.global_id} className="group relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <Shield size={24} />
                </div>
                <div className="flex gap-1 shadow-sm border border-slate-100 rounded-lg bg-white overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEdit('roles') && (
                        <button onClick={() => openModal(role)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <Edit2 size={16} />
                        </button>
                    )}
                    {(canDelete('roles') || isSuperAdmin) && (
                        <button onClick={() => handleDelete(role.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border-l border-slate-100">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
            <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors uppercase tracking-tight">{role.name}</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 line-clamp-2 min-h-[2.5rem] leading-relaxed">{role.description || 'No description provided'}</p>
            {isSuperAdmin && (role.company_id || role.companyId) && (
                <p className="text-[10px] text-blue-500 font-bold mt-1 uppercase tracking-widest">
                    <Building2 size={10} className="inline mr-1" />{getCompanyName(role.company_id || role.companyId)}
                </p>
            )}
            <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
                <span className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-tight ${(role.is_system || role.isSystem) ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                    {(role.is_system || role.isSystem) ? 'System Core' : 'Custom Config'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                    <Check size={14} className="text-emerald-500" />
                    {role.permissions?.filter(p => p.can_view === 1 || p.canView === true || p.canView === 1).length || 0} Modules
                </span>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Access Control Roles</h2>
                    <p className="text-sm text-slate-500">Define custom permission sets for your team members</p>
                </div>
                <div className="flex items-center gap-3">
                    {isSuperAdmin && (
                        <select
                            value={selectedCompany}
                            onChange={e => setSelectedCompany(e.target.value)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
                        >
                            <option value="all">All Companies</option>
                            <option value="system">System Roles Only</option>
                            {companies.map(c => (
                                <option key={c.id || c.global_id} value={c.global_id || c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}
                    {canCreate('settings') && (
                        <Button onClick={() => openModal()} icon={Plus}>Create New Role</Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Roles" value={filteredRoles.length} icon={Shield} color="blue" />
                <StatCard title="System Roles" value={filteredRoles.filter(r => r.is_system || r.isSystem).length} icon={Shield} color="purple" />
                <StatCard title="Custom Roles" value={filteredRoles.filter(r => !r.is_system && !r.isSystem).length} icon={Shield} color="emerald" />
            </div>

            {/* System Roles Section (only for super admin or if present) */}
            {systemRoles.length > 0 && isSuperAdmin && selectedCompany === 'all' && (
                <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <div className="w-1 h-3.5 bg-indigo-600 rounded-full"></div>
                        Global System Roles (Available to All Companies)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {systemRoles.map(renderRoleCard)}
                    </div>
                </div>
            )}

            {/* Company Roles */}
            {companyRoles.length > 0 && (
                <div>
                    {isSuperAdmin && selectedCompany === 'all' && (
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                            Company Roles
                        </h3>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {companyRoles.map(renderRoleCard)}
                    </div>
                </div>
            )}

            {filteredRoles.length === 0 && (
                <EmptyState message="No roles found for selected filter" icon={Shield} />
            )}

            {showModal && (
                <Modal title={formData.id ? 'Modify Access Matrix' : 'Define New Permission Tier'} onClose={() => setShowModal(false)} size="lg">
                    <form onSubmit={handleSave} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormInput label="Administrative Title" required value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="e.g. Sales Manager" />
                            <FormInput label="Functional Description" value={formData.description} onChange={v => setFormData({ ...formData, description: v })} placeholder="What can this role do?" />
                        </div>

                        {/* Super Admin: select which company this role belongs to */}
                        {isSuperAdmin && !formData.id && (
                            <FormSelect
                                label="Assign Role to Organization"
                                required
                                value={formData.target_company_id}
                                onChange={v => setFormData({ ...formData, target_company_id: v })}
                                options={companies.map(c => ({ value: c.global_id || c.id, label: c.name }))}
                                placeholder="Select organization"
                                icon={Building2}
                            />
                        )}

                        <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                                Granular Operations Matrix
                            </h4>
                            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50/80">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Module</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">R</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">W</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">U</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">D</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {MODULES.map((mod) => (
                                                <tr key={mod.key} className="hover:bg-slate-50/50 group transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-800 text-xs uppercase tracking-tight">{mod.label}</td>
                                                    {['can_view', 'can_create', 'can_edit', 'can_delete'].map(f => (
                                                        <td key={f} className="px-6 py-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={getPerm(mod.key, f)}
                                                                onChange={e => updatePerm(mod.key, f, e.target.checked)}
                                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
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

                        <ModalFooter onCancel={() => setShowModal(false)} saving={saving} label="Save Role Config" />
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
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">System Audit Trail</h2>
                    <p className="text-sm text-slate-500">Chronological history of security events and transactions</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Timestamp</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Principal</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Method</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Security Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12">
                                        <EmptyState message="No audit records documented in history" icon={Shield} />
                                    </td>
                                </tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-slate-50 text-slate-400 rounded transition-colors group-hover:text-blue-600">
                                                <ClipboardList size={14} />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800 text-xs uppercase tracking-tight">{log.fullname || log.username}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded text-[10px] font-bold uppercase tracking-tight border border-slate-100">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-xs truncate group-hover:whitespace-normal group-hover:text-slate-600 transition-all">
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

    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.getCompanyRequests({
                status: 'PENDING',
                referralType: referralFilter
            });
            setRequests(data);
        } catch (err) {
            console.error('Failed to load requests:', err);
        }
        setLoading(false);
    };

    const handleApprove = async (id) => {
        if (!window.confirm('Approve this company request? This will create a new organization and activate the user.')) return;
        try {
            const res = await window.electronAPI.approveCompanyRequest(id);
            if (res.success) {
                loadRequests();
                if (onAction) onAction();
            } else {
                alert(res.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const confirmReject = async () => {
        if (!rejecting.notes?.trim()) return alert('Please provide a reason for rejection.');
        setIsRejecting(true);
        try {
            const res = await window.electronAPI.rejectCompanyRequest(rejecting.id, rejecting.notes);
            if (res.success) {
                setRejecting(null);
                loadRequests();
                if (onAction) onAction();
            } else {
                alert(res.message);
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
                <Modal title="Reject Registration" onClose={() => setRejecting(null)}>
                    <div className="space-y-6">
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg">
                            <p className="text-xs text-rose-600 font-bold leading-relaxed italic">
                                "Blocking this request will deactivate the associated user account permanently unless reconsidered."
                            </p>
                        </div>
                        <FormTextarea
                            label="Reason for Rejection"
                            placeholder="Specify why this request is being denied..."
                            value={rejecting.notes}
                            onChange={(val) => setRejecting({ ...rejecting, notes: val })}
                        />
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                            <button
                                onClick={() => setRejecting(null)}
                                className="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors text-xs uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={isRejecting}
                                className="px-6 py-2 bg-rose-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-sm shadow-rose-100 disabled:opacity-50"
                            >
                                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-xl font-bold text-black tracking-tight">Access Requests</h2>
                    <p className="text-sm text-black font-bold">Review pending organization registration requests</p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    {[
                        { id: 'all', label: 'All Requests' },
                        { id: 'with', label: 'Referral Only' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setReferralFilter(f.id)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${referralFilter === f.id
                                ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold uppercase tracking-widest border border-blue-100">
                    {requests.length} Pending
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.length === 0 ? (
                    <div className="col-span-full">
                        <EmptyState message="No pending requests found" icon={ClipboardList} />
                    </div>
                ) : requests.map((req) => (
                    <div key={req.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center border border-amber-100">
                                <Building2 size={24} />
                            </div>
                            <div className="flex items-center gap-2">
                                {req.referralCode && (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                                        <Users size={10} /> {req.referralCode}
                                    </span>
                                )}
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-bold uppercase tracking-widest border border-amber-100">Pending</span>
                            </div>
                        </div>

                        <h3 className="font-bold text-black text-lg mb-1">{req.companyName}</h3>
                        <div className="space-y-2 mb-6">
                            <p className="text-xs text-black font-bold flex items-center gap-2">
                                <Mail size={12} /> {req.companyEmail || 'No Email'}
                            </p>
                            <p className="text-xs text-black font-bold flex items-center gap-2">
                                <Phone size={12} /> {req.companyPhone || 'No Phone'}
                            </p>
                            <p className="text-xs text-black flex items-center gap-2 border-t border-slate-50 pt-2 mt-2">
                                <Users size={12} /> Requested by: <span className="font-bold text-black">@{req.user?.username}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleApprove(req.id)}
                                className="py-2 bg-blue-950 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-[#0B1033] transition-colors shadow-sm shadow-blue-100"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => setRejecting({ id: req.id, notes: '' })}
                                className="py-2 bg-white text-rose-600 border border-rose-100 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-rose-50 transition-colors"
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
        orange: 'bg-white border-l-4 border-l-blue-500',
        emerald: 'bg-white border-l-4 border-l-emerald-500',
        red: 'bg-white border-l-4 border-l-rose-500',
        blue: 'bg-white border-l-4 border-l-blue-950',
        purple: 'bg-white border-l-4 border-l-indigo-500',
        gray: 'bg-white border-l-4 border-l-slate-400'
    };

    return (
        <div className={`relative overflow-hidden ${colors[color]} p-5 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md group`}>
            <div className="relative flex items-center justify-between">
                <div>
                    <p className="text-black text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
                    <h3 className="text-xl font-bold text-black">{value}</h3>
                </div>
                <div className="p-2.5 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
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
        className={`flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50 ${className}`}
    >
        {Icon && <Icon size={16} />}
        <span>{children || label}</span>
    </button>
);

const StatusBadge = ({ active }) => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-tight ${active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
        <span className={`w-1 h-1 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
        {active ? 'Active' : 'Deactivated'}
    </span>
);

const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
);

const EmptyState = ({ message, icon: Icon = Info }) => (
    <div className="text-center py-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <Icon size={40} className="mx-auto text-slate-200 mb-3" />
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{message}</p>
    </div>
);

const FormInput = ({ label, type = 'text', value, onChange, required, placeholder, icon: Icon, suffix }) => (
    <div className="space-y-1.5 text-left">
        <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">{label} {required && '*'}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold" size={16} />}
            <input
                type={type}
                required={required}
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full ${Icon ? 'pl-10' : 'px-4'} ${suffix ? 'pr-10' : 'pr-4'} py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm text-black`}
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
        <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">{label}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3.5 top-3 text-slate-400" size={16} />}
            <textarea
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                rows={rows}
                placeholder={placeholder}
                className={`w-full ${Icon ? 'pl-10' : 'px-4'} pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm text-black resize-none`}
            />
        </div>
    </div>
);

const FormSelect = ({ label, value, onChange, options, required, placeholder, icon: Icon }) => (
    <div className="space-y-1.5 text-left">
        <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">{label} {required && '*'}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />}
            <select
                required={required}
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                className={`w-full ${Icon ? 'pl-10' : 'px-4'} pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all font-bold text-sm text-black outline-none appearance-none`}
            >
                <option value="">{placeholder || 'Select...'}</option>
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
    </div>
);

const Modal = ({ title, children, onClose, size = 'md' }) => (
    <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-white animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
        {/* Full-Page Header */}
        <div className="px-4 md:px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Building2 size={22} />
                </div>
                <div>
                    <h3 className="text-sm md:text-xl font-bold text-black tracking-tight uppercase">{title}</h3>
                </div>
            </div>
            <button
                onClick={onClose}
                className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100"
            >
                <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">Close Panel</span>
                <X size={20} />
            </button>
        </div>
        <div className="flex-1 p-8 overflow-y-auto scrollbar-hide bg-slate-50/30">
            <div className={`mx-auto w-full ${size === 'lg' ? 'max-w-7xl' : 'max-w-4xl'}`}>
                {children}
            </div>
        </div>
    </div>
);


const ModalFooter = ({ onCancel, saving, label = 'Save Changes' }) => (
    <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 mt-6">
        <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors text-xs uppercase tracking-widest"
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

const SupportRequests = ({ onAction }) => {
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
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Support Tickets</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manage user issues and inquiries</p>
                </div>
                <button onClick={loadData} className="px-4 py-2 bg-slate-50 text-slate-400 hover:text-blue-600 font-bold text-[10px] uppercase tracking-widest rounded-lg transition-colors border border-slate-100">Refresh Feed</button>
            </div>

            {requests.length === 0 ? (
                <EmptyState icon={Info} title="No tickets found" description="All support requests will appear here." />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Details</th>
                                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp / Email</th>
                                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                                <th className="p-4 text-[10px) font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map(req => (
                                <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-4">
                                        <p className="font-bold text-slate-700 text-sm italic">{req.fullName}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{new Date(req.createdAt).toLocaleDateString()}</p>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <Phone size={12} />
                                                <span className="text-xs font-bold">{req.whatsapp}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <Mail size={12} />
                                                <span className="text-xs font-bold">{req.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 max-w-xs">
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 italic">{req.description}</p>
                                    </td>
                                    <td className="p-4">
                                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                                            ${req.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}
                                        `}>
                                            {req.status}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {req.status === 'PENDING' ? (
                                                <button onClick={() => updateStatus(req.id, 'RESOLVED')} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Mark as Resolved"><Check size={16} /></button>
                                            ) : (
                                                <button onClick={() => updateStatus(req.id, 'PENDING')} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg" title="Re-open"><X size={16} /></button>
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
                alert('Message broadcasted successfully!');
            } else {
                alert('Failed: ' + res.message);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setSending(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Send className="text-blue-600" size={20} />
                    Create New Broadcast
                </h3>
                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Message Content</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-blue-500 transition-all min-h-[120px]"
                            placeholder="Type a message for all system users..."
                            required
                        />
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
                        <div className="w-full md:w-48">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Alert Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-blue-500 transition-all"
                            >
                                <option value="general">📢 General</option>
                                <option value="alert">⚠️ Urgent Alert</option>
                                <option value="update">🚀 System Update</option>
                            </select>
                        </div>
                        <button
                            disabled={sending}
                            className="px-8 py-2.5 bg-blue-900 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-lg shadow-blue-900/10 flex items-center gap-2 text-sm uppercase tracking-widest disabled:opacity-50"
                        >
                            <Send size={18} />
                            {sending ? 'Broadcasting...' : 'Broadcast Now'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-6 overflow-hidden">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Recent Broadcasts</h3>
                <div className="space-y-3">
                    {recentMessages.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No recent messages found.</p>
                    ) : recentMessages.map((m) => (
                        <div key={m.id} className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex items-start justify-between group">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${m.type === 'alert' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                                        m.type === 'update' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                                            'bg-blue-50 text-blue-500 border-blue-100'
                                        }`}>
                                        {m.type}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold">{new Date(m.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-slate-800 font-bold">{m.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Company;
