# Thiết kế A2 — giao diện thông tin chuyến theo dịch vụ

Ngày 2026-09-19. Phần A giai đoạn 2 của `docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md` (§5, §9). A1 (dữ liệu + API) đã xong ở nhánh `worktree-thong-tin-chuyen-di`; A2 làm giao diện cho form lập đơn và trang đơn, dựa trên mockup Claude Design.

**Trạng thái: ĐÃ DUYỆT (chủ dự án, 2026-09-20), gồm cả các mục đánh dấu [GIẢ ĐỊNH].** Chủ dự án chưa trả lời riêng ba quyết định ở `docs/design/a2-mockup/REVIEW.md` §5 mà nói "tiếp"; spec này lấy đúng các đề xuất mặc định (đánh dấu **[GIẢ ĐỊNH]** ở §2) và được duyệt nguyên văn.

**Lưu ý 2026-09-20 — phạm vi và thứ tự thi công chưa chốt:** ngay sau khi duyệt, chủ dự án yêu cầu thiết kế lại mô hình nghiệp vụ (danh tính tách khỏi vai trò, địa điểm, phân công, thanh toán, hoá đơn, đón khách). Phần thị giác và hành vi của thẻ dịch vụ/thông tin chuyến trong spec này giữ nguyên; phần nào của A2 làm trước, phần nào chờ mô hình mới sẽ xác định trong spec nghiệp vụ mới rồi mới lập kế hoạch A2. Mockup vòng 2 (sửa lỗi + trạng thái còn thiếu) có thể chưa xong khi duyệt spec: **hành vi do spec này quy định (spec thắng), hình thức do mockup quy định (mockup thắng)**.

## 1. Mục tiêu và phạm vi

**Làm:**
1. **Form lập/sửa đơn** (`web/order-form.ts`, `public/order-form.html`): phần "Dịch vụ" từ các dòng phẳng thành **thẻ dịch vụ** (bộ đếm khách theo loại, dòng tiền xem trước với đơn giá sửa được, khối Thông tin chuyến), chọn từ danh mục thêm thẻ trực tiếp, dịch vụ nhập tay, cảnh báo/lỗi/xung đột theo mockup.
2. **Trang đơn** (`web/order.ts`): mỗi dịch vụ một khối; đơn nháp hiện nhãn lệch giá/trạng thái danh mục; xác nhận thiếu chuyến hiện danh sách thiếu; đơn đã xác nhận có "Sửa thông tin chuyến" (bảng trượt từ đáy) gọi `PUT /api/orders/:id/trip`.
3. **Nền thị giác**: token của tourdaovn (tên chuẩn) + font tự lưu trữ + token MỚI của app nội bộ, trong `public/app.css`.
4. Sửa đúng 4 lỗi `tsc -p web` mà A1 để lại (`web/order-form.ts` ×2, `web/order.ts` ×2).

**Không làm (ngoài phạm vi):** danh sách đơn có cột/lọc theo ngày khởi hành (A3), vai Guide (phần B), làm lại các trang quản trị/danh mục/đăng nhập, dark mode, sửa đơn khi mất mạng, thay hộp thoại `confirm()` của trình duyệt cho nút Xác nhận/Huỷ, đa ngôn ngữ, mã giảm giá/mùa vụ.

## 2. Quyết định (bản ghi theo P5, Điều 7.2)

