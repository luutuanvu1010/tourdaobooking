# Đề xuất ADR lượt góp ý người dùng (D1, D2, D3) + trang ghép — 2026-09-30

> **Bản ĐỀ XUẤT, chưa duyệt.** AI soạn (vai lập kế hoạch, chỉ tài liệu), không tự duyệt (Hiến pháp N3, Điều 7.2). Chủ duyệt bản cuối thì điều phối chuyển từng ADR vào `docs/adr/` (thư mục đó bị hỏi quyền — `.claude/settings.json`), cấp số thật và ghi mục lục.

- **Số ADR tạm:** **0059** (D1), **0060** (D2), **0061** (D3). Số **0058** đã bị nhánh chưa gộp `ra-soat-luong-giao-dien` @ `77590349` dùng cho "phân loại dịch vụ" (`docs/superpowers/specs/2026-09-30-ra-soat-luong-giao-dien-phan-loai-huong-dan.md:57`) — bỏ qua để khỏi trùng. **Điều phối cần ghi giữ chỗ 0059–0061 vào bảng "Số đã giữ chỗ" của `docs/adr/README.md`** (người soạn không sửa `docs/adr/`).
- **Nguồn lời chủ:** `docs/superpowers/specs/2026-09-30-phan-tich-gop-y-nguoi-dung.md` trên nhánh `worktree-phan-tich-gop-y` @ `841c0384` (mục 6 "Chủ trả lời" lượt 2, lượt 3; mục 7.3). Tệp đó **chưa** có trên nhánh này; trích dẫn theo nhánh@commit.
- **Mã đo** trên `main` @ `836c8247` (bản 1.38, migration tới `0043`).
- **Hiến chương đã tra trước** (`docs/ARCHITECTURE.md` Phần I, đã duyệt): 5.2 (cấu hình bằng dữ liệu có kiểu, cấm flexfield), 5.3 (đồ thị không vòng kể cả tầng SQL), 5.4, 5.5 (chỉ-thêm, dấu vết), 5.7, 5.12, 5.13, 5.17.
- **Xây trên lỗ đang hở:** **không.** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (kiểm 30/9 trên `main` @ `836c8247`). Mục `thao_tac` còn sáu ô hoãn (`payment.receive`, `payment.refund`, `invoice.request`, `invoice.issue` hạn 2026-12-31; `task.progress`, `dispatch.guides.view` hạn 2026-11-30) — D1–D3 **không** dựa vào ô nào trong số đó (D2 cố ý không dùng `invoice.issue`, xem ADR-0060).
- **Xây trên nền chưa gộp (5.13):** D2 đứng trên module `billing` do **sổ tiền lượt 1** dựng (kế hoạch `docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md`, chưa thi công) ⇒ D2 thi công **sau** khi sổ tiền gộp `main`. D1, D3 không cần `billing`.
- **Migration:** số lấy lúc thi công, **sau** `0044`, `0045` (giữ cho sổ tiền) và sau số mà ADR-0058 (phân loại dịch vụ) lấy; kiểm mọi nhánh/worktree chưa gộp (`git ls-tree --name-only <nhánh> migrations/`). D1 không migration; D2 một; D3 một.
- **Trần mỗi lượt (CLAUDE.md §9):** đúng **3** quyết định chạm quyền/dữ liệu (D1 quyền xem, D2 bảng + ô quyền, D3 bảng + ô quyền) — không thêm gì khác vào lượt này.

---

## Tóm tắt (lời thường)

1. **D1 — Biển số xe trên đơn:** Bán hàng, Kế toán, Quản trị, Toàn quyền mở một đơn sẽ thấy dưới giờ đón: xe nào (biển số), ai lái, mấy khách trên xe đó. Đây đúng là những người đã xem được Bảng điều phối — không mở quyền mới. Hướng dẫn viên, Đối tác, Thực tập, Tài xế **không** thấy. Không hiện SĐT tài xế, không tên khách.
2. **D2 — Dấu "đã nhập phần mềm kế toán":** Kế toán (và Toàn quyền) bấm một dấu trên đơn, kèm ô "Số hoá đơn đã nhập". Lưu ở một bảng nhỏ riêng của phần sổ tiền, **chỉ ghi thêm** (bỏ dấu, sửa số = thêm dòng mới, có lý do khi bỏ dấu). Danh sách đơn lọc được "đã nhập / chưa nhập". Đây là việc nội bộ Kế toán, **không** thay luồng "yêu cầu xuất hoá đơn" đã duyệt từ trước. Làm sau sổ tiền.
3. **D3 — Mở lại "Dịch vụ nhập tay" cho nội bộ:** có công tắc bật/tắt do Toàn quyền, **mặc định TẮT**. Khi bật: Bán hàng, Quản trị, Toàn quyền (và Kế toán khi có chỗ sửa đơn) thêm được dịch vụ gõ tên + giá tay. Tài khoản có quyền Đối tác **luôn bị máy chủ chặn**, kể cả tài khoản lai. Khi tắt: đơn cũ có dịch vụ nhập tay vẫn đọc được, giữ nguyên như hôm nay.

---

# ADR-0059 (tạm) — D1: Biển số xe và tài xế đón khách hiện trên chi tiết đơn cho người đã xem được lịch xe

- **Trạng thái:** đề xuất (proposed). Chủ đã chốt nguyên tắc (C1 lượt 2: *"Có. Hiện biển số xe đón trên đơn cho người bán hàng"*); ADR này ghi lại + chi tiết kỹ thuật để duyệt bản cuối.
- **Loại:** **hai chiều** — không bảng, không cột, không mã quyền mới; rút lại = gỡ một route và một khối giao diện.
- **Sửa ADR:** **bổ sung** ADR-0049 D3 (thêm một route đọc của `van-chuyen`); không thay câu nào của luật C1 ADR-0049 ("Hướng dẫn viên, Đối tác không thấy" — `docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md:31`).
- **Hiến chương áp:** 4.4 (danh sách trường dựng mới), 5.3, 5.12.

## Bối cảnh
- Góp ý YC-0004: người bán muốn thấy biển số xe đón ngay dưới giờ đón trên đơn, để báo khách.
- Hôm nay biển số chỉ ở Bảng điều phối (`/api/van-chuyen/lich`, `…/chuyen/:id`, cổng `office` — `src/modules/van-chuyen/index.ts:712`, `:722`) và màn của tài xế. Chi tiết đơn (`GET /api/orders/:id`, `src/modules/orders/index.ts:529-546`) không có xe.
- Ô `trip.view` (`src/shared/permissions.ts:136`): Bán hàng, Kế toán, Quản trị, Toàn quyền = `any`; Tài xế công ty = `assigned` (chỉ chuyến mình lái); còn lại `none`.
- Liên kết dữ liệu: suất `vc_trip_allocation.leg_id` → chặng `ord_transfer_leg` (không khai khoá ngoại — `migrations/0042_chuyen_xe.sql:115-149`); `vc_trip.vehicle_id` → `vc_vehicle.plate_number` (`0042:21`, `0033:31`); tài xế đang mở `vc_trip_driver` (`valid_to_at IS NULL`, `0042:64-80`). `van-chuyen` đã đọc chặng của đơn qua view công bố `v_ord_leg_key (id, order_id, order_service_id, is_open)` (`migrations/0035_hanh_khach.sql:66-67`).
- `orders` **không** import `van-chuyen`, và `van-chuyen → orders` đã là cạnh được phép (`src/architecture.test.ts:51`).

