import React, { useState, useEffect } from 'react';
import { Building2, Mail, Phone, MapPin, ArrowRight, LayoutDashboard } from 'lucide-react';
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
        companyAddress: ''
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
            const API_URL = 'http://localhost:2000/api/company-requests';

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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Simple Background */}
            <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>

            <div className="relative w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                    <div className="p-10">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Organization Setup</h1>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Welcome, {username}. Tell us about your company.</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-bold flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-600"></div>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <FormInput
                                label="Company Name"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                icon={Building2}
                                placeholder="Business Name"
                                required
                            />

                            <div className="grid grid-cols-2 gap-5">
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
                                <FormInput
                                    label="Phone"
                                    name="companyPhone"
                                    value={formData.companyPhone}
                                    onChange={handleChange}
                                    icon={Phone}
                                    placeholder="+92 300..."
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Office Address</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-4 top-3 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                    <textarea
                                        name="companyAddress"
                                        rows={3}
                                        value={formData.companyAddress}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-600 transition-all placeholder:text-slate-300 resize-none"
                                        placeholder="Full business address"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-blue-950 text-white rounded-lg font-bold hover:bg-[#0B1033] transition-all shadow-sm shadow-blue-100 active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
                            >
                                {loading ? 'Submitting Request...' : (
                                    <>
                                        <span>Submit for Approval</span>
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FormInput = ({ label, icon: Icon, ...props }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative group">
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input
                {...props}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:border-blue-600 transition-all placeholder:text-slate-300"
            />
        </div>
    </div>
);

export default CompanySetup;
