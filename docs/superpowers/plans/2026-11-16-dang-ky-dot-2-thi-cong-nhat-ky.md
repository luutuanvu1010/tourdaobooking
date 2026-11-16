# Nhật ký thi công — đăng ký đối tác đợt 2

> Kế hoạch: `docs/superpowers/plans/2026-11-16-dang-ky-dot-2-ke-hoach.md`. Spec: ADR-0212, ADR-0213 (chủ duyệt 16/11, phát hành trước diễn tập 25/11). Cách thi công: mỗi việc một trợ lý, người kiểm riêng sau mỗi việc (chủ chọn 16/11).

## Task 0 (16/11)

- Nhận `main` cục bộ (d6dda7b7b, đi trước `origin/main` 0669c6e23 một lần lưu, đã chứa `origin/main`) vào nhánh, không xung đột.
- Liệt kê migration mọi nhánh cục bộ, nhánh xa và thư mục `migrations/` của mọi worktree (kể cả tệp chưa lưu): lớn nhất `0172_cap_mac_dinh_dang_ky.sql`.
- Ruling: số migration mốc A = **0173**, tệp `migrations/0173_dang_ky_to_chuc.sql` — số lớn nhất mọi nơi + 1 — sai thì đổi tên tệp trước khi nhập main.
- `npm run typecheck` 0 lỗi; `src/architecture.test.ts`, `src/migrations-dang-ky.test.ts` 73/73 đạt.

## Ruling và nợ nhỏ

(ghi theo thứ tự task)
