# ADR-0059 — Biển số xe và tài xế đón khách hiện trên chi tiết đơn cho người đã xem được lịch xe

- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-30 (hộp hỏi gom; điều phối chuyển lại nguyên văn): *"Duyệt cả ba, kèm 14 điểm chi tiết"* (ADR-0059, ADR-0060, ADR-0061 cùng điểm A-1…A-14 của hồ sơ trình); Q-2 *"Không"*; Q-1 *"Giữ quyền sẵn, chờ việc C2"*. Nguyên tắc chủ đã chốt trước đó (góp ý người dùng, C1 lượt 2): *"Có. Hiện biển số xe đón trên đơn cho người bán hàng"*. Hồ sơ trình + trang ghép: `docs/superpowers/specs/2026-09-30-de-xuat-adr-gop-y-d1-d3.md` (D1). Người kiểm độc lập chỉ-đọc hai vòng: ĐẠT CÓ ĐIỀU KIỆN, đã sửa theo cả hai vòng (bản sửa vòng 2 chưa được kiểm lại). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-30.
- **Loại:** **hai chiều** — không bảng, không cột, không mã quyền mới; rút lại = gỡ một route và một khối giao diện.
- **Sửa ADR:** **bổ sung** ADR-0049 D3 (thêm một route đọc của `van-chuyen`); không thay câu nào của luật ADR-0049 "Hướng dẫn viên, Đối tác không thấy" (`docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md:31`).
- **Hiến chương áp:** 4.4 (danh sách trường dựng mới), 5.3, 5.12.
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` `phat_hien` = `[]`, kiểm 30/9).
- **Mã đo** trên `main` @ `836c8247` (bản 1.38).
- **Điểm chi tiết do AI thêm, chủ đã duyệt kèm:** A-1 (số khách mỗi xe), A-2 (trạng thái chuyến), A-10 (tên tài xế), A-11 (mở cho Kế toán, Quản trị, Toàn quyền — suy từ ô `trip.view`).

## Tóm tắt (lời thường)
Bán hàng, Kế toán, Quản trị, Toàn quyền mở một đơn sẽ thấy dưới giờ đón: xe nào (biển số), ai lái, mấy khách trên xe đó, xe đã chạy chưa. Đây đúng là những người đã xem được Bảng điều phối — không mở quyền mới. Hướng dẫn viên, Đối tác, Thực tập, Tài xế **không** thấy. Không hiện SĐT tài xế, không tên khách.

## Bối cảnh
- Góp ý YC-0004: người bán muốn thấy biển số xe đón ngay dưới giờ đón trên đơn, để báo khách.
- Hôm nay biển số chỉ ở Bảng điều phối (`/api/van-chuyen/lich`, `…/chuyen/:id`, cổng `office` — `src/modules/van-chuyen/index.ts:712`, `:722`) và màn của tài xế. Chi tiết đơn (`GET /api/orders/:id`, `src/modules/orders/index.ts:529-546`) không có xe.
- Ô `trip.view` (`src/shared/permissions.ts:136`): Bán hàng, Kế toán, Quản trị, Toàn quyền = `any`; Tài xế công ty = `assigned` (chỉ chuyến mình lái); còn lại `none`.
- Liên kết dữ liệu: suất `vc_trip_allocation.leg_id` → chặng `ord_transfer_leg` (không khai khoá ngoại — `migrations/0042_chuyen_xe.sql:115-149`); `vc_trip.vehicle_id` → `vc_vehicle.plate_number` (`0042:21`, `0033:31`); tài xế đang mở `vc_trip_driver` (`valid_to_at IS NULL`, `0042:64-80`). `van-chuyen` đã đọc chặng của đơn qua view công bố `v_ord_leg_key (id, order_id, order_service_id, is_open)` (`migrations/0035_hanh_khach.sql:66-67`).
- `orders` **không** import `van-chuyen`, và `van-chuyen → orders` đã là cạnh được phép (`src/architecture.test.ts:51`).

## Quyết định
1. **Route đọc mới của `van-chuyen`** (tên tạm): `GET /api/van-chuyen/xe-cua-don/:orderId`, cổng `office`. Trình duyệt ở màn chi tiết đơn gọi **thêm** route này (khuôn ADR-0024 điều 4: màn hình đơn lấy dữ liệu của module khác qua route của module sở hữu, trình duyệt gọi thêm).
2. **Hai lần hỏi quyền trong thân route** (không dựa vào việc cổng `office` hôm nay trùng đúng tập `trip.view = any`):
   - `can(staff, "trip.view")` **không truyền ngữ cảnh** ⇒ chỉ ô `any` qua; Tài xế công ty (`assigned`) bị từ chối.
   - `can(staff, "order.view")` **không truyền ngữ cảnh** ⇒ chỉ người xem được mọi đơn qua.
   - Sai một trong hai ⇒ 403. Đơn không tồn tại ⇒ 404.
3. **Danh sách trường dựng mới (danh sách trắng, 4.4):** `{ chang: [{ legId, xe: [{ bienSo, tenTaiXe | null, soKhach, trangThai }] }] }`.
   - Một chặng có thể nằm trên **nhiều** chuyến (đoàn đông chia hai xe; chuyển xe cứu hộ đóng suất `TRANSFERRED` rồi mở suất mới) ⇒ trả **danh sách** xe mỗi chặng.
   - Chỉ tính suất đang mở (`valid_to_at IS NULL`), bỏ chuyến `CANCELLED`. Chuyến đã kết thúc vẫn hiện (xe đã chở khách).
   - `soKhach` = số suất hành khách đang mở của chặng trên chuyến đó (A-1). `trangThai` = mã trạng thái chuyến, giao diện đổi sang chữ Việt, không lộ mã thô (A-2).
   - `tenTaiXe` = tên hiển thị của hồ sơ tài xế đang mở, qua hàm công bố / view `v_pty_party_label` của `parties`, cạnh đã có (A-10).
   - **Không bao giờ:** SĐT tài xế, tên/năm sinh khách, khoá so sánh nơi (`place_key`, `khoaNoi*`), mã chuyến nội bộ khác, tiền, giấy tờ.
4. **Giao diện:** chi tiết đơn gọi route **chỉ khi** `can(me, "trip.view")` và `can(me, "order.view")` đúng ở phía trình duyệt (cùng bản đồ `src/shared/permissions.ts`); hiện dưới "Đón: giờ · nơi" của từng chặng: "Xe 79B-123.45 · Tài xế Nguyễn Văn A · 4 khách"; chặng chưa xếp: "Chưa xếp xe". Người không đủ quyền: không gọi, không hiện khối.
5. **Nhật ký chuyến vẫn không gắn đơn:** `trip_*` giữ `order_id` NULL (`docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md:252`, `:313` S12). Lý do: lịch sử đơn (`getAuditTrail` theo `order_id`, lọc qua `lichSuTheoVai` — `src/modules/orders/index.ts:544`) hiện cho người có `order.history.view`, gồm Hướng dẫn viên (đơn phụ trách) và Đối tác (đơn mình); gắn `order_id` vào `trip_*` là lộ xe qua đường lịch sử. Route đọc này **không** ghi nhật ký.

## Bảng quyền (9 quyền app)

| Quyền | Thấy xe trên đơn? | Căn cứ |
|---|---|---|
| SALES | Có (mọi đơn xem được) | `trip.view` any + `order.view` any |
| ACCOUNTING | Có | như trên (A-11) |
| ADMIN | Có | như trên (A-11) |
| SUPER_ADMIN | Có | như trên (A-11) |
| FIELD (HDV) | **Không** | `trip.view` none — luật ADR-0049 |
| PARTNER | **Không** | `trip.view` none; không qua cổng `office` |
| INTERN | **Không** | `trip.view` none |
| DRIVER | **Không** (qua route này) | `trip.view` = `assigned`, `order.view` none — vẫn thấy xe mình trên màn cuốc |
| DRIVER_PARTNER | **Không** | mọi ô none |

Tài khoản lai (vd SALES + FIELD) thấy, vì `can()` hợp các ô — đúng ý "người đã xem được Bảng điều phối". **Chấp nhận có chủ ý:** tài khoản lai SALES + PARTNER (còn gán được qua đường quản trị cũ — `permissions.ts:232-236`) **cũng thấy** xe trên đơn, nhất quán với việc tài khoản đó hôm nay đã mở được Bảng điều phối. ADR này không làm lỗ đó rộng hơn.

## Phương án bị loại
- **(A) View công bố `v_vc_*` để `orders` đọc bằng SQL:** `van-chuyen → orders` đã là cạnh; `orders` đọc view của `van-chuyen` là **vòng ở tầng SQL**, Hiến chương 5.3 cấm.
- **(B) Gốc lắp ráp tiêm hàm đọc vào `orders` (khuôn `mocToiThieu`, `src/index.ts:102-103`):** không vòng, nhưng `loadOrderView` được gọi ở 14 chỗ trong `src/modules/orders/index.ts` — hoặc gọi hàm tiêm ở mọi chỗ (thêm truy vấn, thêm mặt lộ), hoặc chỉ ở GET (hai hình dạng DTO cho cùng một đơn); việc hỏi `trip.view` bị chép sang `orders` và hợp đồng `Ctx` nở thêm. Phương án chọn giữ **một nơi** hỏi quyền (module sở hữu dữ liệu xe) và không đụng `orders`.
- **(C) Chép biển số vào chặng của đơn:** hai nguồn sự thật, lệch khi đổi xe/cứu hộ.
- **(D) Giữ nguyên (chỉ Bảng điều phối):** không đáp ứng lời chủ.

## Hệ quả — mã, test, hàng rào
- **Không migration.** Một câu SQL mới trong `van-chuyen` (module nghiêm — `defineSql`, chịu bài `EXPLAIN`): đọc `v_ord_leg_key` (lọc `order_id`), `vc_trip_allocation`, `vc_trip`, `vc_vehicle`, `vc_trip_driver`, nhãn hồ sơ qua đường công bố của `parties`.
- **Hợp đồng:** DTO mới trong `src/shared/contracts.ts` (khai từng khoá).
- **Test (đỏ trước, xanh sau):**
  - Route: 9 quyền + tài khoản lai (SALES+FIELD thấy; FIELD+INTERN không; DRIVER một mình 403).
  - **Bài ghim mới** (`src/shared/permissions.test.ts`): "mọi mã quyền có `trip.view = any` đều có `order.view = any`".
  - Bài liệt kê khoá DTO (khuôn S18 ADR-0049/0050): không `place_key`, tên khách, SĐT; mở rộng `src/hanh-khach-khong-lo-ten.test.ts` và bài "không lộ số" nếu DTO chạm tài xế (`src/giay-to-khong-lo-so.test.ts`).
  - e2e (tên tạm `tests/e2e/xe-tren-don.mjs`): lập đơn → xếp xe → Bán hàng thấy biển số; HDV phụ trách gọi route → 403; chuyến huỷ → không hiện.
  - Kịch bản Chrome chi tiết đơn (tài khoản cần xem mở **sau cùng** — bẫy kho cookie chung).
- **Hàng rào mới cần dòng ở `docs/SO-HANG-RAO.md`:** bài ghim "trip.view any ⇒ order.view any" và bài liệt kê khoá DTO — ghi "chưa quan sát chặn" tới khi thi công sửa cố ý → đỏ → hoàn nguyên.
- Tài liệu mô tả: `docs/SYSTEM-DESIGN.md` §7 (route); `docs/ARCHITECTURE.md` Phần II không đổi cạnh.

## Tiêu chí nghiệm thu
1. Bán hàng mở chi tiết một đơn có chặng đã xếp xe ⇒ thấy biển số, tên tài xế, số khách của từng xe dưới giờ đón.
2. Cùng đơn, tài khoản chỉ-HDV đang phụ trách, tài khoản Đối tác lập đơn, tài khoản Thực tập lập đơn: màn không có khối xe; gọi thẳng route ⇒ 403.
3. Tài khoản chỉ-Tài xế gọi route với đơn có chuyến mình lái ⇒ 403.
4. Chặng chia hai xe ⇒ hiện hai dòng; chuyến bị huỷ ⇒ không hiện; suất đã đóng ⇒ không tính.
5. JSON trả về không chứa SĐT, tên khách, `place_key` (bài quét tự động).
6. Lịch sử đơn (`GET /api/orders/:id`) không có dòng `trip_*` nào.
7. Thêm tạm `trip.view: any` cho INTERN trong bản đồ ⇒ bài ghim đỏ (quan sát chặn một lần, P16).
