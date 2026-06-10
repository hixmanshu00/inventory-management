import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DataTable from '../components/DataTable.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SearchInput from '../components/SearchInput.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { ordersApi } from '../api/orders.js';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from '../context/toast.js';
import { formatDate, formatMoney, formatNumber } from '../utils/format.js';

const STATUSES = ['all', 'confirmed', 'pending', 'cancelled'];

export default function Orders() {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch(() => ordersApi.list(), []);
  const orders = useMemo(() => data ?? [], [data]);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== 'all' && o.status !== status) return false;
      if (!q) return true;
      return (
        String(o.id).includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q)
      );
    });
  }, [orders, query, status]);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await ordersApi.remove(deleteTarget.id);
      toast.success('Order deleted and stock restored.');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast.error(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'id', header: 'Order', sortable: true, sortAccessor: (o) => o.id, render: (o) => <span className="cell-strong">#{o.id}</span> },
    {
      key: 'customer_name',
      header: 'Customer',
      sortable: true,
      sortAccessor: (o) => o.customer_name || '',
      render: (o) => o.customer_name || <span className="cell-muted">#{o.customer_id}</span>,
    },
    { key: 'items', header: 'Items', className: 'num', sortable: true, sortAccessor: (o) => o.items.length, render: (o) => o.items.length },
    {
      key: 'total_amount',
      header: 'Total',
      className: 'num',
      sortable: true,
      sortAccessor: (o) => Number(o.total_amount),
      render: (o) => <span className="cell-strong">{formatMoney(o.total_amount)}</span>,
    },
    { key: 'status', header: 'Status', sortable: true, sortAccessor: (o) => o.status, render: (o) => <StatusBadge status={o.status} /> },
    { key: 'created_at', header: 'Created', sortable: true, sortAccessor: (o) => new Date(o.created_at).getTime(), render: (o) => <span className="cell-muted">{formatDate(o.created_at)}</span> },
    {
      key: 'actions',
      header: '',
      className: 'actions',
      render: (o) => (
        <div className="row-actions">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/${o.id}`)}>
            View
          </Button>
          <Button
            variant="danger-ghost"
            size="sm"
            icon="trash"
            onClick={() => setDeleteTarget(o)}
            aria-label={`Delete order #${o.id}`}
          />
        </div>
      ),
    },
  ];

  return (
    <section>
      <PageHeader
        title="Orders"
        subtitle="Track and manage customer orders"
        actions={
          <Button variant="primary" icon="plus" onClick={() => navigate('/orders/new')}>
            New order
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : (
        <>
          {(orders.length > 0 || query || status !== 'all') && (
            <div className="toolbar">
              <SearchInput value={query} onChange={setQuery} placeholder="Search by order # or customer…" />
              <div className="segmented" role="group" aria-label="Filter by status">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`segmented__btn${status === s ? ' is-active' : ''}`}
                    onClick={() => setStatus(s)}
                    aria-pressed={status === s}
                  >
                    {s === 'all' ? 'All' : s}
                  </button>
                ))}
              </div>
              <span className="toolbar__spacer" />
              <span className="count-pill">
                {formatNumber(filtered.length)} {filtered.length === 1 ? 'order' : 'orders'}
              </span>
            </div>
          )}

          <DataTable
            columns={columns}
            rows={filtered}
            loading={loading}
            empty={
              query || status !== 'all' ? (
                <EmptyState
                  icon="search"
                  title="No matching orders"
                  message="Try a different search or status filter."
                  action={
                    <Button variant="ghost" onClick={() => { setQuery(''); setStatus('all'); }}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon="receipt"
                  title="No orders yet"
                  message="Create your first order to get started."
                  action={
                    <Button variant="primary" icon="plus" onClick={() => navigate('/orders/new')}>
                      New order
                    </Button>
                  }
                />
              )
            }
          />
        </>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete order"
          message={`Delete order #${deleteTarget.id}? Its items will be returned to stock.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}
    </section>
  );
}
