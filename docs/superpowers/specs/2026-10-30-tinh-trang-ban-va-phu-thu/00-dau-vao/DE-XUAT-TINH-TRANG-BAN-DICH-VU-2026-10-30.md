# Đề xuất: Tình trạng bán của dịch vụ — chặn theo loại đối tác và đóng/mở bán theo thời gian

> Bản phác thảo của người lập kế hoạch, 30/10/2026. **Chưa phải ADR, chưa được duyệt, chưa viết mã.**
> Đã đối chiếu với mã trên `main` (bản trong máy, HEAD `a129d3d`), ADR-0136, ADR-0146, ADR-0117, ADR-0149, BACKLOG mục 49 (`BL-TON-KHO`).

## 0. Lời chủ (30/10)

> «tôi cần thiết lập một số dịch vụ không khả dụng với một số vai trò đối tác cụ thể, dịch vụ có sẵn hay không có sẵn ở một khoảng thời gian cụ thể. Ví dụ vé Hòn Tằm không bao gồm vận chuyển thì không cho phép đối tác là Lễ tân hoặc Tài xế Taxi đặt. Vé Vinwonders gồm buffet, có thể hết sau 5 giờ nữa hoặc hết trong phạm vi một số ngày cụ thể, có thể tắt/mở thủ công bởi bán hàng hoặc quản trị hoặc toàn quyền»

## 1. Tách yêu cầu thành ba phần

| # | Phần | Ví dụ của chủ | Hiện trạng | Việc cần làm |
|---|---|---|---|---|
| A | **Không bán cho một số loại đối tác** | Hòn Tằm không gồm đưa đón → không bán cho Lễ tân khách sạn, Tài xế taxi | **Đã duyệt** ở ADR-0146 (28/10): luật chặn theo loại × dịch vụ hoặc nhóm, xét theo bên đặt, Bán hàng / Quản trị / Toàn quyền đặt luật. **Chưa thi công**: không có bảng, không có migration, không có mã | Kế hoạch thi công → chủ ra lệnh → thi công → kiểm độc lập |
| B | **Đóng bán theo thời gian** (cho mọi bên đặt) | Vinwonders kèm buffet: hết sau 5 giờ nữa; hết trong một số ngày | **Chưa có.** Hiện chỉ có cờ "ẩn" (chỉ Quản trị, ẩn hẳn, không có thời hạn, không ghi lý do) và cờ "cần xác nhận" (chỉ Toàn quyền, người nội bộ kiểm còn vé bằng tay) | Cần **ADR mới** |
| C | **Tắt / mở thủ công** | Bán hàng, Quản trị, Toàn quyền bấm tắt/mở | Là trường hợp riêng của B: "đóng từ bây giờ, chưa định ngày mở" | Gộp vào ADR của B |

**Không phải phân hệ tồn kho.** Phần B là *cửa sổ bán do người đặt*, không đếm số chỗ còn lại. `BL-TON-KHO` (chủ để sau 25/10) vẫn để sau.

## 2. Phần A — điểm cần biết khi thi công ADR-0146

- Ví dụ Hòn Tằm: mỗi vé Hòn Tằm *không gồm đưa đón* là một dòng luật cho mỗi loại bị chặn. 3 vé × 2 loại = 6 dòng. Màn đặt luật nên cho chọn nhiều dịch vụ và nhiều loại một lần, để người dùng không phải nhập từng dòng (vẫn ghi thành nhiều dòng).
- **Không chặn được theo đặc điểm "không gồm đưa đón"**: ADR-0146 chỉ cho chặn theo dịch vụ hoặc nhóm. Dịch vụ Hòn Tằm mới thêm từ Google Sheet sẽ **không tự bị chặn**. Muốn chặn tự động theo đặc điểm thì cần ADR mới (xem câu hỏi Q5).
- Chặn áp cho **bên đặt** của đơn: văn phòng lập hộ cho Lễ tân cũng bị chặn. Đối tác bị chặn không thấy dịch vụ trong danh mục lập đơn.
- **Bước bắt buộc trước khi đặt luật đầu tiên**: mọi tài khoản Đối tác phải được gắn hồ sơ có loại. Tài khoản chưa gắn sẽ không bị luật nào chặn.
- Rủi ro đã nêu ngày 28/10 và chủ đã chấp nhận: Bán hàng gỡ được luật rồi đặt ngay. Máy chỉ ghi nhật ký.

