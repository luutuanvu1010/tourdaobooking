# ADR-0191 — Tài khoản xem được mọi khách do Nhân sự tạo thì PIN đầu do Quản trị hoặc Toàn quyền cấp (phát hiện Q-06)

- **Trạng thái:** proposed 2026-11-09 — AI soạn theo kế hoạch `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` (chủ duyệt kế hoạch 9/11, Phần VIII mục 5.1), thuộc **ADR lượt B** (trang ghép `docs/superpowers/specs/2026-11-09-trang-ghep-adr-luot-b.md`, trang trình `docs/superpowers/specs/2026-11-09-trinh-chu-adr-luot-b.md`). Người kiểm độc lập chỉ đọc kiểm một vòng bản nháp; hai lỗi sự thật người kiểm nêu (vai Quản lý bán hàng; đường vòng qua Quản trị) đã sửa ở bản này. Chưa có mã.
- **Số:** 0191 (soát như ADR-0188; giữ chỗ 0188–0193 ở thư mục ghi chú chung).
- **Nguồn:** hồ sơ rà soát `docs/superpowers/specs/2026-11-07-ra-soat-truoc-launch-lan-2/phu-luc/02-quyen-doi-tac-ve-xe.md` mục Q-06 (mục cũ D-2 của kiểm toán 13/10): Nhân sự tạo tài khoản quyền Bán hàng (cả đường quyền lẫn đường vai) ⇒ 201 kèm PIN; tài khoản đó mở đơn thấy SĐT khách, trong khi chính Nhân sự không xem được đơn. Kế hoạch chọn hướng «PIN đầu do Quản trị cấp» (phương án (b) của hồ sơ rà, chủ duyệt kế hoạch). Dẫn chứng mã đọc lại trên `main` @`fa3fd859a`.
- **Ngày:** 2026-11-09. **Loại:** việc lớn (quyền tài khoản) — người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều (đổi phản hồi và một điều kiện ở route; không migration).
- **Sửa:** ADR-0071 điều 1f (câu nguyên văn ở bảng dưới). Không sửa nguyên văn ADR-0071.
- **Liên quan:** ADR-0071 điều 1b–1e (Nhân sự tạo, sửa, gán vai; không làm hỗ trợ đăng nhập), ADR-0042 (đặt lại PIN là Quản trị, Toàn quyền), ADR-0090 (tài khoản quyền tiền chỉ Toàn quyền), ADR-0018 điều 5 / LC-4 (chỉ Toàn quyền cấp Quản trị, Toàn quyền, Nhân sự), ADR-0083 điều 1a (đường gán quyền kiểu cũ chỉ Toàn quyền), ADR-0169 (vai Quản lý bán hàng chỉ Quản trị, Toàn quyền gán).
- **Xây trên lỗ đang hở:** không.
- **Số quyết định chạm quyền/dữ liệu:** 1 (gồm cả đường gán vai sau khi tạo, mục 3).

## Bối cảnh

`POST /api/staff` (`src/modules/accounts/index.ts`) hỏi ô `account.create` = Nhân sự, Toàn quyền (Quản trị không tạo tài khoản từ ADR-0071 điều 1b). Cả hai đường tạo (theo vai và kiểu cũ) trả `{ staff, pin }`: máy chủ sinh PIN, hiện một lần cho người tạo (ADR-0071 điều 1f). Nhân sự vì vậy biết PIN của một tài khoản xem được tên, SĐT mọi khách — việc chính Nhân sự không được làm (ADR-0071 điều 1e).

Tập «xem mọi khách» rút từ bảng quyền như ADR-0090: các mã có `contact.view = any` — hôm nay là SALES, ACCOUNTING, ADMIN, SUPER_ADMIN (SALES_MANAGER luôn kèm SALES). LC-4 và ADR-0090 đã cấm Nhân sự gán ADMIN, SUPER_ADMIN, HR và quyền tiền (ACCOUNTING); vai Quản lý bán hàng (`SALES_MANAGER`) chỉ Quản trị, Toàn quyền gán (`chiQuanTriGan`, `src/shared/roles.ts`). Nên thực tế chỉ còn **vai Bán hàng (`SALES_STAFF`)**. Tài khoản Thực hiện (`FIELD`, `contact.view = assigned`) thấy tên, SĐT của đơn được giao nhưng không thuộc tập — có chủ ý: chỉ khoanh tài khoản xem được mọi khách.

