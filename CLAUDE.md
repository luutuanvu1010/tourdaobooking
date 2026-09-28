# CLAUDE.md — tourdao-sales

> Đọc trước mỗi phiên. Đây là **lời khuyên cho AI, không phải cưỡng chế**; riêng các lệnh cấm ở §8 có thêm hàng rào máy. Chi tiết ở tài liệu được trỏ tới, không chép lại ở đây. Luật theo thư mục: `src/CLAUDE.md`, `web/CLAUDE.md` (chỉ tự nạp khi bạn ĐỌC tệp ở đó — làm việc bằng lệnh shell thì tự mở chúng).

## 1. Dự án
- CRM nội bộ **Công ty TNHH Tour Đảo** (Nha Trang): nhân viên lập đơn dịch vụ tour (chọn từ danh mục đồng bộ Google Sheet), ghi thông tin chuyến theo từng dịch vụ, xác nhận đơn; kế toán xem đơn; admin quản lý nhân viên, quyền, danh mục, hồ sơ khách/đại lý, địa điểm; có kênh Góp ý/Báo lỗi.
- Production `https://booking.tourdao.vn`: Cloudflare Worker `tourdao-sales` + D1 `tourdao-sales-db` + Workers Assets; PWA cài lên iPhone ("Tour Đảo Booking").
- **Độc lập** với repo `tourdaovn` (website công khai): khác Worker, D1, domain. Điểm chạm hiện có: giá trị token màu/font (chỉ sao chép giá trị).
- TypeScript, giao diện thuần (không React), esbuild, SQLite (D1), Node 22 (chạy `.ts` trực tiếp bằng `node --test`), **không có dependency runtime**.
- Tám quyền app, một tài khoản có nhiều quyền: `SALES`, `ACCOUNTING`, `ADMIN`, `FIELD`, `PARTNER`, `SUPER_ADMIN`, `INTERN`, `DRIVER` (Tài xế — ADR-0040). Từ vựng: `docs/SYSTEM-DESIGN.md` §15.

## 2. Thứ tự ưu tiên khi mâu thuẫn (Hiến pháp Điều 3.1)
Hiến pháp → ràng buộc dự án → ADR → quy trình/playbook → đặc tả → mã. Hiến pháp v2.3.0 nằm ngay trong repo ở `playbook/CONSTITUTION.md` (bản chép chỉ-đọc từ Core, ADR-0012 đã accepted; cách dùng và điều cấm: `playbook/PIN-README.md`). **Không sửa `playbook/`.**
- Tài liệu **chuẩn tắc** (Hiến pháp; **Hiến chương + luật ở `docs/ARCHITECTURE.md`**, đứng trên mọi ADR; ADR đã duyệt; `docs/SPEC-tourdao-sales.md` đã duyệt) **thắng mã**: mã lệch là lỗi, sửa mã.
- **Câu hỏi thiết kế mới: tra Hiến chương (`docs/ARCHITECTURE.md` Phần I) trước**, chỉ các điều dòng Trạng thái ghi **đã duyệt**. Điều đã duyệt trả lời được **nguyên tắc** thì không hỏi lại chủ về nguyên tắc đó. Áp nó vào một quyết định cụ thể chạm dữ liệu, quyền, tiền, hợp đồng hay bất biến **vẫn dừng và hỏi / qua ADR chủ duyệt** như §3 (Hiến pháp P8, N3).
- Tài liệu **mô tả** (`docs/SYSTEM-DESIGN.md`, `docs/DATA-DICTIONARY.md`, `docs/CHANGE-GUIDE.md`) **thua mã**: sửa tài liệu trong cùng commit.
- **Lệch có chủ ý** đã ghi ở `docs/SYSTEM-DESIGN.md` §16 (mã đúng, tài liệu chuẩn tắc lệch): không sửa mã; giữ ở §16 và trình chủ để ra ADR/dòng lịch sử mới.
- Không tự hoà giải bằng suy đoán: dừng, nêu xung đột, hỏi chủ.

