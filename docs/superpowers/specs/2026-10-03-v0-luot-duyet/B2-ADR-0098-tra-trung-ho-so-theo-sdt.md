# ADR-0098 (nháp): Tra trùng hồ sơ khách theo số điện thoại ở máy chủ, cho mọi vai lập đơn

- **Trạng thái:** **proposed** — AI soạn 2026-10-03 (đợt V0 của lộ trình `docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` §2.5), theo lời chủ chat 2026-10-03 câu 4 (nguyên văn ở `docs/superpowers/specs/2026-10-02-kiem-theo-vai/NGUYEN-NHAN-GOC.md` §8). **Chờ chủ "Duyệt"** trong lượt duyệt V0-B (trang ghép: `LUOT-B-TRANG-GHEP.md` cùng thư mục). Khi được duyệt: chép sang `docs/adr/ADR-0098-tra-trung-ho-so-theo-sdt.md`, ghi dòng "thay câu" vào dòng trạng thái ADR-0014, ADR-0001, ADR-0011 (không sửa thân).
- **Số:** 0098, đo 2026-10-03 (0096, 0097 cho hai ADR cùng đợt V0).
- **Ngày:** 2026-10-03
- **Phạm vi:** module `orders` (`resolveBooker`, luật SĐT trên đơn), hàm công bố của `parties` (`findPartiesByPhone`), giao diện chọn người đặt (`web/booker-picker.ts`), bộ kiểm `scripts/audit-checks.mjs`.
- **Gỡ lỗi:** BH-05 (Thực tập/Đối tác lập đơn ⇒ mỗi lần một hồ sơ khách trùng), BH-02 (SĐT khách trên đơn nhận số sai độ dài, lệch luật SĐT của hồ sơ), BH-21 (nút "Sử dụng thông tin của tôi" rồi "Tạo hồ sơ mới" tạo hồ sơ trùng chính nhân viên — cùng cơ chế) — `docs/superpowers/specs/2026-10-02-kiem-theo-vai/BAO-CAO-LOI-DAY-DU.md` mục 9, 29, 41; NGUYEN-NHAN-GOC.md §3.7.

## Lời chủ dự án (nguyên văn, chat 2026-10-03)

> "… 4- Máy chủ tự tra, yêu cầu là phải tránh việc trùng số điện thoại, vì tên người vẫn có thể trùng."

Câu đã hỏi (NGUYEN-NHAN-GOC.md §6 câu 4): *"ADR-0001 §8 hay ADR-0014 đ5 thắng về tra trùng hồ sơ khi Đối tác/Thực tập lập đơn (khuyến nghị: tra trùng ở máy chủ cho mọi vai, đúng Hiến chương 2.1; Đối tác chỉ thấy 'đã có hồ sơ, dùng lại' không thấy chi tiết)."*

## Bối cảnh

- **Hai ADR đã duyệt mâu thuẫn:**
  - ADR-0001 §8 (`docs/adr/ADR-0001-*.md:27`): *"Khi lập đơn, giao diện **bắt buộc** hiện danh sách hồ sơ trùng số để người dùng chọn 'dùng hồ sơ có sẵn' hay 'tạo mới'; không tự tạo hồ sơ thứ hai âm thầm."*
  - ADR-0014 đ5 (`docs/adr/ADR-0014-*.md:19`): *"CTV **không** tra được hồ sơ khách theo SĐT."*; bảng ô (`:69`): *"lập đơn vẫn tạo hồ sơ khách mới trong cùng batch qua ngoại lệ ADR-0011, không đi qua `party.write`"*.
