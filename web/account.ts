import { ApiError, api, type Api } from "./api";
import { chipHan, coMucGiayToCuaToi, ngayVN, tenGiayTo } from "../src/shared/giay-to-hien-thi";
import { PERMISSION_LABEL, can, hasPermission, isOffice } from "../src/shared/permissions";
import { chiTaiXe, coCuocCuaToi, coPhanTaiXe } from "../src/shared/start-page";
import { thayDieuPhoiXe } from "../src/shared/dieu-phoi-man";
import { canHuyDangKyCu } from "../src/shared/push-khoa";
import { vnDateTimeText, vnLocalToIso } from "../src/shared/vn-date";
import { byId, h, replaceChildren } from "./dom";
import { initials } from "./format";
import { helpHasNews, newDot } from "./help-seen";
import { icon } from "./icons";
import { renderMaintenanceMessage } from "./maintenance-screen";
import { ganCaiDatNhapTay } from "./nhap-tay-cai-dat";
import { enableFlow, getAssertion, passkeyErrorMessage, platformAuthenticatorAvailable } from "./passkey";
import { b64uSangBytes, thietBiTu } from "./push-ui";
import { feedbackBadge, initShell, logout, setMaintenanceStrip, showError } from "./shell";
import { chipEl } from "./giay-to-ui";
import { demSapHetHan } from "./vc-dem";
import { initViecCuaToi } from "./viec-cua-toi";

const errorEl = byId("error");
const okEl = byId("ok");
const form = byId<HTMLFormElement>("pin-form");

