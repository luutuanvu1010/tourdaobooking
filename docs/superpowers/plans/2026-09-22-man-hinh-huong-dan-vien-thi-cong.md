# Màn hình "Việc của tôi" cho hướng dẫn viên (FIELD) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tài khoản chỉ giữ quyền FIELD, sau khi đăng nhập, xem được danh sách đơn mình đang phụ trách (tên/SĐT khách, điểm đón, giờ, số khách hiện tại) và gọi được hai route đã có (`handler-money-edit`, `handler-cancel`) ngay từ giao diện — không cần công cụ kỹ thuật. Đây là mảnh còn thiếu khiến tính năng ADR-0014 điều 6/11 (đã lên production) chưa dùng được qua app.

**Bối cảnh — vì sao chọn cách này:** `web/shell.ts:15,18-33` đã CHỦ Ý chỉ cho tài khoản chỉ-FIELD một tab duy nhất — "Tôi" (`/account`), với chú thích sẵn trong mã: "việc được giao thuộc N2". Trang `/account` (`public/account.html`, `web/account.ts`) đã tồn tại (hồ sơ, đổi PIN, bảo trì). Quyết định: **thêm một khối MỚI vào ĐẦU trang `/account` hiện có** (không tạo trang mới) — vì (a) đây đúng là nơi FIELD đã có thể tới được hôm nay (chỉ cần bấm tab "Tôi"), (b) không cần đăng ký `PAGES`/`build:web` mới, không cần đổi luồng điều hướng, giảm rủi ro; **KHÔNG đổi trang mặc định sau đăng nhập** (vẫn về `/`, hiện lỗi "không dùng được màn hình đơn" rồi FIELD tự bấm tab "Tôi" — chấp nhận một thao tác thừa, tránh đụng `web/login.ts`, tệp nhiều bẫy nhất trong `web/` theo `web/CLAUDE.md`). Đây là quyết định bề mặt, đảo ngược được (CLAUDE.md §3 P8) — ghi lại, không hỏi lại.

**Phạm vi cố ý thu hẹp (giống các đợt trước, không lặp lại lỗi "chưa hỏi rõ"):**
- Chỉ đơn **đã xác nhận** (đơn duy nhất FIELD thao tác được qua hai route đã có).
- Chỉ dịch vụ **từ danh mục** hiện sửa được số khách (đúng phạm vi route `handler-money-edit`); dịch vụ nhập tay hiện CHỈ ĐỌC (tên, số khách, thông tin chuyến) — không có ô sửa.
- KHÔNG hiện giá/tổng tiền ở bất kỳ đâu trên khối này (đúng ADR-0007 điều 3).
- KHÔNG sửa trang mặc định sau đăng nhập, không thêm trang mới, không đổi `web/login.ts`.
- Sắp xếp danh sách theo `created_at` (khuôn có sẵn) — CHƯA sắp theo ngày khởi hành gần nhất (có thể làm sau, không phải yêu cầu tối thiểu).

## Global Constraints

- Ngôn ngữ: tiếng Việt có dấu, không lộ mã lỗi thô.
- Không `innerHTML` — dựng DOM bằng `h()` (`web/dom.ts`).
- Không lộ giá/tổng tiền cho FIELD ở bất kỳ đâu (API lẫn giao diện).
- `web/` import `src/shared` không đuôi, không import `src/modules/`.
- Route mới ở module `dispatch` (đúng ranh giới: dispatch sở hữu "ai đang phụ trách gì"); dispatch → orders là chiều được phép (đã dùng ở `cancelOrderByHandler`/`editMoneyAsHandler`).
- TDD: mỗi hành vi mới viết test đỏ trước, xanh sau; mỗi task một commit.
- Việc lớn (route mới lộ tên/SĐT khách — dữ liệu cá nhân, + quyền): sau khi xong TOÀN BỘ kế hoạch, bắt buộc một subagent kiểm độc lập trước khi báo "đạt".
- Sửa `web/account.ts`/`public/account.html`: chạy lại kịch bản Chrome liên quan tới trang Tôi (không có kịch bản riêng — dùng `v1-bao-tri.mjs`, cùng khung, theo bảng `web/CLAUDE.md`) VÀ tự thử tay bằng Chrome (mcp__claude-in-chrome) vì phần mới (khối "việc của tôi") chưa có kịch bản nào phủ.

