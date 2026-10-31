# Quyết định của chủ dự án — lượt 3, ngày 30/10/2026: phụ thu mùa vụ và đặc điểm dịch vụ

> Bản ghi quyết định có ngày. Không sửa; có gì mới thì viết tệp mới trỏ về tệp này.
> Trỏ về: `QUYET-DINH-CHU-2026-10-30-TINH-TRANG-BAN-VA-GIA-MUA.md` và `BO-SUNG-2026-10-30-DAC-DIEM-VA-PHU-THU.md`.

## Lời chủ (nguyên văn)

Lượt 1: «xem lại chỗ "Chặn hòn tằm" là thế nào? , ở đây chúng ta cố gắng coi logic nghiệp vụ là dữ liệu nhé, tức phải nhập tay thủ công hoặc biến nó thành tùy chọn /thao tác trong bảng điều khiển chứ không được khóa cứng trong code (tôi cực kỳ tán thành ) . ngoài ra tôi cơ bản đồng ý theo khuyến nghị của bạn.»

Lượt 2: «1: Khác nhau, Bao gồm và không bao gồm vận chuyển là : Trên thực tế, có những vé du lịch tham quan đảo Hòn Tằm đã bao gồm vận chuyển từ cảng ra đến đảo , có những vé du lịch tham quan đảo Hòn Tằm không gồm vận chuyển từ cảng ra đến đảo. Còn Đón hay không đón là: Đưa /đón 01 chiều và/hoặc 02 chiều từ khách sạn của khách du lịch đến Cảng (Vinpearl hoặc Bến Tàu du lịch Nha Trang) , 2- Phụ thu mùa vụ (seasonal pricing) theo 02 cách : giá tiền trên dịch vụ hoặc phần trăm trên dịch vụ.»

Lượt 3: «1- Đối tác không hưởng hoa hồng trên phụ thu. 2- Tùy theo , có dịch vụ phụ thu theo mỗi khách, có dịch vụ (ví dụ theo nhóm) thì phụ thu theo dịch vụ ví dụ như giá phòng khách sạn , 3- làm tròn lên tới 1,000đ, 4- Có cần phụ thu khác nhau theo loại đối tác, có đối tác sẽ được miễn phụ thu. 5- Trên bảng điều khiển của nền tảng. 6- như khuýen nghị. Tôi sẽ xác nhận các ca vàng tính tiền mẫu»

## Nguyên tắc chủ nêu (áp cho mọi thiết kế của chuỗi việc này)

**Logic nghiệp vụ là dữ liệu.** Mỗi quy tắc cụ thể phải nhập được trên bảng điều khiển, không được khoá cứng trong mã. Mã chỉ giữ ba thứ: bộ máy chung, tập loại điều kiện và hiệu ứng (đóng, đổi bằng ADR), và các rào an toàn (quyền, cách tính tiền, bất biến). Người ghi đã giải thích ranh giới này cho chủ ngày 30/10; chủ không phản đối.

## Đã chốt

| Mã | Quyết định |
|---|---|
| Đ-1 | «Vận chuyển cảng ↔ đảo» (vé gồm tàu/cano ra đảo) **khác** «đưa đón» (khách sạn ↔ cảng, 1 hoặc 2 chiều; ADR-0118, ADR-0149). Không được dùng lẫn |
| Đ-2 | Có khung **«Đặc điểm dịch vụ»**: Quản trị, Toàn quyền định nghĩa đặc điểm và danh sách giá trị; **Bán hàng gắn được giá trị** cho dịch vụ (P6). Khai **trên bảng điều khiển** (P5), không thêm cột Google Sheet. Có danh sách «dịch vụ chưa khai đặc điểm» |
| Đ-3 | Luật chặn theo loại đối tác (ADR-0146, chưa xây) **thêm phạm vi theo đặc điểm**, kết hợp được với nhóm. Ví dụ: nhóm Hòn Tằm + «Vận chuyển cảng–đảo = Không gồm» → chặn Lễ tân khách sạn, Tài xế taxi |
| P-1 | **Đối tác không hưởng hoa hồng trên phụ thu.** Hoa hồng và giá đại lý chỉ tính trên giá gốc |
| P-2 | Phụ thu tính **tuỳ dịch vụ**: (a) **mỗi khách**, hoặc (b) **theo dịch vụ** (mỗi đơn vị tính của dòng, ví dụ giá phòng khách sạn). Mỗi kiểu nhập được bằng **số tiền** hoặc **phần trăm** trên dịch vụ |
| P-3 | Phụ thu tính theo phần trăm: **làm tròn lên tới 1.000 ₫** |
| P-4 | **Phụ thu khác nhau theo loại đối tác**; có đối tác được **miễn** phụ thu |
| P-5 | Chủ dự án **tự xác nhận các ca vàng** tính tiền mẫu |
| Từ lượt trước | Phụ thu là **dòng cộng thêm**, giá gốc không đổi; máy chủ sinh dòng; không ai sửa tay; một mùa thắng (không cộng dồn); xác định theo **ngày đi**; dòng riêng trên biên nhận |

## Giả định của người ghi (chủ sửa nếu sai; không chặn việc soạn)

- **GĐ-1 (P-4):** «miễn / khác nhau theo đối tác» đặt được ở hai mức: **theo loại đối tác** và **theo từng hồ sơ đối tác cụ thể**. Dòng riêng của hồ sơ thắng dòng của loại, giống thứ tự chọn mức hoa hồng. Xét theo **bên đặt** của đơn; văn phòng đặt hộ cũng được miễn. Lý do: lời chủ nói cả «loại đối tác» lẫn «có đối tác». Theo ADR-0001 mục 4, dùng vai làm đầu vào của quy tắc giá được phép; đây không phải luật chặn người.
- **GĐ-2 (P-2):** phụ thu mỗi khách chia theo loại khách (người lớn / trẻ em / người cao tuổi; em bé 0), như ADR-0133. Phụ thu theo dịch vụ nhân với **số lượng của dòng** (dòng đơn đã có `quantity × unit_price`).
- **GĐ-3 (P-3):** phụ thu phần trăm làm tròn **theo từng đơn vị tính** (mỗi khách hoặc mỗi đơn vị), rồi mới nhân số lượng.
- **GĐ-4:** phụ thu là tiền khách nợ công ty, nằm trong tổng đơn và «Còn thu»; toàn bộ thuộc công ty trong sổ công nợ với đối tác (theo P-1). Cách ghi sổ cụ thể phải qua ca vàng chủ xác nhận.

## Thứ tự làm (theo khuyến nghị chủ đã đồng ý)

1. **Lượt A** — sửa ADR-0146: đặc điểm dịch vụ + phạm vi theo đặc điểm (3 điều chạm quyền/dữ liệu). Sau khi duyệt: kế hoạch thi công ADR-0146 kèm phần sửa.
2. **Lượt B** — Đóng bán (3 điều).
3. **Lượt C** — Lịch mùa + điều kiện theo mùa / thứ trong tuần / đặt trước tối thiểu cho khả dụng.
4. **Lượt D** — Phụ thu mùa vụ (tiền), kèm ca vàng chủ xác nhận trước khi bật.
5. Hoa hồng theo mùa: **tuỳ chọn, để sau** (P-1 làm nó hết bắt buộc).

Không lượt nào ở trên là lệnh triển khai lên production.
