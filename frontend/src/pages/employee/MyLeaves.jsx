import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/UI/Toast';
import { getMyLeaves, cancelLeave } from '../../api/leave.api';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSkeleton from '../../components/UI/LoadingSkeleton';
import EmptyState from '../../components/UI/EmptyState';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import Pagination from '../../components/UI/Pagination';
import ApplyLeaveModal from '../../components/Leave/ApplyLeaveModal';
import { format } from 'date-fns';
import PageHeader from '../../components/UI/PageHeader';
import { Calendar, Search, XCircle, Plus } from 'lucide-react';

const MyLeaves = () => {
  const toast = useToast();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [statusTab, setStatusTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Modals state
  const [applyOpen, setApplyOpen] = useState(false);
  const [cancelId, setCancelId] = useState(null);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const data = await getMyLeaves();
      setLeaves(data);
    } catch (err) {
      toast.error('Failed to load leave history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleCancelConfirm = async () => {
    if (!cancelId) return;
    try {
      await cancelLeave(cancelId);
      toast.success('Leave request cancelled successfully');
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel leave request');
    } finally {
      setCancelId(null);
    }
  };

  // Client-side filtering
  const filteredLeaves = leaves.filter((leave) => {
    const matchesStatus =
      statusTab === 'all' || leave.status?.toLowerCase() === statusTab.toLowerCase();
    
    const leaveName = (leave.leave_type_name || leave.leave_type || '').toLowerCase();
    const matchesSearch = leaveName.includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // Client-side pagination
  const totalRecords = filteredLeaves.length;
  const paginatedLeaves = filteredLeaves.slice((page - 1) * perPage, page * perPage);

  // Reset page when filter shifts
  const handleTabChange = (tab) => {
    setStatusTab(tab);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-6 bg-slate-200 rounded w-36 animate-pulse" />
          <div className="h-4 bg-slate-200 rounded w-56 mt-2 animate-pulse" />
        </div>
        <LoadingSkeleton type="table" rows={6} />
      </div>
    );
  }

  const tabOptions = ['all', 'pending', 'approved', 'rejected', 'cancelled'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Leaves"
        subtitle="Track and manage your leave requests"
        action={
          <button
            onClick={() => setApplyOpen(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm hover:shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Apply for Leave
          </button>
        }
      />

      {/* Filter tab bar & Search bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {tabOptions.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition cursor-pointer shrink-0 ${
                statusTab === tab
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by leave type..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition bg-white"
          />
        </div>
      </div>

      {/* Leaves list table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {paginatedLeaves.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={Calendar}
              title="No leave requests found"
              description="No leaves match your status selection or search term. Apply for time off to add records."
              action={
                <button
                  onClick={() => setApplyOpen(true)}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Apply for Leave
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Leave Type</th>
                    <th className="px-6 py-3">Start Date</th>
                    <th className="px-6 py-3">End Date</th>
                    <th className="px-6 py-3">Working Days</th>
                    <th className="px-6 py-3">Reason</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Applied On</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {leave.leave_type_name || leave.leave_type}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {format(new Date(leave.start_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {format(new Date(leave.end_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{leave.total_days}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-[180px] truncate" title={leave.reason}>
                        {leave.reason}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={leave.status} />
                        {leave.status?.toLowerCase() === 'rejected' && leave.rejection_reason && (
                          <div className="text-[11px] text-red-600 mt-1.5 max-w-[160px] leading-tight font-medium bg-red-50 p-1.5 rounded border border-red-100">
                            <span className="font-bold">Reason:</span> {leave.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {format(new Date(leave.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {leave.status?.toLowerCase() === 'pending' && (
                          <button
                            onClick={() => setCancelId(leave.id)}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <Pagination
              total={totalRecords}
              page={page}
              perPage={perPage}
              onChange={(p) => setPage(p)}
            />
          </>
        )}
      </div>

      {/* Apply modal */}
      {applyOpen && (
        <ApplyLeaveModal
          onClose={() => setApplyOpen(false)}
          onSuccess={() => {
            setApplyOpen(false);
            fetchLeaves();
          }}
        />
      )}

      {/* Cancellation modal */}
      <ConfirmDialog
        isOpen={cancelId !== null}
        title="Cancel Leave Request"
        message="Are you sure you want to cancel this leave request? This action will remove the request and restore any allocated balance."
        confirmLabel="Yes, Cancel Request"
        confirmStyle="danger"
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelId(null)}
      />
    </div>
  );
};

export default MyLeaves;
