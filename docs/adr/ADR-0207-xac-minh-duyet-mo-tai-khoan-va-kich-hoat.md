# ADR-0207 — Xác minh phiếu đăng ký, duyệt mở tài khoản và kích hoạt: hai bước, hai người

- **Trạng thái:** **proposed** 2026-11-15 — AI soạn theo khung đã được chủ duyệt **hướng** ngày 15/11 (`docs/superpowers/specs/2026-11-15-dang-ky-va-duyet-tai-khoan/`). Chờ chủ duyệt; AI không tự duyệt (Hiến pháp N3). Trang trình chủ: `docs/superpowers/specs/2026-11-15-dang-ky-dot-1-luot-a/TRINH-CHU.md`.
- **Số:** 0207 (số lớn nhất trên mọi nhánh và worktree lúc cấp là 0205; 0206 cấp cùng lượt). Tên giữ chỗ trong khung: `ĐK-2`.
- **Nguồn:** lời chủ 15/11: «đăng ký - phê duyệt tài khoản»; và hai lựa chọn chủ đã duyệt cùng ngày: phiếu trước, tài khoản sau; chưa bắt buộc bảo mật hai lớp cho tài khoản tự đăng ký.
- **Ngày:** 2026-11-15. **Loại:** việc lớn — quyền (ai xác minh, ai duyệt, tách nhiệm vụ), dữ liệu (lệnh duyệt sinh hồ sơ và tài khoản), tài khoản (một đường đặt PIN mới). Người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều về luật ai làm bước nào; **một chiều** về dữ liệu đã sinh (hồ sơ, tài khoản, dòng xác minh ở lại) và về dữ liệu đã xem (đã thấy số giấy tờ thì không thu hồi được).
- **Sửa sau lượt soát độc lập 15/11** (chỉ đọc): câu chốt làm hỏng cả lô bằng trigger; tài khoản tắt cho tới khi kích hoạt; nhật ký duyệt dùng `staff_created` trỏ đúng tài khoản; biến thể mới của đường tạo tài khoản; thứ tự lô, người tạo dòng đồng ý, giờ của dòng xác minh; kiểm trùng căn cước trước lô; Toàn quyền không bị máy kiểm vế «khi không còn ai».
- **Quan hệ với ADR cũ:**
  - **ADR-0125 đ5** («người xác minh khác người tạo tài khoản»): áp vào ca mới. Với phiếu đăng ký, người duyệt là người tạo tài khoản, nên người duyệt phải khác người xác minh. Giữ khuôn «Toàn quyền là chốt cuối, có cờ».
  - **ADR-0125 đ1, đ6:** dùng lại hai ô `party.verify`, `party.verify.attachment`, luật «nhật ký ghi trước mỗi lần mở», «lý do thuộc danh sách đóng», «xử lý xong thì không xem lại nội dung khai». **Hẹp hơn ADR-0125 ở một điểm:** bước xác minh phiếu đăng ký đòi thêm quyền xem Danh bạ, nên Nhân sự không làm bước này.
  - **ADR-0071 điều 3b** (người không xem Danh bạ chỉ dùng được hồ sơ họ được thấy): lệnh duyệt là **ngoại lệ có tên**. Nhân sự duyệt «gắn vào hồ sơ có sẵn» với hồ sơ do người xác minh chọn, dù không thấy hồ sơ đó.
  - **ADR-0071 điều 1b:** giữ nguyên. Quản trị không tạo tài khoản; duyệt mở tài khoản dùng ô `account.create`.
  - **ADR-0016 Đ2a:** áp tinh thần «nhập lại chìa khoá ngay trước khi đổi chìa khoá» cho việc đặt PIN lần đầu (đòi mã email mới).
  - **ADR-0121:** chưa thi công; ADR này không thi hành nó. Tài khoản tự đăng ký đăng nhập bằng số điện thoại và PIN như mọi đối tác hôm nay (chủ chọn ngày 15/11).
  - **ADR-0001** (số đăng nhập khác số liên hệ): giữ. Số điện thoại ở phiếu thành số đăng nhập và cũng được ghi thành một liên hệ của hồ sơ.
