# Phí đưa đón, Đợt A và B: vùng đón và bảng phí — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quản trị xếp được địa điểm vào vùng đón, đặt được bảng phí đón theo vùng, cấp độ đại lý, dịch vụ, nhóm, chiều, xe riêng, và thử tra được một tình huống ra mức nào. Chưa đơn nào bị đổi tiền.

**Architecture:** Vùng đón thuộc `locations` (bảng `loc_zone`, cột `loc_location.zone_code`, hai view công bố). Bảng phí thuộc `pricing` (quy tắc + dòng điều kiện khoá–giá trị + dòng «ngày bắt đầu áp»), chọn mức bằng MỘT hàm thuần trong `phi-don-rules.ts`. `pricing` không đọc `locations`: danh sách vùng tới route của `pricing` qua hàm do gốc lắp ráp tiêm vào `ctx` (khuôn `mocToiThieu`), nên không thêm cạnh phụ thuộc nào.

**Tech Stack:** TypeScript, Cloudflare Worker + D1 (SQLite), giao diện thuần dựng bằng `h()`, `node --test`, esbuild. Không thêm thư viện.

**Spec:** `docs/superpowers/specs/2026-11-14-phi-don-theo-cap-va-dich-vu-design.md` (gọi tắt **TK**), `docs/adr/ADR-0147-phi-dua-don-vung-bang-phi-dong-phi-tren-don.md` (Đ1, Đ2), `docs/adr/ADR-0203-phi-don-theo-cap-dai-ly-va-dich-vu-cu-the.md` (ĐB1, ĐB2). Sổ vàng: `golden/phi-dua-don.json` (28/28 ca chủ xác nhận 14/11).

**Ngoài kế hoạch này (Đợt C, D — kế hoạch riêng, viết sau khi Đợt B xong):** dòng phí trên đơn, chụp lúc xác nhận, cổng `transfer_fee_missing`, công nợ đại lý, biên nhận, câu đếm nơi đón gõ tay trên dữ liệu thật. Các ca SV-PD-22, 23, 24 và phần `tien_don`, `chia_phan` của ca 25, 26 thuộc Đợt C.

## Global Constraints

- Đọc `CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md` trước khi làm. Việc này là **việc lớn** (dữ liệu, tiền): thi công xong phải có người kiểm độc lập chỉ đọc (`nguoi-kiem-doc-lap`); người thi công không tự nghiệm thu.
- **Cấm AI tự chạy:** `git push`, nhập vào `main`, `wrangler deploy`, mọi lệnh ghi lên D1 remote hay API production. Không sửa `playbook/`, ADR đã duyệt, migration đã có trên `main`.
- Tiền là `INTEGER` VNĐ, chỉ tính ở máy chủ. Ngày dân sự là chuỗi `YYYY-MM-DD` giờ Việt Nam (`vnToday(new Date())` truyền làm tham số, không `date('now')`); dấu thời gian là ISO UTC.
- **Thiếu mức không bao giờ là 0 đồng** (Hiến chương 5.7). Miễn phí phải là một dòng `amount = 0` được đặt rõ.
- Không xoá cứng. Bảng mới có `created_at`, `updated_at` `NOT NULL` và `created_by`, `updated_by` `TEXT NULL` không khoá ngoại; khoá ngoại `NO ACTION`; bảng tra cứu khoá chính `TEXT code`.
- Module nghiêm (`locations`, `pricing`): mọi SQL qua `defineSql`, câu tĩnh; tệp repo mới phải khai ở `STRICT` của `src/architecture.test.ts`. **Không thêm cạnh vào `ALLOWED_EDGES`.**
- Ghi vùng, bảng phí, ngày bắt đầu áp: route `access: "admin"` + `can(staff, "admin.manage")`. Bán hàng, Đối tác, Thực tập, Kế toán nhận 403. Mỗi lần ghi có nhật ký qua `auditStatement` trong cùng `db.batch`; nhật ký chỉ ghi mã vùng, mã nhóm, mã dịch vụ, mã cấp, số tiền.
- Route ghi mới đi qua lớp chống ghi trùng (ADR-0094, `docs/CHANGE-GUIDE.md` công thức z11).
- Giao diện: không `innerHTML`, dựng bằng `h()`; giá trị CSS đi vào token; ô gõ 16px; chữ tiếng Việt có dấu, không lộ mã thô (`PER_PAX`, `OUT`…). Gọi hệ thống là «Nền tảng».
- **Chữ mới trên giao diện phải có trong bảng tham chiếu** (`src/shared/bang-tham-chieu-viec.ts`, `bang-tham-chieu-khai-niem.ts`, rồi `npm run tham-chieu`). Tên chưa được chủ chọn thì khai `trangThai: "cho-chon"` với tên tạm ở mục «Tên chờ chủ chọn» dưới đây; không tự coi là đã chốt.
- Số migration: trước khi đặt, chạy `ls migrations | tail -3` và `git ls-tree --name-only <nhánh> migrations/ | tail -2` cho mọi nhánh chưa gộp (`git branch -a --no-merged main`). Ngày 14/11: `main` dừng ở `0162`, nhánh `worktree-adr-0199-van-phong-nhap-coc` giữ `0163`. Kế hoạch dùng **`0164`** (Đợt A) và **`0165`** (Đợt B); nếu đã bị chiếm thì lấy số kế tiếp và sửa mọi chỗ nhắc trong kế hoạch.
- Bảng, cột, view mới: thêm vào `docs/data-dictionary.json` (kể cả `hangDuLieu`, mọi cột mới hạng `N1`) rồi `npm run dict`.
- Mỗi task: bài kiểm đỏ trước, xanh sau; commit nhỏ, thông điệp tiếng Việt, thân nói vì sao, kết bằng dòng `Co-Authored-By` của môi trường.
- Bộ kiểm dài (`npm test`, `npm run test:e2e`, kịch bản Chrome) chạy **một lần** ở Task 9, không chạy sau mỗi task. Trong task chỉ chạy đúng tệp kiểm của task.

## Tên chờ chủ chọn (người điều phối hỏi chủ MỘT lần trước Task 3)

> **Đã chốt 14/11.** Chủ dự án trả lời câu «Dùng các tên tôi khuyến nghị và bắt đầu thi công chứ?», nguyên văn: «Dùng tên đó, làm đi». Dùng **cột «Tên tạm (khuyến nghị)»** cho mọi dòng; khai trong bảng tham chiếu với `trangThai: "da-chot"`, `nguonTen: "chủ chọn 2026-11-14"`. Bố cục màn hình vẫn chờ chủ xem ảnh thật.

| Thứ | Tên tạm (khuyến nghị) | Phương án khác |
|---|---|---|
| Khái niệm vùng | «Khu vực đón» (chữ chủ dùng 14/11) | «Vùng đón»; «Khu vực đưa đón» |
| Vùng gieo sẵn `NGOAI_VUNG` | «Ngoài khu vực» | «Ngoài vùng»; «Khu vực khác» |
| Màn và mục menu bảng phí | «Phí đưa đón» | «Bảng phí đưa đón»; «Mức phí đón» |
| Nút tra thử | «Thử tra» | «Tra thử»; «Tra nhanh» (đang dùng ở màn hoa hồng) |
| Nút bật | «Đặt ngày bắt đầu áp» | «Bật phí đưa đón»; «Áp dụng từ ngày» |
| Câu cảnh báo cấp trả cao hơn | «{cấp} đang trả {a} đ, cao hơn mức không có cấp {b} đ ở {khu vực}, {dịch vụ hoặc nhóm}.» | chủ sửa lời |

Bố cục hai màn (Task 3, Task 8) trình chủ bằng **ảnh thật hai hướng** (điện thoại, máy tính) trước khi coi là xong.

## Review Focus

1. **Zone bị ngưng khi còn địa điểm hoặc còn dòng phí.** Người dùng mong: máy từ chối ngưng, nêu lý do; không địa điểm nào âm thầm rơi sang «Ngoài khu vực». Bài: Task 2 (còn địa điểm), Task 7 (`NGOAI_VUNG` không ngưng được).
2. **Hai người cùng thêm một dòng phí trùng bộ điều kiện.** Mong: đúng một dòng được ghi, người kia nhận 409. Bài: Task 5 (trigger chồng khoảng), Task 7.
3. **Chữ ký bộ điều kiện lệch với dòng con** (lỗi mã, hoặc sửa tay CSDL). Mong: bất biến dữ liệu bắt được. Bài: Task 5 (mục `R-PRC-PD-1` trong `scripts/audit-checks.mjs`).
4. **Giá trị điều kiện rác** (mã vùng không có, mã cấp đã khoá, `EXCLUSIVE=0`, chiều `out` chữ thường, khoá lặp hai lần). Mong: 400, không ghi gì. Bài: Task 6, Task 7.
5. **Kết thúc dòng chung cuối cùng của một vùng khi phí đón đang áp**, hoặc đặt ngày kết thúc trước ngày bắt đầu. Mong: từ chối, nêu tên vùng. Bài: Task 7.

