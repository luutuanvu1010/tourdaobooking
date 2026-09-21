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
| Lịch sử thi công, ruling, nợ kỹ thuật | `docs/superpowers/plans/*-thi-cong-nhat-ky.md` |
| Bằng chứng giao diện (ảnh, axe, kịch bản Chrome) | `docs/evidence/2026-09-20-a2/` |
| PWA/iPhone | `docs/PWA-IPHONE.md` |

## 3. Lệnh
| Lệnh | Việc |
|---|---|
| `npm run dev` | `wrangler dev` (tự `build:web`); cần `.dev.vars` (mẫu `.dev.vars.example`) và `npm run db:migrate:local` |
| `npm test` | luật thuần + `src/architecture.test.ts` (`node --test "src/**/*.test.ts"`) — hiện 271 test |
| `node --test src/shared/service-form.test.ts` | chạy một tệp test |
| `npm run typecheck` | `tsc` cho server, `web/`, `web/sw/` — phải **0 lỗi** |
| `npm run build:web` | esbuild `web/*.ts` → `public/js/`, `web/sw/sw.ts` → `public/sw.js` (cả hai **gitignored**; thêm trang mới phải khai trong script này) |
| `npm run test:e2e [-- tên …]` | API thật trên D1 local tạm; **cần mạng** (đọc Google Sheet thật + gọi siteverify của Cloudflare Turnstile ở mọi đăng nhập); kết thúc bằng `audit-invariants` |
| `node scripts/audit-invariants.mjs --db local\|remote` | bất biến dữ liệu, chỉ đọc |
| `npm run dict` | sinh lại `docs/DATA-DICTIONARY.md` từ `data-dictionary.json` |
| `node scripts/dev-iphone.mjs` | chạy trên D1 **tạm** để thử iPhone thật (mạng LAN, không đụng dữ liệu thật) |
| `npm run db:migrate:local` / `db:migrate:remote` | áp migration; **remote chỉ theo runbook, xem §6** |

Kịch bản Chrome (giao diện) ở `docs/evidence/2026-09-20-a2/kich-ban/` không nằm trong CI: sửa `web/order-form.ts`, `web/order.ts` hoặc `web/trip-sheet.ts` thì **phải chạy lại** ba `a2-smoke-*.mjs` (cách chạy: `tests/e2e/README.md`).

## 4. Bản đồ mã
```
src/index.ts            gốc lắp ráp: mảng modules, router, Cron
src/modules/<tên>/      accounts · audit · auth · catalog · company · locations · orders · parties · staff
                        (index.ts = API công khai của module; rules.ts thuần; repository.ts = SQL; service.ts điều phối)
src/shared/             logic THUẦN dùng chung server ↔ web: router, http, contracts (DTO), permissions, trip-*, service-form,
                        order-*, audit-actions, vn-date, sw-policy…  — KHÔNG import src/modules/
web/                    giao diện TypeScript thuần: 1 tệp / trang + thành phần (counter, banner, service-card, trip-sheet…)
public/                 HTML tĩnh, app.css (token), fonts/, icons/, manifest; js/ và sw.js do build sinh
migrations/             0001…0013 (chỉ thêm, không sửa tệp đã áp remote; remote mới tới 0012)
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
- SQL của module "nghiêm" (`company`, `locations`, `parties`, `staff`) đi qua `defineSql`, câu tĩnh.

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
- Turnstile ở đăng nhập: bật khi có `TURNSTILE_SECRET_KEY`, **tắt** khi vắng (cảnh báo log mỗi lần); kiểm TRƯỚC bộ chống dò PIN. e2e đăng nhập luôn qua `login()`/`session()` của `tests/e2e/lib.mjs` (gửi token thử). `npm run types` khi thiếu `.dev.vars` làm mất `SESSION_SECRET` khỏi `Env` — xem `docs/CHANGE-GUIDE.md` công thức l.
- Cột chết `staff.role` (hằng `'sales'`) và `staff.full_name` (hằng `''`): đọc quyền/tên từ `stf_permission`/hồ sơ, không từ hai cột này.

## 9. Hiện trạng (cập nhật khi đổi)
- Đã lên production 2026-09-21: A1 (thông tin chuyến theo dịch vụ, `0008`) + N1 lần 1 (hồ sơ/địa điểm/quyền đa trị, `0009…0012`) + A2 (giao diện). Migration cuối ĐÃ LÊN production: **`0012`**. Trong nhánh bản v1.0 (chưa deploy): `0013_company_email` (đã có), `0014_dispatch` (kế hoạch); B5 (siết `party_id` bắt buộc, `staff_party_required`) lấy số KẾ TIẾP sau `0014` — trước khi thêm migration mới kiểm `docs/HANDOFF-N1.md` và `docs/superpowers/plans/` rồi đánh số tiếp.
- Còn mở (chủ dự án): thử tay bằng admin, ghi chữ ký thị giác A2, quyết định 4(a)/(b)/(c) ở HANDOFF-N1. (Gói Workers: **trả phí** — chủ dự án xác nhận 2026-09-21, đơn cỡ tối đa không vướng giới hạn D1.)
- Lộ trình: N2 (người đặt/khách trên đơn, gộp hồ sơ, phân công/người phụ trách — ADR-0006), N3 (sổ thu tiền, hoá đơn, sửa sau xác nhận), N4 (giá net HDV). Việc đang chờ làm: màn đăng nhập v1.0 (Turnstile phía máy chủ + `GET /api/company` + `app-info` ĐÃ có trong nhánh, còn giao diện `web/login.ts` + CSP); xác nhận đơn dạng PNG; cột "Người phụ trách" ở danh sách đơn (đặc tả/kế hoạch mới nhất ở `docs/superpowers/`).
