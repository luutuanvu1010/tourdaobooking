# Danh sách việc còn lại — Vận chuyển & Bán hàng, Gói A và Gói C (tài liệu sống, lập 2026-10-08)

> **Đây là nơi DUY NHẤT trả lời "còn bao nhiêu việc".** Chủ dự án yêu cầu 2026-10-08: "ghi lại tệp đó, và chúng ta làm 1 lần cho xong".
> - **Luật 1:** thêm một việc vào bảng này phải hỏi chủ trước. Phát hiện không chặn phát hành ghi vào mục "Nợ để sau", không chen vào bảng.
> - **Luật 2:** làm theo đúng thứ tự trong bảng. Việc sau chỉ bắt đầu sớm khi không đụng cùng tệp với việc đang làm.
> - **Luật 3:** báo cáo cho chủ luôn theo bảng này ("xong x / 12").
> - **Luật 4:** cột "Xong khi" là tiêu chí nghiệm thu. Việc lớn (dữ liệu, quyền, tiền, tin) còn phải có người kiểm độc lập chỉ-đọc báo đạt.
>
> Lý do, ruling và bằng chứng chi tiết vẫn ghi ở sổ thi công `2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md`; tệp này chỉ trỏ tới.

Đã xong trước khi lập bảng: Giai đoạn 1 (C55, C60, C14, C27, C38, N3), Giai đoạn 2 (A1, A2, A3), ADR-0104 Đ1 (điều chỉnh khẩn cấp), lượt duyệt 8a–8d (ADR-0104 đến ADR-0111 đã chép vào `docs/adr/`), kế hoạch A4, A5, ADR-0109 đã phản biện.

## Bảng việc

