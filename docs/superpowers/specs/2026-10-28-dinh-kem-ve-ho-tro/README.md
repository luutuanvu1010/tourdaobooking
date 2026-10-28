# Đặc tả ngắn — Đính kèm tệp trong vé hỗ trợ (2026-10-28)

> Hồ sơ có ngày. **Trạng thái: bản 2, CHỜ CHỦ DUYỆT** (ba lựa chọn ở mục 7). Chưa có kế hoạch, chưa có mã.
> Bản 1 (commit `6b04bbc5`) đã qua một vòng người kiểm độc lập chỉ đọc; bản này sửa theo các phát hiện đó (mục 8).
> Văn bản đề xuất quyết định: `DE-XUAT-ADR.md` (số tạm ADR-0144). Trang ghép (CLAUDE.md §9): `TRANG-GHEP.md`.
> Yêu cầu của chủ (28/10, qua phiên điều phối): cho người dùng đính kèm tệp (ảnh, tài liệu) khi gửi vé hỗ trợ, lưu ở Cloudflare R2 **theo đúng cách hệ thống từng làm**.

## 1. Khuôn cũ tìm được (sự thật, đã đọc mã)

Kho có **hai** quyết định về tệp trên R2, nhưng chỉ **một** đã thành mã:

| | ADR-0041 (tệp trong tin thông báo) | ADR-0123 (ảnh giấy tờ hồ sơ) |
|---|---|---|
| Trạng thái | accepted 28/9, **chưa từng thi công** (không có binding `TEP`, không bảng `ntf_attachment`; BACKLOG mục 1 «đã duyệt, chưa làm») | accepted 16/10, **đang chạy production** từ bản 2.16 (migration `0104_ho_so_tep`); **chưa có giao diện** (chỉ API, `BL-TEP-GIAO-DIEN`) |
| Kho | `tourdao-sales-tep`, binding `TEP` (chưa tạo) | `tourdao-sales-ho-so`, binding `HO_SO`; chỉ module `parties` được chạm (bài `src/kho-tep-ho-so.test.ts` (1)) |
| Khoá tệp | `ntf/<mã tin>/<mã tệp>` | `pty/<32 chữ hex ngẫu nhiên>`, không mang nghĩa; **không lưu tên tệp gốc** |
| Loại, cỡ | JPG/PNG/HEIC/PDF/DOC/DOCX/TXT/MD, ≤ 5 tệp/tin, ≤ 10 MB/tệp | JPG/PNG/HEIC/PDF, ≤ 10 MB, kiểm theo **chữ ký thật** đầu tệp (`nhanLoaiTep`), không nhận HTML/SVG |
| Tải lên | một yêu cầu kèm tin; R2 trước, D1 lỗi thì gỡ tệp | **một tệp mỗi yêu cầu**, thân JSON `{ noiDung: base64 }` (router trả 415 cho lệnh ghi không phải JSON); chặn `Content-Length` trước khi giải thân; **lô D1 trước** (dòng tệp + dòng nối + nhật ký) → đặt R2 → đánh dấu `stored_at` |
| Ai đọc | người thấy tin + người gửi; tin thu hồi thì khoá tệp | `party.attachment.view` = chỉ Toàn quyền |
| Phục vụ | qua Worker, `nosniff`, không cache công khai | **chỉ qua route có kiểm quyền**: kiểm `sec-fetch-site` → `can()` → **ghi nhật ký trước** → đọc kho; header `no-store`, `nosniff`, CSP `sandbox`, `same-origin`; không đường dẫn ký sẵn; service worker không bao giờ đệm `/api/*` |
| Xoá | không xoá | không xoá dòng; quyết xoá ghi ở D1 (`purged_at`), xoá R2 chạy **sau** lô (Hiến chương 5.16); dòng «chờ xoá» thấy được và chạy lại được |

Hiến chương 5.22 (đã duyệt) chốt nguyên tắc cho mọi tệp chứa dữ liệu cá nhân: kho riêng (không chung kho với tệp không xoá được), khoá ngẫu nhiên, không đường dẫn công khai, kiểm quyền và **ghi nhật ký trước** khi phục vụ, không đệm ở trình duyệt hay service worker, kiểm loại theo nội dung thật. Chữ trong tin vé (`fbk_message.body`) xếp hạng **N2**; ảnh kèm vé có thể chứa thêm ảnh giấy tờ gửi nhầm (N3).