## Quyết định
1. **Route đọc mới của `van-chuyen`** (tên tạm): `GET /api/van-chuyen/xe-cua-don/:orderId`, cổng `office`. Trình duyệt ở màn chi tiết đơn gọi **thêm** route này (khuôn ADR-0024 điều 4: "màn hình đơn lấy qua route của module sở hữu, trình duyệt gọi thêm").
2. **Hai lần hỏi quyền trong thân route** (không dựa vào việc cổng `office` hôm nay trùng đúng tập `trip.view = any`):
   - `can(staff, "trip.view")` **không truyền ngữ cảnh** ⇒ chỉ ô `any` qua; Tài xế công ty (`assigned`) bị từ chối.
   - `can(staff, "order.view")` **không truyền ngữ cảnh** ⇒ chỉ người xem được mọi đơn qua.
   - Sai một trong hai ⇒ 403. Đơn không tồn tại ⇒ 404.
3. **Danh sách trường dựng mới (danh sách trắng, 4.4):** `{ chang: [{ legId, xe: [{ bienSo, tenTaiXe | null, soKhach, trangThai }] }] }`.
   - Một chặng có thể nằm trên **nhiều** chuyến (đoàn đông chia hai xe; chuyển xe cứu hộ đóng suất `TRANSFERRED` rồi mở suất mới) ⇒ trả **danh sách** xe mỗi chặng.
   - Chỉ tính suất đang mở (`valid_to_at IS NULL`), bỏ chuyến `CANCELLED`. Chuyến đã kết thúc vẫn hiện (xe đã chở khách).
   - `soKhach` = số suất hành khách đang mở của chặng trên chuyến đó. `trangThai` = mã trạng thái chuyến, giao diện đổi sang chữ Việt (không lộ mã thô).
   - `tenTaiXe` = tên hiển thị của hồ sơ tài xế đang mở (qua hàm công bố / view `v_pty_party_label` của `parties`, cạnh đã có).
   - **Không bao giờ:** SĐT tài xế, tên/năm sinh khách, khoá so sánh nơi (`place_key`, `khoaNoi*`), mã chuyến nội bộ khác, tiền, giấy tờ.
4. **Giao diện:** chi tiết đơn gọi route **chỉ khi** `can(me, "trip.view")` và `can(me, "order.view")` đúng ở phía trình duyệt (cùng bản đồ `src/shared/permissions.ts`); hiện dưới "Đón: giờ · nơi" của từng chặng: "Xe 79B-123.45 · Tài xế Nguyễn Văn A · 4 khách"; chặng chưa xếp: "Chưa xếp xe". Người không đủ quyền: không gọi, không hiện khối.
5. **Nhật ký chuyến vẫn không gắn đơn:** `trip_*` giữ `order_id` NULL (`docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md:252`, `:313` S12). Lý do: lịch sử đơn là hình chiếu `v_aud_order_event` (`migrations/0025_thong_bao.sql:53`) mà Hướng dẫn viên và Đối tác xem được. Route đọc này **không** ghi nhật ký (đọc, không phải "xem đủ số").

## Bảng quyền (9 quyền app)

| Quyền | Thấy xe trên đơn? | Căn cứ |
|---|---|---|
| SALES | Có (mọi đơn xem được) | `trip.view` any + `order.view` any |
| ACCOUNTING | Có | như trên |
| ADMIN | Có | như trên |
| SUPER_ADMIN | Có | như trên |
| FIELD (HDV) | **Không** | `trip.view` none — luật C1 ADR-0049 |
| PARTNER | **Không** | `trip.view` none; không qua cổng `office` |
| INTERN | **Không** | `trip.view` none |
| DRIVER | **Không** (qua route này) | `trip.view` = `assigned`, `order.view` none — vẫn thấy xe mình trên màn cuốc |
| DRIVER_PARTNER | **Không** | mọi ô none |

Tài khoản lai (vd SALES + FIELD) thấy, vì `can()` hợp các ô — đúng ý "người đã xem được Bảng điều phối".

## Phương án bị loại
- **(A) View công bố `v_vc_*` để `orders` đọc bằng SQL:** `van-chuyen → orders` đã là cạnh (`src/architecture.test.ts:51`); `orders` đọc view của `van-chuyen` là **vòng ở tầng SQL**, Hiến chương 5.3 cấm ("kể cả ở tầng SQL"). Loại.
- **(B) Gốc lắp ráp tiêm hàm đọc vào `orders` (khuôn `mocToiThieu`, `src/index.ts:102-103`):** không vòng, nhưng:
  - `loadOrderView` được gọi ở **14** chỗ trong `src/modules/orders/index.ts` (GET, PUT, chặng, hành khách, bên đặt, trạng thái…). Hoặc gọi hàm tiêm ở mọi chỗ (thêm truy vấn, thêm mặt lộ — phản hồi của lệnh ghi cũng phải hỏi `trip.view`), hoặc chỉ ở GET (phản hồi sau khi lưu thiếu khối xe ⇒ màn hình nhấp nháy, hai hình dạng DTO cho cùng một đơn).
  - Việc hỏi `trip.view` bị **chép** sang `orders` (một ô, hai nơi thi hành) và hợp đồng `Ctx` của router (`src/shared/router.ts`) nở thêm một hàm.
  - Phương án chọn giữ **một nơi** hỏi quyền (chính module sở hữu dữ liệu xe) và không đụng `orders`.
- **(C) Chép biển số vào chặng của đơn:** hai nguồn sự thật, lệch khi đổi xe/cứu hộ. Loại.
- **(D) Giữ nguyên (chỉ Bảng điều phối):** không đáp ứng lời chủ C1.

