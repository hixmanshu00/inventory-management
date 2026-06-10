import { Link, useParams } from 'react-router-dom';

import DataTable from '../components/DataTable.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { Skeleton } from '../components/Skeleton.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { ordersApi } from '../api/orders.js';
import { useFetch } from '../hooks/useFetch.js';
import { formatDate, formatMoney, formatNumber } from '../utils/format.js';

const columns = [
  { key: 'product_name', header: 'Product', render: (i) => <span className="cell-strong">{i.product_name}</span> },
  { key: 'quantity', header: 'Qty', className: 'num', render: (i) => formatNumber(i.quantity) },
  { key: 'unit_price', header: 'Unit price', className: 'num', render: (i) => formatMoney(i.unit_price) },
  {
    key: 'line_total',
    header: 'Line total',
    className: 'num',
    render: (i) => <span className="cell-strong">{formatMoney(Number(i.unit_price) * i.quantity)}</span>,
  },
];

const back = (
  <Link to="/orders" className="btn btn--ghost">
    <Icon name="arrowLeft" size={17} />
    Back to orders
  </Link>
);

export default function OrderDetail() {
  const { id } = useParams();
  const { data: order, loading, error, reload } = useFetch(() => ordersApi.get(id), [id]);

  if (loading) {
    return (
      <section>
        <PageHeader title={`Order #${id}`} actions={back} />
        <div className="detail-grid">
          {['Customer', 'Status', 'Created', 'Total'].map((label) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd><Skeleton width="70%" height="1.1rem" /></dd>
            </div>
          ))}
        </div>
        <DataTable columns={columns} rows={[]} loading />
      </section>
    );
  }

  if (error) {
    const notFound = error.status === 404;
    return (
      <section>
        <PageHeader title="Order" actions={back} />
        {notFound ? (
          <EmptyState
            icon="receipt"
            title="Order not found"
            message={`We couldn’t find order #${id}. It may have been deleted.`}
            action={
              <Link to="/orders" className="btn btn--primary">
                <Icon name="arrowLeft" size={17} />
                Back to orders
              </Link>
            }
          />
        ) : (
          <ErrorState message={error.message} onRetry={reload} />
        )}
      </section>
    );
  }

  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <section>
      <PageHeader
        title={`Order #${order.id}`}
        subtitle={`Placed ${formatDate(order.created_at)}`}
        actions={back}
      />

      <dl className="detail-grid">
        <div>
          <dt>Customer</dt>
          <dd>{order.customer_name || `#${order.customer_id}`}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd><StatusBadge status={order.status} /></dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd className="num">{formatNumber(itemCount)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd className="num">{formatMoney(order.total_amount)}</dd>
        </div>
      </dl>

      <div className="section-header">
        <h2>Items</h2>
      </div>
      <DataTable columns={columns} rows={order.items} loading={false} />
    </section>
  );
}
