# Nhật ký thi công — máy chủ ô mới của chặng (`flight_code`, `pax_override`, mẫu chặng, nơi trả mặc định)

> Kế hoạch: `docs/superpowers/plans/2026-10-01-may-chu-o-moi-chang-ke-hoach.md` (Task 0 → Task 7). Vai: **người thi công** (P15) — không tự nghiệm thu (N8);
> người kiểm độc lập chỉ-đọc làm ở phiên khác. Lời chủ đã chốt: `docs/superpowers/specs/2026-10-01-uu-tien-xe-chay-quyet-dinh.md` (U2 + hộp chọn lượt 2 Q-A..Q-D).
> Nhánh: `worktree-agent-ac140680b0b1947b2` (đã gộp `worktree-doi-chieu-phieu-giam-doc` @5af1d778 — không xung đột).

## Task 0 — đo lại, chốt số (2026-10-01)

### 0.1 Nơi gọi câu chèn / sửa chặng (đo lại trên nhánh này)

| Nơi gọi | Câu | Ghi hai ô mới thế nào |
|---|---|---|
| `repository.ts:createOrder` (`legInsert`) | `leg_insert` | giá trị đã giải (Task 3.3: thân có khoá → dùng; vắng → `NULL`) |
| `repository.ts:updateDraftOrder` (`legInsertGuarded`, lưu nháp xoá–chèn lại) | `leg_insert_guarded` | giá trị đã giải (khoá vắng → chép giá trị đang lưu của chặng CÙNG id) |
| `repository.ts:updateTrip` op `update` (`legUpdateGuarded`, `PUT /trip`) | `leg_update_guarded` | cờ "giữ" = 0 cho cả hai ô và dấu đặt gấp theo luật cũ (không đụng ô phụ) |
| `repository.ts:updateTrip` op `insert` (`legInsertGuarded`) | `leg_insert_guarded` | `NULL` (chặng mới) |
| `repository.ts:addLeg` (`legInsertGuarded`, `POST /legs`) | `leg_insert_guarded` | giá trị từ thân (`NULL` khi vắng) |
| `repository.ts:changeLeg` update (`legUpdateChecked`, `PUT /legs/:legId`) | `leg_update_checked` | cờ "giữ" = 1 + giá trị khi thân CÓ khoá; vắng → cờ 0 (giữ) |
| `repository.ts:changeLeg` close (`legCloseChecked`) | `leg_close_checked` | không đụng |
| Nhánh nháp mới của `PUT /legs/:legId` | câu đầu lô MỚI `leg_pax_override_checked` | chỉ `pax_override` |

Các mốc khác (đo lại): `ChangChoChuyen` `index.ts:177`, `hanhKhachChoChuyen` `:201`, `lichChungChang` `:276`, `PUT /api/orders/:id` `:660` (`legMeta` `:689`),
`POST /legs` `:751`, `PUT /legs/:legId` `:776`; `service.ts` `planAddLeg` `:122`, `planEditLeg` `:150`; `chang-dua-don.ts` `ChangHopLe` `:62`, `kiemChang` `:112`,
`moTaChang` `:266`; `chang-hanh-khach-repo.ts` `LEG_SET` `:170`, `LEG_SET_DAT_GAP` `:175`, `leg_update_checked` `:186-191`; `tai-xe-dto.ts:cuocChiTietDto` `:43-99`;
`dieu-phoi-dto.ts:suatChuyenDto` `:133-147`.

### 0.2 Số migration — RULING

- Lệnh của kế hoạch `git log --branches --diff-filter=A --name-only --format= -- migrations/` **KHÔNG** liệt kê `0056_gop_ho_so.sql` (tệp vào qua commit GỘP
  908e3722 — `git log` mặc định không hiện tệp của commit gộp). Phải dùng `git log --all -m --name-only --format= -- migrations/` mới thấy. **Lệch** so với
  lệnh của kế hoạch — ghi để người sau dùng `-m`.
- Kết quả `git log --all -m …| grep "005[6-9]\|006"`: chỉ `0056_gop_ho_so.sql`. ⇒ **0057** (`0057_chang_so_nguoi_chuyen_bay.sql`), **0058** (`0058_mau_chang.sql`).
- **Không có 0059:** `0058` chưa lên `main` ⇒ theo đúng Task 7.2 của kế hoạch, cột `default_dropoff_location_id` vào **cùng** `CREATE TABLE vc_leg_template`
  với `CHECK` bảng (không trigger). Số thật chốt lúc gộp (bài migration tìm tệp theo đuôi tên).

