import React, { useState, useEffect } from 'react';
import { canEdit } from '../utils/permissions';
import { useDialog } from '../context/DialogContext';


const Settings = ({ currentUser }) => {
    const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'SuperAdmin' || currentUser?.company_id === null;

    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '', tax_no: '', currency_symbol: 'PKR'
    });

    const [profileData, setProfileData] = useState({
        fullname: currentUser?.fullName || currentUser?.fullname || '',
        username: currentUser?.username || '',
        password: ''
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const { showSuccess, showError } = useDialog();

    useEffect(() => {
        if (!isSuperAdmin && currentUser?.company_id) {
            loadCompany();
        }
    }, [currentUser, isSuperAdmin]);

    const loadCompany = async () => {
        setLoading(true);
        try {
            const company = await window.electronAPI.getCompany(currentUser.company_id);
            if (company && company.success !== false) {
                setFormData({
                    name: company.name || '',
                    phone: company.phone || '',
                    email: company.email || '',
                    address: company.address || '',
                    tax_no: company.taxNumber || '',
                    currency_symbol: company.currency || 'PKR'
                });
            }
        } catch (err) {
            console.error('Error loading company:', err);
        }
        setLoading(false);
    };

    const handleSaveCompany = async () => {
        setSaving(true);
        try {
            const result = await window.electronAPI.updateCompany({
                id: currentUser.company_id,
                ...formData
            });
            if (result.success) {
                showSuccess('Business settings updated successfully!');
            } else {
                showError('Error: ' + result.message);
            }
        } catch (err) {
            showError('Error saving settings: ' + err.message);
        }
        setSaving(false);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const result = await window.electronAPI.updateUser({
                id: currentUser.id,
                ...profileData,
                role: currentUser.role // Preserve role
            });
            if (result.success) {
                showSuccess('Your profile has been updated successfully!');
            } else {
                showError('Error: ' + result.message);
            }
        } catch (err) {
            showError('Error updating profile: ' + err.message);
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Initializing Environment...</div>;

    if (isSuperAdmin) {
        return (
            <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight text-center md:text-left">Personal Profile Settings</h1>
                    <p className="text-slate-500 text-sm mt-1 text-center md:text-left">Manage your administrative credentials and personal identification.</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Access Credentials</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Display Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all font-sans"
                                value={profileData.fullname}
                                onChange={(e) => setProfileData({ ...profileData, fullname: e.target.value })}
                                placeholder="Full Name"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">System Username</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all font-sans"
                                value={profileData.username}
                                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                                placeholder="Username"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Security Key (Password)</label>
                            <input
                                type="password"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all font-sans"
                                value={profileData.password}
                                onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                                placeholder="Leave blank to keep current password"
                            />
                            <p className="mt-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest">Update your password to ensure system security.</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-center md:justify-end">
                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="bg-blue-600 text-white px-10 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50"
                        >
                            {saving ? 'Synchronizing...' : 'Update Individual Profile'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Organization Configuration</h1>
                <p className="text-slate-500 text-sm mt-1">Configure your organization's core identities and transaction preferences.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-10">
                {/* Company Info */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-blue-950 rounded-full"></div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Business Identity</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Official Business Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
                                placeholder="Your Company Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Primary Contact Phone</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
                                placeholder="+92 300 1234567"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Business Email</label>
                            <input
                                type="email"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
                                placeholder="office@company.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tax / NTN Number</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
                                placeholder="Tax registration"
                                value={formData.tax_no}
                                onChange={(e) => setFormData({ ...formData, tax_no: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Registered Office Address</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
                                placeholder="Full physical or digital address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Currency */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-blue-950 rounded-full"></div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Localizations & Currency</h2>
                    </div>
                    <div className="w-full md:w-80">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Base Transaction Currency</label>
                        <select
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
                            value={formData.currency_symbol}
                            onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                        >
                            <option value="PKR">PKR - Pakistani Rupee</option>
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="SAR">SAR - Saudi Riyal</option>
                        </select>
                    </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Printer */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-blue-950 rounded-full"></div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Hardware Integrations</h2>
                    </div>
                    <div className="w-full md:w-80">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Default Thermal/POS Printer</label>
                        <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all">
                            <option>System Default Printer</option>
                            <option>Microsoft Print to PDF</option>
                            <option>Zonal Thermal-58</option>
                        </select>
                    </div>
                </div>

                <div className="pt-4">
                    {canEdit('settings') && (
                        <button
                            onClick={handleSaveCompany}
                            className="flex items-center justify-center space-x-2 px-8 py-3 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            {saving ? 'Processing...' : 'Commit Global Changes'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
