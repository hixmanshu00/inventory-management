import Button from './Button.jsx';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';

// Confirmation prompt for destructive actions. `busy` disables the buttons while
// the request is in flight (and the modal can't be dismissed) to prevent
// double-submits and accidental data loss.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  busy,
}) {
  return (
    <Modal
      title={title}
      icon={
        <span className="modal__icon modal__icon--danger" aria-hidden="true">
          <Icon name="alertTriangle" size={20} />
        </span>
      }
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={busy} loadingLabel="Working…">
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
    </Modal>
  );
}
