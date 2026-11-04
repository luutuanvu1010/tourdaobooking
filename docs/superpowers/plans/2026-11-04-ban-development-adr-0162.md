# Bản Development và một lệnh lên bản chính thức — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Có một bản Nền tảng chạy riêng ở `dev.tourdao.vn` để thử mã, và chỉ cho mã lên bản chính thức khi đúng bản đó đã chạy trên Development.

**Architecture:** Cấu hình riêng `wrangler.dev.jsonc`, không thêm khối `env` vào `wrangler.jsonc`, nên đường phát hành hiện tại giữ nguyên. Mọi khác biệt trên màn hình (dải «BẢN THỬ», tên cài, CSP, chặn lập chỉ mục, mã commit) được áp lúc dựng vào thư mục `dist-dev/` không vào git, nên `public/` và mã của bản chính thức không có nhánh «nếu là bản thử». Mã máy chủ chỉ đổi đúng hai chỗ, đều không đổi hành vi bản chính thức: lọc thư và `sub` của VAPID.

**Tech Stack:** Node 22 chạy `.ts` trực tiếp, `node --test`, Wrangler 4, Cloudflare Workers, D1, R2, Durable Objects. Không thêm dependency.

**Spec:** `docs/adr/ADR-0162-ban-development-doc-lap-va-mot-lenh-len-chinh-thuc.md` (accepted 2026-11-04). Người thi công đọc cả ADR này và `scripts/release-lib.mjs`.

## Global Constraints

- Tên tài nguyên: Worker `tourdao-sales-dev`, D1 `tourdao-sales-dev-db`, kho `tourdao-sales-dev-ho-so`, `tourdao-sales-dev-ho-tro`, `tourdao-sales-dev-ve-dien-tu`, tên miền `dev.tourdao.vn`.
- Chữ cố định: dải «BẢN THỬ», tên cài «Tour Đảo Dev».
- Thi công ở phiên riêng (Hiến pháp P15, N8), bản làm việc mới tạo từ `main` nếu bản chứa ADR này đã nhập, không thì từ nhánh `claude/admin-delete-data-decision-31f0fc`.
- AI chỉ được chạy `npm run len-dev`. `len-chinh-thuc`, `lam-moi-dev`, `day-len`, `trien-khai`, `wrangler deploy`, `wrangler secret`, ghi hoặc đọc D1 thật vẫn bị chặn. Hook hôm nay còn cho qua mọi lệnh `wrangler r2` trừ xoá, kể cả ghi, đọc và mở kho ra ngoài (thử `evaluateBash` 4/11); Task 5 chặn thêm.
- Chỗ gõ lệnh: `len-dev` ở bản làm việc riêng có mã cần thử. `len-chinh-thuc` ở thư mục gốc `tourdao-sales`, đứng ở `main`, thư mục sạch. `lam-moi-dev`: lần đầu ở bản làm việc đang thi công, vì chưa nhập; sau khi nhập thì ở thư mục gốc.
- Task 5, Task 7, Task 8 cần chủ có mặt: Task 5, Task 8 sửa tệp luật nên máy hỏi chủ, Task 7 chủ tạo tài nguyên. Làm Task 5 trước Task 6, để lệnh `lam-moi-dev` bị chặn ngay từ khi chưa có.
- Không chép dữ liệu thật sang Development. Không đặt dữ liệu thử trong `migrations/`, vì thư mục này dùng chung và đi lên bản chính thức.
- `--remote --file` hỏng với OAuth: mọi câu SQL lên D1 thật dùng `--command`.
- Không chạy `npm run types`: thiếu `.dev.vars` là mất `SESSION_SECRET` khỏi `Env`. Biến mới đọc theo dạng, như `cauHinhThu`.
- Sửa `.claude/`, `CLAUDE.md` chỉ bằng công cụ sửa tệp, có chủ xác nhận.
- `src/release-lib.test.ts` giữ nguyên kỳ vọng cũ: đó là bằng chứng đường phát hành không đổi. `wrangler.jsonc`, `public/` không đổi một byte.
- **Thời hạn:** mục HC-5.11 trong `docs/quyen-hoan.json` hết hạn **2026-11-15**. Sau ngày đó `npm test` đỏ, mọi lệnh nhập đều dừng, kể cả lệnh mới, cho tới khi sửa hoặc chủ dời hạn.

## Quyết định của người lập kế hoạch

Đây là phần ADR để ngỏ hoặc phải diễn giải; chủ được báo lại.

