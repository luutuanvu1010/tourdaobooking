# Phần C — Yếu tố thứ hai qua email (ADR-0074) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người không giữ Quản trị/Toàn quyền/Kế toán có thể chọn nhận mã đăng nhập qua email (thay hoặc kèm ứng dụng xác thực).

**Architecture:** Yếu tố `EMAIL` (bảng `aut_mfa_factor` của Phần B, cột `email`) được xác nhận bằng mã lúc bật. Ở bước đăng nhập, người dùng bấm "Gửi mã qua email" → máy chủ ghi dòng mã (băm) trước, gửi email sau qua binding `EMAIL` (Hiến chương 5.16) → nhập mã → `finishLogin` như TOTP.

**Tech Stack:** như Phần B + Cloudflare Email Service (binding `send_email` tên `EMAIL`, đang dùng ở `src/modules/feedback/notify.ts`).

**Spec:** `docs/superpowers/specs/2026-10-01-xac-thuc-hai-lop-dac-ta.md` (§4.3, §6 quy tắc 2, 5, 8; §9 R1, R2) + `docs/adr/ADR-0074-xac-thuc-hai-lop.md` điều 4, 7.

**Điều kiện bắt đầu:** Phần B đã gộp và kiểm độc lập ĐẠT; **Task 0 kết luận "gửi được"**.

## Global Constraints

- Như Phần B. Mã email: 6 số, sống 10 phút, tối đa 5 lần nhập mỗi mã; tối đa 3 email / 15 phút mỗi tài khoản (khoá `mfa-mail:<staffId>`); hạn mức nhập chung khoá `mfa:<staffId>` của Phần B.
- `ADMIN`, `SUPER_ADMIN`, `ACCOUNTING` không bật được yếu tố email (409); được cấp các quyền này thì yếu tố email hết hiệu lực trong cùng lô đổi quyền (ADR-0074 điều 7).
- Email chỉ hiện dạng che (`t***@gmail.com`) ngoài chính lúc người dùng gõ; không vào nhật ký, câu lỗi, DTO của người khác.
- Nội dung email tiếng Việt có dấu, không liên kết bấm được (chống lừa đảo), chỉ mã + "Nếu không phải bạn, đổi PIN ngay và báo IT".
- Gửi lỗi → "Chưa gửi được email, thử lại hoặc dùng cách khác." — không lộ lỗi nhà cung cấp.

## Review Focus

1. **Binding chỉ gửi được tới địa chỉ đã xác minh** → cả phần dừng ở Task 0, báo chủ (không lách bằng nhà cung cấp khác khi chưa có ADR).
2. **Kẻ có PIN bấm "Gửi mã" liên tục để làm phiền / tốn hạn mức gửi** → 3 email / 15 phút / tài khoản, thân 429 như PIN. Bài: Task 2.
3. **Mã email cũ còn dùng được sau khi gửi mã mới** → gửi mã mới huỷ mã cũ chưa dùng. Bài: Task 2.
4. **Người được thăng Quản trị vẫn đăng nhập bằng email** → lô đổi quyền kết thúc yếu tố email. Bài: Task 3.
5. **Hộp thư gõ sai** → bật email bắt buộc nhập mã gửi tới địa chỉ đó; chưa xác nhận thì không lưu. Bài: Task 3.

---

### Task 0: Kiểm khả năng gửi (không viết mã sản phẩm)

- [ ] **Step 1:** Đọc tài liệu Cloudflare hiện hành về binding `send_email` / Email Service (nguồn chính thức developers.cloudflare.com) — ghi vào sổ thi công: gửi tới **địa chỉ bất kỳ** được không, điều kiện (xác minh tên miền gửi, bản ghi DNS), giới hạn số thư.
- [ ] **Step 2:** Đọc `wrangler.jsonc` (khối `send_email`) và `src/modules/feedback/notify.ts`; ghi binding đang cấu hình kiểu nào (có `destination_address`/`allowed_destination_addresses` không — nếu có, binding bị khoá vào danh sách nhận).
- [ ] **Step 3:** Kết luận một trong hai, ghi vào sổ và báo điều phối:
  - "Gửi được tới địa chỉ bất kỳ sau khi <điều kiện>" → liệt kê việc chủ phải làm trên Cloudflare (nếu có) thành bước đánh số; tiếp Task 1.
  - "Không gửi được tới địa chỉ bất kỳ" → **dừng Phần C**, báo chủ: phương án (a) dùng nhà cung cấp email khác (cần ADR mới + bí mật mới), (b) bỏ email, giữ ứng dụng xác thực + mã dự phòng (+ Zalo đợt 2). Không tự chọn.
