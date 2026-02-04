import React, { useState } from 'react';
import { List, FileEdit, Receipt, BookOpen, Scale, Plus, Info, Check } from 'lucide-react';
import { canCreate, canEdit, canDelete } from '../utils/permissions';


const tabs = [
    { id: 'chart', label: 'Account List', icon: List },
    { id: 'journal', label: 'Entry Book', icon: FileEdit },
    { id: 'expenses', label: 'Expense Log', icon: Receipt },
    { id: 'ledger', label: 'Ledger Book', icon: BookOpen },
    { id: 'trial', label: 'Balance Check', icon: Scale },
];

const Accounting = () => {
    const [activeTab, setActiveTab] = useState('chart');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Financial Accounts</h1>
                    <p className="text-slate-500 text-sm mt-1">Record your financial transactions and manage ledger balances.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                {/* Modern Tab Bar */}
                <div className="flex items-center px-4 bg-slate-50/20 border-b border-slate-100 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center space-x-3 px-6 py-4 text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap group ${activeTab === tab.id
                                ? 'text-blue-600'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <tab.icon size={16} />
                            <span>{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-8 flex-1 bg-white">
                    {activeTab === 'chart' && <ChartOfAccounts />}
                    {activeTab === 'journal' && <JournalEntries />}
                    {activeTab === 'expenses' && <ExpenseTracking />}
                    {activeTab === 'ledger' && <GeneralLedger />}
                    {activeTab === 'trial' && <TrialBalance />}
                </div>
            </div>
        </div>
    );
};

