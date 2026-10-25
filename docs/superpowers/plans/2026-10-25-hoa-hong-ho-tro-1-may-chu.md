# Hoa hồng + Hỗ trợ — PR 1: máy chủ — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm phần máy chủ cho hai trang thiết kế lại: Kế toán tìm đối tác theo tên, tra mức theo loại, «Đổi» một bước, liệt kê chính sách riêng; hỗ trợ có sự kiện, hàng đợi đếm/lọc, tạo nhóm không cần mã, `mailPending` ở chi tiết.

**Architecture:** Chỉ sửa `src/modules/pricing`, `src/modules/feedback` và hàm thuần ở `src/shared/`. Không migration. Mọi thay đổi là *thêm* nên giao diện cũ vẫn chạy với máy chủ mới; phát hành riêng trước hai PR giao diện, hoàn tác bằng `wrangler rollback`.

**Tech Stack:** TypeScript, Cloudflare Worker + D1 (SQLite), `node --test`, khung thử `tests/audit/harness.mjs` (`world()`, `seedStaff()`, `w.call(method, path, { as, body })`, `w.q(sql, …)`).

**Spec:** `docs/superpowers/specs/2026-10-25-hoa-hong-ho-tro-thiet-ke-lai/DAC-TA-MAY-CHU.md` (đọc cùng `DE-XUAT-ADR-cong-tim-nguoi-huong.md`, `TRANG-GHEP.md`, `BAN-GIAO.md`).

## Global Constraints

- **Cổng chủ duyệt:** Task 1 (quyền) chỉ thi công khi chủ đã nói «duyệt» đề xuất ADR và ADR đã được cấp số, chuyển vào `docs/adr/` (do chủ duyệt; AI không tự đổi trạng thái). Task 2–8 không chạm quyền, làm trước được nếu chủ đã duyệt hai đặc tả.
- Không migration; không sửa tệp `migrations/` nào.
- Tiếng Việt CÓ DẤU ở mọi câu báo, commit; gọi hệ thống là «Nền tảng».
- Ngày dân sự theo giờ Việt Nam: `vnToday(new Date())`; cộng trừ ngày bằng `addDays(iso, n)` (`src/shared/vn-date.ts`).
- Mỗi lệnh ghi là **một** `db.batch` qua `chayLo` (pricing); không thêm vào `GHI_NHIEU_LAN`. Vé chống ghi trùng tự gắn ở router.
- Nhật ký không ghi SĐT/email/MST; dùng lại hành động có sẵn trong `src/shared/audit-actions.ts`, không thêm mã hành động.
- `feedback` là module «nghiêm»: SQL mới qua `defineSql`, câu tĩnh (`src/shared/sql-registry.ts`); đọc tên hồ sơ xuyên module chỉ qua view `v_*`.
- Mỗi hàng rào mới: sửa cố ý → đỏ → hoàn nguyên, rồi ghi dòng `docs/SO-HANG-RAO.md` kèm ngày (P16).
- Không chữ «Mức TA», «dòng riêng» trong câu báo **mới** (chữ cũ đổi ở PR 2 cùng bảng từ).
- Lệnh kiểm cuối: `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e` (cần mạng).

## Review Focus

1. Hai người bấm «Đổi» cùng một dòng gần như cùng lúc → đúng một dòng mới, người sau nhận 409 (Task 4).
2. Dòng cũ bị đóng bằng đường khác (SQL tay, lệnh Ngừng) ngay trước khi Đổi → không sinh dòng mới (Task 4, bài «Hàng rào câu chèn có điều kiện»).
3. Kế toán mở trang đơn sau khi nới cổng → ô «Đặt qua đối tác» vẫn ẩn (Task 1, bài `o-dat-qua-noi-cong`).
4. Người gửi là tài khoản bên ngoài, yêu cầu đã chuyển nhóm và giao lại → `suKien` rỗng, không lộ tên nhóm/nhân viên cũ (Task 6).
5. Hàng đợi > 50 yêu cầu → `dem` khớp số dòng thật khi tải hết từng `loc` (Task 7).

---

### Task 1: Nới cổng tìm người hưởng (quyền — chờ ADR duyệt)

