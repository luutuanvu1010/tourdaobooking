# Nhật ký thi công — đăng nhập: sổ phiên một máy (Phần A), hai lớp (Phần B, C)

Kế hoạch: `2026-10-01-dang-nhap-a-so-phien-mot-may.md`, `…-b-hai-lop-ung-dung-xac-thuc.md`, `…-c-hai-lop-email.md`. Đặc tả `docs/superpowers/specs/2026-10-01-xac-thuc-hai-lop-dac-ta.md`; ADR-0074, ADR-0075 (accepted 2026-10-01).
Cách thi công: subagent-driven (chủ chọn 2026-10-01) — mỗi task một phiên phụ thi công + một phiên phụ kiểm; cuối phần có người kiểm độc lập (`nguoi-kiem-doc-lap`).

## Phần A

### Task 0 — đồng bộ và chụp hiện trạng (2026-10-01)

- Gộp `main@446c64a4` (1.53 + phòng ngừa 7403) → commit `6a385d9b`. Xung đột duy nhất `docs/BACKLOG.md`: giữ mục 15 của main (phiếu Giám đốc), mục Zalo ZNS đổi thành 16.
- Migration: `main` lớn nhất `0059_mau_chang.sql`; nhánh chưa gộp giữ `0060_tl_bo_nao.sql` (trợ lý, `git log --all --diff-filter=A -- 'migrations/006*'`). → **Phần A = `0061_aut_session.sql`, Phần B = `0062`** (ruling, đổi so với số tạm 0058/0059 trong kế hoạch).
- Chỗ đụng (sau gộp, khớp bảng Task 0 của kế hoạch): `auth/index.ts:50` `newSessionCookie`, `:141` PIN, `:181` Face ID; `accounts/index.ts:171` ngưng, `:193/199` đổi PIN, `:276/282` gỡ mọi Face ID, `:293/298` gỡ một Face ID, `:330/335` đặt PIN bằng Face ID, `:598` Quản trị đặt lại PIN, `:621` Quản trị gỡ mọi Face ID.
- `ntf_push_sub.revoke_reason` không có CHECK liệt kê (`0026_thong_bao_may.sql:10`) → không cần migration thêm cho `'bi-thay'`.
- Mốc: `npm test` 2376/2376, `npm run typecheck` 0 lỗi.

### Ruling của điều phối (trước khi giao Task 1)

- Task 2 + Task 3 giao một phiên phụ, một commit (kế hoạch Task 2 Step 4 đòi).
- Chuyển Task 9 Step 1 (`session()` e2e nhớ cookie + `sessionMoi()`) lên Task 3 và chạy **toàn bộ** e2e ở Task 3: từ lúc cấp phiên một máy, kịch bản đăng nhập lại cùng tài khoản sẽ đá cookie cũ — để e2e xanh ngay từ thay đổi hành vi đầu tiên.
- Không đặt chỗ giữ `ctxDongMayCu` ở Task 3; Task 6 nối `dongBangTin`.

### Task 1 — migration sổ phiên (2026-10-01)

- Tệp `migrations/0061_aut_session.sql` (không phải 0058 như kế hoạch, theo ruling Task 0). Bảng `aut_session` + chỉ mục duy nhất có điều kiện + cột `ntf_push_sub.session_id`.
- Ruling bề mặt: thêm mã kết thúc `doi_face_id` (ngoài danh sách đổi PIN/đặt lại PIN/…): gỡ Face ID cũng làm đổi `credentials_changed_at`, cùng loại thao tác bảo mật với đổi PIN, cần mã riêng để màn IT hiện đúng. Đảo ngược được (migration chưa áp remote).
- `staff` cần các cột NOT NULL `full_name, phone, pin_hash, role, created_at` khi chèn thẳng trong bài thử (cột chết `full_name`/`role` vẫn bắt buộc).
- Thêm vào bảng ba cột kiểm toán `created_by`, `updated_at` (NOT NULL, không mặc định), `updated_by`: ngoài brief nhưng `architecture.test.ts` (ADR-0003) đòi cho mọi bảng mới không legacy, và danh sách legacy bị khoá. Task sau chèn `aut_session` phải điền `updated_at`.

### Task 2+3 — token có mã phiên, cấp phiên một lô, kiểm phiên mỗi request (2026-10-01)

