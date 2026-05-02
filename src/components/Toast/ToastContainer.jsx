/**
 * ToastContainer — manages toast queue and renders Toast items.
 *
 * It registers its showToast function into the module-level _toastRegistry
 * so that siblings (not just descendants) can call showToast via ToastContext.
 */
import { useState, useCallback, useEffect } from 'react';
import Toast from './Toast.jsx';
import { _toastRegistry } from '../../context/ToastContext.jsx';

let nextId = 0;

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register showToast so siblings using the default context value can call it.
  useEffect(() => {
    _toastRegistry.showToast = showToast;
    return () => {
      _toastRegistry.showToast = () => {};
    };
  }, [showToast]);

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => dismiss(toast.id)}
        />
      ))}
    </div>
  );
}
