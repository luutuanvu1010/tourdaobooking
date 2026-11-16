# ADR-0212 — Vai đăng ký là dữ liệu; biểu mẫu khớp nơi lưu; phiếu có phần tổ chức

- **Trạng thái:** **đề xuất** 2026-11-16 — AI soạn theo đặc tả `docs/superpowers/specs/2026-11-16-dang-ky-dot-2-ca-nhan-va-to-chuc.md` (mục 7 và 8 là lời chủ, thắng các khuyến nghị cũ của đặc tả). Sửa sau lượt soát độc lập lần 1 (`.superpowers/sdd/2026-11-16-dang-ky-dot-2/adr-review-1.md`). **Chủ đã chốt 16/11** (đặc tả mục 9 câu 2, nguyên văn): «Có chứ, loại đối tác luôn chỉ tham chiếu từ 1 nguồn trong cơ sở dữ liệu và nó không được lệch.» ⇒ mở cả loại Kế toán thêm, một nguồn, có bài canh lệch (Đ1.5). Chờ chủ duyệt toàn văn; AI không tự duyệt (Hiến pháp N3). Trang trình chủ: `docs/superpowers/specs/2026-11-16-dang-ky-dot-2-luot-duyet/TRINH-CHU.md`; trang ghép: `TRANG-GHEP.md` cùng thư mục.
- **Số:** 0212. Đã liệt kê `docs/adr/` trên mọi nhánh cục bộ và nhánh xa ngày 16/11: số lớn nhất đang dùng là 0211. Tên giữ chỗ trong đặc tả: «lượt A».
- **Nguồn:** lời chủ 16/11 (đặc tả mục 7): danh sách «Vai người dùng xin đăng ký» khớp vai đối tác của hệ thống, thêm vai thì tự có; vai nội bộ không bao giờ tự đăng ký; trường nào cũng có nơi lưu và ngược lại; một phiếu khai cá nhân (bắt buộc) và tổ chức (tuỳ chọn).
- **Ngày:** 2026-11-16. **Loại:** việc lớn — dữ liệu (bảng và cột mới của `dang-ky`, mở rộng danh sách mục xác minh của `parties`), quyền (danh sách vai mở cho người lạ đổi nguồn), luật (một bài kiểm mới chặn lệch biểu mẫu với nơi lưu). Người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều về hành vi (Toàn quyền vẫn đóng mở từng vai; công tắc chung vẫn đóng được); một chiều mềm về dữ liệu (bảng chỉ thêm; phần tổ chức của phiếu ẩn danh theo cùng hạn với phần cá nhân).
- **Quan hệ với ADR cũ:**
  - **ADR-0206 Đ11** (bốn vai mở cho phiếu cá nhân, ghi cứng): **thay** bằng Đ1–Đ2 dưới đây. Câu «Công ty lữ hành không mở cho phiếu cá nhân» **giữ**, nay thành luật của bảng Đ2.
  - **ADR-0206 Đ3** (loại phiếu «tổ chức» mở bằng tạo lại trigger loại): **không dùng cách đó**. Cột `dk_registration.kind` được đặt trước khi người đăng ký thấy biểu mẫu và không đổi được (trigger `dk_registration_immutable`, `migrations/0170_dang_ky.sql`), nên phần tổ chức đi thành một bảng anh em của bản khai (Đ4), loại phiếu giữ `PERSON`.
  - **ADR-0117 Đ1, Đ2:** loại đối tác do Kế toán thêm là dữ liệu và không sinh quyền; mâu thuẫn mức ở cùng bậc thì đơn bị giữ. Đ3 dưới đây mở đường duyệt cho loại đó mà không gây «thiếu mức».
  - **ADR-0207 Đ2, Đ5:** thêm phần tổ chức vào bước xác minh, đối chiếu Danh bạ và lô duyệt (Đ6–Đ7). Câu chốt, hai người, tài khoản tắt tới khi kích hoạt: giữ nguyên.
  - **ADR-0209:** cấp độ đại lý mặc định áp cho hồ sơ tổ chức khi vai của tổ chức là loại được hưởng (cùng câu, đổi hồ sơ đích).
  - **ADR-0210 Đ1:** tập đóng `MUC_XAC_MINH_MO` và trigger `pty_verification_requirement_item_closed` mở thêm mục của tổ chức (Đ5).
  - **ADR-0048 (LC-1b):** giữ. Tài xế đối tác đứng một mình, không kèm phần tổ chức.
  - **ADR-0213** (cùng lượt): phần «người này quản lý tổ chức này» và «thao tác thay mặt tổ chức» thuộc ADR-0213. ADR này chỉ thu, lưu và duyệt dữ liệu tổ chức.
  - **Không đổi:** bốn cửa cấp phiên, bản đồ mã quyền (không thêm mã quyền, không thêm hàng quyền), luật tiền.