---

## Task 1: Đọc dữ liệu — `orders/index.ts` xuất `getMyAssignments`

**Files:**
- Modify: `src/shared/contracts.ts` (thêm `MyAssignmentDto`, `MyAssignmentServiceDto`, `MyAssignmentsResponse`)
- Modify: `src/modules/orders/index.ts` (thêm hàm xuất `getMyAssignments`)

**Interfaces:**
- Produces: `getMyAssignments(db: D1Database, orderIds: readonly string[]): Promise<MyAssignmentDto[]>` — chỉ đơn `status === "confirmed"`, chỉ các trường: `orderId, orderCode, customerName, customerPhone, services[]`; mỗi dịch vụ: `id, name, catalogCode, pax, editablePaxCodes` (rỗng nếu nhập tay), cộng `TripInfoDto` (departDate…note). KHÔNG có trường tiền nào.

- [ ] **Step 1: Thêm kiểu vào `contracts.ts`** (sau `HandlerMoneyEditResponse`, hoặc cạnh `OrderServiceDto`):

```ts
export interface MyAssignmentServiceDto extends TripInfoDto {
  id: string;
  name: string;
  /** null = nhập tay — CHỈ ĐỌC ở màn "việc của tôi" (route handler-money-edit chỉ nhận dịch vụ từ danh mục). */
  catalogCode: string | null;
  pax: PaxCounts;
  /** Loại khách sửa được cho dịch vụ này (rỗng nếu nhập tay hoặc thiếu giá đã chụp) — KHÔNG lộ giá, chỉ nói được sửa loại nào. */
  editablePaxCodes: PaxCode[];
}
export interface MyAssignmentDto {
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  services: MyAssignmentServiceDto[];
}
export interface MyAssignmentsResponse { assignments: MyAssignmentDto[] }
```

Thêm `PaxCode` vào import từ `./order-lines` ở đầu `contracts.ts` nếu chưa có (kiểm bằng `grep -n "PaxCode" src/shared/contracts.ts` trước khi sửa).

- [ ] **Step 2: Cài đặt `getMyAssignments`** — thêm vào `src/modules/orders/index.ts`, sau `editMoneyAsHandler`:

```ts
/**
 * Dữ liệu cho màn "việc của tôi" của FIELD (`GET /api/dispatch/mine`, module dispatch) — tái dùng `loadOrderView` (đã có overlay điều chỉnh,
 * ADR-0014 điều 6) rồi LỌC BỎ mọi trường tiền trước khi trả ra, đúng ADR-0007 điều 3 ("không tiền, không bảng giá" cho FIELD). `orderIds` do
 * `dispatch` truyền vào (đơn mà staff gọi đang là người phụ trách — dispatch tự tra, orders không biết khái niệm "người phụ trách").
 */
export async function getMyAssignments(db: D1Database, orderIds: readonly string[]): Promise<MyAssignmentDto[]> {
  const views = await Promise.all(orderIds.map((id) => loadOrderView(db, id)));
  return views
    .filter((o): o is OrderDetailDto => o !== null && o.status === "confirmed")
    .map((o) => ({
      orderId: o.id,
      orderCode: o.orderCode,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      services: o.services.map((s) => ({
        id: s.id,
        name: s.name,
        catalogCode: s.catalogCode,
        pax: s.pax,
        editablePaxCodes: s.catalogCode === null ? [] : [...new Set(s.items.flatMap((i) => (i.paxCode ? [i.paxCode] : [])))],
        departDate: s.departDate, departTime: s.departTime, pickupTime: s.pickupTime, pickupPlace: s.pickupPlace,
        checkinDate: s.checkinDate, checkinTime: s.checkinTime, checkinPlace: s.checkinPlace, note: s.note,
      })),
    }));
}
```

Thêm `type MyAssignmentDto` vào import `type { ... } from "../../shared/contracts"` đầu tệp.

- [ ] **Step 2b: Test — xác nhận KHÔNG lộ trường tiền nào (kiểm bằng máy, không chỉ đọc mắt)**