**Files:**
- Modify: `src/shared/hoa-hong-hien-thi.ts` (`coTheTimDoiTac`, chú thích :19-24)
- Modify: `src/modules/pricing/index.ts` (route `GET /api/pricing/nguoi-huong`, dòng gác ~:468)
- Test: `src/shared/hoa-hong-hien-thi.test.ts`, `src/modules/pricing/co-the-tim-doi-tac.test.ts` (có sẵn, không sửa), `src/modules/pricing/o-dat-qua-noi-cong.test.ts`, `src/so-dai-ly-quyen-route.test.ts`

**Interfaces:**
- Produces: `coTheTimDoiTac(s: PermissionHolder): boolean` = `(can(s,"order.create") || can(s,"partner.commission.write")) && !holdsPartner(s)` — route gọi chính hàm này. `coODatQuaDoiTac` KHÔNG đổi.

- [ ] **Step 1: Bài thuần đỏ.** Trong `hoa-hong-hien-thi.test.ts` thêm `test("coTheTimDoiTac: Kế toán tìm được, Đối tác và lai thì không")`: `assert.equal(coTheTimDoiTac({permissions:["ACCOUNTING"]}), true)`; `["SALES"]`, `["INTERN"]`, `["ADMIN"]`, `["SUPER_ADMIN"]` → true; `["PARTNER"]`, `["ACCOUNTING","PARTNER"]`, `["FIELD"]`, `["HR"]`, `["DRIVER"]`, `["DRIVER_PARTNER"]` → false. Thêm `test("coODatQuaDoiTac: Kế toán vẫn không có ô")` trong `src/shared/phan-doi-tac-hien-thi.test.ts`: `["ACCOUNTING"]` → false.
- [ ] **Step 2:** `node --test src/shared/hoa-hong-hien-thi.test.ts` → FAIL ở ca ACCOUNTING.
- [ ] **Step 3:** Sửa thân `coTheTimDoiTac` như Interfaces; sửa chú thích (bỏ «Kế toán không có `order.create` nên không tìm được»).
- [ ] **Step 4:** `node --test src/modules/pricing/co-the-tim-doi-tac.test.ts` → FAIL (giao diện đã mở, route chưa) — đây là quan sát hàng rào đồng bộ chặn thật; ghi ngày vào ghi chú Task.
- [ ] **Step 5:** Route `nguoi-huong`: thay `!can(staff, "order.create") || holdsPartner(staff)` bằng `!coTheTimDoiTac(staff)` (import từ `../../shared/hoa-hong-hien-thi.ts`). Giữ `access "orders"`.
- [ ] **Step 6:** Sửa `o-dat-qua-noi-cong.test.ts` bài 1, vế «Đặt qua đối tác»: kỳ vọng `coODatQuaDoiTac(s) === (route200 && can(s,"order.create"))` (không nới thành «⇒»), thêm tập `{ ten: "Kế toán", perms: ["ACCOUNTING"] }` nếu chưa có và ca có tên `"Kế toán: route nguoi-huong 200, ô Đặt qua đối tác ẩn"` khẳng định cả hai vế.
- [ ] **Step 7:** `src/so-dai-ly-quyen-route.test.ts`: thêm ca Kế toán `GET /api/pricing/nguoi-huong?q=a` → 200; Đối tác, lai Kế toán+Đối tác, HDV, Tài xế, Nhân sự → 403.
- [ ] **Step 8:** `node --test src/shared/hoa-hong-hien-thi.test.ts src/shared/phan-doi-tac-hien-thi.test.ts src/modules/pricing/co-the-tim-doi-tac.test.ts src/modules/pricing/o-dat-qua-noi-cong.test.ts src/so-dai-ly-quyen-route.test.ts` → PASS.
- [ ] **Step 9: Quan sát chặn thật (P16).** Tạm bỏ vế `partner.commission.write` trong `coTheTimDoiTac` → Step 8 đỏ ở ca Kế toán → hoàn nguyên → xanh. Sửa hai dòng `docs/SO-HANG-RAO.md` (ô tìm đối tác ⇔ cổng route; ô «Đặt qua đối tác» ⇔ cổng route) ghi nghĩa mới + ngày quan sát.
- [ ] **Step 10:** Sửa `docs/SYSTEM-DESIGN.md` §7 dòng route `nguoi-huong` (cổng mới) và §9 dòng «Hoa hồng đối tác» (bỏ câu «route đó hỏi `order.create`, Kế toán chưa có… Ruling 26»), dòng «Ô «Đặt qua đối tác»» (ô vẫn theo `order.create`).
- [ ] **Step 11: Commit** `Hoa hồng: Kế toán tìm được đối tác theo tên (nới cổng nguoi-huong, ADR-<số>)`.

