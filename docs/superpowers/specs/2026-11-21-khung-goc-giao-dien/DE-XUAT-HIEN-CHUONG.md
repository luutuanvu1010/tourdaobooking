# Đề xuất thêm một điều vào Hiến chương — «Bố cục giao diện dựng từ một khung gốc» (21/11/2026)

> **Đề xuất, chờ chủ duyệt riêng.** ADR-0222 đã được chủ dự án duyệt 21/11/2026 (nguyên văn «oko duyệt»); lời đó chưa nói tới Hiến chương, nên điều này cần một lời duyệt của riêng nó. Hồ sơ có ngày: duyệt xong thì đóng băng.
> Hiến chương Phần I chỉ chủ dự án sửa (điều 6.4; Hiến pháp N9). Tệp này **không** sửa `docs/ARCHITECTURE.md`; nó chỉ nêu chữ đề xuất. Khi chủ duyệt, phiên thi công chép nguyên văn vào Phần I và ghi ngày, lý do ở dòng «Trạng thái» đầu tệp đó.
> Số điều `5.30` là số giữ chỗ: lấy số trống kế tiếp lúc chép, sau khi xem mọi nhánh (lúc soạn, điều mới nhất là 5.29).

## Vì sao cần một điều, không chỉ một ADR

ADR-0222 quyết cho đợt này. Điều Hiến chương nói cho mọi màn về sau: phiên nào dựng màn mới cũng tra Hiến chương trước, và chủ đã dặn lỗi lặp cùng loại thì thành luật chung kèm rào máy. Bố cục lệch giữa các màn là lỗi lặp: lưới 15/11 đã quản viền ngoài, còn bên trong mỗi màn vẫn tự đặt số.

## Chữ đề xuất (thêm vào Điều 5, sau 5.29)

**5.30 Bố cục giao diện dựng từ một khung gốc.** Mỗi màn thuộc **đúng một khuôn trang** trong một tập đóng (Danh sách, Chi tiết, Biểu mẫu, Thiết lập, Tổng quan, Trang đọc, Trạng thái), khai ở chính trang đó. Khuôn định sẵn các vùng, chỗ đặt nút chính ở máy tính và ở điện thoại, và mức bề rộng của trang. Bên trong trang chỉ có **một kiểu khối**, và bố cục trong khối chỉ dựng từ bộ có sẵn của khung (lưới cột, cặp nhãn và giá trị, bảng, danh sách dòng, thanh nút) với **số đo lấy từ một thang chung**; màn cần số mới thì sửa thang để mọi màn cùng hưởng, không đặt số riêng. Bố cục đổi theo **chỗ trống thật của vùng nội dung**, không theo bề rộng cửa sổ; cửa sổ chỉ có hai mốc của khung ngoài. Màn chỉ tuỳ biến qua bốn cửa: chọn khuôn, bật tắt vùng tuỳ chọn, chọn tham số trong thang, và **ngoại lệ có tên** ghi ở một sổ trong mã kèm lý do và ngày chủ dự án duyệt. Hình của khuôn và số của thang do chủ dự án duyệt **bằng ảnh thật**. Máy canh: trang không khai khuôn, mức bề rộng lệch khuôn, mục ngoại lệ thiếu lý do hay ngày duyệt thì không nhập được vào bản chính; phần chưa theo khung được đếm và **con số chỉ được giảm**. Nguồn: ADR-0222.

## Dòng đề xuất cho bảng thi hành

| Điều | Cưỡng chế bằng | Lệch hiện có (nợ có tên) | Nguồn |
|---|---|---|---|
| 5.30 Bố cục dựng từ một khung gốc | `src/khung-goc.test.ts` (trang không khai khuôn hoặc khai ngoài bảy tên; mức bề rộng lệch khuôn; sổ ngoại lệ thiếu lý do, ngày duyệt; phần khung của tệp kiểu chỉ áp cho trang đã khai khuôn, chỉ hai mốc cửa sổ và ba mốc vùng chứa; năm con số «chưa theo khung» có trần chỉ được hạ); `src/khung-web.test.ts` (cấu trúc hàm dựng, khuôn cột của bảng Đơn hàng vừa vùng nội dung ở đúng mốc); `src/khung-do.test.ts` cùng lệnh `npm run do-khung` (đo trên trang thật ở mọi bề rộng 360 tới 1.920: không tràn ngang, không chữ bị bóp, khối thẳng mép, một kiểu vỏ, khoảng cách thuộc thang, nút chính đúng chỗ). Mỗi rào có dòng ở `docs/SO-HANG-RAO.md` | lúc lập luật 21/11/2026 mới 4 trên 65 trang theo khung; các trang còn lại chuyển theo từng họ màn. Lệnh đo trên trang thật chạy tay, cần máy thử và trình duyệt, **không nằm trong `npm test`**: dựa vào kỷ luật của người thi công và người chấm giao diện. Trình duyệt chưa đo được vùng chứa thì đứng ở bố cục hẹp nhất; chưa thử trên iPhone đời cũ. Bố cục bên trong bảng trượt và các phần ruột chưa chuyển của màn đã chuyển khuôn vẫn dùng lớp cũ | ADR-0222 |

## Điều này không đổi gì

- Không đổi lưới chủ duyệt 15/11 (lề, ba mức bề rộng, bám trái): điều này chỉ nói mức bề rộng của trang do khuôn quyết theo đúng bảng đó.
- Không đổi 5.27 (mỗi khái niệm một tên): chữ trên nút, nhãn vẫn tra bảng tham chiếu.
- Không ép Trang chủ, Đăng nhập, màn bảo trì, dòng thời gian Điều phối xe, ảnh vé, Quét vé: sáu thứ này đã có tên trong sổ ngoại lệ.
- Không chạm dữ liệu, quyền, tiền, máy chủ.
