# Đặt vé của đối tác, lượt 1 — kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm gọn màn Tạo đơn của tài khoản đối tác, chia trang Hoa hồng thành hai thẻ với tên mới, thêm bộ lọc theo vai trò ở Quản lý tài khoản. Chỉ giao diện và chữ.

**Architecture:** Không thêm cột, route, quyền. Ẩn hiện hỏi `holdsPartner` qua một hàm thuần. Ghi chú ghi vào `trip.note` có sẵn. Đổi chữ do bảng từ (`src/bang-tu-giao-dien.test.ts`) cưỡng chế.

**Tech Stack:** TypeScript, DOM thuần qua `h()`, CSS token, `node --test`, kịch bản Chrome ở `docs/evidence/`.

**Spec:** `docs/superpowers/specs/2026-11-01-dat-ve-doi-tac-design.md` §4 và §8 phần «Lượt 1». Chủ đã duyệt 2026-11-02.

## Global Constraints

- **Không đụng:** `migrations/`, `src/shared/permissions.ts`, `src/shared/contracts.ts`. `git diff main -- migrations src/shared/permissions.ts src/shared/contracts.ts` phải rỗng, trừ chú thích ở `contracts.ts` nếu bắt buộc đổi chữ.
- **Chữ chính xác:** gợi ý giảm giá `Giảm giá cho khách`; nhãn dòng `Ghi chú`; gợi ý ghi chú `Thời gian đón`; thẻ `Cấp độ đại lý`, `Vai người dùng`; khối `Người có cấp riêng`; nút lọc `Tất cả`, `Chưa gán vai trò`.
- **Đối tượng:** form gọn áp cho mọi tài khoản `holdsPartner`, kể cả tài khoản lai. Form của tài khoản không giữ quyền Đối tác không đổi một chữ.
- **Giao diện:** không `innerHTML`; ô gõ 16px; CSS sau mốc PWA chỉ dùng token; tiếng Việt có dấu; không gọi hệ thống là «App».
- **Trần gói trang:** bài trần gói đỏ thì dừng và báo, không tự nới.
- **Git:** làm trong worktree này, commit tiếng Việt kèm dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Không `git push`, không gộp `main`.
- **Bộ kiểm dài** (`npm test` toàn bộ, e2e, Chrome) chỉ chạy ở Task 5; các task khác chạy đúng tệp bài của mình và `npm run typecheck`.

## Review Focus

1. Đối tác mở lại nháp cũ đã có giờ khởi hành, giờ và nơi có mặt, rồi lưu: các giá trị đó phải còn nguyên (Task 1).
2. Tài khoản lai Bán hàng + Đối tác: phải nhận form gọn; Thực tập, Bán hàng thuần thì không (Task 1).
3. Trong trình duyệt còn nhớ thẻ cũ `hh-the=doi-tac`: phải mở «Vai người dùng», không trắng trang (Task 2).
4. «Xem dòng ↓» của Tra nhanh trỏ tới mức riêng một đối tác: phải nhảy đúng dòng trong khối «Người có cấp riêng» khi đối tác đó đang gập hoặc bộ lọc đang giấu (Task 2).
5. Bộ lọc đang chọn một vai mà sau khi ngưng hoặc đổi vai không còn tài khoản nào: phải về «Tất cả», không để danh sách trống mà không có nút nào bật (Task 4).

---

### Task 1: Form Tạo đơn của đối tác — ô Giảm giá, ẩn Thông tin chuyến, dòng Ghi chú

**Files:**
- Create: `src/shared/form-dat-ve.ts`, `src/shared/form-dat-ve.test.ts`, `src/form-dat-ve-noi-day.test.ts`
- Modify: `web/service-card.ts`, `web/order-form.ts`, `public/app.css`, `src/shared/service-form.test.ts`, `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-form.mjs`

