# Đề xuất sửa luật — sổ đại lý đợt 1

> Hồ sơ có ngày (2026-10-12), người thi công Task 14 soạn. **AI không tự sửa** các tệp dưới đây (N9): chủ duyệt mới có hiệu lực. Có sáu đề xuất chạm luật nên mỗi mục ghi rõ **bắt buộc với đợt 1** (để luật không nói sai hiện trạng sau khi đợt 1 lên) hoặc **tuỳ chủ**. Dưới đây là chữ hiện tại, chữ đề xuất, lý do một câu.

## 1. `docs/ARCHITECTURE.md` — bảng thi hành, dòng 5.14 (bắt buộc với đợt 1)
**Hiện tại:** `| 5.14 Hai trục thời gian; khoá kỳ | **chưa có** | sổ tiền chưa có; bảng hiện có dùng created_at + ngày dân sự riêng lẻ | Enterprise OS |`
**Đề xuất:** cột "Cưỡng chế bằng": *khoá kỳ cho các bảng tiền có ngày phát sinh (biên nhận, bút toán, hoàn ngoài hệ thống, chi phí xe): các trigger `*_period_closed` (migration 0090) + lời kiểm trước lô ghi (`loiKhoaKy` của billing, `loiKhoaThangXe` của van-chuyen, gốc `cauTriggerKhoa` của ky-so) + kiểm `R-KY-1`, `R-KY-2` của `audit-invariants`; dòng ở `docs/SO-HANG-RAO.md`*. Cột "Lệch": *tháng đã khoá không mở lại được, cứu nhầm chỉ bằng Time Travel và chưa diễn tập (HC-5.19); bảng tiền ngoài các bảng trên chưa có khoá; bài nguồn của lô chỉ canh quên, không canh cố ý*. Nguồn: thêm ADR-0080.
**Lý do:** dòng cũ nói "chưa có" trong khi cơ chế đã có và đã quan sát chặn thật, nên người sau đọc luật sẽ hiểu sai hiện trạng.

## 2. Bổ sung ADR-0090 điều 0 — `ledger.period.close` có vào `O_GHI_TIEN` không (tuỳ chủ)
**Hiện tại:** điều 0 liệt kê đúng bốn ô `ledger.write`, `payment.refund`, `order.complete`, `accounting.entry.mark`; bài `src/shared/permissions.test.ts` ghim đúng bốn ô đó. Đợt 1 **không** thêm ô khoá tháng (đặc tả N6).
**Đề xuất (nếu chủ muốn):** thêm `ledger.period.close` làm ô thứ năm.
**Được:** nếu sau này ô khoá được mở cho một quyền thứ ba, hàm "quyền tiền" tự coi quyền đó là quyền tiền và chỉ Toàn quyền cấp được. **Mất:** sửa một ADR đã duyệt mà hôm nay hành vi không đổi, vì ô khoá chỉ có Kế toán và Toàn quyền, đã nằm trong tập quyền tiền.
**Khuyến nghị:** chưa thêm. Nếu chủ ngại ô bị mở rộng sau này, cách rẻ hơn là một bài ghim "ô khoá tháng chỉ cho Kế toán và Toàn quyền" (siết, không cần sửa ADR) — tôi làm khi chủ bảo.

## 3. `web/CLAUDE.md` — bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào": thêm một dòng (bắt buộc với đợt 1)
**Hiện tại:** không có dòng cho các trang mới.
**Đề xuất:** `| Sổ đại lý đợt 1: web/hoa-hong.ts, web/nguoi-ban.ts, web/khoa-thang.ts, web/phan-doi-tac.ts, web/dat-qua-doi-tac.ts, ba trang public tương ứng, web/so-dai-ly-ui.ts | so-dai-ly-smoke.mjs ở docs/evidence/2026-10-08-so-dai-ly-dot-1/kich-ban/ (390 + 1040; cần AXE_JS; chạy trên D1 tạm) |`
**Lý do:** kịch bản này là rào duy nhất cho các hành vi "404 ⇒ ẩn" và "số tiền khớp DTO" ở giao diện mà `npm test` không canh; thiếu dòng thì người sửa các tệp trên không biết phải chạy lại.

## 4. `CLAUDE.md` §10 — thêm một dòng bẫy (tuỳ chủ)
**Hiện tại:** §10 chưa nhắc sổ đại lý.
**Đề xuất:** `- **Sổ đại lý đợt 1** (ADR-0077/0078 B1/0080 D1, migration 0090): mức hoa hồng của đơn được chụp trong lô Xác nhận, mọi câu sau UPDATE orders có WHERE changes() > 0 — đừng chen câu không có điều kiện đó; DTO phần Đối tác là danh sách trắng (hoa hồng và giá đại lý, không tỷ lệ, người bán, giá vốn); tháng đã khoá không mở lại được, e2e chỉ khoá 2025-01/02. Chi tiết: docs/CHANGE-GUIDE.md công thức z15, bẫy 64–66.`
**Lý do:** ba bẫy này đều làm hỏng sổ tiền mà không có lỗi báo ngay; `CHANGE-GUIDE.md` đã có chi tiết, dòng này chỉ để phiên sau đọc §10 là thấy.

## 5. `docs/ARCHITECTURE.md` Phần I — bảng thi hành, dòng K4 (tuỳ chủ; Hiến chương chỉ chủ sửa)
**Hiện tại:** cột "Cưỡng chế bằng": `permission-enforcement.test.ts`, `route-write-guard.test.ts` + sổ hoãn `quyen-hoan.json`.
**Đề xuất:** thêm vào cùng ô: *`src/so-la-thuong-mai-toan-nen-tang.test.ts` (ai thấy tiền thương mại của ai, quét mọi route GET) và `src/muc-hien-mo-duoc-*.test.ts` (mục giao diện hiện ⇔ trang mở được bằng chính tài khoản đó)*.
**Lý do:** hai hàng rào này thi hành đúng K4 mà bảng chưa kể; chúng là hàng rào SIẾT, không nới điều nào.

## 6. `web/CLAUDE.md` — hai chỗ lỗi thời sau khi bảng mục giao diện ra đời (bắt buộc với đợt 1)
**Hiện tại:** (a) dòng "Trang mới" dặn "thêm điều hướng ở `web/shell.ts`"; (b) dòng "Ẩn/hiện theo quyền" nêu `web/shell.ts`, `web/account.ts` là nơi tính ẩn/hiện.
**Đề xuất:** (a) thay bằng "thêm MỘT dòng `TRANG` ở `src/shared/muc-giao-dien.ts` (đường trang, đường gọi chính, ai thấy) và dòng chỗ đặt; rào `src/muc-hien-mo-duoc-*.test.ts` tự đọc dòng mới"; (b) thêm `src/shared/muc-giao-dien.ts` vào danh sách tệp của dòng.
**Lý do:** hai tệp `web/shell.ts`, `web/account.ts` nay chỉ vẽ danh sách, nên lời dặn cũ đưa người sau đi sai chỗ (`docs/CHANGE-GUIDE.md` công thức "thêm trang" đã nói đúng).

## Ghi nhận, không cần chủ sửa luật
Luật 5.21 "đọc rồi ghi phải gác" chưa dựng hàng rào, theo lời chủ "để tôi đọc". Nếu chủ đọc xong thấy đáng dựng, nội dung nằm ở `docs/superpowers/specs/2026-10-09-khuon-ba-luat-xuyen-suot.md` mục 5.21; tệp đó cũng ghi hàng rào này nên xong trước đợt 2 vì đợt 2 ghi sổ nhiều nhất.