const staff = await initShell();
replaceChildren(
  byId("me"),
  h(
    "div",
    { class: "profile" },
    h("span", { class: "avatar", "aria-hidden": "true" }, initials(staff.fullName)),
    h("div", null, h("div", { class: "profile-name" }, staff.fullName), h("div", { class: "muted" }, `${staff.phone} · ${staff.permissions.map((p) => PERMISSION_LABEL[p]).join(", ") || "chưa có quyền"}`)),
  ),
);
const logoutBtn = h("button", { class: "row-link danger", type: "button" }, "Đăng xuất");
logoutBtn.addEventListener("click", () => void logout());
const feedbackBadgeEl = h("span", { class: "badge badge-cancelled", hidden: true });
void feedbackBadge().then((n) => {
  if (n > 0) {
    feedbackBadgeEl.textContent = String(n);
    feedbackBadgeEl.hidden = false;
  }
});
const lienKetDau = [
  isOffice(staff) && h("a", { class: "row-link", href: "/parties" }, "Danh bạ", icon("next", 20)),
  can(staff, "admin.manage") && h("a", { class: "row-link", href: "/locations" }, "Địa điểm", icon("next", 20)),
  // Loại giấy tờ cá nhân (loại giấy tờ của người + hạng giấy phép lái xe — danh mục chung, giấy tờ thuộc về người). Tách 2026-09-28 khỏi dòng "Danh mục giấy tờ"
  // cũ (ADR-0040 D1, D2; Task A19); "Loại giấy tờ xe" nay ở nhóm VẬN CHUYỂN bên dưới. Ô admin.manage (như dòng cũ).
  can(staff, "admin.manage") && h("a", { class: "row-link", href: "/loai-giay-to-nguoi" }, "Loại giấy tờ cá nhân", icon("next", 20)),
];
const lienKetSau = [
  can(staff, "audit.view") && h("a", { class: "row-link", href: "/audit" }, "Nhật ký", icon("next", 20)), // ADR-0038 điều 6: chỉ Toàn quyền
  // ADR-0075 điều 7: sổ phiên đăng nhập của mọi tài khoản — chỉ IT/Toàn quyền (ô auth.session.viewAll); lối vào ở điện thoại (thanh bên máy tính có mục riêng).
  can(staff, "auth.session.viewAll") && h("a", { class: "row-link", href: "/sessions" }, "Phiên đăng nhập", icon("next", 20)),
  can(staff, "notice.send") && h("a", { class: "row-link", href: "/gui-thong-bao" }, "Gửi thông báo", icon("next", 20)),
  // ADR-0069 điều 1: cài đặt trợ lý chuyển từ khối ở trang này sang trang riêng — chỉ Toàn quyền (ô settings.ops).
  can(staff, "settings.ops") && h("a", { class: "row-link", href: "/tro-ly-cai-dat" }, "Trợ lý Hỗ trợ", icon("next", 20)),
  can(staff, "settings.ops") && h("a", { class: "row-link", href: "/giao-dien" }, "Giao diện", icon("next", 20)), // ADR-0087
  h("a", { class: "row-link", href: "/feedback" }, "Góp ý / Báo lỗi", feedbackBadgeEl, icon("next", 20)),
  h("a", { class: "row-link", href: "/help" }, "Trợ giúp", helpHasNews() && newDot(), icon("next", 20)),
  logoutBtn,
];
const quanLyXe = can(staff, "vehicle.manage");
if (quanLyXe || thayDieuPhoiXe(staff)) {
  // Vận chuyển (ADR-0040 D1; bản vẽ 00, điện thoại): Danh bạ / Địa điểm / Loại giấy tờ cá nhân → nhãn "VẬN CHUYỂN" → Điều phối xe (ô trip.view — Q-B-4, cả Bán
  // hàng, Kế toán) / Xe / Giấy tờ sắp hết hạn (huy hiệu cát) / Loại giấy tờ xe (tách 2026-09-28; thêm ô admin.manage — route sửa danh mục hỏi ô này) → phần còn lại.
  // `#links` giữ phần còn lại (Góp ý, Trợ giúp, Đăng xuất…) để mọi chỗ đang tìm các dòng đó trong #links vẫn đúng; tài khoản không có ô nào của nhóm: DOM như cũ.
  const soSapHet = h("span", { class: "vc-badge", hidden: true });
  if (quanLyXe) {
    void demSapHetHan().then((n) => {
      if (n > 0) {
        soSapHet.textContent = String(n);
        soSapHet.hidden = false;
      }
    });
  }
  byId("links").before(
    h("section", { id: "links-top", class: "card list-card" }, ...lienKetDau),
    h("div", { id: "vc-eyebrow", class: "vc-eyebrow" }, "VẬN CHUYỂN"),
    h(
      "section",
      { id: "vc-links", class: "card list-card", "aria-labelledby": "vc-eyebrow" },
      thayDieuPhoiXe(staff) && h("a", { class: "row-link", href: "/dieu-phoi" }, h("span", { class: "vc-row-label" }, "Điều phối xe"), icon("next", 20)),
      // Kiểm độc lập K2b T2 (điều phối chốt, GA-K2b-T2): tài khoản vừa tài xế công ty vừa văn phòng — lối tới "Cuốc của tôi" ở điện thoại (tài khoản chỉ tài xế
      // có tab riêng; trang đầu của tổ hợp này KHÔNG đổi).
      coCuocCuaToi(staff) && !chiTaiXe(staff) && h("a", { class: "row-link", href: "/cuoc" }, h("span", { class: "vc-row-label" }, "Cuốc của tôi"), icon("next", 20)),
      quanLyXe && h("a", { class: "row-link", href: "/xe" }, h("span", { class: "vc-row-label" }, "Xe"), icon("next", 20)),
      quanLyXe && h("a", { class: "row-link", href: "/giay-to-sap-het-han" }, h("span", { class: "vc-row-label" }, "Giấy tờ sắp hết hạn"), soSapHet, icon("next", 20)),
      quanLyXe && can(staff, "admin.manage") && h("a", { class: "row-link", href: "/loai-giay-to-xe" }, h("span", { class: "vc-row-label" }, "Loại giấy tờ xe"), icon("next", 20)),
      // Bảng điều phối lượt 1 (ADR-0049; bản vẽ 08 khung 8b / 8d — điện thoại mở từ trang Tôi): Chính sách điều phối (chỉ Toàn quyền — ô settings.ops),
      // Lý do điều phối (ô admin.manage). Giữ đúng điều kiện cũ (trong nhóm của người có ô vehicle.manage).
      quanLyXe && can(staff, "settings.ops") && h("a", { class: "row-link", href: "/chinh-sach-dieu-phoi" }, h("span", { class: "vc-row-label" }, "Chính sách điều phối"), icon("next", 20)),
      quanLyXe && can(staff, "admin.manage") && h("a", { class: "row-link", href: "/ly-do-dieu-phoi" }, h("span", { class: "vc-row-label" }, "Lý do điều phối"), icon("next", 20)),
    ),
  );
  replaceChildren(byId("links"), ...lienKetSau);
} else replaceChildren(byId("links"), ...lienKetDau, ...lienKetSau);

