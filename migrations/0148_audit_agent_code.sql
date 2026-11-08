-- 0148 — Tác nhân tự động có định danh riêng (ADR-0186, đóng HC-5.11).
-- Dòng nhật ký do tác nhân tự động ghi mang mã tác nhân ở đây (DONG_BO_DANH_MUC, NHAC_HAN_TRA_SAU, DON_ANH_VE), staff_id rỗng; dòng của người để rỗng.
-- Danh sách mã kiểm ở mã (src/shared/permissions.ts, src/modules/audit/repository.ts), không CHECK liệt kê; nhật ký chỉ-thêm (trigger 0017 giữ nguyên).
-- Chỉ MỞ RỘNG (expand): chưa có trigger bắt buộc người làm, vì Worker cũ (giữa lúc áp migration và deploy, hoặc khi quay lui) vẫn ghi rỗng — siết ở lần phát
-- hành sau (ADR-0186 Đ8).
ALTER TABLE audit_log ADD COLUMN agent_code TEXT;
