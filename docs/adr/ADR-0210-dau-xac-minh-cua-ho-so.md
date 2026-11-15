# ADR-0210 — Dấu xác minh của hồ sơ: «Đã xác minh», «Chưa xác minh», «Cần xác minh lại»

- **Trạng thái:** **proposed** 2026-11-15 — AI soạn theo khung đã duyệt hướng ngày 15/11 (`docs/superpowers/specs/2026-11-15-dang-ky-va-duyet-tai-khoan/THIET-KE.md` mục 5.7). Chờ chủ duyệt; AI không tự duyệt (Hiến pháp N3). Trang trình: `docs/superpowers/specs/2026-11-15-dang-ky-dot-1-luot-b/TRINH-CHU.md`.
- **Số:** 0210 (cấp cùng lượt với 0209). Tên giữ chỗ trong khung: `ĐK-8`.
- **Nguồn:** lời chủ 15/11, nguyên văn: «Tất cả các tài khoản nào được xác minh sẽ có nút biểu tượng Đã xác minh, ngược lại là Chưa xác minh, cần xác minh lại.» Ba tên dấu lấy đúng lời chủ.
- **Ngày:** 2026-11-15. **Loại:** việc lớn — dữ liệu (bảng chính sách mới, view công bố mới), hiển thị ở ba màn có quyền khác nhau. Người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều (dấu là hình chiếu, gỡ được không mất dữ liệu).
- **Quan hệ với ADR cũ:**
  - **ADR-0122 đ3, Hiến chương 5.23:** dùng bảng kết quả xác minh theo từng dòng `pty_verification` và ba kết luận sẵn có. Không thêm cột trạng thái vào hồ sơ hay tài khoản.
  - **ADR-0206 Đ3** («danh sách mục bắt buộc theo loại phiếu» nằm trong chính sách đăng ký của `dang-ky`): ADR này **thay cụm đó** — danh sách mục bắt buộc để được «Đã xác minh» nằm ở **một** bảng của `parties` (Đ1); phiếu đăng ký đọc danh sách đó qua view công bố. Một danh sách, một nơi (Hiến chương 5.3, N7). Các mục chỉ phiếu cần (loại đối tác, «đã gọi», người giới thiệu) vẫn ở chính sách đăng ký.
  - **ADR-0125:** không đổi ai xác minh; dấu chỉ đọc kết quả.
- **Xây trên lỗ đang hở: HC-5.19** — lý do xin phép: chỉ thêm một bảng chính sách và một view; không đổi dòng nào đang có.
- **Hiến chương áp:** 4.1, 5.2, 5.3, 5.20, 5.23, 5.29. **Lệch có chủ ý:** không.
- **Số quyết định chạm quyền/dữ liệu:** 1 (cùng lượt với ADR-0209 — tổng 2).

## Bối cảnh

Bảng `pty_verification` đã ghi kết quả xác minh theo từng mục (thuộc tính như ngày sinh, liên hệ, dòng giấy tờ), với ba kết luận: đạt, từ chối, cần xác minh lại. Hôm nay máy chỉ ghi «cần xác minh lại» khi sửa **ngày sinh** hoặc **dòng giấy tờ** đã xác minh; sửa họ tên chưa ghi gì, và chưa có đường nào ghi «đạt» cho họ tên (phiếu tự khai không có mục họ tên). Nhưng chưa nơi nào đọc kết quả ra màn hình, và chưa có trạng thái gộp cho cả một hồ sơ.

## Quyết định

**Đ1 — Mục bắt buộc là dữ liệu chính sách của `parties`, chọn trong một tập đóng.** Bảng mới (tên giữ chỗ `pty_verification_requirement`), chỉ thêm dòng, có ngày hiệu lực: mỗi dòng gồm loại hồ sơ (cá nhân, tổ chức), loại mục (thuộc tính, hoặc loại giấy tờ), mã. Mã chỉ chọn trong **tập mục mà phiếu đăng ký đã có ô để khai** (tập đóng trong mã); muốn thêm mục ngoài tập đó thì phải thêm ô vào phiếu trước, bằng một lần sửa mã. Mặc định đề xuất cho **cá nhân**: họ tên, ngày sinh, và một căn cước còn hiệu lực (Toàn quyền đổi được). Danh sách cho **tổ chức** để đợt 2 đặt. Người đặt: Toàn quyền (một hàng quyền mới, khuôn `chiToanQuyen()`). Thêm một mục thì mọi hồ sơ đang «Đã xác minh» mà thiếu mục đó chuyển sang «Cần xác minh lại» cùng lúc; màn đặt báo trước số hồ sơ sẽ đổi và đòi xác nhận.