## Hệ quả — mã, test, hàng rào
- **Không migration.** Một câu SQL mới trong `van-chuyen` (module nghiêm — `defineSql`, chịu bài `EXPLAIN`): đọc `v_ord_leg_key` (lọc `order_id`), `vc_trip_allocation`, `vc_trip`, `vc_vehicle`, `vc_trip_driver`, nhãn hồ sơ qua đường công bố của `parties`.
- **Hợp đồng:** DTO mới trong `src/shared/contracts.ts` (khai từng khoá).
- **Test (đỏ trước, xanh sau):**
  - Route: 9 quyền + ba tài khoản lai (SALES+FIELD thấy; FIELD+INTERN không; DRIVER một mình 403) — `src/modules/van-chuyen/*.test.ts`.
  - **Bài ghim mới** (`src/shared/permissions.test.ts`): "mọi mã quyền có `trip.view = any` đều có `order.view = any`" — ai sau này nới `trip.view` cho quyền không xem được mọi đơn thì đỏ.
  - Bài liệt kê khoá DTO (khuôn S18 ADR-0049/0050): DTO mới **không** có `place_key`, tên khách, SĐT; mở rộng `src/hanh-khach-khong-lo-ten.test.ts` (khối van-chuyen) và bài quét "không lộ số" nếu DTO chạm tài xế (`src/giay-to-khong-lo-so.test.ts`).
  - e2e `tests/e2e/xe-tren-don.mjs` (tên tạm): lập đơn → xếp xe → Bán hàng thấy biển số; HDV phụ trách đơn đó gọi route → 403; chuyến huỷ → không hiện.
  - Kịch bản Chrome chi tiết đơn (hai tài khoản; tài khoản cần xem mở **sau cùng** — bẫy kho cookie chung).
- **Hàng rào mới cần dòng ở `docs/SO-HANG-RAO.md`:** bài ghim "trip.view any ⇒ order.view any" và bài liệt kê khoá DTO — ghi **"chưa quan sát chặn"** tới khi thi công làm sửa cố ý → đỏ → hoàn nguyên.
- Tài liệu mô tả: `docs/SYSTEM-DESIGN.md` §7 (route), `docs/ARCHITECTURE.md` Phần II không đổi cạnh.

## Tiêu chí nghiệm thu (hành vi kiểm được)
1. Bán hàng mở chi tiết một đơn có chặng đã xếp xe ⇒ thấy biển số, tên tài xế, số khách của từng xe dưới giờ đón.
2. Cùng đơn, tài khoản chỉ-HDV đang phụ trách, tài khoản Đối tác lập đơn, tài khoản Thực tập lập đơn: màn không có khối xe; gọi thẳng route ⇒ 403.
3. Tài khoản chỉ-Tài xế gọi route với đơn có chuyến mình lái ⇒ 403.
4. Chặng chia hai xe ⇒ hiện hai dòng; chuyến bị huỷ ⇒ không hiện; suất đã đóng ⇒ không tính.
5. JSON trả về không chứa SĐT, tên khách, `place_key` (bài quét tự động).
6. Lịch sử đơn (`GET /api/orders/:id`) không có dòng `trip_*` nào.
7. Thêm tạm `trip.view: any` cho INTERN trong bản đồ ⇒ bài ghim đỏ (quan sát chặn một lần, P16).

---

# ADR-0060 (tạm) — D2: Dấu "đã nhập phần mềm kế toán" + "Số hoá đơn đã nhập" — bảng nhỏ chỉ-thêm của `billing`

- **Trạng thái:** đề xuất (proposed). Chủ đã chốt nguyên tắc (C4 lượt 2 + lượt 3: *"bảng nhỏ riêng của Kế toán (không dùng 'trường mở rộng tự do' — Hiến chương 5.2)"*; *"Kế toán + Toàn quyền; người khác chỉ xem"*).
- **Loại:** **một chiều** ở phần bảng (tiền tố `bil_`, bảng chỉ-thêm có dữ liệu thì không gỡ được mà không dựng lại); ô quyền mới là hai chiều.
- **Sửa ADR:** **bổ sung** ADR-0024 (thêm một bảng vào danh sách bảng của `billing`); **không** sửa ADR-0004 (luồng yêu cầu xuất hoá đơn giữ nguyên).
- **Hiến chương áp:** 5.2, 5.3, 5.5, 5.12, 5.13.
- **Điều kiện bắt đầu thi công:** sổ tiền lượt 1 đã gộp `main` (module `billing`, hạng nghiêm, `STRICT`, cạnh `billing → orders, parties, staff, dispatch, audit` — ADR-0024 điều 2).

## Bối cảnh
- Góp ý YC-0011: Kế toán muốn đánh dấu đơn "đã nhập phần mềm kế toán" và ghi số hoá đơn đã nhập, để khỏi nhập trùng / sót.
- ADR-0004 (b) đã duyệt luồng **"yêu cầu xuất hoá đơn"** (chưa yêu cầu / cần xuất / đã xuất; Kế toán ghi số hoá đơn, ngày, người) — **chưa thi công**; ô `invoice.request`, `invoice.issue` (`src/shared/permissions.ts:95-96`) chưa có route, đang ở sổ hoãn `docs/quyen-hoan.json` (hạn 2026-12-31).
- ADR-0024 điều 4: `orders` **không bao giờ** đọc bảng `bil_`; màn đơn lấy số của `billing` qua route của `billing`.

## Quyết định
1. **Bảng mới** (tên tạm) `bil_accounting_entry` — module `billing`, **chỉ-thêm**:
   - `id` TEXT PK; `order_id` TEXT NOT NULL REFERENCES `orders(id)` (cạnh `billing → orders` đã có; `NO ACTION`, không `CASCADE`);
   - `entered` INTEGER NOT NULL `CHECK (entered IN (0, 1))` — 1 = đánh dấu đã nhập, 0 = bỏ dấu;
   - `invoice_number` TEXT NULL `CHECK (invoice_number IS NULL OR length(trim(invoice_number)) BETWEEN 1 AND 50)` — "Số hoá đơn đã nhập";
   - `reason` TEXT NULL — **bắt buộc khi bỏ dấu**: `CHECK (entered = 1 OR (reason IS NOT NULL AND length(trim(reason)) > 0 AND invoice_number IS NULL))`;
   - 4 cột dấu vết `created_at`, `created_by`, `updated_at`, `updated_by` (`updated_*` = `created_*`, như ADR-0026);
   - trigger `bil_accounting_entry_no_update`, `bil_accounting_entry_no_delete` (thông báo có tiền tố `bil_append_only:`);
   - chỉ mục `(order_id)`.
   - **Trạng thái hiện tại** của một đơn = dòng có `rowid` lớn nhất của đơn đó (không xếp theo `created_at` — hai lần ghi cùng mili-giây; tiền lệ R-BIL-1 của kế hoạch sổ tiền §3.2). Sửa số hoá đơn = thêm dòng `entered = 1` với số mới.
   - Không có "trường mở rộng tự do": hai trường có kiểu, có `CHECK` (Hiến chương 5.2).
2. **Ô quyền mới** (tên tạm) `accounting.entry.mark` — **không** dùng lại `invoice.issue`:
   - `invoice.issue` có Quản trị = `any` (`permissions.ts:96`), trái lời chủ ("Kế toán + Toàn quyền");
   - một mã một nghĩa (R-K1): `invoice.issue` là "đánh dấu hoá đơn đã xuất" của ADR-0004, việc khác;
   - `invoice.*` giữ nguyên trong `docs/quyen-hoan.json`, không đổi hạn.
