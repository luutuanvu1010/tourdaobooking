# Thiết kế lại giao diện — Bước 2, Đợt A (5 trang có bảng) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo mốc CSS "bảng chuyển thành thẻ dưới 900px" dùng chung (chưa tồn tại trong mã — xác nhận ở Bước 1), rồi restyle 5 trang có bảng (Nhân viên, Dịch vụ & giá, Địa điểm, Hồ sơ, Nhật ký) theo bản thiết kế đã duyệt.

**Architecture:** Mỗi trang giữ NGUYÊN bảng `<table class="items">` cho máy tính (không đổi cấu trúc/logic), THÊM một danh sách thẻ `.card-list` song song cho điện thoại — hai khối luôn cùng tồn tại trong DOM, CSS ẩn/hiện theo bề rộng màn hình (không animate, không JS đo kích thước). 5 trang có 5 kiểu thẻ khác nhau theo đúng mẫu thiết kế (không ép một khuôn thẻ cứng cho tất cả) nhưng dùng chung: khung thẻ (nền trắng, viền, bo góc), lớp nút "pill", và mốc 900px.

**Tech Stack:** TypeScript thuần, `h()` (`web/dom.ts`), CSS token (`public/app.css`). Không thêm dependency.

**Spec:** `docs/superpowers/specs/2026-09-22-thiet-ke-lai-giao-dien-design.md` (đặc biệt §6). Kế hoạch Bước 1 (đã xong, xem để biết ngữ cảnh nhưng không phụ thuộc mã): `docs/superpowers/plans/2026-09-22-thiet-ke-lai-giao-dien-buoc-1.md`.

## Global Constraints

- Tiếng Việt có dấu đầy đủ; không lộ chữ Anh cho người dùng.
- Không `innerHTML`; mọi DOM dựng bằng `h()`.
- CSS trong `public/app.css` từ mốc `/* ---------- app iPhone (PWA)` trở đi: CHỈ token, không hex/px cứng (trừ đúng `1px`).
- `web/` chỉ import `../src/shared/*` (không đuôi `.ts`), không import `src/modules/`.
- Không đổi logic/hành vi nghiệp vụ của 5 trang này (chỉ đổi trình bày) — mọi hàm `act()`, khoá lạc quan, validate giữ nguyên.
- Sửa hành vi → test đỏ trước xanh sau. Đây là việc THUẦN GIAO DIỆN (không đổi API/dữ liệu) nên không cần test mới ở `src/`; kiểm bằng kịch bản Chrome (Task 7 tạo mới, vì hiện chưa có kịch bản nào cho 5 trang này).
- Không tự chạy git push/deploy (CLAUDE.md §8).

## Phát hiện quan trọng (đọc trước khi làm Task 1)

Đã xác nhận (đọc toàn bộ `app.css`, liệt kê cả 10 khối `@media`): **KHÔNG có bất kỳ cơ chế "bảng → thẻ" nào trong mã hiện tại**, ở bất kỳ mốc px nào. `.table-wrap` chỉ cho cuộn ngang. Task 1 dưới đây là nơi TẠO MỚI cơ chế này, không phải sửa cái có sẵn.

5 trang KHÔNG dùng chung một hàm `act()`/`btn()` — mỗi tệp tự viết lại (khác nhau nhỏ). Kế hoạch này KHÔNG gộp chúng thành hàm dùng chung (ngoài phạm vi, rủi ro hồi quy không cần thiết cho việc chỉ đổi giao diện) — giữ nguyên từng tệp tự viết, chỉ thêm phần dựng thẻ.

Chưa có kịch bản Chrome nào cho 5 tệp `staff.ts/catalog.ts/locations.ts/parties.ts/audit.ts` (bảng cuối `web/CLAUDE.md` không có dòng nào) — Task 7 tạo mới.

## Task 1: Mốc CSS bảng→thẻ dùng chung + lớp nút "pill"

**Files:**
- Modify: `public/app.css`