| # | Việc | Xong khi | Trạng thái |
|---|---|---|---|
| 1 | ADR-0104 Đ2 — máy tự cập nhật chuyến khi đơn sửa / huỷ (nhánh `adr-0104-d2`) | Phiếu kiểm độc lập không còn CHẶN / CAO; đã gộp; `npm test`, typecheck, e2e đủ bộ xanh trên nhánh làm việc | **Xong** — kiểm độc lập đạt có điều kiện, điều kiện đã làm (`aea0c542`); gộp `78fd5752`; trên `075ca03c` (gộp cả việc 2, 3): typecheck 0, `npm test` hai bước xanh, e2e đủ bộ "E2E: 54/54 kịch bản xanh", ba nhóm "Mọi bất biến đạt" |
| 2 | Màu nút gửi hộp "Điều chỉnh kết quả" (`web/chuyen.ts`, `dieu-chinh-gui`) | `cuoc-smoke` chạy **có `AXE_JS`** in "CUOC SMOKE OK (18 bước)" | **Xong** — gộp `58cbd77b` (`b3da7d1e`): nút `.vc-btn.btn` thôi chuyển dần màu nền; tương phản lúc mở khoá 1,09:1 → 9,45:1; `cuoc-smoke` có `AXE_JS` "CUOC SMOKE OK (18 bước)" + sáu kịch bản Vận chuyển khác OK có `AXE_JS` |
| 3 | CAO-C — báo tài xế mọi lệnh có bỏ qua luật (chủ duyệt "Báo mọi lệnh có bỏ qua luật") | Đủ sáu phần ghi ở sổ thi công (câu cờ, chữ tin trung tính, hướng dẫn tài xế, đảo bài ghim, dòng §16, câu trỏ ADR-0104 chép SAU câu 8d); test xanh; kiểm độc lập | **Xong** — gộp (`684a3b52`, `fad5fe62`, `c8054558`); kiểm độc lập ĐẠT CÓ ĐIỀU KIỆN, điều kiện (hướng dẫn sửa mã) đã sửa; câu trỏ ADR-0104 đã chép |
| 4 | ADR-0105 — hai nút Chỉ đường (migration 0090) | Theo kế hoạch ADR-0105; thêm dòng bản đồ vào `RANG_BUOC_NGOAI.md`; kịch bản Chrome nhóm Chỉ đường xanh có `AXE_JS`; kiểm độc lập | **Xong** — trên bản gộp `bc77ef9a`: typecheck 0, `npm test` hai bước xanh (3789 bài, 0 đỏ), e2e đủ bộ "E2E: 54/54 kịch bản xanh", ba nhóm "Mọi bất biến đạt". Nhánh `adr-0105-chi-duong-2` (12 commit, migration **0091** `v_loc_location_dia_chi`); kiểm độc lập ĐẠT CÓ ĐIỀU KIỆN (điều kiện: gộp thật rồi chạy lại bộ kiểm); gộp `beba8e5c`; trên nhánh: `npm test` xanh, e2e "54/54", bốn kịch bản Chrome có `AXE_JS` OK. Còn: thử tay iPhone / Android thật (mục Trước khi phát hành) |
| 5 | ADR-0109 — phải thu không âm | Theo kế hoạch ADR-0109; phiếu phản biện là danh sách bắt buộc; kiểm độc lập (tiền) | **Xong** — trên bản gộp `bc77ef9a`: typecheck 0, `npm test` hai bước xanh (3789 bài, 0 đỏ), e2e đủ bộ "E2E: 54/54 kịch bản xanh", ba nhóm "Mọi bất biến đạt". Nhánh `adr-0109-phai-thu-khong-am` (10 commit, không migration); kiểm độc lập (tiền) ĐẠT CÓ ĐIỀU KIỆN, điều kiện ngoài mã ghi ở "Trước khi phát hành"; gộp `e6d576b0` (gỡ tay xung đột `CHANGE-GUIDE.md` bẫy 63/64/65); trên nhánh: e2e "54/54", Chrome `sua-so-khach-smoke` có `AXE_JS` OK |
| 6 | G17 — báo tài xế khi `PUT /api/orders/:id/trip` đổi ngày / giờ đón chặng đã xếp | Bài đỏ trước, xanh sau; e2e liên quan xanh | **Xong** — kiểm độc lập ĐẠT CÓ ĐIỀU KIỆN; điều kiện V1 (bài canh lệnh thua không để dòng chặng giả) + T1 (gõ cửa chỉ lô mới nhất) bổ sung `d965c723`, quan sát đỏ thật; gộp `2a7973d4`. Trên nhánh: `npm test` hai bước xanh, e2e sáu kịch bản liên quan "9/9 kịch bản xanh"; trên bản gộp: typecheck 0, bài G17 68/68. e2e đủ bộ chạy chung sau lần gộp kế tiếp (máy đang tải cao). Chữ tin "đơn đổi" có thêm phần chặng (ví dụ "Chiều đi: ngày đón …") — chữ hiển thị, đã báo chủ |
| 6b | **Bảng sự kiện Vận chuyển** (chủ đồng ý 2026-10-09: "ok" cho hướng "ép hệ thống vào một khuôn khổ rồi tự suy ra quy tắc / việc cần làm"): mỗi lệnh làm đổi chuyến xe một dòng — ai được bấm, luật kiểm, dữ liệu đổi, sự kiện, nhật ký, ai nhận tin; bài máy đối chiếu bảng với mã hai chiều | Bảng dựng từ mã hiện có + bài máy đối chiếu đã quan sát chặn thật; danh sách chỗ lệch thay cho việc lặt vặt; chủ duyệt như quyết định mới. **Làm trước A5 và C3**; A5, C3 khai dòng vào bảng trước khi viết mã | **Xong** — kiểm độc lập vòng 1 ĐẠT CÓ ĐIỀU KIỆN (F1–F6 vá, gộp `e869f795`), vòng 2 ĐẠT CÓ ĐIỀU KIỆN (VỪA-1 ghim hàm ngoại lệ route đơn, VỪA-2 câu SQL ghi không phân biệt hoa thường — vá `78122b59`; điều phối tự quan sát đỏ cả hai đột biến 2026-10-09); dòng `docs/SO-HANG-RAO.md` ghi đúng phạm vi và lỗ còn lại. Gộp `6ee927bf`; sau khi gộp G17 bài đỏ đúng thiết kế, sửa dòng + xoá mục lệch G17 (`3833a726`), bài 14/14. **Chủ quyết 2026-10-09** (trang `docs/superpowers/specs/2026-10-09-bang-su-kien-van-chuyen/00-trang-trinh.md`): (1) duyệt bảng làm luật — lệnh mới đổi chuyến khai dòng trước khi viết mã, bài vào `docs/SO-HANG-RAO.md`; (2) có báo tài xế khi bấm tay "Cập nhật khách / điểm theo đơn" lúc xe chưa chạy — soạn ADR-0112 cho chủ duyệt, CHƯA sửa mã; (3) văn phòng bấm thay: giữ như hiện tại, xem lại ở việc 9 (mục N-BAM-THAY chuyển thành ngoại lệ đã quyết) |
| 7 | A4 — tài xế đối tác dùng Nền tảng, báo bận (ADR-0053 D7.1, D8, D9) | Theo kế hoạch A4 đã phản biện; kiểm độc lập; cuối việc báo chủ phần pháp lý; thử iPhone thật | Chưa làm |
| 8 | A5 — chuyển khách giữa hai xe (ADR-0111) | Theo kế hoạch A5 + các điểm ADR-0111 thắng kế hoạch (sổ thi công); mười tình huống chạy thành bài; kiểm độc lập; chủ xác nhận bộ 24 bước lượt 1 lúc nghiệm thu | Chưa làm |
| 9 | C2 — màn tài xế: "Điểm kế tiếp", nút dính đáy, giờ hẹn 16px, xác nhận "Đã đón N khách", khoá nút khi đang gửi, nút Kết thúc khớp máy chủ, đồng hồ chờ "Vắng", ẩn nút Hỗ trợ | Từng mục C53, C54, C56, C57, C59, C61 có bài / kịch bản Chrome xanh có `AXE_JS`; ảnh thật hai cỡ màn hình | Chưa làm |
| 10 | C3 + **ADR-0112** (chủ duyệt 2026-10-09: nút tay "Cập nhật khách / điểm theo đơn" lúc xe chưa chạy báo tài xế) — bảng điều phối: chọn nhiều chặng, tạo chuyến bằng bảng trượt, lọc, tổng khách chưa xếp / ghế trống, tô màu theo tải, nghe tin đơn thay đổi, gợi ý chuyến hợp, giờ hẹn từng đoàn | Như mục 9; danh sách đủ ở `docs/superpowers/specs/2026-10-07-danh-gia-erp-van-chuyen-ban-hang.md` mục C3 | Chưa làm |
| 11 | C4 — biểu mẫu: sửa dòng nhắc sai, ô tìm điểm (C10); cảnh báo lúc xác nhận khi bật xe riêng (C12) | Như mục 9 | Chưa làm |