## 3. Phần B + C — mô hình đề xuất "Đóng bán"

### 3.1 Hai trục thời gian — chỗ dễ làm sai nhất

Câu của chủ chứa hai loại thời gian khác nhau:

| Ví dụ | Đang nói về | Trục |
|---|---|---|
| "hết sau 5 giờ nữa" | từ 5 giờ nữa trở đi thì **không nhận đặt nữa** | **Thời điểm đặt** (lúc bấm lưu/gửi/xác nhận) |
| "hết trong phạm vi một số ngày cụ thể" | khách **đi vào** các ngày 1–3/11 thì không còn buffet | **Ngày đi** của đơn |

Một lần đóng bán cần có **cả hai**:

- **Ngày đi bị đóng**: từ ngày – đến ngày. Để trống = mọi ngày đi.
- **Hiệu lực của lần đóng**: bắt đầu lúc (mặc định *bây giờ*, có thể đặt *sau X giờ*) – kết thúc lúc (để trống = tới khi có người mở lại).

| Thao tác của người dùng | Ghi thành |
|---|---|
| "Tắt ngay" | mọi ngày đi · bắt đầu bây giờ · không hạn |
| "Hết sau 5 giờ nữa" | mọi ngày đi (hoặc chỉ hôm nay, tuỳ Q1) · bắt đầu bây giờ + 5 giờ · không hạn |
| "Hết buffet ngày 1–3/11" | ngày đi 1/11–3/11 · bắt đầu bây giờ · không hạn |
| "Mở lại" | đặt *kết thúc = bây giờ* cho lần đóng đang có hiệu lực |

### 3.2 Luật xét

Một dịch vụ **đang đóng bán cho một đơn** khi có ít nhất một lần đóng thỏa cả ba điều kiện:

- trùng mã dịch vụ, hoặc trùng nhóm hiện hành của dịch vụ;
- thời điểm thao tác (giờ Việt Nam) nằm trong khoảng hiệu lực;
- ngày đi của đơn nằm trong khoảng ngày đi bị đóng (hoặc lần đóng áp cho mọi ngày).

### 3.3 Dữ liệu (theo khuôn đã có trên Nền tảng)

- Bảng mới **chỉ thêm dòng**, thuộc phân hệ danh mục, vì đây là tính chất của dịch vụ, không phụ thuộc bên đặt. Tên tạm `cat_stop_sale`.
- Các cột: phạm vi (dịch vụ / nhóm), mã, ngày đi từ, ngày đi đến, hiệu lực từ, hiệu lực đến, lý do (bắt buộc, ngắn), người và lúc tạo, người và lúc mở lại.
- Không xoá, không sửa. Chỉ được đặt "hiệu lực đến" **một lần** để mở lại, giống ADR-0146 Đ1.
- Không có dòng nào mang nghĩa "cho phép bán".
- Phân hệ đơn hàng gọi hàm xét qua cổng công bố của phân hệ danh mục, không đọc bảng trực tiếp.

### 3.4 Cổng máy chủ

Đặt cùng chỗ với cổng luật bán của ADR-0146: lập đơn, lưu nháp, đổi ngày đi, Gửi xác nhận, Gửi đơn, Còn vé, xác nhận. Bị chặn thì trả **409** kèm câu tiếng Việt, ví dụ: «Vé Vinwonders kèm buffet đang tạm ngừng bán cho ngày đi 02/11 (lý do: hết suất buffet). Mở lại khi người phụ trách bấm Mở bán.» Máy chủ không ghi gì khi chặn.

