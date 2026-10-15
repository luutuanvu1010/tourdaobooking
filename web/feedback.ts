// Trang Hỗ trợ (mã trang gopY, đường /feedback — ADR-0119 đợt 1): gửi yêu cầu tới một nhóm hỗ trợ, "Yêu cầu của tôi", luồng trả lời;
// thành viên nhóm (và Toàn quyền) có tab "Hàng đợi nhóm" (lọc, nhận việc); Toàn quyền có thêm tab "Quản lý nhóm".
// Dữ liệu qua /api/feedback*. Chuỗi từ người dùng chỉ đi qua h()/textContent. Địa chỉ: /feedback (danh sách), ?id=<uuid> (luồng), ?new=1&from=<đường dẫn> (mở form).
// Giao diện chỉ ẩn/hiện theo `teams` / `perms` máy chủ trả về; máy chủ (quyenPhieu) luôn kiểm lại.
import { FEEDBACK_KINDS, FEEDBACK_KIND_NAME, FEEDBACK_STATUSES, FEEDBACK_STATUS_NAME, FEEDBACK_TRANSITIONS, SAC_TRANG_THAI, buocGopY, nhanNutChuyen, type FeedbackStatus } from "../src/shared/feedback-catalog";
import { LOC_HANG_DOI, LOC_HANG_DOI_NAME, NHOM_KY_THUAT_ID, TEAM_ROLE_NAME, TEAM_ROLES, type LocHangDoi, type TeamRole } from "../src/shared/ve-ho-tro";
import { chuaAiNhan, duongHangDoi, hienNhanViec, nhomChuyenDuoc, nhomHangDoi, tabHoTro, type TabHoTro } from "../src/shared/ve-ho-tro-hien-thi";
import { isExternalPermission } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

declare const __BUILD_ID__: string | undefined;

const errorEl = byId("error");
const staff = await initShell();
const params = new URLSearchParams(location.search);

const fail = (err: unknown) => showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const when = (iso: string) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });

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

// ---- Nhóm hỗ trợ của người xem: nạp TRƯỚC mọi thứ (form, tab, luồng đều cần). Lỗi → coi như chỉ gửi được nhóm mặc định, không vỡ trang. ----------
let teams: Api.FeedbackTeamsResponse = { teams: [], mine: [], isSuper: false };
try {
  teams = await api<Api.FeedbackTeamsResponse>("/api/feedback/teams");
} catch {
  /* để rỗng: ô chọn nhóm ẩn, máy chủ tự gửi tới Kỹ thuật */
}
const tabs = tabHoTro(teams);
const hangDoiChon = nhomHangDoi(teams);
let tab: TabHoTro = "mine";
let queueTeam = hangDoiChon.find((x) => teams.mine.some((m) => m.teamId === x.id))?.id ?? hangDoiChon[0]?.id ?? "";
let loc: LocHangDoi = "ALL";
let statusFilter: FeedbackStatus | "" = "";
let clientRequestId = crypto.randomUUID(); // một lần khi mở form; giữ nguyên khi thử lại (mạng yếu) để máy chủ không tạo trùng

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
const teamSel = byId<HTMLSelectElement>("new-team");
replaceChildren(teamSel, ...teams.teams.map((t) => h("option", { value: t.id, selected: t.id === NHOM_KY_THUAT_ID }, t.name)));
const teamHint = (): void => {
  byId("new-team-hint").textContent = teams.teams.find((t) => t.id === teamSel.value)?.description ?? "";
};
teamSel.addEventListener("change", teamHint);
teamHint();
// Tài khoản bên ngoài chỉ gửi được nhóm Kỹ thuật (một nhóm) — không cần ô chọn; nạp nhóm lỗi (rỗng) cũng ẩn.
const coChonNhom = teams.teams.length > 1;
byId("new-team-label").hidden = !coChonNhom;

