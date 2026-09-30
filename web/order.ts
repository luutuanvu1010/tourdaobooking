import { ApiError, api, vuaLamBoiTabNay, type Api, type AuditEntry, type Order, type Staff } from "./api";
import { renderBanner } from "./banner";
import { openBookerSheet } from "./booker-sheet";
import { openConfirmationDialog } from "./confirmation-dialog";
import { byId, h, replaceChildren } from "./dom";
import { METHOD_LABEL, actionLabel, dateTime, dayMonth, parseMoney, trangThaiHienThi, vnd } from "./format";
import { regroupMoney } from "./money-input";
import { openHandlerSheet } from "./handler-sheet";
import { icon } from "./icons";
import { suKienVeDon, taoBoLamMoi } from "./lam-moi-logic";
import { renderServices } from "./order-services";
import { goiSom } from "./goi-som";
import { layKhungNho } from "./khung-nho";
import { initShell, setBarTitle } from "./shell";
import { openTripSheet } from "./trip-sheet";
import { khoiCanhBaoMoc, khoiNhanDatGap } from "./dat-gap-ui";
import { khoiNhapKeToan } from "./nhap-ke-toan-ui";
import { CHIEU_LABEL } from "../src/shared/chang-dua-don";
import { can } from "../src/shared/permissions";
import { cauMoc, changDuoiMoc, tomTatChanXacNhan, type ChangCanDatGap } from "../src/shared/dat-gap-hien-thi";
import { NO_BOOKER_TEXT } from "../src/shared/booker";
import { NO_HANDLER_TEXT, handlerControls, handlerFailure, handlerSaved, hoiDuocNguoiPhuTrach, nguoiPhuTrachTuPhien } from "../src/shared/handler-view";
import { HANDLER_HIDDEN } from "../src/shared/order-confirmation";
import { type PaxCounts } from "../src/shared/order-lines";
import { banner, classifyOrderError, type Banner } from "../src/shared/order-errors";
import { khongQuyenSuaText, orderActions, paxFullText, suaChuyenDuoc } from "../src/shared/order-view";
import { CHUA_XEP_XE, dongXeTrenDon, duocXemXeTrenDon } from "../src/shared/xe-tren-don";
import type { SuKienDon } from "../src/shared/bang-tin";

const id = new URLSearchParams(location.search).get("id");
const bannerEl = byId("error");
const root = byId("order");
const actions = byId("actions");
const sendEl = byId("send");
let current: Order | null = null;
let staff: Staff | null = null; // gán sau `initShell()`; các hàm dưới chỉ chạy sau đó
/** Mốc tối thiểu đang hiệu lực (phút) từ GET /api/orders/:id (ADR-0049 I31); null = chưa có chính sách (máy chủ trả 503 lúc xác nhận). */
let mocPhut: number | null = null;
/** Tiền của đơn từ billing (`GET /api/orders/:id/payments` — sổ tiền lượt 1); null = chưa tải được / không được xem (khối tiền hiện "—", không đoán). */
let tien: Api.OrderPaymentsResponse | null = null;
/** Xe chở từng chặng (ADR-0059, route của van-chuyen); null = không được xem / chưa tải được — KHÔNG hiện khối (không nói "Chưa xếp xe" khi không biết). */
let xeDon: Api.XeCuaDonResponse | null = null;
/** Dấu "đã nhập phần mềm kế toán" (ADR-0060, route billing); null = không được xem / chưa tải được — ẩn khối. */
let nhapKt: Api.NhapKeToanResponse | null = null;

// Form lập đơn ghi tiền trả trước ở BƯỚC HAI (sổ tiền lượt 1, NT-S6); bước đó hỏng thì chuyển tới đây kèm `thutruoc=loi` — báo một lần, bỏ tham số ngay.
let baoThuTruocLoi = new URLSearchParams(location.search).get("thutruoc") === "loi";
if (baoThuTruocLoi) {
  const url = new URL(location.href);
  url.searchParams.delete("thutruoc");
  history.replaceState(history.state, "", url.pathname + url.search + url.hash);
}

// Biểu mẫu lập đơn "Duyệt đặt gấp" (ADR-0049 R-P15) tự lưu nháp rồi gọi lệnh đặt gấp; lệnh đó hỏng thì chuyển tới đây kèm `datgap=loi` — báo một lần, bỏ tham số
// NGAY (như `moi`) để tải lại trang không báo lại.
let baoDatGapLoi = new URLSearchParams(location.search).get("datgap") === "loi";
if (baoDatGapLoi) {
  const url = new URL(location.href);
  url.searchParams.delete("datgap");
  history.replaceState(history.state, "", url.pathname + url.search + url.hash);
}

// Form lập đơn MỚI chuyển tới `/order?id=…&moi=1`: mở hộp thoại "Xác nhận đơn để gửi khách" (ảnh PNG) đúng một lần, sau lần tải đơn đầu tiên. Bỏ `moi` khỏi URL NGAY (trước mọi await), để dù
// bước dựng trang sau đó ném lỗi thì tải lại trang cũng không bật lại hộp thoại.
let autoOpenConfirmation = new URLSearchParams(location.search).get("moi") === "1";
if (autoOpenConfirmation) {
  const url = new URL(location.href);
  url.searchParams.delete("moi");
  history.replaceState(history.state, "", url.pathname + url.search + url.hash);
}

const sendButton = (): HTMLButtonElement | null => sendEl.querySelector("button");
/** Ảnh xác nhận gửi khách của đơn đang xem (mọi trạng thái, mọi người xem được đơn — ảnh chỉ in lại dữ liệu họ đã thấy). */
function openConfirmation(): void {
  if (current && staff) openConfirmationDialog({ order: current, viewer: staff, opener: sendButton });
}

/** `null` ẩn banner. Liên kết "Sửa" của banner incomplete_trip mở form ĐÚNG thẻ (`?focus=`, Task 7). */
function show(b: Banner | null): void {
  renderBanner(bannerEl, b, {
    reloadOrder: () => void load(),
    reloadPage: () => location.reload(),
    editHref: (serviceId) => `/order-form?id=${encodeURIComponent(id!)}&focus=${encodeURIComponent(serviceId)}`,
  });
}

