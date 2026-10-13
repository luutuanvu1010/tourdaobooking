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

### Task 1 — migration `0095_loai_doi_tac_la_du_lieu.sql` (người thi công, 2026-10-14)
- Bài `src/migrations-loai-doi-tac.test.ts` viết trước: 8/8 đỏ khi chưa có migration; sau migration 8/8 xanh. `R-PRC-6` thêm ở `scripts/audit-checks.mjs`, ca xanh/đỏ ở `src/audit-invariants.test.ts`.
- **Quan sát chặn thật (bước 6)**, bằng cách gỡ MỘT trigger trong CSDL thử của bản sao bài (không sửa migration đã commit), chạy lại 8 ca, rồi tạo lại (CSDL tạm bỏ đi): gỡ `pty_role_type_partner_label_other` → ca (f) đỏ; gỡ `pty_role_type_partner_label_immutable` → ca (f) đỏ; gỡ `pty_party_role_partner_label_conflict_ins` → ca (c) hai chiều đỏ (2 ca); gỡ `pty_party_role_partner_label_conflict_upd` → ca mở lại vai đỏ; gỡ `prc_beneficiary_role_kind` → ca (d) đỏ; gỡ `adr0117_permission_partner_label_internal` → ca `stf_permission` đỏ. Không gỡ gì → 8/8 xanh. `R-PRC-6`: ca đỏ trong `audit-invariants.test.ts` dựng bằng cách gỡ đúng trigger chặn rồi chèn lậu (đếm 1/1/1/2 theo từng nhánh).
- Hai bài cũ phải sửa vì chính migration mới làm chúng đỏ (nằm trong ý của ADR): `src/da-giao-khe-hoa-hong.test.ts` ca 4 (loại OTHER «NHAN_VIEN_SPA» nay phải mang cờ loại đối tác mới vào được danh sách hưởng) và `src/migrations-ten-vai-tai-xe-taxi.test.ts` (b) (chỉ so các cột đã có trước tệp đó).

