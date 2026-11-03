# Trục (d) T4 + T8 — kết quả kiểm toán điểm khuất (2026-09-24)

Mã đo: HEAD 4620e61, worktree tourdao-sales-audit-62ea81. Chỉ đọc; mọi ghi dữ liệu ở D1 tạm của startEnv(). Kịch bản + kết quả thô: docs/evidence/diem-khuat-2026-09-24/d-t4-t8/kich-ban/ (k1-luong.mjs, k2.mjs chạy từ WT bằng node; hai kịch bản ghi JSON kết quả vào thư mục nháp của phiên kiểm toán — bản sao JSON đã chép vào kich-ban/: k1-ketqua-caA.json (CA A, A2), k1-ketqua-2.json (luồng 1–5, CA D), k2-ketqua.json). Máy bận (load 6–8) — không có số đo thời gian.

## DK-T4-01 — Đơn đang gõ mất sạch khi phiên bị thu hồi/hết hạn giữa chừng hoặc khi app bị tải lại — lối thoát 401 xoá dữ liệu, trong khi lối thoát bảo trì được thiết kế để giữ
- **muc**: HIGH
- **ly_do_muc**: Nhân viên kinh doanh mất toàn bộ đơn đang gõ (khách, dịch vụ, số khách, cọc) giữa lúc khách đang chờ, không cách lấy lại, không được báo vì sao; mức HIGH dựa vào tần suất iOS thu hồi app PWA khi chuyển sang Zalo/nghe gọi (CHƯA KIỂM trên iPhone thật) — nếu chỉ tính các ngả đã chứng minh (hết 7 ngày giữa lúc gõ, đổi PIN/gỡ Face ID ở máy khác) thì là MEDIUM.
- **lang_kinh**: L4, L2, L5
- **diem_khuat**: Mọi người đã nghĩ rằng đưa người dùng về đăng nhập rồi quay lại đúng trang (goLogin với ?next=) là xử lý hết phiên chu đáo, nhưng thật ra ?next= chỉ đưa về một form TRỐNG: đơn đang gõ chỉ sống trong DOM, và chính dự án đã thiết kế lối thoát bảo trì để giữ chữ đang gõ (maintenance-screen.ts:57, :92 — chỉ inert, không xoá) còn lối thoát 401 thì location.replace xoá sạch.
- **bang_chung**: web/api.ts:41-45 (goLogin = location.replace('/login?next=…')), web/api.ts:70 (mọi 401 'unauthenticated' ngoài /login → goLogin); web/order-form.ts không có localStorage/sessionStorage/beforeunload (grep 'beforeunload|localStorage|sessionStorage|pagehide|visibilitychange' web/*.ts chỉ ra help-seen.ts, login.ts); src/modules/auth/session.ts:4,38 phiên 7 ngày CỐ ĐỊNH (không trượt — newSessionCookie chỉ gọi khi đăng nhập/đổi PIN/Face ID: grep newSessionCookie src); web/maintenance-screen.ts:57,92 (lối thoát bảo trì giữ DOM). Kịch bản k1-luong.mjs CA A: điền đơn 12 khách (tổng 15.400.000 ₫, cọc 2.000.000 tiền mặt) → Network.deleteCookies td_session (= trình duyệt bỏ cookie khi hết Max-Age 7 ngày) → bấm Lưu → /login?next=%2Forder-form (trang đăng nhập không có một chữ nào về đơn chưa lưu) → đăng nhập lại qua giao diện → /order-form với name='', 0 dịch vụ, '0 ₫'; D1 có 0 đơn. CA A2: điền xong → Page.reload → form trống, localStorage+sessionStorage = []. Kịch bản k2.mjs (c): đang gõ đơn ở điện thoại, cùng tài khoản đổi PIN ở 'máy khác' (POST /api/account/change-pin → 200) → bấm Lưu ở điện thoại → /login?next=%2Forder-form, dữ liệu mất.
- **tai_hien**: 1) Sales mở /order-form trên điện thoại, gõ tên, SĐT, chọn Tour 4 đảo, 10 NL + 2 TE, cọc 2 triệu. 2) Trong lúc đó phiên hết hạn (ngày thứ 7 kể từ lần đăng nhập) HOẶC chính họ đổi PIN/gỡ Face ID trên máy khác HOẶC quản trị đặt lại PIN/ngưng rồi kích hoạt lại tài khoản HOẶC iOS thu hồi app PWA khi chuyển sang Zalo/nghe điện thoại. 3) Bấm 'Lưu đơn nháp' (hoặc quay lại app) → bị đưa sang trang đăng nhập / form trắng. 4) Đăng nhập lại → form trống, phải hỏi lại khách và gõ lại từ đầu. Kết quả sai: mất dữ liệu đã nhập, không có thông báo.
- **phan_loai**: lỗi mã
- **huong_sua**: (1) Lưu nháp form lập đơn vào sessionStorage/localStorage theo tài khoản mỗi lần input (khoá theo staffId + 'new' hoặc id đơn), khôi phục khi mở lại /order-form, xoá khi lưu thành công; (2) ở order-form bắt 401 trước khi goLogin: giữ dữ liệu vào bộ nhớ trình duyệt rồi mới chuyển, trang đăng nhập nói 'Phiên đã hết hạn — đơn đang soạn đã được giữ lại'; (3) cân nhắc phiên trượt (gia hạn khi còn < 1 ngày) — quyết định bảo mật, cần chủ. Lưu nháp cục bộ là cửa hai chiều; đổi chính sách phiên là quyết định cần chủ duyệt.
- **cua**: hai chiều
- **do_tin**: ĐÃ CHỨNG MINH
- **doi_chieu_so_cu**: AUDIT-PWA-IPHONE.md:95 chỉ ghi 'phiên 7 ngày cố định' là rủi ro chung; AUDIT-2026-09-22-KIEN-TRUC F-06 nói thu hồi phiên theo thiết bị; chống gửi trùng (F-02) nói đơn lặp. Không sổ nào ghi hậu quả 'mất đơn đang gõ'. Bảo trì 'phần chưa lưu mất' ở SYSTEM-DESIGN §9 là lối thoát khác (và ở đó DOM được giữ). Tần suất trên iPhone thật (iOS thu hồi PWA) CHƯA KIỂM.
- **anh**: docs/evidence/diem-khuat-2026-09-24/d-t4-t8/a1-form-da-dien-truoc-khi-het-phien.png, docs/evidence/diem-khuat-2026-09-24/d-t4-t8/a2-bi-day-ve-dang-nhap.png, docs/evidence/diem-khuat-2026-09-24/d-t4-t8/a3-form-trong-sau-dang-nhap-lai.png, docs/evidence/diem-khuat-2026-09-24/d-t4-t8/a4-form-trong-sau-tai-lai.png, docs/evidence/diem-khuat-2026-09-24/d-t4-t8/k2c-doi-pin-may-khac-roi-luu.png

## DK-T4-02 — Hướng dẫn viên huỷ đơn đã xác nhận bằng 2 chạm, không hỏi lại, kể cả tour đã đi từ tháng trước — cùng hành động ở Sales có hộp 'không thể hoàn tác'
- **muc**: HIGH
- **ly_do_muc**: Một chạm nhầm trên thuyền/bến làm đơn đã xác nhận (có cọc) thành 'Đã huỷ' vĩnh viễn — không đường quay lại, đơn biến khỏi 'Chuyến đón hôm nay' và 'Việc của tôi', khách có thể bị bỏ lại, kế toán không nhận tín hiệu.
- **lang_kinh**: L2, L4, Thời gian
- **diem_khuat**: Mọi người đã nghĩ rằng 'lý do huỷ bắt buộc từ danh sách đóng' (ADR-0014 điều 11) đã là lớp hỏi lại, nhưng thật ra chính nút lý do LÀ nút huỷ: chạm 'Huỷ đơn này' → chạm một lý do = huỷ ngay (web/account.ts:383-406), trong khi đường huỷ của Sales/Admin cho cùng việc một chiều này có confirm 'Việc huỷ không thể hoàn tác' (web/order.ts:282, :337); và danh sách 'Việc của tôi' không lọc ngày nên mọi tour cũ vẫn nằm đó với nút huỷ/sửa sống.
- **bang_chung**: web/account.ts:383-406 (cancelBtn → hiện 2 nút lý do → click gọi doCancel ngay, không confirm); web/order.ts:282,337 (Sales/Admin: confirm('Huỷ đơn này? Việc huỷ không thể hoàn tác.')); src/modules/orders/index.ts:118-125 getMyAssignments chỉ lọc status==='confirmed', không lọc ngày; src/modules/dispatch/index.ts:126-141 (handler-cancel) và :146-166 (handler-money-edit) không kiểm ngày đi tour; canTransition không có cancelled→*. Kịch bản k1-luong.mjs LUỒNG 3: HDV chạm 'Huỷ đơn này' → chạm 'Khách yêu cầu huỷ' → orders.status='cancelled', window.confirm không được gọi lần nào (confirmDialogs=[]), 'Việc của tôi' còn 'Bạn chưa được giao phụ trách đơn nào.'; ảnh l3-hdv-sau-cham-huy-don.png cho thấy 2 nút lý do nằm ngay dưới 'Lưu số khách mới'. CA D: đơn xác nhận rồi mô phỏng thời gian trôi (UPDATE order_service.depart_date = 2026-08-15, trigger 0008 không chặn cột này) → GET /api/dispatch/mine vẫn trả đơn ngày 2026-08-15; POST handler-money-edit (4 NL → 1 NL) trên đơn 40 ngày trước → 200 {ok:true}; sau khi sửa, ô 'Còn thiếu' của kế toán hiện 350k (= 1 × 1.350.000 − cọc 1.000.000; trước khi sửa theo công thức là 4 × 1.350.000 − 1.000.000 = 4.400.000, không đo trực tiếp).
- **tai_hien**: 1) Admin tạo tài khoản vai 'Hướng dẫn viên nội bộ'; Sales xác nhận đơn 12 khách cọc 3 triệu, giao HDV. 2) HDV mở app → tab Tôi → 'Việc của tôi' → định sửa số khách, chạm nhầm 'Huỷ đơn này' rồi chạm một trong hai nút lý do hiện ngay bên dưới. 3) Đơn thành 'Đã huỷ' tức thì, không hộp hỏi lại, không nút hoàn tác, không ai được báo. Biến thể thời gian: tour đã đi 40 ngày trước vẫn trong 'Việc của tôi', vẫn huỷ/sửa số khách được (200).
- **phan_loai**: lỗi mã
- **huong_sua**: Thêm bước xác nhận cùng chữ với đường Sales ('Huỷ đơn <mã> của <khách>? Không thể hoàn tác.'); tách nút lý do khỏi vùng nút lưu; 'Việc của tôi' chỉ hiện đơn có ngày đi ≥ hôm nay − 1 (hoặc tách 'Đã qua'); máy chủ từ chối handler-cancel/handler-money-edit khi mọi dịch vụ đã qua ngày (cần chủ quyết mốc). Giao diện: hai chiều; chặn ở máy chủ theo ngày: đụng luật nghiệp vụ → chủ duyệt.
- **cua**: hai chiều
- **do_tin**: ĐÃ CHỨNG MINH
- **doi_chieu_so_cu**: ADR-0014 điều 11 (chỉ quy định lý do đóng), đặc tả 2026-09-22-sua-so-khach-dich-vu-sau-xac-nhan.md, kế hoạch phase B: không đâu yêu cầu/nhắc hỏi lại hay giới hạn ngày. AUDIT-2026-09-22-DOI-TAC D-03 (HDV chưa có chức năng) đã lỗi thời. Không trùng sổ nào.
- **anh**: docs/evidence/diem-khuat-2026-09-24/d-t4-t8/l3-hdv-viec-cua-toi.png, docs/evidence/diem-khuat-2026-09-24/d-t4-t8/l3-hdv-sau-cham-huy-don.png, docs/evidence/diem-khuat-2026-09-24/d-t4-t8/l3-hdv-don-da-bi-huy.png

## DK-T8-01 — Ô 'Còn thiếu tiền' ở Trang chủ không bao giờ giảm khi tour đã đi hoặc đã thu tiền ngoài app: cộng mọi đơn đã xác nhận từ trước tới nay (chỉ huỷ đơn hoặc HDV bớt khách mới làm giảm), không có đường ghi 'đã thu', 'ngày đón sớm nhất' trỏ về quá khứ, bấm vào ra danh sách không lọc
- **muc**: MEDIUM
- **ly_do_muc**: Sau vài tuần con số chủ và kế toán nhìn đầu tiên mỗi sáng thành vô nghĩa (gồm cả tour đã đi và đã thu tiền mặt), dễ dẫn tới gọi đòi tiền nhầm hoặc bỏ qua khoản thật; không mất dữ liệu nhưng mất lòng tin vào số liệu.
- **lang_kinh**: Thời gian, L6, L1
- **diem_khuat**: Mọi người đã nghĩ rằng 'còn thiếu tiền' là danh sách việc cần thu, nhưng thật ra hệ thống không có trạng thái 'đã đi tour' hay 'đã thu' (N3 chưa làm), nên phạm vi mà chủ để ngỏ ('chưa chốt' ở tệp quyết định Trang chủ) đã được đặc tả Trang chủ (do AI soạn, tự ghi còn điểm cần chủ xác nhận) lấp bằng 'confirmed, remaining_amount > 0' không giới hạn ngày — một số không bao giờ giảm theo thời gian; và kế hoạch còn đổi ô 'lọc sẵn' của đặc tả thành link trần '/orders'.
- **bang_chung**: src/modules/orders/repository.ts:432-456 (SELECT … FROM orders WHERE status='confirmed' — không điều kiện ngày; earliestUnpaid = MIN(depart_date) không chặn dưới hôm nay); docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md:20 (phạm vi 'Còn thiếu tiền' ghi 'Chưa chốt'); docs/superpowers/specs/2026-09-23-trang-chu-moi-design.md:24,44 (đặc tả tự định nghĩa unpaid = 'confirmed, remaining_amount > 0'); docs/superpowers/plans/2026-09-23-trang-chu-moi.md:30 (kế hoạch: ô bấm vào dẫn trang Đơn hàng không lọc — lệch design:24 'lọc sẵn'); web/home.ts:62 (ô số liệu href '/orders' — đặc tả 2026-09-23-trang-chu-moi-design.md:24 ghi 'đi tới trang Đơn hàng lọc sẵn'); web/orders.ts chỉ có ô tìm q + chọn trạng thái (không lọc ngày/tiền); không route nào giảm remaining_amount của đơn confirmed ngoài huỷ và handler-money-edit (grep route( src/modules/*/index.ts). Kịch bản k1-luong.mjs CA D (mô phỏng thời gian trôi: depart_date đổi thành 2026-08-15 bằng SQL, hôm nay 2026-09-24): GET /api/orders/dashboard → unpaid {total:350000,count:1,earliestDate:'2026-08-15'}; kế toán mở Trang chủ thấy 'CÒN THIẾU 350k ₫ 1 đơn' (ảnh d1), bấm ô → /orders, q='', status='' , chỉ có 2 điều khiển q/status (ảnh d2).
- **tai_hien**: 1) Sales lập + xác nhận đơn, khách cọc một phần, phần còn lại thu tiền mặt tại bến (ngoài hệ thống). 2) Tour đi xong. 3) Mọi ngày sau, ô 'Còn thiếu' vẫn cộng đơn đó; sau 1 năm (nghìn đơn) con số = tổng mọi phần chưa ghi thu của mọi tour từng đi. 4) Bấm ô → danh sách toàn bộ đơn, không lọc được 'còn thiếu' hay theo ngày.
- **phan_loai**: tài liệu chuẩn tắc cần ADR mới
- **huong_sua**: Chủ chốt phạm vi ô (vd chỉ đơn có ngày đi ≥ hôm nay, hoặc đổi nhãn 'Chưa ghi thu') cho tới khi N3 có sổ thu; ô bấm vào mở /orders?unpaid=1&from=… (cần thêm bộ lọc ở GET /api/orders); ghi rõ trong Trợ giúp là số ước tính. Hai chiều.
- **cua**: hai chiều
- **do_tin**: ĐÃ CHỨNG MINH
- **doi_chieu_so_cu**: HANDOFF-N1 'Việc còn treo' chỉ ghi chi phí quét toàn bảng của cùng truy vấn (hiệu năng), không ghi ý nghĩa số liệu trôi theo thời gian. KIEN-TRUC F-08 nói tiền cọc trên đơn huỷ. Không trùng.
- **anh**: docs/evidence/diem-khuat-2026-09-24/d-t4-t8/d1-ke-toan-trang-chu-o-con-thieu-tien.png, docs/evidence/diem-khuat-2026-09-24/d-t4-t8/d2-ke-toan-bam-o-con-thieu-tien.png

