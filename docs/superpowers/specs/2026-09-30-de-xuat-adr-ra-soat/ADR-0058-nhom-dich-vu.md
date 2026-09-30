# ADR-0058 — Nhóm dịch vụ quản lý trong app: gieo một lần từ Sheet, mỗi dịch vụ đúng một nhóm, chip lọc ở ô chọn dịch vụ của form đơn

- **Trạng thái:** **proposed — đề xuất, CHƯA duyệt.** Bản nháp của người soạn (phiên soạn ADR 2026-09-30), **đã sửa lần 1 theo báo cáo người kiểm độc lập** cùng ngày; sửa lần 2 theo người kiểm độc lập vòng 2 (chỉ dòng "Chưa kiểm"). Chủ dự án chưa duyệt; từ khi duyệt chỉ sửa dòng trạng thái.
- **Ngày:** 2026-09-30.
- **Thuộc gói:** lượt duyệt **1a** (trang ghép `trang-ghep-luot-1.md` cùng thư mục nháp). ADR-0062 là lượt **1b**, duyệt riêng (đếm trần 3 ở trang ghép).
- **Nguồn (lời chủ, chuẩn — không hỏi lại):** báo cáo rà soát `docs/superpowers/specs/2026-09-30-ra-soat-luong-giao-dien-phan-loai-huong-dan.md` (nhánh `ra-soat-luong-giao-dien`), §6 dòng 3, nguyên văn lựa chọn: **"Trong app, gieo sẵn 15 nhóm"** — một lần từ Sheet (sửa nhóm của ATV), Quản trị sửa sau; mỗi dịch vụ một nhóm, thẻ để sau. Lời chủ chuyển qua điều phối 30/9: bộ lọc là chip nhóm ở ô chọn dịch vụ của form đơn, có "Chưa phân loại" và nhãn "Đang lọc: … — N dịch vụ"; lựa chọn lọc nhớ theo từng người trên máy (không mặc định theo vai); **KHÔNG** đọc cột nhóm của Sheet định kỳ; **KHÔNG** sửa §2.5 đặc tả.
- **Mốc mã:** mọi `tệp:dòng` dưới đây đọc ở `origin/main` = `1db777f4` (bản 1.38), trừ chỗ ghi `@824193f1` (nhánh `giao-dien-sua-nho-1-39`, bản 1.39 chưa gộp). Đã so: giữa hai mốc chỉ `web/catalog-picker.ts` khác.
- **ADR liên quan:** ADR-0002 (sở hữu bảng, tiền tố, view công bố), ADR-0003 (bảng tra cứu khoá mã, WHO, hiệu lực, không xoá cứng), ADR-0028 điều 2 và ADR-0033 điều 2 (nội dung danh mục cho người lập đơn — **bị bổ sung**), ADR-0054 D10.1 (tiền lệ "cài trong app ở màn Danh mục, có lịch sử, không phải cột Sheet"), ADR-0047 A3 (tiền lệ tệp "nửa nghiêm" trong module LEGACY), ADR-0019 (cổng), ADR-0061 (accepted 30/9, phiên khác — mở lại dịch vụ nhập tay; dịch vụ nhập tay không có nhóm, xem Đ8). Hiến chương Phần I (đã duyệt) áp: 2.2, 4.1, 5.1, 5.2, 5.3, 5.5, 5.12, 5.13, K11.
- **Xây trên lỗ đang hở:** **không có.** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (đọc 2026-09-30 @`824193f1`). Không dùng ô hoãn nào của mục `thao_tac`.

---

## Tóm tắt cho chủ (lời thường)

1. App có danh sách **nhóm dịch vụ** riêng (Tour đảo, Thể thao biển, Tháp Bà…). Quản trị thêm, đổi tên, sắp thứ tự, tắt nhóm ở màn **Danh mục**.
2. Lần đầu, app **gieo sẵn** nhóm theo bảng giá Google Sheet hôm nay (đã sửa ATV). Sau đó app **không đọc** cột nhóm của Sheet nữa: sửa nhóm chỉ trong app.
3. Mỗi dịch vụ **đúng một nhóm**. Dịch vụ mới xuất hiện trên Sheet sau này nằm ở **"Chưa phân loại"** tới khi Quản trị gán.
4. Mọi lần đổi nhóm của một dịch vụ được **lưu lịch sử** (ai, lúc nào, nhóm cũ → mới).
5. Ở form đơn, trên ô "Chọn từ danh mục" có hàng **chip nhóm**. Bấm một chip thì chỉ thấy dịch vụ nhóm đó, kèm dòng "Đang lọc: Thể thao biển — 23 dịch vụ". Mỗi người, trên mỗi máy, app nhớ lần lọc gần nhất.
6. Ai đang được lập đơn (văn phòng, Đối tác, Thực tập) thấy **tên nhóm**. Không thêm giá hay thông tin nội bộ nào.
7. **Chưa phục vụ ví dụ "HDV lọc Thể thao biển"**: HDV hôm nay không lập đơn nên không có ô chọn dịch vụ. Mở cho HDV là quyết định riêng.

---

## Bối cảnh

