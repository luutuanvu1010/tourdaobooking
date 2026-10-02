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
- Task 3: xong — `LoaiTin` thêm `"chuyen"`; `locHopThongBao` nhận `chuyen?: DongChuyen[]` (người nhận = `tinChuyenCho`, luôn `cuaToi`); `ctx.chuyenChoTin` (router + gốc lắp ráp); `hop()` đọc nhật ký chuyến CHỈ khi tài khoản có thể nhận (`trip.view` không ngữ cảnh, hoặc có hồ sơ + `trip.view` assigned). `npm test` 2788/2788 + 1/1.
  Số truy vấn thêm ở `GET /api/thong-bao/tom-tat` (đếm theo mã, chưa đo trên D1 thật): tài khoản không thể nhận tin chuyến (HDV, Đối tác, Thực tập, Tài xế đối tác, Nhân sự, Tài xế chưa hồ sơ) = 0; tài khoản có thể nhận = 1 (nhật ký chuyến 30 ngày) + khi có dòng: 2 (mã chuyến, khoảng lái) + 1 (suất vắng, chỉ khi có tin vắng) + 1 (đơn của suất vắng, chỉ khi có) = tối đa 5.
  Chốt: thêm `KIND_ICON.chuyen = "truck"` và đổi câu `MINE_NOTE` ngay ở Task 3 (kế hoạch để ở Task 6) vì `Record<LoaiTin, IconName>` làm typecheck đỏ khi `LoaiTin` có thêm `"chuyen"` — bề mặt, hai chiều.
  Chốt: bài qua route thật chèn `denGio("06:10")`, `denGio("06:20")` giữa tạo → đổi tài xế → huỷ (đồng hồ giả đứng yên; giờ thật mỗi lệnh khác mili-giây). Không có thì cả ba lệnh cùng mốc ⇒ "dòng lái bao mốc" bao cả tài xế cũ ở mốc huỷ — ca không xảy ra ở giờ thật.
- Task 4: xong — `NHAN_DIEU_XE`, `nhanSuKienChuyen`, `laSuKienChuyenHopLe` (bang-tin.ts); `nhanKetNoi` thêm `dieu-xe` khi `can(trip.view)` không ngữ cảnh; `phatChuyen` (bangtin), `tram.phat` nhận `SuKienDon | SuKienChuyen`; `nguoiNhanDay` / `dayGoCua` nhận `{ chuyen }`; `dongChuyenTheoId` (thongbao); `ctx.baoThayDoiChuyen` (router, lỗi → `bang_tin_loi` viec `bao_chuyen`) + bản thật ở gốc lắp ráp. `npm test` 2792/2792 + 1/1.
  Đột biến (2026-10-02): `nhanSuKienChuyen` thêm `"tat-ca"` → ĐỎ "nhanSuKienChuyen: luôn dieu-xe + nguoi:<tài xế>; KHÔNG BAO GIỜ tat-ca / cho-nhan / noi-bo" → hoàn nguyên → 28/28 xanh.
  Kỳ vọng bài cũ đổi theo ADR-0052 D6.4 (đã duyệt): bảng ảnh chụp theo quyền đơn lẻ (SALES, ACCOUNTING, ADMIN, SUPER_ADMIN thêm `dieu-xe`), bài 1024 tập con (thêm dòng `can(trip.view)`), bài tài khoản lai Đối tác + SALES/ADMIN/SUPER_ADMIN (nay có `dieu-xe` — theo `trip.view` của quyền văn phòng đi kèm; ADR không loại tài khoản lai).
  Ghi chú: bản thật `baoThayDoiChuyen` thoát sớm trong khung thử (không trạm, không khoá VAPID) — phần Bảng tin được kiểm ở e2e `tin-chuyen` (Task 7) trên `wrangler dev` có trạm thật.
- Task 5: xong — 26 route lệnh chuyến gọi `ctx.baoThayDoiChuyen({ tripId, requestId })` SAU nhánh trả lỗi của lệnh, trong khối "lệnh chưa lặp" (tạo: sau vòng thử mã; xếp: sau `if (r.loi) return r.loi`; cập nhật điểm/khách: chỉ khi `r > 0`). Khung thử cho ghi đè `baoThayDoiChuyen` (chỉ để NHÌN lời gọi). `npm test` 2794/2794 + 1/1.
  Đo lại sau Đợt 1 (bản 1.65): 8 route kế hoạch văn phòng (tạo, sửa, xếp, rút, dời, huỷ, cập nhật điểm, cập nhật khách) + 9 route tài xế + 9 route văn phòng bấm thay = **26** (kế hoạch ghi ≥ 27 là đếm nhầm). Bài quét phủ các route Đợt 1 (`…/chuyen/:id/thu-tu`, `…/cuoc-cua-toi/:id/thu-tu`, `…/phan-bo/:aid/don|tra`, `…/phan-bo` có người đi kèm) — có danh sách tên bắt buộc trong bài; ngưỡng `>= 26`; khuôn chặn thêm `if (r.loi) return r.loi`.
  Đột biến (2026-10-02): chuyển lời gọi ở route `huy` lên TRƯỚC `if (r) return r;` → ĐỎ hai bài: "tạo chuyến 201 → 1 lời gọi … (409) → không thêm" (câu "409 / 403 không bắn tin") và bài quét ("POST /api/van-chuyen/chuyen/:id/huy: lời gọi phải đứng sau nhánh trả lỗi của lệnh") → hoàn nguyên → xanh.
  Ghi chú: hai yêu cầu tạo chuyến ĐỒNG THỜI cùng requestId (hiếm) có thể cùng gọi hàm tiêm — gốc lắp ráp đọc sự kiện theo requestId nên chỉ có thể bắn trùng một lần Bảng tin / gõ cửa, không sai người nhận.
