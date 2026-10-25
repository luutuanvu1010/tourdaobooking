# Bổ sung 25/10 cho đề xuất ADR-0136 — cờ «cần xác nhận» theo nhóm, nút «Gửi đơn» của Đối tác

**Trạng thái: đề xuất, chờ chủ duyệt cùng đề xuất ADR-0136.** AI soạn, không tự duyệt (N3). Đề xuất gốc `../2026-10-19-xac-nhan-don/DE-XUAT-ADR-0136-buoc-xac-nhan-don.md` là hồ sơ có ngày, **không sửa**. Khi chủ duyệt, người chép sang `docs/adr/` áp các thay đổi dưới đây vào bản chép: ADR-0136 = đề xuất gốc + bản bổ sung này.

- **Ngày:** 2026-10-25. **Lượt duyệt:** cùng đề xuất ADR chính sách bán (số tạm 0140); trang ghép `TRANG-GHEP.md` cùng thư mục. Đề xuất «0137 thư xác nhận + QR» **tách khỏi lượt này** và phải đổi số, vì 0137 đã là ADR sổ đại lý.
- **Nguồn lời chủ:** thiết kế `../2026-10-25-chinh-sach-ban-va-gui-don-design.md` mục 1, 3, 4; hộp chọn 25/10: (b) «mọi tài khoản Đối tác», (c) «văn phòng nói chung».
- **Số hiệu:** 0136 vẫn trống trên bản chính ngày 25/10. Số migration ghi trong đề xuất gốc (tạm 0115) **đã bị dùng**; số lấy lúc thi công.
- **Xây trên lỗ đang hở:** như đề xuất gốc: không, với điều kiện Đợt 2 (ADR-0135) phát hành cùng Đợt 3 (chủ chọn A ngày 19/10).

## Thay Đ1 — Cờ theo dịch vụ HOẶC theo nhóm
Bảng `ord_service_confirm_flag` (chỉ thêm, có hiệu lực) có thêm phạm vi: `SERVICE` (mã dịch vụ) hoặc `GROUP` (mã nhóm). Mỗi dòng mang giá trị **cần** hoặc **không cần**. Máy chủ đọc lúc bấm như sau:
- dịch vụ có dòng riêng còn hiệu lực thì theo dòng đó;
- không có thì theo dòng của nhóm **hiện hành** (đọc qua `v_ctl_service_group`);
- không có cả hai thì **không cần**.

Ví dụ: nhóm Vinwonders «không cần», riêng vé kèm buffet «cần». [chủ 25/10: đánh dấu theo nhóm; người soạn: dòng dịch vụ thắng dòng nhóm, giá trị «không cần» ghi tường minh] Phần còn lại của Đ1 giữ nguyên: đơn có chặng dưới mốc chưa đặt gấp cũng phải qua bước; chỉ ô `settings.ops` đổi được cờ.

## Thêm Đ13 — «Gửi đơn» cho mọi tài khoản giữ quyền Đối tác
1. **Một nút.** Tài khoản giữ quyền Đối tác chỉ còn nút **«Gửi đơn»**, thay cho cặp «Lưu, chờ xác nhận» rồi «Xác nhận đơn». [chủ (b)] Tài khoản lai cũng áp, cùng kiểu với luật giá danh mục R2. [người soạn]
   - Form lập mới: bấm Gửi đơn là lưu rồi gửi.
   - Form sửa nháp giữ nút «Lưu thay đổi»; trang đơn nháp có nút Gửi đơn. [người soạn]
2. **Cổng lúc gửi.** Máy chủ chạy mọi cổng của Xác nhận ngay lúc gửi, ở cả hai nhánh:
   - luật bán (đề xuất ADR chính sách bán);
   - giá danh mục và trần giảm giá, xét theo người gửi như hôm nay;
   - người lớn, chọn Đón/Không đón, mốc tối thiểu.

   Có cổng từ chối thì đơn **ở lại nháp** (đã lưu) và hiện câu lỗi tiếng Việt của máy chủ; không có câu báo thứ ba.
3. **Nhánh A — cần xác nhận.** Áp khi đơn có dịch vụ cần xác nhận theo Đ1, hoặc có chặng dưới mốc chưa đặt gấp. Máy chủ mở yêu cầu xác nhận như Đ3, và giao diện báo **«Đơn của bạn đã được gửi và chờ xác nhận»**. Đối tác Rút lại được (Đ3).
4. **Nhánh B — các đơn còn lại.** Máy chủ **xác nhận ngay** trong cùng lần gửi, qua đủ lô xác nhận hôm nay (chụp mức, mốc tối thiểu).
   - Đơn vào hàng chờ nhận; tin và Bảng tin như khi Đối tác tự xác nhận hôm nay. [chủ (c)]
   - Nhật ký `confirmed` có ghi chú «tự xác nhận khi Đối tác gửi đơn».
   - Giao diện báo **«Đơn của bạn đã được chuyển đến chuyên viên phụ trách & chờ hướng dẫn viên»**.
