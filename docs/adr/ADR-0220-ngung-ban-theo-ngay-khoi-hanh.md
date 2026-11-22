# ADR-0220 — Ngừng bán theo ngày khởi hành: bảng khoảng ngày của danh mục và một cổng ở mọi cửa ghi đơn

- **Trạng thái:** **accepted** 2026-11-20 — chủ dự án trong chat, bấm nút trả lời «Duyệt ADR, làm đi» (nút chỉ gửi đúng chữ đó) sau khi phiên soạn trình bản đề xuất `docs/superpowers/specs/2026-11-20-DE-XUAT-ADR-ngung-ban-theo-ngay.md` và nêu ba điểm: không ai bán vượt, đổi ngày đơn đã xác nhận vào khoảng bị chặn, khoảng đã đặt không sửa được. AI soạn và chép, không tự duyệt (Hiến pháp N3). Số 0220 kiểm còn trống 20/11: lớn nhất trên mọi nhánh là 0219. Từ dòng «Ngày» trở xuống giữ từng chữ bản đề xuất.
- **Ngày:** 2026-11-20.
- **Nguồn:** đặc tả ngắn `2026-11-20-ngung-ban-theo-ngay-khoi-hanh.md` (chủ duyệt 20/11, ba câu theo khuyến nghị).
- **Loại:** việc lớn (dữ liệu, cổng ghi đơn). **Cửa:** một chiều mềm — bảng chỉ thêm ở lại; hành vi tắt được bằng cách kết thúc mọi khoảng.
- **Quan hệ với ADR cũ:** **giữ** ADR-0166 câu 12 (nút «Ngừng bán» bật/tắt cho mọi ngày), ADR-0169 (Quản lý bán hàng giữ việc ngừng bán), ADR-0146 (luật bán theo loại đối tác, xét theo ngày thao tác). **Bổ sung** ADR-0136 và ADR-0146 Đ3: thêm một cổng nữa ở đúng các cửa đó. Không thay ADR nào.
- **Xây trên lỗ đang hở:** không (không chạm tiền, không chạm quyền mới).

## Bối cảnh
Danh mục chỉ có một ô bật/tắt «Ngừng bán», hiệu lực ngay, mọi ngày. Chủ 20/11 muốn ngừng bán một dịch vụ hoặc cả nhóm chỉ cho một khoảng ngày khởi hành (ví dụ tàu bảo dưỡng 25/12–5/1), ngày khác vẫn bán.

## Quyết định
1. **Đ1 — Bảng khoảng ngày, thuộc phân hệ danh mục.** Bảng mới tiền tố `cat_` (tên chốt lúc thi công). Mỗi dòng: phạm vi `SERVICE` (mã dịch vụ) hoặc `GROUP` (mã nhóm); ngày đầu; ngày cuối (bắt buộc, không trước ngày đầu, không ở quá khứ lúc tạo); ghi chú ngắn; người và lúc tạo; người và lúc kết thúc. Bảng chỉ thêm: trigger cấm xoá, cấm sửa mọi cột trừ đặt mốc kết thúc **một lần**. Một dịch vụ hoặc nhóm có được nhiều khoảng, kể cả chồng nhau. Không có phạm vi «mọi dịch vụ».
2. **Đ2 — Cách xét.** Một dòng dịch vụ có mã trên đơn bị chặn khi **ngày khởi hành của chính dịch vụ đó** (ngày dân sự Việt Nam) nằm trong một khoảng chưa kết thúc, trùng mã dịch vụ hoặc trùng nhóm **hiện hành** của dịch vụ. Dịch vụ chưa có ngày, và dòng nhập tay, không bị xét. Áp cho mọi bên đặt và mọi người thao tác; **không có ngoại lệ, không có nút vượt**.
3. **Đ3 — Cổng máy chủ.** Một hàm duy nhất do danh mục công bố qua `index.ts`; `orders` gọi nó ở **đúng các cửa đang gọi cổng luật bán** (lập đơn, lưu nháp, xác nhận qua hàm cổng chung gồm `/status`, Gửi đơn, Còn vé; và chốt riêng ở Gửi xác nhận), cộng **mọi cửa đổi ngày khởi hành của dịch vụ trên đơn đã xác nhận** (liệt kê lúc lập kế hoạch). Đổi bên đặt không cần cổng này. Bị chặn ⇒ **409**, mã lỗi riêng (tên tạm `sales_paused_date`), câu tiếng Việt nêu tên dịch vụ và khoảng ngày; không ghi gì. Nháp cũ trúng khoảng bị chặn ở lần lưu, gửi, xác nhận kế tiếp. Đơn **đã xác nhận** không bị xét lại khi không đổi ngày. Có bài kiểm canh «mỗi cửa gọi cổng», theo khuôn bài của luật bán.
4. **Đ4 — Ai đặt và gỡ.** Dùng lại ô quyền ngừng bán đang có (`catalog.hidden.write`: Quản lý bán hàng, Quản trị, Toàn quyền), cho cả dịch vụ lẫn nhóm; tài khoản giữ quyền Đối tác bị từ chối như ở nút cũ. Không thêm mã quyền, không thêm ô quyền. Route đọc, thêm, kết thúc đặt sau cổng văn phòng. Thêm hai hành động nhật ký (đặt, kết thúc), ghi mã dịch vụ hoặc nhóm và khoảng ngày, không ghi thông tin cá nhân.
5. **Đ5 — Giao diện.** Tên nút và nhãn: **«Ngừng bán theo ngày»** (ghi vào bảng tham chiếu). Màn Dịch vụ & giá: nút ở dòng dịch vụ và ở nhóm; nhãn «Ngừng bán dd/mm – dd/mm» trên dòng đang có khoảng; lúc đặt báo số đơn đã xác nhận có ngày trong khoảng (chỉ đếm, không kèm tên khách). Form lập đơn: dịch vụ vẫn hiện; báo lỗi của máy chủ khi lưu. Không tô mờ ngày ở lần này.