/** Lỗi của máy chủ → banner theo ma trận đặc tả 5.2 (incomplete_trip có danh sách thiếu); lỗi mạng → câu chung. */
function errorBanner(err: unknown): Banner {
  if (!(err instanceof ApiError)) return banner("danger", "Không kết nối được máy chủ.");
  const b = classifyOrderError(
    { status: err.status, code: err.code, message: err.message, details: err.details },
    { serviceNames: current?.services.map((s) => s.name) ?? [], formatMoney: vnd, tenChang, mocPhut },
  );
  // 409 ở trang đơn (vd invalid_transition: đơn vừa đổi trạng thái ở nơi khác) phải có nút "Tải lại đơn" — PWA standalone không có tải lại của trình duyệt.
  // Trừ incomplete_trip: banner đó đã có liên kết "Sửa" tới đúng dịch vụ và ma trận đặc tả 5.2 ghi cột Hành động là "—" (stale đã có reload_order sẵn).
  return b.action === "none" && err.status === 409 && err.code !== "incomplete_trip" ? { ...b, action: "reload_order" } : b;
}

/** "Chiều đi · <dịch vụ>" của một chặng của đơn đang xem (dòng banner 409 `short_notice_required`). */
function tenChang(legId: string): string | null {
  for (const s of current?.services ?? []) {
    const l = s.legs.find((x) => x.id === legId);
    if (l) return `${CHIEU_LABEL[l.direction]} · ${s.name}`;
  }
  return null;
}

/**
 * Khối V12 dưới thông tin chuyến của một dịch vụ (bản vẽ 07): nhãn "Đặt gấp — …" của chặng đã đặt gấp (theo khoá có trong DTO — chủ H4) và dải cảnh báo dưới mốc
 * của chặng đơn NHÁP còn phải đặt gấp; người có ô order.leg.short_notice có nút "Đặt gấp" (route POST …/legs/:legId/short-notice).
 */
/**
 * ADR-0059: khối "Xe đón" dưới thông tin chuyến của một dịch vụ — mỗi chặng: "Xe … · Tài xế … · n khách · <trạng thái>" (chặng chia nhiều xe → nhiều dòng), chặng
 * chưa xếp → "Chưa xếp xe". Chỉ khi đã tải được `xeDon` (người không đủ quyền không gọi route — `duocXemXeTrenDon`).
 */
function khoiXe(order: Order, serviceId: string): HTMLElement | null {
  const s = order.services.find((x) => x.id === serviceId);
  if (!s || !xeDon || s.legs.length === 0) return null;
  const nhieuChang = s.legs.length > 1;
  const dong: HTMLElement[] = [];
  for (const l of s.legs) {
    const c = xeDon.chang.find((x) => x.legId === l.id);
    if (!c) continue;
    const nhan = nhieuChang ? `Xe đón · ${CHIEU_LABEL[l.direction]}` : "Xe đón";
    if (c.xe.length === 0) dong.push(kv(nhan, CHUA_XEP_XE, "xe-don-dong"));
    for (const x of c.xe) dong.push(kv(nhan, dongXeTrenDon(x), "xe-don-dong"));
  }
  return dong.length ? h("div", { class: "xe-don", "data-xe-don": s.id }, ...dong) : null;
}

function khoiChang(order: Order, serviceId: string, canDatGap: readonly ChangCanDatGap[], duocDatGap: boolean): HTMLElement | null {
  const s = order.services.find((x) => x.id === serviceId);
  if (!s) return null;
  const nhieuChang = s.legs.length > 1;
  const khoi: HTMLElement[] = [];
  for (const l of s.legs) {
    const duoi = canDatGap.find((c) => c.legId === l.id);
    if (!l.datGap && !duoi) continue;
    const dau = nhieuChang ? h("span", { class: "chip chip-unit" }, CHIEU_LABEL[l.direction]) : null;
    if (l.datGap) {
      khoi.push(h("div", { class: "dg-leg", "data-leg-id": l.id }, dau, khoiNhanDatGap(l.datGap)));
      continue;
    }
    const c = duoi!;
    const w = khoiCanhBaoMoc({
      cau: cauMoc(c.phutConLai, mocPhut!),
      duocDatGap,
      onDuyet: async (than) => {
        show(null);
        try {
          await api(`/api/orders/${encodeURIComponent(order.id)}/legs/${encodeURIComponent(l.id)}/short-notice`, { method: "POST", body: than });
        } catch (err) {
          show(errorBanner(err));
          bannerEl.scrollIntoView({ block: "nearest" });
          return;
        }
        await load();
        if (bannerEl.hidden) show(banner("info", `Đã duyệt đặt gấp: ${c.chieu} · ${c.tenDichVu}.`));
      },
    });
    khoi.push(h("div", { class: "dg-leg", "data-leg-id": l.id }, dau, w.root));
  }
  return khoi.length ? h("div", { class: "dg-legs" }, ...khoi) : null;
}

function kv(label: string, value: string | null, cls = ""): HTMLElement {
  return h("div", { class: `kv ${cls}` }, h("span", { class: "muted" }, label), h("span", null, value || "—"));
}

// ---- người phụ trách (v1.0, Task 8) ----
// null = chưa có người phụ trách; undefined = CHƯA BIẾT (lời gọi lỗi) — xem handlerControls; HANDLER_HIDDEN = người xem không được biết (Đối tác, Thực tập — `hoiDuocNguoiPhuTrach`): ẩn cả khối
type Handler = Api.HandlerDto | null | undefined | typeof HANDLER_HIDDEN;

/**
 * Người phụ trách đang mở của đơn. KHÔNG bao giờ ném lỗi: lời gọi hỏng thì đơn vẫn hiển thị, khối người phụ trách báo "chưa tải được" (không đoán "chưa có người" rồi mời nhận).
 * Phản hồi thiếu khoá hoặc sai dạng cũng coi là chưa biết (dữ liệu từ ngoài trang).
 */
async function loadHandler(orderId: string): Promise<Handler> {
  try {
    const found = (await api<Api.HandlersResponse>(`/api/dispatch/handlers?orderIds=${encodeURIComponent(orderId)}`)).handlers[orderId];
    if (found === null) return null;
    return found && typeof found.name === "string" && found.name.trim() !== "" ? found : undefined;
  } catch {
    return undefined;
  }
}

const asErrorInput = (err: unknown) => (err instanceof ApiError ? { status: err.status, code: err.code, message: err.message } : null);
/** Sau đổi/nhận người phụ trách hoặc khi màn hình đã lỗi thời: tải lại đơn, báo bằng `b` (tải lại lỗi thì giữ banner lỗi của `load()`, không đè), trả focus. */
async function reloadWith(b: Banner): Promise<void> {
  await load();
  if (bannerEl.hidden) show(b);
  focusHandlerControl();
}
/** Nút đổi đã bị dựng lại sau khi tải lại → trả focus về nút mới; người dùng không còn nút nào (vd vừa giao đơn đi) thì focus tiêu đề khối để không rơi ra `body`. */
const focusHandlerControl = (): void => (document.querySelector<HTMLElement>('[data-action="change-handler"]') ?? document.getElementById("handler-title"))?.focus();

