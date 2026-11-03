// Trang "Cài đặt vé điện tử" (ADR-0156 Đ3): Toàn quyền đặt số vé tối đa mỗi lô. Ô settings.ops; máy chủ vẫn kiểm lại. Không innerHTML.
//   GET /api/ve/cai-dat → { tranLo, version }
//   PUT /api/ve/cai-dat { tranLo, version } → { tranLo, version } (khoá lạc quan: lệch phiên bản ⇒ 409)
import { ApiError, api } from "./api";
import { can } from "../src/shared/permissions";
import { TRAN_LO_LON_NHAT, TRAN_LO_NHO_NHAT, tranLoHopLe } from "../src/shared/ve-nhap-lo";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

interface CaiDatVe { tranLo: number; version: number }

const errorEl = byId("error");
const okEl = byId("ok");
const noiDungEl = byId("vcd-noi-dung");

const staff = await initShell();
const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

if (!can(staff, "settings.ops")) {
  showError(errorEl, "Trang này chỉ Toàn quyền dùng được.");
} else {
  try {
    let hienTai = await api<CaiDatVe>("/api/ve/cai-dat");
    const o = h("input", { type: "number", class: "o", id: "vcd-tran-lo", inputMode: "numeric", min: String(TRAN_LO_NHO_NHAT), max: String(TRAN_LO_LON_NHAT), step: "1", required: true, value: String(hienTai.tranLo) });
    const loi = h("p", { class: "alert", role: "alert", hidden: true });
    const nut = h("button", { type: "submit", class: "btn btn-primary", "data-action": "luu-tran-lo" }, "Lưu");
    const form = h("form", { id: "vcd-form" },
      h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "vcd-tran-lo" }, "Số vé tối đa mỗi lô"), o),
      h("p", { class: "muted" }, `Từ ${TRAN_LO_NHO_NHAT} đến ${TRAN_LO_LON_NHAT} vé. Số mới áp cho các lô nhập từ lúc này; vé đã nhập giữ nguyên.`),
      loi,
      h("div", { class: "handler-actions" }, nut));
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      loi.hidden = true;
      okEl.hidden = true;
      const so = Number(o.value);
      if (!tranLoHopLe(so)) { loi.textContent = `Nhập số nguyên từ ${TRAN_LO_NHO_NHAT} đến ${TRAN_LO_LON_NHAT}.`; loi.hidden = false; return; }
      nut.disabled = true;
      try {
        hienTai = await api<CaiDatVe>("/api/ve/cai-dat", { method: "PUT", body: { tranLo: so, version: hienTai.version } });
        okEl.textContent = `Đã lưu: mỗi lô tối đa ${hienTai.tranLo} vé.`;
        okEl.hidden = false;
      } catch (err) {
        loi.textContent = lyDoLoi(err);
        loi.hidden = false;
      } finally {
        nut.disabled = false;
      }
    });
    replaceChildren(noiDungEl, form);
    noiDungEl.hidden = false;
  } catch (err) {
    showError(errorEl, lyDoLoi(err));
  }
}