**Interfaces:**
- Produces, từ `src/shared/form-dat-ve.ts`:
  - `GOI_Y_GIAM_GIA_DOI_TAC = "Giảm giá cho khách"`, `NHAN_GHI_CHU_DOI_TAC = "Ghi chú"`, `GOI_Y_GHI_CHU_DOI_TAC = "Thời gian đón"`
  - `MAX_GHI_CHU_DICH_VU = 1000` (cùng trần `validateTrip`)
  - `formGonDoiTac(who: Pick<PermissionHolder, "permissions">): boolean`, thân là `holdsPartner(who)`
- Produces, ở `web/service-card.ts`: `CardOptions.formGonDoiTac?: boolean`

- [ ] **Step 1: Viết bài đỏ**

`src/shared/form-dat-ve.test.ts`:
- `formGonDoiTac({ permissions: ["PARTNER"] })` true; `["SALES", "PARTNER"]` true; `["SALES"]`, `["INTERN"]`, `["ADMIN"]`, `["SUPER_ADMIN"]` false.
- Ba chữ đúng từng ký tự như Global Constraints; `MAX_GHI_CHU_DICH_VU === 1000`.

`src/shared/service-form.test.ts`, bài `"đối tác chỉ sửa ghi chú: giờ khởi hành và giờ có mặt của nháp cũ còn nguyên"`: dựng nháp bằng `draftFromDto` từ DTO có `departTime: "08:00"`, `checkinTime: "07:30"`, `checkinPlace: "Cảng Vinpearl"`, `note: ""`; đổi `trip.note` thành `"Đón 7h sáng"`; `toServiceInput` trả đủ cả bốn giá trị.

`src/form-dat-ve-noi-day.test.ts` (khuôn `src/ben-dat-doi-tac-noi-day-giao-dien.test.ts`, đọc mã nguồn):
- `web/order-form.ts` có `formGonDoiTac(staff)` và truyền `formGonDoiTac` vào `createServiceCard`;
- `web/service-card.ts` đặt `tripDetails.hidden` theo `o.formGonDoiTac` và dùng `GOI_Y_GHI_CHU_DOI_TAC`;
- `web/order-form.ts` dùng `GOI_Y_GIAM_GIA_DOI_TAC`.

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `node --test src/shared/form-dat-ve.test.ts src/form-dat-ve-noi-day.test.ts`
Expected: FAIL vì chưa có `form-dat-ve.ts`. Bài ở `service-form.test.ts` có thể xanh ngay vì `draft.trip` vốn giữ đủ: đó là bài ghim, ghi rõ trong nhật ký commit.

- [ ] **Step 3: Viết `src/shared/form-dat-ve.ts`**

- [ ] **Step 4: Sửa `web/service-card.ts`**

Khi `o.formGonDoiTac`: `tripDetails.hidden = true`, và chèn ngay sau `duaDon.root` một ô `input` một dòng, `maxLength: MAX_GHI_CHU_DICH_VU`, `placeholder: GOI_Y_GHI_CHU_DOI_TAC`, `data-trip-gon: "note"`, gói bằng `h("label", { class: "o-noi" }, khungNhanNoi(NHAN_GHI_CHU_DOI_TAC, o, { khungClass: "o-hien-goi-y" }))`. Gõ thì `commit({ ...draft, trip: { ...draft.trip, note: el.value } })`. `refresh` đồng bộ giá trị ô khi ô không có focus. `reveal()` không mở `tripDetails` khi đang ẩn. Vẫn dựng `fields` để `draft.trip` và các đường sẵn có không đổi.

- [ ] **Step 5: Sửa `web/order-form.ts`**

Đặt `const formGon = formGonDoiTac(staff)` sau `initShell()`, trước khi dựng thẻ; truyền vào `createServiceCard`. Dựng thẻ trước đó phải đọc biến này (khuôn `retailOnly`). Khi `formGon`, với `#discount`: gỡ `.o-noi-chu` của ô, thêm class `o-khong-nhan` cho `.o-noi-khung`, đặt `placeholder = GOI_Y_GIAM_GIA_DOI_TAC`, `aria-label = GOI_Y_GIAM_GIA_DOI_TAC`. Giữ nguyên luật khoá ô và câu trần giảm giá. Khối Tóm tắt giữ dòng «Giảm giá».

- [ ] **Step 6: Thêm CSS ở `public/app.css`, ngay sau luật `.o-noi-khung > :is(input, textarea):focus::placeholder`, chỉ token**

