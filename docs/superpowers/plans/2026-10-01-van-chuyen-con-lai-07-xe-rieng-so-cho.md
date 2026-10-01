# Vận chuyển Đợt 7 — Cam kết xe riêng / số chỗ tối thiểu trên chặng (ADR-0056 VK3-A): Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chặng đưa đón mang hai cam kết với khách ("xe riêng", "xe tối thiểu N chỗ"); điều phối bị chặn khi xếp / đổi xe sai cam kết, cổng xuất bến giữ chuyến sai, Quản trị / Toàn quyền phá lệ được kèm lý do.

**Architecture:**
- Hai cột cam kết nằm trên `ord_transfer_leg`, thuộc module `orders`. Chúng đi theo đúng khuôn "ô phụ" đã có của `flightCode` / `paxOverride`: khoá vắng thì giữ giá trị cũ, không xét mốc 6 giờ, và đường "Sửa thông tin chuyến" từ chối hai khoá này.
- Vận chuyển đọc cam kết qua hai hàm hẹp `lichChungChang` và `hanhKhachChoChuyen`. Không có view mới, và `v_ord_leg_key` giữ nguyên.
- Luật nằm ở một hàm thuần `kiemCamKet` trong `src/shared/`, được `kiemXep`, `kiemTaoSuaChuyen` và `kiemXuatBen` gọi.
- Phá lệ ghi vào hai cột mới của `vc_trip`, thuộc `van-chuyen`. Luật này không có trigger: đây là luật cấu hình, lớp giữ là máy chủ cộng một câu kiểm định kỳ mức `warn`.

**Tech Stack:** Cloudflare Worker + D1, TypeScript, `node --test`, e2e `tests/e2e/*.mjs`, giao diện thuần `web/*.ts` (`h()`).

**Spec:** `docs/adr/ADR-0056-van-chuyen-kernel-luot-3.md` (VK3-A, "Câu ADR bị thay", "Hệ quả", "Tiêu chí nghiệm thu", "Hệ quả của ADR-0057"). Kế hoạch mẹ: `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md` (L1–L3). Khuôn ô phụ: `docs/superpowers/plans/2026-10-01-may-chu-o-moi-chang-ke-hoach.md`.

**Mức chi tiết (L3):** chỉ tới **giao diện** — chữ ký, cột, route, mã lỗi, test bắt buộc. Người thi công **đo lại mã thật lúc nhận việc** (Task 0), vì Đợt 1–6 sẽ đổi các tệp này (nhất là Đợt 4 thêm `THIEU_GIA` và cột `rented`/`route_code` trên `vc_trip`).

**Ngoài phạm vi:**
- VK3-B (một dòng giấy tờ hiện hành) thuộc Đợt 1, nên hàng rào 4 và 5 của ADR không ở đây.
- Mẫu chặng (`vc_leg_template`, `migrations/0059`) **không** mang cam kết. ADR chỉ nhắc mẫu chặng trong "Phương án bị loại" ("để làm mặc định khi có mẫu chặng theo dịch vụ"), không quyết định gì. Chặng tạo từ mẫu luôn mặc định "không cam kết".
- DTO tài xế: ADR ghi "không cần".
- Tiền: ADR ghi hai ô này "không mang tiền".

## Tự chốt khi lập kế hoạch (bề mặt hoặc theo L1/L2 — không hỏi chủ)

| # | Điều | Chốt |
|---|---|---|
| C1 | Số migration | `<NNNN>_cam_ket_chang.sql`. Tính theo L2: lấy số lớn nhất trong `migrations/` của `main` **và** mọi nhánh chưa gộp, cộng 1. Phải sau các số của ADR-0057 (Đợt 4). |
| C2 | Mã kiểm định kỳ | `R-VC-<NN>`: số kế tiếp sau mã R-VC lớn nhất trong `scripts/audit-checks.mjs` (hôm nay là `R-VC-20`), đo lại lúc thi công. Chú thích ghi rõ "mã do điều phối cấp". |
| C3 | Tên khoá API | Chặng gửi lên và chặng trả về dùng `exclusiveVehicle: boolean` và `minVehicleSeats: number \| null`, cùng kiểu đặt tên với `flightCode` / `paxOverride`. Hàm hẹp của `orders` và `ChangVao` dùng `xeRieng: boolean` và `choToiThieu: number \| null`, theo ADR A4. |
| C4 | Dạng khoá phá lệ (ADR: "băm hay chuỗi — kế hoạch chốt") | **Chuỗi nối, không băm**: chỉ gồm id và con số, không tên, không tiền. Để nguyên chuỗi thì người kiểm và câu kiểm định kỳ đọc được. Khoá này **không bao giờ** vào DTO hay nhật ký. |
| C5 | Thành phần khoá (để tiêu chí 3b đúng) | `xe:<xeId>` + với **mỗi** dòng vi phạm `<legId>:<XR\|CX>:<0\|1>:<choToiThieu\|->`, sắp xếp rồi nối bằng `\|`. Một chặng xe riêng có khách đơn khác cùng chuyến thì sinh **một dòng XR cho chặng xe riêng VÀ một dòng XR cho mỗi chặng của đơn khác** trên chuyến. Vì vậy xếp thêm đơn thứ ba làm khoá đổi. Một dòng CX ứng với mỗi chặng có `choToiThieu > soCho` của xe. |
| C6 | Một lệnh cần hai phá lệ (ví dụ mốc 6 giờ và cam kết) | `vc_trip_event` chỉ có **một** ô `override_rule_code`, và `request_id` là UNIQUE. Thứ tự ưu tiên ghi lên sự kiện là `MOC_TOI_THIEU` > `KHOANG_NGHI` > `CAM_KET`, giữ hành vi cũ. Cam kết luôn có dấu ở cột `vc_trip.commitment_override_reason_code`. Dòng nhật ký (audit `detail`) nối `phaLeNhatKy` cho **từng** phá lệ. Đổi được (hai chiều). |
| C7 | Lệnh chỉ làm GIẢM khách trên chuyến: rút, dời đi (chuyến nguồn), cập nhật khách theo đơn, cập nhật điểm theo đơn | **Không bao giờ** bị `CAM_KET` chặn. Nếu kiểm thấy hết vi phạm thì xoá hai cột trong cùng lô, có nhật ký. Nếu còn vi phạm mà khoá khác khoá đã lưu thì giữ cột cũ, và cổng xuất bến sẽ giữ chuyến (ADR: "khớp tuyệt đối"). |
| C8 | `camKetPhaLe` gửi lên khi chuyến **không** vi phạm | Bỏ qua, không ghi cột, các thay đổi khác của lệnh vẫn chạy. Đây là khuôn `nghiPhaLe`. |
| C9 | Mã 409 mới | `can_pha_le_cam_ket` với câu "Chuyến trái cam kết xe riêng / số chỗ của khách — cần Quản trị phá lệ kèm lý do.", kèm `canQuyen`. Lời của từng lý do giữ `CAM_KET` (`MA_GIU`): "Trái cam kết xe riêng / số chỗ tối thiểu", ai xử lý là `QUAN_TRI` (hoặc giá trị tương đương có sẵn trong `AI_XU_LY`, đo lúc thi công). |
| C10 | Khi nào dựng giao diện | Máy chủ phát hành trước và **chạy ngầm**: chưa có ô nhập thì không ai bật được cam kết, người dùng không thấy gì đổi. Ô trên form và nhãn trên bảng điều phối **chờ bản vẽ**. Nối hộp phá lệ với mã `CAM_KET` dùng hộp phá lệ có sẵn, không cần vẽ. |

