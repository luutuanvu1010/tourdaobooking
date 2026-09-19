-- Module: audit
CREATE TABLE audit_log (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders(id),
  staff_id   TEXT NOT NULL REFERENCES staff(id),
  action     TEXT NOT NULL CHECK (action IN ('created', 'updated', 'confirmed', 'cancelled', 'exported_png', 'exported_pdf')),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_audit_order ON audit_log(order_id);
