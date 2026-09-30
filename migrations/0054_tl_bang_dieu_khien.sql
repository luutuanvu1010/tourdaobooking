-- Module: tro-ly — bảng điều khiển trợ lý Hỗ trợ cho Toàn quyền (ADR-0069, accepted 2026-09-30; sửa ADR-0066 điều 1, 7, 9–10). CHỈ THÊM bốn bảng mới (expand);
-- không đụng tl_luot_hoi / tl_cai_dat của 0050. Số 0054: 0051–0053 đã dùng ở các nhánh khác chưa gộp (kiểm `git ls-tree` mọi nhánh 30/9).
-- Cả bốn bảng CHỈ THÊM (trigger chặn UPDATE / DELETE — luật không xoá cứng); dấu vết = created_by / created_at trên chính dòng (Hiến chương 5.5).
-- KHÔNG có cột nào chứa khoá OpenAI (ADR-0069 điều 2 — khoá chỉ qua `wrangler secret put`). staff_id / created_by không khoá ngoại: module tro-ly không
-- ghi / khoá bảng của module khác (cùng lý do 0050).
--
-- tl_vai — công tắc theo MÃ QUYỀN (ADR-0069 điều 3), bản có hiệu lực: bản hiện hành của một mã = dòng có valid_from_at lớn nhất (hoà thì created_at, id).
--   ma_quyen   một trong 9 mã quyền app (tập mở ⇒ kiểm ở mã, không CHECK liệt kê). Mã không có dòng nào ⇒ TẮT (mặc định từ chối).
--   Tài khoản nhiều quyền được hỏi khi ÍT NHẤT một quyền đang bật (luật thuần `duocDungTroLy`, src/shared/tro-ly.ts). Gieo: bật cả 9 (giữ hành vi 1.44/1.45).
-- tl_loi_dan — lời dặn của Toàn quyền (ADR-0069 điều 4), bản có hiệu lực (bản hiện hành = valid_from_at lớn nhất). Mọi bản giữ làm "lịch sử bản";
--   "quay lại bản cũ" = thêm bản mới cùng nội dung. Chữ đã qua luật nội dung (không SĐT, email, số tiền) Ở MÁY CHỦ trước khi ghi.
--   cau_hoi_mau  mảng JSON các câu hỏi mẫu hiện sẵn trong khung Hỗ trợ.
--   Gieo: câu chào đang dùng ở bản 1.44/1.45 (web/tro-ly.ts), giọng / lời dặn thêm rỗng, không câu hỏi mẫu.
-- tl_ngu_canh — đoạn ngữ cảnh bổ sung (ADR-0069 điều 4), bản có hiệu lực THEO TỪNG ĐOẠN: doan_id cố định cho một đoạn; bản hiện hành của đoạn = dòng có
--   valid_from_at lớn nhất cùng doan_id. Sửa / bật / tắt = thêm bản mới. Đoạn đang bật đi vào kho tìm đoạn (có ngân sách token) như hướng dẫn.
-- tl_hoi_dap — lịch sử hỏi đáp (ADR-0069 điều 5; sửa ADR-0066 điều 7). MỘT dòng cho mỗi câu đã tới bước trả lời, ghi CÙNG LÔ với dòng tl_luot_hoi (luot_id).
--   cau_hoi    câu hỏi ĐÃ CHE (SĐT, email, số giấy tờ → "[đã che]") — đúng chuỗi đã gửi OpenAI. CHECK chặn lớp hai: không dãy 8 chữ số liền.
--   tra_loi    câu trả lời người dùng thấy (kể cả câu "chưa có" và câu báo lỗi); nguon mảng JSON tên mục đã dùng.
--   vai        mảng JSON mã quyền của người hỏi lúc hỏi (lọc bằng json_each). ket_qua ok | loi (câu bị chặn trần không có dòng ở đây).
--   Chỉ Toàn quyền đọc (ô settings.ops, route GET /api/tro-ly/lich-su). Không xoá.
CREATE TABLE tl_vai (
  id            TEXT PRIMARY KEY,
  ma_quyen      TEXT NOT NULL,
  bat           INTEGER NOT NULL CHECK (bat IN (0, 1)),
  valid_from_at TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);
CREATE INDEX tl_vai_ma ON tl_vai (ma_quyen, valid_from_at);
CREATE TRIGGER tl_vai_no_update BEFORE UPDATE ON tl_vai
BEGIN SELECT RAISE(ABORT, 'tl_append_only: công tắc vai chỉ thêm bản mới, không sửa'); END;
CREATE TRIGGER tl_vai_no_delete BEFORE DELETE ON tl_vai
BEGIN SELECT RAISE(ABORT, 'tl_append_only: công tắc vai không xoá'); END;

CREATE TABLE tl_loi_dan (
  id            TEXT PRIMARY KEY,
  cau_chao      TEXT NOT NULL,
  giong         TEXT NOT NULL DEFAULT '',
  loi_dan_them  TEXT NOT NULL DEFAULT '',
  cau_hoi_mau   TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(cau_hoi_mau) AND json_type(cau_hoi_mau) = 'array'),
  valid_from_at TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);
