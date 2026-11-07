# Phụ lục 01 — Tiền của đơn, khoản thu và sổ, Trả sau, ngày đầu sau lần xoá (Bước 2, vùng A, B, F, G)

> Nguồn: báo cáo của trợ lý chỉ đọc số 1 (mô hình tầm trung), chép nguyên văn mục 1 tới mục 9 ở «Phần báo cáo của trợ lý». Kịch bản dò của trợ lý nằm ngoài kho (thư mục tạm của phiên), không lưu vào kho theo luật «không viết mã khai thác»; bước tái hiện bằng lời có trong từng phát hiện.

## Phần phiên điều phối tự kiểm lại (T-01, mức CHẶN LAUNCH)

Chạy lại lúc 22:32, từ gốc worktree, trên khung thử `tests/audit/harness.mjs` (D1 giả):
- Kịch bản `a5-tao-tai-khoan.test.ts`: 4/4 đạt, in ra đúng như trợ lý báo — đường quyền cũ (`POST /api/staff` gửi danh sách quyền có Đối tác) cho hồ sơ chỉ mang vai `STAFF:OTHER`, đơn của tài khoản đó chụp hoa hồng `NONE`; đường theo vai trò (gửi vai «Công ty lữ hành») cho vai `TRAVEL_AGENCY:EXTERNAL`, đơn chụp `MISSING/NO_RULE` (đơn bị giữ, có câu báo); đường màn hình cũ (`PUT /api/staff/:id/permissions` đổi một tài khoản chưa gán vai sang quyền Đối tác) trả 200, hồ sơ vẫn chỉ `STAFF:OTHER`, đơn `NONE`.
- Kịch bản `a6-legacy-sua.test.ts`: 1/1 đạt (ghi mức tay cho đơn đã chụp `NONE` bị từ chối; gán vai ở Danh bạ cho hồ sơ có tài khoản bị từ chối, phải gán ở Quản lý tài khoản).
- Đọc mã: `src/modules/pricing/rules.ts`, hàm `nguoiHuongCua` — bên đặt không có vai được hưởng, không có vai nhóm bên ngoài, không có nhãn loại đối tác thì trả `NONE` (coi như khách thường, hoa hồng 0, không giữ đơn). `src/modules/accounts/index.ts`, nhánh chú thích «Đường CŨ … danh sách quyền, hồ sơ mới mang vai STAFF» của `POST /api/staff`.

Phiên điều phối xác định thêm đường nào chạm tới được trên màn hình thật:
- **Tạo tài khoản mới qua màn Quản lý tài khoản thì KHÔNG dính:** biểu mẫu thêm tài khoản của `web/staff.ts` luôn gửi `roles` và bắt «Chọn ít nhất một vai trò», nên hồ sơ luôn mang vai đúng. Đường quyền cũ của `POST /api/staff` chỉ tới được bằng gọi thẳng máy chủ, không có nút nào dùng.
- **Màn hình vẫn mở một đường:** khi sửa một tài khoản chưa gán vai trò, chỉ Toàn quyền thấy khối gập «Quyền cũ (chỉ dùng khi chưa gán vai trò)» (`web/staff.ts`, biến `quyenCu = legacy && meSuper`); tích «Đối tác» ở đó rồi lưu là ra đúng lỗi này. Màn có câu cảnh báo «Tài khoản này chưa gán vai trò, đang dùng quyền cũ… Chọn vai trò để chuyển sang cách mới».
- **Tài khoản kiểu cũ đang có trên bản thật:** chưa kiểm được (không đăng nhập bản thật). Danh sách Quản lý tài khoản ghi nhãn «… (chưa gán vai trò)» cạnh tên quyền cho mọi tài khoản chưa gán vai (`web/staff.ts`, hàm `accessLabel`), nên chủ soát được bằng mắt: dòng nào ghi «Đối tác (chưa gán vai trò)» là dòng có rủi ro. Câu đọc trợ lý đề xuất ở mục 10 dùng đúng ba view có thật (`v_pty_open_role_group` từ migration 0024, `v_pty_open_role` từ 0090, `v_pty_role_type` từ 0095) để soát chính xác hơn; AI không được chạy câu đọc trên D1 bản thật (`CLAUDE.md` §8), chủ tự chạy nếu muốn.
- `scripts/create-staff.mjs` (cửa khẩn cấp bằng SQL, không nhật ký) và `scripts/lam-moi-dev.mjs` (bản Development) cũng tạo hồ sơ chỉ mang vai `STAFF`; chỉ chủ dùng, không phải đường hằng ngày.

