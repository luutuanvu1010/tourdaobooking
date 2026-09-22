-- Đổi nhãn hiển thị của quyền FIELD từ "Thực hiện" sang "Hướng dẫn viên" — chủ dự án chốt 2026-09-22, không đổi mã/ý nghĩa quyền (vẫn đúng
-- ADR-0005: quyền app khác vai trò hồ sơ), chỉ đổi chữ hiển thị cho dễ hiểu. Không có mã nào đọc cột name của bảng này lúc chạy (nguồn hiển thị
-- thật là PERMISSION_LABEL ở src/shared/permissions.ts) — cập nhật ở đây chỉ để dữ liệu khớp với mã, tránh lệch khi tra bảng bằng tay/SQL.
UPDATE stf_permission_type SET name = 'Hướng dẫn viên' WHERE code = 'FIELD';