## DK-T8-02 — Cờ 'cần chú ý hoàn cọc cho Kế toán' đã duyệt ở ADR-0014 điều 11 không tồn tại; đơn bị HDV huỷ có cọc 3 triệu hiện 'Còn thu 5,1tr' trên thẻ
- **muc**: MEDIUM
- **ly_do_muc**: Khách đã chuyển khoản cọc mà tour bị huỷ có thể không được hoàn (kế toán không có tín hiệu nào), hoặc bị gọi đòi 'còn thu' cho một đơn đã huỷ — mất tiền/lòng tin khách.
- **lang_kinh**: L6, L2, L1
- **diem_khuat**: Mọi người đã nghĩ rằng dòng nhật ký riêng 'order_cancelled_by_field' là 'đánh dấu cho Kế toán' như ADR đã duyệt, nhưng thật ra dòng đó chỉ thấy khi mở từng đơn (trang nhật ký chung chỉ admin vào được), không có danh sách/đếm/cờ nào — và thẻ đơn huỷ còn nói điều ngược lại: 'Còn thu 5,1tr', trong khi Trang chủ lại loại đơn huỷ khỏi 'Còn thiếu' (hai luật cho cùng một đơn).
- **bang_chung**: docs/adr/ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md:113 ('đơn có deposit_amount > 0 bị FIELD huỷ được đánh dấu "cần chú ý hoàn cọc" cho ACCOUNTING'); docs/superpowers/specs/2026-09-22-tai-khoan-doi-tac-super-admin.md:25 và :60 ('cờ hiển thị'); đặc tả thi công 2026-09-22-sua-so-khach-dich-vu-sau-xac-nhan.md:112 tự đưa 'UI riêng cho ACCOUNTING xem đơn cần chú ý' ra ngoài phạm vi; grep 'order_cancelled_by_field' src web → chỉ audit-actions.ts:23 và orders/index.ts:54; src/modules/audit/index.ts:29 GET /api/audit access 'admin'; web/order-card.ts:113 'Còn thu' hiện cho mọi trạng thái; repository.ts:433 dashboard chỉ status='confirmed'. Kịch bản k2.mjs (b): đơn cọc 3.000.000 chuyển khoản, HDV huỷ → GET /api/orders?status=cancelled trả đơn không có trường nào kiểu refund/attention/flag; dashboard keys = today, unpaid, draftCount, unassignedCount, revenueWeek; thẻ danh sách 'Đã huỷ … Còn thu 5,1tr ₫' (ảnh k2b-ke-toan-danh-sach-don-huy.png); dấu vết duy nhất là dòng lịch sử cuối trang đơn 'Huỷ đơn (hướng dẫn viên đang phụ trách) · Khách yêu cầu huỷ' (ảnh k2b-ke-toan-trang-don-bi-hdv-huy.png).
- **tai_hien**: 1) Đơn 6 khách, cọc 3 triệu chuyển khoản, đã xác nhận, giao HDV. 2) HDV huỷ ('Khách yêu cầu huỷ'). 3) Kế toán mở Trang chủ: không có gì; mở Đơn hàng lọc 'Đã huỷ': thẻ ghi 'Còn thu 5,1tr ₫'; muốn biết đơn nào cần hoàn cọc phải mở từng đơn huỷ đọc lịch sử.
- **phan_loai**: lỗi mã
- **huong_sua**: Thi công đúng điều 11: cờ/đếm 'cần hoàn cọc' cho ACCOUNTING (vd ô trên Trang chủ + bộ lọc), thẻ đơn huỷ hiện 'Đã cọc X — cần hoàn' thay 'Còn thu'; hoặc chủ ra quyết định mới nếu muốn hoãn. ADR đã duyệt thắng mã, không sửa ADR. Hai chiều.
- **cua**: hai chiều
- **do_tin**: ĐÃ CHỨNG MINH
- **doi_chieu_so_cu**: KIEN-TRUC F-08 (tiền cọc trên đơn huỷ, 'rủi ro còn lại: đọc tay coi còn lại của đơn huỷ là khoản phải thu') — nay rủi ro đó đã thành màn hình thật (Đợt E thêm 'Còn thu' vào thẻ mọi trạng thái), nên báo lại theo tiêu chí (a). Mục §8 'Ngoài phạm vi' của đặc tả sua-so-khach do người soạn viết — đầu đặc tả chỉ nói chủ quyết ba điều ở §1, KHÔNG ghi chủ duyệt việc bỏ cờ cho Kế toán; ADR-0014 điều 11 (accepted) vẫn yêu cầu cờ ⇒ lệch chưa được chủ quyết. Phase D (chấm báo CTV) đã được ghi là chưa làm ở HANDOFF-ADR-0014-PHASE-BCD — khác cờ cho Kế toán ở điều 11, cờ này không có trong sổ nào.
- **anh**: docs/evidence/diem-khuat-2026-09-24/d-t4-t8/k2b-ke-toan-danh-sach-don-huy.png, docs/evidence/diem-khuat-2026-09-24/d-t4-t8/k2b-ke-toan-trang-don-bi-hdv-huy.png

