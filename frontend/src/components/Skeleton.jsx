// Shimmer skeletons used while data loads (>300ms perceived). Reserving the same
// shape as the real content prevents layout shift when data arrives.

export function Skeleton({ width, height = '0.7rem', radius, style }) {
  return (
    <span
      className="skeleton skeleton--text"
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

// A table-shaped skeleton matching DataTable's column layout.
export function TableSkeleton({ columns, rows = 6 }) {
  return (
    <div className="table-wrap" role="status" aria-label="Loading data">
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className} data-label={col.header}>
                    <Skeleton width={col.className?.includes('num') ? '48px' : `${50 + ((r * 7 + col.key.length * 11) % 40)}%`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Stat-card skeletons for the dashboard.
export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="stat-grid" role="status" aria-label="Loading stats">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card">
          <div className="stat-card__top">
            <span className="skeleton" style={{ width: 42, height: 42, borderRadius: 12 }} aria-hidden="true" />
          </div>
          <Skeleton width="60%" height="1.6rem" />
          <Skeleton width="40%" />
        </div>
      ))}
    </div>
  );
}
