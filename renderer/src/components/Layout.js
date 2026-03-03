import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Package, Truck, ShoppingCart, Users, Building2,
    Receipt, BarChart3, UserCog, Settings, LogOut, Search, Bell, Mail, ChevronRight,
    UserSquare, HardDrive, RefreshCcw, Plus, ChevronLeft, Send, History, LifeBuoy, Menu
} from 'lucide-react';

// Define all menu items with their permission keys
const ALL_MENU_ITEMS = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { key: 'inventory', icon: Package, label: 'Inventory', path: '/inventory' },
    { key: 'purchase', icon: Truck, label: 'Purchase', path: '/purchase' },
    { key: 'sales', icon: ShoppingCart, label: 'Sales', path: '/sales' },
    { key: 'returns', icon: RefreshCcw, label: 'Returns', path: '/returns' },
    { key: 'customers', icon: Users, label: 'Customers', path: '/customers' },
    { key: 'suppliers', icon: Building2, label: 'Suppliers', path: '/suppliers' },
    { key: 'expenses', icon: Receipt, label: 'Expenses', path: '/expenses' },

    { key: 'reports', icon: BarChart3, label: 'Reports', path: '/reports' },
    { key: 'hrm', icon: UserSquare, label: 'HRM', path: '/hrm' },
];