1. **Dải, tên cài, CSP áp lúc dựng, không qua biến môi trường.** ADR viết «cần một biến nhận biết môi trường». Làm lúc dựng thì mã bản chính thức không có nhánh mới và CSP của bản chính thức không thêm tên miền thử. `MOI_TRUONG` chỉ còn dùng để lọc thư.
2. **Mã commit nằm ở tệp tĩnh `/ban-thu.json` của `dist-dev/`,** không thêm trường vào `GET /api/auth/config`, để hợp đồng API của bản chính thức không đổi.
3. **`DB` ở `scripts/release-lib.mjs` giữ nguyên.** ADR ghi «đổi theo môi trường», nhưng chỉ `trienKhai` dùng hằng này; đường Development đọc tên từ `wrangler.dev.jsonc`, nên mục đích đạt mà không chạm đường phát hành.
4. **Bản chỉ đổi tài liệu không qua Development.** ADR viết `day-len` không gõ trực tiếp nữa. Nếu áp nguyên văn, mỗi bản tài liệu phải đưa lên Development chỉ để qua cổng. `len-chinh-thuc` tự nhận ra bản không đổi gì Nền tảng chạy (Task 5), bỏ qua cổng commit và `trien-khai`, chỉ chạy `day-len`.
5. **`lam-moi-dev` do chủ gõ,** AI bị chặn, vì ADR Đ5 chỉ cho AI đúng một lệnh. Hệ quả: hai bản chưa nhập cùng đổi cấu trúc dữ liệu mà luân phiên lên Development thì chủ phải gõ lệnh này mỗi lần đổi bản.
6. **Dữ liệu tạo sẵn tối thiểu:** bảy tài khoản thử như `scripts/dev-iphone.mjs`, danh mục tự đồng bộ từ Sheet. Chưa gieo đơn mẫu.
7. **Đường gửi thư là binding `EMAIL` của chính Worker thử, lọc trong mã;** danh sách là bí mật `THU_CHO_PHEP`. Lớp ở nền tảng chưa làm: `send_email` có `allowed_destination_addresses`, nhưng phải ghi địa chỉ thật vào tệp trong kho và chưa biết chạy với Email Service bản beta.
8. **Cookie không đổi sang `__Host-`,** vì sẽ đăng xuất mọi người trên bản chính thức. Ghi rõ giới hạn ở Task 3.
9. **Khoá Turnstile, khoá trợ lý để trống lượt đầu.** ADR Đ1 nói hai khoá này riêng; để trống thì tính năng tự tắt, không dùng chung khoá với bản chính thức. Đăng nhập trên Development vì vậy chỉ có bộ chống dò PIN.

## Review Focus

1. **Quên `--config`:** một lời gọi wrangler thiếu cờ này là ghi thẳng lên bản chính thức. Kỳ vọng: mọi lời gọi của `lenDev`, `lamMoiDev` đều mang cờ, tên `tourdao-sales-db` không xuất hiện. Ghim ở Task 4, Task 6; trang hướng dẫn của chủ ghim ở Task 7.
2. **`day-len` không đẩy mà vẫn thoát 0, hoặc chủ trả lời `k`:** `trien-khai` không được chạy. Ghim ở Task 5 bằng điều kiện sau: `main` và `origin/main` phải đúng mã đã thử.
3. **Không đọc được bản đang chạy trên Development** (mất mạng, tệp thiếu, nội dung lạ): dừng trước khi ghi, không coi là đạt. Ghim ở Task 5.
4. **Thư mục có sửa chưa lưu, hoặc lệnh dựng làm bẩn thư mục:** mã commit sẽ nói sai bản đang chạy. Dừng. Ghim ở Task 4.
5. **Development đang mang migration của nhánh khác:** kết quả thử không còn đáng tin. Dừng và chỉ `npm run lam-moi-dev`. Ghim ở Task 4.

---

### Task 1: Cấu hình Development và bài so cấu hình

**Files:**
- Create: `wrangler.dev.jsonc`, `scripts/moi-truong-lib.mjs`, `src/moi-truong-lib.test.ts`

**Interfaces:**
- Produces: `CAU_HINH_DEV = "wrangler.dev.jsonc"`; `docCauHinh(text): object | null` (bỏ chú thích cả dòng, như `docCacKhoTuCauHinh`); `kiemCauHinhDev(prodText, devText): string[]` (mảng rỗng = đạt, mỗi phần tử là một câu tiếng Việt); `conChoTrong(devText): string[]` (giá trị còn là chỗ trống, ví dụ `database_id`).

- [ ] **Step 1: Viết `wrangler.dev.jsonc`.** Chỉ chú thích cả dòng. Giống `wrangler.jsonc` ở `main`, `compatibility_date`, `observability`, `placement`, `triggers`, `send_email`, `durable_objects`, `migrations`, binding và `run_worker_first`, `not_found_handling` của `assets`. Khác ở: tên Worker và tài nguyên theo Global Constraints; `routes` là `dev.tourdao.vn`; `assets.directory` là `./dist-dev`; không có khối `build`; `vars`: `SERVICES_SHEET_ID` như cũ, `PASSKEY_RP_ID` `dev.tourdao.vn`, `PASSKEY_ORIGIN` và `VAPID_SUB` `https://dev.tourdao.vn`, `MOI_TRUONG` `development`, `VAPID_PUBLIC_KEY` `CHUA_TAO`; `database_id` `00000000-0000-0000-0000-000000000000`.

- [ ] **Step 2: Viết bài đỏ.** `kiemCauHinhDev` trên hai tệp thật trả `[]`. Bảng đột biến, mỗi dòng phải trả mảng khác rỗng: `database_id` = mã của bản chính thức; `database_name`, một `bucket_name`, `name` = của bản chính thức; `routes` là `booking.tourdao.vn`; `VAPID_PUBLIC_KEY`, `PASSKEY_RP_ID`, `PASSKEY_ORIGIN`, `VAPID_SUB` = của bản chính thức; bỏ `MOI_TRUONG`; `MOI_TRUONG` khác `development`; thêm `MOI_TRUONG` vào cấu hình bản chính thức; thêm hoặc bớt một kho, D1, Durable Object, cron, `send_email` ở một bên; đổi `run_worker_first`; khoá trong `vars` lệch ngoài `MOI_TRUONG`, `VAPID_SUB`; JSON hỏng. Thêm: `conChoTrong` trên tệp thật liệt kê đúng `database_id`, `VAPID_PUBLIC_KEY`.