| # | Quyết định | Cửa | Phương án bị loại | Nguồn |
|---|---|---|---|---|
| Q1 | **Nền thi công:** nhánh tích hợp mới `a2-giao-dien` = A1 + nhánh PWA (`worktree-pwa-iphone`). Đã kiểm bằng `git merge-tree` (chỉ đọc): hợp chỉ có **2 xung đột nhỏ**, đều ở tài liệu/bộ chạy e2e (`docs/SPEC-tourdao-sales.md`, `tests/e2e/run.mjs`); `web/` và `public/` hợp sạch vì A1 không đụng tới. Cả A1 lẫn PWA giữ nguyên nhánh riêng, `main` chưa đổi | hai chiều | làm A2 thẳng trên nhánh A1 rồi hợp PWA sau (đụng `app.css`, `shell.ts`, `order*.ts` hai lần); hợp PWA vào `main` trước (chưa QA trên iPhone thật) | REVIEW.md §7 |
| Q2 | **Thông tin chuyến trên thẻ:** ≤ 640px thu gọn kiểu accordion (V1) với dòng tóm tắt; > 640px mở sẵn (V2). Thẻ mới thêm ở chế độ thu gọn; dòng tóm tắt hiện "Chưa có ngày khởi hành" kiểu cảnh báo cho tới khi có ngày (giảm nhược điểm "trường trống bị ẩn nên quên") **[GIẢ ĐỊNH]** | hai chiều | luôn mở mọi khổ (form dài ~360px mỗi thẻ) | mockup 1b/1c |
| Q3 | **Token:** dùng tên và giá trị `tokens.css` của tourdaovn; giữ tên cũ (`--c-bg`, `--c-alt`, `--c-line`, `--c-muted`) làm **bí danh** trỏ về token mới để các trang ngoài phạm vi không gãy; thêm token MỚI (mục 6) gồm bộ màu nguy hiểm `--c-danger*` **[GIẢ ĐỊNH — thêm hệ màu mới do chủ dự án duyệt]**. Việc đổi giá trị bí danh làm màu chữ/viền các trang cũ nhích nhẹ về đúng giá trị tourdaovn — chấp nhận | hai chiều (đổi giá trị token) / một chiều theo tourdaovn (thêm hệ màu) | viết lại toàn bộ `app.css` (ngoài phạm vi); dùng màu san hô cho lỗi/huỷ | REVIEW.md §5 |
| Q4 | **Font tự lưu trữ:** Nunito (biến thiên, `latin-viet` + `vietnamese`) và Be Vietnam Pro 700/800 (`latin-viet` + `vietnamese`) dạng `woff2` trong `public/fonts/` (~100 KB, lấy từ Design System của Claude Design đã trích nguyên từ tourdaovn), `font-display: swap`; hiện iPhone đang rơi về `system-ui` | hai chiều | tải từ Google Fonts (thêm phụ thuộc ngoài, phá CSP `default-src 'self'`) | brief tourdaovn §6 |
| Q5 | **Logic thuần tách khỏi DOM**, đặt ở `src/shared/` (theo ARCHITECTURE: `web/` chỉ import `shared`), có `node --test`; `web/` chỉ dựng DOM và gọi API | hai chiều | để logic trong `web/*.ts` (không có test) | ARCHITECTURE |
| Q6 | Không đưa framework/thư viện vào; giữ hàm `h()` (`web/dom.ts`, không `innerHTML`) | hai chiều | Preact/Lit | mã hiện có |
| Q7 | Ô ngày/giờ dùng `<input type="date">`/`type="time"` gốc (iOS mở bộ chọn của hệ thống, giá trị luôn `YYYY-MM-DD`/`HH:MM`) | hai chiều | ô văn bản tự định dạng | mockup hiển thị dạng chữ; giá trị gửi lên không đổi |
| Q8 | Huy hiệu trạng thái: Nháp = kiểu sand, Đã xác nhận = xanh lá, **Đã huỷ = xám** (đề xuất của prompt, chưa có artboard) **[GIẢ ĐỊNH]** | hai chiều | Đã huỷ = đỏ như hiện nay | prompt A2 |
| Q9 | Giới hạn D1 và hằng trần (`MAX_SERVICES`=20, `MAX_LINES_PER_ORDER`=50, `MAX_GUESTS_PER_SERVICE`=50) không đổi ở A2; các hằng nằm trong module máy chủ (`MAX_SERVICES`, `MAX_LINES_PER_ORDER`, `MAX_DAYS_AHEAD`, `confirmWindow`) **chuyển sang `src/shared/`** để form dùng đúng một nguồn với máy chủ | hai chiều | chép hằng vào `web/` (hai nguồn sẽ lệch — P6) | ARCHITECTURE |

## 3. Kiến trúc và tệp

Nguyên tắc: pure logic ở `src/shared/` (test `node --test`), DOM ở `web/` (tsc + đo bằng trình duyệt thật), CSS ở `public/app.css`. Giữ mỗi tệp một trách nhiệm; các tệp `web/` mới dưới ~250 dòng.

