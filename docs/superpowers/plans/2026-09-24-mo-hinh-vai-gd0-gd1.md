# Mô hình người – vai – quyền, giai đoạn 0–1 — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quản trị gán **vai** cho tài khoản (11 vai, hai nhóm nội bộ/bên ngoài); vai **sinh bộ quyền mặc định**, cộng/bớt tay có lý do; luật cứng LC-1, LC-3, LC-4, LC-6 chặn ở dữ liệu và ở miền; thêm mức quyền **Thực tập**, đổi nhãn **"Toàn quyền"**; tạo tài khoản trên **hồ sơ có sẵn** — mà **không đổi quyền của bất kỳ tài khoản hiện có nào**.

**Architecture:** Một tệp thuần `src/shared/roles.ts` là nguồn duy nhất của danh mục vai và phép tính quyền (server và giao diện cùng dùng). Module `parties` công bố vài hàm đọc/ghi vai cho tài khoản; module `staff` là nơi **duy nhất** biến vai thành quyền (đọc vai qua hàm của `parties`, không nhắc bảng vai — R-N1-12 giữ nguyên), trả câu lệnh D1 chưa chạy; module `accounts` mở route, kiểm luật và ghi nhật ký trong cùng `db.batch()`. Migration 0024 chỉ **thêm**: cột nhóm vai, mã vai/quyền mới, bảng chỉnh tay, view công bố `v_pty_open_role_group`, hai trigger luật cứng.

**Tech Stack:** TypeScript, Cloudflare Workers + D1 (SQLite), `node --test` + `node:sqlite`, esbuild, e2e qua `wrangler dev` (`tests/e2e/run.mjs`), kịch bản Chrome qua CDP (`docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`).

**Spec:** `docs/superpowers/specs/2026-09-24-mo-hinh-nguoi-vai-quyen-design.md` (**ĐÃ DUYỆT** 2026-09-24) — mục 4 (vai), 5 (bảng thao tác), 6 (luật cứng), 7 (quyền hiệu lực), 13 (hiển thị), 14 (chuyển đổi), 15 (giai đoạn). Quyết định kiến trúc: `docs/adr/ADR-0018-mo-hinh-nguoi-vai-quyen.md` — **phải `accepted` trước Task 1** (Task 0).

## Global Constraints

- Giao diện, thông báo lỗi, nhật ký, tài liệu, commit: **tiếng Việt có dấu**; không lộ chữ Anh hay mã thô (không hiện `SUPER_ADMIN`, `INTERN`, `SALES_STAFF`… cho người dùng).
- **Không đổi một ô nào** của sáu cột quyền cũ (`SALES`, `ACCOUNTING`, `ADMIN`, `FIELD`, `PARTNER`, `SUPER_ADMIN`) trong `MATRIX` ở giai đoạn này (ADR-0018 điều 6). Cột `INTERN` mới dùng giá trị **tạm hẹp** ở Task 2.
- **Không đổi quyền của tài khoản hiện có** khi phát hành (đặc tả tiêu chí 11): không có câu nào tự tính lại quyền cho tài khoản chưa được gán vai mới; đường cũ `PUT /api/staff/:id/permissions` vẫn chạy cho tài khoản chưa gán vai.
- Migration: chỉ thêm tệp `migrations/0024_*.sql`; không sửa tệp đã áp; bảng/cột/view mới → `docs/data-dictionary.json` + `npm run dict`.
- Ranh giới module: import module khác chỉ qua `index.ts`; chỉ module chủ ghi bảng của mình; đọc xuyên module chỉ qua view `v_*`; `accounts` không import `parties` (cạnh không có trong `ALLOWED_EDGES`).
- **R-N1-12 quét cả chú thích:** ngoài `src/modules/parties/`, không tệp `.ts` nào trong `src/`, `web/` (trừ `*.test.ts`) được chứa chuỗi tên bảng vai hồ sơ (`pty_` + `party_role`) — kể cả trong chú thích. Viết "bảng vai" bằng lời.
- Module nghiêm (`staff`, `parties`): SQL tĩnh qua `defineSql`, import nội bộ kèm đuôi `.ts` trong `repository.ts`. Tệp dùng chung ở `src/shared/` import nhau kèm đuôi `.ts`; module server và `web/` import `src/shared` không đuôi.
- Phản hồi lỗi của máy chủ có dạng `{ error: { code, message } }` — e2e so `r.body.error.code`.
- Nhật ký (`audit_log.detail`) **không** chứa SĐT, email, MST.
- Giao diện: không `innerHTML` (dựng bằng `h()`), ô gõ 16px, chỉ ẩn/tắt theo quyền — máy chủ luôn kiểm lại.
- TDD: mỗi hành vi mới có test **đỏ trước, xanh sau**; mỗi cơ chế chặn mới phải được **quan sát chặn thật một lần** (sửa cố ý → đỏ → hoàn nguyên) và chép dòng đỏ vào báo cáo task (P16).
- AI **không** push, không deploy, không chạm D1 remote. Commit nhỏ, tiêu đề nói việc, thân nói vì sao, dòng cuối `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Việc lớn (dữ liệu + quyền): mỗi task có người kiểm độc lập chỉ-đọc trước task kế (nếu chạy subagent-driven), và **một vòng kiểm độc lập toàn nhánh** ở Task 10.

## Review Focus

Năm tình huống đặc tả ngầm chứa mà dễ vỡ nhất khi người thật dùng — mỗi dòng có test ở task sở hữu mã:

1. **Đổi một tài khoản từ vai nội bộ sang vai bên ngoài (và ngược lại) trong MỘT lần lưu** → phải xong trọn: vai cũ đóng trước, vai mới mở sau (không vấp trigger LC-3), quyền còn đúng `Đối tác`. Test: Task 5 ("nội bộ → bên ngoài → nội bộ trong CÙNG ngày"), Task 7 (e2e bước 3).
2. **Gỡ một vai rồi gán lại chính vai đó ngay trong ngày** → không vấp trigger chống chồng lấn của bảng vai; phải **mở lại** dòng đã đóng thay vì chèn dòng mới. Test: Task 5 (cùng ca trên) + Task 4 (`reopenRoleStatement`).
3. **Chuyển một tài khoản cũ** (vai `STAFF`, quyền `SALES` + `ACCOUNTING`) sang vai `SALES_STAFF` mà không cộng tay → quyền còn `SALES`; màn hình phải **báo trước "Sẽ mất: Kế toán"**, máy chủ làm đúng điều được yêu cầu, nhật ký ghi trước → sau. Test: Task 5 (quyền sau chuyển), Task 8 (dòng xem trước "Sẽ mất").
4. **Quản trị (không phải Toàn quyền) cố cấp quyền Quản trị** qua bất kỳ đường nào — gán vai Điều hành, cộng tay `ADMIN`, route cũ `PUT …/permissions`, tạo tài khoản có `ADMIN` → **403**. Test: Task 7 (e2e `roles.mjs`, sửa `admin.mjs`, `admin-race.mjs`).
5. **Toàn quyền tự gán vai cho chính mình** (tài khoản chủ sang vai Giám đốc): quyền không đổi → cho phép; quyền đổi → 409 "không tự đổi quyền". Test: Task 7 (e2e với tài khoản `superAdmin` chỉ có `SUPER_ADMIN`: gán `DIRECTOR` → 409; gán `DIRECTOR` kèm bớt tay `ADMIN` có lý do → 200).

## Quyết định tạm của giai đoạn 1 và rủi ro còn lại

Ghi lại để người kiểm và chủ dự án thấy; mỗi dòng là lựa chọn có chủ ý, không phải sót.

- **Giám đốc = `ADMIN` + `SUPER_ADMIN`**: theo ADR-0018 điều 4 ("Toàn quyền, kèm Quản trị để các chốt 'còn ít nhất một quản trị viên' đếm đúng"); bảng ở đặc tả §4 viết tắt "Toàn quyền".
- **Cột `INTERN` tạm hẹp** (Task 2): lập đơn, xem/sửa đơn của mình; **chưa** đủ điều kiện làm người phụ trách (`checkAssignee`) — đơn Thực tập sinh lập vào hàng chưa có người. Giai đoạn 2 mở theo đặc tả §5.
- **Nhãn "Bán hàng" → "Kinh doanh"**: để giai đoạn 3 (đổi nhãn hiển thị cùng trang "Vai & quyền").
- **Route vai chung của Hồ sơ vẫn nhận mã vai đã ngưng** (`STAFF`, `SALES`, `GUIDE`, `AGENT`) nếu gọi thẳng API; chỉ giao diện lọc bỏ. Lý do: không làm vỡ dữ liệu/kịch bản đang dùng vai theo nơi. Trang Hồ sơ **không còn cho thêm "Hướng dẫn viên" theo nơi (theo bến)** — chủ dự án **đồng ý bỏ** (phiên chat 2026-09-24: "bỏ HDV theo bến").
- **Vai mở rồi gỡ trong CÙNG ngày**: dòng giữ từ-đến = hôm nay (không đặt được ngày kết thúc trước ngày bắt đầu); trang Hồ sơ vẫn liệt kê vai đó trong hôm ấy (đúng: người đó đã giữ vai một phần ngày). Luật cứng và quyền chỉ xét dòng đang mở nên không ảnh hưởng.
- **Gỡ quyền Quản trị khi đổi vai chạy hai lô** (Task 7): lô 1 = câu chốt "còn quản trị viên khác" + quyền + chỉnh tay + nhật ký; lô 2 = đóng/mở vai (bảng của `parties` không mang được điều kiện của `staff`). Nếu máy chủ hỏng đúng giữa hai lô, quyền đã đổi mà vai chưa đổi — nhật ký có dòng, quản trị làm lại được. Hệ quả với LC-6 ("nhật ký cùng `db.batch()` với thay đổi"): trong riêng trường hợp này, phần **vai** chạy ở lô sau dòng nhật ký; mọi trường hợp khác đủ một lô. Tranh chấp hai quản trị viên cuối chỉ xảy ra giữa hai Toàn quyền (LC-4).
- **Tài khoản chỉ có `SUPER_ADMIN`** (không kèm `ADMIN`): trang Nhân viên mở được (cổng trang đổi sang `can(…, "admin.manage")`), nhưng thanh điều hướng chưa hiện mục quản trị (`web/shell.ts` dùng `hasPermission(ADMIN)`) — ngoài phạm vi, ghi nợ.
- **Tài khoản công ty lữ hành** (hồ sơ tổ chức): chưa làm (giai đoạn 4); tạo tài khoản trên hồ sơ tổ chức bị từ chối có thông báo.
- **Phát hiện khi rà mã (chưa thử trên trình duyệt):** form lập đơn gọi `GET /api/catalog` (mức `office`), nên tài khoản không phải văn phòng lập đơn — Đối tác hiện nay và Thực tập sinh từ giai đoạn này — có thể không nạp được danh mục dịch vụ. Không sửa ở đây (giai đoạn 2, bảng thao tác mới); ghi nợ để chủ biết.

## Trang ghép và lỗ đang hở (luật "bước ghép khi duyệt" + "dừng dây chuyền", chủ duyệt 2026-09-24 ở phiên hàng rào quyền)

Hai luật này nằm trên nhánh `quyet-dinh-24-9-va-ba-luat` (chủ đã duyệt nội dung, chưa gộp vào `CLAUDE.md`); kế hoạch này áp dụng trước.

**(1) Các bảng chứa những loại thực thể nào (sau giai đoạn 1)**

| Bảng | Chứa | Giai đoạn 1 thêm gì |
|---|---|---|
| `pty_party` (+ `pty_person`, `pty_organization`) | mọi người và tổ chức: khách, nhân viên nội bộ, đối tác bên ngoài (cá nhân), công ty lữ hành | không thêm loại; hồ sơ có sẵn (vd khách cũ) nay gắn được tài khoản |
| `pty_party_role` | vai theo nơi (cũ) + **vai tài khoản** (11 vai nhóm nội bộ/bên ngoài) | **loại dữ liệu mới**: vai sinh quyền (chỉ qua hàm sinh quyền của `staff`) |
| `staff` | tài khoản của người nội bộ và người bên ngoài (từ ADR-0014) | không đổi |
| `stf_permission` / `stf_permission_adjustment` (mới) | quyền hiệu lực / cộng-bớt tay có lý do | bảng mới |

**(2) Dòng bản đồ quyền chạm các bảng này áp cho loại nào**

| Thao tác | Áp cho | Giai đoạn 1 |
|---|---|---|
| `party.view` / `party.write` (văn phòng) | MỌI hồ sơ, kể cả hồ sơ nhân viên và đối tác có tài khoản | **không đổi — đây là lỗ F-01** (xem dưới) |
| vai theo nơi `POST /api/parties/:id/roles` (quản trị) | hồ sơ bất kỳ | chặn vai nhóm nội bộ/bên ngoài (409) |
| `admin.manage` + cấp dưới (`canManageAccount`) + LC-4 | tài khoản, quyền, vai tài khoản | thêm `GET/PUT /api/staff/:id/roles`; LC-4 siết mọi đường cấp quyền |
| `order.*` của `INTERN` | đơn của chính mình | mới, phạm vi `own` |

**(3) Cổng nào canh cửa nào**

| Cổng | Cửa | Giai đoạn 1 |
|---|---|---|
| `office` = `isOffice` = `can(order.view)` không ngữ cảnh | `/api/parties*`, `/api/catalog`, `/api/orders/dashboard`, `/api/dispatch/*`… | **không nới**: `INTERN` có `order.view = own` nên không qua; sáu mã cũ giữ nguyên ô |
| `orders` = `canAccessOrders` | `/api/orders*` (mỗi route tự kiểm `can()`) | thêm `INTERN` |
| `admin` (ADMIN hoặc SUPER_ADMIN) | `/api/staff*`, vai theo nơi của Hồ sơ | thêm 2 route vai, có `mayManage` (hàng rào 2 công nhận) |
| CSDL | ghi `stf_permission`, `pty_party_role` | trigger LC-1, LC-3; kiểm dữ liệu R-LC-1, R-LC-3 |

**Xây trên lỗ đang hở: F-01** (`party.view`/`party.write` chưa được máy chủ hỏi — nhân viên văn phòng sửa được hồ sơ nhân viên; hạn vá 2026-10-08 trong `docs/quyen-hoan.json`, việc của ADR-0013). Giai đoạn 1 **không dựa vào và không nới** lỗ này; hai route vai theo nơi của Hồ sơ vẫn nằm trong danh sách hoãn tới khi được vá. **Lỗ L2** (hướng dẫn viên thành "văn phòng" khi `order.view` của `FIELD` = `any`) chỉ mở ở giai đoạn 2 (ADR-0017) — đặc tả §19 ghi "`isOffice` tự đúng cho `FIELD`": **phải tách cổng `office` trước giai đoạn 2** (quyết định Q3 của chủ, 2026-09-24).

**Thứ tự với phiên hàng rào quyền — CHỦ ĐÃ CHỌN (phiên chat 2026-09-24, trả lời "1"):** giai đoạn 1 làm **ngay**, song song với việc vá F-01 (ADR-0013) của phiên hàng rào; **tách cổng `office` bắt buộc xong trước giai đoạn 2** (ADR-0017). Đây cũng là **lời cho phép xây trên lỗ đang hở F-01** theo luật "dừng dây chuyền", lý do: giai đoạn 1 không dựa vào và không nới lỗ này (xem bảng trên). Hai phiên cùng sửa `src/shared/permissions.ts` và `src/modules/parties/index.ts`: bên gộp sau xử lý phần chồng (phiên kia thêm dòng thao tác mới vào `MATRIX` → dòng đó cần thêm ô `INTERN`).

## Cấu trúc tệp

| Tệp | Việc | Task |
|---|---|---|
| `migrations/0024_vai_quyen_mac_dinh.sql` (mới) | nhóm vai, 10 mã vai, mã quyền `INTERN`, nhãn "Toàn quyền", bảng chỉnh tay, view `v_pty_open_role_group`, trigger LC-1/LC-3 | 1 |
| `src/migrations-0024.test.ts` (mới), `src/migrations-0020.test.ts` | kiểm schema + trigger; khoanh test 0020 về đúng thời điểm của nó | 1 |
| `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` | sổ dữ liệu | 1 |
| `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/shared/start-page.test.ts` | mã `INTERN`, nhãn "Toàn quyền", `canAccessOrders` tổng quát | 2 |
| `src/shared/roles.ts`, `src/shared/roles.test.ts` (mới), `src/roles-schema.test.ts` (mới) | danh mục vai, quyền hiệu lực, kiểm gán vai (LC-1/3/4); khớp mã ↔ dữ liệu | 3 |
| `src/modules/parties/repository.ts`, `index.ts`, `account-roles.test.ts` (mới); `src/shared/contracts.ts`; `web/parties.ts`; `tests/e2e/parties.mjs` | hàm vai cho tài khoản, chặn vai nội bộ/bên ngoài ở route Hồ sơ, meta đủ loại vai | 4 |
| `src/modules/staff/repository.ts`, `index.ts`, `account-roles.test.ts` (mới) | trạng thái vai, câu đổi vai + chỉnh tay, tạo tài khoản theo vai / hồ sơ có sẵn | 5 |
| `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | kiểm R-LC-1, R-LC-3; sửa kiểm "thiếu vai STAFF" (phải xong TRƯỚC e2e của Task 7) | 6 |
| `src/modules/accounts/index.ts`, `src/shared/audit-actions.ts`, `src/shared/contracts.ts`, `src/route-access.test.ts` | route vai, siết LC-4 mọi đường, DTO có vai, nhãn "Toàn quyền" | 7 |
| `tests/e2e/roles.mjs` (mới), `tests/e2e/run.mjs`, `tests/e2e/admin.mjs`, `tests/e2e/admin-race.mjs` | e2e | 7 |
| `web/role-picker.ts` (mới), `web/staff.ts`, `public/staff.html` | chọn vai + xem trước; hồ sơ có sẵn; cổng trang | 8 |
| `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs` (mới) | kịch bản Chrome | 8 |
| `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/HANDOFF-N1.md`, `src/shared/changelog.ts`, `src/shared/app-info.test.ts`, nhật ký thi công (mới) | tài liệu, nhật ký thay đổi, runbook | 9 |

---

### Task 0: Cổng vào — ADR-0018 đã duyệt, bản 1.5 đã lên main, nhánh sạch, nền xanh

**Files:** không sửa mã.

- [ ] **Step 1: Kiểm ADR-0018 đã `accepted`**

Run: `grep -n "Trạng thái" docs/adr/ADR-0018-mo-hinh-nguoi-vai-quyen.md`
Expected: dòng chứa `**accepted**`. Nếu còn `proposed` → **DỪNG**, báo điều phối viên: chưa được thi công (N3).

- [ ] **Step 2: Kiểm bản 1.5 (sửa người phụ trách mặc định) đã có trên `origin/main`**

```bash
git fetch origin
```
```bash
git grep -n "defaultHandlerPartyId" origin/main -- src/modules/dispatch/rules.ts
```
Expected: có dòng khớp. Nếu KHÔNG: Task 1–6 vẫn làm được (không cần bản 1.5); **kiểm lại ngay trước Task 7** — thiếu bản sửa này thì đơn do Thực tập sinh lập tự nhận Thực tập sinh làm người phụ trách, kiểm `R-DSP-2a` ở cuối e2e (`--strict`) sẽ đỏ. Nếu tới Task 7 vẫn chưa có → **DỪNG trước Task 7**, nhắc chủ đẩy bản 1.5; **không** tự gộp nhánh `sua-phu-trach-1-5` chưa lên main.

- [ ] **Step 3: Tạo nhánh thi công**

```bash
git switch -c gd1-mo-hinh-vai mo-hinh-nguoi-vai-quyen
```
```bash
git merge origin/main --no-edit
```
(Hai lệnh riêng — hàng rào git không cho gộp `switch` với `merge` trong một lệnh.)

- [ ] **Step 4: Kiểm số migration còn trống trên MỌI nhánh chưa gộp** (CLAUDE.md §10)

Run: `ls migrations | tail -3`, rồi `git branch -a --no-merged origin/main`, rồi với TỪNG nhánh in ra, chạy riêng một lệnh: `git diff --name-only --diff-filter=A origin/main...<nhánh> -- migrations`
Expected: không nhánh nào đã dùng `0024`. Nếu đã có → dùng số lớn nhất + 1 và **đổi tên tệp ở mọi bước dưới**.

- [ ] **Step 5: Hai hàng rào quyền (đã vào main ở 0a84b27)**

Run: `ls src/route-write-guard.test.ts src/permission-enforcement.test.ts`
Expected: có cả hai (chúng nằm trong `npm test`). Route ghi mới `PUT /api/staff/:id/roles` qua được hàng rào 2 nhờ `if (!mayManage(admin, t)) return NOT_MANAGER();` (`mayManage` có trong danh sách lời gọi kiểm được công nhận). **Không** thêm `can(…, "admin.manage")` ở giai đoạn này — làm vậy biến mục hoãn `admin.manage` của `docs/quyen-hoan.json` thành "hoãn thừa" và làm đỏ hàng rào 1 (việc đó thuộc bước tách cổng/route quản trị hỏi bảng của phiên hàng rào). Không sửa `docs/quyen-hoan.json` (hạn thật, chỉ chủ ra lệnh mới đổi).

- [ ] **Step 6: Nền xanh trước khi sửa**

Run: `npm ci && npm test && npm run typecheck`
Expected: toàn bộ PASS, typecheck 0 lỗi. Ghi số test vào báo cáo task (Task 9 chép vào nhật ký thi công).

---

### Task 1: Migration 0024 — danh mục vai, mã quyền, bảng chỉnh tay, view nhóm vai, trigger LC-1/LC-3

**Files:**
- Create: `migrations/0024_vai_quyen_mac_dinh.sql`
- Create: `src/migrations-0024.test.ts`
- Modify: `src/migrations-0020.test.ts:8` (khoanh về migration ≤ 0020)
- Modify: `docs/data-dictionary.json` (thêm 1 bảng, 1 view); sinh lại `docs/DATA-DICTIONARY.md`

**Interfaces:**
- Produces: bảng `pty_role_type` có cột `role_group` (`'INTERNAL'|'EXTERNAL'|'OTHER'`, có CHECK); 10 mã vai mới; `stf_permission_type` có `INTERN`, `SUPER_ADMIN.name = 'Toàn quyền'`; bảng `stf_permission_adjustment(id, staff_id, permission_type_code, direction, reason, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by)`; view `v_pty_open_role_group(party_id, role_group)`; lỗi trigger chứa chuỗi `party_role_group_conflict` (LC-3) và `lc1_external_account_permission` (LC-1).

- [ ] **Step 1: Viết test (đỏ)** — `src/migrations-0024.test.ts`

```ts
// Migration 0024 (ADR-0018, giai đoạn 1): dựng schema THẬT từ migrations/*.sql bằng node:sqlite rồi kiểm danh mục vai/quyền mới, view công bố
// v_pty_open_role_group và hai trigger luật cứng — LC-1 (tài khoản có vai bên ngoài chỉ giữ quyền Đối tác) và LC-3 (một hồ sơ không giữ cùng lúc
// vai nội bộ và vai bên ngoài đang mở). Chèn thẳng bằng SQL, không qua mã ứng dụng: chứng minh chặn nằm ở CSDL — lớp cuối nếu mã ứng dụng có lỗ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const AT = "2026-09-24T03:00:00.000Z";

function schema(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}

let n = 0;
/** Hồ sơ cá nhân, kèm (tuỳ chọn) một tài khoản trỏ vào nó. */
function person(db: DatabaseSync, withAccount = true): { party: string; staff: string } {
  const i = ++n;
  const party = `p-${i}`;
  const staff = `s-${i}`;
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(party, `Người${i}`, AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(party, `Người${i}`, AT, AT);
  if (withAccount) {
    db.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)").run(staff, `09${String(i).padStart(8, "0")}`, AT, party);
  }
  return { party, staff };
}
const openRole = (db: DatabaseSync, party: string, code: string) =>
  db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, NULL, '2026-09-20', ?, ?)")
    .run(`r-${++n}`, party, code, AT, AT);
const closeRole = (db: DatabaseSync, party: string, code: string) =>
  db.prepare("UPDATE pty_party_role SET valid_to_date = '2026-09-23' WHERE party_id = ? AND role_type_code = ? AND valid_to_date IS NULL").run(party, code);
// Cùng DẠNG câu với insert_permission của src/modules/staff/repository.ts (INSERT OR IGNORE … SELECT … WHERE): RAISE(ABORT) của trigger phải chặn dù có OR IGNORE.
const grant = (db: DatabaseSync, staff: string, code: string) =>
  db.prepare(`INSERT OR IGNORE INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, created_by, updated_at, updated_by)
              SELECT ?, ?, ?, ?, ?, NULL, ?, NULL WHERE 1`).run(`g-${++n}`, staff, code, AT, AT, AT);
const openCount = (db: DatabaseSync, staff: string) =>
  (db.prepare("SELECT count(*) AS c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL").get(staff) as { c: number }).c;