Đường vòng: Nhân sự có ô `account.edit` và gán vai qua `PUT /api/staff/:id/roles`. Nhân sự tạo một tài khoản không xem khách (ví dụ Tài xế công ty, nhận PIN), rồi gán thêm vai Bán hàng ⇒ cùng kết quả. (Đường gán quyền kiểu cũ `PUT /api/staff/:id/permissions` đã chỉ Toàn quyền, ADR-0083 điều 1a.)

## Quyết định

1. **Tạo tài khoản:** khi người tạo **không** giữ `admin.manage` (tức Nhân sự) và tập mã quyền của tài khoản mới có ít nhất một mã thuộc tập «xem mọi khách» (rút từ `MATRIX["contact.view"]`, không liệt kê tay), máy chủ vẫn tạo tài khoản với PIN ngẫu nhiên không ai biết, nhưng **không trả PIN**: phản hồi mang `pin: null` và một cờ nói «chờ Quản trị cấp PIN». Áp cả hai đường tạo (theo vai, kiểu cũ). Toàn quyền tạo thì nhận PIN như hôm nay. Nhân sự tạo tài khoản không xem khách (Tài xế công ty, Đối tác, Tài xế đối tác, Thực tập …) vẫn nhận PIN như hôm nay.
2. **Cấp PIN đầu:** Quản trị hoặc Toàn quyền bấm «Đặt lại PIN» có sẵn (`POST /api/staff/:id/reset-pin`, ô `account.access.manage` + cấp bậc `mayManage`) rồi giao PIN tận tay. Không thêm route, không thêm ô.
3. **Gán vai sau khi tạo — khuyến nghị (a):**
   - **(a) Chặn (khuyến nghị, an toàn):** `PUT /api/staff/:id/roles` do người không giữ `admin.manage` gọi mà làm tài khoản **có thêm** mã thuộc tập «xem mọi khách» (trước không có, sau có) ⇒ 403, câu «Vai này cho xem thông tin khách — nhờ Quản trị hoặc Toàn quyền gán.» Quản trị (có `account.edit`) gán được như hôm nay. Bỏ bớt vai, gán vai không xem khách: không đổi.
   - (b) Cho gán nhưng máy chủ đổi PIN thành số ngẫu nhiên không ai biết và đóng mọi phiên của tài khoản trong cùng lô; Quản trị cấp PIN mới như mục 2. Không chặn việc của Nhân sự, nhưng người đang dùng tài khoản bị đăng xuất bất ngờ.
   - **Rủi ro còn lại, nói thẳng:** (a) không đóng ca Nhân sự tạo tài khoản không xem khách (nhận PIN), rồi **Quản trị** gán thêm vai Bán hàng — Nhân sự vẫn biết PIN cũ. Máy không biết ai đang biết PIN (không có cột nào ghi điều đó). Giảm thiểu đề xuất: hộp gán vai của Quản trị nhắc một dòng «Nếu người khác đã biết PIN của tài khoản này, bấm Đặt lại PIN sau khi gán.» Muốn đóng hẳn thì chọn (b) cho mọi người gán (đổi PIN và đăng xuất mỗi lần tài khoản có thêm mã xem mọi khách).
4. **Hợp đồng phản hồi:** `StaffWithPinResponse.pin` (`src/shared/contracts.ts`) đổi từ `string` sang `string | null`, thêm cờ chờ cấp PIN; giao diện đọc phản hồi tạo tài khoản sửa theo.
5. **Giao diện màn Quản lý tài khoản** (màn của Nhân sự): phản hồi `pin: null` thì thay hộp «PIN của tài khoản mới» bằng câu «Tài khoản này xem được thông tin khách nên PIN đầu do Quản trị cấp. Nhờ Quản trị bấm Đặt lại PIN rồi giao tận tay.» (chữ đề xuất, chủ sửa được; tra `docs/BANG-THAM-CHIEU.md` khi thi công). Nếu chọn 3(a): hộp gán vai của Nhân sự vẫn hiện mọi vai thường; vai bị chặn trả câu ở mục 3 (máy chủ là cổng; ẩn sẵn trên giao diện là việc bề mặt, tuỳ trần gói).
6. **Nhật ký:** dòng tạo tài khoản giữ như hôm nay, thêm hậu tố «— chờ Quản trị cấp PIN» khi rơi vào mục 1. Không ghi PIN, SĐT.
7. **Không đổi:** ai tạo được tài khoản loại nào (LC-4, ADR-0090, ADR-0169), cấp bậc `mayManage`, luật xác thực hai lớp cho tài khoản nội bộ, luật đặt lại PIN.

