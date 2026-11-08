# Nhật ký thi công — Tách nhiệm vụ mức (a) «đánh dấu, không chặn» (ADR-0187 Đ3)

Kế hoạch: `docs/superpowers/plans/2026-11-08-tach-nhiem-vu-muc-a.md`. Đặc tả: `docs/superpowers/specs/2026-11-08-tach-nhiem-vu-muc-a-design.md`. Nhánh `claude/keen-ishizaka-248ee0`, migration `0150`, bản `2.76`.

## Trạng thái task
| # | Task | Trạng thái |
|---|---|---|
| 1–5 | Luật thuần, migration 0150, dấu tự điền ở nhật ký + phiếu sổ, route gọi hàm chung, bài quét tĩnh, sổ soát + 3 route | Xong — lưu `248e5102a` |
| 6–7 | Sổ công nợ (bộ lọc + «Đã soát»), thẻ Trang chủ | Xong — lưu `03f7138a3` |
| 8 | E2E `tests/e2e/tach-nhiem-vu.mjs` | xem mục «Kết quả kiểm» |
| 9 | Nhật ký thay đổi 2.76, sổ hàng rào (2 dòng), nhật ký này | Xong |
| 10 | Kiểm độc lập | ĐẠT CÓ ĐIỀU KIỆN 8/11 — hai điều kiện đã xử lý (xem «Kết quả kiểm») |

## Ruling (AI tự quyết trong phạm vi đặc tả §6, đảo ngược được)
- **R1** Dấu nhật ký điền theo DANH SÁCH hành động (`HANH_DONG_GHI_TIEN`, 14 hành động của bốn ô `O_GHI_TIEN`) + người lập đơn, ngay trong `insertStatement` (khuôn `acting_role`). Route không tự ghi dấu nhật ký ⇒ không route nào quên được. `payment_recorded` không thuộc tập (luồng thu thường của Bán hàng không phải việc của nhóm ghi tiền); riêng nhánh thu lên đơn đã huỷ (ô `ledger.write`) thì PHIẾU mang dấu nhưng nhật ký `payment_recorded` không — ghi ở đặc tả §3, chờ chủ nếu muốn khác.
- **R2** Dấu phiếu sổ điền khi route ghi tiền đặt cờ `ghiTien` cho `NguoiGoi` VÀ người lập đơn = `created_by`; phiếu nộp gộp nhiều đơn (`order_id` NULL) không dấu. **Sửa 8/11 theo kiểm độc lập:** dòng nhật ký `ledger_settlement` ghi theo bên, không có mã đơn ⇒ không bao giờ mang dấu ⇒ nộp/trả theo bên không vào danh sách soát (xem «Chờ chủ» 3).
- **R3** Mỏ neo soát = dòng NHẬT KÝ có dấu (không phải phiếu), vì «đánh dấu đã nhập phần mềm kế toán» không có phiếu. Bảng `bil_soat_tu_ghi` chỉ-thêm; khoá chính = `audit_id` ⇒ soát một lần.
- **R4** Danh sách trả mọi dòng chưa soát + dòng đã soát trong 30 ngày (`NGAY_GIU_DA_SOAT`), tối đa 500, chưa soát xếp trước.
- **R5** Hai ngoại lệ có tên của bài quét: `POST …/adjustment-requests/:id/withdraw` (rút yêu cầu, không ghi tiền) và `POST …/tu-ghi/:auditId/da-soat` (nút soát).
- **R6** Chữ: «Tự ghi đơn mình lập», «Cần người thứ hai soát», «Đã soát» lấy nguyên văn ADR-0187 (coi là chủ đã chọn, Bảng tham chiếu `da-chot`). Chữ nút thẻ Trang chủ **«Soát»** là AI đặt tạm — Bảng tham chiếu để `cho-chon`, xem «Chờ chủ».
- **R7** Ảnh chụp route 466 → 469; số route ghi 266 → 267; `KHOA_PHAM_VI` 11 → 12 (khoá `tuGhi`, phạm vi Toàn công ty).

