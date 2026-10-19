# Đề xuất ADR-0136 — Thư xác nhận kèm QR gửi người đặt và nhân viên lập; thư báo huỷ; ảnh QR dựng phía máy chủ

**Trạng thái: đề xuất, chờ chủ duyệt.** AI soạn, không tự duyệt (N3). Số 0136 đã kiểm còn trống ngày 19/10.

- **Ngày:** 2026-10-19. **Lượt duyệt:** 2 (cùng ADR-0135; trang ghép `TRANG-GHEP-LUOT-2.md`). Mở Đợt 4 của kế hoạch; cần ADR-0135 (thư xác nhận chỉ cho đơn đã qua bước xác nhận).
- **Loại:** việc lớn (gửi dữ liệu ra ngoài: email khách, số tài khoản, số tiền). **Cửa:** hai chiều về hành vi (tắt gửi bằng một commit); thư đã gửi thì không thu hồi được (một chiều với từng thư).
- **Quan hệ với ADR cũ:**
  - **thay một phần** ADR-0108 đ3(c): câu "Trình duyệt chỉ vẽ ma trận" và câu C3 "chỉ `web/qr-ve.ts` dùng bộ vẽ" — thêm **đúng một** tệp máy chủ dùng chung tệp `web/vendor/qrcode.js` (Đ4);
  - **không còn đúng** dòng đầu ADR-0108 "Điều 5.16 chỉ áp theo nghĩa phủ định: bản này không gọi hệ thống ngoài" — thư gửi khách **là** gọi hệ thống ngoài; xem Đ5;
  - **thay** câu [người soạn] ở đặc tả Phần C mục 4 ("không gửi email cho khách khi huỷ") — đã bị lời chủ ở 5b.5 thay;
  - ADR-0131 đ3 **giữ**: thư và tin không có tên người làm; ADR-0024 (module `receipt` không bảng) **giữ** nếu chủ chọn Đ5 phương án (b);
  - cạnh module mới `receipt → staff` (đọc hồ sơ nhân viên lập), hàm công bố mới ở `parties` (email chính của hồ sơ).
- **Xây trên lỗ đang hở:** không (thư chỉ đọc số tiền "còn phải thu" đã có; không ghi sổ).

## Bối cảnh
Chủ dự án 19/10 (đặc tả Phần C mục 2–3, chốt lượt 3): xác nhận xong thì gửi **email** tới **người đặt của đơn** (đơn qua đại lý thì đại lý nhận, **không** gửi khách lẻ của đại lý) và **nhân viên lập đơn**; QR ghi **đủ số tiền còn phải thu** (5c.2 bỏ "số cọc"); không có email thì bỏ qua, không chặn việc xác nhận. Lượt 4 (5b.5): *"Đơn bị huỷ: thông báo trong Nền tảng VÀ email tới những người liên quan."* Hôm nay Nền tảng không gửi thư nào cho khách; nhân viên tự gửi ảnh QR qua Zalo. Bộ gửi thư hiện có (`src/shared/gui-thu.ts`) chỉ gửi tới địa chỉ nhân viên và chưa có trường đính kèm.