## DK-T8-03 — Khách đổi số người tại bến sau khi xác nhận: người lập (đồng thời là người phụ trách mặc định) không có nút nào; đường duy nhất là HDV — nhưng đơn mới mặc định giao cho chính Sales
- **muc**: MEDIUM
- **ly_do_muc**: Tình huống hằng ngày (bớt/thêm khách phút chót) không làm được trong app với mọi đơn chưa được giao lại cho HDV (tỉ lệ thật CHƯA đo) → Sales phải huỷ và lập lại (gõ lại ~8 ô, mất lịch sử, mã đơn mới, ảnh xác nhận mới) hoặc ghi ra giấy; số tiền trên app sai với tiền thu thật.
- **lang_kinh**: L1, L4
- **so_do**: Đếm thật (k1-luong.mjs): lập đơn 12 khách tới xác nhận = 20 chạm, 8 ô gõ, 3 màn hình; huỷ + lập lại = thêm 2 chạm huỷ (Huỷ đơn, OK) + ~20 chạm / 8 ô gõ lại (suy từ luồng 1, không chạy riêng).
- **diem_khuat**: Mọi người đã nghĩ rằng ADR-0014 điều 6 (HDV đang phụ trách sửa số khách sau xác nhận) đã giải bài toán 'đổi khách tại bến', nhưng thật ra người phụ trách mặc định của đơn mới là NGƯỜI LẬP (Sales), ô order.money.edit của SALES = own không có route nào, nên với đơn chưa được giao lại cho HDV thì không ai trong app đổi được số khách (trừ SUPER_ADMIN).
- **bang_chung**: k1-luong.mjs LUỒNG 2: Sales mở đơn đã xác nhận thấy các nút ['Sửa thông tin chuyến','Huỷ đơn','Xác nhận gửi khách','Đổi người phụ trách','Đổi khách'] — không nút số khách (ảnh l2-sales-don-da-xac-nhan-cac-nut.png); LUỒNG 1: bảng chọn người phụ trách cho thấy 'Sales Một — Đang phụ trách' ngay sau khi lập (người lập là người phụ trách mặc định, SYSTEM-DESIGN §6(j)); src/shared/permissions.ts:56 order.money.edit SALES='own' — SYSTEM-DESIGN §8 cột 'Thi hành' chỉ có route handler-money-edit; src/modules/dispatch/index.ts:155-156 route hẹp chỉ cho ô ='assigned' (FIELD) hoặc SUPER_ADMIN; hộp xác nhận nói 'dịch vụ, số khách và tiền sẽ bị khoá' (k1 confirmPrompt).
- **tai_hien**: 1) Sales lập và xác nhận đơn 12 khách (không giao HDV — mặc định Sales là người phụ trách). 2) Sáng hôm đi, khách báo chỉ 10 người. 3) Sales mở đơn: không có chỗ đổi số khách. 4) Lựa chọn: giao đơn cho một HDV rồi nhờ HDV sửa trong 'Việc của tôi', hoặc huỷ đơn và lập đơn mới gõ lại toàn bộ.
- **phan_loai**: tài liệu chuẩn tắc cần ADR mới
- **huong_sua**: Chủ quyết: mở route sửa số khách sau xác nhận cho người lập/người phụ trách văn phòng (dùng lại dòng điều chỉnh chỉ-thêm của điều 6), hoặc ghi rõ quy trình 'giao HDV để sửa' trong Trợ giúp. Đụng tiền/quyền → ADR + kiểm độc lập.
- **cua**: hai chiều
- **do_tin**: ĐÃ CHỨNG MINH
- **doi_chieu_so_cu**: N3 (sửa sau xác nhận) nằm ở lộ trình SYSTEM-DESIGN §14/HANDOFF-N1; SYSTEM-DESIGN §16 dòng ADR-0007 ghi 13/25 ô không được hỏi (không nêu hậu quả nghiệp vụ này). Điểm mới: ghép ADR-0009 (người lập = người phụ trách mặc định) + ADR-0014 điều 6 (chỉ cấp hẹp FIELD) làm đường sửa chỉ mở cho thiểu số đơn — không sổ nào ghi.
- **anh**: docs/evidence/diem-khuat-2026-09-24/d-t4-t8/l2-sales-don-da-xac-nhan-cac-nut.png, docs/evidence/diem-khuat-2026-09-24/d-t4-t8/l1-bang-chon-nguoi-phu-trach.png