- [ ] **Step 3: Chạy, thấy đỏ.** `node --test src/moi-truong-lib.test.ts`. Mong đợi: FAIL vì chưa có tệp lib.

- [ ] **Step 4: Viết `kiemCauHinhDev`, `conChoTrong`, `docCauHinh`.** Ngoại lệ duy nhất được trùng giá trị là `SERVICES_SHEET_ID` (ADR Đ1). So tên bằng so đúng, không so chuỗi con, vì tên thử có chứa `tourdao-sales`; riêng `database_id` và `booking.tourdao.vn` thì quét cả văn bản tệp thử.

- [ ] **Step 5: Chạy, thấy xanh.** Cùng lệnh. Mong đợi: PASS. Kiểm `git diff --stat wrangler.jsonc` rỗng.

- [ ] **Step 6: Commit.** Tiêu đề: `Cấu hình Development và bài so với bản chính thức`.

### Task 2: Dựng tài sản riêng cho Development

**Files:**
- Create: `scripts/dung-tai-san-dev.mjs`, `src/dung-tai-san-dev.test.ts`
- Modify: `.gitignore` (thêm `dist-dev/`)

**Interfaces:**
- Produces: `dungTaiSanDev({ goc, dich, commit }): void`, gọi từ dòng lệnh `node scripts/dung-tai-san-dev.mjs <commit>`; `quetBanChinh(dich): string[]` (tệp văn bản còn chứa `booking.tourdao.vn`). Sau khi dựng, `dist-dev/ban-thu.json` là `{"commit":"<40 ký tự hex>"}`.

- [ ] **Step 1: Viết bài đỏ, dựng từ `public/` thật vào thư mục tạm.** Mọi `.html` có `apple-mobile-web-app-title" content="Tour Đảo Dev"` và không còn `content="Island Booking"` ở thẻ đó; số trang kiểm bằng cách đếm thư mục, không ghi số cứng. Manifest có `name` và `short_name` là `Tour Đảo Dev`. `_headers` có `wss://dev.tourdao.vn`, có `X-Robots-Tag: noindex` trong khối `/*`, không còn `booking.tourdao.vn`. `robots.txt` là `User-agent: *` + `Disallow: /`. `app.css` chứa `BẢN THỬ`. `ban-thu.json` đúng mã. `public/_headers` vẫn chứa `wss://booking.tourdao.vn`. Commit sai khuôn thì ném lỗi. Tệp văn bản cài sẵn chứa `booking.tourdao.vn` thì ném lỗi.

- [ ] **Step 2: Chạy, thấy đỏ.** `node --test src/dung-tai-san-dev.test.ts`. Mong đợi: FAIL vì chưa có tệp.

- [ ] **Step 3: Viết `dungTaiSanDev`.** Xoá `dich` cũ, `cpSync` từ `goc`, áp các đổi trên, cuối cùng `quetBanChinh` và ném nếu còn. Dải là `body::before` nối vào cuối `app.css` (`app.css` chưa dùng `body::before`, cả 57 trang đều nạp): cố định ở đỉnh, tràn ngang, `pointer-events: none`, `z-index` cao nhất, nền đỏ đậm, chữ trắng, chừa `env(safe-area-inset-top)`.

- [ ] **Step 4: Chạy, thấy xanh.** Cùng lệnh. Mong đợi: PASS.

- [ ] **Step 5: Nhìn dải trên trang thật.** Dải có thể che thanh đầu dính của 57 trang, nên phải chốt cách chừa chỗ trước khi đi tiếp. Bản làm việc mới không có `.dev.vars` và hàng rào không cho ghi tệp đó, nên chạy tại máy theo cách của `scripts/dev-iphone.mjs` (D1 tạm, tài khoản gieo sẵn, khoá truyền bằng `--var`), thêm `--config wrangler.dev.jsonc`, sau khi đã dựng `dist-dev/`. Xem trang đăng nhập và Trang chủ ở khổ điện thoại, máy tính. Che chữ hay nút thì thêm đệm đầu trang, hoặc đặt dải ở đáy ở khổ đó; đây là việc bề mặt, tự chọn, ghi vào thân commit.

- [ ] **Step 6: Commit.** Tiêu đề: `Dựng tài sản Development: dải BẢN THỬ, tên cài, CSP riêng`.

### Task 3: Lọc thư, VAPID theo môi trường, ghim ranh giới cùng site

**Files:**
- Modify: `src/shared/gui-thu.ts`, `src/modules/feedback/notify.ts:31-34`, `src/shared/web-push.ts:100-165`, `src/shared/router.ts:301` (chỉ thêm `export`)
- Create: `src/thu-ban-thu.test.ts`, `src/ban-thu-cung-site.test.ts`
- Test: `src/shared/web-push.test.ts`

**Interfaces:**
- Produces: `cauHinhThu(env)` nhận thêm `MOI_TRUONG?: unknown`, `THU_CHO_PHEP?: unknown`; `khoaVapid(env)` trả thêm `sub: string` từ `env.VAPID_SUB`, mặc định hằng cũ; `taoJwtVapid(khoaBiMat, aud, nowSec, sub?)`.

