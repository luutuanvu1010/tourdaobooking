# Kế hoạch thi công: Sổ đại lý đợt 1 (bảng mức hoa hồng, người bán, tự tính giá đại lý, khoá tháng)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kế toán đặt bảng mức hoa hồng theo vai / đối tác × dịch vụ / nhóm (% hoặc đ/khách) và người bán của từng dịch vụ; Nền tảng tự chụp mức vào đơn lúc Xác nhận, hiện "Phần đối tác" (hoa hồng, giá đại lý) trên trang đơn, và cho Kế toán khoá sổ theo tháng.

**Architecture:** Module mới `pricing` (STRICT) giữ ba bảng `prc_*` và toàn bộ luật thuần chọn mức / tính tiền (`pricing/rules.ts`). `orders` gọi `pricing/index.ts` để đọc bảng rồi gửi các câu chụp `ord_service_terms` trong CÙNG lô xác nhận, gác bằng chuỗi `changes() > 0`. Module mới `ky-so` (STRICT) giữ `ky_period_close`; `billing` và `van-chuyen` kiểm tháng đã khoá ở mã (409) và ở trigger trên bốn bảng tiền có ngày phát sinh.

**Tech Stack:** TypeScript, Cloudflare Worker + D1 (SQLite), giao diện thuần dựng bằng `h()`, esbuild, `node --test` (Node 22), `node:sqlite` cho bài migration, khung thử `tests/audit/harness.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md` (ĐÃ DUYỆT 2026-10-08; hai điểm "Chờ bạn xác nhận lại" ở cuối Phần A) + báo cáo kiểm độc lập `kiem-doc-lap.md` cùng thư mục + ADR-0077, ADR-0078, ADR-0080 (`docs/adr/`). Người thi công đọc đặc tả và báo cáo kiểm trước Task 1. Đặc tả thắng kế hoạch khi lệch.

**Hai điểm chờ chủ (ảnh hưởng đúng Task 6):** kế hoạch viết theo bản khuyến nghị — điểm 1 = (a) "chấp nhận đơn đại lý tự lập bị giữ ở Đã giao tới đợt 2", điểm 2 = "chỉ ghi bên đặt là chính tài khoản khi hồ sơ của tài khoản mang vai được hưởng". Chủ chọn (b) ở điểm 1 thì Task 6 bỏ Bước 3–4 (luật Đối tác), giữ phần còn lại.

## Global Constraints

- **Không thêm dependency runtime.** `package.json` chỉ đổi danh sách tệp của script `build:web`.
- **Migration:** chỉ thêm MỘT tệp mới, tên `NNNN_so_dai_ly_dot_1.sql`, số dự kiến `0090`. Task 0 rà lại "lớn nhất trên mọi nhánh + 1"; bài kiểm tìm tệp theo đuôi `_so_dai_ly_dot_1.sql` nên đổi số chỉ đổi tên tệp.
- **Tiền:** `INTEGER` VNĐ. Mọi số hoa hồng / giá vốn tính ở máy chủ bằng `pricing/rules.ts`. **Làm tròn nửa lên tới đồng, theo từng dòng** (`lamTronNuaLen`), điều A1 chủ duyệt. Tỷ lệ lưu bằng **phần vạn** (`rate_bp`, 12,5% = 1250).
- **Thành tiền và số khách của một dòng dịch vụ** lấy từ DTO đơn HIỆN HÀNH do `loadOrderView` trả (đã áp dòng điều chỉnh qua `applyAdjustmentToOrder`): thành tiền = tổng `items[].lineTotal` của dịch vụ; số khách tính hoa hồng = `soKhachTinhHoaHong` (người lớn + trẻ em + người cao tuổi; dịch vụ theo nhóm đếm lượt = tổng `items[].quantity`). Không viết công thức thứ hai.
- **Câu chữ nguyên văn:**
  - Thiếu mức: "Thiếu mức — Kế toán xử lý".
  - Khoá tháng: `` `Tháng ${MM}/${YYYY} đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)` `` (hàm `cauKyKhoa` ở `ky-so/rules.ts`, MỘT nguồn).
  - Bảng mức đổi giữa lúc đọc và ghi: "Bảng mức vừa đổi — thử lại".
  - Đơn xác nhận trước đợt 1: "Đơn xác nhận trước khi có bảng mức — chờ chụp bù ở bản sau".
  - Tài khoản Đối tác chưa gắn hồ sơ: "Tài khoản đối tác chưa gắn hồ sơ — nhờ văn phòng".
  - Câu báo "Đã giao" mã `booker_partner`: "Đơn của đối tác (có người hưởng hoa hồng) — chưa bấm Đã giao được cho tới bản cập nhật sổ đại lý."
- **Không lộ mã thô** ra người dùng (`MISSING`, `RATE`, `PER_PAX`, `NO_RULE`…): nhãn tiếng Việt ở `src/shared/so-dai-ly-nhan.ts` (Task 5).
- **DTO Đối tác** (`holdsPartner(staff)`, kể cả tài khoản lai) KHÔNG có khoá tên chứa `rate`, `perPax`, `cost`, `ruleId`, `termId`, `source`, `supplier`; không tỷ lệ, không đ/khách, không giá vốn (C9 = A).
- **Nhật ký** không ghi SĐT, email, MST, tiền khách. Hành động mới: `prc_commission_rule_added`, `prc_commission_rule_closed`, `prc_supply_term_added`, `prc_supply_term_closed`, `order_terms_captured`, `order_terms_recaptured`, `order_terms_manual`, `ledger_period_closed`. Lịch sử đơn **lọc bỏ `order_terms_*`** khi người xem `holdsPartner`.
- **Lô xác nhận:** thứ tự cố định `legFill → UPDATE orders → nhật ký confirmed (changes()>0) → chụp dòng 1 (changes()>0) → … → chụp dòng n → nhật ký order_terms_captured (changes()>0)`. `results[1]` vẫn quyết định thắng thua. **Không** đọc `audit_log`, **không** so `updated_at = at` để gác câu chụp.
- **Ô quyền:** mỗi ô vào `MATRIX` cùng task với route đầu tiên hỏi nó (`src/permission-enforcement.test.ts` đỏ nếu ô không có `can(` nào): Task 3 bốn ô `partner.commission.*`, `supply.terms.*`; Task 5 hai ô `order.terms.*`; Task 7 ô `ledger.period.close`. Cột `HR`, `DRIVER`, `DRIVER_PARTNER` = `none`. **Không** đổi `O_GHI_TIEN` (đặc tả §6, N6).
- **Thêm ô quyền / module** thì cùng commit: `TEN_THAO_TAC` / `TEN_PHAN_HE` ở `src/shared/tro-ly-cau-truc-ten.ts` + tệp sinh `src/shared/tro-ly-cau-truc.ts` (`npm run build:web` sinh lại; commit cả hai).
- **Route mới** (12): pricing 8 (`GET hoa-hong`, `POST hoa-hong`, `POST hoa-hong/:id/dong`, `GET thu-tra`, `GET cung-ung`, `POST cung-ung`, `POST cung-ung/:id/dong`, `GET nguoi-huong`), orders 2 (`GET /api/orders/:id/thuong-mai`, `POST /api/orders/:id/thuong-mai/:serviceId`), billing 2 (`GET /api/ledger/ky`, `POST /api/ledger/ky/:period/khoa`). Số đếm `src/route-access.test.ts` hôm nay 256 → 268; route ghi có đăng nhập `src/lan-gui-phu-route.test.ts` 153 → 159. Mỗi task thêm route nâng số của mình.
- **Mỗi route ghi = một lô** (`db.batch`), nhật ký cùng lô. Route tạo trả 201 kèm `Location` (CHANGE-GUIDE z11).
- **Nới hàng rào kiến trúc chỉ đúng các mục C12** (đặc tả §10), mỗi chú thích ghi "NỚI hàng rào đã duyệt (Điều 9.4) — chủ duyệt C12 2026-10-01, xem `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/de-xuat-luat.md`". Ngoài ra chỉ được thêm tệp nửa nghiêm `orders/thuong-mai-repo.ts` vào `NUA_NGHIEM` (đặc tả §5 cho phép).
- **Giao diện:** không `innerHTML`; dựng bằng `h()`; CSS chỉ token ở `:root` của `public/app.css`; ô gõ 16px; thêm nhãn `h2/h3/button` thì `npm run build:web` sinh lại `src/shared/so-do-trang.ts` và **phải commit** tệp đó.
- **Lệnh cấm AI tự chạy** (CLAUDE.md §8): `git push`, merge `main`, `wrangler deploy/rollback/secret`, `d1 migrations apply --remote`, ghi D1 remote, `curl` ghi production, `--force`. Không `git stash` trần.
- **Mỗi task kết thúc** với `npm run typecheck` 0 lỗi và `npm test` xanh, rồi commit. Thông điệp commit tiếng Việt có dấu, thân nói vì sao, dòng cuối `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (trợ lý Sonnet ghi `Claude Sonnet 5.5`).
- **P16:** mỗi trigger / hàng rào mới phải được thấy chặn thật một lần (sửa cố ý → đỏ → hoàn nguyên), ghi vào bảng "Quan sát chặn thật" của sổ thi công.
- **Việc lớn:** người thi công không tự nghiệm thu; Task 14 gọi người kiểm độc lập chỉ đọc.

## Review Focus

1. **Hai người bấm Xác nhận cùng một đơn cùng lúc** (cùng `updatedAt` đã đọc): người dùng chờ một người 200, người kia 409 "vừa đổi", không ai 500, và đơn có đúng một bộ bản chụp. Ghim ở Task 4 (bài `Promise.all` hai lệnh xác nhận).
2. **Tài khoản Đối tác gắn hồ sơ TỔ CHỨC (công ty lữ hành) lập đơn:** người dùng chờ bên đặt là chính công ty đó và đơn hiện hoa hồng, không phải bên đặt trống lặng lẽ (`BOOKER_VALUE` hôm nay ghi NULL cho tổ chức). Ghim ở Task 6.
3. **Kế toán khoá tháng đúng lúc người khác đang ghi tiền vào tháng đó** (trigger bắn sau khi mã đã kiểm): người dùng chờ câu 409 tiếng Việt, không 500 — ở cả sổ tiền lẫn chi phí xe. Ghim ở Task 7 (billing) và Task 8 (van-chuyen) bằng bài chèn dòng `ky_period_close` giữa lúc đọc và lúc ghi.
4. **Đối tác thấy tỷ lệ % qua đường phụ** (lịch sử đơn, biên nhận, QR, danh sách đơn): người dùng (công ty) chờ con số 480.017 không bao giờ xuất hiện trong bất kỳ phản hồi nào Đối tác gọi được. Ghim ở Task 5 (bài số lạ phủ cả `GET /api/orders/:id`).
5. **Kế toán đóng dòng mức đúng lúc người bán bấm Xác nhận:** người dùng chờ 409 "Bảng mức vừa đổi — thử lại" và đơn vẫn là nháp, bấm lại thì xác nhận với mức mới. Ghim ở Task 4.

---

## Bản đồ tệp

| Tệp | Tạo/Sửa | Trách nhiệm |
|---|---|---|
| `migrations/0090_so_dai_ly_dot_1.sql` | Tạo | vai `SUPPLIER`, `v_pty_open_role`, `v_ctl_service_group`, ba bảng `prc_*` + trigger + gieo, `ord_service_terms` + trigger, `v_ord_terms_missing`, `ord_audit_cutoff`, `ky_period_close` + trigger, bốn trigger `*_period_closed` |
| `src/migrations-so-dai-ly.test.ts` | Tạo | bài `node:sqlite` cho mọi trigger / CHECK của migration |
| `src/modules/pricing/rules.ts` (+ `.test.ts`) | Tạo | người hưởng, `chonMuc`, `chonDieuKhoan`, `lamTronNuaLen`, `hoaHongDong`, `giaVonDong`, `soKhachTinhHoaHong`, `chupDon`, `tinhDongDoiTac`, kiểm thân route |
| `src/modules/pricing/repository.ts` | Tạo | SQL `prc_*` + đọc view công bố (defineSql) |
| `src/modules/pricing/index.ts` | Tạo | `pricingModule` (8 route) + hàm công bố `docBangChoChup`, `laNguoiHuong`, tái xuất luật thuần |
| `src/modules/orders/thuong-mai-repo.ts` | Tạo | (nửa nghiêm) câu chụp, đọc bản chụp hiện hành, câu ghi tay |
| `src/modules/orders/thuong-mai.ts` (+ `.test.ts`) | Tạo | dựng hai DTO danh sách trắng (văn phòng / Đối tác), luật thân ghi tay |
| `src/modules/orders/repository.ts`, `service.ts`, `index.ts`, `dat-gap.ts` | Sửa | `confirmOrder` nhận câu kèm; `BOOKER_VALUE`, `resolveBooker`; route xác nhận, đổi bên đặt, hai route thương mại; lọc lịch sử |
| `src/modules/ky-so/{rules,repository,index}.ts` (+ `rules.test.ts`) | Tạo | luật kỳ, `khoaKyStatement`, `thangDaKhoa` |
| `src/modules/billing/rules.ts`, `service.ts`, `coc.ts`, `thay-lan-thu.ts`, `repository.ts`, `index.ts` | Sửa | `ngayPhatSinh` nhận tháng khoá; dịch `period_closed:`; hai route kỳ; đổi chữ `booker_partner` |
| `src/modules/van-chuyen/tien-xe.ts`, `tien-xe-lo.ts`, `tien-xe-chi-phi.ts`, `tien-xe-lenh.ts`, `dieu-phoi-lenh.ts`, `index.ts` | Sửa | `kyDaKhoa` thật ở ba nơi gọi `ngayGhiDao` và ngày mặc định điều chỉnh; 409 khi chụp giá cho tháng đã khoá |
| `src/shared/permissions.ts` (+ `.test.ts`) | Sửa | bảy ô |
| `src/shared/contracts.ts`, `audit-actions.ts`, `tro-ly-cau-truc-ten.ts`, `tro-ly-cau-truc.ts` (sinh), `so-dai-ly-nhan.ts` (tạo) | Sửa/Tạo | DTO; tám hành động nhật ký; tên lời thường; nhãn tiếng Việt |
| `src/architecture.test.ts` | Sửa | cạnh, STRICT, tiền tố, `VIEW_CHO_TRIGGER_VC`, `NUA_NGHIEM` |
| `src/index.ts` | Sửa | thêm `pricingModule`, `kySoModule` vào mảng `modules` |
| `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | Sửa | `R-PRC-1…5`, `R-ORD-T1`, `R-ORD-T1w`, `R-ORD-T2`, `R-KY-1`, `R-KY-2` |
| `web/hoa-hong.ts`, `web/nguoi-ban.ts`, `web/khoa-thang.ts` + `public/{hoa-hong,nguoi-ban,khoa-thang}.html` | Tạo | ba màn mới |
| `web/phan-doi-tac.ts` | Tạo | khối "Phần đối tác" + hộp "Ghi mức tay" gắn vào trang đơn |
| `web/dat-qua-doi-tac.ts` | Tạo | ô "Đặt qua đối tác" dùng ở form lập đơn và bảng đổi bên đặt |
| `web/order.ts`, `web/order-form.ts`, `web/booker-sheet.ts`, `web/shell.ts` | Sửa | gắn khối, ô bên đặt, nhãn "Bên đặt (đối tác)", mục điều hướng |
| `src/shared/sw-policy.ts`, `package.json` | Sửa | `PAGES`, `PRECACHE`, `build:web` |
| `tests/e2e/so-dai-ly.mjs`, `tests/e2e/khoa-thang.mjs`, `tests/e2e/run.mjs` | Tạo/Sửa | kịch bản API |
| `docs/data-dictionary.json` (+ `npm run dict`), `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/SO-HANG-RAO.md`, `docs/HANDOFF-N1.md`, `golden/so-cong-no-luot-2.json`, `golden/README.md`, nhật ký thay đổi | Sửa/Tạo | tài liệu mô tả, sổ hàng rào, runbook, sổ vàng, mục 1.87 |
| `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/de-xuat-luat-dot-1.md` | Tạo | đề xuất diff `docs/ARCHITECTURE.md` dòng 5.14 + đề xuất bổ sung ADR-0090 (chủ duyệt) |

**Tệp có thể đụng nhánh `adr-0104-d2` (Vận chuyển, giữ `0089`):** `src/modules/van-chuyen/*`, `src/modules/orders/repository.ts`, `src/architecture.test.ts`, `src/route-access.test.ts`, `src/lan-gui-phu-route.test.ts`. Nhánh nào gộp sau thì dựng lại trên `main` mới và chạy lại toàn bộ kiểm.

---

### Task 0: Kiểm trước khi thi công, mở sổ thi công

**Files:**
- Create: `docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md`

- [ ] **Step 1: Chốt số migration.** Chạy từ thư mục worktree:

```bash
ls migrations | tail -3
git for-each-ref --format='%(refname:short)' refs/heads | while read b; do git ls-tree --name-only "$b" migrations/ 2>/dev/null; done | sort -u | tail -8
```

Số = lớn nhất trong hai danh sách + 1 (hôm nay dự kiến `0090`, vì `0089` do `adr-0104-d2` giữ). Ghi số vào sổ thi công.

- [ ] **Step 2: Chốt số đếm route.** Chạy:

```bash
grep -n "actual.length, [0-9]*" src/route-access.test.ts
grep -n "length, [0-9]*, \"số route ghi" src/lan-gui-phu-route.test.ts
```

Kỳ vọng 256 và 153. Khác thì ghi số thật vào sổ thi công; các task sau cộng thêm đúng số route của mình (+12 tổng, +6 route ghi).

- [ ] **Step 3: Nền xanh.** `npm run typecheck && npm test` — kỳ vọng thoát 0. Đỏ thì dừng, báo điều phối.

- [ ] **Step 4: Mở sổ thi công** với nội dung:

```markdown
# Sổ thi công — Sổ đại lý đợt 1

- Kế hoạch: `docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-ke-hoach.md`. Đặc tả: `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md`.
- Số migration chốt: `00NN_so_dai_ly_dot_1.sql` (rà lúc <giờ>, các nhánh giữ số: …).
- Số route lúc bắt đầu: tổng …, ghi có đăng nhập ….

## Ruling
(mỗi dòng: `Ruling: <quyết> — <vì sao> — <giá nếu sai>`)

## Quan sát chặn thật (P16)
| Hàng rào | Sửa cố ý | Đỏ ở bài | Hoàn nguyên | Ngày |
|---|---|---|---|---|

## Nợ, việc để đợt 2
```

- [ ] **Step 5: Commit.**

```bash
git add docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md
git commit -m "Sổ thi công sổ đại lý đợt 1: chốt số migration và số route" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Migration, bài kiểm migration, từ điển dữ liệu, tiền tố kiến trúc

**Files:**
- Create: `migrations/0090_so_dai_ly_dot_1.sql` (số theo Task 0)
- Create: `src/migrations-so-dai-ly.test.ts`
- Modify: `src/architecture.test.ts` (`ALLOWED_EDGES`, `TABLE_PREFIX`, `VIEW_PREFIX`, `VIEW_CHO_TRIGGER_VC`)
- Modify: `docs/data-dictionary.json`, sinh lại `docs/DATA-DICTIONARY.md`

**Interfaces:**
- Produces (bảng/view dùng ở các task sau, tên cột chính xác):
  - `v_pty_open_role(party_id, role_type_code, role_group)`; `v_ctl_service_group(catalog_code, group_code)`.
  - `prc_beneficiary_role(role_type_code, active, …)`; `v_prc_beneficiary_role(role_type_code)` (chỉ dòng `active = 1`).
  - `prc_commission_rule(id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, note, created_at, created_by, updated_at, updated_by)`; `v_prc_commission_rule` (mọi cột trừ `note` và WHO).
  - `prc_supply_term(id, scope, catalog_code, group_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, valid_to_date, note, WHO)`; `v_prc_supply_term` (mọi cột trừ `note` và WHO).
  - `ord_service_terms(…)` như đặc tả §3; `v_ord_terms_missing(order_id)`; `ord_audit_cutoff(code, cutoff_at, WHO)` có dòng `R-ORD-T1`.
  - `ky_period_close(period, closed_at, closed_by, note, WHO)`; `v_ky_closed_period(period)`.
  - Mã lỗi trigger (tiền tố trước dấu `:`): `prc_append_only`, `prc_overlap`, `prc_target_not_beneficiary`, `prc_role_not_beneficiary`, `prc_seller_not_supplier`, `prc_supplier_mismatch`, `prc_all_owner_only`, `prc_transfer_no_supplier`, `terms_append_only`, `terms_service_mismatch`, `terms_supersede_mismatch`, `terms_one_current`, `terms_order_not_confirmed`, `terms_order_delivered`, `terms_rule_stale`, `terms_term_stale`, `period_not_adjacent`, `ky_append_only`, `period_closed`.

- [ ] **Step 1: Viết bài kiểm đỏ** `src/migrations-so-dai-ly.test.ts`:

```ts
// Kiểm migration *_so_dai_ly_dot_1.sql (ADR-0077, ADR-0078 B1, ADR-0080 D1; đặc tả docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md §3, §12 tiêu chí 4).
// Chèn THẲNG bằng SQL — mỗi trigger / CHECK có một ca đỏ và một ca xanh. Áp toàn bộ migration lên SQLite bộ nhớ (khuôn src/migrations-tai-khoan-nhan-tien.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_so_dai_ly_dot_1.sql"));
const AT = "2026-10-08T03:00:00.000Z";
type V = string | number | null;
const run = (db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).run(...a);
const one = <T>(db: DatabaseSync, sql: string, ...a: V[]) => db.prepare(sql).get(...a) as T;

interface The { db: DatabaseSync; ct: string; dl: string; ncc: string; txd: string }
let n = 0;
const id = (p: string) => `${p}${++n}`;
function party(db: DatabaseSync, kind: "PERSON" | "ORGANIZATION", ten: string, vai: string | null): string {
  const p = id("p");
  run(db, "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)", p, kind, ten, AT, AT);
  if (vai) run(db, "INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)", id("r"), p, vai, AT, AT);
  return p;
}
function moi(): The {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  db.exec("PRAGMA foreign_keys = ON");
  const ct = one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company LIMIT 1").party_id;
  return { db, ct, dl: party(db, "ORGANIZATION", "Đại lý A", "TRAVEL_AGENCY"), ncc: party(db, "ORGANIZATION", "i-resort", "SUPPLIER"), txd: party(db, "PERSON", "Tài xế B", "DRIVER_EXTERNAL") };
}
function muc(db: DatabaseSync, o: Partial<{ party: string | null; role: string | null; scope: string; code: string | null; group: string | null; kind: string; bp: number | null; pp: number | null; from: string; to: string | null }> = {}): string {
  const r = id("m");
  run(db, `INSERT INTO prc_commission_rule (id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, note, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'kt', ?, 'kt')`,
    r, o.party ?? null, o.party ? null : (o.role ?? "TRAVEL_AGENCY"), o.scope ?? "ALL", o.code ?? null, o.group ?? null, o.kind ?? "RATE",
    (o.kind ?? "RATE") === "RATE" ? (o.bp ?? 1000) : null, (o.kind ?? "RATE") === "PER_PAX" ? (o.pp ?? 50000) : null, o.from ?? "2026-01-01", o.to ?? null, AT, AT);
  return r;
}
function dieuKhoan(db: DatabaseSync, o: { scope: string; code?: string | null; group?: string | null; seller: string; supplier?: string | null; bp?: number | null; from?: string }): string {
  const r = id("d");
  run(db, `INSERT INTO prc_supply_term (id, scope, catalog_code, group_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, valid_to_date, note, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, 'kt', ?, 'kt')`, r, o.scope, o.code ?? null, o.group ?? null, o.seller, o.supplier ?? null, o.bp ?? null, o.from ?? "2026-01-01", AT, AT);
  return r;
}

test("có đúng một tệp migration sổ đại lý; vai SUPPLIER, năm vai được hưởng, dòng điều khoản ALL gieo sẵn trỏ công ty chủ", () => {
  assert.ok(FILE, "thiếu migrations/*_so_dai_ly_dot_1.sql");
  const { db, ct } = moi();
  assert.equal(one<{ role_group: string }>(db, "SELECT role_group FROM pty_role_type WHERE code = 'SUPPLIER'").role_group, "OTHER");
  const vai = (db.prepare("SELECT role_type_code FROM v_prc_beneficiary_role ORDER BY 1").all() as { role_type_code: string }[]).map((r) => r.role_type_code);
  assert.deepEqual(vai, ["COLLABORATOR", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "TRAVEL_AGENCY"]);
  const g = one<{ seller_party_id: string; supplier_party_id: string | null; valid_from_date: string }>(db, "SELECT seller_party_id, supplier_party_id, valid_from_date FROM prc_supply_term WHERE scope = 'ALL'");
  assert.equal(g.seller_party_id, ct);
  assert.equal(g.supplier_party_id, null);
  assert.equal(g.valid_from_date, "2025-01-01");
  assert.ok(one<{ cutoff_at: string }>(db, "SELECT cutoff_at FROM ord_audit_cutoff WHERE code = 'R-ORD-T1'").cutoff_at);
});

test("v_ctl_service_group: nhóm hiện hành = seq lớn nhất; SB16D thuộc TXE", () => {
  const { db } = moi();
  const r = one<{ group_code: string } | undefined>(db, "SELECT group_code FROM v_ctl_service_group WHERE catalog_code = 'SB16D'");
  assert.equal(r?.group_code, "TXE");
});

test("prc_commission_rule: không xoá; chỉ đóng một lần; không chồng; đối tượng phải được hưởng; CHECK kiểu / phạm vi", () => {
  const { db, dl, txd } = moi();
  const a = muc(db, { from: "2026-01-01" });
  assert.throws(() => run(db, "DELETE FROM prc_commission_rule WHERE id = ?", a), /prc_append_only:/);
  assert.throws(() => run(db, "UPDATE prc_commission_rule SET rate_bp = 2000 WHERE id = ?", a), /prc_append_only:/);
  assert.throws(() => muc(db, { from: "2026-06-01" }), /prc_overlap:/, "cùng vai, cùng ALL, chồng khoảng");
  assert.throws(() => run(db, "UPDATE prc_commission_rule SET valid_to_date = '2025-12-31' WHERE id = ?", a), /prc_append_only:|CHECK constraint failed/);
  run(db, "UPDATE prc_commission_rule SET valid_to_date = '2026-05-31', updated_at = ?, updated_by = 'kt' WHERE id = ?", AT, a);
  assert.throws(() => run(db, "UPDATE prc_commission_rule SET valid_to_date = NULL WHERE id = ?", a), /prc_append_only:/, "không mở lại");
  muc(db, { from: "2026-06-01" });
  muc(db, { party: dl, scope: "SERVICE", code: "HONTAM" });
  assert.throws(() => muc(db, { party: txd }), /prc_target_not_beneficiary:/);
  assert.throws(() => muc(db, { role: "DRIVER_EXTERNAL" }), /prc_role_not_beneficiary:|FOREIGN KEY constraint failed/);
  assert.throws(() => muc(db, { scope: "SERVICE", code: null }), /CHECK constraint failed/);
  assert.throws(() => muc(db, { scope: "GROUP", group: "DTH", bp: 10001 }), /CHECK constraint failed/);
  run(db, "UPDATE prc_beneficiary_role SET active = 0, updated_at = ? WHERE role_type_code = 'COLLABORATOR'", AT);
  assert.throws(() => muc(db, { role: "COLLABORATOR" }), /prc_role_not_beneficiary:/);
});

test("prc_supply_term: người bán ≠ công ty phải là nhà cung cấp; a% ⇔ người bán ≠ công ty; ALL chỉ công ty; X3 chặn a% cho TXE", () => {
  const { db, ct, dl, ncc } = moi();
  dieuKhoan(db, { scope: "SERVICE", code: "IRESORT", seller: ncc, supplier: ncc, bp: 8000 });
  assert.throws(() => dieuKhoan(db, { scope: "SERVICE", code: "HONTAM", seller: dl, supplier: dl, bp: 8000 }), /prc_seller_not_supplier:/);
  assert.throws(() => dieuKhoan(db, { scope: "SERVICE", code: "HONTAM", seller: ct, supplier: ct, bp: 8000 }), /prc_supplier_mismatch:|CHECK constraint failed/);
  assert.throws(() => dieuKhoan(db, { scope: "SERVICE", code: "HONTAM2", seller: ncc }), /prc_supplier_mismatch:/, "người bán là nhà cung cấp mà không a%");
  // Đóng dòng ALL gieo sẵn trước, để ca dưới chỉ chạm đúng trigger "ALL chỉ cho công ty" (không chạm trigger chồng khoảng).
  run(db, "UPDATE prc_supply_term SET valid_to_date = '2026-12-31', updated_at = ? WHERE scope = 'ALL'", AT);
  assert.throws(() => dieuKhoan(db, { scope: "ALL", seller: ncc, supplier: ncc, bp: 8000, from: "2027-01-01" }), /prc_all_owner_only:/);
  dieuKhoan(db, { scope: "ALL", seller: ct, from: "2027-01-01" });
  assert.throws(() => dieuKhoan(db, { scope: "GROUP", group: "TXE", seller: ncc, supplier: ncc, bp: 8000 }), /prc_transfer_no_supplier:/);
  assert.throws(() => dieuKhoan(db, { scope: "SERVICE", code: "SB16D", seller: ncc, supplier: ncc, bp: 8000 }), /prc_transfer_no_supplier:/);
  assert.throws(() => dieuKhoan(db, { scope: "SERVICE", code: "IRESORT", seller: ncc, supplier: ncc, bp: 7000 }), /prc_overlap:/);
});

/** Đơn nháp một dịch vụ, rồi xác nhận / giao bằng SQL thẳng. */
function don(db: DatabaseSync, trangThai: "draft" | "confirmed"): { o: string; s: string } {
  const o = id("o"), s = id("s");
  run(db, `INSERT INTO orders (id, staff_id, status, customer_name, customer_phone, subtotal, discount, total, created_at, updated_at) VALUES (?, 's-x', ?, 'Khách', '0900000000', 1000000, 0, 1000000, ?, ?)`, o, trangThai, AT, AT);
  run(db, "INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit) VALUES (?, ?, 0, 'HONTAM', 'Vé Hòn Tằm', 'perPax')", s, o);
  return { o, s };
}
function chup(db: DatabaseSync, o: string, s: string, x: Partial<{ sup: string | null; src: string; reason: string | null; rule: string | null; bp: number | null; date: string }> = {}): string {
  const r = id("t");
  const ct = one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company LIMIT 1").party_id;
  const term = one<{ id: string }>(db, "SELECT id FROM prc_supply_term WHERE scope = 'ALL'").id;
  run(db, `INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, commission_kind, commission_rate_bp, commission_per_pax,
      commission_rule_id, supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id, source, reason, supersedes_id, captured_date, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, NULL, 'NONE', NULL, NULL, NULL, NULL, ?, 'SET', ?, NULL, NULL, ?, ?, ?, ?, ?, ?, 'sa', ?, 'sa')`,
    r, o, s, x.rule ?? null, ct, term, x.src ?? "AUTO", x.reason ?? null, x.sup ?? null, x.date ?? "2026-10-08", AT, AT);
  return r;
}

test("ord_service_terms: chỉ đơn đã xác nhận; chỉ-thêm; đúng dịch vụ của đơn; một bản hiện hành; chặn khi đã giao; MANUAL cần lý do ≥ 10 ký tự", () => {
  const { db } = moi();
  const nhap = don(db, "draft");
  assert.throws(() => chup(db, nhap.o, nhap.s), /terms_order_not_confirmed:/);
  const { o, s } = don(db, "confirmed");
  const khac = don(db, "confirmed");
  assert.throws(() => chup(db, o, khac.s), /terms_service_mismatch:/);
  const a = chup(db, o, s);
  assert.throws(() => run(db, "UPDATE ord_service_terms SET source = 'MANUAL' WHERE id = ?", a), /terms_append_only:/);
  assert.throws(() => run(db, "DELETE FROM ord_service_terms WHERE id = ?", a), /terms_append_only:/);
  assert.throws(() => chup(db, o, s), /terms_one_current:/, "bản thứ hai không trỏ supersedes");
  assert.throws(() => chup(db, o, s, { src: "MANUAL", sup: a, reason: "ngắn" }), /CHECK constraint failed/);
  const b = chup(db, o, s, { src: "MANUAL", sup: a, reason: "thoả thuận riêng với đại lý" });
  assert.throws(() => chup(db, o, s, { src: "MANUAL", sup: a, reason: "thoả thuận riêng lần hai" }), /UNIQUE constraint failed: ord_service_terms\.supersedes_id/);
  assert.throws(() => chup(db, khac.o, khac.s, { src: "MANUAL", sup: b, reason: "trỏ sang dịch vụ khác" }), /terms_supersede_mismatch:/);
  run(db, "UPDATE orders SET delivered_at = ?, delivered_by = 'sa' WHERE id = ?", AT, o);
  assert.throws(() => chup(db, o, s, { src: "MANUAL", sup: b, reason: "sau khi đã giao đơn" }), /terms_order_delivered:/);
  assert.equal((db.prepare("SELECT order_id FROM v_ord_terms_missing").all() as unknown[]).length, 0);
});

test("ord_service_terms AUTO: dòng mức phải còn hiệu lực ở ngày chụp và khớp số (bảng mức vừa đổi ⇒ cả lô rơi)", () => {
  const { db, dl } = moi();
  const m = muc(db, { from: "2026-01-01" });
  const { o, s } = don(db, "confirmed");
  const chen = (rate: number, ngay: string) => run(db, `INSERT INTO ord_service_terms (id, order_id, order_service_id, beneficiary_party_id, commission_status, commission_kind, commission_rate_bp,
      commission_rule_id, supply_status, seller_party_id, supply_term_id, source, captured_date, created_at, updated_at)
    SELECT ?, ?, ?, ?, 'SET', 'RATE', ?, ?, 'SET', party_id, (SELECT id FROM prc_supply_term WHERE scope = 'ALL'), 'AUTO', ?, ?, ? FROM v_pty_owner_company`,
    id("t"), o, s, dl, rate, m, ngay, AT, AT);
  assert.throws(() => chen(1500, "2026-10-08"), /terms_rule_stale:/, "số chép lệch dòng mức");
  run(db, "UPDATE prc_commission_rule SET valid_to_date = '2026-10-07', updated_at = ? WHERE id = ?", AT, m);
  assert.throws(() => chen(1000, "2026-10-08"), /terms_rule_stale:/, "dòng mức đã đóng trước ngày chụp");
  chen(1000, "2026-10-07");
});

test("ky_period_close: tháng nào cũng được khi rỗng; sau đó phải liền kề; không trùng, không sửa, không xoá", () => {
  const { db } = moi();
  const khoa = (p: string) => run(db, "INSERT INTO ky_period_close (period, closed_at, closed_by, note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'kt', NULL, ?, 'kt', ?, 'kt')", p, AT, AT, AT);
  khoa("2026-08");
  assert.throws(() => khoa("2026-10"), /period_not_adjacent:/);
  assert.throws(() => khoa("2026-08"), /UNIQUE constraint failed|PRIMARY KEY|period_not_adjacent:/);
  khoa("2026-09");
  assert.throws(() => run(db, "UPDATE ky_period_close SET note = 'x' WHERE period = '2026-09'"), /ky_append_only:/);
  assert.throws(() => run(db, "DELETE FROM ky_period_close WHERE period = '2026-09'"), /ky_append_only:/);
  // Tháng 12 → tháng 1 năm sau; CHECK dạng tháng thử trên bảng RỖNG (bảng có dòng thì trigger liền kề bắn trước CHECK).
  const db2 = moi().db;
  assert.throws(() => run(db2, "INSERT INTO ky_period_close (period, closed_at, closed_by, created_at, updated_at) VALUES ('2026-13', ?, 'kt', ?, ?)", AT, AT, AT), /CHECK constraint failed/);
  run(db2, "INSERT INTO ky_period_close (period, closed_at, closed_by, created_at, updated_at) VALUES ('2025-12', ?, 'kt', ?, ?)", AT, AT, AT);
  run(db2, "INSERT INTO ky_period_close (period, closed_at, closed_by, created_at, updated_at) VALUES ('2026-01', ?, 'kt', ?, ?)", AT, AT, AT);
});

