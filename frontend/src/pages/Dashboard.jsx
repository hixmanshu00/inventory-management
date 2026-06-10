import { Link, useNavigate } from 'react-router-dom';

import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import Icon from '../components/Icon.jsx';
import { StatCardsSkeleton } from '../components/Skeleton.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { ordersApi } from '../api/orders.js';
import { statsApi } from '../api/stats.js';
import { useFetch } from '../hooks/useFetch.js';
import { formatDate, formatMoney, formatNumber } from '../utils/format.js';

const STATUS_META = {
  confirmed: { label: 'Confirmed', color: 'var(--success)' },
  pending: { label: 'Pending', color: 'var(--warning)' },
  cancelled: { label: 'Cancelled', color: 'var(--danger)' },
};

function StatCard({ to, icon, label, value, accent }) {
  return (
    <Link to={to} className="stat-card" style={{ '--accent': accent }}>
      <div className="stat-card__top">
        <span className="stat-card__icon">
          <Icon name={icon} size={22} />
        </span>
        <Icon name="chevronRight" size={18} className="stat-card__chevron" />
      </div>
      <span className="stat-card__value num">{value}</span>
      <span className="stat-card__label">{label}</span>
    </Link>
  );
}

function StockMeter({ qty, threshold }) {
  const level = qty === 0 ? 'out' : qty <= threshold ? 'low' : 'ok';
  const pct = Math.max(6, Math.min(100, (qty / Math.max(threshold * 2, 1)) * 100));
  return (
    <span className={`stock stock--${level}`}>
      <span className="stock__bar">
        <span className="stock__fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="stock__num">{qty}</span>
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch(
    () => Promise.all([statsApi.get(), ordersApi.list()]),
    [],
  );

  if (loading) {
    return (
      <section>
        <div className="page-head">
          <div className="page-head__titles">
            <h1>Dashboard</h1>
            <p className="page-head__subtitle">Overview of your store</p>
          </div>
        </div>
        <StatCardsSkeleton count={4} />
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <div className="page-head">
          <div className="page-head__titles">
            <h1>Dashboard</h1>
          </div>
        </div>
        <ErrorState message={error.message} onRetry={reload} />
      </section>
    );
  }

  const [stats, orders] = data;

  const cards = [
    { label: 'Products', value: formatNumber(stats.total_products), to: '/products', icon: 'package', accent: 'var(--brand)' },
    { label: 'Customers', value: formatNumber(stats.total_customers), to: '/customers', icon: 'users', accent: '#0ea5e9' },
    { label: 'Orders', value: formatNumber(stats.total_orders), to: '/orders', icon: 'receipt', accent: '#8b5cf6' },
    { label: 'Revenue', value: formatMoney(stats.total_revenue), to: '/orders', icon: 'dollar', accent: 'var(--success)' },
  ];

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const maxCount = Math.max(1, ...Object.values(counts));
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  return (
    <section>
      <div className="page-head">
        <div className="page-head__titles">
          <h1>Dashboard</h1>
          <p className="page-head__subtitle">Overview of your store</p>
        </div>
        <div className="page-head__actions">
          <Button variant="primary" icon="plus" onClick={() => navigate('/orders/new')}>
            New order
          </Button>
        </div>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="dash-grid">
        {/* Low stock */}
        <div className="panel">
          <div className="panel__head">
            <h2>Low stock</h2>
            <span className="badge badge--neutral">≤ {stats.low_stock_threshold} in stock</span>
          </div>
          {stats.low_stock_products.length === 0 ? (
            <EmptyState
              icon="checkCircle"
              title="All stocked up"
              message="No products are running low. Nice work keeping inventory healthy."
            />
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th className="num">In stock</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.low_stock_products.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Product" className="cell-strong">{p.name}</td>
                      <td data-label="SKU" className="cell-muted">{p.sku}</td>
                      <td data-label="In stock" className="num">
                        <StockMeter qty={p.quantity_in_stock} threshold={stats.low_stock_threshold} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order status breakdown */}
        <div className="panel">
          <div className="panel__head">
            <h2>Order status</h2>
            <span className="badge badge--neutral">{formatNumber(orders.length)} total</span>
          </div>
          <div className="panel__body">
            {orders.length === 0 ? (
              <EmptyState icon="receipt" title="No orders yet" message="Status breakdown appears once you place orders." />
            ) : (
              <div className="statbreak">
                {Object.keys(STATUS_META).map((key) => {
                  const meta = STATUS_META[key];
                  const n = counts[key] || 0;
                  return (
                    <div key={key} className="statbreak__row">
                      <span className="statbreak__label">
                        <span className="statbreak__swatch" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                      <span className="statbreak__track">
                        <span
                          className="statbreak__fill"
                          style={{ width: `${(n / maxCount) * 100}%`, background: meta.color }}
                        />
                      </span>
                      <span className="statbreak__val">{n}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="panel" style={{ marginTop: '1.5rem' }}>
          <div className="panel__head">
            <h2>Recent orders</h2>
            <Link to="/orders" className="btn btn--subtle btn--sm">
              View all
              <Icon name="chevronRight" size={15} />
            </Link>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} style={{ cursor: 'pointer' }}>
                    <td data-label="Order" className="cell-strong">#{o.id}</td>
                    <td data-label="Customer">{o.customer_name || `#${o.customer_id}`}</td>
                    <td data-label="Total" className="num">{formatMoney(o.total_amount)}</td>
                    <td data-label="Status"><StatusBadge status={o.status} /></td>
                    <td data-label="Created" className="cell-muted">{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
