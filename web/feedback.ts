// Trang Góp ý / Báo lỗi: gửi yêu cầu mới, "Yêu cầu của tôi", luồng trả lời; admin có thêm tab "Hàng đợi" (lọc, đổi trạng thái, ghi chú nội bộ).
// Dữ liệu qua /api/feedback*. Chuỗi từ người dùng chỉ đi qua h()/textContent. Địa chỉ: /feedback (danh sách), ?id=<uuid> (luồng), ?new=1&from=<đường dẫn> (mở form).
import { FEEDBACK_KINDS, FEEDBACK_KIND_NAME, FEEDBACK_STATUSES, FEEDBACK_STATUS_NAME, FEEDBACK_TRANSITIONS, type FeedbackStatus } from "../src/shared/feedback-catalog";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

declare const __BUILD_ID__: string | undefined;

const errorEl = byId("error");
const staff = await initShell();
const isAdmin = staff.permissions.includes("ADMIN");
const params = new URLSearchParams(location.search);

let tab: "mine" | "queue" = "mine";
let statusFilter: FeedbackStatus | "" = "";
let clientRequestId = crypto.randomUUID(); // một lần khi mở form; giữ nguyên khi thử lại (mạng yếu) để máy chủ không tạo trùng

const fail = (err: unknown) => showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const when = (iso: string) => new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