**Danh sách nào chi phối lệnh «đạt» của ADR-0207 Đ2:** người xác minh phải kết luận đạt cho **mọi mục của danh sách này** (bản đang hiệu lực lúc bấm «đạt»), cộng các mục chỉ phiếu cần (loại đối tác, «đã gọi»), nằm ở chính sách đăng ký của ADR-0206. Lô duyệt ghi kết luận đạt cho mọi mục của danh sách này, gồm cả họ tên.

**Đ1b — Sửa họ tên đã xác minh thì «cần xác minh lại».** Mọi đường sửa họ tên của hồ sơ cá nhân (sửa hồ sơ, đổi tên tài khoản) ghi thêm một dòng «cần xác minh lại» cho mục họ tên trong cùng lô, như đã làm với ngày sinh.

**Đ2 — Luật tính ở một chỗ.** View của SQLite không nhận tham số ngày, nên chia hai phần:
- một view công bố của `parties` (tên giữ chỗ `v_pty_verification_facts`) trả **dữ kiện theo từng mục bắt buộc** của mỗi hồ sơ: kết luận mới nhất, mã dòng giấy tờ hiện hành, ngày hết hạn, đã huỷ chưa, hồ sơ đã gộp vào đâu, đã ẩn danh chưa, đã từng đạt chưa. Không dữ liệu cá nhân, không số giấy tờ;
- **một hàm thuần** (trong `src/shared/`, dùng chung máy chủ và giao diện) nhận dữ kiện cùng ngày hôm nay theo giờ Việt Nam (`vnToday`) và trả một trong ba trạng thái. Máy chủ gọi hàm này rồi gửi trạng thái đã tính cho giao diện; giao diện không tự tính lại.

Luật của hàm:

- **«Đã xác minh»:** mọi mục bắt buộc đang hiệu lực của loại hồ sơ đó có kết luận **mới nhất** là đạt; với mục giấy tờ, kết luận đó nằm trên **dòng giấy tờ hiện hành** của loại đó, dòng chưa huỷ và chưa hết hạn (so ngày giờ Việt Nam truyền vào làm tham số).
- **«Cần xác minh lại»:** chưa đủ điều kiện trên, **và** hồ sơ đã từng có kết luận đạt cho ít nhất một mục bắt buộc (giá trị bị sửa sau khi xác minh, giấy tờ hết hạn, bị huỷ, hay được gia hạn mà dòng mới chưa xác minh).
- **«Chưa xác minh»:** mọi trường hợp còn lại, kể cả hồ sơ chưa có kết luận nào.
- Hồ sơ đã gộp lấy trạng thái của hồ sơ chính. Hồ sơ đã ẩn danh theo yêu cầu xoá: «Chưa xác minh».

**Đ3 — Hiện ở đâu, ai thấy.** Dấu chỉ hiện cho hồ sơ **có tài khoản** hoặc **đang mang vai trò đối tác**; khách lẻ trong Danh bạ không mang dấu, để khỏi nhiễu. Không mở thêm quyền xem nào: ai vốn đã thấy tài khoản hay hồ sơ ở màn nào thì thấy dấu ở màn đó. Chấp nhận có tên: Nhân sự thấy dấu ở Quản lý tài khoản, nên gián tiếp biết căn cước của một người còn hạn hay không, dù không xem được hồ sơ.

| Màn | Ai thấy | Đọc qua |
|---|---|---|
| Trang Tôi, «Hồ sơ của tôi» | chính chủ | view, theo `staff.party_id` của phiên |
| Quản lý tài khoản (danh sách, chi tiết) | người giữ `account.view` (Quản trị, Nhân sự, Toàn quyền) | `accounts` đọc view công bố, không đọc bảng của `parties` |
| Danh bạ, chi tiết hồ sơ | người giữ `party.view` | `parties` |

Dấu không mang dữ liệu cá nhân, chỉ một trong ba giá trị.

