# CLAUDE.md — tourdao-sales

Hướng dẫn cho mọi phiên Claude làm việc trong repo này. **Đọc hết trước khi sửa mã.** Ngắn có chủ đích: chi tiết nằm ở các tài liệu được trỏ tới; khi tài liệu và mã mâu thuẫn thì **mã thắng** — sửa tài liệu ngay trong cùng commit.

## 1. Dự án là gì
CRM nội bộ của **Công ty TNHH Tour Đảo** (Nha Trang): nhân viên lập đơn dịch vụ tour (chọn từ danh mục đồng bộ Google Sheet), ghi thông tin chuyến theo từng dịch vụ, xác nhận đơn; kế toán xem đơn; admin quản lý nhân viên, quyền, danh mục, hồ sơ khách/đại lý, địa điểm.
- **Production:** `https://booking.tourdao.vn` — Cloudflare Worker `tourdao-sales` + D1 `tourdao-sales-db` + Workers Assets; là PWA cài lên iPhone ("Tour Đảo Booking").
- **Độc lập** với repo `tourdaovn` (website công khai): khác Worker, khác D1, khác domain. Token màu/font chỉ sao chép giá trị.
- Ngăn xếp: TypeScript, giao diện thuần (không React), esbuild, SQLite (D1). Node 22 (chạy `.ts` trực tiếp bằng `node --test`).

## 2. Đọc gì, khi nào
| Việc | Đọc |
|---|---|
| **Sửa/thêm gì đó nhanh** (công thức từng loại việc, bẫy) | `docs/CHANGE-GUIDE.md` |
| Hiểu cả hệ thống (topology, luồng, API, quyền, dữ liệu) | `docs/SYSTEM-DESIGN.md` |
| Luật kiến trúc (ranh giới module, dữ liệu, nơi đặt code) | `docs/ARCHITECTURE.md`, `docs/adr/` (ADR-0001…0009) |
| Đặc tả nghiệp vụ + quyết định của chủ dự án | `docs/SPEC-tourdao-sales.md`, `docs/superpowers/specs/` |
| Bảng/cột/view | `docs/data-dictionary.json` (nguồn) → `docs/DATA-DICTIONARY.md` (sinh bằng `npm run dict`) |
| Triển khai, áp migration, hoàn tác | `docs/HANDOFF-N1.md` (mục "Trạng thái triển khai" là hiện trạng production) |
| Chế độ bảo trì (chỉ chủ dự án) + cột "Đăng nhập gần nhất": quyết định của chủ, trạng thái, việc còn lại | `docs/HANDOFF-CHE-DO-BAO-TRI.md`; công thức q ở `docs/CHANGE-GUIDE.md`; runbook + đường thoát khẩn ở `docs/HANDOFF-N1.md` |
| Lịch sử thi công, ruling, nợ kỹ thuật | `docs/superpowers/plans/*-thi-cong-nhat-ky.md` |
| Bằng chứng giao diện (ảnh, axe, kịch bản Chrome) | `docs/evidence/2026-09-20-a2/`, `docs/evidence/2026-09-21-v1-0/` (v1.0: màn đăng nhập…) |
| PWA/iPhone | `docs/PWA-IPHONE.md` |

## 3. Lệnh
| Lệnh | Việc |
|---|---|
| `npm run dev` | `wrangler dev` (tự `build:web`); cần `.dev.vars` (mẫu `.dev.vars.example`) và `npm run db:migrate:local` |
| `npm test` | luật thuần + `src/architecture.test.ts` (`node --test "src/**/*.test.ts"`) — hiện {{SO_TEST}} test (đếm lại khi thêm/bớt) |
| `node --test src/shared/service-form.test.ts` | chạy một tệp test |
| `npm run typecheck` | `tsc` cho server, `web/`, `web/sw/` — phải **0 lỗi** |
| `npm run build:web` | esbuild `web/*.ts` → `public/js/`, `web/sw/sw.ts` → `public/sw.js` (cả hai **gitignored**; thêm trang mới phải khai trong script này) |
| `npm run test:e2e [-- tên …]` | API thật trên D1 local tạm; **cần mạng** (đọc Google Sheet thật + gọi siteverify của Cloudflare Turnstile ở mọi đăng nhập); kết thúc bằng `audit-invariants` |
| `node scripts/audit-invariants.mjs --db local\|remote` | bất biến dữ liệu, chỉ đọc; danh sách kiểm ở `scripts/audit-checks.mjs` (test: `src/audit-invariants.test.ts`); mã thoát 1 = vi phạm, **2 = không chạy được** (D1 chưa áp `0014`/thiếu bảng — không phải dữ liệu sạch) |
| `npm run dict` | sinh lại `docs/DATA-DICTIONARY.md` từ `data-dictionary.json` |
| `node scripts/dev-iphone.mjs` | chạy trên D1 **tạm** để thử iPhone thật (mạng LAN, không đụng dữ liệu thật) |
| `npm run db:migrate:local` / `db:migrate:remote` | áp migration; **remote chỉ theo runbook, xem §6** |

