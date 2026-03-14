import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, X, Edit2, Trash2, Home, Zap, Users, Coffee, DollarSign, TrendingUp, Loader2, Check } from 'lucide-react';
import { canCreate, canEdit, canDelete } from '../utils/permissions';
import { useDialog } from '../context/DialogContext';



// Premium Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
    const colors = {
        blue: 'bg-white border-l-4 border-l-blue-600',
        orange: 'bg-white border-l-4 border-l-orange-500',
        emerald: 'bg-white border-l-4 border-l-emerald-500',
        rose: 'bg-white border-l-4 border-l-rose-500',
        amber: 'bg-white border-l-4 border-l-amber-500',
        indigo: 'bg-white border-l-4 border-l-indigo-500'
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

const Expenses = ({ currentUser }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', amount: '', category: 'General', description: '', date: new Date().toISOString().split('T')[0] });
    const [saving, setSaving] = useState(false);

    const { showAlert, showConfirm, showError } = useDialog();

    useEffect(() => {
        loadExpenses();
    }, [currentUser]);

    const loadExpenses = async () => {
        if (!currentUser?.company_id) return;
        setLoading(true);
        try {
            const data = await window.electronAPI.getExpenses(currentUser.company_id);
            setExpenses(Array.isArray(data) ? data : []);
            if (data?.success === false) console.error("Expense Error:", data.message);
        } catch (err) {
            console.error('Error loading expenses:', err);
            setExpenses([]);
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = { ...formData, companyId: currentUser.company_id };
            let result;
            if (formData.id) {
                result = await window.electronAPI.updateExpense(data);
            } else {
                result = await window.electronAPI.createExpense(data);
            }
            if (result.success !== false) {
                setShowModal(false);
                loadExpenses();
                setFormData({ title: '', amount: '', category: 'General', description: '', date: new Date().toISOString().split('T')[0] });
            } else {
                showError(result.message || "Error saving expense");
            }
        } catch (err) {
            showError("Error saving expense: " + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        showConfirm("Are you sure you want to delete this expense?", async () => {
            try {
                const result = await window.electronAPI.deleteExpense(id);
                if (result.success !== false) {
                    loadExpenses();
                } else {
                    showError(result.message || "Error deleting expense");
                }
            } catch (err) {
                showError("Error deleting expense: " + err.message);
            }
        });
    };

    const openEditModal = (expense) => {
        setFormData({
            ...expense,
            date: new Date(expense.date).toISOString().split('T')[0]
        });
        setShowModal(true);
    };

    const filteredExpenses = expenses.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        today: (expenses || []).filter(e => e.date && new Date(e.date).toDateString() === new Date().toDateString()).reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
        rent: (expenses || []).filter(e => e.category === 'Rent').reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
        utilities: (expenses || []).filter(e => e.category === 'Utilities').reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
        salaries: (expenses || []).filter(e => e.category === 'Salaries').reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
        teaSnacks: (expenses || []).filter(e => e.category === 'Tea/Snacks').reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
    };

    return (
        <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700">




            {/* Expenses Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px] transition-colors duration-300">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative group w-full md:w-80 text-left">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-bold placeholder:text-slate-400 dark:placeholder:text-slate-600"
                            placeholder="Search here..."
                        />
                    </div>
                    {canCreate('expenses') && (
                        <button
                            onClick={() => {
                                setFormData({ title: '', amount: '', category: 'General', description: '', date: new Date().toISOString().split('T')[0] });
                                setShowModal(true);
                            }}
                            className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all active:scale-95 text-sm"
                        >
                            <Plus size={16} />
                            <span>Add Expense</span>
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 transition-colors">
                                <th className="px-6 py-4 text-[11px] font-bold text-black dark:text-white border-b border-slate-200 dark:border-slate-800">Date</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-black dark:text-white border-b border-slate-200 dark:border-slate-800">Category</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-black dark:text-white border-b border-slate-200 dark:border-slate-800">Title</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-black dark:text-white border-b border-slate-200 dark:border-slate-800">Amount</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-3 border-slate-100 dark:border-slate-700 border-t-emerald-600 rounded-full animate-spin"></div>
                                            <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold tracking-widest">Fetching records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (filteredExpenses?.length ?? 0) === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center text-slate-400 dark:text-slate-500 font-bold text-sm uppercase tracking-widest transition-colors duration-300">
                                        No expenses found
                                    </td>
                                </tr>
                            ) : filteredExpenses?.map((expense) => (
                                <tr key={expense.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-4 text-xs font-bold text-black dark:text-slate-200 uppercase tracking-tight transition-colors">
                                        {expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-bold border border-emerald-100 dark:border-emerald-800/50">
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-black dark:text-slate-200 uppercase tracking-tight transition-colors">{expense.title}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 tracking-tight transition-colors">
                                            PKR {expense.amount?.toLocaleString() ?? '0'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            {canEdit('expenses') && (
                                                <button onClick={() => openEditModal(expense)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {canDelete('expenses') && (
                                                <button onClick={() => handleDelete(expense.id)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-white dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* Full-Page Header */}
                        <div className="px-4 md:px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10 transition-colors duration-300 font-sans">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 transition-colors">
                                    <DollarSign size={22} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xl md:text-2xl font-bold text-black dark:text-white tracking-tight truncate transition-colors font-bold">{formData.id ? 'Edit Expense' : 'Add Expense'}</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-3 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50"
                            >
                                <span className="text-[10px] font-bold hidden md:block">Close</span>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="max-w-7xl mx-auto w-full p-4 md:p-8 pb-24">
                            <form onSubmit={handleSave} className="space-y-8 md:space-y-12">

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                    <div className="space-y-4 md:space-y-6 text-left">
                                        <h4 className="text-[10px] font-bold text-black dark:text-slate-500 flex items-center gap-2">
                                            <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
                                            Primary Info
                                        </h4>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">Title *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                placeholder="e.g. Office Electricity Bill"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">Amount *</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        required
                                                        value={formData.amount || ''}
                                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">Category *</label>
                                                <select
                                                    value={formData.category}
                                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-sm cursor-pointer appearance-none text-slate-800 dark:text-slate-100"
                                                >
                                                    <option value="General">General</option>
                                                    <option value="Utilities">Utilities</option>
                                                    <option value="Rent">Rent</option>
                                                    <option value="Transport">Transport</option>
                                                    <option value="Salaries">Salaries</option>
                                                    <option value="Tea/Snacks">Tea/Snacks</option>
                                                    <option value="Others">Others</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-left">
                                            <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">Date *</label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-sm text-slate-800 dark:text-slate-100"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 md:space-y-6 text-left">
                                        <h4 className="text-[10px] font-bold text-black dark:text-slate-500 flex items-center gap-2 transition-colors">
                                            <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
                                            Other Info
                                        </h4>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-black dark:text-slate-400 ml-1">Notes</label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-bold text-sm h-32 md:h-44 resize-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                placeholder="Write any additional details about this expense..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 sticky bottom-0 bg-white dark:bg-slate-900 pb-8 transition-colors duration-300">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-sm disabled:opacity-70 shadow-sm"
                                    >
                                        {saving ? 'Saving...' : 'Save now'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

            )}
        </div>
    );
};

export default Expenses;
