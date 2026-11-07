# ADR-0184 — Cho xe thiếu giấy tờ xuất bến kèm cảnh báo (thay chặn cứng ở cổng xuất bến)

- **Số:** soạn và duyệt dưới số 0180; **đổi 0184 ngày 2026-11-07 theo lệnh chủ** («Đổi sang 0184») vì 0180 trùng với văn bản «Toàn quyền xem như vai khác» ở nhánh `claude/multi-role-admin-view-8030d2`. Chỗ nào bên dưới còn nhắc «ADR-0180» là lời nguyên văn lúc duyệt, hiểu là ADR này.
- **Trạng thái:** **accepted** 2026-11-07 — chủ dự án duyệt trong chat, nguyên văn: «Duyệt», trả lời câu «Duyệt ADR-0180 theo cách hiểu này?» (cách hiểu ở dòng «Chủ đã chọn» ngay dưới). Chưa thi công, chưa có mã; luật chặn cứng hiện hành vẫn áp tới khi mã mới qua tiêu chí nghiệm thu. (Trước đó: proposed 2026-11-07.) Hướng đã nghe từ chủ (nguyên ý, qua phiên điều phối): «xe thiếu giấy tờ vẫn được xuất bến, kèm cảnh báo, thay cho chặn cứng hiện nay».
- **Chủ đã chọn (chat 2026-11-07, nguyên văn):** «D1=b, d2= Toàn quyền (không cần ghi lý do), quản trị : phải ghi lý do . D3= ok». Đây là câu trả lời cho ba quyết định, lúc đó chưa phải lệnh «duyệt»; chủ duyệt sau đó cùng ngày bằng «Duyệt» (xem dòng Trạng thái). AI hiểu như sau (chủ sửa nếu sai): **(1)** nới được cả sáu loại giấy tờ xe; **(2)** Kiểm định + Bảo hiểm chỉ **Toàn quyền** mở được (Quản trị không); bốn loại còn lại Quản trị **hoặc** Toàn quyền mở; **(3)** Quản trị bắt buộc ghi lý do, Toàn quyền **không bắt buộc** (hệ thống vẫn ghi nhật ký «không nêu lý do»); **(4)** D3 theo khuyến nghị (nhãn vàng cho văn phòng, tài xế, Trang chủ Quản trị). **Hệ quả cần chủ biết:** vì Quản trị và Toàn quyền đang dùng chung ô `trip.override`, «chỉ Toàn quyền mở Kiểm định / Bảo hiểm» đòi **thêm một ô quyền mới** (nhân đôi các bài «tập con quyền»); và Toàn quyền cho chạy không bảo hiểm mà không ghi lý do là điểm yếu pháp lý lớn nhất — xem mục «Rủi ro».
- **Ngày:** 2026-11-07. **Loại:** việc lớn (luật vận tải, dữ liệu, quyền) — thi công xong cần người kiểm độc lập chỉ đọc (`CLAUDE.md` §3).
- **Cửa:** hai chiều về hành vi (tắt đường «Cho chạy dù thiếu» là về chặn cứng như cũ); **một chiều** ở chỗ chuyến đã chạy dù thiếu giấy thì không thu lại được, và dấu lệnh + bản chụp kiểm chỉ-thêm ở lại.
- **Thay / sửa:** phần «giấy tờ xe» của luật LC-12 trong ADR-0049 (mục D2, dòng «Luật đủ điều kiện lái»); không đụng phần GPLX tài xế. Bổ sung ADR-0050 VK1-C (hai dòng gieo Kiểm định + Bảo hiểm). Không sửa nguyên văn các ADR đó (chỉ ADR mới trỏ về).
- **Xây trên lỗ đang hở:** không có mục nào trong `docs/quyen-hoan.json` chạm vùng này (đã đọc danh sách mã: `task.progress`, `dispatch.guides.view`, `invoice.*`, `TNV-G1`, `HC-*`). Lệch có thật nhưng không phải lỗ an ninh: ADR-0049 viết giấy tờ xe được kiểm «lúc gán tài xế, lúc đổi xe, lúc xuất bến», còn mã chỉ kiểm giấy tờ xe ở cổng xuất bến (xem Hiện trạng).
- **Số quyết định chủ cần chốt:** 3 (D1–D3), **đã trả lời — xem dòng «Chủ đã chọn»; các mục D1–D3 và phần «Ảnh hưởng» bên dưới là bản soạn TRƯỚC câu trả lời, nếu lệch thì dòng «Chủ đã chọn» thắng**. Có chạm quyền (dùng lại ô `trip.override`, không thêm ô) và dữ liệu (thêm cột/giá trị ở bản chụp kiểm), nên cần trang ghép (cuối tệp).

