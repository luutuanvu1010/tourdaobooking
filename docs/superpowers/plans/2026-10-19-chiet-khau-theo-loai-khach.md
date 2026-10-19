# Kế hoạch thi công — ADR-0133 chiết khấu theo loại khách

Nguồn: `docs/adr/ADR-0133-chiet-khau-theo-loai-khach.md` (accepted 2026-10-19). Việc lớn (tiền + dữ liệu): thi công xong phải có subagent kiểm độc lập, chỉ đọc (CLAUDE.md §3). Mỗi task: bài kiểm đỏ trước, xanh sau.

## Một điểm cần chủ xác nhận trước Task 1 (cách lưu)
Cột `kind` của `prc_commission_rule` (và `commission_kind` của `ord_service_terms`) có CHECK chỉ cho `RATE`/`PER_PAX`.
- **Phương án 1 (khuyến nghị): bảng phụ** `prc_commission_rule_pax(rule_id, adult, child, senior)` và `ord_service_terms_pax(...)`. Dòng `PER_PAX` cũ vẫn nguyên; có dòng phụ thì tính theo loại. Không dựng lại bảng cũ, ít rủi ro cho đơn đã có.
- Phương án 2: thêm kiểu `PER_PAX_TYPE` và dựng lại hai bảng như migration 0097. Gọn về khái niệm nhưng nặng và dễ sai.
Hết giờ chờ thì thi công theo phương án 1 (đảo ngược được hơn).

## Tiêu chí nghiệm thu (viết trước)
1. 2 NL + 1 TE + 1 NCT + 1 EB, mức 50.000/30.000/40.000 ⇒ hoa hồng 170.000 (em bé không tính).
2. Ô trẻ em bỏ trống ⇒ 0, hoa hồng chỉ cộng người lớn và người cao tuổi.
3. Đơn xác nhận rồi, đổi mức sau ⇒ đơn cũ không đổi; sửa số khách sau xác nhận ⇒ tính theo mức đã chụp.
4. Dòng `RATE` và `PER_PAX` cũ cho kết quả y hệt trước (bài kiểm hiện có vẫn xanh).
5. `audit-invariants` sạch; kiểm kiến trúc (`architecture.test.ts`) xanh.

## Các task
1. **Đặc tả luật thuần + sổ vàng (đỏ trước).** Thêm vào `src/shared/hoa-hong-dong.ts` hàm tính theo loại; viết `*.test.ts` cạnh tệp với ca mẫu ở tiêu chí 1–2; soạn bộ ca sổ vàng gửi Kế toán.
2. **Migration mới** (số = lớn nhất trên `main` + 1, kiểm `ls migrations` và các nhánh chưa gộp): bảng phụ cho mức và cho bản chụp, trigger chỉ-thêm/đóng-một-lần như `prc_commission_rule`. Cập nhật `docs/data-dictionary.json` rồi `npm run dict`. Bài kiểm migration (mẫu: `src/migrations-dung-lai-muc.test.ts`).
3. **Kho dữ liệu `pricing`** (`repository.ts`, `rules.ts`): khai/đọc ba số tiền; chọn mức trả kèm ba số; mọi ghi qua module chủ.
4. **Chụp lúc Xác nhận** (`src/modules/orders/thuong-mai.ts`, `thuong-mai-repo.ts`, `index.ts`): chụp ba số vào bảng phụ; DTO văn phòng/đối tác (`contracts.ts`); sửa số khách sau xác nhận tính lại theo bản chụp. Bài kiểm thứ tự lô theo CLAUDE.md §10.
5. **Giao diện khai mức** (`web/hoa-hong.ts`, `web/phan-doi-tac.ts`): ba ô tiền, ô trống hiện "0 đ", chữ tiếng Việt có dấu, `h()` không `innerHTML`, ô gõ 16px. Chạy lại kịch bản Chrome (nhớ `AXE_JS`).
6. **Tài liệu:** `SYSTEM-DESIGN.md` (§ hoa hồng), `CHANGE-GUIDE.md`, mục lục `docs/adr/README.md` thêm dòng ADR-0133, nhật ký thay đổi (`changelog.ts`) cho lần phát hành.
7. **Kiểm toàn bộ:** `npm run typecheck`, `npm test`, `npm run test:e2e` (cần mạng; chạm migration).
8. **Người kiểm độc lập** (`nguoi-kiem-doc-lap`, chỉ đọc): đọc mã thật, chạy lại lệnh, báo cáo. Người thi công không tự nghiệm thu (N8).
9. **Phát hành:** chủ tự chạy `npm run day-len` rồi `npm run trien-khai` (AI chỉ đưa lệnh). Chỉ phát hành sau khi Kế toán xác nhận sổ vàng.

## Thứ tự và phụ thuộc
Task 1 → 2 → 3 → 4 → 5 (5 có thể chạy song song với 4 sau khi 3 xong) → 6 → 7 → 8 → 9. Task 1 và soạn sổ vàng gửi Kế toán làm được ngay.
