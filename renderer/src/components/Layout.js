import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Package, Truck, ShoppingCart, Users, Building2,
    Receipt, BarChart3, UserCog, Settings, LogOut, Bell, Mail, ChevronRight,
    UserSquare, HardDrive, RefreshCcw, RefreshCw, Plus, ChevronLeft, Send, LifeBuoy, Menu, Sun, Moon
} from 'lucide-react';
import { Search } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Define all menu items with their permission keys
const ALL_MENU_ITEMS = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { key: 'inventory', icon: Package, label: 'Inventory', path: '/inventory' },
    { key: 'sales', icon: ShoppingCart, label: 'Sales', path: '/sales' },
    { key: 'customers', icon: Users, label: 'Customers', path: '/customers' },
    { key: 'purchase', icon: Truck, label: 'Purchase', path: '/purchase' },
    { key: 'suppliers', icon: Building2, label: 'Suppliers', path: '/suppliers' },
    { key: 'returns', icon: RefreshCcw, label: 'Returns', path: '/returns' },
    { key: 'expenses', icon: Receipt, label: 'Expenses', path: '/expenses' },
    { key: 'hrm', icon: UserSquare, label: 'HRM', path: '/hrm' },
    { key: 'reports', icon: BarChart3, label: 'Reports', path: '/reports' },
];