## Hệ quả
- Một migration thêm bảng và trigger (số kế tiếp lúc thi công), mở rộng danh sách hành động nhật ký; cập nhật từ điển dữ liệu, `SYSTEM-DESIGN`, `CHANGE-GUIDE`, bảng tham chiếu; một dòng sổ hàng rào cho bài «mỗi cửa gọi cổng» sau khi quan sát nó đỏ thật.
- Cạnh phụ thuộc: `orders` → `catalog` qua `index.ts` (kiểm lúc lập kế hoạch cạnh này đã có; nếu chưa thì tiêm từ gốc lắp ráp như `isAssigned`).
- Việc đếm đơn đã xác nhận trong khoảng là danh mục cần số liệu của đơn: gốc lắp ráp tiêm hàm đếm, danh mục không đọc bảng đơn.
- Chuyển dịch vụ sang nhóm khác đổi kết quả của khoảng theo nhóm; chấp nhận, như ADR-0146 Đ3.

## Tiêu chí nghiệm thu
1. Đặt khoảng 25/12/2026–05/01/2027 cho một dịch vụ ⇒ lập đơn ngày 28/12 nhận 409 với câu nêu tên và khoảng; ngày 06/01/2027 và 24/12/2026 lưu được.
2. Như 1 nhưng đặt cho nhóm ⇒ mọi dịch vụ đang thuộc nhóm bị chặn; dịch vụ nhóm khác không.
3. Sáu cửa (lập, lưu nháp, Gửi xác nhận, Gửi đơn, Còn vé, `/status`) đều chặn; bài canh đỏ khi gỡ lời gọi ở một cửa.
4. Đơn đã xác nhận từ trước giữ nguyên; đổi ngày của nó vào khoảng bị chặn.
5. Kết thúc khoảng ⇒ bán lại ngay; sau ngày cuối tự hết, không ai bấm.
6. Bán hàng, Kế toán, Thực tập, Đối tác gọi route đặt hoặc kết thúc ⇒ 403. Quản lý bán hàng, Quản trị, Toàn quyền ⇒ được, cho cả nhóm.
7. `DELETE` và `UPDATE` thẳng vào bảng bị trigger từ chối, trừ đặt mốc kết thúc một lần.
8. Nhật ký có hai hành động mới, không chứa thông tin cá nhân.

## Điều chủ cần biết
- Đơn đã xác nhận trong khoảng **không tự huỷ**; Nền tảng chỉ báo số đơn, việc gọi khách là của văn phòng.
- Quản lý bán hàng đặt được cho cả nhóm, dù không sửa được nhóm (chủ chọn 20/11).
