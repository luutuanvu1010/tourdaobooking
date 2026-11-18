# ADR-0219 — Đổi người xác minh và người duyệt phiếu đăng ký đối tác

- **Trạng thái:** **proposed** 2026-11-18 — AI soạn theo lời chủ cùng ngày, nguyên văn: «Chốt theo khuyến nghị, soạn quyết định mới đi.» (chốt bảng: xác minh = Quản lý bán hàng, Toàn quyền; duyệt mở tài khoản = Quản trị, Nhân sự, Toàn quyền). Chờ chủ duyệt; AI không tự duyệt (Hiến pháp N3). Trang ghép: `docs/superpowers/specs/2026-11-18-adr-0219-nguoi-xac-minh-nguoi-duyet/TRANG-GHEP.md`.
- **Số:** 0219 (số lớn nhất trên mọi nhánh lúc cấp là 0218, ở nhánh chưa gộp). Nhánh khác lấy trước thì đổi số.
- **Ngày:** 2026-11-18. **Loại:** việc lớn — quyền. Không đổi bảng, không migration, không đổi lô duyệt. Người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều về ai làm bước nào; **một chiều** về dữ liệu đã xem (người mới được xem giấy tờ thì không thu hồi được điều đã thấy).
- **Quan hệ với ADR cũ:**
  - **ADR-0207 Đ1** (bảng «ai làm bước nào»): **thay** bằng bảng ở Đ1 dưới đây. Vế «người duyệt khác người xác minh, trừ Toàn quyền có cờ» giữ nguyên, kể cả trigger. Mục «Cho Quản trị duyệt mở tài khoản» ở «Phương án bị loại» của ADR-0207 thôi hiệu lực.
  - **ADR-0207 Đ4:** chữ «Nhân sự» đọc thành «người duyệt». Màn duyệt vẫn không có ảnh, số giấy tờ, ngày sinh, địa chỉ; tên hồ sơ đích chỉ hiện cho người xem được Danh bạ.
  - **ADR-0071 điều 1b** («Quản trị không tạo tài khoản»): thêm **một ngoại lệ có tên**. Quản trị mở được tài khoản **đối tác**, chỉ bằng lệnh duyệt phiếu đăng ký đã được người khác xác minh. Quản trị vẫn không có ô `account.create`.
  - **ADR-0071 điều 3b, ngoại lệ ở ADR-0207:** giữ. Nhân sự duyệt «gắn vào hồ sơ có sẵn» do **người xác minh** chọn.
  - **ADR-0125** (hàng chờ phiếu tự khai, ô `party.verify`, `party.verify.attachment`): **không đổi**. Phiếu đăng ký thôi dùng hai ô này, chuyển sang ô riêng (Đ2).
  - **Hiến chương 5.28, 5.29:** không sửa chữ. Người xác minh xem được Danh bạ, hai bước hai người, Toàn quyền làm được cả hai và có ghi dấu — vẫn đúng.
- **Xây trên lỗ đang hở:** không thêm đường ghi nào; HC-5.19 như ADR-0207.
- **Số quyết định chạm quyền/dữ liệu:** 1.

## Bối cảnh

Chủ muốn người làm kinh doanh xác minh đối tác, và một người độc lập với kinh doanh duyệt mở tài khoản. Đây là khuôn «một người làm, một người khác soát» trên từng phiếu mà Hiến chương 5.28 đã chọn theo cách của Oracle Fusion. Hai giới hạn đã được nêu và chủ chấp nhận khuyến nghị: Nhân sự không xem được Danh bạ nên không xác minh; người xác minh xem giấy tờ cá nhân nên chỉ Quản lý bán hàng làm, không mở cho cả đội Bán hàng.

## Quyết định

**Đ1 — Ai làm bước nào.**

| Bước | Ai | Hỏi ô nào |
|---|---|---|
| Mở nhận đăng ký | Toàn quyền | `registration.policy.write` (không đổi) |
| Xác minh và đối chiếu Danh bạ | Quản lý bán hàng, Toàn quyền | `registration.verify` **và** `party.view`; xem đủ số, mở ảnh thêm `registration.verify.attachment` |
| Duyệt mở tài khoản, từ chối, trả về xác minh, gửi lại lời mời | Quản trị, Nhân sự, Toàn quyền | `registration.approve` |
| Đặt mã PIN | Chính đối tác | không đổi |