## DK-T4-03 — Thông điệp lộ mã trạng thái tiếng Anh 'Không thể chuyển đơn từ "cancelled" sang "cancelled".' nay chạm được bằng thao tác thường ngày
- **muc**: LOW
- **ly_do_muc**: Sales thấy câu có chữ Anh thô, không hiểu đơn đã bị HDV huỷ; vi phạm luật ngôn ngữ CLAUDE.md §7, không mất dữ liệu.
- **lang_kinh**: L1, L6
- **diem_khuat**: Mọi người đã nghĩ rằng đường lỗi này 'khó chạm từ giao diện (nút chỉ hiện chuyển hợp lệ)', nhưng thật ra từ khi HDV huỷ được đơn (Phase B), chỉ cần Sales đang mở trang đơn lúc HDV huỷ ngoài bến là bấm 'Huỷ đơn' ra đúng câu này — và kịch bản Chrome cũ còn khoá chính câu lộ mã.
- **bang_chung**: src/modules/orders/index.ts:296; src/shared/order-errors.ts classifyOrderError không có nhánh invalid_transition → fallback e.message; docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-order.mjs:161 khẳng định /Không thể chuyển đơn từ/. Kịch bản k2.mjs (a): Sales mở trang đơn đã xác nhận, HDV gọi handler-cancel (200), Sales bấm 'Huỷ đơn' + OK → banner 'Không thể chuyển đơn từ "cancelled" sang "cancelled".' + 'Tải lại đơn' (ảnh k2a).
- **tai_hien**: Sales mở đơn → HDV huỷ đơn đó ở 'Việc của tôi' → Sales bấm 'Huỷ đơn' → OK → banner lộ 'cancelled'.
- **phan_loai**: lỗi mã
- **huong_sua**: Thêm nhánh invalid_transition vào classifyOrderError: 'Đơn vừa được đổi trạng thái (Đã huỷ) ở nơi khác. Tải lại để xem.'; máy chủ dùng nhãn tiếng Việt; sửa khẳng định trong a2-smoke-order.mjs. Hai chiều.
- **cua**: hai chiều
- **do_tin**: ĐÃ CHỨNG MINH
- **doi_chieu_so_cu**: Đã ghi là 'phát hiện phụ, ngoài phạm vi' ở docs/superpowers/plans/2026-09-21-doi-chieu-oracle-tca-ke-hoach-hanh-dong.md:353 với tiền đề 'khó chạm từ giao diện', chưa vào task nào. Báo lại theo tiêu chí (b): tiền đề đã sai sau ADR-0014 Phase B.
- **anh**: docs/evidence/diem-khuat-2026-09-24/d-t4-t8/k2a-sales-huy-sau-hdv-thong-diep-ma-tho.png

