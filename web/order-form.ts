import { ApiError, api, type CatalogService, type DepositMethod, type Order, type OrderInput, type Api } from "./api";
import { PAX_LABEL, availableCodes, buildLines, parseUnit, type PaxCode } from "../src/shared/order-lines";
import { byId, h, replaceChildren } from "./dom";
import { grouped, parseMoney, vnd } from "./format";
import { initShell, setBarTitle, showError } from "./shell";

const editId = new URLSearchParams(location.search).get("id");

const errorEl = byId("error");
const itemsEl = byId("items");
const saveBtn = byId<HTMLButtonElement>("save");
const field = (id: string) => byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id);

interface ItemRow {
  /** Dòng sinh từ danh mục giữ mã dịch vụ nguồn (truy vết); dòng nhập tay là null. */
  catalogCode: string | null;
  root: HTMLElement;
  description: HTMLInputElement;
  detail: HTMLInputElement;
  quantity: HTMLInputElement;
  unitPrice: HTMLInputElement;
  lineTotal: HTMLElement;
}
const rows: ItemRow[] = [];

/** Ô nhập tiền: gõ tự nhóm hàng nghìn (1.350.000), giá trị thật lấy bằng parseMoney. */
function moneyInput(id: string | null, placeholder: string): HTMLInputElement {
  const el = h("input", { type: "text", inputMode: "numeric", autocomplete: "off", placeholder, id });
  el.addEventListener("input", () => {
    const n = parseMoney(el.value);
    el.value = el.value.trim() === "" ? "" : grouped(n);
    recompute();
  });
  return el;
}

const setMoney = (el: HTMLInputElement, n: number) => (el.value = n ? grouped(n) : "");

function addRow(init?: { catalogCode: string | null; description: string; detail: string | null; quantity: number; unitPrice: number }): void {
  const description = h("input", { type: "text", placeholder: "Tên dịch vụ, vd: Tour Hòn Mun 1 ngày", maxLength: 300, required: true });
  const detail = h("input", { type: "text", placeholder: "Chi tiết: ngày đi, số khách…", maxLength: 1000 });
  const quantity = h("input", { type: "number", min: 1, step: 1, value: "1", inputMode: "numeric" });
  const unitPrice = moneyInput(null, "Đơn giá (₫)");
  const lineTotal = h("output", { class: "line-total" }, vnd(0));
  const remove = h("button", { type: "button", class: "btn btn-link danger", title: "Xoá dòng" }, "Xoá");
  const root = h(
    "div",
    { class: "item" },
    h("label", { class: "item-desc" }, "Dịch vụ", description),
    h("label", { class: "item-detail" }, "Chi tiết", detail),
    h("label", { class: "item-qty" }, "SL", quantity),
    h("label", { class: "item-price" }, "Đơn giá", unitPrice),
    h("div", { class: "item-total" }, h("span", { class: "muted" }, "Thành tiền"), lineTotal),
    remove,
  );
  const row: ItemRow = { catalogCode: init?.catalogCode ?? null, root, description, detail, quantity, unitPrice, lineTotal };
  quantity.addEventListener("input", recompute);
  remove.addEventListener("click", () => {
    if (rows.length === 1) return; // luôn còn ít nhất một dòng
    rows.splice(rows.indexOf(row), 1);
    root.remove();
    recompute();
  });
  if (init) {
    description.value = init.description;
    detail.value = init.detail ?? "";
    quantity.value = String(init.quantity);
    unitPrice.value = grouped(init.unitPrice); // giá 0 (vd em bé miễn phí) vẫn hiện "0", không để trống
  }
  rows.push(row);
  itemsEl.append(root);
  recompute();
}

/** Chỉ để xem trước cho người nhập; con số chính thức do server tính lại khi lưu (spec §2.3). */
function recompute(): void {
  let subtotal = 0;
  for (const r of rows) {
    const line = Math.max(0, Math.trunc(Number(r.quantity.value) || 0)) * parseMoney(r.unitPrice.value);
    r.lineTotal.textContent = vnd(line);
    subtotal += line;
  }
  const discount = parseMoney(field("discount").value);
  const deposit = parseMoney(field("depositAmount").value);
  const total = subtotal - discount;
  byId("sum-subtotal").textContent = vnd(subtotal);
  byId("sum-total").textContent = vnd(total);
  byId("sum-remaining").textContent = vnd(total - deposit);
  const bad = discount > subtotal ? "Giảm giá đang lớn hơn tạm tính." : deposit > total ? "Tiền cọc đang lớn hơn tổng cộng." : null;
  byId("sum-warning").textContent = bad ?? "";
  byId("sum-warning").hidden = !bad;
}