### Task 2: Tra mức theo loại — `GET /api/pricing/thu-tra?loai=`

**Files:**
- Modify: `src/modules/pricing/index.ts` (route thu-tra ~:401-416), `src/shared/contracts.ts` (`ThuTraResponse` ~:2721)
- Test: `src/modules/pricing/tra-theo-loai.test.ts` (tạo; khuôn `muc-ta.test.ts`: `setup()`, `themLoai`, `taoMuc`, `dongTyLe`, `ganOk`, `mucVai`, `ganHoSo`)

**Interfaces:**
- Produces: `ThuTraResponse.theoLoai?: { code: string; ten: string }`; query nhận đúng một trong `doiTac` | `loai`.

- [ ] **Step 1: Bài đỏ** (`tra-theo-loai.test.ts`), mỗi ca một `test(...)`:
  - `"tra theo loại: dòng riêng của loại thắng chính sách (bậc 4)"` — loại L có `mucVai(L, 900)` và gắn chính sách 1000bp; `GET thu-tra?loai=L&dichVu=ZA1&ngay=<hôm nay>` (as SALES) → 200, `ketQua.trangThai === "SET"`, `ketQua.bac === 4`, `theoLoai.code === L`, `nguoiHuong` deepEqual `{ loai: "HUONG", vai: [L] }`.
  - `"tra theo loại: chỉ chính sách → bậc 7"`.
  - `"tra theo loại: đối tác có mức riêng không ảnh hưởng"` — hồ sơ ORG mang L có dòng `DOI_TAC` 1500bp và chính sách riêng (`POST /api/pricing/ho-so/:id/muc-rieng`); tra theo loại L vẫn ra bậc 4/7, không bao giờ `bac` ∈ {1,2,3,10,11,12}.
  - `"tra theo loại: loại đã tắt → 400"` — `POST /api/pricing/loai-doi-tac/:code/tat` rồi tra → 400, câu chứa «không có trong danh sách được hưởng hoa hồng hoặc đã tắt».
  - `"tra: gửi cả doiTac lẫn loai, hoặc không cái nào → 400"` — câu «Chọn một đối tác hoặc một loại đối tác, dịch vụ và ngày hợp lệ.»
  - `"tra theo loại: Đối tác và lai → 403"`.
- [ ] **Step 2:** `node --test src/modules/pricing/tra-theo-loai.test.ts` → FAIL.
- [ ] **Step 3:** Route: kiểm tham số; nhánh `loai` — kiểm loại đang bật (cùng điều kiện `dangBat` của `GET /api/pricing/loai-doi-tac`), gọi `docBangChoChup(env.DB, { bookerPartyId: null, catalogCodes: [dichVu], ngay })`, rồi `chonMuc` với `nguoiHuong: { loai: "HUONG", partyId: "", vai: [loai] }` và `ganRieng: []` (chuỗi rỗng không khớp `targetPartyId` nào). Phản hồi kèm `theoLoai` (tên từ cùng nguồn tên loại của route `loai-doi-tac`).
- [ ] **Step 4:** chạy lại → PASS; `node --test src/modules/pricing/route.test.ts src/modules/pricing/muc-ta.test.ts` → PASS (nhánh `doiTac` không đổi).
- [ ] **Step 5: Commit** `Hoa hồng: tra mức theo loại đối tác (bậc 4–9)`.

### Task 3: Luật thuần cho «Đổi»

**Files:**
- Modify: `src/modules/pricing/rules.ts`
- Test: `src/modules/pricing/doi-muc.test.ts` (tạo, phần thuần)

