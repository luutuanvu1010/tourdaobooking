# ADR-0049 (Bảng điều phối chung, lượt 1) — đề xuất sửa luật (mục 4 ĐÃ DUYỆT 29/9; mục 0–3, 5–8 CHỜ CHỦ DUYỆT lúc gộp)

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
- **Trạng thái:**
  - **Mục 4: chủ chọn (a) "Sửa luật chung cho khớp", 29/9** — Trả lời lần 7, `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` (nhánh `adr-van-chuyen-0047-0048` @ `8e7336f`). Điều phối áp diff mục 4 lúc gộp ADR-0049, mỗi tệp một commit.
  - **Mục 0–3, 5–8: CHỜ CHỦ DUYỆT** — trình lúc gộp, như tiền lệ ADR-0047/0048 (ruling R-P5 của điều phối). Mã trên nhánh thi công mang chú thích "CHỜ CHỦ DUYỆT" cho mục 1, 2.
  - Duyệt xong mới gộp. Mỗi tệp luật một commit, sửa đúng diff dưới đây (kế hoạch Task K3).
- **Số dòng:** đo lúc lập kế hoạch:
  - trên `main` = `ce831f8` cho `src/architecture.test.ts`, `docs/ARCHITECTURE.md`, `src/CLAUDE.md`, `CLAUDE.md`. Bốn tệp này giống hệt ở `8675cbb`;
  - trên nhánh ADR-0048 `3d8f4b0` cho `src/shared/permissions.test.ts`;
  - trên nhánh ADR-0047 `6bb67c8` cho `src/hanh-khach-khong-lo-ten.test.ts`.
  - Hai nhánh nền chưa lên `main`, nên số dòng sẽ lệch sau khi gộp. Người thi công đo lại.
- **GIẢ ĐỊNH NỀN — mọi diff dưới đây viết TRÊN nền đã áp luật của hai phần nền** (chủ duyệt 29/9, `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` mục "Trả lời lần 5", nhánh `adr-van-chuyen-0047-0048` @ `f3b916a`; điều phối áp lúc gộp):
  - **ADR-0047** "Duyệt cả 4":
    - mục 1: `ord_` trong `TABLE_PREFIX`;
    - mục 2: `XOA_CUNG_NHAP` + `ARCHITECTURE.md` 2b (bảng thi hành 5.5), 2c (vế ngoại lệ ở Phần II :194);
    - mục 3: `DOC_AUDIT_LOG_WONGUARD` hạn 2027-03-31, kèm 3b (bảng thi hành 5.3 :148);
    - mục 4a: `ARCHITECTURE.md` :192 câu tệp nửa nghiêm; :194 thêm `ord_`; bảng thi hành 5.1;
    - mục 4b: `src/CLAUDE.md` :14 "SQL mới của `orders` chỉ ở tệp nửa nghiêm — không viết câu `ord_*` thô trong `repository.ts`", câu `full_name`; :25 thêm `ord_`;
    - mục 7: ngoại lệ R-N1-14 `full_name`.
  - **ADR-0048** "Duyệt":
    - mục 1: LC-1 mới, `EXTERNAL_PERMISSIONS`, `R-LC-1`, sổ hàng rào;
    - mục 3: `ARCHITECTURE.md` :175 đoạn `parties` và `van-chuyen`;
    - mục 4: `src/CLAUDE.md` :20 thêm một câu cuối;
    - mục 6: `CLAUDE.md` :10 "Chín quyền app", :122 câu cuối.
  - Vì vậy dòng "trước" (`-`) của mục 4, 6, 7, 8 dưới đây là **văn bản sau khi áp** các mục trên. Số dòng là số trên `main` hôm nay; áp xong nền có thể lệch. Người thi công đo lại (Task A20).
- **Người thi công làm gì với phần NỚI** (kế hoạch I30):
  - **thi công trong mã** mục 1 và mục 2 (cần để mã chạy), kèm chú thích "CHỜ CHỦ DUYỆT";
  - **không** sửa tệp luật thật (`CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/adr/`);
  - **không** gộp khi chưa duyệt.
  - Chủ KHÔNG duyệt mục nào thì hoàn nguyên phần mã tương ứng (cột "Nếu chủ KHÔNG duyệt").

---