test("0024: 11 vai có nhóm đúng; vai cũ mơ hồ ngưng gán mới; vai khác giữ nhóm OTHER", () => {
  const db = schema();
  const rows = db.prepare("SELECT code, role_group, active FROM pty_role_type").all() as { code: string; role_group: string; active: number }[];
  const by = new Map(rows.map((r) => [r.code, r]));
  for (const c of ["DIRECTOR", "OPERATIONS_MANAGER", "GUIDE_INTERNAL", "SALES_STAFF", "INTERN", "ACCOUNTANT"]) {
    assert.equal(by.get(c)?.role_group, "INTERNAL", c);
    assert.equal(by.get(c)?.active, 1, c);
  }
  for (const c of ["TRAVEL_AGENCY", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR"]) {
    assert.equal(by.get(c)?.role_group, "EXTERNAL", c);
    assert.equal(by.get(c)?.active, 1, c);
  }
  for (const c of ["STAFF", "SALES", "GUIDE", "AGENT"]) {
    assert.equal(by.get(c)?.role_group, "OTHER", c);
    assert.equal(by.get(c)?.active, 0, `${c} ngưng gán mới`);
  }
  for (const c of ["CUSTOMER", "BOAT_CAPTAIN", "DRIVER"]) {
    assert.equal(by.get(c)?.role_group, "OTHER", c);
    assert.equal(by.get(c)?.active, 1, c);
  }
});

test("0024: có mã quyền INTERN ('Thực tập'); SUPER_ADMIN mang nhãn 'Toàn quyền'", () => {
  const db = schema();
  const name = (c: string) => (db.prepare("SELECT name FROM stf_permission_type WHERE code = ?").get(c) as { name: string } | undefined)?.name;
  assert.equal(name("INTERN"), "Thực tập");
  assert.equal(name("SUPER_ADMIN"), "Toàn quyền");
});

test("v_pty_open_role_group: chỉ vai ĐANG MỞ thuộc nhóm nội bộ/bên ngoài", () => {
  const db = schema();
  const a = person(db);
  openRole(db, a.party, "SALES_STAFF");
  openRole(db, a.party, "CUSTOMER");
  const b = person(db);
  openRole(db, b.party, "COLLABORATOR");
  closeRole(db, b.party, "COLLABORATOR");
  const rows = (db.prepare("SELECT party_id, role_group FROM v_pty_open_role_group ORDER BY party_id").all() as object[]).map((r) => ({ ...r }));
  assert.deepEqual(rows, [{ party_id: a.party, role_group: "INTERNAL" }]);
});

test("LC-3: không mở vai bên ngoài khi còn vai nội bộ đang mở (và ngược lại); đóng rồi mở thì được", () => {
  const db = schema();
  const a = person(db, false);
  openRole(db, a.party, "SALES_STAFF");
  assert.throws(() => openRole(db, a.party, "COLLABORATOR"), /party_role_group_conflict/);
  openRole(db, a.party, "CUSTOMER"); // nhóm OTHER không va chạm
  closeRole(db, a.party, "SALES_STAFF");
  openRole(db, a.party, "COLLABORATOR");
  assert.throws(() => openRole(db, a.party, "INTERN"), /party_role_group_conflict/);
});

test("LC-3: mở lại một vai đã đóng cũng bị chặn nếu va chạm nhóm", () => {
  const db = schema();
  const a = person(db, false);
  openRole(db, a.party, "SALES_STAFF");
  closeRole(db, a.party, "SALES_STAFF");
  openRole(db, a.party, "COLLABORATOR");
  assert.throws(
    () => db.prepare("UPDATE pty_party_role SET valid_to_date = NULL WHERE party_id = ? AND role_type_code = 'SALES_STAFF'").run(a.party),
    /party_role_group_conflict/,
  );
});

test("LC-1: tài khoản có vai bên ngoài chỉ nhận thêm quyền Đối tác — kể cả câu INSERT OR IGNORE", () => {
  const db = schema();
  const ext = person(db);
  openRole(db, ext.party, "TAXI_DRIVER");
  grant(db, ext.staff, "PARTNER");
  for (const code of ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "SUPER_ADMIN", "INTERN"]) {
    assert.throws(() => grant(db, ext.staff, code), /lc1_external_account_permission/, code);
  }
  const internal = person(db);
  openRole(db, internal.party, "SALES_STAFF");
  grant(db, internal.staff, "SALES");
  const legacy = person(db); // tài khoản cũ: chỉ vai STAFF (nhóm OTHER) — không bị luật mới chạm tới
  openRole(db, legacy.party, "STAFF");
  grant(db, legacy.staff, "ADMIN");
  assert.equal(openCount(db, ext.staff), 1);
  assert.equal(openCount(db, internal.staff), 1);
  assert.equal(openCount(db, legacy.staff), 1);
});

test("stf_permission_adjustment: tối đa một dòng MỞ cho mỗi (tài khoản, mã quyền); lý do bắt buộc", () => {
  const db = schema();
  const a = person(db);
  const add = (id: string, code: string, reason: string) =>
    db.prepare(`INSERT INTO stf_permission_adjustment (id, staff_id, permission_type_code, direction, reason, valid_from_at, created_at, updated_at)
                VALUES (?, ?, ?, 'ADD', ?, ?, ?, ?)`).run(id, a.staff, code, reason, AT, AT, AT);
  add("adj-1", "ACCOUNTING", "kiêm nhiệm");
  assert.throws(() => add("adj-2", "ACCOUNTING", "lần hai"), /UNIQUE/);
  db.prepare("UPDATE stf_permission_adjustment SET valid_to_at = ?, updated_at = ? WHERE id = 'adj-1'").run(AT, AT);
  add("adj-3", "ACCOUNTING", "mở lại");
  assert.throws(() => add("adj-4", "SALES", ""), /CHECK/, "mã khác để UNIQUE không che lỗi CHECK");
});
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/migrations-0024.test.ts`
Expected: FAIL — `no such column: role_group` / `no such table: stf_permission_adjustment` / `no such table: v_pty_open_role_group`.

- [ ] **Step 3: Viết migration** — `migrations/0024_vai_quyen_mac_dinh.sql`

```sql
-- Migration 0024 — ADR-0018 (mô hình người – vai – quyền), GIAI ĐOẠN 1. CHỈ THÊM (expand): cột nhóm vai, 10 mã vai mới, mã quyền INTERN,
-- nhãn "Toàn quyền", bảng chỉnh quyền tay, view công bố nhóm vai đang mở, hai trigger luật cứng (LC-1, LC-3).
-- KHÔNG đổi quyền của tài khoản nào và KHÔNG gán vai cho ai: chuyển đổi ~30 tài khoản làm bằng màn quản trị sau khi chủ duyệt bảng đối chiếu
-- (đặc tả §14). Không gieo SĐT/tên thật ở đây.

-- ---- Danh mục vai (module parties) ----------------------------------------------------------------------------------------
-- Nhóm vai: INTERNAL / EXTERNAL / OTHER — tập đóng, ép bằng CHECK ở cột (ADR-0003 điều 3; Ruling R12 khi thi công).
ALTER TABLE pty_role_type ADD COLUMN role_group TEXT NOT NULL DEFAULT 'OTHER' CHECK (role_group IN ('INTERNAL', 'EXTERNAL', 'OTHER'));
UPDATE pty_role_type SET role_group = 'INTERNAL', sort_order = 15 WHERE code = 'ACCOUNTANT';
-- Mã cũ mơ hồ (không nói nội bộ hay độc lập): ngưng dùng cho gán MỚI; dòng đang có giữ nguyên, đóng khi tài khoản được gán vai mới.
UPDATE pty_role_type SET active = 0 WHERE code IN ('STAFF', 'SALES', 'GUIDE', 'AGENT');
INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES
  ('DIRECTOR', 'Giám đốc', 10, 'INTERNAL'),
  ('OPERATIONS_MANAGER', 'Điều hành chung', 11, 'INTERNAL'),
  ('GUIDE_INTERNAL', 'Hướng dẫn viên nội bộ', 12, 'INTERNAL'),
  ('SALES_STAFF', 'Nhân viên kinh doanh', 13, 'INTERNAL'),
  ('INTERN', 'Thực tập sinh', 14, 'INTERNAL'),
  ('TRAVEL_AGENCY', 'Công ty lữ hành', 20, 'EXTERNAL'),
  ('GUIDE_FREELANCE', 'Hướng dẫn viên độc lập', 21, 'EXTERNAL'),
  ('HOTEL_RECEPTION', 'Lễ tân khách sạn', 22, 'EXTERNAL'),
  ('TAXI_DRIVER', 'Tài xế taxi', 23, 'EXTERNAL'),
  ('COLLABORATOR', 'Cộng tác viên', 24, 'EXTERNAL');

-- View công bố của parties: nhóm (nội bộ/bên ngoài) của các vai ĐANG MỞ (valid_to_date IS NULL) của mỗi hồ sơ. Chỉ khoá + nhãn nhóm.
-- Trigger LC-1 của module staff đọc view này (cạnh staff → parties đã có).
CREATE VIEW v_pty_open_role_group AS
  SELECT DISTINCT r.party_id, t.role_group
  FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code
  WHERE r.valid_to_date IS NULL AND t.role_group IN ('INTERNAL', 'EXTERNAL');

-- LC-3: một hồ sơ không giữ CÙNG LÚC vai nội bộ và vai bên ngoài đang mở. Chỉ xét dòng MỞ: đổi nhóm = đóng dòng cũ rồi mở dòng mới
-- (kể cả trong cùng ngày). Chèn mới và mở lại (UPDATE valid_to_date → NULL) đều bị chặn.
CREATE TRIGGER pty_party_role_group_conflict_ins BEFORE INSERT ON pty_party_role
WHEN NEW.valid_to_date IS NULL AND EXISTS (
  SELECT 1 FROM pty_role_type nt, pty_party_role o JOIN pty_role_type ot ON ot.code = o.role_type_code
  WHERE nt.code = NEW.role_type_code AND nt.role_group IN ('INTERNAL', 'EXTERNAL')
    AND o.party_id = NEW.party_id AND o.valid_to_date IS NULL
    AND ot.role_group IN ('INTERNAL', 'EXTERNAL') AND ot.role_group <> nt.role_group)
BEGIN SELECT RAISE(ABORT, 'party_role_group_conflict: một hồ sơ không giữ cùng lúc vai nội bộ và vai bên ngoài'); END;
CREATE TRIGGER pty_party_role_group_conflict_upd BEFORE UPDATE ON pty_party_role
WHEN NEW.valid_to_date IS NULL AND EXISTS (
  SELECT 1 FROM pty_role_type nt, pty_party_role o JOIN pty_role_type ot ON ot.code = o.role_type_code
  WHERE nt.code = NEW.role_type_code AND nt.role_group IN ('INTERNAL', 'EXTERNAL')
    AND o.id <> NEW.id AND o.party_id = NEW.party_id AND o.valid_to_date IS NULL
    AND ot.role_group IN ('INTERNAL', 'EXTERNAL') AND ot.role_group <> nt.role_group)
BEGIN SELECT RAISE(ABORT, 'party_role_group_conflict: một hồ sơ không giữ cùng lúc vai nội bộ và vai bên ngoài'); END;

-- ---- Quyền (module staff) ---------------------------------------------------------------------------------------------------
INSERT INTO stf_permission_type (code, name, description, sort_order) VALUES
  ('INTERN', 'Thực tập', 'Thực tập sinh: lập đơn, xem và sửa đơn của mình; không thấy đơn người khác, không quản trị (ADR-0018)', 7);
UPDATE stf_permission_type SET name = 'Toàn quyền' WHERE code = 'SUPER_ADMIN';

-- Chỉnh quyền tay so với bộ mặc định của vai (ADR-0018 điều 3): cộng (ADD) hoặc bớt (REMOVE) một mã quyền, bắt buộc lý do, có hiệu lực.
-- direction ADD/REMOVE — tập đóng, ép bằng CHECK (ADR-0003 điều 3); mỗi (tài khoản, mã quyền) tối đa một dòng đang mở.
CREATE TABLE stf_permission_adjustment (
  id                   TEXT PRIMARY KEY,
  staff_id             TEXT NOT NULL REFERENCES staff(id),
  permission_type_code TEXT NOT NULL REFERENCES stf_permission_type(code),
  direction            TEXT NOT NULL CHECK (direction IN ('ADD', 'REMOVE')),
  reason               TEXT NOT NULL CHECK (length(reason) BETWEEN 1 AND 200),
  valid_from_at        TEXT NOT NULL,
  valid_to_at          TEXT CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at),
  created_at           TEXT NOT NULL,
  created_by           TEXT,
  updated_at           TEXT NOT NULL,
  updated_by           TEXT
);
CREATE INDEX stf_permission_adjustment_staff_ix ON stf_permission_adjustment(staff_id);
CREATE UNIQUE INDEX stf_permission_adjustment_open_uq ON stf_permission_adjustment(staff_id, permission_type_code) WHERE valid_to_at IS NULL;

-- LC-1: tài khoản mà hồ sơ đang mở vai bên ngoài chỉ được giữ quyền Đối tác. Chặn ở câu CHÈN quyền (mọi đường ghi quyền đều chèn dòng mới).
-- Tên bắt đầu bằng lc1_ (không stf_): src/migrations-n1.test.ts coi mọi trigger tên staff_%/stf_% là trigger siết B5 (cấm trước lần phát hành 2);
-- trigger này không siết mã cũ (chưa hồ sơ nào có vai bên ngoài) — Ruling R9 khi thi công.
CREATE TRIGGER lc1_stf_permission_external_partner_only BEFORE INSERT ON stf_permission
WHEN NEW.valid_to_at IS NULL AND NEW.permission_type_code <> 'PARTNER' AND EXISTS (
  SELECT 1 FROM staff s JOIN v_pty_open_role_group g ON g.party_id = s.party_id
  WHERE s.id = NEW.staff_id AND g.role_group = 'EXTERNAL')
BEGIN SELECT RAISE(ABORT, 'lc1_external_account_permission: tài khoản có vai bên ngoài chỉ giữ quyền Đối tác'); END;
```

- [ ] **Step 4: Khoanh test 0020 về đúng thời điểm của nó** — `src/migrations-0020.test.ts:8`

Test này nạp MỌI migration rồi ghim nhãn "Super Admin" và đúng 6 mã — 0024 đổi cả hai có chủ đích. Giữ ý nghĩa "0020 thêm đúng hai mã, đúng tên" bằng cách chỉ nạp tới 0020 (cùng mẫu `upTo` của `src/migrations-n1.test.ts`). Thay dòng 8:

```ts
// Chỉ nạp tới 0020: test này ghim KẾT QUẢ CỦA 0020 (nhãn "Super Admin", 6 mã). 0024 (ADR-0018) đổi nhãn thành "Toàn quyền" và thêm INTERN —
// trạng thái sau cùng do src/migrations-0024.test.ts ghim.
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql") && f.slice(0, 4) <= "0020").sort();
```

- [ ] **Step 5: Cập nhật sổ dữ liệu**

Trong `docs/data-dictionary.json`: thêm vào mảng `tables` phần tử `{ "name": "stf_permission_adjustment", "module": "staff", "kind": "table" }` (đặt cạnh `stf_permission`); thêm vào mảng `views` phần tử `{ "name": "v_pty_open_role_group", "module": "parties", "columns": ["party_id", "role_group"] }`. Rồi chạy `npm run dict`.

- [ ] **Step 6: Chạy để thấy xanh**

Run: `node --test src/migrations-0024.test.ts src/migrations-0020.test.ts src/architecture.test.ts`
Expected: PASS cả ba (kiến trúc kiểm bảng mới có cột kiểm toán, tiền tố `stf_`, view đúng tên/cột sổ, sổ khớp bản sinh).

- [ ] **Step 7: P16 — quan sát trigger chặn thật**

Tạm xoá khối `CREATE TRIGGER lc1_stf_permission_external_partner_only …` khỏi migration, chạy `node --test src/migrations-0024.test.ts` → phải ĐỎ ở test "LC-1"; chép dòng đỏ; hoàn nguyên; chạy lại → xanh. Làm tương tự với `pty_party_role_group_conflict_ins` (đỏ ở test LC-3). Ghi cả hai dòng đỏ vào báo cáo task.

- [ ] **Step 8: Toàn bộ test + commit**

Run: `npm test`
Expected: PASS.

```bash
git add migrations/0024_vai_quyen_mac_dinh.sql src/migrations-0024.test.ts src/migrations-0020.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md
git commit -m "Migration 0024: danh mục vai theo nhóm, mã quyền Thực tập, bảng chỉnh quyền tay, trigger luật cứng LC-1/LC-3" -m "Vì sao: ADR-0018 giai đoạn 1 — vai sinh bộ quyền mặc định cần mã vai có nhóm nội bộ/bên ngoài; luật cứng phải chặn ngay ở CSDL (tài khoản bên ngoài chỉ giữ quyền Đối tác; một hồ sơ không giữ cùng lúc hai nhóm). Chỉ thêm, không đổi quyền của ai. Test 0020 khoanh về đúng thời điểm của nó vì 0024 đổi nhãn Super Admin có chủ đích." -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `permissions.ts` — mã `INTERN` (tạm hẹp), nhãn "Toàn quyền", `canAccessOrders` tổng quát

**Files:**
- Modify: `src/shared/permissions.ts:5-15` (mã + nhãn), `:25-27` (`row`), `:42-68` (`MATRIX`), `:112-116` (`canAccessOrders`)
- Modify: `src/shared/permissions.test.ts:5-8,35,38,78-85`, `src/shared/start-page.test.ts`

**Interfaces:**
- Consumes: `stf_permission_type` có `INTERN` (Task 1).
- Produces: `PERMISSION_CODES = [..., "SUPER_ADMIN", "INTERN"]` (thêm **cuối** để thứ tự các mảng quyền cũ không đổi); `PERMISSION_LABEL.SUPER_ADMIN = "Toàn quyền"`, `PERMISSION_LABEL.INTERN = "Thực tập"`; `canAccessOrders(who) = isOffice(who) || can(who, "order.view", { ownerId: who.id })`.

Cột `INTERN` **tạm** ở giai đoạn 1 (xem "Quyết định tạm"): xem/tiền/lịch sử/liên lạc = `own`; lập đơn = `any`; sửa/xác nhận nháp = `own`; góp ý như nhân viên; mọi ô còn lại `none`. `src/modules/dispatch/rules.test.ts:79-84` (danh sách quyền đủ điều kiện làm người phụ trách) phải **vẫn xanh không sửa**: `INTERN` không có ô `assigned` nên không đủ điều kiện — quyết định có chủ ý của giai đoạn 1.

- [ ] **Step 1: Sửa test (đỏ)** — `src/shared/permissions.test.ts`

Thay chú thích dòng 5–7, khai báo `ADR` (dòng 8–34) và `ORDER` (dòng 35) bằng bảng **7 cột** (thêm cột `INTERN` cuối mỗi dòng; sáu cột đầu GIỮ NGUYÊN từng ô):

```ts
// BẢN ĐỌC THỨ HAI của bảng ADR-0007 điều 1 SAU khi ADR-0009 đổi ba ô của SALES (order.modify, order.history.view, dispatch.assign: own → ownOrAssigned),
// ADR-0014 thêm PARTNER/SUPER_ADMIN + bốn thao tác mới, và ADR-0018 (giai đoạn 1) thêm cột INTERN TẠM HẸP — viết lại độc lập từ tài liệu ADR, không suy
// ra từ MATRIX. Cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN.
// 3 dòng "feedback.*" là mở rộng của module Góp ý (spec 2026-09-21), không thuộc bảng ADR-0007 gốc.
const ADR: Record<string, [Scope, Scope, Scope, Scope, Scope, Scope, Scope]> = {
  "order.view": ["any", "any", "any", "none", "own", "any", "own"],
  "money.view": ["any", "any", "any", "none", "own", "any", "own"],
  "order.history.view": ["ownOrAssigned", "any", "any", "none", "own", "any", "own"],
  "contact.view": ["any", "any", "any", "assigned", "ownOrAssigned", "any", "own"],
  "order.create": ["any", "none", "any", "none", "any", "any", "any"],
  "order.modify": ["ownOrAssigned", "none", "any", "none", "own", "any", "own"],
  "order.trip.edit": ["ownOrAssigned", "none", "any", "none", "none", "any", "none"],
  "task.progress": ["none", "none", "any", "assigned", "assigned", "any", "none"],
  "order.money.edit": ["own", "any", "any", "assigned", "none", "any", "none"], // ADR-0014 điều 6: FIELD đang phụ trách (đổi từ ADR-0009 điều 1 "KHÔNG đổi")
  "order.cancel": ["none", "none", "none", "assigned", "none", "any", "none"], // ADR-0014 điều 11: thao tác MỚI
  "dispatch.assign": ["ownOrAssigned", "none", "any", "none", "none", "any", "none"],
  "dispatch.claim": ["any", "none", "any", "none", "none", "any", "none"], // ADR-0009 điều 2: nhận phụ trách đơn chưa có người (điều kiện do dịch vụ của dispatch kiểm, không phải ô ma trận)
  "dispatch.guides.view": ["none", "none", "none", "none", "any", "any", "none"], // ADR-0014 điều 9: thao tác MỚI
  "dispatch.request": ["none", "none", "none", "none", "any", "any", "none"], // ADR-0014 điều 10: thao tác MỚI
  "payment.receive": ["own", "any", "any", "none", "none", "any", "none"],
  "payment.refund": ["none", "any", "any", "none", "none", "any", "none"],
  "invoice.request": ["own", "any", "any", "none", "none", "any", "none"],
  "invoice.issue": ["none", "any", "any", "none", "none", "any", "none"],
  "party.view": ["any", "any", "any", "none", "none", "any", "none"],
  "party.write": ["any", "any", "any", "none", "none", "any", "none"],
  "admin.manage": ["none", "none", "any", "none", "none", "any", "none"],
  "admin.manage.superadmin": ["none", "none", "none", "none", "none", "any", "none"], // ADR-0014 điều 2/8: thao tác MỚI
  "feedback.submit": ["any", "any", "any", "any", "any", "any", "any"],
  "feedback.view": ["own", "own", "any", "own", "own", "any", "own"],
  "feedback.triage": ["none", "none", "any", "none", "none", "any", "none"],
};
const ORDER: readonly PermissionCode[] = ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "SUPER_ADMIN", "INTERN"];
```

Đổi tên test dòng 38 thành `"bản đồ quyền khớp TỪNG Ô của ADR-0007 + ADR-0009 + ADR-0014 + ADR-0018 (giai đoạn 1) + Góp ý (25 thao tác × 7 quyền)"`. Thay test `canAccessOrders` (dòng 78–85) và thêm test Thực tập ngay sau nó:

```ts
test("canAccessOrders: văn phòng, PARTNER và INTERN dùng được route đơn; FIELD một mình thì không", () => {
  assert.equal(canAccessOrders({ id: "a", permissions: ["SALES"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["ADMIN"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["SUPER_ADMIN"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["PARTNER"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["INTERN"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["FIELD"] }), false);
  assert.equal(canAccessOrders({ id: "a", permissions: [] }), false);
});

test("ADR-0018 giai đoạn 1: INTERN lập đơn, xem/sửa đơn của mình; không thấy đơn người khác, không làm người phụ trách, không quản trị", () => {
  const intern = { id: "i1", permissions: ["INTERN"] as const };
  assert.equal(isOffice(intern), false, "không phải văn phòng → dùng trang Đơn hàng như Đối tác");
  assert.equal(can(intern, "order.create"), true);
  assert.equal(can(intern, "order.view", { ownerId: "i1" }), true);
  assert.equal(can(intern, "order.view", { ownerId: "other" }), false);
  assert.equal(can(intern, "order.modify", { ownerId: "i1" }), true);
  assert.equal(can(intern, "order.modify", { ownerId: "other", assigned: true }), false, "chưa là cấp người phụ trách (giai đoạn 2 mở)");
  assert.equal(can(intern, "dispatch.claim"), false);
  assert.equal(can(intern, "party.view"), false);
  assert.equal(can(intern, "admin.manage"), false);
});
```

Trong `src/shared/start-page.test.ts`, thêm (dùng hàm `who` sẵn có ở đầu tệp):

```ts
test("homeRedirect: chỉ INTERN (Thực tập) → \"/orders\" (không có Trang chủ văn phòng)", () => {
  assert.equal(homeRedirect(who("INTERN")), "/orders");
});
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/shared/permissions.test.ts src/shared/start-page.test.ts`
Expected: FAIL — `INTERN` không có trong `PERMISSION_CODES`; `canAccessOrders(INTERN)` false.

- [ ] **Step 3: Sửa `src/shared/permissions.ts`**

```ts
export const PERMISSION_CODES = ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "SUPER_ADMIN", "INTERN"] as const;
export type PermissionCode = (typeof PERMISSION_CODES)[number];

export const PERMISSION_LABEL: Record<PermissionCode, string> = {
  SALES: "Bán hàng",
  ACCOUNTING: "Kế toán",
  ADMIN: "Quản trị",
  FIELD: "Hướng dẫn viên",
  PARTNER: "Đối tác",
  SUPER_ADMIN: "Toàn quyền", // ADR-0018 điều 4: bỏ chữ Anh "Super Admin" lộ ra người dùng
  INTERN: "Thực tập", // ADR-0018 điều 4
};
```

Sửa `row` (dòng 25–27):

```ts
/** Thứ tự cột của mỗi hàng ở MATRIX. `INTERN` thêm CUỐI (ADR-0018) để thứ tự các mảng quyền cũ không đổi. */
type Row = Record<PermissionCode, Scope>;
const row = (SALES: Scope, ACCOUNTING: Scope, ADMIN: Scope, FIELD: Scope, PARTNER: Scope, SUPER_ADMIN: Scope, INTERN: Scope): Row => ({
  SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN,
});
```

Trong `MATRIX`: **giữ nguyên mọi chú thích cuối dòng hiện có**, chỉ thêm tham số thứ 7 (cột `INTERN`) cho từng dòng đúng như bảng `ADR` ở Step 1 (ví dụ `"order.view": row("any", "any", "any", "none", "own", "any", "own"), // xem đơn`). Thêm một câu vào cuối khối chú thích ngay trên `export const MATRIX`: ` * ADR-0018 giai đoạn 1: cột INTERN TẠM HẸP (lập đơn; xem/sửa đơn của mình); giai đoạn 2 đổi sang giá trị đích của đặc tả §5.`