---

## Cấu trúc tệp

| Tệp | Việc | Task |
|---|---|---|
| `migrations/0164_vung_don.sql` | tạo `loc_zone`, cột `zone_code`, hai view | 1 |
| `src/migrations-vung-don.test.ts` | bài migration Đợt A | 1 |
| `src/modules/locations/vung-rules.ts` (+ `.test.ts`) | kiểm thân tạo/sửa vùng | 2 |
| `src/modules/locations/vung-repo.ts` | SQL vùng (`defineSql`) | 2 |
| `src/modules/locations/index.ts`, `repository.ts`, `rules.ts` | route vùng; `zoneCode` trên địa điểm; xuất `vungDangBat` | 2 |
| `src/modules/locations/vung-route.test.ts` | bài route vùng | 2 |
| `src/shared/contracts.ts`, `audit-actions.ts`, `router.ts`, `src/index.ts` | DTO, nhãn nhật ký, `ctx.vungDon` | 2, 4 |
| `web/locations.ts`, `public/locations.html` | cột và ô chọn vùng, thẻ quản lý vùng | 3 |
| `migrations/0165_phi_don_bang.sql` | bốn bảng `prc_transfer_fee_*` | 5 |
| `src/migrations-phi-don.test.ts` | bài migration Đợt B | 5 |
| `src/modules/pricing/phi-don-rules.ts` (+ `.test.ts`) | luật thuần: chọn mức, cấp của hồ sơ, tiền một chặng, chữ ký, cảnh báo, kiểm thân | 6 |
| `src/so-vang-phi-don.test.ts` | thêm lớp 2 | 6 |
| `src/modules/pricing/phi-don-repo.ts` | SQL bảng phí | 7 |
| `src/modules/pricing/phi-don-route.ts` | các route `/api/pricing/phi-don*` (xuất mảng route, `index.ts` nối vào) | 7 |
| `src/modules/pricing/phi-don-route.test.ts` | bài route | 7 |
| `web/phi-don.ts`, `public/phi-don.html`, `src/shared/phi-don-hien-thi.ts` (+ `.test.ts`) | màn đặt phí, Thử tra | 8 |
| `tests/e2e/phi-don.mjs`, `tests/e2e/danh-sach.mjs` | kịch bản e2e | 9 |
| `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/SO-HANG-RAO.md`, nhật ký thi công | tài liệu | 9 |

---

## ĐỢT A — Vùng đón (`locations`)

### Task 1: Migration vùng đón

**Files:**
- Create: `migrations/0164_vung_don.sql`
- Create: `src/migrations-vung-don.test.ts` (khuôn: `src/migrations-loc-dia-chi.test.ts` — tự `readdirSync`, áp tới tệp đích bằng `node:sqlite`)
- Modify: `docs/data-dictionary.json`; chạy `npm run dict`

**Interfaces:**
- Produces (CSDL):
  - `loc_zone(code TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 30), name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60), sort_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)), created_at TEXT NOT NULL, created_by TEXT, updated_at TEXT NOT NULL, updated_by TEXT)`; sổ dữ liệu `kind: "lookup"`.
  - Gieo một dòng `('NGOAI_VUNG', <tên chủ chọn>, 999, 1, …)`.
  - `ALTER TABLE loc_location ADD COLUMN zone_code TEXT REFERENCES loc_zone(code);` (trống = chưa xếp).
  - Trigger `loc_zone_no_delete` (`RAISE(ABORT, 'loc_zone_append_only: …')`); trigger `loc_zone_ngoai_vung_luon_bat` chặn `UPDATE` đặt `active = 0` cho `NGOAI_VUNG`; trigger `loc_zone_con_dia_diem` chặn đặt `active = 0` khi còn `loc_location.zone_code = OLD.code`; trigger `loc_location_zone_dang_bat` (INSERT và UPDATE OF `zone_code`) chặn gán vùng đã ngưng.
  - `CREATE VIEW v_loc_location_zone AS SELECT id AS location_id, COALESCE(zone_code, 'NGOAI_VUNG') AS zone_code FROM loc_location;`
  - `CREATE VIEW v_loc_zone_label AS SELECT code, name, active FROM loc_zone;`
  - Không đụng `v_loc_location_label` (nhiều module đọc; tiền lệ `0091`).

- [ ] **Step 1: Viết bài kiểm đỏ** `src/migrations-vung-don.test.ts`, bốn bài:
  - `"0164: gieo NGOAI_VUNG, địa điểm cũ chưa xếp vùng"`: sau khi áp, `SELECT code FROM loc_zone` ra đúng `["NGOAI_VUNG"]`; mọi dòng `loc_location` có `zone_code IS NULL`; `SELECT zone_code FROM v_loc_location_zone` toàn `NGOAI_VUNG`, số dòng bằng `loc_location`.
  - `"0164: không xoá vùng, không ngưng NGOAI_VUNG"`: `DELETE FROM loc_zone` ném lỗi khớp `/loc_zone_append_only/`; `UPDATE loc_zone SET active = 0 WHERE code = 'NGOAI_VUNG'` ném lỗi.
  - `"0164: không ngưng vùng còn địa điểm, không gán vùng đã ngưng"`: chèn vùng `TT`, gán một địa điểm, `UPDATE loc_zone SET active = 0 WHERE code = 'TT'` ném lỗi; bỏ gán rồi ngưng được; gán lại `TT` cho địa điểm ném lỗi.
  - `"0164: view đúng cột"`: `PRAGMA table_info` của `v_loc_location_zone` = `["location_id","zone_code"]`, của `v_loc_zone_label` = `["code","name","active"]`.
- [ ] **Step 2: Chạy, thấy đỏ.** `node --test src/migrations-vung-don.test.ts` → FAIL (không tìm thấy tệp đuôi `_vung_don.sql`).
- [ ] **Step 3: Viết `migrations/0164_vung_don.sql`** đúng khối Interfaces. Đầu tệp ghi chú: ADR-0147 Đ1; vì sao view mới thay vì sửa view nhãn.
- [ ] **Step 4: Thêm vào `docs/data-dictionary.json`**: bảng `loc_zone` (`module: "locations"`, `kind: "lookup"`), hai view với đúng `columns`, `hangDuLieu` cho `loc_zone.*`, `loc_location.zone_code`, hai view (đều `N1`). Chạy `npm run dict`.
- [ ] **Step 5: Chạy xanh.** `node --test src/migrations-vung-don.test.ts src/architecture.test.ts src/hang-du-lieu.test.ts src/migrations-n1.test.ts` → PASS.
- [ ] **Step 6: Commit** `Vùng đón: bảng loc_zone, cột zone_code, hai view công bố (ADR-0147 Đ1)`.

### Task 2: Luật, SQL và route vùng đón

**Files:**
- Create: `src/modules/locations/vung-rules.ts`, `vung-rules.test.ts`, `vung-repo.ts`, `vung-route.test.ts`
- Modify: `src/modules/locations/index.ts`, `repository.ts`, `rules.ts`; `src/shared/contracts.ts`; `src/shared/audit-actions.ts`; `src/architecture.test.ts` (thêm `{ module: "locations", file: "modules/locations/vung-repo.ts" }` vào `STRICT`); `src/route-access.test.ts` (ghim ba route mới)

**Interfaces:**
- Produces (`src/shared/contracts.ts`):
  ```ts
  export interface VungDonDto { code: string; name: string; sortOrder: number; active: boolean; soDiaDiem: number; updatedAt: string }
  // LocationDto thêm: zoneCode: string | null
  // LocationListResponse thêm: zones: VungDonDto[]
  export interface VungDonResponse { zone: VungDonDto }
  ```
- Produces (`vung-rules.ts`):
  ```ts
  export const MA_VUNG_RE = /^[A-Z][A-Z0-9_]{1,29}$/;
  export const MA_NGOAI_VUNG = "NGOAI_VUNG";
  export interface VungTao { code: string; name: string; sortOrder: number }
  export interface VungSua { name: string; sortOrder: number; active: boolean; expectedUpdatedAt: string }
  export function kiemThanVungTao(body: unknown): Result<VungTao>
  export function kiemThanVungSua(body: unknown): Result<VungSua>
  ```
  `rules.ts`: `LocationUpdate` thêm `zoneCode?: string | null` — khoá vắng = giữ nguyên (cùng luật với `quickPickOrder`, Ruling R-G); `null` = bỏ xếp vùng; chuỗi phải khớp `MA_VUNG_RE`.
