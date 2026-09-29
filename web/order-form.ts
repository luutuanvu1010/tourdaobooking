// Form lập/sửa đơn (A2, đặc tả §5.1–5.2): thẻ dịch vụ + thông tin chuyến, tóm tắt tiền, banner lỗi/xung đột.
// Trang chỉ NỐI: luật ở src/shared (service-form, trip-form, order-errors), DOM ở các khối web/ (service-card, catalog-picker, banner).
import { mayPickHandlerOnCreate } from "../src/shared/assignee-pick";
import type { SuKienDon } from "../src/shared/bang-tin";
import type { AssigneeDto, CatalogServiceDto, LegDto } from "../src/shared/contracts";
import { canhBaoChangForm, datGapGiuTrenForm } from "../src/shared/dat-gap-hien-thi";
import type { LyDoDatGap } from "../src/shared/chang-dua-don";
import { NETWORK_BANNER, banner, classifyOrderError, type Banner } from "../src/shared/order-errors";
import { can, holdsPartner } from "../src/shared/permissions";
import {
  canAddService, draftFromDto, draftIssues, newCatalogDraft, newManualDraft, orderIssues, orderSummary, refreshFromCatalog, toServiceInput, totalLines,
  type ServiceDraft,
} from "../src/shared/service-form";
import { MAX_LINES_PER_ORDER, MAX_SERVICES } from "../src/shared/trip-rules";
import { vnToday } from "../src/shared/vn-date";
import { ApiError, api, vuaLamBoiTabNay, type Api, type DepositMethod, type OrderInput } from "./api";
import { openAssigneePicker } from "./assignee-picker";
import { renderBanner } from "./banner";
import { createBookerPicker } from "./booker-picker";
import { createCatalogPicker } from "./catalog-picker";
import { byId, h, replaceChildren } from "./dom";
import { grouped, parseMoney, vnd } from "./format";
import { suKienVeDon } from "./lam-moi-logic";
import { regroupMoney } from "./money-input";
import { createServiceCard, type ServiceCard } from "./service-card";
import { khoiCanhBaoMoc, khoiNhanDatGap } from "./dat-gap-ui";
import { goiSom } from "./goi-som";
import { icon } from "./icons";
import { layKhungNho } from "./khung-nho";
import { initShell, setBarTitle } from "./shell";

const params = new URLSearchParams(location.search);
const editId = params.get("id");
const focusId = params.get("focus");
const today = vnToday(new Date());
const isPhone = window.matchMedia("(max-width: 640px)").matches; // chỉ để mở/thu gọn khối chuyến (accordion ≤ 640px)
/** ≥ 960px: form hai cột, banner lỗi nằm ở cột phải dính (luôn thấy). Dưới 960px (điện thoại VÀ iPad dọc 641–959px) form một cột, banner nằm CUỐI form → lỗi phải cuộn tới banner. Đọc LÚC CẦN: xoay iPad đổi khổ. */
const wide = (): boolean => window.matchMedia("(min-width: 960px)").matches;

const errorEl = byId("error"); // lỗi tải trang / khoá form
const saveErrorEl = byId("save-error"); // lỗi khi lưu, ngay trên nút Lưu (nút dính đáy trên điện thoại)
const formEl = byId<HTMLFormElement>("order-form");
const servicesEl = byId("services");
const emptyEl = byId("services-empty");
const limitEl = byId("services-limit");
const addManualBtn = byId<HTMLButtonElement>("add-manual"); // ẨN trong mọi trường hợp (ADR-0021); giữ phần tử để luồng cũ/kịch bản kiểm không gãy
const orderDateEl = byId<HTMLInputElement>("orderDate");
const saveBtn = byId<HTMLButtonElement>("save");
const field = (id: string) => byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id);
const num = (id: string) => parseMoney(field(id).value);
// Hồ sơ khách (N2 lát 1): tra theo SĐT, dùng hồ sơ có sẵn hoặc tạo mới khi lưu; không chọn = lưu không gắn (ADR-0011).
const bookerPicker = createBookerPicker({ name: field("customerName") as HTMLInputElement, phone: field("customerPhone") as HTMLInputElement });
byId("booker-slot").append(bookerPicker.root);