function changeButton(order: Order, handler: Api.HandlerDto | null, label: string): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn", "data-action": "change-handler" }, label);
  btn.addEventListener("click", () =>
    openHandlerSheet(
      {
        order,
        current: handler,
        onSaved: (saved) => void reloadWith(banner("info", handlerSaved("assign", saved.name, handler !== null))),
        onOutdated: (b) => void reloadWith(b),
      },
      btn,
    ),
  );
  return btn;
}

/** "Nhận phụ trách": nhận cho CHÍNH MÌNH khi đơn chưa có người (máy chủ kiểm lại `dispatch.claim` và "chưa có người"). */
function claimButton(order: Order): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn btn-primary", "data-action": "claim-handler" }, "Nhận phụ trách");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    show(null);
    try {
      const { handler } = await api<Api.SetHandlerResponse>(`/api/orders/${encodeURIComponent(order.id)}/handler`, { method: "PUT", body: { staffId: staff!.id } });
      await reloadWith(banner("info", handlerSaved("claim", handler.name, false)));
    } catch (err) {
      const failure = handlerFailure(asErrorInput(err), "claim");
      if (failure.reload) await reloadWith(failure.banner);
      else {
        show(failure.banner);
        btn.disabled = false;
      }
    }
  });
  return btn;
}

/**
 * Khối "Người phụ trách": tên (hoặc chip "Chưa có người phụ trách") + nút đổi/nhận theo `can()` (src/shared/handler-view.ts). Chưa biết người phụ trách → chữ báo + "Thử lại", không nút nào khác.
 * Người xem không được biết (`HANDLER_HIDDEN` — Đối tác, Thực tập; lỗi báo 30/9, L2) → không dựng khối (như ảnh biên nhận: không dòng, không câu chờ).
 */
function handlerCard(order: Order, handler: Handler): HTMLElement | null {
  if (handler === HANDLER_HIDDEN) return null;
  const controls = handlerControls(staff!, order, handler);
  const buttons: HTMLElement[] = [];
  let summary: HTMLElement;
  if (handler === undefined) {
    summary = h("p", { class: "handler-unknown" }, "Chưa tải được người phụ trách.");
    const retry = h("button", { type: "button", class: "btn", "data-action": "retry-handler" }, "Thử lại");
    retry.addEventListener("click", () => void load().then(focusHandlerControl));
    buttons.push(retry);
  } else {
    summary = h("p", { class: "handler-name" }, handler === null ? h("span", { class: "chip chip-warn" }, NO_HANDLER_TEXT) : handler.name);
    // Sổ tiền lượt 1 (ADR-0025 đ4): sau "Đã giao" máy chủ từ chối đổi / nhận người phụ trách (409 order_delivered) — không hiện nút.
    if (controls.assign && !order.deliveredAt) buttons.push(changeButton(order, handler, controls.assignLabel));
    if (controls.claim && !order.deliveredAt) buttons.push(claimButton(order));
  }
  return h(
    "section",
    { class: "card handler-card", "aria-labelledby": "handler-title" },
    h("h2", { id: "handler-title", tabindex: -1 }, "Người phụ trách"),
    summary,
    buttons.length ? h("div", { class: "handler-actions" }, ...buttons) : null,
  );
}

/**
 * Dải tóm tắt đầu trang (Bước 2 Đợt B): mã đơn + trạng thái, chuyến (của DỊCH VỤ ĐẦU TIÊN — cùng quy ước
 * "dịch vụ đầu quyết định trip" dùng ở trang Đơn hàng, `OrderSummaryTripDto`), khách, tổng số khách (cộng dồn
 * mọi dịch vụ), còn lại phải thu. Phải chạy được khi đơn CHƯA có dịch vụ nào (đơn nháp mới tạo, `services` rỗng):
 * mọi trường của dịch vụ đọc qua `?.`, không văng lỗi.
 */
function summaryBand(order: Order): HTMLElement {
  const firstSvc = order.services[0];
  const when = firstSvc?.departDate ? `${dayMonth(firstSvc.departDate)}${firstSvc.pickupTime ? ` · ${firstSvc.pickupTime}` : ""}` : "Chưa có ngày khởi hành"; // bản 1.39: cùng chữ với dòng cảnh báo ở thẻ dịch vụ (trước: "Chưa có ngày đón")
  const totalPax = order.services.reduce<PaxCounts>(
    (sum, s) => ({ adult: sum.adult + s.pax.adult, child: sum.child + s.pax.child, senior: sum.senior + s.pax.senior, infant: sum.infant + s.pax.infant }),
    { adult: 0, child: 0, senior: 0, infant: 0 },
  );
  const pax = paxFullText(totalPax); // bản 1.39: viết đủ chữ ("8 người lớn, 1 trẻ em"); danh sách đơn vẫn viết tắt
  // Cùng công thức rút gọn tên dịch vụ dùng ở trang Đơn hàng (`web/orders.ts`, `serviceLine`): tổng số khách phía trên CỘNG DỒN mọi
  // dịch vụ, nên dòng phụ này không được chỉ ghi tên dịch vụ đầu tiên (I2) — phải phản ánh đơn có bao nhiêu dịch vụ.
  const serviceNames = order.services.map((s) => s.name);
  const serviceLine = serviceNames.length === 0 ? "—" : serviceNames.length === 1 ? serviceNames[0] : `${serviceNames[0]} +${serviceNames.length - 1} dịch vụ`;
  const stat = (label: string, value: string, sub?: string, due = false) =>
    h("div", null, h("div", { class: "label" }, label), h("div", { class: due ? "value due" : "value" }, value), sub ? h("div", { class: "sub" }, sub) : null);
  return h(
    "div",
    { class: "order-summary-band" },
    h(
      "div",
      null,
      h("div", { class: "label" }, "MÃ ĐƠN"),
      h("div", { class: "value" }, order.orderCode, " ", badgeTrangThai(order)),
    ),
    h("div", { class: "sep" }),
    h(
      "div",
      { class: "grid4" },
      stat("ĐÓN", when, firstSvc?.pickupPlace ?? undefined),
      stat("KHÁCH", order.customerName, order.customerPhone),
      stat("SỐ KHÁCH", pax || "—", serviceLine),
      tien
        ? stat(tien.du > 0 ? "KHÁCH TRẢ DƯ" : "CÒN LẠI", vnd(tien.du > 0 ? tien.du : tien.conLai), `Tổng ${vnd(order.total)} · đã thu ${vnd(tien.daThu)}`, tien.conLai > 0 || tien.du > 0)
        : stat("CÒN LẠI", "—", `Tổng ${vnd(order.total)}`),
    ),
  );
}

