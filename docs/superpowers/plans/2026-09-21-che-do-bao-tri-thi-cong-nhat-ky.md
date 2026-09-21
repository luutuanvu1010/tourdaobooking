# Chế độ bảo trì (chỉ chủ dự án dùng được) + cột "Đăng nhập gần nhất" — nhật ký thi công, ruling và việc còn lại

Viết 2026-09-21 trên nhánh `worktree-che-do-bao-tri` (tách từ `main` @ `f3a8225`). Nguồn quyết định: `docs/HANDOFF-CHE-DO-BAO-TRI.md`; phân tích trước đó: `docs/superpowers/specs/2026-09-21-che-do-phat-trien-nghien-cuu.md`. **Nhánh này CHƯA merge vào `main`, CHƯA push, CHƯA deploy; migration `0015`/`0016` CHƯA áp lên D1 remote (production vẫn ở `0014`, bản v1.0).** Không có gì được bật trên production.

## 1. Mục tiêu

1. **Việc 1 — cột "Đăng nhập gần nhất"** (`staff.last_login_at`) ở trang Nhân viên, để chủ dự án biết khi nào mọi người đã đăng nhập bằng bản mới.
2. **Việc 2 — chế độ bảo trì chỉ chủ dự án dùng được:** có nút bật/tắt trong app; bật thì chặn mọi tài khoản trừ SĐT được phép (`0989929373`), kể cả phiên đang mở; người bị chặn thấy màn hình thông báo có đồng hồ đếm ngược, đúng thông điệp chủ dự án đã chốt.

Cách làm theo yêu cầu của chủ: worktree riêng; test đỏ trước, xanh sau; chạy song song các phần không chung tệp; KHÔNG rà soát từng task, chỉ MỘT lượt rà soát toàn nhánh ở cuối.

## 2. Quyết định của chủ dự án (trích `docs/HANDOFF-CHE-DO-BAO-TRI.md` §2, đã CHỐT 2026-09-21)

1. Chế độ bảo trì là của RIÊNG chủ: bật thì chặn tất cả trừ chủ.
2. Chặn cả phiên đang mở (hiệu lực ngay khi bật), không chỉ đăng nhập mới.
3. Chỉ `0989929373` được dùng khi bật (tài khoản tồn tại, đang hoạt động, là ADMIN duy nhất — đã kiểm production).
4. Thông điệp, đúng chữ: **"Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là (countdown), liên hệ quản trị viên khi cần hỗ trợ thêm (0989929373)."** — `(countdown)` là đồng hồ đếm ngược sống tới giờ dự kiến hoàn tất.
5. Có nút bật/tắt trong app (không chỉ lệnh CLI).
6. Thêm cột "Đăng nhập gần nhất" (`staff.last_login_at`).
7. Đăng xuất tất cả ngay — ĐÃ LÀM ở phiên trước (đổi `SESSION_SECRET`).

## 3. Ruling của người thi công — chủ dự án cần biết (chỗ nào không đồng ý thì nói, sửa nhỏ)