**Interfaces:**
- Produces: `kiemDoi(v: { cu: { validFrom: string; validTo: string | null }; tuNgay: unknown; homNay: string }): { ok: true; denNgayCu: string; tuNgay: string } | { ok: false; error: string }` — trả `denNgayCu = addDays(tuNgay, -1)`. Thứ tự kiểm và câu (đúng nguyên văn đặc tả A3):
  1. `cu.validTo !== null` → «Dòng này đã có ngày ngừng nên không đổi được. Thêm mức mới bắt đầu sau ngày ngừng.»
  2. `cu.validFrom > homNay` → «Mức này chưa tới ngày áp dụng nên không đổi được.»
  3. `tuNgay` không phải ngày (`laNgay`) hoặc `< homNay` → «Ngày bắt đầu của mức mới không được trước hôm nay.»
  4. `cu.validFrom >= tuNgay` → `` `Mức cũ bắt đầu từ ${ngayVN(cu.validFrom)} nên không đổi được từ ngày ${ngayVN(tuNgay)}. Dùng Ngừng cho mức cũ, rồi Thêm mức mới.` `` (định dạng dd/mm/yyyy bằng hàm ngày hiện có của `src/shared/vn-date.ts`).
- Produces: `kiemThanDoiMuc(raw: unknown)` = phần `kieu/tyLeBp/moiKhach/theoLoai/denNgay/ghiChu/tuNgay` của `kiemThanMuc` (dùng lại cùng hàm con, KHÔNG nhận `doiTuong`, `phamVi`, `catalogCode`, `groupCode` — có trong thân thì 400 «Đổi mức không đổi được đối tượng hay dịch vụ.»).
- Produces: `cungMuc(a: DongMuc, b: { kind; rateBp; perPaxAmount; theoLoai }): boolean`.

- [ ] **Step 1:** Bài đỏ: một `test` cho mỗi câu ở 1–4 (giá trị biên: `validFrom === tuNgay` → câu 4; `validFrom = homNay`, `tuNgay = addDays(homNay,1)` → ok, `denNgayCu === homNay`; `tuNgay === homNay`, `validFrom = addDays(homNay,-3)` → ok, `denNgayCu === addDays(homNay,-1)`); `kiemThanDoiMuc({ doiTuong: … })` → lỗi; `cungMuc` true khi cùng kiểu/số, false khi khác một trong ba số theo loại khách.
- [ ] **Step 2:** `node --test src/modules/pricing/doi-muc.test.ts` → FAIL.
- [ ] **Step 3:** Viết ba hàm trong `rules.ts`.
- [ ] **Step 4:** chạy lại → PASS.
- [ ] **Step 5: Commit** `Hoa hồng: luật thuần cho Đổi mức một bước`.

### Task 4: Route «Đổi» dòng mức — `POST /api/pricing/hoa-hong/:id/doi`

**Files:**
- Modify: `src/modules/pricing/index.ts`, `src/modules/pricing/repository.ts` (câu đóng có `WHERE id = ? AND valid_to_date IS NULL`, câu chèn `INSERT … SELECT … FROM prc_commission_rule WHERE id = ? AND changes() > 0`), `src/shared/contracts.ts` (`DoiMucResponse { cu: CommissionRuleDto; moi: CommissionRuleDto }`)
- Modify: `src/route-access.test.ts` (SNAPSHOT + số đếm 373 → 374), `src/lan-gui-phu-route.test.ts` (226 → 227)
- Test: `src/modules/pricing/doi-muc.test.ts` (phần route)

**Interfaces:**
- Consumes: `kiemDoi`, `kiemThanDoiMuc`, `cungMuc` (Task 3).
- Produces: route `POST /api/pricing/hoa-hong/:id/doi` (access `office`, `can(partner.commission.write) && !holdsPartner`), phản hồi 200 `DoiMucResponse`.

