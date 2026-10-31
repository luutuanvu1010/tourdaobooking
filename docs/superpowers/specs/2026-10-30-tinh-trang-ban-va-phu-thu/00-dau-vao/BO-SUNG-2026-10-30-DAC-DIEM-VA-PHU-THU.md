# Bổ sung 30/10 (lượt 2) — Đặc điểm dịch vụ và Phụ thu mùa vụ

> Trỏ về `QUYET-DINH-CHU-2026-10-30-TINH-TRANG-BAN-VA-GIA-MUA.md` và `DE-XUAT-KHA-DUNG-VA-GIA-THEO-MUA-2026-10-30.md`. **Chưa phải ADR.**

## 1. Lời chủ (nguyên văn)

> «1: Khác nhau, Bao gồm và không bao gồm vận chuyển là : Trên thực tế, có những vé du lịch tham quan đảo Hòn Tằm đã bao gồm vận chuyển từ cảng ra đến đảo , có những vé du lịch tham quan đảo Hòn Tằm không gồm vận chuyển từ cảng ra đến đảo. Còn Đón hay không đón là: Đưa /đón 01 chiều và/hoặc 02 chiều từ khách sạn của khách du lịch đến Cảng (Vinpearl hoặc Bến Tàu du lịch Nha Trang) , 2- Phụ thu mùa vụ (seasonal pricing) theo 02 cách : giá tiền trên dịch vụ hoặc phần trăm trên dịch vụ.»

> Lượt trước: «ở đây chúng ta cố gắng coi logic nghiệp vụ là dữ liệu … không được khóa cứng trong code (tôi cực kỳ tán thành)».

## 2. Hệ quả 1 — cần "Đặc điểm dịch vụ" là dữ liệu

| Khái niệm | Nghĩa | Hiện trạng |
|---|---|---|
| **Đưa đón** | Khách sạn ↔ cảng (Vinpearl / Bến tàu du lịch Nha Trang), 1 hoặc 2 chiều | Có (ADR-0118, ADR-0149) |
| **Vận chuyển cảng ↔ đảo** | Vé đã gồm tàu/cano ra đảo hay chưa | **Chưa có.** Không được dùng lẫn với "đưa đón" |

**Đề xuất: khung "Đặc điểm dịch vụ"** (kiểu flexfield của Oracle), quản lý hoàn toàn trên bảng điều khiển:

- Quản trị **tự định nghĩa đặc điểm** kèm danh sách giá trị. Ví dụ: "Vận chuyển cảng–đảo" = {Gồm, Không gồm}. Đặc điểm sau này như "Buffet" = {Có, Không} cũng thêm được mà **không sửa mã**.
- Gắn giá trị cho từng dịch vụ, hoặc gắn cho cả nhóm rồi dịch vụ ghi đè (riêng thắng chung, giống đưa đón).
- **Dịch vụ chưa khai đặc điểm** thì không bị luật theo đặc điểm phủ. Bảng điều khiển hiện danh sách "Dịch vụ mới chưa khai đặc điểm" sau mỗi lần đồng bộ Sheet, để không ai quên.
- Chỉ thêm dòng, có hiệu lực theo thời gian, có nhật ký.

**Luật chặn theo loại đối tác (ADR-0146) thêm một phạm vi:**

> Nhóm "Hòn Tằm" (tuỳ chọn) **và** đặc điểm "Vận chuyển cảng–đảo = Không gồm" → **chặn** loại Lễ tân khách sạn, Tài xế taxi.

Vé mới chỉ cần khai "Không gồm" là tự bị chặn. Phạm vi theo dịch vụ, theo nhóm của ADR-0146 vẫn giữ.

**Lượt duyệt (sửa ADR-0146, chưa xây):** 3 điều. (1) bảng đặc điểm và giá trị gắn cho dịch vụ; (2) phạm vi luật theo đặc điểm, kết hợp được với nhóm; (3) quyền quản đặc điểm. Vừa đúng trần 3.

## 3. Hệ quả 2 — phụ thu mùa vụ là **dòng cộng thêm**, giá gốc không đổi

Chủ chọn hai cách: **số tiền** hoặc **phần trăm** trên dịch vụ. Bỏ kiểu "giá mới hẳn" của bản trước (G2 cũ).

**Đề xuất mô hình:**

- Dòng phụ thu: *áp cho* dịch vụ hoặc nhóm (dịch vụ thắng nhóm) · *khi* ngày đi ∈ mùa · *thì* cộng **số tiền** hoặc **% của giá gốc**. Có thể thêm điều kiện loại đối tác của bên đặt.
- Máy chủ tự sinh dòng "Phụ thu [tên mùa]" trên đơn. **Không ai sửa tay được**, kể cả Đối tác; chụp vào đơn lúc xác nhận.
- Hai mùa chồng nhau: chỉ áp **một** phụ thu, mùa ưu tiên cao hơn thắng; không cộng dồn.

**Hệ quả lớn:** giá bán lẻ gốc **không đổi**, nên các mức hoa hồng tiền và giá đại lý vẫn khớp với giá ghi kèm. **Bẫy "giá bán lẻ đã đổi → đơn bị giữ hàng loạt" (ADR-0148 Đ3) biến mất.** Lượt "hoa hồng theo mùa" không còn bắt buộc phải chạy trước mùa lễ; nó trở thành tuỳ chọn.

## 4. Câu hỏi còn lại

| # | Câu | Khuyến nghị |
|---|---|---|
| P1 | Đối tác có được **hoa hồng trên phần phụ thu** không? | **Không**: hoa hồng chỉ tính trên giá gốc; phụ thu thuộc về công ty. Nếu chọn "có", lượt hoa hồng mùa lại thành bắt buộc |
| P2 | Phụ thu bằng **số tiền**: tính mỗi khách hay một lần cho cả dòng dịch vụ? | Mỗi khách, chia theo loại khách (người lớn / trẻ em / người cao tuổi; em bé 0), giống cách chiết khấu theo loại khách |
| P3 | Phụ thu **phần trăm**: làm tròn thế nào? | Làm tròn lên tới 1.000 ₫ mỗi khách, cho giá dễ đọc với khách |
| P4 | Có cần phụ thu khác nhau theo loại đối tác (ví dụ miễn hoặc giảm phụ thu cho Công ty lữ hành)? | Mô hình hỗ trợ sẵn; mặc định áp như nhau cho mọi bên đặt |
| P5 | Đặc điểm dịch vụ khai ở đâu? | Trên bảng điều khiển của Nền tảng, kèm danh sách "chưa khai" sau mỗi lần đồng bộ Sheet. Phương án khác: thêm cột trong Sheet; tiện lúc tạo vé nhưng Sheet sẽ phình dần theo từng đặc điểm |
| P6 | Ai quản đặc điểm dịch vụ? | Quản trị, Toàn quyền định nghĩa đặc điểm; Bán hàng được gắn giá trị cho dịch vụ |
