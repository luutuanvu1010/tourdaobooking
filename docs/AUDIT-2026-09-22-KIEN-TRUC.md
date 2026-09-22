# Kiểm toán kiến trúc độc lập — tourdao-sales (2026-09-22)

> Vai: người kiểm độc lập, **chỉ đọc + thử phá**; không sửa mã, không đổi hành vi (REPORT FIRST). Nền: `origin/main` @ `f8d18a3` (mã giống hệt nhánh `canh-bao-don-trung` @ `d90ceed`, nhánh đó chỉ thêm một đặc tả).
> Bằng chứng thực nghiệm: `tests/audit/` (bộ thử phá nạp **cả ứng dụng** lên SQLite thật, 17 ca thử phá + 1 kế hoạch truy vấn = 18 test). Chạy: `node --test "tests/audit/*.test.mjs"`.
> Nhãn: **FACT** (quan sát/chạy trực tiếp) · **INFERENCE** (suy luận có căn cứ) · **RISK** · **REC** (khuyến nghị). Độ tin: HIGH/MEDIUM/LOW; chưa đủ bằng chứng = **NEEDS VERIFICATION**.
> Kế thừa: `docs/AUDIT-FINDINGS.md` (2026-09-19, 20 mục, đã thi công). Không lặp lại các mục đã đóng ở đó.

Lệnh đã chạy (2026-09-22, trong worktree `kiem-toan-kien-truc` trên `f8d18a3`): `npm test` → **443/443 pass**; `npm run typecheck` → **thoát 0** (dùng `node_modules` của bản checkout gốc); `npm audit --omit=optional` → **0 vulnerabilities**; `node --test "tests/audit/*.test.mjs"` → **18/18** (17 ca thử phá đúng như mô tả + kế hoạch truy vấn). **Không chạy** e2e (cần mạng + `wrangler dev`), không chạm D1 local/remote, không chạm production.

**Phạm vi thử phá:** thử bằng yêu cầu HTTP thật: `orders`, `parties`, `accounts`/`staff`, `auth`, `dispatch`, `feedback` (mọi module có phạm vi đọc/ghi theo người). **Chỉ đọc mã, không thử:** `catalog` (chỉ admin ghi), `locations` (chỉ admin ghi), `maintenance` (chỉ admin, chặn theo SĐT), `company` (chỉ đọc), `audit` (chỉ admin đọc).

---

## 1. EXECUTIVE VERDICT

**Hệ thống là một sổ đơn hàng nội bộ (CRM bán tour) được xây kỹ, chưa phải ERP.** ~12,5 nghìn dòng mã (TypeScript thuần, không phụ thuộc runtime), một Cloudflare Worker + một D1 (SQLite), ~10 người dùng, dữ liệu production cỡ chục đơn. Các miền ERP cốt lõi — **tồn chỗ/khả dụng, thu tiền, hoàn tiền, hoá đơn, kế toán, nhà cung cấp/công nợ** — **chưa tồn tại** (thu tiền/hoá đơn đã có ADR-0004, chưa có bảng).

**Phần đã xây đúng hướng và đáng giữ:** (1) toàn vẹn nằm **trong CSDL** chứ không chỉ trong mã — trigger tiền, trạng thái chỉ đi tiến, đóng băng dịch vụ sau xác nhận, nhật ký chỉ-thêm (đã thử phá: giữ được); (2) mọi "đọc–kiểm–ghi" có điều kiện nằm ngay trong câu SQL + khoá lạc quan, nên không tìm thấy race condition có hại ở luồng đơn; (3) ma trận quyền một nơi, mặc định từ chối, router chung, chặn CSRF — thử IDOR/leo quyền dọc đều bị chặn; (4) mô hình danh tính Party–Role–Relationship (kiểu Oracle TCA) và kiến trúc tự bảo vệ bằng test (`src/architecture.test.ts` hỏi chính SQLite câu SQL chạm bảng nào).

**Không có phát hiện P0.** Không tìm thấy đường làm hỏng tiền, rò dữ liệu chéo, hay mất khả năng phục hồi bằng API. Có **4 phát hiện P1** phải sửa trước khi mở rộng:

1. **Hồ sơ nhân viên sửa được bởi mọi nhân viên văn phòng** (FACT, đã chứng minh): nhân viên bán hàng đổi tên/ngưng hồ sơ của quản trị viên hay đồng nghiệp; tên giả hiện ở "người lập", "người phụ trách" và **in lên ảnh xác nhận gửi khách**. Đây là trôi kiến trúc: ADR-0007 cấp `party.write` cho "hồ sơ khách/đại lý", rồi migration 0012 đưa hồ sơ nhân viên vào CÙNG bảng mà ma trận không được xét lại.
2. **Lệnh ghi không idempotent** (FACT): gửi lặp tạo đơn = hai đơn + có thể hai hồ sơ khách. Đặc tả "cảnh báo đơn trùng" (đang chờ chủ) giảm phần lớn ca bấm hai lần, nhưng không phải cơ chế chống gửi lặp và không phủ trùng hồ sơ. Khi có thu tiền/hoá đơn (N3), thiếu khoá idempotency = **thu/hoàn tiền hai lần** → phải có trước N3.
3. **Lưới CSDL cho tiền có lỗ** (FACT): `order_item` của đơn đã xác nhận không bị đóng băng; `subtotal = Σ line_total` không được kiểm ở đâu (trigger không diễn đạt được, `audit-invariants` cũng không kiểm). Vi phạm P21 (hai lớp) cho đúng thứ quan trọng nhất sắp tới (tiền).
4. **Phục hồi thảm hoạ chưa được chứng minh** (FACT: không có bằng chứng từng khôi phục thử; INFERENCE: chỉ có Time Travel 30 ngày của chính Cloudflare, không có bản sao ngoài nền tảng).

**Nút thắt lớn nhất không phải kỹ thuật mà là quy trình/con người:** ~31 nghìn dòng tài liệu quản trị/đặc tả/nhật ký cho ~12,5 nghìn dòng mã; mọi thay đổi đi qua ADR–đặc tả–kế hoạch–kiểm độc lập–chủ duyệt, và chủ dự án (không phải lập trình viên) là người duyệt duy nhất (bus factor = 1 ở cả phía quyết định lẫn phía hiểu hệ thống). Kỷ luật này là lý do chất lượng cao; nhưng khi sang ERP (5–10 lần số khái niệm), tốc độ sẽ bị chặn bởi băng thông duyệt chứ không bởi mã.

**Ký xác nhận?** *Có điều kiện.* Nền móng (ranh giới module, toàn vẹn ở CSDL, quyền một nơi, test kiến trúc) **đủ vững để xây tiếp nhiều năm ở quy mô công ty này** (10–100 người dùng, ≤ vài trăm nghìn đơn). Điều kiện: sửa 3 việc ở §22 **trước** khi làm thu tiền/hoá đơn/kế toán.

---

## 2. SYSTEM MAP (tái dựng từ mã)

```
Người dùng (iPhone PWA / trình duyệt)
  │  HTML/CSS tĩnh + JS (web/*.ts → esbuild → public/js)     CSP chặt (public/_headers), không innerHTML, service worker không cache /api/*
  ▼
Cloudflare Workers Assets ──(chỉ /api/* vào Worker: run_worker_first)──►  Worker `tourdao-sales` (src/index.ts = gốc lắp ráp)
                                                                            │ router (src/shared/router.ts): khớp route → cấu hình → CSRF (Origin + JSON)
                                                                            │   → phiên (cookie HMAC) → cổng bảo trì → access public/staff/office/admin
                                                                            │   → handler; lỗi bất ngờ → 500 JSON + requestId (cf-ray)
                                                                            ▼
                         11 module: auth · accounts · orders · dispatch · catalog · audit · locations · parties · company · maintenance · feedback
                                                                            │ (repository = SQL; rules = luật thuần; service = điều phối I/O)
                                                                            ▼
                                                           D1 `tourdao-sales-db` (SQLite) — 19 migration, trigger bảo vệ, 5 view công bố
Ngoài: Google Sheet (CSV công khai: danh mục dịch vụ mỗi 15' qua Cron, danh sách nhân viên theo nút Admin) · Cloudflare Turnstile (đăng nhập)
       · Cloudflare Email Service (báo admin khi có Góp ý, trong waitUntil) · Cloudflare observability (log console JSON)
```

