// Hộp «Từ chối đơn» (ADR-0030 điều 1; Q5 (a) chủ 2026-10-23: dùng lại khuôn hộp «Huỷ đơn này» — bảng trượt từ dưới lên, mỗi lý do một ô chọn, nút xác nhận
// chỉ bật khi đã chọn). Dùng chung cho thẻ «Đơn của tôi» của hướng dẫn viên (web/viec-cua-toi.ts) và khối «Người phụ trách» của trang đơn (web/order.ts).
// Danh sách lý do là luật thuần chung với máy chủ (`src/shared/ly-do-tu-choi.ts`) — KHÔNG ô chữ, kể cả «Khác». Máy chủ kiểm lại mọi điều kiện.
// Kết quả trả về nơi gọi: thành công, hoặc lỗi của máy chủ đã phân loại bằng `handlerFailure(…, "refuse")`: lỗi «màn hình đã cũ» (403, 409 stale, 404)
// → đóng hộp, nơi gọi tải lại; lỗi còn lại (409 hạn hôm nay / ngày mai, đơn huỷ, nháp, Đã giao, hết lượt Từ chối — ADR-0032; 400) → hiện đúng câu máy chủ
// ngay trong hộp.
import { handlerFailure } from "../src/shared/handler-view";
import type { Banner } from "../src/shared/order-errors";
import { LY_DO_TU_CHOI, type MaLyDoTuChoi } from "../src/shared/ly-do-tu-choi";
import { cauConLai } from "../src/shared/han-muc-tu-choi";
import { ApiError, api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h } from "./dom";
import { showError } from "./shell";

export type KetQuaTuChoi = { ok: true } | { ok: false; banner: Banner };

/** Mở hộp. Trả `false` nếu không mở được (đang có một bảng khác mở). `onClosed` gọi MỘT lần khi hộp đóng (mọi cách đóng). */
export function moHopTuChoi(o: {
  orderId: string;
  orderCode: string;
  /** Một dòng mô tả đơn ở đầu hộp (vd «Đơn của <khách>, đi <ngày>.») — nơi gọi tự dựng theo dữ liệu nó có. */
  moTa: string;
  opener: HTMLElement;
  done: (kq: KetQuaTuChoi) => void;
  onClosed?: () => void;
}): boolean {
  let chon: MaLyDoTuChoi | null = null;
  let dangGui = false;
  const errorBox = h("div", { class: "alert", role: "alert", hidden: true });
  const giuBtn = h("button", { type: "button", class: "btn" }, "Không từ chối");
  const xacNhanBtn = h("button", { type: "button", class: "btn btn-primary", "data-action": "xac-nhan-tu-choi", disabled: true }, "Xác nhận từ chối");
  const radios = LY_DO_TU_CHOI.map((l) => {
    const input = h("input", { type: "radio", name: "tu-choi-ly-do", value: l.ma });
    input.addEventListener("change", () => {
      chon = l.ma;
      showError(errorBox, null);
      xacNhanBtn.disabled = dangGui;
    });
    return h("label", { class: "pick" }, input, h("span", { class: "pick-mark", "aria-hidden": "true" }), h("span", { class: "pick-name" }, l.nhan));
  });
  const fieldset = h("fieldset", { class: "pick-list" }, h("legend", { class: "pick-legend" }, "Chọn lý do từ chối"), ...radios);
  // ADR-0032 điều 9: «Bạn còn được từ chối N đơn liên tiếp, M lần trong tuần này» — chỉ khi máy chủ trả số (chế độ Chặn, người bị giới hạn). Lỗi mạng → không
  // hiện dòng, không chặn bấm; hết lượt vẫn bấm được — máy chủ trả câu «Hãy gọi văn phòng».
  const conLaiEl = h("p", { class: "tu-choi-con-lai", "data-con-lai": "1", hidden: true });
  void api<Api.ConLaiTuChoiResponse>(`/api/orders/${encodeURIComponent(o.orderId)}/han-muc-tu-choi`)
    .then((r) => {
      if (r.conLai) {
        conLaiEl.textContent = cauConLai(r.conLai.lienTiep, r.conLai.tuan);
        conLaiEl.hidden = false;
      }
    })
    .catch(() => undefined);
  const bang = moBangTruot({
    title: `Từ chối đơn ${o.orderCode}?`,
    body: [h("p", { class: "hdv-cancel-text" }, `${o.moTa} Đơn sẽ quay về danh sách Chờ nhận để người khác nhận.`), conLaiEl, fieldset, errorBox],
    foot: [giuBtn, xacNhanBtn],
    footClass: "hdv-sheet-foot",
    opener: o.opener,
    onClosed: o.onClosed,
  });
  if (!bang) return false;
  const setBusy = (busy: boolean): void => {
    dangGui = busy;
    bang.setBusy(busy);
    giuBtn.disabled = busy;
    fieldset.disabled = busy;
    xacNhanBtn.disabled = busy || chon === null;
    xacNhanBtn.textContent = busy ? "Đang gửi…" : "Xác nhận từ chối";
  };
  giuBtn.addEventListener("click", () => {
    if (!dangGui) bang.close();
  });
  xacNhanBtn.addEventListener("click", async () => {
    if (dangGui || chon === null) return;
    showError(errorBox, null);
    setBusy(true);
    try {
      await api<Api.HandlerRefuseResponse>(`/api/orders/${encodeURIComponent(o.orderId)}/handler-refuse`, { method: "POST", body: { lyDo: chon } });
      bang.close(false);
      o.done({ ok: true });
    } catch (err) {
      setBusy(false);
      const f = handlerFailure(err instanceof ApiError ? { status: err.status, code: err.code, message: err.message } : null, "refuse");
      if (f.reload || (err instanceof ApiError && err.status === 404)) {
        bang.close(false);
        o.done({ ok: false, banner: f.banner });
        return;
      }
      showError(errorBox, f.banner.title);
    }
  });
  return true;
}