Thêm test mới `src/modules/orders/money-adjustment.test.ts` KHÔNG đúng chỗ (hàm này ở `orders/index.ts`, không có test file riêng theo quy ước dự án — I/O). Thay vào đó, kiểm bằng TypeScript: `MyAssignmentServiceDto`/`MyAssignmentDto` được định nghĩa TƯỜNG MINH (không `Pick<OrderDto,...>` lỡ kéo theo trường tiền nếu `OrderDto` đổi sau này) — tự đọc lại đúng đã viết ở Step 1 (không dùng `Pick`/`Omit` từ `OrderDto`/`OrderServiceDto`/`OrderItemDto`, viết type ĐỘC LẬP) để chắc chắn không có đường nào vô tình lộ giá qua một lần đổi kiểu dữ liệu sau này ở nơi khác. Xác nhận sẽ kiểm lại bằng e2e ở Task 3 (gọi API thật, so `Object.keys` của phản hồi).

- [ ] **Step 3: `npm run typecheck`**

- [ ] **Step 4: Commit**

```bash
git add src/shared/contracts.ts src/modules/orders/index.ts
git commit -m "$(cat <<'EOF'
Dữ liệu cho màn "việc của tôi" của FIELD: getMyAssignments

Tái dùng loadOrderView (đã có overlay dòng điều chỉnh) rồi lọc bỏ mọi
trường tiền — kiểu MyAssignmentDto viết độc lập, không Pick từ OrderDto,
để không vô tình lộ giá qua một lần đổi kiểu dữ liệu sau này.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Route `GET /api/dispatch/mine`

**Files:**
- Modify: `src/modules/dispatch/repository.ts` (thêm `findHandledOrderIds`)
- Modify: `src/modules/dispatch/index.ts` (route mới)

**Interfaces:**
- Consumes: `getMyAssignments` (Task 1, từ `../orders`).
- Produces: route `GET /api/dispatch/mine`, access `"staff"` — trả đơn mà CHÍNH staff gọi đang phụ trách, không cần tham số.

- [ ] **Step 1: Thêm `findHandledOrderIds`** — `src/modules/dispatch/repository.ts`, cạnh `IS_HANDLER`:

```ts
const HANDLED_ORDER_IDS = defineSql("dispatch", "handled_order_ids", "SELECT order_id FROM v_dsp_order_handler WHERE staff_id = ?1");

/** Mọi đơn mà `staffId` ĐANG là người phụ trách (HANDLE đang mở) — dùng cho GET /api/dispatch/mine (màn "việc của tôi"). */
export async function findHandledOrderIds(db: D1Database, staffId: string): Promise<string[]> {
  const { results } = await db.prepare(HANDLED_ORDER_IDS).bind(staffId).all<{ order_id: string }>();
  return results.map((r) => r.order_id);
}
```

- [ ] **Step 2: Thêm route** — `src/modules/dispatch/index.ts`, sau route `GET /api/dispatch/assignees` (giữ các route `GET` cạnh nhau):

```ts
// "Việc của tôi": đơn mà CHÍNH staff gọi đang phụ trách — không tham số (staff.id lấy từ phiên đăng nhập). Dùng cho màn hình FIELD ở trang Tôi.
route("GET", "/api/dispatch/mine", "staff", async ({ env, staff }) => {
  const orderIds = await findHandledOrderIds(env.DB, staff.id);
  const assignments = await getMyAssignments(env.DB, orderIds);
  return json({ assignments } satisfies MyAssignmentsResponse);
}),
```

Thêm `findHandledOrderIds` vào import từ `./repository`; `getMyAssignments` vào import từ `../orders` (gộp cùng dòng `cancelOrderByHandler, editMoneyAsHandler, findOrderOwner`); `MyAssignmentsResponse` vào import `type` từ `../../shared/contracts`.

**Không cần `can()`:** route tự khoanh phạm vi bằng chính `staff.id` (không tham số nào từ client chọn được đơn của người khác) — an toàn với MỌI quyền, kể cả SALES/ADMIN gọi (chỉ thấy đúng đơn họ đang phụ trách, vô hại). Access `"staff"` (mọi tài khoản đăng nhập) là đủ.

- [ ] **Step 3: `npm run typecheck`, `npm test`**

- [ ] **Step 4: Commit**

```bash
git add src/modules/dispatch/repository.ts src/modules/dispatch/index.ts
git commit -m "$(cat <<'EOF'
Route GET /api/dispatch/mine — "việc của tôi" (đơn đang phụ trách)