Kết luận của phiên điều phối: **ĐÃ XÁC NHẬN**. Giữ mức CHẶN LAUNCH nhưng gói phạm vi: chặn việc **mở cho Đối tác tự lập đơn** cho tới khi soát xong tài khoản Đối tác kiểu cũ (việc nhỏ, làm trên màn hình); không chặn ngày nhân viên bắt đầu dùng. Lớp chặn ở máy chủ (từ chối đơn của Đối tác khi hồ sơ chưa mang vai được hưởng; bỏ đường tạo bằng danh sách quyền) là việc lớn vì chạm quyền và tiền, cần chủ duyệt.

Hai điểm trong báo cáo dưới đã cũ so với tài liệu chuẩn tắc: ADR-0177 đã được duyệt ngày 7/11 (dòng Trạng thái của ADR), không còn «proposed» như trợ lý ghi ở mục 4.

## Phần báo cáo của trợ lý (nguyên văn mục 1–9)
Mã rà: worktree `refactor-invoice-partner-role-e3245d` (HEAD 9f0b60be, nền 5f641781). Bắt đầu 22:08, kết thúc 22:32 ngày 7/11/2026 (đồng hồ máy).
Mọi kịch bản dò nằm ở `<scratchpad>/tien/` (xem mục 10). Không ghi gì vào repo; không chạm bản thật.

## 1. Phạm vi và cách rà
Đã đọc: `src/shared/order-lines.ts` (buildLines), `src/modules/pricing/rules.ts` (chonMuc/chupDon), `src/shared/hoa-hong-dong.ts`, `orders/price-guards.ts`, `orders/xac-nhan-chung.ts`, `orders/tra-sau-cong.ts`, `orders/index.ts` (route lập đơn, PUT, money-edit, ân hạn, booker, thuong-mai), `billing/index.ts` (route sổ), `billing/tra-sau.ts`, `billing/kenh-thu.ts`, `receipt/index.ts`, `shared/router.ts` (lớp vé), `shared/lan-gui-mien.ts`, `src/lan-gui-phu-route.test.ts`, `web/api.ts`, migration 0141/0144, ADR-0161/0173, nhật ký thi công Trả sau, HANDOFF-N1 mục Trả sau.
Đã chạy: 
- 12 kịch bản dò riêng trên khung thử (D1 giả) — chi tiết ở các phát hiện.
- Chạy lại bài có sẵn: `node --test src/tra-sau-xac-nhan.test.ts src/tra-sau-duong-ghi.test.ts src/modules/billing/tra-sau-csdl.test.ts src/modules/billing/kenh-thu.test.ts src/modules/billing/kenh-thu-cong.test.ts` → 75/75 xanh; `node --test src/modules/billing/sau-da-giao.test.ts phai-thu-khong-am.test.ts so-khong-am.test.ts khoa-thang.test.ts src/modules/orders/kenh-thu-chup.test.ts` → 26/26 xanh.
- Phép thử phá (P16) trên bản sao tạm (`git archive HEAD` vào `<scratchpad>/tien/mut`): xoá dòng `...h.cauGacPhienBanTraSau(...)` khỏi `traSauChoXacNhan` (orders/tra-sau-cong.ts) → `src/tra-sau-xac-nhan.test.ts` ĐỎ 4/14 (gồm bài «hai lệnh cùng lúc»). Tức cổng phiên bản của lô xác nhận có bài thật canh. Cây thật không bị sửa.
Không chạy: npm test, typecheck, e2e, audit-invariants (theo lệnh).

## 2. Phát hiện