- **Mã:** `resolveBooker` (`src/modules/orders/service.ts:374-402`) nhánh `new` tạo hồ sơ ở `:397` bằng `newPersonStatements` **không tra trùng**; tra trùng chỉ ở giao diện qua `GET /api/parties/lookup` (`src/modules/parties/index.ts:525-531`, cổng `office` + `party.view`). Đối tác, Thực tập không qua cổng `office` ⇒ 403 ⇒ `web/booker-picker.ts:63-66` bắt mọi lỗi và hiện *"Không tra được hồ sơ — vẫn lưu đơn được, chỉ chưa gắn khách."* kèm nút "Tạo hồ sơ mới" ⇒ mỗi đơn một hồ sơ trùng.
- **Hai chuẩn SĐT cho một dữ liệu:** SĐT khách trên đơn qua `PHONE_RE = /^\+?[0-9][0-9 .\-]{6,18}[0-9]$/` (`src/modules/orders/rules.ts:90,116`, lưu nguyên dạng gõ); hồ sơ và người đặt qua `normalizePhone` (`src/shared/phone.ts:3-8`: bỏ khoảng trắng/chấm/gạch/ngoặc, `+84`/`84…` → `0`, chỉ nhận `^0\d{9}$`).
- **Không có ràng buộc duy nhất** trên SĐT liên hệ: `pty_contact_lookup_ix` cố ý không duy nhất (`migrations/0011_parties.sql:64`, ADR-0001 §8: "số dùng chung là chuyện thật: gia đình, hotline"); `scripts/audit-checks.mjs` không có kiểm hồ sơ trùng số (R-PTY-1…6, MERGE-1…5).
- **Tiền lệ:** Hiến chương 2.1 (`docs/ARCHITECTURE.md:35`, đã duyệt): mỗi người ngoài đời là **một** hồ sơ. ADR-0068 Đ9 (`:68`): máy chủ kiểm trùng ở `POST /api/staff`, 409 kèm danh sách. ADR-0071 đ3b (`:46-50`): người không có `party.view` chỉ nhận cờ "đã có trong Danh bạ", không id, không tên — vì *"khớp đúng SĐT trả tên khách = dò được 'số này là khách tên gì'"*.

## Quyết định

### Đ1 — Khoá nhận dạng hồ sơ khách khi lập đơn là **SĐT đã chuẩn hoá**, không phải tên

Máy chủ tra theo `normalizePhone(SĐT)` **trước khi tạo** hồ sơ người đặt, ở **mọi** đường gọi `resolveBooker` với `newBooker` — `POST /api/orders` (`orders/index.ts:685`), `PUT /api/orders/:id` (nháp, `:761`), `PUT /api/orders/:id/booker` (`:966`) — cho **mọi vai** được lập/sửa đơn (Bán hàng, Quản trị, Toàn quyền, Đối tác, Thực tập — `permissions.ts:78-80`). Tên **không** dùng để khớp (tên người có thể trùng — lời chủ).

### Đ2 — Kết quả tra

| Số hồ sơ cá nhân **đang hoạt động, chưa gộp** có SĐT liên hệ đang hiệu lực trùng số | Máy chủ làm |
|---|---|
| 0 | tạo hồ sơ mới như hôm nay (ngoại lệ ADR-0011 điều 1) |
| 1 | **dùng lại** hồ sơ đó (`booker_party_id` = hồ sơ cũ); **không** tạo hồ sơ thứ hai; tên và SĐT trên đơn vẫn là bản chụp người lập gõ (`orders.customer_name/phone`, `0018:4`) — hồ sơ cũ **không** bị đổi tên |
| ≥ 2 (dữ liệu có từ trước, số dùng chung) | người có `party.view` (văn phòng): **409** kèm danh sách (id + tên, khuôn ADR-0068 Đ9) để chọn một hồ sơ có sẵn — không có lựa chọn "tạo mới"; người **không** có `party.view` (Đối tác, Thực tập): lưu đơn **không gắn** hồ sơ (`booker_party_id = NULL`, trạng thái hợp lệ sẵn có) và báo "Số này đã có nhiều hồ sơ — văn phòng sẽ gắn khách"; không tạo hồ sơ thứ ba, không đoán |

Dòng ≥ 2 là **khuyến nghị của người soạn** (lời chủ chưa nói tới ca này); chủ "Duyệt" ADR là duyệt luôn dòng này, "Sửa" thì nêu cách khác.

### Đ3 — Đối tác, Thực tập chỉ nhận thông điệp, không nhận chi tiết hồ sơ