- [ ] **Step 1: Bài đỏ** (route, khung thử):
  - `"Đổi từ hôm nay: dòng cũ ngừng hôm qua, dòng mới từ hôm nay, cùng đích và phạm vi"` — dòng loại L bắt đầu `addDays(hôm nay,-10)`; Đổi `{ kieu:"RATE", tyLeBp:1200, tuNgay: hôm nay }` → 200; `w.q` thấy dòng cũ `valid_to_date = hôm qua`, dòng mới `valid_from_date = hôm nay`, `target_role_code`/`scope`/`catalog_code` bằng dòng cũ; `nhatKy(w,"prc_commission_rule_closed").length` và `_added` mỗi cái tăng 1.
  - `"Đổi từ ngày tương lai"` — `tuNgay = addDays(hôm nay,5)` → dòng cũ ngừng `addDays(hôm nay,4)`.
  - `"Đổi dòng của chính sách (đích mức TA)"` — dòng tạo bằng `dongTyLe` → 200, dòng mới có `target_tier_code` của chính sách.
  - `"Đổi bị từ chối"`: dòng đã có ngày ngừng → 400 câu 1; dòng sắp áp dụng → 400 câu 2; `tuNgay` hôm qua → 400 câu 3; dòng bắt đầu hôm nay, `tuNgay` hôm nay → 400 câu 4; mức giống hệt → 400 «Mức mới giống hệt mức cũ.»; thân có `phamVi` → 400. Mỗi ca: số dòng `prc_commission_rule` không đổi.
  - `"Hai người Đổi cùng dòng: đúng một dòng mới, người sau 409"` — gọi lần 1 → 200; gọi lần 2 cùng `:id` → 409 `stale` câu «Dòng này vừa được người khác ngừng hoặc đổi. Tải lại trang.»; tổng dòng = 2.
  - `"Hàng rào câu chèn có điều kiện"` — đóng dòng bằng SQL tay (`UPDATE … SET valid_to_date = addDays(hôm nay,-5)`) giữa lúc dựng và lúc gọi; gọi Đổi → 409, **không** có dòng mới (bài này chứng minh `changes() > 0` ở câu chèn; ghi nhầm câu chèn thiếu điều kiện thì bài đỏ).
  - *(Không có ca «Đổi chồng một dòng sắp áp dụng khác»: dòng cũ đang mở nên trigger `prc_commission_rule_overlap` đã bảo đảm không có dòng cùng đích, cùng phạm vi nào bắt đầu sau nó; dòng mới nằm gọn trong khoảng của dòng cũ. Lỗi trigger bất ngờ vẫn đi qua `loiBang` như mọi route.)*
  - `"Đổi: Bán hàng, Đối tác, lai → 403"`.
- [ ] **Step 2:** `node --test src/modules/pricing/doi-muc.test.ts` → FAIL.
- [ ] **Step 3:** Route: đọc dòng cũ (404 «Không tìm thấy dòng mức.»), `kiemThanDoiMuc`, `kiemDoi`, `cungMuc`; một `chayLo` theo thứ tự: câu đóng → câu chèn `changes() > 0` → `auditStatement(closed, "changes() > 0")` → `auditStatement(added, "changes() > 0")`; `res[0].meta.changes === 0` → 409. Chi tiết nhật ký: `đổi mức · dòng <id cũ> → <id mới> · từ <tuNgay>`.
- [ ] **Step 4:** Cập nhật `route-access.test.ts` (thêm `{ method:"POST", path:"/api/pricing/hoa-hong/:id/doi", access:"office" }`, 373 → 374 ở cả hai chỗ), `lan-gui-phu-route.test.ts` (226 → 227 kèm chú thích «Đổi mức, 25/10»), `so-dai-ly-quyen-route.test.ts` (route mới: Tài xế, Tài xế đối tác, Nhân sự → 403).
- [ ] **Step 5:** `node --test src/modules/pricing/doi-muc.test.ts src/route-access.test.ts src/lan-gui-phu-route.test.ts src/route-write-guard.test.ts src/so-dai-ly-quyen-route.test.ts` → PASS.
- [ ] **Step 6: Quan sát chặn thật:** bỏ `AND changes() > 0` ở câu chèn → bài «Hàng rào câu chèn có điều kiện» đỏ → hoàn nguyên. Thêm dòng `docs/SO-HANG-RAO.md`.
- [ ] **Step 7: Commit** `Hoa hồng: Đổi mức một bước (ngừng dòng cũ + mở dòng mới trong một lô)`.

