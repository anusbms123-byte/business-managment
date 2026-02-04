import React, { useState, useEffect } from 'react';
import {
    BarChart2, ShoppingCart, Package,
    Users, Factory, RefreshCw,
    DollarSign, TrendingUp, RotateCcw,
    Users2, CreditCard, ArrowLeft,
    Calendar, Download, ChevronRight,
    TrendingDown, Activity, Layers,
    Briefcase, AlertTriangle, CheckCircle2
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';

const ReportCard = ({ title, value, subValue, icon: Icon, onClick, colorClass }) => (
    <div
        onClick={onClick}
        className={`bg-white border border-slate-200 border-l-4 ${colorClass} rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group animate-in zoom-in-95 duration-300`}
    >
        <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">
                <Icon size={20} />
            </div>
            <div className="text-slate-300 group-hover:text-slate-400 transition-colors">
                <ChevronRight size={18} />
            </div>
        </div>
        <div>
            <p className="text-black text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-xl font-black text-black tracking-tight">{value}</h3>
            {subValue && (
                <p className="text-[10px] text-black font-bold mt-2 flex items-center gap-1.5 uppercase tracking-tight">
                    {subValue}
                </p>
            )}
        </div>
    </div>
);

const DetailMiniCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
        <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
            <Icon size={18} />
        </div>
        <div>
            <p className="text-[9px] font-black text-black uppercase tracking-widest">{label}</p>
            <p className="text-sm font-black text-black tracking-tight">{value}</p>
        </div>
    </div>
);