## Global Constraints

Áp toàn bộ "Global Constraints" của kế hoạch mẹ, cộng thêm:
- `orders` KHÔNG import `van-chuyen`. `src/shared/` và `web/` không import `src/modules/`. Nơi gọi `lichChungChang` / `hanhKhachChoChuyen` phải đứng sau `can()` (bài `src/orders-cong-bo.test.ts`).
- Ai ghi hai cột chặng: theo ô của route chứa chặng. Nháp qua `order.modify` (`SALES` ownOrAssigned, `ADMIN`, `PARTNER` own, `SUPER_ADMIN`, `INTERN` own). Sau xác nhận qua `order.trip.edit`. **Không** thêm ô quyền mới.
- Phá lệ chỉ qua ô có sẵn `trip.override` (`ADMIN`, `SUPER_ADMIN`). Lý do lấy từ nhóm `PHA_LE`.
- Không xét mốc 6 giờ khi sửa hai cột (ADR A1).
- Chuyến đã kết thúc hoặc huỷ không sửa được cột phá lệ: trigger `vc_trip_final_frozen` có sẵn đã chặn, không viết thêm.
- Lệnh chuyến là MỘT `db.batch` theo thứ tự cổng → nhật ký → câu có dấu lệnh → trạng thái cuối. Câu ghi hoặc xoá cột phá lệ có **nhãn riêng** trong `thu-tu-lo.test.ts`.
- `ChangVao.xeRieng` và `ChangVao.choToiThieu` là trường **bắt buộc**, không có `?`. Typecheck không phủ `*.test.ts`, nên mọi bộ dựng mẫu thử phải sửa tay. `undefined` không được lặng lẽ hiểu là "không cam kết".

## Review Focus

1. **`loiKiem` lọc mất mã lạ** (`src/modules/van-chuyen/dieu-phoi-route.ts:77`, chỉ biết `MOC_TOI_THIEU`/`KHOANG_NGHI`): `CAM_KET` trong `canPhaLe` bị bỏ, lệnh chạy không cần phá lệ. Bài sở hữu ở Task 4 (xếp vào chuyến xe riêng, không gửi `camKetPhaLe` → 409 `can_pha_le_cam_ket`). Đây cũng là phép đột biến cho dòng sổ hàng rào 1.
2. **403 kiểm theo từng route** (`src/modules/van-chuyen/index.ts:873/892/931`): route nào nhận `camKetPhaLe` mà quên `can(staff, "trip.override")` thì `SALES` phá lệ được. Bài ở Task 4: mỗi route (sửa chuyến, xếp, dời) có một ca `SALES` → 403.
3. **Đơn bị sửa sau khi đã phá lệ, không có lệnh chuyến nào chạy** (bật xe riêng ở chặng khác, tăng số chỗ). Cổng xuất bến phải giữ. Màn lịch chung (`dungLichChung` dự phóng `kiemXuatBen`) phải hiện "giữ" cùng lý do. Bài ở Task 3 (luật + lịch chung) và Task 5 (cổng).
4. **Rút bớt đơn tới hết vi phạm thì hai cột về trống. Ghép lại lần nữa phải đòi phá lệ mới** (tiêu chí 3c). Bài ở Task 5.
5. **Thân cũ từ PWA chưa cập nhật** (không gửi hai khoá) khi lưu nháp hoặc sửa chặng thì máy chủ **giữ** cam kết đang lưu, không xoá. Bài ở Task 2.

---

## Task 0: Đo lại và chốt số (không mã)

**Files:** chỉ đọc. Ghi kết quả vào `docs/superpowers/plans/<ngày>-van-chuyen-dot-7-nhat-ky.md`.

- [ ] Đo dòng thật của các điểm chạm dưới đây (số dòng ghi trong kế hoạch là số đo trên `0ba370d6`):
  - `kiemXep`, `kiemTaoSuaChuyen`, `kiemXuatBen` (`src/shared/dieu-phoi-kiem.ts`), `ChangVao` / `ChuyenVao` / `MA_LUAT_PHA_LE` (`src/shared/dieu-phoi-kieu.ts`), `MA_GIU` (`src/shared/ly-do-giu.ts`);
  - `loiKiem`, `THONG_BAO_409` (`src/modules/van-chuyen/dieu-phoi-route.ts`), `phaLeCua` và năm lệnh (`dieu-phoi-lenh.ts`), `lenhXuatBen` (`dieu-phoi-tien-do.ts`), `TripRow` (`chuyen-repo.ts`), `chuyenVao` / `changVao` (`dieu-phoi-doc.ts`), thân lệnh (`dieu-phoi-than.ts`), route (`index.ts`);
  - phía orders: `ChangHopLe` / `oPhu` (`src/shared/chang-dua-don.ts`), `giaiOPhuNhap` và chặn ô phụ trong `updateTrip` (`src/modules/orders/service-rules.ts`), `planSuaChang` / `moTaVao` (`service.ts`), `LEG_SET_O_PHU` (`chang-hanh-khach-repo.ts`), `chepDatGapNhap` (`dat-gap.ts`), `lichChungChang` / `hanhKhachChoChuyen` (`index.ts`).
- [ ] Đợt 4 đã gộp chưa? Nếu đã gộp: giá trị ghim `MA_LUAT_PHA_LE` hiện có, `THIEU_GIA` nằm trong `MA_GIU`, và các cột `rented`/`route_code` của `vc_trip`.
- [ ] Chốt `<NNNN>` (C1), `R-VC-<NN>` (C2), số phiên bản. Ghi vào nhật ký.

---

## Task 1: Migration — bốn cột

**Files:**
- Create: `migrations/<NNNN>_cam_ket_chang.sql`
- Create: `src/migrations-cam-ket.test.ts` (khuôn `src/migrations-chang-o-moi.test.ts`)
- Modify: `docs/data-dictionary.json` + `npm run dict`

**Interfaces — Produces (cột):**