## Tóm tắt cho chủ (lời thường)

| # | Việc | Loại | Vì sao cần | Nếu bạn KHÔNG duyệt |
|---|---|---|---|---|
| 0 | Năm quyền mới: xem chuyến, xếp xe, bấm tiến độ, phá lệ mốc 6 giờ, đặt gấp — đúng bảng bạn đã duyệt ở ADR-0049 | **Thêm** vào bảng quyền và bài đối chiếu (không nới bài khoá cũ nào; riêng cột tài xế công ty là mục 2) | Máy chủ chỉ cho làm việc gì có ô quyền; bài đối chiếu khoá giá trị từng ô đúng như ADR | Không ai dùng được Bảng điều phối; phá lệ và đặt gấp không có người bấm |
| 1 | Cho phân hệ Vận chuyển **đọc** thông tin chặng đưa đón của đơn và danh sách địa điểm | **Nới** một hàng rào kiến trúc | Chuyến xe phải trỏ tới chặng đưa đón (để biết khách nào lên xe nào) và tới địa điểm (khách sạn, cảng). Bạn đã duyệt ở ADR-0049; hàng rào máy cần được mở đúng hai lối này | Cả Bảng điều phối không làm được |
| 2 | Cho **tài xế công ty** xem chuyến mình lái và bấm tiến độ | **Nới** bài khoá quyền của tài xế | Hôm nay tài xế bị khoá mọi thứ trừ giấy tờ của mình. Bạn đã duyệt cho tài xế thấy chuyến mình và tự bấm Xuất bến / Đã đón… | Tài xế không dùng app cho chuyến; văn phòng phải bấm thay mọi nút |
| 3 | Họ tên, năm sinh khách được hiện trên màn **tài xế** (chỉ trong ngày chạy, chỉ chuyến mình lái) và trên màn **chi tiết chuyến của văn phòng** (người vốn đã xem được tên khách ở màn đơn) | **Nới** nghĩa một hàng rào dữ liệu cá nhân | Hàng rào hôm nay ghi "tên khách chỉ ra khỏi máy chủ ở màn danh sách khách của đơn". Bạn đã duyệt cho tài xế thấy tên trong ngày chạy; văn phòng bấm thay nút cho tài xế cần thấy khách nào | Tài xế chỉ thấy số người, không thấy tên; phải gọi văn phòng hỏi. Văn phòng bấm thay theo số thứ tự khách |
| 4 | Hai chỗ trong Hiến chương Phần II viết khác cách ADR-0049 chống "hai người sửa cùng lúc" | **Mâu thuẫn — ĐÃ QUYẾT 29/9: (a) sửa luật chung cho khớp** | Phần II viết "dùng giờ sửa cuối + dò nhật ký". ADR-0049 (bạn đã duyệt) dùng "số phiên bản + dấu lệnh", vì phân hệ Vận chuyển không được đọc nhật ký. Hiến chương đứng trên ADR, nên phải sửa chữ Hiến chương cho khớp | (đã chọn (a) — không áp dụng) |
| 5–8 | Cập nhật mô tả trong ba tệp luật cho AI (`CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md`) và sổ hàng rào | Mô tả, theo nội dung đã duyệt | Tài liệu luật phải khớp mã | AI phiên sau đọc luật cũ, dễ làm sai |

- **Đếm:** mục 0 là thêm ô theo đúng bảng ADR (không nới). Ba mục nới hàng rào (1, 2, 3), đều là nội dung ADR-0049 đã duyệt. Thêm một quyết định luật **mới** (mục 4) → **bốn** quyết định chạm quyền / dữ liệu, **vượt trần 3** của `CLAUDE.md` §9 (như đề xuất luật ADR-0047).
- **Đề nghị điều phối:** trình mục 4 **riêng, trước** (nó quyết cách viết mã phần chuyến). Mục 1–3 trình một lượt sau. **Đã làm:** mục 4 trình lượt riêng, chủ chọn (a) 29/9; mục 0–3 trình lúc gộp (R-P5) — ba quyết định nới, đúng trần 3.
- **Siết** (không cần duyệt riêng, ghi để bạn biết): mục "Bù lại" ở cuối tệp.

---