## Hiện trạng (đọc từ mã, 7/11)

1. **Chỗ chặn duy nhất là cổng xuất bến** `kiemXuatBen` (`src/shared/dieu-phoi-kiem.ts`, vòng lặp «Điều kiện xuất bến đang hiệu lực»): với mỗi dòng điều kiện hiệu lực của xe (`subject = 'VEHICLE'`), thiếu giấy hiện hành còn hạn tới hết chuyến ⇒ lý do giữ `DIEU_KIEN_GIAY_TO_XE` («Xe thiếu hoặc hết hạn giấy tờ bắt buộc», ai xử lý: Quản trị). Chuyến ở `PLANNED`, không lên `RUNNING`. Lớp máy chủ chạy cổng này mỗi lần xuất bến; lớp CSDL chỉ cho `PLANNED → RUNNING` khi có dòng kiểm `DAT` cùng lô (LC-05, `vc_trip_departure_check`).
2. **Gán tài xế / đổi xe KHÔNG kiểm giấy tờ xe.** Hàm kiểm lệnh (`kiemLenh`) chỉ xét xe dùng được, sức chứa, trùng giờ, khoảng nghỉ, cam kết, GPLX + hạng của tài xế, chéo xe–tài xế. Câu «kiểm lúc gán tài xế, lúc đổi xe» ở ADR-0049 không khớp mã (theo `grep` `DIEU_KIEN_GIAY_TO_XE`: chỉ xuất hiện ở cổng xuất bến). Nghĩa là «nới» chỉ cần làm ở một chỗ.
3. **«Giấy tờ xe nào là điều kiện» là DỮ LIỆU, không phải mã:** bảng `vc_departure_rule`. Migration `0041` gieo đúng hai dòng cho mọi xe từ 1 chỗ: **Kiểm định** (`INSPECTION`) và **Bảo hiểm trách nhiệm dân sự** (`TPL_INSURANCE`) (ADR-0050 VK1-C). Bốn loại còn lại trong danh mục (`REGISTRATION` Đăng ký xe, `CONTRACT_BADGE` Phù hiệu xe hợp đồng, `TRIP_MONITOR` Giám sát hành trình, `DRIVER_CAMERA` Camera người lái) **chỉ chặn nếu Toàn quyền thêm dòng điều kiện**; bảng không xoá, chỉ đóng hiệu lực.
4. **Câu kiểm định kỳ R-VC-14** (`scripts/audit-checks.mjs`, mức `warn`): đếm xe chưa ngừng thiếu dòng hiện hành của một loại giấy tờ đang là điều kiện. Ghi chú hiện là «xe này sẽ bị giữ ở cổng xuất bến». Production hiện có 7 xe (số do phiên điều phối cung cấp, **chưa kiểm lại, và chưa biết 7 xe thiếu loại nào**).
5. **Khuôn có sẵn để dùng lại:** «phá lệ» của điều phối (`MA_LUAT_PHA_LE`: mốc, khoảng nghỉ, cam kết; ô `trip.override` cho Quản trị / Toàn quyền; lý do bắt buộc; ghi ở sự kiện chuyến; ADR-0052 D4.2, ADR-0104, ADR-0111). Nút **«Đặt gấp»** (ADR-0050/0051 theo lời phiên điều phối; thực ra là ADR-0107, ô `order.leg.short_notice`) là của **đơn / chặng**, không phải của chuyến xe, nên khuôn «phá lệ chuyến» sát hơn.