### T-01 — CHẶN LAUNCH — ĐÃ XÁC NHẬN (trên khung thử, cả đường API lẫn đường màn hình cũ); CHƯA KIỂM có bao nhiêu tài khoản như vậy trên bản thật
**Chuyện gì:** Tài khoản Đối tác tạo bằng «đường cũ» (danh sách quyền, không chọn vai trò) có hồ sơ chỉ mang vai `STAFF` (nhóm OTHER), không mang vai bên ngoài. Máy coi họ là khách lẻ/nội bộ: đơn của họ xác nhận trơn tru, bản chụp hoa hồng là `NONE` (không người hưởng), hoa hồng = 0, KHÔNG giữ ở «Đã giao», KHÔNG câu báo nào. Đơn đã chụp `NONE` không sửa được bằng «ghi mức tay» (409), và Danh bạ không cho gán vai sau (409 `role_via_account`).
**Ai gặp lúc nào:** Đối tác (có tài khoản kiểu cũ hoặc tài khoản tạo bằng API với `permissions: ["PARTNER"]`) lập/gửi đơn ngày đầu; Kế toán không biết; đại lý không nhận hoa hồng; sau đó đối tác khiếu nại, chỉ sửa được bằng «Điều chỉnh công nợ» hai người.
**Bằng chứng:** `src/modules/pricing/rules.ts:72,77` (`nguoiHuongCua` trả `NONE` khi không có vai bên ngoài / loại đối tác); `src/modules/accounts/index.ts:521` (đường cũ: «hồ sơ mới mang vai STAFF», không kiểm vai); không có audit-check bắt «tài khoản PARTNER mà hồ sơ không có vai bên ngoài» (grep `scripts/audit-checks.mjs`: các dòng 32, 1671, 1788, 1915 là chỗ khác). Kịch bản `a5-tao-tai-khoan.test.ts`, `a6-legacy-sua.test.ts`, `a1-sau-xoa.test.ts` (ca VAI=null/CUSTOMER/SUPPLIER/SALES): 
`POST /api/staff {permissions:["PARTNER"]}` → 201, vai mở `["STAFF:OTHER"]`; đơn gửi → `commission_status = NONE`; «Đã giao» 200, không dòng HOA_HONG. Cùng việc với `roles:["TRAVEL_AGENCY"]` → vai `TRAVEL_AGENCY:EXTERNAL`, bản chụp `MISSING/NO_RULE` (giữ đơn, có câu báo). `POST /api/orders/:id/thuong-mai/:sid` → 409 `khong_nguoi_huong` (orders/index.ts:2048). `POST /api/parties/:id/roles` gán TRAVEL_AGENCY → 409 `role_via_account`. Sau khi gán vai qua lối đúng, đơn mới vẫn `NONE` cho tới khi vai có thật.
**Tái hiện bằng lời:** Toàn quyền tạo tài khoản Đối tác bằng đường quyền cũ (hoặc tài khoản cũ chưa gán vai trò) → Đối tác Gửi đơn → xem bản chụp hoa hồng của đơn: «không người hưởng» → Kế toán bấm ghi mức tay: bị từ chối.
**Ba đường sinh ra tài khoản Đối tác thiếu vai (đều chạy/đọc được):** (a) `POST /api/staff` với `permissions:["PARTNER"]` (đường cũ, accounts/index.ts:521); (b) MÀN HÌNH cũ: tài khoản chưa gán vai trò, Toàn quyền đổi quyền sang PARTNER qua `PUT /api/staff/:id/permissions` (web/staff.ts:341; kịch bản `A5-man-hinh-cu` → 200, hồ sơ vẫn chỉ `STAFF:OTHER`, đơn → NONE); (c) nạp hàng loạt bằng `scripts/staff-lib.mjs:43` luôn chèn vai `STAFF` rồi quyền theo tham số (đọc mã, không chạy). Không migration nào bù vai bên ngoài cho tài khoản đang giữ PARTNER (grep `INSERT INTO pty_party_role` trong migrations/: chỉ 0012 chèn `STAFF`, 0030 chèn công ty chủ).
**Câu kiểm đã thử độ đúng trên khung thử:** nền của `setup()` đã có 2 tài khoản PARTNER gieo không vai (đối tác mẫu và tài khoản lai); câu trả 3 dòng sau ca đường quyền cũ, 2 dòng sau ca đường vai trò — tức câu đếm đúng phần dư (+1 chỉ ở đường cũ). Đã lọc `s.active = 1`.
**Hồ sơ cũ:** Chưa có đúng ca này. Gần nhất: BACKLOG §29 `BL-HH-DA-GIAO-KHE` (vai kết thúc SAU khi chụp; đã đổi nghĩa từ 0112) và phụ lục kiểm toán 13/10 `D-quyen-danh-tinh.md:31` K-B-4 (trigger LC-1 chỉ chạy khi INSERT và chỉ khi hồ sơ CÓ vai bên ngoài) — cùng họ «hồ sơ không có vai bên ngoài thì luật coi như người trong», nhưng ca «chưa từng có vai, đơn qua với hoa hồng 0 im lặng» chưa ghi. ADR-0155 C3 chỉ chặn GỠ vai cuối. Giao diện «Quản lý tài khoản» hiện cảnh báo «chưa gán vai trò» (web/staff.ts:358) nhưng máy chủ không chặn.
**Đề xuất:** (1) Trước ngày bán: chủ/Kế toán chạy một câu đọc để liệt kê tài khoản PARTNER còn hiệu lực mà hồ sơ không có vai EXTERNAL / loại đối tác (câu ở mục 10), gán vai bằng «Quản lý tài khoản». (2) Sau đó: chặn máy chủ — Đối tác lập/gửi đơn khi hồ sơ không mang vai được hưởng ⇒ 409 có câu «hồ sơ chưa mang loại đối tác»; thêm R-* cảnh báo. (3) Lối tạo `permissions:["PARTNER"]` nên từ chối. **Việc:** (1) nhỏ (vận hành); (2)-(3) vừa (quyền/tiền → cần chủ duyệt).
**Lưu ý trung thực:** đường màn hình cũ (b) chỉ Toàn quyền đi được và chỉ cho tài khoản chưa gán vai trò; đường mới theo vai (`roles`) luôn gắn vai bên ngoài đúng. Số tài khoản kiểu cũ trên bản thật: CHƯA KIỂM. Mức CHẶN LAUNCH vì đúng định nghĩa «thiếu cấu hình làm Nền tảng tính sai mà không báo» và có đường người dùng thật chạm tới; nếu câu kiểm ở mục 10 trả 0 dòng trên bản thật thì còn là «rủi ro tiềm ẩn» và chủ có thể hạ.

