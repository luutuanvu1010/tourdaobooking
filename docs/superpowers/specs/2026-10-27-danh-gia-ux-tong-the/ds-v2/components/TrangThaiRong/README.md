Trạng thái rỗng: một biểu tượng, một câu, và **một** nút việc tiếp theo — gộp 20 lớp rỗng của mã (H-TAI-RONG). Cùng khuôn `.rong` cho «chưa có gì», «không khớp bộ lọc», và trang lỗi chung (không quyền 403, không tìm thấy 404, thiếu mã).

## Khi nào dùng
- Danh sách chưa có dữ liệu: «Chưa có đơn nào» + «+ Tạo đơn» (nếu vai được tạo).
- Không khớp tìm/lọc: «Không có đơn nào khớp» + «Xoá lọc».
- Không quyền / không có trang / thiếu mã (H-403, H-404, C-CHI-TIET-THIEU-MA): **một trang chung** vỏ đầy đủ (thanh trên, thanh tab sáng mục cha) + `.rong` với «Về trang đầu». Không dựng nguyên vỏ trang bị cấm rồi gắn hộp đỏ.
- Mất mạng không dùng rỗng mà dùng DaiTren tông `mat-mang` + nội dung lần xem gần nhất; chỉ khi chưa có bản nào mới rỗng với «Thử lại».

## Trạng thái
Ba biến thể theo nguyên nhân: chưa có dữ liệu · không khớp lọc · lỗi trang (403/404/thiếu mã); mỗi biến thể một biểu tượng và một nút. Không có trạng thái rê chuột hay tắt.

Cấu tạo (**diện mạo lấy từ Claude Design**, bảng gộp 28/10 dòng 23): **vòng tròn 56 nền `c-surface-alt`** chứa biểu tượng 24 màu `c-text-muted` (`orders`, `search`, `lock`, `alert`) · câu chính **16/500** `c-text` · câu phụ 14 `c-text-muted`, tối đa 36 ký tự mỗi dòng, nói làm gì tiếp · một nút (chính nếu là việc chính của vai, phụ nếu là «Xoá lọc»/«Về trang đầu»). Rộng tối đa `w-narrow` 420, căn giữa, đệm `s6` × `s4`. Trang lỗi trọn vỏ (403/404) dùng thành phần TrangLoi; trang mất mạng khi chưa có bản lưu dùng TrangMatMang.

## Người dùng truyền gì
Biểu tượng, tiêu đề, câu, nhãn + đích của nút; vai hiện tại (để ẩn nút tạo khi không có quyền — nút ẩn, không tắt).

## Đừng
Không hai nút; không ảnh minh hoạ; không câu kỹ thuật («not_found»); không JSON thô.
