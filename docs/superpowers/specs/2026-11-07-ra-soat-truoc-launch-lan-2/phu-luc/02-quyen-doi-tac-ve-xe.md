# Phụ lục 02 — Quyền, Đối tác, vé, xe, vòng đời đơn, ngày giờ, «Xem như vai trò khác» (Bước 2, vùng C, D, E, H, I)

> Nguồn: báo cáo của trợ lý chỉ đọc số 2 (mô hình tầm trung), phần 1 chép nguyên văn mục 1 tới mục 9; phần 2 (vùng còn thiếu, giao thêm lúc 22:30) ở cuối tệp. Phiên điều phối đã đọc toàn bộ. Vùng này không có phát hiện CHẶN LAUNCH nên phiên điều phối không chạy lại phép dò. Kịch bản dò của trợ lý nằm ngoài kho (thư mục tạm của phiên), không lưu vào kho.
> Ghi chú của phiên điều phối: (1) «Xem như vai trò khác» (ADR-0180) đã chạy trên bản thật từ 22:04 7/11, nên mọi dòng «đang chạy thật» ở dưới là đúng. (2) Sự cố ở mục 8: hai giá trị khoá hiện ra là khoá ngẫu nhiên do kịch bản Chrome sinh cho máy chủ thử trên D1 tạm của trợ lý giao diện, không phải khoá của bản thật; không cần xử lý gì thêm.

## Phần 1
Mã rà: 5f641781 (cây làm việc ở 9f0b60be, chỉ thêm hồ sơ). Bắt đầu 22:08, kết thúc khoảng 22:25 (giờ máy, 7/11/2026).
Kết luận ngắn: KHÔNG tìm thấy phát hiện mức CHẶN LAUNCH. Đối tác A không thấy, không sửa được gì của Đối tác B; «Xem như vai khác» giữ được các cổng đã thử. Có các điểm nhỏ (ĐỂ SAU; riêng R3d đề xuất SỬA TRONG TUẦN ĐẦU) và 1 điều cần chủ biết (ADR-0180 đang chạy thật).

## 1. Phạm vi và cách rà
Đã đọc: src/shared/xem-nhu-vai*.ts, migrations/0145, git diff 41f63f04..5f641781 của auth/accounts/audit/parties/router/contracts, đặc tả và ADR-0180, route đơn (status, payments, delivered, completed, PUT), route vé (ve-dien-tu/index.ts, duong-dan-khach.ts), phần đầu năm hàng rào (route-access, permission-enforcement, route-write-guard, lan-gui-phu-route, giao-dien-hoi-bang-quyen).
Lệnh đã chạy: node --test "tests/audit/*.test.mjs" => 36 ca, 21 xanh, 15 ĐỎ (xem mục 5). Sáu kịch bản dò riêng trong scratchpad/quyen (mục 10), tất cả chạy trên D1 giả (SQLite thật), không mạng, không đụng bản thật.
Không chạy npm test, typecheck, e2e, audit-invariants (theo luật chơi).

## 2. Phát hiện
### Q-01 — ĐỂ SAU — ĐÃ XÁC NHẬN — Chú thích nhật ký ADR-0180 nói «chỉ ghi mã vai», mã thật ghi tên tiếng Việt
Chuyện gì: dòng nhật ký bật/thoát đóng vai có detail là tên quyền tiếng Việt (ví dụ «Quản trị», «Đối tác»), trong khi chú thích ở src/shared/audit-actions.ts (cạnh acting_role_set) và ADR/đặc tả nói detail chỉ là mã quyền. Không lộ dữ liệu cá nhân; chỉ tài liệu/chú thích lệch (cột audit_log.acting_role vẫn giữ mã).
Ai gặp: người đọc nhật ký/viết tài liệu. Bằng chứng: kịch bản do-xem-nhu-vai.test.mjs in ra dòng audit: acting_role_set | acting_role=ADMIN | detail="Đối tác". Mã: src/modules/accounts/index.ts (route POST /api/auth/xem-nhu-vai, dòng auditStatement detail: PERMISSION_LABEL[vai], có chú thích «detail = tên tiếng Việt»).
Hồ sơ cũ: chưa có. Đề xuất: sửa chú thích ở audit-actions.ts cho khớp mã (tài liệu mô tả thua mã). Việc nhỏ. Trạng thái triển khai: đang chạy trên bản thật từ 22:04 7/11.

### Q-02 — ĐỂ SAU — SUY LUẬN — Hạn 60 phút của vai đóng được làm mới bởi mọi lời gọi máy chủ, kể cả lời gọi nền
Hạn tính theo last_seen_at, làm mới (mỗi 5 phút) bởi BẤT KỲ request có đăng nhập. Trang tự gọi nền khi đang hiện: màn trò chuyện Hỗ trợ (web/ho-tro-luong.ts:108 gọi lại chỉ khi tab hiện), Bảng tin nối lại khi tab hiện lại (web/bangtin.ts:31); đồng hồ Trang chủ (web/home.ts:737) KHÔNG gọi máy chủ. Nên chủ để tab Hỗ trợ mở thì vai không tự hết sau 60 phút. Hậu quả nhỏ: vẫn bị thu hẹp quyền (hướng an toàn), nhật ký vẫn gắn dấu vai. Chưa thử bằng trình duyệt. Đề xuất: ghi vào hướng dẫn chủ «nhớ bấm Thoát»; không gấp. Đang chạy thật từ 22:04 7/11.

