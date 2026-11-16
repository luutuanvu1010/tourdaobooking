# Trang ghép: ADR-0212 + ADR-0213 (CLAUDE.md §9)

> Hồ sơ có ngày 16/11/2026 (bản sửa sau soát độc lập lần 1 và ba câu chủ chốt 16/11), đi kèm lượt duyệt `TRINH-CHU.md`. Lượt này có **2** quyết định chạm quyền và dữ liệu (dưới trần 3). Mọi tên bảng, cột, hàng quyền mới là tên giữ chỗ; kế hoạch thi công chốt tên thật. Điều gì ở đây lệch với hai ADR thì ADR thắng.

## 1. Bảng dùng chung nay chứa những loại thực thể nào

| Bảng (module chủ) | Hôm nay chứa | Sau hai ADR thêm | Ai đọc chung |
|---|---|---|---|
| `pty_party` (parties) | hồ sơ người và tổ chức: khách, đối tác, nhân viên, nhà xe, công ty chủ | hồ sơ tổ chức **sinh từ phiếu đăng ký** (bên đặt không đăng nhập) | mọi module qua view |
| `pty_organization`, `pty_organization_document` (parties) | tổ chức do văn phòng nhập | giá trị đã xác minh của tổ chức tự đăng ký; GPKD và một giấy phép thêm | Danh bạ, biên nhận |
| `pty_party_role` (parties) | vai với Tour Đảo, gồm vai bên ngoài và loại Kế toán thêm | vai của tổ chức tự đăng ký; hồ sơ cá nhân **chỉ mang một loại Kế toán thêm** (không vai gốc) | `staff` (sinh quyền), `pricing` (người hưởng) |
| `pty_party_relationship` (parties) | Người liên hệ của, Tài xế của, Người giới thiệu của | **Người quản lý của** (đúng một mỗi tổ chức), **Thành viên của**; cột `replaced_by_id` | `staff` (LC-1c), gốc lắp ráp (tư cách, cờ xem) |
| `pty_verification_requirement`, `pty_verification` (parties) | mục bắt buộc và dòng xác minh của **cá nhân** | mục và dòng xác minh của **tổ chức** | dấu xác minh (ADR-0210) |
| `pty_registration_attachment` (parties) | tệp chờ: hai mặt căn cước | ảnh GPKD, ảnh giấy phép thêm | `dang-ky` |
| `pty_org_invite` (parties, **mới**) | — | lời mời làm thành viên (băm mã, số đã chuẩn hoá, hạn, trạng thái «đang giữ cho phiếu») | chỉ `parties`, gốc lắp ráp |
| `pty_org_member_mode` (parties, **mới**) | — | chế độ thành viên của từng tổ chức («Chỉ soạn» / «Soạn và gửi»), chỉ thêm dòng | gốc lắp ráp tiêm cho `orders` |
| `ord_member_submit` (orders, **mới**) | — | nháp của thành viên đang chờ người quản lý (mở, đã gửi lên, trả lại, rút) | chỉ `orders` |
| `dk_registration`, `dk_submission`, `dk_submission_org` (**mới**) (dang-ky) | phiếu cá nhân | vai của tổ chức, kết luận Danh bạ của tổ chức, phần tổ chức bất biến, mã mời | chỉ `dang-ky` |
| `staff`, `stf_permission` (staff) | tài khoản người; quyền sinh từ vai | tài khoản **chỉ có quyền Đối tác mà hồ sơ không mang vai** (người chỉ làm cho tổ chức, ADR-0213 Đ9); tài khoản quyền Đối tác **sinh trực tiếp** cho loại Kế toán thêm (ADR-0212 Đ3). **Không** có dòng `staff` nào cho tổ chức | mọi cổng |
| `audit_log` (audit) | nhật ký; vai đang đóng | bên đang thay mặt (tự điền từ bối cảnh lệnh lập/lưu đơn) | Lịch sử, lính gác ADR-0125 |
| `orders` (orders) | đơn; bên đặt là người hoặc tổ chức (văn phòng lập); nháp chỉ người lập thấy (ADR-0135) | đơn **do tài khoản cá nhân lập với bên đặt là tổ chức**, bên đặt chốt lúc lập; **nháp của thành viên tổ chức người quản lý thấy được** (ngoại lệ có tên); người gửi có thể khác người lập | billing, pricing qua view |
| `prc_party_tier` (pricing) | cấp riêng của hồ sơ | cấp mặc định cho hồ sơ tổ chức tự đăng ký | lô duyệt |

## 2. Dòng bản đồ quyền chạm các bảng này, áp cho loại nào

