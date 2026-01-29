import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreHorizontal, X, Edit2, Trash2, Home, Zap, Users, Coffee, DollarSign, TrendingUp } from 'lucide-react';
import { canCreate, canEdit, canDelete } from '../utils/permissions';



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
                alert(result.message || "Error saving expense");
            }
        } catch (err) {
            alert("Error saving expense: " + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this expense?")) return;
        try {
            const result = await window.electronAPI.deleteExpense(id);
            if (result.success !== false) {
                loadExpenses();
            } else {
                alert(result.message || "Error deleting expense");
            }
        } catch (err) {
            alert("Error deleting expense: " + err.message);
        }
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Business Expenses</h1>
                    <p className="text-slate-500 text-sm mt-1">Track and manage your daily operational spending.</p>
                </div>
                {canCreate('expenses') && (
                    <button
                        onClick={() => {
                            setFormData({ title: '', amount: '', category: 'General', description: '', date: new Date().toISOString().split('T')[0] });
                            setShowModal(true);
                        }}
                        className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-xs uppercase tracking-widest"
                    >
                        <Plus size={16} />
                        <span>Add Expense</span>
                    </button>
                )}
            </div>

            {/* Stat Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Total Rent"
                    value={`PKR ${stats.rent.toLocaleString()}`}
                    icon={Home}
                    color="blue"
                />
                <StatCard
                    title="Utilities"
                    value={`PKR ${stats.utilities.toLocaleString()}`}
                    icon={Zap}
                    color="amber"
                />
                <StatCard
                    title="Salaries"
                    value={`PKR ${stats.salaries.toLocaleString()}`}
                    icon={Users}
                    color="indigo"
                />
                <StatCard
                    title="Tea & Snacks"
                    value={`PKR ${stats.teaSnacks.toLocaleString()}`}
                    icon={Coffee}
                    color="orange"
                />
            </div>

            {/* Expenses Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-5 border-b border-slate-100 bg-slate-50/20">
                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
                            placeholder="Search expense history..."
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Category</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Expenditure Title</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-3 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest text-xs">Fetching records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (filteredExpenses?.length ?? 0) === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center text-slate-400 font-bold text-sm uppercase tracking-widest">
                                        No expenses found
                                    </td>
                                </tr>
                            ) : filteredExpenses?.map((expense) => (
                                <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-tight">
                                        {expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-tight border border-blue-100">
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-800 uppercase tracking-tight">{expense.title}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-rose-600 tracking-tight">
                                            PKR {expense.amount?.toLocaleString() ?? '0'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            {canEdit('expenses') && (
                                                <button onClick={() => openEditModal(expense)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {canDelete('expenses') && (
                                                <button onClick={() => handleDelete(expense.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">
                        <div className="flex-1 overflow-y-auto">
                            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{formData.id ? 'Edit Expense' : 'Add New Expense'}</h3>
                                <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><X size={18} /></button>
                            </div>

                            <form onSubmit={handleSave} className="p-8 space-y-5">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Expense Title</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm"
                                            placeholder="e.g. Office Electricity Bill"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Amount (PKR)</label>
                                            <input
                                                type="number"
                                                required
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Category</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm"
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

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Description (Optional)</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-sm h-24 resize-none"
                                            placeholder="Add notes about this expense..."
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors text-xs uppercase tracking-widest"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-blue-950 text-white rounded-lg font-bold shadow-sm shadow-blue-100 hover:bg-slate-900 transition-all disabled:opacity-50 text-xs uppercase tracking-widest"
                                    >
                                        {saving ? 'Saving...' : formData.id ? 'Update Expense' : 'Save Expense'}
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