| Tệp | Việc | Trạng thái |
|---|---|---|
| `src/shared/trip-rules.ts` | **MỚI** (chuyển từ `orders/service-rules.ts`): `MAX_SERVICES`, `MAX_LINES_PER_ORDER`, `MAX_DAYS_AHEAD`, `confirmWindow(today)`, `MISSING_LABEL` (lý do thiếu → chữ tiếng Việt). `service-rules.ts` import lại, không đổi hành vi (91 test hiện có phải vẫn xanh) | mới + sửa |
| `src/shared/service-form.ts` | **MỚI**, thuần: kiểu `ServiceDraft`, `newCatalogDraft(item)`, `newManualDraft()`, `draftFromDto(dto, catalogIndex)`, `previewLines(draft, catalogIndex)` (dùng `buildLines` cho dịch vụ danh mục, tự tính cho nhập tay, giữ bản chụp cho dịch vụ đã lưu), `draftSubtotal`, `tripWarnings(trip, today)`, `draftIssues(draft)` (lỗi chặn Lưu), `toServiceInput(draft)`, `orderSummary(drafts, discount, deposit)`, `tripSummaryLine(trip)` (dòng tóm tắt của accordion), `tripPayload(services)` cho `PUT /trip` | mới + `service-form.test.ts` |
| `web/service-card.ts` | thẻ dịch vụ: đầu thẻ, bộ đếm, dòng tiền, khối chuyến (`<details>`), sự kiện | mới |
| `web/counter.ts` | bộ đếm −/+ dùng lại (44px, ô số 16px) | mới |
| `web/catalog-picker.ts` | ô tìm + danh sách kết quả (logic hiện có ở `order-form.ts` chuyển sang), chạm kết quả = thêm thẻ | mới (chuyển mã) |
| `web/order-form.ts` | nối trang: tải danh mục/đơn, danh sách thẻ, tóm tắt tiền, lưu, banner lỗi/xung đột | viết lại |
| `web/order-services.ts` | trang đơn: khối dịch vụ chỉ-đọc, nhãn lệch giá/trạng thái danh mục | mới |
| `web/trip-sheet.ts` | bảng trượt "Sửa thông tin chuyến" | mới |
| `web/order.ts` | nối trang: tải, nút theo trạng thái, xác nhận/huỷ, banner `incomplete_trip` | viết lại |
| `web/dom.ts` | thêm vài hàm nhỏ nếu cần (không đổi hàm cũ) | sửa nhẹ |
| `web/tsconfig.json` | thêm `allowImportingTsExtensions` (file thuần import `.ts` gặp TS5097) | sửa |
| `public/app.css`, `public/order-form.html`, `public/order.html` | token, `@font-face`, các khối mới, khung HTML | sửa |
| `public/fonts/*.woff2` | 6–8 tệp font | mới |
| `web/sw/sw.ts` / chính sách cache | thêm `public/fonts/*` vào danh sách tài nguyên tĩnh được cache (kiểm `src/shared/sw-policy.ts`) | sửa nhỏ, phụ thuộc Q1 |

## 4. Bản đồ màn hình ↔ dữ liệu (P2, N1)

Mọi thứ hiện ra đều đến từ một trường của hợp đồng `src/shared/contracts.ts` hoặc `src/shared/order-lines.ts`; không suy ra từ chữ.