## 3. Vai của AI (quan trọng nhất)
- **Chủ dự án là người quyết định cuối và duy nhất** (P7, P9); AI thực thi. Quyết định kiến trúc/chiến lược và cửa một chiều cần ADR + chủ duyệt: AI không tự quyết (N3, Điều 7.2).
- **Khi mơ hồ** (P8):
  - Chạm dữ liệu, logic, hợp đồng giữa các phần (module/API/schema) hoặc bất biến: **luôn DỪNG và hỏi**, dù nhỏ.
  - Chỉ bề mặt và đảo ngược được: tự đưa giả định, ghi lại trong commit/báo cáo, đi tiếp.
  - Không chắc thuộc loại nào thì coi là cấu trúc và dừng.
  - "Dừng" chỉ áp cho **phần việc phụ thuộc câu trả lời**. Trước khi hỏi: gom mọi câu đang có vào **một lần hỏi**, và giao chạy nền phần việc không phụ thuộc câu trả lời (câu hỏi chặn cả phiên đến khi chủ trả lời). **Không hỏi lại điều đặc tả/kế hoạch đã chốt**: tự áp dụng, ghi lại. (Bài học Trang chủ mới 2026-09-23: một câu hỏi lúc đêm treo ~5 giờ, kéo theo cả phần API vốn không phụ thuộc.)
- **Mỗi phiên một vai cho cùng một việc**: lập kế hoạch, thi công, hoặc kiểm (P15). **Người thi công KHÔNG tự nghiệm thu** (N8).
- **Việc lớn** = đụng **dữ liệu** (schema, migration, dữ liệu thật), **quyền** (`permissions.ts`, tài khoản), **tiền** (tính/hiển thị tiền), **triển khai** (deploy, cấu hình Cloudflare) hoặc **luật** (tài liệu chuẩn tắc, hook, CLAUDE.md).
  - Thi công xong phải có **subagent kiểm độc lập, chỉ đọc**: đọc mã thật, chạy lại lệnh, chỉ báo cáo, không sửa. Chỉ báo "đạt" dựa trên báo cáo đó + test, không tự khai.
  - Việc còn lại (sửa chữ, tài liệu mô tả, CSS không đụng logic, thêm test): test xanh + tóm tắt, chủ duyệt.
- **Không tự tay đổi luật chi phối chính mình** (N9): `CLAUDE.md`, `.claude/`, `playbook/`, ràng buộc dự án, ADR đã duyệt. Chỉ **đề xuất** bằng diff/tệp trên nhánh; chủ duyệt mới có hiệu lực (riêng `CLAUDE.md`: chỉ được tự sửa số đếm, số migration, tên tệp cho khớp mã, không đổi nghĩa quy tắc; `playbook/` và ADR đã duyệt thì không). Dựng thêm hàng rào chỉ **siết** chính mình (test, hook, deny) thì được, không nới (Điều 9.4).
- Viết **tiêu chí nghiệm thu trước khi làm**, bằng hành vi kiểm được (P20). Cơ chế kiểm mới chỉ được coi là hoạt động khi **đã quan sát nó chặn thật một lần** (sửa cố ý → đỏ → hoàn nguyên) (P16); điều chưa cưỡng chế được ghi là "dựa vào kỷ luật".
- **Sổ hàng rào** (chủ duyệt 2026-09-24): mọi hàng rào mà AI dựa vào để tin mình an toàn phải có dòng trong `docs/SO-HANG-RAO.md` — chặn cái gì, cơ chế, ngày quan sát chặn thật (sửa cố ý → đỏ → hoàn nguyên). Hàng rào không có dòng, hoặc dòng chưa có ngày quan sát, coi là lời khuyên. (Bài học 24/9: test khoá GIÁ TRỊ bản đồ quyền được đọc nhầm thành "bản đồ đang được thi hành" — 13/25 ô không được máy chủ hỏi.)
- **Dừng dây chuyền** (chủ duyệt 2026-09-24): phát hiện an ninh mức HIGH trở lên (kiểm toán, red team) phải có mục trong `docs/quyen-hoan.json` (hoặc sổ tương đương) với người chịu trách nhiệm và hạn; quá hạn thì `npm test` đỏ. Đặc tả/kế hoạch chạm vùng đang hở phải ghi "xây trên lỗ đang hở: <mã>" và không được duyệt trước khi lỗ được vá hoặc chủ dự án gia hạn có ghi lý do.
- Thấy dấu hiệu một nguyên tắc sắp/đang bị vi phạm: nói ngay **một lần**, bằng lời thường (số hiệu điều để trong ngoặc); chủ đã nghe và vẫn quyết thì thi hành, không nhắc lại (P18).