interface Entry {
  draft: ServiceDraft;
  card: ServiceCard;
  /** ADR-0049 V12: chỗ của nhãn đặt gấp / dải cảnh báo dưới mốc, cuối thẻ dịch vụ (dưới "Thông tin chuyến"). */
  mocEl: HTMLElement;
  /** Dải cảnh báo đang hiện (giữ lại giữa các lần gõ để khung "Đặt gấp" đang mở không mất chữ); null = không cảnh báo. */
  canhBao: { datCau(cau: string): void; root: HTMLElement } | null;
}
const entries: Entry[] = [];
let seq = 0;
let live = new Map<string, CatalogServiceDto>(); // dịch vụ danh mục ĐANG HIỆN và được hỗ trợ, theo mã
let orderUpdatedAt: string | null = null;
let formLocked = false;
let saving = false;

// ---- mốc 6 giờ + đặt gấp (ADR-0049 V12; bản vẽ docs/design/van-chuyen-dieu-phoi/project/07; ruling R-P15) ----
// Mốc đọc từ GET /api/orders/moc-toi-thieu (đơn CHƯA lưu cũng cảnh báo được); chỉ để HIỆN — máy chủ quyết lúc lưu (canhBaoMoc) và lúc xác nhận (409).
// Người có ô order.leg.short_notice (Quản trị, Toàn quyền) có nút "Đặt gấp": "Duyệt đặt gấp" = LƯU NHÁP rồi gọi lệnh đặt gấp cho chặng chiều đi của dịch vụ đó.
let mocPhut: number | null = null;
let duocDatGap = false;
/** Sửa đơn nháp: chặng chiều đi SỚM NHẤT đã lưu của từng dịch vụ (chặng mà ô giờ / nơi đón của thẻ ghi vào — `tronChangCu`) — để biết dấu đặt gấp có giữ không. */
const changCu = new Map<string, LegDto>();

const drafts = () => entries.map((e) => e.draft);
const nameOf = (d: ServiceDraft, i: number) => d.name.trim() || `Dịch vụ ${i + 1}`;

// ---- một ngày cho cả đơn (ADR-0021) ----
// Ô "Chọn ngày" là ô ngày khởi hành DUY NHẤT của form; thẻ dịch vụ không còn ô ngày riêng. Dữ liệu vẫn lưu theo từng dịch vụ
// (không đổi API/bảng) nhưng mọi dịch vụ luôn mang cùng ngày này.
let orderDate = "";
const withOrderDate = <D extends ServiceDraft>(d: D): D => ({ ...d, trip: { ...d.trip, departDate: orderDate } });
orderDateEl.addEventListener("input", () => {
  orderDate = orderDateEl.value;
  for (const en of entries) {
    en.draft = withOrderDate(en.draft);
    en.card.update(en.draft);
  }
  recompute();
});

// ---- ô chọn danh mục và danh sách thẻ ----
const picker = createCatalogPicker({
  onPick: (item) => {
    const entry = mount(withOrderDate(newCatalogDraft(item, `k${++seq}`)));
    entry.card.root.scrollIntoView({ block: "nearest" });
  },
});
byId("catalog-slot").append(picker.root);

// Tài khoản có quyền Đối tác (ADR-0027): đơn giá = giá danh mục, tạm chưa được giảm giá. Máy chủ là nơi chặn; form chỉ khoá ô cho khỏi gõ rồi bị từ chối.
let retailOnly = false;

function mount(d: ServiceDraft, open?: boolean): Entry {
  const entry = { draft: d, mocEl: h("div", { class: "dg-form-slot" }), canhBao: null as Entry["canhBao"] } as Omit<Entry, "card"> as Entry;
  entry.card = createServiceCard({
    draft: d,
    today,
    openTrip: open ?? !isPhone, // ≤ 640px thẻ mới thu gọn khối chuyến (Q2); máy tính mở sẵn
    canAddLine: () => totalLines(drafts()) < MAX_LINES_PER_ORDER,
    retailOnly,
    onChange: (next) => {
      entry.draft = next;
      recompute();
    },
    onRemove: () => unmount(entry),
    onRepick: () => {
      unmount(entry);
      picker.focus();
    },
  });
  entry.card.root.append(entry.mocEl);
  entries.push(entry);
  servicesEl.append(entry.card.root);
  recompute();
  return entry;
}

