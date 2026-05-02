/**
 * ToastContext — provides showToast() to any component in the tree.
 *
 * Architecture note:
 *   ToastContainer is both the state owner and the context provider.
 *   ToastContext is created with a module-level default so that siblings
 *   of <ToastContainer /> (not children) can still access showToast().
 *   ToastContainer registers its showToast into the module-level ref on
 *   mount, and the default context value delegates to that ref.
 */
import { createContext, useContext } from 'react';

// Module-level holder — ToastContainer writes here when it mounts.
export const _toastRegistry = { showToast: () => {} };

const defaultValue = {
  showToast: (message, type) => _toastRegistry.showToast(message, type),
};

export const ToastContext = createContext(defaultValue);

export function useToast() {
  return useContext(ToastContext);
}
