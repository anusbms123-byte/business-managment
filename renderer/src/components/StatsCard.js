import React from 'react';

const StatsCard = ({ title, value, subtext, icon: Icon, color }) => {
    const getColorClasses = (c) => {
        switch (c) {
            case 'blue': return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800';
            case 'green': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800';
            case 'orange': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800';
            case 'red': return 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800';
            default: return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700';
        }
    };

    const getIconColor = (c) => {
        switch (c) {
            case 'blue': return 'text-blue-600 dark:text-blue-400';
            case 'green': return 'text-emerald-600 dark:text-emerald-400';
            case 'orange': return 'text-amber-600 dark:text-amber-400';
            case 'red': return 'text-rose-600 dark:text-rose-400';
            default: return 'text-slate-600 dark:text-slate-400';
        }
    };

    return (
        <div className="relative bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md dark:hover:shadow-blue-900/10 group animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 ${getIconColor(color)} transition-transform group-hover:scale-110`}>
                    <Icon size={20} />
                </div>
                <div className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-widest ${getColorClasses(color)}`}>
                    {subtext}
                </div>
            </div>

            <div>
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{title}</h3>
                <div className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {value}
                </div>
            </div>

            {/* Subtle Progress Bar Bottom Decor */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-50 dark:bg-slate-800 overflow-hidden rounded-b-xl">
                <div className={`h-full w-1/3 opacity-20 ${color === 'blue' ? 'bg-blue-600' : color === 'green' ? 'bg-emerald-600' : color === 'red' ? 'bg-rose-600' : 'bg-slate-400'}`}></div>
            </div>
        </div>
    );
};

export default StatsCard;
