import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

const ICONS = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-500 shrink-0" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />,
  info: <Info className="w-5 h-5 text-indigo-500 shrink-0" />
};

const BORDERS = {
  success: 'border-l-4 border-l-emerald-500',
  error: 'border-l-4 border-l-red-500',
  warning: 'border-l-4 border-l-amber-500',
  info: 'border-l-4 border-l-indigo-500'
};

const DURATION = 4000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message) => addToast(message, 'error'), [addToast]);
  const warning = useCallback((message) => addToast(message, 'warning'), [addToast]);
  const info = useCallback((message) => addToast(message, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    let animationFrame;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    animationFrame = requestAnimationFrame(animate);

    const closeTimer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => onRemove(toast.id), 300); // Wait for exit animation
    }, DURATION);

    return () => {
      clearTimeout(closeTimer);
      cancelAnimationFrame(animationFrame);
    };
  }, [toast.id, onRemove]);

  return (
    <div
      className={`pointer-events-auto bg-white rounded-2xl shadow-xl border border-slate-200 px-5 py-4 flex items-start gap-3 min-w-80 max-w-md overflow-hidden relative ${BORDERS[toast.type]} ${isClosing ? 'toast-exit' : 'toast-enter'}`}
    >
      {ICONS[toast.type]}
      <div className="flex-1 mt-0.5">
        <p className="text-sm font-medium text-slate-800 leading-tight">{toast.message}</p>
      </div>
      <button
        onClick={() => {
          setIsClosing(true);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-slate-100 w-full">
        <div 
          className="h-full bg-slate-300 transition-all ease-linear" 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  );
};
