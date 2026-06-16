import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/UI/Toast';
import { getPendingRequests, approveLeave, rejectLeave } from '../../api/leave.api';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSkeleton from '../../components/UI/LoadingSkeleton';
import EmptyState from '../../components/UI/EmptyState';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import RejectReasonModal from '../../components/Leave/RejectReasonModal';
import { format } from 'date-fns';
import PageHeader from '../../components/UI/PageHeader';
import Avatar from '../../components/UI/Avatar';
import { 
  Clock, Search, Calendar, Inbox, Check, X, 
  HelpCircle, UserCheck
} from 'lucide-react';

const PendingRequests = () => {
  const toast = useToast();

  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Action states
  const [confirmApproveId, setConfirmApproveId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [processing, setProcessing] = useState(false);

  const loadRequests = async () => {
    try {
      const data = await getPendingRequests();
      setRequests(data || []);
      setFilteredRequests(data || []);
    } catch (err) {
      toast.error('Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Filter requests based on search query
  useEffect(() => {
    const query = search.toLowerCase().trim();
    if (!query) {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(
        requests.filter(
          (r) =>
            r.employee_name?.toLowerCase().includes(query) ||
            r.leave_type?.toLowerCase().includes(query) ||
            r.reason?.toLowerCase().includes(query)
        )
      );
    }
  }, [search, requests]);

  const handleApprove = async () => {
    if (!confirmApproveId) return;
    setProcessing(true);
    // Optimistic UI update
    const previousRequests = [...requests];
    setRequests((prev) => prev.filter((r) => r.id !== confirmApproveId));
    
    try {
      await approveLeave(confirmApproveId);
      toast.success('Leave request approved successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve request');
      // Rollback on error
      setRequests(previousRequests);
    } finally {
      setConfirmApproveId(null);
      setProcessing(false);
    }
  };

  const handleReject = async (reason) => {
    if (!rejectId) return;
    setProcessing(true);
    // Optimistic UI update
    const previousRequests = [...requests];
    setRequests((prev) => prev.filter((r) => r.id !== rejectId));

    try {
      await rejectLeave(rejectId, reason);
      toast.success('Leave request rejected');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
      // Rollback on error
      setRequests(previousRequests);
    } finally {
      setRejectId(null);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-slate-200 rounded w-48 animate-pulse" />
        </div>
        <LoadingSkeleton type="table" rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Requests"
        subtitle="Review and action pending leaves submitted by your team"
        action={
          <div className="relative max-w-sm w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-sm"
            />
          </div>
        }
      />

      {/* Main Request Board */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {filteredRequests.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <EmptyState
              icon={Inbox}
              title={search ? 'No search results' : 'All caught up!'}
              description={
                search
                  ? `We couldn't find any pending requests matching "${search}"`
                  : 'You have no pending requests awaiting your decision.'
              }
              action={
                search ? (
                  <button
                    onClick={() => setSearch('')}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition"
                  >
                    Clear Search
                  </button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Leave Details</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Proxy Employee</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    {/* Employee Profile */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={req.employee_name || 'U'} size="sm" />
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">{req.employee_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{req.department || 'No Department'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Leave Type */}
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {req.leave_type}
                    </td>

                    {/* Dates and count */}
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-800">
                          {format(new Date(req.start_date), 'MMM d, yyyy')} — {format(new Date(req.end_date), 'MMM d, yyyy')}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Total of {req.total_days} {req.total_days === 1 ? 'working day' : 'working days'}
                        </span>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {req.reason || <span className="text-slate-300 italic">No reason provided</span>}
                    </td>

                    {/* Proxy Colleague */}
                    <td className="px-6 py-4 text-slate-600">
                      {req.proxy_employee_name ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-md px-2 py-1 w-max">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium">{req.proxy_employee_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* StatusBadge */}
                    <td className="px-6 py-4">
                      <StatusBadge status={req.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setConfirmApproveId(req.id)}
                          className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer"
                          disabled={processing}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectId(req.id)}
                          className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer"
                          disabled={processing}
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
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

      {/* Confirmation overlays */}
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

export default PendingRequests;
