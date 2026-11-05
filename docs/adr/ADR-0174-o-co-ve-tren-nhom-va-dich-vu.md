# ADR-0174 — Ô «Có vé» trên nhóm và dịch vụ; máy chỉ giữ vé và báo thiếu vé cho dịch vụ Có vé

- **Trạng thái:** **accepted** 2026-11-05 — chủ dự án trong chat, nguyên văn: *«Duyệt, theo cách (a)»*. Số 0174: đã soát mọi nhánh 5/11, số lớn nhất đang dùng là 0173; đề xuất vé Tour Đảo được báo dùng từ 0175.
- **Ngày:** 2026-11-05   **Loại:** việc lớn (dữ liệu, quyền). **Không chạm tiền.** **Cửa:** dữ liệu một chiều mềm (bảng mới chỉ thêm, ở lại); hành vi đảo ngược được bằng cách đổi giá trị ô.
- **Lời chủ dự án (chat 2026-11-05, AI ghi lại, không tự quyết):**
  - *«thêm 1 trường (field) cho nhóm dịch vụ và/hoặc dịch vụ cụ thể là cần vé hay không, và lấy đó làm điều kiện để xác định có thiếu vé hay không»*
  - Khi được hỏi đặt ở nhóm hay từng dịch vụ: *«Cả nhóm và dịch vụ»*.
  - Trục độc lập: *«trục nhà cung cấp và trục vé độc lập với nhau, cty tour đảo là một trong nhiều nhà cung cấp»*. Phiên thiết kế vé báo chủ đã chốt ba ô độc lập; bản ghi: đề xuất vé Tour Đảo, nhánh `claude/ve-tour-dao-nghien-cuu`, tệp `docs/superpowers/specs/2026-11-05-ve-tour-dao-design.md`.
- **Liên quan / sửa:**
  - **Bổ sung ADR-0153 Đ1 mục 4:** thu hẹp «dịch vụ có thể giữ vé» từ «có mã danh mục và ngày đi» thành «có mã danh mục, ngày đi và đang Có vé».
  - **Dùng khuôn ADR-0136 Đ1** (bảng chỉ thêm, dòng dịch vụ thắng dòng nhóm). Hai cờ khác nghĩa: «Cần kiểm vé» hỏi còn chỗ không, «Có vé» hỏi có phát vé điện tử không.
  - **Không dùng khung ADR-0152:** Đ1 mục 4 của ADR đó cấm mã rẽ nhánh theo một đặc điểm cụ thể.
  - **Không đụng** Người bán dịch vụ (ADR-0078). Ô «Vé do ai phát» thuộc đề xuất vé Tour Đảo, không thuộc ADR này.
- **Vùng đang hở:** đã tra `docs/quyen-hoan.json` 5/11, không có mục nào về kho vé hay ô này.

## Bối cảnh

Đơn đã xác nhận trên dịch vụ không bao giờ có vé vẫn hiện «Thiếu N vé» và nút «Cấp vé», vì máy không biết dịch vụ nào dùng vé. Đã tái hiện trên dữ liệu thử (2 khách, chưa từng có lô ⇒ `thieu = 2`; `POST /api/ve/cap` trả 200 mà không có vé). **Chưa kiểm production:** `wrangler d1 execute --remote` thuộc lệnh AI không được chạy. Nhãn sai không làm sai tiền, không chặn đơn, nhưng làm cảnh báo thật dễ bị bỏ qua.

## Quyết định

**Đ1 — Ô «Có vé» là dữ liệu của `catalog`.** Bảng mới chỉ thêm, không sửa, không xoá, theo khuôn `ord_service_confirm_flag`: `scope` (dịch vụ hoặc nhóm), mã, `Có vé` hoặc `Không vé`, thời điểm hiệu lực, cột dấu vết. Module khác đọc qua view công bố. Mỗi lần đổi có nhật ký.

**Đ2 — Cách xét một dịch vụ.** Có dòng riêng của dịch vụ thì theo dòng đó; không có thì theo nhóm hiện hành; không có cả hai là **Không vé**. Dịch vụ nhập tay không có mã: Không vé. Luật đặt ở một hàm thuần, một nguồn cho máy chủ và giao diện.

**Đ3 — Ô chi phối giữ vé và báo thiếu.** Máy chỉ giữ vé và tính «thiếu» cho dịch vụ Có vé. Không vé thì không có nhãn thiếu, không có nút «Cấp vé». Vé đơn đã giữ không bị thu lại khi ô đổi, và vẫn hiện số đang giữ. Chỉ một điều kiện lọc ở `dichVuChoVe` của `orders`, nên nhãn, nút và lần cấp vé không tính khác nhau.

