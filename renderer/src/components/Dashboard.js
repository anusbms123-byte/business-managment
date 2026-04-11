import React, { useState, useEffect } from 'react';
import { MoreVertical, TrendingUp, FolderKanban, Wallet, UserPlus, RotateCcw } from 'lucide-react';
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
    const radius = 17;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <svg className="w-12 h-12 transform -rotate-90">
            <circle cx="24" cy="24" r={radius} fill="none" stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} strokeWidth="2.5" />
            <circle
                cx="24" cy="24" r={radius}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
            />
        </svg>
    );
};

// Stat Card Component
const StatCard = ({ title, value, change, changeType, percentage, color, icon: Icon }) => (
    <div className="group bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[24px] p-5 md:p-6 border border-slate-100/50 dark:border-slate-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-1 duration-500">
        <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-1 md:space-y-1.5">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-[0.15em] truncate">{title}</p>
                <div className="flex flex-col">
                    <p className="text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate leading-tight">{value}</p>
                    <div className="mt-3 md:mt-4 flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${changeType === 'up' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                            {changeType === 'up' ? '↑' : '↓'} {change}%
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-tighter whitespace-nowrap opacity-60">vs last week</span>
                    </div>
                </div>
            </div>
            <div className="relative flex items-center justify-center shrink-0">
                <div className="absolute inset-x-0 inset-y-0 bg-slate-100 dark:bg-slate-800 rounded-full scale-[0.85] opacity-20"></div>
                <CircularProgress percentage={percentage} color={color} />
                <div className="absolute inset-0 flex items-center justify-center">
                    {Icon && <Icon size={18} className="transition-transform group-hover:scale-110 duration-500" style={{ color }} />}
                </div>
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
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }}
                        interval={data.length > 10 ? Math.floor(data.length / 6) : 0}
                        tickFormatter={(str) => {
                            try {
                                const d = new Date(str);
                                const isWeek = data.length <= 7;
                                return isWeek 
                                    ? d.toLocaleDateString(undefined, { weekday: 'short' })
                                    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
                        dataKey="profit"
                        name="Profit"
                        stroke="#10b981"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorProfit)"
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="sales"
                        name="Sales"
                        stroke="#f97316"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorSales)"
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="returns"
                        name="Sales Returns"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorReturns)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

