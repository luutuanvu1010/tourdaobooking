// Trang Hỗ trợ (mã trang gopY, đường /feedback — ADR-0119 đợt 1): gửi yêu cầu tới một nhóm hỗ trợ, "Yêu cầu của tôi", luồng trả lời;
// thành viên nhóm (và Toàn quyền) có tab "Hàng đợi nhóm" (lọc, nhận việc); Toàn quyền có thêm tab "Quản lý nhóm".
// Dữ liệu qua /api/feedback*. Chuỗi từ người dùng chỉ đi qua h()/textContent. Địa chỉ: /feedback (danh sách), ?id=<uuid> (luồng), ?new=1&from=<đường dẫn> (mở form).
// Giao diện chỉ ẩn/hiện theo `teams` / `perms` máy chủ trả về; máy chủ (quyenPhieu) luôn kiểm lại.
import { FEEDBACK_KINDS, FEEDBACK_KIND_NAME, FEEDBACK_STATUS_NAME, FEEDBACK_TRANSITIONS, SAC_TRANG_THAI, buocGopY, nhanNutChuyen } from "../src/shared/feedback-catalog";
import { NHOM_KY_THUAT_ID, PRIORITIES, PRIORITY_NAME, TEAM_ROLE_NAME, TEAM_ROLES, type Priority, type TeamRole } from "../src/shared/ve-ho-tro";
import {
  LAM_MOI_GOI_NGAY_TOI_DA, NHAN_TAB, buocLamMoi, chuKyLamMoi, dauPhieuDoi, hienNhanViec, nguoiXuLyHienThi, nhanDonChon, nhomChuyenDuoc, nhomHangDoi, tabHoTro, type TabHoTro,
} from "../src/shared/ve-ho-tro-hien-thi";
import { can, isExternalPermission } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { veDanhSach } from "./ho-tro-danh-sach";
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

// Ô «Đơn liên quan» (ADR-0127): chỉ đơn do chính người gửi lập (máy chủ kiểm lại lúc gửi); hỏi bảng quyền trước, không có quyền / lỗi / danh sách rỗng ⇒ ẩn ô.
const orderSel = byId<HTMLSelectElement>("new-order");
let daNapDon = false;
async function napDonCuaToi(): Promise<void> {
  if (daNapDon || !can(staff, "order.view", { ownerId: staff.id })) return;
  daNapDon = true;
  try {
    const r = await api<Api.FeedbackMyOrdersResponse>("/api/feedback/my-orders");
    replaceChildren(orderSel, h("option", { value: "" }, "Không gắn đơn"), ...r.orders.map((o) => h("option", { value: o.id }, nhanDonChon(o))));
    byId("new-order-label").hidden = r.orders.length === 0;
  } catch {
    daNapDon = false; // để lần mở form sau thử lại; ô vẫn ẩn
  }
}