Tự khoanh phạm vi bằng staff.id của phiên đăng nhập, không cần can()
riêng. Dùng cho màn hình FIELD (Task 3).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Kịch bản e2e cho route mới

**Files:**
- Modify: `tests/e2e/dispatch.mjs`

- [ ] **Step 1: Viết kịch bản (đỏ)** — thêm vào cuối mục 14 (dùng lại danh mục giả `ZH1`, TRƯỚC dòng `} finally {`), sau khối SUPER_ADMIN, TRƯỚC khối tranh chấp:

```js
// "Việc của tôi": FIELD chỉ thấy đơn CHÍNH MÌNH đang phụ trách, đã xác nhận, KHÔNG có trường tiền nào.
const mine = async (cookie) => (await call(cookie, "GET", "/api/dispatch/mine")).body.assignments;
const before16 = await mine(FIELD);
assert.ok(!before16.some((x) => x.orderId === o16.id), "chưa gán FIELD thì chưa thấy o16"); // o16 sẽ tạo ở phần huỷ dưới — nếu chạy trước, bỏ dòng này
const mineList = await mine(FIELD);
assert.ok(mineList.some((x) => x.orderId === o14.id), "FIELD đang phụ trách o14 phải thấy trong danh sách");
const mine14 = mineList.find((x) => x.orderId === o14.id);
assert.deepEqual(Object.keys(mine14).sort(), ["customerName", "customerPhone", "orderCode", "orderId", "services"]);
assert.deepEqual(
  Object.keys(mine14.services[0]).sort(),
  ["catalogCode", "checkinDate", "checkinPlace", "checkinTime", "departDate", "departTime", "editablePaxCodes", "id", "name", "note", "pax", "pickupPlace", "pickupTime"].sort(),
);
assert.doesNotMatch(JSON.stringify(mine14), /subtotal|total|price|amount/i, "tuyệt đối không lộ trường tiền nào");
assert.deepEqual(mine14.services[0].editablePaxCodes.sort(), ["adult"]);
assert.equal((await mine(A)).some((x) => x.orderId === o14.id), false, "SALES không phải người phụ trách o14 (đã đổi FIELD từ đầu mục 14) không thấy trong DANH SÁCH CỦA HỌ");
assert.equal((await mine(ACC)).length >= 0, true); // kế toán gọi được (access "staff"), chỉ không có đơn nào của họ — không lỗi
console.log("✓ GET /api/dispatch/mine: chỉ đơn CHÍNH MÌNH đang phụ trách, đã xác nhận, không có trường tiền nào");
```

**Lưu ý khi cài đặt thật:** đọc lại thứ tự các đoạn đã có trong mục 14 (o14, o15, o16 tạo ở thời điểm nào, FIELD đổi người phụ trách bao nhiêu lần) trước khi chèn — đặt đoạn này SAU khi o14 đã chắc chắn còn gán cho FIELD (trước đoạn tranh chấp cuối, đoạn đó đổi pax liên tục nhưng không đổi người phụ trách nên không ảnh hưởng). Dòng kiểm `before16`/`o16` chỉ hợp lệ nếu đặt SAU đoạn tạo `o16` (đơn có điều chỉnh rồi bị huỷ) — nếu đặt TRƯỚC, bỏ hẳn hai dòng liên quan `o16` (test đơn giản hơn cũng được, không bắt buộc).

- [ ] **Step 2: Chạy `npm run test:e2e -- dispatch`, sửa tới khi xanh**

- [ ] **Step 3: `npm test && npm run typecheck && npm run test:e2e` (đầy đủ)**

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/dispatch.mjs
git commit -m "$(cat <<'EOF'
Kịch bản e2e cho GET /api/dispatch/mine

Xác nhận chỉ thấy đơn chính mình đang phụ trách, đã xác nhận, và tuyệt
đối không có trường tiền nào trong phản hồi.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Giao diện — khối "Việc của tôi" ở trang `/account`