const SETTINGS_MENU_ITEMS = [
    { key: 'users', icon: UserCog, label: 'Company & Users', path: '/company' },
    { key: 'backup', icon: HardDrive, label: 'Backup & Restore', path: '/backup' },
    { key: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
];

const SidebarItem = ({ icon: Icon, label, active, onClick, hasSubmenu }) => (
    <div
        onClick={onClick}
        className={`group relative flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-300 border outline-none ${active
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm border-emerald-100/50 dark:border-emerald-800/50'
            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
            }`}
    >
        <div className="relative flex items-center space-x-3.5">
            <Icon size={18} className={active ? 'text-emerald-500' : 'text-slate-400 group-hover:text-emerald-500 transition-colors'} />
            <span className="text-[13px] tracking-tight">{label}</span>
        </div>
        {hasSubmenu && <ChevronRight size={14} className="relative text-slate-300 group-hover:text-emerald-400 transition-colors" />}
    </div>
);

const Layout = ({ children, user, permissions, onLogout }) => {
    const { isDarkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const isSuperAdmin = user?.role?.toLowerCase() === 'super admin' || user?.role?.toLowerCase() === 'super_admin';
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
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    
    // Persist viewed state to hide dots after viewing
    const [lastSeenSupportResolves, setLastSeenSupportResolves] = useState(() => 
        parseInt(localStorage.getItem('bms_last_seen_support') || '0', 10)
    );
    const [lastSeenMsgCount, setLastSeenMsgCount] = useState(() => 
        parseInt(localStorage.getItem('bms_last_seen_msg') || '0', 10)
    );

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
    }, [user, fetchSupportRequests]);

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
    
    const handleForceSync = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            if (window.electronAPI && window.electronAPI.forceSync) {
                const res = await window.electronAPI.forceSync(user?.company_id);
                if (res.success) {
                    // Force a local state refresh if needed, or just rely on the sync success
                    window.location.reload(); // Simplest way to refresh all components after a big pull
                }
            }
        } catch (err) {
            console.error("Refresh failed:", err);
        }
        setIsRefreshing(false);
    };
    


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
                .filter(p => Number(p.can_view) === 1 || Number(p.canView) === 1 || p.can_view === true || p.canView === true || p.canView === 'true' || p.can_view === '1')
                .map(p => (p.module ? p.module.toLowerCase().trim() : ''));

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

    // Helper to get current page title
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        
        const menuItem = ALL_MENU_ITEMS.find(item => item.path === path);
        if (menuItem) return menuItem.label;
        
        const settingsItem = SETTINGS_MENU_ITEMS.find(item => item.path === path);
        if (settingsItem) return settingsItem.label;

        // Custom mappings for specific routes
        const customTitles = {
            '/company': 'Company Profile',
            '/users': 'User Management',
            '/backup': 'System Backup',
            '/setup-company': 'Initialize Business'
        };

        return customTitles[path] || 'BizNex';
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const currentResolved = supportRequests.filter(r => r.status === 'RESOLVED').length;
    const showSupportDot = currentResolved > lastSeenSupportResolves;

    const currentMsgCount = adminMessages.length;
    const showMsgDot = currentMsgCount > lastSeenMsgCount;

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden relative">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed lg:static inset-y-0 left-0 z-[70] w-64 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo */}
                <div className="relative h-20 flex items-center justify-center mb-2">
                    <span className="text-2xl font-black tracking-tighter text-emerald-600 dark:text-emerald-400 block truncate uppercase">BizNex</span>
                </div>

                {/* Super Admin Special: Settings at Top */}
                {isSuperAdmin && visibleSettingsItems.length > 0 && (
                    <div className="relative px-4 mt-4 space-y-1.5 ">
                        <div className="px-2 py-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Administration</span>
                        </div>
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
                )}

                {/* Menu Label */}
                {visibleMenuItems.length > 0 && (
                    <div className="relative px-6 py-2 mt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Menu</span>
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

                {/* Bottom Section: Regular Settings and Logout */}
                <div className="relative px-4 pt-4 pb-8 border-t border-slate-100 dark:border-slate-800 mt-auto">
                    {/* Settings Section (Only for Non-Super-Admin here) */}
                    {!isSuperAdmin && visibleSettingsItems.length > 0 && (
                        <div className="mb-4">
                            <div className="px-2 py-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Settings</span>
                            </div>
                            <div className="space-y-1">
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
                        </div>
                    )}

                    <div
                        onClick={onLogout}
                        className="group flex items-center space-x-3 px-4 py-3 rounded-xl cursor-pointer text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-300"
                    >
                        <LogOut size={18} className="text-rose-500/70 group-hover:translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase">Logout</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Header */}
                <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 shrink-0 transition-all duration-300 z-50">
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2.5 lg:hidden bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 transition-all shadow-sm"
                        >
                            <Menu size={20} />
                        </button>
                        
                        <div className="hidden md:flex flex-col">
                            <h1 className="text-xl font-semibold text-slate-950 dark:text-white tracking-tight">
                                {location.pathname === '/' ? `${getGreeting()}, ${user?.fullname?.split(' ')[0] || 'User'}` : getPageTitle()}
                            </h1>
                        </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center space-x-2 md:space-x-6">
                        <button
                            onClick={toggleTheme}
                            className="relative flex items-center h-9 w-16 p-1 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 transition-all duration-300 hover:border-emerald-400 dark:hover:border-emerald-500 group shadow-inner"
                            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {/* Sliding bubble */}
                            <div className={`
                                flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-emerald-600 shadow-md transform transition-transform duration-500 ease-in-out
                                ${isDarkMode ? 'translate-x-7 rotate-[360deg]' : 'translate-x-0'}
                            `}>
                                {isDarkMode ? (
                                    <Moon size={14} className="text-white" fill="currentColor" />
                                ) : (
                                    <Sun size={14} className="text-amber-500" fill="currentColor" />
                                )}
                            </div>

                            {/* Background icons (fixed) */}
                            <div className="absolute inset-0 flex justify-between items-center px-2 pointer-events-none opacity-20 dark:opacity-40">
                                <Sun size={12} className={isDarkMode ? 'invisible' : 'visible'} />
                                <Moon size={12} className={isDarkMode ? 'visible' : 'invisible'} />
                            </div>
                        </button>




                        <div className="relative flex items-center gap-2 md:gap-4">
                            {/* Refresh Button - Visible to all */}
                            <button
                                onClick={handleForceSync}
                                disabled={isRefreshing}
                                className={`p-2.5 rounded-xl transition-all duration-300 relative group ${isRefreshing ? 'bg-emerald-50 text-emerald-600 animate-pulse' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md border border-transparent'}`}
                                title="Force Data Sync"
                            >
                                <RefreshCw size={18} className={`${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                            </button>

                            {!isSuperAdmin && (
                                <>
                                    {/* Support Trigger */}
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                setShowSupport(!showSupport);
                                                setShowMessages(false);
                                                setSupportView('list');
                                                if (!showSupport) {
                                                    setLastSeenSupportResolves(currentResolved);
                                                    localStorage.setItem('bms_last_seen_support', currentResolved);
                                                }
                                            }}
                                            className={`p-2.5 rounded-xl transition-all duration-300 relative group ${showSupport ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100/50' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md border border-transparent'}`}
                                        >
                                            <Mail size={18} className="group-hover:scale-110 transition-transform" />
                                            {showSupportDot && (
                                                <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 border-2 border-white rounded-full"></span>
                                            )}
                                        </button>

                                        {/* Support Dropdown */}
                                        {showSupport && (
                                            <>
                                                <div className="fixed inset-0 z-[90]" onClick={() => setShowSupport(false)}></div>
                                                <div className="absolute top-12 right-0 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                                    {supportView === 'list' ? (
                                                        <>
                                                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                                                <h3 className="text-[10px] font-bold text-black dark:text-slate-200 uppercase flex items-center gap-2">
                                                                    <LifeBuoy size={14} className="text-emerald-500" />
                                                                    Help & Support
                                                                </h3>
                                                                <button
                                                                    onClick={() => setSupportView('new')}
                                                                    className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 uppercase flex items-center gap-1"
                                                                >
                                                                    <Plus size={12} /> New Ticket
                                                                </button>
                                                            </div>
                                                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                                                {supportRequests.length === 0 ? (
                                                                    <div className="p-10 text-center">
                                                                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                                            <Mail size={24} className="text-slate-300 dark:text-slate-600" />
                                                                        </div>
                                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">No support tickets</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                                                        {supportRequests.map((req) => (
                                                                            <div key={req.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                                                <div className="flex items-center justify-between mb-1">
                                                                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${req.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                                        {req.status}
                                                                                    </span>
                                                                                    <span className="text-[9px] text-slate-400 font-medium">{new Date(req.createdAt).toLocaleDateString()}</span>
                                                                                </div>
                                                                                <p className="text-xs text-slate-700 dark:text-slate-300 font-bold line-clamp-2 leading-tight">{req.description}</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="p-5">
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <button onClick={() => setSupportView('list')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500">
                                                                    <ChevronLeft size={16} />
                                                                </button>
                                                                <h3 className="text-xs font-bold text-black dark:text-slate-200 uppercase">New Support Ticket</h3>
                                                            </div>
                                                            <form onSubmit={handleSupportSubmit} className="space-y-4">
                                                                <textarea
                                                                    required
                                                                    value={supportForm.description}
                                                                    onChange={(e) => setSupportForm({ ...supportForm, description: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:border-emerald-500 outline-none transition-all min-h-[100px]"
                                                                    placeholder="Describe your issue..."
                                                                />
                                                                <button type="submit" disabled={submittingSupport} className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-bold text-[10px] uppercase hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                                                                    <Send size={14} />
                                                                    {submittingSupport ? 'Sending...' : 'Submit Request'}
                                                                </button>
                                                            </form>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Notifications Trigger */}
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                setShowMessages(!showMessages);
                                                setShowSupport(false);
                                                if (!showMessages) {
                                                    setLastSeenMsgCount(currentMsgCount);
                                                    localStorage.setItem('bms_last_seen_msg', currentMsgCount);
                                                }
                                            }}
                                            className={`p-2.5 rounded-xl transition-all duration-300 relative group ${showMessages ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-100/50' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md border border-transparent'}`}
                                        >
                                            <Bell size={18} className="group-hover:rotate-12 transition-transform" />
                                            {showMsgDot && (
                                                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 border-2 border-white rounded-full"></span>
                                            )}
                                        </button>

                                        {showMessages && (
                                            <>
                                                <div className="fixed inset-0 z-[90]" onClick={() => setShowMessages(false)}></div>
                                                <div className="absolute top-12 right-0 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                                        <h3 className="text-[10px] font-bold text-black dark:text-slate-200 uppercase">System Notifications</h3>
                                                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{adminMessages.length} New</span>
                                                    </div>
                                                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                                        {adminMessages.length === 0 ? (
                                                            <div className="p-10 text-center">
                                                                <Bell size={24} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase">No notifications</p>
                                                            </div>
                                                        ) : adminMessages.map((msg) => (
                                                            <div key={msg.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-white/5 last:border-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(msg.createdAt).toLocaleDateString()}</span>
                                                                </div>
                                                                <p className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-tight">{msg.content}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3 pl-4 md:pl-6 border-l border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col items-end hidden sm:flex">
                                <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight tracking-tight">{user?.fullname?.split(' ')[0] || 'User'}</p>
                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 lowercase mt-0.5">{user?.role || 'authorized'}</p>
                            </div>
                            <div className="relative group cursor-pointer">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-black shadow-lg shadow-emerald-500/20 shrink-0 border-2 border-white dark:border-slate-800 group-hover:scale-105 transition-all">
                                    {user?.fullname?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-auto p-3 md:p-8 bg-gray-50/50 dark:bg-slate-950/50 transition-colors duration-300">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