**Interfaces:**
- Produces: quy tắc `@media (max-width: 899px) { .table-wrap { display: none } }` / `@media (min-width: 900px) { .card-list { display: none } }`; lớp `.card`, tái dùng đúng token đã có (không tạo token thẻ mới vì `.card` đã tồn tại — xác nhận lại ở Step 1); lớp mới `.pill-btn` (nút chính) và `.pill-btn.pill-btn-danger` (nút cảnh báo/ẩn).
- Consumes (Task 2-6): các lớp trên.

- [ ] **Step 1: Xác nhận lớp `.card` hiện có đủ dùng cho khung thẻ**

Run: `grep -n "^\.card\b\|^\.card {" public/app.css`
Expected: có định nghĩa `.card { ... }` (nền trắng/viền/bo góc/đệm — đúng khuôn "nền:#fff;border:1px solid var(--c-border);border-radius:12px;padding:...` mà 5 mockup đều dùng). Nếu giá trị khớp đúng `--c-surface`/`--c-border`/`--radius-md`, DÙNG LẠI class `.card` cho từng thẻ danh sách (không tạo class mới cho khung ngoài). Nếu lệch (ví dụ đệm khác `--s4`), báo trong report và tự quyết dùng `.card` nguyên trạng (không sửa `.card` — nó dùng ở khắp nơi, đổi sẽ ảnh hưởng diện rộng ngoài phạm vi) hoặc thêm class con `.card-list-item` chỉ chỉnh đệm, ghi rõ lý do.

- [ ] **Step 2: Thêm mốc bảng→thẻ**

Tìm dòng cuối cùng của khối CSS bảng hiện có (`table.items th, table.items td { ... }` — dòng ~163 theo lần đọc gần nhất, ĐỊNH VỊ BẰNG NỘI DUNG không theo số dòng). Thêm ngay sau khối đó:

```css
.card-list { display: grid; gap: var(--s2); }
@media (max-width: 899px) {
  .table-wrap { display: none; }
}
@media (min-width: 900px) {
  .card-list { display: none; }
}
```

- [ ] **Step 3: Thêm lớp nút "pill"**

Thêm ngay sau khối vừa thêm ở Step 2:

```css
.pill-btn { font-size: var(--fs-label); font-weight: 600; color: var(--c-primary); background: var(--c-primary-soft); border: none; border-radius: var(--radius-sm); padding: 0 var(--s4); min-height: var(--tap-min); }
.pill-btn.pill-btn-danger { color: var(--c-accent-strong); background: var(--c-accent-soft); }
```

(Ánh xạ từ mockup: cỡ chữ 14px→`--fs-label`, bo góc 8px→`--radius-sm`, chiều cao tối thiểu 44px→`--tap-min`, khoảng đệm ngang 14px→gần nhất `--s4` 16px — chấp nhận sai khác nhỏ, không cần token mới.)

- [ ] **Step 4: Build + quét token**

Run: `npm run build:web && npm run test:e2e -- pwa`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/app.css
git commit -m "Bước 2 Đợt A: thêm mốc CSS bảng→thẻ dưới 900px và lớp nút pill dùng chung"
```

## Task 2: Restyle trang Nhân viên (`/staff`)

**Files:**
- Modify: `web/staff.ts`

**Interfaces:**
- Consumes: `.card-list`, `.pill-btn` (Task 1); `StaffAccount` (đã có qua `./api`); `dateTime` (`./format`, đã import).
- Produces: hàm `card(s: StaffAccount): HTMLElement` mới trong `web/staff.ts`, dùng bởi `load()` song song với `row()`.

Mẫu thẻ (dịch từ mockup `05 Nhan vien.dc.html`, ánh xạ màu/khoảng cách sang token — KHÔNG copy mã màu/hex):

- [ ] **Step 1: Thêm hàm `card()` và nối vào `load()`**

Thêm hàm sau, ngay sau hàm `row()` hiện có trong `web/staff.ts`:

```ts
function card(s: StaffAccount): HTMLElement {
  const btn = (label: string, onclick: () => void, danger = false) => {
    const b = h("button", { type: "button", class: danger ? "pill-btn pill-btn-danger" : "pill-btn" }, label);
    b.addEventListener("click", onclick);
    return b;
  };
  const isMe = s.id === me.id;
  return h(
    "div",
    { class: "card" },
    h("div", null, h("strong", null, s.fullName), isMe && h("span", { class: "muted" }, " (bạn)")),
    !s.active && h("div", null, h("span", { class: "badge badge-cancelled" }, "Ngưng")),
    s.locked && h("div", null, h("span", { class: "badge badge-draft" }, "Bị khoá đăng nhập")),
    h("div", { class: "muted" }, s.phone, " · ", permissionsLabel(s.permissions)),
    h("div", { class: "muted" }, s.lastLoginAt ? `Đăng nhập gần nhất ${dateTime(s.lastLoginAt)}` : "Chưa ghi nhận đăng nhập"),
    h(
      "div",
      { style: "display:flex;gap:var(--s2);margin-top:var(--s1)" },
      btn("Sửa", () => openEdit(s)),
      btn("Đặt lại PIN", async () => {
        if (!confirm(`Đặt lại PIN của ${s.fullName}? PIN cũ và mọi phiên đang đăng nhập sẽ mất hiệu lực.`)) return;
        const r = await act(() => api<Api.StaffWithPinResponse>(`/api/staff/${s.id}/reset-pin`, { method: "POST" }));
        if (r) {
          showSecrets("PIN mới", [{ name: s.fullName, phone: s.phone, pin: r.pin }]);
          await load();
        }
      }),
      s.locked && btn("Mở khoá", async () => {
        if (await act(() => api(`/api/staff/${s.id}/unlock`, { method: "POST" }))) await load();
      }),
      !isMe &&
        btn(
          s.active ? "Ngưng" : "Kích hoạt lại",
          async () => {
            if (s.active && !confirm(`Ngưng tài khoản ${s.fullName}? Họ sẽ bị đăng xuất ngay.`)) return;
            if (await act(() => api(`/api/staff/${s.id}`, { method: "PATCH", body: { active: !s.active } }))) await load();
          },
          s.active,
        ),
    ),
  );
}
```

*Chú ý:* hàm `card()` LẶP LẠI logic hành động giống `row()` (đây là đánh đổi có chủ ý — mỗi hàm build một khung DOM khác nhau cho cùng dữ liệu; gộp chung sẽ phức tạp hơn giá trị mang lại ở quy mô 5 trang này). Nút "danger" dùng đúng `s.active` làm cờ `danger` (khi `s.active` true, nút hiện "Ngưng" cần tô cảnh báo — sửa lại: gọi `btn(..., s.active)` nghĩa là `danger = s.active`, ĐÚNG Ý vì "Ngưng" là hành động cảnh báo còn "Kích hoạt lại" thì không — xác nhận lại logic này khi cài đặt, đừng chép máy móc nếu thấy ngược).

- [ ] **Step 2: Thêm `.card-list` vào HTML và nối trong `load()`**

Trong `public/staff.html`, thêm ngay sau dòng `<tbody id="list"></tbody></table>` (bên trong cùng `<section class="card table-wrap">`, hoặc ngay sau đóng `</section>` đó — chọn ngay sau đóng `</section>` để không lồng trong bảng):

```html
  <div id="list-cards" class="card-list"></div>
```

Trong `web/staff.ts`, thêm khai báo hằng cạnh `listEl`:

```ts
const listCardsEl = byId("list-cards");
```

Sửa hàm `load()`:

```ts
async function load(): Promise<void> {
  const r = await act(() => api<Api.StaffListResponse>("/api/staff"));
  if (!r) return;
  accounts = r.staff;
  replaceChildren(listEl, ...accounts.map(row));
  replaceChildren(listCardsEl, ...accounts.map(card));
}
```

- [ ] **Step 3: Build + kiểm kiểu**

Run: `npm run build:web && npm run typecheck`
Expected: 0 lỗi.

- [ ] **Step 4: Commit**

```bash
git add public/staff.html web/staff.ts
git commit -m "Bước 2 Đợt A: restyle trang Nhân viên — thêm khung thẻ điện thoại"
```

## Task 3: Restyle trang Dịch vụ & giá (`/catalog`)

**Files:**
- Modify: `web/catalog.ts`, `public/catalog.html`

**Interfaces:**
- Consumes: `.card-list`, `.pill-btn` (Task 1); `PAX_ORDER`, `PAX_LABEL` (đã import); `vnd` (đã import).

- [ ] **Step 1: Thêm hàm `card()` trong `web/catalog.ts`**

Thêm ngay sau hàm `row()`:

```ts
function priceLine(it: CatalogAdminItem): string {
  const PAX_ABBR: Record<PaxCode, string> = { adult: "NL", child: "TE", senior: "NCT", infant: "EB" };
  return PAX_ORDER.filter((c) => it.supported && it.prices[c] !== null)
    .map((c) => `${PAX_ABBR[c]} ${grouped(it.prices[c]!)}`)
    .join(" · ") || "—";
}

function card(it: CatalogAdminItem): HTMLElement {
  const btn = (label: string, onclick: () => void, danger = false) => {
    const b = h("button", { type: "button", class: danger ? "pill-btn pill-btn-danger" : "pill-btn" }, label);
    b.addEventListener("click", onclick);
    return b;
  };
  const update = async (path: string, init: { method: string; body?: unknown }) => {
    const r = await act(() => api<Api.CatalogItemResponse>(path, init));
    if (r) {
      items = items.map((x) => (x.code === r.item.code ? r.item : x));
      render();
    }
  };
  return h(
    "div",
    { class: "card" },
    h("div", { class: "muted" }, it.code, " · ", it.unit),
    h("div", null, h("strong", null, it.name), it.hidden && h("span", { class: "badge badge-cancelled" }, " Đã ẩn"), !it.inSheet && h("span", { class: "badge badge-draft" }, " Không còn trong Sheet")),
    h("div", null, priceLine(it), it.overridden.length > 0 && h("span", { class: "mark", title: "Có giá ghi đè" }, " ✎")),
    it.conflicts.length > 0 && h("div", { class: "alert warn" }, "Sheet đã đổi giá kể từ khi ghi đè — giá đang bán vẫn là giá ghi đè."),
    h(
      "div",
      { style: "display:flex;gap:var(--s2);margin-top:var(--s1)" },
      btn("Sửa giá", () => openEdit(it)),
      btn(it.hidden ? "Hiện lại" : "Ẩn", () => update(`/api/catalog/${encodeURIComponent(it.code)}`, { method: "PATCH", body: { hidden: !it.hidden } }), !it.hidden),
    ),
  );
}
```

Cần import thêm `PaxCode` nếu chưa có kiểu này ở đầu tệp (đã có `type PaxCode` trong import từ `./api` theo mã hiện tại — xác nhận trước khi thêm, tránh khai trùng).

- [ ] **Step 2: Nối vào `render()` (không phải `load()` — trang này lọc/tìm cục bộ qua hàm `render()`)**

Trong `public/catalog.html`, thêm sau `</section>` bọc bảng:

```html
  <div id="list-cards" class="card-list"></div>
```

Trong `web/catalog.ts`, thêm hằng `listCardsEl = byId("list-cards");` cạnh `listEl`, sửa cuối hàm `render()`:

```ts
function render(): void {
  const q = qEl.value.trim().toLowerCase();
  const f = filterEl.value;
  const shown = items.filter((it) => {
    if (q && !it.code.toLowerCase().includes(q) && !it.name.toLowerCase().includes(q)) return false;
    if (f === "overridden") return it.overridden.length > 0;
    if (f === "conflict") return it.conflicts.length > 0;
    if (f === "hidden") return it.hidden;
    if (f === "missing") return !it.inSheet;
    return true;
  });
  replaceChildren(listEl, ...shown.map(row), shown.length === 0 && h("tr", null, h("td", { colspan: 8, class: "empty" }, "Không có dịch vụ nào khớp.")));
  replaceChildren(listCardsEl, ...shown.map(card), shown.length === 0 && h("p", { class: "empty" }, "Không có dịch vụ nào khớp."));
}
```

- [ ] **Step 3: Build + kiểm kiểu**

Run: `npm run build:web && npm run typecheck`
Expected: 0 lỗi.

- [ ] **Step 4: Commit**

```bash
git add public/catalog.html web/catalog.ts
git commit -m "Bước 2 Đợt A: restyle trang Dịch vụ & giá — thêm khung thẻ điện thoại"
```

## Task 4: Restyle trang Địa điểm (`/locations`)

**Files:**
- Modify: `web/locations.ts`, `public/locations.html`

**Interfaces:**
- Consumes: `.card-list`, `.pill-btn` (Task 1).

- [ ] **Step 1: Thêm hàm `card()` (bố cục NGANG — khác 2 trang trên, đúng mockup)**

Thêm sau hàm `row()`:

```ts
function card(l: Api.LocationDto): HTMLElement {
  const edit = h("button", { type: "button", class: "pill-btn" }, "Sửa");
  edit.addEventListener("click", () => openEdit(l));
  return h(
    "div",
    { class: "card", style: l.active ? "" : "opacity:.65", "data-testid": "location-card" },
    h(
      "div",
      { style: "flex:1" },
      h("strong", null, l.name),
      !l.active
        ? h("div", null, h("span", { class: "badge badge-cancelled" }, "Ngưng dùng"))
        : h("div", { class: "muted" }, l.code, " · ", l.locationTypeName),
      l.active && l.address && h("div", { class: "muted" }, l.address),
    ),
    edit,
  );
}
```

CSS bố cục ngang: thêm vào `public/app.css` (khối cạnh `.card-list` ở Task 1) — nhưng Task 1 đã xong và qua kiểm, KHÔNG mở lại Task 1; thêm ở ĐÂY, trong Task 4:

```css
.card-list > .card { display: flex; align-items: center; gap: var(--s3); }
```

*Lưu ý:* quy tắc này áp dụng cho MỌI `.card-list > .card` (cả 5 trang), vì 3/5 trang (Địa điểm, Hồ sơ) cần bố cục ngang, còn 2/5 (Nhân viên, Dịch vụ) và Nhật ký dùng bố cục dọc mặc định của `.card` gốc (không có `display:flex` nằm ngang). Việc `display:flex` này chỉ ảnh hưởng bên trong `.card-list` (selector có `.card-list >` ở đầu), KHÔNG ảnh hưởng `.card` dùng ở nơi khác trong app — nhưng nó SẼ áp dụng cho card ở CẢ 5 trang batch này một khi Task 5/6 cũng đặt trong `.card-list`. Nếu Nhân viên/Dịch vụ (Task 2/3, đã xong) bị vỡ bố cục do quy tắc ngang này, thêm class phụ `.card-list > .card.card-col { flex-direction: column; align-items: stretch; }` và gắn `class="card card-col"` cho card của 2 trang đó — TỰ QUYẾT khi thấy vỡ bố cục thật (đây là chi tiết trình bày, không cần hỏi lại).

- [ ] **Step 2: Nối vào `load()`**

Trong `public/locations.html`, thêm sau `</section>` bọc bảng: `<div id="list-cards" class="card-list"></div>`.

Trong `web/locations.ts`, thêm `const listCardsEl = byId("list-cards");`, sửa cuối `load()`:

```ts
async function load(): Promise<void> {
  const r = await act(() => api<Api.LocationListResponse>("/api/locations"));
  if (!r) return;
  types = r.types;
  current = r.locations;
  replaceChildren(byId("add-type"), ...typeOptions());
  replaceChildren(listEl, ...r.locations.map(row));
  replaceChildren(listCardsEl, ...r.locations.map(card));
}
```

- [ ] **Step 3: Build + kiểm kiểu**

Run: `npm run build:web && npm run typecheck`
Expected: 0 lỗi. Nếu Task 2/3 (Nhân viên/Dịch vụ) đã commit trước Task 4 và bố cục của chúng bị quy tắc `display:flex` ở Step 1 làm hỏng, xử lý theo hướng dẫn "Lưu ý" ở Step 1 rồi build lại.

- [ ] **Step 4: Commit**

```bash
git add public/locations.html web/locations.ts public/app.css
git commit -m "Bước 2 Đợt A: restyle trang Địa điểm — thêm khung thẻ điện thoại (bố cục ngang)"
```

## Task 5: Restyle trang Hồ sơ (`/parties`)

**Files:**
- Modify: `web/parties.ts`, `public/parties.html`

**Interfaces:**
- Consumes: `.card-list`, `.card-list > .card` (Task 1+4); `initials` (`./format`, CHƯA import ở tệp này — thêm mới).

- [ ] **Step 1: Thêm hàm `card()` (có avatar chữ viết tắt + icon mũi tên, KHÔNG có nút — cả thẻ bấm được)**

Thêm import `initials` vào đầu `web/parties.ts` (sửa dòng import `./format` nếu tệp hiện chưa import gì từ đó — theo recon, `parties.ts` KHÔNG import `format.ts`, cần thêm dòng mới):

```ts
import { initials } from "./format";
```

Thêm hàm sau, gần hàm dựng `row` trong khối "Danh sách + tìm kiếm":

```ts
function card(p: Api.PartySummaryDto): HTMLElement {
  const el = h(
    "div",
    { class: "card", style: "cursor:pointer" },
    h("div", { style: "width:40px;height:40px;border-radius:var(--radius-pill);background:var(--c-primary-soft);color:var(--c-primary);display:flex;align-items:center;justify-content:center;font-weight:800;flex:none" }, initials(p.displayName)),
    h(
      "div",
      { style: "flex:1" },
      h("div", null, p.displayName, !p.active && h("span", { class: "badge badge-cancelled" }, " Ngưng")),
      h("div", { class: "muted" }, p.primaryPhone ?? "—", " · ", p.roleCodes.map(roleLabel).join(", ") || "—"),
    ),
    icon("next", 20),
  );
  el.addEventListener("click", () => void openDetail(p.id));
  return el;
}
```

*Kiểm trước khi dùng:* `icon("next", ...)` cần import `icon` từ `./icons` — xác nhận `web/parties.ts` đã import chưa (theo recon: CHƯA). Thêm dòng `import { icon } from "./icons";` đầu tệp. Kiểu `Api.PartySummaryDto` — xác nhận đúng tên kiểu thật trong `src/shared/contracts.ts` (recon chỉ thấy dùng `p.displayName/p.active/p.primaryPhone/p.roleCodes` qua biến `p` trong `r.parties.map(...)`, chưa xác nhận TÊN kiểu — chạy `grep -n "PartySummary\|parties:" src/shared/contracts.ts` để lấy đúng tên, sửa lại nếu khác).

- [ ] **Step 2: Nối vào `search()`**

Trong `public/parties.html`, thêm sau `</section>` bọc bảng (trước dòng `<p id="empty"...`, hoặc ngay sau nó — đặt cạnh nhau, cùng bên trong `<section class="card table-wrap">` hay ngoài đều được miễn cùng cấp với bảng): `<div id="list-cards" class="card-list"></div>`.

Trong `web/parties.ts`, thêm `const listCardsEl = byId("list-cards");`, sửa hàm `search()` (đoạn dựng `rows`):

```ts
async function search(reset = true): Promise<void> {
  if (reset) offset = 0;
  const r = await act(() => api<Api.PartyListResponse>(`/api/parties?${queryString({ offset: String(offset) })}`));
  if (!r) return;
  const rows = r.parties.map((p) => {
    const tr = h("tr", { class: p.active ? "" : "row-off", style: "cursor:pointer" }, h("td", null, p.displayName, !p.active && h("span", { class: "badge badge-cancelled" }, "Ngưng")), h("td", null, KIND_LABEL[p.kind]), h("td", null, p.primaryPhone ?? ""), h("td", null, p.roleCodes.map(roleLabel).join(", ")));
    tr.addEventListener("click", () => void openDetail(p.id));
    return tr;
  });
  if (reset) {
    replaceChildren(listEl, ...rows);
    replaceChildren(listCardsEl, ...r.parties.map(card));
  } else {
    listEl.append(...rows);
    listCardsEl.append(...r.parties.map(card));
  }
  byId("empty").hidden = listEl.children.length > 0;
  byId("more").hidden = !r.hasMore;
  offset += r.parties.length;
}
```

- [ ] **Step 3: Build + kiểm kiểu**

Run: `npm run build:web && npm run typecheck`
Expected: 0 lỗi.

- [ ] **Step 4: Commit**

```bash
git add public/parties.html web/parties.ts
git commit -m "Bước 2 Đợt A: restyle trang Hồ sơ — thêm khung thẻ điện thoại (avatar + điều hướng)"
```

## Task 6: Restyle trang Nhật ký (`/audit`)

**Files:**
- Modify: `web/audit.ts`, `public/audit.html`

**Interfaces:**
- Consumes: `.card-list` (Task 1); `dateTime`, `actionLabel` (đã import).

Mockup nhóm thẻ THEO NGÀY (khác 4 trang kia — không có nút, giờ+tên cùng hàng, có link mã đơn). Đây là bố cục PHỨC TẠP HƠN "một hàm card() độc lập" vì cần NHÓM theo ngày trước khi dựng — viết một hàm riêng thay vì tái dùng mẫu `card()` của các Task trên.

- [ ] **Step 1: Thêm hàm nhóm-theo-ngày + dựng thẻ**

Thêm vào `web/audit.ts`, sau hàm `row()`:

```ts
/** "2026-09-21T08:05:00.000Z" → "21/09/2026" (giờ Việt Nam) — dùng làm khoá nhóm theo ngày. */
function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
}