**Đ4 — Ai đặt ô.** Quản trị và Toàn quyền, cả ở nhóm lẫn dịch vụ (đúng đề xuất vé Tour Đảo). Thêm một ô quyền riêng trong `permissions.ts`, không dùng lại `catalog.confirm_flag.write`, vì Quản lý bán hàng không có việc này. Ô hiện ở màn Dịch vụ & giá, cạnh «Cần kiểm vé».

**Đ5 — Giá trị ban đầu.** Migration ghi dòng `Có vé` theo dịch vụ cho mọi mã đang có lô `PENDING` hoặc `ACTIVE`, để cảnh báo đúng không mất ngày đầu. Các dịch vụ khác không ghi dòng, tức Không vé. Lô `VOID` không tính vì lô đã từng cấp không bao giờ thành `VOID`.

**Đ6 — Nhập lô cho dịch vụ Không vé.** Không chặn. Khi xác nhận lô, máy báo: vé sẽ chưa được giữ cho đơn tới khi Quản trị bật ô. Lý do không chặn: Bán hàng nhập lô được nhưng không đặt được ô, chặn thì họ phải chờ. Người có quyền bật không được nhận thông báo tự động ở bản này (dựa vào kỷ luật).

**Đ7 — Đơn đã xác nhận khi ô đổi: chủ chọn (a).**
- **(a) theo giá trị hiện tại — đã chọn:** bật ô thì đơn đã xác nhận chưa đi cũng hiện thiếu và cấp được vé; tắt ô thì hết báo thiếu. Không lưu thêm gì trên đơn. Được: dịch vụ mới có vé vẫn cấp được cho đơn đã bán. Mất: đơn đã đi của dịch vụ vừa bật cũng hiện thiếu, nên chỉ báo thiếu khi ngày đi chưa qua.
- **(b) Chụp giá trị lúc xác nhận — không chọn:** đổi ô chỉ áp cho đơn xác nhận sau, như đề xuất vé Tour Đảo đang ghi. Được: đơn cũ không đổi nghĩa. Mất: đơn đã bán trước khi bật không được cấp vé qua luồng thường, và phải thêm cột trên đơn.

## Từ ngữ

Tên «Có vé» / «Không vé» lấy theo đề xuất vé Tour Đảo. Khi thi công, thêm vào `docs/BANG-THAM-CHIEU.md` theo ADR-0167; không dùng «Cần vé» vì quá gần «Cần kiểm vé».

## Trang ghép (CLAUDE.md §9)

1. **Bảng chứa loại thực thể nào:** bảng mới chỉ chứa ô Có vé của dịch vụ và nhóm. `vdt_batch`, `vdt_ticket`, `vdt_allocation` không thêm cột, không thêm loại ở ADR này.
2. **Bản đồ quyền chạm bảng:** ô quyền mới chỉ cho ghi (Quản trị, Toàn quyền). Đọc giá trị ở màn Dịch vụ & giá theo quyền xem màn đó. `ve.kho.manage`, `ve.cap.send`, `order.view` không đổi nghĩa.
3. **Cổng canh cửa nào:**
   - Route ghi ô hỏi ô quyền mới; đây là cổng thật.
   - `GET /api/ve/don/:orderId` vẫn hỏi `order.view`, chỉ ít dòng hơn.
   - `POST /api/ve/cap` vẫn hỏi `ve.cap.send`; dịch vụ Không vé không được giữ vé dù gọi thẳng.
   - Chỗ giao diện đổi nghĩa: khối Vé điện tử trên trang đơn ẩn với đơn chỉ có dịch vụ Không vé; nút đặt ô chỉ hiện với người có quyền, máy chủ vẫn kiểm lại.

## Điều kiện nghiệm thu

1. Đơn đã xác nhận trên dịch vụ Không vé: `/api/ve/don` không có `thieu > 0`, trang đơn không có nhãn thiếu, không có nút «Cấp vé». Bài này đỏ trên mã hiện tại.
2. Dịch vụ Có vé, kho thiếu hoặc hết vé: vẫn báo đúng số thiếu.
3. Dòng dịch vụ thắng dòng nhóm theo cả hai chiều; đổi nhóm của dịch vụ thì dịch vụ không có dòng riêng đi theo nhóm mới.
4. Dịch vụ Không vé có lô đang hoạt động: xác nhận đơn không giữ vé, `POST /api/ve/cap` không giữ vé.
5. Vé đã giữ không bị trả về kho khi ô chuyển sang Không vé.
6. Bán hàng và Quản lý bán hàng ghi ô: 403. Quản trị, Toàn quyền: được, có nhật ký.
7. Sau migration: dịch vụ có lô `PENDING` hoặc `ACTIVE` là Có vé, dịch vụ khác là Không vé.
8. E2E `ve-dien-tu` xanh trên D1 thật local. Người kiểm độc lập đọc mã và chạy lại lệnh.

## Việc không làm ở ADR này

Ô «Vé do ai phát», vé Tour Đảo, cấp bù tự động khi lô vào kho, thông báo thiếu vé qua hộp thư.
