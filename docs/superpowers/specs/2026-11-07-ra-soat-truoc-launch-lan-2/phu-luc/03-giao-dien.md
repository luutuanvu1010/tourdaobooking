# Phụ lục 03 — Giao diện theo từng vai (Bước 3)

> Nguồn: báo cáo của trợ lý chỉ đọc số 3 (mô hình tầm trung), chép nguyên văn mục 1 tới mục 9; mục 10 (đường dẫn kịch bản trong thư mục tạm) thay bằng mô tả. Ảnh ở `docs/evidence/2026-11-07-ra-soat-truoc-launch-lan-2/` (52 ảnh, khổ iPhone 390 và máy tính 1440, dữ liệu giả trên D1 tạm; số điện thoại trong ảnh là số giả của khung thử). Kịch bản và nhật ký thô không lưu vào kho.

## Phần phiên điều phối đối chiếu lại

**G-01 (khoá bảo mật hai lớp trên bản thật) — hạ xuống «dữ liệu trước ngày dùng thật», không phải CHẶN LAUNCH (SUY LUẬN mạnh).**
- Lệnh triển khai tự dừng trước mọi thay đổi khi Cloudflare chưa có khoá tên `MFA_ENCRYPTION_KEY`: `scripts/release-lib.mjs`, bước 1d (`KHOA_HAI_LOP`, câu dừng «Chưa đặt khoá … CHƯA có gì bị đổi trên production»); hàng rào có dòng trong `docs/SO-HANG-RAO.md` (quan sát chặn 15/10). Mục trạng thái của `docs/HANDOFF-N1.md` (bản `main` của máy) ghi cả hai lần triển khai hôm nay (19:38 bản 2.73, 22:04 ADR-0180) đều chạy bằng `npm run trien-khai`, và lần 22:04 dừng ở cổng phiên bản là bước đứng SAU bước 1d. Suy ra: lúc 19:38 và 22:04 khoá đã có trên Cloudflare. Phiên điều phối không thấy tận mắt đầu ra lệnh đó, và cổng chỉ kiểm TÊN khoá, không kiểm độ dài; không ai trong đợt này bật thử trọn vòng (quét mã, nhập mã 6 số) trên iPhone thật với bản thật.
- Dải «Còn 14 ngày để bật bảo mật hai lớp» mà trợ lý thấy là của tài khoản vừa tạo trên máy thử: tài khoản mới được ghi hạn ân hạn 14 ngày từ lúc tạo (`src/modules/staff/repository.ts`, câu `INSERT INTO staff … mfa_grace_until`). Trên bản thật mỗi tài khoản có hạn riêng; ân hạn chung của migration `0101` là 14 ngày từ lúc áp, mà sổ phát hành ghi `0101` đã áp trước 18/10, nên ân hạn chung đã hết chậm nhất khoảng 1/11. Màn Quản lý tài khoản hiện nhãn trạng thái hai lớp cho từng người (`web/staff.ts`, hàm `nhanHaiLop`), nên chủ soát được bằng mắt; người đã quá hạn bị chặn đăng nhập thì Quản trị/Toàn quyền bấm «Tắt bảo mật hai lớp» để mở 24 giờ cho họ tự bật.

**G-09 (Bán hàng thấy số «Toàn công ty» trên Trang chủ) — theo thiết kế, không phải phát hiện.** ADR-0135 Đ3 chốt bốn ô số Trang chủ: «Còn thiếu» và «Chưa phụ trách» mang nhãn Toàn công ty, «Doanh thu» và «Đơn nháp» mang nhãn Của tôi; bài `src/shared/pham-vi-so.test.ts` khoá điều này; bài Hướng dẫn Bán hàng (`src/shared/huong-dan-ban-hang.ts`) giải thích nhãn.

**G-02:** phiên điều phối đã tự mở ảnh `4-doitac-gui-thieu-don-khong-don-390.png` (ảnh còn trong thư mục, khác lời trợ lý lo đã xoá): đúng dải đỏ «Đơn đã được lưu nháp nhưng chưa gửi được: Dịch vụ thứ 1 chưa chọn Đón hay Không đón.»