### Task 5: «Đổi chính sách» của loại + `ganRieng`

**Files:**
- Modify: `src/modules/pricing/index.ts`, `src/modules/pricing/repository.ts` (đóng `prc_role_tier` có điều kiện; chèn `WHERE changes() > 0`; câu đọc `prc_party_tier` JOIN `v_pty_party_label` và bảng mức TA lấy tên), `src/shared/contracts.ts` (`MucTaListResponse.ganRieng`)
- Modify: `src/route-access.test.ts` (374 → 375), `src/lan-gui-phu-route.test.ts` (227 → 228), `src/so-dai-ly-quyen-route.test.ts`
- Test: `src/modules/pricing/doi-chinh-sach.test.ts` (tạo)

**Interfaces:**
- Consumes: `kiemDoi` (Task 3) — dùng với `cu` = gắn cũ.
- Produces: `POST /api/pricing/muc-ta/gan/:id/doi` thân `{ muc: string; tuNgay: string }` → 200 `GanLoaiMucResponse` (`{ gan, dongRieng }` như route gắn); `MucTaListResponse.ganRieng: { id: string; partyId: string; ten: string; muc: string; tenMuc: string; tuNgay: string; denNgay: string | null }[]`.

- [ ] **Step 1: Bài đỏ:**
  - `"Đổi chính sách từ hôm nay"` — gắn L→TA1 từ `addDays(hôm nay,-10)`; Đổi `{ muc: TA2, tuNgay: hôm nay }` → 200; gắn cũ ngừng hôm qua, gắn mới L→TA2 từ hôm nay; `thu-tra?loai=L` (Task 2) ra dòng của TA2.
  - `"Đổi chính sách: cùng mức → 400"`, `"mức đã tắt → 409 câu prc_tier_inactive"`, bốn câu của `kiemDoi`, `"hai lần cùng gắn → lần hai 409, một gắn mới"`.
  - `"Đổi chính sách trả dongRieng khi loại còn mức riêng"` — `mucVai(L, 900)` trước → `json.dongRieng.length === 1`.
  - `"GET muc-ta có ganRieng đang và sắp hiệu lực"` — gắn riêng ORG→TA1 từ hôm nay và ORG2→TA2 từ `addDays(hôm nay,3)`, một gắn đã ngừng hôm qua; `json.ganRieng` có đúng 2 dòng, `ten` = tên hồ sơ, `tenMuc` = tên mức; không có trường SĐT/email.
- [ ] **Step 2:** chạy → FAIL.
- [ ] **Step 3:** Viết route và câu đọc theo khuôn Task 4 (nhật ký `prc_role_tier_closed` rồi `prc_role_tier_set`; `dongRieng` lấy bằng `roleRulesForTierLink` như route gắn).
- [ ] **Step 4:** cập nhật ba bài sổ sách; chạy như Task 4 Step 5 với `doi-chinh-sach.test.ts` → PASS.
- [ ] **Step 5: Commit** `Hoa hồng: Đổi chính sách của loại một bước; liệt kê chính sách riêng theo đối tác`.

### Task 6: Hỗ trợ — sự kiện của yêu cầu + `mailPending` ở chi tiết

**Files:**
- Modify: `src/modules/feedback/repository.ts` (câu `LIST_EVENTS`, `LIST_EVENTS_SINCE` qua `defineSql`: đọc `fbk_ticket_event` + tên người (`v_stf_staff_label`) + tên nhóm (`fbk_team`) cho `from_value`/`to_value`, `ORDER BY at, id`), `src/modules/feedback/index.ts` (`detail()` ~:132-143, route `/:id/messages`), `src/shared/contracts.ts` (`FeedbackEventDto`, `FeedbackDetailResponse.suKien`, `FeedbackMessagesSinceResponse.suKien`)
- Test: `src/modules/feedback/su-kien.test.ts` (tạo; khuôn `ve-ho-tro-route.test.ts`)

**Interfaces:**
- Produces: `FeedbackEventDto = { id: string; loai: "CLAIMED" | "ASSIGNED" | "TEAM_CHANGED"; at: string; nguoi: string; tu: string | null; den: string | null }`; `suKien` chỉ khác rỗng khi `quyenPhieu(...).xuLy`.

