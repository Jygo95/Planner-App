import { useContext } from 'react';
import { ToastContext } from '../../context/ToastContext.jsx';
import Toast from './Toast.jsx';

export default function ToastContainer() {
  const ctx = useContext(ToastContext);
  const toasts = ctx?.toasts ?? [];
  const dismiss = ctx?.dismiss ?? (() => {});

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
