import { AUDIT_ACTIONS, AUDIT_GROUPS, type AuditAction, type AuditGroup } from "../src/shared/audit-actions";
import { can } from "../src/shared/permissions";
import { ApiError, api, type AuditRecord, type Api } from "./api";
import { append, byId, h, replaceChildren } from "./dom";
import { actionLabel, dateTime } from "./format";
import { initShell, showError } from "./shell";

const PAGE = 50;
const qInput = byId<HTMLInputElement>("q");
const actionSel = byId<HTMLSelectElement>("action");
const listEl = byId("list");
const listCardsEl = byId("list-cards");
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

/** "2026-09-21T08:05:00.000Z" → "21/09/2026" (giờ Việt Nam) — dùng làm khoá nhóm theo ngày. */
function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
}

function auditCard(e: AuditRecord): HTMLElement {
  const time = new Date(e.at).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
  return h(
    "div",
    { class: "card card-col" },
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
      out.push(h("div", { class: "muted", style: "font-weight:var(--fw-semibold);margin-top:var(--s3)" }, day));
      lastDay = day;
    }
    out.push(auditCard(e));
  }
  return out;
}

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
      // Tải thêm: cardGroups(entries) chỉ nhóm TRANG MỚI, không tính lại toàn bộ danh sách đang có — nếu bản ghi đầu trang mới
      // cùng ngày với bản ghi cuối trang cũ sẽ hiện hai tiêu đề ngày liền kề trùng nhau. Lỗi biết trước, chấp nhận cho Đợt A.
      listCardsEl.append(...cardGroups(entries));
    }
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
if (!can(staff, "audit.view")) showError(errorEl, "Trang Nhật ký chỉ người phụ trách hệ thống xem được."); // ADR-0038 điều 6
else await load(true);