| Đơn đang ở | Khi dịch vụ bị đóng |
|---|---|
| Nháp | Chặn ở lần lưu, gửi hoặc xác nhận kế tiếp |
| Đang chờ xác nhận | Người xét duyệt thấy cảnh báo. Đề xuất: không cho bấm "Còn vé", chỉ cho "Hết vé" hoặc "Huỷ" (Q3) |
| Đã xác nhận | **Không đổi.** Đổi ngày đi thì xét lại |

### 3.5 Hiển thị

- **Văn phòng**: dịch vụ vẫn hiện trong danh mục nhưng **mờ**, có nhãn "Tạm ngừng bán · tới khi mở lại" hoặc "Ngừng các ngày 01–03/11". Mục đích là để nhân viên trả lời được khách.
- **Đối tác**: đề xuất hiện mờ kèm nhãn như trên (khác với phần A, nơi dịch vụ biến mất hẳn), vì đóng bán chỉ là tạm thời (Q4).
- Ngày đi trong đơn nằm ngoài khoảng bị đóng thì dịch vụ chọn được bình thường.
- **Trên trang dịch vụ**: thêm khối "Tình trạng bán" liệt kê các lần đóng đang có và sắp tới, kèm nút **Đóng ngay**, **Đóng sau… giờ**, **Đóng các ngày…**, **Mở lại**. Khối này dùng khuôn "bản ghi có hiệu lực theo ngày" (Đang / Sắp / Đã kết thúc) đã đề xuất trong lượt tái cấu trúc giao diện.
- **Trang chủ** của Bán hàng / Quản trị: một dòng "3 dịch vụ đang tạm ngừng bán".

### 3.6 Quyền

- Thêm một thao tác mới, tên tạm `catalog.availability.write`, cho **Bán hàng, Quản trị, Toàn quyền** theo lời chủ. Không thêm mã quyền mới.
- Nhật ký ghi người đóng và người mở, mã dịch vụ, khoảng ngày, lý do.
- **Nói một lần (Hiến pháp P18):** Bán hàng tự mở lại bán được rồi đặt ngay, giống rủi ro đã ghi ở ADR-0146. Muốn tránh thì chỉ cho Bán hàng *đóng*, còn *mở lại* chỉ Quản trị và Toàn quyền làm được (Q2).

## 4. Một chỗ gom về: "Vì sao dịch vụ này không đặt được?"

Sau khi làm xong, Nền tảng sẽ có **bốn** cơ chế cùng dẫn tới "không đặt được". Phải có **một hàm xét duy nhất** trả lý do theo thứ tự cố định, và một bộ câu báo chung:

| Thứ tự | Cơ chế | Ai đặt | Câu báo (đề xuất) |
|---|---|---|---|
| 1 | Ẩn hẳn (cờ ẩn hiện có) | Quản trị | «Dịch vụ đã ngừng kinh doanh» |
| 2 | Không bán cho loại đối tác (ADR-0146) | BH / QT / TQ | «Dịch vụ không bán cho [loại] của bên đặt» |
| 3 | Đóng bán theo thời gian (mới) | BH / QT / TQ | «Tạm ngừng bán cho ngày đi … (lý do)» |
| 4 | Cần xác nhận (ADR-0136) | Toàn quyền | không chặn: đơn đi qua bước kiểm còn vé |

Màn dịch vụ hiện **cả bốn trạng thái** ở một chỗ, để không ai phải đi tìm.

## 5. Câu hỏi cho chủ (gom một lượt, có khuyến nghị)