function openForm(): void {
  void napDonCuaToi();
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
  if (!byId("new-order-label").hidden && orderSel.value) body.orderId = orderSel.value;
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

// ---- Khung: thanh thẻ + danh sách (PR 3) -------------------------------------------------------------------------
// Danh sách hai thẻ nằm ở web/ho-tro-danh-sach.ts; thẻ «Nhóm hỗ trợ» (quản lý nhóm) còn ở file này cho tới Task 5.
const idDangMo = params.get("id");
let dsDangDung: { napLai(): void } | null = null;
let theDangDung: TabHoTro | null = null;
let demHangDoi = 0;

function veThanhThe(): void {
  replaceChildren(
    byId("ht-tabs"),
    ...tabs.map((k) => {
      const b = h("button", { type: "button", role: "tab", "aria-selected": String(tab === k), class: `ht-tab${tab === k ? " is-on" : ""}`, "data-tab": k },
        NHAN_TAB[k], k === "queue" && demHangDoi > 0 && h("span", { class: "ht-dem", "aria-label": `${demHangDoi} việc chưa ai nhận` }, String(demHangDoi)));
      b.addEventListener("click", () => {
        if (tab === k) return;
        tab = k;
        void loadList();
      });
      return b;
    }),
  );
  byId("ht-gui").className = tab === "mine" ? "btn btn-primary" : "btn";
}

async function napHuyHieu(): Promise<void> {
  if (!tabs.includes("queue")) return;
  try {
    const b = await api<Api.FeedbackBadgeResponse>("/api/feedback/badge");
    if (b.queue !== demHangDoi) {
      demHangDoi = b.queue;
      veThanhThe();
    }
  } catch {
    /* huy hiệu chỉ là phụ: lỗi thì thôi */
  }
}

/** Dựng thanh thẻ + nội dung thẻ đang chọn. Thẻ danh sách: dựng một lần rồi chỉ nạp lại; gọi lại nhiều lần (luồng đổi, đổi khổ) đều an toàn. */
async function loadList(): Promise<void> {
  showError(errorEl, null);
  veThanhThe();
  const goc = byId("ht-danh-sach");
  byId("ht-hai-cot").classList.toggle("is-mot-cot", tab === "teams");
  if (tab === "teams") {
    dsDangDung = null;
    theDangDung = null;
    byId("ht-luong").hidden = true;
    const list = h("div", { id: "list" });
    replaceChildren(goc, list);
    try {
      await loadTeamsAdmin(list);
    } catch (err) {
      fail(err);
    }
    return;
  }
  if (idDangMo) byId("ht-luong").hidden = false;
  if (dsDangDung && theDangDung === tab) dsDangDung.napLai();
  else {
    theDangDung = tab;
    dsDangDung = veDanhSach(goc, {
      the: tab,
      nhom: tab === "queue" ? hangDoiChon : [],
      nhomMacDinh: queueTeam,
      staffId: staff.id,
      dangMo: idDangMo,
      nutNhanViec,
      baoLoi: fail,
      moYeuCau: (yc) => location.assign(`/feedback?id=${encodeURIComponent(yc)}`), // Task 3 chuyển sang mở tại chỗ
    });
  }
  void napHuyHieu();
}

byId("ht-gui").addEventListener("click", () => openForm());

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
  const chonVai = h("select", { "aria-label": "Vai trò trong nhóm" }, ...TEAM_ROLES.map((v) => h("option", { value: v, selected: v === "MEMBER" }, TEAM_ROLE_NAME[v])));
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

/** Bản nháp ô trả lời theo phiếu: giữ qua mọi lần dựng lại khung (đổi trạng thái, mức ưu tiên, giao việc) — chỉ xoá khi gửi thành công. */
const banNhap = new Map<string, { body: string; internal: boolean }>();

/**
 * Tự làm mới khung trò chuyện (ADR-0127, đặc tả 2.1). MỘT vòng cho cả trang: mỗi lần loadThread() tăng `doiLuong`; vòng / lời gọi của đời cũ thấy đời đổi thì bỏ
 * (không vẽ trạng thái cũ đè lên kết quả lệnh ghi vừa xong). Hẹn giờ bằng setTimeout nối nhau sau khi lời gọi trước xong ⇒ không bao giờ hai lời gọi chồng nhau.
 * Không gọi fail() (dòng báo lỗi không nháy mỗi 5 giây): 404/403 ⇒ dừng hẳn kèm câu báo; lỗi khác (mạng…) ⇒ bỏ qua lần đó. Tuyến làm mới không ghi «đã xem».
 */
interface LamMoi {
  doi: number;
  id: string;
  tin: Api.FeedbackMessageDto[];
  since: string;
  /** Giờ tạo phiếu: mốc khi chưa có tin nào. */
  macDinh: string;
  dau: Api.FeedbackMessagesSinceResponse["ticket"];
  hen?: ReturnType<typeof setTimeout>;
  dangGoi: boolean;
  dung: boolean;
  /** Vẽ phần trả về lên khung (do loadThread dựng, giữ tham chiếu tới đúng các phần tử của đời đó). */
  ve: (r: Api.FeedbackMessagesSinceResponse, moi: Api.FeedbackMessageDto[]) => void;
  dungVi: () => void;
}
let doiLuong = 0;
let lm: LamMoi | null = null;

function henLamMoi(s: LamMoi): void {
  clearTimeout(s.hen);
  s.hen = undefined;
  if (s.dung || s.doi !== doiLuong || document.visibilityState !== "visible") return; // ẩn tab: dừng; hiện lại thì visibilitychange gọi ngay
  s.hen = setTimeout(() => void vongLamMoi(s), chuKyLamMoi(s.dau.status));
}

async function vongLamMoi(s: LamMoi, lanGoiNgay = 0): Promise<void> {
  if (s.dung || s.dangGoi || s.doi !== doiLuong || document.visibilityState !== "visible") return;
  s.dangGoi = true;
  let r: Api.FeedbackMessagesSinceResponse;
  try {
    r = await api<Api.FeedbackMessagesSinceResponse>(`/api/feedback/${s.id}/messages?since=${encodeURIComponent(s.since)}`);
  } catch (err) {
    s.dangGoi = false;
    if (s.doi !== doiLuong) return;
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      s.dung = true;
      s.dungVi();
      return;
    }
    henLamMoi(s); // lỗi mạng / máy chủ: bỏ qua lần này
    return;
  }
  s.dangGoi = false;
  if (s.doi !== doiLuong || s.dung) return;
  const b = buocLamMoi(s.tin, r.messages, s.macDinh);
  s.tin = b.tin;
  s.since = b.since;
  s.ve(r, b.moi);
  s.dau = r.ticket;
  if (b.goiNgay && lanGoiNgay < LAM_MOI_GOI_NGAY_TOI_DA) return void vongLamMoi(s, lanGoiNgay + 1);
  henLamMoi(s);
}

