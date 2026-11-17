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
- **P4b** (sau kiểm độc lập Task 4, 16/11): tài khoản giữ quyền Đối tác (thuần và lai) gửi khoá `phiDon` dưới BẤT KỲ giá trị nào, kể cả `null`, ⇒ 400 `transfer_fee_not_allowed` ở mọi đường dùng `coPhiDonTrongThan` (tạo, lưu nháp, sửa chuyến, sửa chặng, Gửi đơn, Còn vé). Lý do: `null` = «bỏ chọn» trên nháp, nhận nó từ Đối tác là cho họ xoá mức văn phòng đã chọn. Giao diện Đối tác / lai không gửi khoá (`coOChonPhi` = phí áp và không form gọn — `formGonDoiTac` theo `holdsPartner`; Còn vé không ô phí cho người giữ quyền Đối tác) nên không vỡ giao diện. Sai thì: một đường Đối tác nào đó gửi `null` sẽ nhận 400.
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

**Kịch bản Chrome cũ (vòng sửa 1 Task 6):** `phi-don-don-smoke.mjs` (đơn lập kèm `phiDon`, nhãn dòng không còn khu vực, câu nhắc Cấp độ đại lý ẩn) và `phi-don-smoke.mjs` (câu ADR-0214, đặt ngày áp khi bảng trống, kết thúc mức chung cuối lúc đang áp lưu được) đã sửa theo luật mới, cả hai xanh có `AXE_JS`. `xac-nhan-smoke.mjs` 8/9: bước 3b đỏ từ trước vì chờ nút «Xem biên nhận» đã đổi tên (không liên quan phí, không sửa). Đề xuất dòng mới ở bảng kịch bản của `web/CLAUDE.md` (tệp luật — chủ duyệt).

**Vòng sửa 2 (bài canh chữ nguồn đỏ ở `npm test` đủ bộ):** `src/form-dat-ve-noi-day.test.ts` — bài (a) đếm hai lời gọi `tomTatChang(…, o.anGio === true)`; nay tóm tắt đi qua hàm bọc `tomTatCoPhi` (một lời gọi, vẫn truyền anGio) nên bài khẳng định MỌI lời gọi truyền anGio và cả chỗ dựng lẫn chỗ vẽ lại đi qua hàm bọc (đột biến bỏ anGio trong hàm bọc ⇒ đỏ, hoàn nguyên ⇒ xanh); bài công tắc ẩn khách nhận `layPhiAp` trong cùng `Promise.all` và thêm khẳng định chỉ đọc công tắc một lần. `src/doc-dong-tien-phi-don.test.ts` — bảng tham chiếu nay nhắc `order_item` hai lần (thêm `order_item.fee_choice` ở «Phí đưa đón»): BỎ QUA, chữ cho người đọc.

## Task 7 — bộ kiểm đủ, hàng rào, người kiểm độc lập (16/11/2026, điều phối ghi)
- Sổ vàng cũ `golden/phi-dua-don.json`: `_mo_ta` ghi không còn là luật của đơn; bài lớp 3 cũ chỉ gọi hàm thuần của «Thử tra», không chạy đường đơn ⇒ giữ (`512b483a2`).
- Hàng rào chặn thật (P16), ghi ở `docs/SO-HANG-RAO.md`: bỏ cổng «chưa chọn» ⇒ 7 bài đỏ gồm SV-PC-09; bỏ kiểm Đối tác ⇒ bài 400 đỏ; cho mọi mức «Danh sách» lọt `kiemMucChon` ⇒ 4 bài đỏ, lớp hai là trigger `0173` (500 thay vì 400); trigger `0173` (Task 1, 4 đột biến); P4b trả lại `v !== null` ⇒ bài P4b đỏ.
- `npm run typecheck`: 0 lỗi (ở `edc869797`).
- `npm test`: lần 1 ở `512b483a2` 9.582/9.589, 3 đỏ (bài canh chữ nguồn đổi vì giao diện Task 6) → sửa `be1d59b4c`; lần 2 ở `be1d59b4c` 9.585 đạt, 0 đỏ; lần 3 ở `edc869797` (sau P4b) 9.587 đạt, 0 đỏ, thoát 0.
- `npm run test:e2e` (ở `512b483a2`; sau đó chỉ đổi bài và `coPhiDonTrongThan`): 97/97 kịch bản xanh, kèm `audit-invariants` trên dữ liệu gieo. Sau P4b chạy lại `phi-don-don`, `phi-don-xac-nhan`, `gui-don`: 6/6 xanh.
- `node scripts/audit-invariants.mjs --db local`: D1 local vừa migrate còn rỗng ⇒ chỉ R-N1-5 «còn ít nhất một quản trị viên» vi phạm (CSDL không có tài khoản nào), không do mã; mọi bất biến phí (R-ORD-PD-*) đạt.
- Người kiểm độc lập (`nguoi-kiem-doc-lap`, chỉ đọc, bản sao riêng): lần 1 ở `be1d59b4c` ĐẠT CÓ ĐIỀU KIỆN (V1 Đối tác gửi `null` xoá được mức; V2 thiếu bài Gửi đơn với dòng bảng phí cũ) → sửa `edc869797` (Ruling P4b: tài khoản giữ quyền Đối tác gửi khoá `phiDon`, kể cả `null` ⇒ 400; bài V2) → lần 2 ở `edc869797` **ĐẠT**. Còn Thấp: lỗi mạng ở `GET /api/orders/phi-don-ap` làm ô phí ẩn tạm (máy chủ vẫn chặn); tham số `vungDon` thừa ở pricing.
- Route mới ngoài kế hoạch `GET /api/orders/phi-don-ap` (chỉ đọc, gác `order.create`, trả một giá trị đúng/sai) — điều phối chấp nhận (Ruling T6-a), báo chủ.