- `.o-noi-khung.o-khong-nhan > input`: bỏ đệm dành cho nhãn nổi, chữ canh giữa ô; `::placeholder` dùng `var(--c-placeholder)`.
- `.o-noi-khung.o-hien-goi-y > input`: `::placeholder` dùng `var(--c-placeholder)`; nhãn `.o-noi-chu` luôn ở vị trí thu nhỏ, kể cả khi `:placeholder-shown:not(:focus)`.

- [ ] **Step 7: Chạy, thấy xanh**

Run: `node --test src/shared/form-dat-ve.test.ts src/form-dat-ve-noi-day.test.ts src/shared/service-form.test.ts && npm run typecheck`
Expected: PASS, typecheck 0 lỗi.

- [ ] **Step 8: Thêm bước vào `a2-smoke-form.mjs`** (chạy thật ở Task 5)

Tài khoản đối tác: `details.trip` bị ẩn; `input[data-trip-gon="note"]` có `placeholder` đúng chữ; gõ, lưu, mở lại còn nguyên; `#discount` có `placeholder` đúng chữ và không có `.o-noi-chu`. Tài khoản Bán hàng: `details.trip` hiện, nhãn `Giảm giá (₫)` còn.

- [ ] **Step 9: Commit**

`git add` đúng các tệp ở mục Files; thông điệp `feat(dat-ve): form gọn cho đối tác — ô giảm giá, ẩn thông tin chuyến, dòng ghi chú`.

---

### Task 2: Trang Hoa hồng — hai thẻ

**Files:**
- Modify: `public/hoa-hong.html`, `web/hoa-hong.ts`, `web/hoa-hong-doi-tac.ts`, `src/shared/hoa-hong-hien-thi.ts`, `src/shared/hoa-hong-hien-thi.test.ts`, `docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs`

**Interfaces:**
- Produces: `TheHoaHong = "cap" | "loai"`. `docThe("doi-tac")` trả `"loai"`. `theChoKetQua`: `bac <= 6` trả `the: "loai"`, còn lại `"cap"`. Trong trang: phần tử `#hh-loai-ds` và `#hh-loai-rieng`, cùng nằm trong `#hh-the-loai`.

- [ ] **Step 1: Sửa bài cho đỏ**

`hoa-hong-hien-thi.test.ts`: `HT.docThe("doi-tac") === "loai"` (thay dòng 490 đang ghim `"doi-tac"`); bài mới `"§3.3 theChoKetQua: mức riêng đối tác nằm ở thẻ Vai người dùng"`: `bac` 1, 2, 3 trả `the === "loai"`, `doiTuong` giữ nguyên; `bac` 7 trả `"cap"`.

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `node --test src/shared/hoa-hong-hien-thi.test.ts`
Expected: FAIL ở hai bài trên.

- [ ] **Step 3: Sửa `docThe`, `theChoKetQua`, kiểu `TheHoaHong`**

- [ ] **Step 4: Sửa `public/hoa-hong.html`**

Bỏ nút `hh-tab-doi-tac` và `section#hh-the-doi-tac`. Trong `section#hh-the-loai` đặt `<div id="hh-loai-ds"></div>` và `<div id="hh-loai-rieng"></div>`. Chữ thẻ: `Cấp độ đại lý`, `Vai người dùng`.

- [ ] **Step 5: Sửa `web/hoa-hong.ts`**

`THE = ["cap", "loai"]`; `panelEl`, `tabEl` hai khoá; `veTheLoai(byId("hh-loai-ds"), …)`, `veTheDoiTac(byId("hh-loai-rieng"), …)`. `nhayToiDong`: nhánh `DOI_TAC` tìm trong `#hh-loai-rieng`, sau `chonThe("loai")`. Sửa chú thích đầu tệp thành hai thẻ.

- [ ] **Step 6: Sửa `web/hoa-hong-doi-tac.ts`**

Tiêu đề khối thành `Người có cấp riêng`, dùng `h3` dưới `h2` của thẻ. Giữ nguyên id bộ lọc, hành vi, `data-party`.