- [ ] **Step 1: Viết bài đỏ cho thư.** Không có `MOI_TRUONG`: `cauHinhThu(env).mailer` chính là `env.EMAIL`. Có `MOI_TRUONG` với **bất kỳ giá trị nào** và `THU_CHO_PHEP` là `a@x.vn, B@x.vn`: gửi `b@x.vn` tới bộ gửi; `c@x.vn` không tới, không ném; `a@x.vn,c@x.vn` không tới. `THU_CHO_PHEP` trống hoặc thiếu: không thư nào tới. Dòng log khi bỏ thư không chứa địa chỉ. `mailConfig` của `notify.ts` trả bộ gửi đã lọc. Quét `src/` (trừ test): chỉ `src/shared/gui-thu.ts` khớp `/\b(?:env|e)\.EMAIL\b/`.

- [ ] **Step 2: Viết bài đỏ cho VAPID.** Không có `VAPID_SUB`: JWT có `sub` là `https://booking.tourdao.vn`. Có `VAPID_SUB` `https://dev.tourdao.vn`: JWT mang giá trị đó. Hai `sub` khác nhau không dùng chung JWT đã nhớ.

- [ ] **Step 3: Viết bài ghim cùng site.** Đọc mã 4/11 cho thấy các điều này đang đúng, nên bài xanh ngay; phải sửa cố ý để thấy đỏ một lần (Step 6). `checkWriteRequest` với POST tới `https://booking.tourdao.vn/api/x`, `Origin: https://dev.tourdao.vn` trả 403. `kiemOrigin` với cùng origin đó trả `false`. Bốn hàm dựng cookie (`sessionCookie`, thẻ xác thực Face ID, `PENDING_COOKIE`, `TRUSTED_COOKIE`) không chứa `Domain=`. `src/` (trừ test) không có `Access-Control-Allow`.

- [ ] **Step 4: Chạy, thấy đỏ phần thư và VAPID.** `node --test src/thu-ban-thu.test.ts src/shared/web-push.test.ts src/ban-thu-cung-site.test.ts`. Mong đợi: thư và VAPID FAIL, cùng site PASS.

- [ ] **Step 5: Viết mã.** `cauHinhThu` bọc bộ gửi khi có `MOI_TRUONG`; `mailConfig` lấy `mailer` qua `cauHinhThu`; thêm `export` cho `checkWriteRequest`; truyền `sub` qua `layJwt`, đưa `sub` vào khoá nhớ. Không đổi gì khi `MOI_TRUONG`, `VAPID_SUB` vắng.

- [ ] **Step 6: Quan sát chặn thật rồi hoàn nguyên (P16).** Đổi tạm `origin === url.origin` thành so đuôi `.tourdao.vn` ở `router.ts` và `rules.ts`: bài cùng site đỏ. Hoàn nguyên: xanh. Ghi kết quả cho Task 8.

- [ ] **Step 7: Chạy cả bài thư, Góp ý, hai lớp.** `node --test src/thu-ban-thu.test.ts src/shared/web-push.test.ts src/ban-thu-cung-site.test.ts src/modules/feedback/notify.test.ts`. Mong đợi: PASS. `npm run typecheck`: 0 lỗi.

- [ ] **Step 8: Commit.** Tiêu đề: `Bản thử chỉ gửi thư theo danh sách; ghim ranh giới cùng site`. Thân ghi giới hạn đã biết: trang ở bản thử có thể đặt cookie `Domain=tourdao.vn` làm người dùng bị đăng xuất, nhưng không chiếm được phiên vì khoá ký khác; website công khai `tourdao.vn` vốn đã cùng site.

### Task 4: Lệnh `len-dev`

**Files:**
- Modify: `scripts/moi-truong-lib.mjs`, `src/moi-truong-lib.test.ts`, `package.json`, `scripts/release-lib.mjs` (chỉ thêm `export` cho `makeStop`, `trimOut`, `NOT_TTY`, `yes`)
- Create: `scripts/len-dev.mjs`

**Interfaces:**
- Consumes: Task 1; `parseSecretNames`, `parseR2BucketNames`, `docCacKhoTuCauHinh`, `KHOA_BAT_BUOC`, `KHOA_HAI_LOP` từ `release-lib.mjs`.
- Produces: `lenDev({ run, log, args, docTep, tenMigration, docCommitDev, sleep }): Promise<number>`; `docCommitDev(goi = fetch): Promise<string | null>` đọc `https://dev.tourdao.vn/ban-thu.json?t=<ngẫu nhiên>` (tuỳ chọn `cache` của `fetch` trong Node không có tác dụng), trả `null` khi lỗi mạng, không phải JSON, hay mã sai khuôn.

- [ ] **Step 1: Viết bài đỏ bằng bộ chạy giả, kiểu `src/release-lib.test.ts`** (bộ chạy ném khi gặp lệnh ngoài kịch bản). Đường đạt đúng thứ tự: so cấu hình → chỗ trống → thư mục sạch → `npm run build:web` → `node scripts/dung-tai-san-dev.mjs <mã>` → thư mục vẫn sạch → `wrangler whoami` → `secret list` → `r2 bucket list` → đọc `d1_migrations` → `d1 migrations apply` → `deploy` → đọc lại mã. Dựng trước các lệnh wrangler vì chưa kiểm wrangler có đòi `assets.directory` tồn tại khi đọc hay không. **Mọi** lời gọi wrangler có `--config wrangler.dev.jsonc`; không tham số nào chứa `tourdao-sales-db`. Không có lệnh ghi nào trước cổng cuối.

  Các ca dừng, mã thoát khác 0, không có lệnh ghi: có tham số; cấu hình đột biến (trước cả kiểm thư mục, để Task 7 quan sát được bằng sửa chưa lưu); còn chỗ trống; thư mục bẩn; lệnh dựng làm bẩn thư mục (`build:web` sinh lại `src/shared/so-do-trang.ts`, `src/shared/tro-ly-cau-truc.ts`; câu báo liệt kê tệp bị đổi và nói commit chúng rồi chạy lại); thiếu khoá (câu báo có `--config wrangler.dev.jsonc`); thiếu kho; `d1_migrations` có tên không có ở `migrations/` (câu báo có `npm run lam-moi-dev`); lỗi đọc khác. Lỗi `no such table: d1_migrations` coi là rỗng. Sau deploy mã lệch một lần thì đợi rồi thử lại; vẫn lệch thì thoát khác 0. Không đòi TTY.