3. **Route ghi** (module `billing`, cổng `office`): `POST /api/orders/:id/nhap-ke-toan` (tên tạm), thân `{ daNhap: boolean, soHoaDon?: string, lyDo?: string, truocDo: string | null }`.
   - `can(staff, "accounting.entry.mark")` (ô `any`, không phạm vi đơn).
   - **Đánh dấu** chỉ khi đơn `confirmed` (đọc `v_ord_order_state` — view của sổ tiền); **bỏ dấu** được ở mọi trạng thái (đơn huỷ sau khi đã nhập ⇒ Kế toán bỏ dấu kèm lý do).
   - **Chạy được sau "Đã giao" và sau "Hoàn thành"** — Kế toán thường nhập sau khi đơn xong. Route này thuộc `billing` nên **không** nằm trong danh sách "mọi route ghi của `orders`/`dispatch` từ chối sau Đã giao" (NT-F7 của kế hoạch sổ tiền); bảng ca của bài NT-F7 ghi rõ route này là "được phép sau Đã giao".
   - Khoá lạc quan: `truocDo` = id dòng hiện tại người dùng thấy (null = chưa có dòng); câu `INSERT … SELECT … WHERE (id dòng rowid lớn nhất của đơn) IS ?` ⇒ thua thì 409 `stale`.
   - Gửi trùng trạng thái (đã nhập, cùng số) ⇒ 200, không thêm dòng.
   - Nhật ký cùng lô: `order_accounting_entry_marked` / `order_accounting_entry_unmarked` (gắn `order_id`), detail = trạng thái + số hoá đơn + lý do. Không SĐT/email/MST (5.12). Hiển thị dòng này trong lịch sử đơn theo câu **Q-2** dưới đây.
4. **Đọc trên chi tiết đơn:** route `billing` `GET /api/orders/:id/nhap-ke-toan` (cổng `orders`): hỏi `can(order.view, { ownerId, assigned })` như chi tiết đơn (và luật Q-2 cho Đối tác); trả trạng thái hiện tại (daNhap, soHoaDon, lúc, tên người bấm) và — chỉ cho người có `accounting.entry.mark` — các dòng trước đó.
5. **Lọc và gắn nhãn ở danh sách đơn** (`GET /api/orders`, module `orders`, `src/modules/orders/index.ts:458`): `orders` không đọc `bil_` ⇒ gốc lắp ráp tiêm **hàm đọc** của `billing` (khuôn `myHandledOrderIds` / `ordersWithHandler`, `src/shared/router.ts:56`, `:61`):
   - `ctx.donDaNhapKeToan()` ⇒ danh sách id đơn có trạng thái hiện tại `entered = 1`; tham số lọc `nhapKeToan=da|chua` của `GET /api/orders` dùng danh sách này (`IN` / `NOT IN` qua một tham số chuỗi JSON + `json_each`);
   - `ctx.nhapKeToanCuaDon(orderIds)` ⇒ tập id đã nhập trong trang đang xem (gắn nhãn thẻ đơn).
   - Đây là tiêm **hàm đọc tập id**, được ADR-0020 (S20-13: "hàm công bố … hoặc tiêm qua `ctx`") cho phép; **không** phải tiêm câu lệnh ghi (ADR-0024 "Phương án bị loại": "không tiêm câu lệnh qua gốc lắp ráp").
   - Bộ lọc này ghép vào bộ lọc nhiều điều kiện T4 (đợt giao diện G1); ai gộp sau thì gộp lại, không viết đè.
   - Giới hạn độ dài một tham số của D1 **chưa kiểm** — đo lúc thi công; bài kiểm canh cỡ danh sách (cảnh báo khi vượt ngưỡng đo được) để biết lúc cần đổi cách.
6. **Quan hệ với ADR-0004 (yêu cầu xuất hoá đơn):** đây là **cờ nội bộ của Kế toán** ("tôi đã nhập đơn này vào phần mềm kế toán bên ngoài, số chứng từ/hoá đơn ở đó là …"). Nó **không** thay, không tạo, không chuyển trạng thái của luồng ADR-0004. Mặc định để tránh hai nguồn sự thật:
   - "Số hoá đơn đã nhập" ở đây = **số tham chiếu trong phần mềm kế toán ngoài**, chỉ để tra cứu;
   - khi luồng ADR-0004 được thi công, **luồng đó là nguồn sự thật về việc đã xuất hoá đơn**; máy **không** tự chép số giữa hai nơi. Màn hình lúc đó hiện cả hai và cảnh báo khi hai số khác nhau (quyết định chi tiết thuộc ADR của luồng hoá đơn).

## Bảng quyền (9 quyền app)

| Quyền | Ghi dấu / số (`accounting.entry.mark`, mới) | Thấy dấu trên đơn |
|---|---|---|
| SALES | none | Có (đơn xem được) |
| ACCOUNTING | **any** | Có |
| ADMIN | none (lời chủ: chỉ Kế toán + Toàn quyền) | Có |
| SUPER_ADMIN | **any** | Có |
| FIELD (HDV) | none | Có (đơn đang phụ trách) |
| PARTNER | none | **theo Q-2** (khuyến nghị: Không) |
| INTERN | none | Có (đơn của mình) |
| DRIVER | none | Không (không xem đơn) |
| DRIVER_PARTNER | none | Không |

Thêm một **ô thao tác** (không phải mã quyền mới) ⇒ không đụng `EXTERNAL_PERMISSIONS`, trigger LC-1, không nhân đôi bài "tập con quyền".

## Phương án bị loại
- **Trường mở rộng tự do (flexfield / JSON trên `orders`):** Hiến chương 5.2 cấm; chủ đã chọn theo luật (lượt 3).
- **Cột trên `orders`:** `orders` không phải chủ của dữ liệu Kế toán; sửa đè cột mất dấu vết (5.5); `billing` ghi bảng `orders` trái ADR-0002 điều 3.
- **Dùng lại `invoice.issue` / bảng `bil_invoice_request` của ADR-0004:** khác nghĩa, khác người được ghi (Quản trị); làm luồng hoá đơn đầy đủ trước chỉ để có một dấu là nở phạm vi.
- **Bảng có hiệu lực `valid_from/to` + sửa dòng:** phải `UPDATE` đóng dòng cũ; bảng chỉ-thêm với "dòng mới nhất thắng" đơn giản hơn và không cần trigger hai pha.
- **Lọc danh sách bằng route riêng của `billing`** (màn "Đơn chưa nhập" tách khỏi danh sách đơn): trùng bộ lọc của `orders` (ngày, dịch vụ, trạng thái, phạm vi xem theo vai) ở module khác — hai nơi thi hành phạm vi xem. Giữ làm lối dự phòng nếu tập id quá lớn.

