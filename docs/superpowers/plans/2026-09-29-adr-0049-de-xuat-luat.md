# ADR-0049 (Bảng điều phối chung, lượt 1) — đề xuất sửa luật (CHỜ CHỦ DUYỆT)

- **Ngày:** 2026-09-29.
- **Người soạn:** phiên lập kế hoạch ADR-0049 (nhánh `worktree-agent-ac68c5ff0d389ca6c`). Kế hoạch đi kèm: `docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md`. Người thi công **điền lại số dòng thật** ở Task A20 và bước B-kết (mục 5 của tệp này).
- **Vì sao có tệp này:**
  - Hiến pháp N9: AI không tự sửa luật chi phối chính mình.
  - Điều 9.4: hàng rào đã duyệt chỉ được SIẾT; NỚI phải có chủ duyệt.
  - Tiền lệ T2b (`docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md` mục 1), Vận chuyển 1a (`docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md`), ADR-0048 (`docs/superpowers/plans/2026-09-29-adr-0048-de-xuat-luat.md`): **ADR đã có chữ, nhưng sửa hàng rào không tự thành được phép.**
- **Căn cứ:** `docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md` (accepted 2026-09-29):
  - D1 "Cạnh mới" (:64–66);
  - D3 "Nới hàng rào đã ghim (Điều 9.4)" (:205);
  - D3 danh sách trường cho tài xế (:231–239);
  - D3 "Hàng rào 2 được siết" (:212);
  - bảng "Câu ADR bị thay" (:253–274).
- **Trạng thái:** **CHỜ CHỦ DUYỆT.** Duyệt xong mới gộp. Mỗi tệp luật một commit, sửa đúng diff dưới đây (kế hoạch Task K3).
- **Số dòng:** đo lúc lập kế hoạch:
  - trên `main` = `ce831f8` cho `src/architecture.test.ts`, `docs/ARCHITECTURE.md`, `src/CLAUDE.md`, `CLAUDE.md`. Bốn tệp này giống hệt ở `8675cbb`;
  - trên nhánh ADR-0048 `3d8f4b0` cho `src/shared/permissions.test.ts`;
  - trên nhánh ADR-0047 `6bb67c8` cho `src/hanh-khach-khong-lo-ten.test.ts`.
  - Hai nhánh nền chưa lên `main`, nên số dòng sẽ lệch sau khi gộp. Người thi công đo lại.
- **Người thi công làm gì với phần NỚI** (kế hoạch I30):
  - **thi công trong mã** mục 1 và mục 2 (cần để mã chạy), kèm chú thích "CHỜ CHỦ DUYỆT";
  - **không** sửa tệp luật thật (`CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/adr/`);
  - **không** gộp khi chưa duyệt.
  - Chủ KHÔNG duyệt mục nào thì hoàn nguyên phần mã tương ứng (cột "Nếu chủ KHÔNG duyệt").

---

## Tóm tắt cho chủ (lời thường)

