import React, { useState, useEffect } from 'react';
import { HardDrive, Clock, RotateCcw, Download, Upload, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useDialog } from '../context/DialogContext';

const tabs = [
    { id: 'local', label: 'Local Backup', icon: HardDrive },
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
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">System Redundancy</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage database snapshots and automated recovery protocols.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col transition-all text-left">
                {/* Modern Tab Bar */}
                <div className="flex items-center px-4 bg-slate-50/20 border-b border-slate-100 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center space-x-3 px-6 py-4 text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap group ${activeTab === tab.id
                                ? 'text-blue-600'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <tab.icon size={16} />
                            <span>{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-8 flex-1 bg-white">
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
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
                <HardDrive size={16} />
                Execute manual database serialization for secure local storage.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center flex flex-col items-center group hover:bg-white transition-all">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        {loading ? <Loader2 size={32} className="animate-spin" /> : <Download size={32} />}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-2">Create New Snapshot</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 px-4 text-center">Export all company data (Products, Sales, Employees) into a secure JSON file.</p>
                    <button
                        onClick={handleBackup}
                        disabled={loading}
                        className="w-full py-3 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-50"
                    >
                        {loading ? 'Processing Data...' : 'Initialize Backup'}
                    </button>
                    {status && (
                        <div className={`mt-4 p-3 rounded-lg text-[10px] font-bold uppercase tracking-widest w-full ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {status.message}
                        </div>
                    )}
                </div>

                <div className="p-8 bg-slate-50 rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-4">Cloud Synchronization</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-100">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Global Server Online</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
                            Your main database is securely hosted in the cloud. Local backups provide a manual point-in-time snapshot for your personal records or offline migration.
                        </p>
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

        showConfirm("Kya aap waqai local data reset karna chahte hain? Is se duplicates khatam ho jayenge aur sara data cloud se dobara download hoga.", async () => {
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
            <div className="p-6 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-4 text-left">
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <p className="text-xs font-black text-rose-800 uppercase tracking-tight">Destructive Restoration Protocol</p>
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mt-1 leading-relaxed">
                        Proceeding with restoration will overwrite/add operational dataset fragments to the cloud. Ensure you have a valid backup file from the current system version.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-12 bg-slate-50 rounded-xl border border-slate-200 text-center flex flex-col items-center group hover:bg-white transition-all">
                    <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-amber-100 shadow-sm shadow-amber-50">
                        {loading ? <Loader2 size={40} className="animate-spin" /> : <Upload size={40} />}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-2 uppercase">Initialize Data Recovery</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Select target snapshot binary (.json) for induction into the cloud ecosystem.</p>
                    <button
                        onClick={handleRestore}
                        disabled={loading}
                        className="px-10 py-3.5 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-md active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-50"
                    >
                        {loading ? 'Restoring Cloud Records...' : 'Upload Recovery File'}
                    </button>
                </div>

                <div className="p-12 bg-slate-50 rounded-xl border border-slate-200 text-center flex flex-col items-center group hover:bg-white transition-all">
                    <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-rose-100 shadow-sm shadow-rose-50">
                        {loading ? <Loader2 size={40} className="animate-spin" /> : <RotateCcw size={40} />}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-2 uppercase">Fix Duplicates & Sync</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Clear local cache and re-download fresh data from cloud to fix duplicates or sync errors.</p>
                    <button
                        onClick={handleResetSync}
                        disabled={loading}
                        className="px-10 py-3.5 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-all shadow-md active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-50"
                    >
                        {loading ? 'Resetting...' : 'Reset & Re-sync Now'}
                    </button>
                </div>
            </div>

            {status && (
                <div className={`p-4 rounded-xl text-[10px] font-bold uppercase tracking-widest w-full flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                    {status.type === 'success' && <CheckCircle2 size={18} />}
                    {status.message}
                </div>
            )}
        </div>
    );
};

export default Backup;
