import Icon from './Icon.jsx';

// Presentational toast stack. State is owned by ToastContext. Uses an aria-live
// region (polite) so notifications are announced without stealing focus.
const ICONS = { success: 'checkCircle', error: 'alertCircle', info: 'info' };

export default function Toaster({ toasts, onDismiss }) {
  return (
    <div className="toaster" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
          <span className="toast__icon" aria-hidden="true">
            <Icon name={ICONS[toast.type] || 'info'} size={19} />
          </span>
          <span className="toast__body">{toast.message}</span>
          <button
            type="button"
            className="toast__close"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
          >
            <Icon name="x" size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