function collect(): OrderInput {
  const method = field("depositMethod").value as DepositMethod | "";
  return {
    customerName: field("customerName").value,
    customerPhone: field("customerPhone").value,
    customerEmail: field("customerEmail").value,
    customerNote: field("customerNote").value,
    items: rows.map((r) => ({
      catalogCode: r.catalogCode,
      description: r.description.value,
      detail: r.detail.value,
      quantity: Math.trunc(Number(r.quantity.value) || 0),
      unitPrice: parseMoney(r.unitPrice.value),
    })),
    discount: parseMoney(field("discount").value),
    depositAmount: parseMoney(field("depositAmount").value),
    depositMethod: method || null,
    paymentNote: field("paymentNote").value,
  };
}

function fill(o: Order): void {
  field("customerName").value = o.customerName;
  field("customerPhone").value = o.customerPhone;
  field("customerEmail").value = o.customerEmail ?? "";
  field("customerNote").value = o.customerNote ?? "";
  setMoney(field("discount") as HTMLInputElement, o.discount);
  setMoney(field("depositAmount") as HTMLInputElement, o.depositAmount);
  field("depositMethod").value = o.depositMethod ?? "";
  field("paymentNote").value = o.paymentNote ?? "";
  for (const it of o.items) addRow(it);
}

byId<HTMLFormElement>("order-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  showError(errorEl, null);
  saveBtn.disabled = true;
  try {
    const { order } = editId
      ? await api<Api.OrderResponse>(`/api/orders/${encodeURIComponent(editId)}`, { method: "PUT", body: collect() })
      : await api<Api.OrderResponse>("/api/orders", { method: "POST", body: collect() });
    location.assign(`/order?id=${encodeURIComponent(order.id)}`);
  } catch (err) {
    showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
    errorEl.scrollIntoView({ block: "nearest" });
    saveBtn.disabled = false;
  }
});

byId("add-item").addEventListener("click", () => addRow());
for (const id of ["discount", "depositAmount"]) {
  const el = field(id) as HTMLInputElement;
  el.addEventListener("input", () => {
    el.value = el.value.trim() === "" ? "" : grouped(parseMoney(el.value));
    recompute();
  });
}

// ---- Chọn nhanh từ danh mục dịch vụ (M3): mỗi loại khách sinh một dòng; dịch vụ tính theo nhóm nhập theo số khách.
let catalog: CatalogService[] = [];
const catalogQ = byId<HTMLInputElement>("catalog-q");
const catalogList = byId("catalog-list");
const catalogPick = byId("catalog-pick");
const catalogWarn = byId("catalog-warn");

function showCatalogWarn(text: string | null): void {
  catalogWarn.textContent = text ?? "";
  catalogWarn.hidden = !text;
}

function renderCatalogList(): void {
  const q = catalogQ.value.trim().toLowerCase();
  const found = catalog.filter((c) => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)).slice(0, 40);
  replaceChildren(
    catalogList,
    ...found.map((c) => {
      const b = h("button", { type: "button", disabled: !c.supported || c.prices.adult === null }, h("span", null, h("strong", null, c.code), " ", c.name), h("span", { class: "price" }, c.supported ? (c.prices.adult === null ? "chưa có giá" : vnd(c.prices.adult)) : "nhập tay"));
      b.addEventListener("click", () => openPick(c));
      return b;
    }),
    found.length === 0 && h("div", { class: "muted", style: "padding:12px" }, "Không có dịch vụ khớp — bạn có thể nhập tay ở các dòng bên dưới."),
  );
  catalogList.hidden = false;
}

