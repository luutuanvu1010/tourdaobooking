# ADR-0144 — Đính kèm tệp trong vé hỗ trợ, kho R2 riêng

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-28: *«Duyệt cả 3, cho phép tất cả tài khoản được phép gửi đính kèm»*, trả lời ba lựa chọn ở mục 7 của đặc tả `docs/superpowers/specs/2026-10-28-dinh-kem-ve-ho-tro/README.md` (bản 2, commit `0b406610`). Chủ duyệt khuyến nghị câu 2 (loại, cỡ) và câu 3 (Toàn quyền gỡ được tệp), **đổi câu 1**: mọi tài khoản gửi được tin đều gửi được tệp (khuyến nghị là chỉ nội bộ).
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Bản 1 của đề xuất đã qua một vòng người kiểm độc lập chỉ đọc; bản 2 chưa được kiểm lại. Người kiểm độc lập đọc lại sau khi thi công.
- **Ngày:** 2026-10-28.
- **Số:** 0144 là số kế tiếp lúc cấp (0142 ở nhánh `claude/luong-viec-theo-vai-phan-1`, 0143 trên `main`). Migration dự kiến `0124` (`0121` đang ở nhánh `claude/service-group-pickup-setup-ae4465`; nhánh Phần 1 «Bán hàng phụ trách» sẽ lấy hai số); **ai gộp sau đổi tên tệp** theo luật từ 1.46 (`docs/adr/README.md`).
- **Loại:** việc lớn — dữ liệu (bảng mới, tệp người dùng), quyền (đường gửi và tải tệp), triển khai (kho R2 mới do chủ tạo). Trang ghép: `docs/superpowers/specs/2026-10-28-dinh-kem-ve-ho-tro/TRANG-GHEP.md`.
- **Quan hệ với ADR cũ:** bổ sung ADR-0119 và ADR-0127 (không sửa thân); đặc tả vé đợt 1 (`2026-10-14-ve-ho-tro-design.md`) để đính kèm ngoài phạm vi, ghi «cần kho tệp, ADR riêng». Dùng lại **cơ chế** của ADR-0123 (không dùng kho `HO_SO`, không sửa ADR-0123). Không dùng kho `TEP` của ADR-0041. Không sửa ADR-0094.
- **Xây trên lỗ đang hở:** không. `docs/quyen-hoan.json` (rà 28/10): TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-5.11, HC-4.2 — không mục nào chạm vé hỗ trợ hay kho R2. Có xoá đối tượng R2 (tệp tải hỏng, nút gỡ): khôi phục D1 về trước một lần xoá thì dòng tệp quay lại «đã lưu» mà kho không còn đối tượng — route tải trả 404 và ghi lỗi, không lộ gì; cùng giới hạn HC-5.19 với kho hồ sơ.
- **Hiến chương áp:** 5.1, 5.12, 5.16, 5.20, 5.22, 5.24, 5.25.

## Quyết định

1. **Một kho R2 riêng cho tệp vé hỗ trợ:** `tourdao-sales-ho-tro`, binding `HO_TRO`; chỉ module `feedback` chạm. Khoá `fbk/<128 bit ngẫu nhiên>`; không lưu tên tệp gốc.
2. **Tệp đi cùng tin trong một yêu cầu** (gửi vé và trả lời): tối đa 5 tệp, **tổng ≤ 10 MB** mỗi tin; chỉ JPG, PNG, HEIC, PDF, kiểm theo chữ ký thật; không nhận HTML, SVG. Thứ tự: chặn `Content-Length` và tổng độ dài base64 → kiểm từng tệp → **một lô D1** (vé/tin như cũ + dòng tệp chèn **có điều kiện tin đã chèn** + nhật ký chỉ mã) → đọc lại dòng tệp → đặt R2 **chỉ cho dòng có thật** → đánh dấu đã lưu. Phần sau lô nằm trong một `try/catch` tổng, **không ném và không trả 5xx**: tệp đặt hỏng được quyết xoá (`TAI_LEN_LOI`), phản hồi 201 nói rõ số tệp hỏng. Giới hạn: Worker chết giữa chừng thì không bắt được (tin vẫn đã lưu, tệp hiện «chưa tải được»).
3. **Ai gửi tệp:** **mọi tài khoản gửi được tin thì gửi được tệp kèm tin đó** (chủ chọn), kể cả Đối tác và Tài xế đối tác — họ vẫn chỉ gửi tới nhóm Kỹ thuật (ADR-0119 đ6). Ghi chú nội bộ kèm tệp chỉ khi người gửi xử lý được vé. **Ai xem tệp:** ai đọc được tin chứa tệp — cùng `quyenPhieu` và **một** đoạn lọc ghi chú nội bộ dùng chung (ADR-0119 đ5); tệp phải thuộc tin của đúng vé trên đường dẫn; không đọc được ⇒ 404.
4. **Tải xuống chỉ qua Worker**, theo đúng ADR-0123 đ3: kiểm `sec-fetch-site`, kiểm quyền, **ghi nhật ký trước**, rồi mới đọc kho; `Cache-Control: no-store`, `nosniff`, CSP `sandbox`; không đường dẫn ký sẵn; service worker không đệm. Giao diện giữ ảnh đã tải trong lúc trang mở để không tải lại và không ghi nhật ký lặp mỗi lần luồng dựng lại.
5. **Một bảng chỉ-thêm `fbk_attachment`** (mỗi tệp thuộc đúng một tin), cùng ba mốc một chiều như `pty_attachment`; `storage_key`, `content_hash` hạng **N3**. Trần **20 tệp mỗi giờ mỗi tài khoản**. Dòng «tải dở dang» và «chờ xoá» thấy được và chạy lại được (route cho Toàn quyền; kiểm bất biến báo sau 1 giờ) — Hiến chương 5.16; DTO coi tệp chưa lưu quá 10 phút là «chưa tải được».
6. **Gỡ tệp gửi nhầm:** chỉ Toàn quyền (ô `feedback.triage`), một lệnh có tên, đi một chiều: lô D1 quyết xoá (`GO_TEP`) + nhật ký chỉ mã, rồi xoá kho sau lô; tin còn dòng «Tệp đã được gỡ» (Hiến chương 5.24). Máy không tự xoá. Ngoài ra tệp giữ cùng vé như chữ trong tin; thời hạn giữ chung theo chính sách lưu giữ khi luật sư trả lời (5.25).
7. **Ảnh được thu nhỏ trên máy người gửi** (cạnh dài ≤ 2000 điểm ảnh, lưu JPG), bỏ toạ độ chụp; ảnh trình duyệt không mở được và PDF gửi nguyên. Lời gọi có tệp chờ 120 giây.
8. **Nội dung tệp** không vào nhật ký, email báo, câu báo lỗi hay Trợ lý; nhật ký chỉ mang mã vé, mã tệp và số tệp.
9. **Mã kiểm tệp dùng chung** ở `src/shared/` (một nguồn cho `parties` và `feedback`); hàng rào tĩnh của kho hồ sơ đổi sang đếm theo từng kho, thêm hàng rào tương tự cho `HO_TRO`; cổng 1e của `npm run trien-khai` kiểm mọi kho khai trong `wrangler.jsonc`.

