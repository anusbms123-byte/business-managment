import React, { useState, useEffect } from 'react';
import { canEdit } from '../utils/permissions';
import { useDialog } from '../context/DialogContext';


const Settings = ({ currentUser, onUpdateUser }) => {
    const isSuperAdmin = currentUser?.role?.toLowerCase() === 'super admin' ||
        currentUser?.role?.toLowerCase() === 'superadmin' ||
        currentUser?.role?.toLowerCase() === 'super_admin' ||
        currentUser?.company_id === null;

    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '', tax_no: '', currency_symbol: 'PKR'
    });

    const [profileData, setProfileData] = useState({
        fullname: currentUser?.fullName || currentUser?.fullname || '',
        username: currentUser?.username || '',
        password: isSuperAdmin ? 'admin123' : ''
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const { showSuccess, showError } = useDialog();

    // Sync profile data when currentUser prop changes
    useEffect(() => {
        if (currentUser) {
            setProfileData(prev => ({
                ...prev,
                fullname: currentUser.fullName || currentUser.fullname || '',
                username: currentUser.username || ''
            }));
        }
    }, [currentUser]);

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
        if (!currentUser?.id) {
            showError('User ID not found. Please log in again.');
            return;
        }

        setSaving(true);
        try {
            const result = await window.electronAPI.updateUser({
                id: currentUser.id,
                ...profileData,
                role: currentUser.role // Preserve role
            });
            if (result.success) {
                showSuccess('Your profile has been updated successfully!');

                // Update local storage so changes persist on refresh
                const updatedUser = {
                    ...currentUser,
                    fullname: profileData.fullname,
                    fullName: profileData.fullname,
                    username: profileData.username
                };
                sessionStorage.setItem('user', JSON.stringify(updatedUser));

                if (onUpdateUser) {
                    onUpdateUser(updatedUser, sessionStorage.getItem('permissions') ? JSON.parse(sessionStorage.getItem('permissions')) : []);
                }
            } else {
                showError('Error: ' + result.message);
            }
        } catch (err) {
            showError('Error updating profile: ' + err.message);
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Loading...</div>;

    if (isSuperAdmin) {
        return (
            <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div>
                    <h1 className="text-2xl font-bold text-black dark:text-slate-100 tracking-tight text-center md:text-left">Profile Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center md:text-left">Manage your account details and password.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-emerald-600 dark:bg-emerald-400 rounded-full"></div>
                        <h2 className="text-sm font-bold text-black dark:text-slate-200">Account Details</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[10px] font-bold text-black dark:text-slate-500 mb-2">Full Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all font-bold placeholder:text-slate-400 placeholder:font-bold"
                                value={profileData.fullname}
                                onChange={(e) => setProfileData({ ...profileData, fullname: e.target.value })}
                                placeholder="Full Name"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-black dark:text-slate-500 mb-2">Username</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all font-bold placeholder:text-slate-400 placeholder:font-bold"
                                value={profileData.username}
                                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                                placeholder="Username"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-black dark:text-slate-500 mb-2">Password</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all font-bold placeholder:text-slate-400 placeholder:font-bold"
                                value={profileData.password}
                                onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                                placeholder="Enter password"
                            />
                            <p className="mt-2 text-[9px] text-slate-400 dark:text-slate-500 font-bold">Keep blank if you don't want to change it.</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center md:justify-end">
                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="bg-emerald-600 dark:bg-emerald-600 text-white px-10 py-3 rounded-lg font-bold text-[10px] hover:bg-emerald-700 dark:hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save now'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-2xl font-bold text-black dark:text-slate-100 tracking-tight">Business Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your business details and preferences.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-10">
                {/* Company Info */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-emerald-600 dark:bg-emerald-400 rounded-full"></div>
                        <h2 className="text-sm font-bold text-black dark:text-slate-200">Business Info</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-black dark:text-slate-500 mb-1.5">Business Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all font-bold placeholder:text-slate-400 placeholder:font-bold"
                                placeholder="ex. ABC Shop"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-black dark:text-slate-500 mb-1.5">Phone Number</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all font-bold placeholder:text-slate-400 placeholder:font-bold"
                                placeholder="03XXXXXXXXX"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-black dark:text-slate-500 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all font-bold placeholder:text-slate-400 placeholder:font-bold"
                                placeholder="ex. shop@email.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-bold text-black dark:text-slate-500 mb-1.5">Tax Number</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all font-bold placeholder:text-slate-400 placeholder:font-bold"
                                placeholder="ex. 1234567-8"
                                value={formData.tax_no}
                                onChange={(e) => setFormData({ ...formData, tax_no: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-black dark:text-slate-500 mb-1.5">Address</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all"
                                placeholder="Business location"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* Currency */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-emerald-600 dark:bg-emerald-400 rounded-full"></div>
                        <h2 className="text-sm font-bold text-black dark:text-slate-200">Currency Settings</h2>
                    </div>
                    <div className="w-full md:w-80">
                        <label className="block text-[10px] font-bold text-black dark:text-slate-500 mb-1.5">Select Currency</label>
                        <select
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all"
                            value={formData.currency_symbol}
                            onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                        >
                            <option value="PKR" className="dark:bg-slate-900">PKR - Pakistani Rupee</option>
                            <option value="USD" className="dark:bg-slate-900">USD - US Dollar</option>
                            <option value="EUR" className="dark:bg-slate-900">EUR - Euro</option>
                            <option value="GBP" className="dark:bg-slate-900">GBP - British Pound</option>
                            <option value="SAR" className="dark:bg-slate-900">SAR - Saudi Riyal</option>
                        </select>
                    </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* Printer */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-emerald-600 dark:bg-emerald-400 rounded-full"></div>
                        <h2 className="text-sm font-bold text-black dark:text-slate-200">Printer Settings</h2>
                    </div>
                    <div className="w-full md:w-80">
                        <label className="block text-[10px] font-bold text-black dark:text-slate-500 mb-1.5">Default Thermal/POS Printer</label>
                        <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all">
                            <option className="dark:bg-slate-900">System Default Printer</option>
                            <option className="dark:bg-slate-900">Microsoft Print to PDF</option>
                            <option className="dark:bg-slate-900">Zonal Thermal-58</option>
                        </select>
                    </div>
                </div>

                <div className="pt-4">
                    {canEdit('settings') && (
                        <button
                            onClick={handleSaveCompany}
                            className="flex items-center justify-center space-x-2 px-8 py-3 bg-emerald-600 dark:bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 dark:hover:bg-emerald-700 transition-all shadow-sm active:scale-95 text-[10px]"
                        >
                            {saving ? 'Saving...' : 'Save now'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