## Hệ quả — migration, route, test, hàng rào
- **Migration** (một tệp, số sau sổ tiền và ADR-0058): bảng + hai trigger chỉ-thêm + chỉ mục. `docs/data-dictionary.json` + `npm run dict`.
- **Route:** `POST /api/orders/:id/nhap-ke-toan`, `GET /api/orders/:id/nhap-ke-toan` (module `billing`); tham số `nhapKeToan` của `GET /api/orders`; hai hàm tiêm mới ở `src/shared/router.ts` + `src/index.ts`. Hành động nhật ký mới ở `src/shared/audit-actions.ts`.
- **Test:**
  - Migration: `UPDATE`/`DELETE` bị chặn; `CHECK` bỏ dấu thiếu lý do, số hoá đơn rỗng/quá dài bị chặn.
  - Route: 9 quyền + lai (ADMIN+ACCOUNTING ghi được; ADMIN một mình 403); đơn nháp ⇒ 409; đơn đã "Đã giao"/"Hoàn thành" ⇒ ghi được; chạy đua `truocDo` ⇒ một bên 409.
  - Bài NT-R4 của sổ tiền ("`orders` không nhắc `bil_`") vẫn xanh — không SQL nào của `orders` chạm `bil_accounting_entry`.
  - e2e: Kế toán đánh dấu → danh sách lọc "chưa nhập" không còn đơn đó; bỏ dấu có lý do → quay lại.
  - Bài bản đồ quyền (`src/shared/permissions.test.ts`): ghim giá trị hàng `accounting.entry.mark`.
- **Hàng rào mới cần dòng ở `docs/SO-HANG-RAO.md`:** trigger chỉ-thêm `bil_accounting_entry_*`; ô ghi không có Quản trị (bài ghim) — ghi **"chưa quan sát chặn"** tới lúc thi công quan sát đỏ thật.
- Kiểm định kỳ (tuỳ chọn, mức `warn`): `R-BIL-AE1` — đơn nháp có dòng `entered = 1` (không thể xảy ra qua route; bắt SQL chạy tay).

## Tiêu chí nghiệm thu
1. Kế toán đánh dấu đơn đã xác nhận, nhập số "HD-000123" ⇒ mọi người xem được đơn (trừ theo Q-2) thấy "Đã nhập phần mềm kế toán · HD-000123".
2. Quản trị, Bán hàng, HDV gọi route ghi ⇒ 403.
3. Bỏ dấu không lý do ⇒ 400; có lý do ⇒ dòng mới, dấu mất, dòng cũ vẫn còn (xem được ở lịch sử cho Kế toán).
4. `UPDATE bil_accounting_entry …` chạy tay ⇒ bị trigger chặn.
5. `GET /api/orders?nhapKeToan=chua` không trả đơn vừa đánh dấu; `=da` trả đúng đơn đó; phạm vi xem theo vai không đổi (Bán hàng vẫn chỉ thấy đơn mình được thấy).
6. Sau "Hoàn thành", Kế toán vẫn đánh dấu được.

---

# ADR-0061 (tạm) — D3: Mở lại "Dịch vụ nhập tay" cho nội bộ, có công tắc của Toàn quyền (mặc định TẮT); Đối tác luôn bị chặn

- **Trạng thái:** đề xuất (proposed). Chủ đã chốt nguyên tắc (T1 lượt 2: *"Hiện lại 'Dịch vụ nhập tay' cho nội bộ công ty (đối tác không dùng được); công tắc bật/tắt ở màn của Toàn quyền"*; lượt 3: *"Bán hàng, Kế toán, Quản trị, Toàn quyền. Không: HDV, Thực tập sinh, Đối tác, Tài xế"*).
- **Loại:** **một chiều** ở phần bảng chính sách (tiền tố `ord_`, bảng chỉ-thêm); luật mở/đóng là hai chiều (tắt công tắc).
- **Sửa ADR:** sửa **một phần** ADR-0021 điều 2 và ADR-0027 điều 1; sửa điều kiện gỡ lệch 5.1 của ADR-0029 (bảng "Câu bị thay" dưới).
- **Hiến chương áp:** 5.1 (lệch thu hẹp), 5.2, 5.4, 5.5, 5.7, 5.17.

## Bối cảnh
- ADR-0021 ẩn nút "+ Dịch vụ nhập tay" (còn phần tử ẩn: `public/order-form.html:18`, `web/order-form.ts:46`). ADR-0027 điều 1 (vá DK-T3-01: Đối tác tự gõ giá lên phiếu mang MST Tour Đảo) chặn ở máy chủ **cho mọi tài khoản**: `manualFreezeViolation` (`src/modules/orders/price-guards.ts:61`) gọi trong `priceGuard` (`src/modules/orders/index.ts:113-120`) ở `POST /api/orders` (`:495`) và `PUT /api/orders/:id` (`:548`). Chủ khi đó nói *"Sẽ mở lại khi cần thiết"*.
- Máy chủ vẫn phân tích dịch vụ nhập tay (`manualService`, `src/modules/orders/service-rules.ts:231-255`); dịch vụ nhập tay có `catalog_code` NULL, `catalog_price` NULL.
- Luật giá Đối tác R2 (`retailPricesOnly`) và R3 (trần giảm giá) chạy ở lập, sửa **và** xác nhận (`src/modules/orders/index.ts:806-807`) — dòng nhập tay (không giá danh mục) tự trượt R2.
- **Rủi ro "tài khoản lai":** `can()` là **hợp** các ô của mọi quyền (`permissions.ts:191`); chính `permissions.ts:232-237` ghi đường quản trị cũ vẫn gán được PARTNER cùng quyền nội bộ. Một ô mới SALES = any sẽ cho tài khoản SALES + PARTNER qua nếu chỉ hỏi `can()`.
- **Kế toán hôm nay không lập, không sửa đơn:** `order.create` và `order.modify` của ACCOUNTING = `none` (`permissions.ts:76-77`).

## Quyết định
1. **Bảng chính sách mới** (tên tạm) `ord_manual_service_policy` — module `orders` (tiền tố `ord_`), khuôn `vc_dispatch_policy` (`migrations/0041_chinh_sach_dieu_phoi.sql:14-35`):
   - `id` TEXT PK; `enabled` INTEGER NOT NULL `CHECK (enabled IN (0, 1))`; `valid_from_at` TEXT NOT NULL UNIQUE; 4 cột dấu vết;
   - trigger cấm `UPDATE`, cấm `DELETE` (chỉ-thêm); đổi = thêm dòng mới, máy chủ đặt `valid_from_at` = lúc ghi, không lùi;
   - **gieo một dòng `enabled = 0`** trong migration (mặc định TẮT);
   - dòng hiệu lực = `valid_from_at` lớn nhất ≤ bây giờ. Bảng rỗng (không thể xảy ra sau migration) ⇒ coi như TẮT (5.7: không đoán "bật").
   - Câu SQL mới đặt ở tệp nửa nghiêm của `orders` (`defineSql`, hằng `NUA_NGHIEM` — Phần II).