| # | Câu | Phương án | Khuyến nghị |
|---|---|---|---|
| Q1 | "Hết sau 5 giờ nữa" nghĩa là gì? | (a) Sau 5 giờ thì ngừng nhận đặt cho **mọi ngày đi** · (b) Chỉ ngừng nhận đặt cho **ngày đi hôm nay** (ví dụ buffet hôm nay hết suất) | Cho người đặt chọn mỗi lần đóng; mặc định (b) |
| Q2 | Ai được **mở lại**? | (a) Cả Bán hàng, Quản trị, Toàn quyền · (b) Bán hàng chỉ đóng; mở lại chỉ Quản trị, Toàn quyền | (b): an toàn hơn, Bán hàng vẫn phản ứng nhanh khi hết chỗ |
| Q3 | Đơn đang chờ xác nhận gặp dịch vụ vừa bị đóng | (a) Không cho bấm "Còn vé" · (b) Chỉ cảnh báo, người xét duyệt tự quyết | (a) |
| Q4 | Đối tác thấy dịch vụ đang đóng thế nào? | (a) Hiện mờ kèm nhãn "Tạm ngừng" · (b) Ẩn hẳn như phần A | (a) |
| Q5 | Hòn Tằm: chặn theo từng vé hay theo đặc điểm "không gồm đưa đón"? | (a) Từng vé, như ADR-0146 đã duyệt, làm được ngay · (b) Theo đặc điểm, vé mới tự bị chặn, cần ADR mới | (a) trước, (b) để sau nếu số vé tăng |
| Q6 | Thứ tự làm | (a) Thi công ADR-0146 ngay, song song soạn ADR "Đóng bán" · (b) Chờ gộp làm một lần | (a): phần A đã duyệt, không phụ thuộc phần B |

Lượt duyệt ADR "Đóng bán" chạm **3 điều về quyền và dữ liệu** (bảng mới, thao tác quyền mới, cổng chặn ở đường ghi đơn), vừa đúng trần 3. Không gộp chung lượt với ADR-0146.

## 6. Tiêu chí nghiệm thu dự kiến cho phần B (viết trước, đỏ trước xanh sau)

1. Đóng dịch vụ X cho ngày đi 01–03/11: lập đơn X ngày 02/11 nhận 409, không ghi dòng nào. Ngày 04/11 nhận 201.
2. Đóng X bắt đầu sau 5 giờ: trước mốc đặt được, sau mốc nhận 409. Thử bằng hàm giờ tiêm giả.
3. Mở lại: đặt được ngay. Dòng đóng cũ vẫn còn, có người và lúc mở.
4. Cơ sở dữ liệu từ chối xoá dòng, sửa cột khác, mở lại lần thứ hai.
5. Đóng theo nhóm: mọi dịch vụ trong nhóm bị chặn; chuyển dịch vụ ra khỏi nhóm thì thôi bị chặn.
6. Nháp có X, đổi ngày đi vào khoảng bị đóng: lưu nhận 409. Đơn đã xác nhận không đổi.
7. Đơn chờ xác nhận có X vừa bị đóng: "Còn vé" nhận 409 (nếu Q3 = a).
8. Bán hàng, Quản trị, Toàn quyền đóng được (201). Kế toán, Đối tác, Thực tập, Nhân sự nhận 403. Mở lại theo Q2.
9. Danh mục lập đơn trả cờ "tạm ngừng" kèm khoảng ngày và lý do, cho cả văn phòng lẫn Đối tác.
10. Một đơn vừa dính luật bán (A) vừa dính đóng bán (B): câu trả về là của A, theo thứ tự ở mục 4.

## 7. Điều chưa kiểm

- Chưa kiểm dữ liệu thật: production đã có loại "Lễ tân khách sạn", "Tài xế taxi (giới thiệu khách)" chưa (ảnh thử có các loại này) và mọi tài khoản Đối tác đã gắn hồ sơ có loại chưa.
- Chưa kiểm có nhánh hay phiên nào khác đang thi công ADR-0146 ngoài bản mã trong máy này.
- Tên bảng, tên thao tác quyền đều là tên tạm.