/** Huy hiệu trạng thái: "Đã giao – đã thu đủ" / "Hoàn thành" suy ra từ mốc (`trangThaiHienThi`, src/shared — một nguồn nhãn). */
function badgeTrangThai(order: Order): HTMLElement {
  const tt = trangThaiHienThi(order);
  return h("span", { class: `badge badge-${tt.khoa}` }, tt.nhan);
}

// ---- Thanh toán (sổ tiền lượt 1 — ADR-0025, ADR-0026): số do billing tính; trình duyệt chỉ vẽ, ẩn/hiện nút theo cờ máy chủ gửi ----
function tienCard(order: Order): HTMLElement {
  const t = tien;
  const rows: HTMLElement[] = [kv("Tạm tính", vnd(order.subtotal)), kv("Giảm giá", vnd(order.discount)), kv("Tổng cộng", vnd(order.total), "strong")];
  if (t) {
    rows.push(kv("Đã thu", vnd(t.daThu)));
    rows.push(t.du > 0 ? kv("Khách trả dư", `${vnd(t.du)} — chờ Kế toán hoàn`, "strong") : kv("Còn lại", vnd(t.conLai), "strong"));
  } else rows.push(kv("Đã thu / còn lại", "Chưa tải được"));
  rows.push(kv("Ghi chú thanh toán", order.paymentNote));
  const lanThu =
    t && t.lanThu.length
      ? h(
          "ul",
          { class: "pay-list", "data-khoi": "lan-thu" },
          ...t.lanThu.map((l) =>
            h(
              "li",
              null,
              h("span", { class: "muted" }, `${dayMonth(l.ngayPhatSinh)} · ${l.giaiDoan}`),
              ` — ${l.traLai ? "Trả lại khách " : ""}${vnd(l.soTien)} · ${l.hinhThuc} · người thu: ${l.nguoiThu}`,
              l.laDongDao ? h("span", { class: "muted" }, " (dòng đảo)") : l.daDao ? h("span", { class: "muted" }, " (đã đảo)") : null,
              t.keToan && !t.completedAt ? nutKeToanLanThu(order, t, l) : null,
            ),
          ),
        )
      : null;
  // NT-F11 (Hiến chương 5.7): lý do đơn đang bị giữ + ai phải xử lý — hiện NGAY, không đợi bấm nút mới báo lỗi. Đơn nháp / huỷ không cần dòng này.
  const lyDo = t ? (t.deliveredAt ? t.lyDoChuaHoanThanh : t.lyDoChuaGiao) : null;
  const giu =
    lyDo && lyDo.ma !== "not_confirmed" && lyDo.ma !== "cancelled"
      ? h("p", { class: "dg-lock dg-lock-note", "data-khoi": "ly-do-giu" }, `Đang giữ đơn: ${lyDo.cau} Ai xử lý: ${lyDo.aiXuLy}.`)
      : null;
  const keToan = t?.keToan && !t.completedAt ? khoiKeToan(order, t) : null;
  const nut: HTMLElement[] = [];
  if (t?.coTheGhiThu) nut.push(nutGhiThu(order, t));
  if (t && t.quyenGiao && !t.deliveredAt && order.status === "confirmed") nut.push(nutChot(order, "delivered", t));
  if (t && t.quyenHoanThanh && t.deliveredAt && !t.completedAt) nut.push(nutChot(order, "completed", t));
  return h(
    "section",
    { class: "card totals", "data-khoi": "thanh-toan" },
    h("h2", null, "Thanh toán"),
    ...rows,
    lanThu,
    keToan,
    giu,
    nut.length ? h("div", { class: "handler-actions" }, ...nut) : null,
  );
}

// ---- Thao tác Kế toán đặt TẠM trên trang đơn (điều phối 30/9: hai màn sổ riêng chờ chủ vẽ lại trên Claude Design). Chỉ hiện khi máy chủ gửi khối
// `keToan` (người có ô `ledger.write`); máy chủ vẫn là cổng. Chỉ gọi route billing đã có. Mỗi thao tác mở một hàng xác nhận NGAY trong thẻ (không dùng
// confirm() của trình duyệt): bấm lần hai mới ghi. ----

/** Mở một hàng xác nhận tại chỗ: `noiDung` (các ô nhập, nếu có) + nút ghi + "Thôi"; `ghi` trả lời gọi máy chủ; xong → tải lại đơn và báo. */
function hangXacNhan(opts: { nhan: string; action: string; cau: string; nutGhi: string; o?: HTMLElement[]; ghi: () => Promise<unknown>; bao: string; kiem?: () => string | null }): HTMLElement {
  const wrap = h("span", { class: "pay-inline" });
  const mo = h("button", { type: "button", class: "btn btn-link", "data-action": opts.action }, opts.nhan);
  mo.addEventListener("click", () => {
    const ghi = h("button", { type: "submit", class: "btn btn-primary" }, opts.nutGhi);
    const thoi = h("button", { type: "button", class: "btn" }, "Thôi");
    const form = h(
      "form",
      { class: "pay-form", "data-khoi": `xac-nhan-${opts.action}` },
      h("p", null, opts.cau),
      opts.o && opts.o.length ? h("div", { class: "grid two" }, ...opts.o) : null,
      h("div", { class: "handler-actions" }, ghi, thoi),
    ) as HTMLFormElement;
    thoi.addEventListener("click", () => replaceChildren(wrap, mo));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const loiNhap = opts.kiem?.() ?? null;
      if (loiNhap) return show(banner("danger", loiNhap));
      ghi.disabled = true;
      show(null);
      try {
        await opts.ghi();
        await load();
        if (bannerEl.hidden) show(banner("info", opts.bao));
      } catch (err) {
        show(errorBanner(err));
        ghi.disabled = false;
      }
    });
    replaceChildren(wrap, form);
  });
  wrap.append(mo);
  return wrap;
}