**Ghi chú khác:** giờ dừng «khoảng 22:50» là trợ lý tự ước; đồng hồ máy lúc phiên điều phối nhận báo cáo là khoảng 22:39. Ảnh `d-hết-phiên-khi-lap-don-390.png` đã đổi tên thành `d-het-phien-khi-lap-don-390.png` (tên tệp không dấu cho an toàn trên mọi máy); chữ trong báo cáo dưới đã sửa theo.

## Phần báo cáo của trợ lý (nguyên văn mục 1–9)

Mã được rà: commit 5f641781 (bản 2.73). Chạy trên D1 tạm của máy, không chạm bản thật.

## 1. Phạm vi và cách dựng
- Giờ: bắt đầu khoảng 22:08, dừng khoảng 22:50 ngày 07/11/2026 (khoảng 45 phút, ít hơn ngân sách vì đã đi hết các hành trình chính; hành trình 6 chỉ đi tới chi tiết cuốc).
- Môi trường: `server.mjs` dùng `startEnv` của a2-cdp.mjs (D1 tạm từ migration, danh mục giả 3 dịch vụ TD101/TTB03/TTB06, Turnstile tắt, Chrome headless qua CDP). Kiểm lúc đầu: cả năm bảng `prc_rate_tier`, `prc_party_tier`, `prc_role_tier`, `prc_commission_rule`, `prc_commission_rule_pax` đều rỗng (không phải xoá gì).
- Tài khoản: Nhân sự (HR) tạo bằng màn Quản lý tài khoản/API đúng luật (Hướng dẫn viên, Tài xế công ty, Tài xế đối tác, hai Đối tác, Thực tập); Quản lý bán hàng phải do Toàn quyền/Quản trị gán (Nhân sự bị chặn bằng câu tiếng Việt, đúng ADR-0169). Bán hàng, Kế toán, Quản trị, Toàn quyền, Nhân sự gốc do thư viện gieo sẵn. Ghi chú: ba tài khoản (Nhân sự, Toàn quyền thuần, và bộ thư viện) là tài khoản gieo, không đi qua lần đăng nhập đầu có PIN tạm; các tài khoản tạo qua API/màn Nhân sự thì đăng nhập PIN bình thường.
- axe CÓ chạy (axe.min.js 580 KB, từ /Users/tuanbao/.claude/jobs/685db6cc/tmp/): mọi màn đã quét (khoảng 70 lượt màn × vai) đều 0 lỗi mức serious/critical, không tràn ngang, ô gõ ≥16px, không còn mục chạm <44px ở khổ iPhone (riêng Danh bạ của Bán hàng có 1 mục nhỏ). Máy canh chữ thô tìm thấy duy nhất chữ "App" trong dòng lịch sử cũ của Nhật ký thay đổi (bản 1.5, hồ sơ đóng băng).
- Không làm được / hạn chế: 2FA không bật được trong môi trường thử (thiếu khoá), Face ID, bảo trì, đặt lại PIN/khoá tài khoản bằng giao diện, "Điều chỉnh công nợ" gửi thật, khoá sổ thật, xe chạy thật, Biên nhận mẫu HD-02-DT (xem mục 7).

## 2. Hành trình
Số lần bấm tính "chạm" của người dùng (gõ ô tính 1).