/** Nhãn đặt gấp (dấu còn giữ khi lưu lại) hoặc dải cảnh báo dưới mốc của một thẻ; không có gì → trống. */
function capNhatMoc(entry: Entry): void {
  const d = entry.draft;
  const cu = d.id ? changCu.get(d.id) : undefined;
  const giu = datGapGiuTrenForm(cu, { departDate: orderDate, pickupTime: d.trip.pickupTime, pickupPlace: d.trip.pickupPlace });
  if (giu && cu?.datGap) {
    entry.canhBao = null;
    replaceChildren(entry.mocEl, khoiNhanDatGap(cu.datGap));
    return;
  }
  const cau = canhBaoChangForm({ ngayDon: orderDate, gioDon: d.trip.pickupTime, datGap: false }, mocPhut, Date.now());
  if (!cau) {
    entry.canhBao = null;
    replaceChildren(entry.mocEl);
    return;
  }
  if (entry.canhBao) entry.canhBao.datCau(cau);
  else {
    entry.canhBao = khoiCanhBaoMoc({ cau, duocDatGap, onDuyet: (than) => luu({ entry, than }) });
    replaceChildren(entry.mocEl, entry.canhBao.root);
  }
}

function unmount(entry: Entry): void {
  entries.splice(entries.indexOf(entry), 1);
  entry.card.root.remove();
  recompute();
}

addManualBtn.addEventListener("click", () => {
  const entry = mount(withOrderDate(newManualDraft(`k${++seq}`)));
  entry.card.root.scrollIntoView({ block: "nearest" });
});

// ---- người phụ trách chọn ngay lúc lập đơn (Task 1.8 phần b ADR-0030; bản thiết kế "Nguoi phu trach - Form lap don", phương án 1b) ----
// Khối nằm CUỐI form, ngay trước vùng nút Lưu (cột phải ≥ 960px, sau "Tóm tắt" ở khổ một cột). Chỉ dựng khi LẬP đơn mới và người lập có `dispatch.assign`
// trên đơn của mình (`mayPickHandlerOnCreate` — đúng câu máy chủ hỏi); sửa đơn thì đổi người ở trang đơn (`web/handler-sheet.ts`). Chọn chỉ lưu vào biến
// dưới đây; máy chủ nhận khi bấm Lưu (`handlerStaffId` trong thân POST — `collect`). Mọi nút trong khối là `type="button"` (khối nằm trong <form>).
const ownerEl = byId("owner-card");
let canPickHandler = false;
let handlerPick: AssigneeDto | null = null;
/** Banner lưu đang hiện là lỗi `invalid_assignee`: đổi/bỏ lựa chọn thì gỡ banner đó (lời báo về người cũ không còn đúng). */
let assigneeErrorShown = false;

function setHandlerPick(picked: AssigneeDto | null): void {
  handlerPick = picked;
  if (assigneeErrorShown) {
    assigneeErrorShown = false;
    renderBanner(saveErrorEl, null);
  }
  renderOwner(true); // nút mở bảng bị dựng lại → đặt focus vào nút mới ("Đổi" / "Chọn người phụ trách"), không để focus rơi ra `body`
}

function renderOwner(focus = false): void {
  const p = handlerPick;
  const head = h(
    "div",
    { class: "owner-head" },
    h("h2", { id: "owner-title", class: "owner-title" }, "Người phụ trách"),
    p === null ? h("span", { class: "chip hdv-chip chip-warn" }, "Chờ nhận") : null,
  );
  let opener: HTMLButtonElement;
  if (p === null) {
    opener = h("button", { type: "button", class: "owner-pick", "data-action": "pick-handler" }, h("span", null, "Chọn người phụ trách"), icon("next", 18));
    replaceChildren(ownerEl, head, h("div", { class: "owner-body" }, h("p", { class: "owner-text" }, "Chưa chọn ai — hướng dẫn viên nào cũng bấm Nhận được."), opener));
  } else {
    opener = h(
      "button",
      { type: "button", class: "owner-current", "data-action": "pick-handler", "aria-label": `Đổi người phụ trách, đang chọn ${p.name}` },
      h("span", { class: "owner-current-text" }, h("span", { class: "owner-name" }, `HDV: ${p.name}`), h("span", { class: "owner-role" }, p.roleLabel)),
      h("span", { class: "owner-change" }, "Đổi"),
    );
    const clear = h("button", { type: "button", class: "owner-clear", "data-action": "clear-handler" }, "Bỏ chọn — để Chờ nhận");
    clear.addEventListener("click", () => setHandlerPick(null));
    replaceChildren(ownerEl, head, h("div", { class: "owner-body" }, opener, clear));
  }
  opener.addEventListener("click", () => openAssigneePicker({ current: handlerPick, onPick: setHandlerPick }, opener));
  if (focus) opener.focus();
}

