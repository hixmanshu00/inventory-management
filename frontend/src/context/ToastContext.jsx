import { useCallback, useMemo, useState } from 'react';

import Toaster from '../components/Toaster.jsx';
import { ToastContext } from './toast.js';

// Single source of truth for transient notifications. Any component calls
// useToast() (from ./toast.js) to push success/error messages; rendering lives
// in <Toaster/>.
let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info') => {
      const id = nextId++;
      setToasts((current) => [...current, { id, message, type }]);
      // Auto-dismiss; errors linger longer so they're not missed.
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (msg) => push(msg, 'success'),
      error: (msg) => push(msg, 'error'),
      info: (msg) => push(msg, 'info'),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