Kịch bản Chrome (giao diện) ở `docs/evidence/2026-09-20-a2/kich-ban/` không nằm trong CI: sửa `web/order-form.ts`, `web/order.ts` hoặc `web/trip-sheet.ts` thì **phải chạy lại** ba `a2-smoke-*.mjs` (cách chạy: `tests/e2e/README.md`); sửa `web/login.ts`, `public/login.html` hoặc CSP ở `public/_headers` thì chạy `docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs` (cần mạng); sửa `web/confirmation-image.ts`, `web/confirmation-dialog.ts`, `src/shared/order-confirmation.ts`, `src/shared/text-wrap.ts` hoặc phần `moi=1`/nút "Xác nhận gửi khách" ở `web/order.ts`/`web/order-form.ts` thì chạy `v1-xac-nhan-png.mjs` cùng thư mục (không cần mạng ngoài); sửa `web/orders.ts`, `web/order.ts`, `web/handler-sheet.ts`, khối người phụ trách của `public/app.css` hoặc `src/shared/handler-view.ts` thì chạy `v1-nguoi-phu-trach.mjs` cùng thư mục. `v1-dang-nhap.mjs` nay 15 bước (~9 phút, cần mạng). Các kịch bản này cần Chrome + axe-core NGOÀI repo.

## 4. Bản đồ mã
```
src/index.ts            gốc lắp ráp: mảng modules, router, Cron
src/modules/<tên>/      accounts · audit · auth · catalog · company · dispatch · locations · maintenance · orders · parties · staff
                        (index.ts = API công khai của module; rules.ts thuần; repository.ts = SQL; service.ts điều phối)
src/shared/             logic THUẦN dùng chung server ↔ web: router, http, contracts (DTO), permissions, trip-*, service-form,
                        order-*, handler-view, text-wrap, app-info, audit-actions, maintenance, vn-date, sw-policy…  — KHÔNG import src/modules/
web/                    giao diện TypeScript thuần: 1 tệp / trang + thành phần (counter, banner, service-card, trip-sheet, handler-sheet, confirmation-image/-dialog…)
public/                 HTML tĩnh, app.css (token), fonts/, icons/, manifest; js/ và sw.js do build sinh
migrations/             0001…0016 (chỉ thêm, không sửa tệp đã áp remote; remote tới 0014 kể từ v1.0 2026-09-21; 0015–0016 mới ở nhánh worktree-che-do-bao-tri, CHƯA áp remote)
scripts/                công cụ dòng lệnh (audit-invariants, import-staff, dev-iphone…)
tests/e2e/              kịch bản API (run.mjs điều phối)
docs/                   tài liệu (xem §2)
```

## 5. Quy tắc bắt buộc
**Ngôn ngữ:** giao diện, thông báo lỗi, tài liệu, thông điệp commit đều **tiếng Việt CÓ DẤU đầy đủ**. Không chữ tiếng Anh nào lộ ra người dùng (kể cả mã trạng thái thô như `cancelled`).

