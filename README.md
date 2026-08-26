# Kirana Shop Inventory Management System

An offline-first full-stack inventory, billing, and purchasing system for kirana (grocery) shops.
Works as a responsive **PWA** that keeps working without a network connection, then syncs
automatically when back online.

## Features

- **Stock tracking** — products, categories, units, barcodes, expiry dates, low-stock alerts, manual stock adjustments.
- **Purchases** — supplier management, purchase entry with automatic stock updates, supplier payment tracking.
- **Billing** — fast counter POS with product search + camera barcode scanning, cart, discounts (%, fixed), cash/UPI/card/credit (khata) payments, digital receipts (PDF).
- **Offline-first** — all data lives in **IndexedDB**; the app is fully usable offline. A sync queue replays mutations when connectivity returns (last-write-wins conflict resolution).
- **Reports** — daily/weekly/monthly sales, profit/loss, top products, dead stock, stock valuation, payment breakdown, CSV/PDF export.
- **Users** — JWT auth, admin/staff roles, activity-friendly API with rate limiting.

## Architecture

```
kirana-inventory/
├── server/   Express + TypeScript + PostgreSQL (REST API, JWT, Zod, rate limiting)
├── web/      React + TypeScript + Vite + Tailwind + PWA (IndexedDB offline store)
└── docker-compose.yml
```

The React app is the source of truth on the device (IndexedDB). When online it pushes
changes to the Express/PostgreSQL backend via `/api/sync/push` and `/api/sales` & `/api/purchases`,
and pulls catalog/transaction state via `/api/sync/pull`.

## Quick start (Docker)

```bash
docker compose up --build
# backend  -> http://localhost:4000
# frontend -> http://localhost:5173
# default admin: admin / admin123
```

## Manual start

```bash
# 1. Database (PostgreSQL) with the schema at server/src/db/schema.sql
export DATABASE_URL=postgres://kirana:kirana_dev_password@localhost:5432/kirana_inventory

# 2. Backend
cd server && npm install && npm run dev

# 3. Frontend
cd web && npm install && npm run dev
# configure the API URL with VITE_API_URL (default http://localhost:4000/api)
```

## API highlights

| Area | Endpoints |
|------|-----------|
| Auth | `POST /api/auth/login`, `GET /api/auth/me` |
| Catalog | `/api/products`, `/api/categories`, `/api/units`, `/api/suppliers`, `/api/customers` |
| Transactions | `/api/sales`, `/api/purchases`, `/api/stock/adjust`, `/api/stock/low`, `/api/stock/expiring` |
| Reports | `/api/reports/summary`, `/reports/sales-trend`, `/reports/top-products`, `/reports/dead-stock`, `/reports/stock-valuation`, `/reports/customer-credit`, `/reports/sales-by-payment` |
| Sync | `/api/sync/pull`, `/api/sync/push`, `/api/sync/status` |
| Users | `/api/users` (admin) |

## Security

Passwords hashed with bcrypt, JWT with expiry, Helmet headers, CORS, express-rate-limit on
auth and general routes, Zod validation on all inputs, Postgres parameterised queries.