// ---- Giấy tờ của tôi (ADR-0040 D2 — mọi nhân viên nội bộ, R5; bản vẽ 05): số CHE, chỉ xem, giấy gần hết hạn nhất đầu (máy chủ xếp). Tài khoản mang quyền Đối
// tác (kể cả lai — R18) không có mục: không gọi route. Chỉ dựng khối khi có giấy tờ, hoặc với tài xế (để họ biết phải báo văn phòng) — nhân viên chưa có giấy
// tờ nào thấy trang Tôi như trước.
async function initGiayToCuaToi(): Promise<void> {
  if (!coMucGiayToCuaToi(staff)) return;
  let docs: Api.PersonDocumentDto[];
  let moc: number;
  try {
    const r = await api<Api.PersonDocumentListResponse>("/api/parties/documents/mine");
    docs = r.documents;
    moc = r.warnDays;
  } catch {
    return; // lỗi mạng: không có khối (không ảnh hưởng phần còn lại của trang)
  }
  if (docs.length === 0 && !coPhanTaiXe(staff)) return; // tài xế công ty HOẶC tài xế đối tác (ADR-0048) thấy khối kể cả khi chưa có giấy
  const dong = (d: Api.PersonDocumentDto): HTMLElement =>
    h(
      "div",
      { class: "vc-mydoc" },
      h("span", { class: "vc-doc-title" }, tenGiayTo(d)),
      chipEl(chipHan(d.daysLeft, moc)),
      h("span", { class: d.maskedNumber ? "vc-mydoc-no" : "vc-mydoc-no is-empty" }, h("span", { class: "vc-no-val" }, d.maskedNumber ?? "—")),
      h("span", { class: "vc-mydoc-exp" }, ...(d.expiryDate ? [h("span", { class: "vc-exp-pre" }, "Hết hạn "), ngayVN(d.expiryDate)] : ["Không hạn"])),
    );
  byId("me").after(
    h(
      "section",
      { id: "my-docs", class: "card vc-mydocs", "aria-labelledby": "my-docs-heading" },
      h("h2", { id: "my-docs-heading" }, "Giấy tờ của tôi"),
      h("div", { class: "vc-mydocs-head vc-th", "aria-hidden": "true" }, h("span", null, "LOẠI"), h("span", null, "SỐ"), h("span", null, "HẾT HẠN"), h("span", null, "CÒN")),
      ...(docs.length ? docs.map(dong) : [h("p", { class: "vc-empty-line" }, "Chưa có giấy tờ nào.")]),
      h("div", { class: "vc-note" }, "Thông tin sai hoặc đã có giấy mới? Báo văn phòng để cập nhật."),
    ),
  );
}
void initGiayToCuaToi();
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError(errorEl, null);
  okEl.hidden = true;
  const currentPin = byId<HTMLInputElement>("current").value;
  const newPin = byId<HTMLInputElement>("new").value;
  if (newPin !== byId<HTMLInputElement>("confirm").value) return showError(errorEl, "Hai lần nhập PIN mới không khớp.");
  try {
    await api("/api/account/change-pin", { method: "POST", body: { currentPin, newPin } });
    form.reset();
    okEl.hidden = false;
    void renderPasskeys({ afterPinChange: true });
  } catch (err) {
    showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
  }
});

// ---- Đăng nhập bằng Face ID (ADR-0016) --------------------------------------------------------------------------
const passkeysEl = byId("passkeys");
let passkeyEnabled = false; // đọc từ GET /api/auth/config trong initPasskeys()
let platformAvailable: boolean | null = null; // isUserVerifyingPlatformAuthenticatorAvailable() — hỏi một lần, cache lại