| Thành phần ERP | Hiện trạng (FACT) |
|---|---|
| Frontend | TS thuần, `h()` dựng DOM, PWA; logic form dùng chung với server qua `src/shared/*` |
| Backend/API | 1 Worker, 55 route, router tự viết ~160 dòng |
| Database | D1 duy nhất; không cache, không queue, không search engine, không object storage |
| Background jobs | 1 Cron `*/15` (đồng bộ danh mục); `waitUntil` gửi email |
| AuthN | SĐT + PIN 6 số (PBKDF2 100k), Turnstile, chống dò PIN theo SĐT/IP, cookie HMAC 7 ngày, thu hồi = đổi PIN/ngưng tài khoản |
| AuthZ | Ma trận quyền → thao tác (`src/shared/permissions.ts`), 4 quyền, phạm vi none/own/assigned/ownOrAssigned/any |
| Observability | Log console JSON cho lỗi bất ngờ; `audit_log` nghiệp vụ; không metrics/tracing |
| Payment / accounting / invoice / inventory / supplier / tax | **Không tồn tại** |
| AI/LLM | Không có trong sản phẩm (ADR-0010 điều 3 đặt luật trước khi có) |
| Multi-tenant | Không (một công ty) |

**Module map thực tế** (bounded context thật, không ép khuôn ERP): Identity/Party (`parties`, `staff`, `auth`, `accounts`) · Order (`orders`: đơn = booking = báo giá nháp, gộp làm một) · Product catalog (`catalog`, nguồn Google Sheet) · Operation/Assignment (`dispatch`, mới có "người phụ trách") · Location (`locations`) · Audit (`audit`) · Support (`feedback`) · Platform (`maintenance`, `company`). Không có: Inventory/Departure, Pricing engine, Payment, Receivable/Payable, Invoice, Accounting, Supplier, Contract, Promotion, Notification chung, Reporting.

---

## 3. ARCHITECTURE CONTRACT (rút từ Hiến pháp v2.3.0 + ADR + `docs/ARCHITECTURE.md`)

| # | Bất biến / nguyên tắc | Nguồn |
|---|---|---|
| C1 | Module chỉ import module khác qua `index.ts`; đồ thị không vòng; `shared/` và `web/` không import module | ARCHITECTURE luật 1, 5; ADR-0002 |
| C2 | Chỉ module chủ ghi bảng của mình; đọc xuyên module chỉ qua view `v_*` | ARCHITECTURE luật 3–4; ADR-0002 |
| C3 | Quyền: mặc định từ chối, một bản đồ duy nhất, kiểm ở server | ADR-0005/0007/0009; Hiến pháp Điều 8.5 |
| C4 | Tiền `INTEGER` VNĐ, số dẫn xuất chỉ tính ở server | ARCHITECTURE "Luật dữ liệu" |
| C5 | Ngày dân sự theo giờ VN, dấu thời gian ISO UTC | ARCHITECTURE |
| C6 | Không xoá cứng; hiệu lực bằng `valid_from/to` | ADR-0003 |
| C7 | Trạng thái đơn chỉ đi tiến; đơn không còn nháp thì thành phần/tiền đóng băng | SPEC §2.3; 0008; 0017 |
| C8 | Nhật ký chỉ-thêm, không chứa SĐT/email/MST/PIN | ADR-0003 điều 8; 0017; CLAUDE.md §7 |
| C9 | Một nguồn sự thật cho mỗi thứ | P6, N7 |
| C10 | Toàn vẹn dữ liệu hơn tính năng; toàn vẹn nằm ở CSDL | P10, ADR-0003 |
| C11 | Mọi kiểm soát trọng yếu có ≥ 2 lớp độc lập | P21 |
| C12 | Ràng buộc chỉ có hiệu lực khi có cơ chế cưỡng chế | P16 |
| C13 | Một danh tính (Party) nhiều vai; quyền app ≠ vai hồ sơ | ADR-0001, ADR-0005 |
| C14 | Tác nhân tự động ghi qua API có phiên, có tài khoản riêng | ADR-0010 điều 3 |
| C15 | Migration chỉ thêm, expand–contract hai lần phát hành | ARCHITECTURE; CLAUDE.md §7 |

## 4. CONSTITUTION COMPLIANCE MATRIX

| Nguyên tắc | Kỳ vọng | Thực tế | Trạng thái | Bằng chứng |
|---|---|---|---|---|
| C1 ranh giới import | chỉ qua index, không vòng | ép bằng test, xanh | **PASS** | `src/architecture.test.ts` (ALLOWED_EDGES, vòng) |
| C2 chủ sở hữu bảng | module chủ ghi; đọc qua view | ép đầy đủ cho 7 module "nghiêm"; **5 module cũ (`accounts, audit, auth, catalog, orders`) ở LEGACY** — trong đó có `orders`, module quan trọng nhất; `orders` đọc thẳng `audit_log` (`wonGuard`) | **PARTIAL** | `src/architecture.test.ts:53`; `orders/repository.ts:252` |
| C3 quyền | server, một nơi, mặc định từ chối | đúng cho đơn/admin (R4, R5 PASS); **sai phạm vi cho hồ sơ nhân viên** (F-01) | **PARTIAL** | `permissions.ts:52`; `parties/index.ts:174`; R3/R3b |
| C4 tiền | INTEGER, server tính | đúng; client gửi đơn giá/số lượng, server tính `line_total`/tổng | **PASS** | `orders/rules.ts` `validateOrder`; `service-rules.ts:207` |
| C5 thời gian | VN cho ngày dân sự | `vnToday` được dùng nhất quán; mã đơn theo ngày VN | **PASS** | `shared/vn-date.ts`; `orders/rules.ts` `orderCodePrefix` |
| C6 không xoá cứng | | không có route xoá đơn/hồ sơ; xoá đơn có nhật ký bị FK chặn (D3) | **PASS** | D3 |
| C7 vòng đời đơn | tiến; đóng băng | trạng thái: PASS (trigger 0017). Đóng băng: `order_service` có, **`order_item` và tổng tiền `orders` không** | **PARTIAL** | D1, D2; `0008` chỉ trigger trên `order_service` |
| C8 nhật ký | chỉ-thêm, không PII | trigger chặn UPDATE/DELETE (D3 PASS); log hiện tại không ghi SĐT; **nhật ký cũ production còn SĐT** (đã biết, không xoá được vì chỉ-thêm) | **PASS** (kèm nợ đã biết) | `0017`; CLAUDE.md §7 |
| C9 một nguồn sự thật | | xem §6 bảng "Source of truth": 3 cặp hai nguồn, 2 đã được ghi nợ có chủ ý | **PARTIAL** | §6 |
| C10 toàn vẹn ở CSDL | | mạnh hơn mức thường gặp; lỗ ở tiền đơn đã xác nhận | **PARTIAL** | §7 |
| C11 hai lớp | | trạng thái đơn, admin cuối, người phụ trách: 2 lớp. **Tiền sau xác nhận: 1 lớp (mã)**. **Chống gửi lặp: 0 lớp** | **PARTIAL** | D1, D2, R1 |
| C12 cưỡng chế | | nhiều luật có test máy (kiến trúc, sổ dữ liệu, hook guard); luật "hồ sơ nhân viên chỉ admin sửa" **không tồn tại để cưỡng chế** | **PARTIAL** | |
| C13 Party | một danh tính nhiều vai | mô hình đúng; **hai cờ `active` độc lập** (`staff.active` vs `pty_party.active`, D4); chống trùng danh tính chỉ ở giao diện (R2) | **PARTIAL** | D4, R2 |
| C14 tác nhân tự động | | chưa có tác nhân; luật đã ghi | **NOT IMPLEMENTED** (chưa cần) | ADR-0010 |
| C15 migration | chỉ thêm | 19 tệp, chỉ thêm; test nhận diện theo tên; B5 (siết `staff.party_id`) **treo từ N1**, cột chết `staff.role/full_name` còn | **PASS** (kèm nợ contract) | `src/migrations-*.test.ts` |

