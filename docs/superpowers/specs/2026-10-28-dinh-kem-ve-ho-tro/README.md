# Đặc tả ngắn — Đính kèm tệp trong vé hỗ trợ (2026-10-28)

> Hồ sơ có ngày. **Trạng thái: bản nháp, CHỜ CHỦ DUYỆT** (ba lựa chọn ở mục 6). Chưa có kế hoạch, chưa có mã.
> Văn bản đề xuất quyết định: `DE-XUAT-ADR.md` (số tạm ADR-0144). Trang ghép (CLAUDE.md §9): `TRANG-GHEP.md`.
> Yêu cầu của chủ (28/10, qua phiên điều phối): cho người dùng đính kèm tệp (ảnh, tài liệu) khi gửi vé hỗ trợ, lưu ở Cloudflare R2 **theo đúng cách hệ thống từng làm**.

## 1. Khuôn cũ tìm được (sự thật, đã đọc mã)

Kho có **hai** quyết định về tệp trên R2, nhưng chỉ **một** đã thành mã:

| | ADR-0041 (tệp trong tin thông báo) | ADR-0123 (ảnh giấy tờ hồ sơ) |
|---|---|---|
| Trạng thái | accepted 28/9, **chưa từng thi công** (không có binding `TEP`, không bảng `ntf_attachment`; BACKLOG mục 1 «đã duyệt, chưa làm») | accepted 16/10, **đang chạy production** từ bản 2.16 (migration `0104_ho_so_tep`) |
| Kho | `tourdao-sales-tep`, binding `TEP` (chưa tạo) | `tourdao-sales-ho-so`, binding `HO_SO`; chỉ module `parties` được chạm (bài `src/kho-tep-ho-so.test.ts` (1)) |
| Khoá tệp | `ntf/<mã tin>/<mã tệp>` | `pty/<32 chữ hex ngẫu nhiên>`, không mang nghĩa; **không lưu tên tệp gốc** |
| Loại, cỡ | JPG/PNG/HEIC/PDF/DOC/DOCX/TXT/MD, ≤ 5 tệp/tin, ≤ 10 MB/tệp | JPG/PNG/HEIC/PDF, ≤ 10 MB, kiểm theo **chữ ký thật** đầu tệp (`nhanLoaiTep`), không nhận HTML/SVG |
| Tải lên | một yêu cầu kèm tin; R2 trước, D1 lỗi thì gỡ tệp | **một tệp mỗi yêu cầu**, thân JSON `{ noiDung: base64 }` (router trả 415 cho lệnh ghi không phải JSON); chặn `Content-Length` **trước** khi đọc thân; **lô D1 trước** (dòng tệp + dòng nối + nhật ký) → đặt R2 → đánh dấu `stored_at` |
| Ai đọc | người thấy tin + người gửi; tin thu hồi thì khoá tệp | `party.attachment.view` = chỉ Toàn quyền |
| Phục vụ | qua Worker, `nosniff`, không cache công khai | **chỉ qua route có kiểm quyền**: kiểm `sec-fetch-site` → `can()` → **ghi nhật ký trước** → đọc kho; header `no-store`, `nosniff`, CSP `sandbox`, `same-origin`; không đường dẫn ký sẵn; service worker không bao giờ đệm `/api/*` |
| Xoá | không xoá | không xoá dòng; quyết xoá ghi ở D1 (`purged_at`), xoá R2 chạy **sau** lô (Hiến chương 5.16); dòng «chờ xoá» thấy được và chạy lại được |

Hiến chương 5.22 (đã duyệt) chốt nguyên tắc cho mọi tệp chứa dữ liệu cá nhân: kho riêng (không chung kho với tệp không xoá được), khoá ngẫu nhiên, không đường dẫn công khai, kiểm quyền và **ghi nhật ký trước** khi phục vụ, không đệm ở trình duyệt hay service worker, kiểm loại theo nội dung thật. Chữ trong tin vé (`fbk_message.body`) đã xếp hạng **N2** nên ảnh chụp màn hình kèm vé cũng là dữ liệu cá nhân.