### 0.3 Nơi tính "số người của chặng" hôm nay

- `src/modules/orders/index.ts:226` (`hanhKhachChoChuyen`) và `:302` (`lichChungChang`): cộng tay `p.adult + p.child + p.senior + p.infant`.
- `scripts/audit-checks.mjs:37-42` (`soKhachHieuLuc`, SQL) — dùng ở R-VC-3 (L-D1) và R-VC-7: so số suất với số khách DỊCH VỤ cho mọi chặng.
- `van-chuyen` KHÔNG tự đọc số khách (grep `soKhachHieuLuc|effectivePax` trong `src/modules/van-chuyen`, `src/index.ts` = 0): `soNguoi` của
  `kiemXuatBen` / L-D1 (`VUOT_SO_NGUOI_CHANG`, `dieu-phoi-kiem.ts:212`) / `trangThaiChang` đều đến từ `ChangLichChung.soNguoi` qua `changVao`
  (`dieu-phoi-doc.ts:90`). ⇒ đổi hai chỗ ở `index.ts` là đủ phía TS; phía SQL kiểm định kỳ thêm một đoạn `soNguoiChangSql` (Task 5).

### 0.4 Bẫy mốc — XÁC NHẬN

`duoiMocKhiSua` (`dat-gap.ts:61`) trả `xet(cu) || xet(moi)` ⇒ chặng đã dưới mốc mà chỉ đổi số hiệu / số người vẫn bị đòi `datGap` nếu đi đường cũ. Task 3.4
thêm `chiDoiOPhu` để không gọi `xetDatGapSua` khi chỉ đổi ô phụ (trừ khi thân có `datGap`).

### 0.5 `logicalRefs` cho `vc_leg_template.code` — RULING (a)

Không khai `logicalRefs` (bài đòi `viaView`, `catalog` chưa có view công bố cho mã dịch vụ); chỉ ghi `note` ở bảng trong `docs/data-dictionary.json`.

### 0.6 ADR-0062 Phần B

Chưa lên nhánh này (`grep -rln "ADR-0062" src` = 0). Không nơi nào ngoài `orders` phân tích `detail` của `order_leg_updated` (chỉ nhãn ở `audit-actions.ts:27`).
Không thêm loại tin mới.

### 0.7 Câu đầu lô `leg_update_checked`

Còn lọc `status = 'confirmed'`; lô `changeLeg` đẩy mốc đơn (`orderTouchGuarded`). ⇒ Task 3.5 cần câu đầu lô MỚI `leg_pax_override_checked`; TC-P5 tải lại trước khi lưu.

### Ruling khác của Task 0

- **Task 7 MỞ** (không còn "CHỜ"): chủ chọn Q-D = A ở hộp chọn lượt 2 (`2026-10-01-uu-tien-xe-chay-quyet-dinh.md`) = duyệt bản nháp
  `docs/superpowers/specs/2026-10-01-de-xuat-adr-noi-tra-mac-dinh.md`. Không chép vào `docs/adr/` (số dự kiến từ 0073, chốt lúc gộp); chú thích mã trỏ tệp nháp.