// ---- tóm tắt tiền và trạng thái nút ----
function recompute(): void {
  const ds = drafts();
  const s = orderSummary(ds, num("discount"), num("depositAmount"));
  byId("sum-subtotal").textContent = vnd(s.subtotal);
  byId("sum-total").textContent = vnd(s.total);
  byId("sum-remaining").textContent = vnd(s.remaining);
  byId("mobile-total").textContent = vnd(s.total); // thanh dính đáy điện thoại: cùng giá trị đã tính ở trên, hiện lại cạnh nút Lưu (Bước 2 Đợt B)
  byId("mobile-due").textContent = vnd(s.remaining);
  const warn = byId("sum-warning");
  warn.textContent = s.warning ?? "";
  warn.hidden = !s.warning;
  emptyEl.hidden = entries.length > 0;
  const full = !canAddService(ds);
  addManualBtn.disabled = full || formLocked;
  picker.setDisabled(formLocked ? "Đơn này đang khoá." : full ? `Đơn đã đủ ${MAX_SERVICES} dịch vụ.` : null);
  limitEl.hidden = !full;
  limitEl.textContent = full ? `Đơn đã đủ ${MAX_SERVICES} dịch vụ — không thêm được nữa.` : "";
  for (const e of entries) e.card.refreshLimits(); // trần 50 dòng tính trên CẢ ĐƠN: nút "+ Thêm dòng" của mọi thẻ nhập tay bật/khoá đúng ngay
  for (const e of entries) capNhatMoc(e);
  const tooMany = ds.some((d) => draftIssues(d).some((i) => i.code === "too_many_guests")); // vượt 50 khách khoá nút Lưu (đặc tả 5.1)
  saveBtn.disabled = formLocked || saving || tooMany;
  saveBtn.textContent = saving ? "Đang lưu…" : editId ? "Lưu thay đổi" : "Lưu, chờ xác nhận";
}

for (const id of ["discount", "depositAmount"]) {
  const el = field(id) as HTMLInputElement;
  el.addEventListener("input", () => {
    regroupMoney(el); // gõ tự nhóm hàng nghìn, giữ con trỏ
    recompute();
  });
}

// ---- kiểm phía trình duyệt (máy chủ vẫn là nơi quyết định) ----
function validate(): { banner: Banner; focus: HTMLElement } | null {
  const lines: string[] = [];
  const focusables: HTMLElement[] = [];
  const need = (id: string, message: string) => {
    if (!field(id).value.trim()) {
      lines.push(message);
      focusables.push(field(id));
    }
  };
  // Cùng thứ tự với form: dịch vụ trước, khách hàng sau, thanh toán cuối.
  if (entries.length === 0) lines.push("Thêm ít nhất một dịch vụ.");
  entries.forEach((e, i) => {
    for (const issue of draftIssues(e.draft)) {
      lines.push(`${nameOf(e.draft, i)}: ${issue.message}`);
      focusables.push(e.card.root);
    }
  });
  lines.push(...orderIssues(drafts()));
  if (new Set(entries.map((e) => e.draft.trip.departDate)).size > 1) {
    lines.push("Các dịch vụ đang khác ngày — chọn một ngày cho cả đơn.");
    focusables.push(orderDateEl);
  }
  need("customerName", "Nhập tên khách.");
  need("customerPhone", "Nhập số điện thoại khách.");
  const s = orderSummary(drafts(), num("discount"), num("depositAmount"));
  if (s.discount > s.subtotal) lines.push("Giảm giá không được vượt quá tạm tính.");
  else if (s.deposit > s.total) lines.push("Thanh toán trước không được vượt quá tổng cộng.");
  if (s.deposit > 0 && !field("depositMethod").value) {
    lines.push("Chọn phương thức thanh toán.");
    focusables.push(field("depositMethod"));
  }
  if (lines.length === 0) return null;
  return { banner: banner("danger", "Chưa lưu được — kiểm tra lại:", { lines: lines.map((text) => ({ text })) }), focus: focusables[0] ?? saveErrorEl };
}