### Q-03 — ĐỂ SAU — ĐÃ XÁC NHẬN (hành vi), hậu quả SUY LUẬN — Chống trùng mã vé phân biệt chữ hoa/thường
Nhập lô: mã «MA1» đã có trong kho thì bị loại, nhưng «ma1 » (thường, thừa khoảng trắng) được nhận (khoảng trắng được cắt, chữ hoa/thường thì không). Nếu mã QR thật của nhà cung cấp không phân biệt hoa/thường, cùng một vé có thể vào kho hai lần. Ảnh trùng byte thì vẫn bị chặn (ca «Ảnh này đã có trong kho»). Bằng chứng: do-ve.test.mjs, lô 2: kết quả loai có thứ tự 0,1,3 bị loại, thứ tự 2 («ma1 ») được thêm. Mã: src/modules/ve-dien-tu/nhap-lo.ts dòng 13 (chu = trim). Hồ sơ cũ: ADR-0156 điều chống trùng QR — chưa đối chiếu chữ hoa/thường. Đề xuất: hỏi nhà cung cấp mã có phân biệt hoa/thường không; nếu không thì chuẩn hoá in hoa khi so (cần ADR nhỏ vì chạm chỉ mục duy nhất). Việc nhỏ-vừa.

### Q-04 — ĐỂ SAU — ĐÃ XÁC NHẬN (từng ca) — Năm điểm yếu cũ của kiểm toán 22/9 vẫn còn; bộ dò cũ phần lớn đã hết dùng được
Đã chạy lại node --test "tests/audit/*.test.mjs": 36 ca, 21 xanh, 15 đỏ. Phân tích từng ca đỏ (đọc dòng lỗi và dòng dấu vết):
- Đỏ ở BƯỚC DỰNG, không phải ở khẳng định của ca (luật đã đổi, khung cũ lạc hậu): D-02, P2, P3, P5, P6 (POST /api/staff bằng Quản trị => 403 «Chỉ Hành chính nhân sự hoặc người phụ trách hệ thống được thêm tài khoản», đúng ADR-0071); R3b, R4, R7, D1, D2, D3, D5 (xác nhận đơn do Bán hàng lập trả 409 ở dòng 216/74/113/150); R8 (409 order_draft_no_payment, ADR-0135 Đ7); P4 (PUT /handler vào đơn NHÁP => 404, ADR-0135 Đ2: nháp người khác không thấy).
- Đỏ ở khẳng định: chỉ D-01 «xem chi tiết đơn của người khác»: bài mong 403, máy chủ nay trả 404 (không lộ đơn có tồn tại) — mạnh hơn, không phải lùi.
Vậy không ca «PASS đã sửa» nào đỏ vì lùi; nhưng 12 ca (D-02, P2–P6, R3b, R4, R7, R8, D3…) hiện KHÔNG chứng minh gì. Ca FINDING còn xanh (tức điểm yếu còn nguyên, ĐÃ XÁC NHẬN hôm nay): R1, R2, R3d, D4, cùng phép đo P7.
- R1 (gửi lại cùng POST /api/orders tạo 2 đơn): khi KHÔNG có header Idempotency-Key. Lớp chống ghi trùng ADR-0094 ở «giai đoạn 1» cho qua lệnh thiếu vé và chỉ ghi log thieu_ma_lan_gui (src/shared/router.ts, dòng báo log). Giao diện luôn gắn vé (web/api.ts:157) nên người dùng thường được bảo vệ; máy còn bản cũ hay lệnh tự gọi thì không. Hồ sơ: ADR-0094 đ7 («bản siết sau»), kiểm toán 22/9 (R1). Tôi không thấy hạn cho «bản siết» trong BACKLOG/sổ (grep). Mức: ĐỂ SAU; liên quan vùng C: bấm đúp trên PWA cũ chưa cập nhật (iPhone) vẫn có thể ra hai đơn.
- R2 (kèm newBooker gửi lại tạo hai hồ sơ khách cùng SĐT): cùng gốc R1, và chỉ mục SĐT cố ý không duy nhất (kiểm toán 22/9 dòng R2). Đã có hồ sơ.
- R3d (Bán hàng khác ngưng hồ sơ KHÁCH đang là người đặt đơn nháp của đồng nghiệp => đồng nghiệp sửa đơn bị 400; nhật ký hồ sơ ghi «cá nhân», không ghi việc ngưng): ĐÃ XÁC NHẬN còn. Không thấy mục trong sổ quyen-hoan/BACKLOG/§16 (grep «R3d» chỉ ra bộ dò). Mức: SỬA TRONG TUẦN ĐẦU nếu nhân viên bán hàng được phép ngưng hồ sơ dùng chung (ít gặp, có cách vòng: chọn lại người đặt). Đề xuất: hỏi chủ ai được ngưng hồ sơ khách; nhật ký nên ghi «ngưng». Việc nhỏ-vừa.
- D4 (tài khoản nhân viên trỏ hồ sơ ĐÃ NGƯNG vẫn đăng nhập): còn; đã ghi ở kiểm toán 22/9 (C13/D4). Offboarding dùng ngưng TÀI KHOẢN nên ít ảnh hưởng. ĐỂ SAU.
- P7: danh sách người-được-giao trả cả 1000 tên cho mọi tài khoản văn phòng, không chia trang — đo quy mô, hồ sơ cũ (ADR-0014).
Đề xuất chung: chủ/đợt sau quyết bỏ hay làm mới tests/audit (ghi chú ở README); không gấp.

