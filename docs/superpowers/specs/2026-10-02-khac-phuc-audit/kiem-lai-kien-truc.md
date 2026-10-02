# Kiểm lại kiến trúc

Người kiểm độc lập, chỉ đọc. Không sửa tệp nào trong kho. Mã kiểm: nhánh ke-hoach-khac-phuc-audit (= main) @fc268abe, 2/10. Báo cáo gốc đo ở 0ba370d6; từ đó có 95 commit, phần lớn là giao diện (Trang chủ, Giao diện công ty), Vận chuyển đợt 1, chính sách phiên đăng nhập; các tệp được trích dẫn hầu như không đổi.

## Kết luận
Báo cáo CHÍNH XÁC ở phần lõi: 8/9 phát hiện CAO xác nhận bằng mã (vài cái hơi nói quá mức). Trong 24 TRUNG BÌNH: phần lớn xác nhận, 3 xác nhận nhưng nói quá, 1 bác (GD-B-04), 1 đã sửa (GD-R-04), 1 không kiểm được (GD-S-04, pháp lý). Hai phát hiện tiền (F-02, F-03) nay ĐÃ vào sổ docs/quyen-hoan.json (GD-T-01 đã được xử lý); F-02 đã có ADR-0094 accepted nhưng CHƯA có mã vá.

## Bảng phát hiện CAO
| Mã | Mức báo cáo | Mức sau kiểm | Kết luận | Bằng chứng | Đã có ADR/sổ lo |
|---|---|---|---|---|---|
| GD-T-01 | CAO | — | ĐÃ SỬA | docs/quyen-hoan.json nay có F-02 (hạn 15/10), F-03 (hạn 31/10, giữ theo mức gốc HIGH), TNV-G1/G3/G4 | sổ quyen-hoan |
| GD-R-05 (F-02) | CAO | CAO | XÁC NHẬN, chưa vá | billing/service.ts:106 crypto.randomUUID() mỗi lần ghi; grep Idempotency-Key / lg_lan_gui trong src, web, migrations = 0 kết quả (chỉ có trong docs). node --test tests/audit/redteam.test.mjs: 19 pass; R1 (2 đơn khi gửi lại) và R2 (2 hồ sơ khách) vẫn là FINDING còn tái hiện ở mã hiện tại | ADR-0094 accepted 2/10, hạn 15/10 trong sổ; chưa thi công |
| GD-R-01 | CAO | CAO | XÁC NHẬN | ls scripts: không có script sao lưu; không có thư mục .github; đặc tả diễn tập 22/9 vẫn "bản thảo chờ duyệt" (dòng 3); release-lib.mjs:301-312 chỉ có Time Travel | không có ADR/sổ (đặc tả 22/9 chờ duyệt) |
| GD-R-02 | CAO | TRUNG BÌNH | XÁC NHẬN NHƯNG NÓI QUÁ | Đúng: HANDOFF-N1.md:597 (dòng đã đổi từ 587) ghi --file đi cổng nhập khác, từ chối OAuth. Nhưng đây là điều CHƯA CHỨNG MINH, không phải lỗi; chỉ ảnh hưởng kịch bản mất tài khoản Cloudflare, còn Time Travel là đường chính. Nên xếp TRUNG BÌNH | không |
| GD-L-01 | CAO | CAO | XÁC NHẬN (cơ chế); độ lớn chưa đo trên D1 thật | staff/repository.ts:38,107; getActiveStaff gọi mỗi request (auth/index.ts:57). Tự chạy EXPLAIN trên SQLite (node:sqlite) với schema dựng từ migrations: MATERIALIZE v_pty_party_label / SCAN p / SCAN pl LEFT-JOIN. D1 dùng bản SQLite khác nên kế hoạch có thể khác chút | không |
| GD-L-02 | CAO | CAO | XÁC NHẬN | thongbao/index.ts:39-45 (3 truy vấn mỗi lần mở hộp), thongbao/repository.ts LIST_DON: 6 view, ORDER BY ... LIMIT 3000 | không |
| GD-L-03 | CAO | CAO | XÁC NHẬN (cơ chế), độ khuếch đại là ước tính | web/bangtin-logic.ts:10 GOP_MS=1000, :205-208 khiCanTaiLai() khi nối lại | không |
| GD-L-15 | CAO | TRUNG BÌNH-CAO | XÁC NHẬN | orders/index.ts:459-466 Promise.all(orderIds.map(loadOrderView/findOrder)). Tỉ lệ theo số đơn một HDV phụ trách, nên chỉ nặng khi một HDV giữ rất nhiều đơn | không |
| GD-L-09 | CAO | TRUNG BÌNH | XÁC NHẬN NHƯNG NÓI QUÁ nhẹ | wrangler.jsonc:6 observability bật; grep performance.now / durationMs / Server-Timing trong src, web = 0. Đúng là không đo từng route/câu D1; nhưng nhật ký Cloudflare có sẵn thời gian/CPU từng lần gọi | không |

