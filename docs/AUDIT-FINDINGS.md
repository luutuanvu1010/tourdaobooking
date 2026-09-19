# Rà soát kiến trúc — phát hiện (2026-09-19)

Phiên chỉ **đánh giá và đề xuất** (theo `docs/AUDIT-BRIEF.md`); không sửa mã, không đổi hành vi. Kèm theo: `docs/ARCHITECTURE.md` (kiến trúc đích, 1 trang), `docs/REFACTOR-PLAN.md` (các bước nhỏ).

## Trạng thái thi công (cập nhật 2026-09-19)

Chủ dự án quyết mục C (2026-09-19): (1) cho `git init`; (2) `0007` gồm cả a+b+c; (3) không cần tạm giữ việc nạp nhân viên/tạo đơn (chưa ai dùng); (4) e2e gọi Google Sheet thật — quản lý nhân viên về sau làm ở bảng Admin; (5) làm router trước M4.

| Mục | Trạng thái | Commit |
|---|---|---|
| A20 git | Xong | `2bd700b` |
| A19 e2e tự động, A12 nhật ký khi tranh chấp | Xong (`npm run test:e2e`, 5 kịch bản) | `ffa631a` |
| A1, A3, A4 migration `0007` | Xong ở local; **chưa áp remote** | `f21eb4c` |
| A2 một nguồn hành động nhật ký | Xong | `b91b5cf` |
| A9 hợp đồng kiểu | Xong | `fb93287` |
| A7, A8, A13 router + lỗi toàn cục + CSRF | Xong | `a938c6e` |
| A5, A6, A14 safeNext, SESSION_SECRET, `_headers` | Xong | `2f55265` |
| A10, A11 đồng bộ lần đầu | Xong (e2e không tái hiện được tranh chấp gốc ở local — xem comment trong `catalog.mjs`) | `91eb305`, `622c819` |
| A15 băm PIN dùng chung | Xong | `cfdc93a` |
| A17 dọn nhỏ | Xong | `88cf076` |
| A18 tài liệu | Xong (bước 10) | commit cuối |
| A16 ghi đè đồng thời | Không sửa (đã chấp nhận) | — |

## Kết luận ngắn

**Nền đã chắc — cần siết, không cần đập.** Đã tự kiểm lại (không chỉ tin brief):
- Đồ thị phụ thuộc đúng là DAG: `auth→staff`; `accounts→auth,staff,audit`; `orders→audit,auth`; `catalog→audit,auth`; `audit→auth`. Không module nào ghi bảng của module khác.
- Mọi chỗ "đọc → kiểm → ghi" đều có điều kiện trong chính câu SQL (`status = from`, `status = 'draft'`, chốt "còn admin khác", mã đơn sinh trong `INSERT`) nên không có lỗ hổng tranh chấp.
- Giao diện không dùng `innerHTML`/`eval` ở đâu cả (đã grep `web/`, `public/`, `src/`); mọi nội dung đi qua `textContent`.
- Mốc: `npm run typecheck` sạch, `npm test` 38/38.

**Việc gấp duy nhất về thời điểm:** các thay đổi schema một chiều (A1, A3) nên **gộp vào một migration `0007` và áp lên remote trước khi nạp 9 nhân viên và tạo đơn thật**. SQLite không `ALTER` được `CHECK`, nên bỏ `CHECK` của `audit_log` phải dựng lại bảng — rẻ nhất khi bảng còn rỗng (remote hiện: 1 admin, 0 đơn, 0 nhật ký).

**Chưa làm trong phiên này (có chủ đích):** chưa `git init` (brief yêu cầu xin phép); chưa chạy 4 kịch bản e2e (chúng ghi vào D1 local, cần dọn tay, `catalog.mjs` cần trạng thái "sạch", `admin.mjs`/`catalog.mjs` gọi Google Sheet thật). Mốc e2e là bước 1 của phiên thi công.

## A. Phát hiện, xếp theo chi phí nếu sửa muộn

**Thứ tự ưu tiên** (theo chi phí nếu sửa muộn; bảng giữ số A để tham chiếu): A20 → A19 → A1 → A3 → A2 → A8 → A7 → A9 → A5 → A6 → A4 → A12 → A13 → A14 → A10 → A15 → A18 → A11 → A17 → A16.

Mức: **Cao** = đắt hoặc nguy hiểm nếu để sau · **Vừa** · **Thấp**. Kết luận: **Làm (0007)** = gộp vào migration trước dữ liệu thật · **Làm** · **Không sửa** (xem lý do).