## 4. Trả lời chủ dự án: ngắn, dễ hiểu, phi kỹ thuật
Chủ dự án không phải lập trình viên. Quy tắc này áp cho **câu trả lời trò chuyện với chủ**. Tài liệu, commit, nhật ký và báo cáo giữa các AI (người kiểm ↔ điều phối) vẫn viết đủ (tệp:dòng, lệnh) để người sau kiểm được.
- **Kết luận trước** (1–2 câu), rồi điều chủ cần làm hoặc quyết. Sau đó tối đa vài gạch ngắn. Không kể quy trình, không giải thích dài.
- **Lời thường.** Tránh thuật ngữ, tên tệp, đường dẫn, mã commit, tên hàm, số hiệu điều luật (riêng cảnh báo P18 được để số hiệu trong ngoặc). Bắt buộc dùng thuật ngữ thì kèm giải nghĩa một câu (nói "bản sao Hiến pháp", không nói "pinned copy").
- **Chi tiết chỉ khi chủ hỏi.** Số liệu, bằng chứng, lệnh đã chạy ghi vào tài liệu/nhật ký; trong câu trả lời chỉ nêu tên một tệp khi chủ cần xem.
- **Cần chủ chọn:** nêu 2–3 phương án, mỗi phương án một dòng (làm gì, được/mất gì), kèm một khuyến nghị.
- **Việc chủ phải làm:** từng bước đánh số, mỗi lệnh một khối riêng, nói rõ chạy ở thư mục nào, chép-dán chạy được.
- **Không bịa.** Điều chưa kiểm nói rõ "chưa kiểm"; không trình bày suy đoán như sự thật.
- **Báo cáo cuối việc: 4 mục có nhãn, mỗi mục một hai câu** (tổng kết nhiều việc thì gộp lại theo 4 mục): Đã làm — Đã kiểm (nói rõ đã có người kiểm độc lập chưa) — Chưa làm/chưa kiểm — Cần bạn quyết. Không nói "xong" khi test/typecheck chưa chạy hoặc đỏ.
- Trả lời bằng **tiếng Việt CÓ DẤU**.

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
| `npm run db:migrate:local` / `db:migrate:remote` | áp migration; **remote do chủ tự chạy, theo runbook (§8)** |

