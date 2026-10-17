-- Migration 0106 — Vé hỗ trợ đợt 2a (ADR-0127). Spec: docs/superpowers/specs/2026-10-16-ve-ho-tro-dot-2a-design.md (bản 2). Chỉ THÊM cột; không sửa 0016_*, 0100_*.
-- Phiếu cũ nhận priority = 'NORMAL' bằng giá trị mặc định hằng và order_* = NULL; không viết lại dòng nào. Mã cũ (không nêu cột mới) vẫn chạy ⇒ hoàn tác bằng rollback mã.
-- priority KHÔNG có CHECK liệt kê (src/CLAUDE.md: danh sách giá trị mở kiểm ở mã — NORMAL / HIGH / URGENT ở src/shared/ve-ho-tro.ts).
-- order_id: tham chiếu LOGIC tới đơn (orders), KHÔNG khoá ngoại; order_code: mã đơn chụp lúc gửi để phiếu không phụ thuộc đơn. Hai cột cùng có hoặc cùng vắng.
-- Ba câu ADD COLUMN riêng lẻ (SQLite không nhận danh sách cột); order_id thêm TRƯỚC để CHECK hai cột ở order_code nhắc được nó. Không view, không chỉ mục mới.

ALTER TABLE fbk_ticket ADD COLUMN priority TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE fbk_ticket ADD COLUMN order_id TEXT;
ALTER TABLE fbk_ticket ADD COLUMN order_code TEXT CHECK ((order_id IS NULL) = (order_code IS NULL));
