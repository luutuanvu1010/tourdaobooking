# Nhật ký thi công — Phí đưa đón do văn phòng chọn (ADR-0214)

Kế hoạch: `docs/superpowers/plans/2026-11-16-phi-don-van-phong-chon.md`. Nguồn luật: ADR-0214 (accepted 16/11), đặc tả `docs/superpowers/specs/2026-11-16-phi-don-nhan-vien-chon.md` (chủ duyệt 16/11), sổ vàng `golden/phi-dua-don-chon.json` (15 ca, chủ xác nhận 16/11). Nhánh `claude/heuristic-turing-a00d98` (worktree `two-factor-auth-expiry-328f96`), gốc `7ecf7a753`. Ghi 16/11/2026 (người thi công Task 6). Mã Đợt C đang có: `docs/superpowers/plans/2026-11-15-phi-don-dot-c-thi-cong-nhat-ky.md`.

## Số migration
- `0173_phi_don_chon.sql` (Task 1). Kiểm 16/11: `main` lớn nhất `0172`; không nhánh chưa gộp nào giữ ≥ `0173`. Nhánh nào gộp trước thì kiểm lại số.

## Mỗi task đã làm gì (commit)
- **Task 1 — lược đồ** (`730d69ea8`): cột `order_item.fee_source`, `fee_choice`; trigger tạo lại (danh sách mức và trần chép trong trigger, bài so khớp `src/migrations-phi-don-chon.test.ts`); thêm hai cột vào trigger khoá cột chụp khi đơn hết nháp.
- **Task 2 — luật thuần** (`b8fd70b27`): `src/shared/phi-don-chon.ts` (`DANH_SACH_PHI_DON`, `TRAN_PHI_DON`, `kiemMucChon`, `tinhPhiChon`, hai câu báo) và lớp 2 của sổ vàng.
- **Task 3 — lưu nháp, sửa chặng nháp** (`dc1f0bbac`, `dde4ca801`, `0ac9f21dd`, `c0b508536`): gỡ chốt «mỗi khu vực phải có mức chung»; thân chặng `phiDon` (khoá vắng = giữ, `null` = bỏ chọn); dòng phí nguồn `CHON`; 400 `transfer_fee_not_allowed` cho tài khoản Đối tác; nhật ký mức; e2e `phi-don-don` viết lại.
- **Task 4 — xác nhận, Còn vé** (`f25ddb131`, `ca446f669`, `80b94c7ef`, `4a1be87d5`, `3d51a8df7`): câu `CHUA_CHON` nêu chiều và dịch vụ; `chuanBiPhiDonXacNhan` dùng mức đã lưu; Còn vé nhận `phiDon: [{ legId, muc }]`; bài cọc, Trả sau, chặng đã đóng; e2e `phi-don-xac-nhan` viết lại.
- **Task 5 — tiền sau xác nhận** (`39be8b38e`, `6ff4d491d`): bài SV-PC-02, 11, 12, 13, 15 (biên nhận, công nợ đại lý, sửa số khách, giảm giá).
- **Task 6 — giao diện, chữ, tài liệu** (`9770be2df`, `d5fb9da2f`, commit tài liệu này): xem mục «Task 6».

## Quyết định của điều phối (ruling) — chép từ sổ điều phối
- **P1:** «đổi `fee_choice` sau xác nhận ⇒ chặn» thực hiện bằng thêm `fee_source`, `fee_choice` vào `order_item_fee_frozen_update` — đúng chữ kế hoạch.
- **P2:** «Đối tác» xác định theo quyền `PARTNER` (kế hoạch nói «theo quyền, không theo vai hồ sơ»); `DRIVER_PARTNER` không lập đơn.
- **P3:** route đặt ngày bắt đầu áp đang đòi «mọi khu vực có mức chung» (ADR-0203 ĐB1) — đặc tả đã duyệt §6 bỏ yêu cầu này, ADR-0214 thay ĐB1 ⇒ gỡ ở Task 3; gỡ cùng cổng «không đóng mức chung cuối» khi đang áp. Sai thì: Quản trị phải nhập bảng vô dụng mới bật được.
- **P4:** 400 `transfer_fee_not_allowed` cho Đối tác áp ở MỌI đường ghi nhận `phiDon` (tạo, lưu nháp, sửa chặng, sửa chuyến, Gửi đơn, Còn vé).
- **P5:** Còn vé: id chặng không phải chặng mở của CHÍNH đơn này ⇒ 400.
- **P6:** lúc xác nhận, dòng phí đã lưu nguồn `BANG_PHI` / không nguồn (nháp Đợt C cũ) ⇒ coi là chưa chọn (409), không bao giờ tự 0.
- **P7:** chọn mô hình cho từng task; kiểm cuối = người kiểm độc lập (thay lượt soát toàn nhánh).
- **T1-m1:** trigger `SO_KHAC` không kiểm số nguyên — máy chủ kiểm `Number.isInteger`; để lại. Sai thì: chỉ chèn thẳng SQL mới lọt.
- **T2-m1:** SV-PC-14 (chưa áp) lớp 1 khẳng định không chặng, tổng 0; công tắc thuộc máy chủ (e2e Task 3). Để lại.
- **T2-m2:** số khách do người gọi truyền từ `payingGuests` (số nguyên). Để lại.
- **T3-m1:** e2e `lib-phi-don.mjs` chép danh sách mức — để lại, có chú thích nguồn. T3-m5 (dịch vụ toàn em bé không lưu mức) — ghi nợ ở đây. T3-m6 — nháp Đối tác không mang mức.
- **T4-c1:** Còn vé giữ cổng hôm nay (`order.confirm.review`), không thêm `order.modify` — ADR-0214 Đ2 «người xác nhận ở cửa Còn vé» thắng chữ kế hoạch. Sai thì: Bán hàng không phụ trách vẫn chọn được phí đơn Đối tác (đúng quyền xét hôm nay).