### T-02 — SỬA TRONG TUẦN ĐẦU — ĐÃ XÁC NHẬN
**Chuyện gì:** Đơn đại lý xác nhận khi chưa có Cấp độ/mức hoa hồng vẫn được xác nhận; bản chụp đóng `MISSING/NO_RULE`. Về sau Kế toán nhập mức thì đơn cũ KHÔNG tự sửa; «Chụp bù» chỉ áp đơn CHƯA có bản chụp nào (danh sách `cho-chup-bu` rỗng); chỉ còn «ghi mức tay» từng dòng. Câu báo «Kế toán ghi mức tay cho dòng này» đúng nhưng không nói «thêm mức vào bảng sẽ không sửa đơn này».
**Ai gặp:** mọi đơn đại lý bán trước khi Kế toán nhập xong Cấp độ + mức; Hướng dẫn viên bấm «Đã giao» bị 409 (câu báo hiển thị rõ cho Đối tác, HDV, Kế toán); tiền KHÔNG sai, chỉ tắc.
**Bằng chứng:** kịch bản `a1-sau-xoa.test.ts` (trạng thái sau xoá: `prc_commission_rule` 0, `prc_rate_tier` 0, `prc_beneficiary_role` 5 vai còn): xác nhận 200; `ord_service_terms` = `MISSING/NO_RULE`; `/payments` → `lyDoChuaGiao.ma=terms_missing`; «Đã giao» 409 `not_deliverable`; thêm mức 10% (201) → vẫn 409; `cho-chup-bu` → `{"don":[]}`; đơn MỚI sau khi có mức → `SET 1000bp`. Mã: `pricing/rules.ts:125,135`, `orders/xac-nhan-chung.ts` (không chặn xác nhận khi thiếu mức, theo ADR-0077), `billing/rules.ts:740,814` (câu giữ).
**Hồ sơ cũ:** Một phần: ADR-0077/0079 điều 1 (giữ ở Đã giao, thiết kế có chủ ý); HANDOFF nói Kế toán phải nhập lại cấp/mức trước khi bán. Chưa thấy hướng dẫn «nhập mức TRƯỚC đơn đầu tiên, vì đơn xác nhận sớm phải ghi tay».
**Đề xuất:** thêm vào danh sách việc trước ngày bán (mục 3). Nhỏ: sửa câu báo cho «Thiếu mức hoa hồng — thêm mức ở bảng không tự sửa đơn đã xác nhận; ghi mức tay». Việc nhỏ.