## DK-T4-04 — Thực tập sinh lập đơn: ngoài danh mục 403 (đã biết), mỗi đơn còn gặp 'Không tra được hồ sơ' và khối người phụ trách 'Chưa tải được… Thử lại' vĩnh viễn — lỗi quyền hiện như lỗi mạng
- **muc**: LOW
- **ly_do_muc**: Thực tập sinh (đối tác: suy từ mã, CHƯA KIỂM bằng Chrome) được mời 'Thử lại' một việc không bao giờ thành công, không biết đó là giới hạn vai; tốn thời gian, dễ báo lỗi sai.
- **lang_kinh**: L1, L6
- **diem_khuat**: Mọi người đã nghĩ rằng mở order.create/order.view=own cho vai Thực tập là đủ để họ 'lập đơn được', nhưng thật ra màn lập/xem đơn gọi thêm ba API chỉ-văn-phòng (danh mục, tra hồ sơ, người phụ trách) và giao diện diễn giải 403 thành 'không tra được'/'chưa tải được' kèm nút Thử lại.
- **bang_chung**: src/modules/parties/index.ts:154 (GET /api/parties/lookup 'office'), src/modules/dispatch/index.ts:54 (GET /api/dispatch/handlers 'office'), web/booker-picker.ts:62-65, web/order.ts:75,136. k1-luong.mjs LUỒNG 4/5 (tài khoản tạo qua POST /api/staff roles ['INTERN'] → permissions ['INTERN']): form hiện 'Không tải được danh mục dịch vụ — hãy thêm dịch vụ nhập tay.' và sau khi gõ SĐT 'Không tra được hồ sơ — vẫn lưu đơn được, chỉ chưa gắn khách.'; trang đơn mới: 'Người phụ trách / Chưa tải được người phụ trách. / Thử lại' (gọi /api/dispatch/handlers 2 lần), trong khi nút 'Xác nhận đơn', 'Huỷ đơn' vẫn hiện (ảnh l4, l5).
- **tai_hien**: Admin tạo tài khoản vai Thực tập sinh → đăng nhập → Đơn mới → gõ SĐT khách → thấy 'Không tra được hồ sơ'; lưu đơn nhập tay → trang đơn 'Chưa tải được người phụ trách. Thử lại' — bấm bao nhiêu lần cũng vậy.
- **phan_loai**: lỗi mã
- **huong_sua**: Giao diện hỏi can()/isOffice trước khi gọi API chỉ-văn-phòng và ẩn khối (hoặc câu 'Vai của bạn không xem được mục này'); hoặc chủ quyết mở hẹp các API đó cho INTERN (gộp với câu hỏi R27). Hai chiều.
- **cua**: hai chiều
- **do_tin**: ĐÃ CHỨNG MINH
- **doi_chieu_so_cu**: R27 / HANDOFF-N1 Việc còn treo mục 5 chỉ ghi danh mục 403 cho Thực tập sinh; SYSTEM-DESIGN §9 ghi Đối tác nhận 403 ở /api/dispatch/handlers trên trang DANH SÁCH (ẩn dòng, đúng thiết kế) — không ghi trang đơn và tra hồ sơ. Phần danh mục đưa vào bi_loai.
- **anh**: docs/evidence/diem-khuat-2026-09-24/d-t4-t8/l4-thuc-tap-form.png, docs/evidence/diem-khuat-2026-09-24/d-t4-t8/l5-thuc-tap-trang-don-moi.png, docs/evidence/diem-khuat-2026-09-24/d-t4-t8/l5-thuc-tap-trang-don-sau-dong-hop-thoai.png