## Mục 0 — Năm ô mới trong `src/shared/permissions.ts` và bài đối chiếu ADR (THÊM — không nới bài ghim có sẵn, trừ hàng `DRIVER` ở mục 2)

**Bảng ô** (cột theo `PERMISSION_CODES`, `src/shared/permissions.ts:5@3d8f4b0`; `row()` 9 tham số :44–48; thêm vào `MATRIX` :71–124). Nguồn: ADR D3 :193–201; "Câu ADR bị thay" ADR-0019 bản đồ ô (:271).

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SA | INTERN | DRIVER | DRIVER_PARTNER |
|---|---|---|---|---|---|---|---|---|---|
| `trip.view` | any | any | any | none | none | any | none | assigned | none |
| `trip.dispatch` | any | none | any | none | none | any | none | none | none |
| `trip.progress` | any | none | any | none | none | any | none | assigned | none |
| `trip.override` | none | none | any | none | none | any | none | none | none |
| `order.leg.short_notice` | none | none | any | none | none | any | none | none | none |

| # | Chỗ sửa | Đổi | Có phải nới không | Nếu chủ KHÔNG duyệt |
|---|---|---|---|---|
| 0a | `src/shared/permissions.ts` `MATRIX` (:71–124@3d8f4b0) | thêm năm hàng trên, chú thích mỗi hàng dẫn ADR-0049 D3. **Mỗi ô vào cùng commit với route đầu tiên hỏi nó** (hàng rào 1 `src/permission-enforcement.test.ts:9-14` đòi ô có nơi gọi `can(`; kế hoạch Task A10, A13, A15) | **Không nới hàng rào nào**: ô mới, bản đồ vẫn là nguồn duy nhất (ADR-0019). Nhưng là **mở quyền mới** cho SALES, ACC, ADMIN, SA và (phạm vi `assigned`) DRIVER — nội dung ADR-0049 đã duyệt | Không route nào của Bảng điều phối hỏi được quyền. Cả lượt 1 dừng. Không có ô thì hàng rào 1 đỏ |
| 0b | `src/shared/permissions.test.ts` bảng `ADR` (:14–51@3d8f4b0) — bài "bản đồ quyền khớp TỪNG Ô …" (:55) | thêm năm hàng, **đúng** giá trị bảng trên; tên bài thêm "+ ADR-0049 D3" | **Không nới**: bài đối chiếu thêm hàng = khoá thêm giá trị (siết) | — |
| 0c | cùng tệp — bài mới | `order.leg.short_notice`, `trip.override` chỉ ADMIN + SA; mọi mã có `trip.view = any` cũng có `contact.view = any`; hàng `DRIVER_PARTNER` năm khoá mới `none` | siết | — |

- Bài "512 tập con quyền" (:254–268) **không đổi số** (không thêm mã quyền).
- `docs/quyen-hoan.json` không thêm ô hoãn nào.

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
| 3a | `src/hanh-khach-khong-lo-ten.test.ts:39@6bb67c8` — tên bài `"họ tên, năm sinh hành khách chỉ rời máy chủ ở GET/POST /passengers: …"`; chú thích đầu tệp :1–10 | Tên bài → `"… chỉ rời máy chủ ở GET/POST /passengers, DTO chuyến của tài xế GET /api/van-chuyen/cuoc-cua-toi/:id (chỉ trong ngày chạy — ADR-0049 D3) và chi tiết chuyến của văn phòng GET /api/van-chuyen/chuyen/:id (người có trip.view = any, đều có contact.view = any): …"`. Chú thích thêm một đoạn: "(6) ADR-0049: DTO tài xế có `hoTen`, `namSinh` chỉ khi `trongNgayChay`; ngoài khoảng đó khoá vắng mặt (bài `src/modules/van-chuyen/tai-xe-dto.test.ts`). DTO văn phòng `GET /chuyen/:id` có `hoTen`, `namSinh`, không `lienHe`; `GET /lich` không tên. Mọi lệnh ghi của van-chuyen có ca ở khối van-chuyen: nhật ký và cột chữ `vc_*` sạch." Bài **thêm** khối kiểm van-chuyen (siết), đủ tuyến gồm đúng hai route van-chuyen trả tên | ADR D3 :236 ("trong ngày chạy: họ tên + năm sinh khách của chuyến; tên + SĐT người liên hệ…"); :204 ("Văn phòng bấm thay tiến độ"); "Câu ADR bị thay" ADR-0047 A3 (:267); ruling R-P1 (văn phòng bấm thay qua route `office`); [MH] :132 ("tên … ở màn của tài xế trong ngày chạy và ở màn văn phòng") | DTO tài xế và DTO văn phòng bỏ `hoTen`, `namSinh`; DTO tài xế bỏ `lienHe`. Màn tài xế và màn bấm thay chỉ hiện số người / số thứ tự. Bản chốt danh sách vẫn trỏ dòng hành khách (không đổi) |
| 3b | `docs/SO-HANG-RAO.md:138@6bb67c8` (dòng "Toàn tuyến 'họ tên, năm sinh hành khách không lọt' …") | Cột "Chặn cái gì" thêm: "… — trừ DTO tài xế `GET /api/van-chuyen/cuoc-cua-toi/:id` trong ngày chạy và chi tiết chuyến văn phòng `GET /api/van-chuyen/chuyen/:id` (ADR-0049); ngoài ngày chạy DTO tài xế không có khoá tên". Cột "Ghi chú": trỏ dòng mới của bài DTO và bài "`trip.view = any` ⇒ `contact.view = any`" | như trên | — (mô tả) |

