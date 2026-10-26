// Trang Hỗ trợ (mã trang gopY, đường /feedback — ADR-0119 đợt 1): gửi yêu cầu tới một nhóm hỗ trợ, "Yêu cầu của tôi", luồng trả lời;
// thành viên nhóm (và Toàn quyền) có tab "Hàng đợi nhóm" (lọc, nhận việc); Toàn quyền có thêm tab "Quản lý nhóm".
// Dữ liệu qua /api/feedback*. Chuỗi từ người dùng chỉ đi qua h()/textContent. Địa chỉ: /feedback (danh sách), ?id=<uuid> (luồng), ?new=1&from=<đường dẫn> (mở form).
// Giao diện chỉ ẩn/hiện theo `teams` / `perms` máy chủ trả về; máy chủ (quyenPhieu) luôn kiểm lại.
import { FEEDBACK_KINDS, FEEDBACK_KIND_NAME } from "../src/shared/feedback-catalog";
import { NHOM_KY_THUAT_ID, TEAM_ROLE_NAME, TEAM_ROLES, type TeamRole } from "../src/shared/ve-ho-tro";
import { NHAN_TAB, nhanDonChon, nhomHangDoi, tabHoTro, type TabHoTro } from "../src/shared/ve-ho-tro-hien-thi";
import { can, isExternalPermission } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { veDanhSach } from "./ho-tro-danh-sach";
import { dungLuong, moLuong, type NgCanhLuong } from "./ho-tro-luong";
import { datThanhTab, initShell, showError } from "./shell";

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
let idDangMo = params.get("id");
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
  if (idDangMo) byId("ht-luong").hidden = false; // luồng đang mở vẫn hiện khi đổi thẻ ở máy tính
  if (dsDangDung && theDangDung === tab) dsDangDung.napLai();
  else {
    theDangDung = tab;
    dsDangDung = veDanhSach(goc, {
      the: tab,
      nhom: tab === "queue" ? hangDoiChon : [],
      nhomMacDinh: queueTeam,
      staffId: staff.id,
      get dangMo() {
        return idDangMo;
      },
      nutNhanViec,
      baoLoi: fail,
      moYeuCau,
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

// ---- Luồng một yêu cầu: mở tại chỗ (web/ho-tro-luong.ts) ----------------------------------------------------------------
// Địa chỉ `?id=` giữ trên thanh địa chỉ: mở = pushState (nút quay lại của trình duyệt đóng luồng), mở thẳng từ `?id=` = đóng bằng replaceState.
const ngCanh: NgCanhLuong = {
  staffId: staff.id,
  teams,
  dong: () => dongLuong(),
  napLaiDs: () => dsDangDung?.napLai(),
  chuyenXong: () => location.replace("/feedback?chuyen=1"),
};

function danhDauDangMo(id: string | null): void {
  idDangMo = id;
  for (const el of document.querySelectorAll<HTMLElement>(".ht-dong")) el.classList.toggle("is-dang-mo", id !== null && el.dataset.ticket === id);
}

/** Hiện luồng của `id` (không đụng địa chỉ). Điện thoại: toàn màn và ẩn thanh tab. */
function hienLuong(id: string): void {
  danhDauDangMo(id);
  document.body.classList.add("ht-luong-mo");
  datThanhTab(false);
  const goc = byId("ht-luong");
  goc.hidden = false;
  moLuong(goc, id, ngCanh);
}

/** Ẩn luồng (không đụng địa chỉ): mọi đường đóng đều đi qua đây nên thanh tab luôn hiện lại. */
function anLuong(): void {
  dungLuong();
  danhDauDangMo(null);
  document.body.classList.remove("ht-luong-mo");
  datThanhTab(true);
  byId("ht-luong").hidden = true;
  replaceChildren(byId("ht-luong"));
}

function moYeuCau(yc: string): void {
  const url = `/feedback?id=${encodeURIComponent(yc)}`;
  // Đang có luồng mở (máy tính, bấm sang dòng khác): thay mục lịch sử, không chồng thêm — nút quay lại vẫn đóng luồng bằng MỘT lần bấm.
  if (idDangMo !== null) history.replaceState(history.state, "", url);
  else history.pushState({ htLuong: true }, "", url);
  hienLuong(yc);
}

function dongLuong(): void {
  if (history.state?.htLuong) history.back(); // popstate lo phần còn lại
  else {
    history.replaceState(null, "", "/feedback");
    anLuong();
  }
}

window.addEventListener("popstate", () => {
  const moi = new URLSearchParams(location.search).get("id");
  if (moi) hienLuong(moi);
  else anLuong();
});

if (idDangMo) hienLuong(idDangMo);
void loadList();
if (!idDangMo) {
  if (params.get("chuyen") === "1") byId("ht-tabs").before(h("p", { class: "muted", role: "status", id: "fb-da-chuyen" }, "Đã chuyển nhóm."));
  if (params.get("new") === "1") openForm();
}