| # | Phát hiện | Bằng chứng | Mức | Kết luận |
|---|---|---|---|---|
| A1 | `audit_log.action` và `target_type` là `CHECK` liệt kê cứng → mỗi hành động/đối tượng mới phải dựng lại bảng. M4 thêm hành động xuất file dùng lại action có sẵn, nhưng **M5 (`company_profile`) sẽ cần `target_type` mới** → lần dựng lại thứ ba. (brief 3.1) | `migrations/0006_catalog.sql:6-11` | Cao | **Làm (0007)**: dựng lại `audit_log` lần cuối, bỏ `CHECK` của `action`/`target_type`, kiểm ở code (A2). |
| A2 | Danh sách action nằm ở **5 nơi** và đã phải sửa đồng bộ bằng tay. (brief 3.2) | `migrations/0006:7-10`, `src/modules/audit/repository.ts:1-15`, `web/api.ts:48-52`, `web/format.ts:22-43`, `public/audit.html:11-13` | Cao | **Làm**: một file `src/shared/audit-actions.ts` (mã + nhãn + nhóm), server và `web/` cùng import; `<option>` do `web/audit.ts` sinh. Sau A1 thì không còn nơi thứ 5 trong SQL. |
| A3 | `order_item` không lưu dịch vụ nguồn → không truy vết được dòng nào đến từ dịch vụ nào, không thống kê theo dịch vụ được. (brief 3.4) | `migrations/0003_orders.sql:25-34` | Vừa | **Làm (0007)** nếu chủ dự án đồng ý: `catalog_code TEXT NULL`, **không FK** (nhập tay luôn phải chạy được, spec §2.5). Chỉ là `ADD COLUMN`, không dựng lại bảng. Kéo theo: `validateOrder` nhận + kiểm `catalogCode`, form đơn gửi lên khi chọn nhanh. |
| A4 | Bất biến tiền §2.3 chỉ được giữ ở code; SQL cho phép `total ≠ subtotal − discount`. Dự án đã dùng mẫu "kiểm cả ở luật lẫn trong SQL" cho luật admin cuối, nhưng chưa áp cho tiền. | `migrations/0003_orders.sql:11-16, 30-32` | Vừa | **Làm, bằng TRIGGER — không dựng lại bảng**: `BEFORE INSERT/UPDATE` trên `order_item` (`line_total = quantity * unit_price`) và `orders` (`total = subtotal - discount`, `remaining_amount = total - deposit_amount`, không âm) → `RAISE(ABORT, …)`. Đã thử trên D1 local tạm: dòng sai bị chặn (`SQLITE_CONSTRAINT_TRIGGER`). Chỉ thêm câu lệnh, `DROP TRIGGER` là hoàn tác, không đụng FK → **không phải cửa một chiều**, thêm lúc nào cũng được (nên để cùng 0007 cho gọn). Không chọn `CHECK` vì phải dựng lại `orders` — bảng nằm giữa đồ thị FK (`order_item`, `audit_log` cùng trỏ tới). |
| A5 | **Open redirect** ở trang đăng nhập: `safeNext` chặn `//evil.com` nhưng không chặn `/\evil.com`; trình duyệt coi `\` là `/` → `https://evil.com/`. `login.ts` tự chuyển hướng ngay nếu đã đăng nhập, nên một liên kết `sales.tourdao.vn/login?next=/%5Cevil.com` gửi cho nhân viên đưa họ sang trang giả mạo "nhập lại PIN". Đã kiểm bằng `new URL`. | `web/api.ts:107-109`, `web/login.ts:10-14` | Vừa | **Làm** (1 dòng + test): chỉ nhận đường dẫn khớp `^/[A-Za-z0-9._~\-/?=&%]*$` và không bắt đầu bằng `//`. |
| A6 | Thiếu `SESSION_SECRET` → khoá HMAC rỗng → WebCrypto ném `DataError` (đã kiểm) → **mọi API cần phiên trả 500**, không chỉ đăng nhập. Không giả mạo được phiên. Nhưng không có kiểm tra độ dài: một secret yếu (vd chép nguyên `.dev.vars.example`) được nhận âm thầm. Thứ tự triển khai trong HANDOFF là deploy trước, đặt secret sau → có một khoảng app lỗi toàn bộ. | `src/modules/auth/session.ts:6-9`, `.dev.vars.example` | Vừa | **Làm**: chốt chặn khi xử lý request — secret thiếu hoặc < 32 ký tự thì trả 500 có thông báo rõ và ghi log. Khi triển khai: đặt secret ngay sau lần deploy đầu, trước khi báo nhân viên. |
| A7 | Không có bắt lỗi toàn cục: lỗi bất ngờ trả trang lỗi không phải JSON, không có mã tham chiếu. Tuy vậy `observability.enabled` đã bật (lỗi được Cloudflare ghi log) và `web/api.ts` đã xử lý thân không phải JSON ("Có lỗi xảy ra…"). (brief 3.13 — thực tế nhẹ hơn brief mô tả) | `src/index.ts:13-19`, `wrangler.jsonc:6`, `web/api.ts:125` | Vừa | **Làm** cùng router (A8): bọc `fetch`, trả `{error:{code:"internal",message,requestId}}` với `requestId` = header `cf-ray`, `console.error` một dòng JSON. |
| A8 | Không có router: mỗi module tự tách đường dẫn, tự viết khối `405`, tự gọi `requireStaff/requireAdmin`; `AppModule.handle` không nhận `ExecutionContext` nên không module nào dùng được `waitUntil`. Lặp: `intParam` ×2, `escapeLike` ×2, `ID_RE` ×2, `money()` ×2, `MAX_AMOUNT/MAX_PRICE` 100 tỷ ×3, `CODE_RE` ×2. (brief 3.9, 3.7) | `src/shared/http.ts:1-6`; `audit/index.ts:26`, `orders/index.ts:13`; `audit/repository.ts:72`, `orders/repository.ts:120`; `catalog/index.ts:12-13`, `catalog/rules.ts:23`, `catalog/sheet.ts:19-20` | Vừa | **Làm, trước M4** (M4 thêm module mới): router nhỏ (~60 dòng, không thư viện) — route khai `method`, `path`, `auth`; router trả 401/403/404/405/500 và đưa `ctx = {request, env, exec, url, params, staff}`. Gỡ luôn cạnh `audit→auth`, `orders→auth`, `catalog→auth`. |
| A9 | Kiểu DTO chép tay giữa server và `web/api.ts`; DTO admin của catalog còn không có kiểu khai báo (suy từ `adminItem`). Lệch sẽ không bị `typecheck` bắt. (brief 3.10) | `web/api.ts:1-169`, `orders/repository.ts:35-69`, `catalog/index.ts:20-37` | Vừa | **Làm**: `src/shared/contracts.ts` chỉ chứa kiểu; server khai kiểu trả về của hàm map DTO theo file đó; `web/api.ts` re-export. Cơ chế đã có sẵn (`web/` đang import `src/shared/order-lines.ts`). |
| A10 | Đồng bộ lần đầu có tranh chấp: hai request đầu tiên cùng thấy `last_attempt_at IS NULL` → hai lần gọi Sheet, hai dòng nhật ký `catalog_synced`. Không hỏng dữ liệu (upsert lặp lại được). Người đầu tiên mở form đơn có thể chờ tới 8 giây. (brief 3.16) | `src/modules/catalog/service.ts:54-57` | Thấp | **Làm**: giành quyền bằng `UPDATE catalog_sync SET last_attempt_at=? WHERE id='default' AND last_attempt_at IS NULL` rồi xem `meta.changes`. |
| A11 | `applySync` ghi theo lô 40 câu lệnh — **không nguyên tử xuyên lô**. Chấp nhận được: upsert lặp lại được, `last_success_at` chỉ ghi ở cuối, lần sau tự lành. Nhưng tài liệu/comment không được ngụ ý "đồng bộ nguyên tử". | `src/modules/catalog/repository.ts:103, 129` | Thấp | **Làm** (1 dòng comment) — không đổi mã. |
| A12 | Idiom `changes() > 0` (chỉ ghi nhật ký khi `UPDATE` thật sự áp dụng) chịu tải ở 3 nơi nhưng chỉ được bảo đảm bằng comment. Nếu hành vi D1 khác, nhật ký có dòng cho thao tác không xảy ra. | `orders/repository.ts:222, 242`; `accounts/index.ts:184-186` | Thấp | **Làm**: assertion e2e "thao tác bị chặn khi tranh chấp không sinh dòng nhật ký". |
| A13 | CSRF chỉ dựa `SameSite=Lax`. Lax đã chặn POST từ **site khác**; rủi ro còn lại là trang cùng site (`*.tourdao.vn`) gửi form `enctype="text/plain"` — `readJson` không kiểm `Content-Type` nên thân `{"status":"cancelled",…}` vẫn được đọc. (brief 3.14) | `src/shared/http.ts:19-26`, `auth/session.ts:38-39` | Thấp | **Làm** trong router: yêu cầu nhận `content-type: application/json` và `Origin` trùng host cho mọi `POST/PUT/PATCH/DELETE`. |
| A14 | Trang tĩnh không có header bảo mật. `run_worker_first` chỉ gồm `/api/*` nên HTML **không đi qua Worker** — không thêm được từ mã Worker. (brief 3.14) | `wrangler.jsonc:15` | Thấp | **Làm**: file `public/_headers` (Workers Assets hỗ trợ; xác nhận lại trên wrangler hiện tại khi thi công) với `Content-Security-Policy` (`default-src 'self'; frame-ancestors 'none'`; `style-src` cần `'unsafe-inline'` vì có `style=` trong 4 trang HTML và `web/*.ts` gán `style` qua `h()` — hoặc chuyển hết sang class), `X-Content-Type-Options`, `Referrer-Policy`. Thử tay mọi trang **kèm thao tác** (mở hộp Sửa, chọn dịch vụ) sau khi thêm. |
| A15 | Script dòng lệnh tự cài lại băm PIN. Lệch số vòng không làm vỡ (`verifyPin` đọc số vòng từ chuỗi hash) — rủi ro thật là lệch định dạng chuỗi. `create-staff.mjs` còn nhận PIN yếu và không ghi nhật ký. (brief 3.11) | `scripts/staff-lib.mjs:7-10`, `src/modules/staff/password.ts:1`, `scripts/create-staff.mjs:6` | Thấp | **Làm**: `import-staff.mjs` đã import `.ts` từ `src/` được → chỉ cần `password.ts` import `encoding.ts` có đuôi, rồi `staff-lib.mjs` dùng `hashPin` thật; thêm test băm→kiểm khớp; `create-staff` từ chối PIN yếu. `create-staff` giữ vai trò "cửa khẩn cấp" không qua nhật ký — ghi rõ trong README. |
| A16 | Hai admin sửa ghi đè giá cùng một dịch vụ cùng lúc: người sau đè mất thay đổi của người trước (đọc–sửa–ghi cả JSON). | `src/modules/catalog/index.ts:107-128` | Thấp | **Không sửa bây giờ** (2–3 admin, hiếm). Ghi lại; nếu cần thì kiểm `updated_at` khi ghi. |
| A17 | Mã chết / trùng: `PRICE_COLUMNS` không ai dùng; `StaffRole` khai hai lần; `staffModule` có `handle` rỗng vẫn nằm trong danh sách route. | `catalog/repository.ts:165`; `staff/rules.ts:3` + `staff/repository.ts:1`; `staff/index.ts:122`, `src/index.ts:10` | Thấp | **Làm** (dọn nhỏ). |
| A18 | Tài liệu lệch mã (P4) nhiều hơn brief ghi: spec §2.1 đoạn `service_catalog` tự mâu thuẫn; §2.1 chưa ghi `audit_log.staff_id` cho phép NULL (0006); §2.2 thiếu catalog; §5 còn ô chưa tick dù đã xong (Sheet, danh sách nhân viên); §6 ghi M5 gồm quản lý nhân viên (đã làm trước M3); §7 vẫn ghi "đọc Sheet trực tiếp, không cache". README ghi `npm test` chỉ gồm `orders/rules.ts` (thực tế 6 file); HANDOFF-M4 ghi e2e là "script tạm (ngoài repo)" trong khi đã ở `tests/e2e/`. (brief 3.21) | `docs/SPEC-tourdao-sales.md` §2.1, §2.2, §5, §6, §7; `README.md`; `docs/HANDOFF-M4.md` | Thấp | **Làm**: một lượt viết lại tại chỗ §2.1/§2.5/§5/§6/§7 + mục "Lịch sử thay đổi" ngắn ở cuối spec; sửa README/HANDOFF. |
| A19 | Bộ e2e chưa tự động: tài khoản test tạo tay, dọn tay, cổng `8787` cứng, hai kịch bản phụ thuộc Google Sheet thật. Không có test giao diện. (brief 3.18) | `tests/e2e/*.mjs`, `tests/e2e/README.md` | Cao (quy trình) | **Làm trước mọi tái cấu trúc** — REFACTOR-PLAN bước 1. |
| A20 | Chưa phải git repo — không có lịch sử, không revert an toàn. `.gitignore` đã loại `.dev.vars`, `*.local.sql`, `*.local.txt`, `public/js`, `.wrangler` → commit gốc không lộ bí mật hay PIN. (brief 3.19) | thư mục gốc, `.gitignore` | Cao (quy trình) | **Làm đầu tiên — cần chủ dự án đồng ý.** |