function auditCard(e: AuditRecord): HTMLElement {
  const time = new Date(e.at).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
  return h(
    "div",
    { class: "card" },
    h("div", { style: "display:flex;justify-content:space-between", class: "muted" }, h("span", null, time), h("span", null, e.staffName)),
    h("div", null, h("strong", null, actionLabel(e.action))),
    h("div", null, e.orderId ? h("a", { href: `/order?id=${encodeURIComponent(e.orderId)}` }, e.targetLabel) : e.targetLabel, e.detail && h("span", { class: "muted" }, " · ", e.detail)),
  );
}

/** Dựng danh sách thẻ nhóm theo ngày: một dòng tiêu đề ngày rồi các thẻ của ngày đó, giữ nguyên thứ tự `entries` (đã sắp mới→cũ từ máy chủ). */
function cardGroups(entries: readonly AuditRecord[]): HTMLElement[] {
  const out: HTMLElement[] = [];
  let lastDay = "";
  for (const e of entries) {
    const day = dayLabel(e.at);
    if (day !== lastDay) {
      out.push(h("div", { class: "muted", style: "font-weight:600;margin-top:var(--s3)" }, day));
      lastDay = day;
    }
    out.push(auditCard(e));
  }
  return out;
}
```

- [ ] **Step 2: Nối vào `load()`**

Trong `public/audit.html`, thêm sau đóng `</div>` bọc bảng (tệp này dùng `<div class="card table-wrap">`, không phải `<section>` — xác nhận đúng thẻ đóng khi sửa): `<div id="list-cards" class="card-list"></div>`.

Trong `web/audit.ts`, thêm `const listCardsEl = byId("list-cards");`, sửa hàm `load()`:

```ts
async function load(reset: boolean): Promise<void> {
  const seq = ++loadSeq;
  if (reset) offset = 0;
  showError(errorEl, null);
  const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
  if (qInput.value.trim()) params.set("q", qInput.value.trim());
  if (actionSel.value) params.set("action", actionSel.value);
  try {
    const { entries, hasMore } = await api<Api.AuditListResponse>(`/api/audit?${params}`);
    if (seq !== loadSeq) return;
    const rows = entries.map(row);
    if (reset) {
      replaceChildren(listEl, ...rows);
      replaceChildren(listCardsEl, ...cardGroups(entries));
    } else {
      listEl.append(...rows);
      // Tải thêm: nhóm-theo-ngày phải tính lại từ TOÀN BỘ bản ghi đang có, không chỉ trang mới (để không lặp tiêu đề ngày cuối trang cũ).
      listCardsEl.append(...cardGroups(entries));
    }
    offset += entries.length;
    moreBtn.hidden = !hasMore;
    emptyEl.hidden = offset > 0;
  } catch (err) {
    if (seq === loadSeq) showError(errorEl, err instanceof ApiError ? err.message : "Không tải được nhật ký.");
  }
}
```

*Cảnh báo tự ghi nhận trong code:* nhánh "Tải thêm" (`reset=false`) gọi `cardGroups(entries)` chỉ với TRANG MỚI — nếu bản ghi đầu trang mới CÙNG NGÀY với bản ghi cuối trang cũ, sẽ hiện HAI tiêu đề ngày trùng nhau liền kề. Đây là lỗi biết trước, chấp nhận được cho Đợt A (tương tự cách `web/orders.ts` "Tải thêm" không gộp lại nhóm cũ) — nếu muốn sửa triệt để cần giữ biến `lastRenderedDay` cấp module, ghi chú lại trong report nhưng KHÔNG bắt buộc sửa ở Task này.

- [ ] **Step 3: Build + kiểm kiểu**

Run: `npm run build:web && npm run typecheck`
Expected: 0 lỗi.

- [ ] **Step 4: Commit**

```bash
git add public/audit.html web/audit.ts
git commit -m "Bước 2 Đợt A: restyle trang Nhật ký — thêm khung thẻ nhóm theo ngày"
```

## Task 7: Viết kịch bản Chrome cho 5 trang + kiểm bằng mắt

**Files:**
- Create: `docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs`

`web/CLAUDE.md` KHÔNG có dòng nào cho 5 tệp vừa sửa — đây là kịch bản MỚI, theo đúng công thức "o. Thêm kịch bản e2e / Chrome" ở `docs/CHANGE-GUIDE.md`.

- [ ] **Step 1: Tạo kịch bản, sao chép khuôn từ `a2-smoke-order.mjs`**

Đọc `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-order.mjs` (toàn bộ) để lấy đúng khuôn `startEnv()`, `ACCOUNTS`, cách mở trang, cách chụp ảnh. Viết `docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs` theo ĐÚNG khuôn đó (import từ `../../2026-09-20-a2/kich-ban/a2-cdp.mjs`, không viết lại cơ chế CDP), kiểm cho MỖI trong 5 trang, cả hai khổ máy tính (1040×800) và điện thoại (390×844):
1. Đăng nhập ADMIN, mở lần lượt `/staff`, `/catalog`, `/locations`, `/parties`, `/audit`.
2. Ở khổ 1040: `table.items` HIỂN THỊ, `.card-list` ẨN (`display:none` qua `getComputedStyle`).
3. Ở khổ 390: `table.items` ẨN, `.card-list` HIỂN THỊ, có ít nhất 1 phần tử `.card` con.
4. Chụp ảnh mỗi trang × mỗi khổ (10 ảnh) vào `<OUT>/anh/`.
5. Chạy `axe-core` trên khổ 390 mỗi trang (đúng khuôn các kịch bản khác), không có vi phạm mức nghiêm trọng mới so với trước khi restyle (kịch bản không có "trước" để so — chỉ cần không có vi phạm mức `critical`/`serious`).

- [ ] **Step 2: Chạy kịch bản**

Run: `npm run build:web && AXE_JS=<đường dẫn axe.min.js> CHROME_BIN=<đường dẫn chrome-wrap.sh> node docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs`
Expected: mọi bước ✓, thoát mã 0. Sửa lại CSS/DOM của Task 1-6 nếu có bước ✗ do bố cục thật vỡ (không sửa kịch bản để "cho qua").

- [ ] **Step 3: `npm test && npm run typecheck && npm run test:e2e -- pwa`**

Expected: xanh hết (đảm bảo 6 việc trước không làm hỏng gì khác).

- [ ] **Step 4: Commit**

```bash
git add docs/evidence/2026-09-22-buoc-2-dot-a/
git commit -m "Bước 2 Đợt A: thêm kịch bản Chrome kiểm 5 trang bảng→thẻ"
```

---

## Sau khi Task 7 xong (bắt buộc theo CLAUDE.md §3)

Việc lớn (đụng giao diện 5 trang + tạo cơ chế dùng chung mới). Dispatch subagent kiểm độc lập chỉ-đọc trước khi báo "đạt". Sau đó, một lượt kiểm TOÀN NHÁNH của riêng Đợt A này (không phải lặp lại toàn Bước 1) trước khi sang Đợt B (Lập đơn + Chi tiết đơn).
