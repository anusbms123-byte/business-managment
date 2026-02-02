import React, { useState, useEffect } from 'react';
import { Users, Calendar, DollarSign, Plus, Search, Edit, Eye, X, Trash2, Check, UserPlus } from 'lucide-react';
import { canCreate, canEdit, canDelete } from '../utils/permissions';


const tabs = [
    { id: 'employees', label: 'Staff List', icon: Users },
    { id: 'attendance', label: 'Daily Attendance', icon: Calendar },
    { id: 'payroll', label: 'Salary Sheets', icon: DollarSign },
];

const HRM = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('employees');
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEmployees();
    }, [currentUser]);

    const loadEmployees = async () => {
        if (!currentUser?.company_id) return;
        setLoading(true);
        try {
            const data = await window.electronAPI.getEmployees(currentUser.company_id);
            setEmployees(Array.isArray(data) ? data : []);
            if (data?.success === false) console.error("Employee Error:", data.message);
        } catch (err) {
            console.error('Error loading employees:', err);
            setEmployees([]);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Employee Records</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your staff members, track attendance, and handle monthly salaries.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="flex border-b border-slate-100 bg-slate-50/20">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 px-6 py-4 text-[10px] font-bold uppercase tracking-widest transition-all relative ${activeTab === tab.id
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

                <div className="p-8">
                    {activeTab === 'employees' && <EmployeeList employees={employees} onRefresh={loadEmployees} currentUser={currentUser} loading={loading} />}
                    {activeTab === 'attendance' && <Attendance employees={employees} currentUser={currentUser} />}
                    {activeTab === 'payroll' && <Payroll employees={employees} currentUser={currentUser} />}
                </div>
            </div>
        </div>
    );
};

const EmployeeList = ({ employees, onRefresh, currentUser, loading }) => {
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '', designation: '', salary: '', hourly_rate: '', joiningDate: new Date().toISOString().split('T')[0] });
    const [saving, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = { ...formData, companyId: currentUser.company_id };
            let result;
            if (formData.id) {
                result = await window.electronAPI.updateEmployee(data);
            } else {
                result = await window.electronAPI.createEmployee(data);
            }
            if (result.success !== false) {
                setShowModal(false);
                onRefresh();
            } else {
                alert(result.message || "Error saving employee");
            }
        } catch (err) {
            alert("Error saving employee: " + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this employee?")) return;
        try {
            const result = await window.electronAPI.deleteEmployee(id);
            if (result.success !== false) {
                onRefresh();
            } else {
                alert(result.message || "Error deleting employee");
            }
        } catch (err) {
            alert("Error deleting employee: " + err.message);
        }
    };

    const filtered = (employees || []).filter(e =>
        `${e.firstName} ${e.lastName || ''}`.toLowerCase().includes(search.toLowerCase()) ||
        e.designation?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-sm"
                        placeholder="Search personnel..."
                    />
                </div>
                {canCreate('hrm') && (
                    <button
                        onClick={() => {
                            setFormData({ firstName: '', lastName: '', phone: '', designation: '', salary: '', hourly_rate: '', joiningDate: new Date().toISOString().split('T')[0] });
                            setShowModal(true);
                        }}
                        className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-xs uppercase tracking-widest"
                    >
                        <Plus size={16} />
                        <span>Onboard Employee</span>
                    </button>
                )}
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Name</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Designation</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Phone</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Salary</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">OT/Hr</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Joined</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-3 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                                        <span>Loading staff...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (filtered?.length ?? 0) === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No employees found</td>
                            </tr>
                        ) : filtered?.map((emp) => (
                            <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-slate-800 text-xs">
                                    {emp.firstName} {emp.lastName}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-tight border border-blue-100">{emp.designation}</span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-medium text-xs">{emp.phone}</td>
                                <td className="px-6 py-4 font-bold text-slate-800 text-xs">PKR {emp.salary?.toLocaleString() ?? '0'}</td>
                                <td className="px-6 py-4 font-bold text-blue-600 text-[10px]">PKR {emp.hourlyRate ?? 0}</td>
                                <td className="px-6 py-4 text-slate-400 font-bold text-[10px] uppercase">{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A'}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-1">
                                        {canEdit('hrm') && (
                                            <button onClick={() => { setFormData(emp); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit size={16} />
                                            </button>
                                        )}
                                        {canDelete('hrm') && (
                                            <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 text-left border border-slate-200">
                        <div className="flex-1 overflow-y-auto">
                            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{formData.id ? 'Edit Employee' : 'Onboard New Employee'}</h3>
                                <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><X size={18} /></button>
                            </div>
                            <form onSubmit={handleSave} className="p-8 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">First Name</label>
                                        <input required type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-bold text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Last Name</label>
                                        <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-bold text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Designation</label>
                                        <input required type="text" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-bold text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Phone Number</label>
                                        <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-bold text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Monthly Salary (PKR)</label>
                                        <input required type="number" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-bold text-sm" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Hourly OT Rate (PKR)</label>
                                        <input required type="number" value={formData.hourly_rate} onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-bold text-sm" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Joining Date</label>
                                        <input required type="date" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-bold text-sm" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors text-xs uppercase tracking-widest">Discard</button>
                                    <button type="submit" className="px-6 py-2.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all disabled:opacity-50 text-xs uppercase tracking-widest">{saving ? 'Saving...' : 'Save Employee'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Attendance = ({ employees, currentUser }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceRows, setAttendanceRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadAttendance();
    }, [date, employees]);

    const loadAttendance = async () => {
        if (!currentUser?.company_id) return;
        setLoading(true);
        try {
            const existing = await window.electronAPI.getAttendance({ companyId: currentUser.company_id, date });
            if (existing?.success === false) console.error("Attendance Error:", existing.message);

            const safeExisting = Array.isArray(existing) ? existing : [];

            // Map employees with their existing attendance status
            const rows = (employees || []).map(emp => {
                const att = safeExisting.find(a => a.employeeId === emp.id);
                return {
                    employeeId: emp.id,
                    name: `${emp.firstName} ${emp.lastName || ''}`,
                    status: att ? att.status : 'Absent',
                    checkIn: att?.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                    checkOut: att?.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                };
            });
            setAttendanceRows(rows);
        } catch (err) {
            console.error('Error loading attendance:', err);
            setAttendanceRows([]);
        }
        setLoading(false);
    };

    const handleStatusChange = (employeeId, newStatus) => {
        setAttendanceRows(rows => rows.map(r => r.employeeId === employeeId ? { ...r, status: newStatus } : r));
    };

    const saveAttendance = async () => {
        setSaving(true);
        try {
            for (const row of attendanceRows) {
                await window.electronAPI.saveAttendance({
                    employeeId: row.employeeId,
                    status: row.status,
                    date: date
                });
            }
            alert("Attendance updated successfully!");
            loadAttendance();
        } catch (err) {
            alert("Error saving attendance: " + err.message);
        }
        setSaving(false);
    };

    const stats = {
        present: (attendanceRows || []).filter(r => r.status === 'Present').length,
        absent: (attendanceRows || []).filter(r => r.status === 'Absent').length,
        late: (attendanceRows || []).filter(r => r.status === 'Late').length,
        leave: (attendanceRows || []).filter(r => r.status === 'Leave').length,
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center space-x-3">
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-xl border-l-4 border-l-emerald-500 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Present Today</p>
                    <p className="text-xl font-bold text-slate-800">{stats.present}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border-l-4 border-l-rose-500 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Absent Today</p>
                    <p className="text-xl font-bold text-slate-800">{stats.absent}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border-l-4 border-l-amber-500 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Late Arrivals</p>
                    <p className="text-xl font-bold text-slate-800">{stats.late}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border-l-4 border-l-slate-400 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">On Leaves</p>
                    <p className="text-xl font-bold text-slate-800">{stats.leave}</p>
                </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Employee</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Check In</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Check Out</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Loading records...</td>
                            </tr>
                        ) : (attendanceRows?.length ?? 0) === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No employees available</td>
                            </tr>
                        ) : attendanceRows?.map((att) => (
                            <tr key={att.employeeId} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-800 text-xs uppercase tracking-tight">{att.name}</td>
                                <td className="px-6 py-4 font-bold text-slate-600 text-xs">{att.checkIn}</td>
                                <td className="px-6 py-4 font-bold text-slate-400 text-xs">{att.checkOut}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-tight ${att.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        att.status === 'Late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-rose-50 text-rose-600 border-rose-100'
                                        }`}>{att.status}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <select
                                        value={att.status}
                                        onChange={(e) => handleStatusChange(att.employeeId, e.target.value)}
                                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-600 uppercase tracking-tight outline-none focus:border-blue-500"
                                    >
                                        <option value="Present">Present</option>
                                        <option value="Absent">Absent</option>
                                        <option value="Late">Late</option>
                                        <option value="Leave">Leave</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {canEdit('hrm') && (
                <button
                    onClick={saveAttendance}
                    className="flex items-center justify-center px-8 py-3 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50"
                >
                    {saving ? 'Updating...' : 'Save Attendance Record'}
                </button>
            )}
        </div>
    );
};

const Payroll = ({ employees, currentUser }) => {
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [showModal, setShowModal] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [paymentData, setPaymentData] = useState({ bonus: 0, otHours: 0, deductions: 0, notes: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSalaries();
    }, [currentUser, month]);

    const loadSalaries = async () => {
        if (!currentUser?.company_id) return;
        setLoading(true);
        try {
            const data = await window.electronAPI.getSalaries({ companyId: currentUser.company_id, month });
            setSalaries(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading salaries:', err);
        }
        setLoading(false);
    };

    const handlePaySalary = async (e) => {
        e.preventDefault();
        if (!selectedEmp) return;
        setSaving(true);
        try {
            const otPay = (parseFloat(paymentData.otHours) || 0) * (selectedEmp.hourlyRate || 0);
            const netPay = (selectedEmp.salary || 0) + (parseFloat(paymentData.bonus) || 0) + otPay - (parseFloat(paymentData.deductions) || 0);

            const payload = {
                companyId: currentUser.company_id,
                employeeId: selectedEmp.id,
                month: month,
                baseSalary: selectedEmp.salary,
                bonus: parseFloat(paymentData.bonus) || 0,
                overtimeHours: parseFloat(paymentData.otHours) || 0,
                overtimePay: otPay,
                deductions: parseFloat(paymentData.deductions) || 0,
                netSalary: netPay,
                notes: paymentData.notes
            };

            const result = await window.electronAPI.createSalary(payload);
            if (result.success !== false) {
                setShowModal(false);
                loadSalaries();
            } else {
                alert(result.message || "Error saving salary");
            }
        } catch (err) {
            alert("Error: " + err.message);
        }
        setSaving(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                    />
                </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Employee</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Basic Pay</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Bonus/OT</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Net Salary</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan="6" className="px-6 py-10 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading payroll...</td></tr>
                        ) : employees.map((emp) => {
                            const record = salaries.find(s => s.employeeId === emp.id);
                            return (
                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-slate-800 text-xs uppercase tracking-tight">{emp.firstName} {emp.lastName}</td>
                                    <td className="px-6 py-4 font-bold text-slate-600 text-xs">PKR {emp.salary?.toLocaleString() ?? '0'}</td>
                                    <td className="px-6 py-4 font-bold text-emerald-600 text-[10px]">
                                        {record ? `+PKR ${(record.bonus + record.overtimePay).toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-blue-600 text-xs">
                                        PKR {record ? record.netSalary.toLocaleString() : emp.salary?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {record ? (
                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold uppercase tracking-tight border border-emerald-100">Paid</span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded text-[10px] font-bold uppercase tracking-tight border border-slate-100">Unpaid</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {record ? (
                                            <button className="text-blue-600 text-[10px] font-bold uppercase tracking-widest hover:underline decoration-2 underline-offset-4">View Slip</button>
                                        ) : (
                                            <button
                                                onClick={() => { setSelectedEmp(emp); setPaymentData({ bonus: 0, otHours: 0, deductions: 0, notes: '' }); setShowModal(true); }}
                                                className="text-emerald-600 text-[10px] font-bold uppercase tracking-widest hover:underline decoration-2 underline-offset-4"
                                            >
                                                Pay Now
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Payment Modal */}
            {showModal && selectedEmp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 text-left border border-slate-200">
                        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Generate Payroll: {selectedEmp.firstName}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={handlePaySalary} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Overtime Hours</label>
                                    <input type="number" step="0.5" value={paymentData.otHours} onChange={(e) => setPaymentData({ ...paymentData, otHours: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-bold text-sm" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Bonus (PKR)</label>
                                    <input type="number" value={paymentData.bonus} onChange={(e) => setPaymentData({ ...paymentData, bonus: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-bold text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Deductions (PKR)</label>
                                <input type="number" value={paymentData.deductions} onChange={(e) => setPaymentData({ ...paymentData, deductions: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none font-bold text-sm" />
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                                    <span>Calculation Preview</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-bold text-slate-600">
                                        <span>Base Salary</span>
                                        <span>PKR {selectedEmp.salary?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-emerald-600">
                                        <span>OT Pay ({paymentData.otHours} hr x {selectedEmp.hourlyRate})</span>
                                        <span>+PKR {((parseFloat(paymentData.otHours) || 0) * (selectedEmp.hourlyRate || 0)).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-emerald-600">
                                        <span>Bonus</span>
                                        <span>+PKR {(parseFloat(paymentData.bonus) || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-rose-600">
                                        <span>Deductions</span>
                                        <span>-PKR {(parseFloat(paymentData.deductions) || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between text-sm font-black text-blue-600">
                                        <span>Net Payable</span>
                                        <span>PKR {((selectedEmp.salary || 0) + (parseFloat(paymentData.bonus) || 0) + ((parseFloat(paymentData.otHours) || 0) * (selectedEmp.hourlyRate || 0)) - (parseFloat(paymentData.deductions) || 0)).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={saving} className="w-full py-3 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all text-xs uppercase tracking-widest shadow-lg shadow-blue-100">
                                {saving ? 'Processing...' : 'Confirm & Generate Slip'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRM;