function openForm(): void {
  const ctx = collectContext();
  byId("new-context").textContent = `Sẽ đính kèm tự động: ${ctx.path ? `trang ${ctx.path}, ` : ""}thiết bị của bạn${ctx.standalone ? " (Nền tảng đã cài)" : ""}${ctx.appVersion ? `, phiên bản ${ctx.appVersion}` : ""}.`;
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
  if (coChonNhom && teamSel.value) body.teamId = teamSel.value;
  const r = await act(() => api<Api.FeedbackDetailResponse>("/api/feedback", { method: "POST", body }), btn);
  if (!r) return; // giữ nguyên clientRequestId: bấm Gửi lại sẽ không tạo trùng
  clientRequestId = crypto.randomUUID();
  byId<HTMLFormElement>("new-form").reset();
  newCard.hidden = true;
  location.replace(`/feedback?id=${r.ticket.id}`); // không assign: Back/bfcache không được đưa về form đã lưu (tránh gửi trùng yêu cầu)
});

/** «Nhận việc»: nhận phiếu cho chính mình. 409 «Vừa có người nhận…» hiện ở dòng báo lỗi; thành công hay không đều gọi `after` để thấy trạng thái mới. */
function nutNhanViec(t: Api.FeedbackTicketDto, nhan: string, after: () => void): HTMLButtonElement {
  const b = h("button", { type: "button", class: "btn", "data-nhan-viec": t.id }, nhan);
  b.addEventListener("click", async () => {
    await act(() => api<Api.FeedbackDetailResponse>(`/api/feedback/${t.id}/claim`, { method: "POST" }), b);
    after();
  });
  return b;
}

// ---- Danh sách ---------------------------------------------------------------------------------------------------
function ticketRow(t: Api.FeedbackTicketDto): HTMLElement {
  const link = h("a", { href: `/feedback?id=${t.id}` }, h("strong", null, `${t.code} · ${t.title}`));
  const oHangDoi = tab === "queue";
  return h(
    "div",
    { class: "list-row", "data-ticket": t.id },
    link,
    t.unread && h("span", { class: "badge badge-cancelled" }, "Mới"),
    h("div", { class: "muted" }, h("span", { class: `badge fb-badge is-${SAC_TRANG_THAI[t.status]}` }, t.statusName), ` ${t.kindName} · ${t.teamName} · ${when(t.lastActivityAt)}${oHangDoi && t.submitterName ? ` · ${t.submitterName}` : ""}`),
    oHangDoi && h("div", { class: "muted" }, chuaAiNhan(t) ? h("span", { class: "badge badge-draft" }, "Chưa ai nhận") : `Người xử lý: ${t.assigneeName ?? "?"}`),
    oHangDoi && hienNhanViec(t, staff.id) && nutNhanViec(t, "Nhận việc", () => void loadList()),
    t.mailPending && h("div", { class: "muted" }, "Chưa gửi được email báo nhóm"),
  );
}

const NHAN_TAB: Record<TabHoTro, string> = { mine: "Yêu cầu của tôi", queue: "Hàng đợi nhóm", teams: "Quản lý nhóm" };

async function loadList(): Promise<void> {
  replaceChildren(
    byId("tabs"),
    ...tabs.map((k) => h("button", { type: "button", class: tab === k ? "btn btn-primary" : "btn btn-link", "data-tab": k, onclick: () => ((tab = k), void loadList()) }, NHAN_TAB[k])),
    h("button", { type: "button", class: "btn btn-link", onclick: () => openForm() }, "+ Gửi yêu cầu mới"),
  );
  showError(errorEl, null);
  const summary = byId("summary");
  const list = byId("list");
  try {
    if (tab === "queue") {
      await loadQueue(summary, list);
    } else if (tab === "teams") {
      replaceChildren(summary);
      await loadTeamsAdmin(list);
    } else {
      replaceChildren(summary);
      const r = await api<Api.FeedbackListResponse>("/api/feedback/mine");
      replaceChildren(list, ...(r.tickets.length ? r.tickets.map(ticketRow) : [h("p", { class: "muted" }, "Bạn chưa gửi yêu cầu nào.")]));
    }
  } catch (err) {
    fail(err);
  }
}

