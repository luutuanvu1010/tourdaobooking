# Hai đề xuất cho chủ duyệt: điều chỉnh sổ tiền cần người thứ hai, và hoàn tiền sau "Đã giao"

> Soạn ngày 13/10/2026 trên mốc `483b3aa0` (bản 1.90). Đây là **bản đề xuất**, chưa ai duyệt, chưa có người kiểm độc lập đọc. Người soạn không tự duyệt (Hiến pháp N3). Hồ sơ có ngày: viết xong là đóng băng; có gì mới thì viết bản mới trỏ về bản này.

**Tóm lại.** Hôm nay hệ thống còn hai chỗ hở về tiền mà sổ hạn 31/10 đang ghi. Chỗ thứ nhất: một Kế toán (hoặc Toàn quyền) tự sửa số dư công nợ của một đơn bằng một lệnh, không ai khác phải đồng ý, và hai lệnh cùng chiều có thể cộng lại vượt mức cho phép. Chỗ thứ hai: sau khi đơn "Đã giao", nếu khách đòi hoàn hoặc Kế toán ghi nhầm mà không đòi lại được tiền, hệ thống chặn hoàn hẳn và không có đường nào khác. Hai tệp kèm theo đề xuất cách vá tối thiểu cho từng chỗ; **bạn chỉ cần chọn ba điều dưới đây**, mọi chi tiết còn lại tôi đã áp theo khuyến nghị và liệt kê trong từng tệp để bạn bác điểm nào thì bác.

## Ba quyết định cần bạn chọn

**1. Ai được bấm "duyệt" một lệnh điều chỉnh sổ tiền?** (số hiệu ADR đề xuất: 0115)
- A (khuyến nghị): Toàn quyền, Quản trị hoặc Kế toán đều duyệt được, miễn là khác người tạo lệnh. Công ty chỉ có một Kế toán và một chủ vẫn chạy được, vì hai người duyệt chéo cho nhau.
- B: Chỉ Toàn quyền và Quản trị duyệt (giống hoàn cọc). Nếu chủ tự tạo lệnh mà chưa có Quản trị thì không ai duyệt được.
- C: Chỉ Toàn quyền duyệt. Chặt nhất, nhưng mọi việc dồn vào một người; chủ đi vắng thì đứng.

**2. Luật "người thứ hai duyệt" áp cho những lệnh nào?** (0115)
- A (khuyến nghị): Lệnh điều chỉnh công nợ **và** lệnh điều chỉnh chi phí chuyến xe, làm thành hai đợt thi công nối nhau. Sổ hạn 31/10 ghi cả hai nơi.
- B: Chỉ công nợ trước; chi phí chuyến để sau, và phải xin gia hạn phần còn lại sau 31/10.
- C: Thêm cả lệnh đảo lần thu, đảo dòng sổ và "Thay lần thu". Tôi không khuyến nghị: ba lệnh này sinh dòng từ một dòng gốc có sẵn theo luật cố định, không cho gõ số tuỳ ý, và đã có lý do bắt buộc cùng tin báo.

**3. Ai được đề nghị "phân định trách nhiệm" cho một đơn đã giao?** (0116; bảng T1–T11 và việc Quản trị/Toàn quyền quyết bạn đã duyệt từ 2–3/10, không hỏi lại)
- A (khuyến nghị): Kế toán, Quản trị hoặc Toàn quyền đều đề nghị được, vì Kế toán là người thấy sai sót đầu tiên; Quản trị hoặc Toàn quyền quyết; Kế toán hoặc Toàn quyền ghi sổ.
- B: Chỉ Quản trị và Toàn quyền vừa đề nghị vừa quyết. Ít người hơn nhưng Kế toán phải báo miệng.
- C: Thêm hướng dẫn viên phụ trách đơn. Tôi không khuyến nghị vì thêm phạm vi.

## Áp theo khuyến nghị nếu bạn không nói gì

Lệnh chờ duyệt quá 7 ngày thì tự hết hạn (không tự duyệt). Số dư chỉ đổi sau khi duyệt. Mức trần điều chỉnh tính cộng dồn cả lệnh đã có lẫn lệnh đang chờ. Phân định trách nhiệm không đặt hạn chặn, chỉ nhắc khi đơn đã giao quá 60 ngày mà chưa xử lý. Tiền hoàn cho khách không bao giờ vượt số khách đã trả cho đơn đó. Phần "trừ vào hoa hồng đại lý" (trường hợp T9) chưa làm vì sổ đại lý đợt 2 chưa mở; khoản đó tạm ghi thành nợ của đại lý với công ty.

## Điều bạn nên biết trước khi chọn

- **Rủi ro vận hành lớn nhất:** sau khi duyệt hai người, Kế toán không còn "sửa xong ngay" được. Chủ đi vắng và không có người duyệt thứ hai thì lệnh đứng, số dư vẫn giữ nguyên cho tới khi có người duyệt hoặc lệnh hết hạn. Phương án A ở quyết định 1 giảm rủi ro này vì cho Kế toán và Quản trị cùng duyệt.
- **Ngưỡng "dưới X thì tự duyệt" tôi không đưa vào làm phương án.** Hiến chương hệ thống (4.2) đòi bút toán do người lập phải có người duyệt, và dự án không được nới ba văn bản nền. Muốn ngưỡng thì phải xin sửa ở kho luật gốc, không phải ở đây. Ngoài ra ví dụ trong báo cáo kiểm (một lệnh 300.000) có thể vẫn lọt dưới ngưỡng, và chia nhỏ lệnh là cách lách quen thuộc.
- **Số hiệu ADR:** 0115 và 0116. Cách tính: tệp lớn nhất trong thư mục quyết định hôm nay là 0113; số 0114 đã có bản đề xuất "sửa số khách" chờ bạn duyệt (chưa có tệp, chỉ nằm trong thư mục đặc tả); tôi tìm trong mọi nhánh và mọi worktree thì không thấy chỗ nào dùng 0115 hay 0116. Tôi **không giữ chỗ được** trong mục lục ADR (không được sửa `docs/adr/`), nên phiên khác vẫn có thể lấy mất hai số này; ai duyệt thì kiểm lại.
- **Lượt duyệt:** bảng việc cấu trúc đã xếp A1–A3 vào một lượt, mỗi lượt tối đa ba quyết định chạm tiền hoặc dữ liệu. Ba quyết định ở đây nên là **một lượt riêng**, sau lượt đó.
- **Hai đề xuất độc lập nhau về mã** nhưng cùng chạm bảng sổ tiền, nên mỗi tệp có phần "trang ghép". Phần phụ lục kỹ thuật của mỗi tệp dành cho người kiểm; bạn chỉ cần đọc phần đầu.

## Các tệp

- `de-xuat-hc-4-2.md` — ADR-0115: điều chỉnh sổ tiền cần người thứ hai duyệt, và sửa lỗi trần không cộng dồn (mã C-2 trong báo cáo kiểm).
- `de-xuat-adr-0088-d9.md` — ADR-0116: cách tối thiểu để phân định trách nhiệm và hoàn tiền sau "Đã giao" (thi hành điều 9 của ADR-0088).