## Phương án bị loại

- **Dùng chung kho `HO_SO`:** trái ADR-0123 đ1 và hàng rào (1); trộn ảnh giấy tờ của hồ sơ (có lệnh xoá theo phiếu) với ảnh của vé.
- **Dùng kho `TEP` của ADR-0041:** kho dành cho tệp tin thông báo không xoá được; Hiến chương 5.22 cấm để tệp chứa dữ liệu cá nhân chung kho với tệp không xoá được.
- **Tải từng tệp trước rồi gắn vào tin:** vướng nợ `BL-TEP-PHAT-LAI-500` (gửi lại sau lỗi 500 bị báo «đã ghi» sai và tải lại trang, mất bản đang soạn) — muốn tránh phải sửa ADR-0094; thêm tệp «chưa gắn» phải dọn.
- **Gắn tệp vào tin đã gửi:** người bên kia đã nhận tin qua vòng làm mới nên dễ không thấy tệp tới sau.
- **Đường dẫn công khai hay ký sẵn của R2:** qua mặt kiểm quyền lúc tải (Hiến chương 5.22).
- **Chỉ tài khoản nội bộ gửi tệp** (khuyến nghị của AI): chủ chọn mở cho mọi tài khoản.

## Điều phải nói thẳng

- Khoảng 1000 tài khoản bên ngoài gửi được tệp lên kho; trần 20 tệp/giờ/tài khoản và trần tin có sẵn giới hạn dung lượng, chưa có trần tổng của kho.
- Trần 10 MB là **tổng một tin**; nhờ thu nhỏ ảnh, 5 ảnh điện thoại vẫn vừa (ước tính, chưa đo); PDF lớn thì chia nhiều tin.
- Tệp hiện với người bên kia **sau tin vài giây** (đặt kho chạy sau lô D1).
- Mỗi lần mở một ảnh là một dòng nhật ký (Hiến chương 5.22).
- Phiếu yêu cầu xoá dữ liệu cá nhân (ADR-0126) **chưa** quét vé hỗ trợ, kể cả chữ trong tin — nợ có sẵn, ghi BACKLOG.
- Bộ nhớ Worker với thân ~14 MB (`BL-TEP-THAN-HAI-LAN`) chưa đo trên Worker thật; tuyến này mở cho nhiều người hơn ADR-0123.

## Việc của chủ

Tạo kho bằng **một lệnh** trước lần triển khai có binding `HO_TRO` (AI đưa nguyên lệnh và thư mục; AI không tự chạy lệnh Cloudflare ghi). Thiếu kho thì `npm run trien-khai` dừng ở cổng 1e, chưa đổi gì trên production.

## Tiêu chí nghiệm thu

Mục 5 của đặc tả; câu 1 đổi thành: tài khoản bên ngoài gửi tệp kèm vé tới nhóm Kỹ thuật được, tới nhóm khác vẫn 403.

## Hệ quả

- Migration chỉ thêm bảng `fbk_attachment`; cập nhật `docs/data-dictionary.json` + `npm run dict`; hai cột mới vào tập N3 ghim của `src/hang-du-lieu.test.ts`.
- Hàng rào mới/đổi có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.
- Có migration và binding mới nên **cần triển khai**; hoàn tác bằng `wrangler rollback` (mã cũ chạy bình thường trên cấu trúc mới; tệp đã gửi nằm im trong kho).
- Kế hoạch thi công: `docs/superpowers/plans/2026-10-28-dinh-kem-ve-ho-tro.md`.