```sql
-- orders (ADR-0056 VK3-A A1)
ALTER TABLE ord_transfer_leg ADD COLUMN exclusive_vehicle INTEGER NOT NULL DEFAULT 0 CHECK (exclusive_vehicle IN (0, 1));
ALTER TABLE ord_transfer_leg ADD COLUMN min_vehicle_seats INTEGER CHECK (min_vehicle_seats IS NULL OR min_vehicle_seats BETWEEN 1 AND 100);
-- van-chuyen (A3)
ALTER TABLE vc_trip ADD COLUMN commitment_override_reason_code TEXT REFERENCES vc_reason(code);
ALTER TABLE vc_trip ADD COLUMN commitment_override_key TEXT
  CHECK ((commitment_override_key IS NULL) = (commitment_override_reason_code IS NULL)
         AND (commitment_override_key IS NULL OR length(commitment_override_key) BETWEEN 3 AND 4000));
```

Nếu D1 / SQLite từ chối CHECK nhắc cột khác trong `ADD COLUMN`, thay bằng hai trigger `BEFORE INSERT/UPDATE ON vc_trip` có cùng điều kiện, và ghi lại trong nhật ký.

- [ ] **Bài đỏ trước** (`src/migrations-cam-ket.test.ts`, chạy migration trên SQLite trong bộ nhớ như bài khuôn):
  1. chặng cũ sau migration có `exclusive_vehicle = 0` và `min_vehicle_seats IS NULL`;
  2. `exclusive_vehicle = 2` bị từ chối; `min_vehicle_seats` bằng 0 hoặc 101 bị từ chối, bằng 1 hoặc 100 thì qua;
  3. `vc_trip` có khoá mà không có lý do (hoặc ngược lại) bị từ chối; có cả hai thì qua;
  4. chuyến đã `ENDED` sửa `commitment_override_key` thì gặp `lc06_final` (trigger có sẵn, bài chỉ ghim).
- [ ] Chạy: `node --test src/migrations-cam-ket.test.ts` cho kết quả **FAIL** (chưa có tệp).
- [ ] Viết migration. Chạy lại cho **PASS**. Chạy `npm run db:migrate:local`.
- [ ] Thêm bốn cột vào `docs/data-dictionary.json`: nghĩa, "không kể tài xế", ai ghi, "khoá chỉ để so, không hiển thị". Chạy `npm run dict`.
- [ ] Commit: `Migration cam kết xe riêng / số chỗ trên chặng và cột phá lệ cam kết của chuyến (ADR-0056 VK3-A)`.

---

## Task 2: Orders — đường ghi và đường đọc (hàm hẹp) của hai ô cam kết

Task này chỉ chạm module `orders` và `src/shared/` (chặng), không chạm `van-chuyen`.

**Files:**
- Modify: `src/shared/contracts.ts` (`LegInput`, `LegDto`), `src/shared/chang-dua-don.ts` (`ChangHopLe`, `ChangDaLuu`, `oPhu`, `chiDoiOPhu` nếu cần), `src/modules/orders/service-rules.ts` (`giaiOPhuNhap`, chặn ô phụ trong `updateTrip`), `src/modules/orders/service.ts` (`planSuaChang`, `moTaVao`, `moTaChang`), `src/modules/orders/chang-hanh-khach-repo.ts` (SELECT, INSERT, `LEG_SET_O_PHU`), `src/modules/orders/repository.ts` (đọc / chèn chặng), `src/modules/orders/index.ts` (nhánh nháp `lenhSoNguoiVeNhap` **không** đổi; `ChangLichChung`, `ChangChoChuyen`, `lichChungChang`, `hanhKhachChoChuyen` thêm hai khoá), `chang-hanh-khach-repo.ts` (`legLichChungRows`, `legTripRows` SELECT thêm hai cột)
- Test: `src/modules/orders/o-moi-chang.test.ts` (mở rộng) hoặc tệp mới `src/modules/orders/cam-ket-chang.test.ts`; `src/shared/chang-dua-don.test.ts`; `src/modules/orders/lich-chung-chang.test.ts`, `src/modules/orders/ham-cong-bo.test.ts` (bài liệt kê khoá)

**Interfaces — Produces:**

```ts
// contracts.ts
interface LegInput { /* … */
  /** Xe riêng (ADR-0056 VK3-A). VẮNG khoá = GIỮ giá trị đang lưu; chặng mới vắng = false. Không xét mốc 6 giờ. */
  exclusiveVehicle?: boolean;
  /** Số chỗ tối thiểu KHÔNG kể tài xế, 1..100; null hoặc "" = bỏ. VẮNG khoá = GIỮ. */
  minVehicleSeats?: number | null;
}
interface LegDto { /* … */ exclusiveVehicle: boolean; minVehicleSeats: number | null }
// chang-dua-don.ts
interface ChangHopLe { /* … */ exclusiveVehicle?: boolean; minVehicleSeats?: number | null }
export function docChoToiThieu(raw: unknown, at: string): { ok: true; value: number | null } | { ok: false; message: string };
// orders/index.ts — thêm ĐÚNG hai khoá vào mỗi hàm hẹp (ADR A4; không tiền, không tên). Task 3 dùng.
interface ChangLichChung { /* … */ xeRieng: boolean; choToiThieu: number | null }
interface ChangChoChuyen { /* … */ xeRieng: boolean; choToiThieu: number | null }
```

Luật ghi:
- `oPhu` chỉ đọc khoá **có mặt**. `exclusiveVehicle` phải đúng kiểu `boolean`, sai thì báo "<at>: xe riêng phải là có / không.". `minVehicleSeats` là số nguyên 1..100 hoặc `null`/`""`, sai thì báo "<at>: số chỗ tối thiểu là số nguyên từ 1 đến 100 (không kể tài xế).".
- `giaiOPhuNhap` (lưu nháp `PUT /api/orders`, lập `POST /api/orders`): khoá vắng thì chép giá trị của chặng **cùng id**; chặng mới thì lấy `0` / `null`. Không có luật quyền riêng, vì `order.modify` đã hỏi (khác `paxOverride`).
- Sau xác nhận (`POST /legs`, `PUT /legs/:legId`, ô `order.trip.edit`): cùng khuôn `oPhu`. Lệnh **chỉ** đổi cam kết thì `chiOPhu = true`: không xét mốc, giữ dấu đặt gấp.
- `updateTrip` ("Sửa thông tin chuyến") nhận khoá `exclusiveVehicle`/`minVehicleSeats` ở thân hoặc ở dịch vụ thì báo 400, cùng câu với hai ô phụ cũ (mở rộng thành "… xe riêng, số chỗ tối thiểu sửa ở từng chặng đưa đón").
- Nhánh nháp của `PUT /legs/:legId` vẫn trả `use_order_form` khi thân có hai khoá này.
- `chepDatGapNhap` (khoá theo nội dung ngày / giờ / nơi) **không** tính hai khoá: đổi cam kết không làm mất dấu đặt gấp.
- Nhật ký `order_leg_updated` (và dòng sửa chặng của lưu nháp nếu có): `moTaVao` thêm `xeRieng`, `choToiThieu`. Câu trước→sau theo ADR là "xe riêng: không → có" và "xe tối thiểu: — → 15 chỗ".