- Không gửi thư thật tới người ngoài trong bước này; thử gửi (nếu cần) chỉ tới địa chỉ của chủ, có hỏi trước.

---

### Task 1: Bảng mã email + gửi

**Files:** `migrations/<số>_aut_mfa_email.sql` (bảng `aut_mfa_email_code`), `src/migrations-aut-mfa-email.test.ts`, `src/modules/auth/mfa-email.ts` (+test), `src/modules/auth/mfa-repo.ts`, `docs/data-dictionary.json`

**Interfaces:**

```sql
CREATE TABLE aut_mfa_email_code (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'enroll')),
  email_hash TEXT NOT NULL,      -- SHA-256 của địa chỉ (chuẩn hoá chữ thường) — không lưu địa chỉ ở đây
  code_hash TEXT NOT NULL,       -- SHA-256("<staffId>:<id>:<mã>")
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  used_at TEXT,
  revoked_at TEXT
);
CREATE INDEX aut_mfa_email_code_staff ON aut_mfa_email_code (staff_id, created_at);
```

- `maskEmail(email: string | null): string | null` (`"tuan@gmail.com"` → `"t***@gmail.com"`), `normalizeEmail(s): string | null` (cắt khoảng trắng, chữ thường, khớp `^[^\s@]+@[^\s@]+\.[^\s@]+$`, ≤ 254 ký tự), `emailBody(code): { subject; text }`.
- `sendMfaEmail(env, to, code): Promise<boolean>` — dựng thư theo đúng cách `notify.ts` dựng (dùng lại hàm dựng MIME của nó nếu đã có hàm xuất; nếu chưa, tách hàm dùng chung vào `src/shared/` trong cùng task), người gửi = `FEEDBACK_MAIL_FROM` hoặc bí mật mới `MFA_MAIL_FROM` (quyết theo Task 0, ghi sổ).
- SQL: `email_code_revoke_open(staff_id, purpose, at)`, `email_code_insert`, `email_code_try(id, staff_id, code_hash, at)` = `UPDATE … SET used_at = ?4 WHERE id = ?1 AND staff_id = ?2 AND code_hash = ?3 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?4 AND attempts < 5`, `email_code_bump(id)` = `attempts = attempts + 1`.

- [ ] **Step 1:** Test đỏ (thuần: che email, chuẩn hoá, nội dung thư không có `http`; SQLite: mã hết hạn / quá 5 lần / đã dùng không khớp; gửi mã mới huỷ mã cũ). **Step 2:** FAIL. **Step 3:** Mã. **Step 4:** PASS. **Step 5: Commit** "Bảng mã email hai lớp + gửi thư (ADR-0074)".

---

### Task 2: Mã email ở bước đăng nhập

**Files:** `src/modules/auth/index.ts`, `tests/e2e/hai-lop-email.mjs` (tạo), `tests/e2e/lib.mjs` (đọc mã từ CSDL thử: e2e không đọc được hộp thư — thêm chế độ thử **chỉ ở khung e2e**: binding `EMAIL` vắng trong `wrangler dev` e2e thì `sendMfaEmail` trả false; kịch bản lấy mã bằng cách **gieo** dòng `aut_mfa_email_code` với mã biết trước qua `sql()` — không thêm công tắc lộ mã vào mã sản phẩm)

