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
| ix | **Chỉ MỘT lượt rà soát toàn nhánh, ở cuối**, theo yêu cầu của chủ (không rà từng task). | Kết quả: (điền kết quả). |

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
| Giao diện bảo trì (màn hình + đếm ngược, banner ở đăng nhập, dải, nút ở `/account`) | `web/api.ts`, `web/maintenance-screen.ts`, `web/login.ts`, `web/shell.ts`, `web/account.ts`, `public/login.html`, `public/account.html`, `public/app.css` | (điền khi có) |
| e2e | `tests/e2e/maintenance.mjs`, `tests/e2e/run.mjs` (`ALL`), `tests/e2e/lib.mjs` nếu cần | (điền khi có) |
| Tài liệu | `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md` (công thức q), `docs/HANDOFF-N1.md` (runbook + đường thoát khẩn), `docs/HANDOFF-CHE-DO-BAO-TRI.md`, `CLAUDE.md`, tệp này | (điền khi có) |

## 5. Kiểm chứng (điền khi có kết quả)

| Phép kiểm | Kết quả |
|---|---|
| `npm test` | (điền khi có kết quả — số test) |
| `npm run typecheck` (server, `web`, `web/sw`) | (điền khi có kết quả) |
| `npm run test:e2e` (cần mạng) + `audit-invariants --strict` | (điền khi có kết quả — số kịch bản, `maintenance` gồm: bật → nhân viên 503 ở đăng nhập VÀ ở API bằng phiên có sẵn; chủ dùng bình thường; tắt → trở lại) |
| Kịch bản Chrome `v1-dang-nhap.mjs` (bắt buộc — chạm `web/login.ts`, `public/login.html`) | (điền khi có kết quả) |
| Kịch bản Chrome cho màn hình bảo trì / nút bật-tắt / dải + axe | (điền khi có kết quả) |
| Một lượt rà soát toàn nhánh | (điền kết quả) |

## 6. Nợ và việc còn lại

1. Chủ dự án xem/duyệt các ruling ở mục 3 (nhất là v — cạnh phụ thuộc và cổng router).
2. Merge/push nhánh: chờ lệnh riêng của chủ. Deploy: chờ lệnh riêng; theo `docs/HANDOFF-N1.md` mục "Lần phát hành kế tiếp (`0015` + `0016`)". Đường thoát khẩn (SQL) cũng ở đó.
3. Bật chế độ bảo trì trên production chỉ SAU khi cột "Đăng nhập gần nhất" cho thấy mọi người cần dùng app đã đăng nhập bằng bản mới; nhắn nhân viên trước, bật giờ vắng.
4. Chưa thử iPhone thật (lớp phủ toàn trang + đồng hồ đếm ngược trong PWA đã cài, nút bật/tắt trên WebKit).
5. Danh sách `allowed_phones` chỉ sửa bằng SQL/migration — chưa có màn hình (chủ ý; nếu cần thì là việc mới).
6. Hết giờ dự kiến chế độ KHÔNG tự tắt (theo quyết định của chủ: chặn cho tới khi chủ tắt); chưa có hẹn giờ bật/tắt.
7. B5 (`staff_party_required`) lấy số kế tiếp sau `0016` (dự kiến `0017`). Các ghi chú "dự kiến `0015`" ở nhật ký thi công v1.0 là bản ghi lịch sử — không sửa.
8. Lệch tài liệu ngoài phạm vi việc này (chưa sửa): `docs/SYSTEM-DESIGN.md` §14 vẫn ghi bản v1.0 "Turnstile CÒN TẮT" trong khi `CLAUDE.md` §9 và `docs/HANDOFF-N1.md` ghi Turnstile ĐÃ BẬT 2026-09-21.