- **Xây trên lỗ đang hở: HC-5.19** (chưa diễn tập khôi phục dữ liệu; hạn trong `docs/quyen-hoan.json` là 31/12/2026). **Lý do xin phép, nói đủ:** thêm bảng và cột mới **và tạo lại** năm trigger đang chạy (`dk_registration_immutable`, `dk_registration_return_clear`, câu chốt `dk_decision_guard`, `pty_verification_requirement_item_closed`, cùng LC-1c ở ADR-0213); không đổi dòng dữ liệu nào đang có; phiếu vẫn không sinh hồ sơ hay tài khoản trước lệnh duyệt; khôi phục D1 về trước một mốc thì phiếu và hồ sơ sinh sau mốc mất cùng nhau (một lô), định nghĩa trigger cũ trở lại, và **phải triển khai lại bản mã trước đó** ngay sau khi khôi phục vì mã mới không chạy đúng trên CSDL cũ — bước này chưa từng được diễn tập; người đăng ký gửi lại được; không dòng nào của sổ tiền hay đơn bị ảnh hưởng. Khoá cho phép đề xuất: `xay_tren_cho_phep_adr_0212_0213`. Chủ chọn ở câu mẫu: phát hành **trước hay sau** buổi diễn tập (dự kiến 25/11/2026 theo `docs/HANDOFF-N1.md`; hạn sổ 31/12). Nếu buổi diễn tập xong trước lúc phát hành thì dòng này tự hết.
- **HC-4.2** (bút toán điều chỉnh chưa có người duyệt thứ hai, hạn 30/11): **không chạm**. ADR này không ghi dòng sổ tiền nào.
- **Hiến chương áp:** 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 5.12, 5.20, 5.21, 5.23, 5.24, 5.25, 5.26, 5.27, 5.29. **Lệch có chủ ý:** không.
- **Số quyết định chạm quyền/dữ liệu:** 1 (cùng lượt với ADR-0213 — tổng 2, dưới trần 3).

## Bối cảnh

Đọc mã ngày 16/11 cho năm điều chi phối thiết kế:

- Danh sách vai mở cho phiếu ghi cứng ở `VAI_MO_DUOC_CHO_PHIEU_CA_NHAN` (`src/shared/dang-ky-hien-thi.ts`), và lệnh đổi chính sách kiểm theo đúng danh sách đó (`kiemThanChinhSach`, `src/modules/dang-ky/chinh-sach-route.ts`). Lệnh duyệt chỉ nhận mã có trong `ROLES` thuộc nhóm bên ngoài (`duyet-route.ts`, `isRoleCode` và `groupOf`), và gốc lắp ráp ném lỗi với mã không phải `RoleCode` (`loDuyetDangKy`, `src/index.ts`). Vì vậy một loại đối tác Kế toán thêm (mã `LD_…`, `pty_role_type` nhóm `OTHER`, cờ `is_partner_label = 1`, ADR-0117) hôm nay **không hiện được và không duyệt được**.
- Vai bên ngoài và loại được hưởng hoa hồng **không trùng nhau**: `prc_beneficiary_role` gieo năm vai (`migrations/0090_so_dai_ly_dot_1.sql`), không có «Tài xế đối tác» (`DRIVER_EXTERNAL`).
- Trigger LC-1c (`migrations/0149_lc1c_doi_tac_can_vai_tro.sql`) cho quyền Đối tác khi hồ sơ mang vai nhóm bên ngoài **hoặc** mang loại đối tác. Một hồ sơ chỉ mang loại `LD_…` vẫn giữ được quyền Đối tác ở tầng dữ liệu.
- Bảng tổ chức đã có: `pty_party` (tên hiển thị), `pty_organization` (tên pháp lý, mã số thuế, địa chỉ, email hoá đơn — `migrations/0011_parties.sql`), `pty_organization_document` cùng danh mục loại (GPKD cố định và bốn loại giấy phép, `migrations/0103_ho_so_mo_rong.sql`), bốn mục xác minh của tổ chức ở `pty_verification_attribute`. Liên hệ «Địa chỉ» chỉ ghi cho hồ sơ cá nhân; địa chỉ tổ chức nằm ở `pty_organization.address`. Trigger `pty_organization_document_gpkd_one_org_ins` cấm một số GPKD thuộc hai tổ chức.
- Hàm tìm hồ sơ có thể trùng chỉ xét hồ sơ cá nhân (ADR-0207 Hệ quả); bước xác minh chỉ gắn được vào hồ sơ cá nhân (`xac-minh-route.ts`, mã `target_not_person`).

## Quyết định

**Đ1 — Danh sách vai đăng ký được là dữ liệu của `parties`, không phải hằng trong mã.**

