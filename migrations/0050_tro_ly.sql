-- Module: tro-ly — trợ lý AI "Hỗ trợ" trả lời cách dùng app (ADR-0066, accepted 2026-09-30). CHỈ THÊM hai bảng mới (expand); không đụng bảng đã có.
-- Số 0050: 0044–0049 đã được điều phối giữ chỗ cho các nhánh khác (xem docs/CHANGE-GUIDE.md công thức d).
--
-- tl_luot_hoi — MỘT dòng cho MỖI câu hỏi đã tới bước gọi (kể cả lỗi và chạm trần). KHÔNG có cột nội dung câu hỏi / câu trả lời (ADR-0066 điều 7;
--   src/migrations-tro-ly.test.ts ghim đúng tập cột). Chỉ thêm: trigger chặn UPDATE / DELETE.
--   staff_id           người hỏi (id tài khoản). KHÔNG khoá ngoại: module tro-ly không phụ thuộc module nào (ALLOWED_EDGES rỗng); chỉ dùng để đếm trần ngày.
--   ngay_vn            ngày dân sự giờ Việt Nam (YYYY-MM-DD) của lúc hỏi — trần ngày đếm theo cột này, trần tháng cộng theo tiền tố YYYY-MM.
--   token_vao / token_vao_dem / token_ra   số token OpenAI báo trong `usage` (vào, phần vào đã đệm, ra kể cả token suy luận); 0 khi không gọi được.
--   chi_phi_micro_usd  chi phí tính ở MÁY CHỦ = usage × giá hằng trong mã (src/shared/tro-ly.ts), đơn vị micro-USD, làm tròn LÊN.
--                      NGOẠI LỆ CÓ TÊN với luật "tiền = INTEGER VNĐ" (ADR-0066 điều 6): đây là chi phí dịch vụ ngoài, không phải tiền nghiệp vụ.
--   ket_qua            ok | het_tran | loi — tập đóng do ADR-0066 điều 7 quyết (bất biến nên dùng CHECK).
--   created_at         lúc hỏi (ISO UTC). created_by = updated_by = người hỏi; updated_at = created_at (bảng chỉ thêm).
--
-- tl_cai_dat — cài đặt bật/tắt + trần, "bản có hiệu lực" chỉ thêm: bản hiện hành = dòng có valid_from_at lớn nhất (hoà thì created_at, id).
--   Chỉ Toàn quyền thêm bản mới (ô settings.ops, route POST /api/tro-ly/cai-dat). Dấu vết = created_by/created_at trên chính dòng (Hiến chương 5.5).
--   Gieo MỘT bản: bật, trần tháng 5 USD = 5.000.000 micro-USD, trần 30 câu / người / ngày (chủ dự án 2026-09-30).
CREATE TABLE tl_luot_hoi (
  id                TEXT PRIMARY KEY,
  staff_id          TEXT NOT NULL,
  ngay_vn           TEXT NOT NULL CHECK (ngay_vn GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  token_vao         INTEGER NOT NULL DEFAULT 0 CHECK (token_vao >= 0),
  token_vao_dem     INTEGER NOT NULL DEFAULT 0 CHECK (token_vao_dem >= 0),
  token_ra          INTEGER NOT NULL DEFAULT 0 CHECK (token_ra >= 0),
  chi_phi_micro_usd INTEGER NOT NULL DEFAULT 0 CHECK (chi_phi_micro_usd >= 0),
  ket_qua           TEXT NOT NULL CHECK (ket_qua IN ('ok', 'het_tran', 'loi')),
  created_at        TEXT NOT NULL,
  created_by        TEXT,
  updated_at        TEXT NOT NULL,
  updated_by        TEXT
);
CREATE INDEX tl_luot_hoi_nguoi_ngay ON tl_luot_hoi (staff_id, ngay_vn);
CREATE INDEX tl_luot_hoi_ngay ON tl_luot_hoi (ngay_vn);

CREATE TRIGGER tl_luot_hoi_no_update BEFORE UPDATE ON tl_luot_hoi
BEGIN SELECT RAISE(ABORT, 'tl_append_only: lượt hỏi trợ lý chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER tl_luot_hoi_no_delete BEFORE DELETE ON tl_luot_hoi
BEGIN SELECT RAISE(ABORT, 'tl_append_only: lượt hỏi trợ lý không xoá'); END;

CREATE TABLE tl_cai_dat (
  id                   TEXT PRIMARY KEY,
  bat                  INTEGER NOT NULL CHECK (bat IN (0, 1)),
  tran_thang_micro_usd INTEGER NOT NULL CHECK (tran_thang_micro_usd >= 0),
  tran_ngay            INTEGER NOT NULL CHECK (tran_ngay >= 0),
  valid_from_at        TEXT NOT NULL,
  created_at           TEXT NOT NULL,
  created_by           TEXT,
  updated_at           TEXT NOT NULL,
  updated_by           TEXT
);

CREATE TRIGGER tl_cai_dat_no_update BEFORE UPDATE ON tl_cai_dat
BEGIN SELECT RAISE(ABORT, 'tl_append_only: cài đặt trợ lý chỉ thêm bản mới, không sửa'); END;
CREATE TRIGGER tl_cai_dat_no_delete BEFORE DELETE ON tl_cai_dat
BEGIN SELECT RAISE(ABORT, 'tl_append_only: cài đặt trợ lý không xoá'); END;

INSERT INTO tl_cai_dat (id, bat, tran_thang_micro_usd, tran_ngay, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0050', 1, 5000000, 30, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