**HT4 — Đối tác lần đầu (iPhone + 1440):** đăng nhập → vào thẳng `/orders` trống ("Chưa có đơn nào khớp.", ảnh 4-doitac-vao-lan-dau-390) → Tạo đơn → ngày, tên, SĐT, chạm dịch vụ, Đón/Không đón, Gửi đơn = 6 chạm + 3 ô gõ, tới đích (đơn "Chờ xác nhận", ảnh 4-doitac-don-da-gui-390). Chỗ phải đoán: (1) màn đầu trống nói "không khớp" dù chưa lọc gì, không chỉ "Bấm Tạo đơn"; (2) Đón/Không đón không đánh dấu bắt buộc (G-02); (3) không có chỗ nào cho Đối tác xem công nợ/nợ Trả sau — chỉ thấy "Hạn mức khả dụng 3.000.000 ₫" ngay trên form (ảnh 4-doitac-form-co-han-muc-390); (4) vé: không có đơn nào có vé nên CHƯA KIỂM. Chữ khó hiểu: "Có dịch vụ cần xác nhận còn vé." (dòng trạng thái đơn chờ), "Hoa hồng: Chờ Công ty cài mức". Trang không được phép: /staff, /catalog, /audit, /so-cong-no, /hoa-hong, /thiet-lap… đều dừng bằng câu rõ ("Bạn không có quyền xem trang này", "Tài khoản này không vào được trang này", kèm nút về trang đầu); /so-cong-no còn lộ tiêu đề và đoạn mô tả của trang (không lộ số). API: Đối tác 2 đọc đơn của Đối tác 1 → 404 (đơn nháp) hoặc 403 (đơn đã xác nhận), không ghi/gửi/đổi người phụ trách được (403/404); `GET /api/staff,/parties,/ledger/ky,/tra-sau/han-muc,/audit` → 403; POST không Origin → 403. Máy tính 1440: danh sách đơn đủ cột, axe sạch.

**HT2 — Bán hàng (iPhone):** lập đơn qua form (ghi nhận: chạm hai dịch vụ liên tiếp chỉ giữ một, do dịch vụ vừa bị Ngừng bán; xem G-05) rồi dựng đơn 2 dịch vụ + 1 lượt đưa đón bằng API; xác nhận qua nút "Xác nhận đơn" (hộp xác nhận gốc của trình duyệt, có nói hậu quả); ghi khoản thu 1.500.000 ₫ chuyển khoản: Ghi khoản thu → gõ số → Ghi = 3 chạm, tới đích (ảnh 2-sales-ghi-khoan-thu-390, 2-sales-sau-ghi-thu-390); "Xem ảnh gửi khách" mở bảng Tải về / Chia sẻ. Mốc 6 giờ: đơn có giờ đón cách 5 giờ 34 phút hiện khung vàng "Giờ đón cách bây giờ 5 giờ 34 phút — quá hạn chốt 6 giờ. Chọn lý do đặt gấp thì xác nhận và xếp xe được." + nút Đặt gấp; mở ra ô Lý do + "Duyệt đặt gấp" (ảnh 2-sales-dat-gap-hop-390). Không nói hậu quả của Đặt gấp; nút "Duyệt đặt gấp" gây hiểu là chờ người khác duyệt. Dịch vụ cần kiểm vé: nút đổi thành "Gửi kiểm vé", toast "Đã gửi kiểm vé. Đơn đang chờ người kiểm vé." Tới đích. "Biên nhận" theo từ vựng không có nút mang tên đó cho đơn thường; Biên nhận mẫu HD-02-DT của đơn đối tác CHƯA KIỂM.

**HT1 — Kế toán ngày đầu (1440):** /hoa-hong có khung vàng nói đúng "Có 5 vai trò còn thiếu mức hôm nay" và hậu quả (đơn chờ ở bước «Khách đã trả đủ») (ảnh 1-ketoan-hoa-hong-1440). Thêm Cấp độ đại lý: Thêm cấp độ đại lý → gõ tên → Thêm = 3 chạm, có mã `MT_PONHMVPO` + "Chép mã" hiện ra (mã máy). Gán cấp cho Đối tác: /cap-dai-ly → chạm "Chưa có cấp" ở dòng đối tác → chọn Cấp 1 → Lưu = 3 chạm, "Đã lưu." (ảnh 1-ketoan-chon-cap-1440). Chỗ phải đoán: mức hoa hồng nhập ở đâu (có "＋ Thêm mức riêng cho đối tác" ở đầu trang, "Thêm hoa hồng cho dịch vụ" trong thẻ cấp, "Gán cho vai trò"/"Gán cho đối tác" — ba cửa cho một việc); Cấp 1 không có mức vẫn gán được và dòng đối tác không cảnh báo thiếu mức (chỉ ở khung vàng đầu trang /hoa-hong và ở chi tiết đơn). Tới đích phần cấp; phần nhập mức tiền thật CHƯA đi tới cùng bằng giao diện.

