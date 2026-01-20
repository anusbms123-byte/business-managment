import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PendingApproval = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
            <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-700">
                <div className="bg-white rounded-2xl shadow-xl p-12 border border-slate-100">
                    <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock size={40} className="animate-pulse" />
                    </div>

                    <h1 className="text-2xl font-black text-slate-800 mb-2">Verification Pending</h1>
                    <p className="text-slate-400 font-medium mb-8">
                        Your company verification request has been submitted to the Super Admin. You will receive an access notification once approved.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>

                <p className="mt-8 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    Business Management System
                </p>
            </div>
        </div>
    );
};

export default PendingApproval;