| Màn hình / thành phần | Nguồn dữ liệu |
|---|---|
| Danh sách kết quả tìm danh mục | `GET /api/catalog` → `CatalogServiceDto[]` (`code`, `name`, `unit`, `prices`, `notes`, `supported`); chỉ dịch vụ đang hiện |
| Chip đơn vị ("theo người" / "theo nhóm N khách/lượt" / "nhập tay") | `parseUnit(unit)` → `perPax` / `group.size` / `unknown`; `kind: "manual"` = nhập tay |
| Bộ đếm và ghi chú loại khách | `availableCodes(item)`, `PAX_LABEL`, `item.notes[code]`, giá `item.prices[code]` |
| Xem trước dòng tiền | `buildLines(item, pax, unitPrices)` (dịch vụ danh mục) — cùng hàm với máy chủ |
| Nhãn "Khác giá danh mục" | `priceDeviation({unitPrice, catalogPrice})` — **chỉ khi `catalogPrice !== null`** (dịch vụ nhập tay không bao giờ có nhãn; sửa lỗi mockup 1h) |
| Nhãn "Giá danh mục đã đổi" / "Dịch vụ đã ẩn khỏi danh mục" | `OrderServiceDto.catalogStatus` = `price_changed` / `unavailable` (chỉ đơn nháp; `ok`/`null` = không nhãn) |
| Khối Thông tin chuyến | `TripInfoDto` (đọc) / `TripInput` (gửi): `departDate`, `departTime`, `pickupTime`, `pickupPlace`, `checkinDate` (`null`/`""` = cùng ngày khởi hành), `checkinTime`, `checkinPlace`, `note` |
| Cảnh báo ngày (vàng, không chặn Lưu nháp) | `confirmWindow(vnToday(now))`: ngày < hôm nay → "đã qua"; > hôm nay + `MAX_DAYS_AHEAD` → "quá 365 ngày". Cảnh báo giờ: `pickupTime > departTime` khi cùng ngày |
| Tóm tắt tiền | `orderSummary(drafts, discount, deposit)`; số chính thức do máy chủ tính khi lưu (spec A1 §2.3) — giữ dòng "Số trên đây chỉ để xem trước…" |
| Huy hiệu, mã đơn, người lập | `OrderDto.status`, `orderCode`, `staffName`, `createdAt`, `confirmedAt` |
| Nút theo trạng thái | `status` + `canModify` (từ `OrderDetailResponse`) |
| Danh sách thiếu khi xác nhận | thân 409 `incomplete_trip` → `missing: TripGapDto[]` (`serviceId`, `name`, `reasons: MissingReason[]`) → `MISSING_LABEL`: `no_date` "chưa có ngày khởi hành", `past_date` "ngày khởi hành đã qua", `too_far` "ngày khởi hành quá xa (trên 365 ngày)", `no_guests` "chưa có khách" (mỗi dòng hiện `<tên dịch vụ> — <nhãn>`) |
| Lịch sử | `history: AuditEntryDto[]` (đã có `trip_updated` ở `audit-actions`) |

## 5. Hành vi

### 5.1 Form lập/sửa đơn
- **Thêm dịch vụ từ danh mục:** chạm một kết quả → thêm thẻ mới ở cuối, đơn vị `perPax`: `adult = 1`, loại khác 0; đơn vị nhóm: "Số khách" = 1; thẻ thu gọn khối chuyến (Q2); tìm kiếm được xoá và đóng danh sách. Dịch vụ `supported = false` hoặc chưa có giá hiện mờ, không chạm được (như hiện nay, gợi ý nhập tay).
- **Dịch vụ nhập tay:** nút "+ Dịch vụ nhập tay" thêm thẻ trống (tên, số khách chỉ để vận hành, ≥ 1 dòng tiền; "+ Thêm dòng"). Tối đa 20 dịch vụ và 50 dòng tiền mỗi đơn (`MAX_SERVICES`, `MAX_LINES_PER_ORDER`): nút thêm bị vô hiệu kèm chữ giải thích khi chạm trần.
- **Bộ đếm:** − / ô số / +; − vô hiệu ở 0; tổng khách một dịch vụ tối đa `MAX_GUESTS_PER_SERVICE` (50): vượt → viền đỏ + "Tối đa 50 khách." và khoá nút Lưu; ô số gõ trực tiếp được (`inputmode="numeric"`, 16px). Dịch vụ tính theo nhóm chỉ một ô "Số khách" và dòng "7 khách → 2 lượt (làm tròn lên)" (bằng chữ, không dùng ký tự ⌈⌉).
- **Đơn giá:** ô tiền nhóm hàng nghìn khi gõ (như `moneyInput` hiện có); mặc định = giá danh mục; sửa được cho từng loại có khách; khác giá danh mục → nhãn "Khác giá danh mục" + giá danh mục gạch ngang.
- **Xem trước** đổi tức thời khi đổi số khách/đơn giá; số cuối cùng do máy chủ tính (giữ dòng chú thích).
- **Thẻ của dịch vụ đã lưu (sửa nháp):** thẻ nhận `id` dịch vụ. Nếu không đổi `catalogCode` và số khách → giữ bản chụp (hiện giá đã lưu, nhãn theo `catalogStatus`, dòng tiền lấy từ `items` của DTO); dịch vụ đã ẩn/rời Sheet vẫn sửa được chuyến, đơn giá và xác nhận được. **Đổi số khách** của thẻ mà danh mục còn hiện → thẻ chuyển sang giá hiện tại của danh mục, bỏ nhãn cũ. Đổi số khách của thẻ mà danh mục **không còn** dịch vụ đó → bộ đếm chỉ-đọc và nút "Chọn lại từ danh mục" (xoá thẻ, mở ô tìm).
- **Dữ liệu gửi lên:** `ServiceInput` — `kind: "catalog"`: `catalogCode`, `pax`, `unitPrices` (chỉ loại có khách), `catalogPriceSeen` (giá danh mục thẻ đang hiển thị), cộng thông tin chuyến `TripInput` ("" = chưa có); `kind: "manual"`: `name`, `items`. PUT thêm `expectedUpdatedAt = order.updatedAt` lúc tải đơn. Trình duyệt **không** gửi số lượng dòng của dịch vụ danh mục.
- **Chặn Lưu phía trình duyệt** (giảm vòng máy chủ; máy chủ vẫn là nơi quyết định): thiếu tên/SĐT khách; dịch vụ danh mục < 1 khách không phải em bé ("Nhập số khách."); vượt 50 khách; dịch vụ nhập tay thiếu tên hoặc dòng tiền; số ngoài khoảng cho phép. Lỗi hiện trên đúng thẻ và cuộn tới thẻ lỗi đầu tiên; lỗi nhập là chữ + biểu tượng, không chỉ màu.
- **Lưu thành công** → chuyển tới `/order?id=…` như hiện nay.
- **Mở sửa:** chỉ đơn `draft` và `canModify`; ngược lại khoá form kèm thông báo như hiện nay.

