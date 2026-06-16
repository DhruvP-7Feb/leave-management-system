import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/UI/Toast';
import { 
  getEmployees, createEmployee, 
  deactivateEmployee, reactivateEmployee, getDepartments 
} from '../../api/auth.api';
import LoadingSkeleton from '../../components/UI/LoadingSkeleton';
import EmptyState from '../../components/UI/EmptyState';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import { format } from 'date-fns';
import { 
  UserPlus, Users, ToggleLeft, ToggleRight, 
  Search, Mail, Calendar, Key, User, X
} from 'lucide-react';

const Employees = () => {
  const toast = useToast();

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee');
  const [department, setDepartment] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Modal / Toggle states
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionUser, setActionUser] = useState(null); // { id, name, is_active }
  const [actionConfirmOpen, setActionConfirmOpen] = useState(false);

  const loadInitialData = async () => {
    try {
      const [emps, depts] = await Promise.all([
        getEmployees(),
        getDepartments()
      ]);
      setEmployees(emps || []);
      setDepartments(depts || []);
    } catch (err) {
      toast.error('Failed to load employee directory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!username.trim()) errors.username = 'Username is required';
    if (!password.trim() || password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errors.email = 'Valid email is required';
    if (!name.trim()) errors.name = 'Full name is required';
    if (!joiningDate) errors.joiningDate = 'Joining date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const data = {
      username: username.trim(),
      password: password.trim(),
      email: email.trim(),
      name: name.trim(),
      role,
      joining_date: joiningDate,
    };
    if (department) {
      data.department = parseInt(department);
    }

    try {
      await createEmployee(data);
      toast.success(`Employee ${name} created successfully`);
      
      // Reset form
      setUsername('');
      setPassword('');
      setEmail('');
      setName('');
      setRole('employee');
      setDepartment('');
      setJoiningDate('');
      setFormErrors({});
      setShowAddModal(false); // Close Modal

      // Reload list
      const updatedEmps = await getEmployees();
      setEmployees(updatedEmps);
    } catch (err) {
      const serverErrors = err.response?.data || {};
      if (serverErrors.username) {
        setFormErrors(prev => ({ ...prev, username: serverErrors.username[0] }));
      } else if (serverErrors.email) {
        setFormErrors(prev => ({ ...prev, email: serverErrors.email[0] }));
      } else {
        toast.error(serverErrors.error || 'Failed to create employee');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatusClick = (emp) => {
    setActionUser(emp);
    setActionConfirmOpen(true);
  };

  const handleToggleStatusConfirm = async () => {
    if (!actionUser) return;
    try {
      if (actionUser.is_active) {
        await deactivateEmployee(actionUser.id);
        toast.success(`Deactivated employee ${actionUser.name}`);
      } else {
        await reactivateEmployee(actionUser.id);
        toast.success(`Reactivated employee ${actionUser.name}`);
      }
      // Reload list
      const updatedEmps = await getEmployees();
      setEmployees(updatedEmps);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update employee status');
    } finally {
      setActionUser(null);
      setActionConfirmOpen(false);
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase()) ||
      emp.department?.toLowerCase().includes(search.toLowerCase())
  );

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
      {/* Header with Modal Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Staff Accounts Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure system roles, view directory logs, and manage accounts
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm hover:shadow-md cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Full-width Employee Directory */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* List Header with Search */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            Employee Directory
          </h3>
          
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff directory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="p-16 flex-1 flex items-center justify-center">
            <EmptyState
              icon={Users}
              title={search ? 'No results match search' : 'No staff found'}
              description={search ? `No employee entries contain the term "${search}"` : 'There are no employees in the system.'}
              action={search ? <button onClick={() => setSearch('')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer">Reset Search</button> : null}
            />
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Joining Date</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className={`hover:bg-slate-50 transition-colors ${!emp.is_active ? 'opacity-60 bg-slate-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8.5 h-8.5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                          {emp.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">{emp.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{emp.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full text-[10px] font-bold px-2 py-0.5 border capitalize ${
                        emp.role === 'hr_admin' 
                          ? 'text-red-700 bg-red-50 border-red-200' 
                          : emp.role === 'manager' 
                            ? 'text-indigo-700 bg-indigo-50 border-indigo-200' 
                            : 'text-slate-700 bg-slate-50 border-slate-200'
                      }`}>
                        {emp.role === 'hr_admin' ? 'HR Admin' : emp.role}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {emp.department || <span className="text-slate-300 italic">None</span>}
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {emp.joining_date ? format(new Date(emp.joining_date), 'MMM d, yyyy') : '—'}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center rounded-full text-[10px] font-bold px-2.5 py-0.5 border capitalize ${
                        emp.is_active 
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                          : 'text-slate-500 bg-slate-100 border-slate-200'
                      }`}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {emp.role !== 'hr_admin' ? (
                        <button
                          onClick={() => handleToggleStatusClick(emp)}
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 border rounded-lg transition cursor-pointer ${
                            emp.is_active 
                              ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 bg-white' 
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 bg-white'
                          }`}
                        >
                          {emp.is_active ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-red-500" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                              Activate
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">Root account</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add Employee Form */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowAddModal(false)}
          />

          {/* Modal box */}
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Add New Employee
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 transition ${
                      formErrors.name ? 'border-red-300 focus:ring-red-500/10' : 'border-slate-300 focus:ring-indigo-500/10 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {formErrors.name && <p className="mt-1 text-[10px] font-medium text-red-600">{formErrors.name}</p>}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="john.doe@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 transition ${
                      formErrors.email ? 'border-red-300 focus:ring-red-500/10' : 'border-slate-300 focus:ring-indigo-500/10 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {formErrors.email && <p className="mt-1 text-[10px] font-medium text-red-600">{formErrors.email}</p>}
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Username</label>
                <input
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 transition ${
                    formErrors.username ? 'border-red-300 focus:ring-red-500/10' : 'border-slate-300 focus:ring-indigo-500/10 focus:border-indigo-500'
                  }`}
                />
                {formErrors.username && <p className="mt-1 text-[10px] font-medium text-red-600">{formErrors.username}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Login Password</label>
                <div className="relative">
                  <Key className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 transition ${
                      formErrors.password ? 'border-red-300 focus:ring-red-500/10' : 'border-slate-300 focus:ring-indigo-500/10 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {formErrors.password && <p className="mt-1 text-[10px] font-medium text-red-600">{formErrors.password}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors"
                  >
                    <option value="">No Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Joining Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Joining Date</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 transition ${
                      formErrors.joiningDate ? 'border-red-300 focus:ring-red-500/10' : 'border-slate-300 focus:ring-indigo-500/10 focus:border-indigo-500'
                    }`}
                  />
                </div>
                {formErrors.joiningDate && <p className="mt-1 text-[10px] font-medium text-red-600">{formErrors.joiningDate}</p>}
              </div>

              {/* Actions */}
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
                  {submitting ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deactivation / Reactivation */}
      <ConfirmDialog
        isOpen={actionConfirmOpen}
        title={actionUser?.is_active ? 'Deactivate Account' : 'Reactivate Account'}
        message={
          actionUser?.is_active
            ? `Are you sure you want to deactivate ${actionUser?.name}'s account? The employee will no longer be able to log in to the LeaveDesk platform.`
            : `Are you sure you want to reactivate ${actionUser?.name}'s account? This will restore their system login privileges.`
        }
        confirmLabel={actionUser?.is_active ? 'Yes, Deactivate' : 'Yes, Reactivate'}
        confirmColorClass={actionUser?.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
        onConfirm={handleToggleStatusConfirm}
        onCancel={() => {
          setActionUser(null);
          setActionConfirmOpen(false);
        }}
      />
    </div>
  );
};

export default Employees;
