# Rà soát ngôn ngữ trang «Hoa hồng đối tác» — đề xuất chữ mới (30/10/2026)

> Hồ sơ có ngày, do phiên thi công lập sau khi chủ nói: «"Áp dụng cấp cho loại" là một câu rất khó hiểu, không thân thiện — rà soát toàn bộ ngôn ngữ giao diện Hoa hồng đối tác». **Chưa sửa mã.** Chữ cột «Đề xuất» là khuyến nghị; chủ duyệt cả bộ hoặc sửa từng dòng, rồi mới thi công (việc chữ: test xanh + ảnh thật, không cần người kiểm riêng).
> Phạm vi quét: `web/hoa-hong*.ts`, `src/shared/hoa-hong-hien-thi.ts`, `public/hoa-hong.html` (329 chuỗi tiếng Việt) và mục «Cấp đại lý» của Trợ giúp Kế toán. Số dòng chỉ để tìm, sẽ trôi.

## Nguyên tắc dùng để rà
1. Nói việc người dùng làm hoặc điều họ thấy, không nói tên bảng hay cách máy xử lý («áp dụng», «dòng», «phủ», «giữ ở bước»).
2. Một việc một tên: cùng một thao tác không đổi chữ giữa nút, hộp, thông báo.
3. Nút xác nhận trong hộp là hành động chung dễ hiểu («Lưu»), không lặp lại động từ kỹ thuật.
4. Câu giải thích dài tách thành 2–3 câu ngắn; không dùng mũi tên «→» để nói quy tắc.
5. Giữ các tên chủ đã chốt: «cấp đại lý», «cấp riêng», «loại đối tác», «Ngừng nhận đặt» (không thuộc trang này).

## A. Nút và hộp (đổi nhiều người thấy nhất)

| # | Chỗ | Hiện nay | Đề xuất | Vì sao |
|---|---|---|---|---|
| A1 | Nút ở khối loại (chưa theo cấp) `hoa-hong-loai.ts` | Áp dụng cấp cho loại | **Chọn cấp cho loại này** | «Áp dụng… cho loại» là tiếng máy; người dùng chỉ đang chọn cấp |
| A2 | Nút ở chi tiết cấp `hoa-hong-cap.ts` | Áp dụng cấp cho loại | **Thêm loại vào cấp này** | Từ phía cấp, việc làm là thêm một loại vào cấp |
| A3 | Tiêu đề hộp + nút xác nhận `hoa-hong-hop.ts` | Áp dụng cấp cho loại / Áp dụng | Tiêu đề: **Chọn cấp cho loại** (hoặc **Thêm loại vào cấp**, theo nơi bấm); nút: **Lưu** | Đồng bộ A1/A2; «Lưu» ai cũng hiểu |
| A4 | Thông báo sau khi lưu | Đã áp dụng cấp «X» cho loại «Y» từ ngày … | **Loại «Y» đã theo cấp «X» từ ngày …** | Nói kết quả, không nói thao tác |
| A5 | Nút / hộp | Ngừng áp dụng (cấp của loại) | **Thôi theo cấp này** (hộp: «Loại «Y» thôi theo cấp «X» đến hết ngày…»; nút **Lưu**) | «Ngừng áp dụng» dùng cho cả mức lẫn cấp nên mơ hồ. «Ngừng» riêng cho mức giữ nguyên |
| A6 | Thông báo | Đã ngừng áp dụng cấp «X» cho loại «Y». | **Loại «Y» đã thôi theo cấp «X».** | như A4 |
| A7 | Nút | Đặt cấp riêng cho đối tác / Đặt cấp riêng | **Chọn cấp riêng cho đối tác** / **Lưu** | Cùng động từ «Chọn» với A1 |
| A8 | Nút và hộp | Đổi cấp, Cấp mới | giữ **Đổi cấp**; nút xác nhận **Lưu** | Đã rõ; chỉ đổi nút xác nhận cho đồng bộ |
| A9 | Nút chi tiết cấp | ＋ Thêm mức vào cấp | **＋ Thêm hoa hồng cho dịch vụ** | «Mức» đứng một mình không nói là hoa hồng |
| A10 | Hộp thêm mức | Thêm mức / Đổi mức / Sửa mức / Lưu sửa | giữ; tiêu đề đầu thêm chữ «hoa hồng»: **Thêm mức hoa hồng** | rõ đối tượng |
| A11 | Nút khoá | Khoá cấp / Mở lại cấp | giữ tên; **viết lại câu hỏi xác nhận** (mục C3) | Tên ngắn đủ hiểu khi câu giải thích rõ |
| A12 | Menu | Việc khác: … | **Thao tác khác: …** | «Việc» là chữ nội bộ |
| A13 | Cột bảng | Việc | **Thao tác** | như A12 |

