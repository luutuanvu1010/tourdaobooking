# Nhật ký thi công Đợt 3 — chữ do chủ chọn (sau rà soát lần 2)

Kế hoạch: `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` (chủ duyệt 2026-11-09), Phần VI. Nhánh `claude/dot-3-chu-c2d878`, cắt từ `main` `b5785a8d7` (đã chứa Đợt 1). Không migration; số phiên bản tạm **2.84** (main có 2.83 của Đợt 1; giữ chỗ ở sổ chung của nhóm phiên). Chữ: phiếu Phụ lục B, phương án (1) ở mọi mục, trừ hai chỗ dùng dự phòng ghi dưới.

## Các task và commit

| Task | Việc | Ghi chú thi công |
|---|---|---|
| 3.1 | T-02 câu giữ đơn khi thiếu mức | `CAU_THIEU_MUC_DA_CHUP` ở `so-dai-ly-nhan.ts`, `canhBaoThieuMuc(thieu, daChup)`; `lyDoGiuThuongMai` dùng chung hằng (sửa gộp cuối: trước đó chép tay đuôi câu). Bài route 3b ở `da-giao-khe-hoa-hong.test.ts` |
| 3.2 | Q-07 câu khoá vé cho Đối tác | **Dự phòng B-2 (2)** «Vé mở sau khi Công ty ghi nhận bạn đã nộp tiền.»: bài dò chạy thật (giữ thành bài cố định ở `doi-tac-mo-ve.test.ts`) cho thấy `tienDonVe().choNop` gộp cả khoản cọc người khác cầm. `cauKhoaVe` ở `src/shared/ve-cau-khoa.ts` là nơi duy nhất chọn câu, cả 403 lẫn cờ GET `nguoiLapCamTien`. Lệch kế hoạch: không thêm `daHuy` vào `tienDonVe` mà dùng trạng thái đơn `docDonVe` đã đọc (không chạm phân hệ tiền) |
| 3.3 | G-05 màn hẹp Dịch vụ & giá | Bốn commit: công tắc có chữ «Cần kiểm vé» + nguồn (B-4); nhóm có mũi tên, mở sẵn khi một nhóm, câu đếm có tổng vé; Ngừng bán hỏi lại ở cả hai màn (B-5, chữ vào bảng tham chiếu); câu 400 B-6 giữ tiền tố «Dịch vụ N:». Chữ tự viết chờ chủ: «Không có vé cần kiểm (N vé)»; màn đủ đổi «Đặt riêng» → «Đặt riêng cho vé này» (một tên với màn hẹp). Câu `repick` của `service-form.ts` giữ nguyên |
| 3.4 | G-06(a)(b)(c)(e)(f) | Năm commit theo B-9, B-10 (giữ tiền tố «Đang giữ đơn»), B-11 «Ghi đặt gấp» (dòng bảng tham chiếu chuyển `cho-chon` → `da-chot`), B-12, B-13. (c) không có đầu ra ĐỎ ghi lại (dựa vào kỷ luật, P16) |
| 3.5 | G-06(d) tiền Trang chủ (việc lớn) | D2: hai ô «Còn thiếu», «Doanh thu của tôi» ở `renderSoDienThoai` dùng `vnd`. Đo thật bằng Chrome ẩn: số 9 chữ số bị cắt ở 360 (155px > 131px vùng nội dung) ⇒ thêm `container-type` cho `.dash-so-o` và token `--so-gt-cqi` (14cqi) để chữ ô tiền tự co; đo lại 390/375/360 đều vừa. Kịch bản `trang-chu-smoke.mjs` 29/10 thêm phép kiểm tràn so mép vùng nội dung ô |
| 3.6 | G-03(a) câu khi hết phiên | `dauHetPhien(body, coKhungNho)` / `cauTuDauNho(raw)` ở `session-ended.ts`; `goLogin` chặn gọi lặp bằng cờ `dangDi` (tránh lời gọi 401 thứ hai ghi dấu đè). **Câu dự phòng** «Máy này đã bị đăng xuất. Đăng nhập lại để tiếp tục.» thay B-7: bảng từ ADR-0130 cấm chữ «phiên» và cả ba phương án B-7 đều có chữ đó. Gói Đơn hàng +47 byte (110.390 / trần 110.443, không nới) |
| 3.7 | Kiểm cuối | Xem dưới |
| A.0 | `changelog.ts` 2.84 | Số tạm; bước A.0 đặt lại nếu Đợt 2 nhập trước |

Đề xuất «Sửa đổi» cho văn bản đã duyệt (không tự sửa, N9): `docs/superpowers/specs/2026-11-09-de-xuat-sua-doi-dot-3.md` — ADR-0170 Đ2 mục 5, đặc tả 31/10 (B-13), và hai chữ «Duyệt đặt gấp» ở `web/CLAUDE.md`.

## Điều chủ nên biết

- Câu khoá vé dự phòng vẫn chưa thật đúng khi nhân viên khác cầm cọc (người cần nộp là nhân viên đó). Muốn đúng hẳn phải tách phần tiền người lập đang cầm trong `tienDonVe` — chạm phân hệ tiền, cần chủ quyết.
- Trang chủ điện thoại nay có hai kiểu tiền cạnh nhau: ô số viết đủ, dòng «Đang chờ bạn», thẻ đơn, «Việc của bạn» vẫn rút gọn (đúng phạm vi D2).
- Chip «Đã duyệt đặt gấp» và mục «chờ duyệt đặt gấp» còn chữ «duyệt» trong khi nút là «Ghi đặt gấp» (ngoài phiếu B-11).
- Hết hạn đăng nhập mà máy chủ còn nhận ra lý do «Hết hạn» thì vẫn ra câu cũ «Máy này đã bị đăng xuất. Lý do: Hết hạn.»; câu mới chỉ khi cookie đã mất hẳn.
- Ô tiền tự co dùng đơn vị container: iPhone iOS 16 trở lên hiểu; máy cũ hơn bỏ qua dòng đó.
- Hướng dẫn Đối tác đứng đúng trần 30 phút đọc (bài A4): thêm chữ phải cắt chỗ khác.

## Kiểm cuối

- `npm run typecheck`: 0 lỗi.
- `npm test` lượt 1 đỏ 3 bài (bài máy canh Hướng dẫn chưa xem lại; bảng từ cấm «phiên»; bộ v2 chưa sinh lại `bundle.css`) → sửa → lượt 2 **xanh** (8.581 + 1 bài, thoát 0).
- Người kiểm độc lập (`nguoi-kiem-doc-lap`, cả nhánh, trọng tâm Task 3.5): Task 3.5 **ĐẠT**; cả nhánh KHÔNG ĐẠT vì đúng một mục (bài máy canh Hướng dẫn) — đã sửa ở `8d326ee47`, `npm test` lượt 2 xanh. Bốn lần phá thử đều đỏ đúng chỗ.
- e2e và kịch bản Chrome: (điền sau khi chạy).