Sửa `canAccessOrders` (dòng 112–116):

```ts
/**
 * Tài khoản dùng được route đơn (`/api/orders*`): nhân sự văn phòng (ADR-0007) HOẶC bất kỳ quyền nào xem được đơn CỦA MÌNH (Đối tác — ADR-0014; Thực tập —
 * ADR-0018). Mỗi route đơn vẫn tự gọi `can()` để kiểm phạm vi. Router dùng cho access "orders". KHÔNG dùng để hiện/ẩn mục của nhân sự văn phòng (dùng `isOffice`).
 */
export const canAccessOrders = (who: PermissionHolder): boolean => isOffice(who) || can(who, "order.view", { ownerId: who.id });
```

- [ ] **Step 4: Chạy để thấy xanh**

Run: `node --test src/shared/permissions.test.ts src/shared/start-page.test.ts src/modules/dispatch/rules.test.ts`
Expected: PASS (test phân công không sửa vẫn xanh — `INTERN` không đủ điều kiện làm người phụ trách).

- [ ] **Step 5: Toàn bộ test + typecheck + commit**

Run: `npm test && npm run typecheck`
Expected: PASS, 0 lỗi. (Các vòng lặp theo `PERMISSION_CODES` — `parsePermissions`, `cleanPermissions`, ô chọn quyền cũ ở `web/staff.ts` — tự nhận `INTERN`; không sửa ở task này.)

```bash
git add src/shared/permissions.ts src/shared/permissions.test.ts src/shared/start-page.test.ts
git commit -m "Quyền: thêm mức Thực tập (tạm hẹp), đổi nhãn Super Admin thành Toàn quyền" -m "Vì sao: ADR-0018 điều 4 — vai Thực tập sinh cần mức quyền riêng (lập đơn, chỉ thấy đơn của mình); nhãn tiếng Anh lộ ra người dùng. Không đổi ô nào của sáu mã cũ; canAccessOrders tổng quát theo phạm vi 'của mình' nên Thực tập dùng được trang Đơn hàng như Đối tác." -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `roles.ts` — danh mục vai, quyền hiệu lực, kiểm gán vai

**Files:**
- Create: `src/shared/roles.ts`
- Create: `src/shared/roles.test.ts`
- Create: `src/roles-schema.test.ts`

**Interfaces:**
- Consumes: `PERMISSION_CODES`, `PERMISSION_LABEL`, `isPermissionCode`, `PermissionCode` (Task 2).
- Produces (dùng ở Task 5, 7, 8):
  - `ROLE_CODES`, `type RoleCode`, `type RoleGroup = "INTERNAL" | "EXTERNAL"`, `ROLES: Record<RoleCode, { name; group; defaults; handles; superAdminOnly }>`, `ROLE_GROUP_LABEL`, `isRoleCode(v): v is RoleCode`
  - `EXTERNAL_ALLOWED: readonly PermissionCode[]` (`["PARTNER"]`), `SUPER_ADMIN_GRANTED: readonly PermissionCode[]` (`["ADMIN", "SUPER_ADMIN"]`)
  - `groupOf(roles): RoleGroup | "NONE" | "MIXED"`, `defaultPermissions(roles): PermissionCode[]`
  - `interface Adjustments { adds; removes }`, `effectivePermissions(roles, adj): { permissions: PermissionCode[]; dropped: PermissionCode[] }`
  - `interface RoleAssignment extends Adjustments { roles; reason: string | null }`, `parseRoleAssignment(body): { ok: true; value: RoleAssignment } | { ok: false; message: string }`
  - `interface RoleProblem { forbidden: boolean; message: string }`, `highPermissionProblem(actor, current, next): RoleProblem | null`, `roleAssignmentProblem({ actor, currentRoles, currentPermissions, next }): RoleProblem | null`
  - `rolesLabel(roles): string`, `permissionsLabel(list): string`

- [ ] **Step 1: Viết test (đỏ)** — `src/shared/roles.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES } from "./permissions.ts";
import {
  EXTERNAL_ALLOWED, ROLES, ROLE_CODES, defaultPermissions, effectivePermissions, groupOf, highPermissionProblem, isRoleCode, parseRoleAssignment,
  permissionsLabel, roleAssignmentProblem, rolesLabel, type RoleAssignment,
} from "./roles.ts";

const assignment = (roles: RoleAssignment["roles"], extra: Partial<RoleAssignment> = {}): RoleAssignment => ({ roles, adds: [], removes: [], reason: null, ...extra });

test("danh mục: đủ 11 vai, 6 nội bộ + 5 bên ngoài, bộ mặc định là mã quyền hợp lệ", () => {
  assert.equal(ROLE_CODES.length, 11);
  assert.deepEqual(Object.keys(ROLES).sort(), [...ROLE_CODES].sort());
  assert.equal(ROLE_CODES.filter((r) => ROLES[r].group === "INTERNAL").length, 6);
  assert.equal(ROLE_CODES.filter((r) => ROLES[r].group === "EXTERNAL").length, 5);
  for (const r of ROLE_CODES) for (const p of ROLES[r].defaults) assert.ok((PERMISSION_CODES as readonly string[]).includes(p), `${r} → ${p}`);
  for (const r of ROLE_CODES.filter((x) => ROLES[x].group === "EXTERNAL")) assert.deepEqual([...ROLES[r].defaults], ["PARTNER"], r);
  assert.deepEqual(ROLE_CODES.filter((r) => ROLES[r].superAdminOnly), ["DIRECTOR", "OPERATIONS_MANAGER"]);
  assert.equal(isRoleCode("SALES_STAFF"), true);
  assert.equal(isRoleCode("STAFF"), false, "vai cũ mơ hồ không thuộc mô hình mới");
});

test("bộ mặc định đúng đặc tả §4 + ADR-0018 điều 4 (Giám đốc = Toàn quyền kèm Quản trị; Điều hành = Quản trị)", () => {
  assert.deepEqual(defaultPermissions(["DIRECTOR"]), ["ADMIN", "SUPER_ADMIN"]);
  assert.deepEqual(defaultPermissions(["OPERATIONS_MANAGER"]), ["ADMIN"]);
  assert.deepEqual(defaultPermissions(["GUIDE_INTERNAL"]), ["FIELD"]);
  assert.deepEqual(defaultPermissions(["SALES_STAFF"]), ["SALES"]);
  assert.deepEqual(defaultPermissions(["INTERN"]), ["INTERN"]);
  assert.deepEqual(defaultPermissions(["ACCOUNTANT"]), ["ACCOUNTING"]);
  assert.deepEqual(defaultPermissions(["TAXI_DRIVER"]), ["PARTNER"]);
  assert.deepEqual(defaultPermissions(["GUIDE_INTERNAL", "SALES_STAFF"]), ["SALES", "FIELD"], "nhiều vai = hợp, theo thứ tự chuẩn");
  assert.deepEqual(defaultPermissions([]), []);
});

test("groupOf: NONE / INTERNAL / EXTERNAL / MIXED", () => {
  assert.equal(groupOf([]), "NONE");
  assert.equal(groupOf(["SALES_STAFF", "ACCOUNTANT"]), "INTERNAL");
  assert.equal(groupOf(["COLLABORATOR"]), "EXTERNAL");
  assert.equal(groupOf(["SALES_STAFF", "COLLABORATOR"]), "MIXED");
});

test("effectivePermissions: mặc định + cộng − bớt; nhóm bên ngoài bị lọc về Đối tác (LC-1)", () => {
  assert.deepEqual(effectivePermissions(["SALES_STAFF"], { adds: ["ACCOUNTING"], removes: [] }), { permissions: ["SALES", "ACCOUNTING"], dropped: [] });
  assert.deepEqual(effectivePermissions(["DIRECTOR"], { adds: [], removes: ["ADMIN"] }), { permissions: ["SUPER_ADMIN"], dropped: [] });
  assert.deepEqual(effectivePermissions(["COLLABORATOR"], { adds: ["SALES"], removes: [] }), { permissions: ["PARTNER"], dropped: ["SALES"] });
  assert.deepEqual(effectivePermissions([], { adds: ["SALES"], removes: [] }), { permissions: ["SALES"], dropped: [] });
  assert.deepEqual([...EXTERNAL_ALLOWED], ["PARTNER"]);
});

test("parseRoleAssignment: đúng dạng, thứ tự chuẩn, lý do bắt buộc khi chỉnh tay", () => {
  assert.deepEqual(parseRoleAssignment({ roles: ["ACCOUNTANT", "SALES_STAFF"] }), { ok: true, value: { roles: ["SALES_STAFF", "ACCOUNTANT"], adds: [], removes: [], reason: null } });
  assert.deepEqual(parseRoleAssignment({ roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], reason: "  kiêm   nhiệm " }), {
    ok: true,
    value: { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], removes: [], reason: "kiêm nhiệm" },
  });
  for (const bad of [null, {}, { roles: [] }, { roles: ["STAFF"] }, { roles: ["SALES_STAFF", "SALES_STAFF"] }, { roles: "SALES_STAFF" }]) {
    assert.equal(parseRoleAssignment(bad).ok, false, JSON.stringify(bad));
  }
  assert.equal(parseRoleAssignment({ roles: ["SALES_STAFF"], adds: ["BOSS"] }).ok, false);
  assert.equal(parseRoleAssignment({ roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], removes: ["ACCOUNTING"], reason: "x" }).ok, false, "vừa cộng vừa bớt");
  assert.equal(parseRoleAssignment({ roles: ["SALES_STAFF"], adds: ["ACCOUNTING"] }).ok, false, "thiếu lý do");
  assert.equal(parseRoleAssignment({ roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], reason: "x".repeat(201) }).ok, false, "lý do quá dài");
  const ignored = parseRoleAssignment({ roles: ["SALES_STAFF"], reason: "không chỉnh gì" });
  assert.ok(ignored.ok && ignored.value.reason === null, "không chỉnh tay thì không lưu lý do");
});

test("highPermissionProblem (LC-4): chỉ Toàn quyền cấp/gỡ Quản trị, Toàn quyền", () => {
  assert.equal(highPermissionProblem(["SUPER_ADMIN"], ["SALES"], ["SALES", "ADMIN"]), null);
  assert.deepEqual(highPermissionProblem(["ADMIN"], ["SALES"], ["SALES", "ADMIN"]), { forbidden: true, message: "Chỉ Toàn quyền mới cấp hoặc gỡ quyền Quản trị, Toàn quyền." });
  assert.equal(highPermissionProblem(["ADMIN"], ["SALES"], ["SALES", "ACCOUNTING"]), null);
});

test("roleAssignmentProblem: LC-3, LC-1 (cộng tay), LC-4, còn ít nhất một quyền", () => {
  const base = { actor: ["ADMIN"] as const, currentRoles: [] as const, currentPermissions: [] as const };
  const mixed = roleAssignmentProblem({ ...base, next: assignment(["SALES_STAFF", "COLLABORATOR"]) });
  assert.equal(mixed?.forbidden, false);
  assert.match(mixed!.message, /cùng lúc vai nội bộ và vai bên ngoài/);
  assert.match(roleAssignmentProblem({ ...base, next: assignment(["COLLABORATOR"], { adds: ["SALES"], reason: "x" }) })!.message, /chỉ giữ quyền Đối tác/);
  assert.deepEqual(roleAssignmentProblem({ ...base, next: assignment(["OPERATIONS_MANAGER"]) }), {
    forbidden: true,
    message: "Chỉ Toàn quyền mới gán hoặc gỡ vai Giám đốc, Điều hành chung.",
  });
  assert.equal(roleAssignmentProblem({ ...base, next: assignment(["SALES_STAFF"], { adds: ["ADMIN"], reason: "x" }) })?.forbidden, true, "cộng tay Quản trị");
  assert.equal(roleAssignmentProblem({ ...base, actor: ["SUPER_ADMIN"], next: assignment(["OPERATIONS_MANAGER"]) }), null);
  assert.match(roleAssignmentProblem({ ...base, next: assignment(["INTERN"], { removes: ["INTERN"], reason: "x" }) })!.message, /ít nhất một quyền/);
  assert.equal(roleAssignmentProblem({ ...base, next: assignment(["ACCOUNTANT"]) }), null);
});

test("nhãn lời thường", () => {
  assert.equal(rolesLabel(["SALES_STAFF", "ACCOUNTANT"]), "Nhân viên kinh doanh, Kế toán");
  assert.equal(rolesLabel([]), "chưa gán vai");
  assert.equal(permissionsLabel(["SUPER_ADMIN", "INTERN"]), "Toàn quyền, Thực tập");
  assert.equal(permissionsLabel([]), "không có quyền");
});
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/shared/roles.test.ts`
Expected: FAIL — `Cannot find module './roles.ts'`.

- [ ] **Step 3: Viết `src/shared/roles.ts`**

```ts
// VAI VỚI TOUR ĐẢO → BỘ QUYỀN MẶC ĐỊNH (ADR-0018 điều 2–5) — NGUỒN DUY NHẤT trong mã; thuần, không I/O. Server (sinh quyền hiệu lực, kiểm luật
// cứng) và web/ (xem trước quyền khi gán vai) cùng import. Mã vai là DỮ LIỆU ở pty_role_type (migration 0024); src/roles-schema.test.ts giữ hai
// nơi khớp nhau. Vai KHÔNG phải cổng cho phép (ADR-0001 điều 4): vai chỉ đi vào đây để SINH bộ quyền; cổng vẫn là can() của permissions.ts.
// Đổi bảng này = đổi quyền của mọi tài khoản mang vai đó → chỉ qua chủ dự án duyệt + phát hành (ADR-0018 điều 2).
import { PERMISSION_CODES, PERMISSION_LABEL, isPermissionCode, type PermissionCode } from "./permissions.ts";

export const ROLE_CODES = [
  "DIRECTOR", "OPERATIONS_MANAGER", "GUIDE_INTERNAL", "SALES_STAFF", "INTERN", "ACCOUNTANT",
  "TRAVEL_AGENCY", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR",
] as const;
export type RoleCode = (typeof ROLE_CODES)[number];
export type RoleGroup = "INTERNAL" | "EXTERNAL";
/** Nhận (phụ trách) đơn — đặc tả §4: chính / thay khi cần / chỉ đơn mình lập hoặc được cấp trên giao / không bao giờ. Giai đoạn 2 dùng cho luật người nhận. */
export type HandlesOrders = "primary" | "substitute" | "ownOrGiven" | "never";

export interface RoleDef {
  readonly name: string;
  readonly group: RoleGroup;
  readonly defaults: readonly PermissionCode[];
  readonly handles: HandlesOrders;
  /** LC-4: chỉ Toàn quyền được gán hoặc gỡ vai này. */
  readonly superAdminOnly: boolean;
}

