import React from 'react';

const StatCard = ({ label, value, trend, icon: Icon, colorAccent }) => {
  // Extract background and text colors from colorAccent prop, 
  // e.g. colorAccent="text-emerald-600 bg-emerald-50"
  
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          {label}
        </p>
        <p className="text-4xl font-bold text-slate-800 tabular-nums mt-2">{value}</p>
        {trend && (
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            {trend}
          </p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${colorAccent || 'text-indigo-600 bg-indigo-50'}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};

export default StatCard;
