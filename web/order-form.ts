// Form lập/sửa đơn (A2, đặc tả §5.1–5.2): thẻ dịch vụ + thông tin chuyến, tóm tắt tiền, banner lỗi/xung đột.
// Trang chỉ NỐI: luật ở src/shared (service-form, trip-form, order-errors), DOM ở các khối web/ (service-card, catalog-picker, banner).
import type { CatalogServiceDto } from "../src/shared/contracts";
import { NETWORK_BANNER, banner, classifyOrderError, type Banner } from "../src/shared/order-errors";
import { can } from "../src/shared/permissions";
import {
  canAddService, draftFromDto, draftIssues, newCatalogDraft, newManualDraft, orderIssues, orderSummary, refreshFromCatalog, toServiceInput, totalLines,
  type ServiceDraft,
} from "../src/shared/service-form";
import { MAX_LINES_PER_ORDER, MAX_SERVICES } from "../src/shared/trip-rules";
import { vnToday } from "../src/shared/vn-date";
import { ApiError, api, type Api, type DepositMethod, type OrderInput } from "./api";
import { renderBanner } from "./banner";
import { createCatalogPicker } from "./catalog-picker";
import { byId } from "./dom";
import { grouped, parseMoney, vnd } from "./format";
import { regroupMoney } from "./money-input";
import { createServiceCard, type ServiceCard } from "./service-card";
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
const addManualBtn = byId<HTMLButtonElement>("add-manual");
const saveBtn = byId<HTMLButtonElement>("save");
const field = (id: string) => byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id);
const num = (id: string) => parseMoney(field(id).value);

interface Entry {
  draft: ServiceDraft;
  card: ServiceCard;
}
const entries: Entry[] = [];
let seq = 0;
let live = new Map<string, CatalogServiceDto>(); // dịch vụ danh mục ĐANG HIỆN và được hỗ trợ, theo mã
let orderUpdatedAt: string | null = null;
let formLocked = false;
let saving = false;

const drafts = () => entries.map((e) => e.draft);
const nameOf = (d: ServiceDraft, i: number) => d.name.trim() || `Dịch vụ ${i + 1}`;

// ---- ô chọn danh mục và danh sách thẻ ----
const picker = createCatalogPicker({
  onPick: (item) => {
    const entry = mount(newCatalogDraft(item, `k${++seq}`));
    entry.card.root.scrollIntoView({ block: "nearest" });
  },
});
byId("catalog-slot").append(picker.root);

function mount(d: ServiceDraft, open?: boolean): Entry {
  const entry = { draft: d } as Entry;
  entry.card = createServiceCard({
    draft: d,
    today,
    openTrip: open ?? !isPhone, // ≤ 640px thẻ mới thu gọn khối chuyến (Q2); máy tính mở sẵn
    canAddLine: () => totalLines(drafts()) < MAX_LINES_PER_ORDER,
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
  entries.push(entry);
  servicesEl.append(entry.card.root);
  recompute();
  return entry;
}

function unmount(entry: Entry): void {
  entries.splice(entries.indexOf(entry), 1);
  entry.card.root.remove();
  recompute();
}

addManualBtn.addEventListener("click", () => {
  const entry = mount(newManualDraft(`k${++seq}`));
  entry.card.root.scrollIntoView({ block: "nearest" });
});

// ---- tóm tắt tiền và trạng thái nút ----
function recompute(): void {
  const ds = drafts();
  const s = orderSummary(ds, num("discount"), num("depositAmount"));
  byId("sum-subtotal").textContent = vnd(s.subtotal);
  byId("sum-total").textContent = vnd(s.total);
  byId("sum-remaining").textContent = vnd(s.remaining);
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
  const tooMany = ds.some((d) => draftIssues(d).some((i) => i.code === "too_many_guests")); // vượt 50 khách khoá nút Lưu (đặc tả 5.1)
  saveBtn.disabled = formLocked || saving || tooMany;
  saveBtn.textContent = saving ? "Đang lưu…" : editId ? "Lưu thay đổi" : "Lưu đơn nháp";
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
  need("customerName", "Nhập tên khách.");
  need("customerPhone", "Nhập số điện thoại khách.");
  if (entries.length === 0) lines.push("Thêm ít nhất một dịch vụ.");
  entries.forEach((e, i) => {
    for (const issue of draftIssues(e.draft)) {
      lines.push(`${nameOf(e.draft, i)}: ${issue.message}`);
      focusables.push(e.card.root);
    }
  });
  lines.push(...orderIssues(drafts()));
  const s = orderSummary(drafts(), num("discount"), num("depositAmount"));
  if (s.discount > s.subtotal) lines.push("Giảm giá không được vượt quá tạm tính.");
  else if (s.deposit > s.total) lines.push("Tiền cọc không được vượt quá tổng cộng.");
  if (s.deposit > 0 && !field("depositMethod").value) {
    lines.push("Chọn hình thức cọc.");
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
    ...(orderUpdatedAt ? { expectedUpdatedAt: orderUpdatedAt } : {}),
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
    const res = await api<Api.CatalogPublicResponse>("/api/catalog");
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
  const target = failure.focusService === null ? undefined : entries[failure.focusService]?.card.root;
  (wide() ? (target ?? saveErrorEl) : saveErrorEl).scrollIntoView({ block: "center" }); // < 960px: banner (nêu rõ dịch vụ/giá) nằm cuối form nên cuộn tới ĐÓ; ≥ 960px: cuộn tới thẻ (banner ở cột dính, luôn thấy)
}

// Ô tìm danh mục nằm TRONG form: Enter (hoặc phím "Tìm" của bàn phím iPhone) sẽ gửi ngầm cả đơn qua nút "Lưu" mặc định. Chỉ chặn ở ô tìm; các ô văn bản khác giữ hành vi form thường.
formEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target instanceof HTMLInputElement && e.target.type === "search") e.preventDefault();
});

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (formLocked || saving) return;
  renderBanner(saveErrorEl, null);
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
    location.assign(`/order?id=${encodeURIComponent(order.id)}`);
  } catch (err) {
    setSaving(false);
    await onSaveError(err);
  }
});