## Kết quả kiểm
- Bài thuần `src/shared/tach-nhiem-vu.test.ts` 4/4; bài quét `src/tach-nhiem-vu-route.test.ts` 3/3 (đã quan sát chặn thật — sổ hàng rào); bài khung thử `src/modules/billing/tach-nhiem-vu-khung.test.ts` 4/4 (dấu nhật ký, dấu phiếu, 403/201/409/404, trigger, danh sách/đếm).
- `npm run typecheck` 0 lỗi; bài route-access, lan-gui, architecture, bang-tham-chieu, viec-cua-ban, pham-vi-so, goi-trang-nhe, changelog/app-info xanh.
- E2E `npm run test:e2e -- tach-nhiem-vu`: xanh 2026-11-08 (4/4 kịch bản của nhóm, API thật trên D1 tạm). `npm test` đầy đủ, kiểm độc lập: ghi ở phần cuối khi có kết quả.
- **Kiểm độc lập** (`nguoi-kiem-doc-lap`, 8/11): ĐẠT CÓ ĐIỀU KIỆN. Hai mục Important: (1) thiếu ca kiểm đường «Hoàn thành» — đã thêm hai ca vào `tach-nhiem-vu-khung.test.ts` (Hoàn thành của người kiêm: nhật ký + phiếu COMPLETED mang dấu; lai Kế toán + Đối tác bị chặn ở ba route) ⇒ 6/6 xanh; (2) lời ghi về `ledger_settlement` sai với mã — đã sửa đặc tả §3, R2 và «Chờ chủ» 3. Minor: ca `attribution_reversed` của `cauTinBenChiu` chưa kiểm có sinh dòng soát thừa không (ghi nợ, dưới).
- Nợ nhỏ: `cauTinBenChiu` ghi `attribution_reversed` (thuộc tập có dấu) — chưa kiểm xem có tạo dòng «cần soát» thừa khi người lập đơn làm việc đó.
- Kịch bản Chrome `trang-chu-smoke.mjs` (bảng `web/CLAUDE.md` yêu cầu khi sửa `web/home.ts`): **chưa chạy** trong phiên này (cần Chrome + axe ngoài kho). Trang Sổ công nợ không có kịch bản trong bảng. Phần hiển thị «dựa vào kỷ luật» tới khi có người xem bằng Chrome/iPhone.

## Chờ chủ quyết
1. **Chữ nút thẻ Trang chủ** «Cần người thứ hai soát»: đang tạm «Soát». Hai tên khác: «Xem» (giống thẻ «Xem đơn») hoặc «Đi soát». Chọn xong thì đổi `NUT_SOAT` ở `src/shared/tach-nhiem-vu.ts` + Bảng tham chiếu sang `da-chot`.
2. **Thu lên đơn đã huỷ do chính người lập ghi** (R1): phiếu có dấu, nhật ký `payment_recorded` không ⇒ dòng này KHÔNG vào danh sách soát. Muốn soát cả nhánh này thì cần thêm hành động nhật ký riêng (ADR nhỏ).
3. **Nộp / trả tiền theo bên** (`POST /api/ledger/settlements`): nhật ký `ledger_settlement` ghi theo bên nên KHÔNG mang dấu; phiếu chỉ mang dấu khi gộp đúng một đơn. Hệ quả: Kế toán kiêm Bán hàng tự nộp/trả tiền cho đơn mình lập thì thân phản hồi có cờ nhưng dòng KHÔNG vào danh sách «Cần người thứ hai soát». Hai cách: (a) chấp nhận ở mức (a) hiện tại; (b) ghi thêm một dòng nhật ký theo từng đơn trong `phanBo` (ADR nhỏ, đổi số dòng nhật ký của luồng nộp). Khuyến nghị (b) nếu chủ muốn soát cả nộp/trả.
4. Lệnh chỉ đọc trên production để biết hiện có ai kiêm hai việc (đặc tả §1) — chủ tự chạy nếu muốn biết trước khi triển khai.
