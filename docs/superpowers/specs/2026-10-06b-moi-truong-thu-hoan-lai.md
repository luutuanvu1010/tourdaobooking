# Ghi nhận: hoãn lại việc dựng môi trường thử (lần thứ hai, cùng ngày)

- Ngày: 2026-10-06, sau hồ sơ `2026-10-06-moi-truong-thu-kich-hoat.md` (viết cùng ngày, vẫn giữ nguyên, không sửa — tài liệu có ngày không đóng băng lại cho khớp hiện trạng mới).
- Khi được hỏi xác nhận lại bốn lựa chọn cũ để bắt đầu thi công, chủ dự án đổi ý: **chưa dựng môi trường thử, cứ lên thẳng production như trước đây.** Lý do chủ nêu: chế độ bảo trì (chế độ phát triển) vẫn đang bật, chỉ chủ tự vào được, nên trong giai đoạn này production đã có tác dụng tương tự một môi trường thử riêng (chỉ một người dùng, không ảnh hưởng khách/nhân viên).

## Trạng thái sau cùng
- Thiết kế và kế hoạch 11 bước ở `docs/superpowers/specs/2026-10-05-moi-truong-thu.md` và `docs/superpowers/plans/2026-10-05-moi-truong-thu-ke-hoach.md` **vẫn còn giá trị**, không xoá, không sửa — chỉ là CHƯA THI CÔNG.
- Không có khối `env.staging` nào được thêm vào `wrangler.jsonc`; không tạo D1/Worker/Access nào cho môi trường thử.
- Ba điều kiện kích hoạt cũ của đặc tả 2026-10-05 vẫn đứng nguyên cho lần sau — việc dựng môi trường thử nên được nhắc lại khi: (1) một migration chạm tiền khác sắp phát hành, HOẶC (2) chế độ bảo trì được tắt (khi đó production có nhiều người dùng thật, mất tác dụng "giống môi trường thử" mà chủ đang dựa vào), HOẶC (3) điều kiện thứ ba của đặc tả cũ xảy ra.

## Điều cần nhớ cho phiên sau
Khi chủ dự án tắt chế độ bảo trì, lá chắn "chỉ một người dùng" biến mất — nên đây là lúc hợp lý nhất để hỏi lại chủ dự án có muốn dựng môi trường thử không, thay vì chờ tới khi có migration chạm tiền tiếp theo.
