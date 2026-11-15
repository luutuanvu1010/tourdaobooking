# Trang ghép — ADR lượt A của đợt 1 đăng ký: ADR-0206, ADR-0207, ADR-0208

> Trạng thái: **đề xuất, chờ chủ duyệt** cùng ba ADR. Bắt buộc theo `CLAUDE.md` §9: lượt duyệt có ba quyết định chạm quyền, dữ liệu (đúng trần 3; cách đếm: mỗi ADR một quyết định, như các lượt trước), và nhiều bảng dùng chung nhận dữ liệu từ một nguồn mới. Hồ sơ có ngày: duyệt xong thì đóng băng. Khung đã duyệt hướng: `docs/superpowers/specs/2026-11-15-dang-ky-va-duyet-tai-khoan/`.
> Cột quyền theo thứ tự ở `src/shared/permissions.ts`: SALES · ACCOUNTING · ADMIN · FIELD · PARTNER · SUPER_ADMIN · INTERN · DRIVER · DRIVER_PARTNER · HR · SALES_MANAGER. Tên bảng, tên route, tên ô mới đều là tên giữ chỗ.

Ba câu hỏi bắt buộc của bài học F-01, trả lời trước:

- **Bảng hồ sơ nay chứa ai?** Không thêm loại người nào. Thêm một **nguồn**: người tự tìm đến, và chỉ sau khi hai người của công ty đã xác minh và duyệt.
- **Bảng tài khoản nay chứa ai?** Thêm một loại mới: **tài khoản đã duyệt nhưng chưa kích hoạt**: tắt (`active = 0`), chưa ai biết PIN, các lệnh hỗ trợ đăng nhập từ chối nó.
- **Kho `HO_SO` nay chứa gì?** Thêm ảnh giấy tờ của **người chưa là đối tác**, trong lúc phiếu của họ còn sống.

## (1) Những bảng / kho này chứa loại thực thể nào

