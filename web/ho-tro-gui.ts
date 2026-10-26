// Hộp «Gửi yêu cầu» của trang Hỗ trợ (PR 3): nhóm nhận → loại → tiêu đề → đơn liên quan → mô tả → «Gửi». Mở bằng hộp trượt dùng chung.
// Không import feedback.ts (top-level await) nên người xem và danh sách nhóm đi vào qua `TuyChonHopGui`. Lối vào `/feedback?new=1&from=<trang>` do trang gọi `moHopGui`.
import { FEEDBACK_KINDS, FEEDBACK_KIND_NAME } from "../src/shared/feedback-catalog";
import { can } from "../src/shared/permissions";
import { NHOM_KY_THUAT_ID } from "../src/shared/ve-ho-tro";
import { donDienSan, nhanDonChon } from "../src/shared/ve-ho-tro-hien-thi";
import { ApiError, api, type Api, type Staff } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, replaceChildren } from "./dom";

declare const __BUILD_ID__: string | undefined;

export interface TuyChonHopGui {
  /** Đường dẫn trang đang xem khi bấm «Báo lỗi» (`?from=`); null nếu mở từ chính trang Hỗ trợ. */
  from: string | null;
  staff: Staff;
  teams: Api.FeedbackTeamsResponse;
  opener?: HTMLElement | null;
}

/** Một mã cho mỗi lần mở trang; giữ nguyên khi thử lại (mạng yếu) để máy chủ không tạo trùng, đổi mới sau khi gửi được. */
let clientRequestId = crypto.randomUUID();

function boiCanh(from: string | null): Api.FeedbackContextDto {
  const nav = navigator as Navigator & { standalone?: boolean };
  const ctx: Api.FeedbackContextDto = {
    device: navigator.userAgent.slice(0, 120),
    standalone: window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
  };
  if (from && from.startsWith("/")) ctx.path = from.slice(0, 200);
  if (typeof __BUILD_ID__ !== "undefined") ctx.appVersion = __BUILD_ID__;
  return ctx;
}

export function moHopGui(o: TuyChonHopGui): void {
  const { staff, teams, from } = o;
  const ctx = boiCanh(from);
  const coChonNhom = teams.teams.length > 1; // tài khoản bên ngoài / nạp nhóm lỗi: một nhóm, không cần ô chọn (máy chủ tự gửi Kỹ thuật)
  const loi = h("p", { class: "alert", role: "alert", hidden: true });
  const hienLoi = (m: string | null): void => {
    loi.textContent = m ?? "";
    loi.hidden = !m;
  };

  const chonNhom = h("select", { id: "new-team", "aria-label": "Gửi tới nhóm" }, ...teams.teams.map((t) => h("option", { value: t.id, selected: t.id === NHOM_KY_THUAT_ID }, t.name)));
  const goiY = h("span", { class: "muted", id: "new-team-hint" });
  const veGoiY = (): void => void (goiY.textContent = teams.teams.find((t) => t.id === chonNhom.value)?.description ?? "");
  chonNhom.addEventListener("change", veGoiY);
  veGoiY();
  const chonLoai = h("select", { id: "new-kind" }, ...FEEDBACK_KINDS.map((k) => h("option", { value: k }, FEEDBACK_KIND_NAME[k])));
  const tieuDe = h("input", { id: "new-title", type: "text", maxLength: 120, required: true });
  const chonDon = h("select", { id: "new-order" }, h("option", { value: "" }, "Không gắn đơn"));
  const nhanDon = h("label", { id: "new-order-label", hidden: true }, "Đơn liên quan (không bắt buộc)", chonDon);
  const moTa = h("textarea", { id: "new-body", rows: 5, maxLength: 4000, required: true });
  const gui = h("button", { type: "button", id: "new-submit", class: "btn btn-primary" }, "Gửi");
  const huy = h("button", { type: "button", id: "new-cancel", class: "btn btn-link" }, "Huỷ");

  const bt = moBangTruot({
    title: "Gửi yêu cầu",
    opener: o.opener ?? null,
    body: [
      loi,
      h("div", { class: "grid ht-gui" },
        coChonNhom ? h("label", { id: "new-team-label" }, "Gửi tới nhóm", chonNhom, goiY) : null,
        h("label", null, "Loại", chonLoai),
        h("label", null, "Tiêu đề", tieuDe),
        nhanDon,
        h("label", null, "Mô tả", moTa),
        h("p", { class: "muted", id: "new-context" }, `Sẽ đính kèm tự động: ${ctx.path ? `trang ${ctx.path}, ` : ""}thiết bị của bạn${ctx.standalone ? " (Nền tảng đã cài)" : ""}${ctx.appVersion ? `, phiên bản ${ctx.appVersion}` : ""}.`)),
    ],
    foot: [huy, gui],
  });
  if (!bt) return;
  huy.addEventListener("click", () => bt.close());

  // «Đơn liên quan» (ADR-0127): chỉ đơn do chính người gửi lập (máy chủ kiểm lại); không có quyền / lỗi / rỗng ⇒ ẩn ô. Điền sẵn nếu mở từ trang đơn của mình.
  if (can(staff, "order.view", { ownerId: staff.id })) {
    void (async () => {
      try {
        const r = await api<Api.FeedbackMyOrdersResponse>("/api/feedback/my-orders");
        if (r.orders.length === 0) return;
        replaceChildren(chonDon, h("option", { value: "" }, "Không gắn đơn"), ...r.orders.map((d) => h("option", { value: d.id }, nhanDonChon(d))));
        chonDon.value = donDienSan(from, r.orders) ?? "";
        nhanDon.hidden = false;
      } catch {
        /* ô vẫn ẩn */
      }
    })();
  }
  tieuDe.focus();

  gui.addEventListener("click", async () => {
    if (gui.disabled) return;
    if (!tieuDe.value.trim() || !moTa.value.trim()) return hienLoi("Điền tiêu đề và mô tả.");
    hienLoi(null);
    gui.disabled = true;
    bt.setBusy(true);
    const body: Api.FeedbackCreateInput = { kind: chonLoai.value as Api.FeedbackKind, title: tieuDe.value, body: moTa.value, clientRequestId, context: ctx };
    if (coChonNhom && chonNhom.value) body.teamId = chonNhom.value;
    if (!nhanDon.hidden && chonDon.value) body.orderId = chonDon.value;
    try {
      const r = await api<Api.FeedbackDetailResponse>("/api/feedback", { method: "POST", body });
      clientRequestId = crypto.randomUUID();
      location.replace(`/feedback?id=${r.ticket.id}`); // không assign: Back/bfcache không được đưa về hộp đã gửi (tránh gửi trùng yêu cầu)
    } catch (err) {
      hienLoi(err instanceof ApiError ? err.message : "Không kết nối được máy chủ."); // giữ nguyên clientRequestId: bấm Gửi lại không tạo trùng
      gui.disabled = false;
      bt.setBusy(false);
    }
  });
}