⇒ «Cách hệ thống từng làm» = **cơ chế của ADR-0123**. Đặc tả này dùng lại nguyên cơ chế đó, chỉ đổi chỗ gắn tệp (tin của vé thay vì dòng giấy tờ). Đặc tả vé đợt 1 (`2026-10-14-ve-ho-tro-design.md` mục ngoài phạm vi) đã ghi «đính kèm tệp/ảnh (cần kho tệp, ADR riêng)».

## 2. Luồng vé hiện có (đã đọc mã `src/modules/feedback/`)

- Gửi vé: `POST /api/feedback` (ô `feedback.submit` = mọi tài khoản) — một lô **có điều kiện** chèn vé + tin đầu + nhật ký: không chèn khi chạm trần giờ hoặc gửi lại cùng `clientRequestId`.
- Trả lời: `POST /api/feedback/:id/messages` — quyền theo `quyenPhieu` (ADR-0119); lô cũng có điều kiện (trần giờ, vé vừa đổi nhóm). Ghi chú nội bộ chỉ nhóm xử lý viết/đọc; sau chuyển nhóm, nhóm mới không đọc ghi chú nhóm cũ.
- Khung trò chuyện tự làm mới 5 giây (`GET …/messages?since=`, ADR-0127); mỗi lần lấy lại tin của 30 giây gần nhất và thay bản cũ theo `id`, nhưng **chỉ vẽ lại** khi có tin mới hoặc sự kiện mới. Sau khi gửi, nhận việc, chuyển nhóm… giao diện dựng lại cả khung.
- Tài khoản bên ngoài (Đối tác, Tài xế đối tác) chỉ gửi tới nhóm Kỹ thuật (ADR-0119 đ6).

## 3. Thiết kế đề xuất

**3.1 Tệp đi CÙNG tin, trong một yêu cầu** (không tải trước rồi gắn sau). Thân JSON của hai route trên nhận thêm `tep: [{ noiDung: base64 }]` (tối đa 5). Thứ tự giữ khuôn ADR-0123, cộng ba luật mới vì lô vé có điều kiện:
1. Chặn `Content-Length` theo trần riêng của tin có tệp (base64 của 10 MB + 64 KB cho chữ); cộng độ dài base64 của mọi tệp, quá tổng thì 413 **trước khi giải**; rồi kiểm từng tệp (chữ ký, cỡ).
2. **Một lô D1**: vé/tin như cũ + dòng tệp chèn bằng `INSERT … SELECT … WHERE EXISTS (tin vừa chèn)` + nhật ký chỉ mã (gác `changes() > 0`). Tin không chèn (trần giờ, gửi lại, đổi nhóm) thì dòng tệp cũng không chèn — trả 429 / phát lại / 409 như hôm nay.
3. **Đọc lại** dòng tệp của tin; chỉ đặt R2 cho dòng **có thật** (để mọi đối tượng trong kho luôn có dòng — lời hứa của `0104`). Đặt xong thì đánh dấu đã lưu.
4. Toàn bộ phần sau lô bọc trong **một** `try/catch`: không gì ném ra ngoài. Tệp đặt hỏng ⇒ quyết xoá `TAI_LEN_LOI` rồi xoá kho (như ADR-0123); đánh dấu hỏng ⇒ dòng «tải dở dang». Phản hồi luôn 201 kèm số tệp chưa tải được.

Lý do chọn cách này thay vì «tải từng tệp trước»: (a) tệp gắn với tin trong cùng lô, không có tệp «chưa gắn» phải dọn; (b) **né nợ `BL-TEP-PHAT-LAI-500`**: nợ đó chỉ xảy ra khi route trả 5xx sau khi lô có vé đã ghi; ở đây phần sau lô không trả 5xx và không ném, nên lớp vé chung không phát lại câu «đã ghi» sai và không phải sửa ADR-0094. **Giới hạn còn lại, nói thẳng:** Worker chết giữa chừng (hết bộ nhớ, hết giờ CPU) thì không bắt được; khi đó bấm lại sẽ ra «Lần bấm trước đã được ghi» và tải lại trang — tin đã được lưu (đó là phần lô D1), chỉ tệp có thể thiếu và hiện «chưa tải được».