### T-03 — SỬA TRONG TUẦN ĐẦU — ĐÃ XÁC NHẬN
**Chuyện gì:** Đơn Trả sau đã xác nhận mà hết nợ (khách đã nộp đủ vào Công ty) đổi được bên đặt sang đối tác KHÔNG có hạn mức; sau đó «đảo khoản thu» làm đối tác mới mang nợ 600.000 mà chưa từng được cấp hạn mức. Cổng đổi bên đặt (`congDoiBenDatTraSau`) chỉ hỏi «nợ của bên cũ = 0», không kiểm hạn mức của bên mới; đường đảo cố ý không bị chặn hạn mức (ADR-0168 Đ2 mục 4).
**Ai gặp:** Bán hàng/Quản trị đổi bên đặt rồi Kế toán đảo khoản thu — hiếm. Máy có biết: R-CRD-3 cảnh báo «nợ vượt hạn mức» (scripts/audit-checks.mjs, chỉ cảnh báo); màn hạn mức liệt kê bên có nợ dù chưa có hạn mức.
**Bằng chứng:** `g-doi-ben.test.ts`: đơn CREDIT D1 (hạn mức 1.000.000) thu đủ 600.000 Công ty → `PUT /api/orders/:id/booker` sang D2 (không hạn mức) → 200; `POST /api/ledger/adjustments {dao_lan_thu}` → 201; `GET /api/tra-sau/han-muc/pty-D2` → `dangNo 600000, hanMuc null`; lập thêm Trả sau cho D2 → 409 `khong_co_han_muc`. Mã: `orders/tra-sau-cong.ts` (`congDoiBenDatTraSau`).
**Hồ sơ cũ:** Chưa (ADR-0168 chỉ nói «đổi bên đặt» phải hết nợ).
**Đề xuất:** khi đổi bên đặt của đơn Trả sau đã xác nhận, đòi bên mới có hạn mức còn hiệu lực (hoặc chặn đổi). Việc nhỏ-vừa (chạm tiền → cần chủ duyệt).

## 3. Bảng dữ liệu cấu hình phải có trước ngày dùng thật
| Thứ | Ai nhập | Khi thiếu Nền tảng làm gì | Bằng chứng |
|---|---|---|---|
| Danh mục dịch vụ (Sheet) | tự đồng bộ, Admin ghi đè | chưa đồng bộ lần nào thì đồng bộ ngay lúc đọc; thiếu giá ⇒ «Dịch vụ này chưa có giá» (chặn có câu) | catalog/service.ts:54; order-lines.ts (buildLines) |
| Cấp độ đại lý + gán cấp cho đại lý/vai | Kế toán (trang Hoa hồng/Cấp đại lý) | KHÔNG chặn lập/xác nhận; bản chụp `MISSING/NO_RULE`, «Đã giao» bị giữ có câu báo (T-02) | pricing/rules.ts:125,135; billing/rules.ts:740 |
| Mức hoa hồng theo cấp × dịch vụ | Kế toán | như trên; đơn đã xác nhận không tự sửa | a1-sau-xoa.test.ts |
| Vai bên ngoài trên hồ sơ đại lý (TRAVEL_AGENCY…) | Quản lý tài khoản | **chạy sai im lặng**: hoa hồng 0, không giữ đơn (T-01) | pricing/rules.ts:72,77; accounts/index.ts:521 |
| Luật bán theo loại đối tác | Admin (không bắt buộc) | không có luật = bán hết | pricing/luat-ban-* (đọc, không thử) |
| Hồ sơ công ty chủ (tên, MST, địa chỉ, liên hệ «Hotline») | Toàn quyền | thiếu ⇒ `/api/company` 404 và biên nhận 404 «Chưa có thông tin công ty» (chặn có câu); đóng Hotline cuối chưa bị chặn (đã biết CLAUDE.md §10) | company/index.ts:20; receipt/index.ts:36 |
| Tài khoản ngân hàng nhận tiền (QR) | Kế toán/Toàn quyền | QR 409 `bank_account_missing` «Công ty chưa cài tài khoản…» (chặn có câu); đơn Tắt công tắc: không QR | receipt/index.ts:64,59 |
| Mốc 6 giờ / chính sách điều phối | Toàn quyền (bảng `ord`/`dsp` chính sách) | đơn có chặng đưa đón: lập/xác nhận 503 `moc_toi_thieu_chua_co` «Chưa có chính sách điều phối…» (chặn có câu) | orders/index.ts:1256; xac-nhan-chung.ts:44 |
| Xe + Kiểm định + Bảo hiểm | Điều phối | không đi tới xuất bến (không thuộc vùng tiền; không thử) | CLAUDE.md §10 |
| Tài khoản người dùng + vai trò | Nhân sự/Toàn quyền | tài khoản kiểu cũ: xem T-01 | web/staff.ts:358 |
| Mức tối đa Trả sau cho Quản trị | Toàn quyền | Quản trị 403 `chua_co_muc_toi_da`; Toàn quyền vẫn đặt được | billing/index.ts:69 |
| Hạn mức Trả sau từng đại lý | Quản trị/Toàn quyền | đơn Trả sau 409 `khong_co_han_muc` (chặn có câu); đơn Trả trước bình thường | tra-sau-xac-nhan.test.ts (đỏ→xanh) |
| Công tắc «Khách của đối tác trả cho Công ty» | Toàn quyền | không có dòng nào ⇒ BẬT (như trước); không đọc được ⇒ 503 cho Đối tác lập đơn | billing/kenh-thu.ts:9-10; orders/index.ts:1225 |
| Công tắc nhập tay, «Ẩn thông tin khách», giới hạn nhập mức (50%/1.000đ), Chính sách chọn xác nhận | Admin/Toàn quyền | mặc định an toàn: nhập tay TẮT, ẩn khách theo bảng, giới hạn đã gieo ở migration 0137 | orders/price-guards.ts:41; xac-nhan-repo.ts:174 |
Ghi chú: việc BẮT BUỘC theo thứ tự trước đơn đầu tiên của đại lý: (1) vai bên ngoài trên hồ sơ (T-01), (2) Cấp độ, (3) gán cấp, (4) mức hoa hồng, (5) hạn mức Trả sau nếu dùng.

