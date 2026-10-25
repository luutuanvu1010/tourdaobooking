# Bằng chứng ADR-0107 — Bán hàng tự đặt gấp; dấu chỉ ghi lên lượt đang dưới hạn chốt (2026-10-25)

Hồ sơ có ngày (không sửa lại cho khớp hiện trạng). Người chạy: phiên thi công ADR-0107, nhánh `claude/adr-0107-dat-gap-ban-hang` (mã ở `dae616be` + gộp `main` `78d21d65` ở `f1a902c4`). Kế hoạch và tiêu chí: `docs/superpowers/plans/2026-10-25-adr-0107-dat-gap-ban-hang.md` (T10).

Cách chạy: từ gốc repo, sau `npm run build:web`, mỗi kịch bản dựng D1 tạm + `wrangler dev` + Chrome headless riêng (không đụng dữ liệu thật, không cần mạng ngoài):
`AXE_JS=<axe-core 4.13, ngoài repo> CHROME_BIN="$PWD/scripts/chrome-tu-dong-dong.sh" OUT=<thư mục ảnh> node <kịch bản>`.
Ảnh chỉ giữ cho `dat-gap-smoke` (thư mục `anh/`); ảnh của kịch bản khác ghi ra thư mục tạm để không đè ảnh hồ sơ cũ.

## Kết quả trên nhánh (bảng bắt buộc của `web/CLAUDE.md`, dòng "Mốc 6 giờ + đặt gấp" + `help-smoke` vì đổi `changelog.ts` + `dieu-phoi-smoke` vì đổi `dieu-phoi-man.ts` + `dua-don-smoke` ADR nêu tên)

| Kịch bản | Kết quả | Nhật ký |
|---|---|---|
| `dat-gap-smoke` (13 bước; bước 2b mới: Bán hàng tự đặt gấp ở trang đơn) | **Đạt 13/13**, axe chạy | `dat-gap-smoke.log`, ảnh `anh/b7-*.png` |
| `dua-don-smoke` (16 bước) | **Đạt 16/16** | `dua-don-smoke.log` |
| `help-smoke` (nhật ký thay đổi 2.31) | **Đạt** | `help-smoke.log` |
| `a2-smoke-form` | **Đạt** (từng đỏ sẵn từ 1.80 — `BL-VC-SMOKE-CU`) | `a2-smoke-form.log` |
| `a2-smoke-sheet` | **Đạt** | `a2-smoke-sheet.log` |
| `moc-chua-co-smoke` | 2 ✓ / 4 ✗ — **đỏ sẵn, y hệt `main`** | `moc-chua-co-smoke.log` |
| `dieu-phoi-smoke` | 5 ✓ / 6 ✗ — **đỏ sẵn, y hệt `main`** (menu Vận chuyển đổi từ Đợt 4/5) | `dieu-phoi-smoke.log` |
| `a2-smoke-order` | dừng ở "banner incomplete_trip" — **đỏ sẵn, y hệt `main`** | `a2-smoke-order.log` |
| `v1-xac-nhan-png` | 11 ✓ / 2 ✗ (b, j) — **đỏ sẵn, y hệt `main`** | `v1-xac-nhan-png.log` |
| `v1-nguoi-phu-trach` | 14 ✓ / 3 ✗ (h, j, l); `main`: j, l đỏ, h xanh. Bước h đỏ vì lệnh gieo `wrangler d1 execute` của kịch bản hỏng (`BL-SDL-KICH-BAN-CU`); chạy riêng `ONLY=h` trên nhánh → **xanh** | `v1-nguoi-phu-trach.log`, `v1-nguoi-phu-trach-chi-buoc-h.log` |

## Đối chứng trên `main` `78d21d65` (cùng máy, cùng cách chạy, kịch bản của `main`)

Năm kịch bản đỏ được chạy lại trên một bản sao chỉ-đọc của `main` (`git worktree add --detach`, xoá sau khi chạy). Dãy bước ✓/✗ trùng khít với nhánh ở `moc-chua-co-smoke`, `dieu-phoi-smoke`, `a2-smoke-order`, `v1-xac-nhan-png`; `v1-nguoi-phu-trach` khác đúng bước h (giải thích ở trên). Nhật ký: `doi-chung-main/*.log`. Không có bước đỏ mới do ADR-0107.

## Bài kiểm khác cùng ngày (lệnh ở kế hoạch, mục "Kết quả thi công")

`npm run typecheck` 0 lỗi; `npm test` xanh; e2e đủ bộ `npm run test:e2e` **72/72** kịch bản (có `audit-invariants --strict` ba nhóm: mọi bất biến đạt); quét tám giờ giả trong ngày cho bài đặt gấp + điều phối (đều xanh).