function collect(): OrderInput {
  const method = field("depositMethod").value as DepositMethod | "";
  return {
    customerName: field("customerName").value,
    customerPhone: field("customerPhone").value,
    customerEmail: field("customerEmail").value,
    customerNote: field("customerNote").value,
    services: entries.map((e) => toServiceInput(e.draft)),
    discount: num("discount"),
    depositAmount: num("depositAmount"),
    depositMethod: method || null,
    paymentNote: field("paymentNote").value,
    ...bookerPicker.payload(),
    ...(orderUpdatedAt ? { expectedUpdatedAt: orderUpdatedAt } : {}),
    // Chỉ khi LẬP đơn và đã chọn người: chưa chọn → KHÔNG gửi trường này (đơn "Chờ nhận"), sửa đơn → không bao giờ gửi (PUT không đổi người phụ trách).
    ...(canPickHandler && !editId && handlerPick ? { handlerStaffId: handlerPick.staffId } : {}),
  };
}

// ---- khoá form, banner lỗi ----
function lockForm(b: Banner): void {
  formLocked = true;
  formEl.toggleAttribute("inert", true);
  renderBanner(errorEl, b);
  recompute();
}

function setSaving(value: boolean): void {
  saving = value;
  formEl.toggleAttribute("inert", value); // đang lưu: các ô nhập khoá (đặc tả 10)
  recompute();
}

async function refreshCatalogAfterConflict(): Promise<void> {
  try {
    const res = await api<Api.CatalogPublicResponse>("/api/catalog/for-order"); // ADR-0033: route cho người lập đơn (cả Đối tác, Thực tập)
    setCatalog(res.items);
    for (const en of entries) {
      const d = en.draft;
      if (d.kind !== "catalog") continue;
      const item = live.get(d.code);
      if (!item) continue;
      const next = refreshFromCatalog(d, item); // giá mới cho thẻ đang theo danh mục hiện tại; GIỮ đơn giá đã thương lượng
      if (next !== d) {
        en.draft = next;
        en.card.update(next);
      }
    }
    recompute();
  } catch {
    /* banner "giá danh mục vừa đổi" vẫn hiện; lần Lưu tiếp theo sẽ báo lỗi rõ hơn */
  }
}

async function onSaveError(err: unknown): Promise<void> {
  const failure =
    err instanceof ApiError
      ? classifyOrderError({ status: err.status, code: err.code, message: err.message, details: err.details }, { serviceNames: entries.map((e, i) => nameOf(e.draft, i)), formatMoney: vnd })
      : NETWORK_BANNER;
  if (failure.refreshCatalog) await refreshCatalogAfterConflict();
  if (failure.action === "lock_form") lockForm(failure);
  renderBanner(saveErrorEl, failure, { reloadOrder: () => void loadOrder(), reloadPage: () => location.reload() });
  // 400 `invalid_assignee`: người được chọn vừa nghỉ/mất quyền giữa lúc điền form — máy chủ KHÔNG tạo đơn; form giữ nguyên (kể cả lựa chọn, để người dùng
  // thấy mình đã chọn ai) và banner nói cách sửa. Đổi/bỏ lựa chọn thì banner này tự gỡ (`setHandlerPick`).
  assigneeErrorShown = err instanceof ApiError && err.code === "invalid_assignee";
  const target = failure.focusService === null ? undefined : entries[failure.focusService]?.card.root;
  (wide() ? (target ?? saveErrorEl) : saveErrorEl).scrollIntoView({ block: "center" }); // < 960px: banner (nêu rõ dịch vụ/giá) nằm cuối form nên cuộn tới ĐÓ; ≥ 960px: cuộn tới thẻ (banner ở cột dính, luôn thấy)
}

// Ô tìm danh mục nằm TRONG form: Enter (hoặc phím "Tìm" của bàn phím iPhone) sẽ gửi ngầm cả đơn qua nút "Lưu" mặc định. Chỉ chặn ở ô tìm; các ô văn bản khác giữ hành vi form thường.
formEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target instanceof HTMLInputElement && e.target.type === "search") e.preventDefault();
});

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  void luu();
});

/**
 * Lưu đơn nháp. `datGap` (ADR-0049 R-P15 — nút "Duyệt đặt gấp" của Quản trị trên thẻ): lưu xong gọi lệnh đặt gấp cho chặng chiều đi của đúng dịch vụ đó (thứ tự
 * dịch vụ trong phản hồi = thứ tự thẻ). Lệnh đặt gấp hỏng thì đơn VẪN đã lưu → vẫn chuyển sang trang đơn, kèm `datgap=loi` để trang đơn báo và cho duyệt lại.
 */
