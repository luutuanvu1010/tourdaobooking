-- Migration 0018 — N2 lát 1: người đặt (hồ sơ khách) trên đơn. Đặc tả docs/superpowers/specs/2026-09-21-n2-lat-1-khach-tren-don.md §2, ADR-0001 mục 7, ADR-0011.
-- Chỉ THÊM (expand). Cột để trống được là BẮT BUỘC: SQLite chỉ cho ADD COLUMN … REFERENCES khi mặc định NULL; không dựng lại `orders`
-- nên các trigger orders_* (0007, 0008, 0017) giữ nguyên. Khoá ngoại NO ACTION; hồ sơ không bao giờ xoá cứng nên khoá ngoại chỉ là lưới.
-- customer_name/phone/email/note GIỮ làm bản chụp lúc đặt. Đơn cũ để trống (lát 2 mới backfill).
ALTER TABLE orders ADD COLUMN booker_party_id TEXT REFERENCES pty_party(id);
CREATE INDEX orders_booker_party_idx ON orders(booker_party_id);
