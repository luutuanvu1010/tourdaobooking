// Khối Trả sau trên trang đơn (ADR-0172 Đ3 mục 3, ADR-0173 Đ1 mục 3): trạng thái hạn trả của đơn Trả sau đã xác nhận còn nợ, và nút «Ân hạn» lùi hạn trả (chỉ hiện khi máy chủ gửi `coQuyenAnHan`).
// Gọi: POST /api/tra-sau/don/:id/an-han { hanMoi, lyDo } — máy chủ hỏi lại quyền, kiểm hạn mới phải sau hạn cũ, ghi nhật ký kèm lý do. Ô ngày giờ hiểu là giờ Việt Nam (`docHanMoi`).
// Không confirm / alert / innerHTML; dựng bằng h(). Tách khỏi web/order.ts để gói trang đơn không phình.
import { ApiError, api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h } from "./dom";
import { hienBaoNgan } from "./toast";
import { NHAN_TRANG_THAI_HAN, docHanMoi, giaTriOGioVn } from "../src/shared/han-muc-tra-sau-hien-thi";
import { dongTien } from "../src/shared/tra-sau";
import { vnDateTimeText } from "../src/shared/vn-date";

type TraSauDon = NonNullable<Api.OrderDetailResponse["traSau"]>;

const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

/** Các dòng của khối Trả sau để chèn vào khối Thanh toán. `ts` null ⇒ đơn không phải Trả sau đã xác nhận ⇒ không có dòng nào. */
export function dongTraSauDon(order: { id: string; hanTra: string | null; hetAnHan?: string | null }, ts: TraSauDon | null, napLai: () => Promise<void>): HTMLElement[] {
  if (ts === null || order.hanTra === null) return [];
  const cau =
    ts.no <= 0
      ? "Đã thu đủ"
      : ts.trangThai === "an_han" && order.hetAnHan
        ? `${NHAN_TRANG_THAI_HAN.an_han} tới ${vnDateTimeText(order.hetAnHan)} · còn nợ ${dongTien(ts.no)}`
        : `${NHAN_TRANG_THAI_HAN[ts.trangThai]} · còn nợ ${dongTien(ts.no)}`;
  const dong = h("div", { class: "kv", "data-tra-sau": ts.trangThai }, h("span", { class: "muted" }, "Hạn trả"), h("span", null, cau));
  if (!ts.coQuyenAnHan || ts.no <= 0) return [dong];
  const nut = h("button", { type: "button", class: "btn", "data-action": "an-han" }, "Ân hạn");
  nut.addEventListener("click", () => moBangAnHan(order.id, order.hanTra!, nut, napLai));
  return [dong, h("div", { class: "handler-actions" }, nut)];
}

function moBangAnHan(orderId: string, hanTra: string, opener: HTMLElement, napLai: () => Promise<void>): void {
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const oHan = h("input", { id: "an-han-moi", class: "vc-input", type: "datetime-local", value: giaTriOGioVn(hanTra), min: giaTriOGioVn(hanTra) });
  const oLyDo = h("input", { id: "an-han-ly-do", class: "vc-input", type: "text", autocomplete: "off", maxLength: 200, required: true });
  const luu = h("button", { type: "button", class: "btn btn-primary btn-block", "data-action": "luu-an-han" }, "Ân hạn");
  const bang = moBangTruot({
    title: "Ân hạn: lùi hạn trả của đơn",
    body: [
      h(
        "div",
        { class: "vc-gt" },
        h("div", { class: "vc-hint" }, `Hạn trả hiện tại: ${vnDateTimeText(hanTra)}. Hạn mới phải sau hạn này; khoảng ân hạn sau hạn trả giữ nguyên.`),
        h("div", { class: "vc-field" }, h("label", { for: "an-han-moi" }, "Hạn trả mới (giờ Việt Nam)"), oHan),
        h("div", { class: "vc-field" }, h("label", { for: "an-han-ly-do" }, "Lý do"), oLyDo),
        loi,
      ),
    ],
    foot: [luu],
    opener,
  });
  if (!bang) return;
  luu.addEventListener("click", async () => {
    loi.hidden = true;
    const han = docHanMoi(oHan.value);
    const lyDo = oLyDo.value.trim();
    const sai = !han.ok ? han.message : lyDo === "" ? "Ghi lý do lùi hạn trả." : null;
    if (sai !== null || !han.ok) {
      loi.textContent = sai ?? "";
      loi.hidden = false;
      return;
    }
    bang.setBusy(true);
    luu.disabled = true;
    try {
      await api(`/api/tra-sau/don/${encodeURIComponent(orderId)}/an-han`, { method: "POST", body: { hanMoi: han.iso, lyDo } satisfies Api.NoiHanTraSauInput });
    } catch (err) {
      bang.setBusy(false);
      luu.disabled = false;
      loi.textContent = lyDoLoi(err);
      loi.hidden = false;
      return;
    }
    bang.setBusy(false);
    bang.close(false);
    hienBaoNgan(`Đã lùi hạn trả tới ${vnDateTimeText(han.iso)}.`);
    await napLai();
  });
  oHan.focus();
}
