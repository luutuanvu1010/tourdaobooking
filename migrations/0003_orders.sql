-- Module: orders. Bảng đặt tên "orders" (ORDER là từ khoá SQL) — thực thể `order` của spec §2.1.
CREATE TABLE orders (
  id               TEXT PRIMARY KEY,
  order_code       TEXT NOT NULL UNIQUE,
  staff_id         TEXT NOT NULL REFERENCES staff(id),
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  customer_email   TEXT,
  customer_note    TEXT,
  subtotal         INTEGER NOT NULL DEFAULT 0,
  discount         INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL DEFAULT 0,
  deposit_amount   INTEGER NOT NULL DEFAULT 0,
  deposit_method   TEXT CHECK (deposit_method IN ('cash', 'bank_transfer', 'other')),
  remaining_amount INTEGER NOT NULL DEFAULT 0,
  payment_note     TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  confirmed_at     TEXT
);
CREATE INDEX idx_orders_staff ON orders(staff_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

CREATE TABLE order_item (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  detail      TEXT,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price  INTEGER NOT NULL CHECK (unit_price >= 0),
  line_total  INTEGER NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_order_item_order ON order_item(order_id);