- Produces (`index.ts`, hàm công bố cho gốc lắp ráp):
  ```ts
  export function vungDangBat(db: D1Database): Promise<{ code: string; name: string }[]>   // sắp theo sort_order, code
  ```
- Produces (route):
  - `GET /api/locations` (như cũ) trả thêm `zones` và `zoneCode`.
  - `POST /api/location-zones` — `admin` + `admin.manage` → 201 `VungDonResponse`; trùng mã → 409 `code_taken`.
  - `PUT /api/location-zones/:code` — `admin` + `admin.manage` → 200; `stale` → 409; ngưng `NGOAI_VUNG` → 409 `zone_required`; ngưng vùng còn địa điểm → 409 `zone_in_use` (kiểm ở máy chủ trước, trigger là lớp hai).
  - `PUT /api/locations/:id` nhận `zoneCode`; vùng không có hoặc đã ngưng → 400 `invalid_input`.
- Produces (nhật ký, `audit-actions.ts`): `location_zone_created: { label: "Thêm khu vực đón", group: "location" }`, `location_zone_updated: { label: "Sửa khu vực đón", group: "location" }` (nhãn theo tên chủ chọn). `location_updated` khi đổi vùng: `detail` = `"<mã địa điểm> — khu vực: <cũ|chưa xếp> → <mới|chưa xếp>"`.

- [ ] **Step 1: Bài thuần đỏ** `vung-rules.test.ts`: `kiemThanVungTao({code:"bac",…})` lỗi (chữ thường); `{code:"BAC", name:"  ", …}` lỗi; `{code:"BAC", name:"Bắc Nha Trang", sortOrder:2}` ok; `kiemThanVungSua` thiếu `expectedUpdatedAt` lỗi. Thêm vào `rules.test.ts`: `validateLocationUpdate` với `zoneCode` vắng → kết quả không có khoá `zoneCode`; `zoneCode: null` → `null`; `zoneCode: "x y"` → lỗi.
- [ ] **Step 2: Bài route đỏ** `vung-route.test.ts` (khuôn `chon-nhanh.test.ts`: `world()`, `seedStaff`, `w.call`):
  - `"ai ghi được vùng"`: `POST /api/location-zones` với Bán hàng, Kế toán, Đối tác, Thực tập → 403; Quản trị, Toàn quyền → 201; có đúng một dòng `audit_log` `location_zone_created`, `detail` = `"BAC — Bắc Nha Trang"`.
  - `"trùng mã"` → 409 `code_taken`, không thêm nhật ký.
  - `"xếp địa điểm vào vùng"`: `PUT /api/locations/:id` kèm `zoneCode: "BAC"` → 200; `GET` trả `zoneCode: "BAC"`, `zones` có `BAC` với `soDiaDiem: 1`; nhật ký `location_updated` có `detail` khớp `/khu vực: chưa xếp → BAC/`.
  - `"PUT không gửi zoneCode giữ nguyên vùng"`.
  - `"vùng không có"`: `zoneCode: "KHONG_CO"` → 400, địa điểm không đổi.
  - `"ngưng vùng"`: `BAC` còn địa điểm → 409 `zone_in_use`; `NGOAI_VUNG` → 409 `zone_required`; vùng trống → 200, sau đó gán địa điểm vào vùng đó → 400.
  - `"khoá lạc quan"`: `PUT /api/location-zones/BAC` với `expectedUpdatedAt` cũ → 409 `stale`.
  - `"vungDangBat"`: nhập hàm từ `./index.ts`, gọi với `fakeD1(w.sqlite)` (khuôn harness) → chỉ vùng `active`, có `NGOAI_VUNG`.
- [ ] **Step 3: Chạy, thấy đỏ.** `node --test src/modules/locations/` → FAIL.
- [ ] **Step 4: Viết `vung-rules.ts`, `vung-repo.ts`** (tên câu: `locations.zone_list` có `soDiaDiem` bằng `LEFT JOIN … GROUP BY`, `zone_find`, `zone_insert`, `zone_update` có `WHERE code = ? AND updated_at = ?`, `zone_active_list`, `zone_active_exists`), sửa `repository.ts` (câu `list`, `find`, `update` thêm `zone_code`) và `index.ts`. Ghi vùng và nhật ký trong một `env.DB.batch`; nhật ký sửa dùng điều kiện `"changes() > 0"`.
- [ ] **Step 5: Ghim route** vào `src/route-access.test.ts` và, nếu bài đòi, `src/route-write-guard.test.ts`.
- [ ] **Step 6: Chạy xanh.** `node --test src/modules/locations/ src/route-access.test.ts src/route-write-guard.test.ts src/architecture.test.ts` → PASS.
- [ ] **Step 7: `npm run typecheck`** → 0 lỗi. **Commit** `Vùng đón: route thêm, sửa, ngưng vùng và xếp địa điểm vào vùng`.

### Task 3: Màn Địa điểm có vùng

**Files:**
- Modify: `web/locations.ts`, `public/locations.html`, `public/app.css` (chỉ khi cần token mới), `src/shared/bang-tham-chieu-viec.ts`, `src/shared/bang-tham-chieu-khai-niem.ts`; chạy `npm run tham-chieu`

**Interfaces:**
- Consumes: `Api.LocationListResponse.zones`, `LocationDto.zoneCode`, `POST /api/location-zones`, `PUT /api/location-zones/:code`.

- [ ] **Step 1: Khai chữ trước.** Thêm vào bảng tham chiếu: khái niệm vùng (`KN({ ten, giaiNghia: "Nhóm các điểm đón dùng chung một mức phí đưa đón", khacVoi: "Địa điểm", … })`) và các việc «Thêm khu vực đón», «Sửa khu vực đón» (`duongLenh`, `maNhatKy` như Task 2). Tên lấy theo câu trả lời của chủ; chưa có thì `trangThai: "cho-chon"`. Chạy `npm run tham-chieu`.
- [ ] **Step 2: Sửa màn.** Bảng địa điểm thêm cột vùng (địa điểm chưa xếp hiện chữ của `NGOAI_VUNG` kèm nhãn phụ «chưa xếp»); form sửa địa điểm thêm `<select>` vùng (mục đầu «Chưa xếp»; chỉ vùng đang bật; thân PUT luôn gửi `zoneCode`). Thẻ mới dưới thẻ thêm địa điểm: danh sách vùng (tên, số địa điểm, đang bật/ngưng), form thêm (mã, tên, thứ tự), sửa tại chỗ (tên, thứ tự, bật). Dùng lại `act()` cho 409 `stale`. Câu báo: `zone_in_use` → «Khu vực này còn {n} địa điểm. Chuyển các địa điểm sang khu vực khác rồi ngưng.»; `zone_required` → «Không ngưng được khu vực này vì nơi đón gõ tay được tính vào đây.»
- [ ] **Step 3: Kiểm.** `npm run build:web && node --test src/bang-tham-chieu.test.ts src/bang-tu-giao-dien.test.ts src/sw-policy.test.ts` → PASS. `npm run typecheck` → 0 lỗi.
- [ ] **Step 4: Ảnh thật.** Dựng bản thử (`node scripts/dev-iphone.mjs` hoặc khuôn `startEnv` của `a2-cdp.mjs`), chụp màn Địa điểm hai hướng với 3 vùng và 8 địa điểm; lưu `docs/evidence/2026-11-phi-don/dia-diem-vung-{dien-thoai,may-tinh}.png`. Người điều phối gửi chủ.
- [ ] **Step 5: Commit** `Màn Địa điểm: cột khu vực đón và thẻ quản lý khu vực`.

### Task 4: Tiêm danh sách vùng cho `pricing`

**Files:**
- Modify: `src/shared/router.ts` (thêm trường vào `Ctx`, kèm ghi chú như `mocToiThieu`), `src/index.ts` (`APP_OPTIONS`), `tests/audit/harness.mjs` chỉ khi khung thử cần mặc định

**Interfaces:**
- Produces: `ctx.vungDon: () => Promise<{ code: string; name: string }[]>` — vùng đang bật, do gốc lắp ráp nối tới `locations.vungDangBat(env.DB)`. `pricing` KHÔNG import `locations`, không đọc `v_loc_*`.