## DK-T8-04 — Lý do huỷ: HDV bị ép chọn 1 trong 2 lý do không có 'thời tiết/biển động'; Sales/Admin huỷ thì không ghi lý do nào — dữ liệu lý do huỷ không dùng được
- **muc**: LOW
- **ly_do_muc**: Chủ không thống kê được vì sao mất đơn (thời tiết, khách bỏ, liên hệ không được) và nhật ký ghi lý do sai sự thật khi HDV huỷ vì biển động.
- **lang_kinh**: L4, L2
- **diem_khuat**: Mọi người đã nghĩ rằng danh sách lý do đóng giữ dữ liệu sạch, nhưng thật ra một nguyên nhân huỷ tour đảo thường gặp (thời tiết, cảng vụ cấm tàu — giả định nghề, CHƯA đo bằng dữ liệu) không có trong danh sách nên HDV phải chọn một lý do không đúng, còn đường huỷ của Sales/Admin không nhận lý do nào.
- **bang_chung**: src/modules/dispatch/rules.ts:74-78 (CANCEL_REASONS = not_reachable, customer_requested); src/modules/orders/index.ts:286-299 (POST /status chỉ đọc body.status, cancelOrder không detail); web/order.ts:282 (confirm không có ô lý do); đặc tả tai-khoan-doi-tac-super-admin.md:59 (hai lý do lấy nguyên văn lời chủ).
- **tai_hien**: Ngày biển động, HDV huỷ đơn: chỉ có 'Không liên hệ được với khách' / 'Khách yêu cầu huỷ' → chọn một lý do sai; Sales huỷ các đơn còn lại → nhật ký 'Huỷ đơn' không lý do.
- **phan_loai**: tài liệu chuẩn tắc cần ADR mới
- **huong_sua**: Trình chủ thêm lý do 'Thời tiết / cảng vụ cấm tàu' (và 'Khác + ghi chú'), và cho đường huỷ Sales nhận lý do cùng danh mục. Hai chiều.
- **cua**: hai chiều
- **do_tin**: CÓ BẰNG CHỨNG MÃ
- **doi_chieu_so_cu**: Hai lý do là quyết định nguyên văn của chủ (ADR-0014 §4.5 câu 4) — không phải lỗi thi công; báo như câu hỏi cần quyết định mới, không có trong sổ nào.
- **anh**: 

