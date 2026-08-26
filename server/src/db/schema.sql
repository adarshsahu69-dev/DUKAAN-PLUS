-- Kirana Inventory Management System - PostgreSQL schema
-- Applied automatically by docker-compose and by `npm run db:setup`.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- Reference tables
-- =========================================================
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS units (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,        -- kilogram, liter, piece, pack, dozen
  short_code TEXT NOT NULL UNIQUE         -- kg, l, pc, pk, dz
);

-- =========================================================
-- Master data
-- =========================================================
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  sku           TEXT UNIQUE,
  barcode       TEXT,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  unit_id       UUID REFERENCES units(id) ON DELETE SET NULL,
  cost_price    NUMERIC(14,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  stock_qty     NUMERIC(14,3) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(14,3) NOT NULL DEFAULT 0,
  expiry_date   DATE,
  image_url     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

CREATE TABLE IF NOT EXISTS suppliers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  contact_person     TEXT,
  phone              TEXT,
  email              TEXT,
  address            TEXT,
  outstanding_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  phone               TEXT,
  address             TEXT,
  credit_limit        NUMERIC(14,2) NOT NULL DEFAULT 0,
  outstanding_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- Transactions
-- =========================================================
CREATE TABLE IF NOT EXISTS sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no      TEXT NOT NULL UNIQUE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_type   TEXT CHECK (discount_type IN ('none','percent','fixed')),
  discount_value  NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total           NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method  TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','upi','card','credit')),
  amount_paid     NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

CREATE TABLE IF NOT EXISTS sale_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id      UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty          NUMERIC(14,3) NOT NULL,
  unit_price   NUMERIC(14,2) NOT NULL,
  cost_price   NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total   NUMERIC(14,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

CREATE TABLE IF NOT EXISTS purchases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no  TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  total       NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at);

CREATE TABLE IF NOT EXISTS purchase_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id  UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty          NUMERIC(14,3) NOT NULL,
  cost_price   NUMERIC(14,2) NOT NULL,
  line_total   NUMERIC(14,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  qty_change  NUMERIC(14,3) NOT NULL,
  reason      TEXT,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- Sync & audit
-- =========================================================
CREATE TABLE IF NOT EXISTS sync_changes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity           TEXT NOT NULL,
  entity_id        TEXT NOT NULL,
  operation        TEXT NOT NULL,          -- create | update | delete
  payload          JSONB NOT NULL,
  device_id        TEXT,
  server_version   BIGINT NOT NULL DEFAULT 1,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_sync_entity ON sync_changes(entity, entity_id);

CREATE TABLE IF NOT EXISTS activity_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  detail     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);

-- =========================================================
-- Seed reference data
-- =========================================================
INSERT INTO units (name, short_code) VALUES
  ('Kilogram', 'kg'),
  ('Gram', 'g'),
  ('Liter', 'l'),
  ('Milliliter', 'ml'),
  ('Piece', 'pc'),
  ('Pack', 'pk'),
  ('Dozen', 'dz')
ON CONFLICT (short_code) DO NOTHING;

INSERT INTO categories (name) VALUES
  ('Grains'), ('Dairy'), ('Snacks'), ('Beverages'),
  ('Spices'), ('Household'), ('Fruits & Vegetables'), ('Other')
ON CONFLICT (name) DO NOTHING;