Phản hồi lưu đơn mang cờ `bookerReused: true` và câu **"Khách này đã có hồ sơ, hệ thống dùng lại."** Không trả id, tên, liên hệ, vai của hồ sơ cũ cho người không có `party.view` (ô `party.view` **không đổi**: Đối tác, Thực tập vẫn `none` — `permissions.ts:122`). Cờ một bit "số này đã có hồ sơ" là mức lộ đã được chấp nhận ở ADR-0071 đ3b. Giao diện `web/booker-picker.ts` với hai vai này bỏ câu "Không tra được hồ sơ — vẫn lưu đơn được" và nút "Tạo hồ sơ mới", thay bằng: **"Nhập số điện thoại — hệ thống tự dùng lại hồ sơ nếu đã có."**

### Đ4 — Một chuẩn SĐT trên đơn

`customerPhone` trên đơn qua **cùng** hàm `normalizePhone` với hồ sơ (bỏ `PHONE_RE`); số Việt Nam không chuẩn (sai độ dài, ký tự lạ) ⇒ 400 câu tiếng Việt chỉ rõ dạng đúng. **Số nước ngoài:** xem Câu hỏi mở Q-98-2 — tới khi chủ trả lời, ADR giữ đúng như lộ trình §6 V4.2 ("tạm từ chối kèm hướng dẫn nhập số liên hệ Việt Nam"), mã nợ `BL-SDT-QT`.

### Đ5 — Chống tạo trùng khi hai người lập đơn cùng số cùng lúc

Câu chèn hồ sơ mới trong lô lập đơn mang điều kiện "chưa có hồ sơ đang hoạt động trùng số" (khuôn câu có cổng + `changes()` của lô ghi); lô thua ⇒ máy chủ chạy lại **một** lần theo nhánh "dùng lại" (Đ2). Không thêm chỉ mục duy nhất (dữ liệu cũ có số dùng chung, ADR-0001 §8).

### Đ6 — Bất biến `R-PTY-7`

`scripts/audit-checks.mjs`: hai hồ sơ cá nhân **đang hoạt động, chưa gộp** có cùng SĐT liên hệ đang hiệu lực đã chuẩn hoá. Mức **lỗi** cho cặp mà hồ sơ mới hơn được tạo **sau** mốc thi hành ADR này (nghĩa là đường tạo đã chặn mà vẫn lọt); mức **cảnh báo** cho cặp cũ (Quản trị gộp bằng ADR-0068). Quan sát chặn thật một lần, dòng `docs/SO-HANG-RAO.md` ghi rõ "phát hiện, không chặn" cho cặp cũ.

## Bấm nhầm thì sao

(Mục áp thử theo đề xuất 5.3 của NGUYEN-NHAN-GOC.md.)
- **Dùng lại nhầm người** (hai người thật chung một số — gia đình): đơn vẫn mang đúng tên khách người lập gõ (bản chụp); văn phòng đổi người đặt bằng `PUT /api/orders/:id/booker` (sẵn có, `order.trip.edit`). Đây là cái giá chủ đã chấp nhận khi chọn khoá là SĐT.
- **Gõ nhầm số:** sửa số trên đơn nháp như hôm nay; hồ sơ đã gắn nhầm thì văn phòng đổi người đặt.

## Thay câu nào (ghi dòng trỏ ở dòng trạng thái văn bản cũ khi duyệt, không sửa thân)

| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| **ADR-0014 đ5** (`:19`) và bảng ô (`:69`) | "CTV **không** tra được hồ sơ khách theo SĐT" ; "lập đơn vẫn tạo hồ sơ khách mới trong cùng batch" | "**Máy chủ** tra theo SĐT chuẩn hoá trước khi tạo; đã có ⇒ dùng lại hồ sơ, không tạo thứ hai; Đối tác / Thực tập chỉ nhận thông điệp 'đã có hồ sơ, dùng lại', không nhận chi tiết hồ sơ." Phần "không tra / sửa danh bạ" (`party.view`, `party.write` = none) **giữ nguyên** |
| ADR-0001 §8 (`:27`) | "giao diện bắt buộc hiện danh sách … chọn 'dùng hồ sơ có sẵn' hay 'tạo mới'" | khi lập đơn: máy chủ quyết theo Đ2 — **không còn** lựa chọn "tạo mới" khi đã có hồ sơ cùng số; chỉ mục không duy nhất **giữ nguyên** |
| ADR-0011 điều 1 (`:20`) | ngoại lệ: tạo hồ sơ MỚI + vai `CUSTOMER` trong cùng lô lập đơn | ngoại lệ chỉ áp khi Đ2 trả "0 hồ sơ trùng" |
| ADR-0068 `:28` (nguồn trùng (a)) | "người lập đơn chọn 'tạo mới' thay vì 'dùng hồ sơ có sẵn'" | nguồn (a) bị chặn ở máy chủ từ ADR này |
| Đặc tả `2026-09-21-n2-lat-1-khach-tren-don.md:120` (giả định 1, số nước ngoài) | "form đơn nhận SĐT rộng (`PHONE_RE`)" | Đ4 + Q-98-2; mã nợ `BL-SDT-QT` |

## Câu hỏi mở (gom vào lần hỏi chủ cuối phiên V0)

- **Q-98-1 — Danh bạ cũng chặn trùng số?** ADR này chỉ chặn ở đường **lập/sửa đơn** (câu hỏi của chủ là về lập đơn). Văn phòng còn tạo hồ sơ / thêm SĐT liên hệ ở màn Danh bạ (`party.write`) — hôm nay chỉ cảnh báo ở giao diện. (A) Áp cùng luật cho Danh bạ: đã có hồ sơ cùng số ⇒ 409 kèm danh sách, không tạo — **khuyến nghị**, vì lời chủ "phải tránh việc trùng số điện thoại" là nguyên tắc chung và để `R-PTY-7` có nghĩa; (B) Danh bạ giữ cảnh báo như hôm nay.
- **Q-98-2 — Số nước ngoài trên đơn:** (A) tạm từ chối, hướng dẫn nhập số Việt Nam (lộ trình V4.2) — mất: khách nước ngoài không có số Việt Nam không lập được đơn có số; (B) nhận số có "+mã nước" khác 84, 8–15 chữ số, lưu dạng chuẩn, **không** tra trùng / không tạo hồ sơ với số đó (đơn không gắn hồ sơ) — **khuyến nghị**, giữ được khách quốc tế mà không làm bẩn hồ sơ; (C) như hôm nay (nhận rộng) — trái lời chủ "một chuẩn".

## Cửa một chiều / hai chiều

- Luật máy chủ, câu chữ giao diện, bất biến: **hai chiều**. Không migration (trừ nếu kế hoạch V4 cần cột mốc cho `R-PTY-7`).
- Hồ sơ đã dùng lại thay vì tạo mới: không có hồ sơ thừa để dọn — hai chiều về dữ liệu.

## Hệ quả

- Bài đỏ trước (đợt V4): `orders` service test — Đối tác tạo đơn với SĐT đã có ⇒ không có hồ sơ mới, `booker_party_id` = hồ sơ cũ (hôm nay tạo mới); hai hồ sơ cùng số + Đối tác ⇒ đơn không gắn, không hồ sơ mới; văn phòng ⇒ 409 kèm danh sách. `orders/rules.test.ts`: `"0912 345 678"` → chuẩn; 19 chữ số → 400. Route test: Đối tác vẫn 403 ở `GET /api/parties/lookup` (không mở đường đọc mới).
- e2e `orders`, `booker`, `nhap-tay-va-gia-doi-tac`; `audit-invariants` sau e2e (R-PTY-7).
- Việc lớn (dữ liệu + quyền xem): người kiểm độc lập kiểm Đối tác / Thực tập không đọc được chi tiết hồ sơ qua phản hồi lưu đơn.
- `docs/SYSTEM-DESIGN.md` §6 (luồng lập đơn), `docs/CHANGE-GUIDE.md` cập nhật cùng lần thi công.
- Xây trên lỗ đang hở: không (TNV-*, F-* không chạm `parties` / `resolveBooker`).