- **Xây trên lỗ đang hở: HC-5.19** — cùng lý do xin phép với ADR-0206. Thêm: lệnh duyệt ghi vào bảng hồ sơ và bảng tài khoản bằng **các đường ghi sẵn có**; khôi phục D1 về trước một lần duyệt thì hồ sơ và tài khoản của lần đó mất cùng nhau (một lô), phiếu trở lại trạng thái trước duyệt và duyệt lại được.
- **Hiến chương áp:** 1.2, 2.1, 2.3, 5.1, 5.3, 5.8, 5.12, 5.16, 5.20, 5.23; điều mới đề xuất. **Lệch có chủ ý:** không.
- **Số quyết định chạm quyền/dữ liệu:** 1 (cùng lượt với ADR-0206, ADR-0208 — tổng 3).

## Bối cảnh

ADR-0206 giữ người đăng ký ở ngoài cho tới khi có người duyệt. ADR này định ai xem phiếu, ai quyết, và lệnh duyệt ghi gì.

Bốn dữ kiện từ mã (đọc 15/11):

- Hai ô xác minh thuộc Quản trị, Nhân sự, Toàn quyền. Quyền xem Danh bạ (`party.view`) thuộc Bán hàng, Kế toán, Quản trị, Toàn quyền; **Nhân sự không có**. Ô tạo tài khoản (`account.create`) thuộc Nhân sự, Toàn quyền; **Quản trị không có**.
- Hàm tìm hồ sơ có thể trùng chỉ xét hồ sơ cá nhân, khớp theo số điện thoại liên hệ đang mở hoặc theo tên; người không xem Danh bạ chỉ nhận kết quả thu hẹp.
- Đường tạo tài khoản theo vai trò luôn sinh một PIN và trả PIN đó cho người tạo. Đã có sẵn luật kiểm PIN do người dùng tự đặt và câu ghi đặt PIN.
- Lính gác tách nhiệm vụ của ADR-0125 đọc nhật ký theo ba tầng (tạo tài khoản; chạm vĩnh viễn; chạm trong 30 ngày). Thêm hành động nhật ký mới thuộc nhóm tài khoản thì phải xếp tầng và tạo lại view.

Vì chỉ Quản trị và Toàn quyền vừa xác minh được vừa xem được Danh bạ, còn chỉ Nhân sự và Toàn quyền tạo được tài khoản, cách chia tự nhiên là: **Quản trị xác minh, Nhân sự duyệt**.

## Quyết định

**Đ1 — Hai bước, hai người.**

| Bước | Ai | Hỏi ô nào |
|---|---|---|
| Xác minh và đối chiếu Danh bạ | Quản trị, Toàn quyền | `party.verify` **và** `party.view`; mở ảnh, xem số đủ thì thêm `party.verify.attachment` |
| Duyệt mở tài khoản | Nhân sự, Toàn quyền | `account.create` |

Người duyệt phải **khác** người xác minh. «Người xác minh» là người đã bấm kết luận «đạt» cho bản khai được duyệt. Ngoại lệ duy nhất: **Toàn quyền** làm được cả hai bước. Máy **không** kiểm vế «khi không còn ai hợp lệ» (giống cách lính gác xác minh hôm nay cư xử với Toàn quyền); vế đó dựa vào kỷ luật. Khi Toàn quyền làm cả hai bước, dòng quyết định của phiếu (bảng mới, Đ5) mang cờ, các dòng `pty_verification` sinh ra mang cờ ở cột `verifier_touched_account` sẵn có, và hàng chờ đã xử lý hiện cờ đó. Điều kiện nằm **trong trigger của câu chốt** (Đ5), không chỉ kiểm trước ở máy chủ. Không thêm ô quyền nào cho hai bước này.

**Đ2 — Bước xác minh.** Chỉ làm được khi phiếu ở `CHỜ XÁC MINH`. Người xác minh:

1. xem nội dung bản khai hiện hành; số giấy tờ hiện dạng che, bấm xem đủ thì ghi nhật ký **trước** (khuôn ADR-0125 đ1);
2. kết luận **từng mục** bắt buộc: đạt, hoặc không đạt kèm một lý do thuộc danh sách đóng (Đ3); kết luận là dòng chỉ-thêm gắn với phiên bản bản khai;
3. đánh dấu «đã gọi số điện thoại này» (một mục bắt buộc, vì Nền tảng không xác nhận số bằng mã);
4. **đối chiếu Danh bạ:** máy đưa ra hồ sơ có thể trùng theo số điện thoại, tên, và **số giấy tờ** (thêm so với hôm nay); người xác minh chọn «gắn vào hồ sơ có sẵn» (chỉ đúng một hồ sơ) hoặc «hồ sơ mới». Hồ sơ đích phải qua đúng các điều kiện sẵn có của đường «tạo tài khoản trên hồ sơ có sẵn»: hồ sơ cá nhân, đang dùng, chưa gộp, chưa có tài khoản, không lẫn nhóm vai trò;
5. tuỳ chọn: chọn hồ sơ của người giới thiệu, nếu tìm thấy;
6. kết thúc bằng một trong ba lệnh: **«đạt»** (mọi mục bắt buộc đạt, đã có kết luận Danh bạ; phiếu sang `CHỜ DUYỆT`), **«cần bổ sung»** (phiếu về người đăng ký), **«từ chối»** (phiếu kết thúc).

Xử lý xong, người xác minh không xem lại được nội dung khai hay ảnh (ADR-0125 đ6); hàng chờ đã xử lý chỉ hiện mã phiếu, loại, kết luận, người xử lý, lúc.

**Đ3 — Lý do thuộc danh sách đóng, không ô chữ tự do.** Chín mã. Bảy mã dùng lại từ phiếu tự khai (`src/shared/xac-minh-hien-thi.ts`; bỏ mã «hồ sơ đã gộp» vì không áp cho phiếu đăng ký). Trong bảy mã đó, mã «số giấy tờ đã thuộc hồ sơ khác» cũng dùng cho ca số điện thoại đã có tài khoản, và hiện cho người đăng ký bằng một câu trung tính («thông tin này đã có trong hệ thống»), **không** nói «đã có tài khoản». Hai mã mới: không liên lạc được số điện thoại; không thuộc diện đối tác của công ty. **Người đăng ký nhìn thấy lý do** ở trang trạng thái và trong thư — đây là điều mới người ngoài nhìn thấy (hôm nay người tự khai không thấy lý do). Câu chữ từng lý do viết cho người ngoài đọc và do chủ chọn.

**Đ4 — Bước duyệt.** Chỉ làm được khi phiếu ở `CHỜ DUYỆT`; Nhân sự chỉ thấy các phiếu ở trạng thái này (và danh sách đã xử lý dạng mã). Người duyệt thấy: họ tên, số điện thoại, loại đối tác xin, kết luận xác minh, kết luận Danh bạ («gắn hồ sơ có sẵn» hay «hồ sơ mới», không kèm tên hồ sơ nếu người duyệt không xem được Danh bạ). **Không** thấy ảnh, số giấy tờ, ngày sinh, địa chỉ. Người duyệt chọn vai trò đối tác (mặc định là loại người đăng ký xin; luật gán vai trò sẵn có áp nguyên), rồi bấm duyệt hoặc từ chối kèm lý do.

**Đ5 — Lệnh duyệt là một lô** (`db.batch`, Hiến chương 1.2 và K8).

**Câu chốt làm hỏng cả lô, không chỉ khớp 0 dòng.** `db.batch` không tự bỏ các câu sau khi một câu `UPDATE` khớp 0 dòng, và các câu ghi sẵn có của `staff`, `parties` không mang điều kiện. Vì vậy câu đầu của lô là một câu **chèn dòng quyết định** vào một bảng mới của `dang-ky` (tên giữ chỗ «quyết định của phiếu», chỉ thêm). Trigger `BEFORE INSERT` của bảng đó `RAISE` — làm cả lô thất bại — nếu thiếu một trong các điều kiện: phiếu còn ở `CHỜ DUYỆT`; đúng phiên bản bản khai đã xác minh; đã có kết luận Danh bạ; người duyệt khác người xác minh, **trừ khi** dòng quyết định mang cờ «Toàn quyền làm cả hai bước». Trigger chỉ đọc bảng `dk_*` (Hiến chương 5.3), nên không tự biết ai giữ Toàn quyền (quyền nằm ở bảng của `staff`): **máy chủ** đặt cờ đó lên dòng quyết định sau khi `can(người duyệt, "admin.manage.superadmin")` trả đúng. Nói thẳng: ca thường (hai người khác nhau) do cơ sở dữ liệu canh; miễn trừ cho Toàn quyền dựa vào kiểm ở máy chủ, giống lính gác xác minh hôm nay. Máy chủ dịch lỗi đó thành 409 bằng hàm sẵn có `ruleViolation`. Nhờ vậy các câu ghi sẵn có ở sau dùng lại được nguyên.

