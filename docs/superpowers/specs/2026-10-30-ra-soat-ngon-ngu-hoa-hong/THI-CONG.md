# Thi công rà soát ngôn ngữ trang «Hoa hồng đối tác» — sổ ghi việc (30/10/2026)

> Hồ sơ có ngày. Người thi công ghi lại việc đã làm đối chiếu từng dòng của `RA-SOAT.md` (chủ đã duyệt cả bộ 30/10). Người thi công KHÔNG tự nghiệm thu; việc chữ: test xanh + ảnh thật, chủ xem một lượt. Chỉ đổi CHỮ: không đổi hành vi, route, dữ liệu, quyền, mã nút nội bộ (`data-*`, id, hàm), hành động nhật ký.

## Bảng A — nút và hộp

| # | Kết quả | Ghi chú |
|---|---|---|
| A1 | Đã làm | Nút ở thẻ loại: «Chọn cấp cho loại này» (cả `aria-label` và tên dòng của menu chọn cấp) |
| A2 | Đã làm | Nút ở chi tiết cấp: «Thêm loại vào cấp này» |
| A3 | Đã làm | Tiêu đề hộp «Chọn cấp cho loại» khi mở từ thẻ loại, «Thêm loại vào cấp» khi mở từ cấp (cùng một hộp, chọn theo nơi bấm); nút xác nhận «Lưu» |
| A4 | Đã làm | «Loại «Y» đã theo cấp «X» từ ngày …» |
| A5 | Đã làm | Nút/mục menu «Thôi theo cấp này»; hộp: tiêu đề «Thôi theo cấp này», câu «Loại «Y» thôi theo cấp «X» đến hết ngày:», nút «Lưu». «Ngừng áp dụng» của cấp riêng của đối tác (hộp ở trang Hoa hồng và nút ở Danh bạ) giữ nguyên vì bảng chỉ nói cấp của loại; «Ngừng» của mức giữ nguyên |
| A6 | Đã làm | «Loại «Y» đã thôi theo cấp «X».» |
| A7 | Đã làm | «Chọn cấp riêng cho đối tác» (hai nút + tiêu đề hộp + `aria-label`); nút xác nhận «Lưu» |
| A8 | Đã làm | «Đổi cấp» giữ; nút xác nhận trong hộp đổi cấp của loại và đổi cấp riêng thành «Lưu» |
| A9 | Đã làm | «＋ Thêm hoa hồng cho dịch vụ» (tiêu đề hộp cùng chữ) |
| A10 | Đã làm | Tiêu đề hộp «Thêm mức hoa hồng» (nút xác nhận «Thêm mức» và «Đổi mức», «Sửa mức», «Lưu sửa» giữ) |
| A11 | Đã làm | «Khoá cấp» / «Mở lại cấp» giữ; câu xác nhận viết lại (C3) |
| A12 | Đã làm | «Thao tác khác: …» (`aria-label` của nút «⋯» và tên dòng menu) |
| A13 | Đã làm | Cột «Thao tác» (chữ ẩn cho trình đọc) |

## Bảng B — nhãn

B1 «Hoa hồng của cấp theo dịch vụ», B2 «Loại đối tác đang theo cấp này», B3 «Hoa hồng riêng của loại», B4 «Thời gian áp dụng» (cột và nhãn các hộp), B5 «Từ ngày» / «Đến ngày», B6 «Kiểm tra hoa hồng» (nút, tiêu đề hộp, `aria-label`, tiêu đề khối, mọi câu có nhắc), B7 «Xem mức này ↓», B8 «Đã thay bằng mức mới», B9 «Không có mục nào khớp bộ lọc.» và «Không thấy mục này trên trang — tải lại trang.», B10 «Hai mức khác nhau»: đều **đã làm**. B11 giữ như bảng.

## Bảng C — câu dài

C1, C3, C4, C5, C6, C7, C9: đã làm đúng chữ của bảng (hằng trong `src/shared/hoa-hong-hien-thi.ts`). C8, C10: giữ như bảng.
C2: máy chủ (`kiemDoi`, `src/modules/pricing/rules.ts`) vẫn chặn đổi cấp khi cấp cũ bắt đầu từ hôm nay (cấp mới chỉ từ ngày mai), nên **giữ** câu bổ sung: «Mỗi loại chỉ theo một cấp tại một thời điểm. Muốn chuyển sang cấp khác, bấm «Đổi cấp» và chọn ngày bắt đầu. Cấp vừa chọn hôm nay thì chỉ đổi được từ ngày mai.» Hằng `CAU_DOI_MUC_TRONG_NGAY` hiện chỉ bài kiểm dùng, không màn nào hiện (có từ trước, không đổi).

