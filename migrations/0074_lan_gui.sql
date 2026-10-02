-- Migration 0074 — ADR-0094 (accepted 2026-10-02): LỚP CHỐNG GHI TRÙNG CHUNG, bản mở rộng. Module lan-gui (tiền tố lg_). CHỈ THÊM.
-- Dữ liệu KỸ THUẬT, KHÔNG dữ liệu cá nhân: không thân yêu cầu, không thân phản hồi, không SĐT/tên/PIN/số giấy tờ.
--
-- lg_lan_gui — một dòng = một "vé" (Idempotency-Key do máy khách sinh) của một lệnh ghi có đăng nhập. Câu chèn vé đi CUỐI lô ghi đầu tiên thành công
-- của lệnh (ADR-0094 đ2) ⇒ có dòng vé ⇔ lô ghi của lệnh đã thành công. Phạm vi vé là TÀI KHOẢN (staff_id), không phải phiên (đ3).
--   staff_id   tài khoản gửi (không khoá ngoại: bảng kỹ thuật dùng chung mọi module, khuôn cột WHO).
--   khoa       vé do máy khách sinh (16–64 ký tự [A-Za-z0-9-], máy chủ kiểm trước khi chèn).
--   van_tay    HMAC-SHA-256 (khoá LAN_GUI_SECRET của Worker) của phương thức + đường dẫn thật + thân — không dò ngược được nếu không có khoá (đ4).
--   duong      MẪU route, vd "POST /api/orders/:id/payments" — không id, không dữ liệu cá nhân.
--   ma_tra     mã HTTP lần đầu (cập nhật sau, trong waitUntil; NULL = chưa có kết quả). ma_loi: mã lỗi máy khi 4xx (không lưu câu chữ).
--   ket_qua    header Location của lần đầu (đường dẫn nội bộ chỉ chứa id) hoặc NULL.
--   so_lan_lap số lần bị gửi lặp (A-1, tăng mỗi lần phát lại).
--   created_at lúc ghi vé (trong lô nghiệp vụ); updated_at lúc cập nhật kết quả (ban đầu = created_at). created_by/updated_by: cột WHO (ADR-0003 điều 6).
-- KHÔNG xoá cứng ở bản này (R-N1-9 chặn). Đường dọn theo thời hạn (ngoại lệ có tên XOA_CUNG_VE_HET_HAN, Cron) thuộc bản sau (A-11); chỉ mục created_at
-- có sẵn để đường dọn không quét cả bảng.
CREATE TABLE lg_lan_gui (
  staff_id   TEXT NOT NULL,
  khoa       TEXT NOT NULL,
  van_tay    TEXT NOT NULL,
  duong      TEXT NOT NULL,
  ma_tra     INTEGER,
  ma_loi     TEXT,
  ket_qua    TEXT,
  so_lan_lap INTEGER NOT NULL DEFAULT 0 CHECK (so_lan_lap >= 0),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (staff_id, khoa)
) WITHOUT ROWID;
CREATE INDEX lg_lan_gui_created_at ON lg_lan_gui (created_at);

-- lg_chinh_sach_giu — thời hạn giữ vé (ADR-0094 đ8a, khuôn vc_dispatch_policy 0041): dòng hiệu lực = valid_from_at mới nhất ≤ bây giờ; đổi = chèn dòng
-- mới, máy chủ đặt valid_from_at = lúc ghi. CHỈ THÊM (trigger cấm sửa/xoá). so_ngay NULL = "Không dọn". SÀN CỨNG 90 ngày (A-3) ở CHECK dạng khoảng —
-- danh sách lựa chọn (90/180/365/730/Không dọn) kiểm ở máy chủ (bản sau). Gieo 365 ngày (lời chủ 2026-10-02, V1).
CREATE TABLE lg_chinh_sach_giu (
  id            TEXT PRIMARY KEY,
  so_ngay       INTEGER CHECK (so_ngay IS NULL OR so_ngay >= 90),
  valid_from_at TEXT NOT NULL UNIQUE,
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);
INSERT INTO lg_chinh_sach_giu (id, so_ngay, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES
  ('a8f1c2d4-6b0e-4e57-9c3a-0094c0de0365', 365, '2026-10-01T00:00:00.000Z', '2026-10-02T00:00:00.000Z', NULL, '2026-10-02T00:00:00.000Z', NULL);
CREATE TRIGGER lg_chinh_sach_giu_no_update BEFORE UPDATE ON lg_chinh_sach_giu
BEGIN SELECT RAISE(ABORT, 'lg_chinh_sach_giu_chi_them: thời hạn giữ vé chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER lg_chinh_sach_giu_no_delete BEFORE DELETE ON lg_chinh_sach_giu
BEGIN SELECT RAISE(ABORT, 'lg_chinh_sach_giu_chi_them: thời hạn giữ vé không xoá'); END;