**Kèm, cùng loại dữ liệu:** SĐT người liên hệ (`orders.customer_phone`) tới tay tài xế qua `lienHeChoTaiXe` trong ngày chạy. ADR D3 và "Câu ADR bị thay" ADR-0047 A3 đã duyệt. Hôm nay **chưa hàng rào nào** ghi "SĐT người liên hệ chỉ ở màn đơn", nên không có gì để nới. Kế hoạch thêm bài siết (DTO ngoài ngày chạy không có `lienHe`).

## Mục 4 — `docs/ARCHITECTURE.md` Phần II và `src/CLAUDE.md` viết khác ADR-0049 — MÂU THUẪN, CHỦ QUYẾT

> **Trạng thái: chủ chọn (a) 29/9, Trả lời lần 7** — nguyên văn "Sửa luật chung cho khớp" (`docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`, nhánh `adr-van-chuyen-0047-0048` @ `8e7336f`). Điều phối áp ba diff dưới (`docs/ARCHITECTURE.md:194`, `:215`, `src/CLAUDE.md:26`) lúc gộp ADR-0049, mỗi tệp một commit. Kế hoạch Task A12 trở đi không còn chờ.

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

`docs/ARCHITECTURE.md:194` — chỉ đổi đoạn cuối câu. Câu này sau khi áp ADR-0047 mục 2c, 4a có thêm `ord_` và vế "ngoại lệ có tên duy nhất: dòng `ord_*` của đơn nháp…". Hai phần đó giữ nguyên:
```diff
-… (ngoại lệ có tên duy nhất: dòng `ord_*` của **đơn nháp** xoá–chèn lại khi lưu nháp — ADR-0047, `XOA_CUNG_NHAP`); khoá ngoại `NO ACTION`; khoá lạc quan bằng `updated_at`.
+… (ngoại lệ có tên duy nhất: dòng `ord_*` của **đơn nháp** xoá–chèn lại khi lưu nháp — ADR-0047, `XOA_CUNG_NHAP`); khoá ngoại `NO ACTION`; khoá lạc quan bằng `updated_at` — trừ bảng gốc của một lô nhiều câu ở module nghiêm: cột `version INTEGER` tăng ở câu cổng (ADR-0049 D1, `vc_trip`).
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

**Nếu chủ KHÔNG duyệt (chọn (b))** — *không áp dụng: chủ đã chọn (a) 29/9; giữ để đối chiếu*: kế hoạch dừng ở Task A12 (migration 0042), A13, A14, A15. Phần chính sách (A1–A7), luật thuần (A3, A4, A8), phía `orders` (A9–A11) làm tiếp được.

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

`src/CLAUDE.md:20` (vai hồ sơ / chữ `DRIVER`) — thêm cuối dòng, **sau** câu ADR-0048 mục 4 ("ADR-0048: vai hồ sơ `CARRIER` …"):
```diff
+ Quyền `DRIVER` (ADR-0049 D3) chỉ có `trip.view`, `trip.progress` phạm vi `assigned` = đang có dòng lái mở (`vc_trip_driver`) với `driver_party_id = staff.partyId` — tính trong `van-chuyen`, KHÔNG dùng `ctx.isAssigned` (người phụ trách đơn); route `…/cuoc-cua-toi*` chỉ phục vụ chuyến người gọi đang lái (khác → 404, kể cả văn phòng); văn phòng bấm thay qua route cổng `office` `…/chuyen/:id/<lệnh>`, hai bộ route gọi CHUNG một hàm xử lý ở `dieu-phoi.ts`. Nhật ký `trip_*` ghi `order_id` NULL (lịch sử đơn không lộ chuyến cho HDV/Đối tác).
```

## Mục 7 — `CLAUDE.md` gốc

`CLAUDE.md` §3 cho AI tự sửa số đếm, không cho thêm quy tắc. Mục này thêm một bẫy mới nên đưa chủ duyệt. **§1 dòng 10 không đổi**: không thêm mã quyền.

**7a. §10, thêm một gạch sau dòng :122** ("Giấy tờ của người + chữ `DRIVER`" — dòng này đã có câu cuối mới của ADR-0048 mục 6b; không sửa nó):
```diff
+- **Điều phối xe** (ADR-0049, migration `0040`–`0042`): mốc 6 giờ chặn **xác nhận** đơn có chặng dưới mốc tới khi Quản trị/Toàn quyền bấm "Đặt gấp" — bài/e2e xác nhận đơn đón trong ngày phải đặt chính sách mốc 0 ở khung thử; chỉ route đặt gấp ghi `short_notice_*`. Luật lõi chuyến ở CẢ trigger lẫn máy chủ; lệnh chuyến là MỘT `db.batch` theo thứ tự cổng → nhật ký → câu có dấu lệnh → trạng thái cuối (bài `thu-tu-lo.test.ts`); mỗi suất một câu `INSERT`. Tên, năm sinh, SĐT khách chỉ trong DTO tài xế **trong ngày chạy**. Chi tiết: `docs/CHANGE-GUIDE.md` công thức <điền>.
```

**7b. §10 dòng :119** ("`orders` KHÔNG import `dispatch`") — thêm vế:
```diff
-- `orders` KHÔNG import `dispatch`; "đang là người phụ trách" do gốc lắp ráp tiêm (`ctx.isAssigned`); route dùng ô `ownOrAssigned` phải truyền `assigned` vào `can()`.
+- `orders` KHÔNG import `dispatch` (và không import `van-chuyen`); "đang là người phụ trách" do gốc lắp ráp tiêm (`ctx.isAssigned`), mốc 6 giờ cũng vậy (`ctx.mocToiThieu`); route dùng ô `ownOrAssigned` phải truyền `assigned` vào `can()`.
```

## Mục 8 — `docs/ARCHITECTURE.md`: mô tả đi cùng (theo nội dung đã duyệt, không phải quyết định mới)

**8a. Phần II, sơ đồ tầng, dòng :175** — đoạn `van-chuyen (…)`. Dòng `-` là văn bản **sau khi áp** đề xuất luật ADR-0048 mục 3 (đã duyệt 29/9):
```diff
-van-chuyen (Vận chuyển lượt 1a, ADR-0040; nhà xe đối tác, ADR-0048 — bảng `vc_*` (xe của công ty hoặc của nhà xe, giấy tờ xe, danh mục loại giấy tờ xe, ngưỡng sắp hết hạn), route `/api/van-chuyen/*`; đọc `parties` qua hàm công bố `ownerCompany`, `expiringDriverDocuments`, `nhaXeDangHopTac` và view `v_pty_party_label`, `v_pty_owner_company`, `v_pty_carrier` (trigger chủ xe); không module nào import nó)
+van-chuyen (Vận chuyển lượt 1a, ADR-0040; nhà xe, ADR-0048; Bảng điều phối, ADR-0049 — bảng `vc_*` (xe, giấy tờ xe, danh mục, ngưỡng; chuyến, ai lái, điểm dừng, suất, sự kiện nối 1-1 `audit_log`, bản chụp xuất bến, bản chốt danh sách; chính sách điều phối, điều kiện xuất bến, hạng bằng, lý do), route `/api/van-chuyen/*`; lịch chung là HÌNH CHIẾU dựng lúc đọc (không bảng); đọc `orders` qua hàm hẹp `lichChungChang`, `hanhKhachChoChuyen`, `soKhachHieuLuc`, `lienHeChoTaiXe` (chỉ trong thân route sau `can()`) và view `v_ord_leg_key`, `v_ord_order_flag`, `v_ord_passenger_key` (trigger); `locations` qua khoá ngoại + `v_loc_location_label`; `parties` qua `ownerCompany`, `expiringDriverDocuments`, `nhaXeDangHopTac`, `taiXeChoDieuPhoi` và view `v_pty_*`; công bố `mocToiThieuHienHanh` cho gốc lắp ráp tiêm vào `orders`; không module nào import nó)
```

**8b. Bảng thi hành**:
- :151 (điều 5.7): cột "Cưỡng chế bằng" `**chưa có** — dựa vào kỷ luật` → `lần áp đầu: chuyến xe (ADR-0049) — kiểu \`LyDoGiu\` (\`src/shared/ly-do-giu.ts\`) một chỗ + \`kiemXuatBen\` dùng chung máy chủ/màn hình + trigger LC-05`; cột "Lệch hiện có" `chưa có khái niệm "giữ"` → `—`.
- :148 (điều 5.3): cột "Lệch hiện có" — văn bản sau khi áp ADR-0047 mục 3b kết thúc bằng `trigger đọc chéo module **chưa có bài kiểm**`. Nối thêm `; riêng trigger \`vc_\` của 0041/0042 có bài "thân trigger chỉ đọc \`vc_\` + view công bố" (ADR-0049)`.

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
| S14 | Route tài xế `…/cuoc-cua-toi*` chỉ phục vụ chuyến người gọi **đang lái** — 404 kể cả với người có ô `any`; văn phòng bấm thay qua 9 route cổng `office` hỏi `can(trip.progress)`; hai bộ route gọi **chung** một hàm xử lý mỗi lệnh (bài tĩnh `tien-do-mot-luat.test.ts`, có P16) | `src/modules/van-chuyen/index.ts`, `dieu-phoi.ts` + test mới | ruling R-P1 của điều phối (giữ đúng chữ ADR D3) |
| S13 | Câu xác nhận đơn (`UPDATE orders SET status='confirmed'`, hôm nay SQL thô LEGACY ở `src/modules/orders/repository.ts:921-926@6bb67c8`) chuyển sang tệp nửa nghiêm thành câu `defineSql` `orders.order_confirm` — thêm một câu vào vùng bài EXPLAIN soi; câu đặt gấp `orders.leg_short_notice` cũng ở đó. Không tên mới nào đọc `audit_log` | `src/modules/orders/chang-hanh-khach-repo.ts` | ADR-0047 A3 ("SQL chạm `ord_*` viết bằng `defineSql` trong tệp riêng"); kế hoạch I15 |

