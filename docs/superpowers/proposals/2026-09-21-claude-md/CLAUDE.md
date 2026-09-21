# CLAUDE.md — tourdao-sales

> Đọc trước mỗi phiên. Đây là **lời khuyên cho AI, không phải cưỡng chế**; riêng các lệnh cấm ở §8 có thêm hàng rào máy. Chi tiết ở tài liệu được trỏ tới, không chép lại ở đây. Luật theo thư mục: `src/CLAUDE.md`, `web/CLAUDE.md` (chỉ tự nạp khi bạn ĐỌC tệp ở đó — làm việc bằng lệnh shell thì tự mở chúng).

## 1. Dự án
- CRM nội bộ **Công ty TNHH Tour Đảo** (Nha Trang): nhân viên lập đơn dịch vụ tour (chọn từ danh mục đồng bộ Google Sheet), ghi thông tin chuyến theo từng dịch vụ, xác nhận đơn; kế toán xem đơn; admin quản lý nhân viên, quyền, danh mục, hồ sơ khách/đại lý, địa điểm; có kênh Góp ý/Báo lỗi.
- Production `https://booking.tourdao.vn`: Cloudflare Worker `tourdao-sales` + D1 `tourdao-sales-db` + Workers Assets; PWA cài lên iPhone ("Tour Đảo Booking").
- **Độc lập** với repo `tourdaovn` (website công khai): khác Worker, D1, domain. Điểm chạm hiện có: giá trị token màu/font (chỉ sao chép giá trị).
- TypeScript, giao diện thuần (không React), esbuild, SQLite (D1), Node 22 (chạy `.ts` trực tiếp bằng `node --test`), **không có dependency runtime**.
- Bốn quyền app, một tài khoản có nhiều quyền: `SALES`, `ACCOUNTING`, `ADMIN`, `FIELD`. Từ vựng: `docs/SYSTEM-DESIGN.md` §15.

## 2. Thứ tự ưu tiên khi mâu thuẫn (Hiến pháp Điều 3.1)
Hiến pháp → ràng buộc dự án → ADR → quy trình/playbook → đặc tả → mã. Hiến pháp: v2.3.0, nguồn `~/Documents/Projects/CoreSchemaProject/playbook/CONSTITUTION.md` (bản chép vào `playbook/` đang chờ chủ duyệt: `docs/superpowers/specs/2026-09-21-bo-tieu-chuan-nen-tang-design.md`).
- Tài liệu **chuẩn tắc** (Hiến pháp, ADR đã duyệt, luật ở `docs/ARCHITECTURE.md`, `docs/SPEC-tourdao-sales.md` đã duyệt) **thắng mã**: mã lệch là lỗi, sửa mã.
- Tài liệu **mô tả** (`docs/SYSTEM-DESIGN.md`, `docs/DATA-DICTIONARY.md`, `docs/CHANGE-GUIDE.md`) **thua mã**: sửa tài liệu trong cùng commit.
- **Lệch có chủ ý** đã ghi ở `docs/SYSTEM-DESIGN.md` §16 (mã đúng, tài liệu chuẩn tắc lệch): không sửa mã; giữ ở §16 và trình chủ để ra ADR/dòng lịch sử mới.
- Không tự hoà giải bằng suy đoán: dừng, nêu xung đột, hỏi chủ.

## 3. Vai của AI (quan trọng nhất)
- **Chủ dự án là người quyết định cuối và duy nhất** (P7, P9); AI thực thi. **Mơ hồ về cấu trúc** (chạm dữ liệu, logic, hợp đồng giữa các phần như module/API/schema, hoặc bất biến): **luôn DỪNG và hỏi**, dù nhỏ (P8). **Mơ hồ bề mặt** (không chạm những thứ đó) và đảo ngược được: tự đưa giả định, ghi lại giả định trong commit/báo cáo, đi tiếp. Không chắc thuộc loại nào thì coi là cấu trúc và dừng. Quyết định kiến trúc/chiến lược và cửa một chiều cần ADR + chủ duyệt: AI không tự quyết (N3, Điều 7.2).
- **Mỗi phiên một vai cho cùng một việc**: lập kế hoạch, thi công, hoặc kiểm (P15). **Người thi công KHÔNG tự nghiệm thu** (N8).
- **Việc lớn** = đụng **dữ liệu** (schema, migration, dữ liệu thật), **quyền** (`permissions.ts`, tài khoản), **tiền** (tính/hiển thị tiền), **triển khai** (deploy, cấu hình Cloudflare) hoặc **luật** (tài liệu chuẩn tắc, hook). Thi công xong phải có **subagent kiểm độc lập, chỉ đọc**: đọc mã thật, chạy lại lệnh, chỉ báo cáo, không sửa. Chỉ báo "đạt" dựa trên báo cáo đó + test, không tự khai. Việc còn lại (sửa chữ, tài liệu mô tả, CSS không đụng logic, thêm test): test xanh + tóm tắt, chủ duyệt.
- **Không tự tay đổi luật chi phối chính mình** (N9): `CLAUDE.md`, `.claude/`, `playbook/`, ràng buộc dự án, ADR đã duyệt. Chỉ **đề xuất** bằng diff/tệp trên nhánh; chủ duyệt mới có hiệu lực (chỉ được tự sửa phần MÔ TẢ như số đếm). Dựng thêm hàng rào chỉ **siết** chính mình (test, hook, deny) thì được, không nới (Điều 9.4).
- Viết **tiêu chí nghiệm thu trước khi làm**, bằng hành vi kiểm được (P20). Cơ chế kiểm mới chỉ được coi là hoạt động khi **đã quan sát nó chặn thật một lần** (sửa cố ý → đỏ → hoàn nguyên) (P16); điều chưa cưỡng chế được ghi là "dựa vào kỷ luật".
- Thấy dấu hiệu một nguyên tắc sắp/đang bị vi phạm: nêu ngay, kèm số hiệu điều, **một lần**; chủ đã nghe và vẫn quyết thì thi hành, không nhắc lại (P18).

