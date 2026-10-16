# ADR-0125 — Người xác minh hồ sơ: Quản trị và Nhân sự (đảo ADR-0083 đ2, thêm ô cho Nhân sự)

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-16: *"duyệt cả ba, bịt kẽ hở 30 ngày"* (lượt 4; văn bản đề xuất: `docs/superpowers/specs/2026-10-16-ho-so-rieng-tu-va-2fa/DE-XUAT-ADR.md`, mục ADR-H5; "H5" là số giữ chỗ, nay là 0125; ADR-0122 nói "ADR-H5" tức ADR này).
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Chưa có người kiểm độc lập đọc văn bản; người kiểm đọc sau khi thi công.
- **Ngày:** 2026-10-16.
- **Loại:** việc lớn (quyền). Hai chiều với ô quyền (gỡ bằng một commit); **một chiều với dữ liệu đã xem** (đã thấy số thì không thu hồi được). Cần người kiểm độc lập; trang ghép `TRANG-GHEP.md`.
- **Quan hệ với ADR cũ:** thay ADR-0083 đ2 ("chỉ Toàn quyền xem được" số đủ — ảnh giấy tờ chứa số đủ) và câu Hệ quả "Quản trị không xem đủ số giấy tờ nữa"; thay ADR-0071 đ1e ở cụm "HCNS **không** có: … Danh bạ khách/đại lý" — **chỉ trong phạm vi trường khai và ảnh của phiếu đang chờ** (Nhân sự vẫn không vào Danh bạ), và chọn đường "thêm ô cho cột HR" thay vì "gán thêm vai khác". Phần "hỗ trợ đăng nhập" của đ1e giữ nguyên. Không sửa văn bản ADR cũ.
- **Xây trên lỗ đang hở:** không có.
- **Hiến chương áp:** K4, 5.8, 5.12, 5.23.

## Bối cảnh
Chủ chốt 2026-10-16: Quản trị xác minh, "cho phép luôn cả bộ phận nhân sự làm việc này". Khoảng 1000 đối tác nên cần 1000–3000 lượt xác minh lần đầu. ADR-0071 đ1b cho Nhân sự ba thao tác tài khoản; đ1e cấm các ô nghiệp vụ khác.

