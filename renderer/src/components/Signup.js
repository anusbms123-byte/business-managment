import React, { useState } from 'react';
import { User, Lock, Mail, ArrowRight, LayoutDashboard, Eye, EyeOff } from 'lucide-react';
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

            const API_URL = 'https://businessdevelopment-ten.vercel.app/api/auth/signup';

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

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Minimal Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-100/50 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

            <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
                <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                    <div className="p-10">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 text-blue-900 rounded-xl mb-4 border border-blue-100">
                                <LayoutDashboard size={28} />
                            </div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Create Your Account</h1>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-bold flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-600"></div>
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
                                placeholder="Enter your Username"
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
                                className="w-full py-3.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-[#0B1033] transition-all shadow-sm shadow-blue-100 active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Creating Account...' : (
                                    <>
                                        <span>register account </span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-xs text-slate-400 font-bold">
                                Already have an account?{' '}
                                <Link to="/login" className="text-blue-600 hover:text-blue-800 transition-colors">Sign in</Link>
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
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative group">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />}
            <input
                {...props}
                className={`w-full ${Icon ? 'pl-12' : 'px-4'} ${showToggle ? 'pr-12' : 'pr-4'} py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-600 transition-all placeholder:text-slate-300`}
            />
            {showToggle && (
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                    {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            )}
        </div>
    </div>
);

export default Signup;