- `POST /api/auth/mfa/email` (public, cookie chờ purpose `verify`, `maintenanceBlock`, hạn mức `mfa-mail:<staffId>` 3/15 phút) → lô: huỷ mã mở → chèn mã mới; rồi gửi; trả `{ sent: true, emailMask }` hoặc 502 "Chưa gửi được email…" (dòng mã vẫn còn, hết hạn tự nhiên).
- `POST /api/auth/mfa/verify` nhận thêm `method: "EMAIL"` → `email_code_try`; sai → `email_code_bump` + 401.

- [ ] **Step 1:** e2e đỏ: gửi 4 lần trong 15 phút → lần 4: 429; mã gieo đúng → phiên; mã cũ sau khi gửi mã mới → 401; tài khoản không có yếu tố email gọi gửi → 409. **Step 2:** Mã. **Step 3:** PASS. **Step 4: Commit** "Gửi và nhận mã email ở bước đăng nhập".

---

### Task 3: Bật / gỡ yếu tố email; chặn vai lớn

**Files:** `src/modules/auth/index.ts` (`/api/account/mfa/email/start|confirm`), `src/modules/accounts/index.ts` (lô đổi quyền/vai), `tests/e2e/hai-lop-email.mjs`, `web/account.ts`, `web/login.ts`

- `start` body `{ email, currentCode? }` (đòi mã yếu tố hiện có nếu đã có) → `allowedFactors` không có `EMAIL` → 409 "Tài khoản Quản trị, Toàn quyền, Kế toán chỉ dùng ứng dụng xác thực."; gửi mã purpose `enroll` tới địa chỉ mới; `confirm { email, code }` → lô: kết thúc EMAIL cũ → chèn EMAIL mới → (yếu tố đầu tiên) 10 mã dự phòng → nhật ký `mfa_enabled` (`detail = "EMAIL"`).
- Lô `PUT /api/staff/:id/permissions` và `PUT /api/staff/:id/roles`: nếu quyền **sau** có `ADMIN`/`SUPER_ADMIN`/`ACCOUNTING` → nối `factor_end_kind(staff_id, 'EMAIL', at, actor)`; nếu không còn TOTP → đặt `mfa_grace_until = +14 ngày` (luật Phần B Task 6).
- Giao diện: lựa chọn "Email" chỉ khi máy chủ trả `allowed` có `EMAIL`; bước đăng nhập có nút "Gửi mã qua email (t***@gmail.com)".

- [ ] **Step 1:** e2e đỏ: `salesA` bật email (mã gieo) → đăng nhập bằng email; `admin` bật email → 409; `salesA` được cấp `ACCOUNTING` → yếu tố email hết hiệu lực, `GET /api/account/mfa` không còn EMAIL. **Step 2:** Mã. **Step 3:** PASS; `npm run build:web`; kịch bản Chrome (bật email, đăng nhập bằng email — mã gieo). **Step 4: Commit** "Bật/gỡ yếu tố email; Quản trị/Toàn quyền/Kế toán chỉ dùng ứng dụng xác thực (ADR-0074 điều 7)".

---

### Task 4: Hàng rào, tài liệu, kiểm độc lập

- [ ] **Step 1:** Bài không-lộ: phản hồi mọi route `/api/auth/mfa/*`, `/api/account/mfa*` không chứa địa chỉ email đầy đủ (kể cả phản hồi `start` — chỉ trả dạng che); nhật ký không chứa `@`. Quan sát chặn thật: tạm trả email đầy đủ → đỏ → hoàn nguyên; dòng `docs/SO-HANG-RAO.md`.
- [ ] **Step 2:** `audit-invariants`: `R-AUT-MFA-4` — không tài khoản giữ ADMIN/SUPER_ADMIN/ACCOUNTING có yếu tố EMAIL sống.
- [ ] **Step 3:** Tài liệu mô tả, Trợ giúp ("Nhận mã qua email"), nhật ký phiên bản.
- [ ] **Step 4:** `npm test`, `npm run typecheck`, `npm run test:e2e`, `audit-invariants --db local` xanh; giao **người kiểm độc lập**.