⇒ «Cách hệ thống từng làm» = **cơ chế của ADR-0123**. Đặc tả này dùng lại nguyên cơ chế đó, chỉ đổi chỗ gắn tệp (tin của vé thay vì dòng giấy tờ).

## 2. Luồng vé hiện có (đã đọc mã `src/modules/feedback/`)

- Gửi vé: `POST /api/feedback` (ô `feedback.submit` = mọi tài khoản) — một lô chèn vé + tin đầu + nhật ký; chống gửi trùng bằng `clientRequestId` và lớp vé chung (ADR-0094).
- Trả lời: `POST /api/feedback/:id/messages` — quyền theo `quyenPhieu` (ADR-0119): người gửi, thành viên nhóm giữ vé, Toàn quyền; ghi chú nội bộ chỉ nhóm xử lý viết/đọc, sau chuyển nhóm thì nhóm mới không đọc ghi chú nhóm cũ.
- Khung trò chuyện tự làm mới 5 giây (`GET …/messages?since=`, ADR-0127), vẽ lại cả luồng mỗi lần có tin; lấy lại tin trong 30 giây gần nhất và thay bản cũ theo `id`.
- Tài khoản bên ngoài (Đối tác, Tài xế đối tác) chỉ gửi tới nhóm Kỹ thuật (ADR-0119 đ6).

## 3. Thiết kế đề xuất

**3.1 Tệp đi CÙNG tin, trong một yêu cầu** (không tải trước rồi gắn sau). Thân JSON của `POST /api/feedback` và `POST /api/feedback/:id/messages` nhận thêm `tep: [{ noiDung: base64 }]` (tối đa 5). Thứ tự giữ đúng khuôn ADR-0123: chặn `Content-Length` → kiểm từng tệp (chữ ký, cỡ) → **một lô D1** (vé/tin + dòng tệp + nhật ký chỉ mã) → đặt R2 từng tệp → đánh dấu đã lưu.

Lý do chọn cách này thay vì «tải từng tệp trước»: (a) tin và tệp hiện cùng lúc với người bên kia (vòng làm mới chỉ hỏi tin mới); (b) **né được nợ `BL-TEP-PHAT-LAI-500`** — sau khi lô D1 đã ghi, route **không bao giờ trả 5xx**: kho lỗi thì tin vẫn gửi (201), tệp hỏng được đánh dấu «chưa tải được» (quyết xoá `TAI_LEN_LOI`, như ADR-0123) và giao diện báo «Tin đã gửi, 1 tệp chưa tải lên được — gửi lại tệp đó trong tin mới». Lớp vé chung vì thế không bao giờ phát lại câu «đã ghi» sai, và không phải sửa ADR-0094.

**Giá phải trả:** cả tin nằm trong một yêu cầu nên trần là **tổng 10 MB mỗi tin** (thân ~14 MB như một tệp của ADR-0123), không phải 10 MB mỗi tệp. Đủ cho khoảng 3 ảnh chụp điện thoại hoặc 5–10 ảnh chụp màn hình.

**3.2 Dữ liệu** (module `feedback`, tiền tố `fbk_`, migration chỉ thêm — số đặt lúc thi công, hiện dự kiến `0123` vì nhánh Phần 1 «Bán hàng phụ trách» sẽ lấy `0121`–`0122`):
- `fbk_attachment`: chép cột và trigger của `pty_attachment` (`storage_key` = `fbk/<32 hex>`, `content_kind`, `byte_size`, `content_hash`, ba mốc một chiều `stored_at` / `purged_at` + `purge_reason` / `r2_deleted_at`, 4 cột dấu vết), thay `party_id` bằng `message_id` (tệp thuộc **đúng một** tin, không đổi). Không cột tên tệp gốc. Trigger: không xoá dòng, không đổi danh tính, ba mốc một chiều, tối đa 5 tệp mỗi tin, người tải = tác giả tin.
- Không cần bảng nối (tệp không bao giờ chuyển sang tin khác).
- Hạng dữ liệu: `storage_key`, `content_hash` = N2 (như chữ trong tin); cột khác N1.