## 4. Đoạn riêng — gỡ lời cấm «chưa cấp hạn mức Trả sau thật»
**Kết luận ngắn: chưa nên gỡ ngay trong lô ngày đầu; gỡ được SAU khi có ba điều kiện, và chỉ với số nhỏ.** Phần cổng tiền đã chắc hơn tôi mong đợi, nên điều kiện không phải sửa mã lớn mà là vận hành và hai việc nhỏ.
Đã kiểm thật: (a) xác nhận hai đơn cùng bên đặt, tổng vượt hạn mức → chỉ một đơn qua (bài gốc + phép thử phá cổng phiên bản làm bài đỏ 4/14); (b) mọi đường làm tăng nợ (sửa tăng số khách, đảo/thay khoản thu, hoàn khách, huỷ dòng sổ, điều chỉnh duyệt, chuyển cọc, phân định, đổi bên đặt, huỷ, Ân hạn) có bảng «ĐƯỜNG GHI chạy thật» ép tăng phiên bản đúng 1 — 75/75 xanh chạy lại; (c) đơn «Khách đã trả đủ» còn nợ bị chặn «Xong và đủ tiền» (bài route thật) và vẫn tính vào nợ (câu `credit_orders...` không lọc `delivered_at`, bỏ lọc ở nhắc); (d) gỡ vai được hưởng cuối cùng khi còn nợ: 409 `con_no_tra_sau`; hạn mức tự đóng khi hết vai (ADR-0181); (e) Đối tác không thấy/không cấp hạn mức (403) và không đọc nợ đại lý khác.
Chưa kiểm được: tranh chấp THẬT hai lệnh trên D1 thật (khung thử chạy tuần tự trong một tiến trình: `g-dua-nhau.test.ts` 5/5 vòng cho ra 200+409 nhưng đó là tuần tự, không chứng minh gì về song song); trigger gác phiên bản vẫn là cơ chế đúng cho D1 (batch là một giao dịch) nhưng là SUY LUẬN cho môi trường thật. e2e/audit chạy do phiên điều phối.
Điều kiện đề xuất trước khi cấp hạn mức thật:
1. Làm xong T-03 (đổi bên đặt phải đòi hạn mức của bên mới) hoặc chủ chấp nhận «rất hiếm, có cảnh báo R-CRD-3».
2. Chủ và Kế toán hiểu cách tính nợ sau «Xong và đủ tiền»: nợ = phần đối tác còn giữ SAU KHI bù hoa hồng (ADR-0177 còn proposed; chủ đã chọn «Khớp sổ đại lý» ngày 6/11) — tức hạn mức trống ra thêm đúng số hoa hồng trước khi tiền về Công ty. Cần có chữ này trong hướng dẫn cho Kế toán.
3. Ban đầu cấp hạn mức nhỏ (≤ 1–2 đơn điển hình), thời hạn trả ngắn, tự đặt mức tối đa Quản trị bằng số thận trọng; mỗi tuần đọc `audit-invariants` (R-CRD-1..5, R-ORD-DC1) và danh sách nợ quá hạn. Tin nhắc quá hạn chạy bằng Cron 15 phút (`src/index.ts:302-305`, `wrangler.jsonc:16`); khi Cron lỗi chỉ ghi log `tra_sau_nhac_loi`, không báo ai — Kế toán nên tự xem danh sách ở màn hạn mức.
4. Làm T-01 trước (đại lý không có vai bên ngoài sẽ không cấp được hạn mức — trigger 0141 chặn, có câu báo — nhưng vẫn lập đơn Trả trước được với hoa hồng 0).
5. ADR-0182/0183 còn proposed (công nợ theo giá đại lý, thu hộ/đặt cọc): hiện hạn mức tính theo tổng giá bán lẻ (thận trọng hơn thực tế), nên chưa ép phải chờ — nhưng chủ cần biết hạn mức đo bằng giá bán lẻ.
Nếu chủ muốn gỡ sớm: có thể gỡ cho MỘT đại lý thử với hạn mức nhỏ, có người theo dõi tay, sau khi điều kiện 2 và 3 xong.