**Files:**
- Modify: `public/account.html` (thêm `<section id="myjobs">`)
- Modify: `web/account.ts` (dựng khối, gọi API, sửa số khách, huỷ đơn)
- Modify: `public/app.css` (nếu cần token/class mới — ưu tiên dùng lại `card`, `alert`, `btn`, `badge`, `counter` đã có)

**Interfaces:**
- Consumes: `GET /api/dispatch/mine` (Task 2/3); `POST /api/orders/:id/handler-money-edit`, `POST /api/orders/:id/handler-cancel` (đã có, Phase B phần trước); `counter()` (`web/counter.ts`, đã có).

- [ ] **Step 1: Thêm chỗ trong `public/account.html`** — ngay sau `<section id="me">`:

```html
  <section id="myjobs" hidden></section>
```

(Không đặt sẵn `class="card"` — mỗi đơn tự là một `card` riêng, khối cha chỉ là container.)

- [ ] **Step 2: Cài đặt trong `web/account.ts`** — thêm sau khối `replaceChildren(byId("links"), ...)` hiện có (không đổi phần đã có):

```ts
import { PAX_LABEL, type PaxCode } from "../src/shared/order-lines";
import { counter } from "./counter";
```

(gộp vào các import đã có ở đầu tệp — `PERMISSION_LABEL, hasPermission, isOffice` đã import từ `../src/shared/permissions`, thêm dòng mới riêng cho `order-lines` và `./counter`.)

Thêm khối mới ở cuối tệp (sau `void initMaintenance();`):

```ts
// ---- Việc của tôi (FIELD đang phụ trách — ADR-0014 điều 6/11) ----------------------------------------------------
const CANCEL_REASONS: { code: string; label: string }[] = [
  { code: "not_reachable", label: "Không liên hệ được với khách" },
  { code: "customer_requested", label: "Khách yêu cầu huỷ" },
];

function serviceCard(orderId: string, s: Api.MyAssignmentServiceDto, onSaved: () => void): HTMLElement {
  const trip = [s.departDate, s.departTime].filter(Boolean).join(" ");
  const pickup = [s.pickupTime, s.pickupPlace].filter(Boolean).join(" — ");
  const editable = s.editablePaxCodes.length > 0;
  const draft = new Map<PaxCode, number>(s.editablePaxCodes.map((c) => [c, s.pax[c]]));
  const counters = s.editablePaxCodes.map((code) =>
    counter({ label: PAX_LABEL[code], value: s.pax[code], onChange: (n) => draft.set(code, n) }),
  );
  const reasonInput = h("input", { type: "text", placeholder: "Lý do sửa (bắt buộc)", maxlength: 300 });
  const errorBox = h("div", { class: "alert", role: "alert", hidden: true });
  const saveBtn = h("button", { class: "btn btn-primary", type: "button" }, "Lưu số khách mới");
  saveBtn.addEventListener("click", async () => {
    showError(errorBox, null);
    const reason = reasonInput.value.trim();
    if (!reason) return showError(errorBox, "Cần nhập lý do sửa.");
    saveBtn.disabled = true;
    try {
      await api(`/api/orders/${orderId}/handler-money-edit`, {
        method: "POST",
        body: { reason, services: [{ id: s.id, pax: { adult: 0, child: 0, senior: 0, infant: 0, ...Object.fromEntries(draft) } }] },
      });
      onSaved();
    } catch (err) {
      showError(errorBox, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
      saveBtn.disabled = false;
    }
  });
  return h(
    "div",
    { class: "myjob-service" },
    h("div", { class: "myjob-service-name" }, s.name, !editable && h("span", { class: "muted" }, " (nhập tay — không sửa được ở đây)")),
    trip && h("div", { class: "muted" }, `Khởi hành: ${trip}`),
    pickup && h("div", { class: "muted" }, `Đón: ${pickup}`),
    s.note && h("div", { class: "muted" }, s.note),
    editable && h("div", { class: "myjob-counters" }, ...counters.map((c) => c.root)),
    editable && reasonInput,
    editable && errorBox,
    editable && saveBtn,
  );
}

function assignmentCard(a: Api.MyAssignmentDto, onChanged: () => void): HTMLElement {
  const cancelBox = h("div", { hidden: true });
  const cancelBtn = h("button", { class: "btn btn-danger", type: "button" }, "Huỷ đơn này");
  cancelBtn.addEventListener("click", () => {
    cancelBtn.hidden = true;
    const errorBox = h("div", { class: "alert", role: "alert", hidden: true });
    const doCancel = async (reasonCode: string) => {
      showError(errorBox, null);
      try {
        await api(`/api/orders/${a.orderId}/handler-cancel`, { method: "POST", body: { reason: reasonCode } });
        onChanged();
      } catch (err) {
        showError(errorBox, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
      }
    };
    replaceChildren(
      cancelBox,
      h("p", null, "Chọn lý do huỷ:"),
      ...CANCEL_REASONS.map((r) => {
        const b = h("button", { class: "btn", type: "button" }, r.label);
        b.addEventListener("click", () => void doCancel(r.code));
        return b;
      }),
      errorBox,
    );
    cancelBox.hidden = false;
  });
  return h(
    "section",
    { class: "card myjob-card" },
    h("h3", null, a.customerName, h("span", { class: "muted" }, ` · ${a.customerPhone}`)),
    h("div", { class: "muted" }, `Mã đơn: ${a.orderCode}`),
    ...a.services.map((s) => serviceCard(a.orderId, s, onChanged)),
    cancelBtn,
    cancelBox,
  );
}

async function initMyAssignments(): Promise<void> {
  if (!hasPermission(staff, "FIELD")) return;
  const el = byId("myjobs");
  const load = async () => {
    try {
      const { assignments } = await api<Api.MyAssignmentsResponse>("/api/dispatch/mine");
      if (assignments.length === 0) {
        replaceChildren(el, h("p", { class: "muted" }, "Bạn chưa được giao phụ trách đơn nào."));
      } else {
        replaceChildren(el, h("h2", null, "Việc của tôi"), ...assignments.map((a) => assignmentCard(a, load)));
      }
      el.hidden = false;
    } catch {
      // lỗi mạng: khối ẩn, không ảnh hưởng phần còn lại trang (cùng khuôn initMaintenance)
    }
  };
  await load();
}
void initMyAssignments();
```