- **Q-B = giữ** (chủ): chỉ đổi ô phụ trên chặng đã đặt gấp → giữ dấu; thân có `datGap` → cờ giữ = 0 (ghi dấu mới); `/trip` luôn 0.
- **Q-C KHÔNG CÒN CẦN (ruling Task 1, 2026-10-01):** thi công ĐÚNG CHỮ ADR-0054 D10.3 — MỘT `CHECK (pax_override IS NULL OR (pax_override >= 1 AND direction = 'RETURN'))`
  thêm bằng `ALTER TABLE … ADD COLUMN`. Tiền đề của kế hoạch Task 1.2 và CHANGE-GUIDE z bước 4 ("CHECK nhiều cột không thêm được bằng ALTER") là SAI:
  - tiền lệ `0040` (`short_notice_lead_minutes` CHECK tham chiếu bốn cột khác, đã áp production);
  - node:sqlite: `ALTER TABLE t ADD COLUMN p INTEGER CHECK (p IS NULL OR (p >= 1 AND direction = 'RETURN'))` rồi `UPDATE` dòng OUT → `CHECK constraint failed`;
  - D1 local (`wrangler d1 execute --local`, bảng thử `zz_thu`, đã xoá): cùng câu → `SQLITE_CONSTRAINT_CHECK`; `npm run db:migrate:local` áp 0057 ✅.
  - Chủ chỉ CHO PHÉP lệch (Q-C) vì tưởng bắt buộc; ADR đã duyệt thi công được nguyên chữ ⇒ không lệch, **không ghi §16**, sổ hàng rào chỉ MỘT lớp `CHECK`.
  - **Lệch so với lời giao của điều phối** ("CHECK một cột + trigger, ghi §16") và so với kế hoạch TC-P1 / Task 1.2 ("trigger") — có chủ ý, ghi ở đây và báo cáo.
  - CHANGE-GUIDE z bước 4 (tài liệu mô tả) đã sửa câu sai. Bản nháp ADR nơi trả D1 nhánh "nếu ALTER → trigger" mang cùng tiền đề sai — không ảnh hưởng (Task 7 đi
    nhánh `CREATE TABLE`); KHÔNG sửa bản nháp đã duyệt, chỉ ghi ở đây để người chép sang `docs/adr/` bỏ nhánh đó.
- **Q-A:** làm `pax_override` (chiều về) đợt này; `ride_pax` (Task 8) KHÔNG làm.
- `GET /api/van-chuyen/mau-chang` ở cổng `orders`: router không giới hạn cổng `orders` theo đường dẫn (tiền lệ `/api/catalog/for-order`, `/api/dispatch/handlers`)
  ⇒ chỉ thêm dòng SNAPSHOT, không nới hàng rào.

## Task 1 — migration `0057_chang_so_nguoi_chuyen_bay.sql` (2026-10-01)

- Đỏ trước: `node --test src/migrations-chang-o-moi.test.ts` → 4 fail (chưa có tệp / cột).
- Xanh: hai `ALTER TABLE ord_transfer_leg ADD COLUMN` (nguyên chữ CHECK của ADR-0055 C1 và ADR-0054 D10.3). `npm run db:migrate:local` ✅ (0057 áp).
  `node --test src/migrations-chang-o-moi.test.ts` 3/3; `src/migrations-chang-dua-don.test.ts src/architecture.test.ts src/migrations-n1.test.ts` 73/73.
- **Thấy chặn thật (2026-10-01):** đổi cố ý `direction = 'RETURN'` → `'OUT'` trong CHECK → bài TC-P1 đỏ (2/3) → hoàn nguyên; bỏ cố ý vế
  `flight_code = upper(flight_code)` → TC-F1 đỏ (2/3) → hoàn nguyên; chạy lại 3/3, `cmp` khớp bản gốc.

## Task 2 — luật thuần (2026-10-01)

- Đỏ trước: `node --test src/shared/chang-dua-don.test.ts src/shared/so-nguoi-chang.test.ts` → 2 tệp lỗi nạp (chưa có hàm).
- Xanh: `chuanHoaSoHieuChuyenBay` + `KHUON_SO_HIEU_CHUYEN_BAY`, `kiemChang` đọc hai ô phụ CHỈ khi khoá có mặt (vắng → không có khoá trong kết quả), `chiDoiOPhu`,
  `moTaChang` thêm "số hiệu chuyến bay A → B" / "số người chiều về A → B" (trống = "theo số khách dịch vụ"), thêm chặng kèm hai ô khi có; `toGhi` (thân cũ)
  chép hai ô của chặng đang lưu. Tệp mới `src/shared/so-nguoi-chang.ts`: `soNguoiChang` (+ móc `them.soKhachDiXe` bị bỏ qua, có bài ghim) và `tongKhach`
  (chỗ cộng bốn loại tuổi DUY NHẤT cho số người chặng). `ChangDaLuu` khai hai ô BẮT BUỘC (đọc cột) ⇒ `toStoredLeg` thiếu thì typecheck đỏ (đã thấy đỏ 1 lỗi rồi sửa).
  `LegInput` thêm `flightCode?`, `paxOverride?`; câu đọc chặng (`LEG_COLS`) thêm hai cột.