## 4. Giao tiếp với chủ dự án
- **Tiếng Việt CÓ DẤU** đầy đủ (giao diện, thông báo lỗi, tài liệu, commit; không chữ Anh lộ ra người dùng, kể cả mã trạng thái thô như `cancelled`).
- **Ngắn gọn.** Kết luận và điều cần chủ quyết đặt **đầu** câu trả lời; chi tiết sau. Lời thường trước, thuật ngữ kỹ thuật chỉ khi cần và kèm một câu giải nghĩa.
- **Không bịa.** Điều chưa kiểm phải nói "chưa kiểm được", không trình bày suy đoán như sự thật. Khẳng định quan trọng kèm `tệp:dòng` hoặc kết quả lệnh.
- **Báo cáo cuối việc**: (1) đã làm gì, ở đâu (nhánh/commit); (2) đã kiểm bằng lệnh nào, kết quả thật; (3) chưa làm/chưa kiểm; (4) cần chủ quyết gì. Không nói "xong" khi test/typecheck chưa chạy hoặc đỏ.

## 5. Lệnh
| Lệnh | Việc |
|---|---|
| `npm run dev` | `wrangler dev` (tự `build:web`); cần `.dev.vars` (mẫu `.dev.vars.example`) và `npm run db:migrate:local` |
| `npm test` | luật thuần + `src/architecture.test.ts` (`node --test "src/**/*.test.ts"`); một tệp: `node --test src/shared/service-form.test.ts` |
| `npm run typecheck` | `tsc` cho server, `web/`, `web/sw/` — phải **0 lỗi**. **KHÔNG phủ** `src/**/*.test.ts`, `scripts/`, `tests/` (tự đọc lại tệp đó) |
| `npm run build:web` | esbuild các trang `web/*.ts` (liệt kê trong script) → `public/js/`, `web/sw/sw.ts` → `public/sw.js` (cả hai **gitignored**) |
| `npm run test:e2e [-- tên …]` | API thật trên D1 local tạm; **cần mạng** (đọc Sheet thật + siteverify Turnstile); đăng nhập luôn qua `login()`/`session()` của `tests/e2e/lib.mjs`; cuối cùng chạy `audit-invariants` |
| `node scripts/audit-invariants.mjs --db local\|remote` | bất biến dữ liệu, **chỉ đọc**; thoát 1 = vi phạm, **2 = không chạy được** (không phải dữ liệu sạch) |
| `npm run dict` | sinh lại `docs/DATA-DICTIONARY.md` từ `docs/data-dictionary.json` |
| `node scripts/dev-iphone.mjs` | chạy trên D1 tạm để thử iPhone thật (LAN, không đụng dữ liệu thật) |
| `npm run db:migrate:local` / `db:migrate:remote` | áp migration; **remote chỉ khi chủ ra lệnh, theo runbook (§8)** |

