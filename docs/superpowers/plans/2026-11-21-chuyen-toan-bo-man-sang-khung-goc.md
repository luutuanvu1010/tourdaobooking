# Kế hoạch chuyển toàn bộ màn hình sang khung gốc (21/11/2026)

> **Đề xuất, chờ chủ dự án duyệt.** Luật: ADR-0222 Đ8 (chuyển từng họ màn, mỗi họ một lượt duyệt ảnh, một lượt kiểm độc lập, rồi hạ trần). Thứ tự theo bước 3 của kế hoạch 13/11 (`2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md` mục 5): màn nhiều người dùng trước.
> Lời chủ 21/11: «rà soát lại xem tất cả có bao nhiêu màn hình, và ép tất cả màn hình đều phải về chung 1 khuôn».

## 1. Có bao nhiêu màn

- **65 trang** (tệp `public/*.html`). Tính theo «trang × vai người dùng» thì là **87 màn** (một trang như Đơn hàng hiện khác nhau cho Bán hàng, Kế toán, Đối tác…; bảng ở `docs/superpowers/specs/2026-11-21-khung-goc-giao-dien/SO-LIEU.md` mục 6).
- **Đã theo khung: 4 trang** (Đơn hàng, Chi tiết đơn, Sửa xe, Địa điểm). **Còn 61 trang**, chia thành 8 đợt dưới đây; máy đối chiếu đủ 61, không sót, không trùng.
- Trong 61 trang có **2 trang chỉ chuyển hướng** (không có giao diện) và **3 khuôn chưa có hình duyệt** (Tổng quan, Trang đọc, Trạng thái): lần đầu dùng khuôn đó, chủ duyệt hình bằng ảnh như bốn màn mẫu.

## 2. Tám đợt

| Đợt | Họ màn | Số trang | Việc lớn? | Ghi chú |
|---|---|---|---|---|
| A | Đơn hàng còn lại: Tạo / Sửa đơn, Đơn chờ xác nhận | 2 | không | Tạo đơn là màn dài nhất (bốn bước); làm ngay sau bốn màn mẫu để họ Đơn hàng xong trọn |
| B | Tài xế và Vận chuyển | 15 | không | Lần đầu dùng khuôn **Tổng quan** (Cuốc của tôi, Xe đang chạy, Điều phối xe); dòng thời gian Điều phối xe là ngoại lệ có sẵn. Có thể tách B1 (tài xế, 5 trang) và B2 (văn phòng, 10 trang) |
| C | Tiền: Sổ công nợ, Hoa hồng, Khoá sổ, Hạn mức… | 10 | **có** (hiển thị tiền) | Người kiểm độc lập bắt buộc. Có 3 trang đang khai lệch bề rộng (Phân định, Khoá sổ tháng, Hoa hồng) |
| D1 | Người và tài khoản: Quản lý tài khoản, Danh bạ, Máy đăng nhập, Phiếu đăng ký, Nhật ký, Gửi thông báo | 6 | không | 3 trang khai lệch bề rộng |
| D2 | Danh mục và vé: Dịch vụ, Luật bán, Đặc điểm, Phí đưa đón, Vé điện tử, Đối chiếu vé, Cài đặt vé | 7 | không | Dịch vụ khai lệch bề rộng |
| D3 | Thiết lập hệ thống và vận chuyển: Thiết lập, Loại giấy tờ, Lý do / Chính sách / Điều kiện điều phối, Giao diện, Trợ lý | 8 | không | Toàn khuôn **Thiết lập** (đã có mẫu Địa điểm) nên nhanh nhất; Trợ lý khai lệch bề rộng |
| E | Của tôi, Tổ chức, Đăng ký đối tác, Hỗ trợ, Hướng dẫn, Nhật ký thay đổi, Quét vé | 7 | không | Lần đầu dùng khuôn **Trang đọc**; màn đối tác bên ngoài thấy; Hướng dẫn khai lệch bề rộng; ảnh trong Hướng dẫn phải chụp lại |
| F | Trang chủ, Đăng nhập, Không có trang, Ngoài mạng, 2 trang chuyển hướng | 6 | không | Lần đầu dùng khuôn **Trạng thái**; Trang chủ và Đăng nhập giữ bản vẽ riêng (ngoại lệ có sẵn) |