### 5.2 Ma trận lỗi phía client
| Phản hồi | Hiển thị | Hành động |
|---|---|---|
| 409 `catalog_changed` (`changes[]`) | banner cát: "Giá danh mục vừa đổi. Đã cập nhật giá mới — bạn xem lại rồi lưu." + từng dòng `Tên · Loại: cũ → mới` (khớp thẻ qua `serviceIndex`, viền cát trên thẻ đó) | tải lại `GET /api/catalog`, cập nhật `catalogPriceSeen`, **giữ đơn giá đã thương lượng**; người dùng bấm Lưu lại |
| 409 `stale` | banner nguy hiểm: "Đơn vừa được người khác sửa. Hãy tải lại để xem bản mới." + nút "Tải lại đơn" | nút tải lại đơn (bản đang gõ mất — nói rõ trong banner) |
| 409 `client_outdated` | banner thông tin: "Trang đã cũ. Hãy tải lại trang." | nút tải lại |
| 409 `not_editable` | banner nguy hiểm, khoá form | về trang đơn |
| 409 `incomplete_trip` (trang đơn) | banner nguy hiểm "Chưa đủ thông tin chuyến để xác nhận đơn." + danh sách theo dịch vụ, mỗi dòng có "Sửa" → `/order-form?id=…&focus=<serviceId>` (form cuộn tới thẻ đó và mở khối chuyến) | — |
| 400 `catalog_unavailable` | banner nguy hiểm nêu dịch vụ, gợi ý "Chọn lại từ danh mục" | — |
| 400 `invalid_input` | banner nguy hiểm với `message` của máy chủ ("Dịch vụ n: …"), cuộn tới thẻ n | — |
| 400 "Dịch vụ n: không thuộc đơn này" ở `PUT /trip` | coi là "tải lại đơn" (đơn vừa được lưu lại ở nơi khác, id dịch vụ đã đổi) | tải lại đơn, thông báo ngắn |
| 401 | về đăng nhập (đã có ở `api()`) | — |
| mất mạng / lỗi lạ | "Không kết nối được máy chủ." | giữ nguyên dữ liệu đã gõ |

Mọi banner: đặt trên đầu form (và ngay trên nút Lưu ở khổ điện thoại để thấy được khi nút dính đáy), có `role="alert"`; nút Lưu bật lại sau khi banner hiện.

