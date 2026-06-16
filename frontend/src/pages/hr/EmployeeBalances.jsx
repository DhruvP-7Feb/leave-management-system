import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/UI/Toast';
import { getAllBalances } from '../../api/balance.api';
import LoadingSkeleton from '../../components/UI/LoadingSkeleton';
import EmptyState from '../../components/UI/EmptyState';
import Pagination from '../../components/UI/Pagination';
import PageHeader from '../../components/UI/PageHeader';
import Avatar from '../../components/UI/Avatar';
import { Search, Inbox, Scale, PieChart } from 'lucide-react';

const EmployeeBalances = () => {
  const toast = useToast();

  const [balances, setBalances] = useState([]);
  const [filteredBalances, setFilteredBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const perPage = 15;

  const loadBalances = async () => {
    try {
      const data = await getAllBalances();
      setBalances(data || []);
      setFilteredBalances(data || []);
    } catch (err) {
      toast.error('Failed to load employee leave balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  // Filter balances based on search term
  useEffect(() => {
    const term = search.toLowerCase().trim();
    if (!term) {
      setFilteredBalances(balances);
    } else {
      setFilteredBalances(
        balances.filter(
          (b) =>
            b.employee_name?.toLowerCase().includes(term) ||
            b.department?.toLowerCase().includes(term) ||
            b.leave_type?.toLowerCase().includes(term)
        )
      );
    }
    setPage(1); // Reset pagination on search
  }, [search, balances]);

  // Color code function based on remaining percentage
  const getProgressColor = (remaining, total) => {
    const t = parseFloat(total) || 0;
    const r = parseFloat(remaining) || 0;
    if (t === 0) return { bar: 'bg-slate-300', text: 'text-slate-500 bg-slate-50 border-slate-200' };

    const percentage = (r / t) * 100;

    if (percentage > 50) {
      return {
        bar: 'bg-emerald-500',
        text: 'text-emerald-700 bg-emerald-50 border-emerald-200'
      };
    } else if (percentage >= 20) {
      return {
        bar: 'bg-amber-500',
        text: 'text-amber-700 bg-amber-50 border-amber-200'
      };
    } else {
      return {
        bar: 'bg-red-500',
        text: 'text-red-700 bg-red-50 border-red-200'
      };
    }
  };

  // Pagination slice
  const startIndex = (page - 1) * perPage;
  const paginatedBalances = filteredBalances.slice(startIndex, startIndex + perPage);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-200 rounded w-48 animate-pulse" />
        <LoadingSkeleton type="table" rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Leave Balances"
        subtitle="Track and monitor leave quotas, consumption rates, and remaining balances"
        action={
          <div className="relative max-w-sm w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search employee, department, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-sm"
            />
          </div>
        }
      />

      {/* Main Balances Table Board */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {paginatedBalances.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <EmptyState
              icon={Inbox}
              title={search ? 'No balances match your search' : 'No employee balances'}
              description={
                search
                  ? `We couldn't find any balance records matching "${search}"`
                  : 'There are no active employee balances configured.'
              }
              action={
                search ? (
                  <button
                    onClick={() => setSearch('')}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Clear Search
                  </button>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Leave Type</th>
                    <th className="px-6 py-4 text-center">Annual Quota</th>
                    <th className="px-6 py-4 text-center">Used Days</th>
                    <th className="px-6 py-4 text-center">Remaining Balance</th>
                    <th className="px-6 py-4">Consumption progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedBalances.map((b) => {
                    const total = parseFloat(b.total_days) || 0;
                    const used = parseFloat(b.used_days) || 0;
                    const remaining = parseFloat(b.remaining_days) || 0;
                    
                    const usedPercent = total > 0 ? (used / total) * 100 : 0;
                    const colorStyles = getProgressColor(remaining, total);

                    return (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        {/* Employee Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={b.employee_name || 'U'} size="sm" />
                            <span className="font-semibold text-slate-900 leading-tight">
                              {b.employee_name}
                            </span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {b.department || <span className="text-slate-300 italic">None</span>}
                        </td>

                        {/* Leave Type */}
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {b.leave_type}
                        </td>

                        {/* Total Days */}
                        <td className="px-6 py-4 text-center font-bold text-slate-500">
                          {total}
                        </td>

                        {/* Used Days */}
                        <td className="px-6 py-4 text-center font-bold text-slate-700">
                          {used}
                        </td>

                        {/* Remaining Days (Color Coded Pill Badge) */}
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center rounded-full text-xs font-bold px-2.5 py-0.5 border ${colorStyles.text}`}>
                            {remaining} days
                          </span>
                        </td>

                        {/* Usage Progress Bar */}
                        <td className="px-6 py-4 min-w-[200px]">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${colorStyles.bar}`}
                                style={{ width: `${Math.min(100, Math.max(0, usedPercent))}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 w-8 text-right shrink-0">
                              {Math.round(usedPercent)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Widget */}
            <Pagination
              total={filteredBalances.length}
              page={page}
              perPage={perPage}
              onChange={(newPage) => setPage(newPage)}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeBalances;