| Hàng quyền (`src/shared/permissions.ts`) | Hôm nay | Sau hai ADR | Đổi nghĩa? |
|---|---|---|---|
| `order.view`, `money.view`, `order.history.view`, `order.modify` — cột Đối tác `own`; `contact.view` — cột Đối tác `ownOrAssigned` (vế `own` đổi như các hàng kia, vế `assigned` giữ nguyên) | đơn có `orders.staff_id` = tài khoản gọi | **thêm:** đơn có bên đặt là tổ chức mà người gọi **đang là người quản lý** (cờ `quanLyBenDat`, tiêm từ gốc). Thành viên: không đổi | **có** — nghĩa của `own` cột Đối tác rộng ra cho người quản lý |
| `order.submit` — cột Đối tác `own` | gửi đơn mình lập | bên đặt là tổ chức thì **chỉ người quản lý có hiệu lực** gửi lên Tour Đảo (chủ chốt 16/11); bên đặt cá nhân như cũ | **có** |
| Luật đọc / ghi nháp (`src/shared/xem-don-nhap.ts`, không phải hàng quyền) | chỉ người lập (ADR-0135 Đ1–Đ2) | thêm người quản lý có hiệu lực cho nháp của thành viên tổ chức: chế độ «Chỉ soạn» mọi nháp, «Soạn và gửi» nháp đã gửi tới | **có — nới ADR-0135, chủ đã chọn** |
| Đặt chế độ thành viên (vai trên đối tượng + Toàn quyền, không thêm hàng) | — | người quản lý có hiệu lực của tổ chức; Toàn quyền | mới |
| `dai-ly.nop.xem`, `dai-ly.nop.ghi`, `payment.proof.view` — cột Đối tác `own` | phiếu nộp của đơn có bên đặt = hồ sơ của tài khoản (`coPhieuNopTien`) | bên đặt = bên đang thay mặt hoặc tổ chức mình quản lý | **có** (đầu vào `partyId` đổi) |
| Sổ của tôi, khoản của tôi (route billing, xét `staff.partyId`) | hồ sơ của tài khoản | người quản lý: thêm sổ của tổ chức; thành viên: chỉ của mình | **có** |
| `partner.org.manager.write` (**mới**, khuôn `quanLyBanHang()`) | — | Quản lý bán hàng, Quản trị, Toàn quyền `any`; còn lại `none`. Chuyển quyền quản lý chỉ qua hàng này (người quản lý chỉ gửi yêu cầu) | hàng mới |
| Chính sách đăng ký (chỉ Toàn quyền, ADR-0206 Đ9) | chọn trong bốn vai ghi cứng | chọn trong danh sách lấy từ `pty_role_type` (vai bên ngoài + loại Kế toán thêm), lọc theo bảng điều kiện | **có** — tập giá trị đổi nguồn |
| `account.create` (Nhân sự duyệt, ADR-0207) | lô duyệt sinh người + tài khoản | sinh thêm hồ sơ tổ chức, liên kết người ↔ tổ chức | không đổi người được làm; lô lớn hơn |
| `party.verify`, `party.view` (Quản trị xác minh) | mục cá nhân | thêm mục tổ chức, đối chiếu Danh bạ tổ chức | không đổi người được làm |
| `credit.limit.write` (Trả sau) | không tự đặt cho hồ sơ của mình | cũng không cho tổ chức mình đang gắn | siết |
| Không hàng nào khác; **không thêm mã quyền** | | | |

## 3. Cổng nào canh cửa nào