## 6. Đọc gì, khi nào (nạp đúng lúc, không nạp hết)
- **Chỉ đọc khi việc cần, và chỉ đúng mục cần.** Tài liệu dài (Hiến pháp, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`) đừng đọc hết: liệt kê tiêu đề (`grep -n "^#" <tệp>`), rồi đọc đúng mục theo số dòng. Với Hiến pháp: `grep -n "^\*\*N9\." playbook/CONSTITUTION.md` (nguyên tắc), `grep -n "^## Điều" playbook/CONSTITUTION.md` (các Điều).
- **Không dùng `@tệp` để nhập vào CLAUDE.md** (nhập bằng `@` nạp cả tệp ngay khi mở phiên). Chỉ chỉ đường bằng tên tệp như bảng dưới. Đọc xong dùng luôn, không chép lại vào câu trả lời.

| Việc | Đọc (đúng mục) |
|---|---|
| Không chắc nên hỏi chủ hay tự quyết; ai được quyết gì | Hiến pháp `playbook/CONSTITUTION.md`: P8, Điều 7.1 và 7.3 |
| Việc lớn (dữ liệu, quyền, tiền, triển khai, luật, hook): ai kiểm, "xong" là gì | Hiến pháp: N3, N8, N9, P15, P16, Điều 6.1; điều cấm: Điều 5 |
| Sửa luật, ADR, CLAUDE.md, `playbook/` | Hiến pháp Điều 9; `playbook/PIN-README.md`; `docs/adr/README.md` |
| Hệ thống chạy thế nào (máy chủ, đăng nhập, một request) | `docs/SYSTEM-DESIGN.md` §2–§4 |
| Luồng nghiệp vụ (lập đơn, xác nhận, phân công…) | `docs/SYSTEM-DESIGN.md` §6; nghiệp vụ và quyết định của chủ: `docs/SPEC-tourdao-sales.md`, `docs/superpowers/specs/` |
| Dữ liệu: bảng, quan hệ, migration | `docs/SYSTEM-DESIGN.md` §5; từng cột: `docs/DATA-DICTIONARY.md` (nguồn `docs/data-dictionary.json`) |
| API, quyền, bảo mật | `docs/SYSTEM-DESIGN.md` §7, §8, §11 |
| Thiết kế mới (dữ liệu, vai, quyền, tiền, luồng) — **đọc đầu tiên** | Hiến chương `docs/ARCHITECTURE.md` Phần I; hiện trạng `docs/SYSTEM-DESIGN.md` §17 |
| Kiến trúc: ranh giới module, nơi đặt mã | `docs/ARCHITECTURE.md` Phần II; quyết định đã duyệt: mục lục `docs/adr/README.md` rồi ADR liên quan |
| Hồ sơ khách/đại lý/đối tác, danh tính | ADR-0001, ADR-0010; đối chiếu Oracle TCA (bản nháp): `docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md` |
| Giao diện, hệ thống thiết kế (màu, chữ, khoảng cách, thành phần) | token ở đầu `public/app.css`; luật giao diện: `web/CLAUDE.md`; thiết kế màn hình: `docs/superpowers/specs/2026-09-19-a2-giao-dien-design.md`, `docs/SYSTEM-DESIGN.md` §9; iPhone: `docs/PWA-IPHONE.md` |
| Sửa/thêm nhanh: công thức từng loại việc, bẫy | `docs/CHANGE-GUIDE.md`: §1 bảng "muốn … → xem …", rồi đúng công thức ở §2; §3 ma trận "đổi gì → chạy kiểm nào" |
| Triển khai, áp migration, hoàn tác, trạng thái production | `docs/HANDOFF-N1.md`: mục "TRẠNG THÁI TRIỂN KHAI" ở đầu tệp = hiện trạng; runbook từng lần phát hành; "Việc còn treo / nợ" ở cuối tệp |
| Lộ trình, việc tiếp theo | `docs/SYSTEM-DESIGN.md` §14; `docs/HANDOFF-N1.md` (Việc còn treo) |
| Chế độ bảo trì; Góp ý / Báo lỗi | `docs/HANDOFF-CHE-DO-BAO-TRI.md`; `docs/HANDOFF-FEEDBACK.md` |
| Lịch sử thi công, ruling, nợ kỹ thuật | `docs/superpowers/plans/*-thi-cong-nhat-ky.md` |
| Bằng chứng giao diện | `docs/evidence/` |

## 7. Quy tắc bắt buộc (chi tiết theo thư mục ở `src/CLAUDE.md`, `web/CLAUDE.md`)
- **Ngôn ngữ**: giao diện, thông báo lỗi, tài liệu, commit đều **tiếng Việt CÓ DẤU** đầy đủ; không chữ Anh lộ ra người dùng, kể cả mã trạng thái thô như `cancelled`.
- **Kiến trúc** (`src/architecture.test.ts` ép đầy đủ cho module "nghiêm"; module cũ còn ngoại lệ có hạn): module chỉ import module khác qua `index.ts`; chỉ module chủ ghi bảng của mình; đọc xuyên module chỉ qua view `v_<tiền tố>_*`; `src/shared/` và `web/` không import `src/modules/`.
- **Dữ liệu**: tiền = `INTEGER` VNĐ, dẫn xuất chỉ tính ở **server** (`buildLines`), không tin số tiền từ trình duyệt; ngày/giờ dân sự theo **giờ Việt Nam** (`vnToday`), dấu thời gian ISO UTC; không xoá cứng (hiệu lực bằng `valid_from/to`).
- **Migration**: chỉ thêm tệp mới, **không sửa tệp đã áp remote**; đổi phá vỡ theo expand–contract trong hai lần phát hành; bảng/cột mới → cập nhật `docs/data-dictionary.json` + `npm run dict`.
- **Giao diện** (chi tiết `web/CLAUDE.md`): không `innerHTML` (dựng bằng `h()`); giá trị CSS đi vào token; ô gõ 16px; trang mới khai `PAGES` (`src/shared/sw-policy.ts`) và script `build:web`. Sửa giao diện thì chạy lại đúng kịch bản Chrome.
- **Bảo mật**: mặc định từ chối (route khai `access`; ma trận ở `src/shared/permissions.ts`); POST/PUT/PATCH cần header `Origin` cùng site (thử bằng curl phải tự thêm); nhật ký **không ghi** SĐT/email/MST (`staff_updated` từng ghi SĐT, đã sửa 2026-09-21; **nhật ký cũ trên production vẫn còn số** vì nhật ký chỉ-thêm — đừng sao chép kiểu cũ); bí mật chỉ qua `wrangler secret put` / `.dev.vars` (gitignored), **không** commit khoá, không nạp bí mật vào ngữ cảnh khi không cần (N10).
- **Kiểm thử**: sửa hành vi → viết test **đỏ trước, xanh sau**; luật thuần có `*.test.ts` cạnh tệp; hành vi API có kịch bản `tests/e2e`. Chạm API/migration thì chạy cả e2e.

## 8. Git, triển khai, an toàn
- Sửa mã trong **git worktree riêng** (`.claude/worktrees/<tên>`), không sửa thẳng ở checkout gốc. Commit nhỏ, thông điệp tiếng Việt: tiêu đề nói việc, thân nói **vì sao**. Thêm dòng đồng tác giả nếu môi trường yêu cầu.
- **CẤM AI tự chạy** (chủ quyết rồi tự chạy, bằng `!` hoặc trong Terminal): `git push`, merge vào `main` (kể cả `gh pr merge`), `wrangler deploy`/`rollback`/`secret …`, `wrangler d1 migrations apply --remote`, ghi hoặc `d1 execute` trên D1 remote, `wrangler dev --remote`, kịch bản hay `curl` ghi lên API production. Không `--force`. Hỏi "được chưa?" không phải là lệnh. Chủ ra lệnh thì AI làm hết bước chuẩn bị và kiểm, rồi đưa **nguyên lệnh** (kèm thư mục cần đứng).
- **Hàng rào máy** (chỉ chặn nhầm/quên, không chống cố ý lách): hook `.claude/hooks/guard-remote.mjs` (lớp 1) + `permissions.deny` ở `.claude/settings.json` (lớp 2). **Hook không có công tắc tạm**, kể cả khi chủ ra lệnh.
- Thấy một lệnh cấm chạy được là lỗi của hàng rào: **báo chủ, không coi là được phép**. Kiểm hàng rào: `node --test src/claude-guard.test.ts`.
- **Đừng khẳng định trạng thái production từ tài liệu hay bộ nhớ** (từng lệch nhau khi nhiều phiên deploy song song): kiểm bằng GET công khai hoặc lệnh chỉ đọc (`wrangler d1 migrations list … --remote`, `wrangler deployments list`). Chỉ deploy từ `main` đã gộp, theo `docs/HANDOFF-N1.md`: **mục nhật ký thay đổi mới (bước A.0)** → cổng chỉ-đọc → **`kiem-phien-ban.mjs` ĐẠT** → điểm khôi phục Time Travel → test + typecheck + e2e xanh → migration → `wrangler deploy` ngay → `audit-invariants --db remote` → **`kiem-phien-ban.mjs --sau-deploy`** → ghi trạng thái (kèm số phiên bản). Từ 2026-09-23 mọi bước sau A.0 do `npm run trien-khai` làm, kể cả hai cổng phiên bản. `CI=1` để wrangler không hỏi.
- Không tạo/sửa tài khoản, quyền, hồ sơ trên production trong "cửa sổ đóng băng" (`docs/HANDOFF-N1.md`, phần Hoàn tác).
- Không sửa ADR/đặc tả đã duyệt để hợp thức hoá mã; quyết định kiến trúc mới → ADR mới do chủ duyệt.

## 9. Quy trình
- **Việc nhỏ/rõ**: công thức ở `docs/CHANGE-GUIDE.md` → test → commit.
- **Tính năng mới**: đặc tả ngắn ở `docs/superpowers/specs/` (ghi giả định và điều chưa chắc) → kế hoạch ở `docs/superpowers/plans/` → thi công theo task (mỗi task đỏ→xanh, việc lớn có người kiểm độc lập §3) → cập nhật `SYSTEM-DESIGN.md`/`CHANGE-GUIDE.md`/`data-dictionary.json` nếu đổi cấu trúc.
- **Việc nhiều bước**: ghi sổ điều phối `docs/superpowers/plans/…-thi-cong-nhat-ky.md` (ruling, nợ). Mỗi việc một phiên; trạng thái sống trong tài liệu, không trong trí nhớ phiên (P19).
- **Bước ghép khi duyệt** (chủ duyệt 2026-09-24): khi một lượt duyệt gồm ≥ 2 quyết định (ADR/đặc tả), hoặc khi một bảng dùng chung nhận thêm một loại dữ liệu mới, người soạn phải kèm **một trang ghép**: (1) bảng này chứa những loại thực thể nào; (2) từng dòng bản đồ quyền chạm bảng này áp cho loại nào; (3) cổng nào canh cửa nào. Không có trang ghép thì lượt duyệt chưa đủ điều kiện. Mỗi lượt duyệt tối đa **3** quyết định có chạm quyền/dữ liệu. (Bài học 20/9: ba ADR đúng riêng lẻ, ghép lại thành lỗ F-01 vì không ai hỏi "bảng hồ sơ nay chứa ai".)
- Yêu cầu chưa rõ: xử lý theo P8 ở §3 (cấu trúc → hỏi chủ; bề mặt đảo ngược được → giả định có ghi). Đừng nở phạm vi ra ngoài điều được giao.

## 10. Bẫy hay dính (danh sách đầy đủ: `docs/CHANGE-GUIDE.md`)
- `public/js/` và `public/sw.js` không có trong git: quên `npm run build:web` thì trang cũ/hỏng (`wrangler dev`/`deploy` tự build).
- E2E cần mạng; nhiều `wrangler dev` mồ côi gây "database is locked" — tắt trước khi chạy.
- `wrangler d1 migrations apply` áp **mọi** migration chưa áp: migration "siết" (B5 `staff_party_required`) không được lọt vào `migrations/` trước lần phát hành 2 (`src/migrations-n1.test.ts` nhận theo TÊN tệp).
- **Số migration**: hiện có **hai** tệp `0016_*` (`0016_feedback`, `0016_maintenance`) — chấp nhận được vì wrangler theo dõi theo TÊN đầy đủ. Số kế tiếp = số lớn nhất trong `migrations/` + 1 (kiểm bằng `ls migrations`). Trước khi đặt số, liệt kê migration của **mọi nhánh/worktree chưa gộp** (`git ls-tree --name-only <nhánh> migrations/`); migration B5 đang chờ số kế tiếp (`docs/HANDOFF-N1.md`).
- Turnstile ở đăng nhập: bật khi có `TURNSTILE_SECRET_KEY`, **tắt** khi vắng; kiểm TRƯỚC bộ chống dò PIN; 403 vẫn có một dòng log (`turnstile_failed`, chỉ mã lý do). Khi deploy: khoá site (`vars`) đi cùng mã, `wrangler secret put TURNSTILE_SECRET_KEY` đặt **SAU** khi nhân viên đã mở app một lần (service worker cache `login.js` cũ). `npm run types` khi thiếu `.dev.vars` làm mất `SESSION_SECRET` khỏi `Env`. Chi tiết: `docs/CHANGE-GUIDE.md` công thức l.
- Face ID (passkey, ADR-0016): `PASSKEY_RP_ID` phải **đúng** `booking.tourdao.vn` (không phải domain phụ, không có `https://`) — production đọc từ `vars` của `wrangler.jsonc`, **không** phải bí mật. Local/thử LAN phải ghi đè bằng giá trị `localhost`/IP nội bộ trong `.dev.vars` (mẫu `.dev.vars.example`); thiếu ghi đè thì nút Face ID hiện nhưng luôn gọi thất bại (rpId không khớp origin đang mở) — dễ nhầm là lỗi mã. Chi tiết: `docs/CHANGE-GUIDE.md` công thức r.
- Chế độ bảo trì (`mnt_setting`): **chỉ chủ dùng được**; bật thì **máy chủ** chặn mọi SĐT ngoài `allowed_phones` (kể cả phiên đang mở); chỉ bật khi chủ quyết, sau khi cột "Đăng nhập gần nhất" cho thấy mọi người đã đăng nhập bằng bản mới; chủ bị khoá thì tắt bằng SQL ở `docs/HANDOFF-N1.md`; `last_login_at` ghi ở đăng nhập PIN VÀ đăng nhập Face ID (công thức q, r).
- Cột chết `staff.role` (hằng `'sales'`) và `staff.full_name` (hằng `''`): đọc quyền/tên từ `stf_permission`/hồ sơ.
- `orders` KHÔNG import `dispatch`; "đang là người phụ trách" do gốc lắp ráp tiêm (`ctx.isAssigned`); route dùng ô `ownOrAssigned` phải truyền `assigned` vào `can()`.
- Kịch bản Chrome: các trang dùng CHUNG kho cookie — trang của tài khoản nào phải mở SAU CÙNG.
- **Hồ sơ công ty chủ** (Tour Đảo, vai `OWNER_COMPANY`, migration `0030`): tên/MST/địa chỉ/hotline/email chỉ đọc qua `ownerCompany` của `parties` — `company_profile` đã chết cột pháp lý, đừng đọc lại. Vai này KHÔNG kết thúc được (409); đổi công ty chủ = người giữ `company.legal.write` gán vai cho hồ sơ tổ chức khác. Đổi sang hồ sơ thiếu tên pháp lý/MST/địa chỉ/liên hệ "Hotline" đang dùng bị máy chủ chặn (409 `owner_company_incomplete`); nhưng ĐÓNG liên hệ "Hotline" cuối cùng của công ty chủ hiện tại chưa bị chặn và làm `GET /api/company` 404 → biên nhận báo lỗi (thêm Hotline mới TRƯỚC khi đóng cái cũ). e2e trên D1 chung đừng đổi công ty chủ (không đổi lại được trong ngày). Chi tiết: `docs/CHANGE-GUIDE.md` công thức j, bẫy 48.
- **Giấy tờ của người + chữ `DRIVER`** (ADR-0040, migration `0031`–`0033`): số căn cước / bằng lái **không bao giờ** vào nhật ký, DTO mặc định, câu báo lỗi — chỉ route "xem đủ số" trả số, và ghi nhật ký TRƯỚC; route giấy tờ mới phải thêm ca vào `src/giay-to-khong-lo-so.test.ts`. Gia hạn = dòng mới (không gửi số thì máy chủ chép số cũ); sửa sai chỉ dòng hiện hành, có lý do. Mã QUYỀN `DRIVER` khác mã VAI hồ sơ cũ `DRIVER` (đã ngưng); vai tài xế công ty là `DRIVER_INTERNAL`. Thêm một mã quyền là nhân đôi mọi bài "tập con quyền" (256 hôm nay). Chi tiết: `docs/CHANGE-GUIDE.md` công thức y.
- Hiện trạng production, số test, id Worker **không** ghi ở đây (đổi liên tục): xem `docs/HANDOFF-N1.md` và kiểm bằng lệnh.
