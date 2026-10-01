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
`POST /legs` `:751`, `PUT /legs/:legId` `:776`; `service.ts` `planAddLeg` `:127`, `planEditLeg` `:155`; `chang-dua-don.ts` `ChangHopLe` `:62`, `kiemChang` `:112`,
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
- **Q-C = chấp nhận:** `CHECK` một cột + trigger; ghi `docs/SYSTEM-DESIGN.md` §16.
- **Q-A:** làm `pax_override` (chiều về) đợt này; `ride_pax` (Task 8) KHÔNG làm.
- `GET /api/van-chuyen/mau-chang` ở cổng `orders`: router không giới hạn cổng `orders` theo đường dẫn (tiền lệ `/api/catalog/for-order`, `/api/dispatch/handlers`)
  ⇒ chỉ thêm dòng SNAPSHOT, không nới hàng rào.
