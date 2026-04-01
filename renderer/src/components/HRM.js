import React, { useState, useEffect } from 'react';
import { Users, Calendar, DollarSign, Plus, Search, Edit, Eye, X, Trash2, Check, UserPlus } from 'lucide-react';
import { canCreate, canEdit, canDelete } from '../utils/permissions';
import { useDialog } from '../context/DialogContext';
import EmployeeDetailModal from './EmployeeDetailModal';


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
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    return (
        <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700">
            {selectedEmployee && (
                <div role="presentation" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <EmployeeDetailModal
                        employee={selectedEmployee}
                        onClose={() => setSelectedEmployee(null)}
                    />
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
                <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/20">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-2 px-6 py-4 text-sm font-semibold transition-all relative tracking-tight ${activeTab === tab.id
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            <tab.icon size={16} />
                            <span>{tab.label}</span>
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-500 rounded-t-full"></div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-8">
                    {activeTab === 'employees' && <EmployeeList employees={employees} onRefresh={loadEmployees} currentUser={currentUser} loading={loading} setSelectedEmployee={setSelectedEmployee} />}
                    {activeTab === 'attendance' && <Attendance employees={employees} currentUser={currentUser} />}
                    {activeTab === 'payroll' && <Payroll employees={employees} currentUser={currentUser} />}
                </div>
            </div>
        </div>
    );
};

const EmployeeList = ({ employees, onRefresh, currentUser, loading, setSelectedEmployee }) => {
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '', designation: '', salary: '', hourly_rate: '', joiningDate: new Date().toISOString().split('T')[0], isActive: true });
    const [saving, setSaving] = useState(false);

    const { showAlert, showConfirm, showError } = useDialog();

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            console.log("[HRM] Saving Employee Data:", formData);
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
                showError(result.message || "Error saving employee");
            }
        } catch (err) {
            showError("Error saving employee: " + err.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        showConfirm("Are you sure you want to delete this employee?", async () => {
            try {
                const result = await window.electronAPI.deleteEmployee(id);
                if (result.success !== false) {
                    onRefresh();
                } else {
                    showError(result.message || "Error deleting employee");
                }
            } catch (err) {
                showError("Error deleting employee: " + err.message);
            }
        });
    };

    const filtered = (employees || []).filter(e =>
        `${e.firstName} ${e.lastName || ''}`.toLowerCase().includes(search.toLowerCase()) ||
        e.designation?.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toString().toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative group w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-semibold text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        placeholder="Search here..."
                    />
                </div>
                {canCreate('hrm') && (
                    <button
                        onClick={() => {
                            setFormData({ firstName: '', lastName: '', phone: '', designation: '', salary: '', hourly_rate: '', joiningDate: new Date().toISOString().split('T')[0], isActive: true });
                            setShowModal(true);
                        }}
                        className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all active:scale-95 text-sm tracking-tight shadow-sm"
                    >
                        <Plus size={16} />
                        <span>Add staff</span>
                    </button>
                )}
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 transition-colors">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">ID</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">Name</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">Phone</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">Salary</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">OT/hr</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">Joined</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 text-center tracking-tight">Designation</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 text-right tracking-tight">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-3 border-slate-100 border-t-emerald-600 rounded-full animate-spin"></div>
                                        <span>Loading...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (filtered?.length ?? 0) === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No employees found</td>
                            </tr>
                        ) : filtered?.map((emp) => (
                            <tr
                                key={emp.id}
                                onClick={() => setSelectedEmployee(emp)}
                                className="hover:bg-emerald-50/40 dark:hover:bg-emerald-900/20 transition-colors group cursor-pointer border-b border-slate-50 dark:border-slate-800 relative"
                            >
                                <td className="px-6 py-4 font-semibold text-black dark:text-slate-200 text-sm tracking-tight">
                                    KFD-{Number(emp.id) + 99}
                                </td>
                                <td className="px-6 py-4 font-semibold text-black dark:text-slate-200 text-sm">
                                    {emp.firstName} {emp.lastName}
                                </td>
                                <td className="px-6 py-4 text-black dark:text-slate-300 font-semibold text-sm">{emp.phone}</td>
                                <td className="px-6 py-4 font-semibold text-black dark:text-slate-200 text-sm">PKR {emp.salary?.toLocaleString() ?? '0'}</td>
                                <td className="px-6 py-4 font-semibold text-black dark:text-slate-200 text-sm">PKR {emp.hourlyRate ?? 0}</td>
                                <td className="px-6 py-4 text-black dark:text-slate-300 font-medium text-sm">{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A'}</td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-sm font-semibold tracking-tight border border-emerald-100 dark:border-emerald-800">{emp.designation}</span>
                                        <span className={`text-[10px] font-bold ${emp.isActive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {emp.isActive ? '• Active' : '• Inactive'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-1">
                                        {canEdit('hrm') && (
                                            <button onClick={(e) => { e.stopPropagation(); setFormData({ ...emp }); setShowModal(true); }} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors">
                                                <Edit size={16} />
                                            </button>
                                        )}
                                        {canDelete('hrm') && (
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(emp.id); }} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
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
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-white dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                    {/* Full-Page Header */}
                    <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <UserPlus size={22} />
                            </div>
                            <div>
                                <h3 className="text-sm md:text-xl font-semibold text-black dark:text-white tracking-tight">{formData.id ? 'Edit staff' : 'Add staff'}</h3>
                                <p className="text-sm text-black dark:text-slate-400 font-semibold mt-0.5 tracking-tight">Staff management</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowModal(false)}
                            className="p-3 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
                        >
                            <span className="text-sm font-semibold hidden md:block text-slate-400 dark:text-slate-500 tracking-tight">Close</span>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900">
                        <div className="max-w-5xl mx-auto w-full p-8 pb-24">
                            <form onSubmit={handleSave} className="space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="text-left">
                                        <label className="block text-sm font-semibold text-black dark:text-slate-400 ml-1 mb-1.5 tracking-tight">First name</label>
                                        <input required type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 outline-none font-semibold text-sm text-black dark:text-slate-100 transition-all" />
                                    </div>
                                    <div className="text-left">
                                        <label className="block text-sm font-semibold text-black dark:text-slate-400 ml-1 mb-1.5 tracking-tight">Last name</label>
                                        <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 outline-none font-semibold text-sm text-black dark:text-slate-100 transition-all" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="text-left">
                                        <label className="block text-sm font-semibold text-black dark:text-slate-400 ml-1 mb-1.5 tracking-tight">Designation</label>
                                        <input required type="text" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 dark:focus:border-emerald-600 outline-none font-semibold text-sm text-black dark:text-slate-100 transition-all" placeholder="ex. Manager" />
                                    </div>
                                    <div className="text-left">
                                        <label className="block text-sm font-semibold text-black dark:text-slate-400 ml-1 mb-1.5 tracking-tight">Phone number</label>
                                        <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 dark:focus:border-emerald-600 outline-none font-semibold text-sm text-black dark:text-slate-100 transition-all" placeholder="0321123456" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="text-left">
                                        <label className="block text-sm font-semibold text-black dark:text-slate-400 ml-1 mb-1.5 tracking-tight">Basic salary (PKR)</label>
                                        <input required type="number" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 dark:focus:border-emerald-600 outline-none font-semibold text-sm text-black dark:text-slate-100 transition-all" placeholder="0" />
                                    </div>
                                    <div className="text-left">
                                        <label className="block text-sm font-semibold text-black dark:text-slate-400 ml-1 mb-1.5 tracking-tight">Hourly rate (PKR)</label>
                                        <input required type="number" value={formData.hourly_rate} onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 dark:focus:border-emerald-600 outline-none font-semibold text-sm text-black dark:text-slate-100 transition-all" placeholder="0" />
                                    </div>
                                    <div className="text-left">
                                        <label className="block text-sm font-semibold text-black dark:text-slate-400 ml-1 mb-1.5 tracking-tight">Joining date</label>
                                        <input required type="date" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 dark:focus:border-emerald-600 outline-none font-semibold text-sm text-black dark:text-slate-100 transition-all" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="flex items-center gap-4 text-left">
                                        <label className="text-sm font-semibold text-black dark:text-slate-400 tracking-tight">Active status:</label>
                                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, isActive: true })}
                                                className={`px-4 py-1.5 rounded-md text-sm font-semibold tracking-tight transition-all ${formData.isActive ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                            >
                                                Active
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, isActive: false })}
                                                className={`px-4 py-1.5 rounded-md text-sm font-semibold tracking-tight transition-all ${!formData.isActive ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                            >
                                                Inactive
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3 text-slate-400 dark:text-slate-500 font-semibold hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-sm hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl tracking-tight">Cancel</button>
                                    <button type="submit" className="px-10 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm shadow-sm tracking-tight">{saving ? 'Loading...' : 'Save now'}</button>
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
    const [search, setSearch] = useState('');

    const { showAlert, showError } = useDialog();

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
                const att = safeExisting.find(a =>
                    (a.localEmployeeId !== null && Number(a.localEmployeeId) === Number(emp.id)) ||
                    (a.employeeGlobalId !== null && a.employeeGlobalId === emp.global_id) ||
                    (a.employeeId === emp.global_id)
                );
                return {
                    employeeId: emp.id,
                    name: `${emp.firstName} ${emp.lastName || ''}`,
                    status: att ? att.status : 'Absent',
                    checkIn: att?.checkIn ? new Date(att.checkIn).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
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
            showAlert("Attendance updated successfully!");
            loadAttendance();
        } catch (err) {
            showError("Error saving attendance: " + err.message);
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-black dark:text-slate-100 outline-none focus:border-emerald-500 transition-all tracking-tight"
                />
                <div className="relative group w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        placeholder="Search here..."
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border-l-4 border-l-emerald-500 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Present</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.present}</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border-l-4 border-l-rose-500 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Absent</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.absent}</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border-l-4 border-l-amber-500 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Late</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.late}</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border-l-4 border-l-slate-400 dark:border-l-slate-600 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                    <p className="text-[10px] font-bold text-black dark:text-slate-500 mb-1">Leave</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.leave}</p>
                </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 transition-colors">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">ID</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">Employee</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">Check in</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">Status</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 text-right tracking-tight">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Loading...</td>
                            </tr>
                        ) : (attendanceRows?.length ?? 0) === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-20 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No employees available</td>
                            </tr>
                        ) : attendanceRows?.filter(att =>
                            att.name.toLowerCase().includes(search.toLowerCase()) ||
                            att.employeeId.toString().toLowerCase().includes(search.toLowerCase())
                        ).map((att) => (
                            <tr key={att.employeeId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-black dark:text-slate-200 text-sm tracking-tight">
                                    KFD-{Number(att.employeeId) + 99}
                                </td>
                                <td className="px-6 py-4 font-semibold text-black dark:text-slate-300 text-sm tracking-tight">{att.name}</td>
                                <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400 text-sm">{att.checkIn}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded text-sm font-semibold border tracking-tight ${att.status === 'Present' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' :
                                        att.status === 'Late' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800' :
                                            'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800'
                                        }`}>{att.status}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <select
                                        value={att.status}
                                        onChange={(e) => handleStatusChange(att.employeeId, e.target.value)}
                                        className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-semibold text-black dark:text-slate-300 tracking-tight outline-none focus:border-emerald-500"
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
                    className="flex items-center justify-center px-8 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all active:scale-95 text-sm shadow-sm disabled:opacity-50 tracking-tight"
                >
                    {saving ? 'Loading...' : 'Save now'}
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
    const [viewingSlip, setViewingSlip] = useState(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const { showError, showConfirm, showAlert } = useDialog();

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

            let result;
            if (isEditing && paymentData.id) {
                payload.id = paymentData.id;
                payload.global_id = paymentData.global_id;
                result = await window.electronAPI.updateSalary(payload);
            } else {
                result = await window.electronAPI.createSalary(payload);
            }

            if (result.success !== false) {
                setShowModal(false);
                setIsEditing(false);
                loadSalaries();
                showAlert(isEditing ? "Salary record updated!" : "Salary payment processed!");
            } else {
                showError(result.message || "Error saving salary");
            }
        } catch (err) {
            showError("Error: " + err.message);
        }
        setSaving(false);
    };

    const handleDeleteSalary = async (id) => {
        showConfirm("Are you sure you want to delete this salary record?", async () => {
            try {
                const result = await window.electronAPI.deleteSalary(id);
                if (result.success !== false) {
                    loadSalaries();
                    showAlert("Salary record deleted.");
                } else {
                    showError(result.message || "Error deleting salary record");
                }
            } catch (err) {
                showError("Error deleting: " + err.message);
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-black dark:text-slate-100 outline-none focus:border-emerald-500 dark:focus:border-emerald-600 transition-all tracking-tight"
                />
                <div className="relative group w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all text-black dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        placeholder="Search here..."
                    />
                </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 transition-colors">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">ID</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">Employee</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">Basic pay</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">Bonus/OT</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">Net salary</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 tracking-tight">Status</th>
                            <th className="px-6 py-4 text-sm font-semibold text-black dark:text-white border-b border-slate-200 dark:border-slate-800 text-right tracking-tight">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan="7" className="px-6 py-10 text-center text-sm font-semibold text-black dark:text-slate-400 tracking-tight">Loading...</td></tr>
                        ) : employees.filter(emp =>
                            `${emp.firstName} ${emp.lastName || ''}`.toLowerCase().includes(search.toLowerCase()) ||
                            emp.id.toString().toLowerCase().includes(search.toLowerCase())
                        ).map((emp) => {
                            const record = salaries.find(s => String(s.employeeId) === String(emp.id) || s.employeeId === emp.global_id);
                            return (
                                <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 font-semibold text-black dark:text-slate-200 text-sm tracking-tight">
                                        KFD-{Number(emp.id) + 99}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-black dark:text-slate-300 text-sm tracking-tight">{emp.firstName} {emp.lastName}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400 text-sm">PKR {emp.salary?.toLocaleString() ?? '0'}</td>
                                    <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                                        {record ? `+PKR ${(record.bonus + record.overtimePay).toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                                        PKR {record ? record.netSalary.toLocaleString() : emp.salary?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {record ? (
                                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded text-sm font-semibold tracking-tight border border-emerald-100 dark:border-emerald-800">Paid</span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded text-sm font-semibold tracking-tight border border-slate-100 dark:border-slate-800">Unpaid</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            {record ? (
                                                <>
                                                    <button
                                                        onClick={() => setViewingSlip(record)}
                                                        className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                                        title="View Slip"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedEmp(emp);
                                                            setPaymentData({
                                                                id: record.id,
                                                                global_id: record.global_id,
                                                                bonus: record.bonus,
                                                                otHours: record.overtimeHours,
                                                                deductions: record.deductions,
                                                                notes: record.notes || ''
                                                            });
                                                            setIsEditing(true);
                                                            setShowModal(true);
                                                        }}
                                                        className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                                                        title="Edit Payment"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSalary(record.id)}
                                                        className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setSelectedEmp(emp);
                                                        setPaymentData({ bonus: 0, otHours: 0, deductions: 0, notes: '' });
                                                        setIsEditing(false);
                                                        setShowModal(true);
                                                    }}
                                                    className="px-3 py-1 bg-emerald-600 dark:bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all shadow-sm active:scale-95 tracking-tight"
                                                >
                                                    Pay now
                                                </button>
                                            )}
                                        </div>
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
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 text-left border border-slate-200 dark:border-slate-800">
                        <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <DollarSign size={22} />
                                </div>
                                <h3 className="text-sm font-semibold text-black dark:text-slate-100 tracking-tight">{isEditing ? 'Edit payroll' : 'Add payroll'}</h3>
                            </div>
                            <button onClick={() => { setShowModal(false); setIsEditing(false); }} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={handlePaySalary} className="p-8 space-y-6">
                             <div className="grid grid-cols-2 gap-4 text-left">
                                 <div>
                                     <label className="block text-sm font-semibold text-black dark:text-slate-500 tracking-tight ml-1 mb-1.5">Overtime hours</label>
                                     <input type="number" step="0.5" value={paymentData.otHours} onChange={(e) => setPaymentData({ ...paymentData, otHours: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 outline-none font-semibold text-sm text-black dark:text-slate-100 transition-all" />
                                 </div>
                                 <div>
                                     <label className="block text-sm font-semibold text-black dark:text-slate-500 tracking-tight ml-1 mb-1.5">Bonus (PKR)</label>
                                     <input type="number" value={paymentData.bonus} onChange={(e) => setPaymentData({ ...paymentData, bonus: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 outline-none font-semibold text-sm text-black dark:text-slate-100 transition-all" />
                                 </div>
                             </div>
                             <div className="text-left">
                                 <label className="block text-sm font-semibold text-black dark:text-slate-500 tracking-tight ml-1 mb-1.5">Deductions (PKR)</label>
                                 <input type="number" value={paymentData.deductions} onChange={(e) => setPaymentData({ ...paymentData, deductions: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-500 outline-none font-semibold text-sm text-black dark:text-slate-100 transition-all" />
                             </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between text-sm font-semibold text-black dark:text-slate-500 tracking-tight mb-2">
                                    <span>Summary</span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-sm font-semibold text-slate-600 dark:text-slate-400">
                                        <span>Base Salary</span>
                                        <span className="text-black dark:text-slate-200">PKR {selectedEmp.salary?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-semibold text-black dark:text-slate-300">
                                        <span>OT pay ({paymentData.otHours} hr x {selectedEmp.hourlyRate || 0})</span>
                                        <span className="text-emerald-600 dark:text-emerald-400">+PKR {((parseFloat(paymentData.otHours) || 0) * (selectedEmp.hourlyRate || 0)).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-semibold text-black dark:text-slate-300">
                                        <span>Bonus</span>
                                        <span className="text-emerald-600 dark:text-emerald-400">+PKR {(parseFloat(paymentData.bonus) || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-semibold text-black dark:text-slate-300">
                                        <span>Deductions</span>
                                        <span className="text-rose-600 dark:text-rose-400">-PKR {(parseFloat(paymentData.deductions) || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-black text-slate-900 dark:text-slate-100">
                                        <span>Net Payable</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">PKR {((selectedEmp.salary || 0) + (parseFloat(paymentData.bonus) || 0) + ((parseFloat(paymentData.otHours) || 0) * (selectedEmp.hourlyRate || 0)) - (parseFloat(paymentData.deductions) || 0)).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                             <button type="submit" disabled={saving} className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all text-sm active:scale-95 disabled:opacity-50 shadow-sm tracking-tight">
                                 {saving ? 'Loading...' : 'Save now'}
                             </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Salary Slip Viewer */}
            {viewingSlip && (
                <div className="fixed top-20 left-0 lg:left-72 right-0 bottom-0 z-50 bg-[#F8FAFC] dark:bg-slate-900 animate-in slide-in-from-right-5 duration-300 flex flex-col shadow-2xl transition-all">
                    {/* Full-Page Modal Header */}
                    <div className="px-4 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Eye size={22} />
                            </div>
                            <div>
                                <h3 className="text-sm md:text-xl font-semibold text-black dark:text-slate-100 tracking-tight">Salary slip</h3>
                                <p className="text-sm text-black dark:text-slate-500 font-semibold mt-0.5 tracking-tight">History</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setViewingSlip(null)}
                            className="p-3 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
                        >
                             <span className="text-sm font-semibold hidden md:block text-slate-400 dark:text-slate-500 tracking-tight">Close</span>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-12 scrollbar-hide bg-slate-50/30 dark:bg-slate-900/30">
                        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 print:shadow-none print:border-none">
                            {/* Slip Header */}
                            <div className="bg-emerald-900 dark:bg-slate-950 p-10 text-white flex justify-between items-start border-b border-white/5">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tighter">Salary Slip</h2>
                                    <p className="text-emerald-200 dark:text-emerald-400 text-[10px] font-bold mt-1">Payment Record</p>
                                </div>
                                 <div className="text-right">
                                     <p className="text-sm font-semibold text-slate-300 dark:text-slate-500 mb-1 tracking-tight">Payment status</p>
                                     <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-semibold border border-emerald-500/30 tracking-tight">Confirmed paid</span>
                                 </div>
                            </div>

                            <div className="p-10 space-y-8">
                                {/* Staff Info */}
                                <div className="grid grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <div>
                                             <p className="text-sm font-semibold text-black dark:text-slate-500 mb-1 tracking-tight">Employee details</p>
                                             <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{viewingSlip.employee?.firstName} {viewingSlip.employee?.lastName}</p>
                                             <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 tracking-tight">{viewingSlip.employee?.designation}</p>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-4">
                                         <div>
                                             <p className="text-sm font-semibold text-black dark:text-slate-500 mb-1 tracking-tight">Payment period</p>
                                             <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{new Date(viewingSlip.month + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                                         </div>
                                         <div>
                                             <p className="text-sm font-semibold text-black dark:text-slate-500 mb-1 tracking-tight">Disbursement date</p>
                                             <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{viewingSlip.paymentDate ? new Date(viewingSlip.paymentDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                                         </div>
                                         <div>
                                             <p className="text-sm font-semibold text-black dark:text-slate-500 mb-1 tracking-tight">Transaction ID</p>
                                             <p className="text-sm font-mono font-semibold text-slate-500 dark:text-slate-400 tracking-tight">SLP-{viewingSlip.id.toString().slice(-8).toUpperCase()}</p>
                                         </div>
                                    </div>
                                </div>

                                {/* Calculation Table */}
                                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                                    <table className="w-full">
                                         <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                                             <tr>
                                                 <th className="px-6 py-3 text-left text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Description</th>
                                                 <th className="px-6 py-3 text-right text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Amount</th>
                                             </tr>
                                         </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            <tr className="bg-white dark:bg-slate-900">
                                                <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400">Basic Monthly Salary</td>
                                                <td className="px-6 py-4 text-right text-xs font-bold text-slate-800 dark:text-slate-200">PKR {viewingSlip.baseSalary?.toLocaleString()}</td>
                                            </tr>
                                            <tr className="bg-white dark:bg-slate-900">
                                                <td className="px-6 py-4">
                                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Overtime Earnings</p>
                                                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500">({viewingSlip.overtimeHours} hours at {viewingSlip.employee?.hourlyRate}/hr)</p>
                                                </td>
                                                <td className="px-6 py-4 text-right text-xs font-bold text-slate-800 dark:text-slate-200">+PKR {viewingSlip.overtimePay?.toLocaleString()}</td>
                                            </tr>
                                            <tr className="bg-white dark:bg-slate-900">
                                                <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400">Performance Bonus</td>
                                                <td className="px-6 py-4 text-right text-xs font-bold text-slate-800 dark:text-slate-200">+PKR {viewingSlip.bonus?.toLocaleString()}</td>
                                            </tr>
                                            <tr className="bg-white dark:bg-slate-900">
                                                <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400">Total Deductions</td>
                                                <td className="px-6 py-4 text-right text-xs font-bold text-slate-800 dark:text-slate-200">-PKR {viewingSlip.deductions?.toLocaleString()}</td>
                                            </tr>
                                             <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                                                 <td className="px-6 py-6 text-sm font-semibold text-black dark:text-slate-200 tracking-tight">Net salary</td>
                                                 <td className="px-6 py-6 text-right text-lg font-semibold text-emerald-600 dark:text-emerald-400 tracking-tight">PKR {viewingSlip.netSalary?.toLocaleString()}</td>
                                             </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer */}
                                <div className="flex items-start justify-between gap-10 pt-4 border-t border-slate-50 dark:border-slate-800">
                                     <div className="flex-1">
                                         <p className="text-sm font-semibold text-black dark:text-slate-500 mb-1 tracking-tight">Notes / remarks</p>
                                         <p className="text-sm text-slate-500 dark:text-slate-400 italic leading-relaxed">{viewingSlip.notes || 'No special remarks for this period.'}</p>
                                     </div>
                                     <div className="text-center">
                                         <div className="w-32 h-1 bg-slate-100 dark:bg-slate-800 mb-2 mx-auto"></div>
                                         <p className="text-sm font-semibold text-black dark:text-slate-500 tracking-tight">Authorized sign</p>
                                     </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-center gap-4 print:hidden">
                                <button
                                    onClick={() => window.print()}
                                    className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all text-xs shadow-xl shadow-emerald-900/10 dark:shadow-none flex items-center gap-2 group active:scale-95"
                                >
                                    <Calendar size={16} />
                                    Print slip
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default HRM;