**Trôi kiến trúc (drift) — phân loại nguyên nhân:**
- F-01 hồ sơ nhân viên: **(C) nguyên tắc ban đầu không còn đủ** — ADR-0007 viết ma trận trước khi hồ sơ nhân viên vào chung bảng `pty_party` (0012). Mã làm đúng theo ma trận; ma trận cần ADR mới.
- `orders` còn LEGACY: **(A) mã chưa theo kịp** luật SQL-ranh-giới, có ghi "gỡ khi được chạm" — nhưng `orders` được chạm liên tục mà vẫn ở LEGACY.
- `ARCHITECTURE.md` "Luật dữ liệu": "trạng thái đơn chỉ đi tiến … trigger" — đúng; nhưng câu "đơn không còn nháp: không đổi thành phần" (0008) được hiểu là gồm tiền — thực tế trigger không phủ `order_item` → **(B) tài liệu ngầm hứa nhiều hơn mã**.

---

## 5. TOP FINDINGS

### F-01 — P1 · HIGH · Mọi nhân viên văn phòng sửa được hồ sơ của nhân viên khác (kể cả quản trị viên)
- **Location:** `src/modules/parties/index.ts:174` (`PUT /api/parties/:id`, access `office`), cùng họ `POST /api/parties/:id/contacts`, `…/contacts/:cid/end`; `src/shared/permissions.ts:52` (`party.write` = any/any/any/none).
- **Evidence (FACT, chạy thật):** `tests/audit/redteam.test.mjs` R3 — tài khoản SALES đổi tên hồ sơ quản trị viên thành "Kẻ Mạo Danh" và đặt `active=0` → **200**; R3b — tên đồng nghiệp bị đổi hiện ngay ở `staffName` của đơn và ở người phụ trách (`/api/dispatch/handlers`), là tên in trên ảnh xác nhận gửi khách (`SYSTEM-DESIGN.md` §9 "Ảnh xác nhận in người phụ trách hiện tại").
- **Problem:** Tên hiển thị của tài khoản có nguồn duy nhất là `pty_party.display_name` (C13, đúng thiết kế). Nhưng đường ghi dành cho "khách/đại lý" không phân biệt hồ sơ gắn tài khoản. Đường admin (`PATCH /api/staff/:id`) có nhật ký `staff_updated`; đường vòng qua `/api/parties` chỉ ghi `party_updated` với chi tiết "cá nhân" — không nói đổi từ gì sang gì.
- **Why it matters:** mạo danh nội bộ (đổi tên mình thành "Giám đốc"/tên đồng nghiệp), khách nhận ảnh xác nhận mang tên sai; nhật ký hiển thị "ai làm" theo **tên hiện tại** nên đổi tên còn làm sai lệch cách đọc lịch sử cũ. Không leo quyền được (quyền nằm ở `stf_permission`, chỉ admin sửa; đăng nhập đọc `staff.active`, D4) → không phải P0.
- **Failure scenario:** nhân viên nghỉ việc trong tuần cuối đổi tên hồ sơ quản trị viên; mọi đơn và ảnh xác nhận của quản trị viên hiện tên mới; nhật ký không cho biết tên cũ.
- **Recommended fix (cần ADR mới sửa ADR-0007 — N3, Điều 7.2):** thêm ô `party.staff.write` = none/none/any/none; `parties` từ chối sửa/đóng liên hệ của hồ sơ có tài khoản trừ ADMIN (hỏi qua view `v_stf_staff_label.party_id`, cạnh parties→staff chỉ-đọc hoặc gốc lắp ráp tiêm như `isAssigned`); lớp 2 ở CSDL: không khả thi rẻ (trigger không biết ai gọi) → lớp 2 là nhật ký `party_updated` ghi tên cũ → mới + một kiểm `audit-invariants` cảnh báo hồ sơ có tài khoản bị sửa bởi người không phải ADMIN (đọc `updated_by`).
- **Effort:** S (1–2 ngày gồm ADR + test). **Regression risk:** thấp; màn Hồ sơ phải ẩn nút sửa với hồ sơ nhân viên.

### F-02 — P1 · HIGH · Lệnh ghi không idempotent; chống trùng danh tính chỉ ở giao diện
- **Location:** `POST /api/orders` (`orders/index.ts`), `createOrder` (`orders/repository.ts:326`), `resolveBooker` (`orders/service.ts`), `POST /api/parties`.
- **Evidence (FACT):** R1 — gửi cùng thân hai lần → 2 đơn (201, 201). R2 — kèm `newBooker` → 2 hồ sơ khách cùng SĐT. Chỉ mục SĐT **cố ý không duy nhất** (ADR-0001 mục 8) — đúng; phát hiện là máy chủ không có bất kỳ lớp chống trùng nào.
- **Đang có:** đặc tả `docs/superpowers/specs/2026-09-22-canh-bao-don-trung.md` (nhánh `canh-bao-don-trung`, chờ chủ trả lời §6) — cảnh báo đơn của cùng khách trong 7 ngày, bắt được phần lớn ca bấm hai lần có cùng SĐT. **Không phủ:** (i) gửi lặp do mạng khi client không thấy phản hồi (PWA trên 4G — thực tế ở Nha Trang/trên tàu), vì client sẽ nhận `possible_duplicate` và người dùng dễ bấm "Vẫn lưu"; (ii) hồ sơ khách bị tạo trước khi so trùng.
- **Why it matters:** hôm nay: đơn thừa + hồ sơ thừa (dọn tay được). Ở N3 (thu tiền/hoàn tiền/hoá đơn): cùng khuôn "POST ghi vô điều kiện" = **ghi nhận thu tiền hai lần** → sai số tiền đã thu, sai công nợ — lỗi tài chính.
- **Khuôn đã có trong chính repo (FACT, R11):** module `feedback` đã idempotent theo `clientRequestId` do thiết bị sinh — gửi lại trả đúng yêu cầu cũ, không gửi email lần hai (`feedback/index.ts` `POST /api/feedback`, `findByRequest`). Tức là hai module dùng hai khuôn khác nhau cho cùng một vấn đề.
- **Recommended fix:** tổng quát hoá khuôn của `feedback` — khoá idempotency do client sinh (`Idempotency-Key` UUID, lưu một bảng `idem_key(key, staff_id, route, response_hash, created_at)` hoặc cột `client_request_id UNIQUE` trên bảng gốc) — `INSERT … ON CONFLICT DO NOTHING` + trả lại kết quả lần đầu. Làm **một lần ở router/`shared`** để N3 dùng lại; bắt buộc cho mọi lệnh tạo tiền.
- **Effort:** M. **Regression risk:** thấp (thêm cột/bảng mới, client cũ không gửi khoá vẫn chạy như nay).