export const ROLES: Readonly<Record<RoleCode, RoleDef>> = {
  // Giám đốc = Toàn quyền; kèm Quản trị để các chốt "còn ít nhất một quản trị viên" (đếm quyền ADMIN) vẫn đếm đúng (ADR-0018 điều 4).
  DIRECTOR: { name: "Giám đốc", group: "INTERNAL", defaults: ["ADMIN", "SUPER_ADMIN"], handles: "substitute", superAdminOnly: true },
  OPERATIONS_MANAGER: { name: "Điều hành chung", group: "INTERNAL", defaults: ["ADMIN"], handles: "substitute", superAdminOnly: true },
  GUIDE_INTERNAL: { name: "Hướng dẫn viên nội bộ", group: "INTERNAL", defaults: ["FIELD"], handles: "primary", superAdminOnly: false },
  SALES_STAFF: { name: "Nhân viên kinh doanh", group: "INTERNAL", defaults: ["SALES"], handles: "substitute", superAdminOnly: false },
  INTERN: { name: "Thực tập sinh", group: "INTERNAL", defaults: ["INTERN"], handles: "ownOrGiven", superAdminOnly: false },
  ACCOUNTANT: { name: "Kế toán", group: "INTERNAL", defaults: ["ACCOUNTING"], handles: "ownOrGiven", superAdminOnly: false },
  TRAVEL_AGENCY: { name: "Công ty lữ hành", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
  GUIDE_FREELANCE: { name: "Hướng dẫn viên độc lập", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
  HOTEL_RECEPTION: { name: "Lễ tân khách sạn", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
  TAXI_DRIVER: { name: "Tài xế taxi", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
  COLLABORATOR: { name: "Cộng tác viên", group: "EXTERNAL", defaults: ["PARTNER"], handles: "never", superAdminOnly: false },
};

export const ROLE_GROUP_LABEL: Readonly<Record<RoleGroup, string>> = { INTERNAL: "Nội bộ", EXTERNAL: "Bên ngoài" };
export const isRoleCode = (v: unknown): v is RoleCode => typeof v === "string" && (ROLE_CODES as readonly string[]).includes(v);

/** LC-1: tài khoản mang vai bên ngoài chỉ giữ các quyền này. */
export const EXTERNAL_ALLOWED: readonly PermissionCode[] = ["PARTNER"];
/** LC-4: quyền chỉ Toàn quyền được cấp hoặc gỡ. */
export const SUPER_ADMIN_GRANTED: readonly PermissionCode[] = ["ADMIN", "SUPER_ADMIN"];

/** Nhóm của một tập vai: "NONE" khi chưa có vai mô hình mới; "MIXED" khi lẫn nội bộ và bên ngoài (LC-3 cấm). */
export function groupOf(roles: readonly RoleCode[]): RoleGroup | "NONE" | "MIXED" {
  const groups = new Set(roles.map((r) => ROLES[r].group));
  if (groups.size === 0) return "NONE";
  return groups.size > 1 ? "MIXED" : [...groups][0]!;
}

/** Hợp bộ quyền mặc định của các vai, theo thứ tự chuẩn PERMISSION_CODES. */
export function defaultPermissions(roles: readonly RoleCode[]): PermissionCode[] {
  const set = new Set<PermissionCode>(roles.flatMap((r) => ROLES[r].defaults));
  return PERMISSION_CODES.filter((p) => set.has(p));
}

export interface Adjustments {
  readonly adds: readonly PermissionCode[];
  readonly removes: readonly PermissionCode[];
}

/**
 * Quyền hiệu lực = mặc định của vai + cộng tay − bớt tay, rồi lọc LC-1 (nhóm bên ngoài chỉ giữ EXTERNAL_ALLOWED). `dropped` = quyền bị luật cứng gạt —
 * lưới phòng thủ: đầu vào đã qua roleAssignmentProblem thì rỗng.
 */
export function effectivePermissions(roles: readonly RoleCode[], adj: Adjustments): { permissions: PermissionCode[]; dropped: PermissionCode[] } {
  const want = new Set<PermissionCode>([...defaultPermissions(roles), ...adj.adds]);
  for (const p of adj.removes) want.delete(p);
  const ordered = PERMISSION_CODES.filter((p) => want.has(p));
  if (groupOf(roles) !== "EXTERNAL") return { permissions: ordered, dropped: [] };
  return { permissions: ordered.filter((p) => EXTERNAL_ALLOWED.includes(p)), dropped: ordered.filter((p) => !EXTERNAL_ALLOWED.includes(p)) };
}

export interface RoleAssignment extends Adjustments {
  readonly roles: readonly RoleCode[];
  /** Bắt buộc khi có cộng/bớt tay (LC-6: nhật ký ghi lý do); null khi không chỉnh tay. */
  readonly reason: string | null;
}

/** Mảng mã hợp lệ, không trùng → sắp theo thứ tự chuẩn; `undefined` → mảng rỗng; sai dạng → null. */
function listOf<T extends string>(v: unknown, ok: (x: unknown) => x is T, order: readonly T[]): T[] | null {
  if (v === undefined) return [];
  if (!Array.isArray(v) || !v.every(ok) || new Set(v).size !== v.length) return null;
  return order.filter((x) => (v as unknown[]).includes(x));
}

/** Đọc thân PUT /api/staff/:id/roles (và phần vai của POST /api/staff). Thuần — không tin thứ tự hay khoảng trắng của trình duyệt. */
export function parseRoleAssignment(body: unknown): { ok: true; value: RoleAssignment } | { ok: false; message: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const roles = listOf(b.roles, isRoleCode, ROLE_CODES);
  if (!roles || roles.length === 0) return { ok: false, message: "Chọn ít nhất một vai (mỗi vai một lần)." };
  const adds = listOf(b.adds, isPermissionCode, PERMISSION_CODES);
  const removes = listOf(b.removes, isPermissionCode, PERMISSION_CODES);
  if (!adds || !removes) return { ok: false, message: "Danh sách quyền cộng/bớt tay không hợp lệ." };
  if (adds.some((p) => removes.includes(p))) return { ok: false, message: "Một quyền không thể vừa cộng vừa bớt." };
  const adjusted = adds.length > 0 || removes.length > 0;
  const reason = typeof b.reason === "string" ? b.reason.trim().replace(/\s+/g, " ") : "";
  if (adjusted && !reason) return { ok: false, message: "Cần ghi lý do khi chỉnh quyền tay." };
  if (reason.length > 200) return { ok: false, message: "Lý do tối đa 200 ký tự." };
  return { ok: true, value: { roles, adds, removes, reason: adjusted ? reason : null } };
}

export interface RoleProblem {
  /** true → 403 (thiếu thẩm quyền); false → 400 (đầu vào vi phạm luật). */
  readonly forbidden: boolean;
  readonly message: string;
}

/** LC-4 cho MỌI đường đổi quyền (gán vai, route cũ PUT …/permissions, tạo tài khoản): chỉ Toàn quyền cấp hoặc gỡ Quản trị/Toàn quyền. */
export function highPermissionProblem(actor: readonly PermissionCode[], current: readonly PermissionCode[], next: readonly PermissionCode[]): RoleProblem | null {
  if (actor.includes("SUPER_ADMIN")) return null;
  const changed = SUPER_ADMIN_GRANTED.some((p) => current.includes(p) !== next.includes(p));
  return changed ? { forbidden: true, message: "Chỉ Toàn quyền mới cấp hoặc gỡ quyền Quản trị, Toàn quyền." } : null;
}

/** LC-3 + LC-1 (cộng tay) + LC-4 + "còn ít nhất một quyền" cho MỘT lần gán vai. Máy chủ gọi TRƯỚC khi dựng câu lệnh. */
export function roleAssignmentProblem(a: {
  actor: readonly PermissionCode[];
  currentRoles: readonly RoleCode[];
  currentPermissions: readonly PermissionCode[];
  next: RoleAssignment;
}): RoleProblem | null {
  const group = groupOf(a.next.roles);
  if (group === "MIXED") return { forbidden: false, message: "Một tài khoản không giữ cùng lúc vai nội bộ và vai bên ngoài." };
  if (group === "EXTERNAL" && a.next.adds.some((p) => !EXTERNAL_ALLOWED.includes(p))) {
    return { forbidden: false, message: "Tài khoản bên ngoài chỉ giữ quyền Đối tác — bỏ phần cộng tay quyền khác." };
  }
  if (!a.actor.includes("SUPER_ADMIN")) {
    const touched = [...a.next.roles.filter((r) => !a.currentRoles.includes(r)), ...a.currentRoles.filter((r) => !a.next.roles.includes(r))];
    if (touched.some((r) => ROLES[r].superAdminOnly)) return { forbidden: true, message: "Chỉ Toàn quyền mới gán hoặc gỡ vai Giám đốc, Điều hành chung." };
  }
  const next = effectivePermissions(a.next.roles, a.next).permissions;
  const high = highPermissionProblem(a.actor, a.currentPermissions, next);
  if (high) return high;
  if (next.length === 0) return { forbidden: false, message: "Tài khoản phải còn ít nhất một quyền." };
  return null;
}

/** Nhãn lời thường — dùng cho nhật ký và giao diện. */
export const rolesLabel = (roles: readonly RoleCode[]): string => (roles.length ? roles.map((r) => ROLES[r].name).join(", ") : "chưa gán vai");
export const permissionsLabel = (list: readonly PermissionCode[]): string => (list.length ? list.map((p) => PERMISSION_LABEL[p]).join(", ") : "không có quyền");
```

- [ ] **Step 4: Chạy để thấy xanh**

Run: `node --test src/shared/roles.test.ts`
Expected: PASS.

- [ ] **Step 5: Viết test khớp mã ↔ dữ liệu** — `src/roles-schema.test.ts`

```ts
// Hai nguồn phải khớp nhau (ADR-0018 điều 2): danh mục vai trong mã (src/shared/roles.ts) ↔ pty_role_type; nhãn quyền (PERMISSION_LABEL) ↔
// stf_permission_type. Dựng schema THẬT từ migrations/*.sql bằng node:sqlite. Đỏ = ai đó sửa một bên mà quên bên kia.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { PERMISSION_CODES, PERMISSION_LABEL } from "./shared/permissions.ts";
import { ROLES, ROLE_CODES } from "./shared/roles.ts";

const DIR = new URL("../migrations/", import.meta.url);
const db = new DatabaseSync(":memory:");
for (const f of readdirSync(DIR).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));

test("mỗi vai trong roles.ts có dòng pty_role_type cùng tên, cùng nhóm, đang dùng", () => {
  for (const code of ROLE_CODES) {
    const row = db.prepare("SELECT name, role_group, active FROM pty_role_type WHERE code = ?").get(code) as { name: string; role_group: string; active: number } | undefined;
    assert.ok(row, `thiếu ${code} trong pty_role_type`);
    assert.equal(row.name, ROLES[code].name, `${code}: tên`);
    assert.equal(row.role_group, ROLES[code].group, `${code}: nhóm`);
    assert.equal(row.active, 1, `${code}: phải đang dùng`);
  }
  const grouped = (db.prepare("SELECT code FROM pty_role_type WHERE role_group IN ('INTERNAL', 'EXTERNAL')").all() as { code: string }[]).map((r) => r.code);
  assert.deepEqual(grouped.sort(), [...ROLE_CODES].sort(), "không có vai nội bộ/bên ngoài nào ngoài roles.ts");
});

test("mỗi mã quyền có dòng stf_permission_type với đúng nhãn hiển thị", () => {
  for (const code of PERMISSION_CODES) {
    const row = db.prepare("SELECT name FROM stf_permission_type WHERE code = ?").get(code) as { name: string } | undefined;
    assert.equal(row?.name, PERMISSION_LABEL[code], code);
  }
});
```

Run: `node --test src/roles-schema.test.ts`
Expected: PASS. (P16: tạm đổi tên `"Kế toán"` của `ACCOUNTANT` trong `roles.ts` thành `"Ke toan"` → test này ĐỎ; hoàn nguyên → xanh. Chép dòng đỏ.)

- [ ] **Step 6: Toàn bộ test + typecheck + commit**

Run: `npm test && npm run typecheck`
Expected: PASS, 0 lỗi.

```bash
git add src/shared/roles.ts src/shared/roles.test.ts src/roles-schema.test.ts
git commit -m "Vai & quyền: nguồn duy nhất src/shared/roles.ts (11 vai, quyền hiệu lực, kiểm luật cứng)" -m "Vì sao: ADR-0018 điều 2–5 — bộ quyền mặc định của vai cố định trong mã, server và giao diện dùng chung một phép tính; luật LC-1/LC-3/LC-4 kiểm thuần trước khi ghi. Test giữ mã khớp pty_role_type và stf_permission_type." -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Module `parties` — hàm vai cho tài khoản, chặn vai nội bộ/bên ngoài ở route Hồ sơ, meta đủ loại vai

**Files:**
- Modify: `src/modules/parties/repository.ts:109,154-156` (đổi `ROLE_TYPES`/`listRoleTypes`) + thêm SQL/hàm cuối tệp
- Modify: `src/modules/parties/index.ts:12-16` (import), `:23` (thêm export), `:30-36` (`constraintProblem`), `:115-118` (meta), `:225-243` (thêm vai), `:245-259` (kết thúc vai)
- Modify: `src/shared/contracts.ts:521-524` (`PartyMetaResponse`)
- Modify: `web/parties.ts:65,243,245`
- Modify: `tests/e2e/parties.mjs:15` + thêm khẳng định sau dòng 149
- Create: `src/modules/parties/account-roles.test.ts`

**Interfaces:**
- Produces (qua `src/modules/parties/index.ts`, cho Task 5):
  - `interface AccountRole { id: string; roleTypeCode: string; validFrom: string; validTo: string | null }`
  - `accountRolesOf(db, partyId: string, today: string): Promise<AccountRole[]>` — vai **không gắn nơi**, đang mở hoặc đóng từ `today` trở đi
  - `openRoleCodesByParty(db, partyIds: readonly string[]): Promise<Map<string, string[]>>` — vai đang mở, một truy vấn
  - `openAccountRoleStatement(db, partyId, roleTypeCode, from, actorId, at): D1PreparedStatement`
  - `closeAccountRoleStatement(db, partyId, roleId, to, actorId, at): D1PreparedStatement`
  - `reopenAccountRoleStatement(db, partyId, roleId, actorId, at): D1PreparedStatement`
  - `partySummary(db, id): Promise<{ kind: "PERSON" | "ORGANIZATION"; active: boolean; displayName: string } | null>`
- `PartyMetaResponse.roleTypes: { code: string; name: string; group: "INTERNAL" | "EXTERNAL" | "OTHER"; active: boolean }[]` (trả **mọi** loại vai để giao diện hiện đúng tên cả vai cũ đã ngưng). Người dùng duy nhất: `web/parties.ts`.

- [ ] **Step 1: Viết test (đỏ)** — `src/modules/parties/account-roles.test.ts`

```ts
// Hàm vai cho tài khoản của module parties (ADR-0018 điều 3) — chạy SQL THẬT (defineSql của repository.ts) trên schema dựng từ migrations/*.sql.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import { accountRolesOf, openRoleCodesFor, reopenRoleStatement, roleRowGroup, roleTypeGroup } from "./repository.ts";

const DIR = new URL("../../../migrations/", import.meta.url);
const AT = "2026-09-24T03:00:00.000Z";

/** D1 giả tối thiểu trên node:sqlite: prepare().bind() → all/first/run; câu chưa chạy mang sql + args để chạy tay. */
function fakeD1(sqlite: DatabaseSync): D1Database {
  const bound = (sql: string, args: SupportedValueType[]) => ({
    sql,
    args,
    all: async () => ({ results: (sqlite.prepare(sql).all(...args) as object[]).map((r) => ({ ...r })) }),
    first: async () => {
      const row = sqlite.prepare(sql).get(...args);
      return row ? { ...row } : null;
    },
    run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...args).changes } }),
  });
  return { prepare: (sql: string) => ({ bind: (...args: SupportedValueType[]) => bound(sql, args) }) } as unknown as D1Database;
}

function seed(): { sqlite: DatabaseSync; db: D1Database } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  for (const p of ["p-a", "p-b"]) {
    sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(p, p, AT, AT);
    sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(p, p, AT, AT);
  }
  const role = (id: string, party: string, code: string, from: string, to: string | null) =>
    sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?)")
      .run(id, party, code, from, to, AT, AT);
  role("r-staff", "p-a", "STAFF", "2026-09-01", "2026-09-22"); // đóng từ trước hôm nay → không trả
  role("r-sales", "p-a", "SALES_STAFF", "2026-09-24", "2026-09-24"); // đóng TRONG hôm nay → trả (để mở lại)
  role("r-acc", "p-a", "ACCOUNTANT", "2026-09-10", null); // đang mở → trả
  role("r-cus", "p-b", "CUSTOMER", "2026-09-10", null);
  return { sqlite, db: fakeD1(sqlite) };
}

test("accountRolesOf: vai không gắn nơi, đang mở hoặc đóng từ hôm nay", async () => {
  const { db } = seed();
  const rows = await accountRolesOf(db, "p-a", "2026-09-24");
  assert.deepEqual(rows.map((r) => [r.id, r.valid_to_date]), [["r-acc", null], ["r-sales", "2026-09-24"]]);
});

test("openRoleCodesFor: vai đang mở, gộp theo hồ sơ, một truy vấn", async () => {
  const { db } = seed();
  const map = await openRoleCodesFor(db, ["p-a", "p-b", "p-khong-co"]);
  assert.deepEqual(map.get("p-a"), ["ACCOUNTANT"]);
  assert.deepEqual(map.get("p-b"), ["CUSTOMER"]);
  assert.equal(map.has("p-khong-co"), false);
  assert.equal((await openRoleCodesFor(db, [])).size, 0);
});

test("roleTypeGroup / roleRowGroup: đọc nhóm của loại vai và của một dòng vai", async () => {
  const { db } = seed();
  assert.equal(await roleTypeGroup(db, "SALES_STAFF"), "INTERNAL");
  assert.equal(await roleTypeGroup(db, "COLLABORATOR"), "EXTERNAL");
  assert.equal(await roleTypeGroup(db, "CUSTOMER"), "OTHER");
  assert.equal(await roleTypeGroup(db, "KHONG_CO"), null);
  assert.equal(await roleRowGroup(db, "p-a", "r-acc"), "INTERNAL");
  assert.equal(await roleRowGroup(db, "p-b", "r-acc"), null, "dòng của hồ sơ khác");
});

test("reopenRoleStatement: mở lại dòng đã đóng (valid_to_date → NULL), không chèn dòng chồng lấn", async () => {
  const { sqlite, db } = seed();
  const stmt = reopenRoleStatement(db, "p-a", "r-sales", "s-admin", AT) as unknown as { sql: string; args: SupportedValueType[] };
  assert.equal(sqlite.prepare(stmt.sql).run(...stmt.args).changes, 1);
  const row = sqlite.prepare("SELECT valid_to_date, updated_by FROM pty_party_role WHERE id = 'r-sales'").get() as { valid_to_date: string | null; updated_by: string };
  assert.deepEqual({ ...row }, { valid_to_date: null, updated_by: "s-admin" });
});
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/modules/parties/account-roles.test.ts`
Expected: FAIL — `accountRolesOf` (và các hàm khác) không được export.

- [ ] **Step 3: SQL + hàm ở `src/modules/parties/repository.ts`**

Thay khai báo `ROLE_TYPES` (dòng 109):

```ts
// Mọi loại vai (cả vai đã ngưng) kèm nhóm: giao diện cần tên đúng của vai cũ để hiện; ô "thêm vai" tự lọc nhóm OTHER đang dùng.
const ROLE_TYPES = defineSql("parties", "role_types", "SELECT code, name, role_group, active FROM pty_role_type ORDER BY sort_order");
```

Thay hàm `listRoleTypes` (dòng 154–156):

```ts
export interface RoleTypeRow { code: string; name: string; role_group: string; active: number }
export async function listRoleTypes(db: D1Database): Promise<RoleTypeRow[]> {
  return (await db.prepare(ROLE_TYPES).all<RoleTypeRow>()).results;
}
```

Thêm cuối tệp:

```ts
// ---- Vai với Tour Đảo của hồ sơ gắn tài khoản (ADR-0018 điều 3) — CHỈ hàm sinh quyền của module staff dùng, qua index.ts ---------------------
export interface AccountRoleRow { id: string; role_type_code: string; valid_from_date: string; valid_to_date: string | null }
// ?2 = hôm nay (giờ VN). Vai không gắn nơi: đang mở, hoặc đã đóng TỪ hôm nay trở đi (để mở lại trong ngày thay vì chèn dòng chồng lấn).
const ACCOUNT_ROLES_OF = defineSql(
  "parties",
  "account_roles_of",
  `SELECT id, role_type_code, valid_from_date, valid_to_date FROM pty_party_role
   WHERE party_id = ?1 AND location_id IS NULL AND (valid_to_date IS NULL OR valid_to_date >= ?2)
   ORDER BY valid_from_date, id`,
);
// ?1 = mảng JSON các id hồ sơ. Vai đang mở, gộp theo hồ sơ — MỘT truy vấn cho cả danh sách tài khoản.
const OPEN_ROLE_CODES_FOR = defineSql(
  "parties",
  "open_role_codes_for",
  `SELECT party_id, group_concat(role_type_code) AS codes FROM pty_party_role
   WHERE party_id IN (SELECT value FROM json_each(?1)) AND valid_to_date IS NULL GROUP BY party_id`,
);
const ROLE_TYPE_GROUP = defineSql("parties", "role_type_group", "SELECT role_group FROM pty_role_type WHERE code = ?1");
const ROLE_ROW_GROUP = defineSql(
  "parties",
  "role_row_group",
  "SELECT t.role_group FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code WHERE r.id = ?1 AND r.party_id = ?2",
);
const REOPEN_ROLE = defineSql(
  "parties",
  "reopen_role",
  "UPDATE pty_party_role SET valid_to_date = NULL, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND party_id = ?2 AND valid_to_date IS NOT NULL",
);

export async function accountRolesOf(db: D1Database, partyId: string, today: string): Promise<AccountRoleRow[]> {
  return (await db.prepare(ACCOUNT_ROLES_OF).bind(partyId, today).all<AccountRoleRow>()).results;
}
export async function openRoleCodesFor(db: D1Database, partyIds: readonly string[]): Promise<Map<string, string[]>> {
  if (partyIds.length === 0) return new Map();
  const { results } = await db.prepare(OPEN_ROLE_CODES_FOR).bind(JSON.stringify(partyIds)).all<{ party_id: string; codes: string }>();
  return new Map(results.map((r) => [r.party_id, r.codes.split(",")]));
}
export async function roleTypeGroup(db: D1Database, code: string): Promise<string | null> {
  return (await db.prepare(ROLE_TYPE_GROUP).bind(code).first<{ role_group: string }>())?.role_group ?? null;
}
export async function roleRowGroup(db: D1Database, partyId: string, roleId: string): Promise<string | null> {
  return (await db.prepare(ROLE_ROW_GROUP).bind(roleId, partyId).first<{ role_group: string }>())?.role_group ?? null;
}
export const reopenRoleStatement = (db: D1Database, partyId: string, roleId: string, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(REOPEN_ROLE).bind(roleId, partyId, at, actorId);
```

- [ ] **Step 4: Chạy để thấy xanh**

Run: `node --test src/modules/parties/account-roles.test.ts`
Expected: PASS.

- [ ] **Step 5: Công bố hàm qua `src/modules/parties/index.ts` và chặn ở route vai**

Thêm vào khối import từ `./repository` (dòng 12–16): `accountRolesOf as accountRoleRows, openRoleCodesFor, reopenRoleStatement, roleRowGroup, roleTypeGroup`. Thêm ngay sau dòng `export type { ContactInput, … } from "./rules";` (dòng 23):

```ts
/** Một dòng vai với Tour Đảo (không gắn nơi) của hồ sơ gắn tài khoản. */
export interface AccountRole { id: string; roleTypeCode: string; validFrom: string; validTo: string | null }

/**
 * Vai của hồ sơ gắn tài khoản: đang mở + đã đóng từ `today` (ADR-0018 điều 3). CHỈ hàm sinh quyền của module staff gọi — vai KHÔNG phải cổng
 * cho phép (ADR-0001 điều 4); ngoài parties không mã nào đọc bảng vai (R-N1-12).
 */
export async function accountRolesOf(db: D1Database, partyId: string, today: string): Promise<AccountRole[]> {
  return (await accountRoleRows(db, partyId, today)).map((r) => ({ id: r.id, roleTypeCode: r.role_type_code, validFrom: r.valid_from_date, validTo: r.valid_to_date }));
}
/** Mã vai đang mở của nhiều hồ sơ trong MỘT truy vấn (danh sách tài khoản). */
export const openRoleCodesByParty = openRoleCodesFor;
/** Câu mở một vai với Tour Đảo (không gắn nơi) từ `from` — module staff gộp vào một db.batch() cùng quyền + nhật ký. */
export const openAccountRoleStatement = (db: D1Database, partyId: string, roleTypeCode: string, from: string, actorId: string, at: string): D1PreparedStatement =>
  addRoleStatement(db, partyId, { roleTypeCode, locationId: null, from, to: null }, actorId, at);
/** Câu đóng một vai với Tour Đảo tại ngày `to`. */
export const closeAccountRoleStatement = (db: D1Database, partyId: string, roleId: string, to: string, actorId: string, at: string): D1PreparedStatement =>
  endRoleStatement(db, partyId, roleId, to, actorId, at);
/** Câu mở lại một vai đã đóng trong hôm nay (tránh chèn dòng chồng lấn khi gỡ rồi gán lại cùng ngày). */
export const reopenAccountRoleStatement = reopenRoleStatement;
/** Tóm tắt hồ sơ cho module staff (tạo tài khoản trên hồ sơ có sẵn). */
export async function partySummary(db: D1Database, id: string): Promise<{ kind: "PERSON" | "ORGANIZATION"; active: boolean; displayName: string } | null> {
  const p = await findParty(db, id);
  return p ? { kind: p.party_kind, active: p.active === 1, displayName: p.display_name } : null;
}

const ACCOUNT_ROLE = () => error(409, "role_via_account", "Vai này quyết định quyền đăng nhập nên chỉ gán hoặc gỡ ở trang Nhân viên.");
const isAccountGroup = (g: string | null): boolean => g === "INTERNAL" || g === "EXTERNAL";
```

Trong `constraintProblem` (dòng 30–36), thêm ngay sau dòng `const m = …`:

```ts
  if (/party_role_group_conflict/.test(m)) return error(409, "role_group_conflict", "Một hồ sơ không giữ cùng lúc vai nội bộ và vai bên ngoài.");
```

Route `GET /api/parties/meta` (dòng 115–118) đổi thân thành:

```ts
      const [roleTypes, relationshipTypes] = await Promise.all([listRoleTypes(env.DB), listRelationshipTypes(env.DB)]);
      return json({
        roleTypes: roleTypes.map((t) => ({ code: t.code, name: t.name, group: t.role_group as "INTERNAL" | "EXTERNAL" | "OTHER", active: t.active === 1 })),
        relationshipTypes,
      } satisfies PartyMetaResponse);
```

Route `POST /api/parties/:id/roles`: ngay sau `if (!parsed.ok) return error(400, "invalid_input", parsed.message);` thêm:

```ts
      if (isAccountGroup(await roleTypeGroup(env.DB, parsed.value.roleTypeCode))) return ACCOUNT_ROLE();
```

Route `POST /api/parties/:id/roles/:rid/end`: ngay sau dòng `if (!id || !rid || !(await findParty(env.DB, id))) return NOT_FOUND();` thêm:

```ts
      if (isAccountGroup(await roleRowGroup(env.DB, id, rid))) return ACCOUNT_ROLE();
```

- [ ] **Step 6: Hợp đồng + giao diện Hồ sơ**

`src/shared/contracts.ts` — đổi `PartyMetaResponse` (dòng 521–524):

```ts
export interface PartyMetaResponse {
  /** MỌI loại vai (cả vai đã ngưng — để hiện đúng tên); `group` OTHER là vai gán được ở trang Hồ sơ, INTERNAL/EXTERNAL chỉ gán ở trang Nhân viên (ADR-0018). */
  roleTypes: { code: string; name: string; group: "INTERNAL" | "EXTERNAL" | "OTHER"; active: boolean }[];
  relationshipTypes: { code: string; name: string }[];
}
```

`web/parties.ts`: thêm ngay dưới `roleLabel` (dòng 65):

```ts
/** Vai quyết định quyền đăng nhập (nội bộ/bên ngoài, ADR-0018): chỉ gán/gỡ ở trang Nhân viên. */
const isAccountRole = (code: string): boolean => {
  const g = meta.roleTypes.find((t) => t.code === code)?.group;
  return g === "INTERNAL" || g === "EXTERNAL";
};
```

Dòng 243 (ô cuối của mỗi hàng vai): thay `admin && !r2.validTo && button("Kết thúc", …)` bằng `admin && !r2.validTo && (isAccountRole(r2.roleTypeCode) ? h("span", { class: "muted" }, "Đổi ở trang Nhân viên") : button("Kết thúc", …))` (giữ nguyên thân `button(…)` hiện có).

Dòng 245 — ô chọn thêm vai chỉ lấy loại vai nhóm OTHER đang dùng:

```ts
  const rType = select(meta.roleTypes.filter((t) => t.active && t.group === "OTHER").map((t) => ({ value: t.code, label: t.name })));
```

(Ô lọc danh sách ở dòng 309 giữ mọi loại vai — lọc theo vai nào cũng hợp lệ.)

- [ ] **Step 7: Sửa e2e Hồ sơ có chủ đích** — `tests/e2e/parties.mjs`

Thay dòng 15:

```js
// ADR-0018: meta trả MỌI loại vai (kể cả vai cũ đã ngưng) kèm nhóm và trạng thái; vai nội bộ/bên ngoài chỉ gán ở trang Nhân viên.
assert.deepEqual(r.body.roleTypes.map((t) => t.code).sort(), [
  "ACCOUNTANT", "AGENT", "BOAT_CAPTAIN", "COLLABORATOR", "CUSTOMER", "DIRECTOR", "DRIVER", "GUIDE", "GUIDE_FREELANCE", "GUIDE_INTERNAL",
  "HOTEL_RECEPTION", "INTERN", "OPERATIONS_MANAGER", "SALES", "SALES_STAFF", "STAFF", "TAXI_DRIVER", "TRAVEL_AGENCY",
]);
assert.deepEqual(r.body.roleTypes.find((t) => t.code === "SALES_STAFF"), { code: "SALES_STAFF", name: "Nhân viên kinh doanh", group: "INTERNAL", active: true });
assert.equal(r.body.roleTypes.find((t) => t.code === "STAFF").active, false);
```

Ngay sau dòng 149 (khẳng định `DRIVER` sai ngày `2026-02-30`), thêm:

```js
// ADR-0018: vai quyết định quyền đăng nhập không gán/gỡ ở trang Hồ sơ.
for (const code of ["SALES_STAFF", "COLLABORATOR"]) {
  const x = await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: code });
  assert.equal(x.status, 409, `${code}: ${JSON.stringify(x.body)}`);
  assert.equal(x.body.error.code, "role_via_account");
}
console.log("✓ vai nội bộ/bên ngoài chỉ gán ở trang Nhân viên");
```

- [ ] **Step 8: Chạy test + typecheck + e2e + Chrome Hồ sơ**

Run: `npm test && npm run typecheck && npm run test:e2e -- parties`
Expected: PASS; e2e `parties` xanh (kể cả bước `audit-invariants --strict` cuối).

Run (sau `npm run build:web`, theo `tests/e2e/README.md`): `dot-a-smoke.mjs` ở `docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/` (web/CLAUDE.md: sửa `web/parties.ts` → chạy kịch bản này).
Expected: thoát 0, 0 bước ✗.

- [ ] **Step 9: P16 + commit**

P16: tạm xoá dòng `if (isAccountGroup(await roleTypeGroup(…))) return ACCOUNT_ROLE();` → `npm run test:e2e -- parties` ĐỎ ở khẳng định mới (201 thay vì 409); chép dòng đỏ; hoàn nguyên; xanh.

```bash
git add src/modules/parties src/shared/contracts.ts web/parties.ts tests/e2e/parties.mjs
git commit -m "Hồ sơ: hàm vai cho tài khoản; vai nội bộ/bên ngoài chỉ gán ở trang Nhân viên" -m "Vì sao: ADR-0018 điều 3 — vai sinh quyền nên chỉ đường gán vai của tài khoản (module staff) được mở/đóng các vai này, để quyền luôn khớp vai; route Hồ sơ chung giữ cho vai nhóm OTHER. Meta trả mọi loại vai kèm nhóm/trạng thái để giao diện hiện đúng tên vai cũ đã ngưng; trang Hồ sơ ẩn nút Kết thúc cho vai tài khoản." -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Module `staff` — trạng thái vai, câu đổi vai + chỉnh tay, tạo tài khoản theo vai / trên hồ sơ có sẵn

**Files:**
- Modify: `src/modules/staff/repository.ts` (thêm cuối tệp — sau khai báo `OTHER_ADMIN` dòng 50)
- Modify: `src/modules/staff/index.ts:5-16` (import) + hàm mới cuối tệp
- Create: `src/modules/staff/account-roles.test.ts`

**Interfaces:**
- Consumes: Task 3 (`effectivePermissions`, `groupOf`, `isRoleCode`, `ROLE_CODES`, `type RoleAssignment`, `type RoleCode`), Task 4 (hàm vai của `parties`).
- Produces (qua `src/modules/staff/index.ts`, cho Task 7):
  - `interface AccountRoleState { roles: RoleCode[]; adds: PermissionCode[]; removes: PermissionCode[]; reason: string | null; rows: AccountRole[]; adjustments: AdjustmentRow[] }`
  - `getAccountRoleState(db, account: StaffAccount, today: string): Promise<AccountRoleState | null>` (null khi tài khoản chưa có hồ sơ)
  - `interface RoleChange { roleStatements: D1PreparedStatement[]; adjustmentStatements: D1PreparedStatement[]; permissions: { guarded: D1PreparedStatement | null; rest: D1PreparedStatement[] }; next: PermissionCode[]; dropped: PermissionCode[]; changed: boolean }`
  - `roleChangeStatements(db, args: { account: StaffAccount; partyId: string; state: AccountRoleState; next: RoleAssignment; actorId: string; at: string; today: string }): RoleChange`
  - `type CreateWithRoles = { ok: true; id: string; partyId: string; pin: string; statements: D1PreparedStatement[]; permissions: PermissionCode[] } | { ok: false; message: string }`
  - `createAccountWithRolesStatements(db, input: { fullName: string | null; phone: string; assignment: RoleAssignment; existingPartyId: string | null }, actorId: string): Promise<CreateWithRoles>`
  - `accountRoleCodes(db, accounts: readonly StaffAccount[]): Promise<Map<string, RoleCode[]>>`

- [ ] **Step 1: Viết test (đỏ)** — `src/modules/staff/account-roles.test.ts`

```ts
// Đổi vai / chỉnh tay / tạo tài khoản theo vai (ADR-0018) — chạy CHÍNH các câu lệnh module staff dựng (gói bằng esbuild như
// src/modules/accounts/patch-staff.test.ts, vì index.ts import module khác bằng thư mục) trên SQLite thật dựng từ migrations/*.sql, CÓ trigger LC-1/LC-3.
// Mỗi ca chạy batch đúng thứ tự route (Task 7) dùng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SupportedValueType } from "node:sqlite";
import * as esbuild from "esbuild";
import type { StaffAccount } from "../../shared/contracts.ts";

const DIR = new URL("../../../migrations/", import.meta.url);
const AT = "2026-09-24T03:00:00.000Z";
const TODAY = "2026-09-24";

type Module = typeof import("./index.ts");
async function loadModule(): Promise<Module> {
  const built = await esbuild.build({ entryPoints: [new URL("./index.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false });
  return (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Module;
}
const staff = await loadModule();

interface Stmt { sql: string; args: SupportedValueType[] }
function fakeD1(sqlite: DatabaseSync): D1Database {
  const bound = (sql: string, args: SupportedValueType[]) => ({
    sql,
    args,
    all: async () => ({ results: (sqlite.prepare(sql).all(...args) as object[]).map((r) => ({ ...r })) }),
    first: async () => {
      const row = sqlite.prepare(sql).get(...args);
      return row ? { ...row } : null;
    },
    run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...args).changes } }),
  });
  return {
    prepare: (sql: string) => ({ bind: (...args: SupportedValueType[]) => bound(sql, args) }),
    batch: async (stmts: Stmt[]) => {
      sqlite.exec("BEGIN");
      try {
        const out = stmts.map((s) => ({ meta: { changes: sqlite.prepare(s.sql).run(...s.args).changes } }));
        sqlite.exec("COMMIT");
        return out;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  } as unknown as D1Database;
}

/** Schema đầy đủ + quản trị viên + một tài khoản CŨ (vai STAFF từ 19/9, quyền SALES + ACCOUNTING). */
function seed(): { sqlite: DatabaseSync; db: D1Database } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(f, DIR), "utf8"));
  const account = (id: string, phone: string, perms: string[]) => {
    const party = `pty-${id}`;
    sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(party, id, AT, AT);
    sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(party, id, AT, AT);
    sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, 'STAFF', NULL, '2026-09-19', ?, ?)").run(`ptr-${id}`, party, AT, AT);
    sqlite.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)").run(id, phone, AT, party);
    for (const p of perms) sqlite.prepare("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(`perm-${id}-${p}`, id, p, AT, AT, AT);
  };
  account("s-adm", "0900000001", ["ADMIN", "SUPER_ADMIN"]);
  account("s-old", "0900000002", ["SALES", "ACCOUNTING"]);
  return { sqlite, db: fakeD1(sqlite) };
}

const openPerms = (sqlite: DatabaseSync, id: string) =>
  (sqlite.prepare("SELECT permission_type_code AS c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY c").all(id) as { c: string }[]).map((r) => r.c);
const openRoles = (sqlite: DatabaseSync, party: string) =>
  (sqlite.prepare("SELECT role_type_code AS c FROM pty_party_role WHERE party_id = ? AND valid_to_date IS NULL ORDER BY c").all(party) as { c: string }[]).map((r) => r.c);
const account = async (db: D1Database, id: string): Promise<StaffAccount> => (await staff.getStaffAccount(db, id))!;

/** Chạy một lần đổi vai theo ĐÚNG thứ tự route (Task 7): có câu chốt gỡ ADMIN → hai batch; không → một batch. */
async function change(db: D1Database, id: string, next: { roles: string[]; adds?: string[]; removes?: string[]; reason?: string | null }) {
  const acc = await account(db, id);
  const state = (await staff.getAccountRoleState(db, acc, TODAY))!;
  const c = staff.roleChangeStatements(db, {
    account: acc, partyId: acc.partyId!, state,
    next: { roles: next.roles as never, adds: (next.adds ?? []) as never, removes: (next.removes ?? []) as never, reason: next.reason ?? null },
    actorId: "s-adm", at: AT, today: TODAY,
  });
  if (c.permissions.guarded) {
    await db.batch([c.permissions.guarded, ...c.permissions.rest, ...c.adjustmentStatements]);
    if (c.roleStatements.length) await db.batch(c.roleStatements);
  } else {
    await db.batch([...c.roleStatements, ...c.adjustmentStatements, ...c.permissions.rest]);
  }
  return c;
}

test("chuyển tài khoản cũ sang vai mới: vai STAFF đóng hôm qua, quyền = bộ mặc định (mất Kế toán nếu không cộng tay)", async () => {
  const { sqlite, db } = seed();
  const c = await change(db, "s-old", { roles: ["SALES_STAFF"] });
  assert.deepEqual(c.next, ["SALES"]);
  assert.deepEqual(openPerms(sqlite, "s-old"), ["SALES"]);
  assert.deepEqual(openRoles(sqlite, "pty-s-old"), ["SALES_STAFF"]);
  const staffRow = sqlite.prepare("SELECT valid_to_date FROM pty_party_role WHERE id = 'ptr-s-old'").get() as { valid_to_date: string };
  assert.equal(staffRow.valid_to_date, "2026-09-23", "vai cũ đóng vào hôm qua (bắt đầu trước hôm nay)");
});

test("cộng tay có lý do giữ quyền; trạng thái đọc lại được lý do; bỏ cộng tay thì đóng dòng chỉnh", async () => {
  const { sqlite, db } = seed();
  await change(db, "s-old", { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], reason: "kiêm nhiệm kế toán" });
  assert.deepEqual(openPerms(sqlite, "s-old"), ["ACCOUNTING", "SALES"]);
  const adj = sqlite.prepare("SELECT direction, reason FROM stf_permission_adjustment WHERE staff_id = 's-old' AND valid_to_at IS NULL").all() as object[];
  assert.deepEqual(adj.map((r) => ({ ...r })), [{ direction: "ADD", reason: "kiêm nhiệm kế toán" }]);
  const state = (await staff.getAccountRoleState(db, await account(db, "s-old"), TODAY))!;
  assert.deepEqual([state.roles, state.adds, state.removes, state.reason], [["SALES_STAFF"], ["ACCOUNTING"], [], "kiêm nhiệm kế toán"]);
  await change(db, "s-old", { roles: ["SALES_STAFF"] });
  assert.deepEqual(openPerms(sqlite, "s-old"), ["SALES"]);
  assert.equal((sqlite.prepare("SELECT count(*) AS n FROM stf_permission_adjustment WHERE staff_id = 's-old' AND valid_to_at IS NULL").get() as { n: number }).n, 0);
});

test("Review Focus 1–2: nội bộ → bên ngoài → nội bộ trong CÙNG ngày — không vấp trigger, mở lại dòng thay vì chèn chồng lấn", async () => {
  const { sqlite, db } = seed();
  await change(db, "s-old", { roles: ["SALES_STAFF"] });
  await change(db, "s-old", { roles: ["COLLABORATOR"] });
  assert.deepEqual(openPerms(sqlite, "s-old"), ["PARTNER"]);
  assert.deepEqual(openRoles(sqlite, "pty-s-old"), ["COLLABORATOR"]);
  await change(db, "s-old", { roles: ["SALES_STAFF"] });
  assert.deepEqual(openPerms(sqlite, "s-old"), ["SALES"]);
  assert.deepEqual(openRoles(sqlite, "pty-s-old"), ["SALES_STAFF"]);
  const salesRows = (sqlite.prepare("SELECT count(*) AS n FROM pty_party_role WHERE party_id = 'pty-s-old' AND role_type_code = 'SALES_STAFF'").get() as { n: number }).n;
  assert.equal(salesRows, 1, "mở lại dòng cũ, không chèn dòng thứ hai");
});

test("gỡ ADMIN → có câu chốt 'còn quản trị viên khác' (route chạy hai batch)", async () => {
  const { db } = seed();
  await change(db, "s-old", { roles: ["SALES_STAFF"], adds: ["ADMIN"], reason: "thử" });
  const acc = await account(db, "s-old");
  const state = (await staff.getAccountRoleState(db, acc, TODAY))!;
  const c = staff.roleChangeStatements(db, { account: acc, partyId: acc.partyId!, state, next: { roles: ["SALES_STAFF"], adds: [], removes: [], reason: null }, actorId: "s-adm", at: AT, today: TODAY });
  assert.notEqual(c.permissions.guarded, null);
});

test("tạo tài khoản theo vai: hồ sơ mới mang đúng vai (không STAFF), quyền = mặc định, dòng chỉnh tay có lý do", async () => {
  const { sqlite, db } = seed();
  const made = await staff.createAccountWithRolesStatements(db, {
    fullName: "Trần Văn Hướng", phone: "0911111111", existingPartyId: null,
    assignment: { roles: ["GUIDE_INTERNAL"], adds: ["SALES"], removes: [], reason: "kiêm bán vé" },
  }, "s-adm");
  assert.ok(made.ok);
  if (!made.ok) return;
  await db.batch(made.statements as never);
  assert.deepEqual(made.permissions, ["SALES", "FIELD"]);
  assert.deepEqual(openPerms(sqlite, made.id), ["FIELD", "SALES"]);
  assert.deepEqual(openRoles(sqlite, made.partyId), ["GUIDE_INTERNAL"]);
});

test("tạo tài khoản trên hồ sơ có sẵn: dùng lại hồ sơ, thêm vai; hồ sơ đã có tài khoản / tổ chức → báo lỗi", async () => {
  const { sqlite, db } = seed();
  sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p-khach', 'PERSON', 'Khách Cũ', 1, ?, ?)").run(AT, AT);
  sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p-khach', 'Khách', ?, ?)").run(AT, AT);
  sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-k', 'p-khach', 'CUSTOMER', NULL, '2026-09-01', ?, ?)").run(AT, AT);
  const input = (existingPartyId: string, roles: string[]) => ({ fullName: null, phone: "0922222222", existingPartyId, assignment: { roles: roles as never, adds: [], removes: [], reason: null } });
  const made = await staff.createAccountWithRolesStatements(db, input("p-khach", ["HOTEL_RECEPTION"]), "s-adm");
  assert.ok(made.ok);
  if (!made.ok) return;
  await db.batch(made.statements as never);
  assert.equal(made.partyId, "p-khach");
  assert.deepEqual(openRoles(sqlite, "p-khach"), ["CUSTOMER", "HOTEL_RECEPTION"]);
  assert.deepEqual(openPerms(sqlite, made.id), ["PARTNER"]);
  assert.deepEqual(await staff.createAccountWithRolesStatements(db, input("pty-s-old", ["SALES_STAFF"]), "s-adm"), { ok: false, message: "Hồ sơ này đã có tài khoản." });
  sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p-org', 'ORGANIZATION', 'Cty', 1, ?, ?)").run(AT, AT);
  sqlite.prepare("INSERT INTO pty_organization (party_id, legal_name, created_at, updated_at) VALUES ('p-org', 'Cty', ?, ?)").run(AT, AT);
  assert.equal((await staff.createAccountWithRolesStatements(db, input("p-org", ["TRAVEL_AGENCY"]), "s-adm")).ok, false, "tài khoản công ty: giai đoạn 4");
});

test("accountRoleCodes: vai mô hình mới đang mở của từng tài khoản (vai cũ STAFF không tính)", async () => {
  const { db } = seed();
  await change(db, "s-old", { roles: ["ACCOUNTANT"] });
  const map = await staff.accountRoleCodes(db, [await account(db, "s-old"), await account(db, "s-adm")]);
  assert.deepEqual(map.get("s-old"), ["ACCOUNTANT"]);
  assert.deepEqual(map.get("s-adm"), []);
});
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/modules/staff/account-roles.test.ts`
Expected: FAIL — `staff.getAccountRoleState is not a function`.

- [ ] **Step 3: SQL mới** — thêm cuối `src/modules/staff/repository.ts`

```ts
// ---- Chỉnh quyền tay (ADR-0018 điều 3) — bảng stf_permission_adjustment ------------------------------------------------------------------------------
export interface AdjustmentRow { id: string; permission_type_code: string; direction: string; reason: string }
// Mới nhất trước: lý do của lần chỉnh gần nhất đứng đầu (giao diện điền sẵn).
const OPEN_ADJUSTMENTS = defineSql(
  "staff",
  "open_adjustments",
  "SELECT id, permission_type_code, direction, reason FROM stf_permission_adjustment WHERE staff_id = ?1 AND valid_to_at IS NULL ORDER BY valid_from_at DESC, permission_type_code",
);
// ?7 = 1 khi lần đổi này gỡ ADMIN: mang CÙNG điều kiện "còn quản trị viên khác" với các câu quyền (xem setPermissionStatements của index.ts).
const INSERT_ADJUSTMENT = defineSql(
  "staff",
  "insert_adjustment",
  `INSERT INTO stf_permission_adjustment (id, staff_id, permission_type_code, direction, reason, valid_from_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?6, ?8, ?6, ?8 WHERE (?7 = 0 OR ${OTHER_ADMIN(2)})`,
);
const CLOSE_ADJUSTMENT = defineSql(
  "staff",
  "close_adjustment",
  `UPDATE stf_permission_adjustment SET valid_to_at = ?3, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND staff_id = ?2 AND valid_to_at IS NULL AND (?5 = 0 OR ${OTHER_ADMIN(2)})`,
);
const ACCOUNT_OF_PARTY = defineSql("staff", "account_of_party", "SELECT id FROM staff WHERE party_id = ?1");

export async function openAdjustments(db: D1Database, staffId: string): Promise<AdjustmentRow[]> {
  return (await db.prepare(OPEN_ADJUSTMENTS).bind(staffId).all<AdjustmentRow>()).results;
}
export const insertAdjustmentStatement = (
  db: D1Database,
  v: { staffId: string; code: PermissionCode; direction: "ADD" | "REMOVE"; reason: string; at: string; actorId: string; guarded: boolean },
): D1PreparedStatement => db.prepare(INSERT_ADJUSTMENT).bind(crypto.randomUUID(), v.staffId, v.code, v.direction, v.reason, v.at, v.guarded ? 1 : 0, v.actorId);
export const closeAdjustmentStatement = (db: D1Database, v: { id: string; staffId: string; at: string; actorId: string; guarded: boolean }): D1PreparedStatement =>
  db.prepare(CLOSE_ADJUSTMENT).bind(v.id, v.staffId, v.at, v.actorId, v.guarded ? 1 : 0);
export async function accountIdOfParty(db: D1Database, partyId: string): Promise<string | null> {
  return (await db.prepare(ACCOUNT_OF_PARTY).bind(partyId).first<{ id: string }>())?.id ?? null;
}
```

- [ ] **Step 4: Hàm mới** — `src/modules/staff/index.ts`

Thay khối import dòng 5–16:

```ts
import {
  accountRolesOf, closeAccountRoleStatement, newPersonStatements, openAccountRoleStatement, openRoleCodesByParty, partySummary, renamePersonStatements,
  reopenAccountRoleStatement, splitPersonName, validatePersonFullName, type AccountRole,
} from "../parties";
import { hashPin, verifyDummy, verifyPin } from "./password";
import { isValidPin, normalizePhone } from "./phone";
import {
  accountIdOfParty, closeAdjustmentStatement, closePermissionStatement, countActiveAdmins, findById, findByPhone, insertAdjustmentStatement, insertPermissionStatement,
  insertStaffStatement, listAll, openAdjustments, parsePermissions, recordLoginRow, setPinStatement as setPinRow, touchCredentialsStatement, updateStaffStatement,
  type AdjustmentRow, type StaffRow,
} from "./repository";
import { canManageAccount, checkAccountChange, generatePin, isWeakPin, validateFreshPin } from "./rules";
import { parseStaffSheet as parseSheetRows, type StaffCandidate, type StaffSheetParse } from "./sheet";
import type { StaffAccount, StaffProfile } from "../../shared/contracts";
import { PERMISSION_CODES, type PermissionCode } from "../../shared/permissions";
import { ROLE_CODES, effectivePermissions, groupOf, isRoleCode, type RoleAssignment, type RoleCode } from "../../shared/roles";
import { addDays, vnToday } from "../../shared/vn-date";
```

Thêm cuối tệp:

```ts
// =================================================================================================================================================
// Vai → quyền (ADR-0018 điều 3). NƠI DUY NHẤT vai ảnh hưởng quyền: đọc vai qua hàm của parties (không nhắc bảng vai — R-N1-12), tính quyền hiệu lực
// bằng src/shared/roles.ts, trả câu lệnh CHƯA chạy để accounts gộp cùng nhật ký. Tài khoản chưa gán vai mới KHÔNG bao giờ bị tính lại quyền ở đây.
// =================================================================================================================================================

/** Mã vai cũ (migration 0011) — đóng khi tài khoản được gán vai mô hình mới (đặc tả §4, §14). */
const LEGACY_ACCOUNT_ROLES: readonly string[] = ["STAFF", "SALES", "GUIDE", "AGENT"];

export interface AccountRoleState {
  /** Vai mô hình mới đang mở. Rỗng = tài khoản chưa chuyển sang cách mới (giữ nguyên quyền cũ). */
  roles: RoleCode[];
  adds: PermissionCode[];
  removes: PermissionCode[];
  /** Lý do của lần chỉnh tay gần nhất (giao diện điền sẵn); null khi không có chỉnh tay. */
  reason: string | null;
  /** Dòng vai không gắn nơi: đang mở + đóng từ hôm nay (để dựng câu đóng/mở lại). */
  rows: AccountRole[];
  adjustments: AdjustmentRow[];
}

export async function getAccountRoleState(db: D1Database, account: StaffAccount, today: string): Promise<AccountRoleState | null> {
  if (!account.partyId) return null;
  const [rows, adjustments] = await Promise.all([accountRolesOf(db, account.partyId, today), openAdjustments(db, account.id)]);
  const open = rows.filter((r) => r.validTo === null).map((r) => r.roleTypeCode);
  const adjusted = (direction: string) => PERMISSION_CODES.filter((c) => adjustments.some((a) => a.permission_type_code === c && a.direction === direction));
  return { roles: ROLE_CODES.filter((c) => open.includes(c)), adds: adjusted("ADD"), removes: adjusted("REMOVE"), reason: adjustments[0]?.reason ?? null, rows, adjustments };
}

export interface RoleChange {
  /** Câu vai (module parties) — ĐÓNG trước, MỞ sau, để trigger LC-3 không vấp khi đổi nhóm trong một lần lưu. */
  roleStatements: D1PreparedStatement[];
  adjustmentStatements: D1PreparedStatement[];
  /** Như setPermissionStatements: `guarded` ≠ null khi lần đổi gỡ ADMIN (route chạy hai batch — xem accounts). */
  permissions: { guarded: D1PreparedStatement | null; rest: D1PreparedStatement[] };
  next: PermissionCode[];
  dropped: PermissionCode[];
  changed: boolean;
}

/**
 * Câu lệnh cho MỘT lần đổi vai + chỉnh tay. Người gọi đã kiểm roleAssignmentProblem + checkAccountChange. Vai bỏ đi đóng vào HÔM QUA nếu bắt đầu trước
 * hôm nay (không còn hiệu lực từ hôm nay), vào HÔM NAY nếu mới mở hôm nay; gán lại một vai vừa đóng hôm nay thì MỞ LẠI dòng đó (không chèn dòng chồng lấn).
 */
export function roleChangeStatements(
  db: D1Database,
  args: { account: StaffAccount; partyId: string; state: AccountRoleState; next: RoleAssignment; actorId: string; at: string; today: string },
): RoleChange {
  const { account, partyId, state, next, actorId, at, today } = args;
  const { permissions: nextPermissions, dropped } = effectivePermissions(next.roles, next);
  const perm = setPermissionStatements(db, { staffId: account.id, current: account.permissions, next: nextPermissions, actorId, at });
  const guarded = perm.guarded !== null;
  const closing = state.rows.filter(
    (r) => r.validTo === null && ((isRoleCode(r.roleTypeCode) && !next.roles.includes(r.roleTypeCode)) || LEGACY_ACCOUNT_ROLES.includes(r.roleTypeCode)),
  );
  const opening = next.roles.filter((code) => !state.rows.some((r) => r.roleTypeCode === code && r.validTo === null));
  const roleStatements = [
    ...closing.map((r) => closeAccountRoleStatement(db, partyId, r.id, r.validFrom < today ? addDays(today, -1) : today, actorId, at)),
    ...opening.map((code) => {
      const closedToday = state.rows.find((r) => r.roleTypeCode === code && r.validTo === today);
      return closedToday ? reopenAccountRoleStatement(db, partyId, closedToday.id, actorId, at) : openAccountRoleStatement(db, partyId, code, today, actorId, at);
    }),
  ];
  const wanted = [...next.adds.map((c) => ({ c, d: "ADD" as const })), ...next.removes.map((c) => ({ c, d: "REMOVE" as const }))];
  const closeAdj = state.adjustments.filter((a) => !wanted.some((w) => w.c === a.permission_type_code && w.d === a.direction));
  const newAdj = wanted.filter((w) => !state.adjustments.some((a) => a.permission_type_code === w.c && a.direction === w.d));
  const adjustmentStatements = [
    ...closeAdj.map((a) => closeAdjustmentStatement(db, { id: a.id, staffId: account.id, at, actorId, guarded })),
    ...newAdj.map((w) => insertAdjustmentStatement(db, { staffId: account.id, code: w.c, direction: w.d, reason: next.reason ?? "", at, actorId, guarded })),
  ];
  return {
    roleStatements,
    adjustmentStatements,
    permissions: { guarded: perm.guarded, rest: perm.rest },
    next: nextPermissions,
    dropped,
    changed: perm.changed || roleStatements.length > 0 || adjustmentStatements.length > 0,
  };
}

export type CreateWithRoles =
  | { ok: true; id: string; partyId: string; pin: string; statements: D1PreparedStatement[]; permissions: PermissionCode[] }
  | { ok: false; message: string };

/**
 * Tạo tài khoản THEO VAI (ADR-0018): hồ sơ mới mang đúng các vai đã chọn (không thêm vai STAFF cũ), HOẶC dùng lại hồ sơ cá nhân có sẵn (chưa có tài khoản,
 * không va chạm nhóm vai). Quyền = quyền hiệu lực của vai + chỉnh tay. Thứ tự câu: vai → tài khoản → quyền → chỉnh tay (khoá ngoại + trigger LC-1).
 */
export async function createAccountWithRolesStatements(
  db: D1Database,
  input: { fullName: string | null; phone: string; assignment: RoleAssignment; existingPartyId: string | null },
  actorId: string,
): Promise<CreateWithRoles> {
  const now = new Date();
  const at = now.toISOString();
  const today = vnToday(now);
  const { assignment } = input;
  const { permissions } = effectivePermissions(assignment.roles, assignment);
  const statements: D1PreparedStatement[] = [];
  let partyId: string;
  if (input.existingPartyId) {
    const party = await partySummary(db, input.existingPartyId);
    if (!party) return { ok: false, message: "Không tìm thấy hồ sơ đã chọn." };
    if (party.kind !== "PERSON") return { ok: false, message: "Tài khoản chung cho công ty làm ở giai đoạn sau — hãy chọn hồ sơ cá nhân." };
    if (!party.active) return { ok: false, message: "Hồ sơ đã chọn đang ngưng hoạt động." };
    if (await accountIdOfParty(db, input.existingPartyId)) return { ok: false, message: "Hồ sơ này đã có tài khoản." };
    const open = (await accountRolesOf(db, input.existingPartyId, today)).filter((r) => r.validTo === null).map((r) => r.roleTypeCode).filter(isRoleCode);
    if (groupOf([...open, ...assignment.roles]) === "MIXED") return { ok: false, message: "Hồ sơ này đang giữ vai khác nhóm (nội bộ/bên ngoài) — đóng vai đó trước." };
    partyId = input.existingPartyId;
    statements.push(...assignment.roles.filter((c) => !open.includes(c)).map((c) => openAccountRoleStatement(db, partyId, c, today, actorId, at)));
  } else {
    const name = input.fullName ? splitPersonName(input.fullName) : null;
    if (!name) throw new Error("createAccountWithRolesStatements: họ tên rỗng");
    const person = newPersonStatements(db, { name, roles: assignment.roles.map((c) => ({ roleTypeCode: c, locationId: null, from: today, to: null })), contactsFrom: today }, actorId, at);
    partyId = person.partyId;
    statements.push(...person.statements);
  }
  const id = crypto.randomUUID();
  const pin = generatePin();
  const adjust = (code: PermissionCode, direction: "ADD" | "REMOVE") =>
    insertAdjustmentStatement(db, { staffId: id, code, direction, reason: assignment.reason ?? "", at, actorId, guarded: false });
  statements.push(
    insertStaffStatement(db, { id, phone: input.phone, pinHash: await hashPin(pin), createdAt: at, partyId }),
    ...permissions.map((code) => insertPermissionStatement(db, id, code, actorId, at, false)),
    ...assignment.adds.map((c) => adjust(c, "ADD")),
    ...assignment.removes.map((c) => adjust(c, "REMOVE")),
  );
  return { ok: true, id, partyId, pin, statements, permissions };
}

/** Vai mô hình mới đang mở của từng tài khoản — MỘT truy vấn cho cả danh sách (vai cũ STAFF… không tính). */
export async function accountRoleCodes(db: D1Database, accounts: readonly StaffAccount[]): Promise<Map<string, RoleCode[]>> {
  const byParty = await openRoleCodesByParty(db, accounts.flatMap((a) => (a.partyId ? [a.partyId] : [])));
  return new Map(accounts.map((a) => [a.id, ROLE_CODES.filter((c) => (a.partyId ? (byParty.get(a.partyId) ?? []) : []).includes(c))]));
}
```

- [ ] **Step 5: Chạy để thấy xanh**

Run: `node --test src/modules/staff/account-roles.test.ts`
Expected: PASS (7 test).

- [ ] **Step 6: Kiểm luật kiến trúc + toàn bộ**

Run: `node --test src/architecture.test.ts && npm test && npm run typecheck`
Expected: PASS — đặc biệt R-N1-12 (không tệp `.ts` nào ngoài `parties` chứa tên bảng vai, kể cả chú thích) và EXPLAIN của ba câu SQL mới (chỉ đọc/ghi bảng của `staff`).

- [ ] **Step 7: P16 + commit**

P16: trong `roleChangeStatements`, tạm đảo thứ tự `roleStatements` (mở trước, đóng sau) → test "Review Focus 1–2" ĐỎ với `party_role_group_conflict`; chép dòng đỏ; hoàn nguyên; xanh.

```bash
git add src/modules/staff
git commit -m "Tài khoản: đổi vai + chỉnh quyền tay, tạo tài khoản theo vai hoặc trên hồ sơ có sẵn" -m "Vì sao: ADR-0018 điều 3 — module staff là nơi duy nhất biến vai thành quyền (đọc vai qua hàm của parties, không đụng bảng vai); đóng vai trước khi mở để đổi nhóm trong một lần lưu không vấp LC-3; gán lại vai trong ngày thì mở lại dòng cũ. Tài khoản chưa gán vai mới không bị tính lại quyền." -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Kiểm bất biến dữ liệu — R-LC-1, R-LC-3; sửa kiểm "thiếu vai STAFF"

Phải xong **trước** Task 7: e2e kết thúc bằng `audit-invariants --strict`, nên tài khoản tạo theo vai (không có vai `STAFF`) sẽ làm kiểm "thông tin" cũ đỏ oan ngay ở lần e2e đầu của Task 7.

**Files:**
- Modify: `scripts/audit-checks.mjs:53-58` + thêm hai kiểm trước khối "Người phụ trách đơn" (dòng 66)
- Modify: `src/audit-invariants.test.ts` (thêm cuối tệp)

**Interfaces:**
- Consumes: bảng/trigger của Task 1.
- Produces: hai kiểm mức `fail` mã `R-LC-1`, `R-LC-3`; kiểm "thông tin" về vai của nhân sự chấp nhận cả vai mô hình mới.

- [ ] **Step 1: Viết test (đỏ)** — thêm cuối `src/audit-invariants.test.ts`

```ts
/** Schema đầy đủ NHƯNG gỡ ba trigger luật cứng — để dựng được dữ liệu vi phạm (như dữ liệu sửa tay bằng SQL trên D1 thật) mà kiểm phải bắt. */
function schemaWithoutGuards(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of FILES) db.exec(sqlText(f));
  db.exec("DROP TRIGGER lc1_stf_permission_external_partner_only; DROP TRIGGER pty_party_role_group_conflict_ins; DROP TRIGGER pty_party_role_group_conflict_upd;");
  return db;
}
function guardSeed(db: DatabaseSync, id: string, roles: string[], perms: string[]): void {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(`p-${id}`, id, T1, T1);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(`p-${id}`, id, T1, T1);
  db.prepare("INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES (?, '', ?, 'x', 'sales', 1, ?, ?)").run(id, `09${id.padStart(8, "0").slice(-8)}`, T1, `p-${id}`);
  roles.forEach((r, i) => db.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, NULL, '2026-09-20', ?, ?)").run(`r-${id}-${i}`, `p-${id}`, r, T1, T1));
  perms.forEach((p) => db.prepare("INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(`g-${id}-${p}`, id, p, T1, T1, T1));
}

test("R-LC-1: tài khoản có vai bên ngoài mà giữ quyền khác Đối tác → vi phạm; hợp lệ → 0", () => {
  const db = schemaWithoutGuards();
  guardSeed(db, "11", ["COLLABORATOR"], ["PARTNER"]);
  guardSeed(db, "12", ["SALES_STAFF"], ["SALES"]);
  assert.equal(violations(db, one("R-LC-1")), 0);
  guardSeed(db, "13", ["TAXI_DRIVER"], ["PARTNER", "SALES"]);
  assert.equal(violations(db, one("R-LC-1")), 1);
  assert.equal(one("R-LC-1").level, "fail");
});

test("R-LC-3: một hồ sơ giữ cùng lúc vai nội bộ và vai bên ngoài đang mở → vi phạm", () => {
  const db = schemaWithoutGuards();
  guardSeed(db, "21", ["SALES_STAFF", "CUSTOMER"], ["SALES"]);
  assert.equal(violations(db, one("R-LC-3")), 0);
  guardSeed(db, "22", ["SALES_STAFF", "COLLABORATOR"], ["SALES"]);
  assert.equal(violations(db, one("R-LC-3")), 1);
  assert.equal(one("R-LC-3").level, "fail");
});

test("kiểm 'thông tin' về vai của nhân sự: vai STAFF cũ HOẶC vai nội bộ/bên ngoài đang mở đều đạt", () => {
  const db = schemaWithoutGuards();
  const check = CHECKS.find((c) => c.what.startsWith("nhân sự đã có hồ sơ nhưng"))!;
  guardSeed(db, "31", ["STAFF"], ["SALES"]);
  guardSeed(db, "32", ["ACCOUNTANT"], ["ACCOUNTING"]);
  assert.equal(violations(db, check), 0);
  guardSeed(db, "33", ["CUSTOMER"], ["SALES"]);
  assert.equal(violations(db, check), 1);
});
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/audit-invariants.test.ts`
Expected: FAIL — "phải có đúng một kiểm R-LC-1"; kiểm "thông tin" đếm 1 cho tài khoản `ACCOUNTANT`.

- [ ] **Step 3: Sửa `scripts/audit-checks.mjs`**

Thay kiểm "nhân sự đã có hồ sơ nhưng thiếu vai trò STAFF" (dòng 53–58) bằng:

```js
  {
    code: "thông tin",
    what: "nhân sự đã có hồ sơ nhưng không có vai STAFF (cũ) hay vai nội bộ/bên ngoài nào đang mở (ADR-0018)",
    sql: `SELECT count(*) FROM staff s WHERE s.party_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code
      WHERE r.party_id = s.party_id AND (r.role_type_code = 'STAFF' OR (r.valid_to_date IS NULL AND t.role_group IN ('INTERNAL', 'EXTERNAL'))))`,
    level: "warn-unless-strict",
  },
```