2. **Ô quyền mới** (tên tạm) `order.service.manual`: SALES any, ACCOUNTING any, ADMIN any, SUPER_ADMIN any; FIELD, PARTNER, INTERN, DRIVER, DRIVER_PARTNER none. **Không có phạm vi đơn**: phạm vi (đơn nào được lập/sửa) vẫn do `order.create` / `order.modify` quyết.
3. **Luật máy chủ — một hàm thuần duy nhất** (tên tạm `duocNhapTay(staff, chinhSachBat)` trong `price-guards.ts`):
   `duocNhapTay = chinhSachBat && can(staff, "order.service.manual") && !holdsPartner(staff)`.
   - Thứ tự trong `priceGuard`: **Đối tác trước** (`holdsPartner` ⇒ luôn áp R1 đóng băng như hôm nay, bất kể công tắc và ô), rồi công tắc, rồi ô.
   - `duocNhapTay` đúng ⇒ bỏ qua `manualFreezeViolation` (thêm mới, sửa tên/giá dịch vụ nhập tay được). Sai ⇒ R1 đóng băng như hôm nay (giữ nguyên dịch vụ nhập tay đã lưu, không thêm, không sửa tên/giá; bỏ khỏi đơn nháp thì được).
   - R2, R3 **không đổi** (lớp chặn thứ hai cho Đối tác, cả ở xác nhận).
   - `priceGuard` đọc dòng chính sách **một lần mỗi request**.
4. **Khi TẮT:** đơn cũ có dịch vụ nhập tay vẫn đọc, in biên nhận, xác nhận được như hôm nay; không ai thêm mới (đúng hành vi bản 1.38). Tắt sau một thời gian bật ⇒ các dòng đã thêm trở thành "đóng băng", không mất.
5. **Mọi đường ghi dịch vụ đều qua cùng hàm:** hôm nay chỉ `POST /api/orders` và `PUT /api/orders/:id` (nháp) ghi `order_service`/`order_item`. `POST /api/orders/:id/handler-money-edit` (`src/modules/dispatch/index.ts:229`) chỉ ghi **dòng điều chỉnh**, từ chối dịch vụ thừa (chú thích `:226-228`) — không mở đường nhập tay. Route sửa sau xác nhận tương lai (C2) **phải** gọi `duocNhapTay` — bài tĩnh dưới đây canh.
6. **Công tắc:** `GET /api/orders/cai-dat/nhap-tay` (cổng `orders`, trả `{ batNhapTay, duocDung }` với `duocDung = duocNhapTay(người gọi, …)` để form biết hiện nút) và `POST /api/orders/cai-dat/nhap-tay` (cổng `admin`, `can(settings.ops)` — hôm nay chỉ Toàn quyền, `permissions.ts:109`), nhật ký `manual_service_policy_changed`. Nút bật/tắt đặt ở màn cài đặt của Toàn quyền (cạnh chính sách điều phối). **Bẫy router:** khai hai route này **trước** `GET /api/orders/:id` nếu đường dẫn có thể bị `:id` khớp (tiền lệ `dashboard`, `pool`, `moc-toi-thieu` — `index.ts:422-451`).
7. **Tiền nhập tay đi qua sổ tiền như dịch vụ danh mục:** dòng nhập tay là `order_item` bình thường ⇒ "phải thu", "Đã giao", biên nhận, sổ công nợ tính như mọi dòng (một hàm tính — 5.4). **Sổ vàng (5.17):** thêm ca có dòng nhập tay (không giá danh mục) vào bộ ca của sổ tiền, chủ/Kế toán xác nhận từng đồng. Khi có giá vốn/chiết khấu theo danh mục (`pricing`, lượt sau): dòng nhập tay **không có nguồn giá vốn** ⇒ đơn bị **giữ** ở bước cần giá vốn, hiện lý do và ai xử lý (5.7), **không bao giờ lấy 0**.
8. **Lệch 5.1 (ADR-0029) — thu hẹp, không tự hết:** ADR-0029 ghi "nếu chủ mở lại nhập tay thì gỡ luật, lệch tự hết". D3 mở **có điều kiện**, nên luật "không nhập tay khi tắt / khi không có ô / khi có quyền Đối tác" **vẫn chỉ ở mã**. Không thêm trigger được vì:
   - lưu nháp **xoá rồi chèn lại** toàn bộ `order_service`/`order_item` (`src/modules/orders/repository.ts:918-920`) — trigger không phân biệt được dòng nhập tay cũ được giữ với dòng mới;
   - `order_service` không có cột người tạo/lúc tạo riêng dòng; điều kiện "người gọi có quyền Đối tác" không thuộc dữ liệu của bảng.
   - **Lớp bù:** kiểm định kỳ `R-ORD-NT1` (mức `warn`, `scripts/audit-checks.mjs`): đơn có dịch vụ nhập tay mà người lập (`orders.staff_id`) đang giữ quyền PARTNER và đơn tạo **sau** mốc phát hành D3. Điều kiện gỡ lệch mới: khi có cột người/lúc tạo cho từng dòng dịch vụ (hoặc bỏ xoá–chèn ở lưu nháp) ⇒ ADR mới thêm trigger.

## Bảng quyền (9 quyền app)

| Quyền | `order.service.manual` (mới) | Thực tế khi công tắc BẬT |
|---|---|---|
| SALES | any | Thêm/sửa dịch vụ nhập tay trên đơn mình lập/sửa được |
| ACCOUNTING | any | **Chưa có tác dụng** — Kế toán không lập/sửa đơn (`order.create`/`order.modify` none). Xem **Q-1** |
| ADMIN | any | Được |
| SUPER_ADMIN | any | Được |
| FIELD (HDV) | none | Không |
| PARTNER | none | **Không, kể cả tài khoản lai** (`holdsPartner` chặn trước) |
| INTERN | none | Không (vẫn lập đơn bằng danh mục) |
| DRIVER | none | Không |
| DRIVER_PARTNER | none | Không |

Ghi công tắc: `settings.ops` (chỉ Toàn quyền — không đổi ô).

## Câu bị thay

| ADR | Câu cũ | Câu mới |
|---|---|---|
| ADR-0021 điều 2 | "Ẩn nút '+ Dịch vụ nhập tay' trong mọi trường hợp" | "Ẩn nút, **trừ khi** công tắc nhập tay đang BẬT và người dùng được nhập tay (ADR-0061)." |
| ADR-0027 điều 1 | "Ngừng dịch vụ nhập tay — ở máy chủ, cho mọi tài khoản." | "Ngừng dịch vụ nhập tay ở máy chủ **khi công tắc TẮT, với người không có ô `order.service.manual`, và luôn luôn với tài khoản có quyền Đối tác** (ADR-0061). Phần đóng băng dịch vụ nhập tay đã lưu giữ nguyên cho các trường hợp đó." |
| ADR-0029 "Khi nào gỡ lệch" 5.1 | "nếu chủ **mở lại** nhập tay thì gỡ luật, lệch tự hết" | "ADR-0061 mở lại **có điều kiện**: lệch 5.1 thu hẹp còn luật 'khi tắt / không có ô / có quyền Đối tác', lớp bù `R-ORD-NT1`; gỡ khi dòng dịch vụ có dấu vết riêng (ADR mới)." |

