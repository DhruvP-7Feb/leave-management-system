import React from 'react';

const StatusBadge = ({ status }) => {
  const normalizedStatus = (status || 'pending').toLowerCase();

  const styles = {
    pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      ring: 'ring-1 ring-amber-200',
      dot: 'bg-amber-400'
    },
    approved: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      ring: 'ring-1 ring-emerald-200',
      dot: 'bg-emerald-500'
    },
    rejected: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      ring: 'ring-1 ring-red-200',
      dot: 'bg-red-500'
    },
    cancelled: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      ring: 'ring-1 ring-slate-200',
      dot: 'bg-slate-400'
    }
  };

  const style = styles[normalizedStatus] || styles.pending;

  return (
    <span className={`rounded-full text-xs font-semibold px-3 py-1 inline-flex items-center gap-1.5 ${style.bg} ${style.text} ${style.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
};

export default StatusBadge;