const SETTINGS_MENU_ITEMS = [
    { key: 'users', icon: UserCog, label: 'Company & Users', path: '/company' },
    { key: 'backup', icon: HardDrive, label: 'Backup & Restore', path: '/backup' },
    { key: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
];

const SidebarItem = ({ icon: Icon, label, active, onClick, hasSubmenu }) => (
    <div
        onClick={onClick}
        className={`group relative flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 ${active
            ? 'bg-slate-800 text-white font-medium shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
    >
        <div className="relative flex items-center space-x-4">
            <Icon size={22} className={active ? 'text-blue-400' : 'text-slate-200 group-hover:text-blue-400 transition-colors'} />
            <span className="text-[15px] text-white">{label}</span>
        </div>
        {hasSubmenu && <ChevronRight size={16} className="relative text-gray-500 group-hover:text-orange-400 transition-colors" />}
    </div>
);

const Layout = ({ children, user, permissions, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [company, setCompany] = useState(null);
    // Removed internal permissions state to use prop
    const [visibleMenuItems, setVisibleMenuItems] = useState([]);
    const [visibleSettingsItems, setVisibleSettingsItems] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [adminMessages, setAdminMessages] = useState([]);
    const [showMessages, setShowMessages] = useState(false);
    const [showSupport, setShowSupport] = useState(false);
    const [supportRequests, setSupportRequests] = useState([]);
    const [supportView, setSupportView] = useState('list'); // 'list' or 'new'
    const [supportForm, setSupportForm] = useState({ whatsapp: '', description: '' });
    const [submittingSupport, setSubmittingSupport] = useState(false);

    const fetchMessages = async () => {
        try {
            if (window.electronAPI && window.electronAPI.getAdminMessages) {
                const data = await window.electronAPI.getAdminMessages({ limit: 5 });
                if (Array.isArray(data)) setAdminMessages(data);
            }
        } catch (err) { console.error("Error fetching admin messages:", err); }
    };

    const fetchSupportRequests = async () => {
        try {
            if (window.electronAPI && window.electronAPI.getSupportRequests && user?.id) {
                const data = await window.electronAPI.getSupportRequests({ userId: user.id });
                if (Array.isArray(data)) setSupportRequests(data);
            }
        } catch (err) { console.error("Error fetching support requests:", err); }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 300000); // 5 mins
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (user?.id) fetchSupportRequests();
    }, [user]);

    const handleSupportSubmit = async (e) => {
        e.preventDefault();
        if (!supportForm.description.trim()) return;
        setSubmittingSupport(true);
        try {
            const res = await window.electronAPI.createSupportRequest({
                fullName: user.fullname || user.username,
                email: user.email || '',
                whatsapp: supportForm.whatsapp,
                description: supportForm.description,
                userId: user.id,
                companyId: user.company_id
            });
            if (res.success) {
                setSupportForm({ whatsapp: '', description: '' });
                setSupportView('list');
                fetchSupportRequests();
            }
        } catch (err) { console.error("Error submitting support:", err); }
        setSubmittingSupport(false);
    };

    useEffect(() => {
        const fetchCompany = async () => {
            if (window.electronAPI && user?.company_id) {
                try {
                    const data = await window.electronAPI.getCompany(user.company_id);
                    if (data) setCompany(data);
                } catch (err) {
                    console.error("Error fetching company details:", err);
                }
            }
        };
        fetchCompany();
    }, [user]);

    useEffect(() => {
        console.log("Layout Permissions Prop:", permissions);

        const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role === 'Admin';
        if (isAdmin) {
            setVisibleMenuItems(ALL_MENU_ITEMS);
            setVisibleSettingsItems(SETTINGS_MENU_ITEMS);
            return;
        }

        // Filter menu items based on permissions for ALL roles (now respects DB)
        if (permissions && permissions.length > 0) {
            // Filter based on can_view permission
            const allowedKeys = (permissions || [])
                .filter(p => p.can_view == 1 || p.canView == 1 || p.can_view === true || p.canView === true || p.canView === 'true' || p.can_view === '1')
                .map(p => p.module ? p.module.toLowerCase().trim() : '');

            // Special mappings
            if (allowedKeys.includes('products')) allowedKeys.push('inventory');
            if (allowedKeys.includes('items')) allowedKeys.push('inventory');
            if (allowedKeys.includes('stock')) allowedKeys.push('inventory');

            const filteredMenu = ALL_MENU_ITEMS.filter(item =>
                allowedKeys.includes(item.key.toLowerCase())
            );
            const filteredSettings = SETTINGS_MENU_ITEMS.filter(item =>
                allowedKeys.includes(item.key.toLowerCase())
            );

            setVisibleMenuItems(filteredMenu);
            setVisibleSettingsItems(filteredSettings);

            console.log("Allowed Keys:", allowedKeys);
        } else {
            console.warn("No permissions found for user");
            setVisibleMenuItems([]);
            setVisibleSettingsItems([]);
        }
    }, [permissions, user]);

    const isActive = (path) => location.pathname === path;

    // Close sidebar on navigation (for mobile)
    const handleNavigate = (path) => {
        navigate(path);
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden relative">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed lg:static inset-y-0 left-0 z-[70] w-72 bg-[#0B1033] flex flex-col transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo */}
                <div className="relative h-20 flex items-center px-6 border-b border-slate-800/50">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 transform -rotate-3 group-hover:rotate-0 transition-transform duration-300">
                            <LayoutDashboard className="text-white" size={20} />
                        </div>
                        <div className="overflow-hidden">
                            <span className="text-xl font-extrabold tracking-tight text-white block truncate max-w-[180px]">BizNex</span>
                        </div>
                    </div>
                </div>

                {/* Menu Label */}
                {visibleMenuItems.length > 0 && (
                    <div className="relative px-6 py-4 mt-2">
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Main Menu</span>
                    </div>
                )}

                {/* Navigation - Dynamic based on permissions */}
                <div className="relative flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {visibleMenuItems.map((item) => (
                        <SidebarItem
                            key={item.key}
                            icon={item.icon}
                            label={item.label}
                            active={isActive(item.path)}
                            onClick={() => handleNavigate(item.path)}
                        />
                    ))}
                </div>

                {/* Settings Section - Dynamic based on permissions */}
                {visibleSettingsItems.length > 0 && (
                    <div className="relative  px-4">
                        <div className="px-2 py-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Settings</span>
                        </div>
                        <div className=" text-sm">
                            {visibleSettingsItems.map((item) => (
                                <SidebarItem
                                    key={item.key}
                                    icon={item.icon}
                                    label={item.label}
                                    active={isActive(item.path)}
                                    onClick={() => handleNavigate(item.path)}
                                />
                            ))}
                        </div>
                        <div
                            onClick={onLogout}
                            className="group flex items-center space-x-3 px-4 py-3.5 rounded-xl cursor-pointer text-red-400 hover:text-white hover:bg-red-500/20 transition-all duration-300 mt-3 border border-red-500/20 hover:border-red-500/40"
                        >
                            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                            <span className="text-sm font-medium">Logout</span>
                        </div>
                    </div>
                )}

                {/* Always show logout even if no settings items */}
                {visibleSettingsItems.length === 0 && (
                    <div className="relative px-4 pt-6 pb-8 border-t border-slate-800/50 mt-auto">
                        <div
                            onClick={onLogout}
                            className="group flex items-center space-x-3 px-4 py-3.5 rounded-xl cursor-pointer text-red-400 hover:text-white hover:bg-red-500/20 transition-all duration-300 border border-red-500/20 hover:border-red-500/40"
                        >
                            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                            <span className="text-sm font-medium">Logout</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Header */}
                <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 lg:hidden bg-slate-50 text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <Menu size={22} />
                        </button>
                        <div className="hidden md:block">
                        </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center space-x-2 md:space-x-6">




                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowSupport(!showSupport);
                                    setShowMessages(false);
                                    setSupportView('list');
                                }}
                                className={`p-2 md:p-2.5 rounded-lg transition-all duration-200 relative ${showSupport ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                            >
                                <Mail size={18} />
                                {supportRequests.some(r => r.status === 'RESOLVED') && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 border border-white rounded-full"></span>
                                )}
                            </button>

                            {/* Support Dropdown */}
                            {showSupport && (
                                <>
                                    <div className="fixed inset-0 z-[90]" onClick={() => setShowSupport(false)}></div>
                                    <div className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                        {supportView === 'list' ? (
                                            <>
                                                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                                    <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                                        <LifeBuoy size={14} className="text-blue-500" />
                                                        Help & Support
                                                    </h3>
                                                    <button
                                                        onClick={() => setSupportView('new')}
                                                        className="text-[9px] font-bold text-blue-600 hover:text-blue-700 uppercase flex items-center gap-1"
                                                    >
                                                        <Plus size={12} /> New Ticket
                                                    </button>
                                                </div>
                                                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                                    {supportRequests.length === 0 ? (
                                                        <div className="p-10 text-center">
                                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                                <Mail size={24} className="text-slate-300" />
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No support tickets</p>
                                                            <button
                                                                onClick={() => setSupportView('new')}
                                                                className="mt-4 text-[10px] font-bold text-blue-600 hover:underline uppercase"
                                                            >
                                                                Contact Super Admin
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-slate-50">
                                                            {supportRequests.map((req) => (
                                                                <div key={req.id} className="p-4 hover:bg-slate-50 transition-colors">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${req.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600' :
                                                                            req.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                                                                                'bg-slate-100 text-slate-600'
                                                                            }`}>
                                                                            {req.status}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-400 font-medium">
                                                                            {new Date(req.createdAt).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-700 font-bold line-clamp-2 leading-snug">{req.description}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="p-5 animate-in slide-in-from-right-4 duration-300">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <button onClick={() => setSupportView('list')} className="p-1 hover:bg-slate-100 rounded">
                                                        <ChevronLeft size={16} className="text-slate-500" />
                                                    </button>
                                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">New Support Ticket</h3>
                                                </div>
                                                <form onSubmit={handleSupportSubmit} className="space-y-4">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp No (Optional)</label>
                                                        <input
                                                            type="text"
                                                            value={supportForm.whatsapp}
                                                            onChange={(e) => setSupportForm({ ...supportForm, whatsapp: e.target.value })}
                                                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-500 transition-all"
                                                            placeholder="Format: +92..."
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Issue Description</label>
                                                        <textarea
                                                            required
                                                            value={supportForm.description}
                                                            onChange={(e) => setSupportForm({ ...supportForm, description: e.target.value })}
                                                            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-blue-500 transition-all min-h-[100px]"
                                                            placeholder="Describe your problem or request..."
                                                        />
                                                    </div>
                                                    <button
                                                        type="submit"
                                                        disabled={submittingSupport}
                                                        className="w-full py-2.5 bg-[#0B1033] text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        <Send size={14} />
                                                        {submittingSupport ? 'Sending...' : 'Submit Request'}
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                                            <button onClick={() => setShowSupport(false)} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">Close</button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowMessages(!showMessages);
                                    setShowSupport(false);
                                }}
                                className={`p-2 md:p-2.5 rounded-lg transition-all duration-200 relative ${showMessages ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                            >
                                <Bell size={20} />
                                {adminMessages.length > 0 && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
                                )}
                            </button>

                            {/* Messages Dropdown */}
                            {showMessages && (
                                <>
                                    <div className="fixed inset-0 z-[90]" onClick={() => setShowMessages(false)}></div>
                                    <div className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
                                            <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">System Notifications</h3>
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{adminMessages.length} Messages</span>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                            {adminMessages.length === 0 ? (
                                                <div className="p-8 text-center">
                                                    <Bell size={32} className="mx-auto text-slate-200 mb-2" />
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No notifications</p>
                                                </div>
                                            ) : adminMessages.map((msg) => (
                                                <div key={msg.id} className="p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${msg.type === 'alert' ? 'bg-rose-500' :
                                                            msg.type === 'update' ? 'bg-emerald-500' : 'bg-blue-500'
                                                            }`}></div>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(msg.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-800 font-bold leading-snug">{msg.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center rounded-b-xl">
                                            <button onClick={() => setShowMessages(false)} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">Close</button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex items-center space-x-2 md:space-x-3 pl-2 md:pl-4 border-l border-slate-200 ml-1 md:ml-2">
                            <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-lg bg-[#0B1033] flex items-center justify-center text-white font-bold shadow-md shadow-blue-100 shrink-0">
                                {user?.fullname?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-xs md:text-sm font-bold text-slate-800 leading-tight">{user?.fullname || 'User'}</p>
                                <p className="text-[9px] md:text-[10px] font-bold text-blue-600 uppercase tracking-widest">{user?.role?.replace('_', ' ') || 'User'}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-auto p-3 md:p-8 bg-gray-50/50">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
