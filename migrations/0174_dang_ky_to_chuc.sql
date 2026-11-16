-- Đợt 2 đăng ký đối tác: phần tổ chức (ADR-0212). Tệp này nhận các phần của nhiều việc; mỗi phần ghi đầu mục.

-- ===== parties — dấu «Thu thông tin tổ chức» của chính sách riêng tư (ADR-0212 Đ7) =====
-- Phiên bản chính sách riêng tư tự nói mình đã nêu việc thu thông tin của tổ chức hay chưa. Phần tổ chức của biểu mẫu đăng ký chỉ mở khi bản ĐANG hiệu lực có dấu này.
-- Bảng chỉ-thêm (trigger cũ chặn sửa/xoá) nên dấu chỉ đặt lúc đăng bản mới; bản cũ giữ 0 = chưa nêu. Không lộ ra điểm cuối công khai của chính sách.
ALTER TABLE pty_privacy_policy ADD COLUMN covers_org_data INTEGER NOT NULL DEFAULT 0 CHECK (covers_org_data IN (0, 1));

-- Hai view công bố của 0171 thêm cột (DROP + CREATE: không sửa 0171 đã áp remote).
DROP VIEW v_pty_privacy_current;
CREATE VIEW v_pty_privacy_current AS
SELECT p.id, p.version, p.purposes, p.body, p.valid_from_at, p.covers_org_data
FROM pty_privacy_policy p
ORDER BY p.version DESC
LIMIT 1;

DROP VIEW v_pty_privacy_effective;
CREATE VIEW v_pty_privacy_effective AS
SELECT p.id, p.version, p.valid_from_at, p.covers_org_data
FROM pty_privacy_policy p
WHERE p.valid_from_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
ORDER BY p.version DESC
LIMIT 1;
