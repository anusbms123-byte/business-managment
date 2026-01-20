import React, { useState } from 'react';
import { User, Lock, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';

const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
        </div>
    );
};

export default Login;
