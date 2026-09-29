-- Migration 0040 — ĐẶT GẤP trên chặng đưa đón (ADR-0049 D2 "Mốc tối thiểu 6 giờ", lát 1.4; bổ sung ADR-0047 A1; kế hoạch
-- docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md mục 1.3, Task A9). Module orders (bảng của nó). CHỈ THÊM năm cột, không chạm 0034 / 0035.
-- Chặng dưới mốc tối thiểu chỉ được xác nhận / sửa khi mang dấu "đặt gấp" do Quản trị, Toàn quyền đóng (ô order.leg.short_notice — route đặt gấp và nhánh
-- `datGap` của lệnh sửa chặng là NƠI DUY NHẤT ghi năm cột này — I16). Đóng dấu lại là hợp lệ (I14: mỗi lần sửa dưới mốc cần lý do mới) → không trigger cấm sửa.
-- Mã lý do thuộc `LY_DO_DAT_GAP` (src/shared/chang-dua-don.ts) — kiểm ở MÃ (I7); CSDL chỉ giữ khuôn. Ghi chú đã che dãy số ở máy chủ, KHÔNG vào nhật ký.
-- "Có lý do thì có người + lúc + số phút": SQLite chỉ nhận CHECK CỘT khi ADD COLUMN → một CHECK trên cột thêm SAU CÙNG, tham chiếu bốn cột trước (cách 1 —
-- đã thử THẬT trên node:sqlite và D1 local, A0 bước 12). Mọi vế "phải có" viết `IS NOT NULL` TƯỜNG MINH: NULL trong CHECK là "không sai" ⇒ lọt (bẫy 51).
ALTER TABLE ord_transfer_leg ADD COLUMN short_notice_reason TEXT CHECK (
  short_notice_reason IS NULL OR (length(short_notice_reason) BETWEEN 1 AND 40 AND short_notice_reason NOT GLOB '*[^A-Z_]*')
);
ALTER TABLE ord_transfer_leg ADD COLUMN short_notice_note TEXT CHECK (short_notice_note IS NULL OR length(short_notice_note) <= 120);
-- Cột WHO: không khoá ngoại (docs/ARCHITECTURE.md Phần II; bài ADR-0003).
ALTER TABLE ord_transfer_leg ADD COLUMN short_notice_by TEXT;
ALTER TABLE ord_transfer_leg ADD COLUMN short_notice_at TEXT;
-- Số phút mốc ĐÃ DÙNG lúc đóng dấu (chụp tại mốc — Hiến chương 5.6), cùng khoảng với vc_dispatch_policy.min_lead_minutes (1–2880; mốc không tắt được).
ALTER TABLE ord_transfer_leg ADD COLUMN short_notice_lead_minutes INTEGER CHECK (
  (short_notice_reason IS NULL AND short_notice_note IS NULL AND short_notice_by IS NULL AND short_notice_at IS NULL AND short_notice_lead_minutes IS NULL)
  OR (short_notice_reason IS NOT NULL AND short_notice_by IS NOT NULL AND short_notice_at IS NOT NULL
      AND short_notice_lead_minutes IS NOT NULL AND short_notice_lead_minutes BETWEEN 1 AND 2880)
);
