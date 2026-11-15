# Nhật ký thi công ADR-0195 — phần MÁY CHỦ và LUẬT THUẦN (điều kiện hiển thị trường)

Căn cứ: `docs/adr/ADR-0195-dieu-kien-hien-thi-truong.md` (accepted 10/11, chủ duyệt «Duyệt ADR-0195, mở đợt làm»). Phạm vi phiên này: danh mục + luật thuần, migration `0156`, module `giao-dien`, máy chủ lập / sửa đơn. KHÔNG làm: giao diện `web/` (phiên khác), `PUT /api/orders/:id/trip`, bốn ô giờ, nhóm 3. Người thi công ghi; người kiểm độc lập (N8) kiểm sau.

## Bảng đối chiếu «trường — interface DTO — tên khoá» (việc đầu tiên của thi công)
Đối chiếu từng dòng với `src/shared/contracts.ts`; bài (a3) ở `src/shared/ui-truong.test.ts` giữ bảng này và đọc lại interface mỗi lần chạy (đọc được cả `type` alias và `Pick<…>`).

| Màn | Trường (mã) | Interface | Khoá gửi lên | Kết quả |
|---|---|---|---|---|
| dich-vu-trong-don | flightCode | LegInput | `services[].legs[].flightCode` | có thật |
| dich-vu-trong-don | paxOverride | LegInput | `services[].legs[].paxOverride` | có thật |
| dich-vu-trong-don | note | TripInput | `services[].note` | có thật |
| dich-vu-trong-don | departDate, departTime, checkinDate, checkinTime, checkinPlace | TripInput | `services[].<tên>` | có thật; KHÔNG ẩn được |
| dich-vu-trong-don | pickupChoice | ServiceInput (type alias) | `services[].pickupChoice` | có thật; KHÔNG ẩn được |
| chi-tiet-don | customerEmail, customerNote, paymentNote, staffName («người lập») | OrderDto | — (chỉ xem) | có thật |
| danh-sach-don | customerNote, staffName, createdAt («giờ lập»), pax («số khách») | OrderSummaryDto (alias `Pick<OrderDto,…> & {…}`) | — | có thật |
| danh-sach-don | pickupPlace («điểm đón») | OrderSummaryTripDto | — | có thật (điểm đón của dịch vụ đầu tiên) |
| danh-sach-tai-khoan | active («trạng thái khoá»), passkeyCount («số Face ID») | StaffAccount, StaffAccountDto | — | có thật (xem câu hỏi 2) |
| ho-tro | orderCode («Đơn liên quan») | FeedbackTicketDto | — | có thật (`orderId` đi kèm, không khai riêng) |

**Trường bị bỏ khỏi phạm vi vì không có thật: không có.** Mọi trường nhóm 1 và `note` của nhóm 2 đều có trong interface; không thêm cột nào.

## Việc đã làm
1. `src/shared/ui-dieu-kien.ts` (mới): `DIEU_KIEN`, `dieuKienCuaDichVu`, `NHAN_DIEU_KIEN` (tên tạm).
2. `src/shared/ui-truong.ts`: `MAN_UI` thêm bốn màn; `MucTruong` thêm `dieuKien`, `khoaGui`, `khongBatBuoc`; danh mục thêm 21 mục; `giaiChinhSach(dong, quyen, dieuKien?)` (ba cách gọi), `traCuuChinhSach.an/batBuoc(man, truong, dieuKienHienCo?)`, `laCheDoHopLe(…, dieuKien?)`, `laDieuKienHopLeChoMuc`; nhãn màn / trường.
3. Migration `0156_chinh_sach_giao_dien_dieu_kien.sql`: DỰNG LẠI bảng (UNIQUE cấp bảng của 0154 không bỏ được bằng ALTER), chép nguyên dòng cũ, UNIQUE mới `COALESCE(dieu_kien,'')`, dựng lại chỉ mục và hai trigger chỉ-thêm; `docs/data-dictionary.json` + `npm run dict`. Số 0156 đã kiểm mọi nhánh (cục bộ và xa): lớn nhất là `0155_ve_quet`.
4. Module `giao-dien`: SQL hiệu lực phân theo điều kiện; `kiemYeuCauChinhSach` nhận `dieuKien` (chỉ mã mà mục cho phép); `GET …/tat-ca` trả `dieuKien` + `khoaGui` cho danh mục và `dieuKien` cho dòng; khôi phục mặc định mang điều kiện; nhật ký `ui_policy_changed` ghi thêm MÃ điều kiện. Quyền route không đổi.
5. Máy chủ lập / sửa đơn: `apTruongDichVu` (`src/modules/orders/an-truong-giao-dien.ts`) nối ở `POST /api/orders` và `PUT /api/orders/:id`, sau `validateOrder` + `resolveLegPlaces`, trước `oPhuNhap`. Chính sách đọc ĐÚNG MỘT lần (danh sách đầy đủ, dùng cho cả cấp đơn lẫn cấp dịch vụ).
6. Test (đỏ trước, xanh sau): `ui-truong.test.ts` (mở rộng + (a3), (a4), (b4), (e2), (f1)–(f4)), `an-truong-giao-dien.test.ts`, `chinh-sach-giao-dien-route.test.ts`, `giao-dien/chinh-sach-route.test.ts`, `migrations-chinh-sach-giao-dien-dieu-kien.test.ts` (mới), cập nhật bài cột ở `migrations-chinh-sach-giao-dien.test.ts` (thêm `dieu_kien` có chủ ý).
7. Tài liệu: `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md` z38, `docs/SO-HANG-RAO.md` (năm dòng), bảng tham chiếu (`npm run tham-chieu`), nhật ký này.

