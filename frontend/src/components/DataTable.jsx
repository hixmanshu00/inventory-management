import { useMemo, useState } from 'react';

import EmptyState from './EmptyState.jsx';
import Icon from './Icon.jsx';
import { TableSkeleton } from './Skeleton.jsx';

// Reusable table driven by a column config:
//   columns: [{ key, header, render?(row), className?, sortable?, sortAccessor?(row) }]
// Handles loading (skeleton), empty, hover and client-side sorting (with
// aria-sort) so pages stay declarative.
export default function DataTable({
  columns,
  rows,
  loading,
  empty,
  emptyMessage = 'Nothing here yet.',
}) {
  const [sort, setSort] = useState(null); // { key, dir: 'asc' | 'desc' }

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const accessor = col.sortAccessor || ((row) => row[col.key]);
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key) =>
    setSort((cur) => {
      if (!cur || cur.key !== key) return { key, dir: 'asc' };
      if (cur.dir === 'asc') return { key, dir: 'desc' };
      return null; // third click clears sort
    });

  if (loading) return <TableSkeleton columns={columns} />;
  if (!rows.length) return empty || <EmptyState message={emptyMessage} />;

  const ariaSort = (key) => {
    if (!sort || sort.key !== key) return 'none';
    return sort.dir === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) =>
                col.sortable ? (
                  <th
                    key={col.key}
                    className={`${col.className || ''} is-sortable`.trim()}
                    aria-sort={ariaSort(col.key)}
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="th-sort">
                      {col.header}
                      <Icon
                        name={sort?.key === col.key ? (sort.dir === 'asc' ? 'chevronDown' : 'chevronDown') : 'sort'}
                        size={13}
                        className="th-sort__icon"
                        style={
                          sort?.key === col.key && sort.dir === 'desc'
                            ? { transform: 'rotate(180deg)' }
                            : undefined
                        }
                      />
                    </span>
                  </th>
                ) : (
                  <th key={col.key} className={col.className}>
                    {col.header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className} data-label={col.header}>
                    {col.render ? col.render(row) : row[col.key]}
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