- [ ] **Step 1: Bài đỏ.** Thêm vào `vung-route.test.ts` bài `"gốc lắp ráp tiêm vungDon"`: quét chữ `src/index.ts` có `vungDon:` trỏ `vungDangBat`; quét `src/modules/pricing/` không có chuỗi `loc_` hay `modules/locations` (bài này xanh ngay và giữ làm rào cho Đợt B).
- [ ] **Step 2: Thêm trường và nối dây.** Chạy `npm run typecheck` → 0 lỗi; `node --test src/modules/locations/vung-route.test.ts src/architecture.test.ts` → PASS.
- [ ] **Step 3: Commit** `Gốc lắp ráp tiêm danh sách vùng đón cho pricing (không thêm cạnh phụ thuộc)`.

---

## ĐỢT B — Bảng phí (`pricing`)

### Task 5: Migration bảng phí

**Files:**
- Create: `migrations/0165_phi_don_bang.sql`, `src/migrations-phi-don.test.ts`
- Modify: `docs/data-dictionary.json` (+ `npm run dict`), `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts`

**Interfaces:**
- Produces (CSDL):
  - `prc_transfer_fee_key(code TEXT PRIMARY KEY, name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)), created_at, created_by, updated_at, updated_by)` — `kind: "lookup"`. Gieo sáu khoá: `ZONE`, `DIRECTION`, `SERVICE_GROUP`, `EXCLUSIVE`, `TIER`, `SERVICE`.
  - `prc_transfer_fee_rule(id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('PER_PAX','PER_TRIP')), amount INTEGER NOT NULL CHECK (amount >= 0), valid_from_date TEXT NOT NULL CHECK (date(valid_from_date) IS valid_from_date), valid_to_date TEXT CHECK (valid_to_date IS NULL OR (date(valid_to_date) IS valid_to_date AND valid_to_date >= valid_from_date)), condition_sig TEXT NOT NULL CHECK (length(condition_sig) BETWEEN 6 AND 400), note TEXT CHECK (note IS NULL OR length(note) BETWEEN 1 AND 200), created_at TEXT NOT NULL, created_by TEXT, updated_at TEXT NOT NULL, updated_by TEXT)`.
  - `prc_transfer_fee_condition(rule_id TEXT NOT NULL REFERENCES prc_transfer_fee_rule(id), key_code TEXT NOT NULL REFERENCES prc_transfer_fee_key(code), value TEXT NOT NULL CHECK (length(value) BETWEEN 1 AND 60), created_at TEXT NOT NULL, created_by TEXT, updated_at TEXT NOT NULL, updated_by TEXT, PRIMARY KEY (rule_id, key_code))`.
  - `prc_transfer_fee_start(id TEXT PRIMARY KEY, start_date TEXT CHECK (start_date IS NULL OR date(start_date) IS start_date), valid_from_at TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, created_by TEXT, updated_at TEXT NOT NULL, updated_by TEXT)` — chỉ thêm; dòng mới nhất theo `valid_from_at` là hiện hành; `start_date NULL` = không áp. Không gieo dòng nào (chưa có dòng = chưa áp).
  - Trigger (tiền tố lỗi để `loiBang` dịch):
    - `prc_transfer_fee_rule_no_delete`, `prc_transfer_fee_condition_no_delete`, `prc_transfer_fee_condition_no_update`, `prc_transfer_fee_start_no_update`, `prc_transfer_fee_start_no_delete` → `'prc_append_only: …'`.
    - `prc_transfer_fee_rule_close_only` BEFORE UPDATE: chỉ `valid_to_date`, `updated_at`, `updated_by` được đổi; `valid_to_date` chỉ được đặt từ `NULL` hoặc rút ngắn → `'prc_append_only: …'`.
    - `prc_transfer_fee_rule_overlap` BEFORE INSERT: `EXISTS` dòng khác cùng `kind`, cùng `condition_sig`, khoảng ngày giao nhau (khuôn `COALESCE(valid_to_date,'9999-12-31')` của `prc_commission_rule_overlap`) → `'prc_overlap: đã có mức cùng bộ điều kiện trong khoảng ngày này'`.
    - `prc_transfer_fee_condition_khoa_bat` BEFORE INSERT: khoá phải `active = 1`.
  - Không khoá ngoại nào ra ngoài `pricing` (giá trị điều kiện là chữ, kiểm ở máy chủ — ADR-0147 Đ2).
- Produces (bất biến, `scripts/audit-checks.mjs`): `R-PRC-PD-1` — với mỗi quy tắc, `condition_sig` = các dòng con sắp theo `key_code`, nối `key=value` bằng `|` (cùng công thức `chuKyDieuKien` ở Task 6); `R-PRC-PD-2` — mỗi quy tắc có đúng một dòng con `ZONE`; `kind = 'PER_TRIP'` ⇔ có dòng `EXCLUSIVE`; không vừa `SERVICE` vừa `SERVICE_GROUP`. Mức: vi phạm (thoát 1).

- [ ] **Step 1: Bài đỏ** `src/migrations-phi-don.test.ts`:
  - `"0165: sáu khoá điều kiện"`: `SELECT code FROM prc_transfer_fee_key ORDER BY code` = `["DIRECTION","EXCLUSIVE","SERVICE","SERVICE_GROUP","TIER","ZONE"]`.
  - `"0165: tiền âm, kiểu lạ bị từ chối"`.
  - `"0165: trùng bộ điều kiện trùng ngày bị chặn, khác ngày thì được"`: hai dòng `('PER_PAX','ZONE=CR')` `2026-12-01…NULL` → dòng hai ném `/prc_overlap/`; dòng `2026-12-01…2026-12-31` rồi `2027-01-01…NULL` → được; cùng chữ ký khác `kind` → được.
  - `"0165: chỉ đóng, không sửa tiền, không xoá"`: `UPDATE … SET amount` ném `/prc_append_only/`; đặt `valid_to_date` được; nới `valid_to_date` ra xa hơn ném lỗi; `DELETE` ném lỗi; `UPDATE`/`DELETE` dòng điều kiện ném lỗi.
  - `"0165: khoá điều kiện lạ bị khoá ngoại chặn"` (`PRAGMA foreign_keys = ON`).
  - `"0165: ngày bắt đầu áp chỉ thêm"`.
  Thêm vào `src/audit-invariants.test.ts` hai ca cho `R-PRC-PD-1`, `R-PRC-PD-2`: dữ liệu sạch → đạt; chèn quy tắc có `condition_sig` lệch dòng con → vi phạm.
- [ ] **Step 2: Chạy đỏ.** `node --test src/migrations-phi-don.test.ts src/audit-invariants.test.ts` → FAIL.
- [ ] **Step 3: Viết migration, sổ dữ liệu, hai mục bất biến.** `npm run dict`.
- [ ] **Step 4: Chạy xanh** cùng lệnh, cộng `src/architecture.test.ts src/hang-du-lieu.test.ts`.
- [ ] **Step 5: Quan sát rào chặn thật (P16).** Tạm bỏ `AND condition_sig = NEW.condition_sig` khỏi trigger → bài «khác kind thì được» hoặc «trùng bộ» đỏ → hoàn nguyên → xanh. Ghi dòng vào `docs/SO-HANG-RAO.md` (chặn gì, cơ chế, ngày quan sát).
- [ ] **Step 6: Commit** `Bảng phí đưa đón: quy tắc, điều kiện khoá–giá trị, ngày bắt đầu áp (ADR-0147 Đ2, ADR-0203 ĐB1)`.

### Task 6: Luật thuần và lớp 2 của sổ vàng

**Files:**
- Create: `src/modules/pricing/phi-don-rules.ts`, `phi-don-rules.test.ts`
- Modify: `src/so-vang-phi-don.test.ts`

