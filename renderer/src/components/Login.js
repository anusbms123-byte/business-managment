import React, { useState } from 'react';
import { User, Lock, LayoutDashboard, HelpCircle, Phone, Mail, FileText, X, Eye, EyeOff, Check, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import { useDialog } from '../context/DialogContext';

const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSupport, setShowSupport] = useState(false);
    const [supportData, setSupportData] = useState({ fullName: '', email: '', whatsapp: '', description: '' });
    const [supportLoading, setSupportLoading] = useState(false);
    const [supportSuccess, setSupportSuccess] = useState(false);

    const { showError } = useDialog();

    const handleSupportSubmit = async (e) => {
        e.preventDefault();
        setSupportLoading(true);
        try {
            const API_URL = 'https://businessdevelopment-ten.vercel.app/api/support-requests';
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(supportData)
            });
            const data = await response.json();
            if (data.success) {
                setSupportSuccess(true);
            }
        } catch (err) {
            console.error(err);
            showError('Failed to submit support request.');
        } finally {
            setSupportLoading(false);
        }
    };

    const closeSupport = () => {
        setShowSupport(false);
        // Reset states after a short delay for smooth transition
        setTimeout(() => {
            setSupportSuccess(false);
            setSupportData({ fullName: '', email: '', whatsapp: '', description: '' });
        }, 300);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let result;
            if (window.electronAPI) {
                result = await window.electronAPI.loginUser({ username, password });
            } else {
                console.warn('Electron API not found. Using mock login.');
                await new Promise(resolve => setTimeout(resolve, 800));
                if (username === 'admin' && password === 'admin') {
                    result = {
                        success: true,
                        user: { id: 1, username: 'admin', fullname: 'Administrator', role: 'admin', company_id: 1 }
                    };
                } else if (username && password) {
                    result = {
                        success: true,
                        user: { id: 999, username: username, fullname: 'Test User', role: 'manager', company_id: 1 }
                    };
                } else {
                    result = { success: false, message: 'Invalid credentials' };
                }
            }

            if (result.success) {
                onLoginSuccess(result.user, result.permissions || []);
            } else {
                setError(result.message || 'Invalid credentials');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(`Login failed: ${err.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
            {/* Theme Toggle at Top Right */}
            <div className="absolute top-10 right-10 z-20">
                <button
                    onClick={toggleTheme}
                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-emerald-500/5 dark:shadow-none hover:scale-110 active:scale-95 transition-all duration-300 group"
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {isDarkMode ? (
                        <Sun size={24} className="text-amber-400 group-hover:rotate-45 transition-transform" />
                    ) : (
                        <Moon size={24} className="text-slate-600 group-hover:-rotate-12 transition-transform" />
                    )}
                </button>
            </div>

            {/* Minimal Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/30 dark:bg-emerald-900/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-100/50 dark:bg-slate-900/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

            <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-12">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl mb-6 border border-emerald-100 dark:border-emerald-900/50">
                                <LayoutDashboard size={32} />
                            </div>
                            <h1 className="text-2xl font-bold text-black dark:text-slate-100 tracking-tight">BizNex</h1>
                            <p className="text-slate-400 dark:text-slate-500 text-sm font-semibold mt-2 tracking-tight">Business Management System</p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-lg text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center gap-3 animate-shake tracking-tight">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-500"></div>
                                <span className="text-sm font-semibold tracking-tight">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-black dark:text-slate-500 ml-1 tracking-tight">Username</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        placeholder="Enter username"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-black dark:text-slate-500 ml-1 tracking-tight">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        placeholder="Enter password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 text-sm disabled:opacity-70 mt-4 tracking-tight"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Authenticating...</span>
                                    </div>
                                ) : (
                                    <span className='text-sm'>Login</span>
                                )}
                            </button>
                            <div className="text-center mt-4">
                                <p className="text-sm text-slate-400 dark:text-slate-500 font-semibold tracking-tight">
                                    Don't have an account?{' '}
                                    <Link to="/signup" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors">Register New company</Link>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Support Trigger */}
            <button
                onClick={() => setShowSupport(true)}
                className="absolute bottom-10 right-10 w-14 h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 hover:scale-110 transition-all group"
            >
                <HelpCircle size={24} />
                <span className="absolute right-full mr-4 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap tracking-tight">
                    Need Help?
                </span>
            </button>

            {/* Support Modal */}
            {showSupport && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-xl font-bold text-black dark:text-slate-100 tracking-tight">Support Helpline</h2>
                                    <p className="text-sm text-slate-400 dark:text-slate-500 font-semibold mt-1 tracking-tight">Submit your issue below</p>
                                </div>
                                <button onClick={closeSupport} className="w-10 h-10 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {supportSuccess ? (
                                <div className="py-12 text-center animate-in fade-in slide-in-from-bottom-4">
                                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100 dark:border-emerald-900/50">
                                        <Check size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Request Received</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">We will contact you shortly.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSupportSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-black dark:text-slate-500 ml-1 tracking-tight">Full Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={18} />
                                            <input
                                                required
                                                value={supportData.fullName}
                                                onChange={e => setSupportData({ ...supportData, fullName: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                placeholder="Your name"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-black dark:text-slate-500 ml-1 tracking-tight">Official Email</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={18} />
                                                <input
                                                    type="email"
                                                    required
                                                    value={supportData.email}
                                                    onChange={e => setSupportData({ ...supportData, email: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                    placeholder="mail@host.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-black dark:text-slate-500 ml-1 tracking-tight">Contact No</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={18} />
                                                <input
                                                    required
                                                    value={supportData.whatsapp}
                                                    onChange={e => setSupportData({ ...supportData, whatsapp: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                    placeholder="+92 300..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-black dark:text-slate-500 ml-1 tracking-tight">Issue Description</label>
                                        <div className="relative group">
                                            <FileText className="absolute left-4 top-4 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={18} />
                                            <textarea
                                                required
                                                rows={4}
                                                value={supportData.description}
                                                onChange={e => setSupportData({ ...supportData, description: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 transition-all resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                placeholder="Explain your problem..."
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={supportLoading}
                                        className="w-full py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 text-sm mt-4 disabled:opacity-70 tracking-tight"
                                    >
                                        {supportLoading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <span>Submit report</span>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
