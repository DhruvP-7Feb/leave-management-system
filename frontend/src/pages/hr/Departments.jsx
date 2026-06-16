import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/UI/Toast';
import { getDepartments, createDepartment, assignManager, getEmployees } from '../../api/auth.api';
import LoadingSkeleton from '../../components/UI/LoadingSkeleton';
import EmptyState from '../../components/UI/EmptyState';
import { Building, User, Plus, RefreshCw, Layers, X } from 'lucide-react';

const Departments = () => {
  const toast = useToast();

  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null); // Tracks inline manager update state

  // Modal & Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [formError, setFormError] = useState('');

  const loadInitialData = async () => {
    try {
      const [depts, emps] = await Promise.all([
        getDepartments(),
        getEmployees(),
      ]);
      setDepartments(depts || []);
      // Filter list of employees to only show active manager accounts
      const activeManagers = (emps || []).filter(
        (emp) => emp.role === 'manager' && emp.is_active
      );
      setManagers(activeManagers);
    } catch (err) {
      toast.error('Failed to load department management records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Department name is required');
      return;
    }
    setFormError('');
    setSubmitting(true);

    try {
      await createDepartment({ 
        name: name.trim(),
        manager: selectedManager ? parseInt(selectedManager) : null
      });
      toast.success(`Department "${name}" created successfully`);
      setName('');
      setSelectedManager('');
      setShowAddModal(false); // Close Modal
      // Reload list
      const updatedDepts = await getDepartments();
      setDepartments(updatedDepts);
    } catch (err) {
      const serverErrors = err.response?.data || {};
      if (serverErrors.name) {
        setFormError(serverErrors.name[0]);
      } else {
        toast.error(serverErrors.error || 'Failed to create department');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleManagerChange = async (deptId, managerId) => {
    setUpdatingId(deptId);
    try {
      const mId = managerId ? parseInt(managerId) : null;
      await assignManager(deptId, mId);
      
      const selectedMgr = managers.find((m) => m.id === mId);
      const mgrName = selectedMgr ? selectedMgr.name : 'Unassigned';
      
      toast.success(`Assigned manager "${mgrName}" successfully`);
      
      // Update local state without full reload
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === deptId
            ? { ...d, manager: mId, manager_name: mgrName }
            : d
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign manager');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-slate-200 rounded w-48 animate-pulse" />
        </div>
        <LoadingSkeleton type="table" rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Modal Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Department Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure system departments and assign active managers inline
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm hover:shadow-md cursor-pointer shrink-0"
        >
          <Building className="w-4 h-4" />
          Create Department
        </button>
      </div>

      {/* Full-width Department Directory */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            Department Directory
          </h3>
        </div>

        {departments.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={Building}
              title="No departments found"
              description="There are no departments created in the organization database."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                  <th className="px-6 py-4">Department ID</th>
                  <th className="px-6 py-4">Department Name</th>
                  <th className="px-6 py-4">Assigned Manager</th>
                  <th className="px-6 py-4 text-right">Inline Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-400 font-bold">
                      #{dept.id}
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {dept.name}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        {dept.manager_name ? (
                          <span className="font-semibold text-slate-800">{dept.manager_name}</span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Unassigned</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {updatingId === dept.id && (
                          <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />
                        )}
                        <select
                          value={dept.manager || ''}
                          onChange={(e) => handleManagerChange(dept.id, e.target.value)}
                          disabled={updatingId !== null}
                          className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition cursor-pointer font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="">-- Assign Manager --</option>
                          {managers.map((mgr) => (
                            <option key={mgr.id} value={mgr.id}>
                              {mgr.name} ({mgr.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Department Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowAddModal(false)}
          />

          {/* Modal Box */}
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                Create Department
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDept} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, Sales, Marketing"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setFormError('');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 transition ${
                    formError ? 'border-red-300 focus:ring-red-500/10' : 'border-slate-300 focus:ring-indigo-500/10 focus:border-indigo-500'
                  }`}
                  autoFocus
                />
                {formError && <p className="mt-1.5 text-[10px] font-medium text-red-600">{formError}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign Manager (Optional)</label>
                <select
                  value={selectedManager}
                  onChange={(e) => setSelectedManager(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition cursor-pointer font-medium"
                >
                  <option value="">-- No Manager Assigned --</option>
                  {managers.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.name} ({mgr.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
