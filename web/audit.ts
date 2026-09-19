import { AUDIT_ACTIONS, AUDIT_GROUPS, type AuditAction, type AuditGroup } from "../src/shared/audit-actions";
import { ApiError, api, type AuditRecord } from "./api";
import { append, byId, h, replaceChildren } from "./dom";
import { actionLabel, dateTime } from "./format";
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

// Bộ lọc hành động sinh từ nguồn duy nhất, nhóm theo loại đối tượng.
const actions = Object.entries(AUDIT_ACTIONS) as [AuditAction, { label: string; group: AuditGroup }][];
append(
  actionSel,
  (Object.entries(AUDIT_GROUPS) as [AuditGroup, string][]).map(([group, label]) =>
    h("optgroup", { label }, ...actions.filter(([, a]) => a.group === group).map(([code, a]) => h("option", { value: code }, a.label))),
  ),
);

function row(e: AuditRecord): HTMLElement {
  return h(
    "tr",
    null,
    h("td", null, dateTime(e.at)),
    h("td", null, e.staffName),
    h("td", null, actionLabel(e.action)),
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