| Bảng / kho | Chứa ai, chứa gì (hôm nay) | ADR | Đổi gì | Điều phải canh |
|---|---|---|---|---|
| **Các bảng `dk_*` (mới, của `dang-ky`)**: phiếu, danh tính, bản khai, kết luận từng mục, lịch sử lệnh, mã email, chính sách | — | 0206, 0207 | Chứa dữ liệu của **người ngoài chưa là đối tác**: email, họ tên, số điện thoại, ngày sinh, địa chỉ (N2), số giấy tờ (N3), bản băm mã (N4) | Chỉ `dang-ky` ghi. Không view công bố nào mang nội dung bản khai. Bản khai bất biến; trạng thái kết thúc không đổi. Nội dung bị ẩn danh khi duyệt, hoặc sau hạn |
| **Bảng tệp chờ (mới, của `parties`)** | — | 0208 | Ảnh giấy tờ của phiếu, khoá theo mã phiếu, không gắn hồ sơ | Chỉ `parties` ghi. Một khoá kho không nằm ở hai nơi. Phiếu kết thúc không duyệt thì mọi tệp nhận quyết gỡ |
| **Kho R2 `HO_SO`** | Ảnh giấy tờ của hồ sơ (hôm nay chỉ Toàn quyền tải lên) | 0208 | Thêm ảnh của người chưa có hồ sơ | Chỉ `parties` chạm. Không route đọc tệp cho người đăng ký. Mở ảnh: nhật ký trước |
| `pty_party`, `pty_person`, `pty_party_role` | Nhân viên, khách, khách của đối tác, đối tác (người và công ty), nhà xe, chính Tour Đảo | 0207 | **Không cột mới.** Thêm dòng **chỉ qua lệnh duyệt**: hồ sơ cá nhân mới mang vai trò đối tác, hoặc mở vai trò trên hồ sơ có sẵn | Gửi phiếu, tải ảnh không được sinh dòng nào ở đây. Hồ sơ mới hiện ngay ở Danh bạ, nên chỉ sinh sau khi đã đối chiếu trùng |
| `pty_contact_point`, `pty_person_document` | Liên hệ và giấy tờ của mọi hồ sơ trên | 0207 | Thêm dòng từ lệnh duyệt; giấy tờ trùng loại với dòng hiện hành thì là dòng gia hạn | Số giấy tờ không vào nhật ký, DTO mặc định, câu báo lỗi (luật sẵn có) |
| `pty_attachment`, `pty_attachment_link` | Ảnh gắn dòng giấy tờ của hồ sơ | 0208 | **Không đổi bảng.** Thêm dòng từ lệnh duyệt, dùng lại khoá kho của tệp chờ; người tạo là người duyệt | Luật giữ ảnh hôm nay đòi hồ sơ còn vai trò mở: lệnh duyệt mở vai trò trong cùng lô nên ảnh không rơi vào danh sách xoá |
| `pty_verification` | Kết quả xác minh phiếu tự khai của người **đã có tài khoản** | 0207 | Thêm dòng sinh từ phiếu đăng ký, ghi lúc duyệt, người xác minh là người đã kết luận. Dòng do Toàn quyền làm cả hai bước mang cờ | Lượt B sẽ đọc bảng này để tính dấu xác minh |
| `pty_consent` | Đồng ý chính sách riêng tư của người có hồ sơ | 0207 | Thêm dòng chép từ bản khai lúc duyệt | Đúng phiên bản người đăng ký đã đồng ý, không phải phiên bản lúc duyệt |
| `pty_party_relationship` và bảng loại quan hệ | Hai loại: «Người liên hệ của», «Tài xế của» | 0207 | Thêm **một loại** («người giới thiệu»), bằng migration; dòng ghi lúc duyệt nếu người xác minh đã chọn | Chỉ ghi nhận. Không luật tiền nào đọc loại này |
| `staff`, quyền và vai trò tài khoản | Tài khoản do Nhân sự, Toàn quyền tạo | 0207 | Thêm tài khoản sinh từ lệnh duyệt bằng một biến thể mới của đường tạo (chỉ tài khoản và quyền, không sinh hồ sơ); **loại mới: chưa kích hoạt, `active = 0`** | Đường đặt PIN mới chỉ chạy cho tài khoản sinh từ phiếu và chưa kích hoạt; lô kích hoạt bật `active = 1`. Đặt lại PIN, mở khoá, kích hoạt lại, tắt lớp hai từ chối tài khoản chưa kích hoạt. Trigger «quyền Đối tác phải có vai trò đối tác» vẫn áp: lô xếp vai trò trước quyền |
| **Bảng quyết định của phiếu (mới, của `dang-ky`)** | — | 0207 | Một dòng cho mỗi lần duyệt, mỗi lần kích hoạt, mang cờ khi Toàn quyền làm cả hai bước | Câu chèn là câu chốt của lô; trigger `RAISE` làm hỏng cả lô khi điều kiện sai; trigger chỉ đọc bảng `dk_*` |
| `audit_log`, view `v_aud_cham_tai_khoan` | Nhật ký mọi lệnh; view cho lính gác tách nhiệm vụ | 0206, 0207, 0208 | Lệnh duyệt ghi `staff_created` trỏ mã tài khoản mới (đã nằm ở tầng tạo tài khoản, **không tạo lại view**). Hành động mới, đích là phiếu: kết luận xác minh, xem đủ số, mở ảnh, từ chối, gửi lại lời mời, đổi chính sách, lượt dọn của tác nhân; kích hoạt do chính tài khoản mới đứng tên | Lệnh của **người đăng ký** không vào đây (họ không phải tài khoản hay tác nhân) mà vào lịch sử của phiếu |
| `login_attempt` (bộ đếm chống dò) | Lượt thử đăng nhập theo số điện thoại, địa chỉ mạng | 0206 | Thêm khoá của đăng ký, không gian riêng `dk:` cho cả email lẫn địa chỉ mạng | Không dùng `phone:`, `mfa:` (màn Quản lý tài khoản lọc theo đó) và không dùng chung `ip:` (để đăng ký dồn dập không khoá đăng nhập của nhân viên cùng mạng) |
| `pty_privacy_policy` | Chính sách riêng tư có phiên bản (hôm nay chưa có dòng nào trên bản chính thức, theo sổ bàn giao) | 0206 | Thêm **một đường đọc công khai** | Chỉ trả phiên bản, ngày hiệu lực, thân; không trả người đăng |