## 5. Đối chiếu mục cũ
- **BACKLOG:125 câu 11 (trần giảm giá nhân viên): CÒN — đã chạy thật lại.** `bf-tien.test.ts` ca B1: Bán hàng đặt `unitPrices {adult:1}` → 201, tổng 2 đồng; `{adult:0}` → tổng 0; `discount` bằng tạm tính (khách lẻ) → tổng 0; xác nhận 200. Thân gửi `total:1` bị bỏ qua (tổng thật 1.000.000 — tốt). Không báo mới; chỉ để phiên điều phối biết chưa có ngưỡng nào.
- **ADR-0094 đ7 giai đoạn 1 (thiếu `Idempotency-Key` cho qua): CÒN, có chủ ý.** `shared/router.ts:704-708` (thiếu header ⇒ `console.warn` rồi cho qua). Lớp vé bọc MỌI route ghi có đăng nhập (`LAN_GUI_MIEN` rỗng; bài `src/lan-gui-phu-route.test.ts` ép), `web/api.ts:157` gửi vé khi có `crypto.subtle` (https). Có lớp chặn trùng nghiệp vụ độc lập: thu tiền mặt cùng số cùng ngày → 409 `co_the_trung` (F1), hoàn không vượt đã trả, nộp không vượt số đang giữ.
- BACKLOG §29 / K-B-4: gần T-01 nhưng không trùng (xem T-01).
- Kiểm toán 13/10 C-1 (mức hoa hồng > giá): ĐÃ XỬ LÝ bằng ADR-0161 Đ4–Đ5 (trần không tính dòng vượt; dòng vượt giữ ở Đã giao); mã `price-guards.ts:tranGiamGiaDon`, `hoa-hong-dong.ts:hoaHongTinhTran`. Không thử lại.
- B-2 (bấm đúp khoản thu thiếu mã): phần mã chống trùng nghiệp vụ còn: thu tiền mặt cùng số cùng ngày 409 `co_the_trung` (thấy ở F1); vé thiếu header vẫn cho qua 
- C-2 (trần điều chỉnh không cộng dồn): không thử.
- HC-5.19 (diễn tập khôi phục), ba cảnh báo audit R-ORD-9, R-CTL-1, R-VC-14: không đụng.
- TRUNG-1, TRUNG-2 (báo cáo kiểm 7/11): bài `sau-da-giao.test.ts` xanh (26/26 chung lô) — nhắc không lọc `delivered_at`; Ân hạn đơn đã xong còn nợ; gỡ vai cuối. Đủ ý để coi là ĐÃ SỬA ở mã (trigger 0146 có trong cây).

## 6. Vùng đã kiểm, sạch
- Tính tiền ở máy chủ: thân gửi `total/subtotal/remainingAmount` bị bỏ qua (B1); mọi dòng qua `buildLines`/`thanhTienDong`; trigger ép `line_total = quantity*unit_price`.
- Cô lập Đối tác với Đối tác (kịch bản `doi-tac-cheo.test.ts`, đơn đã xác nhận của P2): P1 xem/ghi `payments`, `receipt`, `qr`, `delivered`, `money-edit`, `booker`, `status`, `PUT` → 403; `thuong-mai` 404; danh sách đơn không thấy; `bookerPartyId` giả bị bỏ qua (booker = hồ sơ của mình); tự cấp hạn mức 403; đổi công tắc 403; `/ledger/*` 403. (`/api/ledger/balances` trả `{}` rỗng — không lộ.) Ghi chú nhỏ: đơn có thật của người khác trả 403, đơn nháp 404 — UUID không đoán được nên bỏ qua.
- Thu vượt/hoàn vượt: thu 3× tổng được (thành «dư chờ hoàn» + giữ «Đã giao», theo thiết kế); hoàn 10× → 400, hoàn cộng dồn vượt đã thu → 400; số âm/0/lẻ/MAX → 400.
- Điều chỉnh công nợ cần người thứ hai: người tạo tự duyệt → 409 `adjreq_same_person`; người khác (Quản trị) duyệt → 201; yêu cầu trùng → 409.
- Khoá sổ tháng: thu vào tháng đã khoá → 409 `period_closed` (Kế toán và Toàn quyền); chỉ khoá được tháng đã qua.
- Công tắc kênh thu (ADR-0178 A): đơn lập lúc Bật chụp 1, công tắc Tắt sau đó vẫn nhận «Công ty thu» (G1); đơn lập lúc Tắt chụp 0 chỉ nhận người thu = chính Đối tác lập (Kế toán/Toàn quyền/Quản trị 409 `kenh_thu_chi_nguoi_lap`), QR `coQr:false`; lớp trigger 0144 là lớp hai. Rủi ro vận hành (không phải lỗi): khách của đơn Tắt lỡ chuyển khoản thẳng vào Công ty thì Kế toán không ghi được khoản đó qua route thường (409), chưa thấy đường «khoản nhầm».
- Hoa hồng chụp: đổi bảng mức sau xác nhận không đổi đơn (đúng ADR-0077); sửa số khách 2→1 thì hoa hồng tính lại theo thành tiền hiện hành, giảm giá bên đặt chịu giữ nguyên (HOA_HONG 50.000, GIAM_GIA_BEN_DAT 100.000) — đúng ADR-0079 đ8 gạch 3 (`b-chup-doi.test.ts`).
- Đối tác khai «Khách đặt cọc trước»: ghi thành khoản thu có người thu = chính Đối tác (đối tác đang giữ), không phải tiền về Công ty (F4) — không tạo «đủ tiền» giả cho công ty.

