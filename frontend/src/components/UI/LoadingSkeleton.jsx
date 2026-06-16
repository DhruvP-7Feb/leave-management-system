import React from 'react';

const Skeleton = ({ type = 'text', rows = 3 }) => {
  if (type === 'table') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="h-3 bg-slate-200 rounded-full w-32 animate-pulse" />
        </div>
        {[...Array(rows || 5)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-slate-100 flex gap-4">
            <div className="h-3 bg-slate-100 rounded-full w-1/4 animate-pulse" />
            <div className="h-3 bg-slate-100 rounded-full w-1/3 animate-pulse" />
            <div className="h-3 bg-slate-100 rounded-full w-1/5 animate-pulse" />
            <div className="h-3 bg-slate-100 rounded-full w-16 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'stats') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between">
              <div className="h-3 bg-slate-200 rounded-full w-20 animate-pulse" />
              <div className="h-8 w-8 bg-slate-200 rounded-xl animate-pulse" />
            </div>
            <div className="h-8 bg-slate-200 rounded-full w-16 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i} 
          className="h-4 bg-slate-200 rounded-full"
          style={{ width: `${Math.random() * 40 + 60}%` }} 
        />
      ))}
    </div>
  );
};

export default Skeleton;