- **Hiện trạng danh mục.** Module `catalog` sở hữu ba bảng tên cũ `catalog_item`, `catalog_override`, `catalog_sync` (`migrations/0006_catalog.sql:22-56`). Không bảng nào có cột nhóm. Ba bảng nằm trong danh sách khoá `LEGACY_TABLES` (`src/architecture.test.ts:88-100`). Module ở hạng `LEGACY` (`:74`), kèm ghi chú *"`catalog` chưa có SQL riêng đáng kể — chuyển STRICT khi có SQL mới"* (`:71-72`).
- **Ô chọn dịch vụ.** Form đơn tải danh mục từ `GET /api/catalog/for-order` (`web/order-form.ts:324`, `:485`) và vẽ bằng `createCatalogPicker` (`web/catalog-picker.ts:23-84@824193f1`). Ô tìm chỉ lọc theo tên/mã, tối đa 40 kết quả (`:21`, `:34`). Không có nhóm.
- **Hai route đọc cùng một hàm.** `GET /api/catalog` (cổng `office`) và `GET /api/catalog/for-order` (cổng `orders` + `can(order.create)`) cùng gọi `catalogForOrderForm` (`src/modules/catalog/index.ts:81-114`). Hàm này trả `CatalogPublicResponse` (`src/shared/contracts.ts:506`), mỗi dịch vụ là `CatalogServiceDto` (`:475-477`: mã, tên, đơn vị, giá, ghi chú, `supported`).
- **Quản trị danh mục.** Mọi route ghi ở cổng `admin` + `can(admin.manage)` (`index.ts:117-181`). Ô `admin.manage` = Quản trị, Toàn quyền (`src/shared/permissions.ts:100`).
- **Sheet có sẵn phân nhóm, nhưng ở cột app bị cấm đọc.** Tải CSV chỉ-đọc lúc **2026-09-30 16:59:43 +07:00**, 26 888 byte, sha256 `6a06864f847c7308d4a5968ca3ac20bd70a6b639f7d1d70b27601077b867f713`. Tiêu đề có 14 cột:
  - cột 13 mang tiêu đề **"Ghi chú nội bộ"** nhưng chứa **tên nhóm**;
  - cột 14 **không có tiêu đề** và chứa **mã nhóm** ba chữ.
  - Đặc tả đã duyệt cấm app đọc cột "Ghi chú nội bộ" (`docs/SPEC-tourdao-sales.md:156`, `:166`). `sheet.ts` tuân thủ: chỉ tìm mã, tên, đơn vị, giá, ghi chú khách (`src/modules/catalog/sheet.ts:35-46`).
- **Mã dịch vụ không theo tiền tố nhóm** (vd `ZIP`, `ATV`, `SM1`; `TT…`/`TTB…`/`TB…` đè nhau) ⇒ không suy nhóm từ mã được.
- **HDV không chọn dịch vụ ở đâu cả.** Ô `order.create` của `FIELD` = `none` (`permissions.ts:76`), route `for-order` trả 403 cho họ (`index.ts:111`). ADR-0019 điều 3 cấm HDV đọc bảng giá cho form lập đơn.

### Bảng gieo — 14 nhóm, 110 dịch vụ (ảnh chụp CSV ở trên)

| # | Mã nhóm (cột 14) | Tên nhóm (cột 13) | Số dịch vụ | Mã dịch vụ |
|---|---|---|---|---|
| 1 | `TDA` | Tour đảo | 11 | TDMCT1 TDMCM TDMCT2 TD1 TD2 TDTCT TDTCSH TDSNO TDMCS TDTCS TDSCT |
| 2 | `LPH` | Long Phú | 5 | LPCBT LPCB LPDK LPHL LPDKHL |
| 3 | `HTA` | Hòn Tằm | 4 | SM3 SD3 SD1 SM1 |
| 4 | `VHB` | Harbour | 3 | VHB VHBT VHBTB |
| 5 | `VIN` | Vinwonders | 7 | V2D V3D V16 VB16 VTC VB350 VB500 |
| 6 | `DTH` | Du thuyền | 6 | DTE1 DTE2 DTMSC DTMTY DTVYDT DTVYST |
| 7 | `TTB` | Thể thao biển | 23 | TTBSNO TTBPC TTBDD2 TTBFLY TTBL215 TTBSW TTBSD TTBDD1 TTBL230 TTBL260 TTBL115 TTBL130 TTBL160 TTBPP5 TTBPR5 TTBPR8 TTBPB TTBLV TTBS30 TTBS60 TTBS90 TTBTD30 TTBTD60 |
| 8 | `IRS` | I Resort | 10 | IRTK IRTKA IRTD1 IRTD4 IRTB1 IRTB4 IRTBTD1 IRTBTD4 IRTBTDA1 IRTBTDA4 |
| 9 | `KON` | Kong Forest | 3 + **1 (ATV, sửa)** | ZIP ZA1 ZA2 **ATV** |
| 10 | `TTR` | Trăm trứng | 6 | TTKP TTTG TTTT TTKPA TTTGA TTTHA |
| 11 | `NHD` | Nhà hát Đó | 6 | NHDRMD NHDRMT NHDRMZ NHDCSD NHDCST NHDCSZ |
| 12 | `TBA` | Tháp Bà | 13 | TBTK TBTD1 TBTD3 TBTD6 TBTB1 TBTB3 TBTB6 TBTBTD1 TBTBTD3 TBTBTD6 TBNS1 TBNS2 TBNS3 |
| 13 | `TXE` | Thuê xe | 6 | SB16D SB7D SB4D SB16T SB4T SB7T |
| 14 | `BUS` | Buýt City Tour | 6 | BCT1 BCT4 BCT24 BFN1 BFN4 BFNP |
| | | **Cộng** | **110** (không mã trùng) | |