Danh sách đủ 61 trang theo đợt ở mục 5.

## 3. Mỗi đợt làm gì (giống đợt bốn màn mẫu)

1. Chụp ảnh hiện tại, làm ảnh đề xuất bằng lớp tiêm tạm (chưa sửa mã), gửi chủ duyệt. Trang khai lệch bề rộng: ảnh có cả hai phương án.
2. Chủ duyệt hình → thi công trên bản làm việc riêng: khai khuôn, dựng bằng hàm của khung, gỡ kiểu cũ không còn dùng.
3. Máy kiểm: ảnh trang thật trùng ảnh đã duyệt; `npm run do-khung` quét 360–1.920; bài kiểm xanh; **hạ trần** năm con số.
4. Người chấm giao diện + người kiểm độc lập; sửa kịch bản bấm thử của họ màn đó; chạy bộ kiểm trọn.
5. Chủ nhập bản chính và triển khai. Mỗi đợt một phiên riêng; hai đợt cùng sửa một tệp thì làm nối tiếp.

## 4. Khi xong cả tám đợt

- Danh sách «chưa chuyển» rỗng ⇒ đổi bài kiểm thành: **mọi** trang phải khai khuôn, không còn ngoại lệ «chưa chuyển». Lúc đó trần của trang chưa chuyển là 0 vĩnh viễn.
- Hạ tiếp các trần còn lại tới mức chỉ còn kiểu của ngoại lệ có tên.
- Lớp kiểu cũ (`.btn`, `.card`, `.badge`) gỡ hẳn khỏi tệp kiểu (ADR-0222 Đ4).

## 5. Phụ lục: 61 trang theo đợt (tên tệp trong `public/`)

- **A (2):** order-form, cho-xac-nhan
- **B (15):** tai-xe, cuoc, cuoc-chuyen, ban, dieu-phoi, xe-dang-chay, chuyen, chuyen-sua, de-nghi, xe, xe-chi-tiet, lich-xe-ban, giay-to-sap-het-han, bang-ke-xe, bang-gia-xe
- **C (10):** so-cong-no, phan-dinh, khoa-thang, dieu-chinh-cong-no, chup-bu, hoa-hong, cap-dai-ly, han-muc-tra-sau, nguoi-ban, hoa-hong-gioi-han
- **D1 (6):** staff, parties, sessions, phieu-dang-ky, audit, gui-thong-bao
- **D2 (7):** catalog, luat-ban, dac-diem-dich-vu, phi-don, ve-kho, ve-doi-chieu, ve-cai-dat
- **D3 (8):** thiet-lap, loai-giay-to-nguoi, loai-giay-to-xe, ly-do-dieu-phoi, chinh-sach-dieu-phoi, dieu-kien-xuat-ben, giao-dien, tro-ly-cai-dat
- **E (7):** account, to-chuc, dang-ky, feedback, huong-dan, help, quet-ve
- **F (6):** 404, ngoai-mang, index, login, home, danh-muc-giay-to

## 6. Ba điều cần chủ quyết

1. **Thứ tự:** A → B → C → D3 → D1 → D2 → E → F (khuyến nghị: theo số người dùng như 13/11, nhưng đưa D3 lên sớm vì toàn khuôn đã có mẫu, nhanh). Hay giữ đúng A → B → C → D → E → F.
2. **Lệnh đo trên trang thật vào lượt kiểm GitHub:** có (khuyến nghị; mỗi lần nhập chậm thêm vài phút, đổi lại màn đã chuyển không thể vỡ bố cục mà không ai biết) hay để chạy tay như hiện nay.
3. **Chạy song song:** mỗi lúc một đợt (khuyến nghị; bạn duyệt ảnh từng đợt, ít rủi ro chồng tệp) hay hai đợt không chung tệp cùng lúc (nhanh hơn, bạn duyệt hai bộ ảnh một lúc).
