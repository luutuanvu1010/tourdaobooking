# Kết quả phần 2 (ADR-0151): nút «Đổi cấp» ở thẻ một đối tác

Ngày 2026-10-30, nhánh `hoa-hong-cap-dai-ly`, Task 17. Môi trường: D1 tạm, `wrangler dev` cục bộ (không `--remote`), Chrome headless qua `chrome-wrap.sh`, axe-core, cổng tự chọn.

## Lệnh đã chạy

- `npm run build:web`: xong. `npm run typecheck`: 0 lỗi.
- `npm test`: 6789 bài, 0 đỏ. `src/shared/so-do-trang.ts` không đổi.
- Kịch bản Chrome `hoa-hong-smoke.mjs` (cả 390 và 1040): `HOA HONG SMOKE OK`, 53 bước xanh (27 ở 390, 26 ở 1040), gồm bước DC mới ở cả hai khổ. Ảnh ra thư mục tạm, chỉ giữ hai ảnh bước DC ở `anh-phan-2/`.

## Bước DC (mới, 390 + 1040): cả hai khổ ĐẠT

1. Đổi từ hôm nay: ô cấp chỉ liệt kê cấp đang mở và khác cấp cũ (không có cấp cũ, cấp khoá); ô «Từ» mặc định hôm nay; câu Đ8 KHÔNG hiện khi cấp cũ đang mở; sau khi bấm «Đổi cấp»: POST `/muc-rieng/:id/doi` trả 200, lần cũ ngừng hôm qua, lần mới từ hôm nay không thời hạn, lần cũ vào «Xem lịch sử (1)».
2. Cấp cũ đang khoá: hộp hiện đúng câu «Cấp cũ «<tên>» đang khoá. Đổi xong thì không đổi ngược về cấp này được, trừ khi mở lại cấp.»
3. Lần có ngày ngừng: không «Đổi cấp» ở nút lẫn «⋯».
4. Cấp mới bị khoá chen giữa lúc hộp mở (khoá bằng fetch trong trang): POST trả 409; câu trong hộp bằng đúng chữ máy chủ trả (đối chiếu bằng một lần gọi dò cùng thân); hộp còn mở, nút bấm lại được.
5. Bán hàng: bước 7 cũ (mọi cụm đối tác mở, đòi 0 nút «Đổi», 0 «⋯») vẫn xanh.
6. Mỗi hộp qua `bocucSach` (không tràn ngang, vùng chạm, ô gõ 16px, không chữ Anh, không «chính sách») và axe (critical/serious ⇒ đỏ): sạch.

Bước CR (phần 1) đổi một dòng khẳng định: cấp riêng nay có «Đổi cấp» (nút ở máy tính, đầu «⋯» ở điện thoại), «⋯» còn Sửa và Ngừng áp dụng.

## axe

`aria-allowed-role` ở `#hh-cap-ct` hết (đổi `<article>` thành `<section>`). Ghi nhận nhẹ còn lại: bước 8k Tab đầu tiên trong «⋯» tới nút «Đóng» (như phần 1).

## Ảnh

`anh-phan-2/dc-hop-doi-cap-rieng-390.png`, `anh-phan-2/dc-hop-cap-cu-khoa-390.png`.
