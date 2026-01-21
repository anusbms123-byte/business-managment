import React, { useState } from 'react';
import { User, Lock, LayoutDashboard, HelpCircle, Phone, Mail, FileText, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSupport, setShowSupport] = useState(false);
    const [supportData, setSupportData] = useState({ fullName: '', email: '', whatsapp: '', description: '' });
    const [supportLoading, setSupportLoading] = useState(false);
    const [supportSuccess, setSupportSuccess] = useState(false);

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
                setTimeout(() => {
                    setShowSupport(false);
                    setSupportSuccess(false);
                    setSupportData({ fullName: '', email: '', whatsapp: '', description: '' });
                }, 2000);
            }
        } catch (err) {
            console.error(err);
            window.alert('Failed to submit support request.');
        } finally {
            setSupportLoading(false);
        }
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

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Minimal Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-100/50 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

            <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
                <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                    <div className="p-12">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-xl mb-6 border border-blue-100">
                                <LayoutDashboard size={32} />
                            </div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">System Portal</h1>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Business Management System</p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-bold flex items-center gap-3 animate-shake">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-600"></div>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identity UID</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-600 transition-all placeholder:text-slate-300"
                                        placeholder="Enter username"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-600 transition-all placeholder:text-slate-300"
                                        placeholder="Enter password"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-slate-900 transition-all shadow-sm shadow-blue-100 active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-70 disabled:active:scale-100 mt-4"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Authenticating...</span>
                                    </div>
                                ) : (
                                    <span>Access Control Unit</span>
                                )}
                            </button>
                            <div className="text-center mt-4">
                                <p className="text-xs text-slate-400 font-bold">
                                    Don't have an account?{' '}
                                    <Link to="/signup" className="text-blue-600 hover:text-blue-800 transition-colors">Register New Organization</Link>
                                </p>
                            </div>
                        </form>

                        <div className="mt-12 text-center">
                            <div className="h-px bg-slate-100 w-full mb-6"></div>
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                Authorized Access Only • v2.0.4
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Support Trigger */}
            <button
                onClick={() => setShowSupport(true)}
                className="absolute bottom-10 right-10 w-14 h-14 bg-white border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:scale-110 transition-all group"
            >
                <HelpCircle size={24} />
                <span className="absolute right-full mr-4 bg-slate-800 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">
                    Need Help?
                </span>
            </button>

            {/* Support Modal */}
            {showSupport && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Support Helpline</h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Submit your issue below</p>
                                </div>
                                <button onClick={() => setShowSupport(false)} className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {supportSuccess ? (
                                <div className="py-12 text-center animate-in fade-in slide-in-from-bottom-4">
                                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
                                        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin duration-1000" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">Request Received</h3>
                                    <p className="text-sm text-slate-500 mt-2">We will contact you shortly.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSupportSubmit} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                            <input
                                                required
                                                value={supportData.fullName}
                                                onChange={e => setSupportData({ ...supportData, fullName: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                                placeholder="Your name"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Official Email</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                                <input
                                                    type="email"
                                                    required
                                                    value={supportData.email}
                                                    onChange={e => setSupportData({ ...supportData, email: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                                    placeholder="mail@host.com"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp No</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                                <input
                                                    required
                                                    value={supportData.whatsapp}
                                                    onChange={e => setSupportData({ ...supportData, whatsapp: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-600 transition-all"
                                                    placeholder="+92 300..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Issue Description</label>
                                        <div className="relative group">
                                            <FileText className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                            <textarea
                                                required
                                                rows={4}
                                                value={supportData.description}
                                                onChange={e => setSupportData({ ...supportData, description: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-600 transition-all resize-none"
                                                placeholder="Explain your problem..."
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={supportLoading}
                                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest mt-4 disabled:opacity-70"
                                    >
                                        {supportLoading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <span>Submit Support Ticket</span>
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
