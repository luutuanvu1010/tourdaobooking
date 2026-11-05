# Bảng tham chiếu ngôn ngữ

> Do máy sinh, đừng sửa tay; sửa ở `src/shared/bang-tham-chieu*.ts` rồi chạy `npm run tham-chieu`. Quyết định: `docs/adr/ADR-0167-bang-tham-chieu-ngon-ngu.md`.

Mỗi khái niệm một tên, mỗi tên một nghĩa, tra từ một nguồn. Viết hay sửa chữ giao diện thì tra ở đây trước; chưa có thì đưa 2 đến 3 tên cho chủ chọn, không tự đặt. Chữ đã loại nằm ở `src/shared/bang-tu-giao-dien.ts`.

**Giới hạn phải nói thẳng.** Máy kiểm tên có nhất quán, không kiểm tên có đúng sự thật: cột «Thật sự làm gì» dựa vào người đọc mã. Hai nút cùng chữ trong một tệp tính là một nơi đặt. Nút có chữ ghép từ mã (đánh dấu ‹…› hoặc ⟪…⟫) thì khi đổi tên biến, khoá đổi theo: máy báo đỏ, người đọc tay rồi sửa bảng. Lời Nền tảng trả lời người dùng trong trò chuyện thì máy không canh được.

**Đọc cột Trạng thái.** «Đã chốt»: có lời chủ hoặc ADR đã duyệt (máy kiểm phải chỉ ra nguồn). «Tên hiện tại, chủ chưa chọn riêng»: AI rà soát thấy đúng, không phải chủ chọn; đổi tên vẫn phải hỏi chủ. «Chờ chọn»: đang chờ chủ chọn tên. **Đọc cột Đường lệnh.** Chỉ dùng để tìm mã. Máy lọc một lần: nhiều hàng chưa đối chiếu với mã, có hàng là đường đọc; hàng không chắc thì để trống, nên trống không có nghĩa là nút không gọi gì. Muốn biết chắc thì đọc mã.

## Khái niệm

| Tên chuẩn | Nghĩa | Khác với | Chữ đã loại | Mã nội bộ | Trạng thái | Chủ chọn |
|---|---|---|---|---|---|---|
| **Chưa xác nhận** | Đơn mới lưu mà chưa gửi đi kiểm vé: người lập còn tự sửa được và chưa ai được giao việc xét đơn này. | «Chờ xác nhận» là đơn đã gửi đi kiểm vé và đang chờ người kiểm quyết. Chữ «Nháp» không dùng trên giao diện nữa. |  | `orders.status = draft` `STATUS_LABEL.draft` | đã chốt | 2026-11-04 (ADR-0166 câu 5) |
| **Chờ xác nhận** | Đơn đã gửi đi kiểm vé và còn một yêu cầu xác nhận đang mở, chờ người kiểm vé quyết. | Với khách, biên nhận và ảnh gửi khách luôn ghi «Chờ xác nhận» cho mọi đơn chưa xác nhận, vì khách không cần biết đơn đã qua bước kiểm vé hay chưa. Màn nào không biết đơn đang chờ thì ghi «Chưa xác nhận». |  | `NHAN_DANG_CHO_XAC_NHAN` `dangCho` `ord_confirm_request` | đã chốt | 2026-09-27 (ADR-0030, nhãn «Chờ xác nhận» thay «Nháp»); tách khỏi «Chưa xác nhận» 2026-11-04 (ADR-0166 câu 5) |
| **Đã xác nhận** | Đơn đã được chốt với khách: giá và dịch vụ bị khoá, mức hoa hồng được chụp lại, vé điện tử được cấp. Từ đây chỉ sửa được chuyến, số khách (có lý do) hoặc huỷ đơn. | Chưa phải là đã giao tour. Sau «Đã xác nhận» đơn còn hai bước chốt nữa là «Đã giao – đã thu đủ» và «Hoàn thành». |  | `orders.status = confirmed` `STATUS_LABEL.confirmed` | đã chốt | 2026-09-27 (ADR-0030: «Đã xác nhận» giữ nghĩa cũ, đã chốt với khách) |
| **Đã huỷ** | Đơn đã bị huỷ và không đi tiếp được nữa. Trên màn hình luôn ghi kèm lý do huỷ. | Không có đường quay lại: đơn đã huỷ không mở lại, muốn có đơn mới thì lập đơn mới. |  | `orders.status = cancelled` `STATUS_LABEL.cancelled` | đã chốt | 2026-09-27 (ADR-0030: «Đã huỷ · <lý do>») |
| **Đã giao – đã thu đủ** | Bước chốt thứ nhất sau khi tour xong: hướng dẫn viên bấm khi đã giao dịch vụ và đã thu đủ tiền. Đơn bị khoá và các khoản được ghi vào sổ. | Khác «Hoàn thành»: bước đó do Kế toán bấm, khi mọi khoản người khác còn nợ công ty của đơn đã về đủ. |  | `deliveredAt` `KhoaTrangThai delivered` `POST …/delivered` | đã chốt | 2026-09-29 (ADR-0025) |
| **Hoàn thành** | Bước chốt cuối của đơn: Kế toán bấm khi mọi khoản người khác còn nợ công ty của đơn đã về đủ. | Khác «Đã giao – đã thu đủ» (hướng dẫn viên bấm sau tour). Khoản công ty còn phải trả cho người khác không chặn bước này. |  | `completedAt` `KhoaTrangThai completed` `POST …/completed` | đã chốt | 2026-09-29 (ADR-0025) |
| **Bán hàng** | Quyền của nhân viên lập đơn: lập đơn, xem mọi đơn và tiền, sửa đơn mình lập hoặc mình phụ trách, thu tiền đơn của mình, xếp chuyến. Không hoàn tiền và không hoàn tất đơn. | Quyền khác với vai «Nhân viên kinh doanh»: vai chỉ sinh sẵn bộ quyền mặc định, quyền mới là thứ Nền tảng kiểm khi bấm. |  | `SALES` | đã chốt | 2026-09-20 (ADR-0007, bản đồ quyền → thao tác) |
| **Kế toán** | Quyền xem mọi đơn và tiền, thu và hoàn tiền, ghi sổ cái, khoá tháng, đặt hoa hồng, hoàn tất đơn. Không lập hay sửa đơn. | Không duyệt hoàn tiền cho khách của đơn huỷ (việc đó của Quản trị và Toàn quyền); duyệt chuyển tiền của đơn huỷ sang đơn mới thì được. |  | `ACCOUNTING` | đã chốt | 2026-09-20 (ADR-0007, bản đồ quyền → thao tác) |
| **Quản trị** | Quyền gần như đủ việc văn phòng: lập và sửa đơn, thu tiền, giao đơn, duyệt hoàn cọc, hoa hồng, danh mục, hồ sơ, điều phối, tài khoản cấp dưới (xem và sửa, không tạo mới). | Khác «Toàn quyền»: Quản trị không hoàn tiền, không ghi sổ cái, không khoá tháng và không làm các việc chỉ Toàn quyền được làm. |  | `ADMIN` | đã chốt | 2026-09-20 (ADR-0007, bản đồ quyền → thao tác) |
| **Hướng dẫn viên** | Quyền của người đi tour: phạm vi hẹp. Nhận đơn từ hàng chờ, xem, huỷ và giao đơn mình đang phụ trách. | Quyền này khác mục «Công việc tại đâu» trên hồ sơ (ghi người đó làm hướng dẫn viên): mục trên hồ sơ không bao giờ cho hay chặn thao tác. |  | `FIELD` | đã chốt | 2026-09-24 (ADR-0018 điều 4, nhãn quyền; ADR-0017 cho xem mọi đơn) |
| **Đối tác** | Quyền của tài khoản đại lý hay đối tác bên ngoài: lập đơn theo giá bán lẻ và chỉ xem đơn của chính mình. | Không phải hồ sơ «đối tác» trong Danh bạ. Tài khoản đối tác không giữ cùng lúc quyền Kế toán. |  | `PARTNER` | đã chốt | 2026-09-22 (ADR-0014, tài khoản đối tác) |
| **Toàn quyền** | Quyền cao nhất: làm được mọi thao tác, kể cả những việc chỉ riêng quyền này được làm (cài đặt vận hành, nhật ký, gửi thông báo, sổ tiền ngoài hệ thống, Góp ý). | Khác «Quản trị»: Quản trị bị giới hạn ở tiền, sổ cái và các ô chỉ Toàn quyền. |  | `SUPER_ADMIN` | đã chốt | 2026-09-24 (ADR-0018 điều 4: bỏ chữ Anh lộ ra người dùng) |
| **Thực tập** | Quyền hẹp cho người mới: lập đơn được, nhưng chỉ xem và sửa đơn, tiền, lịch sử và liên hệ của chính mình; gửi được Góp ý. Mọi việc quản trị, thu chi hay người phụ trách khác đều không có. | Tên vai «Thực tập sinh» trùng với tên quyền này; vai chỉ sinh bộ quyền mặc định. |  | `INTERN` | đã chốt | 2026-09-24 (ADR-0018 điều 4) |
| **Tài xế** | Quyền của tài xế công ty có tài khoản: xem và cập nhật tiến độ chuyến mình đang lái, thêm tên cho suất khách chưa có tên. Mọi thao tác tiền và đơn khác đều không có. | Khác «Tài xế đối tác» (tài xế của nhà xe bên ngoài). Khác mã vai hồ sơ «Tài xế» cũ đã ngưng. |  | `DRIVER` `vai tài khoản DRIVER_INTERNAL` | đã chốt | 2026-09-28 (ADR-0040) |
| **Tài xế đối tác** | Quyền của tài xế thuộc nhà xe bên ngoài có tài khoản: xem và cập nhật tiến độ chuyến mình đang lái. Không có thao tác tiền nào và đứng một mình, không kèm quyền nào khác. | Khác «Tài xế» (công ty) và khác hồ sơ «Nhà xe đối tác» (không có tài khoản). |  | `DRIVER_PARTNER` `vai tài khoản DRIVER_EXTERNAL` | đã chốt | 2026-09-28 (ADR-0048) |
| **Nhân sự** | Quyền của người làm hành chính nhân sự: tạo, xem và sửa tài khoản nhân viên. Không đơn, không tiền, không Danh bạ, không danh mục. | Tên vai đầy đủ là «Hành chính nhân sự»; «Nhân sự» là tên của quyền sinh ra từ vai đó. |  | `HR` `vai HR_STAFF` | đã chốt | 2026-10-01 (ADR-0071) |
| **Hồ sơ** | Một mục trong màn Danh bạ: một người hoặc một tổ chức mà công ty làm việc cùng (khách, đại lý, hướng dẫn viên, nhà xe…). | Hồ sơ khác tài khoản: tài khoản là chỗ đăng nhập, mỗi tài khoản trỏ đúng một hồ sơ, còn hồ sơ thì không nhất thiết có tài khoản. |  | `pty_party` `party` | chờ chọn | chưa có lời chủ chọn riêng; dùng từ bản 1.10 (2026-09-25) |
| **Tài khoản** | Chỗ để một người đăng nhập Nền tảng (số điện thoại, mã PIN, Face ID), kèm vai trò và quyền. Quản lý ở màn «Quản lý tài khoản». | Không phải hồ sơ trong Danh bạ. Trang cá nhân của người đang đăng nhập tên là «Tôi». Màn này từng tên «Nhân viên» nhưng nay quản lý cả tài khoản của đối tác. |  | `staff` `accounts` | chờ chọn | chưa có lời chủ chọn riêng; dùng từ bản 1.10 (2026-09-25) |
| **Công việc tại đâu** | Mục trên hồ sơ ghi hồ sơ đó làm việc gì và ở đâu (hướng dẫn viên, tài xế, nhà xe…). Chỉ để phân loại và tìm kiếm. | Không bao giờ dùng để cho hay chặn một thao tác. Việc cho phép nằm ở quyền của tài khoản. |  | `vai trò hồ sơ` | chờ chọn |  |
| **Vai trò** | Một vai gán cho tài khoản (ví dụ Giám đốc, Nhân viên kinh doanh, Hành chính nhân sự). Vai chỉ sinh sẵn bộ quyền mặc định cho tài khoản, việc được làm gì vẫn do quyền quyết. | Nghĩa này khác «vai trò» ở trang Hoa hồng đối tác, nơi mỗi mục trong thẻ «Vai người dùng» (ví dụ Công ty lữ hành) cũng gọi gọn là «vai trò». Chữ «vai» đứng một mình đã bỏ. | Gán vai | `ROLE_CODES` `src/shared/roles.ts` | đã chốt | 2026-10-18 (rà soát ngôn ngữ lượt 2) |
| **Vai người dùng** | Tên thẻ và tên cột ở trang Hoa hồng đối tác: nhóm người được hưởng hoa hồng, ví dụ Công ty lữ hành hay Lễ tân khách sạn. Từng mục trong đó gọi gọn là «vai trò». | Không phải vai đăng nhập của tài khoản. Chữ «Loại đối tác» đã bỏ. | Loại đối tác | `is_partner_label` `loai` `/api/pricing/loai-doi-tac` `#hh-the-loai` | đã chốt | 2026-11-01 (đặc tả đặt vé của đối tác §4.3) |
| **Nền tảng** | Tên gọi chung của hệ thống này khi nói với người dùng và trong tài liệu. Không gọi là «App». | Tên riêng đã đặt như «Tour Đảo Booking» hay «Island Booking System» giữ nguyên. | App |  | đã chốt | 2026-10-02 (chủ: «dùng từ Nền tảng thay cho App») |
| **Máy đang đăng nhập** | Mỗi máy (điện thoại hay máy tính) đang giữ đăng nhập tài khoản của bạn. Nút «Đăng xuất máy này» chỉ thoát máy đó, máy khác của cùng tài khoản vẫn đăng nhập. |  | Phiên đăng nhập | `aut_session` `phiên` | đã chốt | 2026-10-18 (rà soát ngôn ngữ lượt 2) |
| **Khoản thu** | Một lần có tiền của khách, hoặc của bên khác, trả cho một đơn và được ghi vào sổ: số tiền, hình thức trả, người thu tiền và ngày. | Khác «khoản hoàn tiền» (tiền công ty trả lại khách). Chữ «lần thu» đã bỏ khỏi giao diện nhưng còn trong mã và các quyết định cũ. | Lần thu | `bil_payment_receipt` `LanThuDto` `lần thu` | đã chốt | 2026-10-08 (BACKLOG §25), áp 2026-10-18 |
| **Khoản hoàn tiền** | Tiền công ty trả lại cho khách (ví dụ khi đơn huỷ), được ghi vào sổ như một khoản riêng. | Ngược với «khoản thu». | Lần hoàn | `payment.refund` `lần hoàn` | chờ chọn | AI đặt theo «khoản thu» 2026-10-18; chủ chưa chọn riêng |
| **Sửa khoản thu đã ghi** | Đổi số tiền, hình thức hoặc người thu tiền của một khoản thu đã ghi. Khoản cũ được ghi «đã huỷ» và khoản đúng được ghi thay trong cùng một lần; bắt buộc có lý do. Sau «Đã giao – đã thu đủ» đây là đường sửa duy nhất. | Khác «Huỷ khoản thu» (bỏ hẳn một khoản ghi nhầm) và «Ghi bù khoản thu» (thêm khoản cho đủ, không huỷ khoản nào). | Lệnh Thay | `receipt-replacements` | đã chốt | 2026-10-08 (lượt «Lệnh Thay» → «Sửa khoản thu đã ghi»), áp 2026-10-18 |
| **Ghi bù khoản thu** | Với đơn đã giao mà sổ thu còn thiếu so với số phải thu (dữ liệu cũ), thêm một khoản thu bù cho đủ. | Khác «Sửa khoản thu đã ghi»: ghi bù không huỷ khoản nào. |  |  | đã chốt | 2026-10-08 (tên «Ghi bù khoản thu»), áp 2026-10-18 |
| **Huỷ khoản thu** | Bỏ hẳn một khoản thu (hoặc khoản trả lại khách) ghi nhầm trước «Đã giao – đã thu đủ». Sổ giữ dòng cũ, ghi «đã huỷ» và thêm một dòng ngược lại. | Không có nút khôi phục: muốn có lại thì ghi khoản thu mới. Máy chủ từ chối nếu khoản đó đã nộp về công ty hoặc đã chuyển sang đơn khác. | Đảo khoản thu | `bút toán đảo` | đã chốt | 2026-10-18 (hộp hỏi: «Huỷ khoản thu») |
| **Người thu tiền** | Người trực tiếp nhận tiền của khách ở một khoản thu: nhân viên, hướng dẫn viên hoặc Công ty. |  | Người nhận tiền |  | đã chốt | 2026-10-18 (rà soát ngôn ngữ lượt 2) |
| **Chưa nộp về công ty** | Phần tiền mặt mà một nhân viên hoặc hướng dẫn viên đã thu của khách nhưng chưa nộp về công ty. Phần này là khoản người đó đang nợ công ty. | Khi nộp xong, ghi «Đã nộp về công ty» thì khoản nợ giảm đúng số đó. Chuyển khoản đang chờ xác nhận thì chưa tính vào đây. | Giữ hộ | `ledger_settlement` | đã chốt | 2026-10-18 (rà soát ngôn ngữ lượt 2) |
| **Hoa hồng** | Phần tiền công ty trả cho đối tác hoặc đại lý đã đưa khách đến, tính theo mức đã đặt. Mức được chụp lại lúc đơn xác nhận nên đổi mức sau không làm đổi đơn cũ. | Giá đại lý bằng thành tiền của đơn trừ hoa hồng. |  | `prc_commission_rule` `hoaHongDong` | đã chốt | 2026-10-01 (ADR-0077) |
| **Cấp độ đại lý** | Một bộ mức hoa hồng có tên (ví dụ «Đại lý cấp 3»), dùng chung cho nhiều vai trò. Tên của một cấp là dữ liệu do Kế toán đặt. | Gán cho cả một vai trò thì dùng nút «Gán cho vai trò»; gán riêng một đối tác thì gọi là «cấp riêng». | Mức TA; Chính sách hoa hồng; Cấp đại lý | `prc_rate_tier` `MT_…` `/api/pricing/muc-ta` | đã chốt | 2026-10-25 (bàn giao Hoa hồng + Hỗ trợ); 2026-10-30 và 2026-11-01 (chốt lại tên) |
| **Cấp riêng** | Một cấp độ đại lý gán riêng cho MỘT đối tác từ ngày chọn. Đơn của đối tác đó tính hoa hồng theo cấp này thay cho cấp của vai trò. Chỉ ảnh hưởng đối tác đó. | Thứ tự tính hoa hồng: mức riêng của đối tác, rồi cấp riêng, rồi mức riêng của vai trò, rồi cấp của vai trò. | Chính sách riêng; Lưu mức riêng | `prc_party_tier` | đã chốt | 2026-10-30 (rà soát cấp độ đại lý, quyết định 3 và 7) |
| **Mức riêng** | Một dòng hoa hồng đặt lẻ cho một đối tác hoặc cho một vai trò, theo một dịch vụ, một nhóm hoặc mọi dịch vụ. Mức riêng của đối tác là bậc ưu tiên cao nhất khi tính. | Khác «cấp riêng» (cả một bộ mức có tên). | Dòng riêng | `prc_commission_rule` | đã chốt | 2026-10-25 (bàn giao Hoa hồng + Hỗ trợ) |
| **Người có cấp riêng** | Khối trong thẻ «Vai người dùng» liệt kê các đối tác có mức riêng hoặc cấp riêng. Mở một đối tác thì thấy vai trò, mức riêng và cấp riêng của họ. |  | Riêng từng đối tác | `#hh-loai-rieng` `ghepDoiTacRieng` | đã chốt | 2026-11-01 (đặc tả đặt vé của đối tác §4.3) |
| **Có sẵn** | Năm vai trò đối tác có sẵn đi kèm tài khoản đăng nhập của đối tác nên không tắt được. | Vai trò do Kế toán thêm sau thì tắt được. | Loại gốc |  | đã chốt | 2026-10-28 (hộp hỏi, chọn «Có sẵn») |
| **Tính bằng và Áp cho** | Hai ô trong hộp nhập hoa hồng. «Tính bằng» chọn phần trăm hay số tiền. «Áp cho» chọn mọi khách như nhau hay riêng từng loại khách. |  | Cách tính |  | đã chốt | 2026-11-03 (ADR-0161) |
| **Ngừng** | Đặt ngày cuối cho một dòng đã có hiệu lực (mức, cấp, điều kiện, điều khoản): từ sau ngày đó dòng không áp dụng nữa. Dòng không bị xoá, nhưng đã ngừng thì không mở lại được, muốn áp lại phải thêm dòng mới. | Trạng thái đi cùng: «Đang áp dụng», «Sắp áp dụng», «Đã ngừng». Chữ «Đóng» không còn dùng cho nghĩa này, «Đóng» chỉ còn nghĩa gập khung. | Đóng mức; Kết thúc gắn | `valid_to` | đã chốt | 2026-10-25 (lượt 3); 2026-11-04 (ADR-0166 câu 9) |
| **Đơn** | Một lần khách đặt một hoặc nhiều dịch vụ tour, do nhân viên hoặc đối tác lập. Mã đơn có dạng TD-năm tháng ngày-số thứ tự theo giờ Việt Nam. | Khác «Đơn đi» (số đơn có ngày đi hôm nay, chỉ là cách đếm ở Trang chủ). |  | `orders` `OrderDto` `order_code` | chờ chọn |  |
| **Đơn đi** | Số đơn đã xác nhận có ngày đi trong ngày đang xem (ví dụ «Đơn đi hôm nay»). Đếm theo đơn, không đếm theo chuyến xe. | Khác «Chuyến xe» của Điều phối: một lượt xe chạy có thể chở khách của nhiều đơn. | Chuyến đón |  | đã chốt | 2026-10-28 (rà chữ Trang chủ) |
| **Dịch vụ trong đơn** | Một dịch vụ tour nằm trong đơn, kèm số khách theo từng loại và thông tin chuyến của riêng nó. | Khác dịch vụ trong danh mục (nơi niêm yết giá). |  | `order_service` | chờ chọn |  |
| **Loại khách** | Bốn loại khách tính giá riêng: Người lớn, Trẻ em, Người cao tuổi, Em bé. |  |  | `PaxCode` `adult` `child` `senior` `infant` | chờ chọn |  |
| **Ghi đè giá** | Giá riêng của Nền tảng đặt thay giá lấy từ Google Sheet cho một dịch vụ. Không ghi ngược vào Sheet; giá mới áp cho đơn lập từ lúc đó, đơn cũ giữ giá cũ. | Khác sửa giá ngay trong thẻ dịch vụ của một đơn (chỉ đổi giá trong đơn đó). Tên hai nút đó đang trùng nhau và chờ chủ chọn. | Bỏ ghi đè | `catalog_override` `applyOverride` | đã chốt | 2026-11-04 (ADR-0166 câu 2: «Bỏ ghi đè giá») |
| **Ngừng bán** | Dịch vụ không còn hiện cho người lập đơn chọn nữa. Đơn đã lập giữ nguyên. «Mở bán lại» gỡ dấu này. | Là nút ở Dịch vụ & giá, chữ «Ẩn» cũ đã đổi. Nút «Ẩn» mới của Toàn quyền (ADR-0164) chưa có hiệu lực. | Hiện lại dịch vụ | `catalog_hidden` `catalog_unhidden` `hidden` | đã chốt | 2026-11-04 (ADR-0166 câu 12) |
| **Lượt đưa đón** | Một chiều đưa đón của một dịch vụ trong đơn (ví dụ chiều đi), có giờ đón và nơi đón riêng. Gọi tắt «lượt» khi đã rõ. |  | Chặng đưa đón | `ord_transfer_leg` `chặng` | đã chốt | 2026-10-18 (rà soát ngôn ngữ lượt 2) |
| **Hạn chốt** | Số phút tối thiểu trước giờ đón mà đơn phải được xác nhận. Lượt đón sát hơn hạn này chỉ xác nhận được khi có «đặt gấp». | Các cụm đi kèm: «Hạn chốt trước giờ đón», «Sắp tới hạn chốt», «Quá hạn chốt». | Mốc tối thiểu; mốc 6 giờ | `vc_dispatch_policy.min_lead_minutes` `mocToiThieu` | đã chốt | 2026-10-18 (rà soát ngôn ngữ lượt 2) |
| **Đặt gấp** | Cách xác nhận một lượt đưa đón đã quá sát giờ so với hạn chốt: người có quyền ghi lý do rồi mới xác nhận được. Dấu chỉ ghi lên đúng lượt đang dưới hạn chốt. | Chỉ Bán hàng, Quản trị, Toàn quyền làm được. |  | `order.leg.short_notice` `short_notice_*` | đã chốt | 2026-09-29 (ADR-0049 D3); mở cho Bán hàng 2026-10-08 (ADR-0107) |
| **Chuyến xe** | Một lượt xe chạy do Điều phối xếp, có xe, tài xế và các suất khách. Đi qua các bước như «Lên kế hoạch» rồi «Đang chạy». | Khác «Đơn đi» (đếm đơn). Một chuyến xe có thể chở khách của nhiều đơn. |  | `vc_trip` | chờ chọn |  |
| **Cho xe chạy** | Ghi rằng xe đã lăn bánh. Chuyến chuyển từ «Lên kế hoạch» sang «Đang chạy» và Nền tảng chụp lại xe, tài xế, số khách lúc đó. Chuyến còn bị giữ thì chưa cho chạy được. | Văn phòng có thể ghi thay tài xế; khi chưa có bước nào sau đó thì thu hồi được. | Xuất bến | `xuất bến` `kiemXuatBen` | đã chốt | 2026-10-18 (rà soát ngôn ngữ lượt 2) |
| **Kết thúc gián đoạn (xe hỏng)** | Kết thúc chuyến đang chạy vì sự cố, chọn lý do từ danh mục. Sau đó khối «Cứu hộ» hiện ra để xếp khách sang xe khác. | Không gửi yêu cầu cứu hộ. Nút bên cạnh «Gửi đề nghị cứu hộ» mới là nhờ xe khác nhận khách trong khi chuyến này vẫn chạy. |  |  | đã chốt | 2026-11-04 (ADR-0166 câu 7) |
| **Gửi kiểm vé** | Gửi đơn chưa xác nhận cho người kiểm vé xem còn vé không. Trong lúc chờ, đơn không sửa được cho tới khi «Rút lại». Không gửi gì cho khách. | Sau khi người kiểm vé quyết, đơn đi tiếp bằng «Còn vé, xác nhận đơn», «Hết vé» hoặc «Huỷ». | Gửi xác nhận | `order_confirm_requested` `ord_confirm_request` | đã chốt | 2026-11-04 (ADR-0166 câu 8) |
| **Còn vé, xác nhận đơn** | Người kiểm vé báo còn vé và chốt đơn ngay: giá bị khoá, hoa hồng được chụp lại, vé điện tử được cấp, tiền cọc khách đã khai thành khoản thu. Có hộp hỏi lại trước khi chốt. | Không hoàn tác được. Lượt đón dưới hạn chốt cần «đặt gấp». |  | `POST …/quyet-dinh` `ketQua CON_VE` | đã chốt | 2026-11-04 (ADR-0166 câu 4) |
| **Lưu đơn (chưa xác nhận)** | Nút lưu đơn ở dạng chưa xác nhận: không gửi cho ai, không báo ai. Sau đó mở hộp «Ảnh gửi khách». | Khác «Gửi kiểm vé» (gửi cho người kiểm vé) và «Còn vé, xác nhận đơn». | Lưu, chờ xác nhận |  | đã chốt | 2026-11-04 (ADR-0166 câu 5) |
| **Ghi khoản thu này** | Nút ở bảng mã QR thanh toán: đóng bảng QR rồi mở form «Ghi khoản thu» với số tiền điền sẵn. Bấm nút này chưa ghi gì vào sổ. | Chỉ khi bấm «Ghi» trong form thì khoản thu mới vào sổ. | Khách đã chuyển khoản |  | đã chốt | 2026-11-04 (ADR-0166 câu 10) |
| **Ghi khoản thu đòi được** | Khi bên chịu trách nhiệm đã trả lại một khoản, nút này vừa ghi thêm một khoản thu bằng đúng số nhập, vừa bỏ phần giảm trừ và nợ của bên chịu bằng đúng số đó. Có thể làm một phần. | Không làm được nếu bên chịu đã nộp tiền. | Đòi được khách | `attribution_posted` `attribution_reversed` | đã chốt | 2026-11-04 (ADR-0166 câu 6) |
| **Đặt ngày kết thúc** | Đặt ngày cuối cho một luật bán: luật vẫn chặn tới hết ngày đó rồi tự thôi. Chỉ đặt được một lần. | Sau khi đặt, dòng mất cả hai nút (kể cả «Kết thúc ngay»). | Hẹn ngày kết thúc |  | đã chốt | 2026-11-04 (ADR-0166 câu 11) |
| **Mở vé để gửi khách** | Tải ảnh mọi vé của đơn về máy để gửi cho khách. Vé đã mở thì không bao giờ về lại kho, kể cả khi đơn huỷ hay giảm khách. |  | Chuẩn bị vé để gửi | `ve_xem_anh` | đã chốt | 2026-11-04 (ADR-0166 câu 3) |
| **Gán cho vai trò và Gán cho đối tác** | Hai nút ở cấp độ đại lý. «Gán cho vai trò» áp cấp cho cả một vai trò. «Gán cho đối tác» mở hộp chọn một đối tác và chọn sẵn cấp đang xem, để gán cấp riêng. | Đối tác có mức riêng hoặc cấp riêng vẫn được tính trước cấp của vai trò. | Thêm vai trò vào cấp này | `gan-vai-tro` `gan-doi-tac` | đã chốt | 2026-11-04 (ADR-0166 câu 1) |
| **Chọn cấp riêng cho đối tác** | Nút ở hồ sơ đại lý mở ô chọn cấp riêng cho đúng đối tác đó. Trong ô, nút lưu chỉ ghi «Lưu». |  | Áp dụng cấp riêng |  | đã chốt | 2026-11-04 (ADR-0166 câu 1) |
| **Không huỷ** | Nút trong hộp huỷ đơn để thoát mà không huỷ: đơn giữ nguyên. | Chữ «Giữ đơn» đã bỏ vì trùng chữ «Đang giữ đơn». | Giữ đơn |  | chờ chọn | AI đổi 2026-10-18 (thay «Giữ đơn», việc AI tự làm ở lượt 1 rà soát ngôn ngữ); chủ chưa chọn riêng |
| **Bỏ đánh dấu** | Đặt lại mục đã đánh dấu «Đã gọi báo» để mục nhắc hiện lại. | Chữ «Bỏ dấu» dễ hiểu là bỏ dấu thanh nên đã đổi. | Bỏ dấu |  | chờ chọn | AI đổi 2026-10-18 (thay «Bỏ dấu», việc AI tự làm ở lượt 1 rà soát ngôn ngữ); chủ chưa chọn riêng |
| **Hướng dẫn** | Mục các bài hướng dẫn cách dùng Nền tảng theo từng vai. Bài nào nhắc nút thì gọi bằng đúng tên đang hiện trên màn hình. |  | Trợ giúp | `src/shared/huong-dan*.ts` | đã chốt | 2026-10-25 (bàn giao Hoa hồng + Hỗ trợ) |
| **Việc của nhóm** | Danh sách yêu cầu hỗ trợ gửi tới một nhóm hỗ trợ để người trong nhóm nhận xử lý. | Khác «Yêu cầu của tôi» (các yêu cầu mình đã gửi). | Hàng đợi nhóm | `feedback.team.manage` | đã chốt | 2026-10-25 (bàn giao Hoa hồng + Hỗ trợ) |
| **Nhà xe đối tác** | Hồ sơ của một nhà xe bên ngoài có xe và tài xế cho công ty thuê. Không có tài khoản và không sinh quyền nào. | Khác «Tài xế đối tác» (người lái, có tài khoản). |  | `CARRIER` `v_pty_carrier` | đã chốt | 2026-09-28 (ADR-0048) |
| **Giấy tờ** | Giấy tờ của một người (căn cước, bằng lái, khám sức khoẻ…) hoặc của một xe (đăng ký, kiểm định, bảo hiểm…), có hạn dùng. Số giấy tờ của người luôn bị che, chỉ «Xem đủ số» mới thấy và việc xem được ghi nhật ký. | Gia hạn thêm một dòng mới nối vào dòng cũ, không sửa đè. Chỉ dòng hiện hành mới gia hạn hay sửa sai được. |  | `pty_person_document` `vc_vehicle_document` | chờ chọn |  |
| **Khoá tháng** | Chốt sổ một tháng: sau khi khoá, không thêm được dòng tiền vào tháng đó. Chỉ Kế toán và Toàn quyền khoá. |  |  | `ky_period_close` `ledger.period.close` | đã chốt | 2026-10-01 (ADR-0080) |
| **Mã QR thanh toán** | Mã chuyển khoản dựng theo từng đơn, trả về tài khoản nhận tiền mà công ty đã cài ở Danh bạ. | Bấm «Ghi khoản thu này» sau khi khách trả thì mới ghi khoản thu. |  | `VietQR` `pty_bank_account` | đã chốt | 2026-10-08 (ADR-0108) |
| **Thông tin chuyến** | Ngày giờ khởi hành, giờ đón, khách có mặt và ghi chú của một dịch vụ trong đơn. | Khác «Chuyến xe» (lượt xe chạy do Điều phối xếp). |  | `TripInfoDto` `validateTrip` | chờ chọn |  |
| **Dịch vụ & giá** | Màn danh sách dịch vụ và giá lấy từ Google Sheet. Giá đang dùng là giá Sheet sau khi áp ghi đè; đồng bộ Sheet không làm mất ghi đè. | Khác «Dịch vụ trong đơn» (dịch vụ đã nằm trong một đơn). |  | `catalog_item` `catalog_override` `applyOverride` | chờ chọn |  |
| **Người liên hệ, tài xế** | Mục trên hồ sơ ghi hồ sơ này liên quan tới người nào, ví dụ người liên hệ của công ty hay tài xế của nhà xe. | Khác «Công việc tại đâu» (ghi chính hồ sơ này làm việc gì). |  | `pty_party_relationship` `pty_role_type` | chờ chọn |  |
| **Tài xế của** | Quan hệ nói một người lái cho nhà xe nào. Nhà xe cá nhân tự lái thì tài xế chính là nhà xe đó. | Không sinh quyền: tài khoản lái được chuyến nhờ quyền, không nhờ quan hệ này. |  | `DRIVES_FOR` `v_pty_carrier_driver` | chờ chọn |  |
| **Quyền** | Thứ quyết định một tài khoản được làm gì trên Nền tảng. Một tài khoản có thể giữ nhiều quyền. | Khác «Vai trò»: vai chỉ sinh sẵn bộ quyền mặc định, máy chủ chỉ hỏi quyền. |  | `stf_permission` `PermissionCode` | chờ chọn |  |
| **Nhật ký** | Sổ ghi ai đã làm gì, lúc nào. Chỉ thêm dòng, không sửa và không xoá. |  |  | `audit_log` `AUDIT_ACTIONS` | chờ chọn |  |
| **Chế độ bảo trì** | Khi bật, mọi tài khoản không giữ Toàn quyền đều bị chặn, kể cả Quản trị và các máy đang đăng nhập. | Khác «Development Mode» của Cloudflare (chỉ tắt bộ nhớ đệm). |  | `maintenance` `mnt_setting` | chờ chọn |  |
| **Gia hạn** | Ghi giấy tờ mới được cấp thay cho giấy cũ: thêm một dòng mới nối vào dòng cũ, không sửa đè. Không nhập số thì lấy số cũ. | Khác «Sửa sai» (sửa lỗi nhập trên chính dòng đó). |  | `previous_id` `…/renew` `…/gia-han` | chờ chọn |  |
| **Sửa sai** | Sửa đúng một ô nhập sai trên dòng giấy tờ đang dùng, bắt buộc chọn lý do. Lý do «nhập nhầm cả dòng» thì huỷ dòng đó, không xoá, và dòng trước đó dùng lại. | Khác «Gia hạn» (có giấy mới thật). |  | `LY_DO_SUA_SAI` `…/correct` `…/sua-sai` `voided_at` | chờ chọn |  |
| **Xem đủ số** | Cách duy nhất thấy đầy đủ số giấy tờ của một người. Việc xem được ghi vào nhật ký trước, nhưng nhật ký không ghi số. |  |  | `…/reveal` `party.document.reveal` | chờ chọn |  |
| **Mốc nhắc** | Số ngày trước hạn của giấy tờ thì bắt đầu nhắc. Chỉ Toàn quyền đổi được. | Khác «Hạn chốt» (số phút trước giờ đón). |  | `vc_expiry_policy` `warnDays` | chờ chọn |  |
| **Trạng thái xe** | Một trong ba: Đang dùng, Bảo dưỡng, Ngừng dùng. Xe đã ngừng dùng lại được, trừ khi biển số đã thuộc xe khác chưa ngừng. |  |  | `vc_vehicle.status` `TRANG_THAI_XE` | chờ chọn |  |
| **Điều chỉnh khẩn cấp** | Việc xếp, rút, dời khách, đổi xe, đổi tài xế hay huỷ chuyến còn khách khi đã sát giờ hơn hạn chốt. Chỉ Bán hàng, Quản trị, Toàn quyền làm được. | Khác «Đặt gấp» (xác nhận đơn khi đã sát giờ). |  | `trip.urgent_adjust` | chờ chọn |  |
| **Chuyến bị giữ** | Chuyến chưa đủ điều kiện cho xe chạy nên ở lại «Lên kế hoạch», hiện lý do và người cần xử lý. Máy tính lại mỗi lần đọc. |  |  | `LyDoGiu` `MA_GIU` `kiemXuatBen` | chờ chọn |  |
| **Chính sách điều phối** | Bộ cài đặt của Điều phối, gồm cả hạn chốt. Mỗi lần lưu thành một bản mới. |  |  | `vc_dispatch_policy` | chờ chọn |  |
| **Điều kiện cho xe chạy** | Danh sách việc phải đạt thì chuyến mới được cho chạy, ví dụ xe còn hạn kiểm định và bảo hiểm. |  |  | `vc_departure_rule` | chờ chọn |  |
| **Hạng bằng và số khách** | Bảng cho biết mỗi hạng bằng lái chở được tối đa bao nhiêu khách. |  |  | `vc_license_capacity` | chờ chọn |  |
| **Lý do điều phối** | Danh sách lý do để chọn khi làm các việc của Điều phối cần ghi lý do. |  |  | `vc_reason` | chờ chọn |  |
| **Giá đại lý** | Số tiền đại lý phải trả công ty cho một đơn, bằng thành tiền của đơn trừ hoa hồng. | Khác giá bán lẻ (giá trong Dịch vụ & giá). |  | `hoaHongDong` `tinhDongDoiTac` | chờ chọn |  |
| **Người bán dịch vụ** | Bên cung ứng dịch vụ cho công ty, kèm điều khoản công ty mua lại dịch vụ đó. | Khác «Đối tác» (bên đưa khách đến và hưởng hoa hồng). |  | `prc_supply_term` | chờ chọn |  |

## Thuật ngữ trong mã

Không hiện cho người dùng, chủ dự án không cần đọc; người làm mã tra ở đây.

| Thuật ngữ | Nghĩa | Khác với | Mã nội bộ |
|---|---|---|---|
| **Dòng tiền** | Một dòng tính tiền của dịch vụ trong đơn: số lượng nhân đơn giá ra thành tiền. |  | `order_item` `quantity × unit_price = line_total` |
| **Bản chụp** | Dựng lại dịch vụ danh mục từ dữ liệu đã lưu của đơn. |  | `snapshotService` |
| **Quyền bên ngoài** | Hai quyền của người ngoài công ty: Đối tác và Tài xế đối tác. Một hằng dùng chung cho trigger LC-1 và nghĩa «Toàn công ty». |  | `EXTERNAL_PERMISSIONS` |
| **Thao tác** | Một ô của bản đồ quyền: ai được làm việc gì, trên phạm vi nào. |  | `OperationCode` `MATRIX` `can()` |
| **Nhân sự văn phòng** | Cổng cho route chỉ người trong văn phòng dùng được. | Khác cổng đơn: cổng đơn cho cả tài khoản Đối tác. | `isOffice` `access: "office"` `OFFICE_GATE` |
| **Cổng đơn** | Cổng cho route đơn hàng: văn phòng hoặc tài khoản Đối tác. |  | `canAccessOrders` `access: "orders"` `ORDERS_GATE` |
| **Khoá lạc quan** | Cách phát hiện người khác vừa sửa cùng dòng: dấu thời gian lệch thì máy chủ trả 409 `stale`. |  | `expectedUpdatedAt` `updated_at` |
| **View công bố** | Cách duy nhất để module khác đọc nhãn của một module, chỉ đọc. |  | `v_<tiền tố>_<tên>` |
| **Giấy tờ hiện hành** | Dòng giấy tờ chưa huỷ và chưa có dòng gia hạn chưa huỷ nối vào. Chỉ dòng này gia hạn hay sửa sai được, dòng khác trả 409 `document_not_current`. |  | `is_current` `HIEN_HANH` `current` |

## Chữ dùng chung

Chữ theo ngữ cảnh: người đọc thấy đối tượng ngay cạnh nút, trong tiêu đề hộp hoặc dòng đang xem.

| Chữ | Vì sao đủ rõ |
|---|---|
| Đóng | Chỉ gập khung hoặc thoát hộp đang mở, không kết thúc việc gì. Việc ngừng một thứ có tên riêng: Ngừng dùng, Ngừng điều kiện, Ngừng điều khoản (ADR-0166 câu 9). |
| Huỷ | Trong hộp hoặc ô đang nhập: bỏ việc đang nhập và thoát, chưa ghi gì; tiêu đề hộp nói đang làm gì. Các việc ghi dữ liệu có tên đầy đủ như Huỷ đơn, Huỷ khoản thu. |
| Quay lại | Về màn hoặc bước trước trong cùng luồng, không ghi gì. |
| Thôi | Trong hộp hỏi lại: không làm việc đang hỏi và đóng hộp; câu hỏi đứng ngay cạnh nút. |
| Thử lại | Làm lại lần tải vừa lỗi; dòng báo lỗi đứng ngay cạnh nói lỗi gì. |
| Lưu | Ghi những gì đang nhập trong hộp hoặc biểu mẫu đang mở; tiêu đề hộp nói đang sửa gì. |
| Đổi | Đứng ngay cạnh giá trị đang chọn (người phụ trách, người hưởng, số khách theo hạng) và mở khung chọn lại đúng giá trị đó. |
| Đổi tên | Đứng trên dòng của mục có tên (nhóm dịch vụ, tuyến, cỡ xe) và đổi tên đúng mục đó. |
| Tắt | Đứng trên dòng của mục có tên (nhóm dịch vụ, đặc điểm, thông báo) và tắt đúng mục đó. |
| Bật | Đứng trên dòng của mục có tên (nhóm dịch vụ, Face ID) và bật đúng mục đó. |
| Dùng lại | Đứng trên dòng của mục đã ngừng (nhóm hỗ trợ, tuyến, cỡ xe) và dùng lại đúng mục đó. |
| Gỡ | Đứng trên dòng của thứ bị gỡ (thành viên nhóm, máy đã nhớ) và gỡ đúng thứ đó. |
| Để sau | Trong hộp mời làm một việc (mời bật Face ID, hộp đọc tin): bỏ qua lần này; hộp nói rõ việc được mời. |
| Sửa | Đứng trên dòng của mục cần sửa (cấp, đặc điểm, địa điểm, tài khoản…) và mở hộp sửa đúng mục đó; tiêu đề hộp nói đang sửa gì. |
| Thêm | Là nút trong khung thêm, hoặc đứng ngay dưới danh sách đang xem; tiêu đề khung nói đang thêm gì. |
| Từ chối | Đứng trên dòng yêu cầu, đề nghị hay phiếu đang xem và từ chối đúng thứ đó; bước sau luôn đòi lý do. |
| Xác nhận | Trong hộp hỏi hoặc trên dòng đang xem; câu hỏi hay dòng đứng ngay cạnh nói đang xác nhận việc gì. |
| Xác nhận từ chối | Nút chốt của hộp từ chối; tiêu đề hộp nói đang từ chối đơn, chuyến hay yêu cầu nào. |
| Xác nhận đã nhận | Nút chốt trên dòng hoặc trong hộp của đúng khoản tiền đang xem; hộp nói rõ bên nào đã nhận. |
| Xác nhận bật | Nút chốt của hộp bật một chế độ; tiêu đề hộp nói đang bật gì. |
| Kết thúc | Đứng trên dòng có hiệu lực (dòng giá, công việc, quan hệ) và kết thúc đúng dòng đó. |
| Gửi | Đứng ngay dưới ô đang gõ (yêu cầu hỗ trợ, trả lời, câu hỏi cho Trợ lý); ô đó nói đang gửi gì. |
| Gửi từ chối | Nút chốt của hộp từ chối một phiếu; hộp nói đang từ chối phiếu nào, kèm lý do đã chọn. |
| Gửi đề nghị | Nút chốt của hộp đề nghị xe khác nhận khách; tiêu đề hộp nói đề nghị gì. |
| Rút lại | Đứng cạnh yêu cầu hoặc đề nghị đang chờ của chính mình và rút đúng thứ đó. |
| Rút yêu cầu | Đứng trên dòng yêu cầu của chính mình và rút đúng yêu cầu đó. |
| Nhận | Đứng trên thẻ đơn chờ nhận hoặc đề nghị chuyển khách và nhận đúng thứ đó. |
| Thu hồi | Đứng trên dòng đường dẫn vé hoặc tin đã gửi và thu hồi đúng thứ đó. |
| Duyệt | Đứng trên dòng yêu cầu hoặc đề nghị đang chờ và duyệt đúng thứ đó. |
| Điều chỉnh | Đứng trên dòng khách hoặc khối chi phí đang xem và mở khung điều chỉnh đúng thứ đó. |
| Lưu sửa | Nút lưu của hộp sửa; tiêu đề hộp nói đang sửa gì. |
| Ngừng dùng | Đứng trên dòng liên hệ hoặc ở màn của một xe: cùng kiểu việc, khác đối tượng (ADR-0166 câu 9; hồ sơ rà soát 2026-11-04). |
| Thêm nhóm | Ở trang của từng loại nhóm (nhóm dịch vụ, nhóm hỗ trợ): tiêu đề trang nói đang thêm nhóm gì. |
| Lưu thành bản mới | Ở trang cài đặt có nhiều bản (chính sách điều phối, Trợ lý): tiêu đề khối nói đang lưu cái gì. |

## Tên dùng ở nhiều hàng việc

Cùng một việc có nhiều lối vào, hoặc khác việc và đang chờ chủ chọn tên. Tên mới rơi vào diện này mà chưa xếp thì máy báo đỏ.

| Tên | Loại | Vì sao |
|---|---|---|
| Thêm giấy tờ | cùng một việc | Nút lưu của cùng một hộp giấy tờ, đổi chữ theo việc đang làm; tiêu đề hộp nói đang thêm, gia hạn hay sửa sai. |
| Lưu gia hạn | cùng một việc | Nút lưu của cùng một hộp giấy tờ, đổi chữ theo việc đang làm. |
| Lưu sửa sai | cùng một việc | Nút lưu của cùng một hộp giấy tờ, đổi chữ theo việc đang làm. |
| Gia hạn | cùng một việc | Giấy tờ của xe và giấy tờ của người: cùng một việc trên hai màn. |
| Sửa sai | cùng một việc | Giấy tờ của xe và giấy tờ của người: cùng một việc trên hai màn. |
| Xem đủ số | cùng một việc | Cùng một việc xem số giấy tờ của người, vào từ hai màn. |
| Huỷ đơn | cùng một việc | Cùng một việc huỷ đơn, vào từ trang đơn, bảng Kiểm vé và Việc của tôi. |
| Đã giao – đã thu đủ | cùng một việc | Cùng một nút ở trang đơn, đổi chữ theo bước chốt của đơn. |
| Hoàn thành | cùng một việc | Cùng một nút ở trang đơn, đổi chữ theo bước chốt của đơn. |
| Từ chối đơn | cùng một việc | Cùng một việc trả đơn, vào từ trang đơn và Việc của tôi. |
| Đặt gấp | cùng một việc | Cùng một việc đặt gấp, vào từ khung của người lập và bảng Kiểm vé. |
| Thêm mức | cùng một việc | Nút lưu của cùng một hộp nhập mức hoa hồng; tiêu đề hộp nói mức của cấp hay của đối tác. |
| Chọn cấp riêng cho đối tác | cùng một việc | Cùng một việc, vào từ trang Hoa hồng đối tác và hồ sơ ở Danh bạ (ADR-0166 câu 1). |
| Vẫn lưu | cùng một việc | Nút của cùng một hộp cảnh báo khi đổi giá trị đặc điểm dịch vụ. |
| Cho xe chạy | cùng một việc | Cùng một việc: tài xế bấm, hoặc văn phòng bấm thay. |
| Kết thúc chuyến | cùng một việc | Cùng một việc: tài xế bấm, hoặc văn phòng bấm thay. |
| Kết thúc gián đoạn | cùng một việc | Cùng một việc: tài xế bấm, hoặc văn phòng bấm thay. |
| Gửi đề nghị cứu hộ | cùng một việc | Cùng một khối cứu hộ ở màn chuyến, nút đổi chữ theo việc đang làm. |
| Ghi “${nhan}” | cùng một việc | Nút chốt của một hộp tiến độ chuyến; chữ ghép theo việc đang ghi (đã đón, vắng, khách huỷ). |
| Lưu giá | cùng một việc | Nút lưu của cùng một form bảng giá thuê xe, đổi chữ theo việc thêm giá hay đổi giá. |
| Lưu giá mới | cùng một việc | Nút lưu của cùng một form bảng giá thuê xe, đổi chữ theo việc thêm giá hay đổi giá. |
| Đăng xuất | cùng một việc | Cùng một việc thoát máy này, vào từ trang Tôi và khung chung. |
| Quay lại bản này | cùng một việc | Cùng một việc ở hai khối của trang cài đặt Trợ lý. |
| Gửi yêu cầu | chờ chủ | Một nơi mở hộp gửi yêu cầu hỗ trợ, một nơi là nút chốt của hộp xin xoá dữ liệu cá nhân. Hộp xoá có câu hỏi riêng nói rõ, nhưng hai việc khác nhau xa; chờ chủ xem có đổi không. |
| Sửa giá | chờ chủ | Ở Dịch vụ & giá là ghi đè giá cho mọi đơn lập sau; trong thẻ dịch vụ của đơn chỉ sửa đơn giá của đơn đang lập. Hậu quả khác xa nhau; chờ chủ chọn tên. |

## Việc chờ chọn (102)

Chữ ĐANG HIỆN là tên hiện hành; máy vẫn canh chữ đó. Khi chủ chọn tên mới thì sửa bảng và nút trong cùng một lần lưu.

| Việc | Chữ đang hiện | Nhóm | Ghi chú |
|---|---|---|---|
| Chụp bù | `web/chup-bu.ts`: Chụp bù<br>`web/phan-doi-tac.ts`: Chụp bù | Chụp bù mức hoa hồng | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Chụp bù cả danh sách (‹n› đơn) | `web/chup-bu.ts`: Chụp bù cả danh sách (‹…› đơn) | Chụp bù mức hoa hồng | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Tải ảnh PNG | `web/confirmation-dialog.ts`: Tải ảnh PNG | Ảnh gửi khách | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Xem biên nhận | `web/order.ts`: Xem biên nhận | Ảnh gửi khách | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Sửa danh sách | `web/order.ts`: Sửa danh sách | Sửa đơn đã xác nhận | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Ghi chi hoàn | `web/order.ts`: Ghi chi hoàn | Tiền của đơn huỷ | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Xác nhận · Từ chối | `web/order.ts`: Xác nhận<br>`web/order.ts`: Từ chối | Tiền của đơn huỷ | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Phân loại lý do | `web/order.ts`: Phân loại lý do | Tiền của đơn huỷ | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Xác nhận đã nhận | `web/order.ts`: Xác nhận đã nhận | Đối chiếu khoản thu | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Đề nghị phân định | `web/order.ts`: Đề nghị phân định | Sau Đã giao | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Đã giao – đã thu đủ | `web/order.ts`: Đã giao – đã thu đủ / Hoàn thành<br>`web/order.ts`: ⟪loai === "delivered"⟫ | Chốt đơn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Hoàn thành | `web/order.ts`: Đã giao – đã thu đủ / Hoàn thành | Chốt đơn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Ghi khoản thu | `web/order.ts`: Ghi khoản thu<br>`web/order.ts`: Ghi | Thu tiền | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Đổi khách | `web/order.ts`: Đổi khách | Sửa đơn đã xác nhận | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Huỷ đơn | `web/order.ts`: Huỷ đơn | Huỷ đơn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Rút lại | `web/xac-nhan-don-ui.ts`: Rút lại<br>`web/xac-nhan-don-ui.ts`: Rút lại yêu cầu xác nhận? Đơn trở về nháp để bạn sửa tiếp. | Xác nhận đơn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Gửi đơn | `web/xac-nhan-don-ui.ts`: Gửi đơn | Xác nhận đơn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Từ chối đơn | `web/order.ts`: Từ chối đơn | Hướng dẫn viên của đơn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Đặt gấp | `web/xac-nhan-don-ui.ts`: Đặt gấp | Kiểm vé | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Bật ẩn thông tin khách · Tắt ẩn thông tin khách | `web/an-khach-cai-dat.ts`: Tắt ẩn thông tin khách / Bật ẩn thông tin khách | Cài đặt vận hành | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Bật cả nhóm · Tắt cả nhóm | `web/dich-vu-kiem-ve.ts`: Bật cả nhóm / Tắt cả nhóm | Cài đặt vận hành | tên mới 2026-11-04, chờ chủ chọn |
| Lưu khách | `web/booker-sheet.ts`: Lưu khách<br>`web/booker-sheet.ts`: [biểu tượng close] | Sửa đơn đã xác nhận: khách và bên đặt | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Đặt gấp (mở khung) · Duyệt đặt gấp | `web/dat-gap-ui.ts`: Duyệt đặt gấp<br>`web/dat-gap-ui.ts`: Đặt gấp<br>`web/dat-gap-ui.ts`: Đóng | Đặt gấp (dưới hạn chốt) | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Bên kia đã nhận | `web/home.ts`: Xác nhận đã nhận<br>`web/home.ts`: ⟪nutXacNhanDoiChieu(k.loai)⟫ | Đối chiếu tiền | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Xác nhận ngay | `web/home.ts`: Xác nhận ngay | Việc gấp của Trang chủ | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Bỏ lượt (liên kết) · Bỏ lượt (nút đỏ xác nhận) | `web/khoi-dua-don.ts`: Bỏ lượt<br>`web/khoi-dua-don.ts`: Thôi | Đưa đón: bỏ lượt | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Huỷ người (đơn đã xác nhận) · Xoá (đơn nháp) | `web/khoi-hanh-khach.ts`: Huỷ người<br>`web/khoi-hanh-khach.ts`: Huỷ người / Xoá<br>`web/khoi-hanh-khach.ts`: Thôi | Hành khách trên đơn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Lưu thông tin chuyến | `web/trip-sheet.ts`: Lưu thông tin chuyến<br>`web/trip-sheet.ts`: [biểu tượng close] | Sửa thông tin chuyến | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Từ chối đơn | `web/tu-choi-sheet.ts`: Xác nhận từ chối<br>`web/tu-choi-sheet.ts`: Không từ chối<br>`web/viec-cua-toi.ts`: Từ chối đơn | Việc của tôi: trả đơn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Nhận · Đang nhận… | `web/viec-cua-toi.ts`: Nhận | Việc của tôi: nhận đơn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Sửa số khách | `web/viec-cua-toi.ts`: Sửa số khách<br>`web/viec-cua-toi.ts`: Xác nhận<br>`web/viec-cua-toi.ts`: Đóng | Việc của tôi: sửa số khách (hướng dẫn viên) | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Huỷ đơn | `web/viec-cua-toi.ts`: Huỷ đơn<br>`web/viec-cua-toi.ts`: Không huỷ | Việc của tôi: huỷ đơn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Gửi Zalo | `web/ve-don.ts`: Gửi Zalo | Vé điện tử: giao vé | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Tạo đường dẫn cho khách · Sao chép | `web/ve-don.ts`: Tạo đường dẫn cho khách<br>`web/ve-don.ts`: Sao chép | Vé điện tử: giao vé | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Ngừng | `web/hoa-hong-hop.ts`: ⟪o.nhan⟫<br>`web/hoa-hong-cap.ts`: ⟪nhanViec(v, loai)⟫ | Hoa hồng: ngừng một dòng mức | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Thôi theo cấp này | `web/hoa-hong-cap.ts`: ⟪nhanViec(v, loai)⟫<br>`web/hoa-hong-hop.ts`: ⟪o.nhan⟫ | Hoa hồng: vai trò thôi theo cấp (ảnh hưởng CẢ vai trò) | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Sửa | `web/hoa-hong-cap.ts`: Sửa<br>`web/hoa-hong-loai.ts`: Sửa<br>`web/hoa-hong-hop.ts`: Mở lại<br>`web/hoa-hong-hop.ts`: Lưu | Hoa hồng: sửa tên và ghi chú của một cấp hoặc một vai trò | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Chữ trong ô cột «Cấp độ đại lý» (ví dụ «Đại lý cấp 2 (theo vai trò)»), bấm để mở hộp | `web/cot-cap-dai-ly.ts`: ⟪o⟫<br>`web/cot-cap-dai-ly.ts`: ⟪oCapCuaHoSo(v)⟫<br>`web/cot-cap-dai-ly.ts`: Lưu | Tài khoản: đặt cấp riêng cho MỘT tài khoản đối tác ngay ở bảng tài khoản | rà soát 2026-11-04: chưa rõ, chờ chủ |
| ＋ Thêm luật | `public/luat-ban.html`: Thêm luật<br>`web/luat-ban.ts`: Thêm luật | Luật bán: thêm luật chặn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Khoá tháng MM/YYYY → Xác nhận khoá tháng MM/YYYY | `web/khoa-thang.ts`: ⟪nhanNutKhoa(period)⟫<br>`web/khoa-thang.ts`: ⟪nhanNutXacNhanKhoa(period)⟫ | Khoá sổ tháng | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Ghi sổ theo phân định → Ghi sổ | `web/phan-dinh.ts`: Ghi sổ theo phân định<br>`web/phan-dinh.ts`: Ghi sổ | Phân định: ghi sổ | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Phản hồi | `web/phan-dinh.ts`: Phản hồi<br>`web/phan-dinh.ts`: Gửi phản hồi | Phân định: bên chịu phản hồi | rà soát 2026-11-04: chưa rõ, chờ chủ |
| + Chuyến mới | `public/dieu-phoi.html`: Chuyến mới<br>`web/dieu-phoi.ts`: Tạo chuyến<br>`web/dieu-phoi.ts`: Chuyến mới | Tạo chuyến | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Lưu chuyến | `web/chuyen-sua.ts`: Lưu chuyến | Tạo chuyến | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Điều chỉnh… | `web/chuyen.ts`: Điều chỉnh…<br>`web/chuyen.ts`: Điều chỉnh | Sửa kết quả đón / trả khách | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Khách đã huỷ | `web/tien-do-ui.ts`: ⟪NHAN_LENH_SUAT[l]⟫<br>`web/chuyen.ts`: Ghi “${nhan}” | Tiến độ chuyến | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Kết thúc chuyến | `web/cuoc-chuyen.ts`: ⟪hopKetThuc({ ma: c.ma, suat: r.suat })⟫<br>`web/cuoc-chuyen.ts`: Kết thúc chuyến<br>`web/cuoc-chuyen.ts`: ⟪viec⟫ | Tiến độ chuyến | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Nhờ xe khác đón / Chuyển khách sang xe khác | `web/cuoc-chuyen.ts`: Gửi đề nghị<br>`web/cuoc-chuyen.ts`: Nhờ xe khác đón<br>`web/cuoc-chuyen.ts`: Chuyển khách sang xe khác | Chuyển khách giữa hai xe | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Nhận | `web/cuoc-chuyen.ts`: Nhận | Chuyển khách giữa hai xe | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Không nhận | `web/cuoc-chuyen.ts`: Gửi lý do<br>`web/cuoc-chuyen.ts`: Không nhận | Chuyển khách giữa hai xe | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Rút lại | `web/cuoc-chuyen.ts`: Rút lại | Chuyển khách giữa hai xe | rà soát 2026-11-04: chưa rõ, chờ chủ |
| ↑ / ↓ (đọc màn hình: «Đưa <điểm> lên trước», «Đưa <điểm> xuống sau») | `web/chuyen.ts`: ↑<br>`web/chuyen.ts`: ↓<br>`web/cuoc-chuyen.ts`: ↑<br>`web/cuoc-chuyen.ts`: ↓ | Sửa chuyến đang chạy | máy lộ thêm 2026-11-04 khi bộ quét nhận lệnh ghi qua hàm bọc; chưa trình chủ |
| Báo huỷ | `web/chuyen.ts`: Báo huỷ | Sửa chuyến đang chạy | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Thêm người đi kèm | `web/chuyen.ts`: Gắn lên xe<br>`web/chuyen.ts`: Thêm người đi kèm | Người đi kèm | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Huỷ chuyến | `web/dieu-phoi-ui.ts`: Huỷ chuyến<br>`web/chuyen.ts`: Huỷ chuyến | Huỷ chuyến | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Lưu sửa sai (sau khi chọn lý do «Nhập nhầm cả dòng (huỷ dòng này)») | `web/giay-to-ui.ts`: Lưu gia hạn / Lưu sửa sai / Thêm giấy tờ<br>`web/giay-to-ui.ts`: ⟪l.nhan⟫ | Giấy tờ xe và người: huỷ cả dòng (lý do cuối của Sửa sai) | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Kết thúc (nút ở dòng) · Kết thúc giá (nút trong hộp) | `web/bang-gia-xe.ts`: Kết thúc<br>`web/bang-gia-xe.ts`: Kết thúc giá<br>`web/bang-gia-xe.ts`: Đóng | Bảng giá thuê xe: kết thúc giá | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Ngưng dùng / Dùng lại · (cỡ xe còn giá đang áp) xác nhận «Vẫn ngưng» | `web/bang-gia-xe.ts`: Ngưng dùng / Dùng lại<br>`web/bang-gia-xe.ts`: Vẫn ngưng | Bảng giá thuê xe: ngưng dùng / dùng lại tuyến, cỡ xe | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Lưu cài đặt | `web/han-muc-tu-choi-the.ts`: Lưu cài đặt | Chính sách điều phối: hạn mức Từ chối của hướng dẫn viên | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Sửa (dòng) · Lưu (trong khung «Sửa: <mã>») | `web/danh-muc-giay-to-khoi.ts`: Lưu<br>`web/danh-muc-giay-to-khoi.ts`: Sửa | Danh mục loại giấy tờ: sửa, ngưng dùng | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Đăng xuất | `web/account.ts`: Đăng xuất<br>`web/maintenance-screen.ts`: Đăng xuất | Đăng xuất | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Xác nhận bằng Face ID | `web/account.ts`: Xác nhận bằng Face ID | Đặt PIN mới bằng Face ID | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Gỡ | `web/account.ts`: Gỡ | Gỡ Face ID một máy | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Quên máy này | `web/account.ts`: Quên máy này | Máy được tin | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Tạo bộ mới → Tạo bộ mã mới | `web/account.ts`: Tạo bộ mới<br>`web/account.ts`: Tạo bộ mã mới | Mã dự phòng | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Cập nhật giờ dự kiến | `web/account.ts`: Cập nhật giờ dự kiến | Chế độ bảo trì | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Bật chế độ bảo trì | `web/account.ts`: Bật chế độ bảo trì<br>`web/account.ts`: Xác nhận bật | Chế độ bảo trì | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Lưu chính sách | `web/chinh-sach-dang-nhap-ui.ts`: Lưu chính sách<br>`web/chinh-sach-dang-nhap-ui.ts`: Xác nhận lưu | Chính sách đăng nhập | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Rút đồng ý | `web/ho-so-cua-toi.ts`: Rút đồng ý<br>`web/ho-so-cua-toi.ts`: Thôi | Chính sách riêng tư của tôi | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Bật → Tiếp tục với Face ID | `web/passkey.ts`: Bật<br>`web/passkey.ts`: Tiếp tục với Face ID | Bật Face ID | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Chạy lại | `web/phieu-xoa.ts`: Chạy lại | Phiếu xoá: chạy lại | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Ẩn danh hoá | `web/sessions.ts`: Ẩn danh hoá<br>`web/sessions.ts`: Xác nhận ẩn danh hoá | Ẩn danh hoá máy cũ | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Đăng xuất máy này · Đăng xuất mọi máy + đặt lại PIN | `web/sessions.ts`: Xác nhận gỡ và đặt lại PIN / Xác nhận gỡ<br>`web/sessions.ts`: Đăng xuất máy này<br>`web/sessions.ts`: Đăng xuất mọi máy + đặt lại PIN | Đăng xuất máy của người khác | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Tắt bảo mật hai lớp | `web/staff.ts`: Xác nhận tắt<br>`web/staff.ts`: Tắt bảo mật hai lớp | Tắt bảo mật hai lớp của người khác | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Đặt lại PIN | `web/staff.ts`: Đặt lại PIN<br>`web/staff.ts`: Đặt lại PIN của ‹…›? PIN cũ, Face ID và mọi máy đang đăng nhập sẽ mất hiệu lực. | Đặt lại PIN của người khác | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Ngưng / Kích hoạt lại | `web/staff.ts`: Ngưng / Kích hoạt lại<br>`web/staff.ts`: Ngưng tài khoản ‹…›? Họ sẽ bị đăng xuất ngay. | Ngưng / kích hoạt lại tài khoản | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Chấp nhận | `web/xac-minh-hang-cho.ts`: Chấp nhận | Xác minh phiếu tự khai | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Từ chối → Gửi từ chối | `web/xac-minh-hang-cho.ts`: Từ chối<br>`web/xac-minh-hang-cho.ts`: Gửi từ chối | Xác minh phiếu tự khai | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Đồng bộ ngay từ Google Sheet | `public/catalog.html`: Đồng bộ ngay từ Google Sheet<br>`web/catalog.ts`: ‹…› Chỉ tiếp tục nếu bạn chắc chắn Sheet đúng. Vẫn đồng bộ và ẩn các dịch vụ đó? | Đồng bộ danh mục từ Google Sheet | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Sửa giá (trong thẻ dịch vụ của đơn) | `web/service-card.ts`: Sửa giá | Tạo đơn: dòng tiền | tên trùng «Sửa giá» ở Dịch vụ & giá nhưng khác việc, chờ chủ chọn tên (2026-11-04) |
| Đưa đón | `web/catalog.ts`: Đưa đón<br>`web/catalog.ts`: Lưu bản mới | Đưa đón của dịch vụ | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Gửi thông báo | `web/gui-thong-bao.ts`: [biểu tượng megaphone] / Gửi thông báo | Gửi thông báo | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Thu hồi | `web/gui-thong-bao.ts`: Thu hồi | Gửi thông báo | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Thêm công việc | `web/parties.ts`: Thêm công việc<br>`web/parties.ts`: Đặt hồ sơ này làm công ty chủ? Trang đăng nhập và biên nhận sẽ dùng thông tin của hồ sơ này từ hôm nay (tên, mã số thuế, địa chỉ, liên hệ ghi chú “Hotline”, email). Công ty chủ hiện tại sẽ thôi giữ công việc này. Sau khi đổi, kiểm lại mục “Tài khoản nhận tiền” của hồ sơ mới — chưa cài thì mã QR thanh toán báo lỗi. | Vai trò hồ sơ · công ty chủ | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Kết thúc | `web/parties.ts`: Kết thúc | Vai trò hồ sơ · công ty chủ | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Gộp vào hồ sơ khác… · Gộp… | `web/parties.ts`: Gộp vào hồ sơ khác…<br>`web/parties.ts`: Gộp<br>`web/parties.ts`: Gộp… | Gộp hồ sơ | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Lưu tài khoản (lần đầu) / Đổi tài khoản (đã có) | `web/parties.ts`: Đổi tài khoản / Lưu tài khoản<br>`web/parties.ts`: Đổi tài khoản nhận tiền? Từ lúc này mã QR mới sẽ chuyển tiền về tài khoản mới; tài khoản cũ được lưu lại trong lịch sử. | Công ty chủ · tài khoản ngân hàng | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Chuyển | `web/ho-tro-luong.ts`: Chuyển | Vé hỗ trợ: xử lý của nhóm | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Gửi | `web/ho-tro-luong.ts`: Gửi<br>`web/ho-tro-luong.ts`: Trả lời người gửi<br>`web/ho-tro-luong.ts`: Ghi chú nội bộ | Vé hỗ trợ: trả lời | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Gỡ tệp | `web/ho-tro-luong.ts`: Gỡ tệp<br>`web/ho-tro-tep.ts`: Gỡ tệp | Vé hỗ trợ: tệp kèm | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Sửa | `web/ho-tro-nhom.ts`: Sửa<br>`web/ho-tro-nhom.ts`: Lưu<br>`web/ho-tro-nhom.ts`: Đóng | Vé hỗ trợ: nhóm hỗ trợ | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Công tắc «Nhạy cảm» · Dùng lại | `web/ho-tro-nhom.ts`: aria:Nhạy cảm — nhóm ${t.name}<br>`web/ho-tro-nhom.ts`: Dùng lại | Nhóm hỗ trợ: công tắc và dùng lại nhóm | máy lộ thêm 2026-11-04 khi bộ quét nhận lệnh ghi qua hàm bọc; chưa trình chủ |
| Thêm <tên> · Đổi thành <Phụ trách hoặc Thành viên> · Gỡ | `web/ho-tro-nhom.ts`: Thêm ‹…›<br>`web/ho-tro-nhom.ts`: Đổi thành ‹…›<br>`web/ho-tro-nhom.ts`: Gỡ | Nhóm hỗ trợ: thành viên trong hộp «Sửa» | máy lộ thêm 2026-11-04 khi bộ quét nhận lệnh ghi qua hàm bọc; chưa trình chủ |
| (chuông) Thông báo · (mỗi dòng) <tin> | `web/thong-bao-ui.ts`: ⟪tinBadge(t)⟫ / ⟪t.cau⟫ / ⟪tinMeta(t, now)⟫<br>`web/thong-bao-ui.ts`: [biểu tượng bell] | Thông báo: chuông | rà soát 2026-11-04: chưa rõ, chờ chủ |
| (biểu tượng chat) Trợ lý | `web/tro-ly.ts`: [biểu tượng chat]<br>`web/tro-ly.ts`: [biểu tượng resize]<br>`web/tro-ly.ts`: Trợ lý<br>`web/tro-ly.ts`: Về góc<br>`web/tro-ly.ts`: [biểu tượng close]<br>`web/tro-ly.ts`: Cuộc trò chuyện mới | Trợ lý: nút và khung | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Gửi | `web/tro-ly.ts`: Gửi<br>`web/tro-ly.ts`: ⟪getComputedStyle(dau)⟫ | Trợ lý: hỏi đáp | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Lưu | `web/tro-ly-cai-dat.ts`: Lưu | Cài đặt Trợ lý: bật tắt và tiền | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Thử key | `web/tro-ly-cai-dat.ts`: Thử key | Cài đặt Trợ lý: bật tắt và tiền | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Lưu bộ não | `web/tro-ly-cai-dat.ts`: Lưu bộ não | Cài đặt Trợ lý: bộ não và lời dặn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Khôi phục mặc định | `web/tro-ly-cai-dat.ts`: Thay<br>`web/tro-ly-cai-dat.ts`: Khôi phục mặc định<br>`web/tro-ly-cai-dat.ts`: Giữ chỗ đang sửa | Cài đặt Trợ lý: bộ não và lời dặn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Quay lại bản này | `web/tro-ly-cai-dat.ts`: Quay lại bản này | Cài đặt Trợ lý: bộ não và lời dặn | rà soát 2026-11-04: chưa rõ, chờ chủ |
| Lưu thành bản mới | `web/tro-ly-cai-dat.ts`: Lưu thành bản mới | Cài đặt Trợ lý: bộ não và lời dặn | rà soát 2026-11-04: chưa rõ, chờ chủ |

## Việc quan trọng (307)

### Kiểm vé đơn chờ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Kiểm vé** | Đơn chờ xác nhận (danh sách thẻ) | Chỉ mở trang chi tiết đơn đang chờ để người kiểm vé xem và quyết định ở bảng Còn vé, xác nhận đơn · Hết vé · Huỷ. Bấm nút này chưa ghi gì. | không | không áp dụng (chỉ mở trang) | (chưa nối) | `web/cho-xac-nhan.ts`: Kiểm vé | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Chụp bù mức hoa hồng

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Chụp bù** | Trang Chụp bù mức (từng đơn) và Chi tiết đơn › khối «Phần đối tác» | Tính và ghi bản chụp mức hoa hồng, giá đại lý và người bán của từng dịch vụ trong đơn đã xác nhận nhưng chưa có bản chụp, theo mức đang áp ở ngày xác nhận. Thiếu mức hay thiếu người bán thì báo lỗi và không ghi gì. Đã chụp thì không chụp lại được, chỉ sửa từng dịch vụ bằng «Ghi mức tay». | không | một phần: chụp xong không chụp lại; chỉ đổi từng dịch vụ bằng «Ghi mức tay» (có lý do) | `/api/orders/:x/chup-bu`<br>nhật ký `ord_terms_backfilled` | `web/chup-bu.ts`: Chụp bù<br>`web/phan-doi-tac.ts`: Chụp bù | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Chụp bù cả danh sách (‹n› đơn)** | Trang Chụp bù mức (đầu danh sách) | Chụp bù lần lượt từng đơn trong danh sách, mỗi đơn theo ngày xác nhận của chính nó. Đơn nào thiếu mức thì dừng ở đơn đó và báo câu của máy chủ ngay dưới đơn, các đơn khác vẫn chụp. Không có hộp hỏi lại. | không | không: đơn nào chụp xong thì không chụp lại, chỉ sửa từng dịch vụ bằng «Ghi mức tay» | `/api/orders/:x/chup-bu`<br>nhật ký `ord_terms_backfilled` | `web/chup-bu.ts`: Chụp bù cả danh sách (‹…› đơn) | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Ghi mức tay** | Chi tiết đơn › khối «Phần đối tác» › từng dịch vụ › bảng «Ghi mức tay» | Đặt tay mức hoa hồng (phần trăm hoặc số tiền mỗi khách) và/hoặc người bán cho một dịch vụ của đơn đã xác nhận, chưa giao, bắt buộc có lý do. Mức này thay mức tự chụp và quyết định số hoa hồng ghi lúc Đã giao. | có hộp nhập (kiểu mức, người bán, lý do bắt buộc; cảnh báo nếu hạ mức) | một phần: ghi mức tay khác đè lên; sau Đã giao thì không ghi được | `/api/orders/:x/thuong-mai/:x`<br>nhật ký `order_terms_manual` | `web/phan-doi-tac.ts`: Ghi mức | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Ảnh gửi khách

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Tải ảnh PNG** | Hộp «Ảnh gửi khách» | Tải ảnh xác nhận đơn (đã dựng sẵn trên máy) về điện thoại hay máy tính. Không ghi gì vào Nền tảng, không gửi gì cho khách. | không | không áp dụng | (chưa nối) | `web/confirmation-dialog.ts`: Tải ảnh PNG | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Xem biên nhận** | Chi tiết đơn (khối nút dưới tóm tắt) | Dựng ngay trên máy một ảnh tóm tắt đơn (dịch vụ, ngày giờ, tiền) để xem, tải về hoặc chia sẻ qua Zalo. Không thu tiền, không gửi gì cho khách, không ghi vào Nền tảng; người dùng tự gửi ảnh. | không | không áp dụng | (chưa nối) | `web/order.ts`: Xem biên nhận | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Sửa đơn đã xác nhận

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa đưa đón** | Chi tiết đơn › thẻ Đưa đón › bảng «Sửa đưa đón» | Mở bảng sửa, thêm hoặc bỏ từng lượt đưa đón (giờ đón, nơi đón) của đơn đã xác nhận; bấm Lưu mới ghi từng lệnh. Lượt dưới hạn chốt phải có đặt gấp. Lệnh ghi xong thì chuyến xe bên Điều phối được cập nhật theo, và ảnh xác nhận đã gửi khách cũ thành lỗi thời (bảng có dòng cảnh báo). | không (bảng có dòng cảnh báo ảnh xác nhận cũ) | được: sửa lại bằng chính nút này, mỗi lần đều ghi nhật ký | `/api/orders/:x/legs/:x/replace`<br>`/api/orders/:x/legs/:x/close`<br>`/api/orders/:x/legs/:x`<br>`/api/orders/:x/legs`<br>nhật ký `order_leg_updated`<br>nhật ký `order_leg_added`<br>nhật ký `order_leg_closed`<br>nhật ký `order_leg_short_notice` | `web/order.ts`: Sửa đưa đón | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Sửa danh sách** | Chi tiết đơn › thẻ Hành khách › bảng «Sửa danh sách hành khách» | Sửa tên, năm sinh, thêm hoặc bớt dòng người đi trong danh sách hành khách của đơn đã xác nhận. Không đổi số khách tính tiền, không đổi tiền; số người không đổi ở đường này. | không | được: sửa lại bằng chính nút này | `/api/orders/:x/passengers`<br>nhật ký `order_passenger_changed` | `web/order.ts`: Sửa danh sách | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Đổi khách** | Chi tiết đơn › thẻ Khách (đơn đã xác nhận) › bảng «Đổi khách» | Đổi tên, số điện thoại khách trên đơn và hồ sơ người đặt (khách lẻ hoặc đối tác). Nếu đổi bên đặt, mức hoa hồng được chụp lại theo bên mới và đơn có thể bị từ chối nếu giảm giá vượt hoa hồng mới, hoặc bên mới bị chặn bán. | không (bấm Lưu khách trong bảng) | được: đổi lại bằng chính nút này | `/api/orders/:x/booker`<br>nhật ký `booker_changed`<br>nhật ký `order_terms_recaptured` | `web/order.ts`: Đổi khách | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Sửa số khách dịch vụ** | Chi tiết đơn › nhóm nút đầu trang (đơn đã xác nhận, chưa giao) › bảng «Sửa số khách dịch vụ» | Đổi số người lớn, trẻ em… của từng dịch vụ trong đơn đã xác nhận, kèm lý do chọn trong danh sách. Tiền phải thu được máy chủ tính lại; giảm giá vượt tạm tính thì hiện cảnh báo vàng, khuyến mại thì cảnh báo đỏ. Chuyến xe và vé điện tử được cân lại theo số khách mới. | không (bấm Lưu số khách trong bảng) | được: sửa lại bằng chính nút này, mỗi lần có lý do và nhật ký | `/api/orders/:x/money-edit`<br>nhật ký `order_money_adjusted` | `web/order.ts`: Sửa số khách dịch vụ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Sửa thông tin chuyến** | Chi tiết đơn › nhóm nút đầu trang (đơn đã xác nhận) › bảng sửa chuyến | Sửa các trường vận hành của đơn đã xác nhận (ngày giờ khởi hành, đón, ghi chú). Không đổi khách và không đổi tiền. Dưới hạn chốt phải đặt gấp. | không (bấm Lưu thông tin chuyến trong bảng) | được: sửa lại bằng chính nút này | `/api/orders/:x/trip`<br>nhật ký `trip_updated` | `web/order.ts`: Sửa thông tin chuyến | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Hướng dẫn viên của đơn

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Nhận làm HDV** | Chi tiết đơn › khối Hướng dẫn viên | Gán chính người bấm làm Hướng dẫn viên của đơn đang chưa có ai. Chỉ tài khoản giữ quyền Hướng dẫn viên thấy nút này. Từ lúc đó đơn xuất hiện ở «Việc của tôi» và người bấm có thể Đã giao, Từ chối đơn. | không | một phần: trả lại bằng «Từ chối đơn» (có hạn mức mỗi tuần) hoặc nhờ người có quyền đổi Hướng dẫn viên | `/api/orders/:x/handler`<br>nhật ký `order_claimed` | `web/order.ts`: Nhận làm HDV | đã chốt (chủ 2026-11-05 (hai vai khác nhau trên mỗi đơn: «Nhận làm HDV» chỉ cho quyền Hướng dẫn viên)) |
| **Chọn Hướng dẫn viên / Đổi Hướng dẫn viên** | Chi tiết đơn › khối Hướng dẫn viên › bảng chọn người | Mở bảng chọn (chỉ nhóm Hướng dẫn viên) rồi Lưu: Hướng dẫn viên cũ (nếu có) bị gỡ, người mới nhận đơn. Sau Đã giao thì bị từ chối nên nút ẩn. | không (bấm Lưu trong bảng) | được: đổi lại bằng chính nút này (trước Đã giao) | `/api/orders/:x/handler`<br>nhật ký `order_handler_changed` | `web/order.ts`: ⟪controls.assignLabel⟫ | đã chốt (chủ 2026-11-05 (hai vai khác nhau trên mỗi đơn: nút «Chọn / Đổi Hướng dẫn viên»)) |
| **Từ chối đơn** | Chi tiết đơn › khối Hướng dẫn viên | Hướng dẫn viên đang phụ trách đơn trả đơn lại danh sách chờ nhận, kèm lý do chọn trong danh sách. Mỗi người có hạn mức số lần từ chối mỗi tuần; chạm hạn thì bị chặn. Chỉ khi đơn đã xác nhận, chưa giao và còn sau ngày mai. | có: hộp «Từ chối đơn ‹mã›?» chọn lý do | một phần: nhận lại bằng «Nhận làm HDV» nếu chưa ai nhận | `/api/orders/:x/handler-refuse`<br>nhật ký `order_handler_refused` | `web/order.ts`: Từ chối đơn | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Người phụ trách (Bán hàng)

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Nhận phụ trách** | Chi tiết đơn › khối Người phụ trách | Gán chính người bấm làm người phụ trách của đơn đã xác nhận đang chưa có ai (Bán hàng, hoặc Quản trị / Toàn quyền). Người được mời bấm trong thời gian ưu tiên; Bán hàng khác chỉ nhận được khi hết ưu tiên. Với đơn còn chờ xác nhận, nút chỉ đưa tới bảng «Còn vé, xác nhận đơn» (nhận bằng cách bấm Còn vé). | không | một phần: Quản trị, Toàn quyền đổi người phụ trách bằng «Đổi người phụ trách»; chưa có nút trả lại cho người đã nhận | `/api/orders/:x/ban-hang/nhan`<br>nhật ký `sales_owner_claimed` | `web/order.ts`: Nhận phụ trách | đã chốt (chủ 2026-11-05 (người phụ trách «là vai bán hàng phụ trách và chịu trách nhiệm chính cho đơn»); ADR-0142) |
| **Từ chối** | Chi tiết đơn › khối Người phụ trách (chỉ người được mời thấy) | Người được mời làm người phụ trách từ chối lời mời còn mở. Không hỏi lý do, không có hạn mức. Đơn chuyển sang «Chờ Bán hàng nhận» và người lập nhận tin. | không | không: lời mời đã khép; người lập hoặc Quản trị phải mời / gán lại | `/api/orders/:x/ban-hang/tu-choi`<br>nhật ký `sales_invite_refused` | `web/order.ts`: Từ chối | đã chốt (chủ 2026-11-05 (nút «Từ chối» cho lời mời); ADR-0142) |
| **Chọn người phụ trách / Đổi người phụ trách** | Chi tiết đơn › khối Người phụ trách › bảng chọn người | Chỉ Quản trị, Toàn quyền, đơn đã xác nhận: mở bảng chọn Bán hàng rồi Lưu. Người cũ (nếu có) bị gỡ, người mới thành người phụ trách. Sau Đã giao thì bị từ chối nên nút ẩn. | không (bấm Lưu trong bảng) | được: đổi lại bằng chính nút này (trước Đã giao) | `/api/orders/:x/ban-hang`<br>nhật ký `sales_owner_changed` | `web/order.ts`: ⟪t.doiNhan⟫ | đã chốt (chủ 2026-11-05 (nút «Đổi người phụ trách» nay thuộc ô người phụ trách mới); ADR-0142) |

### Tiền của đơn huỷ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ghi chi hoàn** | Chi tiết đơn › thẻ Thanh toán › khối «Tiền của đơn huỷ» | Ghi rằng công ty đã trả lại khách số tiền thật (nhập số tiền và hình thức) theo một khoản đã được duyệt hoàn. Nền tảng chỉ ghi sổ, không chuyển tiền; người ghi phải khác người duyệt. | có hộp nhập (hàng mở ngay trong thẻ: số tiền, hình thức) | không: không có nút huỷ riêng; chỉ phần chưa chi của khoản duyệt mới huỷ được bằng «Huỷ duyệt» | `/api/orders/:x/coc/chi`<br>nhật ký `deposit_refund_paid` | `web/order.ts`: Ghi chi hoàn | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Chuyển tiền sang đơn mới** | Chi tiết đơn › thẻ Thanh toán › khối «Tiền của đơn huỷ» | Chuyển phần tiền công ty đang giữ của đơn huỷ sang một đơn mới theo khoản đã duyệt chuyển, ghi cả hai đơn trong một lần. Người chuyển phải khác người duyệt. | có hộp nhập (hàng mở ngay trong thẻ) | không: đã chuyển thì hai nửa bị khoá, không huỷ riêng được | `/api/orders/:x/coc/chuyen`<br>nhật ký `deposit_transferred_out` | `web/order.ts`: Chuyển tiền sang đơn mới | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Huỷ duyệt** | Chi tiết đơn › thẻ Thanh toán › khối «Tiền của đơn huỷ» | Rút lại phần chưa chi của một khoản đã duyệt hoàn hoặc duyệt chuyển (nhập số tiền và lý do bắt buộc). Phần đã chi hoặc đã chuyển không đổi. | có hộp nhập (số tiền, lý do bắt buộc) | một phần: duyệt lại bằng «Duyệt hoàn thu trước» nếu còn hạn | `/api/orders/:x/coc/duyet/:x/huy`<br>nhật ký `deposit_approval_voided` | `web/order.ts`: Huỷ duyệt | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Xác nhận · Từ chối** | Chi tiết đơn › thẻ Thanh toán › khối «Tiền của đơn huỷ» › dòng «Đã hoàn ngoài hệ thống» | Xác nhận hay từ chối một dòng «đã hoàn ngoài hệ thống» do người khác (Toàn quyền) ghi: xác nhận thì khoản đó được tính là công ty đã trả khách; từ chối (phải có lý do) thì không tính. Người ghi không tự xác nhận được. | có: «Xác nhận công ty đã trả tay … cho khách?» · từ chối có hộp nhập lý do | không: đã xác nhận hoặc từ chối thì khoá dòng đó; Toàn quyền ghi lại được dòng mới | `/api/orders/:x/coc/hoan-ngoai/:x/xac-nhan`<br>nhật ký `deposit_outside_confirmed`<br>nhật ký `deposit_outside_rejected` | `web/order.ts`: Xác nhận<br>`web/order.ts`: Từ chối | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Phân loại lý do** | Chi tiết đơn › thẻ Thanh toán › khối «Tiền của đơn huỷ» | Xếp lý do huỷ đang «chưa kết luận» vào một nhóm (Khách huỷ, Công ty huỷ, Huỷ để lập lại / trùng đơn), kèm lý do bắt buộc. Nhóm quyết định công ty có giữ thu trước hay không và hạn hoàn tiền; chỉ phân loại được một lần. | có hộp nhập (nhóm, lý do bắt buộc) | không: đã phân loại thì không phân loại lại | `/api/orders/:x/cancel-reason`<br>nhật ký `order_cancel_reason_classified` | `web/order.ts`: Phân loại lý do | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Duyệt hoàn thu trước · Duyệt chuyển sang đơn mới** | Chi tiết đơn › thẻ Thanh toán › khối «Tiền của đơn huỷ» | Duyệt cho phép hoàn lại cho khách hoặc chuyển sang đơn khác một phần tiền công ty đang giữ của đơn huỷ (số tiền, lý do bắt buộc). Duyệt chưa trả hay chuyển tiền; người khác phải bấm «Ghi chi hoàn» hoặc «Chuyển tiền sang đơn mới» sau đó. Đơn «Khách huỷ» quá hạn thì không duyệt hoàn được. | có hộp nhập (loại, số tiền, đơn nhận, lý do) | một phần: huỷ phần chưa chi bằng «Huỷ duyệt» | `/api/orders/:x/coc/duyet`<br>nhật ký `deposit_refund_approved`<br>nhật ký `deposit_transfer_approved` | `web/order.ts`: c.coTheDuyet ? "Duyệt hoàn thu trước" : "Duyệt chuyển sang đơn mới" | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Ghi đã hoàn ngoài hệ thống** | Chi tiết đơn › thẻ Thanh toán › khối «Tiền của đơn huỷ» | Ghi khoản công ty đã trả tay cho khách từ trước khi có chức năng hoàn tiền (số tiền, lý do bắt buộc, không ghi số tài khoản). Khoản này chỉ được tính sau khi Quản trị bấm «Xác nhận». | có hộp nhập (số tiền, lý do bắt buộc) | không: dòng đã ghi không xoá, chỉ được xác nhận hoặc từ chối | `/api/orders/:x/coc/hoan-ngoai`<br>nhật ký `deposit_outside_recorded` | `web/order.ts`: Ghi đã hoàn ngoài hệ thống | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đối chiếu khoản thu

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Xác nhận đã nhận** | Chi tiết đơn › thẻ Thanh toán › khối «Kế toán» hoặc dòng của từng khoản thu | Kế toán xác nhận công ty đã thật sự nhận khoản thu do người khác khai là «Công ty thu». Chuyển khoản thì phải nhập mã giao dịch và số tiền thực chuyển theo sao kê. Tiền mặt thì người khai không còn phải nộp khoản đó nữa. | có hộp nhập (mã giao dịch, số tiền thực chuyển nếu chuyển khoản) | một phần: khoản đã xác nhận chỉ sửa bằng «Sửa khoản thu đã ghi» hoặc huỷ bằng «Huỷ khoản thu» (trước Đã giao) | `/api/ledger/company-receipts/:x/confirm`<br>nhật ký `ledger_company_received` | `web/order.ts`: Xác nhận đã nhận | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Bên kia đã nhận** | Chi tiết đơn › thẻ Thanh toán › khối «Kế toán» hoặc dòng của từng khoản thu | Kế toán xác nhận đại lý hoặc nhà cung cấp đã nhận tiền khách trả cho họ (do nhân viên khai). Từ lúc đó khoản này là nợ của bên đó với Tour Đảo. Bên kia báo không nhận thì dùng «Huỷ khoản thu». | có: «Đã đối chiếu: … xác nhận đã nhận … của khách?» | một phần: huỷ bằng «Huỷ khoản thu» trước Đã giao | `/api/ledger/counterparty-receipts/:x/confirm`<br>nhật ký `ledger_counterparty_confirmed` | `web/order.ts`: Bên kia đã nhận | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Sửa sổ tiền

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa khoản thu đã ghi** | Chi tiết đơn › thẻ Thanh toán › khối «Kế toán» hoặc dòng của từng khoản thu | Đổi số tiền, hình thức hoặc người thu tiền của một khoản thu đã ghi. Khoản cũ được ghi «đã huỷ», khoản đúng được ghi thay trong cùng một lần; lý do ít nhất 10 ký tự. Sau Đã giao thì tổng đã thu phải giữ nguyên, và đây là đường sửa duy nhất. | có hộp nhập (số tiền đúng, hình thức, người thu tiền, mã giao dịch, lý do ≥ 10 ký tự) | một phần: sửa tiếp bằng chính nút này; sổ vẫn giữ dòng cũ | `/api/ledger/receipt-replacements`<br>nhật ký `ledger_receipt_replaced` | `web/order.ts`: Sửa khoản thu đã ghi | đã chốt (rà soát 2026-11-04: tên đúng; chủ 2026-10-08 (lượt «Lệnh Thay» → «Sửa khoản thu đã ghi»), áp 2026-10-18) |
| **Huỷ khoản thu · Huỷ khoản trả lại** | Chi tiết đơn › thẻ Thanh toán › khối «Kế toán» hoặc dòng của từng khoản thu | Huỷ hẳn một khoản thu (hoặc khoản trả lại khách) ghi nhầm trước Đã giao: sổ giữ dòng cũ, ghi «đã huỷ» và thêm một dòng ngược lại. Máy chủ từ chối nếu khoản đó đã nộp về công ty, đã chuyển sang đơn khác hoặc làm đã thu thấp hơn số đã duyệt hoàn. | có hộp nhập (lý do bắt buộc) | không: không có nút khôi phục, muốn có lại phải ghi khoản thu mới | `/api/ledger/adjustments`<br>nhật ký `ledger_reversal` | `web/order.ts`: l.traLai ? "Huỷ khoản trả lại" : "Huỷ khoản thu" | đã chốt (rà soát 2026-11-04: tên đúng; chủ 2026-10-18 (hộp hỏi: «Huỷ khoản thu»; thay chữ «Đảo»)) |

### Sau Đã giao

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đề nghị phân định** | Chi tiết đơn › thẻ Thanh toán › khối «Kế toán» hoặc dòng của từng khoản thu (đơn đã giao) | Gửi một đề nghị (số tiền, lý do ít nhất 10 ký tự) để Quản trị hoặc Toàn quyền quyết định ai chịu khoản hoàn hay bồi thường khách sau khi đơn đã giao. Chỉ gửi đề nghị, chưa trừ tiền ai. | có hộp nhập (số tiền, lý do) | không: không có nút rút đề nghị; bước tiếp theo là Quản trị hoặc Toàn quyền quyết ở màn Phân định trách nhiệm | `/api/ledger/phan-dinh`<br>nhật ký `attribution_requested` | `web/order.ts`: Đề nghị phân định | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Ghi bù khoản thu** | Chi tiết đơn › thẻ Thanh toán › khối «Kế toán» (đơn đã giao mà sổ còn thiếu) | Với đơn đã giao mà sổ thu còn thiếu so với phải thu (dữ liệu cũ), thêm một khoản thu bù cho đủ. Đi cùng đường «Sửa khoản thu đã ghi» nhưng không có khoản cũ nào bị huỷ. | có hộp nhập (số tiền, hình thức, người thu tiền, lý do ≥ 10 ký tự) | một phần: sửa bằng «Sửa khoản thu đã ghi» | `/api/ledger/receipt-replacements`<br>nhật ký `ledger_receipt_replaced` | `web/order.ts`: Ghi bù khoản thu | đã chốt (rà soát 2026-11-04: tên đúng; chủ 2026-10-08 (tên «Ghi bù khoản thu»), áp 2026-10-18) |

### Nộp tiền về công ty

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đã nộp về công ty** | Chi tiết đơn › thẻ Thanh toán › khối «Kế toán» (dòng từng người còn giữ tiền) | Ghi rằng một nhân viên hoặc hướng dẫn viên đã nộp phần tiền mặt đang giữ của đơn này về công ty. Số nợ giữ tiền của người đó giảm đúng số đó; chuyển khoản chờ xác nhận thì không tính vào đây. | có: «Ghi ‹tên› đã nộp ‹số tiền› của đơn này về công ty?» | một phần: ghi ngược lại ở sổ công nợ (huỷ lần ghi nộp), cần Kế toán | `/api/ledger/settlements`<br>nhật ký `ledger_settlement` | `web/order.ts`: Đã nộp về công ty | đã chốt (rà soát 2026-11-04: tên đúng; chủ 2026-10-18 (lượt 2: «chưa nộp về công ty» thay «giữ hộ»)) |

### Hoàn tiền khách trả dư

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ghi hoàn cho khách** | Chi tiết đơn › thẻ Thanh toán › khối «Kế toán» (khi khách trả dư) | Ghi rằng công ty hoặc một nhân viên đã trả lại cho khách phần tiền khách trả dư (số tiền, hình thức, người trả). Nền tảng chỉ ghi sổ, không chuyển tiền. | có hộp nhập (số tiền, hình thức, người trả cho khách) | một phần: ghi ngược ở sổ công nợ, cần Kế toán | `/api/ledger/refunds`<br>nhật ký `ledger_refund` | `web/order.ts`: Ghi hoàn cho khách | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Chốt đơn

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đã giao – đã thu đủ** | Chi tiết đơn › thẻ Thanh toán (dưới các dòng tiền) | Chốt rằng tour đã xong và khách đã trả đủ: đơn bị khoá, không sửa, không huỷ, không đổi người phụ trách, không ghi thêm khoản thu. Cùng lúc Nền tảng ghi các dòng hoa hồng đại lý, giá vốn nhà cung cấp và giảm giá do bên đặt chịu của đơn vào sổ. Nút mờ khi chưa đủ điều kiện, lý do hiện ở dòng «Đang giữ đơn». | có: hộp của trình duyệt (confirm) | không: không có nút mở lại; sửa sai chỉ qua «Sửa khoản thu đã ghi» và «Đề nghị phân định» | `/api/orders/:x/delivered`<br>nhật ký `order_delivered` | `web/order.ts`: Đã giao – đã thu đủ / Hoàn thành<br>`web/order.ts`: ⟪loai === "delivered"⟫ | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Hoàn thành** | Chi tiết đơn › thẻ Thanh toán (dưới các dòng tiền, sau khi đơn đã giao) | Đóng sổ của đơn đã giao sau khi mọi người đã nộp tiền và đã thu đúng số phải thu. Từ lúc đó các nút ghi sổ của Kế toán trên đơn (sửa, huỷ khoản thu, ghi nộp…) biến mất. | có: hộp của trình duyệt (confirm) | không: «Không mở lại được» | `/api/orders/:x/completed`<br>nhật ký `order_completed` | `web/order.ts`: Đã giao – đã thu đủ / Hoàn thành | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Thu tiền

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ghi khoản thu** | Chi tiết đơn › thẻ Thanh toán | Ghi một khoản khách đã trả vào đơn (số tiền, hình thức, ai thu). Nếu người ghi không phải Kế toán và chọn «Công ty» với chuyển khoản, khoản này chỉ là lời khai chờ Kế toán đối chiếu: nó được cộng vào đã thu nhưng đơn chưa Đã giao được. Chọn khách trả cho đại lý hoặc nhà cung cấp thì chờ Kế toán xác nhận với bên đó. Không ghi được sau Đã giao. | không (bấm Ghi trong hàng mở là ghi luôn; có hỏi riêng khi nghi trùng khoản) | một phần: trước Đã giao sửa bằng «Sửa khoản thu đã ghi» hoặc huỷ bằng «Huỷ khoản thu» (chỉ Kế toán, Toàn quyền) | `/api/orders/:x/payments`<br>nhật ký `payment_recorded` | `web/order.ts`: Ghi khoản thu<br>`web/order.ts`: Ghi | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Lưu ảnh** | Bảng «QR thanh toán» | Lưu ảnh mã QR thanh toán (kèm số tiền, nội dung chuyển khoản) vào máy, hoặc mở bảng chia sẻ của điện thoại để gửi cho khách. Không ghi gì vào Nền tảng. | không | không áp dụng | (chưa nối) | `web/order.ts`: Lưu ảnh | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Ghi khoản thu này** | Bảng «QR thanh toán» | Đóng bảng QR rồi mở form «Ghi khoản thu» ngay dưới, điền sẵn số tiền của mã vừa tạo. Bấm nút này chưa ghi gì vào sổ; phải bấm «Ghi» trong form mới ghi khoản thu. | không | không áp dụng | (chưa nối) | `web/order.ts`: Ghi khoản thu này | đã chốt (ADR-0166 câu 10) |
| **QR thanh toán** | Chi tiết đơn › thẻ Thanh toán | Mở bảng tạo mã QR chuyển tiền vào tài khoản công ty cho số còn lại (hoặc số bạn nhập). Chỉ có với đơn đã xác nhận, chưa Đã giao, còn tiền phải thu. Không ghi gì. | không | không áp dụng | (chưa nối) |  | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Xác nhận đơn

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Xác nhận đơn** | Chi tiết đơn › nhóm nút đầu trang (đơn nháp) | Chốt đơn nháp thành đơn đã xác nhận ngay (khi đơn không thuộc diện cần người kiểm vé): dịch vụ và đơn giá bị khoá, mức hoa hồng của ngày xác nhận được chụp lại, vé điện tử được cấp, khoản khách khai đặt cọc trở thành khoản thu của người lập. | có: hộp của trình duyệt (confirm) kèm các cảnh báo sớm | một phần: không về nháp được; chỉ sửa thông tin chuyến, số khách có lý do, hoặc huỷ đơn | `/api/orders/:x/status`<br>nhật ký `confirmed` | `web/order.ts`: Xác nhận đơn<br>`web/order.ts`: ‹…› ‹…› / ⟪prompt⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Gửi kiểm vé** | Chi tiết đơn › nhóm nút đầu trang (đơn nháp cần người kiểm vé) | Gửi đơn nháp cho người kiểm vé (Bán hàng, Kế toán, Quản trị, Hướng dẫn viên) kiểm còn vé; đơn vào hàng chờ có hạn, trong lúc chờ không sửa được cho tới khi «Rút lại». Không gửi gì cho khách. Chỉ khi đơn thuộc diện cần xác nhận, lúc đó nút thay cho «Xác nhận đơn». | không | được: bằng nút «Rút lại» | `/api/orders/:x/gui-xac-nhan`<br>nhật ký `order_confirm_requested` | `web/xac-nhan-don-ui.ts`: Gửi kiểm vé | đã chốt (ADR-0166 câu 8) |
| **Rút lại** | Chi tiết đơn › nhóm nút đầu trang (đơn đang chờ người kiểm vé) | Người lập rút yêu cầu kiểm vé đang chờ; yêu cầu khép lại và đơn sửa được trở lại. Người kiểm vé đang mở đơn bấm sau sẽ bị báo đơn vừa đổi. | có: hộp của trình duyệt (confirm) | được: gửi lại bằng «Gửi kiểm vé» hoặc «Gửi đơn» | `/api/orders/:x/rut-xac-nhan`<br>nhật ký `order_confirm_withdrawn` | `web/xac-nhan-don-ui.ts`: Rút lại<br>`web/xac-nhan-don-ui.ts`: Rút lại yêu cầu xác nhận? Đơn trở về nháp để bạn sửa tiếp. | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Gửi đơn** | Chi tiết đơn › nhóm nút đầu trang (đơn nháp của Đối tác) | Đối tác gửi đơn nháp lên văn phòng. Nếu đơn thuộc diện cần kiểm vé hay có lượt Đón chưa có giờ thì vào hàng chờ kiểm vé (nhánh A). Nếu không thì đơn được xác nhận ngay: dịch vụ và tiền bị khoá, mức hoa hồng được chụp, vé điện tử được cấp (nhánh B). | không | một phần: nhánh A rút bằng «Rút lại»; nhánh B không rút được, chỉ huỷ đơn | `/api/orders/:x/gui-don`<br>nhật ký `order_confirm_requested` | `web/xac-nhan-don-ui.ts`: Gửi đơn | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Huỷ đơn

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Huỷ đơn** | Chi tiết đơn › nhóm nút đầu trang (đơn nháp hoặc đã xác nhận, chưa giao) | Huỷ đơn kèm lý do bắt buộc. Lý do thuộc nhóm Khách huỷ, Công ty huỷ hay Huỷ để lập lại, và nhóm đó quyết định công ty có giữ khoản khách đã trả và có hạn hoàn tiền hay không. Vé điện tử chưa mở được trả về kho, vé đã mở thì bị huỷ, không về kho; chuyến xe được cập nhật. «Công ty huỷ» chỉ Quản trị, Toàn quyền chọn được. | có: hộp chọn lý do ngay dưới nút («Huỷ đơn này? Việc huỷ không hoàn tác được.») | không: huỷ không hoàn tác được; chỉ Quản trị, Toàn quyền đổi nhóm lý do «Khác» bằng «Phân loại lý do» | `/api/orders/:x/status`<br>nhật ký `cancelled` | `web/order.ts`: Huỷ đơn | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Kiểm vé

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Còn vé, xác nhận đơn** | Chi tiết đơn › bảng «Xác nhận đơn» (đơn đang chờ, người kiểm vé) | Chốt luôn đơn thành đã xác nhận (có thể đổi ngày đi và giờ đón trong cùng lần bấm): giá và dịch vụ bị khoá, mức hoa hồng được chụp, vé điện tử được cấp, khoản khách khai đặt cọc trở thành khoản thu của người lập đơn. Lượt dưới hạn chốt cần đặt gấp (chỉ Bán hàng, Quản trị, Toàn quyền). | có: hộp «Còn vé, xác nhận đơn?» nói bấm là chốt đơn ngay, không hoàn tác được; giá của đơn bị khoá, hoa hồng được chụp lại, vé được cấp nếu kho còn, tiền cọc khách đã khai thành khoản thu. Huỷ hộp thì không gọi máy chủ (ADR-0166 câu 4) | không: không về lại chờ được; chỉ sửa chuyến, số khách có lý do hoặc huỷ đơn | `/api/orders/:x/quyet-dinh`<br>nhật ký `confirmed` | `web/xac-nhan-don-ui.ts`: Còn vé, xác nhận đơn | đã chốt (ADR-0166 câu 4) |
| **Hết vé** | Chi tiết đơn › bảng «Xác nhận đơn» (người kiểm vé) | Huỷ đơn đang chờ với lý do «Hết chỗ» (nhóm Công ty huỷ, máy chủ tự gán, không cần quyền chọn nhóm). Vé điện tử trả lại, đơn huỷ không hoàn tác được. | có: hộp của trình duyệt (confirm) | không: huỷ không hoàn tác được | `/api/orders/:x/quyet-dinh`<br>nhật ký `cancelled` | `web/xac-nhan-don-ui.ts`: Hết vé<br>`web/xac-nhan-don-ui.ts`: Báo hết vé? Đơn sẽ được huỷ với lý do «hết chỗ». | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Huỷ** | Chi tiết đơn › bảng «Xác nhận đơn» (người kiểm vé) | Huỷ đơn đang chờ kèm lý do chọn trong danh sách (dùng khi cần đổi tiền: người lập tạo lại). Cùng hậu quả với nút «Huỷ đơn», lý do quyết định hoàn tiền; «Công ty huỷ» chỉ Quản trị, Toàn quyền chọn được. | có: hộp chọn lý do ngay dưới nút | không: huỷ không hoàn tác được | `/api/orders/:x/quyet-dinh`<br>nhật ký `cancelled` | `web/xac-nhan-don-ui.ts`: Huỷ<br>`web/xac-nhan-don-ui.ts`: Huỷ đơn | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Đặt gấp** | Chi tiết đơn › bảng «Xác nhận đơn» › lượt dưới hạn chốt | Trong bảng Còn vé, xác nhận đơn, mở khung chọn lý do đặt gấp cho lượt đón đã qua hạn chốt. Bấm «Duyệt đặt gấp» ở đây chỉ giữ lý do trong bảng, chưa ghi vào Nền tảng; lý do chỉ được ghi khi bấm «Còn vé, xác nhận đơn». | không | được: chưa bấm Còn vé, xác nhận đơn thì chưa ghi gì | `/api/orders/:x/quyet-dinh`<br>nhật ký `order_leg_short_notice` | `web/xac-nhan-don-ui.ts`: Đặt gấp | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Đổi khách

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đúng, qua ‹tên đối tác›** | Bảng «Đổi khách» (dưới ô số điện thoại khách); cũng ở form Tạo đơn | Chọn đối tác trùng số điện thoại làm bên đặt trong bảng đang mở. Chưa ghi gì cho tới khi bấm «Lưu khách» (hoặc Lưu đơn); khi lưu, người hưởng hoa hồng đổi theo. | không | được: chưa lưu thì chưa đổi gì | (chưa nối) | `web/canh-bao-doi-tac.ts`: Đúng, qua ‹…› | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Lập đơn: lưu và gửi

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu đơn (chưa xác nhận) (đơn mới, người không giữ quyền Đối tác) · Lưu thay đổi (đang sửa đơn nháp) · Gửi đơn (đơn mới, người giữ quyền Đối tác)** | Tạo đơn / Sửa đơn nháp (form lập đơn) | Với Bán hàng, Quản trị, Toàn quyền, Thực tập: chỉ lưu đơn ở dạng nháp. Không gửi cho ai, không xác nhận, không báo ai (tin Bảng tin chỉ làm mới màn hình), nhật ký ghi «Tạo đơn». Màn hình tự chuyển sang trang đơn và mở hộp «Ảnh gửi khách» (hộp này chỉ dựng ảnh gửi khách, chưa xác nhận gì); người lập phải đóng hộp rồi tự bấm «Xác nhận đơn» (hoặc «Gửi kiểm vé» nếu đơn thuộc diện cần xét). Với người giữ quyền Đối tác thì nút này tên «Gửi đơn», lưu rồi gọi tiếp lệnh gửi: máy chủ hoặc mở yêu cầu xác nhận (đơn chờ nhân viên xét «Còn vé, xác nhận đơn»), hoặc tự xác nhận luôn nếu đơn không cần xét (khi đó đơn thành «Đã xác nhận» ngay và chuyển cho chuyên viên phụ trách). Lưu xong mà gửi hỏng thì đơn vẫn còn ở nháp. | không | một phần: nháp sửa được bằng «Lưu thay đổi»; đơn Đối tác đã gửi rút lại được bằng «Rút lại»; nhánh tự xác nhận thì dịch vụ và đơn giá bị khoá | `/api/orders`<br>`/api/orders/:x`<br>nhật ký `created` | `public/order-form.html`: Lưu đơn (chưa xác nhận) | đã chốt (ADR-0166 câu 5) |

### Lập đơn: lối vào

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **+ Tạo đơn** | Đơn hàng (danh sách đơn) | Chỉ mở form lập đơn trắng. Không ghi gì. Nút chỉ hiện với tài khoản có quyền lập đơn. | không | được: bỏ form không lưu | (chưa nối) | `public/orders.html`: Tạo đơn | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Cài đặt vận hành

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Bật ẩn thông tin khách · Tắt ẩn thông tin khách** | Tôi (trang cá nhân) › khối «Ẩn thông tin khách khi đối tác đặt vé» | Đổi công tắc chung. Khi bật, form Tạo đơn của tài khoản Đối tác thuần không còn ô tên, số điện thoại và danh sách khách, và đơn lập lúc bật không cần danh sách khách để xe chạy. Đơn đã lập không đổi, đơn của Bán hàng không đổi, thông tin khách đã có không bị che đi. | không | được: bấm Tắt ẩn thông tin khách (đơn lập lúc đang bật vẫn giữ dấu miễn danh sách) | `/api/cai-dat/an-thong-tin-khach`<br>nhật ký `partner_customer_policy_changed` | `web/an-khach-cai-dat.ts`: Tắt ẩn thông tin khách / Bật ẩn thông tin khách | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Bật cả nhóm · Tắt cả nhóm** | Dịch vụ cần kiểm vé › công tắc «Cả nhóm cần kiểm vé» › hộp hỏi lại | Đổi cài đặt kiểm vé cho mọi vé của một nhóm dịch vụ. Bật thì đơn mới có vé thuộc nhóm phải chờ người kiểm vé báo còn vé rồi mới được xác nhận; tắt thì xác nhận như thường. Vé đã đặt riêng không đổi; đơn đã xác nhận không đổi. | có: hộp nói rõ hậu quả trước khi đổi | được: gạt ngược lại | `/api/cai-dat/xac-nhan-don`<br>nhật ký `confirm_flag_changed` | `web/dich-vu-kiem-ve.ts`: Bật cả nhóm / Tắt cả nhóm | chờ chọn (tên mới 2026-11-04, chờ chủ chọn) |
| **Bật dịch vụ nhập tay · Tắt dịch vụ nhập tay** | Tôi (trang cá nhân) › khối «Dịch vụ nhập tay» | Đổi công tắc chung. Bật thì Bán hàng, Quản trị, Toàn quyền thêm được dịch vụ gõ tên và giá tay khi lập, sửa đơn nháp; Đối tác thì không bao giờ dùng được. Tắt thì dịch vụ nhập tay đã có trên đơn vẫn giữ, chỉ xem. | không | được: bấm nút ngược lại | `/api/cai-dat/nhap-tay`<br>nhật ký `manual_service_policy_changed` | `web/nhap-tay-cai-dat.ts`: Tắt dịch vụ nhập tay / Bật dịch vụ nhập tay | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Sửa đơn đã xác nhận: khách và bên đặt

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu khách** | Chi tiết đơn › nút «Đổi khách» mở bảng «Đổi khách» | Đổi tên, số điện thoại khách trên đơn và đổi bên đặt (hồ sơ khách, hoặc «Qua đối tác» để chọn đối tác). Với đơn đã xác nhận mà bên đặt đổi thật, máy chụp lại mức hoa hồng và người hưởng cùng lô, và từ chối nếu giảm giá đang lớn hơn hoa hồng mới. Bản biên nhận đã gửi khách có thể sai. | không (chỉ dòng cảnh báo cố định trong bảng: bản xác nhận đã gửi khách có thể lỗi thời) | một phần: đổi lại được bằng một lần «Đổi khách» nữa, nhưng mức hoa hồng bị chụp lại theo từng lần (bản cũ vẫn còn trong lịch sử) | `/api/orders/:x/booker`<br>nhật ký `booker_changed` | `web/booker-sheet.ts`: Lưu khách<br>`web/booker-sheet.ts`: [biểu tượng close] | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Chống ghi trùng khoản thu

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Vẫn ghi** | Hộp «Có thể trùng» (hiện khi ghi khoản thu ở Chi tiết đơn và ở Phân định) | Gửi lại đúng lệnh ghi khoản thu vừa bị máy chủ nghi trùng, kèm lý do (tối thiểu 10 ký tự, không ghi số điện thoại). Khoản thu được ghi như bình thường; lý do và người bấm vào nhật ký. «Xem bản cũ» không hiện gì thêm, chỉ đóng hộp và báo «Chưa ghi gì». | có hộp nhập: bắt buộc nhập lý do | một phần: huỷ được bằng «Huỷ khoản thu» (ghi dòng ngược, không xoá) | (chưa nối) | `web/canh-bao-trung.ts`: Vẫn ghi<br>`web/canh-bao-trung.ts`: Xem bản cũ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đặt gấp (dưới hạn chốt)

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đặt gấp (mở khung) · Duyệt đặt gấp** | Form Tạo đơn / Sửa đơn nháp, dải cảnh báo dưới hạn chốt; cũng ở Chi tiết đơn và bảng «Sửa đưa đón» | Người lập tự chọn lý do và ghi chú ngắn rồi đóng dấu «đặt gấp» cho lượt đưa đón đang dưới hạn chốt 6 giờ, để xác nhận đơn và xếp xe được. Không có người thứ hai duyệt. Riêng trong form Tạo đơn, nút này lưu luôn cả đơn (cùng lệnh lưu nháp) rồi mới đóng dấu, và chuyển sang trang đơn; nếu đóng dấu hỏng thì đơn vẫn đã lưu. | có hộp nhập: lý do bắt buộc, ghi chú ngắn tuỳ ý | một phần: dấu đặt gấp bị bỏ khi giờ lượt đó được sửa lại thành trên hạn chốt; không có nút gỡ riêng (chưa tìm thấy) | `/api/orders/:x/legs/:x/short-notice`<br>nhật ký `order_leg_short_notice` | `web/dat-gap-ui.ts`: Duyệt đặt gấp<br>`web/dat-gap-ui.ts`: Đặt gấp<br>`web/dat-gap-ui.ts`: Đóng | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Phân công: Hướng dẫn viên

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu Hướng dẫn viên** | Chi tiết đơn › khối Hướng dẫn viên, bảng «Chọn Hướng dẫn viên» / «Đổi Hướng dẫn viên» | Giao đơn cho Hướng dẫn viên đã chọn. Người cũ (nếu có) bị đóng dòng phụ trách, người mới nhận đơn trong «Đơn của tôi». Dùng chung lệnh với nút «Nhận làm HDV» của Hướng dẫn viên, khác ở chỗ ở đây người khác được giao hộ. Không có hộp hỏi lại. | không | được: giao lại cho người khác (người cũ là Hướng dẫn viên thì mất đơn) | `/api/orders/:x/handler`<br>nhật ký `order_handler_changed` | `web/handler-sheet.ts`: Lưu Hướng dẫn viên<br>`web/handler-sheet.ts`: [biểu tượng close] | đã chốt (chủ 2026-11-05 (hai vai khác nhau trên mỗi đơn: nút lưu trong bảng «Lưu Hướng dẫn viên»)) |

### Phân công: người phụ trách (Bán hàng)

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu người phụ trách** | Chi tiết đơn › khối Người phụ trách, bảng «Chọn người phụ trách» / «Đổi người phụ trách» | Đặt người Bán hàng đã chọn làm người phụ trách của đơn đã xác nhận (hoặc thay người cũ). Chỉ Quản trị, Toàn quyền. Người cũ nhận tin ở Bảng tin, người lập nhận tin trong hộp thư. Không có hộp hỏi lại. | không | được: đổi lại bằng nút «Đổi người phụ trách» (trước Đã giao) | `/api/orders/:x/ban-hang`<br>nhật ký `sales_owner_changed` | `web/handler-sheet.ts`: Lưu người phụ trách | đã chốt (chủ 2026-11-05 (người phụ trách là vai khác Hướng dẫn viên); ADR-0142) |

### Đối chiếu tiền

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Bên kia đã nhận** | Trang chủ › khối «Chờ đối chiếu», mỗi dòng có nút «Bên kia đã nhận» và hộp xác nhận (cùng việc ở Chi tiết đơn › Thanh toán) | Kế toán ghi rằng khoản khách trả cho đại lý hoặc trả tại quầy nhà cung cấp, bên đó đã nhận thật. Máy ghi một dòng sổ: bên đó đang giữ khoản tiền đó và chưa nộp về công ty. Không cần mã giao dịch. Khoản «Công ty thu» thì không có nút này, phải xác nhận ở trang đơn kèm mã giao dịch ngân hàng. | có: «… đã đối chiếu, bên nhận tiền xác nhận đã nhận <số tiền> (đơn <mã>)?» | một phần: bên kia báo không nhận thì bấm «Huỷ khoản thu» (Hướng dẫn Kế toán), ghi dòng ngược | `/api/ledger/counterparty-receipts/:x/confirm`<br>nhật ký `ledger_counterparty_confirmed` | `web/home.ts`: Xác nhận đã nhận<br>`web/home.ts`: ⟪nutXacNhanDoiChieu(k.loai)⟫ | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Việc gấp của Trang chủ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Xác nhận ngay** | Trang chủ máy tính › dải việc gấp đầu trang | Chỉ là liên kết mở trang «Đơn chờ xác nhận». Không xác nhận đơn nào. Ở trang đó người xét mới chọn «Còn vé, xác nhận đơn», «Hết vé» hoặc «Huỷ» cho từng đơn. | không | được: không ghi gì | (chưa nối) | `web/home.ts`: Xác nhận ngay | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Đưa đón: bỏ lượt

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Bỏ lượt (liên kết) · Bỏ lượt (nút đỏ xác nhận)** | Form Tạo đơn (khối Đưa đón: «Bỏ lượt» xoá ngay trên form) và bảng «Sửa đưa đón» của đơn đã xác nhận (hỏi lý do rồi «Bỏ lượt» đỏ) | Trong form Tạo đơn: bỏ lượt khỏi danh sách đang gõ, chưa lưu gì. Trong bảng «Sửa đưa đón»: nút đỏ «Bỏ lượt» chỉ xoá lượt khỏi bảng và nhớ lý do; lượt chỉ thật sự đóng khi bấm «Lưu» của bảng (khi đó ghi lệnh «Bỏ lượt đưa đón» kèm lý do, lượt vẫn xem được trong lịch sử đơn). Đóng bảng bằng «Huỷ» thì mất. | có: hỏi lý do rồi nút đỏ; hộp có chữ «Lượt đã bỏ không mất — xem trong lịch sử đơn.» | một phần: lượt đóng không hiện lại, phải thêm lượt mới; lịch sử còn | `/api/orders/:x/legs/:x/close`<br>nhật ký `order_leg_closed` | `web/khoi-dua-don.ts`: Bỏ lượt<br>`web/khoi-dua-don.ts`: Thôi | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Hành khách trên đơn

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Huỷ người (đơn đã xác nhận) · Xoá (đơn nháp)** | Bảng «Sửa danh sách hành khách» của đơn đã xác nhận (trên form nháp nút này là «Xoá») | Đánh dấu dòng tên khách nhập nhầm là đã huỷ rồi bỏ khỏi bảng; dòng chỉ thật sự được ghi khi bấm «Lưu» ở chân bảng. Chỉ bỏ tên trong danh sách hành khách, KHÔNG đổi số khách đã tính tiền, không đổi tiền, không huỷ dịch vụ của người đó. | có: «Huỷ <tên> khỏi danh sách? (dùng khi nhập nhầm)» | một phần: thêm lại tên bằng dòng mới; dòng huỷ không xoá hẳn, vẫn nằm trong lịch sử | `/api/orders/:x/passengers`<br>nhật ký `order_passenger_changed` | `web/khoi-hanh-khach.ts`: Huỷ người<br>`web/khoi-hanh-khach.ts`: Huỷ người / Xoá<br>`web/khoi-hanh-khach.ts`: Thôi | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Lưu** | Chi tiết đơn › bảng «Sửa danh sách hành khách» | Gửi một lệnh ghi toàn bộ thay đổi tên, năm sinh, loại khách: dòng mới là thêm, sửa là ghi dòng mới, huỷ là đánh dấu huỷ. Không đổi số khách và tiền. Đơn đang chờ xác nhận (có yêu cầu mở) bị chặn. | không | một phần: sửa lại bằng lần lưu khác; lịch sử giữ lại | `/api/orders/:x/passengers`<br>nhật ký `order_passenger_changed` | `web/sheet-hanh-khach.ts`: Lưu<br>`web/sheet-hanh-khach.ts`: Huỷ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Lập đơn: dịch vụ nhập tay

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Xoá dòng · (thùng rác) Xoá dịch vụ** | Form Tạo đơn › thẻ dịch vụ nhập tay (Xoá dòng) và biểu tượng thùng rác của thẻ dịch vụ (Xoá dịch vụ) | Bỏ một dòng, hoặc cả dịch vụ, khỏi đơn đang gõ trên form. Chưa lưu gì cho tới khi bấm nút lưu của form; lúc lưu nháp, dòng và dịch vụ của đơn nháp được xoá thật rồi chèn lại (ngoại lệ có tên của luật «không xoá cứng»). | không | được: thêm lại, hoặc tải lại trang để bỏ thay đổi | (chưa nối) | `web/service-card.ts`: Xoá dòng<br>`web/service-card.ts`: [biểu tượng trash] | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đưa đón: sửa sau xác nhận

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu** | Chi tiết đơn › bảng «Sửa đưa đón» | Gửi lần lượt từng lệnh: thay lượt, bỏ lượt, sửa lượt, thêm lượt, mỗi lệnh ghi riêng. Lệnh nào hỏng thì dừng; các lệnh trước đó đã lưu (có nút «Tải lại đơn»). Lượt dưới hạn chốt 6 giờ cần đặt gấp trong bảng. | không | một phần: sửa lại; lượt đã bỏ không hiện lại | `/api/orders/:x/legs/:x/replace`<br>`/api/orders/:x/legs/:x/close`<br>`/api/orders/:x/legs/:x`<br>`/api/orders/:x/legs` | `web/sheet-dua-don.ts`: Lưu<br>`web/sheet-dua-don.ts`: Huỷ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Sửa số khách (văn phòng)

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu số khách** | Chi tiết đơn › nút «Sửa số khách dịch vụ» mở bảng cùng tên | Đổi số khách từng loại của dịch vụ danh mục trên đơn đã xác nhận, chưa Đã giao, kèm lý do chọn trong bốn mục. Máy tính lại tiền theo đơn giá đã chốt (giảm giá giữ nguyên) và cân lại vé điện tử (trả bớt hoặc cấp thêm). | không (có dòng chữ «Nền tảng tự tính lại tiền…») | một phần: sửa lại số khách bằng lần lưu khác; mỗi lần ghi một dòng điều chỉnh, lịch sử giữ | `/api/orders/:x/money-edit`<br>nhật ký `order_money_adjusted` | `web/sheet-so-khach.ts`: Lưu số khách<br>`web/sheet-so-khach.ts`: Huỷ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Sửa thông tin chuyến

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu thông tin chuyến** | Chi tiết đơn › nút «Sửa thông tin chuyến» mở bảng cùng tên | Ghi ngày khởi hành của cả đơn, giờ khởi hành, giờ và nơi khách có mặt, ghi chú của từng dịch vụ. Đổi ngày khởi hành thì ngày đón các lượt đưa đón dời theo cùng số ngày. Lượt dưới hạn chốt 6 giờ cần đặt gấp. | không (có dòng cảnh báo cố định: bản xác nhận đã gửi khách có thể lỗi thời) | một phần: sửa lại bằng lần lưu khác | `/api/orders/:x/trip`<br>nhật ký `trip_updated` | `web/trip-sheet.ts`: Lưu thông tin chuyến<br>`web/trip-sheet.ts`: [biểu tượng close] | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Việc của tôi: trả đơn

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Từ chối đơn** | Việc của tôi › thẻ Đơn của tôi, nút «Từ chối đơn» mở hộp «Từ chối đơn <mã>?»; cũng ở Chi tiết đơn › khối Hướng dẫn viên | Người đang phụ trách trả đơn lại: dòng phụ trách của họ đóng, đơn quay về danh sách «Chờ nhận» (kèm chữ «được trả lại»), người khác nhận được. Không huỷ đơn, không đổi gì với khách. Phải chọn một lý do (không có ô gõ chữ). Có hạn mức: tối đa 2 đơn liên tiếp, 15 lần mỗi tuần; đơn đi hôm nay hoặc ngày mai thì không còn nút. Người trả không mở được đơn đó nữa. | có hộp chọn lý do: «Đơn sẽ quay về danh sách Chờ nhận để người khác nhận.» | không: người trả phải nhờ người nhận hoặc văn phòng giao lại; còn tính vào hạn mức | `/api/orders/:x/handler-refuse`<br>nhật ký `order_handler_refused` | `web/tu-choi-sheet.ts`: Xác nhận từ chối<br>`web/tu-choi-sheet.ts`: Không từ chối<br>`web/viec-cua-toi.ts`: Từ chối đơn | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Việc của tôi: nhận đơn

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Nhận · Đang nhận…** | Việc của tôi › khối «Đơn chờ nhận», mỗi thẻ một nút «Nhận» | Người bấm tự trở thành người phụ trách đơn chưa có ai: dòng phụ trách mở ngay, đơn qua danh sách «Đơn của tôi», người khác thấy đơn biến khỏi «Chờ nhận». Nhanh người tay trước thắng. Không hỏi lại. Máy chủ từ chối nhận đơn nháp, đã huỷ, đã qua ngày đi, hoặc tài khoản giữ quyền Đối tác. | không | một phần: chỉ bằng «Từ chối đơn», có hạn mức, và với đơn đi hôm nay hoặc ngày mai thì phải gọi văn phòng | `/api/orders/:x/handler`<br>nhật ký `order_claimed` | `web/viec-cua-toi.ts`: Nhận | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Việc của tôi: sửa số khách (hướng dẫn viên)

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa số khách** | Việc của tôi › thẻ Đơn của tôi, nút «Sửa số khách» mở bảng «Sửa số khách <mã>» | Hướng dẫn viên ghi số khách thực tế từng loại (đơn đã xác nhận, đến hết ngày đi), kèm lý do gõ tay hoặc chọn nhanh. Máy ghi dòng điều chỉnh, tính lại tiền của đơn (hướng dẫn viên không thấy giá) và cân lại vé điện tử. Không sửa dịch vụ nhập tay. | có hộp nhập: lý do bắt buộc | một phần: sửa lại số khách bằng lần lưu khác; mỗi lần là một dòng điều chỉnh | `/api/orders/:x/handler-money-edit`<br>nhật ký `order_money_adjusted_by_field` | `web/viec-cua-toi.ts`: Sửa số khách<br>`web/viec-cua-toi.ts`: Xác nhận<br>`web/viec-cua-toi.ts`: Đóng | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Việc của tôi: huỷ đơn

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Huỷ đơn** | Việc của tôi › thẻ Đơn của tôi, nút «Huỷ đơn» mở bảng «Huỷ đơn <mã>?» | Huỷ cả đơn của khách (không phải chỉ rời việc), đơn chuyển «Đã huỷ». Chỉ với đơn đã xác nhận, chưa qua ngày đi, chưa Đã giao. Chọn lý do: Không liên hệ được với khách, Khách yêu cầu huỷ, hoặc Khác (gõ lý do, không chứa số điện thoại). Vé điện tử chưa mở được trả về kho (vé đã mở thì bị huỷ) và chuyến xe đồng bộ. | có: «Đơn của <khách>, đi <ngày>. Thao tác này không hoàn tác được.» và chọn lý do | không: «Thao tác này không hoàn tác được.» | `/api/orders/:x/handler-cancel`<br>nhật ký `order_cancelled_by_field` | `web/viec-cua-toi.ts`: Huỷ đơn<br>`web/viec-cua-toi.ts`: Không huỷ | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Vé điện tử: cài đặt

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu** | Cài đặt vé điện tử | Lưu «Số vé tối đa mỗi lô» (từ giới hạn nhỏ nhất đến lớn nhất). Số mới chỉ áp cho các lô nhập từ lúc đó, vé đã nhập giữ nguyên. | không | được: lưu lại số cũ | `/api/ve/cai-dat`<br>nhật ký `ve_doi_tran_lo` | `web/ve-cai-dat.ts`: Lưu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Vé điện tử: đơn

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Cấp vé** | Chi tiết đơn › khối «Vé điện tử» (chỉ hiện khi đơn còn thiếu vé) | Chạy lại việc giữ vé từ kho cho đơn đã xác nhận theo số khách hiệu lực. Chạy mấy lần cũng không giữ thừa. Vé chỉ được giữ, chưa lộ, nên còn trả về kho được. | không | được: vé giữ chưa lộ được trả về kho khi giảm khách hoặc huỷ đơn | `/api/ve/cap`<br>nhật ký `ve_giu_cho` | `web/ve-don.ts`: Cấp vé | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Vé điện tử: giao vé

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Mở N vé để gửi khách · Tải vé <số>** | Chi tiết đơn › khối «Vé điện tử» (đơn đã thu đủ) | Nút này tải ảnh của MỌI vé của đơn về máy. Mỗi lần tải ảnh, máy chủ ghi nhật ký «Xem ảnh vé» và đóng dấu «đã lộ» cho vé đó ngay lần đầu. Vé đã lộ không bao giờ về lại kho, kể cả khi đơn bị huỷ hoặc số khách giảm. Nút «Tải vé <số>» còn ghi thêm một lần «giao vé qua Zalo» khi bấm dù chỉ là lưu ảnh. | không | không: vé đã lộ không về kho | `/api/ve/giao`<br>nhật ký `ve_xem_anh` | `web/ve-don.ts`: Mở ‹…› vé để gửi khách<br>`web/ve-don.ts`: Tải vé ‹…› | đã chốt (ADR-0166 câu 3) |
| **Gửi Zalo** | Chi tiết đơn › khối «Vé điện tử» (hiện sau khi bấm «Chuẩn bị vé», chỉ trên máy chia sẻ được tệp) | Mở bảng chia sẻ của điện thoại với các ảnh vé. Người bấm tự chọn gửi cho ai và bằng ứng dụng nào. Khi bảng chia sẻ đóng thành công, máy chủ ghi «Giao N vé qua Zalo», dù người đó chọn ứng dụng khác Zalo. Nếu đóng bảng không chia sẻ thì không ghi. | không | không: tin đã gửi ra ngoài; vé đã lộ | `/api/ve/giao`<br>nhật ký `ve_giao` | `web/ve-don.ts`: Gửi Zalo | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Tạo đường dẫn cho khách · Sao chép** | Chi tiết đơn › khối «Vé điện tử» (đơn đã thu đủ) | Tạo một đường dẫn riêng để khách tự mở và lưu vé; đường dẫn chỉ hiện đúng một lần (mất là phải tạo lại), hết hạn sau ngày dùng cuối của vé thêm 7 ngày. Đồng thời đóng dấu «đã lộ» cho MỌI vé của đơn, nên cả vé chưa gửi cũng không về kho được nữa, kể cả khi thu hồi đường dẫn. | không | một phần: «Thu hồi» khoá đường dẫn, nhưng vé vẫn đã lộ | `/api/ve/duong-dan`<br>nhật ký `ve_tao_duong_dan` | `web/ve-don.ts`: Tạo đường dẫn cho khách<br>`web/ve-don.ts`: Sao chép | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Thu hồi** | Chi tiết đơn › khối «Vé điện tử» › dòng «Đường dẫn khách» | Khoá đường dẫn vé của khách: từ giờ khách mở đường dẫn đó sẽ không xem được vé. Vé vẫn tính là đã lộ, không về kho. | không | một phần: tạo đường dẫn mới; đường dẫn cũ không mở lại được | `/api/ve/duong-dan/:x/thu-hoi`<br>nhật ký `ve_thu_hoi_duong_dan` | `web/ve-don.ts`: Thu hồi | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Vé điện tử: kho

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Mở ảnh · Xem ảnh (vé đã mở)** | Kho vé điện tử › khối «Lô đã huỷ gần đây» › mỗi vé có nút «Mở ảnh»; vé đã mở có nút «Xem ảnh» | Mở ảnh của một vé trong lô đã huỷ. Lần mở đầu tiên khoá hẳn vé: không nhập lại vào kho để bán được nữa, không hoàn tác được, ghi nhật ký. Từ lần sau chỉ «Xem ảnh». | có: Mở ảnh vé này? — «Vé đã mở sẽ bị khoá hẳn: không nhập lại vào kho để bán được nữa và không hoàn tác được. Lần mở được ghi vào nhật ký.» | không: «không hoàn tác được» | `/api/ve/lo-da-huy/:x/mo`<br>nhật ký `ve_mo_anh_lo_huy` | `web/ve-kho.ts`: Mở ảnh<br>`web/ve-kho.ts`: Xem ảnh | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Huỷ lô** | Kho vé điện tử › khối «Các lô» › mỗi lô một nút «Huỷ lô» | Gỡ cả lô vé khỏi kho (chỉ lô chưa có vé nào từng được giữ cho đơn). Ảnh được lưu thêm vài ngày rồi tự xoá. Muốn dùng lại thì nhập đúng các ảnh đó trong lô mới. | có: Huỷ lô vé này? — «<N> vé của lô sẽ bị gỡ khỏi kho. Ảnh được lưu thêm <số> ngày rồi tự xoá. Muốn dùng lại thì nhập đúng các ảnh đó trong lô mới.» | một phần: nhập lại các ảnh trong lô mới trong thời hạn lưu ảnh | `/api/ve/lo/:x/bo`<br>nhật ký `ve_bo_lo` | `web/ve-kho.ts`: Huỷ lô | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Nhập lô vé** | Kho vé điện tử › khối nhập lô | Đọc mã QR của từng ảnh ngay trên máy, loại ảnh hỏng hoặc trùng, tạo lô, gửi các ảnh lên kho rồi đưa lô vào kho để bán. Ảnh nào bị loại thì báo kèm tên tệp. Lô gửi dở thì để lại trong danh sách «Các lô» để bấm «Huỷ lô». | không | được: «Huỷ lô» cho tới khi có vé được giữ cho đơn | `/api/ve/lo`<br>`/api/ve/lo/:x/ve`<br>`/api/ve/lo/:x/xac-nhan`<br>nhật ký `ve_nhap_lo`<br>nhật ký `ve_xac_nhan_lo` | `web/ve-kho.ts`: Nhập lô vé | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Hoa hồng: mức riêng của MỘT đối tác

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **＋ Thêm mức riêng cho đối tác** | Hoa hồng đối tác › nút đầu trang (máy tính) và thanh dính đáy (điện thoại) › hộp «Thêm mức hoa hồng» | Người dùng gõ tên MỘT đối tác, chọn dịch vụ (hoặc nhóm, hoặc mọi dịch vụ), chọn tính bằng phần trăm hay số tiền, chọn ngày; Nền tảng tạo một dòng mức chỉ của đối tác đó. Khi tính hoa hồng đây là bậc ưu tiên cao nhất: dòng của đối tác (dịch vụ, rồi nhóm, rồi mọi dịch vụ) thắng cấp riêng, mức riêng của vai trò và cấp của vai trò. Đơn đã xác nhận không đổi. | có hộp nhập | một phần: bấm «Ngừng» hoặc «Đổi» trên dòng đó; dòng đã ngừng không mở lại được, chỉ thêm dòng mới | `/api/pricing/hoa-hong`<br>nhật ký `prc_commission_rule_added` | `public/hoa-hong.html`: Thêm mức riêng cho đối tác<br>`web/hoa-hong.ts`: Thêm mức riêng cho đối tác<br>`web/hoa-hong-hop.ts`: Thêm mức | đã chốt (rà soát 2026-11-04: tên đúng; «Mức riêng» do chủ chọn 2026-10-25 (lượt 3, thay «Dòng riêng»); «cho đối tác» thay «cho vai» ở ADR-0161 Đ6 (2026-11-03)) |

### Hoa hồng: mức của MỘT CẤP (mọi vai trò và đối tác đang theo cấp)

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **＋ Thêm hoa hồng cho dịch vụ (và ô «—» của bảng nhập)** | Hoa hồng đối tác › thẻ Cấp độ đại lý › chi tiết cấp, và ô «—» trong bảng nhập (máy tính) › hộp «Thêm hoa hồng cho dịch vụ» | Thêm một dòng mức vào CẤP đang xem. Dòng này áp cho mọi vai trò đang theo cấp đó và mọi đối tác có cấp riêng là cấp đó, không riêng ai. Thứ tự khi tính hoa hồng: mức riêng của đối tác, cấp riêng của đối tác, mức riêng của vai trò, rồi cấp của vai trò; trong mỗi bước xét dịch vụ đó trước, rồi nhóm, rồi mọi dịch vụ. Cấp đã khoá thì không thêm được. | có hộp nhập | một phần: «Ngừng» hoặc «Đổi» dòng đó; dòng đã ngừng không mở lại | nhật ký `prc_commission_rule_added` | `web/hoa-hong-cap.ts`: Thêm hoa hồng cho dịch vụ<br>`web/hoa-hong-cap.ts`: —<br>`web/hoa-hong-hop.ts`: Thêm mức | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Hoa hồng: đổi một dòng mức

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đổi** | Hoa hồng đối tác › dòng mức (bảng của cấp, của đối tác, hoặc ô trong bảng nhập) › nút «Đổi» hoặc menu «⋯» › hộp «Đổi mức» | Dòng mức cũ ngừng đến hết ngày liền trước ngày mới, rồi mở dòng mới cùng đối tượng, cùng phạm vi, với mức mới. Dòng thuộc một cấp thì đổi cho mọi vai trò và đối tác đang theo cấp; dòng của một đối tác thì chỉ đổi cho đối tác đó. Dòng bắt đầu hôm nay thì mức mới sớm nhất từ ngày mai; đơn đã xác nhận giữ mức cũ. | có hộp nhập | một phần: đổi lại bằng một lần «Đổi» nữa; dòng cũ không mở lại được | `/api/pricing/hoa-hong/:x/doi`<br>nhật ký `prc_commission_rule_closed`<br>nhật ký `prc_commission_rule_added` | `web/hoa-hong-hop.ts`: Đổi mức<br>`web/hoa-hong-cap.ts`: ⟪nhanViec("DOI", loai)⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Hoa hồng: sửa một dòng mức nhập sai

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa** | Hoa hồng đối tác › dòng mức › menu «⋯» hoặc nút «Sửa» › hộp «Sửa mức» | Chưa có đơn nào dùng dòng đó thì dòng cũ bị huỷ và thay bằng dòng sửa (đổi được cả hai ngày). Đã có đơn dùng thì dòng cũ ngừng đến hết ngày liền trước phần sửa. Bắt buộc ghi lý do 10 đến 300 ký tự. Hộp nói trước sẽ đi đường nào. | có hộp nhập | một phần: sửa lại lần nữa; dòng bị huỷ hoặc đã ngừng không mở lại | `/api/pricing/hoa-hong/:x/sua`<br>nhật ký `prc_commission_rule_voided`<br>nhật ký `prc_commission_rule_closed` | `web/hoa-hong-hop.ts`: Lưu sửa | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Hoa hồng: ngừng một dòng mức

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ngừng** | Hoa hồng đối tác › dòng mức › nút trong menu «⋯» › hộp chọn ngày cuối | Đặt ngày cuối áp dụng cho dòng mức (mặc định hôm nay, tức từ ngày mai không còn). Dòng của cấp thì ngừng cho mọi vai trò và đối tác đang theo cấp; dòng của đối tác thì chỉ ngừng cho đối tác đó. Dịch vụ nào không còn mức nào khác phủ thì đơn xác nhận sau ngày đó bị giữ ở bước Đã giao tới khi Kế toán nhập tay. | có hộp nhập | một phần: thêm dòng mới; dòng đã ngừng không mở lại | `/api/pricing/hoa-hong/:x/dong`<br>nhật ký `prc_commission_rule_closed` | `web/hoa-hong-hop.ts`: ⟪o.nhan⟫<br>`web/hoa-hong-cap.ts`: ⟪nhanViec(v, loai)⟫ | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Hoa hồng: gán CẢ MỘT VAI TRÒ vào một cấp

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gán cho vai trò · Gán cho đối tác (ở cấp) · Chọn cấp cho vai trò này (ở vai trò chưa theo cấp nào)** | Hoa hồng đối tác › thẻ Cấp độ đại lý › chi tiết cấp › «Gán cho vai trò»; thẻ Vai người dùng › «Chọn cấp cho vai trò này» | Cho CẢ MỘT vai trò (mọi đối tác đang mang vai trò đó) theo một cấp từ ngày chọn. Không phải một đối tác riêng lẻ. Đối tác có mức riêng hoặc cấp riêng vẫn được tính trước cấp này. Đây là bậc cuối trong thứ tự tính: mức riêng của đối tác, cấp riêng của đối tác, mức riêng của vai trò, cấp của vai trò. Nếu vai trò còn mức riêng thì hiện khung vàng cảnh báo mức riêng thắng cấp. Đối tác có cấp riêng không bao giờ rơi xuống cấp của vai trò, kể cả với dịch vụ cấp riêng không có mức. Đối tác mang hai vai trò ở hai cấp khác mức thì không có hoa hồng cho tới khi sửa. Đơn đã xác nhận giữ mức đã chụp, không tính lại. | có hộp nhập | một phần: «Thôi theo cấp này» hoặc «Đổi cấp»; lần gán đã ghi không xoá | nhật ký `prc_role_tier_set` | `web/hoa-hong-hop.ts`: Lưu<br>`web/hoa-hong-cap.ts`: Gán cho vai trò<br>`web/hoa-hong-cap.ts`: Gán cho đối tác<br>`web/hoa-hong-loai.ts`: Chọn cấp cho vai trò này | đã chốt (ADR-0166 câu 1) |

### Hoa hồng: đổi cấp của CẢ MỘT VAI TRÒ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đổi cấp** | Hoa hồng đối tác › chi tiết cấp › mục «Vai người dùng đang theo cấp này» › nút «Đổi cấp» (hoặc menu «⋯») › hộp «Đổi cấp» | Lần gán cũ của vai trò ngừng đến hết ngày liền trước ngày bắt đầu, rồi vai trò theo cấp mới. Ảnh hưởng mọi đối tác của vai trò (trừ ai có mức riêng hoặc cấp riêng). Cấp mới phải đang mở; hộp nói trước cấp cũ sẽ ngừng đến hết ngày nào. | có hộp nhập | một phần: «Đổi cấp» lần nữa (cấp cũ đã khoá thì không đổi ngược về được) | `/api/pricing/muc-ta/gan/:x/doi`<br>nhật ký `prc_role_tier_closed`<br>nhật ký `prc_role_tier_set` | `web/hoa-hong-hop.ts`: Lưu<br>`web/hoa-hong-cap.ts`: ⟪nhanViec("DOI", loai)⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Hoa hồng: sửa lần gán cấp của một vai trò

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa** | Hoa hồng đối tác › dòng của vai trò trong chi tiết cấp › «Sửa» › hộp «Sửa cấp của vai trò» | Sửa nhầm lẫn của một lần gán vai trò vào cấp: đổi cấp, ngày bắt đầu hoặc ngày cuối, bắt buộc ghi lý do. Chưa có đơn dùng thì lần gán cũ bị huỷ và thay bằng dòng sửa; đã có đơn dùng thì lần gán cũ ngừng. Ảnh hưởng cả vai trò. Nếu vai trò còn mức riêng thì hiện khung vàng. | có hộp nhập | một phần: sửa lại; bản bị huỷ hoặc đã ngừng không mở lại | `/api/pricing/muc-ta/gan/:x/sua`<br>nhật ký `prc_role_tier_voided` | `web/hoa-hong-hop.ts`: Lưu sửa | đã chốt (rà soát 2026-11-04: tên đúng; «Sửa cấp của vai trò» thay «Sửa áp dụng cấp», chủ chọn 2026-10-30 (lượt 7)) |

### Hoa hồng: vai trò thôi theo cấp (ảnh hưởng CẢ vai trò)

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thôi theo cấp này** | Hoa hồng đối tác › dòng vai trò trong chi tiết cấp, hoặc thẻ Vai người dùng › menu «⋯» › hộp «Thôi theo cấp này» | Đặt ngày cuối cho lần vai trò theo cấp. Từ ngày sau đó, mọi đối tác mang vai trò này (trừ ai có mức riêng hoặc cấp riêng) không còn mức theo cấp nữa. Nếu vai trò không theo cấp nào khác, đơn xác nhận sau đó có dịch vụ chưa có mức bị giữ ở bước Đã giao tới khi Kế toán nhập tay. | có hộp nhập | một phần: chọn lại cấp bằng «Chọn cấp cho vai trò này»; lần gán đã ngừng không mở lại | `/api/pricing/muc-ta/gan/:x/ket-thuc`<br>nhật ký `prc_role_tier_closed` | `web/hoa-hong-cap.ts`: ⟪nhanViec(v, loai)⟫<br>`web/hoa-hong-hop.ts`: ⟪o.nhan⟫ | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Hoa hồng: cấp riêng của MỘT đối tác

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Chọn cấp riêng cho đối tác** | Hoa hồng đối tác › thẻ Vai người dùng › khối «Người có cấp riêng» (nút đầu khối và trong cụm từng đối tác) › hộp «Chọn cấp riêng cho đối tác» | Gán MỘT đối tác vào MỘT cấp từ ngày chọn. Từ ngày đó, đơn của đối tác này xét theo thứ tự: mức riêng của đối tác, rồi cấp riêng này, rồi mức riêng của vai trò; KHÔNG xét cấp của vai trò nữa (cấp riêng thiếu dịch vụ thì thành chưa có mức, không rơi về cấp của vai trò). Chỉ ảnh hưởng đối tác này. | có hộp nhập | một phần: «Thôi theo cấp này» (đối tác quay về cấp của vai trò) hoặc «Đổi cấp» | `/api/pricing/ho-so/:x/muc-rieng`<br>nhật ký `prc_party_tier_set` | `web/hoa-hong-doi-tac.ts`: Chọn cấp riêng cho đối tác<br>`web/hoa-hong-hop.ts`: Lưu | đã chốt (rà soát 2026-11-04: tên đúng; «Cấp riêng» do chủ chọn 2026-10-30 (lượt 6, quyết định 3 và 7)) |

### Hoa hồng: sửa cấp riêng của MỘT đối tác

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa** | Hoa hồng đối tác › cụm đối tác › mục «Cấp riêng» › «Sửa» › hộp «Sửa cấp riêng» | Sửa nhầm lẫn của một lần gán cấp riêng cho đối tác (cấp, ngày bắt đầu, ngày cuối), bắt buộc ghi lý do. Chỉ ảnh hưởng đối tác đó. Chưa có đơn dùng thì bản cũ bị huỷ và thay; đã có đơn dùng thì bản cũ ngừng. | có hộp nhập | một phần: sửa lại; bản cũ không mở lại | `/api/pricing/muc-rieng/:x/sua`<br>nhật ký `prc_party_tier_voided`<br>nhật ký `prc_party_tier_closed` | `web/hoa-hong-hop.ts`: Lưu sửa | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Hoa hồng: đổi cấp riêng của MỘT đối tác

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đổi cấp** | Hoa hồng đối tác › cụm đối tác › mục «Cấp riêng» › «Đổi cấp» › hộp «Đổi cấp riêng» | Cấp riêng cũ của đối tác ngừng đến hết ngày liền trước ngày mới, rồi đối tác theo cấp riêng mới. Chỉ ảnh hưởng đối tác đó, không đụng vai trò. Cấp cũ đang khoá thì hộp báo trước: đổi xong không đổi ngược về cấp khoá được. | có hộp nhập | một phần: «Đổi cấp» lần nữa (không về lại cấp đã khoá) | `/api/pricing/muc-rieng/:x/doi`<br>nhật ký `prc_party_tier_closed`<br>nhật ký `prc_party_tier_set` | `web/hoa-hong-hop.ts`: Lưu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Hoa hồng: ngừng cấp riêng của MỘT đối tác

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thôi theo cấp này** | Hoa hồng đối tác › cụm đối tác › mục «Cấp riêng» › menu «⋯» › hộp «Thôi theo cấp này» | Đặt ngày cuối cho cấp riêng của đúng một đối tác. Từ ngày sau, đối tác trở lại xét theo cấp của vai trò (nếu vai trò có cấp). Không đụng đối tác khác. | có hộp nhập | một phần: «Chọn cấp riêng cho đối tác» lần nữa; bản đã ngừng không mở lại | `/api/pricing/muc-rieng/:x/ket-thuc`<br>nhật ký `prc_party_tier_closed` | `web/hoa-hong-hop.ts`: ⟪o.nhan⟫ | đã chốt (rà soát 2026-11-04: tên đúng; «Thôi theo cấp này» do chủ chọn 2026-10-25 (lượt 3, Q1) và giữ ở lượt 7) |

### Hoa hồng: khoá hoặc mở lại một cấp

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Khoá cấp / Mở lại cấp** | Hoa hồng đối tác › thẻ Cấp độ đại lý › chi tiết cấp › nút «Khoá cấp» / «Mở lại cấp» | Khoá: cấp không nhận thêm vai trò, đối tác hay mức mới; các mức đang có chỉ Ngừng được, không Đổi hay Sửa. Vai trò và đối tác đang theo cấp vẫn được tính hoa hồng như cũ. Đã kiểm trigger của CSDL chặn đúng điều hộp nói. Mở lại thì mọi thứ dùng lại được. | có: Khoá cấp «X»? Sau khi khoá không thêm được vai trò, đối tác hay mức mới vào cấp… | được: bằng nút «Mở lại cấp» | `/api/pricing/muc-ta/:x/tat`<br>nhật ký `prc_rate_tier_off`<br>nhật ký `prc_rate_tier_on` | `web/hoa-hong-cap.ts`: ⟪nhan.nhan⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Hoa hồng: sửa tên và ghi chú của một cấp hoặc một vai trò

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa** | Hoa hồng đối tác › đầu chi tiết cấp, hoặc đầu thẻ vai trò › nút «Sửa» › hộp «Sửa cấp độ đại lý» / «Sửa vai trò» | Chỉ đổi tên và ghi chú của cấp hoặc của vai trò. Không đổi mức, không đổi ngày, không đổi ai đang theo. Hộp có ô mã (chỉ đọc) và dấu vết ai tạo, ai sửa. | có hộp nhập | được: sửa lại tên hoặc ghi chú | `/api/pricing/loai-doi-tac/:x`<br>`/api/pricing/muc-ta/:x`<br>nhật ký `prc_rate_tier_renamed`<br>nhật ký `prc_rate_tier_note`<br>nhật ký `prc_partner_type_renamed`<br>nhật ký `prc_partner_type_note` | `web/hoa-hong-cap.ts`: Sửa<br>`web/hoa-hong-loai.ts`: Sửa<br>`web/hoa-hong-hop.ts`: Mở lại<br>`web/hoa-hong-hop.ts`: Lưu | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Hoa hồng: thêm cấp độ đại lý

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **＋ Thêm cấp độ đại lý** | Hoa hồng đối tác › thẻ Cấp độ đại lý › đầu thẻ › hộp «Thêm cấp độ đại lý» | Tạo một cấp mới chỉ có tên, chưa có mức, chưa vai trò nào theo. Chưa ảnh hưởng tiền cho tới khi thêm mức và gán vai trò hoặc đối tác. | có hộp nhập | một phần: khoá được cấp («Khoá cấp»), không xoá | `/api/pricing/muc-ta`<br>nhật ký `prc_rate_tier_added` | `web/hoa-hong-cap.ts`: Thêm cấp độ đại lý<br>`web/hoa-hong-hop.ts`: Thêm cấp độ đại lý<br>`web/hoa-hong-hop.ts`: ⟪o.nhan⟫ | đã chốt (rà soát 2026-11-04: tên đúng; «Cấp độ đại lý» thay «Mức TA» và «Chính sách hoa hồng», chủ chọn 2026-10-25 và 2026-10-30) |

### Hoa hồng: thêm vai trò (vai người dùng)

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **＋ Thêm vai trò** | Hoa hồng đối tác › thẻ Vai người dùng › đầu thẻ › hộp «Thêm vai trò» | Tạo một vai trò mới trong danh sách được hưởng hoa hồng, chưa theo cấp nào. Quản trị sau đó gán vai trò cho hồ sơ ở Danh bạ. Đối tác mang vai trò mới mà chưa có cấp thì đơn của họ bị giữ ở Đã giao tới khi vai trò được chọn cấp. | có hộp nhập | một phần: tắt được («Tắt»), không xoá | `/api/pricing/loai-doi-tac`<br>nhật ký `prc_partner_type_added` | `web/hoa-hong-loai.ts`: Thêm vai trò<br>`web/hoa-hong-hop.ts`: Thêm vai trò<br>`web/hoa-hong-hop.ts`: ⟪o.nhan⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Hoa hồng: tắt hoặc bật một vai trò

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Tắt / Bật** | Hoa hồng đối tác › thẻ Vai người dùng › đầu thẻ vai trò › nút «Tắt» / «Bật» | Tắt: vai trò thôi nằm trong danh sách được hưởng hoa hồng. Đối tác chỉ thuộc vai trò này không được hưởng gì (kể cả mức riêng hay cấp riêng của họ không còn được xét); đơn của họ xác nhận từ lúc tắt chờ ở Đã giao tới khi Kế toán nhập tay. Đơn đã xác nhận giữ nguyên. Vai trò còn luật bán thì máy chủ từ chối. Vai trò «Có sẵn» không có nút này. | có: Tắt vai trò «X»? Đối tác chỉ thuộc vai trò này sẽ không được hưởng hoa hồng… | được: bằng nút «Bật» | `/api/pricing/loai-doi-tac/:x/tat`<br>nhật ký `prc_partner_type_off`<br>nhật ký `prc_partner_type_on` | `web/hoa-hong-loai.ts`: ⟪nhan.nut⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Hoa hồng: giới hạn nhập mức

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu** | Giới hạn nhập hoa hồng › biểu mẫu | Đặt phần trăm tối đa và bước số tiền áp cho các mức NHẬP MỚI ở trang Hoa hồng. Mức đã có và đơn đã xác nhận không đổi. Có khoá lạc quan: người khác vừa đổi thì báo tải lại. | không | được: lưu lại số cũ | `/api/pricing/gioi-han-nhap`<br>nhật ký `prc_entry_limit_changed` | `web/hoa-hong-gioi-han.ts`: Lưu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Hoa hồng: tra mức nào thắng (chỉ đọc)

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Tra (khối «Kiểm tra hoa hồng»)** | Hoa hồng đối tác › khối «Kiểm tra hoa hồng» (điện thoại: nút mở hộp cùng tên) | Tra một đối tác (hoặc một vai trò), một dịch vụ, một ngày; Nền tảng cho biết mức nào thắng theo đúng hàm tính lúc xác nhận đơn và bậc ưu tiên. Không ghi gì. | không | không cần: chỉ đọc | `/api/pricing/nguoi-huong`<br>`/api/pricing/thu-tra` | `web/hoa-hong-tra-nhanh.ts`: Tra<br>`web/hoa-hong-tra-nhanh.ts`: Kiểm tra hoa hồng | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Tài khoản: đặt cấp riêng cho MỘT tài khoản đối tác ngay ở bảng tài khoản

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Chữ trong ô cột «Cấp độ đại lý» (ví dụ «Đại lý cấp 2 (theo vai trò)»), bấm để mở hộp** | Quản lý tài khoản › cột «Cấp độ đại lý» › chữ bấm được › hộp «Cấp độ đại lý: tên tài khoản»; màn «Cấp độ đại lý» dùng cùng ô và cùng hộp này cho cả hồ sơ chưa có tài khoản | Đặt hoặc đổi CẤP RIÊNG cho đúng một tài khoản đối tác, dù ô đang hiện «(theo vai trò)». Từ ngày chọn, tài khoản này thôi theo cấp của vai trò; sau đó đổi cấp của vai trò (ở trang Hoa hồng) không còn ảnh hưởng tới họ. Dùng đúng ba route ghi của trang Hoa hồng. | có hộp nhập | một phần: bấm «Dùng cấp theo vai trò»; bản cũ không mở lại | `/api/pricing/muc-rieng/:x/sua`<br>nhật ký `prc_party_tier_set`<br>nhật ký `prc_party_tier_closed` | `web/cot-cap-dai-ly.ts`: ⟪o⟫<br>`web/cot-cap-dai-ly.ts`: ⟪oCapCuaHoSo(v)⟫<br>`web/cot-cap-dai-ly.ts`: Lưu | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Tài khoản: bỏ cấp riêng, quay về cấp của vai trò

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Dùng cấp theo vai trò** | Quản lý tài khoản › cột «Cấp độ đại lý» › hộp › nút «Dùng cấp theo vai trò» | Ngừng cấp riêng của tài khoản đó đến hết hôm nay (ngày máy chủ đọc lại lúc bấm); từ ngày mai tài khoản xét theo cấp của vai trò. Bấm là chạy ngay, không hỏi lại. Câu cạnh nút nói rõ: có hiệu lực từ ngày mai, vai trò chưa có cấp thì tài khoản thành «Chưa có cấp». | không | một phần: đặt lại cấp riêng bằng ô «Lưu» | `/api/pricing/muc-rieng/:x/ket-thuc`<br>nhật ký `prc_party_tier_closed` | `web/cot-cap-dai-ly.ts`: Dùng cấp theo vai trò | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Luật bán: thêm luật chặn

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **＋ Thêm luật** | Luật bán › nút đầu trang › hộp «Thêm luật bán» | Tạo luật CHẶN một vai trò đặt một dịch vụ, cả một nhóm, hoặc mọi dịch vụ mang một giá trị đặc điểm, từ ngày chọn (mặc định hôm nay). Đơn có dịch vụ bị chặn của đối tác thuộc vai trò đó không lập, lưu, xác nhận hay gửi được. Đơn đã xác nhận không bị xét lại. Có hiệu lực ngay, không hỏi lại. | có hộp nhập | một phần: chỉ kết thúc được («Kết thúc ngay» hoặc «Đặt ngày kết thúc»); không sửa, không xoá | `/api/pricing/luat-ban`<br>nhật ký `prc_sales_block_added` | `public/luat-ban.html`: Thêm luật<br>`web/luat-ban.ts`: Thêm luật | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Luật bán: kết thúc luật ngay

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Kết thúc ngay** | Luật bán › dòng luật đang áp dụng hoặc sắp áp dụng › nút «Kết thúc ngay» › hộp hỏi | Luật thôi chặn từ bây giờ: ngày kết thúc ghi là hôm qua. Vai trò đó đặt lại được dịch vụ ngay. Không mở lại được; muốn chặn lại phải thêm luật mới. Sau khi bấm, dòng này không còn nút nào nữa. | có: Kết thúc ngay luật bán? Luật thôi chặn từ bây giờ… Không mở lại được | không: muốn chặn lại phải «＋ Thêm luật» mới | `/api/pricing/luat-ban/:x/ket-thuc`<br>nhật ký `prc_sales_block_ended` | `web/luat-ban.ts`: Kết thúc ngay | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Luật bán: hẹn ngày kết thúc luật

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đặt ngày kết thúc** | Luật bán › dòng luật › nút «Đặt ngày kết thúc» › bảng trượt «Đặt ngày kết thúc» | Đặt ngày cuối cho luật: luật vẫn chặn tới hết ngày đó rồi tự thôi. Chỉ đặt được MỘT lần: sau đó dòng mất cả hai nút (kể cả «Kết thúc ngay») và máy chủ từ chối mọi lần kết thúc thứ hai. Bảng này không hỏi lại và không nói điều đó. | có hộp nhập | không: ngày kết thúc đã ghi không đổi được; chỉ còn thêm luật mới (không gỡ được luật cũ trước hạn) | `/api/pricing/luat-ban/:x/ket-thuc`<br>nhật ký `prc_sales_block_ended` | `web/luat-ban.ts`: Đặt ngày kết thúc | đã chốt (ADR-0166 câu 11) |

### Người bán: ngừng một điều khoản

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đóng** | Người bán dịch vụ › dòng điều khoản › nút «Đóng» › khung chọn ngày kết thúc | Đặt ngày kết thúc cho điều khoản (dịch vụ nào do ai bán, tỷ lệ Tour Đảo mua lại). Dịch vụ không còn điều khoản nào khác thì thiếu người bán cho tới khi thêm điều khoản mới. Điều khoản không sửa không xoá, chỉ thêm và ngừng. | có hộp nhập | một phần: thêm điều khoản mới; dòng đã đóng không mở lại | `/api/pricing/cung-ung/:x/dong`<br>nhật ký `prc_supply_term_closed` | `web/nguoi-ban.ts`: Ngừng điều khoản<br>`web/nguoi-ban.ts`: macDinh ? "Vẫn ngừng" : "Ngừng điều khoản" | đã chốt (ADR-0166 câu 9) |

### Người bán: thêm điều khoản

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm điều khoản** | Người bán dịch vụ › khối «Thêm điều khoản» › nút gửi biểu mẫu | Ghi một điều khoản: phạm vi (dịch vụ, nhóm hoặc mọi dịch vụ), người bán (Tour Đảo hay nhà cung cấp, kèm tỷ lệ Tour Đảo mua lại), từ ngày, đến ngày. Máy chủ chặn trùng khoảng ngày và nhóm Thuê xe không có tỷ lệ mua lại. | không | một phần: ngừng bằng «Đóng»; không sửa, không xoá | `/api/pricing/cung-ung`<br>nhật ký `prc_supply_term_added` | `web/nguoi-ban.ts`: Thêm điều khoản | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Điều chỉnh công nợ: gửi yêu cầu

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gửi yêu cầu chờ duyệt** | Điều chỉnh công nợ › khối «Gửi yêu cầu mới» | Tạo một yêu cầu tăng hoặc giảm nợ giữa hai bên trên một đơn. Số dư CHƯA đổi; chỉ đổi khi một người KHÁC người gửi bấm «Duyệt». Yêu cầu quá 7 ngày không ai quyết thì hết hạn. | không | được: bằng nút «Rút yêu cầu» khi chưa ai quyết | `/api/ledger/adjustments`<br>nhật ký `ledger_adjustment_requested` | `public/dieu-chinh-cong-no.html`: Gửi yêu cầu chờ duyệt | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Điều chỉnh công nợ: duyệt

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Duyệt** | Điều chỉnh công nợ › khối «Chờ duyệt» › thẻ yêu cầu | Ghi ngay dòng nợ vào sổ: số dư của hai bên đổi. Người duyệt phải khác người gửi. Máy chủ kiểm lại trần và hạn. Nhắn người gửi, và nhắn người có tài khoản bị đổi số dư. | không | một phần: chỉ bằng một yêu cầu điều chỉnh ngược khác, cần hai người | `/api/ledger/adjustment-requests/:x/approve`<br>nhật ký `ledger_adjustment_approved` | `web/dieu-chinh-cong-no.ts`: Duyệt | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Điều chỉnh công nợ: từ chối

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Từ chối → Xác nhận từ chối** | Điều chỉnh công nợ › khối «Chờ duyệt» › «Từ chối» mở ô lý do › «Xác nhận từ chối» | Từ chối yêu cầu, bắt buộc ghi lý do. Số dư không đổi. Người gửi nhận tin kèm lý do. | có hộp nhập | không: yêu cầu bị từ chối không mở lại, người gửi phải gửi yêu cầu mới | `/api/ledger/adjustment-requests/:x/reject`<br>nhật ký `ledger_adjustment_rejected` | `web/dieu-chinh-cong-no.ts`: Xác nhận từ chối<br>`web/dieu-chinh-cong-no.ts`: Từ chối | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Điều chỉnh công nợ: rút yêu cầu

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Rút yêu cầu** | Điều chỉnh công nợ › khối «Yêu cầu của tôi» | Người gửi bỏ yêu cầu khi chưa ai quyết. Số dư vốn chưa đổi nên không mất gì; phần trần tăng nợ được trả lại. | không | không: muốn lại phải gửi yêu cầu mới | `/api/ledger/adjustment-requests/:x/withdraw`<br>nhật ký `ledger_adjustment_withdrawn` | `web/dieu-chinh-cong-no.ts`: Rút yêu cầu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Khoá sổ tháng

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Khoá tháng MM/YYYY → Xác nhận khoá tháng MM/YYYY** | Khoá sổ tháng › nút «Khoá tháng MM/YYYY» rồi khung xác nhận trong trang | Khoá MỘT tháng đã qua, theo thứ tự từng tháng. Sau đó máy chủ từ chối mọi khoản thu, hoàn tiền, ghi sổ và chi phí xe có ngày phát sinh trong tháng đó (phải ghi vào tháng đang mở). Không mở lại được; sửa chỉ còn cách khôi phục cả cơ sở dữ liệu. Bảng kiểm bên trên chỉ để xem, không chặn việc khoá. | có: Khoá sổ tháng MM/YYYY? Việc này KHÔNG mở lại được. Muốn sửa sau khi khoá chỉ còn cách khôi phục cả cơ sở dữ liệu. | không: chỉ khôi phục cả cơ sở dữ liệu | `/api/ledger/ky/:x/khoa`<br>nhật ký `ledger_period_closed` | `web/khoa-thang.ts`: ⟪nhanNutKhoa(period)⟫<br>`web/khoa-thang.ts`: ⟪nhanNutXacNhanKhoa(period)⟫ | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Phân định: quyết ai chịu

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Phân định** | Phân định trách nhiệm › khối «Các phiếu» › phiếu «Chờ phân định» › «Phân định» | Ghi QUYẾT ĐỊNH: trường hợp nào, ai chịu, giảm trừ bao nhiêu, có trả tiền cho khách không. Chưa ghi tiền; một người khác (Kế toán) phải bấm «Ghi sổ» sau đó. Nhắn người đã mở đề nghị. Ô «Trả tiền cho khách» mặc định đã tích. | có hộp nhập | một phần: «Đổi bên chịu» sau khi ghi sổ; chính quyết định này không sửa được | `/api/ledger/phan-dinh/:x/quyet`<br>nhật ký `attribution_ruled` | `web/phan-dinh.ts`: Phân định<br>`web/phan-dinh.ts`: Lưu phân định | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Phân định: ghi sổ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ghi sổ theo phân định → Ghi sổ** | Phân định trách nhiệm › phiếu «Chờ ghi sổ» › «Ghi sổ theo phân định» › nút «Ghi sổ» | Ghi tiền thật theo quyết định, người ghi phải khác người phân định: giảm trừ phải thu của đơn; ghi nợ cho bên chịu (trừ khi công ty chịu) và nhắn họ; nếu có trả khách thì ghi hoàn tiền (người trả: Công ty); nếu khách thật sự chưa trả thì sửa khoản thu đã ghi ngay trong lần này. Ghi vào tháng đang mở, tháng đã khoá thì từ chối. | có hộp nhập | một phần: «Ghi khoản thu đòi được» hoặc «Đổi bên chịu»; không được nếu bên chịu đã nộp tiền | `/api/ledger/phan-dinh/:x/ghi`<br>nhật ký `attribution_posted` | `web/phan-dinh.ts`: Ghi sổ theo phân định<br>`web/phan-dinh.ts`: Ghi sổ | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Phân định: đổi bên chịu

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đổi bên chịu** | Phân định trách nhiệm › phiếu «Đã ghi sổ» › «Đổi bên chịu» › nút «Lưu phân định mới» | Ghi quyết định đổi người chịu của khoản đã ghi sổ (giảm trừ và tiền trả khách không đổi). Chưa đổi sổ nợ: chờ một người khác bấm «Ghi sổ lần đổi bên chịu». Không làm được nếu bên chịu hiện tại đã nộp tiền. | có hộp nhập | một phần: đổi lại lần nữa (cũng cần người khác ghi sổ) | `/api/ledger/phan-dinh/:x/doi-ben-chiu`<br>nhật ký `attribution_ruled` | `web/phan-dinh.ts`: Đổi bên chịu<br>`web/phan-dinh.ts`: Lưu phân định mới | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Phân định: ghi sổ lần đổi bên chịu

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ghi sổ lần đổi bên chịu** | Phân định trách nhiệm › phiếu có «Đổi bên chịu chờ ghi» | Bấm là ghi ngay: dòng ngược cho bên chịu cũ, dòng mới cho bên chịu mới, cùng số tiền. Nhắn cả hai bên (nếu có tài khoản). Phải là người khác người quyết định đổi. | không | một phần: đổi bên chịu lần nữa | `/api/ledger/phan-dinh/:x/ghi`<br>nhật ký `attribution_posted`<br>nhật ký `attribution_reassigned` | `web/phan-dinh.ts`: Ghi sổ lần đổi bên chịu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Phân định: đòi được khách, bỏ phần đã phân định

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ghi khoản thu đòi được** | Phân định trách nhiệm › phiếu «Đã ghi sổ» › «Ghi khoản thu đòi được» › nút «Ghi khoản thu và huỷ phần này» | Luôn làm HAI việc cùng lúc: (1) ghi thêm một khoản thu bằng đúng số nhập (người thu tiền: Công ty, ngày hôm nay); (2) bỏ phần giảm trừ và nợ của bên chịu bằng đúng số đó. Có thể làm một phần. Không có đường chỉ huỷ mà không ghi thu. Khác người đã phân định; không làm được nếu bên chịu đã nộp tiền. Nhắn bên chịu. | có hộp nhập | không: khoản thu đã ghi chỉ huỷ được bằng «Huỷ khoản thu» riêng; phần giảm trừ đã bỏ không phục hồi | `/api/ledger/phan-dinh/:x/huy`<br>nhật ký `attribution_posted` | `web/phan-dinh.ts`: Ghi khoản thu đòi được<br>`web/phan-dinh.ts`: Ghi khoản thu và huỷ phần này | đã chốt (ADR-0166 câu 6) |

### Phân định: bên chịu phản hồi

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Phản hồi** | Phân định trách nhiệm › khối «Khoản của tôi» › «Phản hồi» › nút «Gửi phản hồi» | Ghi một dòng chữ vào phiếu và nhắn người đã phân định. Không đổi số nợ, không tạm dừng, không đưa việc ra xem xét lại. Hạn 3 ngày làm việc chỉ để nhắc, phản hồi muộn vẫn nhận. Chỉ xem được khoản của chính hồ sơ mình. | có hộp nhập | không: dòng phản hồi đã gửi không xoá được, gửi thêm được | `/api/ledger/phan-dinh-cua-toi/:x/phan-hoi`<br>nhật ký `attribution_responded` | `web/phan-dinh.ts`: Phản hồi<br>`web/phan-dinh.ts`: Gửi phản hồi | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Đặc điểm dịch vụ: chọn giá trị cho một dịch vụ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ô chọn giá trị đặc điểm của từng dịch vụ (chọn là lưu ngay)** | Đặc điểm dịch vụ › ba thẻ Gắn cho dịch vụ / Chưa khai / Mới, đang theo nhóm › ô chọn giá trị cạnh từng dịch vụ | Chọn một giá trị là lưu ngay, không có nút lưu. Giá trị riêng thắng giá trị chung của nhóm; chọn dòng đầu («Chưa khai» hoặc «Theo nhóm (…)») là bỏ giá trị riêng. Đổi giá trị có thể làm một dịch vụ bắt đầu hoặc thôi bị luật bán theo đặc điểm chặn; khi đó hộp hỏi lại, các trường hợp khác không hỏi. | có: Đổi «A» của «dịch vụ»? (chỉ khi luật bán đổi kết quả) | được: chọn lại giá trị cũ | `/api/catalog/:x/dac-diem/:x`<br>nhật ký `ctl_service_attribute_set` | `web/dac-diem-dich-vu.ts`: Vẫn lưu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đặc điểm dịch vụ: chọn giá trị chung của một nhóm

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ô chọn giá trị chung của nhóm (chọn là lưu ngay)** | Đặc điểm dịch vụ › thẻ Theo nhóm › ô chọn giá trị cạnh từng nhóm | Đặt giá trị chung cho CẢ NHÓM: áp cho mọi dịch vụ trong nhóm chưa có giá trị riêng, kể cả dịch vụ mới vào nhóm sau này. Có thể làm nhiều dịch vụ cùng bắt đầu hoặc thôi bị luật bán chặn; hộp hỏi lại khi có. | có: Đổi «A» chung của nhóm «tên»? (chỉ khi luật bán đổi kết quả) | được: chọn lại giá trị cũ | `/api/catalog/groups/:x/dac-diem/:x`<br>nhật ký `ctl_group_attribute_set` | `web/dac-diem-dich-vu.ts`: Vẫn lưu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đặc điểm dịch vụ: tắt hoặc bật lại đặc điểm hoặc giá trị

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Tắt / Bật lại** | Đặc điểm dịch vụ › thẻ Định nghĩa › nút «Tắt» / «Bật lại» | Tắt: đặc điểm hoặc giá trị không gán được cho dịch vụ hay nhóm nào; luật bán trỏ tới nó không còn chặn dịch vụ nào cho tới khi bật lại. Máy chủ chỉ cho tắt khi không dịch vụ hay nhóm nào còn mang nó. | có: Tắt đặc điểm «X»? Đặc điểm tắt thì không gắn được cho dịch vụ hay nhóm nào; luật bán trỏ tới nó thành «Không phủ dịch vụ nào»… | được: bằng nút «Bật lại» | `/api/catalog/dac-diem/:x`<br>`/api/catalog/dac-diem/gia-tri/:x`<br>nhật ký `ctl_attribute_updated`<br>nhật ký `ctl_attribute_value_updated` | `web/dac-diem-dich-vu.ts`: Bật lại / Tắt<br>`web/dac-diem-dich-vu.ts`: Tắt / Bật lại | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đặc điểm dịch vụ: thêm đặc điểm

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **＋ Thêm đặc điểm** | Đặc điểm dịch vụ › thẻ Định nghĩa › hộp «Thêm đặc điểm» | Tạo một đặc điểm mới (ví dụ «Gồm vé tàu») cùng danh sách giá trị, mỗi dòng một giá trị. Chưa gán cho dịch vụ nào nên chưa ảnh hưởng luật bán. | có hộp nhập | một phần: tắt được, không xoá | `/api/catalog/dac-diem`<br>nhật ký `ctl_attribute_created`<br>nhật ký `ctl_attribute_value_created` | `web/dac-diem-dich-vu.ts`: Thêm đặc điểm | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đặc điểm dịch vụ: thêm giá trị

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **＋ Thêm giá trị** | Đặc điểm dịch vụ › thẻ Định nghĩa › «＋ Thêm giá trị» dưới một đặc điểm | Thêm một giá trị vào đặc điểm đang dùng. Chưa gán cho dịch vụ nào. | có hộp nhập | một phần: tắt được, không xoá | `/api/catalog/dac-diem/:x/gia-tri`<br>nhật ký `ctl_attribute_value_created` | `web/dac-diem-dich-vu.ts`: Thêm giá trị | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đặc điểm dịch vụ: sửa tên và thứ tự đặc điểm hoặc giá trị

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa** | Đặc điểm dịch vụ › thẻ Định nghĩa › «Sửa» › hộp «Sửa đặc điểm / giá trị» | Đổi tên và thứ tự hiển thị. Không đổi kết quả của luật bán, nhưng luật hiện tên mới; hộp cảnh báo khi đang có luật trỏ tới. | có hộp nhập | được: sửa lại tên | `/api/pricing/luat-ban`<br>nhật ký `ctl_attribute_updated`<br>nhật ký `ctl_attribute_value_updated` | `web/dac-diem-dich-vu.ts`: Sửa<br>`web/dac-diem-dich-vu.ts`: Lưu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Tạo chuyến

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **+ Chuyến mới** | Điều phối xe › nút «+ Chuyến mới» trên đầu trang (và trong hộp Xếp vào chuyến) › hộp «Chuyến mới · ngày» | Tạo một chuyến xe trống cho ngày đang xem (chọn xe, tài xế, giờ bắt đầu và kết thúc), mã dạng CX-ddmm-nn; chưa có khách, khách xếp sau. Nếu xe thuộc nhà xe cho thuê thì máy chụp luôn giá bảng vào chi phí chuyến. Tài xế được xếp nhận tin trong Nền tảng. | có hộp nhập xe, tài xế, giờ; không hỏi lại thêm | một phần: bằng nút «Huỷ chuyến» (chuyến không bị xoá, còn trong nhật ký) | `/api/van-chuyen/chuyen/:x/phan-bo`<br>`/api/van-chuyen/chuyen`<br>nhật ký `trip_created` | `public/dieu-phoi.html`: Chuyến mới<br>`web/dieu-phoi.ts`: Tạo chuyến<br>`web/dieu-phoi.ts`: Chuyến mới | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Lưu chuyến** | Chuyến mới / Sửa chuyến (trang /chuyen-sua) › nút cuối biểu mẫu và nút dính đáy điện thoại | Ở trang Chuyến mới thì tạo chuyến; ở trang Sửa chuyến thì lưu lại xe, tài xế, tuyến, giờ. Chuyến đã có khách: tài xế đang lái nhận tin chuyến bị đổi (tài xế cũ nhận tin bị gỡ). Nếu đổi xe, nhà xe, tuyến hoặc ngày chạy của chuyến xe thuê, máy huỷ toàn bộ dòng chi phí cũ (kể cả giá thoả thuận, khoản điều chỉnh, phí huỷ muộn Kế toán đã ghi) rồi chụp lại giá bảng mới. | không (chỉ có hộp vượt luật khi máy chủ đòi) | một phần: sửa lại bằng «Lưu chuyến», nhưng dòng chi phí đã huỷ không tự trở lại, Kế toán phải ghi lại | `/api/van-chuyen/chuyen/:x`<br>nhật ký `trip_created`<br>nhật ký `trip_edited` | `web/chuyen-sua.ts`: Lưu chuyến | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Bỏ qua luật điều phối

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Điều chỉnh khẩn cấp và xếp / thêm / rút / chuyển / lưu / huỷ (khi chuyến đã dưới hạn chốt); Phá lệ và xếp / thêm / rút / chuyển / lưu / huỷ (ngoài hạn chốt, chỉ Quản trị và Toàn quyền)** | Hộp mở sau khi máy chủ từ chối một lệnh: Lưu chuyến (/chuyen-sua và hộp Chuyến mới), Xếp vào chuyến, Thêm điểm đón / thêm khách, Rút khỏi xe, Chuyển sang xe khác, Huỷ chuyến | Gửi lại ĐÚNG lệnh vừa bị từ chối, kèm một lý do và cờ bỏ qua luật; lệnh gốc được thực hiện ngay. Dưới hạn chốt trước giờ xe chạy thì gọi là «Điều chỉnh khẩn cấp» (Bán hàng, Quản trị, Toàn quyền làm được); ngoài hạn chốt mà thiếu nghỉ hay xe nhỏ hơn cam kết thì gọi là «Phá lệ» (chỉ Quản trị, Toàn quyền). Lý do ghi vào nhật ký chuyến kèm tên người bấm; tài xế đang lái nhận tin có chữ «điều chỉnh khẩn cấp». | có hộp chọn lý do (nút xác nhận khoá tới khi chọn) | tuỳ lệnh gốc: xem các hàng Xếp vào chuyến, Rút khỏi xe, Chuyển sang xe khác, Thêm điểm đón, Huỷ chuyến, Lưu chuyến | (chưa nối) | `web/chuyen-sua.ts`: NUT_VUOT.luu[l.lop]<br>`web/chuyen.ts`: NUT_VUOT.them[l.lop]<br>`web/chuyen.ts`: NUT_VUOT[o.nutVuot][l.lop]<br>`web/chuyen.ts`: NUT_VUOT.huy[l.lop]<br>`web/dieu-phoi.ts`: NUT_VUOT.xep[l.lop]<br>`web/dieu-phoi.ts`: NUT_VUOT.luu[le.lop] | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đồng bộ chuyến với đơn

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Cập nhật điểm theo đơn** | Chi tiết chuyến (dải «Chuyến bị giữ: Nơi đón / trả đã đổi» và khối «Việc của văn phòng» khi xe chạy); Điều phối xe (thẻ chuyến đang chọn và cột «Cần xử lý») | Máy tự tìm mọi khách trong chuyến có nơi đón hay nơi trả khác với đơn hiện tại rồi dời họ sang điểm đúng; điểm hết khách chuyển sang «bỏ qua — không còn khách». Không cần chọn tay, không bị khoá theo hạn chốt, không cần điều chỉnh khẩn cấp. Xe đang chạy: chỉ dời khách còn chờ ở điểm xe chưa tới, phần còn lại bỏ qua. Tài xế đang lái nhận tin. | không | không: không có nút hoàn lại; đơn đổi nơi lần nữa thì bấm lại | `/api/van-chuyen/chuyen/:x/cap-nhat-khach`<br>`/api/van-chuyen/chuyen/:x/cap-nhat-diem`<br>nhật ký `trip_stops_synced` | `web/chuyen.ts`: Cập nhật điểm theo đơn<br>`web/dieu-phoi.ts`: Cập nhật điểm theo đơn<br>`web/dieu-phoi.ts`: ⟪a.nhan⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Cập nhật khách theo đơn** | Chi tiết chuyến (dải «Chuyến bị giữ: Khách trong đơn đã đổi / Đơn đã đổi sau khi xếp»); Điều phối xe (thẻ chuyến đang chọn và cột «Cần xử lý») | Máy tìm mọi chỗ trên xe mang người không còn trong đơn (khách đổi, đơn đã huỷ, lượt đã bỏ, đơn không còn xác nhận, xếp thừa chỗ), đóng chỗ cũ và mở lại đúng số người của đơn. Chỉ chuyến chưa chạy, không bị khoá theo hạn chốt, không cần điều chỉnh khẩn cấp. Tài xế đang lái nhận tin. | không | không: không có nút hoàn lại | `/api/van-chuyen/chuyen/:x/cap-nhat-khach`<br>nhật ký `trip_passengers_synced` | `web/chuyen.ts`: Cập nhật khách theo đơn<br>`web/dieu-phoi.ts`: Cập nhật khách theo đơn | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Tiến độ chuyến (văn phòng bấm thay)

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Cho xe chạy thay tài xế** | Chi tiết chuyến › nút «Cho xe chạy thay tài xế» › hộp «Cho xe chạy <mã> — bấm thay tài xế» | Văn phòng ghi thay tài xế là xe đã lăn bánh: chuyến từ «Lên kế hoạch» sang «Đang chạy», máy chụp lại xe, tài xế, số khách lúc chạy. Giờ ghi là lúc bấm, hoặc giờ văn phòng khai trong khoảng được lùi. Từ lúc này tài xế đối tác mới được xem tên khách. Nút khoá khi chuyến còn bị giữ. | có hộp (mô tả, cảnh báo ngày chạy, ô giờ) | một phần: bằng nút «Thu hồi lệnh cho xe chạy», chỉ khi chưa có bước nào sau đó và chưa quá thời gian được lùi | `/api/van-chuyen/chuyen/:x/huy`<br>nhật ký `trip_departed` | `web/chuyen.ts`: Cho xe chạy<br>`web/chuyen.ts`: Cho xe chạy thay tài xế | đã chốt (rà soát 2026-11-04: tên đúng; «Cho xe chạy» là tên chủ chọn 2026-10-18 (lượt 2, thay «xuất bến»); không có bằng chứng hiểu lầm nên giữ.) |
| **Thu hồi lệnh cho xe chạy** | Chi tiết chuyến (chuyến đang chạy, chưa có bước nào sau lần chạy) › nút «Thu hồi lệnh cho xe chạy» › hộp cùng tên | Đưa chuyến đang chạy về «chưa chạy» khi tài xế bấm Cho xe chạy nhầm. Bản chụp lúc xe chạy vẫn giữ trong nhật ký. Chỉ được khi chưa có bước nào sau đó (đã tới, đã đón… đều đóng nút) và chưa quá thời gian được lùi. Tài xế đang lái và người điều phối nhận tin; tài xế phải bấm lại Cho xe chạy khi xe thật sự lăn bánh. | có hộp chọn lý do (nêu rõ chuyến về chưa chạy) | được: tài xế hoặc văn phòng bấm lại «Cho xe chạy» | `/api/van-chuyen/chuyen/:x/huy`<br>nhật ký `trip_departure_revoked` | `web/chuyen.ts`: Thu hồi lệnh cho xe chạy | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Kết thúc chuyến** | Chi tiết chuyến (xe đang chạy) › cuối danh sách điểm dừng › hộp «Kết thúc <mã> — bấm thay tài xế» | Văn phòng ghi thay tài xế là chuyến đã chạy xong: chuyến sang «Đã kết thúc». Chỉ bấm được khi mọi khách đã có kết quả (đã trả, vắng hoặc huỷ) và người đi kèm đã xuống; chưa đủ thì nút khoá kèm dòng giải thích. Sau khi kết thúc, kết quả đã chốt: không còn Điều chỉnh, không mở lại chuyến. | có hộp (chỉ mô tả và ô giờ, không tóm tắt kết quả khách, không nói không mở lại được) | không: chuyến không mở lại và kết quả khách không sửa được nữa | `/api/van-chuyen/chuyen/:x/huy`<br>nhật ký `trip_ended` | `web/chuyen.ts`: Kết thúc chuyến | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Sửa kết quả đón / trả khách

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Điều chỉnh…** | Chi tiết chuyến (xe đang chạy) › cạnh tên khách đã có kết quả › hộp «Điều chỉnh kết quả» | Sửa kết quả đã ghi cho một khách trên xe đang chạy, ví dụ Đã đón → Vắng, Vắng → Khách huỷ tại điểm, Đã trả → Còn trên xe. Kết quả cũ không bị xoá, Nền tảng ghi thêm một lần điều chỉnh kèm lý do. Tài xế đang lái và người điều phối nhận tin. Chỉ làm được khi chuyến còn đang chạy. | có hộp chọn kết quả mới và lý do | một phần: điều chỉnh tiếp theo bảng cho phép; sau «Kết thúc chuyến» thì không sửa được nữa | `/api/van-chuyen/chuyen/:x/huy`<br>nhật ký `trip_allocation_corrected` | `web/chuyen.ts`: Điều chỉnh…<br>`web/chuyen.ts`: Điều chỉnh | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Gián đoạn / cứu hộ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Kết thúc gián đoạn** | Chi tiết chuyến (xe đang chạy) › cuối danh sách điểm dừng › hộp «Kết thúc gián đoạn <mã> — bấm thay tài xế» | Văn phòng ghi thay tài xế là xe không đi tiếp được. Chuyến sang «Kết thúc gián đoạn», các chỗ khách còn chờ hay còn trên xe bị đóng lại, khách cần xếp sang xe khác ở khối «Cứu hộ». Chuyến không mở lại. | có hộp chọn lý do và ô giờ | không: chuyến đã kết thúc không mở lại; khách xếp lại sang chuyến khác | `/api/van-chuyen/chuyen/:x/huy`<br>nhật ký `trip_ended_interrupted` | `web/chuyen.ts`: Kết thúc gián đoạn | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Kết thúc gián đoạn (xe hỏng)** | Chi tiết chuyến (xe đang chạy) › khối «Việc của văn phòng» › nút đỏ «Cứu hộ» | Không gửi yêu cầu cứu hộ nào. Nút mở đúng hộp «Kết thúc gián đoạn» và, khi xác nhận, KẾT THÚC chuyến đang chạy với lý do chọn từ danh mục; sau đó khối «Cứu hộ» mới hiện để xếp khách sang xe khác. Nút ngay bên cạnh, «Gửi đề nghị cứu hộ», mới là nút nhờ một xe đang chạy nhận khách mà chuyến này vẫn chạy. | có hộp chọn lý do, nút xác nhận đỏ «Kết thúc gián đoạn» | không: chuyến đã kết thúc không mở lại | `/api/van-chuyen/chuyen/:x/ket-thuc-gian-doan`<br>nhật ký `trip_ended_interrupted` | `web/chuyen.ts`: Kết thúc gián đoạn (xe hỏng)<br>`web/chuyen.ts`: Gửi đề nghị cứu hộ | đã chốt (ADR-0166 câu 7) |
| **Gửi đề nghị cứu hộ** | Chi tiết chuyến (xe đang chạy) › khối «Việc của văn phòng» › «Gửi đề nghị cứu hộ» › hộp cùng tên | Văn phòng gửi THAY tài xế một đề nghị tới một xe khác đang chạy cùng ngày: nhận cả khách đang trên xe và khách chờ đón, gặp nhau ở nơi gõ vào. Tài xế xe kia bấm Nhận hoặc Không nhận; hết giờ chờ mà không ai trả lời thì khách vẫn ở xe này. Chuyến này vẫn chạy, chưa kết thúc. | có hộp chọn xe và gõ nơi gặp | một phần: tài xế xe này bấm «Rút lại» khi đề nghị còn chờ; đã nhận thì khách đã sang xe kia | `/api/van-chuyen/chuyen/:x/cuu-ho`<br>nhật ký `trip_transfer_sent` | `web/chuyen.ts`: Gửi đề nghị<br>`web/chuyen.ts`: Gửi đề nghị cứu hộ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Kết thúc gián đoạn** | Cuốc của tôi › chi tiết chuyến › cuối danh sách (nút viền đỏ) › hộp «Kết thúc gián đoạn» | Tài xế báo xe không đi tiếp được. Chuyến sang «Kết thúc gián đoạn», khách còn trên xe và chưa đón được báo về văn phòng để xếp xe khác. Chuyến không mở lại. Hộp dặn: xe hỏng mà còn khách thì nên nhờ xe khác trước bằng «Chuyển khách sang xe khác». | có hộp chọn lý do, kèm số khách còn trên xe và chưa đón | không: chuyến đã kết thúc, không mở lại | `/api/van-chuyen/cuoc-cua-toi/:x/ket-thuc-gian-doan`<br>nhật ký `trip_ended_interrupted` | `web/cuoc-chuyen.ts`: Kết thúc gián đoạn | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Tiến độ chuyến

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đã tới** | Cuốc của tôi › chi tiết chuyến › thẻ điểm đón và nút dính đáy (tài xế bấm); Chi tiết chuyến › thẻ điểm đón (văn phòng bấm thay, hộp «Đã tới <nơi> — bấm thay tài xế») | Ghi xe đã tới điểm đón; điểm chuyển sang «đang ở đây» và các nút Đã đón / Vắng / Khách đã huỷ cho khách ở điểm mở ra. Tài xế bấm thì giờ ghi là lúc bấm, một chạm. Văn phòng bấm thay thì có hộp với ô «Xảy ra lúc». | tài xế: không; văn phòng: có hộp | không: không có nút gỡ «đã tới» | `/api/van-chuyen/chuyen/:x/huy`<br>nhật ký `trip_stop_arrived` | `web/chuyen.ts`: Ghi “Đã tới”<br>`web/tien-do-ui.ts`: ⟪b.nut.nhan⟫<br>`web/cuoc-chuyen.ts`: ⟪viec⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Đã trả** | Cuốc của tôi › điểm trả và nút dính đáy (tài xế); Chi tiết chuyến › thẻ điểm trả (văn phòng bấm thay) | Ghi mọi khách đang trên xe xuống ở điểm này là đã trả; nếu chưa bấm «Đã tới» thì ghi luôn xe đã tới. Khi không có khách nào trên xe để xuống, hộp đổi nút thành «Vẫn ghi đã tới» và chỉ ghi xe tới điểm. | có: «Trả khách ở <nơi>?» kèm số khách và câu «Đã ghi thì không tự sửa được — sai thì báo văn phòng» | một phần: tài xế không tự sửa; văn phòng sửa từng khách bằng «Điều chỉnh…» khi chuyến còn đang chạy và điểm trả chưa xong | `/api/van-chuyen/chuyen/:x/huy`<br>nhật ký `trip_passenger_dropped` | `web/chuyen.ts`: Ghi “Đã trả”<br>`web/tien-do-ui.ts`: ⟪b.nut.nhan⟫<br>`web/cuoc-chuyen.ts`: ⟪hopTraCaDiem({ tenNoi: d.tenNoi, soKhach: l.buoc.traCho.length })⟫<br>`web/cuoc-chuyen.ts`: ⟪viec⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Đã đón (và «Đã đón N khách» cho cả điểm)** | Cuốc của tôi › thẻ điểm đón › dòng từng khách và nút dính đáy «Đã đón N khách»; Chi tiết chuyến › cùng thẻ (văn phòng bấm thay) | Ghi khách đã lên xe. Bấm ở dòng một khách thì một chạm, không hỏi; «Đã đón N khách» ở thanh dưới ghi một lần cho mọi khách còn chờ ở điểm bằng cách gửi lần lượt lệnh «Đã đón» từng người. Có thể bấm lại «Đã đón» cho khách đã bị ghi «Vắng». | từng khách: không (chỉ hiện dòng «Vừa ghi … Sai? Báo văn phòng»); cả điểm: có hộp | một phần: tài xế không tự gỡ; văn phòng đổi thành Vắng hoặc Khách huỷ tại điểm bằng «Điều chỉnh…» khi chuyến còn đang chạy | `/api/van-chuyen/chuyen/:x/huy`<br>nhật ký `trip_passenger_boarded` | `web/tien-do-ui.ts`: ⟪NHAN_LENH_SUAT[l]⟫<br>`web/chuyen.ts`: Ghi “${nhan}”<br>`web/cuoc-chuyen.ts`: ⟪hopDonTatCa({ tenNoi: d.tenNoi, soKhach: v.suatIds.length })⟫<br>`web/cuoc-chuyen.ts`: ⟪viec⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Vắng** | Cuốc của tôi › thẻ điểm đón › dòng từng khách; Chi tiết chuyến › cùng thẻ (văn phòng bấm thay) | Ghi khách không ra điểm đón. Chỗ của khách chuyển sang trạng thái «Vắng». Nếu khách tới sau, bấm «Đã đón» là gỡ lại được. Người lập hay phụ trách đơn nhận tin khách vắng. | không (có dòng «Vừa ghi … Sai? Báo văn phòng») | được: bằng nút «Đã đón» (tài xế) khi khách tới sau | `/api/van-chuyen/chuyen/:x/huy`<br>nhật ký `trip_passenger_no_show` | `web/tien-do-ui.ts`: ⟪NHAN_LENH_SUAT[l]⟫<br>`web/chuyen.ts`: Ghi “${nhan}” | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Khách đã huỷ** | Cuốc của tôi › thẻ điểm đón › dòng từng khách; Chi tiết chuyến › cùng thẻ (văn phòng bấm thay) | Ghi khách huỷ tại điểm đón để trả chỗ trên xe; chỉ ghi ở chuyến, không huỷ đơn của khách. Từ lúc ghi, tài xế không còn nút nào gỡ lại (khác «Vắng» vẫn bấm «Đã đón» được); chỉ văn phòng sửa được bằng «Điều chỉnh…» khi chuyến còn chạy. | không (có dòng «Vừa ghi … Sai? Báo văn phòng») | một phần: tài xế không tự gỡ; văn phòng đổi lại bằng «Điều chỉnh…» khi chuyến còn đang chạy | `/api/van-chuyen/chuyen/:x/huy`<br>nhật ký `trip_passenger_cancelled_at_stop` | `web/tien-do-ui.ts`: ⟪NHAN_LENH_SUAT[l]⟫<br>`web/chuyen.ts`: Ghi “${nhan}” | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Đã lên xe / Đã xuống (người đi kèm)** | Cuốc của tôi và Chi tiết chuyến › dòng «Người đi kèm <tên>» (hướng dẫn viên đi cùng xe) | Ghi người đi kèm đã lên xe, rồi đã xuống xe. Người đi kèm phải ‘Đã xuống’ thì «Kết thúc chuyến» thường mới bấm được. Không hỏi lại. | không (có dòng «Vừa ghi …») | không: không thấy nút gỡ cho người đi kèm | nhật ký `trip_passenger_boarded`<br>nhật ký `trip_passenger_dropped` | `web/chuyen.ts`: ⟪v.nhan!⟫<br>`web/cuoc-chuyen.ts`: ⟪v.nhan!⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Kết thúc chuyến** | Cuốc của tôi › chi tiết chuyến › thanh dính đáy (khi đã xong mọi điểm) và cuối danh sách (khi còn khoá) | Tài xế báo chuyến đã chạy xong: chuyến sang «Đã kết thúc». Chỉ bấm được khi mọi khách đã có kết quả và mọi điểm đã xong; chưa đủ thì nút khoá kèm câu nói còn bao nhiêu khách, điểm. Sau khi kết thúc, kết quả đã chốt, không ai điều chỉnh được nữa. | có: «Kết thúc <mã>?» kèm tóm tắt, câu «Kết thúc rồi thì chuyến không mở lại được — sai thì báo văn phòng» | không: chuyến không mở lại, kết quả khách không sửa được | `/api/van-chuyen/cuoc-cua-toi/:x/ket-thuc`<br>nhật ký `trip_ended` | `web/cuoc-chuyen.ts`: ⟪hopKetThuc({ ma: c.ma, suat: r.suat })⟫<br>`web/cuoc-chuyen.ts`: Kết thúc chuyến<br>`web/cuoc-chuyen.ts`: ⟪viec⟫ | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Cho xe chạy** | Cuốc của tôi › chuyến chưa chạy › nút dính đáy › hộp «Cho xe chạy <mã>?» | Tài xế ghi xe đã lăn bánh: chuyến sang «Đang chạy», máy chụp lại xe, tài xế, số khách. Giờ ghi là lúc bấm. Từ đây các nút Đã tới / Đã đón… mở ra, và tài xế đối tác mới thấy tên khách. Nút khoá khi chuyến còn bị giữ; ngày chạy khác hôm nay thì có dải đỏ cảnh báo. | có hộp: mã chuyến, ngày chạy, giờ dự kiến, biển số, số khách; «Bấm nhầm thì báo văn phòng ngay để thu hồi» | một phần: tài xế không tự gỡ; văn phòng «Thu hồi lệnh cho xe chạy» khi chưa có bước nào sau đó | `/api/van-chuyen/cuoc-cua-toi/:x/xuat-ben`<br>nhật ký `trip_departed` | `web/cuoc-chuyen.ts`: Cho xe chạy<br>`web/cuoc-chuyen.ts`: ⟪hop.nutXacNhan⟫ | đã chốt (rà soát 2026-11-04: tên đúng; «Cho xe chạy» do chủ chọn 2026-10-18 (lượt 2, thay «xuất bến»).) |

### Từ chối chuyến

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Từ chối chuyến** | Cuốc của tôi › chuyến chưa chạy còn trong hạn từ chối › dải «Từ chối được tới …» › hộp «Từ chối chuyến» | Tài xế đối tác trả chuyến chưa chạy lại cho văn phòng để xếp người khác; chuyến rời khỏi Cuốc của họ. Chỉ trong hạn từ chối, và không được nếu chuyến có khách chuyển từ xe khác sang. Người điều phối nhận tin (không kèm lý do chữ). | có hộp chọn lý do, nêu rõ chuyến không còn trong Cuốc của bạn | không: tài xế không nhận lại được; văn phòng phải xếp lại | `/api/van-chuyen/cuoc-cua-toi/:x/tu-choi`<br>nhật ký `trip_driver_refused` | `web/cuoc-chuyen.ts`: Từ chối chuyến<br>`web/cuoc-chuyen.ts`: Xác nhận từ chối | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Chuyển khách giữa hai xe

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Nhờ xe khác đón / Chuyển khách sang xe khác** | Cuốc của tôi › chuyến đang chạy › «Nhờ xe khác đón» dưới điểm đón chưa tới, «Chuyển khách sang xe khác» cạnh «Kết thúc gián đoạn» › hộp cùng tên | Chỉ GỬI MỘT ĐỀ NGHỊ tới tài xế một xe khác: nhận khách ở một điểm đón (hoặc nhận cả khách trên xe và khách chờ, gặp ở nơi gõ vào). Khách vẫn ở xe mình cho tới khi xe kia bấm Nhận (có khi còn phải chờ văn phòng duyệt). Hết giờ chờ mà không ai trả lời thì khách vẫn ở xe mình. | có hộp chọn xe; nút xác nhận «Gửi đề nghị» | được: bằng nút «Rút lại» khi đề nghị còn chờ | `/api/van-chuyen/de-nghi-cua-toi`<br>nhật ký `trip_transfer_sent` | `web/cuoc-chuyen.ts`: Gửi đề nghị<br>`web/cuoc-chuyen.ts`: Nhờ xe khác đón<br>`web/cuoc-chuyen.ts`: Chuyển khách sang xe khác | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Nhận** | Cuốc của tôi › chuyến của xe nhận › thẻ «Đề nghị gửi tới bạn» (có đếm ngược) | Tài xế xe nhận đồng ý nhận khách của xe kia. Máy kiểm lại các điều kiện (chỗ, giờ, giấy tờ…): đạt hết và công tắc tự đồng ý đang bật thì khách vào chuyến của mình ngay; không thì đề nghị chuyển lên văn phòng duyệt và khách CHƯA vào chuyến. Một chạm, không hỏi lại. | không | không: nhận xong tài xế không có nút trả lại | `/api/van-chuyen/de-nghi/:x/nhan`<br>nhật ký `trip_transfer_confirmed` | `web/cuoc-chuyen.ts`: Nhận | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Không nhận** | Cuốc của tôi › thẻ «Đề nghị gửi tới bạn» › «Không nhận» › hộp «Không nhận đề nghị» | Tài xế xe nhận từ chối đề nghị kèm một lý do chọn sẵn. Khách ở lại xe kia; tài xế xe kia nhận tin kèm lý do. | có hộp chọn lý do | không: từ chối rồi thì đề nghị đóng | `/api/van-chuyen/de-nghi/:x/khong-nhan`<br>nhật ký `trip_transfer_declined` | `web/cuoc-chuyen.ts`: Gửi lý do<br>`web/cuoc-chuyen.ts`: Không nhận | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Rút lại** | Cuốc của tôi › thẻ đề nghị đã gửi còn chờ (xe đang chạy) | Tài xế xe nhờ rút đề nghị còn chờ trả lời; khách vẫn ở xe mình, xe kia không còn thấy đề nghị. Làm lại được bằng cách gửi đề nghị mới. Không hỏi lại. | không | được: gửi đề nghị mới | `/api/van-chuyen/de-nghi/:x/rut`<br>nhật ký `trip_transfer_withdrawn` | `web/cuoc-chuyen.ts`: Rút lại | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Bổ sung tên khách

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Bổ sung tên** | Cuốc của tôi › khối «Suất của khách» › link «Bổ sung tên» › hộp «Bổ sung tên — Điểm M · Khách i» | Tài xế công ty nhập họ tên và năm sinh cho một khách còn thiếu tên (chỉ chuyến mình đang lái, trong ngày chạy). Tên được ghi thẳng vào danh sách khách của ĐƠN, văn phòng thấy ở cả chuyến lẫn đơn; tài xế không sửa lại được. | có hộp nhập (nút Lưu); không hỏi lại | không: tài xế không có nút sửa; văn phòng sửa ở đơn | `/api/van-chuyen/cuoc-cua-toi/:x/hanh-khach`<br>nhật ký `trip_passenger_named` | `web/cuoc-chuyen.ts`: Lưu<br>`web/cuoc-chuyen.ts`: Bổ sung tên | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Sửa chuyến đang chạy

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **↑ / ↓ (đọc màn hình: «Đưa <điểm> lên trước», «Đưa <điểm> xuống sau»)** | Chi tiết chuyến và Cuốc của tôi › cạnh từng điểm chưa tới | Đổi thứ tự các điểm chưa tới. Bấm là ghi ngay, không hỏi lại; khi xe đang chạy, nút khoá nếu thứ tự mới làm khách đang chờ lên bị đảo. | không | được: bấm mũi tên ngược lại, khi điểm còn chưa tới | `/api/van-chuyen/chuyen/:x`<br>`/api/van-chuyen/chuyen/:x/thu-tu`<br>`/api/van-chuyen/cuoc-cua-toi/:x/thu-tu` | `web/chuyen.ts`: ↑<br>`web/chuyen.ts`: ↓<br>`web/cuoc-chuyen.ts`: ↑<br>`web/cuoc-chuyen.ts`: ↓ | chờ chọn (máy lộ thêm 2026-11-04 khi bộ quét nhận lệnh ghi qua hàm bọc; chưa trình chủ) |
| **Thêm điểm đón / thêm khách** | Chi tiết chuyến (xe đang chạy) › khối «Việc của văn phòng» › hộp «Thêm điểm đón / thêm khách» | Đưa một lượt đưa đón đang chờ xếp (với số khách chọn) vào chuyến đang chạy: máy thêm điểm đón mới ở lộ trình, tài xế nhận tin ngay. Lượt không phải đặt gấp thì phải qua hộp «Điều chỉnh khẩn cấp»; người không có quyền thấy dòng khoá. | có hộp chọn lượt và số khách | một phần: không có nút gỡ; chỉ báo huỷ rồi tài xế bấm «Khách đã huỷ» | `/api/van-chuyen/chuyen/:x/huy`<br>nhật ký `trip_stop_added_running` | `web/chuyen.ts`: Thêm điểm đón / thêm khách<br>`web/chuyen.ts`: Thêm vào chuyến | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Báo huỷ** | Chi tiết chuyến (xe đang chạy) › khối «Khách đang chờ» › link «Báo huỷ» › hộp «Báo huỷ một suất» | Chỉ đánh dấu cho tài xế: khách này đã huỷ. Chỗ vẫn bị giữ, tài xế thấy nhãn «Văn phòng đã báo huỷ» và vẫn tới điểm; chỉ khi tài xế bấm «Khách đã huỷ» (hoặc «Đã đón» nếu khách vẫn có mặt) thì chỗ mới được xử lý. Nút không huỷ đơn của khách. | có hộp chọn lý do, nêu rõ «Thẻ vẫn chiếm chỗ» | không: không thấy nút bỏ đánh dấu; tài xế vẫn quyết cuối cùng bằng Đã đón / Khách đã huỷ | `/api/van-chuyen/chuyen/:x/phan-bo/:x/bao-huy`<br>nhật ký `trip_allocation_office_cancelled` | `web/chuyen.ts`: Báo huỷ | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Người đi kèm

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm người đi kèm** | Chi tiết chuyến (chuyến chưa chạy) › thẻ «Khách trong chuyến» › «Thêm người đi kèm» › hộp cùng tên | Thêm một hướng dẫn viên có tài khoản vào chuyến làm người đi kèm. Người đi kèm cũng phải «Đã lên xe» rồi «Đã xuống» thì «Kết thúc chuyến» thường mới bấm được. Chỉ chuyến chưa chạy và ngoài vùng khoá. | có hộp chọn người | được khi chưa đón: nút «Rút khỏi xe» ở nhóm «Người đi kèm · N» rút cả nhóm cùng lúc, không rút lẻ từng người | `/api/van-chuyen/chuyen/:x/phan-bo`<br>nhật ký `trip_allocated` | `web/chuyen.ts`: Gắn lên xe<br>`web/chuyen.ts`: Thêm người đi kèm | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Xếp khách

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Rút khỏi xe** | Chi tiết chuyến (chuyến chưa chạy) › thẻ «Khách trong chuyến» › từng nhóm khách › hộp «Rút khỏi xe» | Đưa nhóm khách này ra khỏi chuyến, trở về cột «Chưa xếp» của Điều phối xe; điểm dừng không còn khách thì bỏ qua. Trong vùng khoá trước giờ xe chạy cần người có quyền «Điều chỉnh khẩn cấp». Tài xế chỉ nhận tin khi lệnh phải bỏ qua luật. | có hộp (nêu số khách trở về Chưa xếp) | được: xếp lại bằng «Xếp vào chuyến» | `/api/van-chuyen/chuyen/:x/rut`<br>nhật ký `trip_allocation_removed` | `web/chuyen.ts`: Rút khỏi xe | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Chuyển sang xe khác** | Chi tiết chuyến (chuyến chưa chạy) › thẻ «Khách trong chuyến» › từng nhóm khách › hộp «Chuyển sang xe khác» | Dời nhóm khách NGAY sang một chuyến khác chưa chạy cùng ngày (không cần xe kia đồng ý); kiểm luật chỗ, giờ, giấy tờ ở chuyến đích. Trong vùng khoá cần người có quyền «Điều chỉnh khẩn cấp». Tài xế chỉ nhận tin khi lệnh phải bỏ qua luật. | có hộp chọn chuyến đích | được: dời lại hoặc rút và xếp lại | `/api/van-chuyen/chuyen/:x/doi`<br>nhật ký `trip_allocation_moved` | `web/chuyen.ts`: Chuyển khách<br>`web/chuyen.ts`: Chuyển sang xe khác | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Xếp vào chuyến… / Xếp N lượt vào chuyến…** | Điều phối xe › cột «Chưa xếp» (thẻ lượt đưa đón, thanh chọn nhiều lượt) và kéo thả vào chuyến › hộp «Xếp vào chuyến» | Đưa một hoặc nhiều lượt đưa đón chưa xếp vào một chuyến chưa chạy (xếp ít hơn số khách là tách đoàn, phần còn lại ở cột «Chưa xếp»). Xếp nhiều lượt thì một lượt lỗi là cả lệnh không chạy. Chuyến chưa đủ điều kiện vẫn nhận khách nhưng bị giữ cho tới khi đủ. Tài xế chỉ nhận tin khi lệnh phải bỏ qua luật; còn lại thấy khách khi mở chuyến. | có hộp chọn chuyến và số khách | được: bằng «Rút khỏi xe» ở Chi tiết chuyến | `/api/van-chuyen/chuyen/:x/phan-bo`<br>`/api/van-chuyen/chuyen`<br>nhật ký `trip_allocated` | `web/dieu-phoi.ts`: Xếp ‹…› lượt vào chuyến… / Xếp vào chuyến…<br>`web/dieu-phoi.ts`: Xếp vào chuyến<br>`web/dieu-phoi.ts`: ⟪...noiDung⟫ / Xếp vào chuyến… | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Huỷ chuyến

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Huỷ chuyến** | Chi tiết chuyến (chuyến chưa chạy) › nút đỏ «Huỷ chuyến» › hộp «Huỷ chuyến <mã>» | Đóng chuyến chưa chạy thành «Đã huỷ»: mọi khách trong chuyến trở về cột «Chưa xếp», các điểm dừng bị bỏ qua, chuyến không bị xoá. Nếu là chuyến xe thuê, máy huỷ toàn bộ dòng chi phí còn hiệu lực về 0, kể cả giá thoả thuận, khoản điều chỉnh và phí huỷ muộn Kế toán đã ghi. Tài xế đang lái nhận tin chuyến đã bị huỷ. Còn khách mà đã dưới hạn chốt thì phải qua hộp «Điều chỉnh khẩn cấp». | có hộp chọn lý do, nêu số khách trở về Chưa xếp; không nêu chuyện chi phí | không: chuyến đã huỷ không mở lại; phải tạo chuyến mới và xếp lại khách; dòng chi phí đã huỷ do Kế toán ghi lại | `/api/van-chuyen/chuyen/:x/huy`<br>nhật ký `trip_cancelled` | `web/dieu-phoi-ui.ts`: Huỷ chuyến<br>`web/chuyen.ts`: Huỷ chuyến | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Duyệt chuyển khách

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Duyệt** | Đề nghị chuyển khách › thẻ «Chờ văn phòng duyệt» › «Duyệt» › hộp «Duyệt đề nghị» | Đồng ý cho khách chuyển từ xe nhờ sang xe nhận: máy kiểm lại các điều kiện, rồi khách vào chuyến nhận NGAY và rời chuyến nhờ. Có điều kiện bắt buộc không đạt thì không có nút Duyệt, chỉ có Bác. Hai tài xế nhận tin. | có hộp chọn lý do | không: không có nút hoàn lại; muốn trả khách về phải xếp lại tay | nhật ký `trip_transfer_confirmed` | `web/de-nghi.ts`: Duyệt chuyển khách / Bác đề nghị<br>`web/de-nghi.ts`: Duyệt | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Bác** | Đề nghị chuyển khách › thẻ «Chờ văn phòng duyệt» › «Bác» › hộp «Bác đề nghị» | Không đồng ý cho khách chuyển: khách ở lại xe nhờ. Hai tài xế nhận tin kèm lý do. Đề nghị đóng, không làm lại; tài xế phải gửi đề nghị mới nếu còn cần. | có hộp chọn lý do | không: đề nghị đã bác không mở lại | `/api/van-chuyen/de-nghi/:x/bac`<br>nhật ký `trip_transfer_rejected` | `web/de-nghi.ts`: Bác<br>`web/de-nghi.ts`: Quay lại | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Gọi báo khách giờ hẹn mới

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đã gọi báo / Bỏ đánh dấu** | Điều phối xe › cột «Cần xử lý» (mục «Giờ hẹn đổi — gọi báo khách»); Chi tiết chuyến › dòng điểm dừng | Chỉ ghi nhận là nhân viên đã gọi điện báo khách về giờ hẹn mới (mục nhắc hết hiện); Nền tảng không gửi gì cho khách. «Bỏ đánh dấu» đặt mục nhắc hiện lại. Bán hàng chỉ bấm được cho đơn mình lập hoặc phụ trách. | không | được: bằng nút «Bỏ đánh dấu» | `/api/van-chuyen/chang/:x/da-goi-bao`<br>`/api/van-chuyen/chang/:x/bo-danh-dau-goi-bao`<br>nhật ký `trip_appt_called`<br>nhật ký `trip_appt_call_undone` | `web/dieu-phoi.ts`: ⟪a.nhan⟫<br>`web/dieu-phoi.ts`: Bỏ đánh dấu<br>`web/chuyen.ts`: ⟪d.nut.nhan⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng; «Bỏ đánh dấu» do AI đổi 2026-10-18 (thay «Bỏ dấu»), chủ chưa chọn riêng.) |

### Xe: thêm xe

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm xe** | Vận chuyển › Xe (đầu trang và thanh dưới điện thoại) | Chỉ mở trang «Thêm xe» (một liên kết), chưa ghi gì. Việc ghi nằm ở nút «Lưu xe» trên trang đó. | không | được: bỏ trang, không lưu | (chưa nối) | `public/xe.html`: Thêm xe | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Xe: lưu thông tin xe

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu xe (khi thêm) / Lưu (khi sửa); trong form có «Dùng lại xe» và chọn Đang dùng / Bảo dưỡng** | Vận chuyển › Xe › Thêm xe / Sửa xe (nút trong form và nút dính đáy điện thoại) | Thêm xe mới (biển số, số khung, tên, số người được chở, chủ xe) hoặc ghi đè thông tin xe đã có. «Dùng lại xe» chỉ đổi ô trạng thái trong form; xe chỉ thật sự dùng lại khi bấm Lưu, lúc đó máy chủ kiểm biển số có đang thuộc xe khác không. Đổi chủ xe cũng đi qua nút này. | không | được: sửa lại bằng Lưu; xe không bị xoá | `/api/van-chuyen/xe`<br>`/api/van-chuyen/xe/:x`<br>nhật ký `vehicle_created`<br>nhật ký `vehicle_updated` | `web/xe-sua.ts`: Lưu / Lưu xe<br>`web/xe-sua.ts`: Dùng lại xe<br>`web/xe-sua.ts`: Đang dùng / Bảo dưỡng | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Xe: ngừng dùng xe

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ngừng dùng xe** | Vận chuyển › Xe › Sửa xe (nút viền đỏ trong form và dưới đáy điện thoại) | Đổi trạng thái xe sang Ngừng ngay lúc bấm xác nhận, không cần bấm Lưu, kèm ngày ngừng là hôm nay. Xe không bị xoá, giấy tờ và lịch sử còn nguyên; sau đó không thêm hay gia hạn giấy tờ được nữa, và xe không còn xuất hiện ở Điều phối. Dùng lại bằng «Dùng lại xe» rồi Lưu. | có: Xe không bị xoá… chuyển sang Ngừng; có thể dùng lại bất cứ lúc nào | một phần: «Dùng lại xe» + Lưu, nhưng chỉ được khi biển số chưa thuộc xe khác đang dùng | `/api/van-chuyen/xe/:x`<br>nhật ký `vehicle_updated` | `web/xe-sua.ts`: Ngừng dùng xe<br>`web/xe-sua.ts`: Ngừng dùng<br>`web/xe-sua.ts`: Giữ nguyên | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Giấy tờ xe: thêm giấy tờ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm giấy tờ (mở bảng); nút lưu trong bảng cũng ghi «Thêm giấy tờ»** | Vận chuyển › Xe › Chi tiết xe (nút ở đầu thẻ trên máy tính, dính đáy trên điện thoại) | Thêm một giấy tờ MỚI cho xe, mỗi loại chỉ có một dòng hiện hành. Xe đã đủ mọi loại đang dùng thì nút tắt và có dòng «dùng Gia hạn hoặc Sửa sai». Xe đã ngừng thì không thêm được. Số giấy tờ xe hiện đủ, không che. | không | một phần: dòng nhập nhầm huỷ được bằng Sửa sai → «Nhập nhầm cả dòng»; không xoá hẳn | nhật ký `vehicle_document_added` | `public/xe-chi-tiet.html`: Thêm giấy tờ<br>`web/xe-chi-tiet.ts`: Thêm giấy tờ<br>`web/giay-to-ui.ts`: Lưu gia hạn / Lưu sửa sai / Thêm giấy tờ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Giấy tờ xe: gia hạn

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gia hạn (mở bảng) · nút lưu «Lưu gia hạn»** | Vận chuyển › Xe › Chi tiết xe, trên từng giấy tờ (thẻ điện thoại và bảng máy tính) | Thêm một dòng giấy tờ MỚI cùng loại (số mới, ngày cấp, ngày hết hạn mới); dòng cũ không bị sửa, chỉ chuyển sang «Lịch sử» và có nhãn «Đã thay». Không gõ số mới thì máy chủ chép số cũ. Chỉ hiện ở giấy có hạn và xe chưa ngừng. Cũng là nút dùng khi nhận giấy mới cấp lại. | không | một phần: lỡ gia hạn nhầm thì Sửa sai → «Nhập nhầm cả dòng» ở dòng mới, dòng cũ lại thành hiện hành (đã đọc mã: dòng hiện hành là dòng chưa có dòng kế tiếp còn hiệu lực) | nhật ký `vehicle_document_renewed` | `web/xe-chi-tiet.ts`: Gia hạn<br>`web/giay-to-ui.ts`: Lưu gia hạn / Lưu sửa sai / Thêm giấy tờ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Giấy tờ xe: sửa sai một ô

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa sai (mở bảng) · nút lưu «Lưu sửa sai»; trong bảng có năm lý do bấm chọn** | Vận chuyển › Xe › Chi tiết xe, trên từng giấy tờ | Chọn lý do (Nhập sai số, ngày cấp hoặc ngày hết hạn) rồi sửa đúng MỘT ô, ghi đè thẳng lên dòng hiện hành, không thêm dòng. Giấy mới được cấp thì phải dùng Gia hạn, bảng có dòng nhắc việc này. Cho giấy tờ của người (dùng chung bảng này ở Danh bạ) thì còn đánh dấu hồ sơ «cần xác minh lại». | không | một phần: sửa lại lần nữa; nhật ký giữ ngày trước → sau, còn số giấy tờ xe thì không có giá trị cũ trong nhật ký | nhật ký `vehicle_document_corrected` | `web/xe-chi-tiet.ts`: Sửa sai<br>`web/giay-to-ui.ts`: Lưu gia hạn / Lưu sửa sai / Thêm giấy tờ<br>`web/giay-to-ui.ts`: ⟪l.nhan⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Giấy tờ xe và người: huỷ cả dòng (lý do cuối của Sửa sai)

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu sửa sai (sau khi chọn lý do «Nhập nhầm cả dòng (huỷ dòng này)»)** | Chi tiết xe › Sửa sai; Danh bạ › Giấy tờ › Sửa sai (cùng bảng) | Huỷ cả dòng giấy tờ hiện hành: dòng không còn hiện trong danh sách, không sửa được nữa nhưng vẫn nằm trong dữ liệu và nhật ký. Nếu dòng là kết quả của một lần Gia hạn thì dòng cũ lại thành hiện hành. Nếu là dòng duy nhất thì xe hoặc người coi như chưa có giấy loại đó; xe thiếu Kiểm định hay Bảo hiểm thì bị giữ ở cổng cho xe chạy. | không | một phần: thêm lại giấy bằng Thêm giấy tờ (dòng mới); dòng đã huỷ không mở lại được | nhật ký `vehicle_document_corrected` | `web/giay-to-ui.ts`: Lưu gia hạn / Lưu sửa sai / Thêm giấy tờ<br>`web/giay-to-ui.ts`: ⟪l.nhan⟫ | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Giấy tờ người: xem đủ số

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Xem đủ số** | Danh bạ › hồ sơ › Giấy tờ (hộp xác nhận) | Ghi nhật ký trước, rồi máy chủ trả số giấy tờ đầy đủ; số hiện trên màn mấy giây (theo token thời gian) rồi tự che lại, hoặc bấm «Che lại», hoặc khi rời trang. Mỗi lần xem là một dòng nhật ký (không kèm số). | có: Mỗi lần xem đều được ghi nhật ký. Xem đủ số? | không: lần xem đã ghi nhật ký; số tự che lại sau vài giây | `/api/parties/:x/documents/:x/reveal`<br>nhật ký `party_document_number_viewed` | `web/giay-to-ui.ts`: Xem đủ số | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Giấy tờ sắp hết hạn: mốc nhắc

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đổi mốc nhắc** | Vận chuyển › Sắp hết hạn (chỉ Toàn quyền thấy nút) | Đổi số ngày «nhắc trước» (1–365) dùng chung cho giấy tờ xe và giấy tờ cá nhân. Ghi thành một dòng chính sách mới có hiệu lực ngay; danh sách, chip hạn và số trên thanh bên tính lại theo mốc mới. Không gửi tin cho ai. | không | được: đặt lại số ngày khác | `/api/van-chuyen/nguong-het-han`<br>nhật ký `expiry_policy_changed` | `web/giay-to-sap-het-han.ts`: Đổi mốc nhắc<br>`web/giay-to-sap-het-han.ts`: Lưu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Lịch xe bận: thêm

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm lịch bận · nút lưu trong form: Lưu** | Vận chuyển › Lịch xe bận (nút đầu trang mở form, nút Lưu trong form) | Ghi một khung giờ xe bận (bảo dưỡng, kẹt việc…) cho một xe. Máy chủ kiểm nếu xe đang có chuyến chưa huỷ trùng giờ thì từ chối và liệt kê mã chuyến, không tự dời chuyến. Trong giờ này Điều phối không cho xếp chuyến cho xe. Xe đã ngừng thì không ghi được. | không | được: bằng nút ✕ «Rút lịch bận» trên khung đó (nếu khung chưa qua) | `/api/van-chuyen/xe/:x/ban`<br>nhật ký `vehicle_unavailability_added` | `public/lich-xe-ban.html`: Thêm lịch bận<br>`web/lich-xe-ban.ts`: Lưu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Lịch xe bận: rút

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Dấu ✕ (nhãn đọc màn hình «Rút lịch bận…») · nút trong hộp: Rút** | Vận chuyển › Lịch xe bận, dấu ✕ ở góc thẻ lịch bận | Rút khung bận của xe: khung được đánh dấu đã rút (không xoá, vẫn nằm trong dữ liệu và nhật ký) và xe xếp chuyến lại được trong giờ đó. Khung đã qua giờ thì không rút được. | có: Rút lịch bận <xe> <giờ> <ngày>? Xe sẽ xếp chuyến được trong giờ này. | một phần: ghi lại một khung mới bằng Thêm lịch bận | `/api/van-chuyen/xe/:x/ban/:x/rut`<br>nhật ký `vehicle_unavailability_withdrawn` | `web/lich-xe-ban.ts`: Rút<br>`web/lich-xe-ban.ts`: [biểu tượng close] | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Báo bận của tài xế

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu khung bận** | Báo bận của tôi › Ghi khung bận | Ghi khung giờ tài xế đối tác tự báo bận (tối đa 14 ngày một khung). Nếu khung trùng chuyến mình đang được xếp thì máy chủ từ chối và hiện mã chuyến để Từ chối chuyến đó hoặc gọi văn phòng. Văn phòng thấy tài xế bận ở dải «Tài xế bận» nhưng không thấy lý do, và không có tin báo gửi đi. | không | được: «Rút khung bận» | `/api/van-chuyen/ban`<br>nhật ký `driver_unavailability_added` | `web/ban.ts`: Lưu khung bận | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Báo bận của tài xế: rút

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Rút khung bận (nút ở dòng) · nút xác nhận cũng ghi «Rút khung bận»** | Báo bận của tôi › Khung bận đang có (hỏi lại ngay trong dòng, không hộp nổi) | Rút khung bận đã báo: khung không còn hiệu lực, văn phòng lại xếp chuyến cho tài xế được trong giờ đó. Không xoá, vẫn nằm trong nhật ký. | có: Rút khung này? Văn phòng sẽ xếp chuyến được cho bạn trong giờ này. | một phần: ghi lại khung mới bằng Lưu khung bận | `/api/van-chuyen/ban/:x/rut`<br>nhật ký `driver_unavailability_withdrawn` | `web/ban.ts`: Rút khung bận<br>`web/ban.ts`: Không rút | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Bảng giá thuê xe: thêm giá

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm giá · nút lưu trong form: Lưu giá** | Vận chuyển › Bảng giá thuê xe › thẻ Giá thuê (nút đầu trang, nút khi nhà xe chưa có giá, nút trong form) | Thêm một dòng giá thuê cho một nhà xe: bắt buộc cả tuyến lẫn cỡ xe, số tiền một chuyến, từ ngày (mặc định hôm nay), đến ngày (có thể để trống). Máy chủ chặn dòng chồng giá cùng tuyến cùng cỡ. Chỉ nhà xe đang hợp tác. Giá này là giá bảng để chuyến xe thuê chụp lại; chuyến đã chụp rồi không đổi theo. | không | một phần: «Kết thúc» chặn giá từ một ngày; không xoá dòng | `/api/van-chuyen/bang-gia`<br>nhật ký `rental_rate_added` | `web/bang-gia-xe.ts`: Thêm giá<br>`web/bang-gia-xe.ts`: Lưu giá mới / Lưu giá | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Bảng giá thuê xe: đổi giá

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đổi giá (mở form) · nút lưu «Lưu giá mới»** | Vận chuyển › Bảng giá thuê xe › mỗi dòng giá chưa kết thúc | Một thao tác làm hai việc: đặt ngày kết thúc cho dòng giá cũ là ngày trước «Từ ngày» của giá mới, và thêm dòng giá mới giữ nguyên tuyến, cỡ xe. Giá mới phải bắt đầu sau ngày bắt đầu của giá cũ. Không sửa số tiền tại chỗ. | không | một phần: đổi giá tiếp lần nữa; dòng cũ giữ làm lịch sử | `/api/van-chuyen/bang-gia`<br>nhật ký `rental_rate_added` | `web/bang-gia-xe.ts`: Đổi giá<br>`web/bang-gia-xe.ts`: Lưu giá mới / Lưu giá | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Bảng giá thuê xe: kết thúc giá

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Kết thúc (nút ở dòng) · Kết thúc giá (nút trong hộp)** | Vận chuyển › Bảng giá thuê xe › mỗi dòng giá (chữ đỏ ở dòng, nút đỏ trong hộp) | Đặt «Đến ngày» cho dòng giá (mặc định hôm nay): giá còn áp tới hết ngày đó, từ hôm sau không còn là giá bảng. Nếu chọn ngày ở tương lai thì giá vẫn đang áp cho tới ngày đó. Chuyến đã chụp giá trước đó giữ nguyên; chuyến xe thuê xếp sau ngày này sẽ thiếu giá bảng và phải nhập giá thoả thuận. Dòng đã kết thúc không mở lại được. Dòng giá không bị xoá. | có: hộp «Kết thúc giá» hiện tuyến · cỡ · số tiền và ô Đến ngày | một phần: không mở lại được; thêm một dòng giá mới cùng tuyến, cỡ cho khoảng ngày cần | `/api/van-chuyen/bang-gia/:x/ket-thuc`<br>nhật ký `rental_rate_closed` | `web/bang-gia-xe.ts`: Kết thúc<br>`web/bang-gia-xe.ts`: Kết thúc giá<br>`web/bang-gia-xe.ts`: Đóng | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Bảng giá thuê xe: thêm tuyến, thêm cỡ xe

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm** | Vận chuyển › Bảng giá thuê xe › thẻ Tuyến / thẻ Cỡ xe (nút dưới ô nhập) | Thêm một tuyến (tên) hoặc một cỡ xe (khoảng số khách từ – đến, không kể tài xế) vào danh mục; máy tự sinh mã. Các tuyến, cỡ này sau đó được chọn khi thêm giá và khi xếp chuyến. | không | một phần: không xoá, chỉ «Ngưng dùng» | `/api/van-chuyen/tuyen`<br>`/api/van-chuyen/co-xe`<br>nhật ký `route_saved`<br>nhật ký `vehicle_size_saved` | `web/bang-gia-xe.ts`: Thêm | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Bảng giá thuê xe: đổi tên tuyến, cỡ xe

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đổi tên · nút lưu trong hộp: Lưu** | Vận chuyển › Bảng giá thuê xe › Tuyến / Cỡ xe › Đổi tên | Đổi tên (nhãn) của tuyến hoặc cỡ xe; mã không đổi nên các dòng giá cũ trỏ theo mã sẽ hiện tên mới. | không | được: đổi tên lại | `/api/van-chuyen/tuyen/:x`<br>`/api/van-chuyen/co-xe/:x`<br>nhật ký `route_saved`<br>nhật ký `vehicle_size_saved` | `web/bang-gia-xe.ts`: Đổi tên<br>`web/bang-gia-xe.ts`: Lưu<br>`web/bang-gia-xe.ts`: Đóng | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Bảng giá thuê xe: ngưng dùng / dùng lại tuyến, cỡ xe

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ngưng dùng / Dùng lại · (cỡ xe còn giá đang áp) xác nhận «Vẫn ngưng»** | Vận chuyển › Bảng giá thuê xe › Tuyến / Cỡ xe | Tắt hoặc bật lại tuyến, cỡ xe trong danh mục: mục ngưng không còn trong ô chọn khi thêm giá; giá cũ giữ nguyên. Với cỡ xe, xe cùng số chỗ sẽ không còn khớp giá theo cỡ, nên có hộp hỏi nếu còn giá đang áp. Tuyến ngưng thì không hỏi gì. | có (chỉ cỡ xe còn giá đang áp): Cỡ này còn N dòng giá đang áp… vẫn ngưng? | được: «Dùng lại» | `/api/van-chuyen/co-xe/:x`<br>nhật ký `route_saved`<br>nhật ký `vehicle_size_saved` | `web/bang-gia-xe.ts`: Ngưng dùng / Dùng lại<br>`web/bang-gia-xe.ts`: Vẫn ngưng | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Chi phí chuyến xe thuê: nhập giá thoả thuận

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Nhập giá thoả thuận (mở form) · nút lưu «Lưu giá thoả thuận»** | Chi tiết chuyến › khối Chi phí chuyến (dải cảnh báo thiếu giá và cuối khối) | Ghi cho chuyến xe thuê chưa có giá một dòng chi phí «giá thoả thuận» với nhà xe: số tiền và ghi chú (thoả thuận với ai, ngày nào), mang ngày chạy chuyến. Có giá rồi thì chuyến hết bị giữ vì thiếu giá. Chỉ khi chuyến chưa chạy, là xe thuê và chưa có nguồn giá nào. | không | một phần: «Huỷ dòng» khi xe chưa chạy | `/api/van-chuyen/chuyen/:x/chi-phi/gia-thoa-thuan`<br>nhật ký `trip_cost_agreed` | `web/chi-phi-chuyen.ts`: Nhập giá thoả thuận<br>`web/chi-phi-chuyen.ts`: ⟪nhanNut⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Chi phí chuyến xe thuê: lấy lại giá bảng

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lấy lại giá bảng** | Chi tiết chuyến › khối Chi phí chuyến (cuối khối) | Bấm là ghi ngay một dòng chi phí «giá bảng» cho chuyến, lấy theo nhà xe, tuyến, cỡ xe (theo số chỗ của xe) và ngày chạy; không hỏi lại. Báo lỗi nếu bảng chưa có giá hợp. Chỉ khi chuyến chưa chạy và chưa có nguồn giá. | không | một phần: «Huỷ dòng» khi xe chưa chạy | `/api/van-chuyen/chuyen/:x/chi-phi/chup-lai`<br>nhật ký `trip_cost_snapshot` | `web/chi-phi-chuyen.ts`: Lấy lại giá bảng | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Chi phí chuyến xe thuê: điều chỉnh

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Điều chỉnh (mở form) · nút lưu «Lưu điều chỉnh»** | Chi tiết chuyến › khối Chi phí chuyến (cuối khối) | Thêm một dòng cộng hoặc trừ vào tổng chi phí chuyến xe thuê (phụ phí, giảm giá, phí huỷ muộn…), chọn lý do, ngày phát sinh để trống thì lấy ngày chạy (chuyến huỷ thì ngày huỷ). Tổng không được âm. Dòng cũ không sửa; muốn bỏ thì dùng Huỷ dòng. | không | một phần: «Huỷ dòng» thêm một dòng ngược lại; dòng gốc vẫn hiện, ghi «đã huỷ» | `/api/van-chuyen/chuyen/:x/chi-phi/dieu-chinh`<br>nhật ký `trip_cost_adjusted` | `web/chi-phi-chuyen.ts`: Điều chỉnh<br>`web/chi-phi-chuyen.ts`: ⟪nhanNut⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Chi phí chuyến xe thuê: huỷ dòng

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Huỷ dòng (ở dòng) · Huỷ dòng (nút đỏ trong hộp)** | Chi tiết chuyến › khối Chi phí chuyến, nút chữ ở mỗi dòng huỷ được | Không xoá dòng. Máy chủ thêm một dòng đối ứng số âm bằng đúng dòng gốc, ghi lý do và ghi chú; dòng gốc hiện chip «đã huỷ», tổng chi phí giảm tương ứng. Giá bảng hoặc giá thoả thuận đã chụp thì sau khi xe chạy không huỷ được (phải dùng Điều chỉnh); nút chỉ hiện ở dòng huỷ được. Huỷ dòng giá bảng khi xe chưa chạy làm chuyến lại thiếu giá. | có hộp nhập: dòng bị huỷ (loại, số tiền, lý do) + chọn Lý do (bắt buộc) + Ghi chú | một phần: không bỏ huỷ được; muốn lại thì «Lấy lại giá bảng», «Nhập giá thoả thuận» hoặc «Điều chỉnh» | `/api/van-chuyen/chuyen/:x/chi-phi/dao`<br>nhật ký `trip_cost_reversed` | `web/chi-phi-chuyen.ts`: Huỷ dòng<br>`web/chi-phi-chuyen.ts`: Đóng | đã chốt (rà soát 2026-11-04: tên đúng; chủ 2026-10-18 (hộp hỏi: «Huỷ khoản thu»): «Huỷ dòng (chi phí xe)» nằm trong cột thay của TU_DA_LOAI) |

### Chính sách điều phối: lưu bản mới

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu thành bản mới** | Vận chuyển › Chính sách điều phối (nút cuối form và nút dính đáy điện thoại) | Lưu cả bộ cài đặt điều phối thành một bản chính sách mới, có hiệu lực ngay lúc lưu; bản đang dùng chuyển vào lịch sử. Gồm hạn chốt trước giờ đón, cảnh báo sắp tới hạn chốt, khoảng nghỉ tài xế, khai lùi, giờ lái, cửa sổ cho xe chạy, hạn từ chối chuyến, số điện thoại văn phòng, thời gian chờ chuyển khách, và hai công tắc (đủ danh sách khách, tự đồng ý chuyển khách). Không chọn ngày hiệu lực được. Không đổi gì thì báo «Chưa đổi gì». | không | một phần: lưu bản mới với số cũ; lịch sử mọi bản vẫn giữ | `/api/van-chuyen/chinh-sach-dieu-phoi`<br>nhật ký `dispatch_policy_changed` | `web/chinh-sach-dieu-phoi.ts`: Lưu thành bản mới | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Chính sách điều phối: Quản trị đổi hạn chốt

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu hạn chốt** | Vận chuyển › Chính sách điều phối, chế độ hẹp cho Quản trị | Quản trị chỉ đổi được hai số: hạn chốt trước giờ đón và cảnh báo sắp tới hạn chốt. Máy chủ lấy bản chính sách hiện hành, thay hai số này, lưu thành bản mới có hiệu lực ngay (mọi cài đặt khác chép nguyên). Cùng một bản ghi với nút «Lưu thành bản mới» của Toàn quyền. | không | một phần: lưu lại số cũ | `/api/van-chuyen/moc-ra-lenh`<br>nhật ký `dispatch_policy_changed` | `web/chinh-sach-dieu-phoi.ts`: Lưu hạn chốt | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Chính sách điều phối: hạn mức Từ chối của hướng dẫn viên

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu cài đặt** | Vận chuyển › Chính sách điều phối › thẻ «Hạn mức Từ chối của hướng dẫn viên» | Lưu chế độ (Tắt, Chỉ đo, Chặn) và hai số (đơn liên tiếp tối đa, số lần mỗi tuần) của hạn mức Từ chối đơn. Hiệu lực ngay. Nếu chọn Chặn, hướng dẫn viên vượt mức không bấm Từ chối được nữa mà phải gọi văn phòng. Là thẻ riêng, không liên quan nút «Lưu thành bản mới» của form chính sách trên cùng trang. | không | một phần: đặt lại chế độ và số cũ | `/api/dispatch/han-muc-tu-choi/chinh-sach`<br>nhật ký `refuse_policy_changed` | `web/han-muc-tu-choi-the.ts`: Lưu cài đặt | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Chính sách điều phối: đặt lại số lần Từ chối

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đặt lại (từng hướng dẫn viên) · Đặt lại tất cả** | Vận chuyển › Chính sách điều phối › thẻ hạn mức Từ chối (nút ở từng người và «Đặt lại tất cả») | Tính lại từ 0 chuỗi liên tiếp và số lần Từ chối trong tuần của một hướng dẫn viên hoặc của tất cả. Không xoá lịch sử (máy chủ chèn dòng đặt lại), nhưng sau đó người đó được Từ chối lại thoải mái trong chế độ Chặn. | có: Đặt lại số lần Từ chối của …? Chuỗi liên tiếp và số lần trong tuần của người đó tính lại từ 0. Lịch sử vẫn giữ nguyên. | không: số đếm đã về 0, lịch sử Từ chối vẫn giữ | `/api/dispatch/han-muc-tu-choi/dat-lai`<br>nhật ký `refuse_counter_reset` | `web/han-muc-tu-choi-the.ts`: Đặt lại<br>`web/han-muc-tu-choi-the.ts`: Không<br>`web/han-muc-tu-choi-the.ts`: Đặt lại tất cả | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Danh mục loại giấy tờ: sửa, ngưng dùng

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa (dòng) · Lưu (trong khung «Sửa: <mã>»)** | Vận chuyển › Loại giấy tờ xe; Thiết lập › Loại giấy tờ cá nhân (cùng khối: loại giấy tờ, hạng giấy phép lái xe) | Sửa tên, cờ «Có ngày hết hạn», thứ tự và ô «Đang dùng» của một loại giấy tờ (hoặc hạng giấy phép lái xe). Bỏ tick «Đang dùng» là ngưng loại: lập tức loại không còn trong ô chọn khi thêm giấy tờ, và máy chủ cũng từ chối GIA HẠN giấy tờ loại này cho xe và người. Giấy đang có vẫn hiện. Mã không đổi được, không xoá. | không | được: tick lại «Đang dùng» và Lưu | `/api/van-chuyen/loai-giay-to-xe/:x`<br>`/api/parties/document-types/:x`<br>nhật ký `vehicle_document_type_changed`<br>nhật ký `party_document_catalog_changed` | `web/danh-muc-giay-to-khoi.ts`: Lưu<br>`web/danh-muc-giay-to-khoi.ts`: Sửa | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Danh mục loại giấy tờ: thêm loại

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm** | Vận chuyển › Loại giấy tờ xe; Loại giấy tờ cá nhân; Hạng giấy phép lái xe | Thêm một loại giấy tờ (hoặc hạng bằng) mới vào danh mục: mã (chữ hoa, không đổi được sau này), tên, có ngày hết hạn không, thứ tự. Không gửi tin cho ai. | không | một phần: không xoá, chỉ ngưng dùng; mã đã dùng không dùng lại được | `/api/van-chuyen/loai-giay-to-xe`<br>`/api/parties/document-types`<br>nhật ký `vehicle_document_type_changed`<br>nhật ký `party_document_catalog_changed` | `web/danh-muc-giay-to-khoi.ts`: Thêm | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Điều kiện cho xe chạy: thêm điều kiện

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm điều kiện** | Vận chuyển › Chính sách điều phối › Điều kiện cho xe chạy | Thêm một điều kiện: xe chở từ N người trở lên (1 = mọi xe) phải có loại giấy tờ đã chọn, của xe hoặc của tài xế, còn hạn thì mới được cho chạy. Áp ngay từ lúc thêm, cho các chuyến chưa chạy; thiếu giấy thì chuyến bị giữ và nút Cho xe chạy bị khoá. | không | một phần: «Đóng» điều kiện (không mở lại) | `/api/van-chuyen/dieu-kien`<br>nhật ký `departure_rule_added` | `web/dieu-kien-xuat-ben.ts`: Thêm điều kiện | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Điều kiện cho xe chạy: đóng điều kiện

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ngừng điều kiện (nút ở dòng; nhãn đọc màn hình «Ngừng điều kiện …»)** | Vận chuyển › Chính sách điều phối › Điều kiện cho xe chạy, mỗi dòng đang áp dụng | Ngừng điều kiện: từ lúc này xe không còn phải có giấy đó mới được chạy. Dòng chuyển sang «Đã ngừng», không mở lại được; muốn áp lại phải thêm điều kiện mới. Điều kiện bị bỏ nghĩa là xe thiếu giấy đó vẫn có thể chạy. | có: Từ lúc này xe không còn phải có giấy này mới được chạy. Không mở lại được… | một phần: không mở lại được; thêm điều kiện mới giống hệt | `/api/van-chuyen/dieu-kien/:x/dong`<br>nhật ký `departure_rule_closed` | `web/dieu-kien-xuat-ben.ts`: Đóng<br>`web/dieu-kien-xuat-ben.ts`: Ngừng điều kiện | đã chốt (ADR-0166 câu 9) |

### Điều kiện cho xe chạy: số khách tối đa theo hạng bằng

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đổi (mở khung) · Lưu** | Vận chuyển › Điều kiện cho xe chạy › Số khách theo hạng bằng (Đổi mở khung, Lưu ghi) | Đặt số khách tối đa (không kể tài xế; để trống = không giới hạn) mà một tài xế hạng bằng đó được chở. Ghi thành dòng mới có hiệu lực từ lúc lưu, dòng cũ vào lịch sử. | không | một phần: lưu lại số cũ | `/api/van-chuyen/hang-bang`<br>nhật ký `license_capacity_changed` | `web/dieu-kien-xuat-ben.ts`: Đổi<br>`web/dieu-kien-xuat-ben.ts`: Lưu<br>`web/dieu-kien-xuat-ben.ts`: Đóng | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Lý do điều phối: thêm lý do

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **+ Thêm lý do (mở ô) · Thêm (nút ghi)** | Vận chuyển › Lý do điều phối, mỗi nhóm (nút «+ Thêm lý do», ô «Lý do mới», nút Thêm) | Thêm một lý do vào nhóm đã chọn; mã máy sinh từ tên, trùng mã thì thử hậu tố. Lý do mới hiện trong hộp chọn lý do ở các thao tác điều phối thuộc nhóm đó. | không | một phần: không xoá, chỉ «Ngưng» | `/api/van-chuyen/ly-do`<br>nhật ký `trip_reason_added` | `web/ly-do-dieu-phoi.ts`: Thêm<br>`web/ly-do-dieu-phoi.ts`: Thêm lý do | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Lý do điều phối: sửa tên

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa (dòng) · Lưu (khung sửa)** | Vận chuyển › Lý do điều phối › Sửa (từng dòng) | Đổi tên một lý do; mã, thứ tự và trạng thái giữ nguyên. Máy chủ dùng mốc cập nhật để báo nếu người khác vừa sửa. | không | được: sửa lại tên | `/api/van-chuyen/ly-do/:x`<br>nhật ký `trip_reason_updated` | `web/ly-do-dieu-phoi.ts`: Lưu<br>`web/ly-do-dieu-phoi.ts`: Sửa | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Lý do điều phối: ngưng / dùng lại

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ngưng · Dùng lại (lý do hệ thống đang dùng không có nút, chỉ ghi «Hệ thống tự dùng — không ngưng được»)** | Vận chuyển › Lý do điều phối, mỗi dòng | Ngưng: lý do không còn trong hộp chọn của các thao tác điều phối; các lần đã chọn trước đó vẫn giữ. Không có hộp xác nhận. Lý do máy tự dùng thì cả nút lẫn máy chủ đều chặn ngưng. | không | được: «Dùng lại» | `/api/van-chuyen/ly-do/:x`<br>nhật ký `trip_reason_updated` | `web/ly-do-dieu-phoi.ts`: ⟪nb.nut⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đổi PIN của mình

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đổi PIN** | Tôi › Đổi mã PIN | Người dùng nhập PIN hiện tại và PIN mới hai lần; máy chủ đổi PIN, đăng xuất mọi máy khác của chính tài khoản đó, thu hồi mọi máy được tin ở bước hai lớp và tắt thông báo điện thoại của các máy ấy. Máy đang dùng giữ đăng nhập. | không | một phần: đổi lại được bằng Đổi PIN, nhưng các máy khác đã bị đăng xuất phải đăng nhập lại | `/api/account/change-pin`<br>nhật ký `pin_changed` | `public/account.html`: Đổi PIN | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đăng nhập

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đăng nhập** | Đăng nhập | Gửi số điện thoại và PIN lên máy chủ; đúng thì cho đăng nhập (có thể hỏi thêm mã bước hai và mời bật Face ID), sai thì tính vào bộ đếm chống dò PIN. | không | được: bằng Đăng xuất | `/api/auth/login` | `public/login.html`: Đăng nhập | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Tạo tài khoản

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Tạo tài khoản** | Quản lý tài khoản › Thêm tài khoản | Tạo tài khoản mới với vai trò đã chọn (kèm hồ sơ cá nhân mới hoặc dùng hồ sơ có sẵn), tự sinh PIN 6 số và hiện đúng một lần. Nút khoá lại nếu số hoặc tên khớp hồ sơ có sẵn cho tới khi chọn hồ sơ hoặc tick tạo mới. | không | một phần: không xoá được tài khoản, chỉ Ngưng | `/api/staff`<br>nhật ký `staff_created` | `public/staff.html`: Tạo tài khoản | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đăng xuất

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đăng xuất** | Trang Tôi (dòng cuối danh sách và mục Máy đang đăng nhập của tôi); thanh bên máy tính; màn «Đang bảo trì» | Đăng xuất chỉ máy đang dùng: tắt thông báo điện thoại của máy này, đăng xuất máy này, xoá khung nhớ rồi về trang đăng nhập. Các máy khác của cùng người vẫn đăng nhập. | không | được: đăng nhập lại | `/api/auth/logout` | `web/account.ts`: Đăng xuất<br>`web/maintenance-screen.ts`: Đăng xuất | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Đặt PIN mới bằng Face ID

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Xác nhận bằng Face ID** | Tôi › Đăng nhập bằng Face ID › «Quên PIN? Đặt PIN mới bằng Face ID» | Yêu cầu quét Face ID rồi đặt PIN mới (không cần PIN cũ). Máy chủ đổi PIN, đăng xuất mọi máy khác, thu hồi máy được tin ở bước hai lớp và gỡ khoá đăng nhập sai PIN. | không | một phần: đổi PIN lại được; các máy khác phải đăng nhập lại | `/api/account/pin-by-passkey`<br>nhật ký `pin_set_by_passkey` | `web/account.ts`: Xác nhận bằng Face ID | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Gỡ Face ID một máy

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gỡ** | Tôi › Đăng nhập bằng Face ID (mỗi dòng máy) | Gỡ đúng một Face ID của chính mình. Cùng lô máy chủ đăng xuất mọi máy KHÁC, đổi mốc thông tin đăng nhập và cấp lại cookie cho máy đang dùng. Không hỏi xác nhận. | không | một phần: bật lại Face ID được nhưng các máy khác đã bị đăng xuất | `/api/account/passkeys/:x`<br>nhật ký `passkey_removed` | `web/account.ts`: Gỡ | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Gỡ Face ID mọi máy

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gỡ tất cả** | Tôi › Đăng nhập bằng Face ID | Gỡ mọi Face ID của chính mình. Máy đang dùng giữ đăng nhập, các máy khác bị đăng xuất; lần sau đăng nhập bằng số điện thoại và PIN. | có: Gỡ Face ID trên mọi máy? Máy này vẫn giữ đăng nhập; các máy khác sẽ bị đăng xuất… | một phần: bật lại Face ID từng máy; đăng nhập các máy khác phải làm lại | `/api/account/passkeys/remove-all`<br>nhật ký `passkey_removed` | `web/account.ts`: Gỡ tất cả<br>`web/account.ts`: Gỡ Face ID | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Thông báo điện thoại

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Tắt** | Tôi › Thông báo trên điện thoại | Tắt thông báo màn hình khoá của đúng máy này: máy chủ bỏ địa chỉ nhận và trình duyệt huỷ đăng ký. Các máy khác vẫn nhận. | không | được: bằng Bật thông báo trên điện thoại | `/api/account/thong-bao/may/huy` | `web/account.ts`: Tắt | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Bật thông báo trên điện thoại** | Tôi › Thông báo trên điện thoại | Xin quyền thông báo của trình duyệt rồi đăng ký địa chỉ nhận của máy này với máy chủ để nhận tin màn hình khoá. | không | được: bằng Tắt | `/api/account/thong-bao/may` | `web/account.ts`: Bật thông báo trên điện thoại | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Bảo mật hai lớp: mã qua email

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gửi mã xác minh → Xác nhận email (Gửi lại mã)** | Tôi › Bảo mật đăng nhập › Nhận mã đăng nhập qua email | Gửi mã 6 số tới địa chỉ email gõ vào; nhập đúng mã thì email được lưu làm một cách xác thực hai lớp (có thể sinh bộ mã dự phòng). Địa chỉ này không đổi email liên hệ trong hồ sơ. | không | được: bằng Gỡ email nhận mã (trừ khi là cách xác thực cuối của tài khoản nội bộ) | `/api/account/mfa/email/start`<br>nhật ký `mfa_enabled` | `web/account.ts`: Gửi mã xác minh<br>`web/account.ts`: Xác nhận email<br>`web/account.ts`: Gửi lại mã | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Máy được tin

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Quên máy này** | Tôi › Bảo mật đăng nhập › Máy được tin | Thu hồi việc tin một máy: lần đăng nhập bằng PIN sau trên máy đó sẽ hỏi mã 6 số. Máy đang đăng nhập không bị đăng xuất. | không | được: tick Tin máy này 30 ngày ở lần đăng nhập sau | `/api/account/mfa/trusted/:x/forget` | `web/account.ts`: Quên máy này | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Quên mọi máy** | Tôi › Bảo mật đăng nhập › Máy được tin | Thu hồi việc tin mọi máy của chính mình; lần đăng nhập PIN sau trên các máy đó hỏi mã. Không đăng xuất ai. | có: confirm() của trình duyệt (không phải hộp trong trang) | được: tin lại ở lần đăng nhập sau | `/api/account/mfa/trusted/forget-all` | `web/account.ts`: Quên mọi máy<br>`web/account.ts`: Quên mọi máy được tin? Lần đăng nhập bằng PIN sau trên các máy đó sẽ hỏi mã 6 số. Máy đang đăng nhập không bị đăng xuất. | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Gỡ cách xác thực hai lớp

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gỡ ứng dụng xác thực · Gỡ email** | Tôi › Bảo mật đăng nhập › Gỡ ứng dụng xác thực / Gỡ email nhận mã | Cần nhập mã hiện có (6 số hoặc mã dự phòng) rồi gỡ một cách xác thực. Tài khoản nội bộ không gỡ được cách cuối cùng (máy chủ 409). Tài khoản bên ngoài gỡ cách cuối thì mất luôn mã dự phòng và máy được tin. | có hộp nhập mã | một phần: bật lại được; mã dự phòng cũ không lấy lại | `/api/account/mfa/remove`<br>nhật ký `mfa_removed` | `web/account.ts`: ⟪{ nhanO: nhanMaHienCo, duPhong: true, nhanNut, nutCls: "btn btn-danger", ghiChu: kin⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Mã dự phòng

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Tạo bộ mới → Tạo bộ mã mới** | Tôi › Bảo mật đăng nhập | Nhập mã 6 số hiện tại; máy chủ sinh 10 mã dự phòng mới, bộ cũ hết hiệu lực ngay, bộ mới hiện một lần. | có hộp nhập mã (ghi chú: «Bộ mã dự phòng cũ hết hiệu lực ngay khi tạo bộ mới.») | không: bộ cũ mất | `/api/account/mfa/recovery/regenerate`<br>nhật ký `mfa_recovery_regenerated` | `web/account.ts`: Tạo bộ mới<br>`web/account.ts`: Tạo bộ mã mới | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Tôi đã cất mã (đăng nhập: Tôi đã cất mã, vào Nền tảng)** | Tôi › Bảo mật đăng nhập; đăng nhập (bật lại) | Chỉ đóng bảng mã dự phòng đã hiện một lần và vẽ lại trang; không gọi máy chủ. Sau khi bấm không xem lại được các mã. | không | không: mã không hiện lại | (chưa nối) | `web/hai-lop-ui.ts`: ⟪nhanXong⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Tải tệp .txt** | Khối «Mã dự phòng» hiện sau khi bật ứng dụng xác thực hoặc tạo bộ mã mới | Tải bộ mã dự phòng ra một tệp văn bản trên máy đang dùng. Không ghi gì lên Nền tảng. Tệp chứa mã chưa che, nên người dùng phải tự cất kỹ. | không | không áp dụng: tệp nằm trên máy, người dùng tự xoá | (chưa nối) | `web/hai-lop-ui.ts`: Tải tệp .txt | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Bật ứng dụng xác thực

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Bật ứng dụng xác thực · Đổi sang điện thoại mới · Mở ứng dụng xác thực · Xác nhận bật** | Tôi › Bảo mật đăng nhập; đăng nhập › bật lại bảo mật hai lớp | Hai bước: thêm Tour Đảo vào ứng dụng xác thực (quét QR hoặc bấm mở ứng dụng), rồi nhập mã 6 số. Đúng thì lưu yếu tố; lần đầu sinh 10 mã dự phòng hiện một lần. Đổi sang điện thoại mới thay yếu tố cũ. | không | một phần: Gỡ ứng dụng xác thực (không gỡ được nếu là cách cuối của tài khoản nội bộ) | `/api/account/mfa/totp/start`<br>`/api/account/mfa/totp/confirm`<br>nhật ký `mfa_enabled` | `web/account.ts`: Đổi sang điện thoại mới<br>`web/account.ts`: Bật ứng dụng xác thực<br>`web/hai-lop-ui.ts`: Xác nhận bật<br>`web/hai-lop-ui.ts`: Mở ứng dụng xác thực | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Chế độ bảo trì

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Cập nhật giờ dự kiến** | Tôi › Chế độ bảo trì | Đổi giờ hoàn tất của đợt bảo trì đang bật. Giờ này không chỉ là thông báo: tới giờ, máy chủ tự coi bảo trì là tắt và mở lại cho mọi người. | không | được: bảo trì lại | `/api/maintenance`<br>nhật ký `maintenance_changed` | `web/account.ts`: Cập nhật giờ dự kiến | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Tắt chế độ bảo trì** | Tôi › Chế độ bảo trì | Mở lại Nền tảng cho mọi người ngay, không hỏi xác nhận. | không | được: bằng Bật chế độ bảo trì | `/api/maintenance`<br>nhật ký `maintenance_changed` | `web/account.ts`: Tắt chế độ bảo trì | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Bật chế độ bảo trì** | Tôi › Chế độ bảo trì | Chặn ngay mọi tài khoản không giữ Toàn quyền, kể cả Quản trị và máy đang đăng nhập; đóng mọi kết nối Bảng tin đang mở. Sẽ tự mở lại đúng giờ dự kiến đã chọn. | có: Mọi nhân viên khác sẽ bị chặn ngay, kể cả người đang mở Nền tảng. Chỉ bạn dùng được. | được: bằng Tắt chế độ bảo trì | `/api/maintenance`<br>nhật ký `maintenance_changed` | `web/account.ts`: Bật chế độ bảo trì<br>`web/account.ts`: Xác nhận bật | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Chính sách đăng nhập

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu chính sách** | Máy đang đăng nhập › Chính sách đăng nhập | Bấm lần đầu chỉ hỏi máy chủ xem sẽ đăng xuất bao nhiêu máy, chưa lưu gì. Bấm Xác nhận lưu thì lưu chọn Một máy / Nhiều máy của từng quyền và đăng xuất ngay các máy dư. | có: Sẽ đăng xuất N máy của M người. Lưu? | một phần: đổi lại chính sách được nhưng máy đã bị đăng xuất phải đăng nhập lại | `/api/sessions/policy`<br>nhật ký `session_policy_changed` | `web/chinh-sach-dang-nhap-ui.ts`: Lưu chính sách<br>`web/chinh-sach-dang-nhap-ui.ts`: Xác nhận lưu | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Chính sách riêng tư của tôi

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Rút đồng ý** | Tôi › Hồ sơ của tôi | Ghi quyết định rút đồng ý chính sách riêng tư của một phiên bản và rút luôn các phiếu tự khai đang chờ theo phiên bản đó. Dữ liệu đã khai và đã được xác minh không bị xoá. | có: Rút đồng ý phiên bản N sẽ rút luôn các phiếu đang chờ xác minh đã gửi theo phiên bản này. Bạn chắc chứ? | một phần: Đồng ý lại được, nhưng phiếu đã rút phải gửi lại | `/api/parties/cua-toi/dong-y`<br>nhật ký `privacy_consent_withdrawn` | `web/ho-so-cua-toi.ts`: Rút đồng ý<br>`web/ho-so-cua-toi.ts`: Thôi | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Đồng ý** | Tôi › Hồ sơ của tôi | Ghi quyết định đồng ý chính sách riêng tư phiên bản hiện hành (phải tick ô «Tôi đã đọc và đồng ý…» trước); từ đó mới gửi phiếu khai ngày sinh, địa chỉ, giấy tờ được. | không | được: bằng Rút đồng ý | `/api/parties/cua-toi/dong-y`<br>nhật ký `privacy_consent_given` | `web/ho-so-cua-toi.ts`: Đồng ý | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Khai thông tin cá nhân

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gửi xác minh** | Tôi › Hồ sơ của tôi › Khai thông tin để xác minh | Gửi một phiếu tự khai (ngày sinh, địa chỉ hoặc giấy tờ) chờ người có quyền xác minh chấp nhận hay từ chối. Hồ sơ vẫn giữ thông tin cũ cho tới khi được chấp nhận. | không | được: bằng Rút phiếu khi còn chờ | `/api/parties/cua-toi/phieu`<br>nhật ký `self_submission_created` | `web/ho-so-cua-toi.ts`: Gửi xác minh | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Phiếu tự khai

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Rút phiếu** | Tôi › Hồ sơ của tôi › Phiếu đã gửi | Rút một phiếu tự khai còn chờ xác minh; phiếu chuyển sang trạng thái Rút, hồ sơ không đổi. | có: bước xác nhận nút «Rút phiếu này» (không có câu hỏi) | một phần: gửi lại phiếu mới | `/api/parties/cua-toi/phieu/:x/rut`<br>nhật ký `self_submission_withdrawn` | `web/ho-so-cua-toi.ts`: Rút phiếu này<br>`web/ho-so-cua-toi.ts`: Rút phiếu<br>`web/ho-so-cua-toi.ts`: Thôi | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đăng chính sách riêng tư

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đăng phiên bản mới** | Tôi › Hồ sơ của tôi › Đăng chính sách riêng tư mới | Đăng phiên bản chính sách riêng tư mới kèm số ngày xử lý yêu cầu xoá và số ngày giữ IP máy đã đăng xuất. Có hiệu lực ngay, lưu vĩnh viễn, mọi người phải đồng ý lại. | có: Đăng là có hiệu lực ngay và không gỡ được… | không: chính sách lưu vĩnh viễn, chỉ đăng thêm bản sau | `/api/parties/chinh-sach-rieng-tu`<br>nhật ký `privacy_policy_published` | `web/ho-so-cua-toi.ts`: Đăng phiên bản mới<br>`web/ho-so-cua-toi.ts`: Xác nhận đăng | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Yêu cầu xoá dữ liệu của mình

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gửi yêu cầu xoá** | Tôi › Hồ sơ của tôi › Yêu cầu xoá dữ liệu | Tạo phiếu yêu cầu xoá chờ Quản trị xử lý và rút luôn mọi phiếu tự khai đang chờ. Chưa xoá gì ngay; khi được thực hiện thì giấy tờ, ngày sinh, địa chỉ, liên hệ, ảnh và thông tin máy đăng nhập bị ẩn danh, một số thông tin phải giữ theo quy định. | có: Gửi yêu cầu? Sau khi được thực hiện, việc xoá không hoàn tác được. Thông tin đang chờ xác minh của bạn sẽ được rút. | được: bằng Rút yêu cầu khi còn chờ; sau khi thực hiện thì không | `/api/parties/cua-toi/phieu-xoa`<br>nhật ký `party_erasure_requested` | `web/ho-so-cua-toi.ts`: Gửi yêu cầu xoá<br>`web/ho-so-cua-toi.ts`: Gửi yêu cầu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Rút yêu cầu** | Tôi › Hồ sơ của tôi › Yêu cầu xoá dữ liệu | Rút phiếu yêu cầu xoá còn chờ xử lý. Nếu Quản trị đã thực hiện hoặc từ chối trước đó thì máy chủ báo không còn rút được. | có: bước xác nhận nút «Rút yêu cầu này» | được: gửi yêu cầu mới | `/api/parties/cua-toi/phieu-xoa/:x/rut`<br>nhật ký `party_erasure_withdrawn` | `web/ho-so-cua-toi.ts`: Rút yêu cầu này<br>`web/ho-so-cua-toi.ts`: Rút yêu cầu<br>`web/ho-so-cua-toi.ts`: Thôi | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đăng nhập bước hai lớp

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Xác nhận** | Đăng nhập › Nhập mã xác thực | Gửi mã 6 số (ứng dụng, email hoặc mã dự phòng) kèm lựa chọn «Tin máy này 30 ngày» (mặc định đã tick). Đúng thì cho đăng nhập; nếu tick thì máy được ghi nhớ 30 ngày không hỏi mã. | không | được: Quên máy này ở trang Tôi | `/api/auth/mfa/verify` | `web/login.ts`: Xác nhận | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đăng nhập: Face ID, lời mời

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Tiếp tục** | Đăng nhập › Đã đăng nhập bằng mã dự phòng | Không gọi máy chủ: chỉ đi tiếp sau màn báo còn bao nhiêu mã dự phòng (có thể qua lời mời bật Face ID). | không | không áp dụng | `/api/account/passkeys` | `web/login.ts`: Tiếp tục | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Màn bảo trì

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thử lại → Tải lại trang** | Màn «Đang bảo trì» | Tải lại trang. Chữ nút đổi từ «Thử lại» sang «Tải lại trang» khi hệ thống đã mở lại; phần chưa lưu trên trang bị mất. | không | không áp dụng | (chưa nối) | `web/maintenance-screen.ts`: Thử lại | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Bật Face ID

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Bật → Tiếp tục với Face ID** | Tôi › Đăng nhập bằng Face ID › Bật trên máy này; lời mời sau đăng nhập | Hai lần chạm: Bật kiểm PIN hiện tại và xin thách thức; Tiếp tục với Face ID đăng ký khoá Face ID của máy này. | không | được: bằng Gỡ | `/api/account/passkeys/options`<br>`/api/account/passkeys`<br>nhật ký `passkey_added` | `web/passkey.ts`: Bật<br>`web/passkey.ts`: Tiếp tục với Face ID | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Phiếu xoá: chạy lại

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Chạy lại** | Xoá dữ liệu cá nhân › Yêu cầu xoá dữ liệu › Đã xử lý | Chép bản lưu ngoài còn thiếu và xoá khỏi kho các ảnh còn chờ của các phiếu xoá đã thực hiện. An toàn khi lặp. | không |  | `/api/parties/phieu-xoa/chay-lai`<br>nhật ký `party_erasure_retried` | `web/phieu-xoa.ts`: Chạy lại | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Xử lý yêu cầu xoá

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thực hiện** | Xoá dữ liệu cá nhân › Yêu cầu xoá dữ liệu › chi tiết phiếu | Ẩn danh dữ liệu cá nhân của người gửi phiếu: giấy tờ, phiếu tự khai, liên hệ, ngày sinh, tên hồ sơ (nếu không phải giữ), ảnh (xoá khỏi kho sau lô) và IP/thông tin máy đăng nhập; phần phải giữ theo quy định ở lại. Dòng không bị xoá khỏi bảng mà bị ghi đè bằng giá trị rỗng/giữ chỗ. | có: Thực hiện xoá? Việc này không hoàn tác được. | không: không hoàn tác được | `/api/parties/phieu-xoa/:x/thuc-hien`<br>nhật ký `party_erased` | `web/phieu-xoa.ts`: Thực hiện<br>`web/phieu-xoa.ts`: Thực hiện xoá<br>`web/phieu-xoa.ts`: Từ chối | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Từ chối → Gửi từ chối** | Xoá dữ liệu cá nhân › chi tiết phiếu › Chọn lý do từ chối | Chọn một lý do trong danh sách đóng; phiếu chuyển sang Từ chối, không xoá gì. Người gửi thấy lý do trong mục Hồ sơ của tôi. Không có tin nhắn riêng. | có: chọn lý do (nút Gửi từ chối bật khi đã chọn) | không: phiếu đã từ chối là cuối; người gửi gửi phiếu mới | `/api/parties/phieu-xoa/:x/tu-choi`<br>nhật ký `party_erasure_rejected` | `web/phieu-xoa.ts`: Gửi từ chối | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Ảnh giấy tờ hết lý do giữ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Xoá ảnh đã chọn** | Xoá dữ liệu cá nhân › Ảnh giấy tờ hết lý do giữ | Xoá thật các ảnh giấy tờ đã chọn (tối đa 50): đánh dấu trong CSDL và xoá khỏi kho tệp; ảnh vừa có lại lý do giữ được bỏ qua. | có: Xoá N ảnh? Việc này không hoàn tác được. | không: ảnh bị xoá khỏi kho | `/api/parties/anh-can-xoa/xoa` | `web/phieu-xoa.ts`: Xoá ảnh đã chọn<br>`web/phieu-xoa.ts`: Xoá ảnh | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Ẩn danh hoá máy cũ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ẩn danh hoá** | Máy đang đăng nhập › Ẩn danh hoá máy đã đăng xuất | Xoá địa chỉ mạng (IP) và thông tin máy của mọi lần đăng nhập đã kết thúc quá số ngày giữ trong chính sách riêng tư. Dòng đăng nhập vẫn còn nhưng mất IP và thông tin máy. Không đụng máy đang đăng nhập. | có: Ẩn danh hoá N máy đã đăng xuất? … không hoàn tác được. | không: không hoàn tác được | `/api/sessions/an-danh-cu` | `web/sessions.ts`: Ẩn danh hoá<br>`web/sessions.ts`: Xác nhận ẩn danh hoá | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Đăng xuất máy của người khác

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đăng xuất máy này · Đăng xuất mọi máy + đặt lại PIN** | Máy đang đăng nhập (bảng và thẻ) | Nút lẻ đăng xuất đúng MỘT máy của người đó, tắt thông báo của máy ấy và bỏ máy được tin của lần đăng nhập đó (lần sau hỏi mã). Nút kèm đặt lại PIN gọi tiếp việc đặt lại PIN: mọi máy bị đăng xuất, mất Face ID, tạo PIN mới hiện một lần. | có: Đăng xuất máy X của Y? Máy đó bị đăng xuất ngay. Người có PIN vẫn đăng nhập lại được. | một phần: người đó đăng nhập lại được bằng PIN; với đặt lại PIN thì PIN cũ và Face ID mất | `/api/sessions/:x/revoke`<br>`/api/staff/:x/reset-pin`<br>nhật ký `session_revoked` | `web/sessions.ts`: Xác nhận gỡ và đặt lại PIN / Xác nhận gỡ<br>`web/sessions.ts`: Đăng xuất máy này<br>`web/sessions.ts`: Đăng xuất mọi máy + đặt lại PIN | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Tắt bảo mật hai lớp của người khác

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Tắt bảo mật hai lớp** | Quản lý tài khoản (dòng và thẻ) › Tắt bảo mật hai lớp | Gỡ ứng dụng xác thực, email, mã dự phòng và mọi máy được tin của người đó, đăng xuất mọi máy. Nhân viên nội bộ có 24 giờ để đăng nhập bằng PIN và BẮT BUỘC bật lại; quá 24 giờ thì bị chặn. Tài khoản bên ngoài thì thật sự tắt. | có: hộp trong trang giải thích hậu quả và 24 giờ | một phần: người đó tự bật lại; không khôi phục được mã dự phòng cũ | `/api/staff/:x/mfa-reset`<br>nhật ký `mfa_reset` | `web/staff.ts`: Xác nhận tắt<br>`web/staff.ts`: Tắt bảo mật hai lớp | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Sửa tài khoản

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa → Lưu** | Quản lý tài khoản › Sửa | Lưu ba việc liên tiếp: đổi tên và số điện thoại đăng nhập, đổi vai trò, đổi quyền kiểu cũ (chỉ Toàn quyền). Đổi vai trò có thể làm người đó mất quyền ngay và có trường hợp bị đăng xuất. Lỗi ở bước vai trò thì tên và số đã lưu. | không | được: sửa lại | `/api/staff/:x/roles`<br>`/api/staff/:x`<br>`/api/staff/:x/permissions`<br>nhật ký `staff_updated`<br>nhật ký `staff_role_changed` | `web/staff.ts`: Sửa<br>`web/staff.ts`: Lưu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Đặt lại PIN của người khác

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đặt lại PIN** | Quản lý tài khoản (dòng và thẻ) | Sinh PIN mới 6 số hiện một lần cho Quản trị; PIN cũ mất, mọi Face ID bị gỡ, mọi máy đăng xuất, máy được tin bị thu hồi và khoá sai PIN được mở. Không có ở hàng của chính mình. | có: confirm() của trình duyệt | không: PIN cũ mất hẳn; người đó phải dùng PIN mới | `/api/staff/:x/reset-pin`<br>nhật ký `pin_reset` | `web/staff.ts`: Đặt lại PIN<br>`web/staff.ts`: Đặt lại PIN của ‹…›? PIN cũ, Face ID và mọi máy đang đăng nhập sẽ mất hiệu lực. | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Mở khoá đăng nhập

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Mở khoá** | Quản lý tài khoản (dòng và thẻ có nhãn «Bị khoá đăng nhập») | Xoá khoá tạm do gõ sai PIN hoặc sai mã bước hai quá nhiều lần. Không đổi PIN, không kích hoạt lại tài khoản bị Ngưng. | không | được: bị khoá lại nếu gõ sai | `/api/staff/:x/unlock`<br>nhật ký `login_unlocked` | `web/staff.ts`: Mở khoá | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Gỡ Face ID của người khác

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gỡ Face ID (N)** | Quản lý tài khoản (dòng và thẻ) | Gỡ mọi Face ID của người đó và đăng xuất mọi máy; PIN vẫn dùng được. Không hiện ở hàng của chính mình. | có: confirm() của trình duyệt | một phần: người đó bật lại Face ID sau khi đăng nhập bằng PIN | `/api/staff/:x/passkeys/remove-all`<br>nhật ký `passkey_removed` | `web/staff.ts`: Gỡ Face ID (‹…›)<br>`web/staff.ts`: Gỡ Face ID của ‹…› trên mọi máy? Mọi máy đang đăng nhập của tài khoản này sẽ bị đăng xuất. | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Ngưng / kích hoạt lại tài khoản

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Ngưng / Kích hoạt lại** | Quản lý tài khoản (dòng và thẻ) | Ngưng: tài khoản không đăng nhập được, mọi máy bị đăng xuất, mọi Face ID bị gỡ, mọi máy được tin ở bước hai lớp bị thu hồi. Kích hoạt lại chỉ mở tài khoản (nội bộ chưa có yếu tố được ân hạn 14 ngày); Face ID và máy được tin không tự trở lại. Không xoá tài khoản. | có (khi Ngưng): confirm() «Ngưng tài khoản ‹tên›? Họ sẽ bị đăng xuất ngay.»; Kích hoạt lại không hỏi | một phần: bằng Kích hoạt lại, nhưng Face ID đã gỡ phải bật lại | `/api/staff/:x`<br>nhật ký `staff_suspended`<br>nhật ký `staff_reactivated` | `web/staff.ts`: Ngưng / Kích hoạt lại<br>`web/staff.ts`: Ngưng tài khoản ‹…›? Họ sẽ bị đăng xuất ngay. | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Xác minh: xem số giấy tờ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Hiện số → Xem số (Ẩn số)** | Quản lý tài khoản › Hàng chờ xác minh › chi tiết phiếu giấy tờ | Hỏi máy chủ số giấy tờ đầy đủ của phiếu, ghi một dòng nhật ký rồi hiện tại chỗ. «Ẩn số» chỉ che lại ở trình duyệt; bấm Hiện số lần nữa lại hỏi và ghi nhật ký lại. | có: Mỗi lần xem được ghi vào nhật ký. Xem số? | không: dòng nhật ký xem đã ghi | `/api/parties/xac-minh/:x/xem-so`<br>nhật ký `self_submission_number_viewed` | `web/xac-minh-hang-cho.ts`: Xem số<br>`web/xac-minh-hang-cho.ts`: Hiện số<br>`web/xac-minh-hang-cho.ts`: Thôi | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Xác minh phiếu tự khai

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Chấp nhận** | Quản lý tài khoản › Hàng chờ xác minh › chi tiết phiếu | Ghi nguyên văn ngày sinh hoặc địa chỉ người dùng khai vào hồ sơ thật và đánh dấu đã xác minh. Phiếu giấy tờ hôm nay luôn không chấp nhận được, vì chưa có ảnh nào nối với phiếu: giao diện khoá nút và máy chủ cũng chặn, nên chỉ từ chối được. Người từng tạo hoặc chạm tài khoản của người gửi bị chặn xử lý. | có: Chấp nhận nguyên văn thông tin khai? | không: không có nút hoàn tác; sửa bằng cách khác ở Danh bạ | `/api/parties/xac-minh/:x/chap-nhan`<br>nhật ký `self_submission_accepted` | `web/xac-minh-hang-cho.ts`: Chấp nhận | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Từ chối → Gửi từ chối** | Quản lý tài khoản › Hàng chờ xác minh › chi tiết phiếu | Chọn lý do trong danh sách đóng; phiếu chuyển sang Từ chối, hồ sơ không đổi, người gửi thấy lý do trong Hồ sơ của tôi. Không gửi tin nhắn riêng. | có: chọn lý do | không: người gửi phải gửi phiếu mới | `/api/parties/xac-minh/:x/tu-choi`<br>nhật ký `self_submission_rejected` | `web/xac-minh-hang-cho.ts`: Từ chối<br>`web/xac-minh-hang-cho.ts`: Gửi từ chối | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Đồng bộ danh mục từ Google Sheet

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đồng bộ ngay từ Google Sheet** | Dịch vụ & giá (đầu trang) · hộp hỏi của trình duyệt khi Sheet làm ẩn nhiều dịch vụ | Đọc ngay Google Sheet (việc mà máy cũng tự làm mỗi 15 phút). Dịch vụ mới được thêm; dịch vụ đã có và không bị ghi đè giá thì lấy luôn giá, tên, đơn vị mới của Sheet; dịch vụ không còn trong Sheet thì bị đánh dấu «Không còn trong Sheet» và người lập đơn không thấy nữa. Giá đã ghi đè không bao giờ bị đè (ghi đè nằm ở bảng riêng); đơn đã lập giữ giá lúc lập. | không (chỉ có hộp hỏi của trình duyệt khi máy chủ báo sắp ẩn quá nhiều) | một phần: sửa lại Sheet rồi đồng bộ lần nữa thì giá và dịch vụ trở lại; không có nút hoàn tác từng lần đồng bộ. Nếu sắp ẩn hơn một nửa dịch vụ thì máy chủ dừng và hỏi lại (chưa ghi gì cho tới khi bấm đồng ý). | `/api/catalog/sync`<br>nhật ký `catalog_synced` | `public/catalog.html`: Đồng bộ ngay từ Google Sheet<br>`web/catalog.ts`: ‹…› Chỉ tiếp tục nếu bạn chắc chắn Sheet đúng. Vẫn đồng bộ và ẩn các dịch vụ đó? | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Ghi đè giá dịch vụ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa giá** | Dịch vụ & giá › mỗi dòng dịch vụ (bảng và thẻ điện thoại) › hộp «Sửa giá: <mã> — <tên>» | Mở hộp nhập giá bốn loại khách. Lưu ghi đè chỉ ghi giá riêng của Nền tảng cho loại nào đã đổi; để trống hoặc nhập đúng giá Sheet thì bỏ ghi đè loại đó. Không ghi ngược vào Google Sheet; giá mới áp cho đơn lập từ bây giờ, đơn cũ giữ giá cũ. | không | được: nhập lại giá Sheet hoặc để trống ô đó, hoặc nút Bỏ ghi đè giá | `/api/catalog/:x`<br>nhật ký `catalog_overridden`<br>nhật ký `catalog_override_cleared` | `web/catalog.ts`: Sửa giá<br>`web/catalog.ts`: Lưu ghi đè | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Giữ ghi đè** | Dịch vụ & giá › dòng dịch vụ có cảnh báo «Sheet đã đổi giá kể từ khi ghi đè» | Xác nhận đã xem việc Sheet đổi giá và vẫn giữ giá ghi đè. Cảnh báo tắt, giá đang bán không đổi. Nút chỉ hiện khi dịch vụ đang có cảnh báo. | không | được: sửa lại giá bằng Sửa giá hoặc Bỏ ghi đè giá (cảnh báo sẽ chỉ hiện lại nếu Sheet đổi giá lần nữa) | `/api/catalog/:x/ack`<br>nhật ký `catalog_overridden` | `web/catalog.ts`: Giữ ghi đè | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Bỏ ghi đè giá** | Dịch vụ & giá › dòng dịch vụ đang có giá ghi đè (bảng và thẻ) › hộp hỏi của trình duyệt | Đưa giá của dịch vụ về giá theo Sheet. Dịch vụ đang ngừng bán thì vẫn ngừng bán, không tự mở bán lại (ADR-0166 câu 2 đổi cách chạy so với lúc rà soát). | có: hộp hỏi «Bỏ giá ghi đè của <mã>, quay về giá theo Sheet?», thêm câu «Dịch vụ này đang ngừng bán và vẫn ngừng bán.» khi dịch vụ đang ngừng bán | một phần: ghi đè giá lại bằng Sửa giá; không có nút hoàn tác. Nhật ký ghi «bỏ ghi đè giá» | `/api/catalog/:x/override`<br>nhật ký `catalog_override_cleared` | `web/catalog.ts`: Bỏ ghi đè giá<br>`web/catalog.ts`: ⟪CAU_HOI_BO_GHI_DE_GIA(it.code, it.hidden)⟫ | đã chốt (ADR-0166 câu 2) |
| **Ngừng bán / Mở bán lại** | Dịch vụ & giá › cuối mỗi dòng dịch vụ (bảng và thẻ) | Ngừng bán: người lập đơn không thấy dịch vụ này khi chọn dịch vụ nữa (đơn đã lập giữ nguyên). Mở bán lại: gỡ dấu ngừng bán. Bấm là lưu ngay, không hỏi. | không | được: bằng nút Mở bán lại | `/api/catalog/:x`<br>nhật ký `catalog_hidden`<br>nhật ký `catalog_unhidden` | `web/catalog.ts`: Mở bán lại / Ngừng bán | đã chốt (ADR-0166 câu 12) |

### Tạo đơn: dòng tiền

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Sửa giá (trong thẻ dịch vụ của đơn)** | Tạo đơn, Sửa đơn nháp › thẻ từng dịch vụ › nút «Sửa giá» (Đối tác và Thực tập không thấy nút này) | Mở khối gập có ô đơn giá từng loại khách của dịch vụ này trong đơn đang lập. Bấm nút chưa ghi gì; giá chỉ vào đơn khi lưu đơn. Khác việc với nút «Sửa giá» ở Dịch vụ & giá (ghi đè giá danh mục cho mọi đơn lập sau). | không (chỉ mở khối) | không áp dụng khi chỉ mở khối; chưa kiểm cách sửa lại giá đã lưu trong đơn | (chưa nối) | `web/service-card.ts`: Sửa giá | chờ chọn (tên trùng «Sửa giá» ở Dịch vụ & giá nhưng khác việc, chờ chủ chọn tên (2026-11-04)) |

### Đưa đón của dịch vụ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đưa đón** | Dịch vụ & giá › dòng dịch vụ › khung «Đưa đón: <mã> — <tên>» (máy tính) hoặc bảng trượt (điện thoại) | Khung gồm hai cài đặt khác nhau. «Được đón không» quyết định dịch vụ có được ghi đưa đón hay không và LƯU NGAY khi chọn. «Khi lập đơn có dịch vụ này» chỉ là mẫu GỢI Ý điền sẵn khi lập đơn (một chiều, hai chiều, giờ về, nơi trả), chỉ lưu khi bấm Lưu bản mới, không chặn ai ghi đưa đón. | không | được: chọn lại, lưu bản mới (có bảng lịch sử các bản); chỉ áp cho đơn lập từ bây giờ | `/api/van-chuyen/mau-chang/:x`<br>nhật ký `transfer_template_set`<br>nhật ký `catalog_service_transfer_set` | `web/catalog.ts`: Đưa đón<br>`web/catalog.ts`: Lưu bản mới | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Nhóm dịch vụ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Chuyển N dịch vụ · Đổi nhóm** | Dịch vụ & giá › thanh chọn nhiều dịch vụ (nút «Chuyển N dịch vụ») · hộp sửa giá › phần Nhóm dịch vụ (nút «Đổi nhóm») | Đổi nhóm của một hay nhiều dịch vụ (tối đa số dịch vụ mỗi lần ghi ở màn hình). Nhóm quyết định luật bán theo vai trò, đặc điểm thừa hưởng và việc có đưa đón. Nếu việc đổi làm một vai trò thôi hoặc bắt đầu bị chặn thì hộp hỏi hiện câu cảnh báo trước khi ghi. | có: hộp «Vẫn chuyển / Không chuyển» khi có hệ quả; không hệ quả thì không hỏi | được: chuyển về nhóm cũ (mỗi dịch vụ có lịch sử nhóm) | `/api/catalog/group-assignments`<br>nhật ký `catalog_group_assigned` | `web/catalog.ts`: Tối đa ‹…› dịch vụ một lần / Chuyển ‹…› dịch vụ<br>`web/catalog.ts`: Vẫn chuyển<br>`web/catalog.ts`: Đổi nhóm | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Thêm nhóm** | Dịch vụ & giá › khối «Nhóm dịch vụ» | Tạo một nhóm dịch vụ mới đứng cuối danh sách. Nhóm không xoá được; muốn bỏ thì chuyển hết dịch vụ ra rồi Tắt nhóm (máy chủ chặn tắt khi nhóm còn dịch vụ). | không | một phần: không xoá được, chỉ Tắt khi nhóm trống | `/api/catalog/groups`<br>nhật ký `catalog_group_created` | `web/catalog.ts`: Thêm nhóm | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Giao diện công ty

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Áp dụng cho mọi người** | Giao diện (đáy trang) › hộp xác nhận ngay trên trang | Lưu bản màu, phông, cỡ chữ đang chỉnh làm giao diện chung của cả công ty; mọi tài khoản thấy ở lần mở trang kế tiếp. Chỉnh thử chỉ hiện trên máy này cho tới khi bấm nút này. | có: Áp dụng giao diện này cho mọi người? | được: chỉnh lại rồi Áp dụng, hoặc Về mặc định toàn bộ rồi Áp dụng | `/api/giao-dien`<br>nhật ký `giao_dien_changed` | `public/giao-dien.html`: Áp dụng cho mọi người<br>`web/giao-dien.ts`: Áp dụng | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Gửi thông báo

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gửi thông báo** | Gửi thông báo › khung «Soạn tin» | Gửi ngay tin vừa soạn tới «Toàn công ty» (nhân viên nội bộ, không gồm Đối tác và Tài xế đối tác) hoặc tới các nhóm quyền đã tick (nhóm có cả Đối tác và Tài xế đối tác nếu tick). Tin vào hộp thông báo của người nhận; máy nào đã bật thông báo đẩy thì hiện cả trên màn hình khoá. Tin «Quan trọng» còn hiện dải nhắc tới khi bấm Đã hiểu. | không | một phần: nút Thu hồi gỡ tin khỏi hộp thông báo và dải nhắc; thông báo đẩy đã tới màn hình khoá thì không rút lại được | `/api/thong-bao`<br>nhật ký `notice_sent` | `web/gui-thong-bao.ts`: [biểu tượng megaphone] / Gửi thông báo | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Thu hồi** | Gửi thông báo › mục «Đã gửi» › mỗi tin: nút Thu hồi mở khung hỏi, trong khung có nút Thu hồi để xác nhận | Đặt tin thành «Đã thu hồi»: tin biến khỏi hộp thông báo và dải nhắc của mọi người nhận. Việc này không gỡ được thông báo đẩy đã hiện trên màn hình khoá của máy đã nhận, và không có cách khôi phục tin. | có: Thu hồi tin này? … Không hoàn tác được. | không: câu hỏi nói rõ «Không hoàn tác được»; thông báo đẩy đã gửi cũng không rút lại được | `/api/thong-bao/:x/thu-hoi`<br>nhật ký `notice_revoked` | `web/gui-thong-bao.ts`: Thu hồi | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Địa điểm

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm** | Địa điểm › khung «Thêm địa điểm» | Thêm một địa điểm mới (mã, tên, loại, địa chỉ, thứ tự) vào danh mục dùng cho nơi đón, nơi trả, nơi làm. Mã không đổi được sau khi tạo. | không | một phần: không xoá được, chỉ Ngưng dùng bằng nút Sửa | `/api/locations`<br>nhật ký `location_created` | `public/locations.html`: Thêm | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Sửa** | Địa điểm › mỗi dòng (bảng và thẻ) › khung «Sửa: <mã>» | Sửa tên, loại, địa chỉ, thứ tự, số «Chọn nhanh» (hiện thành nút bấm ở form Tạo đơn) và công tắc «Đang dùng» (bỏ tick = ngưng dùng). Có khoá chống ghi đè khi hai người cùng sửa. | không | được: sửa lại; tick lại «Đang dùng» để dùng lại | `/api/locations/:x`<br>nhật ký `location_updated` | `web/locations.ts`: Sửa<br>`web/locations.ts`: Lưu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Hồ sơ Danh bạ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Tạo hồ sơ** | Danh bạ › + Hồ sơ mới › khung «Hồ sơ mới» | Tạo hồ sơ cá nhân hoặc tổ chức, kèm điện thoại và email nếu nhập. Khi gõ số điện thoại, máy báo các hồ sơ đã dùng số đó nhưng vẫn cho tạo (cùng một số có thể thuộc nhiều hồ sơ). | không (có cảnh báo trùng số điện thoại) | một phần: hồ sơ không xoá được; sửa được, ngưng dùng được, hồ sơ cá nhân trùng thì Gộp | `/api/parties`<br>nhật ký `party_created` | `web/parties.ts`: Tạo hồ sơ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Lưu thông tin** | Danh bạ › chi tiết hồ sơ › khối thông tin | Lưu tên, giới tính (người), tên pháp lý, mã số thuế, địa chỉ, email hoá đơn (tổ chức) và công tắc «Đang dùng». Hồ sơ có tài khoản chỉ Quản trị trở lên sửa; hồ sơ công ty chủ chỉ Toàn quyền sửa. Nếu người khác vừa sửa thì máy nạp lại và nhắc sửa lại. | không | được: sửa lại | `/api/parties/:x`<br>nhật ký `party_updated` | `web/parties.ts`: Lưu thông tin | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Thêm liên hệ** | Danh bạ › chi tiết hồ sơ › mục «Liên hệ» | Thêm một số điện thoại hoặc email cho hồ sơ. Nếu hồ sơ chưa có liên hệ chính cùng loại thì liên hệ này tự thành liên hệ chính. | không | được: bằng nút Đóng ở dòng liên hệ (kết thúc từ hôm nay) | `/api/parties/:x/contacts`<br>nhật ký `party_contact_changed` | `web/parties.ts`: Thêm liên hệ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Ngừng dùng** | Danh bạ › chi tiết hồ sơ › mục «Liên hệ» › cuối mỗi dòng liên hệ đang dùng | Kết thúc dòng liên hệ này từ hôm nay: số hay email đó không còn là liên hệ đang dùng của hồ sơ (dòng còn nằm làm lịch sử, mờ đi). Tìm hồ sơ theo số đó và cảnh báo trùng số cũng không còn tính nó. Bấm là ghi ngay, không hỏi. Hồ sơ có tài khoản thì chỉ Quản trị, Toàn quyền đóng được; hồ sơ công ty chủ thì chỉ Toàn quyền. | không | một phần: thêm lại bằng Thêm liên hệ (thành dòng mới, ngày bắt đầu mới); không mở lại dòng cũ | `/api/parties/:x/contacts/:x/end`<br>nhật ký `party_contact_changed` | `web/parties.ts`: Ngừng dùng | đã chốt (ADR-0166 câu 9) |

### Vai trò hồ sơ · công ty chủ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm công việc** | Danh bạ › chi tiết hồ sơ › mục «Công việc tại đâu» · hộp hỏi của trình duyệt khi chọn «Công ty chủ» | Gán thêm một công việc (vai trò) theo nơi cho hồ sơ. Nếu chọn «Công ty chủ» (chỉ Toàn quyền thấy, chỉ hồ sơ tổ chức) thì cùng nút đó ĐỔI công ty chủ của cả Nền tảng: tên, mã số thuế, địa chỉ, Hotline in trên đăng nhập và biên nhận, và tài khoản nhận tiền của mã QR chuyển sang hồ sơ mới; công ty chủ cũ thôi giữ vai trò ngay hôm nay. Hồ sơ mới thiếu tên pháp lý, mã số thuế, địa chỉ hoặc Hotline thì máy chủ chặn. | có (chỉ khi chọn Công ty chủ): Đặt hồ sơ này làm công ty chủ? … | một phần: đổi lại bằng cách gán công ty chủ cho hồ sơ cũ, nhưng máy chủ chặn đổi lại trong cùng ngày (owner_company_same_day); công việc thường thì Kết thúc | `/api/parties/:x/roles`<br>nhật ký `party_role_added` | `web/parties.ts`: Thêm công việc<br>`web/parties.ts`: Đặt hồ sơ này làm công ty chủ? Trang đăng nhập và biên nhận sẽ dùng thông tin của hồ sơ này từ hôm nay (tên, mã số thuế, địa chỉ, liên hệ ghi chú “Hotline”, email). Công ty chủ hiện tại sẽ thôi giữ công việc này. Sau khi đổi, kiểm lại mục “Tài khoản nhận tiền” của hồ sơ mới — chưa cài thì mã QR thanh toán báo lỗi. | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Kết thúc** | Danh bạ › chi tiết hồ sơ › mục «Công việc tại đâu» › cuối mỗi dòng đang hiệu lực | Kết thúc dòng công việc này từ hôm nay (ngày bắt đầu và kết thúc nằm lại làm lịch sử). Với vai trò đối tác (ghi «(đối tác)») thì hồ sơ thôi mang vai trò đó, tức thôi được tính hoa hồng theo vai trò này cho các đơn xác nhận từ sau. Bấm là ghi ngay, không hỏi. Tài khoản đăng nhập thì không có nút này mà hiện chữ «Đổi ở màn Quản lý tài khoản». | không | một phần: gán lại bằng Thêm công việc (thành dòng mới); không mở lại dòng cũ | `/api/parties/:x/roles/:x/end`<br>nhật ký `party_role_ended` | `web/parties.ts`: Kết thúc | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Quan hệ hồ sơ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm người liên hệ / Thêm quan hệ tài xế / Thêm tài xế** | Danh bạ › chi tiết hồ sơ › mục «Người liên hệ, tài xế» | Nối hồ sơ đang mở với hồ sơ khác theo quan hệ đã chọn (người liên hệ của một công ty, hoặc tài xế của một nhà xe đối tác). Chữ nút đổi theo ô «Loại». Quan hệ «Tài xế của» chỉ nối từ hồ sơ cá nhân tới hồ sơ đang là nhà xe đối tác. | không | được: bằng nút Kết thúc ở dòng quan hệ | `/api/parties/:x/relationships`<br>nhật ký `party_relationship_changed` | `web/parties.ts`: ⟪loaiQuanHe().nut⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Kết thúc** | Danh bạ › chi tiết hồ sơ › mục «Người liên hệ, tài xế» › cuối mỗi dòng quan hệ | Kết thúc quan hệ này từ hôm nay (ví dụ người đó thôi là tài xế của nhà xe). Dòng còn nằm làm lịch sử. Bấm là ghi ngay. | không | một phần: thêm lại thành quan hệ mới | `/api/parties/:x/relationships/:x/end`<br>nhật ký `party_relationship_changed` | `web/parties.ts`: Kết thúc | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Gộp hồ sơ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gộp vào hồ sơ khác… · Gộp…** | Danh bạ › chi tiết hồ sơ cá nhân (nút «Gộp vào hồ sơ khác…») · Hồ sơ nghi trùng (nút «Gộp…» mỗi cặp) › khung «Gộp “<tên>” vào hồ sơ khác» | Chọn hồ sơ chính rồi xem trước ba cột (chuyển sang hồ sơ chính / giữ ở hồ sơ này / bỏ vì đã có). Bấm Gộp: hồ sơ phụ ẩn khỏi Danh bạ; liên hệ, công việc, quan hệ, giấy tờ còn hiệu lực và đơn chưa giao chuyển sang hồ sơ chính. Đơn đã giao, đã huỷ và dòng công nợ ở lại hồ sơ phụ nên lịch sử một người có thể nằm ở hai hồ sơ. | có hộp nhập: gõ lại tên hồ sơ phụ; khung ghi «Không tách lại được.» | không: không có nút tách lại (ADR-0068 chọn một chiều, cơ sở dữ liệu cấm mở lại hồ sơ đã gộp); gộp nhầm thì chỉ sửa tay bằng cách thêm lại liên hệ, công việc ở hồ sơ cần | `/api/parties/:x/merge`<br>nhật ký `party_merged` | `web/parties.ts`: Gộp vào hồ sơ khác…<br>`web/parties.ts`: Gộp<br>`web/parties.ts`: Gộp… | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Giấy tờ của người

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm giấy tờ** | Danh bạ › hồ sơ cá nhân › mục «Giấy tờ» | Ghi thêm một giấy tờ (căn cước, bằng lái…) với số, ngày cấp, nơi cấp, ngày hết hạn. Số luôn bị che khi xem. | không | một phần: sửa bằng Sửa sai (kèm lý do); không xoá cứng | `/api/parties/:x/documents`<br>nhật ký `party_document_added` | `web/parties.ts`: Thêm giấy tờ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Gia hạn** | Danh bạ › hồ sơ cá nhân › mục «Giấy tờ» › dòng giấy tờ có hạn | Ghi giấy mới được cấp thay cho giấy sắp hết hạn: thêm một dòng mới, dòng hiện tại giữ làm lịch sử (nhãn «Đã thay»). | không | một phần: sửa dòng mới bằng Sửa sai | `/api/parties/:x/documents/:x/renew`<br>nhật ký `party_document_renewed` | `web/parties.ts`: Gia hạn | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Sửa sai** | Danh bạ › hồ sơ cá nhân › mục «Giấy tờ» › mỗi dòng giấy tờ | Sửa một lỗi nhập trên dòng hiện tại, chọn một trong các lý do (sai số, sai ngày cấp, sai ngày hết hạn, sai nơi cấp, sai hạng, hoặc «Nhập nhầm cả dòng (huỷ dòng này)»). Mỗi lý do chỉ sửa đúng một trường. Lý do cuối huỷ cả dòng (không xoá hẳn), kèm lý do trong nhật ký. | có hộp nhập (lý do bắt buộc, khung ghi rõ «ghi đè dòng hiện tại và được ghi nhật ký kèm lý do») | một phần: sửa lại lần nữa; dòng bị huỷ không mở lại, nhập lại dòng mới | `/api/parties/:x/documents/:x/correct`<br>nhật ký `party_document_corrected` | `web/parties.ts`: Sửa sai | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Xem đủ số** | Danh bạ › hồ sơ cá nhân › mục «Giấy tờ» › cạnh số giấy tờ · hộp «Xem đủ số?» | Hiện số đầy đủ của giấy tờ trong vài chục giây rồi tự che lại; nhật ký ghi ai xem số nào (nhưng không ghi số). | có: Mỗi lần xem đều được ghi nhật ký. Xem đủ số? | không đáng kể: số hiện tạm rồi tự che; lần xem đã ghi nhật ký | `/api/parties/:x/documents/:x/reveal`<br>nhật ký `party_document_number_viewed` | `web/parties.ts`: Xem đủ số | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Cấp riêng cho đối tác

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Chọn cấp riêng cho đối tác** | Danh bạ › chi tiết hồ sơ đại lý › mục «Hoa hồng hiện hành» (nút «Chọn cấp riêng cho đối tác» mở ô, ô có nút «Lưu») | Gán riêng một cấp độ đại lý cho đại lý này từ ngày chọn: đơn của đại lý tính hoa hồng theo cấp đó thay cho cấp theo vai trò. Đơn đã xác nhận không đổi. Mức riêng đặt lẻ vẫn thắng cấp riêng. | không (khung ghi rõ «Đơn đã xác nhận không đổi») | được: bằng nút Thôi theo cấp này hoặc Sửa | `/api/pricing/ho-so/:x/muc-rieng`<br>nhật ký `prc_party_tier_set` | `web/parties.ts`: Lưu<br>`web/parties.ts`: Chọn cấp riêng cho đối tác | đã chốt (ADR-0166 câu 1) |
| **Thôi theo cấp này** | Danh bạ › chi tiết hồ sơ đại lý › mục «Hoa hồng hiện hành» (nút mở ô ngày, ô có nút cùng tên) | Ngừng cấp riêng từ ngày chọn (mặc định hôm nay, tính đến hết ngày đó): sau ngày cuối đại lý về cấp độ đại lý theo vai trò. Đơn đã xác nhận không đổi. | có ô nhập ngày (hai bước: mở ô rồi bấm lại) | một phần: áp dụng lại cấp riêng mới bằng Chọn cấp riêng cho đối tác (dòng mới) | `/api/pricing/muc-rieng/:x/ket-thuc`<br>nhật ký `prc_party_tier_closed` | `web/parties.ts`: Thôi theo cấp này | đã chốt (rà soát 2026-11-04: tên đúng; «Thôi theo cấp này» và «Ngừng áp dụng» (chủ 2026-10-25 lượt 3, 2026-10-30 lượt 7)) |
| **Sửa** | Danh bạ › chi tiết hồ sơ đại lý › mục «Hoa hồng hiện hành» (nút «Sửa» cạnh cấp đang áp hoặc sắp áp, ô có nút «Lưu sửa») | Sửa cấp riêng của đại lý. Máy chủ chọn đường: nếu chưa tính cho đơn nào thì huỷ dòng cũ và thay bằng dòng sửa; nếu đã tính thì chỉ cho đổi từ ngày sớm nhất được phép. Bắt buộc ghi lý do. | có hộp nhập: Lý do sửa (bắt buộc) | được: sửa lần nữa; mọi dòng cũ còn trong lịch sử | `/api/pricing/muc-ta`<br>`/api/pricing/muc-rieng/:x/sua`<br>nhật ký `prc_party_tier_voided`<br>nhật ký `prc_party_tier_closed`<br>nhật ký `prc_party_tier_set` | `web/parties.ts`: Lưu sửa<br>`web/parties.ts`: Sửa | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Công ty chủ · tài khoản ngân hàng

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu tài khoản (lần đầu) / Đổi tài khoản (đã có)** | Danh bạ › hồ sơ đang là công ty chủ › mục «Tài khoản nhận tiền» | Đặt tài khoản ngân hàng mà mã QR thanh toán của biên nhận chuyển tiền tới. Đổi thì đóng dòng cũ và mở dòng mới trong một lần. Từ lúc đó mọi mã QR mới của khách trỏ về tài khoản mới. | có (chỉ khi đổi): Đổi tài khoản nhận tiền? … | một phần: nhập lại tài khoản cũ; nhưng số tài khoản cũ không còn hiện ở đâu trên Nền tảng | `/api/parties/:x/tai-khoan-nhan-tien`<br>nhật ký `party_bank_account_changed` | `web/parties.ts`: Đổi tài khoản / Lưu tài khoản<br>`web/parties.ts`: Đổi tài khoản nhận tiền? Từ lúc này mã QR mới sẽ chuyển tiền về tài khoản mới; tài khoản cũ được lưu lại trong lịch sử. | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Vé hỗ trợ: gửi yêu cầu

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **＋ Gửi yêu cầu** | Hỗ trợ › đầu trang (thẻ Yêu cầu của tôi / Việc của nhóm) | Chỉ mở hộp «Gửi yêu cầu» để điền nhóm nhận, loại, tiêu đề, mô tả. Chưa ghi gì cho tới khi bấm «Gửi» trong hộp. Cũng là nút «Gửi yêu cầu» ở trang Hướng dẫn (mở hộp này với chữ điền sẵn). | không | không áp dụng (chỉ mở hộp) | (chưa nối) | `public/feedback.html`: Gửi yêu cầu<br>`web/huong-dan.ts`: Gửi yêu cầu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Gửi** | Hộp «Gửi yêu cầu» (Hỗ trợ; cũng mở được từ trang Hướng dẫn và từ nút Báo lỗi các trang) | Tạo một yêu cầu gửi tới nhóm đã chọn (Kỹ thuật nếu không chọn; Đối tác và Tài xế đối tác chỉ gửi được Kỹ thuật), kèm tệp nếu có, đơn liên quan nếu chọn, và tự đính kèm trang đang xem, loại thiết bị, số bản. Máy chủ gửi thêm MỘT email tới một địa chỉ chung đã cài sẵn cho người phụ trách (không gửi riêng cho từng thành viên nhóm); nhóm nhạy cảm thì email chỉ có mã, không có tiêu đề hay nội dung. Gửi lại khi mạng yếu không tạo trùng. | không | không: người gửi không xoá hay rút lại được yêu cầu; nhóm xử lý có thể đóng bằng «→ Đã xong» hoặc «Từ chối» | `/api/feedback`<br>nhật ký `feedback_created` | `web/ho-tro-gui.ts`: Gửi<br>`web/ho-tro-gui.ts`: Huỷ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Vé hỗ trợ: xử lý của nhóm

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **→ Đã tiếp nhận · → Đang xử lý · → Đã xong · → Từ chối (mở hộp lý do) · Mở lại (từ Đã xong / Từ chối)** | Hỗ trợ › luồng một yêu cầu › chip trạng thái › hộp «Đổi trạng thái» | Đổi trạng thái của yêu cầu theo bảng bước cho phép (Mới→Đã tiếp nhận; Đã tiếp nhận→Đang xử lý/Đã xong/Từ chối; Đang xử lý→Đã xong/Từ chối; Đã xong hoặc Từ chối→Mở lại thành Đã tiếp nhận). Người gửi thấy nhãn trạng thái mới và chấm đỏ «mới» ở danh sách của họ; KHÔNG có tin chữ, email hay thông báo đẩy nào gửi cho người gửi (riêng «→ Từ chối» bắt buộc kèm lý do công khai, xem hàng «Từ chối»). Chỉ thành viên nhóm đang giữ yêu cầu hoặc Toàn quyền làm được; người gửi không có nút này. | không | được: bằng «Mở lại» (từ Đã xong / Từ chối), hoặc khi người gửi trả lời thì yêu cầu tự mở lại | `/api/feedback/:x/xu-ly`<br>nhật ký `feedback_status_changed` | `web/ho-tro-luong.ts`: ⟪nhanNutChuyen(t.status, to)⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Thường · Cao · Khẩn** | Hỗ trợ › luồng một yêu cầu › chip «Ưu tiên» › hộp «Mức ưu tiên» | Đổi mức ưu tiên của yêu cầu. Người gửi thấy mức này trong phần Chi tiết nhưng không có chấm đỏ vì đổi mức không tính là phản hồi. | không | được: bấm lại mức cũ | `/api/feedback/:x/xu-ly`<br>nhật ký `feedback_priority_changed` | `web/ho-tro-luong.ts`: ⟪PRIORITY_NAME[p]⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Nhận việc cho tôi** | Hỗ trợ › luồng một yêu cầu › chip «Người xử lý» › hộp «Người xử lý»; cũng nút nhận việc ở dòng của thẻ Việc của nhóm | Gán bạn làm người xử lý khi chưa ai giữ; nếu yêu cầu đang Mới thì tự đổi sang Đã tiếp nhận và người gửi thấy chấm đỏ. Hai người bấm cùng lúc thì chỉ một người được, người kia thấy «Vừa có người nhận việc này, hoặc yêu cầu đã đóng.» | không | một phần: người giữ không tự bỏ được; Trưởng nhóm hoặc Toàn quyền giao lại bằng «Giao» | `/api/feedback/:x/claim`<br>nhật ký `feedback_claimed` | `web/ho-tro-luong.ts`: Nhận việc cho tôi | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Giao** | Hỗ trợ › luồng một yêu cầu › hộp «Người xử lý» › ô «Giao cho người khác» | Đổi người xử lý thành người được chọn trong danh sách thành viên nhóm (đè lên người đang giữ). Người được giao KHÔNG nhận tin hay email nào; họ chỉ thấy khi mở Việc của nhóm. Trưởng nhóm và Toàn quyền mới có ô này; thành viên thường chỉ có «Nhận việc cho tôi». | không | được: giao lại cho người khác | `/api/feedback/:x/xu-ly`<br>nhật ký `feedback_assigned` | `web/ho-tro-luong.ts`: Giao | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Chuyển** | Hỗ trợ › luồng một yêu cầu › chip «Nhóm: <tên>» › hộp «Chuyển nhóm» | Đưa yêu cầu sang nhóm khác: bỏ người xử lý đang giữ, đổi «Đang xử lý» về «Đã tiếp nhận», giữ nguyên mức ưu tiên cũ. Lý do bạn gõ thành ghi chú nội bộ cho nhóm mới (người gửi không thấy). Người chuyển thường mất quyền xem yêu cầu ngay. Yêu cầu đã đóng thì không chuyển được. | có hộp nhập (lý do bắt buộc 1–300 ký tự) | một phần: nhóm mới chuyển ngược lại được; người chuyển nếu không còn thuộc nhóm mới thì không tự đưa về | `/api/feedback/:x/transfer`<br>nhật ký `feedback_team_changed` | `web/ho-tro-luong.ts`: Chuyển | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **→ Từ chối** | Hỗ trợ › luồng một yêu cầu › hộp «Đổi trạng thái» › «→ Từ chối» › hộp «Từ chối yêu cầu» | Làm HAI việc liên tiếp: đăng lý do thành một tin công khai (người gửi đọc được) rồi đổi trạng thái sang «Từ chối». Nếu bước hai hỏng thì lý do đã đăng rồi, và bấm lại sẽ không đăng lại. Người gửi thấy tin lý do và chấm đỏ; không email hay thông báo đẩy. | có hộp nhập (lý do bắt buộc) | một phần: «Mở lại» đưa yêu cầu về Đã tiếp nhận, nhưng tin lý do công khai đã đăng thì còn mãi | `/api/feedback/:x/messages`<br>`/api/feedback/:x/xu-ly`<br>nhật ký `feedback_replied`<br>nhật ký `feedback_status_changed` | `web/ho-tro-luong.ts`: Từ chối | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Vé hỗ trợ: trả lời

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gửi** | Hỗ trợ › luồng một yêu cầu › ô trả lời dính đáy (hai chế độ «Trả lời người gửi» / «Ghi chú nội bộ») | Đăng tin vào luồng, kèm tệp nếu có. Chế độ mặc định là «Trả lời người gửi» (người gửi đọc được, hiện chấm đỏ cho họ); chọn «Ghi chú nội bộ» thì người gửi không thấy. Người gửi bấm «Gửi» trên yêu cầu đã Xong/Từ chối thì yêu cầu tự mở lại (dòng «Gửi sẽ mở lại yêu cầu này» hiện trước khi bấm) và máy chủ gửi MỘT email báo cho địa chỉ chung của người phụ trách. Nhóm xử lý trả lời thì người gửi chỉ có chấm đỏ, không email, không thông báo đẩy. | không | không: không sửa hay xoá được tin đã gửi | `/api/feedback/:x/messages`<br>nhật ký `feedback_replied` | `web/ho-tro-luong.ts`: Gửi<br>`web/ho-tro-luong.ts`: Trả lời người gửi<br>`web/ho-tro-luong.ts`: Ghi chú nội bộ | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Vé hỗ trợ: tệp kèm

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gỡ tệp** | Hỗ trợ › luồng một yêu cầu › dưới mỗi tệp đã lưu (chỉ Toàn quyền) › hộp «Gỡ tệp» | Xoá hẳn tệp (ảnh hoặc PDF) khỏi kho lưu trữ; tin vẫn giữ lại với dòng «Tệp đã được gỡ». Không khôi phục được. Máy chủ ghi nhật ký (chỉ mã, không nội dung) rồi mới xoá kho; nếu xoá kho lỗi, tệp nằm trong danh sách chờ xoá để chạy lại. | có: «<tên tệp> sẽ bị xoá khỏi kho, không khôi phục được. Tin vẫn còn dòng «Tệp đã được gỡ».» | không: tệp mất hẳn; chỉ người gửi tải lên lại | `/api/feedback/:x/tep/:x/go`<br>nhật ký `feedback_attachment_purged` | `web/ho-tro-luong.ts`: Gỡ tệp<br>`web/ho-tro-tep.ts`: Gỡ tệp | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Vé hỗ trợ: nhóm hỗ trợ

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **＋ Thêm nhóm** | Hỗ trợ › thẻ «Nhóm hỗ trợ» (Toàn quyền) › hộp «Thêm nhóm» | Tạo một nhóm hỗ trợ mới (tên và mô tả; mã máy tự sinh từ tên). Nhóm mới chưa có thành viên: yêu cầu gửi vào đó chỉ Toàn quyền xử lý được cho tới khi thêm người. Nhóm mới hiện ngay trong ô «Gửi tới nhóm» của mọi người (trừ Đối tác, chỉ gửi Kỹ thuật). | có hộp nhập | một phần: ngưng được bằng «Ngưng nhóm», không xoá được | `/api/feedback/admin/teams`<br>nhật ký `feedback_team_created` | `web/ho-tro-nhom.ts`: Thêm nhóm<br>`web/ho-tro-nhom.ts`: Huỷ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Sửa** | Hỗ trợ › thẻ «Nhóm hỗ trợ» (Toàn quyền) › nút «Sửa» mỗi nhóm › hộp «Sửa nhóm» | Mở hộp sửa tên, mô tả, công tắc «Nhạy cảm», thành viên. Nút «Lưu» chỉ lưu tên, mô tả và công tắc Nhạy cảm. Các thao tác thành viên trong hộp (Đổi thành…, Gỡ, Thêm) lưu NGAY khi bấm, không chờ «Lưu». Công tắc «Nhạy cảm» ở bảng bên ngoài cũng lưu ngay, còn ở trong hộp thì phải bấm «Lưu». Nhạy cảm bật thì email và nhật ký chỉ ghi mã yêu cầu, không ghi tiêu đề. | không | được: sửa lại; thêm/gỡ thành viên hoàn tác bằng nút ngược | `/api/feedback/admin/teams/:x`<br>`/api/feedback/admin/teams/:x/members/:x`<br>nhật ký `feedback_team_updated`<br>nhật ký `feedback_team_member_changed` | `web/ho-tro-nhom.ts`: Sửa<br>`web/ho-tro-nhom.ts`: Lưu<br>`web/ho-tro-nhom.ts`: Đóng | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Ngưng nhóm** | Hỗ trợ › thẻ «Nhóm hỗ trợ» › hộp «Sửa nhóm» (không hiện ở nhóm Kỹ thuật) | Ngưng nhóm: không ai gửi hoặc chuyển yêu cầu mới tới nhóm này nữa. Yêu cầu đang có và thành viên vẫn giữ nguyên, nhóm hiện ở dòng «Nhóm đã ngưng» và bật lại bằng «Dùng lại». Nhóm Kỹ thuật không ngưng được. | có: bấm lần hai («Bấm lại để ngưng nhóm») | được: bằng nút «Dùng lại» | `/api/feedback/admin/teams/:x`<br>nhật ký `feedback_team_updated` | `web/ho-tro-nhom.ts`: Ngưng nhóm | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Nhóm hỗ trợ: công tắc và dùng lại nhóm

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Công tắc «Nhạy cảm» · Dùng lại** | Hỗ trợ › thẻ Nhóm hỗ trợ › dòng từng nhóm | Công tắc «Nhạy cảm»: gạt là lưu ngay; nhóm nhạy cảm thì email báo chung và nhật ký chỉ ghi mã yêu cầu, không ghi tiêu đề. «Dùng lại»: mở lại nhóm đã ngưng. Máy chủ chỉ cho Toàn quyền. | không | được: gạt lại công tắc; nhóm vừa dùng lại thì bấm «Ngưng nhóm» | `/api/feedback/admin/teams/:x`<br>nhật ký `feedback_team_updated` | `web/ho-tro-nhom.ts`: aria:Nhạy cảm — nhóm ${t.name}<br>`web/ho-tro-nhom.ts`: Dùng lại | chờ chọn (máy lộ thêm 2026-11-04 khi bộ quét nhận lệnh ghi qua hàm bọc; chưa trình chủ) |

### Nhóm hỗ trợ: thành viên trong hộp «Sửa»

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thêm <tên> · Đổi thành <Phụ trách hoặc Thành viên> · Gỡ** | Hỗ trợ › thẻ Nhóm hỗ trợ › hộp «Sửa» › phần thành viên | Thêm nhân viên vào nhóm, đổi một người giữa Phụ trách và Thành viên, hoặc gỡ người đó khỏi nhóm. Bấm là ghi ngay. Máy chủ chỉ cho Toàn quyền. | không | được: thêm lại hoặc đổi lại | `/api/feedback/admin/teams/:x/members/:x`<br>nhật ký `feedback_team_member_changed` | `web/ho-tro-nhom.ts`: Thêm ‹…›<br>`web/ho-tro-nhom.ts`: Đổi thành ‹…›<br>`web/ho-tro-nhom.ts`: Gỡ | chờ chọn (máy lộ thêm 2026-11-04 khi bộ quét nhận lệnh ghi qua hàm bọc; chưa trình chủ) |

### Khung chung: tài khoản

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đăng xuất** | Thanh bên máy tính (chân thanh); trang Tôi cũng có nút riêng | Đăng xuất MÁY NÀY (máy khác của cùng tài khoản vẫn đăng nhập), tắt thông báo đẩy của máy này, xoá bản nhớ khung giao diện rồi về trang đăng nhập. Nếu máy chủ lỗi thì máy này vẫn thoát ra. | không | được: đăng nhập lại; riêng thông báo đẩy của máy này phải bật lại ở mục Thông báo trang Tôi | `/api/auth/logout` | `web/shell.ts`: Đăng xuất | đã chốt (rà soát 2026-11-04: tên đúng; «Đăng xuất máy này» là tên chủ chọn cho nút ở danh sách máy đang đăng nhập (2026-10-18, lượt 2); nút «Đăng xuất» ở thanh bên làm cùng việc cho máy đang cầm nên tên ngắn vẫn đúng.) |

### Khung chung: thanh trên

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Tạo đơn** | Thanh trên mọi trang (trước chuông và nút Trợ lý) | Chỉ là đường dẫn tới màn lập đơn mới; chưa ghi gì. Hiện theo bảng mục chung của thanh trên, cùng người xem với mục «Tạo đơn» của thanh bên. | không | không áp dụng | (chưa nối) | `web/shell.ts`: ⟪m.nhan⟫ | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Khung chung: dải báo và trang trạng thái

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Thử lại** | Dải «ngoài mạng» ở đầu trang; khối «Không có kết nối mạng»; khối lỗi máy chủ | Ở dải «ngoài mạng» và khối «chưa nạp», nút tải lại CẢ TRANG; ở khối lỗi máy chủ của từng trang thì chạy lại đúng phần vừa lỗi (tuỳ trang). Chưa ghi gì lên máy chủ. | không | không áp dụng | (chưa nối) | `web/dai.ts`: Thử lại<br>`web/trang-thai-he-thong.ts`: Thử lại | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Thông báo: chuông

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **(chuông) Thông báo · (mỗi dòng) <tin>** | Chuông ở thanh trên › ngăn «Thông báo» (hai thẻ Của tôi / Tất cả) › từng dòng tin | Bấm chuông mở ngăn tin và ĐÁNH DẤU ĐÃ ĐỌC TẤT CẢ ngay (số đỏ tắt), kể cả tin bạn chưa kéo xuống đọc; dòng tin chưa đọc vẫn còn chấm trong lần mở này. Bấm một dòng: tin công ty thì mở hộp đọc, tin khác thì đi tới đơn hoặc chuyến liên quan. Bản thân dòng tin không ghi thêm gì. | không | không: mốc đã đọc không lùi lại được | `/api/account/thong-bao/:x/da-hieu` | `web/thong-bao-ui.ts`: ⟪tinBadge(t)⟫ / ⟪t.cau⟫ / ⟪tinMeta(t, now)⟫<br>`web/thong-bao-ui.ts`: [biểu tượng bell] | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Thông báo: tin quan trọng

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Đã hiểu** | Hộp đọc tin công ty (mở từ dải «Tin quan trọng» bằng «Xem» hoặc từ ngăn chuông) | Ghi rằng bạn đã đọc và hiểu tin quan trọng của công ty. Dải nhắc ở đầu trang tắt, và Toàn quyền (người gửi) xem được danh sách ai đã bấm. «Để sau» chỉ đóng hộp, tin vẫn quan trọng chưa hiểu cho tới khi bấm. Người gửi chính tin đó không có nút này. | không | không: bấm rồi không bỏ được | `/api/account/thong-bao/:x/da-hieu`<br>nhật ký `notice_acknowledged` | `web/thong-bao-ui.ts`: Đã hiểu<br>`web/thong-bao-ui.ts`: [biểu tượng close]<br>`web/thong-bao-ui.ts`: Để sau<br>`web/thong-bao-ui.ts`: Đóng | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

### Trợ lý: nút và khung

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **(biểu tượng chat) Trợ lý** | Biểu tượng chat ở cuối thanh trên (sau chuông) › khung nổi «Trợ lý» | Mở hoặc đóng khung hỏi đáp nổi; chưa gọi ra ngoài. Khung chỉ hiện khi tài khoản thuộc một vai trò đang được bật dùng trợ lý. Trợ lý tự xưng «Mai». «Cuộc trò chuyện mới» chỉ xoá màn hình và đổi mã cuộc trò chuyện, không xoá câu đã hỏi ở lịch sử máy chủ (lịch sử không xoá được). | không | không áp dụng | `/api/tro-ly/hoi` | `web/tro-ly.ts`: [biểu tượng chat]<br>`web/tro-ly.ts`: [biểu tượng resize]<br>`web/tro-ly.ts`: Trợ lý<br>`web/tro-ly.ts`: Về góc<br>`web/tro-ly.ts`: [biểu tượng close]<br>`web/tro-ly.ts`: Cuộc trò chuyện mới | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Trợ lý: hỏi đáp

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Gửi** | Khung nổi «Trợ lý» (nút gửi cạnh ô câu hỏi; hoặc chạm câu hỏi mẫu) | Gửi câu hỏi (đã che số điện thoại, email, số giấy tờ) cho dịch vụ AI bên ngoài (OpenAI) kèm tên gọi của bạn, tên các vai trò của bạn và các đoạn hướng dẫn tìm được; mỗi câu tốn khoảng một phần nghìn đô la tính vào trần chi phí của công ty. Câu hỏi và câu trả lời được lưu vào lịch sử chỉ Toàn quyền đọc được, không xoá được. Trợ lý không xem được đơn, khách, tiền, và không làm thay việc gì. | không | không: câu hỏi đã gửi và đã lưu lịch sử | `/api/tro-ly/hoi` | `web/tro-ly.ts`: Gửi<br>`web/tro-ly.ts`: ⟪getComputedStyle(dau)⟫ | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Cài đặt Trợ lý: bật tắt và tiền

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu** | Trợ lý Hỗ trợ (/tro-ly-cai-dat) › phần «Tình trạng» (ô «Bật trợ lý cho cả công ty», «Trần chi phí mỗi tháng (USD)») | Bật hoặc tắt trợ lý và đặt trần chi phí tháng. Có hiệu lực ngay. Bật thì những vai trò đang được tick ở phần «Ai được dùng» bắt đầu gửi câu hỏi ra OpenAI và tốn tiền thật, tới trần tháng và trần số câu mỗi người mỗi ngày. Không gọi AI lúc bấm «Lưu». | không | được: tắt lại hoặc hạ trần | `/api/tro-ly/cai-dat`<br>nhật ký `tro_ly_settings_changed` | `web/tro-ly-cai-dat.ts`: Lưu | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Lưu** | Trợ lý Hỗ trợ › phần «Ai được dùng» (công tắc từng vai trò, «Số câu mỗi người mỗi ngày») | Lưu công tắc từng vai trò (ai thấy nút Trợ lý) rồi lưu số câu tối đa mỗi người mỗi ngày — hai lời gọi liên tiếp. Có hiệu lực ngay. Một tài khoản nhiều vai trò dùng được nếu ít nhất một vai trò đang bật. | không | được: tick lại và lưu | `/api/tro-ly/vai`<br>`/api/tro-ly/cai-dat`<br>nhật ký `tro_ly_settings_changed` | `web/tro-ly-cai-dat.ts`: Lưu | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Thử key** | Trợ lý Hỗ trợ › phần «Tình trạng» | Gọi thật dịch vụ AI OpenAI một lần ngắn bằng khoá đã cài trên Cloudflare, để biết khoá còn dùng được. Tốn một ít tiền thật (cực nhỏ) và ghi vào số lượt thử tính vào chi phí tháng, không tính vào số câu mỗi ngày. Không gửi dữ liệu khách; không đổi khoá. | không | không: tiền đã tính; vô hại | `/api/tro-ly/thu-khoa` | `web/tro-ly-cai-dat.ts`: Thử key | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |

### Cài đặt Trợ lý: bộ não và lời dặn

| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |
|---|---|---|---|---|---|---|---|
| **Lưu bộ não** | Trợ lý Hỗ trợ › phần «Bộ não» (mẫu AI, mức suy nghĩ, độ dài, token, lời nhắc) | Lưu thành MỘT BẢN MỚI (bản cũ giữ trong «Lịch sử bản») và dùng ngay cho mọi câu hỏi của cả công ty từ lúc này: đổi mẫu AI, giá mỗi câu, độ dài, và lời nhắc (có cả các luật an toàn). Chưa gọi AI lúc bấm. Muốn thử trước thì dùng ô «Thử trước khi lưu». | không | được: «Quay lại bản này» ở Lịch sử bản (tạo thêm một bản mới) | `/api/tro-ly/bo-nao`<br>nhật ký `tro_ly_settings_changed` | `web/tro-ly-cai-dat.ts`: Lưu bộ não | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Khôi phục mặc định** | Trợ lý Hỗ trợ › phần «Bộ não» › nút «Khôi phục mặc định» (hộp hỏi chỉ hiện khi ô lời nhắc đang có chỗ sửa chưa lưu) | Chỉ chép lời nhắc mặc định vào Ô LỜI NHẮC trên màn hình. Chưa lưu gì; mẫu AI, mức suy nghĩ, độ dài, số token giữ nguyên. Phải bấm «Lưu bộ não» thì mới có hiệu lực. Hộp hỏi chỉ hiện khi ô đang có chỗ sửa chưa lưu; nếu ô sạch thì thay luôn không hỏi. | có: «Lời nhắc trong ô đang có chỗ sửa chưa lưu. Thay bằng bản mặc định?» | được: sửa lại ô hoặc tải lại trang trước khi lưu | (chưa nối) | `web/tro-ly-cai-dat.ts`: Thay<br>`web/tro-ly-cai-dat.ts`: Khôi phục mặc định<br>`web/tro-ly-cai-dat.ts`: Giữ chỗ đang sửa | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Quay lại bản này** | Trợ lý Hỗ trợ › phần «Bộ não» › «Lịch sử bản» (không hiện ở bản đang dùng) | Lưu NGAY bản cũ đó thành một bản mới và áp dụng cho cả công ty từ lúc bấm (mẫu AI, mức suy nghĩ, độ dài, token, lời nhắc cùng đổi). Không hỏi lại. Form phía trên được vẽ lại theo bản mới, nên chỗ đang sửa chưa lưu trong ô lời nhắc MẤT. | không | được: bấm «Quay lại bản này» ở bản trước nữa (mỗi lần tạo thêm một bản) | `/api/tro-ly/bo-nao`<br>`/api/tro-ly/loi-dan`<br>nhật ký `tro_ly_settings_changed` | `web/tro-ly-cai-dat.ts`: Quay lại bản này | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Thử với cấu hình đang soạn** | Trợ lý Hỗ trợ › «Thử trước khi lưu» (vai trò giả định, câu hỏi thử) | Gửi câu hỏi thử cùng cấu hình đang soạn (chưa lưu) tới OpenAI giống một câu hỏi thật, kể cả tìm đoạn hướng dẫn theo nghĩa. Tốn tiền thật và tính vào trần tháng (không tính vào số câu mỗi ngày); chạy được cả khi trợ lý đang tắt; không ghi vào lịch sử hỏi đáp và không đổi bộ não đã lưu. Trả về đoạn đã dùng và chi phí lượt thử. | không | không: tiền đã tính | `/api/tro-ly/thu` | `web/tro-ly-cai-dat.ts`: Thử với cấu hình đang soạn | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Lưu thành bản mới** | Trợ lý Hỗ trợ › phần «Lời dặn» (Câu chào, Câu hỏi mẫu) | Lưu câu chào và danh sách câu hỏi mẫu thành bản mới, dùng ngay cho khung Trợ lý của mọi người. Chỉ đổi câu chào và câu hỏi mẫu; KHÔNG đổi cách trợ lý trả lời (cách đó ở mục «Bộ não»). Các trường cũ «giọng» và «lời dặn thêm» được giữ nguyên, không sửa được ở đây. | không | được: «Quay lại bản này» ở Lịch sử bản | `/api/tro-ly/loi-dan`<br>nhật ký `tro_ly_settings_changed` | `web/tro-ly-cai-dat.ts`: Lưu thành bản mới | chờ chọn (rà soát 2026-11-04: chưa rõ, chờ chủ) |
| **Quay lại bản này** | Trợ lý Hỗ trợ › phần «Lời dặn» › «Lịch sử bản» | Lưu ngay câu chào và câu hỏi mẫu của bản cũ thành bản mới, dùng ngay cho khung Trợ lý. Không hỏi lại. | không | được: quay lại bản trước nữa | `/api/tro-ly/bo-nao`<br>`/api/tro-ly/loi-dan`<br>nhật ký `tro_ly_settings_changed` | `web/tro-ly-cai-dat.ts`: Quay lại bản này | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |
| **Thêm đoạn / (khi sửa) Lưu thành bản mới** | Trợ lý Hỗ trợ › phần «Ngữ cảnh bổ sung» (thêm hoặc sửa đoạn) | Thêm một đoạn chữ để trợ lý đọc như một mục hướng dẫn (tối đa vài chục đoạn). Đoạn đang bật được gửi kèm cho OpenAI khi nhân viên hỏi câu khớp nội dung. Sửa đoạn cũ thì lưu thành bản mới của đoạn đó. Ô «Đang dùng» bật/tắt ngay, không cần lưu. | không | một phần: tắt ô «Đang dùng» là đủ; lịch sử bản giữ lại | `/api/tro-ly/ngu-canh`<br>`/api/tro-ly/ngu-canh/:x`<br>nhật ký `tro_ly_settings_changed` | `web/tro-ly-cai-dat.ts`: Thêm đoạn<br>`web/tro-ly-cai-dat.ts`: Huỷ sửa<br>`web/tro-ly-cai-dat.ts`: Sửa | tên hiện tại, chủ chưa chọn riêng (rà soát 2026-11-04: tên đúng) |

## Mục bỏ qua (66)

Nút máy dò là ghi dữ liệu hay nút chính nhưng thực ra không phải; mỗi mục có lý do.

| Tệp | Nút | Lý do |
|---|---|---|
| `web/banner.ts` | Tải lại đơn | Tải lại đơn: chỉ tải lại, không ghi gì |
| `web/banner.ts` | Tải lại trang | Tải lại trang: chỉ tải lại |
| `web/canh-bao-doi-tac.ts` | Không | «Không» của khung cảnh báo trùng số: chỉ ẩn khung |
| `web/confirmation-dialog.ts` | [biểu tượng close] | nút đóng hộp (biểu tượng) |
| `web/confirmation-dialog.ts` | Thử lại | Thử lại dựng ảnh |
| `web/confirmation-dialog.ts` | Chia sẻ | Chia sẻ ảnh (cùng hộp với Tải ảnh PNG): mở bảng chia sẻ của điện thoại, không ghi gì |
| `web/order.ts` | Thử lại | Thử lại tải người phụ trách |
| `web/order.ts` | Thôi | Thôi: đóng hàng xác nhận |
| `web/order.ts` | Xem phiếu phân định | liên kết sang màn Phân định trách nhiệm |
| `web/order.ts` | Tải lại | Tải lại đơn |
| `web/order.ts` | Tạo lại mã | Tạo lại mã QR (chỉ đọc, thuộc hàng QR thanh toán) |
| `web/order.ts` | Sửa | liên kết «Sửa» mở biểu mẫu đơn nháp |
| `web/order.ts` | Không huỷ | Không huỷ: đóng hộp huỷ |
| `web/phan-doi-tac.ts` | Tải lại | Tải lại khối Phần đối tác |
| `web/phan-doi-tac.ts` | Ghi mức tay | nút mở bảng «Ghi mức tay», đã tính chung trong hàng N0714 |
| `web/xac-nhan-don-ui.ts` | Không huỷ | Không huỷ: đóng hộp huỷ của bảng kiểm vé |
| `web/home.ts` | ⟪t.nhan⟫ / ⟪NHAN_PHAM_VI[PHAM_VI_O_TRANG_CHU[KHOA_PHAM_VI[t.khoa]]]⟫ / Chưa tải được số này — bấm để thử lại / — / chưa tải được | dòng «Đang chờ bạn» của Trang chủ: liên kết hoặc nút «bấm để thử lại» tải số liệu, không ghi; gợi ý máy POST và «Xác nhận đã nhận» là nhận nhầm từ hộp lân cận |
| `web/home.ts` | Thử lại | nút «Thử lại» của dải lỗi Trang chủ: chỉ tải lại số liệu |
| `web/orders.ts` | Áp dụng | nút «Áp dụng» của bảng lọc đơn: lọc danh sách, không ghi |
| `web/khoa-thang.ts` | Thôi | nút «Thôi» huỷ khung xác nhận khoá tháng, không gọi máy chủ (máy gắn nhầm là ghi POST) |
| `web/hoa-hong-hop.ts` | Huỷ | nút «Huỷ» của hộp Sửa tên cấp hoặc vai trò |
| `web/dac-diem-dich-vu.ts` | Huỷ | nút «Huỷ» của hộp nhập trang Đặc điểm |
| `web/luat-ban.ts` | Huỷ | nút «Huỷ» của hộp hẹn ngày kết thúc luật |
| `web/so-dai-ly-ui.ts` | Thôi | nút «Thôi» của khung đóng điều khoản (đã tính trong hàng Người bán) |
| `web/hoa-hong-hop.ts` | Chép mã | «Chép mã»: chép mã cấp hoặc vai trò vào bộ nhớ tạm, không ghi dữ liệu |
| `web/hoa-hong-menu.ts` | aria:nhanViecKhac(tenDong) | nút «⋯» mở menu việc khác, chỉ mở danh sách |
| `web/hoa-hong-tra-nhanh.ts` | Bỏ chọn | «Bỏ chọn» của ô tra nhanh, chỉ xoá lựa chọn trên màn |
| `web/hoa-hong-tra-nhanh.ts` | Đóng | nút «Đóng» hộp tra nhanh |
| `web/so-dai-ly-ui.ts` | Bỏ chọn | «Bỏ chọn» của ô chọn dịch vụ |
| `web/so-cong-no.ts` | ‹…› (‹…›) | dòng lọc của Sổ công nợ, chỉ đọc |
| `web/so-cong-no.ts` | ‹ Danh sách | «‹ Danh sách» của Sổ công nợ, chỉ quay lại |
| `web/hoa-hong-lich-su.ts` | ⟪nhanNutLichSu(ds.length, false)⟫ | «Xem lịch sử (n)» mở danh sách, chỉ đọc |
| `web/hoa-hong-tra-nhanh.ts` | Xem mức này ↓ | «Xem mức này ↓» chỉ cuộn tới dòng trên trang, không ghi |
| `public/lich-xe-ban.html` | ‹ | nút tuần trước (‹) |
| `public/lich-xe-ban.html` | Tuần này | nút chuyển về tuần này |
| `public/lich-xe-ban.html` | › | nút tuần sau (›) |
| `web/bang-gia-xe.ts` | ⟪t.nhan⟫ | nút chuyển thẻ Giá thuê / Tuyến / Cỡ xe |
| `web/chinh-sach-dieu-phoi.ts` | không-chữ | nút không chữ (mũi tên hay biểu tượng) trong chính sách điều phối, không ghi dữ liệu |
| `web/chinh-sach-dieu-phoi.ts` | Đóng | nút Đóng bảng Lịch sử bản |
| `web/chinh-sach-dieu-phoi.ts` | Lịch sử bản (‹…›) / › | nút mở Lịch sử bản (chỉ đọc) |
| `web/danh-muc-giay-to-khoi.ts` | Đóng | nút Đóng khung sửa danh mục giấy tờ |
| `web/giay-to-sap-het-han.ts` | Huỷ | nút Huỷ hộp đổi mốc nhắc |
| `web/giay-to-ui.ts` | Huỷ | nút Huỷ hộp Xem đủ số |
| `web/lich-xe-ban.ts` | Đóng | nút Đóng hộp Rút lịch bận |
| `web/ly-do-dieu-phoi.ts` | Đóng | nút Đóng khung Thêm lý do |
| `web/tien-xe-ui.ts` | Đóng | nút Đóng form chi phí |
| `web/tien-xe-ui.ts` | Thử lại | nút Thử lại khi tải lỗi |
| `web/xe-chi-tiet.ts` | Lịch sử (‹…›) / [biểu tượng chevron-down] | nút mở/đóng Lịch sử dòng giấy tờ (chỉ đọc) |
| `web/xe-chi-tiet.ts` | Sửa thông tin xe | liên kết «Sửa thông tin xe» chỉ mở trang sửa |
| `web/xe-sua.ts` | − | nút − bộ đếm số người; không ghi tới khi bấm Lưu |
| `web/xe-sua.ts` | aria:Thêm một người | nút + bộ đếm số người; không ghi tới khi bấm Lưu |
| `web/xe-sua.ts` | Huỷ | liên kết Huỷ quay lại, không lưu |
| `web/xe.ts` | ‹…› ‹…› | bộ lọc trạng thái trên danh sách xe |
| `web/phieu-xoa.ts` | Đang chờ | nút chuyển thẻ Đang chờ ở trang Xoá dữ liệu cá nhân |
| `web/phieu-xoa.ts` | Đã xử lý | nút chuyển thẻ Đã xử lý |
| `web/phieu-xoa.ts` | ⟪p.tenHoSo⟫ / ⟪nhanHan(p)⟫ / Gửi lúc ‹…› / ⟪p.lyDoKhong⟫ | thẻ mở chi tiết phiếu xoá (chỉ mở, không ghi) |
| `web/xac-minh-hang-cho.ts` | Đang chờ | nút chuyển thẻ Đang chờ ở Hàng chờ xác minh |
| `web/xac-minh-hang-cho.ts` | Đã xử lý | nút chuyển thẻ Đã xử lý |
| `web/xac-minh-hang-cho.ts` | ⟪nhanLoaiPhieu(p.loai)⟫ / ⟪p.tenHoSo⟫ / Chuyển Toàn quyền / Gửi lúc ‹…› / ⟪p.lyDoKhong⟫ | thẻ mở chi tiết phiếu xác minh (chỉ mở) |
| `public/parties.html` | Tìm | nút Tìm ở bộ lọc Danh bạ, chỉ đọc |
| `web/giao-dien.ts` | Lưu | nút «Lưu» mẫu trong khung xem trước Giao diện, không có tác dụng (chỉ để xem màu) |
| `web/giao-dien.ts` | Nút phụ | nút «Nút phụ» mẫu trong khung xem trước Giao diện, không có tác dụng |
| `web/giao-dien.ts` | Xác nhận đơn | nút «Xác nhận đơn» mẫu trong khung xem trước Giao diện, không có tác dụng (chữ giống nút thật của Chi tiết đơn nhưng chỉ là hình) |
| `web/parties.ts` | Mở hồ sơ này | nút «Mở hồ sơ này» trong cảnh báo trùng số điện thoại, chỉ mở hồ sơ đã có, không ghi gì |
| `web/ho-tro-danh-sach.ts` | ⟪NHAN_LOC[k]⟫ / ⟪String(n)⟫ | nút lọc «Chưa ai nhận / Tôi đang xử lý / Tất cả» của Việc của nhóm; chỉ đọc, tên khớp việc |
| `web/tro-ly-cai-dat.ts` | Lọc | nút «Lọc» lịch sử hỏi đáp; chỉ đọc |
