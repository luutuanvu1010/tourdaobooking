# Nhật ký thi công — đăng ký đối tác đợt 2

> Kế hoạch: `docs/superpowers/plans/2026-11-16-dang-ky-dot-2-ke-hoach.md`. Spec: ADR-0212, ADR-0213 (chủ duyệt 16/11, phát hành trước diễn tập 25/11). Cách thi công: mỗi việc một trợ lý, người kiểm riêng sau mỗi việc (chủ chọn 16/11).

## Task 0 (16/11)

- Nhận `main` cục bộ (d6dda7b7b, đi trước `origin/main` 0669c6e23 một lần lưu, đã chứa `origin/main`) vào nhánh, không xung đột.
- Liệt kê migration mọi nhánh cục bộ, nhánh xa và thư mục `migrations/` của mọi worktree (kể cả tệp chưa lưu): lớn nhất `0172_cap_mac_dinh_dang_ky.sql`.
- Ruling: số migration mốc A = **0173**, tệp `migrations/0173_dang_ky_to_chuc.sql` — số lớn nhất mọi nơi + 1 — sai thì đổi tên tệp trước khi nhập main.
- Ruling (Task 4 vòng sửa): đổi sang 0174 vì nhánh claude/heuristic-turing-a00d98 lấy 0173 (phi_don_chon) sau Task 0; tệp `migrations/0174_dang_ky_to_chuc.sql`.
- `npm run typecheck` 0 lỗi; `src/architecture.test.ts`, `src/migrations-dang-ky.test.ts` 73/73 đạt.

## Ruling và nợ nhỏ

(ghi theo thứ tự task)
- **Soát trước (16/11):** 18 ruling PF1–PF18 sửa thứ tự và chỗ thiếu của kế hoạch (bảng ở sổ điều phối). Đáng báo chủ: gieo mục bắt buộc cho tổ chức làm mọi hồ sơ tổ chức đang có hiện dấu «Chưa xác minh» (dấu chỉ để biết, ADR-0210) — PF6. «Đổi khách» xoá tư cách của đơn (PF10).