## B. Nhãn, tiêu đề, trạng thái

| # | Hiện nay | Đề xuất | Ghi chú |
|---|---|---|---|
| B1 | Mức của cấp | **Hoa hồng của cấp theo dịch vụ** | |
| B2 | Loại đối tác theo cấp này | **Loại đối tác đang theo cấp này** | |
| B3 | Mức của loại | **Hoa hồng riêng của loại** | «mức riêng» là chữ chủ đã chọn 25/10 — giữ «riêng» |
| B4 | Hiệu lực (cột và nhãn hộp) | **Thời gian áp dụng** | «Hiệu lực» là chữ pháp lý |
| B5 | Từ / Đến (ô ngày) | **Từ ngày / Đến ngày** (giữ lựa chọn «không thời hạn») | |
| B6 | Tra nhanh | **Kiểm tra hoa hồng** | tên màn đầu trang |
| B7 | Xem dòng ↓ | **Xem mức này ↓** | |
| B8 | Đã huỷ — thay bằng dòng khác | **Đã thay bằng mức mới** | |
| B9 | Không có dòng nào khớp bộ lọc. / Không thấy dòng này trên trang — tải lại trang. | **Không có mục nào khớp bộ lọc. / Không thấy mục này trên trang — tải lại trang.** | «dòng» là chữ bảng |
| B10 | Xung đột mức | **Hai mức khác nhau** | |
| B11 | Loại có sẵn đi kèm tài khoản đăng nhập của đối tác nên không tắt được. | giữ | đã dễ hiểu |

## C. Câu giải thích dài (viết lại)

| # | Hiện nay (rút) | Đề xuất |
|---|---|---|
| C1 | «Mức nào áp cho một đơn: mức riêng của đối tác → cấp riêng của đối tác → mức riêng của loại đối tác → cấp đại lý của loại. Trong mỗi bước: dịch vụ đó → nhóm dịch vụ → mọi dịch vụ…» | «Khi tính hoa hồng cho một đơn, Nền tảng thử lần lượt: 1) mức riêng của đối tác, 2) cấp riêng của đối tác, 3) mức riêng của loại, 4) cấp của loại. Gặp mức nào trước thì dùng mức đó. Trong mỗi bước, xét dịch vụ đó trước, rồi cả nhóm, rồi mọi dịch vụ. Muốn biết chắc một đối tác: dùng «Kiểm tra hoa hồng».» |
| C2 | «Mỗi loại chỉ theo một cấp đại lý trong một ngày. Muốn đổi sang cấp khác từ hôm nay: ngừng áp dụng cấp cũ đến hết hôm qua, rồi áp dụng cấp mới từ hôm nay. Áp dụng từ hôm nay thì không đổi được trong cùng ngày.» | «Mỗi loại chỉ theo một cấp tại một thời điểm. Muốn chuyển sang cấp khác, bấm «Đổi cấp» và chọn ngày bắt đầu.» (nếu máy chủ còn chặn đổi trong ngày thì thêm: «Cấp vừa chọn hôm nay thì chỉ đổi được từ ngày mai.») |
| C3 | «Sau khi khoá, cấp này không nhận thêm loại hay đối tác nào, không thêm mức mới, và các mức đang có của cấp không Đổi hay Sửa được nữa, chỉ Ngừng được. Các loại và đối tác đang theo cấp này vẫn được tính hoa hồng như cũ. Muốn ngừng chi… dùng Ngừng áp dụng…; muốn chuyển… dùng Đổi cấp.» | «Khoá cấp «X»?» → «Sau khi khoá: • không thêm được loại, đối tác hay mức mới vào cấp; • các mức đang có chỉ Ngừng được, không Đổi hay Sửa; • loại và đối tác đang theo cấp vẫn được tính hoa hồng như cũ. Muốn một loại thôi theo cấp: «Thôi theo cấp này». Muốn chuyển sang cấp khác: «Đổi cấp». Mở lại bất cứ lúc nào bằng «Mở lại cấp».» |
| C4 | «Đã áp dụng cấp đại lý, nhưng loại «Y» … còn N mức riêng đang áp dụng. Mức riêng được ưu tiên hơn cấp đại lý «X». Ngừng các mức riêng này nếu muốn dùng cấp đại lý.» | «Đã lưu. Lưu ý: loại «Y» còn N mức riêng, và mức riêng được dùng trước cấp «X». Muốn dùng hẳn cấp «X», hãy ngừng các mức riêng đó.» |
| C5 | «Đơn của loại này sẽ bị giữ ở bước Đã giao cho tới khi có mức» | «Loại này chưa có hoa hồng cho dịch vụ nào: đơn đã giao sẽ chờ ở bước «Đã giao» tới khi có mức hoặc Kế toán nhập tay.» |
| C6 | «Đối tác chỉ mang loại này, không có mức riêng hay cấp riêng, sẽ bị giữ đơn ở bước Đã giao nếu …» | «Đối tác chỉ thuộc loại này và chưa có mức riêng hay cấp riêng sẽ bị chờ ở bước «Đã giao» nếu đơn xác nhận từ hôm nay có dịch vụ chưa có mức. Đối tác thuộc thêm loại khác có mức thì vẫn tính theo loại đó. Đơn đã xác nhận trước đó không tự tính lại khi thêm mức: Kế toán dùng «Ghi mức tay» cho từng đơn.» |
| C7 | «Ô «—»: cấp không có dòng riêng cho ô này; đơn sẽ theo dòng rộng hơn…» | «Ô «—» nghĩa là cấp chưa đặt mức riêng cho dịch vụ hoặc nhóm này; đơn sẽ theo mức rộng hơn của cấp (cả nhóm hoặc mọi dịch vụ) nếu có.» |
| C8 | «Nhóm khách nào không trả hoa hồng thì ghi 0; ba ô đều phải điền. …» | giữ (đã dễ hiểu) |
| C9 | Hộp «Tắt loại» | viết lại tương tự C6: câu 1 nói đối tác chỉ thuộc loại này sẽ không được hưởng hoa hồng; câu 2 nói đơn bị chờ ở «Đã giao» tới khi Kế toán nhập tay; câu 3 nói đơn đã xác nhận trước lúc tắt giữ nguyên |
| C10 | «Mức cũ … bắt đầu hôm nay nên mức mới áp dụng sớm nhất từ ngày mai; …» | giữ, đổi «áp dụng» → «có hiệu lực» là không cần; chỉ bỏ «sớm nhất» thừa nếu chủ muốn gọn |