- [ ] **Step 2: Chạy, thấy đỏ.** `node --test src/moi-truong-lib.test.ts`. Mong đợi: FAIL ở các ca `lenDev`.

- [ ] **Step 3: Viết `lenDev`, `docCommitDev`, vỏ `scripts/len-dev.mjs`, script `len-dev` ở `package.json`.** Mọi wrangler đi qua một hàm nội bộ gắn `--config` và `CI=1`; không có đường gọi nào khác.

- [ ] **Step 4: Chạy, thấy xanh.** Cùng lệnh, thêm `src/release-lib.test.ts`. Mong đợi: PASS, không sửa kỳ vọng nào của `release-lib.test.ts`.

- [ ] **Step 5: Commit.** Tiêu đề: `Lệnh len-dev: áp migration và đưa mã lên Development`.

### Task 5: Lệnh `len-chinh-thuc` và hàng rào

Gộp mọi sửa `.claude/` vào task này, vì mỗi sửa là một lần hỏi chủ.

**Files:**
- Modify: `scripts/moi-truong-lib.mjs`, `src/moi-truong-lib.test.ts`, `package.json`, `.claude/hooks/guard-remote-lib.mjs:43-49`, `.claude/settings.json`, `src/claude-guard.test.ts:85-108`
- Create: `scripts/len-chinh-thuc.mjs`

**Interfaces:**
- Consumes: `docCommitDev` (Task 4), `isSafeBranchName`, `makeStop`, `NOT_TTY`, `trimOut`.
- Produces: `lenChinhThuc({ run, log, isTTY, target, docCommitDev }): Promise<number>`; `chiDoiTaiLieu(tenTep: string[]): boolean`.

- [ ] **Step 1: Viết bài đỏ.** `chiDoiTaiLieu`: đúng khi mọi tệp thuộc `docs/`, `.claude/`, hoặc là `.md` ngoài `public/`; sai với `src/x.ts`, `public/a.md`, `migrations/x.sql`, `scripts/x.mjs`; sai với mảng rỗng.

  `lenChinhThuc`: không TTY dừng, chưa gọi git; thiếu tên nhánh hoặc tên lạ dừng. Mã Development khác mã nhánh dừng, không gọi `day-len` (ADR tiêu chí 4). `docCommitDev` trả `null` dừng, không gọi `day-len`. Mã khớp: gọi `npm run day-len -- <nhánh>` rồi `npm run trien-khai`, đều `stream: true`. `day-len` khác 0: trả đúng mã đó, không gọi `trien-khai`. `day-len` bằng 0 mà `main` hoặc `origin/main` khác mã nhánh: dừng, không gọi `trien-khai`. `trien-khai` khác 0: trả đúng mã đó và in câu «Đã nhập, chưa triển khai», để chủ không tưởng cả lệnh đã hỏng. Chỉ đổi tài liệu: không gọi `docCommitDev`, gọi `day-len`, không gọi `trien-khai`, in câu báo. Không đọc được danh sách tệp đổi: dừng.

- [ ] **Step 2: Chạy, thấy đỏ.** `node --test src/moi-truong-lib.test.ts`. Mong đợi: FAIL ở các ca mới.

- [ ] **Step 3: Viết `lenChinhThuc`, vỏ, script ở `package.json`.** Gọi `day-len`, `trien-khai` thành **tiến trình con**, không gọi hàm trực tiếp: `trien-khai.mjs` đọc số phiên bản lúc khởi động, nếu cùng tiến trình sẽ dùng số phiên bản trước khi gộp. `day-len` chỉ gộp tiến thẳng nên mã nhánh không đổi, vì vậy cổng so mã là đủ. `day-len` đòi đứng ở `main`, thư mục sạch, nên câu dùng lệnh phải nói rõ gõ ở thư mục gốc.

