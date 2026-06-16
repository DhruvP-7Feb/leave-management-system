import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/UI/Toast';
import { getHolidays, addHoliday, deleteHoliday } from '../../api/leave.api';
import LoadingSkeleton from '../../components/UI/LoadingSkeleton';
import EmptyState from '../../components/UI/EmptyState';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import { format } from 'date-fns';
import { Calendar, Trash2, Plus, X } from 'lucide-react';

const Holidays = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form & Modal states (HR Admin only)
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Delete state (HR Admin only)
  const [deleteId, setDeleteId] = useState(null);
  const [deletingName, setDeletingName] = useState('');

  const isHR = user?.role === 'hr_admin';

  const loadHolidays = async () => {
    try {
      const data = await getHolidays();
      setHolidays(data || []);
    } catch (err) {
      toast.error('Failed to load public holidays');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Holiday name is required';
    if (!date) errors.date = 'Date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await addHoliday({
        name: name.trim(),
        date: date,
      });
      toast.success(`Public holiday "${name}" added successfully`);
      setName('');
      setDate('');
      setFormErrors({});
      setShowAddModal(false); // Close Modal
      loadHolidays();
    } catch (err) {
      const serverErrors = err.response?.data || {};
      if (serverErrors.date) {
        setFormErrors((prev) => ({ ...prev, date: serverErrors.date[0] }));
      } else {
        toast.error(serverErrors.error || 'Failed to add public holiday');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id, label) => {
    setDeleteId(id);
    setDeletingName(label);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await deleteHoliday(deleteId);
      toast.success(`Public holiday "${deletingName}" deleted`);
      loadHolidays();
    } catch (err) {
      toast.error('Failed to delete public holiday');
    } finally {
      setDeleteId(null);
      setDeletingName('');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-slate-200 rounded w-48 animate-pulse" />
        </div>
        <LoadingSkeleton type="cards" />
      </div>
    );
  }

  // Group holidays by year and sort chronological
  const groupedHolidays = {};
  holidays.forEach((h) => {
    const year = h.year || new Date(h.date).getFullYear();
    if (!groupedHolidays[year]) {
      groupedHolidays[year] = [];
    }
    groupedHolidays[year].push(h);
  });

  // Sort years in descending order
  const years = Object.keys(groupedHolidays).sort((a, b) => b - a);

  // Chronologically sort holidays within each year
  years.forEach((yr) => {
    groupedHolidays[yr].sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  return (
    <div className="space-y-6">
      {/* Header with Modal Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Public Holidays
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Calendar overview of scheduled organization public holidays
          </p>
        </div>

        {isHR && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm hover:shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Holiday
          </button>
        )}
      </div>

      {/* Full-width Calendar Listings */}
      <div className="space-y-6">
        {years.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <EmptyState
              icon={Calendar}
              title="No holidays configured"
              description="There are no public holidays defined in the system calendar."
            />
          </div>
        ) : (
          years.map((year) => (
            <div key={year} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {/* Year Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  Year {year} Calendar
                </h3>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-0.5">
                  {groupedHolidays[year].length} Holidays
                </span>
              </div>

              {/* Holidays list */}
              <div className="divide-y divide-slate-100">
                {groupedHolidays[year].map((holiday) => {
                  const holidayDate = new Date(holiday.date);
                  
                  return (
                    <div key={holiday.id} className="px-6 py-4.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Mini calendar page graphic */}
                        <div className="w-12 h-12 border border-slate-200 bg-white rounded-xl flex flex-col overflow-hidden shrink-0 shadow-sm text-center">
                          <span className="bg-red-500 text-[9px] font-bold text-white uppercase py-0.5 tracking-wider">
                            {format(holidayDate, 'MMM')}
                          </span>
                          <span className="text-sm font-bold text-slate-800 flex-1 flex items-center justify-center">
                            {format(holidayDate, 'd')}
                          </span>
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-snug">{holiday.name}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            {format(holidayDate, 'EEEE')} • {format(holidayDate, 'MMMM d, yyyy')}
                          </p>
                        </div>
                      </div>

                      {/* Delete button (HR Admin only) */}
                      {isHR && (
                        <button
                          onClick={() => handleDeleteClick(holiday.id, holiday.name)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-100 cursor-pointer"
                          title="Delete public holiday"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Public Holiday Modal (HR Admin only) */}
      {isHR && showAddModal && (
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
                <Calendar className="w-5 h-5 text-indigo-600" />
                Add Public Holiday
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="space-y-4">
              {/* Holiday Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Holiday Name</label>
                <input
                  type="text"
                  placeholder="e.g. Independence Day"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setFormErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 transition ${
                    formErrors.name ? 'border-red-300 focus:ring-red-500/10' : 'border-slate-300 focus:ring-indigo-500/10 focus:border-indigo-500'
                  }`}
                  autoFocus
                />
                {formErrors.name && <p className="mt-1 text-[10px] font-medium text-red-600">{formErrors.name}</p>}
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Holiday Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (e.target.value) setFormErrors((prev) => ({ ...prev, date: '' }));
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 transition ${
                    formErrors.date ? 'border-red-300 focus:ring-red-500/10' : 'border-slate-300 focus:ring-indigo-500/10 focus:border-indigo-500'
                  }`}
                />
                {formErrors.date && <p className="mt-1 text-[10px] font-medium text-red-600">{formErrors.date}</p>}
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
                  {submitting ? 'Adding...' : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Public Holiday"
        message={`Are you sure you want to delete the holiday "${deletingName}"? This will automatically restore this date as a working day, which may affect leave duration calculations for applied requests.`}
        confirmLabel="Yes, Delete"
        confirmColorClass="bg-red-600 hover:bg-red-700"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteId(null);
          setDeletingName('');
        }}
      />
    </div>
  );
};

export default Holidays;