## (2) Dòng bản đồ quyền chạm các bảng / route trên

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SUPER | INTERN | DRIVER | DRV_P | HR | SM | Áp cho | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **(mới)** xem hàng chờ phiếu đăng ký | none | none | any | none | none | any | none | none | none | any | none | Quản trị, Toàn quyền: mọi phiếu chưa kết thúc; Nhân sự: chỉ phiếu `CHỜ DUYỆT` và tài khoản chưa kích hoạt; mọi người: danh sách đã xử lý dạng mã | khuôn `quanTriNhanSu()` (ADR-0207 Đ4) |
| **(mới)** đặt chính sách đăng ký | none | none | none | none | none | any | none | none | none | none | none | công tắc, hạn ngày, trần, loại đối tác mở, mục bắt buộc | khuôn `chiToanQuyen()` |
| **(mới)** dọn phiếu đăng ký | none | none | none | none | none | any | none | none | none | none | none | tác nhân `DON_PHIEU_DANG_KY` | với người chỉ có trên bảng (ADR-0014 điều 2), không nút, không route |
| `party.verify` (đã có) | none | none | any | none | none | any | none | none | none | any | none | **rộng ra:** thêm kết luận từng mục của phiếu đăng ký | route phiếu đăng ký đòi thêm `party.view` ⇒ **Nhân sự không qua** |
| `party.verify.attachment` (đã có) | none | none | any | none | none | any | none | none | none | any | none | **rộng ra:** thêm ảnh và số đủ của phiếu đăng ký đang chờ | như trên; nhật ký trước mỗi lần mở |
| `party.view` (đã có) | any | any | any | none | none | any | none | none | none | none | none | không đổi ô; nay là **điều kiện thêm** của bước xác minh | Bán hàng, Kế toán có ô này nhưng không có `party.verify` ⇒ không qua |
| `account.create` (đã có) | none | none | none | none | none | any | none | none | none | any | none | **rộng ra:** duyệt phiếu là tạo tài khoản | ngoại lệ ADR-0071 điều 3b trong lệnh duyệt |
| `account.view` (đã có) | none | none | any | none | none | any | none | none | none | any | none | danh sách nay có tài khoản chưa kích hoạt | không đổi ô |
| `party.attachment.view` (đã có) | none | none | none | none | none | any | none | none | none | none | none | thêm hàng chờ tệp lỗi của phiếu | chỉ mã, không mở ảnh từ đây |

Người đăng ký **không có dòng nào** trong bảng quyền. Họ được canh bằng cookie đăng ký (kiểm trong thân route, danh sách route đóng có bài kiểm) và luật «đúng phiếu của phiên».

## (3) Cổng nào canh cửa nào

| Cửa | Cổng router | Hỏi thêm | Ai qua |
|---|---|---|---|
| Đọc cấu hình đăng ký; đọc chính sách riêng tư | `public` | không | mọi người; chỉ dữ liệu công khai |
| Xin mã gửi email | `public` | Turnstile (thiếu khoá thì 503), bộ đếm `dk:` theo email và địa chỉ mạng, trần tổng; hàm bảo trì cho người không có tài khoản | mọi người |
| Nhập mã | `public` | mã đúng, còn hạn, chưa quá số lần | người giữ hộp thư |
| Xem, lưu nháp, gửi, rút phiếu; tải ảnh | `public`, **thân route kiểm cookie đăng ký** (tiền lệ bước hai đăng nhập hai lớp; không thêm cổng router) | đúng phiếu của phiên; đúng trạng thái; hàm bảo trì cho lệnh ghi | người đăng ký |
| Đặt PIN | `public`, kiểm cookie đăng ký | thêm **mã email mới**; câu chốt: phiếu `ĐÃ DUYỆT`, chưa kích hoạt, còn hạn | người đăng ký đã được duyệt |
| Xem hàng chờ; xem tóm tắt một phiếu | `accounts` | ô xem hàng chờ | Quản trị, Nhân sự, Toàn quyền |
| Xem nội dung bản khai, kết luận từng mục, ba lệnh kết thúc xác minh | `accounts` | `party.verify` **và** `party.view`; phiếu `CHỜ XÁC MINH` | Quản trị, Toàn quyền |
| Xem đủ số; mở ảnh của phiếu | `accounts` | thêm `party.verify.attachment`; nhật ký trước | Quản trị, Toàn quyền |
| Duyệt; từ chối ở bước duyệt; gửi lại lời mời | `accounts` | `account.create`; câu chốt: người duyệt khác người xác minh, hoặc là Toàn quyền | Nhân sự, Toàn quyền |
| Đặt lại PIN, mở khoá, kích hoạt lại, tắt lớp hai (đã có) | `admin` / `accounts` như hôm nay | **thêm:** từ chối tài khoản chưa kích hoạt | không ai, cho tới khi kích hoạt |
| Mở, đóng đăng ký; sửa chính sách | `admin` | ô đặt chính sách | Toàn quyền |
| Hàng chờ tệp lỗi của phiếu | `office` | `party.attachment.view` | Toàn quyền |
| Việc dọn | không có route | tác nhân qua `can()` | Cron |

