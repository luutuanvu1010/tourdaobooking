-- ADR-0084 (accepted 2026-10-01): trợ lý "Mai" gọi tên + xưng hô theo giới tính. Số 0064 là TẠM (0061, 0063 ở nhánh khác chưa gộp — người gộp đánh lại nếu cần).
-- Bài kiểm: src/migrations-pty-person-gender.test.ts (tìm tệp theo ĐUÔI tên).

-- Đ1: giới tính của hồ sơ NGƯỜI (module parties sở hữu). 'NAM' | 'NU' | NULL (= chưa ghi). Danh sách mở kiểm ở MÃ (src/shared/xung-ho.ts kiemGioiTinh),
-- KHÔNG CHECK liệt kê (Hiến chương Phần I). Dòng có sẵn = NULL. Không đụng trigger nào của pty_person / pty_party (gộp hồ sơ ADR-0068 giữ nguyên).
ALTER TABLE pty_person ADD COLUMN gender TEXT;

-- View công bố của parties: chỉ tên gọi + giới tính (KHÔNG họ, tên đệm — Đ4). Chỉ đọc.
CREATE VIEW v_pty_person_xung_ho AS
  SELECT pe.party_id AS party_id, pe.given_name AS given_name, pe.gender AS gender
  FROM pty_person pe;

-- View công bố của staff: tên gọi + giới tính theo id tài khoản, đọc hồ sơ QUA view công bố của parties (cạnh staff → parties sẵn có). Module tro-ly đọc
-- view này qua cạnh tro-ly → staff sẵn có — KHÔNG thêm cạnh tro-ly → parties. LEFT JOIN: tài khoản chưa có hồ sơ vẫn có dòng (tên / giới tính NULL ⇒ "bạn").
CREATE VIEW v_stf_staff_xung_ho AS
  SELECT s.id AS id, p.given_name AS given_name, p.gender AS gender
  FROM staff s LEFT JOIN v_pty_person_xung_ho p ON p.party_id = s.party_id;

-- Đ3 + Đ5: câu chào mặc định theo vai Mai. tl_loi_dan CHỈ THÊM (trigger chặn sửa / xoá) ⇒ thêm MỘT bản mới, chép giọng / lời dặn / câu hỏi mẫu của bản
-- hiện hành — CHỈ KHI bản hiện hành vẫn là bản GIEO của 0054 (Toàn quyền chưa lưu bản nào). Bản Toàn quyền đã lưu không tự đổi. Thứ tự "hiện hành" đúng
-- như câu loi-dan-hien-hanh của src/modules/tro-ly/repository.ts. created_by NULL = hệ thống.
INSERT INTO tl_loi_dan (id, cau_chao, giong, loi_dan_them, cau_hoi_mau, valid_from_at, created_at, created_by, updated_at, updated_by)
SELECT 'mai-adr-0084', 'Chào {ten}, em là Mai — trợ lý của Tour Đảo. {ten} cần hỏi gì về cách dùng app cứ hỏi em nhé!', h.giong, h.loi_dan_them, h.cau_hoi_mau,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL
FROM (SELECT id, giong, loi_dan_them, cau_hoi_mau FROM tl_loi_dan ORDER BY valid_from_at DESC, created_at DESC, id DESC LIMIT 1) h
WHERE h.id = 'gieo-0054';
