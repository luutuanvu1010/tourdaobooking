-- Module: tro-ly — bộ não tuỳ biến của trợ lý Hỗ trợ (ADR-0073, accepted 2026-10-01). Expand: MỘT bảng mới chỉ-thêm + BA cột mới; không đổi / bỏ cột cũ
-- (tl_loi_dan.giong / loi_dan_them thôi hiện trên giao diện nhưng GIỮ dữ liệu — bỏ cột là việc sau, expand–contract).
-- Số TẠM 0060: main đã có 0057_hanh_chinh_nhan_su, nhánh khác giữ 0058–0059 ⇒ ai gộp sau đổi tên tệp lên số lớn nhất lúc gộp + 1 (bài src/migrations-tro-ly-bo-nao.test.ts tìm theo đuôi tên).
--
-- tl_bo_nao — "bộ não" của trợ lý (ADR-0073 Đ1, Đ2), bản có hiệu lực CHỈ-THÊM: bản hiện hành = valid_from_at lớn nhất (hoà thì created_at, rowid = thứ tự chèn;
--   id là UUID ngẫu nhiên nên không dùng để xếp — src/modules/tro-ly/repository.ts).
--   mau             mã mẫu OpenAI trong danh sách đóng DANH_SACH_MAU (src/shared/tro-ly-mau.ts) — tập đổi theo thời gian ⇒ kiểm ở MÃ, không CHECK liệt kê.
--   muc_suy_nghi    reasoning.effort, trong tập mẫu đó hỗ trợ — kiểm ở mã.
--   do_dai          text.verbosity (low | medium | high) — kiểm ở mã.
--   token_ra_toi_da max_output_tokens 800–4000 (CHECK lớp hai sau kiemBoNao; mức high cần ≥ 2000 — kiểm ở mã).
--   loi_nhac        TOÀN BỘ lời nhắc Toàn quyền soạn, 1–12.000 ký tự (CHECK lớp hai); đã qua viPhamChu (không SĐT, email, số tiền) ở máy chủ trước khi ghi.
--   KHÔNG gieo: chưa có bản nào ⇒ máy chủ dùng bản mặc định trong mã + nối "Giọng" / "Lời dặn" đang có ở tl_loi_dan (đặc tả B5).
-- tl_luot_hoi.mau     mã mẫu của lượt (chi phí = token × giá mẫu đó); NULL = lượt trước migration này, hiểu là gpt-5-nano (B8).
-- tl_luot_hoi.la_thu  1 = lượt "Thử key" / ô thử của Toàn quyền: tính vào trần TIỀN tháng, KHÔNG tính trần lượt ngày, không vào số câu thống kê (T3, T6).
-- tl_hoi_dap.cuoc_tro_chuyen  mã ngẫu nhiên của một cuộc trò chuyện (khung Hỗ trợ sinh); máy chủ lấy ≤ 3 lượt trước CÙNG người + CÙNG mã (Đ4). NULL = lượt cũ / không gửi mã.
CREATE TABLE tl_bo_nao (
  id              TEXT PRIMARY KEY,
  mau             TEXT NOT NULL,
  muc_suy_nghi    TEXT NOT NULL,
  do_dai          TEXT NOT NULL,
  token_ra_toi_da INTEGER NOT NULL CHECK (token_ra_toi_da BETWEEN 800 AND 4000),
  loi_nhac        TEXT NOT NULL CHECK (length(loi_nhac) BETWEEN 1 AND 12000),
  valid_from_at   TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
CREATE TRIGGER tl_bo_nao_no_update BEFORE UPDATE ON tl_bo_nao
BEGIN SELECT RAISE(ABORT, 'tl_append_only: bộ não trợ lý chỉ thêm bản mới, không sửa'); END;
CREATE TRIGGER tl_bo_nao_no_delete BEFORE DELETE ON tl_bo_nao
BEGIN SELECT RAISE(ABORT, 'tl_append_only: bộ não trợ lý không xoá'); END;

ALTER TABLE tl_luot_hoi ADD COLUMN mau TEXT;
ALTER TABLE tl_luot_hoi ADD COLUMN la_thu INTEGER NOT NULL DEFAULT 0 CHECK (la_thu IN (0, 1));
ALTER TABLE tl_hoi_dap ADD COLUMN cuoc_tro_chuyen TEXT;
CREATE INDEX tl_hoi_dap_cuoc ON tl_hoi_dap (staff_id, cuoc_tro_chuyen, created_at);