- [ ] **Step 1: Bài đỏ:**
  - `"thành viên nhóm thấy ba sự kiện đúng thứ tự, tên đã đổi từ id"` — KT_TV nhận việc (`POST /:id/claim`), trưởng nhóm giao cho người khác (`PATCH /:id/xu-ly`), Toàn quyền chuyển nhóm (`POST /:id/transfer` có lý do) → `GET /:id` của người xử lý nhóm mới: `suKien.map(e=>e.loai)` deepEqual `["CLAIMED","ASSIGNED","TEAM_CHANGED"]`; `suKien[2].den` = tên nhóm mới; `suKien[1].den` = tên người được giao; không trường nào chứa chuỗi lý do.
  - `"người gửi (Bán hàng) nhận suKien rỗng"`, `"người gửi bên ngoài (Đối tác) sau chuyển nhóm + giao lại: suKien rỗng, thân phản hồi không chứa tên nhóm cũ"` (`assert.ok(!r.text.includes(<tên nhóm cũ>))` — trừ khi đó là nhóm hiện tại).
  - `"messages?since chỉ trả sự kiện sau since"`.
  - `"thành viên nhóm (không Toàn quyền) thấy mailPending ở chi tiết"` — phiếu `notified_at` NULL → `ticket.mailPending === true` cho KT_TV; người gửi → `false`.
- [ ] **Step 2:** `node --test src/modules/feedback/su-kien.test.ts` → FAIL.
- [ ] **Step 3:** `detail()`: `toTicket(t, q.xuLy)`; thêm `suKien: q.xuLy ? await listEvents(db, id) : []`; route `/messages?since` thêm `suKien` tương tự (cùng trần `MESSAGES_SINCE_LIMIT`).
- [ ] **Step 4:** `node --test src/modules/feedback/*.test.ts src/architecture.test.ts` → PASS.
- [ ] **Step 5: Commit** `Hỗ trợ: trả sự kiện nhận việc / giao / chuyển nhóm cho người xử lý; email báo nhóm ở chi tiết`.

### Task 7: Hỗ trợ — hàng đợi nhiều trạng thái, tìm, đếm

**Files:**
- Modify: `src/modules/feedback/rules.ts` (kiểm `status` danh sách), `src/modules/feedback/repository.ts` (`LIST_QUEUE_TEAM` nhận danh sách trạng thái + `q`; câu `COUNT_QUEUE_TEAM` dùng **chung** đoạn `WHERE` với `LIST_QUEUE_TEAM` — một hằng chuỗi ghép, không chép tay), `src/modules/feedback/index.ts` (route `/queue` ~:341), `src/shared/contracts.ts` (`FeedbackQueueResponse.dem`), `src/shared/ve-ho-tro-hien-thi.ts` (`duongHangDoi` nhận `status: readonly string[]` và `q?`)
- Test: `src/modules/feedback/hang-doi.test.ts` (tạo), `src/modules/feedback/rules.test.ts`

**Interfaces:**
- Produces: query `status=NEW,ACK,IN_PROGRESS` (một mã vẫn chạy), `q` ≤ 60 ký tự (mã `YC-…` hoặc tiêu đề, `mauLikeChua`); `dem: { chuaAiNhan: number; cuaToi: number; tatCa: number }` theo `status` + `q`, bỏ qua `loc`.

- [ ] **Step 1: Bài đỏ** (`hang-doi.test.ts`): dựng 60 yêu cầu ở nhóm Kế toán (trộn NEW/ACK/IN_PROGRESS/DONE, một phần do KT_TV nhận, một phiếu do chính KT_TV gửi, một phiếu người giữ đã ngưng tài khoản):
  - `"dem khớp danh sách tải hết"` — với `status=NEW,ACK,IN_PROGRESS`: tải hết từng `loc` (`limit=50` + `offset`) → `dem.tatCa`/`chuaAiNhan`/`cuaToi` bằng số dòng đếm được; phiếu của chính KT_TV không có mặt; phiếu người giữ ngưng đếm vào `chuaAiNhan`.
  - `"q lọc theo mã và tiêu đề"`; `"status một mã vẫn chạy"`; `"status rỗng hoặc mã lạ → 400"`.