## Bảng phát hiện TRUNG BÌNH
| Mã | Mức sau kiểm | Kết luận | Bằng chứng ngắn | ADR/sổ |
|---|---|---|---|---|
| GD-A-01 | TRUNG BÌNH | XÁC NHẬN | orders/service.ts:374-401 tạo vai CUSTOMER; grep CUSTOMER_OF trong src, migrations = 0 (chỉ ADR-0018 đ10 và dòng kế hoạch) | ADR-0077 đ3 accepted, chưa thi công |
| GD-A-02 | TRUNG BÌNH | XÁC NHẬN | orders/index.ts route /status chỉ nhận status, dùng meta.updatedAt đọc ngay trong request; không có phiên bản client đã thấy (khác đường sửa có v) | không |
| GD-B-01 | TRUNG BÌNH | XÁC NHẬN (chỉ đọc lướt) | orders/repository.ts:127 cộng pax 4 loại; định nghĩa chủ 30/9 chưa vào mã | ADR-0065 đề xuất |
| GD-B-02 | TRUNG BÌNH (chủ giữ HIGH) | XÁC NHẬN, chính xác hơn báo cáo | trigger 0007 ĐÃ ép line_total = quantity*unit_price (0007:31-36) và total = subtotal - discount; chỉ thiếu subtotal = tổng line_total. Tính tay ở ~5-6 nơi: service-form.ts:282,291,345; service-rules.ts:223; money-adjustment.ts:29,127. Test redteam D1/D2 vẫn cho SQL trực tiếp sửa tiền đơn đã xác nhận | F-03 trong sổ, hạn 31/10 |
| GD-B-04 | THẤP | BÁC | ADR-0080:59 nói rõ bil_debt_line không có ngày riêng, thuộc kỳ của phiếu, khoá phiếu là khoá dòng; billing/repository.ts:244-249 dòng nợ chỉ chèn khi phiếu đã chèn (EXISTS bil_posting). Thiết kế đã phủ | ADR-0080 |
| GD-B-05 | TRUNG BÌNH | XÁC NHẬN (chỉ đọc lướt) | orders/repository.ts:76,956-962 ghi chú ghi kép/cọc cũ; migration B5 chưa có (ls migrations tới 0069) | không |
| GD-B-06 | TRUNG BÌNH | XÁC NHẬN | src/CLAUDE.md:6 liệt kê 16 module, thiếu billing, receipt, tro-ly (thực tế 19 thư mục); ARCHITECTURE.md:175 cũng không có | cần chủ duyệt (luật) |
| GD-P-01 | TRUNG BÌNH | XÁC NHẬN | accounts/index.ts:426,456,675 trả PIN cho người tạo/đặt lại; roles.ts:33 ACCOUNTANT superAdminOnly:false | ADR-0090 accepted (chặn Quản trị cấp/đặt lại PIN tài khoản tiền), chưa thi công; PIN tạm = ADR-0093 (lượt 3, chưa có trong docs/adr) |
| GD-P-02 | TRUNG BÌNH (gần THẤP) | XÁC NHẬN | parties/index.ts:450 409 cccd_taken; :672-681 GET danh sách giấy tờ chỉ hỏi party.document.write, không kiểm cấp bậc | ADR-0083 (số đủ chỉ Toàn quyền) không phủ 409 |
| GD-S-01 | TRUNG BÌNH | XÁC NHẬN | auth/throttle.ts:8 IP_LIMIT=30, PHONE_LIMIT=5 / 15 phút; không có mã xác thực lớp hai trong src (grep totp = 0) | ADR-0074 accepted, chưa làm |
| GD-S-02 | TRUNG BÌNH | XÁC NHẬN trong mã | không có giới hạn tần suất ở route tạo đơn/hồ sơ/thu; không kiểm được quy tắc ở Cloudflare (ngoài mã) | không |
| GD-S-03 | TRUNG BÌNH (gần THẤP) | XÁC NHẬN | audit-actions.ts:52-53 có khai exported_*, grep route dùng = 0; đăng nhập sai chỉ ghi login_attempt (dọn sau 15 phút) | không |
| GD-S-04 | — | KHÔNG KIỂM ĐƯỢC | pháp lý, cần chuyên gia | không |
| GD-D-01 | TRUNG BÌNH | XÁC NHẬN | chạy homeRedirect cho quyền FIELD = /orders; coMucDonHang(seesAll false, canCreate false) = false nên không có tab Đơn hàng sáng. Chưa xem trên màn hình thật | không |
| GD-D-02 | TRUNG BÌNH (gần THẤP) | XÁC NHẬN | orders/index.ts route /status: câu "Không thể chuyển đơn từ from sang to" lộ confirmed/cancelled thô; RACED/STALE thì tiếng Việt | không |
| GD-L-04 | TRUNG BÌNH | XÁC NHẬN (không kiểm số liệu) | bangtin/rules.ts:20 900 s; wrangler.jsonc ghi rõ mỗi lần deploy ngắt mọi kết nối | không |
| GD-L-05 | TRUNG BÌNH | XÁC NHẬN, mã tự ghi nhận | orders/repository.ts:690-698 "GIỚI HẠN ĐÃ BIẾT", SELECT id FROM orders WHERE status IN (draft, confirmed) | không |
| GD-L-06 | TRUNG BÌNH (gần THẤP) | XÁC NHẬN | shared/http.ts:9 no-store mặc định | không |
| GD-L-07 | TRUNG BÌNH | XÁC NHẬN NHƯNG NÓI QUÁ | "mỗi trang 4 request" không đúng: /api/auth/me + feedback/badge cho mọi người; orders/dashboard chỉ khi seesAll; catalog/admin chỉ khi admin (shell.ts:157,173,188,488). Tối đa 4 cho Quản trị; mỗi request 2 truy vấn xác thực | không |
| GD-L-08 | TRUNG BÌNH | XÁC NHẬN | web/sw/sw.ts:48 fetch /api/thong-bao/moi-nhat mỗi lần push | không |
| GD-R-04 | — | ĐÃ SỬA | HANDOFF-N1.md:5 nay ghi 1.66, Worker ae754e1e, mốc lùi 3b56e772. Lưu ý: mã hiện tại đã có 1.68 (chưa thấy ghi deploy) | — |
| GD-R-06 | TRUNG BÌNH | XÁC NHẬN | chốt chỉ đếm ADMIN (staff/repository.ts:46-52), không có chốt SUPER_ADMIN; scripts/create-staff.mjs:3 liệt kê 4 quyền cũ và nạp bằng tệp SQL | không |
| GD-R-07 | TRUNG BÌNH | KHÔNG KIỂM ĐƯỢC bằng mã | thuộc quy trình/con người | không |
| GD-R-08 | TRUNG BÌNH | XÁC NHẬN | shared/trip-rules.ts:45 confirmWindow bắt đầu từ today; MISSING_LABEL.past_date | không |