## B. Mục trong brief kết luận **không sửa** (hoặc chỉ ghi quy ước)

| Brief | Lý do |
|---|---|
| 3.3 Kiểu thời gian lẫn lộn | Có lý do: `credentials_changed_at` được so **số học** với thời điểm phát hành phiên (`staff/index.ts:47`); `login_attempt.at` là bộ đếm tạm, bị xoá sau 15 phút. Đổi sang ISO chỉ thêm parse mỗi request. → Ghi quy ước trong `ARCHITECTURE.md`. |
| 3.5 Tên bảng `orders` vs số ít | Không phải cửa một chiều: đổi tên sau vẫn không mất dữ liệu, còn đổi bây giờ phải dựng lại bảng đang bị tham chiếu. → Giữ nguyên, ghi quy ước. |
| 3.6 `unit` lưu chuỗi thô | `parseUnit` thuần, có test, suy lại được từ chuỗi gốc bất cứ lúc nào; chuẩn hoá thành cột lại tạo hai nguồn sự thật. Chi phí sửa muộn ≈ 0. |
| 3.7 Tách `staff` / `accounts` / `auth` | Hợp lý: `staff` = dữ liệu + luật thuần, `auth` = phiên + chống dò PIN, `accounts` = API quản trị (cần cả hai + `audit`). Tách để tránh vòng là đúng. Cạnh `audit→auth` được gỡ bằng router (A8), không cần tách module. |
| 3.8 SQL `JOIN` xuyên module | Đọc qua `index.ts` sẽ thành N+1 truy vấn — thụt lùi thật. Thay bằng luật có biên: chỉ `JOIN` lấy nhãn hiển thị, không bao giờ ghi (`ARCHITECTURE.md` luật 4). |
| 3.12 Quy ước import `.ts` | Có lý do (để `node --test`/scripts chạy file thuần). → Ghi quy ước: file thuần và `shared/` dùng đuôi `.ts`; phần còn lại tuỳ. Giữ `allowImportingTsExtensions`. |
| 3.15 Quyền rải rác | Server chỉ có 3 luật: đăng nhập, admin, `canModify` (người lập đơn hoặc admin). Lớp policy riêng cho 3 luật là thêm tầng vô ích. Router (A8) gom 2 luật đầu vào khai báo route; `canModify` ở lại `orders/rules.ts`. Xem lại khi có luật thứ tư. |
| 3.17 Xoay `SESSION_SECRET` | Xoay = mọi người đăng nhập lại; ~10 người, phiên 7 ngày → chấp nhận được. Ghi quy trình (lệnh `wrangler secret put`), không dựng versioning khoá. |
| 3.20 Chuỗi tiếng Việt ghi cứng | Công cụ nội bộ một ngôn ngữ. Tách i18n là chi phí không có người hưởng. |

