# Vận chuyển lượt 1a — đề xuất sửa luật (CHỜ CHỦ DUYỆT)

- **Ngày:** 2026-09-28.
- **Người soạn:** phiên lập kế hoạch Vận chuyển 1a (nhánh `worktree-agent-ac0436b2bbf204613`).
- **Người thi công** bổ sung số dòng thật và mục 4b ở Task A22 / B8 của kế hoạch `docs/superpowers/plans/2026-09-28-van-chuyen-1a.md`.
  - **Task A22 (người thi công Phần A, 2026-09-28):** số dòng mục 1–5 đo lại trên nhánh thi công `worktree-agent-a9cf548897a76b7f7` @ `fedffdf` (tệp luật mục 2–5 không đổi so với `c276848` — nhánh không sửa chúng). Mục 4a **chờ Phần B** (Task A19 hoãn — trang Danh mục giấy tờ chưa dựng). Thêm mục 4c, 4d (hai dòng bảng Chrome cho mã Phần A đã chạm).
- **Vì sao có tệp này:**
  - Hiến pháp N9: AI không tự sửa luật chi phối chính mình.
  - Điều 9.4: hàng rào đã duyệt chỉ được SIẾT; muốn NỚI phải có chủ duyệt.
  - Tiền lệ `docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md` (T2b): ADR đã có chữ cạnh / tiền tố, nhưng **sửa test không tự thành được phép**.
- **Căn cứ:** ADR-0040 (accepted 2026-09-28) D1 ghi "module mới `van-chuyen`, hạng STRICT, tiền tố bảng `vc_`, tiền tố view `vc`; phụ thuộc `parties` và `audit`; không module nào import `van-chuyen`".
- **Trạng thái:** CHỜ CHỦ DUYỆT. Chưa duyệt thì **không** đưa lệnh gộp (Task K3).
  - Duyệt xong: mỗi tệp luật một commit, sửa đúng diff dưới đây.
  - Đổi chú thích "CHỜ CHỦ DUYỆT" ở `src/architecture.test.ts` thành "đã duyệt <ngày>" (tiền lệ Ruling D21 của T2b).

## Mục 1 — NỚI hàng rào kiến trúc: module `van-chuyen` trong `src/architecture.test.ts`

Ba chỗ nới và một chỗ siết:
- ba chỗ nới nằm trong mã của nhánh từ Task A12 (để test chạy được);
- chỗ siết (`STRICT`) từ Task A13.

Số dòng đo trên `9ead2e7`; **đo lại trên `fedffdf` (Task A22):** `ALLOWED_EDGES` dòng 19, cạnh `van-chuyen` dòng 44–47 (ba dòng chú thích + dòng khai); `STRICT` dòng 51–62, mục `van-chuyen` dòng 61; `KHONG_DB` dòng 76; chú thích tiền tố dòng 78, `TABLE_PREFIX` dòng 79, `VIEW_PREFIX` dòng 80.

```diff
 const ALLOWED_EDGES: Record<string, readonly string[]> = {            // dòng 19
   …
   thongbao: ["audit", "orders", "dispatch", "staff"],
+  // ADR-0040 D1: Vận chuyển lượt 1a đọc parties qua hàm công bố (ownerCompany — chủ xe; expiringDriverDocuments — danh sách sắp hết hạn) và khoá ngoại
+  // vc_vehicle.owner_party_id; ghi nhật ký qua auditStatement. Không module nào import van-chuyen.
+  // NỚI hàng rào đã duyệt (Điều 9.4) — CHỜ CHỦ DUYỆT ở docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md trước khi gộp.
+  "van-chuyen": ["parties", "audit"],
 };
 const STRICT: readonly { module: string; file: string }[] = [       // dòng 47 (trên fedffdf: dòng 51)
   …
   { module: "thongbao", file: "modules/thongbao/repository.ts" },
+  { module: "van-chuyen", file: "modules/van-chuyen/repository.ts" }, // ADR-0040 D1 (siết: SQL đi qua defineSql, EXPLAIN)
 ];
-const TABLE_PREFIX: Record<string, string> = { pty_: "parties", loc_: "locations", stf_: "staff", fbk_: "feedback", dsp_: "dispatch", bil_: "billing", mnt_: "maintenance", aut_: "auth", ntf_: "thongbao" };
-const VIEW_PREFIX: Record<string, string> = { pty: "parties", loc: "locations", stf: "staff", ord: "orders", dsp: "dispatch", bil: "billing", aud: "audit" };
+// vc_/vc: ADR-0040 D1 — NỚI hàng rào đã duyệt (Điều 9.4), CHỜ CHỦ DUYỆT ở docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md.
+const TABLE_PREFIX: Record<string, string> = { pty_: "parties", loc_: "locations", stf_: "staff", fbk_: "feedback", dsp_: "dispatch", bil_: "billing", mnt_: "maintenance", aut_: "auth", ntf_: "thongbao", vc_: "van-chuyen" };
+const VIEW_PREFIX: Record<string, string> = { pty: "parties", loc: "locations", stf: "staff", ord: "orders", dsp: "dispatch", bil: "billing", aud: "audit", vc: "van-chuyen" };
```