- [ ] **Step 4: Viết bài đỏ cho hàng rào.** Thêm vào danh sách ở `src/claude-guard.test.ts:86`, phải bị chặn: `npm run len-chinh-thuc -- x`, `npm run lam-moi-dev`, `pnpm len-chinh-thuc`, `node scripts/len-chinh-thuc.mjs x`, `node ./scripts/lam-moi-dev.mjs`, `CI=1 npm run len-chinh-thuc`, `npm run len-dev && npm run len-chinh-thuc -- x`, `wrangler deploy --config wrangler.dev.jsonc`, `npx wrangler secret put X --config wrangler.dev.jsonc`, `wrangler d1 execute tourdao-sales-dev-db --remote --command "SELECT 1"`, `npx wrangler r2 object put tourdao-sales-ho-so/x --file y --remote`, `npx wrangler r2 object get tourdao-sales-ho-so/x --remote`, `npx wrangler r2 bucket create x`, `npx wrangler r2 bucket dev-url enable tourdao-sales-ho-so`, `npx wrangler r2 bucket domain add tourdao-sales-ho-so --domain x.tourdao.vn`, `npx wrangler r2 bucket cors set tourdao-sales-ho-so --file c.json`, `npx wrangler r2 bucket lifecycle add tourdao-sales-ho-so`, `npx wrangler r2 bulk put tourdao-sales-ho-so --filename a.json`. Phải được chạy: `npm run len-dev`, `node scripts/len-dev.mjs`, `cat scripts/len-chinh-thuc.mjs`, `git add scripts/len-chinh-thuc.mjs`, `npx wrangler r2 object put x/y --file z --local`, `npx wrangler r2 bucket list`, `npx wrangler r2 bucket info x`.

- [ ] **Step 5: Chạy, thấy đỏ.** `node --test src/claude-guard.test.ts`. Mong đợi: FAIL ở `len-chinh-thuc`, `lam-moi-dev`, các ca `r2`.

- [ ] **Step 6: Sửa hàng rào.** Thêm `len-chinh-thuc|lam-moi-dev` vào bốn biểu thức ở `guard-remote-lib.mjs:43-46`, cập nhật `reason`. Thêm tám dòng `deny` ở `.claude/settings.json`, theo mẫu của `day-len`. Thêm luật mới theo kiểu **chặn mặc định**: mọi `wrangler r2` đều bị chặn, chỉ trừ `r2 bucket list`, `r2 bucket info` và `r2 object … --local`. Lý do: kho tệp hồ sơ chứa ảnh giấy tờ của người, và liệt kê từng lệnh cấm thì sót, như `dev-url enable` sẽ mở kho ra ngoài. Luật này thêm sau vòng kiểm kế hoạch, người kiểm cuối ở Task 8 phải đọc kỹ. `tests/e2e/ho-so-tep.mjs` gọi `r2 object … --local` qua tiến trình con, không đi qua hook, nên không ảnh hưởng.

- [ ] **Step 7: Chạy, thấy xanh, rồi quan sát chặn thật.** `node --test src/claude-guard.test.ts src/claude-guard-luat.test.ts src/moi-truong-lib.test.ts`. Mong đợi: PASS. Sau đó thử thật bằng Bash `npm run len-chinh-thuc -- x` và `npm run lam-moi-dev`: phải bị chặn. Ghi ngày và câu báo cho Task 8 (ADR tiêu chí 3).

- [ ] **Step 8: Commit.** Tiêu đề: `Lệnh len-chinh-thuc: chỉ lên chính thức khi đúng bản đã thử; chặn AI`.

### Task 6: Lệnh `lam-moi-dev`

**Files:**
- Modify: `scripts/moi-truong-lib.mjs`, `src/moi-truong-lib.test.ts`, `package.json`, `scripts/dev-iphone.mjs:27-35`
- Create: `scripts/lam-moi-dev.mjs`, `scripts/tai-khoan-thu.mjs`

**Interfaces:**
- Consumes: `insertStaffSql` (`scripts/staff-lib.mjs`), `isWeakPin`.
- Produces: `taoTaiKhoanThu(): { name, phone, pin, permissions }[]` (bảy tài khoản của `dev-iphone.mjs`, PIN ngẫu nhiên); `lamMoiDev({ run, ask, log, isTTY, docTep, taoTaiKhoan, sqlTaiKhoan }): Promise<number>`.

- [ ] **Step 1: Viết bài đỏ.** Không TTY dừng; trả lời khác đúng chữ `dev` dừng; cấu hình đột biến dừng; tên D1 không kết thúc bằng `-dev-db` dừng. Đường đạt, đúng thứ tự: đọc `sqlite_master` → xoá view → **một** `--command` bắt đầu bằng `PRAGMA defer_foreign_keys = ON;` chứa mọi `DROP TABLE` (SQLite không chạy trigger khi xoá bảng, trigger mất theo bảng, nên không xoá trigger riêng) → `d1 migrations apply` → mỗi tài khoản một `--command` → in SĐT và PIN. Bỏ qua đối tượng `sqlite_%`, `_cf_%`. Mọi lời gọi có `--config wrangler.dev.jsonc`; không tham số nào là `--file`; không tham số nào chứa `tourdao-sales-db`. Thiếu một bước thì dừng và báo đã làm tới đâu.

- [ ] **Step 2: Chạy, thấy đỏ.** `node --test src/moi-truong-lib.test.ts`. Mong đợi: FAIL ở các ca `lamMoiDev`.

- [ ] **Step 3: Viết `tai-khoan-thu.mjs`, `lamMoiDev`, vỏ, script ở `package.json`; cho `dev-iphone.mjs` dùng lại danh sách.** PIN chỉ in ra Terminal của chủ, không ghi tệp, không commit. Kho tệp và Bảng tin không dọn; in một câu nói rõ điều đó.

- [ ] **Step 4: Chạy, thấy xanh.** Cùng lệnh. Mong đợi: PASS. Kiểm `node scripts/dev-iphone.mjs` còn khởi động được.

- [ ] **Step 5: Commit.** Tiêu đề: `Lệnh lam-moi-dev: đưa Development về trạng thái sạch`.

### Task 7: Tạo tài nguyên và chạy thật