**Kiến trúc** (chi tiết `docs/ARCHITECTURE.md`; `src/architecture.test.ts` ép):
- Module chỉ import module khác qua `index.ts`; chỉ module chủ ghi bảng của mình; đọc xuyên module chỉ qua view công bố `v_<tiền tố>_*`.
- `src/shared/` và `web/` **không** import `src/modules/`. Trong `src/shared/` import nhau **kèm đuôi `.ts`**; `web/` import `shared` **không đuôi**.
- Luật dùng ở cả server và giao diện = một tệp thuần trong `src/shared/` (một nguồn); không chép tay sang `web/`.
- SQL của module "nghiêm" (`company`, `dispatch`, `locations`, `parties`, `staff`) đi qua `defineSql`, câu tĩnh.
- `orders` KHÔNG import `dispatch`: "đang là người phụ trách" và "đặt người phụ trách mặc định cho đơn mới" do gốc lắp ráp (`src/index.ts` → `injected`) tiêm vào `ctx` (`ctx.isAssigned(orderId)`, `ctx.defaultHandlerStatement(orderId, at)`); route nào dùng ô `ownOrAssigned` phải truyền `assigned` vào `can()`.

**Dữ liệu:** tiền = `INTEGER` VNĐ, dẫn xuất chỉ tính ở **server** (`buildLines`); ngày/giờ dân sự theo **giờ Việt Nam** (`vnToday`, `YYYY-MM-DD`/`HH:MM`), dấu thời gian `TEXT` ISO UTC. Không xoá cứng; hiệu lực bằng `valid_from/to`. Danh sách giá trị mở kiểm ở code, không `CHECK`. Tên bảng số ít (trừ `orders`).

**Migration:** chỉ thêm file mới; **không sửa** file đã áp remote; đổi phá vỡ theo expand–contract trong hai lần phát hành. Bảng/cột mới → cập nhật `docs/data-dictionary.json` + `npm run dict`.

**Giao diện:** không `innerHTML` (dựng bằng `h()` ở `web/dom.ts`). CSS: token ở `:root` của `public/app.css`; khối **sau** dấu mốc `/* ---------- app iPhone (PWA)` chỉ dùng token (không hex, `rgb()`, `hsl()`, `px` ngoài `1px`, `rem`, `em`) — `tests/e2e/pwa.mjs` quét. Ô gõ 16px (chống zoom iOS). Trang mới phải khai ở `PAGES` trong `src/shared/sw-policy.ts`.

**Bảo mật:** mặc định từ chối (route khai `access`; ma trận ở `src/shared/permissions.ts`); POST/PUT/PATCH cần header `Origin` cùng site (thử bằng curl phải tự thêm); tiền không tin từ trình duyệt; nhật ký **không ghi** SĐT/email/MST; bí mật chỉ qua `wrangler secret put` / `.dev.vars` (gitignored) — **không** commit khoá.

**Kiểm thử:** sửa hành vi → viết test **đỏ trước, xanh sau**; luật thuần có `*.test.ts` cạnh tệp; hành vi API có kịch bản `tests/e2e`. Không tuyên bố xong khi chưa chạy `npm test` + `npm run typecheck` (+ e2e nếu chạm API/migration).

## 6. Git, triển khai, an toàn
- Sửa mã trong **git worktree riêng** (`.claude/worktrees/<tên>`, đã gitignore), không sửa thẳng ở checkout gốc. Commit nhỏ, thông điệp tiếng Việt: tiêu đề nói việc, thân nói **vì sao**. Nếu môi trường yêu cầu dòng đồng tác giả thì thêm đúng theo đó.
- **Không** `git push`, merge vào `main`, `wrangler deploy`, `wrangler d1 migrations apply --remote`, `wrangler secret …`, hay ghi lên D1 remote **trừ khi chủ dự án ra lệnh rõ trong phiên đó** — mỗi lần ra lệnh chỉ áp cho việc đó. Không `--force`.
- Khi được lệnh deploy: theo `docs/HANDOFF-N1.md` — cổng chỉ-đọc trước, ghi điểm khôi phục Time Travel, `npm test` + `npm run typecheck` + `npm run test:e2e` xanh, áp migration rồi `wrangler deploy` ngay, `audit-invariants --db remote`, ghi trạng thái vào HANDOFF. `CI=1` để wrangler không hỏi.
- Không tạo/sửa tài khoản, quyền, hồ sơ trên production trong "cửa sổ đóng băng" (HANDOFF-N1 mục Hoàn tác).
- Không sửa ADR/đặc tả đã duyệt để hợp thức hoá mã; quyết định kiến trúc mới → ADR mới do chủ dự án duyệt.

