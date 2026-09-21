# HANDOFF — chế độ bảo trì (chỉ chủ dự án) + cột "Đăng nhập gần nhất" — cho phiên kế tiếp

Viết 2026-09-21 khi kết thúc phiên. Đọc trước: `CLAUDE.md`, `docs/CHANGE-GUIDE.md`, `docs/SYSTEM-DESIGN.md`, và phân tích ở `docs/superpowers/specs/2026-09-21-che-do-phat-trien-nghien-cuu.md` (đã có dữ kiện + phương án; tệp này chốt quyết định và việc phải làm).

## 1. Trạng thái lúc kết thúc phiên
- **Production = bản v1.0** (mã `main` @ `db0a774`; migration tới `0014`; Turnstile **ĐÃ BẬT**, chủ đã đăng nhập thử thành công). Chi tiết ở `docs/HANDOFF-N1.md` (mục "TRẠNG THÁI TRIỂN KHAI — bản v1.0").
- **Đã ĐĂNG XUẤT TẤT CẢ** (theo lệnh của chủ, 2026-09-21) bằng cách đổi `SESSION_SECRET` production sang giá trị ngẫu nhiên mới (không lưu ở đâu; `.dev.vars` là khoá riêng của máy phát triển). Mọi người, kể cả chủ, phải đăng nhập lại qua Turnstile. PIN không đổi, không ghi dữ liệu nào.
- **Git:** `main` = `origin/main` = `db0a774`. Nhánh **`worktree-turnstile-khoa`** (4 commit: `.gitignore` chặn `.dev.vars.*`; ngưỡng token 2048 đã đối chiếu; ghi nhận Turnstile bật; nghiên cứu chế độ bảo trì; cộng tệp này) **CHƯA merge vào `main`** — chỉ tài liệu, `.gitignore`, một chú thích mã. Merge trước khi bắt đầu việc mới nếu muốn có đủ tài liệu ở `main`.
- **Lưu ý môi trường:** hệ thống auto-mode chặn Claude in/đọc giá trị trong `.dev.vars` (Credential Materialization) — muốn đặt/đổi khoá production thì chủ tự chạy `!` lệnh `wrangler secret put …`. Tên biến khoá Turnstile phải đúng `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`.

## 2. Quyết định của chủ dự án (2026-09-21) — đã CHỐT
1. Chế độ bảo trì/phát triển là của RIÊNG chủ: bật thì **chặn tất cả trừ chủ**.
2. Chặn **cả phiên đang mở** (hiệu lực ngay khi bật), không chỉ đăng nhập mới.
3. Chỉ **`0989929373`** được dùng khi bật (tài khoản này tồn tại, đang hoạt động, là ADMIN duy nhất — đã kiểm production).
4. Thông điệp cho người bị chặn, đúng chữ: **"Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là (countdown), liên hệ quản trị viên khi cần hỗ trợ thêm (0989929373)."** — `(countdown)` là đồng hồ đếm ngược sống tới giờ dự kiến hoàn tất.
5. **Có nút bật/tắt** trong app (không chỉ lệnh CLI).
6. **Thêm cột "Đăng nhập gần nhất"** (`staff.last_login_at`) để biết khi nào mọi người đã đăng nhập bằng bản mới.
7. Đăng xuất ngay — **ĐÃ LÀM** (mục 1).

## 3. Việc phải làm (thứ tự) — CHƯA làm gì trong phiên này
Theo `CLAUDE.md` (worktree riêng, test đỏ→xanh, không push/merge/deploy khi chưa có lệnh; **chủ đã phàn nàn "lâu" và "review quá nhiều": chạy song song các việc không chung tệp, gộp task nhỏ, CHỈ MỘT lượt rà soát toàn nhánh cuối**).

**Việc 1 — `staff.last_login_at` (≈ 40 phút).** Migration `0015_staff_last_login.sql` (chỉ THÊM cột TEXT NULL; số `0015`: B5 `staff_party_required` khi làm lấy số sau, `migrations-n1.test.ts` nhận theo TÊN); cập nhật khi đăng nhập thành công (module `staff` cung cấp hàm, `auth` gọi — đúng ranh giới); thêm vào DTO của `GET /api/staff` và cột "Đăng nhập gần nhất" ở `/staff` (giờ VN, "chưa đăng nhập" khi NULL); sổ dữ liệu + `npm run dict`. KHÔNG ghi SĐT vào nhật ký.