Chủ phải tự chạy lệnh ở task này. Chưa xong Task 1–6 thì chưa gọi chủ, để chủ chỉ làm một lượt. Mọi lệnh của task này chạy ở **bản làm việc đang thi công**, vì `wrangler.dev.jsonc` và `lam-moi-dev` chưa có ở thư mục gốc; trang hướng dẫn in đúng đường dẫn đó, và ghi rằng sau khi nhập thì chạy ở thư mục gốc.

**Files:**
- Create: `docs/HUONG-DAN-TAO-BAN-DEVELOPMENT.md`
- Modify: `wrangler.dev.jsonc` (mã D1 và khoá công khai VAPID), `src/moi-truong-lib.test.ts`

- [ ] **Step 1: Viết bài đỏ cho trang hướng dẫn.** Mọi dòng có `wrangler` chứa `--config wrangler.dev.jsonc`, kể cả `d1 create`, `r2 bucket create`: lỡ trả lời có ở câu wrangler hỏi thêm thì sửa cũng rơi vào tệp thử, không vào `wrangler.jsonc`. Mọi tên kho và tên D1 trong trang khớp `wrangler.dev.jsonc`. Không dòng nào chứa `tourdao-sales-db`, `tourdao-sales-ho-so`, `booking.tourdao.vn`.

- [ ] **Step 2: Viết trang, một trang, lời thường.** Từng khối lệnh một, nói rõ đứng ở thư mục nào: `wrangler d1 create`; ba `r2 bucket create`; tạo cặp khoá VAPID theo `docs/HUONG-DAN-BAT-THONG-BAO-DIEN-THOAI.md` Bước 3; sinh `SESSION_SECRET`, `LAN_GUI_SECRET`, `MFA_ENCRYPTION_KEY`; đặt `VAPID_PRIVATE_KEY`, `FEEDBACK_MAIL_FROM`, `FEEDBACK_NOTIFY_EMAIL`, `THU_CHO_PHEP`. Hai lời dặn in đậm: wrangler hỏi thêm về việc sửa cấu hình thì trả lời **n**; thiếu `--config wrangler.dev.jsonc` là ghi đè khoá của bản chính thức. Khoá Turnstile, khoá trợ lý để trống lượt đầu: tính năng tự tắt. `FEEDBACK_NOTIFY_EMAIL` chỉ đặt **một** địa chỉ, vì `notify.ts` gửi một thư và bộ lọc bỏ cả thư nếu có địa chỉ ngoài danh sách. Ghi thêm ba điều: tài khoản thử nội bộ có ân hạn 14 ngày rồi phải dùng lớp hai, nên khi đó dùng ứng dụng tạo mã, đưa địa chỉ vào `THU_CHO_PHEP`, hoặc chạy lại `lam-moi-dev`; thông tin công khai của công ty từ migration `0002`, `0030` vẫn có trên bản thử; `len-chinh-thuc` gõ ở thư mục gốc, đứng ở `main`. **Chưa kiểm:** `secret put` khi Worker chưa tồn tại sẽ hỏi tạo Worker, phải thử ở lần đầu; trang ghi trả lời thế nào sau khi đã thử.

- [ ] **Step 3: Chạy bài, thấy xanh, commit.** `node --test src/moi-truong-lib.test.ts`. Tiêu đề: `Trang hướng dẫn chủ tạo tài nguyên Development`.

- [ ] **Step 4: Chủ làm theo trang.** Chủ gửi lại mã D1 và khoá công khai VAPID, đây không phải bí mật. Người thi công điền vào `wrangler.dev.jsonc`, chạy bài, commit. Nút trả lời không phải bằng chứng: bước sau tự kiểm.

- [ ] **Step 5: Chủ chạy `npm run lam-moi-dev`, AI chạy `npm run len-dev`.** Mong đợi: lệnh in mã commit, `GET https://dev.tourdao.vn/ban-thu.json` trả đúng mã đó. Đây cũng là lần đầu thử `DROP TABLE` có khoá ngoại và `--command` nhiều câu trên D1 thật. Phương án dự phòng nếu lệnh một lượt bị đỏ vì wrangler không gửi cả chuỗi trong một giao dịch: chủ chạy `npx wrangler d1 delete tourdao-sales-dev-db` rồi tạo lại, gửi mã mới; `lamMoiDev` đổi thành dừng và in hai lệnh đó, rồi chỉ chạy migration và gieo tài khoản khi cơ sở dữ liệu rỗng. Không sửa dữ liệu bằng tay.

- [ ] **Step 6: Quan sát ADR tiêu chí 2.** Sửa chưa lưu `wrangler.dev.jsonc` thành mã D1 của bản chính thức, chạy `npm run len-dev`: phải từ chối ở bài so cấu hình, không gọi `wrangler`. Hoàn nguyên, chạy lại `node --test src/moi-truong-lib.test.ts`: xanh.

- [ ] **Step 7: Kiểm bằng Chrome trên `dev.tourdao.vn`.** Có dải «BẢN THỬ» ở các trang đăng nhập, Trang chủ, Đơn hàng, ở khổ điện thoại và máy tính; dải không che nút bấm. Bảng tin nối được, Console không có lỗi CSP. Chụp ảnh thật gửi chủ.

