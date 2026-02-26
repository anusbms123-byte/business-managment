import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, Check, AlertTriangle, Info, HelpCircle } from 'lucide-react';

const DialogContext = createContext();

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

export const DialogProvider = ({ children }) => {
    const [dialog, setDialog] = useState({
        show: false,
        title: '',
        message: '',
        type: 'alert', // 'alert', 'confirm', 'error', 'success', 'warning'
        onConfirm: null,
        onCancel: null,
        confirmText: 'Confirm',
        cancelText: 'Cancel'
    });

    const showAlert = useCallback((message, title = 'Notification') => {
        setDialog({
            show: true,
            title,
            message,
            type: 'alert',
            confirmText: 'Understood'
        });
    }, []);

    const showConfirm = useCallback((message, onConfirm, title = 'Are you sure?') => {
        setDialog({
            show: true,
            title,
            message,
            type: 'confirm',
            onConfirm: () => {
                onConfirm();
                setDialog(prev => ({ ...prev, show: false }));
            },
            confirmText: 'Yes, Proceed',
            cancelText: 'Cancel'
        });
    }, []);

    const showError = useCallback((message, title = 'Error Occurred') => {
        setDialog({
            show: true,
            title,
            message,
            type: 'error',
            confirmText: 'Close'
        });
    }, []);

    const showSuccess = useCallback((message, title = 'Success') => {
        setDialog({
            show: true,
            title,
            message,
            type: 'success',
            confirmText: 'Great!'
        });
    }, []);

    const closeDialog = () => setDialog(prev => ({ ...prev, show: false }));

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm, showError, showSuccess, closeDialog }}>
            {children}
            {dialog.show && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dialog.type === 'confirm' ? 'bg-amber-50 text-amber-600' :
                                        dialog.type === 'error' ? 'bg-rose-50 text-rose-600' :
                                            dialog.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                                                'bg-blue-50 text-blue-600'
                                    }`}>
                                    {dialog.type === 'confirm' && <HelpCircle size={24} />}
                                    {dialog.type === 'error' && <X size={24} />}
                                    {dialog.type === 'success' && <Check size={24} />}
                                    {dialog.type === 'alert' && <Info size={24} />}
                                    {dialog.type === 'warning' && <AlertTriangle size={24} />}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">{dialog.title}</h3>
                            </div>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                {dialog.message}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 border-t border-slate-100">
                            {dialog.type === 'confirm' ? (
                                <>
                                    <button
                                        onClick={closeDialog}
                                        className="flex-1 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                    >
                                        {dialog.cancelText}
                                    </button>
                                    <button
                                        onClick={dialog.onConfirm}
                                        className="flex-1 py-2.5 bg-blue-950 text-white rounded-lg text-sm font-bold hover:bg-slate-900 shadow-sm shadow-blue-100 transition-all active:scale-95"
                                    >
                                        {dialog.confirmText}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={closeDialog}
                                    className={`w-full py-2.5 text-white rounded-lg text-sm font-bold transition-all active:scale-95 ${dialog.type === 'error' ? 'bg-rose-600 hover:bg-rose-700' :
                                            dialog.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                                'bg-blue-950 hover:bg-slate-900'
                                        }`}
                                >
                                    {dialog.confirmText}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
};