Thêm ngay trước khối `// ---- Người phụ trách đơn` (dòng 66):

```js
  // ---- Luật cứng ADR-0018 — trigger LC-1/LC-3 chặn ở CSDL (migration 0024); các kiểm này là LƯỚI THỨ HAI (P21) cho dữ liệu sửa tay bằng SQL. ----
  {
    code: "R-LC-1",
    what: "tài khoản có vai bên ngoài đang mở chỉ giữ quyền Đối tác",
    sql: `SELECT count(*) FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.valid_to_at IS NULL AND p.permission_type_code <> 'PARTNER'
     WHERE EXISTS (SELECT 1 FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code
                   WHERE r.party_id = s.party_id AND r.valid_to_date IS NULL AND t.role_group = 'EXTERNAL')`,
    level: "fail",
  },
  {
    code: "R-LC-3",
    what: "một hồ sơ không giữ cùng lúc vai nội bộ và vai bên ngoài đang mở",
    sql: `SELECT count(*) FROM (SELECT r.party_id FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code
       WHERE r.valid_to_date IS NULL AND t.role_group IN ('INTERNAL', 'EXTERNAL') GROUP BY r.party_id HAVING count(DISTINCT t.role_group) > 1)`,
    level: "fail",
  },
```

- [ ] **Step 4: Chạy để thấy xanh**

