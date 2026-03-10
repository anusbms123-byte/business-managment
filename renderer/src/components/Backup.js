import React, { useState, useEffect } from 'react';
import { HardDrive, Clock, RotateCcw, Download, Upload, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

const tabs = [
    { id: 'local', label: 'Backup', icon: HardDrive },
    { id: 'restore', label: 'Restore', icon: RotateCcw },
];

const Backup = () => {
    const [activeTab, setActiveTab] = useState('local');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const user = sessionStorage.getItem('user');
        if (user) setCurrentUser(JSON.parse(user));
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Backup & Restore</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">download a backup for your safety.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px] flex flex-col transition-all text-left">
                {/* Modern Tab Bar */}
                <div className="flex items-center px-4 bg-slate-50/20 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center space-x-3 px-6 py-4 text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap group ${activeTab === tab.id
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <tab.icon size={16} />
                            <span>{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-8 flex-1 bg-white dark:bg-slate-900">
                    {activeTab === 'local' && <LocalBackup currentUser={currentUser} />}
                    {activeTab === 'restore' && <RestoreBackup currentUser={currentUser} />}
                </div>
            </div>
        </div>
    );
};

const LocalBackup = ({ currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    const { showAlert } = useDialog();

    const handleBackup = async () => {
        if (!currentUser?.company_id) return showAlert("Company identification missing.");
        setLoading(true);
        setStatus(null);
        try {
            const result = await window.electronAPI.createBackup(currentUser.company_id);
            if (result.success) {
                setStatus({ type: 'success', message: result.message });
            } else {
                setStatus({ type: 'error', message: result.message });
            }
        } catch (err) {
            setStatus({ type: 'error', message: err.message });
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
                <HardDrive size={16} />
                download a backup for your safety.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center group hover:bg-white dark:hover:bg-slate-800 transition-all">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        {loading ? <Loader2 size={32} className="animate-spin" /> : <Download size={32} />}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2">Backup Data</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 px-4 text-center">Save all your data (Products, Sales, etc.) as a file on your computer.</p>
                    <button
                        onClick={handleBackup}
                        disabled={loading}
                        className="w-full py-3 bg-blue-950 dark:bg-blue-600 text-white rounded-lg font-bold hover:bg-slate-900 dark:hover:bg-blue-700 transition-all shadow-sm shadow-blue-100 dark:shadow-none active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : 'Backup'}
                    </button>
                    {status && (
                        <div className={`mt-4 p-3 rounded-lg text-[10px] font-bold uppercase tracking-widest w-full ${status.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800'}`}>
                            {status.message}
                        </div>
                    )}
                </div>

                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-left">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-6">Help & Instructions</h3>
                    <div className="space-y-6">
                        <div>
                            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">01. When should I backup?</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                                We recommend downloading a backup at the end of every business day to keep your local records updated.
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">02. Where is my file saved?</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                                When you click "Backup", you can choose any folder on your computer (like Desktop or Documents) to save the file.
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">03. How to use restore?</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                                If you need to recover data, go to the "Restore" tab and upload the latest backup file (.json) you saved earlier.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RestoreBackup = ({ currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    const { showAlert, showConfirm } = useDialog();

    const handleRestore = async () => {
        if (!currentUser?.company_id) return showAlert("Company identification missing.");
        setLoading(true);
        setStatus(null);
        try {
            const result = await window.electronAPI.restoreBackup(currentUser.company_id);
            if (result.success) {
                setStatus({ type: 'success', message: result.message });
            } else {
                setStatus({ type: 'error', message: result.message });
            }
        } catch (err) {
            setStatus({ type: 'error', message: err.message });
        }
        setLoading(false);
    };

    const handleResetSync = async () => {
        if (!currentUser?.company_id) return showAlert("Company identification missing.");

        showConfirm("Are you sure you want to reset local data? This will clear all data and re-download it from the cloud.", async () => {
            setLoading(true);
            setStatus(null);
            try {
                const result = await window.electronAPI.resetSync(currentUser.company_id);
                if (result.success) {
                    setStatus({ type: 'success', message: "System re-synchronized successfully. Please restart the app for best results." });
                    showAlert("System re-synchronized! Please restart the app if you see any display issues.");
                } else {
                    setStatus({ type: 'error', message: result.message });
                }
            } catch (err) {
                setStatus({ type: 'error', message: err.message });
            }
            setLoading(false);
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="p-6 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800/50 flex items-start gap-4 text-left">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <p className="text-xs font-black text-rose-800 dark:text-rose-200 uppercase tracking-tight">Restore Data (BE CAREFUL)</p>
                    <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mt-1 leading-relaxed">
                        Think before you restore! This file will upload to the cloud and all other users in your company will see this data right away.
                    </p>
                    <p className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest mt-2 leading-relaxed">
                        Note: Only use your latest and correct backup file to avoid adding old or wrong data to the system.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center group hover:bg-white dark:hover:bg-slate-800 transition-all">
                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-amber-100 dark:border-amber-800 shadow-sm shadow-amber-50 dark:shadow-none">
                        {loading ? <Loader2 size={40} className="animate-spin" /> : <Upload size={40} />}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2 uppercase">Restore&nbsp;&nbsp;from&nbsp;&nbsp;File</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8">Select a backup file (.json) to restore your data to the system.</p>
                    <button
                        onClick={handleRestore}
                        disabled={loading}
                        className="px-10 py-3.5 bg-slate-800 dark:bg-slate-700 text-white rounded-lg font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-all shadow-md active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-50"
                    >
                        {loading ? 'Restoring...' : 'Upload & Restore'}
                    </button>
                </div>

                <div className="p-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center group hover:bg-white dark:hover:bg-slate-800 transition-all">
                    <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-rose-100 dark:border-rose-800 shadow-sm shadow-rose-50 dark:shadow-none">
                        {loading ? <Loader2 size={40} className="animate-spin" /> : <RotateCcw size={40} />}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2 uppercase">Repair & Sync</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8">Clear local cache and refresh data from the cloud to fix duplicates or sync errors.</p>
                    <button
                        onClick={handleResetSync}
                        disabled={loading}
                        className="px-10 py-3.5 bg-rose-600 dark:bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 dark:hover:bg-rose-700 transition-all shadow-md active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-50"
                    >
                        {loading ? 'Resetting...' : 'Reset & Re-sync Now'}
                    </button>
                </div>
            </div>

            {status && (
                <div className={`p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest w-full flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800'}`}>
                    {status.type === 'success' && <CheckCircle2 size={18} />}
                    {status.message}
                </div>
            )}
        </div>
    );
};

export default Backup;
