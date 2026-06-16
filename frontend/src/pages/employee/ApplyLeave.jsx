import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/UI/Toast';
import { getLeaveTypes, getHolidays, applyLeave } from '../../api/leave.api';
import { getPublicEmployees } from '../../api/auth.api';
import { Calendar, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

const ApplyLeave = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [holidays, setHolidays] = useState([]);

  const [formData, setFormData] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    is_half_day: false,
    proxy_employee: '',
    reason: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [workingDays, setWorkingDays] = useState(null);

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [typesData, empData, holidayData] = await Promise.all([
          getLeaveTypes(),
          getPublicEmployees(),
          getHolidays(),
        ]);
        setLeaveTypes(typesData.filter((t) => t.is_active));
        setEmployees(empData.filter((e) => e.email !== user?.email));
        setHolidays(holidayData);
      } catch (err) {
        toast.error('Failed to load form prerequisites');
      }
    };
    loadPrerequisites();
  }, [user?.email, toast]);

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      if (formData.is_half_day) {
        setWorkingDays(0.5);
        return;
      }
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end < start) {
        setWorkingDays(0);
        return;
      }

      let count = 0;
      const current = new Date(start);
      while (current <= end) {
        const day = current.getDay();
        const isWeekend = day === 0 || day === 6;
        const dateStr = current.toISOString().split('T')[0];
        const isHoliday = holidays.some((h) => h.date === dateStr);

        if (!isWeekend && !isHoliday) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
      setWorkingDays(count);
    } else {
      setWorkingDays(null);
    }
  }, [formData.start_date, formData.end_date, formData.is_half_day, holidays]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'is_half_day' && value) {
        updated.end_date = updated.start_date;
      }
      return updated;
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.leave_type) errs.leave_type = 'Leave type is required';
    if (!formData.start_date) errs.start_date = 'Start date is required';
    if (!formData.end_date) errs.end_date = 'End date is required';
    
    if (formData.reason.trim().length < 10) {
      errs.reason = 'Reason must be at least 10 characters long';
    }
    if (!formData.proxy_employee) {
      errs.proxy_employee = 'Work handover contact is required';
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (formData.start_date && formData.start_date < todayStr) {
      errs.start_date = 'Start date cannot be in the past';
    }
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      errs.end_date = 'End date cannot be before start date';
    }
    if (formData.is_half_day && formData.start_date !== formData.end_date) {
      errs.end_date = 'Half-day leave must be on a single day';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        leave_type: parseInt(formData.leave_type),
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_half_day: formData.is_half_day,
        reason: formData.reason,
        proxy_employee: parseInt(formData.proxy_employee),
      };
      await applyLeave(payload);
      toast.success('Leave applied successfully');
      navigate('/employee/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        if (typeof data === 'object' && !data.error) {
          const fieldErrors = {};
          Object.entries(data).forEach(([key, val]) => {
            fieldErrors[key] = Array.isArray(val) ? val[0] : val;
          });
          setErrors(fieldErrors);
        } else {
          toast.error(data.error || 'Failed to submit leave request');
        }
      } else {
        toast.error('An error occurred during submission');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Card Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Apply for Leave</h1>
            <p className="text-xs text-slate-500">Submit details for time-off requests</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Leave Type</label>
            <select
              value={formData.leave_type}
              onChange={(e) => handleChange('leave_type', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition bg-white ${
                errors.leave_type ? 'border-red-300 focus:ring-red-500/20' : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>{lt.name} (Quota: {lt.annual_quota} days)</option>
              ))}
            </select>
            {errors.leave_type && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors.leave_type}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                min={todayStr}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition bg-white ${
                  errors.start_date ? 'border-red-300 focus:ring-red-500/20' : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
              {errors.start_date && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors.start_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                min={formData.start_date || todayStr}
                disabled={formData.is_half_day}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition bg-white disabled:bg-slate-50 disabled:text-slate-400 ${
                  errors.end_date ? 'border-red-300 focus:ring-red-500/20' : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
              {errors.end_date && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors.end_date}</p>}
            </div>
          </div>

          {/* Working days indicator */}
          {workingDays !== null && workingDays > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
              <span className="text-slate-800 font-semibold">Working days: {workingDays}</span>
              <span className="text-slate-500"> (excluding weekends and public holidays)</span>
            </div>
          )}

          {/* Half day */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_half_day"
              checked={formData.is_half_day}
              onChange={(e) => handleChange('is_half_day', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_half_day" className="ml-2 block text-sm text-slate-700 cursor-pointer">
              Half day leave
            </label>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              rows={3}
              placeholder="Provide a detailed reason for leave (minimum 10 characters)..."
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition bg-white resize-none ${
                errors.reason ? 'border-red-300 focus:ring-red-500/20' : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            />
            {errors.reason && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors.reason}</p>}
          </div>

          {/* Proxy Employee */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Work Handover / Proxy Colleague</label>
            <select
              value={formData.proxy_employee}
              onChange={(e) => handleChange('proxy_employee', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition bg-white ${
                errors.proxy_employee ? 'border-red-300 focus:ring-red-500/20' : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            >
              <option value="">Select a colleague</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
              ))}
            </select>
            {errors.proxy_employee && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{errors.proxy_employee}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Applying...
                </>
              ) : (
                'Submit Application'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyLeave;
