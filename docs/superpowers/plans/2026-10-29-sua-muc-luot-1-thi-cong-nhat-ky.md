# Nút «Sửa» mức hoa hồng (ADR-0148 lượt 1) — Sổ điều phối thi công

- **Kế hoạch:** `docs/superpowers/plans/2026-10-29-sua-muc-luot-1-ke-hoach.md` (7 task). Nguồn chuẩn tắc: `docs/adr/ADR-0148-nut-sua-muc-hoa-hong-va-gia-dai-ly.md` (accepted 29/10).
- **Phiên thi công:** nhánh `claude/recursing-kilby-af8ebc` (dựng trên `claude/pricing-age-discount-config-328499` 11088c75, rồi nhập `main` 195e9d3e = bản 2.42 TNV-G1). Vai: THI CÔNG, không tự nghiệm thu (Task 7 = người kiểm độc lập chỉ đọc).
- **Xây trên lỗ đang hở:** không. `docs/quyen-hoan.json` 29/10 có 6 mục (TNV-G1/G3/G4, HC-5.19, HC-5.11, HC-4.2) — không mục nào chạm `pricing` / `ord_service_terms`.
- **Số đã lấy lúc thi công:** migration `0126` (main lớn nhất 0125; không nhánh `claude/*` / worktree nào giữ 0126). Phiên bản tạm `2.43` (main 2.42).

## Kiểm production trước khi gộp (Task 2, điều kiện dừng (b))
- 29/10, trước khi có cột huỷ: thêm R-PRC-7 bản **chỉ xét ngày** (commit 4c1ce331) rồi chạy `node scripts/audit-invariants.mjs --db remote` (hàng rào cho chạy). Kết quả: `✓ R-PRC-7`, «Mọi bất biến đạt, 5 cảnh báo». ⇒ production **không** có bản chụp lệch khoảng ngày do lỗ «Đổi / Ngừng» của 2.40; không cần hỏi chủ.
- Sau khi R-PRC-7 thêm vế «dòng chưa huỷ», chạy remote sẽ thoát 2 tới khi 0126 được áp — đúng thứ tự của `npm run trien-khai` (kiểm dữ liệu chạy SAU migration).

## Task 1 — Migration + bài CSDL (xong)
- `migrations/0126_sua_muc_huy_thay.sql`: bốn cột mỗi bảng; `*_close_only` thay bằng luật «đóng / rút ngắn / huỷ một lần»; `*_overlap` bỏ qua dòng huỷ; thêm `*_born_clean`, `*_replaces_ok`; view `v_prc_commission_rule` thêm `WHERE voided_at IS NULL` (cột giữ thứ tự), trigger `ord_service_terms_rule_valid` tạo lại nguyên văn.
- Bài `src/modules/pricing/sua-muc-csdl.test.ts` (7 bài): đỏ 7/7 trước migration, xanh sau.
- Quan sát chặn thật (P16, 29/10): phá cố ý từng chỗ trên tệp migration → bài đỏ → hoàn nguyên → xanh 7/7: (1) view bỏ `WHERE voided_at IS NULL` → bài 7 đỏ; (2) close_only bỏ khoá dòng đã huỷ → bài 2 đỏ; (3) chồng ngày không bỏ dòng huỷ → bài 4, 5 đỏ; (4) gỡ born_clean → bài 4 đỏ; (5) gỡ replaces_ok của mức → bài 5 đỏ; (6) close_only cho kéo dài → bài 3 đỏ.
- `src/migrations-dung-lai-muc.test.ts`: loại 0126 khỏi bước «trước 0097» (khuôn loại 0116 sẵn có) — 0126 đọc cột `target_tier_code` do 0097 thêm; production luôn áp 0126 sau 0097.
- `docs/data-dictionary.json` (+ `npm run dict`): 12 cột mới, `change_reason` xếp N2 như `note` (chữ tự do).

## Quyết định thi công tự áp (bề mặt / an toàn, ghi lại để chủ biết)
- **T-1** Route Sửa của gắn đối tác là `POST /api/pricing/muc-rieng/:id/sua` (khớp route «Ngừng» sẵn có `/api/pricing/muc-rieng/:id/ket-thuc`), không phải `ho-so/muc-rieng/:id/sua` như chữ kế hoạch.
- **T-2** Có dòng cũ ⇔ có lý do (cả hai chiều, trigger `*_replaces_ok`) — chặt hơn chữ kế hoạch («có `replaces_id` thì phải có lý do»).
- **T-3** «Đã chụp» (`ngayChupGanNhat`) đếm MỌI bản chụp có `commission_rule_id`, cả bản MANUAL (ghi tay chỉ đổi người bán chép mã dòng của bản trước — `apGhiTay`) và bản đã bị thay: thừa chứ không thiếu (Q1). R-PRC-7 chỉ xét bản AUTO (ngày chụp của bản MANUAL là ngày ghi tay).
