import { ApiError, api, type CatalogAdminItem, type CatalogSyncState, type PaxCode } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { dateTime, grouped, parseMoney, vnd } from "./format";
import { PAX_LABEL, PAX_ORDER } from "../src/shared/order-lines";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const noticeEl = byId("notice");
const statusEl = byId("status");
const listEl = byId("list");
const editEl = byId("edit");
const qEl = byId<HTMLInputElement>("q");
const filterEl = byId<HTMLSelectElement>("filter");
const pullBtn = byId<HTMLButtonElement>("pull");

let items: CatalogAdminItem[] = [];
let sync: CatalogSyncState;

const fail = (err: unknown) => showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
async function act<T>(fn: () => Promise<T>): Promise<T | undefined> {
  showError(errorEl, null);
  try {
    return await fn();
  } catch (err) {
    fail(err);
    return undefined;
  }
}

function renderStatus(): void {
  const parts = [
    sync.lastSuccessAt ? `Đồng bộ thành công lần cuối: ${dateTime(sync.lastSuccessAt)}${sync.itemCount !== null ? ` · ${sync.itemCount} dịch vụ trong Sheet` : ""}.` : "Chưa đồng bộ thành công lần nào.",
    "Hệ thống tự đồng bộ mỗi 15 phút.",
  ];
  replaceChildren(
    statusEl,
    h("p", { class: "muted" }, parts.join(" ")),
    sync.lastError && h("div", { class: "alert" }, `Lần đồng bộ gần nhất lỗi: ${sync.lastError} Hệ thống vẫn dùng bản đã lưu.`),
    sync.problems.length > 0 && h("details", null, h("summary", { class: "muted" }, `${sync.problems.length} dòng trong Sheet bị bỏ qua ở lần đồng bộ cuối`), h("ul", { class: "history" }, ...sync.problems.map((p) => h("li", null, `Dòng ${p.row}: ${p.message}`)))),
  );
}

function priceCell(it: CatalogAdminItem, code: PaxCode): HTMLElement {
  const eff = it.prices[code];
  const sheet = it.sheetPrices[code];
  const over = it.overridden.includes(code);
  if (eff === null && !over) return h("td", { class: "price-cell muted" }, "—");
  return h("td", { class: "price-cell" }, eff === null ? "—" : vnd(eff), over && h("span", { class: "mark", title: "Giá ghi đè bởi Admin" }, " ✎"), over && sheet !== eff && h("span", { class: "sheet" }, sheet === null ? "Sheet: —" : `Sheet: ${vnd(sheet)}`));
}

function row(it: CatalogAdminItem): HTMLElement {
  const btn = (label: string, onclick: () => void, cls = "btn btn-link") => {
    const b = h("button", { type: "button", class: cls }, label);
    b.addEventListener("click", onclick);
    return b;
  };
  const update = async (path: string, init: { method: string; body?: unknown }) => {
    const r = await act(() => api<{ item: CatalogAdminItem }>(path, init));
    if (r) {
      items = items.map((x) => (x.code === r.item.code ? r.item : x));
      render();
    }
  };
  const conflicts = it.conflicts.map((c) => `${PAX_LABEL[c.code].toLowerCase()}: Sheet ${c.base === null ? "—" : vnd(c.base)} → ${c.current === null ? "—" : vnd(c.current)}`).join("; ");
  return h(
    "tr",
    { class: it.hidden || !it.inSheet ? "row-off" : "" },
    h("td", null, it.code),
    h("td", null, it.name, it.hidden && h("span", { class: "badge badge-cancelled" }, "Đã ẩn"), !it.inSheet && h("span", { class: "badge badge-draft" }, "Không còn trong Sheet"), !it.supported && h("span", { class: "badge badge-draft", title: "Chỉ nhập tay được" }, `Đơn vị ${it.unit} chưa hỗ trợ`), it.conflicts.length > 0 && h("div", { class: "alert warn", style: "margin:6px 0 0" }, `Sheet đã đổi giá kể từ khi ghi đè — ${conflicts}. Giá đang bán vẫn là giá ghi đè.`)),
    h("td", { class: "muted" }, it.unit),
    ...PAX_ORDER.map((c) => priceCell(it, c)),
    h(
      "td",
      { class: "row-actions" },
      btn("Sửa giá", () => openEdit(it)),
      it.conflicts.length > 0 && btn("Giữ ghi đè", () => update(`/api/catalog/${encodeURIComponent(it.code)}/ack`, { method: "POST" })),
      it.overridden.length > 0 && btn("Bỏ ghi đè", () => confirm(`Quay ${it.code} về giá theo Sheet?`) && update(`/api/catalog/${encodeURIComponent(it.code)}/override`, { method: "DELETE" })),
      btn(it.hidden ? "Hiện lại" : "Ẩn", () => update(`/api/catalog/${encodeURIComponent(it.code)}`, { method: "PATCH", body: { hidden: !it.hidden } }), it.hidden ? "btn btn-link" : "btn btn-link danger"),
    ),
  );
}

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
}