| # | Ruling | Lý do / hệ quả |
|---|---|---|
| i | **Module `maintenance`, bảng `mnt_setting`** (cột `enabled`, `ends_at`, `allowed_phones` + cột kiểm toán ADR-0003) thay vì bảng `app_setting` khoá–giá trị chung mà handoff đề xuất. | `src/architecture.test.ts` bắt bảng mới phải có tiền tố module (`TABLE_PREFIX`, thêm `mnt_`) — `legacy: true` chỉ dành cho bảng đã có; một kho "cài đặt" chung dễ thành chỗ chứa mọi thứ. Người/lúc bật nằm ở `updated_by`/`updated_at` và nhật ký `maintenance_changed`. |
| ii | **`PUT /api/maintenance` chỉ khi ADMIN VÀ nằm trong `allowed_phones`** (403 nếu không). `GET` trả `canToggle` cho chính người gọi, KHÔNG trả danh sách. | Đúng ý "chỉ tài khoản được phép" mà không lộ ai được phép. Danh sách chỉ sửa được bằng SQL/migration (chủ ý — không có màn hình sửa). |
| iii | **Giờ dự kiến phải ở tương lai và tối đa 7 ngày** kể từ lúc bật (`MAX_MAINTENANCE_MS`). Bật bắt buộc có giờ; tắt bỏ qua giờ. | Chặn gõ nhầm ngày/năm làm khoá cả công ty nhiều tuần. Con số 7 ngày là giả định của người thi công (handoff không nêu): đổi được ở một hằng. |
| iv | **Hai biến thể của câu chủ đã chốt**, chỉ dùng khi KHÔNG có đếm ngược: hết giờ dự kiến → "Hệ thống đang tạm đóng để bảo trì và sắp hoàn tất, liên hệ …"; chưa có giờ → "Hệ thống đang tạm đóng để bảo trì, liên hệ …". Còn giờ thì đúng chữ đã chốt. | Handoff nói hết giờ thì "sắp hoàn tất" và vẫn chặn cho tới khi chủ tắt; ghép nguyên câu cũ với "sắp hoàn tất" sẽ thành "…hoàn tất là sắp hoàn tất". |
| v | **Cạnh phụ thuộc mới `auth → maintenance` (→ `audit`) và cổng tiêm ở router** (`AppOptions.injected.maintenanceBlock`, BẮT BUỘC như `isAssigned`): MỘT truy vấn D1 mỗi request cần đăng nhập, cố ý KHÔNG đệm. | Quyết định kiến trúc nhỏ theo khuôn `company` (module lá) và ADR-0007 điều 4(b) (nối chéo qua gốc lắp ráp); không có vòng. **Chưa viết ADR mới** — chờ chủ xác nhận; nếu chủ muốn có ADR thì thêm. Đệm trong isolate sẽ làm mất "hiệu lực ngay khi bật". |
| vi | **503 ở đăng nhập cùng một thân cho mọi SĐT** (kể cả không tồn tại) và đứng TRƯỚC PIN (không tiêu hao lượt thử); nhưng người ĐƯỢC PHÉP nhập sai PIN nhận 401/429 chứ không phải 503 → về lý thuyết phân biệt được số của chủ. | Chấp nhận: thông điệp bảo trì đã in chính số `0989929373`. |
| vii | **`last_login_at` chỉ ghi ở `POST /api/auth/login`** (sau `result.ok`), không ghi trong `verifyPinThrottled` (dùng chung với đổi PIN) và không ghi khi phiên sống được dùng tiếp. Lỗi ghi được log `record_login_failed` và KHÔNG làm hỏng đăng nhập. | Hệ quả: người còn phiên cũ chưa đăng nhập lại vẫn hiện "Chưa đăng nhập". Muốn mốc cho tất cả thì xoay `SESSION_SECRET` (việc riêng, cần lệnh chủ). |
| viii | **Chưa thêm bất biến `audit-invariants` cho `mnt_setting`.** | Cổng chỉ-đọc TRƯỚC deploy chạy trên D1 chưa có `0016` nên script sẽ thoát mã 2 (không chạy được), và bảng singleton đã có `CHECK (id = 'default')` + dòng gieo. Nếu sau này muốn (vd đúng một dòng), thêm ở `scripts/audit-checks.mjs` kèm test (`docs/CHANGE-GUIDE.md` công thức d.5). |
| ix | **Chỉ MỘT lượt rà soát toàn nhánh, ở cuối**, theo yêu cầu của chủ (không rà từng task). | Kết quả: 11 phát hiện. **Đã sửa** (x–xiii bên dưới): đổi SĐT tài khoản chủ (nặng nhất), lớp phủ thiếu nút thoát/tự nhận ra mở lại, `endsAt` quá lỏng, nhãn cột dễ hiểu nhầm, `login.ts` chết khi HTML cũ trong cache, số liệu cũ trong tài liệu. **Ghi nợ, không sửa** (mục 6, 9–15): khoá PIN của chủ khi đang bảo trì, hàng `mnt_setting` bị xoá, đồng hồ thiết bị lệch, đọc D1 thừa, ADR chờ chủ, thứ tự deploy, ô "Đối tượng" của Nhật ký. Sau khi sửa KHÔNG rà lại lần hai (theo yêu cầu) — kiểm bằng test đỏ→xanh, e2e, Chrome. |
| x | **Không đổi SĐT của tài khoản trong `allowed_phones`**: `PATCH /api/staff/:id` → 409 `account_rule` (`phoneChangeProblem` ở `src/shared/maintenance.ts`; module `accounts` nay phụ thuộc `maintenance` — cạnh mới, không vòng). | Rà soát: chế độ nhận diện chủ CHỈ theo SĐT — chủ tự sửa/gõ nhầm số khi đang bật thì không ai tắt được từ giao diện (chỉ còn SQL), hoặc admin khác giải phóng `0989929373` rồi cấp cho người khác. Chỉ chặn ĐỔI SĐT; ngưng tài khoản/đổi quyền vẫn theo luật cũ (`checkAccountChange`, luật "còn ít nhất một quản trị viên"). Muốn đổi số chủ: sửa `allowed_phones` bằng SQL/migration TRƯỚC. |
| xi | **Lớp phủ có nút "Đăng xuất"** (không để phiên treo trên máy dùng chung) và **tự hỏi lại `GET /api/auth/config` mỗi 20 giây**: khi chủ đã tắt thì đổi câu chữ + nút "Tải lại trang", dừng đếm. | Rà soát: lớp phủ chỉ có "Thử lại". Giới hạn còn lại (chủ ý, ghi rõ trong câu chữ): lời gọi API đang treo không tự chạy tiếp nên vẫn phải TẢI LẠI trang, phần chưa lưu mất. |
| xii | **`endsAt` chỉ nhận ISO UTC có `Z`** và ngày phải có thật. | Rà soát + kiểm Node: chuỗi không múi giờ bị hiểu theo giờ máy (Workers = UTC nên 10:00 giờ VN thành 17:00 VN), `2026-02-30` lăn sang 02/03. Giao diện luôn gửi `toISOString()` nên chỉ người gọi API trực tiếp bị ảnh hưởng. |
| xiii | Cột "Đăng nhập gần nhất" ghi **"Chưa ghi nhận"** khi NULL (trước là "Chưa đăng nhập"). | NULL cũng gồm người còn phiên cũ dùng hằng ngày mà chưa đăng nhập lại kể từ `0015` — ghi "Chưa đăng nhập" dễ khiến quản trị viên tưởng tài khoản không dùng. |