async function loadQueue(summary: HTMLElement, list: HTMLElement): Promise<void> {
  const chonNhom = h(
    "select",
    { id: "queue-team", "aria-label": "Nhóm", onchange: (e: Event) => ((queueTeam = (e.target as HTMLSelectElement).value), void loadList()) },
    ...hangDoiChon.map((x) => h("option", { value: x.id, selected: x.id === queueTeam }, x.name)),
  );
  const locNut = h(
    "div",
    { class: "fb-status-nut", role: "group", "aria-label": "Lọc theo người nhận" },
    ...LOC_HANG_DOI.map((k) => h("button", { type: "button", class: loc === k ? "btn btn-primary" : "btn", "data-loc": k, "aria-pressed": String(loc === k), onclick: () => ((loc = k), void loadList()) }, LOC_HANG_DOI_NAME[k])),
  );
  const locTrangThai = h(
    "select",
    { id: "queue-status", "aria-label": "Trạng thái", onchange: (e: Event) => ((statusFilter = (e.target as HTMLSelectElement).value as FeedbackStatus | ""), void loadList()) },
    h("option", { value: "" }, "Mọi trạng thái"),
    ...FEEDBACK_STATUSES.map((s) => h("option", { value: s, selected: s === statusFilter }, FEEDBACK_STATUS_NAME[s])),
  );
  if (!queueTeam) {
    replaceChildren(summary);
    replaceChildren(list, h("p", { class: "muted" }, "Chưa có nhóm nào."));
    return;
  }
  const r = await api<Api.FeedbackQueueResponse>(duongHangDoi(queueTeam, loc, statusFilter));
  const weeks = [...new Set(r.stats.map((s) => s.week))];
  const count = (w: string, k: string) => r.stats.filter((s) => s.week === w && s.kind === k).reduce((n, s) => n + s.count, 0);
  replaceChildren(
    summary,
    hangDoiChon.length > 1 ? h("label", null, "Nhóm", chonNhom) : h("p", null, h("strong", null, hangDoiChon[0]?.name ?? "")),
    locNut,
    h("label", null, "Trạng thái", locTrangThai),
    weeks.length > 0 &&
      h("table", { class: "items" },
        h("thead", null, h("tr", null, h("th", null, "Tuần"), ...FEEDBACK_KINDS.map((k) => h("th", null, FEEDBACK_KIND_NAME[k])))),
        h("tbody", null, ...weeks.map((w) => h("tr", null, h("td", null, w), ...FEEDBACK_KINDS.map((k) => h("td", null, String(count(w, k)))))))),
  );
  replaceChildren(list, ...(r.tickets.length ? r.tickets.map(ticketRow) : [h("p", { class: "muted" }, "Chưa có yêu cầu nào.")]));
}

// ---- Quản lý nhóm (chỉ Toàn quyền; máy chủ: ô feedback.team.manage) ------------------------------------------------
let nhanVien: Api.StaffListRowDto[] | null = null;

async function loadTeamsAdmin(list: HTMLElement): Promise<void> {
  const [r, ds] = await Promise.all([
    api<Api.FeedbackAdminTeamsResponse>("/api/feedback/admin/teams"),
    nhanVien ? Promise.resolve(nhanVien) : api<Api.StaffListResponse>("/api/staff").then((x) => x.staff),
  ]);
  nhanVien = ds;
  // Chỉ tài khoản đang hoạt động, KHÔNG mang quyền bên ngoài (máy chủ từ chối cả hai — R6).
  const chonDuoc = ds.filter((s) => s.active && !s.permissions.some(isExternalPermission));
  replaceChildren(list, ...r.teams.map((t) => theNhom(t, chonDuoc)), formTaoNhom());
}

const ghiNhom = (path: string, method: string, body?: unknown) => api<{ team: Api.FeedbackAdminTeamDto }>(path, { method, body });