## C. Cần chủ dự án quyết

1. **Cho phép `git init` + commit gốc?** (bước 0; không lộ bí mật — xem A20.)
2. **Phạm vi migration `0007`** — khuyến nghị theo thứ tự:
   - (a) Bỏ `CHECK` của `audit_log.action`/`target_type` — **khuyến nghị có**.
   - (b) `order_item.catalog_code` nullable, không FK — **khuyến nghị có** (rẻ, chỉ được lợi khi có từ đơn đầu tiên).
   - (c) TRIGGER giữ bất biến tiền trên `orders`/`order_item` — **khuyến nghị có**. Không gấp (thêm lúc nào cũng được, không dựng lại bảng), gộp vào 0007 chỉ để gọn.
   - (d) Chưa cần: liên kết "đơn đã xác nhận bị huỷ → đơn thay thế" (spec §2.3) là `ADD COLUMN` nullable, thêm lúc nào cũng rẻ.
3. **Tạm giữ việc nạp 9 nhân viên và tạo đơn thật cho tới khi `0007` áp lên remote?** Khuyến nghị có. Deploy Worker trước thì không sao.
4. **E2e và Google Sheet:** (a) giữ gọi Sheet thật, đánh dấu "cần mạng", chạy riêng; hay (b) cho phép đổi địa chỉ Sheet qua biến môi trường để e2e dùng CSV mẫu cục bộ (thêm ~5 dòng mã ở `shared/sheets.ts`). Khuyến nghị (b) cho bộ chính + giữ một kịch bản (a) để kiểm Sheet thật.
5. **Router (A8) làm trước M4?** Khuyến nghị có — M4 thêm module mới, làm sau thì phải chuyển thêm một module.
