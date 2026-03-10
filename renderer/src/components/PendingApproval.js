import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PendingApproval = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-center transition-colors duration-300">
            <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-700">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-12 border border-slate-100 dark:border-slate-800">
                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock size={40} className="animate-pulse" />
                    </div>

                    <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Verification Pending</h1>
                    <p className="text-slate-400 dark:text-slate-500 font-medium mb-8">
                        Your company request has been submitted successfully. It will be reviewed shortly, and you will receive a response soon.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-bold text-xs uppercase tracking-widest transition-all"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>

                <p className="mt-8 text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                    Business Management System
                </p>
            </div>
        </div>
    );
};

export default PendingApproval;