Các quyết định nhỏ khác (mã thắng, có test): cổng đứng TRƯỚC kiểm `admin`/`office` (người bị chặn thấy bảo trì, không thấy "không đủ quyền"); `GET /api/auth/me` là route `staff` nên qua cổng, còn `/api/auth/config`, `/logout`, `/api/company` (công khai) thì không; Cron đồng bộ danh mục không đi qua router nên không bị chặn; `router.ts` nay import `./http.ts` kèm đuôi để `router.test.ts` chạy bằng Node; nhóm nhật ký mới `system` ("Hệ thống") cho `maintenance_changed`; nhật ký không ghi SĐT (giờ dự kiến in theo giờ Việt Nam bằng `vnDateTimeText`).

## 4. Đã thi công gì (tệp chính)

| Hạng mục | Tệp | Commit |
|---|---|---|
| Luật thuần + thông điệp + đếm ngược | `src/shared/maintenance.ts` (+ `maintenance.test.ts`), `src/shared/vn-date.ts` (`vnDateTimeText`) | `a6e8b60` |
| Migration | `migrations/0015_staff_last_login.sql`, `migrations/0016_maintenance.sql`, `src/migrations-maintenance.test.ts` (số gieo qua `normalizePhone`, đường thoát khẩn không vướng ràng buộc) | `a6e8b60` |
| Module `maintenance` | `src/modules/maintenance/{index,repository}.ts`; đăng ký `src/index.ts`; `src/architecture.test.ts` (cạnh, `STRICT`, tiền tố `mnt_`); `docs/data-dictionary.json` + `DATA-DICTIONARY.md` | `a6e8b60` |
| Cổng | `src/shared/router.ts` (`injected.maintenanceBlock`) + `router.test.ts`; `src/modules/auth/index.ts` (cổng ở đăng nhập, `config`, `me`) | `a6e8b60` |
| Việc 1 | `src/modules/staff/{repository,index}.ts` (`recordLogin`), `src/shared/contracts.ts` (`lastLoginAt`), `web/staff.ts`, `public/staff.html` | `a6e8b60` |
| Nhật ký | `src/shared/audit-actions.ts` (`maintenance_changed`, nhóm `system`) | `a6e8b60` |
| Giao diện bảo trì (màn hình + đếm ngược, banner ở đăng nhập, dải, nút ở `/account`) | `web/api.ts`, `web/maintenance-screen.ts`, `web/login.ts`, `web/shell.ts`, `web/account.ts`, `public/login.html`, `public/account.html`, `public/app.css`, `src/shared/vn-date.ts` (`vnLocalToIso`) | `7cd42bd` |
| e2e | `tests/e2e/maintenance.mjs` (mới), `tests/e2e/run.mjs` (`ALL`), `tests/e2e/admin.mjs` (`lastLoginAt`), `tests/e2e/turnstile.mjs` (hợp đồng `config` có `maintenance`) | `338c721` |
| Sửa sau rà soát (x–xiii) | `src/shared/maintenance.ts` (`phoneChangeProblem`, `parseUtcIso`), `src/modules/accounts/index.ts`, `src/architecture.test.ts`, `web/maintenance-screen.ts`, `web/login.ts`, `web/staff.ts`, `public/app.css`, `tests/e2e/maintenance.mjs`, `docs/evidence/2026-09-21-v1-0/kich-ban/v1-bao-tri.mjs` (kịch bản Chrome đưa vào repo) | commit "Sửa sau rà soát toàn nhánh" (cuối nhánh) |
| Tài liệu | `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md` (công thức q), `docs/HANDOFF-N1.md` (runbook + đường thoát khẩn), `docs/HANDOFF-CHE-DO-BAO-TRI.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, tệp này | `d6803c8`, `f212c72` và commit sau rà soát |

## 5. Kiểm chứng (2026-09-21, trên nhánh sau khi sửa theo rà soát)

| Phép kiểm | Kết quả |
|---|---|
| `npm test` | **388/388 xanh** (363 trước nhánh; thêm: luật bảo trì 13, `router.test.ts` 5, migration 4, `vnDateTimeText`/`vnLocalToIso` 3) |
| `npm run typecheck` (server, `web`, `web/sw`) | 0 lỗi; `npm run build:web` sạch |
| `npm run test:e2e` (cần mạng) + `audit-invariants --strict` | **14/14 kịch bản xanh + audit-invariants xanh** (đủ bộ, chạy lại lần cuối trên mã đã sửa: `E2E: 14/14 kịch bản xanh`, `Mọi bất biến đạt (D1 local, --strict)`). `maintenance` gồm: bật → nhân viên 503 ở đăng nhập VÀ ở API bằng phiên có sẵn; chủ dùng bình thường; tắt → trở lại; tài khoản chủ không đổi được SĐT; `endsAt` sai múi giờ/ngày không có thật bị 400; đường thoát khẩn bằng SQL. Hai lần đầu kịch bản đã được thử đột biến (tắt cổng router / tắt cổng đăng nhập → đỏ đúng chỗ). |
| Kịch bản Chrome `v1-dang-nhap.mjs` (bắt buộc — chạm `web/login.ts`, `public/login.html`) | **15/15 bước ✓** (cần mạng; chạy sau các sửa cuối; bước f đã đổi kỳ vọng: `config` nay có `maintenance`) |
| Kịch bản Chrome `v1-bao-tri.mjs` (màn hình bảo trì / nút bật-tắt / dải / Đăng xuất / tự nhận ra mở lại + axe) | **17 bước ✓**, axe-core 0 vi phạm ở lớp phủ, trang Tôi và banner đăng nhập (Chrome headless khổ 390×844; **chưa thử iPhone thật**) |
| Một lượt rà soát toàn nhánh | 11 phát hiện: 6 sửa, còn lại ghi nợ — xem ruling ix |

## 6. Nợ và việc còn lại

1. Chủ dự án xem/duyệt các ruling ở mục 3 (nhất là v — cạnh phụ thuộc và cổng router).
2. ĐÃ merge (push fast-forward lên `origin/main`) và ĐÃ deploy theo lệnh của chủ 2026-09-21: Worker `c72dd98f-cc47-4a94-b57d-294ebc820465`, migration `0015`+`0016` đã áp, kiểm sau deploy đạt — bản ghi đầy đủ ở `docs/HANDOFF-N1.md` (đầu tệp). Đường thoát khẩn (SQL) cũng ở đó.
3. Bật chế độ bảo trì trên production chỉ SAU khi cột "Đăng nhập gần nhất" cho thấy mọi người cần dùng app đã đăng nhập bằng bản mới; nhắn nhân viên trước, bật giờ vắng.
4. Chưa thử iPhone thật (lớp phủ toàn trang + đồng hồ đếm ngược trong PWA đã cài, nút bật/tắt trên WebKit).
5. Danh sách `allowed_phones` chỉ sửa bằng SQL/migration — chưa có màn hình (chủ ý; nếu cần thì là việc mới).
6. Hết giờ dự kiến chế độ KHÔNG tự tắt (theo quyết định của chủ: chặn cho tới khi chủ tắt); chưa có hẹn giờ bật/tắt.
7. B5 (`staff_party_required`) lấy số kế tiếp sau `0016` (dự kiến `0017`). Các ghi chú "dự kiến `0015`" ở nhật ký thi công v1.0 là bản ghi lịch sử — không sửa.
8. Lệch tài liệu ngoài phạm vi việc này (chưa sửa): `docs/SYSTEM-DESIGN.md` §14 vẫn ghi bản v1.0 "Turnstile CÒN TẮT" trong khi `CLAUDE.md` §9 và `docs/HANDOFF-N1.md` ghi Turnstile ĐÃ BẬT 2026-09-21.

9. **Đồng hồ thiết bị lệch** (rà soát, chưa sửa): nút nhanh 30/60/120 phút và đồng hồ đếm ngược dùng `Date.now()` của máy; iPhone lệch hàng chục phút thì "30 phút" bị máy chủ từ chối "phải ở tương lai" hoặc đồng hồ của người bị chặn lệch. Cách sửa nếu cần: thêm `serverNow` vào thân 503 / `config` / `GET /api/maintenance` rồi tính độ lệch.
10. **Khoá PIN của chủ khi đang bảo trì** (rà soát, chưa sửa): SĐT không được phép bị chặn TRƯỚC bộ đếm PIN nên chỉ SĐT của chủ tới được bước PIN — ai có token Turnstile gõ sai PIN chủ 5 lần thì chủ bị 429 tới 15 phút mà admin khác (đều bị chặn) không mở khoá được; lối ra: chờ hoặc SQL tắt chế độ. Cùng độ hở với khoá PIN bình thường (chủ là ADMIN duy nhất).
11. **Hàng `mnt_setting` bị xoá = mở toang không ai biết** (rà soát, chưa sửa): thiếu hàng thì `getMaintenanceState` coi là TẮT và `allowed_phones` rỗng nên `PUT` 403 cho mọi người, `audit-invariants` vẫn xanh (xem ruling viii). Khả năng thấp (bảng có `CHECK (id = 'default')` và dòng gieo; chỉ xảy ra khi xoá tay hoặc khôi phục Time Travel về trước `0016`).
12. **Đọc D1 thừa** (rà soát, chưa sửa, tác động thấp): mỗi lần tải trang tốn ba lần đọc tuần tự (tài khoản, cổng, `/me` đọc lại `mnt_setting`) và trang Tôi gọi thêm `GET /api/maintenance` chỉ để biết `canToggle`; cổng cố ý không đệm. Gộp bằng cách để cổng đặt trạng thái vào `ctx` hoặc thêm `canToggle` vào `/me`.
13. **ADR chưa có** cho module `maintenance`, cạnh `auth → maintenance` và `accounts → maintenance`, cổng tiêm ở router (`CLAUDE.md` §6: quyết định kiến trúc mới → ADR do chủ duyệt) — chờ chủ xác nhận ở ruling v/x; `docs/ARCHITECTURE.md` đã liệt kê module nhưng KHÔNG thay cho ADR.
14. **Thứ tự phát hành**: triển khai Worker TRƯỚC khi áp `0015`/`0016` khiến mọi route cần đăng nhập và `POST /api/auth/login` trả 500 (mã đọc bảng/cột chưa có, không có đường lùi). `docs/HANDOFF-N1.md` đã ghi "áp migration rồi deploy NGAY"; đừng đảo.
15. **Ô "Đối tượng" của trang Nhật ký để trống** cho dòng `maintenance_changed` (`targetType = system`, không có nhãn); tên hành động và phần chi tiết vẫn hiện.