Chỗ chữ bảng ngắn hơn chữ cũ (đã theo bảng, nêu để chủ biết):
- C1 không còn câu «Đối tác có cấp riêng thì không xét cấp của loại.» (bảng không có). Hộp «Đặt cấp riêng» vẫn có câu tương tự ở `CAU_DAT_CAP_RIENG`.
- C4 không còn cụm «(hoặc loại khác mà cùng đối tác đang mang)».
- C7: giữ câu cuối «Muốn biết mức chắc chắn: dùng «Kiểm tra hoa hồng».» (bảng cắt ở «nếu có.»; giữ để cùng ý với C1).
- C3 và C9: bảng dùng gạch đầu dòng; mã hiện hộp là một đoạn chữ, nên viết thành câu liền nối bằng dấu chấm phẩy (không đổi ý).

## D — Trợ giúp (mục «Cấp đại lý» của Kế toán, `src/shared/huong-dan-ke-toan.ts`)

Đã thay: [[＋ Thêm hoa hồng cho dịch vụ]], [[Chọn cấp cho loại này]] / [[Thêm loại vào cấp này]], [[Thôi theo cấp này]], [[Chọn cấp riêng cho đối tác]]; hai chỗ «Tra nhanh» ở mục «Đặt mức hoa hồng cho đối tác» thành «Kiểm tra hoa hồng». Trần 30 phút đọc (Phần chung 9 + Kế toán 21) bị vượt 1 phút sau khi thay, nên rút 6 từ thừa (ví dụ «ở đầu trang» thành «đầu trang», bỏ «ấy», bỏ «hoặc, ở cấp,»); không thêm câu. Bài `src/shared/huong-dan.test.ts` xanh (A2 mọi [[nút]] còn nguyên văn trong mã).

## E — việc kèm theo

- Bảng từ (`src/shared/bang-tu-giao-dien.ts`): thêm mục «Lượt 7» cấm «Áp dụng cấp cho loại» và «Ngừng áp dụng cấp ‹tên›», `thay` + `nguon: "chủ 2026-10-30 (rà soát ngôn ngữ Hoa hồng)"`; sửa dòng lượt 3. Mẫu cấm hẹp để không vướng nhãn nhật ký («Ngừng áp dụng cấp đại lý cho loại»…), nút «Ngừng áp dụng» của cấp riêng ở Danh bạ và câu máy chủ «ngừng áp dụng cấp cũ trước». **Nới luật lượt 3**: «riêng của loại» được phép khi đứng sau «hoa hồng» (B3 «Hoa hồng riêng của loại» đụng luật cũ cấm «riêng của loại → Mức riêng»; bảng đã duyệt nên nới đúng chỗ đó).
- Sổ hàng rào: thêm một dòng (`docs/SO-HANG-RAO.md`, bảng từ lượt 7), đã quan sát chặn thật 30/10 (đưa «Áp dụng cấp cho loại» vào nút ⇒ bài đỏ, hoàn nguyên ⇒ xanh).
- Bài đỏ trước, xanh sau: `src/shared/hoa-hong-hien-thi.test.ts` sửa kỳ vọng sang chữ mới trước (8 bài đỏ), sửa mã ⇒ xanh 53/53.
- Kịch bản Chrome `hoa-hong-smoke.mjs`: đổi nhãn tìm nút/hộp, các câu ghim chép lại, câu «đã theo cấp»; thêm 2 bước chụp hộp «Chọn cấp cho loại» và «Thôi theo cấp này» (không ghi dữ liệu); danh sách nút ghi của Bán hàng thêm ba nút mới.
- Nhật ký thay đổi: mục 2.50 (số tạm, kiểm lại ở bước A.0 khi phát hành). `app-info.test.ts` sửa theo.
- `web/CLAUDE.md` dòng Hoa hồng: không nhắc chữ cũ, **không cần đề xuất sửa**.

## Nợ và điều chưa chắc

- Nhãn «Ngày cuối hiệu lực» (ô ngày cuối của hộp Ngừng/Sửa) còn chữ «hiệu lực»; bảng B4 chỉ nói cột và nhãn «Hiệu lực» nên không đổi. Đề xuất: «Ngày cuối áp dụng» nếu chủ muốn nhất quán.
- Cấp riêng của đối tác còn «Ngừng áp dụng» (hộp, menu, nút ở Danh bạ), trong khi cấp của loại đã là «Thôi theo cấp này»: hai chữ khác nhau cho việc tương tự; bảng không nêu.
- Thông báo cấp riêng («Đã đặt cấp riêng …», «Đã ngừng cấp riêng …») và tiêu đề «Sửa áp dụng cấp» chưa đổi vì không có trong bảng.