- **Chỗ lỗi ATV (CSV dòng 48):** tên nhóm ghi "Kong Forest", mã nhóm ghi `TBA` (mã của Tháp Bà). **Đề xuất gán `KON` (Kong Forest):**
  - tên dịch vụ "Hành trình lái xe địa hình trong rừng (90 phút)";
  - đường dẫn `tour-lai-xe-dia-hinh-atv-hon-ba`, cùng khuôn với ZIP (`tour-truot-zipline-hon-ba`, nhóm KON, dòng 47).
  - Chủ xác nhận (câu 1 của `cau-hoi-chu.md`).
- **Lệch số với báo cáo rà soát:** báo cáo (§3) và lời chủ nói **15 nhóm**, **109 dịch vụ**; ảnh chụp CSV hôm nay có **14 nhóm**, **110 dịch vụ**. Chính danh sách trong báo cáo cũng chỉ có 14 tên ("Kong Forest 3+1" đếm như một nhóm). Người soạn **không tự thêm** nhóm thứ 15 (câu 1 của `cau-hoi-chu.md`).
- **Tên nhóm để nguyên như Sheet** (giả định bề mặt, đổi lại được: Quản trị đổi tên trong app bất cứ lúc nào — không hỏi riêng): "Harbour", "Vinwonders", "I Resort", "Trăm trứng", "Nhà hát Đó", "Thuê xe".

---

## Quyết định

### Đ1. Chủ dữ liệu, tiền tố bảng mới

- Nhóm dịch vụ và việc gán nhóm thuộc **module `catalog`**. Màn hình là "Danh mục", dữ liệu nói về dịch vụ của danh mục. Không đặt ở module khác, không thêm cạnh phụ thuộc mới.
- **Tiền tố mới `ctl_` → `catalog`** trong `TABLE_PREFIX` (`src/architecture.test.ts:137`).
  - Bảng cũ `catalog_*` giữ tên, không đổi.
  - Kiểm va chạm: không bảng nào trong sổ bắt đầu bằng `ctl_`; `catalog_item` không khớp `startsWith("ctl_")`.
  - Thêm một mục vào `TABLE_PREFIX` là **nới hàng rào đã ghim** (Điều 9.4), cùng loại với `vc_`, `ord_` (chú thích `architecture.test.ts:134-136`). **Chủ duyệt ADR này = duyệt việc nới đó.**
- Phân loại theo Hiến chương 2.2:
  - **nhóm** = bảng tra cứu: thêm nhóm không sửa mã;
  - **nhóm của một dịch vụ** = dữ liệu có hiệu lực, có lịch sử (khuôn ADR-0054 D10.1);
  - **luật "nhóm hiện hành"** = hàm thuần.

### Đ2. Hai bảng mới

**`ctl_group` — nhóm dịch vụ (bảng tra cứu, khoá mã):**

| Cột | Nghĩa |
|---|---|
| `code` `TEXT PRIMARY KEY` | mã nhóm. Nhóm gieo dùng mã ba chữ của Sheet (`TDA`…); nhóm Quản trị thêm sau do máy chủ sinh. Không bao giờ đổi, không hiện cho người dùng |
| `name` `TEXT NOT NULL` | tên hiện trên chip, 1–40 ký tự; không trùng giữa các nhóm đang dùng (máy chủ kiểm + chỉ mục `UNIQUE` trên `name` của dòng `active = 1`) |
| `sort_order` `INTEGER NOT NULL` | thứ tự chip |
| `active` `INTEGER NOT NULL CHECK (active IN (0,1))` | tắt nhóm = `0`, không xoá (ADR-0003) |
| `created_at`, `created_by`, `updated_at`, `updated_by` | đủ bốn cột WHO, `TEXT NULL` không khoá ngoại (ADR-0003; bài `architecture.test.ts`). `created_by` NULL = hệ thống gieo |

- Đổi tên, thứ tự, bật/tắt: `UPDATE` tại chỗ + dòng nhật ký có **trước → sau** (5.12). Không có trigger chỉ-thêm ở bảng này (bảng tra cứu, khuôn `vc_` loại giấy tờ).
- **Tắt nhóm còn dịch vụ đang thuộc nó → 409** "Nhóm còn N dịch vụ, chuyển chúng sang nhóm khác trước". Người soạn tự quyết vì đây là luật bề mặt, đổi lại được; ghi ở mục Giả định.
- Trigger cấm `DELETE`.

**`ctl_service_group` — nhóm của một dịch vụ, chỉ-thêm, có lịch sử:**