### F-03 — P1 · HIGH · Lưới CSDL cho tiền không phủ đơn đã xác nhận; không ai kiểm `subtotal = Σ line_total`
- **Location:** `migrations/0008_order_service.sql` (trigger đóng băng chỉ trên `order_service`); `migrations/0007…:29` (tự ghi: "`subtotal = tổng line_total` không kiểm ở đây"); `scripts/audit-checks.mjs` (không có kiểm tiền).
- **Evidence (FACT):** D1 — chèn `order_item` vào đơn đã xác nhận bằng SQL: CSDL cho qua, Σ dòng ≠ tạm tính. D2 — sửa `subtotal/total/remaining` của đơn đã xác nhận (giữ đúng số học): cho qua. D5 — câu kiểm đề xuất trả 0 trên dữ liệu API tạo và bắt được hỏng hóc D1.
- **Why it matters:** hôm nay chỉ SQL tay (chủ dự án chạy `d1 execute`) hoặc một đường mã tương lai quên luật mới gây hỏng được — nhưng N3 **sẽ** thêm "sửa tiền sau xác nhận" (`order.money.edit`) — đúng lúc lớp mã thay đổi thì lớp CSDL phải đang giữ. Vi phạm P21 cho tiền.
- **Recommended fix:** (a) **ngay, rẻ, chỉ đọc**: thêm `MONEY_SUM_CHECK` (có sẵn trong `tests/audit/redteam.test.mjs`) và `total = subtotal − discount` vào `scripts/audit-checks.mjs` mức `fail` → chạy cùng mỗi lần deploy; (b) migration mới: trigger `order_item_frozen_insert/update/delete` khi đơn không còn `draft` (như `order_service`), và trigger chặn đổi `subtotal/discount/total` khi `OLD.status <> 'draft'` — N3 muốn sửa tiền sau xác nhận thì đi qua bảng điều chỉnh chỉ-thêm, không sửa đè.
- **Effort:** (a) XS; (b) S. **Regression risk:** (b) phải kiểm `updateTrip`/`changeBooker` không động tới cột tiền (đọc mã: không động) — chạy e2e.

### F-04 — P1 · MEDIUM · Phục hồi thảm hoạ chưa được chứng minh
- **Evidence:** FACT — `docs/HANDOFF-N1.md` ghi bookmark Time Travel trước mỗi migration và lệnh `time-travel restore`, **không có dòng nào ghi đã khôi phục thử** (grep `restore|khôi phục` chỉ ra lệnh). FACT — không có `wrangler d1 export` định kỳ, không có bản sao ngoài Cloudflare. INFERENCE — Time Travel giữ 30 ngày (gói trả phí); hỏng dữ liệu phát hiện muộn hơn 30 ngày, hoặc mất tài khoản Cloudflare, là không phục hồi được. **NEEDS VERIFICATION:** gói D1 hiện tại và thời hạn giữ thực tế.
- **Why it matters:** "một bản sao lưu chưa từng khôi phục thử không phải bản sao lưu". Khi có tiền thật (N3), đây là rủi ro tồn tại.
- **Recommended fix:** (1) diễn tập khôi phục một lần: `d1 export` production → nạp vào D1 tạm → chạy `audit-invariants --db` trên bản đó → ghi thời gian (RTO) vào `HANDOFF-N1.md`; (2) xuất định kỳ (hằng ngày/tuần) ra nơi ngoài Cloudflare (Google Drive của công ty) — việc của chủ vì cần quyền; (3) ghi RPO/RTO mục tiêu.
- **Effort:** S. **Regression risk:** không (chỉ đọc).

### F-05 — P2 · HIGH · Module quan trọng nhất (`orders`) nằm ngoài luật ranh giới SQL
- **Evidence:** `src/architecture.test.ts:53` `LEGACY = ["accounts","audit","auth","catalog","orders"]`; `orders/repository.ts:252` đọc `audit_log` (bảng của `audit`) để làm `wonGuard`; SQL động (`insertRow`, `listOrders` ghép WHERE). ARCHITECTURE ghi "gỡ khi được chạm" — `orders` được chạm ở N1, A2, v1.0, N2 lát 1 mà chưa gỡ.
- **Why it matters:** N3 (thu tiền) sẽ nối vào `orders`; nếu `orders` không bị ép ranh giới, `billing` dễ đọc/ghi thẳng bảng đơn → coupling khó gỡ.
- **Fix:** đưa `orders` vào STRICT trước N3: `defineSql` tĩnh; `wonGuard` thay bằng chốt trên bảng của chính `orders` (vd cột `orders.write_token` = id request thắng, hoặc so `updated_at = at` của chính request). **Effort:** M. **Risk:** vừa — chạm luồng ghi đơn; e2e + test tranh chấp đã có.

### F-06 — P2 · HIGH · Phiên không thu hồi được theo từng thiết bị; đăng xuất chỉ xoá cookie
- **Evidence:** R9 — token vẫn hợp lệ sau `/api/auth/logout`; `session.ts:4` TTL 7 ngày; thu hồi chỉ bằng đổi/đặt lại PIN (`credentials_changed_at`) hoặc ngưng tài khoản (R10 PASS).
- **Why it matters:** điện thoại mất/đưa người khác → phải nhờ admin đặt lại PIN. Chấp nhận được với 10 người; không chấp nhận được khi có quyền thu/hoàn tiền.
- **Fix:** trước N3: nút "đăng xuất mọi thiết bị" = đặt `credentials_changed_at` (đã có cơ chế, gần như không tốn gì); hoặc bảng phiên. **Effort:** XS–S.

### F-07 — P2 · HIGH · Hai cờ "đang hoạt động" độc lập cho cùng một người
- **Evidence:** D4 — hồ sơ `pty_party.active=0` nhưng tài khoản vẫn đăng nhập, vẫn là người phụ trách; `checkAssignee` đọc `staff.active`, `resolveBooker`/`BOOKER_VALUE` (`orders/repository.ts:269`) đọc `pty_party.active`.
- **Problem:** "nếu hai giá trị khác nhau thì cái nào đúng?" — không có câu trả lời được ghi. Kết hợp F-01: ai cũng ngưng được hồ sơ của nhân viên.
- **Fix:** quyết một luật (ADR): hồ sơ có tài khoản → `pty_party.active` do `staff.active` quyết (đồng bộ trong cùng batch khi admin ngưng/kích hoạt) và cấm sửa trực tiếp; thêm kiểm `audit-invariants`. **Effort:** S.

### F-08 — P2 · MEDIUM · Tiền cọc trên đơn huỷ (nợ đã ghi)
- **Evidence:** R8 — đơn đã huỷ giữ `deposit_amount=200000, remaining_amount=800000`. ADR-0004 đã ghi "Hai nguồn 'đã trả' (N7 hạng có điều kiện)", thay bằng `bil_payment_receipt` ở N3 cùng một lần triển khai.
- **Ghi chú:** không phải phát hiện mới. Rủi ro còn lại: báo cáo/đọc tay coi "còn lại" của đơn huỷ là khoản phải thu. **REC:** giữ đúng cam kết của ADR-0004 (cùng lần triển khai), ghi Nợ hiến pháp mẫu 5.8 nếu tách.

### F-09 — P2 · MEDIUM · Nhật ký không đủ để trả lời "trước/sau" và "từ đâu"
- **Evidence:** `audit_log` có `staff_id, action, target, detail (chữ tự do), created_at`; không có giá trị trước/sau có cấu trúc, không có request id/IP/thiết bị; `party_updated` chỉ ghi "cá nhân". Log lỗi có `requestId` (cf-ray) nhưng `audit_log` không mang nó → không nối được hai nguồn.
- **02:00 test:** "đơn bị tính sai tiền": tìm được ai lập/sửa và lúc nào (có); **không** biết giá/dòng tiền trước lần sửa (đơn nháp bị xoá-rồi-chèn lại dịch vụ và dòng tiền mỗi lần lưu — `updateDraftOrder`), chỉ có "lệch giá danh mục" trong `detail`. Với đơn đã xác nhận thì tiền đóng băng (qua mã) nên đủ.
- **Fix:** thêm cột `request_id` vào `audit_log` (ADD COLUMN, rẻ) + ghi `cf-ray`; với N3: mọi thay đổi tiền là dòng chỉ-thêm (sổ) chứ không sửa đè → trước/sau tự có. **Effort:** S.