/** Thao tác GHI: khoá nút từ lúc bấm đến khi xong (bấm đúp không gửi hai lần), mở lại ở finally. */
async function act<T>(fn: () => Promise<T>, btn?: HTMLButtonElement | null): Promise<T | undefined> {
  if (btn?.disabled) return undefined;
  showError(errorEl, null);
  if (btn) btn.disabled = true;
  try {
    return await fn();
  } catch (err) {
    fail(err);
    return undefined;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function collectContext(): Api.FeedbackContextDto {
  const from = params.get("from");
  const nav = navigator as Navigator & { standalone?: boolean };
  const ctx: Api.FeedbackContextDto = {
    device: navigator.userAgent.slice(0, 120),
    standalone: window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
  };
  if (from && from.startsWith("/")) ctx.path = from.slice(0, 200);
  if (typeof __BUILD_ID__ !== "undefined") ctx.appVersion = __BUILD_ID__;
  return ctx;
}

// ---- Form gửi mới ------------------------------------------------------------------------------------------------
const newCard = byId("new-card");
const kindSel = byId<HTMLSelectElement>("new-kind");
replaceChildren(kindSel, ...FEEDBACK_KINDS.map((k) => h("option", { value: k }, FEEDBACK_KIND_NAME[k])));
function openForm(): void {
  const ctx = collectContext();
  byId("new-context").textContent = `Sẽ đính kèm tự động: ${ctx.path ? `trang ${ctx.path}, ` : ""}thiết bị của bạn${ctx.standalone ? " (app đã cài)" : ""}${ctx.appVersion ? `, phiên bản ${ctx.appVersion}` : ""}.`;
  newCard.hidden = false;
  byId("new-title").focus();
}
byId("new-cancel").addEventListener("click", () => (newCard.hidden = true));
byId<HTMLFormElement>("new-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = byId<HTMLButtonElement>("new-submit");
  const body: Api.FeedbackCreateInput = {
    kind: kindSel.value as Api.FeedbackKind,
    title: byId<HTMLInputElement>("new-title").value,
    body: byId<HTMLTextAreaElement>("new-body").value,
    clientRequestId,
    context: collectContext(),
  };
  const r = await act(() => api<Api.FeedbackDetailResponse>("/api/feedback", { method: "POST", body }), btn);
  if (!r) return; // giữ nguyên clientRequestId: bấm Gửi lại sẽ không tạo trùng
  clientRequestId = crypto.randomUUID();
  byId<HTMLFormElement>("new-form").reset();
  newCard.hidden = true;
  location.assign(`/feedback?id=${r.ticket.id}`);
});

// ---- Danh sách ---------------------------------------------------------------------------------------------------
function ticketRow(t: Api.FeedbackTicketDto): HTMLElement {
  const link = h("a", { href: `/feedback?id=${t.id}` }, h("strong", null, `${t.code} · ${t.title}`));
  return h(
    "div",
    { class: "list-row" },
    link,
    t.unread && h("span", { class: "badge badge-cancelled" }, "Mới"),
    h("div", { class: "muted" }, `${t.kindName} · ${t.statusName} · ${when(t.lastActivityAt)}${tab === "queue" && t.submitterName ? ` · ${t.submitterName}` : ""}`),
    t.mailPending && h("div", { class: "muted" }, "Chưa gửi được email báo admin"),
  );
}

async function loadList(): Promise<void> {
  const tabs = byId("tabs");
  replaceChildren(
    tabs,
    h("button", { type: "button", class: tab === "mine" ? "btn btn-primary" : "btn btn-link", onclick: () => ((tab = "mine"), void loadList()) }, "Yêu cầu của tôi"),
    isAdmin && h("button", { type: "button", class: tab === "queue" ? "btn btn-primary" : "btn btn-link", onclick: () => ((tab = "queue"), void loadList()) }, "Hàng đợi"),
    h("button", { type: "button", class: "btn btn-link", onclick: () => ((newCard.hidden = false), openForm()) }, "+ Gửi yêu cầu mới"),
  );
  showError(errorEl, null);
  const summary = byId("summary");
  try {
    if (tab === "queue") {
      const q = statusFilter ? `?status=${statusFilter}` : "";
      const r = await api<Api.FeedbackQueueResponse>(`/api/feedback${q}`);
      const filter = h("select", { onchange: (e: Event) => ((statusFilter = (e.target as HTMLSelectElement).value as FeedbackStatus | ""), void loadList()) },
        h("option", { value: "" }, "Mọi trạng thái"), ...FEEDBACK_STATUSES.map((s) => h("option", { value: s, selected: s === statusFilter }, FEEDBACK_STATUS_NAME[s])));
      const weeks = [...new Set(r.stats.map((s) => s.week))];
      const count = (w: string, k: string) => r.stats.filter((s) => s.week === w && s.kind === k).reduce((n, s) => n + s.count, 0);
      replaceChildren(
        summary,
        filter,
        weeks.length > 0 &&
          h("table", { class: "items" },
            h("thead", null, h("tr", null, h("th", null, "Tuần"), ...FEEDBACK_KINDS.map((k) => h("th", null, FEEDBACK_KIND_NAME[k])))),
            h("tbody", null, ...weeks.map((w) => h("tr", null, h("td", null, w), ...FEEDBACK_KINDS.map((k) => h("td", null, String(count(w, k)))))))),
      );
      replaceChildren(byId("list"), ...(r.tickets.length ? r.tickets.map(ticketRow) : [h("p", { class: "muted" }, "Chưa có yêu cầu nào.")]));
    } else {
      replaceChildren(summary);
      const r = await api<Api.FeedbackListResponse>("/api/feedback/mine");
      replaceChildren(byId("list"), ...(r.tickets.length ? r.tickets.map(ticketRow) : [h("p", { class: "muted" }, "Bạn chưa gửi yêu cầu nào.")]));
    }
  } catch (err) {
    fail(err);
  }
}

// ---- Luồng một yêu cầu -------------------------------------------------------------------------------------------
async function loadThread(id: string): Promise<void> {
  byId("list-card").hidden = true;
  const box = byId("thread");
  box.hidden = false;
  let d: Api.FeedbackDetailResponse;
  try {
    d = await api<Api.FeedbackDetailResponse>(`/api/feedback/${id}`);
  } catch (err) {
    fail(err);
    replaceChildren(box, h("a", { href: "/feedback" }, "← Quay lại"));
    return;
  }
  const t = d.ticket;
  const body = h("textarea", { rows: 4, maxLength: 4000, placeholder: "Viết phản hồi…" });
  const internal = h("input", { type: "checkbox" });
  const send = h("button", { type: "button", class: "btn btn-primary" }, "Gửi");
  send.addEventListener("click", async () => {
    const r = await act(() => api<Api.FeedbackDetailResponse>(`/api/feedback/${id}/messages`, { method: "POST", body: { body: body.value, internal: d.canTriage && internal.checked } }), send);
    if (r) void loadThread(id);
  });
  const controls: HTMLElement[] = [];
  if (d.canTriage) {
    for (const to of FEEDBACK_TRANSITIONS[t.status]) {
      const b = h("button", { type: "button", class: "btn btn-link" }, `→ ${FEEDBACK_STATUS_NAME[to]}`);
      b.addEventListener("click", async () => {
        await act(() => api<Api.FeedbackDetailResponse>(`/api/feedback/${id}`, { method: "PATCH", body: { status: to } }), b);
        void loadThread(id); // thành công hay 409 (trạng thái đã đổi) đều nạp lại để thấy trạng thái mới; lỗi vẫn hiện ở banner
      });
      controls.push(b);
    }
  }
  replaceChildren(
    box,
    h("a", { href: "/feedback" }, "← Danh sách"),
    h("h2", null, `${t.code} · ${t.title}`),
    h("p", { class: "muted" }, `${t.kindName} · ${t.statusName}${t.resolvedIn ? ` · sửa ở bản ${t.resolvedIn}` : ""} · ${t.submitterName ?? ""} · ${when(t.createdAt)}`),
    t.context.path || t.context.device || t.context.appVersion
      ? h("p", { class: "muted" }, [t.context.path && `Trang: ${t.context.path}`, t.context.orderCode && `Đơn: ${t.context.orderCode}`, t.context.device && `Thiết bị: ${t.context.device}`, t.context.appVersion && `Bản: ${t.context.appVersion}`].filter(Boolean).join(" · "))
      : null,
    ...controls,
    ...d.messages.map((m) =>
      h("div", { class: "card" }, h("div", { class: "muted" }, `${m.authorName ?? "?"} · ${when(m.createdAt)}`, m.internal && h("span", { class: "badge badge-draft" }, "Ghi chú nội bộ")), h("p", null, m.body)),
    ),
    h("label", null, "Trả lời", body),
    d.canTriage && h("label", null, internal, " Ghi chú nội bộ (người gửi không thấy)"),
    send,
  );
}

const id = params.get("id");
if (id) void loadThread(id);
else {
  void loadList();
  if (params.get("new") === "1") openForm();
}