| Cột | Nghĩa |
|---|---|
| `id` `TEXT PRIMARY KEY` | |
| `service_code` `TEXT NOT NULL REFERENCES catalog_item(code)` | mã dịch vụ. Khoá ngoại **trong cùng module**, `NO ACTION`; `catalog_item` không bao giờ bị xoá, chỉ `in_sheet = 0` (`0006:36`) |
| `group_code` `TEXT NULL REFERENCES ctl_group(code)` | nhóm; `NULL` = đưa về "Chưa phân loại" |
| `seq` `INTEGER NOT NULL CHECK (seq >= 1)` | số thứ tự lần gán của **dịch vụ đó** (1, 2, 3…); `UNIQUE (service_code, seq)` — khuôn `seq` của `order_money_adjustment` (`migrations/0021_order_money_adjustment.sql`). Máy chủ đọc `max(seq)` rồi ghi `max + 1`; hai lệnh gán cùng dịch vụ đua nhau thì CSDL chặn lệnh sau (→ 409 "Dịch vụ vừa được người khác đổi nhóm") |
| `valid_from_at` `TEXT NOT NULL` | lúc máy chủ ghi (hiệu lực ngay, khuôn ADR-0054 D10.1); **chỉ để hiển thị lịch sử**, không dùng để chọn dòng hiện hành |
| `created_at`, `created_by`, `updated_at`, `updated_by` | bốn cột WHO |

- **Nhóm hiện hành của một dịch vụ** = dòng có `seq` lớn nhất. Không có dòng nào = "Chưa phân loại". (Bản nháp trước dùng `UNIQUE (service_code, valid_from_at)` và "`valid_from_at` lớn nhất": hai lần gán cùng mili-giây thì vấp khoá hoặc hoà, không biết dòng nào hiện hành. `seq` tránh cả hai.)
- **Mỗi dịch vụ đúng một nhóm** tại một thời điểm: đảm bảo bằng cấu trúc (một dòng hiện hành cho mỗi `service_code`), không cần bảng nhiều-nhiều.
- Trigger cấm `UPDATE`/`DELETE`. Đổi nhóm = thêm dòng.
- Gán vào nhóm đang tắt → máy chủ 409 **và** trigger `BEFORE INSERT` `RAISE` (hai lớp, 5.1).
- **Khoá ngoại thay cho tham chiếu logic.**
  - Hai bảng cùng module nên không cần view trung gian.
  - Bài R-P19 (`architecture.test.ts:813-822`) chỉ áp cho `logicalRefs` và đòi `viaView`. Không khai `logicalRefs` cho cột này.
  - Hệ quả gieo: xem Đ7.

### Đ3. Quyền

- **Ghi** (thêm/đổi nhóm, gán nhóm): cổng `admin` + `can(staff, "admin.manage")` hỏi **trước mọi truy vấn**. Ô này đã canh mọi thao tác quản trị danh mục (`index.ts:117-181`).
- **Không thêm ô mới, không đổi giá trị ô nào** của `MATRIX`.
- **Đọc nhóm:**
  - theo DTO của hai route danh mục sẵn có (Đ5), nên ai đọc được danh mục cho form đơn thì thấy tên nhóm;
  - danh sách quản trị và lịch sử: cổng `admin` + `admin.manage`.
- **Nhật ký:** ba hành động mới trong `src/shared/audit-actions.ts`, nhóm `catalog`, `targetType` `catalog`. Theo Phần II "Thêm một module mới" bước 3: không migration. Không dữ liệu cá nhân.
  - `catalog_group_created`: `detail` = tên nhóm;
  - `catalog_group_updated`: `detail` = trước → sau của tên / thứ tự / bật-tắt;
  - `catalog_group_assigned`: `targetId` = mã dịch vụ, `detail` = "nhóm cũ → nhóm mới" bằng tên.
  - Gán nhiều dịch vụ một lần: **một** dòng nhật ký mỗi dịch vụ, cùng lô.

### Đ4. API (tên đề xuất; kế hoạch chốt)

| Route | Cổng + ô | Việc |
|---|---|---|
| `GET /api/catalog/groups` | `admin` + `admin.manage` | mọi nhóm (cả đã tắt), kèm số dịch vụ hiện hành mỗi nhóm và số "Chưa phân loại" |
| `POST /api/catalog/groups` | `admin` + `admin.manage` | thêm nhóm `{ name, sortOrder? }` → 201 |
| `PATCH /api/catalog/groups/:code` | `admin` + `admin.manage` | đổi `name` / `sortOrder` / `active`; khoá lạc quan theo `updated_at` |
| `PUT /api/catalog/group-assignments` | `admin` + `admin.manage` | `{ codes: string[1..50], groupCode: string \| null }` — một lô: mỗi mã thêm một dòng `ctl_service_group` + một dòng nhật ký; mã đã ở đúng nhóm thì bỏ qua (không ghi) |
| `GET /api/catalog/:code/group-history` | `admin` + `admin.manage` | lịch sử nhóm của một dịch vụ (lúc, người, nhóm) |

- POST/PUT/PATCH cần `Origin` cùng site như mọi đường ghi.
- Mỗi route ghi có dòng trong ảnh chụp `src/route-access.test.ts` và được `src/route-write-guard.test.ts` thấy hỏi bảng quyền.

### Đ5. DTO bổ sung (một nguồn: `catalogForOrderForm`)

- `CatalogServiceDto` thêm `groupCode: string | null`. `null` khi chưa phân loại **hoặc** nhóm hiện hành đang tắt.
- `CatalogPublicResponse` thêm `groups: { code: string; name: string }[]`:
  - chỉ nhóm `active = 1`;
  - xếp theo `sort_order`;
  - chỉ nhóm có ít nhất một dịch vụ đang hiện.