/** Nút trên từng lần thu: "Xác nhận đã nhận" (Công ty thu – CK do người khác khai — H3), "Đảo" (ghi dòng đảo, bắt buộc lý do; gồm lần thu "chưa rõ" từ cọc cũ). */
function nutKeToanLanThu(order: Order, t: Api.OrderPaymentsResponse, l: Api.LanThuDto): HTMLElement | null {
  const nut: HTMLElement[] = [];
  if (t.keToan!.choXacNhan.includes(l.id)) {
    nut.push(
      hangXacNhan({
        nhan: "Xác nhận đã nhận", action: "xac-nhan-ck", nutGhi: "Công ty đã nhận",
        cau: `Đã đối chiếu: công ty đã nhận ${vnd(l.soTien)} vào tài khoản?`,
        ghi: () => api(`/api/ledger/company-receipts/${encodeURIComponent(l.id)}/confirm`, { method: "POST", body: {} }),
        bao: `Đã xác nhận công ty nhận ${vnd(l.soTien)}.`,
      }),
    );
  }
  if (!l.daDao && !l.laDongDao) {
    const lyDo = h("input", { type: "text", autocomplete: "off", maxlength: "500", placeholder: "Vì sao đảo (bắt buộc)" }) as HTMLInputElement;
    nut.push(
      hangXacNhan({
        nhan: "Đảo", action: "dao-lan-thu", nutGhi: "Ghi dòng đảo",
        cau: `Đảo lần ${l.traLai ? "hoàn" : "thu"} ${vnd(l.soTien)} (người thu: ${l.nguoiThu})? Sổ giữ dòng cũ và thêm một dòng đảo.`,
        o: [h("label", null, "Lý do", lyDo)],
        kiem: () => (lyDo.value.trim() ? null : "Nhập lý do đảo."),
        ghi: () => api("/api/ledger/adjustments", { method: "POST", body: { loai: "dao_lan_thu", receiptId: l.id, lyDo: lyDo.value.trim() } }),
        bao: `Đã đảo lần ${l.traLai ? "hoàn" : "thu"} ${vnd(l.soTien)}.`,
      }),
    );
  }
  return nut.length ? h("span", { class: "kt-actions" }, ...nut) : null;
}

/** Khối Kế toán dưới danh sách lần thu: ai đang giữ tiền của công ty vì đơn này → "Đã nộp về công ty"; khách trả dư → "Ghi hoàn cho khách". */
function khoiKeToan(order: Order, t: Api.OrderPaymentsResponse): HTMLElement | null {
  const kt = t.keToan!;
  const dong: HTMLElement[] = kt.dangGiu.map((d) =>
    h(
      "li",
      { "data-khoi": "dang-giu" },
      `${d.ten} đang giữ ${vnd(d.soTien)} của công ty `,
      hangXacNhan({
        nhan: "Đã nộp về công ty", action: "da-nop", nutGhi: "Ghi đã nộp",
        cau: `Ghi ${d.ten} đã nộp ${vnd(d.soTien)} của đơn này về công ty?`,
        ghi: () => api("/api/ledger/settlements", { method: "POST", body: { chieu: "nop", partyId: d.partyId, phanBo: [{ orderId: order.id, soTien: d.soTien }] } }),
        bao: `Đã ghi ${d.ten} nộp ${vnd(d.soTien)}.`,
      }),
    ),
  );
  let hoan: HTMLElement | null = null;
  if (t.du > 0) {
    const soTien = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", value: String(t.du) }) as HTMLInputElement;
    regroupMoney(soTien);
    soTien.addEventListener("input", () => regroupMoney(soTien));
    const hinhThuc = h("select", null, ...(["BANK_TRANSFER", "CASH", "OTHER"] as const).map((m) => h("option", { value: m }, METHOD_LABEL[m]))) as HTMLSelectElement;
    const nguoiTra = h("select", null, h("option", { value: "cong_ty" }, "Công ty"), ...kt.dangGiu.map((d) => h("option", { value: d.partyId }, d.ten))) as HTMLSelectElement;
    hoan = hangXacNhan({
      nhan: "Ghi hoàn cho khách", action: "ghi-hoan", nutGhi: "Ghi hoàn",
      cau: `Khách đã trả dư ${vnd(t.du)}. Ghi số tiền đã hoàn cho khách:`,
      o: [h("label", null, "Số tiền (₫)", soTien), h("label", null, "Hình thức", hinhThuc), h("label", null, "Người trả cho khách", nguoiTra)],
      kiem: () => (parseMoney(soTien.value) > 0 ? null : "Nhập số tiền hoàn."),
      ghi: () =>
        api("/api/ledger/refunds", {
          method: "POST",
          body: { orderId: order.id, soTien: parseMoney(soTien.value), hinhThuc: hinhThuc.value, nguoiTra: nguoiTra.value === "cong_ty" ? "cong_ty" : { partyId: nguoiTra.value } },
        }),
      bao: "Đã ghi hoàn cho khách.",
    });
  }
  if (dong.length === 0 && !hoan) return null;
  return h(
    "div",
    { class: "kt-khoi", "data-khoi": "ke-toan" },
    h("h3", null, "Kế toán"),
    dong.length ? h("ul", { class: "pay-list" }, ...dong) : null,
    hoan,
  );
}

/** "Đã giao – đã thu đủ" / "Hoàn thành": nút TẮT khi máy chủ báo chưa đủ điều kiện (lý do hiện ngay trên); bấm → hỏi xác nhận → route billing → tải lại. */
function nutChot(order: Order, loai: "delivered" | "completed", t: Api.OrderPaymentsResponse): HTMLButtonElement {
  const giao = loai === "delivered";
  const btn = h("button", { type: "button", class: giao ? "btn btn-accent" : "btn btn-primary", "data-action": giao ? "da-giao" : "hoan-thanh" }, giao ? "Đã giao – đã thu đủ" : "Hoàn thành");
  btn.disabled = giao ? !t.coTheGiao : !t.coTheHoanThanh;
  btn.addEventListener("click", async () => {
    const cau = giao
      ? `Xác nhận Đã giao – đã thu đủ? Từ lúc này đơn bị khoá, không sửa, huỷ hay đổi người phụ trách được nữa.${t.banDangGiu > 0 ? ` Bạn đang giữ ${vnd(t.banDangGiu)} của công ty — nhớ nộp về công ty.` : ""}`
      : "Xác nhận Hoàn thành đơn này? Không mở lại được.";
    if (!confirm(cau)) return;
    btn.disabled = true;
    show(null);
    try {
      await api(`/api/orders/${encodeURIComponent(order.id)}/${loai}`, { method: "POST", body: {} });
      await load();
      if (bannerEl.hidden) show(banner("info", giao ? "Đã giao – đã thu đủ. Đơn đã khoá." : "Đơn đã Hoàn thành."));
    } catch (err) {
      const b = errorBanner(err);
      await load(true);
      show(b);
    }
  });
  return btn;
}

