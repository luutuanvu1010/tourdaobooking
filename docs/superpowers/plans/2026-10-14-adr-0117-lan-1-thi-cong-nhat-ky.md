# ADR-0117 lần 1 — Nhật ký thi công

Kế hoạch: `2026-10-14-adr-0117-lan-1-ke-hoach.md`. Nhánh: `claude/adr-0117-lan-1`. Điều phối: phiên `friendly-franklin`; người thi công: các phiên con (mỗi việc một phiên); người kiểm: `nguoi-kiem-doc-lap` (chỉ đọc).

## Điều kiện (Task 0) — 2026-10-14
- Chủ ra lệnh thi công trong chat 2026-10-14 ("thi công ADR-0117 lần 1 đi trong subagent"). Q1 = **A** (chủ chọn): đơn mới của khách mang loại đã tắt bị giữ, giống năm loại cũ.
- Số migration: `0095` trống trên mọi nhánh cục bộ và remote (kiểm bằng `git ls-tree`).
- Xây trên lỗ đang hở: **không có mã nào** (TNV-G1, TNV-G3, TNV-G4, HC-4.2, HC-5.19, HC-5.11 — bảng và lý do ở kế hoạch). Căn cứ TNV-G3 cần người kiểm xác nhận bằng diff: `src/modules/orders/hoan-tat-repo.ts` và `src/modules/billing/*` không bị sửa.
- Hạn 2026-10-31 của năm mục sổ hoãn: chủ đã được báo; người thi công không sửa `docs/quyen-hoan.json`.

## Rulings của điều phối
1. Q1 = A (chủ chọn). Hoàn tác: bỏ vế `nhanDoiTac` ở `nguoiHuongCua`.
2. N-6 kiểm lệch cờ bằng DTO `dangBat` (hai cờ cùng bật), không đổi `R-PRC-6`.
3. `/tat` `/bat`: mã không phải loại nhãn → 404; đã ở trạng thái đó → 409 `stale`.

## Tiến độ
(điều phối ghi theo từng task)