1. **Nguồn:** `parties` công bố một hàm đọc (tên giữ chỗ `vaiDangKyDuoc`) trên bảng `pty_role_type`, trả mã, tên, nhóm, cờ loại đối tác: mọi dòng **`role_group = 'EXTERNAL'` và `active = 1`**, cộng mọi dòng **`is_partner_label = 1` và `active = 1`**. Vai nội bộ (`INTERNAL`) và vai khác nhóm `OTHER` không mang cờ (Nhà xe, công ty chủ) không bao giờ vào danh sách. Cạnh `dang-ky → parties` đã có ở `ALLOWED_EDGES` (`src/architecture.test.ts`), không thêm cạnh. Hôm nay hàm trả sáu vai bên ngoài cộng mọi loại Kế toán đang bật.
2. **Loại mới tự hiện:** Kế toán thêm một loại ở trang Hoa hồng là chèn một dòng `pty_role_type` có cờ (ADR-0117 Đ1). Hàm trên đọc thẳng bảng đó, nên lần tải sau khối «Nhận đăng ký mới» của Toàn quyền có loại mới để chọn, không sửa mã, không phát hành. Kế toán tắt loại thì loại biến khỏi danh sách.
3. **Toàn quyền vẫn chọn loại nào mở** bằng chính sách đăng ký (`dk_policy.open_role_codes`, ADR-0206 Đ9). Lệnh đổi chính sách kiểm mỗi mã gửi lên nằm trong danh sách của mục 1 **và** «mở được» theo bảng Đ2. Hằng `VAI_MO_DUOC_CHO_PHIEU_CA_NHAN` bị bỏ. Biểu mẫu chỉ hiện giao của «Toàn quyền mở» với «danh sách mục 1 lúc này»: một loại bị tắt sau khi mở thì tự ẩn, không cần sửa chính sách.
4. **Lệnh duyệt kiểm lại lúc duyệt:** loại của phiếu phải còn trong danh sách mục 1. Loại đã tắt thì 409 kèm câu nói rõ, người duyệt chọn loại khác hoặc từ chối.
5. **Một nguồn, không lệch** (lời chủ 16/11). Nguồn duy nhất của *mã, tên, nhóm, cờ, bật/tắt* của mọi vai và loại đối tác là bảng `pty_role_type`. Mọi nơi hiện tên vai cho người dùng (biểu mẫu đăng ký, hàng chờ duyệt, Danh bạ, trang Hoa hồng) đọc tên từ nguồn đó qua hàm của `parties`. Hôm nay có ba chỗ lệch phải sửa: hằng `VAI_MO_DUOC_CHO_PHIEU_CA_NHAN` (bỏ); `web/dang-ky.ts` lấy tên vai từ hằng `ROLES` trong mã (`tenVai`) nên loại `LD_…` hiện ra mã thô — đổi sang tên máy chủ trả; mục «Nhận đăng ký mới» ở `src/shared/bang-tham-chieu-khai-niem.ts` trỏ tên hằng cũ. `ROLES` trong mã vẫn giữ **bộ quyền mặc định** của vai có mã (ADR-0018 điều 2), không giữ danh sách loại; bài sẵn có `src/roles-schema.test.ts` giữ mã vai trong `ROLES` khớp `pty_role_type`. **Bài canh lệch mới:** (a) quét mã nguồn: không tệp nào ngoài `roles.ts` khai một danh sách mã vai đối tác viết tay (danh sách cho phép có tên); (b) bất biến mới ở `scripts/audit-checks.mjs`: chỉ với các dòng **mang cờ loại đối tác** (`is_partner_label = 1`; vai có mã như Tài xế đối tác không có dòng được hưởng nên không xét), cờ bật ở `pty_role_type.active` và ở `prc_beneficiary_role.active` phải trùng (ADR-0117 Đ1 đặt cả hai trong một lô; lệch là lỗi); (c) danh sách mở của chính sách đăng ký chỉ chứa mã có trong nguồn — mã lạ thì đỏ.

**Đ2 — Luật nối vai với phần của phiếu.** Một bảng thuần trong mã (`src/shared/`, dùng chung máy chủ và giao diện), mỗi dòng là một điều kiện «mở được»; Toàn quyền không mở được vai mà điều kiện chưa đủ.

| Vai | Đứng ở phần | Điều kiện để mở | Lý do |
|---|---|---|---|
| Hướng dẫn viên độc lập, Lễ tân khách sạn, Tài xế taxi, Cộng tác viên | cá nhân | không thêm | như đợt 1 |
| Công ty lữ hành | **chỉ** phần tổ chức (vai của tổ chức) | phiếu phải có phần tổ chức; ADR-0213 đã thi công | công ty không đứng tên một người (ADR-0206 Đ11); không có ADR-0213 thì không ai thao tác được cho tổ chức |
| Tài xế đối tác (`DRIVER_EXTERNAL`) | cá nhân, **không kèm phần tổ chức** | biểu mẫu có ô bằng lái và hạng (Đ8) **và** người xác minh chọn được nhà xe (ADR-0048) | LC-1b: tài khoản Tài xế đối tác không giữ quyền nào khác; người lái phải thuộc một nhà xe |
| Loại do Kế toán thêm (`LD_…`) | cá nhân hoặc tổ chức | không thêm | đường duyệt ở Đ3 |

Trên bảng này máy chặn ở **hai chỗ**: lệnh đổi chính sách (Toàn quyền không mở được dòng chưa đủ điều kiện, câu báo nói thiếu gì) và lệnh gửi phiếu (vai «chỉ tổ chức» mà phiếu không có phần tổ chức: 400; phiếu có phần tổ chức mà vai cá nhân là Tài xế đối tác: 400). «Tài xế đối tác» **có trong danh sách** theo lời chủ «khớp mọi vai», nhưng ở đợt này hiện «chưa mở được» cho tới khi hai điều kiện có thật (mặc định của người soạn, ở danh sách mặc định của trang trình; chủ đã chốt mở loại Kế toán thêm, chưa nói riêng về Tài xế đối tác).

**Đ3 — Duyệt một loại do Kế toán thêm.** Người duyệt chọn loại đó thì lô duyệt mở **đúng một** vai cho hồ sơ: chính loại đó, và cấp **quyền Đối tác trực tiếp** (một dòng `PARTNER`), không đi qua bảng vai sinh quyền của `roles.ts` (loại `LD_…` không có trong `ROLES`). Không mở kèm một vai gốc như «Cộng tác viên»: hai loại cùng có mức ở một bậc thì đơn bị giữ vì «thiếu mức» (ADR-0117 Đ2). Tầng dữ liệu đã cho phép: LC-1c nhận hồ sơ mang loại đối tác; trigger `adr0117_permission_partner_label_internal` chặn mọi quyền nội bộ. `staff` thêm một biến thể của đường tạo tài khoản tắt (ADR-0207 Đ5 câu 3) nhận «quyền Đối tác, không vai sinh quyền»; biến thể cũ không đổi. Quyền Đối tác này lưu là **một dòng `stf_permission` thường, đánh dấu chỉnh tay** (cột cộng tay sẵn có của luật sinh quyền, ADR-0018 điều 3), để lần lưu vai sau ở Quản lý tài khoản không tự gỡ nó; **chưa kiểm** đường lưu vai hôm nay có tôn trọng dòng chỉnh tay với hồ sơ không vai sinh quyền hay không — kế hoạch thi công đọc trước.

