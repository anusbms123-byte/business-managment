import React, { useState, useEffect } from 'react';

const Reports = ({ currentUser }) => {
    const [summary, setSummary] = useState({ totalSales: 0, totalPurchases: 0, totalExpenses: 0, netProfit: 0, recentDays: [] });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Weekly');
    const [category, setCategory] = useState('Sales Performance');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    useEffect(() => {
        loadReport();
    }, [currentUser, filter]);

    const loadReport = async () => {
        if (!currentUser?.company_id) return;
        setLoading(true);
        try {
            let startDate, endDate;
            const now = new Date();

            if (filter === 'Weekly') {
                startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
                endDate = new Date().toISOString();
            } else if (filter === 'Monthly') {
                startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
                endDate = new Date().toISOString();
            } else if (filter === 'Yearly') {
                startDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
                endDate = new Date().toISOString();
            }

            const data = await window.electronAPI.getReportSummary({
                companyId: currentUser.company_id,
                startDate,
                endDate
            });
            setSummary((data && data.success !== false) ? data : { totalSales: 0, totalPurchases: 0, totalExpenses: 0, netProfit: 0, recentDays: [] });
            if (data?.success === false) console.error("Report Error:", data.message);
        } catch (err) {
            console.error('Error loading report:', err);
            setSummary({ totalSales: 0, totalPurchases: 0, totalExpenses: 0, netProfit: 0, recentDays: [] });
        }
        setLoading(false);
    };

    const handleCompileReport = async () => {
        if (!customRange.start || !customRange.end) return window.alert('Please select date range');
        setLoading(true);
        try {
            const data = await window.electronAPI.getReportSummary({
                companyId: currentUser.company_id,
                startDate: new Date(customRange.start).toISOString(),
                endDate: new Date(customRange.end).toISOString()
            });
            setSummary((data && data.success !== false) ? data : { totalSales: 0, totalPurchases: 0, totalExpenses: 0, netProfit: 0, recentDays: [] });
            if (data?.success === false) window.alert(data.message || "Error generating report");
        } catch (err) {
            window.alert('Error generating report: ' + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Business Reports</h1>
                    <p className="text-slate-500 text-sm mt-1">Comprehensive analysis of your organization's performance.</p>
                </div>
                <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200 w-fit">
                    {['Weekly', 'Monthly', 'Yearly'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setFilter(p)}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${filter === p ? 'bg-blue-950 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-5 border-l-4 border-l-blue-500 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Sales</p>
                    <p className="text-xl font-bold text-slate-800">PKR {summary.totalSales?.toLocaleString() ?? '0'}</p>
                </div>
                <div className="bg-white rounded-xl p-5 border-l-4 border-l-amber-500 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Purchases</p>
                    <p className="text-xl font-bold text-slate-800">PKR {summary.totalPurchases?.toLocaleString() ?? '0'}</p>
                </div>
                <div className="bg-white rounded-xl p-5 border-l-4 border-l-rose-500 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Expenses</p>
                    <p className="text-xl font-bold text-slate-800">PKR {summary.totalExpenses?.toLocaleString() ?? '0'}</p>
                </div>
                <div className="bg-white rounded-xl p-5 border-l-4 border-l-emerald-500 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Net Profit</p>
                    <p className={`text-xl font-bold ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>PKR {summary.netProfit?.toLocaleString() ?? '0'}</p>
                </div>
            </div>

            {/* Report Generator */}
            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-6">Analytical Report Builder</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Module Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all font-sans"
                        >
                            <option value="Sales Performance">Sales Performance</option>
                            <option value="Purchase History">Purchase History</option>
                            <option value="Expense Audit">Expense Audit</option>
                            <option value="Profit & Loss Statement">Profit & Loss Statement</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Interval Start</label>
                        <input type="date" value={customRange.start} onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Interval End</label>
                        <input type="date" value={customRange.end} onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500 transition-all" />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={handleCompileReport}
                            disabled={loading}
                            className="w-full px-6 py-2.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            {loading ? 'Compiling...' : 'Compile Report'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
                <div className="p-5 border-b border-slate-100 bg-slate-50/20">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Consolidated Period Summary</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Date/Period</th>
                                {category === 'Sales Performance' || category === 'Profit & Loss Statement' ? (
                                    <>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Invoices</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Gross Sales</th>
                                    </>
                                ) : null}
                                {category === 'Purchase History' || category === 'Profit & Loss Statement' ? (
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Purchases</th>
                                ) : null}
                                {category === 'Expense Audit' || category === 'Profit & Loss Statement' ? (
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Expenses</th>
                                ) : null}
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    {category === 'Profit & Loss Statement' ? 'Net Profit' : 'Total'}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Generating reports...</td>
                                </tr>
                            ) : (summary.recentDays?.length ?? 0) === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No data available for this period</td>
                                </tr>
                            ) : summary.recentDays?.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-tight">{row.date}</td>
                                    {category === 'Sales Performance' || category === 'Profit & Loss Statement' ? (
                                        <>
                                            <td className="px-6 py-4 text-center text-xs font-bold text-slate-800">{row.invoices}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-blue-950 tracking-tight">PKR {row.sales?.toLocaleString() ?? '0'}</td>
                                        </>
                                    ) : null}
                                    {category === 'Purchase History' || category === 'Profit & Loss Statement' ? (
                                        <td className="px-6 py-4 text-xs font-bold text-amber-600 tracking-tight">PKR {row.purchases?.toLocaleString() ?? '0'}</td>
                                    ) : null}
                                    {category === 'Expense Audit' || category === 'Profit & Loss Statement' ? (
                                        <td className="px-6 py-4 text-xs font-bold text-rose-500 tracking-tight">PKR {row.expenses?.toLocaleString() ?? '0'}</td>
                                    ) : null}
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold tracking-tight ${row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            PKR {(category === 'Sales Performance' ? row.sales :
                                                category === 'Purchase History' ? row.purchases :
                                                    category === 'Expense Audit' ? row.expenses :
                                                        row.profit)?.toLocaleString() ?? '0'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;