- `CatalogAdminItemDto` thêm `groupCode: string | null`. `CatalogAdminResponse` thêm `groups` đủ (kể cả nhóm tắt, kèm `active`, `sortOrder`, số dịch vụ).
- **Cách đọc:**
  - `groupCode` được **trộn ở `index.ts`** từ một câu đọc riêng (mã dịch vụ → nhóm hiện hành) trong tệp mới;
  - **không sửa** câu `SELECT` cũ của `repository.ts:50-59` (đường đọc giá);
  - cả hai route danh mục vẫn đi qua `catalogForOrderForm`, nên nội dung văn phòng và người lập đơn không lệch nhau (ADR-0033 "Hệ quả" gạch 4 giữ).
- **Không thêm** giá vốn, cột Sheet, thông tin ghi đè, ghi chú nội bộ. Tên nhóm là chữ do Quản trị đặt trong app, không phải cột nội bộ của Sheet sau lần gieo.

### Đ6. Hạng kiến trúc của `catalog`: tệp "nửa nghiêm", module vẫn LEGACY (lệch có hạn)

- **Mọi SQL mới** (hai bảng `ctl_`) nằm ở **một tệp mới** `src/modules/catalog/nhom-repo.ts`:
  - đăng ký bằng `defineSql`;
  - thêm tệp vào `NUA_NGHIEM` (`architecture.test.ts:107`), chịu bài `EXPLAIN` và bài `.prepare(`/`db.exec(` chuỗi thô;
  - tiền lệ ADR-0047 A3 cho `orders/chang-hanh-khach-repo.ts`.
  - Thêm tệp vào `NUA_NGHIEM` là **siết** (tệp chặt hơn phần còn lại của module), không nới.
- **Không** chuyển cả module lên `STRICT` ở ADR này. `repository.ts` cũ sẽ đỏ ngay hai bài:
  - (i) `db.prepare(\`${SELECT} …\`)` là template literal (`repository.ts:54`, `:59`), bài `rawPrepareHits` bắt;
  - (ii) `DELETE FROM catalog_override` là xoá cứng (`:166`).
  - Sửa hai chỗ đó chạm đường đọc **giá** và đường "bỏ ghi đè", ngoài phạm vi nhóm dịch vụ.
- **Lệch có hạn, ghi rõ:** chú thích LEGACY *"`catalog` … chuyển STRICT khi có SQL mới"* (`architecture.test.ts:71-72`) **không** được thi hành đầy đủ ở ADR này.
  - Điều kiện gỡ: một việc sau chạm `repository.ts` cũ thì đổi SQL cũ sang `defineSql` tĩnh, thay xoá cứng `catalog_override` bằng đóng hiệu lực, rồi đưa `catalog` vào `STRICT` và bỏ tệp khỏi `NUA_NGHIEM`.
  - Hạn đề xuất: **2027-03-31**, cùng hạn nợ `DOC_AUDIT_LOG_WONGUARD` (`:124-131`). Chủ chốt hạn (câu 2 của `cau-hoi-chu.md`).
  - Chú thích LEGACY cập nhật trỏ về ADR này.

### Đ7. Gieo một lần — migration **0046**

- **Tệp đề xuất:** `migrations/0046_nhom_dich_vu.sql`, chỉ thêm. **Số giữ chỗ, xác nhận lúc lập kế hoạch.**
  - Quét 88 nhánh ngày 30/9: `0044_orders_da_giao.sql` và `0045_billing_so_cong_no.sql` chỉ có trên `worktree-agent-aa1fab0316112d404` (sổ tiền); **0046 chưa nhánh nào dùng**.
  - `docs/adr/README.md:83` còn ghi "số kế tiếp cho việc khác là 0044" (cũ). Điều phối cập nhật khi gộp.
- **Nội dung:**
  1. tạo hai bảng + trigger (chặn `DELETE` `ctl_group`; chặn `UPDATE`/`DELETE` `ctl_service_group`; chặn gán vào nhóm tắt);
  2. `INSERT` **14 dòng `ctl_group`** bằng giá trị viết sẵn (bảng gieo ở trên, `sort_order` theo thứ tự bảng);
  3. `WITH v(code, group_code) AS (VALUES ('TDMCT1','TDA'), …) INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, …) SELECT …, v.code, v.group_code, 1, …, … FROM v JOIN catalog_item i ON i.code = v.code` cho **110 cặp** (ATV → `KON` hoặc theo câu trả lời của chủ). Đặt tên cột bằng danh sách cột của CTE vì `FROM (VALUES …)` trong SQLite chỉ có tên cột tự sinh `column1`, `column2`. `seq` = 1, `created_by` NULL (hệ thống), `valid_from_at` = lúc áp;
  4. một dòng `audit_log` `catalog_groups_seeded`, `detail` "gieo 14 nhóm, N dịch vụ" (N đếm được lúc áp).