## Không đổi

- `LEGACY`, `KHONG_DB`, `TABLE_PREFIX`, `VIEW_PREFIX` (`src/architecture.test.ts`).
- `DOC_AUDIT_LOG_WONGUARD`, `XOA_CUNG_NHAP`, `FULL_NAME_ORD_PASSENGER_FILES`, `LEGACY_TABLES`, `NUA_NGHIEM` (nhánh ADR-0047). Người thi công cần thêm tên vào một trong số này → **DỪNG**, đó là nới mới.
- `GUARDS`, `ADMIN_OPS`, `SELF_SERVICE` (`src/route-write-guard.test.ts:48, 55-61, 100`).
- `docs/quyen-hoan.json` (không ô hoãn, không `cua_ghi` mới).
- Danh sách cổng (`OFFICE_GATE`, `ORDERS_GATE`, `ADMIN_GATE` — `src/shared/permissions.ts:178-188@3d8f4b0`); bài `src/shared/cong-quyen.test.ts`.
- `CLAUDE.md` §1 (số quyền app vẫn chín sau ADR-0048).
- Tệp ADR đã duyệt (ADR-0006, ADR-0019, ADR-0040, ADR-0047, ADR-0048): câu bị thay ghi ở ADR-0049. `docs/adr/README.md` do điều phối cập nhật (kể cả nhả số 0036, giữ 0040–0042).
