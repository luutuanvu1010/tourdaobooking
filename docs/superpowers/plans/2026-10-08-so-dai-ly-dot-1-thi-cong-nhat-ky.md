# Sổ thi công — Sổ đại lý đợt 1

- Kế hoạch: `docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-ke-hoach.md`. Đặc tả: `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md`.
- Số migration chốt: `0090_so_dai_ly_dot_1.sql` (rà lúc 19:52 giờ Việt Nam ngày 2026-10-08 bằng `git log --all` trên `migrations/` và `ls migrations`: nhánh này và `main` dừng ở `0088`; lớn nhất trên mọi nhánh là `0089_aud_order_cmd.sql`, do `adr-0104-d2` giữ. Các nhánh giữ số: `0084`–`0086` và `0089`).
- Số route lúc bắt đầu: tổng 256 (`src/route-access.test.ts`), ghi có đăng nhập 153 (`src/lan-gui-phu-route.test.ts`). Đích sau đợt 1: 268 và 159.
- Nền xanh lúc bắt đầu (Task 0, trước mọi sửa, HEAD `eee98e94`): `npm run typecheck` thoát 0; `npm test` thoát 0 (bộ chính 3445 bài, 3443 đạt, 0 đỏ; bài đo giờ của hook chạy một mình đạt).

## Ruling
(mỗi dòng: `Ruling: <quyết> — <vì sao> — <giá nếu sai>`)

## Quan sát chặn thật (P16)
| Hàng rào | Sửa cố ý | Đỏ ở bài | Hoàn nguyên | Ngày |
|---|---|---|---|---|

## Nợ, việc để đợt 2
