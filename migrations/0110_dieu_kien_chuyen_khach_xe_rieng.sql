-- ADR-0128 Q2 (chủ dự án duyệt 2026-10-17): xe riêng không ai ghép thêm khách lẻ, kể cả khi chuyển khách giữa hai xe. Thêm MỘT điều kiện chuyển khách tầng LOI
-- (không đạt ⇒ chỉ Bác — trigger vc_transfer_request_confirm_core của 0093 giữ). CAM_KET_DICH giữ tầng CAU_HINH, nay chỉ xét cam kết số chỗ tối thiểu.
-- Lý do không đổi tầng của CAM_KET_DICH: tầng là bất biến của danh mục (trigger vc_transfer_rule_identity) và dòng kiểm phải mang đúng tầng danh mục (vc_transfer_check_rule).
-- Chỉ thêm một dòng danh mục; không đổi bảng, không đụng dòng cũ. Đề nghị đang chờ: lần bấm sau kiểm lại theo danh mục hiện hành nên tự có dòng mới.
-- Hoàn tác: UPDATE vc_transfer_rule SET active = 0 WHERE code = 'XE_RIENG_DICH' (không xoá được — chỉ-thêm).
INSERT INTO vc_transfer_rule (code, label, tier, sort_order, created_at) VALUES
  ('XE_RIENG_DICH', 'Xe nhận không chở khách đã đặt xe riêng', 'LOI', 12, '2026-10-17T00:00:00.000Z');