function openPick(c: CatalogService): void {
  catalogList.hidden = true;
  const unit = parseUnit(c.unit);
  const codes = availableCodes(c);
  const inputs = new Map<PaxCode, HTMLInputElement>();
  const preview = h("div", { class: "preview" });
  const add = h("button", { type: "button", class: "btn btn-primary" }, "Thêm vào đơn");
  const counts = () => Object.fromEntries([...inputs].map(([k, el]) => [k, Math.trunc(Number(el.value) || 0)])) as Partial<Record<PaxCode, number>>;
  const refresh = () => {
    const r = buildLines(c, counts());
    add.disabled = !r.ok;
    preview.textContent = r.ok ? `${r.lines.length} dòng · ${vnd(r.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0))}` : r.message;
  };
  for (const code of codes) {
    const label = unit.kind === "group" ? "Số khách" : PAX_LABEL[code];
    const input = h("input", { type: "number", min: 0, step: 1, value: code === "adult" ? "1" : "0", inputMode: "numeric" });
    input.addEventListener("input", refresh);
    inputs.set(code, input);
  }
  const counters = h("div", { class: "counters" }, ...codes.map((code) => h("label", null, unit.kind === "group" ? "Số khách" : `${PAX_LABEL[code]} · ${vnd(c.prices[code]!)}`, inputs.get(code)!)));
  add.addEventListener("click", () => {
    const r = buildLines(c, counts());
    if (!r.ok) return;
    if (rows.length === 1 && !rows[0]!.description.value.trim() && !rows[0]!.unitPrice.value.trim()) {
      rows[0]!.root.remove(); // bỏ dòng trống mặc định
      rows.length = 0;
    }
    for (const l of r.lines) addRow({ catalogCode: l.catalogCode, description: l.description, detail: l.detail || null, quantity: l.quantity, unitPrice: l.unitPrice });
    catalogPick.hidden = true;
    catalogQ.value = "";
    itemsEl.scrollIntoView({ block: "nearest" });
  });
  const cancel = h("button", { type: "button", class: "btn" }, "Bỏ qua");
  cancel.addEventListener("click", () => (catalogPick.hidden = true));
  const hint =
    unit.kind === "group"
      ? `Giá ${vnd(c.prices.adult!)} cho mỗi nhóm tối đa ${unit.size} khách — nhập số khách, hệ thống tự tính số lượt.`
      : "Nhập số khách từng loại; mỗi loại có khách sẽ thành một dòng trong đơn.";
  replaceChildren(catalogPick, h("strong", null, `${c.code} — ${c.name}`), h("p", { class: "muted", style: "margin:4px 0 0" }, hint), counters, preview, h("div", { class: "actions", style: "margin:0" }, add, cancel));
  catalogPick.hidden = false;
  refresh();
}

catalogQ.addEventListener("focus", renderCatalogList);
catalogQ.addEventListener("input", renderCatalogList);
document.addEventListener("click", (e) => {
  if (!(e.target instanceof Node) || !(catalogQ.parentElement?.parentElement?.contains(e.target) ?? false)) catalogList.hidden = true;
});

await initShell();
try {
  const res = await api<Api.CatalogPublicResponse>("/api/catalog");
  catalog = res.items;
  if (catalog.length === 0) showCatalogWarn("Danh mục dịch vụ đang trống — hãy nhập tay các dòng bên dưới.");
  else if (res.sync.error) showCatalogWarn(`Chưa cập nhật được giá mới từ Google Sheet (${res.sync.error.replace(/[.\s]+$/, "")}). Đang dùng bản đã lưu — hãy kiểm tra lại giá trước khi gửi khách.`);
} catch {
  showCatalogWarn("Không tải được danh mục dịch vụ — hãy nhập tay các dòng bên dưới.");
}
if (editId) {
  byId("form-title").textContent = "Sửa đơn";
  setBarTitle("Sửa đơn");
  try {
    const { order, canModify } = await api<Api.OrderDetailResponse>(`/api/orders/${encodeURIComponent(editId)}`);
    if (!canModify) {
      showError(errorEl, "Chỉ người lập đơn hoặc quản trị viên mới được sửa đơn này.");
      saveBtn.disabled = true;
    } else if (order.status !== "draft") {
      showError(errorEl, "Chỉ sửa được đơn ở trạng thái nháp.");
      saveBtn.disabled = true;
    } else {
      byId("form-title").textContent = `Sửa đơn ${order.orderCode}`;
      setBarTitle(`Sửa đơn ${order.orderCode}`);
      fill(order);
    }
  } catch (err) {
    showError(errorEl, err instanceof ApiError ? err.message : "Không tải được đơn.");
    saveBtn.disabled = true;
  }
}
if (rows.length === 0) addRow();
recompute();
