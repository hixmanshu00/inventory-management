// Client-side validation mirroring the backend's rules. This is for fast UX
// feedback only; the backend remains the source of truth and re-validates
// everything. Each validator returns an errors object keyed by field name.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateProduct(values) {
  const errors = {};
  if (!values.name?.trim()) errors.name = 'Name is required.';
  if (!values.sku?.trim()) errors.sku = 'SKU is required.';

  const price = Number(values.price);
  if (values.price === '' || Number.isNaN(price)) errors.price = 'Price is required.';
  else if (price <= 0) errors.price = 'Price must be greater than 0.';

  const qty = Number(values.quantity_in_stock);
  if (values.quantity_in_stock === '' || Number.isNaN(qty)) {
    errors.quantity_in_stock = 'Quantity is required.';
  } else if (!Number.isInteger(qty) || qty < 0) {
    errors.quantity_in_stock = 'Quantity must be a whole number ≥ 0.';
  }
  return errors;
}

export function validateCustomer(values) {
  const errors = {};
  if (!values.full_name?.trim()) errors.full_name = 'Full name is required.';
  if (!values.email?.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(values.email)) errors.email = 'Enter a valid email address.';
  return errors;
}

export function validateOrder(values) {
  const errors = {};
  if (!values.customer_id) errors.customer_id = 'Select a customer.';
  if (!values.items?.length) {
    errors.items = 'Add at least one line item.';
  } else if (values.items.some((i) => !i.product_id || Number(i.quantity) <= 0)) {
    errors.items = 'Every line needs a product and a quantity of at least 1.';
  }
  return errors;
}