## Giả định và quyết định của người thi công (đảo ngược được trước khi phát hành)
- **Mã màn mới `dich-vu-trong-don`** (khoá lưu trong CSDL, không đổi tên về sau). Ba ô nhóm 2 (`flightCode`, `paxOverride`, `note`) nhận CẢ hai điều kiện; `paxOverride` không chọn được «Bắt buộc» (chỉ có ở chặng VỀ).
- **`giaiChinhSach` ba cách gọi:** vắng tham số ⇒ đầy đủ cho giao diện (mục không điều kiện + mục theo điều kiện khi khác kết quả không điều kiện, kể cả khi bằng «hiện» — dòng HIEN có điều kiện đè dòng trống AN); `null` ⇒ chỉ không điều kiện; một mã ⇒ kết quả tuyệt đối cho dịch vụ thoả điều kiện đó. Khoá `dieuKien` VẮNG trong mục không điều kiện (giữ nguyên các bài và giao diện cũ).
- **`DongChinhSach.dieuKien` là tuỳ chọn** (`?: string | null`), không bắt buộc như yêu cầu giao việc: để `web/bang-dieu-khien-truong.ts` hiện có (tự dựng dòng không điều kiện) vẫn biên dịch, vì `web/` ngoài phạm vi. Nơi ghi / đọc của máy chủ luôn mang `dieuKien`.
- **Dòng có điều kiện «chưa có dòng» = theo dòng không điều kiện** (không phải HIEN): chọn HIEN ở ô có điều kiện luôn ghi một dòng đè. Bảng chỉ-thêm không xoá được dòng điều kiện; «bỏ điều kiện, theo dòng trống» chưa có (xem nợ 3).
- **Ô ẩn `flightCode` / `paxOverride`:** để VẮNG khoá rồi nhờ `giaiOPhuNhap` chép giá trị đang lưu theo `id` chặng (chặng mới ⇒ NULL). Hệ quả: `paxOverride` chỉ giữ khi chặng vẫn là chiều VỀ (luật sẵn có); không còn 403 «chỉ văn phòng đổi số người chiều về» cho ô đã ẩn.
- **Bắt buộc `flightCode`:** mọi chặng của dịch vụ phải có số hiệu (khoá vắng tính theo số đang lưu); dịch vụ không có chặng thì không đòi. Câu 400: «Dịch vụ N: cần nhập «<tên trường>».» (tên trường lấy từ `NHAN_TRUONG`).
- **Công tắc ADR-0154 vẫn thắng:** đang áp cho tài khoản thì danh sách chính sách là rỗng cho cả cấp đơn lẫn cấp dịch vụ (bài có).
- **Đọc chính sách của chính mình:** cổng route `GET /api/cai-dat/giao-dien` KHÔNG đổi (theo giao việc). Người xem ở màn mới mà không giữ một trong bốn ô cũ (vd Hướng dẫn viên xem chi tiết đơn, người xem phiếu Hỗ trợ) nhận 403 ⇒ giao diện rơi về hiện đầy đủ (hướng an toàn). Xem câu hỏi 1.

