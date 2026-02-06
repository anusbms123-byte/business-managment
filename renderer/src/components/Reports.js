import React, { useState, useEffect } from 'react';
import {
    BarChart2, ShoppingCart, Package,
    Users, Factory, RefreshCw,
    DollarSign, TrendingUp, RotateCcw,
    Users2, CreditCard, ArrowLeft,
    Calendar, Download, ChevronRight,
    TrendingDown, Activity, Layers,
    Briefcase, AlertTriangle, CheckCircle2, Clock, Trash2, X,
    Zap, Coffee, Home, Truck, FileText
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
            <h3 className="text-xl font-medium text-black tracking-tight">{value}</h3>
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
            <p className="text-sm font-medium text-black tracking-tight">{value}</p>
        </div>
    </div>
);

const Reports = ({ currentUser }) => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeModule, setActiveModule] = useState(null); // 'sales', 'purchases', etc.
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('all');
    const [selectedVendor, setSelectedVendor] = useState('all');
    const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
    // Inventory Filters
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');
    const [selectedStockStatus, setSelectedStockStatus] = useState('all'); // all, low, out, expired
    // Expense Filters
    const [selectedExpenseCategory, setSelectedExpenseCategory] = useState('all');
    const expenseCategories = ['Bills', 'Snacks', 'Rent', 'Transport', 'Staff Payroll', 'General'];
    // Returns Filters
    const [selectedReturnType, setSelectedReturnType] = useState('all'); // all, sales, purchases
    // Track previous activeModule to clear filters when switching
    const [prevActiveModule, setPrevActiveModule] = useState(null);

    // Date Filtering
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA'); // YYYY-MM-DD
    const today = now.toLocaleDateString('en-CA');
    const [dateRange, setDateRange] = useState({ start: firstDayOfMonth, end: today });
    const [overviewFilter, setOverviewFilter] = useState('All'); // For Dashboard

    useEffect(() => {
        loadCustomers();
        loadVendors();
        loadCategories();
    }, [currentUser]);

    useEffect(() => {
        // Reset filters when switching modules, but not on initial load if just switching for first time
        if (activeModule !== prevActiveModule) {
            setSelectedCustomer('all');
            setSelectedVendor('all');
            setSelectedPaymentStatus('all');
            setSelectedCategoryId('all');
            setSelectedStockStatus('all');
            setSelectedExpenseCategory('all');
            setSelectedReturnType('all');
            setPrevActiveModule(activeModule);
        }
    }, [activeModule, prevActiveModule]);

    useEffect(() => {
        if (activeModule) {
            loadDetailedReport();
        } else {
            loadDashboardReport();
        }
    }, [currentUser, overviewFilter, activeModule, selectedCustomer, selectedVendor, selectedPaymentStatus, selectedCategoryId, selectedStockStatus, selectedExpenseCategory, selectedReturnType]);

    const loadVendors = async () => {
        if (!currentUser?.company_id) return;
        try {
            const data = await window.electronAPI.getVendors(currentUser.company_id);
            setVendors(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading vendors:', err);
        }
    };
    const [vendors, setVendors] = useState([]);

    const loadCategories = async () => {
        if (!currentUser?.company_id) return;
        try {
            const data = await window.electronAPI.getCategories(currentUser.company_id);
            setCategories(data || []);
        } catch (err) {
            console.error('Error loading categories:', err);
        }
    };

    const loadCustomers = async () => {
        if (!currentUser?.company_id) return;
        try {
            const data = await window.electronAPI.getCustomers(currentUser.company_id);
            setCustomers(data || []);
        } catch (err) {
            console.error('Error loading customers:', err);
        }
    };

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
            } else if (overviewFilter === 'Yearly') {
                start = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
                end = new Date().toISOString();
            } else {
                // All Time
                start = new Date(0).toISOString(); // 1970-01-01
                end = new Date().toISOString();
            }

            const data = await window.electronAPI.getReportSummary({
                companyId: currentUser.company_id,
                startDate: start,
                endDate: end,
                customerId: activeModule === 'sales' ? selectedCustomer : undefined,
                paymentStatus: activeModule === 'sales' ? selectedPaymentStatus : undefined
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
                endDate: new Date(dateRange.end + 'T23:59:59').toISOString(),
                customerId: activeModule === 'sales' ? selectedCustomer : undefined,
                vendorId: activeModule === 'purchases' ? selectedVendor : undefined,
                paymentStatus: (activeModule === 'sales' || activeModule === 'purchases') ? selectedPaymentStatus : undefined,
                categoryId: activeModule === 'inventory' ? selectedCategoryId : undefined,
                stockStatus: activeModule === 'inventory' ? selectedStockStatus : undefined,
                expenseCategory: activeModule === 'expenses' ? selectedExpenseCategory : undefined,
                returnType: activeModule === 'returns' ? selectedReturnType : undefined
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
        setOverviewFilter('All');
        setSelectedCustomer('all');
        setSelectedVendor('all');
        setSelectedPaymentStatus('all');
        setSelectedCategoryId('all');
        setSelectedStockStatus('all');
        setPrevActiveModule(null);
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
                    {['Daily', 'Weekly', 'Monthly', 'Yearly', 'All'].map((p) => (
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
                    { label: 'Total Revenue', value: `PKR ${(summary?.totalSales || 0).toLocaleString()}`, icon: DollarSign, color: 'text-blue-600' },
                    { label: 'Cost of Items', value: `PKR ${(summary?.totalCOGS || 0).toLocaleString()}`, icon: ShoppingCart, color: 'text-orange-500' },
                    { label: 'Gross Profit', value: `PKR ${((summary?.totalSales || 0) - (summary?.totalCOGS || 0)).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' },
                    { label: 'Total Invoices', value: `${summary?.salesCount || 0} Orders`, icon: Layers, color: 'text-indigo-500' },
                    { label: 'Avg Order Value', value: `PKR ${(Math.round(summary?.totalSales / (summary?.salesCount || 1)) || 0).toLocaleString()}`, icon: Activity, color: 'text-slate-500' }
                ],
                tableCols: ['Date', 'Invoice', 'Customer', 'Products', 'Items', 'Total', 'Status'],
                tableTitle: 'Sales Ledger',
                cols: 5
            },
            purchases: {
                title: 'Purchase Log', icon: ShoppingCart, color: '#f59e0b', dataKey: 'purchases',
                miniStats: [
                    { label: 'Total Purchases', value: `PKR ${(summary?.totalPurchases || 0).toLocaleString()}`, icon: CreditCard, color: 'text-amber-600' },
                    { label: 'Pending Bills', value: `PKR ${(summary?.totalPayables || 0).toLocaleString()}`, icon: AlertTriangle, color: 'text-rose-500' },
                    { label: 'Avg Bill Size', value: `PKR ${(Math.round(summary?.totalPurchases / (summary?.purchaseCount || 1)) || 0).toLocaleString()}`, icon: Activity, color: 'text-blue-500' },
                    { label: 'Total Bills', value: `${summary?.purchaseCount || 0} Logged`, icon: Layers, color: 'text-orange-500' },
                    { label: 'Active Vendors', value: `${summary?.vendorCount || 0} Suppliers`, icon: Users, color: 'text-indigo-500' },
                    { label: 'Stock Value (In)', value: `PKR ${(summary?.inventoryValuationCost || 0).toLocaleString()}`, icon: Package, color: 'text-emerald-500' }
                ],
                tableCols: ['Date', 'Invoice', 'Vendor', 'Products', 'Items', 'Total', 'Status'],
                tableTitle: 'Purchase Log',
                cols: 3
            },
            inventory: {
                title: 'Stock Valuation', icon: Package, color: '#6366f1', dataKey: 'inventory',
                miniStats: [
                    { label: 'Stock Value (Cost)', value: `PKR ${(summary?.inventoryValuationCost || 0).toLocaleString()}`, icon: DollarSign, color: 'text-blue-600' },
                    { label: 'Sale Potential (Sell)', value: `PKR ${(summary?.inventoryValuationSell || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' },
                    { label: 'Expected Profit', value: `PKR ${((summary?.inventoryValuationSell || 0) - (summary?.inventoryValuationCost || 0)).toLocaleString()}`, icon: Briefcase, color: 'text-indigo-600' },
                    { label: 'In Stock', value: `${summary?.inStockCount || 0} Items`, icon: CheckCircle2, color: 'text-emerald-500' },
                    { label: 'Low Stock', value: `${summary?.lowStockCount || 0} Items`, icon: AlertTriangle, color: 'text-orange-500' },
                    { label: 'Expiring Soon', value: `${summary?.expiringSoonCount || 0} Items`, icon: Clock, color: 'text-amber-500' },
                    { label: 'Expired Products', value: `${summary?.expiredCount || 0} Items`, icon: Trash2, color: 'text-rose-600' }
                ],
                tableCols: ['Product Name', 'Category', 'Stock Qty', 'Unit Cost', 'Total Value', 'Status'],
                tableTitle: 'Inventory Audit',
                cols: 7
            },
            expenses: {
                title: 'Expense Audit', icon: TrendingUp, color: '#f43f5e', dataKey: 'expenses',
                miniStats: [
                    { label: 'Staff Payroll', value: `PKR ${(summary?.totalSalaries || 0).toLocaleString()}`, icon: Users2, color: 'text-indigo-500' },
                    { label: 'Bills', value: `PKR ${(summary?.expenseCategoryBreakdown?.['Bills'] || summary?.expenseCategoryBreakdown?.['Electricity'] || 0).toLocaleString()}`, icon: Zap, color: 'text-amber-500' },
                    { label: 'Snacks & Tea', value: `PKR ${(summary?.expenseCategoryBreakdown?.['Snacks'] || 0).toLocaleString()}`, icon: Coffee, color: 'text-orange-500' },
                    { label: 'Rent', value: `PKR ${(summary?.expenseCategoryBreakdown?.['Rent'] || 0).toLocaleString()}`, icon: Home, color: 'text-blue-500' },
                    { label: 'Transport', value: `PKR ${(summary?.expenseCategoryBreakdown?.['Transport'] || 0).toLocaleString()}`, icon: Truck, color: 'text-emerald-500' },
                    { label: 'General', value: `PKR ${(summary?.expenseCategoryBreakdown?.['General'] || 0).toLocaleString()}`, icon: FileText, color: 'text-slate-500' }
                ],
                tableCols: selectedExpenseCategory === 'Staff Payroll'
                    ? ['Date', 'Staff Name', 'Designation', 'Basic Pay', 'Bonus/OT', 'Deduction', 'Net Paid']
                    : ['Date', 'Title', 'Category', 'Description', 'Amount'],
                tableTitle: selectedExpenseCategory === 'Staff Payroll' ? 'Staff Payroll Audit' : 'Expense Journal',
                cols: 3
            },
            returns: {
                title: 'Return History', icon: RotateCcw, color: '#f97316', dataKey: 'returns',
                miniStats: [
                    { label: 'Total Refunds', value: `PKR ${(summary?.totalReturns || 0).toLocaleString()}`, icon: DollarSign, color: 'text-orange-600' },
                    { label: 'Sale Returns', value: `PKR ${(summary?.totalSalesReturns || 0).toLocaleString()}`, icon: TrendingDown, color: 'text-rose-500' },
                    { label: 'Purchase Returns', value: `PKR ${(summary?.totalPurchaseReturns || 0).toLocaleString()}`, icon: ShoppingCart, color: 'text-blue-500' },
                    { label: 'Return Count', value: `${summary?.returnCount || 0} Records`, icon: RefreshCw, color: 'text-indigo-500' }
                ],
                tableCols: ['Date', 'Type', 'Invoice #', 'Party Name', 'Returned Products', 'Refund Magnitude'],
                tableTitle: 'Returns Ledger',
                cols: 4
            },
            suppliers: {
                title: 'Supplier Accounts', icon: Factory, color: '#475569', dataKey: 'payables',
                miniStats: [
                    { label: 'Total Payables', value: `PKR ${(summary?.totalPayables || 0).toLocaleString()}`, icon: CreditCard, color: 'text-rose-600' },
                    { label: 'Supplier Count', value: `${summary?.vendorCount || 0} Partners`, icon: Users, color: 'text-blue-500' },
                    { label: 'Avg Payable', value: `PKR ${(Math.round(summary?.totalPayables / (summary?.vendorCount || 1)) || 0).toLocaleString()}`, icon: Activity, color: 'text-slate-500' },
                    { label: 'Total Purchased', value: `PKR ${(summary?.totalPurchases || 0).toLocaleString()}`, icon: ShoppingCart, color: 'text-amber-600' },
                    { label: 'Active Balance', value: summary?.totalPayables > 0 ? "Pending" : "Clear", icon: AlertTriangle, color: 'text-amber-500' }
                ],
                tableCols: ['Snapshot Date', 'Account Head', 'Balance Owed'],
                cols: 5
            },
            hrm: {
                title: 'Payroll Summary', icon: Users2, color: '#10b981', dataKey: 'salaries',
                miniStats: [
                    { label: 'Total Payroll', value: `PKR ${(summary?.totalSalaries || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600' },
                    { label: 'Staff Count', value: `${summary?.employeeCount || 0} Employees`, icon: Users, color: 'text-blue-500' },
                    { label: 'Avg Salary', value: `PKR ${(Math.round(summary?.totalSalaries / (summary?.employeeCount || 1)) || 0).toLocaleString()}`, icon: Activity, color: 'text-slate-500' },
                    { label: 'Salary Status', value: 'Disbursed', icon: CheckCircle2, color: 'text-emerald-500' }
                ],
                tableCols: ['Disbursal Month', 'Headcount', 'Net Payroll'],
                cols: 4
            },
            netprofit: {
                title: 'Profitability Audit', icon: CreditCard, color: '#0f172a', dataKey: 'profit',
                miniStats: [
                    { label: 'Total Revenue', value: `PKR ${(summary?.totalSales || 0).toLocaleString()}`, icon: DollarSign, color: 'text-blue-600' },
                    { label: 'COGS Sum', value: `PKR ${(summary?.totalCOGS || 0).toLocaleString()}`, icon: ShoppingCart, color: 'text-orange-500' },
                    { label: 'Gross Profit', value: `PKR ${((summary?.totalSales || 0) - (summary?.totalCOGS || 0)).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' },
                    { label: 'Operating Costs', value: `PKR ${((summary?.totalExpenses || 0) + (summary?.totalSalaries || 0)).toLocaleString()}`, icon: TrendingDown, color: 'text-rose-400' },
                    { label: 'Net Profit', value: `PKR ${(summary?.netProfit || 0).toLocaleString()}`, icon: Briefcase, color: summary?.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600' },
                    { label: 'Profit Margin', value: `${summary?.totalSales > 0 ? Math.round((summary?.netProfit / summary?.totalSales) * 100) : 0}%`, icon: Activity, color: 'text-indigo-500' }
                ],
                tableCols: ['Audit Date', 'Operational Delta', 'Net Bottom Line'],
                cols: 3
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
                                {activeModule === 'sales' && selectedCustomer !== 'all' && (
                                    <span className="text-[9px] font-bold bg-blue-100 text-blue-600 px-3 py-1 rounded-lg uppercase tracking-wider">
                                        {customers.find(c => c.id === selectedCustomer)?.name || 'Customer'}
                                    </span>
                                )}
                                {activeModule === 'sales' && selectedPaymentStatus !== 'all' && (
                                    <span className={`text-[9px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider ${selectedPaymentStatus === 'paid'
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : 'bg-orange-100 text-orange-600'
                                        }`}>
                                        {selectedPaymentStatus === 'paid' ? 'Paid' : 'Credit'}
                                    </span>
                                )}
                            </div>
                            <p className="text-black text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Deep Dive Report Analysis</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeModule === 'sales' && (
                            <>
                                <div className="flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded-2xl shadow-sm mr-2">
                                    <Users size={14} className="text-slate-400 ml-3" />
                                    <select
                                        value={selectedCustomer}
                                        onChange={(e) => setSelectedCustomer(e.target.value)}
                                        className="text-[10px] font-bold text-black outline-none uppercase bg-transparent px-2 py-1"
                                    >
                                        <option value="all">All Customers</option>
                                        {customers.map(customer => (
                                            <option key={customer.id} value={customer.id}>
                                                {customer.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded-2xl shadow-sm mr-2">
                                    <CreditCard size={14} className="text-slate-400 ml-3" />
                                    <select
                                        value={selectedPaymentStatus}
                                        onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                                        className="text-[10px] font-bold text-black outline-none uppercase bg-transparent px-2 py-1"
                                    >
                                        <option value="all">All Payments</option>
                                        <option value="paid">Paid</option>
                                        <option value="credit">Credit</option>
                                    </select>
                                </div>
                            </>
                        )}
                        {activeModule === 'purchases' && (
                            <>
                                <div className="flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded-2xl shadow-sm mr-2">
                                    <Factory size={14} className="text-slate-400 ml-3" />
                                    <select
                                        value={selectedVendor}
                                        onChange={(e) => setSelectedVendor(e.target.value)}
                                        className="text-[10px] font-bold text-black outline-none uppercase bg-transparent px-2 py-1"
                                    >
                                        <option value="all">All Vendors</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>
                                                {v.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded-2xl shadow-sm mr-2">
                                    <CreditCard size={14} className="text-slate-400 ml-3" />
                                    <select
                                        value={selectedPaymentStatus}
                                        onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                                        className="text-[10px] font-bold text-black outline-none uppercase bg-transparent px-2 py-1"
                                    >
                                        <option value="all">All Payments</option>
                                        <option value="paid">Paid</option>
                                        <option value="credit">Credit / Due</option>
                                    </select>
                                </div>
                            </>
                        )}
                        {activeModule === 'inventory' && (
                            <>
                                <div className="flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded-2xl shadow-sm mr-2">
                                    <Layers size={14} className="text-slate-400 ml-3" />
                                    <select
                                        value={selectedCategoryId}
                                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                                        className="text-[10px] font-bold text-black outline-none uppercase bg-transparent px-2 py-1"
                                    >
                                        <option value="all">All Categories</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded-2xl shadow-sm mr-2">
                                    <AlertTriangle size={14} className="text-slate-400 ml-3" />
                                    <select
                                        value={selectedStockStatus}
                                        onChange={(e) => setSelectedStockStatus(e.target.value)}
                                        className="text-[10px] font-bold text-black outline-none uppercase bg-transparent px-2 py-1"
                                    >
                                        <option value="all">Any Status</option>
                                        <option value="low">Low Stock</option>
                                        <option value="out">Out of Stock</option>
                                        <option value="expired">Expired</option>
                                    </select>
                                </div>
                            </>
                        )}
                        {activeModule === 'returns' && (
                            <div className="flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded-2xl shadow-sm mr-2">
                                <RotateCcw size={14} className="text-slate-400 ml-3" />
                                <select
                                    value={selectedReturnType}
                                    onChange={(e) => setSelectedReturnType(e.target.value)}
                                    className="text-[10px] font-bold text-black outline-none uppercase bg-transparent px-2 py-1"
                                >
                                    <option value="all">All Returns</option>
                                    <option value="sales">Sales Returns</option>
                                    <option value="purchases">Purchase Returns</option>
                                </select>
                            </div>
                        )}
                        {activeModule === 'expenses' && (
                            <div className="flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded-2xl shadow-sm mr-2">
                                <FileText size={14} className="text-slate-400 ml-3" />
                                <select
                                    value={selectedExpenseCategory}
                                    onChange={(e) => setSelectedExpenseCategory(e.target.value)}
                                    className="text-[10px] font-bold text-black outline-none uppercase bg-transparent px-2 py-1"
                                >
                                    <option value="all">All Expenses</option>
                                    {expenseCategories.map(cat => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

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
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar space-y-8">

                    {/* Sub-Metrics Row - Now at the Top */}
                    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${config.cols || config.miniStats.length} gap-4`}>
                        {config.miniStats.map((stat, idx) => (
                            <DetailMiniCard key={idx} {...stat} />
                        ))}
                    </div>

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

                        <div className="bg-white rounded-3xl p-8 text-black flex flex-col justify-between relative overflow-hidden shadow-sm border border-slate-100">
                            <div className="absolute top-0 right-0 p-10 opacity-5 text-slate-900"><config.icon size={120} /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">
                                    {activeModule === 'returns' ? 'Consolidated Refunds' : 'Consolidated Total'}
                                </p>
                                <h2 className="text-3xl font-medium mt-2 tracking-tighter text-black">
                                    PKR {(
                                        activeModule === 'returns'
                                            ? (selectedReturnType === 'sales' ? (summary?.totalSalesReturns || 0) : selectedReturnType === 'purchases' ? (summary?.totalPurchaseReturns || 0) : (summary?.totalReturns || 0))
                                            : (summary?.[`total${activeModule.charAt(0).toUpperCase() + activeModule.slice(1)}`] || summary?.[activeModule === 'hrm' ? 'totalSalaries' : activeModule === 'netprofit' ? 'netProfit' : 'totalSales'] || 0)
                                    ).toLocaleString()}
                                </h2>
                            </div>
                            <div className="space-y-4 relative z-10 pt-10">
                                {activeModule === 'sales' && selectedCustomer === 'all' ? (
                                    /* Top Customers View */
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Top Customers</span>
                                            <span className="text-[9px] font-bold text-slate-400">Total Spent</span>
                                        </div>
                                        <div className="space-y-2">
                                            {(summary?.topCustomers || []).slice(0, 3).map((c, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-orange-400 text-white'}`}>
                                                            {i + 1}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-black uppercase truncate max-w-[80px]">{c.name}</span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-600">PKR {c.totalSpent?.toLocaleString()}</span>
                                                </div>
                                            ))}
                                            {(!summary?.topCustomers || summary.topCustomers.length === 0) && (
                                                <p className="text-[9px] italic text-slate-400 text-center py-2">No customer data available</p>
                                            )}
                                        </div>
                                    </div>
                                ) : activeModule === 'sales' && selectedCustomer !== 'all' ? (
                                    /* Top Products View for Specific Customer */
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Top Products</span>
                                            <span className="text-[9px] font-bold text-slate-400">Qty</span>
                                        </div>
                                        <div className="space-y-2">
                                            {(summary?.topProducts || []).slice(0, 3).map((p, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-cyan-500' : 'bg-indigo-500'}`}>
                                                            {i + 1}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-black uppercase truncate max-w-[100px]">{p.name}</span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-600">{p.qtySold} Units</span>
                                                </div>
                                            ))}
                                            {(!summary?.topProducts || summary.topProducts.length === 0) && (
                                                <p className="text-[9px] italic text-slate-400 text-center py-2">No product data available</p>
                                            )}
                                        </div>
                                    </div>
                                ) : activeModule === 'purchases' ? (
                                    selectedVendor === 'all' ? (
                                        /* Top Vendors View */
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Top Vendors</span>
                                                <span className="text-[9px] font-bold text-slate-400">Total Spent</span>
                                            </div>
                                            <div className="space-y-2">
                                                {(summary?.topVendors || []).slice(0, 3).map((v, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-orange-400 text-white'}`}>
                                                                {i + 1}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-black uppercase truncate max-w-[80px]">{v.name}</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-600">PKR {v.totalSpent?.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                {(!summary?.topVendors || summary.topVendors.length === 0) && (
                                                    <p className="text-[9px] italic text-slate-400 text-center py-2">No vendor data available</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Top Purchased Products View */
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Top Items</span>
                                                <span className="text-[9px] font-bold text-slate-400">Qty</span>
                                            </div>
                                            <div className="space-y-2">
                                                {(summary?.topPurchasedProducts || []).slice(0, 3).map((p, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-cyan-500' : 'bg-indigo-500'}`}>
                                                                {i + 1}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-black uppercase truncate max-w-[100px]">{p.name}</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-600">{p.qtyBought} Units</span>
                                                    </div>
                                                ))}
                                                {(!summary?.topPurchasedProducts || summary.topPurchasedProducts.length === 0) && (
                                                    <p className="text-[9px] italic text-slate-400 text-center py-2">No product data available</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                ) : activeModule === 'inventory' ? (
                                    /* Top Valued Stock View */
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Top Valued Stock</span>
                                            <span className="text-[9px] font-bold text-slate-400">Asset Value</span>
                                        </div>
                                        <div className="space-y-2">
                                            {(summary?.topValuedItems || []).slice(0, 3).map((p, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-blue-500' : 'bg-slate-500'}`}>
                                                            {i + 1}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-black uppercase truncate max-w-[100px]">{p.name}</span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-emerald-600">PKR {((p.stockQty * p.costPrice) || 0).toLocaleString()}</span>
                                                </div>
                                            ))}
                                            {(!summary?.topValuedItems || summary.topValuedItems.length === 0) && (
                                                <p className="text-[9px] italic text-slate-400 text-center py-2">No inventory data available</p>
                                            )}
                                        </div>
                                    </div>
                                ) : activeModule === 'returns' ? (
                                    /* Returns Breakdown View */
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Refund Breakdown</span>
                                            <span className="text-[9px] font-bold text-slate-400">Total Logic</span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                                                    <span className="text-[10px] font-black text-black">SALES RETURNS</span>
                                                </div>
                                                <span className="text-xs font-bold text-rose-600">PKR {(summary?.totalSalesReturns || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                    <span className="text-[10px] font-black text-black">PURCHASE RETURNS</span>
                                                </div>
                                                <span className="text-xs font-bold text-blue-600">PKR {(summary?.totalPurchaseReturns || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-center px-1">
                                                <span className="text-[9px] font-bold text-slate-400 italic font-mono uppercase">Activity Frequency</span>
                                                <span className="text-[10px] font-black text-slate-700">{summary?.returnCount || 0} Transactions</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Default View */
                                    <>
                                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Volume</span>
                                            <span className="text-lg font-medium text-black">{summary?.[`${activeModule.replace('netprofit', 'sales')}Count`] || '0'} Logs</span>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-blue-600">Periodic Status</p>
                                            <p className="text-xs font-black mt-1 italic uppercase tracking-tighter text-blue-900">Verified & Processed</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* Data Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em] italic underline underline-offset-8">
                                {config.tableTitle || 'Insight Journal'}
                            </h3>
                            <span className="text-[9px] font-bold text-black">{config.tableTitle ? `Detailed ${config.tableTitle}` : 'Detailed periodic activity logs'}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        {config.tableCols.map((col, idx) => (
                                            <th key={idx} className={`px-8 py-4 text-[10px] font-black text-black uppercase tracking-widest 
                                                ${(col === 'Total' || col === 'Status' || col === 'Amount' || col === 'Net Paid' || col === 'Basic Pay' || col === 'Bonus/OT' || col === 'Deduction' || col === 'Refund Magnitude' || (activeModule !== 'expenses' && col === 'Amount')) ? 'text-right' : col === 'Items' ? 'text-center' : 'text-left'}`}>
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {((activeModule === 'sales' && summary?.detailedSales) || (activeModule === 'purchases' && summary?.detailedPurchases)) ? (
                                        (activeModule === 'sales' ? summary.detailedSales : summary.detailedPurchases).map((tx, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-8 py-5 text-xs font-bold text-black font-mono italic uppercase align-top">
                                                    {new Date(tx.date).toLocaleDateString('en-CA')}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-bold text-black uppercase align-top">
                                                    {tx.invoiceNo || '-'}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-bold text-black uppercase align-top">
                                                    {tx.customer?.name || tx.vendor?.name || (activeModule === 'sales' ? 'Walk-in' : 'Unknown')}
                                                </td>
                                                <td className="px-8 py-5 align-top">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase max-w-[200px] truncate block" title={tx.items?.map(item => item.product?.name || item.name).join(', ')}>
                                                        {tx.items?.map(item => item.product?.name || item.name).join(', ') || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-center align-top">
                                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-black uppercase">
                                                        {tx.items?.length || 0}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-medium text-black text-xs align-top">PKR {(tx.grandTotal || tx.totalAmount)?.toLocaleString()}</td>
                                                <td className="px-8 py-5 text-right align-top">
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wide ${tx.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                                                        }`}>
                                                        {tx.paymentStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : activeModule === 'inventory' && summary?.detailedInventory ? (
                                        summary.detailedInventory.map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-8 py-5 text-xs font-bold text-black font-mono italic uppercase align-top">
                                                    {item.name}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-bold text-black uppercase align-top">
                                                    {item.category?.name || '-'}
                                                </td>
                                                <td className="px-8 py-5 text-center align-top">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.stockQty <= (item.alertQty || 5) ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-black'}`}>
                                                        {item.stockQty}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-medium text-slate-500 text-xs align-top">PKR {(item.costPrice || 0).toLocaleString()}</td>
                                                <td className="px-8 py-5 text-right font-black text-black text-xs align-top">PKR {((item.stockQty * item.costPrice) || 0).toLocaleString()}</td>
                                                <td className="px-8 py-5 text-right align-top">
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wide ${item.stockQty <= 0 ? 'bg-red-100 text-red-600' : item.stockQty <= (item.alertQty || 5) ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {item.stockQty <= 0 ? 'Out of Stock' : item.stockQty <= (item.alertQty || 5) ? 'Low Stock' : 'In Stock'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : activeModule === 'expenses' && summary?.detailedExpenses ? (
                                        summary.detailedExpenses.map((expense, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-8 py-5 text-xs font-bold text-black font-mono italic uppercase align-top">
                                                    {new Date(expense.date).toLocaleDateString('en-CA')}
                                                </td>
                                                {selectedExpenseCategory === 'Staff Payroll' ? (
                                                    <>
                                                        <td className="px-8 py-5 text-xs font-black text-black uppercase align-top">
                                                            {expense.title || '-'}
                                                        </td>
                                                        <td className="px-8 py-5 text-[10px] font-bold text-blue-600 uppercase align-top">
                                                            {expense.designation || '-'}
                                                        </td>
                                                        <td className="px-8 py-5 text-right font-bold text-slate-800 text-xs align-top">
                                                            PKR {expense.baseSalary?.toLocaleString()}
                                                        </td>
                                                        <td className="px-8 py-5 text-right font-bold text-emerald-600 text-[10px] align-top">
                                                            +PKR {(expense.bonus + (expense.overtimePay || 0)).toLocaleString()}
                                                        </td>
                                                        <td className="px-8 py-5 text-right font-bold text-rose-600 text-[10px] align-top">
                                                            -PKR {expense.deductions?.toLocaleString()}
                                                        </td>
                                                        <td className="px-8 py-5 text-right font-black text-blue-800 text-xs align-top">
                                                            PKR {expense.amount?.toLocaleString()}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-5 text-xs font-bold text-black uppercase align-top">
                                                            {expense.title || '-'}
                                                        </td>
                                                        <td className="px-8 py-5 text-xs font-bold text-black uppercase align-top">
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">{expense.category || 'Uncategorized'}</span>
                                                        </td>
                                                        <td className="px-8 py-5 text-xs font-medium text-slate-500 uppercase align-top max-w-[300px] truncate">
                                                            {expense.description || '-'}
                                                        </td>
                                                        <td className="px-8 py-5 text-left font-black text-rose-600 text-xs align-top">
                                                            PKR {expense.amount?.toLocaleString()}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))
                                    ) : activeModule === 'returns' && summary?.detailedReturns ? (
                                        summary.detailedReturns.map((ret, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-8 py-5 text-xs font-bold text-black font-mono italic uppercase align-top">
                                                    {new Date(ret.date).toLocaleDateString('en-CA')}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-bold uppercase align-top">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${ret.type === 'Sale Return' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                                                        {ret.type}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-xs font-bold text-black uppercase align-top">
                                                    {ret.invoiceNo}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-black text-black uppercase align-top">
                                                    {ret.party}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-medium text-slate-500 align-top max-w-[250px]">
                                                    <div className="flex flex-wrap gap-1">
                                                        {ret.returnDetail?.split(', ').map((item, idx) => (
                                                            <span key={idx} className="bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-600">
                                                                {item}
                                                            </span>
                                                        )) || <span className="italic text-slate-400">No details</span>}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-rose-600 text-xs align-top">
                                                    PKR {ret.amount?.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        chartData.filter(d => activeModule === 'suppliers' || activeModule === 'expenses' || d[config.dataKey] > 0).map((row, i) => (
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
                                                <td className="px-8 py-5 text-right font-medium text-black text-xs">PKR {row[config.dataKey]?.toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                    {((activeModule === 'sales' && (!summary?.detailedSales || summary.detailedSales.length === 0)) ||
                                        (activeModule === 'purchases' && (!summary?.detailedPurchases || summary.detailedPurchases.length === 0)) ||
                                        (activeModule === 'inventory' && (!summary?.detailedInventory || summary.detailedInventory.length === 0)) ||
                                        (activeModule === 'expenses' && (!summary?.detailedExpenses || summary.detailedExpenses.length === 0)) ||
                                        (activeModule === 'returns' && (!summary?.detailedReturns || summary.detailedReturns.length === 0)) ||
                                        (activeModule !== 'sales' && activeModule !== 'purchases' && activeModule !== 'inventory' && activeModule !== 'expenses' && activeModule !== 'returns' && chartData.filter(d => activeModule === 'suppliers' || d[config.dataKey] > 0).length === 0)) && (
                                            <tr>
                                                <td colSpan={config.tableCols.length} className="px-8 py-20 text-center">
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No valid records found for this period</p>
                                                </td>
                                            </tr>
                                        )}
                                </tbody>
                            </table>
                        </div >
                    </div >
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