/** "Ghi lần thu" (ADR-0026 đ2): số tiền, hình thức (mặc định Chuyển khoản — chủ duyệt 30/9), người nhận (Công ty / tôi); Kế toán chọn được ngày phát sinh. */
function nutGhiThu(order: Order, t: Api.OrderPaymentsResponse): HTMLElement {
  const wrap = h("div", { class: "pay-inline" });
  const mo = h("button", { type: "button", class: "btn", "data-action": "ghi-lan-thu" }, "Ghi lần thu");
  mo.addEventListener("click", () => {
    const soTien = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", placeholder: "0" }) as HTMLInputElement;
    soTien.addEventListener("input", () => regroupMoney(soTien));
    const hinhThuc = h("select", null, ...(["BANK_TRANSFER", "CASH", "OTHER"] as const).map((m) => h("option", { value: m }, METHOD_LABEL[m]))) as HTMLSelectElement;
    const nguoi = h("select", null, h("option", { value: "cong_ty" }, "Công ty (vào tài khoản công ty)"), h("option", { value: "toi" }, "Tôi thu")) as HTMLSelectElement;
    const ngay = t.laKeToan ? (h("input", { type: "date" }) as HTMLInputElement) : null;
    const ghi = h("button", { type: "submit", class: "btn btn-primary" }, "Ghi");
    const thoi = h("button", { type: "button", class: "btn" }, "Thôi");
    const form = h(
      "form",
      { class: "pay-form", "data-khoi": "form-lan-thu" },
      h(
        "div",
        { class: "grid two" },
        h("label", null, "Số tiền (₫)", soTien),
        h("label", null, "Hình thức", hinhThuc),
        h("label", null, "Người nhận tiền", nguoi),
        ngay ? h("label", null, "Ngày phát sinh", ngay) : null,
      ),
      h("div", { class: "handler-actions" }, ghi, thoi),
    ) as HTMLFormElement;
    thoi.addEventListener("click", () => replaceChildren(wrap, mo));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const so = parseMoney(soTien.value);
      if (so <= 0) return show(banner("danger", "Nhập số tiền đã thu."));
      ghi.disabled = true;
      show(null);
      try {
        const than: Api.LanThuInput = {
          soTien: so,
          hinhThuc: hinhThuc.value as Api.LanThuInput["hinhThuc"],
          nguoiThu: nguoi.value === "toi" ? "toi" : "cong_ty",
          ...(ngay?.value ? { ngayPhatSinh: ngay.value } : {}),
        };
        await api(`/api/orders/${encodeURIComponent(order.id)}/payments`, { method: "POST", body: than });
        await load();
        if (bannerEl.hidden) show(banner("info", `Đã ghi lần thu ${vnd(so)}.`));
      } catch (err) {
        show(errorBanner(err));
        ghi.disabled = false;
      }
    });
    replaceChildren(wrap, form);
    soTien.focus();
  });
  wrap.append(mo);
  return wrap;
}

function render(order: Order, history: AuditEntry[], canModify: boolean, handler: Handler): void {
  current = order;
  // L1 (lỗi báo 30/9): nút "Sửa thông tin chuyến" / "Đổi khách" theo ô order.trip.edit (Đối tác, Thực tập: không) — không chỉ theo canModify.
  const a = orderActions(order.status, canModify, suaChuyenDuoc(staff!, order.staffId, canModify));
  // ADR-0049 V12: chặng đơn nháp còn dưới mốc chưa đặt gấp (luật kiemMocDat, dữ liệu N-14) — chỉ để hiện; máy chủ vẫn quyết lúc xác nhận (409).
  const canDatGap = changDuoiMoc(order, mocPhut, Date.now());
  const duocDatGap = can(staff!, "order.leg.short_notice");
  document.title = `${order.orderCode} — Island Booking System`;
  setBarTitle(order.orderCode);
  replaceChildren(
    root,
    // Mã đơn + trạng thái đã hiện nổi bật ở dải tóm tắt ngay dưới đây; h1 ở đây chỉ còn phục vụ trình đọc màn hình (axe page-has-heading-one), ẩn khỏi mắt (CSS `.detail-head h1`).
    h("header", { class: "detail-head" }, h("h1", null, order.orderCode)),
    summaryBand(order),
    h("p", { class: "muted" }, `Lập ${dateTime(order.createdAt)} bởi ${order.staffName}`, order.confirmedAt && ` · Xác nhận ${dateTime(order.confirmedAt)}`),
    order.deliveredAt
      ? h("p", { class: "lock-note" }, icon("lock", 18), order.completedAt ? "Đơn đã Hoàn thành — đơn đã khoá." : "Đơn đã Đã giao – đã thu đủ — đơn đã khoá, không sửa, huỷ hay đổi người phụ trách được nữa.")
      : a.locked
        ? h("p", { class: "lock-note" }, icon("lock", 18), a.editTrip ? "Đơn đã xác nhận: dịch vụ, số khách và tiền đã khoá. Chỉ sửa được thông tin chuyến." : "Đơn đã xác nhận: dịch vụ, số khách và tiền đã khoá.") // bản 1.39: không có nút sửa chuyến (vd hướng dẫn viên, kế toán) thì không hứa "sửa được thông tin chuyến"
        : null,

    h(
      "div",
      { class: "order-layout" },
      h(
        "div",
        null,
        handlerCard(order, handler),

        h(
          "section",
          { class: "card" },
          h("h2", null, "Khách hàng"),
          kv("Tên", order.customerName),
          kv("Số điện thoại", order.customerPhone),
          kv("Email", order.customerEmail),
          kv("Ghi chú", order.customerNote),
          kv("Hồ sơ khách", order.bookerName ?? NO_BOOKER_TEXT),
          a.editTrip ? bookerButton(order) : null,
        ),

        renderServices(order, a.locked, (sid) => {
          const xe = khoiXe(order, sid);
          const dg = khoiChang(order, sid, canDatGap, duocDatGap);
          return xe && dg ? h("div", null, xe, dg) : xe ?? dg;
        }),
      ),
      h(
        "div",
        { class: "side" },
        tienCard(order),
        nhapKt ? khoiNhapKeToan(order.id, nhapKt, hangXacNhan) : null,
      ),
    ),

    // Ở NGOÀI `.order-layout` có chủ đích (điện thoại dưới 900px không có rule riêng cho lưới → các con xếp theo thứ tự DOM;
    // đặt ở đây giữ đúng thứ tự cũ "Thanh toán trước Lịch sử". Máy tính ≥900px: khối này trải hết bề ngang, nằm dưới lưới 2 cột.
    // D6: SALES không thấy nhật ký đơn của người khác → history rỗng: ẩn cả khối.
    // Task 8 Đợt E: `detail` (vd lý do hướng dẫn viên ghi khi sửa số khách/tiền — order_money_adjusted_by_field) đã có sẵn trong `history` từ
    // trước (audit/repository.ts:listByOrder chọn cả cột `detail`) nhưng trang này chưa từng dựng ra — hiện thêm ở ĐÂY, bên trong khối "Lịch sử"
    // đã có, không thêm chỗ hiện nào khác trên trang (thẻ đơn, phần xổ, khối tiền): ô quyền order.history.view đã quyết ai thấy KHỐI này, hiện
    // thêm `detail` của MỘT dòng đã được phép xem không mở rộng thêm ai xem được gì — không đụng permissions.ts.
    history.length
      ? h(
          "section",
          { class: "card" },
          h("h2", null, "Lịch sử"),
          h(
            "ul",
            { class: "history" },
            ...history.map((e) =>
              h(
                "li",
                null,
                h("span", { class: "muted" }, dateTime(e.at)),
                ` — ${actionLabel(e.action)} · ${e.staffName}`,
                e.detail ? h("div", { class: "history-detail muted" }, e.detail) : null,
              ),
            ),
          ),
        )
      : null,
  );

  const btns: HTMLElement[] = [];
  // Quyền sửa/xác nhận/huỷ do MÁY CHỦ quyết (`canModify`, kể cả người phụ trách — ADR-0009); câu này chỉ giải thích cho người không có quyền.
  // Hướng dẫn viên LÀ người phụ trách mà không sửa được (order.modify FIELD = none) → câu riêng, không nói "người phụ trách đơn … mới được sửa" (`khongQuyenSuaText`).
  if (a.noPermission && !order.deliveredAt) btns.push(h("p", { class: "muted" }, khongQuyenSuaText({ ownerName: order.staffName, status: order.status, viewer: staff! })));
  if (a.edit) btns.push(h("a", { class: "btn", href: `/order-form?id=${encodeURIComponent(order.id)}` }, "Sửa"));
  // Bản vẽ 7a / 7b: còn chặng phải đặt gấp → nút Xác nhận khoá + dòng nói vì sao (Bán hàng: "Cần Quản trị duyệt đặt gấp"; Quản trị: "Duyệt đặt gấp xong thì xác nhận được.").
  const chanXacNhan = a.confirm ? tomTatChanXacNhan(canDatGap, duocDatGap) : null;
  if (a.confirm) {
    const nut = change("Xác nhận đơn", "confirmed", "Xác nhận đơn này? Sau khi xác nhận, dịch vụ, số khách và tiền sẽ bị khoá — chỉ còn sửa được thông tin chuyến.", "btn btn-accent");
    nut.disabled = chanXacNhan !== null;
    btns.push(nut);
  }
  if (a.editTrip) btns.push(editTripButton(order));
  if (a.cancel) btns.push(change("Huỷ đơn", "cancelled", "Huỷ đơn này? Việc huỷ không thể hoàn tác.", "btn btn-danger"));
  if (chanXacNhan) btns.push(duocDatGap ? h("p", { class: "dg-lock dg-lock-note", "data-chan": "xac-nhan" }, chanXacNhan) : h("p", { class: "dg-lock", "data-chan": "xac-nhan" }, icon("lock", 16), chanXacNhan));
  replaceChildren(actions, ...btns);
  // Nút riêng, ngoài `#actions` (bộ nút sửa/xác nhận/huỷ phụ thuộc trạng thái và quyền; nút này luôn có).
  const send = h("button", { type: "button", class: "btn btn-primary", "data-action": "send-confirmation" }, "Xem biên nhận");
  send.addEventListener("click", openConfirmation);
  replaceChildren(sendEl, send);
}