5. **Đường cũ đóng.** Tài khoản giữ quyền Đối tác gọi Xác nhận (`POST /api/orders/:id/status` với `confirmed`) hoặc Gửi xác nhận thì nhận **409 `partner_submit_required`**. Cổng này đặt ngay sau `can()`, trước các cổng khác của nhánh xác nhận.
   - Phải là luật ở route, vì `can()` lấy **hợp** các ô của mọi quyền đang giữ. Tài khoản lai Bán hàng + Đối tác sẽ lọt qua hàng `SALES` của ô `order.modify`; dữ liệu thử e2e có sẵn tài khoản lai như vậy.
   - **Huỷ giữ như hôm nay**: phần «huỷ đơn của chính mình» của ADR-0014 câu 6 không đổi. [người soạn]
6. **Ô quyền mới `order.submit`** («Gửi đơn»): PARTNER `own`, SUPER_ADMIN `any`, mọi mã khác `none`. Giá trị này đúng hàng đích của đặc tả 24/9 (ADR-0018 đ6); riêng Toàn quyền `any` thì bài «Toàn quyền = any ở mọi thao tác» cũng ép.
   - **Chưa tách** ô `order.confirm`. Ô `order.modify` giữ giá trị; chỉ đổi chú thích và tên lời thường (`TEN_THAO_TAC`, hôm nay «sửa, xác nhận, huỷ đơn») để nói rõ tài khoản giữ quyền Đối tác xác nhận bằng Gửi đơn.
7. **Ảnh «XÁC NHẬN ĐƠN DỊCH VỤ»** chỉ có sau khi đơn đã xác nhận (Đ11). Nhánh B có ảnh ngay; nhánh A có sau khi người xét duyệt chọn Còn vé. Ở nhánh B, câu báo hiện trước, rồi hộp ảnh tự mở như hôm nay. [người soạn: thuộc bề mặt, đổi được]

## Làm rõ các điều khác của đề xuất gốc
- Đ3 «chỉ người lập gửi»: với tài khoản giữ quyền Đối tác, Gửi đơn thay cho Gửi xác nhận.
- Mục «Điều chưa chắc — giá danh mục»: với đơn của Đối tác, Đ13.2 đã trả lời (giá danh mục xét theo người gửi, ngay lúc gửi). Với đơn của Thực tập, câu hỏi vẫn mở như đề xuất gốc.
- Đ10: tin xác nhận và huỷ tới người lập là Đối tác giữ nguyên. Ở nhánh B, người gửi không nhận tin «đã xác nhận» về việc chính mình vừa làm, vì họ đã thấy câu B. [người soạn]

## Quan hệ với ADR cũ (thêm vào danh sách của đề xuất gốc)
- **thay một phần** ADR-0014 câu 6: Đối tác không tự xác nhận nữa; đơn không cần xác nhận do máy chủ xác nhận lúc gửi. Phần «sửa, huỷ đơn của chính mình» giữ nguyên.
- **đóng** `BL-QUYEN-BH09`: ngày 3/10 chủ tạm gác, «giữ như hôm nay tới ADR-0018 giai đoạn 2»; lời chủ 25/10 là quyết định mới.
- **thay** Q19 của đặc tả 24/9 (`2026-09-24-mo-hinh-nguoi-vai-quyen-design.md`) cho đơn không cần xác nhận: máy chủ xác nhận, sau đó người nhận của Tour Đảo chăm sóc đơn.
- **thực hiện một phần** ADR-0018 đ6 (thêm `order.submit`) và đ9 (nút «Gửi đơn hàng»). Phần «đồng hồ bắt đầu» (hạn nhận, đ8) và việc tách ô `order.confirm` để giai đoạn sau.

## Hệ quả thêm
- Ô `order.submit`: `MATRIX`, `TEN_THAO_TAC`, ba bài ghim hàng DRIVER / DRIVER_PARTNER / HR, `tests/e2e/permissions.mjs`.
- Route Gửi đơn (mới); route `/status` và route Gửi xác nhận thêm luật 409.
- `orderActions` (`src/shared/order-view.ts`) thêm hành động Gửi đơn; nút ở form (`web/order-form.ts`) và trang đơn (`web/order.ts`).
- Trợ giúp Đối tác (`src/shared/huong-dan-doi-tac.ts`): sửa hai chỗ nhắc «Lưu, chờ xác nhận» và «Xác nhận đơn».
- Các e2e đang cho phiên Đối tác hoặc tài khoản lai tự xác nhận phải chuyển sang Gửi đơn (trang ghép mục 6).

## Tiêu chí nghiệm thu thêm (đỏ trước, xanh sau)
1. Đối tác gửi đơn có dịch vụ thuộc nhóm «cần»: máy chủ mở yêu cầu, đơn vẫn nháp, phản hồi báo nhánh A.
2. Đối tác gửi đơn không có dịch vụ cần xác nhận và không có chặng dưới mốc: đơn thành `confirmed` và có trong hàng chờ nhận; phản hồi báo nhánh B; nhật ký ghi «tự xác nhận khi Đối tác gửi đơn».
3. Dòng dịch vụ «không cần» thắng dòng nhóm «cần», và ngược lại.
4. Đối tác, và tài khoản lai Bán hàng + Đối tác, gọi `/status` với `confirmed`: nhận 409 `partner_submit_required`. Đối tác huỷ đơn của mình (kèm lý do) vẫn như hôm nay.
5. Gửi đơn khi một cổng hỏng (thiếu chọn Đón, giá danh mục vừa đổi, luật bán chặn): nhận đúng lỗi của cổng đó; đơn vẫn nháp; không mở yêu cầu.
6. Thực tập không có nút Gửi đơn; ô `order.submit` của INTERN là `none`, gọi route thì nhận 403.