**Chỗ giao diện ẩn, hiện theo quyền bị đổi nghĩa:**

- **Màn Đăng nhập:** thêm lối vào đăng ký, **luôn hiện** (kể cả khi công tắc đóng, vì người có phiếu dở vẫn cần vào lại). Đây là lần đầu màn này dẫn người lạ tới một lệnh ghi.
- **Trang Quản lý tài khoản:** Quản trị, Nhân sự, Toàn quyền thấy thêm khối hàng chờ phiếu. Quản trị nay thấy dữ liệu và ảnh giấy tờ của **người chưa là đối tác**. Nhân sự nay thấy họ tên và số điện thoại của người chưa là đối tác, nhưng không thấy ảnh, số giấy tờ, ngày sinh, địa chỉ.
- **Danh sách tài khoản:** hiện thêm trạng thái «chưa kích hoạt» cho tài khoản sinh từ phiếu.
- Nút xác minh ẩn, hiện theo `party.verify` cộng `party.view`; nút duyệt theo `account.create`. Giao diện hỏi đúng bảng quyền; máy chủ kiểm lại.

## (4) Ghép giữa ba ADR, và với văn bản đang chờ

- **Ba ADR đứng trên nhau:** ADR-0207 đọc bản khai và trạng thái của ADR-0206; lô duyệt của ADR-0207 gọi câu lệnh «tệp chờ thành tệp của hồ sơ» và «ẩn danh nội dung phiếu» của ADR-0208. Thiếu một trong ba thì không phát hành được. Thứ tự thi công hợp lý: 0206, rồi phần tải ảnh của 0208, rồi 0207, rồi phần tác nhân của 0208.
- **Điều Hiến chương đề xuất** (`DE-XUAT-HIEN-CHUONG.md`) gom hai luật chung của ba ADR; ngoại lệ «máy tự xoá» của ADR-0208 chỉ hợp lệ khi điều này được duyệt.
- **Lượt B của đợt 1** (cấp độ đại lý mặc định; dấu xác minh): thêm một câu vào lô duyệt và đọc `pty_verification`. Lô của ADR-0207 đã chừa chỗ; duyệt lượt A không buộc phải duyệt lượt B.
- **Đợt 2 (tổ chức):** mở loại phiếu «tổ chức» và gỡ chốt «chỉ hồ sơ cá nhân» cho riêng lệnh duyệt. Lượt A không chạm chốt đó.
- **Đợt 5 (người đã có tài khoản tự nộp giấy tờ):** dùng lại màn xác minh và cách giữ tệp; đường tải ảnh của họ đi qua lớp chống ghi trùng nên phải giải `BL-TEP-PHAT-LAI-500` trước. Lượt A không mở việc đó.
- **ADR-0200 Đ4** (xin xoá tài khoản, đang chờ HC-5.19): phải có trước khi bản có đăng ký lên hai kho ứng dụng. Lượt A không sửa ADR-0200.
- **ADR-0121** (bắt buộc hai lớp cho đối tác): đã duyệt, chưa thi công. Tài khoản sinh từ phiếu đăng nhập bằng số điện thoại và PIN cho tới lúc đó.
- **ADR-0203, 0204, 0205** đang ở ba nhánh khác (phí đón theo cấp; mã giao dịch khoản nộp; nhập giá cũ): không chạm bảng hay ô nào ở trang này.

## Lỗ đang hở chạm lượt này

`docs/quyen-hoan.json` mục **HC-5.19** (chưa diễn tập khôi phục dữ liệu, mức HIGH, hạn 31/12/2026). Cả ba ADR ghi «xây trên lỗ đang hở: HC-5.19» kèm lý do xin phép. Không mục nào khác trong sổ chạm các ô ở trang này.