**Đ4 — Phần tổ chức là một bảng anh em của bản khai.** Bảng mới của `dang-ky` (tên giữ chỗ `dk_submission_org`), một dòng **bất biến** cho mỗi `(phiếu, phiên bản bản khai)` có phần tổ chức, sinh trong **cùng lô** với dòng `dk_submission` lúc gửi. Cột có kiểu, soi theo `pty_party`, `pty_organization`, `pty_organization_document` để lệnh duyệt chép một–một (Hiến chương 5.2): tên tổ chức (tên hiển thị); tên pháp lý; mã số thuế (và khoá chuẩn hoá do máy tính); địa chỉ; email nhận hoá đơn; số điện thoại của tổ chức (tuỳ chọn); số GPKD (và khoá chuẩn hoá), ngày cấp, nơi cấp; một giấy phép thêm tuỳ chọn (loại chọn trong `pty_organization_document_type` đang bật, số, ngày cấp, nơi cấp, ngày hết hạn); cờ «tôi được tổ chức cho phép đăng ký thay» kèm giờ. Trigger: chỉ chèn đúng phiên bản kế tiếp; không sửa; ẩn danh một lần theo khuôn `dk_submission_erase_shape`.

- **Vai của tổ chức** là một cột mới của `dk_registration` (tên giữ chỗ `org_role_code`, có thể rỗng), khoá sau lần gửi đầu như `role_code` (tạo lại trigger `dk_registration_immutable`). Gửi lại mà bỏ phần tổ chức khi vai của tổ chức đã khoá: 400.
- **Vai cá nhân có thể rỗng khi phiếu có phần tổ chức** (người đăng ký chỉ làm việc cho công ty, không tự làm đối tác riêng). Gắn vào tổ chức **có sẵn** mà không có mã vào tổ chức thì lệnh duyệt bị chặn trước lô bằng 409 có câu rõ (ADR-0213 Đ7.7). Người như vậy **chỉ có tài khoản được khi ADR-0213 Đ9 đã thi công** (LC-1c mới). Vì vậy điều kiện «ADR-0213 đã thi công» áp cho **mọi phiếu có vai cá nhân rỗng**, bất kể vai của tổ chức là gì (kể cả loại `LD_…`): chưa có thì máy chặn ngay lúc gửi phiếu (400, câu nói rõ phải chọn vai cá nhân), không để tới lô duyệt mới hỏng. Mục bắt buộc «ROLE» của chính sách đăng ký (gieo `ROLE,CALLED` ở `migrations/0170_dang_ky.sql`; hàm `mucChuaDapUng` coi vai rỗng là thiếu) đổi nghĩa thành «**có vai cá nhân hoặc vai của tổ chức**», sửa ở hàm kiểm và nhãn cho người đăng ký.
- **Kết luận Danh bạ của tổ chức** tách khỏi của cá nhân: hai cột mới trên `dk_registration` (tên giữ chỗ `org_match_kind`, `org_match_party_id`), cùng khuôn `CHECK` với `match_*`, cùng bị xoá khi «trả về xác minh» (tạo lại trigger `dk_registration_return_clear`), và trigger câu chốt `dk_decision_guard` đòi cả hai kết luận khi phiếu có phần tổ chức.
- **Ảnh:** ô mới «Ảnh giấy đăng ký kinh doanh» (bắt buộc khi có phần tổ chức) và ô của giấy phép thêm (nếu khai), dùng bảng tệp chờ sẵn có `pty_registration_attachment` và mọi luật của ADR-0208 (trần dung lượng, máy gỡ khi phiếu kết thúc không duyệt).

**Đ5 — Xác minh phần tổ chức.**

1. Hai nhóm mục ở màn xác minh: cá nhân, tổ chức. Người xác minh kết luận từng mục như đợt 1.
2. Mục bắt buộc của tổ chức là dữ liệu của `parties` (bảng `pty_verification_requirement`, `subject_kind = 'ORGANIZATION'`). Tập đóng mở thêm: thuộc tính `TEN_PHAP_LY`, `MA_SO_THUE`, `DIA_CHI_TO_CHUC`, `EMAIL_HOA_DON`; giấy tờ `GPKD`. Phải sửa **cùng lúc** hằng `MUC_XAC_MINH_MO` (`src/shared/dau-xac-minh.ts`) và tạo lại trigger `pty_verification_requirement_item_closed` (bài đối chiếu hai bên sẵn có giữ chúng khớp). Gieo mặc định: tên pháp lý, mã số thuế, GPKD.
3. **Đối chiếu Danh bạ cho tổ chức** (mới): máy đưa ra hồ sơ tổ chức có thể trùng theo mã số thuế, số GPKD, rồi tên. Người xác minh chọn «gắn vào hồ sơ tổ chức có sẵn» hoặc «hồ sơ tổ chức mới». Hồ sơ đích phải là tổ chức, đang dùng, chưa gộp. **Gắn vào hồ sơ tổ chức có sẵn không bao giờ làm người đăng ký thành người quản lý**, kể cả khi tổ chức đó chưa có ai (mặc định, chủ bác được — trang trình): văn phòng giao người quản lý sau (ADR-0213 Đ6). Lý do: người lạ khai trúng tên một công ty có sẵn không được tự nắm công nợ và hạn mức Trả sau của công ty đó.
4. **Kiểm trước lô** (để trả câu rõ thay vì lỗi thô): số GPKD chưa thuộc tổ chức khác (trigger `pty_organization_document_gpkd_one_org_ins` sẽ làm hỏng cả lô); mã số thuế không trùng hồ sơ tổ chức khác chưa gộp.