test("khoá tháng ở CSDL: bốn bảng tiền từ chối dòng có ngày thuộc tháng đã khoá", () => {
  const { db } = moi();
  run(db, "INSERT INTO ky_period_close (period, closed_at, closed_by, created_at, updated_at) VALUES ('2026-09', ?, 'kt', ?, ?)", AT, AT, AT);
  const trig = (db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type = 'trigger' AND name LIKE '%period_closed'").all() as { name: string; tbl_name: string }[]).map((t) => t.tbl_name).sort();
  assert.deepEqual(trig, ["bil_outside_refund", "bil_payment_receipt", "bil_posting", "vc_trip_cost_line"]);
  // Một ca chèn thật mỗi bảng: dựng dòng tối thiểu bằng cột NOT NULL của bảng (đọc PRAGMA table_info), occurred_date = '2026-09-30' ⇒ period_closed; '2026-10-01' ⇒ qua trigger này.
  for (const t of trig) {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all() as { name: string; notnull: number; dflt_value: string | null; pk: number }[];
    const can = cols.filter((c) => (c.notnull === 1 || c.pk === 1) && c.dflt_value === null).map((c) => c.name);
    const sql = `INSERT INTO ${t} (${can.join(", ")}) VALUES (${can.map((c) => (c === "occurred_date" ? "'2026-09-30'" : "'x'")).join(", ")})`;
    assert.throws(() => db.exec("PRAGMA foreign_keys = OFF; " + sql), /period_closed:/, `${t}: phải chặn tháng đã khoá`);
  }
});
```

Ghi chú cho người thi công: (1) cột `pty_party`, `pty_party_role`, `orders`, `order_service` ở bài trên là cột NOT NULL tối thiểu theo `0011`, `0008`, `0044`; nếu chèn lỗi vì thiếu cột thì đọc `PRAGMA table_info` của bảng đó và bổ sung đúng cột, KHÔNG nới trigger. Câu `UPDATE orders SET delivered_at …` của bài có thể bị trigger khoá "Đã giao" của `0044` từ chối; khi đó đặt đúng các cột mà trigger đó đòi (đọc `0044`), mục tiêu chỉ là có một đơn đã giao. Mỗi ca `throws` chỉ được khớp ĐÚNG mã của trigger đang thử (không dùng `|CHECK` để nới), trừ ba ca đã ghi rõ ở trên. (2) Ca cuối dựng dòng tối thiểu với giá trị `'x'`; CHECK khác của bảng có thể bắn trước — nếu vậy dùng giá trị hợp lệ cho cột đó (đọc migration gốc `0045`, `0079`, `0073`), mục tiêu là thấy đúng mã `period_closed:`. Mã danh mục `HONTAM`, `IRESORT` ở bài chỉ là chữ (bảng không khoá ngoại sang `catalog_item`).

- [ ] **Step 2: Chạy đỏ.** `node --test src/migrations-so-dai-ly.test.ts` — kỳ vọng FAIL "thiếu migrations/*_so_dai_ly_dot_1.sql".

- [ ] **Step 3: Viết migration** `migrations/0090_so_dai_ly_dot_1.sql`:

```sql
-- Migration 0090 — SỔ ĐẠI LÝ ĐỢT 1 (ADR-0077 toàn bộ, ADR-0078 B1, ADR-0080 D1; đặc tả docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md §3).
-- Chỉ THÊM. Thân trigger chỉ đọc bảng cùng module hoặc view công bố của module được phép phụ thuộc (ADR-0024 điều 5). Câu báo có tiền tố mã.

-- ===== parties: vai Nhà cung cấp (ADR-0078 điều 1) + view vai đang mở (chỉ khoá, không tên, không SĐT) ==========================================
INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES ('SUPPLIER', 'Nhà cung cấp', 32, 'OTHER');
CREATE VIEW v_pty_open_role AS
  SELECT DISTINCT r.party_id, r.role_type_code, t.role_group
  FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code
  WHERE r.valid_to_date IS NULL;

-- ===== catalog: nhóm hiện hành của từng mã dịch vụ (dòng seq lớn nhất; group_code NULL = Chưa phân loại) =========================================
CREATE VIEW v_ctl_service_group AS
  SELECT g.service_code AS catalog_code, g.group_code
  FROM ctl_service_group g
  WHERE g.seq = (SELECT max(g2.seq) FROM ctl_service_group g2 WHERE g2.service_code = g.service_code);

-- ===== pricing ===================================================================================================================================
-- Danh sách vai được hưởng hoa hồng (C3 = A). Tắt một vai = active 0 (dòng mức cũ vẫn giữ; R-PRC-2 báo).
CREATE TABLE prc_beneficiary_role (
  role_type_code TEXT PRIMARY KEY REFERENCES pty_role_type(code),
  active         INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT
);
INSERT INTO prc_beneficiary_role (role_type_code, active, created_at, created_by, updated_at, updated_by)
  SELECT code, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong'
  FROM pty_role_type WHERE code IN ('TRAVEL_AGENCY', 'GUIDE_FREELANCE', 'HOTEL_RECEPTION', 'TAXI_DRIVER', 'COLLABORATOR');
CREATE TRIGGER prc_beneficiary_role_no_delete BEFORE DELETE ON prc_beneficiary_role
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá vai được hưởng — tắt bằng active = 0'); END;
CREATE VIEW v_prc_beneficiary_role AS SELECT role_type_code FROM prc_beneficiary_role WHERE active = 1;

-- Bảng mức hoa hồng (ADR-0077 điều 4). Đúng một trong (đối tác, vai); phạm vi khớp mã; đúng một trong (tỷ lệ, đ/khách).
CREATE TABLE prc_commission_rule (
  id               TEXT PRIMARY KEY,
  target_party_id  TEXT REFERENCES pty_party(id),
  target_role_code TEXT REFERENCES prc_beneficiary_role(role_type_code),
  scope            TEXT NOT NULL CHECK (scope IN ('SERVICE', 'GROUP', 'ALL')),
  catalog_code     TEXT,
  group_code       TEXT REFERENCES ctl_group(code),
  kind             TEXT NOT NULL CHECK (kind IN ('RATE', 'PER_PAX')),
  rate_bp          INTEGER CHECK (rate_bp BETWEEN 0 AND 10000),
  per_pax_amount   INTEGER CHECK (per_pax_amount >= 0),
  valid_from_date  TEXT NOT NULL,
  valid_to_date    TEXT CHECK (valid_to_date IS NULL OR valid_to_date >= valid_from_date),
  note             TEXT CHECK (note IS NULL OR length(note) <= 200),
  created_at       TEXT NOT NULL,
  created_by       TEXT,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT,
  CHECK ((target_party_id IS NULL) <> (target_role_code IS NULL)),
  CHECK ((scope = 'SERVICE' AND catalog_code IS NOT NULL AND group_code IS NULL) OR (scope = 'GROUP' AND group_code IS NOT NULL AND catalog_code IS NULL)
         OR (scope = 'ALL' AND catalog_code IS NULL AND group_code IS NULL)),
  CHECK ((kind = 'RATE' AND rate_bp IS NOT NULL AND per_pax_amount IS NULL) OR (kind = 'PER_PAX' AND per_pax_amount IS NOT NULL AND rate_bp IS NULL))
);
CREATE INDEX prc_commission_rule_party_ix ON prc_commission_rule(target_party_id);
CREATE INDEX prc_commission_rule_role_ix ON prc_commission_rule(target_role_code);
CREATE TRIGGER prc_commission_rule_no_delete BEFORE DELETE ON prc_commission_rule
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá dòng mức — đóng hiệu lực'); END;
CREATE TRIGGER prc_commission_rule_close_only BEFORE UPDATE ON prc_commission_rule
WHEN OLD.valid_to_date IS NOT NULL OR NEW.valid_to_date IS NULL OR NEW.id IS NOT OLD.id OR NEW.target_party_id IS NOT OLD.target_party_id
  OR NEW.target_role_code IS NOT OLD.target_role_code OR NEW.scope IS NOT OLD.scope OR NEW.catalog_code IS NOT OLD.catalog_code OR NEW.group_code IS NOT OLD.group_code
  OR NEW.kind IS NOT OLD.kind OR NEW.rate_bp IS NOT OLD.rate_bp OR NEW.per_pax_amount IS NOT OLD.per_pax_amount OR NEW.valid_from_date IS NOT OLD.valid_from_date
  OR NEW.note IS NOT OLD.note OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'prc_append_only: dòng mức chỉ được đóng một lần — đổi mức thì đóng dòng cũ, thêm dòng mới'); END;
CREATE TRIGGER prc_commission_rule_overlap BEFORE INSERT ON prc_commission_rule
WHEN EXISTS (SELECT 1 FROM prc_commission_rule o
  WHERE IFNULL(o.target_party_id, '') = IFNULL(NEW.target_party_id, '') AND IFNULL(o.target_role_code, '') = IFNULL(NEW.target_role_code, '')
    AND o.scope = NEW.scope AND IFNULL(o.catalog_code, '') = IFNULL(NEW.catalog_code, '') AND IFNULL(o.group_code, '') = IFNULL(NEW.group_code, '')
    AND NOT (COALESCE(o.valid_to_date, '9999-12-31') < NEW.valid_from_date OR o.valid_from_date > COALESCE(NEW.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'prc_overlap: đã có mức cùng đối tượng, cùng phạm vi trong khoảng ngày này'); END;
CREATE TRIGGER prc_commission_rule_target_party BEFORE INSERT ON prc_commission_rule
WHEN NEW.target_party_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_pty_open_role r JOIN prc_beneficiary_role b ON b.role_type_code = r.role_type_code AND b.active = 1
  WHERE r.party_id = NEW.target_party_id)
BEGIN SELECT RAISE(ABORT, 'prc_target_not_beneficiary: hồ sơ này không mang vai được hưởng hoa hồng'); END;
CREATE TRIGGER prc_commission_rule_target_role BEFORE INSERT ON prc_commission_rule
WHEN NEW.target_role_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM prc_beneficiary_role b WHERE b.role_type_code = NEW.target_role_code AND b.active = 1)
BEGIN SELECT RAISE(ABORT, 'prc_role_not_beneficiary: vai này không nằm trong danh sách được hưởng'); END;
CREATE VIEW v_prc_commission_rule AS
  SELECT id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date FROM prc_commission_rule;

-- Điều khoản cung ứng (ADR-0078 điều 2). Có nhà cung cấp + a% ⇔ người bán ≠ công ty chủ; khi có thì nhà cung cấp = người bán.
CREATE TABLE prc_supply_term (
  id                TEXT PRIMARY KEY,
  scope             TEXT NOT NULL CHECK (scope IN ('SERVICE', 'GROUP', 'ALL')),
  catalog_code      TEXT,
  group_code        TEXT REFERENCES ctl_group(code),
  seller_party_id   TEXT NOT NULL REFERENCES pty_party(id),
  supplier_party_id TEXT REFERENCES pty_party(id),
  cost_rate_bp      INTEGER CHECK (cost_rate_bp BETWEEN 0 AND 10000),
  valid_from_date   TEXT NOT NULL,
  valid_to_date     TEXT CHECK (valid_to_date IS NULL OR valid_to_date >= valid_from_date),
  note              TEXT CHECK (note IS NULL OR length(note) <= 200),
  created_at        TEXT NOT NULL,
  created_by        TEXT,
  updated_at        TEXT NOT NULL,
  updated_by        TEXT,
  CHECK ((scope = 'SERVICE' AND catalog_code IS NOT NULL AND group_code IS NULL) OR (scope = 'GROUP' AND group_code IS NOT NULL AND catalog_code IS NULL)
         OR (scope = 'ALL' AND catalog_code IS NULL AND group_code IS NULL)),
  CHECK ((supplier_party_id IS NULL) = (cost_rate_bp IS NULL)),
  CHECK (supplier_party_id IS NULL OR supplier_party_id = seller_party_id)
);
CREATE TRIGGER prc_supply_term_no_delete BEFORE DELETE ON prc_supply_term
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá điều khoản — đóng hiệu lực'); END;
CREATE TRIGGER prc_supply_term_close_only BEFORE UPDATE ON prc_supply_term
WHEN OLD.valid_to_date IS NOT NULL OR NEW.valid_to_date IS NULL OR NEW.id IS NOT OLD.id OR NEW.scope IS NOT OLD.scope OR NEW.catalog_code IS NOT OLD.catalog_code
  OR NEW.group_code IS NOT OLD.group_code OR NEW.seller_party_id IS NOT OLD.seller_party_id OR NEW.supplier_party_id IS NOT OLD.supplier_party_id
  OR NEW.cost_rate_bp IS NOT OLD.cost_rate_bp OR NEW.valid_from_date IS NOT OLD.valid_from_date OR NEW.note IS NOT OLD.note
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'prc_append_only: điều khoản chỉ được đóng một lần — đổi thì đóng dòng cũ, thêm dòng mới'); END;
CREATE TRIGGER prc_supply_term_overlap BEFORE INSERT ON prc_supply_term
WHEN EXISTS (SELECT 1 FROM prc_supply_term o WHERE o.scope = NEW.scope AND IFNULL(o.catalog_code, '') = IFNULL(NEW.catalog_code, '') AND IFNULL(o.group_code, '') = IFNULL(NEW.group_code, '')
  AND NOT (COALESCE(o.valid_to_date, '9999-12-31') < NEW.valid_from_date OR o.valid_from_date > COALESCE(NEW.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'prc_overlap: đã có điều khoản cùng phạm vi trong khoảng ngày này'); END;
-- Người bán ≠ công ty chủ ⇒ phải có nhà cung cấp (a%); người bán = công ty chủ ⇒ không có.
CREATE TRIGGER prc_supply_term_supplier_iff BEFORE INSERT ON prc_supply_term
WHEN (NEW.supplier_party_id IS NULL) <> EXISTS (SELECT 1 FROM v_pty_owner_company c WHERE c.party_id = NEW.seller_party_id)
BEGIN SELECT RAISE(ABORT, 'prc_supplier_mismatch: người bán là công ty thì không ghi tỷ lệ mua lại; người bán là nhà cung cấp thì phải ghi'); END;
CREATE TRIGGER prc_supply_term_seller_role BEFORE INSERT ON prc_supply_term
WHEN NOT EXISTS (SELECT 1 FROM v_pty_owner_company c WHERE c.party_id = NEW.seller_party_id)
  AND NOT EXISTS (SELECT 1 FROM v_pty_open_role r WHERE r.party_id = NEW.seller_party_id AND r.role_type_code = 'SUPPLIER')
BEGIN SELECT RAISE(ABORT, 'prc_seller_not_supplier: người bán phải là công ty chủ hoặc hồ sơ đang mang vai Nhà cung cấp'); END;
-- Ruling đặc tả §3: dòng "mọi dịch vụ" chỉ cho công ty chủ (dòng ALL mang a% sẽ trùm cả nhóm Thuê xe, trái X3).
CREATE TRIGGER prc_supply_term_all_owner BEFORE INSERT ON prc_supply_term
WHEN NEW.scope = 'ALL' AND NOT EXISTS (SELECT 1 FROM v_pty_owner_company c WHERE c.party_id = NEW.seller_party_id)
BEGIN SELECT RAISE(ABORT, 'prc_all_owner_only: dòng mọi dịch vụ chỉ dành cho công ty chủ'); END;
-- X3 (điều A2, chủ duyệt 2026-10-08): không ghi nhà cung cấp mua lại cho nhóm Thuê xe (TXE) hay mã đang thuộc nhóm đó.
CREATE TRIGGER prc_supply_term_x3 BEFORE INSERT ON prc_supply_term
WHEN NEW.supplier_party_id IS NOT NULL AND (NEW.group_code = 'TXE'
  OR EXISTS (SELECT 1 FROM v_ctl_service_group g WHERE g.catalog_code = NEW.catalog_code AND g.group_code = 'TXE'))
BEGIN SELECT RAISE(ABORT, 'prc_transfer_no_supplier: dịch vụ nhóm Thuê xe không ghi nhà cung cấp mua lại (luật X3)'); END;
CREATE VIEW v_prc_supply_term AS
  SELECT id, scope, catalog_code, group_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, valid_to_date FROM prc_supply_term;
-- Gieo (ADR-0078 điều 3): công ty chủ bán mọi dịch vụ, từ mốc cố định sớm hơn mọi đơn.
INSERT INTO prc_supply_term (id, scope, catalog_code, group_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, valid_to_date, note, created_at, created_by, updated_at, updated_by)
  SELECT 'prc-st-goc-all', 'ALL', NULL, NULL, party_id, NULL, NULL, '2025-01-01', NULL, 'Gieo sẵn: công ty chủ bán mọi dịch vụ (ADR-0078 điều 3)',
         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong'
  FROM v_pty_owner_company LIMIT 1;

-- ===== orders: bản chụp thương mại của từng dòng dịch vụ (ADR-0077 điều 8, ADR-0078 điều 5) ======================================================
CREATE TABLE ord_service_terms (
  id                   TEXT PRIMARY KEY,
  order_id             TEXT NOT NULL REFERENCES orders(id),
  order_service_id     TEXT NOT NULL REFERENCES order_service(id),
  beneficiary_party_id TEXT REFERENCES pty_party(id),
  commission_status    TEXT NOT NULL CHECK (commission_status IN ('NONE', 'SET', 'MISSING')),
  missing_reason       TEXT CHECK (missing_reason IN ('NO_RULE', 'RULE_CONFLICT', 'MANUAL_LINE', 'BOOKER_NOT_BENEFICIARY', 'NOT_CAPTURED')),
  commission_kind      TEXT CHECK (commission_kind IN ('RATE', 'PER_PAX')),
  commission_rate_bp   INTEGER CHECK (commission_rate_bp BETWEEN 0 AND 10000),
  commission_per_pax   INTEGER CHECK (commission_per_pax >= 0),
  commission_rule_id   TEXT REFERENCES prc_commission_rule(id),
  supply_status        TEXT NOT NULL CHECK (supply_status IN ('SET', 'MISSING')),
  seller_party_id      TEXT REFERENCES pty_party(id),
  supplier_party_id    TEXT REFERENCES pty_party(id),
  cost_rate_bp         INTEGER CHECK (cost_rate_bp BETWEEN 0 AND 10000),
  supply_term_id       TEXT REFERENCES prc_supply_term(id),
  source               TEXT NOT NULL CHECK (source IN ('AUTO', 'MANUAL')),
  reason               TEXT,
  supersedes_id        TEXT UNIQUE REFERENCES ord_service_terms(id),
  captured_date        TEXT NOT NULL,
  created_at           TEXT NOT NULL,
  created_by           TEXT,
  updated_at           TEXT NOT NULL,
  updated_by           TEXT,
  CHECK ((commission_status = 'MISSING') = (missing_reason IS NOT NULL)),
  CHECK (commission_status = 'NONE' OR beneficiary_party_id IS NOT NULL),
  CHECK (commission_status <> 'NONE' OR beneficiary_party_id IS NULL),
  CHECK ((commission_status = 'SET' AND ((commission_kind = 'RATE' AND commission_rate_bp IS NOT NULL AND commission_per_pax IS NULL)
                                         OR (commission_kind = 'PER_PAX' AND commission_per_pax IS NOT NULL AND commission_rate_bp IS NULL)))
         OR (commission_status <> 'SET' AND commission_kind IS NULL AND commission_rate_bp IS NULL AND commission_per_pax IS NULL AND commission_rule_id IS NULL)),
  CHECK ((supply_status = 'SET') = (seller_party_id IS NOT NULL)),
  CHECK ((supplier_party_id IS NULL) = (cost_rate_bp IS NULL)),
  CHECK (supplier_party_id IS NULL OR supplier_party_id = seller_party_id),
  CHECK ((source = 'AUTO' AND reason IS NULL) OR (source = 'MANUAL' AND reason IS NOT NULL AND length(trim(reason)) >= 10 AND length(reason) <= 500 AND supersedes_id IS NOT NULL))
);
CREATE INDEX ord_service_terms_order_ix ON ord_service_terms(order_id);
CREATE INDEX ord_service_terms_service_ix ON ord_service_terms(order_service_id);
CREATE TRIGGER ord_service_terms_no_update BEFORE UPDATE ON ord_service_terms
BEGIN SELECT RAISE(ABORT, 'terms_append_only: bản chụp không sửa được — ghi bản mới trỏ bản cũ'); END;
CREATE TRIGGER ord_service_terms_no_delete BEFORE DELETE ON ord_service_terms
BEGIN SELECT RAISE(ABORT, 'terms_append_only: bản chụp không xoá được'); END;
CREATE TRIGGER ord_service_terms_confirmed BEFORE INSERT ON ord_service_terms
WHEN NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = NEW.order_id AND o.status = 'confirmed')
BEGIN SELECT RAISE(ABORT, 'terms_order_not_confirmed: chỉ chụp cho đơn đã xác nhận'); END;
CREATE TRIGGER ord_service_terms_delivered BEFORE INSERT ON ord_service_terms
WHEN EXISTS (SELECT 1 FROM orders o WHERE o.id = NEW.order_id AND o.delivered_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'terms_order_delivered: đơn đã Đã giao — không chụp thêm'); END;
CREATE TRIGGER ord_service_terms_service BEFORE INSERT ON ord_service_terms
WHEN NOT EXISTS (SELECT 1 FROM order_service s WHERE s.id = NEW.order_service_id AND s.order_id = NEW.order_id)
BEGIN SELECT RAISE(ABORT, 'terms_service_mismatch: dòng dịch vụ không thuộc đơn này'); END;
CREATE TRIGGER ord_service_terms_supersede BEFORE INSERT ON ord_service_terms
WHEN NEW.supersedes_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ord_service_terms p WHERE p.id = NEW.supersedes_id AND p.order_service_id = NEW.order_service_id)
BEGIN SELECT RAISE(ABORT, 'terms_supersede_mismatch: bản thay thế phải cùng dòng dịch vụ'); END;
CREATE TRIGGER ord_service_terms_one_current BEFORE INSERT ON ord_service_terms
WHEN NEW.supersedes_id IS NULL AND EXISTS (SELECT 1 FROM ord_service_terms p WHERE p.order_service_id = NEW.order_service_id)
BEGIN SELECT RAISE(ABORT, 'terms_one_current: dòng dịch vụ đã có bản chụp — bản mới phải trỏ bản hiện hành'); END;
-- Lớp CSDL cho "bảng mức vừa đổi giữa lúc đọc và lúc ghi": bản AUTO phải trỏ dòng còn hiệu lực ở ngày chụp và chép đúng số của dòng đó.
CREATE TRIGGER ord_service_terms_rule_valid BEFORE INSERT ON ord_service_terms
WHEN NEW.source = 'AUTO' AND NEW.commission_rule_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_prc_commission_rule r
  WHERE r.id = NEW.commission_rule_id AND r.valid_from_date <= NEW.captured_date AND (r.valid_to_date IS NULL OR r.valid_to_date >= NEW.captured_date)
    AND r.kind = NEW.commission_kind AND r.rate_bp IS NEW.commission_rate_bp AND r.per_pax_amount IS NEW.commission_per_pax)
BEGIN SELECT RAISE(ABORT, 'terms_rule_stale: dòng mức không còn hiệu lực ở ngày chụp'); END;
CREATE TRIGGER ord_service_terms_term_valid BEFORE INSERT ON ord_service_terms
WHEN NEW.source = 'AUTO' AND NEW.supply_term_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_prc_supply_term t
  WHERE t.id = NEW.supply_term_id AND t.valid_from_date <= NEW.captured_date AND (t.valid_to_date IS NULL OR t.valid_to_date >= NEW.captured_date)
    AND t.seller_party_id = NEW.seller_party_id AND t.supplier_party_id IS NEW.supplier_party_id AND t.cost_rate_bp IS NEW.cost_rate_bp)
BEGIN SELECT RAISE(ABORT, 'terms_term_stale: điều khoản người bán không còn hiệu lực ở ngày chụp'); END;
CREATE VIEW v_ord_terms_missing AS
  SELECT DISTINCT t.order_id FROM ord_service_terms t
  WHERE NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)
    AND (t.commission_status = 'MISSING' OR t.supply_status = 'MISSING');