| Thay đổi | Nguồn | Dùng để làm gì | Nếu chủ KHÔNG duyệt |
|---|---|---|---|
| Cạnh `van-chuyen → parties` | ADR-0040 D1 (nguyên chữ) | Chủ xe = hồ sơ công ty chủ (`ownerCompany`); danh sách sắp hết hạn gồm giấy tờ tài xế (`expiringDriverDocuments`); khoá ngoại `vc_vehicle.owner_party_id → pty_party` | Không có module Vận chuyển được. Muốn giữ phần giấy tờ người thì làm riêng Task A2–A11 (không cần tệp này). |
| Cạnh `van-chuyen → audit` | ADR-0040 D1 | Ghi nhật ký cùng lô (`auditStatement`) | Như trên |
| Tiền tố bảng `vc_` | ADR-0040 D1 ("một chiều" — khó đổi sau khi có dữ liệu) | Bốn bảng `vc_*` của migration 0033 | Như trên |
| Tiền tố view `vc` | ADR-0040 D1 | Lượt 1a **chưa có view nào**. Khai trước để lượt 1b dùng; bỏ thì không ảnh hưởng 1a | Bỏ dòng này; lượt 1b xin lại khi có view |
| `STRICT` thêm `van-chuyen` | ADR-0040 D1 "hạng STRICT" | Siết: mọi SQL đăng ký qua `defineSql`, bài EXPLAIN kiểm | (siết — không cần duyệt riêng) |

**Không vòng:**
- tập tới được từ `parties` = {`locations`, `audit`}; từ `audit` = ∅;
- không cạnh nào trỏ vào `van-chuyen`.

Lập luận đủ ở kế hoạch mục 1.2. Máy kiểm: test "đồ thị phụ thuộc module không có vòng" (`src/architecture.test.ts:124-134` trên `9ead2e7`; `:130-140` trên `fedffdf`).

**Không đổi:** `LEGACY`, `KHONG_DB`, `GUARDS` và `ADMIN_OPS` của `src/route-write-guard.test.ts` (không thêm tên / ô nào — thêm là nới).

## Mục 2 — `docs/ARCHITECTURE.md` (tài liệu chuẩn tắc — AI không tự sửa)

**2a. Phần II, sơ đồ tầng, dòng 175 — thêm `van-chuyen` vào danh sách module nghiệp vụ.**
Lý do: tài liệu luật phải khớp đồ thị mà test ép. Chỉ thêm đoạn cuối dòng; phần đầu giữ nguyên.