async function luu(datGap?: { entry: Entry; than: { lyDo: LyDoDatGap; ghiChu: string | null } }): Promise<void> {
  if (formLocked || saving) return;
  renderBanner(saveErrorEl, null);
  assigneeErrorShown = false;
  for (const en of entries) en.card.showIssues(true);
  const invalid = validate();
  if (invalid) {
    renderBanner(saveErrorEl, invalid.banner);
    if (wide()) {
      invalid.focus.scrollIntoView({ block: "center" }); // ≥ 960px: banner ở cột dính (luôn thấy) → cuộn tới ô/thẻ lỗi đầu tiên và đặt focus vào đó
      invalid.focus.focus({ preventScroll: true });
    } else {
      saveErrorEl.scrollIntoView({ block: "center" }); // < 960px: banner (liệt kê đủ lỗi) nằm cuối form nên phải cuộn tới ĐÓ
    }
    return;
  }
  setSaving(true);
  try {
    const { order } = editId
      ? await api<Api.OrderResponse>(`/api/orders/${encodeURIComponent(editId)}`, { method: "PUT", body: collect() })
      : await api<Api.OrderResponse>("/api/orders", { method: "POST", body: collect() });
    let datGapLoi = "";
    if (datGap) {
      const chang = order.services[entries.indexOf(datGap.entry)]?.legs.filter((l) => l.direction === "OUT").sort((a, b) => `${a.pickupDate} ${a.pickupTime}`.localeCompare(`${b.pickupDate} ${b.pickupTime}`))[0];
      try {
        if (!chang) throw new Error("không thấy chặng");
        await api(`/api/orders/${encodeURIComponent(order.id)}/legs/${encodeURIComponent(chang.id)}/short-notice`, { method: "POST", body: datGap.than });
      } catch {
        datGapLoi = "&datgap=loi";
      }
    }
    // THAY mục lịch sử của form (không thêm): Back/bfcache không đưa người dùng về form đã lưu, nơi bấm Lưu lần hai sẽ POST /api/orders lần hai (đơn trùng).
    // Đơn MỚI kèm `moi=1`: trang đơn tự mở hộp thoại "Xác nhận đơn để gửi khách" (ảnh PNG) một lần rồi bỏ tham số; đơn SỬA thì không.
    location.replace(`/order?id=${encodeURIComponent(order.id)}${editId ? "" : "&moi=1"}${datGapLoi}`);
  } catch (err) {
    setSaving(false);
    await onSaveError(err);
  }
}

// Sau khi lưu thành công `saving` không bao giờ về false (trang sắp bị thay). iOS đưa trang này vào bộ nhớ đệm (bfcache) và KHÔI PHỤC nguyên trạng khi người dùng vuốt Back từ /order
// → form `inert` + "Đang lưu…" vĩnh viễn, mà PWA không có nút tải lại. `pageshow` với `persisted` báo đúng trường hợp đó: mở khoá lại form (dữ liệu đã gõ vẫn còn).
// (Lưu xong nay dùng `location.replace` nên form không còn trong lịch sử và Back không tới được nó; listener này giữ lại làm đai an toàn.)
// Chỉ khi đang kẹt `saving`: `setSaving(false)` gỡ `inert` của form, không được gỡ nhầm form đã bị `lockForm` (đơn không sửa được / không có quyền lập đơn).
window.addEventListener("pageshow", (e) => {
  if (e.persisted && saving) setSaving(false);
});

// ---- danh mục và đơn ----
function setCatalog(items: CatalogServiceDto[]): void {
  live = new Map(items.filter((c) => c.supported).map((c) => [c.code, c]));
  picker.setItems(items);
}

async function loadCatalog(): Promise<void> {
  try {
    const res = await layDanhMuc(); // ADR-0033: route cho người lập đơn (cả Đối tác, Thực tập)
    setCatalog(res.items);
    if (res.items.length === 0) picker.setNotice("Danh mục dịch vụ đang trống — báo quản trị viên.");
    else if (res.sync.error) picker.setNotice(`Chưa cập nhật được giá mới từ Google Sheet (${res.sync.error.replace(/[.\s]+$/, "")}). Đang dùng bản đã lưu — hãy kiểm tra lại giá trước khi gửi khách.`);
  } catch {
    // Mất danh mục khi sửa nháp: thẻ đã lưu hiện ở dạng khoá (vẫn sửa được đơn giá/chuyến và lưu được; máy chủ giữ bản chụp).
    picker.setNotice("Không tải được danh mục dịch vụ — tải lại trang để thử lại.");
  }
}