Mỗi phiếu: người duyệt **khác** người xác minh; riêng Toàn quyền làm được cả hai, có cờ (không đổi).

**Đ2 — Ba ô quyền mới, hẹp.**
- `registration.verify`, `registration.verify.attachment`: Quản lý bán hàng, Toàn quyền.
- `registration.approve`: Quản trị, Nhân sự, Toàn quyền. Ô này chỉ mở được tài khoản đối tác từ phiếu đã xác minh (lô duyệt sẵn có đã chặn vai nội bộ). **Không** cấp `account.create` cho Quản trị.
- `registration.queue.view`: thêm Quản lý bán hàng (còn Quản trị, Nhân sự, Toàn quyền). Hàng chờ lọc theo năng lực như nay: ai xác minh được thấy phiếu chờ xác minh, cần bổ sung, chờ duyệt; ai duyệt được thấy phiếu chờ duyệt và đã duyệt chưa kích hoạt.
- Gửi lại thư báo: thư của bước xác minh hỏi `registration.verify` + `party.view`; thư từ chối ở bước duyệt hỏi `registration.approve`.

**Đ3 — Chỗ đặt hàng chờ.** Quản lý bán hàng không vào được trang Quản lý tài khoản, và không cổng nào chứa cả Quản lý bán hàng lẫn Nhân sự. Hàng chờ chuyển sang **một trang riêng**, mở cho người giữ `registration.queue.view`; trang Quản lý tài khoản giữ một lối sang. Cổng route: xác minh đi cổng `office`, duyệt giữ cổng `accounts`, hàng chờ và gửi lại thư đi cổng `staff`; mọi route vẫn hỏi ô ở Đ2 trong thân. Tên trang, vị trí trong menu là việc bề mặt, chọn lúc thi công theo bảng tham chiếu.

## Phương án bị loại

- **Nhân sự xác minh:** phải cho Nhân sự xem Danh bạ (có số điện thoại khách), trái ADR-0071 điều 1e.
- **Cả đội Bán hàng xác minh:** ảnh và số căn cước lộ cho nhiều người.
- **Cấp `account.create` cho Quản trị:** Quản trị tạo được cả tài khoản nhân viên; trái ADR-0071 và nguyên tắc chỉ cấp vừa đủ việc.
- **Dùng lại `party.verify`:** đổi luôn người xác minh phiếu tự khai (ADR-0125), việc chủ không yêu cầu.

## Bài kiểm (đỏ trước, xanh sau)

- Bài ghim từng ô của ba ô mới và ô `registration.queue.view`; ô `party.verify`, `party.verify.attachment`, `account.create` giữ nguyên giá trị.
- Route: Quản lý bán hàng xác minh được, duyệt bị 403; Quản trị và Nhân sự duyệt được, xác minh bị 403; Bán hàng thường bị 403 ở cả hai.
- Một tài khoản vừa Quản lý bán hàng vừa Quản trị: xác minh rồi duyệt chính phiếu đó bị trigger chặn; giao diện khoá nút (bản sửa 18/11).
- Hàng chờ phiếu tự khai (ADR-0125) chạy y như trước.
- Kịch bản Chrome đăng ký: đổi tài khoản ở bước xác minh sang Quản lý bán hàng, thêm một lượt Quản trị duyệt.

## Người dùng sẽ thấy

Quản lý bán hàng có trang «Phiếu đăng ký đối tác» để xác minh. Quản trị thấy thêm nút «Duyệt mở tài khoản» nhưng không còn xác minh phiếu đăng ký. Nhân sự vẫn duyệt, không còn thấy phiếu chờ xác minh.

## Hệ quả

- **Được:** người hiểu đối tác (kinh doanh) xác minh; người độc lập duyệt; số vai xem được giấy tờ của phiếu không tăng (hôm nay Quản trị và Toàn quyền, sau này Quản lý bán hàng và Toàn quyền).
- **Mất:** thêm một trang; Quản trị thôi xác minh nên cần ít nhất một Quản lý bán hàng trực để phiếu không kẹt (Toàn quyền làm thay được).
- **Rủi ro còn lại:** Quản lý bán hàng vừa xác minh vừa đặt cấp mặc định cho từng loại đối tác. Cấp đặt theo loại, không theo người, và người duyệt chọn vai, nên rủi ro thấp; mọi lệnh có nhật ký. Hai người thông đồng vẫn không bị máy bắt (như Hiến chương 5.29).
