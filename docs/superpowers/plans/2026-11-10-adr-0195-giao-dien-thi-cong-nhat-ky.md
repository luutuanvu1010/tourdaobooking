# Nhật ký thi công ADR-0195 — phần GIAO DIỆN (`web/`)

Nối tiếp `2026-11-10-adr-0195-may-chu-thi-cong-nhat-ky.md`. Người thi công ghi; CHƯA có người kiểm độc lập; CHƯA kiểm bằng trình duyệt (không chạy kịch bản Chrome / e2e).

## Đã nối
- `web/chinh-sach-giao-dien.ts`: `an` / `batBuoc` nhận điều kiện; thêm `chinhSachHienCo()` (bản vừa tải của trang, mặc định đầy đủ).
- Tạo đơn: thẻ dịch vụ ẩn / đánh dấu «*» / báo thiếu cho `flightCode`, `note` (và dòng ghi chú gọn của Đối tác), ẩn `paxOverride` theo điều kiện của chính dịch vụ; tính lại khi đổi lựa chọn đón; bản nháp giữ giá trị. `paxOverride` không có «Bắt buộc» (theo danh mục).
- Chi tiết đơn (`web/order.ts`): ẩn email khách, ghi chú khách, ghi chú thanh toán, «bởi <người lập>» — chỉ trên màn này.
- Danh sách tài khoản: badge «Ngưng» theo `active`.
- Hỗ trợ: «Đơn liên quan» (liên kết trong phiếu, dòng «Đơn» ở Chi tiết, mã đơn ở dòng hàng đợi).
- Màn chỉnh (`web/bang-dieu-khien-truong.ts`): bảy màn mới có sẵn qua `MAN_UI`; ô nhận điều kiện hiện ba dòng «<trường> — Mọi dịch vụ / Dịch vụ không đón / Dịch vụ có đón»; dòng điều kiện vắng = theo dòng «Mọi dịch vụ» (khớp máy chủ); xem trước nêu điều kiện; chú thích nói rõ «ẩn chỉ là ẩn hiển thị» và cảnh báo ghi chú Đối tác.

## KHÔNG nối được
1. **Danh sách đơn** (`danh-sach-don`: ghi chú khách, điểm đón, người lập, giờ lập, số khách): gói trang Đơn hàng tăng từ ≤ 111.118 lên 113.755 byte khi dùng `taiChinhSach` (kéo `ui-truong.ts`), và vẫn 111.379 (vượt 261 byte) khi đọc thẳng API không qua `ui-truong.ts`. Theo giao việc: dừng, KHÔNG nâng trần. Bản vá đã dựng nằm ở scratchpad (`danh-sach-don-bi-chan.patch`), đã gỡ khỏi nhánh. Cách mở: chủ nâng trần, hoặc phiên `src/` tách `traCuuChinhSach` ra tệp nhỏ.
2. **Số Face ID** (`passkeyCount`): số nằm trong chữ nút «Gỡ Face ID (N)» — bài bảng tham chiếu canh chữ ghép này; ẩn số cần đổi tên nút ⇒ việc của chủ (tên).

## Lệch / điều cần biết
- **Máy chủ đòi `flightCode` ở MỌI chặng, giao diện chỉ có ô ở chặng sân bay** (`coOSoHieu`): chủ bật «Bắt buộc» cho dịch vụ có chặng không ở sân bay ⇒ người lập không có ô để điền, máy chủ 400. Cần sửa `src/` (chỉ đòi ở chặng có ô) hoặc chủ biết trước. Giao diện chỉ đòi ở chặng có ô.
- Ẩn `paxOverride` ở chặng VỀ mà `soVe` đang sai dạng: lỗi chặn Lưu vẫn hiện nhưng không còn ô.
- Câu báo thiếu phía giao diện lặp lại câu của máy chủ («cần nhập «…»»).
- Màn chỉnh vẽ lại cả danh sách khi đổi một ô (để dòng điều kiện «theo» dòng chính cập nhật), giữ tiêu điểm theo id.

## Kịch bản Chrome cần chạy (chưa chạy)
`a2-smoke-form.mjs`, `a2-smoke-order.mjs` + `a2-smoke-*` còn lại, `doi-tac-lap-don-smoke.mjs`, `giao-dien-smoke.mjs`, `dot-a-smoke.mjs`, `ho-tro-smoke.mjs`, `va3-smoke.mjs`, `hdv-viec-cua-toi-smoke.mjs` nếu chạm chung; thử tay: đổi Đón / Không đón ở thẻ có sân bay, ghi chú Đối tác.
