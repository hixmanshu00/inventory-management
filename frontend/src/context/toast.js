import { createContext, useContext } from 'react';

// Context + hook live here (no component export) so the provider file can be
// fast-refresh friendly.
export const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