### 5.3 Trang đơn
- **Khối dịch vụ** (mỗi dịch vụ): tên + chip đơn vị + mã (nếu có), số khách theo loại (đọc từ `pax`), ngày giờ khởi hành, đón, check-in ("Cùng ngày khởi hành" khi `checkinDate` null), ghi chú, các dòng tiền `SL × đơn giá = thành tiền` (nhãn lệch giá theo `priceDeviation`), tổng dịch vụ; đơn nháp thêm nhãn theo `catalogStatus`.
- **Nút:** Nháp + `canModify` → Sửa / Xác nhận đơn / Huỷ đơn; Đã xác nhận + `canModify` → Sửa thông tin chuyến / Huỷ đơn; Đã huỷ → không nút; `!canModify` → dòng "Chỉ <người lập> hoặc quản trị viên…" như hiện nay. Xác nhận/Huỷ vẫn dùng `confirm()`; sau thành công tải lại.
- **Xác nhận thất bại `incomplete_trip`**: xem 5.2; **không** ghi gì lên máy chủ thêm.
- **Đơn đã xác nhận:** dòng nhắc "Đơn đã xác nhận: dịch vụ, số khách và tiền đã khoá. Chỉ sửa được thông tin chuyến."; số khách/tiền hiển thị kiểu chỉ-đọc có biểu tượng khoá.
- **Bảng "Sửa thông tin chuyến"** (bottom sheet, ≤ 640px trượt từ đáy; > 640px hộp giữa màn hình): mỗi dịch vụ một nhóm trường đã điền sẵn **đầy đủ** giá trị hiện có (vì `PUT /trip` **thay toàn bộ** — trường vắng = xoá); ngày khởi hành không được xoá (ô có nhãn "không được xoá" và Lưu bị chặn nếu trống); cảnh báo đầu bảng "Bản xác nhận đã gửi khách trước đó có thể lỗi thời — cần gửi lại."; nút "Lưu thông tin chuyến" dính đáy bảng; gửi `{ expectedUpdatedAt, services: [{ id, …TripInput }] }` cho **mọi** dịch vụ; thành công → đóng bảng, tải lại đơn; `stale` → banner trong bảng + "Tải lại đơn". Bảng có `role="dialog"`, `aria-modal`, đóng bằng nút ✕/Esc/chạm nền, trả focus về nút mở, khoá cuộn nền.
- **Đơn nháp không có nút "Sửa thông tin chuyến":** đơn nháp sửa mọi thứ trong form (cùng khối chuyến); bảng trượt này chỉ dành cho đơn đã xác nhận.

### 5.4 Khả năng truy cập và cảm ứng
Vùng chạm ≥ 44px (`--tap-min`); mọi phần tử tương tác có `:focus-visible` (vòng 2px `--c-primary`) và `:active`; không lộ hành động chỉ bằng hover; ô gõ ≥ 16px; tương phản chữ ≥ 4,5:1, thành phần UI ≥ 3:1; trạng thái luôn kèm chữ/biểu tượng; `prefers-reduced-motion` tắt chuyển động của bảng trượt/accordion; nhãn `<label>` gắn với ô; `<details>/<summary>` cho accordion (bàn phím, trình đọc màn hình sẵn có).

## 6. Token và CSS

**Giá trị chuẩn** (theo `tourdaovn/src/styles/tokens.css` trên máy, không theo bản GitHub cũ): `--c-primary #0C4A6E`, `--c-primary-strong #082F49`, `--c-primary-soft #DCEBF6`, `--c-accent #C0392B`, `--c-accent-strong #96271A`, `--c-accent-soft #FEF2F0`, `--c-sand #F5A623`, `--c-sand-soft #FBE3B3`, `--c-sand-text #5a4109`, `--c-sand-border #e9d3a4`, `--c-surface #FFFFFF`, `--c-surface-alt #EAF2F8`, `--c-card #FFFFFF`, `--c-text #0F172A`, `--c-text-muted #475569`, `--c-text-inverse #F8FAFC`, `--c-border #D3E1EC`, `--c-green-soft #DCFCE7`, `--c-green-text #166534`; `--s1…--s7`; `--radius-sm 8 / md 12 / lg 18 / pill 999`; `--shadow-card`, `--shadow-overlay`; `--m-fast 180ms`, `--m-base 300ms`.
**Bí danh giữ lại:** `--c-bg`→`--c-surface`, `--c-alt`→`--c-surface-alt`, `--c-line`→`--c-border`, `--c-muted`→`--c-text-muted`, `--c-text` đổi giá trị về `#0F172A`.
**Token MỚI của app nội bộ** (khai ở `:root` của `app.css`, kèm lý do ngay cạnh, theo mockup 1l): `--c-danger #B01235`, `--c-danger-text #8E0E2B`, `--c-danger-soft #FDE9EE`, `--c-danger-border #F1C3CF` (lỗi, "Huỷ đơn", "Xoá"; chữ trên nền nhạt 8,6:1); `--c-green-border #A7E3BC`; `--counter-btn 44px`, `--counter-field 48px`, `--price-field 112px`; đã có sẵn ở nhánh PWA: `--tap-min`, `--bar-h`, `--tabbar-h`, `--tab-icon`, `--fs-tab`, `--c-on-dark`. Bốn vai trạng thái: warning = nhóm `--c-sand-*`, success = `--c-green-soft/-text/-border`, info = `--c-primary-soft` + `--c-primary`, danger = nhóm mới.
**Quy tắc:** không giá trị cứng ngoài `:root` (thay các hex đang viết cứng ở `.alert`/`.badge`); `pwa.mjs` hiện quét khối PWA của `app.css` theo dấu mốc — giữ dấu mốc và thêm vào khối đúng chỗ. Nút bo `--radius-sm` (8px), thẻ `--radius-md` (12px), huy hiệu `--radius-pill`. Cỡ chữ app nội bộ: nội dung 16px, nhãn 14px, huy hiệu 12px, ô gõ 16px; giữ `line-height` thân 1,68 / tiêu đề 1,16 và `letter-spacing: 0`.