- Kết quả: 26/26 bài thuần; `src/modules/orders/*.test.ts` + thuần 317/317; typecheck 0 lỗi.
- **Ruling (bề mặt):** TC-P2 ghi "số người chiều về 4 → 2" — bài viết từ số 4 tường minh; trống thì nhãn "theo số khách dịch vụ" (Task 2.2). Thêm chặng kèm CẢ số người
  chiều về khi có (kế hoạch chỉ nêu số hiệu) — giá trị số, không dữ liệu cá nhân.

## Task 3 — đường ghi (2026-10-01)

- Đỏ trước: `src/modules/orders/o-moi-chang.test.ts` (17 bài: TC-F3 nháp/sau xác nhận, F4 thân mới + thân CŨ, F5 + Q-B, F6, F8, P2, P3, P4 (a)–(e), P5, P6, P7,
  P10, ca "đổi chiều cùng id", ca "số hiệu + dấu đặt gấp chép cùng chặng") → 16 đỏ, 1 xanh sẵn (TC-P6: chặng mới vốn NULL — bài canh hồi quy, ghi rõ).
- Xanh (17/17). Thay đổi:
  - **SQL (`chang-hanh-khach-repo.ts`) — không câu GÁC mới:** `LEG_INSERT_COLS` + `flight_code, pax_override` (?15, ?16); `leg_insert_guarded` đánh số lại
    (?17 = id nhật ký, ?18–?22 = đặt gấp — bẫy vị trí tham số, có bài vòng tròn "số hiệu + dấu chép"); đoạn SET RIÊNG `LEG_SET_O_PHU` (cờ ghi ?17/?19) gắn vào
    hai câu `leg_update_guarded` / `leg_update_checked` có sẵn; `LEG_SET_DAT_GAP` thêm cờ GIỮ ?21 (Q-B). `legUpdateGuarded` (`PUT /trip`) luôn cờ 0. Câu ĐẦU LÔ
    mới duy nhất `leg_pax_override_checked` (không đọc `audit_log`, không vào `DOC_AUDIT_LOG_WONGUARD`; `architecture.test.ts` xanh không cần khai gì).
  - **Lưu nháp / lập (`service-rules.ts:giaiOPhuNhap`, `index.ts:oPhuNhap`):** khoá vắng → chép giá trị đang lưu của chặng cùng id; số người chiều về ĐỔI (kể
    cả null để xoá, kể cả chặng mới có số) → hỏi `order.trip.edit` (403 "Chỉ văn phòng đổi được số người chiều về."); L-R1 chỉ cho giá trị mới / đổi, so số
    khách dịch vụ TRONG THÂN.
  - **Sau xác nhận (`service.ts`):** `planAddLeg` L-R1; `planEditLeg` trả `oPhu` (chỉ khoá có), `chiOPhu`, L-R1 khi mới/đổi (số khách HIỆU LỰC qua
    `effectivePax`), `detail` có số hiệu / số người. Route: `chiOPhu && !datGap` → không hỏi mốc, cờ giữ dấu = 1; có `datGap` → nhánh cũ ghi dấu mới.
  - **Nhánh nháp `PUT /legs/:legId`:** thân chỉ `paxOverride` (+ `expectedUpdatedAt` của CHẶNG) → `planPaxOverrideNhap` → `changeLeg` kind `paxNhap`; khoá khác →
    409 `use_order_form`; chiều đi → 400; L-R1 → 400; mốc cũ → 409 `stale`. Thứ tự: 404 → 403 → Đã giao → (nháp: kiểm thân) → huỷ → 400.
  - **`PUT /trip`:** thân (gốc hoặc từng dịch vụ) có `flightCode` / `paxOverride` → 400 "sửa ở từng chặng" (`validateTripUpdate`).
  - Route `PUT /legs/:legId` tách hai hàm `lenhSoNguoiVeNhap` / `lenhSuaChang` để giữ ĐÚNG MỘT lời gọi `baoThayDoi` (bài khoá văn bản
    `src/hanh-khach-khong-lo-ten.test.ts` đỏ khi để hai lời gọi — đã thấy, đã sửa).