## Phương án bị loại
- **Công tắc bằng biến môi trường / hằng trong mã:** Toàn quyền không tự bật được; trái 5.2 (điều hay đổi là dòng dữ liệu có ngày hiệu lực).
- **Công tắc là JSON trong một bảng "cài đặt chung":** trái 5.2 (không JSON tự do).
- **Chỉ hỏi `can(order.service.manual)`, không `holdsPartner`:** tài khoản lai SALES + PARTNER lọt — lặp lại lỗi người kiểm độc lập đã chứng minh 26/9 (`permissions.ts:232-236`).
- **Mở cho mọi người lập đơn rồi dựa R2 chặn Đối tác ở xác nhận:** Đối tác vẫn lưu nháp được giá tự gõ; trái lời chủ "đối tác không dùng được"; mất lớp chặn thứ nhất.
- **Cấp `order.create` cho Kế toán để dùng nhập tay:** nở quyền lập đơn — ngoài phạm vi, xem Q-1.

## Hệ quả — migration, route, test, hàng rào
- **Migration** (một tệp): bảng + hai trigger chỉ-thêm + dòng gieo `enabled = 0`. `docs/data-dictionary.json` + `npm run dict`.
- **Mã:** `price-guards.ts` (hàm `duocNhapTay`, sửa chú thích R1), `orders/index.ts` (`priceGuard` nhận chính sách), hai route công tắc, `web/order-form.ts` (hiện nút theo `duocDung`; câu lỗi cũ `MANUAL_FROZEN_MESSAGE` đổi thành câu nói rõ "chưa bật / tài khoản không được nhập tay"), màn cài đặt của Toàn quyền, `src/shared/audit-actions.ts`.
- **Test (đỏ trước, xanh sau):**
  - `price-guards.test.ts`: bảng ca đủ tổ hợp (công tắc bật/tắt × 9 quyền × lai **SALES+PARTNER**, **PARTNER+FIELD**, **ADMIN+PARTNER**) — mọi tài khoản có PARTNER luôn bị chặn.
  - Bài tĩnh mới: "mọi route gọi `validateOrder` đều gọi `priceGuard`" (khuôn `src/route-access.test.ts`) — route C2 tương lai không lách được.
  - Sửa `tests/e2e/nhap-tay-va-gia-doi-tac.mjs`: công tắc tắt ⇒ hành vi cũ; bật ⇒ Bán hàng lập đơn nhập tay 201, Đối tác 400; tắt lại ⇒ đơn đó vẫn mở, xác nhận được, không sửa được giá dòng nhập tay.
  - Migration: `UPDATE`/`DELETE` bảng chính sách bị chặn; sau migration dòng hiệu lực là `enabled = 0`.
  - Sổ vàng: ca dòng nhập tay (ở sổ tiền).
  - Kịch bản Chrome form đơn (nút hiện/ẩn theo tài khoản).
- **Hàng rào mới cần dòng ở `docs/SO-HANG-RAO.md`:** (a) `holdsPartner` đứng trước trong `duocNhapTay` (bài ca lai); (b) bài tĩnh "route ghi dịch vụ gọi `priceGuard`"; (c) trigger chỉ-thêm `ord_manual_service_policy`; (d) `R-ORD-NT1` — mọi dòng ghi **"chưa quan sát chặn"** tới khi thi công sửa cố ý → đỏ → hoàn nguyên. Sửa dòng hiện có về R1 (DK-T3-01) nếu sổ đang mô tả "chặn mọi tài khoản".
- Tài liệu: `docs/SYSTEM-DESIGN.md` §16 (dòng lệch ADR-0029 cập nhật), `docs/CHANGE-GUIDE.md` (công thức "bật/tắt nhập tay").

## Tiêu chí nghiệm thu
1. Sau migration, không ai (kể cả Toàn quyền) thêm được dịch vụ nhập tay — máy chủ trả 400 như bản 1.38; nút ẩn.
2. Toàn quyền bật công tắc ⇒ Bán hàng, Quản trị thấy nút và lập đơn có dịch vụ nhập tay ⇒ 201; tổng tiền tính ở máy chủ.
3. Cùng lúc đó: HDV, Thực tập, Đối tác (kể cả tài khoản lai Đối tác + Bán hàng) gửi dịch vụ nhập tay mới ⇒ 400/403; nút không hiện.
4. Quản trị gọi `POST …/cai-dat/nhap-tay` ⇒ 403; Toàn quyền ⇒ 200, có dòng nhật ký.
5. Toàn quyền tắt ⇒ đơn đã có dịch vụ nhập tay vẫn mở, xác nhận được; sửa tên/giá dòng đó ⇒ 400.
6. Kế toán nhận biên nhận/sổ tiền của đơn có dòng nhập tay đúng từng đồng theo ca sổ vàng.

---

# Trang ghép (CLAUDE.md §9 — bắt buộc cho lượt này)

## 1. Bảng nào chứa những loại thực thể nào

| Bảng | Module | Hôm nay chứa | Sau lượt này | ADR |
|---|---|---|---|---|
| `vc_trip`, `vc_trip_allocation`, `vc_trip_driver`, `vc_vehicle` | `van-chuyen` | chuyến, suất (hành khách / người đi kèm), dòng lái, xe | **không đổi**; thêm một **đường đọc** mới theo đơn (danh sách trắng) | 0059 |
| `ord_transfer_leg` (qua `v_ord_leg_key`) | `orders` | chặng đưa đón | không đổi | 0059 |
| `audit_log` / `v_aud_order_event` | `audit` | mọi hành động; lịch sử đơn là hình chiếu | + `order_accounting_entry_*` (gắn đơn), + `manual_service_policy_changed` (không gắn đơn); `trip_*` **vẫn** `order_id` NULL | 0059–0061 |
| `bil_accounting_entry` **(mới)** | `billing` | — | **một loại**: dấu "đã nhập phần mềm kế toán" của một đơn (đánh dấu / bỏ dấu), chỉ-thêm. **Không tiền**, không trạng thái hoá đơn ADR-0004 | 0060 |
| `bil_*` của sổ tiền (`bil_payment_receipt`, `bil_posting`, `bil_debt_line`) | `billing` | *(chưa có — sổ tiền lượt 1)* | không đổi; không bảng nào của D2 trỏ vào chúng | — |
| `ord_manual_service_policy` **(mới)** | `orders` | — | **một loại**: chính sách bật/tắt nhập tay có ngày hiệu lực | 0061 |
| `order_service` / `order_item` | `orders` | **hai loại dòng**: danh mục (`catalog_code`, `catalog_price` có) và nhập tay (NULL) — loại nhập tay hôm nay **chỉ còn bản cũ** | loại nhập tay **sinh mới lại** khi công tắc BẬT, chỉ do tài khoản nội bộ có ô; **không cột mới**. Đây là "bảng dùng chung nhận lại một loại dòng" — bài học F-01: mọi luật chạm hai bảng này được liệt kê ở mục 2 | 0061 |