## Rủi ro pháp lý, nói thẳng

Tra cứu 27/9 (`reference-quy-dinh-van-tai-khach`; **chưa có luật sư hay chủ xác nhận**, độ tin cậy trung bình): xe kinh doanh vận tải phải có kiểm định còn hạn, bảo hiểm trách nhiệm dân sự bắt buộc (đã gồm hành khách) và phù hiệu «xe hợp đồng»; thiếu thì bị xử phạt hành chính và có thể bị tạm giữ xe. Nền tảng cho chạy **không làm việc đó hợp pháp**; nó chỉ đổi người chịu trách nhiệm từ «máy chặn» sang «người bấm cho chạy» (và tài xế đang lái). **Bảo hiểm** nặng nhất: xe chạy không bảo hiểm mà xảy ra tai nạn thì không có bên bồi thường cho hành khách. **Kiểm định** thiếu = xe có thể không đạt an toàn kỹ thuật. Đăng ký xe, giám sát hành trình, camera là nghĩa vụ có thật nhưng hậu quả với an toàn hành khách nhẹ hơn (chủ yếu phạt, nhất là camera với xe <8 chỗ chưa tới hạn 2028).

## Các quyết định cần chủ chốt

**D1 — Loại giấy tờ nào nới được.**
- **(a) Khuyến nghị:** Kiểm định + Bảo hiểm chặn cứng như nay; mọi điều kiện giấy tờ xe **khác** (đăng ký, phù hiệu, giám sát hành trình, camera, và loại Toàn quyền thêm sau) cho phép «Cho chạy dù thiếu». *Hệ quả phải biết trước:* với dữ liệu gieo hiện tại, hai điều kiện đang bật đều là loại chặn cứng, nên **đường mới chưa giúp xe nào cho tới khi Toàn quyền thêm điều kiện khác**; 7 xe của R-VC-14 nếu thiếu Kiểm định / Bảo hiểm vẫn bị giữ. Muốn biết 7 xe thiếu gì: chạy R-VC-14 ở chế độ chỉ-đọc (chủ chạy, `--db remote`) hoặc xem màn giấy tờ xe.
- (b) Nới cả bốn, nhưng riêng Kiểm định + Bảo hiểm chỉ **Toàn quyền** mở, lý do bắt buộc ≥ 20 ký tự. Giải quyết ngay 7 xe nếu họ thiếu hai loại này; đổi lại chấp nhận rủi ro bảo hiểm ở trên và cần luật sư xác nhận trước.
- (c) Giữ chặn cứng, chỉ nhập bổ sung giấy cho 7 xe (không đổi mã).

**D2 — Ai mở, mở thế nào, hiệu lực bao lâu.** Khuyến nghị: dùng lại ô `trip.override` (Quản trị, Toàn quyền; (bản soạn trước câu trả lời; theo «Chủ đã chọn» nay cần thêm ô mới cho Kiểm định + Bảo hiểm)), nút «Cho chạy dù thiếu giấy tờ» trên chi tiết chuyến ở trạng thái giữ vì `DIEU_KIEN_GIAY_TO_XE`; bắt buộc chọn lý do từ danh sách đóng (nhóm lý do mới, ví dụ «Giấy đang gia hạn», «Xe thay thế khẩn cấp», «Khác» kèm chữ ≥ 10 ký tự); hiệu lực **một chuyến, một lần xuất bến** — không «xe này được miễn», xuất bến lại là xin lại; chuyến đã `RUNNING` không sửa ngược. Phương án thay thế: chỉ Toàn quyền mở (chặt hơn, chậm hơn khi Toàn quyền vắng).