## Điều cần biết (không phải lỗi): ADR-0180 đang chạy thật
- Dữ liệu ghi khi đóng vai là dữ liệu THẬT gắn tài khoản Chủ. Đã thử: Toàn quyền đóng Đối tác, lập đơn qua POST /api/orders rồi gui-don => đơn được tự xác nhận (nhánh B), nhật ký có acting_role=PARTNER (dòng created, order_terms_captured, confirmed). Đúng ADR (đã ghi «chủ đã nghe và chấp nhận»); chỉ nhắc để chủ dùng khách thử/đơn nháp, nhất là khi đóng Đối tác/Quản lý bán hàng.
- Dấu vai trong nhật ký tra theo TÀI KHOẢN, không theo phiên: Toàn quyền dùng hai máy, máy không đóng vai vẫn bị gắn dấu trong khoảng 60 phút. ADR đã ghi nhận hạn chế này (chấp nhận).

## 3. Bảng trạng thái đơn (từ mã + kịch bản do-vong-doi-don.test.mjs)
| Bước | Ai bấm được | Cổng máy chủ (kết quả đã thử) | Nhật ký |
|---|---|---|---|
| Lập nháp | Bán hàng, Đối tác (đơn mình), Quản trị, Toàn quyền, Thực tập (own) | POST /api/orders, order.create | created |
| Sửa nháp | người lập (nháp người khác => 404) | PUT /api/orders/:id; đơn đã xác nhận => 409 not_editable (đã thử) | updated |
| Gửi đơn/xác nhận (Đối tác) | Đối tác: chỉ «Gửi đơn», không xác nhận thẳng (409 partner_submit_required) | gui-don, nhánh A cần duyệt, nhánh B tự xác nhận | confirmed hoặc ord_confirm_request |
| Xác nhận | người lập/ phụ trách/Quản trị | POST /status {confirmed}; xác nhận lần 2 => 409 invalid_transition; mốc 6 giờ + Đặt gấp trong câu SQL | confirmed |
| Thu tiền | Kế toán (any), Bán hàng (own), HDV (assigned), Đối tác (own) | payments; đơn nháp => 404/409; đơn huỷ chỉ Kế toán/Toàn quyền (ADR-0089 đ13, có chủ ý) | payment_recorded |
| Khách đã trả đủ (giao) | HDV đang phụ trách, Quản trị, Toàn quyền; Bán hàng KHÔNG (403, đã thử) | POST /delivered, ô order.handover | order_delivered |
| Hoàn thành | Kế toán, Toàn quyền (Quản trị 403) | /completed; chưa giao => 409 not_completable | order_completed |
| Huỷ | người lập/phụ trách/Quản trị; Thực tập không phải chủ đơn 403; Đối tác không huỷ đơn đã mở vé | POST /status {cancelled} cần lyDo; vé trả lại, link khách chết (404) | cancelled |
| Đi lùi | không ai | trigger: nháp<-xác nhận bị chặn (invalid_transition), xoá đơn đã xác nhận chặn (order_frozen), sửa nhật ký chặn (audit_append_only). Ngoại lệ: UPDATE orders SET delivered_at=NULL qua SQL TRỰC TIẾP được qua (không có đường API; ghi để biết, không phải lỗi API) |
Không tìm thấy bước đi lùi qua API. Sau khi huỷ: xác nhận lại 409, giao 403.