## 2. Từng dòng bản đồ quyền chạm các bảng trên — áp cho loại nào

Cột: SALES · ACCOUNTING · ADMIN · FIELD · PARTNER · SUPER_ADMIN · INTERN · DRIVER · DRIVER_PARTNER (`src/shared/permissions.ts:5`).

| Ô | Giá trị | Chạm bảng / loại | Ghi chú |
|---|---|---|---|
| `trip.view` (có) | any·any·any·none·none·any·none·assigned·none | `vc_*` qua route mới `xe-cua-don` | route hỏi **không ngữ cảnh** ⇒ chỉ ô `any`; DRIVER không qua |
| `order.view` (có) | any·any·any·assigned·own·any·own·none·none | route `xe-cua-don` (không ngữ cảnh ⇒ chỉ `any`); route đọc dấu D2 (có ngữ cảnh đơn) | Q-2 quyết Đối tác có thấy dấu D2 không |
| `accounting.entry.mark` **(mới)** | none·any·none·none·none·any·none·none·none | `bil_accounting_entry` (mọi dòng) | không dùng lại `invoice.issue` |
| `invoice.request`, `invoice.issue` (có, chưa route) | không đổi | `bil_invoice_request` (dự kiến ADR-0004) | **không** chạm `bil_accounting_entry` |
| `order.service.manual` **(mới)** | any·any·any·none·none·any·none·none·none | `order_service`/`order_item` **loại nhập tay** — thêm mới, sửa tên/giá | luôn AND `!holdsPartner` và công tắc BẬT; phạm vi đơn do `order.create`/`order.modify` |
| `order.create` (có) | any·none·any·none·any·any·any·none·none | `order_service`/`order_item` **cả hai loại** | loại nhập tay chỉ khi `duocNhapTay` |
| `order.modify` (có) | ownOrAssigned·none·any·none·own·any·own·none·none | như trên (đơn nháp) | như trên |
| `order.money.edit` (có; route hẹp FIELD) | own·any·any·assigned·none·any·none·none·none | dòng điều chỉnh, **không** ghi `order_item` | route hẹp từ chối dịch vụ thừa; route C2 tương lai phải qua `priceGuard` |
| `settings.ops` (có) | none·none·none·none·none·any·none·none·none | `ord_manual_service_policy` | chỉ Toàn quyền đổi công tắc |
| Luật R2/R3 (`holdsPartner`, không phải ô) | mọi tài khoản có PARTNER | `order_item` mọi loại | không đổi; lớp chặn thứ hai cho nhập tay |

Không có ô nào mới cho INTERN, FIELD, DRIVER, DRIVER_PARTNER. Không mã quyền mới ⇒ không đụng `EXTERNAL_PERMISSIONS`, LC-1, bài "tập con quyền".

## 3. Cổng nào canh cửa nào

| Cửa | Cổng router | Thân route hỏi | Lớp CSDL |
|---|---|---|---|
| `GET /api/van-chuyen/xe-cua-don/:orderId` (D1) | `office` (SALES, ACCOUNTING, ADMIN, SUPER_ADMIN — `permissions.ts:206`) | `can(trip.view)` + `can(order.view)` không ngữ cảnh | — (chỉ đọc) |
| `POST /api/orders/:id/nhap-ke-toan` (D2) | `office` | `can(accounting.entry.mark)`; đơn `confirmed` khi đánh dấu; `truocDo` | `CHECK` + trigger chỉ-thêm |
| `GET /api/orders/:id/nhap-ke-toan` (D2) | `orders` | `can(order.view, {ownerId, assigned})` + Q-2 | — |
| `GET /api/orders?nhapKeToan=` (D2) | `orders` | phạm vi xem như hôm nay; tập id do hàm tiêm của `billing` | — |
| `POST /api/orders`, `PUT /api/orders/:id` (D3) | `orders` | `can(order.create/modify)` + `priceGuard` → `duocNhapTay` (Đối tác trước) → R2/R3 | không (lệch 5.1 thu hẹp, lớp bù `R-ORD-NT1`) |
| `POST /api/orders/:id/status` xác nhận (D3) | `orders` | R2/R3 cho Đối tác (không đổi) | trigger trạng thái có sẵn |
| `GET/POST /api/orders/cai-dat/nhap-tay` (D3) | `orders` / `admin` | đọc: không cần ô; ghi: `can(settings.ops)` | trigger chỉ-thêm |

---

# Thứ tự thi công gợi ý (không phải lời duyệt)
1. **D1** — độc lập, không migration; làm được ngay sau khi duyệt (không đụng `orders`, không tranh sổ tiền).
2. **D3** — một migration; có thể trước sổ tiền nếu số migration không tranh (kiểm lúc đặt số). Ca sổ vàng dòng nhập tay ghép vào sổ tiền khi sổ tiền thi công.
3. **D2** — **sau** sổ tiền lượt 1 gộp `main`.
- Việc lớn (dữ liệu + quyền) ⇒ mỗi ADR có người kiểm độc lập chỉ-đọc sau thi công (CLAUDE.md §3).

---

# Câu chờ chủ (chỉ điểm nguyên tắc chưa chốt)

**Q-1. Kế toán và "Dịch vụ nhập tay".** Chủ đã chọn Kế toán được dùng nhập tay, nhưng hôm nay Kế toán **không lập, không sửa đơn** — nên dù có quyền, Kế toán chưa có chỗ để thêm dịch vụ nhập tay.
- **(a) Giữ quyền sẵn cho Kế toán, chưa mở lập/sửa đơn** (Khuyến nghị): Kế toán dùng được khi có việc "sửa số lượng thực tế đơn đã xác nhận" (câu C2, làm sau sổ tiền). Được: không nở quyền; mất: hôm nay Kế toán chưa dùng được.
- (b) Mở cho Kế toán lập và sửa đơn nháp. Được: dùng ngay; mất: thêm một vai lập đơn, cần duyệt quyền riêng (chạm bản đồ quyền, ngoài lượt này).
- (c) Bỏ Kế toán khỏi quyền nhập tay. Được: gọn; mất: trái lời chủ lượt 3.

**Q-2. Đối tác có thấy dấu "đã nhập phần mềm kế toán" + số hoá đơn trên đơn của họ không?** Chủ nói "người khác chỉ xem", chưa rõ gồm cả tài khoản bên ngoài.
- **(a) Không — chỉ người trong công ty xem được đơn mới thấy** (Khuyến nghị): đây là việc nội bộ Kế toán; Đối tác không cần biết số chứng từ trong phần mềm kế toán của Tour Đảo. Mất: Đối tác không tự tra được số hoá đơn (hỏi văn phòng).
- (b) Có — ai xem được đơn đều thấy, kể cả Đối tác. Được: Đối tác tự tra; mất: lộ thông tin kế toán nội bộ ra ngoài công ty.