**Chú ý khi cài đặt thật:** `Object.fromEntries(draft)` chỉ có các khoá trong `editablePaxCodes` — đoạn `{ adult: 0, child: 0, senior: 0, infant: 0, ...Object.fromEntries(draft) }` để LUÔN gửi đủ bốn trường (route `handler-money-edit` đòi `pax` đủ bốn khoá, xem `parseMoneyEditInput`/`isPaxCounts`) trong khi chỉ CÓ THỂ sửa các trường trong `editablePaxCodes` (các trường còn lại giữ nguyên 0 — ĐÚNG vì dịch vụ nếu không có `editablePaxCodes` cho một loại khách thì gốc cũng phải là 0 loại đó, do `recomputeService` chỉ chấp nhận loại khách có mặt trong `items` đã lưu — tự kiểm lại bằng test e2e Task 3 hoặc thêm test thủ công một dịch vụ có ĐỦ 4 loại khách trước khi tin chắc dòng này đúng).

- [ ] **Step 3: `npm run build:web`, xác nhận không lỗi**

- [ ] **Step 4: CSS tối thiểu** (nếu `card`/`btn btn-danger`/`muted` chưa đủ bố cục, thêm vào `public/app.css` — đọc trước `docs/superpowers/specs/2026-09-19-a2-giao-dien-design.md` phần token, dùng token có sẵn, KHÔNG viết giá trị cứng trong khối "app iPhone (PWA)"):

```css
.myjob-card h3 { margin: 0 0 var(--s2); }
.myjob-service { padding: var(--s3) 0; border-top: 1px solid var(--c-border); }
.myjob-counters { display: flex; flex-wrap: wrap; gap: var(--s2); margin: var(--s2) 0; }
```

(Tên biến token — đọc lại đầu `public/app.css` để lấy ĐÚNG tên đang dùng, ví dụ `--c-border`/`--border` có thể khác tên thật; đừng đoán, tự `grep -n "border\|^\s*--s" public/app.css` trước khi viết.)

- [ ] **Step 5: Kiểm tay bằng Chrome thật (chưa có kịch bản kịch bản tự động cho khối này)**