## Bị loại
- Timeout 45 giây/mất mạng sau khi bấm Lưu tạo đơn trùng: Đã có: AUDIT-2026-09-22-KIEN-TRUC F-02, đặc tả chống gửi trùng 2026-09-22-chong-gui-trung.md (chờ chủ).
- HDV trên biển không có mạng không xem được 'Việc của tôi' (không offline): Ngoài phạm vi có chủ đích: 2026-09-19-iphone-pwa-design.md:9, Q7; PWA-IPHONE.md:19.
- Đơn nhiều ngày: dịch vụ ngày 2, 3 không vào 'Chuyến đón hôm nay': Quyết định 7 của chủ (trang-chu-moi-quyet-dinh.md:15) và kế hoạch 2026-09-23-trang-chu-moi.md:243 cố ý kiểm việc loại trừ này.
- HDV mở app thấy Trang chủ báo 'Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này.': Đã ghi ở SYSTEM-DESIGN §9 ('chỉ-FIELD vẫn thấy banner lỗi 403') và start-page.ts chú thích — có chủ đích.
- Thực tập sinh nhận 403 ở danh mục dịch vụ: R27 / HANDOFF-N1 Việc còn treo mục 5 — chờ chủ quyết.
- Tiền cọc/còn lại trên đơn huỷ (dữ liệu): KIEN-TRUC F-08; chỉ dùng làm bằng chứng phụ trong DK-T8-02 (rủi ro nay đã hiện trên thẻ).
- Chấm đếm báo Đối tác khi HDV sửa/huỷ (ADR-0014 điều 12): Phase D ghi chưa làm ở HANDOFF-ADR-0014-PHASE-BCD.md:24.
- Phiên 7 ngày cố định (bản thân chính sách): AUDIT-PWA-IPHONE.md:95 đã ghi là rủi ro; chỉ báo HẬU QUẢ mất đơn đang gõ (DK-T4-01).
- Kế toán thấy ô 'DOANH THU CỦA TÔI 0 ₫' vô nghĩa với vai kế toán: Bề mặt nhỏ, chưa đủ nặng để vào top; ghi ở phần riêng.
- Chế độ bảo trì làm mất phần chưa lưu khi tải lại: Đã ghi ở SYSTEM-DESIGN §9 (lớp phủ giữ DOM, tải lại thì mất) — chấp nhận có chủ đích.

## Chưa kiểm
- iPhone thật: tần suất iOS thu hồi app PWA khi chuyển sang Zalo/nghe điện thoại (DK-T4-01 biến thể tải lại) — chỉ mô phỏng bằng Page.reload trên Chrome headless.
- Mạng 3G chập chờn/offline giữa chừng bằng Network.emulateNetworkConditions: chưa chạy (ưu tiên các ca mất dữ liệu đã chứng minh); đường mất mạng khi Lưu đã có NETWORK_BANNER và đơn trùng thuộc F-02.
- bfcache khi vuốt Back trên iOS thật: chưa kiểm (Chrome headless không tái hiện hành vi Safari).
- Tài khoản Đối tác (PARTNER) đi hết luồng: chưa tạo tài khoản đối tác; suy từ mã rằng cùng các 403 như DK-T4-04 (CHƯA KIỂM bằng Chrome).
- Luồng admin thêm nhân viên mới / rút quyền người nghỉ / bật bảo trì bằng giao diện: chưa chạy Chrome (tạo tài khoản chỉ qua API quản trị).
- Luồng huỷ hàng loạt ngày thời tiết xấu: chưa đếm bằng kịch bản; chỉ suy từ luồng huỷ một đơn (Huỷ đơn + OK = 2 chạm + mở đơn).
- Số đo thời gian: không đo (máy bận, load 6–8).
- Nhân viên nghỉ việc: v_dsp_order_handler (migrations/0014_dispatch.sql:63-72) không lọc tài khoản đang hoạt động và grep không thấy accounts/staff đóng dòng HANDLE khi ngưng tài khoản ⇒ đơn TƯƠNG LAI của người nghỉ vẫn «có người phụ trách», không vào ô CHƯA PHỤ TRÁCH, người khác không nhận được (dispatch.claim chỉ khi chưa có người). R-DSP-2b đã ghi mức cảnh báo cho dữ liệu này («lịch sử hợp lệ lâu dài»); hậu quả trên màn hình với đơn sắp đi CHƯA KIỂM bằng Chrome.

## Gợi ý ghép chéo
- T7/Thời gian: getMyAssignments (src/modules/orders/index.ts:118-122) gọi loadOrderView + findOrder cho TỪNG đơn đang phụ trách, không lọc ngày → N+1 truy vấn tăng mãi theo số tour HDV từng nhận (không bao giờ đóng dòng HANDLE sau khi tour xong).
- Bảo mật/quyền: HDV sửa số khách/tiền của đơn đã đi từ lâu (CA D, 200) — trục quyền nên xét giới hạn thời gian cho order.money.edit phạm vi assigned.
- Ghép L1: ADR-0009 (người lập = người phụ trách mặc định) + ADR-0014 điều 6 (chỉ FIELD sửa sau xác nhận) + order.money.edit SALES=own không route ⇒ đường sửa số khách chỉ tồn tại cho đơn được giao lại (DK-T8-03).
- Ghép L2 tiền: thẻ đơn (Còn thu mọi trạng thái) vs Trang chủ (chỉ confirmed) vs ADR-0014 (đơn huỷ có cọc = cần hoàn) — ba cách đọc cùng một đơn huỷ (DK-T8-02).
- Hàng rào: docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-order.mjs:161 khẳng định câu lộ mã thô — kịch bản kiểm đang khoá hành vi sai (DK-T4-03).

## Trục (d) — Bảng luồng (đếm THẬT bằng kịch bản Chrome `k1-luong.mjs`/`k2.mjs`, khổ 375×812 mobile, D1 tạm; mã HEAD 4620e61)