- [ ] **Bài đỏ trước**, mỗi ca một `test()`:
  1. lập đơn có `exclusiveVehicle: true, minVehicleSeats: 15` thì cột lưu 1 / 15, và `GET` đơn trả đúng;
  2. **thân cũ** (không có hai khoá) lưu nháp lại thì giữ 1 / 15 (Review Focus 5); `PUT /legs/:id` với thân cũ cũng giữ;
  3. gửi `minVehicleSeats: null` thì xoá; `0`, `101`, `"abc"`, `1.5` thì 400 với câu tiếng Việt; `exclusiveVehicle: "1"` thì 400;
  4. `PARTNER` bật xe riêng trên nháp của mình thì được (tiêu chí 4, vế đầu); `INTERN` own cũng được;
  5. đơn đã xác nhận, chặng **dưới mốc 6 giờ**, chỉ đổi cam kết thì 200, không `short_notice_required`, dấu đặt gấp giữ nguyên;
  6. `updateTrip` có `exclusiveVehicle` thì 400; nhánh nháp `PUT /legs/:id` có `minVehicleSeats` thì 409 `use_order_form`;
  7. dòng nhật ký `order_leg_updated` chứa "xe riêng: không → có" và "xe tối thiểu: — → 15 chỗ";
  8. `chepDatGapNhap`: chỉ đổi cam kết thì dấu được chép lại;
  9. bài liệt kê khoá của `lichChungChang` và `hanhKhachChoChuyen` có thêm đúng `xeRieng`, `choToiThieu`; vẫn không có khoá tiền / tên ngoài danh sách cũ (hàng rào 6 của ADR). Chặng `exclusive_vehicle = 1, min_vehicle_seats = 15` đọc ra `xeRieng: true, choToiThieu: 15`.
- [ ] Chạy cho **FAIL**, viết mã, chạy lại cho **PASS**, `npm run typecheck` 0 lỗi.
- [ ] Commit: `Chặng đưa đón nhận hai ô cam kết xe riêng / số chỗ tối thiểu — khoá vắng giữ giá trị, không xét mốc; hàm hẹp trả cam kết`.

---

## Task 3: Luật thuần `kiemCamKet`, nối vào ba hàm kiểm, nạp dữ liệu phía Vận chuyển

**Files:**
- Create: `src/shared/cam-ket-xe.ts`, `src/shared/cam-ket-xe.test.ts`
- Modify: `src/shared/dieu-phoi-kieu.ts` (`ChangVao`, `ChuyenVao`, `MA_LUAT_PHA_LE`), `src/shared/ly-do-giu.ts` (`MA_GIU.CAM_KET`), `src/shared/dieu-phoi-kiem.ts` (`kiemXep`, `kiemTaoSuaChuyen`, `kiemXuatBen`)
- Modify (nạp dữ liệu, KHÔNG đổi hành vi lệnh): `src/modules/van-chuyen/chuyen-repo.ts` (`TripRow` cộng SELECT hai cột mới), `dieu-phoi-doc.ts` (`changVao` chép `xeRieng`/`choToiThieu` từ `ChangLichChung`; `chuyenVao` điền `camKetPhaLeKhoa` từ `commitment_override_key`), `dieu-phoi-lenh.ts` + `dieu-phoi-tien-do.ts` + nơi dựng đầu vào `dungLichChung` (truyền `changTrenChuyen`, `xeId`, `camKetPhaLeKhoa` thật vào `kiemXep` / `kiemTaoSuaChuyen`; `kiemXuatBen` nhận qua `ChuyenVao`)
- Test: `src/shared/dieu-phoi-kiem.test.ts`, `src/shared/dieu-phoi-kieu.test.ts`, `src/shared/ly-do-giu.test.ts`, `src/shared/dieu-phoi-lich-chung.test.ts`, và mọi bộ dựng `ChangVao` / `ChuyenVao` trong test (tìm bằng `grep -rln "khoaNoiDon" src --include=*.test.ts`)

**Interfaces:**
- Consumes: hai khoá `xeRieng`, `choToiThieu` của `ChangLichChung` (Task 2); cột `vc_trip.commitment_override_key` (Task 1).
- Lưu ý: tới hết task này, `loiKiem` vẫn LỌC MẤT `CAM_KET` (chưa biết mã), nên lệnh xếp chưa bị chặn ở route. Trên nhánh thì chấp nhận được; đó chính là lý do bài 2 của Task 4 phải đỏ trước. Cổng xuất bến thì đã giữ thật, vì `lyDo` của `kiemXuatBen` không qua `loiKiem`.

**Produces:**

```ts
// src/shared/dieu-phoi-kieu.ts
export interface ChangVao { /* …có sẵn… */ xeRieng: boolean; choToiThieu: number | null }   // BẮT BUỘC
export interface ChuyenVao { /* …có sẵn… */ camKetPhaLeKhoa: string | null }               // khoá đã phá lệ đang lưu
export const MA_LUAT_PHA_LE = ["MOC_TOI_THIEU", "KHOANG_NGHI", "CAM_KET"] as const;

// src/shared/cam-ket-xe.ts — luật thuần, import kèm đuôi .ts, không import modules/
export interface ViPhamCamKet { legId: string; loai: "XR" | "CX"; xeRieng: boolean; choToiThieu: number | null; orderCode: string }
export interface KetQuaCamKet {
  viPham: ViPhamCamKet[];
  /** Khoá của tập vi phạm hiện tại (C4, C5); null khi không vi phạm. */
  khoa: string | null;
  /** `khoa !== null && khoa === khoaDaPhaLe`. */
  daPhaLe: boolean;
  /** Mỗi vi phạm một lý do `CAM_KET`, lời gồm mã đơn và loại ("ĐH-1024 xe riêng", "ĐH-1030 cần ≥ 15 chỗ, xe 7 chỗ"); rỗng khi không vi phạm. */
  lyDo: LyDoGiu[];
}
/**
 * R-XR: có suất khách mở của một chặng xeRieng thuộc đơn A thì mọi suất khách mở khác phải thuộc đơn A (suất CREW không tính).
 * R-CX: soCho ≥ max(choToiThieu) của các chặng có suất khách mở.
 * `chang` = các chặng có ≥ 1 suất khách MỞ trên chuyến, ở trạng thái SAU lệnh.
 */
export function kiemCamKet(v: { xe: { id: string; soCho: number }; chang: readonly Pick<ChangVao, "legId" | "orderId" | "orderCode" | "xeRieng" | "choToiThieu">[]; khoaDaPhaLe: string | null }): KetQuaCamKet;
export function khoaCamKet(xeId: string, viPham: readonly ViPhamCamKet[]): string | null;
```

