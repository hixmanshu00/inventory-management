import { useMemo, useState } from 'react';

import Button from '../components/Button.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DataTable from '../components/DataTable.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import FormField from '../components/FormField.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import SearchInput from '../components/SearchInput.jsx';
import { productsApi } from '../api/products.js';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from '../context/toast.js';
import { formatMoney, formatNumber } from '../utils/format.js';
import { validateProduct } from '../utils/validation.js';

const EMPTY = { name: '', sku: '', price: '', quantity_in_stock: '' };
const LOW_STOCK = 5;

function StockCell({ qty }) {
  const level = qty === 0 ? 'out' : qty <= LOW_STOCK ? 'low' : 'ok';
  const pct = Math.max(6, Math.min(100, (qty / (LOW_STOCK * 2)) * 100));
  return (
    <span className={`stock stock--${level}`}>
      <span className="stock__bar">
        <span className="stock__fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="stock__num">{formatNumber(qty)}</span>
    </span>
  );
}

export default function Products() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => productsApi.list(), []);
  const products = useMemo(() => data ?? [], [data]);

  const [query, setQuery] = useState('');
  const [form, setForm] = useState(null); // { mode, id?, values }
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [products, query]);

  const openCreate = () => {
    setErrors({});
    setForm({ mode: 'create', values: { ...EMPTY } });
  };

  const openEdit = (product) => {
    setErrors({});
    setForm({
      mode: 'edit',
      id: product.id,
      values: {
        name: product.name,
        sku: product.sku,
        price: String(product.price),
        quantity_in_stock: String(product.quantity_in_stock),
      },
    });
  };

  const setField = (name, value) =>
    setForm((f) => ({ ...f, values: { ...f.values, [name]: value } }));

  // Inline validation on blur: only surface/clear the touched field.
  const validateOnBlur = (name) => {
    const all = validateProduct(form.values);
    setErrors((prev) => ({ ...prev, [name]: all[name] }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const validationErrors = validateProduct(form.values);
    setErrors(validationErrors);
    const firstError = Object.keys(validationErrors)[0];
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }

    const payload = {
      name: form.values.name.trim(),
      sku: form.values.sku.trim(),
      price: form.values.price,
      quantity_in_stock: Number(form.values.quantity_in_stock),
    };

    setSaving(true);
    try {
      if (form.mode === 'create') {
        await productsApi.create(payload);
        toast.success('Product created.');
      } else {
        await productsApi.update(form.id, payload);
        toast.success('Product updated.');
      }
      setForm(null);
      reload();
    } catch (err) {
      if (err.status === 409) {
        setErrors({ sku: err.message });
        document.getElementById('sku')?.focus();
      } else {
        toast.error(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await productsApi.remove(deleteTarget.id);
      toast.success('Product deleted.');
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
    { key: 'name', header: 'Name', sortable: true, render: (p) => <span className="cell-strong">{p.name}</span> },
    { key: 'sku', header: 'SKU', sortable: true, render: (p) => <span className="cell-muted">{p.sku}</span> },
    {
      key: 'price',
      header: 'Price',
      className: 'num',
      sortable: true,
      sortAccessor: (p) => Number(p.price),
      render: (p) => formatMoney(p.price),
    },
    {
      key: 'quantity_in_stock',
      header: 'In stock',
      className: 'num',
      sortable: true,
      sortAccessor: (p) => p.quantity_in_stock,
      render: (p) => <StockCell qty={p.quantity_in_stock} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'actions',
      render: (p) => (
        <div className="row-actions">
          <Button variant="ghost" size="sm" icon="edit" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
            Edit
          </Button>
          <Button
            variant="danger-ghost"
            size="sm"
            icon="trash"
            onClick={() => setDeleteTarget(p)}
            aria-label={`Delete ${p.name}`}
          />
        </div>
      ),
    },
  ];

  return (
    <section>
      <PageHeader
        title="Products"
        subtitle="Manage your catalog and stock levels"
        actions={
          <Button variant="primary" icon="plus" onClick={openCreate}>
            Add product
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : (
        <>
          {(products.length > 0 || query) && (
            <div className="toolbar">
              <SearchInput value={query} onChange={setQuery} placeholder="Search by name or SKU…" />
              <span className="toolbar__spacer" />
              <span className="count-pill">
                {formatNumber(filtered.length)} {filtered.length === 1 ? 'product' : 'products'}
              </span>
            </div>
          )}

          <DataTable
            columns={columns}
            rows={filtered}
            loading={loading}
            empty={
              query ? (
                <EmptyState
                  icon="search"
                  title="No matches"
                  message={`No products match “${query}”.`}
                  action={<Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>}
                />
              ) : (
                <EmptyState
                  icon="package"
                  title="No products yet"
                  message="Add your first product to start tracking inventory."
                  action={<Button variant="primary" icon="plus" onClick={openCreate}>Add product</Button>}
                />
              )
            }
          />
        </>
      )}

      {form && (
        <Modal
          title={form.mode === 'create' ? 'Add product' : 'Edit product'}
          onClose={() => !saving && setForm(null)}
        >
          <form onSubmit={submit} className="form" noValidate>
            <FormField
              label="Name"
              name="name"
              required
              value={form.values.name}
              onChange={setField}
              onBlur={validateOnBlur}
              error={errors.name}
              autoFocus
            />
            <FormField
              label="SKU"
              name="sku"
              required
              value={form.values.sku}
              onChange={setField}
              onBlur={validateOnBlur}
              error={errors.sku}
              hint="A unique code, e.g. WIDGET-001."
            />
            <div className="form-grid">
              <FormField
                label="Price"
                name="price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={form.values.price}
                onChange={setField}
                onBlur={validateOnBlur}
                error={errors.price}
              />
              <FormField
                label="Quantity in stock"
                name="quantity_in_stock"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                required
                value={form.values.quantity_in_stock}
                onChange={setField}
                onBlur={validateOnBlur}
                error={errors.quantity_in_stock}
              />
            </div>
            <div className="form__actions">
              <Button variant="ghost" onClick={() => setForm(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving} loadingLabel="Saving…" icon="check">
                {form.mode === 'create' ? 'Create product' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete product"
          message={`Delete “${deleteTarget.name}” (${deleteTarget.sku})? This cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}
    </section>
  );
}
