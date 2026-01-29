import React, { useState, useEffect } from 'react';
import {
    BarChart2, TrendingUp, ShoppingCart, Package,
    Users, Factory, ArrowLeft, RefreshCw,
    DollarSign, ArrowUpRight, ArrowDownRight,
    AlertCircle, Activity, PieChart
} from 'lucide-react';

// Premium Stat Card Component (Matching Inventory/Sales style)
const StatCard = ({ title, value, icon: Icon, color, onClick, percentage }) => {
    const colors = {
        blue: 'bg-white border-l-4 border-l-blue-600',
        emerald: 'bg-white border-l-4 border-l-emerald-500',
        rose: 'bg-white border-l-4 border-l-rose-500',
        amber: 'bg-white border-l-4 border-l-amber-500',
        slate: 'bg-white border-l-4 border-l-slate-400',
        indigo: 'bg-white border-l-4 border-l-indigo-500'
    };

    return (
        <div
            onClick={onClick}
            className={`relative overflow-hidden ${colors[color] || colors.blue} p-5 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md group cursor-pointer`}
        >
            <div className="relative flex items-center justify-between">
                <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-xl font-bold text-slate-800">{value}</h3>
                        {percentage !== undefined && (
                            <span className={`text-[9px] font-bold flex items-center ${percentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {percentage >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                {Math.abs(percentage)}%
                            </span>
                        )}
                    </div>
                </div>
                <div className="p-2.5 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <Icon size={20} />
                </div>
            </div>
        </div>
    );
};

const Reports = ({ currentUser }) => {
    const [summary, setSummary] = useState({
        totalSales: 0,
        totalPurchases: 0,
        totalExpenses: 0,
        totalCOGS: 0,
        netProfit: 0,
        inventoryValuationCost: 0,
        inventoryValuationSell: 0,
        lowStockCount: 0,
        totalReceivables: 0,
        totalPayables: 0,
        topCustomers: [],
        topProducts: [],
        recentDays: []
    });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Monthly');
    const [activeSection, setActiveSection] = useState('Dashboard'); // Dashboard, Sales, Inventory, Customers, Vendors
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

    useEffect(() => {
        loadReport();
    }, [currentUser, filter]);

    const loadReport = async () => {
        if (!currentUser?.company_id) return;
        setLoading(true);
        try {
            let startDate, endDate;
            const targetNow = new Date();

            if (filter === 'Weekly') {
                startDate = new Date(targetNow.setDate(targetNow.getDate() - 7)).toISOString();
                endDate = new Date().toISOString();
            } else if (filter === 'Monthly') {
                startDate = new Date(targetNow.setMonth(targetNow.getMonth() - 1)).toISOString();
                endDate = new Date().toISOString();
            } else if (filter === 'Yearly') {
                startDate = new Date(targetNow.setFullYear(targetNow.getFullYear() - 1)).toISOString();
                endDate = new Date().toISOString();
            }

            const data = await window.electronAPI.getReportSummary({
                companyId: currentUser.company_id,
                startDate,
                endDate
            });
            setSummary(data || {});
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Error loading report:', err);
        }
        setLoading(false);
    };

    const renderDashboard = () => (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`PKR ${summary.totalSales?.toLocaleString() ?? '0'}`}
                    icon={DollarSign}
                    color="blue"
                    onClick={() => setActiveSection('Sales')}
                />
                <StatCard
                    title="Purchase Cost"
                    value={`PKR ${summary.totalPurchases?.toLocaleString() ?? '0'}`}
                    icon={ShoppingCart}
                    color="amber"
                    onClick={() => setActiveSection('Purchases')}
                />
                <StatCard
                    title="Operating Expenses"
                    value={`PKR ${summary.totalExpenses?.toLocaleString() ?? '0'}`}
                    icon={TrendingUp}
                    color="rose"
                    onClick={() => setActiveSection('Expenses')}
                />
                <StatCard
                    title="Net Profit"
                    value={`PKR ${summary.netProfit?.toLocaleString() ?? '0'}`}
                    icon={PieChart}
                    color="emerald"
                    onClick={() => setActiveSection('Profit')}
                />
            </div>

            {/* Category Cards */}
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Business Units</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Inventory Card */}
                <div onClick={() => setActiveSection('Inventory')} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                            <Package size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-all">Inventory Performance</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Valuation & Stock Movement</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Asset Value (Cost)</span>
                            <span className="font-bold text-slate-800 text-sm">PKR {summary.inventoryValuationCost?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded-lg">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">Retail Value</span>
                            <span className="font-bold text-blue-900 text-sm">PKR {summary.inventoryValuationSell?.toLocaleString()}</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-[10px]">
                            <span className="text-rose-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                <AlertCircle size={12} /> {summary.lowStockCount} Low Items
                            </span>
                            <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-600 transition-all font-bold uppercase tracking-widest">
                                Expand Detail <ArrowUpRight size={14} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Customers Card */}
                <div onClick={() => setActiveSection('Customers')} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-all">CRM & Receivables</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Customer Credit & Loyalty</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Total Receivables</span>
                            <span className="font-bold text-emerald-600 text-sm">PKR {summary.totalReceivables?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center bg-emerald-50/30 p-2 rounded-lg">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Active Portfolio</span>
                            <span className="font-bold text-slate-800 text-sm">{summary.topCustomers?.length} Accounts</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-bold uppercase tracking-widest truncate max-w-[150px]">
                                Top: {summary.topCustomers?.[0]?.name || 'N/A'}
                            </span>
                            <div className="flex items-center gap-1 text-slate-400 group-hover:text-emerald-600 transition-all font-bold uppercase tracking-widest">
                                Expand Detail <ArrowUpRight size={14} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vendors Card */}
                <div onClick={() => setActiveSection('Vendors')} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
                            <Factory size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 group-hover:text-amber-600 transition-all">Supply Chain</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Vendor Payments & Sourcing</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Total Payables</span>
                            <span className="font-bold text-amber-600 text-sm">PKR {summary.totalPayables?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center bg-amber-50/30 p-2 rounded-lg">
                            <span className="text-[10px] font-bold text-amber-600 uppercase">Recent Invoices</span>
                            <span className="font-bold text-slate-800 text-sm">{summary.purchaseCount} Bills</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-bold uppercase tracking-widest">
                                Vendor Fulfillment Tracking
                            </span>
                            <div className="flex items-center gap-1 text-slate-400 group-hover:text-amber-600 transition-all font-bold uppercase tracking-widest">
                                Expand Detail <ArrowUpRight size={14} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Chart Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 text-slate-400 rounded-lg">
                            <Activity size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Operational Momentum</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Revenue vs Spends Trend</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-blue-600 shadow-sm shadow-blue-100"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Gross Sales</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-rose-500 shadow-sm shadow-rose-100"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Expenses</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-end gap-3 h-48 px-2">
                    {summary.recentDays?.slice(0, 14).reverse().map((day, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                            <div className="w-full flex gap-1.5 justify-center items-end h-full relative">
                                <div
                                    className="w-2.5 bg-blue-600 rounded-t-md transition-all group-hover:w-3 group-hover:shadow-lg group-hover:shadow-blue-200"
                                    style={{ height: `${Math.max(5, (day.sales / (summary.totalSales || 1)) * 300)}%` }}
                                    title={`Sales: ${day.sales}`}
                                ></div>
                                <div
                                    className="w-2.5 bg-rose-500 rounded-t-md transition-all group-hover:w-3 group-hover:shadow-lg group-hover:shadow-rose-200"
                                    style={{ height: `${Math.max(5, (day.expenses / (summary.totalExpenses || 1)) * 300)}%` }}
                                    title={`Expense: ${day.expenses}`}
                                ></div>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{day.date.split('-').slice(1).join('/')}</span>
                        </div>
                    ))}
                    {(!summary.recentDays || summary.recentDays.length === 0) && (
                        <div className="w-full flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                            No historical data for this period
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderDetailView = (title, Icon, data, columns) => (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActiveSection('Dashboard')}
                        className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all border border-slate-100 shadow-sm"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <Icon size={18} className="text-blue-500" />
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight uppercase">{title}</h2>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Detailed Analysis Period: {filter}</p>
                    </div>
                </div>
                <button
                    onClick={() => loadReport()}
                    className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                {columns.map((c, i) => (
                                    <th key={i} className="px-6 py-4">{c}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data?.length > 0 ? data.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                    {Object.values(row).map((val, j) => (
                                        <td key={j} className="px-6 py-4 text-xs font-bold text-slate-600">
                                            {typeof val === 'string' && val.includes('PKR') ? (
                                                <span className="text-slate-900">{val}</span>
                                            ) : val}
                                        </td>
                                    ))}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                                        No specific metrics for this category in the current interval
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-950 text-white rounded-lg shadow-lg shadow-blue-100">
                            <BarChart2 size={24} />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Analytical Intelligence</h1>
                        <span className="ml-2 px-2 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-bold uppercase rounded-md animate-pulse">Live</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Enterprise Reporting Engine / ID: {currentUser?.company_id?.slice(0, 8)}</p>
                        <div className="flex items-center gap-1.5 text-slate-300">
                            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">System Synced: {lastUpdated}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 rounded-xl p-1.5 border border-slate-200 shadow-inner">
                        {['Weekly', 'Monthly', 'Yearly'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setFilter(p)}
                                className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${filter === p ? 'bg-white text-blue-950 shadow-md transform scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* View Switching Logic */}
            {activeSection === 'Dashboard' && renderDashboard()}

            {activeSection === 'Inventory' && renderDetailView(
                'Inventory Valuation & Assets',
                Package,
                [
                    { category: 'Total Inventory Cost (Assets)', data: `PKR ${summary.inventoryValuationCost?.toLocaleString()}` },
                    { category: 'Potential Retail Value', data: `PKR ${summary.inventoryValuationSell?.toLocaleString()}` },
                    { category: 'Gross Margin Estimate', data: `PKR ${(summary.inventoryValuationSell - summary.inventoryValuationCost)?.toLocaleString()}` },
                    { category: 'Low Stock SKU Warning', data: summary.lowStockCount || '0' },
                ],
                ['Category Metric', 'Quantitative Value']
            )}

            {activeSection === 'Customers' && renderDetailView(
                'Customer CRM & Receivables',
                Users,
                summary.topCustomers?.map(c => ({
                    name: c.name,
                    spent: `PKR ${c.totalSpent?.toLocaleString()}`,
                    status: 'Active Client'
                })) || [],
                ['Customer Name', 'Lifetime Purchases', 'Status']
            )}

            {activeSection === 'Vendors' && renderDetailView(
                'Supplier Network & Payables',
                Factory,
                [
                    { head: 'Consolidated Payable Balance', value: `PKR ${summary.totalPayables?.toLocaleString()}` },
                    { head: 'Total Procurement Invoices', value: summary.purchaseCount?.toString() || '0' }
                ],
                ['Metric Description', 'Value']
            )}

            {activeSection === 'Sales' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setActiveSection('Dashboard')}
                                className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all border border-slate-100 shadow-sm"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight uppercase">Sales Velocity Journal</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Periodic Performance Audit</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Timeline</th>
                                    <th className="px-6 py-4 text-center">Invoices</th>
                                    <th className="px-6 py-4">Net Revenue</th>
                                    <th className="px-6 py-4">Direct Costs (COGS)</th>
                                    <th className="px-6 py-4">Operating Profit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {summary.recentDays?.filter(d => d.sales > 0 || d.expenses > 0 || d.purchases > 0).length > 0 ? summary.recentDays.filter(d => d.sales > 0 || d.expenses > 0 || d.purchases > 0).map((day, i) => (
                                    <tr key={i} className="hover:bg-blue-50/30 transition-all border-b border-slate-50 last:border-0">
                                        <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">
                                            {day.isMonthly ? new Date(day.date + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : day.date}
                                        </td>
                                        <td className="px-6 py-4 text-center text-xs font-black text-slate-800 bg-slate-50/30">{day.invoices}</td>
                                        <td className="px-6 py-4 text-xs font-black text-blue-900">PKR {day.sales?.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-xs font-black text-amber-600">PKR {day.cogs?.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md font-black text-xs ${day.profit >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                PKR {day.profit?.toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                                            No sales activity found for this interval
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeSection === 'Purchases' && renderDetailView(
                'Procurement & Purchase History',
                ShoppingCart,
                summary.recentDays?.filter(d => d.purchases > 0).map(d => ({
                    date: d.isMonthly ? new Date(d.date + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : d.date,
                    metric: 'Daily Purchase Total',
                    value: `PKR ${d.purchases?.toLocaleString()}`,
                    status: 'Audited'
                })) || [],
                ['Date', 'Detail', 'Net Amount', 'Status']
            )}

            {activeSection === 'Expenses' && renderDetailView(
                'Operating Expenditure Log',
                TrendingUp,
                summary.recentDays?.filter(d => d.expenses > 0).map(d => ({
                    date: d.isMonthly ? new Date(d.date + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : d.date,
                    metric: 'Operating Cost Sum',
                    value: `PKR ${d.expenses?.toLocaleString()}`,
                    status: 'Debited'
                })) || [],
                ['Date', 'Expense Category', 'Total Amount', 'Status']
            )}

            {activeSection === 'Profit' && renderDetailView(
                'Net Profitability Audit',
                PieChart,
                summary.recentDays?.filter(d => d.sales > 0 || d.expenses > 0).map(d => ({
                    date: d.isMonthly ? new Date(d.date + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : d.date,
                    rev: `PKR ${d.sales?.toLocaleString()}`,
                    exp: `PKR ${(d.expenses + d.cogs)?.toLocaleString()}`,
                    net: `PKR ${d.profit?.toLocaleString()}`
                })) || [],
                ['Timeline', 'Gross Revenue', 'Total Spends (COGS + Exp)', 'Net Business Profit']
            )}
        </div>
    );
};

export default Reports;