### F-10 — P2 · HIGH · Nút thắt con người và khối lượng quản trị
- **Evidence:** 31.397 dòng Markdown trong `docs/` + `playbook/` vs 12.543 dòng mã (không test) — tỉ lệ ~2,5 : 1; hook bảo vệ + 1.540 dòng ca kiểm hook (`src/claude-guard.cases.json`); mỗi việc lớn = ADR + đặc tả + kế hoạch + nhật ký thi công + kiểm độc lập + chủ duyệt. Chủ dự án là người duyệt duy nhất và không phải lập trình viên.
- **INFERENCE:** kỷ luật này là nguyên nhân chính của chất lượng đo được ở trên; nhưng (i) chi phí đọc để vào cuộc (bus factor) phụ thuộc vào việc tìm đúng tài liệu trong 31k dòng; (ii) băng thông duyệt của một người là trần tốc độ khi sang ERP.
- **REC (không cắt kỷ luật, chỉ giảm ma sát):** gộp/lưu trữ các nhật ký thi công đã đóng vào `docs/archive/`; một trang "bản đồ hệ thống 1 trang" (có thể dùng §2 của báo cáo này); phân hạng việc cần chủ duyệt theo rủi ro (tiền/quyền/dữ liệu) và để các việc bề mặt đi theo quy trình nhẹ đã có ở CLAUDE.md §3.

### F-11 — P3 · MEDIUM · Tìm đơn quét toàn bảng
- **Evidence (FACT, EXPLAIN):** `listOrders` với `q`: `SCAN o USING INDEX idx_orders_created` + `LIKE '%…%'` trên 4 cột; lọc theo `status` cũng quét theo `idx_orders_created` (không có chỉ mục `status`). Sinh mã đơn: `SEARCH … COVERING INDEX` (không nghẽn — suy đoán ban đầu của người kiểm là sai, đã đo). OFFSET tới 100.000.
- **Scaling boundary (INFERENCE, NOT MEASURED trên D1 thật):** ≤ 50k đơn không đáng kể; ~500k–1M đơn thì một lần tìm từ khoá hiếm đọc toàn bảng (D1 tính phí theo dòng đọc; độ trễ cỡ trăm ms–giây). Ở cỡ công ty hiện nay (vài nghìn đơn/năm) là > 50 năm.
- **Fix khi cần:** cột `search_text` chuẩn hoá + FTS5, hoặc tìm theo tiền tố SĐT/mã đơn. **Không làm bây giờ.**

### F-12 — P3 · LOW · Dữ liệu cá nhân thật nằm trong repo
- **Evidence:** SĐT chủ dự án gieo trong `migrations/0016_maintenance.sql`; ID Google Sheet (công khai đọc) trong `wrangler.jsonc`. Repo private (memory `reference-github-repo`). **REC:** giữ repo private; không đưa SĐT mới vào migration (dùng biến/secret hoặc SQL runbook).

### F-13 — P3 · MEDIUM · Nợ "contract" của expand–contract treo lâu
- **Evidence:** cột chết `staff.role`/`staff.full_name`, B5 (`staff_party_required`) chờ từ N1 (giờ lấy số 0019), `order_item.service_id` nullable dù mọi dòng đều có dịch vụ, `catalog_code` lặp ở cả `order_service` và `order_item` (có thể lệch, không trigger). **REC:** lịch "contract" cố định mỗi lần phát hành thứ 2.

---

## 6. DOMAIN MODEL REVIEW

- **Identity/Party:** tốt nhất hệ thống. Party (PERSON/ORGANIZATION) + contact point có hiệu lực + role theo nơi + relationship; tài khoản trỏ một hồ sơ (`staff_party_uq`). Nhân viên, khách, đại lý, HDV, tài xế là **vai** của một Party — tránh được silo danh tính kinh điển. Yếu: F-01, F-07, R2 (chống trùng chỉ gợi ý).
- **Order/Booking:** một thực thể `orders` gánh cả *báo giá (nháp)*, *đặt chỗ (xác nhận)*, và *thông tin vận hành* (chuyến theo dịch vụ). Hợp lý ở quy mô này. **Chưa có:** inquiry, quote có hiệu lực, reservation có giữ chỗ, fulfillment (đã đi/không đến), settlement. "Huỷ" không phân biệt huỷ trước/sau thu cọc, không có lý do, không có liên kết đơn thay thế (SPEC §2.3 đã dự kiến).
- **Product:** catalog là **bảng giá chụp từ Google Sheet** (mã, tên, đơn vị giá, giá theo loại khách) + ghi đè của admin. Không có Departure/lịch khởi hành, không có sức chứa → **không có khái niệm tồn chỗ**, nên không có overselling (không có gì để bán vượt). Khi bán tour ghép có giới hạn chỗ, đây sẽ là miền mới hoàn toàn.
- **Time:** tốt. `depart_date`/giờ đón/check-in là `TEXT` ngày/giờ VN có CHECK khuôn; mốc hệ thống ISO UTC; "hôm nay" = `vnToday`; mã đơn theo ngày VN; `valid_from_date` (ngày dân sự) vs `valid_from_at` (UTC) phân biệt có chủ ý. Không có "ngày kế toán" (chưa có kế toán).
- **Money:** `INTEGER` VNĐ, không float, không tiền tệ khác, không thuế, giảm giá cấp đơn, không hoa hồng/net. Đúng cho hiện tại. **RISK (LATER):** khách quốc tế trả USD/đại lý giá net → cần `currency` + tỷ giá chụp theo giao dịch; thiết kế N3 nên chừa cột `currency` ngay từ đầu (rẻ lúc tạo bảng, đắt về sau).
- **State machines:** Đơn `draft → confirmed → cancelled` (+ `draft → cancelled`): ép **cả ở mã và CSDL** (0017) — PASS. Người phụ trách: dòng hiệu lực mở/đóng, chỉ mục duy nhất dòng mở — PASS. Góp ý: luật chuyển ở `shared/feedback-catalog.ts` (chỉ mã). `dsp_assignment_status` PENDING/DONE chưa dùng.

## 7. DATA MODEL REVIEW

- **Khoá/ràng buộc (FACT):** PK TEXT UUID; FK khai đầy đủ, `NO ACTION` (trừ `ON DELETE CASCADE` cũ từ `orders` → `order_item`/`order_service`, đã ghi bẫy trong ARCHITECTURE); unique có điều kiện cho "tối đa một dòng mở" (vai, quan hệ, liên hệ chính, quyền, người phụ trách); CHECK khuôn ngày/giờ; trigger chồng lấn khoảng hiệu lực (trừ `dsp_assignment`, lệch có chủ ý §16).
- **Invariant chỉ ở mã mà CSDL cho phép sai:** Σ dòng tiền = tạm tính (F-03); tiền/dòng tiền đơn đã xác nhận (F-03); `pty_party.active` vs `staff.active` (F-07); `order_item.catalog_code` = `order_service.catalog_code` (F-13); `display_name` = ghép từ `pty_person` (mã giữ, `audit-invariants` R-N1-2 kiểm).
- **Chỉ mục:** đủ cho các truy vấn theo khoá (EXPLAIN §F-11); thiếu cho tìm kiếm tự do và lọc trạng thái — chưa cần.
- **Migration an toàn:** chỉ thêm; dựng lại bảng chỉ ở 0005–0007 khi bảng còn rỗng; test nhận diện migration "siết" theo tên. **Rủi ro còn lại:** D1 không có migration `down`; hoàn tác = Time Travel (mất dữ liệu sau điểm) — đã ghi đầy đủ ở HANDOFF-N1 (cửa sổ đóng băng).
- **Soft delete/temporal:** nhất quán (`active`, `valid_from/to`). Kiểm toán cột WHO (`created_by/updated_by`) có ở mọi bảng mới (ép bằng test).