**Kiểm trước, ngoài lô** (để trả câu báo rõ thay vì lỗi thô): số điện thoại chưa có tài khoản; hồ sơ đích (nếu gắn) còn hợp lệ; số căn cước chưa thuộc hồ sơ khác (trigger sẵn có `pty_person_document_cccd_one_person_ins` sẽ làm hỏng lô nếu trùng). Trúng một điều thì 409 kèm câu nói rõ phải làm gì (trả phiếu về bước xác minh, hoặc từ chối); các trigger vẫn là lưới cuối.

**Thứ tự câu trong lô** (mỗi module cấp câu lệnh chưa chạy cho bảng của mình; thứ tự theo khoá ngoại và trigger sẵn có):

1. `dang-ky`: câu chốt (dòng quyết định);
2. `parties`: tạo hồ sơ cá nhân mới, hoặc dùng hồ sơ có sẵn; mở vai trò đối tác trên hồ sơ (phải đứng trước câu cấp quyền, vì trigger «quyền Đối tác phải có vai trò đối tác» kiểm lúc chèn quyền);
3. `staff`: một **biến thể mới** của đường tạo tài khoản: chỉ sinh dòng tài khoản và quyền cho một hồ sơ đã có (vừa tạo ở câu 2, hoặc hồ sơ có sẵn), **không** sinh hồ sơ hay vai trò, và không áp chốt ADR-0071 điều 3b (ngoại lệ có tên). Hàm `createAccountWithRolesStatements` hiện có tự sinh hồ sơ và trả «không tìm thấy hồ sơ» cho Nhân sự ở hồ sơ có sẵn, nên không dùng nguyên được. Tài khoản tạo với **`active = 0`** (Đ7);
4. `parties`: ghi giá trị đã xác minh: ngày sinh; địa chỉ; dòng giấy tờ (hồ sơ có sẵn đã có dòng hiện hành cùng loại thì là dòng gia hạn, và ảnh của dòng cũ vào danh sách xoá theo luật sẵn có); số điện thoại và email liên lạc thành liên hệ nếu hồ sơ chưa có đúng liên hệ đó;
5. `parties`: một dòng `pty_verification` cho từng mục đã đạt mà có đích tương ứng (thuộc tính, liên hệ, giấy tờ), **ghi người xác minh và giờ xác minh** (không phải người duyệt, giờ duyệt). Các mục không có đích (loại đối tác, «đã gọi», ảnh) chỉ nằm ở bảng kết luận của phiếu;
6. `parties`: dòng `pty_consent` chép từ bản khai: đúng phiên bản chính sách người đăng ký đã đồng ý, giờ đồng ý ghi trong bản khai, **người tạo là tài khoản mới** (câu 3 đã đứng trước);
7. `parties`: tệp của phiếu thành tệp của hồ sơ (ADR-0208 Đ5);
8. `parties`: dòng quan hệ với người giới thiệu, nếu Đ2 mục 5 đã chọn (một loại quan hệ mới, thêm bằng migration; chỉ ghi nhận, không sinh tiền);
9. `dang-ky`: phiếu sang `ĐÃ DUYỆT`, ghi mã hồ sơ và tài khoản kết quả; ẩn danh nội dung bản khai, **trừ danh tính và email liên lạc**, giữ tới khi kích hoạt (ADR-0208 Đ6);
10. `audit`: dòng nhật ký (Đ6).