- [ ] **Step 8: Kiểm ADR tiêu chí 1, 5.** Tạo một đơn trên Development; chủ tìm mã đơn đó trên `booking.tourdao.vn`, không thấy. Gửi Góp ý: địa chỉ trong `THU_CHO_PHEP` nhận thư; đổi `FEEDBACK_NOTIFY_EMAIL` sang địa chỉ ngoài danh sách thì không nhận. Web Push và Face ID ghi «chưa kiểm» nếu chưa thử trên iPhone thật.

### Task 8: Tài liệu, kiểm toàn bộ, người kiểm độc lập

**Files:**
- Modify: `CLAUDE.md` §5, §8; `docs/SO-HANG-RAO.md`; `docs/QUY-TRINH-PHAT-HANH.md`; `docs/CHANGE-GUIDE.md`; `docs/HANDOFF-N1.md` (mục trạng thái); `docs/superpowers/plans/` (nhật ký thi công nếu có ruling)

- [ ] **Step 1: Sửa `CLAUDE.md`.** §5 thêm ba lệnh, kèm chỗ gõ của từng lệnh. §8 thêm hai lệnh cấm mới, các lệnh `r2`, và câu «AI được chạy `npm run len-dev`, chỉ lệnh này». Trước khi sửa, kiểm nhánh `worktree-rut-gon-claude-md` đã nhập chưa; chưa nhập thì sửa theo bản đang ở `main` và báo chủ chỗ sẽ trùng.

- [ ] **Step 2: Sửa sổ hàng rào.** Mỗi dòng có ngày quan sát: bài so cấu hình (Task 7 Step 6), chặn `len-chinh-thuc`, `lam-moi-dev`, lệnh `r2` (Task 5 Step 7), cổng mã commit (chạy thật `len-chinh-thuc` với bản khác, do chủ), lọc thư (Task 7 Step 8), ranh giới cùng site (Task 3 Step 6). Dòng nào chưa quan sát thì ghi rõ «chưa quan sát», coi là lời khuyên. Ghi giới hạn cookie của Task 3. Dòng `len-dev` ghi rõ: lệnh tự kiểm, chỉ chặn nhầm, không chống cố ý, vì AI sửa được chính kịch bản đó.

- [ ] **Step 3: Sửa quy trình phát hành, công thức.** `QUY-TRINH-PHAT-HANH.md`: luồng mới `len-dev` rồi `len-chinh-thuc`, bản chỉ đổi tài liệu thì bỏ Development, sửa gấp cũng qua Development. `CHANGE-GUIDE.md`: thêm tài nguyên mới phải thêm cả hai tệp cấu hình; chuỗi gắn cứng tên miền mới phải qua `dung-tai-san-dev.mjs`.

- [ ] **Step 4: Chạy bộ kiểm một lần.** `npm test`, `npm run typecheck`. Mong đợi: đều xanh, typecheck 0 lỗi. Không chạy e2e, vì không đổi API hay migration (nêu rõ trong báo cáo).

- [ ] **Step 5: Giao `nguoi-kiem-doc-lap`, chỉ đọc, gửi mã thật, không gửi kết luận.** Việc lớn (triển khai, luật), người thi công không tự nghiệm thu. Yêu cầu chạy lại lệnh, đối chiếu năm tiêu chí của ADR và mục Review Focus, xác nhận `wrangler.jsonc`, `public/` không đổi.

- [ ] **Step 6: Sửa theo phát hiện, commit, đưa lệnh nhập.** Bản này tự nó đi bằng `npm run day-len -- <nhánh>`, vì `len-chinh-thuc` chưa có trên `main`. Sau đó: **không cần triển khai ngay**, vì hai sửa máy chủ không đổi hành vi bản chính thức, sẽ đi cùng lần phát hành kế tiếp. Từ lần phát hành đó trở đi dùng `len-chinh-thuc`.

## Đối chiếu ADR

| ADR | Task |
|---|---|
| Đ1 tài nguyên, bí mật, biến riêng; bài so cấu hình | 1, 7 |
| Đ2 không chép dữ liệu thật, tài khoản thử, lệnh làm mới | 6 |
| Đ2 thư theo danh sách | 3, 7 |
| Đ3 dải, tên cài, không lập chỉ mục | 2, 7 |
| Đ4 so mã commit, nối hai lệnh, giữ cổng và câu hỏi | 2, 5 |
| Đ5 AI chỉ `len-dev`, lệnh tự kiểm, chặn `len-chinh-thuc` | 4, 5 |
| Việc kèm `_headers`, `VAPID_SUB`, `DB` | 2, 3, quyết định 3 |
| Sửa `CLAUDE.md`, sổ hàng rào | 8 |
| Tiêu chí 1, 2, 3, 4, 5 | 7, 1+7, 5, 5, 3+7 |

## Chưa kiểm khi lập kế hoạch

Người kiểm độc lập đọc kế hoạch 4/11, kết luận đạt, các sửa của vòng đó đã đưa vào đây. Các thêm sau vòng đó chưa qua người kiểm: luật `r2` chặn mặc định, chỗ gõ lệnh ở Task 7, cách xem dải ở Task 2 Step 5, câu «Đã nhập, chưa triển khai». Những điều sau cần mạng hoặc quyền ghi nên chưa ai thử: hành vi của wrangler với `--remote` trên tài nguyên thử; wrangler có đòi `assets.directory` khi `secret list`, `r2 bucket list` hay không; `secret put` khi Worker chưa tồn tại; `DROP TABLE` một lượt trên D1; Email Service gửi từ Worker thử. Task 7 là nơi thử đầu tiên, có phương án dự phòng cho `DROP TABLE`.