**3.3 Kho**: kho R2 **riêng mới** `tourdao-sales-ho-tro`, binding `HO_TRO`, chỉ module `feedback` chạm (hàng rào tĩnh như `kho-tep-ho-so.test.ts`). Không dùng `HO_SO` (ADR-0123 đ1 và hàng rào (1) cấm module khác), không dùng `TEP` (dành cho tin thông báo không xoá được — Hiến chương 5.22 cấm chung kho). Chủ tạo kho bằng **một lệnh** trước lần triển khai; cổng 1e của `npm run trien-khai` mở rộng để kiểm **mọi** kho trong `r2_buckets`.

**3.4 Ai xem được tệp** (suy ra từ ADR-0119/0127 đã duyệt, không hỏi lại): **ai đọc được tin chứa tệp thì xem được tệp** — cùng `quyenPhieu` và cùng bộ lọc ghi chú nội bộ (`noiBo`), kể cả luật «nhóm mới không đọc ghi chú nhóm cũ». Không đọc được ⇒ 404 (như mọi route vé, không lộ có tệp). Route mới `GET /api/feedback/:id/tep/:tid`: kiểm `sec-fetch-site` → `quyenPhieu` → tin chứa tệp hiện được với người xem → **ghi nhật ký trước** (`feedback_attachment_viewed`, chỉ mã vé + mã tệp) → đọc kho → header như `dauPhanHoiTep` (tên tải về `ho-tro-<8 ký tự mã>.<đuôi>`).

**3.5 Mã dùng lại, không chép tay**: chuyển phần thuần của `src/modules/parties/tep.ts` (nhận loại theo chữ ký, giải base64, khoá ngẫu nhiên, băm, header tải xuống) sang `src/shared/tep-dinh-kem.ts`, tham số hoá tiền tố khoá (`pty/`, `fbk/`) và tên tải về; `parties/tep.ts` gọi lại, bài kiểm cũ của parties giữ nguyên và phải xanh.

**3.6 Giao diện** (`web/ho-tro-gui.ts`, ô trả lời ở `web/ho-tro-luong.ts`):
- Nút «Đính kèm» (ô chọn tệp, nhận nhiều tệp) dưới ô mô tả / ô trả lời; danh sách tệp đã chọn có nút bỏ; kiểm loại và tổng cỡ ngay trên máy để báo sớm (máy chủ vẫn kiểm lại). Câu nhắc: «Đừng gửi ảnh căn cước, bằng lái qua đây.»
- Trong luồng: ảnh hiện xem trước nhỏ; HEIC trên trình duyệt không xem được thì đổi sang nút «Tải về»; PDF là thẻ «Tệp PDF · 1,2 MB» có nút «Tải về».
- **Mỗi ảnh chỉ tải một lần mỗi lần mở vé:** vì luồng vẽ lại mỗi lần có tin mới và tệp trả `no-store`, giao diện giữ lại đúng phần tử ảnh đã tạo (theo mã tệp) và gắn lại khi vẽ lại — không tạo thẻ ảnh mới (nếu không, mỗi lần vẽ lại sẽ tải lại ảnh và ghi thêm một dòng nhật ký).
- Tin phải có chữ (cột `body` đã có ràng buộc 1–4000 ký tự): chọn tệp mà để trống chữ thì báo «Hãy viết vài chữ kèm tệp.»

**3.7 Ngoài phạm vi** (ghi BACKLOG nếu chủ muốn): Word/Excel/văn bản thô; xoá toạ độ chụp trong ảnh (`BL-TEP-EXIF`); thu nhỏ ảnh trước khi gửi; tệp trong email báo (email giữ nguyên, không kèm tệp); phiếu yêu cầu xoá dữ liệu cá nhân (ADR-0126) quét cả tệp vé — hôm nay phiếu xoá cũng chưa quét chữ trong vé, đây là nợ có sẵn, ghi rõ ở ADR.

## 4. Tiêu chí nghiệm thu (P20 — viết trước khi làm)