**Interfaces:**
- Consumes: `hieuLuc`, `laNgay`, kiểu `GanLoaiMuc`, `GanRieng` từ `./rules.ts`.
- Produces (`phi-don-rules.ts`) — đây là giao diện mà Task 7, 8 và Đợt C dùng:
  ```ts
  export const KHOA_PHI_DON = ["ZONE", "DIRECTION", "SERVICE_GROUP", "EXCLUSIVE", "TIER", "SERVICE"] as const;
  export type KhoaPhiDon = (typeof KHOA_PHI_DON)[number];
  export type KieuPhiDon = "PER_PAX" | "PER_TRIP";
  export type DieuKienPhiDon = Partial<Record<KhoaPhiDon, string>>;
  export interface MucPhiDon { id: string; kind: KieuPhiDon; amount: number; validFrom: string; validTo: string | null; dieuKien: DieuKienPhiDon }
  export interface ChangTinhPhi {
    zoneCode: string; direction: "OUT" | "RETURN"; exclusive: boolean;
    catalogCode: string | null; groupCode: string | null; tierCode: string | null;
  }
  // MỘT danh sách đăng ký: mỗi khoá một bộ tính. Bài kiểm ép danh sách này khớp bảng prc_transfer_fee_key.
  export const BO_TINH: Record<KhoaPhiDon, { khop: (giaTri: string, c: ChangTinhPhi) => boolean; bac: number | null }>;
  //   bac: SERVICE=8, TIER=4, SERVICE_GROUP=2, DIRECTION=1; ZONE và EXCLUSIVE = null (bắt buộc khớp, không tính bậc)
  export type KetQuaPhiDon =
    | { trangThai: "CO_MUC"; muc: MucPhiDon; thua: { muc: MucPhiDon; viSao: string }[] }
    | { trangThai: "THIEU_MUC"; lyDo: "KHONG_CO_MUC" | "XUNG_DOT" };
  export function chonMucPhiDon(v: { chang: ChangTinhPhi; ngay: string; muc: readonly MucPhiDon[]; boTinh?: Readonly<Record<string, { khop: (giaTri: string, c: ChangTinhPhi) => boolean; bac: number | null }>> }): KetQuaPhiDon;
  //   boTinh mặc định là BO_TINH; chỉ bài kiểm «khoá giả» (Task 9) truyền bản mở rộng.
  export type CapCuaHoSo = { loai: "CO_CAP"; tierCode: string } | { loai: "KHONG_CAP" } | { loai: "HAI_CAP" };
  export function capCuaHoSoNgay(v: { partyId: string | null; vai: readonly string[]; ngay: string; gan: readonly GanLoaiMuc[]; ganRieng: readonly GanRieng[] }): CapCuaHoSo;
  export function tinhPhiChang(v: { muc: MucPhiDon; direction: "OUT" | "RETURN"; soKhachTinhTien: number; paxOverride: number | null }): { donGia: number; soLuong: number; tien: number } | null;
  export function chuKyDieuKien(d: DieuKienPhiDon): string;            // khoá sắp theo chữ cái, "KEY=value" nối bằng "|"
  export interface ThanMucPhiDon { kind: KieuPhiDon; amount: number; validFrom: string; validTo: string | null; note: string | null; dieuKien: DieuKienPhiDon }
  export function kiemThanMucPhiDon(body: unknown, biet: { vung: ReadonlySet<string>; cap: ReadonlySet<string>; nhom: ReadonlySet<string>; dichVu: ReadonlySet<string> }): Result<ThanMucPhiDon>;
  export function vungThieuDongChung(v: { vung: readonly string[]; muc: readonly MucPhiDon[]; ngay: string }): string[];
  export interface CanhBaoCapCaoHon { tierCode: string; zoneCode: string; direction: "OUT" | "RETURN"; exclusive: boolean; catalogCode: string | null; groupCode: string | null; tienCap: number; tienKhongCap: number }
  export function canhBaoCapCaoHon(v: { muc: readonly MucPhiDon[]; ngay: string; nhomCuaDichVu: ReadonlyMap<string, string | null> }): CanhBaoCapCaoHon[];
  ```
- Luật mà chữ ký và bài kiểm không tự xác định (chép từ TK ĐB1, ĐB2):
  - **Khớp:** dòng khớp chặng khi `hieuLuc` ngày `ngay`, mọi khoá có trong `dieuKien` đều `khop`, và chia nửa: chặng `exclusive` chỉ xét dòng `PER_TRIP`, chặng đi chung chỉ xét dòng `PER_PAX`. `TIER` khớp khi `tierCode` bằng giá trị (chặng không cấp không bao giờ khớp dòng có `TIER`). `EXCLUSIVE` giá trị duy nhất hợp lệ là `"1"`.
  - **Bậc:** tổng `bac` của các khoá có mặt (SERVICE 8, TIER 4, SERVICE_GROUP 2, DIRECTION 1) — số lớn hơn thắng, cho đúng thứ tự «dịch vụ, rồi cấp, rồi nhóm, rồi chiều» kể cả dòng nêu cả cấp lẫn nhóm (ca SV-PD-11).
  - **Ngang bậc:** hai dòng cùng bậc cao nhất, khác `amount` ⇒ `THIEU_MUC`/`XUNG_DOT`; cùng `amount` ⇒ lấy dòng `id` nhỏ hơn. Không dòng nào khớp ⇒ `THIEU_MUC`/`KHONG_CO_MUC`. **Không bao giờ trả 0 thay cho thiếu.**
  - **`thua.viSao`:** một câu tiếng Việt nêu khoá quyết định, ví dụ «thua vì dòng thắng nêu đích danh dịch vụ».
  - **`capCuaHoSoNgay`:** `partyId` null ⇒ `KHONG_CAP`; có `ganRieng` hiệu lực ngày đó ⇒ cấp riêng; không thì gom cấp của các `vai` qua `gan` hiệu lực: 0 cấp ⇒ `KHONG_CAP`, đúng 1 mã ⇒ `CO_CAP`, từ 2 mã khác nhau ⇒ `HAI_CAP`.
  - **`tinhPhiChang`:** `PER_TRIP` ⇒ số lượng 1. `PER_PAX` ⇒ `soKhachTinhTien`; chiều `RETURN` có `paxOverride` ⇒ `min(paxOverride, soKhachTinhTien)`. Số lượng 0 ⇒ trả `null` (không sinh dòng, không phải thiếu mức).
  - **`kiemThanMucPhiDon`:** bắt buộc `ZONE` thuộc `biet.vung`; `PER_TRIP` ⇔ có `EXCLUSIVE: "1"`; không vừa `SERVICE` vừa `SERVICE_GROUP`; `DIRECTION` ∈ `OUT`/`RETURN`; `TIER` ∈ `biet.cap`; `SERVICE_GROUP` ∈ `biet.nhom`; `SERVICE` ∈ `biet.dichVu`; khoá lạ, `amount` không nguyên hoặc âm, ngày sai, `validTo < validFrom` ⇒ lỗi.
  - **`vungThieuDongChung`:** vùng không có dòng `PER_PAX` chỉ mang khoá `ZONE` còn hiệu lực ngày `ngay`.
  - **`canhBaoCapCaoHon`:** duyệt mọi tổ hợp (vùng có trong `muc`) × (`OUT`, `RETURN`) × (đi chung, xe riêng) × (mỗi dịch vụ được nêu đích danh; mỗi nhóm được nêu, dùng một dịch vụ giả thuộc nhóm đó; và một dịch vụ giả không nhóm) × (mỗi cấp được nêu trong `muc`); gọi **`chonMucPhiDon`** hai lần (có cấp, không cấp); cả hai `CO_MUC` và tiền cấp > tiền không cấp ⇒ một cảnh báo. Không viết luật so sánh riêng.

- [ ] **Step 1: Bài thuần đỏ** `phi-don-rules.test.ts` (tự dựng `MucPhiDon` nhỏ, không đọc sổ vàng):
  - `"thiếu mức không bao giờ là 0"`: bảng rỗng ⇒ `{trangThai:"THIEU_MUC", lyDo:"KHONG_CO_MUC"}`.
  - `"dịch vụ thắng cấp, cấp thắng nhóm, nhóm thắng chiều"`: bốn cặp dòng, mỗi cặp một khẳng định `muc.id`.
  - `"dòng nêu cấp + nhóm thắng dòng chỉ nêu cấp"`.
  - `"ngang bậc khác tiền là xung đột; cùng tiền lấy id nhỏ"`.
  - `"xe riêng chỉ khớp theo chuyến"`: có dòng `PER_PAX` cấp 3 50.000 và dòng `PER_TRIP` 500.000 ⇒ chặng xe riêng cấp 3 ra dòng 500.000; chỉ có dòng `PER_PAX` ⇒ `THIEU_MUC`.
  - `"hết hiệu lực thì không khớp"` (ngày đúng `validTo` còn khớp, hôm sau không).
  - `"capCuaHoSoNgay"`: năm ca (không bên đặt; chưa gán; một vai một cấp; hai vai hai cấp ⇒ `HAI_CAP`; hai vai hai cấp nhưng có cấp riêng ⇒ cấp riêng; cấp riêng đã hết hạn ngày xét ⇒ về cấp vai).
  - `"tinhPhiChang"`: `(PER_PAX 30000, OUT, 2, null)` ⇒ `{30000,2,60000}`; `(RETURN, 2, 3)` ⇒ số lượng 2; `(RETURN, 3, 1)` ⇒ 1; `(OUT, 0, null)` ⇒ `null`; `PER_TRIP 500000` ⇒ `{500000,1,500000}`.
  - `"chuKyDieuKien"`: `{ZONE:"CR", TIER:"C1"}` và `{TIER:"C1", ZONE:"CR"}` cùng ra `"TIER=C1|ZONE=CR"`.
  - `"kiemThanMucPhiDon"`: tám thân sai của Review Focus 4 đều lỗi; một thân đúng mỗi kiểu.
  - `"BO_TINH khớp bảng khoá"`: áp migration vào `node:sqlite`, `SELECT code FROM prc_transfer_fee_key` sắp xếp bằng `Object.keys(BO_TINH)` sắp xếp; và `KHOA_PHI_DON` cũng vậy.
  - `"canhBaoCapCaoHon"`: dựng bảng mẫu từ `golden/phi-dua-don.json` (`bang_phi`) ⇒ có cảnh báo `{tierCode:"C3", zoneCode:"CR", groupCode:"HT", tienCap:80000, tienKhongCap:70000}`; thêm dòng `{ZONE:"CR", TIER:"C3", SERVICE_GROUP:"HT"}` 70.000 ⇒ cảnh báo đó biến mất (tiêu chí TK mục 8 điểm 5).
  - `"vungThieuDongChung"`: bảng mẫu, ngày `2026-12-01` ⇒ `[]`; bỏ `P02` ⇒ `["BAC"]`.
