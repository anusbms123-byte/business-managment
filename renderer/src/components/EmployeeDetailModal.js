
import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';

const EmployeeDetailModal = ({ employee, onClose }) => {
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, leave: 0 });
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Date filtering
    const today = new Date().toISOString().split('T')[0];
    const [dateRange, setDateRange] = useState({ start: today, end: today });

    const loadDetails = async () => {
        if (!employee?.id) return;
        setLoading(true);
        try {
            const data = await window.electronAPI.getEmployeeDetails({
                employeeId: employee.id,
                startDate: dateRange.start,
                endDate: dateRange.end
            });
            setStats(data?.stats || { present: 0, absent: 0, late: 0, leave: 0 });
            setLogs(data?.logs || []);
        } catch (err) {
            console.error("Error loading employee details:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDetails();
    }, [employee, dateRange.start, dateRange.end]);

    if (!employee) return null;

    return (
        <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-blue-900/20 dark:shadow-none">
                        {employee.firstName?.[0]}{employee.lastName?.[0]}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{employee.firstName} {employee.lastName}</h2>
                        <div className="flex items-center gap-3 mt-1.5">
                            <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded text-[10px] font-bold uppercase tracking-tight border border-blue-200 dark:border-blue-800">{employee.designation}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${employee.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {employee.isActive ? '• Active' : '• Inactive'}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">• Joined {new Date(employee.joiningDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                {/* Date Filter */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
                        <h3 className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.2em] italic">Attendance History</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">From</span>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="text-[10px] font-bold text-slate-900 dark:text-slate-100 outline-none uppercase bg-transparent cursor-pointer"
                            />
                        </div>
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">To</span>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="text-[10px] font-bold text-slate-900 dark:text-slate-100 outline-none uppercase bg-transparent cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Total Present</div>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{loading ? '-' : stats.present}</div>
                    </div>
                    <div className="bg-rose-50/50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-800/50">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1">Total Absent</div>
                        <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">{loading ? '-' : stats.absent}</div>
                    </div>
                    <div className="bg-amber-50/50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800/50">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">Total Late</div>
                        <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{loading ? '-' : stats.late}</div>
                    </div>
                    <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">Total Leaves</div>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{loading ? '-' : stats.leave}</div>
                    </div>
                </div>

                {/* Recent Activity */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
                    Activity
                </h3>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Check In</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Check Out</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan="4" className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Loading history...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">No attendance records found</td></tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${log.status === 'Present' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' :
                                            log.status === 'Absent' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800' :
                                                log.status === 'Late' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800' :
                                                    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-xs font-mono text-slate-500 dark:text-slate-400">
                                        {log.checkIn ? new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-xs font-mono text-slate-500 dark:text-slate-400 text-right">
                                        {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center">
                <button onClick={onClose} className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    Close
                </button>
            </div>
        </div>

    );
};

export default EmployeeDetailModal;
