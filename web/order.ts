import { ApiError, api, vuaLamBoiTabNay, type Api, type AuditEntry, type Order, type Staff } from "./api";
import { renderBanner } from "./banner";
import { openBookerSheet } from "./booker-sheet";
import { openConfirmationDialog } from "./confirmation-dialog";
import { byId, h, replaceChildren } from "./dom";
import { METHOD_LABEL, STATUS_LABEL, actionLabel, dateTime, dayMonth, paxCounts, vnd } from "./format";
import { openHandlerSheet } from "./handler-sheet";
import { icon } from "./icons";
import { suKienVeDon, taoBoLamMoi } from "./lam-moi-logic";
import { renderServices } from "./order-services";
import { goiSom } from "./goi-som";
import { layKhungNho } from "./khung-nho";
import { initShell, setBarTitle } from "./shell";
import { openTripSheet } from "./trip-sheet";
import { khoiCanhBaoMoc, khoiNhanDatGap } from "./dat-gap-ui";
import { CHIEU_LABEL } from "../src/shared/chang-dua-don";
import { can } from "../src/shared/permissions";
import { cauMoc, changDuoiMoc, tomTatChanXacNhan, type ChangCanDatGap } from "../src/shared/dat-gap-hien-thi";
import { NO_BOOKER_TEXT } from "../src/shared/booker";
import { NO_HANDLER_TEXT, handlerControls, handlerFailure, handlerSaved, nguoiPhuTrachTuPhien } from "../src/shared/handler-view";
import { type PaxCounts } from "../src/shared/order-lines";
import { banner, classifyOrderError, type Banner } from "../src/shared/order-errors";
import { khongQuyenSuaText, orderActions } from "../src/shared/order-view";
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
type Handler = Api.HandlerDto | null | undefined; // null = chưa có người phụ trách; undefined = CHƯA BIẾT (lời gọi lỗi) — xem handlerControls

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

/** Khối "Người phụ trách": tên (hoặc chip "Chưa có người phụ trách") + nút đổi/nhận theo `can()` (src/shared/handler-view.ts). Chưa biết người phụ trách → chữ báo + "Thử lại", không nút nào khác. */
function handlerCard(order: Order, handler: Handler): HTMLElement {
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
    if (controls.assign) buttons.push(changeButton(order, handler, controls.assignLabel));
    if (controls.claim) buttons.push(claimButton(order));
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
  const when = firstSvc?.departDate ? `${dayMonth(firstSvc.departDate)}${firstSvc.pickupTime ? ` · ${firstSvc.pickupTime}` : ""}` : "Chưa có ngày đón";
  const totalPax = order.services.reduce<PaxCounts>(
    (sum, s) => ({ adult: sum.adult + s.pax.adult, child: sum.child + s.pax.child, senior: sum.senior + s.pax.senior, infant: sum.infant + s.pax.infant }),
    { adult: 0, child: 0, senior: 0, infant: 0 },
  );
  const pax = paxCounts(totalPax);
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
      h("div", { class: "value" }, order.orderCode, " ", h("span", { class: `badge badge-${order.status}` }, STATUS_LABEL[order.status])),
    ),
    h("div", { class: "sep" }),
    h(
      "div",
      { class: "grid4" },
      stat("ĐÓN", when, firstSvc?.pickupPlace ?? undefined),
      stat("KHÁCH", order.customerName, order.customerPhone),
      stat("SỐ KHÁCH", pax || "—", serviceLine),
      stat("CÒN LẠI", vnd(order.remainingAmount), `Tổng ${vnd(order.total)} · thanh toán trước ${vnd(order.depositAmount)}`, order.remainingAmount > 0),
    ),
  );
}

function render(order: Order, history: AuditEntry[], canModify: boolean, handler: Handler): void {
  current = order;
  const a = orderActions(order.status, canModify);
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
    a.locked ? h("p", { class: "lock-note" }, icon("lock", 18), "Đơn đã xác nhận: dịch vụ, số khách và tiền đã khoá. Chỉ sửa được thông tin chuyến.") : null,

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

        renderServices(order, a.locked, (sid) => khoiChang(order, sid, canDatGap, duocDatGap)),
      ),
      h(
        "div",
        { class: "side" },
        h(
          "section",
          { class: "card totals" },
          h("h2", null, "Thanh toán"),
          kv("Tạm tính", vnd(order.subtotal)),
          kv("Giảm giá", vnd(order.discount)),
          kv("Tổng cộng", vnd(order.total), "strong"),
          kv("Thanh toán trước", order.depositAmount ? `${vnd(order.depositAmount)}${order.depositMethod ? ` (${METHOD_LABEL[order.depositMethod]})` : ""}` : vnd(0)),
          kv("Còn lại", vnd(order.remainingAmount), "strong"),
          kv("Ghi chú thanh toán", order.paymentNote),
        ),
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
  if (a.noPermission) btns.push(h("p", { class: "muted" }, khongQuyenSuaText({ ownerName: order.staffName, status: order.status, viewer: staff! })));
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
    const [{ order, history, canModify, mocToiThieuPhut }, handler] = await Promise.all([layDon!(), layNguoiPhuTrach(id!)]);
    if (seq !== loadSeq) return;
    mocPhut = mocToiThieuPhut;
    show(null);
    render(order, history, canModify, handler);
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

// Gọi sớm (web/goi-som.ts): đơn gửi NGAY, song song với /api/auth/me của initShell(); chỉ dựng trang sau khi initShell() xong.
const layDon = id ? goiSom(() => api<Api.OrderDetailResponse>(`/api/orders/${encodeURIComponent(id)}`)) : null;
// Người phụ trách (vòng sửa 1 sau kiểm độc lập lượt 1 ADR-0030, phát hiện I-2): GET /api/dispatch/handlers chỉ mở cho người XEM ĐƯỢC MỌI ĐƠN (cổng `order.view`
// không ngữ cảnh — đúng cờ `seesAll` của bản nhớ khung ADR-0035) → chỉ gọi SỚM khi bản nhớ khung nói vậy (tiền lệ web/order-form.ts). Quyết định thật đợi
// `initShell()`: hướng dẫn viên (chỉ xem đơn mình phụ trách) → người phụ trách = chính họ, tên từ phiên, KHÔNG gọi route đó (403 với họ — ruling Task 1.6).
const layNguoiPhuTrachSom = id && layKhungNho()?.seesAll === true ? goiSom(() => loadHandler(id)) : null;
function layNguoiPhuTrach(orderId: string): Promise<Handler> {
  const tuPhien = nguoiPhuTrachTuPhien(staff!);
  if (tuPhien) return Promise.resolve(tuPhien);
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
