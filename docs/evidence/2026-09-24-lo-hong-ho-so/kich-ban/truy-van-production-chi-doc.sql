-- Truy vấn CHỈ ĐỌC trên D1 production — chủ dự án tự chạy (CLAUDE.md §8: AI không được `d1 execute` trên D1 remote, kể cả chỉ đọc).
-- Mục đích (kế hoạch 2026-09-24 §5 Q6): lỗ F-01 mở từ 20/9 — đã có ai KHÔNG phải quản trị viên sửa/ngưng/đổi liên hệ hồ sơ NHÂN VIÊN chưa?
-- Không SELECT SĐT/email/MST; chỉ id, tên hiển thị, hành động, thời điểm. Kết quả dán cho AI ở phiên GĐ1 (không dán số điện thoại nếu có).
--
-- CÁCH CHẠY (từ gốc repo; nếu wrangler hỏi "Ok to proceed?" thì trả lời y):
--   KHÔNG dùng `--file` với `--remote`: wrangler gửi tệp qua cổng /d1/database/<id>/import, cổng này từ chối phiên đăng nhập OAuth
--   (`wrangler login`) với "Authentication error [code: 10000]" dù tài khoản là Super Administrator có d1 (write) — chủ dự án gặp
--   2026-09-24. Dùng `--command "<một câu SELECT>"` (cổng /query, đúng cách docs/HANDOFF-N1.md vẫn dùng cho lệnh chỉ đọc):
--   npx wrangler d1 execute tourdao-sales-db --remote --command "<chép nguyên văn câu (A) dưới đây, bỏ dấu ; cuối, gộp thành một dòng>"
--   rồi lặp lại cho (B) và (C). Mỗi lần một câu. Bản một dòng sẵn dùng có trong kế hoạch 2026-09-24 §5 Q6 / phiên chat 24/9.

-- (A) Hành động trên hồ sơ CÓ TÀI KHOẢN (staff.party_id) do tài khoản KHÔNG giữ ADMIN/SUPER_ADMIN tại thời điểm đó.
--     Kỳ vọng khi lỗ chưa bị dùng: 0 dòng. Có dòng = lỗ đã bị dùng (hoặc nhân viên tự sửa hồ sơ chính mình — xem cột tu_sua).
SELECT a.created_at                              AS luc,
       a.action                                  AS hanh_dong,
       a.detail                                  AS chi_tiet,
       a.staff_id                                AS nguoi_lam_id,
       COALESCE(nl.label, '(không rõ)')          AS nguoi_lam,
       t.id                                      AS tai_khoan_bi_sua_id,
       COALESCE(bs.label, '(không rõ)')          AS tai_khoan_bi_sua,
       CASE WHEN a.staff_id = t.id THEN 'tự sửa hồ sơ mình' ELSE 'sửa hồ sơ NGƯỜI KHÁC' END AS tu_sua
FROM audit_log a
JOIN staff t ON t.party_id = a.target_id                       -- hồ sơ bị chạm có gắn tài khoản t
LEFT JOIN v_stf_staff_label nl ON nl.id = a.staff_id
LEFT JOIN v_stf_staff_label bs ON bs.id = t.id
WHERE a.target_type = 'party'
  AND a.action IN ('party_updated', 'party_contact_changed')
  AND a.staff_id IS NOT NULL
  AND NOT EXISTS (
        SELECT 1 FROM stf_permission p
        WHERE p.staff_id = a.staff_id
          AND p.permission_type_code IN ('ADMIN', 'SUPER_ADMIN')
          AND p.valid_from_at <= a.created_at
          AND (p.valid_to_at IS NULL OR p.valid_to_at > a.created_at))
ORDER BY a.created_at;

-- (B) Bất biến một chiều sẽ thêm ở GĐ1 (ADR-0013 điều 4 sửa): tài khoản ĐANG HOẠT ĐỘNG mà hồ sơ đã bị NGƯNG.
--     Kỳ vọng: 0 dòng. Có dòng = dữ liệu cần chủ quyết cách sửa (kích hoạt lại hồ sơ ở màn Hồ sơ bằng tài khoản quản trị).
SELECT s.id                               AS tai_khoan_id,
       COALESCE(v.label, '(không rõ)')    AS ten,
       s.active                           AS tai_khoan_hoat_dong,
       p.active                           AS ho_so_hoat_dong,
       p.updated_at                       AS ho_so_sua_luc,
       p.updated_by                       AS ho_so_sua_boi
FROM staff s
JOIN pty_party p ON p.id = s.party_id
LEFT JOIN v_stf_staff_label v ON v.id = s.id
WHERE s.active = 1 AND p.active = 0;

-- (C) Đếm tổng để biết quy mô nhật ký đã quét (thông tin, không phải lỗi).
SELECT count(*) AS so_dong_nhat_ky_ho_so
FROM audit_log
WHERE target_type = 'party';
