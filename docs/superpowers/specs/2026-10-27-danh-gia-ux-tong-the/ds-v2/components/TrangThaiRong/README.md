Trạng thái rỗng: một biểu tượng, một câu, và **một** nút việc tiếp theo — gộp 20 lớp rỗng của mã (H-TAI-RONG). Cùng khuôn `.rong` cho «chưa có gì», «không khớp bộ lọc», và trang lỗi chung (không quyền 403, không tìm thấy 404, thiếu mã).

## Khi nào dùng
- Danh sách chưa có dữ liệu: «Chưa có đơn nào» + «+ Tạo đơn» (nếu vai được tạo).
- Không khớp tìm/lọc: «Không có đơn nào khớp» + «Xoá lọc».
- Không quyền / không có trang / thiếu mã (H-403, H-404, C-CHI-TIET-THIEU-MA): **một trang chung** vỏ đầy đủ (thanh trên, thanh tab sáng mục cha) + `.rong` với «Về trang đầu». Không dựng nguyên vỏ trang bị cấm rồi gắn hộp đỏ.
- Mất mạng không dùng rỗng mà dùng DaiTren tông `mat-mang` + nội dung lần xem gần nhất; chỉ khi chưa có bản nào mới rỗng với «Thử lại».

## Trạng thái
Ba biến thể theo nguyên nhân: chưa có dữ liệu · không khớp lọc · lỗi trang (403/404/thiếu mã); mỗi biến thể một biểu tượng và một nút. Không có trạng thái rê chuột hay tắt.

Cấu tạo: Biểu tượng 48 nét 1,5 màu `c-text-muted` (`orders`, `search`, `lock`, `alert`) · tiêu đề 18/600 · câu 14 `c-text-muted` nói chuyện gì và làm gì tiếp · một nút (chính nếu là việc chính của vai, phụ nếu là «Xoá lọc»/«Về trang đầu»). Rộng tối đa `w-narrow` 420, căn giữa, đệm `s6`.

## Người dùng truyền gì
Biểu tượng, tiêu đề, câu, nhãn + đích của nút; vai hiện tại (để ẩn nút tạo khi không có quyền — nút ẩn, không tắt).

## Đừng
Không hai nút; không ảnh minh hoạ; không câu kỹ thuật («not_found»); không JSON thô.