Lô chừa chỗ cho hai việc của lượt B (cấp độ đại lý mặc định; dấu xác minh) mà không đổi thứ tự trên. PIN do máy sinh cho dòng tài khoản (cột bắt buộc) **không trả về cho ai và không hiện ở đâu**.

**Đ6 — Nhật ký của lệnh duyệt dùng lại hành động sẵn có `staff_created`**: `target_type = 'staff'`, `target_id` = mã tài khoản mới, người làm = người duyệt, mã phiếu và tên vai trò ở phần chi tiết. Hành động này đã nằm ở tầng «tạo tài khoản» của view lính gác ADR-0125 đ5b (`v_aud_cham_tai_khoan` lọc theo `target_type = 'staff'` và mã tài khoản), nên **không phải tạo lại view**. Hệ quả: người đã duyệt một phiếu thì về sau không xác minh được các phiếu tự khai của chính tài khoản đó. Kết luận xác minh, xem đủ số, mở ảnh dùng hành động mới, đích là phiếu.

**Đ7 — Kích hoạt: tài khoản tắt cho tới khi người dùng tự đặt PIN; không cấp phiên.**

- **Tài khoản sinh ra ở trạng thái tắt** (`active = 0`). Hàm xác thực PIN sẵn có của `staff` trả «không đúng» cho tài khoản tắt trước khi ghi phiên, và tài khoản mới chưa có Face ID nào, nên PIN ngẫu nhiên do máy sinh không dùng được. Giao diện gọi trạng thái này là «Chưa kích hoạt», không phải «Đã ngưng»; nhận ra bằng cách tài khoản có phiếu `ĐÃ DUYỆT` chưa có mốc kích hoạt.
- Với tài khoản chưa kích hoạt, máy chủ **từ chối** các lệnh hỗ trợ đăng nhập sẵn có: đặt lại PIN, mở khoá đăng nhập, kích hoạt lại, tắt lớp hai. Đường duy nhất là «gửi lại lời mời». Nhờ vậy câu «không ai trong công ty biết PIN» đúng thật.
- Người được duyệt vào lại trang trạng thái bằng phiên đăng ký (danh tính email còn giữ, ADR-0208 Đ6), rồi **xin một mã email mới** ngay trước khi đặt PIN. Một phiên đăng ký đang mở sẵn là chưa đủ (tinh thần ADR-0016 Đ2a), để kẻ cầm được máy đang mở phiên không chiếm được tài khoản.
- Route (công khai, kiểm cookie đăng ký, tên giữ chỗ `POST /api/dang-ky/phieu/dat-pin`) chỉ chạy khi phiếu `ĐÃ DUYỆT`, chưa có mốc kích hoạt và còn trong hạn kích hoạt (dữ liệu chính sách; đề xuất 14 ngày). PIN kiểm bằng luật sẵn có (`validateFreshPin`).
- **Một lô, có câu chốt cùng khuôn Đ5:** câu đầu chèn dòng «đã kích hoạt» vào bảng quyết định của phiếu, trigger `RAISE` nếu phiếu chưa duyệt, đã kích hoạt, hay quá hạn; sau đó đặt PIN và bật `active = 1` bằng câu ghi của `staff`; ẩn danh danh tính và email của phiếu; một dòng nhật ký do chính tài khoản mới đứng tên (không dùng `staff_reactivated`, để không ghi «chạm tài khoản» thay cho một người quản trị). Sau lô, phiên đăng ký kết thúc.
- **Không cấp phiên `td_session`.** Người dùng sang màn Đăng nhập và đăng nhập như mọi người, rồi được mời bật Face ID (ADR-0016). Bài «bốn cửa cấp phiên» giữ nguyên bốn cửa.
- Đây là **một đường đặt PIN mới**: phải khai vào các bài rào về bí mật đăng nhập của `staff`. Đường này đóng vĩnh viễn với một tài khoản ngay khi có mốc kích hoạt.
- Quá hạn kích hoạt: người duyệt bấm «gửi lại lời mời» (mở lại hạn, có nhật ký). Hết hạn mà không ai gửi lại thì tài khoản vẫn tắt, và tác nhân dọn phiếu ẩn danh danh tính (ADR-0208). Tài khoản chưa kích hoạt hiện ở hàng chờ để Nhân sự theo dõi.