## 4. Kết quả dò Đối tác A <-> B (kịch bản do-doi-tac.test.mjs)
Khung: 2 đối tác (A, B) mỗi bên 1 đơn đã gửi, 1 khoản tự thu + 1 khoản Kế toán thu, 1 vé hỗ trợ, đường dẫn vé khách; kho 6 vé. B gọi MỌI route trong ảnh chụp route-access (466 route) với 26 mã của A (đơn, mã đơn, dịch vụ, chặng, khoản thu, phân bổ vé, đường dẫn, vé hỗ trợ, hồ sơ, ...), thân rỗng cho POST/PUT.
| Nhóm cổng | Kết quả của B |
|---|---|
| office (219), admin (80), accounts (12) | 100% 403 (4.327 lượt gọi) |
| orders (63) có :id | chỉ 403/404/400; không có 2xx nào với mã của A |
| staff (107) có :id | chỉ 403/404/400/409/503; không 2xx |
| public (24) | link khách cần token; 404/429; không lộ |
Quét dấu «mật» của A (SĐT khách, tên khách, ghi chú, ghi chú thu, tiêu đề vé hỗ trợ, tên hồ sơ, mã vé, SĐT đăng nhập A) trong MỌI phản hồi 2xx của B: 0 trường lộ.
Thử ghi có thân hợp lệ (B lên đơn/vé/ticket của A): GET đơn, payments, receipt, ve/don, ve/anh, feedback:id, parties:id (403) ; PUT/PATCH/POST status, cancel-reason, payments, gui-don, passengers, legs, ve/cap, ve/duong-dan, thu-hoi, feedback messages/claim/xu-ly: toàn 403/404/405 (POST /api/ve/giao 400 vì tôi gửi thiếu trường; các route vé còn lại 403). Trạng thái đơn, số khoản thu, nhật ký đơn, sự kiện vé hỗ trợ trước/sau: BẰNG NHAU.
Danh sách đơn của B không chứa đơn của A.
Đường dẫn vé khách: mã 43 ký tự (256 bit), chỉ lưu băm, so hằng thời gian; token sai/đoán => 404; 40 lần sai liên tiếp => 429; trang không có tên khách; sau khi Quản trị huỷ đơn: link và ảnh => 404 (vé trả kho, release_reason=DON_HUY); B thu hồi link của A => 403; trigger vdt_append_only cấm sửa hạn link bằng SQL. Hết hạn thật chưa chạy được bằng đồng hồ giả (CHƯA KIỂM; chỉ đọc mã: expires_at >= bây giờ).
Đối tác A xem đơn của chính mình: không có giá vốn, tên Kế toán, SĐT nhân viên (chỉ SĐT của chính A trong /api/auth/me). Công tắc «Khách của đối tác trả cho Công ty» DÒ CẢ HAI TRẠNG THÁI (khung kenhThuGia=0 và 1; chạy lại toàn bộ quét 466 route, ghi có thân và khoá trường): 0 trường lộ, B vẫn chỉ 403/404 ở cả hai; khác biệt duy nhất đúng thiết kế: Tắt => Kế toán ghi thu công ty bị 409, và /api/ve/duong-dan của đối tác tự thu 403 chua_thu_du.
Vai khác xem đơn của A (chỉ GET): Thực tập, HDV không được giao, Nhân sự, Tài xế, Tài xế đối tác: không lộ. Bán hàng khác, Quản lý bán hàng, Kế toán xem được đơn, SĐT khách, ghi chú — đúng thiết kế (order.view = any, kết luận R4 trong kiểm toán 22/9).

## 5. Đối chiếu mục cũ
- D-1 (Đối tác đọc lý do nội bộ trong lịch sử đơn): ĐÃ SỬA — A không có khoá lý do nội bộ trong GET đơn/payments (chỉ lyDoChuaGiao/lyDoChuaHoanThanh là chữ trạng thái); src/lich-su-don-doi-tac.test.ts khoá danh sách cho phép.
- D-2, B-1, D-3, E-1, E-2, G-1, G-2, T-1…T-12: KHÔNG kiểm trong đợt này (ngoài thời gian).
- Bộ dò cũ tests/audit (kiểm toán 22/9): xem Q-04 (R1, R2, R3d, D4, P7 còn; các ca khác hết dùng được).
- Ba cảnh báo audit trên bản thật (R-ORD-9, R-CTL-1, R-VC-14): không chạm.

## 6. Vùng đã kiểm, sạch (cách kiểm)
- Route bật/thoát «Xem như vai khác»: Origin lạ/thiếu => 403; Quản trị, Bán hàng, Đối tác gọi bật => 403; chọn SUPER_ADMIN hoặc mã lạ => 400; (do-xem-nhu-vai.test.mjs).
- Toàn quyền đóng một vai so với tài khoản thật: chạy src/xem-nhu-vai-khong-lo-toan-quyen.test.ts => 24/24 xanh (quét MATRIX, quét mã HTTP của mọi route cho 10 vai, Góp ý/Nhật ký/tiền chỉ Toàn quyền, xác minh phiếu). Tôi bổ sung: Góp ý (feedback/repository.ts đọc v_stf_toan_quyen) — đóng 6 vai (SALES, ADMIN, ACCOUNTING, HR, INTERN, PARTNER) gọi queue, chi tiết, messages, claim, xu-ly, transfer, admin/teams, tep-cho-xoa trên phiếu của người khác: mọi mã trạng thái GIỐNG tài khoản thật giữ vai đó (404/403), không lộ nội dung; Toàn quyền thật vẫn 200 (do-gop-y-vai.test.mjs).
- Nút «Xác nhận khách đã trả đủ» ở web/order.ts:686 hiện theo cờ máy chủ t.quyenGiao (không tự suy luật) nên không có chuyện hiện nút rồi 403 (Bán hàng thật nhận 403 ở route, giao diện không hiện).
- Đóng Quản trị: không cấp được SUPER_ADMIN (PUT permissions 403, POST /api/staff 403), không đặt lại PIN chính mình (403), không bật bảo trì (403), không vào Nhật ký/Góp ý chỉ-Toàn quyền (403). /api/auth/me trả đúng bộ quyền và actingRole.
- Mười vai chọn được: mỗi vai ra đúng bộ quyền (Quản lý bán hàng ra [SALES_MANAGER, SALES]); thoát trả ["SUPER_ADMIN"]; không đang đóng vai thì DELETE không ghi nhật ký.
- Hết hạn: sửa last_seen_at lùi 61 phút => me trả SUPER_ADMIN, cột acting_role bị xoá.
- Bảo trì: Toàn quyền đóng Bán hàng vẫn vào được khi bảo trì, Bán hàng thật 503; đóng vai Bán hàng không tắt được bảo trì (403) nhưng thoát rồi tắt được. Hai lớp bảo mật xét quyền THẬT (đọc mã accounts/index.ts: quyenThat ở mọi chỗ MFA).
- Nhật ký: dòng ghi lúc đóng vai mang acting_role (PARTNER cho created/confirmed...); dòng acting_role_set đầu tiên mang NULL (đúng thiết kế đã ghi trong chú thích).
- Hồ sơ bên: đóng vai Đối tác thì «đơn của tôi» = rỗng (hồ sơ của Chủ); lập đơn qua được (xem điều cần biết).
- Ngày giờ: grep date('now')/datetime('now') trong src: không có; migrations chỉ dùng strftime('now') để đóng dấu thời điểm UTC ISO (đúng, không phải ngày dân sự). Ngày dân sự đi qua vnToday/vn-date; Trả sau tính theo giờ trên mốc ISO (không phụ thuộc múi giờ). Mốc 6 giờ có bộ dò giờ xấu nhất sẵn (tests/audit/dong-ho-gio-xau.mjs); không chạy lại.
- Vé: tạo lô chỉ Bán hàng (Đối tác, Thực tập, HDV, Kế toán 403); xem kho: Đối tác, Thực tập 403; trùng ảnh/mã giữa hai lô và trong một lô bị loại (trừ Q-03); ngày dùng ngược bị loại; bỏ lô đã xác nhận trả 200 VOID (có chủ ý).
- Bốn hàng rào quyền tĩnh: đã đọc phần đầu mô tả cái canh và cái không canh (nêu trong mô tả của chính tệp: canh QUÊN không canh CỐ Ý; route :id ở cổng staff không nằm trong route-write-guard (1b) — tôi đã bù bằng quét động ở mục 4).

