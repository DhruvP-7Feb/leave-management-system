import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmStyle = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isDanger = confirmStyle === 'danger';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 modal-content">
        <div className="flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-50' : 'bg-emerald-50'}`}>
            {isDanger ? (
              <AlertCircle className="w-7 h-7 text-red-600" />
            ) : (
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            )}
          </div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">{message}</p>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="flex-1 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-medium rounded-xl px-4 py-2.5 border border-slate-300 transition-all duration-150"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-all duration-150 shadow-sm ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
