import React, { useState, useEffect } from 'react';
import { MoreVertical, TrendingUp, FolderKanban, Wallet, UserPlus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Defs,
    LinearGradient,
    ReferenceLine
} from 'recharts';

// Circular Progress Component
const CircularProgress = ({ percentage, color }) => {
    const { isDarkMode } = useTheme();
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <svg className="w-10 h-10 transform -rotate-90">
            <circle cx="20" cy="20" r={radius} fill="none" stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} strokeWidth="3" />
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
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border-l-4 border-slate-200 dark:border-slate-800 border-y border-r border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group transition-colors duration-300" style={{ borderLeftColor: color }}>
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                    {Icon && <Icon size={14} className="text-black dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />}
                    <p className="text-[10px] text-black dark:text-slate-400 font-bold uppercase tracking-widest">{title}</p>
                </div>
                <p className="text-xl font-medium text-black dark:text-slate-200">{value}</p>
                <div className="mt-3 flex items-center space-x-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${changeType === 'up' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800'}`}>
                        {changeType === 'up' ? '↑' : '↓'} {change}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight">Recent Trend</span>
                </div>
            </div>
            <div className="relative flex items-center justify-center ml-4">
                <CircularProgress percentage={percentage} color={color} />
                <span className="absolute text-[10px] font-black text-black dark:text-slate-200">{percentage}%</span>
            </div>
        </div>
    </div>
);

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-xl p-4 border border-slate-100 dark:border-slate-800 min-w-[160px] animate-in fade-in zoom-in duration-200">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2.5 font-bold uppercase tracking-widest">{label}</p>
                <div className="space-y-2.5">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-6">
                            <div className="flex items-center space-x-2">
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }}></div>
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">{entry.name}</span>
                            </div>
                            <span className="text-[11px] font-black text-slate-900 dark:text-slate-200 leading-none">PKR {entry.value?.toLocaleString()}</span>
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
// Modern Analytics Chart Component
const PerformanceChart = ({ data }) => {
    const { isDarkMode } = useTheme();
    const gridColor = isDarkMode ? "#1e293b" : "#f1f5f9";
    const tickColor = isDarkMode ? "#94a3b8" : "#64748b";
    const referenceColor = isDarkMode ? "#334155" : "#cbd5e1";

    return (
        <div style={{ width: '100%', height: 350 }} className="mt-4">
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }}
                        tickFormatter={(str) => {
                            try {
                                const d = new Date(str);
                                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            } catch (e) { return str; }
                        }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }}
                        tickFormatter={(value) => {
                            if (value === 0) return '0';
                            const abs = Math.abs(value);
                            const sign = value < 0 ? '-' : '';
                            if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1)}M`;
                            if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(0)}k`;
                            return `${sign}${abs}`;
                        }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke={referenceColor} strokeWidth={2} strokeDasharray="3 3" />

                    <Area
                        type="monotone"
                        dataKey="sales"
                        name="Total Sales"
                        stroke="#2563eb"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorSales)"
                        dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="profit"
                        name="Net Profit"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorProfit)"
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                </AreaChart>
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
                </div>
                <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-800 w-fit">
                    {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setFilter(p)}
                            className={`px-5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${filter === p ? 'bg-blue-950 dark:bg-blue-600 text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
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
                    title="Total Expenses"
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
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-sm font-bold text-black dark:text-slate-200 uppercase tracking-tight">Sales & Profit</h2>
                            <p className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest mt-1">Movement over time</p>
                        </div>
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                <span className="text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-widest">Total Sales</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-widest">Net Profit</span>
                            </div>
                        </div>
                    </div>
                    {loading ? (
                        <div className="h-[300px] flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">Loading...</div>
                    ) : (
                        <PerformanceChart data={summary.recentDays || []} />
                    )}
                </div>

                {/* Top Moving Items */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors duration-300">
                    <div className="relative z-10">
                        <h2 className="text-sm font-bold text-black dark:text-slate-200 uppercase tracking-tight mb-8">Best Selling</h2>
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
                                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 w-5 h-5 flex items-center justify-center rounded-sm">
                                                    {i + 1}
                                                </span>
                                                <p className="text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-tight truncate max-w-[120px]">
                                                    {item.name}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                {item.qtySold} Units
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Low Stock Quick Alert */}
                        {summary.lowStockCount > 0 && (
                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-800">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                                        <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Low Stock Alert</span>
                                    </div>
                                    <span className="text-[10px] font-black text-rose-700 dark:text-rose-300">{summary.lowStockCount} Low</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-black dark:text-slate-200 uppercase tracking-tight">Recent Sales</h2>
                    <p className="text-[10px] font-bold text-black dark:text-slate-400 uppercase tracking-widest">Latest Invoices</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/80 dark:bg-slate-800/80">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Invoice ID</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Customer</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Loading...</td></tr>
                            ) : (recentSales?.length ?? 0) === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No records found</td></tr>
                            ) : recentSales?.map((sale, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 text-xs font-bold text-black dark:text-slate-300 uppercase tracking-tight">INV-{sale.id?.toString().padStart(4, '0') || '0000'}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-black dark:text-slate-300 uppercase tracking-tight">{sale.customer?.name || 'Walk-in Customer'}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-black dark:text-slate-300 tracking-tight">{sale.date ? new Date(sale.date).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tight border ${sale.paymentStatus === 'PAID' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800'}`}>
                                            {sale.paymentStatus || 'Completed'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-xs font-medium text-black dark:text-slate-300 tracking-tight">PKR {(sale.grandTotal || sale.totalAmount)?.toLocaleString() ?? '0'}</td>
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