## Câu ADR bị thay (nguyên văn → mới)

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0071 điều 1f | «**PIN đầu tiên** khi HCNS tạo tài khoản: như Quản trị hiện nay (máy chủ sinh, hiện một lần cho người tạo).» | «**PIN đầu tiên** khi HCNS tạo tài khoản: máy chủ sinh, hiện một lần cho người tạo — **trừ tài khoản có mã quyền xem mọi khách (`contact.view = any`): máy chủ không trả PIN, Quản trị hoặc Toàn quyền cấp bằng «Đặt lại PIN». HCNS không gán thêm vai xem mọi khách cho tài khoản có sẵn** (ADR-0191).» |

## Lý do

Người không được xem khách không nên cầm chìa khoá của tài khoản xem được khách. Dùng lại «Đặt lại PIN» có sẵn: không route mới, không cột mới, Quản trị đã có quyền và cấp bậc đúng. Rút tập từ bảng quyền nên thêm mã mới có `contact.view = any` sẽ tự vào.

## Phương án bị loại

- **Nhân sự chỉ gán vai không mở đơn, không tiền** (phương án (a) của hồ sơ rà): Nhân sự không còn lập được tài khoản Bán hàng — việc hằng ngày khi tuyển người bán.
- **PIN tạm buộc đổi ở lần đăng nhập đầu:** cần cột mới và luồng mới; Nhân sự vẫn dùng được PIN tạm trước người nhân viên.
- **Gửi PIN qua tin nhắn:** chưa có kênh gửi tin ra ngoài.

## Bài kiểm (đỏ trước, xanh sau)

- Sửa `src/modules/accounts/hanh-chinh-nhan-su.test.ts`: Nhân sự tạo tài khoản Bán hàng (đường vai `SALES_STAFF` và đường quyền `SALES`) ⇒ 201, `pin: null`, đăng nhập bằng mọi PIN thử đều sai; Nhân sự tạo Quản lý bán hàng ⇒ vẫn 403 như hôm nay; Nhân sự tạo Tài xế công ty ⇒ vẫn nhận PIN; Toàn quyền tạo Bán hàng ⇒ nhận PIN; Quản trị đặt lại PIN tài khoản đó ⇒ đăng nhập được.
- Nếu 3(a): Nhân sự gán vai Bán hàng cho tài khoản tài xế ⇒ 403, vai không đổi; Quản trị gán ⇒ 200. Nếu 3(b): sau lô, PIN cũ sai và phiên cũ bị đóng.
- Bài canh tập rút từ bảng quyền (thêm một mã giả có `contact.view = any` vào bản sao bảng ⇒ tập đổi theo).
- e2e (chạm API), kịch bản Chrome màn Quản lý tài khoản với tài khoản Nhân sự, ảnh 390 và 1280.

## Người dùng sẽ thấy

Nhân sự tạo tài khoản Bán hàng: tài khoản vẫn được tạo, nhưng màn không hiện PIN mà báo cần nhờ Quản trị cấp PIN. Quản trị (hoặc Toàn quyền) bấm «Đặt lại PIN» ở tài khoản đó rồi giao PIN cho người mới. Tạo tài khoản tài xế, đối tác, thực tập: như hôm nay. [Nếu 3(a):] Nhân sự gán thêm vai Bán hàng cho một tài khoản có sẵn sẽ bị từ chối, phải nhờ Quản trị.

## Hệ quả

- Việc thêm cho Quản trị mỗi lần tuyển người bán: một lần bấm «Đặt lại PIN».
- Khi duyệt: dòng Trạng thái ADR-0071 thêm trỏ về ADR này; `docs/SO-HANG-RAO.md` thêm dòng nếu bài canh tập được coi là hàng rào.
- Trần gói trang Đơn hàng: không chạm (màn tài khoản là trang khác).
