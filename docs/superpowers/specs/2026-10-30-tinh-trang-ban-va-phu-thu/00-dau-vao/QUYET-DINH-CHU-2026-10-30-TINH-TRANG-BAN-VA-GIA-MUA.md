# Quyết định của chủ dự án — Tình trạng bán, khả dụng và giá theo mùa (30/10/2026)

> Bản ghi quyết định có ngày, người lập kế hoạch ghi lại. Không sửa; có gì mới thì viết tệp mới trỏ về tệp này.

## Lời chủ (nguyên văn)

«ok chốt , bạn có muốn hỏi thêm gì cho tôi hay không hoặc những lưu ý nào hay không»

## Cách người ghi hiểu chữ «chốt»

Chủ **chấp nhận mọi khuyến nghị** đang mở trong ba tệp gửi chủ ngày 30/10:

- `PHIEU-CHOT-TINH-TRANG-BAN-2026-10-30.md`
- `DE-XUAT-TINH-TRANG-BAN-DICH-VU-2026-10-30.md`
- `DE-XUAT-KHA-DUNG-VA-GIA-THEO-MUA-2026-10-30.md`

Nếu cách hiểu này sai ở điểm nào, chủ sửa điểm đó; các điểm còn lại giữ nguyên.

| Mã | Đã chốt |
|---|---|
| A1 | Thi công ADR-0146 (chặn bán theo loại đối tác). Đây là ADR đã duyệt ngày 28/10, không cần quyết lại |
| A2 | Chủ chạy hai lệnh đếm chỉ đọc **trước khi phát hành** ADR-0146 |
| A3 | Danh sách vé Hòn Tằm và loại đối tác bị chặn gửi sau, nhập trên màn hình |
| B1 | «Hết sau X giờ»: người đóng chọn mọi ngày đi hay chỉ hôm nay; mặc định **chỉ hôm nay** |
| B2 | Bán hàng chỉ **đóng** được; **mở lại** do Quản trị, Toàn quyền |
| B3 | Không ai bán vượt khi dịch vụ đang đóng |
| B4 | Đơn chờ xác nhận gặp dịch vụ đang đóng thì không cho bấm «Còn vé» |
| B5 | Đối tác thấy dịch vụ đang đóng ở dạng mờ, kèm nhãn «Tạm ngừng bán» |
| B6 | Báo cho người có nháp hoặc đơn chờ xác nhận chứa dịch vụ bị đóng |
| B7 | Lý do đóng là bắt buộc |
| L1 | Có hai lớp: ngày lễ theo luật và mùa kinh doanh công ty tự đặt |
| L2 | Ngày lễ theo lịch Nhà nước công bố hằng năm; Nền tảng gợi ý trước, Quản trị xác nhận |
| L3 | Quản trị, Toàn quyền quản lịch mùa |
| K1 | Lượt khả dụng có thêm: thứ trong tuần, đặt trước tối thiểu, khung bán theo mùa. Số khách tối thiểu/tối đa để sau |
| G1 | Giá mùa nhập trên Nền tảng; Google Sheet giữ giá thường |
| G2 | Có hai kiểu: giá mới (theo dịch vụ) và phụ thu % / số tiền mỗi khách (theo nhóm) |
| G3 | Mùa xác định theo **ngày đi** |
| G4 | Đơn đã xác nhận đổi ngày sang mùa khác: giữ giá cũ, báo người đổi |
| G5 | Phụ thu lễ là một dòng riêng trên biên nhận |
| G6 | Kế toán, Quản trị, Toàn quyền đặt giá mùa |
| H1 | Không có giá bán lẻ riêng theo loại đối tác; phần khác nhau giữa các loại nằm ở hoa hồng |
| H2 | Hoa hồng phần trăm giữ nguyên trong mùa; mức tiền / giá đại lý bắt buộc có dòng theo mùa |
| Lộ trình | Ngay: ADR-0146 → lượt khả dụng (không chạm tiền) → lượt giá mùa → lượt hoa hồng mùa. Lượt hoa hồng mùa phải bật **cùng hoặc trước** khi giá mùa có hiệu lực cho một mùa thật |

## Còn mở sau lượt chốt này

1. Lượt khả dụng có tách làm hai lượt duyệt để không vượt trần 3 quyết định (`CLAUDE.md` §9) hay không. Khuyến nghị: tách. Lượt 1a là Đóng bán; lượt 1b là Lịch mùa cùng các điều kiện theo mùa, thứ trong tuần, đặt trước tối thiểu.
2. Hiện nay phụ thu Tết đang được làm thế nào. Cần biết để thiết kế đường chuyển tiếp và tránh bẫy ADR-0148 Đ3.
3. Người Kế toán nào xác nhận bộ ca mẫu tiền (bắt buộc trước khi bật lượt giá mùa và lượt hoa hồng mùa), và đã có bảng giá Tết 2027 mẫu chưa.

## Không thay đổi

- Phê duyệt từng ADR mới vẫn theo quy trình: đề xuất ADR → chủ duyệt → kế hoạch → thi công → kiểm độc lập → chủ tự chạy lệnh phát hành.
- Lượt chốt này **không** là lệnh triển khai lên production.
