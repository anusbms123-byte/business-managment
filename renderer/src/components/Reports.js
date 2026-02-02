import React, { useState, useEffect } from 'react';
import {
    BarChart2, ShoppingCart, Package,
    Users, Factory, RefreshCw,
    DollarSign, TrendingUp, RotateCcw,
    Users2, CreditCard
} from 'lucide-react';

const ReportCard = ({ title, value, subValue, icon: Icon, onClick, colorClass }) => (
    <div
        onClick={onClick}
        className={`bg-white border border-slate-200 border-l-4 ${colorClass} rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group`}
    >
        <div className="flex items-start justify-between mb-4">
            <div className={`p-2.5 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors`}>
                <Icon size={20} />
            </div>
        </div>
        <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{value}</h3>
            {subValue && (
                <p className="text-[10px] text-slate-500 font-medium mt-2 flex items-center gap-1.5 uppercase tracking-tight">
                    {subValue}
                </p>
            )}
        </div>
    </div>
);

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
        totalReturns: 0,
        totalSalaries: 0,
        employeeCount: 0,
        salesCount: 0,
        purchaseCount: 0,
        expenseCount: 0,
        returnCount: 0
    });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Monthly');
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

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Analytical Reports</h1>
                    <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Data Overview & Visualizations</p>
                        <div className="flex items-center gap-1.5 text-slate-300">
                            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight italic">Updated: {lastUpdated}</span>
                        </div>
                    </div>
                </div>

                <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-200">
                    {['Weekly', 'Monthly', 'Yearly'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setFilter(p)}
                            className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filter === p ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </header>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ReportCard
                    title="Sales"
                    value={`PKR ${summary.totalSales?.toLocaleString() ?? '0'}`}
                    subValue={`${summary.salesCount ?? 0} Invoices generated`}
                    icon={DollarSign}
                    colorClass="border-l-blue-500"
                />
                <ReportCard
                    title="Purchases"
                    value={`PKR ${summary.totalPurchases?.toLocaleString() ?? '0'}`}
                    subValue={`${summary.purchaseCount ?? 0} Bills logged`}
                    icon={ShoppingCart}
                    colorClass="border-l-amber-500"
                />
                <ReportCard
                    title="Inventory"
                    value={`PKR ${summary.inventoryValuationCost?.toLocaleString() ?? '0'}`}
                    subValue={`${summary.lowStockCount ?? 0} Low stock SKU alerts`}
                    icon={Package}
                    colorClass="border-l-indigo-500"
                />
                <ReportCard
                    title="Expenses"
                    value={`PKR ${summary.totalExpenses?.toLocaleString() ?? '0'}`}
                    subValue={`${summary.expenseCount ?? 0} Expense entries`}
                    icon={TrendingUp}
                    colorClass="border-l-rose-500"
                />
                <ReportCard
                    title="Returns"
                    value={`PKR ${summary.totalReturns?.toLocaleString() ?? '0'}`}
                    subValue={`${summary.returnCount ?? 0} Return transactions`}
                    icon={RotateCcw}
                    colorClass="border-l-orange-500"
                />
                <ReportCard
                    title="Suppliers"
                    value={`PKR ${summary.totalPayables?.toLocaleString() ?? '0'}`}
                    subValue="Total current liabilities"
                    icon={Factory}
                    colorClass="border-l-slate-600"
                />
                <ReportCard
                    title="HRM"
                    value={`PKR ${summary.totalSalaries?.toLocaleString() ?? '0'}`}
                    subValue={`${summary.employeeCount ?? 0} Active staff members`}
                    icon={Users2}
                    colorClass="border-l-emerald-500"
                />
                <ReportCard
                    title="Net Profit"
                    value={`PKR ${summary.netProfit?.toLocaleString() ?? '0'}`}
                    subValue="Profit after COGS & Expenses"
                    icon={CreditCard}
                    colorClass="border-l-blue-900"
                />
            </div>

            {/* Additional Info / Empty State */}
            <div className="p-12 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <BarChart2 size={32} />
                </div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Enhanced Charts Coming Soon</h3>
                <p className="text-xs text-slate-300 mt-1 uppercase tracking-tight italic">Detailed specific module analysis can be accessed via sidebar main modules</p>
            </div>
        </div>
    );
};

export default Reports;
