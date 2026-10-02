# Nhật ký thi công — Vận chuyển Đợt 2: Tin báo + Bảng tin khi chuyến xe đổi (ADR-0052 D6)

Kế hoạch: `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-02-tin-bao-chuyen.md`. Lộ trình mẹ: `…-00-lo-trinh.md`.
Nền: `origin/main` = `992f7cbe` (fetch + merge 2026-10-02: "Already up to date"). Migration điều phối cấp: **0070**. Phiên bản tạm: **1.69**.

## Câu "Cần chủ" — điều phối đã chốt (chủ không trả lời, dùng mặc định)
- Câu 1 (câu chữ 6 loại tin): dùng đúng bản đề xuất.
- Câu 2 (tài xế nhận chuông khi văn phòng xếp/rút/dời khách): phương án (a) — không chuông, chỉ màn tự tải lại (đúng ADR).
- Câu 3 (MQ-07): phương án (a) — tách sang lát sau.

## Sổ task

- Task 1: xong — hàm thuần `src/shared/tin-chuyen.ts` + loại sự kiện Bảng tin chuyến ở `src/shared/bang-tin.ts`; 13 bài.
  Đột biến (P16, 2026-10-02): xoá dòng `if (!can(n, "trip.view")) return null;` → ĐỎ 2 bài: "khách vắng → người lập / người phụ trách CÓ trip.view; HDV, Đối tác, Thực tập (không trip.view) không" và "mọi tập con quyền × mọi hành động: nhận ⇒ qua can(trip.view)…" (AssertionError) → hoàn nguyên → 13/13 xanh.
- Task 2: xong — `migrations/0070_tin_chuyen.sql` (chỉ VIEW `v_aud_trip_event`), `suKienTheoYeuCau` + `chuyenChoTinTheoId` (van-chuyen, xuất cho gốc lắp ráp), `listTinChuyen` / `tinChuyenTheoId` / `donChoTin` (thongbao), từ điển dữ liệu, bài siết nơi gọi. `npm test` 2784/2784 + 1/1 xanh.
  Đột biến bài siết (2026-10-02): thêm dòng `export const _dotBien = () => chuyenChoTinTheoId;` vào `src/modules/thongbao/index.ts` → ĐỎ "ADR-0052 D6.3 (siết): chỉ gốc lắp ráp … nhắc `suKienTheoYeuCau` / `chuyenChoTinTheoId`" → hoàn nguyên → xanh.
  Chốt: bài "v_aud_trip_event … mỗi lệnh một dòng" so KHÔNG theo thứ tự — đồng hồ giả đứng yên nên tạo + xếp cùng mốc (thứ tự `ORDER BY created_at` không xác định) — sai thì chỉ mất kiểm thứ tự, vốn không phải điều kiện của view.
  Chốt: `loaiCho` xét "dòng lái ĐÓNG đúng mốc" (go_lai) TRƯỚC "dòng MỞ đúng mốc" (xep_lai) — kế hoạch viết ngược; chỉ khác nhau khi một dòng mở rồi đóng cùng mili-giây (đồng hồ giả của khung thử), lúc đó "không còn lái" mới đúng. Sai thì tốn: một tin sai loại trong ca không xảy ra ở giờ thật.
