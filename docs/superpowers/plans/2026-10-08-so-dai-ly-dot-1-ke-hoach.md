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
  assert.throws(() => muc(db, { scope: "GROUP", group: "VE", bp: 10001 }), /CHECK constraint failed/);
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
  group_code       TEXT,
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
  group_code        TEXT,
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