function theNhom(t: Api.FeedbackAdminTeamDto, chonDuoc: Api.StaffListRowDto[]): HTMLElement {
  const base = `/api/feedback/admin/teams/${t.id}`;
  const reload = () => void loadList();
  const nutNgung = t.id === NHOM_KY_THUAT_ID && t.active ? null : h("button", { type: "button", class: "btn" }, t.active ? "Ngưng" : "Dùng lại");
  nutNgung?.addEventListener("click", async () => {
    if (await act(() => ghiNhom(base, "PATCH", { active: !t.active }), nutNgung)) reload();
  });
  const nhayCam = h("input", { type: "checkbox", checked: t.sensitive });
  nhayCam.addEventListener("change", async () => {
    const r = await act(() => ghiNhom(base, "PATCH", { sensitive: nhayCam.checked }));
    if (!r) nhayCam.checked = t.sensitive;
    reload();
  });
  const thanhVien = t.members.map((m) => {
    const vaiKhac: TeamRole = m.role === "LEAD" ? "MEMBER" : "LEAD";
    const doiVai = h("button", { type: "button", class: "btn btn-link" }, `Đổi thành ${TEAM_ROLE_NAME[vaiKhac]}`);
    doiVai.addEventListener("click", async () => {
      if (await act(() => ghiNhom(`${base}/members/${m.staffId}`, "PUT", { role: vaiKhac }), doiVai)) reload();
    });
    const go = h("button", { type: "button", class: "btn btn-link" }, "Gỡ");
    go.addEventListener("click", async () => {
      if (await act(() => ghiNhom(`${base}/members/${m.staffId}`, "DELETE"), go)) reload();
    });
    return h("div", { class: "list-row", "data-member": m.staffId }, h("strong", null, m.name ?? "(không rõ tên)"), ` · ${TEAM_ROLE_NAME[m.role]} `, doiVai, go);
  });
  const coSan = new Set(t.members.map((m) => m.staffId));
  const chonNguoi = h("select", { "aria-label": `Nhân viên thêm vào nhóm ${t.name}` }, h("option", { value: "" }, "Chọn nhân viên…"),
    ...chonDuoc.filter((s) => !coSan.has(s.id)).map((s) => h("option", { value: s.id }, s.fullName)));
  const chonVai = h("select", { "aria-label": "Vai trong nhóm" }, ...TEAM_ROLES.map((v) => h("option", { value: v, selected: v === "MEMBER" }, TEAM_ROLE_NAME[v])));
  const them = h("button", { type: "button", class: "btn" }, "Thêm");
  them.addEventListener("click", async () => {
    if (!chonNguoi.value) return showError(errorEl, "Chọn nhân viên trước khi thêm.");
    if (await act(() => ghiNhom(`${base}/members/${chonNguoi.value}`, "PUT", { role: chonVai.value }), them)) reload();
  });
  return h(
    "section",
    { class: "card", "data-team": t.id },
    h("h3", null, t.name, " ", t.sensitive && h("span", { class: "badge badge-draft" }, "Nhạy cảm"), " ", !t.active && h("span", { class: "badge badge-cancelled" }, "Đã ngưng")),
    t.description && h("p", { class: "muted" }, t.description),
    h("label", null, nhayCam, " Nhạy cảm (tiêu đề không ra email chung và nhật ký)"),
    nutNgung,
    h("h4", null, "Thành viên"),
    ...(thanhVien.length ? thanhVien : [h("p", { class: "muted" }, "Chưa có thành viên.")]),
    h("div", { class: "grid" }, chonNguoi, chonVai, them),
  );
}

function formTaoNhom(): HTMLElement {
  const ma = h("input", { type: "text", maxLength: 40, placeholder: "VD: KINH_DOANH", autocapitalize: "characters" });
  const ten = h("input", { type: "text", maxLength: 80 });
  const moTa = h("input", { type: "text", maxLength: 200 });
  const nhayCam = h("input", { type: "checkbox" });
  const tao = h("button", { type: "button", class: "btn btn-primary" }, "Tạo nhóm");
  tao.addEventListener("click", async () => {
    const body = { code: ma.value.trim(), name: ten.value, description: moTa.value, sensitive: nhayCam.checked };
    if (await act(() => ghiNhom("/api/feedback/admin/teams", "POST", body), tao)) void loadList();
  });
  return h(
    "section",
    { class: "card" },
    h("h3", null, "Tạo nhóm mới"),
    h("div", { class: "grid" },
      h("label", null, "Mã nhóm (chữ HOA không dấu, số, gạch dưới)", ma),
      h("label", null, "Tên nhóm", ten),
      h("label", null, "Mô tả", moTa),
      h("label", null, nhayCam, " Nhạy cảm"),
      h("div", null, tao)),
  );
}

// ---- Luồng một yêu cầu -------------------------------------------------------------------------------------------
/** ≥ 900px: hiện đồng thời danh sách + luồng (2 cột). Dưới 900px: mở luồng thì ẩn danh sách như cũ (Đợt C Task 3). */
const wide = (): boolean => window.matchMedia("(min-width: 900px)").matches;