## Quyết định
1. **Đ1 — Thư xác nhận.** Gửi khi một yêu cầu xác nhận (ADR-0135) khép bằng Còn vé. Người nhận: email chính hồ sơ người đặt (`booker_party_id`); đơn không có hồ sơ người đặt thì `orders.customer_email` [người soạn]; cộng email chính hồ sơ nhân viên lập. Trùng địa chỉ ⇒ một thư. Đơn không cần bước xác nhận **không** gửi thư. [người soạn: chủ nói trong ngữ cảnh đơn cần xác nhận]
2. **Đ2 — Nội dung thư xác nhận** (danh sách trường được phép): mã đơn, tên dịch vụ, ngày đi, khung giờ đón + câu lưu ý, tổng tiền, còn phải thu, ngân hàng / số tài khoản / chủ tài khoản, nội dung chuyển khoản, ảnh QR của **đủ số còn phải thu**. Không SĐT khách, không tên người xác nhận, không giá vốn / hoa hồng.
3. **Đ3 — Thư báo huỷ, mọi lần huỷ.** Email: nhân viên lập luôn nhận; người đặt chỉ nhận khi đơn **đã xác nhận trước khi huỷ hoặc đã từng gửi xác nhận** — nháp riêng tư bị huỷ (lập lại, trùng) không báo khách vì khách chưa từng nhận gì [người soạn]. Tin trong Nền tảng: người lập (kể cả Đối tác, Thực tập), người xác nhận, HDV đang phụ trách. Nội dung: mã đơn, dịch vụ, ngày, nhãn lý do; không tên người huỷ.
4. **Đ4 — Ảnh QR phía máy chủ.** Dựng bằng chính tệp `web/vendor/qrcode.js` đã ghim băm (mức "M", lề 4 như `web/qr-ve.ts`); bài `src/vendor-qr.test.ts` cho phép đúng hai tệp nhắc bộ vẽ. **Không** dùng dịch vụ tạo ảnh bên ngoài (lộ số tài khoản + số tiền). Nếu Email Service không nhận đính kèm thì thư không có ảnh, chỉ ghi số tài khoản; người thi công báo chủ trước khi đi tiếp.
5. **Đ5 — Gửi sau giao dịch (Hiến chương 5.10, 5.16).** Thư chạy sau khi lô xác nhận / huỷ đã thành công; lỗi thư không làm hỏng việc xác nhận; nhật ký lỗi không ghi địa chỉ. Điều 5.16 đòi việc bên ngoài **quan trọng** để lại trạng thái chờ trong CSDL để thấy và gửi lại; kế hoạch hiện chỉ ghi log ⇒ **lệch 5.16 nếu thư được coi là quan trọng**. Chủ chọn: **(b, khuyến nghị [người soạn])** coi thư là **không quan trọng** — nhân viên vẫn gửi QR bằng tay như hôm nay, thư chỉ là tiện ích; ghi rõ ở đây để 5.16 được áp đúng chữ. (a) Coi là quan trọng: thêm trạng thái "chưa gửi được" + nút gửi lại; module `receipt` không có bảng (ADR-0024) nên trạng thái phải đặt ở `orders` hoặc một bảng mới — thêm một migration và một màn.
6. **Đ6 — Không thêm ô quyền.** Gửi thư là hệ quả của lệnh xác nhận / huỷ đã qua quyền; không ai bấm "gửi thư" riêng. Địa chỉ thư không vào nhật ký, không vào phản hồi API.

## Phương án bị bác
- **Dịch vụ tạo ảnh QR bên ngoài:** lộ số tài khoản và số tiền cho bên thứ ba.
- **Gửi thẳng khách lẻ của đại lý:** chủ bác.
- **Gửi thư cho mọi đơn khi xác nhận:** chủ chưa yêu cầu; nhiều thư hơn, dễ bị coi là thư rác.
- **Ghi địa chỉ người nhận vào nhật ký để tra:** trái luật không ghi email vào nhật ký.

## Hệ quả
Không ô quyền mới. Không migration nếu chủ chọn Đ5(b). Cạnh mới `receipt → staff` ở `ALLOWED_EDGES`; hàm công bố `emailChinhCuaHoSo` ở `parties`; ngữ cảnh router thêm hàm gửi thư do gốc lắp ráp tiêm (orders không import receipt / billing). Điểm gọi: route quyết định của ADR-0135, nhánh huỷ của `POST /api/orders/:id/status` (`src/modules/orders/index.ts:1400`), huỷ của HDV (`cancelOrderByHandler`).

## Điều chưa chắc
- Email Service (đang beta, `wrangler.jsonc:44-45`) có gửi tới **địa chỉ bất kỳ** (Gmail của khách) không, có nhận đính kèm không, hạn mức mỗi ngày — chưa kiểm; kế hoạch Task 4.1 Step 1 kiểm trước khi viết mã.
- Thư có QR + số tài khoản dễ vào hộp thư rác: gửi thử tới vài địa chỉ ngoài trước khi phát hành.
- Đại lý nhận thư ghi **giá bán lẻ** trong khi họ có thể quen trả phần đã trừ hoa hồng (bản luồng thực tế 4.8): nên hỏi Kế toán trước khi chốt nội dung.