## 8. SECURITY REVIEW

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Broken access control (IDOR/dọc) | PASS cho đơn/admin; **FAIL phạm vi hồ sơ nhân viên** (F-01) | R3, R3b, R4, R5 |
| CSRF | PASS (Origin cùng trang + JSON bắt buộc + SameSite=Lax) | R6; `router.ts` `checkWriteRequest` |
| SQL injection | PASS (tham số hoá; tên bảng là union literal; module nghiêm SQL tĩnh) | `orders/repository.ts` `WriteTable`; `sql-registry.ts` |
| XSS | PASS (không `innerHTML`/`eval` — grep 0; CSP không `unsafe-inline` cho script) | `public/_headers` |
| Mass assignment | PASS (mọi handler chọn trường tường minh) | `validateOrder`, `validatePartyUpdate` |
| Session | cookie HttpOnly/Secure/Lax, HMAC, TTL 7 ngày; **không thu hồi theo thiết bị** (F-06) | R9, R10 |
| Brute force PIN | PIN 6 số, 5 lần/15'/SĐT + 30/IP + Turnstile trước khi tính lượt; băm giả chống dò SĐT | `auth/throttle.ts`, `staff/password.ts` |
| Secrets | chỉ qua `wrangler secret`; kiểm độ dài `SESSION_SECRET` ≥ 32 | `auth/index.ts` `checkAuthConfig` |
| PII trong log | log mới không ghi SĐT; nhật ký cũ production còn (đã biết) | CLAUDE.md §7 |
| SSRF/path traversal/upload/command injection | không áp dụng (không có upload, không fetch URL do người dùng đưa — Sheet ID là cấu hình) | |
| Dependency vulns | không có dependency runtime; dev (esbuild/typescript/wrangler): `npm audit --omit=optional` → 0 | `package.json` |
| Đọc chéo "chỉ của mình" (Góp ý) | PASS: người khác 404 khi đọc/trả lời, 403 hàng đợi/đổi trạng thái; ghi chú nội bộ ẩn với người gửi | R11 |
| Admin takeover | admin đặt lại PIN của admin khác được (thiết kế, có nhật ký) | `accounts/index.ts` reset-pin |

**Điểm yếu nhất:** F-01 (một nhân viên bình thường sửa được danh tính hiển thị của người khác, đi ra ngoài qua ảnh gửi khách).

## 9. TRANSACTION & CONCURRENCY REVIEW

- **Mô hình (FACT):** D1 tuần tự hoá mỗi `batch()` như một giao dịch; mọi thao tác ghi quan trọng là MỘT batch với điều kiện thắng/thua trong chính câu SQL (`status = from`, `updated_at = expected`, `OTHER_ADMIN`, `insertHandlerIfNone`), nhật ký chỉ chèn khi `changes() > 0`. Đây là cách đúng trên D1 (không có khoá hàng, không giao dịch tương tác).
- **Các ca ERP chuẩn:** slot cuối/overselling — **không áp dụng** (không có tồn chỗ). Payment webhook/refund/invoice/journal — **không tồn tại**. Hai admin cùng hạ quyền admin cuối — chặn trong câu SQL (có test). Hai người cùng đổi người phụ trách — 409 (test `dispatch/service.test.ts` + e2e).
- **Idempotency test (§IX):** Create order ×2 → **FAIL** (R1). Create feedback ×2 cùng `clientRequestId` → **PASS** (R11). Confirm ×2, Cancel ×2 → **PASS** về kết quả nghiệp vụ (lần 2 trả 409, nhật ký 1 dòng — R7); lưu ý client nhận 409 chứ không phải "đã xong", giao diện phải tải lại. Capture payment/refund/invoice/journal/webhook — **không tồn tại**; F-02 là điều kiện tiên quyết trước khi chúng tồn tại.
- **Race còn lại (đã biết, chấp nhận):** hồ sơ mới trong `booker.before` không mang điều kiện thắng — nếu sửa đơn thua tranh chấp, hồ sơ vừa tạo vẫn còn (ghi trong `updateDraftOrder`); ghi đè giá danh mục đồng thời (A16 cũ).
- **Nguy hiểm nhất hiện nay:** gửi lặp tạo đơn/hồ sơ (F-02) — không phải race giữa hai người mà là retry của một người.

## 10. PERFORMANCE & SCALE REVIEW

- **Critical paths (đếm truy vấn từ mã, FACT):** mọi request đã đăng nhập = 1 truy vấn phiên (`findById` + subquery quyền) + 1 truy vấn bảo trì; `GET /api/orders/:id` thêm `isAssigned` + batch 3 SELECT + (nháp) danh mục + nhật ký ≈ 7 truy vấn; `POST /api/orders` ≈ 5 + 1 batch. Không N+1 (danh sách người phụ trách dùng một lời gọi theo trang).
- **Không đo p50/p95/p99** trên D1 thật: **NOT MEASURED** (cần `wrangler dev --remote` hoặc production — bị cấm cho AI). Đề xuất đo: bật Workers Analytics / `wrangler tail` một tuần, ghi phân vị theo route.
- **Mô phỏng quy mô (INFERENCE):**

| Tải | Vỡ trước |
|---|---|
| 10 → 100 người dùng | không có gì vỡ (D1 ghi tuần tự vẫn dư sức: vài request ghi/giây) |
| 1.000 người dùng đồng thời | trần ghi đơn luồng của một D1 (cỡ vài trăm–nghìn ghi/giây tuỳ câu) + giới hạn truy vấn/lần gọi Worker; chưa phải vấn đề của công ty này |
| 10.000 | một D1 không đủ cho ghi; cần tách DB theo miền hoặc Postgres (Hyperdrive) — **không thực tế cho doanh nghiệp này** |
| 100k khách / 1M khách | danh sách hồ sơ có phân trang + chỉ mục tên/SĐT (tìm `LIKE` giữa chuỗi sẽ quét) |
| 10M giao dịch | vượt trần 10 GB/DB của D1 (INFERENCE ~1 KB/đơn kèm dịch vụ/dòng tiền/nhật ký → ~10 GB); nhật ký là bảng lớn nhất |

**Ranh giới quy mô thật đầu tiên:** tìm kiếm đơn/hồ sơ bằng `LIKE '%…%'` (F-11), rồi kích thước một D1. Cả hai còn rất xa.

## 11. TEST ARCHITECTURE REVIEW

- **Có (FACT):** 443 test đơn vị/luật thuần + migration trên SQLite thật + **test kiến trúc** (ranh giới import, chủ bảng, SQL qua EXPLAIN, sổ dữ liệu ↔ schema, cột kiểm toán) + test hàng rào AI (hook); 16 kịch bản e2e trên D1 local thật (có tranh chấp song song thật); `audit-invariants` chỉ-đọc chạy được trên remote; kịch bản Chrome thật cho giao diện.
- **Thiếu:** test hợp đồng tích hợp Google Sheet ngoài e2e cần mạng; kiểm bất biến tiền trên dữ liệu (F-03); property-based test cho tiền/ngày (đề xuất: sinh ngẫu nhiên đơn giá/số lượng/giảm/cọc quanh biên `MAX_AMOUNT_VND` và ngày quanh 00:00–07:00 giờ VN — `buildLines`, `validateOrder`, `vnToday`, `confirmWindow`); load test; failure test (Sheet chết giữa đồng bộ đã có `syncGuard`; D1 lỗi giữa batch — nguyên tử theo D1); **diễn tập khôi phục** (F-04).
- **Chất lượng:** test kiểm hành vi/bất biến chứ không chi tiết cài đặt; mock tối thiểu (D1 giả = SQLite thật). Rủi ro nhỏ: D1 giả khác D1 thật ở giới hạn/độ trễ — đã bù bằng e2e.