## 6. Đọc gì, khi nào
| Việc | Đọc |
|---|---|
| Sửa/thêm nhanh: công thức từng loại việc, bẫy | `docs/CHANGE-GUIDE.md` |
| Hiểu hệ thống: topology, luồng, API, quyền, dữ liệu, giao diện | `docs/SYSTEM-DESIGN.md` |
| Luật kiến trúc, quyết định đã duyệt | `docs/ARCHITECTURE.md`, `docs/adr/` |
| Nghiệp vụ và quyết định của chủ | `docs/SPEC-tourdao-sales.md`, `docs/superpowers/specs/` |
| Bảng/cột/view | `docs/data-dictionary.json` (nguồn) → `docs/DATA-DICTIONARY.md` (sinh) |
| Triển khai, áp migration, hoàn tác, trạng thái production | `docs/HANDOFF-N1.md` |
| Chế độ bảo trì (chỉ chủ dùng được), cột "Đăng nhập gần nhất" | `docs/HANDOFF-CHE-DO-BAO-TRI.md` |
| Góp ý / Báo lỗi (module `feedback`) | `docs/HANDOFF-FEEDBACK.md` |
| Lịch sử thi công, ruling, nợ kỹ thuật | `docs/superpowers/plans/*-thi-cong-nhat-ky.md` |
| PWA/iPhone; bằng chứng giao diện | `docs/PWA-IPHONE.md`; `docs/evidence/` |

## 7. Quy tắc bắt buộc (chi tiết theo thư mục ở `src/CLAUDE.md`, `web/CLAUDE.md`)
- **Kiến trúc** (`src/architecture.test.ts` ép đầy đủ cho module "nghiêm"; module cũ còn ngoại lệ có hạn): module chỉ import module khác qua `index.ts`; chỉ module chủ ghi bảng của mình; đọc xuyên module chỉ qua view `v_<tiền tố>_*`; `src/shared/` và `web/` không import `src/modules/`.
- **Dữ liệu**: tiền = `INTEGER` VNĐ, dẫn xuất chỉ tính ở **server** (`buildLines`), không tin số tiền từ trình duyệt; ngày/giờ dân sự theo **giờ Việt Nam** (`vnToday`), dấu thời gian ISO UTC; không xoá cứng (hiệu lực bằng `valid_from/to`).
- **Migration**: chỉ thêm tệp mới, **không sửa tệp đã áp remote**; đổi phá vỡ theo expand–contract trong hai lần phát hành; bảng/cột mới → cập nhật `docs/data-dictionary.json` + `npm run dict`.
- **Giao diện** (chi tiết `web/CLAUDE.md`): không `innerHTML` (dựng bằng `h()`); giá trị CSS đi vào token; ô gõ 16px; trang mới khai `PAGES` (`src/shared/sw-policy.ts`) và script `build:web`. Sửa giao diện thì chạy lại đúng kịch bản Chrome.
- **Bảo mật**: mặc định từ chối (route khai `access`; ma trận ở `src/shared/permissions.ts`); POST/PUT/PATCH cần header `Origin` cùng site (thử bằng curl phải tự thêm); nhật ký **không ghi** SĐT/email/MST (`staff_updated` từng ghi SĐT, đã sửa 2026-09-21; **nhật ký cũ trên production vẫn còn số** vì nhật ký chỉ-thêm — đừng sao chép kiểu cũ); bí mật chỉ qua `wrangler secret put` / `.dev.vars` (gitignored), **không** commit khoá, không nạp bí mật vào ngữ cảnh khi không cần (N10).
- **Kiểm thử**: sửa hành vi → viết test **đỏ trước, xanh sau**; luật thuần có `*.test.ts` cạnh tệp; hành vi API có kịch bản `tests/e2e`. Chạm API/migration thì chạy cả e2e.

## 8. Git, triển khai, an toàn
- Sửa mã trong **git worktree riêng** (`.claude/worktrees/<tên>`), không sửa thẳng ở checkout gốc. Commit nhỏ, thông điệp tiếng Việt: tiêu đề nói việc, thân nói **vì sao**. Thêm dòng đồng tác giả nếu môi trường yêu cầu.
- **CẤM, trừ khi chủ ra lệnh rõ trong phiên đó cho đúng việc đó: `git push`, merge vào `main`, `wrangler deploy`, `wrangler d1 migrations apply --remote`, `wrangler secret …`, ghi lên D1 remote hoặc API production. Không `--force`.**
- **Hàng rào máy** (chỉ chặn nhầm/quên, không chống cố ý lách): hook `.claude/hooks/guard-remote.mjs` (lớp 1) + `permissions.deny` ở `.claude/settings.json` (lớp 2). **Hook không có công tắc tạm**: khi chủ ra lệnh deploy/push, AI làm hết bước chuẩn bị và kiểm, rồi đưa **nguyên lệnh** để chủ chạy bằng `! <lệnh>`. Thấy một lệnh cấm chạy được là lỗi của hàng rào: **báo chủ, không coi là được phép**. Kiểm hàng rào: `node --test src/claude-guard.test.ts`.
- **Đừng khẳng định trạng thái production từ tài liệu hay bộ nhớ** (từng lệch nhau khi nhiều phiên deploy song song): kiểm bằng GET công khai hoặc lệnh chỉ đọc (`wrangler d1 migrations list … --remote`, `wrangler deployments list`). Chỉ deploy từ `main` đã gộp, theo `docs/HANDOFF-N1.md`: cổng chỉ-đọc → điểm khôi phục Time Travel → test + typecheck + e2e xanh → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → ghi trạng thái. `CI=1` để wrangler không hỏi.
- Không tạo/sửa tài khoản, quyền, hồ sơ trên production trong "cửa sổ đóng băng" (`docs/HANDOFF-N1.md`, phần Hoàn tác).
- Không sửa ADR/đặc tả đã duyệt để hợp thức hoá mã; quyết định kiến trúc mới → ADR mới do chủ duyệt.