document.addEventListener("visibilitychange", () => {
  if (!lm) return;
  if (document.visibilityState === "visible") {
    clearTimeout(lm.hen);
    lm.hen = undefined;
    void vongLamMoi(lm);
  } else {
    clearTimeout(lm.hen); // tab ẩn: không gọi gì
    lm.hen = undefined;
  }
});

/** Một bong bóng tin: của mình bên phải, của người khác bên trái, ghi chú nội bộ viền riêng. Giữ lớp `card` (kịch bản Chrome đợt 1 tìm tin theo `#thread .card`). */
const bongBong = (m: Api.FeedbackMessageDto): HTMLElement =>
  h("div", { class: `card fb-tin${m.mine ? " is-minh" : ""}${m.internal ? " is-noi-bo" : ""}`, "data-tin": m.id },
    h("div", { class: "muted fb-tin-dau" }, `${m.authorName ?? "?"} · ${when(m.createdAt)}`, m.internal && h("span", { class: "badge badge-draft" }, "Ghi chú nội bộ")),
    h("p", null, m.body));

/** Chèn bong bóng còn thiếu đúng vị trí theo danh sách đã gộp — không dựng lại các tin đang hiện (không mất chỗ đang đọc). */
function veTin(ds: HTMLElement, tin: readonly Api.FeedbackMessageDto[]): void {
  const coSan = new Map<string, Element>();
  for (const el of ds.querySelectorAll("[data-tin]")) coSan.set(el.getAttribute("data-tin") ?? "", el);
  let cur: Element | null = ds.firstElementChild;
  for (const m of tin) {
    const el = coSan.get(m.id) ?? bongBong(m);
    if (el === cur) cur = cur.nextElementSibling;
    else ds.insertBefore(el, cur);
  }
}

/** Người xem đang ở gần cuối trang (đọc tin mới nhất / đang gõ trả lời) — chỉ khi đó mới cuộn theo tin mới. */
const oCuoiTrang = (): boolean => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;