async function loadThread(id: string): Promise<void> {
  byId("list-card").hidden = !wide();
  const box = byId("thread");
  box.hidden = false;
  let d: Api.FeedbackDetailResponse | null = null;
  try {
    d = await api<Api.FeedbackDetailResponse>(`/api/feedback/${id}`);
  } catch (err) {
    fail(err);
  }
  // ≥ 900px danh sách hiện cạnh luồng: nạp lại SAU lời gọi trên (máy chủ vừa đánh dấu đã xem) — gọi mỗi lần loadThread() chạy
  // (mở, trả lời, đổi trạng thái) để danh sách không giữ trạng thái "Mới" cũ khi yêu cầu đã xong (góp ý 1/10).
  if (wide()) void loadList();
  if (!d) {
    replaceChildren(box, h("a", { href: "/feedback" }, "← Quay lại"));
    return;
  }
  const t = d.ticket;
  const perms = d.perms;
  const reload = () => void loadThread(id);
  const body = h("textarea", { rows: 4, maxLength: 4000, placeholder: "Viết phản hồi…" });
  const internal = h("input", { type: "checkbox" });
  const send = h("button", { type: "button", class: "btn btn-primary btn-chinh" }, "Gửi");
  send.addEventListener("click", async () => {
    const r = await act(() => api<Api.FeedbackDetailResponse>(`/api/feedback/${id}/messages`, { method: "POST", body: { body: body.value, internal: perms.xuLy && internal.checked } }), send);
    if (r) reload();
  });
  const controls: HTMLElement[] = [];
  if (perms.xuLy) {
    for (const to of FEEDBACK_TRANSITIONS[t.status]) {
      const b = h("button", { type: "button", class: "btn", "data-to": to }, nhanNutChuyen(t.status, to));
      b.addEventListener("click", async () => {
        // Tuyến theo nhóm (ADR-0119): chỉ gửi trạng thái — giao việc cho người khác là việc của Trưởng nhóm, đợt 1 chưa có ô chọn.
        await act(() => api<Api.FeedbackDetailResponse>(`/api/feedback/${id}/xu-ly`, { method: "PATCH", body: { status: to } }), b);
        reload(); // thành công hay 409 (trạng thái đã đổi) đều nạp lại để thấy trạng thái mới; lỗi vẫn hiện ở banner
      });
      controls.push(b);
    }
  }
  // Khối trạng thái nổi bật (chủ duyệt ảnh c, 30/9): tên trạng thái có màu + thanh bước Mới → Đã tiếp nhận → Đang xử lý → Đã xong; Từ chối là nhánh rẽ.
  const sac = SAC_TRANG_THAI[t.status];
  const buoc = buocGopY(t.status);
  const khoiTrangThai = h(
    "section",
    { class: `fb-status is-${sac}`, "aria-label": `Trạng thái: ${t.statusName}` },
    h("div", { class: "fb-status-nhan" }, sac === "xong" ? "✓ " : sac === "tu-choi" ? "✕ " : "● ", t.statusName),
    buoc
      ? h("ol", { class: "fb-steps" }, ...buoc.map((b, i) => h("li", { class: `fb-step is-${b.tinh}`, "aria-current": b.tinh === "dang" ? "step" : undefined },
          h("span", { class: "fb-step-dot", "aria-hidden": "true" }, b.tinh === "xong" ? "✓" : String(i + 1)), h("span", { class: "fb-step-nhan" }, b.nhan))))
      : h("p", { class: "muted fb-status-nhanh" }, "Mới → Đã tiếp nhận → Từ chối"),
    controls.length ? h("div", { class: "fb-status-nut" }, ...controls) : null,
  );
  // Người xử lý: ai cũng xem được tên; nhóm xử lý thấy nút «Nhận việc cho tôi» khi chưa ai nhận (giao người khác bằng ô chọn: đợt 2).
  const khoiNguoiXuLy = perms.xuLy
    ? h("p", { id: "fb-nguoi-xu-ly" }, chuaAiNhan(t) ? h("span", { class: "badge badge-draft" }, "Chưa ai nhận") : `Người xử lý: ${t.assigneeName ?? "?"}`, " ",
        hienNhanViec(t, staff.id) && nutNhanViec(t, "Nhận việc cho tôi", reload))
    : null;
  replaceChildren(
    box,
    h("a", { href: "/feedback" }, "← Danh sách"),
    h("h2", null, `${t.code} · ${t.title}`),
    h("p", { class: "muted" }, `${t.teamName} · ${t.kindName}${t.resolvedIn ? ` · sửa ở bản ${t.resolvedIn}` : ""} · ${t.submitterName ?? ""} · ${when(t.createdAt)}`),
    t.context.path || t.context.device || t.context.appVersion || t.context.orderCode
      ? h("p", { class: "muted" }, [t.context.path && `Trang: ${t.context.path}`, t.context.orderCode && `Đơn: ${t.context.orderCode}`, t.context.device && `Thiết bị: ${t.context.device}`, t.context.appVersion && `Bản: ${t.context.appVersion}`].filter(Boolean).join(" · "))
      : null,
    khoiTrangThai,
    khoiNguoiXuLy,
    perms.chuyenNhom && t.status !== "DONE" && t.status !== "DECLINED" ? khoiChuyenNhom(t, reload) : null,
    ...d.messages.map((m) =>
      h("div", { class: "card" }, h("div", { class: "muted" }, `${m.authorName ?? "?"} · ${when(m.createdAt)}`, m.internal && h("span", { class: "badge badge-draft" }, "Ghi chú nội bộ")), h("p", null, m.body)),
    ),
    h("label", null, "Trả lời", body),
    perms.xuLy && h("label", null, internal, " Ghi chú nội bộ (người gửi không thấy)"),
    send,
  );
}