**Đ6 — Lô duyệt thêm gì** (chèn vào thứ tự của ADR-0207 Đ5, sau câu 2, mỗi module cấp câu chưa chạy cho bảng của mình):

- `parties`: hồ sơ tổ chức mới (`pty_party` kiểu `ORGANIZATION` + `pty_organization`) hoặc dùng hồ sơ có sẵn; mở vai của tổ chức;
- `parties`: giá trị đã xác minh của tổ chức (tên pháp lý, mã số thuế, địa chỉ, email hoá đơn; số điện thoại tổ chức thành liên hệ «Số điện thoại» của tổ chức nếu chưa có); dòng `pty_organization_document` cho GPKD và giấy phép thêm (hồ sơ có sẵn đã có dòng hiện hành cùng loại thì là dòng gia hạn);
- `parties`: dòng `pty_verification` cho từng mục tổ chức đã đạt, người và giờ **xác minh**;
- `parties`: tệp chờ của phần tổ chức thành tệp của hồ sơ tổ chức (khuôn ADR-0208 Đ5);
- `pricing`: cấp độ đại lý mặc định cho **hồ sơ tổ chức** theo vai của tổ chức (ADR-0209 Đ3, cùng câu đổi hồ sơ đích);
- `parties`: liên kết người ↔ tổ chức. Khi ADR-0213 chưa thi công: một dòng quan hệ sẵn có `CONTACT_OF` («Người liên hệ của», `migrations/0011_parties.sql`), chỉ ghi nhận, không cho quyền gì; khi ADR-0213 lên, các dòng này **không** tự đổi thành người quản lý — văn phòng giao. Khi ADR-0213 đã thi công: **hồ sơ tổ chức mới** sinh từ phiếu ⇒ dòng «người quản lý của» (ADR-0213 Đ2); **hồ sơ tổ chức có sẵn** ⇒ chỉ dòng «thành viên của» khi có lời mời đang giữ chỗ cho phiếu (ADR-0213 Đ7.5), còn không thì không dòng nào (Đ5.3). Câu mở liên kết đứng **trước** câu cấp quyền (LC-1c mới đọc liên kết).
- `staff`: tài khoản cá nhân như đợt 1 nếu người đăng ký có vai cá nhân, hoặc theo ADR-0213 Đ9 nếu chỉ có vai của tổ chức;
- `dang-ky`: ẩn danh cả dòng `dk_submission_org` cùng câu ẩn danh bản khai.

Nhật ký `staff_created` thêm «kèm hồ sơ tổ chức mới / gắn tổ chức có sẵn» ở phần chi tiết, không tên, không mã số thuế. Thứ tự câu so với khoá ngoại và trigger sẵn có lập ở kế hoạch thi công.

**Đ7 — Ẩn danh, lưu giữ, chính sách riêng tư.**

- **Hạng dữ liệu (quyết định):** một cột không biết được tổ chức là công ty hay hộ kinh doanh, nên xếp theo trường hợp chặt nhất. Số GPKD và mã số thuế **trên phiếu** xếp **N3** (Hiến chương 5.20 nêu «số giấy phép của hộ kinh doanh»; mã số thuế của hộ kinh doanh là mã của một người). Ở hồ sơ, `pty_organization.tax_code` hôm nay xếp **N2** (`docs/data-dictionary.json`); đề xuất **nâng lên N3** — đây là siết, không nới, và Hiến chương 5.12 vốn đã cấm mã số thuế trong nhật ký nên không làm vỡ đường nào đang chạy (kế hoạch thi công rà lại nơi hiện mã số thuế). Số giấy tờ ở `pty_organization_document` đã là N3 (`migrations/0103_ho_so_mo_rong.sql`). Tên pháp lý, địa chỉ, email hoá đơn, số điện thoại tổ chức xếp N2. Không vào nhật ký, lịch sử phiếu, câu báo lỗi, view công bố. Bài quét `giay-to-khong-lo-so` thêm hai loại số này.
- Phần tổ chức ẩn danh **cùng lúc, cùng hạn** với phần cá nhân (chính sách `anonymize_days`, ADR-0208); tệp gỡ trong lô kết thúc như đợt 1. Sau khi duyệt, dữ liệu đã thành hồ sơ tổ chức theo luật lưu giữ của hồ sơ (5.25).
- **Chính sách riêng tư nháp phải thêm trước khi mở đăng ký cho tổ chức:** mục đích thu thông tin tổ chức (xác minh, lập hoá đơn về sau), việc người đăng ký khai thay tổ chức và tự xác nhận được phép, thời hạn giữ. Chữ do luật sư duyệt; chưa có thì Toàn quyền không mở được vai «chỉ tổ chức» (máy kiểm: phiên bản chính sách hiện hành phải mang mục đích tổ chức — tên mục đích chốt ở kế hoạch).

**Đ8 — Bảng đối chiếu trường ↔ cột** (phụ lục A) **là hợp đồng.** Mỗi lệch tìm thấy hôm nay có quyết định ở cột cuối của phụ lục. Hai lệch phải sửa trong đợt này:

- **Giới tính:** cột `dk_submission.gender` có, máy chủ nhận `gioiTinh` (`phieu-route.ts`, `TRUONG_GUI`), lô duyệt chép sang `pty_person.gender`, nhưng biểu mẫu không có ô. **Quyết:** thêm ô «Giới tính» (tuỳ chọn), vì giá trị đã có nơi lưu, đã là mục xác minh `GIOI_TINH` và dùng cho cách xưng hô.
- **Hạng bằng lái:** cột `license_class_code` có, biểu mẫu gửi cứng loại «CCCD» nên không bao giờ có hạng. **Quyết:** thêm ô loại giấy tờ, số bằng lái, hạng **cùng lúc** mở Tài xế đối tác; tới lúc đó cột nằm trong danh sách «chờ ô», có tên trong bài kiểm.

**Đ9 — Bài kiểm máy chặn lệch biểu mẫu với nơi lưu.** Một tệp ánh xạ duy nhất (tên giữ chỗ `src/shared/dang-ky-truong.ts`): mỗi trường của biểu mẫu → bảng phiếu, cột phiếu, nơi lưu sau duyệt (hoặc «chỉ phiếu»). Giao diện dựng ô từ tệp này; máy chủ dựng tập trường nhận được (thay `TRUONG_GUI`) từ tệp này. Bài kiểm (tên giữ chỗ `src/dang-ky-truong-khop-cot.test.ts`) đỏ khi một trong bốn điều sai:

1. tập ô biểu mẫu dựng (đọc từ `web/dang-ky.ts` qua tệp ánh xạ) bằng tập khoá của tệp ánh xạ;
2. tập trường máy chủ nhận bằng tập khoá đó;
3. cột của `dk_submission`, `dk_submission_org` (đọc bằng `PRAGMA table_info` trên một CSDL SQLite trong bộ nhớ đã áp mọi migration — đúng cách `src/hang-du-lieu.test.ts` đang đọc cột) trừ một **danh sách có tên** các cột hệ thống hoặc máy tính (`id`, `registration_id`, `version`, `phone_key`, `number_key`, khoá chuẩn hoá mã số thuế, `policy_id`, `consented_at`, `erased_at`, dấu vết…) bằng tập cột mà tệp ánh xạ trỏ tới;
4. cột «người dùng khai» của `pty_person`, `pty_organization`, `pty_person_document`, `pty_organization_document` (cũng trừ danh sách có tên) đều có ít nhất một trường trỏ tới; cột thêm mới vào các bảng đó mà không ai xếp loại thì đỏ.

Danh sách «chờ ô» (hôm nay chỉ `license_class_code`) có ngày hết hạn trong tệp ánh xạ; quá hạn thì đỏ. Hàng rào mới có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật (thêm một cột giả → đỏ → hoàn nguyên).

## Phương án bị loại

- **Lấy danh sách từ `prc_beneficiary_role` (loại được hưởng):** sót «Tài xế đối tác» (không hưởng hoa hồng), trái lời chủ «khớp mọi vai»; và đó là bảng của `pricing`, `dang-ky` không có cạnh tới.
- **Lấy từ hằng `ROLES` trong mã:** loại do Kế toán thêm không bao giờ hiện — đúng điều chủ muốn bỏ.
- **Loại phiếu «tổ chức» riêng (đổi `kind`):** loại phiếu chọn trước khi điền và không đổi được; người đăng ký phải bỏ phiếu làm lại nếu đổi ý; hai loại phiếu lặp lại toàn bộ phần cá nhân.
- **Phần tổ chức nằm thêm cột trong `dk_submission`:** bảng cá nhân phình gấp đôi, cột tổ chức rỗng ở phần lớn phiếu, trigger ẩn danh khó đọc.
- **Duyệt loại Kế toán thêm bằng cách mở kèm «Cộng tác viên»:** hai loại cùng có mức ở một bậc ⇒ «thiếu mức», đơn bị giữ (ADR-0117 Đ2).
- **Bỏ hẳn Tài xế đối tác khỏi danh sách:** trái lời chủ; hiện «chưa mở được» và nói thiếu gì thì minh bạch hơn.

## Bài kiểm (đỏ trước, xanh sau)