| # | Việc | Loại | Vì sao cần | Nếu bạn KHÔNG duyệt |
|---|---|---|---|---|
| 1 | Cho phân hệ Vận chuyển **đọc** thông tin chặng đưa đón của đơn và danh sách địa điểm | **Nới** một hàng rào kiến trúc | Chuyến xe phải trỏ tới chặng đưa đón (để biết khách nào lên xe nào) và tới địa điểm (khách sạn, cảng). Bạn đã duyệt ở ADR-0049; hàng rào máy cần được mở đúng hai lối này | Cả Bảng điều phối không làm được |
| 2 | Cho **tài xế công ty** xem chuyến mình lái và bấm tiến độ | **Nới** bài khoá quyền của tài xế | Hôm nay tài xế bị khoá mọi thứ trừ giấy tờ của mình. Bạn đã duyệt cho tài xế thấy chuyến mình và tự bấm Xuất bến / Đã đón… | Tài xế không dùng app cho chuyến; văn phòng phải bấm thay mọi nút |
| 3 | Họ tên, năm sinh khách được hiện trên màn **tài xế** (chỉ trong ngày chạy, chỉ chuyến mình lái) | **Nới** nghĩa một hàng rào dữ liệu cá nhân | Hàng rào hôm nay ghi "tên khách chỉ ra khỏi máy chủ ở màn danh sách khách của đơn". Bạn đã duyệt cho tài xế thấy tên trong ngày chạy | Tài xế chỉ thấy số người, không thấy tên; phải gọi văn phòng hỏi |
| 4 | Hai chỗ trong Hiến chương Phần II viết khác cách ADR-0049 chống "hai người sửa cùng lúc" | **Mâu thuẫn — bạn quyết** | Phần II viết "dùng giờ sửa cuối + dò nhật ký". ADR-0049 (bạn đã duyệt) dùng "số phiên bản + dấu lệnh", vì phân hệ Vận chuyển không được đọc nhật ký. Hiến chương đứng trên ADR, nên phải sửa chữ Hiến chương cho khớp | Phải có quyết định mới đổi cách chống sửa trùng của chuyến xe; thi công dừng ở phần chuyến |
| 5–8 | Cập nhật mô tả trong ba tệp luật cho AI (`CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md`) và sổ hàng rào | Mô tả, theo nội dung đã duyệt | Tài liệu luật phải khớp mã | AI phiên sau đọc luật cũ, dễ làm sai |

- **Đếm:** ba mục nới hàng rào (1, 2, 3), đều là nội dung ADR-0049 đã duyệt. Thêm một quyết định luật **mới** (mục 4) → **bốn** quyết định chạm quyền / dữ liệu, **vượt trần 3** của `CLAUDE.md` §9 (như đề xuất luật ADR-0047).
- **Đề nghị điều phối:** trình mục 4 **riêng, trước** (nó quyết cách viết mã phần chuyến). Mục 1–3 trình một lượt sau.
- **Siết** (không cần duyệt riêng, ghi để bạn biết): mục "Bù lại" ở cuối tệp.

---

## Mục 1 — NỚI `ALLOWED_EDGES`: cạnh `van-chuyen → orders`, `van-chuyen → locations`

| # | Chỗ sửa | Đổi | Nguồn câu ADR | Nếu chủ KHÔNG duyệt |
|---|---|---|---|---|
| 1a | `src/architecture.test.ts:47` (chú thích :44–46) | `"van-chuyen": ["parties", "audit"],` → `"van-chuyen": ["parties", "audit", "orders", "locations"],`. Chú thích thêm một dòng: "ADR-0049 D1: suất trỏ chặng `ord_transfer_leg` + hàm hẹp của `orders` (chỉ gọi trong thân route sau `can()`); điểm dừng trỏ `loc_location`. Vẫn KHÔNG module nào import van-chuyen. NỚI hàng rào (Điều 9.4) — CHỜ CHỦ DUYỆT → 'đã duyệt <ngày>'" | ADR D1 :64–67 ("Cạnh mới"); "Câu ADR bị thay" ADR-0040 D1 (:263), ADR-0002 (:273) | Khoá ngoại `vc_trip_allocation.leg_id → ord_transfer_leg`, `vc_trip_stop.location_id → loc_location` và mọi lời gọi hàm của `orders` bị bài kiến trúc chặn. **Cả lượt 1 dừng.** Hoàn nguyên: gỡ hai tên; migration 0042 không áp được |

- **Không nới thêm:**
  - không thêm cạnh ngược (`orders → van-chuyen`): `orders` nhận mốc 6 giờ qua hàm tiêm `ctx.mocToiThieu` (ADR D2, ADR-0007 điều 4(b));
  - `TABLE_PREFIX`, `VIEW_PREFIX`, `LEGACY`, `KHONG_DB` giữ nguyên;
  - `STRICT` chỉ **thêm** tệp `modules/van-chuyen/chuyen-repo.ts` (siết: thêm tệp bị bài EXPLAIN soi).

