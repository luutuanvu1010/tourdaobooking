# Bước 1 — sửa khung chung giao diện (13/11/2026)

> Kế hoạch gốc: `docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md` mục 5 bước 1 (nhánh `claude/blissful-villani-4d7668`).
> Phát hiện gốc: `docs/superpowers/specs/2026-11-13-kiem-giao-dien/PHAT-HIEN.md`. Lời chủ (qua phiên điều phối, 13/11): «Làm cả hai» — bước 1 và soạn ADR
> lên kho song song; ADR do phiên Kế hoạch làm. **Không** đụng K1–K5. Nhánh `claude/buoc-1-khung-chung`; không nhập bản chính, không triển khai.
> Ghi chú vai (P15): phiên này làm bước 0 (kiểm, đã xong và đã có người kiểm lại). Bước 1 là việc mới (thi công); nghiệm thu do một trợ lý kiểm độc lập khác.

## Tiêu chí nghiệm thu (viết trước khi sửa; đo bằng kịch bản bước 0)

| Mã | Việc | Đạt khi | Đo |
|---|---|---|---|
| N3 | Thanh nút dưới khi màn thấp (xoay ngang, phóng 200 %) | Ở 844×390 và 640×400 (tỉ lệ 2): 0 nút / ô nhập của Tạo đơn bị thanh nút đè sau khi cuộn vào giữa (T3); ở 390×844 và 1280×800 thanh nút giữ nguyên như cũ | `do-quet.mjs --trang /order-form` (khổ t16-zoom200) + `soi-mot-o.mjs … 844 390` |
| N5 | Vùng chạm nút ảnh đại diện | `button.bar-avatar` có vùng chạm ≥ 44 × 44 ở 360/390/430; hình tròn nhìn thấy giữ 30 px | `do-quet.mjs` → `T4.theoLop` không còn `bar-avatar 30×30` |
| N9 | Dải thông báo ở điện thoại | ≤ 64 px ở 390 (nay 89–113); chữ không tràn, nút «Xem» / «Bật ngay» / nút đóng vẫn ≥ 44 px; máy tính không đổi | đo `#strips .dai` |
| N10 | Nhảy bố cục khi dữ liệu về | Mở lại (4G chậm, CPU 4×) Dịch vụ, Vé điện tử, Quản lý tài khoản: CLS < 0,1 (nay 0,49 / 0,45 / 0,30) | kịch bản đo nguồn nhảy bố cục (layout-shift) |
| N11 | Hộp hỏi kiểu trình duyệt | 0 chỗ gọi `confirm(`/`alert(` trong `web/`; bài khoá trần hạ về 0; nút đỏ dùng đúng tên nút đã có trong bảng tham chiếu, nút giữ «Giữ nguyên» | `node --test src/ratchet-confirm-alert.test.ts src/bang-tham-chieu.test.ts` |
| chung | Không làm hỏng chỗ khác | `npm test`, `npm run typecheck` xanh; quét lại toàn bộ 2.709 ô không tăng lỗi T1 / T3 / T4; kịch bản Chrome khung chung `dot-0-smoke.mjs` đạt | chạy một lần ở cuối |

## Đổi điều người dùng thấy — cần chủ duyệt trước (ảnh ở `docs/evidence/2026-11-13-buoc-1-khung-chung/xem-truoc/`)

1. **Dải thông báo trên điện thoại gọn lại tối đa hai dòng** (113 → 53 px). Câu dài bị cắt bằng «…»; bấm «Xem» vẫn đọc đủ. Máy tính không đổi. Ảnh `dai.jpg`.
2. **Màn thấp (điện thoại xoay ngang, phóng to 200 %): thanh nút Lưu thôi dính đáy**, nằm ở cuối biểu mẫu như một khối thường — phải cuộn xuống mới bấm Lưu,
   nhưng không còn che nội dung. Điện thoại cầm dọc và máy tính giữ nguyên. Ảnh `ngang.jpg`. Phương án khác: giữ dính đáy nhưng thu còn một dòng (tổng tiền + nút Lưu).

## Tự quyết, ghi lại (không đổi nghĩa, theo kế hoạch đã chốt)

- N5: chỉ nới vùng bấm vô hình quanh ảnh đại diện; hình không đổi.
- N10: thay dòng chữ «Đang tải…» ở ba trang bằng khung chờ chung của đợt 0 (dải xám) có chiều cao giữ chỗ — cùng thành phần các trang khác đã dùng.
- N11: thay 16 hộp hỏi của trình duyệt bằng hộp hỏi chung trong Nền tảng (`hoiXacNhan`, đã dùng ở nhiều trang); câu hỏi giữ nguyên chữ; nút đỏ mang đúng tên nút
  đã bấm (ví dụ «Đặt lại PIN»), nút còn lại «Giữ nguyên». Kế hoạch đã chốt ngưỡng T12 = 0.

## Nhật ký

- 13/11: lập nhánh, nhập bản chính 2.97; đo nguồn nhảy bố cục (Dịch vụ: khối chèn phía trên và nhóm dịch vụ nở ra; Vé điện tử: danh mục trong khối «Tạo vé» nở ra đẩy
  các khối dưới; Quản lý tài khoản: danh sách tài khoản nở ra đẩy khối «Hàng chờ xác minh»); Tạo đơn và Chính sách điều phối không tái hiện CLS cao của lượt đo bước 0.
  Sửa lại chẩn đoán Quản lý tài khoản: khối vai trong «Thêm tài khoản» (cao 300–700 px) dựng sau lần nạp đầu — đó mới là thứ đẩy «Hàng chờ xác minh».
- 13/11: N5, N10 (390), N11 xong, lần lưu 63a05ad26. Đo lại ở 390: Dịch vụ 0,09, Vé điện tử 0,05, Quản lý tài khoản 0. Bài bảng tham chiếu, bài khoá hộp hỏi
  (trần 0), bài cỡ gói trang xanh.
- **Phát hiện mới khi đo ở 1280 (bước 0 chỉ đo tốc độ ở 390):** (a) thanh trên máy tính lúc chưa dựng khung chỉ cao 24 px rồi nở lên 60 px — đã sửa (thanh cao sẵn);
  (b) **dải thông báo chèn muộn đẩy cả trang xuống 61 px** ở mọi trang máy tính khi có tin / nhắc hai lớp: Quản lý tài khoản 0,66, Dịch vụ 0,41, Đơn hàng ~0,1.
  Chưa sửa vì chưa biết trước có dải hay không lúc vẽ khung; cách sửa (nhớ dải lần trước để vẽ sẵn, hoặc giữ chỗ) là việc khung chung riêng — ghi để hỏi.