## Quyết định
1. Hai ô mới, **tách khỏi** quyền xem toàn hồ sơ: `party.verify` (hàng chờ, chấp nhận hay từ chối, thấy trường khai của phiếu) và `party.verify.attachment` (mở ảnh, thấy số đủ **chỉ của phiếu đang chờ**, nhật ký ghi **trước** mỗi lần mở). Cột: ADMIN any, HR any, SUPER_ADMIN any; mọi cột khác none.
2. Không ai trong ADMIN, HR có `party.document.reveal` chung. HR vẫn `party.view = none` (không vào Danh bạ) và `party.personal.view = none`.
3. Cấp bậc `canManageAccount`: Quản trị không xác minh phiếu của tài khoản ADMIN hay SUPER_ADMIN; Nhân sự không xác minh phiếu của ADMIN, SUPER_ADMIN, HR (ADR-0071 đ1c). Người xác minh khác người khai.
4. Phạm vi của Nhân sự: **mọi phiếu** — nhân viên, đối tác và khách có tài khoản (chủ chốt 16/10) — vẫn chỉ thấy ảnh và số của phiếu đang xử lý, trừ tài khoản không quản được (đ3).
5. **Tách nhiệm vụ (chống tự xác minh qua tài khoản giả).** Người xác minh phải khác: (a) người khai; (b) người đã **tạo** tài khoản chủ phiếu (không giới hạn thời gian); (c) người đã **chạm quyền truy cập** tài khoản chủ phiếu.
   - **Bịt kẽ hở 30 ngày (chủ duyệt 2026-10-16):** với hai hành động **trao quyền đăng nhập thay** là **đặt lại PIN** và **tắt lớp hai của người khác** (kể cả "mở lại 24 giờ" và đặt ngoại lệ tạm ở ADR-0121), vế (c) áp **vĩnh viễn**, không giới hạn thời gian. Với các hành động còn lại (gỡ Face ID, mở khoá đăng nhập, đổi quyền hay gán vai, đổi SĐT đăng nhập) vế (c) áp trong cửa sổ **30 ngày trước lúc gửi phiếu** tới lúc xác minh. Mốc 30 ngày tính từ lúc **gửi phiếu**, không từ lúc xác minh.
   - "Chạm quyền truy cập" là một danh sách hằng có bài kiểm.
   - Không còn người xác minh hợp lệ (Quản trị, Nhân sự) thì phiếu hiện "Chuyển Toàn quyền". Toàn quyền chịu (a); với (b)(c) Toàn quyền là chốt cuối, được xác minh nhưng dòng `pty_verification` mang cờ "người xác minh từng tạo hay chạm tài khoản này" và hiện ở hàng chờ đã xử lý.
   - **Nguồn dữ kiện:** đọc `audit_log` (module `audit`); các sự kiện `staff_created`, `pin_reset`, `passkey_removed`, `login_unlocked`, `permission_changed`, `account_roles_changed`, `staff_updated` (đổi SĐT) và `mfa_reset` (tắt lớp hai của người khác) đã được ghi cùng lô với chính thay đổi. Hai hành động của ADR-0121 là "mở lại 24 giờ" và "ngoại lệ tạm" **chưa có tên sự kiện**: lát thi công phải đặt tên, ghi cùng lô và đưa vào bài danh sách hằng "chạm quyền truy cập", nếu không vế vĩnh viễn hở mà không bài nào đỏ. `staff_updated` gộp mọi lần sửa hồ sơ nên muốn bắt riêng "đổi SĐT đăng nhập" phải đọc phần chi tiết của sự kiện. Module `audit` công bố qua `index.ts` một lính gác dạng `NOT EXISTS (…)` hoặc view `v_aud_*`, gốc lắp ráp tiêm vào `parties` (cùng khuôn `ctx.isAssigned`). Lính gác nằm **trong câu ghi** chấp nhận hay từ chối, không chỉ kiểm trước ở máy chủ.
   - **Giới hạn nói thẳng:** tài khoản tạo trước khi có nhật ký, hoặc do đồng bộ Sheet (`staff_id` rỗng), coi như không có người tạo nên (b) không chặn ai. Hai người thông đồng (một người tạo, người kia xác minh) **không** bị luật này bắt; lớp bù là nhật ký và cờ kiểm trùng. Cùng vùng với D-2 của kiểm toán 13/10 (Nhân sự tạo tài khoản Bán hàng rồi đăng nhập), chưa vá.
6. **Người xác minh không sửa trường khai.** Chỉ hai nút: Chấp nhận nguyên văn, hoặc Từ chối kèm lý do thuộc **danh sách đóng** (không ô chữ tự do). Sau khi phiếu xử lý xong, Nhân sự và Quản trị **không** xem lại trường khai hay ảnh; hàng chờ đã xử lý chỉ hiện mã phiếu, loại, kết luận, người xử lý, lúc. Quản trị xem giá trị đã chấp nhận qua Danh bạ theo ô sẵn có; Nhân sự không có đường nào.

## Phương án đã loại
Một vai "Người xác minh hồ sơ" riêng với mã quyền mới (chủ chốt 16/10: không lập vai riêng). Thêm một mã quyền nhân đôi mọi bài "tập con quyền" (1024 lên 2048) và cần migration; bị loại.

## Hàng rào phải sửa cùng commit
Bài ghim nguyên dòng HR và ảnh chụp bảng quyền (`src/shared/permissions.test.ts`), dòng sổ hàng rào, bài mới "HR đúng năm ô", bài route 403, bài tách nhiệm vụ (đ5, gồm ca vĩnh viễn và ca 30 ngày).

## Tiêu chí nghiệm thu (P20)
- Bài đỏ trước, xanh sau, cho từng ô và từng vế tách nhiệm vụ: người khai, người tạo, người chạm quyền trong 30 ngày, người từng đặt lại PIN (vĩnh viễn, kể cả sau 31 ngày).
- Nhân sự mở ảnh của phiếu đang chờ được; phiếu đã xử lý hay hồ sơ không phải phiếu thì 403; Nhân sự vẫn không vào Danh bạ.
- Mỗi lần mở ảnh có nhật ký ghi trước, không chứa số giấy tờ.
- Lính gác nằm trong câu ghi: hai người xác minh cùng lúc không qua được lính gác.