## 7. Vùng chưa rà và vì sao
- Giao diện (nút hiện mà máy chủ từ chối / nút ẩn mà route mở): chưa dùng trình duyệt; chỉ có tĩnh giao-dien-hoi-bang-quyen.
- Công tắc «Khách của đối tác trả cho Công ty» Bật/Tắt, Biên nhận HD-02-DT nội dung, luật bán theo loại đối tác (ADR-0146/0152), Gửi đơn đủ nhánh A/B: chỉ thử nhánh B, chưa thử nhánh A + công tắc Tắt.
- Điều phối xe: tài xế chỉ thấy tên khách trong ngày chạy, chuyến, cho xe chạy, xe thiếu giấy tờ (ADR-0184): chỉ đối chiếu bài sẵn có (tai-xe-cong.test.ts); không dò riêng. E-1/E-2 không đo lại.
- Ma trận route Bán hàng/Quản lý bán hàng/Nhân sự: không dò từng ô.
- Hai người cùng sửa một đơn: chỉ đọc mã (expectedUpdatedAt ở PUT, STALE 409); chưa dò hai phiên.
- Sửa số khách sau xác nhận (money-edit): chưa đi hết (đơn trong kịch bản chưa tới bước).
- Công tắc Tắt: khi Tắt, Kế toán ghi thu công ty cho đơn đối tác bị 409 kenh_thu_chi_nguoi_lap (đúng ADR-0178) và vé của đơn trả trước đối tác tự thu bị khoá «chưa thu đủ»; chưa kiểm đường mở vé khi Tắt (ví dụ đối tác nộp tiền qua sổ).
- Nhật ký khi đóng vai ở các bảng riêng (bil_*, thongbao…): không rà (đặc tả điều 2 yêu cầu rà).

## 8. Lệnh bị bộ chặn từ chối + sự cố quy trình
Bộ chặn không từ chối lệnh nào. Sự cố của tôi: lệnh pgrep -fl in ra dòng lệnh của tiến trình wrangler dev local của phiên điều phối, trong đó có giá trị SESSION_SECRET và LAN_GUI_SECRET tạm của e2e local (không phải bản thật). Tôi không chép, không dùng, không đưa vào báo cáo này; tiến trình đó không phải của tôi nên để nguyên. Phiên điều phối nên coi hai giá trị tạm đó là đã hiện trong ngữ cảnh một phiên rà.

## 9. Câu cần chủ quyết
1. (Q-03) Mã vé của nhà cung cấp có phân biệt chữ hoa/thường không? Khuyến nghị: hỏi nhà cung cấp rồi mới chuẩn hoá; nếu không chắc, giữ nguyên (đang an toàn vì ảnh trùng bị chặn).
2. (Q-04/R3d) Nhân viên Bán hàng có được ngưng hồ sơ khách dùng chung không? Khuyến nghị: để Quản trị ngưng, Bán hàng chỉ sửa; nếu chủ muốn giữ, ít nhất ghi «ngưng» vào nhật ký.
3. (Q-04/R1) Có lên lịch siết «giai đoạn 2» của lớp chống ghi trùng (lệnh ghi thiếu vé bị từ chối) sau khi mọi iPhone đã có bản mới không? Khuyến nghị: có, đặt hạn sau 2–3 tuần dùng thật.

