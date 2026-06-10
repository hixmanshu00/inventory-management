// Order status pill. Uses a coloured dot + text label so status is never
// conveyed by colour alone (accessibility: color-not-only).
export default function StatusBadge({ status }) {
  const known = ['confirmed', 'pending', 'cancelled'].includes(status);
  return (
    <span className={`badge badge--${known ? status : 'neutral'}`}>
      <span className="badge__dot" aria-hidden="true" />
      {status}
    </span>
  );
}