async function loadThread(id: string): Promise<void> {
  const doiNay = ++doiLuong;
  if (lm) {
    clearTimeout(lm.hen);
    lm.dung = true;
    lm = null;
  }
  byId("ht-danh-sach").hidden = !wide();
  byId("ht-tabs").hidden = !wide();
  const box = byId("ht-luong");
  box.hidden = false;
  let d: Api.FeedbackDetailResponse | null = null;
  let loiMo = "";
  try {
    d = await api<Api.FeedbackDetailResponse>(`/api/feedback/${id}`);
  } catch (err) {
    fail(err);
    loiMo = err instanceof ApiError ? err.message : "Không kết nối được máy chủ.";
  }
  if (doiNay !== doiLuong) return; // đã có lần nạp mới hơn
  // ≥ 900px danh sách hiện cạnh luồng: nạp lại SAU lời gọi trên (máy chủ vừa đánh dấu đã xem) — gọi mỗi lần loadThread() chạy
  // (mở, trả lời, đổi trạng thái) để danh sách không giữ trạng thái "Mới" cũ khi yêu cầu đã xong (góp ý 1/10). Vòng tự làm mới KHÔNG nạp danh sách.
  if (wide()) void loadList();
  if (!d) {
    // Câu lỗi ghi NGAY trong khung luồng: ≥ 900px loadList() phía trên xoá dòng báo lỗi chung khi dựng lại danh sách.
    replaceChildren(box, h("a", { href: "/feedback" }, "← Quay lại"), h("p", { class: "muted", id: "fb-loi-mo" }, loiMo));
    return;
  }
  const t = d.ticket;
  const perms = d.perms;
  const reload = () => void loadThread(id);
  const nhap = banNhap.get(id) ?? { body: "", internal: false };
  const body = h("textarea", { rows: 4, maxLength: 4000, placeholder: "Viết phản hồi…", value: nhap.body });
  const internal = h("input", { type: "checkbox", checked: perms.xuLy && nhap.internal });
  const luuNhap = () => banNhap.set(id, { body: body.value, internal: internal.checked });
  body.addEventListener("input", luuNhap);
  internal.addEventListener("change", luuNhap);
  const send = h("button", { type: "button", class: "btn btn-primary btn-chinh" }, "Gửi");
  send.addEventListener("click", async () => {
    const r = await act(() => api<Api.FeedbackDetailResponse>(`/api/feedback/${id}/messages`, { method: "POST", body: { body: body.value, internal: perms.xuLy && internal.checked } }), send);
    if (!r) return;
    banNhap.delete(id);
    reload();
  });

  const khoiDau = h("div", { id: "fb-dau" }, ...dungDau(t, perms, reload));
  // Khối chuyển nhóm chỉ có khi phiếu còn mở: vòng làm mới thấy trạng thái đổi (đóng / mở lại) thì dựng lại ngay sau khối đầu.
  const dungChuyen = (): HTMLElement | null => (perms.chuyenNhom && t.status !== "DONE" && t.status !== "DECLINED" ? khoiChuyenNhom(t) : null);
  let khoiChuyen = dungChuyen();
  const tinDs = h("div", { class: "fb-tin-ds", id: "fb-tin-ds" });
  veTin(tinDs, d.messages);
  const traLoi = h("div", { id: "fb-tra-loi" }, h("label", null, "Trả lời", body), perms.xuLy && h("label", null, internal, " Ghi chú nội bộ (người gửi không thấy)"), send);
  const baoDung = h("p", { class: "alert", role: "status", id: "fb-lam-moi-dung", hidden: true });
  const baoChuyen = h("p", { class: "muted", role: "status", id: "fb-da-doi-nhom", hidden: true }, "Phiếu vừa được chuyển sang nhóm khác. ",
    h("button", { type: "button", class: "btn btn-link", onclick: reload }, "Tải lại phiếu"));
  replaceChildren(
    box,
    h("a", { href: "/feedback" }, "← Danh sách"),
    h("h2", null, `${t.code} · ${t.title}`),
    h("p", { class: "muted" }, `${t.teamName} · ${t.kindName}${t.resolvedIn ? ` · sửa ở bản ${t.resolvedIn}` : ""} · ${t.submitterName ?? ""} · ${when(t.createdAt)}`),
    t.orderId && t.orderCode
      ? h("p", { id: "fb-don" }, "Đơn liên quan: ", h("a", { href: `/order?id=${encodeURIComponent(t.orderId)}` }, t.orderCode))
      : null,
    t.context.path || t.context.device || t.context.appVersion || (t.context.orderCode && !t.orderCode)
      ? h("p", { class: "muted" }, [t.context.path && `Trang: ${t.context.path}`, !t.orderCode && t.context.orderCode && `Đơn: ${t.context.orderCode}`, t.context.device && `Thiết bị: ${t.context.device}`, t.context.appVersion && `Bản: ${t.context.appVersion}`].filter(Boolean).join(" · "))
      : null,
    baoDung,
    baoChuyen,
    khoiDau,
    khoiChuyen,
    tinDs,
    traLoi,
  );

  const s: LamMoi = {
    doi: doiNay,
    id,
    tin: [],
    since: "",
    macDinh: t.createdAt,
    dau: { status: t.status, assigneeId: t.assigneeId, assigneeName: t.assigneeName, assigneeActive: t.assigneeActive, priority: t.priority, teamId: t.teamId },
    dangGoi: false,
    dung: false,
    ve: (r, moi) => {
      if (moi.length) {
        const cuoi = oCuoiTrang();
        veTin(tinDs, s.tin);
        if (cuoi) window.scrollTo({ top: document.documentElement.scrollHeight });
      }
      if (r.ticket.teamId !== t.teamId) baoChuyen.hidden = false; // quyền trên nhóm mới (perms) chỉ có ở tuyến chi tiết: người xem tự bấm tải lại
      if (dauPhieuDoi(s.dau, r.ticket)) {
        const doiTrangThai = r.ticket.status !== t.status;
        Object.assign(t, { status: r.ticket.status, statusName: FEEDBACK_STATUS_NAME[r.ticket.status], assigneeId: r.ticket.assigneeId, assigneeName: r.ticket.assigneeName, assigneeActive: r.ticket.assigneeActive, priority: r.ticket.priority });
        replaceChildren(khoiDau, ...dungDau(t, perms, reload));
        if (doiTrangThai) {
          const moi = dungChuyen();
          if (khoiChuyen) khoiChuyen.replaceWith(...(moi ? [moi] : []));
          else if (moi) khoiDau.after(moi);
          khoiChuyen = moi;
        }
      }
    },
    dungVi: () => {
      baoDung.textContent = "Phiếu này không còn trong nhóm của bạn.";
      baoDung.hidden = false;
      traLoi.hidden = true;
      khoiDau.hidden = true; // nút đổi trạng thái / mức / giao việc không còn dùng được: ẩn cùng ô trả lời
      if (khoiChuyen) khoiChuyen.hidden = true;
    },
  };
  const b0 = buocLamMoi([], d.messages, t.createdAt);
  s.tin = b0.tin;
  s.since = b0.since;
  lm = s;
  henLamMoi(s);
}

