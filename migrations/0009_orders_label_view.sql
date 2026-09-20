-- Migration 0009 — view công bố nhãn đơn (module orders). Đặc tả N1 (docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md), ADR-0001/0002/0003/0005/0008.
-- Nguồn: mục 0 của docs/superpowers/specs/2026-09-20-n1-schema-reference.sql (bộ kiểm SQLite đã chạy). Chỉ THÊM — mã cũ vẫn chạy nguyên vẹn (expand–contract).

CREATE VIEW v_ord_order_label AS
  SELECT id, order_code FROM orders;