**Việc 2 — chế độ bảo trì (≈ 2–3 giờ).**
- Dữ liệu: bảng cài đặt nhỏ (đề xuất `app_setting` singleton/khoá-giá trị: `maintenance_on`, `maintenance_ends_at` (ISO UTC), người/lúc bật) — migration `0016_…`, module chủ mới (theo khuôn `company`); danh sách được phép = SĐT ADMIN trong cài đặt (mặc định `0989929373`, chuẩn hoá bằng `normalizePhone`).
- API: `PUT` bật/tắt kèm giờ dự kiến hoàn tất (chỉ tài khoản được phép; nhật ký `maintenance_changed`, không ghi SĐT); `GET /api/auth/config` thêm `maintenance: { on, endsAt }` (công khai; KHÔNG lộ ai được phép).
- Chặn (máy chủ mới là nơi ép): `POST /api/auth/login` — sau Turnstile, TRƯỚC PIN, SĐT không được phép → 503 `maintenance` (cùng thông điệp cho mọi SĐT, kể cả không tồn tại; không tiêu hao lượt PIN); mọi `/api/*` cần đăng nhập (trong `currentStaff`/router, đã đọc tài khoản mỗi request) → 503 `maintenance` cho tài khoản không được phép, kể cả phiên đang mở; giữ `/api/auth/*`, `/api/company`. Cron đồng bộ danh mục vẫn chạy.
- Giao diện: banner ở trang đăng nhập khi `maintenance.on`; `web/api.ts` bắt 503 `maintenance` → màn hình toàn trang với thông điệp ở mục 2.4 và **đồng hồ đếm ngược sống** (hết giờ thì "sắp hoàn tất" — vẫn chặn cho tới khi chủ tắt); nút bật/tắt cho chủ (đề xuất mục "Chế độ bảo trì" ở trang `/account`, có nút nhanh "30/60/120 phút" + chọn giờ) và dải nhỏ "Đang ở chế độ bảo trì" khi bật; chủ dùng app bình thường.
- **Đường thoát khẩn** (nếu chủ bị khoá): tắt bằng SQL trên D1 (`UPDATE` dòng cài đặt về tắt) qua `wrangler d1 execute --remote` — ghi vào runbook.
- Kiểm: unit (cổng: bật/tắt, chuẩn hoá SĐT, không lộ ai được phép), e2e (bật → nhân viên 503 ở login VÀ ở API bằng phiên có sẵn; chủ bình thường; tắt → trở lại), kịch bản Chrome (màn hình bảo trì + đếm ngược + nút bật/tắt; sửa `web/api.ts`/`web/account.ts` thì chạy lại các kịch bản trong `CLAUDE.md` §3), axe.

**Triển khai (chỉ khi chủ ra lệnh):** theo `docs/HANDOFF-N1.md` (cổng chỉ-đọc, Time Travel, áp migration rồi deploy ngay, `audit-invariants --db remote`). Bật chế độ bảo trì sau khi cột "Đăng nhập gần nhất" cho thấy mọi người đã đăng nhập; nhắn nhân viên trước; bật vào giờ vắng.

## 4. Còn mở từ trước (không thuộc việc này)
Kiểm giao diện v1.0 bằng tài khoản thật (`json_each` của `GET /api/dispatch/handlers` chưa từng chạy trên D1 thật: thẻ không có dòng "Phụ trách" và không chip = lời gọi lỗi); thử iPhone thật (canvas/chia sẻ/tải ảnh/WebKit); chữ ký thị giác A2 và v1.0; quyết định 4(a)/(b)/(c) ở HANDOFF-N1; B5 (`staff_party_required`, số sau các migration mới); thư mục `.claude/worktrees/*` cũ có thể dọn (`git worktree prune`).