/** Khối đầu phiếu: trạng thái (+ nút chuyển), mức ưu tiên, người xử lý (+ nhận việc / giao cho người khác). Dựng lại khi lần làm mới thấy đầu phiếu đổi. */
function dungDau(t: Api.FeedbackTicketDto, perms: Api.FeedbackDetailResponse["perms"], reload: () => void): HTMLElement[] {
  const controls: HTMLElement[] = [];
  if (perms.xuLy) {
    for (const to of FEEDBACK_TRANSITIONS[t.status]) {
      const b = h("button", { type: "button", class: "btn", "data-to": to }, nhanNutChuyen(t.status, to));
      b.addEventListener("click", async () => {
        await act(() => api<Api.FeedbackDetailResponse>(`/api/feedback/${t.id}/xu-ly`, { method: "PATCH", body: { status: to } }), b);
        reload(); // thành công hay 409 (trạng thái đã đổi) đều nạp lại để thấy trạng thái mới; lỗi vẫn hiện ở banner; bản nháp trả lời được giữ
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
  return [khoiTrangThai, khoiUuTien(t, perms.xuLy, reload), ...(perms.xuLy ? [khoiNguoiXuLy(t, perms.giaoViec, reload)] : [])];
}

/** Mức ưu tiên (ADR-0127): người xử lý chọn bằng ô; người khác chỉ thấy nhãn. Máy chủ kiểm lại (quyenPhieu.xuLy). */
function khoiUuTien(t: Api.FeedbackTicketDto, xuLy: boolean, reload: () => void): HTMLElement {
  if (!xuLy) return h("p", { id: "fb-uu-tien-nhan" }, "Mức ưu tiên: ", h("strong", null, PRIORITY_NAME[t.priority]));
  const chon = h("select", { id: "fb-uu-tien" }, ...PRIORITIES.map((p) => h("option", { value: p, selected: p === t.priority }, PRIORITY_NAME[p])));
  chon.addEventListener("change", async () => {
    const r = await act(() => api<Api.FeedbackDetailResponse>(`/api/feedback/${t.id}/xu-ly`, { method: "PATCH", body: { priority: chon.value as Priority } }));
    if (!r) chon.value = t.priority;
    reload();
  });
  return h("label", { class: "fb-uu-tien-o" }, "Mức ưu tiên", chon);
}

/**
 * Người xử lý (chỉ nhóm xử lý thấy): tên; người giữ không còn hợp lệ (bị khoá hoặc rời nhóm) hiện tên mờ và phiếu coi như «Chưa ai nhận»; «Nhận việc cho tôi» khi
 * chưa ai nhận; «Giao cho người khác» cho Trưởng nhóm / Toàn quyền (`perms.giaoViec`) — danh sách thành viên tải khi bấm (máy chủ đã loại người gửi, tài khoản khoá, bên ngoài).
 */
function khoiNguoiXuLy(t: Api.FeedbackTicketDto, giaoViec: boolean, reload: () => void): HTMLElement {
  const nx = nguoiXuLyHienThi(t);
  const giao = giaoViec && t.status !== "DONE" && t.status !== "DECLINED" ? nutGiaoViec(t, reload) : null;
  return h(
    "div",
    { id: "fb-nguoi-xu-ly" },
    nx.kieu === "co" ? `Người xử lý: ${nx.ten}` : h("span", { class: "badge badge-draft" }, "Chưa ai nhận"),
    nx.kieu === "cu" && h("span", { class: "muted fb-ten-mo" }, ` Người giữ trước: ${nx.ten} (đã nghỉ hoặc rời nhóm)`),
    " ",
    hienNhanViec(t, staff.id) && nutNhanViec(t, "Nhận việc cho tôi", reload),
    giao,
  );
}

function nutGiaoViec(t: Api.FeedbackTicketDto, reload: () => void): HTMLElement {
  const vung = h("div", { class: "fb-giao", id: "fb-giao" });
  const mo = h("button", { type: "button", class: "btn", "data-giao": t.id }, "Giao cho người khác");
  mo.addEventListener("click", async () => {
    const r = await act(() => api<Api.FeedbackMembersResponse>(`/api/feedback/teams/${encodeURIComponent(t.teamId)}/members?ticket=${encodeURIComponent(t.id)}`), mo);
    if (!r) return;
    const dangGiu = t.assigneeActive ? t.assigneeId : null;
    const ds = r.members.filter((m) => m.staffId !== dangGiu);
    if (ds.length === 0) return void replaceChildren(vung, h("p", { class: "muted" }, "Nhóm chưa có thành viên khác để giao."));
    const chon = h("select", { id: "fb-giao-chon", "aria-label": "Giao cho" }, ...ds.map((m) => h("option", { value: m.staffId }, `${m.name} · ${TEAM_ROLE_NAME[m.role]}`)));
    const nut = h("button", { type: "button", class: "btn btn-primary" }, "Giao");
    nut.addEventListener("click", async () => {
      if (await act(() => api<Api.FeedbackDetailResponse>(`/api/feedback/${t.id}/xu-ly`, { method: "PATCH", body: { assigneeId: chon.value } }), nut)) reload();
    });
    const huy = h("button", { type: "button", class: "btn btn-link", onclick: () => replaceChildren(vung, mo) }, "Huỷ");
    replaceChildren(vung, h("label", null, "Giao cho", chon), h("div", { class: "fb-status-nut" }, nut, huy));
  });
  vung.append(mo);
  return vung;
}

/** Chuyển phiếu sang nhóm khác (Trưởng nhóm đang giữ phiếu hoặc Toàn quyền): nhóm nhận + lý do bắt buộc. Sau khi chuyển, người chuyển có thể mất quyền xem — nạp lại sẽ báo. */
function khoiChuyenNhom(t: Api.FeedbackTicketDto): HTMLElement | null {
  const dich = nhomChuyenDuoc(teams, t.teamId);
  if (dich.length === 0) return null;
  const chon = h("select", { id: "fb-chuyen-nhom" }, ...dich.map((x) => h("option", { value: x.id }, x.name)));
  const lyDo = h("input", { id: "fb-chuyen-ly-do", type: "text", maxLength: 300 });
  const nut = h("button", { type: "button", class: "btn" }, "Chuyển");
  nut.addEventListener("click", async () => {
    if (!lyDo.value.trim()) return showError(errorEl, "Ghi lý do chuyển nhóm.");
    const r = await act(() => api<unknown>(`/api/feedback/${t.id}/transfer`, { method: "POST", body: { teamId: chon.value, reason: lyDo.value } }), nut);
    // Chuyển xong người chuyển thường mất quyền xem phiếu (nhóm mới giữ): về danh sách kèm câu báo, không nạp lại phiếu rồi hiện lỗi.
    if (r !== undefined) location.replace("/feedback?chuyen=1");
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
    byId("ht-danh-sach").hidden = !mq.matches;
    byId("ht-tabs").hidden = !mq.matches;
    // Hẹp → rộng: danh sách vừa hiện lại phải có nội dung ngay, không chỉ khung rỗng
    // (như đường tải trang khi mở ?id= ở khổ rộng, phía trên).
    // loadList() tự dựng lại toàn bộ tabs/summary/list từ đầu mỗi lần gọi nên gọi lại nhiều lần (resize qua lại mốc) an toàn.
    if (mq.matches) void loadList();
  });
} else {
  if (params.get("chuyen") === "1") byId("ht-tabs").before(h("p", { class: "muted", role: "status", id: "fb-da-chuyen" }, "Đã chuyển nhóm."));
  void loadList();
  if (params.get("new") === "1") openForm();
}
