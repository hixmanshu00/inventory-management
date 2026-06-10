import Button from './Button.jsx';
import Icon from './Icon.jsx';

// Inline error panel with a clear recovery path (retry). Used by pages when a
// fetch fails, instead of silently rendering nothing.
export default function ErrorState({
  title = 'Something went wrong',
  message = 'We couldn’t load this data. Please try again.',
  onRetry,
}) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__icon">
        <Icon name="alertCircle" size={26} />
      </span>
      <p className="state__title">{title}</p>
      <p className="state__msg">{message}</p>
      {onRetry && (
        <div className="state__action">
          <Button variant="ghost" icon="refresh" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