Run: `node --test src/audit-invariants.test.ts && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/audit-checks.mjs src/audit-invariants.test.ts
git commit -m "Kiểm dữ liệu: thêm R-LC-1, R-LC-3; kiểm vai nhân sự chấp nhận vai mô hình mới" -m "Vì sao: P21 — mọi kiểm soát trọng yếu có hai lớp: trigger chặn lúc ghi, audit-invariants bắt dữ liệu sửa tay trên D1 thật. Tài khoản tạo theo vai không còn vai STAFF nên kiểm 'thông tin' cũ sẽ đỏ oan ở chế độ --strict (e2e)." -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Module `accounts` — route vai, siết LC-4 ở mọi đường cấp quyền, DTO có vai, nhãn "Toàn quyền"; e2e

**Files:**
- Modify: `src/modules/accounts/index.ts` (import dòng 11–24; hằng dòng 33–34; `labelOf` dòng 41; `cleanPermissions` dòng 56–59; `dto` dòng 62; route dòng 285–443)
- Modify: `src/shared/audit-actions.ts` (thêm hành động)
- Modify: `src/shared/contracts.ts:3-8,30-38` (`StaffAccountDto.roles`, `StaffRolesRequest`, `StaffRolesResponse`)
- Modify: `src/route-access.test.ts:144,168-177` (2 dòng SNAPSHOT, số đếm)
- Create: `tests/e2e/roles.mjs`; Modify: `tests/e2e/run.mjs:16-19`, `tests/e2e/admin.mjs:76-81`, `tests/e2e/admin-race.mjs:7,11,34`

**Interfaces:**
- Consumes: Task 3 (`parseRoleAssignment`, `roleAssignmentProblem`, `highPermissionProblem`, `rolesLabel`, `permissionsLabel`, `type RoleAssignment`, `type RoleCode`, `type RoleProblem`), Task 5 (hàm staff).
- Produces (API):
  - `GET /api/staff/:id/roles` (admin) → `StaffRolesResponse { roles: RoleCode[]; adds: PermissionCode[]; removes: PermissionCode[]; reason: string | null }`
  - `PUT /api/staff/:id/roles` (admin), thân `StaffRolesRequest { roles; adds?; removes?; reason? }` → `StaffResponse`; lỗi: 400 (luật/đầu vào), 403 (LC-4 hoặc không quản lý được), 404, 409 (`account_rule`, `no_party`)
  - `POST /api/staff` nhận thêm `roles` (+`adds`, `removes`, `reason`, `partyId`) — có `roles` thì đi đường mới; không có thì đường cũ `permissions` (giữ nguyên, thêm LC-4)
  - `PUT /api/staff/:id/permissions` → **409 `role_managed`** khi tài khoản đã có vai mới; LC-4 áp cho mọi tài khoản, kiểm **SAU** `checkAccountChange`
  - `StaffAccountDto.roles: RoleCode[]` ở mọi phản hồi tài khoản
  - Hành động nhật ký mới `account_roles_changed` ("Đổi vai và quyền tài khoản", nhóm `staff`) — tên khác hẳn `staff_role_changed` (cột chết cũ) để khỏi nhầm

- [ ] **Step 1: Viết e2e (đỏ)** — `tests/e2e/roles.mjs`

```js
// E2E vai & quyền (ADR-0018 giai đoạn 1) trên API THẬT: gán vai sinh quyền, chỉnh tay có lý do, luật cứng LC-1/LC-3/LC-4, route cũ bị khoá với tài khoản
// đã gán vai, tạo tài khoản trên hồ sơ có sẵn, Thực tập sinh chỉ thấy đơn của mình, nhật ký có dòng đổi vai (không chứa SĐT). Chạy qua tests/e2e/run.mjs.
import assert from "node:assert/strict";
import { ACCOUNTS, call, login, orderInput, randomPhone as rnd, session, sqlRows } from "./lib.mjs";

const ADMIN = await session(ACCOUNTS.admin);
const SUPER = await session(ACCOUNTS.superAdmin);
const SALES = await session(ACCOUNTS.salesA);

// ---- 1. Tạo theo vai: quyền = bộ mặc định; hồ sơ mang đúng vai (không còn vai STAFF cũ)
let r = await call(ADMIN, "POST", "/api/staff", { fullName: "Kế Toán Vai", phone: rnd(), roles: ["ACCOUNTANT"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["ACCOUNTING"]);
assert.deepEqual(r.body.staff.roles, ["ACCOUNTANT"]);
const K = r.body.staff;
r = await call(ADMIN, "GET", `/api/parties/${K.partyId}`);
assert.deepEqual(r.body.party.roleCodes, ["ACCOUNTANT"]);
console.log("✓ tạo tài khoản theo vai: quyền = bộ mặc định, hồ sơ mang đúng vai");

// ---- 2. Xem + đổi vai; chỉnh tay phải có lý do; nhật ký ghi trước → sau và KHÔNG chứa SĐT
r = await call(ADMIN, "GET", `/api/staff/${K.id}/roles`);
assert.deepEqual(r.body, { roles: ["ACCOUNTANT"], adds: [], removes: [], reason: null });
assert.equal((await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"] })).status, 400, "chỉnh tay thiếu lý do");
r = await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], reason: "kiêm nhiệm kế toán tạm thời" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["SALES", "ACCOUNTING"]);
assert.deepEqual(r.body.staff.roles, ["SALES_STAFF"]);
r = await call(ADMIN, "GET", `/api/staff/${K.id}/roles`);
assert.deepEqual(r.body, { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], removes: [], reason: "kiêm nhiệm kế toán tạm thời" });
const [log] = await sqlRows(`SELECT detail FROM audit_log WHERE action = 'account_roles_changed' AND target_id = '${K.id}' ORDER BY created_at DESC LIMIT 1`);
assert.match(log.detail, /vai: Kế toán → Nhân viên kinh doanh/);
assert.match(log.detail, /lý do: kiêm nhiệm kế toán tạm thời/);
assert.ok(!log.detail.includes(K.phone), "nhật ký không chứa SĐT");
console.log("✓ đổi vai + chỉnh tay có lý do; nhật ký ghi trước → sau, không chứa SĐT");

// ---- 3. Luật cứng
assert.equal((await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["SALES_STAFF", "COLLABORATOR"] })).status, 400, "LC-3: lẫn hai nhóm");
assert.equal((await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["COLLABORATOR"], adds: ["SALES"], reason: "x" })).status, 400, "LC-1: cộng tay quyền nội bộ cho tài khoản bên ngoài");
r = await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["COLLABORATOR"] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["PARTNER"], "đổi sang vai bên ngoài trong một lần lưu: chỉ còn Đối tác (Review Focus 1)");
assert.equal((await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["OPERATIONS_MANAGER"] })).status, 403, "LC-4: Quản trị không gán vai Điều hành");
assert.equal((await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["SALES_STAFF"], adds: ["ADMIN"], reason: "x" })).status, 403, "LC-4: cộng tay Quản trị");
assert.equal((await call(ADMIN, "POST", "/api/staff", { fullName: "Quản Trị Mới", phone: rnd(), permissions: ["ADMIN"] })).status, 403, "LC-4: tạo tài khoản có Quản trị (đường cũ)");
assert.equal((await call(ADMIN, "POST", "/api/staff", { fullName: "Điều Hành Mới", phone: rnd(), roles: ["OPERATIONS_MANAGER"] })).status, 403, "LC-4: tạo tài khoản vai Điều hành");
r = await call(SUPER, "PUT", `/api/staff/${K.id}/roles`, { roles: ["OPERATIONS_MANAGER"] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["ADMIN"]);
assert.equal((await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["SALES_STAFF"] })).status, 403, "Quản trị không quản lý tài khoản Quản trị khác");
assert.equal((await call(SALES, "GET", `/api/staff/${K.id}/roles`)).status, 403);
console.log("✓ luật cứng LC-1, LC-3, LC-4 ở API thật");

// ---- 4. Route cũ bị khoá với tài khoản đã gán vai; vẫn chạy (kèm LC-4) với tài khoản chưa gán vai
r = await call(SUPER, "PUT", `/api/staff/${K.id}/permissions`, { permissions: ["SALES"] });
assert.equal(r.status, 409);
assert.equal(r.body.error.code, "role_managed");
const legacy = await call(ADMIN, "POST", "/api/staff", { fullName: "Tài Khoản Cũ", phone: rnd(), permissions: ["SALES"] });
assert.equal(legacy.status, 201);
assert.deepEqual(legacy.body.staff.roles, []);
assert.equal((await call(ADMIN, "PUT", `/api/staff/${legacy.body.staff.id}/permissions`, { permissions: ["SALES", "ACCOUNTING"] })).status, 200);
assert.equal((await call(ADMIN, "PUT", `/api/staff/${legacy.body.staff.id}/permissions`, { permissions: ["SALES", "ADMIN"] })).status, 403, "LC-4 cả ở route cũ");
console.log("✓ route cũ: khoá với tài khoản đã gán vai; LC-4 áp mọi tài khoản");

// ---- 5. Toàn quyền tự gán vai cho chính mình (Review Focus 5)
const me = (await call(SUPER, "GET", "/api/auth/me")).body.staff;
assert.equal((await call(SUPER, "PUT", `/api/staff/${me.id}/roles`, { roles: ["DIRECTOR"] })).status, 409, "quyền đổi (thêm Quản trị) → không tự đổi quyền");
r = await call(SUPER, "PUT", `/api/staff/${me.id}/roles`, { roles: ["DIRECTOR"], removes: ["ADMIN"], reason: "tài khoản thử chỉ giữ Toàn quyền" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["SUPER_ADMIN"]);
assert.deepEqual(r.body.staff.roles, ["DIRECTOR"]);
console.log("✓ tự gán vai: quyền không đổi thì cho, đổi thì 409");

// ---- 6. Tạo tài khoản trên hồ sơ có sẵn
const kh = await call(ADMIN, "POST", "/api/parties", { kind: "PERSON", fullName: "Lễ Tân Có Sẵn", contacts: [] });
assert.equal(kh.status, 201, JSON.stringify(kh.body));
r = await call(ADMIN, "POST", "/api/staff", { phone: rnd(), roles: ["HOTEL_RECEPTION"], partyId: kh.body.party.id });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.staff.partyId, kh.body.party.id);
assert.equal(r.body.staff.fullName, "Lễ Tân Có Sẵn");
assert.deepEqual(r.body.staff.permissions, ["PARTNER"]);
assert.equal((await call(ADMIN, "POST", "/api/staff", { phone: rnd(), roles: ["HOTEL_RECEPTION"], partyId: kh.body.party.id })).status, 409, "hồ sơ đã có tài khoản");
console.log("✓ tạo tài khoản trên hồ sơ có sẵn, không tạo hồ sơ trùng");