- [ ] **Step 2: Lớp 2 sổ vàng đỏ.** Trong `src/so-vang-phi-don.test.ts` thêm bài `"sổ vàng phí đón — lớp 2: luật thuần ra đúng đáp án"`: đổi `bang_phi` sang `MucPhiDon[]` (ánh xạ `vung→ZONE`, `cap→TIER`, `dich_vu→SERVICE`, `nhom→SERVICE_GROUP`, `chieu→DIRECTION`, `xe_rieng→EXCLUSIVE:"1"`, `tu/den→validFrom/validTo`, `tien→amount`, `kieu→kind`); chỉ chạy ca `da_xac_nhan`, ca còn chờ thành `test.todo`; khẳng định số ca chạy ≥ 25 và có danh sách `MA_BAT_BUOC` (mọi mã trừ `SV-PD-22`, `23`, `24`) để ca không lặng lẽ rơi. Với mỗi chặng của ca có `ap_dung: true`: `chonMucPhiDon` (cấp lấy từ `ben_dat.cap`; ca có lý do `DAI_LY_HAI_CAP` thì khẳng định bằng `capCuaHoSoNgay` với dữ liệu hai vai dựng trong bài) rồi `tinhPhiChang`; so `quy_tac` với `muc.id`, `don_gia`, `so_luong`, `tien`, và tổng. Đọc đầu tệp `golden/phi-dua-don.json` (`quy_uoc`) để ánh xạ đúng tên trường `khach`, `so_nguoi_rieng`.
- [ ] **Step 3: Chạy đỏ.** `node --test src/modules/pricing/phi-don-rules.test.ts src/so-vang-phi-don.test.ts` → FAIL (không có tệp `phi-don-rules.ts`).
- [ ] **Step 4: Viết `phi-don-rules.ts`** theo khối Interfaces. Hàm thuần, không I/O, import kèm đuôi `.ts`.
- [ ] **Step 5: Chạy xanh** cùng lệnh. Nếu một ca sổ vàng đỏ: **dừng, báo người điều phối**; không sửa đáp án đã được chủ xác nhận, không sửa luật cho khớp bằng suy đoán.
- [ ] **Step 6: Quan sát rào chặn thật.** Tạm đổi `bac` của `TIER` thành 16 ⇒ SV-PD-08 đỏ ⇒ hoàn nguyên ⇒ xanh. Ghi vào `docs/SO-HANG-RAO.md`.
- [ ] **Step 7: Commit** `Phí đưa đón: luật thuần chọn mức, cấp của hồ sơ, tiền một chặng; sổ vàng lớp 2`.

### Task 7: SQL và route bảng phí