## 10. Kịch bản dò
Không có phát hiện CHẶN LAUNCH. Sáu kịch bản dò chạy trên khung thử `tests/audit/harness.mjs` (D1 giả): quét Đối tác A ↔ B qua 466 route với 26 mã của A ở cả hai trạng thái công tắc ADR-0178; «Xem như vai trò khác» (cổng bật/thoát, mười vai, hết hạn, bảo trì); Góp ý khi đóng vai so với tài khoản thật; vòng đời đơn; vé (nhập lô, chống trùng, đường dẫn khách). Kịch bản không lưu vào kho.

## Phần 2 — vé và xe, vòng đời đơn, mục cũ, nhật ký khi đóng vai, Gửi đơn nhánh A

> Nguồn: báo cáo phần 2 của cùng trợ lý (22:28 tới khi nộp báo cáo khoảng 22:38; trợ lý tự ghi «khoảng 22:50» là giờ ước), chép nguyên văn trừ mục 7 (đường dẫn kịch bản trong thư mục tạm, thay bằng mô tả). Phần này không có phát hiện CHẶN LAUNCH nên phiên điều phối không chạy lại; chỉ đọc lại một chỗ: `src/shared/dieu-phoi-kiem.ts`, hàm `trongNgayChay` — vế thứ hai cho chuyến `RUNNING` không có cận trên, khớp Q-05. Vế đó có chủ ý để chuyến chạy qua nửa đêm vẫn thấy khách (khung xem khách theo ADR-0053 D7.2); thiếu là cận trên khi quên bấm «Kết thúc». Mã phát hiện tiếp nối từ Q-05.

Mã rà 5f641781 (ADR-0180 đang chạy thật từ 22:04 7/11). Bắt đầu 22:28, kết thúc khoảng 22:50. Tất cả chạy trên D1 giả (khung thử), không mạng, không wrangler, không ghi vào repo. Tệp cũ bao-cao-quyen.md giữ nguyên; mã phát hiện tiếp từ Q-05.
Kết luận: không có CHẶN LAUNCH. Còn nguyên một mục cũ đáng sửa sớm (E-1), hai mục cũ cần chủ quyết (D-2, D-3), hai câu báo lỗi chưa nói rõ việc phải làm.

## 2. Phát hiện
### Q-05 — SỬA TRONG TUẦN ĐẦU — ĐÃ XÁC NHẬN — (mục cũ E-1) Chuyến quên bấm «Kết thúc»: tài xế công ty còn thấy tên khách và SĐT liên hệ nhiều ngày sau
Chuyện gì: hạn «trong ngày chạy» của chuyến đang chạy không có cận trên. Mã: src/shared/dieu-phoi-kiem.ts, hàm trongNgayChay (nhánh RUNNING và ngày giờ xuất bến ≥ ngày chạy). Cron 15 phút (wrangler.jsonc, src/index.ts scheduled) chỉ đồng bộ Sheet, dọn vé, nhắc Trả sau; không có tác vụ tự kết thúc chuyến.
Ai gặp: tài xế của chính chuyến đó (không phải người khác); lộ họ tên, năm sinh, tên và SĐT người liên hệ của đơn lâu hơn cần thiết.
Bằng chứng (do-xe.test.mjs, đồng hồ giả): chuyến công ty xuất bến 12:35 ngày 11/3 rồi không kết thúc; GET /api/van-chuyen/cuoc-cua-toi/:id bằng tài xế đó: hôm sau trongNgayChay=true, có «Khách Dò Tìm 1» và SĐT; 9 ngày sau (20/3) vẫn y nguyên; DB vc_trip.status = RUNNING.
Hồ sơ cũ: kiểm toán 13/10 phụ lục E (E-1, ghi «chưa dựng lại bằng khung thử») — nay đã dựng lại: CÒN. Không thấy trong BACKLOG/quyen-hoan.
Đề xuất: đặt cận trên (ví dụ hết ngày hôm sau của ngày chạy) hoặc tự kết thúc chuyến quá hạn bằng cron; nhắc tài xế/văn phòng kết thúc. Việc nhỏ-vừa (chạm luật khung xem khách, cần ADR/ chủ duyệt vì chạm dữ liệu cá nhân).

### Q-06 — SỬA TRONG TUẦN ĐẦU (cần chủ quyết) — ĐÃ XÁC NHẬN — (mục cũ D-2) Nhân sự tạo được tài khoản Bán hàng rồi tài khoản đó xem đơn kèm SĐT khách
Bằng chứng (do-cu.test.mjs): HR POST /api/staff với permissions ["SALES"] => 201 (cũng qua đường roles ["SALES_STAFF"] => 201); tài khoản mới GET /api/orders/:id => 200, có SĐT khách; HR tự GET /api/orders => 403. Mã: src/modules/accounts/index.ts route POST /api/staff (can account.create). Hồ sơ cũ: kiểm toán 13/10 D-2 «Chủ quyết» (khuyến nghị: HR chỉ gán vai không mở đơn/tiền, hoặc PIN tạm ADR-0093); tôi không thấy quyết định trong sổ/BACKLOG. Đề xuất: chủ chọn một trong hai cách đã nêu. Việc vừa (ADR).

