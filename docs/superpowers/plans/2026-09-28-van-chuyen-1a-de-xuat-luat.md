# Vận chuyển lượt 1a — đề xuất sửa luật (CHỜ CHỦ DUYỆT)

- **Ngày:** 2026-09-28.
- **Người soạn:** phiên lập kế hoạch Vận chuyển 1a (nhánh `worktree-agent-ac0436b2bbf204613`).
- **Người thi công** bổ sung số dòng thật và mục 4b ở Task A22 / B8 của kế hoạch `docs/superpowers/plans/2026-09-28-van-chuyen-1a.md`.
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

Số dòng đo trên `9ead2e7`.

```diff
 const ALLOWED_EDGES: Record<string, readonly string[]> = {            // dòng 19
   …
   thongbao: ["audit", "orders", "dispatch", "staff"],
+  // ADR-0040 D1: Vận chuyển lượt 1a đọc parties qua hàm công bố (ownerCompany — chủ xe; expiringDriverDocuments — danh sách sắp hết hạn) và khoá ngoại
+  // vc_vehicle.owner_party_id; ghi nhật ký qua auditStatement. Không module nào import van-chuyen.
+  // NỚI hàng rào đã duyệt (Điều 9.4) — CHỜ CHỦ DUYỆT ở docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md trước khi gộp.
+  "van-chuyen": ["parties", "audit"],
 };
 const STRICT: readonly { module: string; file: string }[] = [       // dòng 47
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

Lập luận đủ ở kế hoạch mục 1.2. Máy kiểm: test "đồ thị phụ thuộc module không có vòng" (`src/architecture.test.ts:124-134`).

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
- **Sửa kèm:** tài liệu đang thiếu `thongbao`, dù mã đã có `thongbao` trong `STRICT` (`src/architecture.test.ts:47-57`).

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
- **Sửa kèm:** thiếu `bangtin` — thư mục có thật; `src/architecture.test.ts:71` xếp nó hạng `KHONG_DB`.

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

**4a. Phần A (Task A19):** thêm một dòng.

```diff
+| Trang Danh mục giấy tờ: `web/danh-muc-giay-to.ts`, `public/danh-muc-giay-to.html`, dòng "Danh mục giấy tờ" ở `web/account.ts` (ADR-0040, khuôn sẵn) | `danh-muc-giay-to-smoke.mjs` ở `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/` (Quản trị thêm/sửa/ngưng; Bán hàng không thấy; 390 + 1040) + `dot-c-smoke.mjs` (bố cục trang Tôi) |
```

**4b. Phần B (Task B8):**
- Người thi công điền một dòng cho mỗi màn: trang đầu tài xế, danh sách xe, chi tiết xe, giấy tờ trong Danh bạ, giấy tờ của tôi, giấy tờ sắp hết hạn.
- Mỗi dòng ghi tên kịch bản Chrome và số bước.
- **Chưa có lúc lập kế hoạch.**

## Mục 5 — `CLAUDE.md` gốc

**5a. §1, dòng 10** — danh sách quyền app đã lệch mã từ lâu (7 mã). Lượt này thêm mã thứ tám.

```diff
-- Bốn quyền app, một tài khoản có nhiều quyền: `SALES`, `ACCOUNTING`, `ADMIN`, `FIELD`. Từ vựng: `docs/SYSTEM-DESIGN.md` §15.
+- Tám quyền app, một tài khoản có nhiều quyền: `SALES`, `ACCOUNTING`, `ADMIN`, `FIELD`, `PARTNER`, `SUPER_ADMIN`, `INTERN`, `DRIVER` (Tài xế — ADR-0040). Từ vựng: `docs/SYSTEM-DESIGN.md` §15.
```

**5b. §10 (bẫy hay dính)** — thêm một gạch:

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
| 4a (4b sau) — `web/CLAUDE.md` | thêm dòng bảng kịch bản | Duyệt |
| 5a, 5b — `CLAUDE.md` gốc | sửa số quyền + một bẫy | Duyệt |
