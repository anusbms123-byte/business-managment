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
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

const ReportCard = ({ title, value, subValue, icon: Icon, onClick, colorClass }) => (
    <div
        onClick={onClick}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 ${colorClass} rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group animate-in zoom-in-95 duration-300`}
    >
        <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-lg group-hover:bg-slate-100 dark:group-hover:bg-slate-700 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                <Icon size={20} />
            </div>
            <div className="text-slate-300 dark:text-slate-700 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors">
                <ChevronRight size={18} />
            </div>
        </div>
        <div>
            <p className="text-black dark:text-slate-200 text-[10px] font-bold mb-1">{title}</p>
            <h3 className="text-xl font-bold text-black dark:text-white tracking-tight">{value}</h3>
            {subValue && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 flex items-center gap-1.5 tracking-tight">
                    {subValue}
                </p>
            )}
        </div>
    </div>
);

const DetailMiniCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
        <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20 text-opacity-100`}>
            <Icon size={18} />
        </div>
        <div>
            <p className="text-[10px] font-bold text-black dark:text-slate-200">{label}</p>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 tracking-tight">{value}</p>
        </div>
    </div>
);

const Reports = ({ currentUser }) => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeModule, setActiveModule] = useState(null); // 'sales', 'purchases', etc.
    // lastUpdated removed as it was unused
    const [vendors, setVendors] = useState([]);
    const [categories, setCategories] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('all');
    const [selectedEmployeeStatus, setSelectedEmployeeStatus] = useState('all'); // all, active, inactive
    const [selectedCustomer, setSelectedCustomer] = useState('all');
    const [selectedVendor, setSelectedVendor] = useState('all');
    const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
    // Inventory Filters
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
    const [overviewFilter, setOverviewFilter] = useState('Daily'); // For Dashboard

    const loadVendors = async () => {
        if (!currentUser?.company_id) return;
        try {
            const data = await window.electronAPI.getVendors(currentUser.company_id);
            setVendors(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading vendors:', err);
        }
    };

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

    const loadEmployees = async () => {
        if (!currentUser?.company_id) return;
        try {
            const data = await window.electronAPI.getEmployees(currentUser.company_id);
            setEmployees(data || []);
        } catch (err) {
            console.error('Error loading employees:', err);
        }
    };

    const applyPeriod = (p) => {
        const now = new Date();
        let start, end;
        end = now.toLocaleDateString('en-CA');

        if (p === 'Daily') {
            start = end;
        } else if (p === 'Weekly') {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            start = d.toLocaleDateString('en-CA');
        } else if (p === 'Monthly') {
            const d = new Date();
            d.setMonth(d.getMonth() - 1);
            start = d.toLocaleDateString('en-CA');
        } else {
            return;
        }

        setOverviewFilter(p);
        setDateRange({ start, end });
    };

    const loadDashboardReport = async () => {
        if (!currentUser?.company_id) return;
        setLoading(true);
        try {
            const data = await window.electronAPI.getReportSummary({
                companyId: currentUser.company_id,
                startDate: new Date(dateRange.start + 'T00:00:00').toISOString(),
                endDate: new Date(dateRange.end + 'T23:59:59').toISOString()
            });
            setSummary(data);
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
                customerId: (activeModule === 'sales' || activeModule === 'customers' || activeModule === 'netprofit') ? selectedCustomer : undefined,
                vendorId: (activeModule === 'purchases' || activeModule === 'suppliers' || activeModule === 'netprofit') ? selectedVendor : undefined,
                paymentStatus: (activeModule === 'sales' || activeModule === 'purchases' || activeModule === 'suppliers' || activeModule === 'customers' || activeModule === 'netprofit') ? selectedPaymentStatus : undefined,
                categoryId: activeModule === 'inventory' ? selectedCategoryId : undefined,
                stockStatus: activeModule === 'inventory' ? selectedStockStatus : undefined,
                expenseCategory: (activeModule === 'expenses' || activeModule === 'netprofit') ? selectedExpenseCategory : undefined,
                returnType: activeModule === 'returns' ? selectedReturnType : undefined,
                employeeId: (activeModule === 'hrm' || activeModule === 'netprofit') ? selectedEmployee : undefined,
                employeeStatus: (activeModule === 'hrm' || activeModule === 'netprofit') ? selectedEmployeeStatus : undefined
            });
            setSummary(data);
        } catch (err) {
            console.error('Error:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadCustomers();
        loadVendors();
        loadCategories();
        loadEmployees();
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
            setSelectedEmployeeStatus('all');
            setPrevActiveModule(activeModule);
        }
    }, [activeModule, prevActiveModule]);

    useEffect(() => {
        if (activeModule) {
            loadDetailedReport();
        } else {
            loadDashboardReport();
        }
    }, [currentUser, overviewFilter, activeModule, selectedCustomer, selectedVendor, selectedPaymentStatus, selectedCategoryId, selectedStockStatus, selectedExpenseCategory, selectedReturnType, selectedEmployee, selectedEmployeeStatus, dateRange.start, dateRange.end]);

    const handleBack = () => {
        setActiveModule(null);
        applyPeriod('Monthly');
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
                <RefreshCw size={32} className="text-emerald-600 animate-spin" />
                <p className="text-[10px] font-bold text-black">Loading...</p>
            </div>
        );
    }

    const renderDashboard = () => (
        <div className="animate-in fade-in duration-500">
            <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-8">
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    {['Daily', 'Weekly', 'Monthly'].map((p) => (
                        <button
                            key={p}
                            onClick={() => applyPeriod(p)}
                            className={`px-8 py-2.5 rounded-xl text-[10px] font-bold transition-all ${overviewFilter === p ? 'bg-emerald-500 text-white shadow-md border border-emerald-500' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2 px-3 border-r border-slate-100 dark:border-slate-700">
                        <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => { setDateRange({ ...dateRange, start: e.target.value }); setOverviewFilter('Custom'); }}
                            className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent w-28"
                        />
                    </div>
                    <div className="flex items-center gap-2 px-3">
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => { setDateRange({ ...dateRange, end: e.target.value }); setOverviewFilter('Custom'); }}
                            className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent w-28"
                        />
                    </div>
                    <button
                        onClick={loadDashboardReport}
                        className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <ReportCard title="Sales" value={`PKR ${summary?.totalSales?.toLocaleString() ?? '0'}`} subValue={`${summary?.salesCount ?? 0} Sales`} icon={DollarSign} colorClass="border-l-emerald-500" onClick={() => setActiveModule('sales')} />
                <ReportCard title="Purchases" value={`PKR ${summary?.totalPurchases?.toLocaleString() ?? '0'}`} subValue={`${summary?.purchaseCount ?? 0} Orders`} icon={ShoppingCart} colorClass="border-l-emerald-600" onClick={() => setActiveModule('purchases')} />
                <ReportCard title="Inventory" value={`PKR ${summary?.inventoryValuationCost?.toLocaleString() ?? '0'}`} subValue={`${summary?.lowStockCount ?? 0} Alerts`} icon={Package} colorClass="border-l-emerald-500" onClick={() => setActiveModule('inventory')} />
                <ReportCard title="Expenses" value={`PKR ${summary?.totalExpenses?.toLocaleString() ?? '0'}`} subValue={`${summary?.expenseCount ?? 0} Expenses`} icon={TrendingUp} colorClass="border-l-emerald-700" onClick={() => setActiveModule('expenses')} />
                <ReportCard title="Returns" value={`PKR ${summary?.totalReturns?.toLocaleString() ?? '0'}`} subValue={`${summary?.returnCount ?? 0} Returns`} icon={RotateCcw} colorClass="border-l-emerald-500" onClick={() => setActiveModule('returns')} />
                <ReportCard title="Suppliers" value={`PKR ${summary?.totalPayables?.toLocaleString() ?? '0'}`} subValue="Payables" icon={Factory} colorClass="border-l-slate-700" onClick={() => setActiveModule('suppliers')} />
                <ReportCard title="Customers" value={`PKR ${summary?.totalReceivables?.toLocaleString() ?? '0'}`} subValue="Receivables" icon={Users} colorClass="border-l-emerald-500" onClick={() => setActiveModule('customers')} />
                <ReportCard title="HRM" value={`PKR ${summary?.totalSalaries?.toLocaleString() ?? '0'}`} subValue="Payroll" icon={Users2} colorClass="border-l-emerald-600" onClick={() => setActiveModule('hrm')} />
                <ReportCard title="Net Profit" value={`PKR ${summary?.netProfit?.toLocaleString() ?? '0'}`} subValue="Profit/Loss" icon={CreditCard} colorClass="border-l-emerald-800" onClick={() => setActiveModule('netprofit')} />
            </div>

        </div>
    );

    const renderDetailView = () => {
        const chartData = (summary?.recentDays || []).slice();
        const moduleMap = {
            sales: {
                title: 'Sales Report', icon: DollarSign, color: '#10b981', dataKey: 'sales',
                miniStats: [
                    { label: 'Total Revenue', value: `PKR ${(summary?.totalSales || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600' },
                    { label: 'Cost of Items', value: `PKR ${(summary?.totalCOGS || 0).toLocaleString()}`, icon: ShoppingCart, color: 'text-slate-600' },
                    { label: 'Gross Profit', value: `PKR ${(summary?.grossProfit || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' },
                    { label: 'Total Invoices', value: `${summary?.salesCount || 0} Orders`, icon: Layers, color: 'text-emerald-600' },
                    { label: 'Avg Order Value', value: `PKR ${(Math.round(summary?.totalSales / (summary?.salesCount || 1)) || 0).toLocaleString()}`, icon: Activity, color: 'text-slate-500' }
                ],
                tableCols: ['Date', 'Invoice', 'Customer', 'Products', 'Items', 'Total', 'Status'],
                tableTitle: 'Sales Ledger',
                cols: 5,
                color: '#10b981'
            },
            purchases: {
                title: 'Purchase Report', icon: ShoppingCart, color: '#10b981', dataKey: 'purchases',
                miniStats: [
                    { label: 'Total Purchases', value: `PKR ${(summary?.totalPurchases || 0).toLocaleString()}`, icon: CreditCard, color: 'text-emerald-600' },
                    { label: 'Pending Bills', value: `PKR ${(summary?.totalPayablesFromPeriod ?? summary?.totalPayables ?? 0).toLocaleString()}`, icon: AlertTriangle, color: 'text-rose-500' },
                    { label: 'Total Suppliers', value: `${summary?.vendorCount || 0} Suppliers`, icon: Users, color: 'text-emerald-600' },
                    { label: 'Stock Value (In)', value: `PKR ${(summary?.inventoryValuationCost || 0).toLocaleString()}`, icon: Package, color: 'text-emerald-500' }
                ],
                tableCols: ['Date', 'Invoice', 'Supplier', 'Products', 'Items', 'Total', 'Status'],
                tableTitle: 'Purchase Log',
                cols: 4,
                color: '#10b981'
            },
            inventory: {
                title: 'Inventory Report', icon: Package, color: '#10b981', dataKey: 'inventory',
                miniStats: [
                    { label: 'Stock Value (Cost)', value: `PKR ${(summary?.inventoryValuationCost || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600' },
                    { label: 'Sale Potential (Sell)', value: `PKR ${(summary?.inventoryValuationSell || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' },
                    { label: 'Expected Profit', value: `PKR ${((summary?.inventoryValuationSell || 0) - (summary?.inventoryValuationCost || 0)).toLocaleString()}`, icon: Briefcase, color: 'text-emerald-600' },
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
                title: 'Expense Report', icon: TrendingUp, color: '#10b981', dataKey: 'expenses',
                miniStats: [
                    { label: 'Staff Payroll', value: `PKR ${(summary?.totalSalaries || 0).toLocaleString()}`, icon: Users2, color: 'text-emerald-500' },
                    { label: 'Bills', value: `PKR ${(summary?.expenseCategoryBreakdown?.['Bills'] || summary?.expenseCategoryBreakdown?.['Electricity'] || 0).toLocaleString()}`, icon: Zap, color: 'text-emerald-500' },
                    { label: 'Snacks & Tea', value: `PKR ${(summary?.expenseCategoryBreakdown?.['Snacks'] || 0).toLocaleString()}`, icon: Coffee, color: 'text-slate-500' },
                    { label: 'Rent', value: `PKR ${(summary?.expenseCategoryBreakdown?.['Rent'] || 0).toLocaleString()}`, icon: Home, color: 'text-emerald-500' },
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
                title: 'Return Report', icon: RotateCcw, color: '#10b981', dataKey: 'returns',
                miniStats: [
                    { label: 'Total Returns', value: `PKR ${(summary?.totalReturns || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600' },
                    { label: 'Sales Returns', value: `PKR ${(summary?.totalSalesReturns || 0).toLocaleString()}`, icon: TrendingDown, color: 'text-rose-500' },
                    { label: 'Purchase Returns', value: `PKR ${(summary?.totalPurchaseReturns || 0).toLocaleString()}`, icon: ShoppingCart, color: 'text-emerald-500' },
                    { label: 'Volume', value: `${summary?.returnCount || 0} Records`, icon: RefreshCw, color: 'text-emerald-600' }
                ],
                tableCols: ['Date', 'Type', 'Invoice #', 'Party Name', 'Returned Products', 'Refund Magnitude'],
                tableTitle: 'Returns Ledger',
                cols: 4
            },
            suppliers: {
                title: 'Supplier Report', icon: Factory, color: '#475569', dataKey: 'purchases',
                miniStats: [
                    { label: 'Total Payables', value: `PKR ${(summary?.totalPayables || 0).toLocaleString()}`, icon: CreditCard, color: 'text-rose-600' },
                    { label: 'Supplier Count', value: `${summary?.vendorCount || 0} Partners`, icon: Users, color: 'text-emerald-600' },
                    { label: 'Avg Payable', value: `PKR ${(Math.round(summary?.totalPayables / (summary?.vendorCount || 1)) || 0).toLocaleString()}`, icon: Activity, color: 'text-slate-500' },
                    { label: 'Total Purchased', value: `PKR ${(summary?.totalPurchases || 0).toLocaleString()}`, icon: ShoppingCart, color: 'text-amber-600' },
                    { label: 'Active Balance', value: summary?.totalPayables > 0 ? "Pending" : "Clear", icon: AlertTriangle, color: 'text-amber-500' }
                ],
                tableCols: ['Supplier Name', 'Phone', 'Address', 'Balance Owed', 'Status'],
                tableTitle: 'Supplier Ledger Balance',
                cols: 5
            },
            customers: {
                title: 'Customer Report', icon: Users, color: '#14b8a6', dataKey: 'sales',
                miniStats: [
                    { label: 'Total Receivables', value: `PKR ${(summary?.totalReceivables || 0).toLocaleString()}`, icon: CreditCard, color: 'text-teal-600' },
                    { label: 'Customer Count', value: `${summary?.customerCount || 0}`, icon: Users, color: 'text-emerald-600' },
                    { label: 'Avg Receivable', value: `PKR ${(Math.round(summary?.totalReceivables / (summary?.customerCount || 1)) || 0).toLocaleString()}`, icon: Activity, color: 'text-slate-500' },
                    { label: 'Total Sales to Customers', value: `PKR ${(summary?.totalSales || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600' },
                    { label: 'Active Balance', value: summary?.totalReceivables > 0 ? "Outstanding" : "Clear", icon: CheckCircle2, color: 'text-teal-500' }
                ],
                tableCols: ['Customer Name', 'Phone', 'Address', 'Balance Owed', 'Status'],
                tableTitle: 'Customer Ledger Balance',
                cols: 5
            },
            hrm: {
                title: 'Staff Payroll', icon: Users2, color: '#4f46e5', dataKey: 'salaries',
                miniStats: [
                    { label: 'Total Payroll', value: `PKR ${(summary?.totalSalaries || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600' },
                    { label: 'Active Staff', value: `${summary?.employeeCount || 0} Members`, icon: Users, color: 'text-emerald-500' },
                    { label: 'Avg Salary', value: `PKR ${(Math.round(summary?.totalSalaries / (summary?.employeeCount || 1)) || 0).toLocaleString()}`, icon: Activity, color: 'text-slate-500' },
                    { label: 'Total Staff', value: `${summary?.totalEmployees || 0} Records`, icon: Users, color: 'text-emerald-600' },
                    { label: 'Status', value: summary?.employeeCount > 0 ? "Active" : "None", icon: Briefcase, color: 'text-emerald-500' }
                ],
                tableCols: ['Staff Name', 'Designation', 'Voucher #', 'Paid Date', 'Amount'],
                tableTitle: 'Payroll History',
                cols: 5
            },
            netprofit: {
                title: 'Profit Report', icon: CreditCard, color: '#3b82f6', dataKey: 'profit',
                miniStats: [
                    { label: 'Total Revenue', value: `PKR ${(summary?.totalSales || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600' },
                    { label: 'Gross Profit', value: `PKR ${(summary?.grossProfit || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' },
                    { label: 'Operating Costs', value: `PKR ${(summary?.operatingExpenses || 0).toLocaleString()}`, icon: TrendingDown, color: 'text-rose-400' },
                    { label: 'Net Profit', value: `PKR ${(summary?.netProfit || 0).toLocaleString()}`, icon: Briefcase, color: summary?.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600' },
                    { label: 'Profit Margin', value: `${summary?.totalSales > 0 ? Math.round((summary?.netProfit / (summary?.totalSales || 1)) * 100) : 0}%`, icon: Activity, color: 'text-indigo-500' }
                ],
                tableCols: ['Date', 'Total Sales', 'COGS', 'Expenses', 'Net Profit'],
                tableTitle: 'Profitability Ledger',
                cols: 5
            }
        };

        const config = moduleMap[activeModule];

        return (
            <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-[#F8FAFC] dark:bg-slate-950 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                {/* Detail Header */}
                <div className="px-4 md:px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-slate-900 shrink-0 gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-900 dark:hover:bg-slate-700 hover:text-white dark:hover:text-slate-100 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <config.icon size={22} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-xl font-bold text-black dark:text-slate-100 tracking-tight">{config.title}</h1>
                                        {activeModule === 'sales' && selectedCustomer !== 'all' && (
                                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-600 px-3 py-1 rounded-lg">
                                                {customers.find(c => c.id == selectedCustomer)?.name || 'Customer'}
                                            </span>
                                        )}
                                        {activeModule === 'sales' && selectedPaymentStatus !== 'all' && (
                                            <span className={`text-[9px] font-bold px-3 py-1 rounded-lg ${selectedPaymentStatus === 'paid'
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : 'bg-orange-100 text-orange-600'
                                                }`}>
                                                {selectedPaymentStatus === 'paid' ? 'Paid' : 'Credit'}
                                            </span>
                                        )}
                                        {activeModule === 'suppliers' && selectedVendor !== 'all' && (
                                            <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-lg">
                                                {vendors.find(v => v.id == selectedVendor)?.name || 'Supplier'}
                                            </span>
                                        )}
                                        {activeModule === 'suppliers' && selectedPaymentStatus !== 'all' && (
                                            <span className={`text-[9px] font-bold px-3 py-1 rounded-lg ${selectedPaymentStatus === 'paid'
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : 'bg-orange-100 text-orange-600'
                                                }`}>
                                                {selectedPaymentStatus === 'paid' ? 'Paid' : 'Credit / Due'}
                                            </span>
                                        )}
                                        {activeModule === 'customers' && selectedCustomer !== 'all' && (
                                            <span className="text-[9px] font-bold bg-teal-100 text-teal-600 px-3 py-1 rounded-lg">
                                                {customers.find(c => c.id == selectedCustomer)?.name || 'Customer'}
                                            </span>
                                        )}
                                        {activeModule === 'customers' && selectedPaymentStatus !== 'all' && (
                                            <span className={`text-[9px] font-bold px-3 py-1 rounded-lg ${selectedPaymentStatus === 'paid'
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : 'bg-orange-100 text-orange-600'
                                                }`}>
                                                {selectedPaymentStatus === 'paid' ? 'Paid' : 'Credit / Due'}
                                            </span>
                                        )}
                                        {(activeModule === 'netprofit' || activeModule === 'sales') && selectedCustomer !== 'all' && (
                                            <span className="text-[9px] font-bold bg-teal-100 text-teal-600 px-3 py-1 rounded-lg">
                                                {customers.find(c => c.id == selectedCustomer)?.name || 'Filtered Customer'}
                                            </span>
                                        )}
                                        {activeModule === 'netprofit' && selectedVendor !== 'all' && (
                                            <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-3 py-1 rounded-lg">
                                                {vendors.find(v => v.id == selectedVendor)?.name || 'Filtered Vendor'}
                                            </span>
                                        )}
                                        {activeModule === 'netprofit' && selectedEmployee !== 'all' && (
                                            <span className="text-[9px] font-bold bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg">
                                                {employees.find(e => e.id == selectedEmployee)?.first_name || 'Filtered Staff'}
                                            </span>
                                        )}
                                        {activeModule === 'hrm' && selectedEmployee !== 'all' && (
                                            <span className="text-[9px] font-bold bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg">
                                                {employees.find(e => e.id == selectedEmployee)?.first_name || 'Staff Member'}
                                            </span>
                                        )}
                                        {activeModule === 'hrm' && selectedEmployeeStatus !== 'all' && (
                                            <span className={`text-[9px] font-bold px-3 py-1 rounded-lg ${selectedEmployeeStatus === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                {selectedEmployeeStatus === 'active' ? 'Active Staff' : 'Inactive Staff'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-black dark:text-slate-400 text-[10px] font-bold mt-1">Detailed Report</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeModule === 'netprofit' && (
                            <>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <Users size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedCustomer}
                                        onChange={(e) => setSelectedCustomer(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Customers</option>
                                        {customers.map(customer => (
                                            <option key={customer.id} value={customer.id} className="dark:bg-slate-900">
                                                {customer.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <Factory size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedVendor}
                                        onChange={(e) => setSelectedVendor(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Suppliers</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id} className="dark:bg-slate-900">
                                                {v.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <Users2 size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedEmployee}
                                        onChange={(e) => setSelectedEmployee(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Staff</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id} className="dark:bg-slate-900">
                                                {emp.first_name} {emp.last_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <CreditCard size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedPaymentStatus}
                                        onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Status</option>
                                        <option value="paid" className="dark:bg-slate-900">Paid Only</option>
                                        <option value="credit" className="dark:bg-slate-900">Credit Only</option>
                                    </select>
                                </div>
                            </>
                        )}
                        {activeModule === 'sales' && (
                            <>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <Users size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedCustomer}
                                        onChange={(e) => setSelectedCustomer(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Customers</option>
                                        {customers.map(customer => (
                                            <option key={customer.id} value={customer.id} className="dark:bg-slate-900">
                                                {customer.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <CreditCard size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedPaymentStatus}
                                        onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Status</option>
                                        <option value="paid" className="dark:bg-slate-900">Paid</option>
                                        <option value="credit" className="dark:bg-slate-900">Credit</option>
                                    </select>
                                </div>
                            </>
                        )}
                        {activeModule === 'purchases' && (
                            <>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <Factory size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedVendor}
                                        onChange={(e) => setSelectedVendor(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Suppliers</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id} className="dark:bg-slate-900">
                                                {v.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <CreditCard size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedPaymentStatus}
                                        onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Status</option>
                                        <option value="paid" className="dark:bg-slate-900">Paid</option>
                                        <option value="credit" className="dark:bg-slate-900">Credit / Due</option>
                                    </select>
                                </div>
                            </>
                        )}
                        {activeModule === 'inventory' && (
                            <>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <Layers size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedCategoryId}
                                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Categories</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id} className="dark:bg-slate-900">
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <AlertTriangle size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedStockStatus}
                                        onChange={(e) => setSelectedStockStatus(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Status</option>
                                        <option value="low" className="dark:bg-slate-900">Low Stock</option>
                                        <option value="out" className="dark:bg-slate-900">Out of Stock</option>
                                        <option value="expired" className="dark:bg-slate-900">Expired</option>
                                    </select>
                                </div>
                            </>
                        )}
                        {activeModule === 'returns' && (
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                <RotateCcw size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                 <select
                                    value={selectedReturnType}
                                    onChange={(e) => setSelectedReturnType(e.target.value)}
                                    className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                >
                                    <option value="all" className="dark:bg-slate-900">All Returns</option>
                                    <option value="sales" className="dark:bg-slate-900">Sales Returns</option>
                                    <option value="purchases" className="dark:bg-slate-900">Purchase Returns</option>
                                </select>
                            </div>
                        )}
                        {(activeModule === 'expenses' || activeModule === 'netprofit') && (
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                <FileText size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                 <select
                                    value={selectedExpenseCategory}
                                    onChange={(e) => setSelectedExpenseCategory(e.target.value)}
                                    className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                >
                                    <option value="all" className="dark:bg-slate-900">All Expenses</option>
                                    {expenseCategories.map(cat => (
                                        <option key={cat} value={cat} className="dark:bg-slate-900">
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {activeModule === 'suppliers' && (
                            <>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <Factory size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedVendor}
                                        onChange={(e) => setSelectedVendor(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Suppliers</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id} className="dark:bg-slate-900">
                                                {v.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <CreditCard size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedPaymentStatus}
                                        onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Status</option>
                                        <option value="paid" className="dark:bg-slate-900">Paid</option>
                                        <option value="credit" className="dark:bg-slate-900">Credit / Due</option>
                                    </select>
                                </div>
                            </>
                        )}
                        {activeModule === 'customers' && (
                            <>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <Users size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedCustomer}
                                        onChange={(e) => setSelectedCustomer(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Customers</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id} className="dark:bg-slate-900">
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <CreditCard size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedPaymentStatus}
                                        onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Status</option>
                                        <option value="paid" className="dark:bg-slate-900">Paid</option>
                                        <option value="credit" className="dark:bg-slate-900">Credit / Due</option>
                                    </select>
                                </div>
                            </>
                        )}
                        {activeModule === 'hrm' && (
                            <>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <Users size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                    <select
                                        value={selectedEmployee}
                                        onChange={(e) => setSelectedEmployee(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Staff Members</option>
                                        {employees.map(e => (
                                            <option key={e.id} value={e.id} className="dark:bg-slate-900">
                                                {e.first_name} {e.last_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm mr-2">
                                    <Activity size={14} className="text-slate-400 dark:text-slate-500 ml-3" />
                                     <select
                                        value={selectedEmployeeStatus}
                                        onChange={(e) => setSelectedEmployeeStatus(e.target.value)}
                                        className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent px-2 py-1"
                                    >
                                        <option value="all" className="dark:bg-slate-900">All Status</option>
                                        <option value="active" className="dark:bg-slate-900">Active Only</option>
                                        <option value="inactive" className="dark:bg-slate-900">Inactive Only</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm ml-auto">
                            <div className="flex items-center gap-2 px-3 border-r border-slate-100 dark:border-slate-700">
                                <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                                <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => { setDateRange({ ...dateRange, start: e.target.value }); setOverviewFilter('Custom'); }}
                                className="text-[10px] font-bold text-black dark:text-slate-100 outline-none bg-transparent w-28"
                            />
                            </div>
                            <div className="flex items-center gap-2 px-3">
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => { setDateRange({ ...dateRange, end: e.target.value }); setOverviewFilter('Custom'); }}
                                    className="text-[10px] font-bold text-black dark:text-slate-100 outline-none uppercase bg-transparent w-28"
                                />
                            </div>
                            <button
                                onClick={loadDetailedReport}
                                className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
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
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 overflow-hidden relative">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-[10px] font-black text-black dark:text-slate-400 mb-1 italic">
                                        {activeModule === 'inventory' ? 'Stock Added (Cost)' : 
                                         activeModule === 'expenses' ? 'Spending Analysis' : 
                                         activeModule === 'returns' ? 'Refund Velocity' : 
                                         activeModule === 'suppliers' ? 'Purchase History' :
                                         activeModule === 'customers' ? 'Sales History' :
                                         activeModule === 'hrm' ? 'Payroll Velocity' :
                                         'Trend Analysis'}
                                    </h2>
                                    <p className="text-xs text-black dark:text-slate-100 font-bold tracking-tight">
                                        {activeModule === 'inventory' ? 'Stock Addition Trend' : 
                                         activeModule === 'expenses' ? 'Expense Velocity' : 
                                         activeModule === 'returns' ? 'Sales & Purchase Returns' : 
                                         activeModule === 'suppliers' ? 'Purchases from Suppliers' :
                                         activeModule === 'customers' ? 'Sales to Customers' :
                                         activeModule === 'hrm' ? 'Staff Salary Trend' :
                                         'Activity History'}
                                    </p>
                                </div>
                                <button className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"><Download size={18} /></button>
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
                                            labelStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
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

                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-black dark:text-slate-100 flex flex-col justify-between relative overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
                            <div className="absolute top-0 right-0 p-10 opacity-5 text-slate-900 dark:text-white"><config.icon size={120} /></div>
                            <div>
                                 <p className="text-[10px] font-bold text-black dark:text-slate-100 italic">
                                    {activeModule === 'returns' ? 'Total Refunds' : 
                                     activeModule === 'suppliers' ? 'Total Balance Due' :
                                     activeModule === 'customers' ? 'Total Receivables' :
                                     'Total Amount'}
                                </p>
                                <h2 className="text-3xl font-medium mt-2 tracking-tighter text-black dark:text-slate-100">
                                    PKR {(
                                        activeModule === 'returns'
                                            ? (selectedReturnType === 'sales' ? (summary?.totalSalesReturns || 0) : selectedReturnType === 'purchases' ? (summary?.totalPurchaseReturns || 0) : (summary?.totalReturns || 0))
                                            : (activeModule === 'suppliers' ? (summary?.totalPayables || 0) : 
                                               activeModule === 'customers' ? (summary?.totalReceivables || 0) :
                                               activeModule === 'hrm' ? (summary?.totalSalaries || 0) :
                                               activeModule === 'netprofit' ? (summary?.netProfit || 0) :
                                               activeModule === 'expenses' ? (summary?.totalExpenses || 0) :
                                               (summary?.totalSales || 0))
                                    ).toLocaleString()}
                                </h2>
                            </div>
                            <div className="space-y-4 relative z-10 pt-10">
                                {activeModule === 'sales' && selectedCustomer === 'all' ? (
                                    /* Top Customers View */
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                         <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-black dark:text-slate-100">Top Customers</span>
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Total Spent</span>
                                        </div>
                                        <div className="space-y-2">
                                            {(summary?.topCustomers || []).slice(0, 3).map((c, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-orange-400 text-white'}`}>
                                                            {i + 1}
                                                        </div>
                                                         <span className="text-[10px] font-bold text-black dark:text-slate-200 truncate max-w-[80px]">{c.name}</span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">PKR {c.totalSpent?.toLocaleString()}</span>
                                                </div>
                                            ))}
                                            {(!summary?.topCustomers || summary.topCustomers.length === 0) && (
                                                <p className="text-[9px] italic text-slate-400 dark:text-slate-500 text-center py-2">No customer data available</p>
                                            )}
                                        </div>
                                    </div>
                                ) : activeModule === 'sales' && selectedCustomer !== 'all' ? (
                                    /* Top Products View for Specific Customer */
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                         <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-black dark:text-slate-100">Top Products</span>
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Qty</span>
                                        </div>
                                        <div className="space-y-2">
                                            {(summary?.topProducts || []).slice(0, 3).map((p, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-cyan-500' : 'bg-indigo-500'}`}>
                                                            {i + 1}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-black dark:text-slate-200 truncate max-w-[100px]">{p.name}</span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">PKR {p.qtySold} Units</span>
                                                </div>
                                            ))}
                                            {(!summary?.topProducts || summary.topProducts.length === 0) && (
                                                <p className="text-[9px] italic text-slate-400 dark:text-slate-500 text-center py-2">No product data available</p>
                                            )}
                                        </div>
                                    </div>
                                ) : activeModule === 'purchases' ? (
                                    selectedVendor === 'all' ? (
                                        /* Top Suppliers View */
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                             <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold text-black dark:text-slate-100">Top Suppliers</span>
                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Total Spent</span>
                                            </div>
                                            <div className="space-y-2">
                                                {(summary?.topVendors || []).slice(0, 3).map((v, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-orange-400 text-white'}`}>
                                                                {i + 1}
                                                            </div>
                                                             <span className="text-[10px] font-bold text-black dark:text-slate-200 truncate max-w-[80px]">{v.name}</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">PKR {v.totalSpent?.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                {(!summary?.topVendors || summary.topVendors.length === 0) && (
                                                    <p className="text-[9px] italic text-slate-400 dark:text-slate-500 text-center py-2">No supplier data available</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Top Purchased Products View for Specific Supplier */
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex justify-between items-center mb-2">
                                                 <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-bold text-black dark:text-slate-100">Top Supplied Items</span>
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Qty</span>
                                                </div><span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Qty</span>
                                            </div>
                                            <div className="space-y-2">
                                                {(summary?.topPurchasedProducts || []).slice(0, 3).map((p, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-orange-500' : i === 1 ? 'bg-amber-500' : 'bg-yellow-500'}`}>
                                                                {i + 1}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-black dark:text-slate-200 truncate max-w-[100px]">{p.name}</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">{p.qtyBought} Units</span>
                                                    </div>
                                                ))}
                                                {(!summary?.topPurchasedProducts || summary.topPurchasedProducts.length === 0) && (
                                                    <p className="text-[9px] italic text-slate-400 dark:text-slate-500 text-center py-2">No product data available</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                ) : activeModule === 'inventory' ? (
                                    /* Top Valued Stock View */
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                         <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-black dark:text-slate-100">Top Valued Stock</span>
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Asset Value</span>
                                        </div>
                                        <div className="space-y-2">
                                            {(summary?.topValuedItems || []).slice(0, 3).map((p, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-emerald-500' : 'bg-slate-500'}`}>
                                                            {i + 1}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-black dark:text-slate-200 truncate max-w-[100px]">{p.name}</span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">PKR {((p.stockQty * p.costPrice) || 0).toLocaleString()}</span>
                                                </div>
                                            ))}
                                            {(!summary?.topValuedItems || summary.topValuedItems.length === 0) && (
                                                <p className="text-[9px] italic text-slate-400 dark:text-slate-500 text-center py-2">No inventory data available</p>
                                            )}
                                        </div>
                                    </div>
                                ) : activeModule === 'returns' ? (
                                    /* Returns Breakdown View */
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                         <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-bold text-black dark:text-slate-100">Refund Breakdown</span>
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Total Logic</span>
                                        </div>
                                        <div className="space-y-3">
                                            {(selectedReturnType === 'all' || selectedReturnType === 'sales') && (
                                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                                                         <span className="text-[10px] font-bold text-black dark:text-slate-200">Sales Returns</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">PKR {(summary?.totalSalesReturns || 0).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {(selectedReturnType === 'all' || selectedReturnType === 'purchases') && (
                                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                         <span className="text-[10px] font-bold text-black dark:text-slate-200">Purchase Returns</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">PKR {(summary?.totalPurchaseReturns || 0).toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-center px-1">
                                                 <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 italic font-mono">Activity Frequency</span>
                                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{summary?.returnCount || 0} Transactions</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : activeModule === 'suppliers' ? (
                                    /* Top Suppliers by Purchase Volume */
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-black dark:text-slate-100">Top Suppliers</span>
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Total Purchases</span>
                                        </div>
                                        <div className="space-y-2">
                                            {(summary?.topVendors || []).slice(0, 3).map((v, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-orange-400 text-white'}`}>
                                                            {i + 1}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-black dark:text-slate-200 truncate max-w-[80px]">{v.name}</span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">PKR {v.totalSpent?.toLocaleString()}</span>
                                                </div>
                                            ))}
                                            {(!summary?.topVendors || summary.topVendors.length === 0) && (
                                                <p className="text-[9px] italic text-slate-400 dark:text-slate-500 text-center py-2">No supplier data available</p>
                                            )}
                                        </div>
                                    </div>
                                ) : activeModule === 'customers' ? (
                                    selectedCustomer === 'all' ? (
                                        /* Top Customers View */
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold text-black dark:text-slate-100">Top Customers</span>
                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Total Spent</span>
                                            </div>
                                            <div className="space-y-2">
                                                {(summary?.topCustomers || []).slice(0, 3).map((c, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-teal-400' : i === 1 ? 'bg-cyan-400' : 'bg-emerald-400'}`}>
                                                                {i + 1}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-black dark:text-slate-200 truncate max-w-[80px]">{c.name}</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">PKR {c.totalSpent?.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                {(!summary?.topCustomers || summary.topCustomers.length === 0) && (
                                                    <p className="text-[9px] italic text-slate-400 dark:text-slate-500 text-center py-2">No customer data available</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Top Bought Products View for Specific Customer */
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold text-black dark:text-slate-100">Top Bought Items</span>
                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Qty</span>
                                            </div>
                                            <div className="space-y-2">
                                                {(summary?.topProducts || []).slice(0, 3).map((p, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-teal-500' : i === 1 ? 'bg-cyan-500' : 'bg-emerald-500'}`}>
                                                                {i + 1}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-black dark:text-slate-200 truncate max-w-[100px]">{p.name}</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">{p.qtySold} Units</span>
                                                    </div>
                                                ))}
                                                {(!summary?.topProducts || summary.topProducts.length === 0) && (
                                                    <p className="text-[9px] italic text-slate-400 dark:text-slate-500 text-center py-2">No product data available</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                ) : activeModule === 'hrm' ? (
                                    selectedEmployee === 'all' ? (
                                        /* Top Staff View */
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold text-black dark:text-slate-100">Top Earners</span>
                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Total Paid</span>
                                            </div>
                                            <div className="space-y-2">
                                                {(summary?.topStaff || []).slice(0, 3).map((s, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-indigo-600' : i === 1 ? 'bg-purple-500' : 'bg-emerald-500'}`}>
                                                                {i + 1}
                                                            </div>
                                                             <span className="text-[10px] font-bold text-black dark:text-slate-200 truncate max-w-[80px]">{s.name}</span>
                                                        </div>
                                                        <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">PKR {s.totalEarned?.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                {(!summary?.topStaff || summary.topStaff.length === 0) && (
                                                    <p className="text-[9px] italic text-slate-400 dark:text-slate-500 text-center py-2">No payroll data available</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Detailed Salary Insight for Specific Employee */
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-[10px] font-bold text-black dark:text-slate-100">Payroll Analysis</span>
                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Employee View</span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                         <span className="text-[10px] font-bold text-black dark:text-slate-200">Average Payout</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">PKR {(Math.round(summary?.totalSalaries / (summary?.detailedHRM?.length || 1)) || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-center px-1">
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 italic font-mono">Total Records</span>
                                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{summary?.detailedHRM?.length || 0} Vouchers</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                ) : activeModule === 'expenses' ? (
                                    /* Top Expenses View */
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-bold text-black dark:text-slate-100">Top Categories</span>
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Total Spent</span>
                                        </div>
                                        <div className="space-y-2">
                                            {(summary?.topExpenses || []).slice(0, 3).map((e, i) => (
                                                <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white ${i === 0 ? 'bg-rose-500' : i === 1 ? 'bg-orange-500' : 'bg-slate-500'}`}>
                                                            {i + 1}
                                                        </div>
                                                         <span className="text-[10px] font-bold text-black dark:text-slate-200 truncate max-w-[100px]">{e.name}</span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400">PKR {e.total?.toLocaleString()}</span>
                                                </div>
                                            ))}
                                            {(!summary?.topExpenses || summary.topExpenses.length === 0) && (
                                                <p className="text-[9px] italic text-slate-400 dark:text-slate-500 text-center py-2">No expense data available</p>
                                            )}
                                        </div>
                                    </div>
                                ) : activeModule === 'netprofit' ? (
                                    /* Profitability History View (3 Months) */
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-[10px] font-bold text-black dark:text-slate-100">Quarterly Net Logs</span>
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Past 3 Months</span>
                                        </div>
                                        <div className="space-y-3">
                                        
                                            {summary?.monthlyHistory?.map((m, i) => (
                                                <div key={i} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${m.profit >= 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'}`}>
                                                            {m.month[0]}
                                                        </div>
                                                         <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold text-black dark:text-slate-200 leading-tight">{m.month} {m.year}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 tracking-tighter">Verified Profit</span>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[11px] font-black font-mono ${m.profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                                        {m.profit >= 0 ? '+' : ''}{m.profit?.toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                            {(!summary?.monthlyHistory || summary.monthlyHistory.length === 0) && (
                                                <p className="text-[9px] italic text-slate-400 dark:text-slate-500 text-center py-2">No historical data available</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                     /* Default View */
                                    <>
                                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] font-bold text-black dark:text-slate-100">Volume</span>
                                            <span className="text-lg font-medium text-black dark:text-slate-200">{summary?.[`${activeModule.replace('netprofit', 'sales')}Count`] || '0'} Logs</span>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
                                            <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Periodic Status</p>
                                            <p className="text-xs font-black mt-1 italic tracking-tighter text-emerald-900 dark:text-emerald-200">Verified & Processed</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* Data Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                             <h3 className="text-[10px] font-black text-black dark:text-slate-400 italic">
                                 {config.tableTitle || 'Report Journal'}
                             </h3>
                            <span className="text-[9px] font-bold text-black dark:text-slate-100">{config.tableTitle ? `View ${config.tableTitle}` : 'Report logs'}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 dark:bg-slate-800">
                                    <tr>
                                        {config.tableCols.map((col, idx) => (
                                            <th key={idx} className={`px-8 py-4 text-[11px] font-bold text-black dark:text-white border-b border-slate-200 dark:border-slate-700 
                                                ${(col === 'Total' || col === 'Total Sales' || col === 'Status' || col === 'Amount' || col === 'Net Paid' || col === 'Basic Pay' || col === 'Bonus/OT' || col === 'Deduction' || col === 'Refund Magnitude' || col === 'Balance Owed' || col === 'Unit Cost' || col === 'Total Value' || col === 'COGS' || col === 'Expenses' || col === 'Net Profit' || col === 'Daily Profit' || (activeModule !== 'expenses' && col === 'Amount')) ? 'text-right' : (col === 'Items' || col === 'Stock Qty') ? 'text-center' : 'text-left'}`}>
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {((activeModule === 'sales' && summary?.detailedSales) || (activeModule === 'purchases' && summary?.detailedPurchases)) ? (
                                        (activeModule === 'sales' ? summary.detailedSales : summary.detailedPurchases).map((tx, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-8 py-5 text-xs font-bold text-black dark:text-slate-100 font-mono italic align-top">
                                                    {new Date(tx.date).toLocaleDateString('en-CA')}
                                                </td>
                                                 <td className="px-8 py-5 text-xs font-bold text-black dark:text-slate-100 align-top">
                                                    {tx.invoiceNo || '-'}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-bold text-black dark:text-slate-100 align-top">
                                                    {tx.customer?.name || tx.vendor?.name || (activeModule === 'sales' ? 'Walk-in' : 'Unknown')}
                                                </td>
                                                <td className="px-8 py-5 align-top">
                                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 max-w-[200px] truncate block" title={tx.items?.map(item => item.product?.name || item.name).join(', ')}>
                                                        {tx.items?.map(item => item.product?.name || item.name).join(', ') || '-'}
                                                    </span>
                                                </td>
                                                 <td className="px-8 py-5 text-center align-top">
                                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-black dark:text-slate-100">
                                                        {tx.items?.length || 0}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-medium text-black dark:text-slate-100 text-xs align-top">PKR {(tx.grandTotal || tx.totalAmount)?.toLocaleString()}</td>
                                                <td className="px-8 py-5 text-right align-top">
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md tracking-wide flex items-center justify-end gap-1 ${tx.paymentStatus?.toUpperCase() === 'PAID' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                                        }`}>
                                                        <div className={`w-1 h-1 rounded-full ${tx.paymentStatus?.toUpperCase() === 'PAID' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                                                        {tx.paymentStatus || 'DUE'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : activeModule === 'inventory' && summary?.detailedInventory ? (
                                        summary.detailedInventory.map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-8 py-5 text-xs font-bold text-black dark:text-slate-100 font-mono italic align-top">
                                                    {item.name}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-bold text-black dark:text-slate-100 align-top">
                                                    {item.category?.name || '-'}
                                                </td>
                                                 <td className="px-8 py-5 text-center align-top">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.stockQty <= (item.alertQty || 5) ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-100'}`}>
                                                        {item.stockQty}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-medium text-slate-500 dark:text-slate-400 text-xs align-top">PKR {(item.costPrice || 0).toLocaleString()}</td>
                                                <td className="px-8 py-5 text-right font-black text-black dark:text-slate-100 text-xs align-top">PKR {((item.stockQty * item.costPrice) || 0).toLocaleString()}</td>
                                                <td className="px-8 py-5 text-right align-top">
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md tracking-wide ${item.stockQty <= 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : item.stockQty <= (item.alertQty || 5) ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                                                        {item.stockQty <= 0 ? 'Out of Stock' : item.stockQty <= (item.alertQty || 5) ? 'Low Stock' : 'In Stock'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : activeModule === 'expenses' && summary?.detailedExpenses ? (
                                        summary.detailedExpenses.map((expense, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-8 py-5 text-xs font-bold text-black dark:text-slate-100 font-mono italic align-top">
                                                    {new Date(expense.date).toLocaleDateString('en-CA')}
                                                </td>
                                                {selectedExpenseCategory === 'Staff Payroll' ? (
                                                    <>
                                                        <td className="px-8 py-5 text-xs font-black text-black dark:text-slate-100 align-top">
                                                            {expense.title || '-'}
                                                        </td>
                                                        <td className="px-8 py-5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 align-top">
                                                            {expense.designation || '-'}
                                                        </td>
                                                        <td className="px-8 py-5 text-right font-bold text-slate-800 dark:text-slate-200 text-xs align-top">
                                                            PKR {expense.baseSalary?.toLocaleString()}
                                                        </td>
                                                        <td className="px-8 py-5 text-right font-bold text-emerald-600 dark:text-emerald-400 text-[10px] align-top">
                                                            +PKR {(expense.bonus + (expense.overtimePay || 0)).toLocaleString()}
                                                        </td>
                                                        <td className="px-8 py-5 text-right font-bold text-rose-600 dark:text-rose-400 text-[10px] align-top">
                                                            -PKR {expense.deductions?.toLocaleString()}
                                                        </td>
                                                        <td className="px-8 py-5 text-right font-black text-emerald-800 dark:text-emerald-200 text-xs align-top">
                                                            PKR {expense.amount?.toLocaleString()}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-5 text-xs font-bold text-black dark:text-slate-100 align-top">
                                                            {expense.title || '-'}
                                                        </td>
                                                        <td className="px-8 py-5 text-xs font-bold text-black dark:text-slate-100 align-top">
                                                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">{expense.category || 'Uncategorized'}</span>
                                                        </td>
                                                        <td className="px-8 py-5 text-xs font-medium text-slate-500 dark:text-slate-400 align-top max-w-[300px] truncate">
                                                            {expense.description || '-'}
                                                        </td>
                                                        <td className="px-8 py-5 text-left font-black text-rose-600 dark:text-rose-400 text-xs align-top">
                                                            PKR {expense.amount?.toLocaleString()}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))
                                    ) : activeModule === 'returns' && summary?.detailedReturns ? (
                                        summary.detailedReturns.map((ret, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-8 py-5 text-xs font-bold text-black dark:text-slate-100 font-mono italic align-top">
                                                    {new Date(ret.date).toLocaleDateString('en-CA')}
                                                </td>
                                                 <td className="px-8 py-5 text-xs font-bold align-top">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${ret.type === 'Sale Return' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                                                        {ret.type}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-xs font-bold text-black dark:text-slate-100 align-top">
                                                    {ret.invoiceNo}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-black text-black dark:text-slate-100 align-top">
                                                    {ret.party}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-medium text-slate-500 dark:text-slate-400 align-top max-w-[250px]">
                                                    <div className="flex flex-wrap gap-1">
                                                        {ret.returnDetail?.split(', ').map((item, idx) => (
                                                            <span key={idx} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-600 dark:text-slate-400">
                                                                {item}
                                                            </span>
                                                        )) || <span className="italic text-slate-400 dark:text-slate-600">No details</span>}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-rose-600 dark:text-rose-400 text-xs align-top">
                                                    PKR {ret.amount?.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    ) : activeModule === 'suppliers' && summary?.detailedVendors ? (
                                        summary.detailedVendors.map((vendor, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-8 py-5 text-xs font-black text-black dark:text-slate-100 align-top">
                                                    {vendor.name}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-bold text-black dark:text-slate-100 align-top">
                                                    {vendor.phone || '-'}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-medium text-slate-500 dark:text-slate-400 align-top max-w-[200px] truncate">
                                                    {vendor.address || '-'}
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-rose-600 dark:text-rose-400 text-xs align-top">
                                                    PKR {(vendor.current_balance || vendor.balance || 0).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-5 text-right align-top">
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md tracking-wide ${(vendor.current_balance || vendor.balance || 0) > 0 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                                                        {(vendor.current_balance || vendor.balance || 0) > 0 ? 'Payment Due' : 'Clear'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : activeModule === 'customers' && summary?.detailedCustomers ? (
                                        summary.detailedCustomers.map((customer, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-8 py-5 text-xs font-black text-black dark:text-slate-100 align-top">
                                                    {customer.name}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-bold text-black dark:text-slate-100 align-top">
                                                    {customer.phone || '-'}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-medium text-slate-500 dark:text-slate-400 align-top max-w-[200px] truncate">
                                                    {customer.address || '-'}
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-teal-600 dark:text-teal-400 text-xs align-top">
                                                    PKR {(customer.current_balance || customer.balance || 0).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-5 text-right align-top">
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md tracking-wide ${(customer.current_balance || customer.balance || 0) > 0 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                                                        {(customer.current_balance || customer.balance || 0) > 0 ? 'Payment Due' : 'Clear'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : activeModule === 'hrm' && summary?.detailedHRM ? (
                                        summary.detailedHRM.map((rec, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-8 py-5 text-xs font-black text-black dark:text-slate-100 align-top font-mono tracking-tighter">
                                                    {rec.staffName}
                                                </td>
                                                <td className="px-8 py-5 text-xs font-bold text-slate-500 dark:text-slate-400 align-top">
                                                    {rec.designation || 'Staff'}
                                                </td>
                                                 <td className="px-8 py-5 text-center align-top">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${rec.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                                                        {rec.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-xs font-medium text-black dark:text-slate-100 align-top">
                                                    {new Date(rec.payment_date).toLocaleDateString()}
                                                </td>
                                                <td className="px-8 py-5 text-right font-bold text-slate-700 dark:text-slate-300 text-xs align-top">
                                                    PKR {(rec.basic_salary || 0).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-5 text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs align-top">
                                                    PKR {((rec.bonus || 0) + (rec.overtime_pay || 0)).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-5 text-right font-bold text-rose-600 dark:text-rose-400 text-xs align-top">
                                                    PKR {(rec.deductions || 0).toLocaleString()}
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-emerald-700 dark:text-emerald-400 text-xs align-top bg-emerald-50/30 dark:bg-emerald-900/20">
                                                    PKR {(rec.net_salary || 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        chartData.filter(d => activeModule === 'suppliers' || activeModule === 'expenses' || activeModule === 'hrm' || activeModule === 'netprofit' || d[config.dataKey] > 0).map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-8 py-5 text-xs font-bold text-black dark:text-slate-100 font-mono italic align-top">{row.date}</td>
                                                {activeModule === 'netprofit' ? (
                                                    <>
                                                         <td className="px-8 py-5 text-right align-top">
                                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tighter">PKR {row.sales?.toLocaleString()}</span>
                                                            <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{row.invoices || 0} Invoices</div>
                                                        </td>
                                                        <td className="px-8 py-5 text-right align-top">
                                                            <span className="text-xs font-bold text-orange-500 dark:text-orange-400 font-mono tracking-tighter">PKR {row.cogs?.toLocaleString()}</span>
                                                        </td>
                                                        <td className="px-8 py-5 text-right align-top">
                                                            <span className="text-xs font-bold text-rose-500 dark:text-rose-400 font-mono tracking-tighter">PKR {row.expenses?.toLocaleString()}</span>
                                                        </td>
                                                        <td className="px-8 py-5 text-right align-top bg-slate-50/50 dark:bg-slate-800/50">
                                                            <span className={`text-xs font-black font-mono tracking-tighter ${row.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                                PKR {row.profit?.toLocaleString()}
                                                            </span>
                                                             <div className={`text-[9px] font-black mt-0.5 ${row.profit >= 0 ? 'text-emerald-400 dark:text-emerald-500' : 'text-rose-300 dark:text-rose-500'}`}>
                                                                {row.profit >= 0 ? 'Surplus' : 'Deficit'}
                                                            </div>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-8 py-5 align-top">
                                                            <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-200 dark:border-slate-700 inline-block mr-2 group-hover:border-emerald-500 transition-colors"></div>
                                                             <span className="text-xs font-black text-black dark:text-slate-100 italic">
                                                                {activeModule === 'sales' ? `${row.invoices} Orders Recieved` :
                                                                    activeModule === 'purchases' ? `${row.invoices} Stock Invoices` :
                                                                        activeModule === 'hrm' ? `${row.invoices || summary?.employeeCount} Staff Members` :
                                                                            `Activity_ID_${i + 1} Log`}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-5 text-right font-medium text-black dark:text-slate-100 text-xs align-top">PKR {row[config.dataKey]?.toLocaleString()}</td>
                                                    </>
                                                )}
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
                                                     <p className="text-[10px] font-black text-slate-300 dark:text-slate-600">No records found</p>
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
        <div className="max-w-7xl mx-auto pb-10 min-h-screen">
            {activeModule ? renderDetailView() : renderDashboard()}
        </div>
    );
};

export default Reports;