## 9. Quy trình
- **Việc nhỏ/rõ**: công thức ở `docs/CHANGE-GUIDE.md` → test → commit.
- **Tính năng mới**: đặc tả ngắn ở `docs/superpowers/specs/` (ghi giả định và điều chưa chắc) → kế hoạch ở `docs/superpowers/plans/` → thi công theo task (mỗi task đỏ→xanh, việc lớn có người kiểm độc lập §3) → cập nhật `SYSTEM-DESIGN.md`/`CHANGE-GUIDE.md`/`data-dictionary.json` nếu đổi cấu trúc.
- **Việc lớn nhiều bước**: ghi sổ điều phối `docs/superpowers/plans/…-thi-cong-nhat-ky.md` (ruling, nợ). Mỗi việc một phiên; trạng thái sống trong tài liệu, không trong trí nhớ phiên (P19).
- Yêu cầu chưa rõ: xử lý theo P8 ở §3 (cấu trúc → hỏi chủ; bề mặt đảo ngược được → giả định có ghi). Đừng nở phạm vi ra ngoài điều được giao.

## 10. Bẫy hay dính (danh sách đầy đủ: `docs/CHANGE-GUIDE.md`)
- `public/js/` và `public/sw.js` không có trong git: quên `npm run build:web` thì trang cũ/hỏng (`wrangler dev`/`deploy` tự build).
- E2E cần mạng; nhiều `wrangler dev` mồ côi gây "database is locked" — tắt trước khi chạy.
- `wrangler d1 migrations apply` áp **mọi** migration chưa áp: migration "siết" (B5 `staff_party_required`) không được lọt vào `migrations/` trước lần phát hành 2 (`src/migrations-n1.test.ts` nhận theo TÊN tệp).
- **Số migration**: hiện có **hai** tệp `0016_*` (`0016_feedback`, `0016_maintenance`) — chấp nhận được vì wrangler theo dõi theo TÊN đầy đủ; `0017_order_status_audit_guards` đã có (đã áp production); migration kế tiếp lấy `0018` (dành cho B5, kiểm lại ở `docs/HANDOFF-N1.md` trước khi đặt). Trước khi đặt số, liệt kê migration của **mọi nhánh/worktree chưa gộp** (`git ls-tree --name-only <nhánh> migrations/`).
- Turnstile ở đăng nhập: bật khi có `TURNSTILE_SECRET_KEY`, **tắt** khi vắng; kiểm TRƯỚC bộ chống dò PIN; 403 vẫn có một dòng log (`turnstile_failed`, chỉ mã lý do). Khi deploy: khoá site (`vars`) đi cùng mã, `wrangler secret put TURNSTILE_SECRET_KEY` đặt **SAU** khi nhân viên đã mở app một lần (service worker cache `login.js` cũ). `npm run types` khi thiếu `.dev.vars` làm mất `SESSION_SECRET` khỏi `Env`. Chi tiết: `docs/CHANGE-GUIDE.md` công thức l.
- Chế độ bảo trì (`mnt_setting`): **chỉ chủ dùng được**; bật thì **máy chủ** chặn mọi SĐT ngoài `allowed_phones` (kể cả phiên đang mở); chỉ bật khi chủ quyết, sau khi cột "Đăng nhập gần nhất" cho thấy mọi người đã đăng nhập bằng bản mới; chủ bị khoá thì tắt bằng SQL ở `docs/HANDOFF-N1.md`; `last_login_at` chỉ ghi ở route đăng nhập (công thức q).
- Cột chết `staff.role` (hằng `'sales'`) và `staff.full_name` (hằng `''`): đọc quyền/tên từ `stf_permission`/hồ sơ.
- `orders` KHÔNG import `dispatch`; "đang là người phụ trách" do gốc lắp ráp tiêm (`ctx.isAssigned`); route dùng ô `ownOrAssigned` phải truyền `assigned` vào `can()`.
- Kịch bản Chrome: các trang dùng CHUNG kho cookie — trang của tài khoản nào phải mở SAU CÙNG.
- Hiện trạng production, số test, id Worker **không** ghi ở đây (đổi liên tục): xem `docs/HANDOFF-N1.md` và kiểm bằng lệnh.