// ---- 7. Thực tập sinh: lập đơn, chỉ thấy đơn của mình
const ttsPhone = rnd();
r = await call(ADMIN, "POST", "/api/staff", { fullName: "Thực Tập Sinh", phone: ttsPhone, roles: ["INTERN"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["INTERN"]);
const TTS = (await login(ttsPhone, r.body.pin)).cookie;
const other = await call(SALES, "POST", "/api/orders", orderInput());
assert.equal(other.status, 201, JSON.stringify(other.body));
const mine = await call(TTS, "POST", "/api/orders", orderInput({ customerName: "Khách Của Thực Tập" }));
assert.equal(mine.status, 201, JSON.stringify(mine.body));
r = await call(TTS, "GET", "/api/orders");
assert.equal(r.status, 200);
assert.ok(r.body.orders.length >= 1 && r.body.orders.every((o) => o.id === mine.body.order.id), "chỉ thấy đơn của mình");
assert.notEqual((await call(TTS, "GET", `/api/orders/${other.body.order.id}`)).status, 200, "không mở được đơn người khác");
assert.equal((await call(TTS, "GET", "/api/orders/dashboard")).status, 403, "không có Trang chủ văn phòng");
assert.equal((await call(TTS, "GET", "/api/staff")).status, 403);
console.log("✓ Thực tập sinh: lập đơn, chỉ thấy đơn của mình");

console.log("E2E ROLES OK");
```

Đăng ký ở `tests/e2e/run.mjs` (dòng 16–19): chèn `"roles"` **ngay trước** `"passkey"` (passkey phải đứng CUỐI CÙNG), và thêm một câu vào chú thích phía trên:

```js
// "roles" (ADR-0018) đứng TRƯỚC "passkey": đổi vai của tài khoản superAdmin (quyền giữ nguyên) và tạo tài khoản mới — không đụng salesB/field của passkey.
const ALL = ["platform", "pwa", "orders", "trip", "admin", "turnstile", "catalog", "dispatch", "admin-race", "locations", "parties", "booker", "permissions", "feedback", "company", "maintenance", "roles", "passkey"];
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `npm run test:e2e -- roles`
Expected: FAIL ở bước 1 — tài khoản tạo không có `roles` / quyền rỗng (đường `roles` chưa có).

- [ ] **Step 3: Hợp đồng + nhật ký**

`src/shared/contracts.ts`: thêm dòng import `import type { RoleCode } from "./roles.ts";` cạnh các import kiểu ở đầu tệp (dòng 3–6) và thêm `RoleCode` vào dòng `export type { … }` (dòng 8). Thay `StaffAccountDto` (dòng 30–35) và thêm hai kiểu ngay sau `StaffPermissionsRequest` (dòng 38):

```ts
export interface StaffAccountDto extends StaffAccount {
  /** Đang bị khoá đăng nhập do nhập sai PIN quá nhiều lần. */
  locked: boolean;
  /** Số passkey (Face ID) còn hiệu lực. */
  passkeyCount: number;
  /** Vai với Tour Đảo đang mở (ADR-0018). Rỗng = tài khoản chưa chuyển sang cách mới (đang dùng quyền cũ). */
  roles: RoleCode[];
}
```

```ts
/** Thân PUT /api/staff/:id/roles: TOÀN BỘ tập vai mong muốn (không rỗng) + chỉnh tay (lý do bắt buộc khi có). */
export interface StaffRolesRequest { roles: RoleCode[]; adds?: PermissionCode[]; removes?: PermissionCode[]; reason?: string }
/** Vai + chỉnh tay đang có; `reason` = lý do của lần chỉnh tay gần nhất (giao diện điền sẵn), null khi không chỉnh tay. */
export interface StaffRolesResponse { roles: RoleCode[]; adds: PermissionCode[]; removes: PermissionCode[]; reason: string | null }
```

`src/shared/audit-actions.ts`: ngay sau dòng `permission_changed`, thêm:

```ts
  account_roles_changed: { label: "Đổi vai và quyền tài khoản", group: "staff" },
```

- [ ] **Step 4: Sửa `src/modules/accounts/index.ts`**

(a) **Import** — thêm vào khối import từ `"../staff"` (dòng 11–15): `accountRoleCodes, createAccountWithRolesStatements, getAccountRoleState, roleChangeStatements`; thêm `StaffRolesResponse` vào khối `import type { … } from "../../shared/contracts"`; thêm ba dòng:

```ts
import { PARTY_ID_RE } from "../../shared/party-id";
import { highPermissionProblem, parseRoleAssignment, permissionsLabel, roleAssignmentProblem, rolesLabel, type RoleAssignment, type RoleCode, type RoleProblem } from "../../shared/roles";
import { vnToday } from "../../shared/vn-date";
```

(b) **Hằng + hàm phụ** — thay dòng 33–34 (`NOT_MANAGER`, `SUPER_ADMIN_ONLY`) bằng:

```ts
const NOT_MANAGER = () => error(403, "forbidden", "Chỉ quản lý được tài khoản cấp dưới; tài khoản này do Toàn quyền quản lý.");
const NO_PARTY = () => error(409, "no_party", "Tài khoản này chưa có hồ sơ (đang di trú dữ liệu). Thử lại sau ít phút.");
const ROLE_MANAGED = () => error(409, "role_managed", "Tài khoản đã gán vai — đổi quyền bằng cách chọn vai hoặc chỉnh riêng ở mục Vai và quyền.");
const problemResponse = (p: RoleProblem): Response => error(p.forbidden ? 403 : 400, p.forbidden ? "forbidden" : "invalid_input", p.message);
/** Lỗi trigger luật cứng / ràng buộc duy nhất → phản hồi rõ nghĩa (lưới cuối — kiểm thuần đã chặn trước). */
function ruleViolation(e: unknown): Response | null {
  const m = e instanceof Error ? e.message : "";
  if (/party_role_group_conflict/.test(m)) return error(409, "account_rule", "Một hồ sơ không giữ cùng lúc vai nội bộ và vai bên ngoài.");
  if (/lc1_external_account_permission/.test(m)) return error(409, "account_rule", "Tài khoản bên ngoài chỉ giữ quyền Đối tác.");
  if (/UNIQUE constraint failed: staff\.party_id/.test(m)) return error(409, "account_rule", "Hồ sơ này đã có tài khoản.");
  return null;
}
```

Xoá dòng `const labelOf = …` (dòng 41) và đổi mọi `labelOf(` trong tệp thành `permissionsLabel(`. Trong `cleanPermissions` (dòng 56–59) đổi thông báo lỗi để không lộ mã thô:

```ts
  if (!Array.isArray(v) || v.length === 0 || !v.every(isPermissionCode)) return { error: "Danh sách quyền không hợp lệ: chọn ít nhất một quyền." };
```

(c) **DTO có vai** — thay hàm `dto` (dòng 62) và thêm `one` ngay dưới:

```ts
const dto = (s: StaffAccount, locked: Set<string>, passkeys: Map<string, number>, roles: Map<string, RoleCode[]>): StaffAccountDto => ({
  ...s,
  locked: locked.has(s.phone),
  passkeyCount: passkeys.get(s.id) ?? 0,
  roles: roles.get(s.id) ?? [],
});
/** DTO của MỘT tài khoản sau thao tác — đọc lại khoá đăng nhập, số Face ID, vai. */
async function one(db: D1Database, id: string): Promise<StaffAccountDto> {
  const s = (await getStaffAccount(db, id))!;
  const [locked, passkeys, roles] = await Promise.all([lockedPhones(db), countActivePasskeys(db), accountRoleCodes(db, [s])]);
  return dto(s, locked, passkeys, roles);
}
```

Thay **mọi** biểu thức `dto((await getStaffAccount(db, X))!, …)` bằng `await one(db, X)` và `dto(t, await lockedPhones(db), await countActivePasskeys(db))` bằng `await one(db, t.id)` (các route `POST /api/staff`, `PATCH /api/staff/:id`, `PUT …/permissions`, `reset-pin`, `passkeys/remove-all`; tìm bằng `grep -n "dto(" src/modules/accounts/index.ts`). Route `GET /api/staff` (dòng 285–288):

```ts
    route("GET", "/api/staff", "admin", async ({ env }) => {
      const [staff, locked, passkeys] = await Promise.all([listStaffAccounts(env.DB), lockedPhones(env.DB), countActivePasskeys(env.DB)]);
      const roles = await accountRoleCodes(env.DB, staff);
      return json({ staff: staff.map((s) => dto(s, locked, passkeys, roles)) } satisfies StaffListResponse);
    }),
```

(d) **`POST /api/staff`** — thay thân route (dòng 290–313) bằng:

```ts
    route("POST", "/api/staff", "admin", async ({ request, env, staff: admin }) => {
      const db = env.DB;
      const body = await readJson(request);
      const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
      if (body?.roles !== undefined) {
        // ---- Đường MỚI (ADR-0018): tạo theo vai, có thể trên hồ sơ cá nhân có sẵn.
        const parsed = parseRoleAssignment(body);
        if (!parsed.ok) return error(400, "invalid_input", parsed.message);
        const existingPartyId = typeof body.partyId === "string" && body.partyId ? body.partyId : null;
        if (existingPartyId !== null && !PARTY_ID_RE.test(existingPartyId)) return error(400, "invalid_input", "Hồ sơ đã chọn không hợp lệ.");
        const name: { value?: string | null; error?: string } = existingPartyId ? { value: null } : cleanName(body.fullName);
        if (name.error) return error(400, "invalid_input", name.error);
        if (!phone) return error(400, "invalid_input", "Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
        const problem = roleAssignmentProblem({ actor: admin.permissions, currentRoles: [], currentPermissions: [], next: parsed.value });
        if (problem) return problemResponse(problem);
        if (await findStaffByPhone(db, phone)) return PHONE_TAKEN();
        const created = await createAccountWithRolesStatements(db, { fullName: name.value ?? null, phone, assignment: parsed.value, existingPartyId }, admin.id);
        if (!created.ok) return error(409, "account_rule", created.message);
        const detail = [
          `vai: ${rolesLabel(parsed.value.roles)}`,
          `quyền: ${permissionsLabel(created.permissions)}`,
          existingPartyId ? "dùng hồ sơ có sẵn" : "",
          parsed.value.reason ? `lý do: ${parsed.value.reason}` : "",
        ].filter(Boolean).join("; ");
        try {
          await db.batch([...created.statements, adminAudit(db, admin.id, "staff_created", created.id, detail)]);
        } catch (e) {
          if (isUniqueViolation(e)) return PHONE_TAKEN();
          const rule = ruleViolation(e);
          if (rule) return rule;
          throw e;
        }
        return json({ staff: await one(db, created.id), pin: created.pin } satisfies StaffWithPinResponse, 201);
      }
      // ---- Đường CŨ (giữ nguyên hành vi, thêm LC-4): danh sách quyền, hồ sơ mới mang vai STAFF.
      const name = cleanName(body?.fullName);
      if (name.error) return error(400, "invalid_input", name.error);
      if (!phone) return error(400, "invalid_input", "Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
      // D-02 (ADR-0014 điều 7): trường permissions HOÀN TOÀN VẮNG MẶT → không quyền nào (trước đây tự động Bán hàng — lỗ khi gọi thẳng API,
      // bỏ qua màn quản trị vốn luôn gửi danh sách và bắt chọn ít nhất một). Gửi permissions: [] tường minh vẫn bị cleanPermissions từ chối.
      const perms = body?.permissions === undefined ? { value: [] } : cleanPermissions(body.permissions);
      if (perms.error) return error(400, "invalid_input", perms.error);
      // LC-4 (ADR-0018 điều 5): chỉ Toàn quyền cấp Quản trị/Toàn quyền — thay luật cũ chỉ chặn SUPER_ADMIN (trước đây Quản trị cấp được Quản trị).
      const high = highPermissionProblem(admin.permissions, [], perms.value!);
      if (high) return problemResponse(high);
      if (await findStaffByPhone(db, phone)) return PHONE_TAKEN();
      const created = await createAccountStatements(db, { fullName: name.value!, phone, permissions: perms.value! }, admin.id);
      try {
        await db.batch([...created.statements, adminAudit(db, admin.id, "staff_created", created.id, `quyền: ${permissionsLabel(perms.value!)}`)]);
      } catch (e) {
        if (isUniqueViolation(e)) return PHONE_TAKEN();
        throw e;
      }
      return json({ staff: await one(db, created.id), pin: created.pin } satisfies StaffWithPinResponse, 201);
    }),
```

(Thứ tự kiểm của đường cũ giữ như cũ: tên → SĐT → quyền → thẩm quyền; `admin.mjs` dòng 33–39 ghim các mã 400/409 đó.)

(e) **Nạp từ Sheet** — trong `POST /api/staff/sheet/apply`, thay dòng tạo `made` (dòng 353) bằng:

```ts
      const salesStaff: RoleAssignment = { roles: ["SALES_STAFF"], adds: [], removes: [], reason: null };
      const made = await Promise.all(todo.map(async (c) => {
        const r = await createAccountWithRolesStatements(db, { fullName: c.name, phone: c.phone, assignment: salesStaff, existingPartyId: null }, admin.id);
        if (!r.ok) throw new Error(r.message); // hồ sơ mới luôn hợp lệ — không xảy ra
        return { c, ...r };
      }));
```

và đổi chuỗi nhật ký `"nạp từ Google Sheet, quyền: Bán hàng"` thành `"nạp từ Google Sheet, vai: Nhân viên kinh doanh"`.

(f) **`PUT /api/staff/:id/permissions`** — ngay sau `if (!mayManage(admin, t)) return NOT_MANAGER();` (dòng 425) thêm:

```ts
      const state = await getAccountRoleState(db, t, vnToday(new Date()));
      if (state && state.roles.length > 0) return ROLE_MANAGED();
```

Xoá dòng kiểm `SUPER_ADMIN` (dòng 430, trả `SUPER_ADMIN_ONLY()`) và thêm LC-4 **ngay SAU** dòng `if (problem) return error(409, "account_rule", problem);` (dòng 432) — đặt sau để tự đổi quyền của chính mình vẫn trả 409 như `admin.mjs` dòng 95–96 đang ghim:

```ts
      const high = highPermissionProblem(admin.permissions, t.permissions, next); // LC-4 (ADR-0018 điều 5), thay luật riêng cho SUPER_ADMIN
      if (high) return problemResponse(high);
```

(g) **Hai route mới** — đặt ngay sau route `PUT /api/staff/:id/permissions`:

```ts
    // ---- Vai với Tour Đảo của tài khoản (ADR-0018) ---------------------------------------------------------
    route("GET", "/api/staff/:id/roles", "admin", async (ctx) => {
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      const state = await getAccountRoleState(ctx.env.DB, t, vnToday(new Date()));
      if (!state) return NO_PARTY();
      return json({ roles: state.roles, adds: state.adds, removes: state.removes, reason: state.reason } satisfies StaffRolesResponse);
    }),

    route("PUT", "/api/staff/:id/roles", "admin", async (ctx) => {
      const { request, env, staff: admin } = ctx;
      const db = env.DB;
      const t = await target(ctx);
      if (!t) return NOT_FOUND();
      if (!mayManage(admin, t)) return NOT_MANAGER();
      const parsed = parseRoleAssignment(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const now = new Date();
      const at = now.toISOString();
      const today = vnToday(now);
      const state = await getAccountRoleState(db, t, today);
      if (!state || !t.partyId) return NO_PARTY();
      const problem = roleAssignmentProblem({ actor: admin.permissions, currentRoles: state.roles, currentPermissions: t.permissions, next: parsed.value });
      if (problem) return problemResponse(problem);
      const change = roleChangeStatements(db, { account: t, partyId: t.partyId, state, next: parsed.value, actorId: admin.id, at, today });
      const accountProblem = checkAccountChange(admin.id, t, { permissions: change.next }, await countActiveAdmins(db));
      if (accountProblem) return error(409, "account_rule", accountProblem);
      if (!change.changed) return json({ staff: await one(db, t.id) } satisfies StaffResponse);
      const detail = [
        `vai: ${rolesLabel(state.roles)} → ${rolesLabel(parsed.value.roles)}`,
        `quyền: ${permissionsLabel(t.permissions)} → ${permissionsLabel(change.next)}`,
        change.dropped.length ? `luật cứng gạt: ${permissionsLabel(change.dropped)}` : "",
        parsed.value.reason ? `lý do: ${parsed.value.reason}` : "",
      ].filter(Boolean).join("; ");
      try {
        if (change.permissions.guarded) {
          // Gỡ ADMIN: câu chốt "còn quản trị viên khác" ĐẦU batch; nhật ký + quyền + chỉnh tay mang cùng điều kiện. Vai (module parties) không mang được
          // điều kiện của staff nên chạy SAU, chỉ khi câu chốt thắng — tranh chấp chỉ có thể xảy ra giữa hai tài khoản Toàn quyền (LC-4).
          const results = await db.batch([
            change.permissions.guarded,
            adminAudit(db, admin.id, "account_roles_changed", t.id, detail, "changes() > 0"),
            ...change.permissions.rest,
            ...change.adjustmentStatements,
          ]);
          if ((results[0]!.meta.changes ?? 0) === 0) return LAST_ADMIN();
          if (change.roleStatements.length) await db.batch(change.roleStatements);
        } else {
          await db.batch([...change.roleStatements, ...change.adjustmentStatements, ...change.permissions.rest, adminAudit(db, admin.id, "account_roles_changed", t.id, detail)]);
        }
      } catch (e) {
        const rule = ruleViolation(e);
        if (rule) return rule;
        throw e;
      }
      return json({ staff: await one(db, t.id) } satisfies StaffResponse);
    }),
```

- [ ] **Step 5: Ảnh chụp mức truy cập** — `src/route-access.test.ts`

Thêm hai dòng vào `SNAPSHOT`, ngay sau dòng `reset-pin` (dòng 144; mảng được `sortRoutes` sắp lại nên vị trí chỉ để dễ đọc):

```ts
  { method: "GET", path: "/api/staff/:id/roles", access: "admin" }, // vai + chỉnh tay của một tài khoản (ADR-0018)
  { method: "PUT", path: "/api/staff/:id/roles", access: "admin" }, // gán vai — quyền sinh từ vai (ADR-0018)
```

Tăng số đếm route **thêm 2** ở tên test (dòng 168), hai `assert.equal` (dòng 176–177) và thêm một câu vào chú thích đếm (dòng 172–174): `2026-09-24: + 2 route vai (GET/PUT /api/staff/:id/roles, ADR-0018) = <số mới>.` (Hôm nay là 69 → 71; nếu main đã đổi số thì lấy số hiện có + 2.)

- [ ] **Step 6: Sửa e2e có chủ đích** — `tests/e2e/admin.mjs`, `tests/e2e/admin-race.mjs`

`tests/e2e/admin.mjs` dòng 76–81 (chú thích ADR-0014 + ba khẳng định đầu về cấp `ADMIN`) thay bằng:

```js
// LC-4 (ADR-0018 điều 5): Quản trị KHÔNG còn cấp được quyền Quản trị — chỉ Toàn quyền. Sau khi A giữ ADMIN, Quản trị cũng không quản lý được A nữa (ADR-0014 điều 8).
assert.equal((await raw(ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: ["ADMIN", "SALES"] })).status, 403, "Quản trị không cấp quyền Quản trị");
r = await raw(SUPER_ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: ["ADMIN", "SALES"] });
assert.equal(r.status, 200, JSON.stringify(r.body)); assert.deepEqual(r.body.staff.permissions, ["SALES", "ADMIN"]);
assert.equal((await raw(ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: ["SALES"] })).status, 403, "Admin không còn quản lý được A sau khi A thành Admin");
```

(giữ nguyên các dòng từ `r = await raw(SUPER_ADMIN, "PUT", …, { permissions: ["SALES"] });` trở đi.)

`tests/e2e/admin-race.mjs`: trong `mk` (dòng 11) đổi người tạo từ `Z` sang `SUPER` — tạo tài khoản có `ADMIN` nay chỉ Toàn quyền làm được (LC-4); xoá dòng `const Z = await session(ACCOUNTS.admin);` (dòng 7) và sửa chú thích cuối dòng 34 cho khớp ("Z (chỉ ADMIN) không còn quản lý được nữa" → "một Quản trị thường cũng không quản lý được nữa").

- [ ] **Step 7: Chạy để thấy xanh**

Run: `npm test && npm run typecheck && npm run test:e2e -- admin admin-race parties permissions roles`
Expected: PASS; `E2E ROLES OK`; bước `audit-invariants --strict` cuối đạt. Nếu nhánh hàng rào quyền đã vào main (Task 0 Step 5): chạy thêm `node --test src/route-write-guard.test.ts src/permission-enforcement.test.ts` → PASS.

- [ ] **Step 8: P16 + commit**

P16: tạm xoá dòng `if (high) return problemResponse(high);` ở route `PUT …/permissions` → `npm run test:e2e -- roles` ĐỎ ở "LC-4 cả ở route cũ" (200 thay vì 403); chép dòng đỏ; hoàn nguyên; xanh.

```bash
git add src/modules/accounts src/shared/audit-actions.ts src/shared/contracts.ts src/route-access.test.ts tests/e2e/roles.mjs tests/e2e/run.mjs tests/e2e/admin.mjs tests/e2e/admin-race.mjs
git commit -m "Quản trị tài khoản: gán vai sinh quyền, chỉ Toàn quyền cấp Quản trị, tạo tài khoản trên hồ sơ có sẵn" -m "Vì sao: ADR-0018 điều 3–5 — route mới GET/PUT /api/staff/:id/roles; đường tạo tài khoản nhận vai và hồ sơ có sẵn; LC-4 áp cho MỌI đường cấp quyền (kể cả route cũ, trước đây Quản trị cấp được Quản trị); route cũ khoá với tài khoản đã gán vai để quyền luôn khớp vai. Thông báo bỏ chữ Anh 'Super Admin' và mã quyền thô. Tài khoản chưa gán vai giữ nguyên hành vi." -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Giao diện Nhân viên — chọn vai + xem trước, hồ sơ có sẵn; kịch bản Chrome

**Files:**
- Create: `web/role-picker.ts`
- Modify: `web/staff.ts`, `public/staff.html:16-19,26`
- Create: `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs`

**Interfaces:**
- Consumes: Task 3 (`roles.ts`), Task 7 (API vai; `StaffAccount` ở `web/api.ts` = `StaffAccountDto` có `roles`; `Api.StaffRolesRequest`, `Api.StaffRolesResponse`, `Api.PartyLookupResponse` qua `export type * as Api` của `web/api.ts`).
- Produces: `rolePicker(opts: { initial: RolePickerValue; actorIsSuperAdmin: boolean; current: readonly PermissionCode[] | null }): RolePicker`; `interface RolePickerValue { roles: RoleCode[]; adds: PermissionCode[]; removes: PermissionCode[]; reason: string }`; `interface RolePicker { el: HTMLElement; value(): RolePickerValue; reset(v: RolePickerValue): void }`. Ô vai mang `data-kind="role"`, ô chỉnh tay mang `data-kind="add"`/`"remove"` (mã `INTERN` vừa là mã vai vừa là mã quyền — chọn phần tử luôn kèm `data-kind`); dòng xem trước mang `data-role-preview`.

- [ ] **Step 1: Viết kịch bản Chrome (đỏ)** — `docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs`

```js
// Kịch bản Chrome cho khối "Vai và quyền" của trang Nhân viên (ADR-0018 giai đoạn 1): chọn vai theo nhóm, xem trước quyền, luật cứng ở giao diện
// (LC-3: chọn một nhóm thì tắt nhóm kia; LC-4: Quản trị không chọn được vai Giám đốc/Điều hành; LC-1: tài khoản bên ngoài không cộng tay quyền khác),
// tạo tài khoản theo vai, đổi vai và thấy "Sẽ mất", Thực tập sinh mở "/" được đưa sang Đơn hàng. Dùng lại môi trường A2 (D1 tạm + wrangler dev + Chrome
// headless qua CDP). Các trang dùng CHUNG kho cookie — trang của Thực tập sinh mở SAU CÙNG.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, clickText, ok, setInput, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-24-mo-hinh-vai";
const AXE = readFileSync(process.env.AXE_JS, "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });
const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const NAME = "Kế Toán Chrome";
const INTERN_PHONE = "0912345679";

const box = (scope, kind, code) => `document.querySelector(${JSON.stringify(`${scope} input[type=checkbox][data-kind=${kind}][value=${code}]`)})`;
const preview = (scope) => `document.querySelector(${JSON.stringify(`${scope} [data-role-preview]`)}).textContent`;

const env = await startEnv();
try {
  const axe = async (p, label) => {
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    const v = await p.ev(`axe.run(document).then((r) => r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => x.id))`);
    assert.deepEqual(v, [], `axe (${label}): ${JSON.stringify(v)}`);
  };

  // ---- A. Form thêm (máy tính): 11 vai, Giám đốc/Điều hành tắt cho Quản trị; chọn Kế toán → nhóm Bên ngoài tắt, xem trước "Kế toán"
  let p = await env.as(ACCOUNTS.admin, "/staff", DESK);
  await p.waitFor(`!!${box("#add-perms", "role", "ACCOUNTANT")}`, "khối chọn vai đã dựng");
  assert.equal(await p.ev(`document.querySelectorAll('#add-perms input[data-kind=role]').length`), 11);
  assert.equal(await p.ev(`${box("#add-perms", "role", "DIRECTOR")}.disabled && ${box("#add-perms", "role", "OPERATIONS_MANAGER")}.disabled`), true, "LC-4: Quản trị không chọn được vai Giám đốc/Điều hành");
  await p.ev(`(${box("#add-perms", "role", "ACCOUNTANT")}).click(), true`);
  assert.equal(await p.ev(`${box("#add-perms", "role", "COLLABORATOR")}.disabled`), true, "LC-3: chọn vai nội bộ thì tắt nhóm bên ngoài");
  assert.match(await p.ev(preview("#add-perms")), /Quyền sẽ có: Kế toán\./);
  await p.ev(setInput("document.querySelector('#add-name')", NAME));
  await p.ev(setInput("document.querySelector('#add-phone')", "0912345678"));
  await p.shot(join(OUT, "anh", "vai-them-may-tinh.png"));
  await p.ev("document.querySelector('#add-form').requestSubmit(), true");
  await p.waitFor(`[...document.querySelectorAll('#list tr')].some((tr) => tr.textContent.includes(${JSON.stringify(NAME)}) && tr.textContent.includes('Kế toán'))`, "dòng mới hiện vai Kế toán");
  ok("thêm tài khoản theo vai: LC-4 + LC-3 ở giao diện, xem trước đúng, danh sách hiện vai");

  // ---- B. Sửa: đổi sang Cộng tác viên → nhóm Nội bộ tắt, xem trước "Sẽ mất: Kế toán", cộng tay quyền nội bộ bị tắt (LC-1)
  await p.ev(`[...document.querySelectorAll('#list tr')].find((tr) => tr.textContent.includes(${JSON.stringify(NAME)})).querySelector('button').click(), true`);
  await p.waitFor(`!!${box("#edit", "role", "ACCOUNTANT")} && ${box("#edit", "role", "ACCOUNTANT")}.checked`, "hộp sửa mở với vai hiện tại");
  await p.ev(`(${box("#edit", "role", "ACCOUNTANT")}).click(), (${box("#edit", "role", "COLLABORATOR")}).click(), true`);
  assert.equal(await p.ev(`${box("#edit", "role", "SALES_STAFF")}.disabled`), true, "LC-3 ở hộp sửa");
  const text = await p.ev(preview("#edit"));
  assert.match(text, /Quyền sẽ có: Đối tác\./);
  assert.match(text, /Sẽ mất: Kế toán\./, "Review Focus 3: báo trước quyền sẽ mất");
  assert.equal(await p.ev(`${box("#edit", "add", "SALES")}.disabled`), true, "LC-1: không cộng tay quyền nội bộ cho vai bên ngoài");
  await p.shot(join(OUT, "anh", "vai-sua-may-tinh.png"));
  assert.equal(await p.ev(clickText("#edit", "Lưu")), true);
  await p.waitFor(`[...document.querySelectorAll('#list tr')].some((tr) => tr.textContent.includes(${JSON.stringify(NAME)}) && tr.textContent.includes('Cộng tác viên'))`, "dòng hiện vai mới");
  assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
  ok("đổi vai: xem trước 'Sẽ mất', LC-1/LC-3 ở giao diện, lưu xong danh sách hiện vai mới");

  // ---- C. Tạo một Thực tập sinh (dùng ở E), đọc PIN hiện một lần
  await p.ev(`(${box("#add-perms", "role", "INTERN")}).click(), true`);
  await p.ev(setInput("document.querySelector('#add-name')", "Thực Tập Chrome"));
  await p.ev(setInput("document.querySelector('#add-phone')", INTERN_PHONE));
  await p.ev("document.querySelector('#add-form').requestSubmit(), true");
  await p.waitFor(`!document.querySelector('#secret').hidden && !!document.querySelector('#secret td.pin')`, "hiện PIN tài khoản mới");
  const internPin = await p.ev(`document.querySelector('#secret td.pin').textContent.trim()`);
  p.close();

  // ---- D. Điện thoại (quản trị): thẻ hiện vai, axe sạch
  p = await env.as(ACCOUNTS.admin, "/staff", MOB);
  await p.waitFor(`[...document.querySelectorAll('.card-list .card')].some((c) => c.textContent.includes('Cộng tác viên'))`, "thẻ hiện vai");
  await p.shot(join(OUT, "anh", "vai-dien-thoai.png"));
  await axe(p, "Nhân viên điện thoại");
  assert.deepEqual(p.consoleErrors, [], `lỗi console (điện thoại): ${p.consoleErrors}`);
  p.close();
  ok("điện thoại: thẻ hiện vai, axe không vi phạm critical/serious");

  // ---- E. Thực tập sinh mở "/" → được đưa sang Đơn hàng (mở SAU CÙNG: kho cookie dùng chung)
  p = await env.as({ phone: INTERN_PHONE, pin: internPin }, "/", MOB);
  await p.waitFor(`location.pathname === '/orders'`, "Thực tập sinh mở '/' được đưa sang Đơn hàng");
  await p.waitFor(`document.readyState === 'complete'`, "trang Đơn hàng tải xong");
  await p.shot(join(OUT, "anh", "vai-thuc-tap-don-hang.png"));
  assert.deepEqual(p.consoleErrors, [], `lỗi console (Thực tập sinh): ${p.consoleErrors}`);
  p.close();
  ok("Thực tập sinh: vào thẳng Đơn hàng, không lỗi console");
} finally {
  await env.stop();
}
console.log("VAI SMOKE OK");
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `npm run build:web && AXE_JS=<đường dẫn axe.min.js ngoài repo> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs`
Expected: FAIL — "hết giờ chờ: khối chọn vai đã dựng" (chưa có ô vai). (Cách lấy `axe.min.js`: `tests/e2e/README.md`.)

- [ ] **Step 3: Viết `web/role-picker.ts`**

```ts
// Khối "Vai và quyền" của trang Nhân viên (ADR-0018): chọn vai theo hai nhóm, xem trước quyền sẽ có (và sẽ thêm/mất so với hiện tại), chỉnh riêng có lý do.
// Mọi luật (nhóm vai, bộ quyền mặc định, LC-1/LC-3/LC-4) đến từ src/shared/roles.ts — giao diện chỉ tắt ô và xem trước; máy chủ luôn kiểm lại.
// Ô vai mang data-kind="role", ô chỉnh tay data-kind="add"/"remove": mã INTERN vừa là mã vai vừa là mã quyền, chọn phần tử phải kèm data-kind.
import { PERMISSION_CODES, PERMISSION_LABEL, type PermissionCode } from "../src/shared/permissions";
import {
  EXTERNAL_ALLOWED, ROLES, ROLE_CODES, ROLE_GROUP_LABEL, SUPER_ADMIN_GRANTED, effectivePermissions, groupOf, permissionsLabel, type RoleCode, type RoleGroup,
} from "../src/shared/roles";
import { h } from "./dom";

export interface RolePickerValue { roles: RoleCode[]; adds: PermissionCode[]; removes: PermissionCode[]; reason: string }
export interface RolePicker { readonly el: HTMLElement; value(): RolePickerValue; reset(v: RolePickerValue): void }

const CHECK_STYLE = "width:auto;display:inline;margin:0 6px 0 0"; // như ô tick sẵn có của web/staff.ts

export function rolePicker(opts: { initial: RolePickerValue; actorIsSuperAdmin: boolean; current: readonly PermissionCode[] | null }): RolePicker {
  const roleBoxes = new Map<RoleCode, HTMLInputElement>();
  const addBoxes = new Map<PermissionCode, HTMLInputElement>();
  const removeBoxes = new Map<PermissionCode, HTMLInputElement>();
  const reason = h("input", { type: "text", maxLength: 200, placeholder: "Vì sao chỉnh riêng cho người này" });
  const preview = h("p", { class: "muted", "aria-live": "polite", "data-role-preview": "" });
  const roleLocked = (c: RoleCode) => ROLES[c].superAdminOnly && !opts.actorIsSuperAdmin; // LC-4
  const permLocked = (p: PermissionCode) => SUPER_ADMIN_GRANTED.includes(p) && !opts.actorIsSuperAdmin; // LC-4

  const value = (): RolePickerValue => ({
    roles: ROLE_CODES.filter((c) => roleBoxes.get(c)!.checked),
    adds: PERMISSION_CODES.filter((p) => addBoxes.get(p)!.checked),
    removes: PERMISSION_CODES.filter((p) => removeBoxes.get(p)!.checked),
    reason: reason.value.trim(),
  });

  const refresh = (): void => {
    const v = value();
    const group = groupOf(v.roles);
    for (const c of ROLE_CODES) roleBoxes.get(c)!.disabled = roleLocked(c) || ((group === "INTERNAL" || group === "EXTERNAL") && ROLES[c].group !== group); // LC-3
    for (const p of PERMISSION_CODES) {
      addBoxes.get(p)!.disabled = permLocked(p) || (group === "EXTERNAL" && !EXTERNAL_ALLOWED.includes(p)); // LC-1
      removeBoxes.get(p)!.disabled = permLocked(p);
    }
    const eff = effectivePermissions(v.roles, v).permissions;
    const parts = [`Quyền sẽ có: ${permissionsLabel(eff)}.`];
    if (opts.current) {
      const gain = eff.filter((p) => !opts.current!.includes(p));
      const lose = opts.current.filter((p) => !eff.includes(p));
      if (gain.length) parts.push(`Sẽ thêm: ${permissionsLabel(gain)}.`);
      if (lose.length) parts.push(`Sẽ mất: ${permissionsLabel(lose)}.`);
    }
    preview.textContent = parts.join(" ");
  };

  const roleGroup = (group: RoleGroup): HTMLElement =>
    h("div", null, h("strong", null, ROLE_GROUP_LABEL[group]),
      ...ROLE_CODES.filter((c) => ROLES[c].group === group).map((c) => {
        const b = h("input", { type: "checkbox", style: CHECK_STYLE, value: c, "data-kind": "role" });
        b.addEventListener("change", refresh);
        roleBoxes.set(c, b);
        return h("label", { class: "check" }, b, ROLES[c].name, roleLocked(c) && h("span", { class: "muted" }, " — chỉ Toàn quyền gán"));
      }));
  const permBox = (map: Map<PermissionCode, HTMLInputElement>, p: PermissionCode, kind: "add" | "remove"): HTMLElement => {
    const b = h("input", { type: "checkbox", style: CHECK_STYLE, value: p, "data-kind": kind });
    b.addEventListener("change", refresh);
    map.set(p, b);
    return h("label", { class: "check" }, b, PERMISSION_LABEL[p]);
  };

  const el = h("div", null,
    h("div", { class: "grid two" }, roleGroup("INTERNAL"), roleGroup("EXTERNAL")),
    preview,
    h("details", null, h("summary", null, "Chỉnh riêng cho người này (cộng hoặc bớt quyền)"),
      h("div", { class: "grid two" },
        h("div", null, h("strong", null, "Cộng thêm"), ...PERMISSION_CODES.map((p) => permBox(addBoxes, p, "add"))),
        h("div", null, h("strong", null, "Bớt đi"), ...PERMISSION_CODES.map((p) => permBox(removeBoxes, p, "remove")))),
      h("label", null, "Lý do chỉnh riêng (bắt buộc khi có cộng/bớt)", reason)));

  const reset = (v: RolePickerValue): void => {
    for (const c of ROLE_CODES) roleBoxes.get(c)!.checked = v.roles.includes(c);
    for (const p of PERMISSION_CODES) {
      addBoxes.get(p)!.checked = v.adds.includes(p);
      removeBoxes.get(p)!.checked = v.removes.includes(p);
    }
    reason.value = v.reason;
    refresh();
  };
  reset(opts.initial);
  return { el, value, reset };
}
```

- [ ] **Step 4: Sửa `public/staff.html`**

Dòng 16–19 (khối quyền trong `#add-form`) thay bằng — cho khối vai trải hết bề ngang lưới (`.span-2` = `grid-column: 1 / -1`):

```html
      <div class="span-2">
        <strong>Vai và quyền</strong>
        <div id="add-perms"></div>
      </div>
```

Dòng 26: `<th>Quyền</th>` → `<th>Vai / quyền</th>`.

- [ ] **Step 5: Sửa `web/staff.ts`**

(a) Import (dòng 1–5):

```ts
import { ApiError, api, type SheetCandidate, type StaffAccount, type Api } from "./api";
import { PERMISSION_CODES, PERMISSION_LABEL, can, hasPermission, type PermissionCode } from "../src/shared/permissions";
import { rolesLabel } from "../src/shared/roles";
import { byId, h, replaceChildren } from "./dom";
import { dateTime } from "./format";
import { rolePicker, type RolePicker, type RolePickerValue } from "./role-picker";
import { initShell, showError } from "./shell";
```

(b) Sau dòng 14 (`sameSet`) thêm:

```ts
/** Tài khoản đã gán vai → tên vai; chưa gán → quyền cũ kèm ghi chú (chờ chuyển sang cách mới, đặc tả §14). */
const accessLabel = (s: StaffAccount): string => (s.roles.length ? rolesLabel(s.roles) : `${permissionsLabel(s.permissions)} (chưa gán vai)`);
const EMPTY: RolePickerValue = { roles: [], adds: [], removes: [], reason: "" };
const sameAssignment = (a: RolePickerValue, b: RolePickerValue): boolean => sameSet(a.roles, b.roles) && sameSet(a.adds, b.adds) && sameSet(a.removes, b.removes);
let meSuper = false;
```

Thay `permissionsLabel(s.permissions)` ở `row()` (dòng 68) và `card()` (dòng 119) bằng `accessLabel(s)`. Đổi hai chỗ gọi `openEdit(s)` (dòng 74, 124) thành `() => void openEdit(s)`.

(c) Thay toàn bộ `openEdit` (dòng 156–195):

```ts
async function openEdit(s: StaffAccount): Promise<void> {
  const legacy = s.roles.length === 0; // chưa gán vai: còn sửa được quyền cũ
  let saved = EMPTY;
  if (!legacy) {
    const r = await act(() => api<Api.StaffRolesResponse>(`/api/staff/${s.id}/roles`));
    if (!r) return; // lỗi đã hiện ở errorEl
    saved = { roles: r.roles, adds: r.adds, removes: r.removes, reason: r.reason ?? "" };
  }
  const name = h("input", { type: "text", value: s.fullName, maxLength: 200 });
  const phone = h("input", { type: "tel", value: s.phone });
  const isMe = s.id === me.id;
  const picker = rolePicker({ initial: saved, actorIsSuperAdmin: meSuper, current: s.permissions });
  const boxes = new Map<PermissionCode, HTMLInputElement>();
  const permissionBoxes = PERMISSION_CODES.map((code) => {
    const box = h("input", { type: "checkbox", checked: s.permissions.includes(code), disabled: isMe, style: "width:auto;display:inline;margin:0 6px 0 0" });
    boxes.set(code, box);
    return h("label", { class: "check" }, box, PERMISSION_LABEL[code]);
  });
  const save = h("button", { type: "button", class: "btn btn-primary" }, "Lưu");
  const cancel = h("button", { type: "button", class: "btn" }, "Đóng");
  cancel.addEventListener("click", () => (editEl.hidden = true));
  save.addEventListener("click", async () => {
    const chosen = picker.value();
    const legacyPerms = PERMISSION_CODES.filter((code) => boxes.get(code)!.checked);
    if (!legacy && chosen.roles.length === 0) return showError(errorEl, "Chọn ít nhất một vai.");
    if (legacy && chosen.roles.length === 0 && !isMe && legacyPerms.length === 0) return showError(errorEl, "Chọn ít nhất một vai (hoặc một quyền cũ).");
    if (!(await act(() => api(`/api/staff/${s.id}`, { method: "PATCH", body: { fullName: name.value, phone: phone.value } })))) return;
    try {
      if (chosen.roles.length > 0 && !sameAssignment(chosen, saved)) {
        const body: Api.StaffRolesRequest = { roles: chosen.roles, adds: chosen.adds, removes: chosen.removes, reason: chosen.reason };
        await api(`/api/staff/${s.id}/roles`, { method: "PUT", body });
      } else if (legacy && chosen.roles.length === 0 && !isMe && !sameSet(legacyPerms, s.permissions)) {
        const body: Api.StaffPermissionsRequest = { permissions: legacyPerms };
        await api(`/api/staff/${s.id}/permissions`, { method: "PUT", body });
      }
    } catch (err) {
      // Tên/số điện thoại đã lưu ở lời gọi trên. load() xoá thông báo lỗi (act mở đầu bằng showError(null)), nên nạp lại TRƯỚC rồi mới hiện lý do.
      await load();
      return showError(errorEl, `Đã lưu tên/số điện thoại nhưng chưa đổi được vai/quyền: ${reasonOf(err)}`);
    }
    editEl.hidden = true;
    await load();
  });
  replaceChildren(
    editEl,
    h("h2", null, `Sửa: ${s.fullName}`),
    h("div", { class: "grid two" }, h("label", null, "Họ tên", name), h("label", null, "Số điện thoại đăng nhập", phone)),
    h("h3", null, "Vai và quyền"),
    legacy && h("p", { class: "alert warn" }, `Tài khoản này chưa gán vai, đang dùng quyền cũ: ${permissionsLabel(s.permissions)}. Chọn vai để chuyển sang cách mới — xem dòng "Sẽ mất" trước khi lưu.`),
    isMe && h("p", { class: "muted" }, "Bạn chỉ đổi được vai của chính mình khi quyền không đổi (xem dòng xem trước)."),
    picker.el,
    legacy && h("details", null, h("summary", null, "Quyền cũ (chỉ dùng khi chưa gán vai)"), ...permissionBoxes),
    h("p", { class: "muted" }, "Đổi số điện thoại sẽ đổi tên đăng nhập của người này. Phiên đang đăng nhập vẫn giữ nguyên."),
    h("div", { class: "actions" }, save, cancel),
  );
  editEl.hidden = false;
  editEl.scrollIntoView({ block: "nearest" });
}
```

(d) Thay khối "Thêm thủ công" (dòng 205–231, gồm chú thích, `addPermBoxes` và trình xử lý `submit`):

```ts
// ---- Thêm thủ công (ADR-0018): chọn vai + xem trước; tuỳ chọn dùng hồ sơ cá nhân có sẵn (tra theo SĐT) để không tạo hồ sơ trùng.
// Khối vai dựng SAU khi biết người dùng có phải Toàn quyền không (setupAddForm) — ô Giám đốc/Điều hành chỉ mở cho Toàn quyền.
let addPicker: RolePicker | null = null;
let existingPartyId: string | null = null;
const addName = byId<HTMLInputElement>("add-name");
const addPhone = byId<HTMLInputElement>("add-phone");
const existingNote = h("div", { class: "muted", hidden: true });

function setupAddForm(): void {
  addPicker = rolePicker({ initial: EMPTY, actorIsSuperAdmin: meSuper, current: null });
  replaceChildren(byId("add-perms"), addPicker.el, existingNote);
}

function clearExisting(): void {
  if (existingPartyId) addName.value = "";
  existingPartyId = null;
  addName.readOnly = false;
  existingNote.hidden = true;
}

addPhone.addEventListener("change", async () => {
  clearExisting();
  const raw = addPhone.value.trim();
  if (!raw) return;
  let found: Api.PartyLookupResponse | null = null;
  try {
    found = await api<Api.PartyLookupResponse>(`/api/parties/lookup?phone=${encodeURIComponent(raw)}`);
  } catch {
    return; // SĐT chưa đúng dạng hay mất mạng: không gợi ý gì, không báo lỗi giữa lúc gõ
  }
  const person = found.matches.find((m) => m.kind === "PERSON" && m.active);
  if (!person) return;
  const use = h("button", { type: "button", class: "btn btn-link" }, `Dùng hồ sơ có sẵn: ${person.displayName}`);
  use.addEventListener("click", () => {
    existingPartyId = person.id;
    addName.value = person.displayName;
    addName.readOnly = true;
    replaceChildren(existingNote, `Sẽ tạo tài khoản cho hồ sơ có sẵn "${person.displayName}" (không tạo hồ sơ mới). Đổi số điện thoại để bỏ chọn.`);
  });
  replaceChildren(existingNote, use);
  existingNote.hidden = false;
});

byId<HTMLFormElement>("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!addPicker) return;
  const v = addPicker.value();
  if (v.roles.length === 0) return showError(errorEl, "Chọn ít nhất một vai.");
  const who = existingPartyId ? { partyId: existingPartyId } : { fullName: addName.value };
  const body = { phone: addPhone.value, roles: v.roles, adds: v.adds, removes: v.removes, reason: v.reason, ...who };
  const r = await act(() => api<Api.StaffWithPinResponse>("/api/staff", { method: "POST", body }));
  if (r) {
    showSecrets("Tài khoản mới", [{ name: r.staff.fullName, phone: r.staff.phone, pin: r.pin }]);
    clearExisting();
    addName.value = addPhone.value = "";
    addPicker.reset(EMPTY);
    await load();
  }
});
```

(e) Chữ xem trước của Sheet (dòng 266): `"Sheet chỉ là nguồn đề xuất. Mọi tài khoản mới mang vai Nhân viên kinh doanh (đổi vai ở nút Sửa). Sheet không tự ngưng hay xoá ai."`

(f) Thay ba dòng cuối tệp (dòng 283–286):

```ts
const staff = await initShell();
me = staff;
meSuper = hasPermission(staff, "SUPER_ADMIN");
// Cổng trang theo ô admin.manage (Quản trị HOẶC Toàn quyền — cùng đối tượng với access "admin" của API), không riêng quyền ADMIN.
if (!can(staff, "admin.manage")) showError(errorEl, "Chỉ quản trị viên được vào trang này.");
else {
  setupAddForm();
  await load();
}
```

- [ ] **Step 6: Build + typecheck + Chrome xanh**

Run: `npm run build:web && npm run typecheck && AXE_JS=… CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs`
Expected: `VAI SMOKE OK`; 4 ảnh trong `docs/evidence/2026-09-24-mo-hinh-vai/anh/`. **Xem từng ảnh bằng mắt** (bài học Trang chủ: lỗi nằm ngay trong ảnh đã commit) — khối vai trải hết bề ngang, hai nhóm cạnh nhau ở máy tính, chồng dọc ở điện thoại.

- [ ] **Step 7: P16 cho giao diện**

Tạm xoá đoạn `|| ((group === "INTERNAL" || group === "EXTERNAL") && ROLES[c].group !== group)` trong `refresh()` → build → chạy kịch bản → ĐỎ ở "LC-3: chọn vai nội bộ thì tắt nhóm bên ngoài"; chép dòng đỏ; hoàn nguyên; build; xanh.

- [ ] **Step 8: Kịch bản Chrome liên quan khác** (web/CLAUDE.md, sau `npm run build:web`, lần lượt, không song song)

`dot-a-smoke.mjs` (`docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/`, trang Nhân viên bảng/thẻ) và `passkey-smoke.mjs` (`docs/evidence/2026-09-23-passkey/kich-ban/`, nút Face ID ở trang Nhân viên).
Expected: cả hai thoát 0, 0 bước ✗. Ảnh đổi do dữ liệu/giờ: xem lại rồi commit cùng task.

- [ ] **Step 9: Commit**

```bash
git add web/role-picker.ts web/staff.ts public/staff.html docs/evidence/2026-09-24-mo-hinh-vai
git status --short docs/evidence
git commit -m "Trang Nhân viên: chọn vai theo nhóm, xem trước quyền, dùng hồ sơ có sẵn" -m "Vì sao: ADR-0018 — quản trị gán vai thay vì tích quyền; màn hình xem trước quyền sẽ có và sẽ mất trước khi lưu (tránh chuyển tài khoản cũ làm mất quyền mà không hay); tắt ô theo luật cứng LC-1/LC-3/LC-4 (máy chủ vẫn kiểm lại). Tài khoản chưa gán vai vẫn sửa quyền cũ được; lưu không đổi vai thì không gửi lại. Kịch bản Chrome vai-smoke.mjs ghim hành vi, kể cả Thực tập sinh vào thẳng Đơn hàng." -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

(Nếu `git status` cho thấy ảnh của `dot-a-smoke`/`passkey-smoke` đổi và đã xem đạt, `git add` thêm đúng các tệp đó trước lệnh commit.)

---

### Task 9: Tài liệu, nhật ký thay đổi, runbook, nhật ký thi công

**Files:**
- Modify: `docs/SYSTEM-DESIGN.md` (§5 dữ liệu, §8 quyền), `docs/CHANGE-GUIDE.md` (bảng §1, công thức u mới, ma trận §3), `docs/HANDOFF-N1.md` (runbook migration 0024), `src/shared/changelog.ts`, `src/shared/app-info.test.ts`
- Create: `docs/superpowers/plans/2026-09-24-mo-hinh-vai-thi-cong-nhat-ky.md`

- [ ] **Step 1: `docs/SYSTEM-DESIGN.md`**

Đọc tiêu đề trước (`grep -n "^## \|^### " docs/SYSTEM-DESIGN.md`), chỉ đọc đúng §5 và §8. §5: thêm `pty_role_type.role_group`, bảng `stf_permission_adjustment`, view `v_pty_open_role_group`, trigger LC-1/LC-3. §8: thêm đoạn "Vai → quyền (ADR-0018)": 11 vai (trỏ `src/shared/roles.ts`), quyền hiệu lực = mặc định + cộng − bớt, lọc LC-1; `stf_permission` là bản hiện thực hoá, nơi duy nhất tính là `roleChangeStatements` của module staff; mã `INTERN` tạm hẹp; LC-4 áp mọi đường cấp quyền; route cũ khoá với tài khoản đã gán vai; route mới `GET/PUT /api/staff/:id/roles`. Tài liệu mô tả thua mã — viết đúng như mã vừa làm.

- [ ] **Step 2: `docs/CHANGE-GUIDE.md`**

Thêm hàng vào bảng §1: `| Đổi bảng vai → quyền, thêm vai | src/shared/roles.ts, migrations (pty_role_type) | u |`. Thêm công thức **u. Vai & quyền (ADR-0018)** sau công thức t: (1) sửa `ROLES` trong `src/shared/roles.ts`; (2) vai mới → migration thêm dòng `pty_role_type` cùng tên/nhóm (`src/roles-schema.test.ts` đỏ nếu lệch); (3) đổi bộ mặc định = đổi quyền mọi tài khoản mang vai → cần chủ duyệt, và phải có bước tính lại quyền có kiểm soát (chưa có — lập kế hoạch riêng); (4) bẫy: ngoài `parties` không nhắc tên bảng vai (kể cả chú thích); đóng vai trước khi mở; gán lại trong ngày = mở lại dòng; mã `INTERN` vừa là mã vai vừa là mã quyền. Thêm dòng vào ma trận §3: `roles.ts` / vai của `staff` / route vai của `accounts` → `node --test src/shared/roles.test.ts src/roles-schema.test.ts src/modules/staff/account-roles.test.ts` → `npm test` → `npm run test:e2e -- admin admin-race parties permissions roles` → Chrome `vai-smoke.mjs` + `dot-a-smoke.mjs`.

- [ ] **Step 3: Nhật ký thay đổi (công thức t)**

Thêm MỘT mục vào ĐẦU `CHANGELOG` ở `src/shared/changelog.ts`: số = số của mục đầu hiện tại + 1 (hôm nay mục đầu là 1.4, bản 1.5 có thể đã lên trước — đọc tệp rồi mới đặt số), ngày = ngày dự kiến triển khai:

```ts
  {
    version: "<số mục đầu + 1>",
    date: "<ngày triển khai, YYYY-MM-DD>",
    items: [
      { kind: "moi", text: "Quản trị viên gán vai cho từng tài khoản (Giám đốc, Kế toán, Hướng dẫn viên nội bộ, Cộng tác viên…); quyền tự theo vai, xem trước trước khi lưu." },
      { kind: "moi", text: "Thêm vai Thực tập sinh: lập đơn và chỉ thấy đơn của mình." },
      { kind: "moi", text: "Tạo tài khoản cho người đã có hồ sơ (ví dụ khách cũ) mà không tạo hồ sơ trùng." },
      { kind: "doi", text: "Quyền \"Super Admin\" đổi tên thành \"Toàn quyền\". Chỉ Toàn quyền mới cấp được quyền Quản trị." },
    ],
  },
```

Sửa chuỗi kỳ vọng `formatReleaseLine` trong `src/shared/app-info.test.ts:21` cho khớp số và ngày mới. Chạy `node --test src/shared/changelog.test.ts src/shared/app-info.test.ts`.

- [ ] **Step 4: Runbook** — `docs/HANDOFF-N1.md`

Thêm mục phát hành: migration 0024 **chỉ thêm** (không đổi quyền của ai); sau áp: `wrangler d1 migrations list … --remote` sạch; `audit-invariants --db remote` đạt (R-LC-1/R-LC-3 = 0; kiểm "thông tin" có thể cảnh báo — không đỏ khi không `--strict`); **không** gán vai hàng loạt — chờ bảng đối chiếu (đặc tả §14, giai đoạn 2). Báo trước nhân viên: nhãn "Super Admin" → "Toàn quyền"; Quản trị không còn cấp được quyền Quản trị; trang Hồ sơ không còn cho thêm vai "Hướng dẫn viên"/"Bán hàng"/"Đại lý"/"Nhân sự" kiểu cũ.

- [ ] **Step 5: Nhật ký thi công** — `docs/superpowers/plans/2026-09-24-mo-hinh-vai-thi-cong-nhat-ky.md`

Ghi: số test nền (Task 0); từng task — commit, số test, **dòng đỏ P16 nguyên văn**; kết quả kiểm độc lập từng task; nợ còn lại — chép nguyên mục "Quyết định tạm của giai đoạn 1 và rủi ro còn lại" của kế hoạch này, cộng: đề xuất thêm dòng vào bảng kịch bản Chrome của `web/CLAUDE.md` cho `web/role-picker.ts`/`web/staff.ts` → `vai-smoke.mjs` (tệp luật — chủ duyệt, N9; chỉ đề xuất, không tự sửa).

- [ ] **Step 6: Kiểm + commit**

Run: `npm test && npm run typecheck && node scripts/kiem-phien-ban.mjs`
Expected: PASS; cổng số phiên bản ĐẠT (máy mới hơn production).

```bash
git add docs/SYSTEM-DESIGN.md docs/CHANGE-GUIDE.md docs/HANDOFF-N1.md src/shared/changelog.ts src/shared/app-info.test.ts docs/superpowers/plans/2026-09-24-mo-hinh-vai-thi-cong-nhat-ky.md
git commit -m "Tài liệu giai đoạn 1 mô hình vai: thiết kế hệ thống, công thức sửa, runbook 0024, nhật ký phiên bản" -m "Vì sao: tài liệu mô tả phải khớp mã trong cùng lần phát hành (CLAUDE.md §2); mỗi lần deploy mã mới có mục nhật ký thay đổi (công thức t); runbook ghi rõ 0024 không đổi quyền của ai và không gán vai hàng loạt." -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Cổng cuối — kiểm toàn nhánh, người kiểm độc lập, bàn giao

- [ ] **Step 1: Gộp `origin/main` mới nhất (nếu đã nhích) và chạy lại toàn bộ**

```bash
git fetch origin
```
```bash
git merge origin/main --no-edit
```
Run: `npm test && npm run typecheck && npm run test:e2e && node scripts/kiem-phien-ban.mjs`
Expected: toàn bộ PASS; e2e đủ bộ (gồm `roles`) + `audit-invariants --strict` đạt. Nếu main đã đổi số mục nhật ký hay số route, sửa lại số ở `changelog.ts`/`app-info.test.ts`/`route-access.test.ts` rồi chạy lại.

- [ ] **Step 2: Kịch bản Chrome đủ bộ liên quan** (lần lượt, sau `npm run build:web`)

`vai-smoke.mjs`, `dot-a-smoke.mjs`, `passkey-smoke.mjs`, `trang-chu-smoke.mjs` (cổng trang đầu dùng `canAccessOrders`), `help-smoke.mjs` (`docs/evidence/2026-09-23-nhat-ky-thay-doi/kich-ban/` — nhật ký thay đổi đổi), `v1-dang-nhap.mjs` và `v1-bao-tri.mjs` (`docs/evidence/2026-09-21-v1-0/kich-ban/` — chạm `permissions.ts` dùng chung).
Expected: tất cả thoát 0, 0 bước ✗; xem ảnh đổi bằng mắt.

- [ ] **Step 3: Kiểm Review Focus**

Đối chiếu năm dòng Review Focus: mỗi dòng có test xanh ở đúng task (ghi tên test vào nhật ký thi công).

- [ ] **Step 4: Người kiểm độc lập, chỉ-đọc, toàn nhánh** (agent `nguoi-kiem-doc-lap`)

Giao: đọc đặc tả + ADR-0018 + kế hoạch này; `git diff origin/main...gd1-mo-hinh-vai`; tự chạy lại `npm test`, `npm run typecheck`, `npm run test:e2e -- admin admin-race parties permissions roles`, `vai-smoke.mjs`; tự làm lại ít nhất hai P16 (trigger LC-1; LC-4 route cũ); xác nhận: không ô nào của sáu mã cũ đổi, không tài khoản nào bị tính lại quyền ngoài đường gán vai, R-N1-12 giữ, nhật ký không chứa SĐT, thứ tự kiểm ở `PUT …/permissions` giữ 409 cho tự đổi quyền. Chỉ báo "đạt" dựa trên báo cáo này + test.

- [ ] **Step 5: Bàn giao cho chủ dự án**

Báo cáo 4 mục (Đã làm — Đã kiểm — Chưa làm/chưa kiểm — Cần bạn quyết). Kiểm lại ngay trước khi đưa lệnh: `git merge-base --is-ancestor origin/main gd1-mo-hinh-vai` (nhánh còn chứa main mới nhất). Lệnh cho chủ tự chạy ở thư mục gốc dự án (AI không chạy):

```bash
npm run day-len -- gd1-mo-hinh-vai
```
```bash
npm run trien-khai
```
Sau khi chủ báo đã triển khai: kiểm production chỉ-đọc (GET công khai, `wrangler deployments list`, `wrangler d1 migrations list … --remote`, `audit-invariants --db remote`). Bước tiếp theo: giai đoạn 2 (bảng đối chiếu 30 tài khoản — chủ tự chạy truy vấn chỉ-đọc, duyệt từng người; ma trận quyền mới; người nhận mặc định).