- Thêm một dòng `pty_role_type` có cờ loại đối tác: `GET /api/dang-ky/cau-hinh` của Toàn quyền có loại đó trong danh sách chọn; tắt loại: biến mất; biểu mẫu công khai không hiện loại đã tắt dù chính sách còn mã.
- Vai nội bộ bất kỳ, vai nhóm `OTHER` không cờ: lệnh đổi chính sách 400.
- Mở «Công ty lữ hành» khi chưa có ADR-0213 hoặc chưa có chính sách riêng tư mang mục đích tổ chức: 400. Mở «Tài xế đối tác» hôm nay: 400 kèm câu nói thiếu ô bằng lái và bước chọn nhà xe.
- Gửi phiếu: vai «chỉ tổ chức» không có phần tổ chức: 400; Tài xế đối tác kèm phần tổ chức: 400; gửi lại bỏ phần tổ chức khi vai tổ chức đã khoá: 400. Gửi phiếu có phần tổ chức: đúng một dòng `dk_submission_org` cùng phiên bản; không dòng nào mới ở `pty_party`, `pty_organization`, `pty_organization_document`, `pty_attachment`, `staff` (đếm trước và sau).
- Một nguồn (Đ1.5): thêm một hằng danh sách mã vai đối tác ở tệp khác `roles.ts`: bài quét đỏ; tắt loại ở `pty_role_type` mà không tắt ở `prc_beneficiary_role`: bất biến đỏ; biểu mẫu hiện đúng tên loại `LD_…` lấy từ máy chủ, không hiện mã thô.
- Phiếu vai cá nhân rỗng khi ADR-0213 chưa thi công: 400 lúc gửi (cả khi vai tổ chức là `LD_…`).
- Gắn hồ sơ tổ chức có sẵn: sau duyệt không có dòng «người quản lý của».
- Duyệt loại `LD_…`: hồ sơ có đúng một vai (loại đó), tài khoản có đúng quyền Đối tác (dòng chỉnh tay); đơn đầu tiên của tài khoản không bị giữ «thiếu mức» khi loại có mức riêng (ca sổ vàng mới).
- Duyệt phiếu có phần tổ chức: đúng một hồ sơ tổ chức (hoặc không có hồ sơ mới khi gắn), vai của tổ chức, giấy tờ, dòng xác minh của tổ chức ghi người và giờ xác minh, cấp mặc định trên hồ sơ tổ chức, một liên kết người ↔ tổ chức; giả lỗi giữa lô thì không còn dòng nào. Số GPKD đã thuộc tổ chức khác: 409 trước lô.
- Câu chốt: phiếu có phần tổ chức mà thiếu kết luận Danh bạ của tổ chức: lô hỏng toàn bộ. «Trả về xác minh» xoá cả hai kết luận Danh bạ.
- Đ9: bốn chiều của bài khớp cột; phá thử từng chiều một lần.
- Lịch sử phiếu, `audit_log`, phản hồi lỗi không chứa mã số thuế, số GPKD (khuôn `giay-to-khong-lo-so`). Ẩn danh: dòng `dk_submission_org` đổi đúng khuôn, tệp tổ chức gỡ.
- e2e: chuỗi gửi phiếu có phần tổ chức → xác minh → duyệt → kích hoạt. Kịch bản Chrome cho biểu mẫu có phần tổ chức ở 390 và 1280.

## Người dùng sẽ thấy

Toàn quyền thấy danh sách vai mở được cho đăng ký gồm mọi vai đối tác của hệ thống và mọi loại Kế toán thêm; vai nào chưa đủ điều kiện thì hiện mờ kèm lý do. Người đăng ký điền phần thông tin của mình như cũ, có thêm ô Giới tính, và gạt «Tôi đăng ký cho cả tổ chức» thì hiện phần tổ chức: tên tổ chức, tên pháp lý, mã số thuế, địa chỉ, email nhận hoá đơn, số GPKD và ảnh GPKD. Quản trị xác minh thấy hai nhóm mục và đối chiếu Danh bạ hai lần (người, tổ chức). Nhân sự duyệt một lần là có cả hồ sơ người lẫn hồ sơ tổ chức.

## Hệ quả

- Migration số kế tiếp lúc thi công (liệt kê mọi nhánh trước khi đặt số): bảng `dk_submission_org`, cột mới của `dk_registration`, tạo lại ba trigger của `dk_registration`, trigger câu chốt, trigger tập đóng mục xác minh, dòng gieo mục bắt buộc của tổ chức. `docs/data-dictionary.json` + `npm run dict`; cột mới vào tập ghim của `src/hang-du-lieu.test.ts`.
- Hàng rào sửa có chủ đích: bài đối chiếu `MUC_XAC_MINH_MO` ↔ trigger, bài khớp chính sách đăng ký (`chinh-sach-route.test.ts`), bài tách hồ sơ cá nhân ở xác minh. Mỗi hàng rào mới có dòng ở `docs/SO-HANG-RAO.md`.
- Chữ mới trên giao diện tra `docs/BANG-THAM-CHIEU.md`; chưa có thì khai «chờ chọn» (Hiến chương 5.27). Chữ đề xuất ở trang trình.
- **Phải nói thẳng:**
  - Đặc tả mục 6 nói email của người đăng ký «chưa ghi vào hồ sơ». **Mã hôm nay đã ghi**: lô duyệt chép email liên lạc của phiếu thành liên hệ «Email» của hồ sơ cá nhân (`duyet-route.ts`, `emailLienLacCuaPhieu`). Không có việc gì phải làm cho điểm này.
  - Phiếu «chỉ tổ chức» chỉ dùng được khi ADR-0213 đã thi công. Nếu chỉ lượt A lên trước, người đăng ký có vai cá nhân vẫn khai được tổ chức của mình (hồ sơ tổ chức sinh ra, nối «Người liên hệ của»), nhưng chưa ai đặt đơn thay mặt tổ chức được.
  - Đối chiếu tổ chức theo tên có thể sót tổ chức viết tên khác; mã số thuế và số GPKD là khoá đáng tin hơn nhưng người đăng ký có thể khai sai.
  - Chưa có luật sư xác nhận thời hạn giữ dữ liệu tổ chức.

## Phụ lục A — Đối chiếu trường biểu mẫu ↔ cột (đọc mã ngày 16/11)

Nguồn đọc: `web/dang-ky.ts` (ô biểu mẫu), `src/modules/dang-ky/phieu-route.ts` (`TRUONG_GUI`, `kiemBanKhai`), `migrations/0170_dang_ky.sql` (`dk_submission`, `dk_identity`), `migrations/0171_tep_cho_dang_ky.sql` (tệp chờ), `src/index.ts` (`loDuyetDangKy`), `src/modules/dang-ky/duyet-route.ts`.

### A.1 Phần cá nhân (đang có)

