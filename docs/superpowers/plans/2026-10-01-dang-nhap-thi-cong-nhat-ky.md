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
