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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dialog.type === 'confirm' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                                    dialog.type === 'error' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' :
                                        dialog.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                                            'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    }`}>
                                    {dialog.type === 'confirm' && <HelpCircle size={24} />}
                                    {dialog.type === 'error' && <X size={24} />}
                                    {dialog.type === 'success' && <Check size={24} />}
                                    {dialog.type === 'alert' && <Info size={24} />}
                                    {dialog.type === 'warning' && <AlertTriangle size={24} />}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{dialog.title}</h3>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                {dialog.message}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                            {dialog.type === 'confirm' ? (
                                <>
                                    <button
                                        onClick={closeDialog}
                                        className="flex-1 py-2.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    >
                                        {dialog.cancelText}
                                    </button>
                                    <button
                                        onClick={dialog.onConfirm}
                                        className="flex-1 py-2.5 bg-emerald-600 dark:bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 dark:hover:bg-emerald-500 shadow-sm transition-all active:scale-95"
                                    >
                                        {dialog.confirmText}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={closeDialog}
                                    className={`w-full py-2.5 text-white rounded-lg text-sm font-bold transition-all active:scale-95 ${dialog.type === 'error' ? 'bg-rose-600 hover:bg-rose-700' :
                                        dialog.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                            'bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500'
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