function fill(o: Api.OrderDetailDto): void {
  field("customerName").value = o.customerName;
  field("customerPhone").value = o.customerPhone;
  bookerPicker.set(o.bookerPartyId, o.bookerName);
  field("customerEmail").value = o.customerEmail ?? "";
  field("customerNote").value = o.customerNote ?? "";
  (field("discount") as HTMLInputElement).value = o.discount ? grouped(o.discount) : "";
  (field("depositAmount") as HTMLInputElement).value = o.depositAmount ? grouped(o.depositAmount) : "";
  field("depositMethod").value = o.depositMethod ?? "cash"; // đơn chưa có thanh toán trước: để sẵn "Tiền mặt" như form mới
  field("paymentNote").value = o.paymentNote ?? "";
  for (const en of [...entries]) unmount(en);
  orderUpdatedAt = o.updatedAt;
  changCu.clear();
  for (const s of o.services) {
    const dau = s.legs.filter((l) => l.direction === "OUT").sort((a, b) => `${a.pickupDate} ${a.pickupTime}`.localeCompare(`${b.pickupDate} ${b.pickupTime}`))[0];
    if (dau) changCu.set(s.id, dau);
  }
  for (const s of o.services) {
    const entry = mount(draftFromDto(s, live, `k${++seq}`), s.id === focusId ? true : undefined);
    if (s.id === focusId) entry.card.reveal(); // liên kết "Sửa" của banner incomplete_trip: mở khối chuyến và cuộn tới thẻ
  }
  // Đơn cũ (trước ADR-0021) có thể mỗi dịch vụ một ngày: khi đó ô để trống và Lưu báo "chọn một ngày cho cả đơn" (không đoán hộ).
  const dates = new Set(entries.map((e) => e.draft.trip.departDate));
  orderDate = dates.size === 1 ? [...dates][0]! : "";
  orderDateEl.value = orderDate;
}

async function loadOrder(): Promise<void> {
  if (!editId) return;
  renderBanner(errorEl, null);
  renderBanner(saveErrorEl, null);
  try {
    const { order, canModify } = await layDon!();
    // `canModify` do MÁY CHỦ quyết (người lập, người phụ trách đơn — ADR-0009 — hoặc quản trị); câu này chỉ giải thích khi bị từ chối.
    if (!canModify) return lockForm(banner("danger", "Chỉ người lập đơn, người phụ trách đơn hoặc quản trị viên mới được sửa đơn này."));
    if (order.status !== "draft") return lockForm(banner("danger", "Chỉ sửa được đơn đang chờ xác nhận."));
    byId("form-title").textContent = `Sửa đơn ${order.orderCode}`;
    setBarTitle(`Sửa đơn ${order.orderCode}`);
    fill(order);
  } catch (err) {
    lockForm(banner("danger", err instanceof ApiError ? err.message : "Không tải được đơn."));
  }
}

// ---- khởi động ----
// Gọi sớm (web/goi-som.ts): danh mục (và đơn đang sửa) gửi NGAY, song song với /api/auth/me của initShell(); vẫn chỉ DÙNG theo đúng điều kiện
// quyền bên dưới. Danh mục chỉ gọi sớm khi bản nhớ khung (ADR-0035) nói máy này thuộc người được lập đơn — Kế toán không gọi route này như cũ.
const layDanhMuc = layKhungNho()?.canCreate === true ? goiSom(() => api<Api.CatalogPublicResponse>("/api/catalog/for-order")) : () => api<Api.CatalogPublicResponse>("/api/catalog/for-order");
const layDon = editId ? goiSom(() => api<Api.OrderDetailResponse>(`/api/orders/${encodeURIComponent(editId)}`)) : null;
const staff = await initShell();
retailOnly = holdsPartner(staff); // trước loadCatalog/loadOrder: thẻ dịch vụ dựng sau dòng này
duocDatGap = can(staff, "order.leg.short_notice");
// R-P15: mốc cho biểu mẫu chưa lưu — chỉ người được lập đơn (máy chủ hỏi order.create). Lỗi / chưa có chính sách (503) → không cảnh báo; máy chủ vẫn chặn lúc xác nhận.
const layMoc = can(staff, "order.create")
  ? api<Api.MocToiThieuResponse>("/api/orders/moc-toi-thieu").then((r) => r.mocToiThieuPhut, () => null)
  : Promise.resolve(null);
