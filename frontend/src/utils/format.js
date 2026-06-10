const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const number = new Intl.NumberFormat('en-US');
const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? currency.format(n) : '—';
}

export function formatNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? number.format(n) : '—';
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}