## Mục 2 — NỚI bài ghim cả hàng `DRIVER`

| # | Chỗ sửa | Đổi | Nguồn câu ADR | Nếu chủ KHÔNG duyệt |
|---|---|---|---|---|
| 2a | `src/shared/permissions.test.ts:274-286@3d8f4b0` — bài `"ADR-0040 D3: MỌI ô của Tài xế (DRIVER) — ghim nguyên dòng"`, hằng `DRIVER_ROW` (:275–285) | Thêm `"trip.view": "assigned"`, `"trip.progress": "assigned"`. Thêm `"trip.dispatch": "none"`, `"trip.override": "none"`, `"order.leg.short_notice": "none"`. Tên bài → `"ADR-0040 D3 + ADR-0049 D3: MỌI ô của Tài xế (DRIVER) — ghim nguyên dòng"`. Ba ô cũ (`feedback.submit` any, `feedback.view` own, `party.document.view` own) giữ nguyên | ADR D3 :205 ("bài ghim hàng `DRIVER` (ADR-0040) đổi từ 'mọi ô nghiệp vụ `none`' sang 'đúng `trip.view`, `trip.progress` là `assigned`'"); "Câu ADR bị thay" ADR-0040 D3 (:264) | Tài xế công ty không dùng app cho chuyến (như tài xế đối tác ở lượt này). Văn phòng bấm thay mọi nút tiến độ. Route tài xế (kế hoạch mục 1.7, 19–29) vẫn làm được cho văn phòng; hoàn nguyên hai ô về `none` |
| 2b | `docs/SO-HANG-RAO.md:104@3d8f4b0` (dòng "Bài ghim hàng `DRIVER` … ADR-0040 D3") | Cột "Chặn cái gì": `lượt 1a mọi ô none, trừ party.document.view = own, feedback.submit = any, feedback.view = own` → `… trừ party.document.view = own, feedback.submit = any, feedback.view = own; từ ADR-0049: trip.view = assigned, trip.progress = assigned (chuyến mình đang lái)`. Thêm ngày thấy chặn thật của bài đã sửa | như trên | — (mô tả) |

- **Không nới:** hàng `DRIVER_PARTNER` giữ nguyên nghĩa (mọi `trip.*` = `none` — ADR D3 :205, "Câu ADR bị thay" ADR-0048 :274). Chỉ thêm năm khoá mới đều `none`.

## Mục 3 — NỚI nghĩa hàng rào "họ tên, năm sinh hành khách không lọt" (ADR-0047 A2)

Hàng rào này nằm ở nhánh ADR-0047 (chưa lên `main`). Nó phải lên `main` trước (kế hoạch mục 2.1).

| # | Chỗ sửa | Đổi | Nguồn câu ADR | Nếu chủ KHÔNG duyệt |
|---|---|---|---|---|
| 3a | `src/hanh-khach-khong-lo-ten.test.ts:39@6bb67c8` — tên bài `"họ tên, năm sinh hành khách chỉ rời máy chủ ở GET/POST /passengers: …"`; chú thích đầu tệp :1–10 | Tên bài → `"… chỉ rời máy chủ ở GET/POST /passengers và DTO chuyến của tài xế GET /api/van-chuyen/cuoc-cua-toi/:id (chỉ trong ngày chạy — ADR-0049 D3): …"`. Chú thích thêm một đoạn: "(6) ADR-0049: DTO tài xế có `hoTen`, `namSinh` chỉ khi `trongNgayChay`; ngoài khoảng đó khoá vắng mặt (bài `src/modules/van-chuyen/tai-xe-dto.test.ts`). Mọi lệnh ghi của van-chuyen có ca ở khối van-chuyen: nhật ký và cột chữ `vc_*` sạch." Bài **thêm** khối kiểm van-chuyen (siết) | ADR D3 :236 ("trong ngày chạy: họ tên + năm sinh khách của chuyến; tên + SĐT người liên hệ…"); "Câu ADR bị thay" ADR-0047 A3 (:267) | DTO tài xế bỏ `hoTen`, `namSinh`, `lienHe`. Màn tài xế chỉ hiện số người. Bản chốt danh sách vẫn trỏ dòng hành khách (không đổi) |
| 3b | `docs/SO-HANG-RAO.md:138@6bb67c8` (dòng "Toàn tuyến 'họ tên, năm sinh hành khách không lọt' …") | Cột "Chặn cái gì" thêm: "… — trừ DTO tài xế `GET /api/van-chuyen/cuoc-cua-toi/:id` trong ngày chạy (ADR-0049); ngoài ngày chạy khoá vắng mặt". Cột "Ghi chú": trỏ dòng mới của bài DTO | như trên | — (mô tả) |