**Đ8 — Bảo mật hai lớp:** lệnh duyệt và bước kích hoạt **không** tự bật lớp hai (chủ chọn ngày 15/11). Sau lần đăng nhập đầu, giao diện mời bật, điền sẵn email đã xác nhận. Việc bắt buộc lớp hai cho đối tác là việc của ADR-0121, làm riêng.

**Đ9 — Route của người trong công ty** (cổng `accounts`; thân route hỏi ô theo Đ1): xem hàng chờ; xem một phiếu; kết luận từng mục; xem đủ số; ba lệnh kết thúc xác minh; duyệt; từ chối; gửi lại lời mời. Các route này đi qua lớp chống ghi trùng như mọi route có đăng nhập. Giao diện đặt cạnh hàng chờ xác minh sẵn có ở trang Quản lý tài khoản.

## Phương án bị loại

- **Một người làm cả hai bước:** nhanh hơn, nhưng một người tự đăng ký một đối tác giả rồi tự duyệt là đúng kẽ hở ADR-0125 đã bịt.
- **Nhân sự xác minh như với phiếu tự khai:** Nhân sự không xem Danh bạ, nên không ai đối chiếu trùng hồ sơ trước khi sinh hồ sơ.
- **Cho Quản trị duyệt mở tài khoản:** trả lại cho Quản trị việc tạo tài khoản mà ADR-0071 đã lấy đi.
- **Máy gửi PIN qua thư, hoặc người duyệt đọc PIN cho đối tác:** bí mật đi qua thư hoặc qua một người thứ ba.
- **Kích hoạt xong vào thẳng Nền tảng:** phải thêm cửa cấp phiên thứ năm, và vướng luật `auth` không gọi `audit`.
- **Tự bật yếu tố email lúc kích hoạt:** chủ chọn chưa bắt buộc; bật yếu tố đầu còn kéo theo mã dự phòng và màn riêng.

## Bài kiểm (đỏ trước, xanh sau)

- Bảng quyền: Nhân sự gọi route xác minh và route xem đủ số của phiếu đăng ký: 403. Quản trị gọi route duyệt: 403. Bán hàng, Kế toán, Đối tác gọi bất kỳ route nào ở Đ9: 403.
- Tách nhiệm vụ: Toàn quyền A xác minh, Nhân sự B duyệt: được. Toàn quyền A xác minh rồi A duyệt: được, và dòng duyệt mang cờ. Một tài khoản giữ cả Quản trị lẫn Nhân sự xác minh rồi tự duyệt: bị từ chối ở câu ghi. Hai người bấm duyệt cùng lúc: đúng một lô thắng.
- Lệnh duyệt: sau một lần duyệt có đúng một hồ sơ (hoặc không hồ sơ mới, khi gắn), một tài khoản, vai trò, quyền, dòng xác minh cho từng mục, dòng đồng ý, một dòng nhật ký; giả lỗi ở câu giữa lô thì không còn dòng nào trong số đó. Phản hồi của route không chứa PIN. **Câu chốt:** phiếu vừa bị từ chối hay trả về giữa lúc người duyệt bấm thì lô thất bại toàn bộ, không sinh hồ sơ hay tài khoản, route trả 409. Số căn cước đã thuộc hồ sơ khác: 409 trước lô, không lỗi thô.
- Tài khoản vừa duyệt: đăng nhập bằng PIN và Face ID đều bị từ chối; đặt lại PIN, mở khoá, kích hoạt lại, tắt lớp hai do Quản trị hay Toàn quyền gọi đều bị từ chối; «gửi lại lời mời» chạy được.
- Gắn hồ sơ có sẵn: không sinh hồ sơ mới; hồ sơ đích đã có tài khoản, đã gộp, đang ngưng, hoặc là tổ chức: 409, không ghi gì. Nhân sự duyệt được dù không thấy hồ sơ đích.
- Số điện thoại đã có tài khoản: 409, không ghi gì; câu báo không lộ tài khoản đó là của ai.
- Lính gác ADR-0125: dòng `staff_created` của lệnh duyệt trỏ đúng mã tài khoản mới; người đã duyệt phiếu không xác minh được phiếu tự khai về sau của tài khoản đó (đi đường xác minh thật). Các hành động nhật ký mới đích là phiếu nên bài vét cạn tầng ở `cham-tai-khoan.test.ts` phải xếp chúng là «không chạm tài khoản».
- Kích hoạt: thiếu mã email mới: từ chối. Đặt PIN lần hai: từ chối (câu chốt). Quá hạn: từ chối cho tới khi có «gửi lại lời mời». Sau kích hoạt tài khoản bật, không có cookie `td_session`; đăng nhập bằng số điện thoại và PIN vừa đặt thì vào được. Không có dòng `staff_reactivated` nào.
- Người xác minh đã xử lý xong gọi lại route xem phiếu: không còn nội dung khai. Mỗi lần xem đủ số có một dòng nhật ký ghi trước, không chứa số.
- Lịch sử phiếu, `audit_log`, phản hồi lỗi: không chứa số điện thoại, email, số giấy tờ.
- e2e cho chuỗi gửi → xác minh → duyệt → kích hoạt → đăng nhập; kịch bản Chrome cho hàng chờ và màn một phiếu.