```diff
-… feedback (Góp ý / Báo lỗi — bảng `fbk_*`, route `/api/feedback*`, trang `/feedback`; chỉ import `staff` (nhãn) và `audit`)
+… feedback (Góp ý / Báo lỗi — bảng `fbk_*`, route `/api/feedback*`, trang `/feedback`; chỉ import `staff` (nhãn) và `audit`), van-chuyen (Vận chuyển lượt 1a, ADR-0040 — bảng `vc_*` (xe, giấy tờ xe, danh mục loại giấy tờ xe, ngưỡng sắp hết hạn), route `/api/van-chuyen/*`; đọc `parties` qua hàm công bố `ownerCompany`, `expiringDriverDocuments`; không module nào import nó)
```

**2b. Phần II, "Ranh giới SQL của module nghiêm", dòng 192.**
- Thêm `van-chuyen`.
- **Sửa kèm:** tài liệu đang thiếu `thongbao`, dù mã đã có `thongbao` trong `STRICT` (`src/architecture.test.ts:47-57` trên `9ead2e7`; `:51-62` trên `fedffdf`).
- Số dòng 175, 192, 194, 155 (và 113 cho mục 2e) đúng trên `fedffdf` — `docs/ARCHITECTURE.md` không đổi trong nhánh.

```diff
-- **Ranh giới SQL của module nghiêm** (`auth`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `parties`, `staff`): …
+- **Ranh giới SQL của module nghiêm** (`auth`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `parties`, `staff`, `thongbao`, `van-chuyen`): …
```

**2c. Phần II, "Bảng mới", dòng 194.**
- Thêm `vc_`.
- **Sửa kèm:** thiếu `ntf_` (bảng `ntf_*` từ `0025_thong_bao`).

```diff
-- **Bảng mới**: tiền tố module (`pty_`, `loc_`, `stf_`, `dsp_` từ migration 0014, `mnt_` từ `0016_maintenance`, `fbk_` từ `0016_feedback`, `aut_` từ `0023_auth_passkey`, sau này `bil_`); …
+- **Bảng mới**: tiền tố module (`pty_`, `loc_`, `stf_`, `dsp_` từ migration 0014, `mnt_` từ `0016_maintenance`, `fbk_` từ `0016_feedback`, `aut_` từ `0023_auth_passkey`, `ntf_` từ `0025_thong_bao`, `vc_` từ `0033_van_chuyen_xe`, sau này `bil_`); …
```

**2d. Phần I, bảng thi hành, dòng 155 ("5.12 Kiểm toán").**
Lý do: ADR-0040 D2 siết 5.12 (nhật ký không chứa số giấy tờ). Bảng thi hành phải ghi cơ chế cưỡng chế thật (Hiến chương 6.2).

```diff
-| 5.12 Kiểm toán | `audit-actions.ts` (một nguồn tên hành động); không ghi SĐT: dựa vào kỷ luật | nhật ký cũ trên production còn SĐT (`staff_updated` trước 21/9) | Hiến pháp P5 |
+| 5.12 Kiểm toán | `audit-actions.ts` (một nguồn tên hành động); không ghi SĐT: dựa vào kỷ luật; **không ghi số giấy tờ của người** (ADR-0040 D2): `src/giay-to-khong-lo-so.test.ts` (chạy mọi route giấy tờ rồi quét nhật ký) + kiểm `R-PTY-4` sau triển khai | nhật ký cũ trên production còn SĐT (`staff_updated` trước 21/9) | Hiến pháp P5, ADR-0040 |
```

**2e. (Tuỳ chọn — chủ chọn có hay không) Phần I, chữ của 5.12:**
- sửa "Nhật ký không chứa số điện thoại, email, mã số thuế."
- thành "Nhật ký không chứa số điện thoại, email, mã số thuế, **số giấy tờ tuỳ thân (căn cước, bằng lái…)**."
- Lý do: ADR-0040 đã siết cho phân hệ này; ghi vào Hiến chương thì áp cho mọi phân hệ sau. Không duyệt mục này thì ADR-0040 vẫn đủ.

## Mục 3 — `src/CLAUDE.md` (luật máy chủ)

**3a. Dòng 6, danh sách module.**
- Thêm `van-chuyen`.
- **Sửa kèm:** thiếu `bangtin` — thư mục có thật; `src/architecture.test.ts:71` (trên `fedffdf`: `:76`) xếp nó hạng `KHONG_DB`.
- Số dòng 6, 14, 20, 25 của `src/CLAUDE.md` đúng trên `fedffdf` (tệp không đổi trong nhánh).

```diff
-- `src/index.ts` gốc lắp ráp (mảng `modules`, router, Cron). `src/modules/<tên>/`: `accounts`, `audit`, `auth`, `catalog`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `orders`, `parties`, `staff`, `thongbao`.
+- `src/index.ts` gốc lắp ráp (mảng `modules`, router, Cron). `src/modules/<tên>/`: `accounts`, `audit`, `auth`, `bangtin`, `catalog`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `orders`, `parties`, `staff`, `thongbao`, `van-chuyen`.
```

**3b. Dòng 14, module "nghiêm".**

```diff
-- **Module "nghiêm"** (`auth`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `parties`, `staff`, `thongbao`): …
+- **Module "nghiêm"** (`auth`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `parties`, `staff`, `thongbao`, `van-chuyen`): …
```

**3c. Dòng 20, thêm một câu cuối gạch "Vai trò hồ sơ…".**
Lý do: chữ `DRIVER` nằm ở hai bảng khác nghĩa. Người sau dễ đọc nhầm mã vai cũ thành cửa mở quyền.

```diff
+ Chữ `DRIVER` có ở HAI bảng (ADR-0040): mã QUYỀN app `DRIVER` ("Tài xế", `stf_permission_type`) khác mã VAI hồ sơ cũ `DRIVER` (nhóm OTHER, đã ngưng — không bao giờ sinh quyền); vai tài khoản của tài xế công ty là `DRIVER_INTERNAL`. Danh sách giấy tờ sắp hết hạn lọc theo vai `DRIVER_INTERNAL` NGAY TRONG `parties` (lọc báo cáo, không phải điều kiện cho phép).
```

**3d. Dòng 25, tiền tố bảng mới.**

```diff
-… bảng mới có tiền tố module (`pty_`, `loc_`, `stf_`, `dsp_`, `mnt_`, `fbk_`, `aut_`, `ntf_`, sau này `bil_`); …
+… bảng mới có tiền tố module (`pty_`, `loc_`, `stf_`, `dsp_`, `mnt_`, `fbk_`, `aut_`, `ntf_`, `vc_`, sau này `bil_`); …
```

## Mục 4 — `web/CLAUDE.md`, bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào"

**4a. Task A19 (điều phối chuyển sang Phần B, 2026-09-28) — ĐÃ LÀM ở Phần B, tên tệp và số bước thật:** thêm một dòng, cuối bảng.

```diff
+| Trang Danh mục giấy tờ (khuôn sẵn trang Địa điểm — bản vẽ Vận chuyển không vẽ màn này): `web/danh-muc-giay-to.ts`, `public/danh-muc-giay-to.html`, dòng "Danh mục giấy tờ" ở `web/account.ts` (ADR-0040) | `danh-muc-giay-to-smoke.mjs` ở `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/` (6 bước: Quản trị ba khối 6 / 4 / 8 dòng, thêm, sửa, ngưng loại hệ thống cần → câu tiếng Việt; Bán hàng không thấy; 390 + 1040, không cần mạng ngoài) + `dot-c-smoke.mjs` (bố cục trang Tôi) |
```

**4c. Phần A (Task A3, Ruling R10) — dòng mới, đặt ngay sau dòng `web/home.ts` (dòng 46 của `web/CLAUDE.md` trên `fedffdf`).**
Lý do: `src/shared/start-page.ts` quyết trang đầu cho `web/home.ts` (tài khoản chỉ-`DRIVER` → `TRANG_DAU_TAI_XE`, tạm `/account`); sửa hàm này mà không chạy kịch bản thì "gọi dashboard rồi 403" quay lại mà không ai thấy.

```diff
+| Trang đầu theo quyền: `src/shared/start-page.ts` (`homeRedirect`, `TRANG_DAU_TAI_XE`), phần chuyển hướng đầu `web/home.ts` | `tai-xe-trang-dau-smoke.mjs` ở `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/` (2 bước: 390 + 1040 — tài xế mở "/" về trang đầu của tài xế, không lời gọi `/api/orders*`, không lỗi console) + `trang-chu-smoke.mjs` (người xem mọi đơn vẫn ở Trang chủ) |
```

**4d. Phần A (Task A2) — dòng mới cho màn Quản lý tài khoản (vai).**
Lý do: `vai-smoke.mjs` là kịch bản duy nhất khoá danh sách vai theo nhóm (nay 10 ô, có "Tài xế công ty" ở nhóm Nội bộ) nhưng bảng của `web/CLAUDE.md` chưa có dòng trỏ tới nó. Ghi kèm: Task A2 đã sửa kịch bản cho khớp ADR-0042 (đỏ sẵn ở mốc A0: khoá 11 ô + `.disabled`, mã thật 9 ô ẩn vai cấp cao) — sửa KỊCH BẢN, không sửa mã; P16 thấy chặn thật 2026-09-28 (`docs/SO-HANG-RAO.md`).

```diff
+| Vai và bộ quyền mặc định ở màn Quản lý tài khoản: `src/shared/roles.ts`, `web/role-picker.ts`, phần chọn vai của `web/staff.ts` | `vai-smoke.mjs` ở `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/` (ô vai theo nhóm, vai ẩn theo ADR-0042, "Tài xế công ty" ở nhóm Nội bộ → xem trước "Tài xế") + `dot-a-smoke.mjs` |
```

**4b. Phần B (Task B8) — người thi công Phần B điền 2026-09-28:** bảy dòng, cuối bảng (sau dòng 4a). Dòng "Trang đầu tài xế" dưới THAY dòng 4c (Phần B đổi `TRANG_DAU_TAI_XE` sang `/tai-xe` và viết lại `tai-xe-trang-dau-smoke.mjs` thành 4 bước) — chủ duyệt dòng này thì bỏ 4c để khỏi trùng.

```diff
+| Trang đầu tài xế (ADR-0040 D3, bản vẽ 07): `web/tai-xe.ts`, `public/tai-xe.html`, `TRANG_DAU_TAI_XE` / `homeRedirect` của `src/shared/start-page.ts`, phần tài xế của `web/shell.ts` (tab và mục "Trang chủ" → `/tai-xe`) | `tai-xe-trang-dau-smoke.mjs` ở `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/` (4 bước, 390 + 1040, không cần mạng ngoài) + `trang-chu-smoke.mjs` (người xem mọi đơn vẫn ở Trang chủ) |
+| Xe (bản vẽ 00–02): `web/xe.ts`, `web/xe-sua.ts`, `public/xe.html`, `public/xe-sua.html`, mục "Vận chuyển" của `web/shell.ts`, nhóm VẬN CHUYỂN của `web/account.ts`, huy hiệu `web/vc-dem.ts` | `xe-smoke.mjs` (13 bước) + `trang-chu-smoke.mjs` (đếm mục thanh bên — Quản trị nay 14 mục) + `dot-c-smoke.mjs` (bố cục trang Tôi) |
+| Chi tiết xe và bảng giấy tờ dùng chung (bản vẽ 03, form-giay-to, bang-truot): `web/xe-chi-tiet.ts`, `public/xe-chi-tiet.html`, `web/giay-to-ui.ts`, `web/bang-truot.ts`, `src/shared/giay-to-hien-thi.ts`, khối `.vc-*` của `public/app.css` | `xe-chi-tiet-smoke.mjs` (7 bước) + `giay-to-nguoi-smoke.mjs` |
+| Giấy tờ của một người trong Danh bạ (bản vẽ 04): mục "Giấy tờ" và mở hồ sơ theo `?id=` của `web/parties.ts`, bộ che số `taoBoCheSo` của `web/giay-to-ui.ts`, token `--t-reveal` | `giay-to-nguoi-smoke.mjs` (7 bước; bước 3 chờ tự che ~10 giây) + `t2b-danh-ba-smoke.mjs` + `dot-a-smoke.mjs` |
+| "Giấy tờ của tôi" (bản vẽ 05): khối `#my-docs` của `web/account.ts`, `coMucGiayToCuaToi` của `src/shared/giay-to-hien-thi.ts` (Ruling R18: tài khoản mang quyền Đối tác, kể cả lai, không có mục) | `giay-to-cua-toi-smoke.mjs` (5 bước) + `dot-c-smoke.mjs` |
+| Giấy tờ sắp hết hạn (bản vẽ 06): `web/giay-to-sap-het-han.ts`, `public/giay-to-sap-het-han.html`, `web/vc-dem.ts` | `sap-het-han-smoke.mjs` (7 bước) |
+| Quyền / vai mới tự hiện ở trang có sẵn (ADR-0040 D3): `web/role-picker.ts`, `web/gui-thong-bao.ts`, `PERMISSION_LABEL` / `ROLES` | `nhan-tai-xe-smoke.mjs` (4 bước) + `vai-smoke.mjs` |
```

Kèm, không phải luật (để người sửa hai kịch bản đang đỏ sẵn biết): `trang-chu-smoke.mjs:535` khoá 11 mục thanh bên của Quản trị — Phần B thêm "Vận chuyển" + "Xe" + "Sắp hết hạn" (bản vẽ 00) nên thành 14; `dot-c-smoke.mjs:124,138` khoá thứ tự con của trang Tôi (đỏ sẵn vì `#push`) — Phần B thêm `#links-top`, `.vc-eyebrow`, `#vc-links` (chỉ tài khoản có ô vehicle.manage) và `#my-docs` (chỉ khi có giấy tờ hoặc là tài xế).

## Mục 5 — `CLAUDE.md` gốc

**5a. §1, dòng 10** (đúng trên `fedffdf`) — danh sách quyền app đã lệch mã từ lâu (7 mã). Lượt này thêm mã thứ tám.

```diff
-- Bốn quyền app, một tài khoản có nhiều quyền: `SALES`, `ACCOUNTING`, `ADMIN`, `FIELD`. Từ vựng: `docs/SYSTEM-DESIGN.md` §15.
+- Tám quyền app, một tài khoản có nhiều quyền: `SALES`, `ACCOUNTING`, `ADMIN`, `FIELD`, `PARTNER`, `SUPER_ADMIN`, `INTERN`, `DRIVER` (Tài xế — ADR-0040). Từ vựng: `docs/SYSTEM-DESIGN.md` §15.
```

**5b. §10 (bẫy hay dính, bắt đầu dòng 110 trên `fedffdf`)** — thêm một gạch (đặt trước gạch cuối "Hiện trạng production…"):

```diff
+- **Giấy tờ của người + chữ `DRIVER`** (ADR-0040, migration `0031`–`0033`): số căn cước / bằng lái **không bao giờ** vào nhật ký, DTO mặc định, câu báo lỗi — chỉ route "xem đủ số" trả số, và ghi nhật ký TRƯỚC; route giấy tờ mới phải thêm ca vào `src/giay-to-khong-lo-so.test.ts`. Gia hạn = dòng mới (không gửi số thì máy chủ chép số cũ); sửa sai chỉ dòng hiện hành, có lý do. Mã QUYỀN `DRIVER` khác mã VAI hồ sơ cũ `DRIVER` (đã ngưng); vai tài xế công ty là `DRIVER_INTERNAL`. Thêm một mã quyền là nhân đôi mọi bài "tập con quyền" (256 hôm nay). Chi tiết: `docs/CHANGE-GUIDE.md` công thức y.
```

## Tóm tắt để chủ duyệt

| Mục | Loại | Cần chủ |
|---|---|---|
| 1 — cạnh `van-chuyen → parties`, `→ audit`; tiền tố `vc_`, `vc` | NỚI hàng rào đã duyệt (sẽ nằm trong mã nhánh từ Task A12) | Duyệt, hoặc chọn phương án ở cột "Nếu chủ KHÔNG duyệt" |
| 2a–2d — `docs/ARCHITECTURE.md` | sửa tài liệu chuẩn tắc cho khớp mã (kèm hai chỗ đang thiếu `thongbao`, `ntf_`) | Duyệt |
| 2e — chữ Hiến chương 5.12 | tuỳ chọn | Có / không |
| 3 — `src/CLAUDE.md` | làm rõ luật, không đổi nghĩa (kèm `bangtin` đang thiếu) | Duyệt |
| 4a (chờ Phần B), 4b (Phần B), 4c, 4d — `web/CLAUDE.md` | thêm dòng bảng kịch bản | Duyệt |
| 5a, 5b — `CLAUDE.md` gốc | sửa số quyền + một bẫy | Duyệt |