**Kèm, cùng loại dữ liệu:** SĐT người liên hệ (`orders.customer_phone`) tới tay tài xế qua `lienHeChoTaiXe` trong ngày chạy. ADR D3 và "Câu ADR bị thay" ADR-0047 A3 đã duyệt. Hôm nay **chưa hàng rào nào** ghi "SĐT người liên hệ chỉ ở màn đơn", nên không có gì để nới. Kế hoạch thêm bài siết (DTO ngoài ngày chạy không có `lienHe`).

## Mục 4 — `docs/ARCHITECTURE.md` Phần II và `src/CLAUDE.md` viết khác ADR-0049 — MÂU THUẪN, CHỦ QUYẾT

**Xung đột:**
- ADR-0049 D1 "Thứ tự lô" (:98–117) và bảng `vc_trip` (:82) dùng cột **`version`** (khoá lạc quan) + **dấu lệnh `last_cmd_id`**. Các câu sau trong lô mang `EXISTS (SELECT 1 FROM vc_trip WHERE id = :T AND last_cmd_id = :cmd)`.
- ADR ghi lý do ở "Phương án bị loại" (:363): "Cổng lô bằng `EXISTS(audit_log)`: `van-chuyen` là module nghiêm, không được đọc `audit_log`."
- Phần II viết hai câu khác:
  - `docs/ARCHITECTURE.md:194`: "… khoá lạc quan bằng `updated_at`."
  - `docs/ARCHITECTURE.md:215`: "Batch ghi nhiều bảng sau một `UPDATE` điều kiện …: các câu sau mang `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)` …"
- `src/CLAUDE.md:26` nhắc lại câu :215: "dùng khoá lạc quan `updated_at` + `wonGuard` (`EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`)".
- `CLAUDE.md` §2 xếp "Hiến chương + luật ở `docs/ARCHITECTURE.md`" **trên** mọi ADR. AI không tự hoà giải.

**Phương án:**
- (a) **Sửa Phần II cho khớp ADR-0049** (diff dưới). Được: giữ đúng quyết định bạn đã duyệt; hai câu Phần II thành "cách mặc định", thêm một khuôn cho module nghiêm cần lô nhiều câu. Mất: Phần II có hai khuôn thay vì một.
- (b) **Giữ Phần II, đổi cách làm của chuyến xe** cho khớp (dùng `updated_at` + một view nhật ký mới cho `van-chuyen`). Được: một khuôn. Mất: phải có ADR mới thay câu của ADR-0049. Cần một view `v_aud_*` mới — ADR-0049 đã loại vì phức tạp hơn. Thi công phần chuyến dừng tới khi có ADR đó.
- **Khuyến nghị: (a).**

**Diff (áp khi chủ chọn (a)):**