## Trước khi phát hành (không tính vào 11 việc, nhưng thiếu thì không phát hành)

- [ ] Ghép nhánh làm việc với `main` mới nhất (75 commit; gộp thử ra 10 tệp xung đột), chạy lại các bài khoá tập cứng, quét lại số migration.
- [ ] Kế toán xác nhận 7 ca vàng A2.
- [ ] Chủ chạy hai lệnh đếm chỉ-đọc (nguyên văn ở sổ thi công, mục "Chặn PHÁT HÀNH").
- [ ] Mục nhật ký thay đổi; ghi `docs/HANDOFF-N1.md` "Việc còn treo".
- [ ] **Áp migration `0091` (ADR-0105) TRƯỚC khi đưa mã lên** — `npm run trien-khai` đã làm đúng thứ tự; đừng khôi phục Time Travel về trước `0091` khi mã mới chạy.
- [ ] **Mục nhật ký thay đổi** (`src/shared/changelog.ts`, bước A.0) có ADR-0105 (nháp ở sổ thi công / báo cáo người thi công) và ADR-0109 (phiếu kiểm VỪA-2).
- [ ] **Câu SQL chỉ-đọc cho chủ (ADR-0109):** đơn đang có giảm giá lớn hơn tạm tính sau điều chỉnh — soạn sẵn nguyên lệnh để chủ chép-dán (phiếu kiểm VỪA-1; câu sàng ở báo cáo người kiểm, ghi vào sổ thi công).
- [ ] **Kế toán / chủ xác nhận 11 ca sổ vàng sửa số khách** SV-SK-01…11 (đang `cho_xac_nhan`).
- [ ] **Thử tay nút Chỉ đường trên iPhone và Android thật** (ADR-0105 bài 8): mở đúng ứng dụng bản đồ, kể cả khi Nền tảng cài lên màn hình chính.
- [ ] Phát hành **sau** phần Sổ tiền (chủ chọn "Cho phép, phát hành sau Sổ tiền").