**D3 — Cảnh báo hiện ở đâu, ai thấy.** Khuyến nghị: nhãn **vàng** «Xe thiếu <tên loại giấy tờ> — Quản trị đã cho chạy» ở (1) chi tiết chuyến và danh sách điều phối của văn phòng, (2) cuốc của tài xế công ty / đối tác (tài xế là người chịu phạt tại chỗ nên phải biết), (3) màn Trang chủ Quản trị như mục «cần để ý». Không gửi cho khách. Nhật ký ghi: mã chuyến, biển số, **mã loại giấy tờ**, ngày hết hạn (hoặc «chưa có»), mã lý do, chữ lý do, người mở — **không** ghi số giấy tờ, số khung, tên chủ xe (LC-18, `CLAUDE.md` §7 về giấy tờ). Phương án thay thế: chỉ văn phòng thấy, tài xế không (nhẹ hơn nhưng bỏ tài xế khỏi vòng biết).

## Việc không đổi (nói để khỏi hiểu nhầm)

GPLX, hạng bằng và hạn của tài xế vẫn là **sàn cứng** (`kiemLai`, LC-12 phần người); giấy tờ của tài xế (`DIEU_KIEN_GIAY_TO_TAI_XE`) cũng vẫn chặn. Các luật chặn khác của cổng (cửa sổ xuất bến LC-20, thiếu giá xe thuê, chéo xe–tài xế, vượt số chỗ) không đổi.

## Ảnh hưởng tới hàng rào và kiểm định kỳ

- **R-VC-14 giữ nguyên câu SQL, mức `warn`**; chỉ đổi ghi chú thành «xe này bị giữ ở cổng xuất bến, trừ khi Quản trị cho chạy dù thiếu». Thêm **R-VC-17** (mức `warn`): chuyến `RUNNING` có dòng kiểm `DAT_PHA_LE` mà thiếu lý do / người mở, hoặc mở cho loại chặn cứng — bắt lỗi nới nhầm. Tên mã R-VC-17 là giả định, người thi công kiểm số trống ở `audit-checks.mjs`.
- **Sổ hàng rào (`docs/SO-HANG-RAO.md`):** dòng hiện có về hai điều kiện gieo (ADR-0050 VK1-C) và dòng luật thuần LC-12 phải **đổi mô tả «chặn cái gì»** nhưng không được xoá hay nới bài: bài «TC-17 / điều kiện giấy tờ xe» đổi thành ca «thiếu + chưa mở ⇒ giữ; thiếu + mở đúng ⇒ qua; thiếu loại chặn cứng + mở ⇒ vẫn giữ». Dòng mới cho đường «Cho chạy dù thiếu» chỉ coi là hàng rào khi đã có ngày quan sát (sửa cố ý → đỏ → hoàn nguyên).
- **Cột/giá trị CSDL:** `vc_trip_departure_check.ket_qua` hiện chỉ `DAT` / `KHONG_DAT`; cần giá trị `DAT_PHA_LE` (hoặc cột cờ) và trigger LC-05 chấp nhận nó **chỉ khi** có lý do + người mở. Migration mới (số lớn nhất + 1, không sửa tệp đã áp), expand–contract; bảng/cột mới thì sửa `docs/data-dictionary.json` + `npm run dict`.

## Kế hoạch thi công (sau khi chủ duyệt)

1. **Trang ghép + tiêu chí viết trước** (tệp này đủ), cập nhật dòng trạng thái thành accepted do chủ.
2. **Luật thuần** (`src/shared/dieu-phoi-kiem.ts`, `ly-do-giu.ts`): hàm nói «giấy tờ nào chặn cứng / nới được» (đọc từ hằng đóng gắn với D1, không từ chuỗi tự do); `kiemXuatBen` nhận danh sách loại đã được mở và trả `canhBao` thay vì `lyDo` cho loại nới. Bài đỏ trước, xanh sau.
3. **CSDL:** migration + trigger; bài CSDL: không thể sang `RUNNING` với `DAT_PHA_LE` thiếu lý do hoặc với loại chặn cứng.
4. **Route + nhật ký:** lệnh mới trong `dieu-phoi-lenh.ts` đi cùng khuôn một `db.batch` (cổng → nhật ký → câu có dấu lệnh → trạng thái cuối); bài `giay-to-khong-lo-so.test.ts` thêm ca: nhật ký / DTO / lỗi của đường mới không chứa số giấy tờ.
5. **Giao diện** (`web/`): nhãn vàng, nút, chữ qua `docs/BANG-THAM-CHIEU.md` (đưa 2–3 tên nút cho chủ chọn nếu bảng chưa có); sửa giao diện thì chạy kịch bản Chrome.
6. **R-VC-14 (ghi chú) + R-VC-17**, cập nhật `docs/SO-HANG-RAO.md`, `docs/VAN-CHUYEN.md`, `docs/SYSTEM-DESIGN.md` mục điều phối.
7. **Người kiểm độc lập** (`nguoi-kiem-doc-lap`, chỉ đọc) trước khi báo đạt; chạy `npm test`, typecheck, e2e.