/** Ô PIN mới + nhập lại + nút "Xác nhận bằng Face ID": đặt PIN mới khi quên PIN cũ, dùng chính passkey đang có. */
function pinByPasskeySection(): HTMLElement {
  const newPin = h("input", { type: "password", inputmode: "numeric", pattern: "[0-9]{6}", maxlength: "6", autocomplete: "new-password" });
  const confirmPin = h("input", { type: "password", inputmode: "numeric", pattern: "[0-9]{6}", maxlength: "6", autocomplete: "new-password" });
  const msg = h("p", { class: "muted", role: "status" });
  const go = h("button", { class: "btn btn-primary btn-chinh", type: "button" }, "Xác nhận bằng Face ID");
  let challenge: { opts: Api.PasskeyRequestOptionsResponse["publicKey"]; at: number } | null = null;
  const CHALLENGE_TTL_MS = 4 * 60_000;
  async function fetchChallenge(): Promise<void> {
    try {
      const r = await api<Api.PasskeyRequestOptionsResponse>("/api/account/pin-by-passkey/options", { method: "POST", body: {} });
      challenge = { opts: r.publicKey, at: Date.now() };
    } catch (err) {
      challenge = null;
      msg.textContent = err instanceof ApiError ? err.message : "Không kết nối được máy chủ.";
    }
  }
  const details = h(
    "details",
    null,
    h("summary", null, "Quên PIN? Đặt PIN mới bằng Face ID"),
    h("label", null, "PIN mới (6 số)", newPin),
    h("label", { style: "margin-top:var(--s2)" }, "Nhập lại PIN mới", confirmPin),
    msg,
    h("div", { class: "actions" }, go),
  );
  details.addEventListener("toggle", () => {
    if ((details as HTMLDetailsElement).open) {
      msg.textContent = "";
      void fetchChallenge();
    }
  });
  go.addEventListener("click", async () => {
    if (newPin.value !== confirmPin.value) {
      msg.textContent = "Hai lần nhập PIN mới không khớp.";
      return;
    }
    const c = challenge;
    if (!c || Date.now() - c.at > CHALLENGE_TTL_MS) {
      await fetchChallenge();
      if (challenge) msg.textContent = "Bấm lại nút Xác nhận bằng Face ID.";
      return;
    }
    challenge = null;
    try {
      const credential = await getAssertion(c.opts); // KHÔNG có await nào trước dòng này trong lần chạm
      await api("/api/account/pin-by-passkey", { method: "POST", body: { credential, newPin: newPin.value } });
      msg.textContent = "Đã đặt PIN mới. Các thiết bị khác sẽ bị đăng xuất.";
      newPin.value = "";
      confirmPin.value = "";
    } catch (err) {
      const text = err instanceof ApiError ? err.message : passkeyErrorMessage(err);
      if (text) msg.textContent = text;
      void fetchChallenge(); // MỌI lần thất bại: thách thức cũ không dùng lại được, lấy sẵn cái mới cho lần bấm sau
    }
  });
  return details;
}