Dùng `mcp__claude-in-chrome` (nạp qua ToolSearch nếu chưa có): đăng nhập bằng một tài khoản CHỈ có quyền FIELD (tạo tạm qua `/staff` bằng tài khoản ADMIN nếu môi trường thử không có sẵn, hoặc dùng `npm run dev` + `db:migrate:local` cục bộ — KHÔNG thử trên production). Xác nhận: vào `/account` thấy khối "Việc của tôi"; đơn đang phụ trách hiện đúng tên khách/SĐT/giờ đón; KHÔNG thấy chữ "đồng"/số tiền nào trên toàn trang; sửa số khách một dịch vụ → lưu → số mới hiện lại đúng; huỷ đơn → chọn lý do → đơn biến mất khỏi danh sách (đã huỷ, không còn "đã xác nhận"). Chụp lại bằng chứng (ảnh hoặc mô tả) vào `docs/evidence/` nếu theo đúng khuôn dự án đã dùng cho các đợt trước (kiểm `ls docs/evidence/` xem có thư mục ngày hôm nay chưa, tạo theo đúng khuôn nếu có).

- [ ] **Step 6: Chạy lại kịch bản Chrome chung của trang Tôi** (đổi PIN + bảo trì vẫn còn đúng, không bị khối mới làm hỏng) — `v1-bao-tri.mjs` theo bảng `web/CLAUDE.md` (cần Chrome + axe-core ngoài repo, xem `tests/e2e/README.md`; nếu môi trường không có sẵn, ghi rõ "chưa chạy được, cần chủ dự án tự chạy" thay vì bỏ qua âm thầm).

- [ ] **Step 7: `npm test && npm run typecheck && npm run test:e2e` (đầy đủ)**

- [ ] **Step 8: Commit**

```bash
git add public/account.html web/account.ts public/app.css
git commit -m "$(cat <<'EOF'
Giao diện "Việc của tôi" cho FIELD ở trang /account

Tận dụng trang Tôi đã có (FIELD đã chỉ có đúng tab này — web/shell.ts
đã chừa sẵn chú thích "việc được giao thuộc N2"), không tạo trang mới.
Mỗi đơn một thẻ: tên/SĐT khách, giờ đón, số khách từng dịch vụ (sửa được
qua bộ đếm counter() đã có), nút huỷ đơn kèm lý do đóng. Không hiện giá/
tổng tiền ở bất kỳ đâu.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Kiểm độc lập (bắt buộc — CLAUDE.md §3, việc lớn: route mới lộ dữ liệu cá nhân khách + quyền)

Không phải một commit. Gọi Agent tool (subagent_type mặc định/general-purpose, KHÔNG "fork"), giao nhiệm vụ đọc lại toàn bộ mã của kế hoạch này (5 task), tự chạy `npm test`/`npm run typecheck`/`npm run test:e2e`, và rà đặc biệt:

- `GET /api/dispatch/mine` có thực sự chỉ trả đơn của CHÍNH người gọi không (thử tay: FIELD A gọi, có thấy đơn của FIELD B không).
- Phản hồi của route này và mọi nơi hiển thị trên trang `/account` có TUYỆT ĐỐI không có giá/tổng tiền/đơn giá nào không (đọc kỹ `getMyAssignments`, `MyAssignmentDto`, và `web/account.ts` — không chỉ tin `assert.doesNotMatch` của Task 3, tự đọc bằng mắt).
- `editablePaxCodes` có đúng khớp với dịch vụ nhập tay (rỗng) và dịch vụ từ danh mục (đúng loại khách đã có) không — thử một đơn có dịch vụ nhập tay lẫn dịch vụ danh mục.
- Trang `/account` cho tài khoản KHÔNG có quyền FIELD (SALES/ACCOUNTING/ADMIN thường) — khối "Việc của tôi" có đúng là ẩn hoàn toàn không (đọc `hasPermission(staff, "FIELD")` ở đầu `initMyAssignments`).
- Nút "Huỷ đơn" có chặn đúng gọi hai lần liên tiếp (đơn đã huỷ rồi bấm lại) không gây lỗi khó hiểu cho người dùng không.

Chỉ báo "đạt" với chủ dự án SAU KHI có báo cáo này. Có lỗ thì vá ngay, kiểm độc lập lại đúng chỗ vừa vá.
