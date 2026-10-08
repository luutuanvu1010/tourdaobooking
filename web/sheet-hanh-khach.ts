// Bảng trượt "Sửa danh sách hành khách" của đơn ĐÃ XÁC NHẬN (bản vẽ M5 — docs/design/2026-10-01-dua-don-hanh-khach/M5 Sua danh sach hanh khach.dc.html).
// Mỗi người một thẻ (cả máy tính — bảng trượt rộng 640px); "Huỷ người" hỏi lại ngay trong thẻ, không ô lý do. Lưu = MỘT lệnh `POST /api/orders/:id/passengers`
// (thêm / sửa = dòng mới / huỷ — chỉ-thêm, ADR-0047 R8) với mốc của ĐƠN đọc từ danh sách.
import { ApiError, api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { renderBanner } from "./banner";
import { h } from "./dom";
import { vnd } from "./format";
import { taoKhoiHanhKhach } from "./khoi-hanh-khach";
import { dongTuDto, loiDanhSachKhach, thayDoiXacNhan } from "../src/shared/hanh-khach-form";
import { NETWORK_BANNER, classifyOrderError } from "../src/shared/order-errors";
import { vnToday } from "../src/shared/vn-date";

export interface SheetHanhKhachOptions {
  orderId: string;
  ds: Api.PassengerListResponse;
  /** `dongBo` = phần chuyến của phản hồi (ADR-0104 Đ2) — trang đơn hiện câu nhắc / cập nhật tay. */
  onSaved: (dongBo?: Api.DongBoChuyenDto) => void;
  onReload: () => void;
}

export function openSheetHanhKhach(o: SheetHanhKhachOptions, opener: HTMLElement): void {
  let seq = 0;
  const today = vnToday(new Date());
  const khoi = taoKhoiHanhKhach({
    rows: o.ds.passengers.map((p) => dongTuDto(p, `m5-${++seq}`, true)), che: "bang", soKhach: () => o.ds.soKhachDoan, today, bang: () => false,
    newKey: () => `m5-${++seq}`, onChange: () => undefined, ma: "m5",
  });
  const bannerEl = h("div", { class: "banner", role: "alert", hidden: true });
  const huy = h("button", { type: "button", class: "btn" }, "Huỷ");
  const luu = h("button", { type: "button", class: "btn btn-primary", "data-action": "luu-hanh-khach" }, "Lưu");
  const bt = moBangTruot({ title: "Sửa danh sách hành khách", opener, footClass: "dd-sheet-foot", body: [bannerEl, khoi.root], foot: [huy, luu] });
  if (!bt) return;
  bt.dialog.classList.add("hk-sheet");
  huy.addEventListener("click", () => bt.close());
  luu.addEventListener("click", async () => {
    khoi.showIssues(true);
    if (loiDanhSachKhach(khoi.rows(), today).length > 0) return; // lỗi đã hiện dưới từng dòng
    const than = thayDoiXacNhan(khoi.rows(), khoi.huy(), o.ds.orderUpdatedAt);
    if (than.them.length + than.sua.length + than.huy.length === 0) return bt.close();
    bt.setBusy(true);
    luu.disabled = true;
    luu.textContent = "Đang lưu…";
    renderBanner(bannerEl, null);
    try {
      const r = await api<Api.PassengerListResponse>(`/api/orders/${encodeURIComponent(o.orderId)}/passengers`, { method: "POST", body: than });
      bt.close(false);
      o.onSaved(r.dongBoChuyen);
    } catch (err) {
      bt.setBusy(false);
      luu.disabled = false;
      luu.textContent = "Lưu";
      const b = err instanceof ApiError ? classifyOrderError({ status: err.status, code: err.code, message: err.message, details: err.details }, { serviceNames: [], formatMoney: vnd }) : NETWORK_BANNER;
      renderBanner(bannerEl, b.action === "lock_form" || (b.action === "none" && err instanceof ApiError && err.status === 409) ? { ...b, action: "reload_order" } : b, {
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
