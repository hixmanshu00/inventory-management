# Inventory & Order Management System

A small but production-shaped system for managing products, customers, orders, and
inventory. FastAPI + PostgreSQL backend, React (Vite) frontend, fully containerized.

---

## Contents

- [Architecture](#architecture)
- [Quick start with Docker](#quick-start-with-docker)
- [Local development without Docker](#local-development-without-docker)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Business rules & decisions](#business-rules--decisions)
- [Tests](#tests)
- [Deployment notes](#deployment-notes)

---

## Architecture

```
backend/
  app/
    routers/        HTTP layer — status codes, request/response wiring only
    services/       business logic, transactions, all the rules below
    repositories/   data access — queries only, no rules, no commits
    models/         SQLAlchemy 2.0 ORM (Mapped[...] style)
    schemas/        Pydantic v2 request/response models (separate from ORM)
    config.py       settings from environment variables
    database.py     engine + session dependency
    errors.py       domain exceptions, mapped to HTTP in main.py
  alembic/          migrations
  tests/            pytest suite (runs against real Postgres)
  scripts/seed.py   idempotent seed data

frontend/
  src/
    api/            one fetch client + per-entity modules (base URL from env)
    components/      design system: Button, Icon, DataTable, Modal, FormField,
                     Skeleton, ErrorState, EmptyState, Toaster, StatusBadge, ...
    pages/           Dashboard, Products, Customers, Orders, OrderCreate, OrderDetail
    context/         toast notifications + theme (light/dark) providers
    hooks/           useFetch — shared loading/error handling
    utils/           client-side validation (mirrors backend) + formatting
```

**Why this layering.** Each layer has one job and depends only downward:
routers translate HTTP, services own the rules and the transaction boundary,
repositories own SQL. Because the rules live in services (not in routers or
models), they're testable without HTTP and reusable across endpoints. Keeping
Pydantic schemas separate from ORM models means the API contract can evolve
independently of the database shape, and request schemas can reject untrusted
fields (see below) without polluting the persistence layer.

The frontend mirrors this: the `api/` layer is the only place that knows about
HTTP, so components stay declarative and the backend base URL is configured in
exactly one place.

### Frontend experience

The UI is a small, token-driven design system rather than ad-hoc styles:

- **Light & dark mode** — a single set of semantic CSS variables themes every
  surface. Dark is the default; the choice is remembered and applied before
  first paint (no flash).
- **Responsive shell** — a sidebar on desktop and a bottom tab bar on mobile,
  with safe-area handling. Tables collapse to readable cards on small screens.
- **Every state is designed** — loading shows shimmer skeletons (no layout
  shift), errors render an inline retry, empty views guide the next action, and
  mutations confirm with toasts. Buttons show an inline spinner and disable while
  a request is in flight.
- **Forms** — visible labels, required markers, inline validation on blur, and
  focus moves to the first invalid field on submit. Server conflicts (e.g.
  duplicate SKU) surface on the relevant field.
- **Accessibility** — keyboard-navigable, focus-trapped modals, `aria-sort` on
  sortable tables, `aria-live` toasts, status shown by icon + text (not colour
  alone), and `prefers-reduced-motion` respected.

Tables are searchable and sortable; the dashboard summarises stock, revenue, and
order status at a glance.

---

## Quick start with Docker

Requires Docker + Docker Compose. From a clean checkout:

```bash
cp .env.example .env        # adjust if you like; defaults work out of the box
docker compose up --build
```

This starts three services:

- **db** — Postgres 16 with a named volume (`pgdata`) and a healthcheck.
- **backend** — waits for the db to be healthy, runs `alembic upgrade head`,
  seeds sample data (when `SEED_ON_START=true`), then serves the API.
- **frontend** — built to static files and served by nginx.

Then open:

- Frontend: <http://localhost:5173>
- API docs (Swagger): <http://localhost:8000/docs>

> The frontend's API URL is baked in at build time (Vite inlines `VITE_*`).
> If you change `VITE_API_URL`, rebuild with `docker compose up --build`.

---

## Local development without Docker

You need Python 3.12+, Node 18+, and a running PostgreSQL.

### Database

```bash
createdb inventory                       # and a role matching your DATABASE_URL
# or point DATABASE_URL at any Postgres you have
```

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt      # prod deps + pytest/httpx

cp .env.example .env                      # set DATABASE_URL, CORS_ORIGINS
export $(grep -v '^#' .env | xargs)       # or use your preferred env loader

alembic upgrade head                      # apply migrations
python -m scripts.seed                    # optional: sample data
uvicorn app.main:app --reload            # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env                       # set VITE_API_URL=http://localhost:8000
npm run dev                                # http://localhost:5173
```

---

## Environment variables

### Backend (`backend/.env`)

| Variable              | Required | Default                                                            | Purpose                                                        |
| --------------------- | -------- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| `DATABASE_URL`        | yes      | `postgresql+psycopg://inventory:inventory@localhost:5432/inventory` | SQLAlchemy connection URL (psycopg v3 driver).                |
| `CORS_ORIGINS`        | yes      | `http://localhost:5173`                                             | Comma-separated allowed origins. Never `*`.                   |
| `LOW_STOCK_THRESHOLD` | no       | `10`                                                               | Stock level at/below which a product is "low stock".         |
| `SEED_ON_START`       | no       | `false`                                                            | When `true`, the container seeds sample data after migrating. |

### Frontend (`frontend/.env`)

| Variable       | Required | Default                 | Purpose                                              |
| -------------- | -------- | ----------------------- | --------------------------------------------------- |
| `VITE_API_URL` | yes      | `http://localhost:8000` | Base URL of the backend API. Inlined at build time. |

### Compose (root `.env`)

| Variable                                       | Purpose                                              |
| ---------------------------------------------- | --------------------------------------------------- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database credentials (also assemble `DATABASE_URL`). |
| `BACKEND_PORT` / `FRONTEND_PORT`               | Host ports to expose.                                |
| `CORS_ORIGINS`, `LOW_STOCK_THRESHOLD`, `SEED_ON_START`, `VITE_API_URL` | Passed through to the services.   |

---

## API reference

Base URL: `http://localhost:8000`

| Method | Path              | Description                       | Success | Notable errors                              |
| ------ | ----------------- | --------------------------------- | ------- | ------------------------------------------- |
| GET    | `/health`         | Liveness + DB connectivity        | 200     |                                             |
| GET    | `/stats`          | Dashboard counts + low-stock list | 200     |                                             |
| POST   | `/products`       | Create product                    | 201     | 409 duplicate SKU, 422 invalid body         |
| GET    | `/products`       | List products                     | 200     |                                             |
| GET    | `/products/{id}`  | Get product                       | 200     | 404 not found                               |
| PUT    | `/products/{id}`  | Update product                    | 200     | 404, 409 duplicate SKU, 422                 |
| DELETE | `/products/{id}`  | Delete product                    | 204     | 404, 409 if referenced by an order          |
| POST   | `/customers`      | Create customer                   | 201     | 409 duplicate email, 422                    |
| GET    | `/customers`      | List customers                    | 200     |                                             |
| GET    | `/customers/{id}` | Get customer                      | 200     | 404                                         |
| DELETE | `/customers/{id}` | Delete customer                   | 204     | 404, 409 if they have orders                |
| POST   | `/orders`         | Create order                      | 201     | 404 missing customer/product, 409 stock, 422 |
| GET    | `/orders`         | List orders (newest first)        | 200     |                                             |
| GET    | `/orders/{id}`    | Get order with line items         | 200     | 404                                         |
| DELETE | `/orders/{id}`    | Delete order (restores stock)     | 204     | 404                                         |

**Error bodies** are always structured, never stack traces:

```json
{ "detail": "A product with SKU 'WID-001' already exists.", "code": "conflict" }
```

Insufficient-stock errors additionally include `product_id`, `requested`, and
`available` so the client can point at the exact line that failed.

**Create-order request** (note: no `total_amount` — it's computed server-side):

```json
{
  "customer_id": 1,
  "items": [
    { "product_id": 2, "quantity": 3 },
    { "product_id": 5, "quantity": 1 }
  ]
}
```

---

## Business rules & decisions

These live in the **service layer** ([`backend/app/services`](backend/app/services)) and are covered by tests.

- **Uniqueness (409).** SKU and customer email are unique. We let the `INSERT`
  hit the database and catch the `IntegrityError` rather than pre-checking, which
  would leave a check-then-insert race between concurrent requests. The DB's
  unique constraint is the source of truth.

- **Stock is never negative.** Enforced in the service *and* by a `CHECK`
  constraint on the column, so it holds even against writes that bypass the app.

- **Order creation is atomic.** The whole operation is one transaction:
  1. Lock every ordered product row with `SELECT ... FOR UPDATE`.
  2. Validate stock for **all** line items first.
  3. If **any** item is short, reject the **entire** order with 409 (naming the
     failing product) — nothing is written.
  4. Otherwise decrement stock, compute `total_amount` from current product
     prices, snapshot each line's unit price/name, and commit.

  The client never sends the total; request schemas use `extra="forbid"`, so a
  client that tries to inject `total_amount` gets a 422.

- **Concurrency / no overselling.** The `FOR UPDATE` row locks serialize
  concurrent orders on the same products: a second transaction blocks until the
  first commits, then re-reads the now-decremented stock. Without this, two
  orders could both read "1 in stock" and each sell it. Rows are locked in `id`
  order to avoid deadlocks between orders touching overlapping product sets.
  This is verified by a real concurrent-request test
  ([`test_concurrent_orders_do_not_oversell`](backend/tests/test_orders.py)).

- **Deleting an order restores stock.** *Decision:* a deleted order is treated as
  cancelled, so each line item's quantity is returned to inventory, in one
  transaction using the same row locks. (If you instead wanted deletions to be
  pure audit removals that don't touch stock, that's a one-line change in
  `OrderService.delete` — but restoring is the more sensible default for a
  cancellation.)

- **Deleting referenced products/customers (409).** Foreign keys use
  `ON DELETE RESTRICT`, so you can't delete a product or customer that an order
  depends on; order history stays intact and the API returns a clear 409.

- **Validation.** Pydantic enforces positive prices, non-negative integer
  quantities, valid email, non-empty names, and rejects unknown fields. The
  frontend mirrors these rules for fast feedback, but the backend re-validates
  everything and remains the source of truth.

---

## Tests

The suite runs against a **real PostgreSQL** database (not SQLite), so
`FOR UPDATE`, enum types, and `CHECK` constraints are genuinely exercised.

```bash
cd backend
source .venv/bin/activate
createdb inventory_test                     # one-time
export TEST_DATABASE_URL=postgresql+psycopg://inventory:inventory@localhost:5432/inventory_test
pytest
```

Coverage includes: SKU/email uniqueness conflicts, insufficient-stock
whole-order rejection (with no partial decrement), stock decrement correctness,
server-side total computation, order-delete stock restoration, and the
concurrent-order oversell race.

---

## Deployment notes

The frontend and backend deploy independently.

### Backend — Render or Railway

1. Provision a managed PostgreSQL instance; copy its connection string.
2. Deploy `backend/` (its Dockerfile is production-ready: non-root, prod deps
   only). The container runs migrations on start via `entrypoint.sh`.
3. Set environment variables:
   - `DATABASE_URL` — the managed Postgres URL. Make sure it uses the
     `postgresql+psycopg://` scheme (rewrite the scheme if the provider gives
     `postgres://`).
   - `CORS_ORIGINS` — your deployed frontend origin, e.g.
     `https://your-app.vercel.app`.
   - `LOW_STOCK_THRESHOLD` (optional), `SEED_ON_START` (usually `false` in prod).
4. Expose port `8000` (Render/Railway inject `$PORT`; `entrypoint.sh` honors it).

### Frontend — Vercel or Netlify

1. Project root: `frontend/`. Build command `npm run build`, output `dist/`.
2. Set the build-time env var `VITE_API_URL` to your deployed backend URL,
   e.g. `https://your-backend.onrender.com`. It's inlined at build, so changing
   it requires a redeploy.
3. Add an SPA rewrite so deep links work:
   - **Vercel** — add a rewrite of `/(.*)` → `/index.html` (or use the included
     nginx behavior if deploying the container instead).
   - **Netlify** — add `/* /index.html 200` to a `_redirects` file.

After both are up, double-check that `CORS_ORIGINS` on the backend includes the
exact frontend origin (scheme + host, no trailing slash).
```