**HT3 — Quản lý bán hàng (iPhone):** vào màn "Dịch vụ & giá": Mở bán lại và bật/tắt "Cần kiểm vé" đều chạy, có toast ("…đã ngừng bán." / "đã mở bán lại." / "…cần kiểm vé."). Kẹt: trên điện thoại không có đường tới màn này (G-04).

**HT5 — Kế toán đối chiếu (1440):** Trang chủ báo "Có 2 việc chờ bạn — gấp nhất: chờ đối chiếu (1)"; chi tiết đơn có "Xác nhận đã nhận" / "Huỷ khoản thu"; Sổ công nợ có khung "1 khoản chờ xác nhận — xử lý ở Trang chủ ›"; Điều chỉnh công nợ có nói luật hai người duyệt; Hạn mức trả sau liệt kê đúng 3.000.000 ₫/72 giờ/ân hạn 24 giờ; Khoá sổ tháng nói rõ "Không mở lại được". Chưa bấm khoá thật (nút phụ thuộc có dữ liệu tháng trước).

**HT7 — Nhân sự/Quản trị/Toàn quyền:** Nhân sự: Thêm tài khoản (họ tên, SĐT, tick vai) → Tạo → PIN 6 số hiện một lần kèm dặn gửi riêng (ảnh 7-hr-tao-xong-pin-1440); Nhân sự không gán được Quản lý bán hàng (câu 403 rõ). «Xem như vai trò khác» (Toàn quyền, trang Tôi): chọn Đối tác → Xem → thanh vàng "Đang xem như vai trò Đối tác" + nút "Thoát" nằm ngay đầu mọi trang, cả iPhone và 1440 (ảnh 7-toanquyen-xem-nhu-orders-390, 7-toanquyen-xem-nhu-doi-tac-1440); Thoát trở về đúng giao diện Toàn quyền. Đạt. Công tắc thu tiền của Đối tác nằm ở cuối /cap-dai-ly (khối "Khách của đối tác trả cho Công ty"), không nằm ở trang Tôi cùng các công tắc khác của Toàn quyền (G-08). Đặt lại PIN / khoá tài khoản bằng giao diện: CHƯA KIỂM.

**HT6 — Hướng dẫn viên / Tài xế (iPhone):** HDV: "Việc của tôi" ở trang Tôi liệt kê đơn kèm Gọi/Sửa số khách/Từ chối đơn/Xem đơn/Huỷ đơn; "Từ chối đơn" mở bảng trượt với bốn lý do và nút xác nhận mờ cho tới khi chọn (ảnh 6-hdv-tu-choi-thieu-ly-do-390): tốt. Tài xế: "Cuốc của tôi" theo ba ngày; chi tiết chuyến nói thẳng "Không phải chuyến của hôm nay… Chỉ bấm khi xe thật sự lăn bánh", liệt kê điều kiện chưa đạt kèm "(văn phòng lo)" và nút "Cho xe chạy" có kèm "Chưa cho xe chạy được — văn phòng đang lo." (ảnh 6-taixe-chi-tiet-cuoc-390): rất tốt. Khách vắng/huỷ giữa chừng: CHƯA KIỂM (chuyến chưa tới hạn chạy).

**HT8 — Mọi người:** Trang chủ Bán hàng (ảnh 8-sales-trang-chu-390) đủ thẻ; Hỗ trợ có "＋ Gửi yêu cầu" mở bảng chọn nhóm/loại/tiêu đề/mô tả/đính kèm, nói rõ sẽ tự đính kèm thiết bị và phiên bản; Hồ sơ của tôi mọi ô "Chưa có", nút "Gửi yêu cầu xoá" tắt kèm câu "Chưa có chính sách riêng tư nên chưa gửi được thông tin. Hãy quay lại sau." (đúng, nhưng người dùng thấy cả khối chưa dùng được).

## 3. Phát hiện
(Không có mục nào đạt mức CHẶN LAUNCH bằng bằng chứng của tôi; có một mục CHƯA KIỂM có thể thành CHẶN nếu cấu hình sản xuất thiếu: G-01.)