| # | Luồng | Số chạm | Số màn hình | Gõ lại | Điểm nghẽn |
|---|---|---|---|---|---|
| 1 | Sales lập đơn đoàn 12 khách → lưu → xác nhận → giao HDV | **20** (8 ô gõ; +11 chạm nếu tăng số khách bằng nút + thay vì gõ ô) | 3 (`/orders` → `/order-form` → `/order`) | 0 | Khối "Thông tin chuyến" thu gọn ở ≤640px (phải mở); hộp ảnh "Xác nhận đơn để gửi khách" tự bật khi đơn còn NHÁP, phải đóng rồi mới xác nhận; không lưu nháp — hết phiên/đổi PIN máy khác/app bị tải lại là mất hết (DK-T4-01) |
| 2 | Khách đổi 12 → 10 người tại bến SAU xác nhận (Sales) | Không làm được: 0 nút số khách. Cách vòng: huỷ (Huỷ đơn + OK = 2) + lập lại (~20, suy từ luồng 1) | 3–4 | **~8 ô** (tên, SĐT, dịch vụ, số khách, ngày, giờ đón, điểm đón, cọc) | Chỉ HDV đang phụ trách sửa được; người phụ trách mặc định là chính Sales (DK-T8-03) |
| 3 | HDV sáng sớm mở app → "Việc của tôi" → sửa 12→10 | 5 (tab Tôi, −, −, gõ lý do, Lưu) | 2 (`/` báo "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này." → `/account`) | 0 | Mở app luôn rơi vào màn báo lỗi; sau khi lưu không có dòng xác nhận số mới; danh sách không lọc ngày (tour cũ vẫn nằm đó) |
| 3b | HDV huỷ đơn | **2** (Huỷ đơn này → một nút lý do), **0 hộp hỏi lại** | 1 | 0 | Một chiều, không hoàn tác; Sales cùng việc có hỏi lại (DK-T4-02); không có lý do "thời tiết" (DK-T8-04) |
| 4 | Kế toán cuối ngày đối chiếu tiền cần thu | Không làm được trong app: ô "Còn thiếu" (1 chạm) → `/orders` KHÔNG lọc; chỉ có ô tìm chữ + chọn trạng thái; không lọc ngày, không "đã thu" | 2 | — | Ô "Còn thiếu" cộng mọi đơn confirmed mọi thời gian (DK-T8-01); đơn huỷ có cọc hiện "Còn thu 5,1tr" và không có cờ hoàn cọc (DK-T8-02); ô "Doanh thu của tôi 0 ₫" vô nghĩa với kế toán |
| 5 | Thực tập sinh lập đơn | 3 tới thẻ nhập tay (+ gõ tay tên dịch vụ, số lượng, đơn giá) | 2 | Gõ tay giá danh mục (không có danh mục — R27) | "Không tra được hồ sơ"; trang đơn "Chưa tải được người phụ trách. Thử lại" vĩnh viễn (DK-T4-04) |
| 6 | Sales đang mở đơn, HDV huỷ ngoài bến, Sales bấm Huỷ | 2 | 1 | 0 | Banner lộ `"cancelled" sang "cancelled"` (DK-T4-03) |

### Mô tả bằng chữ
1. **Lập đơn → xác nhận → giao HDV.** Danh sách → "Đơn mới" → gõ tên, SĐT → chạm ô tìm, gõ "4 đảo", chạm kết quả → gõ 12 vào ô Người lớn → mở "Thông tin chuyến" → gõ ngày, giờ đón, điểm đón (ô chữ tự do, không chọn từ danh mục Địa điểm) → gõ tiền cọc, chọn hình thức → Lưu → trang đơn tự bật hộp ảnh xác nhận (đơn vẫn nháp) → đóng → "Xác nhận đơn" → OK → "Đổi người phụ trách" (bảng liệt kê cả Sales, HDV, Quản trị; Sales Một "Đang phụ trách") → chọn HDV → Lưu. 20 chạm, 3 màn hình.
2. **Đổi số khách sau xác nhận.** Trang đơn đã xác nhận của Sales chỉ có: Sửa thông tin chuyến, Huỷ đơn, Xác nhận gửi khách, Đổi người phụ trách, Đổi khách. Không có số khách. Hộp xác nhận đã báo trước "dịch vụ, số khách và tiền sẽ bị khoá".
3. **HDV.** Mở app → Trang chủ báo không dùng màn hình này → tab Tôi → "Việc của tôi" (khối bắt đầu y=172px) → −/− → gõ lý do → "Lưu số khách mới". Nút "Huỷ đơn này" nằm ngay dưới; chạm → hai nút lý do → chạm một nút = huỷ ngay.
4. **Kế toán.** Trang chủ: CÒN THIẾU / ĐƠN NHÁP / CHƯA PHỤ TRÁCH / DOANH THU CỦA TÔI; mọi ô trỏ `/orders` không lọc. Danh sách: ô tìm + trạng thái (Mọi/Nháp/Đã xác nhận/Đã huỷ). Không có lọc ngày đi, không "đã thu", không xuất file. Đối chiếu cuối ngày = làm ngoài app.
5. **Thực tế nghề (đối chiếu):** đổi giờ phút chót → làm được (Sửa thông tin chuyến, trong cửa sổ ngày); đổi số khách tại bến → không (trừ HDV đang phụ trách); thời tiết huỷ cả ngày → từng đơn một, không lý do thời tiết; đại lý gửi khách qua Zalo → phải chuyển app để chép, rủi ro iOS tải lại mất form; thu tiền mặt tại chỗ → không có chỗ ghi (N3); đoàn nhiều ngày → ngày 2+ không vào "Chuyến đón hôm nay" (quyết định 7 của chủ); HDV không mạng trên biển → không xem được gì (ngoài phạm vi có chủ đích).
