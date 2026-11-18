# Phí đưa đón: giá gốc từ Sheet, giảm theo cấp, chương trình miễn phí — đặc tả ngắn (NHÁP)

- **Ngày:** 2026-11-18. **Trạng thái:** nháp, chờ chủ trả lời ba câu ở mục 5 rồi duyệt. **Loại:** việc lớn (tiền, dữ liệu) ⇒ cần ADR mới thay một phần ADR-0214, người kiểm độc lập sau thi công.
- **Lời chủ 18/11 (chat, không hỏi lại):** «Tôi muốn lấy tham chiếu giá đưa đón từ Sheet nhưng đưa đón lại vẫn còn phụ thuộc vào: Cấp độ đại lý, dịch vụ cụ thể, ý định kinh doanh». Ý định kinh doanh, nguyên văn: «ra 1 quyết định miễn phí ngay lập tức việc đưa đón với một, hoặc nhiều hoặc tất cả dịch vụ trong khoảng thời gian cụ thể; hoặc miễn phí đón với một hoặc một vài đối tác cụ thể trong thời gian cụ thể». Cấp: «theo đề xuất» (mỗi cấp một mức giảm bằng số tiền). Đổi số: «ok» (chỉ văn phòng, bắt buộc lý do, Đối tác không đổi được).
- **Hiện trạng (đọc mã 18/11):** bản 3.13 chạy ADR-0214 (văn phòng chọn từ danh sách cố định trong mã `src/shared/phi-don-chon.ts`). Bộ tính theo cấp và dịch vụ của ADR-0203 (`src/modules/pricing/phi-don-rules.ts`) còn nguyên, không được gọi cho đơn. Phí chưa thu đồng nào vì chưa đặt «ngày bắt đầu áp» (chưa kiểm lại trên production).

## 1. Vì sao đổi
ADR-0214 bỏ đúng cái hỏng (đoán khu vực từ ô nơi đón gõ tay) nhưng bỏ luôn cấp đại lý và dịch vụ, vốn không phụ thuộc ô đó. Hệ quả: mọi đơn Đối tác có đưa đón phải chờ văn phòng; hai nhân viên tính hai mức cho cùng chuyến; Kế toán không có bảng để đối chiếu; danh sách mức khoá trong mã.

## 2. Luật tính (một hàm ở `pricing`, chạy ở máy chủ)
Cho mỗi lượt đón, theo thứ tự, dừng ở bước đầu tiên ra kết quả:
1. **Văn phòng đổi số** (có lý do) ⇒ dùng số đó.
2. **Có chương trình miễn phí đang hiệu lực** khớp dịch vụ của lượt đón hoặc khớp bên đặt ⇒ 0 đ, ghi mã chương trình.
3. **Giá gốc** = ô «Phí đưa đón» của dịch vụ trên Sheet. Ô trống ⇒ **giữ đơn** «chưa có phí đưa đón» (Hiến chương 5.7), không lấy 0. Ô ghi 0 ⇒ miễn phí.
4. **Trừ mức giảm của cấp** của bên đặt: `max(0, giá gốc − mức giảm)`. Khách lẻ, đối tác chưa có cấp: không giảm. Đối tác hai vai trò hai cấp không có cấp riêng: giữ đơn như ADR-0203.

Đi chung nhân số khách tính tiền (không đếm em bé), xe riêng tính cả chuyến — giữ như cũ. Dòng phí chụp đủ dấu vết: giá gốc, cấp và mức giảm, mã chương trình, số đổi tay + lý do + người đổi.

**Giữ nguyên:** dòng phí riêng `TRANSFER_FEE`, chụp lúc xác nhận, sửa số khách thì tính lại theo đơn giá đã chụp, không hoa hồng, cộng vào số đại lý nợ, giảm giá đơn không trừ phí, trần 5.000.000 đ, biên nhận in ở phần Tour Đảo, Đối tác gửi số phí ⇒ 400.