`docs/ARCHITECTURE.md:194` — chỉ đổi đoạn cuối câu:
```diff
-… khoá ngoại `NO ACTION`; khoá lạc quan bằng `updated_at`.
+… khoá ngoại `NO ACTION`; khoá lạc quan bằng `updated_at` — trừ bảng gốc của một lô nhiều câu ở module nghiêm: cột `version INTEGER` tăng ở câu cổng (ADR-0049 D1, `vc_trip`).
```

`docs/ARCHITECTURE.md:215` — giữ nguyên câu cũ, thêm một câu cuối:
```diff
 - Batch ghi nhiều bảng sau một `UPDATE` điều kiện (vd sửa đơn nháp): các câu sau mang `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)` với id nhật ký do request tự sinh (`AuditInput.id`) — dòng chỉ được chèn khi `changes() > 0`, nên có mặt ⇔ UPDATE của chính request đó đã thắng. Không so mốc thời gian để suy ra ai thắng.
+  Module NGHIÊM không đọc `audit_log`: câu cổng đặt **dấu lệnh** (`last_cmd_id` = id riêng của request) lên chính dòng gốc (`UPDATE … SET version = version + 1, last_cmd_id = ? WHERE id = ? AND version = ?`), nhật ký `changes() > 0` đứng ngay sau, mọi câu sau mang `EXISTS (SELECT 1 FROM <bảng gốc> WHERE id = ? AND last_cmd_id = ?)`; câu đổi sang trạng thái cuối đứng cuối lô (ADR-0049 D1 "Thứ tự lô"; bài `src/modules/van-chuyen/thu-tu-lo.test.ts`).
```

`src/CLAUDE.md:26`:
```diff
-- Ghi nhiều bảng sau một `UPDATE` điều kiện: dùng khoá lạc quan `updated_at` + `wonGuard` (`EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`), không so mốc thời gian để suy ra ai thắng.
+- Ghi nhiều bảng sau một `UPDATE` điều kiện: dùng khoá lạc quan `updated_at` + `wonGuard` (`EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`), không so mốc thời gian để suy ra ai thắng. Module nghiêm (không đọc `audit_log`) dùng `version` + dấu lệnh `last_cmd_id` trên dòng gốc (ADR-0049 — `vc_trip`; khuôn ở `docs/ARCHITECTURE.md` Phần II "Luật dữ liệu").
```

**Nếu chủ KHÔNG duyệt (chọn (b)):** kế hoạch dừng ở Task A12 (migration 0042), A13, A14, A15. Phần chính sách (A1–A7), luật thuần (A3, A4, A8), phía `orders` (A9–A11) làm tiếp được.

## Mục 5 — `web/CLAUDE.md` bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" (:28–59) — điền ở bước B-kết

Dòng dự kiến (người thi công điền tên kịch bản và số bước thật theo bản vẽ):

| Phần giao diện | Kịch bản |
|---|---|
| Điều phối xe ngày D (`web/dieu-phoi.ts`) | `dieu-phoi-smoke.mjs` + `trang-chu-smoke.mjs` (menu thêm "Điều phối xe" — sửa số mục ở `web/CLAUDE.md:53`) |
| Chi tiết chuyến, tạo/sửa chuyến (`web/chuyen.ts`, …) | `chuyen-smoke.mjs`, `chuyen-sua-smoke.mjs` |
| Cuốc của tôi (`web/tai-xe.ts`), chuyến đang chạy, xuất bến (`web/cuoc.ts`) | `tai-xe-trang-dau-smoke.mjs` (mở rộng), `cuoc-smoke.mjs` |
| Biểu mẫu đơn — mốc 6 giờ, đặt gấp (`web/order-form.ts`, `web/order.ts`) | kịch bản biểu mẫu đơn hiện có + `dat-gap-smoke.mjs` |
| Chính sách điều phối, danh mục lý do | `chinh-sach-dieu-phoi-smoke.mjs` |

## Mục 6 — `src/CLAUDE.md` (luật theo thư mục)

Thêm câu, giữ nguyên phần trước của mỗi dòng.