## Tiêu chí nghiệm thu (hành vi kiểm được)

1. Xe thiếu loại **nới được**, chưa ai mở ⇒ cổng giữ, lý do `DIEU_KIEN_GIAY_TO_XE`, hiện «Quản trị xử lý».
2. Cùng ca, Quản trị mở kèm lý do hợp lệ ⇒ chuyến lên `RUNNING`; chi tiết chuyến + cuốc tài xế có nhãn vàng nêu tên loại giấy; nhật ký có đủ trường ở D3.
3. Mở thiếu lý do, hoặc bởi người không có `trip.override` ⇒ bị từ chối (400 / 403); không có dòng nào được ghi.
4. Xe thiếu Kiểm định hoặc Bảo hiểm (theo D1(a)) + cố mở ⇒ vẫn bị giữ, bất kể quyền; CSDL từ chối nếu ghi thẳng.
5. Lần xuất bến sau của cùng xe, vẫn thiếu ⇒ giữ lại (không nhớ lần mở trước).
6. Không có số giấy tờ trong nhật ký, phản hồi lỗi, DTO tài xế.
7. R-VC-14 còn đếm xe thiếu giấy kể cả khi đã có chuyến chạy dù thiếu; R-VC-17 đỏ khi dữ liệu thử cố ý sai.
8. Quan sát hàng rào chặn thật một lần (P16) và ghi ngày vào `docs/SO-HANG-RAO.md`.

## Trang ghép (CLAUDE.md §9)

- **Bảng chạm:** `vc_vehicle_document` (đọc), `vc_departure_rule` (đọc), `vc_trip_departure_check` + `_item` (thêm giá trị / cột), sự kiện chuyến `vc_trip_event` (thêm loại sự kiện hoặc dùng loại có sẵn kèm cột phá lệ).
- **Dòng bản đồ quyền (theo «Chủ đã chọn»):** `trip.override` (ADMIN, SUPER_ADMIN) cho bốn loại giấy còn lại, kèm lý do bắt buộc với ADMIN; **ô MỚI** (đề xuất tên `trip.override.chung_chi_cung`, chỉ SUPER_ADMIN) cho Kiểm định + Bảo hiểm, không bắt buộc lý do; ghi chú: cần tra mọi bài tập con quyền và `route-access`. xem chuyến (`trip.view`-loại) thấy nhãn vàng; tài xế thấy qua DTO cuốc của mình. Không đổi ô nào của `permissions.ts`; nếu D2 chọn «chỉ Toàn quyền» thì cần thêm ô riêng — khi đó phải sửa ADR này và các bài tập con quyền (nhân đôi).
- **Cổng nào canh cửa nào:** máy chủ (route lệnh + trigger LC-05) canh ai được mở; giao diện chỉ ẩn / hiện nút theo ô; nhãn vàng là phần hiển thị, không phải cổng.

## Điều chưa chắc (giả định ghi lại)

Số 7 xe và loại giấy thiếu chưa kiểm production (luật cấm AI chạm). Quy định pháp lý lấy từ tra cứu chưa xác nhận. Tên nút, tên nhóm lý do, và số mã R-VC-17 là đề xuất. Chưa đo ảnh hưởng tới các màn tài xế (cần người thi công đọc `cuoc-cua-toi`).
