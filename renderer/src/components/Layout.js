import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Package, Truck, ShoppingCart, Users, Building2,
    Receipt, BarChart3, UserCog, Settings, LogOut, Search, Bell, Mail, ChevronRight,
    UserSquare, HardDrive, RefreshCcw
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

const Layout = ({ children, user, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [permissions, setPermissions] = useState([]);
    const [visibleMenuItems, setVisibleMenuItems] = useState([]);
    const [visibleSettingsItems, setVisibleSettingsItems] = useState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [adminMessages, setAdminMessages] = useState([]);
    const [showMessages, setShowMessages] = useState(false);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                if (window.electronAPI && window.electronAPI.getAdminMessages) {
                    const data = await window.electronAPI.getAdminMessages({ limit: 5 });
                    if (Array.isArray(data)) setAdminMessages(data);
                }
            } catch (err) { console.error("Error fetching admin messages:", err); }
        };
        fetchMessages();
        const interval = setInterval(fetchMessages, 300000); // 5 mins
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Load permissions from sessionStorage
        const savedPermissions = sessionStorage.getItem('permissions');
        if (savedPermissions) {
            try {
                const perms = JSON.parse(savedPermissions);
                setPermissions(perms);
            } catch (err) {
                console.error('Failed to parse permissions:', err);
            }
        }
    }, []);

    useEffect(() => {
        // Filter menu items based on permissions
        const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin' || user?.role === 'Super Admin';
        const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role === 'Admin';

        if (isSuperAdmin) {
            // Super Admin only sees Company & Users and Backup
            setVisibleMenuItems([
                { key: 'users', icon: UserCog, label: 'Company & Users', path: '/company' },
                { key: 'backup', icon: HardDrive, label: 'Backup & Restore', path: '/backup' }
            ]);
            setVisibleSettingsItems([]);
        } else if (permissions && permissions.length > 0) {
            // Filter based on can_view permission (Case-insensitive matching)
            const allowedKeys = permissions
                .filter(p => p.can_view === 1)
                .map(p => p.module.toLowerCase());

            const filteredMenu = ALL_MENU_ITEMS.filter(item =>
                allowedKeys.includes(item.key.toLowerCase())
            );
            const filteredSettings = SETTINGS_MENU_ITEMS.filter(item =>
                allowedKeys.includes(item.key.toLowerCase())
            );

            setVisibleMenuItems(filteredMenu);
            setVisibleSettingsItems(filteredSettings);
        } else if (isAdmin) {
            // Fallback for Admin role if permissions aren't loaded yet
            setVisibleMenuItems(ALL_MENU_ITEMS);
            setVisibleSettingsItems(SETTINGS_MENU_ITEMS);
        } else {
            // For other roles, show nothing until permissions are confirmed
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
                        <img
                            src="/logo.png"
                            alt="BMS Logo"
                            className="h-[50px] w-[50px] object-contain rounded-lg"
                        />
                        <div>
                            <span className="text-lg font-bold tracking-tight text-white block">Business</span>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-none">Management</p>
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
                    <div className="relative px-4 border-t border-gray-800">
                        <div className="px-2 py-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Settings</span>
                        </div>
                        <div className="space-y-1.5 text-xs">
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
                    <div className="relative px-4 py-4 border-t border-gray-800">
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
                            <Search size={22} className="rotate-90" /> {/* Reusing search or generic icon since Lucide menu wasn't in original imports */}
                        </button>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center space-x-2 md:space-x-3">
                        <button className="hidden sm:flex p-2.5 bg-slate-50 rounded-lg text-slate-500 hover:bg-slate-100 transition-all duration-200">
                            <Mail size={18} />
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setShowMessages(!showMessages)}
                                className="p-2 md:p-2.5 bg-slate-50 rounded-lg text-slate-500 hover:bg-slate-100 transition-all duration-200 relative"
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