**G-01 — Khoá bảo mật hai lớp trên bản thật**
Mức: CHƯA KIỂM (có thể CHẶN LAUNCH nếu thiếu). Trạng thái: CHƯA KIỂM. Chuyện gì: mọi nhân viên đang thấy dải "Còn 14 ngày để bật bảo mật hai lớp", hạn 21/11, quá hạn thì không đăng nhập bằng PIN nữa (Tôi: "Hạn bật: 22:15 21/11/2026"). Trên máy thử, bấm "Bật ứng dụng xác thực" hiện "Máy chủ chưa cấu hình khoá bảo mật hai lớp. Báo IT." (ảnh 8-sales-bat-2fa-390; máy thử không có `MFA_ENCRYPTION_KEY`, `src/modules/auth/index.ts:329`). Ai gặp: toàn bộ nhân viên, trước 21/11, nếu bản thật cũng thiếu khoá. Bằng chứng: ảnh + mã. Tái hiện: Bán hàng → Tôi → Bật ứng dụng xác thực. Đã có hồ sơ chưa: không. Đề xuất: chủ xác nhận khoá đã đặt trên Cloudflare (tôi không được chạy `wrangler secret`) và một người thật bật thử trọn vòng (quét mã, nhập mã 6 số) trên iPhone. Việc nhỏ (kiểm), hậu quả lớn nếu thiếu.

**G-02 — Gửi đơn khi chưa chọn Đón/Không đón: đơn bị lưu nháp và chuyển trang; trang đơn ghi "Không đưa đón"**
Mức: SỬA TRONG TUẦN ĐẦU. Trạng thái: ĐÃ XÁC NHẬN. Chuyện gì: ô chọn Đón/Không đón nằm cuối thẻ dịch vụ, không đánh dấu bắt buộc; bấm "Gửi đơn" mà bỏ qua thì đơn được lưu nháp, trình duyệt nhảy sang trang đơn với dải đỏ "Đơn đã được lưu nháp nhưng chưa gửi được: Dịch vụ thứ 1 chưa chọn Đón hay Không đón.", còn khối Đưa đón lại ghi "Không đưa đón" như thể đã chọn. Bài Hướng dẫn của Đối tác nói ngược lại: "Thiếu gì thì khung đỏ hiện ngay trên nút" (`src/shared/huong-dan-doi-tac.ts`, mục "Lập đơn cho khách" bước 5, 8). Ai gặp: Đối tác và Bán hàng lần đầu. Bằng chứng: ảnh 4-doitac-gui-thieu-don-khong-don-390 (đã bị tôi dọn khỏi thư mục, chạy lại `j4e.mjs`) và 4-doitac-sau-gui-don-390; log nhat-ky.txt. Tái hiện: Đối tác → Tạo đơn → điền ngày, tên, SĐT, chạm dịch vụ, bỏ qua Đón/Không đón → Gửi đơn. Mã cũ: không thấy. Đề xuất: chặn trên form như các ô bắt buộc khác; trang đơn nháp không ghi "Không đưa đón" khi chưa chọn. Việc nhỏ.

**G-03 — Hết phiên giữa lúc lập đơn: nhảy về đăng nhập, không một câu giải thích, số đã gõ mất**
Mức: SỬA TRONG TUẦN ĐẦU. Trạng thái: ĐÃ XÁC NHẬN. Ai gặp: nhân viên ở bến tàu, máy hết phiên (hoặc đăng nhập máy khác, vì phiên một máy/người). Bằng chứng: ảnh d-het-phien-khi-lap-don-390 (trang đăng nhập trơn), nhat-ky.txt ("URL: /login | thông báo: (rỗng) | tên còn trong ô: (rỗng)"). Tái hiện: mở Tạo đơn, gõ tên khách, xoá cookie, bấm Lưu. Mã cũ: T-1 (17/10) — "số vừa gõ mất" còn nguyên với đường lập đơn. Đề xuất: giữ nháp ở máy (localStorage) và hiện "Phiên đã hết hạn, đăng nhập lại để tiếp tục". Việc vừa.