**Đ4 — Bấm vào dấu:** chính chủ đi tới chỗ nộp hay bổ sung (với người đã có tài khoản là «Hồ sơ của tôi»; đường tự nộp ảnh là đợt 5); người giữ `party.verify` đi tới mục đang chờ của hồ sơ đó nếu có; người khác chỉ thấy dấu.

**Đ5 — Chỉ để biết, không chặn việc gì.** Không luật nào (đơn, tiền, Trả sau, đăng nhập) đọc dấu này. Muốn chặn theo dấu là quyết định riêng, chạm tiền, cần ADR riêng. Bài kiểm canh: chỉ ba màn ở Đ3 đọc view dữ kiện; phiếu đăng ký chỉ đọc **danh sách mục bắt buộc** (một view công bố riêng, tên giữ chỗ `v_pty_verification_requirement`), không đọc trạng thái.

**Đ6 — Hồ sơ duyệt từ phiếu đăng ký** mang «Đã xác minh» ngay, vì lô duyệt (ADR-0207 Đ5) ghi kết luận đạt cho mọi mục bắt buộc; nếu danh sách mục bắt buộc nhiều hơn những gì phiếu đòi, hồ sơ mang «Chưa xác minh» — vì vậy phiếu đăng ký luôn đòi ít nhất các mục ở Đ1.

## Phương án bị loại

- **Cột trạng thái trên hồ sơ hay tài khoản:** thành nguồn sự thật thứ hai, dễ lệch với bảng kết quả.
- **Tính ở giao diện:** ba màn tự tính sẽ lệch nhau; Hiến chương 4.1 đòi hình chiếu tính từ sự thật một nơi.
- **Chặn việc theo dấu ngay bây giờ:** rộng hơn lời chủ và chạm tiền.

## Bài kiểm (đỏ trước, xanh sau)

- Hàm thuần và view cùng bảng ca: chưa có kết luận → «Chưa»; đủ mục, căn cước còn hạn → «Đã»; sửa ngày sinh sau khi xác minh → «Cần lại»; **sửa họ tên sau khi xác minh → «Cần lại»** (cả đường sửa hồ sơ lẫn đổi tên tài khoản); thêm một mục bắt buộc → hồ sơ đang «Đã» thành «Cần lại»; khách lẻ không có dấu; căn cước hết hạn → «Cần lại»; gia hạn căn cước mà dòng mới chưa xác minh → «Cần lại»; hồ sơ gộp lấy theo hồ sơ chính.
- Ba màn ở Đ3 hiện cùng một giá trị cho cùng một hồ sơ; không màn nào tự tính.
- Bán hàng không thấy dấu ở Quản lý tài khoản (không có `account.view`); Nhân sự không thấy ở Danh bạ (không có `party.view`).
- Bài quét: không route đơn, tiền, đăng nhập nào đọc view trạng thái.
- e2e: duyệt một phiếu xong, tài khoản mới hiện «Đã xác minh»; tài khoản do Nhân sự tạo hiện «Chưa xác minh». Kịch bản Chrome cho ba màn, 390 và 1280.

## Người dùng sẽ thấy

Cạnh tên mỗi tài khoản và mỗi hồ sơ có một dấu nhỏ: «Đã xác minh», «Chưa xác minh» hoặc «Cần xác minh lại». Chính chủ bấm vào dấu thì được dẫn tới chỗ bổ sung. Dấu không chặn việc gì.

## Hệ quả

- Khi ADR này được duyệt: thêm dòng «Sửa bởi ADR-0210 (cụm danh sách mục bắt buộc ở Đ3)» vào đầu ADR-0206, chỉ thêm dòng trỏ, không sửa câu nào (khuôn «Sửa bởi» của ADR-0018).
- Migration số kế tiếp lúc thi công; `docs/data-dictionary.json` + `npm run dict`; `src/architecture.test.ts` (view công bố mới, cạnh `accounts → parties` qua view); `src/shared/permissions.test.ts` (hàng mới).
- **Phải nói thẳng:** tài khoản do Nhân sự tạo sẽ mang «Chưa xác minh», và cho tới đợt 5 họ chưa tự nộp ảnh giấy tờ được; phiếu giấy tờ tự khai của họ hôm nay chỉ từ chối được. Biểu tượng và chữ của dấu chờ chủ chọn (phụ lục trang trình).