## 7. Quy trình
- **Việc nhỏ/rõ:** theo công thức ở `docs/CHANGE-GUIDE.md` → test → commit.
- **Tính năng mới:** đặc tả ngắn ở `docs/superpowers/specs/` (ghi giả định và điều chưa chắc) → kế hoạch ở `docs/superpowers/plans/` → thi công theo task, mỗi task test đỏ→xanh và rà soát độc lập → cập nhật `SYSTEM-DESIGN.md`/`CHANGE-GUIDE.md`/`data-dictionary.json` nếu đổi cấu trúc.
- Việc lớn có nhiều bước: ghi sổ điều phối ở `docs/superpowers/plans/…-thi-cong-nhat-ky.md` (ruling, nợ) để phiên sau tiếp nối.

## 8. Bẫy hay dính (danh sách đầy đủ: `docs/CHANGE-GUIDE.md`)
- `public/js/` và `public/sw.js` không có trong git: quên `npm run build:web` thì trang hỏng/cũ (`wrangler dev` và `wrangler deploy` tự build).
- E2E cần mạng; nhiều `wrangler dev` mồ côi gây "database is locked" — tắt trước khi chạy.
- Form: `location.replace` (không `assign`) sau khi lưu để Back/bfcache không đưa về form đã lưu (tránh đơn trùng).
- Enter trong ô tìm danh mục bị chặn có chủ đích (ô nằm trong `<form>`).
- `wrangler d1 migrations apply` áp **mọi** migration chưa áp — không để migration "siết" (B5 `staff_party_required`, xem HANDOFF-N1) lọt vào `migrations/` trước lần phát hành 2. `src/migrations-n1.test.ts` nhận biết migration siết theo TÊN tệp, không theo số.
- Turnstile ở đăng nhập: bật khi có `TURNSTILE_SECRET_KEY`, **tắt** khi vắng (cảnh báo log mỗi lần); kiểm TRƯỚC bộ chống dò PIN; 403 cũng có một dòng log (`turnstile_failed`, chỉ mã lý do). Khi deploy: khoá site (`vars`) đi cùng mã, **`wrangler secret put TURNSTILE_SECRET_KEY` đặt SAU** khi nhân viên đã mở app một lần (service worker cache `login.js` cũ) — `docs/HANDOFF-N1.md` mục "Lần phát hành v1.0". e2e đăng nhập luôn qua `login()`/`session()` của `tests/e2e/lib.mjs` (gửi token thử). `npm run types` khi thiếu `.dev.vars` làm mất `SESSION_SECRET` khỏi `Env` — xem `docs/CHANGE-GUIDE.md` công thức l. Widget ở `web/login.ts`: id khung KHÔNG được là `turnstile`, không gọi `turnstile.ready()` (công thức l, "Bẫy widget").
- Turnstile (widget): `theme: "light"` (app chỉ có giao diện sáng), `siteKey` từng kẹt `null` khi `GET /api/auth/config` lỗi lúc mở trang nên `web/login.ts` HỎI LẠI cấu hình sau 403/503 — đừng bỏ.
- Kịch bản Chrome: các trang dùng CHUNG kho cookie — trang của tài khoản nào phải mở SAU CÙNG thì thao tác chuột mới đi bằng phiên đó.
- Cột chết `staff.role` (hằng `'sales'`) và `staff.full_name` (hằng `''`): đọc quyền/tên từ `stf_permission`/hồ sơ, không từ hai cột này.
- Chế độ bảo trì (`mnt_setting`): bật thì MÁY CHỦ chặn mọi SĐT ngoài `allowed_phones` (router + `POST /api/auth/login`), kể cả phiên đang mở; chủ bị khoá thì tắt bằng SQL `UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'` (lệnh đầy đủ ở `docs/HANDOFF-N1.md`); `last_login_at` chỉ ghi ở route đăng nhập, không trong `verifyPinThrottled` — công thức q của `docs/CHANGE-GUIDE.md`.