**G-04 — Quản lý bán hàng trên iPhone không có đường tới màn "Dịch vụ & giá"**
Mức: SỬA TRONG TUẦN ĐẦU (nặng nếu họ chủ yếu cầm điện thoại; trên máy tính có lối tắt ở Trang chủ). Trạng thái: ĐÃ XÁC NHẬN. Bằng chứng: liệt kê liên kết thật — Trang chủ iPhone, trang Tôi, thanh tab của vai này không có `/catalog` (`3-qlbh-trang-chu-390` + nhat-ky.txt); Trang chủ máy tính có "Dịch vụ & giá→/catalog". Ai gặp: Quản lý bán hàng cần Ngừng bán một dịch vụ ngay ở bến tàu. Đề xuất: thêm lối tắt trên Trang chủ/Tôi iPhone. Việc nhỏ.

**G-05 — Màn hẹp "Dịch vụ & giá": công tắc không có chữ, nhóm gập không có dấu hiệu, "Ngừng bán" không hỏi lại**
Mức: SỬA TRONG TUẦN ĐẦU. Trạng thái: ĐÃ XÁC NHẬN. Chuyện gì: công tắc "Cần kiểm vé" chỉ có nhãn ẩn (aria-label), người nhìn chỉ thấy cái gạt trần (ảnh 3-qlbh-ngung-ban-hop-390); dòng "Chưa đặt" dưới mỗi dịch vụ không nói là gì; nhóm "Chưa phân loại" ban đầu gập, không mũi tên, người mới tưởng danh sách rỗng (ảnh 3-qlbh-dich-vu-mo-nhom-390 là sau khi mở); "Ngừng bán" có hiệu lực ngay cho cả công ty, chỉ có toast, không hỏi và không Hoàn tác. Hệ quả kèm theo (ĐÃ XÁC NHẬN qua API): người đang mở form cũ gửi dịch vụ vừa ngừng bán nhận "dịch vụ TD101 không còn trong danh mục — hãy chọn dịch vụ khác hoặc nhập tay" (nhập tay đã tắt, nên lời khuyên sai). Đề xuất: nhãn chữ cạnh công tắc, chevron, hỏi lại có nói "đơn đang mở không đổi; người bán thấy ngay", sửa câu 400. Việc nhỏ.

**G-06 — Chữ khó hiểu / lệch từ vựng**
Mức: SỬA TRONG TUẦN ĐẦU/ĐỂ SAU. ĐÃ XÁC NHẬN. (a) "Có dịch vụ cần xác nhận còn vé." (đơn chờ); (b) "Đang giữ đơn: Chưa tới ngày đi — bấm từ ngày đi trở đi. Ai xử lý: Hướng dẫn viên." ở khối Thanh toán (thiếu chủ ngữ: giữ đơn là gì); (c) nút "Duyệt đặt gấp" cho chính người lập; (d) Trang chủ viết "2,8tr ₫" trong khi nơi khác "2.800.000 ₫"; (e) màn Đối tác đầu tiên "Chưa có đơn nào khớp." thay vì hướng dẫn tạo đơn; (f) bảng "Sửa vai trò" của Kế toán ghi "Tạo trước 31/10/2026 — chưa có dấu vết" (nghĩa gì?); (g) màn Cấp độ đại lý hiện mã máy `MT_PONHMVPO` + "Chép mã" (nếu bảng từ vựng cho phép thì bỏ qua); (h) bài Hướng dẫn Đối tác nói chân menu có "Hướng dẫn" và thanh tab có 3 mục, thực tế là "Nhật ký thay đổi" và 4 tab (Đơn hàng, Tạo đơn, Hỗ trợ, Tôi). Việc nhỏ.

**G-07 — «Xác nhận đơn» và «Huỷ khoản thu» dùng hộp của trình duyệt**
Mức: ĐỂ SAU. ĐÃ XÁC NHẬN (log `[HỘP TRÌNH DUYỆT] confirm "Xác nhận đơn này? Sau khi xác nhận, dịch vụ và đơn giá sẽ bị khoá; đổi số khách phải ghi lý do…"`). Câu nói hậu quả bằng lời thường (tốt) nhưng khác kiểu bảng trượt dùng ở Từ chối đơn. Đã trong BACKLOG (16 chỗ `confirm()`).