**3.2 Dữ liệu** (module `feedback`, tiền tố `fbk_`, migration chỉ thêm; số đặt lúc thi công, hiện dự kiến `0123` vì nhánh Phần 1 «Bán hàng phụ trách» sẽ lấy `0121`–`0122`):
- `fbk_attachment`: chép cột và trigger của `pty_attachment` (`storage_key` = `fbk/<32 hex>`, `content_kind`, `byte_size`, `content_hash`, ba mốc một chiều `stored_at` / `purged_at` + `purge_reason` / `r2_deleted_at`, 4 cột dấu vết), thay `party_id` bằng `message_id` (tệp thuộc **đúng một** tin, không đổi). Không cột tên tệp gốc. Trigger thêm: tối đa 5 tệp mỗi tin; người tải = tác giả tin.
- Không cần bảng nối (tệp không bao giờ chuyển sang tin khác).
- Hạng dữ liệu: `storage_key`, `content_hash` = **N3** như `pty_attachment` (có thể chứa ảnh giấy tờ gửi nhầm); cột khác N1. Thêm hai cột vào tập N3 ghim của `src/hang-du-lieu.test.ts` (sửa bài có chủ đích, theo hướng siết).
- Trần dung lượng: ngoài trần tin có sẵn, thêm trần **20 tệp mỗi giờ mỗi tài khoản** (điều kiện trong câu chèn, như trần tin).

**3.3 Kho**: kho R2 **riêng mới** `tourdao-sales-ho-tro`, binding `HO_TRO`, chỉ module `feedback` chạm. Không dùng `HO_SO` (ADR-0123 đ1 và hàng rào (1) cấm module khác), không dùng `TEP` (dành cho tin thông báo không xoá được — Hiến chương 5.22 cấm chung kho). Chủ tạo kho bằng **một lệnh** trước lần triển khai; cổng 1e của `npm run trien-khai` mở rộng để kiểm **mọi** kho trong `r2_buckets`.

**3.4 Ai xem được tệp** (suy ra từ ADR-0119/0127 đã duyệt, không hỏi lại): **ai đọc được tin chứa tệp thì xem được tệp** — cùng `quyenPhieu` và cùng **một** đoạn lọc ghi chú nội bộ dùng chung cho danh sách tin, tuyến làm mới và route tải tệp. Không đọc được ⇒ 404 (như mọi route vé, không lộ có tệp). Route mới `GET /api/feedback/:id/tep/:tid`: kiểm `sec-fetch-site` → `quyenPhieu` → tệp thuộc tin **của đúng vé `:id`** và tin hiện được với người xem → tệp đã lưu, chưa quyết xoá → **ghi nhật ký trước** (`feedback_attachment_viewed`, chỉ mã vé + mã tệp) → đọc kho → header như `dauPhanHoiTep` (tên tải về `ho-tro-<8 ký tự mã>.<đuôi>`).

**3.5 Mã dùng lại, không chép tay**: chuyển phần thuần của `src/modules/parties/tep.ts` (nhận loại theo chữ ký, giải base64, khoá ngẫu nhiên, băm, header tải xuống) sang `src/shared/tep-dinh-kem.ts`, tham số hoá tiền tố khoá (`pty/`, `fbk/`) và tên tải về; `parties/tep.ts` gọi lại, bài kiểm cũ của parties giữ nguyên và phải xanh.

**3.6 Giao diện** (`web/ho-tro-gui.ts`, ô trả lời ở `web/ho-tro-luong.ts`):
- Nút «Đính kèm» (chọn nhiều tệp) dưới ô mô tả / ô trả lời; danh sách tệp đã chọn có nút bỏ; kiểm loại và tổng cỡ ngay trên máy để báo sớm (máy chủ vẫn kiểm lại). Câu nhắc: «Đừng gửi ảnh căn cước, bằng lái qua đây.»
- **Ảnh được thu nhỏ trên máy trước khi gửi** (cạnh dài tối đa 2000 điểm ảnh, lưu lại dạng JPG): ảnh chụp điện thoại 3–5 MB còn khoảng 0,3–0,8 MB, nên 5 ảnh vẫn gọn trong một yêu cầu; vẽ lại qua khung vẽ của trình duyệt cũng bỏ luôn toạ độ chụp trong ảnh (giải một phần `BL-TEP-EXIF`). Ảnh trình duyệt không mở được (HEIC trên máy tính) và PDF gửi nguyên. Không thêm thư viện.
- Lời gọi có tệp được chờ lâu hơn (120 giây thay 45 giây) và hiện «Đang gửi tệp…»; nút Gửi khoá trong lúc chờ.
- Trong luồng: ảnh hiện xem trước nhỏ; HEIC không xem được thì đổi sang nút «Tải về»; PDF là thẻ «Tệp PDF · 1,2 MB» có nút «Tải về». Tệp chưa lưu hiện «Đang tải tệp…»; quá 10 phút vẫn chưa lưu thì DTO trả trạng thái «chưa tải được» (không đợi Toàn quyền chạy lại).
- **Mỗi ảnh chỉ tải một lần trong lúc trang mở:** tệp trả `no-store` và luồng hay dựng lại, nên giao diện giữ phần tử ảnh đã tạo trong một bảng **cấp trang** theo mã tệp và gắn lại khi dựng lại (kể cả sau khi gửi, nhận việc, chuyển nhóm) — không tạo thẻ ảnh mới, không tải lại, không ghi thêm nhật ký.
- Vòng làm mới vẽ lại cả khi một tin cũ **đổi trạng thái tệp** (tệp vừa lưu xong vài giây sau tin), không chỉ khi có tin mới: tệp hiện sau tin vài giây với người bên kia.
- Tin phải có chữ (cột `body` đã có ràng buộc 1–4000 ký tự): chọn tệp mà để trống chữ thì báo «Hãy viết vài chữ kèm tệp.»