- **§2.5 đặc tả giữ nguyên:**
  - giá trị gieo là **chữ viết sẵn trong migration**, do người soạn chép từ ảnh chụp CSV và chủ xác nhận;
  - **mã app không đọc** cột "Ghi chú nội bộ" hay cột 14, lúc gieo cũng như về sau;
  - `sheet.ts`, `service.ts`, đồng bộ 15 phút **không đổi** (bài hiện có ở `src/modules/catalog/sheet.test.ts` canh bộ đọc cột).
- **Hệ quả của `JOIN catalog_item`:**
  - D1 production đã có đủ dịch vụ, nên cả 110 dòng được gieo. Bước kiểm sau áp là câu chỉ-đọc đếm dòng `ctl_service_group`, phải bằng số mã gieo có mặt trong `catalog_item`; câu này nằm trong runbook.
  - D1 local / e2e mới tinh (chưa đồng bộ) được 14 nhóm và 0 dòng gán: mọi dịch vụ là "Chưa phân loại". Kịch bản e2e tự gán bằng route.
  - Mã có trong bảng gieo nhưng biến mất khỏi Sheet trước lúc áp thì không được gieo, và rơi về "Chưa phân loại" khi quay lại.

### Đ8. Bộ lọc ở form đơn (giao diện — cửa hai chiều)

- Hàng **chip** ngay trên ô "Chọn từ danh mục" (`web/catalog-picker.ts`):
  - "Tất cả";
  - các nhóm của `groups`;
  - "**Chưa phân loại**", chỉ hiện khi có dịch vụ `groupCode = null`.
- **Dịch vụ nhập tay không thuộc nhóm nào và không nằm trong bộ lọc** (ADR-0061 accepted 30/9, phiên khác, mở lại "Dịch vụ nhập tay" có công tắc): dịch vụ nhập tay có `catalog_code` NULL, không có dòng `catalog_item`, nên không thể có dòng `ctl_service_group`; nó được thêm bằng nút "+ Dịch vụ nhập tay" riêng, không qua ô "Chọn từ danh mục". Chip nhóm, "Chưa phân loại" và số "N dịch vụ" **chỉ đếm dịch vụ danh mục**; nút nhập tay hiện/ẩn theo ADR-0061, không phụ thuộc chip đang chọn.
- **Chọn một chip một lúc.**
- Khi đang lọc: dòng nhãn **"Đang lọc: <tên nhóm> — N dịch vụ"** (N = số dịch vụ đang hiện của nhóm) + nút "Bỏ lọc".
- Ô tìm lọc **trong** nhóm đang chọn. Trần 40 kết quả (`catalog-picker.ts:21`) giữ; nhóm lớn nhất hôm nay 23.
- Nhãn "đã chọn" của bản 1.39 (`catalog-picker.ts:16@824193f1`) giữ nguyên.
- **Nhớ lựa chọn theo từng người trên máy:**
  - `localStorage`, khoá gồm id tài khoản (vd `loc-nhom-dv:<staffId>`), mọi đọc/ghi bọc `try/catch` (khuôn `web/khung-nho.ts:5`, `web/help-seen.ts:1`);
  - bị chặn thì coi như "Tất cả";
  - nhóm đã nhớ không còn trong `groups` thì về "Tất cả";
  - **không** mặc định theo vai.
- **Màn Danh mục (Quản trị):**
  - mỗi dịch vụ có ô chọn nhóm (`web/catalog.ts`);
  - khối "Nhóm dịch vụ": thêm, đổi tên, sắp thứ tự, tắt;
  - chọn nhiều dịch vụ để chuyển nhóm một lần;
  - xem lịch sử nhóm của một dịch vụ.
- Luật giao diện `web/CLAUDE.md`: dựng bằng `h()`, không `innerHTML`, giá trị CSS vào token, chip có vùng bấm ≥ 44px. Chủ duyệt ảnh chụp (kịch bản Chrome); nếu chủ muốn vẽ trước thì vẽ ở Claude Design.

---

## Câu thay trong ADR cũ (nguyên văn → mới)

Tệp ADR cũ **không** sửa; `docs/adr/README.md` do điều phối cập nhật.

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0033 điều 2 | "**Nội dung trả về đúng `CatalogPublicResponse` như hôm nay** nhân viên văn phòng thấy: tên, đơn vị, giá bán lẻ hiệu lực theo loại khách (đã áp ghi đè của quản trị), ghi chú độ tuổi cho khách, cờ `supported`; chỉ dịch vụ đang hiện." | "… ghi chú độ tuổi cho khách, cờ `supported`, **nhóm của dịch vụ (`groupCode`) và danh sách nhóm đang dùng (`groups`: mã, tên)** (ADR-0058 Đ5); chỉ dịch vụ đang hiện." Phần còn lại của điều 2 (không giá vốn, không cột nội bộ Sheet, `sync.error` chỉ văn phòng) **giữ**. |
| ADR-0028 điều 2 | "**Chỉ đọc**, nội dung **giống hệt** nhân viên văn phòng thấy: tên, đơn vị, giá bán lẻ theo loại khách, ghi chú độ tuổi, trạng thái đồng bộ." | "… ghi chú độ tuổi, **tên nhóm dịch vụ**, trạng thái đồng bộ." — vẫn **giống hệt** văn phòng thấy (một hàm dựng). |
| ADR-0033 / ADR-0028 "Trang ghép" dòng 1 | "chỉ **đọc** bảng danh mục của module `catalog` (`catalog_item`, `catalog_override`, `catalog_sync` …)" | thêm `ctl_group`, `ctl_service_group` vào danh sách bảng **đọc** của hai route danh mục. |
| ADR-0028 điều 3 | "Mọi thao tác quản trị danh mục (`/api/catalog/admin`, đồng bộ, sửa giá, ẩn/hiện, gỡ ghi đè, xác nhận) giữ cổng `admin`." | thêm "**quản lý nhóm và gán nhóm** (`/api/catalog/groups*`, `/api/catalog/group-assignments`, lịch sử nhóm)" vào danh sách, cùng cổng `admin` + `admin.manage`. |
| ADR-0054 D10.1 | (không nhắc nhóm) | **không đổi.** Mẫu chặng `vc_leg_template` ở `van-chuyen` và nhóm dịch vụ ở `catalog` độc lập; cùng khuôn "trong app, có lịch sử, không phải cột Sheet". |
| Đặc tả §2.5 | "**Không đọc** `Khoá giá`, `Đường dẫn` (logic booking) và `Ghi chú nội bộ`." | **không đổi** (lời chủ). Gieo là giá trị viết sẵn trong migration, không phải app đọc. |

