
import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';

const EmployeeDetailModal = ({ employee, onClose }) => {
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, leave: 0 });
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDetails = async () => {
            if (!employee?.id) return;
            try {
                const data = await window.electronAPI.getEmployeeDetails(employee.id);
                setStats(data?.stats || { present: 0, absent: 0, late: 0, leave: 0 });
                setLogs(data?.logs || []);
            } catch (err) {
                console.error("Error loading employee details:", err);
            } finally {
                setLoading(false);
            }
        };
        loadDetails();
    }, [employee]);

    if (!employee) return null;

    return (
        <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-blue-900/20">
                        {employee.firstName?.[0]}{employee.lastName?.[0]}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{employee.firstName} {employee.lastName}</h2>
                        <div className="flex items-center gap-3 mt-1.5">
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-tight">{employee.designation}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${employee.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {employee.isActive ? '• Active' : '• Inactive'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">• Joined {new Date(employee.joiningDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Total Present</div>
                        <div className="text-2xl font-bold text-emerald-700">{loading ? '-' : stats.present}</div>
                    </div>
                    <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-rose-600 mb-1">Total Absent</div>
                        <div className="text-2xl font-bold text-rose-700">{loading ? '-' : stats.absent}</div>
                    </div>
                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Total Late</div>
                        <div className="text-2xl font-bold text-amber-700">{loading ? '-' : stats.late}</div>
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">Total Leaves</div>
                        <div className="text-2xl font-bold text-blue-700">{loading ? '-' : stats.leave}</div>
                    </div>
                </div>

                {/* Recent Activity */}
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Calendar size={16} className="text-blue-600" />
                    Recent Activity Output
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Check In</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Check Out</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="4" className="p-8 text-center text-xs text-slate-400">Loading history...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-xs text-slate-400">No attendance records found</td></tr>
                            ) : logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-3 text-xs font-bold text-slate-700">
                                        {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${log.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            log.status === 'Absent' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                log.status === 'Late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-xs font-mono text-slate-500">
                                        {log.check_in ? new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-xs font-mono text-slate-500 text-right">
                                        {log.check_out ? new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                <button onClick={onClose} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                    Close Details
                </button>
            </div>
        </div>
    );
};

export default EmployeeDetailModal;
