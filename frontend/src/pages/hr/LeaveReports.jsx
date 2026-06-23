import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components/UI/Toast';
import { getHRLeaveReport, exportLeaveReportCSV } from '../../api/reports.api';
import { getDepartments } from '../../api/auth.api';
import StatusBadge from '../../components/UI/StatusBadge';
import LoadingSkeleton from '../../components/UI/LoadingSkeleton';
import EmptyState from '../../components/UI/EmptyState';
import Pagination from '../../components/UI/Pagination';
import { format } from 'date-fns';
import PageHeader from '../../components/UI/PageHeader';
import Avatar from '../../components/UI/Avatar';
import { 
  Search, FileDown, Calendar, Filter, X, 
  ChevronRight, Inbox, HelpCircle 
} from 'lucide-react';

const LeaveReports = () => {
  const toast = useToast();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [departments, setDepartments] = useState([]);

  // Filter states
  const [employee, setEmployee] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const perPage = 20;

  const loadFilterData = async () => {
    try {
      const depts = await getDepartments();
      setDepartments(depts || []);
    } catch (err) {
      // Non-critical department list error
      console.error('Failed to load departments');
    }
  };

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (employee) params.employee = employee;
      if (department) params.department = department;
      if (status) params.status = status;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await getHRLeaveReport(params);
      setLeaves(data || []);
      setPage(1); // Reset page to first page on search/filter changes
    } catch (err) {
      toast.error('Failed to load leave report records');
    } finally {
      setLoading(false);
    }
  }, [employee, department, status, startDate, endDate, toast]);

  useEffect(() => {
    loadFilterData();
  }, []);

  // Debounced search trigger or load on input submit
  useEffect(() => {
    const handler = setTimeout(() => {
      loadReportData();
    }, 400); // Debounce API calls by 400ms for text fields

    return () => clearTimeout(handler);
  }, [employee, department, status, startDate, endDate]);

  const handleClearFilters = () => {
    setEmployee('');
    setDepartment('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    toast.info('Filters cleared');
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = {};
      if (employee) params.employee = employee;
      if (department) params.department = department;
      if (status) params.status = status;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await exportLeaveReportCSV(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leave_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported successfully');
    } catch (err) {
      toast.error('Failed to export CSV report');
    } finally {
      setExporting(false);
    }
  };

  // Client-side pagination slice
  const startIndex = (page - 1) * perPage;
  const paginatedLeaves = leaves.slice(startIndex, startIndex + perPage);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Reports & Records"
        subtitle="Search, filter, and audit all leave requests across the organization"
        action={
          <button
            onClick={handleExportCSV}
            disabled={exporting || leaves.length === 0}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm hover:shadow-md cursor-pointer shrink-0 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export Filtered CSV'}
          </button>
        }
      />

      {/* Filter panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Employee search */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Employee Name</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Department search */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date range from */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Date range to */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Clear filter indicator */}
        {(employee || department || status || startDate || endDate) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Report Table Board */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Report Records ({leaves.length} items found)
          </span>
        </div>

        {loading ? (
          <div className="p-4">
            <LoadingSkeleton type="table" rows={6} />
          </div>
        ) : paginatedLeaves.length === 0 ? (
          <div className="p-16 text-center">
            <EmptyState
              icon={Inbox}
              title="No records found"
              description="No leave records matched the specified filters. Try adjusting your search values."
            />
          </div>
        ) : (
          <>
            {/* Sticky Header Table Wrapper */}
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm text-left relative border-collapse">
                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                  <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                    <th className="px-6 py-3.5 bg-slate-50">Employee</th>
                    <th className="px-6 py-3.5 bg-slate-50">Department</th>
                    <th className="px-6 py-3.5 bg-slate-50">Leave Type</th>
                    <th className="px-6 py-3.5 bg-slate-50">Dates</th>
                    <th className="px-6 py-3.5 bg-slate-50">Days</th>
                    <th className="px-6 py-3.5 bg-slate-50">Status</th>
                    <th className="px-6 py-3.5 bg-slate-50">Approved By</th>
                    <th className="px-6 py-3.5 bg-slate-50">Employee Reason</th>
                    <th className="px-6 py-3.5 bg-slate-50">Rejection Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={leave.employee_name || 'U'} size="sm" />
                          <p className="font-semibold text-slate-900 leading-tight">{leave.employee_name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {leave.department || <span className="text-slate-300 italic">None</span>}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{leave.leave_type}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {format(new Date(leave.start_date), 'MMM d, yyyy')} — {format(new Date(leave.end_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{leave.total_days}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={leave.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {leave.approved_by ? (
                          <span className="font-medium text-slate-700">{leave.approved_by}</span>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 min-w-[150px] max-w-xs whitespace-normal break-words" title={leave.reason}>
                        {leave.reason || <span className="text-slate-300 italic">—</span>}
                      </td>
                      <td className="px-6 py-4 text-red-500 font-medium min-w-[150px] max-w-xs whitespace-normal break-words" title={leave.rejection_reason}>
                        {leave.rejection_reason || <span className="text-slate-300 italic">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <Pagination
              total={leaves.length}
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

export default LeaveReports;