## Người dùng sẽ thấy

Quản trị mở hàng chờ, xem từng mục của phiếu, mở ảnh giấy tờ, gọi cho người đăng ký, soát Danh bạ rồi bấm đạt, yêu cầu bổ sung, hoặc từ chối. Nhân sự thấy các phiếu đã xác minh, chọn vai trò và bấm duyệt; Nhân sự không thấy ảnh hay số giấy tờ. Người đăng ký nhận thư «đã duyệt», vào lại trang trạng thái, nhập mã mới, tự đặt PIN, rồi đăng nhập ở màn Đăng nhập. Phiếu cần bổ sung hay bị từ chối thì người đăng ký thấy lý do.

## Hệ quả

- Hàng rào phải sửa cùng lúc: `src/shared/permissions.test.ts` (ảnh chụp bảng quyền, hàng mới), ảnh chụp cổng, bài tầng nhật ký, các bài về bí mật đăng nhập của `staff`, `scripts/audit-checks.mjs` (bất biến mới: phiếu `ĐÃ DUYỆT` khi và chỉ khi có tài khoản kết quả; tài khoản sinh từ phiếu luôn có hồ sơ mang vai trò đối tác). Dòng mới ở `docs/SO-HANG-RAO.md`.
- `staff` và `parties` công bố thêm câu lệnh chưa chạy cho lô duyệt. `staff` có thêm một biến thể của đường tạo tài khoản (chỉ tài khoản và quyền, `active = 0`); đường tạo tài khoản sẵn có của Nhân sự không đổi hành vi. Các lệnh hỗ trợ đăng nhập sẵn có thêm một điều kiện từ chối cho tài khoản chưa kích hoạt; nhận ra «chưa kích hoạt» qua một hàm tra do `dang-ky` công bố (gốc lắp ráp tiêm, khuôn `ctx.isAssigned`).
- Tài khoản tắt không giữ Face ID và phiên sống nào, nên các bất biến sẵn có về tài khoản ngưng (`R-AUT-1`, `R-AUT-SESSION-2`) vẫn đúng.
- Cảnh báo sẵn có «tài khoản không có quyền nào» không bắn, vì tài khoản đã có quyền từ lúc duyệt.
- **Phải nói thẳng:**
  - Cần **hai người** cho mỗi phiếu. Công ty chỉ có một người giữ vai phù hợp thì mọi phiếu dồn về Toàn quyền và đều mang cờ.
  - Hai người thông đồng thì luật này không bắt được; lớp bù là nhật ký (cùng giới hạn ADR-0125 đã nói).
  - Số điện thoại chỉ được xác nhận bằng một cuộc gọi do người xác minh tự khai là đã gọi; máy không kiểm được.
  - Tài khoản mới đăng nhập chỉ bằng số điện thoại và PIN cho tới khi ADR-0121 được thi công.
  - Hàm tìm hồ sơ có thể trùng chỉ xét hồ sơ cá nhân; khớp theo tên có thể sót người viết tên khác đi.
