import React, { useState, useEffect } from 'react';
import { Building2, Users, Shield, ClipboardList, Plus, Search, Edit2, Trash2, X, Eye, EyeOff, Check, ChevronDown, Info } from 'lucide-react';

const tabs = [
    { id: 'profile', label: 'Company', icon: Building2, color: 'blue' },
    { id: 'users', label: 'Team', icon: Users, color: 'indigo' },
    { id: 'roles', label: 'Access', icon: Shield, color: 'emerald' },
];

const MODULES = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'sales', label: 'Sales' },
    { key: 'purchase', label: 'Purchase' },
    { key: 'products', label: 'Products' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'customers', label: 'Customers' },
    { key: 'suppliers', label: 'Suppliers' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'reports', label: 'Reports' },
    { key: 'users', label: 'Users' },
    { key: 'settings', label: 'Settings' },
];

const Company = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const savedUser = sessionStorage.getItem('user');
        if (savedUser) setCurrentUser(JSON.parse(savedUser));
    }, []);

    const isSuperAdmin = currentUser?.role?.toLowerCase() === 'super_admin' || currentUser?.role === 'Super Admin';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Organization Settings</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage company identity, team members and access controls.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                {/* Modern Tab Bar */}
                <div className="flex items-center px-4 bg-slate-50/20 border-b border-slate-100 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => {
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
                    {activeTab === 'roles' && <RolesPermissions currentUser={currentUser} />}
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
        name: '', address: '', phone: '', email: '', tax_no: '', currency_symbol: 'PKR'
    });

    useEffect(() => { loadData(); }, [currentUser, isSuperAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                if (isSuperAdmin) {
                    const data = await window.electronAPI.getCompanies();
                    setCompanies(Array.isArray(data) ? data : []);
                    if (data?.success === false) console.error("Companies Error:", data.message);
                } else if (currentUser?.company_id) {
                    const data = await window.electronAPI.getCompany(currentUser.company_id);
                    if (data && data.success !== false) setFormData(data);
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
        setFormData(comp || { name: '', address: '', phone: '', email: '', tax_no: '', currency_symbol: 'PKR' });
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
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Registered Companies</h2>
                        <p className="text-sm text-slate-500">Managing {companies.length} business entities</p>
                    </div>
                    <Button onClick={() => openModal()} icon={Plus}>Register Company</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {companies.map((c) => (
                        <div
                            key={c.id}
                            onClick={() => openDetailModal(c)}
                            className="group relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600 font-bold text-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                    {c.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex gap-1 shadow-sm border border-slate-100 rounded-lg bg-white overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleDeleteCompany(e, c.id)}
                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openModal(c); }}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border-l border-slate-100"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors truncate uppercase tracking-tight">{c.name}</h3>
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center text-xs font-bold text-slate-400 gap-2">
                                        <Building2 size={14} />
                                        <span className="truncate">{c.email || 'No email attached'}</span>
                                    </div>
                                    <div className="flex items-center text-[10px] font-bold text-slate-400 gap-2 uppercase tracking-widest">
                                        <Users size={14} />
                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">Active Tenant</span>
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

                {showModal && (
                    <Modal title={formData.id ? 'Modify Identity' : 'Register New Business'} onClose={() => setShowModal(false)} size="lg">
                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                                        Core Information
                                    </h4>
                                    <FormInput label="Full Legal Name" required value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="e.g. Acme Corporation" icon={Building2} />
                                    <FormInput label="Base Currency" value={formData.currency_symbol} onChange={v => setFormData({ ...formData, currency_symbol: v })} placeholder="PKR" />
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                                        Communications
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 md:col-span-2">
                                            <FormInput label="Official Email" type="email" value={formData.email} onChange={v => setFormData({ ...formData, email: v })} placeholder="office@company.com" icon={Building2} />
                                        </div>
                                    </div>
                                    <FormInput label="Support Helpline" value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} placeholder="+92 300 1234567" />
                                </div>
                                <div className="col-span-full">
                                    <FormInput label="Tax Certificate / NTN" value={formData.tax_no} onChange={v => setFormData({ ...formData, tax_no: v })} placeholder="Optional registration number" icon={Shield} />
                                </div>
                                <div className="col-span-full">
                                    <FormTextarea label="Headquarters Address" value={formData.address} onChange={v => setFormData({ ...formData, address: v })} placeholder="Provide physical address..." />
                                </div>
                            </div>
                            <ModalFooter onCancel={() => setShowModal(false)} saving={saving} label={formData.id ? 'Save Configuration' : 'Onboard Organization'} />
                        </form>
                    </Modal>
                )}

                {showDetailModal && selectedCompany && (
                    <Modal title="Tenant Overview" onClose={() => setShowDetailModal(false)} size="lg">
                        <div className="space-y-8">
                            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                <div className="flex items-start gap-6">
                                    <div className="w-20 h-20 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                                        {selectedCompany.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-slate-800 mb-2 uppercase tracking-tight">{selectedCompany.name}</h2>
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            <div>
                                                <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">Email Endpoint</span>
                                                <p className="text-slate-700 font-bold">{selectedCompany.email || '—'}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 font-bold uppercase tracking-widest block mb-1">Direct Contact</span>
                                                <p className="text-slate-700 font-bold">{selectedCompany.phone || '—'}</p>
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
                                                    <div className="w-9 h-9 rounded-full bg-slate-50 text-slate-400 font-bold text-sm flex items-center justify-center border border-slate-100 uppercase">
                                                        {user.fullname?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors uppercase tracking-tight">{user.fullname}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">@{user.username}</p>
                                                    </div>
                                                </div>
                                                <StatusBadge active={user.is_active} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
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
                            <FormInput label="Organization Identity" required value={formData.name} onChange={v => setFormData({ ...formData, name: v })} icon={Building2} />
                            <FormInput label="Tax Certificate (NTN)" value={formData.tax_no} onChange={v => setFormData({ ...formData, tax_no: v })} icon={Shield} />
                            <FormInput label="Accounting Currency" value={formData.currency_symbol} onChange={v => setFormData({ ...formData, currency_symbol: v })} />
                            <FormInput label="Primary Communication Email" type="email" value={formData.email} onChange={v => setFormData({ ...formData, email: v })} icon={Building2} />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                    <Button type="submit" disabled={saving}>
                        {saving ? 'Synchronizing...' : 'Update Corporate Profile'}
                    </Button>
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
                const companyId = isSuperAdmin ? null : currentUser?.company_id;
                const [usersData, rolesData] = await Promise.all([
                    window.electronAPI.getUsers(companyId),
                    window.electronAPI.getRoles(companyId)
                ]);
                setUsers(usersData || []);
                setRoles(rolesData || []);
                if (isSuperAdmin) {
                    setCompanies(await window.electronAPI.getCompanies() || []);
                }
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
            const data = { ...formData, company_id: isSuperAdmin ? formData.company_id : currentUser?.company_id };
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
        setFormData(user ? { ...user, password: '' } : {
            company_id: currentUser?.company_id || '', username: '', password: '', role: 'admin', fullname: '', is_active: 1
        });
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
        admins: users.filter(u => u.role?.toLowerCase().includes('admin')).length,
        staff: users.filter(u => !u.role?.toLowerCase().includes('admin')).length
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Team Census" value={stats.total} icon={Users} color="blue" />
                <StatCard title="Active Sessions" value={stats.active} icon={Check} color="emerald" />
                <StatCard title="Privileged Admins" value={stats.admins} icon={Shield} color="purple" />
                <StatCard title="Total Personnel" value={stats.staff} icon={Users} color="gray" />
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
                <Button onClick={() => openModal()} icon={Plus}>Onboard New Member</Button>
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
                                            <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 font-bold text-xs flex items-center justify-center border border-slate-100 uppercase group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                {user.fullname?.charAt(0)}
                                            </div>
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
                                            <button onClick={() => openModal(user)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(user.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
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
                            <FormSelect label="Assign to Tenant" required value={formData.company_id} onChange={v => setFormData({ ...formData, company_id: v })} options={companies.map(c => ({ value: c.id, label: c.name }))} placeholder="Select target organization" icon={Building2} />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="Personnel Legal Name" required value={formData.fullname} onChange={v => setFormData({ ...formData, fullname: v })} placeholder="John Doe" icon={Users} />
                            <FormInput label="System Username" required value={formData.username} onChange={v => setFormData({ ...formData, username: v })} placeholder="j_doe" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <FormInput
                                    label={formData.id ? "Security Key (Optional Reset)" : "Initial Access Key"}
                                    type={showPassword ? 'text' : 'password'}
                                    required={!formData.id}
                                    value={formData.password}
                                    onChange={v => setFormData({ ...formData, password: v })}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-8.5 text-slate-400 hover:text-blue-600 transition-colors">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <FormSelect label="Assigned Privileges" required value={formData.role} onChange={v => setFormData({ ...formData, role: v })} options={roles.filter(r => !['super admin', 'super_admin'].includes(r.name.toLowerCase())).map(r => ({ value: r.name.toLowerCase().replace(' ', '_'), label: r.name }))} icon={Shield} />
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
const RolesPermissions = ({ currentUser }) => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '', permissions: [] });

    useEffect(() => { loadRoles(); }, [currentUser]);

    const loadRoles = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.getRoles(currentUser?.company_id);
                const rolesWithPerms = await Promise.all((data || []).map(async (role) => ({
                    ...role,
                    permissions: await window.electronAPI.getPermissions(role.id) || []
                })));
                setRoles(rolesWithPerms);
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
            const data = { ...formData, company_id: currentUser?.company_id };
            formData.id ? await window.electronAPI.updateRole(data) : await window.electronAPI.createRole(data);
            setShowModal(false);
            loadRoles();
        } catch (err) {
            window.alert('Error: ' + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this role definition?')) return;
        await window.electronAPI.deleteRole(id);
        loadRoles();
    };

    const openModal = (role = null) => {
        setFormData(role ? { ...role, permissions: role.permissions || [] } : {
            name: '', description: '',
            permissions: MODULES.map(m => ({ module: m.key, can_view: 1, can_create: 0, can_edit: 0, can_delete: 0 }))
        });
        setShowModal(true);
    };

    const updatePerm = (mod, field, val) => setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.map(p => p.module === mod ? { ...p, [field]: val ? 1 : 0 } : p)
    }));

    const getPerm = (mod, field) => formData.permissions.find(p => p.module === mod)?.[field] === 1;

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Access Control Roles</h2>
                    <p className="text-sm text-slate-500">Define custom permission sets for your team members</p>
                </div>
                <Button onClick={() => openModal()} icon={Plus}>Create New Role</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.filter(r => !['super admin', 'super_admin'].includes(r.name.toLowerCase())).map((role) => (
                    <div key={role.id} className="group relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2.5 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Shield size={24} />
                            </div>
                            {!role.is_system && (
                                <div className="flex gap-1 shadow-sm border border-slate-100 rounded-lg bg-white overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(role)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(role.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border-l border-slate-100"><Trash2 size={16} /></button>
                                </div>
                            )}
                        </div>
                        <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors uppercase tracking-tight">{role.name}</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 line-clamp-2 min-h-[2.5rem] leading-relaxed">{role.description || 'No description provided'}</p>
                        <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-tight ${role.is_system ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                {role.is_system ? 'System Core' : 'Custom Config'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                                <Check size={14} className="text-emerald-500" />
                                {role.permissions?.filter(p => p.can_view).length || 0} Modules
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <Modal title={formData.id ? 'Modify Access matrix' : 'Define New Permission Tier'} onClose={() => setShowModal(false)} size="lg">
                    <form onSubmit={handleSave} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormInput label="Administrative Title" required value={formData.name} onChange={v => setFormData({ ...formData, name: v })} placeholder="e.g. Sales Manager" />
                            <FormInput label="Functional Description" value={formData.description} onChange={v => setFormData({ ...formData, description: v })} placeholder="What can this role do?" />
                        </div>

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

// ============ SHARED COMPONENTS ============
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

const Button = ({ children, onClick, icon: Icon, type = 'button', disabled, className = '' }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100 active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50 ${className}`}
    >
        {Icon && <Icon size={16} />}
        <span>{children}</span>
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

const FormInput = ({ label, type = 'text', value, onChange, required, placeholder, icon: Icon }) => (
    <div className="space-y-1.5 text-left">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />}
            <input
                type={type}
                required={required}
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full ${Icon ? 'pl-10' : 'px-4'} pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm text-slate-800`}
            />
        </div>
    </div>
);

const FormTextarea = ({ label, value, onChange, rows = 3, placeholder, icon: Icon }) => (
    <div className="space-y-1.5 text-left">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3.5 top-3 text-slate-400" size={16} />}
            <textarea
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                rows={rows}
                placeholder={placeholder}
                className={`w-full ${Icon ? 'pl-10' : 'px-4'} pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm text-slate-800 resize-none`}
            />
        </div>
    </div>
);

const FormSelect = ({ label, value, onChange, options, required, placeholder, icon: Icon }) => (
    <div className="space-y-1.5 text-left">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />}
            <select
                required={required}
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                className={`w-full ${Icon ? 'pl-10' : 'px-4'} pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all font-bold text-sm text-slate-800 outline-none appearance-none`}
            >
                <option value="">{placeholder || 'Select...'}</option>
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
    </div>
);

const Modal = ({ title, children, onClose, size = 'md' }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-200">
        <div className={`bg-white rounded-xl shadow-2xl w-full ${size === 'lg' ? 'max-w-4xl' : 'max-w-xl'} overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200`}>
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{title}</h3>
                <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <div className="p-8 max-h-[85vh] overflow-y-auto scrollbar-hide">{children}</div>
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
        <Button type="submit" disabled={saving} label={label} />
    </div>
);

export default Company;