## 12. DESIGN SYSTEM REVIEW

- Token ở `:root` của `public/app.css` (446 dòng); ngoài khối token chỉ còn ~34 giá trị `1px` (viền), vài breakpoint (`640/641/960px`) và `#fff` ×8 — giá trị thô thấp; phần PWA có luật "chỉ token" ép bằng `tests/e2e/pwa.mjs`. Ô gõ 16px, vùng chạm 44px (token `--tap-min`). Hộp thoại có `role=dialog`, `aria-modal`, `inert`, trả focus.
- Trùng lặp nhỏ (bảng sheet dùng chung `.sheet*` — đúng Rule of Three). **Không đề xuất trừu tượng hoá thêm.** `#fff` nên thành `--c-on-primary` khi chạm tới (P3).

## 13. AI CODE QUALITY REVIEW

- **Tốt bất thường cho mã AI (FACT):** 1 TODO/FIXME trong toàn bộ `src/web/scripts`; không `innerHTML`; không dependency runtime; hằng/luật dùng chung server–web ở `src/shared/` (một `buildLines` cho cả xem trước và tính thật — không hai cài đặt).
- **"Trầm tích AI" tìm thấy:** (i) **chú thích dày đặc, dài tới hàng chục dòng mỗi hàm**, lặp lại lý do từ ADR — tăng chi phí đọc và dễ lệch khi mã đổi (P2); (ii) các idiom chịu tải chỉ đúng nhờ **thứ tự câu trong batch** (`changes() > 0` nói về câu ngay trước) — đúng nhưng mong manh, được bảo vệ bằng chú thích + test (`patchStaffStatements` ghi "Sửa ở đây phải giữ hai điều đó"); (iii) ngoại lệ tương thích PWA cũ (`noBookerKeys`, `client_outdated`) sống trong route đơn; (iv) hàng rào quản trị AI (hook + 1.540 dòng ca kiểm) lớn hơn nhiều module nghiệp vụ.
- **Không tìm thấy:** wrapper vô dụng, framework chung chỉ một ca dùng (router ~160 dòng là vừa đủ), mã chết đáng kể (ngoài cột chết đã ghi).

## 14. BUILD vs BUY MATRIX

| Thành phần | Hiện tại | Khuyến nghị | Lý do |
|---|---|---|---|
| Mô hình Party, đơn, luật tiền, quyền, trạng thái | tự xây | **OWN** | đây là nghiệp vụ và ontology riêng |
| Router/HTTP | tự xây ~160 dòng | giữ (OWN nhẹ) | nhỏ, đã test; thay bằng Hono không lợi gì đáng kể |
| Xác thực SĐT+PIN, phiên | tự xây | giữ ở quy mô nội bộ; **cân nhắc Cloudflare Access (OIDC Google Workspace)** nếu công ty có tài khoản Google cho nhân viên | tự xây auth là rủi ro; nhưng PIN trên iPhone phù hợp người dùng hiện tại |
| Chống bot | Turnstile | MANAGED | đúng |
| DB | D1 | MANAGED, giữ | đủ lớn cho doanh nghiệp này nhiều năm |
| Sao lưu | Time Travel | MANAGED + **xuất định kỳ ra ngoài** | F-04 |
| Email | Cloudflare Email Service | MANAGED | đúng |
| Observability | log console | MANAGED (Workers Logs/Analytics); thêm Sentry-like khi có tiền | chưa cần tự xây |
| Danh mục giá | Google Sheet | giữ tới khi cần lịch khởi hành/sức chứa | Sheet là giao diện quản trị rẻ nhất |
| Hoá đơn điện tử, thanh toán | chưa có | **EXTERNAL SaaS** (nhà cung cấp HĐĐT VN; cổng thanh toán) | ADR-0004 đã loại tự xây |
| Kế toán (sổ cái, BCTC) | chưa có | **EXTERNAL** (MISA/Fast…) + xuất dữ liệu; hệ thống giữ **sự kiện kinh tế** (thu, hoàn, xuất HĐ), không giữ bút toán | §XIII: nghiệp vụ ≠ bút toán |
| Tìm kiếm | SQL LIKE | giữ; FTS5 khi cần | F-11 |
| Workflow/queue | không có | chưa cần; Cloudflare Queues khi có webhook | |

## 15. ARCHITECTURAL DEBT MAP

```
F-02 idempotency ──► chặn N3 (thu/hoàn tiền, hoá đơn)
F-03 lưới tiền    ──► chặn N3 "sửa tiền sau xác nhận" (order.money.edit)
F-05 orders LEGACY ─► N3 billing nối vào orders ─► coupling billing↔orders
F-08 cọc trên đơn (ADR-0004) ─► phải gỡ cùng lần có bil_payment_receipt ─► cần F-02 + F-03 trước
F-01 + F-07 hồ sơ nhân viên ─► ADR sửa ADR-0007 ─► B5 (staff_party_required) nên đi cùng
F-13 contract treo (cột chết, B5) ─► mỗi migration mới phải né
F-04 DR chưa chứng minh ─► độc lập, làm ngay
F-09 nhật ký thiếu request_id/trước-sau ─► sổ N3 chỉ-thêm giải phần tiền
```

## 16. BOTTLENECK MAP

| Loại | Nút thắt |
|---|---|
| Kiến trúc | một D1 cho mọi thứ (xa); `orders` là trung tâm mà chưa bị ép ranh giới (F-05) |
| Phát triển | quy trình ADR/đặc tả/kế hoạch/kiểm độc lập cho mọi việc lớn; chú thích dày |
| Dữ liệu | tìm kiếm `LIKE` (F-11); danh mục phụ thuộc Google Sheet công khai (Sheet đổi cột → `syncGuard` chặn, cần người sửa) |
| Vận hành | deploy tay (Cloudflare chưa nối GitHub), migration remote do chủ chạy tay theo runbook; không có cảnh báo tự động khi lỗi |
| Con người | chủ dự án là người quyết + người duyệt + người chạy lệnh production duy nhất; bus factor = 1 |

## 17. TESTS THAT MUST PASS (Architecture Acceptance Test Suite)

Đánh dấu: ✅ đã có · 🆕 đã viết trong `tests/audit/` (đặc tả hiện trạng) · ⬜ đề xuất.

| Nhóm | Test | Mục đích / Thiết lập / Hành động / Kỳ vọng / Nếu đỏ |
|---|---|---|
| A Kiến trúc | ✅ ranh giới import, chủ bảng, SQL qua EXPLAIN | `src/architecture.test.ts` |
| A | ⬜ `orders` trong STRICT | bỏ `orders` khỏi `LEGACY` → test xanh; đỏ = còn SQL động/đọc chéo |
| B Domain | ✅ trạng thái chỉ đi tiến (0017) | |
| B | 🆕→⬜ đơn không-nháp: không thêm/sửa/xoá `order_item`, không đổi tiền | D1/D2 hiện khẳng định lỗ; sau sửa phải đảo |
| B | ⬜ hồ sơ có tài khoản chỉ ADMIN sửa được | SALES `PUT /api/parties/pty-<admin>` → 403; đỏ = F-01 |
| C Database | 🆕 `MONEY_SUM_CHECK` = 0 | đưa vào `scripts/audit-checks.mjs` mức `fail` |
| C | ⬜ hồ sơ của tài khoản đang hoạt động thì `pty_party.active = 1` | F-07 |
| D Transaction | ✅ thắng/thua trong batch (dispatch, accounts) | |
| E Concurrency | ✅ e2e `admin-race`, `dispatch` | |
| E | ⬜ cùng `Idempotency-Key` ×10 → 1 đơn, 10 phản hồi giống nhau | F-02 |
| F Security | 🆕 R4 IDOR, R5 dọc, R6 CSRF, R10 ngưng tài khoản, R11 Góp ý | |
| F | ⬜ "đăng xuất mọi thiết bị" làm token cũ 401 | F-06 |
| G Performance | 🆕 kế hoạch truy vấn câu nóng (`query-plan.test.mjs`) | ⬜ ngưỡng p95 theo route từ số đo thật |
| H Failure | ✅ Sheet lỗi/`syncGuard`; ⬜ D1 lỗi giữa batch (không dòng nào đổi) | |
| I Observability | ⬜ mọi dòng `audit_log` mới có `request_id` khớp log lỗi | F-09 |
| J Disaster | ⬜ diễn tập: export → nạp D1 tạm → `audit-invariants` xanh → ghi RTO | F-04 |