## Tên tạm — chờ chủ chọn (đã khai `cho-chon` ở `src/shared/bang-tham-chieu-khai-niem.ts`; KHÔNG tự đặt tên cuối)
- Điều kiện: «Dịch vụ không đón» / «Dịch vụ có đón» (phương án: «Khi không đón» / «Khi có đón»; «Đơn không đón» / «Đơn có đón»).
- Màn: «Chi tiết đơn», «Danh sách đơn», «Hỗ trợ», «Dịch vụ trong đơn» (phương án: «Thẻ dịch vụ», «Từng dịch vụ»; «Xem đơn»; «Phiếu hỗ trợ»). **Lưu ý trùng tên:** «Dịch vụ trong đơn» đã là khái niệm có sẵn trong bảng tham chiếu (một dịch vụ nằm trong đơn) nên không thêm dòng khái niệm riêng cho màn; chủ nên cân nhắc tên khác để mỗi tên một nghĩa.
- Nhãn trường (chữ đang hiện ở màn thật): «Ghi chú của dịch vụ» (màn thật ghi «Ghi chú» / «Ghi chú — Thời gian đón»), «Số hiệu chuyến bay», «Số người chiều về», «Người lập», «Giờ lập», «Số khách», «Điểm đón», «Trạng thái khoá», «Face ID», «Đơn liên quan».
- Câu báo thiếu cấp dịch vụ (máy chủ, 400): «Dịch vụ N: cần nhập «Ghi chú của dịch vụ».» / «…«Số hiệu chuyến bay».»

## Câu hỏi cho chủ (chưa quyết, không chặn việc)
1. **Quyền ĐỌC chính sách ở màn mới:** cổng hiện hỏi `order.create` / `admin.manage` / `account.view` / `party.view`. Hướng dẫn viên và người xem phiếu Hỗ trợ có thể không qua cổng này (403 ⇒ thấy đầy đủ). Mở rộng cổng là đổi quyền: để chủ quyết.
2. **«Trạng thái khoá» của danh sách tài khoản** hiện khai là `active` (đang dùng / ngừng, theo giao việc). Có thêm `StaffAccountDto.locked` (bị khoá đăng nhập do nhập sai PIN). Chủ muốn ẩn cái nào? (Hai cái khác nghĩa.)
3. **Ẩn «Ghi chú của dịch vụ» với Đối tác:** «form gọn» của Đối tác dùng ô này làm «Ghi chú / Thời gian đón» (ADR-0195, mục nhóm 2). Ẩn có thể khiến họ không còn chỗ ghi giờ đón. Máy chủ cho phép; chủ cần biết trước khi bật.

## Nợ và điều chưa làm / chưa kiểm
1. Giao diện `web/` chưa nối (phiên khác): `traCuuChinhSach` đã nhận điều kiện, `web/bang-dieu-khien-truong.ts` chưa hiện cột điều kiện, `web/order-form.ts` / `web/service-card.ts` chưa ẩn ô theo điều kiện, chưa tính lại khi đổi lựa chọn đón. Màn chỉ xem mới (`chi-tiet-don`, `danh-sach-don`, `ho-tro`) và cột mới của danh sách tài khoản mới có danh mục, chưa có chỗ nào ẩn thật.
2. `PUT /api/orders/:id/trip` ngoài phạm vi (vẫn hiện đủ ô, vẫn ghi giá trị người nhập); bốn ô giờ và nhóm 3 hoãn.
3. Chưa có cách bỏ một dòng điều kiện để theo dòng trống (bảng chỉ-thêm; dòng HIEN có điều kiện là dòng đè). Nếu cần, thêm chế độ «kế thừa» bằng ADR nhỏ + migration.
4. Ô ẩn vẫn bị `validateOrder` kiểm dạng (ghi chú dịch vụ quá 1000 ký tự ⇒ 400 dù đang ẩn); ADR Đ4 xếp bước ẩn SAU `validateOrder` nên giữ.
5. Migration chạy thử trên SQLite (`node:sqlite`) và harness e2e nhẹ của bài; CHƯA áp thử trên D1 local của wrangler, CHƯA chạy `npm run test:e2e`, CHƯA chạy kịch bản Chrome.
6. Chưa có người kiểm độc lập (việc lớn: dữ liệu + quyền + luật); chưa ghi `src/shared/changelog.ts` (số phiên bản chủ quyết lúc phát hành).