- [ ] **Step 7: Sửa `hoa-hong-smoke.mjs` theo hai thẻ** (chạy thật ở Task 5)

Bước 1 ghim `["Cấp độ đại lý", "Vai người dùng"]`, phím mũi tên hai thẻ, `hh-the=doi-tac` mở `loai`. Bước CR và mọi bước tìm `#hh-the-doi-tac` đổi sang `#hh-loai-rieng`, `chuyenThe(p, "loai")`. Bước «Xem dòng ↓»: đối tác gập và bộ lọc giấu vẫn nhảy đúng.

- [ ] **Step 8: Chạy, thấy xanh**

Run: `node --test src/shared/hoa-hong-hien-thi.test.ts && npm run typecheck`
Expected: PASS, typecheck 0 lỗi.

- [ ] **Step 9: Commit**

Thông điệp `feat(hoa-hong): gộp thành hai thẻ, khối Người có cấp riêng chuyển vào thẻ vai`.

---

### Task 3: Đổi chữ đồng loạt, do bảng từ cưỡng chế

**Files:**
- Modify: `src/shared/bang-tu-giao-dien.ts`, rồi mọi tệp bài `src/bang-tu-giao-dien.test.ts` báo; các bài ghim chữ cũ; `docs/SYSTEM-DESIGN.md` §15 (từ vựng); `src/shared/so-do-trang.ts` và kho trợ lý (sinh bằng `node scripts/sinh-so-do-trang.mjs`, không sửa tay)

**Interfaces:**
- Consumes: hai thẻ ở Task 2.

- [ ] **Step 1: Thêm luật vào `TU_DA_LOAI` để bài đỏ, cuối mảng**

Mỗi dòng có `nguon: "chủ 2026-11-01, đặc tả 2026-11-01-dat-ve-doi-tac §4.3 (thay quyết định 3 ngày 30/10)"`:
- `/[Ll]oại đối tác|LOẠI ĐỐI TÁC/u` → `Vai người dùng`
- `/[Cc]ấp đại lý|CẤP ĐẠI LÝ/u` → `Cấp độ đại lý`
- `/Riêng từng đối tác/u` → `Người có cấp riêng`

Sửa dòng cấm chữ «vai»: thêm `người dùng` vào lookahead cuối, `(?! trò| người dùng)`, vì chủ đã chọn tên này; `vai` đứng một mình vẫn bị cấm.

Thêm `CAM_THEO_TEP` cho `/^web\/hoa-hong[^/]*\.ts$/` và `/^src\/shared\/hoa-hong-hien-thi\.ts$/`: `cam: /(?<![\p{L}\p{N}_])[Ll]oại(?! khách)(?![\p{L}\p{N}_])/u`, `thay: "vai trò"`. Lý do: «loại» nói tắt ở các tệp này chính là vai; «loại khách» (người lớn, trẻ em) giữ nguyên.

- [ ] **Step 2: Chạy, thấy đỏ, lưu danh sách**

Run: `node --test src/bang-tu-giao-dien.test.ts`
Expected: FAIL, liệt kê từng tệp và chuỗi.

- [ ] **Step 3: Sửa mọi chuỗi bài báo**

Quy tắc chữ:
- `Loại đối tác` → `Vai người dùng`; `loại đối tác` → `vai người dùng`.
- `Các cấp đại lý`, `Cấp đại lý` → `Cấp độ đại lý`; `cấp đại lý` → `cấp độ đại lý`. Tên cấp là dữ liệu («Đại lý cấp 3»), không đổi.
- «loại» nói tắt → `vai trò`: `＋ Thêm vai trò`, `Tắt vai trò: X`, `Chọn cấp cho vai trò này`, `Thêm vai trò vào cấp này`, `Tìm vai trò hoặc dịch vụ`.
- Nhắc tới thẻ cũ: `thẻ «Riêng từng đối tác»` → `khối «Người có cấp riêng»`.
- Không đổi: tên hàm, tên biến, `data-*`, id, route, mã `loai`, cột SQL, `src/shared/changelog.ts` mục cũ, chú thích (được đổi nếu tiện), câu trong migration.
- Hai câu `CAU_*` ở `hoa-hong-hien-thi.ts` phải đọc xuôi sau khi đổi; đọc lại cả câu, không thay máy móc.

