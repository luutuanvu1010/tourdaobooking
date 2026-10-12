// Bảng trượt "Sửa số khách dịch vụ" của đơn ĐÃ XÁC NHẬN, chưa Đã giao — văn phòng (ADR-0063 D1, chủ duyệt 2026-10-08): người lập đơn (Bán hàng), Kế toán,
// Quản trị, Toàn quyền. Mỗi dịch vụ danh mục một khối bộ đếm cho loại khách sửa được (máy chủ gửi qua `suaSoKhach`); dịch vụ nhập tay chỉ xem. Lý do chọn
// từ BỐN mã đóng (ADR-0023 điều 4) — không ô chữ. Lưu = MỘT lệnh `POST /api/orders/:id/money-edit`; máy chủ tự tính tiền (không gửi số tiền nào).
import { ApiError, api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { renderBanner } from "./banner";
import { counter } from "./counter";
import { h } from "./dom";
import { vnd } from "./format";
import { paxSummary, type MoneyEditSource } from "../src/shared/viec-cua-toi";
import { PAX_LABEL, type PaxCode } from "../src/shared/order-lines";
import { LY_DO_SUA_SO_KHACH, MA_LY_DO_SUA_SO_KHACH, thanSuaSoKhach, type MaLyDoSuaSoKhach } from "../src/shared/so-khach-van-phong";
import { NETWORK_BANNER, classifyOrderError } from "../src/shared/order-errors";

export interface SheetSoKhachOptions {
  orderId: string;
  /** Dịch vụ của đơn theo thứ tự trên đơn (tên để hiện) — cùng chỉ số với `nguon`. */
  tenDichVu: readonly string[];
  nguon: readonly MoneyEditSource[];
  /** Lưu xong (máy chủ đã ghi hoặc số y nguyên): trang tải lại và báo bằng dải trên cùng. */
  onSaved: (r: Api.MoneyEditResponse) => void;
  onReload: () => void;
}

export function openSheetSoKhach(o: SheetSoKhachOptions, opener: HTMLElement): void {
  const nhap = new Map<string, Partial<Record<PaxCode, number>>>();
  const counters: ReturnType<typeof counter>[] = [];
  const khoi = o.nguon.map((s, i) => {
    const ten = h("div", { class: "hdv-edit-name" }, o.tenDichVu[i] ?? "");
    if (s.editablePaxCodes.length === 0) {
      const p = paxSummary(s.pax);
      return h("div", { class: "hdv-edit-svc" }, ten, h("p", { class: "hdv-edit-fixed" }, `${p.total} khách${p.detail ? ` · ${p.detail}` : ""} — không sửa được ở đây`));
    }
    const d: Partial<Record<PaxCode, number>> = {};
    nhap.set(s.id, d);
    const hang = s.editablePaxCodes.map((code) => {
      const c = counter({ label: `${PAX_LABEL[code]} — ${o.tenDichVu[i] ?? ""}`, value: s.pax[code], onChange: (n) => (d[code] = n) });
      counters.push(c);
      return h("div", { class: "hdv-pax-row" }, h("span", { class: "hdv-pax-label" }, PAX_LABEL[code]), c.root);
    });
    return h("div", { class: "hdv-edit-svc", "data-khoi": "so-khach-dich-vu" }, ten, ...hang);
  });

  let chon: MaLyDoSuaSoKhach | null = null;
  const luu = h("button", { type: "button", class: "btn btn-primary", "data-action": "luu-so-khach", disabled: true }, "Lưu số khách");
  const huy = h("button", { type: "button", class: "btn" }, "Huỷ");
  const bannerEl = h("div", { class: "banner", role: "alert", hidden: true });
  const radios = MA_LY_DO_SUA_SO_KHACH.map((ma) => {
    const input = h("input", { type: "radio", name: "so-khach-ly-do", value: ma });
    input.addEventListener("change", () => {
      chon = ma;
      luu.disabled = false;
      renderBanner(bannerEl, null);
    });
    return h("label", { class: "pick" }, input, h("span", { class: "pick-mark", "aria-hidden": "true" }), h("span", { class: "pick-name" }, LY_DO_SUA_SO_KHACH[ma]));
  });
  const lyDo = h("fieldset", { class: "pick-list", "data-khoi": "ly-do-so-khach" }, h("legend", { class: "pick-legend" }, "Lý do sửa (bắt buộc)"), ...radios);
  const ghiChu = h("p", { class: "muted" }, "Nền tảng tự tính lại tiền theo đơn giá đã chốt của đơn; giảm giá giữ nguyên.");

  const bt = moBangTruot({ title: "Sửa số khách dịch vụ", opener, footClass: "dd-sheet-foot", body: [bannerEl, ...khoi, lyDo, ghiChu], foot: [huy, luu] });
  if (!bt) return;
  const setBusy = (busy: boolean): void => {
    bt.setBusy(busy);
    huy.disabled = busy;
    luu.disabled = busy || chon === null;
    lyDo.disabled = busy;
    for (const c of counters) c.setDisabled(busy);
    luu.textContent = busy ? "Đang lưu…" : "Lưu số khách";
  };
  huy.addEventListener("click", () => bt.close());
  luu.addEventListener("click", async () => {
    if (chon === null) return;
    setBusy(true);
    renderBanner(bannerEl, null);
    try {
      const r = await api<Api.MoneyEditResponse>(`/api/orders/${encodeURIComponent(o.orderId)}/money-edit`, { method: "POST", body: thanSuaSoKhach(chon, o.nguon, nhap) });
      bt.close(false);
      o.onSaved(r);
    } catch (err) {
      setBusy(false);
      const b = err instanceof ApiError ? classifyOrderError({ status: err.status, code: err.code, message: err.message, details: err.details }, { serviceNames: [], formatMoney: vnd }) : NETWORK_BANNER;
      // Đơn vừa đổi / đã Đã giao / không còn quyền: màn hình đã cũ → nút "Tải lại đơn" (đóng bảng, tải lại trang đơn).
      const cu = err instanceof ApiError && (err.status === 409 || err.status === 403 || err.status === 404);
      renderBanner(bannerEl, cu || b.action === "lock_form" ? { ...b, action: "reload_order" } : b, {
        reloadOrder: () => {
          bt.close(false);
          o.onReload();
        },
        reloadPage: () => location.reload(),
      });
      bannerEl.scrollIntoView({ block: "nearest" });
    }
  });
}