1. Gửi vé và trả lời kèm 1–5 ảnh/PDF ⇒ người đọc được tin thấy tệp, mở được; tệp sai chữ ký (đổi đuôi `.html` → `.png`), SVG, quá tổng 10 MB, quá 5 tệp ⇒ từ chối bằng câu tiếng Việt, **không** tạo tin.
2. Người ngoài vé, thành viên nhóm khác, người gửi với tệp trong ghi chú nội bộ, nhóm mới với tệp trong ghi chú của nhóm cũ ⇒ 404 (bài chạy đường thật, mỗi ca một bài — bài học 24/9).
3. Tải xuống: thiếu dòng nhật ký thì không trả tệp; phản hồi có `no-store`, `nosniff`, CSP `sandbox`; yêu cầu từ trang khác (`sec-fetch-site: cross-site`) bị chặn.
4. Kho lỗi khi đặt tệp ⇒ tin vẫn được gửi (201) kèm số tệp hỏng; dòng tệp hỏng ở trạng thái «chờ xoá» thấy được và chạy lại được; gửi lại cùng vé **không** ra câu «Lần bấm trước đã được ghi» sai.
5. Hàng rào tĩnh: chỉ `feedback` nhắc `HO_TRO`; chỉ `parties` nhắc `HO_SO`; mỗi kho đúng một chỗ đặt, một chỗ đọc; thứ tự kiểm quyền → nhật ký → đọc kho; lô D1 trước đặt kho. Quan sát chặn thật một lần (sửa cố ý → đỏ → hoàn nguyên), ghi `docs/SO-HANG-RAO.md`.
6. `npm run trien-khai` dừng ở cổng 1e nếu **một** kho trong `wrangler.jsonc` chưa có trên Cloudflare (bài cho `release-lib`).
7. Kịch bản Chrome màn Hỗ trợ (390 + 1040): chọn tệp, gửi, xem trước, mở ảnh một lần dù luồng tự làm mới (đếm yêu cầu tải), ô gõ 16px, không chữ Anh lộ ra.
8. `npm test`, `npm run typecheck`, e2e `feedback` + `ve-ho-tro*` xanh; người kiểm độc lập ĐẠT.

## 5. Giả định tự đặt (bề mặt, đảo được — ghi lại, không hỏi)

- Tên hiển thị của tệp: «Ảnh 1», «Tệp PDF 2» (không lưu tên gốc, theo ADR-0123).
- Trần gửi tệp theo trần tin có sẵn (`MESSAGE_LIMIT_PER_HOUR`, `TICKET_LIMIT_PER_HOUR`) × 5 tệp; không thêm trần riêng.
- Nhật ký khi gửi: một dòng `feedback_attachment_added` «<mã vé> · n tệp» trong cùng lô với tin; không ghi tên tệp, không tiêu đề với nhóm nhạy cảm.

## 6. Ba lựa chọn chờ chủ (một lần hỏi)

1. **Ai được gửi tệp kèm tin?** Khuyến nghị: **chỉ tài khoản nội bộ trước**; Đối tác và Tài xế đối tác vẫn **xem** được tệp Nền tảng gửi cho họ trong vé của họ, mở quyền gửi sau. Phương án khác: mọi người gửi được tin đều gửi được tệp (thêm khoảng 1000 tài khoản bên ngoài tải tệp lên kho).
2. **Loại và cỡ:** Khuyến nghị: **ảnh JPG, PNG, HEIC và PDF; tối đa 5 tệp, tổng 10 MB mỗi tin** (đúng loại của khuôn đã chạy). Phương án khác: thêm Word, Excel — phải viết thêm phần kiểm nội dung, tệp có thể chứa macro.
3. **Giữ tệp bao lâu?** Khuyến nghị: **giữ cùng vé như chữ trong tin, đợt này chưa có nút gỡ**; dữ liệu có sẵn cột «quyết xoá» để sau này thêm nút gỡ hoặc thời hạn giữ (chờ chính sách lưu giữ, Hiến chương 5.25) mà không cần migration. Phương án khác: làm luôn nút «Gỡ tệp» cho Toàn quyền (xoá hẳn khỏi kho, tin còn dòng «Tệp đã được gỡ») — thêm một route, một màn và hàng chờ xoá.
