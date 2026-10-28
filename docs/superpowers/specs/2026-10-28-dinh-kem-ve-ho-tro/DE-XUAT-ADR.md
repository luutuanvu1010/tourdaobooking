# Đề xuất ADR-0144 — Đính kèm tệp trong vé hỗ trợ, kho R2 riêng

> **Bản đề xuất, CHƯA DUYỆT** (bản 2, sau một vòng người kiểm độc lập). Khi chủ duyệt, văn bản này (kèm câu duyệt nguyên văn và ba lựa chọn) mới được chép thành `docs/adr/ADR-0144-…md`. Số 0144 là số kế tiếp lúc soạn (0142 đang ở nhánh `claude/luong-viec-theo-vai-phan-1`, 0143 đã trên `main`); kiểm lại lúc cấp.

- **Trạng thái:** proposed — AI soạn ngày 2026-10-28 theo yêu cầu của chủ (qua phiên điều phối). Người kiểm độc lập chỉ đọc đã đọc bản 1; bản này sửa theo phát hiện (`README.md` mục 8).
- **Loại:** việc lớn — dữ liệu (bảng mới, tệp người dùng), quyền (đường tải xuống mới), triển khai (kho R2 mới do chủ tạo). Cần trang ghép (`TRANG-GHEP.md` cùng thư mục) và người kiểm độc lập sau khi thi công.
- **Quan hệ với ADR cũ:** bổ sung ADR-0119 và ADR-0127 (không sửa thân); đặc tả của hai đợt đó (`2026-10-14-ve-ho-tro-design.md`, `2026-10-16-ve-ho-tro-dot-2a-design.md`) để đính kèm tệp ngoài phạm vi, đợt 1 ghi «cần kho tệp, ADR riêng». Dùng lại **cơ chế** của ADR-0123 (không dùng kho `HO_SO`, không sửa ADR-0123). Không dùng kho `TEP` của ADR-0041. Không sửa ADR-0094.
- **Xây trên lỗ đang hở:** không. `docs/quyen-hoan.json` (rà 28/10) có TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-5.11, HC-4.2 — không mục nào chạm vé hỗ trợ hay kho R2. Có xoá đối tượng R2 (tệp tải hỏng `TAI_LEN_LOI`, và nút gỡ nếu chủ chọn ở câu 3): khôi phục D1 về trước một lần xoá thì dòng tệp quay lại «đã lưu» mà kho không còn đối tượng — route tải trả 404 và ghi lỗi `ho_tro_tep_thieu_doi_tuong`, không lộ gì; đây là cùng giới hạn của HC-5.19 với kho hồ sơ.
- **Hiến chương áp:** 5.1 (hai lớp), 5.12 và 5.20 (nhật ký không chứa dữ liệu cá nhân; hạng dữ liệu), 5.16 (việc bên ngoài sau lô), 5.22 (tệp đính kèm), 5.24 (xoá = có vết, một lệnh có tên), 5.25 (lưu giữ).

## Quyết định

