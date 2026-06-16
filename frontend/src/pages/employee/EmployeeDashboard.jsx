import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/UI/Toast';
import { getMyBalances } from '../../api/balance.api';
import { getMyLeaves, cancelLeave } from '../../api/leave.api';
import PageHeader from '../../components/UI/PageHeader';
import StatusBadge from '../../components/UI/StatusBadge';
import Skeleton from '../../components/UI/LoadingSkeleton';
import EmptyState from '../../components/UI/EmptyState';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import ApplyLeaveModal from '../../components/Leave/ApplyLeaveModal';
import { format, isAfter, startOfDay } from 'date-fns';
import { Calendar, Plus } from 'lucide-react';

const CARD_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#F43F5E']; // indigo, emerald, amber, rose

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [balances, setBalances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [applyOpen, setApplyOpen] = useState(false);
  const [cancelId, setCancelId] = useState(null);

  const greeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadDashboardData = async () => {
    try {
      const [balData, leavesData] = await Promise.all([
        getMyBalances(),
        getMyLeaves(),
      ]);
      setBalances(balData);
      setLeaves(leavesData);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCancelConfirm = async () => {
    if (!cancelId) return;
    try {
      await cancelLeave(cancelId);
      toast.success('Leave request cancelled successfully');
      loadDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel leave request');
    } finally {
      setCancelId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton type="stats" />
        <Skeleton type="table" rows={5} />
      </div>
    );
  }

  const recentRequests = leaves.slice(0, 5);
  const today = startOfDay(new Date());
  const upcomingLeaves = leaves
    .filter((l) => l.status === 'approved' && isAfter(new Date(l.start_date), today))
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0] || 'User'} 👋`}
        subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}
        action={
          <button
            onClick={() => setApplyOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-all duration-150 shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4.5 h-4.5" /> Apply for Leave
          </button>
        }
      />

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {balances.map((bal, idx) => {
          const total = parseFloat(bal.total_days) || 0;
          const used = parseFloat(bal.used_days) || 0;
          const remaining = parseFloat(bal.remaining_days) || 0;
          const usedPercent = total > 0 ? (used / total) * 100 : 0;
          const accentColor = CARD_COLORS[idx % CARD_COLORS.length];

          return (
            <div key={bal.leave_type} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">{bal.leave_type}</span>
              </div>
              <p className="text-3xl font-bold text-slate-800 tabular-nums">{remaining}</p>
              <p className="text-xs text-slate-400 mt-1">of {total} days remaining</p>
              
              <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, usedPercent)}%`, backgroundColor: accentColor }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">{used} days used</p>
            </div>
          );
        })}
        {balances.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            No active leave types configured. Contact HR Admin.
          </div>
        )}
      </div>

      {/* Tables and schedules row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Recent Leave Requests (col-span-3) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-800">Recent Leave Requests</h3>
            <Link to="/employee/my-leaves" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
              View all
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No leave requests yet"
              description="You haven't requested any time off yet."
            />
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Leave Type</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Dates</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Days</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((leave) => (
                    <tr key={leave.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">
                        {leave.leave_type_name || leave.leave_type}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {format(new Date(leave.start_date), 'MMM d')} — {format(new Date(leave.end_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-medium">{leave.total_days}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={leave.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {leave.status?.toLowerCase() === 'pending' && (
                          <button
                            onClick={() => setCancelId(leave.id)}
                            className="text-xs text-red-600 hover:text-red-800 font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Approved Leaves (col-span-2) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-800">Upcoming Leaves</h3>
          </div>

          <div className="flex-1 flex flex-col p-6">
            {upcomingLeaves.length === 0 ? (
              <div className="my-auto">
                <EmptyState
                  title="No upcoming approved leaves"
                  description="Any approved future leaves will appear here."
                />
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingLeaves.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors border-l-4 border-l-indigo-500"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {l.leave_type_name || l.leave_type}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {format(new Date(l.start_date), 'MMM d')} to {format(new Date(l.end_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-slate-800 tabular-nums">{l.total_days}</span>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">days</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {applyOpen && (
        <ApplyLeaveModal
          onClose={() => setApplyOpen(false)}
          onSuccess={() => {
            setApplyOpen(false);
            loadDashboardData();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={cancelId !== null}
        title="Cancel Leave Request"
        message="Are you sure you want to cancel this pending leave request?"
        confirmLabel="Cancel Request"
        confirmStyle="danger"
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelId(null)}
      />
    </div>
  );
};

export default EmployeeDashboard;