**G-08 — Công tắc thu tiền của Đối tác nằm ở cuối màn Cấp độ đại lý**
Mức: ĐỂ SAU. ĐÃ XÁC NHẬN. Toàn quyền tìm cạnh các công tắc khác trên trang Tôi sẽ không thấy. Bài Hướng dẫn "Cấp hạn mức trả sau cho đối tác" có nhắc.

**G-09 — Bán hàng thấy số "Toàn công ty" trên Trang chủ**
Mức: SUY LUẬN (có thể là chủ ý). Sales Hai (không dính đơn nào) thấy thẻ "Còn thiếu — Toàn công ty 2,8tr ₫, 1 đơn" và "2 đơn chờ xác nhận" của đơn người khác (ảnh 8-sales-trang-chu-390). Cần chủ cho biết Bán hàng có được xem tổng tiền còn thiếu toàn công ty không.

**G-10 — Nhân sự/HDV tải trang gọi API bị 403 lặp**
Mức: ĐỂ SAU. ĐÃ XÁC NHẬN (log: HR và HDV mỗi lần mở trang gọi `/api/orders/dashboard`, `/api/catalog/admin` → 403, chỉ thấy trong mạng, người dùng không thấy). Có thể ảnh hưởng nhật ký/chỉ số.

**G-11 — PIN tạm là PIN dùng mãi**
Mức: SUY LUẬN, câu cần chủ quyết (mục 9): người mới đăng nhập bằng PIN do Nhân sự cấp, không bị bắt đổi; chỉ có lời dặn "nên tự đổi". Hồ sơ thật sẽ có người giữ nguyên PIN mà Nhân sự đã biết.

## 4. Bảng chấm (a)–(j) theo vai/màn
| Vai/màn | a | b | c | d | e | f | g | h | i | j |
|---|---|---|---|---|---|---|---|---|---|---|
| Đối tác: vào đầu, Tạo đơn, đơn | không đạt (màn trống nói "không khớp", Đón/Không đón dễ sót, G-02) | đạt trừ G-06 | đạt | không đạt (G-02) | đạt (Rút lại) | đạt (trống có câu) | đạt (axe, 16px, 44px sạch) | đạt | đạt | không đạt (nói khung đỏ trên nút, G-02, G-06h) |
| Bán hàng: lập đơn, ghi thu | đạt | đạt | đạt | không đạt (G-03) | đạt (xác nhận có hậu quả; Đặt gấp chưa) | đạt | đạt | đạt trừ G-07 | đạt | chưa chấm đủ |
| Quản lý bán hàng: Dịch vụ & giá | không đạt (G-04, G-05) | đạt | n/a | không đạt (câu 400 sai lời khuyên) | không đạt (Ngừng bán không hỏi) | đạt | đạt | không đạt (công tắc trần) | đạt | chưa chấm |
| Kế toán: Hoa hồng, Cấp độ, Sổ nợ, Khoá sổ | đạt (khung vàng dẫn việc) | đạt trừ mã máy | đạt trừ "2,8tr" | chưa chấm | đạt (Khoá sổ nói không mở lại được) | đạt | n/a (máy tính) | đạt | đạt | chưa chấm |
| HDV, Tài xế | đạt | đạt | đạt | chưa chấm | đạt (Từ chối có lý do bắt buộc) | đạt | đạt | đạt | đạt | chưa chấm |
| Nhân sự, Toàn quyền «Xem như» | đạt | đạt | n/a | chưa chấm | đạt (thanh vàng + Thoát) | đạt | đạt | đạt | đạt | chưa chấm |

## 5. Đối chiếu mục cũ
- T-1 (17/10, hết phiên/mất mạng làm mất số gõ): CÒN, nay xác nhận cả ở form lập đơn (G-03). Mất mạng: dải "Đang ngoài mạng — dữ liệu lần xem gần nhất" + "Thử lại" có (ảnh d-mat-mang-orders-390): ĐÃ TỐT HƠN so với câu cụt cũ ở màn danh sách.
- Trang cấm/404 (27/10, 403/404): ĐÃ SỬA ở phần tôi thấy: câu rõ và nút "Về trang đầu của bạn" (ảnh 4-doitac-vao-trang-cam-390, d-404-390).
- Hộp `confirm()` còn lại (BACKLOG): CÒN (G-07).
- Dải chồng nhau: trên iPhone chỉ thấy dải 2FA + thanh «Xem như» riêng lẻ; CHƯA thấy chồng ba lớp.