**3.7 Ngoài phạm vi** (ghi BACKLOG): Word/Excel/văn bản thô; tệp trong email báo (email giữ nguyên, không kèm tệp); phiếu yêu cầu xoá dữ liệu cá nhân (ADR-0126) quét cả vé hỗ trợ — hôm nay phiếu xoá cũng chưa quét chữ trong vé, đây là nợ có sẵn; đo bộ nhớ Worker thật với thân lớn (`BL-TEP-THAN-HAI-LAN`, cùng rủi ro với ADR-0123).

## 4. Hàng rào và tệp phải sửa cùng đợt (đã thử trên bản sao: (4), (5) đỏ khi thêm kho thứ hai)

`src/kho-tep-ho-so.test.ts` (4)(5) đổi sang đếm theo từng kho + hàng rào mới cho `HO_TRO`; `src/so-do-kien-truc.test.ts` (danh sách binding cứng) + `docs/so-do-kien-truc/kien-truc.json`; `scripts/release-lib.mjs` cổng 1e + `src/release-lib.test.ts`; `src/shared/lan-gui-no.ts` (`GHI_NHIEU_LAN`: sửa lý do hai mục feedback, thêm route chạy lại); `src/shared/audit-actions.ts`, `src/shared/lich-su-noi-bo.ts`, `src/shared/lich-su-doi-tac.ts` (hành động nhật ký mới); `docs/data-dictionary.json` + `npm run dict` + `src/hang-du-lieu.test.ts`; `worker-configuration.d.ts`; `tests/audit/harness.mjs`; `src/route-access.test.ts`. Mỗi hàng rào đổi hoặc thêm có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.

## 5. Tiêu chí nghiệm thu (P20 — viết trước khi làm)

1. Gửi vé và trả lời kèm 1–5 ảnh/PDF ⇒ người đọc được tin thấy tệp, mở được. Tệp sai chữ ký (`.html` đổi đuôi `.png`), SVG, quá tổng 10 MB, quá 5 tệp ⇒ từ chối bằng câu tiếng Việt, **không** tạo tin, không đặt R2.
2. Mỗi ca sau một bài chạy đường thật, đều 404: người ngoài vé; thành viên nhóm khác; người gửi mở tệp trong ghi chú nội bộ của vé mình; nhóm mới mở tệp trong ghi chú nhóm cũ sau chuyển nhóm; Quản trị / Nhân sự mở tệp vé nhóm nhạy cảm; mã tệp của vé khác ghép với `:id` vé mình; tệp chưa lưu hoặc đã quyết xoá (không gọi kho). Người không xử lý được gửi ghi chú nội bộ kèm tệp ⇒ 403, không đặt R2. (Và câu 1: tài khoản bên ngoài gửi tệp ⇒ theo lựa chọn của chủ.)
3. Tải xuống: thiếu dòng nhật ký thì không trả tệp; phản hồi có `no-store`, `nosniff`, CSP `sandbox`; `sec-fetch-site: cross-site` bị chặn.
4. Chạm trần giờ / gửi lại cùng `clientRequestId` / vé vừa đổi nhóm khi tin có tệp ⇒ đúng mã như hôm nay (429 / phát lại / 409), không dòng tệp, không đối tượng R2.
5. Kho lỗi khi đặt tệp ⇒ 201, tin còn, số tệp hỏng đúng; dòng tệp hỏng «chờ xoá» thấy được và chạy lại được; gửi lại cùng vé **không** ra câu «Lần bấm trước đã được ghi».
6. Hàng rào tĩnh: chỉ `feedback` nhắc `HO_TRO`; chỉ `parties` nhắc `HO_SO`; mỗi kho đúng một chỗ đặt, một chỗ đọc; thứ tự kiểm quyền → nhật ký → đọc kho; lô D1 trước đặt kho. Quan sát chặn thật một lần (sửa cố ý → đỏ → hoàn nguyên), ghi `docs/SO-HANG-RAO.md`.
7. `npm run trien-khai` dừng ở cổng 1e nếu **một** kho trong `wrangler.jsonc` chưa có trên Cloudflare (bài cho `release-lib`).
8. Kịch bản Chrome màn Hỗ trợ (390 + 1040): chọn tệp, ảnh được thu nhỏ, gửi, xem trước; đếm yêu cầu tải ảnh = 1 dù luồng tự làm mới và sau khi gửi thêm tin; ô gõ 16px; không chữ Anh lộ ra.
9. `npm test`, `npm run typecheck`, e2e `feedback` + `ve-ho-tro*` xanh; người kiểm độc lập ĐẠT.