## 3. Kẽ hở đã thấy và cách đề xuất bịt (AI tự quyết, chủ bác được)
| # | Kẽ hở | Đề xuất |
|---|---|---|
| K1 | Cột trên Sheet bị đổi tên hoặc xoá ⇒ máy đọc thành «trống» ở mọi dịch vụ ⇒ mọi đơn bị giữ cùng lúc (bộ đọc hiện tại coi cột vắng như ô trống). | Thiếu hẳn cột ⇒ lần đồng bộ **không ghi đè** phí đang có, báo lỗi đồng bộ như khi thiếu cột bắt buộc. |
| K2 | Ai sửa được Sheet là đổi được giá gốc, Nền tảng không lưu lịch sử giá gốc. | Chấp nhận như giá dịch vụ hôm nay; dòng phí chụp giá gốc đã dùng nên đơn nào cũng truy được. Màn đồng bộ liệt kê dịch vụ đổi phí đón. |
| K3 | Gõ nhầm trên Sheet (500.000 thay 50.000). | Trần riêng cho giá gốc từ Sheet (đề xuất 500.000 đ/khách), vượt thì dòng đó báo lỗi đồng bộ, giữ số cũ. |
| K4 | Xe riêng không có giá trên Sheet. | Thêm cột thứ hai «Phí đưa đón xe riêng» (cả chuyến); trống ⇒ giữ đơn, văn phòng đổi số. Mức giảm theo cấp **không** áp cho xe riêng. |
| K5 | Mức giảm lớn hơn giá gốc ⇒ số âm. | Kẹp về 0 (bước 4). |
| K6 | «Ngay lập tức» nhưng đơn đã xác nhận đã chụp phí. | Chương trình chỉ áp cho đơn **chưa xác nhận**; đơn đã xác nhận giữ số (văn phòng xử lý từng ca nếu cần). Chương trình tạo xong có hiệu lực ngay, không chờ đồng bộ. |
| K7 | Nhiều chương trình chồng nhau. | Không xung đột vì mọi chương trình đều ra 0; ghi mã chương trình tạo sớm nhất. |
| K8 | Kết thúc sớm hoặc tạo nhầm chương trình. | Bảng chỉ thêm, có `valid_from/to`; «Kết thúc» = đóng ngày, không xoá. |
| K9 | Bật phí khi nhiều dịch vụ có đưa đón còn trống ô ⇒ đơn bị giữ hàng loạt. | Màn bật phí hiện danh sách «dịch vụ có đưa đón chưa có phí»; cảnh báo, không chặn. Công tắc «ngày bắt đầu áp» dời sang màn mới. |
| K10 | Màn bảng phí theo khu vực và danh sách cố định của ADR-0214 còn lại nhưng vô tác dụng. | Ẩn màn khu vực khỏi menu; bỏ danh sách cố định, văn phòng đổi số bằng ô nhập số (0–5.000.000) + lý do. Dữ liệu bảng cũ để nguyên. |
| K11 | Văn phòng đổi số sau xác nhận khi phát hiện sai. | Không mở đường mới (như hôm nay). Ghi BACKLOG nếu chủ cần. |
| K12 | Sheet ai cũng đọc được. | Sheet chỉ ghi giá gốc chung; mức giảm theo cấp và chương trình theo đối tác chỉ nằm trong Nền tảng. |
| K13 | Phần đặt tour của trang web công khai đọc cùng Sheet: thêm cột có làm hỏng không. | **Chưa kiểm** (không tìm thấy chỗ đọc Sheet trong mã `tourdaovn`). Kiểm trước khi thêm cột. |
| K14 | Đối tác là tổ chức có thành viên đặt đơn (ADR-0213): chương trình theo đối tác áp cho ai. | Áp theo **bên đặt** của đơn. Chưa kiểm đơn do thành viên đặt mang bên đặt là tổ chức hay cá nhân. |

## 4. Không làm lần này
Giảm theo phần trăm; chương trình giảm một phần (chỉ có miễn phí); phí theo khu vực, giờ, mùa; sửa phí sau xác nhận.

## 5. Ba câu chờ chủ (mỗi câu có khuyến nghị)
1. **«Khoảng thời gian» của chương trình tính theo ngày nào?** Khuyến nghị: **ngày đi** của lượt đón (khách hiểu «đi trong tháng 12 được miễn phí đón»). Phương án khác: ngày xác nhận đơn (hợp với «đặt trong tuần này»).
2. **Chương trình miễn phí có gồm xe riêng không?** Khuyến nghị: **mặc định không**, có ô tích «gồm xe riêng». Lý do: «miễn phí mọi dịch vụ» mà gồm cả xe riêng thì mất tiền lớn ngoài ý muốn.
3. **Ai được tạo / kết thúc chương trình miễn phí?** Khuyến nghị: **Toàn quyền và Quản trị** (cùng người đang đặt phí đón, ô `admin.manage`). Phương án chặt hơn: chỉ Toàn quyền (theo tinh thần ADR-0090 quyền tiền). Mức giảm theo cấp: Kế toán (người đang đặt cấp hoa hồng) — khuyến nghị.

## 6. Xong khi (ví dụ kiểm được)
- Sheet tour A phí 50.000; đại lý cấp 3 giảm 20.000; đơn 2 người lớn + 1 em bé đi chung ⇒ 30.000 × 2 = 60.000 đ; khách lẻ cùng đơn ⇒ 100.000 đ.
- Toàn quyền tạo «miễn phí đón tour A, 1/12–31/12» ⇒ đơn tour A đi ngày 5/12 xác nhận ra 0 đ, ghi tên chương trình trong nhật ký; biên nhận in «Miễn phí».
- Chương trình «miễn phí cho đối tác X, 1/12–15/12» ⇒ mọi đơn bên đặt X trong khoảng đó ra 0 đ; đối tác Y không đổi.
- Ô Sheet trống ⇒ văn phòng xác nhận bị chặn 409 «Dịch vụ … chưa có phí đưa đón»; Đối tác gửi ⇒ đơn vào «chờ xác nhận»; ô có số ⇒ Đối tác gửi đi thẳng.
- Văn phòng đổi 30.000 → 80.000 không ghi lý do ⇒ bị từ chối; có lý do ⇒ nhận, nhật ký ghi người, số cũ, số mới, lý do.
- Đổi tên cột trên Sheet ⇒ đồng bộ báo lỗi, phí cũ còn nguyên.
- Sổ vàng `golden/phi-dua-don.json` viết lại theo luật này, chủ hoặc Kế toán xác nhận trước khi viết mã (Hiến chương 5.17).
