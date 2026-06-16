import React, { useState } from 'react';
import Modal from '../UI/Modal';
import { AlertCircle } from 'lucide-react';

const RejectReasonModal = ({ isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setError('Please provide a reason of at least 10 characters.');
      return;
    }
    setError('');
    onConfirm(reason);
  };

  const modalFooter = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
      >
        Reject Request
      </button>
    </>
  );

  return (
    <Modal title="Reject Leave Request" onClose={onClose} size="sm" footer={modalFooter}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reject_reason" className="block text-sm font-medium text-slate-700 mb-1.5">
            Reason for Rejection
          </label>
          <textarea
            id="reject_reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (e.target.value.trim().length >= 10) setError('');
            }}
            rows={3}
            placeholder="Provide a mandatory reason (min 10 chars)..."
            className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 transition resize-none ${
              error ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'
            }`}
            autoFocus
          />
          {error && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default RejectReasonModal;