## 6. Danh sách ảnh (trong docs/evidence/2026-11-07-ra-soat-truoc-launch-lan-2/)
Đối tác (4-*): vao-lan-dau-390, tao-don-390, tao-don-1440, don-hang-1440, form-co-han-muc-390, gui-thieu-don-khong-don-390, sau-gui-don-390, don-da-gui-390, toi-390, vao-trang-cam-390. Kế toán (1-*, 5-*): hoa-hong, cap-dai-ly-trong/co-cap, chon-cap, them-hh-dich-vu, chi-tiet-don, huy-khoan-thu, so-cong-no, dieu-chinh, han-muc, khoa-thang, trang-chu. Bán hàng (2-*): don-da-xac-nhan, ghi-khoan-thu, sau-ghi-thu, dat-gap-hop, gui-kiem-ve, anh-gui-khach. QL bán hàng (3-*): dich-vu-mo-nhom, ngung-ban-hop, sau-bat-kiem-ve, trang-chu. HDV/Tài xế (6-*): viec-cua-toi, tu-choi-thieu-ly-do, chi-tiet-don, taixe-cuoc, taixe-chi-tiet-cuoc. Nhân sự/Toàn quyền (7-*): hr-tao-tai-khoan, hr-tao-xong-pin, toanquyen-toi, xem-nhu-doi-tac (390, 1440), xem-nhu-orders-390. Khác (8-*, d-*): sales-trang-chu, sales-bat-2fa, hdv-gui-yeu-cau, hdv-account, hr-staff, ketoan-goc, d-404, d-het-phien, d-mat-mang. Tôi đã xoá bớt khoảng 47 ảnh trùng cho khỏi vượt trần, nên ảnh nêu ở G-02 (…gui-thieu-don-khong-don…) có thể còn, kiểm bằng `ls`.

## 7. Vùng chưa rà
Biên nhận mẫu HD-02-DT, vé điện tử của Đối tác (cần lô vé), bật/tắt công tắc thu tiền Đối tác và công nợ nhìn từ Đối tác (không thấy chỗ nào), đặt lại PIN/khoá tài khoản bằng giao diện, Điều chỉnh công nợ và khoá sổ bấm thật, Hướng dẫn viên "Xác nhận khách đã trả đủ", tài xế bấm "Cho xe chạy"/khách vắng, chế độ bảo trì, Face ID, 2FA trọn vòng, iPhone thật (bàn phím che nút, vùng an toàn: chỉ chạy giả lập), so từng bài Hướng dẫn với từng nút (chỉ so được 458 nhãn nút có tồn tại trong mã: 454 khớp, 4 là nhiễu cú pháp; và đối chiếu tay bài Đối tác, Dịch vụ cần kiểm vé, Trả sau).

## 8. Lệnh bị bộ chặn từ chối
Không có.

## 9. Câu cần chủ quyết
1. (Khuyến nghị: kiểm trước ngày 21/11) Khoá bảo mật hai lớp trên bản thật đã đặt chưa, và một người thật đã bật thử trọn vòng chưa?
2. (Khuyến nghị: bắt đổi PIN lần đầu) Có muốn người mới bị bắt đổi PIN tạm khi đăng nhập lần đầu không (hiện chỉ dặn)?
3. (Khuyến nghị: ẩn) Bán hàng có được thấy "Còn thiếu — Toàn công ty" không?

## 10. Kịch bản
Mười tám kịch bản hành trình và một kịch bản quét theo vai chạy trên máy chủ thử dựng bằng `startEnv` của `docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs` (D1 tạm từ migration, Turnstile tắt, Chrome không màn hình qua CDP); không lưu vào kho. Trợ lý báo đã tắt mọi tiến trình và xoá D1 tạm; phiên điều phối đếm lại lúc khoảng 22:39: không còn `workerd`, không còn tiến trình `wrangler`, tiến trình "headless" duy nhất là ứng dụng khác của máy.