Ba hàm kiểm có sẵn, đổi chữ ký như sau (các khoá cũ giữ nguyên):
- `KiemXepVao` thêm `changTrenChuyen: ChangVao[]` (chặng có suất khách mở **trước** lệnh), `xeId: string` và `camKetPhaLeKhoa: string | null`. Tập sau lệnh là `changTrenChuyen ∪ them[].chang`. Trả `KetQuaXep & { camKet: KetQuaCamKet }`. Còn vi phạm mà `!daPhaLe` thì đẩy `lyDoGiu("CAM_KET", …)` vào `canPhaLe`.
- `KiemTaoSuaChuyenVao` thêm `camKet?: { changTrenChuyen: ChangVao[]; khoaDaPhaLe: string | null }`. Chỉ xét khi `lenh === "SUA"` **và** đổi xe (R-CX theo xe mới; R-XR không đổi vì không đổi khách). Trả `KetQuaKiem & { camKet: KetQuaCamKet | null }`.
- `kiemXuatBen`: tính `kiemCamKet` trên `v.chang` lọc theo chặng có suất khách mở, `khoaDaPhaLe = v.chuyen.camKetPhaLeKhoa`. Còn vi phạm mà `!daPhaLe` thì đẩy lý do `CAM_KET` vào `lyDo` (giữ chuyến). Trả `KetQuaXuatBen & { camKet: KetQuaCamKet }`.

- [ ] **Bài đỏ trước** (`cam-ket-xe.test.ts`), mỗi ca một `test()`:
  1. đơn A có chặng xe riêng và chỉ suất của A thì không vi phạm; thêm suất CREW vẫn không vi phạm (G-2);
  2. A xe riêng cộng một chặng của B thì có 2 dòng XR (chặng của A, chặng của B); thêm chặng của C thì có 3 dòng **và khoá khác** (C5, tiêu chí 3b);
  3. bật xe riêng ở chặng thứ hai của A khi đã ghép B thì khoá khác;
  4. `choToiThieu` 15 trên xe 7 chỗ thì vi phạm CX; trên xe 15 chỗ thì không (không kể tài xế, G-3);
  5. đổi id xe với cùng vi phạm CX thì khoá khác; tăng `choToiThieu` 15 lên 16 thì khoá khác;
  6. `khoaDaPhaLe` đúng bằng khoá thì `daPhaLe = true`; khác một ký tự thì `false`;
  7. khoá chỉ gồm ký tự id / mã / số, kiểm bằng khuôn `^[A-Za-z0-9:|\-]+$` (không tên, không chữ tự do);
  8. tệp không import `modules/`, import kèm `.ts` (khuôn bài cuối của `dieu-phoi-kieu.test.ts`).
- [ ] **Bài đỏ trước** (`dieu-phoi-kiem.test.ts`):
  - `kiemXep`: tiêu chí 1 (xe riêng cộng đơn B) cho `canPhaLe` chứa `CAM_KET`; tiêu chí 2 (xe 7 chỗ, chặng ≥ 15) cho `CAM_KET`; có `camKetPhaLeKhoa` khớp thì không còn `CAM_KET`; lệnh `DOI_DEN` cũng xét;
  - `kiemTaoSuaChuyen`: đổi sang xe 7 chỗ khi chặng trên chuyến ≥ 15 thì `CAM_KET`; không đổi xe thì `camKet === null`;
  - `kiemXuatBen`: tiêu chí 3 (bật xe riêng sau khi ghép) thì `dat = false`, có lý do `CAM_KET`; 3b; 3c (khoá cũ không khớp); khoá khớp thì đạt;
  - bài "MỘT luật hai nơi": cùng trạng thái, `kiemXep(...).camKet.khoa === kiemXuatBen(...).camKet.khoa`.
- [ ] Sửa bài ghim `dieu-phoi-kieu.test.ts` ("MA_LUAT_PHA_LE: đúng hai luật") thành ba mã, cộng thêm mã `THIEU_GIA` nếu Đợt 4 đã gộp. Đây là **đổi giá trị ghim theo ADR**, không phải nới. Bài vẫn đòi mỗi mã phá lệ cũng có trong `MA_GIU`.
- [ ] Thêm `CAM_KET` vào `MA_GIU` và bài `ly-do-giu.test.ts` (lời và ai xử lý, C9).
- [ ] `dieu-phoi-lich-chung.test.ts`: chuyến chưa chạy vi phạm cam kết, không phá lệ, thì lịch chung hiện "giữ" với `CAM_KET` (Review Focus 3).
- [ ] Chạy `node --test src/shared/` cho **FAIL**. Viết mã. Chạy lại cho **PASS**. Chạy `npm run typecheck` phải 0 lỗi.
- [ ] Commit: `Luật thuần cam kết xe riêng / số chỗ (kiemCamKet) nối vào xếp, sửa chuyến, cổng xuất bến; nạp cam kết vào đầu vào điều phối`.

---

## Task 4: Vận chuyển — lệnh xếp / sửa chuyến / dời có phá lệ cam kết

**Files:**
- Modify (van-chuyen): `chuyen-repo.ts` (câu UPDATE trong lô), `dieu-phoi-than.ts` (`SuaChuyenThan`, `XepThan`, `DoiThan` thêm `camKetPhaLe: { lyDo: string } | null` qua `docPhaLe(body.camKetPhaLe, "Phá lệ cam kết")`), `dieu-phoi-route.ts` (`loiKiem`, `THONG_BAO_409`), `dieu-phoi-lenh.ts` (`phaLeCua`, `lenhSuaChuyen`, `lenhXepLo`, `lenhDoi`), `dieu-phoi.ts` (`loSuaChuyen`, `loXep`, `loDoi` thêm câu ghi / xoá cột), `index.ts` (route `PUT /api/van-chuyen/chuyen/:id`, `POST …/phan-bo`, `POST …/doi`)
- Test: `src/modules/van-chuyen/dieu-phoi.test.ts`, `src/modules/van-chuyen/thu-tu-lo.test.ts`, `src/orders-cong-bo.test.ts`

**Interfaces:**
- Consumes: `KetQuaCamKet` trả từ `kiemXep` / `kiemTaoSuaChuyen` (Task 3); `TripRow.commitment_override_*` (Task 3).

**Produces:**

```ts
type PhaLe = { luat: MaLuatPhaLe; lyDo: string; policyId: string | null };              // có sẵn
const phaLeCua: (chung: DuLieuChung, luat: MaLuatPhaLe, p: { lyDo: string } | null) => PhaLe | null;   // mở kiểu
function loiKiem(kq: KetQuaKiem, staff, trangThai, co: { moc: boolean; nghi: boolean; camKet: boolean }): Response | null;
// lô: câu nhãn "CAM_KET_PHA_LE" — UPDATE vc_trip SET commitment_override_reason_code = ?, commitment_override_key = ? WHERE id = ? (ghi khi phá lệ, xoá về NULL khi hết vi phạm)
export async function lenhSuaChuyen(db, nen, b: SuaChuyenThan, staff, bayGioMs, lich: readonly ChangLichChung[]): Promise<Response | null>;  // thêm `lich`
```