/** Chuyển phiếu sang nhóm khác (Trưởng nhóm đang giữ phiếu hoặc Toàn quyền): nhóm nhận + lý do bắt buộc. Sau khi chuyển, người chuyển có thể mất quyền xem — nạp lại sẽ báo. */
function khoiChuyenNhom(t: Api.FeedbackTicketDto, reload: () => void): HTMLElement | null {
  const dich = nhomChuyenDuoc(teams, t.teamId);
  if (dich.length === 0) return null;
  const chon = h("select", { id: "fb-chuyen-nhom" }, ...dich.map((x) => h("option", { value: x.id }, x.name)));
  const lyDo = h("input", { id: "fb-chuyen-ly-do", type: "text", maxLength: 300 });
  const nut = h("button", { type: "button", class: "btn" }, "Chuyển");
  nut.addEventListener("click", async () => {
    if (!lyDo.value.trim()) return showError(errorEl, "Ghi lý do chuyển nhóm.");
    const r = await act(() => api<unknown>(`/api/feedback/${t.id}/transfer`, { method: "POST", body: { teamId: chon.value, reason: lyDo.value } }), nut);
    if (r !== undefined) reload();
  });
  return h(
    "details",
    { class: "card", id: "fb-chuyen" },
    h("summary", null, "Chuyển nhóm"),
    h("div", { class: "grid" }, h("label", null, "Nhóm nhận", chon), h("label", null, "Lý do", lyDo), h("div", null, nut)),
  );
}

const id = params.get("id");
if (id) {
  // ≥ 900px: danh sách hiện cùng luồng (Đợt C Task 3) — loadThread() tự nạp nó SAU khi máy chủ đánh dấu đã xem; không gọi song
  // song ở đây vì lời gọi đó có thể về sau cùng và ghi đè danh sách bằng dữ liệu cũ.
  void loadThread(id);
  // Đăng ký MỘT LẦN cho lần tải trang này (loadThread() có thể được gọi lại sau khi gửi trả lời/đổi trạng thái,
  // nhưng listener chỉ cần gắn một lần ở đây): đổi khổ cửa sổ qua mốc 900px ngay trên trang đang mở luồng
  // (không load lại trang) phải đồng bộ lại ẩn/hiện danh sách, không chỉ chụp giá trị lúc tải trang.
  const mq = window.matchMedia("(min-width: 900px)");
  mq.addEventListener("change", () => {
    byId("list-card").hidden = !mq.matches;
    // Hẹp → rộng: danh sách vừa hiện lại phải có nội dung ngay, không chỉ khung rỗng
    // (như đường tải trang khi mở ?id= ở khổ rộng, phía trên).
    // loadList() tự dựng lại toàn bộ tabs/summary/list từ đầu mỗi lần gọi nên gọi lại nhiều lần (resize qua lại mốc) an toàn.
    if (mq.matches) void loadList();
  });
} else {
  void loadList();
  if (params.get("new") === "1") openForm();
}