| Trường trên biểu mẫu | Cột của phiếu | Nơi lưu sau duyệt | Tình trạng hôm nay | Quyết định |
|---|---|---|---|---|
| Email (bước 1) | `dk_identity.subject`, `contact_email` | liên hệ «Email» của hồ sơ (`pty_contact_point`) | khớp | giữ |
| Mã 6 số | `dk_email_code` (chỉ bản băm) | không | bảng kỹ thuật | ngoài phạm vi bài khớp (danh sách có tên) |
| Vai người dùng xin đăng ký | `dk_registration.role_code` | vai của hồ sơ (`pty_party_role`) + quyền | khớp | nguồn danh sách đổi theo Đ1 |
| Họ tên (một ô) | `family_name`, `middle_name`, `given_name` | `pty_person` ba cột + tên hiển thị | khớp (máy tách một ô thành ba cột) | giữ; tệp ánh xạ ghi «một trường → ba cột» |
| Ngày sinh | `birth_date` | `pty_person.birth_date` | khớp | giữ |
| Số điện thoại | `phone_value` (`phone_key` máy tính) | số đăng nhập `staff.phone` + liên hệ «Số điện thoại» | khớp | giữ; `phone_key` vào danh sách cột máy tính |
| Địa chỉ | `address_value` | liên hệ «Địa chỉ» | khớp | giữ |
| (không có ô; giao diện gửi cứng «CCCD») | `document_type_code` | `pty_person_document.document_type_code` | cột có giá trị cố định | thành ô chọn khi mở Tài xế đối tác (Đ8); tới lúc đó tệp ánh xạ ghi «giá trị cố định» |
| Số căn cước | `document_number` (`number_key` máy tính) | `pty_person_document` | khớp | giữ |
| Ngày cấp / Nơi cấp / Ngày hết hạn | `issued_date`, `issued_place`, `expiry_date` | `pty_person_document` | khớp | giữ |
| **(không có ô)** | `license_class_code` | `pty_person_document.license_class_code` | **lệch: cột không có ô** | thêm ô cùng lúc mở Tài xế đối tác; tới lúc đó «chờ ô» có hạn (Đ8, Đ9) |
| **(không có ô; máy chủ nhận `gioiTinh`)** | `gender` | `pty_person.gender` | **lệch: cột và máy chủ có, biểu mẫu không** | thêm ô «Giới tính» tuỳ chọn (Đ8) |
| Người giới thiệu | `referrer_text` | không chép; người xác minh chọn hồ sơ → quan hệ «Người giới thiệu của» | khớp (cột chỉ của phiếu) | giữ, ghi «chỉ phiếu» |
| Ảnh mặt trước / mặt sau căn cước | `pty_registration_attachment` (ô `CCCD_MAT_TRUOC`, `CCCD_MAT_SAU`) | tệp của hồ sơ (`pty_attachment`) | khớp | giữ |
| Đồng ý chính sách riêng tư | `policy_id`, `consented_at` | `pty_consent` | khớp | giữ |

Cột «người dùng khai» của hồ sơ cá nhân không có trường: **không thấy** (`pty_person` có họ, đệm, tên, giới tính, ngày sinh — đều có trường sau Đ8). Cột `label`, `is_primary` của liên hệ là cột máy điền. **Chưa kiểm:** các cột thêm vào `pty_person` bởi nhánh khác chưa gộp.

### A.2 Phần tổ chức (mới, Đ4)

| Trường trên biểu mẫu | Cột của phiếu (`dk_submission_org`, tên giữ chỗ) | Nơi lưu sau duyệt | Ghi chú |
|---|---|---|---|
| Vai của tổ chức | `dk_registration.org_role_code` | vai của hồ sơ tổ chức | danh sách theo Đ1, Đ2 |
| Tên tổ chức (tên thường gọi) | `display_name` | `pty_party.display_name` | bắt buộc |
| Tên pháp lý | `legal_name` | `pty_organization.legal_name` | mục xác minh `TEN_PHAP_LY` |
| Mã số thuế | `tax_code` (+ khoá chuẩn hoá máy tính) | `pty_organization.tax_code` | N3 ở phiếu; đề xuất nâng cột hồ sơ từ N2 lên N3 (Đ7); mục `MA_SO_THUE` |
| Địa chỉ tổ chức | `address` | `pty_organization.address` | không ghi thành liên hệ «Địa chỉ» (chỉ hồ sơ cá nhân) |
| Email nhận hoá đơn | `invoice_email` | `pty_organization.invoice_email` | mục `EMAIL_HOA_DON` |
| Số điện thoại tổ chức (tuỳ chọn) | `phone_value` | liên hệ «Số điện thoại» của hồ sơ tổ chức | |
| Số GPKD, ngày cấp, nơi cấp | `gpkd_number` (+ khoá), `gpkd_issued_date`, `gpkd_issued_place` | `pty_organization_document` loại `GPKD` | GPKD không có ngày hết hạn (`has_expiry = 0`) |
| Ảnh GPKD | `pty_registration_attachment` ô mới | tệp của hồ sơ tổ chức | bắt buộc khi có phần tổ chức |
| Giấy phép thêm (tuỳ chọn): loại, số, ngày cấp, nơi cấp, hết hạn, ảnh | các cột `extra_*` | `pty_organization_document` loại đã chọn | loại lấy từ `pty_organization_document_type` đang bật |
| «Tôi được tổ chức cho phép đăng ký thay» | `authority_confirmed_at` | không chép (chứng cứ của phiếu) | thêm vào chính sách riêng tư (Đ7) |

Cột «người dùng khai» của `pty_organization` không có trường: **không thấy** (tên pháp lý, mã số thuế, địa chỉ, email hoá đơn đều có trường). Tên cột ở bảng A.2 là tên giữ chỗ; kế hoạch thi công chốt tên thật và tệp ánh xạ là nơi duy nhất ghi chúng.
