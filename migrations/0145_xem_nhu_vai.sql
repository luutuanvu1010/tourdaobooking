-- 0145 — Toàn quyền «xem như» vai khác (ADR-0180).
-- Phiên của Toàn quyền nhớ mã quyền đang đóng (rỗng = không đóng vai); CSDL chỉ nhận 10 mã quyền, không nhận SUPER_ADMIN.
-- Hết hạn do máy chủ xét theo last_seen_at, không lưu ở đây.
ALTER TABLE aut_session ADD COLUMN acting_role TEXT CHECK (acting_role IS NULL OR acting_role IN ('SALES','ACCOUNTING','ADMIN','FIELD','PARTNER','INTERN','DRIVER','DRIVER_PARTNER','HR','SALES_MANAGER'));
-- Nhật ký ghi mã vai đang đóng lúc ghi dòng (chỉ mã vai, không dữ liệu cá nhân); không CHECK vì nhật ký chỉ-thêm.
ALTER TABLE audit_log ADD COLUMN acting_role TEXT;