`src/CLAUDE.md:13` (đọc xuyên module):
```diff
 - Đọc xuyên module **chỉ qua view công bố** `v_<tiền tố>_*` (chỉ đọc, chỉ khoá + nhãn). Không JOIN thẳng bảng của module khác.
+  Hàm đọc hẹp KHÔNG tự kiểm quyền của `orders` (`soKhachHieuLuc`, `hanhKhachChoChuyen`, `lichChungChang`, `lienHeChoTaiXe`) chỉ gọi trong THÂN một `route(…)` của `index.ts`, SAU `can(` (bài `src/orders-cong-bo.test.ts`); tệp `service.ts`/`dieu-phoi.ts` nhận dữ liệu do route truyền xuống.
```

`src/CLAUDE.md:15` (`orders` không import `dispatch`):
```diff
 … route dùng ô `ownOrAssigned` phải truyền `assigned` vào `can()`.
+  `orders` cũng KHÔNG import `van-chuyen` (không module nào import nó): mốc 6 giờ tới `orders` qua `ctx.mocToiThieu` do gốc lắp ráp tiêm (ADR-0049 D2); thiếu → chặn, không đoán con số.
```

`src/CLAUDE.md:20` (vai hồ sơ / chữ `DRIVER`) — thêm cuối dòng:
```diff
+ Quyền `DRIVER` (ADR-0049 D3) chỉ có `trip.view`, `trip.progress` phạm vi `assigned` = đang có dòng lái mở (`vc_trip_driver`) với `driver_party_id = staff.partyId` — tính trong `van-chuyen`, KHÔNG dùng `ctx.isAssigned` (người phụ trách đơn); chuyến không phải của mình → 404. Nhật ký `trip_*` ghi `order_id` NULL (lịch sử đơn không lộ chuyến cho HDV/Đối tác).
```

## Mục 7 — `CLAUDE.md` gốc

`CLAUDE.md` §3 cho AI tự sửa số đếm, không cho thêm quy tắc. Mục này thêm một bẫy mới nên đưa chủ duyệt. **§1 dòng 10 không đổi**: không thêm mã quyền.

**7a. §10, thêm một gạch sau dòng :122** ("Giấy tờ của người + chữ `DRIVER`"):
```diff
+- **Điều phối xe** (ADR-0049, migration `0040`–`0042`): mốc 6 giờ chặn **xác nhận** đơn có chặng dưới mốc tới khi Quản trị/Toàn quyền bấm "Đặt gấp" — bài/e2e xác nhận đơn đón trong ngày phải đặt chính sách mốc 0 ở khung thử; chỉ route đặt gấp ghi `short_notice_*`. Luật lõi chuyến ở CẢ trigger lẫn máy chủ; lệnh chuyến là MỘT `db.batch` theo thứ tự cổng → nhật ký → câu có dấu lệnh → trạng thái cuối (bài `thu-tu-lo.test.ts`); mỗi suất một câu `INSERT`. Tên, năm sinh, SĐT khách chỉ trong DTO tài xế **trong ngày chạy**. Chi tiết: `docs/CHANGE-GUIDE.md` công thức <điền>.
```

**7b. §10 dòng :119** ("`orders` KHÔNG import `dispatch`") — thêm vế:
```diff
-- `orders` KHÔNG import `dispatch`; "đang là người phụ trách" do gốc lắp ráp tiêm (`ctx.isAssigned`); route dùng ô `ownOrAssigned` phải truyền `assigned` vào `can()`.
+- `orders` KHÔNG import `dispatch` (và không import `van-chuyen`); "đang là người phụ trách" do gốc lắp ráp tiêm (`ctx.isAssigned`), mốc 6 giờ cũng vậy (`ctx.mocToiThieu`); route dùng ô `ownOrAssigned` phải truyền `assigned` vào `can()`.
```

## Mục 8 — `docs/ARCHITECTURE.md`: mô tả đi cùng (theo nội dung đã duyệt, không phải quyết định mới)

**8a. Phần II, sơ đồ tầng, dòng :175** — đoạn `van-chuyen (…)`. Áp **sau** diff của đề xuất luật ADR-0048 mục 3 (sửa cùng đoạn):
```diff
-van-chuyen (Vận chuyển lượt 1a, ADR-0040 — bảng `vc_*` (xe, giấy tờ xe, danh mục loại giấy tờ xe, ngưỡng sắp hết hạn), route `/api/van-chuyen/*`; đọc `parties` qua hàm công bố `ownerCompany`, `expiringDriverDocuments`; không module nào import nó)
+van-chuyen (Vận chuyển lượt 1a, ADR-0040; nhà xe, ADR-0048; Bảng điều phối, ADR-0049 — bảng `vc_*` (xe, giấy tờ xe, danh mục, ngưỡng; chuyến, ai lái, điểm dừng, suất, sự kiện nối 1-1 `audit_log`, bản chụp xuất bến, bản chốt danh sách; chính sách điều phối, điều kiện xuất bến, hạng bằng, lý do), route `/api/van-chuyen/*`; lịch chung là HÌNH CHIẾU dựng lúc đọc (không bảng); đọc `orders` qua hàm hẹp `lichChungChang`, `hanhKhachChoChuyen`, `soKhachHieuLuc`, `lienHeChoTaiXe` (chỉ trong thân route sau `can()`) và view `v_ord_leg_key`, `v_ord_order_flag`, `v_ord_passenger_key` (trigger); `locations` qua khoá ngoại + `v_loc_location_label`; `parties` qua `ownerCompany`, `expiringDriverDocuments`, `nhaXeDangHopTac`, `taiXeChoDieuPhoi` và view `v_pty_*`; công bố `mocToiThieuHienHanh` cho gốc lắp ráp tiêm vào `orders`; không module nào import nó)
```

**8b. Bảng thi hành**:
- :151 (điều 5.7): cột "Cưỡng chế bằng" `**chưa có** — dựa vào kỷ luật` → `lần áp đầu: chuyến xe (ADR-0049) — kiểu \`LyDoGiu\` (\`src/shared/ly-do-giu.ts\`) một chỗ + \`kiemXuatBen\` dùng chung máy chủ/màn hình + trigger LC-05`; cột "Lệch hiện có" `chưa có khái niệm "giữ"` → `—`.
- :148 (điều 5.3): cột "Lệch hiện có" thêm `; riêng trigger \`vc_\` của 0041/0042 có bài "thân trigger chỉ đọc \`vc_\` + view công bố" (ADR-0049)`.

## Bù lại — các chỗ SIẾT (không cần duyệt riêng; ghi để chủ thấy đủ)

| # | Siết | Nơi | Nguồn |
|---|---|---|---|
| S1 | Hàng rào 2 cho cổng `staff`: mọi route cổng `staff` ngoài danh sách `TU_PHUC_VU_STAFF` (ảnh chụp hiện trạng 29/9, mỗi mục một lý do) phải hỏi `can()` và dùng kết quả để từ chối. **Thêm mục vào danh sách sau này = nới** | `src/route-write-guard.test.ts` (luật mới cạnh (1b) :204–207) | ADR D3 :212; "Câu ADR bị thay" ADR-0019 điều 6 (:270) |
| S2 | `CONG_BO` thêm `lichChungChang`, `lienHeChoTaiXe` | `src/orders-cong-bo.test.ts:64@6bb67c8` | ADR "Hệ quả" (bài quét nơi gọi) |
| S3 | Bài ghim mới: `order.leg.short_notice`, `trip.override` chỉ ADMIN + SUPER_ADMIN; mọi mã có `trip.view = any` cũng có `contact.view = any`; hàng `DRIVER_PARTNER` thêm năm khoá `none` | `src/shared/permissions.test.ts` | ADR D3, "Hệ quả" |
| S4 | `BANG_STAFF` 11 dòng mới, mã **theo từng mã quyền** | `src/tai-xe-cong.test.ts` | ADR-0048 kế hoạch 14.3 :1056 |
| S5 | Khối van-chuyen của bài "không lộ tên"; `TUYEN` + route đặt gấp; bài DTO tài xế liệt kê khoá | `src/hanh-khach-khong-lo-ten.test.ts`, `src/modules/van-chuyen/tai-xe-dto.test.ts` | ADR "Hệ quả" |
| S6 | Route van-chuyen trả hạng/hạn bằng lái được gọi trong bài "không lộ số"; thêm quét **nơi cấp** cho ba route đó | `src/giay-to-khong-lo-so.test.ts` | ADR "Hệ quả"; `CLAUDE.md:122` |
| S7 | Bài "không module nào import `van-chuyen`" (hôm nay chỉ là chú thích :45); bài "thân trigger `vc_` chỉ đọc `vc_` + sáu view công bố"; `STRICT` + `chuyen-repo.ts`; bài "`mocToiThieuHienHanh` chỉ gốc lắp ráp gọi" | `src/architecture.test.ts` và tệp test mới | Hiến chương 5.3 |
| S8 | Trigger lõi LC-01…07, 09–11, 13, 15, 16; `CHECK (require_contract = 0)`; chỉ-thêm của chính sách, sự kiện, bản chụp; ba trigger mới trên `vc_vehicle` (không giảm chỗ, không ngừng xe, không đổi chủ khi còn chuyến chưa kết thúc) | `migrations/0041_*`, `0042_*` | ADR D1, D2 |
| S9 | Bài thứ tự lô; bài chạy đua (ba lớp P16) | `src/modules/van-chuyen/thu-tu-lo.test.ts`, `tests/e2e/dieu-phoi-chay-dua.mjs` | ADR "Hệ quả" |
| S10 | Câu kiểm định kỳ R-VC-3…R-VC-10 (có R-VC-8 = B1.5 bàn giao từ ADR-0048) | `scripts/audit-checks.mjs` | ADR "Hệ quả"; ADR-0048 B1.5 |
| S11 | Chỉ route đặt gấp ghi `short_notice_*` (bài có P16) | `src/modules/orders/dat-gap.test.ts` | ADR D2 |
| S12 | Lệnh `vc_` không nhận chữ tự do; ghi chú đặt gấp không vào nhật ký; `trip_*` ghi `order_id` NULL | mã + bài | LC-18; C1 |

## Không đổi

- `LEGACY`, `KHONG_DB`, `TABLE_PREFIX`, `VIEW_PREFIX` (`src/architecture.test.ts`).
- `DOC_AUDIT_LOG_WONGUARD`, `XOA_CUNG_NHAP`, `FULL_NAME_ORD_PASSENGER_FILES`, `LEGACY_TABLES`, `NUA_NGHIEM` (nhánh ADR-0047). Người thi công cần thêm tên vào một trong số này → **DỪNG**, đó là nới mới.
- `GUARDS`, `ADMIN_OPS`, `SELF_SERVICE` (`src/route-write-guard.test.ts:48, 55-61, 100`).
- `docs/quyen-hoan.json` (không ô hoãn, không `cua_ghi` mới).
- Danh sách cổng (`OFFICE_GATE`, `ORDERS_GATE`, `ADMIN_GATE` — `src/shared/permissions.ts:178-188@3d8f4b0`); bài `src/shared/cong-quyen.test.ts`.
- `CLAUDE.md` §1 (số quyền app vẫn chín sau ADR-0048).
- Tệp ADR đã duyệt (ADR-0006, ADR-0019, ADR-0040, ADR-0047, ADR-0048): câu bị thay ghi ở ADR-0049. `docs/adr/README.md` do điều phối cập nhật (kể cả nhả số 0036, giữ 0040–0042).