### Q-07 — SỬA TRONG TUẦN ĐẦU — ĐÃ XÁC NHẬN — Câu báo vé bị khoá không nói đối tác phải làm gì khi công tắc «Khách của đối tác trả cho Công ty» đang Tắt
Khi Tắt, đối tác tự thu rồi bấm tạo đường dẫn vé nhận: «Công ty chưa xác nhận đã nhận đủ tiền nên chưa mở được vé.» (403 chua_thu_du); nhưng khi Tắt, Công ty không nhận tiền khách (đối tác khai «Công ty thu» => 409 kenh_thu_chi_nguoi_lap) nên câu «chờ Công ty xác nhận» dẫn người dùng tới ngõ cụt. Đường thật (đã thử, cả Bật và Tắt): Kế toán ghi «đối tác nộp tiền» ở sổ (POST /api/ledger/settlements chieu "nop") => vé mở (200). Nhánh A (dịch vụ cần kiểm vé): Gửi đơn => Quản trị «Còn vé, xác nhận» => tự thu => vé khoá => Kế toán ghi nộp => vé mở; cùng kết quả ở hai trạng thái. Đề xuất: đổi câu cho trường hợp Tắt: «Tiền khách ở tay bạn; nộp về Công ty để mở vé». Chữ cần chủ chọn (bảng tham chiếu). Việc nhỏ.

### Q-08 — ĐỂ SAU — ĐÃ XÁC NHẬN — Câu chặn «xe thiếu giấy tờ» (luật chặn cứng, ADR-0184 chưa có mã) nói ai xử lý nhưng không nói giấy tờ nào thiếu hay phải làm gì
Bằng chứng (do-xe-giay-to.test.mjs): xe không có giấy tờ nào, và xe có kiểm định hết hạn: tài xế bấm Xuất bến => 409 chua_du_dieu_kien_xuat_ben, lyDo DIEU_KIEN_GIAY_TO_XE, «Xe thiếu hoặc hết hạn giấy tờ bắt buộc: 79C99999», aiXuLy «Quản trị». Quản trị bấm thay cũng 409. Có người xử lý nhưng không có «giấy tờ nào» (kiểm định hay bảo hiểm) và «làm gì» (gia hạn ở màn Xe). Xe đủ giấy tờ => 200. Đề xuất: bổ sung tên giấy tờ + việc cần làm khi làm ADR-0184. Việc nhỏ.

### Mục cũ còn lại (không phải phát hiện mới)
- D-3 (gõ sai PIN khoá người khác): CÒN. 5 lần sai từ 5 IP khác nhau với cùng SĐT => lần 6 trả 429 «Nhập sai quá nhiều lần. Thử lại sau 15 phút» (do-cu.test.mjs). Khung thử không bật Turnstile; production có Turnstile hay không: chưa kiểm. Hồ sơ cũ: ADR-0014 D-04, kiểm toán 13/10 D-3.
- B-1 (mốc giờ): ĐÃ SỬA PHẦN LỚN. Ngày đón nay bị khoá trong khoảng quanh ngày đi (400 «ngày đón phải từ … đến …») cho đón sau khởi hành 10 ngày, đón trước 30 ngày, đón năm 2001; giờ 25:61 và «9h» bị 400. Ngày ĐI lạ (2001, 2099, hôm qua) vẫn lưu được ở đơn NHÁP (201) nhưng xác nhận bị 409 incomplete_trip; ngày đi hôm nay xác nhận được. Còn lại: nháp mang ngày đi vô lý, không hại.
- E-2 (tài xế đối tác thấy chuyến công ty): KHÔNG TÁI HIỆN. Đối tác lái chuyến của nhà xe cùng ngày với một chuyến công ty: danh sách cuốc chỉ 1 chuyến của mình; GET chi tiết chuyến công ty => 404; chi tiết chuyến của mình và phản hồi xe-nhan không chứa mã đơn, điểm đón, tên tài xế hay biển số xe của chuyến công ty; /api/van-chuyen/lich và chuyen/:id => 403.

## 3. Vùng đã kiểm, sạch (cách kiểm)
- Tên/SĐT khách chỉ trong ngày chạy: tài xế công ty ngày chạy thấy tên và SĐT; tài xế đối tác ngoài khung (trước hạn Từ chối) không có mã đơn, tên, liên hệ — bài sẵn có src/modules/van-chuyen/tai-xe-doi-tac-cuoc.test.ts đối chiếu; tôi đọc mã khungCuaNguoiGoi/trongKhungXemKhach (một hàm duy nhất). Riêng chuyến RUNNING: xem Q-05.
- Cho xe chạy: thiếu giấy tờ chặn cứng cả đường tài xế và đường văn phòng (Q-08).
- Khách vắng/huỷ giữa chừng: vắng/huỷ trước khi xe «Đã tới» điểm => 409 diem_chua_toi; sau «Đã tới» => 200; kết thúc thường khi còn khách/điểm chưa xong => 409 con_khach_chua_xong kèm gợi ý «Kết thúc gián đoạn»; đón lại khách đã đón => 409 suat_da_co_ket_qua; khách đã vắng vẫn đón được sau (cố ý: luật DA_DON cho từ Chờ hoặc Vắng — dieu-phoi.ts).
- Sửa số khách sau xác nhận (đơn 4 người lớn 1.200.000, đã thu đủ): bớt 4→3→1 (Bán hàng chủ đơn, Kế toán) 200; tiền hiệu lực đúng (total 300.000, phiếu thu giữ 1.200.000, payments trả daThu 1.200.000, phaiThu 300.000, conLai 0, có trường «du» cho phần thừa); dòng điều chỉnh chỉ-thêm (cột gốc order_service/orders không đổi, hiệu lực tính qua điều chỉnh); bớt về 0 người lớn => 409 thieu_nguoi_lon; thêm lại => cấp lại vé; vé đã lộ giữ lại (giữ 1/lộ 1 sau bớt còn 1), vé chưa lộ trả bớt.
- Huỷ đơn khi vé đã lộ: Quản trị huỷ 200, phân bổ vé vô hiệu (release_reason DON_HUY), vé đã lộ KHÔNG về kho chung (trigger vdt_ticket_one_way: ALLOCATED→AVAILABLE bị chặn khi từng lộ); Đối tác không tự huỷ đơn đã mở vé (ADR-0170 Đ3, đọc mã chanDoiTacHuy). Chưa có khái niệm vé «đã dùng» ngoài «đã lộ».
- Hai phiên cùng sửa: PUT đơn nháp hai lần cùng expectedUpdatedAt tuần tự và song song => 200 rồi 409 stale (tên cuối của phiên 1, không ghi đè im lặng); money-edit đua thật (chen một lần sửa giữa lúc đọc và lúc ghi bằng w.chenTruocLo) => người sau 409 stale, dòng điều chỉnh seq 1,2. Lưu ý: money-edit không nhận expectedUpdatedAt trong thân; việc chống đua nằm ở seq duy nhất + gác trong lô (đúng thiết kế, đã thử).
- Công tắc ADR-0178 + nhánh A: xem Q-07.