| Cửa | Cổng (máy chủ) | Lớp dữ liệu | Chỗ giao diện ẩn/hiện bị đổi nghĩa |
|---|---|---|---|
| Đổi chính sách đăng ký | Toàn quyền + danh sách từ `parties` + bảng điều kiện vai (ADR-0212 Đ2) | `dk_policy` chỉ thêm | khối «Nhận đăng ký mới»: danh sách ô chọn nay động; vai chưa đủ điều kiện hiện mờ |
| Gửi phiếu có phần tổ chức | cookie đăng ký (5.29) + kiểm vai ↔ phần phiếu | trigger phiên bản, bất biến của `dk_submission_org` | biểu mẫu: công tắc «Tôi đăng ký cho cả tổ chức»; ô vai cá nhân rỗng được khi có phần tổ chức |
| Duyệt phiếu | `account.create`, người duyệt ≠ người xác minh | câu chốt `dk_decision_guard` đòi cả hai kết luận Danh bạ; `pty_organization_document_gpkd_one_org_ins`; LC-1c mới | hàng chờ duyệt: hiện kết luận Danh bạ của tổ chức |
| Lập đơn với một tư cách | hàm tiêm `benDangThayMat(actor, tuCach)`: liên kết đang mở + tổ chức còn vai được hưởng | — | ô «Tư cách» ở Tạo đơn (theo từng đơn); người chỉ làm cho tổ chức chỉ thấy tên tổ chức |
| Lưu nháp | bên đặt chốt lúc lập; khác ⇒ 409; kiểm lại liên kết; `xem-don-nhap.ts` | trigger bên đặt sẵn có | dòng «Bên đặt: <tên>» nay có thể là tên tổ chức; nháp của thành viên hiện trong danh sách của người quản lý |
| Gửi người quản lý xác nhận / Rút lại / Trả lại | `orders` + chế độ của tổ chức (tiêm) + `ord_member_submit` | bảng chỉ thêm | nút «Gửi người quản lý xác nhận» chỉ hiện cho thành viên ở chế độ «Soạn và gửi»; nút «Trả lại» cho người quản lý |
| Gửi đơn lên Tour Đảo (`POST /api/orders/:id/gui-don`, `xac-nhan-route.ts`) | `order.submit` + cờ `quanLyBenDat`; tách người lập / người gửi (`nguoiLapLaNguoiBam`, `canChotGioCuaNguoiLap`); hôm nay 409 «chỉ gửi nháp của chính bạn» | — | nút «Gửi đơn» **ẩn với thành viên** khi bên đặt là tổ chức; hiện với người quản lý trên nháp của thành viên |
| Tin cho người quản lý / thành viên | hộp thư đi (5.16), không trong lô ghi đơn | trạng thái chờ | ngăn «Của tôi» của người quản lý có thêm loại tin; lưu nháp vẫn không báo ai (ADR-0045) |
| Đặt chế độ thành viên | người quản lý có hiệu lực hoặc Toàn quyền | `pty_org_member_mode` chỉ thêm | khối chế độ ở bảng điều khiển người quản lý và ở chi tiết hồ sơ tổ chức (Toàn quyền) |
| Xem đơn, sổ công nợ tổ chức | ô `own` cột Đối tác + cờ `quanLyBenDat` | — | «Đơn của tôi» của người quản lý gồm đơn tổ chức; khối sổ công nợ tổ chức chỉ người quản lý thấy |
| Mời, gỡ thành viên | vai trên đối tượng (người quản lý có hiệu lực) hoặc `partner.org.manager.write` | trigger hai đầu | màn «Thành viên» cho người quản lý |
| Chuyển / giao người quản lý | **chỉ** `partner.org.manager.write`; người quản lý chỉ tạo yêu cầu | chỉ mục duy nhất người quản lý; trigger `replaced_by_id` | nút «Chuyển quyền quản lý» ở Danh bạ chỉ hiện cho ba vai văn phòng; người quản lý thấy «Gửi yêu cầu chuyển» |
| Ghi quan hệ ở Danh bạ (`POST /api/parties/:id/relationships`) | `validateRelationship` **từ chối** `MANAGER_OF`, `MEMBER_OF` | — | ô chọn loại quan hệ ở Danh bạ không có hai loại này |
| Lô duyệt phiếu gắn tổ chức **có sẵn** | không bao giờ mở «người quản lý của»; chỉ «thành viên của» khi có lời mời giữ chỗ | — | hàng chờ duyệt nói rõ «văn phòng sẽ giao người quản lý» |
| Nhận lời mời | số đăng nhập trùng số mời; tài khoản hợp lệ; trần (tổ chức: nói thật; theo số: câu trung tính, không mã giả) | băm mã, một lần, hạn; phiếu đăng ký chỉ lưu mã định danh lời mời | lời mời trong ứng dụng chỉ chính chủ số thấy |
| Cấp quyền Đối tác | `staff` | LC-1c tạo lại (thêm vế liên kết); **trigger anh em mới** chặn mọi quyền ngoài Đối tác cho tài khoản chỉ có liên kết (LC-1 và trigger nhãn không bắt ca này); LC-1, LC-1b, `adr0117_permission_partner_label_internal` giữ; bất biến `R-LC-1c`, `R-DK-4` mở rộng cùng vế | màn Quản lý tài khoản: tài khoản không vai mà có quyền Đối tác (người chỉ làm cho tổ chức) không còn là «thiếu vai trò» khi có liên kết |
| Tự bật Trả sau | `TU_DAT_TRA_SAU` thêm vế tổ chức đang gắn | — | — |

**Chỗ chỉ dựa vào máy chủ (nói thẳng):** chặn gắn tài khoản nội bộ hay Tài xế đối tác vào tổ chức (trigger của `parties` không đọc được `staff`); nghĩa rộng của ô `own` (một hàm trong `permissions.ts`, các route phải truyền cờ — có bài quét). Lưới thứ hai: bất biến định kỳ ở `scripts/audit-checks.mjs`.

**Ước lượng lại việc (sau khi chủ chọn đơn thành viên qua người quản lý):** ADR-0213 lớn hơn bản đầu khoảng một phần ba — thêm trạng thái chờ người quản lý, tách người lập / người gửi ở luồng Gửi đơn (đụng các bài kiểm vé, mốc giờ, Trả sau lúc gửi), sửa `xem-don-nhap.ts` và các bài nháp riêng tư, hai loại tin mới. Đề xuất chia thi công ADR-0213 thành hai phần phát hành riêng: (1) liên kết, tư cách theo đơn, lời mời; (2) đơn thành viên qua người quản lý. Ước lượng là của người soạn, chưa có số đo.

**Lỗ đang hở:** cả hai ADR xây trên HC-5.19 — không chỉ thêm bảng mà còn tạo lại trigger đang chạy và đổi cách chọn bên đặt; khôi phục thì phải cài lại bản mã cũ (chưa diễn tập). Câu mẫu hỏi chủ lên trước hay sau buổi diễn tập; khoá đề xuất `xay_tren_cho_phep_adr_0212_0213`. Không chạm HC-4.2.