1. **Một kho R2 riêng cho tệp vé hỗ trợ:** `tourdao-sales-ho-tro`, binding `HO_TRO`; chỉ module `feedback` chạm. Khoá `fbk/<128 bit ngẫu nhiên>`; không lưu tên tệp gốc.
2. **Tệp đi cùng tin trong một yêu cầu** (gửi vé và trả lời): tối đa 5 tệp, **tổng ≤ 10 MB** mỗi tin; chỉ JPG, PNG, HEIC, PDF, kiểm theo chữ ký thật; không nhận HTML, SVG. Thứ tự: chặn `Content-Length` và tổng độ dài base64 → kiểm từng tệp → **một lô D1** (vé/tin như cũ + dòng tệp chèn **có điều kiện tin đã chèn** + nhật ký chỉ mã) → đọc lại dòng tệp → đặt R2 **chỉ cho dòng có thật** → đánh dấu đã lưu. Phần sau lô nằm trong một `try/catch` tổng, **không ném và không trả 5xx**: tệp đặt hỏng được quyết xoá (`TAI_LEN_LOI`), phản hồi 201 nói rõ số tệp hỏng. Giới hạn: Worker chết giữa chừng thì không bắt được (tin vẫn đã lưu, tệp hiện «chưa tải được»).
3. **Ai gửi tệp:** *[chờ chủ — câu 1]*; ghi chú nội bộ kèm tệp chỉ khi người gửi xử lý được vé. **Ai xem tệp:** ai đọc được tin chứa tệp — cùng `quyenPhieu` và **một** đoạn lọc ghi chú nội bộ dùng chung (ADR-0119 đ5); tệp phải thuộc tin của đúng vé trên đường dẫn; không đọc được ⇒ 404.
4. **Tải xuống chỉ qua Worker**, theo đúng ADR-0123 đ3: kiểm `sec-fetch-site`, kiểm quyền, **ghi nhật ký trước**, rồi mới đọc kho; `Cache-Control: no-store`, `nosniff`, CSP `sandbox`; không đường dẫn ký sẵn; service worker không đệm. Giao diện giữ ảnh đã tải trong lúc trang mở để không tải lại và không ghi nhật ký lặp mỗi lần luồng dựng lại.
5. **Một bảng chỉ-thêm `fbk_attachment`** (mỗi tệp thuộc đúng một tin), cùng ba mốc một chiều như `pty_attachment`; `storage_key`, `content_hash` hạng **N3**. Trần 20 tệp mỗi giờ mỗi tài khoản. Dòng «tải dở dang» và «chờ xoá» thấy được và chạy lại được (route cho Toàn quyền; kiểm bất biến báo sau 1 giờ) — Hiến chương 5.16; DTO coi tệp chưa lưu quá 10 phút là «chưa tải được».
6. **Gỡ tệp và lưu giữ:** *[chờ chủ — câu 3]*. Nếu có nút gỡ: một lệnh có tên, chỉ Toàn quyền, đi một chiều (quyết xoá ghi ở D1 trước, xoá kho sau), nhật ký chỉ mã — Hiến chương 5.24. Thời hạn giữ chung của vé (chữ và tệp) theo chính sách lưu giữ khi có (5.25); đợt này không có máy tự xoá.
7. **Ảnh được thu nhỏ trên máy người gửi** (cạnh dài ≤ 2000 điểm ảnh, lưu JPG), bỏ toạ độ chụp; ảnh trình duyệt không mở được và PDF gửi nguyên. Lời gọi có tệp chờ 120 giây.
8. **Nội dung tệp** không vào nhật ký, email báo, câu báo lỗi hay Trợ lý; nhật ký chỉ mang mã vé, mã tệp và số tệp.
9. **Mã kiểm tệp dùng chung** ở `src/shared/` (một nguồn cho `parties` và `feedback`); hàng rào tĩnh của kho hồ sơ đổi sang đếm theo từng kho, thêm hàng rào tương tự cho `HO_TRO`; cổng 1e của `npm run trien-khai` kiểm mọi kho khai trong `wrangler.jsonc`.

## Phương án bị loại

- **Dùng chung kho `HO_SO`:** trái ADR-0123 đ1 và hàng rào (1); trộn ảnh giấy tờ của hồ sơ (có lệnh xoá theo phiếu) với ảnh của vé.
- **Dùng kho `TEP` của ADR-0041:** kho dành cho tệp tin thông báo không xoá được; Hiến chương 5.22 cấm để tệp chứa dữ liệu cá nhân chung kho với tệp không xoá được.
- **Tải từng tệp trước rồi gắn vào tin:** mỗi tệp được 10 MB, nhưng vướng nợ `BL-TEP-PHAT-LAI-500` (gửi lại sau lỗi 500 bị báo «đã ghi» sai và tải lại trang, mất bản đang soạn) — muốn tránh phải sửa ADR-0094; thêm tệp «chưa gắn» phải dọn.
- **Gắn tệp vào tin đã gửi:** người bên kia đã nhận tin qua vòng làm mới nên dễ không thấy tệp tới sau.
- **Đường dẫn công khai hay ký sẵn của R2:** qua mặt kiểm quyền lúc tải (Hiến chương 5.22).

## Điều phải nói thẳng

- Trần 10 MB là **tổng một tin**, nhỏ hơn khuôn ADR-0041 (10 MB mỗi tệp). Nhờ thu nhỏ ảnh, 5 ảnh điện thoại vẫn vừa; PDF lớn thì chia nhiều tin.
- Tệp hiện với người bên kia **sau tin vài giây** (đặt kho chạy sau lô D1).
- Mỗi lần mở một ảnh là một dòng nhật ký (Hiến chương 5.22).
- Phiếu yêu cầu xoá dữ liệu cá nhân (ADR-0126) **chưa** quét vé hỗ trợ, kể cả chữ trong tin — nợ có sẵn, đợt này không sửa; ghi BACKLOG.
- Bộ nhớ Worker với thân ~14 MB (`BL-TEP-THAN-HAI-LAN`) chưa đo trên Worker thật — cùng rủi ro với khuôn ADR-0123, nhưng tuyến này mở cho nhiều người hơn (ADR-0123 chỉ Toàn quyền); thu nhỏ ảnh làm thân thường nhỏ hơn nhiều.

## Việc của chủ

Tạo kho bằng **một lệnh** trước lần triển khai có binding `HO_TRO` (AI đưa nguyên lệnh và thư mục; AI không tự chạy lệnh Cloudflare ghi). Thiếu kho thì `npm run trien-khai` dừng ở cổng 1e, chưa đổi gì trên production.

## Tiêu chí nghiệm thu

Như mục 5 của `README.md` cùng thư mục.