const Dashboard = ({ currentUser }) => {
    const [summary, setSummary] = useState({ totalSales: 0, totalPurchases: 0, totalExpenses: 0, netProfit: 0, totalSalesReturns: 0, recentDays: [] });
    const [recentSales, setRecentSales] = useState([]);
    const [topCustomers, setTopCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Weekly');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        loadDashboardData();
    }, [currentUser, filter, dateRange]);

    const loadDashboardData = async () => {
        if (!currentUser?.company_id) return;
        setLoading(true);
        try {
            // Fetch multiple data points in parallel
            const [reportData, salesData, customersData] = await Promise.all([
                window.electronAPI.getReportSummary({ 
                    companyId: currentUser.company_id, 
                    period: filter,
                    startDate: dateRange.start,
                    endDate: dateRange.end
                }),
                window.electronAPI.getSales(currentUser.company_id),
                window.electronAPI.getCustomers(currentUser.company_id)
            ]);

            const summaryData = (reportData && reportData.success !== false) ? reportData : { totalSales: 0, totalPurchases: 0, totalExpenses: 0, netProfit: 0, totalSalesReturns: 0, recentDays: [] };
            setSummary(summaryData);
            setRecentSales(Array.isArray(salesData) ? salesData.slice(0, 5) : []);
            setTopCustomers(Array.isArray(customersData) ? customersData.slice(0, 4) : []);

            if (reportData?.success === false) console.error("Report Error:", reportData.message);
            if (salesData?.success === false) console.error("Sales Error:", salesData.message);
            if (customersData?.success === false) console.error("Customer Error:", customersData.message);

        } catch (err) {
            console.error('Error loading dashboard:', err);
            setSummary({ totalSales: 0, totalPurchases: 0, totalExpenses: 0, netProfit: 0, totalSalesReturns: 0, recentDays: [] });
            setRecentSales([]);
            setTopCustomers([]);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-4 font-sans">
            <div>
                <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Dashboard Overview</h1>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Real-time business analytics</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {/* Advanced Quick Filters */}
                <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-1.5 rounded-[18px] shadow-sm border border-slate-200/50 dark:border-slate-800/50 overflow-x-auto no-scrollbar">
                    {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((p) => (
                        <button
                            key={p}
                            onClick={() => {
                                setFilter(p);
                                setDateRange({ start: '', end: '' });
                            }}
                            className={`px-6 py-2.5 rounded-[14px] text-[10px] md:text-[11px] font-semibold uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${filter === p && !dateRange.start ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 scale-[1.02]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* Date Picker Group */}
                <div className="grid grid-cols-2 sm:flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-1.5 rounded-[18px] shadow-sm border border-slate-200/50 dark:border-slate-800/50">
                    <div className="flex flex-col px-3 gap-0.5">
                        <span className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest">From date</span>
                        <input 
                            type="date" 
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="bg-transparent text-[10px] font-semibold text-slate-700 dark:text-slate-200 outline-none w-full sm:w-[110px]"
                        />
                    </div>
                    <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-800"></div>
                    <div className="flex flex-col px-3 gap-0.5">
                        <span className="text-[7px] font-semibold text-slate-400 uppercase tracking-widest">To date</span>
                        <input 
                            type="date" 
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="bg-transparent text-[10px] font-semibold text-slate-700 dark:text-slate-200 outline-none w-full sm:w-[110px]"
                        />
                    </div>
                </div>
            </div>
        </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
                <StatCard
                    title="Total Sales"
                    value={`PKR ${summary.totalSales?.toLocaleString() ?? '0'}`}
                    change="Auto"
                    changeType="up"
                    percentage={summary.totalSales > 0 ? 100 : 0}
                    color="#10b981"
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
                    color="#845EF7"
                    icon={Wallet}
                />
                <StatCard
                    title="Sales Return"
                    value={`PKR ${summary.totalSalesReturns?.toLocaleString() ?? '0'}`}
                    change="Auto"
                    changeType="down"
                    percentage={summary.totalSalesReturns > 0 ? 100 : 0}
                    color="#FF6B6B"
                    icon={RotateCcw}
                />
                <StatCard
                    title="Net Profit"
                    value={`PKR ${summary.netProfit?.toLocaleString() ?? '0'}`}
                    change="Auto"
                    changeType={summary.netProfit >= 0 ? 'up' : 'down'}
                    percentage={summary.netProfit > 0 ? 100 : 0}
                    color={summary.netProfit >= 0 ? "#10b981" : "#FF6B6B"}
                    icon={TrendingUp}
                />
            </div>

            {/* Main Content Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Overview Chart */}
                <div className="lg:col-span-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[32px] p-6 md:p-8 border border-slate-100/50 dark:border-slate-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter">Sales & Profit</h2>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Performance over time</p>
                        </div>
                        <div className="grid grid-cols-3 sm:flex items-center gap-3 sm:gap-6">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sales</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Profit</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Returns</span>
                            </div>
                        </div>
                    </div>
                    {loading ? (
                        <div className="h-[350px] flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">Loading...</div>
                    ) : (
                        <PerformanceChart data={summary.recentDays || []} />
                    )}
                </div>

                {/* Best Selling Section */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[32px] p-6 md:p-8 border border-slate-100/50 dark:border-slate-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-colors duration-300">
                    <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em] mb-8">Best Selling</h2>
                    <div className="space-y-7">
                        {(!summary.topProducts || summary.topProducts.length === 0) ? (
                            <div className="text-center py-10 text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                No sales data <br /> recorded yet
                            </div>
                        ) : summary.topProducts.map((item, i) => {
                            const maxQty = summary.topProducts[0]?.qtySold || 1;
                            const percentage = Math.round((item.qtySold / maxQty) * 100);

                            return (
                                <div key={i} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 w-5 h-5 flex items-center justify-center rounded-sm">
                                                {i + 1}
                                            </span>
                                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight truncate max-w-[120px]">
                                                {item.name}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                            {item.qtySold} Units
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Recent Sales Table */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[32px] border border-slate-100/50 dark:border-slate-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden transition-colors duration-300">
                <div className="p-6 md:p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em]">Recent Sales</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latest Invoices</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800">
                                <th className="px-8 py-4 text-[11px] font-bold text-black dark:text-white uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">Invoice ID</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-black dark:text-white uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">Customer</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-black dark:text-white uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">Items</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-black dark:text-white uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">Method</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-black dark:text-white uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">Status</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-black dark:text-white uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan="5" className="px-8 py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Loading...</td></tr>
                            ) : (recentSales?.length ?? 0) === 0 ? (
                                <tr><td colSpan="5" className="px-8 py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No records found</td></tr>
                            ) : recentSales?.map((sale, i) => (
                                <tr key={i} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors group">
                                    <td className="px-8 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase">INV-{sale.id?.toString().padStart(4, '0') || '0000'}</span>
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-0.5">{sale.date ? new Date(sale.date).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 font-bold text-[10px]">
                                                {sale.customer?.name?.charAt(0).toUpperCase() || 'W'}
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{sale.customer?.name || 'Walk-in Customer'}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-md">
                                            {sale.totalItems || 1} Products
                                        </span>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center space-x-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${sale.paymentMethod?.toLowerCase() === 'cash' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{sale.paymentMethod || 'Cash'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                                            (['PAID', 'RECEIVED', 'SUCCESS'].includes(sale.paymentStatus)) 
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50' 
                                            : sale.paymentStatus === 'PARTIAL'
                                            ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50'
                                            : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50'
                                        }`}>
                                            <div className={`w-1 h-1 rounded-full mr-1.5 ${
                                                (['PAID', 'RECEIVED', 'SUCCESS'].includes(sale.paymentStatus)) ? 'bg-emerald-500' :
                                                sale.paymentStatus === 'PARTIAL' ? 'bg-amber-500' : 'bg-rose-500'
                                            }`}></div>
                                            {(['PAID', 'RECEIVED', 'SUCCESS'].includes(sale.paymentStatus)) ? 'Finished' : 
                                             sale.paymentStatus === 'PARTIAL' ? 'Partial' : 'Pending'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <span className="text-[12px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter">PKR {(sale.grandTotal || sale.totalAmount)?.toLocaleString() ?? '0'}</span>
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

export default Dashboard;