## D. Trợ giúp (mục «Cấp đại lý» của Kế toán)
Viết lại theo A1–A7: «1. ＋ Thêm cấp đại lý. 2. Mở cấp, bấm «＋ Thêm hoa hồng cho dịch vụ». 3. Cho một loại theo cấp: ở thẻ «Loại đối tác» bấm «Chọn cấp cho loại này», hoặc ở cấp bấm «Thêm loại vào cấp này». Đổi sang cấp khác: «Đổi cấp». Thôi theo cấp: «Thôi theo cấp này»…». Trợ giúp có trần thời gian đọc; chỉ thay chữ, không thêm câu.

## E. Việc kèm theo khi thi công (không cần chủ quyết)
- `src/shared/bang-tu-giao-dien.ts`: thêm «Áp dụng cấp cho loại» và «Ngừng áp dụng cấp» vào danh sách chữ đã bỏ (bài cấm từ giữ chữ cũ không quay lại). Sửa chữ cũ trong dòng bảng lượt 3 («Ngừng · Áp dụng cấp cho loại · …») cho khớp.
- Bài kiểm có chuỗi cứng: `src/shared/hoa-hong-hien-thi.test.ts`, `src/modules/pricing/*test.ts` (nếu có câu), `src/bang-tu-giao-dien.test.ts`; kịch bản Chrome `docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs` (đổi nhãn nút tìm theo chữ); `web/CLAUDE.md` dòng Hoa hồng nếu có nhắc nút.
- Nhật ký thay đổi: mục 2.50 (số tạm). Ảnh thật 390 và 1040 cho hộp mới, chủ xem một lượt.
- Hành động nhật ký (`audit-actions.ts`) và chi tiết nhật ký cũ **không đổi** (hồ sơ nhật ký cũ giữ chữ lúc ghi).

## Điều chưa kiểm
- Màn thật chưa xem ảnh; câu C2 cần đối chiếu máy chủ còn chặn đổi cấp trong cùng ngày không (chữ «Áp dụng từ hôm nay thì không đổi được trong cùng ngày» hiện có trong mã).
- Chuỗi dựng từ nhiều mảnh (template nhiều dòng) có thể ngoài quét; thi công sẽ quét lại bằng bài cấm từ.