- **Thấy chặn thật (2026-10-01), mỗi lần hoàn nguyên bằng bản sao rồi chạy lại 17/17:**
  - cờ ghi ô phụ của `legUpdateGuarded` = 1 với NULL → TC-F8 đỏ;
  - bỏ dòng 403 trong `oPhuNhap` → TC-P4 (c) đỏ;
  - bỏ nhánh chép trong `giaiOPhuNhap` → TC-F4, bài vòng tròn, TC-P4 (c)(d), TC-P5, TC-P10 đỏ (thân CŨ vẫn xanh — đi `tronChangCu`, có bài riêng ở Task 2);
  - cờ giữ dấu luôn 0 → TC-F5, TC-P7 đỏ.
- `node --test src/modules/orders/*.test.ts src/*.test.ts` → 958/958; typecheck 0.
- **Ruling (dữ liệu, có bài):** lưu nháp gửi CÙNG id chặng về đang có số người nhưng chiều ĐI (không khoá) → số người NULL, không 403 (chặng về coi như bỏ — ADR-0054
  D10.3 "bỏ rồi thêm lại → mất"; Đối tác vốn bỏ được chặng). Nếu chép sẽ vỡ CHECK (500).
- **Ruling (bề mặt):** câu 400 của `PUT /trip` khi có ô phụ: "Số hiệu chuyến bay và số người chiều về sửa ở từng chặng đưa đón, không sửa ở đây."

## Task 4 — đường đọc (2026-10-01)

- Đỏ trước: sửa bài liệt kê khoá TRƯỚC — `lich-chung-chang.test.ts` (+ `soHieuChuyenBay`), `tai-xe-dto.test.ts` `KHOA_SUAT` (+ `soHieuChuyenBay`); bài mới TC-F7
  (DTO tài xế ngoài ngày chạy có số hiệu, không tên; chi tiết chuyến văn phòng có số hiệu), TC-F7 phần đơn (`LegDto.flightCode/paxOverride` cho Đối tác đơn mình;
  biên nhận `GET /receipt` không có số hiệu), TC-P8 (lichChungChang / hanhKhachChoChuyen số người về = 2, cột vượt số khách → kẹp lúc đọc, cột giữ nguyên).
  → 7 + 1 đỏ.
- Xanh: `LegDto` + 2 khoá; `ChangLichChung.soHieuChuyenBay`; `soNguoi` của `lichChungChang` và `hanhKhachChoChuyen` = `soNguoiChang(…, tongKhach(p))` (bỏ hai
  chỗ cộng tay); `ChangChoChuyen` KHÔNG thêm số hiệu (giữ hẹp); `SuatChuyenDto.soHieuChuyenBay` (văn phòng) lấy từ `changLich`; DTO tài xế chọn thêm khoá này
  NGOÀI nhánh `trongNgay`. Biên nhận: `ReceiptServiceDto` không có chặng ⇒ không đổi (bài ghim qua route).
- Bài tích hợp mới `src/modules/van-chuyen/so-nguoi-chang-ve.test.ts` (TC-P8 phía xe): chặng về 2 người của dịch vụ 4 khách — xếp 3 suất → 409
  `vuot_so_nguoi_chang` (L-D1); xếp 2 → 200; 2/4 khách có tên → xuất bến 200 (L-B1 không giữ thiếu tên).
- **Thấy chặn thật (2026-10-01):** bỏ cố ý nhánh `RETURN` của `soNguoiChang` → bài lich-chung TC-P8 và bài tích hợp đỏ → hoàn nguyên → xanh.
- `node --test src/modules/orders/*.test.ts src/modules/van-chuyen/*.test.ts src/hanh-khach-khong-lo-ten.test.ts src/orders-cong-bo.test.ts src/dieu-phoi-ca-mau.test.ts
  src/architecture.test.ts src/shared/*.test.ts` → 1263/1263 (bộ ca mẫu `golden/dieu-phoi/` KHÔNG đổi đáp án). Typecheck 0.
- **Ruling T1 (kế hoạch 4.2):** số hiệu gắn vào SUẤT (`suat[]`, theo `legId`), không vào điểm dừng (`diem[]`) — một điểm dừng gom suất của nhiều chặng.
- **Ruling 4.3:** `src/giay-to-khong-lo-so.test.ts` không cần ca mới (số hiệu không phải giấy tờ); hàng rào thật là các bài liệt kê khoá ở trên.
- `DRIVER_PARTNER`: không mở sớm (DTO dùng chung route của DRIVER; ADR-0053 lượt 3 chưa mở — không đổi gì ở cổng).