// Khối "Người phụ trách": chỉ lập đơn mới, chỉ ai máy chủ cho chọn (Thực tập, Đối tác thuần: khối KHÔNG hiện — không phải hiện rồi báo lỗi).
canPickHandler = !editId && mayPickHandlerOnCreate(staff);
if (canPickHandler) {
  ownerEl.hidden = false;
  renderOwner();
}
// "Sử dụng thông tin của tôi": điền tên + SĐT của tài khoản đang đăng nhập (hồ sơ tài khoản chưa có email nên ô Email không đổi).
// Bắn "input" để ô hồ sơ khách (booker-picker) tra lại theo SĐT mới như khi gõ tay.
byId("use-mine").addEventListener("click", () => {
  for (const [id, value] of [["customerName", staff.fullName], ["customerPhone", staff.phone]] as const) {
    const el = field(id);
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
// ADR-0033: danh mục cho form chỉ dành cho người được lập đơn — máy chủ trả 403 cho tài khoản không có `order.create` (Kế toán), nên không gọi
// (gọi thì hiện thêm "Không tải được danh mục dịch vụ — tải lại trang…", lời khuyên sai vì tải lại không giúp gì). Hôm nay mọi mã có `order.modify`
// đều có `order.create`; ai sửa đơn mà không được lập đơn thì thẻ đã lưu hiện ở dạng khoá như khi mất danh mục (xem `loadCatalog`).
if (can(staff, "order.create")) await loadCatalog(); // trước loadOrder: thẻ đã lưu cần danh mục hiện tại để biết còn đổi số khách được không
if (editId) {
  byId("form-title").textContent = "Sửa đơn";
  setBarTitle("Sửa đơn");
  await loadOrder();
} else if (!can(staff, "order.create")) {
  // ADR-0007: kế toán xem được đơn nhưng không lập đơn; nút "Đơn mới" đã ẩn, đây là lớp chặn khi mở thẳng đường dẫn.
  lockForm(banner("danger", "Tài khoản này không được lập đơn."));
}
mocPhut = await layMoc;
if (retailOnly) {
  // Sau loadOrder: đơn cũ đã lưu giảm giá > 0 thì để ô sửa được (đưa về 0), không thì khoá.
  const discountEl = field("discount") as HTMLInputElement;
  discountEl.readOnly = num("discount") === 0;
  // Dòng báo nằm DƯỚI cả hàng ba ô Thanh toán (không trong cột hẹp của ô giảm giá — ở máy tính từng xuống 3 hàng), ô trỏ tới nó cho trình đọc màn hình.
  const hint = h("p", { class: "muted", id: "discount-hint" }, "Tài khoản đối tác tạm chưa được giảm giá.");
  discountEl.setAttribute("aria-describedby", hint.id);
  (discountEl.closest(".grid") ?? discountEl).after(hint);
}
recompute();

// Bảng tin (ADR-0022, TD-3): trang này KHÔNG BAO GIỜ tự tải lại (sẽ xoá những gì người dùng đang nhập). Chỉ khi đang SỬA đơn `editId` mà có tin về đúng đơn đó
// thì hiện dải báo; khoá lạc quan `stale` ở máy chủ vẫn là lưới thật khi bấm Lưu. Lập đơn mới (không có `editId`) thì không làm gì. Không đè lên một dải báo
// đang hiện (lỗi lưu/khoá form) và không hiện lúc chính tab này đang lưu hoặc vừa ghi đơn này.
if (editId) {
  window.addEventListener("don-thay-doi", (ev) => {
    if (!suKienVeDon((ev as CustomEvent<SuKienDon[]>).detail, editId)) return;
    if (formLocked || saving || vuaLamBoiTabNay(editId) || !saveErrorEl.hidden) return;
    renderBanner(saveErrorEl, banner("warning", "Đơn vừa được người khác cập nhật — lưu sẽ báo lỗi, hãy mở lại đơn"));
  });
}