## 4. Nhật ký bảng riêng khi Toàn quyền đóng vai (mô tả hiện trạng, việc chủ còn chờ)
- ADR-0180 Đ2: chỉ cột audit_log.acting_role bắt buộc mang dấu; câu «Nhật ký riêng của module khác (nếu có) phải được rà». Sổ thi công 7/11 («Chờ chủ quyết»): «Sổ riêng (bil_*, fbk_*…) không mang dấu vai; chỉ audit_log mang.»
- Đã thử (do-nhat-ky-vai.test.mjs): Toàn quyền đóng Kế toán ghi khoản thu => audit_log dòng payment_recorded mang acting_role=ACCOUNTING; đóng Bán hàng lập đơn => dòng created mang SALES. Bảng bil_payment_receipt: created_by = tài khoản Chủ, KHÔNG có cột dấu vai (chỉ có collector_role_code, nghĩa khác). Trong 11 bảng kiểu nhật ký/sự kiện (audit_log, order_money_adjustment, vc_trip_event, fbk_ticket_event, bil_adjustment_request, dsp_release_event, stf_permission_adjustment…) CHỈ audit_log có cột acting_role.
- Hậu quả: người điều tra sổ tiền/chuyến chỉ biết «do Chủ làm»; muốn biết có đang đóng vai phải đối chiếu dòng audit_log cùng lô (có dấu). Dấu vai tra theo tài khoản, không theo phiên (đã ghi). Trang Nhật ký chưa hiện dấu vai (sổ thi công). Không phải lỗi an ninh; việc chủ còn chờ.

## 5. Vùng chưa rà
- Nhật ký bảng riêng khi đóng vai với đường tiền dài (hoàn cọc, đối soát): chỉ thử khoản thu.
- Khách vắng/huỷ ảnh hưởng đồng bộ chuyến–đơn (vc_* ↔ orders) ở ca nhiều chặng.
- Xe: giấy tờ hết hạn của bảo hiểm riêng (trigger chặn chèn dòng thứ hai nên không dựng được bằng SQL; chỉ thử không có giấy tờ và kiểm định hết hạn).
- Production có Turnstile (D-3) và bản thật dữ liệu: không kiểm (cấm).
- Không chạy wrangler, không chạy pgrep/ps; không lệnh nào bị bộ chặn từ chối.

## 6. Câu cần chủ quyết (tối đa 3; phương án khuyến nghị đứng đầu)
1. (Q-05) Cận trên của «trong ngày chạy» cho chuyến chưa kết thúc: (a) hết ngày hôm sau và tự kết thúc bằng cron (khuyến nghị); (b) chỉ nhắc, không đổi.
2. (Q-06) HR tạo tài khoản Bán hàng: (a) HR chỉ gán vai không mở đơn/tiền (khuyến nghị); (b) giữ, thêm PIN tạm.
3. (Q-07) Chữ khi Tắt công tắc và vé khoá: chủ chọn giữa «Tiền khách ở tay bạn. Hãy nộp về Công ty để mở vé.» (khuyến nghị) và «Vé mở sau khi Công ty ghi nhận bạn đã nộp tiền.»

## 7. Kịch bản dò
Bảy kịch bản dò chạy trên khung thử `tests/audit/harness.mjs` (D1 giả, đồng hồ giả), không mạng, không wrangler; không lưu vào kho. Nhóm: chuyến quên kết thúc và tài xế đối tác so với chuyến công ty; xe thiếu giấy tờ và khách vắng/huỷ; sửa số khách, huỷ đơn khi vé đã lộ, hai phiên cùng sửa; Nhân sự tạo tài khoản Bán hàng, khoá PIN, mốc giờ; nhật ký bảng riêng khi đóng vai; Gửi đơn nhánh A ở hai trạng thái công tắc ADR-0178.