// Sau khi lưu thành công `saving` không bao giờ về false (trang sắp bị thay). iOS đưa trang này vào bộ nhớ đệm (bfcache) và KHÔI PHỤC nguyên trạng khi người dùng vuốt Back từ /order
// → form `inert` + "Đang lưu…" vĩnh viễn, mà PWA không có nút tải lại. `pageshow` với `persisted` báo đúng trường hợp đó: mở khoá lại form (dữ liệu đã gõ vẫn còn).
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
    const res = await api<Api.CatalogPublicResponse>("/api/catalog");
    setCatalog(res.items);
    if (res.items.length === 0) picker.setNotice("Danh mục dịch vụ đang trống — hãy thêm dịch vụ nhập tay.");
    else if (res.sync.error) picker.setNotice(`Chưa cập nhật được giá mới từ Google Sheet (${res.sync.error.replace(/[.\s]+$/, "")}). Đang dùng bản đã lưu — hãy kiểm tra lại giá trước khi gửi khách.`);
  } catch {
    // Mất danh mục khi sửa nháp: thẻ đã lưu hiện ở dạng khoá (vẫn sửa được đơn giá/chuyến và lưu được; máy chủ giữ bản chụp).
    picker.setNotice("Không tải được danh mục dịch vụ — hãy thêm dịch vụ nhập tay.");
  }
}

function fill(o: Api.OrderDetailDto): void {
  field("customerName").value = o.customerName;
  field("customerPhone").value = o.customerPhone;
  field("customerEmail").value = o.customerEmail ?? "";
  field("customerNote").value = o.customerNote ?? "";
  (field("discount") as HTMLInputElement).value = o.discount ? grouped(o.discount) : "";
  (field("depositAmount") as HTMLInputElement).value = o.depositAmount ? grouped(o.depositAmount) : "";
  field("depositMethod").value = o.depositMethod ?? "";
  field("paymentNote").value = o.paymentNote ?? "";
  for (const en of [...entries]) unmount(en);
  orderUpdatedAt = o.updatedAt;
  for (const s of o.services) {
    const entry = mount(draftFromDto(s, live, `k${++seq}`), s.id === focusId ? true : undefined);
    if (s.id === focusId) entry.card.reveal(); // liên kết "Sửa" của banner incomplete_trip: mở khối chuyến và cuộn tới thẻ
  }
}

async function loadOrder(): Promise<void> {
  if (!editId) return;
  renderBanner(errorEl, null);
  renderBanner(saveErrorEl, null);
  try {
    const { order, canModify } = await api<Api.OrderDetailResponse>(`/api/orders/${encodeURIComponent(editId)}`);
    if (!canModify) return lockForm(banner("danger", "Chỉ người lập đơn hoặc quản trị viên mới được sửa đơn này."));
    if (order.status !== "draft") return lockForm(banner("danger", "Chỉ sửa được đơn ở trạng thái nháp."));
    byId("form-title").textContent = `Sửa đơn ${order.orderCode}`;
    setBarTitle(`Sửa đơn ${order.orderCode}`);
    fill(order);
  } catch (err) {
    lockForm(banner("danger", err instanceof ApiError ? err.message : "Không tải được đơn."));
  }
}

// ---- khởi động ----
const staff = await initShell();
await loadCatalog(); // trước loadOrder: thẻ đã lưu cần danh mục hiện tại để biết còn đổi số khách được không
if (editId) {
  byId("form-title").textContent = "Sửa đơn";
  setBarTitle("Sửa đơn");
  await loadOrder();
} else if (!can(staff, "order.create")) {
  // ADR-0007: kế toán xem được đơn nhưng không lập đơn; nút "Đơn mới" đã ẩn, đây là lớp chặn khi mở thẳng đường dẫn.
  lockForm(banner("danger", "Tài khoản này không được lập đơn."));
}
recompute();
