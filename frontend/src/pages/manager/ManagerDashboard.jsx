import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/UI/Toast';
import { getPendingRequests, approveLeave, rejectLeave, getManagerStats } from '../../api/leave.api';
import { getPublicEmployees } from '../../api/auth.api';
import StatCard from '../../components/UI/StatCard';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSkeleton from '../../components/UI/LoadingSkeleton';
import EmptyState from '../../components/UI/EmptyState';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import RejectReasonModal from '../../components/Leave/RejectReasonModal';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/UI/PageHeader';
import Avatar from '../../components/UI/Avatar';
import { 
  Users, CheckCircle2, Clock, XCircle, 
  Calendar, Inbox, Check, X
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const CHART_COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6'];

const ManagerDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [pendingRequests, setPendingRequests] = useState([]);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  // Modal / Dialog states
  const [confirmApproveId, setConfirmApproveId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [processing, setProcessing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [pending, emps, stats] = await Promise.all([
        getPendingRequests(),
        getPublicEmployees(),
        getManagerStats(),
      ]);
      setPendingRequests(pending || []);
      setEmployeesCount(emps ? emps.length : 0);
      setApprovedCount(stats?.approved_this_month || 0);
      setRejectedCount(stats?.rejected_this_month || 0);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApprove = async () => {
    if (!confirmApproveId) return;
    setProcessing(true);
    try {
      await approveLeave(confirmApproveId);
      toast.success('Leave request approved successfully');
      setPendingRequests((prev) => prev.filter((r) => r.id !== confirmApproveId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setConfirmApproveId(null);
      setProcessing(false);
    }
  };

  const handleReject = async (reason) => {
    if (!rejectId) return;
    setProcessing(true);
    try {
      await rejectLeave(rejectId, reason);
      toast.success('Leave request rejected');
      setPendingRequests((prev) => prev.filter((r) => r.id !== rejectId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setRejectId(null);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 bg-slate-200 rounded w-48 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-64 animate-pulse" />
          </div>
        </div>
        <LoadingSkeleton type="stats" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
        <LoadingSkeleton type="table" rows={4} />
      </div>
    );
  }

  // Group pending requests by employee for Donut Chart
  const employeeMap = {};
  pendingRequests.forEach(req => {
    const name = req.employee_name || 'Unknown';
    employeeMap[name] = (employeeMap[name] || 0) + parseFloat(req.total_days || 0);
  });
  const employeeData = Object.keys(employeeMap).map(name => ({
    name,
    value: parseFloat(employeeMap[name].toFixed(1))
  }));

  // Group pending requests by Leave Type for Bar Chart
  const leaveTypeMap = {};
  pendingRequests.forEach(req => {
    const type = req.leave_type || 'Other';
    leaveTypeMap[type] = (leaveTypeMap[type] || 0) + 1;
  });
  const leaveTypeData = Object.keys(leaveTypeMap).map(name => ({
    name,
    count: leaveTypeMap[name]
  }));

  const recentPending = pendingRequests.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manager Overview"
        subtitle="Review pending requests, team leaves, and balance statistics"
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Pending Approvals Card with Pulsing Amber Badge */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Pending Approvals
            </span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 relative">
              <Clock className="w-5 h-5" />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              )}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-slate-800 tracking-tight">{pendingRequests.length}</p>
            <p className="text-xs text-slate-400 mt-1">Awaiting action</p>
          </div>
        </div>

        <StatCard 
          label="Approved Requests" 
          value={approvedCount} 
          icon={CheckCircle2} 
          colorAccent="text-emerald-600 bg-emerald-50" 
          trend="This calendar month"
        />

        <StatCard 
          label="Rejected Requests" 
          value={rejectedCount} 
          icon={XCircle} 
          colorAccent="text-red-600 bg-red-50" 
          trend="This calendar month"
        />

        <StatCard 
          label="Team Members" 
          value={employeesCount} 
          icon={Users} 
          colorAccent="text-indigo-600 bg-indigo-50" 
          trend="Active staff in directory"
        />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart: Requests by Employee */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">
            Pending Leave Days by Employee
          </h3>
          <div className="flex-1 min-h-[260px] flex items-center justify-center">
            {employeeData.length === 0 ? (
              <EmptyState 
                title="No chart data" 
                description="No pending requests to visualize leave distribution."
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={employeeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {employeeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} working days`, 'Total Days']}
                    contentStyle={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart: Requests by Leave Type */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">
            Pending Leave Count by Type
          </h3>
          <div className="flex-1 min-h-[260px] flex items-center justify-center">
            {leaveTypeData.length === 0 ? (
              <EmptyState 
                title="No chart data" 
                description="No pending requests to visualize leave type distribution."
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={leaveTypeData} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    formatter={(value) => [`${value} requests`, 'Count']}
                    contentStyle={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Pending Requests Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Pending Approvals
          </h3>
          <Link 
            to="/manager/approvals" 
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            View All ({pendingRequests.length})
          </Link>
        </div>

        {recentPending.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={Inbox}
              title="All caught up!"
              description="There are no pending leave requests awaiting your decision."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Leave Type</th>
                  <th className="px-6 py-3">Dates</th>
                  <th className="px-6 py-3">Days</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPending.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={req.employee_name || 'U'} size="sm" />
                        <div>
                          <p className="font-semibold text-slate-900">{req.employee_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{req.department || 'No Department'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">{req.leave_type}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {format(new Date(req.start_date), 'MMM d')} — {format(new Date(req.end_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{req.total_days}</td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{req.reason || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setConfirmApproveId(req.id)}
                          className="p-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                          title="Approve Request"
                          disabled={processing}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRejectId(req.id)}
                          className="p-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg transition cursor-pointer"
                          title="Reject Request"
                          disabled={processing}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation & Rejection Dialogs */}
      <ConfirmDialog
        isOpen={confirmApproveId !== null}
        title="Approve Leave Request"
        message="Are you sure you want to approve this leave request? This will deduct the days from the employee's active balance."
        confirmLabel="Yes, Approve"
        confirmStyle="primary"
        onConfirm={handleApprove}
        onCancel={() => setConfirmApproveId(null)}
      />

      <RejectReasonModal
        isOpen={rejectId !== null}
        onClose={() => setRejectId(null)}
        onConfirm={handleReject}
      />
    </div>
  );
};

export default ManagerDashboard;
