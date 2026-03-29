import React, { useState } from 'react';
import { User, Lock, Mail, ArrowRight, LayoutDashboard, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            // Using cloud server directly or via electronAPI if exposed? 
            // Assuming we need to hit the cloud server. 
            // If running in Electron, we should probably use the IPC or direct fetch if allowed.
            // For now, let's assume direct fetch to the cloud server URL or local dev.
            // But wait, the previous code in Login.js used window.electronAPI.loginUser.
            // We need a similar IPC handler for signup, or just fetch if we know the URL.
            // Let's assume we need to add 'signup' to electronAPI/main.js later, 
            // OR use a direct fetch to the backend URL if configured.
            // Let's try window.electronAPI.signupUser if it exists (we need to add it),
            // or fallback to fetch.

            // Since we haven't updated main.js yet, this frontend code might fail if we rely on IPC.
            // BUT, the goal is to implement the flow. I will assume we will update main.js or use fetch.
            // Let's use fetch for now to localhost:2000 (as seen in index.js) or dynamic.

            const API_URL = 'https://businessdevelopment-nine.vercel.app/api/auth/signup';

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (data.success) {
                // Redirect to Company Setup with userId
                navigate('/setup-company', {
                    state: {
                        userId: data.id,
                        username: data.username
                    }
                });
            } else {
                setError(data.message || 'Registration failed');
            }
        } catch (err) {
            console.error(err);
            setError('Connection failed. Please try again.');
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
                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:scale-110 active:scale-95 transition-all duration-300 group"
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
                    <div className="p-10">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-400 rounded-xl mb-4 border border-emerald-100 dark:border-emerald-900/50">
                                <LayoutDashboard size={28} />
                            </div>
                            <h1 className="text-2xl font-bold text-black dark:text-slate-100 tracking-tight">Sign Up</h1>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-lg text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center gap-3 tracking-tight">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-500"></div>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <FormInput
                                label="Username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                icon={User}
                                placeholder="Enter username"
                                required
                            />
                            <FormInput
                                label="Email Address"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                icon={Mail}
                                placeholder="your@email.com"
                                required
                            />
                            <FormInput
                                label="Password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={handleChange}
                                icon={Lock}
                                placeholder="Create a password"
                                required
                                showToggle
                                isVisible={showPassword}
                                onToggle={() => setShowPassword(!showPassword)}
                            />
                            <FormInput
                                label="Confirm Password"
                                name="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                icon={Lock}
                                placeholder="Repeat password"
                                required
                                showToggle
                                isVisible={showConfirmPassword}
                                onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                            />



                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 text-sm disabled:opacity-70 flex items-center justify-center gap-2 tracking-tight"
                            >
                                {loading ? 'Creating Account...' : (
                                    <>
                                        <span>Create Account</span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-sm text-slate-400 dark:text-slate-500 font-semibold tracking-tight">
                                Already have an account?{' '}
                                <Link to="/login" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors">Login</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FormInput = ({ label, icon: Icon, disabled, showToggle, isVisible, onToggle, ...props }) => (
    <div className="space-y-1.5 text-left">
        <label className="text-sm font-semibold text-black dark:text-slate-500 ml-1 tracking-tight">{label}</label>
        <div className="relative group">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={18} />}
            <input
                {...props}
                className={`w-full ${Icon ? 'pl-12' : 'px-4'} ${showToggle ? 'pr-12' : 'pr-4'} py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600`}
            />
            {showToggle && (
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                    {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            )}
        </div>
    </div>
);

export default Signup;