## 7. Kiểm thử và nghiệm thu

1. **Unit** (`npm test`): `service-form.test.ts` phủ `previewLines` (theo người, theo nhóm 7 khách → 2 lượt, nhập tay, bản chụp giữ giá cũ, đơn giá sửa), `draftIssues` (thiếu khách, > 50, nhập tay thiếu tên/dòng, dịch vụ nhóm có loại khác), `tripWarnings` (đã qua, quá 365 ngày, đón sau khởi hành, biên hôm nay/+365, 00:30 giờ VN), `toServiceInput` (không gửi `quantity` cho dịch vụ danh mục, `unitPrices` chỉ loại có khách, `id` dịch vụ đã lưu), `tripPayload` (đủ mọi dịch vụ, "" cho trường trống), `tripSummaryLine`, `MISSING_LABEL` đủ bốn lý do; và giữ nguyên 91 test hiện có (việc chuyển hằng sang `shared/` không đổi hành vi).
2. **Kiểu:** `npx tsc --noEmit` và `npx tsc --noEmit -p web` đều **0 lỗi** (hết 4 lỗi A1 để lại).
3. **e2e API** (`npm run test:e2e`): giữ 6/6 xanh (A2 không đổi hợp đồng API). Nếu cần thêm ca (vd cờ `focus`), chỉ là thuần giao diện.
4. **Bằng chứng giao diện thật** theo tiền lệ PWA (`docs/evidence/<ngày>-a2/`): tập lệnh Chrome headless (`puppeteer-core` cài tạm NGOÀI repo, không thêm dependency vào `package.json`), khổ iPhone 390×844 và máy tính 1040: dựng D1 tạm + hai tài khoản thử; chạy luồng đầy đủ — mở form, thêm dịch vụ từ danh mục bằng bộ đếm, sửa đơn giá, thêm dịch vụ nhập tay, lưu nháp, mở trang đơn, xác nhận khi thiếu ngày (thấy danh sách thiếu), bổ sung ngày, xác nhận, "Sửa thông tin chuyến"; chụp từng trạng thái so với artboard; đo vùng chạm ≥ 44px, font ≥ 16px cho ô gõ, không tràn ngang ở 390px; **axe: 0 lỗi critical/serious**; chạy lại trên bản có font tự lưu trữ (kiểm không có FOIT che chữ).
5. **Chấp nhận thị giác:** chủ dự án xem ảnh chụp cạnh mockup cho từng artboard 1a–1k và ký duyệt (như QA PWA).
6. **Quy tắc kiểm tra thủ công còn lại (không tự động được):** bàn phím iOS có che nút Lưu dính đáy không; `<input type="date">` trong PWA đã cài lên Màn hình chính — ghi vào rủi ro, kiểm trên iPhone thật khi có.