-- Mốc của kiểm định kỳ R-ORD-T1 (đặc tả §9 sau kiểm độc lập N4): lúc áp migration. Khuôn bil_audit_cutoff (0080). Chỉ-thêm.
CREATE TABLE ord_audit_cutoff (
  code       TEXT PRIMARY KEY,
  cutoff_at  TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE TRIGGER ord_audit_cutoff_no_update BEFORE UPDATE ON ord_audit_cutoff
BEGIN SELECT RAISE(ABORT, 'terms_append_only: mốc kiểm không sửa được'); END;
CREATE TRIGGER ord_audit_cutoff_no_delete BEFORE DELETE ON ord_audit_cutoff
BEGIN SELECT RAISE(ABORT, 'terms_append_only: mốc kiểm không xoá được'); END;
INSERT INTO ord_audit_cutoff (code, cutoff_at, created_at, created_by, updated_at, updated_by)
VALUES ('R-ORD-T1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong');

-- ===== ky-so: khoá tháng (ADR-0080 D1). Liền kề; không mở lại; trigger chỉ đọc chính bảng này ===================================================
CREATE TABLE ky_period_close (
  period     TEXT PRIMARY KEY CHECK (period GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]' AND substr(period, 6, 2) BETWEEN '01' AND '12'),
  closed_at  TEXT NOT NULL,
  closed_by  TEXT NOT NULL,
  note       TEXT CHECK (note IS NULL OR length(note) <= 200),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE TRIGGER ky_period_close_adjacent BEFORE INSERT ON ky_period_close
WHEN EXISTS (SELECT 1 FROM ky_period_close)
  AND NEW.period IS NOT (SELECT strftime('%Y-%m', max(period) || '-01', '+1 month') FROM ky_period_close)
BEGIN SELECT RAISE(ABORT, 'period_not_adjacent: chỉ khoá được tháng ngay sau tháng đã khoá gần nhất'); END;
CREATE TRIGGER ky_period_close_no_update BEFORE UPDATE ON ky_period_close
BEGIN SELECT RAISE(ABORT, 'ky_append_only: tháng đã khoá không sửa được'); END;
CREATE TRIGGER ky_period_close_no_delete BEFORE DELETE ON ky_period_close
BEGIN SELECT RAISE(ABORT, 'ky_append_only: tháng đã khoá không mở lại được'); END;
CREATE VIEW v_ky_closed_period AS SELECT period FROM ky_period_close;

-- ===== Khoá tháng trên bốn bảng tiền có ngày phát sinh (ADR-0080 điều 3). billing + van-chuyen đọc view công bố của ky-so =========================
CREATE TRIGGER bil_payment_receipt_period_closed BEFORE INSERT ON bil_payment_receipt
WHEN substr(NEW.occurred_date, 1, 7) IN (SELECT period FROM v_ky_closed_period)
BEGIN SELECT RAISE(ABORT, 'period_closed: tháng của ngày phát sinh đã khoá sổ — ghi vào tháng đang mở'); END;
CREATE TRIGGER bil_posting_period_closed BEFORE INSERT ON bil_posting
WHEN substr(NEW.occurred_date, 1, 7) IN (SELECT period FROM v_ky_closed_period)
BEGIN SELECT RAISE(ABORT, 'period_closed: tháng của ngày phát sinh đã khoá sổ — ghi vào tháng đang mở'); END;
CREATE TRIGGER bil_outside_refund_period_closed BEFORE INSERT ON bil_outside_refund
WHEN substr(NEW.occurred_date, 1, 7) IN (SELECT period FROM v_ky_closed_period)
BEGIN SELECT RAISE(ABORT, 'period_closed: tháng của ngày phát sinh đã khoá sổ — ghi vào tháng đang mở'); END;
CREATE TRIGGER vc_trip_cost_line_period_closed BEFORE INSERT ON vc_trip_cost_line
WHEN substr(NEW.occurred_date, 1, 7) IN (SELECT period FROM v_ky_closed_period)
BEGIN SELECT RAISE(ABORT, 'period_closed: tháng của ngày phát sinh đã khoá sổ — ghi vào tháng đang mở'); END;
```

Ghi chú: (1) `prc_commission_rule.target_role_code` khoá ngoại sang `prc_beneficiary_role` (không sang `pty_role_type`) — vai bị tắt vẫn giữ khoá ngoại hợp lệ cho dòng cũ. (2) Bài của câu `UPDATE … valid_to_date = '2025-12-31'` có thể đỏ bằng CHECK (ngày đóng < ngày bắt đầu) trước trigger — cả hai đều đúng. (3) Ba câu `INSERT … SELECT` gieo đều một vế (bẫy D1 "too many terms").

- [ ] **Step 4: Chạy xanh** `node --test src/migrations-so-dai-ly.test.ts` — kỳ vọng PASS mọi ca. Sửa bài (không sửa luật) nếu chỉ thiếu cột NOT NULL khi gieo.

- [ ] **Step 5: Nới hàng rào kiến trúc** ở `src/architecture.test.ts` (đúng C12, mỗi dòng kèm chú thích nới đã duyệt):

```ts
  // ky-so (ADR-0080 D1): khoá tháng — chỉ ghi nhật ký. NỚI hàng rào đã duyệt (Điều 9.4) — chủ duyệt C12 2026-10-01, xem docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/de-xuat-luat.md.
  "ky-so": ["audit"],
```

`billing` thêm `"ky-so"` (đọc tháng đã khoá + câu khoá chưa chạy), `"van-chuyen"` thêm `"ky-so"` (tháng đã khoá cho ngày ghi đảo); `TABLE_PREFIX` thêm `ky_: "ky-so"`; `VIEW_PREFIX` thêm `ctl: "catalog", ky: "ky-so"`; `VIEW_CHO_TRIGGER_VC` thêm `"v_ky_closed_period"`. Chưa đổi `STRICT` (thư mục module tạo ở Task 3, Task 7).

- [ ] **Step 6: Từ điển dữ liệu.** Thêm vào `docs/data-dictionary.json` mọi bảng (`prc_beneficiary_role`, `prc_commission_rule`, `prc_supply_term`, `ord_service_terms`, `ord_audit_cutoff`, `ky_period_close`), mọi view (`v_pty_open_role`, `v_ctl_service_group`, `v_prc_beneficiary_role`, `v_prc_commission_rule`, `v_prc_supply_term`, `v_ord_terms_missing`, `v_ky_closed_period`), module `pricing`, `ky-so`, và khoá ngoại xuyên module vào `integrityEdges` — chép đúng khuôn của mục `pty_bank_account` / `bil_receipt_bank_txn` đã có. Rồi `npm run dict`.

- [ ] **Step 7: Kiểm toàn bộ.** `npm run typecheck && npm test`. Kỳ vọng xanh; bài thân trigger (`ADR-0024 điều 5`) phải nhận mọi trigger mới. Đỏ ở bài nào đòi thư mục module tồn tại thì ghi ruling vào sổ và tạo `src/modules/ky-so/index.ts` tối thiểu ngay ở task này.

- [ ] **Step 8: Quan sát chặn thật (P16).** Lần lượt: (a) đổi `NEW.group_code = 'TXE'` thành `'TXE_X'` trong trigger X3 → bài X3 đỏ → hoàn nguyên; (b) bỏ dòng `"v_ky_closed_period"` khỏi `VIEW_CHO_TRIGGER_VC` → bài thân trigger đỏ → hoàn nguyên; (c) bỏ `"ky-so"` khỏi cạnh `billing` → bài thân trigger đỏ → hoàn nguyên. Ghi ba dòng vào bảng P16.

- [ ] **Step 9: Commit.**

```bash
git add migrations/0090_so_dai_ly_dot_1.sql src/migrations-so-dai-ly.test.ts src/architecture.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md
git commit -m "Migration sổ đại lý đợt 1: bảng mức, điều khoản người bán, bản chụp đơn, khoá tháng" -m "Một migration chỉ thêm cho ADR-0077, ADR-0078 B1, ADR-0080 D1: luật dữ liệu nằm ở trigger (chỉ đóng, không chồng, X3, một bản chụp hiện hành, liền kề, tháng đã khoá) để mã sai vẫn không ghi được dữ liệu sai. Nới đúng các mục C12 đã duyệt." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Luật thuần của `pricing`

**Files:**
- Create: `src/modules/pricing/rules.ts`
- Create: `src/modules/pricing/rules.test.ts`

**Interfaces:**
- Consumes: `parseUnit`, `payingGuests`, `PaxCounts` từ `src/shared/order-lines.ts`.
- Produces (dùng ở Task 3, 4, 5, 6):
  - Kiểu: `KieuMuc`, `PhamVi`, `LyDoThieu`, `DongMuc`, `DongDieuKhoan`, `NguoiHuong`, `KetQuaMuc`, `KetQuaDieuKhoan`, `DongDon`, `BanChup`, `DongPhanDoiTac`.
  - Hàm: `hieuLuc(d, ngay)`, `nguoiHuongCua({ bookerPartyId, vaiMo, vaiDuocHuong, congTyChuId })`, `chonMuc({ nguoiHuong, catalogCode, groupCode, ngay, dong })`, `chonDieuKhoan({ catalogCode, groupCode, ngay, dong })`, `lamTronNuaLen(tu, mau)`, `hoaHongDong({ kind, rateBp, perPaxAmount, thanhTien, soKhachTinh })`, `giaVonDong({ costRateBp, thanhTien })`, `soKhachTinhHoaHong({ unit, pax, items })`, `chupDon({ nguoiHuong, ngay, dong, muc, dieuKhoan })`, `tinhDongDoiTac(chup, { thanhTien, soKhachTinh })`.

- [ ] **Step 1: Viết bài đỏ** `src/modules/pricing/rules.test.ts`:

```ts
// Luật thuần sổ đại lý đợt 1 (đặc tả §4, §12 tiêu chí 1–2). Số của ví dụ đã duyệt trong ADR-0077 / ADR-0078 — không phụ thuộc trạng thái sổ vàng.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chonDieuKhoan, chonMuc, chupDon, giaVonDong, hoaHongDong, lamTronNuaLen, nguoiHuongCua, soKhachTinhHoaHong, tinhDongDoiTac,
  type DongDieuKhoan, type DongMuc, type NguoiHuong,
} from "./rules.ts";

const VAI = new Set(["TRAVEL_AGENCY", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR"]);
const DL_A: NguoiHuong = { loai: "HUONG", partyId: "dl-a", vai: ["TRAVEL_AGENCY"] };
let k = 0;
const muc = (o: Partial<DongMuc>): DongMuc => ({
  id: `m${++k}`, targetPartyId: null, targetRoleCode: "TRAVEL_AGENCY", scope: "ALL", catalogCode: null, groupCode: null, kind: "RATE", rateBp: 1000, perPaxAmount: null,
  validFrom: "2026-01-01", validTo: null, ...o,
});
const dk = (o: Partial<DongDieuKhoan>): DongDieuKhoan => ({
  id: `d${++k}`, scope: "ALL", catalogCode: null, groupCode: null, sellerPartyId: "ct", supplierPartyId: null, costRateBp: null, validFrom: "2025-01-01", validTo: null, ...o,
});

test("người hưởng: bên đặt mang vai được hưởng ⇒ HUONG; vai bên ngoài khác ⇒ KHONG_HUONG; khách lẻ, nội bộ, công ty chủ, trống ⇒ NONE", () => {
  const g = (vai: { roleTypeCode: string; roleGroup: string }[], id: string | null = "p") => nguoiHuongCua({ bookerPartyId: id, vaiMo: vai, vaiDuocHuong: VAI, congTyChuId: "ct" });
  assert.deepEqual(g([{ roleTypeCode: "TRAVEL_AGENCY", roleGroup: "EXTERNAL" }]), { loai: "HUONG", partyId: "p", vai: ["TRAVEL_AGENCY"] });
  assert.deepEqual(g([{ roleTypeCode: "DRIVER_EXTERNAL", roleGroup: "EXTERNAL" }]), { loai: "KHONG_HUONG", partyId: "p" });
  assert.deepEqual(g([{ roleTypeCode: "CUSTOMER", roleGroup: "OTHER" }]), { loai: "NONE" });
  assert.deepEqual(g([{ roleTypeCode: "SALES", roleGroup: "INTERNAL" }]), { loai: "NONE" });
  assert.deepEqual(g([{ roleTypeCode: "TRAVEL_AGENCY", roleGroup: "EXTERNAL" }], "ct"), { loai: "NONE" });
  assert.deepEqual(g([], null), { loai: "NONE" });
});

test("chonMuc: đủ sáu bậc, bậc cụ thể nhất thắng", () => {
  const ds = [
    muc({ targetPartyId: "dl-a", targetRoleCode: null, scope: "SERVICE", catalogCode: "HONTAM", rateBp: 1200 }),
    muc({ targetPartyId: "dl-a", targetRoleCode: null, scope: "GROUP", groupCode: "DTH", rateBp: 1300 }),
    muc({ targetPartyId: "dl-a", targetRoleCode: null, scope: "ALL", rateBp: 1100 }),
    muc({ scope: "SERVICE", catalogCode: "VINW", rateBp: 900 }),
    muc({ scope: "GROUP", groupCode: "TOUR", rateBp: 800 }),
    muc({ scope: "ALL", rateBp: 700 }),
  ];
  const c = (code: string, group: string | null, nh: NguoiHuong = DL_A) => chonMuc({ nguoiHuong: nh, catalogCode: code, groupCode: group, ngay: "2026-10-10", dong: ds });
  const bac = (r: ReturnType<typeof c>) => (r.trangThai === "SET" ? [r.bac, r.dong.rateBp] : r);
  assert.deepEqual(bac(c("HONTAM", "VE")), [1, 1200]);
  assert.deepEqual(bac(c("DUTHUYEN", "DTH")), [2, 1300]);
  assert.deepEqual(bac(c("KHAC", "VE")), [3, 1100]);
  const B: NguoiHuong = { loai: "HUONG", partyId: "dl-b", vai: ["TRAVEL_AGENCY"] };
  assert.deepEqual(bac(c("VINW", "VE", B)), [4, 900]);
  assert.deepEqual(bac(c("TOURDAO", "TOUR", B)), [5, 800]);
  assert.deepEqual(bac(c("KHAC", "VE", B)), [6, 700]);
});

test("chonMuc: ranh ngày (= ngày bắt đầu, = ngày kết thúc), mức 0 hợp lệ, không khớp ⇒ NO_RULE", () => {
  const ds = [muc({ rateBp: 0, validFrom: "2026-10-01", validTo: "2026-10-31" })];
  const c = (ngay: string) => chonMuc({ nguoiHuong: DL_A, catalogCode: "X", groupCode: null, ngay, dong: ds });
  assert.equal(c("2026-10-01").trangThai, "SET");
  assert.equal(c("2026-10-31").trangThai, "SET");
  const r = c("2026-10-15");
  assert.ok(r.trangThai === "SET" && r.dong.rateBp === 0, "mức 0 là mức hợp lệ, không phải thiếu");
  assert.deepEqual(c("2026-11-01"), { trangThai: "MISSING", lyDo: "NO_RULE" });
  assert.deepEqual(c("2026-09-30"), { trangThai: "MISSING", lyDo: "NO_RULE" });
});

test("chonMuc: hai vai cùng bậc khác mức ⇒ RULE_CONFLICT; cùng mức ⇒ SET; dòng nhập tay ⇒ MANUAL_LINE; bên đặt không hưởng ⇒ BOOKER_NOT_BENEFICIARY; khách lẻ ⇒ NONE", () => {
  const hai: NguoiHuong = { loai: "HUONG", partyId: "p", vai: ["COLLABORATOR", "GUIDE_FREELANCE"] };
  const khac = [muc({ targetRoleCode: "COLLABORATOR", rateBp: 1000 }), muc({ targetRoleCode: "GUIDE_FREELANCE", rateBp: 1500 })];
  const giong = [muc({ targetRoleCode: "COLLABORATOR", rateBp: 1000 }), muc({ targetRoleCode: "GUIDE_FREELANCE", rateBp: 1000 })];
  const c = (nh: NguoiHuong, ds: DongMuc[], code: string | null = "X") => chonMuc({ nguoiHuong: nh, catalogCode: code, groupCode: null, ngay: "2026-10-10", dong: ds });
  assert.deepEqual(c(hai, khac), { trangThai: "MISSING", lyDo: "RULE_CONFLICT" });
  assert.equal(c(hai, giong).trangThai, "SET");
  assert.deepEqual(c(DL_A, giong, null), { trangThai: "MISSING", lyDo: "MANUAL_LINE" });
  assert.deepEqual(c({ loai: "KHONG_HUONG", partyId: "tx" }, giong), { trangThai: "MISSING", lyDo: "BOOKER_NOT_BENEFICIARY" });
  assert.deepEqual(c({ loai: "NONE" }, giong), { trangThai: "NONE" });
});

test("chonMuc: dịch vụ Chưa phân loại chỉ khớp bậc dịch vụ hoặc mọi dịch vụ", () => {
  const ds = [muc({ scope: "GROUP", groupCode: "VE", rateBp: 500 })];
  assert.deepEqual(chonMuc({ nguoiHuong: DL_A, catalogCode: "MOI", groupCode: null, ngay: "2026-10-10", dong: ds }), { trangThai: "MISSING", lyDo: "NO_RULE" });
});

test("chonDieuKhoan: SERVICE > GROUP > ALL theo ngày; dòng nhập tay ⇒ MISSING", () => {
  const ds = [dk({}), dk({ scope: "GROUP", groupCode: "VE", sellerPartyId: "ncc1", supplierPartyId: "ncc1", costRateBp: 7000 }),
    dk({ scope: "SERVICE", catalogCode: "IRESORT", sellerPartyId: "ncc2", supplierPartyId: "ncc2", costRateBp: 8000, validFrom: "2026-10-01" })];
  const c = (code: string | null, group: string | null, ngay = "2026-10-10") => chonDieuKhoan({ catalogCode: code, groupCode: group, ngay, dong: ds });
  const ai = (r: ReturnType<typeof c>) => (r.trangThai === "SET" ? r.dong.sellerPartyId : "MISSING");
  assert.equal(ai(c("IRESORT", "VE")), "ncc2");
  assert.equal(ai(c("IRESORT", "VE", "2026-09-30")), "ncc1");
  assert.equal(ai(c("HONTAM", "VE")), "ncc1");
  assert.equal(ai(c("TOURDAO", "TOUR")), "ct");
  assert.equal(ai(c(null, null)), "MISSING");
});

test("làm tròn nửa lên theo dòng (điều A1): A-5 ra 125.000; ca đúng nửa đồng 1.000.004 × 12,5% ra 125.001", () => {
  assert.equal(hoaHongDong({ kind: "RATE", rateBp: 1250, perPaxAmount: null, thanhTien: 999_999, soKhachTinh: 1 }), 125_000);
  assert.equal(hoaHongDong({ kind: "RATE", rateBp: 1250, perPaxAmount: null, thanhTien: 1_000_004, soKhachTinh: 1 }), 125_001);
  assert.equal(lamTronNuaLen(5, 10), 1);
  assert.equal(lamTronNuaLen(4, 10), 0);
  assert.equal(lamTronNuaLen(0, 10000), 0);
});

test("A-1: đại lý A — 240.000 + 450.000 + 100.000 = 790.000; giá đại lý 5.210.000", () => {
  const ds = [
    muc({ targetPartyId: "dl-a", targetRoleCode: null, scope: "SERVICE", catalogCode: "HONTAM", rateBp: 1200 }),
    muc({ scope: "GROUP", groupCode: "DTH", rateBp: 1500 }),
    muc({ scope: "ALL", rateBp: 1000 }),
  ];
  const don = [
    { serviceId: "s1", catalogCode: "HONTAM", groupCode: "VE", thanhTien: 2_000_000 },
    { serviceId: "s2", catalogCode: "DUTHUYEN", groupCode: "DTH", thanhTien: 3_000_000 },
    { serviceId: "s3", catalogCode: "TOURDAO", groupCode: "TOUR", thanhTien: 1_000_000 },
  ];
  const chup = chupDon({ nguoiHuong: DL_A, ngay: "2026-10-10", dong: don, muc: ds, dieuKhoan: [dk({})] });
  const dong = chup.map((c, i) => tinhDongDoiTac(c, { thanhTien: don[i]!.thanhTien, soKhachTinh: 1 }));
  assert.deepEqual(dong.map((d) => d.hoaHong), [240_000, 450_000, 100_000]);
  assert.equal(dong.reduce((s, d) => s + (d.hoaHong ?? 0), 0), 790_000);
  assert.equal(dong.reduce((s, d) => s + (d.giaDaiLy ?? 0), 0), 5_210_000);
});

test("A-2: 50.000 đ/khách — 3 khách tính (em bé không tính) = 150.000, sau điều chỉnh 4 khách = 200.000 (mức chụp giữ nguyên)", () => {
  const nh: NguoiHuong = { loai: "HUONG", partyId: "huong", vai: ["HOTEL_RECEPTION"] };
  const [c] = chupDon({ nguoiHuong: nh, ngay: "2026-10-10", dong: [{ serviceId: "s", catalogCode: "IRESORT", groupCode: "VE", thanhTien: 0 }],
    muc: [muc({ targetRoleCode: "HOTEL_RECEPTION", scope: "SERVICE", catalogCode: "IRESORT", kind: "PER_PAX", rateBp: null, perPaxAmount: 50_000 })], dieuKhoan: [dk({})] });
  const truoc = soKhachTinhHoaHong({ unit: "perPax", pax: { adult: 2, child: 1, senior: 0, infant: 1 }, items: [] });
  const sau = soKhachTinhHoaHong({ unit: "perPax", pax: { adult: 3, child: 1, senior: 0, infant: 1 }, items: [] });
  assert.equal(tinhDongDoiTac(c!, { thanhTien: 900_000, soKhachTinh: truoc }).hoaHong, 150_000);
  assert.equal(tinhDongDoiTac(c!, { thanhTien: 1_200_000, soKhachTinh: sau }).hoaHong, 200_000);
});

test("H7: dịch vụ tính theo nhóm đếm lượt (tổng quantity), không đếm người", () => {
  assert.equal(soKhachTinhHoaHong({ unit: "per5Pax", pax: { adult: 7, child: 0, senior: 0, infant: 0 }, items: [{ quantity: 2 }] }), 2);
});

test("A-3: đổi bảng sau xác nhận — bản chụp 10% vẫn tính 10%", () => {
  const cu = muc({ scope: "ALL", rateBp: 1000, validTo: "2026-10-14" });
  const moi = muc({ scope: "ALL", rateBp: 1200, validFrom: "2026-10-15" });
  const [c10] = chupDon({ nguoiHuong: DL_A, ngay: "2026-10-10", dong: [{ serviceId: "s", catalogCode: "X", groupCode: null, thanhTien: 1_000_000 }], muc: [cu, moi], dieuKhoan: [dk({})] });
  const [c16] = chupDon({ nguoiHuong: DL_A, ngay: "2026-10-16", dong: [{ serviceId: "s", catalogCode: "X", groupCode: null, thanhTien: 1_000_000 }], muc: [cu, moi], dieuKhoan: [dk({})] });
  assert.equal(tinhDongDoiTac(c10!, { thanhTien: 1_000_000, soKhachTinh: 1 }).hoaHong, 100_000);
  assert.equal(tinhDongDoiTac(c16!, { thanhTien: 1_000_000, soKhachTinh: 1 }).hoaHong, 120_000);
});

test("A-4: thiếu mức ⇒ hoa hồng null (không bao giờ tự lấy 0); ghi tay 15% ⇒ 150.000", () => {
  const ctv: NguoiHuong = { loai: "HUONG", partyId: "lan", vai: ["COLLABORATOR"] };
  const [c] = chupDon({ nguoiHuong: ctv, ngay: "2026-10-10", dong: [{ serviceId: "s", catalogCode: "HONTAM", groupCode: "VE", thanhTien: 1_000_000 }], muc: [muc({})], dieuKhoan: [dk({})] });
  assert.deepEqual(c!.hoaHong, { status: "MISSING", reason: "NO_RULE" });
  const thieu = tinhDongDoiTac(c!, { thanhTien: 1_000_000, soKhachTinh: 1 });
  assert.equal(thieu.hoaHong, null);
  assert.equal(thieu.giaDaiLy, null);
  const tay = { ...c!, hoaHong: { status: "SET" as const, kind: "RATE" as const, rateBp: 1500, perPax: null, ruleId: null } };
  assert.equal(tinhDongDoiTac(tay, { thanhTien: 1_000_000, soKhachTinh: 1 }).hoaHong, 150_000);
});

test("B-3: giá vốn 80% trên thành tiền TRƯỚC giảm = 240.000", () => {
  assert.equal(giaVonDong({ costRateBp: 8000, thanhTien: 300_000 }), 240_000);
  const [c] = chupDon({ nguoiHuong: { loai: "NONE" }, ngay: "2026-10-10", dong: [{ serviceId: "s", catalogCode: "IRESORT", groupCode: "VE", thanhTien: 300_000 }], muc: [],
    dieuKhoan: [dk({}), dk({ scope: "SERVICE", catalogCode: "IRESORT", sellerPartyId: "ncc", supplierPartyId: "ncc", costRateBp: 8000 })] });
  assert.equal(tinhDongDoiTac(c!, { thanhTien: 300_000, soKhachTinh: 1 }).giaVon, 240_000);
});

test("bên đặt cũng là nhà cung cấp của dòng ⇒ hoa hồng dòng đó RULE_CONFLICT", () => {
  const nh: NguoiHuong = { loai: "HUONG", partyId: "ncc", vai: ["TRAVEL_AGENCY"] };
  const [c] = chupDon({ nguoiHuong: nh, ngay: "2026-10-10", dong: [{ serviceId: "s", catalogCode: "IRESORT", groupCode: "VE", thanhTien: 300_000 }], muc: [muc({})],
    dieuKhoan: [dk({}), dk({ scope: "SERVICE", catalogCode: "IRESORT", sellerPartyId: "ncc", supplierPartyId: "ncc", costRateBp: 8000 })] });
  assert.deepEqual(c!.hoaHong, { status: "MISSING", reason: "RULE_CONFLICT" });
});
```

- [ ] **Step 2: Chạy đỏ.** `node --test src/modules/pricing/rules.test.ts` — kỳ vọng FAIL "Cannot find module './rules.ts'".

- [ ] **Step 3: Viết** `src/modules/pricing/rules.ts`:

```ts
// LUẬT THUẦN của sổ đại lý đợt 1 (ADR-0077, ADR-0078 B1; đặc tả docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md §4).
// Không I/O, không import module khác. MỘT hàm chọn mức (`chonMuc`), MỘT hàm chọn điều khoản (`chonDieuKhoan`), MỘT cách làm tròn (`lamTronNuaLen`).
// Tỷ lệ tính bằng phần vạn (1250 = 12,5%). Thành tiền / số khách là số HIỆN HÀNH của dòng; mức là mức ĐÃ CHỤP (A-2).
import { parseUnit, payingGuests, type PaxCounts } from "../../shared/order-lines.ts";

export type KieuMuc = "RATE" | "PER_PAX";
export type PhamVi = "SERVICE" | "GROUP" | "ALL";
export type LyDoThieu = "NO_RULE" | "RULE_CONFLICT" | "MANUAL_LINE" | "BOOKER_NOT_BENEFICIARY" | "NOT_CAPTURED";

export interface DongMuc {
  id: string;
  targetPartyId: string | null;
  targetRoleCode: string | null;
  scope: PhamVi;
  catalogCode: string | null;
  groupCode: string | null;
  kind: KieuMuc;
  rateBp: number | null;
  perPaxAmount: number | null;
  validFrom: string;
  validTo: string | null;
}
export interface DongDieuKhoan {
  id: string;
  scope: PhamVi;
  catalogCode: string | null;
  groupCode: string | null;
  sellerPartyId: string;
  supplierPartyId: string | null;
  costRateBp: number | null;
  validFrom: string;
  validTo: string | null;
}
/** Người hưởng của đơn: HUONG = bên đặt mang vai được hưởng; KHONG_HUONG = bên đặt mang vai bên ngoài KHÔNG thuộc danh sách; NONE = khách lẻ / nội bộ / công ty / trống. */
export type NguoiHuong = { loai: "NONE" } | { loai: "HUONG"; partyId: string; vai: readonly string[] } | { loai: "KHONG_HUONG"; partyId: string };
export type KetQuaMuc = { trangThai: "NONE" } | { trangThai: "SET"; dong: DongMuc; bac: 1 | 2 | 3 | 4 | 5 | 6 } | { trangThai: "MISSING"; lyDo: LyDoThieu };
export type KetQuaDieuKhoan = { trangThai: "SET"; dong: DongDieuKhoan } | { trangThai: "MISSING" };

export const hieuLuc = (d: { validFrom: string; validTo: string | null }, ngay: string): boolean => d.validFrom <= ngay && (d.validTo === null || d.validTo >= ngay);

export function nguoiHuongCua(v: {
  bookerPartyId: string | null;
  vaiMo: readonly { roleTypeCode: string; roleGroup: string }[];
  vaiDuocHuong: ReadonlySet<string>;
  congTyChuId: string | null;
}): NguoiHuong {
  if (v.bookerPartyId === null || v.bookerPartyId === v.congTyChuId) return { loai: "NONE" };
  const vai = [...new Set(v.vaiMo.filter((r) => v.vaiDuocHuong.has(r.roleTypeCode)).map((r) => r.roleTypeCode))].sort();
  if (vai.length > 0) return { loai: "HUONG", partyId: v.bookerPartyId, vai };
  if (v.vaiMo.some((r) => r.roleGroup === "EXTERNAL")) return { loai: "KHONG_HUONG", partyId: v.bookerPartyId };
  return { loai: "NONE" };
}

const THU_TU: readonly PhamVi[] = ["SERVICE", "GROUP", "ALL"];
/** Dòng `d` có khớp mã `catalogCode` (nhóm hiện hành `groupCode`, null = Chưa phân loại) ở đúng phạm vi `pv` không. */
function khop(d: { scope: PhamVi; catalogCode: string | null; groupCode: string | null }, pv: PhamVi, catalogCode: string, groupCode: string | null): boolean {
  if (d.scope !== pv) return false;
  if (pv === "SERVICE") return d.catalogCode === catalogCode;
  if (pv === "GROUP") return groupCode !== null && d.groupCode === groupCode;
  return true;
}
const cungMuc = (a: DongMuc, b: DongMuc): boolean => a.kind === b.kind && a.rateBp === b.rateBp && a.perPaxAmount === b.perPaxAmount;
const theoThuTu = (a: DongMuc, b: DongMuc): number => (a.targetRoleCode ?? "").localeCompare(b.targetRoleCode ?? "") || a.id.localeCompare(b.id);

/** Chọn mức (ADR-0077 điều 5): sáu bậc, bậc cụ thể nhất thắng; chỉ dòng hiệu lực ở `ngay`. Không bao giờ tự lấy 0 khi không khớp. */
export function chonMuc(v: { nguoiHuong: NguoiHuong; catalogCode: string | null; groupCode: string | null; ngay: string; dong: readonly DongMuc[] }): KetQuaMuc {
  if (v.nguoiHuong.loai === "NONE") return { trangThai: "NONE" };
  if (v.nguoiHuong.loai === "KHONG_HUONG") return { trangThai: "MISSING", lyDo: "BOOKER_NOT_BENEFICIARY" };
  if (v.catalogCode === null) return { trangThai: "MISSING", lyDo: "MANUAL_LINE" };
  const nh = v.nguoiHuong;
  const code = v.catalogCode;
  const con = v.dong.filter((d) => hieuLuc(d, v.ngay)).sort(theoThuTu);
  for (const [i, pv] of THU_TU.entries()) {
    const d = con.find((x) => x.targetPartyId === nh.partyId && khop(x, pv, code, v.groupCode));
    if (d) return { trangThai: "SET", dong: d, bac: (i + 1) as 1 | 2 | 3 };
  }
  for (const [i, pv] of THU_TU.entries()) {
    const ds = con.filter((x) => x.targetRoleCode !== null && nh.vai.includes(x.targetRoleCode) && khop(x, pv, code, v.groupCode));
    if (ds.length === 0) continue;
    if (ds.some((x) => !cungMuc(x, ds[0]!))) return { trangThai: "MISSING", lyDo: "RULE_CONFLICT" };
    return { trangThai: "SET", dong: ds[0]!, bac: (i + 4) as 4 | 5 | 6 };
  }
  return { trangThai: "MISSING", lyDo: "NO_RULE" };
}

/** Chọn điều khoản người bán (ADR-0078 điều 3): SERVICE > GROUP > ALL, hiệu lực ở `ngay`; dòng nhập tay luôn MISSING (A-14). */
export function chonDieuKhoan(v: { catalogCode: string | null; groupCode: string | null; ngay: string; dong: readonly DongDieuKhoan[] }): KetQuaDieuKhoan {
  if (v.catalogCode === null) return { trangThai: "MISSING" };
  const code = v.catalogCode;
  const con = v.dong.filter((d) => hieuLuc(d, v.ngay));
  for (const pv of THU_TU) {
    const d = con.find((x) => khop(x, pv, code, v.groupCode));
    if (d) return { trangThai: "SET", dong: d };
  }
  return { trangThai: "MISSING" };
}

/** Làm tròn NỬA LÊN tới đồng của `tu / mau` (tu ≥ 0, mau > 0, số nguyên) — điều A1, chủ duyệt 2026-10-08. */
export const lamTronNuaLen = (tu: number, mau: number): number => Math.floor((2 * tu + mau) / (2 * mau));
export function hoaHongDong(v: { kind: KieuMuc; rateBp: number | null; perPaxAmount: number | null; thanhTien: number; soKhachTinh: number }): number {
  return v.kind === "RATE" ? lamTronNuaLen(v.rateBp! * v.thanhTien, 10_000) : v.perPaxAmount! * v.soKhachTinh;
}
/** Giá vốn trên thành tiền TRƯỚC giảm giá cấp đơn (H8 = A), cùng cách làm tròn. */
export const giaVonDong = (v: { costRateBp: number; thanhTien: number }): number => lamTronNuaLen(v.costRateBp * v.thanhTien, 10_000);
/** Số khách tính hoa hồng (H7): người lớn + trẻ em + người cao tuổi (không em bé); dịch vụ theo nhóm đếm lượt (tổng quantity các dòng tiền). */
export function soKhachTinhHoaHong(v: { unit: string; pax: PaxCounts; items: readonly { quantity: number }[] }): number {
  return parseUnit(v.unit).kind === "group" ? v.items.reduce((s, i) => s + i.quantity, 0) : payingGuests(v.pax);
}

export interface DongDon { serviceId: string; catalogCode: string | null; groupCode: string | null }
/** Bản chụp của một dòng — cùng dạng cho bản mới tính và bản đọc từ `ord_service_terms` (ruleId null = ghi tay). */
export interface BanChup {
  serviceId: string;
  beneficiaryPartyId: string | null;
  hoaHong:
    | { status: "NONE" }
    | { status: "SET"; kind: KieuMuc; rateBp: number | null; perPax: number | null; ruleId: string | null }
    | { status: "MISSING"; reason: LyDoThieu };
  cungUng: { status: "SET"; termId: string | null; sellerPartyId: string; supplierPartyId: string | null; costRateBp: number | null } | { status: "MISSING" };
}

/** Tính bản chụp cho mọi dòng của đơn ở `ngay` (Xác nhận / đổi bên đặt). */
export function chupDon(v: { nguoiHuong: NguoiHuong; ngay: string; dong: readonly DongDon[]; muc: readonly DongMuc[]; dieuKhoan: readonly DongDieuKhoan[] }): BanChup[] {
  const beneficiaryPartyId = v.nguoiHuong.loai === "NONE" ? null : v.nguoiHuong.partyId;
  return v.dong.map((d) => {
    const dk = chonDieuKhoan({ catalogCode: d.catalogCode, groupCode: d.groupCode, ngay: v.ngay, dong: v.dieuKhoan });
    const cungUng: BanChup["cungUng"] = dk.trangThai === "SET"
      ? { status: "SET", termId: dk.dong.id, sellerPartyId: dk.dong.sellerPartyId, supplierPartyId: dk.dong.supplierPartyId, costRateBp: dk.dong.costRateBp }
      : { status: "MISSING" };
    const laNhaCungCap = v.nguoiHuong.loai === "HUONG" && dk.trangThai === "SET" && dk.dong.supplierPartyId === beneficiaryPartyId;
    const m: KetQuaMuc = laNhaCungCap ? { trangThai: "MISSING", lyDo: "RULE_CONFLICT" } : chonMuc({ nguoiHuong: v.nguoiHuong, catalogCode: d.catalogCode, groupCode: d.groupCode, ngay: v.ngay, dong: v.muc });
    const hoaHong: BanChup["hoaHong"] = m.trangThai === "NONE" ? { status: "NONE" }
      : m.trangThai === "MISSING" ? { status: "MISSING", reason: m.lyDo }
      : { status: "SET", kind: m.dong.kind, rateBp: m.dong.rateBp, perPax: m.dong.perPaxAmount, ruleId: m.dong.id };
    return { serviceId: d.serviceId, beneficiaryPartyId, hoaHong, cungUng };
  });
}

export interface DongPhanDoiTac {
  serviceId: string;
  thanhTien: number;
  soKhachTinh: number;
  /** null = thiếu mức (không bao giờ tự lấy 0); 0 khi đơn không có người hưởng. */
  hoaHong: number | null;
  /** Thành tiền − hoa hồng; null khi thiếu mức. Chỉ hiển thị, không lưu. */
  giaDaiLy: number | null;
  /** Chỉ khi người bán là nhà cung cấp. */
  giaVon: number | null;
}
export function tinhDongDoiTac(c: BanChup, tien: { thanhTien: number; soKhachTinh: number }): DongPhanDoiTac {
  const h = c.hoaHong;
  const hoaHong = h.status === "NONE" ? 0 : h.status === "MISSING" ? null
    : hoaHongDong({ kind: h.kind, rateBp: h.rateBp, perPaxAmount: h.perPax, thanhTien: tien.thanhTien, soKhachTinh: tien.soKhachTinh });
  const cu = c.cungUng;
  const giaVon = cu.status === "SET" && cu.supplierPartyId !== null && cu.costRateBp !== null ? giaVonDong({ costRateBp: cu.costRateBp, thanhTien: tien.thanhTien }) : null;
  return { serviceId: c.serviceId, thanhTien: tien.thanhTien, soKhachTinh: tien.soKhachTinh, hoaHong, giaDaiLy: hoaHong === null ? null : tien.thanhTien - hoaHong, giaVon };
}
```

- [ ] **Step 4: Chạy xanh.** `node --test src/modules/pricing/rules.test.ts` — kỳ vọng PASS mọi ca.

- [ ] **Step 5: Quan sát chặn thật (P16).** Đổi `lamTronNuaLen` thành `Math.floor(tu / mau)` → ca "đúng nửa đồng" đỏ → hoàn nguyên. Ghi vào bảng P16.

- [ ] **Step 6: Kiểm toàn bộ.** `npm run typecheck && npm test`. Tệp `pricing/` chưa có `index.ts`/`repository.ts`; nếu bài kiến trúc đỏ vì thư mục module chưa khai `STRICT`, thì thêm ở task này `{ module: "pricing", file: "modules/pricing/repository.ts" }` và tạo `repository.ts` rỗng có một dòng chú thích + `export {};` (ruling ghi sổ). Kỳ vọng xanh.

- [ ] **Step 7: Commit.**

```bash
git add src/modules/pricing/rules.ts src/modules/pricing/rules.test.ts
git commit -m "Luật thuần sổ đại lý: chọn mức sáu bậc, người bán, hoa hồng làm tròn nửa lên" -m "Một hàm chọn mức, một hàm chọn điều khoản, một cách làm tròn — mọi nơi (chụp lúc xác nhận, phần đối tác, thử tra) gọi chung để không có hai công thức. Ví dụ A-1…A-5, B-3 của ADR thành bài." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Module `pricing`: repository, tám route, bốn ô quyền, nhật ký, tên lời thường

**Files:**
- Create: `src/modules/pricing/repository.ts`, `src/modules/pricing/index.ts`, `src/modules/pricing/route.test.ts`
- Modify: `src/modules/pricing/rules.ts` (thêm `kiemThanMuc`, `kiemThanDieuKhoan`, `kiemNgayDong`, `moTaMuc`) + `rules.test.ts`
- Modify: `src/modules/parties/index.ts`, `src/modules/parties/repository.ts` (hàm công bố `tenLoaiVai`) + `src/modules/parties/tai-xe-dieu-phoi.test.ts` (danh sách tên xuất ghim)
- Modify: `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `src/shared/tro-ly-cau-truc-ten.ts`, `src/shared/tro-ly-cau-truc.ts` (sinh)
- Modify: `src/index.ts` (mảng `modules`), `src/architecture.test.ts` (`STRICT` thêm pricing), `src/route-access.test.ts` (+8 dòng, 256 → 264), `src/lan-gui-phu-route.test.ts` (+4 route ghi, 153 → 157)

**Interfaces:**
- Consumes: Task 1 (bảng, view, mã lỗi trigger), Task 2 (luật thuần `chonMuc`, `nguoiHuongCua`, `hieuLuc`, kiểu `DongMuc`, `DongDieuKhoan`, `NguoiHuong`, `PhamVi`, `KieuMuc`); `ownerCompany` (parties, trả `{ partyId, displayName, … } | null`), `getEffectiveServices(db, codes?)` (catalog, trả `Map<code, …>`), `auditStatement(db, { staffId, action, at, detail?, orderId? }, onlyIf?)` (audit), `can`, `holdsPartner` (permissions).
- Produces:
  - `pricing/index.ts`: `pricingModule: AppModule`; `docBangChoChup(db, { bookerPartyId: string | null; catalogCodes: readonly string[]; ngay: string }): Promise<DuLieuChup>` với `DuLieuChup = { nguoiHuong: NguoiHuong; muc: DongMuc[]; dieuKhoan: DongDieuKhoan[]; nhom: ReadonlyMap<string, string | null> }`; `laNguoiHuong(db, partyId): Promise<boolean>`; tái xuất `chupDon`, `tinhDongDoiTac`, `soKhachTinhHoaHong` và các kiểu `BanChup`, `NguoiHuong`, `DongPhanDoiTac`, `KieuMuc`, `LyDoThieu`.
  - `parties/index.ts`: `tenLoaiVai(db): Promise<Map<string, string>>` (mã vai → tên tiếng Việt, đọc `pty_role_type` của chính parties).
  - `contracts.ts`: `DoiTuongMucDto`, `CommissionRuleDto`, `CommissionRuleListResponse`, `SupplyTermDto`, `SupplyTermListResponse`, `ThuTraResponse`, `NguoiHuongTimResponse`.
  - Bốn ô: `partner.commission.view`, `partner.commission.write`, `supply.terms.view`, `supply.terms.write` (giá trị đúng bảng §6 đặc tả).
  - Bốn hành động nhật ký nhóm `ledger`: `prc_commission_rule_added` ("Thêm mức hoa hồng"), `prc_commission_rule_closed` ("Đóng mức hoa hồng"), `prc_supply_term_added` ("Thêm điều khoản người bán"), `prc_supply_term_closed` ("Đóng điều khoản người bán").

- [ ] **Step 1: Bài đỏ cho luật kiểm thân** (thêm vào `src/modules/pricing/rules.test.ts`):

```ts
import { kiemNgayDong, kiemThanDieuKhoan, kiemThanMuc, moTaMuc } from "./rules.ts";

test("kiemThanMuc: đúng một đối tượng, phạm vi khớp mã, tỷ lệ phần vạn 0…10000 hoặc đ/khách ≥ 0, ngày hợp lệ, ghi chú không chứa dãy số dài", () => {
  const goc = { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "GROUP", groupCode: "DTH", kieu: "RATE", tyLeBp: 1500, tuNgay: "2026-10-10" };
  const ok = kiemThanMuc(goc);
  assert.ok(ok.ok);
  assert.deepEqual(ok.ok && ok.value, { targetPartyId: null, targetRoleCode: "TRAVEL_AGENCY", scope: "GROUP", catalogCode: null, groupCode: "DTH", kind: "RATE", rateBp: 1500, perPaxAmount: null,
    validFrom: "2026-10-10", validTo: null, note: null });
  assert.equal(kiemThanMuc({ ...goc, tyLeBp: 10001 }).ok, false);
  assert.equal(kiemThanMuc({ ...goc, tyLeBp: 12.5 }).ok, false, "phần vạn phải là số nguyên");
  assert.equal(kiemThanMuc({ ...goc, phamVi: "SERVICE" }).ok, false, "phạm vi dịch vụ mà không có mã");
  assert.equal(kiemThanMuc({ ...goc, kieu: "PER_PAX", tyLeBp: undefined, moiKhach: -1 }).ok, false);
  assert.equal(kiemThanMuc({ ...goc, tuNgay: "2026-02-30" }).ok, false);
  assert.equal(kiemThanMuc({ ...goc, denNgay: "2026-10-09" }).ok, false, "ngày kết thúc trước ngày bắt đầu");
  assert.equal(kiemThanMuc({ ...goc, ghiChu: "gọi 0905123456" }).ok, false);
  assert.equal(kiemThanMuc({ ...goc, doiTuong: { loai: "DOI_TAC", partyId: "x y" } }).ok, false);
});

test("kiemThanDieuKhoan: người bán bắt buộc; tỷ lệ mua lại phần vạn khi có", () => {
  assert.ok(kiemThanDieuKhoan({ phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: "pty-1", tyLeMuaBp: 8000, tuNgay: "2026-10-10" }).ok);
  assert.equal(kiemThanDieuKhoan({ phamVi: "SERVICE", catalogCode: "IRESORT", tuNgay: "2026-10-10" }).ok, false);
  assert.equal(kiemThanDieuKhoan({ phamVi: "ALL", nguoiBanPartyId: "pty-1", tyLeMuaBp: -5, tuNgay: "2026-10-10" }).ok, false);
});

test("kiemNgayDong: ngày đóng ≥ ngày bắt đầu của dòng", () => {
  assert.ok(kiemNgayDong({ denNgay: "2026-10-31" }, "2026-10-01").ok);
  assert.equal(kiemNgayDong({ denNgay: "2026-09-30" }, "2026-10-01").ok, false);
  assert.equal(kiemNgayDong({}, "2026-10-01").ok, false);
});

test("moTaMuc: lời thường cho nhật ký, không SĐT, tỷ lệ bỏ số 0 thừa", () => {
  assert.equal(moTaMuc({ doiTuong: "Công ty lữ hành", scope: "GROUP", catalogCode: null, groupCode: "DTH", kind: "RATE", rateBp: 1250, perPaxAmount: null }), "Công ty lữ hành · nhóm DTH · 12,5%");
  assert.equal(moTaMuc({ doiTuong: "đối tác pty-1", scope: "SERVICE", catalogCode: "HONTAM", groupCode: null, kind: "PER_PAX", rateBp: null, perPaxAmount: 50_000 }), "đối tác pty-1 · dịch vụ HONTAM · 50.000đ/khách");
  assert.equal(moTaMuc({ doiTuong: "Cộng tác viên", scope: "ALL", catalogCode: null, groupCode: null, kind: "RATE", rateBp: 1000, perPaxAmount: null }), "Cộng tác viên · mọi dịch vụ · 10%");
});
```

- [ ] **Step 2: Chạy đỏ** `node --test src/modules/pricing/rules.test.ts` — FAIL (chưa có bốn hàm).

- [ ] **Step 3: Viết bốn hàm** cuối `src/modules/pricing/rules.ts`:

```ts
type Ket<T> = { ok: true; value: T } | { ok: false; message: string };
const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const PARTY_RE = /^[A-Za-z0-9-]{1,64}$/;
const MA_RE = /^[A-Za-z0-9_]{1,40}$/;
const laNgay = (s: unknown): s is string => typeof s === "string" && NGAY_RE.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const laPhanVan = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 10_000;
/** Ghi chú tuỳ chọn ≤ 200 ký tự, không dãy ≥ 8 chữ số (khuôn billing: không SĐT / số tài khoản). */
function docGhiChu(raw: unknown): Ket<string | null> {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string" || raw.length > 200) return { ok: false, message: "Ghi chú tối đa 200 ký tự." };
  if (/\d{8,}/.test(raw.replace(/[\s.-]/g, ""))) return { ok: false, message: "Ghi chú không được chứa số điện thoại / số tài khoản." };
  return { ok: true, value: raw.trim() || null };
}
function docPhamVi(b: Record<string, unknown>): Ket<{ scope: PhamVi; catalogCode: string | null; groupCode: string | null }> {
  if (b.phamVi === "ALL") return { ok: true, value: { scope: "ALL", catalogCode: null, groupCode: null } };
  if (b.phamVi === "SERVICE" && typeof b.catalogCode === "string" && MA_RE.test(b.catalogCode)) return { ok: true, value: { scope: "SERVICE", catalogCode: b.catalogCode, groupCode: null } };
  if (b.phamVi === "GROUP" && typeof b.groupCode === "string" && MA_RE.test(b.groupCode)) return { ok: true, value: { scope: "GROUP", catalogCode: null, groupCode: b.groupCode } };
  return { ok: false, message: "Chọn phạm vi: một dịch vụ, một nhóm dịch vụ, hoặc mọi dịch vụ." };
}
function docKhoangNgay(b: Record<string, unknown>): Ket<{ validFrom: string; validTo: string | null }> {
  if (!laNgay(b.tuNgay)) return { ok: false, message: "Ngày bắt đầu không hợp lệ." };
  if (b.denNgay === undefined || b.denNgay === null || b.denNgay === "") return { ok: true, value: { validFrom: b.tuNgay, validTo: null } };
  if (!laNgay(b.denNgay) || b.denNgay < b.tuNgay) return { ok: false, message: "Ngày kết thúc không hợp lệ hoặc trước ngày bắt đầu." };
  return { ok: true, value: { validFrom: b.tuNgay, validTo: b.denNgay } };
}

export type ThanMuc = Omit<DongMuc, "id" | "validFrom" | "validTo"> & { validFrom: string; validTo: string | null; note: string | null };
/** Thân `POST /api/pricing/hoa-hong`: { doiTuong: { loai: "VAI", code } | { loai: "DOI_TAC", partyId }, phamVi, catalogCode?, groupCode?, kieu, tyLeBp? | moiKhach?, tuNgay, denNgay?, ghiChu? }. */
export function kiemThanMuc(raw: unknown): Ket<ThanMuc> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Thiếu thông tin mức hoa hồng." };
  const b = raw as Record<string, unknown>;
  const dt = b.doiTuong as Record<string, unknown> | undefined;
  let targetPartyId: string | null = null;
  let targetRoleCode: string | null = null;
  if (dt?.loai === "VAI" && typeof dt.code === "string" && MA_RE.test(dt.code)) targetRoleCode = dt.code;
  else if (dt?.loai === "DOI_TAC" && typeof dt.partyId === "string" && PARTY_RE.test(dt.partyId)) targetPartyId = dt.partyId;
  else return { ok: false, message: "Chọn áp cho một loại đối tác hoặc một đối tác cụ thể." };
  const pv = docPhamVi(b);
  if (!pv.ok) return pv;
  let kind: KieuMuc;
  let rateBp: number | null = null;
  let perPaxAmount: number | null = null;
  if (b.kieu === "RATE" && laPhanVan(b.tyLeBp)) { kind = "RATE"; rateBp = b.tyLeBp; }
  else if (b.kieu === "PER_PAX" && typeof b.moiKhach === "number" && Number.isInteger(b.moiKhach) && b.moiKhach >= 0 && b.moiKhach <= 100_000_000) { kind = "PER_PAX"; perPaxAmount = b.moiKhach; }
  else return { ok: false, message: "Mức phải là tỷ lệ từ 0% tới 100% (tối đa hai chữ số thập phân) hoặc số tiền mỗi khách không âm." };
  const kn = docKhoangNgay(b);
  if (!kn.ok) return kn;
  const gc = docGhiChu(b.ghiChu);
  if (!gc.ok) return gc;
  return { ok: true, value: { targetPartyId, targetRoleCode, ...pv.value, kind, rateBp, perPaxAmount, ...kn.value, note: gc.value } };
}

export type ThanDieuKhoan = { scope: PhamVi; catalogCode: string | null; groupCode: string | null; sellerPartyId: string; costRateBp: number | null; validFrom: string; validTo: string | null; note: string | null };
/** Thân `POST /api/pricing/cung-ung`: { phamVi, catalogCode?, groupCode?, nguoiBanPartyId, tyLeMuaBp?, tuNgay, denNgay?, ghiChu? }. Nhà cung cấp = người bán (máy chủ suy). */
export function kiemThanDieuKhoan(raw: unknown): Ket<ThanDieuKhoan> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Thiếu thông tin điều khoản." };
  const b = raw as Record<string, unknown>;
  const pv = docPhamVi(b);
  if (!pv.ok) return pv;
  if (typeof b.nguoiBanPartyId !== "string" || !PARTY_RE.test(b.nguoiBanPartyId)) return { ok: false, message: "Chọn người bán." };
  let costRateBp: number | null = null;
  if (b.tyLeMuaBp !== undefined && b.tyLeMuaBp !== null) {
    if (!laPhanVan(b.tyLeMuaBp)) return { ok: false, message: "Tỷ lệ mua lại phải từ 0% tới 100%." };
    costRateBp = b.tyLeMuaBp;
  }
  const kn = docKhoangNgay(b);
  if (!kn.ok) return kn;
  const gc = docGhiChu(b.ghiChu);
  if (!gc.ok) return gc;
  return { ok: true, value: { ...pv.value, sellerPartyId: b.nguoiBanPartyId, costRateBp, ...kn.value, note: gc.value } };
}

export function kiemNgayDong(raw: unknown, tuNgay: string): Ket<string> {
  const d = (raw as { denNgay?: unknown } | null)?.denNgay;
  if (!laNgay(d) || d < tuNgay) return { ok: false, message: "Ngày kết thúc không hợp lệ hoặc trước ngày bắt đầu của dòng." };
  return { ok: true, value: d };
}

const nhanBp = (bp: number): string => {
  const nguyen = Math.floor(bp / 100);
  const le = String(bp % 100).padStart(2, "0").replace(/0+$/, "");
  return le ? `${nguyen},${le}%` : `${nguyen}%`;
};
const nhanDong = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
/** Mô tả một dòng mức cho nhật ký: "<đối tượng> · <phạm vi> · <mức>". Không SĐT, không tiền khách. */
export function moTaMuc(v: { doiTuong: string; scope: PhamVi; catalogCode: string | null; groupCode: string | null; kind: KieuMuc; rateBp: number | null; perPaxAmount: number | null }): string {
  const pv = v.scope === "ALL" ? "mọi dịch vụ" : v.scope === "GROUP" ? `nhóm ${v.groupCode}` : `dịch vụ ${v.catalogCode}`;
  const muc = v.kind === "RATE" ? nhanBp(v.rateBp ?? 0) : `${nhanDong(v.perPaxAmount ?? 0)}đ/khách`;
  return `${v.doiTuong} · ${pv} · ${muc}`;
}
```

Ghi chú: `DongMuc` của Task 2 có `validFrom`/`validTo`; nếu tên trường ở Task 2 khác thì dùng đúng tên của Task 2 (Task 2 là nguồn) và sửa `ThanMuc` theo.

- [ ] **Step 4: Xanh** `node --test src/modules/pricing/rules.test.ts`.

- [ ] **Step 5: Bốn ô quyền.** `src/shared/permissions.ts`, thêm sau khối ô `ledger.*` (giữ thứ tự nhóm của tệp; cột theo `PERMISSION_CODES`: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR):

```ts
  // Sổ đại lý đợt 1 (ADR-0077 điều 11, ADR-0078 điều 6; đặc tả 2026-10-08 §6). Cột HR = none (ADR-0071).
  "partner.commission.view": row("any", "any", "any", "none", "none", "any", "none", "none", "none", "none"),
  "partner.commission.write": row("none", "any", "any", "none", "none", "any", "none", "none", "none", "none"),
  "supply.terms.view": row("none", "any", "any", "none", "none", "any", "none", "none", "none", "none"),
  "supply.terms.write": row("none", "any", "any", "none", "none", "any", "none", "none", "none", "none"),
```

`src/shared/permissions.test.ts`: thêm bốn dòng vào bảng `ADR` (đúng giá trị trên); thêm bốn ô `none` vào các bài ghim nguyên dòng `DRIVER`, `DRIVER_PARTNER`, `HR` (`grep -n "DRIVER_PARTNER\|\"HR\"" src/shared/permissions.test.ts` để tìm). `src/shared/tro-ly-cau-truc-ten.ts`, `TEN_THAO_TAC`:

```ts
  "partner.commission.view": { ten: "xem bảng mức hoa hồng đối tác", moTa: "Xem mức hoa hồng theo loại đối tác, theo đối tác, theo dịch vụ hoặc nhóm dịch vụ." },
  "partner.commission.write": { ten: "đặt mức hoa hồng đối tác", moTa: "Thêm mức hoa hồng mới, đóng mức cũ (không sửa, không xoá)." },
  "supply.terms.view": { ten: "xem người bán dịch vụ", moTa: "Xem dịch vụ nào do Tour Đảo bán, dịch vụ nào do nhà cung cấp bán và tỷ lệ mua lại." },
  "supply.terms.write": { ten: "đặt người bán dịch vụ", moTa: "Thêm điều khoản người bán mới, đóng điều khoản cũ." },
```

và `TEN_PHAN_HE`: `"pricing": { ten: "Bảng mức hoa hồng và người bán", moTa: "Mức hoa hồng cho đối tác theo dịch vụ, người bán của từng dịch vụ, cách tính hoa hồng và giá đại lý." }`.

- [ ] **Step 6: Hàm công bố của `parties`.** SQL ở `parties/repository.ts`, hàm ở `parties/index.ts` (cuối các hàm công bố, trước `partiesModule`):

```ts
// parties/repository.ts
const TEN_LOAI_VAI = defineSql("parties", "ten_loai_vai", "SELECT code, name FROM pty_role_type");
export const tenLoaiVaiRows = async (db: D1Database): Promise<{ code: string; name: string }[]> => (await db.prepare(TEN_LOAI_VAI).all<{ code: string; name: string }>()).results;
// parties/index.ts
/** Tên tiếng Việt của mọi mã vai hồ sơ (chỉ nhãn — không phải điều kiện cho phép). Dùng ở màn bảng mức hoa hồng (pricing). */
export async function tenLoaiVai(db: D1Database): Promise<Map<string, string>> {
  return new Map((await tenLoaiVaiRows(db)).map((r) => [r.code, r.name]));
}
```

Kiểm tên cột thật của `pty_role_type` (`grep -n "CREATE TABLE pty_role_type" -A 8 migrations/*.sql`); khác `name` thì dùng đúng tên cột, giữ tên khoá `name` bằng `AS name`. Thêm `tenLoaiVai` vào danh sách tên xuất ghim của `src/modules/parties/tai-xe-dieu-phoi.test.ts`.

- [ ] **Step 7: Kiểu DTO** (`src/shared/contracts.ts`, khối mới "Sổ đại lý đợt 1"):

```ts
export type DoiTuongMucDto = { loai: "VAI"; code: string; ten: string } | { loai: "DOI_TAC"; partyId: string; ten: string };
export interface CommissionRuleDto {
  id: string; doiTuong: DoiTuongMucDto; phamVi: "SERVICE" | "GROUP" | "ALL"; catalogCode: string | null; groupCode: string | null;
  kieu: "RATE" | "PER_PAX"; tyLeBp: number | null; moiKhach: number | null; tuNgay: string; denNgay: string | null; ghiChu: string | null; conHieuLuc: boolean;
}
export interface CommissionRuleListResponse { homNay: string; dong: CommissionRuleDto[]; vai: { code: string; ten: string }[] }
export interface SupplyTermDto {
  id: string; phamVi: "SERVICE" | "GROUP" | "ALL"; catalogCode: string | null; groupCode: string | null; nguoiBan: { partyId: string; ten: string; laCongTy: boolean };
  tyLeMuaBp: number | null; tuNgay: string; denNgay: string | null; ghiChu: string | null; conHieuLuc: boolean;
}
export interface SupplyTermListResponse { homNay: string; dong: SupplyTermDto[]; nhaCungCap: { partyId: string; ten: string }[]; congTyChu: { partyId: string; ten: string } | null }
export interface ThuTraResponse {
  ngay: string;
  nguoiHuong: { loai: "NONE" | "HUONG" | "KHONG_HUONG"; vai: string[] };
  ketQua: { trangThai: "NONE" } | { trangThai: "SET"; bac: 1 | 2 | 3 | 4 | 5 | 6; muc: CommissionRuleDto } | { trangThai: "MISSING"; lyDo: string };
}
export interface NguoiHuongTimResponse { ketQua: { partyId: string; ten: string; loai: "PERSON" | "ORGANIZATION" }[] }
```

`lyDo` của `ThuTraResponse` là câu tiếng Việt (nhãn của Task 5 chưa có ⇒ ở task này dùng bảng tạm trong `pricing/index.ts` với đúng năm câu của `NHAN_LY_DO_THIEU` Task 5; Task 5 chuyển sang dùng `src/shared/so-dai-ly-nhan.ts` và xoá bảng tạm — ghi trong Interfaces của Task 5).

- [ ] **Step 8: Bài route đỏ** `src/modules/pricing/route.test.ts`:

```ts
// Route pricing qua khung thử (đặc tả §6, §12 tiêu chí 4, 7). Bốn ô: partner.commission.*, supply.terms.*; route nguoi-huong.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const DT = "55555555-5555-4555-8555-555555555555";
const HR = "66666666-6666-4666-8666-666666666666";
const SA = "77777777-7777-4777-8777-777777777777";
const NOW = "2026-10-01T00:00:00.000Z";
type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [DT, "0900000006", "Đại Lý A", ["PARTNER"]], [HR, "0900000008", "Hà Nhân Sự", ["HR"]], [SA, "0900000007", "Chủ", ["SUPER_ADMIN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-dt', ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`pty-${DT}`, NOW, NOW);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-ncc', 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(NOW, NOW);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-ncc', 'pty-ncc', 'SUPPLIER', '2026-01-01', ?, ?)").run(NOW, NOW);
  return w;
}
const mucVai = { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000, tuNgay: "2026-10-01" };

test("thêm mức: Kế toán 201 + Location + nhật ký; trùng khoảng 409 câu tiếng Việt; Bán hàng 403 khi ghi, 200 khi xem; HDV, Đối tác, Nhân sự 403", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: mucVai });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.headers.get("location"), "/hoa-hong");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'prc_commission_rule_added'")[0].n), 1);
  const lap = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { ...mucVai, tuNgay: "2026-11-01" } });
  assert.equal(lap.status, 409);
  assert.match(lap.json.error.message, /Đã có mức/);
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: SALES, body: mucVai })).status, 403);
  for (const as of [HDV, DT, HR]) assert.equal((await w.call("GET", "/api/pricing/hoa-hong", { as })).status, 403);
  assert.equal((await w.call("GET", "/api/pricing/hoa-hong", { as: SALES })).status, 200);
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: ADM, body: { ...mucVai, doiTuong: { loai: "VAI", code: "COLLABORATOR" } } })).status, 201);
});

test("mức riêng cho hồ sơ không mang vai được hưởng ⇒ 400; đóng mức ⇒ 200, đóng lần hai ⇒ 409", async () => {
  const w = setup();
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { ...mucVai, doiTuong: { loai: "DOI_TAC", partyId: `pty-${SALES}` } } })).status, 400);
  const id = (await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { ...mucVai, doiTuong: { loai: "DOI_TAC", partyId: `pty-${DT}` } } })).json.dong.id;
  assert.equal((await w.call("POST", `/api/pricing/hoa-hong/${id}/dong`, { as: KT, body: { denNgay: "2026-12-31" } })).status, 200);
  assert.equal((await w.call("POST", `/api/pricing/hoa-hong/${id}/dong`, { as: KT, body: { denNgay: "2026-12-31" } })).status, 409);
});

test("thử tra: đối tác A + dịch vụ ⇒ mức thắng và bậc", async () => {
  const w = setup();
  await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: mucVai });
  const r = await w.call("GET", `/api/pricing/thu-tra?doiTac=pty-${DT}&dichVu=HONTAM&ngay=2026-10-10`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ketQua.trangThai, "SET");
  assert.equal(r.json.ketQua.bac, 6);
});

test("điều khoản người bán: nhà cung cấp 80% ⇒ 201; nhóm Thuê xe ⇒ 409 X3; Bán hàng không xem được; Quản trị xem được", async () => {
  const w = setup();
  const b = { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: "pty-ncc", tyLeMuaBp: 8000, tuNgay: "2026-10-01" };
  assert.equal((await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: b })).status, 201);
  const x3 = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { ...b, catalogCode: undefined, phamVi: "GROUP", groupCode: "TXE" } });
  assert.equal(x3.status, 409);
  assert.match(x3.json.error.message, /Thuê xe/);
  assert.equal((await w.call("GET", "/api/pricing/cung-ung", { as: SALES })).status, 403);
  assert.equal((await w.call("GET", "/api/pricing/cung-ung", { as: ADM })).status, 200);
});

test("tìm người hưởng theo tên: Bán hàng thấy đại lý, không thấy nhà cung cấp; Đối tác 403", async () => {
  const w = setup();
  const r = await w.call("GET", `/api/pricing/nguoi-huong?q=${encodeURIComponent("Đại")}`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.ketQua.some((x: { partyId: string }) => x.partyId === `pty-${DT}`));
  assert.ok(!r.json.ketQua.some((x: { partyId: string }) => x.partyId === "pty-ncc"), "nhà cung cấp không phải người hưởng");
  assert.equal((await w.call("GET", `/api/pricing/nguoi-huong?q=${encodeURIComponent("Đại")}`, { as: DT })).status, 403);
});
```

Ghi chú: (1) cột `pty_party`, `pty_party_role` ở bài là cột NOT NULL tối thiểu; thiếu cột thì đọc `PRAGMA table_info` và bổ sung, không nới mã. Tên hiển thị của hồ sơ `pty-${DT}` do `seedStaff` đặt — nếu không phải "Đại Lý A" thì đổi từ khoá tìm cho khớp. (2) Mã `IRESORT`, `HONTAM` phải có trong danh mục khung thử nếu route kiểm mã qua `getEffectiveServices`; nếu khung thử chưa gieo danh mục thì gieo một dòng theo khuôn ở `src/modules/catalog/*.test.ts` — không bỏ kiểm mã ở route.

- [ ] **Step 9: Chạy đỏ** `node --test src/modules/pricing/route.test.ts` — FAIL 404 (route chưa có).

- [ ] **Step 10: Viết `src/modules/pricing/repository.ts`** (STRICT, mọi câu qua `defineSql`, tham số đánh số, câu tĩnh):

```ts
// SQL của module pricing (ADR-0077, ADR-0078 B1): ba bảng prc_* + đọc view công bố của parties (v_pty_open_role, v_pty_party_label) và catalog
// (v_ctl_service_group). Không JOIN bảng của module khác (Hiến chương 5.3). Câu TĨNH.
import { defineSql } from "../../shared/sql-registry.ts";

export interface RuleRow {
  id: string; target_party_id: string | null; target_role_code: string | null; scope: "SERVICE" | "GROUP" | "ALL"; catalog_code: string | null; group_code: string | null;
  kind: "RATE" | "PER_PAX"; rate_bp: number | null; per_pax_amount: number | null; valid_from_date: string; valid_to_date: string | null; note: string | null; target_name: string | null;
}
export interface TermRow {
  id: string; scope: "SERVICE" | "GROUP" | "ALL"; catalog_code: string | null; group_code: string | null; seller_party_id: string; supplier_party_id: string | null;
  cost_rate_bp: number | null; valid_from_date: string; valid_to_date: string | null; note: string | null; seller_name: string | null;
}
const COT_MUC = `r.id, r.target_party_id, r.target_role_code, r.scope, r.catalog_code, r.group_code, r.kind, r.rate_bp, r.per_pax_amount, r.valid_from_date, r.valid_to_date, r.note`;
const COT_DK = `t.id, t.scope, t.catalog_code, t.group_code, t.seller_party_id, t.supplier_party_id, t.cost_rate_bp, t.valid_from_date, t.valid_to_date, t.note`;
const MUC_TAT_CA = defineSql("pricing", "rules_all",
  `SELECT ${COT_MUC}, l.display_name AS target_name FROM prc_commission_rule r LEFT JOIN v_pty_party_label l ON l.id = r.target_party_id
   ORDER BY (r.valid_to_date IS NOT NULL), r.valid_from_date DESC, r.id`);
const MUC_NGAY = defineSql("pricing", "rules_on",
  `SELECT ${COT_MUC}, NULL AS target_name FROM prc_commission_rule r WHERE r.valid_from_date <= ?1 AND (r.valid_to_date IS NULL OR r.valid_to_date >= ?1)`);
const MUC_ID = defineSql("pricing", "rule_by_id", `SELECT ${COT_MUC}, l.display_name AS target_name FROM prc_commission_rule r LEFT JOIN v_pty_party_label l ON l.id = r.target_party_id WHERE r.id = ?1`);
const MUC_THEM = defineSql("pricing", "rule_insert",
  `INSERT INTO prc_commission_rule (id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date, note,
     created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?13, ?14)`);
const MUC_DONG = defineSql("pricing", "rule_close",
  `UPDATE prc_commission_rule SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND valid_to_date IS NULL`);
const DK_TAT_CA = defineSql("pricing", "terms_all",
  `SELECT ${COT_DK}, l.display_name AS seller_name FROM prc_supply_term t LEFT JOIN v_pty_party_label l ON l.id = t.seller_party_id
   ORDER BY (t.valid_to_date IS NOT NULL), t.valid_from_date DESC, t.id`);
const DK_NGAY = defineSql("pricing", "terms_on",
  `SELECT ${COT_DK}, NULL AS seller_name FROM prc_supply_term t WHERE t.valid_from_date <= ?1 AND (t.valid_to_date IS NULL OR t.valid_to_date >= ?1)`);
const DK_ID = defineSql("pricing", "term_by_id", `SELECT ${COT_DK}, l.display_name AS seller_name FROM prc_supply_term t LEFT JOIN v_pty_party_label l ON l.id = t.seller_party_id WHERE t.id = ?1`);
const DK_THEM = defineSql("pricing", "term_insert",
  `INSERT INTO prc_supply_term (id, scope, catalog_code, group_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, valid_to_date, note,
     created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?11, ?12)`);
const DK_DONG = defineSql("pricing", "term_close",
  `UPDATE prc_supply_term SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND valid_to_date IS NULL`);
const VAI_HUONG = defineSql("pricing", "beneficiary_roles", "SELECT role_type_code FROM prc_beneficiary_role WHERE active = 1 ORDER BY role_type_code");
const VAI_MO = defineSql("pricing", "open_roles_of", "SELECT role_type_code, role_group FROM v_pty_open_role WHERE party_id = ?1");
const LA_HUONG = defineSql("pricing", "is_beneficiary",
  `SELECT 1 AS ok FROM v_pty_open_role r JOIN prc_beneficiary_role b ON b.role_type_code = r.role_type_code AND b.active = 1 WHERE r.party_id = ?1 LIMIT 1`);
const NHOM_CUA = defineSql("pricing", "groups_of", "SELECT catalog_code, group_code FROM v_ctl_service_group WHERE catalog_code IN (SELECT value FROM json_each(?1))");
const TIM_HUONG = defineSql("pricing", "find_beneficiaries",
  `SELECT l.id, l.display_name, l.party_kind FROM v_pty_party_label l
   WHERE l.active = 1 AND EXISTS (SELECT 1 FROM v_pty_open_role r JOIN prc_beneficiary_role b ON b.role_type_code = r.role_type_code AND b.active = 1 WHERE r.party_id = l.id)
     AND (?1 = '' OR l.display_name LIKE '%' || ?1 || '%') ORDER BY l.display_name LIMIT 20`);
const NHA_CUNG_CAP = defineSql("pricing", "suppliers",
  `SELECT l.id, l.display_name FROM v_pty_party_label l WHERE l.active = 1 AND EXISTS (SELECT 1 FROM v_pty_open_role r WHERE r.party_id = l.id AND r.role_type_code = 'SUPPLIER')
   ORDER BY l.display_name`);

export const allRules = async (db: D1Database) => (await db.prepare(MUC_TAT_CA).all<RuleRow>()).results;
export const rulesOn = async (db: D1Database, ngay: string) => (await db.prepare(MUC_NGAY).bind(ngay).all<RuleRow>()).results;
export const ruleById = (db: D1Database, id: string) => db.prepare(MUC_ID).bind(id).first<RuleRow>();
export const insertRuleStatement = (db: D1Database, id: string, v: { targetPartyId: string | null; targetRoleCode: string | null; scope: string; catalogCode: string | null; groupCode: string | null;
  kind: string; rateBp: number | null; perPaxAmount: number | null; validFrom: string; validTo: string | null; note: string | null }, at: string, by: string) =>
  db.prepare(MUC_THEM).bind(id, v.targetPartyId, v.targetRoleCode, v.scope, v.catalogCode, v.groupCode, v.kind, v.rateBp, v.perPaxAmount, v.validFrom, v.validTo, v.note, at, by);
export const closeRuleStatement = (db: D1Database, id: string, den: string, at: string, by: string) => db.prepare(MUC_DONG).bind(id, den, at, by);
export const allTerms = async (db: D1Database) => (await db.prepare(DK_TAT_CA).all<TermRow>()).results;
export const termsOn = async (db: D1Database, ngay: string) => (await db.prepare(DK_NGAY).bind(ngay).all<TermRow>()).results;
export const termById = (db: D1Database, id: string) => db.prepare(DK_ID).bind(id).first<TermRow>();
export const insertTermStatement = (db: D1Database, id: string, v: { scope: string; catalogCode: string | null; groupCode: string | null; sellerPartyId: string; supplierPartyId: string | null;
  costRateBp: number | null; validFrom: string; validTo: string | null; note: string | null }, at: string, by: string) =>
  db.prepare(DK_THEM).bind(id, v.scope, v.catalogCode, v.groupCode, v.sellerPartyId, v.supplierPartyId, v.costRateBp, v.validFrom, v.validTo, v.note, at, by);
export const closeTermStatement = (db: D1Database, id: string, den: string, at: string, by: string) => db.prepare(DK_DONG).bind(id, den, at, by);
export const beneficiaryRoles = async (db: D1Database): Promise<string[]> => (await db.prepare(VAI_HUONG).all<{ role_type_code: string }>()).results.map((r) => r.role_type_code);
export const openRolesOf = async (db: D1Database, partyId: string) => (await db.prepare(VAI_MO).bind(partyId).all<{ role_type_code: string; role_group: string }>()).results;
export const isBeneficiary = async (db: D1Database, partyId: string): Promise<boolean> => (await db.prepare(LA_HUONG).bind(partyId).first()) !== null;
export const groupsOf = async (db: D1Database, codes: readonly string[]): Promise<Map<string, string | null>> =>
  new Map((await db.prepare(NHOM_CUA).bind(JSON.stringify(codes)).all<{ catalog_code: string; group_code: string | null }>()).results.map((r) => [r.catalog_code, r.group_code]));
export const findBeneficiaries = async (db: D1Database, q: string) => (await db.prepare(TIM_HUONG).bind(q).all<{ id: string; display_name: string; party_kind: "PERSON" | "ORGANIZATION" }>()).results;
export const suppliers = async (db: D1Database) => (await db.prepare(NHA_CUNG_CAP).all<{ id: string; display_name: string }>()).results;
```

Tên cột của `v_pty_open_role`, `v_ctl_service_group` là đúng tên Task 1 tạo; lệch thì theo Task 1.

- [ ] **Step 11: Viết `src/modules/pricing/index.ts`.** Phần đầu và hàm công bố:

```ts
// Module pricing — bảng mức hoa hồng, điều khoản người bán (ADR-0077, ADR-0078 B1; đặc tả 2026-10-08 sổ đại lý đợt 1). Route: /api/pricing/*.
// Hàm công bố cho orders: docBangChoChup (đọc mọi thứ để chụp lúc Xác nhận / đổi bên đặt), laNguoiHuong (bên đặt tổ chức có được gắn vào đơn không).
import { auditStatement } from "../audit";
import { getEffectiveServices } from "../catalog";
import { ownerCompany, tenLoaiVai } from "../parties";
import type { CommissionRuleDto, CommissionRuleListResponse, NguoiHuongTimResponse, SupplyTermDto, SupplyTermListResponse, ThuTraResponse } from "../../shared/contracts";
import { error, json, readJson } from "../../shared/http";
import { can, holdsPartner } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { vnToday } from "../../shared/vn-date";
import { allRules, allTerms, beneficiaryRoles, closeRuleStatement, closeTermStatement, findBeneficiaries, groupsOf, insertRuleStatement, insertTermStatement, isBeneficiary,
  openRolesOf, ruleById, rulesOn, suppliers, termById, termsOn, type RuleRow, type TermRow } from "./repository";
import { chonMuc, hieuLuc, kiemNgayDong, kiemThanDieuKhoan, kiemThanMuc, moTaMuc, nguoiHuongCua, type DongDieuKhoan, type DongMuc, type NguoiHuong } from "./rules";

export { chupDon, soKhachTinhHoaHong, tinhDongDoiTac, type BanChup, type DongPhanDoiTac, type KieuMuc, type LyDoThieu, type NguoiHuong } from "./rules";

const dongMuc = (r: RuleRow): DongMuc => ({ id: r.id, targetPartyId: r.target_party_id, targetRoleCode: r.target_role_code, scope: r.scope, catalogCode: r.catalog_code,
  groupCode: r.group_code, kind: r.kind, rateBp: r.rate_bp, perPaxAmount: r.per_pax_amount, validFrom: r.valid_from_date, validTo: r.valid_to_date });
const dongDk = (r: TermRow): DongDieuKhoan => ({ id: r.id, scope: r.scope, catalogCode: r.catalog_code, groupCode: r.group_code, sellerPartyId: r.seller_party_id,
  supplierPartyId: r.supplier_party_id, costRateBp: r.cost_rate_bp, validFrom: r.valid_from_date, validTo: r.valid_to_date });

export interface DuLieuChup { nguoiHuong: NguoiHuong; muc: DongMuc[]; dieuKhoan: DongDieuKhoan[]; nhom: ReadonlyMap<string, string | null> }
/** Đọc MỘT lần mọi thứ để chụp một đơn ở `ngay` (đặc tả §5): vai của bên đặt, mức và điều khoản hiệu lực ở `ngay`, nhóm hiện hành của các mã. */
export async function docBangChoChup(db: D1Database, v: { bookerPartyId: string | null; catalogCodes: readonly string[]; ngay: string }): Promise<DuLieuChup> {
  const [vai, duocHuong, cty, muc, dk, nhom] = await Promise.all([
    v.bookerPartyId ? openRolesOf(db, v.bookerPartyId) : Promise.resolve([]), beneficiaryRoles(db), ownerCompany(db), rulesOn(db, v.ngay), termsOn(db, v.ngay), groupsOf(db, v.catalogCodes),
  ]);
  const nguoiHuong = nguoiHuongCua({ bookerPartyId: v.bookerPartyId, vaiMo: vai.map((r) => ({ roleTypeCode: r.role_type_code, roleGroup: r.role_group })), vaiDuocHuong: new Set(duocHuong), congTyChuId: cty?.partyId ?? null });
  return { nguoiHuong, muc: muc.map(dongMuc), dieuKhoan: dk.map(dongDk), nhom };
}
export const laNguoiHuong = (db: D1Database, partyId: string): Promise<boolean> => isBeneficiary(db, partyId);

/** Lỗi trigger của prc_* → câu tiếng Việt; không khớp → null (ném lại). */
function loiBang(e: unknown): Response | null {
  const m = e instanceof Error ? e.message : String(e);
  if (/\bprc_overlap:/.test(m)) return error(409, "prc_overlap", "Đã có mức / điều khoản cùng đối tượng, cùng phạm vi trong khoảng ngày này — đóng dòng cũ trước.");
  if (/\bprc_target_not_beneficiary:/.test(m)) return error(400, "invalid_input", "Hồ sơ này không mang vai được hưởng hoa hồng.");
  if (/\bprc_role_not_beneficiary:/.test(m)) return error(400, "invalid_input", "Loại đối tác này không nằm trong danh sách được hưởng hoa hồng.");
  if (/\bprc_seller_not_supplier:/.test(m)) return error(400, "invalid_input", "Người bán phải là Tour Đảo hoặc hồ sơ mang vai Nhà cung cấp.");
  if (/\bprc_supplier_mismatch:/.test(m)) return error(400, "invalid_input", "Tour Đảo bán thì không ghi tỷ lệ mua lại; nhà cung cấp bán thì phải ghi.");
  if (/\bprc_all_owner_only:/.test(m)) return error(400, "invalid_input", "Dòng \"mọi dịch vụ\" chỉ dành cho Tour Đảo.");
  if (/\bprc_transfer_no_supplier:/.test(m)) return error(409, "prc_transfer_no_supplier", "Dịch vụ nhóm Thuê xe không ghi nhà cung cấp mua lại (để khỏi tính tiền xe hai lần).");
  if (/\bprc_append_only:/.test(m)) return error(409, "stale", "Dòng này vừa được người khác đóng — tải lại.");
  if (/FOREIGN KEY constraint failed/.test(m)) return error(400, "invalid_input", "Nhóm dịch vụ hoặc hồ sơ không có.");
  return null;
}
async function chayLo(db: D1Database, lo: D1PreparedStatement[]): Promise<D1Result[] | Response> {
  try { return await db.batch(lo); } catch (e) { const r = loiBang(e); if (r) return r; throw e; }
}
const FORBIDDEN = () => error(403, "forbidden", "Bạn không có quyền với bảng mức này.");
```

Tám route (đặt đường cố định TRƯỚC đường có `:id`; mọi route hỏi `can()` ở dòng đầu thân):

1. `GET /api/pricing/hoa-hong` (`office`) — `if (!can(staff, "partner.commission.view")) return FORBIDDEN();` → `allRules` + `beneficiaryRoles` + `tenLoaiVai`; DTO `CommissionRuleDto` (`conHieuLuc = hieuLuc(dong, vnToday(new Date()))`; tên đối tượng: vai ⇒ tên vai, đối tác ⇒ `target_name`); `vai` = các vai được hưởng kèm tên.
2. `POST /api/pricing/hoa-hong` (`office`) — `can(staff, "partner.commission.write")` → `kiemThanMuc` (400 câu của nó) → phạm vi `SERVICE` thì mã phải có trong danh mục (`(await getEffectiveServices(env.DB, [code])).has(code)`, không thì 400 "Không có dịch vụ này trong danh mục.") → `const at = new Date().toISOString(); const id = crypto.randomUUID();` → `chayLo(env.DB, [insertRuleStatement(env.DB, id, v, at, staff.id), auditStatement(env.DB, { staffId: staff.id, action: "prc_commission_rule_added", at, detail: moTaMuc({ doiTuong: …, …v }) })])` → `Response` thì trả luôn → 201 `{ dong }` (DTO đọc lại bằng `ruleById`) với header `Location: /hoa-hong` (dùng hàm `kemLocation` của `src/shared/http.ts` như route tạo khác).
3. `POST /api/pricing/hoa-hong/:id/dong` (`office`) — `can(staff, "partner.commission.write")` → `ruleById` (404 "Không tìm thấy dòng mức.") → `kiemNgayDong(await readJson(request), row.valid_from_date)` (400) → lô `[closeRuleStatement(...), auditStatement(env.DB, { staffId, action: "prc_commission_rule_closed", at, detail: moTaMuc(...) + " · đến " + denNgay }, "changes() > 0")]`; `results[0].meta.changes === 0` ⇒ 409 `stale` "Dòng mức vừa được đóng — tải lại." → 200 `{ dong }`.
4. `GET /api/pricing/thu-tra` (`office`) — `can(staff, "partner.commission.view")`; tham số `doiTac` (id hồ sơ, `PARTY_RE`), `dichVu` (mã, `MA_RE`), `ngay` (mặc định `vnToday`); sai dạng ⇒ 400 → `docBangChoChup(env.DB, { bookerPartyId: doiTac, catalogCodes: [dichVu], ngay })` → `chonMuc({ nguoiHuong: bang.nguoiHuong, ngay, catalogCode: dichVu, groupCode: bang.nhom.get(dichVu) ?? null, dong: bang.muc })` (tham số tên `dong` — chữ ký Task 2) → `ThuTraResponse` (mức thắng dựng lại thành `CommissionRuleDto` bằng `ruleById`).
5. `GET /api/pricing/cung-ung` (`office`) — `can(staff, "supply.terms.view")` → `allTerms` + `suppliers` + `ownerCompany`; `laCongTy = seller_party_id === congTyChu.partyId`.
6. `POST /api/pricing/cung-ung` (`office`) — `can(staff, "supply.terms.write")` → `kiemThanDieuKhoan` → `const cty = await ownerCompany(env.DB)` (null ⇒ 503 "Chưa có hồ sơ công ty chủ — báo người phụ trách hệ thống.") → `supplierPartyId = v.sellerPartyId === cty.partyId ? null : v.sellerPartyId` (trigger kiểm vai `SUPPLIER` và tỷ lệ) → phạm vi `SERVICE` kiểm mã trong danh mục → lô `[insertTermStatement, auditStatement(… "prc_supply_term_added" …)]` qua `chayLo` → 201 `{ dong }`, `Location: /nguoi-ban`.
7. `POST /api/pricing/cung-ung/:id/dong` (`office`) — `can(staff, "supply.terms.write")`; khuôn bước 3 với `termById`, `closeTermStatement`, nhật ký `prc_supply_term_closed`. Dòng gieo sẵn `prc-st-goc-all` đóng được (giao diện có hộp xác nhận).
8. `GET /api/pricing/nguoi-huong` (`orders`) — `if (!can(staff, "order.create") || holdsPartner(staff)) return FORBIDDEN();` → `q` cắt khoảng trắng, tối đa 60 ký tự → `findBeneficiaries` → `NguoiHuongTimResponse` (chỉ id, tên, loại; không SĐT).

Đăng ký: `pricingModule` vào mảng `modules` của `src/index.ts` (sau `billingModule`). `src/architecture.test.ts`: `STRICT` thêm `{ module: "pricing", file: "modules/pricing/repository.ts" }` (sửa chú thích ở `ALLOWED_EDGES.pricing` thành "ADR-0077 — tạo ở sổ đại lý đợt 1"). Bốn hành động nhật ký vào `AUDIT_ACTIONS` nhóm `ledger` (`src/shared/audit-actions.ts`).

- [ ] **Step 12: Số đếm route.** `src/route-access.test.ts`: thêm tám dòng SNAPSHOT (đúng khuôn dòng hiện có: phương thức, đường, cổng) và nâng 256 → 264; `src/lan-gui-phu-route.test.ts`: 153 → 157, nối chú thích "; sổ đại lý đợt 1 (ADR-0077/0078): +4 POST /api/pricing/{hoa-hong, hoa-hong/:id/dong, cung-ung, cung-ung/:id/dong} = 157".

- [ ] **Step 13: Sinh lại kho trợ lý.** `npm run build:web` (sinh `src/shared/tro-ly-cau-truc.ts`).

- [ ] **Step 14: Xanh.** `node --test src/modules/pricing/*.test.ts src/shared/permissions.test.ts` rồi `npm run typecheck && npm test`.

- [ ] **Step 15: P16.** (a) Xoá dòng `can(staff, "supply.terms.view")` khỏi `GET /api/pricing/cung-ung` → bài "Bán hàng không xem được" đỏ VÀ `src/route-write-guard.test.ts` đỏ → hoàn nguyên. (b) Đổi ô `supply.terms.view` cột SALES thành `any` → bài khoá bảng `ADR` đỏ → hoàn nguyên. Ghi sổ thi công.

- [ ] **Step 16: Commit.**

```bash
git add src/modules/pricing src/modules/parties src/shared src/index.ts src/architecture.test.ts src/route-access.test.ts src/lan-gui-phu-route.test.ts docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md
git commit -m "Module pricing: bảng mức hoa hồng, người bán dịch vụ, thử tra, tìm người hưởng" -m "Kế toán / Quản trị / Toàn quyền đặt mức theo loại đối tác hoặc đối tác cụ thể, theo dịch vụ / nhóm / mọi dịch vụ, chỉ thêm và đóng (không sửa, không xoá). Bốn ô quyền mới đi cùng route hỏi chúng; lỗi trigger dịch sang câu tiếng Việt." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Chụp mức vào đơn trong lô Xác nhận

**Files:**
- Create: `src/modules/orders/thuong-mai-repo.ts` (nửa nghiêm), `src/modules/orders/thuong-mai.ts`, `src/modules/orders/thuong-mai.test.ts`, `src/modules/orders/chup-xac-nhan.test.ts`
- Modify: `src/modules/orders/repository.ts` (`confirmOrder`), `src/modules/orders/index.ts` (route xác nhận), `src/architecture.test.ts` (`NUA_NGHIEM`), `src/shared/audit-actions.ts`

**Interfaces:**
- Consumes: `docBangChoChup`, `chupDon`, `BanChup`, `LyDoThieu` (Task 3 tái xuất từ `pricing/index.ts`); `findOrder` (orders) trả `OrderDetailDto` có `bookerPartyId`, `services[]` (`id`, `catalogCode`).
- Produces:
  - `thuong-mai.ts`: `interface DongGhiChup` (đủ cột bảng), `dongGhiTuChup(c: BanChup, v: { id; orderId; ngay; at; by; source: "AUTO" | "MANUAL"; reason: string | null; supersedesId: string | null }): DongGhiChup`, `interface TermRowDb`, `banChupTuDb(r: TermRowDb): BanChup`, `moTaChup(chup: readonly BanChup[]): string`.
  - `thuong-mai-repo.ts`: `cauChupChuoi(db, rows: readonly DongGhiChup[]): D1PreparedStatement[]` (mỗi câu `INSERT … SELECT … WHERE changes() > 0`), `cauGhiTay(db, row: DongGhiChup): D1PreparedStatement` (gác đơn đã xác nhận, chưa giao), `banChupHienHanh(db, orderId): Promise<TermRowDb[]>`, `demBanChup(db, orderId): Promise<number>`.
  - `confirmOrder(db, id, staffId, today, prevUpdatedAt, nguongMoc, detail?, alsoConfirm?: (at: string) => D1PreparedStatement[])`.
  - Hành động nhật ký `order_terms_captured` ("Chụp mức hoa hồng lúc xác nhận", nhóm `order`).

- [ ] **Step 1: Bài đỏ thuần** `src/modules/orders/thuong-mai.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { banChupTuDb, dongGhiTuChup, moTaChup } from "./thuong-mai.ts";

const set = { serviceId: "s1", beneficiaryPartyId: "dla", hoaHong: { status: "SET" as const, kind: "RATE" as const, rateBp: 1000, perPax: null, ruleId: "m1" },
  cungUng: { status: "SET" as const, termId: "d1", sellerPartyId: "ct", supplierPartyId: null, costRateBp: null } };
const thieu = { serviceId: "s2", beneficiaryPartyId: "dla", hoaHong: { status: "MISSING" as const, reason: "MANUAL_LINE" as const }, cungUng: { status: "MISSING" as const } };

test("dongGhiTuChup ↔ banChupTuDb: đi rồi về giữ nguyên bản chụp", () => {
  const v = { id: "t1", orderId: "o1", ngay: "2026-10-10", at: "2026-10-10T01:00:00.000Z", by: "kt", source: "AUTO" as const, reason: null, supersedesId: null };
  for (const c of [set, thieu]) {
    const d = dongGhiTuChup(c, v);
    const db = { id: d.id, order_service_id: d.serviceId, beneficiary_party_id: d.beneficiaryPartyId, commission_status: d.commissionStatus, missing_reason: d.missingReason,
      commission_kind: d.commissionKind, commission_rate_bp: d.rateBp, commission_per_pax: d.perPax, commission_rule_id: d.ruleId, supply_status: d.supplyStatus,
      seller_party_id: d.sellerPartyId, supplier_party_id: d.supplierPartyId, cost_rate_bp: d.costRateBp, supply_term_id: d.termId, source: d.source, captured_date: d.capturedDate };
    assert.deepEqual(banChupTuDb(db), c);
  }
});

test("moTaChup: đếm dòng, không tỷ lệ, không tiền", () => {
  assert.equal(moTaChup([set, thieu]), "2 dòng: 1 có mức, 1 thiếu mức");
  assert.equal(moTaChup([{ ...set, hoaHong: { status: "NONE" as const } }]), "không người hưởng");
  assert.doesNotMatch(moTaChup([set, thieu]), /%|đ/);
});
```

- [ ] **Step 2: Bài đỏ route** `src/modules/orders/chup-xac-nhan.test.ts`:

```ts
// Chụp mức trong lô Xác nhận (đặc tả §5, §12 tiêu chí 3; Review Focus 1, 5). Route thật qua khung thử.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const AT = "2026-10-01T00:00:00.000Z";
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-dla', 'ORGANIZATION', 'Đại lý A', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-dla', 'pty-dla', 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(AT, AT);
  return w;
}
/** Đơn NHÁP của SALES, bên đặt `booker`, các dịch vụ [mã | null (nhập tay), thành tiền]. */
function nhap(w: W, booker: string | null, dv: [string | null, number][]): string {
  const id = uuid();
  const tong = dv.reduce((s, [, t]) => s + t, 0);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, SALES, tong, tong, tong, booker, AT, AT);
  dv.forEach(([code, t], i) => {
    const s = `${id}-s${i}`;
    w.sqlite.prepare(`INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult) VALUES (?, ?, ?, ?, ?, ?, 1)`).run(s, id, i, code, `DV ${i}`, code ? "perPax" : "manual");
    w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, ?, ?, 'Người lớn', 1, ?, ?, ?)`)
      .run(`${s}-i`, id, s, code, code ? "adult" : null, t, code ? t : null, t);
  });
  return id;
}
const xacNhan = (w: W, id: string, as = SALES) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
const muc = (w: W, body: Record<string, unknown>) => w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", ...body } });
const chup = (w: W, id: string) => w.q("SELECT * FROM ord_service_terms WHERE order_id = ? ORDER BY order_service_id", id);
/** Chạy `truoc()` đúng một lần ngay trước lô đầu tiên có câu khớp `re` (mô phỏng "người khác ghi giữa lúc route đọc và lúc route ghi"). */
function chenTruocLo(w: W, re: RegExp, truoc: () => void): void {
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => re.test(s.sql))) { w.env.DB.batch = goc; truoc(); }
    return goc(stmts);
  };
}

test("xác nhận đơn đại lý ⇒ mọi dòng có bản chụp AUTO cùng lô; nhật ký order_terms_captured một dòng", async () => {
  const w = setup();
  await muc(w, { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 });
  const id = nhap(w, "pty-dla", [["HONTAM", 2_000_000], [null, 300_000]]);
  const r = await xacNhan(w, id);
  assert.equal(r.status, 200, r.text);
  const ds = chup(w, id);
  assert.equal(ds.length, 2);
  assert.equal(ds[0].commission_status, "SET");
  assert.equal(ds[0].commission_rate_bp, 1000);
  assert.equal(ds[0].source, "AUTO");
  assert.equal(ds[1].commission_status, "MISSING");
  assert.equal(ds[1].missing_reason, "MANUAL_LINE");
  assert.equal(ds[1].supply_status, "MISSING", "dòng nhập tay: người bán thiếu (A-14)");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'order_terms_captured'", id)[0].n), 1);
});

test("đơn khách lẻ (bên đặt trống) ⇒ bản chụp NONE, người bán = công ty", async () => {
  const w = setup();
  const id = nhap(w, null, [["HONTAM", 1_000_000]]);
  assert.equal((await xacNhan(w, id)).status, 200);
  const [c] = chup(w, id);
  assert.equal(c.commission_status, "NONE");
  assert.equal(c.supply_status, "SET");
  assert.equal(c.supplier_party_id, null);
});

test("câu chụp hỏng ⇒ cả lô rơi: đơn vẫn nháp, không nhật ký confirmed, không bản chụp (tiêu chí 3)", async () => {
  const w = setup();
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000]]);
  w.sqlite.exec(`CREATE TRIGGER hong_cu_y BEFORE INSERT ON ord_service_terms WHEN NEW.order_id = '${id}' BEGIN SELECT RAISE(ABORT, 'hong_cu_y'); END;`);
  const r = await xacNhan(w, id);
  assert.notEqual(r.status, 200);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "draft");
  assert.equal(Number(w.q("SELECT count(*) AS n FROM audit_log WHERE order_id = ? AND action = 'confirmed'", id)[0].n), 0);
  assert.equal(chup(w, id).length, 0);
});

test("Review Focus 5: dòng mức bị đóng giữa lúc đọc và lúc ghi ⇒ 409 'Bảng mức vừa đổi — thử lại', đơn vẫn nháp", async () => {
  const w = setup();
  const m = (await muc(w, { doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 })).json.dong.id;
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000]]);
  chenTruocLo(w, /INSERT INTO ord_service_terms/, () => w.sqlite.prepare("UPDATE prc_commission_rule SET valid_to_date = '2026-01-02' WHERE id = ?").run(m));
  const r = await xacNhan(w, id);
  assert.equal(r.status, 409, r.text);
  assert.match(r.json.error.message, /Bảng mức vừa đổi — thử lại/);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "draft");
});

test("Review Focus 1: hai người bấm Xác nhận cùng lúc ⇒ một 200, một 409, không 500, đúng một bộ bản chụp", async () => {
  const w = setup();
  const id = nhap(w, "pty-dla", [["HONTAM", 1_000_000]]);
  const [a, b] = await Promise.all([xacNhan(w, id), xacNhan(w, id)]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(chup(w, id).length, 1);
});
```

Ghi chú: (1) cột `orders`, `order_service`, `order_item` theo khuôn `src/modules/billing/ma-giao-dich-route.test.ts`; thiếu cột thì bổ sung theo `PRAGMA table_info` — không nới mã. (2) Ca "đóng giữa chừng" dùng `chenTruocLo`, nên ngày đóng `2026-01-02` hợp lệ với trigger `close_only` (≥ ngày bắt đầu `2026-01-01`) và làm dòng mức hết hiệu lực ở ngày xác nhận (hôm nay) ⇒ câu chụp gặp `terms_rule_stale`. (3) Khung thử chạy SQLite đồng bộ; hai lời gọi `Promise.all` đan nhau ở các chỗ `await` — lệnh sau thấy đơn đã `confirmed` ở câu `UPDATE orders` (0 dòng) ⇒ 409 cũ của route. Nếu người sau trả mã khác 409 (vd 400 "đơn không còn nháp" ở bước kiểm trước lô) thì giữ mã route hiện có và sửa bài cho khớp, ghi ruling — mục tiêu là "không 500, một bộ bản chụp".

- [ ] **Step 3: Đỏ** `node --test src/modules/orders/thuong-mai.test.ts src/modules/orders/chup-xac-nhan.test.ts` — FAIL.

- [ ] **Step 4: `thuong-mai.ts`** (thuần, không SQL):

```ts
// Ánh xạ bản chụp thương mại ↔ dòng bảng ord_service_terms (đặc tả §5). Thuần — câu SQL ở thuong-mai-repo.ts.
import type { BanChup, LyDoThieu } from "../pricing";

export interface DongGhiChup {
  id: string; orderId: string; serviceId: string; beneficiaryPartyId: string | null;
  commissionStatus: "NONE" | "SET" | "MISSING"; missingReason: LyDoThieu | null; commissionKind: "RATE" | "PER_PAX" | null; rateBp: number | null; perPax: number | null; ruleId: string | null;
  supplyStatus: "SET" | "MISSING"; sellerPartyId: string | null; supplierPartyId: string | null; costRateBp: number | null; termId: string | null;
  source: "AUTO" | "MANUAL"; reason: string | null; supersedesId: string | null; capturedDate: string; at: string; by: string;
}
export function dongGhiTuChup(c: BanChup, v: { id: string; orderId: string; ngay: string; at: string; by: string; source: "AUTO" | "MANUAL"; reason: string | null; supersedesId: string | null }): DongGhiChup {
  const h = c.hoaHong;
  const cu = c.cungUng;
  return {
    id: v.id, orderId: v.orderId, serviceId: c.serviceId, beneficiaryPartyId: c.beneficiaryPartyId,
    commissionStatus: h.status, missingReason: h.status === "MISSING" ? h.reason : null,
    commissionKind: h.status === "SET" ? h.kind : null, rateBp: h.status === "SET" ? h.rateBp : null, perPax: h.status === "SET" ? h.perPax : null, ruleId: h.status === "SET" ? h.ruleId : null,
    supplyStatus: cu.status, sellerPartyId: cu.status === "SET" ? cu.sellerPartyId : null, supplierPartyId: cu.status === "SET" ? cu.supplierPartyId : null,
    costRateBp: cu.status === "SET" ? cu.costRateBp : null, termId: cu.status === "SET" ? cu.termId : null,
    source: v.source, reason: v.reason, supersedesId: v.supersedesId, capturedDate: v.ngay, at: v.at, by: v.by,
  };
}
export interface TermRowDb {
  id: string; order_service_id: string; beneficiary_party_id: string | null; commission_status: "NONE" | "SET" | "MISSING"; missing_reason: LyDoThieu | null;
  commission_kind: "RATE" | "PER_PAX" | null; commission_rate_bp: number | null; commission_per_pax: number | null; commission_rule_id: string | null;
  supply_status: "SET" | "MISSING"; seller_party_id: string | null; supplier_party_id: string | null; cost_rate_bp: number | null; supply_term_id: string | null;
  source: "AUTO" | "MANUAL"; captured_date: string;
}
export function banChupTuDb(r: TermRowDb): BanChup {
  return {
    serviceId: r.order_service_id, beneficiaryPartyId: r.beneficiary_party_id,
    hoaHong: r.commission_status === "NONE" ? { status: "NONE" } : r.commission_status === "MISSING" ? { status: "MISSING", reason: r.missing_reason! }
      : { status: "SET", kind: r.commission_kind!, rateBp: r.commission_rate_bp, perPax: r.commission_per_pax, ruleId: r.commission_rule_id },
    cungUng: r.supply_status === "SET" ? { status: "SET", termId: r.supply_term_id, sellerPartyId: r.seller_party_id!, supplierPartyId: r.supplier_party_id, costRateBp: r.cost_rate_bp } : { status: "MISSING" },
  };
}
/** Mô tả bản chụp cho nhật ký: chỉ đếm dòng — không tỷ lệ, không tiền (nhật ký đơn đọc được ở nhiều nơi). */
export function moTaChup(chup: readonly BanChup[]): string {
  if (chup.every((c) => c.hoaHong.status === "NONE")) return "không người hưởng";
  const co = chup.filter((c) => c.hoaHong.status === "SET").length;
  return `${chup.length} dòng: ${co} có mức, ${chup.length - co} thiếu mức`;
}
```

Thứ tự trường và tên trường của `BanChup` là của Task 2 (nguồn); nếu Task 2 đặt khác (vd `cungUng.termId` vị trí khác) thì `deepEqual` vẫn đúng vì so theo khoá.

- [ ] **Step 5: `thuong-mai-repo.ts`** (nửa nghiêm — mọi câu qua `defineSql`, chỉ chạm `ord_service_terms` và đọc `orders`):

```ts
// SQL bản chụp thương mại (ord_service_terms — đặc tả §5). Tệp NỬA NGHIÊM của orders (src/architecture.test.ts NUA_NGHIEM): defineSql + EXPLAIN.
// Câu chụp trong lô gác bằng CHUỖI changes() > 0 (CHANGE-GUIDE f) — không đọc audit_log, không so updated_at.
import { defineSql } from "../../shared/sql-registry.ts";
import type { DongGhiChup, TermRowDb } from "./thuong-mai.ts";

const COT = `id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, commission_kind, commission_rate_bp, commission_per_pax, commission_rule_id,
  supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id, source, reason, supersedes_id, captured_date, created_at, created_by, updated_at, updated_by`;
const CHUP_CHUOI = defineSql("orders", "terms_insert_chain",
  `INSERT INTO ord_service_terms (${COT}) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?20, ?21 WHERE changes() > 0`);
const GHI_TAY = defineSql("orders", "terms_insert_manual",
  `INSERT INTO ord_service_terms (${COT}) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?20, ?21
   WHERE EXISTS (SELECT 1 FROM orders o WHERE o.id = ?2 AND o.status = 'confirmed' AND o.delivered_at IS NULL)`);
const HIEN_HANH = defineSql("orders", "terms_current",
  `SELECT t.id, t.order_service_id, t.beneficiary_party_id, t.commission_status, t.missing_reason, t.commission_kind, t.commission_rate_bp, t.commission_per_pax, t.commission_rule_id,
     t.supply_status, t.seller_party_id, t.supplier_party_id, t.cost_rate_bp, t.supply_term_id, t.source, t.captured_date
   FROM ord_service_terms t WHERE t.order_id = ?1 AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)`);
const DEM = defineSql("orders", "terms_count", "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?1");

const bindDong = (st: D1PreparedStatement, d: DongGhiChup) => st.bind(d.id, d.orderId, d.serviceId, d.beneficiaryPartyId, d.commissionStatus, d.missingReason, d.commissionKind, d.rateBp, d.perPax,
  d.ruleId, d.supplyStatus, d.sellerPartyId, d.supplierPartyId, d.costRateBp, d.termId, d.source, d.reason, d.supersedesId, d.capturedDate, d.at, d.by);
export const cauChupChuoi = (db: D1Database, rows: readonly DongGhiChup[]): D1PreparedStatement[] => rows.map((d) => bindDong(db.prepare(CHUP_CHUOI), d));
export const cauGhiTay = (db: D1Database, d: DongGhiChup): D1PreparedStatement => bindDong(db.prepare(GHI_TAY), d);
export const banChupHienHanh = async (db: D1Database, orderId: string): Promise<TermRowDb[]> => (await db.prepare(HIEN_HANH).bind(orderId).all<TermRowDb>()).results;
export const demBanChup = async (db: D1Database, orderId: string): Promise<number> => Number((await db.prepare(DEM).bind(orderId).first<{ n: number }>())?.n ?? 0);
```

Tên cột phải khớp đúng bảng `ord_service_terms` của Task 1 (đọc lại migration; lệch thì sửa ở đây, không sửa migration đã qua kiểm). Thêm vào `NUA_NGHIEM` của `src/architecture.test.ts`: `{ module: "orders", file: "modules/orders/thuong-mai-repo.ts" }` kèm chú thích "Sổ đại lý đợt 1 (ADR-0077 điều 8 — đặc tả §5 cho phép): SQL bản chụp thương mại, mọi câu qua defineSql + EXPLAIN".

- [ ] **Step 6: `confirmOrder` nhận câu kèm** (`src/modules/orders/repository.ts`): thêm tham số cuối `alsoConfirm?: (at: string) => D1PreparedStatement[]` và trải `...(alsoConfirm?.(at) ?? [])` vào CUỐI mảng lô (sau câu nhật ký `confirmed`). Chú thích: "Câu kèm (bản chụp thương mại — ADR-0077) đứng SAU nhật ký confirmed: chuỗi changes() > 0 nối từ UPDATE orders → nhật ký → từng câu chụp; results[1] vẫn quyết định thắng thua." Nếu câu cuối hiện có của lô KHÔNG phải nhật ký `confirmed` có `changes() > 0` thì dừng, đọc lô, chèn câu kèm ngay sau câu nhật ký đó và ghi ruling.

- [ ] **Step 7: Route xác nhận** (`src/modules/orders/index.ts`, nhánh `confirmed`, ngay trước `confirmOrder`; import `docBangChoChup`, `chupDon` từ `../pricing`, `cauChupChuoi` từ `./thuong-mai-repo`, `dongGhiTuChup`, `moTaChup` từ `./thuong-mai`):

```ts
      // Sổ đại lý đợt 1 (ADR-0077 điều 8; đặc tả §5): đọc bảng ở ngày xác nhận rồi gửi các câu chụp trong CÙNG lô. Đơn đang nháp nên
      // dịch vụ đọc từ `order` là số hiện hành (chưa có dòng điều chỉnh). Câu chụp lỗi ⇒ cả lô rơi (đơn vẫn nháp).
      const bang = order ? await docBangChoChup(env.DB, { bookerPartyId: order.bookerPartyId, catalogCodes: order.services.flatMap((s) => (s.catalogCode ? [s.catalogCode] : [])), ngay: today }) : null;
      const chup = order && bang ? chupDon({
        nguoiHuong: bang.nguoiHuong, ngay: today, muc: bang.muc, dieuKhoan: bang.dieuKhoan,
        dong: order.services.map((s) => ({ serviceId: s.id, catalogCode: s.catalogCode, groupCode: s.catalogCode ? (bang.nhom.get(s.catalogCode) ?? null) : null })),
      }) : [];
      const kemChup = (at: string): D1PreparedStatement[] => [
        ...cauChupChuoi(env.DB, chup.map((c) => dongGhiTuChup(c, { id: crypto.randomUUID(), orderId: id, ngay: today, at, by: staff.id, source: "AUTO", reason: null, supersedesId: null }))),
        auditStatement(env.DB, { orderId: id, staffId: staff.id, action: "order_terms_captured", at, detail: moTaChup(chup) }, "changes() > 0"),
      ];
```

Tên tham số của `chupDon` (`nguoiHuong`, `ngay`, `muc`, `dieuKhoan`, `dong`) là của Task 2; lệch thì theo Task 2. Gọi `confirmOrder(…, detail, kemChup)`; trong `catch` hiện có của route thêm trước `throw e`:

```ts
        if (/\bterms_(rule|term)_stale:/.test(e instanceof Error ? e.message : String(e))) return error(409, "bang_muc_doi", "Bảng mức vừa đổi — thử lại");
```

Hành động `order_terms_captured` vào `AUDIT_ACTIONS` nhóm `order`, nhãn "Chụp mức hoa hồng lúc xác nhận".

- [ ] **Step 8: Xanh.** `node --test src/modules/orders/thuong-mai.test.ts src/modules/orders/chup-xac-nhan.test.ts` rồi `npm run typecheck && npm test`. Bài cũ đếm đúng số câu trong lô xác nhận (`grep -rln "confirmOrder\|thu-tu-lo" src/*.test.ts src/modules/orders/*.test.ts`) thì cập nhật có chủ đích (đơn khách lẻ giờ thêm một câu chụp + một nhật ký) và ghi sổ.

- [ ] **Step 9: P16.** (a) Đưa câu chụp lên TRƯỚC nhật ký `confirmed` trong `confirmOrder` → ca "câu chụp hỏng" hoặc "hai người bấm" đỏ → hoàn nguyên. (b) Bỏ `WHERE changes() > 0` khỏi `terms_insert_chain` → ca "hai người bấm" đỏ (500 / hai bộ) → hoàn nguyên. Ghi sổ.

- [ ] **Step 10: Commit.**

```bash
git add src/modules/orders src/architecture.test.ts src/shared/audit-actions.ts docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md
git commit -m "Chụp mức hoa hồng và người bán vào đơn trong lô Xác nhận" -m "Bản chụp đi cùng lô với câu xác nhận, gác bằng chuỗi changes() để lệnh thua không ghi gì và câu chụp hỏng thì đơn vẫn nháp. Bảng mức đổi giữa lúc đọc và lúc ghi ⇒ 409 'Bảng mức vừa đổi — thử lại' (trigger terms_rule_stale)." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Phần thương mại của đơn: đọc hai DTO, ghi mức tay, hai ô quyền, lọc lịch sử

**Files:**
- Create: `src/shared/so-dai-ly-nhan.ts` (+ `.test.ts`), `src/modules/orders/thuong-mai-route.test.ts`, `src/so-la-doi-tac.test.ts`
- Modify: `src/modules/orders/thuong-mai.ts` (+ `thuong-mai.test.ts`), `src/modules/orders/thuong-mai-repo.ts` (câu tên nhãn), `src/modules/orders/index.ts`, `src/modules/pricing/index.ts` (bỏ bảng tạm câu lý do, dùng `NHAN_LY_DO_THIEU`), `src/shared/contracts.ts`, `src/shared/permissions.ts` (+ test), `src/shared/audit-actions.ts`, `src/shared/tro-ly-cau-truc-ten.ts` (+ sinh), `src/route-access.test.ts` (264 → 266), `src/lan-gui-phu-route.test.ts` (157 → 158)

**Interfaces:**
- Consumes: Task 3 (`docBangChoChup`, `chupDon`, `tinhDongDoiTac`, `soKhachTinhHoaHong`, `laNguoiHuong`), Task 4 (`banChupHienHanh`, `cauGhiTay`, `dongGhiTuChup`, `banChupTuDb`, `TermRowDb`); `loadOrderView` (DTO đơn hiện hành đã áp dòng điều chỉnh), `getMeta`, `holdsPartner`, `seesOnlyAssignedOrders`.
- Produces:
  - Ô `order.terms.view` = `row("any", "any", "any", "assigned", "own", "any", "own", "none", "none", "none")`, `order.terms.override` = `row("none", "any", "any", "none", "none", "any", "none", "none", "none", "none")`.
  - `contracts.ts`: `ThuongMaiDongVanPhong`, `ThuongMaiVanPhongDto`, `ThuongMaiDoiTacDto`, `ThuongMaiResponse = { vanPhong: ThuongMaiVanPhongDto } | { doiTac: ThuongMaiDoiTacDto }`.
  - `orders/index.ts`: hàm công bố `phanThuongMaiCuaDon(db, orderId): Promise<PhanThuongMai | null>` với `PhanThuongMai = { duKien: boolean; chuaChup: boolean; chup: BanChup[]; dichVu: { id: string; name: string; thanhTien: number; soKhachTinh: number }[]; ten: Map<string, string>; congTyChuId: string | null }` (đợt 2 billing dùng lại).
  - `so-dai-ly-nhan.ts`: `NHAN_LY_DO_THIEU`, `CAU_THIEU_MUC`, `nhanMuc({ kind, rateBp, perPax })` ("12,5%" / "50.000đ/khách"), `nhanTyLeBp(bp)`, `laDongThuongMai(action)`.
  - `thuong-mai.ts`: `dungThuongMai(v: { laDoiTac: boolean; xemNguoiBan: boolean } & PhanThuongMai): ThuongMaiResponse`, `kiemThanGhiTay(raw): Ket<ThanGhiTay>`, `moTaGhiTay(truoc: BanChup, sau: BanChup, tenDichVu: string): string`.
  - Hành động `order_terms_manual` ("Ghi mức hoa hồng tay", nhóm `order`).

- [ ] **Step 1: Bài đỏ nhãn** `src/shared/so-dai-ly-nhan.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { NHAN_LY_DO_THIEU, laDongThuongMai, nhanMuc, nhanTyLeBp } from "./so-dai-ly-nhan.ts";
test("nhãn tiếng Việt, không lộ mã thô", () => {
  assert.equal(nhanTyLeBp(1250), "12,5%");
  assert.equal(nhanTyLeBp(1000), "10%");
  assert.equal(nhanTyLeBp(1), "0,01%");
  assert.equal(nhanTyLeBp(0), "0%");
  assert.equal(nhanMuc({ kind: "PER_PAX", rateBp: null, perPax: 50_000 }), "50.000đ/khách");
  for (const v of Object.values(NHAN_LY_DO_THIEU)) assert.doesNotMatch(v, /[A-Z]{3,}/);
  assert.equal(NHAN_LY_DO_THIEU.NO_RULE, "Chưa có mức cho dịch vụ này");
});
test("laDongThuongMai: ba hành động order_terms_*", () => {
  for (const a of ["order_terms_captured", "order_terms_recaptured", "order_terms_manual"]) assert.ok(laDongThuongMai(a));
  assert.equal(laDongThuongMai("confirmed"), false);
});
```

`src/shared/so-dai-ly-nhan.ts`:

```ts
// Nhãn tiếng Việt của sổ đại lý (đặc tả §11: không lộ mã thô). Thuần, dùng ở máy chủ (DTO) và giao diện.
export const NHAN_LY_DO_THIEU = {
  NO_RULE: "Chưa có mức cho dịch vụ này",
  RULE_CONFLICT: "Hai mức khác nhau cùng áp — Kế toán chọn một",
  MANUAL_LINE: "Dòng nhập tay — Kế toán ghi mức",
  BOOKER_NOT_BENEFICIARY: "Bên đặt không thuộc loại được hưởng hoa hồng",
  NOT_CAPTURED: "Đơn xác nhận trước khi có bảng mức",
} as const;
export const CAU_THIEU_MUC = "Thiếu mức — Kế toán xử lý";
const nhanDong = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const nhanTyLeBp = (bp: number): string => {
  const nguyen = Math.floor(bp / 100);
  const le = String(bp % 100).padStart(2, "0").replace(/0+$/, "");
  return le ? `${nguyen},${le}%` : `${nguyen}%`;
};
export const nhanMuc = (m: { kind: "RATE" | "PER_PAX"; rateBp: number | null; perPax: number | null }): string =>
  m.kind === "RATE" ? nhanTyLeBp(m.rateBp ?? 0) : `${nhanDong(m.perPax ?? 0)}đ/khách`;
export const laDongThuongMai = (action: string): boolean => action.startsWith("order_terms_");
```

Sau đó `pricing/rules.ts` `moTaMuc` dùng `nhanTyLeBp`/`nhanMuc` thay hàm riêng (xoá `nhanBp`, `nhanDong` ở đó — một nguồn), và `pricing/index.ts` dùng `NHAN_LY_DO_THIEU` cho `ThuTraResponse.lyDo`.

- [ ] **Step 2: Bài đỏ DTO** (thêm vào `src/modules/orders/thuong-mai.test.ts`):

```ts
import { dungThuongMai, kiemThanGhiTay } from "./thuong-mai.ts";

const chupHai = [
  { serviceId: "s1", beneficiaryPartyId: "dla", hoaHong: { status: "SET" as const, kind: "RATE" as const, rateBp: 1200, perPax: null, ruleId: "m1" },
    cungUng: { status: "SET" as const, termId: "d1", sellerPartyId: "ct", supplierPartyId: null, costRateBp: null } },
  { serviceId: "s2", beneficiaryPartyId: "dla", hoaHong: { status: "MISSING" as const, reason: "NO_RULE" as const },
    cungUng: { status: "SET" as const, termId: "d2", sellerPartyId: "ncc", supplierPartyId: "ncc", costRateBp: 8000 } },
];
const dichVu = [{ id: "s1", name: "Vé Hòn Tằm", thanhTien: 2_000_000, soKhachTinh: 2 }, { id: "s2", name: "Tắm bùn", thanhTien: 300_000, soKhachTinh: 1 }];
const ten = new Map([["dla", "Đại lý A"], ["ct", "Tour Đảo"], ["ncc", "i-resort"]]);
const phan = { duKien: false, chuaChup: false, chup: chupHai, dichVu, ten, congTyChuId: "ct" };

test("DTO văn phòng: mức, hoa hồng, giá đại lý, cờ thiếu; khối nhà cung cấp chỉ khi xemNguoiBan; tổng null khi còn dòng thiếu", () => {
  const a = dungThuongMai({ laDoiTac: false, xemNguoiBan: true, ...phan });
  assert.ok("vanPhong" in a);
  const vp = a.vanPhong;
  assert.equal(vp.dong[0]!.hoaHong, 240_000);
  assert.equal(vp.dong[0]!.giaDaiLy, 1_760_000);
  assert.equal(vp.dong[0]!.muc, "12%");
  assert.equal(vp.dong[1]!.thieu, "Chưa có mức cho dịch vụ này");
  assert.equal(vp.dong[1]!.nhaCungCap?.giaVon, 240_000);
  assert.equal(vp.dong[1]!.nhaCungCap?.tyLeMua, "80%");
  assert.equal(vp.tong.hoaHong, null);
  const b = dungThuongMai({ laDoiTac: false, xemNguoiBan: false, ...phan });
  assert.ok("vanPhong" in b && b.vanPhong.dong[1]!.nhaCungCap === undefined);
});

test("DTO Đối tác: chỉ số tiền hoa hồng của mình; không khoá rate/perPax/cost/ruleId/termId/source/supplier/muc", () => {
  const a = dungThuongMai({ laDoiTac: true, xemNguoiBan: false, ...phan });
  assert.ok("doiTac" in a);
  const s = JSON.stringify(a);
  for (const k of ["rate", "perPax", "cost", "ruleId", "termId", "source", "supplier", "muc", "nhaCungCap", "1200", "8000"]) assert.doesNotMatch(s, new RegExp(k, "i"), k);
  assert.equal(a.doiTac.dong[0]!.hoaHong, 240_000);
  assert.equal(a.doiTac.dong[1]!.hoaHong, null);
  assert.equal(a.doiTac.choCongTyCaiMuc, true);
});

test("kiemThanGhiTay: lý do ≥ 10 ký tự; ít nhất một phần; số hợp lệ; không dãy số dài", () => {
  assert.equal(kiemThanGhiTay({ lyDo: "ngắn", hoaHong: { kieu: "RATE", tyLeBp: 1500 } }).ok, false);
  assert.equal(kiemThanGhiTay({ lyDo: "thoả thuận miệng với CTV Lan" }).ok, false, "không gửi phần nào");
  assert.ok(kiemThanGhiTay({ lyDo: "thoả thuận miệng với CTV Lan", hoaHong: { kieu: "RATE", tyLeBp: 1500 } }).ok);
  assert.ok(kiemThanGhiTay({ lyDo: "nhà cung cấp mới cho vé này", nguoiBan: { partyId: "ncc", tyLeMuaBp: 7500 } }).ok);
  assert.equal(kiemThanGhiTay({ lyDo: "gọi 0905123456 xác nhận", hoaHong: { kieu: "RATE", tyLeBp: 1500 } }).ok, false);
});
```

DTO (thêm vào `contracts.ts`):

```ts
export interface ThuongMaiDongVanPhong {
  serviceId: string; ten: string; thanhTien: number; soKhachTinh: number;
  /** "12%" / "50.000đ/khách"; null khi thiếu mức hoặc không người hưởng. */
  muc: string | null; hoaHong: number | null; giaDaiLy: number | null; ghiTay: boolean;
  /** Câu tiếng Việt khi thiếu mức; null khi đủ. Giao diện ghi thêm "Thiếu mức — Kế toán xử lý". */
  thieu: string | null;
  nguoiBan: { ten: string; laCongTy: boolean } | null;
  /** Chỉ khi người gọi có `supply.terms.view` VÀ người bán là nhà cung cấp. */
  nhaCungCap?: { tyLeMua: string; giaVon: number };
}
export interface ThuongMaiVanPhongDto {
  duKien: boolean; chuaChup: boolean; nguoiHuong: { ten: string } | null;
  dong: ThuongMaiDongVanPhong[]; tong: { thanhTien: number; hoaHong: number | null; giaDaiLy: number | null };
}
export interface ThuongMaiDoiTacDto {
  duKien: boolean; choCongTyCaiMuc: boolean;
  dong: { serviceId: string; ten: string; thanhTien: number; hoaHong: number | null; giaDaiLy: number | null }[];
  tong: { thanhTien: number; hoaHong: number | null; giaDaiLy: number | null };
}
export type ThuongMaiResponse = { vanPhong: ThuongMaiVanPhongDto } | { doiTac: ThuongMaiDoiTacDto };
```

Tổng `hoaHong` / `giaDaiLy` = null khi còn dòng thiếu mức (không cộng nửa vời). `chuaChup = true` cho đơn đã xác nhận mà không có bản chụp.

- [ ] **Step 3: Viết `dungThuongMai`, `kiemThanGhiTay`, `moTaGhiTay`** ở `src/modules/orders/thuong-mai.ts`. Tính tiền từng dòng bằng `tinhDongDoiTac` của pricing (Task 2 — một công thức; đặt `import { tinhDongDoiTac } from "../pricing"`); nhãn bằng `nhanMuc`, `nhanTyLeBp`, `NHAN_LY_DO_THIEU`. Hai nhánh dựng đối tượng MỚI bằng chép từng trường (danh sách trắng), không trải `...` từ kiểu rộng. Thân ghi tay: `{ lyDo: string; hoaHong?: { kieu: "RATE"; tyLeBp: number } | { kieu: "PER_PAX"; moiKhach: number }; nguoiBan?: { partyId: string; tyLeMuaBp?: number } }`; lý do ≥ 10 ký tự sau `trim`, ≤ 300, không dãy ≥ 8 chữ số (khuôn `docGhiChu` của Task 3). `moTaGhiTay(truoc, sau, tenDichVu)` = "Vé Hòn Tằm: thiếu mức → 15%" / "Vé Hòn Tằm: 10% → 15%" / "Vé Hòn Tằm: người bán Tour Đảo → i-resort" (dùng `nhanMuc`; nhật ký này bị lọc khỏi lịch sử của Đối tác ở Bước 6).

- [ ] **Step 4: Bài route đỏ** `src/modules/orders/thuong-mai-route.test.ts` (chép `setup`, `nhap`, `xacNhan`, `muc`, `chup`, `chenTruocLo` của `chup-xac-nhan.test.ts` vào đầu tệp; thêm tài khoản Đối tác `DT` gắn hồ sơ `pty-${DT}` mang `TRAVEL_AGENCY`, HDV `FIELD`, `DRIVER`, `DRIVER_PARTNER`, `HR`). Tám ca, mỗi ca một `test(...)`:
  1. Kế toán GET đơn đã xác nhận có dòng do nhà cung cấp bán (gieo điều khoản `IRESORT` 80% qua `POST /api/pricing/cung-ung` trước khi xác nhận) ⇒ 200 `vanPhong`, dòng đó có `nhaCungCap.tyLeMua === "80%"`; Bán hàng ⇒ 200 `vanPhong`, KHÔNG có `nhaCungCap`.
  2. Đơn nháp ⇒ 200, `duKien: true`; đếm `ord_service_terms` của đơn = 0 sau lời gọi.
  3. Đối tác GET đơn do chính tài khoản lập (gieo `orders.staff_id = DT`) ⇒ 200 `doiTac`; GET đơn của SALES ⇒ đúng mã mà `GET /api/orders/:id` trả cho Đối tác ở cùng tình huống (đọc route chi tiết đơn; hôm nay là 404).
  4. `DRIVER`, `DRIVER_PARTNER`, `HR` ⇒ 403.
  5. A-4: đơn bên đặt CTV (hồ sơ mang `COLLABORATOR`, không mức) xác nhận ⇒ dòng thiếu; Kế toán POST `{ lyDo: "thoả thuận miệng với CTV Lan", hoaHong: { kieu: "RATE", tyLeBp: 1500 } }` vào dịch vụ thành tiền 1.000.000 ⇒ 200; GET ⇒ `hoaHong === 150_000`; bản cũ còn, bản mới `source = 'MANUAL'`, `supersedes_id` = id bản cũ; nhật ký `order_terms_manual` một dòng.
  6. Thiếu lý do ⇒ 400; đơn nháp ⇒ 409; đơn đã giao (đặt `delivered_at` theo cột mà trigger `0044` đòi) ⇒ 409; Bán hàng, HDV, Đối tác ⇒ 403; đơn `confirmed` gieo thẳng bằng SQL không bản chụp ⇒ 409 câu "Đơn xác nhận trước khi có bảng mức — chờ chụp bù ở bản sau".
  7. Hai Kế toán ghi tay cùng dòng cùng lúc (`Promise.all`) ⇒ một 200, một 409, không 500.
  8. A-2: mức `PER_PAX` 50.000 cho `HOTEL_RECEPTION`, đơn 2 NL + 1 TE + 1 EB (khách tính 3) xác nhận ⇒ `hoaHong === 150_000`; thêm dòng điều chỉnh số khách thành 3 NL + 1 TE qua route điều chỉnh của orders đang có (`grep -n "adjust" src/modules/orders/index.ts`) ⇒ GET ⇒ `hoaHong === 200_000`, bản chụp không đổi (đếm dòng như trước).

- [ ] **Step 5: Route** (`src/modules/orders/index.ts`):

```ts
    // Sổ đại lý đợt 1 (ADR-0077 điều 10–11; đặc tả §6): phần thương mại của đơn. Đối tác (holdsPartner, kể cả tài khoản lai) nhận DTO hẹp (C9 = A).
    route("GET", "/api/orders/:id/thuong-mai", "orders", async ({ env, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      const scope = { ownerId: meta.staffId, assigned };
      if (!can(staff, "order.view", scope)) return seesOnlyAssignedOrders(staff) ? NOT_FOUND() : FORBIDDEN();
      if (!can(staff, "order.terms.view", scope)) return FORBIDDEN_VIEW();
      const phan = await phanThuongMaiCuaDon(env.DB, id);
      if (!phan) return NOT_FOUND();
      return json(dungThuongMai({ laDoiTac: holdsPartner(staff), xemNguoiBan: can(staff, "supply.terms.view"), ...phan }) satisfies ThuongMaiResponse);
    }),
```

Tên hằng `UUID_RE`, `NOT_FOUND`, `FORBIDDEN`, `FORBIDDEN_VIEW`, `getMeta`, `seesOnlyAssignedOrders` là tên đang dùng trong `orders/index.ts`; tên nào khác thì dùng đúng tên trong tệp (route `GET /api/orders/:id` là khuôn).

`phanThuongMaiCuaDon(db, orderId)` (hàm công bố cuối `orders/index.ts`): `loadOrderView` (DTO HIỆN HÀNH) → đơn `cancelled` ⇒ null; `banChupHienHanh`; đơn `confirmed` có bản chụp ⇒ `chup = rows.map(banChupTuDb)`; đơn `draft` ⇒ `docBangChoChup(… ngay: vnToday(new Date()))` + `chupDon` (`duKien: true`, không ghi); đơn `confirmed` không bản chụp ⇒ `chuaChup: true`, mọi dòng `{ hoaHong: { status: "MISSING", reason: "NOT_CAPTURED" }, cungUng: { status: "MISSING" } }`. Thành tiền dòng = tổng `items[].lineTotal`; số khách = `soKhachTinhHoaHong({ unit, pax, items })` (chữ ký của Task 2). Tên người hưởng / người bán: câu mới `party_labels` ở `thuong-mai-repo.ts` (`SELECT id, display_name FROM v_pty_party_label WHERE id IN (SELECT value FROM json_each(?1))`, `defineSql`). `congTyChuId` từ `ownerCompany` (orders → parties đã có cạnh).

Route ghi tay:

```ts
    route("POST", "/api/orders/:id/thuong-mai/:serviceId", "office", async ({ env, request, params, staff, baoThayDoi }) => {
      if (!can(staff, "order.terms.override")) return FORBIDDEN();
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const than = kiemThanGhiTay(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (meta.status !== "confirmed") return error(409, "not_confirmed", "Chỉ ghi mức tay cho đơn đã xác nhận.");
      if (meta.deliveredAt) return error(409, "order_delivered", "Đơn đã Đã giao — không ghi mức tay.");
      const hienHanh = (await banChupHienHanh(env.DB, id)).find((r) => r.order_service_id === params.serviceId);
      if (!hienHanh) return error(409, "chua_chup", "Đơn xác nhận trước khi có bảng mức — chờ chụp bù ở bản sau");
      const truoc = banChupTuDb(hienHanh);
      const cty = await ownerCompany(env.DB);
      if (than.value.nguoiBan && than.value.nguoiBan.partyId !== cty?.partyId && !(await laNhaCungCap(env.DB, than.value.nguoiBan.partyId)))
        return error(400, "invalid_input", "Người bán phải là Tour Đảo hoặc hồ sơ mang vai Nhà cung cấp.");
      const sau = apGhiTay(truoc, than.value, cty?.partyId ?? null);
      const at = new Date().toISOString();
      const dong = dongGhiTuChup(sau, { id: crypto.randomUUID(), orderId: id, ngay: vnToday(new Date()), at, by: staff.id, source: "MANUAL", reason: than.value.lyDo, supersedesId: hienHanh.id });
      const tenDv = (await loadOrderView(env.DB, id))?.services.find((s) => s.id === params.serviceId)?.name ?? "";
      let kq: D1Result[];
      try {
        kq = await env.DB.batch([cauGhiTay(env.DB, dong), auditStatement(env.DB, { orderId: id, staffId: staff.id, action: "order_terms_manual", at, detail: moTaGhiTay(truoc, sau, tenDv) }, "changes() > 0")]);
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        if (/UNIQUE constraint failed: ord_service_terms\.supersedes_id|\bterms_one_current:/.test(m)) return error(409, "stale", "Mức của dòng này vừa được người khác ghi — tải lại.");
        if (/\bterms_order_delivered:/.test(m)) return error(409, "order_delivered", "Đơn đã Đã giao — không ghi mức tay.");
        throw e;
      }
      if ((kq[0]!.meta.changes ?? 0) === 0) return error(409, "stale", "Đơn vừa đổi trạng thái — tải lại.");
      baoThayDoi({ orderId: id, thayDoi: "tien" });
      const phan = await phanThuongMaiCuaDon(env.DB, id);
      return json(dungThuongMai({ laDoiTac: false, xemNguoiBan: can(staff, "supply.terms.view"), ...phan! }) satisfies ThuongMaiResponse);
    }),
```

Hai hàm phụ: `apGhiTay(truoc: BanChup, than: ThanGhiTay, congTyChuId: string | null): BanChup` (thuần, `thuong-mai.ts`, có bài: phần không gửi chép từ `truoc`; hoa hồng gửi lên ⇒ `SET` với `ruleId: null`; người bán = công ty ⇒ `supplierPartyId: null`, `costRateBp: null`, `termId: null`; người bán khác ⇒ `supplierPartyId = partyId`, `costRateBp` bắt buộc — thiếu thì `kiemThanGhiTay` đã trả 400) và `laNhaCungCap(db, partyId)` (câu `defineSql` ở `thuong-mai-repo.ts` đọc `v_pty_open_role` với `role_type_code = 'SUPPLIER'`). Kiểm loại thay đổi `"tien"` có trong kiểu tham số `baoThayDoi` (`grep -n "thayDoi" src/shared/router.ts`); không có thì dùng loại đang dùng cho "sửa tiền" và ghi ruling.

- [ ] **Step 6: Lọc lịch sử** (`GET /api/orders/:id`, dòng dựng `history` đang lọc `laDongNhapKeToan`): nối thêm `.filter((e) => !holdsPartner(staff) || !laDongThuongMai(e.action))`. Rà các đường khác trả nhật ký đơn cho Đối tác: `grep -rn "getAuditTrail\|lichSuTheoVai" src/modules | grep -v test` — mỗi chỗ trả cho người giữ PARTNER phải lọc cùng cách. Thông báo / Bảng tin chỉ dùng danh sách hành động khai sẵn: xác nhận `order_terms_*` không nằm trong danh sách đó (bài ở Bước 7).

- [ ] **Step 7: Bài số lạ** `src/so-la-doi-tac.test.ts` (tiêu chí 8, Review Focus 4). `rate_bp` tối đa 10000 nên số lạ đi qua hai cột khác: mức riêng `PER_PAX` **480017** đ/khách cho đối tác B, và điều khoản nhà cung cấp `cost_rate_bp = 4817` cho dịch vụ có trong đơn của A. Đơn của A (tài khoản Đối tác A tự lập, bên đặt A, có dịch vụ do nhà cung cấp đó bán) xác nhận; Kế toán ghi tay một dòng của đơn A (để có nhật ký `order_terms_manual`). Tài khoản Đối tác A gọi: `GET /api/orders`, `GET /api/orders/:id` (chi tiết + lịch sử), `GET /api/orders/:id/thuong-mai`, route biên nhận (`grep -n "receipt" src/modules/receipt/index.ts` — route GET biên nhận của đơn), `GET /api/orders/:id/qr-thanh-toan` (nếu đơn còn tiền thu; route trả 4xx thì vẫn quét thân), `GET /api/ledger/mine` ⇒ thân phản hồi KHÔNG chứa `480017`, `480.017`, `4817`, `48,17`. DTO `thuong-mai` của A quét đệ quy tên khoá: không khoá nào khớp `/rate|perPax|cost|ruleId|termId|source|supplier/i`. Thêm ca: mọi danh sách hành động của thông báo / Bảng tin (`grep -rn "AUDIT_GROUPS\|HANH_DONG_\|THONG_BAO" src/shared src/modules | grep -v test` để tìm) không chứa chuỗi bắt đầu `order_terms_`.

- [ ] **Step 8: Ô quyền + tên + nhật ký.** `permissions.ts` thêm `order.terms.view`, `order.terms.override` (giá trị ở Interfaces); `permissions.test.ts`: bảng `ADR`, các bài ghim nguyên dòng, và bài khoá mới:

```ts
test("sổ đại lý: supply.terms.view ⊆ order.terms.view ⊆ money.view ở mọi cột; DRIVER, DRIVER_PARTNER, HR = none ở các ô mới", () => {
  // Thứ tự rộng hẹp: none ⊂ own, assigned ⊂ ownOrAssigned ⊂ any.
  const le = (a: string, b: string) => a === "none" || b === "any" || a === b || (b === "ownOrAssigned" && (a === "own" || a === "assigned"));
  for (const p of PERMISSION_CODES) {
    assert.ok(le(MATRIX["supply.terms.view"][p], MATRIX["order.terms.view"][p]), `${p}: supply.terms.view ⊆ order.terms.view`);
    assert.ok(le(MATRIX["order.terms.view"][p], MATRIX["money.view"][p]), `${p}: order.terms.view ⊆ money.view`);
  }
  for (const op of ["partner.commission.view", "partner.commission.write", "order.terms.view", "order.terms.override", "supply.terms.view", "supply.terms.write"] as const)
    for (const p of ["DRIVER", "DRIVER_PARTNER", "HR"] as const) assert.equal(MATRIX[op][p], "none", `${op}/${p}`);
});
```

(`ledger.period.close` thêm vào vòng thứ hai của bài này ở Task 7.) `TEN_THAO_TAC`: `"order.terms.view": { ten: "xem phần đối tác của đơn", moTa: "Xem hoa hồng, giá đại lý của từng dịch vụ trên đơn; Đối tác chỉ thấy số tiền hoa hồng của mình." }`, `"order.terms.override": { ten: "ghi mức hoa hồng tay", moTa: "Ghi mức hoa hồng hoặc người bán cho một dịch vụ của đơn đã xác nhận, có lý do." }`. Nhật ký `order_terms_manual` (nhóm `order`). Bài tập con 1024 tập quyền (`grep -rln "1024\|tập con" src/*.test.ts src/shared/*.test.ts`) tự phủ ô mới — chạy để chắc. `npm run build:web`. Số route 264 → 266, route ghi 157 → 158 (chú thích "+1 POST /api/orders/:id/thuong-mai/:serviceId").

- [ ] **Step 9: Xanh.** `node --test src/shared/so-dai-ly-nhan.test.ts src/modules/orders/thuong-mai*.test.ts src/so-la-doi-tac.test.ts src/shared/permissions.test.ts` rồi `npm run typecheck && npm test`.

- [ ] **Step 10: P16.** (a) Bỏ `.filter(… laDongThuongMai …)` ở lịch sử ⇒ bài số lạ đỏ ⇒ hoàn nguyên. (b) Trong `dungThuongMai` nhánh Đối tác, thêm trường `muc` vào dòng ⇒ bài DTO Đối tác đỏ ⇒ hoàn nguyên. (c) Bỏ `if (!can(staff, "order.terms.view", scope))` ⇒ ca `HR`/`DRIVER` 403 vẫn xanh nhờ cổng nhưng `route-write-guard`/`permission-enforcement` đỏ ⇒ hoàn nguyên. Ghi sổ.

- [ ] **Step 11: Commit.**

```bash
git add src docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md
git commit -m "Phần đối tác của đơn: hai DTO danh sách trắng, ghi mức tay có lý do, Đối tác không thấy tỷ lệ" -m "Văn phòng thấy mức, hoa hồng, giá đại lý, cờ thiếu mức; Đối tác chỉ thấy số tiền hoa hồng của mình (C9 = A) — kể cả lịch sử đơn lọc bỏ dòng order_terms_*. Ghi tay thay bản hiện hành bằng bản MANUAL trỏ bản cũ; hai người ghi cùng lúc ⇒ 409." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Bên đặt là đối tác: tổ chức được gắn, tài khoản Đối tác tự ghi, chụp lại khi đổi bên đặt, nhãn trên đơn

> **Phụ thuộc lời chủ (điểm 1, 2 cuối Phần A đặc tả).** Viết theo khuyến nghị (điểm 1 = a, điểm 2 = thu hẹp). Chủ chọn (b) ở điểm 1 thì BỎ Bước 4 (tài khoản Đối tác tự ghi) và ca 2–3 của Bước 1; phần còn lại giữ.

**Files:**
- Create: `src/modules/orders/ben-dat-doi-tac.test.ts`, `src/shared/booker.test.ts` (nếu chưa có; có rồi thì thêm ca)
- Modify: `src/modules/orders/service.ts` (`resolveBooker`), `src/modules/orders/repository.ts` (`BOOKER_VALUE`, `changeBooker` nhận câu kèm, cờ `bookerLaDoiTac`), `src/modules/orders/index.ts` (lập đơn, lưu nháp, đổi bên đặt), `src/shared/booker.ts` (`benDatChoTaiKhoan`), `src/modules/billing/rules.ts` (chữ `booker_partner`) + bài của nó, `src/shared/contracts.ts` (`OrderDetailDto.bookerLaDoiTac`), `src/shared/audit-actions.ts`

**Interfaces:**
- Consumes: `laNguoiHuong` (pricing, Task 3), `docBangChoChup`/`chupDon` (Task 3), `cauChupChuoi`/`banChupHienHanh`/`demBanChup`/`dongGhiTuChup`/`moTaChup` (Task 4).
- Produces: `OrderDetailDto.bookerLaDoiTac: boolean` (bên đặt đang mở vai được hưởng — máy chủ tính); `changeBooker(…, alsoChange?: (at: string) => D1PreparedStatement[])`; `benDatChoTaiKhoan(v: { laDoiTac: boolean; partyId: string | null; laNguoiHuong: boolean; guiLen: BookerInput }): BookerInput`; hành động `order_terms_recaptured` ("Chụp lại mức khi đổi bên đặt", nhóm `order`).

- [ ] **Step 1: Bài đỏ** `src/modules/orders/ben-dat-doi-tac.test.ts` (khung thử; chép `setup`, `nhap`, `xacNhan`, `muc`, `chup` của Task 4; thêm tài khoản Đối tác `DT` mà hồ sơ `pty-${DT}` được đổi thành `ORGANIZATION` mang `TRAVEL_AGENCY`, và tài khoản Đối tác `DT2` có hồ sơ chỉ mang `CUSTOMER`). Thân lập đơn lấy khuôn từ bài lập đơn đang có (`grep -rln "POST\", \"/api/orders\"" src/**/*.test.ts tests/e2e`). Sáu ca:
  0. (Chuẩn bị) Gắn tài khoản `DT` vào hồ sơ TỔ CHỨC: trước khi gieo, đọc `grep -rn "PERSON" src/modules/staff | grep -v test` và trigger của `staff` — nếu luật hiện có cấm tài khoản gắn hồ sơ tổ chức thì Review Focus 2 không xảy ra được ở dữ liệu thật: giữ hồ sơ `PERSON` mang `TRAVEL_AGENCY` cho ca 2, ghi ruling và sửa dòng 2 của Review Focus trong sổ thi công. Không nới luật đó.
  1. Bán hàng lập đơn với `bookerPartyId = "pty-dla"` (tổ chức mang `TRAVEL_AGENCY`) ⇒ 201, `orders.booker_party_id = 'pty-dla'`; tổ chức `pty-kxh` không mang vai được hưởng ⇒ 400 câu "Hồ sơ tổ chức này không phải đối tác được hưởng hoa hồng.".
  2. **Review Focus 2:** `DT` lập đơn, thân gửi `bookerPartyId = "pty-dla"` ⇒ 201, `booker_party_id = 'pty-${DT}'` (không NULL, không `pty-dla`); `customer_name` = tên khách gửi lên. `DT` lưu nháp (`PUT /api/orders/:id`) gửi bên đặt khác ⇒ vẫn `pty-${DT}`.
  3. `DT2` lập đơn ⇒ bên đặt theo thân gửi lên (hành vi hôm nay). Tài khoản Đối tác không gắn hồ sơ (`staff.party_id` NULL — gieo bằng SQL) lập đơn với `bookerPartyId = "pty-dla"` ⇒ 409 "Tài khoản đối tác chưa gắn hồ sơ — nhờ văn phòng"; không gửi bên đặt ⇒ hành vi hôm nay.
  4. Đơn khách lẻ đã xác nhận (có bản chụp `NONE`), Bán hàng `PUT /api/orders/:id/booker` sang `pty-dla` ⇒ 200; mỗi dòng có bản chụp mới trỏ `supersedes_id`, bản cũ còn; nhật ký `order_terms_recaptured` một dòng. Đơn `confirmed` gieo SQL không bản chụp, đổi bên đặt ⇒ 200 và `ord_service_terms` của đơn vẫn 0 dòng (N15).
  5. `GET /api/orders/:id` của đơn bên đặt `pty-dla` ⇒ `bookerLaDoiTac: true`; đơn khách lẻ ⇒ `false`; biên nhận của đơn `pty-dla` in tên khách (`customer_name`), không in "Đại lý A".
  6. Câu báo mã `booker_partner` của "Đã giao" = câu ở Global Constraints (bài thuần ở `src/modules/billing/rules.test.ts`, sửa bài đang ghim câu cũ).

Bài thuần `src/shared/booker.test.ts` cho `benDatChoTaiKhoan`: (a) Đối tác + có hồ sơ + được hưởng ⇒ `{ kind: "existing", partyId }` bất kể `guiLen`; (b) Đối tác + có hồ sơ + không được hưởng ⇒ `guiLen`; (c) không phải Đối tác ⇒ `guiLen`.

- [ ] **Step 2: Đỏ.** `node --test src/modules/orders/ben-dat-doi-tac.test.ts src/shared/booker.test.ts`.

- [ ] **Step 3: Nhận tổ chức được hưởng.** `resolveBooker` (`service.ts`, nhánh `existing`): thay dòng loại hồ sơ không phải `PERSON` bằng

```ts
    if (row.party_kind !== "PERSON" && !(await laNguoiHuong(db, booker.partyId))) return { ok: false, message: "Hồ sơ tổ chức này không phải đối tác được hưởng hoa hồng." };
```

`BOOKER_VALUE` (`repository.ts`) đổi thành MỘT tham số, đọc view công bố của parties và pricing (cạnh `orders → parties, pricing` đã khai):

```ts
const BOOKER_VALUE = `(SELECT l.id FROM v_pty_party_label l WHERE l.id = ? AND l.active = 1 AND (l.party_kind = 'PERSON'
  OR EXISTS (SELECT 1 FROM v_pty_open_role r JOIN v_prc_beneficiary_role b ON b.role_type_code = r.role_type_code WHERE r.party_id = l.id)))`;
```

Sửa MỌI chỗ bind `BOOKER_VALUE` từ hai tham số (cùng id) còn một (`grep -n "BOOKER_VALUE" src/modules/orders/*.ts`); đổi chú thích "hai tham số: cùng id" theo. `v_prc_beneficiary_role` là view Task 1 tạo (chỉ vai `active = 1`); khác tên thì theo Task 1.

- [ ] **Step 4: Tài khoản Đối tác tự ghi bên đặt.** `src/shared/booker.ts`:

```ts
/** ADR-0077 điều 3 (i), thu hẹp theo lời chủ (đặc tả §7): tài khoản Đối tác mà hồ sơ đang mang vai được hưởng ⇒ bên đặt = chính hồ sơ đó, bỏ qua bên đặt trình duyệt gửi.
 * Tài khoản lai (LC-1 cấm vai bên ngoài trên hồ sơ của nó) và Đối tác khác giữ hành vi cũ. */
export function benDatChoTaiKhoan(v: { laDoiTac: boolean; partyId: string | null; laNguoiHuong: boolean; guiLen: BookerInput }): BookerInput {
  return v.laDoiTac && v.partyId !== null && v.laNguoiHuong ? { kind: "existing", partyId: v.partyId } : v.guiLen;
}
```

(`BookerInput` là kiểu bên đặt đang dùng ở `booker.ts`; tên khác thì dùng đúng tên.) Ở `POST /api/orders` và `PUT /api/orders/:id`, ngay TRƯỚC `resolveBooker`:

```ts
      const laDoiTac = holdsPartner(staff);
      const huong = laDoiTac && staff.partyId !== null && (await laNguoiHuong(env.DB, staff.partyId));
      if (laDoiTac && staff.partyId === null && guiBenDatDuocHuong) return error(409, "partner_no_party", "Tài khoản đối tác chưa gắn hồ sơ — nhờ văn phòng");
      const benDat = benDatChoTaiKhoan({ laDoiTac, partyId: staff.partyId, laNguoiHuong: huong, guiLen: placed.value.booker });
```

với `guiBenDatDuocHuong = placed.value.booker.kind === "existing" && (await laNguoiHuong(env.DB, placed.value.booker.partyId))` (chỉ tính khi `laDoiTac && staff.partyId === null`). Truyền `benDat` thay `placed.value.booker`. Ở `PUT`, nhánh "thân không có khoá bên đặt ⇒ giữ bên đặt cũ" cũng nhường cho `huong` (Đối tác được hưởng luôn ghi hồ sơ của mình). Tên trường hồ sơ của tài khoản (`staff.partyId`) và tên biến thân (`placed.value.booker`) là tên đang có; khác thì dùng đúng tên.

- [ ] **Step 5: Chụp lại khi đổi bên đặt** (`PUT /api/orders/:id/booker`): khi `meta.status === "confirmed"` VÀ `await demBanChup(env.DB, id) > 0` VÀ bên đặt đổi thật (id mới ≠ `meta.bookerPartyId`):

```ts
      const view = await loadOrderView(env.DB, id);
      const cu = new Map((await banChupHienHanh(env.DB, id)).map((r) => [r.order_service_id, r.id]));
      const homNay = vnToday(new Date());
      const bang = await docBangChoChup(env.DB, { bookerPartyId: benDatMoi, catalogCodes: view!.services.flatMap((s) => (s.catalogCode ? [s.catalogCode] : [])), ngay: homNay });
      const chup = chupDon({ nguoiHuong: bang.nguoiHuong, ngay: homNay, muc: bang.muc, dieuKhoan: bang.dieuKhoan,
        dong: view!.services.map((s) => ({ serviceId: s.id, catalogCode: s.catalogCode, groupCode: s.catalogCode ? (bang.nhom.get(s.catalogCode) ?? null) : null })) });
      const kemChup = (at: string): D1PreparedStatement[] => [
        ...cauChupChuoi(env.DB, chup.map((c) => dongGhiTuChup(c, { id: crypto.randomUUID(), orderId: id, ngay: homNay, at, by: staff.id, source: "AUTO", reason: null, supersedesId: cu.get(c.serviceId) ?? null }))),
        auditStatement(env.DB, { orderId: id, staffId: staff.id, action: "order_terms_recaptured", at, detail: moTaChup(chup) }, "changes() > 0"),
      ];
```

Truyền `kemChup` vào `changeBooker` (tham số mới `alsoChange`, trải CUỐI lô, sau câu nhật ký đổi bên đặt có `changes() > 0`). Đọc `changeBooker` trước: nếu câu cuối của lô không phải nhật ký có `changes() > 0` nối từ câu quyết định thì chèn câu kèm ngay sau nhật ký đó và ghi ruling. Dòng dịch vụ không có bản hiện hành (`cu.get` trả undefined) chỉ xảy ra khi đơn có dòng thêm sau xác nhận — đợt 1 không có đường thêm dòng sau xác nhận; gặp thì `supersedesId: null` là đúng (dòng mới). Catch `terms_(rule|term)_stale` ⇒ 409 "Bảng mức vừa đổi — thử lại".

- [ ] **Step 6: Cờ DTO** `bookerLaDoiTac` trong DTO chi tiết đơn (`loadOrderView`/`findOrder`): một câu đọc `v_pty_open_role` ⨝ `v_prc_beneficiary_role` cho `booker_party_id` (đặt ở tệp SQL đang chứa câu đọc đơn của orders, qua `defineSql` nếu tệp đó là nửa nghiêm); `false` khi không bên đặt. Rà bài khoá danh sách khoá DTO đơn (`grep -rn "bookerName" src --include=*.test.ts` — nếu zsh báo "no matches", dùng `grep -rn "bookerName" src | grep test`) và thêm khoá có chủ đích.

- [ ] **Step 7: Chữ câu báo** `billing/rules.ts` mã `booker_partner` → câu ở Global Constraints; sửa bài đang ghim câu cũ.

- [ ] **Step 8: Xanh.** `node --test src/modules/orders/ben-dat-doi-tac.test.ts src/shared/booker.test.ts src/modules/billing/rules.test.ts` rồi `npm run typecheck && npm test`.

- [ ] **Step 9: P16.** (a) Trả `BOOKER_VALUE` về chỉ `PERSON` ⇒ ca 1 đỏ (bên đặt NULL) ⇒ hoàn nguyên. (b) Bỏ `benDatChoTaiKhoan` (dùng thẳng `placed.value.booker`) ⇒ ca 2 đỏ ⇒ hoàn nguyên. Ghi sổ.

- [ ] **Step 10: Commit.**

```bash
git add src docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md
git commit -m "Bên đặt là đối tác: gắn được tổ chức được hưởng, tài khoản Đối tác tự ghi, chụp lại khi đổi bên đặt" -m "Trước đây hồ sơ tổ chức bị loại và BOOKER_VALUE ghi NULL lặng lẽ; nay tổ chức mang vai được hưởng gắn được. Tài khoản Đối tác có hồ sơ được hưởng luôn là bên đặt của đơn mình lập (thu hẹp theo lời chủ, tài khoản lai giữ hành vi cũ). Đơn xác nhận trước đợt 1 đổi bên đặt không chụp (để đợt 2 chụp bù)." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Module `ky-so` và khoá tháng ở sổ tiền (`billing`)

**Files:**
- Create: `src/modules/ky-so/rules.ts`, `src/modules/ky-so/rules.test.ts`, `src/modules/ky-so/repository.ts`, `src/modules/ky-so/index.ts`, `src/modules/billing/khoa-thang.test.ts`, `src/modules/billing/lo-dich-khoa-ky.test.ts`
- Modify: `src/modules/billing/rules.ts` (`ngayPhatSinh`) + `rules.test.ts`, `src/modules/billing/service.ts` (`docLanThu`, `docNgay`, `loiKhoaKy`, mọi `catch` của lô), `src/modules/billing/coc.ts`, `src/modules/billing/thay-lan-thu.ts`, `src/modules/billing/repository.ts` (câu số dư cuối tháng, câu tháng của dòng sổ sớm nhất), `src/modules/billing/index.ts` (hai route), `src/shared/contracts.ts` (`KySoResponse`), `src/shared/permissions.ts` (+ test), `src/shared/audit-actions.ts`, `src/shared/tro-ly-cau-truc-ten.ts` (+ sinh), `src/architecture.test.ts` (`ALLOWED_EDGES`, `STRICT`), `src/route-access.test.ts` (266 → 268), `src/lan-gui-phu-route.test.ts` (158 → 159)

**Interfaces:**
- Consumes: Task 1 (`ky_period_close`, `v_ky_closed_period`, trigger `ky_period_close_adjacent` mã `period_not_adjacent`, `ky_append_only`, bốn trigger `*_period_closed` mã `period_closed`); `auditStatement` (audit).
- Produces:
  - `ky-so/rules.ts`: `kyCua(ngay: string): string` ("YYYY-MM"), `thangKeTiep(period: string): string`, `cauKyKhoa(period: string): string`, `kyDaKhoaTu(daKhoa: ReadonlySet<string>): (ngay: string) => boolean`, `kiemKhoaKy(v: { period: string; homNay: string; daKhoa: readonly string[]; thangSoSomNhat: string | null }): { ok: true } | { ok: false; status: 400 | 409; code: string; message: string }`, `thangKhoaDuocKeTiep(v: { homNay: string; daKhoa: readonly string[]; thangSoSomNhat: string | null }): string | null`.
  - `ky-so/index.ts`: `thangDaKhoa(db): Promise<string[]>` (tăng dần), `khoaKyStatements(db, { period: string; note: string | null; at: string; by: string }): D1PreparedStatement[]` (câu chèn + nhật ký `ledger_period_closed` có `changes() > 0`), `cauTriggerKhoa(db, e: unknown, ngays: readonly string[]): Promise<string | null>` (lỗi `period_closed:` ⇒ câu `cauKyKhoa` của tháng đã khoá đầu tiên trong `ngays`, đọc lại `thangDaKhoa`; không phải lỗi đó ⇒ null); tái xuất các hàm thuần.
  - `billing/rules.ts`: `ngayPhatSinh(input: { chon: unknown; homNay: string; laKeToan: boolean; kyDaKhoa: (ngay: string) => boolean }): { ok: true; value: string } | { ok: false; message: string; khoa?: true }`.
  - `billing/service.ts`: `docNgay(raw: unknown, kyDaKhoa: (ngay: string) => boolean): KetQua<string>` (tháng khoá ⇒ 409 `period_closed`), `loiKhoaKy(db, e, ngays): Promise<{ ok: false; res: Response } | null>`.
  - Ô `ledger.period.close` = `row("none", "any", "none", "none", "none", "any", "none", "none", "none", "none")`; hành động `ledger_period_closed` ("Khoá sổ tháng", nhóm `ledger`).
  - Route `GET /api/ledger/ky` (`office`, `can(staff, "ledger.view")` không ngữ cảnh = any) và `POST /api/ledger/ky/:period/khoa` (`office`, `can(staff, "ledger.period.close")`).
  - `contracts.ts`: `KySoResponse = { daKhoa: string[]; keTiep: string | null; coTheKhoa: boolean; bangKiem: { thang: string; choXacNhanCongTy: { orderCode: string | null; amount: number; ngay: string }[]; chuaRoNguoiThu: { orderCode: string | null; amount: number; ngay: string }[]; soDuCuoiThang: { ten: string; soDu: number }[] } | null }`.

**Bảng đường ghi tiền của `billing`** (mọi lô có bốn bảng có trigger khoá tháng; cột "dịch lỗi" = `catch` gọi `loiKhoaKy(db, e, [ngày])` TRƯỚC mọi xử lý khác):

| Đường ghi (hàm) | Ngày phát sinh lấy từ | Kiểm trước lô | Bài kiểm |
|---|---|---|---|
| Lần thu (`ghiLanThu`, `docLanThu`) | thân `ngayPhatSinh` (Kế toán) hoặc hôm nay | `ngayPhatSinh` với `kyDaKhoa` ⇒ 409 | ca 3, ca 5 |
| Đã giao (`daGiao`) | hôm nay (`homNay`) | không cần (tháng hiện tại không khoá được) | ca 6 (chỉ dịch lỗi) |
| Hoàn thành (`hoanThanh`) | hôm nay | không cần | quét mã (bài nguồn) |
| Công ty đã nhận (`xacNhanCongTyNhan`) | `docNgay` | `docNgay` ⇒ 409 | ca 3 |
| Quyết toán (`ghiQuyetToan`) | `docNgay` | `docNgay` ⇒ 409 | ca 3 |
| Hoàn khách (`ghiHoanKhach`) | `docNgay` | `docNgay` ⇒ 409 | ca 3 |
| Điều chỉnh (`ghiDieuChinh`) | `docNgay` | `docNgay` ⇒ 409 | ca 3 |
| Thay lần thu (`ghiThayLanThu`) | `docNgay`; dòng đảo mang ngày mới (ADR-0080 điều 5) | `docNgay` ⇒ 409 | ca 3 |
| Cọc: chi hoàn / chuyển / hoàn ngoài (`ghiChiHoan`, `ghiChuyen`, `ghiHoanNgoai`) | `docNgay` | `docNgay` ⇒ 409 | ca 3 |
| Cọc: duyệt / huỷ duyệt / xác nhận hoàn ngoài (`ghiDuyet`, `ghiHuyDuyet`, `xacNhanHoanNgoai`) | hôm nay | không cần | quét mã |

Người thi công rà lại bằng `grep -n "db.batch\|\.batch(" src/modules/billing/*.ts | grep -v test` (bỏ `nhap-ke-toan` — ADR-0080 điều 7) và thêm dòng nếu có đường chưa ở bảng.

- [ ] **Step 1: Bài đỏ thuần** `src/modules/ky-so/rules.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { cauKyKhoa, kiemKhoaKy, kyCua, kyDaKhoaTu, thangKeTiep, thangKhoaDuocKeTiep } from "./rules.ts";

test("kyCua, thangKeTiep, cauKyKhoa", () => {
  assert.equal(kyCua("2026-10-08"), "2026-10");
  assert.equal(thangKeTiep("2026-12"), "2027-01");
  assert.equal(thangKeTiep("2026-09"), "2026-10");
  assert.equal(cauKyKhoa("2026-10"), "Tháng 10/2026 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)");
  assert.equal(kyDaKhoaTu(new Set(["2026-09"]))("2026-09-30"), true);
  assert.equal(kyDaKhoaTu(new Set(["2026-09"]))("2026-10-01"), false);
});

test("kiemKhoaKy: chỉ tháng đã qua (400); trùng / không liền kề / sau tháng sổ sớm nhất (409)", () => {
  const goc = { homNay: "2026-10-08", daKhoa: [] as string[], thangSoSomNhat: "2026-08" };
  assert.deepEqual(kiemKhoaKy({ ...goc, period: "2026-08" }), { ok: true });
  assert.equal((kiemKhoaKy({ ...goc, period: "2026-10" }) as { status: number }).status, 400, "tháng hiện tại");
  assert.equal((kiemKhoaKy({ ...goc, period: "2026-11" }) as { status: number }).status, 400, "tháng tương lai");
  assert.equal((kiemKhoaKy({ ...goc, period: "2026-13" }) as { status: number }).status, 400);
  assert.equal((kiemKhoaKy({ ...goc, period: "2026-09" }) as { status: number }).status, 409, "tháng đầu sau tháng có dòng sổ sớm nhất");
  assert.deepEqual(kiemKhoaKy({ ...goc, period: "2026-07" }), { ok: true }, "tháng đầu trước tháng sổ sớm nhất: được");
  assert.equal((kiemKhoaKy({ ...goc, daKhoa: ["2026-08"], period: "2026-08" }) as { status: number }).status, 409, "trùng");
  assert.equal((kiemKhoaKy({ ...goc, daKhoa: ["2026-07"], period: "2026-09" }) as { status: number }).status, 409, "không liền kề");
  assert.deepEqual(kiemKhoaKy({ ...goc, daKhoa: ["2026-07", "2026-08"], period: "2026-09" }), { ok: true });
  assert.deepEqual(kiemKhoaKy({ ...goc, thangSoSomNhat: null, period: "2026-09" }), { ok: true }, "chưa có dòng sổ nào");
});

test("thangKhoaDuocKeTiep", () => {
  assert.equal(thangKhoaDuocKeTiep({ homNay: "2026-10-08", daKhoa: ["2026-08"], thangSoSomNhat: "2026-08" }), "2026-09");
  assert.equal(thangKhoaDuocKeTiep({ homNay: "2026-10-08", daKhoa: ["2026-09"], thangSoSomNhat: "2026-08" }), null, "tháng 10 chưa qua");
  assert.equal(thangKhoaDuocKeTiep({ homNay: "2026-10-08", daKhoa: [], thangSoSomNhat: "2026-08" }), "2026-08");
  assert.equal(thangKhoaDuocKeTiep({ homNay: "2026-10-08", daKhoa: [], thangSoSomNhat: null }), "2026-09");
});
```

- [ ] **Step 2: Đỏ** `node --test src/modules/ky-so/rules.test.ts`.

- [ ] **Step 3: `src/modules/ky-so/rules.ts`**:

```ts
// Luật thuần khoá tháng (ADR-0080 phần D1; đặc tả 2026-10-08 §8). MỘT nguồn cho câu báo tháng đã khoá.
export const kyCua = (ngay: string): string => ngay.slice(0, 7);
export function thangKeTiep(period: string): string {
  const y = Number(period.slice(0, 4));
  const m = Number(period.slice(5, 7));
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}
const thangTruoc = (period: string): string => {
  const y = Number(period.slice(0, 4));
  const m = Number(period.slice(5, 7));
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};
const nhanThang = (period: string): string => `${period.slice(5, 7)}/${period.slice(0, 4)}`;
export const cauKyKhoa = (period: string): string => `Tháng ${nhanThang(period)} đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)`;
export const kyDaKhoaTu = (daKhoa: ReadonlySet<string>) => (ngay: string): boolean => daKhoa.has(kyCua(ngay));

export function kiemKhoaKy(v: { period: string; homNay: string; daKhoa: readonly string[]; thangSoSomNhat: string | null }):
  { ok: true } | { ok: false; status: 400 | 409; code: string; message: string } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.period)) return { ok: false, status: 400, code: "invalid_input", message: "Tháng không hợp lệ." };
  if (v.period >= kyCua(v.homNay)) return { ok: false, status: 400, code: "period_not_past", message: "Chỉ khoá được tháng đã qua." };
  if (v.daKhoa.includes(v.period)) return { ok: false, status: 409, code: "period_already_closed", message: `Tháng ${nhanThang(v.period)} đã khoá rồi.` };
  const cuoi = v.daKhoa.length ? [...v.daKhoa].sort().at(-1)! : null;
  if (cuoi !== null && v.period !== thangKeTiep(cuoi)) return { ok: false, status: 409, code: "period_not_adjacent", message: `Phải khoá lần lượt — tháng khoá được kế tiếp là ${nhanThang(thangKeTiep(cuoi))}.` };
  if (cuoi === null && v.thangSoSomNhat !== null && v.period > v.thangSoSomNhat)
    return { ok: false, status: 409, code: "period_not_adjacent", message: `Lần khoá đầu tiên phải bắt đầu từ tháng ${nhanThang(v.thangSoSomNhat)} (tháng có dòng sổ sớm nhất) hoặc trước đó.` };
  return { ok: true };
}

export function thangKhoaDuocKeTiep(v: { homNay: string; daKhoa: readonly string[]; thangSoSomNhat: string | null }): string | null {
  const cuoi = v.daKhoa.length ? [...v.daKhoa].sort().at(-1)! : null;
  const keTiep = cuoi !== null ? thangKeTiep(cuoi) : (v.thangSoSomNhat ?? thangTruoc(kyCua(v.homNay)));
  return keTiep < kyCua(v.homNay) ? keTiep : null;
}
```

- [ ] **Step 4: Xanh** `node --test src/modules/ky-so/rules.test.ts`.

- [ ] **Step 5: `ky-so/repository.ts` + `index.ts`**:

```ts
// ky-so/repository.ts — SQL của module ky-so (ADR-0080 D1). Câu TĨNH, defineSql.
import { defineSql } from "../../shared/sql-registry.ts";
const DA_KHOA = defineSql("ky-so", "closed_periods", "SELECT period FROM ky_period_close ORDER BY period");
const KHOA = defineSql("ky-so", "close_period",
  "INSERT INTO ky_period_close (period, closed_at, closed_by, note, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?2, ?3, ?2, ?3)");
export const closedPeriods = async (db: D1Database): Promise<string[]> => (await db.prepare(DA_KHOA).all<{ period: string }>()).results.map((r) => r.period);
export const closePeriodStatement = (db: D1Database, v: { period: string; at: string; by: string; note: string | null }) => db.prepare(KHOA).bind(v.period, v.at, v.by, v.note);
```

```ts
// ky-so/index.ts — Module ky-so: tháng đã khoá sổ (ADR-0080 phần D1). Không route (route ở billing). Phụ thuộc: audit.
import { auditStatement } from "../audit";
import { closedPeriods, closePeriodStatement } from "./repository";
import { cauKyKhoa, kyCua } from "./rules";
export { cauKyKhoa, kiemKhoaKy, kyCua, kyDaKhoaTu, thangKeTiep, thangKhoaDuocKeTiep } from "./rules";

export const thangDaKhoa = (db: D1Database): Promise<string[]> => closedPeriods(db);
/** Câu khoá tháng + nhật ký, gửi trong MỘT lô. Nhật ký chỉ ghi khi câu chèn thắng. */
export function khoaKyStatements(db: D1Database, v: { period: string; note: string | null; at: string; by: string }): D1PreparedStatement[] {
  return [closePeriodStatement(db, v), auditStatement(db, { staffId: v.by, action: "ledger_period_closed", at: v.at, detail: `Khoá sổ tháng ${v.period.slice(5, 7)}/${v.period.slice(0, 4)}` }, "changes() > 0")];
}
/** Lỗi trigger `period_closed:` (tháng bị khoá giữa lúc kiểm và lúc ghi) ⇒ đúng câu `cauKyKhoa` của tháng vừa khoá; lỗi khác ⇒ null. */
export async function cauTriggerKhoa(db: D1Database, e: unknown, ngays: readonly string[]): Promise<string | null> {
  if (!/\bperiod_closed:/.test(e instanceof Error ? e.message : String(e))) return null;
  const daKhoa = new Set(await closedPeriods(db));
  const thang = ngays.map(kyCua).find((k) => daKhoa.has(k)) ?? (ngays[0] ? kyCua(ngays[0]) : [...daKhoa].sort().at(-1)!);
  return cauKyKhoa(thang);
}
```

Nếu `src/architecture.test.ts` hoặc bài khác đòi mỗi thư mục module có `AppModule` thì khai `export const kySoModule: AppModule = { name: "ky-so", routes: [] }` và thêm vào mảng `modules`; ghi ruling. `src/architecture.test.ts`: `ALLOWED_EDGES` thêm `"ky-so": ["audit"]`, `billing` thêm `"ky-so"`; `STRICT` thêm `{ module: "ky-so", file: "modules/ky-so/repository.ts" }` (chú thích "NỚI hàng rào đã duyệt (Điều 9.4) — chủ duyệt C12 2026-10-01, xem `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/de-xuat-luat.md`"). Cạnh `van-chuyen → ky-so` thêm ở Task 8.

- [ ] **Step 6: Bài đỏ `ngayPhatSinh`** (thêm vào `src/modules/billing/rules.test.ts`):

```ts
test("ngayPhatSinh: Kế toán chọn ngày thuộc tháng đã khoá ⇒ lỗi khoa với câu cauKyKhoa", () => {
  const kyDaKhoa = (n: string) => n.startsWith("2026-09");
  const r = ngayPhatSinh({ chon: "2026-09-30", homNay: "2026-10-08", laKeToan: true, kyDaKhoa });
  assert.deepEqual(r, { ok: false, message: "Tháng 09/2026 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)", khoa: true });
  assert.deepEqual(ngayPhatSinh({ chon: "2026-10-01", homNay: "2026-10-08", laKeToan: true, kyDaKhoa }), { ok: true, value: "2026-10-01" });
  assert.deepEqual(ngayPhatSinh({ chon: undefined, homNay: "2026-10-08", laKeToan: false, kyDaKhoa }), { ok: true, value: "2026-10-08" });
});
```

Sửa mọi bài `ngayPhatSinh` đang có: thêm `kyDaKhoa: () => false`.

- [ ] **Step 7: Sửa `ngayPhatSinh`** (`billing/rules.ts`; `billing → ky-so` đã khai): thêm tham số bắt buộc `kyDaKhoa: (ngay: string) => boolean` và, ngay trước `return { ok: true, value: input.chon }` cuối hàm (và cho nhánh mặc định hôm nay — tháng hiện tại không khoá được nên không cần):

```ts
  if (input.kyDaKhoa(input.chon)) return { ok: false, message: cauKyKhoa(kyCua(input.chon)), khoa: true };
```

`billing/service.ts`: `docLanThu` đọc `const daKhoa = new Set(await thangDaKhoa(db));` rồi truyền `kyDaKhoa: kyDaKhoaTu(daKhoa)`; lỗi có `khoa` ⇒ `loi(409, "period_closed", message)`, không thì 400 như cũ. `docNgay(raw, kyDaKhoa)` cùng cách. Mọi nơi gọi `docNgay` (service.ts bốn chỗ, coc.ts ba chỗ, thay-lan-thu.ts một chỗ — `grep -n "docNgay(" src/modules/billing/*.ts`) đọc `kyDaKhoaTu(new Set(await thangDaKhoa(db)))` một lần đầu hàm rồi truyền vào.

- [ ] **Step 8: Dịch lỗi trigger ở MỌI lô** (`billing/service.ts`):

```ts
/** Lỗi trigger khoá tháng (tháng vừa khoá giữa lúc kiểm và lúc ghi — Review Focus 3) ⇒ 409 đúng câu của tháng đó. Gọi ĐẦU mọi `catch` của lô ghi tiền. */
export async function loiKhoaKy(db: D1Database, e: unknown, ngays: readonly string[]): Promise<{ ok: false; res: Response } | null> {
  const cau = await cauTriggerKhoa(db, e, ngays);
  return cau ? loi(409, "period_closed", cau) : null;
}
```

Mỗi `catch` quanh `db.batch` ở `service.ts`, `coc.ts` (hàm `chayLo` nhận thêm tham số `ngays`), `thay-lan-thu.ts` thêm dòng đầu `const k = await loiKhoaKy(db, e, [<ngày của lô>]); if (k) return k;`. Lô chưa có `try` thì bọc `try/catch` (catch: `loiKhoaKy` rồi `throw e`).

Bài nguồn `src/modules/billing/lo-dich-khoa-ky.test.ts` (hàng rào chặn quên, ghi vào sổ hàng rào ở Task 14):

```ts
// Mọi lô ghi tiền của billing phải dịch lỗi khoá tháng (đặc tả §8: "không bao giờ 500"). Đếm trong mã nguồn: số `db.batch(` = số `loiKhoaKy(`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
for (const tep of ["service.ts", "coc.ts", "thay-lan-thu.ts"]) {
  test(`${tep}: mỗi db.batch có loiKhoaKy trong catch`, () => {
    const src = readFileSync(new URL(`./${tep}`, import.meta.url), "utf8").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    const lo = (src.match(/\bdb\.batch\(/g) ?? []).length;
    const dich = (src.match(/\bloiKhoaKy\(db, e,/g) ?? []).length;
    assert.ok(lo > 0, "không thấy lô nào — đổi tên biến db?");
    assert.equal(dich, lo, `${tep}: ${lo} lô nhưng ${dich} chỗ dịch lỗi khoá tháng`);
  });
}
```

(`coc.ts` có MỘT `db.batch(` trong `chayLo` ⇒ một `loiKhoaKy(db, e,` ở đó. Định nghĩa `loiKhoaKy` trong `service.ts` dùng chữ ký `(db: D1Database, e: unknown, …)`, không khớp mẫu `loiKhoaKy(db, e,` nên không bị đếm thừa.)

- [ ] **Step 9: Hai route kỳ** (`billing/index.ts`; câu đọc mới ở `billing/repository.ts`):

```ts
// billing/repository.ts
const THANG_SO_SOM_NHAT = defineSql("billing", "earliest_ledger_month",
  `SELECT substr(min(d), 1, 7) AS thang FROM (SELECT min(occurred_date) AS d FROM bil_payment_receipt UNION ALL SELECT min(occurred_date) FROM bil_posting
   UNION ALL SELECT min(occurred_date) FROM bil_outside_refund)`);
export const earliestLedgerMonth = async (db: D1Database): Promise<string | null> => (await db.prepare(THANG_SO_SOM_NHAT).first<{ thang: string | null }>())?.thang ?? null;
```

Số dư cuối tháng: câu mới `balances_at` theo đúng quy ước dấu của `v_bil_party_balance` (đọc định nghĩa view ở migration `0045` trước khi viết): cùng phép cộng như view nhưng chỉ lấy dòng nợ có ngày phát sinh (của lần thu / phiếu nguồn) `<= ?1` (ngày cuối tháng), lọc đối ứng công ty chủ như `BALANCES_WITH_OWNER`, `HAVING SUM <> 0`. Bài: không có dòng sau tháng đó ⇒ số dư cuối tháng = `balancesWithOwner` hiện tại.

Route:
1. `GET /api/ledger/ky` (`office`): `if (!can(staff, "ledger.view")) return FORBIDDEN_VIEW();` → `daKhoa = await thangDaKhoa`, `som = await earliestLedgerMonth`, `keTiep = thangKhoaDuocKeTiep({ homNay, daKhoa, thangSoSomNhat: som })`; `bangKiem` khi `keTiep !== null`: `pendingCompany` và `unknownReceipts` (đã có) lọc `kyCua(occurred_date) === keTiep`, `soDuCuoiThang` từ `balances_at`; `coTheKhoa = can(staff, "ledger.period.close") && keTiep !== null`. Không SĐT, không mã giao dịch.
2. `POST /api/ledger/ky/:period/khoa` (`office`): `if (!can(staff, "ledger.period.close")) return FORBIDDEN();` → `kiemKhoaKy({ period: params.period, homNay: vnToday(new Date()), daKhoa, thangSoSomNhat: som })` (lỗi ⇒ `error(status, code, message)`) → thân `{ ghiChu? }` (tuỳ chọn, ≤ 200, khuôn `docGhiChu`) → lô `khoaKyStatements(env.DB, { period, note, at, by: staff.id })`; `catch`: `UNIQUE constraint failed: ky_period_close.period` hoặc `\bky_append_only:` ⇒ 409 "Tháng này vừa được khoá — tải lại."; `\bperiod_not_adjacent:` ⇒ 409 câu của `kiemKhoaKy` (đọc lại `thangDaKhoa`) → 201, `Location: /khoa-thang`, thân là `KySoResponse` mới.

`permissions.ts`: ô `ledger.period.close` (Interfaces); `permissions.test.ts`: bảng `ADR` + các bài ghim dòng + thêm ô vào vòng `DRIVER`/`DRIVER_PARTNER`/`HR` của bài khoá sổ đại lý (Task 5). `TEN_THAO_TAC`: `"ledger.period.close": { ten: "khoá sổ tháng", moTa: "Khoá một tháng đã qua: không ghi thêm tiền có ngày trong tháng đó; không mở lại được." }`; `TEN_PHAN_HE` `"ky-so": { ten: "Khoá sổ tháng", moTa: "Các tháng đã khoá sổ và luật ghi lùi ngày." }`. Nhật ký `ledger_period_closed` nhóm `ledger`. Số route 266 → 268, route ghi 158 → 159. `npm run build:web`.

- [ ] **Step 10: Bài route đỏ → xanh** `src/modules/billing/khoa-thang.test.ts` (khung thử; tài khoản KT `ACCOUNTING`, ADM `ADMIN`, SALES; đơn đã xác nhận gieo bằng route như Task 4; một lần thu tháng 8 gieo qua route lần thu với `ngayPhatSinh: "2026-08-15"` để `thangSoSomNhat = "2026-08"`). Ca:
  1. KT khoá tháng hiện tại (`kyCua(vnToday)`) ⇒ 400; tháng sau ⇒ 400.
  2. KT khoá `2026-09` khi chưa khoá gì và dòng sổ sớm nhất ở `2026-08` ⇒ 409; khoá `2026-08` ⇒ 201 + `Location: /khoa-thang` + nhật ký `ledger_period_closed`; khoá `2026-08` lần hai ⇒ 409; ADM khoá ⇒ 403; SALES `GET /api/ledger/ky` ⇒ 403.
  3. Sau khi khoá `2026-08`: KT ghi lần thu `ngayPhatSinh: "2026-08-20"` ⇒ 409 câu "Tháng 08/2026 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)"; quyết toán, hoàn khách, điều chỉnh, thay lần thu, cọc chi hoàn với ngày tháng 8 ⇒ cùng câu 409 (mỗi đường một `assert`, thân lấy khuôn từ bài route hiện có của từng đường).
  4. Ngày tháng 9 (chưa khoá) ⇒ ghi được.
  5. **Review Focus 3:** tháng `2026-09` chưa khoá; dùng `chenTruocLo(w, /INSERT INTO bil_payment_receipt/, () => w.sqlite.exec(khoaThang("2026-09")))` với `const khoaThang = (p: string) => \`INSERT INTO ky_period_close (period, closed_at, closed_by, note, created_at, created_by, updated_at, updated_by) VALUES ('${p}', '2026-10-01T00:00:00.000Z', 'kt', NULL, '2026-10-01T00:00:00.000Z', 'kt', '2026-10-01T00:00:00.000Z', 'kt')\`` (cột theo bảng Task 1; `chenTruocLo` chép từ `src/modules/orders/chup-xac-nhan.test.ts`) rồi KT ghi lần thu `ngayPhatSinh: "2026-09-10"` ⇒ 409 câu "Tháng 09/2026 đã khoá sổ — …", không 500; không dòng sổ nào được ghi.
  6. `GET /api/ledger/ky` (KT) ⇒ `daKhoa: ["2026-08"]`, `keTiep: "2026-09"`, `bangKiem.thang === "2026-09"`.

- [ ] **Step 10b: Bài quyền xuyên suốt** `src/so-dai-ly-quyen-route.test.ts` (tiêu chí 7 — lúc này đủ 12 route mới): ba tài khoản `DRIVER`, `DRIVER_PARTNER`, `HR` (mỗi tài khoản giữ ĐÚNG một quyền đó; `DRIVER_PARTNER` đứng một mình theo ADR-0048) gọi lần lượt 12 route (đường có `:id` dùng id có thật đã gieo: một mức, một điều khoản, một đơn đã xác nhận, một dòng dịch vụ, tháng `2026-08`) ⇒ mọi phản hồi 403 (hoặc đúng mã cổng `office`/`orders` trả cho vai đó nếu cổng chặn trước bằng mã khác — đọc `src/shared/router.ts`, ghi mã thật vào bài kèm chú thích); không phản hồi nào 2xx; không lời gọi ghi nào để lại dòng ở `prc_*`, `ord_service_terms`, `ky_period_close`, `audit_log`.

- [ ] **Step 11: Xanh.** `node --test src/modules/ky-so/*.test.ts src/modules/billing/*.test.ts src/shared/permissions.test.ts src/so-dai-ly-quyen-route.test.ts` rồi `npm run typecheck && npm test`.

- [ ] **Step 12: P16.** (a) Xoá một `loiKhoaKy` trong `service.ts` ⇒ bài nguồn đỏ ⇒ hoàn nguyên. (b) Bỏ kiểm `kyDaKhoa` trong `ngayPhatSinh` ⇒ ca 3 vẫn 409 nhờ trigger nhưng câu đến từ đường dịch lỗi — bài thuần Bước 6 đỏ ⇒ hoàn nguyên. (c) Thêm `ledger.period.close` cho cột ADMIN ⇒ bài bảng `ADR` đỏ ⇒ hoàn nguyên. Ghi sổ.

- [ ] **Step 13: Commit.**

```bash
git add src docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md
git commit -m "Khoá sổ tháng: module ky-so, hai route kỳ, mọi đường ghi tiền chặn ngày thuộc tháng đã khoá" -m "Kế toán / Toàn quyền khoá lần lượt từng tháng đã qua, không mở lại. Ghi lùi ngày vào tháng đã khoá ⇒ 409 tiếng Việt; tháng bị khoá giữa lúc kiểm và lúc ghi thì trigger chặn và lỗi dịch ra cùng câu, không 500 (bài quét mã ghim mọi lô)." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Khoá tháng ở chi phí xe thuê (`van-chuyen`)

**Files:**
- Modify: `src/modules/van-chuyen/tien-xe.ts` (`ngayGhiDao` bắt buộc `kyDaKhoa`, `ngayDieuChinhMacDinh` nhận `homNay` + `kyDaKhoa`), `tien-xe-lo.ts` (`keHoachChiPhiKhiDoi`, `keHoachChiPhiKhiHuy` nhận `kyDaKhoa`, trả `"period_closed"` khi chụp giá rơi vào tháng khoá), `tien-xe-chi-phi.ts` (bốn đường Kế toán), `tien-xe-lenh.ts` (`loiTienXe`), `index.ts` (nơi gọi `keHoachChiPhiKhiDoi`), `dieu-phoi-lenh.ts` (nơi gọi hai kế hoạch + dịch lỗi lô chuyến), các bài `tien-xe.test.ts`, `so-vang-chi-phi-xe.test.ts`, `tien-xe-route.test.ts`; `src/architecture.test.ts` (`ALLOWED_EDGES.van-chuyen` thêm `ky-so`)
- Create: `src/modules/van-chuyen/khoa-thang-xe.test.ts`

**Interfaces:**
- Consumes: Task 7 (`thangDaKhoa`, `kyDaKhoaTu`, `cauKyKhoa`, `kyCua`, `cauTriggerKhoa` từ `ky-so/index.ts`).
- Produces: `ngayGhiDao(goc, v: { homNay: string; kyDaKhoa: (ngay: string) => boolean })` (bắt buộc — typecheck chỉ ra mọi chỗ quên); `ngayDieuChinhMacDinh(v: { trangThai; ngayHuy; ngayChay; homNay: string; kyDaKhoa: (ngay: string) => boolean })`; `keHoachChiPhiKhiDoi(v: { …; kyDaKhoa })`, `keHoachChiPhiKhiHuy(dong, homNay, kyDaKhoa)`; kiểu `KeHoachChiPhi | { loi: "period_closed"; thang: string }` cho `keHoachChiPhiKhiDoi` khi phải chụp giá cho chuyến có ngày chạy thuộc tháng đã khoá.

**Bảng đường ghi chi phí xe** (đặc tả §8, sửa N2; câu SQL ở `tien-xe-repo.ts`):

| Đường ghi | Câu | Ngày lấy từ | Luật khi tháng đã khoá | Kiểm ở | Dịch lỗi trigger ở | Bài (ca của `khoa-thang-xe.test.ts`) |
|---|---|---|---|---|---|---|
| Đảo khi đổi chuyến (`keHoachChiPhiKhiDoi`, lô chuyến) | `COST_REVERSE` | ngày dòng gốc | dùng hôm nay | `ngayGhiDao` | catch lô chuyến (`index.ts`, `dieu-phoi-lenh.ts`) | ca 1 |
| Đảo khi huỷ chuyến (`keHoachChiPhiKhiHuy`) | `COST_REVERSE` | ngày dòng gốc | dùng hôm nay | `ngayGhiDao` | catch lô huỷ (`dieu-phoi-lenh.ts`) | ca 2 |
| Chụp giá khi đổi sang xe thuê (`keHoachChiPhiKhiDoi`) | `COST_SNAPSHOT` | ngày chạy | 409 cả lệnh | kế hoạch trả `period_closed` | catch lô chuyến | ca 3 |
| Kế toán điều chỉnh (`tien-xe-chi-phi.ts`) | `COST_ADJUST_KT` | thân `ngay` hoặc `ngayDieuChinhMacDinh` | chọn ⇒ 409; mặc định ⇒ hôm nay | route | catch route | ca 4, 5 |
| Kế toán đảo tay | `COST_REVERSE_KT` | ngày dòng gốc | dùng hôm nay | `ngayGhiDao` | catch route | ca 6 |
| Kế toán lấy lại giá bảng | `COST_SNAPSHOT_KT` | ngày chạy | 409 | route | catch route | ca 7 |
| Kế toán giá thoả thuận | `COST_AGREED_KT` | ngày chạy | 409 | route | catch route | ca 7 |

Rà lại bằng `grep -n "INSERT INTO vc_trip_cost_line" src/modules/van-chuyen/*.ts | grep -v test` (hôm nay sáu câu); có câu mới thì thêm dòng.

- [ ] **Step 1: Bài thuần đỏ** (thêm vào `src/modules/van-chuyen/tien-xe.test.ts`):

```ts
test("ngayGhiDao / ngayDieuChinhMacDinh: tháng đã khoá ⇒ hôm nay; tháng mở ⇒ ngày gốc", () => {
  const kyDaKhoa = (n: string) => n.startsWith("2026-09");
  assert.equal(ngayGhiDao({ occurredDate: "2026-09-20" }, { homNay: "2026-10-08", kyDaKhoa }), "2026-10-08");
  assert.equal(ngayGhiDao({ occurredDate: "2026-10-02" }, { homNay: "2026-10-08", kyDaKhoa }), "2026-10-02");
  assert.equal(ngayDieuChinhMacDinh({ trangThai: "DONE", ngayHuy: null, ngayChay: "2026-09-28", homNay: "2026-10-08", kyDaKhoa }), "2026-10-08");
  assert.equal(ngayDieuChinhMacDinh({ trangThai: "CANCELLED", ngayHuy: "2026-10-01", ngayChay: "2026-09-28", homNay: "2026-10-08", kyDaKhoa }), "2026-10-01");
});
```

(Giá trị `trangThai` lấy từ kiểu `TrangThaiChuyenTien` thật; "DONE" chỉ là ví dụ — dùng một trạng thái không phải `CANCELLED` có trong kiểu.) Thêm ca cho `keHoachChiPhiKhiDoi`: dòng gốc tháng 9 đã khoá ⇒ dòng đảo mang `homNay`; đổi sang xe thuê với ngày chạy tháng 9 đã khoá ⇒ trả `{ loi: "period_closed", thang: "2026-09" }`. Mọi bài cũ gọi các hàm này (`tien-xe.test.ts`, `so-vang-chi-phi-xe.test.ts`, `tien-xe-route.test.ts`) truyền `kyDaKhoa: () => false` — sổ vàng chi phí xe giữ nguyên số.

- [ ] **Step 2: Đỏ** `node --test src/modules/van-chuyen/tien-xe.test.ts`.

- [ ] **Step 3: Sửa hàm thuần.** `ngayGhiDao`: tham số `kyDaKhoa` bắt buộc (bỏ `?`), thân giữ nguyên; xoá chú thích "CHỖ NỐI khoá kỳ … CHƯA có trên main". `ngayDieuChinhMacDinh`: `const mac = <như cũ>; return v.kyDaKhoa(mac) ? v.homNay : mac;`. `keHoachChiPhiKhiDoi`: nhận `kyDaKhoa`, truyền vào `ngayGhiDao`; nếu kế hoạch có `chup` mà `kyDaKhoa(ngayChay)` ⇒ trả `{ loi: "period_closed", thang: kyCua(ngayChay) }` (đọc hàm để biết ngày chạy nằm ở trường nào của tham số; thêm trường `ngayChay` vào tham số nếu chưa có). `keHoachChiPhiKhiHuy(dong, homNay, kyDaKhoa)`.

- [ ] **Step 4: Nơi gọi.** `index.ts` (gọi `keHoachChiPhiKhiDoi`) và `dieu-phoi-lenh.ts` (gọi `keHoachChiPhiKhiDoi`, `keHoachChiPhiKhiHuy`): đọc `const kyDaKhoa = kyDaKhoaTu(new Set(await thangDaKhoa(env.DB)))` MỘT lần trước khi lập kế hoạch; kế hoạch trả `loi: "period_closed"` ⇒ `error(409, "period_closed", cauKyKhoa(thang))` trước khi gửi lô. `tien-xe-chi-phi.ts`: điều chỉnh — `b.ngay` thuộc tháng khoá ⇒ 409 `cauKyKhoa`; mặc định qua `ngayDieuChinhMacDinh` mới; đảo tay — `ngayGhiDao` với `kyDaKhoa`; lấy lại giá bảng và giá thoả thuận — `kyDaKhoa(nc.trip.service_date)` ⇒ 409 `cauKyKhoa(kyCua(service_date))`.

- [ ] **Step 5: Dịch lỗi trigger.** Mỗi `catch` quanh lô có câu chi phí xe (`grep -n "batch(" src/modules/van-chuyen/*.ts | grep -v test` — lô chuyến ở `index.ts`, `dieu-phoi-lenh.ts`, lô Kế toán ở `tien-xe-chi-phi.ts`) gọi ĐẦU catch: `const cau = await cauTriggerKhoa(env.DB, e, [<các ngày của dòng chi phí trong lô>]); if (cau) return error(409, "period_closed", cau);`. `loiTienXe` (đồng bộ) không đổi — nó không biết ngày; đường dịch khoá tháng đi qua `cauTriggerKhoa` ở catch. Lô chuyến KHÔNG có dòng chi phí xe (vd đổi giờ chuyến xe công ty) không cần đọc tháng khoá.

`src/architecture.test.ts`: `ALLOWED_EDGES["van-chuyen"]` thêm `"ky-so"` (chú thích NỚI như Task 7); `VIEW_CHO_TRIGGER_VC` thêm `v_ky_closed_period` nếu Task 1 chưa thêm (trigger `vc_trip_cost_line_period_closed` đọc view này).

- [ ] **Step 6: Bài route** `src/modules/van-chuyen/khoa-thang-xe.test.ts` (khung thử; khuôn gieo chuyến xe thuê có chi phí lấy từ `tien-xe-route.test.ts` — chép hàm gieo; khoá tháng bằng route `POST /api/ledger/ky/2026-09/khoa` của KT sau khi gieo dòng chi phí tháng 9). Bảy ca theo bảng trên; thêm ca 8 **Review Focus 3** trên một `world()` RIÊNG chưa khoá tháng nào (ca 1–7 đã khoá 2026-09 bằng route): `chenTruocLo(w, /INSERT INTO vc_trip_cost_line/, () => w.sqlite.exec(khoaThang("2026-09")))` (hai hàm phụ chép từ `src/modules/billing/khoa-thang.test.ts` của Task 7) rồi Kế toán ghi điều chỉnh ngày `2026-09-25` (tháng chưa khoá lúc route kiểm) ⇒ 409 câu "Tháng 09/2026 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)", không 500, không dòng chi phí mới.

Khung thử có thể không chạy được route Kế toán chi phí xe cho ngày quá khứ nếu chuyến phải "đã chạy": khi đó gieo chuyến với `service_date` tháng 9 bằng SQL theo khuôn `tien-xe-route.test.ts`, không nới luật.

- [ ] **Step 7: Xanh.** `node --test src/modules/van-chuyen/*.test.ts` rồi `npm run typecheck && npm test`.

- [ ] **Step 8: P16.** (a) Bỏ `kyDaKhoa` khỏi một nơi gọi `ngayGhiDao` (truyền `() => false`) ⇒ ca 1 hoặc 6 đỏ (409 thay vì dòng đảo mang hôm nay — trigger chặn) ⇒ hoàn nguyên. (b) Bỏ `cauTriggerKhoa` ở catch của `tien-xe-chi-phi.ts` ⇒ ca 8 đỏ (500) ⇒ hoàn nguyên. Ghi sổ.

- [ ] **Step 9: Commit.**

```bash
git add src docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md
git commit -m "Khoá sổ tháng ở chi phí xe thuê: dòng đảo và ngày mặc định sang hôm nay, ngày tự chọn và chụp giá vào tháng khoá bị chặn" -m "Chi phí xe không dùng hôm nay làm mặc định (ADR-0095), nên khoá tháng phải có luật ngày riêng (đặc tả §8, N2). Lỗi trigger khi tháng bị khoá giữa chừng dịch ra câu tiếng Việt ở mọi lô có dòng chi phí." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Kiểm định kỳ: R-PRC-1…5, R-ORD-T1, R-ORD-T1w, R-ORD-T2, R-KY-1, R-KY-2

**Files:**
- Modify: `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts`

**Interfaces:**
- Consumes: bảng / view Task 1 (`prc_*`, `ord_service_terms`, `ord_audit_cutoff`, `ky_period_close`); hàm phụ `overlap(table, keyCols, from)` và khuôn mục `{ code, what, sql, level, mode?, note? }` của `scripts/audit-checks.mjs`; trong bài: `one(code)`, `violations(db, check)`, `build()`.
- Produces: mười mã kiểm mới, mỗi mã có ca đỏ và ca xanh.

- [ ] **Step 1: Bài đỏ** (thêm vào `src/audit-invariants.test.ts`; `build()` dựng CSDL đủ migration, gieo dữ liệu tối thiểu bằng SQL theo khuôn bài đang có). Mỗi mã một `test`, mỗi test hai nửa: dữ liệu sạch ⇒ `violations(db, one(code)).length === 0`; một dòng vi phạm ⇒ `=== 1` (trigger nào chặn việc tạo vi phạm thì tạm `DROP TRIGGER` của đúng trigger đó trong bài — kiểm định kỳ là lớp thứ hai cho chính trường hợp trigger bị lách, ghi chú dòng đó trong bài):
  - `R-PRC-1` (lỗi): hai dòng mức cùng (áp cho, phạm vi, mã) chồng hiệu lực — dùng `overlap("prc_commission_rule", [...], "valid_from_date")` nếu hàm phụ nhận đúng dạng; không thì viết SQL tự nối.
  - `R-PRC-2` (lỗi): `target_role_code` không thuộc `prc_beneficiary_role` đang bật.
  - `R-PRC-3` (lỗi): dòng điều khoản có `cost_rate_bp` mà người bán là công ty chủ, hoặc người bán ≠ công ty chủ mà không mở vai `SUPPLIER`, hoặc người bán ≠ công ty chủ mà không có `cost_rate_bp`.
  - `R-PRC-4` (lỗi): dòng có `cost_rate_bp` cho nhóm `TXE` hoặc cho mã thuộc nhóm `TXE` (qua `v_ctl_service_group`).
  - `R-PRC-5` (cảnh báo): mức còn hiệu lực hôm nay có `target_party_id` không còn mở vai được hưởng nào.
  - `R-ORD-T1` (lỗi): dòng dịch vụ của đơn `confirmed` có `confirmed_at >= cutoff + 60 phút` (cutoff = `ord_audit_cutoff.cutoff_at` dòng `R-ORD-T1`) mà không có đúng một bản chụp hiện hành. Ca: đơn xác nhận trước mốc thiếu chụp ⇒ không lỗi; đơn trong ân hạn thiếu chụp ⇒ không lỗi; đơn sau ân hạn thiếu chụp ⇒ lỗi; đơn sau ân hạn đủ chụp ⇒ sạch. So giờ bằng `julianday` hoặc `strftime('%s', …)` cho cả hai vế (chuỗi ISO có `Z` của máy chủ — không so chuỗi thô với `datetime()` vì khác định dạng).
  - `R-ORD-T1w` (cảnh báo, `mode` liệt kê): đơn `confirmed` chưa "Đã giao", `confirmed_at < cutoff + 60 phút`, thiếu bản chụp — kèm mã đơn.
  - `R-ORD-T2` (lỗi): bản chụp `MANUAL` có `reason` rỗng; bản `SET` không có đúng một trong `commission_rate_bp` / `commission_per_pax`.
  - `R-KY-1` (lỗi): dòng ở `bil_payment_receipt`, `bil_posting`, `bil_outside_refund`, `vc_trip_cost_line` có tháng của `occurred_date` đã khoá và `created_at > closed_at` của tháng đó.
  - `R-KY-2` (lỗi): các tháng đã khoá không liền nhau (tháng `p` mà `p` không phải tháng nhỏ nhất và tháng liền trước `p` không có trong bảng).

- [ ] **Step 2: Đỏ** `node --test src/audit-invariants.test.ts`.

- [ ] **Step 3: Viết mười mục** trong `scripts/audit-checks.mjs` theo đúng khuôn mục hiện có (mỗi mục có `what` tiếng Việt nói rõ hỏng gì, `note` trỏ đặc tả §9). Câu SQL chỉ đọc. Mức: tám mã "lỗi" dùng mức lỗi thường của tệp; `R-PRC-5` và `R-ORD-T1w` dùng `level: "warn"` (cảnh báo VĨNH VIỄN — không làm đỏ kể cả `--strict` mà e2e và runbook dùng), KHÔNG dùng `'warn-unless-strict'`.

- [ ] **Step 4: Xanh** `node --test src/audit-invariants.test.ts`, rồi `npm run db:migrate:local` trên D1 local tạm của e2e (hoặc chạy ở Task 13) và `node scripts/audit-invariants.mjs --db local` ⇒ thoát 0.

- [ ] **Step 5: P16.** Đổi `+ 60 phút` của `R-ORD-T1` thành `+ 0` ⇒ ca "trong ân hạn" đỏ ⇒ hoàn nguyên. Ghi sổ.

- [ ] **Step 6: Commit.**

```bash
git add scripts/audit-checks.mjs src/audit-invariants.test.ts docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md
git commit -m "Kiểm định kỳ sổ đại lý: bảng mức, bản chụp đơn, khoá tháng" -m "Lớp thứ hai sau trigger: phát hiện dòng mức chồng, điều khoản người bán sai, đơn xác nhận sau đợt 1 mà thiếu bản chụp (mốc lúc migration + 60 phút ân hạn), tiền ghi vào tháng đã khoá." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Màn "Hoa hồng đối tác" (`/hoa-hong`) và "Người bán dịch vụ" (`/nguoi-ban`)

**Files:**
- Create: `src/shared/so-dai-ly-nhap.ts` (+ `.test.ts`) — đọc ô nhập tỷ lệ / tiền / ngày của hai màn (thuần, có bài)
- Create: `public/hoa-hong.html`, `web/hoa-hong.ts`, `public/nguoi-ban.html`, `web/nguoi-ban.ts`
- Modify: `package.json` (`build:web`), `src/shared/sw-policy.ts` (`PAGES`, `PRECACHE`), `web/shell.ts` (nhóm `management`), `web/account.ts` (mục ở tab "Tôi"), `public/app.css` (chỉ khi cần lớp mới — chỉ token), `src/shared/so-do-trang.ts` (sinh)

**Interfaces:**
- Consumes: route Task 3 (`GET/POST /api/pricing/hoa-hong`, `POST …/:id/dong`, `GET /api/pricing/thu-tra`, `GET/POST /api/pricing/cung-ung`, `POST …/:id/dong`, `GET /api/pricing/nguoi-huong`); DTO `CommissionRuleListResponse`, `SupplyTermListResponse`, `ThuTraResponse`, `NguoiHuongTimResponse` (qua `Api.*` của `web/api.ts`); `nhanMuc`, `nhanTyLeBp`, `NHAN_LY_DO_THIEU` (Task 5); `GET /api/catalog…` hiện có để chọn dịch vụ / nhóm (dùng `web/catalog-picker.ts` nếu hợp; không thì danh sách chọn đọc route danh mục đang dùng ở form đơn).
- Produces: `docTyLePhanTram(raw: string): { ok: true; bp: number } | { ok: false; message: string }`, `docTienMoiKhach(raw: string): { ok: true; dong: number } | { ok: false; message: string }`; hai trang với id phần tử cố định cho kịch bản Chrome (Task 13): `#muc-list`, `#muc-add-form`, `#thu-tra-form`, `#thu-tra-ket-qua`, `#dk-list`, `#dk-add-form`.

- [ ] **Step 1: Bài đỏ** `src/shared/so-dai-ly-nhap.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { docTienMoiKhach, docTyLePhanTram } from "./so-dai-ly-nhap.ts";
test("docTyLePhanTram: dấu phẩy hoặc chấm, tối đa hai chữ số thập phân, 0…100", () => {
  assert.deepEqual(docTyLePhanTram("12,5"), { ok: true, bp: 1250 });
  assert.deepEqual(docTyLePhanTram("12.5"), { ok: true, bp: 1250 });
  assert.deepEqual(docTyLePhanTram(" 15 "), { ok: true, bp: 1500 });
  assert.deepEqual(docTyLePhanTram("0"), { ok: true, bp: 0 });
  assert.deepEqual(docTyLePhanTram("100"), { ok: true, bp: 10000 });
  assert.deepEqual(docTyLePhanTram("0,01"), { ok: true, bp: 1 });
  for (const sai of ["", "abc", "12,555", "100,01", "-1", "1e2", "12,5%x"]) assert.equal(docTyLePhanTram(sai).ok, false, sai);
  assert.deepEqual(docTyLePhanTram("12,5%"), { ok: true, bp: 1250 }, "cho phép dấu % ở cuối");
});
test("docTienMoiKhach: số nguyên đồng, bỏ dấu chấm nghìn", () => {
  assert.deepEqual(docTienMoiKhach("50.000"), { ok: true, dong: 50_000 });
  assert.deepEqual(docTienMoiKhach("0"), { ok: true, dong: 0 });
  for (const sai of ["", "50,5", "-1", "abc"]) assert.equal(docTienMoiKhach(sai).ok, false, sai);
});
```

- [ ] **Step 2: Đỏ** `node --test src/shared/so-dai-ly-nhap.test.ts`.

- [ ] **Step 3: Viết** `src/shared/so-dai-ly-nhap.ts`:

```ts
// Đọc ô nhập của màn bảng mức / người bán (thuần). Tỷ lệ lưu bằng PHẦN VẠN nguyên (12,5% = 1250) — không số thực ở bất kỳ đâu.
export function docTyLePhanTram(raw: string): { ok: true; bp: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/%$/, "").trim();
  const m = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(s);
  if (!m) return { ok: false, message: "Tỷ lệ là số từ 0 tới 100, tối đa hai chữ số sau dấu phẩy (vd 12,5)." };
  const bp = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
  return bp <= 10_000 ? { ok: true, bp } : { ok: false, message: "Tỷ lệ không quá 100%." };
}
export function docTienMoiKhach(raw: string): { ok: true; dong: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/\./g, "");
  if (!/^\d{1,9}$/.test(s)) return { ok: false, message: "Số tiền mỗi khách là số nguyên đồng (vd 50.000)." };
  return { ok: true, dong: Number(s) };
}
```

- [ ] **Step 4: Xanh** `node --test src/shared/so-dai-ly-nhap.test.ts`.

- [ ] **Step 5: Hai trang** theo công thức c của `docs/CHANGE-GUIDE.md` (khuôn `public/locations.html` + `web/locations.ts`: `initShell` đầu tiên, hàm `act()` khoá nút khi ghi, lỗi qua `showError`, bảng `.table-wrap` cho máy tính + `.card-list` cho điện thoại, không `innerHTML`, dựng bằng `h()`).

  **`/hoa-hong`** — tiêu đề "Hoa hồng đối tác", dòng mô tả "Mức hoa hồng cho đối tác theo dịch vụ. Mức không sửa, không xoá được — chỉ thêm mức mới và đóng mức cũ." Ba khối:
  1. **Danh sách** (`#muc-list` / thẻ): cột Áp cho (tên vai hoặc tên đối tác), Phạm vi ("Dịch vụ HONTAM" / "Nhóm Du thuyền" / "Mọi dịch vụ" — tên nhóm, tên dịch vụ lấy từ danh mục đã nạp, không in mã thô nếu có tên), Mức (`nhanMuc`), Từ ngày, Đến ngày ("—" khi mở), trạng thái ("Đang áp" / "Đã đóng" theo `conHieuLuc`), nút "Đóng mức" (chỉ khi `can(staff, "partner.commission.write")` và dòng còn mở) ⇒ hộp nhỏ chọn "Ngày kết thúc" (mặc định hôm nay) ⇒ `POST …/:id/dong`. Lọc trên máy: "Đang áp / Tất cả", ô tìm theo tên đối tượng.
  2. **Thêm mức** (`#muc-add-form`, chỉ khi có `partner.commission.write`): "Áp cho" — hai lựa chọn "Loại đối tác" (danh sách `vai` của phản hồi) hoặc "Một đối tác" (ô tìm gọi `GET /api/pricing/nguoi-huong?q=` có trễ 300 ms, tối đa 20 kết quả); "Phạm vi" — "Một dịch vụ" / "Một nhóm dịch vụ" / "Mọi dịch vụ"; "Kiểu" — "Phần trăm" (ô `docTyLePhanTram`) / "Số tiền mỗi khách" (ô `docTienMoiKhach`, `inputmode="numeric"`); "Từ ngày" (mặc định hôm nay), "Đến ngày" (tuỳ chọn), "Ghi chú". Lỗi đọc ô hiện ngay dưới ô, không gửi.
  3. **Thử tra** (`#thu-tra-form`, ai xem được trang đều dùng): chọn đối tác (ô tìm như trên), dịch vụ, ngày ⇒ `GET /api/pricing/thu-tra` ⇒ `#thu-tra-ket-qua` in "Áp mức <nhanMuc> — <lời bậc>" với lời bậc: 1 "mức riêng của đối tác cho dịch vụ này", 2 "mức riêng của đối tác cho nhóm", 3 "mức riêng của đối tác cho mọi dịch vụ", 4 "mức của loại đối tác cho dịch vụ này", 5 "… cho nhóm", 6 "… cho mọi dịch vụ"; `MISSING` ⇒ câu `lyDo`; `NONE` ⇒ "Không có người hưởng hoa hồng".

  **`/nguoi-ban`** — tiêu đề "Người bán dịch vụ", mô tả "Dịch vụ nào do Tour Đảo bán, dịch vụ nào do nhà cung cấp bán và Tour Đảo mua lại bao nhiêu phần trăm." Danh sách (`#dk-list`): Phạm vi, Người bán (tên; công ty chủ ghi "Tour Đảo (công ty)"), Tỷ lệ mua lại (`nhanTyLeBp` hoặc "—"), Từ ngày, Đến ngày, nút "Đóng" (có `supply.terms.write`); dòng "Mọi dịch vụ" của công ty có hộp xác nhận riêng: "Đóng dòng mặc định thì dịch vụ chưa có điều khoản riêng sẽ thiếu người bán cho tới khi mở dòng mới. Vẫn đóng?". Thêm (`#dk-add-form`): Phạm vi, Người bán (chọn "Tour Đảo" hoặc một hồ sơ trong `nhaCungCap`), Tỷ lệ mua lại (chỉ hiện khi chọn nhà cung cấp; bắt buộc), Từ ngày, Đến ngày, Ghi chú. Nhóm "Thuê xe" vẫn chọn được ở giao diện; máy chủ trả 409 câu tiếng Việt và trang hiện câu đó.

  Trang tự ẩn khối ghi khi thiếu ô ghi; người không có ô xem mở trang ⇒ máy chủ 403 ⇒ `showError` "Bạn không có quyền xem trang này." (khuôn trang khác).

- [ ] **Step 6: Đăng ký trang.** `package.json` `build:web` thêm `web/hoa-hong.ts web/nguoi-ban.ts`; `src/shared/sw-policy.ts` thêm `"/hoa-hong"`, `"/nguoi-ban"` vào `PAGES` và `"/hoa-hong"`, `"/js/hoa-hong.js"`, `"/nguoi-ban"`, `"/js/nguoi-ban.js"` vào `PRECACHE`. Điều hướng: `web/shell.ts` nhóm `management` (máy tính) thêm `{ href: "/hoa-hong", label: "Hoa hồng đối tác", icon: <biểu tượng có sẵn gần nghĩa nhất trong web/icons.ts>, active: (p) => p === "/hoa-hong" }` khi `can(staff, "partner.commission.view")` và `{ href: "/nguoi-ban", label: "Người bán dịch vụ", … }` khi `can(staff, "supply.terms.view")`; mảng `active` của tab "Tôi" (điện thoại) thêm hai đường; `web/account.ts` thêm hai dòng mục cùng điều kiện. Ẩn/hiện ở web không thay cổng của route (công thức e).

- [ ] **Step 7: Kiểm.** `npm run build:web` (sinh lại `src/shared/so-do-trang.ts` — commit cùng), `npm test` (`sw-policy.test.ts` so `PAGES` với `public/*.html`), `npm run typecheck`. Mở thử bằng `npm run dev` hoặc `node scripts/dev-iphone.mjs` với tài khoản Kế toán, Bán hàng: kịch bản Chrome viết ở Task 13.

- [ ] **Step 8: Commit.**

```bash
git add src/shared/so-dai-ly-nhap.ts src/shared/so-dai-ly-nhap.test.ts public/hoa-hong.html public/nguoi-ban.html web/hoa-hong.ts web/nguoi-ban.ts web/shell.ts web/account.ts package.json src/shared/sw-policy.ts src/shared/so-do-trang.ts public/app.css
git commit -m "Màn Hoa hồng đối tác và Người bán dịch vụ" -m "Kế toán đặt và đóng mức hoa hồng, thử tra mức nào thắng cho một đối tác và một dịch vụ; khai người bán và tỷ lệ mua lại. Tỷ lệ nhập dạng 12,5 được đổi thành phần vạn nguyên ở một hàm thuần có bài." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Trang đơn và form lập đơn: khối "Phần đối tác", ghi mức tay, nhãn bên đặt, ô "Đặt qua đối tác"

**Files:**
- Create: `web/phan-doi-tac.ts` (khối "Phần đối tác" + bảng trượt "Ghi mức tay"), `web/dat-qua-doi-tac.ts` (ô "Đặt qua đối tác")
- Modify: `web/order.ts` (gắn khối; nhãn "Bên đặt (đối tác)"), `web/order-form.ts` (ô "Đặt qua đối tác", dòng chỉ đọc cho tài khoản Đối tác, nạp lại nháp), `web/booker-sheet.ts` (ô "Đặt qua đối tác" ở bảng đổi bên đặt), `public/order.html`, `public/order-form.html` (chỗ gắn nếu trang cần phần tử tĩnh), `public/app.css` (chỉ token), `package.json` không đổi (hai tệp mới được `order.ts`/`order-form.ts` import, esbuild gói chung), `src/shared/so-do-trang.ts` (sinh)

**Interfaces:**
- Consumes: `GET /api/orders/:id/thuong-mai` (`ThuongMaiResponse`), `POST /api/orders/:id/thuong-mai/:serviceId` (Task 5); `OrderDetailDto.bookerLaDoiTac` (Task 6); `GET /api/pricing/nguoi-huong` (Task 3); `CAU_THIEU_MUC`, `nhanMuc` (Task 5); `docTyLePhanTram`, `docTienMoiKhach` (Task 10).
- Produces: `initPhanDoiTac(host: HTMLElement, v: { orderId: string; coGhiTay: boolean; xemNguoiBan: boolean }): Promise<void>`; `oDatQuaDoiTac(v: { daChon: { partyId: string; ten: string } | null; onDoi: (chon: { partyId: string; ten: string } | null) => void }): HTMLElement`; id cố định: `#phan-doi-tac`, `#ghi-tay-sheet`, `#dat-qua-doi-tac`.

- [ ] **Step 1: Khối "Phần đối tác"** (`web/phan-doi-tac.ts`). Trang đơn gọi khối khi `can(staff, "order.terms.view", { ownerId, assigned })` (cùng phạm vi trang đơn đang dùng cho ô tiền). Hai dạng theo phản hồi:
  - `vanPhong`: tiêu đề "Phần đối tác" + dòng "Người hưởng: <tên>" (hoặc "Không có người hưởng hoa hồng"); đơn nháp ⇒ nhãn "Dự kiến — tính theo bảng mức hôm nay, chưa lưu"; `chuaChup` ⇒ "Đơn xác nhận trước khi có bảng mức". Bảng: Dịch vụ, Thành tiền, Khách tính, Mức, Hoa hồng, Giá đại lý, Người bán; dòng thiếu mức tô màu cảnh báo (token cảnh báo có sẵn) với câu `thieu` + " · " + `CAU_THIEU_MUC`; dòng ghi tay có nhãn "ghi tay". Khối nhà cung cấp (khi có `nhaCungCap`): "Mua lại <tyLeMua> — giá vốn <giaVon>". Hàng tổng; tổng hoa hồng `null` ⇒ "Chưa đủ mức". Nút "Ghi mức tay" từng dòng khi `coGhiTay` (`can(staff, "order.terms.override")`) và đơn đã xác nhận, chưa "Đã giao", không `chuaChup`.
  - `doiTac`: tiêu đề "Hoa hồng của bạn"; bảng Dịch vụ, Thành tiền, Hoa hồng, Giá đại lý; `choCongTyCaiMuc` ⇒ dòng "Đang chờ Công ty cài mức cho một số dịch vụ". Không có cột Mức, không người bán.
  - Bảng trượt "Ghi mức tay" (`#ghi-tay-sheet`, dùng bảng trượt chung của `web/` như `booker-sheet.ts`): Kiểu ("Phần trăm" / "Số tiền mỗi khách" / "Không đổi hoa hồng"), ô số, khối người bán tuỳ chọn ("Không đổi" / "Tour Đảo" / chọn nhà cung cấp + tỷ lệ mua lại — danh sách nhà cung cấp lấy từ `GET /api/pricing/cung-ung` CHỈ khi người dùng có `supply.terms.view`; không có thì ẩn khối người bán), "Lý do" bắt buộc (≥ 10 ký tự, đếm ký tự hiện dưới ô). Gửi ⇒ phản hồi là phần thương mại mới ⇒ vẽ lại khối. 409 ⇒ hiện câu máy chủ và nạp lại khối.

- [ ] **Step 2: Nhãn bên đặt** (`web/order.ts`, dòng "Hồ sơ khách"): `order.bookerLaDoiTac` ⇒ nhãn "Bên đặt (đối tác)", không thì giữ nhãn cũ. Không suy ở giao diện.

- [ ] **Step 3: Ô "Đặt qua đối tác"** (`web/dat-qua-doi-tac.ts`): nút "Đặt qua đối tác" ⇒ ô tìm theo tên (`GET /api/pricing/nguoi-huong?q=`, trễ 300 ms) ⇒ chọn ⇒ hiện "Đặt qua: <tên>" + nút "Bỏ chọn". `web/order-form.ts`: khi đã chọn, ô tra hồ sơ khách theo SĐT (`booker-picker`) ẩn đi, hai ô tên + SĐT khách vẫn hiện và vẫn là khách đi tour; thân gửi `bookerPartyId = partyId` đã chọn; bỏ chọn ⇒ trở lại như cũ. Tài khoản `holdsPartner(staff)` mà DTO tài khoản cho biết hồ sơ được hưởng (dùng cờ có sẵn của `/api/auth/me` nếu có; không có thì hiện dòng chỉ đọc "Bên đặt: <tên hồ sơ của bạn>" khi tài khoản giữ PARTNER và có hồ sơ — máy chủ quyết thật ở Task 6) ⇒ thay ô chọn người đặt bằng dòng chỉ đọc đó. Mở lại nháp: bên đặt đang lưu có `bookerLaDoiTac` ⇒ nạp vào ô "Đặt qua đối tác" (không vào ô tra SĐT). `web/booker-sheet.ts`: thêm cùng ô ở bảng đổi bên đặt.

- [ ] **Step 4: Kiểm.** `npm run build:web` (commit `src/shared/so-do-trang.ts` nếu đổi), `npm run typecheck`, `npm test`. Chạy lại ba `a2-smoke-*.mjs` ở `docs/evidence/2026-09-20-a2/kich-ban/` (web/CLAUDE.md: sửa `order-form.ts`, `order.ts` thì chạy chúng) và `chon-hdv-lap-don-smoke.mjs` — xanh như trước. Kịch bản mới viết ở Task 13.

- [ ] **Step 5: Commit.**

```bash
git add web public src/shared/so-do-trang.ts
git commit -m "Trang đơn: khối Phần đối tác và ghi mức tay; form đơn: ô Đặt qua đối tác" -m "Văn phòng thấy mức, hoa hồng, giá đại lý từng dịch vụ, Kế toán ghi mức tay có lý do; Đối tác chỉ thấy số tiền hoa hồng của mình. Chọn đại lý bằng ô riêng để tên và SĐT khách đi tour không bị đè (đặc tả §7)." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Màn "Khoá tháng" (`/khoa-thang`)

**Files:**
- Create: `public/khoa-thang.html`, `web/khoa-thang.ts`
- Modify: `package.json` (`build:web`), `src/shared/sw-policy.ts`, `web/shell.ts`, `web/account.ts`, `src/shared/so-do-trang.ts` (sinh)

**Interfaces:**
- Consumes: `GET /api/ledger/ky`, `POST /api/ledger/ky/:period/khoa` (Task 7), `KySoResponse`.
- Produces: trang với `#ky-da-khoa`, `#ky-bang-kiem`, `#ky-khoa-btn`.

- [ ] **Step 1: Trang** (khuôn công thức c): tiêu đề "Khoá sổ tháng"; mô tả "Khoá một tháng đã qua: sau khi khoá, không ai ghi thêm tiền có ngày trong tháng đó — sai sót ghi vào tháng đang mở bằng điều chỉnh có lý do. Không mở lại được." Khối "Các tháng đã khoá" (`#ky-da-khoa`, "Chưa khoá tháng nào" khi rỗng). Khối "Tháng khoá được kế tiếp: MM/YYYY" + bảng kiểm (`#ky-bang-kiem`): "Khoản Công ty thu – chuyển khoản chờ xác nhận" (số khoản + danh sách mã đơn, số tiền, ngày), "Lần thu chưa rõ người thu" (như trên), "Số dư từng bên cuối tháng" (tên, số dư); mỗi khối rỗng ghi "Không có". Bảng kiểm không chặn. Nút "Khoá tháng MM/YYYY" (`#ky-khoa-btn`, chỉ khi `coTheKhoa`) ⇒ hộp xác nhận: "Khoá sổ tháng MM/YYYY? Việc này KHÔNG mở lại được. Muốn sửa sau khi khoá chỉ còn cách khôi phục cả cơ sở dữ liệu." + ô ghi chú tuỳ chọn ⇒ `POST` ⇒ vẽ lại theo phản hồi. `keTiep === null` ⇒ "Chưa có tháng nào khoá được (tháng hiện tại chưa qua)."

- [ ] **Step 2: Đăng ký** như Task 10 Bước 6: `build:web` thêm `web/khoa-thang.ts`; `PAGES` `"/khoa-thang"`; `PRECACHE` `"/khoa-thang"`, `"/js/khoa-thang.js"`; `management` thêm `{ href: "/khoa-thang", label: "Khoá sổ tháng", … }` khi `can(staff, "ledger.view")` (không ngữ cảnh = any — Kế toán, Toàn quyền); tab "Tôi" và `web/account.ts` cùng điều kiện.

- [ ] **Step 3: Kiểm.** `npm run build:web`, `npm test`, `npm run typecheck`.

- [ ] **Step 4: Commit.**

```bash
git add public/khoa-thang.html web/khoa-thang.ts web/shell.ts web/account.ts package.json src/shared/sw-policy.ts src/shared/so-do-trang.ts
git commit -m "Màn Khoá sổ tháng" -m "Kế toán xem các tháng đã khoá, bảng kiểm của tháng kế tiếp và khoá có hộp xác nhận nói rõ không mở lại được (đặc tả §8, §13)." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Thử đầu–cuối, kịch bản Chrome, ảnh thật

**Files:**
- Create: `tests/e2e/so-dai-ly.mjs`, `tests/e2e/khoa-thang.mjs`, `docs/evidence/2026-10-08-so-dai-ly-dot-1/README.md`, `docs/evidence/2026-10-08-so-dai-ly-dot-1/kich-ban/so-dai-ly-smoke.mjs`, ảnh `docs/evidence/2026-10-08-so-dai-ly-dot-1/anh/*.png`
- Modify: `tests/e2e/run.mjs` (`ALL`, `THOI_GIAN`), `tests/e2e/README.md` (bảng kịch bản)

**Interfaces:**
- Consumes: mọi route Task 3–7; `login()`/`session()` của `tests/e2e/lib.mjs` (Turnstile bật — luôn qua hai hàm này), tài khoản `salesA`, `accountant`, `admin`, `field` của `ACCOUNTS`.
- Produces: hai kịch bản e2e trong `ALL`; một kịch bản Chrome + ảnh hai khổ (390 px điện thoại, 1040 px máy tính) cho chủ duyệt một lượt (điều A3).

- [ ] **Step 1: `tests/e2e/so-dai-ly.mjs`** (D1 local tạm, cùng khuôn kịch bản khác — đọc `tests/e2e/qr-thanh-toan.mjs` làm mẫu). Các bước, mỗi bước một `assert` có câu tiếng Việt:
  1. `accountant` tạo hồ sơ tổ chức "Đại lý E2E <Date.now()>" mang vai `TRAVEL_AGENCY` qua route hồ sơ hiện có (khuôn `tests/e2e/parties.mjs`).
  2. `accountant` thêm mức `TRAVEL_AGENCY` · mọi dịch vụ · 10% từ hôm nay ⇒ 201 + `Location: /hoa-hong`; thêm trùng ⇒ 409; `salesA` thêm ⇒ 403; `field` `GET /api/pricing/hoa-hong` ⇒ 403.
  3. `salesA` lập đơn với `bookerPartyId` = đại lý vừa tạo, một dịch vụ thật của danh mục (khuôn lập đơn ở `tests/e2e/orders.mjs`) ⇒ 201; `GET …/thuong-mai` đơn nháp ⇒ `vanPhong.duKien === true`.
  4. `salesA` xác nhận đơn ⇒ 200; `GET …/thuong-mai` ⇒ hoa hồng = `lamTronNuaLen(1000 × thành tiền, 10000)` (tự tính trong kịch bản từ DTO đơn), `duKien === false`.
  5. `accountant` đóng mức (`denNgay` = hôm nay); đơn đã xác nhận GET lại ⇒ hoa hồng KHÔNG đổi (A-3: bản chụp giữ nguyên).
  6. Đơn khách lẻ của `salesA` xác nhận ⇒ `GET …/thuong-mai` ⇒ `nguoiHuong === null`.
  7. Không đóng dòng điều khoản gieo sẵn `prc-st-goc-all` và không đổi công ty chủ (D1 dùng chung — đặc tả §13).
  
  Thêm `"so-dai-ly"` vào `ALL` của `tests/e2e/run.mjs` sau `"qr-thanh-toan"`; `THOI_GIAN["so-dai-ly"] = 15`; một dòng ở bảng `tests/e2e/README.md`.

- [ ] **Step 2: `tests/e2e/khoa-thang.mjs`** — đặc tả §12 mục 11c: các kịch bản chạy chung D1 trong một nhóm, tháng đã khoá không mở lại được. Kịch bản CHỈ khoá tháng **2025-01** (và **2025-02** để thử liền kề) — không kịch bản nào ghi tiền vào năm 2025 (rà: `grep -rn "2025-0[12]" tests/e2e` phải không thấy ngày phát sinh tiền nào; có thì đổi sang tháng khác chưa ai dùng và ghi vào README). Vì dòng sổ sớm nhất trên D1 e2e là tháng hiện tại, khoá 2025-01 hợp lệ (≤ tháng sổ sớm nhất). Bước:
  1. `admin` `POST /api/ledger/ky/2025-01/khoa` ⇒ 403. `accountant` khoá tháng hiện tại ⇒ 400.
  2. `accountant` khoá `2025-01` ⇒ 201 + `Location: /khoa-thang`; khoá `2025-03` ⇒ 409 (không liền kề); khoá `2025-02` ⇒ 201; khoá `2025-02` lần hai ⇒ 409. (Thứ tự này cố ý: lần khoá đầu tiên trên bảng rỗng phải là `2025-01`, nếu không mọi tháng sau sẽ phải liền kề tháng đã khoá trước.)
  3. `accountant` ghi lần thu cho một đơn đã xác nhận của kịch bản với `ngayPhatSinh: "2025-02-15"` ⇒ 409 câu "Tháng 02/2025 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)". (Đường "ngày phát sinh không được trước ngày lập đơn" nếu có trong luật billing thì sẽ trả lỗi khác trước — đọc `docLanThu`; khi đó dùng đường điều chỉnh `POST /api/ledger/adjustments` loại không gắn đơn nếu có, hoặc ghi chú ở README rằng ca này chỉ kiểm ở khung thử, không ép e2e.)
  4. `GET /api/ledger/ky` (`accountant`) ⇒ `daKhoa` chứa `2025-01`, `2025-02`.
  
  Kịch bản chạy lại trên D1 MỚI mỗi lần (run.mjs dựng D1 tạm) nên khoá 2025-01 không dồn qua lần chạy. Thêm `"khoa-thang"` vào CUỐI `ALL` trước `"passkey"` (giữ ràng buộc "passkey cuối"); `THOI_GIAN["khoa-thang"] = 5`; dòng README ghi rõ "khoá 2025-01/02 trên D1 chung — không kịch bản nào được ghi tiền năm 2025".

- [ ] **Step 3: Chạy e2e đủ bộ.** `npm run test:e2e` (cần mạng). Cuối bộ `audit-invariants --strict` phải thoát 0; nếu `R-ORD-T1` hoặc `R-ORD-T1w` bắn vì một kịch bản cũ chèn thẳng đơn `confirmed` bằng SQL (`grep -rn "status.*'confirmed'\|'confirmed'" tests/e2e/*.mjs`), sửa kịch bản đó để xác nhận qua route hoặc chèn kèm bản chụp (đặc tả §9) — không nới mã kiểm. Ghi số kịch bản xanh vào sổ thi công.

- [ ] **Step 4: Kịch bản Chrome** `docs/evidence/2026-10-08-so-dai-ly-dot-1/kich-ban/so-dai-ly-smoke.mjs` (khuôn `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-form.mjs`; cần Chrome + axe-core ngoài repo — cách chạy `tests/e2e/README.md`; D1 tạm qua `node scripts/dev-iphone.mjs` hoặc `npm run dev` trên D1 local, KHÔNG D1 remote). Trang của tài khoản nào mở SAU CÙNG (chung kho cookie). Các bước, mỗi bước chụp ảnh ở 390 px và 1040 px vào `anh/`:
  1. Kế toán: `/hoa-hong` — danh sách, thêm mức 12,5% cho "Công ty lữ hành" nhóm "Du thuyền", thử tra ra "bậc 5"; ô tỷ lệ gõ "12,555" hiện lỗi dưới ô.
  2. Kế toán: `/nguoi-ban` — thêm i-resort 80% cho một dịch vụ; chọn nhóm Thuê xe hiện câu 409.
  3. Bán hàng: form lập đơn — "Đặt qua đối tác" chọn đại lý, ô tra SĐT ẩn, hai ô khách còn; lưu nháp; mở lại nháp thấy đại lý ở ô "Đặt qua đối tác".
  4. Bán hàng: trang đơn nháp — khối "Phần đối tác" nhãn "Dự kiến"; xác nhận; khối hết nhãn "Dự kiến"; dòng "Bên đặt (đối tác)".
  5. Kế toán: trang đơn có dòng thiếu mức — "Ghi mức tay" 15% có lý do ⇒ khối vẽ lại, dòng có nhãn "ghi tay".
  6. Kế toán: `/khoa-thang` — bảng kiểm, hộp xác nhận (chụp hộp, KHÔNG bấm khoá trên D1 dùng lại; bấm thật chỉ trên D1 tạm dựng riêng cho kịch bản).
  7. Đối tác (mở sau cùng): trang đơn của mình — "Hoa hồng của bạn", không cột Mức; form lập đơn — dòng chỉ đọc "Bên đặt: …".
  Mỗi trang chạy axe-core: 0 lỗi mức nghiêm trọng. `README.md` thư mục bằng chứng: bảng "bước → ảnh → kết quả", lệnh chạy, ngày chạy.

- [ ] **Step 5: Đề xuất dòng cho `web/CLAUDE.md`** (tệp luật — AI không tự sửa, N9): ghi vào `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/de-xuat-luat-dot-1.md` (tạo ở Task 14) một dòng cho bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào": `web/hoa-hong.ts`, `web/nguoi-ban.ts`, `web/khoa-thang.ts`, `web/phan-doi-tac.ts`, `web/dat-qua-doi-tac.ts` ⇒ `so-dai-ly-smoke.mjs`.

- [ ] **Step 6: Gửi ảnh cho chủ** (SendUserFile, `display: "render"`) — một lượt, kèm một câu: chủ duyệt nhãn "Hoa hồng", "Giá đại lý" và bố cục (điều A3). Chưa có lời duyệt thì ghi "chờ chủ duyệt ảnh" ở sổ thi công, không chặn Task 14.

- [ ] **Step 7: Commit.**

```bash
git add tests/e2e docs/evidence/2026-10-08-so-dai-ly-dot-1
git commit -m "Thử đầu–cuối và kịch bản Chrome cho sổ đại lý đợt 1" -m "E2E: mức → lập đơn qua đại lý → xác nhận chụp mức → đóng mức không đổi đơn cũ; khoá tháng chỉ chạm năm 2025 để không làm hỏng kịch bản khác trên D1 chung (đặc tả §12 mục 11c). Ảnh hai khổ để chủ duyệt một lượt." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Tài liệu, sổ hàng rào, sổ vàng, nhật ký thay đổi, đề xuất luật, kiểm độc lập

**Files:**
- Create: `golden/so-cong-no-luot-2.json`, `src/so-vang-so-dai-ly.test.ts`, `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/de-xuat-luat-dot-1.md`
- Modify: `golden/README.md`, `docs/SYSTEM-DESIGN.md` (§5, §6, §7, §8, §17), `docs/CHANGE-GUIDE.md` (§1 bảng, công thức mới, bẫy, §3 ma trận), `docs/SO-HANG-RAO.md`, `docs/HANDOFF-N1.md` (runbook lần phát hành + "Việc còn treo"), `docs/BACKLOG.md`, `src/shared/changelog.ts`, tệp hướng dẫn theo vai của Trợ giúp (`grep -rln "Kế toán" src/shared/huong-dan*.ts`), `docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md`

**Interfaces:**
- Consumes: mọi task trước; `lamTronNuaLen`, `hoaHongDong`, `giaVonDong` (Task 2) cho lớp 2 của sổ vàng.
- Produces: sổ vàng `so-cong-no-luot-2.json` (mọi ca `cho_xac_nhan`), bài sổ vàng riêng, tệp đề xuất luật, tài liệu mô tả khớp mã.

- [ ] **Step 1: Sổ vàng.** `golden/so-cong-no-luot-2.json` — ca A-1, A-2 (hai bước: 3 khách tính ⇒ 150.000; 4 khách tính ⇒ 200.000), A-3, A-4, A-5 (gồm ca nửa đồng 1.000.004 × 12,5% ⇒ 125.001), B-3 (80% × 300.000 ⇒ 240.000), số lấy NGUYÊN từ ví dụ trong ADR-0077/0078 (đọc ADR, không tự đặt số); mỗi ca: `ma`, `mo_ta`, `dau_vao` (thành tiền, khách tính, kiểu, tỷ lệ phần vạn / đ mỗi khách, tỷ lệ mua lại), `dap_an` (hoa hồng, giá đại lý, giá vốn), `xac_nhan: { trang_thai: "cho_xac_nhan" }`. Bài `src/so-vang-so-dai-ly.test.ts`: lớp 1 tự cân mọi ca (giá đại lý = thành tiền − hoa hồng; số nguyên không âm); lớp 2 chạy `hoaHongDong`/`giaVonDong` thật CHỈ ca `da_xac_nhan` (hôm nay chưa có ⇒ `test.todo` có tên ca), ca chờ in chẩn đoán "khớp / lệch mã" (khuôn `src/so-vang-chi-phi-xe.test.ts`). Thêm một dòng ở bảng `golden/README.md`: trạng thái "**A-1…A-5, B-3: CHỜ chủ dự án / Kế toán xác nhận** (AI soạn 2026-10-08; câu trả lời điều A1 của chủ chỉ xác nhận cách làm tròn)". AI không đổi trạng thái ca nào (N8).

- [ ] **Step 2: Sổ hàng rào** (`docs/SO-HANG-RAO.md`): một dòng mỗi nhóm, cột "Đã thấy chặn thật" chép ngày + kết quả từ bảng "Quan sát chặn thật" của sổ thi công (không có quan sát ⇒ không ghi dòng, để là lời khuyên):
  - Trigger bảng mức / điều khoản (`prc_*`, Task 1).
  - Trigger bản chụp đơn (`terms_*`, Task 1) + chuỗi `changes() > 0` của lô xác nhận (Task 4 P16).
  - Trigger khoá tháng (`ky_*`, bốn `*_period_closed`) + bài nguồn `lo-dich-khoa-ky.test.ts` (Task 7).
  - Bài số lạ `src/so-la-doi-tac.test.ts` (Task 5) và bài khoá ⊆ ô quyền (Task 5, 7).
  - Ba chỗ nới hàng rào kiến trúc C12 (Task 1, 7, 8) — cột ghi chú "NỚI đã duyệt C12".
  - Kiểm định kỳ R-PRC-*, R-ORD-T1/T1w/T2, R-KY-* (Task 9).

- [ ] **Step 3: Tài liệu mô tả** (thua mã — sửa cho khớp mã, cùng commit):
  - `docs/SYSTEM-DESIGN.md`: §5 thêm `prc_*`, `ord_service_terms`, `ord_audit_cutoff`, `ky_period_close`, migration số đã chốt; §6 luồng "chụp mức lúc xác nhận", "ghi mức tay", "khoá tháng"; §7 mười hai route mới; §8 bảy ô quyền; §17 hiện trạng sổ đại lý đợt 1 (việc đợt 2, 3 còn lại).
  - `docs/CHANGE-GUIDE.md`: §1 thêm dòng "muốn đổi mức hoa hồng / người bán / khoá tháng → xem …"; công thức mới (chữ cái kế tiếp chưa dùng) "Sổ đại lý: bảng mức, bản chụp, khoá tháng" (chuỗi `changes()` của lô xác nhận; thêm đường ghi tiền mới phải gọi `loiKhoaKy` / `cauTriggerKhoa`; DTO Đối tác danh sách trắng); bẫy: (a) đổi công ty chủ phải đóng dòng điều khoản "mọi dịch vụ" cũ và mở dòng mới cho công ty mới (`R-PRC-3`); (b) e2e chung không khoá tháng nào ngoài 2025-01/02; (c) khung thử / e2e chèn thẳng đơn `confirmed` phải kèm bản chụp; §3 ma trận "đổi gì → chạy kiểm nào" thêm `pricing`, `ky-so`.
  - `docs/data-dictionary.json` đã làm ở Task 1 — kiểm `npm run dict` không đổi gì.

- [ ] **Step 4: Runbook + việc treo** (`docs/HANDOFF-N1.md`): mục runbook cho lần phát hành sổ đại lý đợt 1 theo đặc tả §13 — khoảng hở migration → deploy (60 phút ân hạn của `R-ORD-T1`), hoàn tác Worker làm `R-ORD-T1` đỏ cho tới đợt 2 (đúng tín hiệu), không khoá tháng nào trong ngày phát hành, khoá nhầm chỉ cứu bằng Time Travel (HC-5.19 chưa diễn tập), đơn đại lý mới bị giữ "Đã giao" tới đợt 2. "Việc còn treo": chụp bù đơn cũ (đợt 2, C4 = A), gộp hồ sơ trùng với bản chụp (đặc tả §7 bảng), R-BIL-2 vào bảng kiểm khoá tháng (đợt 2), mở khoá "Đã giao" đơn đại lý (đợt 2). `docs/BACKLOG.md`: cùng bốn mục, trỏ đặc tả.

- [ ] **Step 5: Nhật ký thay đổi** (`src/shared/changelog.ts`): mục mới đầu danh sách, số phiên bản = số kế tiếp sau bản mới nhất trên `main` LÚC GỘP (hôm nay 1.86 ⇒ 1.87; nhánh khác lên trước thì đổi số khi dựng lại trên `main`), lời thường cho người dùng: "Kế toán đặt mức hoa hồng cho đối tác theo từng dịch vụ hoặc nhóm dịch vụ; đơn đặt qua đối tác hiện hoa hồng và giá đại lý; đối tác thấy số tiền hoa hồng của mình; Kế toán khoá sổ từng tháng." Chạy `node --test src/shared/app-info.test.ts`. Trợ giúp theo vai: thêm mục ngắn cho Kế toán ("Đặt mức hoa hồng", "Ghi mức tay", "Khoá sổ tháng") và Bán hàng ("Lập đơn đặt qua đối tác") vào tệp hướng dẫn theo vai đang có (khuôn mục sẵn có; `npm run build:web` nếu tệp sinh).

- [ ] **Step 6: Đề xuất luật** `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/de-xuat-luat-dot-1.md` (AI không sửa tệp luật / chuẩn tắc — chỉ đề xuất, N9):
  1. Diff đề xuất cho `docs/ARCHITECTURE.md` bảng thi hành dòng 5.14 (khoá kỳ đã có cơ chế: trigger + mã + kiểm định kỳ).
  2. Bổ sung ADR-0090: có nên thêm `ledger.period.close` vào `O_GHI_TIEN` (đặc tả §6 N6) — nêu được/mất, khuyến nghị.
  3. Dòng cho bảng kịch bản Chrome của `web/CLAUDE.md` (Task 13 Bước 5).
  4. Dòng bẫy cho `CLAUDE.md` §10: "Sổ đại lý (ADR-0077/0078/0080 D1): chụp mức trong lô xác nhận bằng chuỗi `changes()`; DTO Đối tác danh sách trắng; tháng đã khoá không mở lại; e2e chỉ khoá 2025-01/02."
  Mỗi mục: chữ hiện tại, chữ đề xuất, lý do một câu.

- [ ] **Step 7: Kiểm cuối của người thi công.** `npm run typecheck`, `npm test`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local` (sau e2e), `npm run build:web`. Ghi kết quả (số bài, thời gian) vào sổ thi công.

- [ ] **Step 8: Commit.**

```bash
git add golden src/so-vang-so-dai-ly.test.ts src/shared/changelog.ts src/shared docs
git commit -m "Sổ đại lý đợt 1: tài liệu, sổ hàng rào, sổ vàng chờ xác nhận, nhật ký thay đổi, đề xuất luật" -m "Tài liệu mô tả sửa cho khớp mã; mọi hàng rào AI dựa vào có dòng và ngày quan sát chặn thật; sổ vàng A-1…A-5, B-3 chờ chủ / Kế toán xác nhận (AI không tự xác nhận). Đề xuất sửa ARCHITECTURE 5.14, ADR-0090, web/CLAUDE.md, CLAUDE.md §10 để chủ duyệt." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 9: Kiểm độc lập (việc lớn — dữ liệu, quyền, tiền).** Giao trợ lý `nguoi-kiem-doc-lap` (chỉ đọc) kiểm cả nhánh so với đặc tả: đọc mã thật, tự chạy `npm run typecheck`, `npm test`, bài số lạ, bài nguồn khoá tháng, `audit-invariants`; đối chiếu §12 tiêu chí 1–12 từng mục; tìm đường ghi tiền chưa dịch lỗi khoá tháng, DTO Đối tác lộ khoá, ô quyền không có route hỏi. Báo cáo lưu `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/kiem-doc-lap-thi-cong.md`. Phát hiện mức HIGH trở lên ⇒ sửa (vòng mới của task liên quan) và kiểm lại; mục "Dừng dây chuyền" của CLAUDE.md §3 áp nếu là lỗ an ninh. Chỉ báo "đạt" dựa trên báo cáo này + test.

- [ ] **Step 10: Báo chủ** (bốn mục có nhãn, lời thường — CLAUDE.md §4): đã làm; đã kiểm (có người kiểm độc lập); chưa làm / chưa kiểm (đợt 2, 3; ảnh chờ duyệt; sổ vàng chờ xác nhận); cần bạn quyết (đề xuất luật; lệnh `npm run day-len` đưa một lần, kèm "cần chạy `npm run trien-khai`" vì có migration).