## 18. RED TEAM RESULTS

Tất cả chạy thật trên cả ứng dụng (`tests/audit/redteam.test.mjs`), trừ khi ghi khác.

| Ca | Tấn công | Kết quả |
|---|---|---|
| R1 | gửi lặp tạo đơn | **phá được**: 2 đơn |
| R2 | gửi lặp kèm khách mới | **phá được**: 2 hồ sơ cùng người |
| R3 | SALES đổi tên + ngưng hồ sơ admin | **phá được**: 200 |
| R3b | tên giả lan sang người lập/người phụ trách | **phá được** |
| R4 | SALES khác sửa/huỷ/đổi chuyến/đổi khách/nhận đơn người khác | chặn (403; nhận = 409 theo thiết kế) |
| R5 | FIELD vào API văn phòng; SALES vào API admin; ACCOUNTING lập đơn; không đăng nhập | chặn |
| R6 | POST từ subdomain khác / không Origin / `text/plain` | chặn (403/403/415) |
| R7 | xác nhận ×2, huỷ ×2 | chặn (409), nhật ký 1 dòng |
| R8 | đơn huỷ còn "còn lại phải thu" | có (nợ ADR-0004) |
| R9 | dùng lại cookie sau đăng xuất | **dùng được** |
| R10 | phiên của tài khoản vừa bị ngưng | chặn ngay |
| R11 | đọc/chen trả lời/đổi trạng thái Góp ý của người khác; ghi chú nội bộ; gửi lặp | chặn (404/403); nội bộ ẩn; gửi lặp → cùng một yêu cầu |
| D1/D2 | SQL tay sửa tiền đơn đã xác nhận | **CSDL cho qua** |
| D3 | sửa/xoá nhật ký, lùi trạng thái, xoá đơn | chặn |
| D4 | hồ sơ nhân viên bị ngưng | tài khoản vẫn chạy (hai nguồn) |

## 19. DELETE / SIMPLIFY LIST

| Hạng mục | Hành động | Ghi chú |
|---|---|---|
| `staff.role`, `staff.full_name` | DELETE (contract) | cần dựng lại bảng `staff` → gộp với B5 |
| `order_item.catalog_code` (trùng `order_service.catalog_code`) | SIMPLIFY | giữ một nơi hoặc trigger khớp |
| `ON DELETE CASCADE` từ `orders` | REPLACE bằng NO ACTION khi có dịp dựng lại | đã là bẫy được ghi |
| Chú thích nhiều đoạn lặp ADR trong mã | SIMPLIFY | để một dòng + trỏ ADR |
| Nhật ký thi công đã đóng trong `docs/superpowers/plans/` | MERGE vào `docs/archive/` | giảm bề mặt đọc |
| `noBookerKeys`/`client_outdated` (tương thích PWA cũ) | DELETE sau khi mọi máy đã cập nhật | có thời hạn |
| `orders` đọc `audit_log` (`wonGuard`) | REPLACE | F-05 |
| Router/permissions/architecture test | **KHÔNG xoá** | xem §20 |

## 20. KEEP AT ALL COSTS

1. **Toàn vẹn trong CSDL** (trigger tiền, trạng thái, đóng băng, nhật ký chỉ-thêm, unique dòng mở) — lớp thứ hai thật sự.
2. **Mẫu "điều kiện thắng trong chính câu ghi + nhật ký khi `changes() > 0`"** — đúng cách làm đồng thời trên D1.
3. **Ma trận quyền một nơi, mặc định từ chối, dùng chung server–web.**
4. **Mô hình Party–Role–Relationship có hiệu lực thời gian** — nền cho khách/đại lý/HDV/nhà cung cấp mà không silo.
5. **`src/architecture.test.ts` + sổ dữ liệu sinh tài liệu** — kiến trúc tự bảo vệ (P16).
6. **Tiền INTEGER tính ở server, một `buildLines`.**
7. **`audit-invariants` chỉ-đọc chạy được trên production** — chỗ cắm rẻ nhất cho mọi bất biến mới.
8. **Không dependency runtime** — bề mặt tấn công chuỗi cung ứng gần bằng 0.

## 21. PRIORITIZED REMEDIATION PLAN

- **NOW (trước việc lớn tiếp theo):** F-03(a) thêm kiểm tiền vào `audit-invariants`; F-04 diễn tập khôi phục + xuất ra ngoài; F-01 ADR + chặn sửa hồ sơ nhân viên (kèm F-07).
- **NEXT (trước N3 thu tiền/hoá đơn):** F-02 idempotency ở tầng chung; F-03(b) trigger đóng băng `order_item`/tiền; F-05 `orders` vào STRICT; F-06 đăng xuất mọi thiết bị; F-09 `request_id` trong nhật ký; N3 thiết kế sổ thu tiền chỉ-thêm có `currency`, gỡ cọc trên đơn cùng lần (F-08).
- **LATER:** F-11 tìm kiếm; F-13 contract (cột chết, B5); đo p95 thật; property-based test tiền/ngày; phân hạng quy trình duyệt (F-10).
- **NEVER / NOT WORTH IT (ở quy mô này):** microservice/tách DB; queue/cache/search engine riêng; multi-tenant; tự xây hoá đơn điện tử, thanh toán, sổ cái kế toán; thay router tự viết bằng framework; i18n.

## 22. FINAL THREE

1. **Idempotency ở tầng chung (F-02)** — mọi lệnh "tạo" mang khoá do client sinh, máy chủ trả lại kết quả lần đầu.
2. **Lưới tiền hai lớp (F-03)** — kiểm `Σ dòng = tạm tính` trong `audit-invariants` ngay, rồi trigger đóng băng tiền/dòng tiền của đơn không còn nháp.
3. **Ranh giới danh tính nhân viên (F-01 + F-07)** — hồ sơ gắn tài khoản chỉ ADMIN sửa; một nguồn cho "đang hoạt động".

```
Fix 1 (idempotency)          Fix 2 (lưới tiền 2 lớp)
        │                            │
        └──────────┬─────────────────┘
                   ▼
   cho phép làm N3 (thu/hoàn tiền, hoá đơn) mà retry/mạng chập và mã mới
   không thể ghi tiền hai lần hay lệch tổng
                   ▼
   giảm rủi ro: sai lệch tài chính — loại lỗi đắt nhất và khó phát hiện nhất của ERP

Fix 3 (danh tính nhân viên) ─► người thu tiền/ký xác nhận là AI THẬT ─► nhật ký tiền (N3) có giá trị pháp lý nội bộ
```

Lý do không chọn DR (F-04) vào ba việc: nó quan trọng nhưng **không chặn thiết kế** — là việc vận hành một lần + lịch định kỳ, làm song song được ngay và nên làm ngay (đứng đầu mục NOW).

---
*Người kiểm không sửa mã nào; mọi đề xuất chạm quyền/tiền/schema cần ADR hoặc chủ duyệt theo CLAUDE.md §3. Bằng chứng tái chạy được: `node --test "tests/audit/*.test.mjs"`.*
