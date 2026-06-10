import Icon from './Icon.jsx';

// Friendly empty state: icon + title + message + optional call-to-action.
export default function EmptyState({ icon = 'inbox', title, message, action }) {
  return (
    <div className="state">
      <span className="state__icon">
        <Icon name={icon} size={26} />
      </span>
      {title && <p className="state__title">{title}</p>}
      {message && <p className="state__msg">{message}</p>}
      {action && <div className="state__action">{action}</div>}
    </div>
  );
}