## Nợ để sau (không chặn phát hành)

- Lô `POST …/passengers` với đơn rất lớn (200 khách, sửa nhiều lần) tới 1002 câu — có từ trước Đ2; D1 từ chối thì cả lô không ghi, route trả 500 (không ghi dở). Giới hạn D1 thật chưa kiểm; trần tổng lô cần ADR mới.
- Hướng dẫn Bán hàng `src/shared/huong-dan-ban-hang.ts:140` lạc hậu từ trước (nói "app chưa tự báo … khi giờ hoặc nơi đón đổi", trong khi ADR-0062 đã có tin) và dùng chữ "app" — chữ hiển thị, chủ duyệt riêng.
- Nợ bài từ phiếu kiểm Đ2: vế `status = 'PLANNED'` của cổng chuyến; biên trần 74/75; `order_id` của câu cổng chỉ khoá bằng chuỗi; luật (iv) cam kết chỉ có bài thuần; bốn hàm ghi cũ còn xuất mà không qua máy đồng bộ (`cancelOrder`, `writePassengerChange`, `replaceLeg`, `changeLeg`); bài quyền ghép Đối tác / Thực tập; tên tham số `sn` né bài canh `so-nguoi-chang-mot-luat`.
- `golden/README.md`, `ADR-0110:71` có chữ cũ; sổ hàng rào chép quan sát chặn K1–K8, M-A, M-B, M-D.
- `cuoc-smoke` bước 5 (mất mạng) chập chờn: dải cảnh báo còn sau khi có mạng lại, đỏ 3/7 lần, cả trên CSS cũ — chưa rõ nguyên nhân.
- Cùng lỗi tương phản lúc vừa mở khoá ở nút ngoài Vận chuyển `.sheet-foot .btn-primary` (luật khoá `public/app.css` :573), ví dụ `luu-so-khach` (`web/sheet-so-khach.ts`).
- Chú thích `docs/SYSTEM-DESIGN.md` mục "Điều chỉnh khẩn cấp và phá lệ" chưa nhắc tin trung tính (THẤP-2 phiếu CAO-C).
- Câu chờ lượt sau: tài khoản nhiều quyền tự duyệt đề nghị của mình; văn phòng gửi thay không nhận tin bác / hết hạn.
- ADR-0105: không bài khoá riêng từng lớp cổng ngày chạy (hai lớp che nhau); LEFT JOIN `v_loc_location_dia_chi` không lọc `active` chưa có chú thích "cố ý"; dòng `RANG_BUOC_NGOAI.md` G2/I5 hạng [A] chép từ bảng ADR, chưa đọc lại nguồn; Q-2a (khoá theo `trongKhungXemKhach` ở Đợt 6) chưa có mục `docs/BACKLOG.md`; `dp-lib.mjs` nên tự thử lại khi ECONNRESET lúc máy tải cao.
- ADR-0109: bài tĩnh "một hàm phải thu" chỉ canh quên (bí danh biến lọt); ô "Còn thiếu tiền" có bài nhưng không đỏ khi bỏ kẹp; thay đổi `web/order.ts` chỉ có Chrome canh; sáu kịch bản Chrome A2 / V1 / sổ tiền đỏ y như gốc `1459b834`, chưa điều tra.
- Câu chờ chủ (phiếu kiểm G17, T2, 2026-10-09): Tài xế đối tác lái chuyến KHÔNG nhận tin đổi ngày / giờ đón — đúng luật ADR-0052 D6.2 (mọi người nhận phải qua `trip.view`, Tài xế đối tác `none`). Muốn họ được báo là quyết định quyền, cần ADR riêng; liên quan A4 (tài xế đối tác dùng Nền tảng).