Luật lệnh:
- `loiKiem`: `CAM_KET` thiếu phá lệ (`!co.camKet`) thì trả 409 `can_pha_le_cam_ket` kèm `canQuyen`. Nếu còn `MOC_TOI_THIEU` thiếu thì mã `can_pha_le` cũ thắng, và danh sách `lyDo` mang đủ mọi mã.
- Năm chỗ hiện đang viết cứng `phaLeCua(…"MOC_TOI_THIEU"…)` (`dieu-phoi-lenh.ts:146/182/244/268`, đo lại) phải chọn mã theo **lý do thật** trong `canPhaLe`, theo thứ tự ưu tiên ở C6.
- Ghi cột: lệnh còn vi phạm, có `camKetPhaLe` hợp lệ và người gọi có `trip.override` thì lô ghi `reason = camKetPhaLe.lyDo, key = camKet.khoa`. Lệnh kiểm thấy **hết** vi phạm mà cột đang có giá trị thì lô xoá về NULL. Cả hai trường hợp đều có nhật ký (audit `detail`).
- Route `PUT /api/van-chuyen/chuyen/:id` đọc `lichChungChang` **sau** `can(staff, "trip.dispatch")` và **trước** lệnh, rồi truyền vào `lenhSuaChuyen`. Đây là đường duy nhất để Quản trị phá lệ một vi phạm sinh ra do sửa đơn (khuôn `nghiPhaLe`). Thân chỉ có `camKetPhaLe` thì chạy được: detail là "phá lệ cam kết".
- Mỗi route nhận `camKetPhaLe` (sửa chuyến, xếp, dời) phải thêm điều kiện `b.camKetPhaLe` vào câu `… && !can(staff, "trip.override") → CAN_PHA_LE()`.
- Dời: chuyến **đích** xét như xếp (`DOI_DEN`). Chuyến **nguồn** theo C7, xoá cột nếu hết vi phạm, trong cùng lô.

- [ ] **Bài đỏ trước**:
  1. *(chuyển sang Task 2 bài 9)*
  2. xếp đơn B vào chuyến có chặng xe riêng của A, không gửi phá lệ, thì 409 `can_pha_le_cam_ket` (**phép đột biến hàng rào 1**: bỏ vế `camKet` trong `loiKiem` thì bài đỏ);
  3. cùng ca do `ADMIN` gửi `camKetPhaLe` thì 200; `vc_trip.commitment_override_reason_code` có giá trị; sự kiện `ALLOCATED` có `override_rule_code = 'CAM_KET'` (tiêu chí 1);
  4. `SALES` gửi `camKetPhaLe` ở **mỗi** route sửa chuyến / xếp / dời thì 403 (tiêu chí 4 vế sau, Review Focus 2, hàng rào 2: ba ca);
  5. đổi xe sang xe 7 chỗ khi chặng ≥ 15 thì 409 (tiêu chí 2); kèm phá lệ thì qua và ghi khoá có id xe mới;
  6. lệnh cần cả mốc lẫn cam kết thì sự kiện mang `MOC_TOI_THIEU`, cột chuyến mang lý do cam kết, `detail` có hai đoạn phá lệ (C6);
  7. `thu-tu-lo.test.ts`: câu `CAM_KET_PHA_LE` đứng sau câu cổng và sau nhật ký, trước câu trạng thái cuối;
  8. `src/orders-cong-bo.test.ts` vẫn xanh với nơi gọi mới `lichChungChang` ở route sửa chuyến.
- [ ] Chạy cho **FAIL**, viết mã, chạy lại cho **PASS**, `npm run typecheck` 0 lỗi.
- [ ] Commit: `Điều phối chặn xếp / đổi xe trái cam kết, Quản trị phá lệ kèm lý do (CAM_KET)`.

---

## Task 5: Lệnh giảm khách và cổng xuất bến — xoá hoặc giữ phá lệ

**Files:**
- Modify: `src/modules/van-chuyen/dieu-phoi-lenh.ts` (`lenhRut`, `lenhCapNhatKhach`, `lenhCapNhatDiem`, nguồn của `lenhDoi`), `dieu-phoi-tien-do.ts` (`lenhXuatBen`), `dieu-phoi.ts` (`loRut`, `loCapNhatKhach`, `loCapNhatDiem`, `loXuatBen`)
- Test: `src/modules/van-chuyen/dieu-phoi.test.ts`, `thu-tu-lo.test.ts`

**Interfaces:**
- Consumes: `kiemCamKet`, `KetQuaCamKet` (Task 3); câu nhãn `CAM_KET_PHA_LE` (Task 4).
- Produces: `loXuatBen(db, { …, xoaCamKet: boolean })`. Khi `kiemXuatBen(...).camKet.khoa === null` mà chuyến đang có cột thì lô xoá hai cột, cùng lô với xuất bến, có nhật ký.

- [ ] **Bài đỏ trước**:
  1. tiêu chí 3: ghép A và B rồi bật xe riêng cho A (sửa đơn qua `PUT /legs`) thì `POST …/xuat-ben` trả 409 `chua_du_dieu_kien_xuat_ben` có lý do `CAM_KET`;
  2. tiêu chí 3b: đã phá lệ, xếp thêm đơn C thì 409 lúc xếp; **hoặc** bật xe riêng ở chặng khác của A (không lệnh chuyến) thì xuất bến giữ;
  3. tiêu chí 3c: đã phá lệ số chỗ, tăng `minVehicleSeats` thì xuất bến giữ; rút B (hết vi phạm) thì hai cột NULL ngay sau lệnh rút; ghép B lại thì 409 cần phá lệ mới;
  4. rút / cập nhật khách **không bao giờ** trả `can_pha_le_cam_ket` (C7), kể cả khi còn vi phạm;
  5. vi phạm biến mất do sửa đơn (tắt xe riêng) thì xuất bến đạt và lô xoá hai cột;
  6. `thu-tu-lo.test.ts`: câu xoá trong `loRut` và `loXuatBen` đúng thứ tự.
- [ ] Chạy cho **FAIL**, viết mã, chạy lại cho **PASS**, `npm run typecheck` 0 lỗi.
- [ ] Commit: `Lệnh rút / cập nhật và cổng xuất bến xoá phá lệ cam kết khi hết vi phạm; giữ chuyến khi khoá đổi`.

---

## Task 6: Câu kiểm định kỳ và sổ hàng rào

**Files:**
- Modify: `scripts/audit-checks.mjs`, `docs/SO-HANG-RAO.md`
- Test: bài có sẵn của `audit-checks` (`grep -rln "R-VC-11" src scripts tests` để tìm), cộng thêm một ca

