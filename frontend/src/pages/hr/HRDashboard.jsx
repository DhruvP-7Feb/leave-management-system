import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/UI/Toast';
import { getHRDashboardSummary, getHRLeaveReport, exportLeaveReportCSV } from '../../api/reports.api';
import StatCard from '../../components/UI/StatCard';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSkeleton from '../../components/UI/LoadingSkeleton';
import EmptyState from '../../components/UI/EmptyState';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/UI/PageHeader';
import Avatar from '../../components/UI/Avatar';
import { 
  Calendar, FileDown, Inbox, BarChart3, PieChart as PieIcon, 
  Layers, User, Clock, CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const CHART_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#3B82F6', '#06B6D4', '#EC4899', '#8B5CF6'];
const STATUS_COLORS = {
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  cancelled: '#64748B'
};

const HRDashboard = () => {
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    try {
      const [sumData, leavesData] = await Promise.all([
        getHRDashboardSummary(),
        getHRLeaveReport(),
      ]);
      setSummary(sumData);
      setLeaves(leavesData || []);
    } catch (err) {
      toast.error('Failed to load HR dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await exportLeaveReportCSV();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'organization_leave_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV Report exported successfully');
    } catch (err) {
      toast.error('Failed to export CSV report');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-200 rounded w-48 animate-pulse" />
        <LoadingSkeleton type="stats" />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
        <LoadingSkeleton type="table" rows={6} />
      </div>
    );
  }

  // Calculate status data for donut chart
  const statusCounts = {};
  leaves.forEach(l => {
    const status = l.status?.toLowerCase() || 'pending';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  const statusData = Object.keys(statusCounts).map(status => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: statusCounts[status],
    color: STATUS_COLORS[status] || '#64748B'
  }));

  // Calculate department distribution for bar chart
  const deptMap = {};
  leaves.forEach(l => {
    const dept = l.department || 'No Department';
    deptMap[dept] = (deptMap[dept] || 0) + parseFloat(l.total_days || 0);
  });
  const deptData = Object.keys(deptMap).map(dept => ({
    name: dept,
    days: parseFloat(deptMap[dept].toFixed(1))
  })).sort((a, b) => b.days - a.days).slice(0, 8); // Top 8 departments

  // Calculate leave type distribution for type distribution chart
  const typeMap = {};
  leaves.forEach(l => {
    const type = l.leave_type || 'Other';
    typeMap[type] = (typeMap[type] || 0) + 1;
  });
  const typeData = Object.keys(typeMap).map(type => ({
    name: type,
    value: typeMap[type]
  }));

  const recentLeaves = leaves.slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Analytics Dashboard"
        subtitle="Aggregate statistics, department comparisons, and active leave records"
        action={
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 border border-slate-300 rounded-lg text-sm transition-colors shadow-sm cursor-pointer shrink-0 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            {exporting ? 'Exporting CSV...' : 'Export Leave CSV'}
          </button>
        }
      />

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard 
          label="Leaves Taken This Month" 
          value={summary?.total_leaves_this_month || 0} 
          icon={CheckCircle2} 
          colorAccent="text-emerald-600 bg-emerald-50" 
          trend="Approved leaves this month"
        />

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">
              Global Pending Approvals
            </span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 relative">
              <Clock className="w-5 h-5" />
              {(summary?.pending_approvals || 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              )}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-slate-800 tracking-tight">{summary?.pending_approvals || 0}</p>
            <p className="text-xs text-slate-400 mt-1">Awaiting manager action</p>
          </div>
        </div>

        <StatCard 
          label="Upcoming Leaves (Next 7 Days)" 
          value={summary?.upcoming_leaves_this_week || 0} 
          icon={Calendar} 
          colorAccent="text-indigo-600 bg-indigo-50" 
          trend="Starts within one week"
        />
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">
              Request Status Distribution
            </h3>
          </div>
          <div className="flex-1 min-h-[220px] flex items-center justify-center">
            {statusData.length === 0 ? (
              <EmptyState title="No data to render chart" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Leaves by Department */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">
              Approved Leave Days by Department
            </h3>
          </div>
          <div className="flex-1 min-h-[220px] flex items-center justify-center">
            {deptData.length === 0 ? (
              <EmptyState title="No data to render chart" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptData} margin={{ bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                  <Tooltip 
                    formatter={(value) => [`${value} days`, 'Leave Days']}
                    contentStyle={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="days" fill="#4F46E5" radius={[3, 3, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Leave Type Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">
              Leave Type Distribution
            </h3>
          </div>
          <div className="flex-1 min-h-[220px] flex items-center justify-center">
            {typeData.length === 0 ? (
              <EmptyState title="No data to render chart" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={typeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-slate-400" />
            Recent Organization Leave Records
          </h3>
          <Link 
            to="/hr/leave-reports" 
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            All Reports & Filter
          </Link>
        </div>

        {recentLeaves.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              title="No leave requests"
              description="No leave requests have been filed in the organization yet."
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
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={leave.employee_name || 'U'} size="sm" />
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">{leave.employee_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{leave.department || 'No Dept'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">{leave.leave_type}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {format(new Date(leave.start_date), 'MMM d')} — {format(new Date(leave.end_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{leave.total_days}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={leave.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {leave.approved_by || <span className="text-slate-300 italic">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRDashboard;