## Hệ quả

- **Kiến trúc:**
  - hai bảng mới trong `catalog`, tiền tố `ctl_` (nới `TABLE_PREFIX`, chủ duyệt);
  - tệp nửa nghiêm `catalog/nhom-repo.ts` (siết);
  - **không cạnh module mới**; không module khác đọc bảng `ctl_` (không cần view công bố).
  - Sau này module khác cần nhóm (vd báo cáo theo nhóm) thì thêm view `v_ctl_*` bằng ADR.
- **Sổ dữ liệu:** `docs/data-dictionary.json` thêm hai bảng + trigger, rồi `npm run dict`.
- **Dữ liệu đơn không đổi:** đơn không lưu nhóm. Đổi nhóm không ảnh hưởng đơn đã có, giá, tiền.
- **Đối tác, Thực tập thấy tên nhóm** (mới), cùng nội dung văn phòng thấy.
- **Dịch vụ mới trên Sheet** vào "Chưa phân loại" cho tới khi Quản trị gán. Chip "Chưa phân loại" chính là lời nhắc.
- **Sheet và app có thể lệch nhóm** sau khi Quản trị sửa trong app. Cố ý: chủ chọn app là nơi quản lý, Sheet dùng chung với website `tourdaovn`.
- **Việc lớn** (dữ liệu: schema, migration, gieo dữ liệu thật; nới hàng rào) ⇒ sau thi công phải có **người kiểm độc lập chỉ đọc** (CLAUDE.md §3). Chỉ báo "đạt" dựa trên báo cáo người kiểm + test.
- **Tài liệu mô tả:** `docs/SYSTEM-DESIGN.md` §5, §7, §9; `docs/CHANGE-GUIDE.md`, sửa cùng commit mã.

## Cửa một chiều / hai chiều

- **Một chiều (nhẹ):** chủ bảng + tiền tố `ctl_`; tên bảng; dòng gán đã ghi (chỉ-thêm).
- **Hai chiều:** tên, thứ tự, bật/tắt nhóm; giao diện chip; khoá `localStorage`; luật "tắt nhóm còn dịch vụ → 409".
- Không có cửa một chiều nào về tiền hay dữ liệu cá nhân.

## Phương án bị loại

- **Đọc cột nhóm của Sheet định kỳ:** chủ loại. Còn trái §2.5 (cột "Ghi chú nội bộ"), và cột mã nhóm không có tiêu đề nên dễ vỡ khi ai đó sửa Sheet.
- **Suy nhóm từ tiền tố mã dịch vụ:** mã không theo nhóm (`ZIP`, `ATV`, `SM1`; `TT`/`TTB`/`TB` đè nhau).
- **Thêm cột `group_code` vào `catalog_override`:** bảng đó ghi đè tại chỗ, khoá `code`, không lịch sử (`0006:44-51`), có đường xoá cứng (`repository.ts:166`). Chủ đòi có lịch sử (khuôn ADR-0054).
- **Thẻ nhiều-nhiều ngay:** chủ để sau. Chuyển sang nhiều-nhiều sau = bảng mới, không phá bảng này.
- **Chuyển cả `catalog` lên STRICT trong ADR này:** chạm đường đọc giá và xoá cứng ghi đè (Đ6); nở phạm vi.
- **Mặc định chip theo vai:** chủ loại.
- **Tham chiếu logic (không khoá ngoại) như ADR-0054:** không cần, vì cùng module. Khoá ngoại cho toàn vẹn ở CSDL (5.1). Giá phải trả: gieo cần `JOIN catalog_item` (Đ7).

## Bài kiểm / hàng rào (mỗi hàng rào mới có dòng `docs/SO-HANG-RAO.md` kèm ngày thấy chặn thật: sửa cố ý → đỏ → hoàn nguyên)