## 6. Giả định tự đặt (bề mặt, đảo được — ghi lại, không hỏi)

- Tên hiển thị của tệp: «Ảnh 1», «Tệp PDF 2» (không lưu tên gốc, theo ADR-0123).
- Nhật ký khi gửi: một dòng `feedback_attachment_added` «<mã vé> · n tệp» trong cùng lô với tin; không tên tệp, không tiêu đề với nhóm nhạy cảm.
- Mốc «chưa tải được» 10 phút (bằng `DO_DANG_SAU_MS` của ADR-0123); chờ 120 giây cho lời gọi có tệp; ảnh thu nhỏ còn cạnh dài 2000 điểm ảnh.

## 7. Ba lựa chọn chờ chủ (một lần hỏi)

1. **Ai được gửi tệp kèm tin?** Khuyến nghị: **chỉ tài khoản nội bộ trước**; Đối tác và Tài xế đối tác vẫn **xem** được tệp nhân viên gửi cho họ trong vé của họ, mở quyền gửi sau. Phương án khác: mọi người gửi được tin đều gửi được tệp (thêm khoảng 1000 tài khoản bên ngoài tải tệp lên kho).
2. **Loại và cỡ:** Khuyến nghị: **ảnh JPG, PNG, HEIC và PDF; tối đa 5 tệp, tổng 10 MB mỗi tin; ảnh tự thu nhỏ trước khi gửi** (đúng loại của khuôn đã chạy). Phương án khác: thêm Word, Excel — phải viết thêm phần kiểm nội dung, tệp có thể chứa macro.
3. **Gỡ tệp gửi nhầm:** Khuyến nghị: **Toàn quyền gỡ được tệp** (xoá hẳn khỏi kho; tin còn dòng «Tệp đã được gỡ»; nhật ký chỉ mã), dùng lại đường quyết xoá có sẵn của ADR-0123; ngoài ra tệp giữ cùng vé như chữ trong tin, thời hạn giữ chung theo chính sách lưu giữ khi luật sư trả lời (Hiến chương 5.25). Phương án khác: đợt này chưa có nút gỡ — ít việc hơn, nhưng ảnh căn cước gửi nhầm sẽ nằm trong kho không có cách gỡ.

## 8. Sửa so với bản 1 (theo người kiểm độc lập, 28/10)

Lô vé có điều kiện ⇒ dòng tệp chèn có điều kiện, đọc lại trước khi đặt R2 (mục 3.1); bỏ câu sai «tin và tệp hiện cùng lúc» — tệp hiện sau vài giây, vòng làm mới vẽ lại khi trạng thái tệp đổi (3.6); «không trả 5xx» phát biểu lại đúng điều kiện và bọc `try/catch` tổng (3.1); trần 45 giây ⇒ thu nhỏ ảnh + chờ 120 giây (3.6); hạng N3 thay N2, thêm trần 20 tệp/giờ (3.2); câu 3 đổi khuyến nghị sang có nút gỡ (ảnh giấy tờ gửi nhầm); thêm ca hỏng và danh sách hàng rào phải sửa (mục 4, 5). Hai câu sai sự thật trong `DE-XUAT-ADR.md` đã sửa.