## 7. Vùng chưa rà và vì sao
- Tranh chấp song song thật trên D1 thật (không dựng được).
- ADR-0182/0183 (proposed): chỉ đọc nhật ký, không có mã.
- Biên nhận HD-02-DT: số trên ảnh khớp máy chủ — chỉ đọc luồng `dungBienNhan`, không so từng số; `src/modules/receipt/bien-nhan.test.ts` có bài (không chạy).
- `thay-lan-thu`, `nhap-ke-toan`, `phan-dinh` chi tiết công thức, `dat-coc` đơn huỷ: chỉ nhìn qua bảng ĐƯỜNG GHI.
- Luật bán, giá vốn/nhà cung cấp (X3), mốc 6 giờ: không thử.
- Số tài khoản Đối tác kiểu cũ trên bản thật (T-01): không đăng nhập/không đọc bản thật.

## 8. Lệnh bị bộ chặn từ chối
Không có lệnh nào bị từ chối.
(Một lần `sed -i` sai cú pháp macOS tự lỗi, không phải bộ chặn.)

## 9. Câu cần chủ quyết (tối đa 3)
1. **Siết đại lý không có vai bên ngoài (T-01)** — (a, khuyến nghị) chạy câu kiểm một lần trước ngày bán, gán vai cho mọi tài khoản Đối tác thiếu vai, rồi cho phép AI đề xuất ADR chặn «Đối tác lập đơn khi hồ sơ chưa mang vai được hưởng»; (b) chỉ kiểm tay, không đổi mã.
2. **Chặn đổi bên đặt sang bên không có hạn mức (T-03)** — (a, khuyến nghị) AI đề xuất ADR ngắn: đơn Trả sau đã xác nhận chỉ đổi bên đặt sang hồ sơ có hạn mức còn hiệu lực; (b) chấp nhận hiếm gặp, dựa vào cảnh báo R-CRD-3 (hôm nay).
3. **Gỡ lời cấm Trả sau** — (a, khuyến nghị) chưa gỡ ở lô ngày đầu; gỡ cho một đại lý thử, hạn mức nhỏ, sau khi làm T-03 và viết hướng dẫn Kế toán về cách tính nợ sau «Xong và đủ tiền»; (b) gỡ hoàn toàn ngay (không khuyến nghị: tranh chấp thật chưa kiểm).


## 10. Kịch bản dò
Mười hai kịch bản dò chạy trên khung thử (D1 giả), không lưu vào kho. Câu đọc đề xuất cho chủ soát tài khoản Đối tác thiếu vai (CHỈ ĐỌC; AI không chạy trên bản thật):

```sql
SELECT s.id, s.party_id FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.permission_type_code = 'PARTNER' AND p.valid_to_at IS NULL WHERE s.active = 1 AND NOT EXISTS (SELECT 1 FROM v_pty_open_role_group g WHERE g.party_id = s.party_id AND g.role_group = 'EXTERNAL') AND NOT EXISTS (SELECT 1 FROM v_pty_open_role r JOIN v_pty_role_type t ON t.code = r.role_type_code WHERE r.party_id = s.party_id AND t.role_group = 'OTHER' AND t.is_partner_label = 1);
```