const focusChangeBooker = (): void => document.querySelector<HTMLElement>('[data-action="change-booker"]')?.focus();

/** Đơn đã xác nhận: mở bảng "Đổi khách" (ADR-0011 điều 2 — cùng điều kiện hiện nút với "Sửa thông tin chuyến"). Đơn nháp đổi khách trong form. */
function bookerButton(order: Order): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn", "data-action": "change-booker" }, "Đổi khách");
  btn.addEventListener("click", () =>
    openBookerSheet(
      {
        order,
        onSaved: () =>
          void load().then(() => {
            if (bannerEl.hidden) show(banner("info", "Đã đổi khách."));
            focusChangeBooker();
          }),
        onReload: () => void load().then(focusChangeBooker),
      },
      btn,
    ),
  );
  return btn;
}

const focusEditTrip = (): void => document.querySelector<HTMLElement>('[data-action="edit-trip"]')?.focus();

/** Đơn đã xác nhận: mở bảng sửa chuyến. Sau khi lưu/tải lại, nút bị dựng lại → trả focus về nút mới; lưu xong báo bằng banner thông tin (bảng vừa biến mất). */
function editTripButton(order: Order): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn btn-primary", "data-action": "edit-trip" }, "Sửa thông tin chuyến");
  btn.addEventListener("click", () =>
    openTripSheet(
      {
        order,
        coDatGap: can(staff!, "order.leg.short_notice"),
        onSaved: () =>
          void load().then(() => {
            if (bannerEl.hidden) show(banner("info", "Đã lưu thông tin chuyến.")); // tải lại lỗi thì giữ banner lỗi, không đè
            focusEditTrip();
          }),
        onReload: () => void load().then(focusEditTrip),
      },
      btn,
    ),
  );
  return btn;
}

function change(label: string, to: "confirmed" | "cancelled", prompt: string, cls: string): HTMLButtonElement {
  const btn = h("button", { type: "button", class: cls }, label);
  btn.addEventListener("click", async () => {
    if (!confirm(prompt)) return;
    btn.disabled = true;
    show(null);
    try {
      await api(`/api/orders/${encodeURIComponent(id!)}/status`, { method: "POST", body: { status: to } });
      await load();
    } catch (err) {
      show(errorBanner(err));
      btn.disabled = false;
    }
  });
  return btn;
}

