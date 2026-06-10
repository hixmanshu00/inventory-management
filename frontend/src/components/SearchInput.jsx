import Icon from './Icon.jsx';

// Search box with a leading icon and a clear button that appears once there's a
// query. Type="search" gets the right mobile keyboard and native clear affordance.
export default function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search' }) {
  return (
    <div className="search">
      <Icon name="search" size={17} className="search__icon" />
      <input
        type="search"
        className="field__input search__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          className="search__clear"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <Icon name="x" size={15} />
        </button>
      )}
    </div>
  );
}