- [ ] **Step 4: Sửa các bài ghim chữ cũ, chỉ sửa chữ mong đợi, không đổi ý bài**

Run: `git grep -lE "[Ll]oại đối tác|[Cc]ấp đại lý|Riêng từng đối tác" -- 'src/*.test.ts' 'src/**/*.test.ts' tests docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai`
Bài nào đỏ vì chữ thì sửa chữ; bài đỏ vì lý do khác thì dừng và báo.

- [ ] **Step 5: Sinh lại kho tri thức, sửa từ vựng**

Run: `node scripts/sinh-so-do-trang.mjs`. Sửa `docs/SYSTEM-DESIGN.md` §15: thêm ba thuật ngữ (Vai người dùng, Cấp độ đại lý, Người có cấp riêng), ghi tên cũ một lần.

- [ ] **Step 6: Chạy, thấy xanh**

Run: `node --test src/bang-tu-giao-dien.test.ts src/shared/hoa-hong-hien-thi.test.ts src/shared/huong-dan.test.ts && npm run typecheck`
Expected: PASS, typecheck 0 lỗi.

- [ ] **Step 7: Chứng minh hàng rào chặn thật (P16), rồi hoàn nguyên**

Tạm thêm chuỗi `"Loại đối tác"` vào `web/hoa-hong-dai.ts`, chạy `node --test src/bang-tu-giao-dien.test.ts`, thấy đỏ, hoàn nguyên, thấy xanh. Ghi kết quả vào thông điệp commit.

- [ ] **Step 8: Commit**

Thông điệp `refactor(chu): Vai người dùng và Cấp độ đại lý trên mọi chữ người dùng thấy`, thân nêu vì sao và nguồn lời chủ.

---

### Task 4: Quản lý tài khoản — bộ lọc theo vai trò

**Files:**
- Create: `src/shared/loc-tai-khoan.ts`, `src/shared/loc-tai-khoan.test.ts`
- Modify: `public/staff.html`, `web/staff.ts`, `docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs`

**Interfaces:**
- Produces, từ `src/shared/loc-tai-khoan.ts`:
  - `LOC_TAT_CA = "tat-ca"`, `LOC_CHUA_GAN = "chua-gan"`
  - `interface NutLoc { khoa: string; nhan: string; soLuong: number }`
  - `nutLocVai(ds: readonly { roles: readonly RoleCode[] }[], tenVai: Readonly<Record<string, string>>): NutLoc[]`
  - `locTheoVai<T extends { roles: readonly RoleCode[] }>(ds: readonly T[], khoa: string): T[]`
  - `chonLocHopLe(khoa: string | null, nut: readonly NutLoc[]): string`

- [ ] **Step 1: Viết bài đỏ `src/shared/loc-tai-khoan.test.ts`**

- `nutLocVai`: nút đầu `{ khoa: "tat-ca", nhan: "Tất cả", soLuong: tổng }`; các vai theo thứ tự `ROLE_CODES`, chỉ vai có ít nhất một tài khoản; nút `Chưa gán vai trò` đứng cuối, chỉ có khi có tài khoản `roles: []`; tài khoản hai vai được đếm ở cả hai nút; `tenVai` thắng `ROLES[c].name`, thiếu thì dùng `ROLES[c].name`.
- `locTheoVai`: `tat-ca` trả đủ; mã vai trả tài khoản mang vai đó; `chua-gan` trả tài khoản `roles: []`.
- `chonLocHopLe`: khoá có trong `nut` trả chính nó; `null`, rác, hoặc khoá không còn nút trả `"tat-ca"`.

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `node --test src/shared/loc-tai-khoan.test.ts`
Expected: FAIL vì chưa có tệp.

- [ ] **Step 3: Viết `src/shared/loc-tai-khoan.ts`**

- [ ] **Step 4: Sửa `public/staff.html`, `web/staff.ts`**

