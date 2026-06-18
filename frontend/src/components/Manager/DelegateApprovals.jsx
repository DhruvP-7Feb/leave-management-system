import React, { useState, useEffect } from 'react';
import { useToast } from '../UI/Toast';
import { getDelegations, createDelegation, deleteDelegation } from '../../api/leave.api';
import { getPublicEmployees } from '../../api/auth.api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { Users, Trash2, UserPlus, Calendar } from 'lucide-react';

const DelegateApprovals = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [delegations, setDelegations] = useState([]);
  const [potentialDelegates, setPotentialDelegates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [delegateId, setDelegateId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [delegationsData, employeesData] = await Promise.all([
        getDelegations(),
        getPublicEmployees(),
      ]);
      setDelegations(delegationsData || []);
      
      // Filter potential delegates: only managers and hr_admins, exclude self
      // Note: getPublicEmployees from the generic endpoint might not return roles if it's purely public
      // Wait, let's check what getPublicEmployees returns. It returns id, name, email. It might not return role.
      // If we don't have role, the backend createDelegation API validates it anyway:
      // "Delegate must be a manager or HR admin."
      // So we can show all employees, or just pass the ones that succeed.
      setPotentialDelegates((employeesData || []).filter(emp => emp.id !== user?.id));
    } catch (err) {
      toast.error('Failed to load delegation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!delegateId || !startDate || !endDate) {
      toast.error('Please fill out all fields');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast.error('End date cannot be before start date');
      return;
    }

    try {
      setSubmitting(true);
      const newDelegation = await createDelegation({
        delegate: delegateId,
        start_date: startDate,
        end_date: endDate,
      });
      toast.success('Approval rights delegated successfully');
      setDelegations(prev => [newDelegation, ...prev]);
      
      // Reset form
      setDelegateId('');
      setStartDate('');
      setEndDate('');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create delegation (delegate must be a Manager or HR Admin)';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDelegation(id);
      toast.success('Delegation revoked');
      setDelegations(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      toast.error('Failed to revoke delegation');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-6">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-slate-400" />
          Delegate Approvals
        </h3>
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Side: Create Form */}
        <div>
          <h4 className="text-sm font-medium text-slate-800 mb-1">Assign a Delegate</h4>
          <p className="text-xs text-slate-500 mb-4">
            Transfer your approval rights to another manager or HR Admin while you are away.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Select Delegate <span className="text-red-500">*</span>
              </label>
              <select
                value={delegateId}
                onChange={(e) => setDelegateId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a manager or HR admin</option>
                {potentialDelegates.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  End Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? 'Assigning...' : 'Assign Delegate'}
            </button>
          </form>
        </div>

        {/* Right Side: Active Delegations */}
        <div className="border-t md:border-t-0 md:border-l border-slate-100 md:pl-8 pt-6 md:pt-0">
          <h4 className="text-sm font-medium text-slate-800 mb-4">Active Delegations</h4>
          
          {loading ? (
            <div className="space-y-3">
              <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : delegations.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No active delegations</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {delegations.map(del => (
                <div key={del.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-start justify-between gap-3 shadow-sm hover:border-indigo-200 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{del.delegate_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {format(new Date(del.start_date), 'MMM d, yyyy')} - {format(new Date(del.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(del.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition shrink-0"
                    title="Revoke Delegation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default DelegateApprovals;
