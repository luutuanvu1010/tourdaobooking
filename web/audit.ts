import { ApiError, api, type AuditRecord } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { ACTION_LABEL, dateTime } from "./format";
import { initShell, showError } from "./shell";

const PAGE = 50;
const qInput = byId<HTMLInputElement>("q");
const actionSel = byId<HTMLSelectElement>("action");
const listEl = byId("list");
const moreBtn = byId<HTMLButtonElement>("more");
const emptyEl = byId("empty");
const errorEl = byId("error");

let offset = 0;
let loadSeq = 0;

function row(e: AuditRecord): HTMLElement {
  return h(
    "tr",
    null,
    h("td", null, dateTime(e.at)),
    h("td", null, e.staffName),
    h("td", null, ACTION_LABEL[e.action]),
    h("td", null, e.orderId ? h("a", { href: `/order?id=${encodeURIComponent(e.orderId)}` }, e.targetLabel) : e.targetLabel),
    h("td", { class: "muted" }, e.detail),
  );
}

async function load(reset: boolean): Promise<void> {
  const seq = ++loadSeq;
  if (reset) offset = 0;
  showError(errorEl, null);
  const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
  if (qInput.value.trim()) params.set("q", qInput.value.trim());
  if (actionSel.value) params.set("action", actionSel.value);
  try {
    const { entries, hasMore } = await api<{ entries: AuditRecord[]; hasMore: boolean }>(`/api/audit?${params}`);
    if (seq !== loadSeq) return;
    const rows = entries.map(row);
    if (reset) replaceChildren(listEl, ...rows);
    else listEl.append(...rows);
    offset += entries.length;
    moreBtn.hidden = !hasMore;
    emptyEl.hidden = offset > 0;
  } catch (err) {
    if (seq === loadSeq) showError(errorEl, err instanceof ApiError ? err.message : "Không tải được nhật ký.");
  }
}

let timer: number | undefined;
qInput.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => void load(true), 300);
});
actionSel.addEventListener("change", () => void load(true));
moreBtn.addEventListener("click", () => void load(false));

const staff = await initShell();
if (staff.role !== "admin") showError(errorEl, "Chỉ quản trị viên được xem nhật ký hệ thống.");
else await load(true);
