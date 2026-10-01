# Sổ thi công — Chính sách đăng nhập (ADR-0085)

- Kế hoạch: `docs/superpowers/plans/2026-10-01-chinh-sach-dang-nhap.md`
- Đặc tả: `docs/superpowers/specs/2026-10-01-chinh-sach-dang-nhap-dac-ta.md`; ADR: `docs/adr/ADR-0085-chinh-sach-dang-nhap.md`
- Nhánh: `chinh-sach-dang-nhap` (worktree `.claude/worktrees/dac-ta-2fa`). Cách thi công: subagent-driven (chủ chọn).

## Task 0 — hiện trạng (2026-10-01)

- Gộp `main` (`24d52d69`, bản 1.61 in đậm) vào nhánh: không xung đột.
- **Số migration:** lớn nhất mọi nhánh = `0066_pty_person_gender.sql` ⇒ bản này **`0067_aut_session_policy.sql`** (đúng kế hoạch).
- **Số bản: 1.62** (KHÔNG phải 1.60 như kế hoạch — `main` đã có 1.60 đổi tên Loại giấy tờ và 1.61 in đậm). **PHẢI KIỂM LẠI LÚC GỘP.**
- Nền trước khi đụng mã: `npm run typecheck` 0 lỗi; `npm test` 2615/2615 + bài đo giờ 1/1.
- Chỗ đụng (khớp kế hoạch): `auth/repository.ts:124` `KHONG_TOAN_QUYEN`, `:127-129` hai câu siết/đánh dấu, `:160` `markMultiStatement`; `auth/index.ts:77` (`issueLoginSession`), `:139-158` (`exemptionChangeStatements`); `accounts/index.ts:542` (route đổi quyền), `:602` (route đổi vai); `tests/audit/harness.mjs:39, :136`; `session-ledger.ts:24`.

## Ruling của điều phối

- Ruling: số bản 1.62 thay 1.60 — main đã dùng 1.60/1.61 — sai thì chỉ đổi một chuỗi lúc gộp.

## Tiến độ, số liệu, quan sát chặn thật

(các task sau ghi tiếp dưới đây)

- Task 1 (migration 0067), quan sát chặn thật 2026-10-01, đột biến "thêm 'SUPER_ADMIN' vào CHECK permission_code của aut_session_policy" (khôi phục từ bản sao, xanh 4/4 sau đó):
  `not ok 2 - (b) 9 mã đặt được nhận; SUPER_ADMIN, mã lạ, multi ngoài 0/1, permission_code NULL bị CSDL chặn`
