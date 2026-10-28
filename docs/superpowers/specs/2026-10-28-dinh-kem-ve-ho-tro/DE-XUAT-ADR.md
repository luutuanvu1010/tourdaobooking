# Đề xuất ADR-0144 — Đính kèm tệp trong vé hỗ trợ, kho R2 riêng

> **Bản đề xuất, CHƯA DUYỆT.** Khi chủ duyệt, văn bản này (kèm câu duyệt nguyên văn) mới được chép thành `docs/adr/ADR-0144-…md`. Số 0144 là số kế tiếp lúc soạn (0142 đang ở nhánh `claude/luong-viec-theo-vai-phan-1`, 0143 đã trên `main`); kiểm lại lúc cấp.

- **Trạng thái:** proposed — AI soạn ngày 2026-10-28 theo yêu cầu của chủ (qua phiên điều phối); chưa có người kiểm độc lập đọc văn bản.
- **Loại:** việc lớn — dữ liệu (bảng mới), quyền (đường tải xuống mới), triển khai (kho R2 mới do chủ tạo). Cần trang ghép (`TRANG-GHEP.md` cùng thư mục) và người kiểm độc lập sau khi thi công.
- **Quan hệ với ADR cũ:** bổ sung ADR-0119 và ADR-0127 (không sửa thân) — hai ADR này đều ghi «đính kèm tệp/ảnh cần kho tệp, ADR riêng». Dùng lại **cơ chế** của ADR-0123 (không dùng kho `HO_SO`, không sửa ADR-0123). Không dùng kho `TEP` của ADR-0041. Không sửa ADR-0094.
- **Xây trên lỗ đang hở:** không. `docs/quyen-hoan.json` (rà 28/10) có TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-5.11, HC-4.2 — không mục nào chạm vé hỗ trợ hay kho R2. Đợt này không xoá tệp nên không dựa vào diễn tập khôi phục (HC-5.19).
- **Hiến chương áp:** 5.1 (hai lớp), 5.12 và 5.20 (nhật ký không chứa dữ liệu cá nhân), 5.16 (việc bên ngoài sau lô), 5.22 (tệp đính kèm), 5.25 (lưu giữ).

## Quyết định

1. **Một kho R2 riêng cho tệp vé hỗ trợ:** `tourdao-sales-ho-tro`, binding `HO_TRO`; chỉ module `feedback` chạm. Khoá `fbk/<128 bit ngẫu nhiên>`; không lưu tên tệp gốc.
2. **Tệp đi cùng tin trong một yêu cầu** (gửi vé và trả lời): tối đa 5 tệp, **tổng ≤ 10 MB** mỗi tin; chỉ JPG, PNG, HEIC, PDF, kiểm theo chữ ký thật; không nhận HTML, SVG. Thứ tự: chặn `Content-Length` → kiểm tệp → **một lô D1** (vé/tin + dòng tệp + nhật ký chỉ mã) → đặt R2 → đánh dấu đã lưu. Sau khi lô D1 đã ghi, route **không trả 5xx**: tệp đặt hỏng được quyết xoá (`TAI_LEN_LOI`) và phản hồi 201 nói rõ số tệp hỏng.
3. **Ai gửi tệp:** *[chờ chủ — câu 1]*. **Ai xem tệp:** ai đọc được tin chứa tệp — cùng hàm `quyenPhieu` và cùng bộ lọc ghi chú nội bộ của ADR-0119 đ5; không đọc được ⇒ 404.
4. **Tải xuống chỉ qua Worker**, theo đúng ADR-0123 đ3: kiểm `sec-fetch-site`, kiểm quyền, **ghi nhật ký trước**, rồi mới đọc kho; `Cache-Control: no-store`, `nosniff`, CSP `sandbox`; không đường dẫn ký sẵn; service worker không đệm.
5. **Một bảng chỉ-thêm `fbk_attachment`** (mỗi tệp thuộc đúng một tin), cùng ba mốc một chiều như `pty_attachment`. Dòng «tải dở dang» và «chờ xoá» thấy được và chạy lại được (route cho Toàn quyền, kiểm bất biến báo sau 1 giờ) — Hiến chương 5.16.
6. **Giữ tệp:** *[chờ chủ — câu 3]*.
7. **Nội dung tệp** không vào nhật ký, email báo, câu báo lỗi hay Trợ lý; nhật ký chỉ mang mã vé, mã tệp và số tệp.
8. **Mã kiểm tệp dùng chung** ở `src/shared/` (một nguồn cho `parties` và `feedback`); hàng rào tĩnh của kho hồ sơ đổi sang đếm theo từng kho, thêm hàng rào tương tự cho `HO_TRO`; cổng 1e của `npm run trien-khai` kiểm mọi kho khai trong `wrangler.jsonc`.

## Phương án bị loại

- **Dùng chung kho `HO_SO`:** trái ADR-0123 đ1 và hàng rào (1); trộn ảnh giấy tờ (N3, có lệnh xoá theo phiếu) với ảnh chụp màn hình.
- **Dùng kho `TEP` của ADR-0041:** kho dành cho tệp tin thông báo không xoá được; Hiến chương 5.22 cấm để tệp chứa dữ liệu cá nhân chung kho với tệp không xoá được.
- **Tải từng tệp trước rồi gắn vào tin:** mỗi tệp được 10 MB, nhưng (a) vướng nợ `BL-TEP-PHAT-LAI-500` (gửi lại sau lỗi 500 bị báo «đã ghi» sai và tải lại trang, mất bản đang soạn) — muốn tránh phải sửa ADR-0094; (b) thêm tệp «chưa gắn» phải dọn.
- **Gắn tệp vào tin đã gửi:** người bên kia đã nhận tin qua vòng làm mới nên không biết có tệp tới sau.
- **Đường dẫn công khai hay ký sẵn của R2:** qua mặt kiểm quyền lúc tải (Hiến chương 5.22).

## Điều phải nói thẳng

- Trần 10 MB là **tổng một tin**, nhỏ hơn khuôn ADR-0041 (10 MB mỗi tệp). Gửi nhiều ảnh lớn thì chia nhiều tin.
- Mỗi lần mở một ảnh là một dòng nhật ký (Hiến chương 5.22). Giao diện giữ ảnh đã tải trong lúc vé đang mở để không ghi lặp mỗi 5 giây.
- Phiếu yêu cầu xoá dữ liệu cá nhân (ADR-0126) **chưa** quét vé hỗ trợ, kể cả chữ trong tin — nợ có sẵn, đợt này không sửa; ghi BACKLOG.
- Bộ nhớ Worker với thân ~14 MB (`BL-TEP-THAN-HAI-LAN`) vẫn chưa đo trên Worker thật — cùng rủi ro với khuôn ADR-0123 đang chạy.

## Việc của chủ

Tạo kho bằng **một lệnh** trước lần triển khai có binding `HO_TRO` (AI đưa nguyên lệnh và thư mục; AI không tự chạy lệnh Cloudflare ghi). Thiếu kho thì `npm run trien-khai` dừng ở cổng 1e, chưa đổi gì trên production.

## Tiêu chí nghiệm thu

Như mục 4 của `README.md` cùng thư mục.