- [ ] **Step 2:** chạy → FAIL.
- [ ] **Step 3:** Viết. Câu đếm là một `SELECT` với ba `SUM(CASE …)`.
- [ ] **Step 4:** `node --test src/modules/feedback/*.test.ts src/shared/ve-ho-tro-hien-thi.test.ts src/architecture.test.ts` → PASS.
- [ ] **Step 5: Commit** `Hỗ trợ: hàng đợi lọc nhiều trạng thái, tìm theo mã/tiêu đề, đếm cho ba nút lọc`.

### Task 8: Hỗ trợ — tạo nhóm không cần mã

**Files:**
- Modify: `src/modules/feedback/rules.ts` (`validateTeamInput` :197 cho `code` tuỳ chọn; thêm `maNhomTuTen(ten: string): string`), `src/modules/feedback/index.ts` (route POST admin/teams ~:241-254)
- Test: `src/modules/feedback/rules.test.ts`, `src/modules/feedback/ve-ho-tro-route.test.ts`

**Interfaces:**
- Produces: `maNhomTuTen("Kế toán – Công nợ") === "KE_TOAN_CONG_NO"`; `"Đặt tour"` → `"DAT_TOUR"`; `"  !!  "` → `"NHOM"`; chuỗi 80 ký tự → độ dài 40, không kết thúc bằng `_`.

- [ ] **Step 1:** Bài đỏ cho `maNhomTuTen` (bốn ca trên); route: không gửi `code` → 201, `team.code === "DAT_TOUR"`; tạo lại cùng tên → 409 câu «Đã có nhóm mang mã DAT_TOUR (tự đặt theo tên). Đổi tên nhóm khác đi một chút rồi thử lại.»; trùng với nhóm đã ngưng → 409; gửi `code` trùng → 409 «Mã nhóm đã có.» (giữ câu cũ).
- [ ] **Step 2:** chạy → FAIL. **Step 3:** viết (bỏ dấu bằng `normalize("NFD")` + bỏ dấu kết hợp, `đ/Đ → D`). **Step 4:** chạy → PASS.
- [ ] **Step 5: Commit** `Hỗ trợ: tạo nhóm không cần gõ mã (máy sinh từ tên)`.

### Task 9: Kiểm toàn bộ, tài liệu, PR

- [ ] **Step 1:** `docs/SYSTEM-DESIGN.md` §7/§9: các dòng route pricing (`thu-tra?loai`, `/hoa-hong/:id/doi`, `/muc-ta/gan/:id/doi`, `ganRieng`), feedback (`suKien`, `/queue` `status`/`q`/`dem`, `code` tuỳ chọn, `mailPending`). `docs/CHANGE-GUIDE.md` nếu có công thức pricing/feedback bị đổi.
- [ ] **Step 2:** `npm test` → mọi bước xanh; `npm run typecheck` → 0 lỗi; `npm run test:e2e` → xanh (ghi số bài, thời gian vào sổ nhật ký).
- [ ] **Step 3:** Kịch bản Chrome **cũ** (giao diện chưa sửa) chạy với máy chủ mới, có `AXE_JS`: `muc-ta-smoke`, `loai-doi-tac-smoke`, `so-dai-ly-smoke`, `ve-ho-tro-smoke`, `ve-ho-tro-2a-smoke` và kịch bản form đơn có ô «Đặt qua đối tác» → xanh (tiêu chí 9 của đặc tả).
- [ ] **Step 4:** Mục nhật ký thay đổi (`changelog.ts`) cho bản phát hành máy chủ.
- [ ] **Step 5:** Giao người kiểm độc lập chỉ đọc (`nguoi-kiem-doc-lap`) với đường dẫn đặc tả + nhánh; chỉ báo «đạt» theo báo cáo đó.
- [ ] **Step 6:** Commit; mở PR **dạng thường** (không nháp) — AI không push; đưa chủ lệnh `npm run day-len` kèm `cd` thư mục gốc, rồi `npm run trien-khai` (cần triển khai).
