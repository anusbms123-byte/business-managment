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
        password: currentUser?.raw_password || currentUser?.password || '********'
    });
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const { showSuccess, showError } = useDialog();

    // Sync profile data when currentUser prop changes
    useEffect(() => {
        if (currentUser) {
            setProfileData(prev => ({
                ...prev,
                fullname: currentUser.fullName || currentUser.fullname || '',
                username: currentUser.username || '',
                password: currentUser.raw_password || currentUser.password || '********'
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
            // Only send password if it's actually typed
            const payload = {
                id: currentUser.id,
                fullname: profileData.fullname,
                username: profileData.username,
                role: currentUser.role // Preserve role
            };

            if (profileData.password && profileData.password.trim() !== '' && profileData.password !== '********') {
                payload.password = profileData.password;
            }

            const result = await window.electronAPI.updateUser(payload);
            if (result.success) {
                showSuccess('Your profile has been updated successfully!');

                // Update local storage so changes persist on refresh
                const updatedUser = {
                    ...currentUser,
                    fullname: profileData.fullname,
                    fullName: profileData.fullname,
                    username: profileData.username,
                };

                // If a new password was provided in the payload, update both password fields
                if (payload.password) {
                    updatedUser.password = payload.password;
                    updatedUser.raw_password = payload.password;
                }

                sessionStorage.setItem('user', JSON.stringify(updatedUser));

                // Clear password field after save? (USER: "blink nahi chahiye" - so we keep it)
                // setProfileData(prev => ({ ...prev, password: '' }));

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

    if (loading) return <div className="p-8 text-center text-slate-400 font-semibold animate-pulse">Loading...</div>;

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
                        <h2 className="text-sm font-semibold text-black dark:text-slate-200">Account Details</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-semibold text-black dark:text-slate-500 mb-2 tracking-tight">Full Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all placeholder:text-slate-400"
                                value={profileData.fullname}
                                onChange={(e) => setProfileData({ ...profileData, fullname: e.target.value })}
                                placeholder="Full Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-black dark:text-slate-500 mb-2 tracking-tight">Username</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all placeholder:text-slate-400"
                                value={profileData.username}
                                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                                placeholder="Username"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-black dark:text-slate-500 mb-2 tracking-tight">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all placeholder:text-slate-400 pr-10"
                                    value={profileData.password}
                                    onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                                    placeholder="Enter new password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88L4.62 4.62" /><path d="M1 1l22 22" /><path d="M9.09 9.09a3 3 0 0 1 4.82 4.82" /><path d="M22 12s-4-4-10-4a11.35 11.35 0 0 0-4.76 1.06" /><path d="M6.38 6.38a11.36 11.36 0 0 0-4.38 5.62c0 0 4 4 10 4a11.3 11.3 0 0 0 5.13-1.21" /><path d="M15.39 15.39a11.39 11.39 0 0 0 5.23-3.39" /><path d="M4.62 19.38A11.36 11.36 0 0 1 1 12" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                    )}
                                </button>
                            </div>
                            <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase">Keep blank if you don't want to change it.</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center md:justify-end">
                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="bg-emerald-600 dark:bg-emerald-600 text-white px-10 py-3 rounded-lg font-semibold text-sm hover:bg-emerald-700 dark:hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 tracking-tight"
                        >
                            {saving ? 'Saving...' : 'Save now'}
                        </button>
                    </div>
                </div>

                {/* Sync & System Section (NEW) */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-rose-600 dark:bg-rose-400 rounded-full"></div>
                        <h2 className="text-sm font-semibold text-black dark:text-slate-200">Sync & System</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <p className="text-sm font-semibold text-black dark:text-slate-100 mb-2">Cloud Synchronization</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                If you are missing data or see inconsistencies, you can force a full re-sync from the cloud.
                                This will clear local data and pull everything fresh.
                            </p>
                            <button
                                onClick={async () => {
                                    if (window.confirm("Are you sure? This will reload all data from the cloud.")) {
                                        setSaving(true);
                                        const res = await window.electronAPI.resetSync(null);
                                        setSaving(false);
                                        if (res?.success) showSuccess("Sync reset successfully!");
                                        else showError("Sync failed: " + (res?.message || "Unknown error"));
                                    }
                                }}
                                className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 transition-all"
                            >
                                Reset & Re-sync All Data
                            </button>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-black dark:text-slate-100 mb-2">System Logs</p>
                            <div className="bg-slate-950 rounded-lg p-4 font-mono text-[10px] text-emerald-400 h-32 overflow-y-auto mb-2 custom-scrollbar">
                                <SyncLogsDisplay />
                            </div>
                        </div>
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
                        <h2 className="text-sm font-semibold text-black dark:text-slate-200">Business Info</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-black dark:text-slate-500 mb-1.5 tracking-tight">Business Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all placeholder:text-slate-400"
                                placeholder="ex. ABC Shop"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-black dark:text-slate-500 mb-1.5 tracking-tight">Phone Number</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all placeholder:text-slate-400"
                                placeholder="03XXXXXXXXX"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-semibold text-black dark:text-slate-500 mb-1.5 tracking-tight">Email Address</label>
                            <input
                                type="email"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all placeholder:text-slate-400"
                                placeholder="ex. shop@email.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-semibold text-black dark:text-slate-500 mb-1.5 tracking-tight">Tax Number</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all placeholder:text-slate-400"
                                placeholder="ex. 1234567-8"
                                value={formData.tax_no}
                                onChange={(e) => setFormData({ ...formData, tax_no: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-black dark:text-slate-500 mb-1.5 tracking-tight">Address</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all"
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
                        <h2 className="text-sm font-semibold text-black dark:text-slate-200">Currency Settings</h2>
                    </div>
                    <div className="w-full md:w-80">
                        <label className="block text-sm font-semibold text-black dark:text-slate-500 mb-1.5 tracking-tight">Select Currency</label>
                        <select
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all"
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
                        <h2 className="text-sm font-semibold text-black dark:text-slate-200">Printer Settings</h2>
                    </div>
                    <div className="w-full md:w-80">
                        <label className="block text-sm font-semibold text-black dark:text-slate-500 mb-1.5 tracking-tight">Default Thermal/POS Printer</label>
                        <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all">
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
                            className="flex items-center justify-center space-x-2 px-8 py-3 bg-emerald-600 dark:bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-700 transition-all shadow-sm active:scale-95 text-sm tracking-tight"
                        >
                            {saving ? 'Saving...' : 'Save now'}
                        </button>
                    )}
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                {/* Sync & System Section for regular users */}
                <div className="space-y-8 pt-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-rose-600 dark:bg-rose-400 rounded-full"></div>
                        <h2 className="text-sm font-semibold text-black dark:text-slate-200">Sync & System</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <p className="text-sm font-semibold text-black dark:text-slate-100 mb-2">Cloud Synchronization</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                If you are missing data or see inconsistencies, you can force a full re-sync from the cloud.
                                This will clear local data and pull everything fresh.
                            </p>
                            <button
                                onClick={async () => {
                                    if (window.confirm("Are you sure? This will reload all data from the cloud.")) {
                                        setSaving(true);
                                        const res = await window.electronAPI.resetSync(currentUser.company_id);
                                        setSaving(false);
                                        if (res?.success) showSuccess("Sync reset successfully!");
                                        else showError("Sync failed: " + (res?.message || "Unknown error"));
                                    }
                                }}
                                className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 transition-all"
                            >
                                Reset & Re-sync My Data
                            </button>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-black dark:text-slate-100 mb-2">System Logs</p>
                            <div className="bg-slate-950 rounded-lg p-4 font-mono text-[10px] text-emerald-400 h-48 overflow-y-auto mb-2 custom-scrollbar">
                                <SyncLogsDisplay />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SyncLogsDisplay = () => {
    const [logs, setLogs] = useState("Waiting for logs...");

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                if (window.electronAPI && window.electronAPI.getSyncLogs) {
                    const res = await window.electronAPI.getSyncLogs();
                    if (res.success) setLogs(res.logs);
                } else {
                    setLogs("Logging API not available.");
                }
            } catch (e) { console.error("Error fetching logs:", e); }
        };
        fetchLogs();
        const timer = setInterval(fetchLogs, 5000);
        return () => clearInterval(timer);
    }, []);

    return <pre className="whitespace-pre-wrap">{logs}</pre>;
};

export default Settings;
