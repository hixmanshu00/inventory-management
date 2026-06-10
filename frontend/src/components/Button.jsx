import Icon from './Icon.jsx';

// Single button primitive enforcing consistent variants, sizes, focus, press
// feedback and an inline loading state (disables + swaps in a spinner so async
// actions can't be double-submitted).
export default function Button({
  variant = 'ghost',
  size = 'md',
  loading = false,
  loadingLabel,
  icon,
  iconRight,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size === 'sm' && 'btn--sm',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <span className="btn__spinner" aria-hidden="true" />
          {loadingLabel || children}
        </>
      ) : (
        <>
          {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
          {children}
          {iconRight && <Icon name={iconRight} size={size === 'sm' ? 15 : 17} />}
        </>
      )}
    </button>
  );
}
