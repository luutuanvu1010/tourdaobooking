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

## Quyết định phiên điều phối tự đưa ra (chủ sửa được)

| Quyết định | Vì sao | Nếu sai thì mất gì |
|---|---|---|
| Phương án (1) ở mọi mục phiếu B, kể cả chữ mới vào bảng tham chiếu: «Ngừng bán ‹tên›?», «Không ngừng», «Ghi đặt gấp» / «Đang ghi…» | Chủ duyệt 9/11 «phương án (1) cho tới khi chủ nói khác» | Đổi chữ một dòng mỗi chỗ |
| Câu khoá vé dùng dự phòng B-2 (2) | Bước dò của kế hoạch thấy số chờ nộp gộp cọc người khác cầm | Ca hiếm vẫn đọc câu chưa thật đúng (xem dưới) |
| Không thêm `daHuy` vào `tienDonVe`, dùng trạng thái đơn đã đọc | Tránh chạm phân hệ tiền; hành vi như kế hoạch | Thêm sau nếu cần |
| Ô tiền Trang chủ điện thoại tự co chữ (container query qua token) | Số 9 chữ số bị cắt ở khổ 360 khi viết đủ | Chữ số tiền nhỏ hơn 22px một chút; bỏ hai dòng CSS là hoàn tác |
| Câu hết hạn đăng nhập tự viết (C-1 ở tệp đề xuất), không theo B-7 | Bảng từ ADR-0130 cấm «phiên», cả ba phương án B-7 đều có | Chủ chọn câu khác, đổi một hằng |
| Sửa dữ liệu thử kịch bản Chrome (vai đối tác ADR-0185), không nới `scripts/staff-lib.mjs` | Không sửa thì sáu kịch bản chết lúc dựng | Hoàn tác ba commit kịch bản |
| Số phiên bản tạm 2.84, giữ chỗ ở sổ chung nhóm phiên | Main có 2.83 | Đánh lại khi gộp nếu Đợt 2 nhập trước |
| Chạy song song trợ lý thi công với người soát của task trước khi tệp không giao nhau | Rút thời gian | Commit xen kẽ (không xảy ra) |

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
- Người kiểm độc lập (`nguoi-kiem-doc-lap`, cả nhánh, trọng tâm Task 3.5): Task 3.5 **ĐẠT**; cả nhánh KHÔNG ĐẠT vì đúng một mục (bài máy canh Hướng dẫn) — đã sửa ở `8d326ee47`, `npm test` lượt 2 xanh. Bốn lần phá thử đều đỏ đúng chỗ. Lượt kiểm lại phạm vi sau mục nhật ký 2.84 (dấu vân, câu hết hạn đăng nhập, `bundle.css`, sửa dữ liệu thử kịch bản): mã chạy thật đạt, hai lần phá thử đỏ đúng chỗ; một mục Important ở dữ liệu thử `cot-cap-smoke` — đã trả về như cũ (xem dưới). Lượt kiểm lại không chạy Chrome.
- `npm test` lượt 3 (sau các sửa kịch bản): xanh. `phien.mjs` chạy lại trên bản có `startEnv` mới: xanh 8/8.
- e2e: **89/89 xanh**.
- Kịch bản Chrome (có `AXE_JS`) xanh trên phần Đợt 3 đổi: `ql-ban-hang-smoke` 390 + 1040 (màn Dịch vụ cần kiểm vé, Ngừng bán hỏi lại), `danh-muc-nhom-smoke`, `phien.mjs` (ca 1b: xoá cookie → trang đăng nhập có câu; liên kết sâu khi máy chưa có bản nhớ khung → không câu). `xac-nhan-smoke` xanh 8/9 bước, gồm câu chờ kiểm vé mới; bước 3b đỏ sẵn (nút «Xem biên nhận» đã đổi tên 5/11).
- Ô tiền Trang chủ ở khổ 390/375/360: đo bằng Chrome ẩn trên trang tĩnh dùng `public/app.css` thật (không phải bằng `trang-chu-smoke`, vì kịch bản đó đỏ sẵn ở bước đếm mục thanh bên — 27 mục so với 26 — trước khi tới khổ 390).
- **Kịch bản đỏ, nhận định là đỏ sẵn, không do Đợt 3** — nhận định **suy từ diff** (bước đỏ không chạm tệp Đợt 3 đổi), **chưa đối chiếu bằng chạy trên bản main**; một phần đã có ở `docs/BACKLOG.md` mục 67: `trang-chu-smoke` 29/10, `dot-a-smoke` (/audit), `dot-c-smoke` 30/10 (thứ tự khối trang Tôi), `v1-dang-nhap` 29/10 bước g (đã ghi sẵn) và h (tương phản `#submit-label` lúc lỗi — `login.html` và phần CSS đó không đổi), `the-gap-smoke` (chip «Chưa chọn đón» của Đợt 1; Đợt 3 chỉ đổi chú thích `web/order-form.ts`), `so-dai-ly-smoke` (đếm dòng thiếu mức theo lớp, không theo chữ), `doi-tac-ve-smoke` (`chua_co_ve` lúc dựng dữ liệu), `dat-gap-smoke` (404 lúc dựng đơn), `luot-2-smoke` (Kế toán không xét duyệt xác nhận), `hoa-hong-smoke` (còn chữ «Đã giao»).
- Sáu kịch bản trên ban đầu chết ngay lúc dựng vì tài khoản Đối tác thử thiếu vai đối tác (ADR-0185, đã lên 8/11). Đã sửa phần dữ liệu thử của chín tệp kịch bản và hai thư viện (`bf63f18ed`, `7e3442f9c`, `ddaf90892`); `scripts/staff-lib.mjs` giữ nguyên. Người kiểm độc lập bắt một chỗ sửa sai: `cot-cap-smoke` có tài khoản CỐ Ý «chưa có vai», gắn vai thì mất ca đó ⇒ đã trả về như cũ (kịch bản này lại dừng lúc dựng như trên bản chính; cần đường gieo kiểu cũ cho Đối tác thuần). `doi-tac-ve` bỏ nhóm tài khoản lai cho gọn; thật ra tài khoản lai kèm vai đối tác vẫn gửi đơn được, nên ca giao diện 8a/8b (nút «Sửa số khách dịch vụ» trên đơn của tài khoản lai) tạm mất phủ Chrome; ca câu khoá vé của tài khoản lai vẫn có bài route phủ. Các bước đỏ còn lại cần một đợt dọn kịch bản riêng.
- **Hệ quả:** câu thiếu mức hoa hồng (3.1), câu khoá vé (3.2), nút «Ghi đặt gấp» (3.4c) và «Tạo trước 31/10/2026 — không rõ người tạo» (3.4f) **chưa được nhìn bằng Chrome**; chúng được khoá bằng bài thuần, bài route, e2e và người kiểm độc lập. Chưa thử iPhone thật.

## Gộp lại sau khi vé Tour Đảo Đợt 2 lên trước (2026-11-09, tối)

- Chủ triển khai bản 2.84 nhưng đó là vé Tour Đảo Đợt 2; Đợt 3 chưa nhập (kiểm `git merge-base --is-ancestor` với cả `main` máy và `origin/main` = 8836f959c). Chủ ra lệnh «gộp».
- Gộp `main` vào nhánh. Bốn chỗ vướng: `src/modules/ve-dien-tu/index.ts` (import: giữ `cauKhoaVe`, `ngayNgan`, bỏ hai hằng câu Trả sau mà mã Đợt 3 không còn dùng), `src/shared/changelog.ts` (mục Đợt 3 đổi số tạm **2.85**, đặt trên 2.84 của vé), `src/shared/huong-dan-dau-van.ts` (lấy của main rồi `huong-dan:xem-lai` cho `kho-ve` và `doi-chieu-ve` — hai bài chỉ vướng vì `ve-dien-tu/index.ts`/`web/ve-don.ts` đổi câu khoá vé, nội dung bài không nhắc câu đó), `docs/BANG-THAM-CHIEU.md` (sinh lại bằng `npm run tham-chieu`).
- Kiểm sau gộp: xem mục ngay dưới.