const Reports = ({ currentUser }) => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeModule, setActiveModule] = useState(null); // 'sales', 'purchases', etc.
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

    // Date Filtering
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA'); // YYYY-MM-DD
    const today = now.toLocaleDateString('en-CA');
    const [dateRange, setDateRange] = useState({ start: firstDayOfMonth, end: today });
    const [overviewFilter, setOverviewFilter] = useState('Daily'); // For Dashboard

    useEffect(() => {
        if (activeModule) {
            loadDetailedReport();
        } else {
            loadDashboardReport();
        }
    }, [currentUser, overviewFilter, activeModule]);

    const loadDashboardReport = async () => {
        if (!currentUser?.company_id) return;
        setLoading(true);
        try {
            let start, end;
            const now = new Date();
            if (overviewFilter === 'Daily') {
                start = new Date();
                start.setHours(0, 0, 0, 0);
                start = start.toISOString();
                end = new Date().toISOString();
            } else if (overviewFilter === 'Weekly') {
                start = new Date(now.setDate(now.getDate() - 7)).toISOString();
                end = new Date().toISOString();
            } else if (overviewFilter === 'Monthly') {
                start = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
                end = new Date().toISOString();
            } else {
                start = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
                end = new Date().toISOString();
            }

            const data = await window.electronAPI.getReportSummary({
                companyId: currentUser.company_id,
                startDate: start,
                endDate: end
            });
            setSummary(data);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Error:', err);
        }
        setLoading(false);
    };

    const loadDetailedReport = async () => {
        if (!currentUser?.company_id) return;
        setLoading(true);
        try {
            const data = await window.electronAPI.getReportSummary({
                companyId: currentUser.company_id,
                startDate: new Date(dateRange.start + 'T00:00:00').toISOString(),
                endDate: new Date(dateRange.end + 'T23:59:59').toISOString()
            });
            setSummary(data);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err) {
            console.error('Error:', err);
        }
        setLoading(false);
    };

    const handleBack = () => {
        setActiveModule(null);
        setOverviewFilter('Daily');
    };

    if (loading && !summary) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <RefreshCw size={32} className="text-blue-600 animate-spin" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generating Analytics...</p>
            </div>
        );
    }

    const renderDashboard = () => (
        <div className="animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-end gap-6 pb-6 border-b border-slate-100">
                <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-200">
                    {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setOverviewFilter(p)}
                            className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${overviewFilter === p ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <ReportCard title="Sales" value={`PKR ${summary?.totalSales?.toLocaleString() ?? '0'}`} subValue={`${summary?.salesCount ?? 0} Invoices Generated`} icon={DollarSign} colorClass="border-l-blue-500" onClick={() => setActiveModule('sales')} />
                <ReportCard title="Purchases" value={`PKR ${summary?.totalPurchases?.toLocaleString() ?? '0'}`} subValue={`${summary?.purchaseCount ?? 0} Bills Logged`} icon={ShoppingCart} colorClass="border-l-amber-500" onClick={() => setActiveModule('purchases')} />
                <ReportCard title="Inventory" value={`PKR ${summary?.inventoryValuationCost?.toLocaleString() ?? '0'}`} subValue={`${summary?.lowStockCount ?? 0} Stock Warnings`} icon={Package} colorClass="border-l-indigo-500" onClick={() => setActiveModule('inventory')} />
                <ReportCard title="Expenses" value={`PKR ${summary?.totalExpenses?.toLocaleString() ?? '0'}`} subValue={`${summary?.expenseCount ?? 0} Transactions`} icon={TrendingUp} colorClass="border-l-rose-500" onClick={() => setActiveModule('expenses')} />
                <ReportCard title="Returns" value={`PKR ${summary?.totalReturns?.toLocaleString() ?? '0'}`} subValue={`${summary?.returnCount ?? 0} Items Reversed`} icon={RotateCcw} colorClass="border-l-orange-500" onClick={() => setActiveModule('returns')} />
                <ReportCard title="Suppliers" value={`PKR ${summary?.totalPayables?.toLocaleString() ?? '0'}`} subValue="Account Payables" icon={Factory} colorClass="border-l-slate-600" onClick={() => setActiveModule('suppliers')} />
                <ReportCard title="HRM" value={`PKR ${summary?.totalSalaries?.toLocaleString() ?? '0'}`} subValue={`${summary?.employeeCount ?? 0} Active Staff`} icon={Users2} colorClass="border-l-emerald-500" onClick={() => setActiveModule('hrm')} />
                <ReportCard title="Net Profit" value={`PKR ${summary?.netProfit?.toLocaleString() ?? '0'}`} subValue="Gross - Deductions" icon={CreditCard} colorClass="border-l-slate-900" onClick={() => setActiveModule('netprofit')} />
            </div>

            <div className="bg-slate-50/50 p-10 rounded-3xl border border-slate-100 text-center">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100 text-slate-300">
                    <BarChart2 size={24} />
                </div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Analytical Engine Standby</h3>
                <p className="text-[10px] text-slate-300 mt-2 uppercase tracking-tight italic">Click on any category above to view detailed logs and growth charts</p>
            </div>
        </div>
    );

    const renderDetailView = () => {
        const chartData = (summary?.recentDays || []).slice().reverse();
        const moduleMap = {
            sales: {
                title: 'Sales Analysis', icon: DollarSign, color: '#3b82f6', dataKey: 'sales',
                miniStats: [
                    { label: 'Avg Order Value', value: `PKR ${(Math.round(summary?.totalSales / (summary?.salesCount || 1)) || 0).toLocaleString()}`, icon: Activity, color: 'text-blue-500' },
                    { label: 'Total Invoices', value: summary?.salesCount || 0, icon: Layers, color: 'text-indigo-500' },
                    { label: 'Gross Margin', value: `PKR ${((summary?.totalSales || 0) - (summary?.totalCOGS || 0)).toLocaleString()}`, icon: Briefcase, color: 'text-emerald-500' }
                ],
                tableCols: ['Date Tag', 'Order Volume', 'Gross Revenue']
            },
            purchases: {
                title: 'Purchase Log', icon: ShoppingCart, color: '#f59e0b', dataKey: 'purchases',
                miniStats: [
                    { label: 'Avg Bill Size', value: `PKR ${(Math.round(summary?.totalPurchases / (summary?.purchaseCount || 1)) || 0).toLocaleString()}`, icon: Activity, color: 'text-amber-500' },
                    { label: 'Total Bills', value: summary?.purchaseCount || 0, icon: Layers, color: 'text-orange-500' },
                    { label: 'Stock Inbound', value: 'Audited', icon: CheckCircle2, color: 'text-slate-400' }
                ],
                tableCols: ['Billing Date', 'Invoice Count', 'Total Spent']
            },
            inventory: {
                title: 'Stock Valuation', icon: Package, color: '#6366f1', dataKey: 'inventory',
                miniStats: [
                    { label: 'Asset Value (Cost)', value: `PKR ${(summary?.inventoryValuationCost || 0).toLocaleString()}`, icon: Layers, color: 'text-indigo-500' },
                    { label: 'Low Stock Alerts', value: summary?.lowStockCount || 0, icon: AlertTriangle, color: 'text-rose-500' },
                    { label: 'Retail Potential', value: `PKR ${(summary?.inventoryValuationSell || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' }
                ],
                tableCols: ['Sync Date', 'Valuation Type', 'Asset Magnitude']
            },
            expenses: {
                title: 'Expense Audit', icon: TrendingUp, color: '#f43f5e', dataKey: 'expenses',
                miniStats: [
                    { label: 'Daily Average', value: `PKR ${(Math.round(summary?.totalExpenses / (chartData.length || 1)) || 0).toLocaleString()}`, icon: Activity, color: 'text-rose-500' },
                    { label: 'Module Entries', value: summary?.expenseCount || 0, icon: Layers, color: 'text-slate-500' },
                    { label: 'Status', value: 'Debited', icon: CheckCircle2, color: 'text-rose-600' }
                ],
                tableCols: ['Expense Date', 'Transactions', 'Net Expenditure']
            },
            returns: {
                title: 'Return History', icon: RotateCcw, color: '#f97316', dataKey: 'returns',
                miniStats: [
                    { label: 'Refund Volume', value: `PKR ${(summary?.totalReturns || 0).toLocaleString()}`, icon: TrendingDown, color: 'text-orange-600' },
                    { label: 'Total Claims', value: summary?.returnCount || 0, icon: Layers, color: 'text-slate-500' },
                    { label: 'Approval Rate', value: '100%', icon: CheckCircle2, color: 'text-emerald-500' }
                ],
                tableCols: ['Return Date', 'Claim Count', 'Refund Magnitude']
            },
            suppliers: {
                title: 'Supplier Accounts', icon: Factory, color: '#475569', dataKey: 'payables',
                miniStats: [
                    { label: 'Direct Liabilities', value: `PKR ${(summary?.totalPayables || 0).toLocaleString()}`, icon: Layers, color: 'text-slate-600' },
                    { label: 'Active Vendors', value: `${summary?.vendorCount || 0} Vendors`, icon: Users, color: 'text-blue-500' },
                    { label: 'Payment Status', value: summary?.totalPayables > 0 ? "Outstanding" : "Cleared", icon: AlertTriangle, color: summary?.totalPayables > 0 ? 'text-amber-500' : 'text-emerald-500' }
                ],
                tableCols: ['Snapshot Date', 'Account Head', 'Balance Owed']
            },
            hrm: {
                title: 'Payroll Summary', icon: Users2, color: '#10b981', dataKey: 'salaries',
                miniStats: [
                    { label: 'Active Staff', value: summary?.employeeCount || 0, icon: Users, color: 'text-emerald-600' },
                    { label: 'Avg Salary/Emp', value: `PKR ${(Math.round(summary?.totalSalaries / (summary?.employeeCount || 1)) || 0).toLocaleString()}`, icon: Activity, color: 'text-blue-500' },
                    { label: 'Total Dispersed', value: `PKR ${(summary?.totalSalaries || 0).toLocaleString()}`, icon: CheckCircle2, color: 'text-emerald-500' }
                ],
                tableCols: ['Disbursal Month', 'Headcount', 'Net Payroll']
            },
            netprofit: {
                title: 'Profitability Audit', icon: CreditCard, color: '#0f172a', dataKey: 'profit',
                miniStats: [
                    { label: 'Gross Sales', value: `PKR ${(summary?.totalSales || 0).toLocaleString()}`, icon: DollarSign, color: 'text-blue-600' },
                    { label: 'Operating Costs', value: `PKR ${((summary?.totalExpenses || 0) + (summary?.totalSalaries || 0)).toLocaleString()}`, icon: TrendingDown, color: 'text-rose-500' },
                    { label: 'COGS Sum', value: `PKR ${(summary?.totalCOGS || 0).toLocaleString()}`, icon: Layers, color: 'text-orange-500' }
                ],
                tableCols: ['Audit Date', 'Operational Delta', 'Net Bottom Line']
            }
        };

        const config = moduleMap[activeModule];

        return (
            <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-[#F8FAFC] animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                {/* Detail Header */}
                <div className="px-4 md:px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between bg-white shrink-0 gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all border border-slate-200 shadow-sm"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <config.icon size={18} className="text-blue-600" />
                                <h1 className="text-xl font-black text-black tracking-tight uppercase italic">{config.title}</h1>
                            </div>
                            <p className="text-black text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Deep Dive Report Analysis</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-1.5 border border-slate-200 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 px-3 border-r border-slate-100">
                            <Calendar size={14} className="text-slate-400" />
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="text-[10px] font-bold text-black outline-none uppercase bg-transparent w-28"
                            />
                        </div>
                        <div className="flex items-center gap-2 px-3">
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="text-[10px] font-bold text-black outline-none uppercase bg-transparent w-28"
                            />
                        </div>
                        <button
                            onClick={loadDetailedReport}
                            className="bg-slate-900 text-white p-2 rounded-xl hover:bg-black transition-all shadow-lg shadow-slate-200"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">

                    {/* Primary Metric & Chart Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 overflow-hidden relative">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-[10px] font-black text-black uppercase tracking-widest mb-1 italic">Trend Visualization</h2>
                                    <p className="text-xs text-black font-bold uppercase tracking-tight">Timeline Performance Analysis</p>
                                </div>
                                <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Download size={18} /></button>
                            </div>
                            <div className="h-64 mt-4 -ml-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={config.color} stopOpacity={0.2} />
                                                <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="date"
                                            stroke="#94a3b8"
                                            fontSize={9}
                                            tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', padding: '10px' }}
                                            labelStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                            itemStyle={{ color: config.color, fontSize: '10px', fontWeight: 'black' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey={config.dataKey}
                                            stroke={config.color}
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorValue)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-[#0B1033] rounded-3xl p-8 text-white flex flex-col justify-between relative overflow-hidden shadow-2xl shadow-blue-900/20">
                            <div className="absolute top-0 right-0 p-10 opacity-10"><config.icon size={120} /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300 italic">Consolidated Total</p>
                                <h2 className="text-3xl font-black mt-2 tracking-tighter">
                                    PKR {(summary?.[`total${activeModule.charAt(0).toUpperCase() + activeModule.slice(1)}`] || summary?.[activeModule === 'hrm' ? 'totalSalaries' : activeModule === 'netprofit' ? 'netProfit' : 'totalSales'] || 0).toLocaleString()}
                                </h2>
                            </div>
                            <div className="space-y-4 relative z-10 pt-10">
                                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Volume</span>
                                    <span className="text-lg font-black">{summary?.[`${activeModule.replace('netprofit', 'sales')}Count`] || '0'} Logs</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-blue-600/20 border border-blue-500/30">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-blue-200">Periodic Status</p>
                                    <p className="text-xs font-black mt-1 italic uppercase tracking-tighter">Verified & Processed</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sub-Metrics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {config.miniStats.map((stat, idx) => (
                            <DetailMiniCard key={idx} {...stat} />
                        ))}
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em] italic underline underline-offset-8">Insight Journal</h3>
                            <span className="text-[9px] font-bold text-black">Detailed periodic activity logs</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        {config.tableCols.map((col, idx) => (
                                            <th key={idx} className={`px-8 py-4 text-[10px] font-black text-black uppercase tracking-widest ${idx === 2 ? 'text-right' : ''}`}>
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {chartData.filter(d => activeModule === 'inventory' || activeModule === 'suppliers' || d[config.dataKey] > 0).map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-8 py-5 text-xs font-bold text-black font-mono italic uppercase">{row.date}</td>
                                            <td className="px-8 py-5">
                                                <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-200 inline-block mr-2 group-hover:border-blue-500 transition-colors"></div>
                                                <span className="text-xs font-black text-black uppercase italic">
                                                    {activeModule === 'sales' ? `${row.invoices} Orders Recieved` :
                                                        activeModule === 'purchases' ? `${row.invoices} Stock Invoices` :
                                                            activeModule === 'hrm' ? `${row.invoices || summary?.employeeCount} Staff Members` :
                                                                `Activity_ID_${i + 1} Log`}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right font-black text-black text-xs">PKR {row[config.dataKey]?.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {chartData.filter(d => activeModule === 'inventory' || activeModule === 'suppliers' || d[config.dataKey] > 0).length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-8 py-20 text-center">
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No valid records found for this period</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto pb-10">
            {activeModule ? renderDetailView() : renderDashboard()}
        </div>
    );
};

export default Reports;