const ChartOfAccounts = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-end">
            {canCreate('accounting') && (
                <button className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-[10px] uppercase tracking-widest">
                    <Plus size={16} />
                    <span>Add Account</span>
                </button>
            )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
                { type: 'Assets', accounts: ['Cash in Hand', 'Bank Account', 'Accounts Receivable', 'Inventory'], color: 'blue' },
                { type: 'Liabilities', accounts: ['Accounts Payable', 'Loans Payable'], color: 'rose' },
                { type: 'Equity', accounts: ['Owner Capital', 'Retained Earnings'], color: 'slate' },
                { type: 'Income', accounts: ['Sales Revenue', 'Service Income'], color: 'emerald' },
                { type: 'Expenses', accounts: ['Rent', 'Utilities', 'Salaries', 'Supplies'], color: 'amber' },
            ].map((category, i) => (
                <div key={i} className="flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <div className={`w-1 h-3.5 bg-blue-600 rounded-full`}></div>
                            {category.type}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{category.accounts.length} ACCOUNTS</span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="divide-y divide-slate-50">
                            {category.accounts.map((account, j) => (
                                <div key={j} className="px-5 py-3.5 flex justify-between items-center hover:bg-slate-50/50 group transition-all">
                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{account}</span>
                                    <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 hover:underline decoration-2 underline-offset-4 transition-all">View</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const JournalEntries = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-end">
            {canCreate('accounting') && (
                <button className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-[10px] uppercase tracking-widest">
                    <Plus size={16} />
                    <span>New Journal Entry</span>
                </button>
            )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Post Date</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Ref ID</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">GL Account</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Debit</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Credit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        <tr className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-tight">Jan 12, 2026</td>
                            <td className="px-6 py-4 text-xs font-bold text-black uppercase tracking-tight">JE-001</td>
                            <td className="px-6 py-4 text-xs font-bold text-black uppercase tracking-tight">Cash in Hand</td>
                            <td className="px-6 py-4 text-right text-xs font-bold text-emerald-600 tracking-tight">PKR 10,000</td>
                            <td className="px-6 py-4 text-right text-xs font-bold text-slate-400 tracking-tight">—</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-tight">Jan 12, 2026</td>
                            <td className="px-6 py-4 text-xs font-bold text-black uppercase tracking-tight">JE-001</td>
                            <td className="px-6 py-4 text-xs font-bold text-black uppercase tracking-tight pl-8">Sales Revenue</td>
                            <td className="px-6 py-4 text-right text-xs font-bold text-slate-400 tracking-tight">—</td>
                            <td className="px-6 py-4 text-right text-xs font-bold text-rose-600 tracking-tight">PKR 10,000</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const ExpenseTracking = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                Operational Expenditures
            </h3>
            {canCreate('accounting') && (
                <button className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-[10px] uppercase tracking-widest">
                    <Plus size={16} />
                    <span>Add Expense</span>
                </button>
            )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border-l-4 border-l-rose-500 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Today's Total</p>
                <p className="text-xl font-bold text-slate-800">PKR 2,500</p>
            </div>
            <div className="p-4 bg-white rounded-xl border-l-4 border-l-amber-500 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Weekly</p>
                <p className="text-xl font-bold text-slate-800">PKR 12,000</p>
            </div>
            <div className="p-4 bg-white rounded-xl border-l-4 border-l-emerald-500 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly</p>
                <p className="text-xl font-bold text-slate-800">PKR 45,000</p>
            </div>
            <div className="p-4 bg-white rounded-xl border-l-4 border-l-slate-400 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Categories</p>
                <p className="text-xl font-bold text-slate-800">8 Active</p>
            </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Date</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Category</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Description</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {[
                            { date: 'Jan 12, 2026', category: 'Utilities', desc: 'Electricity Bill Payment', amount: 1500 },
                            { date: 'Jan 12, 2026', category: 'Tea/Snacks', desc: 'Daily tea for office', amount: 500 },
                            { date: 'Jan 11, 2026', category: 'Rent', desc: 'Shop rent Jan 2026', amount: 25000 },
                        ].map((expense, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-tight">{expense.date}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded text-[10px] font-bold uppercase tracking-tight border border-slate-100">
                                        {expense.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-800 uppercase tracking-tight">{expense.desc}</td>
                                <td className="px-6 py-4 text-right text-xs font-bold text-rose-600 tracking-tight">PKR {expense.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const GeneralLedger = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 w-full md:w-auto">
                <select className="flex-1 md:w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 uppercase tracking-widest outline-none focus:border-blue-500 transition-all">
                    <option>Select General Account</option>
                    <option>Cash in Hand</option>
                    <option>Bank Account</option>
                    <option>Sales Revenue</option>
                </select>
                <button className="px-6 py-2 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-[10px] uppercase tracking-widest">Generate</button>
            </div>
            <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-4 decoration-blue-200">Export Ledger</button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Post Date</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Transaction Details</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Debit</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Credit</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Running Balance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        <tr className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-tight">Jan 01, 2026</td>
                            <td className="px-6 py-4 text-xs font-bold text-black uppercase tracking-tight">Opening Balance Brought Forward</td>
                            <td className="px-6 py-4 text-right text-xs font-bold text-emerald-600 tracking-tight">PKR 100,000</td>
                            <td className="px-6 py-4 text-right text-xs font-bold text-slate-400 tracking-tight">—</td>
                            <td className="px-6 py-4 text-right text-xs font-bold text-black tracking-tight">PKR 100,000</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-tight">Jan 12, 2026</td>
                            <td className="px-6 py-4 text-xs font-bold text-black uppercase tracking-tight cursor-pointer hover:underline">Sale Transaction - INV-1023</td>
                            <td className="px-6 py-4 text-right text-xs font-bold text-emerald-600 tracking-tight">PKR 15,000</td>
                            <td className="px-6 py-4 text-right text-xs font-bold text-slate-400 tracking-tight">—</td>
                            <td className="px-6 py-4 text-right text-xs font-bold text-black tracking-tight">PKR 115,000</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const TrialBalance = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <Info size={16} />
            Check all balanced ledger positions across all organizations.
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50/80">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Mapped Account Profile</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Debit Balance</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Credit Balance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {[
                            { account: 'Cash in Hand', debit: 115000, credit: 0 },
                            { account: 'Accounts Receivable', debit: 23500, credit: 0 },
                            { account: 'Inventory Assets', debit: 250000, credit: 0 },
                            { account: 'Accounts Payable', debit: 0, credit: 35000 },
                            { account: 'Principal Equity', debit: 0, credit: 300000 },
                            { account: 'Corporate Revenue', debit: 0, credit: 85000 },
                            { account: 'Operations Expenses', debit: 31500, credit: 0 },
                        ].map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-all group">
                                <td className="px-6 py-4 font-bold text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{row.account}</td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600 tracking-tight">{row.debit > 0 ? `PKR ${row.debit.toLocaleString()}` : '—'}</td>
                                <td className="px-6 py-4 text-right font-bold text-rose-600 tracking-tight">{row.credit > 0 ? `PKR ${row.credit.toLocaleString()}` : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50/50 font-black">
                        <tr>
                            <td className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Balanced Position</td>
                            <td className="px-6 py-5 text-right text-sm text-slate-800 tracking-tight border-t-2 border-slate-100">PKR 420,000</td>
                            <td className="px-6 py-5 text-right text-sm text-slate-800 tracking-tight border-t-2 border-slate-100">PKR 420,000</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-center font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
            <Check size={16} />
            Ledger Audit Passed — Financial Records are Balanced
        </div>
    </div>
);

export default Accounting;