**Interfaces — Produces:** `R-VC-<NN>` mức `warn`, câu "chuyến đang chạy / đã chạy vi phạm cam kết mà không có phá lệ". Câu SQL đọc `vc_trip` (status `RUNNING`, `ENDED`, `ENDED_INTERRUPTED`) nối `vc_trip_allocation` (khách mở lúc xuất bến: `valid_to_at IS NULL OR valid_to_at > departed_at`) với `ord_transfer_leg`, rồi đếm chuyến có:
- (a) chặng `exclusive_vehicle = 1` và suất khách của đơn khác; hoặc
- (b) `min_vehicle_seats >` `soCho` trong bản chụp xuất bến;

và có `commitment_override_reason_code IS NULL`. Script được đọc mọi bảng, giống `R-VC-10`.

- [ ] **Bài đỏ trước:** gieo chuyến `RUNNING` vi phạm R-XR mà không phá lệ thì câu đếm 1; có phá lệ thì 0.
- [ ] Viết câu. Chạy `node scripts/audit-invariants.mjs --db local`: thoát 0, có dòng `R-VC-<NN>`.
- [ ] Thêm vào `docs/SO-HANG-RAO.md` **bốn dòng** (hàng rào 1, 2, 3, 6 của ADR). Mỗi dòng ghi phép đột biến đã làm và ngày thấy đỏ:
  1. bài `kiemCamKet` / `loiKiem`: đột biến bỏ vế `camKet`;
  2. `SALES` phá lệ thì 403: đột biến bỏ `b.camKetPhaLe` khỏi điều kiện ở một route;
  3. `R-VC-<NN>`: đột biến đổi `IS NULL` thành `IS NOT NULL`;
  4. bài liệt kê khoá hàm hẹp: đột biến thêm một khoá thừa.
- [ ] Commit: `Kiểm định kỳ chuyến vi phạm cam kết không phá lệ; sổ hàng rào cam kết`.

---

## Task 7: e2e đầu-cuối

**Files:**
- Create: `tests/e2e/cam-ket-xe.mjs` (khuôn `tests/e2e/dieu-phoi.mjs`, đăng nhập qua `login()`/`session()` của `tests/e2e/lib.mjs`). Thêm tên vào danh sách nhóm e2e nếu runner đòi.

- [ ] Kịch bản trên API thật (Origin cùng site):
  - `PARTNER` lập nháp có xe riêng: 200 (tiêu chí 4);
  - văn phòng xác nhận hai đơn, tạo chuyến, xếp A;
  - xếp B: 409 `can_pha_le_cam_ket`; `SALES` phá lệ: 403; `ADMIN` phá lệ: 200;
  - xếp C: 409; rút B và C: hai cột trống; bật `minVehicleSeats` 30 trên xe 16 chỗ: xuất bến 409 `CAM_KET`;
  - cuối kịch bản chạy `audit-invariants` (runner tự gọi), thoát 0.
- [ ] Chạy: `npm run test:e2e -- cam-ket-xe`, rồi chạy đủ bộ `npm run test:e2e`.
- [ ] Commit: `e2e cam kết xe riêng / số chỗ: chặn, phá lệ, 403, xoá khi hết vi phạm`.

---

## Task 8a: Hộp phá lệ và DTO lịch chung (KHÔNG chờ bản vẽ)

Hai việc này theo khuôn có sẵn nên không cần vẽ (C10). Làm ngay sau Task 4.

**Files:**
- Modify: `web/dieu-phoi-ui.ts`, `web/chuyen-sua.ts`: 409 `can_pha_le_cam_ket` mở hộp phá lệ **có sẵn** (thêm một nhánh cạnh `can_pha_le` / `chua_du_nghi`), hiện lời từng lý do `CAM_KET`, rồi gửi lại lệnh kèm `camKetPhaLe`. Người không có `trip.override` (`canQuyen = false`) thấy câu "Cần Quản trị cho phép" theo khuôn có sẵn.
- Modify: `src/shared/contracts.ts`: `ChangLichDto` thêm `xeRieng: boolean, choToiThieu: number | null`. `src/modules/van-chuyen/dieu-phoi-dto.ts`: `changLichDto` điền hai khoá. **Không** đưa `commitment_override_key` vào bất kỳ DTO nào.
- Test: bài DTO lịch chung có `xeRieng` / `choToiThieu`, và JSON phản hồi **không** chứa chuỗi `commitment_override_key` hay khoá `khoa`. Bài hộp phá lệ (nếu `web/` có bài thuần cho nhánh mã lỗi; nếu không thì dùng kịch bản Chrome).

- [ ] Bài đỏ trước (DTO), viết mã, `npm run build:web`, kịch bản Chrome 390 + 1040 với một lần xếp bị chặn rồi phá lệ, ảnh lưu ở `docs/evidence/<ngày>-cam-ket-xe/`.
- [ ] Commit: `Hộp phá lệ nhận mã cam kết; lịch chung trả cờ xe riêng / số chỗ`.

## Task 8b: Ô nhập trên form đơn và nhãn trên bảng — **CHỜ BẢN VẼ của chủ**

Máy chủ (Task 1–7, 8a) phát hành được trước, chạy ngầm (C10). Task này nhận khi đã có bản vẽ từ "Lệnh vẽ" ở cuối kế hoạch.

**Files:**
- Modify: `src/shared/chang-form.ts`:
  - `ChangNhap` thêm `xeRieng: boolean, choToiThieu: string`;
  - `rong`, `changTuDto`, `tuMau` (từ mẫu thì luôn `false` / `""`);
  - `SuaChang` thêm hai khoá;
  - `legInput` **luôn** gửi hai khoá, **không** điều kiện `guiSoVe`, vì `PARTNER` / `INTERN` có `order.modify`;
  - `changDaDoi` so hai khoá; `loiChang` báo số chỗ sai khuôn.
- Modify: `web/khoi-dua-don.ts` (hai ô mỗi chặng, theo bản vẽ M1/M4), `web/sheet-dua-don.ts` (bảng "Sửa đưa đón" gửi hai khoá).
- Modify: `web/order.ts`: chi tiết đơn hiện cam kết nếu bản vẽ M3 có.
- Modify: `web/dieu-phoi.ts`: thẻ chặng hiện nhãn "XE RIÊNG" và "≥ 15 chỗ", khuôn chip `✈︎`. `aria-label` của thẻ chặng kèm "xe riêng", "tối thiểu 15 chỗ".
- Test: `src/shared/chang-form.test.ts`, `src/shared/service-form.test.ts` (thân gửi lên có hai khoá với mọi vai lập đơn).

