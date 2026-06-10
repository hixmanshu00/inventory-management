import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../components/Button.jsx';
import ErrorState from '../components/ErrorState.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Spinner from '../components/Spinner.jsx';
import { customersApi } from '../api/customers.js';
import { ordersApi } from '../api/orders.js';
import { productsApi } from '../api/products.js';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from '../context/toast.js';
import { formatMoney } from '../utils/format.js';
import { validateOrder } from '../utils/validation.js';

let lineKey = 0;
const newLine = () => ({ key: lineKey++, product_id: '', quantity: 1 });

export default function OrderCreate() {
  const toast = useToast();
  const navigate = useNavigate();

  const { data, loading, error, reload } = useFetch(
    () => Promise.all([customersApi.list(), productsApi.list()]),
    [],
  );
  const [customers, products] = data ?? [[], []];

  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState([newLine()]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const productsById = useMemo(
    () => Object.fromEntries(products.map((p) => [String(p.id), p])),
    [products],
  );

  const subtotal = (line) => {
    const product = productsById[line.product_id];
    if (!product) return 0;
    return Number(product.price) * Number(line.quantity || 0);
  };
  const total = lines.reduce((sum, line) => sum + subtotal(line), 0);
  const itemCount = lines.filter((l) => l.product_id && Number(l.quantity) > 0).length;

  const updateLine = (key, field, value) =>
    setLines((current) => current.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  const removeLine = (key) => setLines((current) => current.filter((l) => l.key !== key));

  const submit = async (e) => {
    e.preventDefault();
    const filledLines = lines.filter((l) => l.product_id && Number(l.quantity) > 0);
    const validationErrors = validateOrder({ customer_id: customerId, items: filledLines });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSaving(true);
    try {
      const order = await ordersApi.create({
        customer_id: Number(customerId),
        items: filledLines.map((l) => ({
          product_id: Number(l.product_id),
          quantity: Number(l.quantity),
        })),
      });
      toast.success(`Order #${order.id} placed.`);
      navigate(`/orders/${order.id}`);
    } catch (err) {
      // Backend rejects the whole order on any stock shortage; show exactly why.
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const back = (
    <Link to="/orders" className="btn btn--ghost">
      <Icon name="arrowLeft" size={17} />
      Back
    </Link>
  );

  if (loading) {
    return (
      <section>
        <PageHeader title="New order" actions={back} />
        <Spinner label="Loading products and customers…" />
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <PageHeader title="New order" actions={back} />
        <ErrorState message={error.message} onRetry={reload} />
      </section>
    );
  }

  const noCustomers = customers.length === 0;
  const noProducts = products.length === 0;
  const blocked = noCustomers || noProducts;

  return (
    <section>
      <PageHeader title="New order" subtitle="Add a customer and line items" actions={back} />

      {blocked && (
        <div className="notice" role="alert">
          <Icon name="alertTriangle" size={18} />
          <div>
            <strong>Almost there.</strong> You need at least one{' '}
            {noCustomers && <Link to="/customers">customer</Link>}
            {noCustomers && noProducts && ' and one '}
            {noProducts && <Link to="/products">product</Link>} before you can create an order.
          </div>
        </div>
      )}

      <form onSubmit={submit} className="form" noValidate>
        <div className="panel">
          <div className="panel__head">
            <h2>Customer</h2>
          </div>
          <div className="panel__body">
            <div className="field">
              <label className="field__label" htmlFor="customer_id">
                Customer<span className="field__req" aria-hidden="true">*</span>
              </label>
              <div className="select-wrap">
                <select
                  id="customer_id"
                  className={`field__select${errors.customer_id ? ' field__input--error' : ''}`}
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={noCustomers}
                  aria-invalid={errors.customer_id ? 'true' : undefined}
                  aria-describedby={errors.customer_id ? 'customer_id-error' : undefined}
                >
                  <option value="">Select a customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} · {c.email}
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" size={18} />
              </div>
              {errors.customer_id && (
                <span className="field__error" id="customer_id-error" role="alert">
                  <Icon name="alertCircle" size={14} />
                  {errors.customer_id}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <h2>Line items</h2>
            <Button
              variant="subtle"
              size="sm"
              icon="plus"
              onClick={() => setLines((c) => [...c, newLine()])}
              disabled={noProducts}
            >
              Add line
            </Button>
          </div>
          <div className="panel__body">
            {errors.items && (
              <span className="field__error" role="alert" style={{ marginBottom: '0.75rem' }}>
                <Icon name="alertCircle" size={14} />
                {errors.items}
              </span>
            )}

            <div className="line-list">
              {lines.map((line, idx) => {
                const product = productsById[line.product_id];
                const over = product && Number(line.quantity) > product.quantity_in_stock;
                return (
                  <div key={line.key} className="line-card">
                    <div className="line-card__row">
                      <div className="select-wrap">
                        <select
                          className="field__select"
                          value={line.product_id}
                          onChange={(e) => updateLine(line.key, 'product_id', e.target.value)}
                          aria-label={`Product for line ${idx + 1}`}
                          disabled={noProducts}
                        >
                          <option value="">Select a product…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id} disabled={p.quantity_in_stock === 0}>
                              {p.name} — {formatMoney(p.price)}
                              {p.quantity_in_stock === 0 ? ' (out of stock)' : ` (${p.quantity_in_stock} in stock)`}
                            </option>
                          ))}
                        </select>
                        <Icon name="chevronDown" size={18} />
                      </div>
                      <input
                        className={`field__input line-card__qty${over ? ' field__input--error' : ''}`}
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, 'quantity', e.target.value)}
                        aria-label={`Quantity for line ${idx + 1}`}
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length === 1}
                        aria-label={`Remove line ${idx + 1}`}
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    </div>
                    {product && (
                      <div className="line-card__meta">
                        {over ? (
                          <span className="line-warn">
                            <Icon name="alertTriangle" size={14} />
                            Only {product.quantity_in_stock} in stock
                          </span>
                        ) : (
                          <span className="cell-muted">
                            {formatMoney(product.price)} × {line.quantity || 0}
                          </span>
                        )}
                        <span className="line-card__subtotal">{formatMoney(subtotal(line))}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="order-summary">
          <div style={{ textAlign: 'left' }}>
            <div className="order-summary__label">Order total · {itemCount} {itemCount === 1 ? 'item' : 'items'}</div>
            <div className="order-summary__total">{formatMoney(total)}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <Button variant="ghost" onClick={() => navigate('/orders')} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon="cart"
              loading={saving}
              loadingLabel="Placing…"
              disabled={blocked}
            >
              Place order
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