- Token `staffId.iat.sessionId.sig` (`session.ts`); luật thuần `session-ledger.ts`; SQL sổ phiên ở `auth/repository.ts`, điều chỉnh theo ba cột kiểm toán của 0061: `SS_INSERT` điền `created_by` = chính tài khoản đăng nhập (như `aut_passkey`) và `updated_at` = `created_at`; mọi câu UPDATE đặt thêm `updated_at` = mốc của câu và `updated_by` = người gỡ / NULL. Điều kiện WHERE và thứ tự lô giữ đúng kế hoạch.
- `issueLoginSession` (nơi duy nhất cấp phiên mới) thay `newSessionCookie` ở hai route đăng nhập; Face ID truyền `opts.now` = mốc lấy TRƯỚC `checkPasskeyAssertion`. `newSessionCookie` đã xoá.
- Bốn chỗ cấp lại cookie tự phục vụ ở `accounts/index.ts` (đổi PIN, gỡ mọi Face ID, gỡ một Face ID, đặt PIN bằng Face ID): tạm chuyển sang `reissueSessionCookie` giữ mã phiên, cùng mốc phát hành như cũ — CHƯA kết thúc phiên khác trong lô (việc của Task 5). Kiểm `sessionId` thiếu → 401 đặt SAU cổng "Face ID tắt → 503": bài `src/passkey-off.test.ts` gọi thẳng handler không có `sessionId` và đòi 503 trước mọi thứ khác.
- Router: `AppOptions.currentStaff` trả `{ staff, sessionId } | null`; `ctx.sessionId` (route công khai = null). `src/shared/router.test.ts`: các `currentStaff` giả bọc qua `phien()`; thêm ca `ctx.sessionId`.
- Bài sửa cho khớp nghĩa (Step 7): `src/modules/auth/challenge.test.ts` gọi `createSessionToken` thêm mã phiên (nếu không, tham số `NOW` rơi vào chỗ mã phiên và bài chéo vẫn xanh mà không còn kiểm gì — tệp test không qua typecheck). Khung thử `tests/audit/harness.mjs`: `call({ as })` dùng lại phiên còn sống mới nhất của tài khoản; không có thì chèn một dòng phiên như lô thật (dọn phiên hết hạn trước, `single` theo đúng `isSingleDevice` + vai thật — không nới luật cho khung thử); thêm `w.token(as)`. `tests/audit/redteam.test.mjs` R9 dùng `w.token(A)` (vẫn 200 tới Task 4). Năm bài đỏ sẵn ở `tests/audit/*.test.mjs` (D-02, P2, P3, P5, P6) đỏ y hệt trên bản HEAD trước thay đổi (chạy đối chứng trên bản xuất của HEAD) — không thuộc việc này.
- e2e: `session()` nhớ cookie theo SĐT (kiểm `/api/auth/me` trước khi dùng lại), `sessionMoi()` đăng nhập mới có chủ ý. Lượt đầu toàn bộ: 34/36 — đỏ `admin`, `passkey`. Kịch bản đã sửa:
  - `admin.mjs` ca DK-T3-02: kiểm "PIN cũ vẫn đăng nhập được" của Quản trị đá cookie `ADMIN` → dùng `sessionMoi()` rồi lấy lại `ADMIN = await session(...)`. Ca "đổi PIN cá nhân": đổi thứ tự — `other` đăng nhập trước, `sess` sau (A chịu luật một máy nên `sess` đá `other`; khẳng định "máy khác 401" vẫn đúng nhưng nay hiển nhiên).
  - `passkey.mjs` (salesB): giữ cookie phiên MỚI NHẤT (`HIEN`) sau mỗi lần đăng nhập PIN; bước 12 và 12d cho "máy khác" đăng nhập TRƯỚC rồi máy đang thao tác đăng nhập lại. Khẳng định "gỡ Face ID / gỡ hết đăng xuất máy khác" nay hiển nhiên vì máy khác đã bị thay khi đăng nhập — vế "kết thúc phiên khác trong cùng lô" phải kiểm thật ở Task 5 (tài khoản được miễn hoặc bài thuần).
  - Lượt hai toàn bộ: 36/36 xanh, `audit-invariants` cả ba nhóm đạt.
- Tài liệu mô tả: `docs/SYSTEM-DESIGN.md` (cookie phiên 4 phần, sổ phiên, thu hồi phiên, token thách thức "khác 4 phần") sửa cùng commit.
- Lưu ý cho Task 5/7 (Review Focus 2): bốn chỗ cấp lại cookie giữ `created_at` cũ của dòng phiên trong khi `credentials_changed_at` nhảy lên ⇒ `sessionStatus` sẽ báo "Đã đổi thông tin đăng nhập" cho chính phiên được giữ. Task 5/7 phải xử lý (vd so lưới với mốc phát hành cookie, hoặc ghi mốc mới lên dòng).