Phát hiện THẤP chỉ liệt kê, không kiểm sâu: GD-T-02, GD-T-03, GD-A-03..05, GD-B-03/07..12, GD-P-03..09, GD-S-05..10, GD-D-03..13, GD-L-10..14, GD-R-03/09..11.

## Báo cáo bỏ sót / cần bổ sung
1. tests/audit/redteam.test.mjs D4: tài khoản nhân viên trỏ hồ sơ đã ngưng vẫn đăng nhập được (hai cờ active độc lập) vẫn là FINDING ở mã hiện tại; chưa thấy báo cáo kiến trúc nêu. Mức TRUNG BÌNH.
2. Liên kết GD-R-02 và GD-R-06: cửa khẩn cấp scripts/create-staff.mjs (dòng 4) dựa vào nạp tệp SQL bằng lệnh execute kiểu --file, đường mà HANDOFF-N1.md:597 ghi là bị OAuth từ chối; chủ có thể không có cửa khẩn cấp dùng được.
3. GD-L-01: câu đó còn nằm ở các route đăng nhập Face ID (auth/index.ts:318,324), không chỉ mọi request thường.
4. Kết luận "không có lỗ cho người ngoài" phù hợp với những gì thấy; không kiểm lại tiêu đề bảo mật production.

## Lệnh đã chạy
- đếm commit từ 0ba370d6 tới nay = 95; xem thống kê thay đổi các thư mục src/modules, migrations, wrangler.jsonc.
- npm run typecheck: 0 lỗi; npm test: bước 1 và bước 2 thoát 0 (xanh).
- node --test tests/audit/redteam.test.mjs: 19 pass, 0 fail (R1, R2, D1, D2, D4 là FINDING còn tái hiện).
- node --test tests/audit/query-plan.test.mjs: pass (không phủ câu xác thực).
- node -e (node:sqlite) dựng schema từ migrations/*.sql rồi EXPLAIN QUERY PLAN câu xác thực: MATERIALIZE + SCAN.
- node --experimental-strip-types gọi homeRedirect / coMucDonHang cho tài khoản chỉ-FIELD.
- nhiều grep/sed đọc mã; không ghi gì vào kho, không chạm production.

## Không kiểm được
- Độ lớn thật của tải (0,7 đến 13 ms, "giảm 5 lần", 1.000 người) vì cần D1/production; chỉ kiểm cơ chế.
- GD-S-04 (pháp lý), GD-R-07 (con người), GD-S-02 phần cấu hình Cloudflare, HSTS/tiêu đề production.
- Hiện trạng production sau 1.66.
- Giao diện thật của GD-D-01 (chỉ kiểm bằng hàm thuần).
- GD-B-01, GD-B-05, GD-L-04 chỉ đọc lướt.