**Files:**
- Create: `src/modules/pricing/phi-don-repo.ts`, `phi-don-route.ts`, `phi-don-route.test.ts`
- Modify: `src/modules/pricing/index.ts` (nối `...phiDonRoutes` vào `routes`; thêm tiền tố lỗi mới vào `loiBang` nếu cần), `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `src/architecture.test.ts` (`STRICT` thêm `modules/pricing/phi-don-repo.ts`), `src/route-access.test.ts`, `src/modules/pricing/ghi-muc-qua-cong.test.ts` chỉ khi bài quét bắt route mới

**Interfaces:**
- Consumes: mọi thứ của Task 6; `ctx.vungDon()` (Task 4); `groupsOf`, danh sách cấp và tên nhóm, tên dịch vụ đang có trong `repository.ts` và hàm công bố của `catalog` (`getEffectiveServices`, `tenCacNhom`); `chayLo`, `auditStatement`.
- Produces (`contracts.ts`):
  ```ts
  export interface MucPhiDonDto { id: string; kieu: "PER_PAX" | "PER_TRIP"; tien: number; tuNgay: string; denNgay: string | null; ghiChu: string | null;
    dieuKien: { vung: string; cap: string | null; dichVu: string | null; nhom: string | null; chieu: "OUT" | "RETURN" | null; xeRieng: boolean }; updatedAt: string }
  export interface CanhBaoPhiDonDto { cap: string; vung: string; chieu: "OUT" | "RETURN"; xeRieng: boolean; dichVu: string | null; nhom: string | null; tienCap: number; tienKhongCap: number }
  export interface PhiDonResponse { muc: MucPhiDonDto[]; batDauAp: { ngay: string | null; tuLuc: string | null }; canhBao: CanhBaoPhiDonDto[];
    vung: { code: string; name: string }[]; cap: { code: string; name: string }[]; nhom: { code: string; name: string }[]; dichVu: { code: string; name: string; nhom: string | null }[] }
  export interface PhiDonGhiResponse { muc: MucPhiDonDto; canhBao: CanhBaoPhiDonDto[] }
  export interface ThuTraPhiDonResponse {
    ketQua: { trangThai: "CO_MUC"; mucId: string; kieu: "PER_PAX" | "PER_TRIP"; donGia: number; soLuong: number; tien: number } | { trangThai: "THIEU_MUC"; lyDo: "KHONG_CO_MUC" | "XUNG_DOT" };
    thua: { mucId: string; tien: number; viSao: string }[] }
  ```
- Produces (route, tất cả `access: "admin"` + `can(staff, "admin.manage")`):
  - `GET /api/pricing/phi-don?ngay=YYYY-MM-DD` (mặc định hôm nay): dòng còn hiệu lực từ ngày đó trở đi + cảnh báo tính cho ngày đó.
  - `POST /api/pricing/phi-don` thân `{ kind, amount, validFrom, validTo, note, dieuKien }` → 201 `PhiDonGhiResponse`; thân sai → 400 `invalid_input`; trùng bộ điều kiện trùng ngày → 409 `prc_overlap`. Một `chayLo`: câu chèn quy tắc, các câu chèn điều kiện, nhật ký `prc_transfer_fee_added` (`detail`: kiểu, tiền, chữ ký bộ điều kiện, khoảng ngày).
  - `POST /api/pricing/phi-don/:id/ket-thuc` thân `{ validTo, expectedUpdatedAt }` → 200; `stale` → 409; nếu phí đón đang áp và sau khi kết thúc vùng của dòng không còn dòng chung hiệu lực từ `validTo + 1` → 409 `transfer_fee_general_required` kèm tên vùng. Nhật ký `prc_transfer_fee_ended`.
  - `POST /api/pricing/phi-don/bat-dau-ap` thân `{ ngay: string | null, tuLucDaDoc: string | null }` → 200; `ngay` khác null mà `vungThieuDongChung(vùng đang bật từ ctx.vungDon(), …, ngay)` không rỗng → 409 `transfer_fee_general_required` kèm danh sách tên vùng; khoá lạc quan theo khuôn `cauThemGioiHanNhap` (`WHERE (SELECT max(valid_from_at) …) IS ?`). Nhật ký `prc_transfer_fee_start_set`.
  - `GET /api/pricing/phi-don/thu-tra?vung=&chieu=&xeRieng=0|1&dichVu=&cap=&ngay=&soKhach=&soNguoiVe=` → `ThuTraPhiDonResponse`. `cap` trống = không có cấp. Nhóm của dịch vụ tra qua `groupsOf`. **Dùng đúng `chonMucPhiDon` + `tinhPhiChang`**, không tính riêng.
- Produces (hàm công bố ở `index.ts`, để Đợt C gọi; viết và kiểm ngay ở đây):
  ```ts
  export interface BangPhiDonChoDon { batDauAp: string | null; muc: MucPhiDon[]; cap: CapCuaHoSo }
  export function docBangPhiDonChoDon(db: D1Database, v: { bookerPartyId: string | null; ngay: string }): Promise<BangPhiDonChoDon>
  export { chonMucPhiDon, tinhPhiChang, type ChangTinhPhi, type KetQuaPhiDon, type MucPhiDon, type CapCuaHoSo } from "./phi-don-rules.ts";
  ```
  `docBangPhiDonChoDon`: đọc dòng «ngày bắt đầu áp» hiện hành, các quy tắc hiệu lực ngày `ngay` kèm điều kiện, vai và cấp của hồ sơ bên đặt (bảng của `pricing` và view `parties` mà `docBangChoChup` đang dùng) rồi gọi `capCuaHoSoNgay`.
- Produces (nhật ký): `prc_transfer_fee_added` «Thêm mức phí đưa đón», `prc_transfer_fee_ended` «Kết thúc mức phí đưa đón», `prc_transfer_fee_start_set` «Đặt ngày bắt đầu áp phí đưa đón» — group `"ledger"`; nhãn theo tên chủ chọn.

- [ ] **Step 1: Bài route đỏ** `phi-don-route.test.ts` (khuôn `cap-dai-ly-route.test.ts`). Hàm `gieo(w)` chèn bảng mẫu của sổ vàng qua chính `POST /api/pricing/phi-don` (trước đó tạo vùng `TT`, `BAC`, `CR` qua route Task 2, cấp `C1`, `C3` qua `POST /api/pricing/muc-ta`, nhóm và dịch vụ bằng SQL thẳng như các bài `pricing` khác). Các bài:
  - `"ai ghi, ai đọc"`: năm route, với Bán hàng, Kế toán, Đối tác, Thực tập → 403; Quản trị, Toàn quyền → 2xx (ADR-0147 tiêu chí 7).
  - `"thêm mức ghi đúng dòng và nhật ký"`: sau `POST` dòng `P06`, `prc_transfer_fee_rule` có một dòng `condition_sig = 'TIER=C3|ZONE=CR'`, hai dòng điều kiện, một dòng `audit_log` `prc_transfer_fee_added`; `detail` không chứa chữ số điện thoại hay tên người.
  - `"trùng bộ điều kiện"` → 409 `prc_overlap`, không ghi dòng nào, không nhật ký.
  - `"thân sai"`: tám thân của Review Focus 4 → 400, bảng không đổi.
  - `"cảnh báo cấp trả cao hơn"`: sau khi có `P09`, `POST` `P06` trả `canhBao` có một mục `{cap:"C3", vung:"CR", nhom:"HT", tienCap:80000, tienKhongCap:70000}` và vẫn 201; thêm dòng `C3 + HT` 70.000 → `GET` không còn mục đó.
  - `"đủ mức trước khi bật"`: chưa có dòng chung của `BAC` → `POST …/bat-dau-ap {ngay:"2026-12-01"}` → 409 `transfer_fee_general_required`, thân nêu «Bắc Nha Trang»; đủ rồi → 200; `GET` trả `batDauAp.ngay = "2026-12-01"`.
  - `"đang áp thì không kết thúc dòng chung cuối"`: `POST /phi-don/<P02>/ket-thuc` → 409; thêm dòng chung nối tiếp từ `2027-01-01` rồi kết thúc `P02` ngày `2026-12-31` → 200.
  - `"tắt phí đón"`: `bat-dau-ap {ngay:null}` → 200; sau đó kết thúc dòng chung cuối được.
  - `"khoá lạc quan"`: hai lần `bat-dau-ap` cùng `tuLucDaDoc` → lần hai 409 `stale`; `ket-thuc` với `expectedUpdatedAt` cũ → 409.
  - `"Thử tra khớp sổ vàng"`: với mỗi ca `da_xac_nhan` có `ap_dung: true` và mỗi chặng `CO_MUC`, gọi `GET …/thu-tra` → `tien`, `donGia`, `soLuong` bằng đáp án; `mucId` là dòng đã gieo ứng với `quy_tac`. Chặng `THIEU_MUC`/`KHONG_CO_MUC` (ca 17) → `trangThai: "THIEU_MUC"`.
  - `"docBangPhiDonChoDon"`: gọi thẳng với `fakeD1`: chưa đặt ngày → `batDauAp: null`; hồ sơ cấp 3 → `cap: {loai:"CO_CAP", tierCode}`; `bookerPartyId: null` → `KHONG_CAP`; hồ sơ hai vai hai cấp → `HAI_CAP`.
  - `"pricing không đọc locations"`: quét `phi-don-repo.ts` không có `loc_`.
- [ ] **Step 2: Chạy đỏ.** `node --test src/modules/pricing/phi-don-route.test.ts` → FAIL.
- [ ] **Step 3: Viết `phi-don-repo.ts`** (`defineSql("pricing", "transfer_fee_…")`: `rules_from` đọc quy tắc + điều kiện bằng một câu `LEFT JOIN`, `rule_find`, `rule_insert`, `condition_insert`, `rule_close` có `WHERE id = ?… AND updated_at = ?…`, `start_latest`, `start_insert` có khoá lạc quan) và **`phi-don-route.ts`** xuất `export const phiDonRoutes: Route[]`. Kiểm thân bằng `kiemThanMucPhiDon`; `condition_sig` bằng `chuKyDieuKien`.
- [ ] **Step 4: Nối vào `index.ts`**, khai nhãn nhật ký, DTO, ghim `route-access`, lớp chống ghi trùng (z11).
- [ ] **Step 5: Chạy xanh.** `node --test src/modules/pricing/ src/so-vang-phi-don.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/architecture.test.ts src/audit-invariants.test.ts` → PASS. `npm run typecheck` → 0 lỗi.
- [ ] **Step 6: Commit** `Phí đưa đón: route đặt mức, kết thúc mức, ngày bắt đầu áp, Thử tra`.

### Task 8: Màn «Phí đưa đón»

**Files:**
- Create: `public/phi-don.html` (chép `<head>` của `public/cap-dai-ly.html`), `web/phi-don.ts`, `src/shared/phi-don-hien-thi.ts`, `src/shared/phi-don-hien-thi.test.ts`
- Modify: `package.json` (`build:web` thêm `web/phi-don.ts`), `src/shared/sw-policy.ts` (`PAGES`, `PRECACHE`: `"/phi-don"`, `"/js/phi-don.js"`), `src/shared/muc-giao-dien.ts` (`TRANG.phiDon = { duong: "/phi-don", hien: ve("admin.manage"), moTrang: ve("admin.manage"), tam: (k) => k.admin }`; thanh bên nhóm `THIET_LAP` ngay sau «Cấp độ đại lý»; `TRANG_TOI`), `src/shared/muc-giao-dien-goi.ts` (`phiDon: "GET /api/pricing/phi-don"`), `src/shared/trang-chu-o.ts` chỉ khi các trang thiết lập khác đều có ô, bảng tham chiếu (+ `npm run tham-chieu`), `public/app.css` (token nếu cần)

**Interfaces:**
- Consumes: năm route của Task 7 và các DTO.
- Produces (`src/shared/phi-don-hien-thi.ts`, thuần, có bài kiểm):
  ```ts
  export function cauDieuKien(m: MucPhiDonDto, ten: { vung: ReadonlyMap<string,string>; cap: ReadonlyMap<string,string>; nhom: ReadonlyMap<string,string>; dichVu: ReadonlyMap<string,string> }): string
  //  ví dụ: "Bãi Dài – Cam Ranh · Đại lý cấp 3 · Nhóm Hòn Tằm · Chiều về"; ô trống hiện "Mọi cấp" chỉ khi không ô nào khác được nêu
  export function cauTien(m: Pick<MucPhiDonDto, "kieu" | "tien">): string     // "Miễn phí" | "50.000 đ/khách" | "500.000 đ/chuyến"
  export function cauCanhBao(c: CanhBaoPhiDonDto, ten: …): string             // lời do chủ chọn (mục «Tên chờ chủ chọn»)
  export function cauKetQuaThuTra(r: ThuTraPhiDonResponse, ten: …): string[]  // dòng thắng + từng dòng thua kèm vì sao; thiếu mức: "Chưa có mức cho tình huống này. Đơn như vậy sẽ không xác nhận được."
  ```

- [ ] **Step 1: Bài thuần đỏ** `phi-don-hien-thi.test.ts`: bốn hàm trên, mỗi hàm 2–3 khẳng định với chuỗi nguyên văn (0 đồng ⇒ `"Miễn phí"`; không chuỗi nào chứa `PER_PAX`, `OUT`, `RETURN`, `NGOAI_VUNG`).
- [ ] **Step 2: Khai chữ** vào bảng tham chiếu (màn, các nút «＋ Thêm mức», «Kết thúc mức», nút tra thử, nút bật, hai nút tắt/bật), `npm run tham-chieu`.
- [ ] **Step 3: Dựng màn** (`h()`), ba khối từ trên xuống:
  1. **Trạng thái:** «Phí đưa đón đang áp từ {ngày}» hoặc «Chưa áp phí đưa đón», nút đặt ngày; khi máy chủ trả `transfer_fee_general_required` hiện đúng danh sách khu vực còn thiếu mức chung.
  2. **Thử tra:** các ô khu vực, dịch vụ, cấp độ đại lý (mục đầu «Khách lẻ / chưa có cấp»), chiều, xe riêng, số khách, ngày; kết quả bằng `cauKetQuaThuTra`.
  3. **Bảng mức:** nhóm theo khu vực; mỗi dòng `cauDieuKien`, `cauTien`, khoảng ngày, nút kết thúc. Khối cảnh báo (`cauCanhBao`) ngay trên bảng khi `canhBao` không rỗng, và hiện lại ngay sau khi lưu một mức. Form thêm mức: khu vực (bắt buộc), kiểu đi chung / xe riêng (đổi kiểu thì đổi nhãn tiền «mỗi khách» / «mỗi chuyến»), cấp, dịch vụ **hoặc** nhóm (chọn cái này thì khoá cái kia), chiều, số tiền (ô 16px, `inputmode="numeric"`), từ ngày, đến ngày, ghi chú.
  Điện thoại: bảng thành thẻ như `web/cap-dai-ly.ts`.
- [ ] **Step 4: Kiểm.** `npm run build:web && node --test src/shared/phi-don-hien-thi.test.ts src/sw-policy.test.ts src/bang-tham-chieu.test.ts src/bang-tu-giao-dien.test.ts src/muc-giao-dien-hien-trang.test.ts src/muc-hien-mo-duoc-1.test.ts src/muc-hien-mo-duoc-2.test.ts src/muc-hien-mo-duoc-3.test.ts` → PASS. `npm run typecheck` → 0 lỗi.
- [ ] **Step 5: Ảnh thật.** Bản thử có bảng mẫu của sổ vàng: chụp màn hai hướng ở ba trạng thái (có cảnh báo cấp 3; kết quả Thử tra ca SV-PD-11; lỗi thiếu mức chung khi bật). Lưu `docs/evidence/2026-11-phi-don/`. Người điều phối gửi chủ duyệt bố cục.
- [ ] **Step 6: Commit** `Màn Phí đưa đón: bảng mức, Thử tra, cảnh báo cấp trả cao hơn, ngày bắt đầu áp`.

### Task 9: e2e, tài liệu, bộ kiểm đủ, kiểm độc lập

**Files:**
- Create: `tests/e2e/phi-don.mjs`; `docs/superpowers/plans/2026-11-14-phi-don-thi-cong-nhat-ky.md`
- Modify: `tests/e2e/danh-sach.mjs`, `tests/e2e/locations.mjs` (thêm kiểm `zones`), `docs/SYSTEM-DESIGN.md` (§5 bảng, §7 API), `docs/CHANGE-GUIDE.md` (một công thức «thêm khoá điều kiện phí đón»: một dòng `prc_transfer_fee_key` bằng migration + một mục `BO_TINH` + ADR), `docs/HANDOFF-N1.md` (mục nhật ký thay đổi cho lần phát hành), `docs/SO-HANG-RAO.md`

- [ ] **Step 1: Kịch bản e2e** `phi-don.mjs` (khuôn `tests/e2e/locations.mjs`, đăng nhập qua `session()`): Quản trị tạo một vùng, xếp một địa điểm, thêm mức chung cho mọi vùng đang bật, thêm một mức cấp, Thử tra ra đúng số, đặt ngày bắt đầu áp; Bán hàng gọi cùng route → 403; **tạo và xác nhận một đơn có chặng → đơn không có dòng phí nào và tổng tiền như trước** (Đợt C chưa có: đây là tiêu chí «chưa đơn nào bị đổi tiền»). Cuối kịch bản đặt lại `bat-dau-ap {ngay:null}` để không ảnh hưởng kịch bản khác trên D1 chung.
- [ ] **Step 2: Tiêu chí «khoá giả»** (ADR-0147 tiêu chí 6): thêm bài vào `phi-don-rules.test.ts` — dựng `BO_TINH` mở rộng một khoá giả trong bài và chạy `chonMucPhiDon` qua tham số `boTinh` (Task 6): dòng mang khoá giả khớp và thắng đúng theo `bac` đã khai; và bài quét: `src/modules/orders/`, `van-chuyen/`, `ve-dien-tu/` không chứa tên khoá điều kiện nào ngoài qua `pricing/index.ts`.
- [ ] **Step 3: Tài liệu mô tả** theo danh sách Files. Sổ nhật ký thi công ghi: số migration thật đã dùng, tên chủ đã chọn, các giả định, nợ còn lại cho Đợt C.
- [ ] **Step 4: Bộ kiểm đủ, một lần.** Tắt mọi `wrangler dev` mồ côi trước. Chạy lần lượt: `npm run typecheck` → 0 lỗi; `npm test` → xanh; `npm run test:e2e` → xanh (cần mạng); kịch bản Chrome của màn Địa điểm theo bảng ở `web/CLAUDE.md`. Ghi kết quả vào nhật ký thi công. Đỏ ở bài không liên quan: tra bộ nhớ dự án về bài đỏ giả trước khi kết luận.
- [ ] **Step 5: Người kiểm độc lập.** Người điều phối giao `nguoi-kiem-doc-lap` (chỉ đọc) với đề bài: đọc ADR-0147 Đ1–Đ2, ADR-0203 ĐB1–ĐB2, TK mục 5 và mục 7; tự chạy lại các lệnh kiểm; đối chiếu từng tiêu chí của TK mục 7 thuộc Đợt A, B; thử phá năm điểm ở «Review Focus». Chỉ báo «đạt» theo báo cáo đó.
- [ ] **Step 6: Commit** tài liệu và nhật ký. Người điều phối báo chủ bốn mục (Đã làm, Đã kiểm, Chưa làm, Cần bạn quyết) và đưa lệnh `npm run day-len` một lần; nói rõ lần này **cần triển khai** (hai migration) và chủ tự chạy `npm run trien-khai`.

---

## Đối chiếu với bản thiết kế

| Yêu cầu | Task |
|---|---|
| ADR-0147 Đ1: `loc_zone`, `zone_code`, `NGOAI_VUNG`, view, quyền, nhật ký | 1, 2, 3 |
| Không thêm cạnh phụ thuộc | 4 (tiêm `ctx.vungDon`), 7 (bài quét) |
| ADR-0147 Đ2: quy tắc, điều kiện khoá–giá trị, bảng khoá có khoá ngoại, danh sách đăng ký khớp bảng | 5, 6 |
| ĐB1: hai khoá mới, không vừa nhóm vừa dịch vụ, thứ tự cố định, xe riêng tách nửa, chống trùng lúc đặt, xung đột không chọn bừa | 5, 6, 7 |
| ĐB1: đủ mức trước khi bật; không kết thúc dòng chung cuối khi đang áp | 6 (`vungThieuDongChung`), 7 |
| ĐB1: Thử tra nêu dòng thắng, dòng thua, vì sao | 6, 7, 8 |
| TK mục 8 điểm 5: cảnh báo cấp trả cao hơn, tính bằng chính hàm chọn mức | 6, 7, 8 |
| ĐB2: hàm «cấp của hồ sơ X ngày D», ba trường hợp không ra cấp | 6, 7 (`docBangPhiDonChoDon`) |
| ĐB2: số khách tính tiền, `pax_override` kẹp min, 0 khách không sinh dòng | 6 (`tinhPhiChang`) |
| Sổ vàng lớp 2, chỉ đếm ca đã xác nhận | 6 |
| Thử tra trả cùng số với sổ vàng | 7 |
| Tiêu chí 6 (khoá giả), tiêu chí 7 (403) | 9, 2, 7 |
| Chưa có ngày bắt đầu áp / chưa có Đợt C: đơn chạy như hôm nay | 9 (e2e) |
| **Để Đợt C:** dòng phí trên đơn, chụp mã cấp, cổng thiếu mức, công nợ đại lý, biên nhận, câu nhắc ở màn gán cấp (trang ghép), ca SV-PD-22…26 phần tiền đơn | kế hoạch riêng |