- [ ] Bài đỏ trước cho `chang-form`: `legInput` có `exclusiveVehicle` / `minVehicleSeats` cả khi `guiSoVe = false`; `changDaDoi` đúng khi chỉ bật xe riêng; `""` gửi thành `null`.
- [ ] Ô gõ 16px; CSS chỉ dùng token; không dùng `innerHTML`; ẩn / hiện theo `can()` theo khuôn hiện có.
- [ ] Chạy `npm run build:web`, kịch bản Chrome 390 và 1040 (form đơn, bảng sửa đưa đón, bảng điều phối), ảnh lưu ở `docs/evidence/<ngày>-cam-ket-xe/`.
- [ ] Commit: `Giao diện hai ô xe riêng / số chỗ tối thiểu và nhãn trên bảng điều phối (theo bản vẽ)`.

---

## Task 9: Tài liệu và phiên bản

- [ ] `docs/SYSTEM-DESIGN.md`: luật xếp / cổng xuất bến thêm cam kết, cột mới (§5, §6).
- [ ] `docs/CHANGE-GUIDE.md`: công thức "thêm một luật phá lệ" (năm chỗ: `MA_LUAT_PHA_LE`, `MA_GIU`, `loiKiem`, `phaLeCua`, 403 từng route), cộng bẫy C6 (một ô phá lệ trên sự kiện).
- [ ] Thiết kế [TK] `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:166`: sửa câu theo bảng "Câu ADR bị thay". Đây là tài liệu mô tả, không phải ADR. **Không** sửa ADR-0047 / 0049 / 0056 (đã duyệt; bảng câu bị thay của ADR-0056 đã đủ).
- [ ] Mục nhật ký phiên bản `src/shared/changelog.ts` + `src/shared/app-info.test.ts`, viết lời thường. Nếu giao diện chưa có: "Máy chuẩn bị luật xe riêng; ô nhập sẽ có ở bản sau".
- [ ] Nhật ký thi công `docs/superpowers/plans/<ngày>-van-chuyen-dot-7-nhat-ky.md`.
- [ ] Commit: `Tài liệu cam kết xe riêng / số chỗ; nhật ký phiên bản`.

## Task K: Kiểm độc lập (bắt buộc — việc lớn: dữ liệu đơn và luật xếp xe)

- [ ] Subagent `nguoi-kiem-doc-lap` chỉ đọc. Đọc mã thật, chạy lại `npm test`, `npm run typecheck`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`. Đối chiếu từng tiêu chí 1–6 của ADR, năm dòng Review Focus, và chín bẫy:
  1. `loiKiem` lọc mã;
  2. `phaLeCua` viết cứng mốc;
  3. 403 theo từng route;
  4. khoá có chặng đơn khác;
  5. `lenhSuaChuyen` có `lich`;
  6. lệnh giảm không chặn và có xoá;
  7. xoá trong `loXuatBen`;
  8. khoá không vào DTO;
  9. trường `ChangVao` bắt buộc.
- [ ] Chỉ báo "đạt" dựa trên báo cáo của người kiểm cộng test.

---

## Tiêu chí nghiệm thu (đỏ trước, xanh sau — ánh xạ ADR)

| ADR | Bài |
|---|---|
| 1 | Task 4 bài 2–3, Task 7 |
| 2 | Task 3 (`kiemXep`, `kiemTaoSuaChuyen`), Task 4 bài 5 |
| 3, 3b, 3c | Task 3, Task 5 bài 1–3, Task 7 |
| 4 | Task 2 bài 4, Task 4 bài 4, Task 7 |
| 5 | (VK3-B — Đợt 1) |
| 6 | Task 1–7: `npm test`, typecheck, e2e, audit local xanh |

## Lệnh vẽ Claude Design (chủ dán vào Claude Design)

> Dựa trên bản vẽ có sẵn `docs/design/2026-10-01-dua-don-hanh-khach/` (M1 "Đưa đón - form đơn", M4 "Sửa đưa đón", M3 "Chi tiết đơn", `the-dua-don.dc.html`) và bảng điều phối `docs/design/van-chuyen-dieu-phoi/`, cùng hệ thống thiết kế `_ds`. Vẽ thêm, **giữ nguyên mọi thứ đang có**:
> 1. **Mỗi chặng đưa đón** (form lập đơn M1 và bảng "Sửa đưa đón" M4) có hai ô mới:
>    - **"Xe riêng"**: bật / tắt, chú thích nhỏ "Không ghép khách đơn khác";
>    - **"Xe tối thiểu … chỗ"**: ô số, để trống = không yêu cầu, chú thích "Không kể tài xế (xe 16 chỗ nhập 15)".
>
>    Hai ô nằm cùng hàng hoặc dưới ô số hiệu chuyến bay; điện thoại 390px và máy tính 1040px. Có trạng thái lỗi "Số chỗ từ 1 đến 100".
> 2. **Chi tiết đơn (M3)**: chặng có cam kết hiện nhãn "Xe riêng" và "≥ 15 chỗ".
> 3. **Bảng điều phối, thẻ chặng chờ xếp**: nhãn ngắn "XE RIÊNG" và "≥ 15 chỗ", cạnh nhãn chuyến bay "✈︎ VN1553".
>
> Không chữ tiếng Anh, không mã thô.

## Cần chủ (lượt này)

1. **Bản vẽ Claude Design** cho hai ô cam kết và các nhãn (lệnh ngay trên). Máy chủ làm trước, không chờ bản vẽ.
2. *(Nhắc, không chặn duyệt — ADR-0056)* Việc ngoài app của chủ: hỏi người chuyên môn pháp lý về **ghép khách nhiều đơn trên xe hợp đồng** trước khi chạy chuyến ghép thật.

## Điều chưa chắc (người kiểm soi)

- **C6, một sự kiện mang một phá lệ:** khi một lệnh cần hai phá lệ, sự kiện chỉ mang mã ưu tiên, còn cam kết nằm ở cột chuyến và trong nhật ký. Tiêu chí 1 vẫn đạt vì chỉ cần cam kết. Có thể chủ muốn sự kiện riêng; đổi được.
- **C7, rút một phần mà vẫn còn vi phạm:** khoá khác nên cổng xuất bến giữ, Quản trị phải phá lệ lại, dù lệnh rút chỉ làm vi phạm nhẹ hơn. Đây là đúng chữ ADR ("khớp tuyệt đối") nhưng có thể gây phiền khi vận hành.
- **Đơn bị sửa giữa lúc Quản trị xem và lúc bấm phá lệ:** máy chủ ghi khoá của tập vi phạm **lúc lệnh chạy**, nên có thể phá lệ cho một vi phạm Quản trị chưa thấy. Thân lệnh không mang khoá, vì khoá không vào DTO. Câu 409 trả đủ danh sách lý do mới nhất nên giảm được rủi ro, nhưng không loại hết.
- CHECK nhắc cột khác trong `ALTER TABLE … ADD COLUMN` trên D1: chưa thử. Có phương án trigger thay thế (Task 1).
- Thứ tự với Đợt 4 (ADR-0057): số migration và giá trị ghim `MA_LUAT_PHA_LE` / `MA_GIU` phải đo lúc thi công.
