# Nhật ký thi công — Vận chuyển Đợt 3: Lịch xe bận (khung bận) + cảnh báo giờ lái (ADR-0055 VK2-A, VK2-B)

Kế hoạch: `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-03-khung-ban-gio-lai.md`. Lộ trình mẹ: `…-00-lo-trinh.md`. Bản vẽ: `docs/design/van-chuyen-dot-3-7/Quản lý lịch xe bận.dc.html`.
Nền: `origin/main` = `e7cd764f` (fetch + merge 2026-10-02: "Already up to date"). Migration điều phối cấp: **0071**. Phiên bản tạm: **1.71**.

## Lời chủ (2/10 tối, "Đồng ý 18 câu theo khuyến nghị") — áp vào kế hoạch
- 3.1: lưới tuần hiện chuyến đã xếp — chỉ mã `CX-…` + giờ, không mã đơn / tên khách; chuyến KHÔNG lưu vào lịch bận.
- 3.2: lý do chọn từ danh mục `BAN_XE` — không ô gara / tiền sửa (giữ K12: không cột ghi chú).
- 3.3: có ô "Đến ngày".
- 3.4: trang chỉ Quản trị + Toàn quyền (ô `vehicle.manage`).
- Lượt III câu 7 (mã giữ riêng "xe có lịch bận"): chủ không trả lời ⇒ theo đúng chữ ADR-0055 — dùng lại `TRUNG_GIO_XE` kèm chi tiết "lịch xe bận: …".
- Chốt: L6 nhãn chip chung (viên thuốc, độ đậm 800, 12px, ls .04em) — tự chốt bề mặt của lộ trình (điều phối giao).

## Task 0 — nhận việc (2026-10-02)
- Số migration: quét mọi nhánh cục bộ + `origin/*` (`/tmp/dot3-mig.mjs`, `git ls-tree`): có `0069_gd_setting`, `0070_tin_chuyen`, `0072_vc_bang_gia_thue`, `0073_vc_chi_phi_chuyen` (Đợt 4) — **`0071` còn trống**. Mã kiểm định kỳ lớn nhất: R-VC-20 ⇒ **R-VC-21**.
- Đo lại: `kiemTaoSuaChuyen` nay `src/shared/dieu-phoi-kiem.ts:90` (kế hoạch :79), `KiemTaoSuaChuyenVao` :71, `kiemXep` :224; `ChinhSachVao` `dieu-phoi-kieu.ts:123`, `KhungChuyen` :230, `ChuyenVao` :242; `LOAI_CANH_BAO_LICH` `dieu-phoi-lich-chung.ts:44`; `lenhSuaChuyen` `dieu-phoi-lenh.ts:37`, `dungLichNgay` :378; mapper `dieu-phoi-doc.ts:59-77`.
- `ALTER TABLE … ADD COLUMN … NOT NULL DEFAULT 480 CHECK` trên node:sqlite: dòng cũ nhận 480; chèn 10 → "CHECK constraint failed". (D1 local: ghi ở Task 1.)

## Sổ task
- Task 1: xong — <sha1> — `migrations/0071_khung_ban_gio_lai.sql` (bảng `vc_unavailability` đúng hình ADR-0053 D9.1, 7 trigger, nhóm lý do `BAN_XE` 4 mã, 2 cột chính sách ADD COLUMN có DEFAULT), `src/migrations-khung-ban.test.ts` (10 bài), từ điển dữ liệu (+ `npm run dict`). Bài cũ đổi theo: `src/migrations-chinh-sach-dieu-phoi.test.ts` (c) thêm 4 dòng `BAN_XE` vào danh sách lý do gieo, (f) so tên/module/loại của `vc_dispatch_policy` (nay có ghi chú). D1 local: `npm run db:migrate:local` áp 0071 ✅.
  Đột biến P16 (2026-10-02, `KHUNG_BAN_SQL=/tmp/kb.sql`, kịch bản `/tmp/dot3-p16.py`): (a) xoá `vc_trip_unavailable_ins` → ĐỎ TC-K2, TC-K5, TC-K6; (a′) xoá `vc_trip_unavailable_upd` → ĐỎ TC-K2; (b) xoá `vc_unavailability_overlaps_trip` → ĐỎ TC-K1, TC-K5; (c) xoá `vc_unavailability_driver_closed` → ĐỎ TC-K3; (d) xoá `vc_unavailability_withdraw_once` → ĐỎ TC-K3; (e) xoá `CHECK ((subject = 'VEHICLE' …` → ĐỎ TC-K4. Hoàn nguyên → 10/10 xanh.