async function renderPasskeys(opts?: { afterPinChange?: boolean }): Promise<void> {
  if (!passkeyEnabled) return;
  let list: Api.PasskeyDto[];
  try {
    list = (await api<Api.PasskeyListResponse>("/api/account/passkeys")).passkeys;
  } catch {
    return; // lỗi mạng: giữ mục như cũ, không ảnh hưởng phần còn lại của trang (cùng khuôn initMaintenance)
  }
  if (platformAvailable === null) platformAvailable = await platformAuthenticatorAvailable();
  const errorBox = h("div", { class: "alert", role: "alert", hidden: true });

  const rows = list.map((p) => {
    const removeBtn = h("button", { class: "btn btn-link danger", type: "button" }, "Gỡ");
    removeBtn.addEventListener("click", async () => {
      showError(errorBox, null);
      try {
        await api(`/api/account/passkeys/${p.id}`, { method: "DELETE" });
        await renderPasskeys();
      } catch (err) {
        showError(errorBox, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
      }
    });
    return h(
      "div",
      { class: "passkey-row" },
      h("strong", null, p.label),
      h("div", { class: "muted" }, `Bật ngày ${vnDateTimeText(p.createdAt)}`),
      h("div", { class: "muted" }, p.lastUsedAt ? `Dùng gần nhất ${vnDateTimeText(p.lastUsedAt)}` : "Chưa dùng"),
      removeBtn,
    );
  });

  const removeAllBtn = ((): HTMLElement | null => {
    if (list.length === 0) return null;
    const b = h("button", { class: "btn btn-link danger", type: "button" }, "Gỡ tất cả");
    b.addEventListener("click", async () => {
      if (!confirm("Gỡ Face ID trên mọi máy? Máy này vẫn giữ đăng nhập; các máy khác sẽ bị đăng xuất. Lần sau đăng nhập bằng số điện thoại và PIN.")) return;
      showError(errorBox, null);
      try {
        await api("/api/account/passkeys/remove-all", { method: "POST" });
        await renderPasskeys();
      } catch (err) {
        showError(errorBox, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
      }
    });
    return b;
  })();

  replaceChildren(
    passkeysEl,
    h("h2", { id: "passkeys-heading" }, "Đăng nhập bằng Face ID"),
    opts?.afterPinChange && list.length > 0
      ? h("p", { class: "alert warn" }, "Face ID vẫn còn bật trên các máy dưới đây. Nếu nghi lộ PIN, bấm Gỡ tất cả.")
      : null,
    errorBox,
    list.length === 0 ? h("p", { class: "muted" }, "Chưa bật trên máy nào.") : h("div", { class: "passkey-list" }, ...rows),
    removeAllBtn,
    platformAvailable ? h("div", null, h("h3", null, "Bật trên máy này"), enableFlow({ onDone: () => void renderPasskeys() })) : null,
    list.length > 0 ? pinByPasskeySection() : null,
  );
  passkeysEl.hidden = false;
  if (opts?.afterPinChange && list.length > 0) passkeysEl.scrollIntoView({ block: "nearest" });
}

async function initPasskeys(): Promise<void> {
  try {
    const config = await api<Api.AuthConfigResponse>("/api/auth/config");
    passkeyEnabled = config.passkey === true;
  } catch {
    passkeyEnabled = false;
  }
  if (passkeyEnabled) await renderPasskeys();
}
void initPasskeys();

// ---- Thông báo trên điện thoại (Web Push màn hình khoá, ADR-0036) ------------------------------------------------
// Không hỏi lại trạng thái này sau khi đổi PIN/Face ID: máy chủ tự tắt địa chỉ chạy SAU phản hồi (waitUntil, Task 3),
// gọi lại ngay có thể vẫn thấy "đang bật" cũ — trang tự cập nhật đúng ở lần tải sau hoặc lần bấm nút của chính mục này.
const pushEl = byId("push");

function pushHeading(): HTMLElement {
  return h("h2", { id: "push-heading" }, "Thông báo trên điện thoại");
}

/** Đã cài ra màn hình chính (chạy như app độc lập) — cách Safari/iOS báo (`navigator.standalone`) và cách chuẩn (`display-mode`). */
function daCaiDatChuan(): boolean {
  return matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function hoTroThongBao(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Subscription CỤC BỘ của máy này (nếu có) — dùng `getRegistration()`, KHÔNG dùng `.ready` (I-2, vòng rà 2026-09-28):
 * `.ready` không bao giờ reject, nếu service worker mãi chưa "active" (lần đầu mở, hoặc lỗi cài) thì treo vô thời hạn
 * và cả mục Thông báo kẹt "ẩn" theo — `getRegistration()` trả `undefined` ngay nếu chưa có, không treo. */
async function subscriptionCucBo(): Promise<PushSubscription | null> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return (await reg?.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

async function renderPush(): Promise<void> {
  const hoTro = hoTroThongBao();
  // Đọc subscription cục bộ TRƯỚC (nhanh, không cần mạng) để hỏi máy chủ ĐÚNG MỘT LẦN, kèm sẵn `?endpoint=` — máy
  // chủ trả `mayNay` (I-2) cho đúng cái này, không phải suy từ `soMay` (tổng theo tài khoản, có thể nhiều máy).
  const sub = hoTro ? await subscriptionCucBo() : null;
  let status: Api.MayThongBaoResponse;
  try {
    const qs = sub ? `?endpoint=${encodeURIComponent(sub.endpoint)}` : ""; // FCM/APNs endpoint có `:` `/` — phải mã hoá
    status = await api<Api.MayThongBaoResponse>(`/api/account/thong-bao/may${qs}`);
  } catch {
    return; // lỗi mạng: giữ ẩn, không ảnh hưởng phần còn lại trang (khuôn initMaintenance/initPasskeys)
  }
  const khoa = status.khoa;
  if (!khoa) return; // thiếu khoá công khai VAPID (thiếu bí mật ở máy chủ): ẩn cả mục

  if (!hoTro) {
    const msg = daCaiDatChuan()
      ? "Trình duyệt này không hỗ trợ thông báo."
      : "Để nhận thông báo: bấm Chia sẻ → Thêm vào MH chính, rồi mở app từ biểu tượng.";
    replaceChildren(pushEl, pushHeading(), h("p", { class: "muted" }, msg));
    pushEl.hidden = false;
    return;
  }
  if (Notification.permission === "denied") {
    replaceChildren(pushEl, pushHeading(), h("p", { class: "muted" }, "Bạn đã chặn thông báo. Mở Cài đặt → Thông báo → Island Booking để bật lại."));
    pushEl.hidden = false;
    return;
  }

  // Trình duyệt có thể còn giữ subscription cũ dù máy chủ đã tắt ĐÚNG MÁY NÀY (đổi PIN/quyền/ngưng tài khoản —
  // ADR-0036 điều 6): chỉ coi là "đang bật" khi CẢ HAI đồng ý (subscription cục bộ + `mayNay` từ máy chủ, xét đúng
  // endpoint này — KHÔNG dùng `soMay > 0`, vì đó là tổng theo tài khoản, một máy khác của cùng người vẫn đếm vào).
  // Lệch thì hiện lại nút Bật — bấm sẽ dùng đúng subscription cũ (trình duyệt trả lại y nguyên khi đã có) và chỉ
  // cần đăng ký lại phía máy chủ.
  if (sub && status.mayNay) {
    const errorBox = h("div", { class: "alert", role: "alert", hidden: true });
    const offBtn = h("button", { class: "btn btn-link danger", type: "button" }, "Tắt");
    offBtn.addEventListener("click", async () => {
      showError(errorBox, null);
      offBtn.disabled = true;
      try {
        await api("/api/account/thong-bao/may/huy", { method: "POST", body: { endpoint: sub.endpoint } });
        await sub.unsubscribe().catch(() => undefined);
        await renderPush();
      } catch (err) {
        showError(errorBox, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
        offBtn.disabled = false;
      }
    });
    replaceChildren(pushEl, pushHeading(), h("p", { class: "muted" }, "Đang bật trên máy này."), errorBox, offBtn);
    pushEl.hidden = false;
    return;
  }

  const errorBox = h("div", { class: "alert", role: "alert", hidden: true });
  const onBtn = h("button", { class: "btn btn-primary", type: "button" }, "Bật thông báo trên điện thoại");
  onBtn.addEventListener("click", async () => {
    showError(errorBox, null);
    onBtn.disabled = true;
    try {
      const perm = await Notification.requestPermission(); // trong CHÍNH cú chạm, không await nào trước dòng này
      if (perm !== "granted") {
        showError(errorBox, "Bạn chưa cho phép thông báo.");
        onBtn.disabled = false;
        if (perm === "denied") void renderPush();
        return;
      }
      const reg2 = await navigator.serviceWorker.ready;
      // I-3 (vòng rà 2026-09-28): huỷ subscription CŨ trước nếu có — bấm "Bật" có thể rơi vào đây dù trình duyệt
      // ĐÃ có một subscription (mayNay=false ở trên: máy chủ đã tắt, hoặc đổi cặp khoá VAPID — Bước "Tắt khẩn cấp").
      // `subscribe()` với `applicationServerKey` KHÁC subscription đang có ném `InvalidStateError` ngay, không tự
      // thay — phải `unsubscribe()` trước. Cùng khoá thì `unsubscribe()` xong `subscribe()` lại chỉ tốn một nhịp mạng.
      // 30/9 (chủ báo mất thông báo sau mỗi lần triển khai): cùng khoá ⇒ GIỮ subscription cũ, chỉ gửi lại địa chỉ; khác khoá ⇒ huỷ trước (canHuyDangKyCu).
      const subCu = await reg2.pushManager.getSubscription();
      const giuCu = subCu && !canHuyDangKyCu(subCu.options.applicationServerKey, khoa);
      if (subCu && !giuCu) await subCu.unsubscribe().catch(() => undefined);
      // `Uint8Array.from` trả kiểu tổng quát hơn `BufferSource` mong đợi (TS ≥5.7, buffer có thể là SharedArrayBuffer) — ép kiểu, dữ liệu vẫn đúng.
      const newSub = giuCu && subCu ? subCu : await reg2.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uSangBytes(khoa) as BufferSource });
      await api("/api/account/thong-bao/may", { method: "POST", body: { endpoint: newSub.endpoint, thietBi: thietBiTu(navigator.userAgent) } });
      await renderPush();
    } catch (err) {
      showError(errorBox, err instanceof ApiError ? err.message : "Không bật được thông báo trên máy này.");
      onBtn.disabled = false;
    }
  });
  replaceChildren(pushEl, pushHeading(), errorBox, onBtn);
  pushEl.hidden = false;
}
void renderPush();

// ---- Phiên đăng nhập của tôi (ADR-0075 điều 9; đặc tả §5b "Bảo mật đăng nhập"): 30 phiên gần nhất của CHÍNH MÌNH, dòng máy đang dùng ghi "Máy này", nút Đăng xuất.
// Trạng thái, cách đăng nhập: nhãn lời thường do máy chủ tính (không lộ mã thô). Lỗi mạng: mục giữ ẩn, không ảnh hưởng phần còn lại của trang.
const mySessionsEl = byId("my-sessions");
async function renderMySessions(): Promise<void> {
  let list: Api.SessionDto[];
  try {
    list = (await api<Api.SessionListResponse>("/api/account/sessions")).sessions;
  } catch {
    return;
  }
  const dong = (s: Api.SessionDto): HTMLElement =>
    h(
      "div",
      { class: "passkey-row", "data-phien": s.id },
      h("strong", null, s.deviceLabel, s.thisDevice && h("span", { class: "badge badge-draft" }, "Máy này")),
      h("div", { class: "muted" }, `${s.methodLabel} · IP ${s.ip ?? "không rõ"}`),
      h("div", { class: "muted" }, `Đăng nhập ${vnDateTimeText(s.createdAt)} · Hoạt động gần nhất ${vnDateTimeText(s.lastSeenAt)}`),
      h("div", null, h("span", { class: s.live ? "badge badge-confirmed" : "muted" }, s.statusLabel, !s.live && s.endedAt ? ` lúc ${vnDateTimeText(s.endedAt)}` : "")),
    );
  const out = h("button", { id: "my-sessions-logout", class: "btn btn-link danger", type: "button" }, "Đăng xuất");
  out.addEventListener("click", () => void logout());
  replaceChildren(
    mySessionsEl,
    h("h2", { id: "my-sessions-heading" }, "Phiên đăng nhập của tôi"),
    h("p", { class: "muted" }, "Tuỳ quyền, tài khoản chỉ đăng nhập trên một máy (do Toàn quyền đặt): đăng nhập máy mới thì máy cũ tự đăng xuất. Ứng dụng đã cài và Safari trên cùng một iPhone tính là hai máy."),
    list.length === 0 ? h("p", { class: "muted" }, "Chưa có phiên nào.") : h("div", { class: "passkey-list" }, ...list.map(dong)),
    out,
  );
  mySessionsEl.hidden = false;
}
void renderMySessions();

// ---- Chế độ bảo trì (chỉ chủ dự án: GET /api/maintenance trả canToggle = true) ----
// Bật = mọi tài khoản khác bị chặn NGAY (kể cả phiên đang mở) — nên bật phải qua bước xác nhận thứ hai ngay trong trang (không dùng confirm() của trình duyệt). Máy chủ mới là nơi kiểm quyền và giờ hợp lệ.
const maintenanceEl = byId("maintenance");
const QUICK_MINUTES = [30, 60, 120] as const;
let stopPreview: (() => void) | null = null;

/** Chọn giờ dự kiến hoàn tất: ba nút nhanh (từ lúc bấm) hoặc ô chọn giờ (hiểu là giờ Việt Nam). `iso()` trả mốc ISO UTC đã chọn, hoặc null nếu chưa chọn/nhập sai. */
function etaPicker(): { el: HTMLElement; iso: () => string | null } {
  let minutes: number | null = null;
  const input = h("input", { id: "maint-eta", type: "datetime-local" });
  const quick = QUICK_MINUTES.map((m) => {
    const b = h("button", { class: "btn", type: "button", "aria-pressed": "false" }, `${m} phút`);
    b.addEventListener("click", () => {
      minutes = m;
      input.value = "";
      quick.forEach((other, i) => other.setAttribute("aria-pressed", String(QUICK_MINUTES[i] === m)));
    });
    return b;
  });
  input.addEventListener("input", () => {
    minutes = null;
    for (const b of quick) b.setAttribute("aria-pressed", "false");
  });
  const el = h(
    "div",
    null,
    h("div", { class: "maint-quick", role: "group", "aria-label": "Chọn nhanh thời gian bảo trì" }, ...quick),
    h("label", { class: "maint-eta" }, "Hoặc chọn giờ dự kiến hoàn tất (giờ Việt Nam)", input),
  );
  return { el, iso: () => (minutes !== null ? new Date(Date.now() + minutes * 60_000).toISOString() : vnLocalToIso(input.value)) };
}

function renderMaintenance(status: Api.MaintenanceResponse): void {
  stopPreview?.();
  stopPreview = null;
  setMaintenanceStrip(status.on); // dải "Đang ở chế độ bảo trì" theo trạng thái mới, khỏi tải lại trang
  const errorBox = h("div", { class: "alert", role: "alert", hidden: true });
  const lock = (locked: boolean): void => maintenanceEl.querySelectorAll<HTMLButtonElement | HTMLInputElement>("button, input").forEach((el) => (el.disabled = locked));
  const send = async (body: Api.MaintenanceRequest): Promise<void> => {
    showError(errorBox, null);
    lock(true);
    try {
      renderMaintenance(await api<Api.MaintenanceResponse>("/api/maintenance", { method: "PUT", body }));
    } catch (err) {
      showError(errorBox, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
      lock(false);
    }
  };
  const button = (label: string, cls: string, onclick: () => void): HTMLButtonElement => {
    const b = h("button", { class: cls, type: "button" }, label);
    b.addEventListener("click", onclick);
    return b;
  };

  const picker = etaPicker();
  const chosen = (): string | null => {
    const iso = picker.iso();
    if (iso === null) showError(errorBox, "Hãy chọn thời gian dự kiến hoàn tất (nút nhanh hoặc ô chọn giờ).");
    else showError(errorBox, null);
    return iso;
  };
  let body: HTMLElement;
  if (status.on) {
    body = h(
      "div",
      null,
      picker.el,
      h(
        "div",
        { class: "maint-actions" },
        button("Cập nhật giờ dự kiến", "btn", () => {
          const iso = chosen();
          if (iso) void send({ on: true, endsAt: iso });
        }),
        button("Tắt chế độ bảo trì", "btn btn-primary", () => void send({ on: false })),
      ),
    );
  } else {
    // Bước 1: chọn giờ; bước 2: xác nhận (thay khối chọn giờ bằng lời cảnh báo).
    const setup = h("div", null, picker.el);
    const confirmBox = h("div", { hidden: true });
    const startBtn = button("Bật chế độ bảo trì", "btn btn-primary btn-block", () => {
      const iso = chosen();
      if (!iso) return;
      const back = button("Quay lại", "btn", () => {
        confirmBox.hidden = true;
        setup.hidden = false;
        startBtn.focus();
      });
      const panel = h(
        "div",
        { class: "maint-confirm", role: "group", "aria-label": "Xác nhận bật chế độ bảo trì", tabindex: -1 },
        h("p", null, h("strong", null, "Mọi nhân viên khác sẽ bị chặn ngay, kể cả người đang mở app. Chỉ bạn dùng được.")),
        h("p", null, `Dự kiến hoàn tất lúc ${vnDateTimeText(iso)}.`),
        h("div", { class: "maint-actions" }, button("Xác nhận bật", "btn btn-primary btn-chinh", () => void send({ on: true, endsAt: iso })), back),
      );
      replaceChildren(confirmBox, panel);
      setup.hidden = true;
      confirmBox.hidden = false;
      panel.focus();
    });
    setup.append(startBtn);
    body = h("div", null, setup, confirmBox);
  }

  const preview = status.on ? h("span", { id: "maint-preview" }) : null;
  if (preview) stopPreview = renderMaintenanceMessage(preview, status.endsAt);
  replaceChildren(
    maintenanceEl,
    h("h2", { id: "maintenance-heading" }, "Chế độ bảo trì"),
    h("p", { class: "muted" }, "Khi bật, mọi tài khoản không có quyền Toàn quyền bị chặn ngay (kể cả đang mở app, kể cả Quản trị)."),
    h(
      "p",
      { class: "maint-state" },
      h("span", { class: status.on ? "badge badge-draft" : "badge badge-cancelled" }, status.on ? "Đang bật" : "Đang tắt"),
      status.on && status.endsAt && h("span", null, `Dự kiến hoàn tất lúc ${vnDateTimeText(status.endsAt)}`),
    ),
    preview && h("p", { class: "muted" }, "Nhân viên đang thấy: ", preview),
    errorBox,
    body,
  );
  maintenanceEl.hidden = false;
}

// ADR-0071 điều 3c: mục này theo ô settings.ops (chỉ Toàn quyền — cùng chốt với GET/PUT /api/maintenance); Quản trị không thấy mục, không gọi route.
async function initMaintenance(): Promise<void> {
  if (!can(staff, "settings.ops")) return;
  try {
    const status = await api<Api.MaintenanceResponse>("/api/maintenance");
    if (status.canToggle) renderMaintenance(status);
  } catch {
    // lỗi mạng: mục này ẩn (không ảnh hưởng phần còn lại của trang)
  }
}
void initMaintenance();

// ---- Dịch vụ nhập tay (ADR-0061 điều 6): công tắc bật / tắt — chỉ Toàn quyền (ô settings.ops; máy chủ kiểm lại) ----
if (can(staff, "settings.ops")) void ganCaiDatNhapTay(byId("nhap-tay-cai-dat"));

// ---- Việc của tôi (hướng dẫn viên — ADR-0014 điều 6/11, ADR-0030; bản thiết kế "Viec cua toi - HDV v2" của chủ dự án, Task 1.8) ----------------
// Toàn bộ khối ở web/viec-cua-toi.ts: hàng chờ nhận + nút Nhận, đơn mình phụ trách (có Tổng tiền/Đã cọc/Còn thu), bảng sửa số khách, bảng huỷ đơn.
if (hasPermission(staff, "FIELD")) void initViecCuaToi(byId("myjobs"), staff);