## Task 6
**Đã làm.**
- Luật ô thuần `src/shared/phi-don-o-chon.ts` (bài cạnh tệp): lựa chọn của ô theo `DANH_SACH_PHI_DON`; đọc «Số khác» CHẶT (chữ số trần hoặc ngăn nghìn đúng nhóm ba: «6.000.000» nhận, «70.5» từ chối — không bỏ dấu chấm rồi đọc thành 705); kiểm bằng `kiemMucChon` nên câu giống câu 400; `mucDaLuuTheoLuot` (máy chủ nay dùng lại: `mucDaLuuTheoChang = mucDaLuuTheoLuot`). Câu Đối tác `CAU_VAN_PHONG_CHON_PHI_DON` dời vào `phi-don-chon.ts`, máy chủ dùng lại.
- **Trường máy chủ tối thiểu:** `GET /api/orders/phi-don-ap` → `{ dangAp }` (cổng `orders`, hỏi `order.create` trước mọi đọc; khai trước `/api/orders/:id`). Lý do: biểu mẫu đơn CHƯA lưu không có DTO nào báo phí đang áp; đơn đã lưu suy được từ `phiDuaDon.thieu` nhưng đơn mới thì không. Bài trong `phi-don-don-route.test.ts`; số route 540 → 541 ở `route-access.test.ts` và `xem-nhu-vai-khong-lo-toan-quyen.test.ts`.
- Biểu mẫu: ô «Phí đưa đón» mỗi lượt (`web/khoi-dua-don.ts`, tuỳ chọn `phiDon`, chỉ form), «Số khác» hiện ô gõ 16px `inputMode="numeric"`; giá trị ô giữ ở `web/order-form.ts` theo khoá lượt, lượt đã lưu chưa đụng tới = mức đã lưu. Có ô ⇒ MỌI lượt gửi `phiDon` (null khi chưa chọn / bỏ chọn); Đối tác (kể cả tài khoản lai) chỉ thấy câu nhắc, không gửi khoá. «Số khác» sai chặn Lưu. Lượt chưa chọn phí mở sẵn; dòng tóm tắt lượt gọn thêm « · Phí <mức>».
- Còn vé (`web/xac-nhan-don-ui.ts` — bảng «Xác nhận đơn» của trang đơn; `web/cho-xac-nhan.ts` chỉ là trang danh sách nên không đổi): ô cho lượt trong `phiDuaDon.thieu`; thiếu / sai thì báo tại chỗ, không gọi máy chủ; 409 `transfer_fee_missing` không tải lại bảng.
- Màn Phí đưa đón: câu «Từ ADR-0214 phí trên đơn do văn phòng chọn; bảng này không còn dùng cho đơn.»; tắt băng «chưa có mức chung» (câu «đơn … không xác nhận được» đã sai từ P3). Bài Hướng dẫn `phi-don` viết lại. Màn Cấp độ đại lý: ẩn câu nhắc «Cấp độ đại lý cũng quyết định mức phí đưa đón» (đã sai).
- Bảng tham chiếu: «Số khác» (đã chốt, ADR-0214 Đ1), «Chưa chọn» (chờ chọn), «Câu báo của ô chọn phí đưa đón» (chờ chọn); sửa nghĩa «Phí đưa đón», «Miễn phí», «dự kiến», hàng «Đặt ngày bắt đầu áp» / «Tắt phí đưa đón».
- Kịch bản Chrome `docs/evidence/2026-11-phi-don/kich-ban/phi-don-chon-smoke.mjs` (8 bước, 1280 + 375, có `AXE_JS`) xanh; ảnh `docs/evidence/2026-11-phi-don/phi-don-chon-*.png`.

**Kịch bản Chrome cũ đỏ từ ADR-0214 (không do Task 6):** `phi-don-don-smoke.mjs` đỏ ở bước dựng (đơn lập không mang `phiDon` ⇒ chưa chọn, tạm tính không gồm phí); `phi-don-smoke.mjs` đỏ ở bước chờ câu «cần một mức chung» (P3 gỡ chốt). `xac-nhan-smoke.mjs` 8/9: bước 3b đỏ vì chờ nút «Xem biên nhận» đã đổi tên từ trước (không liên quan phí). Đề xuất: ghi «thay bằng `phi-don-chon-smoke.mjs`» đầu hai tệp cũ và dòng mới ở bảng kịch bản của `web/CLAUDE.md` (tệp luật — chủ duyệt).

## Nợ kỹ thuật
- Dịch vụ toàn em bé (không khách trả tiền) không có dòng phí ⇒ mức chọn không được lưu; lần sửa sau ô hiện «Chưa chọn», phải chọn lại. Cửa xác nhận buộc có người lớn nên không lọt xác nhận.
- Trigger `SO_KHAC` của `0173` không kiểm số nguyên — máy chủ kiểm (T1-m1).
- Danh sách mức lặp ở ba nơi: `src/shared/phi-don-chon.ts` (nguồn), trigger `0173` (có bài so khớp), `tests/e2e/lib-phi-don.mjs` (chú thích nguồn).
- Biểu mẫu khôi phục sau hết phiên (ADR-0192) chưa giữ lựa chọn phí đang gõ dở: lượt đã lưu quay về mức đã lưu, lượt mới về «Chưa chọn».
- Hai dịch vụ cùng chiều có hai dòng phí cùng nhãn «Chiều đi» trên trang đơn (dòng không nêu tên dịch vụ).
- Bảng Còn vé ghi «Tổng» của đơn chưa gồm phí người xét sắp chọn (phí chỉ tính lúc xác nhận).