## Nợ kỹ thuật
- Dịch vụ toàn em bé (không khách trả tiền) không có dòng phí ⇒ mức chọn không được lưu; lần sửa sau ô hiện «Chưa chọn», phải chọn lại. Cửa xác nhận buộc có người lớn nên không lọt xác nhận.
- Trigger `SO_KHAC` của `0173` không kiểm số nguyên — máy chủ kiểm (T1-m1).
- Danh sách mức lặp ở ba nơi: `src/shared/phi-don-chon.ts` (nguồn), trigger `0173` (có bài so khớp), `tests/e2e/lib-phi-don.mjs` (chú thích nguồn).
- Biểu mẫu khôi phục sau hết phiên (ADR-0192) chưa giữ lựa chọn phí đang gõ dở: lượt đã lưu quay về mức đã lưu, lượt mới về «Chưa chọn».
- Hai dịch vụ cùng chiều có hai dòng phí cùng nhãn «Chiều đi» trên trang đơn (dòng không nêu tên dịch vụ).
- Bảng Còn vé ghi «Tổng» của đơn chưa gồm phí người xét sắp chọn (phí chỉ tính lúc xác nhận).
- Tài khoản lai Đối tác + Bán hàng xét đơn còn lượt thiếu phí: nút «Còn vé, xác nhận đơn» bị khoá, chỉ câu nhắc (vòng sửa 1); chưa kiểm bằng trình duyệt (khó dựng: tài khoản giữ PARTNER chỉ mở đơn của chính mình).
- «Thử tra» ở màn Quản trị khi thiếu mức vẫn nói «… nên đơn như vậy không xác nhận được.» — câu cũ của bảng mức, nay không còn đúng với đơn (chữ cần chủ chọn).

## Gộp main lần cuối (16/11, tối)

- Gộp `origin/main` 519c3652a (ADR-0215, ADR-0216 đề xuất) vào nhánh, lần lưu gộp 57c4f028c. Hai chỗ trùng gộp cả hai bên: mục lục `docs/adr/README.md` (dòng 0214 rồi 0215, 0216; số kế tiếp 0217) và `docs/SO-HANG-RAO.md` (bốn dòng phí đưa đón chọn + hai dòng ADR-0215).
- Theo ADR-0215 Đ3: bỏ 19 ảnh `docs/evidence/2026-11-phi-don/*.png` khỏi kho (`git rm --cached`), ảnh vẫn trên máy và đã bị `.gitignore` chặn.
- Kiểm sau gộp: `npm run typecheck` 0 lỗi; 63 tệp bài chạm vùng gộp (sổ hàng rào, mục lục ADR, `docs/evidence`, `release-lib`, `kiem-phan`, `changelog`, `audit-invariants`) 1101/1101 đạt. Bộ `npm test` đủ trước gộp (fb42b1363): 9587 đạt, 0 đỏ. Không chạy lại `npm test` đủ sau gộp vì phần gộp chỉ chạm kịch bản phát hành và tài liệu; `day-len` sẽ chạy lại toàn bộ.