## 9. Hiện trạng (cập nhật khi đổi)
- Đã lên production 2026-09-21: A1 (thông tin chuyến theo dịch vụ, `0008`) + N1 lần 1 (hồ sơ/địa điểm/quyền đa trị, `0009…0012`) + A2 (giao diện). Migration cuối ĐÃ LÊN production: **`0014`** (v1.0, 2026-09-21). Trong bản v1.0: `0013_company_email` (đã có), `0014_dispatch` (đã có: bảng/view phân công + backfill người phụ trách; module `dispatch` đã có: người phụ trách + `dispatch.claim`, API ở `docs/SYSTEM-DESIGN.md` §7); B5 (siết `party_id` bắt buộc, `staff_party_required`) lấy số KẾ TIẾP sau `0016` (dự kiến `0017`) — trước khi thêm migration mới kiểm `docs/HANDOFF-N1.md` và `docs/superpowers/plans/` rồi đánh số tiếp. e2e hiện {{SO_E2E}} kịch bản (thêm `company`, `turnstile`, `dispatch`, và `maintenance` ở nhánh chế độ bảo trì); runbook lần phát hành v1.0 (áp `0013`+`0014`, deploy, để nhân viên mở app, rồi mới đặt secret Turnstile) ở `docs/HANDOFF-N1.md`.
- Còn mở (chủ dự án): thử tay bằng admin, ghi chữ ký thị giác A2, quyết định 4(a)/(b)/(c) ở HANDOFF-N1. (Gói Workers: **trả phí** — chủ dự án xác nhận 2026-09-21, đơn cỡ tối đa không vướng giới hạn D1.)
- **Chế độ bảo trì chỉ chủ dự án dùng được + cột "Đăng nhập gần nhất": ĐÃ THI CÔNG ở nhánh `worktree-che-do-bao-tri` (mã, test, tài liệu, migration `0015`/`0016`) — CHỜ LỆNH TRIỂN KHAI.** Chưa merge vào `main`, chưa push, chưa deploy; `0015`/`0016` CHƯA áp lên D1 remote (production vẫn ở `0014`); chưa bật chế độ bảo trì nào trên production. Đọc `docs/HANDOFF-CHE-DO-BAO-TRI.md` (mục 0: trạng thái + việc còn lại), runbook "Lần phát hành kế tiếp" và đường thoát khẩn ở `docs/HANDOFF-N1.md`, nhật ký `docs/superpowers/plans/2026-09-21-che-do-bao-tri-thi-cong-nhat-ky.md`. Tất cả phiên đăng nhập đã bị đăng xuất 2026-09-21 (đổi `SESSION_SECRET`).
- Lộ trình: N2 (người đặt/khách trên đơn, gộp hồ sơ, nhiệm vụ đón/lái cano — ADR-0006), N3 (sổ thu tiền, hoá đơn, sửa sau xác nhận), N4 (giá net HDV).
- **Bản v1.0 ĐÃ LÊN PRODUCTION 2026-09-21** (merge vào `main` @ `9594696` + deploy, Worker `21cbaca5-8229-43b8-bab8-928036c9e871`; **Turnstile ĐÃ BẬT cùng ngày**: chủ dự án đặt `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` bằng `wrangler secret put`; đã kiểm không cần đăng nhập — xem `docs/HANDOFF-N1.md` "TRẠNG THÁI TRIỂN KHAI — bản v1.0"; CHƯA có đăng nhập trọn vẹn bằng tài khoản thật qua widget thật): (1) màn đăng nhập — Turnstile (máy chủ + widget + CSP; hỏi lại cấu hình khi lỗi) + khối thông tin công ty + số phiên bản (khoá đặt bằng `secret put`, KHÔNG trong `vars`/tệp; ngưỡng `MAX_TOKEN_LENGTH` = 2048 ĐÃ đối chiếu 2026-09-21 với tài liệu Cloudflare); (3) người phụ trách đơn — module `dispatch`, người phụ trách sửa được đơn nhờ `ctx.isAssigned`, dòng "Phụ trách" ở danh sách + khối/bảng chọn ở trang đơn; (2) ảnh xác nhận đơn PNG (canvas ở trình duyệt; hộp thoại tự mở sau khi tạo đơn mới; nút "Xác nhận gửi khách" ở trang đơn; KHÔNG ghi nhật ký `exported_png`) — `docs/CHANGE-GUIDE.md` công thức p. Việc đang chờ: PDF/in A4; iPhone thật (canvas/chia sẻ/tải ảnh/WebKit); nhật ký thi công `docs/superpowers/plans/2026-09-21-v1-0-thi-cong-nhat-ky.md`.
