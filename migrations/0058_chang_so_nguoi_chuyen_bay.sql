-- Migration 0058 — Ô MỚI CỦA CHẶNG ĐƯA ĐÓN (module orders, bảng của nó). Kế hoạch docs/superpowers/plans/2026-10-01-may-chu-o-moi-chang-ke-hoach.md Task 1.
-- CHỈ THÊM hai cột vào `ord_transfer_leg` (0034), không dựng lại bảng, không chạm trigger cũ (trigger khoá "Đã giao" của 0044 không liệt kê cột ⇒ tự phủ cột mới).
--
-- 1) `flight_code` — số hiệu chuyến bay (ADR-0055 VK2-C C1, nguyên văn CHECK của ADR). Máy chủ chuẩn hoá (bỏ khoảng trắng, chữ HOA) và khớp khuôn
--    `^[A-Z0-9]{2}[0-9]{1,4}[A-Z]?$` ở MÃ (`chuanHoaSoHieuChuyenBay`, src/shared/chang-dua-don.ts); CSDL chỉ giữ chữ HOA + độ dài 3..8.
-- 2) `pax_override` — số người RIÊNG của chặng VỀ (ADR-0054 D10.3, nguyên văn CHECK của ADR): NULL = theo số khách hiệu lực của dịch vụ; ≥ 1; chỉ `RETURN`
--    (0 người thì bỏ chặng). CHECK CỘT được tham chiếu cột khác của dòng khi ADD COLUMN (tiền lệ 0040 `short_notice_lead_minutes`, đã chạy trên D1 local và
--    production) ⇒ thi công ĐÚNG CHỮ ADR, không cần trigger. "≤ số khách hiệu lực" (L-R1) chỉ ở mã + kiểm định kỳ (số khách hiệu lực nằm trong JSON).
ALTER TABLE ord_transfer_leg ADD COLUMN flight_code TEXT
  CHECK (flight_code IS NULL OR (flight_code = upper(flight_code) AND length(flight_code) BETWEEN 3 AND 8));
ALTER TABLE ord_transfer_leg ADD COLUMN pax_override INTEGER
  CHECK (pax_override IS NULL OR (pax_override >= 1 AND direction = 'RETURN'));
