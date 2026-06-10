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
import { customersApi } from '../api/customers.js';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from '../context/toast.js';
import { formatNumber } from '../utils/format.js';
import { validateCustomer } from '../utils/validation.js';

const EMPTY = { full_name: '', email: '', phone: '' };

export default function Customers() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => customersApi.list(), []);
  const customers = useMemo(() => data ?? [], [data]);

  const [query, setQuery] = useState('');
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q),
    );
  }, [customers, query]);

  const setField = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const validateOnBlur = (name) => {
    const all = validateCustomer(values);
    setErrors((prev) => ({ ...prev, [name]: all[name] }));
  };

  const openCreate = () => {
    setErrors({});
    setValues({ ...EMPTY });
  };

  const submit = async (e) => {
    e.preventDefault();
    const validationErrors = validateCustomer(values);
    setErrors(validationErrors);
    const firstError = Object.keys(validationErrors)[0];
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }

    setSaving(true);
    try {
      await customersApi.create({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || null,
      });
      toast.success('Customer added.');
      setValues(null);
      reload();
    } catch (err) {
      if (err.status === 409) {
        setErrors({ email: err.message });
        document.getElementById('email')?.focus();
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
      await customersApi.remove(deleteTarget.id);
      toast.success('Customer deleted.');
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
    { key: 'full_name', header: 'Name', sortable: true, render: (c) => <span className="cell-strong">{c.full_name}</span> },
    { key: 'email', header: 'Email', sortable: true, render: (c) => <span className="cell-muted">{c.email}</span> },
    { key: 'phone', header: 'Phone', render: (c) => c.phone || <span className="cell-muted">—</span> },
    {
      key: 'actions',
      header: '',
      className: 'actions',
      render: (c) => (
        <Button
          variant="danger-ghost"
          size="sm"
          icon="trash"
          onClick={() => setDeleteTarget(c)}
          aria-label={`Delete ${c.full_name}`}
        />
      ),
    },
  ];

  return (
    <section>
      <PageHeader
        title="Customers"
        subtitle="People who place orders with you"
        actions={
          <Button variant="primary" icon="plus" onClick={openCreate}>
            Add customer
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : (
        <>
          {(customers.length > 0 || query) && (
            <div className="toolbar">
              <SearchInput value={query} onChange={setQuery} placeholder="Search name, email or phone…" />
              <span className="toolbar__spacer" />
              <span className="count-pill">
                {formatNumber(filtered.length)} {filtered.length === 1 ? 'customer' : 'customers'}
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
                  message={`No customers match “${query}”.`}
                  action={<Button variant="ghost" onClick={() => setQuery('')}>Clear search</Button>}
                />
              ) : (
                <EmptyState
                  icon="users"
                  title="No customers yet"
                  message="Add your first customer so you can start taking orders."
                  action={<Button variant="primary" icon="plus" onClick={openCreate}>Add customer</Button>}
                />
              )
            }
          />
        </>
      )}

      {values && (
        <Modal title="Add customer" onClose={() => !saving && setValues(null)}>
          <form onSubmit={submit} className="form" noValidate>
            <FormField
              label="Full name"
              name="full_name"
              required
              value={values.full_name}
              onChange={setField}
              onBlur={validateOnBlur}
              error={errors.full_name}
              autoComplete="name"
              autoFocus
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              required
              value={values.email}
              onChange={setField}
              onBlur={validateOnBlur}
              error={errors.email}
              autoComplete="email"
            />
            <FormField
              label="Phone"
              name="phone"
              type="tel"
              inputMode="tel"
              value={values.phone}
              onChange={setField}
              error={errors.phone}
              hint="Optional."
              autoComplete="tel"
            />
            <div className="form__actions">
              <Button variant="ghost" onClick={() => setValues(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving} loadingLabel="Saving…" icon="check">
                Add customer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete customer"
          message={`Delete ${deleteTarget.full_name}? This cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}
    </section>
  );
}
