# Biên bản chủ dự án duyệt đặc tả Hoa hồng cấp đại lý (2026-10-30)

Hồ sơ có ngày. Chủ dự án trả lời trong phiên (AskUserQuestion) sau khi QA1 lần 4 ĐẠT (`QA1-LAN-4.md`, đặc tả bản 4 ở lần lưu `37c6638c`, ADR-0151 bản 2 ở lần lưu `3d9f26bb`).

10. **Phần 1 (giao diện trang Hoa hồng mới + đổi chữ, không đổi cách tính tiền): ĐÃ DUYỆT.** Được viết kế hoạch thi công. Kế hoạch đưa chủ duyệt trước khi viết mã.
11. **ADR-0151 (nút «Đổi cấp» một lô cho cấp riêng của đối tác): ĐÃ DUYỆT.** Phần 2 được đưa vào kế hoạch thi công cùng phần 1.
12. **Câu báo lỗi của đường «Đổi cấp»: sửa câu ở đường mới.** Route mới trong `pricing/index.ts` tự xét hai điều kiện «đã có ngày ngừng» và «ngày bắt đầu cũ ≥ ngày mới» trước khi gọi `kiemDoi`, rồi trả câu đúng cho cấp riêng. `kiemDoi` (`rules.ts`) vẫn giữ nguyên từng chữ, theo quyết định 9. Cái giá của cách này: hai điều kiện được chép thành nguồn thứ hai, nên phải có bài kiểm ghim cho cả hai phía cùng một ca. Quyết định này thay cho phần «lệch có tên» của quyết định 9, nhưng chỉ ở route mới.