function openEdit(it: CatalogAdminItem): void {
  const fields = new Map<PaxCode, HTMLInputElement>();
  for (const c of PAX_ORDER) {
    const el = h("input", { type: "text", inputMode: "numeric", autocomplete: "off", placeholder: it.sheetPrices[c] === null ? "không có giá" : `Sheet: ${grouped(it.sheetPrices[c]!)}` });
    el.value = it.prices[c] === null ? "" : grouped(it.prices[c]!);
    el.addEventListener("input", () => (el.value = el.value.trim() === "" ? "" : grouped(parseMoney(el.value))));
    fields.set(c, el);
  }
  const save = h("button", { type: "button", class: "btn btn-primary" }, "Lưu ghi đè");
  const close = h("button", { type: "button", class: "btn" }, "Đóng");
  close.addEventListener("click", () => (editEl.hidden = true));
  save.addEventListener("click", async () => {
    // Trống hoặc bằng giá Sheet → không ghi đè loại đó (nếu đang ghi đè thì bỏ); khác → ghi đè.
    const prices: Partial<Record<PaxCode, number | null>> = {};
    for (const c of PAX_ORDER) {
      const raw = fields.get(c)!.value.trim();
      const value = raw === "" ? null : parseMoney(raw);
      const sheet = it.sheetPrices[c];
      const overridden = it.overridden.includes(c);
      if (value === sheet || value === null) {
        if (overridden) prices[c] = null;
      } else if (value !== it.prices[c] || !overridden) prices[c] = value;
    }
    if (Object.keys(prices).length === 0) {
      editEl.hidden = true;
      return;
    }
    const r = await act(() => api<{ item: CatalogAdminItem }>(`/api/catalog/${encodeURIComponent(it.code)}`, { method: "PATCH", body: { prices } }));
    if (r) {
      items = items.map((x) => (x.code === r.item.code ? r.item : x));
      editEl.hidden = true;
      render();
    }
  });
  const unit = it.supported ? null : h("p", { class: "muted" }, `Đơn vị "${it.unit}" chưa được hỗ trợ nên dịch vụ này chỉ nhập tay được trong đơn.`);
  replaceChildren(
    editEl,
    h("h2", null, `Sửa giá: ${it.code} — ${it.name}`),
    h("p", { class: "muted" }, "Giá ghi đè chỉ có hiệu lực trong hệ thống này (không ghi ngược vào Google Sheet) và không bị lần đồng bộ sau đè mất. Để trống hoặc nhập đúng giá Sheet để bỏ ghi đè loại đó."),
    unit,
    h("div", { class: "grid three" }, ...PAX_ORDER.map((c) => h("label", null, `${PAX_LABEL[c]} (₫)`, fields.get(c)!))),
    h("div", { class: "actions", style: "margin-top:12px" }, save, close),
  );
  editEl.hidden = false;
  editEl.scrollIntoView({ block: "nearest" });
}

async function load(): Promise<void> {
  const r = await act(() => api<{ items: CatalogAdminItem[]; sync: CatalogSyncState }>("/api/catalog/admin"));
  if (!r) return;
  items = r.items;
  sync = r.sync;
  renderStatus();
  render();
}

async function pull(force: boolean): Promise<void> {
  pullBtn.disabled = true;
  noticeEl.hidden = true;
  showError(errorEl, null);
  try {
    const r = await api<{ added: number; changed: number; hidden: number; unchanged: number; problems: unknown[]; warnings: { message: string }[] }>("/api/catalog/sync", { method: "POST", body: { force } });
    noticeEl.textContent = `Đã đồng bộ xong: thêm ${r.added}, đổi ${r.changed}, ẩn ${r.hidden}, giữ nguyên ${r.unchanged}.${r.problems.length ? ` ${r.problems.length} dòng bị bỏ qua.` : ""}${r.warnings.length ? ` Cảnh báo: ${r.warnings.map((w) => w.message).join("; ")}.` : ""}`;
    noticeEl.hidden = false;
  } catch (err) {
    if (err instanceof ApiError && err.code === "sync_guard" && confirm(`${err.message}\n\nChỉ tiếp tục nếu bạn chắc chắn Sheet đúng. Vẫn đồng bộ và ẩn các dịch vụ đó?`)) {
      pullBtn.disabled = false;
      return pull(true);
    }
    fail(err);
  }
  pullBtn.disabled = false;
  await load();
}

pullBtn.addEventListener("click", () => void pull(false));
qEl.addEventListener("input", render);
filterEl.addEventListener("change", render);

const staff = await initShell();
if (staff.role !== "admin") showError(errorEl, "Chỉ quản trị viên được vào trang này.");
else await load();
