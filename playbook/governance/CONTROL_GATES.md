# CONTROL GATES — Cơ chế cổng kiểm soát (hiện thực hóa Điều 8)

> Đây là tầng thủ tục thực thi cho hai cổng trong hiến pháp: cổng trước thực thi và cổng trước phát hành. Hiến pháp nói "phải có cổng" và "mặc định từ chối"; file này nói "cổng chạy bằng gì". Vì là thủ tục, nó được phép cụ thể về công cụ, miễn không mâu thuẫn hiến pháp.

## Nguyên tắc nền (từ Điều 8)
- **Mặc định từ chối:** không có bằng chứng đạt thì coi như trượt. Im lặng là trượt.
- **Bằng chứng khó ngụy tạo hơn làm thật:** cổng đòi artifact chỉ tồn tại nếu đã thực sự tuân, không đòi lời tự khai.
- **Cổng sống trong CI, không sống trong văn bản:** một cổng là một bước kiểm tự động chặn merge, không phải một dòng nhắc nhở.

## Ba tầng, làm cả ba vì bắt lỗi khác nhau

### Tầng 1 — Kiểm máy đọc được (fitness functions)
Chạy như check bắt buộc trên mỗi pull request, fail thì chặn merge. Mỗi điều cấm máy hóa được thành một test:
- Quét giá trị giao diện hardcode ngoài nguồn token (ép N7, P6).
- Kiểm mọi bất biến dữ liệu, ví dụ trường định danh phải đúng định dạng đã tuyên bố (ép N5).
- Kiểm tồn tại bản ánh xạ giao diện và dữ liệu trước khi có sản phẩm thiết kế (ép N1).
- Validate cấu trúc dữ liệu và nội dung có cấu trúc (ép P13).

### Tầng 2 — Artifact bắt buộc trước khi merge
Dùng quy ước người sở hữu file và bảo vệ nhánh:
- Pull request thiếu artifact bắt buộc của bước đó thì bị chặn (thiếu bản ánh xạ, thiếu bản ghi quyết định cho một thay đổi kiến trúc).
- Con người duyệt phần khẩu vị mà máy không kiểm được; máy chặn phần máy kiểm được.

### Tầng 3 — Bằng chứng tác nhân tự sinh, máy kiểm lại
Trả lời trực tiếp nguy cơ AI khai gian:
- Tác nhân nộp kèm output một bản tự khai có cấu trúc: đã đụng bất biến nào, bằng chứng nào.
- Một script đối chiếu bản tự khai với thực tế repo. Nếu khai "không phá bất biến" mà script tìm thấy vi phạm, cổng fail.
- Chính sự lệch giữa lời khai và thực tế là tín hiệu báo động. AI nói dối được với câu chữ, không nói dối được với một test xanh hay đỏ.

## Ánh xạ vào hai cổng hiến pháp
- **Cổng trước thực thi:** tầng 2 (đủ artifact đầu vào) + kiểm prompt tham chiếu đúng, đủ ràng buộc.
- **Cổng trước phát hành:** tầng 1 (mọi fitness function xanh) + tầng 3 (bằng chứng tự khai khớp thực tế) + duyệt khẩu vị của con người.