CREATE TRIGGER tl_loi_dan_no_update BEFORE UPDATE ON tl_loi_dan
BEGIN SELECT RAISE(ABORT, 'tl_append_only: lời dặn trợ lý chỉ thêm bản mới, không sửa'); END;
CREATE TRIGGER tl_loi_dan_no_delete BEFORE DELETE ON tl_loi_dan
BEGIN SELECT RAISE(ABORT, 'tl_append_only: lời dặn trợ lý không xoá'); END;

CREATE TABLE tl_ngu_canh (
  id            TEXT PRIMARY KEY,
  doan_id       TEXT NOT NULL,
  tieu_de       TEXT NOT NULL,
  noi_dung      TEXT NOT NULL,
  bat           INTEGER NOT NULL CHECK (bat IN (0, 1)),
  valid_from_at TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);
CREATE INDEX tl_ngu_canh_doan ON tl_ngu_canh (doan_id, valid_from_at);
CREATE TRIGGER tl_ngu_canh_no_update BEFORE UPDATE ON tl_ngu_canh
BEGIN SELECT RAISE(ABORT, 'tl_append_only: ngữ cảnh trợ lý chỉ thêm bản mới, không sửa'); END;
CREATE TRIGGER tl_ngu_canh_no_delete BEFORE DELETE ON tl_ngu_canh
BEGIN SELECT RAISE(ABORT, 'tl_append_only: ngữ cảnh trợ lý không xoá'); END;

CREATE TABLE tl_hoi_dap (
  id                TEXT PRIMARY KEY,
  luot_id           TEXT NOT NULL UNIQUE REFERENCES tl_luot_hoi (id),
  staff_id          TEXT NOT NULL,
  vai               TEXT NOT NULL CHECK (json_valid(vai) AND json_type(vai) = 'array'),
  ngay_vn           TEXT NOT NULL CHECK (ngay_vn GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  cau_hoi           TEXT NOT NULL CHECK (cau_hoi NOT GLOB '*[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'),
  tra_loi           TEXT NOT NULL,
  nguon             TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(nguon) AND json_type(nguon) = 'array'),
  chi_phi_micro_usd INTEGER NOT NULL DEFAULT 0 CHECK (chi_phi_micro_usd >= 0),
  ket_qua           TEXT NOT NULL CHECK (ket_qua IN ('ok', 'loi')),
  created_at        TEXT NOT NULL,
  created_by        TEXT,
  updated_at        TEXT NOT NULL,
  updated_by        TEXT
);
CREATE INDEX tl_hoi_dap_ngay ON tl_hoi_dap (ngay_vn, created_at);
CREATE INDEX tl_hoi_dap_nguoi ON tl_hoi_dap (staff_id, created_at);
CREATE TRIGGER tl_hoi_dap_no_update BEFORE UPDATE ON tl_hoi_dap
BEGIN SELECT RAISE(ABORT, 'tl_append_only: lịch sử hỏi đáp chỉ thêm, không sửa'); END;
CREATE TRIGGER tl_hoi_dap_no_delete BEFORE DELETE ON tl_hoi_dap
BEGIN SELECT RAISE(ABORT, 'tl_append_only: lịch sử hỏi đáp không xoá'); END;

-- Chín câu INSERT riêng (D1 giới hạn số vế của SELECT ghép — UNION ALL chín vế bị từ chối "too many terms in compound SELECT").
INSERT INTO tl_vai (id, ma_quyen, bat, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('gieo-0054-SALES', 'SALES', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
INSERT INTO tl_vai (id, ma_quyen, bat, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('gieo-0054-ACCOUNTING', 'ACCOUNTING', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
INSERT INTO tl_vai (id, ma_quyen, bat, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('gieo-0054-ADMIN', 'ADMIN', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
INSERT INTO tl_vai (id, ma_quyen, bat, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('gieo-0054-FIELD', 'FIELD', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
INSERT INTO tl_vai (id, ma_quyen, bat, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('gieo-0054-PARTNER', 'PARTNER', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
INSERT INTO tl_vai (id, ma_quyen, bat, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('gieo-0054-SUPER_ADMIN', 'SUPER_ADMIN', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
INSERT INTO tl_vai (id, ma_quyen, bat, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('gieo-0054-INTERN', 'INTERN', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
INSERT INTO tl_vai (id, ma_quyen, bat, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('gieo-0054-DRIVER', 'DRIVER', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
INSERT INTO tl_vai (id, ma_quyen, bat, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('gieo-0054-DRIVER_PARTNER', 'DRIVER_PARTNER', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);

INSERT INTO tl_loi_dan (id, cau_chao, giong, loi_dan_them, cau_hoi_mau, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0054', 'Chào bạn! Hỏi mình cách dùng app, ví dụ: “Đổi mã PIN thế nào?” hoặc “Lập đơn mới ra sao?”.', '', '', '[]',
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
