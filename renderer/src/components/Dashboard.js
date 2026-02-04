import React, { useState, useEffect } from 'react';
import { MoreVertical, TrendingUp, FolderKanban, Wallet, UserPlus } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend
} from 'recharts';

// Circular Progress Component
const CircularProgress = ({ percentage, color }) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <svg className="w-10 h-10 transform -rotate-90">
            <circle cx="20" cy="20" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="3" />
            <circle
                cx="20" cy="20" r={radius}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
            />
        </svg>
    );
};

// Stat Card Component
const StatCard = ({ title, value, change, changeType, percentage, color, icon: Icon }) => (
    <div className="bg-white rounded-xl p-5 border-l-4 border-slate-200 border border-slate-200 shadow-sm transition-all hover:shadow-md group" style={{ borderLeftColor: color }}>
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                    {Icon && <Icon size={14} className="text-black group-hover:text-blue-600 transition-colors" />}
                    <p className="text-[10px] text-black font-bold uppercase tracking-widest">{title}</p>
                </div>
                <p className="text-xl font-medium text-black">{value}</p>
                <div className="mt-3 flex items-center space-x-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${changeType === 'up' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {changeType === 'up' ? '↑' : '↓'} {change}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">interval trend</span>
                </div>
            </div>
            <div className="relative flex items-center justify-center ml-4">
                <CircularProgress percentage={percentage} color={color} />
                <span className="absolute text-[10px] font-black text-black">{percentage}%</span>
            </div>
        </div>
    </div>
);

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white shadow-2xl rounded-xl p-4 border border-slate-100 min-w-[160px] animate-in fade-in zoom-in duration-200">
                <p className="text-[10px] text-slate-400 mb-2.5 font-bold uppercase tracking-widest">{label}</p>
                <div className="space-y-2.5">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-6">
                            <div className="flex items-center space-x-2">
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }}></div>
                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{entry.name}</span>
                            </div>
                            <span className="text-[11px] font-black text-slate-900 leading-none">PKR {entry.value?.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const CHART_COLORS = [
    '#FF6B6B', // Red
    '#4D96FF', // Blue
    '#FFD93D', // Yellow/Gold
    '#6BCB77', // Green
    '#845EF7', // Purple
    '#FF9F43', // Orange
    '#00D2D3', // Teal/Cyan
    '#FF78B7', // Pink
    '#54A0FF', // Sky Blue
    '#5F27CD', // Deep Purple
];

// Modern Bar Chart Component
const PerformanceChart = ({ data }) => {
    return (
        <div style={{ width: '100%', height: 350 }} className="mt-4">
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#babbbd', fontSize: 10, fontWeight: 800 }}
                        tickFormatter={(str) => {
                            try {
                                const d = new Date(str);
                                if (isNaN(d)) return str;
                                if (str.length === 7) {
                                    return d.toLocaleDateString(undefined, { month: 'short' });
                                }
                                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            } catch (e) { return str; }
                        }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#babbbd', fontSize: 10, fontWeight: 800 }}
                        tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />


                    {/* Sales Bar */}
                    <Bar
                        dataKey="sales"
                        name="Revenue"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-sales-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                    </Bar>

                    {/* Net Profit Bar */}
                    <Bar
                        dataKey="profit"
                        name="Net Profit"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-profit-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} fillOpacity={0.7} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const Dashboard = ({ currentUser }) => {
    const [summary, setSummary] = useState({ totalSales: 0, totalPurchases: 0, totalExpenses: 0, netProfit: 0, recentDays: [] });
    const [recentSales, setRecentSales] = useState([]);
    const [topCustomers, setTopCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Daily');

    useEffect(() => {
        loadDashboardData();
    }, [currentUser, filter]);

    const loadDashboardData = async () => {
        if (!currentUser?.company_id) return;
        setLoading(true);
        try {
            // Fetch multiple data points in parallel
            const [reportData, salesData, customersData] = await Promise.all([
                window.electronAPI.getReportSummary({ companyId: currentUser.company_id, period: filter }),
                window.electronAPI.getSales(currentUser.company_id),
                window.electronAPI.getCustomers(currentUser.company_id)
            ]);

            const summaryData = (reportData && reportData.success !== false) ? reportData : { totalSales: 0, totalPurchases: 0, totalExpenses: 0, netProfit: 0, recentDays: [] };
            setSummary(summaryData);
            setRecentSales(Array.isArray(salesData) ? salesData.slice(0, 5) : []);
            setTopCustomers(Array.isArray(customersData) ? customersData.slice(0, 4) : []);

            if (reportData?.success === false) console.error("Report Error:", reportData.message);
            if (salesData?.success === false) console.error("Sales Error:", salesData.message);
            if (customersData?.success === false) console.error("Customer Error:", customersData.message);

        } catch (err) {
            console.error('Error loading dashboard:', err);
            setSummary({ totalSales: 0, totalPurchases: 0, totalExpenses: 0, netProfit: 0, recentDays: [] });
            setRecentSales([]);
            setTopCustomers([]);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-black">Business Dashboard</h1>
                    <p className="text-black text-lg mt-1 font-bold">Quick summary of your business performance.</p>
                </div>
                <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200 w-fit">
                    {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setFilter(p)}
                            className={`px-5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${filter === p ? 'bg-blue-950 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Sales"
                    value={`PKR ${summary.totalSales?.toLocaleString() ?? '0'}`}
                    change="Auto"
                    changeType="up"
                    percentage={summary.totalSales > 0 ? 100 : 0}
                    color="#2563eb"
                    icon={TrendingUp}
                />
                <StatCard
                    title="Stock Cost"
                    value={`PKR ${summary.totalCOGS?.toLocaleString() ?? '0'}`}
                    change="Auto"
                    changeType="up"
                    percentage={summary.totalCOGS > 0 ? 100 : 0}
                    color="#10b981"
                    icon={FolderKanban}
                />
                <StatCard
                    title="All Expenses"
                    value={`PKR ${summary.totalExpenses?.toLocaleString() ?? '0'}`}
                    change="Auto"
                    changeType="up"
                    percentage={summary.totalExpenses > 0 ? 100 : 0}
                    color="#f43f5e"
                    icon={Wallet}
                />
                <StatCard
                    title="Net Profit"
                    value={`PKR ${summary.netProfit?.toLocaleString() ?? '0'}`}
                    change="Auto"
                    changeType={summary.netProfit >= 0 ? 'up' : 'down'}
                    percentage={summary.netProfit > 0 ? 100 : 0}
                    color="#6366f1"
                    icon={UserPlus}
                />
            </div>

            {/* Main Content Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Overview Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl p-8 border border-slate-200 shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-sm font-bold text-black uppercase tracking-tight">Sales & Profit Trends</h2>
                            <p className="text-[10px] font-bold text-black uppercase tracking-widest mt-1">Income vs profitability over time</p>
                        </div>
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                <span className="text-[10px] font-bold text-black uppercase tracking-widest">Total Sales</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-[10px] font-bold text-black uppercase tracking-widest">Net Profit</span>
                            </div>
                        </div>
                    </div>
                    {loading ? (
                        <div className="h-[300px] flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">Generating Chart...</div>
                    ) : (
                        <PerformanceChart data={summary.recentDays || []} />
                    )}
                </div>

                {/* Top Moving Items */}
                <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-sm font-bold text-black uppercase tracking-tight mb-8">Top Moving Items</h2>
                        <div className="space-y-7">
                            {(!summary.topProducts || summary.topProducts.length === 0) ? (
                                <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                                    No sales data <br /> recorded yet
                                </div>
                            ) : summary.topProducts.map((item, i) => {
                                // Calculate simple percentage against the top item for visual bars
                                const maxQty = summary.topProducts[0]?.qtySold || 1;
                                const percentage = Math.round((item.qtySold / maxQty) * 100);

                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 w-5 h-5 flex items-center justify-center rounded-sm">
                                                    {i + 1}
                                                </span>
                                                <p className="text-[10px] font-bold text-black uppercase tracking-tight truncate max-w-[120px]">
                                                    {item.name}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {item.qtySold} Units
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Low Stock Quick Alert */}
                        {summary.lowStockCount > 0 && (
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <div className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Low Stock Alert</span>
                                    </div>
                                    <span className="text-[10px] font-black text-rose-700">{summary.lowStockCount} Items</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-black uppercase tracking-tight">Latest Sales Activity</h2>
                    <p className="text-[10px] font-bold text-black uppercase tracking-widest">Recent Invoices</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest border-b border-slate-100">Invoice ID</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest border-b border-slate-100">Customer</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest border-b border-slate-100">Post Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest border-b border-slate-100">Audit Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black uppercase tracking-widest border-b border-slate-100 text-right">Debit Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Loading transactions...</td></tr>
                            ) : (recentSales?.length ?? 0) === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No transactions found</td></tr>
                            ) : recentSales?.map((sale, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-xs font-bold text-black uppercase tracking-tight">INV-{sale.id?.toString().padStart(4, '0') || '0000'}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-black uppercase tracking-tight">{sale.customer?.name || 'Walk-in Customer'}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-black tracking-tight">{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tight border bg-emerald-50 text-emerald-600 border-emerald-100">
                                            Completed
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-xs font-medium text-black tracking-tight">PKR {sale.totalAmount?.toLocaleString() ?? '0'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