HTML: `<div id="loc-vai" class="loc-nut-hang" role="group" aria-label="Lọc theo vai trò" hidden></div>` ngay trên `section.table-wrap`. `load()`: tính `nutLocVai(accounts, tenVai)`, `chonLocHopLe` với lựa chọn đang nhớ, dựng nút `.loc-nut[aria-pressed]` chữ `<nhãn> (<số>)`, dựng bảng và thẻ từ `locTheoVai`. Bấm nút thì vẽ lại, không gọi API. Nhớ ở `sessionStorage["tk-loc-vai"]`, bọc `try/catch`. Chỉ hiện `#loc-vai` khi có dữ liệu.

- [ ] **Step 5: Chạy, thấy xanh**

Run: `node --test src/shared/loc-tai-khoan.test.ts && npm run typecheck`
Expected: PASS, typecheck 0 lỗi.

- [ ] **Step 6: Thêm bước vào `dot-a-smoke.mjs`** (chạy thật ở Task 5)

Bấm một vai: số dòng khớp số trong nút, cả bảng và thẻ. Bấm «Tất cả»: đủ dòng. Tải lại trang: lựa chọn còn.

- [ ] **Step 7: Commit**

Thông điệp `feat(tai-khoan): bộ lọc danh sách theo vai trò`.

---

### Task 5: Hướng dẫn, nhật ký phát hành, kiểm cuối

**Files:**
- Modify: `src/shared/huong-dan-doi-tac.ts`, `src/shared/changelog.ts`, `docs/BACKLOG.md`, `docs/CHANGE-GUIDE.md` (một dòng), `web/CLAUDE.md` chỉ khi kịch bản đổi tên (không đổi thì không chạm)
- Create: `docs/evidence/2026-11-02-dat-ve-luot-1/` (ảnh, `README.md`)

- [ ] **Step 1: Sửa hướng dẫn Đối tác**

Mục «Lập đơn cho khách»: bỏ nhắc giá trị Thông tin chuyến; thêm câu dòng **Ghi chú**; ô giảm giá ghi là ô có chữ mờ «Giảm giá cho khách». Ví dụ giữ nguyên nếu không nói tới ô đã ẩn.

- [ ] **Step 2: Thêm mục đầu `changelog.ts`**

Số kế tiếp sau mục đầu hiện hành, lời thường, ba dòng. Nội dung: màn Tạo đơn của đối tác gọn hơn, trang Hoa hồng còn hai thẻ với tên mới, Quản lý tài khoản lọc được theo vai trò.

- [ ] **Step 3: Ghi nợ ở `docs/BACKLOG.md`**

Loại tự thêm nằm trên hồ sơ chưa lọc được ở Quản lý tài khoản. Trang đơn của đối tác vẫn có «Sửa thông tin chuyến» như hôm nay.

- [ ] **Step 4: Chạy bộ kiểm đầy đủ, một lần**

Run: `npm test && npm run typecheck && npm run test:e2e`
Expected: mọi bước xanh. Đỏ vì lý do khác lượt này (`HC-5.19` quá hạn, bài đo giờ khi máy tải cao) thì ghi rõ, không tự gia hạn, không sửa bài.

- [ ] **Step 5: Chạy kịch bản Chrome (cách chạy ở `tests/e2e/README.md`, có `AXE_JS`)**

`a2-smoke-form.mjs`, `a2-smoke-order.mjs`, `hoa-hong-smoke.mjs`, `dot-a-smoke.mjs`, `va3-smoke.mjs`.
Expected: `SMOKE OK`. Thiếu Chrome hoặc axe thì ghi «chưa chạy», không nói đạt.

- [ ] **Step 6: Chụp ảnh thật hai khổ 390 và 1280**

Form đối tác, form Bán hàng (để so), trang Hoa hồng hai thẻ, Quản lý tài khoản có lọc. Lưu vào `docs/evidence/2026-11-02-dat-ve-luot-1/`, `README.md` ghi cách chụp.

- [ ] **Step 7: Commit**

Thông điệp `docs(dat-ve): hướng dẫn, nhật ký, bằng chứng lượt 1`.
