-- Rà soát ngôn ngữ lượt 2 (chủ dự án chọn 18/10/2026, hồ sơ docs/superpowers/specs/2026-10-18-ra-soat-ngon-ngu-luot-2.md): đổi CHỮ hai nhãn điều kiện
-- chuyển khách theo tên mới — «mốc tối thiểu» → «hạn chốt», «chặng» → «lượt đưa đón». Nhãn được đọc lúc hiển thị (thẻ đề nghị chuyển khách), nên dòng kiểm
-- cũ cũng tự hiện chữ mới; dữ liệu kiểm không đổi. Mã, tầng, thứ tự, trạng thái giữ nguyên (trigger vc_transfer_rule_identity chỉ cho đổi label / active /
-- sort_order). ADR-0111 coi nhãn là đổi lại được — không cần ADR mới.
-- Hoàn tác: hai câu UPDATE ngược về 'Còn đủ mốc tối thiểu trước giờ xe nhận chạy' và 'Chặng của khách còn hiệu lực'.
UPDATE vc_transfer_rule SET label = 'Còn đủ hạn chốt trước giờ xe nhận chạy' WHERE code = 'MOC_TOI_THIEU';
UPDATE vc_transfer_rule SET label = 'Lượt đưa đón của khách còn hiệu lực' WHERE code = 'CHANG_KHACH_HIEU_LUC';