let loadSeq = 0; // như web/orders.ts: bỏ phản hồi của lần tải cũ hơn lần đã áp (một lần làm mới im lặng chậm không được vẽ đè bản mới hơn)
/** `quiet` = làm mới theo tin của Bảng tin: lỗi mạng thì giữ nguyên màn hình đang hiện (không dựng banner đỏ đè lên đơn còn dùng được). */
async function load(quiet = false): Promise<void> {
  const seq = ++loadSeq;
  try {
    // Người phụ trách tải song song với đơn; lời gọi của nó không bao giờ ném lỗi (xem loadHandler) nên đơn luôn hiển thị được.
    const [{ order, history, canModify, mocToiThieuPhut }, handler, tienDon, xe, nhapKtDon] = await Promise.all([layDon!(), layNguoiPhuTrach(id!), layTien(id!), layXe(id!), layNhapKt(id!)]);
    if (seq !== loadSeq) return;
    mocPhut = mocToiThieuPhut;
    tien = tienDon;
    xeDon = xe;
    nhapKt = nhapKtDon;
    show(null);
    render(order, history, canModify, handler);
    if (baoThuTruocLoi) {
      baoThuTruocLoi = false;
      show(banner("warning", "Đơn đã lưu, chưa ghi được tiền trả trước — thử lại.", { lines: [{ text: "Bấm “Ghi lần thu” ở mục Thanh toán bên dưới." }] }));
    }
    if (baoDatGapLoi) {
      baoDatGapLoi = false;
      show(banner("warning", "Đơn đã lưu nhưng chưa duyệt đặt gấp được.", { lines: [{ text: "Bấm “Đặt gấp” ở chặng bên dưới để duyệt lại." }] }));
    }
    if (autoOpenConfirmation) {
      autoOpenConfirmation = false;
      openConfirmation();
    }
  } catch (err) {
    if (seq !== loadSeq) return; // lần tải mới hơn đã/đang lo màn hình (kể cả banner lỗi)
    if (quiet && current) return;
    // Có nút "Tải lại đơn": PWA standalone không có tải lại của trình duyệt, và `load()` tự nuốt lỗi nên các nút vừa bấm (Xác nhận/Huỷ) có thể đang khoá.
    show(banner("danger", err instanceof ApiError ? err.message : "Không tải được đơn.", { action: "reload_order" }));
  }
}

/** Đang mở bảng sửa (chuyến/khách/người phụ trách) hoặc hộp xác nhận (cùng khuôn `.sheet[role=dialog]`)? Khi đó không dựng lại trang dưới tay người dùng. */
const sheetOpen = (): boolean => document.querySelector('.sheet[role="dialog"]') !== null;

/** Làm mới theo tin (ADR-0022, TD-3): MỘT lần tải mỗi lúc (bộ gộp). Có bảng đang mở thì chỉ báo bằng dải "Tải lại" — không tự dựng lại, khỏi mất chữ đang gõ. */
const lamMoi = taoBoLamMoi(async () => {
  if (sheetOpen()) return show(banner("info", "Đơn vừa được cập nhật — Tải lại", { action: "reload_order" }));
  await load(true);
});

/** Tiền của đơn (billing). KHÔNG ném lỗi: 403 / lỗi mạng → null — khối tiền hiện "—", đơn vẫn hiển thị. */
const layTien = (orderId: string): Promise<Api.OrderPaymentsResponse | null> =>
  api<Api.OrderPaymentsResponse>(`/api/orders/${encodeURIComponent(orderId)}/payments`).catch(() => null);

/** Xe chở từng chặng (ADR-0059). Chỉ gọi khi đủ HAI ô (trip.view + order.view không ngữ cảnh); KHÔNG ném lỗi: 403 / lỗi mạng → null — không hiện khối. */
const layXe = (orderId: string): Promise<Api.XeCuaDonResponse | null> =>
  duocXemXeTrenDon(staff!) ? api<Api.XeCuaDonResponse>(`/api/van-chuyen/xe-cua-don/${encodeURIComponent(orderId)}`).catch(() => null) : Promise.resolve(null);

/** ADR-0060: chỉ hỏi khi ô xem dấu có ít nhất một phạm vi (tài khoản chỉ-Đối tác KHÔNG bao giờ gửi); máy chủ quyết theo đơn — 403/404 → ẩn khối. */
const layNhapKt = (orderId: string): Promise<Api.NhapKeToanResponse | null> =>
  can(staff!, "accounting.entry.view", { ownerId: staff!.id, assigned: true })
    ? api<Api.NhapKeToanResponse>(`/api/orders/${encodeURIComponent(orderId)}/nhap-ke-toan`).catch(() => null)
    : Promise.resolve(null);

// Gọi sớm (web/goi-som.ts): đơn gửi NGAY, song song với /api/auth/me của initShell(); chỉ dựng trang sau khi initShell() xong.
const layDon = id ? goiSom(() => api<Api.OrderDetailResponse>(`/api/orders/${encodeURIComponent(id)}`)) : null;
// Người phụ trách (vòng sửa 1 sau kiểm độc lập lượt 1 ADR-0030, phát hiện I-2): GET /api/dispatch/handlers chỉ mở cho người XEM ĐƯỢC MỌI ĐƠN (cổng `order.view`
// không ngữ cảnh — đúng cờ `seesAll` của bản nhớ khung ADR-0035) → chỉ gọi SỚM khi bản nhớ khung nói vậy (tiền lệ web/order-form.ts). Quyết định thật đợi
// `initShell()`: hướng dẫn viên (chỉ xem đơn mình phụ trách) → người phụ trách = chính họ, tên từ phiên, KHÔNG gọi route đó (403 với họ — ruling Task 1.6).
const layNguoiPhuTrachSom = id && layKhungNho()?.seesAll === true ? goiSom(() => loadHandler(id)) : null;
// Người KHÔNG xem được mọi đơn (Đối tác, Thực tập — lỗi báo 30/9, L2): route 403 chắc chắn → không gọi, ẩn khối. Kiểm TRƯỚC lời gọi sớm: trên máy dùng chung
// bản nhớ khung có thể là của người trước (văn phòng) nên lời gọi sớm đã chạy — kết quả của nó bị bỏ.
function layNguoiPhuTrach(orderId: string): Promise<Handler> {
  const tuPhien = nguoiPhuTrachTuPhien(staff!);
  if (tuPhien) return Promise.resolve(tuPhien);
  if (!hoiDuocNguoiPhuTrach(staff!)) return Promise.resolve(HANDLER_HIDDEN);
  return layNguoiPhuTrachSom ? layNguoiPhuTrachSom() : loadHandler(orderId);
}
staff = await initShell();
if (!id) show(banner("danger", "Thiếu mã đơn."));
else {
  await load();
  // Đăng ký MỘT lần, sau lần tải đầu (tin đến trong lúc tải đầu thì lần tải đầu đã đọc dữ liệu mới nhất). Tin về đơn KHÁC thì bỏ qua; tin về đơn
  // do CHÍNH tab này vừa ghi (≤ 5 giây, sổ của web/api.ts) cũng bỏ qua — trang đã tự tải lại sau thao tác đó và tải lại lần nữa sẽ xoá dải "Đã lưu…".
  window.addEventListener("don-thay-doi", (ev) => {
    if (suKienVeDon((ev as CustomEvent<SuKienDon[]>).detail, id) && !vuaLamBoiTabNay(id)) void lamMoi.yeuCau();
  });
  window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
}
