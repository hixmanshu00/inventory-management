import { forwardRef } from 'react';

import Icon from './Icon.jsx';

// Labelled input with required indicator, helper text and inline error (with
// icon + aria). Forwards a ref so forms can focus the first invalid field on
// submit. Error is wired up via aria-describedby + role="alert".
const FormField = forwardRef(function FormField(
  { label, name, value, onChange, onBlur, error, hint, type = 'text', required, ...rest },
  ref,
) {
  const errorId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;

  return (
    <div className="field">
      <label className="field__label" htmlFor={name}>
        {label}
        {required && (
          <span className="field__req" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        ref={ref}
        id={name}
        className={`field__input${error ? ' field__input--error' : ''}`}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={onBlur ? () => onBlur(name) : undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        aria-required={required || undefined}
        {...rest}
      />
      {hint && !error && (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={errorId} role="alert">
          <Icon name="alertCircle" size={14} />
          {error}
        </span>
      )}
    </div>
  );
});

export default FormField;
