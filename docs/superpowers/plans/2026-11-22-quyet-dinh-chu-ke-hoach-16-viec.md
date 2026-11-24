# Quyết định của chủ dự án về kế hoạch 16 việc (22/11/2026)

> **Loại tệp:** hồ sơ có ngày — ghi nguyên văn lời chủ, đóng băng. Kế hoạch gốc: `2026-11-21-ke-hoach-16-viec.md` (cùng thư mục).
> **Nguồn:** chủ trả lời trong phiên điều phối 22/11/2026, đáp lượt câu hỏi gồm sổ hạn, duyệt ADR theo lượt, việc 8, 11, 13, 1.

## Nguyên văn

> «1- Đồng ý khuyến nghị, và bỏ qua việc diễn tập khôi phục dữ liệu - ghi quyết định. 2- Duyệt đề xuất, 3- Tên 3 công tắc mới: hãy đặt theo đúng bản chất, ngắn gọn và dễ hiểu. b- miễn (đặt tùy chọn miễn này có thể bật/tắt trong bảng điều khiển của Super Admin), c- chờ văn phòng, mục đích của việc này là cho đơn được hoàn tất ở màn của đối tác, không bị nghẽn. d- để sau. 4- ok. Tuy nhiên cần đổi tên nút "Trả với hướng dẫn viên" thành tên khác, đề xuất: Trả lúc check-in, 5- Theo đề xuất của bạn, cứ làm, không cần hỏi luật sư; mục đích là lưu bằng chứng công việc. 6- Ok đề xuất dùng địa chỉ demo.tourdao.vn; 7 - đã chạy»

## Cách đọc (người điều phối ghi, chủ bác được)

1. **Sổ hạn:** theo khuyến nghị — gia hạn HC-4.2 có ghi lý do; HC-5.19 (diễn tập khôi phục dữ liệu): chủ **chấp nhận rủi ro, không diễn tập**, mỗi bảng mới vẫn cần dòng «xây trên chỗ hở» trong sổ. Rủi ro được nói một lần ngày 22/11: chưa từng thử khôi phục thật, nên nếu dữ liệu hỏng thì chưa biết khôi phục mất bao lâu, đủ hay không.
2. **Duyệt đề xuất:** các ADR 0223, 0224, 0225, 0226, 0227, 0228, 0229, 0230, 0231, 0232, 0233 theo bốn lượt đã trình; kèm nới trần gói trang Đơn hàng 147 byte cho việc 6.
3. **Việc 8:** tên ba công tắc do người thi công đặt theo bản chất (tra `docs/BANG-THAM-CHIEU.md`). Câu (b): miễn «đủ tên khách trước khi xe chạy» cho đơn đối tác, thành **một công tắc riêng** Toàn quyền bật/tắt; **mặc định Bật (miễn)** — điều này suy từ «miễn» và mục đích «đơn không bị nghẽn», đây là giả định. (c): lượt đón sát hạn chốt vẫn chờ văn phòng. (d): để sau.
4. **Việc 11:** cách B (dùng lại dấu «Trả sau theo dịch vụ»). Tên hình thức: «Trả lúc check-in». Danh sách mở vé đầu tiên chủ chưa nêu — giả định: cấu hình được bằng dữ liệu, gieo sẵn dịch vụ «Tour 3 đảo» (ví dụ chủ nêu ngày 21/11).
5. **Việc 13:** theo đề xuất, tên «Ảnh bàn giao», không lấy GPS; **không chờ luật sư**; mục đích lưu bằng chứng công việc. Giữ nguyên đường xoá theo yêu cầu của người trong ảnh trong ADR (luật bảo vệ dữ liệu cá nhân và Hiến chương 5.24 không bị quyết định này bỏ qua) và chính sách riêng tư phiên bản mới (5.21).
6. **Việc 1:** địa chỉ `demo.tourdao.vn` (thay `thu.tourdao.vn` mà phiên đề xuất); khoá/mở trên bản dùng thử; chấp nhận chi phí.
7. Chủ đã chạy các lệnh nhập/triển khai được giao ở lượt trước. Kiểm 06:38 22/11: bản chạy thật 3.26 (có việc 4); nhánh việc 3 chưa vào bản chính.