## 8. Rủi ro và điều chưa biết
- **iPhone thật:** nhánh PWA cũng chưa kiểm trên máy thật (bàn phím che nút dính đáy; bộ chọn ngày gốc trong PWA). Form dài hơn nhiều so với bản cũ → rủi ro cuộn/bàn phím tăng. Kiểm bằng Chrome giả lập không thay được máy thật.
- **Nhánh PWA chưa merge/deploy:** A2 dựa vào nó (Q1); nếu chủ dự án đổi ý về PWA thì vỏ (`shell.ts`, thanh tab) phải làm lại.
- **Hiệu năng:** 20 thẻ × nhiều ô; render lại từng thẻ (không dựng lại cả danh sách) để không mất focus khi gõ; đo trên khổ iPhone ở đơn cỡ tối đa (chưa có e2e cỡ tối đa — ghi ở spec A1 §11).
- **Design System của Claude Design lệch token trên máy** (dùng GitHub `tourdaovn` main cũ): mockup tự ghi đè ba màu về đúng; cần chủ dự án đẩy bản mới hoặc đính kèm `tokens.css` mỗi lần thiết kế.
- **Cache font trong service worker:** font phải nằm trong danh sách cache tĩnh, nếu không lần mở ngoại tuyến rơi về `system-ui` (chưa kiểm `sw-policy`).
- **Mockup vòng 1 còn 7 lỗi đã biết** (REVIEW.md §3) — spec này quy định đúng ở các chỗ liên quan (nhãn lệch giá không hiện ở dịch vụ nhập tay; chữ thay ký hiệu ⌈⌉; địa điểm rộng hết hàng; placeholder "Cùng ngày"); triển khai theo spec, không theo lỗi mockup.

## 9. Trình tự thi công đề nghị (để kế hoạch chia Task)
0. Nhánh tích hợp `a2-giao-dien` = A1 + PWA (giải 2 xung đột), `tsc` + `npm test` + e2e xanh trước khi chạm giao diện.
1. `shared/trip-rules.ts` (chuyển hằng, test không đổi) + `tsconfig` web.
2. Token + `@font-face` + font + khung HTML + bí danh (chưa đổi hành vi trang).
3. `shared/service-form.ts` + test.
4. Form: `counter`, `service-card`, `catalog-picker`, `order-form` + banner lỗi.
5. Trang đơn: `order-services`, `order`, `trip-sheet` + banner `incomplete_trip`.
6. Bằng chứng giao diện thật, axe, dọn `tsc -p web` về 0, cập nhật `docs` (SPEC §2/§5 ghi thay đổi giao diện; `tests/e2e/README.md`; `HANDOFF-M4.md`).

## 10. Đối chiếu spec A1 §5 → task
| Yêu cầu A1 §5 | Chỗ đáp ứng |
|---|---|
| Form thẻ dịch vụ, bộ đếm −/+ theo loại, ghi chú loại khách cạnh ô nhập, dịch vụ một loại giá chỉ có ô "Số khách" | 5.1, `counter.ts`, `service-card.ts` |
| Thẻ có ngày/giờ khởi hành, giờ + điểm đón, ngày/giờ + nơi check-in (trống = cùng ngày), ghi chú | khối Thông tin chuyến, §4 |
| Dòng tiền sinh bởi cùng `buildLines`/`priceDeviation`, sửa đơn giá, nhãn "khác giá danh mục" | §4, `service-form.ts` |
| Nháp mở lại đúng số khách; `catalogStatus ≠ ok` hiện nhãn; 409 `catalog_changed` → tải lại danh mục, báo giá mới | 5.1, 5.2 |
| "+ Dịch vụ nhập tay" | 5.1 |
| Cảnh báo vàng ngày quá khứ/quá 365 ngày khi lưu nháp | §4, `tripWarnings` |
| Tiền vẫn hai nơi tính (xem trước / chính thức), lệch giá và trần khách dùng hàm/hằng chung | Q9, §4 |
| Trang đơn: mỗi dịch vụ một khối; đơn đã xác nhận có "Sửa thông tin chuyến"; `incomplete_trip` hiện danh sách thiếu | 5.3 |
| Danh sách đơn: cột "Khởi hành gần nhất" + lọc ngày | **A3** (ngoài phạm vi) |
| Việc giao cho A2 ở spec A1 §11 (400 "không thuộc đơn này" = tải lại; xử lý đủ mã lỗi; `allowImportingTsExtensions`; nhắc "không ghi tên khách" ở tên dịch vụ nhập tay) | 5.2, §3 (`tsconfig`), 5.1 (dòng gợi ý dưới ô tên dịch vụ nhập tay: "Tên dịch vụ, không ghi tên khách") |
