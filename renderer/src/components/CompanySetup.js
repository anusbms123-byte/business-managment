import React, { useState, useEffect } from 'react';
import { Building2, Mail, Phone, MapPin, ArrowRight, LayoutDashboard, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const CompanySetup = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [userId, setUserId] = useState(null);
    const [username, setUsername] = useState('');

    useEffect(() => {
        if (location.state?.userId) {
            setUserId(location.state.userId);
            setUsername(location.state.username);
        } else {
            // If no state, redirect to login or signup
            navigate('/signup');
        }
    }, [location, navigate]);

    const [formData, setFormData] = useState({
        companyName: '',
        companyEmail: '',
        companyPhone: '',
        companyAddress: '',
        officePhone: '',
        city: '',
        referralCode: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const API_URL = 'https://business-managment-gamma.vercel.app/api/company-requests';

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    ...formData
                })
            });

            const data = await response.json();

            if (data.success) {
                navigate('/approval-pending');
            } else {
                setError(data.message || 'Submission failed');
            }
        } catch (err) {
            console.error(err);
            setError('Connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
            {/* Simple Background */}
            <div className="absolute inset-0 bg-grid-slate-200/20 dark:bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>

            <div className="relative w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-10">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Setup Company</h1>
                            <p className="text-slate-400 dark:text-slate-500 text-sm font-semibold mt-2 tracking-tight">Welcome, {username}. Please enter your company details.</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-lg text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-500"></div>
                                <span className="text-sm font-semibold tracking-tight">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <FormInput
                                    label="Company Name"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    icon={Building2}
                                    placeholder="Enter company name"
                                    required
                                />
                                <FormInput
                                    label="Email"
                                    name="companyEmail"
                                    type="email"
                                    value={formData.companyEmail}
                                    onChange={handleChange}
                                    icon={Mail}
                                    placeholder="contact@company.com"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <FormInput
                                    label="Contact No"
                                    name="companyPhone"
                                    value={formData.companyPhone}
                                    onChange={handleChange}
                                    icon={Phone}
                                    placeholder="+92 300..."
                                    required
                                />
                                <FormInput
                                    label="Landline No"
                                    name="officePhone"
                                    value={formData.officePhone}
                                    onChange={handleChange}
                                    icon={Phone}
                                    placeholder="Enter landline no"
                                />
                                <FormInput label="City" name="city" value={formData.city} onChange={handleChange} placeholder="Enter your city" required />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-black dark:text-slate-500 ml-1 tracking-tight">Company Address</label>
                                <textarea
                                    name="companyAddress"
                                    rows={2}
                                    value={formData.companyAddress}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none"
                                    placeholder="Enter company address"
                                    required
                                />
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-end gap-6">
                                <div className="flex-1">
                                    <FormInput
                                        label="Promo Code (Optional)"
                                        name="referralCode"
                                        value={formData.referralCode}
                                        onChange={handleChange}
                                        icon={Users}
                                        placeholder="Enter promo code"
                                    />
                                </div>
                                <div className="flex flex-col space-y-1.5">
                                    <label className="text-sm font-semibold text-transparent select-none ml-1 tracking-tight">Action</label>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-10 h-[46px] bg-emerald-600 dark:bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-700 transition-all shadow-sm active:scale-95 text-sm flex items-center justify-center gap-2 tracking-tight"
                                    >
                                        {loading ? 'Creating...' : (
                                            <>
                                                <span>Create Company</span>
                                                <ArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FormInput = ({ label, icon: Icon, disabled, ...props }) => (
    <div className="space-y-1.5">
        <label className="text-sm font-semibold text-black dark:text-slate-500 ml-1 tracking-tight">{label}</label>
        <div className="relative group">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors" size={18} />}
            <input
                {...props}
                className={`w-full ${Icon ? 'pl-12' : 'px-4'} pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600`}
            />
        </div>
    </div>
);

export default CompanySetup;