1. **SQL (`node:sqlite`, `src/migrations-0046.test.ts`):**
   - `UPDATE`/`DELETE` `ctl_service_group` → `RAISE`;
   - `DELETE` `ctl_group` → `RAISE`;
   - gán vào nhóm `active = 0` → `RAISE`;
   - `service_code` không có trong `catalog_item` → lỗi khoá ngoại;
   - trên D1 có đủ 110 mã: đúng 14 nhóm, 110 dòng gán (`seq` = 1), ATV → nhóm đã chốt; mỗi `service_code` một dòng hiện hành;
   - chèn trùng `(service_code, seq)` → lỗi khoá duy nhất (hai lệnh gán đua → một thắng, bên kia 409).
2. **Kiến trúc:**
   - `ctl_` → `catalog`;
   - bảng mới có WHO, không `CASCADE`, khoá mã;
   - `nhom-repo.ts` trong `NUA_NGHIEM`, `EXPLAIN` chỉ chạm `ctl_*`, `catalog_item`, và `audit_log` qua `auditStatement`;
   - `LEGACY_TABLES` **không** thêm tên (bài `architecture.test.ts:664`).
3. **Route:**
   - Quản trị, Toàn quyền → 200/201;
   - Bán hàng, Kế toán, HDV, Đối tác, Thực tập → 403 ở mọi route ghi nhóm, hỏi quyền trước khi đọc thân;
   - gán 51 mã → 400;
   - tắt nhóm còn dịch vụ → 409;
   - đổi tên trùng nhóm đang dùng → 409.
4. **Bài liệt kê khoá DTO** (khuôn `src/modules/catalog/danh-muc-lap-don.test.ts`):
   - `for-order` và `/api/catalog` trả **đúng** tập khoá cũ + `groupCode` / `groups`;
   - hai route trả nội dung bằng nhau trừ `sync.error`;
   - HDV, Kế toán vẫn 403 ở `for-order`.
5. **Nhật ký:** gán nhóm → một dòng `catalog_group_assigned` mỗi dịch vụ, `detail` "cũ → mới", không SĐT/email.
6. **Bộ đọc Sheet không đổi:** `sheet.test.ts` xanh; thêm ca "CSV có cột 'Ghi chú nội bộ' chứa tên nhóm → `CatalogInput` không có trường nhóm".
7. **Giao diện (kịch bản Chrome, 390px + máy tính):**
   - chip hiện đúng nhóm;
   - bấm "Thể thao biển" → nhãn "Đang lọc: Thể thao biển — 23 dịch vụ", danh sách chỉ nhóm đó;
   - "Chưa phân loại" hiện khi có dịch vụ chưa gán;
   - tải lại trang → vẫn nhớ; tài khoản khác cùng máy → không nhớ lẫn;
   - `localStorage` bị chặn → "Tất cả", không lỗi.
8. `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`. Câu kiểm bất biến mới (cảnh báo): "dịch vụ đang hiện mà chưa phân loại".

## Câu hỏi còn mở (đã gom vào `cau-hoi-chu.md`, hỏi một lần)

- **Câu 1** — gieo **14 nhóm** như Sheet hôm nay (lời chọn ghi 15), và **ATV thuộc Kong Forest** (Sheet ghi nhầm mã Tháp Bà). Khuyến nghị: 14 nhóm, ATV → Kong Forest.
- **Câu 2** — hạn gỡ lệch "module danh mục còn hạng cũ" (Đ6). Khuyến nghị: 2027-03-31.
- Đã bỏ câu "giữ hay sửa cách viết 14 tên nhóm": việc bề mặt, Quản trị đổi tên trong app bất cứ lúc nào — ghi ở Giả định.

## Giả định người soạn tự áp (bề mặt, đổi lại được — ghi để chủ xem)

- Tắt nhóm còn dịch vụ → 409, không tự đẩy dịch vụ về "Chưa phân loại". Hoàn tác: đổi một nhánh luật ở route.
- Chip chọn **một** nhóm một lúc; không chọn nhiều. Hoàn tác: giao diện.
- `groups` trong DTO cho form chỉ gồm nhóm có dịch vụ đang hiện (không hiện chip rỗng). Hoàn tác: một điều kiện lọc.
- Mã nhóm mới do máy chủ sinh, không hiện cho người dùng.
- Tên 14 nhóm gieo giữ đúng cách viết của Sheet ("Harbour", "Vinwonders", "I Resort"…). Hoàn tác: Quản trị đổi tên trong app.

## Chưa kiểm

- Mọi dòng CSV đã khớp mã `catalog_item` trên **production** hay chưa (chưa đọc D1 remote). Bước kiểm sau áp ở Đ7 bắt được.
- *(Đã kiểm:)* `audit_log` không còn `CHECK` liệt kê hành động từ `0007` (`migrations/0007_audit_open_actions_catalog_code_money_guards.sql:10-11`: `action TEXT NOT NULL -- kiểm ở code`, `target_type` kiểm ở code) ⇒ ba hành động mới + `catalog_groups_seeded` không cần migration riêng; dòng nhật ký gieo trong `0046` hợp lệ về cấu trúc.
- Nhánh `worktree-agent-*` tạo **sau** lần quét 30/9 có thể lấy 0046. Lập kế hoạch thì quét lại.
- Bản nháp này **đã qua kiểm độc lập 2 vòng** (ĐẠT CÓ ĐIỀU KIỆN, các điều kiện đã sửa ở commit này); bản sửa theo vòng 2 **chưa được kiểm lại**.
